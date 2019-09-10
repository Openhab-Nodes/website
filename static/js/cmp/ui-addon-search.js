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
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
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
function children(element) {
    return Array.from(element.childNodes);
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

/* assets/js/ui-addon-search/cmp.svelte generated by Svelte v3.12.0 */

function create_fragment(ctx) {
	var form, div0, input0, t0, button, t1, div4, div1, input1, t2, label0, t4, div2, input2, t5, label1, t7, div3, input3, t8, label2, dispose;

	return {
		c() {
			form = element("form");
			div0 = element("div");
			input0 = element("input");
			t0 = space();
			button = element("button");
			t1 = space();
			div4 = element("div");
			div1 = element("div");
			input1 = element("input");
			t2 = space();
			label0 = element("label");
			label0.textContent = "Bindings";
			t4 = space();
			div2 = element("div");
			input2 = element("input");
			t5 = space();
			label1 = element("label");
			label1.textContent = "IO Services";
			t7 = space();
			div3 = element("div");
			input3 = element("input");
			t8 = space();
			label2 = element("label");
			label2.textContent = "Rule Templates";
			attr(input0, "class", "form-control");
			input0.autofocus = "true";
			input0.required = true;
			attr(input0, "type", "search");
			attr(button, "class", "close-icon");
			attr(button, "type", "reset");
			attr(div0, "class", "form-group search-group");
			attr(input1, "type", "checkbox");
			attr(input1, "class", "custom-control-input");
			attr(input1, "name", "binding");
			attr(input1, "id", "chkBindings");
			attr(label0, "class", "custom-control-label");
			attr(label0, "for", "chkBindings");
			attr(div1, "class", "custom-control custom-checkbox");
			attr(input2, "type", "checkbox");
			attr(input2, "class", "custom-control-input");
			attr(input2, "name", "ioservice");
			attr(input2, "id", "chkIOServices");
			attr(label1, "class", "custom-control-label");
			attr(label1, "for", "chkIOServices");
			attr(div2, "class", "custom-control custom-checkbox");
			attr(input3, "type", "checkbox");
			attr(input3, "class", "custom-control-input");
			attr(input3, "name", "ruletemplate");
			attr(input3, "id", "chkRuleTemplates");
			attr(label2, "class", "custom-control-label");
			attr(label2, "for", "chkRuleTemplates");
			attr(div3, "class", "custom-control custom-checkbox");
			attr(div4, "class", "form-group d-flex justify-content-around");
			attr(form, "id", "addonsearchform");
			attr(form, "action", "#");
			attr(form, "onsubmit", "event.preventDefault();return false;");

			dispose = [
				listen(input0, "input", ctx.input_handler),
				listen(input1, "change", ctx.input1_change_handler),
				listen(input2, "change", ctx.input2_change_handler),
				listen(input3, "change", ctx.input3_change_handler),
				listen(form, "reset", stop_propagation(prevent_default(ctx.reset_handler)))
			];
		},

		m(target_1, anchor) {
			insert(target_1, form, anchor);
			append(form, div0);
			append(div0, input0);
			ctx.input0_binding(input0);
			append(div0, t0);
			append(div0, button);
			append(form, t1);
			append(form, div4);
			append(div4, div1);
			append(div1, input1);

			input1.checked = ctx.filters.binding;

			append(div1, t2);
			append(div1, label0);
			append(div4, t4);
			append(div4, div2);
			append(div2, input2);

			input2.checked = ctx.filters.ioservice;

			append(div2, t5);
			append(div2, label1);
			append(div4, t7);
			append(div4, div3);
			append(div3, input3);

			input3.checked = ctx.filters.ruletemplate;

			append(div3, t8);
			append(div3, label2);
		},

		p(changed, ctx) {
			if (changed.filters) input1.checked = ctx.filters.binding;
			if (changed.filters) input2.checked = ctx.filters.ioservice;
			if (changed.filters) input3.checked = ctx.filters.ruletemplate;
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(form);
			}

			ctx.input0_binding(null);
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let target;
  let textInput;
  let filters = {
    binding: true,
    ioservice: true,
    ruletemplate: true
  };

  function updateFilters(f) {
    $$invalidate('target', target.filters = f, target);
    console.log("SET FILTERS in updateFilters");
    updatePlaceholder(target.count);
  }

  function updatePlaceholder(c) {
    $$invalidate('textInput', textInput.placeholder = `Search ${c} entries`, textInput);
  }

  function input(val) {
    $$invalidate('target', target.searchstring = val, target);
  }

  function reset() {
    input("");
    $$invalidate('textInput', textInput.value = "", textInput);
  }

  function start(target_) {
    if (!target_) {
      throw new Error("Target not set!");
    }
    $$invalidate('target', target = target_);
    target.addEventListener("ready", (e) => updatePlaceholder(e.detail.count), { once: true });
  }

	function input0_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('textInput', textInput = $$value);
		});
	}

	const input_handler = (e) => input(e.target.value);

	function input1_change_handler() {
		filters.binding = this.checked;
		$$invalidate('filters', filters);
	}

	function input2_change_handler() {
		filters.ioservice = this.checked;
		$$invalidate('filters', filters);
	}

	function input3_change_handler() {
		filters.ruletemplate = this.checked;
		$$invalidate('filters', filters);
	}

	const reset_handler = (e) => reset();

	$$self.$$.update = ($$dirty = { target: 1, filters: 1 }) => {
		if ($$dirty.target || $$dirty.filters) { if (target) updateFilters(filters); }
	};

	return {
		textInput,
		filters,
		input,
		reset,
		start,
		input0_binding,
		input_handler,
		input1_change_handler,
		input2_change_handler,
		input3_change_handler,
		reset_handler
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["start"]);
	}

	get start() {
		return this.$$.ctx.start;
	}
}

window.customElements.define('ui-addon-search', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({ target: this, props: {} });
        window.requestAnimationFrame(()=>this.cmp.start(document.getElementById(this.getAttribute("target"))));
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-addon-search.js.map
