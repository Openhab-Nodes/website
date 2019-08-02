<script>
  export let item;
</script>

<svelte:options tag="addons-search-entry" />
{#if item}
  <article>
    <header title={item.id}>
      <span>{item.label}</span>
      <small class="ml-2">{item.version}</small>
    </header>
    <section class="actions">
      <span role="group" class="btn-group">
        <a title="Change Version" class="btn btn-secondary-hover">
          <i class="fas fa-cog" />
          <span class="ml-2">Configure</span>
        </a>
      </span>
    </section>
    <section class="description">
      <span>{item.description}</span>
      <small style="white-space: nowrap; text-overflow: ellipsis;">
        – By {item.author}
      </small>
    </section>
    <footer>
      <button class="ml-auto btn btn-outline-success">
        Check Permissions &amp; Install
      </button>
    </footer>
  </article>
{/if}
