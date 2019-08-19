import Cmp from './cmp.svelte';

window.customElements.define('ui-servicestatus', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const classes = this.getAttribute("class") || "btn btn-primary";
        this.removeAttribute("class");
        this.cmp = new Cmp({ target: this, props: { classes } });
    }
    disconnectedCallback() {
        if (this.cmp && this.cmp.onMount) this.cmp.onMount();
    }
});

