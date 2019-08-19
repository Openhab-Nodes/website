<script>
  export let plan = {};
  export let user = {};
  export let selected = false;
  import snarkdown from "./markdown.js";

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  $: button_text = !plan.euro_price_value
    ? "Free"
    : plan.euro_price_value + " € / Month";

  function prop_value(prop, minmax, cost) {
    if (!minmax.min) return prop.base;
    const range = minmax.max - minmax.min;
    const lrange = prop.max - prop.base;
    return prop.base + Math.floor(lrange * ((cost - minmax.min) / range));
  }

  function select_plan(e, plan_id) {
    e.target.disabled = true;
    e.preventDefault();
    dispatch("select", plan_id);
  }
</script>

<style>
  .plans {
    display: grid;
    grid-template-columns: 33% 33% 33%;
    grid-gap: 10px;
  }
</style>

<form class="col" id="subscriptionPlan{plan.id}" class:active={selected}>
  {#if plan.euro_price.min}
    <ui-subscription-flexible target="subscriptionPlan{plan.id}" />
  {/if}
  <input
    type="hidden"
    name="c"
    value={plan.euro_price.min ? plan.euro_price.min : plan.euro_price} />
  <input type="hidden" name="p" value={plan.id} />
  <div class="header">
    <h4>
      {@html snarkdown(plan.title)}
    </h4>
    <i class="img {plan.icon}" style="font-size: 60pt;line-height: 120pt;" />
  </div>
  <p class="text-center p-2">
    {@html snarkdown(plan.desc)}
  </p>
  <div class="mx-4 mb-2 table table-sm">
    <table>
      <tbody>
        {#each Object.entries(plan.properties) as [$propid, $prop]}
          <tr>
            <td>
              <output data-min={$prop.base} data-max={$prop.max} name={$propid}>
                {prop_value($prop, plan.euro_price, plan.euro_price_value)}
              </output>
              {#if $prop.suffix}{$prop.suffix}{/if}
            </td>
            <td>
              {#if $prop.details_html_tag}
                <ui-tooltip maxwidth>
                  <button
                    class="btn-link contexthelp"
                    title="Context help"
                    slot="button">
                    {@html snarkdown($prop.title)}
                  </button>
                  {@html `<${$prop.details_html_tag} value=${prop_value($prop, plan.euro_price, plan.euro_price_value)}></${$prop.details_html_tag}>`}
                </ui-tooltip>
              {:else}
                {@html snarkdown($prop.title)}
              {/if}
              {#if $prop.desc}
                <br />
                <small>
                  {@html snarkdown($prop.desc)}
                </small>
              {/if}
            </td>
          </tr>
        {/each}
        <tr>
          <td>&check;</td>
          <td class="plans_feat_compact">
            {#each plan.features as $feat, $featid}
              {#if $feat.details}
                <ui-tooltip maxwidth>
                  <button
                    class="btn-link contexthelp"
                    title="Context help"
                    slot="button">
                    {@html snarkdown($feat.title)}
                  </button>
                  {@html snarkdown($feat.details)}
                </ui-tooltip>
              {:else}
                <span>
                  {@html snarkdown($feat.title)}
                  {#if $feat.desc}
                    &nbsp;
                    {@html '(' + snarkdown($feat.desc) + ')'}
                  {/if}
                </span>
              {/if}
            {/each}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="text-center mb-3">
    {#if plan.euro_price.min}
      <input
        type="range"
        min={plan.euro_price.min}
        max={plan.euro_price.max}
        bind:value={plan.euro_price_value}
        class="slider"
        id="subscriptionValue" />
    {/if}
    {#if selected}
      <button disabled class="btn btn-success btn-impressive">
        {button_text}
      </button>
    {:else}
      <button
        class="btn btn-primary btn-impressive"
        on:click={e => select_plan(e, plan.id)}>
        {button_text}
      </button>
    {/if}
  </div>
</form>
