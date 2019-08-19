<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let permissions;
  export let addon = { permissions: { mandatory: [], optional: [] } };
  export let UserAwareComponent;

  let error_message = null;

  /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy;
  let installations = {};

  $: if (!onDestroyProxy && UserAwareComponent)
    onDestroyProxy = UserAwareComponent(
      user_ => {
        user = user_;
      },
      data_ => {
        data = data_;
      },
      aq_ => {
        actionqueue = aq_;
      }
    );
  onDestroy(() => {
    if (onDestroyProxy) onDestroyProxy();
  });

  $: perm = addon.permissions.mandatory
    .map(key => Object.assign({ mandatory: true }, permissions[key]))
    .concat(
      addon.permissions.optional.map(key =>
        Object.assign({ mandatory: false }, permissions[key])
      )
    );

/**
 * Returns a tuple (array) with (installation_details, addon_installation_details, command_queue_entry)
 * This methods result is used to render the installations list and is recomputed whenever the action queue or installations change.
 */
  function installs_with_addon(installs, aq) {
    return Object.values(installs).map(item => {
      let thisaddon = item.addons[addon.id] || {};
      if (!thisaddon.s) thisaddon.s = null;
      const aq_install = aq[item.id];
      return [item, thisaddon, aq_install?aq_install[addon.id]:null];
    });
  }

  function is_old_version(install_addon) {
    //console.log("IS_CURRENT", install_addon.v, addon.version);
    try {
      const v1 = install_addon.v;
      const v2 = addon.version;
      v1 = v1.split(".");
      v2 = v2.split(".");
      const k = Math.min(v1.length, v2.length);
      for (let i = 0; i < k; ++i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
      }
      //return v1.length == v2.length ? 0 : v1.length < v2.length ? -1 : 1;
      if (v1.length < v2.length);
    } catch (_) {
      return false;
    }
  }
  function action(e, installation, code) {
    e.target.disabled = true;
    error_message = null;
    dispatch("install", {
      installid: installation.id,
      addonid: addon.id,
      code,
      confirm: () => {
      },
      error: err => {
        e.target.disabled = false;
        error_message = err.message;
      }
    });
  }

  function cap_description(cap) {
    switch (cap) {
      case "CHOWN":
      case "DAC_OVERRIDE":
      case "DAC_READ_SEARCH":
      case "FOWNER":
      case "FSETID":
        return "<span class='text-danger'>Bypass any process permission checks</span>";
      case "BLOCK_SUSPEND":
      case "SYS_BOOT":
      case "CAP_WAKE_ALARM":
        return "Allows to block system suspend, reboot and set wakeup timers.";
      case "NET_ADMIN":
        return "<span class='text-danger'>Full access to the host networking, including potential traffic sniffing and man in the middle attacks</span>";
      case "NET_BIND_SERVICE":
        return "Allows to bind to a privileged port (port number less than 1024)";
      case "NET_RAW":
        return "Allows to use RAW and PACKET sockets. Allows transparent proxing. <span class='text-danger'>Might be abused for traffic sniffing and man in the middle attacks.</span>";
      case "SYS_ADMIN":
      case "SYS_MODULE":
      case "SYS_RAWIO":
      case "SYS_PTRACE":
        return "<span class='text-danger'>Full system access, loading of arbitrary kernel modules, access other processes memory!</span>";
      case "SYS_TIME":
        return "Allows to set the system clock. Might be abused to attack time based encryption.";
      case "SYS_RESOURCE":
        return "Allows to override disk quota limits. Allows to use reserved disk space.";
      case "SYSLOG":
        return "System log access";
      default:
        return "Unknown";
    }
  }
</script>

<h4>Permissions</h4>
{#each perm as permission}
  <dl>
    <dt>{permission.label} ({permission.id})</dt>
    <dd>{permission.description}</dd>
  </dl>
{:else}
  <p>No permissions required</p>
{/each}
{#if addon.linux_capabilities}
  <h4>Linux capabilities</h4>
  {#each addon.linux_capabilities as cap}
    <dl>
      <dt>{cap}</dt>
      <dd>
        {@html cap_description(cap)}
      </dd>
    </dl>
  {/each}
{/if}
{#if addon.firewall_allow || addon.ports}
  <h4>Networking</h4>
  {#if addon.firewall_allow && addon.firewall_allow.includes('*')}
    <span class="text-danger">FULL Internet access!</span>
    . An Addon developer should usually restrict this to a set of required
    internet addresses!
  {:else if addon.firewall_allow}
    Allow Internet Access to
    <ul>
      {#each addon.firewall_allow as rule}
        <li>{rule}</li>
      {/each}
    </ul>
  {/if}
  {#if addon.ports}
    Expose ports to Internet:
    {#each addon.ports as rule}{rule};&nbsp;{/each}
  {/if}
{/if}
{#each installs_with_addon(data.installations, actionqueue) as [installment, thisaddon, queue]}
  <div class="card m-3 p-3">
    <h5>{installment.title}</h5>
    {#if thisaddon.s == 'downloading'}
      <button disabled class="btn btn-outline-info">
        Downloading Addon: {thisaddon.d * 100}%
      </button>
    {:else if thisaddon.s == 'installing'}
      <button disabled class="btn btn-outline-info">Installing &hellip;</button>
    {:else if thisaddon.s == 'uninstalling'}
      <button disabled class="btn btn-outline-info">
        Uninstalling &hellip;
      </button>
    {:else if thisaddon.s == 'installed'}
      <small class="mb-2">This Addon is already installed</small>
      <div class="btn-group">
        <button
          class="btn btn-outline-danger mr-3"
          disabled={queue && queue.c=='uninstall'}
          on:click={e => action(e, installment, 'uninstall')}>
          Uninstall
        </button>
        <button
          class="btn btn-outline-warning"
          disabled={is_old_version(thisaddon) || queue && queue.c=='update'}
          on:click={e => action(e, installment, 'update')}>
          Update {thisaddon.v} to {addon.version}
        </button>
      </div>
    {:else if thisaddon.s == 'error'}
      <p>An error occured: {thisaddon.d}</p>
    {:else}
      <button
        class="btn btn-outline-success"
        disabled={queue && queue.c=='install'}
        on:click={e => action(e, installment, 'install')}>
        Install
      </button>
    {/if}
    {#if queue}
      <small>
        <b>Queued!</b>
        The queued Addon task "{queue.c}" will be performed soon by the Addon-Manager.
      </small>
    {/if}
    {#if error_message}
      <small class="text-danger">{error_message}</small>
    {/if}
  </div>
{:else}
  <p>
    No Installations registered! Log into
    <b>Setup &amp; Maintenance</b>
    and click on "Register this installation on openhabx.com".
  </p>
{/each}
