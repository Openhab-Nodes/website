<script>
  export let value = 0;
  export let currency = "€";
  let output = 0;
  let currencies = { "€": 1.0 };
  let cache_date = null;

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  $: result = (currencies[currency] * value).toFixed(2);
  $: dispatch('output', currencies[currency] * value);

  async function fetchRates() {
    let rates = localStorage.getItem("currency_rates");
    if (rates) rates = JSON.parse(rates);
    // Older than a day
    if (!rates || Date.parse(rates.date) < Date.now() - 3600 * 24 * 1000) {
      console.log("Fetch currency rates");
      rates = await (await fetch(
        "https://api.exchangeratesapi.io/latest"
      )).json();
      rates.rates["€"] = 1.0;
      localStorage.setItem("currency_rates", JSON.stringify(rates));
    }
    cache_date = rates.date;
    rates.rates["€"] = 1.0;
    delete rates.rates.EUR;
    currencies = rates.rates;
  }

  fetchRates();
</script>

<output title="Cached from {cache_date}">{result}</output>
<select
  title="Cached from {cache_date}"
  class="custom-select custom-select-sm"
  style="width:100px"
  on:change={e=>dispatch('currency', currency)}
  bind:value={currency}>
  {#each Object.keys(currencies) as title}
    <option value={title} selected={currency == title}>{title}</option>
  {/each}
</select>
