import Cmp from './cmp.svelte';

window.customElements.define('ui-sla', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: {
                sla: this.hasAttribute("value") ? this.getAttribute("value") : 0,
                range: this.hasAttribute("range") ?this.getAttribute("range"):0
        } });
    }

    static get observedAttributes() {
        return ['value', 'range'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "value": { this.value = newValue; break; }
            case "range": { this.range = newValue; break; }
        }
    }

    set value(v) {
        if (!this.cmp) return;
        this.cmp.sla = parseFloat(v);
    }

    set range(v) {
        this.cmp.range = parseFloat(v);
    }

    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});

