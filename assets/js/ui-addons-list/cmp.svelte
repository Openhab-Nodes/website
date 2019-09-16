<script>
  export let searchstring = "";
  export let userawarecomponent;
  export let addondb;

  import { createEventDispatcher, getContext } from "svelte";
  const dispatch = createEventDispatcher();

  let filters = {
    binding: true,
    ioservice: true,
    ruletemplate: true
  };

  let loading = false;
  let db_searchstring = "";
  let error_message = "";
  let alink;
  let module;

  function getMatches(searchstring, filters_) {
    if (searchstring === "") return [];

    let alreadyFound = {};
    let matches = [];
    try {
      for (let match of db_searchstring.matchAll(searchstring)) {
        const start = db_searchstring.lastIndexOf("{", match.index);
        if (alreadyFound[start]) continue;
        alreadyFound[start] = true;
        const end = db_searchstring.indexOf("}", match.index);
        const id = JSON.parse(db_searchstring.substring(start, end + 1)).id;
        const addonresult = addondb.db_by_id[id];
        if (addonresult && filters_[addonresult.type]) matches.push(addonresult);
      }
      error_message = "";
      return matches;
    } catch (e) {
      error_message = e.message;
    }
    return [];
  }

  $: seachresults = getMatches(searchstring, filters);

  let recommended = [];
  let last_updated = [];
  let often_installed = [];
  let permissions = {};

  export function setFilters(filters_) {
    filters = filters_;
    let count = 0;
    for (let item of Object.values(addondb.db_by_id)) if (filters[item.type]) ++count;
    return count;
  }

  export function start(filters_) {
    loading = true;
    db_searchstring = addondb.searchstr;
    recommended = addondb.recommended;
    permissions = addondb.permissions;
    last_updated = addondb.last_updated.slice(0, 7);
    often_installed = addondb.often_installed.slice(0, 3);
    loading = false;
    if (filters_) return setFilters(filters_);
    return 0;
  }

  function addonclick(addon) {
    alink.href = "/addons/addon?id=" + addon.id;
    alink.click();
  }
</script>

<style>
  .searchoverview a > ui-addon {
    color: unset;
  }
</style>

<a bind:this={alink} />
{#if loading}
  <h1>Loading...</h1>
{:else if searchstring.length === 0}
  <div class="searchoverview mt-4">
    <section>
      <h2>Often Installed</h2>
      {#each often_installed as addon}
        <ui-addon
          {userawarecomponent}
          {addon}
          {addondb}
          on:rate
          on:install
          on:click|preventDefault={e => addonclick(addon)} />
      {/each}
    </section>

    <section>
      <h2>Recommended</h2>
      {#each recommended as addon}
        <ui-addon
          {userawarecomponent}
          {addon}
          {addondb}
          on:rate
          on:install
          on:click|preventDefault={e => addonclick(addon)} />
      {/each}
    </section>

    <section>
      <h2>How To Publish</h2>
      <p>
        Learn how to write and publish your own Addon in the
        <a href="/developer/addons">Developer Section</a>
        . Publish Rule Templates via the
        <b>Setup &amp; Maintenance</b>
        interface.
      </p>
      <h2>Latest Updates</h2>
      <ul>
        {#each last_updated as addon}
          <li class="mb-2">
            {addon.title}
            {#if addon.changelog_url}
              <a target="_blank" href={addon.changelog_url}>Changelog</a>
            {/if}
            <br />
            Updated on {new Date(addon.last_updated).toLocaleString()} to
            version {addon.version}.
          </li>
        {/each}
      </ul>
    </section>
  </div>
{:else}
  <div class="searchoverview details container my-4">
    {#each seachresults as addon}
      <ui-addon
        {userawarecomponent}
        {addon}
        {addondb}
        on:rate
        on:install
        on:click|preventDefault={e => addonclick(addon)} />
    {:else}
      <p>
        No results found for "{searchstring}" :/
        <br />
        Did you know that you can use "." as search term to show all Addons? :)
      </p>
      {#if error_message}
        <div class="bs-callout bs-callout-warning">{error_message}</div>
      {/if}
    {/each}
  </div>
{/if}
