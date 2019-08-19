window.customElements.define('ui-admin-link', class extends HTMLElement {
    constructor() {
        super();
    }
    async connectedCallback() {
        let module = await import("/js/cmp/userdata.js");
        await module.userdata.ready();
        if (module.userdata.user.uid == "IocPph06rUWM3ABcIHguR3CIw6v1") {
            this.style.display = "inline-block";
        }
        const a = document.createElement("a");
        a.href = this.getAttribute("href");
        a.style.display="none";
        this.append(a);
        this.addEventListener("click", () => a.dispatchEvent(new Event("click")));
    }
});

