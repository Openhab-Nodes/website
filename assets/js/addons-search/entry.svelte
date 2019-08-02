<script>
  import "./starrating.js";
  import { Popover } from "./popover_helper.js";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let item;
  export let ratings = {};
  let gh_meta_data = null;
  let popoverTemplate;
  let ratingElem;

  $: item_rating = item && item.stat ? item.stat.p / item.stat.v : 0.0;
  $: user_item_rating = item && ratings[item.id] ? ratings[item.id] : 0;

  $: logo = item ? (item.logo_url || (item.github ? item.github+"/blob/master/logo.png" : null)) : null;

  async function get_meta_data(item) {
    const storage_key = "cache_addon_" + item.id;
    let cache = localStorage.getItem(storage_key);
    if (cache) cache = JSON.parse(cache);
    let d = new Date(cache && cache.t ? cache.t : 0);
    d.setDate(d.getDate() + 1);
    if (d < Date.now()) {
      // Refresh cache
      const url =
        "https://api.github.com/repos/" +
        item.github.replace("https://www.github.com/", "").replace("https://github.com/", "");
      let response = await fetch(url);
      let data = await response.json();
      if (!(data instanceof Object)) throw new TypeError();
      cache = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        issues: data.open_issues_count,
        license: data.license,
        language: data.language,
        pushed_at: new Date(data.pushed_at),
        t: Date.now()
      };
      localStorage.setItem(storage_key, JSON.stringify(cache));
    }
    gh_meta_data = cache;
  }

  $: if (item && item.github) {
    get_meta_data(item);
  }

  function submit_rate(e) {
    dispatch("rate", { id: item.id, rate: e.detail.rate });
  }

  function popover(node) {
    console.log(node);
    return {
      update(popoverTemplate) {
        if (node.popover) node.popover.destroy();
        const popover = new Popover(node, popoverTemplate, {
          position: "bottom"
        });
        node.popover = popover;
      },
      destroy() {
        popover.destroy();
      }
    };
  }

  function showPopup() {
    ratingElem.popover.toggle();
  }
</script>

<svelte:options tag="addons-entry" />
{#if item}
  <article
    use:popover={popoverTemplate}
    bind:this={ratingElem}
    class="mb-3"
    on:click={e => dispatch('click', { id: item.id })}>
    <header title={item.id}>
      <span>{item.label}</span>
      <small class="ml-2">{item.version}</small>
      <small class="" style="white-space: nowrap; text-overflow: ellipsis;">
        – By {item.author}
      </small>
    </header>
    <section class="description">
      <span>{item.description}</span>
    </section>
    <footer>
      {#if gh_meta_data}
        <a
          class="mr-2 noref"
          href={item.github}
          target="_blank"
          title={item.github}>
          <span class="mr-2">
            <i class="fas fa-star" />
            {gh_meta_data.stars} Stars
          </span>
          <span class="mr-2">
            <i class="fas fa-info-circle" />
            {gh_meta_data.issues} Issues
          </span>
        </a>
        {#if item.stat}
          <span class="mr-2">
            <i class="fas fa-download" />
            {item.stat.d} Downloads
          </span>
        {/if}
        <ui-star-rating
          class="ml-auto"
          value={item_rating}
          highlight={user_item_rating}
          on:rate={submit_rate}
          on:invalid={showPopup} />
        <div style="visibility:hidden" bind:this={popoverTemplate}>
          You cannot rate.<br>
          You are not logged in.
        </div>
      {/if}
    </footer>
  </article>
{/if}
