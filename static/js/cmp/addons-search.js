function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else
        node.setAttribute(attribute, value);
}
function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_style(node, key, value) {
    node.style.setProperty(key, value);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function createEventDispatcher() {
    const component = current_component;
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
}
function update($$) {
    if ($$.fragment) {
        $$.update($$.dirty);
        run_all($$.before_update);
        $$.fragment.p($$.dirty, $$.ctx);
        $$.dirty = null;
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined' ? window : global);
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    if (component.$$.fragment) {
        run_all(component.$$.on_destroy);
        component.$$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        component.$$.on_destroy = component.$$.fragment = null;
        component.$$.ctx = {};
    }
}
function make_dirty(component, key) {
    if (!component.$$.dirty) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty = blank_object();
    }
    component.$$.dirty[key] = true;
}
function init(component, options, instance, create_fragment, not_equal, prop_names) {
    const parent_component = current_component;
    set_current_component(component);
    const props = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: prop_names,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty: null
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, props, (key, value) => {
            if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                if ($$.bound[key])
                    $$.bound[key](value);
                if (ready)
                    make_dirty(component, key);
            }
        })
        : props;
    $$.update();
    ready = true;
    run_all($$.before_update);
    $$.fragment = create_fragment($$.ctx);
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
let SvelteElement;
if (typeof HTMLElement !== 'undefined') {
    SvelteElement = class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            // @ts-ignore todo: improve typings
            for (const key in this.$$.slotted) {
                // @ts-ignore todo: improve typings
                this.appendChild(this.$$.slotted[key]);
            }
        }
        attributeChangedCallback(attr, _oldValue, newValue) {
            this[attr] = newValue;
        }
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            // TODO should this delegate to addEventListener?
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    };
}

/* assets/js/addons-search/resultentry.svelte generated by Svelte v3.6.10 */

const file = "assets/js/addons-search/resultentry.svelte";

// (6:0) {#if item}
function create_if_block(ctx) {
	var article, header, span0, t0_value = ctx.item.label, t0, t1, small0, t2_value = ctx.item.version, t2, header_title_value, t3, section0, span2, a, i, t4, span1, t6, section1, span3, t7_value = ctx.item.description, t7, t8, small1, t9, t10_value = ctx.item.author, t10, t11, footer, button;

	return {
		c: function create() {
			article = element("article");
			header = element("header");
			span0 = element("span");
			t0 = text(t0_value);
			t1 = space();
			small0 = element("small");
			t2 = text(t2_value);
			t3 = space();
			section0 = element("section");
			span2 = element("span");
			a = element("a");
			i = element("i");
			t4 = space();
			span1 = element("span");
			span1.textContent = "Configure";
			t6 = space();
			section1 = element("section");
			span3 = element("span");
			t7 = text(t7_value);
			t8 = space();
			small1 = element("small");
			t9 = text("– By ");
			t10 = text(t10_value);
			t11 = space();
			footer = element("footer");
			button = element("button");
			button.textContent = "Check Permissions & Install";
			add_location(span0, file, 8, 6, 142);
			attr(small0, "class", "ml-2");
			add_location(small0, file, 9, 6, 174);
			attr(header, "title", header_title_value = ctx.item.id);
			add_location(header, file, 7, 4, 111);
			attr(i, "class", "fas fa-cog");
			add_location(i, file, 14, 10, 382);
			attr(span1, "class", "ml-2");
			add_location(span1, file, 15, 10, 417);
			attr(a, "title", "Change Version");
			attr(a, "class", "btn btn-secondary-hover");
			add_location(a, file, 13, 8, 313);
			attr(span2, "role", "group");
			attr(span2, "class", "btn-group");
			add_location(span2, file, 12, 6, 267);
			attr(section0, "class", "actions");
			add_location(section0, file, 11, 4, 235);
			add_location(span3, file, 20, 6, 535);
			set_style(small1, "white-space", "nowrap");
			set_style(small1, "text-overflow", "ellipsis");
			add_location(small1, file, 21, 6, 573);
			attr(section1, "class", "description");
			add_location(section1, file, 19, 4, 499);
			attr(button, "class", "ml-auto btn btn-outline-success");
			add_location(button, file, 26, 6, 711);
			add_location(footer, file, 25, 4, 696);
			add_location(article, file, 6, 2, 97);
		},

		m: function mount(target, anchor) {
			insert(target, article, anchor);
			append(article, header);
			append(header, span0);
			append(span0, t0);
			append(header, t1);
			append(header, small0);
			append(small0, t2);
			append(article, t3);
			append(article, section0);
			append(section0, span2);
			append(span2, a);
			append(a, i);
			append(a, t4);
			append(a, span1);
			append(article, t6);
			append(article, section1);
			append(section1, span3);
			append(span3, t7);
			append(section1, t8);
			append(section1, small1);
			append(small1, t9);
			append(small1, t10);
			append(article, t11);
			append(article, footer);
			append(footer, button);
		},

		p: function update(changed, ctx) {
			if ((changed.item) && t0_value !== (t0_value = ctx.item.label)) {
				set_data(t0, t0_value);
			}

			if ((changed.item) && t2_value !== (t2_value = ctx.item.version)) {
				set_data(t2, t2_value);
			}

			if ((changed.item) && header_title_value !== (header_title_value = ctx.item.id)) {
				attr(header, "title", header_title_value);
			}

			if ((changed.item) && t7_value !== (t7_value = ctx.item.description)) {
				set_data(t7, t7_value);
			}

			if ((changed.item) && t10_value !== (t10_value = ctx.item.author)) {
				set_data(t10, t10_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(article);
			}
		}
	};
}

function create_fragment(ctx) {
	var if_block_anchor;

	var if_block = (ctx.item) && create_if_block(ctx);

	return {
		c: function create() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.c = noop;
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p: function update(changed, ctx) {
			if (ctx.item) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		i: noop,
		o: noop,

		d: function destroy(detaching) {
			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { item } = $$props;

	const writable_props = ['item'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<addons-search-entry> was created with unknown prop '${key}'`);
	});

	$$self.$set = $$props => {
		if ('item' in $$props) $$invalidate('item', item = $$props.item);
	};

	return { item };
}

class Resultentry extends SvelteElement {
	constructor(options) {
		super();

		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["item"]);

		const { ctx } = this.$$;
		const props = this.attributes;
		if (ctx.item === undefined && !('item' in props)) {
			console.warn("<addons-search-entry> was created without expected prop 'item'");
		}

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["item"];
	}

	get item() {
		return this.$$.ctx.item;
	}

	set item(item) {
		this.$set({ item });
		flush();
	}
}

customElements.define("addons-search-entry", Resultentry);

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

/* assets/js/addons-search/entry.svelte generated by Svelte v3.6.10 */
const { Object: Object_1, console: console_1 } = globals;

const file$1 = "assets/js/addons-search/entry.svelte";

// (75:0) {#if item}
function create_if_block$1(ctx) {
	var article, header, span0, t0_value = ctx.item.label, t0, t1, small0, t2_value = ctx.item.version, t2, t3, small1, t4, t5_value = ctx.item.author, t5, header_title_value, t6, section, span1, t7_value = ctx.item.description, t7, t8, footer, popover_action, dispose;

	var if_block = (ctx.gh_meta_data) && create_if_block_1(ctx);

	return {
		c: function create() {
			article = element("article");
			header = element("header");
			span0 = element("span");
			t0 = text(t0_value);
			t1 = space();
			small0 = element("small");
			t2 = text(t2_value);
			t3 = space();
			small1 = element("small");
			t4 = text("– By ");
			t5 = text(t5_value);
			t6 = space();
			section = element("section");
			span1 = element("span");
			t7 = text(t7_value);
			t8 = space();
			footer = element("footer");
			if (if_block) if_block.c();
			add_location(span0, file$1, 81, 6, 2336);
			attr(small0, "class", "ml-2");
			add_location(small0, file$1, 82, 6, 2368);
			attr(small1, "class", "");
			set_style(small1, "white-space", "nowrap");
			set_style(small1, "text-overflow", "ellipsis");
			add_location(small1, file$1, 83, 6, 2417);
			attr(header, "title", header_title_value = ctx.item.id);
			add_location(header, file$1, 80, 4, 2305);
			add_location(span1, file$1, 88, 6, 2584);
			attr(section, "class", "description");
			add_location(section, file$1, 87, 4, 2548);
			add_location(footer, file$1, 90, 4, 2635);
			attr(article, "class", "mb-3");
			add_location(article, file$1, 75, 2, 2158);
			dispose = listen(article, "click", ctx.click_handler);
		},

		m: function mount(target, anchor) {
			insert(target, article, anchor);
			append(article, header);
			append(header, span0);
			append(span0, t0);
			append(header, t1);
			append(header, small0);
			append(small0, t2);
			append(header, t3);
			append(header, small1);
			append(small1, t4);
			append(small1, t5);
			append(article, t6);
			append(article, section);
			append(section, span1);
			append(span1, t7);
			append(article, t8);
			append(article, footer);
			if (if_block) if_block.m(footer, null);
			ctx.article_binding(article);
			popover_action = popover.call(null, article, ctx.popoverTemplate) || {};
		},

		p: function update(changed, ctx) {
			if ((changed.item) && t0_value !== (t0_value = ctx.item.label)) {
				set_data(t0, t0_value);
			}

			if ((changed.item) && t2_value !== (t2_value = ctx.item.version)) {
				set_data(t2, t2_value);
			}

			if ((changed.item) && t5_value !== (t5_value = ctx.item.author)) {
				set_data(t5, t5_value);
			}

			if ((changed.item) && header_title_value !== (header_title_value = ctx.item.id)) {
				attr(header, "title", header_title_value);
			}

			if ((changed.item) && t7_value !== (t7_value = ctx.item.description)) {
				set_data(t7, t7_value);
			}

			if (ctx.gh_meta_data) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(footer, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (typeof popover_action.update === 'function' && changed.popoverTemplate) {
				popover_action.update.call(null, ctx.popoverTemplate);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(article);
			}

			if (if_block) if_block.d();
			ctx.article_binding(null);
			if (popover_action && typeof popover_action.destroy === 'function') popover_action.destroy();
			dispose();
		}
	};
}

// (92:6) {#if gh_meta_data}
function create_if_block_1(ctx) {
	var a, span0, i0, t0, t1_value = ctx.gh_meta_data.stars, t1, t2, t3, span1, i1, t4, t5_value = ctx.gh_meta_data.issues, t5, t6, a_href_value, a_title_value, t7, t8, ui_star_rating, t9, div, t10, br, t11, dispose;

	var if_block = (ctx.item.stat) && create_if_block_2(ctx);

	return {
		c: function create() {
			a = element("a");
			span0 = element("span");
			i0 = element("i");
			t0 = space();
			t1 = text(t1_value);
			t2 = text(" Stars");
			t3 = space();
			span1 = element("span");
			i1 = element("i");
			t4 = space();
			t5 = text(t5_value);
			t6 = text(" Issues");
			t7 = space();
			if (if_block) if_block.c();
			t8 = space();
			ui_star_rating = element("ui-star-rating");
			t9 = space();
			div = element("div");
			t10 = text("You cannot rate.");
			br = element("br");
			t11 = text("\n          You are not logged in.");
			attr(i0, "class", "fas fa-star");
			add_location(i0, file$1, 98, 12, 2837);
			attr(span0, "class", "mr-2");
			add_location(span0, file$1, 97, 10, 2805);
			attr(i1, "class", "fas fa-info-circle");
			add_location(i1, file$1, 102, 12, 2962);
			attr(span1, "class", "mr-2");
			add_location(span1, file$1, 101, 10, 2930);
			attr(a, "class", "mr-2 noref");
			attr(a, "href", a_href_value = ctx.item.github);
			attr(a, "target", "_blank");
			attr(a, "title", a_title_value = ctx.item.github);
			add_location(a, file$1, 92, 8, 2677);
			set_custom_element_data(ui_star_rating, "class", "ml-auto");
			set_custom_element_data(ui_star_rating, "value", ctx.item_rating);
			set_custom_element_data(ui_star_rating, "highlight", ctx.user_item_rating);
			add_location(ui_star_rating, file$1, 112, 8, 3239);
			add_location(br, file$1, 119, 26, 3512);
			set_style(div, "visibility", "hidden");
			add_location(div, file$1, 118, 8, 3426);

			dispose = [
				listen(ui_star_rating, "rate", ctx.submit_rate),
				listen(ui_star_rating, "invalid", ctx.showPopup)
			];
		},

		m: function mount(target, anchor) {
			insert(target, a, anchor);
			append(a, span0);
			append(span0, i0);
			append(span0, t0);
			append(span0, t1);
			append(span0, t2);
			append(a, t3);
			append(a, span1);
			append(span1, i1);
			append(span1, t4);
			append(span1, t5);
			append(span1, t6);
			insert(target, t7, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, t8, anchor);
			insert(target, ui_star_rating, anchor);
			insert(target, t9, anchor);
			insert(target, div, anchor);
			append(div, t10);
			append(div, br);
			append(div, t11);
			ctx.div_binding(div);
		},

		p: function update(changed, ctx) {
			if ((changed.gh_meta_data) && t1_value !== (t1_value = ctx.gh_meta_data.stars)) {
				set_data(t1, t1_value);
			}

			if ((changed.gh_meta_data) && t5_value !== (t5_value = ctx.gh_meta_data.issues)) {
				set_data(t5, t5_value);
			}

			if ((changed.item) && a_href_value !== (a_href_value = ctx.item.github)) {
				attr(a, "href", a_href_value);
			}

			if ((changed.item) && a_title_value !== (a_title_value = ctx.item.github)) {
				attr(a, "title", a_title_value);
			}

			if (ctx.item.stat) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_2(ctx);
					if_block.c();
					if_block.m(t8.parentNode, t8);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (changed.item_rating) {
				set_custom_element_data(ui_star_rating, "value", ctx.item_rating);
			}

			if (changed.user_item_rating) {
				set_custom_element_data(ui_star_rating, "highlight", ctx.user_item_rating);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(a);
				detach(t7);
			}

			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(t8);
				detach(ui_star_rating);
				detach(t9);
				detach(div);
			}

			ctx.div_binding(null);
			run_all(dispose);
		}
	};
}

// (107:8) {#if item.stat}
function create_if_block_2(ctx) {
	var span, i, t0, t1_value = ctx.item.stat.d, t1, t2;

	return {
		c: function create() {
			span = element("span");
			i = element("i");
			t0 = space();
			t1 = text(t1_value);
			t2 = text(" Downloads");
			attr(i, "class", "fas fa-download");
			add_location(i, file$1, 108, 12, 3133);
			attr(span, "class", "mr-2");
			add_location(span, file$1, 107, 10, 3101);
		},

		m: function mount(target, anchor) {
			insert(target, span, anchor);
			append(span, i);
			append(span, t0);
			append(span, t1);
			append(span, t2);
		},

		p: function update(changed, ctx) {
			if ((changed.item) && t1_value !== (t1_value = ctx.item.stat.d)) {
				set_data(t1, t1_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

function create_fragment$1(ctx) {
	var if_block_anchor;

	var if_block = (ctx.item) && create_if_block$1(ctx);

	return {
		c: function create() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.c = noop;
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p: function update(changed, ctx) {
			if (ctx.item) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		i: noop,
		o: noop,

		d: function destroy(detaching) {
			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function popover(node) {
  console.log(node);
  return {
    update(popoverTemplate) {
      if (node.popover) node.popover.destroy();
      const popover = new Popover(node, popoverTemplate, {
        position: "bottom"
      });
      node.popover = popover;
    },
    destroy() {
      popover.destroy();
    }
  };
}

function instance$1($$self, $$props, $$invalidate) {
	
  const dispatch = createEventDispatcher();
  let { item, ratings = {} } = $$props;
  let gh_meta_data = null;
  let popoverTemplate;
  let ratingElem;

  async function get_meta_data(item) {
    const storage_key = "cache_addon_" + item.id;
    let cache = localStorage.getItem(storage_key);
    if (cache) cache = JSON.parse(cache);
    let d = new Date(cache && cache.t ? cache.t : 0);
    d.setDate(d.getDate() + 1);
    if (d < Date.now()) {
      // Refresh cache
      const url =
        "https://api.github.com/repos/" +
        item.github.replace("https://www.github.com/", "").replace("https://github.com/", "");
      let response = await fetch(url);
      let data = await response.json();
      if (!(data instanceof Object)) throw new TypeError();
      cache = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        issues: data.open_issues_count,
        license: data.license,
        language: data.language,
        pushed_at: new Date(data.pushed_at),
        t: Date.now()
      };
      localStorage.setItem(storage_key, JSON.stringify(cache));
    }
    $$invalidate('gh_meta_data', gh_meta_data = cache);
  }

  function submit_rate(e) {
    dispatch("rate", { id: item.id, rate: e.detail.rate });
  }

  function showPopup() {
    ratingElem.popover.toggle();
  }

	const writable_props = ['item', 'ratings'];
	Object_1.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<addons-entry> was created with unknown prop '${key}'`);
	});

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('popoverTemplate', popoverTemplate = $$value);
		});
	}

	function article_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('ratingElem', ratingElem = $$value);
		});
	}

	function click_handler(e) {
		return dispatch('click', { id: item.id });
	}

	$$self.$set = $$props => {
		if ('item' in $$props) $$invalidate('item', item = $$props.item);
		if ('ratings' in $$props) $$invalidate('ratings', ratings = $$props.ratings);
	};

	let item_rating, user_item_rating, logo;

	$$self.$$.update = ($$dirty = { item: 1, ratings: 1 }) => {
		if ($$dirty.item) { $$invalidate('item_rating', item_rating = item && item.stat ? item.stat.p / item.stat.v : 0.0); }
		if ($$dirty.item || $$dirty.ratings) { $$invalidate('user_item_rating', user_item_rating = item && ratings[item.id] ? ratings[item.id] : 0); }
		if ($$dirty.item) { logo = item ? (item.logo_url || (item.github ? item.github+"/blob/master/logo.png" : null)) : null; }
		if ($$dirty.item) { if (item && item.github) {
        get_meta_data(item);
      } }
	};

	return {
		dispatch,
		item,
		ratings,
		gh_meta_data,
		popoverTemplate,
		ratingElem,
		submit_rate,
		showPopup,
		item_rating,
		user_item_rating,
		div_binding,
		article_binding,
		click_handler
	};
}

class Entry extends SvelteElement {
	constructor(options) {
		super();

		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, ["item", "ratings"]);

		const { ctx } = this.$$;
		const props = this.attributes;
		if (ctx.item === undefined && !('item' in props)) {
			console_1.warn("<addons-entry> was created without expected prop 'item'");
		}

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["item","ratings"];
	}

	get item() {
		return this.$$.ctx.item;
	}

	set item(item) {
		this.$set({ item });
		flush();
	}

	get ratings() {
		return this.$$.ctx.ratings;
	}

	set ratings(ratings) {
		this.$set({ ratings });
		flush();
	}
}

customElements.define("addons-entry", Entry);

/* assets/js/addons-search/index.svelte generated by Svelte v3.6.10 */
const { console: console_1$1 } = globals;

const file$2 = "assets/js/addons-search/index.svelte";

function get_each_context_3(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.item = list[i];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.item = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.item = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.item = list[i];
	return child_ctx;
}

// (201:0) {:else}
function create_else_block(ctx) {
	var div, current;

	var each_value_3 = ctx.seachresults_filtered;

	var each_blocks = [];

	for (var i = 0; i < each_value_3.length; i += 1) {
		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	var each_1_else = null;

	if (!each_value_3.length) {
		each_1_else = create_else_block_1(ctx);
		each_1_else.c();
	}

	return {
		c: function create() {
			div = element("div");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(div, "class", "ui_addon_cards list container my-4");
			add_location(div, file$2, 201, 2, 5988);
		},

		m: function mount(target, anchor) {
			insert(target, div, anchor);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			if (each_1_else) {
				each_1_else.m(div, null);
			}

			current = true;
		},

		p: function update(changed, ctx) {
			if (changed.seachresults_filtered || changed.error_message) {
				each_value_3 = ctx.seachresults_filtered;

				for (var i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_3(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
					}
				}

				group_outros();
				for (i = each_value_3.length; i < each_blocks.length; i += 1) out(i);
				check_outros();
			}

			if (!each_value_3.length && each_1_else) {
				each_1_else.p(changed, ctx);
			} else if (!each_value_3.length) {
				each_1_else = create_else_block_1(ctx);
				each_1_else.c();
				each_1_else.m(div, null);
			} else if (each_1_else) {
				each_1_else.d(1);
				each_1_else = null;
			}
		},

		i: function intro(local) {
			if (current) return;
			for (var i = 0; i < each_value_3.length; i += 1) transition_in(each_blocks[i]);

			current = true;
		},

		o: function outro(local) {
			each_blocks = each_blocks.filter(Boolean);
			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);

			if (each_1_else) each_1_else.d();
		}
	};
}

// (152:36) 
function create_if_block_1$1(ctx) {
	var div, section0, h20, t1, t2, section1, h21, t4, t5, section2, h22, t7, p, t8, a, t10, b, t12, t13, h23, t15, ul, current;

	var each_value_2 = ctx.often_installed;

	var each_blocks_2 = [];

	for (var i = 0; i < each_value_2.length; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
		each_blocks_2[i] = null;
	});

	var each_value_1 = ctx.recommended;

	var each_blocks_1 = [];

	for (var i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	const out_1 = i => transition_out(each_blocks_1[i], 1, 1, () => {
		each_blocks_1[i] = null;
	});

	var each_value = ctx.last_updated;

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c: function create() {
			div = element("div");
			section0 = element("section");
			h20 = element("h2");
			h20.textContent = "Often Installed";
			t1 = space();

			for (var i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t2 = space();
			section1 = element("section");
			h21 = element("h2");
			h21.textContent = "Recommended";
			t4 = space();

			for (var i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			section2 = element("section");
			h22 = element("h2");
			h22.textContent = "How To Publish";
			t7 = space();
			p = element("p");
			t8 = text("Learn how to write and publish your own Addon in the\n        ");
			a = element("a");
			a.textContent = "Developer Section";
			t10 = text("\n        . Publish Rule Templates via the\n        ");
			b = element("b");
			b.textContent = "Setup & Maintenance";
			t12 = text("\n        interface.");
			t13 = space();
			h23 = element("h2");
			h23.textContent = "Latest Updates";
			t15 = space();
			ul = element("ul");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			add_location(h20, file$2, 154, 6, 4744);
			add_location(section0, file$2, 153, 4, 4728);
			add_location(h21, file$2, 165, 6, 5014);
			add_location(section1, file$2, 164, 4, 4998);
			add_location(h22, file$2, 176, 6, 5276);
			attr(a, "href", "/developer/addons");
			add_location(a, file$2, 179, 8, 5379);
			add_location(b, file$2, 181, 8, 5478);
			add_location(p, file$2, 177, 6, 5306);
			add_location(h23, file$2, 184, 6, 5545);
			add_location(ul, file$2, 185, 6, 5575);
			add_location(section2, file$2, 175, 4, 5260);
			attr(div, "class", "searchoverview mt-4");
			add_location(div, file$2, 152, 2, 4690);
		},

		m: function mount(target, anchor) {
			insert(target, div, anchor);
			append(div, section0);
			append(section0, h20);
			append(section0, t1);

			for (var i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].m(section0, null);
			}

			append(div, t2);
			append(div, section1);
			append(section1, h21);
			append(section1, t4);

			for (var i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(section1, null);
			}

			append(div, t5);
			append(div, section2);
			append(section2, h22);
			append(section2, t7);
			append(section2, p);
			append(p, t8);
			append(p, a);
			append(p, t10);
			append(p, b);
			append(p, t12);
			append(section2, t13);
			append(section2, h23);
			append(section2, t15);
			append(section2, ul);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			current = true;
		},

		p: function update(changed, ctx) {
			if (changed.userdata || changed.often_installed) {
				each_value_2 = ctx.often_installed;

				for (var i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_2[i]) {
						each_blocks_2[i].p(changed, child_ctx);
						transition_in(each_blocks_2[i], 1);
					} else {
						each_blocks_2[i] = create_each_block_2(child_ctx);
						each_blocks_2[i].c();
						transition_in(each_blocks_2[i], 1);
						each_blocks_2[i].m(section0, null);
					}
				}

				group_outros();
				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) out(i);
				check_outros();
			}

			if (changed.userdata || changed.recommended) {
				each_value_1 = ctx.recommended;

				for (var i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(changed, child_ctx);
						transition_in(each_blocks_1[i], 1);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						transition_in(each_blocks_1[i], 1);
						each_blocks_1[i].m(section1, null);
					}
				}

				group_outros();
				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) out_1(i);
				check_outros();
			}

			if (changed.last_updated) {
				each_value = ctx.last_updated;

				for (var i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}
		},

		i: function intro(local) {
			if (current) return;
			for (var i = 0; i < each_value_2.length; i += 1) transition_in(each_blocks_2[i]);

			for (var i = 0; i < each_value_1.length; i += 1) transition_in(each_blocks_1[i]);

			current = true;
		},

		o: function outro(local) {
			each_blocks_2 = each_blocks_2.filter(Boolean);
			for (let i = 0; i < each_blocks_2.length; i += 1) transition_out(each_blocks_2[i]);

			each_blocks_1 = each_blocks_1.filter(Boolean);
			for (let i = 0; i < each_blocks_1.length; i += 1) transition_out(each_blocks_1[i]);

			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks_2, detaching);

			destroy_each(each_blocks_1, detaching);

			destroy_each(each_blocks, detaching);
		}
	};
}

// (150:0) {#if loading}
function create_if_block$2(ctx) {
	var h1;

	return {
		c: function create() {
			h1 = element("h1");
			h1.textContent = "Loading...";
			add_location(h1, file$2, 150, 2, 4631);
		},

		m: function mount(target, anchor) {
			insert(target, h1, anchor);
		},

		p: noop,
		i: noop,
		o: noop,

		d: function destroy(detaching) {
			if (detaching) {
				detach(h1);
			}
		}
	};
}

// (205:4) {:else}
function create_else_block_1(ctx) {
	var p, t0, br, t1, t2, if_block_anchor;

	var if_block = (ctx.error_message) && create_if_block_3(ctx);

	return {
		c: function create() {
			p = element("p");
			t0 = text("No results found :/\n        ");
			br = element("br");
			t1 = text("\n        Did you know that you can use \".\" as search term to show all Addons? :)");
			t2 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			add_location(br, file$2, 207, 8, 6166);
			add_location(p, file$2, 205, 6, 6126);
		},

		m: function mount(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, br);
			append(p, t1);
			insert(target, t2, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p: function update(changed, ctx) {
			if (ctx.error_message) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(p);
				detach(t2);
			}

			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

// (211:6) {#if error_message}
function create_if_block_3(ctx) {
	var div, t;

	return {
		c: function create() {
			div = element("div");
			t = text(ctx.error_message);
			attr(div, "class", "bs-callout bs-callout-warning");
			add_location(div, file$2, 211, 8, 6298);
		},

		m: function mount(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},

		p: function update(changed, ctx) {
			if (changed.error_message) {
				set_data(t, ctx.error_message);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (203:4) {#each seachresults_filtered as item}
function create_each_block_3(ctx) {
	var current;

	var resultentry = new Resultentry({
		props: { item: ctx.item },
		$$inline: true
	});

	return {
		c: function create() {
			resultentry.$$.fragment.c();
		},

		m: function mount(target, anchor) {
			mount_component(resultentry, target, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			var resultentry_changes = {};
			if (changed.seachresults_filtered) resultentry_changes.item = ctx.item;
			resultentry.$set(resultentry_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(resultentry.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(resultentry.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			destroy_component(resultentry, detaching);
		}
	};
}

// (156:6) {#each often_installed as item}
function create_each_block_2(ctx) {
	var current;

	var entry = new Entry({
		props: {
		ratings: ctx.userdata.ratings,
		item: ctx.item
	},
		$$inline: true
	});
	entry.$on("rate", ctx.submit_rate);
	entry.$on("click", ctx.click_handler);

	return {
		c: function create() {
			entry.$$.fragment.c();
		},

		m: function mount(target, anchor) {
			mount_component(entry, target, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			var entry_changes = {};
			if (changed.userdata) entry_changes.ratings = ctx.userdata.ratings;
			if (changed.often_installed) entry_changes.item = ctx.item;
			entry.$set(entry_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(entry.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(entry.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			destroy_component(entry, detaching);
		}
	};
}

// (167:6) {#each recommended as item}
function create_each_block_1(ctx) {
	var current;

	var entry = new Entry({
		props: {
		ratings: ctx.userdata.ratings,
		item: ctx.item
	},
		$$inline: true
	});
	entry.$on("rate", ctx.submit_rate);
	entry.$on("click", ctx.click_handler_1);

	return {
		c: function create() {
			entry.$$.fragment.c();
		},

		m: function mount(target, anchor) {
			mount_component(entry, target, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			var entry_changes = {};
			if (changed.userdata) entry_changes.ratings = ctx.userdata.ratings;
			if (changed.recommended) entry_changes.item = ctx.item;
			entry.$set(entry_changes);
		},

		i: function intro(local) {
			if (current) return;
			transition_in(entry.$$.fragment, local);

			current = true;
		},

		o: function outro(local) {
			transition_out(entry.$$.fragment, local);
			current = false;
		},

		d: function destroy(detaching) {
			destroy_component(entry, detaching);
		}
	};
}

// (190:12) {#if item.changelog_url}
function create_if_block_2$1(ctx) {
	var a, t, a_href_value;

	return {
		c: function create() {
			a = element("a");
			t = text("Changelog");
			attr(a, "href", a_href_value = ctx.item.changelog_url);
			add_location(a, file$2, 190, 14, 5721);
		},

		m: function mount(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p: function update(changed, ctx) {
			if ((changed.last_updated) && a_href_value !== (a_href_value = ctx.item.changelog_url)) {
				attr(a, "href", a_href_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (187:8) {#each last_updated as item}
function create_each_block(ctx) {
	var li, t0_value = ctx.item.label, t0, t1, t2, br, t3, t4_value = new Date(ctx.item.last_updated).toLocaleString(), t4, t5, t6_value = ctx.item.version, t6, t7;

	var if_block = (ctx.item.changelog_url) && create_if_block_2$1(ctx);

	return {
		c: function create() {
			li = element("li");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			br = element("br");
			t3 = text("\n            Updated on ");
			t4 = text(t4_value);
			t5 = text(" to version\n            ");
			t6 = text(t6_value);
			t7 = text(".\n          ");
			add_location(br, file$2, 192, 12, 5794);
			attr(li, "class", "mb-2");
			add_location(li, file$2, 187, 10, 5627);
		},

		m: function mount(target, anchor) {
			insert(target, li, anchor);
			append(li, t0);
			append(li, t1);
			if (if_block) if_block.m(li, null);
			append(li, t2);
			append(li, br);
			append(li, t3);
			append(li, t4);
			append(li, t5);
			append(li, t6);
			append(li, t7);
		},

		p: function update(changed, ctx) {
			if ((changed.last_updated) && t0_value !== (t0_value = ctx.item.label)) {
				set_data(t0, t0_value);
			}

			if (ctx.item.changelog_url) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_2$1(ctx);
					if_block.c();
					if_block.m(li, t2);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if ((changed.last_updated) && t4_value !== (t4_value = new Date(ctx.item.last_updated).toLocaleString())) {
				set_data(t4, t4_value);
			}

			if ((changed.last_updated) && t6_value !== (t6_value = ctx.item.version)) {
				set_data(t6, t6_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(li);
			}

			if (if_block) if_block.d();
		}
	};
}

function create_fragment$2(ctx) {
	var link0, t0, link1, t1, link2, t2, current_block_type_index, if_block, if_block_anchor, current;

	var if_block_creators = [
		create_if_block$2,
		create_if_block_1$1,
		create_else_block
	];

	var if_blocks = [];

	function select_block_type(ctx) {
		if (ctx.loading) return 0;
		if (ctx.searchstring.length === 0) return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c: function create() {
			link0 = element("link");
			t0 = space();
			link1 = element("link");
			t1 = space();
			link2 = element("link");
			t2 = space();
			if_block.c();
			if_block_anchor = empty();
			this.c = noop;
			attr(link0, "rel", "stylesheet");
			attr(link0, "href", "/css/main.min.css");
			add_location(link0, file$2, 145, 0, 4452);
			attr(link1, "rel", "stylesheet");
			attr(link1, "href", "/css/addons.min.css");
			add_location(link1, file$2, 146, 0, 4503);
			attr(link2, "rel", "stylesheet");
			attr(link2, "href", "/css/fontawesome.min.css");
			add_location(link2, file$2, 147, 0, 4556);
		},

		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},

		m: function mount(target, anchor) {
			insert(target, link0, anchor);
			insert(target, t0, anchor);
			insert(target, link1, anchor);
			insert(target, t1, anchor);
			insert(target, link2, anchor);
			insert(target, t2, anchor);
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},

		p: function update(changed, ctx) {
			var previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);
			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(changed, ctx);
			} else {
				group_outros();
				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});
				check_outros();

				if_block = if_blocks[current_block_type_index];
				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}
				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},

		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},

		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(link0);
				detach(t0);
				detach(link1);
				detach(t1);
				detach(link2);
				detach(t2);
			}

			if_blocks[current_block_type_index].d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	
  const dispatch = createEventDispatcher();

  let { bindings = undefined, ioservices = undefined, ruletemplates = undefined, userdata = { ratings: {} } } = $$props;
  let bindingsChk = undefined;
  let ioservicesChk = undefined;
  let ruletemplatesChk = undefined;
  let filters = { binding: true, ioservice: true, ruletemplate: true };

  function chkChanged(ev) {
    filters[ev.target.name] = ev.target.checked; $$invalidate('filters', filters);
    console.log(filters);
  }

  let { src = undefined } = $$props;
  let database = undefined;
  let loading = false;
  let db = [];
  let error_message = "";

  let { search = undefined, form = undefined } = $$props;
  let searchInput = undefined;
  let searchstring = "";
  let seachresults = [];

  let recommended = [];
  let last_updated = [];
  let often_installed = [];

  function dbChanged(ev) {
    $$invalidate('loading', loading = !ev.detail.ok && !ev.detail.err);
    if (loading) return;
    $$invalidate('db', db = ev.target.db);
    $$invalidate('recommended', recommended = ev.target.recommended);
    $$invalidate('last_updated', last_updated = ev.target.last_updated.slice(0, 7));
    $$invalidate('often_installed', often_installed = ev.target.often_installed.slice(0, 3));
  }

  /**
   * @param[string] id The addon id
   */
  function setSearchTerm(id = "") {
    if (!searchInput) return;
    searchInput.value = id; $$invalidate('searchInput', searchInput), $$invalidate('src', src), $$invalidate('bindings', bindings), $$invalidate('ioservices', ioservices), $$invalidate('ruletemplates', ruletemplates), $$invalidate('search', search), $$invalidate('bindingsChk', bindingsChk), $$invalidate('ioservicesChk', ioservicesChk), $$invalidate('ruletemplatesChk', ruletemplatesChk), $$invalidate('form', form), $$invalidate('database', database), $$invalidate('db', db), $$invalidate('filters', filters);
    searchInput.dispatchEvent(new Event("input"));
  }

  function resetSearchTerm() {
    if (!searchInput) return;
    searchInput.value = ""; $$invalidate('searchInput', searchInput), $$invalidate('src', src), $$invalidate('bindings', bindings), $$invalidate('ioservices', ioservices), $$invalidate('ruletemplates', ruletemplates), $$invalidate('search', search), $$invalidate('bindingsChk', bindingsChk), $$invalidate('ioservicesChk', ioservicesChk), $$invalidate('ruletemplatesChk', ruletemplatesChk), $$invalidate('form', form), $$invalidate('database', database), $$invalidate('db', db), $$invalidate('filters', filters);
    searchInput.dispatchEvent(new Event("input"));
  }

  function searchChanged(ev) {
    ev.preventDefault();
    $$invalidate('error_message', error_message = "");
    $$invalidate('searchstring', searchstring = ev.target.value);
    console.log("CALL", searchstring.length, ev.target.value);
  }

  function submit_rate(e) {
    userdata.ratings[e.detail.id] = e.detail.rate; $$invalidate('userdata', userdata);
    dispatch("userdata", { userdata });
    console.log(userdata);
  }

  onMount(() => {
    return () => {
      if (bindingsChk) bindingsChk.removeEventListener("change", chkChanged);
      if (ioservicesChk)
        ioservicesChk.removeEventListener("change", chkChanged);
      if (ruletemplatesChk)
        ruletemplatesChk.removeEventListener("change", chkChanged);
      if (searchInput) {
        searchInput.removeEventListener("input", searchChanged);
      }
      if (form) searchForm.removeEventListener("reset", resetSearchTerm);
      if (database) database.removeEventListener("loader", dbChanged);
    };
  });

	const writable_props = ['bindings', 'ioservices', 'ruletemplates', 'userdata', 'src', 'search', 'form'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$1.warn(`<ui-addons-search> was created with unknown prop '${key}'`);
	});

	function click_handler(e) {
		return setSearchTerm(e.detail.id);
	}

	function click_handler_1(e) {
		return setSearchTerm(e.detail.id);
	}

	$$self.$set = $$props => {
		if ('bindings' in $$props) $$invalidate('bindings', bindings = $$props.bindings);
		if ('ioservices' in $$props) $$invalidate('ioservices', ioservices = $$props.ioservices);
		if ('ruletemplates' in $$props) $$invalidate('ruletemplates', ruletemplates = $$props.ruletemplates);
		if ('userdata' in $$props) $$invalidate('userdata', userdata = $$props.userdata);
		if ('src' in $$props) $$invalidate('src', src = $$props.src);
		if ('search' in $$props) $$invalidate('search', search = $$props.search);
		if ('form' in $$props) $$invalidate('form', form = $$props.form);
	};

	let seachresults_filtered;

	$$self.$$.update = ($$dirty = { src: 1, bindings: 1, ioservices: 1, ruletemplates: 1, search: 1, bindingsChk: 1, ioservicesChk: 1, ruletemplatesChk: 1, form: 1, searchInput: 1, database: 1, searchstring: 1, seachresults: 1, filters: 1, db: 1 }) => {
		if ($$dirty.src || $$dirty.bindings || $$dirty.ioservices || $$dirty.ruletemplates || $$dirty.search || $$dirty.bindingsChk || $$dirty.ioservicesChk || $$dirty.ruletemplatesChk || $$dirty.form || $$dirty.searchInput || $$dirty.database) { if (src && bindings && ioservices && ruletemplates && search) {
        $$invalidate('bindingsChk', bindingsChk = document.getElementById(bindings));
        $$invalidate('ioservicesChk', ioservicesChk = document.getElementById(ioservices));
        $$invalidate('ruletemplatesChk', ruletemplatesChk = document.getElementById(ruletemplates));
        if (bindingsChk) bindingsChk.addEventListener("change", chkChanged);
        if (ioservicesChk) ioservicesChk.addEventListener("change", chkChanged);
        if (ruletemplatesChk)
          ruletemplatesChk.addEventListener("change", chkChanged);
    
        $$invalidate('searchInput', searchInput = document.getElementById(search));
        let searchForm = document.getElementById(form);
        if (searchInput) {
          searchInput.addEventListener("input", searchChanged);
          searchForm.addEventListener("reset", resetSearchTerm);
        }
    
        $$invalidate('database', database = document.getElementById(src));
        if (database) {
          if (database.db.length > 0) $$invalidate('db', db = database.db);
          database.addEventListener("loader", dbChanged);
        }
      } }
		if ($$dirty.database || $$dirty.searchstring) { if (database && database.searchstr) {
        let resMap = {};
        const string = database.searchstr;
        let seachresults_t = [];
        try {
          const matches = string.matchAll(searchstring);
          for (const match of matches) {
            const start = string.lastIndexOf("{", match.index);
            if (resMap[start]) continue;
            resMap[start] = true;
            const end = string.indexOf("}", match.index);
            seachresults_t.push(JSON.parse(string.substring(start, end + 1)).id);
            // console.log(string.substring(start, end + 1));
          }
        } catch (e) {
          $$invalidate('error_message', error_message = e.message);
        }
        $$invalidate('seachresults', seachresults = seachresults_t);
      } }
		if ($$dirty.seachresults || $$dirty.database || $$dirty.filters) { $$invalidate('seachresults_filtered', seachresults_filtered = seachresults
        .map(item => database.db_by_id[item])
        .filter(item => filters[item.type])); }
		if ($$dirty.db || $$dirty.searchInput || $$dirty.filters) { if (db && searchInput) {
        let count = 0;
        for (let item of db) if (filters[item.type]) ++count;
        searchInput.placeholder = `Searching ${count} Addons`; $$invalidate('searchInput', searchInput), $$invalidate('src', src), $$invalidate('bindings', bindings), $$invalidate('ioservices', ioservices), $$invalidate('ruletemplates', ruletemplates), $$invalidate('search', search), $$invalidate('bindingsChk', bindingsChk), $$invalidate('ioservicesChk', ioservicesChk), $$invalidate('ruletemplatesChk', ruletemplatesChk), $$invalidate('form', form), $$invalidate('database', database), $$invalidate('db', db), $$invalidate('filters', filters);
      } }
	};

	return {
		bindings,
		ioservices,
		ruletemplates,
		userdata,
		src,
		loading,
		error_message,
		search,
		form,
		searchstring,
		recommended,
		last_updated,
		often_installed,
		setSearchTerm,
		submit_rate,
		seachresults_filtered,
		click_handler,
		click_handler_1
	};
}

class Index extends SvelteElement {
	constructor(options) {
		super();

		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, ["bindings", "ioservices", "ruletemplates", "userdata", "src", "search", "form"]);

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["bindings","ioservices","ruletemplates","userdata","src","search","form"];
	}

	get bindings() {
		return this.$$.ctx.bindings;
	}

	set bindings(bindings) {
		this.$set({ bindings });
		flush();
	}

	get ioservices() {
		return this.$$.ctx.ioservices;
	}

	set ioservices(ioservices) {
		this.$set({ ioservices });
		flush();
	}

	get ruletemplates() {
		return this.$$.ctx.ruletemplates;
	}

	set ruletemplates(ruletemplates) {
		this.$set({ ruletemplates });
		flush();
	}

	get userdata() {
		return this.$$.ctx.userdata;
	}

	set userdata(userdata) {
		this.$set({ userdata });
		flush();
	}

	get src() {
		return this.$$.ctx.src;
	}

	set src(src) {
		this.$set({ src });
		flush();
	}

	get search() {
		return this.$$.ctx.search;
	}

	set search(search) {
		this.$set({ search });
		flush();
	}

	get form() {
		return this.$$.ctx.form;
	}

	set form(form) {
		this.$set({ form });
		flush();
	}
}

customElements.define("ui-addons-search", Index);

export default Index;
//# sourceMappingURL=addons-search.js.map
