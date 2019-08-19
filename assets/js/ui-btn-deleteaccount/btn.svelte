<script>
  let disabled = true;
  export let classes = "btn btn-primary";

  /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = { };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import("/js/cmp/userdata.js");
    onDestroyProxy = module.UserAwareComponent(
      user_ => {user = user_; disabled = !user},
      data_ => (data = data_),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
  }
  start();
  /// End -- User Aware Component

  function set_removal(e) {
    if (!userdb) return;
    disabled = true;
    userdb
      .queue_removal()
      .then(() => (disabled = false))
      .catch(err => console.warn("Writing failed", err));
  }
  function clear_removal(e) {
    if (!userdb) return;
    disabled = true;
    userdb
      .clear_removal()
      .then(() => (disabled = false))
      .catch(err => console.warn("Writing failed", err));
  }
</script>

{#if data && data.queued_remove}
  <button {disabled} on:click={clear_removal} class={classes}>
    Undo queued removal
  </button>
{:else}
  <button {disabled} on:click={set_removal} class={classes}>
    Delete Account
  </button>
{/if}
