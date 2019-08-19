import Cmp from './cmp.svelte';

window.customElements.define('ui-addons-list', class extends HTMLElement {
    constructor() {
        super();
        this.unreg=[];
        this.count = 0;
    }
    connectedCallback() {
        this._ok = true;
        this.check();
    }
    async check() {
        if (this._ok && this._addondb && this._userawarecomponent) {
            this.cmp = new Cmp({
                target: this, props: {
                    userawarecomponent: this._userawarecomponent,
                    addondb: this._addondb
                }
            });
            if (this._searchstring)  this.cmp.$set({searchstring:this._searchstring});
            this.count = this.cmp.start(this._filters);
            this.unreg.push(this.cmp.$on("install",e=>this.dispatchEvent(new e.constructor(e.type, e))));
            this.unreg.push(this.cmp.$on("rate",e=>this.dispatchEvent(new e.constructor(e.type, e))));

            this.dispatchEvent(new CustomEvent("ready",{detail:{count:this.count}}));

            delete this._searchstring;
            delete this._filters;
        }
    }
    set userawarecomponent(val) {
        this._userawarecomponent = val;
        this.check();
    }
    set searchstring(val) {
        if (!this.cmp) {
            this._searchstring = val;
            return;
        }
        this.cmp.$set({searchstring:val});
    }
    set filters(val) {
        if (!this.cmp) {
            this._filters = val;
            return;
        }
        this.count = this.cmp.setFilters(val);
    }
    set addondb(val) {
        this._addondb = val;
        this.check();
    }
    disconnectedCallback() {
        for (let a of this.unreg) a();
        this.unreg=[];
        if (this.cmp) this.cmp.$destroy();
    }
});

