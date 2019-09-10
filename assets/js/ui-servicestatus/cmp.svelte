<script>
  let firebase;
  let disabled = true;
  export let classes = "";

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

  async function start() {
    let module = await import("/js/cmp/userdata.js");
    firebase = module.firebase;
    await module.userdata.ready();
    let user = module.userdata.user;

    for (let [serviceid, service] of Object.entries(services)) {
      const cache = localStorage.getItem("servicetest/" + serviceid);
      if (cache && cache.ttl > Date.now()) {
        service.ok = true;
        service.cached = true;
        service.last_checked = cache.last_checked;
        services[serviceid] = service; // Assignment for svelte reactive
        continue;
      }
      let f = null;
      if (service.test_url.startsWith("http")) {
        f = fetch(service.test_url, { mode: "no-cors" }).then(res => {
          if (res.status < 200 || res.status >= 300) {
            throw new Error(`Unhealthy status code ${res.status}`);
          }
        });
      } else if (service.test_url.startsWith("gs")) {
        const storage = firebase.app().storage(service.test_url);
        const storageRef = storage.ref();
        const listRef = storageRef.child(user.uid);
        f = listRef.listAll();
      }
      if (!f) {
        service.ok = false;
        console.error("Not supported service!");
        return;
      }
      f.then(() => {
        service.ok = true;
        service.last_checked = Date.now();
        service.ttl = Date.now() + 3600 * 1000;
        localStorage.setItem(
          "servicetest/" + service.id,
          JSON.stringify(service)
        );
        services[serviceid] = service; // Assignment for svelte reactive
      }).catch(e => {
        service.error_msg = e.message;
        service.ok = false;
        service.last_checked = Date.now();
        services[serviceid] = service; // Assignment for svelte reactive
      });
    }
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
