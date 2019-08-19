<script>
  let disabled = true;
  let error_messages = {};
  let error_message;

  import { onDestroy } from "svelte";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import("/js/cmp/userdata.js");
    onDestroyProxy = module.UserAwareComponent(
      user_ => (user = user_),
      data_ => (data = Object.assign({ installations: {} }, data_)),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
    disabled = false;
  }
  start();

  function action(e, install, actioncode) {
    e.target.disabled = true;
    userdb
      .queue_action(install.id, actioncode)
      .then(() => {
        error_messages[install.id] = null;
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        error_messages[install.id] = err.message;
        console.warn("Writing failed", err);
      });
  }

  function remove_action(e, install, actioncode) {
    e.target.disabled = true;
    userdb
      .remove_queued_action(install.id, actioncode)
      .then(() => {
        error_messages[install.id] = null;
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        error_messages[install.id] = err.message;
        console.warn("Writing failed", err);
      });
  }

  function unregister(e, install) {
    e.target.disabled = true;
    userdb
      .remove_installation(install)
      .then(() => {
        error_messages[install.id] = null;
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        error_messages[install.id] = err.message;
        console.warn("Writing failed", err);
      });
  }

  function add_demo(e) {
    e.target.disabled = true;
    userdb
      .add_installation({
        title: "My dummy",
        id: "dummy",
        last_seen: Date.now(),
        started: Date.now(),
        updates: 2,
        ip: ["129.123.43.1"],
        addons: {
          "binding-hue": { s: "installed", d: "running", v: "2.5.0" },
          "binding-zwave": { s: "downloading", d: 0.12, v: "2.5.1" }
        }
      })
      .then(() => {
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        error_message = err.message;
        console.warn("Writing failed", err);
      });
  }
</script>

<style>
  .card:hover {
    box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.2),
      0 2px 8px 4px rgba(60, 64, 67, 0.1);
  }
  .card-body {
    display: flex;
  }
  .card-body > div:first-child {
    flex: 1;
  }
</style>

{#each Object.values(data.installations) as install}
  <div class="card">
    <div class="card-body">
      <div>
        <h4>{install.title}</h4>
        <p>
          Installed Addons: {install.addons ? Object.keys(install.addons).length : 0}
          ({Object.keys(install.addons).join(', ')})
          <br />
          Available Updates: {install.updates}
        </p>
        <p>
          Last Seen: {new Date(install.last_seen).toLocaleString()}
          <br />
          Running since: {new Date(install.started).toLocaleString()}
          <br />
          IP: {install.ip.join(', ')}
        </p>
      </div>
      <div class="mr-3" style="max-width:400px">
        Command Queue:
        {#if !actionqueue || !actionqueue[install.id]}
          0
        {:else}
          {Object.keys(actionqueue[install.id]).length} (&rArr;
          {#each Object.entries(actionqueue[install.id]) as [queuekey, item]}
            <button
              title="Remove this command"
              class="btn btn-link"
              on:click={e => remove_action(e, install, queuekey)}>
              {queuekey}
              {#if item.aid}
                 ({item.c})
              {/if}
            </button>
            &rArr;
          {/each}
          )
        {/if}
        <p class="small">
          Please note that commands are queued and not executed directly.
        </p>

        <button
          class="btn btn-secondary"
          on:click={e => action(e, install, 'update')}>
          Update
        </button>
        <button
          class="btn btn-secondary"
          on:click={e => action(e, install, 'restart')}>
          Restart
        </button>
        <button class="btn btn-danger" on:click={e => unregister(e, install)}>
          Unregister
        </button>
        {#if error_messages[install.id]}
          <p>{error_messages[install.id]}</p>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <p>No Installations registered!</p>
{/each}

{#if user && user.is_admin}
  <div class="mt-4">
    <button class="btn btn-primary" on:click={add_demo}>
      Add Demo Installation
    </button>
  </div>
{/if}

{#if error_message}
  <p>{error_message}</p>
{/if}
