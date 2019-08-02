const ADDONS_URL = "/run/extensions.json"
const ADDONS_STATS_URL = "/run/extensions_stats.json"
const ADDONS_RECOMMENDED_URL = "/run/recommended_extensions.json"

function sortedIndexDownloads(array, value) {
    var low = 0,
        high = array.length;

    while (low < high) {
        var mid = (low + high) >>> 1;
        if (array[mid].stat.d > value.stat.d) low = mid + 1;
        else high = mid;
    }
    array.splice(low, 0, value);
    return array;
}

function sortedIndexLastUpdated(array, value) {
    var low = 0,
        high = array.length;

    while (low < high) {
        var mid = (low + high) >>> 1;
        if (array[mid].last_updated > value.last_updated) low = mid + 1;
        else high = mid;
    }
    array.splice(low, 0, value);
    return array;
}

window.customElements.define('addons-db', class extends HTMLElement {
    constructor() {
        super();
        this.db = [];
        this.stats = {};
    }

    async connectedCallback() {
        this.dispatchEvent(new CustomEvent('loader', { detail: {} }));

        try {
            const resData = await fetch(ADDONS_URL, { cache: "default" });
            this.db = await resData.json();
        } catch (e) {
            this.dispatchEvent(new CustomEvent('loader', { detail: { err: e } }));
            return;
        }

        try {
            const resData = await fetch(ADDONS_STATS_URL, { cache: "default" });
            this.stats = await resData.json();
        } catch (e) {
            this.dispatchEvent(new CustomEvent('loader', { detail: { err: e } }));
            return;
        }

        let recommended;
        try {
            const resData = await fetch(ADDONS_RECOMMENDED_URL, { cache: "default" });
            recommended = await resData.json();
        } catch (e) {
            this.dispatchEvent(new CustomEvent('loader', { detail: { err: e } }));
            return;
        }

        this.db_by_id = {};
        this.last_updated = [];
        this.often_installed = [];
        this.recommended = [];
        let searchstr = "";
        for (let item of this.db) {
            if (recommended[item.id]) {
                this.recommended.push(Object.assign(item, recommended[item.id]));
            }
            item.stat = this.stats[item.id];
            // Build key-value store
            this.db_by_id[item.id] = item;
            // Build often-installed
            if (item.stat && item.stat.d)
                sortedIndexDownloads(this.often_installed, item);
            // Build last-updated
            sortedIndexLastUpdated(this.last_updated, item);
            // Build searchable string
            searchstr += JSON.stringify({
                id: item.id, label: item.label,
                author: item.author, description: item.description,
                manufacturers: item.manufacturers, products: item.products
            });
        }

        this.searchstr = searchstr;

        console.log("last_updated", this.searchstr.length);

        this.dispatchEvent(new CustomEvent('loader', { detail: { ok: this } }));
    }
    disconnectedCallback() {
    }
});
