import {Popover} from "./popover_helper.js";

window.customElements.define('ui-tooltip', class extends HTMLElement {
  constructor() {
    super();
    this.initCb = () => this.init();
    this.clickCb = e => this.click(e);
  }

  init() {
    const trigger = document.getElementById(this.getAttribute("target"));
    const popoverTemplate = document.querySelector(`[data-popover=${trigger.id}]`);

    if (!trigger) {
      console.warn("Tooltip did not find target: ", trigger);
      return;
    }
    if (!popoverTemplate) {
      console.warn("Did not find template for ", trigger.id);
      return;
    }
    if (this.popover) this.popover.destroy();

    this.popover = new Popover(trigger, popoverTemplate, { position: 'bottom' });
    trigger.removeEventListener('click', this.clickCb);
    trigger.addEventListener('click', this.clickCb);
  }

  click(e) {
    e.preventDefault();
    this.popover.toggle();
  }

  connectedCallback() {
    document.addEventListener("MainContentChanged", this.initCb);
    this.init();
  }
  disconnectedCallback() {
    if (this.popover) this.popover.destroy();
    const trigger = document.getElementById(this.getAttribute("target"));
    if (trigger) trigger.removeEventListener('click', this.clickCb);

    document.removeEventListener("MainContentChanged", this.initCb);
  }
});
