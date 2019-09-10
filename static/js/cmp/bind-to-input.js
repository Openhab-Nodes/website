window.customElements.define('bind-input', class extends HTMLElement {
    constructor() {
        super();
        this.binder = {};
    }

    async connectedCallback() {
        this.inputid = this.getAttribute("inputid");
        this.input = document.getElementById(this.inputid);
        this.targetid = this.getAttribute("targetid");
        this.target = document.getElementById(this.targetid);

        const props = this.hasAttribute("props") ? this.getAttribute("props").split(",") : [];
        for (const prop of props) {
            const [src, dest] = prop.split(":");
            if (this.input[src] === undefined) {
                console.warn("Source does not have property with name", src, this.input);
                continue;
            }
            this.target[dest] = this.input[src];
        }

        const events = this.getAttribute("events").split(",");
        for (const event of events) {
            const [eventname, bindkey, use_detail] = event.split(":");
            const t = this.target[bindkey];
            if (t === undefined) {
                console.warn("Target does not have property with name", bindkey, t);
                continue;
            }
            this.binder[event] = (e) => {
                // if a custom event -> set the property of the target to the event "detail"
                let value = e.target.value;

                if (use_detail !== undefined) {
                    value = e.detail;
                } else if (e.target.type === "radio" || e.target.type === "checkbox") {
                    value = e.target.checked;
                }
                if (typeof t === "function")
                    t(value);
                else
                    this.target[bindkey] = value;
            };
            this.input.addEventListener(eventname, this.binder[event]);
        }
    }
    disconnectedCallback() {
        for (const event of Object.keys(this.binder)) {
            const [eventname, bindkey] = event.split(":");
            this.input.removeEventListener(eventname, this.binder[event]);
        }
        this.binder = {};
    }
});
//# sourceMappingURL=bind-to-input.js.map
