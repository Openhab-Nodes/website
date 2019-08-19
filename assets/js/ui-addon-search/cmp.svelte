<script>
  let target;
  let textInput;
  let filters = {
    binding: true,
    ioservice: true,
    ruletemplate: true
  };

  function updateFilters(f) {
    target.filters = f;
    console.log("SET FILTERS in updateFilters");
    updatePlaceholder(target.count);
  }

  $: if (target) updateFilters(filters);

  function updatePlaceholder(c) {
    textInput.placeholder = `Search ${c} entries`;
  }

  function input(val) {
    target.searchstring = val;
  }

  function reset() {
    input("");
    textInput.value = "";
  }

  export function start(target_) {
    if (!target_) {
      throw new Error("Target not set!");
    }
    target = target_;
    target.addEventListener("ready", (e) => updatePlaceholder(e.detail.count), { once: true });
  }
</script>

<form
  id="addonsearchform"
  action="#"
  onsubmit="event.preventDefault();return false;"
  on:reset|preventDefault|stopPropagation={e => reset()}>
  <div class="form-group search-group">
    <input
      class="form-control"
      autofocus="true"
      required
      on:input={e => input(e.target.value)}
      type="search"
      bind:this={textInput} />
    <button class="close-icon" type="reset" />
  </div>
  <div class="form-group d-flex justify-content-around">
    <div class="custom-control custom-checkbox">
      <input
        type="checkbox"
        class="custom-control-input"
        name="binding"
        id="chkBindings"
        bind:checked={filters.binding} />
      <label class="custom-control-label" for="chkBindings">Bindings</label>
    </div>
    <div class="custom-control custom-checkbox">
      <input
        type="checkbox"
        class="custom-control-input"
        name="ioservice"
        id="chkIOServices"
        bind:checked={filters.ioservice}/>
      <label class="custom-control-label" for="chkIOServices">
        IO Services
      </label>
    </div>
    <div class="custom-control custom-checkbox">
      <input
        type="checkbox"
        class="custom-control-input"
        name="ruletemplate"
        id="chkRuleTemplates"
        bind:checked={filters.ruletemplate}/>
      <label class="custom-control-label" for="chkRuleTemplates">
        Rule Templates
      </label>
    </div>
  </div>
</form>
