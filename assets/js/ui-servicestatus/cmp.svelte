<script>
  let disabled = true;
  export let classes = "";
  import { onDestroy } from "svelte";
  let onDestroyProxy = () => {};
  onDestroy(() => onDestroyProxy());

  let services = {
    registry: {
      title: "Addon Registry",
      test_url: "https://registry.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    oauth: {
      title: "OAuth Tokens",
      test_url: "https://oauth.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    subscriptions: {
      title: "Subscriptions",
      test_url: "https://subscription.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    backup: {
      title: "Backup Storage",
      test_url: "gs://openhabx-backups",
      last_checked: 0,
      ok: false,
      timer: null
    }
  };

  $: services_values = Object.values(services);

  function check_cache(serviceid, service) {
    const cache = localStorage.getItem("servicetest/" + serviceid);
    if (cache && cache.ttl > Date.now()) {
      service.ok = true;
      service.cached = true;
      service.last_checked = cache.last_checked;
      services[serviceid] = service; // Assignment for svelte reactive
      return true;
    }
    return false;
  }

  function check_result(serviceid, service, f) {
    f.then(() => {
      service.ok = true;
      service.last_checked = Date.now();
      service.ttl = Date.now() + 3600 * 1000;
      localStorage.setItem("servicetest/" + serviceid, JSON.stringify(service));
      services[serviceid] = service; // Assignment for svelte reactive
    }).catch(e => {
      service.error_msg = e.message;
      service.ok = false;
      service.last_checked = Date.now();
      services[serviceid] = service; // Assignment for svelte reactive
    });
  }

  async function start() {
    for (let [serviceid, service] of Object.entries(services)) {
      if (!service.test_url.startsWith("http")) continue;
      if (check_cache(serviceid, service)) continue;

      check_result(
        serviceid,
        service,
        fetch(service.test_url).then(res => {
          if (res.status < 200 || res.status >= 300) {
            throw new Error(`Unhealthy status code ${res.status}`);
          }
        })
      );
    }

    let module = await import("/js/cmp/userdata.js");
    let firebase = module.firebase;
    onDestroyProxy = module.UserAwareComponent(user => {
      for (let [serviceid, service] of Object.entries(services)) {
        if (!service.test_url.startsWith("gs")) continue;
        if (check_cache(serviceid, service)) continue;

        const storage = firebase.app().storage(service.test_url);
        const storageRef = storage.ref();
        if (user) {
          const listRef = storageRef.child(user.uid);
          check_result(serviceid, service, listRef.listAll());
        } else {
          check_result(serviceid, service, Promise.reject(new Error("No user session")));
        }
      }
    });
  }
  start();
</script>

<div
  class={classes}
  style="display: grid;grid-auto-flow: column; grid-auto-columns:
  200px;grid-gap:20px">
  {#each services_values as service}
    <div>
      {service.title}
      {#if service.ok}
        <span
          class="text-success"
          title="Last checked: {new Date(service.last_checked).toLocaleString()}.
          Cached: {service.cached ? 'Yes' : 'No'}">
          OK
        </span>
      {:else if service.last_checked === 0}
        <span class="text-warning">&hellip;</span>
      {:else}
        <span
          class="text-danger"
          title="Last checked: {new Date(service.last_checked).toLocaleString()}.
          Error: {service.error_msg}">
          Failed
        </span>
      {/if}
    </div>
  {/each}
</div>
