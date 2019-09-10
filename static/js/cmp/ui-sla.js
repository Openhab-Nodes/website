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
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}

let current_component;
function set_current_component(component) {
    current_component = component;
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
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
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

/* assets/js/ui-sla/cmp.svelte generated by Svelte v3.12.0 */

function create_fragment(ctx) {
	var p0, t1, p1, t2, t3, b0, t4, t5, t6, b1, t7, t8, t9, t10, p2, t13, p3;

	return {
		c() {
			p0 = element("p");
			p0.innerHTML = `<q>
			    A service-level agreement (SLA) is a commitment between a service provider
			    and a client. Particular aspects of the service – quality, availability,
			    responsibilities – are agreed between the service provider and the service
			    user.
			  </q>`;
			t1 = space();
			p1 = element("p");
			t2 = text(ctx.sla_str);
			t3 = text("% means:\n  ");
			b0 = element("b");
			t4 = text(ctx.hours);
			t5 = text("h a day");
			t6 = text("\n  or\n  ");
			b1 = element("b");
			t7 = text(ctx.days);
			t8 = text(" days every 31 days");
			t9 = text("\n  .");
			t10 = space();
			p2 = element("p");
			p2.innerHTML = `
			  The Software-only SLA is limited to:
			  <br>
			  Cloud Connectors, Rule Engine, IAM-Service, Operating Sytem, Hue Emulation +
			  API Access. Your own services will be limited to 1/4 of the available memory
			  and 20% CPU-time in SLA mode.
			`;
			t13 = space();
			p3 = element("p");
			p3.textContent = "Manipulating the supervisior will free the service provider from any SLA\n  obligations with immediate effect.";
		},

		m(target, anchor) {
			insert(target, p0, anchor);
			insert(target, t1, anchor);
			insert(target, p1, anchor);
			append(p1, t2);
			append(p1, t3);
			append(p1, b0);
			append(b0, t4);
			append(b0, t5);
			append(p1, t6);
			append(p1, b1);
			append(b1, t7);
			append(b1, t8);
			append(p1, t9);
			insert(target, t10, anchor);
			insert(target, p2, anchor);
			insert(target, t13, anchor);
			insert(target, p3, anchor);
		},

		p(changed, ctx) {
			if (changed.sla_str) {
				set_data(t2, ctx.sla_str);
			}

			if (changed.hours) {
				set_data(t4, ctx.hours);
			}

			if (changed.days) {
				set_data(t7, ctx.days);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(p0);
				detach(t1);
				detach(p1);
				detach(t10);
				detach(p2);
				detach(t13);
				detach(p3);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { sla = 0, range = 100 } = $$props;

	$$self.$set = $$props => {
		if ('sla' in $$props) $$invalidate('sla', sla = $$props.sla);
		if ('range' in $$props) $$invalidate('range', range = $$props.range);
	};

	let hours, days, sla_str;

	$$self.$$.update = ($$dirty = { sla: 1 }) => {
		if ($$dirty.sla) { $$invalidate('hours', hours = ((sla * 24) / 100.0).toFixed(2)); }
		if ($$dirty.sla) { $$invalidate('days', days = ((sla * 31) / 100.0).toFixed(2)); }
		if ($$dirty.sla) { $$invalidate('sla_str', sla_str = parseFloat(sla).toFixed(2)); }
	};

	return { sla, range, hours, days, sla_str };
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["sla", "range"]);
	}

	get sla() {
		return this.$$.ctx.sla;
	}

	set sla(sla) {
		this.$set({ sla });
		flush();
	}

	get range() {
		return this.$$.ctx.range;
	}

	set range(range) {
		this.$set({ range });
		flush();
	}
}

window.customElements.define('ui-sla', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: {
                sla: this.hasAttribute("value") ? this.getAttribute("value") : 0,
                range: this.hasAttribute("range") ?this.getAttribute("range"):0
        } });
    }

    static get observedAttributes() {
        return ['value', 'range'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "value": { this.value = newValue; break; }
            case "range": { this.range = newValue; break; }
        }
    }

    set value(v) {
        if (!this.cmp) return;
        this.cmp.sla = parseFloat(v);
    }

    set range(v) {
        this.cmp.range = parseFloat(v);
    }

    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-sla.js.map
