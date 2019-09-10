
window.customElements.define('bind-addon-useraccount', class extends HTMLElement {
    constructor() {
        super();
        this._userdata = {};
        this.rated_cb = (event) => this.rated(event.detail);
        this.addon_queue_cb = (event) => this.addon_queue(event.detail);
    }
    disconnectCallback() {
        if (this.data_unsub)
            this.data_unsub();
        delete this.data_unsub;
        if (this.target) {
            this.target.removeEventListener("rate", this.rated_cb);
            this.target.removeEventListener("install", this.addon_queue_cb);
        }
    }
    async connectedCallback() {
        this.target = document.getElementById(this.getAttribute("addonid"));
        if (!this.target) {
            console.warn("No target set!");
            return;
        }
        this.target.addEventListener("rate", this.rated_cb);
        this.target.addEventListener("install", this.addon_queue_cb);

        let module = await import("/js/cmp/userdata.js");
        await import("/js/cmp/addons-db.js");
        const addondb = await window.addondb;
        this.target.addondb = addondb;
        this.target.userawarecomponent = module.UserAwareComponent;
        this._userdata = module.userdata;
        this.fetchWithAuth = module.fetchWithAuth;
        this.data_unsub = this._userdata.data.subscribe(d => this.userdatachanged(d));
        if (this._userdata.data) this.userdatachanged(this._userdata.data);
    }
    async rated(data) {
        try {
            // Submit to firestore. This will be synced to the backend periodically
            var db = this._userdata.db();
            await db.collection("ratings")
                .doc(user.uid + "_" + data.addonid)
                .update({ rate: data.rate, is_update: data.is_update, addon_id: data.addonid });

            // Update user data
            let upObj = {};
            upObj["ratings." + data.addonid] = data.rate;
            await this._userdata.updateData(upObj);

            data.confirm();
        } catch (err) {
            console.error(JSON.stringify(err));
            data.error(err);
        }
    }

    async addon_queue(data) {
        try {
            // Submit to backend
            await this._userdata.queue_action(data.installid, data.code, data.addonid);
            data.confirm();
        } catch (err) {
            data.error(err);
        }
    }
    userdatachanged(data) {
        this.target.userdata = Object.assign({ user: this._userdata.user }, data);
    }
});