const empty_star = ["far", "fa-star"];
const half_star = ["fas", "fa-star-half-alt"];
const full_star = ["fas", "fa-star"];

class StarRating extends HTMLElement {
    get value() {
        return parseFloat(this.getAttribute('value')) || 0.0;
    }

    set value(val) {
        this.setAttribute('value', val);
        this.val = val;
        if (!this.stars) return;
        this.render(val);
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }
    
    set disabled(val) {
        if (val) this.setAttribute('disabled', true);
        else this.removeAttribute("disabled");
    }

    /**
     * value between 1-5. 0 for removing the highlight
     */
    set highlight(val) {
        this._highlight = parseInt(val);
        this.setAttribute('highlight', this._highlight);
        if (!this.stars) return;
        this.mark(this._highlight-1);
    }

    render(index) {
        this.stars.forEach((star, i) => {
            star.classList.remove(empty_star[0], half_star[0], half_star[1], full_star[1]);
            if (i < index && i + 1 > index) { // 0 < 0.2 < 1
                star.classList.add(half_star[0],half_star[1]);
            } else if (i < index) { // 0 < 1
                star.classList.add(full_star[0],full_star[1]);
            } else {
                star.classList.add(empty_star[0],empty_star[1]);
            }
        });
    }

    mark(index) {
        this.stars.forEach((star, i) => {
            star.classList.toggle('text-primary', i <= index);
        });
    }

    connectedCallback() {
        this.stars = [];
        this._highlight = parseInt(this.getAttribute("highlight"))||0;

        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        for (let i = 0; i < 5; i++) {
            let s = document.createElement('i');
            s.classList.add(empty_star[0], empty_star[1]);
            this.appendChild(s);
            this.stars.push(s);
        }

        this.render(this.value);
    }

    constructor() {
        super();

        this.addEventListener('mousemove', e => {
            let box = this.getBoundingClientRect(),
                starIndex = Math.floor((e.pageX - box.left) / box.width * this.stars.length);

            this.mark(starIndex);
        });

        this.addEventListener('mouseout', () => {
            this.mark(this._highlight-1);
        });

        this.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            if (this.disabled) {
                this.dispatchEvent(new CustomEvent('invalid'));
                return;
            }
            let box = this.getBoundingClientRect(),
                starIndex = Math.floor((e.pageX - box.left) / box.width * this.stars.length);

            this.highlight = starIndex+1;

            let rateEvent = new CustomEvent('rate', { detail: { value: this.val, rate: this._highlight } });
            this.dispatchEvent(rateEvent);
        });
    }
}

customElements.define('ui-star-rating', StarRating);