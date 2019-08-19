<script>
  let error_message = null;
  let access_tokens = {};

  /// User Aware Component
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
  }
  start();
  /// End -- User Aware Component

  async function fetch_tokens() {
    return userdata
      .fetch_collection("access_tokens")
      .then(() => (access_tokens = userdata.access_tokens))
      .catch(err => {
        error_message = err.message;
        console.warn("Writing failed", err);
      });
  }

  function revoke(e, token_id, token) {
    e.target.disabled = true;
    userdata
      .remove_from_collection("access_tokens", token_id)
      .then(() => {
        error_message = null;
        e.target.disabled = false;
      })
      .then(() => fetch_tokens())
      .catch(err => {
        e.target.disabled = false;
        error_message = err.message;
        console.warn("Writing failed", err);
      });
  }

  function add_demo(e) {
    if (!userdata || !userdata.user) return;
    e.target.disabled = true;
    const ref = userdb.db()
      .collection("access_tokens")
      .doc(userdata.user.uid + "_" + "dummy");
    ref
      .delete()
      .catch(_ => {})
      .then(() =>
        ref.set({
          uid: userdata.user.uid,
          token: "abcdefghi",
          client_name: "CLI",
          client_id: "ohx",
          scopes: ["cloud_connector", "addon_registry"],
          issued_at: Date.now()
        })
      )
      .then(() => {
        e.target.disabled = false;
        fetch_tokens();
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

{#each Object.entries(access_tokens) as token}
  <div class="card">
    <div class="card-body">
      <div>
        <h4>{token[1].client_name}</h4>
        <p>
          Client: {token[1].client_id}
          <br />
          Scopes: {token[1].scopes.join(', ')}
          <br />
          Issued at: {new Date(parseInt(token[1].issued_at)).toLocaleString()}
        </p>
      </div>
      <div class="mr-3" style="max-width:400px">
        <p class="small">
          It takes up to 60 minutes for a revocation to take affect.
        </p>
        <button
          class="btn btn-danger"
          on:click={e => revoke(e, token[0], token[1])}>
          Revoke
        </button>
      </div>
    </div>
  </div>
{:else}
  <p>No Access Tokens registered!</p>
{/each}

{#if user && user.is_admin}
  <div class="mt-4">
    <button class="btn btn-primary" on:click={add_demo}>
      Add Demo Access Token
    </button>
  </div>
{/if}

{#if error_message}
  <p>{error_message}</p>
{/if}
