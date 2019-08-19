<script>
  let is_loading = true;
  let loading_msg = "Loading";
  let is_signedin = false;
  let userimg_url = "";
  let username = "";
  let unreg_auth_listener;

  import { onDestroy } from "svelte";
  onDestroy(() => {
    if (unreg_auth_listener) unreg_auth_listener();
    unreg_auth_listener = null;
  });

  function check_user(user) {
    if (user) {
      if (user.photoURL) userimg_url = user.photoURL;
      if (user.displayName) username = user.displayName;
      else if (user.email) username = user.email;
      is_signedin = true;
    } else {
      is_signedin = false;
    }
    is_loading = false;
  }

  async function start() {
    let module = await import("/js/cmp/userdata.js");
    let firebase = module.firebase;
    await module.userdata.ready();
    check_user();
    unreg_auth_listener = firebase
      .auth()
      .onAuthStateChanged(check_user, error => {
        loading_msg = "Connection Issue!";
      });
  }

  start();
</script>

<style>
  .usernamewrapper {
    display: flex;
    align-items: center;
  }

  .userimg {
    height: 20px;
    padding-right: 5px;
  }

  .btn {
    margin-left: 50px;
  }
</style>

{#if is_signedin}
  <a
    id="signed-in"
    href="/dashboard"
    class="nav-link btn btn-outline-primary usernamewrapper">
    {#if userimg_url}
      <img class="userimg" src={userimg_url} alt="User Avatar" />
    {/if}
    <span>{username}</span>
  </a>
{:else if is_loading}
  <button class="btn btn-outline-primary disabled" title={loading_msg}>
    {loading_msg}
  </button>
{:else}
  <a href="/login" id="signed-out" class="btn btn-outline-primary">Login</a>
{/if}
