<script>
  import Invoices from "./invoices.svelte";
  import CurrencyConverter from "./currency.svelte";
  import SubscriptionPlan from "./subscription_plan.svelte";
  import Iban from "./iban.svelte";

  let error_message = null;
  let error_message_braintree = null;
  let fetchWithAuth;
  let mode = "plans";
  let plans = [];
  let summary = { recurring: false };

  // Braintree
  let payment_instance;
  let braintree_container;

  export let classes = "";

  /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = {};
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const temp = await (await fetch("/run/subscriptions.json")).json();
    for (let plan of temp) {
      if (!plan.euro_price) plan.euro_price = 0;
      plan.euro_price_value = plan.euro_price.min
        ? plan.euro_price.min
        : plan.euro_price;
    }
    plans = temp;

    const module = await import("/js/cmp/userdata.js");
    onDestroyProxy = module.UserAwareComponent(
      user_ => (user = user_),
      data_ => (data = data_),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
    fetchWithAuth = module.fetchWithAuth;
  }
  start().catch(err => {
    console.warn("Failed to request client token!", err);
    error_message = "Failed to request client token! " + err.message;
  });
  /// End -- User Aware Component

  async function start_braintree(change_plan) {
    const module = await import("/js/cmp/payment.js");
    let braintree = module.braintree;
    fetchWithAuth("subscription.openhabx.com/clienttoken")
      .then(json => {
        if (!json.client_token)
          throw new Error("Response does not contain a client token!");
        const opts = {
          authorization: json.client_token,
          container: braintree_container,
          paypal: {
            flow: "vault"
          },
          preselectVaultedPaymentMethod: true
        };
        braintree.create(opts, (err, dropinInstance) => {
          if (err) {
            error_message_braintree = err.message;
            console.error(err);
            return;
          }
          payment_instance = dropinInstance;
        });
      })
      .catch(err => {
        console.warn("Failed to request client token!", err);
        error_message_braintree =
          "Failed to request client token! " + err.message;
      });

    return {
      destroy() {}
    };
  }

  function confirm_iban(e) {
    mode = "confirmation";
  }

  function confirm(e) {
    payment_instance.requestPaymentMethod((err, payload) => {
      if (err) {
        error_message = err.message;
        console.error(err);
        return;
      }
      fetchWithAuth(
        "subscription.openhabx.com/confirm",
        "POST",
        JSON.stringify(payload)
      ).catch(err => {
        console.warn("Failed to request client token!", err);
        error_message = "Failed to request client token! " + err.message;
      });
    });
  }

  import RefCode from "./refcode.js";

  function select_plan(e) {
    let plan = plans.find(p => p.id == e.detail);
    summary.plan = plan;
    summary.start =
      data.subscription && data.subscription.ends
        ? data.subscription.ends
        : Date.now();
    const d = new Date();
    d.setDate(d.getDate() + 30);
    summary.end = d.getTime();
    summary.user_currency = "€";
    summary.user_currency_value = plan.euro_price_value;
    const start_date = new Date(summary.start);
    summary.refcode = RefCode(user, start_date);

    mode = "options";
  }

  function demo_subscribed() {}
</script>

<style>
  .stats {
    display: grid;
    grid-template-columns: minmax(100px, 300px) 1fr;
    grid-gap: 10px;
  }
</style>

{#if mode == 'confirmation'}
  asd
{:else if mode == 'checkout'}
  <tab-container>
    <tab-header>
      <tab-header-item class="tab-active">
        IBAN Bank Account Transfer
      </tab-header-item>
      <tab-header-item>PayPal, Credit Card</tab-header-item>
    </tab-header>
    <tab-body>
      <tab-body-item>
        <p>
          An IBAN (Swift) transaction usually takes about 1 and up to 3 business
          days, but will save transaction and payment gateway fees. To
          compensate for the non-instant IBAN experience, your subscription
          status will still be upgraded
          <b>immediately</b>
          as with other payment options.
        </p>
        <p>
          Please perform the bank transfer in the near future though. The
          account is automatically checked every 24 hours (
          <a
            href="https://github.com/openhab-nodes/cloud-subscriptions"
            target="_blank">
            check the source code
          </a>
          ).
        </p>
        <Iban
          value={summary.plan.euro_price_value}
          refcode={summary.refcode}
          bind:currency={summary.user_currency}
          on:output={e => (summary.user_currency_value = e.detail)} />
        <div>
          <button class="btn btn-secondary" on:click={e => (mode = 'options')}>
            Back
          </button>
          <button class="btn btn-primary" on:click={confirm_iban}>
            Finish Checkout &amp; Send confirmation Mail
          </button>
        </div>
      </tab-body-item>
      <tab-body-item>
        <div bind:this={braintree_container} use:start_braintree />
        {#if error_message_braintree}
          <p class="text-danger">{error_message_braintree}</p>
        {/if}

        <div>
          <button class="btn btn-secondary" on:click={e => (mode = 'options')}>
            Back
          </button>
          <button class="btn btn-primary" on:click={confirm}>
            Finish Checkout &amp; Send confirmation Mail
          </button>
        </div>
      </tab-body-item>
    </tab-body>
  </tab-container>
{:else if mode == 'options'}
  <div class="card">
    <div class="card-body">
      <p>Subscription Type: {summary.plan ? summary.plan.title : ''}</p>
      <div
        style="display: grid;grid-auto-flow: column; grid-auto-columns:
        300px;grid-gap:20px">
        <label>
          <input
            type="radio"
            name="options"
            bind:group={summary.recurring}
            value={false} />
          One Month -
          <b>{summary.user_currency_value.toFixed(2)}{summary.user_currency}</b>
          <br />
          <small>
            Period: {new Date(parseInt(summary.start)).toLocaleDateString()} - {new Date(parseInt(summary.end)).toLocaleDateString()}
          </small>
        </label>
        <label>
          <input
            type="radio"
            name="options"
            bind:group={summary.recurring}
            value={true} />
          Recurring* -
          <b>
            {summary.user_currency_value.toFixed(2)}{summary.user_currency} /
            month
          </b>
          <br />
          <small>
            Start: {new Date(parseInt(summary.start)).toLocaleDateString()}
          </small>
        </label>
      </div>
      <p class="small">* You can cancel the subscription on a monthly base.</p>
      <p>
        (~
        <CurrencyConverter
          value={summary.plan.euro_price_value}
          bind:currency={summary.user_currency}
          on:output={e => (summary.user_currency_value = e.detail)} />
        )
      </p>

      {#if summary.plan.euro_price_value > 3}
        <p>
          Your financial contribution will greatly help to add more exiting
          stuff to this project. Thanks.
        </p>
      {/if}
      <p>
        <label>
          <input type="checkbox" name="agb" bind:checked={summary.agb} />
          You accept our
          <a href="/terms" target="_blank">Terms Of Service</a>
        </label>
      </p>
      <div>
        <button class="btn btn-secondary" on:click={e => (mode = 'plans')}>
          Back
        </button>
        <button
          class="btn btn-primary"
          on:click={e => (mode = 'checkout')}
          disabled={!summary.agb}>
          Continue to Checkout
        </button>
      </div>
    </div>
  </div>
{:else if mode == 'plans'}
  <div id="plans" class="row">
    {#each plans as plan}
      <SubscriptionPlan
        {plan}
        {user}
        on:select={select_plan}
        selected={data && data.subscription && data.subscription.plan ? data.subscription.plan == plan.id : plan.id == 'free'} />
    {/each}
  </div>

  <h4 class="mt-4">Account</h4>
  <div class="card mt-4">
    <div class="card-body stats">
      <span>Accumulated Influence Points</span>
      <span>{data && data.influence_points ? data.influence_points : 0}</span>
    </div>
  </div>

  <Invoices
    userdata={userdb}
    {user}
    on:error={e => (error_message = e.detail)} />
{/if}

{#if error_message}
  <p class="text-danger">{error_message}</p>
{/if}
