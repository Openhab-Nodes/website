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
function to_number(value) {
    return value === '' ? undefined : +value;
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_input_value(input, value) {
    if (value != null || input.value) {
        input.value = value;
    }
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function select_option(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
}
function select_value(select) {
    const selected_option = select.querySelector(':checked') || select.options[0];
    return selected_option && selected_option.__value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
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
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
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

function bind(component, name, callback) {
    if (component.$$.props.indexOf(name) === -1)
        return;
    component.$$.bound[name] = callback;
    callback(component.$$.ctx[name]);
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

/* assets/js/ui-subscription/currency.svelte generated by Svelte v3.12.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.title = list[i];
	return child_ctx;
}

// (42:2) {#each Object.keys(currencies) as title}
function create_each_block(ctx) {
	var option, t_value = ctx.title + "", t, option_value_value, option_selected_value;

	return {
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = ctx.title;
			option.value = option.__value;
			option.selected = option_selected_value = ctx.currency == ctx.title;
		},

		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},

		p(changed, ctx) {
			if ((changed.currencies) && t_value !== (t_value = ctx.title + "")) {
				set_data(t, t_value);
			}

			if ((changed.currencies) && option_value_value !== (option_value_value = ctx.title)) {
				option.__value = option_value_value;
			}

			option.value = option.__value;

			if ((changed.currency || changed.currencies) && option_selected_value !== (option_selected_value = ctx.currency == ctx.title)) {
				option.selected = option_selected_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(option);
			}
		}
	};
}

function create_fragment(ctx) {
	var output_1, t0, output_1_title_value, t1, select, select_title_value, dispose;

	let each_value = Object.keys(ctx.currencies);

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			output_1 = element("output");
			t0 = text(ctx.result);
			t1 = space();
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(output_1, "title", output_1_title_value = "Cached from " + ctx.cache_date);
			if (ctx.currency === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
			attr(select, "title", select_title_value = "Cached from " + ctx.cache_date);
			attr(select, "class", "custom-select custom-select-sm");
			set_style(select, "width", "100px");

			dispose = [
				listen(select, "change", ctx.select_change_handler),
				listen(select, "change", ctx.change_handler)
			];
		},

		m(target, anchor) {
			insert(target, output_1, anchor);
			append(output_1, t0);
			insert(target, t1, anchor);
			insert(target, select, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select, null);
			}

			select_option(select, ctx.currency);
		},

		p(changed, ctx) {
			if (changed.result) {
				set_data(t0, ctx.result);
			}

			if ((changed.cache_date) && output_1_title_value !== (output_1_title_value = "Cached from " + ctx.cache_date)) {
				attr(output_1, "title", output_1_title_value);
			}

			if (changed.currencies || changed.currency) {
				each_value = Object.keys(ctx.currencies);

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (changed.currency) select_option(select, ctx.currency);

			if ((changed.cache_date) && select_title_value !== (select_title_value = "Cached from " + ctx.cache_date)) {
				attr(select, "title", select_title_value);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(output_1);
				detach(t1);
				detach(select);
			}

			destroy_each(each_blocks, detaching);

			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { value = 0, currency = "€" } = $$props;
  let currencies = { "€": 1.0 };
  let cache_date = null;
  const dispatch = createEventDispatcher();

  async function fetchRates() {
    let rates = localStorage.getItem("currency_rates");
    if (rates) rates = JSON.parse(rates);
    // Older than a day
    if (!rates || Date.parse(rates.date) < Date.now() - 3600 * 24 * 1000) {
      console.log("Fetch currency rates");
      rates = await (await fetch(
        "https://api.exchangeratesapi.io/latest"
      )).json();
      rates.rates["€"] = 1.0;
      localStorage.setItem("currency_rates", JSON.stringify(rates));
    }
    $$invalidate('cache_date', cache_date = rates.date);
    rates.rates["€"] = 1.0;
    delete rates.rates.EUR;
    $$invalidate('currencies', currencies = rates.rates);
  }

  fetchRates();

	function select_change_handler() {
		currency = select_value(this);
		$$invalidate('currency', currency);
		$$invalidate('currencies', currencies);
	}

	const change_handler = (e) => dispatch('currency', currency);

	$$self.$set = $$props => {
		if ('value' in $$props) $$invalidate('value', value = $$props.value);
		if ('currency' in $$props) $$invalidate('currency', currency = $$props.currency);
	};

	let result;

	$$self.$$.update = ($$dirty = { currencies: 1, currency: 1, value: 1 }) => {
		if ($$dirty.currencies || $$dirty.currency || $$dirty.value) { $$invalidate('result', result = (currencies[currency] * value).toFixed(2)); }
		if ($$dirty.currencies || $$dirty.currency || $$dirty.value) { dispatch('output', currencies[currency] * value); }
	};

	return {
		value,
		currency,
		currencies,
		cache_date,
		dispatch,
		result,
		select_change_handler,
		change_handler
	};
}

class Currency extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["value", "currency"]);
	}
}

/* assets/js/ui-subscription/iban.svelte generated by Svelte v3.12.0 */

function create_fragment$1(ctx) {
	var samp, table, tr0, t3, tr1, t7, tr2, t11, tr3, td6, t13, td7, t14, t15, tr4, td8, t17, td9, updating_currency, current;

	function currencyconverter_currency_binding(value_1) {
		ctx.currencyconverter_currency_binding.call(null, value_1);
		updating_currency = true;
		add_flush_callback(() => updating_currency = false);
	}

	let currencyconverter_props = { value: ctx.value };
	if (ctx.currency !== void 0) {
		currencyconverter_props.currency = ctx.currency;
	}
	var currencyconverter = new Currency({ props: currencyconverter_props });

	binding_callbacks.push(() => bind(currencyconverter, 'currency', currencyconverter_currency_binding));
	currencyconverter.$on("output", ctx.output_handler);

	return {
		c() {
			samp = element("samp");
			table = element("table");
			tr0 = element("tr");
			tr0.innerHTML = `<td>Account Holder: </td> <td>David Graeff</td>`;
			t3 = space();
			tr1 = element("tr");
			tr1.innerHTML = `<td>IBAN:</td> <td>DE78 2004 1155 0841 2900 00</td>`;
			t7 = space();
			tr2 = element("tr");
			tr2.innerHTML = `<td>BIC:</td> <td>COBADEHD055</td>`;
			t11 = space();
			tr3 = element("tr");
			td6 = element("td");
			td6.textContent = "Reference Code:";
			t13 = space();
			td7 = element("td");
			t14 = text(ctx.refcode);
			t15 = space();
			tr4 = element("tr");
			td8 = element("td");
			td8.textContent = "Amount:";
			t17 = space();
			td9 = element("td");
			currencyconverter.$$.fragment.c();
			attr(samp, "class", "card p-3 mb-4");
		},

		m(target, anchor) {
			insert(target, samp, anchor);
			append(samp, table);
			append(table, tr0);
			append(table, t3);
			append(table, tr1);
			append(table, t7);
			append(table, tr2);
			append(table, t11);
			append(table, tr3);
			append(tr3, td6);
			append(tr3, t13);
			append(tr3, td7);
			append(td7, t14);
			append(table, t15);
			append(table, tr4);
			append(tr4, td8);
			append(tr4, t17);
			append(tr4, td9);
			mount_component(currencyconverter, td9, null);
			current = true;
		},

		p(changed, ctx) {
			if (!current || changed.refcode) {
				set_data(t14, ctx.refcode);
			}

			var currencyconverter_changes = {};
			if (changed.value) currencyconverter_changes.value = ctx.value;
			if (!updating_currency && changed.currency) {
				currencyconverter_changes.currency = ctx.currency;
			}
			currencyconverter.$set(currencyconverter_changes);
		},

		i(local) {
			if (current) return;
			transition_in(currencyconverter.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(currencyconverter.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(samp);
			}

			destroy_component(currencyconverter);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
  let { value = 0, currency = "€", refcode } = $$props;

	function currencyconverter_currency_binding(value_1) {
		currency = value_1;
		$$invalidate('currency', currency);
	}

	const output_handler = (e) => dispatch('output', e.detail);

	$$self.$set = $$props => {
		if ('value' in $$props) $$invalidate('value', value = $$props.value);
		if ('currency' in $$props) $$invalidate('currency', currency = $$props.currency);
		if ('refcode' in $$props) $$invalidate('refcode', refcode = $$props.refcode);
	};

	return {
		dispatch,
		value,
		currency,
		refcode,
		currencyconverter_currency_binding,
		output_handler
	};
}

class Iban extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["value", "currency", "refcode"]);
	}
}

function refcode(user, start_date) {
    return `OHX-${user.email.replace("@", "/")}-${Math.floor(
        start_date.getFullYear() / 100
      )}${("" + start_date.getMonth()).padStart(2, "0")}`;
}

/* assets/js/ui-subscription/invoices.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function get_each_context$1(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.bill = list[i];
	return child_ctx;
}

// (108:4) {#if user && user.is_admin}
function create_if_block_2(ctx) {
	var t, a, dispose;

	return {
		c() {
			t = text("|\n      ");
			a = element("a");
			a.textContent = "Add Demo Invoice";
			attr(a, "href", "#top");
			dispose = listen(a, "click", ctx.demoadd);
		},

		m(target, anchor) {
			insert(target, t, anchor);
			insert(target, a, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(t);
				detach(a);
			}

			dispose();
		}
	};
}

// (115:0) {#if last_pm}
function create_if_block_1(ctx) {
	var p, t_1, current;

	var iban = new Iban({
		props: {
		value: ctx.last_pm.amount_euro,
		currency: "€",
		refcode: refcode(ctx.user, new ctx.Date(ctx.last_pm.start))
	}
	});

	return {
		c() {
			p = element("p");
			p.textContent = "Your last invoice balance is negative. The IBAN details are printed below.";
			t_1 = space();
			iban.$$.fragment.c();
		},

		m(target, anchor) {
			insert(target, p, anchor);
			insert(target, t_1, anchor);
			mount_component(iban, target, anchor);
			current = true;
		},

		p(changed, ctx) {
			var iban_changes = {};
			if (changed.last_pm) iban_changes.value = ctx.last_pm.amount_euro;
			if (changed.user || changed.last_pm) iban_changes.refcode = refcode(ctx.user, new ctx.Date(ctx.last_pm.start));
			iban.$set(iban_changes);
		},

		i(local) {
			if (current) return;
			transition_in(iban.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(iban.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(p);
				detach(t_1);
			}

			destroy_component(iban, detaching);
		}
	};
}

// (155:4) {:else}
function create_else_block(ctx) {
	var tr;

	return {
		c() {
			tr = element("tr");
			tr.innerHTML = `<td colspan="6">No entry</td> `;
		},

		m(target, anchor) {
			insert(target, tr, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(tr);
			}
		}
	};
}

// (149:10) {#if bill.status_date}
function create_if_block(ctx) {
	var t_value = new ctx.Date(parseInt(ctx.bill.status_date)).toLocaleString() + "", t;

	return {
		c() {
			t = text(t_value);
		},

		m(target, anchor) {
			insert(target, t, anchor);
		},

		p(changed, ctx) {
			if ((changed.invoices) && t_value !== (t_value = new ctx.Date(parseInt(ctx.bill.status_date)).toLocaleString() + "")) {
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

// (132:4) {#each invoices as bill}
function create_each_block$1(ctx) {
	var tr, td0, a, t0, t1_value = ctx.bill.id + "", t1, t2, td1, t3_value = ctx.bill.type + "", t3, t4, td2, t5_value = new ctx.Date(parseInt(ctx.bill.start)).toLocaleString() + "", t5, t6, t7_value = new ctx.Date(parseInt(ctx.bill.end)).toLocaleString() + "", t7, t8, td3, t9_value = ctx.bill.payment_method + "", t9, t10, t11_value = ctx.bill.payment_lastdigits + "", t11, t12, td4, t13_value = bill_status_text(ctx.bill.status) + "", t13, t14, t15, td5, t16_value = ctx.bill.amount_euro + "", t16, t17, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	var if_block = (ctx.bill.status_date) && create_if_block(ctx);

	return {
		c() {
			tr = element("tr");
			td0 = element("td");
			a = element("a");
			t0 = text("#");
			t1 = text(t1_value);
			t2 = space();
			td1 = element("td");
			t3 = text(t3_value);
			t4 = space();
			td2 = element("td");
			t5 = text(t5_value);
			t6 = text(" - ");
			t7 = text(t7_value);
			t8 = space();
			td3 = element("td");
			t9 = text(t9_value);
			t10 = text(" …");
			t11 = text(t11_value);
			t12 = space();
			td4 = element("td");
			t13 = text(t13_value);
			t14 = space();
			if (if_block) if_block.c();
			t15 = space();
			td5 = element("td");
			t16 = text(t16_value);
			t17 = space();
			attr(a, "href", "#top");
			attr(a, "title", "Download Invoice");
			toggle_class(td4, "text-danger", ctx.bill.status=="PENDING");
			dispose = listen(a, "click", click_handler);
		},

		m(target, anchor) {
			insert(target, tr, anchor);
			append(tr, td0);
			append(td0, a);
			append(a, t0);
			append(a, t1);
			append(tr, t2);
			append(tr, td1);
			append(td1, t3);
			append(tr, t4);
			append(tr, td2);
			append(td2, t5);
			append(td2, t6);
			append(td2, t7);
			append(tr, t8);
			append(tr, td3);
			append(td3, t9);
			append(td3, t10);
			append(td3, t11);
			append(tr, t12);
			append(tr, td4);
			append(td4, t13);
			append(td4, t14);
			if (if_block) if_block.m(td4, null);
			append(tr, t15);
			append(tr, td5);
			append(td5, t16);
			append(tr, t17);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.invoices) && t1_value !== (t1_value = ctx.bill.id + "")) {
				set_data(t1, t1_value);
			}

			if ((changed.invoices) && t3_value !== (t3_value = ctx.bill.type + "")) {
				set_data(t3, t3_value);
			}

			if ((changed.invoices) && t5_value !== (t5_value = new ctx.Date(parseInt(ctx.bill.start)).toLocaleString() + "")) {
				set_data(t5, t5_value);
			}

			if ((changed.invoices) && t7_value !== (t7_value = new ctx.Date(parseInt(ctx.bill.end)).toLocaleString() + "")) {
				set_data(t7, t7_value);
			}

			if ((changed.invoices) && t9_value !== (t9_value = ctx.bill.payment_method + "")) {
				set_data(t9, t9_value);
			}

			if ((changed.invoices) && t11_value !== (t11_value = ctx.bill.payment_lastdigits + "")) {
				set_data(t11, t11_value);
			}

			if ((changed.invoices) && t13_value !== (t13_value = bill_status_text(ctx.bill.status) + "")) {
				set_data(t13, t13_value);
			}

			if (ctx.bill.status_date) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(td4, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (changed.invoices) {
				toggle_class(td4, "text-danger", ctx.bill.status=="PENDING");
			}

			if ((changed.invoices) && t16_value !== (t16_value = ctx.bill.amount_euro + "")) {
				set_data(t16, t16_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(tr);
			}

			if (if_block) if_block.d();
			dispose();
		}
	};
}

function create_fragment$2(ctx) {
	var h4, t0, span, a, t2, t3, t4, table, thead, t16, tbody, current, dispose;

	var if_block0 = (ctx.user && ctx.user.is_admin) && create_if_block_2(ctx);

	var if_block1 = (ctx.last_pm) && create_if_block_1(ctx);

	let each_value = ctx.invoices;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	let each_1_else = null;

	if (!each_value.length) {
		each_1_else = create_else_block();
		each_1_else.c();
	}

	return {
		c() {
			h4 = element("h4");
			t0 = text("Invoice History\n  ");
			span = element("span");
			a = element("a");
			a.textContent = "Refresh";
			t2 = space();
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			table = element("table");
			thead = element("thead");
			thead.innerHTML = `<tr><th>No</th> <th>Type</th> <th>Access Period</th> <th>Payment Method</th> <th>Status</th> <th>Amount</th></tr>`;
			t16 = space();
			tbody = element("tbody");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(a, "href", "#top");
			attr(span, "class", "h6");
			attr(h4, "class", "mt-4");
			attr(table, "class", "table table-hover");
			dispose = listen(a, "click", ctx.refresh_cache);
		},

		m(target, anchor) {
			insert(target, h4, anchor);
			append(h4, t0);
			append(h4, span);
			append(span, a);
			append(span, t2);
			if (if_block0) if_block0.m(span, null);
			insert(target, t3, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, t4, anchor);
			insert(target, table, anchor);
			append(table, thead);
			append(table, t16);
			append(table, tbody);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(tbody, null);
			}

			if (each_1_else) {
				each_1_else.m(tbody, null);
			}

			current = true;
		},

		p(changed, ctx) {
			if (ctx.user && ctx.user.is_admin) {
				if (!if_block0) {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(span, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (ctx.last_pm) {
				if (if_block1) {
					if_block1.p(changed, ctx);
					transition_in(if_block1, 1);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(t4.parentNode, t4);
				}
			} else if (if_block1) {
				group_outros();
				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});
				check_outros();
			}

			if (changed.invoices || changed.Date || changed.bill_status_text) {
				each_value = ctx.invoices;

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(tbody, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (each_value.length) {
				if (each_1_else) {
					each_1_else.d(1);
					each_1_else = null;
				}
			} else if (!each_1_else) {
				each_1_else = create_else_block();
				each_1_else.c();
				each_1_else.m(tbody, null);
			}
		},

		i(local) {
			if (current) return;
			transition_in(if_block1);
			current = true;
		},

		o(local) {
			transition_out(if_block1);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(h4);
			}

			if (if_block0) if_block0.d();

			if (detaching) {
				detach(t3);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(t4);
				detach(table);
			}

			destroy_each(each_blocks, detaching);

			if (each_1_else) each_1_else.d();

			dispose();
		}
	};
}

function bill_status_text(status_code) {
  switch (status_code) {
    case "PENDING":
      return "Waiting for Payment";
    case "RECEIVED":
      return "Received";
    case "SCHEDULED":
      return "Recurring Payment scheduled";
    default:
      return status_code;
  }
}

function instance$2($$self, $$props, $$invalidate) {
	

  let { userdata, user } = $$props;
  let cache_valid_until = null;
  let invoices = [];
  let last_pm = null;
  const dispatch = createEventDispatcher();

  function prepare_download_link(e, bill) {
    if (new URL(e.target.href).hash != "#top") return;
    e.preventDefault();
    const gsReference = storage.refFromURL(
      userdata.BUCKET_BILLING + "/" + user.uid + "/" + bill.id
    );
    gsReference
      .getDownloadURL()
      .then(link => {
        e.target.href = link;
        e.target.click();
      })
      .catch(err => {
        if (err.code == "storage/object-not-found") {
          dispatch("error", `PDF for Invoice #${bill.id} not found!`);
        } else {
          console.warn("Failed to create download link", err);
          dispatch("error", "Failed to create download link " + err.message);
        }
      });
  }

  async function get_invoice_list() {
    let list = localStorage.getItem("invoices");
    if (list) list = JSON.parse(list);
    if (list && list.valid_until > Date.now()) {
      cache_valid_until = list.valid_until;
      $$invalidate('invoices', invoices = Object.values(list.data));
      return;
    }
    await userdata
      .fetch_collection(userdata.COLL_INVOICES)
      .then(() => {
        const list = userdata[userdata.COLL_INVOICES] || [];
        let d = new Date(Date.now());
        d.setDate(d.getDate() + 1);
        localStorage.setItem(
          "invoices",
          JSON.stringify({ data: list, valid_until: d.getTime() })
        );
        $$invalidate('invoices', invoices = Object.values(list));
      })
      .catch(err => {
        dispatch("error", `Failed to refresh invoice list: ${err.message}`);
      });
    const pm = invoices.length ? invoices[invoices.length - 1] : null;
    if (pm && pm.payment_method == "IBAN" && pm.status == "PENDING") $$invalidate('last_pm', last_pm = pm);
  }

  function refresh_cache() {
    cache_valid_until = null;
    localStorage.removeItem("invoices");
    get_invoice_list();
  }

  function demoadd(e) {
    e.preventDefault();
    invoices.push({
      id: "12",
      type: "cloud",
      start: Date.now(),
      end: Date.now(),
      payment_method: "IBAN",
      payment_lastdigits: "0879",
      status: "PENDING",
      status_date: Date.now(),
      amount_euro: "3"
    });
    $$invalidate('invoices', invoices);
    const pm = invoices.length ? invoices[invoices.length - 1] : null;
    if (pm && pm.payment_method == "IBAN" && pm.status == "PENDING") $$invalidate('last_pm', last_pm = pm);
  }

	const click_handler = ({ bill }, e) => prepare_download_link(e, bill);

	$$self.$set = $$props => {
		if ('userdata' in $$props) $$invalidate('userdata', userdata = $$props.userdata);
		if ('user' in $$props) $$invalidate('user', user = $$props.user);
	};

	let storage;

	$$self.$$.update = ($$dirty = { userdata: 1, user: 1 }) => {
		if ($$dirty.userdata) { storage = userdata ? userdata.storage(userdata.BUCKET_BILLING) : null; }
		if ($$dirty.user) { if (user) get_invoice_list(); }
	};

	return {
		userdata,
		user,
		invoices,
		last_pm,
		prepare_download_link,
		refresh_cache,
		demoadd,
		Date,
		click_handler
	};
}

class Invoices extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["userdata", "user"]);
	}
}

/**
 * https://github.com/developit/snarkdown
 * License: MIT, Author: Jason Miller
 */
const TAGS = {
	'' : ['<em>','</em>'],
	_ : ['<strong>','</strong>'],
	'~' : ['<s>','</s>'],
	'\n' : ['<br />'],
	' ' : ['<br />'],
	'-': ['<hr />']
};

/** Outdent a string based on the first indented line's leading whitespace
 *	@private
 */
function outdent(str) {
	return str.replace(RegExp('^'+(str.match(/^(\t| )+/) || '')[0], 'gm'), '');
}

/** Encode special attribute characters to HTML entities in a String.
 *	@private
 */
function encodeAttr(str) {
	return (str+'').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Parse Markdown into an HTML String. */
function parse(md, prevLinks) {
	let tokenizer = /((?:^|\n+)(?:\n---+|\* \*(?: \*)+)\n)|(?:^``` *(\w*)\n([\s\S]*?)\n```$)|((?:(?:^|\n+)(?:\t|  {2,}).+)+\n*)|((?:(?:^|\n)([>*+-]|\d+\.)\s+.*)+)|(?:\!\[([^\]]*?)\]\(([^\)]+?)\))|(\[)|(\](?:\(([^\)]+?)\))?)|(?:(?:^|\n+)([^\s].*)\n(\-{3,}|={3,})(?:\n+|$))|(?:(?:^|\n+)(#{1,6})\s*(.+)(?:\n+|$))|(?:`([^`].*?)`)|(  \n\n*|\n{2,}|__|\*\*|[_*]|~~)/gm,
		context = [],
		out = '',
		links = prevLinks || {},
		last = 0,
		chunk, prev, token, inner, t;

	function tag(token) {
		var desc = TAGS[token.replace(/\*/g,'_')[1] || ''],
			end = context[context.length-1]==token;
		if (!desc) return token;
		if (!desc[1]) return desc[0];
		context[end?'pop':'push'](token);
		return desc[end|0];
	}

	function flush() {
		let str = '';
		while (context.length) str += tag(context[context.length-1]);
		return str;
	}

	md = md.replace(/^\[(.+?)\]:\s*(.+)$/gm, (s, name, url) => {
		links[name.toLowerCase()] = url;
		return '';
	}).replace(/^\n+|\n+$/g, '');

	while ( (token=tokenizer.exec(md)) ) {
		prev = md.substring(last, token.index);
		last = tokenizer.lastIndex;
		chunk = token[0];
		if (prev.match(/[^\\](\\\\)*\\$/)) ;
		// Code/Indent blocks:
		else if (token[3] || token[4]) {
			chunk = '<pre class="code '+(token[4]?'poetry':token[2].toLowerCase())+'">'+outdent(encodeAttr(token[3] || token[4]).replace(/^\n+|\n+$/g, ''))+'</pre>';
		}
		// > Quotes, -* lists:
		else if (token[6]) {
			t = token[6];
			if (t.match(/\./)) {
				token[5] = token[5].replace(/^\d+/gm, '');
			}
			inner = parse(outdent(token[5].replace(/^\s*[>*+.-]/gm, '')));
			if (t==='>') t = 'blockquote';
			else {
				t = t.match(/\./) ? 'ol' : 'ul';
				inner = inner.replace(/^(.*)(\n|$)/gm, '<li>$1</li>');
			}
			chunk = '<'+t+'>' + inner + '</'+t+'>';
		}
		// Images:
		else if (token[8]) {
			chunk = `<img src="${encodeAttr(token[8])}" alt="${encodeAttr(token[7])}">`;
		}
		// Links:
		else if (token[10]) {
			out = out.replace('<a>', `<a href="${encodeAttr(token[11] || links[prev.toLowerCase()])}">`);
			chunk = flush() + '</a>';
		}
		else if (token[9]) {
			chunk = '<a>';
		}
		// Headings:
		else if (token[12] || token[14]) {
			t = 'h' + (token[14] ? token[14].length : (token[13][0]==='='?1:2));
			chunk = '<'+t+'>' + parse(token[12] || token[15], links) + '</'+t+'>';
		}
		// `code`:
		else if (token[16]) {
			chunk = '<code>'+encodeAttr(token[16])+'</code>';
		}
		// Inline formatting: *em*, **strong** & friends
		else if (token[17] || token[1]) {
			chunk = tag(token[17] || '--');
		}
		out += prev;
		out += chunk;
	}

	return (out + md.substring(last) + flush()).trim();
}

/* assets/js/ui-subscription/subscription_plan.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-rlyv7c-style';
	style.textContent = ".plans.svelte-rlyv7c{display:grid;grid-template-columns:33% 33% 33%;grid-gap:10px}";
	append(document.head, style);
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.$feat = list[i];
	child_ctx.$featid = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.$propid = list[i][0];
	child_ctx.$prop = list[i][1];
	return child_ctx;
}

// (37:2) {#if plan.euro_price.min}
function create_if_block_7(ctx) {
	var ui_subscription_flexible, ui_subscription_flexible_target_value;

	return {
		c() {
			ui_subscription_flexible = element("ui-subscription-flexible");
			set_custom_element_data(ui_subscription_flexible, "target", ui_subscription_flexible_target_value = "subscriptionPlan" + ctx.plan.id);
		},

		m(target, anchor) {
			insert(target, ui_subscription_flexible, anchor);
		},

		p(changed, ctx) {
			if ((changed.plan) && ui_subscription_flexible_target_value !== (ui_subscription_flexible_target_value = "subscriptionPlan" + ctx.plan.id)) {
				set_custom_element_data(ui_subscription_flexible, "target", ui_subscription_flexible_target_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_subscription_flexible);
			}
		}
	};
}

// (63:14) {#if $prop.suffix}
function create_if_block_6(ctx) {
	var t_value = ctx.$prop.suffix + "", t;

	return {
		c() {
			t = text(t_value);
		},

		m(target, anchor) {
			insert(target, t, anchor);
		},

		p(changed, ctx) {
			if ((changed.plan) && t_value !== (t_value = ctx.$prop.suffix + "")) {
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

// (76:14) {:else}
function create_else_block_2(ctx) {
	var html_tag, raw_value = parse(ctx.$prop.title) + "";

	return {
		c() {
			html_tag = new HtmlTag(raw_value, null);
		},

		m(target, anchor) {
			html_tag.m(target, anchor);
		},

		p(changed, ctx) {
			if ((changed.plan) && raw_value !== (raw_value = parse(ctx.$prop.title) + "")) {
				html_tag.p(raw_value);
			}
		},

		d(detaching) {
			if (detaching) {
				html_tag.d();
			}
		}
	};
}

// (66:14) {#if $prop.details_html_tag}
function create_if_block_5(ctx) {
	var ui_tooltip, button, raw0_value = parse(ctx.$prop.title) + "", t, html_tag, raw1_value = `<${ctx.$prop.details_html_tag} value=${prop_value(ctx.$prop, ctx.plan.euro_price, ctx.plan.euro_price_value)}></${ctx.$prop.details_html_tag}>` + "";

	return {
		c() {
			ui_tooltip = element("ui-tooltip");
			button = element("button");
			t = space();
			attr(button, "class", "btn-link contexthelp");
			attr(button, "title", "Context help");
			attr(button, "slot", "button");
			html_tag = new HtmlTag(raw1_value, null);
			set_custom_element_data(ui_tooltip, "maxwidth", "");
		},

		m(target, anchor) {
			insert(target, ui_tooltip, anchor);
			append(ui_tooltip, button);
			button.innerHTML = raw0_value;
			append(ui_tooltip, t);
			html_tag.m(ui_tooltip);
		},

		p(changed, ctx) {
			if ((changed.plan) && raw0_value !== (raw0_value = parse(ctx.$prop.title) + "")) {
				button.innerHTML = raw0_value;
			}

			if ((changed.plan) && raw1_value !== (raw1_value = `<${ctx.$prop.details_html_tag} value=${prop_value(ctx.$prop, ctx.plan.euro_price, ctx.plan.euro_price_value)}></${ctx.$prop.details_html_tag}>` + "")) {
				html_tag.p(raw1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_tooltip);
			}
		}
	};
}

// (79:14) {#if $prop.desc}
function create_if_block_4(ctx) {
	var br, t, small, raw_value = parse(ctx.$prop.desc) + "";

	return {
		c() {
			br = element("br");
			t = space();
			small = element("small");
		},

		m(target, anchor) {
			insert(target, br, anchor);
			insert(target, t, anchor);
			insert(target, small, anchor);
			small.innerHTML = raw_value;
		},

		p(changed, ctx) {
			if ((changed.plan) && raw_value !== (raw_value = parse(ctx.$prop.desc) + "")) {
				small.innerHTML = raw_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(br);
				detach(t);
				detach(small);
			}
		}
	};
}

// (57:8) {#each Object.entries(plan.properties) as [$propid, $prop]}
function create_each_block_1(ctx) {
	var tr, td0, output, t0_value = prop_value(ctx.$prop, ctx.plan.euro_price, ctx.plan.euro_price_value) + "", t0, output_data_min_value, output_data_max_value, output_name_value, t1, t2, td1, t3;

	var if_block0 = (ctx.$prop.suffix) && create_if_block_6(ctx);

	function select_block_type(changed, ctx) {
		if (ctx.$prop.details_html_tag) return create_if_block_5;
		return create_else_block_2;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block1 = current_block_type(ctx);

	var if_block2 = (ctx.$prop.desc) && create_if_block_4(ctx);

	return {
		c() {
			tr = element("tr");
			td0 = element("td");
			output = element("output");
			t0 = text(t0_value);
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			td1 = element("td");
			if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			attr(output, "data-min", output_data_min_value = ctx.$prop.base);
			attr(output, "data-max", output_data_max_value = ctx.$prop.max);
			attr(output, "name", output_name_value = ctx.$propid);
		},

		m(target, anchor) {
			insert(target, tr, anchor);
			append(tr, td0);
			append(td0, output);
			append(output, t0);
			append(td0, t1);
			if (if_block0) if_block0.m(td0, null);
			append(tr, t2);
			append(tr, td1);
			if_block1.m(td1, null);
			append(td1, t3);
			if (if_block2) if_block2.m(td1, null);
		},

		p(changed, ctx) {
			if ((changed.plan) && t0_value !== (t0_value = prop_value(ctx.$prop, ctx.plan.euro_price, ctx.plan.euro_price_value) + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.plan) && output_data_min_value !== (output_data_min_value = ctx.$prop.base)) {
				attr(output, "data-min", output_data_min_value);
			}

			if ((changed.plan) && output_data_max_value !== (output_data_max_value = ctx.$prop.max)) {
				attr(output, "data-max", output_data_max_value);
			}

			if ((changed.plan) && output_name_value !== (output_name_value = ctx.$propid)) {
				attr(output, "name", output_name_value);
			}

			if (ctx.$prop.suffix) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_6(ctx);
					if_block0.c();
					if_block0.m(td0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block1) {
				if_block1.p(changed, ctx);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);
				if (if_block1) {
					if_block1.c();
					if_block1.m(td1, t3);
				}
			}

			if (ctx.$prop.desc) {
				if (if_block2) {
					if_block2.p(changed, ctx);
				} else {
					if_block2 = create_if_block_4(ctx);
					if_block2.c();
					if_block2.m(td1, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(tr);
			}

			if (if_block0) if_block0.d();
			if_block1.d();
			if (if_block2) if_block2.d();
		}
	};
}

// (102:14) {:else}
function create_else_block_1(ctx) {
	var span, html_tag, raw_value = parse(ctx.$feat.title) + "", t0, t1;

	var if_block = (ctx.$feat.desc) && create_if_block_3(ctx);

	return {
		c() {
			span = element("span");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			html_tag = new HtmlTag(raw_value, t0);
		},

		m(target, anchor) {
			insert(target, span, anchor);
			html_tag.m(span);
			append(span, t0);
			if (if_block) if_block.m(span, null);
			append(span, t1);
		},

		p(changed, ctx) {
			if ((changed.plan) && raw_value !== (raw_value = parse(ctx.$feat.title) + "")) {
				html_tag.p(raw_value);
			}

			if (ctx.$feat.desc) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(span, t1);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(span);
			}

			if (if_block) if_block.d();
		}
	};
}

// (92:14) {#if $feat.details}
function create_if_block_2$1(ctx) {
	var ui_tooltip, button, raw0_value = parse(ctx.$feat.title) + "", t0, html_tag, raw1_value = parse(ctx.$feat.details) + "", t1;

	return {
		c() {
			ui_tooltip = element("ui-tooltip");
			button = element("button");
			t0 = space();
			t1 = space();
			attr(button, "class", "btn-link contexthelp");
			attr(button, "title", "Context help");
			attr(button, "slot", "button");
			html_tag = new HtmlTag(raw1_value, t1);
			set_custom_element_data(ui_tooltip, "maxwidth", "");
		},

		m(target, anchor) {
			insert(target, ui_tooltip, anchor);
			append(ui_tooltip, button);
			button.innerHTML = raw0_value;
			append(ui_tooltip, t0);
			html_tag.m(ui_tooltip);
			append(ui_tooltip, t1);
		},

		p(changed, ctx) {
			if ((changed.plan) && raw0_value !== (raw0_value = parse(ctx.$feat.title) + "")) {
				button.innerHTML = raw0_value;
			}

			if ((changed.plan) && raw1_value !== (raw1_value = parse(ctx.$feat.details) + "")) {
				html_tag.p(raw1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_tooltip);
			}
		}
	};
}

// (105:18) {#if $feat.desc}
function create_if_block_3(ctx) {
	var t, html_tag, raw_value = '(' + parse(ctx.$feat.desc) + ')' + "";

	return {
		c() {
			t = text(" \n                    ");
			html_tag = new HtmlTag(raw_value, null);
		},

		m(target, anchor) {
			insert(target, t, anchor);
			html_tag.m(target, anchor);
		},

		p(changed, ctx) {
			if ((changed.plan) && raw_value !== (raw_value = '(' + parse(ctx.$feat.desc) + ')' + "")) {
				html_tag.p(raw_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t);
				html_tag.d();
			}
		}
	};
}

// (91:12) {#each plan.features as $feat, $featid}
function create_each_block$2(ctx) {
	var if_block_anchor;

	function select_block_type_1(changed, ctx) {
		if (ctx.$feat.details) return create_if_block_2$1;
		return create_else_block_1;
	}

	var current_block_type = select_block_type_1(null, ctx);
	var if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},

		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p(changed, ctx) {
			if (current_block_type === (current_block_type = select_block_type_1(changed, ctx)) && if_block) {
				if_block.p(changed, ctx);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);
				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},

		d(detaching) {
			if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

// (118:4) {#if plan.euro_price.min}
function create_if_block_1$1(ctx) {
	var input, input_min_value, input_max_value, dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "range");
			attr(input, "min", input_min_value = ctx.plan.euro_price.min);
			attr(input, "max", input_max_value = ctx.plan.euro_price.max);
			attr(input, "class", "slider");
			attr(input, "id", "subscriptionValue");

			dispose = [
				listen(input, "change", ctx.input_change_input_handler),
				listen(input, "input", ctx.input_change_input_handler)
			];
		},

		m(target, anchor) {
			insert(target, input, anchor);

			set_input_value(input, ctx.plan.euro_price_value);
		},

		p(changed, ctx) {
			if (changed.plan) set_input_value(input, ctx.plan.euro_price_value);

			if ((changed.plan) && input_min_value !== (input_min_value = ctx.plan.euro_price.min)) {
				attr(input, "min", input_min_value);
			}

			if ((changed.plan) && input_max_value !== (input_max_value = ctx.plan.euro_price.max)) {
				attr(input, "max", input_max_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(input);
			}

			run_all(dispose);
		}
	};
}

// (131:4) {:else}
function create_else_block$1(ctx) {
	var button, t, dispose;

	return {
		c() {
			button = element("button");
			t = text(ctx.button_text);
			attr(button, "class", "btn btn-primary btn-impressive");
			dispose = listen(button, "click", ctx.click_handler);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);
		},

		p(changed, ctx) {
			if (changed.button_text) {
				set_data(t, ctx.button_text);
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

// (127:4) {#if selected}
function create_if_block$1(ctx) {
	var button, t;

	return {
		c() {
			button = element("button");
			t = text(ctx.button_text);
			button.disabled = true;
			attr(button, "class", "btn btn-success btn-impressive");
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);
		},

		p(changed, ctx) {
			if (changed.button_text) {
				set_data(t, ctx.button_text);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}
		}
	};
}

function create_fragment$3(ctx) {
	var form, t0, input0, input0_value_value, t1, input1, input1_value_value, t2, div0, h4, raw0_value = parse(ctx.plan.title) + "", t3, i, i_class_value, t4, p, raw1_value = parse(ctx.plan.desc) + "", t5, div1, table, tbody, t6, tr, td0, t8, td1, t9, div2, t10, form_id_value;

	var if_block0 = (ctx.plan.euro_price.min) && create_if_block_7(ctx);

	let each_value_1 = Object.entries(ctx.plan.properties);

	let each_blocks_1 = [];

	for (let i_1 = 0; i_1 < each_value_1.length; i_1 += 1) {
		each_blocks_1[i_1] = create_each_block_1(get_each_context_1(ctx, each_value_1, i_1));
	}

	let each_value = ctx.plan.features;

	let each_blocks = [];

	for (let i_1 = 0; i_1 < each_value.length; i_1 += 1) {
		each_blocks[i_1] = create_each_block$2(get_each_context$2(ctx, each_value, i_1));
	}

	var if_block1 = (ctx.plan.euro_price.min) && create_if_block_1$1(ctx);

	function select_block_type_2(changed, ctx) {
		if (ctx.selected) return create_if_block$1;
		return create_else_block$1;
	}

	var current_block_type = select_block_type_2(null, ctx);
	var if_block2 = current_block_type(ctx);

	return {
		c() {
			form = element("form");
			if (if_block0) if_block0.c();
			t0 = space();
			input0 = element("input");
			t1 = space();
			input1 = element("input");
			t2 = space();
			div0 = element("div");
			h4 = element("h4");
			t3 = space();
			i = element("i");
			t4 = space();
			p = element("p");
			t5 = space();
			div1 = element("div");
			table = element("table");
			tbody = element("tbody");

			for (let i_1 = 0; i_1 < each_blocks_1.length; i_1 += 1) {
				each_blocks_1[i_1].c();
			}

			t6 = space();
			tr = element("tr");
			td0 = element("td");
			td0.textContent = "✓";
			t8 = space();
			td1 = element("td");

			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
				each_blocks[i_1].c();
			}

			t9 = space();
			div2 = element("div");
			if (if_block1) if_block1.c();
			t10 = space();
			if_block2.c();
			attr(input0, "type", "hidden");
			attr(input0, "name", "c");
			input0.value = input0_value_value = ctx.plan.euro_price.min ? ctx.plan.euro_price.min : ctx.plan.euro_price;
			attr(input1, "type", "hidden");
			attr(input1, "name", "p");
			input1.value = input1_value_value = ctx.plan.id;
			attr(i, "class", i_class_value = "img " + ctx.plan.icon + " svelte-rlyv7c");
			set_style(i, "font-size", "60pt");
			set_style(i, "line-height", "120pt");
			attr(div0, "class", "header");
			attr(p, "class", "text-center p-2");
			attr(td1, "class", "plans_feat_compact");
			attr(div1, "class", "mx-4 mb-2 table table-sm");
			attr(div2, "class", "text-center mb-3");
			attr(form, "class", "col");
			attr(form, "id", form_id_value = "subscriptionPlan" + ctx.plan.id);
			toggle_class(form, "active", ctx.selected);
		},

		m(target, anchor) {
			insert(target, form, anchor);
			if (if_block0) if_block0.m(form, null);
			append(form, t0);
			append(form, input0);
			append(form, t1);
			append(form, input1);
			append(form, t2);
			append(form, div0);
			append(div0, h4);
			h4.innerHTML = raw0_value;
			append(div0, t3);
			append(div0, i);
			append(form, t4);
			append(form, p);
			p.innerHTML = raw1_value;
			append(form, t5);
			append(form, div1);
			append(div1, table);
			append(table, tbody);

			for (let i_1 = 0; i_1 < each_blocks_1.length; i_1 += 1) {
				each_blocks_1[i_1].m(tbody, null);
			}

			append(tbody, t6);
			append(tbody, tr);
			append(tr, td0);
			append(tr, t8);
			append(tr, td1);

			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
				each_blocks[i_1].m(td1, null);
			}

			append(form, t9);
			append(form, div2);
			if (if_block1) if_block1.m(div2, null);
			append(div2, t10);
			if_block2.m(div2, null);
		},

		p(changed, ctx) {
			if (ctx.plan.euro_price.min) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_7(ctx);
					if_block0.c();
					if_block0.m(form, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if ((changed.plan) && input0_value_value !== (input0_value_value = ctx.plan.euro_price.min ? ctx.plan.euro_price.min : ctx.plan.euro_price)) {
				input0.value = input0_value_value;
			}

			if ((changed.plan) && input1_value_value !== (input1_value_value = ctx.plan.id)) {
				input1.value = input1_value_value;
			}

			if ((changed.plan) && raw0_value !== (raw0_value = parse(ctx.plan.title) + "")) {
				h4.innerHTML = raw0_value;
			}

			if ((changed.plan) && i_class_value !== (i_class_value = "img " + ctx.plan.icon + " svelte-rlyv7c")) {
				attr(i, "class", i_class_value);
			}

			if ((changed.plan) && raw1_value !== (raw1_value = parse(ctx.plan.desc) + "")) {
				p.innerHTML = raw1_value;
			}

			if (changed.plan || changed.snarkdown || changed.prop_value) {
				each_value_1 = Object.entries(ctx.plan.properties);

				let i_1;
				for (i_1 = 0; i_1 < each_value_1.length; i_1 += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i_1);

					if (each_blocks_1[i_1]) {
						each_blocks_1[i_1].p(changed, child_ctx);
					} else {
						each_blocks_1[i_1] = create_each_block_1(child_ctx);
						each_blocks_1[i_1].c();
						each_blocks_1[i_1].m(tbody, t6);
					}
				}

				for (; i_1 < each_blocks_1.length; i_1 += 1) {
					each_blocks_1[i_1].d(1);
				}
				each_blocks_1.length = each_value_1.length;
			}

			if (changed.plan || changed.snarkdown) {
				each_value = ctx.plan.features;

				let i_1;
				for (i_1 = 0; i_1 < each_value.length; i_1 += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i_1);

					if (each_blocks[i_1]) {
						each_blocks[i_1].p(changed, child_ctx);
					} else {
						each_blocks[i_1] = create_each_block$2(child_ctx);
						each_blocks[i_1].c();
						each_blocks[i_1].m(td1, null);
					}
				}

				for (; i_1 < each_blocks.length; i_1 += 1) {
					each_blocks[i_1].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (ctx.plan.euro_price.min) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_1$1(ctx);
					if_block1.c();
					if_block1.m(div2, t10);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (current_block_type === (current_block_type = select_block_type_2(changed, ctx)) && if_block2) {
				if_block2.p(changed, ctx);
			} else {
				if_block2.d(1);
				if_block2 = current_block_type(ctx);
				if (if_block2) {
					if_block2.c();
					if_block2.m(div2, null);
				}
			}

			if ((changed.plan) && form_id_value !== (form_id_value = "subscriptionPlan" + ctx.plan.id)) {
				attr(form, "id", form_id_value);
			}

			if (changed.selected) {
				toggle_class(form, "active", ctx.selected);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(form);
			}

			if (if_block0) if_block0.d();

			destroy_each(each_blocks_1, detaching);

			destroy_each(each_blocks, detaching);

			if (if_block1) if_block1.d();
			if_block2.d();
		}
	};
}

function prop_value(prop, minmax, cost) {
  if (!minmax.min) return prop.base;
  const range = minmax.max - minmax.min;
  const lrange = prop.max - prop.base;
  return prop.base + Math.floor(lrange * ((cost - minmax.min) / range));
}

function instance$3($$self, $$props, $$invalidate) {
	let { plan = {}, user = {}, selected = false } = $$props;
  const dispatch = createEventDispatcher();

  function select_plan(e, plan_id) {
    e.target.disabled = true;
    e.preventDefault();
    dispatch("select", plan_id);
  }

	function input_change_input_handler() {
		plan.euro_price_value = to_number(this.value);
		$$invalidate('plan', plan);
	}

	const click_handler = (e) => select_plan(e, plan.id);

	$$self.$set = $$props => {
		if ('plan' in $$props) $$invalidate('plan', plan = $$props.plan);
		if ('user' in $$props) $$invalidate('user', user = $$props.user);
		if ('selected' in $$props) $$invalidate('selected', selected = $$props.selected);
	};

	let button_text;

	$$self.$$.update = ($$dirty = { plan: 1 }) => {
		if ($$dirty.plan) { $$invalidate('button_text', button_text = !plan.euro_price_value
        ? "Free"
        : plan.euro_price_value + " € / Month"); }
	};

	return {
		plan,
		user,
		selected,
		select_plan,
		button_text,
		input_change_input_handler,
		click_handler
	};
}

class Subscription_plan extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-rlyv7c-style")) add_css();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["plan", "user", "selected"]);
	}
}

/* assets/js/ui-subscription/cmp.svelte generated by Svelte v3.12.0 */

function add_css$1() {
	var style = element("style");
	style.id = 'svelte-u8hewo-style';
	style.textContent = ".stats.svelte-u8hewo{display:grid;grid-template-columns:minmax(100px, 300px) 1fr;grid-gap:10px}";
	append(document.head, style);
}

function get_each_context$3(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.plan = list[i];
	return child_ctx;
}

// (277:26) 
function create_if_block_6$1(ctx) {
	var div0, t0, h4, t2, div2, div1, span0, t4, span1, t5_value = ctx.data && ctx.data.influence_points ? ctx.data.influence_points : 0 + "", t5, t6, current;

	let each_value = ctx.plans;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	var invoices = new Invoices({
		props: {
		userdata: ctx.userdb,
		user: ctx.user
	}
	});
	invoices.$on("error", ctx.error_handler);

	return {
		c() {
			div0 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			h4 = element("h4");
			h4.textContent = "Account";
			t2 = space();
			div2 = element("div");
			div1 = element("div");
			span0 = element("span");
			span0.textContent = "Accumulated Influence Points";
			t4 = space();
			span1 = element("span");
			t5 = text(t5_value);
			t6 = space();
			invoices.$$.fragment.c();
			attr(div0, "id", "plans");
			attr(div0, "class", "row");
			attr(h4, "class", "mt-4");
			attr(div1, "class", "card-body stats svelte-u8hewo");
			attr(div2, "class", "card mt-4");
		},

		m(target, anchor) {
			insert(target, div0, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div0, null);
			}

			insert(target, t0, anchor);
			insert(target, h4, anchor);
			insert(target, t2, anchor);
			insert(target, div2, anchor);
			append(div2, div1);
			append(div1, span0);
			append(div1, t4);
			append(div1, span1);
			append(span1, t5);
			insert(target, t6, anchor);
			mount_component(invoices, target, anchor);
			current = true;
		},

		p(changed, ctx) {
			if (changed.plans || changed.user || changed.data) {
				each_value = ctx.plans;

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div0, null);
					}
				}

				group_outros();
				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}
				check_outros();
			}

			if ((!current || changed.data) && t5_value !== (t5_value = ctx.data && ctx.data.influence_points ? ctx.data.influence_points : 0 + "")) {
				set_data(t5, t5_value);
			}

			var invoices_changes = {};
			if (changed.userdb) invoices_changes.userdata = ctx.userdb;
			if (changed.user) invoices_changes.user = ctx.user;
			invoices.$set(invoices_changes);
		},

		i(local) {
			if (current) return;
			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			transition_in(invoices.$$.fragment, local);

			current = true;
		},

		o(local) {
			each_blocks = each_blocks.filter(Boolean);
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			transition_out(invoices.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(div0);
			}

			destroy_each(each_blocks, detaching);

			if (detaching) {
				detach(t0);
				detach(h4);
				detach(t2);
				detach(div2);
				detach(t6);
			}

			destroy_component(invoices, detaching);
		}
	};
}

// (204:28) 
function create_if_block_4$1(ctx) {
	var div3, div2, p0, t0, t1_value = ctx.summary.plan ? ctx.summary.plan.title : '' + "", t1, t2, div0, label0, input0, t3, b0, t4_value = ctx.summary.user_currency_value.toFixed(2) + "", t4, t5_value = ctx.summary.user_currency + "", t5, t6, br0, t7, small0, t8, t9_value = new ctx.Date(parseInt(ctx.summary.start)).toLocaleDateString() + "", t9, t10, t11_value = new ctx.Date(parseInt(ctx.summary.end)).toLocaleDateString() + "", t11, t12, label1, input1, t13, b1, t14_value = ctx.summary.user_currency_value.toFixed(2) + "", t14, t15_value = ctx.summary.user_currency + "", t15, t16, t17, br1, t18, small1, t19, t20_value = new ctx.Date(parseInt(ctx.summary.start)).toLocaleDateString() + "", t20, t21, p1, t23, p2, t24, updating_currency, t25, t26, t27, p3, label2, input2, t28, a, t30, div1, button0, t32, button1, t33, button1_disabled_value, current, dispose;

	function currencyconverter_currency_binding(value) {
		ctx.currencyconverter_currency_binding.call(null, value);
		updating_currency = true;
		add_flush_callback(() => updating_currency = false);
	}

	let currencyconverter_props = { value: ctx.summary.plan.euro_price_value };
	if (ctx.summary.user_currency !== void 0) {
		currencyconverter_props.currency = ctx.summary.user_currency;
	}
	var currencyconverter = new Currency({ props: currencyconverter_props });

	binding_callbacks.push(() => bind(currencyconverter, 'currency', currencyconverter_currency_binding));
	currencyconverter.$on("output", ctx.output_handler_1);

	var if_block = (ctx.summary.plan.euro_price_value > 3) && create_if_block_5$1();

	return {
		c() {
			div3 = element("div");
			div2 = element("div");
			p0 = element("p");
			t0 = text("Subscription Type: ");
			t1 = text(t1_value);
			t2 = space();
			div0 = element("div");
			label0 = element("label");
			input0 = element("input");
			t3 = text("\n          One Month -\n          ");
			b0 = element("b");
			t4 = text(t4_value);
			t5 = text(t5_value);
			t6 = space();
			br0 = element("br");
			t7 = space();
			small0 = element("small");
			t8 = text("Period: ");
			t9 = text(t9_value);
			t10 = text(" - ");
			t11 = text(t11_value);
			t12 = space();
			label1 = element("label");
			input1 = element("input");
			t13 = text("\n          Recurring* -\n          ");
			b1 = element("b");
			t14 = text(t14_value);
			t15 = text(t15_value);
			t16 = text(" /\n            month");
			t17 = space();
			br1 = element("br");
			t18 = space();
			small1 = element("small");
			t19 = text("Start: ");
			t20 = text(t20_value);
			t21 = space();
			p1 = element("p");
			p1.textContent = "* You can cancel the subscription on a monthly base.";
			t23 = space();
			p2 = element("p");
			t24 = text("(~\n        ");
			currencyconverter.$$.fragment.c();
			t25 = text("\n        )");
			t26 = space();
			if (if_block) if_block.c();
			t27 = space();
			p3 = element("p");
			label2 = element("label");
			input2 = element("input");
			t28 = text("\n          You accept our\n          ");
			a = element("a");
			a.textContent = "Terms Of Service";
			t30 = space();
			div1 = element("div");
			button0 = element("button");
			button0.textContent = "Back";
			t32 = space();
			button1 = element("button");
			t33 = text("Continue to Checkout");
			ctx.$$binding_groups[0].push(input0);
			attr(input0, "type", "radio");
			attr(input0, "name", "options");
			input0.__value = false;
			input0.value = input0.__value;
			ctx.$$binding_groups[0].push(input1);
			attr(input1, "type", "radio");
			attr(input1, "name", "options");
			input1.__value = true;
			input1.value = input1.__value;
			set_style(div0, "display", "grid");
			set_style(div0, "grid-auto-flow", "column");
			set_style(div0, "grid-auto-columns", "300px");
			set_style(div0, "grid-gap", "20px");
			attr(p1, "class", "small");
			attr(input2, "type", "checkbox");
			attr(input2, "name", "agb");
			attr(a, "href", "/terms");
			attr(a, "target", "_blank");
			attr(button0, "class", "btn btn-secondary");
			attr(button1, "class", "btn btn-primary");
			button1.disabled = button1_disabled_value = !ctx.summary.agb;
			attr(div2, "class", "card-body");
			attr(div3, "class", "card");

			dispose = [
				listen(input0, "change", ctx.input0_change_handler),
				listen(input1, "change", ctx.input1_change_handler),
				listen(input2, "change", ctx.input2_change_handler),
				listen(button0, "click", ctx.click_handler_2),
				listen(button1, "click", ctx.click_handler_3)
			];
		},

		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div2);
			append(div2, p0);
			append(p0, t0);
			append(p0, t1);
			append(div2, t2);
			append(div2, div0);
			append(div0, label0);
			append(label0, input0);

			input0.checked = input0.__value === ctx.summary.recurring;

			append(label0, t3);
			append(label0, b0);
			append(b0, t4);
			append(b0, t5);
			append(label0, t6);
			append(label0, br0);
			append(label0, t7);
			append(label0, small0);
			append(small0, t8);
			append(small0, t9);
			append(small0, t10);
			append(small0, t11);
			append(div0, t12);
			append(div0, label1);
			append(label1, input1);

			input1.checked = input1.__value === ctx.summary.recurring;

			append(label1, t13);
			append(label1, b1);
			append(b1, t14);
			append(b1, t15);
			append(b1, t16);
			append(label1, t17);
			append(label1, br1);
			append(label1, t18);
			append(label1, small1);
			append(small1, t19);
			append(small1, t20);
			append(div2, t21);
			append(div2, p1);
			append(div2, t23);
			append(div2, p2);
			append(p2, t24);
			mount_component(currencyconverter, p2, null);
			append(p2, t25);
			append(div2, t26);
			if (if_block) if_block.m(div2, null);
			append(div2, t27);
			append(div2, p3);
			append(p3, label2);
			append(label2, input2);

			input2.checked = ctx.summary.agb;

			append(label2, t28);
			append(label2, a);
			append(div2, t30);
			append(div2, div1);
			append(div1, button0);
			append(div1, t32);
			append(div1, button1);
			append(button1, t33);
			current = true;
		},

		p(changed, ctx) {
			if ((!current || changed.summary) && t1_value !== (t1_value = ctx.summary.plan ? ctx.summary.plan.title : '' + "")) {
				set_data(t1, t1_value);
			}

			if (changed.summary) input0.checked = input0.__value === ctx.summary.recurring;

			if ((!current || changed.summary) && t4_value !== (t4_value = ctx.summary.user_currency_value.toFixed(2) + "")) {
				set_data(t4, t4_value);
			}

			if ((!current || changed.summary) && t5_value !== (t5_value = ctx.summary.user_currency + "")) {
				set_data(t5, t5_value);
			}

			if ((!current || changed.summary) && t9_value !== (t9_value = new ctx.Date(parseInt(ctx.summary.start)).toLocaleDateString() + "")) {
				set_data(t9, t9_value);
			}

			if ((!current || changed.summary) && t11_value !== (t11_value = new ctx.Date(parseInt(ctx.summary.end)).toLocaleDateString() + "")) {
				set_data(t11, t11_value);
			}

			if (changed.summary) input1.checked = input1.__value === ctx.summary.recurring;

			if ((!current || changed.summary) && t14_value !== (t14_value = ctx.summary.user_currency_value.toFixed(2) + "")) {
				set_data(t14, t14_value);
			}

			if ((!current || changed.summary) && t15_value !== (t15_value = ctx.summary.user_currency + "")) {
				set_data(t15, t15_value);
			}

			if ((!current || changed.summary) && t20_value !== (t20_value = new ctx.Date(parseInt(ctx.summary.start)).toLocaleDateString() + "")) {
				set_data(t20, t20_value);
			}

			var currencyconverter_changes = {};
			if (changed.summary) currencyconverter_changes.value = ctx.summary.plan.euro_price_value;
			if (!updating_currency && changed.summary) {
				currencyconverter_changes.currency = ctx.summary.user_currency;
			}
			currencyconverter.$set(currencyconverter_changes);

			if (ctx.summary.plan.euro_price_value > 3) {
				if (!if_block) {
					if_block = create_if_block_5$1();
					if_block.c();
					if_block.m(div2, t27);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (changed.summary) input2.checked = ctx.summary.agb;

			if ((!current || changed.summary) && button1_disabled_value !== (button1_disabled_value = !ctx.summary.agb)) {
				button1.disabled = button1_disabled_value;
			}
		},

		i(local) {
			if (current) return;
			transition_in(currencyconverter.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(currencyconverter.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(div3);
			}

			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input0), 1);
			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input1), 1);

			destroy_component(currencyconverter);

			if (if_block) if_block.d();
			run_all(dispose);
		}
	};
}

// (145:29) 
function create_if_block_2$2(ctx) {
	var tab_container, tab_header, t3, tab_body, tab_body_item0, p0, t7, p1, t11, updating_currency, t12, div0, button0, t14, button1, t16, tab_body_item1, div1, start_braintree_action, t17, t18, div2, button2, t20, button3, current, dispose;

	function iban_currency_binding(value) {
		ctx.iban_currency_binding.call(null, value);
		updating_currency = true;
		add_flush_callback(() => updating_currency = false);
	}

	let iban_props = {
		value: ctx.summary.plan.euro_price_value,
		refcode: ctx.summary.refcode
	};
	if (ctx.summary.user_currency !== void 0) {
		iban_props.currency = ctx.summary.user_currency;
	}
	var iban = new Iban({ props: iban_props });

	binding_callbacks.push(() => bind(iban, 'currency', iban_currency_binding));
	iban.$on("output", ctx.output_handler);

	var if_block = (ctx.error_message_braintree) && create_if_block_3$1(ctx);

	return {
		c() {
			tab_container = element("tab-container");
			tab_header = element("tab-header");
			tab_header.innerHTML = `<tab-header-item class="tab-active">
			        IBAN Bank Account Transfer
			      </tab-header-item> <tab-header-item>PayPal, Credit Card</tab-header-item>`;
			t3 = space();
			tab_body = element("tab-body");
			tab_body_item0 = element("tab-body-item");
			p0 = element("p");
			p0.innerHTML = `
			          An IBAN (Swift) transaction usually takes about 1 and up to 3 business
			          days, but will save transaction and payment gateway fees. To
			          compensate for the non-instant IBAN experience, your subscription
			          status will still be upgraded
			          <b>immediately</b>
			          as with other payment options.
			        `;
			t7 = space();
			p1 = element("p");
			p1.innerHTML = `
			          Please perform the bank transfer in the near future though. The
			          account is automatically checked every 24 hours (
			          <a href="https://github.com/openhab-nodes/cloud-subscriptions" target="_blank">
			            check the source code
			          </a>
			          ).
			        `;
			t11 = space();
			iban.$$.fragment.c();
			t12 = space();
			div0 = element("div");
			button0 = element("button");
			button0.textContent = "Back";
			t14 = space();
			button1 = element("button");
			button1.textContent = "Finish Checkout & Send confirmation Mail";
			t16 = space();
			tab_body_item1 = element("tab-body-item");
			div1 = element("div");
			t17 = space();
			if (if_block) if_block.c();
			t18 = space();
			div2 = element("div");
			button2 = element("button");
			button2.textContent = "Back";
			t20 = space();
			button3 = element("button");
			button3.textContent = "Finish Checkout & Send confirmation Mail";
			attr(button0, "class", "btn btn-secondary");
			attr(button1, "class", "btn btn-primary");
			attr(button2, "class", "btn btn-secondary");
			attr(button3, "class", "btn btn-primary");

			dispose = [
				listen(button0, "click", ctx.click_handler),
				listen(button1, "click", ctx.confirm_iban),
				listen(button2, "click", ctx.click_handler_1),
				listen(button3, "click", ctx.confirm)
			];
		},

		m(target, anchor) {
			insert(target, tab_container, anchor);
			append(tab_container, tab_header);
			append(tab_container, t3);
			append(tab_container, tab_body);
			append(tab_body, tab_body_item0);
			append(tab_body_item0, p0);
			append(tab_body_item0, t7);
			append(tab_body_item0, p1);
			append(tab_body_item0, t11);
			mount_component(iban, tab_body_item0, null);
			append(tab_body_item0, t12);
			append(tab_body_item0, div0);
			append(div0, button0);
			append(div0, t14);
			append(div0, button1);
			append(tab_body, t16);
			append(tab_body, tab_body_item1);
			append(tab_body_item1, div1);
			ctx.div1_binding(div1);
			start_braintree_action = ctx.start_braintree.call(null, div1) || {};
			append(tab_body_item1, t17);
			if (if_block) if_block.m(tab_body_item1, null);
			append(tab_body_item1, t18);
			append(tab_body_item1, div2);
			append(div2, button2);
			append(div2, t20);
			append(div2, button3);
			current = true;
		},

		p(changed, ctx) {
			var iban_changes = {};
			if (changed.summary) iban_changes.value = ctx.summary.plan.euro_price_value;
			if (changed.summary) iban_changes.refcode = ctx.summary.refcode;
			if (!updating_currency && changed.summary) {
				iban_changes.currency = ctx.summary.user_currency;
			}
			iban.$set(iban_changes);

			if (ctx.error_message_braintree) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_3$1(ctx);
					if_block.c();
					if_block.m(tab_body_item1, t18);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		i(local) {
			if (current) return;
			transition_in(iban.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(iban.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			if (detaching) {
				detach(tab_container);
			}

			destroy_component(iban);

			ctx.div1_binding(null);
			if (start_braintree_action && typeof start_braintree_action.destroy === 'function') start_braintree_action.destroy();
			if (if_block) if_block.d();
			run_all(dispose);
		}
	};
}

// (143:0) {#if mode == 'confirmation'}
function create_if_block_1$2(ctx) {
	var t;

	return {
		c() {
			t = text("asd");
		},

		m(target, anchor) {
			insert(target, t, anchor);
		},

		p: noop,
		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (279:4) {#each plans as plan}
function create_each_block$3(ctx) {
	var current;

	var subscriptionplan = new Subscription_plan({
		props: {
		plan: ctx.plan,
		user: ctx.user,
		selected: ctx.data && ctx.data.subscription && ctx.data.subscription.plan ? ctx.data.subscription.plan == ctx.plan.id : ctx.plan.id == 'free'
	}
	});
	subscriptionplan.$on("select", ctx.select_plan);

	return {
		c() {
			subscriptionplan.$$.fragment.c();
		},

		m(target, anchor) {
			mount_component(subscriptionplan, target, anchor);
			current = true;
		},

		p(changed, ctx) {
			var subscriptionplan_changes = {};
			if (changed.plans) subscriptionplan_changes.plan = ctx.plan;
			if (changed.user) subscriptionplan_changes.user = ctx.user;
			if (changed.data || changed.plans) subscriptionplan_changes.selected = ctx.data && ctx.data.subscription && ctx.data.subscription.plan ? ctx.data.subscription.plan == ctx.plan.id : ctx.plan.id == 'free';
			subscriptionplan.$set(subscriptionplan_changes);
		},

		i(local) {
			if (current) return;
			transition_in(subscriptionplan.$$.fragment, local);

			current = true;
		},

		o(local) {
			transition_out(subscriptionplan.$$.fragment, local);
			current = false;
		},

		d(detaching) {
			destroy_component(subscriptionplan, detaching);
		}
	};
}

// (251:6) {#if summary.plan.euro_price_value > 3}
function create_if_block_5$1(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.textContent = "Your financial contribution will greatly help to add more exiting\n          stuff to this project. Thanks.";
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

// (189:8) {#if error_message_braintree}
function create_if_block_3$1(ctx) {
	var p, t;

	return {
		c() {
			p = element("p");
			t = text(ctx.error_message_braintree);
			attr(p, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},

		p(changed, ctx) {
			if (changed.error_message_braintree) {
				set_data(t, ctx.error_message_braintree);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (302:0) {#if error_message}
function create_if_block$2(ctx) {
	var p, t;

	return {
		c() {
			p = element("p");
			t = text(ctx.error_message);
			attr(p, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);
		},

		p(changed, ctx) {
			if (changed.error_message) {
				set_data(t, ctx.error_message);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

function create_fragment$4(ctx) {
	var current_block_type_index, if_block0, t, if_block1_anchor, current;

	var if_block_creators = [
		create_if_block_1$2,
		create_if_block_2$2,
		create_if_block_4$1,
		create_if_block_6$1
	];

	var if_blocks = [];

	function select_block_type(changed, ctx) {
		if (ctx.mode == 'confirmation') return 0;
		if (ctx.mode == 'checkout') return 1;
		if (ctx.mode == 'options') return 2;
		if (ctx.mode == 'plans') return 3;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(null, ctx))) {
		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	var if_block1 = (ctx.error_message) && create_if_block$2(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},

		m(target, anchor) {
			if (~current_block_type_index) if_blocks[current_block_type_index].m(target, anchor);
			insert(target, t, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;
		},

		p(changed, ctx) {
			var previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(changed, ctx);
			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
			} else {
				if (if_block0) {
					group_outros();
					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});
					check_outros();
				}

				if (~current_block_type_index) {
					if_block0 = if_blocks[current_block_type_index];
					if (!if_block0) {
						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block0.c();
					}
					transition_in(if_block0, 1);
					if_block0.m(t.parentNode, t);
				} else {
					if_block0 = null;
				}
			}

			if (ctx.error_message) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block$2(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},

		i(local) {
			if (current) return;
			transition_in(if_block0);
			current = true;
		},

		o(local) {
			transition_out(if_block0);
			current = false;
		},

		d(detaching) {
			if (~current_block_type_index) if_blocks[current_block_type_index].d(detaching);

			if (detaching) {
				detach(t);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(if_block1_anchor);
			}
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	

  let error_message = null;
  let error_message_braintree = null;
  let fetchWithAuth;
  let mode = "plans";
  let plans = [];
  let summary = { recurring: false };

  // Braintree
  let payment_instance;
  let braintree_container;

  let { classes = "" } = $$props;
  let user = null;
  let data = {};
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const temp = await (await fetch("/run/subscriptions.json")).json();
    for (let plan of temp) {
      if (!plan.euro_price) plan.euro_price = 0;
      plan.euro_price_value = plan.euro_price.min
        ? plan.euro_price.min
        : plan.euro_price;
    }
    $$invalidate('plans', plans = temp);

    const module = await import('../../../../../../../../js/cmp/userdata.js');
    onDestroyProxy = module.UserAwareComponent(
      user_ => ($$invalidate('user', user = user_)),
      data_ => ($$invalidate('data', data = data_)),
      aq_ => (actionqueue = aq_)
    );
    $$invalidate('userdb', userdb = module.userdata);
    fetchWithAuth = module.fetchWithAuth;
  }
  start().catch(err => {
    console.warn("Failed to request client token!", err);
    $$invalidate('error_message', error_message = "Failed to request client token! " + err.message);
  });
  /// End -- User Aware Component

  async function start_braintree(change_plan) {
    const module = await import('../../../../../../../../js/cmp/payment.js');
    let braintree = module.braintree;
    fetchWithAuth("subscription.openhabx.com/clienttoken")
      .then(response => response.json())
      .then(json => {
        if (!json.client_token)
          throw new Error("Response does not contain a client token!");
        const opts = {
          authorization: json.client_token,
          container: braintree_container,
          paypal: {
            flow: "vault"
          },
          preselectVaultedPaymentMethod: true
        };
        braintree.create(opts, (err, dropinInstance) => {
          if (err) {
            $$invalidate('error_message_braintree', error_message_braintree = err.message);
            console.error(err);
            return;
          }
          payment_instance = dropinInstance;
        });
      })
      .catch(err => {
        console.warn("Failed to request client token!", err);
        $$invalidate('error_message_braintree', error_message_braintree =
          "Failed to request client token! " + err.message);
      });

    return {
      destroy() {}
    };
  }

  function confirm_iban(e) {
    $$invalidate('mode', mode = "confirmation");
  }

  function confirm(e) {
    payment_instance.requestPaymentMethod((err, payload) => {
      if (err) {
        $$invalidate('error_message', error_message = err.message);
        console.error(err);
        return;
      }
      fetchWithAuth(
        "subscription.openhabx.com/confirm",
        "POST",
        JSON.stringify(payload)
      ).catch(err => {
        console.warn("Failed to request client token!", err);
        $$invalidate('error_message', error_message = "Failed to request client token! " + err.message);
      });
    });
  }

  function select_plan(e) {
    let plan = plans.find(p => p.id == e.detail);
    $$invalidate('summary', summary.plan = plan, summary);
    $$invalidate('summary', summary.start =
      data.subscription && data.subscription.ends
        ? data.subscription.ends
        : Date.now(), summary);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    $$invalidate('summary', summary.end = d.getTime(), summary);
    $$invalidate('summary', summary.user_currency = "€", summary);
    $$invalidate('summary', summary.user_currency_value = plan.euro_price_value, summary);
    const start_date = new Date(summary.start);
    $$invalidate('summary', summary.refcode = refcode(user, start_date), summary);

    $$invalidate('mode', mode = "options");
  }

	const $$binding_groups = [[]];

	function iban_currency_binding(value) {
		summary.user_currency = value;
		$$invalidate('summary', summary);
	}

	const output_handler = (e) => ($$invalidate('summary', summary.user_currency_value = e.detail, summary));

	const click_handler = (e) => ($$invalidate('mode', mode = 'options'));

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('braintree_container', braintree_container = $$value);
		});
	}

	const click_handler_1 = (e) => ($$invalidate('mode', mode = 'options'));

	function input0_change_handler() {
		summary.recurring = this.__value;
		$$invalidate('summary', summary);
	}

	function input1_change_handler() {
		summary.recurring = this.__value;
		$$invalidate('summary', summary);
	}

	function currencyconverter_currency_binding(value) {
		summary.user_currency = value;
		$$invalidate('summary', summary);
	}

	const output_handler_1 = (e) => ($$invalidate('summary', summary.user_currency_value = e.detail, summary));

	function input2_change_handler() {
		summary.agb = this.checked;
		$$invalidate('summary', summary);
	}

	const click_handler_2 = (e) => ($$invalidate('mode', mode = 'plans'));

	const click_handler_3 = (e) => ($$invalidate('mode', mode = 'checkout'));

	const error_handler = (e) => ($$invalidate('error_message', error_message = e.detail));

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	return {
		error_message,
		error_message_braintree,
		mode,
		plans,
		summary,
		braintree_container,
		classes,
		user,
		data,
		userdb,
		start_braintree,
		confirm_iban,
		confirm,
		select_plan,
		Date,
		iban_currency_binding,
		output_handler,
		click_handler,
		div1_binding,
		click_handler_1,
		input0_change_handler,
		input1_change_handler,
		currencyconverter_currency_binding,
		output_handler_1,
		input2_change_handler,
		click_handler_2,
		click_handler_3,
		error_handler,
		$$binding_groups
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-u8hewo-style")) add_css$1();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["classes"]);
	}
}

window.customElements.define('ui-subscription', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const classes = this.getAttribute("class");
        this.removeAttribute("class");
        this.cmp = new Cmp({ target: this, props: { classes } });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-subscription.js.map
