
window.customElements.define('ui-swiper', class extends HTMLElement {
    constructor() {
        super();
        this.initCb = () => this.init();
    }

    init() {
        const withContent = this.hasAttribute("content");
        let config = {};
        if (this.hasAttribute("autoplay")) {
            config = Object.assign(config, {
                autoplay: {
                    delay: 10000,
                    disableOnInteraction: true,
                },
            });
        }
        if (this.hasAttribute("coverflow")) {
            config = Object.assign(config, {
                effect: 'coverflow',
                coverflowEffect: {
                    rotate: 50,
                    stretch: 0,
                    depth: 100,
                    modifier: 1,
                    slideShadows: true,
                }
            });
        }
        if (this.hasAttribute("navigation")) {
            config = Object.assign(config, {
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
            });
        }
        if (this.hasAttribute("cube")) {
            config = Object.assign(config, {
                effect: 'cube',
                cubeEffect: {
                    shadow: false,
                    slideShadows: true,
                    shadowOffset: 20,
                    shadowScale: 0.94,
                },
            });
        }
        const root = document.getElementById(this.getAttribute("target"));
        const container = root.querySelector('.swiper-container');
        container.style.display = "block";
        let swiper = new Swiper(container, Object.assign(config, {
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: '1',
            pagination: {
                el: '.swiper-pagination',
            },
            keyboard: {
                enabled: true,
            },
            on: {
                slideChange: () => {
                    if (!withContent) return;
                    let v = root.querySelectorAll('.swiper-content');
                    for (let item of v) {
                        item.style.display = "none";
                    }
                    let activeEl = root.querySelector('.swiper-content-' + swiper.activeIndex);
                    if (activeEl) activeEl.style.display = "block";
                },
                init: () => {
                    if (!withContent) return;
                    root.querySelector('.swiper-content-0').style.display = "block";
                }
            },
        }));
    }

    connectedCallback() {
        document.addEventListener("MainContentChanged", this.initCb);
        this.initCb();
    }
    disconnectedCallback() {
        document.removeEventListener("MainContentChanged", this.initCb);
    }
});
