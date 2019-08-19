import Cmp from './cmp.svelte';

window.customElements.define('ui-addon-search', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({ target: this, props: {} });
        window.requestAnimationFrame(()=>this.cmp.start(document.getElementById(this.getAttribute("target"))));
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});

