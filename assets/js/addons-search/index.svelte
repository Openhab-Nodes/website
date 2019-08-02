<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import ResultEntry from "./resultentry.svelte";
  import Entry from "./entry.svelte";

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let bindings = undefined;
  export let ioservices = undefined;
  export let ruletemplates = undefined;
  export let userdata = { ratings: {} };
  let bindingsChk = undefined;
  let ioservicesChk = undefined;
  let ruletemplatesChk = undefined;
  let filters = { binding: true, ioservice: true, ruletemplate: true };

  function chkChanged(ev) {
    filters[ev.target.name] = ev.target.checked;
    console.log(filters);
  }

  export let src = undefined;
  let database = undefined;
  let loading = false;
  let db = [];
  let error_message = "";

  export let search = undefined;
  export let form = undefined;
  let searchInput = undefined;
  let searchstring = "";
  let seachresults = [];

  $: if (database && database.searchstr) {
    let resMap = {};
    const string = database.searchstr;
    let seachresults_t = [];
    try {
      const matches = string.matchAll(searchstring);
      for (const match of matches) {
        const start = string.lastIndexOf("{", match.index);
        if (resMap[start]) continue;
        resMap[start] = true;
        const end = string.indexOf("}", match.index);
        seachresults_t.push(JSON.parse(string.substring(start, end + 1)).id);
        // console.log(string.substring(start, end + 1));
      }
    } catch (e) {
      error_message = e.message;
    }
    seachresults = seachresults_t;
  }

  $: seachresults_filtered = seachresults
    .map(item => database.db_by_id[item])
    .filter(item => filters[item.type]);

  let recommended = [];
  let last_updated = [];
  let often_installed = [];

  function dbChanged(ev) {
    loading = !ev.detail.ok && !ev.detail.err;
    if (loading) return;
    db = ev.target.db;
    recommended = ev.target.recommended;
    last_updated = ev.target.last_updated.slice(0, 7);
    often_installed = ev.target.often_installed.slice(0, 3);
  }

  /**
   * @param[string] id The addon id
   */
  function setSearchTerm(id = "") {
    if (!searchInput) return;
    searchInput.value = id;
    searchInput.dispatchEvent(new Event("input"));
  }

  function resetSearchTerm() {
    if (!searchInput) return;
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
  }

  function searchChanged(ev) {
    ev.preventDefault();
    error_message = "";
    searchstring = ev.target.value;
    console.log("CALL", searchstring.length, ev.target.value);
  }

  $: if (db && searchInput) {
    let count = 0;
    for (let item of db) if (filters[item.type]) ++count;
    searchInput.placeholder = `Searching ${count} Addons`;
  }

  $: if (src && bindings && ioservices && ruletemplates && search) {
    bindingsChk = document.getElementById(bindings);
    ioservicesChk = document.getElementById(ioservices);
    ruletemplatesChk = document.getElementById(ruletemplates);
    if (bindingsChk) bindingsChk.addEventListener("change", chkChanged);
    if (ioservicesChk) ioservicesChk.addEventListener("change", chkChanged);
    if (ruletemplatesChk)
      ruletemplatesChk.addEventListener("change", chkChanged);

    searchInput = document.getElementById(search);
    let searchForm = document.getElementById(form);
    if (searchInput) {
      searchInput.addEventListener("input", searchChanged);
      searchForm.addEventListener("reset", resetSearchTerm);
    }

    database = document.getElementById(src);
    if (database) {
      if (database.db.length > 0) db = database.db;
      database.addEventListener("loader", dbChanged);
    }
  }

  function submit_rate(e) {
    userdata.ratings[e.detail.id] = e.detail.rate;
    dispatch("userdata", { userdata });
    console.log(userdata);
  }

  onMount(() => {
    return () => {
      if (bindingsChk) bindingsChk.removeEventListener("change", chkChanged);
      if (ioservicesChk)
        ioservicesChk.removeEventListener("change", chkChanged);
      if (ruletemplatesChk)
        ruletemplatesChk.removeEventListener("change", chkChanged);
      if (searchInput) {
        searchInput.removeEventListener("input", searchChanged);
      }
      if (form) searchForm.removeEventListener("reset", resetSearchTerm);
      if (database) database.removeEventListener("loader", dbChanged);
    };
  });
</script>

<link rel="stylesheet" href="/css/main.min.css" />
<link rel="stylesheet" href="/css/addons.min.css" />
<link rel="stylesheet" href="/css/fontawesome.min.css" />

{#if loading}
  <h1>Loading...</h1>
{:else if searchstring.length === 0}
  <div class="searchoverview mt-4">
    <section>
      <h2>Often Installed</h2>
      {#each often_installed as item}
        <Entry
          ratings={userdata.ratings}
          {item}
          on:rate={submit_rate}
          on:click={e => setSearchTerm(e.detail.id)} />
      {/each}
    </section>

    <section>
      <h2>Recommended</h2>
      {#each recommended as item}
        <Entry
          ratings={userdata.ratings}
          {item}
          on:rate={submit_rate}
          on:click={e => setSearchTerm(e.detail.id)} />
      {/each}
    </section>

    <section>
      <h2>How To Publish</h2>
      <p>
        Learn how to write and publish your own Addon in the
        <a href="/developer/addons">Developer Section</a>
        . Publish Rule Templates via the
        <b>Setup &amp; Maintenance</b>
        interface.
      </p>
      <h2>Latest Updates</h2>
      <ul>
        {#each last_updated as item}
          <li class="mb-2">
            {item.label}
            {#if item.changelog_url}
              <a href={item.changelog_url}>Changelog</a>
            {/if}
            <br />
            Updated on {new Date(item.last_updated).toLocaleString()} to version
            {item.version}.
          </li>
        {/each}
      </ul>
    </section>
  </div>
{:else}
  <div class="ui_addon_cards list container my-4">
    {#each seachresults_filtered as item}
      <ResultEntry {item} />
    {:else}
      <p>
        No results found :/
        <br />
        Did you know that you can use "." as search term to show all Addons? :)
      </p>
      {#if error_message}
        <div class="bs-callout bs-callout-warning">{error_message}</div>
      {/if}
    {/each}
  </div>
{/if}
<svelte:options tag="ui-addons-search" />
