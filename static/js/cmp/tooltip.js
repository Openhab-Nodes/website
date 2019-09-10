function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
    rect.right <= (window.innerWidth || html.clientWidth);
}

class Popover {
  constructor(trigger, popoverTemplate, { position = 'top', className = 'popover' }, doc = document) {
    this.trigger = trigger;
    this.position = position;
    this.className = className;
    this.orderedPositions = ['top', 'right', 'bottom', 'left'];
    this.popover = popoverTemplate;

    this.handleWindowEvent = () => {
      if (this.isVisible) {
        this.reposition();
      }
    };

    this.handleDocumentEvent = (evt) => {
      if (this.isVisible && evt.target !== this.trigger && evt.target !== this.popover) {
        this.destroy();
      }
    };
  }

  get isVisible() {
    return this.popover.classList.contains(this.className);
  }

  show() {
    if (this.isVisible) return;

    document.addEventListener('click', this.handleDocumentEvent);
    window.addEventListener('scroll', this.handleWindowEvent);
    window.addEventListener('resize', this.handleWindowEvent);
    this.reposition();
  }

  reposition() {
    const { top: triggerTop, left: triggerLeft } = this.trigger.getBoundingClientRect();
    const { offsetHeight: triggerHeight, offsetWidth: triggerWidth } = this.trigger;
    const { offsetHeight: popoverHeight, offsetWidth: popoverWidth } = this.popover;

    const positionIndex = this.orderedPositions.indexOf(this.position);

    const positions = {
      top: {
        name: 'top',
        top: triggerTop - popoverHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      right: {
        name: 'right',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft + triggerWidth
      },
      bottom: {
        name: 'bottom',
        top: triggerTop + triggerHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      left: {
        name: 'left',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft - popoverWidth
      }
    };

    const position = this.orderedPositions
      .slice(positionIndex)
      .concat(this.orderedPositions.slice(0, positionIndex))
      .map(pos => positions[pos])
      .find(pos => {
        this.popover.style.top = `${pos.top}px`;
        this.popover.style.left = `${pos.left}px`;
        return isInViewport(this.popover);
      });

    this.orderedPositions.forEach(pos => {
      this.popover.classList.remove(`${this.className}--${pos}`);
    });

    if (position) {
      this.popover.classList.add(`${this.className}--${position.name}`);
    } else {
      this.popover.style.top = positions.bottom.top;
      this.popover.style.left = positions.bottom.left;
      this.popover.classList.add(`${this.className}--bottom`);
    }
    this.popover.classList.add(this.className);
  }

  destroy() {
    this.orderedPositions.forEach(pos => {
      this.popover.classList.remove(`${this.className}--${pos}`);
    });
    this.popover.classList.remove(`${this.className}`);

    document.removeEventListener('click', this.handleDocumentEvent);
    window.removeEventListener('scroll', this.handleWindowEvent);
    window.removeEventListener('resize', this.handleWindowEvent);
  }

  toggle() {
    if (this.isVisible) {
      this.destroy();
    } else {
      this.show();
    }
  }
}

/**
 * Usage:
 * 
 * With external button:
 * <button id="mybutton" class="contexthelp">Click here</button>
 * <ui-tooltip target="mybutton">
 *   <div>Some content</div>
 * </ui-tooltip>
 * 
 * With inline button
 * <ui-tooltip>
 *   <button class="btn-link contexthelp" title="Context help" slot="button">Click here</button>
 *   <div>Some content</div>
 * </ui-tooltip>
 */
window.customElements.define('ui-tooltip', class extends HTMLElement {
  constructor() {
    super();
    this.clickCb = e => this.click(e);
    this.attachShadow({mode: 'open'}).innerHTML="<link rel='stylesheet' href='/css/main.min.css'><div style='position:fixed;visibility:hidden;z-index:100' id='main'><slot></slot></div><slot name='button'></slot>";
  }

  click(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      }
    this.popover.toggle();
  }

  connectedCallback() {
    window.requestAnimationFrame(()=> this.connectedCallbackDelayed());
  }

  connectedCallbackDelayed() {
    const defaultSlot = this.shadowRoot.querySelector('#main');
    if (this.hasAttribute("maxwidth")) defaultSlot.style.maxWidth= "500px";

    let trigger = this.hasAttribute("target")? document.getElementById(this.getAttribute("target")):null;

    if (this.popover) this.popover.destroy();

    this.popover = new Popover(trigger||this, defaultSlot, { position: 'bottom' });
    if (!trigger) trigger = this.shadowRoot.querySelector('slot[name="button"]');
    if (trigger) {
      trigger.removeEventListener('click', this.clickCb);
      trigger.addEventListener('click', this.clickCb);
    }
  }
  disconnectedCallback() {
    if (this.popover) this.popover.destroy();
    delete this.popover;
    const trigger = document.getElementById(this.getAttribute("target"));
    if (trigger) trigger.removeEventListener('click', this.clickCb);
  }
});
//# sourceMappingURL=tooltip.js.map
