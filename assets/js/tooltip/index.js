import { Popover } from "./popover_helper.js";

/**
 * Usage:
 * 
 * With external button:
 * <button id="mybutton" class="contexthelp">Click here</button>
 * <ui-tooltip target="mybutton">
 *   <div>Some content</div>
 * </ui-tooltip>
 * 
 * With inline button
 * <ui-tooltip>
 *   <button class="btn-link contexthelp" title="Context help" slot="button">Click here</button>
 *   <div>Some content</div>
 * </ui-tooltip>
 */
window.customElements.define('ui-tooltip', class extends HTMLElement {
  constructor() {
    super();
    this.clickCb = e => this.click(e);
    this.attachShadow({mode: 'open'}).innerHTML="<link rel='stylesheet' href='/css/main.min.css'><div style='position:fixed;visibility:hidden;z-index:100' id='main'><slot></slot></div><slot name='button'></slot>";
  }

  click(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      }
    this.popover.toggle();
  }

  connectedCallback() {
    window.requestAnimationFrame(()=> this.connectedCallbackDelayed());
  }

  connectedCallbackDelayed() {
    const defaultSlot = this.shadowRoot.querySelector('#main');
    if (this.hasAttribute("maxwidth")) defaultSlot.style.maxWidth= "500px";

    let trigger = this.hasAttribute("target")? document.getElementById(this.getAttribute("target")):null;

    if (this.popover) this.popover.destroy();

    this.popover = new Popover(trigger||this, defaultSlot, { position: 'bottom' });
    if (!trigger) trigger = this.shadowRoot.querySelector('slot[name="button"]');
    if (trigger) {
      trigger.removeEventListener('click', this.clickCb);
      trigger.addEventListener('click', this.clickCb);
    }
  }
  disconnectedCallback() {
    if (this.popover) this.popover.destroy();
    delete this.popover;
    const trigger = document.getElementById(this.getAttribute("target"));
    if (trigger) trigger.removeEventListener('click', this.clickCb);
  }
});
