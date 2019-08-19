<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  import CurrencyConverter from "./currency.svelte";
  export let value = 0;
  export let currency = "€";
  export let refcode;
</script>

<samp class="card p-3 mb-4">
  <table>
    <tr>
      <td>Account Holder:&nbsp;</td>
      <td>David Graeff</td>
    </tr>
    <tr>
      <td>IBAN:</td>
      <td>DE78 2004 1155 0841 2900 00</td>
    </tr>
    <tr>
      <td>BIC:</td>
      <td>COBADEHD055</td>
    </tr>
    <tr>
      <td>Reference Code:</td>
      <td>{refcode}</td>
    </tr>
    <tr>
      <td>Amount:</td>
      <td>
        <CurrencyConverter
          {value}
          bind:currency
          on:output={e => dispatch('output', e.detail)} />
      </td>
    </tr>
  </table>
</samp>
