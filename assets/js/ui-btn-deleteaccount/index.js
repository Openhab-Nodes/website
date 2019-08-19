import Btn from './btn.svelte';

window.customElements.define('ui-btn-deleteaccount', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const classes = this.getAttribute("class") || "btn btn-primary";
        this.removeAttribute("class");
        this.cmp = new Btn({ target: this, props: { classes } });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});

