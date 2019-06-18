window.customElements.define('ui-subscription', class extends HTMLElement {
    constructor() {
        super();
        this.initCb = () => this.init();
    }

    init() {
        let target = document.getElementById(this.getAttribute("target"));
        console.warn("Target found!");
        if (!target) {
            console.warn("Target not found!");
            return;
        }
        target.oninput = () => {
            let x=parseInt(target.subscriptionValue.value);
            target.x.value=x;
            target.influencepoints.value=x;
            target.supporttime.value = 15 + Math.floor(30*((x-10)/90));
            target.ruletemplates.value = 3 + Math.floor(3*((x-10)/90));
            let sla = 95 + Math.floor(2*((x-10)/90));
            target.sla.value = sla;
            target.sla2.value = sla;
            target.sla_hours.value = sla*24/100;
            target.sla_days.value = sla*31/100;
        }
        target.oninput();
    }
    
    connectedCallback() {
        document.addEventListener("MainContentChanged", this.initCb);
    }
    disconnectedCallback() {
        document.removeEventListener("MainContentChanged", this.initCb);
    }
});
