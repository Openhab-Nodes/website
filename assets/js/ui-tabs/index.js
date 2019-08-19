class TabContainer extends HTMLElement {
    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `<slot id="main"></slot>`;
    }

    connectedCallback() {
        const slot = this.shadowRoot.querySelector('slot');
        slot.addEventListener('slotchange', (e) => {
            const nodes = slot.assignedNodes();
            this._headerItems = nodes.filter(n => n.nodeName === "TAB-HEADER").map(n => n.querySelectorAll('tab-header-item')).pop();
            this._bodyItems = nodes.filter(n => n.nodeName === "TAB-BODY").map(n => n.querySelectorAll('tab-body-item')).pop();
            this._index = 0;

            for (let i = 0; i < this._headerItems.length; i++) {
                this._headerItems[i].clickevent = () => this.select(i);
                this._headerItems[i].addEventListener('click', this._headerItems[i].clickevent);
            }
        });
    }
    disconnectedCallback() {
        if (!this._headerItems) return;
        for (let i = 0; i < this._headerItems.length; i++) {
            this._headerItems[i].removeEventListener('click', this._headerItems[i].clickevent);
        }
    }
    select(index) {
        this._headerItems[this._index].classList.remove('tab-active');
        this._headerItems[index].classList.add('tab-active');
        this._index = index;

        for (let item of this._bodyItems)
            item.style.transform = `translateX(${(-this._index) * 100}%)`;
    }
}
customElements.define('tab-container', TabContainer);