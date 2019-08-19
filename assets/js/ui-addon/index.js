import Cmp from './cmp.svelte';

window.customElements.define('ui-addon', class extends HTMLElement {
    constructor() {
        super();
        this.unreg=[];
    }
    connectedCallback() {
        this._ok = true;
        this.check();
    }
    async check() {
        if (this.cmp) return;
        const standalone = this.hasAttribute("standalone");
        if (this._ok && this._addondb && (standalone||this._addon) && this._userawarecomponent) {
            this.cmp = new Cmp({
                target: this, props: {
                    UserAwareComponent: this._userawarecomponent,
                    addondb: this._addondb,
                    addon: this._addon,
                    standalone
                }
            });
            this.cmp.start();
            this.unreg.push(this.cmp.$on("install",e=>this.dispatchEvent(e)));
            this.unreg.push(this.cmp.$on("rate",e=>this.dispatchEvent(e)));
        }
    }
    set userawarecomponent(val) {
        this._userawarecomponent = val;
        this.check();
    }
    set addondb(val) {
        this._addondb = val;
        this.check();
    }
    set addon(val) {
        this._addon = val;
        this.check();
    }
    disconnectedCallback() {
        for (let a of this.unreg) a();
        this.unreg=[];
        if (this.cmp) this.cmp.$destroy();
    }
});

