function noop() { }
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
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
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
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}
class HtmlTag {
    constructor(html, anchor = null) {
        this.e = element('div');
        this.a = anchor;
        this.u(html);
    }
    m(target, anchor = null) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(target, this.n[i], anchor);
        }
        this.t = target;
    }
    u(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.childNodes);
    }
    p(html) {
        this.d();
        this.u(html);
        this.m(this.t, this.a);
    }
    d() {
        this.n.forEach(detach);
    }
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
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
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
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
    }
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
        ? instance(component, props, (key, ret, value = ret) => {
            if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                if ($$.bound[key])
                    $$.bound[key](value);
                if (ready)
                    make_dirty(component, key);
            }
            return ret;
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
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
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
}

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

/* assets/js/ui-addon/permissions_install.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.installment = list[i][0];
	child_ctx.thisaddon = list[i][1];
	child_ctx.queue = list[i][2];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.rule = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.rule = list[i];
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.cap = list[i];
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.permission = list[i];
	return child_ctx;
}

// (133:0) {:else}
function create_else_block_2(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.textContent = "No permissions required";
		},

		m(target, anchor) {
			insert(target, p, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (128:0) {#each perm as permission}
function create_each_block_4(ctx) {
	var dl, dt, t0_value = ctx.permission.label + "", t0, t1, t2_value = ctx.permission.id + "", t2, t3, dd, t4_value = ctx.permission.description + "", t4;

	return {
		c() {
			dl = element("dl");
			dt = element("dt");
			t0 = text(t0_value);
			t1 = text(" (");
			t2 = text(t2_value);
			t3 = text(")");
			dd = element("dd");
			t4 = text(t4_value);
		},

		m(target, anchor) {
			insert(target, dl, anchor);
			append(dl, dt);
			append(dt, t0);
			append(dt, t1);
			append(dt, t2);
			append(dt, t3);
			append(dl, dd);
			append(dd, t4);
		},

		p(changed, ctx) {
			if ((changed.perm) && t0_value !== (t0_value = ctx.permission.label + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.perm) && t2_value !== (t2_value = ctx.permission.id + "")) {
				set_data(t2, t2_value);
			}

			if ((changed.perm) && t4_value !== (t4_value = ctx.permission.description + "")) {
				set_data(t4, t4_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(dl);
			}
		}
	};
}

// (136:0) {#if addon.linux_capabilities}
function create_if_block_11(ctx) {
	var h4, t_1, each_1_anchor;

	let each_value_3 = ctx.addon.linux_capabilities;

	let each_blocks = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	return {
		c() {
			h4 = element("h4");
			h4.textContent = "Linux capabilities";
			t_1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},

		m(target, anchor) {
			insert(target, h4, anchor);
			insert(target, t_1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},

		p(changed, ctx) {
			if (changed.cap_description || changed.addon) {
				each_value_3 = ctx.addon.linux_capabilities;

				let i;
				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block_3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value_3.length;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h4);
				detach(t_1);
			}

			destroy_each(each_blocks, detaching);

			if (detaching) {
				detach(each_1_anchor);
			}
		}
	};
}

// (138:2) {#each addon.linux_capabilities as cap}
function create_each_block_3(ctx) {
	var dl, dt, t0_value = ctx.cap + "", t0, dd, html_tag, raw_value = cap_description(ctx.cap) + "", t1;

	return {
		c() {
			dl = element("dl");
			dt = element("dt");
			t0 = text(t0_value);
			dd = element("dd");
			t1 = space();
			html_tag = new HtmlTag(raw_value, t1);
		},

		m(target, anchor) {
			insert(target, dl, anchor);
			append(dl, dt);
			append(dt, t0);
			append(dl, dd);
			html_tag.m(dd);
			append(dd, t1);
		},

		p(changed, ctx) {
			if ((changed.addon) && t0_value !== (t0_value = ctx.cap + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.addon) && raw_value !== (raw_value = cap_description(ctx.cap) + "")) {
				html_tag.p(raw_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(dl);
			}
		}
	};
}

// (147:0) {#if addon.firewall_allow || addon.ports}
function create_if_block_7(ctx) {
	var h4, t1, show_if, t2, if_block1_anchor;

	function select_block_type(changed, ctx) {
		if ((show_if == null) || changed.addon) show_if = !!(ctx.addon.firewall_allow && ctx.addon.firewall_allow.includes('*'));
		if (show_if) return create_if_block_9;
		if (ctx.addon.firewall_allow) return create_if_block_10;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block0 = current_block_type && current_block_type(ctx);

	var if_block1 = (ctx.addon.ports) && create_if_block_8(ctx);

	return {
		c() {
			h4 = element("h4");
			h4.textContent = "Networking";
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},

		m(target, anchor) {
			insert(target, h4, anchor);
			insert(target, t1, anchor);
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t2, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},

		p(changed, ctx) {
			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
				if_block0.p(changed, ctx);
			} else {
				if (if_block0) if_block0.d(1);
				if_block0 = current_block_type && current_block_type(ctx);
				if (if_block0) {
					if_block0.c();
					if_block0.m(t2.parentNode, t2);
				}
			}

			if (ctx.addon.ports) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_8(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h4);
				detach(t1);
			}

			if (if_block0) if_block0.d(detaching);

			if (detaching) {
				detach(t2);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(if_block1_anchor);
			}
		}
	};
}

// (153:33) 
function create_if_block_10(ctx) {
	var t, ul;

	let each_value_2 = ctx.addon.firewall_allow;

	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	return {
		c() {
			t = text("Allow Internet Access to\n    ");
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
		},

		m(target, anchor) {
			insert(target, t, anchor);
			insert(target, ul, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}
		},

		p(changed, ctx) {
			if (changed.addon) {
				each_value_2 = ctx.addon.firewall_allow;

				let i;
				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block_2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value_2.length;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t);
				detach(ul);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (149:2) {#if addon.firewall_allow && addon.firewall_allow.includes('*')}
function create_if_block_9(ctx) {
	var span, t_1;

	return {
		c() {
			span = element("span");
			span.textContent = "FULL Internet access!";
			t_1 = text("\n    . An Addon developer should usually restrict this to a set of required\n    internet addresses!");
			attr(span, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, span, anchor);
			insert(target, t_1, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(span);
				detach(t_1);
			}
		}
	};
}

// (156:6) {#each addon.firewall_allow as rule}
function create_each_block_2(ctx) {
	var li, t_value = ctx.rule + "", t;

	return {
		c() {
			li = element("li");
			t = text(t_value);
		},

		m(target, anchor) {
			insert(target, li, anchor);
			append(li, t);
		},

		p(changed, ctx) {
			if ((changed.addon) && t_value !== (t_value = ctx.rule + "")) {
				set_data(t, t_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(li);
			}
		}
	};
}

// (161:2) {#if addon.ports}
function create_if_block_8(ctx) {
	var t, each_1_anchor;

	let each_value_1 = ctx.addon.ports;

	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			t = text("Expose ports to Internet:\n    ");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},

		m(target, anchor) {
			insert(target, t, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},

		p(changed, ctx) {
			if (changed.addon) {
				each_value_1 = ctx.addon.ports;

				let i;
				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value_1.length;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t);
			}

			destroy_each(each_blocks, detaching);

			if (detaching) {
				detach(each_1_anchor);
			}
		}
	};
}

// (163:4) {#each addon.ports as rule}
function create_each_block_1(ctx) {
	var t0_value = ctx.rule + "", t0, t1;

	return {
		c() {
			t0 = text(t0_value);
			t1 = text("; ");
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},

		p(changed, ctx) {
			if ((changed.addon) && t0_value !== (t0_value = ctx.rule + "")) {
				set_data(t0, t0_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
			}
		}
	};
}

// (215:0) {:else}
function create_else_block_1(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.innerHTML = `
			    No Installations registered! Log into
			    <b>Setup &amp; Maintenance</b>
			    and click on "Register this installation on openhabx.com".
			  `;
		},

		m(target, anchor) {
			insert(target, p, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (197:4) {:else}
function create_else_block(ctx) {
	var button, t, button_disabled_value, dispose;

	function click_handler_2(...args) {
		return ctx.click_handler_2(ctx, ...args);
	}

	return {
		c() {
			button = element("button");
			t = text("Install");
			attr(button, "class", "btn btn-outline-success");
			button.disabled = button_disabled_value = ctx.queue && ctx.queue.c=='install';
			dispose = listen(button, "click", click_handler_2);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.data || changed.actionqueue) && button_disabled_value !== (button_disabled_value = ctx.queue && ctx.queue.c=='install')) {
				button.disabled = button_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}

			dispose();
		}
	};
}

// (195:37) 
function create_if_block_6(ctx) {
	var p, t0, t1_value = ctx.thisaddon.d + "", t1;

	return {
		c() {
			p = element("p");
			t0 = text("An error occured: ");
			t1 = text(t1_value);
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
		},

		p(changed, ctx) {
			if ((changed.data || changed.actionqueue) && t1_value !== (t1_value = ctx.thisaddon.d + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (179:41) 
function create_if_block_5(ctx) {
	var small, t1, div, button0, t2, button0_disabled_value, t3, button1, t4, t5_value = ctx.thisaddon.v + "", t5, t6, t7_value = ctx.addon.version + "", t7, button1_disabled_value, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	function click_handler_1(...args) {
		return ctx.click_handler_1(ctx, ...args);
	}

	return {
		c() {
			small = element("small");
			small.textContent = "This Addon is already installed";
			t1 = space();
			div = element("div");
			button0 = element("button");
			t2 = text("Uninstall");
			t3 = space();
			button1 = element("button");
			t4 = text("Update ");
			t5 = text(t5_value);
			t6 = text(" to ");
			t7 = text(t7_value);
			attr(small, "class", "mb-2");
			attr(button0, "class", "btn btn-outline-danger mr-3");
			button0.disabled = button0_disabled_value = ctx.queue && ctx.queue.c=='uninstall';
			attr(button1, "class", "btn btn-outline-warning");
			button1.disabled = button1_disabled_value = ctx.is_old_version(ctx.thisaddon) || ctx.queue && ctx.queue.c=='update';
			attr(div, "class", "btn-group");

			dispose = [
				listen(button0, "click", click_handler),
				listen(button1, "click", click_handler_1)
			];
		},

		m(target, anchor) {
			insert(target, small, anchor);
			insert(target, t1, anchor);
			insert(target, div, anchor);
			append(div, button0);
			append(button0, t2);
			append(div, t3);
			append(div, button1);
			append(button1, t4);
			append(button1, t5);
			append(button1, t6);
			append(button1, t7);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.data || changed.actionqueue) && button0_disabled_value !== (button0_disabled_value = ctx.queue && ctx.queue.c=='uninstall')) {
				button0.disabled = button0_disabled_value;
			}

			if ((changed.data || changed.actionqueue) && t5_value !== (t5_value = ctx.thisaddon.v + "")) {
				set_data(t5, t5_value);
			}

			if ((changed.addon) && t7_value !== (t7_value = ctx.addon.version + "")) {
				set_data(t7, t7_value);
			}

			if ((changed.data || changed.actionqueue) && button1_disabled_value !== (button1_disabled_value = ctx.is_old_version(ctx.thisaddon) || ctx.queue && ctx.queue.c=='update')) {
				button1.disabled = button1_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(small);
				detach(t1);
				detach(div);
			}

			run_all(dispose);
		}
	};
}

// (175:44) 
function create_if_block_4(ctx) {
	var button;

	return {
		c() {
			button = element("button");
			button.textContent = "Uninstalling …";
			button.disabled = true;
			attr(button, "class", "btn btn-outline-info");
		},

		m(target, anchor) {
			insert(target, button, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(button);
			}
		}
	};
}

// (173:42) 
function create_if_block_3(ctx) {
	var button;

	return {
		c() {
			button = element("button");
			button.textContent = "Installing …";
			button.disabled = true;
			attr(button, "class", "btn btn-outline-info");
		},

		m(target, anchor) {
			insert(target, button, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(button);
			}
		}
	};
}

// (169:4) {#if thisaddon.s == 'downloading'}
function create_if_block_2(ctx) {
	var button, t0, t1_value = ctx.thisaddon.d * 100 + "", t1, t2;

	return {
		c() {
			button = element("button");
			t0 = text("Downloading Addon: ");
			t1 = text(t1_value);
			t2 = text("%");
			button.disabled = true;
			attr(button, "class", "btn btn-outline-info");
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t0);
			append(button, t1);
			append(button, t2);
		},

		p(changed, ctx) {
			if ((changed.data || changed.actionqueue) && t1_value !== (t1_value = ctx.thisaddon.d * 100 + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}
		}
	};
}

// (205:4) {#if queue}
function create_if_block_1(ctx) {
	var small, b, t1, t2_value = ctx.queue.c + "", t2, t3;

	return {
		c() {
			small = element("small");
			b = element("b");
			b.textContent = "Queued!";
			t1 = text("\n        The queued Addon task \"");
			t2 = text(t2_value);
			t3 = text("\" will be performed soon by the Addon-Manager.");
		},

		m(target, anchor) {
			insert(target, small, anchor);
			append(small, b);
			append(small, t1);
			append(small, t2);
			append(small, t3);
		},

		p(changed, ctx) {
			if ((changed.data || changed.actionqueue) && t2_value !== (t2_value = ctx.queue.c + "")) {
				set_data(t2, t2_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(small);
			}
		}
	};
}

// (211:4) {#if error_message}
function create_if_block(ctx) {
	var small, t;

	return {
		c() {
			small = element("small");
			t = text(ctx.error_message);
			attr(small, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, small, anchor);
			append(small, t);
		},

		p(changed, ctx) {
			if (changed.error_message) {
				set_data(t, ctx.error_message);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(small);
			}
		}
	};
}

// (166:0) {#each installs_with_addon(data.installations, actionqueue) as [installment, thisaddon, queue]}
function create_each_block(ctx) {
	var div, h5, t0_value = ctx.installment.title + "", t0, t1, t2, t3, t4;

	function select_block_type_1(changed, ctx) {
		if (ctx.thisaddon.s == 'downloading') return create_if_block_2;
		if (ctx.thisaddon.s == 'installing') return create_if_block_3;
		if (ctx.thisaddon.s == 'uninstalling') return create_if_block_4;
		if (ctx.thisaddon.s == 'installed') return create_if_block_5;
		if (ctx.thisaddon.s == 'error') return create_if_block_6;
		return create_else_block;
	}

	var current_block_type = select_block_type_1(null, ctx);
	var if_block0 = current_block_type(ctx);

	var if_block1 = (ctx.queue) && create_if_block_1(ctx);

	var if_block2 = (ctx.error_message) && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			h5 = element("h5");
			t0 = text(t0_value);
			t1 = space();
			if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			t4 = space();
			attr(div, "class", "card m-3 p-3");
		},

		m(target, anchor) {
			insert(target, div, anchor);
			append(div, h5);
			append(h5, t0);
			append(div, t1);
			if_block0.m(div, null);
			append(div, t2);
			if (if_block1) if_block1.m(div, null);
			append(div, t3);
			if (if_block2) if_block2.m(div, null);
			append(div, t4);
		},

		p(changed, ctx) {
			if ((changed.data || changed.actionqueue) && t0_value !== (t0_value = ctx.installment.title + "")) {
				set_data(t0, t0_value);
			}

			if (current_block_type === (current_block_type = select_block_type_1(changed, ctx)) && if_block0) {
				if_block0.p(changed, ctx);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);
				if (if_block0) {
					if_block0.c();
					if_block0.m(div, t2);
				}
			}

			if (ctx.queue) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div, t3);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (ctx.error_message) {
				if (if_block2) {
					if_block2.p(changed, ctx);
				} else {
					if_block2 = create_if_block(ctx);
					if_block2.c();
					if_block2.m(div, t4);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
		}
	};
}

function create_fragment(ctx) {
	var h4, t1, t2, t3, t4, each1_anchor;

	let each_value_4 = ctx.perm;

	let each_blocks_1 = [];

	for (let i = 0; i < each_value_4.length; i += 1) {
		each_blocks_1[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
	}

	let each0_else = null;

	if (!each_value_4.length) {
		each0_else = create_else_block_2();
		each0_else.c();
	}

	var if_block0 = (ctx.addon.linux_capabilities) && create_if_block_11(ctx);

	var if_block1 = (ctx.addon.firewall_allow || ctx.addon.ports) && create_if_block_7(ctx);

	let each_value = ctx.installs_with_addon(ctx.data.installations, ctx.actionqueue);

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	let each1_else = null;

	if (!each_value.length) {
		each1_else = create_else_block_1();
		each1_else.c();
	}

	return {
		c() {
			h4 = element("h4");
			h4.textContent = "Permissions";
			t1 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t2 = space();
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each1_anchor = empty();
		},

		m(target, anchor) {
			insert(target, h4, anchor);
			insert(target, t1, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(target, anchor);
			}

			if (each0_else) {
				each0_else.m(target, anchor);
			}

			insert(target, t2, anchor);
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t3, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, t4, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each1_anchor, anchor);

			if (each1_else) {
				each1_else.m(target, anchor);
			}
		},

		p(changed, ctx) {
			if (changed.perm) {
				each_value_4 = ctx.perm;

				let i;
				for (i = 0; i < each_value_4.length; i += 1) {
					const child_ctx = get_each_context_4(ctx, each_value_4, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(changed, child_ctx);
					} else {
						each_blocks_1[i] = create_each_block_4(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(t2.parentNode, t2);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}
				each_blocks_1.length = each_value_4.length;
			}

			if (each_value_4.length) {
				if (each0_else) {
					each0_else.d(1);
					each0_else = null;
				}
			} else if (!each0_else) {
				each0_else = create_else_block_2();
				each0_else.c();
				each0_else.m(t2.parentNode, t2);
			}

			if (ctx.addon.linux_capabilities) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_11(ctx);
					if_block0.c();
					if_block0.m(t3.parentNode, t3);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (ctx.addon.firewall_allow || ctx.addon.ports) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_7(ctx);
					if_block1.c();
					if_block1.m(t4.parentNode, t4);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (changed.error_message || changed.installs_with_addon || changed.data || changed.actionqueue || changed.is_old_version || changed.addon) {
				each_value = ctx.installs_with_addon(ctx.data.installations, ctx.actionqueue);

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (each_value.length) {
				if (each1_else) {
					each1_else.d(1);
					each1_else = null;
				}
			} else if (!each1_else) {
				each1_else = create_else_block_1();
				each1_else.c();
				each1_else.m(each1_anchor.parentNode, each1_anchor);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(h4);
				detach(t1);
			}

			destroy_each(each_blocks_1, detaching);

			if (each0_else) each0_else.d(detaching);

			if (detaching) {
				detach(t2);
			}

			if (if_block0) if_block0.d(detaching);

			if (detaching) {
				detach(t3);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(t4);
			}

			destroy_each(each_blocks, detaching);

			if (detaching) {
				detach(each1_anchor);
			}

			if (each1_else) each1_else.d(detaching);
		}
	};
}

function cap_description(cap) {
  switch (cap) {
    case "CHOWN":
    case "DAC_OVERRIDE":
    case "DAC_READ_SEARCH":
    case "FOWNER":
    case "FSETID":
      return "<span class='text-danger'>Bypass any process permission checks</span>";
    case "BLOCK_SUSPEND":
    case "SYS_BOOT":
    case "CAP_WAKE_ALARM":
      return "Allows to block system suspend, reboot and set wakeup timers.";
    case "NET_ADMIN":
      return "<span class='text-danger'>Full access to the host networking, including potential traffic sniffing and man in the middle attacks</span>";
    case "NET_BIND_SERVICE":
      return "Allows to bind to a privileged port (port number less than 1024)";
    case "NET_RAW":
      return "Allows to use RAW and PACKET sockets. Allows transparent proxing. <span class='text-danger'>Might be abused for traffic sniffing and man in the middle attacks.</span>";
    case "SYS_ADMIN":
    case "SYS_MODULE":
    case "SYS_RAWIO":
    case "SYS_PTRACE":
      return "<span class='text-danger'>Full system access, loading of arbitrary kernel modules, access other processes memory!</span>";
    case "SYS_TIME":
      return "Allows to set the system clock. Might be abused to attack time based encryption.";
    case "SYS_RESOURCE":
      return "Allows to override disk quota limits. Allows to use reserved disk space.";
    case "SYSLOG":
      return "System log access";
    default:
      return "Unknown";
  }
}

function instance($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();

  let { permissions, addon = { permissions: { mandatory: [], optional: [] } }, UserAwareComponent } = $$props;

  let error_message = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy;
  onDestroy(() => {
    if (onDestroyProxy) onDestroyProxy();
  });

/**
 * Returns a tuple (array) with (installation_details, addon_installation_details, command_queue_entry)
 * This methods result is used to render the installations list and is recomputed whenever the action queue or installations change.
 */
  function installs_with_addon(installs, aq) {
    return Object.values(installs).map(item => {
      let thisaddon = item.addons[addon.id] || {};
      if (!thisaddon.s) thisaddon.s = null;
      const aq_install = aq[item.id];
      return [item, thisaddon, aq_install?aq_install[addon.id]:null];
    });
  }

  function is_old_version(install_addon) {
    //console.log("IS_CURRENT", install_addon.v, addon.version);
    try {
      const v1 = install_addon.v;
      const v2 = addon.version;
      v1 = v1.split(".");
      v2 = v2.split(".");
      const k = Math.min(v1.length, v2.length);
      for (let i = 0; i < k; ++i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
      }
      //return v1.length == v2.length ? 0 : v1.length < v2.length ? -1 : 1;
      if (v1.length < v2.length);
    } catch (_) {
      return false;
    }
  }
  function action(e, installation, code) {
    e.target.disabled = true;
    $$invalidate('error_message', error_message = null);
    dispatch("install", {
      installid: installation.id,
      addonid: addon.id,
      code,
      confirm: () => {
      },
      error: err => {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
      }
    });
  }

	const click_handler = ({ installment }, e) => action(e, installment, 'uninstall');

	const click_handler_1 = ({ installment }, e) => action(e, installment, 'update');

	const click_handler_2 = ({ installment }, e) => action(e, installment, 'install');

	$$self.$set = $$props => {
		if ('permissions' in $$props) $$invalidate('permissions', permissions = $$props.permissions);
		if ('addon' in $$props) $$invalidate('addon', addon = $$props.addon);
		if ('UserAwareComponent' in $$props) $$invalidate('UserAwareComponent', UserAwareComponent = $$props.UserAwareComponent);
	};

	let perm;

	$$self.$$.update = ($$dirty = { onDestroyProxy: 1, UserAwareComponent: 1, addon: 1, permissions: 1 }) => {
		if ($$dirty.onDestroyProxy || $$dirty.UserAwareComponent) { if (!onDestroyProxy && UserAwareComponent)
        $$invalidate('onDestroyProxy', onDestroyProxy = UserAwareComponent(
          user_ => {
          },
          data_ => {
            $$invalidate('data', data = data_);
          },
          aq_ => {
            $$invalidate('actionqueue', actionqueue = aq_);
          }
        )); }
		if ($$dirty.addon || $$dirty.permissions) { $$invalidate('perm', perm = addon.permissions.mandatory
        .map(key => Object.assign({ mandatory: true }, permissions[key]))
        .concat(
          addon.permissions.optional.map(key =>
            Object.assign({ mandatory: false }, permissions[key])
          )
        )); }
	};

	return {
		permissions,
		addon,
		UserAwareComponent,
		error_message,
		data,
		actionqueue,
		installs_with_addon,
		is_old_version,
		action,
		perm,
		click_handler,
		click_handler_1,
		click_handler_2
	};
}

class Permissions_install extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["permissions", "addon", "UserAwareComponent"]);
	}
}

/* assets/js/ui-addon/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-1vx0blb-style';
	style.textContent = "table.property-table.svelte-1vx0blb th.svelte-1vx0blb{width:1px;white-space:nowrap}";
	append(document.head, style);
}

// (144:4) {#if addon.authors}
function create_if_block_11$1(ctx) {
	var small, t0, t1_value = ctx.addon.authors.join(', ') + "", t1;

	return {
		c() {
			small = element("small");
			t0 = text("– By ");
			t1 = text(t1_value);
			attr(small, "class", "");
			set_style(small, "white-space", "nowrap");
			set_style(small, "text-overflow", "ellipsis");
		},

		m(target, anchor) {
			insert(target, small, anchor);
			append(small, t0);
			append(small, t1);
		},

		p(changed, ctx) {
			if ((changed.addon) && t1_value !== (t1_value = ctx.addon.authors.join(', ') + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(small);
			}
		}
	};
}

// (153:4) {:else}
function create_else_block_2$1(ctx) {
	var div;

	var if_block = (ctx.suggest_logo_url) && create_if_block_10$1(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
		},

		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
		},

		p(changed, ctx) {
			if (ctx.suggest_logo_url) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_10$1(ctx);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			if (if_block) if_block.d();
		}
	};
}

// (151:4) {#if logo_url}
function create_if_block_9$1(ctx) {
	var img, dispose;

	return {
		c() {
			img = element("img");
			attr(img, "src", ctx.logo_url);
			attr(img, "alt", "Logo");
			dispose = listen(img, "error", ctx.error_handler);
		},

		m(target, anchor) {
			insert(target, img, anchor);
		},

		p(changed, ctx) {
			if (changed.logo_url) {
				attr(img, "src", ctx.logo_url);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(img);
			}

			dispose();
		}
	};
}

// (155:8) {#if suggest_logo_url}
function create_if_block_10$1(ctx) {
	var a, t;

	return {
		c() {
			a = element("a");
			t = text("Suggest Logo");
			attr(a, "href", ctx.suggest_logo_url);
		},

		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p(changed, ctx) {
			if (changed.suggest_logo_url) {
				attr(a, "href", ctx.suggest_logo_url);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (238:4) {:else}
function create_else_block_1$1(ctx) {
	var p, t_value = ctx.addon.description + "", t;

	return {
		c() {
			p = element("p");
			t = text(t_value);
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},

		p(changed, ctx) {
			if ((changed.addon) && t_value !== (t_value = ctx.addon.description + "")) {
				set_data(t, t_value);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (173:35) 
function create_if_block_3$1(ctx) {
	var table, tr0, th0, t1, td0, t2_value = new Date(ctx.addon.last_updated).toLocaleString() + "", t2, t3, t4, tr1, th1, t6, td1, raw_value = maintenance_code_str(ctx.addon.status.code) + "", t7, tr2, th2, t9, td2, t10, tr3, th3, t12, td3, t13, tr4, th4, t15, td4, t16, tr5, th5, t18, td5, t19_value = ctx.addon.reviewed_by && ctx.addon.reviewed_by.length > 0 ? 'Yes' : 'No' + "", t19, t20, t21, button, t22, button_disabled_value, button_title_value, dispose;

	var if_block0 = (ctx.addon.changelog_url) && create_if_block_8$1(ctx);

	var if_block1 = (ctx.addon.size) && create_if_block_7$1(ctx);

	var if_block2 = (ctx.addon.archs) && create_if_block_6$1(ctx);

	var if_block3 = (ctx.addon.memory_min && ctx.addon.memory_max) && create_if_block_5$1(ctx);

	var if_block4 = (ctx.addon.stat && ctx.addon.stat.license && ctx.addon.stat.license) && create_if_block_4$1(ctx);

	return {
		c() {
			table = element("table");
			tr0 = element("tr");
			th0 = element("th");
			th0.textContent = "Updated";
			t1 = space();
			td0 = element("td");
			t2 = text(t2_value);
			t3 = space();
			if (if_block0) if_block0.c();
			t4 = space();
			tr1 = element("tr");
			th1 = element("th");
			th1.textContent = "Maintenance";
			t6 = space();
			td1 = element("td");
			t7 = space();
			tr2 = element("tr");
			th2 = element("th");
			th2.textContent = "Install Size";
			t9 = space();
			td2 = element("td");
			if (if_block1) if_block1.c();
			t10 = space();
			tr3 = element("tr");
			th3 = element("th");
			th3.textContent = "Supported architectures";
			t12 = space();
			td3 = element("td");
			if (if_block2) if_block2.c();
			t13 = space();
			tr4 = element("tr");
			th4 = element("th");
			th4.textContent = "Est. Mem Usage";
			t15 = space();
			td4 = element("td");
			if (if_block3) if_block3.c();
			t16 = space();
			tr5 = element("tr");
			th5 = element("th");
			th5.textContent = "Reviewed";
			t18 = space();
			td5 = element("td");
			t19 = text(t19_value);
			t20 = space();
			if (if_block4) if_block4.c();
			t21 = space();
			button = element("button");
			t22 = text("Check Permissions & Install");
			attr(th0, "scope", "row");
			set_style(th0, "width", "1px");
			set_style(th0, "white-space", "nowrap");
			attr(th0, "class", "svelte-1vx0blb");
			attr(th1, "scope", "row");
			attr(th1, "class", "svelte-1vx0blb");
			attr(th2, "scope", "row");
			attr(th2, "class", "svelte-1vx0blb");
			attr(th3, "scope", "row");
			attr(th3, "class", "svelte-1vx0blb");
			attr(th4, "scope", "row");
			attr(th4, "title", "Estimated Memory Usage. This is an Addon developer provided\n            value.");
			attr(th4, "class", "svelte-1vx0blb");
			attr(th5, "scope", "row");
			attr(th5, "class", "svelte-1vx0blb");
			attr(table, "class", "table table-hover table-sm property-table svelte-1vx0blb");
			attr(button, "class", "btn btn-outline-success");
			button.disabled = button_disabled_value = !ctx.loggedin;
			attr(button, "title", button_title_value = ctx.loggedin ? '' : 'You need to login!');
			dispose = listen(button, "click", stop_propagation(ctx.click_handler_1));
		},

		m(target, anchor) {
			insert(target, table, anchor);
			append(table, tr0);
			append(tr0, th0);
			append(tr0, t1);
			append(tr0, td0);
			append(td0, t2);
			append(td0, t3);
			if (if_block0) if_block0.m(td0, null);
			append(table, t4);
			append(table, tr1);
			append(tr1, th1);
			append(tr1, t6);
			append(tr1, td1);
			td1.innerHTML = raw_value;
			append(table, t7);
			append(table, tr2);
			append(tr2, th2);
			append(tr2, t9);
			append(tr2, td2);
			if (if_block1) if_block1.m(td2, null);
			append(table, t10);
			append(table, tr3);
			append(tr3, th3);
			append(tr3, t12);
			append(tr3, td3);
			if (if_block2) if_block2.m(td3, null);
			append(table, t13);
			append(table, tr4);
			append(tr4, th4);
			append(tr4, t15);
			append(tr4, td4);
			if (if_block3) if_block3.m(td4, null);
			append(table, t16);
			append(table, tr5);
			append(tr5, th5);
			append(tr5, t18);
			append(tr5, td5);
			append(td5, t19);
			append(table, t20);
			if (if_block4) if_block4.m(table, null);
			insert(target, t21, anchor);
			insert(target, button, anchor);
			append(button, t22);
		},

		p(changed, ctx) {
			if ((changed.addon) && t2_value !== (t2_value = new Date(ctx.addon.last_updated).toLocaleString() + "")) {
				set_data(t2, t2_value);
			}

			if (ctx.addon.changelog_url) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_8$1(ctx);
					if_block0.c();
					if_block0.m(td0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if ((changed.addon) && raw_value !== (raw_value = maintenance_code_str(ctx.addon.status.code) + "")) {
				td1.innerHTML = raw_value;
			}

			if (ctx.addon.size) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_7$1(ctx);
					if_block1.c();
					if_block1.m(td2, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (ctx.addon.archs) {
				if (if_block2) {
					if_block2.p(changed, ctx);
				} else {
					if_block2 = create_if_block_6$1(ctx);
					if_block2.c();
					if_block2.m(td3, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (ctx.addon.memory_min && ctx.addon.memory_max) {
				if (if_block3) {
					if_block3.p(changed, ctx);
				} else {
					if_block3 = create_if_block_5$1(ctx);
					if_block3.c();
					if_block3.m(td4, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if ((changed.addon) && t19_value !== (t19_value = ctx.addon.reviewed_by && ctx.addon.reviewed_by.length > 0 ? 'Yes' : 'No' + "")) {
				set_data(t19, t19_value);
			}

			if (ctx.addon.stat && ctx.addon.stat.license && ctx.addon.stat.license) {
				if (if_block4) {
					if_block4.p(changed, ctx);
				} else {
					if_block4 = create_if_block_4$1(ctx);
					if_block4.c();
					if_block4.m(table, null);
				}
			} else if (if_block4) {
				if_block4.d(1);
				if_block4 = null;
			}

			if ((changed.loggedin) && button_disabled_value !== (button_disabled_value = !ctx.loggedin)) {
				button.disabled = button_disabled_value;
			}

			if ((changed.loggedin) && button_title_value !== (button_title_value = ctx.loggedin ? '' : 'You need to login!')) {
				attr(button, "title", button_title_value);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(table);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();

			if (detaching) {
				detach(t21);
				detach(button);
			}

			dispose();
		}
	};
}

// (162:4) {#if mode == 'permissions'}
function create_if_block_2$1(ctx) {
	var t, button, current, dispose;

	var permissionsinstall = new Permissions_install({
		props: {
		addon: ctx.addon,
		UserAwareComponent: ctx.UserAwareComponent,
		permissions: ctx.addondb.permissions
	}
	});
	permissionsinstall.$on("install", ctx.install_handler);

	return {
		c() {
			permissionsinstall.$$.fragment.c();
			t = space();
			button = element("button");
			button.textContent = "Back to description";
			attr(button, "class", "btn btn-primary-success");
			dispose = listen(button, "click", stop_propagation(ctx.click_handler));
		},

		m(target, anchor) {
			mount_component(permissionsinstall, target, anchor);
			insert(target, t, anchor);
			insert(target, button, anchor);
			current = true;
		},

		p(changed, ctx) {
			var permissionsinstall_changes = {};
			if (changed.addon) permissionsinstall_changes.addon = ctx.addon;
			if (changed.UserAwareComponent) permissionsinstall_changes.UserAwareComponent = ctx.UserAwareComponent;
			if (changed.addondb) permissionsinstall_changes.permissions = ctx.addondb.permissions;
			permissionsinstall.$set(permissionsinstall_changes);
		},

		i(local) {
			if (current) return;
			transition_in(permissionsinstall.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(permissionsinstall.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			destroy_component(permissionsinstall, detaching);

			if (detaching) {
				detach(t);
				detach(button);
			}

			dispose();
		}
	};
}

// (179:12) {#if addon.changelog_url}
function create_if_block_8$1(ctx) {
	var a, t, a_href_value;

	return {
		c() {
			a = element("a");
			t = text("Changelog");
			attr(a, "href", a_href_value = ctx.addon.changelog_url);
		},

		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p(changed, ctx) {
			if ((changed.addon) && a_href_value !== (a_href_value = ctx.addon.changelog_url)) {
				attr(a, "href", a_href_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (193:12) {#if addon.size}
function create_if_block_7$1(ctx) {
	var t0_value = Number.parseFloat(ctx.addon.size / 1024 / 1024).toFixed(2) + "", t0, t1;

	return {
		c() {
			t0 = text(t0_value);
			t1 = text(" MB");
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},

		p(changed, ctx) {
			if ((changed.addon) && t0_value !== (t0_value = Number.parseFloat(ctx.addon.size / 1024 / 1024).toFixed(2) + "")) {
				set_data(t0, t0_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
			}
		}
	};
}

// (201:12) {#if addon.archs}
function create_if_block_6$1(ctx) {
	var t_value = ctx.addon.archs + "", t;

	return {
		c() {
			t = text(t_value);
		},

		m(target, anchor) {
			insert(target, t, anchor);
		},

		p(changed, ctx) {
			if ((changed.addon) && t_value !== (t_value = ctx.addon.archs + "")) {
				set_data(t, t_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (212:12) {#if addon.memory_min && addon.memory_max}
function create_if_block_5$1(ctx) {
	var t0_value = Number.parseFloat(ctx.addon.memory_min).toFixed(2) + "", t0, t1, t2_value = Number.parseFloat(ctx.addon.memory_max).toFixed(2) + "", t2, t3;

	return {
		c() {
			t0 = text(t0_value);
			t1 = text(" - ");
			t2 = text(t2_value);
			t3 = text("\n              MB");
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
		},

		p(changed, ctx) {
			if ((changed.addon) && t0_value !== (t0_value = Number.parseFloat(ctx.addon.memory_min).toFixed(2) + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.addon) && t2_value !== (t2_value = Number.parseFloat(ctx.addon.memory_max).toFixed(2) + "")) {
				set_data(t2, t2_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(t3);
			}
		}
	};
}

// (224:8) {#if addon.stat && addon.stat.license && addon.stat.license}
function create_if_block_4$1(ctx) {
	var tr, th, t1, td, t2_value = ctx.addon.stat.license + "", t2;

	return {
		c() {
			tr = element("tr");
			th = element("th");
			th.textContent = "License";
			t1 = space();
			td = element("td");
			t2 = text(t2_value);
			attr(th, "scope", "row");
			attr(th, "class", "svelte-1vx0blb");
		},

		m(target, anchor) {
			insert(target, tr, anchor);
			append(tr, th);
			append(tr, t1);
			append(tr, td);
			append(td, t2);
		},

		p(changed, ctx) {
			if ((changed.addon) && t2_value !== (t2_value = ctx.addon.stat.license + "")) {
				set_data(t2, t2_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(tr);
			}
		}
	};
}

// (258:4) {:else}
function create_else_block$1(ctx) {
	var a, t, a_href_value, a_title_value;

	return {
		c() {
			a = element("a");
			t = text("Homepage / Repository");
			attr(a, "class", "mr-2");
			attr(a, "href", a_href_value = ctx.addon.homepage);
			attr(a, "target", "_blank");
			attr(a, "title", a_title_value = ctx.addon.homepage);
		},

		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p(changed, ctx) {
			if ((changed.addon) && a_href_value !== (a_href_value = ctx.addon.homepage)) {
				attr(a, "href", a_href_value);
			}

			if ((changed.addon) && a_title_value !== (a_title_value = ctx.addon.homepage)) {
				attr(a, "title", a_title_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (243:4) {#if addon.github && addon.stat && addon.stat.s}
function create_if_block_1$1(ctx) {
	var a, span0, i0, t0, t1_value = ctx.addon.stat.s + "", t1, t2, t3, span1, i1, t4, t5_value = ctx.addon.stat.iss + "", t5, t6, a_href_value, a_title_value;

	return {
		c() {
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
			attr(i0, "class", "fas fa-star");
			attr(span0, "class", "mr-2");
			attr(i1, "class", "fas fa-info-circle");
			attr(span1, "class", "mr-2");
			attr(a, "class", "mr-2 noref");
			attr(a, "href", a_href_value = ctx.addon.github);
			attr(a, "target", "_blank");
			attr(a, "title", a_title_value = ctx.addon.github);
		},

		m(target, anchor) {
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
		},

		p(changed, ctx) {
			if ((changed.addon) && t1_value !== (t1_value = ctx.addon.stat.s + "")) {
				set_data(t1, t1_value);
			}

			if ((changed.addon) && t5_value !== (t5_value = ctx.addon.stat.iss + "")) {
				set_data(t5, t5_value);
			}

			if ((changed.addon) && a_href_value !== (a_href_value = ctx.addon.github)) {
				attr(a, "href", a_href_value);
			}

			if ((changed.addon) && a_title_value !== (a_title_value = ctx.addon.github)) {
				attr(a, "title", a_title_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (267:4) {#if addon.stat}
function create_if_block$1(ctx) {
	var span, i, t0, t1_value = ctx.addon.stat.d + "", t1, t2, t3, ui_star_rating, ui_star_rating_title_value, ui_star_rating_disabled_value, dispose;

	return {
		c() {
			span = element("span");
			i = element("i");
			t0 = space();
			t1 = text(t1_value);
			t2 = text(" Downloads");
			t3 = space();
			ui_star_rating = element("ui-star-rating");
			attr(i, "class", "fas fa-download");
			attr(span, "class", "mr-2");
			set_custom_element_data(ui_star_rating, "class", "ml-auto");
			set_custom_element_data(ui_star_rating, "title", ui_star_rating_title_value = ctx.loggedin ? 'Rate this Addon' : 'You need to login to rate');
			set_custom_element_data(ui_star_rating, "value", ctx.item_rating);
			set_custom_element_data(ui_star_rating, "disabled", ui_star_rating_disabled_value = !ctx.loggedin);
			set_custom_element_data(ui_star_rating, "highlight", ctx.user_item_rating);

			dispose = [
				listen(ui_star_rating, "rate", ctx.submit_rate),
				listen(ui_star_rating, "invalid", ctx.invalid_handler)
			];
		},

		m(target, anchor) {
			insert(target, span, anchor);
			append(span, i);
			append(span, t0);
			append(span, t1);
			append(span, t2);
			insert(target, t3, anchor);
			insert(target, ui_star_rating, anchor);
		},

		p(changed, ctx) {
			if ((changed.addon) && t1_value !== (t1_value = ctx.addon.stat.d + "")) {
				set_data(t1, t1_value);
			}

			if ((changed.loggedin) && ui_star_rating_title_value !== (ui_star_rating_title_value = ctx.loggedin ? 'Rate this Addon' : 'You need to login to rate')) {
				set_custom_element_data(ui_star_rating, "title", ui_star_rating_title_value);
			}

			if (changed.item_rating) {
				set_custom_element_data(ui_star_rating, "value", ctx.item_rating);
			}

			if ((changed.loggedin) && ui_star_rating_disabled_value !== (ui_star_rating_disabled_value = !ctx.loggedin)) {
				set_custom_element_data(ui_star_rating, "disabled", ui_star_rating_disabled_value);
			}

			if (changed.user_item_rating) {
				set_custom_element_data(ui_star_rating, "highlight", ctx.user_item_rating);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(span);
				detach(t3);
				detach(ui_star_rating);
			}

			run_all(dispose);
		}
	};
}

function create_fragment$1(ctx) {
	var article, ui_tooltip, t0, t1, header, span, t2_value = ctx.addon.title + "", t2, t3, small, t4_value = ctx.addon.version + "", t4, t5, header_title_value, t6, section0, t7, section1, current_block_type_index, if_block2, t8, footer, t9, article_id_value, article_class_value, current, dispose;

	var if_block0 = (ctx.addon.authors) && create_if_block_11$1(ctx);

	function select_block_type(changed, ctx) {
		if (ctx.logo_url) return create_if_block_9$1;
		return create_else_block_2$1;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block1 = current_block_type(ctx);

	var if_block_creators = [
		create_if_block_2$1,
		create_if_block_3$1,
		create_else_block_1$1
	];

	var if_blocks = [];

	function select_block_type_1(changed, ctx) {
		if (ctx.mode == 'permissions') return 0;
		if (ctx.standalone !== false) return 1;
		return 2;
	}

	current_block_type_index = select_block_type_1(null, ctx);
	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	function select_block_type_2(changed, ctx) {
		if (ctx.addon.github && ctx.addon.stat && ctx.addon.stat.s) return create_if_block_1$1;
		return create_else_block$1;
	}

	var current_block_type_1 = select_block_type_2(null, ctx);
	var if_block3 = current_block_type_1(ctx);

	var if_block4 = (ctx.addon.stat) && create_if_block$1(ctx);

	return {
		c() {
			article = element("article");
			ui_tooltip = element("ui-tooltip");
			t0 = text(ctx.error_message);
			t1 = space();
			header = element("header");
			span = element("span");
			t2 = text(t2_value);
			t3 = space();
			small = element("small");
			t4 = text(t4_value);
			t5 = space();
			if (if_block0) if_block0.c();
			t6 = space();
			section0 = element("section");
			if_block1.c();
			t7 = space();
			section1 = element("section");
			if_block2.c();
			t8 = space();
			footer = element("footer");
			if_block3.c();
			t9 = space();
			if (if_block4) if_block4.c();
			set_custom_element_data(ui_tooltip, "nobutton", "");
			attr(small, "class", "ml-2");
			attr(header, "title", header_title_value = ctx.addon.id);
			attr(section0, "class", "logo");
			attr(section1, "class", "description");
			attr(article, "id", article_id_value = ctx.addon.id);
			attr(article, "class", article_class_value = "addon mb-3 " + ctx.addon.status.code);
			dispose = listen(article, "click", ctx.click_handler_2);
		},

		m(target, anchor) {
			insert(target, article, anchor);
			append(article, ui_tooltip);
			append(ui_tooltip, t0);
			ctx.ui_tooltip_binding(ui_tooltip);
			append(article, t1);
			append(article, header);
			append(header, span);
			append(span, t2);
			append(header, t3);
			append(header, small);
			append(small, t4);
			append(header, t5);
			if (if_block0) if_block0.m(header, null);
			append(article, t6);
			append(article, section0);
			if_block1.m(section0, null);
			append(article, t7);
			append(article, section1);
			if_blocks[current_block_type_index].m(section1, null);
			append(article, t8);
			append(article, footer);
			if_block3.m(footer, null);
			append(footer, t9);
			if (if_block4) if_block4.m(footer, null);
			current = true;
		},

		p(changed, ctx) {
			if (!current || changed.error_message) {
				set_data(t0, ctx.error_message);
			}

			if ((!current || changed.addon) && t2_value !== (t2_value = ctx.addon.title + "")) {
				set_data(t2, t2_value);
			}

			if ((!current || changed.addon) && t4_value !== (t4_value = ctx.addon.version + "")) {
				set_data(t4, t4_value);
			}

			if (ctx.addon.authors) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_11$1(ctx);
					if_block0.c();
					if_block0.m(header, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if ((!current || changed.addon) && header_title_value !== (header_title_value = ctx.addon.id)) {
				attr(header, "title", header_title_value);
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block1) {
				if_block1.p(changed, ctx);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);
				if (if_block1) {
					if_block1.c();
					if_block1.m(section0, null);
				}
			}

			var previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_1(changed, ctx);
			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(changed, ctx);
			} else {
				group_outros();
				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});
				check_outros();

				if_block2 = if_blocks[current_block_type_index];
				if (!if_block2) {
					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block2.c();
				}
				transition_in(if_block2, 1);
				if_block2.m(section1, null);
			}

			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(changed, ctx)) && if_block3) {
				if_block3.p(changed, ctx);
			} else {
				if_block3.d(1);
				if_block3 = current_block_type_1(ctx);
				if (if_block3) {
					if_block3.c();
					if_block3.m(footer, t9);
				}
			}

			if (ctx.addon.stat) {
				if (if_block4) {
					if_block4.p(changed, ctx);
				} else {
					if_block4 = create_if_block$1(ctx);
					if_block4.c();
					if_block4.m(footer, null);
				}
			} else if (if_block4) {
				if_block4.d(1);
				if_block4 = null;
			}

			if ((!current || changed.addon) && article_id_value !== (article_id_value = ctx.addon.id)) {
				attr(article, "id", article_id_value);
			}

			if ((!current || changed.addon) && article_class_value !== (article_class_value = "addon mb-3 " + ctx.addon.status.code)) {
				attr(article, "class", article_class_value);
			}
		},

		i(local) {
			if (current) return;
			transition_in(if_block2);
			current = true;
		},

		o(local) {
			transition_out(if_block2);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(article);
			}

			ctx.ui_tooltip_binding(null);
			if (if_block0) if_block0.d();
			if_block1.d();
			if_blocks[current_block_type_index].d();
			if_block3.d();
			if (if_block4) if_block4.d();
			dispose();
		}
	};
}

function maintenance_code_str(code) {
  switch (code) {
    case "AVAILABLE":
      return "Maintained &amp; Available";
    case "UNMAINTAINED":
      return "<span class='text-danger'>Unmaintained</span>";
    case "REPLACED":
      return "<span class='text-danger'>Replaced</span> by another Addon!";
    case "REMOVED":
      return "<span class='text-danger'>Removed</span>";
    default:
      return code;
  }
}

function instance$1($$self, $$props, $$invalidate) {
	
  const dispatch = createEventDispatcher();

  let { addondb, addon = { status: {} }, UserAwareComponent, standalone = false } = $$props;

  let error_message;
  let popup;

  let mode = "";
  let user_item_rating = 0;
  let item_rating = 0;
  let loggedin = false;
  let logo_url;
  let suggest_logo_url;
  let actionqueue = null;
  let onDestroyProxy;
  onDestroy(() => {
    if (onDestroyProxy) onDestroyProxy();
  });

  async function start() {
    const addon_id =
      new URL(window.location).searchParams.get("id") || addon.id;
    $$invalidate('addon', addon = addondb.db_by_id[addon_id]);
    addondb
      .from_cache_or_fetch(
        addon_id + ".json",
        `https://raw.githubusercontent.com/openhab-nodes/addons-registry/master/${addon_id}.json`
      )
      .then(v => {
        $$invalidate('addon', addon.reviewed_by = v.reviewed_by, addon);
        $$invalidate('addon', addon.archs = v.archs, addon);
        $$invalidate('addon', addon.size = v.size, addon);
        $$invalidate('addon', addon.memory_min = v.memory_min, addon);
        $$invalidate('addon', addon.memory_max = v.memory_max, addon);
        $$invalidate('addon', addon.ports = [], addon);
        $$invalidate('addon', addon.firewall_allow = [], addon);
        $$invalidate('addon', addon.permissions = [], addon);
        // Go through services and collect ports, firewall_allowed, permissions
        for (let { service_id, service } in v.services) {
          if (service.ports) $$invalidate('addon', addon.ports = addon.ports.concat(service.ports), addon);
          if (service.firewall_allow)
            $$invalidate('addon', addon.firewall_allow = addon.firewall_allow.concat(
              service.firewall_allow
            ), addon);
          if (service.permissions)
            $$invalidate('addon', addon.permissions = addon.permissions.concat(service.permissions), addon);
        }
      });

    if (!onDestroyProxy) {
      onDestroyProxy = UserAwareComponent(
        user_ => {
          $$invalidate('loggedin', loggedin = user_ && user_.uid);
        },
        data_ => {
          $$invalidate('user_item_rating', user_item_rating =
            data_ && data_.ratings && data_.ratings[addon.id]
              ? data_.ratings[addon.id]
              : 0);
        },
        aq_ => (actionqueue = aq_)
      );
    }
    $$invalidate('item_rating', item_rating = addon.stat ? addon.stat.p / addon.stat.v : 0.0);
    $$invalidate('logo_url', logo_url = addon.logo_url);
    if (!logo_url && addon.github)
      $$invalidate('logo_url', logo_url =
        addon.github.replace(
          "https://github.com/",
          "https://raw.githubusercontent.com/"
        ) + "/master/logo.png");
    $$invalidate('suggest_logo_url', suggest_logo_url = addon.homepage ? addon.homepage : addon.github);
  }
  /// End -- User Aware Component

  function submit_rate(e) {
    e.stopPropagation();
    const target = e.target;
    target.disabled = true;
    dispatch("rate", {
      addonid: addon.id,
      rate: e.detail.rate,
      last_rating: user_item_rating,
      confirm: () => (target.disabled = false),
      error: err => {
        target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
        popup.click();
      }
    });
  }

  function not_logged_in() {
    $$invalidate('error_message', error_message = "Not logged in!");
    popup.click();
  }

	function install_handler(event) {
		bubble($$self, event);
	}

	function ui_tooltip_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('popup', popup = $$value);
		});
	}

	const error_handler = (e) => ($$invalidate('logo_url', logo_url = null));

	const click_handler = (e) => ($$invalidate('mode', mode = ''));

	const click_handler_1 = (e) => ($$invalidate('mode', mode = 'permissions'));

	const invalid_handler = (e) => not_logged_in();

	const click_handler_2 = (e) => dispatch('click', { id: addon.id });

	$$self.$set = $$props => {
		if ('addondb' in $$props) $$invalidate('addondb', addondb = $$props.addondb);
		if ('addon' in $$props) $$invalidate('addon', addon = $$props.addon);
		if ('UserAwareComponent' in $$props) $$invalidate('UserAwareComponent', UserAwareComponent = $$props.UserAwareComponent);
		if ('standalone' in $$props) $$invalidate('standalone', standalone = $$props.standalone);
	};

	return {
		dispatch,
		addondb,
		addon,
		UserAwareComponent,
		standalone,
		error_message,
		popup,
		mode,
		user_item_rating,
		item_rating,
		loggedin,
		logo_url,
		suggest_logo_url,
		start,
		submit_rate,
		not_logged_in,
		install_handler,
		ui_tooltip_binding,
		error_handler,
		click_handler,
		click_handler_1,
		invalid_handler,
		click_handler_2
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1vx0blb-style")) add_css();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["addondb", "addon", "UserAwareComponent", "standalone", "start"]);
	}

	get start() {
		return this.$$.ctx.start;
	}
}

window.customElements.define('ui-addon', class extends HTMLElement {
    constructor() {
        super();
        this.unreg=[];
    }
    connectedCallback() {
        this._ok = true;
        this.check();
    }
    async check() {
        if (this.cmp) return;
        const standalone = this.hasAttribute("standalone");
        if (this._ok && this._addondb && (standalone||this._addon) && this._userawarecomponent) {
            this.cmp = new Cmp({
                target: this, props: {
                    UserAwareComponent: this._userawarecomponent,
                    addondb: this._addondb,
                    addon: this._addon,
                    standalone
                }
            });
            this.cmp.start();
            this.unreg.push(this.cmp.$on("install",e=>this.dispatchEvent(e)));
            this.unreg.push(this.cmp.$on("rate",e=>this.dispatchEvent(e)));
        }
    }
    set userawarecomponent(val) {
        this._userawarecomponent = val;
        this.check();
    }
    set addondb(val) {
        this._addondb = val;
        this.check();
    }
    set addon(val) {
        this._addon = val;
        this.check();
    }
    disconnectedCallback() {
        for (let a of this.unreg) a();
        this.unreg=[];
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-addon.js.map
