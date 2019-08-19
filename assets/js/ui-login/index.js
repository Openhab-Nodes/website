import Cmp from './cmp.svelte';

window.customElements.define('ui-login', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: {
                redirect_url: this.hasAttribute("no-redirect") ? null : (this.getAttribute("redirecturl") || "/dashboard"),
                lang: this.hasAttribute("lang") ? this.getAttribute("lang") : "en",
                legal_link_new_tab: this.hasAttribute("legal-link-new-tab")
            }
        });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
