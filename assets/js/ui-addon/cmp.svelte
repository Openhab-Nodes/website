<script>
  import "./starrating.js";
  import PermissionsInstall from "./permissions_install.svelte";

  import { createEventDispatcher, getContext } from "svelte";
  const dispatch = createEventDispatcher();

  export let addondb;
  export let addon = { status: {} };
  export let UserAwareComponent;
  export let standalone = false;

  let error_message;
  let popup;

  let mode = "";
  let user_item_rating = 0;
  let item_rating = 0;
  let loggedin = false;
  let logo_url;
  let suggest_logo_url;

  /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy;
  onDestroy(() => {
    if (onDestroyProxy) onDestroyProxy();
  });

  export async function start() {
    const addon_id = new URL(window.location).searchParams.get("id") || addon.id;
    addon = addondb.db_by_id[addon_id];
    addondb.from_cache_or_fetch(addon_id+".json",
      `https://raw.githubusercontent.com/openhab-nodes/addons-registry/master/${addon_id}.json`).then(v => {
      addon.reviewed_by = v.reviewed_by;
      addon.archs = v.archs;
      addon.size = v.size;
      addon.estimated_mem = v.estimated_mem;
    });

    if (!onDestroyProxy) {
      onDestroyProxy = UserAwareComponent(
        user_ => {
          user = user_;
          loggedin = user_ && user_.uid;
        },
        data_ => {
          user_item_rating =
            data_ && data_.ratings && data_.ratings[addon.id]
              ? data_.ratings[addon.id]
              : 0;
          data = data_;
        },
        aq_ => (actionqueue = aq_)
      );
    }
    item_rating = addon.stat ? addon.stat.p / addon.stat.v : 0.0;
    logo_url = addon.logo_url;
    if (!logo_url && addon.github)
      logo_url =
        addon.github.replace(
          "https://github.com/",
          "https://raw.githubusercontent.com/"
        ) + "/master/logo.png";
    suggest_logo_url = addon.homepage ? addon.homepage : addon.github;
  }
  /// End -- User Aware Component

  function submit_rate(e) {
    e.stopPropagation();
    const target = e.target;
    target.disabled = true;
    dispatch("rate", {
      addonid: addon.id,
      rate: e.detail.rate,
      last_rating: user_item_rating,
      confirm: () => (target.disabled = false),
      error: err => {
        target.disabled = false;
        error_message = err.message;
        popup.click();
      }
    });
  }

  function not_logged_in() {
    error_message = "Not logged in!";
    popup.click();
  }

  function maintenance_code_str(code) {
    switch (code) {
      case "AVAILABLE":
        return "Maintained &amp; Available";
      case "UNMAINTAINED":
        return "<span class='text-danger'>Unmaintained</span>";
      case "REPLACED":
        return "<span class='text-danger'>Replaced</span> by another Addon!";
      case "REMOVED":
        return "<span class='text-danger'>Removed</span>";
      default:
        return code;
    }
  }
</script>

<style>
  table.property-table th {
    width: 1px;
    white-space: nowrap;
  }
</style>

<article
  id={addon.id}
  class="addon mb-3 {addon.status.code}"
  on:click={e => dispatch('click', { id: addon.id })}>
  <ui-tooltip nobutton bind:this={popup}>{error_message}</ui-tooltip>
  <header title={addon.id}>
    <span>{addon.title}</span>
    <small class="ml-2">{addon.version}</small>
    <small class="" style="white-space: nowrap; text-overflow: ellipsis;">
      – By {addon.author}
    </small>
  </header>
  <section class="logo">
    {#if logo_url}
      <img src={logo_url} alt="Logo" on:error={e => (logo_url = null)} />
    {:else}
      <div>
        {#if suggest_logo_url}
          <a href={suggest_logo_url}>Suggest Logo</a>
        {/if}
      </div>
    {/if}
  </section>
  <section class="description">
    {#if mode == 'permissions'}
      <PermissionsInstall
        {addon}
        {UserAwareComponent}
        permissions={addondb.permissions}
        on:install />
      <button
        class="btn btn-primary-success"
        on:click|stopPropagation={e => (mode = '')}>
        Back to description
      </button>
    {:else if standalone !== false}
      <table class="table table-hover table-sm property-table">
        <tr>
          <th scope="row" style="width: 1px;white-space: nowrap;">Updated</th>
          <td>
            {new Date(addon.last_updated).toLocaleString()}
            {#if addon.changelog_url}
              <a href={addon.changelog_url}>Changelog</a>
            {/if}
          </td>
        </tr>
        <tr>
          <th scope="row">Maintenance</th>
          <td>
            {@html maintenance_code_str(addon.status.code)}
          </td>
        </tr>
        <tr>
          <th scope="row">Install Size</th>
          <td>
            {#if addon.size}
            {Number.parseFloat(addon.size / 1024 / 1024).toFixed(2)} MB
            {/if}
          </td>
        </tr>
        <tr>
          <th scope="row">Supported architectures</th>
          <td>
            {#if addon.archs}
            {addon.archs}
            {/if}
          </td>
        </tr>
        <tr>
          <th
            scope="row"
            title="Estimated Memory Usage. This is an Addon developer provided
            value.">
            Est. Mem Usage
          </th>
          <td>
            {#if addon.estimated_mem}
              {Number.parseFloat(addon.estimated_mem.min).toFixed(2)} - {Number.parseFloat(addon.estimated_mem.max).toFixed(2)}
              MB
            {/if}
          </td>
        </tr>
        <tr>
          <th scope="row">Reviewed</th>
          <td>
            {addon.reviewed_by && addon.reviewed_by.length > 0 ? 'Yes' : 'No'}
          </td>
        </tr>
        {#if addon.stat && addon.stat.license && addon.stat.license}
          <tr>
            <th scope="row">License</th>
            <td>{addon.stat.license}</td>
          </tr>
        {/if}
      </table>
      <button
        class="btn btn-outline-success"
        disabled={!loggedin}
        title={loggedin ? '' : 'You need to login!'}
        on:click|stopPropagation={e => (mode = 'permissions')}>
        Check Permissions &amp; Install
      </button>
    {:else}
      <p>{addon.description}</p>
    {/if}
  </section>
  <footer>
    {#if addon.github && addon.stat && addon.stat.s}
      <a
        class="mr-2 noref"
        href={addon.github}
        target="_blank"
        title={addon.github}>
        <span class="mr-2">
          <i class="fas fa-star" />
          {addon.stat.s} Stars
        </span>
        <span class="mr-2">
          <i class="fas fa-info-circle" />
          {addon.stat.iss} Issues
        </span>
      </a>
    {:else}
      <a
        class="mr-2"
        href={addon.homepage}
        target="_blank"
        title={addon.homepage}>
        Homepage / Repository
      </a>
    {/if}
    {#if addon.stat}
      <span class="mr-2">
        <i class="fas fa-download" />
        {addon.stat.d} Downloads
      </span>
      <ui-star-rating
        class="ml-auto"
        title={loggedin ? 'Rate this Addon' : 'You need to login to rate'}
        value={item_rating}
        disabled={!loggedin}
        highlight={user_item_rating}
        on:rate={submit_rate}
        on:invalid={e => not_logged_in()} />
    {/if}
  </footer>
</article>
