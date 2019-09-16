window.customElements.define('ui-subscription-flexible', class extends HTMLElement {
    constructor() {
        super();
    }

    init() {
        let target = document.getElementById(this.getAttribute("target"));
        console.warn("Target found!");
        if (!target) {
            console.warn("Target not found!");
            return;
        }
        target.oninput = () => {
            const min = parseInt(target.subscriptionValue.min);
            const max = parseInt(target.subscriptionValue.max);
            const range = max - min;
            let costs = parseInt(target.subscriptionValue.value);
            let outputs = target.querySelectorAll("*[data-dynamic]");
            for (let output of outputs) {
                if (output.name == "x") {
                    output.value = costs;
                    continue;
                }
                const lmin = parseInt(output.dataset.min);
                const lmax = parseInt(output.dataset.max);
                const lrange = lmax - lmin;
                let value = lmin + lrange * ((costs - min) / range);
                output.value = (output.dataset.round) ? Math.round(value) : value;
            }
            target.querySelector("input[name='c']").value = costs;
        }
        target.oninput();
    }

    connectedCallback() {
        this.init();
    }
    disconnectedCallback() {
    }
});
