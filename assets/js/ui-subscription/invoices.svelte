<script>
  import Iban from "./iban.svelte";
  import RefCode from './refcode.js';

  export let userdata;
  export let user;
  $: storage = userdata ? userdata.storage(userdata.BUCKET_BILLING) : null;
  let cache_valid_until = null;
  let invoices = [];
  let last_pm = null;

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  function bill_status_text(status_code) {
    switch (status_code) {
      case "PENDING":
        return "Waiting for Payment";
      case "RECEIVED":
        return "Received";
      case "SCHEDULED":
        return "Recurring Payment scheduled";
      default:
        return status_code;
    }
  }

  function prepare_download_link(e, bill) {
    if (new URL(e.target.href).hash != "#top") return;
    e.preventDefault();
    const gsReference = storage.refFromURL(
      userdata.BUCKET_BILLING + "/" + user.uid + "/" + bill.id
    );
    gsReference
      .getDownloadURL()
      .then(link => {
        e.target.href = link;
        e.target.click();
      })
      .catch(err => {
        if (err.code == "storage/object-not-found") {
          dispatch("error", `PDF for Invoice #${bill.id} not found!`);
        } else {
          console.warn("Failed to create download link", err);
          dispatch("error", "Failed to create download link " + err.message);
        }
      });
  }

  async function get_invoice_list() {
    let list = localStorage.getItem("invoices");
    if (list) list = JSON.parse(list);
    if (list && list.valid_until > Date.now()) {
      cache_valid_until = list.valid_until;
      invoices = Object.values(list.data);
      return;
    }
    await userdata
      .fetch_collection(userdata.COLL_INVOICES)
      .then(() => {
        const list = userdata[userdata.COLL_INVOICES] || [];
        let d = new Date(Date.now());
        d.setDate(d.getDate() + 1);
        localStorage.setItem(
          "invoices",
          JSON.stringify({ data: list, valid_until: d.getTime() })
        );
        invoices = Object.values(list);
      })
      .catch(err => {
        dispatch("error", `Failed to refresh invoice list: ${err.message}`);
      });
    const pm = invoices.length ? invoices[invoices.length - 1] : null;
    if (pm && pm.payment_method == "IBAN" && pm.status == "PENDING") last_pm = pm;
  }

  function refresh_cache() {
    cache_valid_until = null;
    localStorage.removeItem("invoices");
    get_invoice_list();
  }

  $: if (user) get_invoice_list();

  function demoadd(e) {
    e.preventDefault();
    invoices.push({
      id: "12",
      type: "cloud",
      start: Date.now(),
      end: Date.now(),
      payment_method: "IBAN",
      payment_lastdigits: "0879",
      status: "PENDING",
      status_date: Date.now(),
      amount_euro: "3"
    });
    invoices = invoices;
    const pm = invoices.length ? invoices[invoices.length - 1] : null;
    if (pm && pm.payment_method == "IBAN" && pm.status == "PENDING") last_pm = pm;
  }
</script>

<h4 class="mt-4">
  Invoice History
  <span class="h6">
    <a href="#top" on:click={refresh_cache}>Refresh</a>
    {#if user && user.is_admin}
      |
      <a href="#top" on:click={demoadd}>Add Demo Invoice</a>
    {/if}
  </span>
</h4>

{#if last_pm}
<p>Your last invoice balance is negative. The IBAN details are printed below.</p>
  <Iban value={last_pm.amount_euro} currency="€" refcode={RefCode(user, new Date(last_pm.start))} />
{/if}

<table class="table table-hover">
  <thead>
    <tr>
      <th>No</th>
      <th>Type</th>
      <th>Access Period</th>
      <th>Payment Method</th>
      <th>Status</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    {#each invoices as bill}
      <tr>
        <td>
          <a
            href="#top"
            title="Download Invoice"
            on:click={e => prepare_download_link(e, bill)}>
            #{bill.id}
          </a>
        </td>
        <td>{bill.type}</td>
        <td>
          {new Date(parseInt(bill.start)).toLocaleString()} - {new Date(parseInt(bill.end)).toLocaleString()}
        </td>
        <td>{bill.payment_method} &hellip;{bill.payment_lastdigits}</td>
        <td class:text-danger={bill.status=="PENDING"}>
          {bill_status_text(bill.status)}
          {#if bill.status_date}
            {new Date(parseInt(bill.status_date)).toLocaleString()}
          {/if}
        </td>
        <td>{bill.amount_euro}</td>
      </tr>
    {:else}
      <tr>
        <td colspan="6">No entry</td>
      </tr>
    {/each}
  </tbody>
</table>
