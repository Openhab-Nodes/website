<script>
  let firebase;
  let disabled = true;
  export let classes="btn btn-primary";

  async function start() {
    let module = await import("/js/cmp/userdata.js");
    firebase = module.firebase;
    disabled = false;
  }
  start();

  function signout() {
    if (!firebase) return;
    firebase.auth().signOut();
  }
</script>
<button {disabled} on:click={signout} class="{classes}">Sign out</button>
