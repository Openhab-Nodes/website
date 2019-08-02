
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
    rect.right <= (window.innerWidth || html.clientWidth);
}

class Popover {
  constructor(trigger, popoverTemplate, { position = 'top', className = 'popover' }) {
    this.trigger = trigger;
    this.position = position;
    this.className = className;
    this.isTemplate = false;
    this.orderedPositions = ['top', 'right', 'bottom', 'left'];

    this.isTemplate = popoverTemplate.tagName.toUpperCase() == "TEMPLATE";
    if (this.isTemplate) {
      this.popover = document.createElement('div');
      this.popover.innerHTML = popoverTemplate.innerHTML;
    } else {
      this.popover = popoverTemplate;
    }
    this.popover.style.zIndex = 100;

    Object.assign(this.popover.style, {
      position: 'fixed'
    });

    this.popover.classList.add(className);

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
    return this.isTemplate ? document.body.contains(this.popover) : this.popover.style.visibility !== "hidden";
  }

  show() {
    if (this.isVisible) return;

    document.addEventListener('click', this.handleDocumentEvent);
    window.addEventListener('scroll', this.handleWindowEvent);
    window.addEventListener('resize', this.handleWindowEvent);

    if (this.isTemplate)
      document.body.appendChild(this.popover);
    else {
      this.popover.style.setProperty('visibility', 'visible', 'important');
    }

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
  }

  destroy() {
    if (this.isTemplate)
      this.popover.remove();
    else
      this.popover.style.setProperty('visibility', 'hidden', 'important');

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

export { Popover };