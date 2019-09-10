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

/* assets/js/ui-installations/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = 'svelte-etg4yh-style';
	style.textContent = ".card.svelte-etg4yh:hover{box-shadow:0 1px 3px 1px rgba(60, 64, 67, 0.2),\n      0 2px 8px 4px rgba(60, 64, 67, 0.1)}.card-body.svelte-etg4yh{display:flex}.card-body.svelte-etg4yh>div.svelte-etg4yh:first-child{flex:1}";
	append(document.head, style);
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.queuekey = list[i][0];
	child_ctx.item = list[i][1];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.install = list[i];
	return child_ctx;
}

// (172:0) {:else}
function create_else_block_1(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.textContent = "No Installations registered!";
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

// (133:8) {:else}
function create_else_block(ctx) {
	var t0_value = ctx.Object.keys(ctx.actionqueue[ctx.install.id]).length + "", t0, t1, t2;

	let each_value_1 = ctx.Object.entries(ctx.actionqueue[ctx.install.id]);

	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			t0 = text(t0_value);
			t1 = text(" (⇒\n          ");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = text("\n          )");
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, t2, anchor);
		},

		p(changed, ctx) {
			if ((changed.actionqueue || changed.data) && t0_value !== (t0_value = ctx.Object.keys(ctx.actionqueue[ctx.install.id]).length + "")) {
				set_data(t0, t0_value);
			}

			if (changed.Object || changed.actionqueue || changed.data) {
				each_value_1 = ctx.Object.entries(ctx.actionqueue[ctx.install.id]);

				let i;
				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(t2.parentNode, t2);
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
				detach(t0);
				detach(t1);
			}

			destroy_each(each_blocks, detaching);

			if (detaching) {
				detach(t2);
			}
		}
	};
}

// (131:8) {#if !actionqueue || !actionqueue[install.id]}
function create_if_block_3(ctx) {
	var t;

	return {
		c() {
			t = text("0");
		},

		m(target, anchor) {
			insert(target, t, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (141:14) {#if item.aid}
function create_if_block_4(ctx) {
	var t0, t1_value = ctx.item.c + "", t1, t2;

	return {
		c() {
			t0 = text("(");
			t1 = text(t1_value);
			t2 = text(")");
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
		},

		p(changed, ctx) {
			if ((changed.actionqueue || changed.data) && t1_value !== (t1_value = ctx.item.c + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
			}
		}
	};
}

// (135:10) {#each Object.entries(actionqueue[install.id]) as [queuekey, item]}
function create_each_block_1(ctx) {
	var button, t0_value = ctx.queuekey + "", t0, t1, t2, dispose;

	var if_block = (ctx.item.aid) && create_if_block_4(ctx);

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c() {
			button = element("button");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = text("\n            ⇒");
			attr(button, "title", "Remove this command");
			attr(button, "class", "btn btn-link");
			dispose = listen(button, "click", click_handler);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t0);
			append(button, t1);
			if (if_block) if_block.m(button, null);
			insert(target, t2, anchor);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.actionqueue || changed.data) && t0_value !== (t0_value = ctx.queuekey + "")) {
				set_data(t0, t0_value);
			}

			if (ctx.item.aid) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_4(ctx);
					if_block.c();
					if_block.m(button, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}

			if (if_block) if_block.d();

			if (detaching) {
				detach(t2);
			}

			dispose();
		}
	};
}

// (166:8) {#if error_messages[install.id]}
function create_if_block_2(ctx) {
	var p, t_value = ctx.error_messages[ctx.install.id] + "", t;

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
			if ((changed.error_messages || changed.data) && t_value !== (t_value = ctx.error_messages[ctx.install.id] + "")) {
				set_data(t, t_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (110:0) {#each Object.values(data.installations) as install}
function create_each_block(ctx) {
	var div3, div2, div0, h4, t0_value = ctx.install.title + "", t0, t1, p0, t2, t3_value = ctx.install.addons ? ctx.Object.keys(ctx.install.addons).length : 0 + "", t3, t4, t5_value = ctx.Object.keys(ctx.install.addons).join(', ') + "", t5, t6, br0, t7, t8_value = ctx.install.updates + "", t8, t9, p1, t10, t11_value = new ctx.Date(ctx.install.last_seen).toLocaleString() + "", t11, t12, br1, t13, t14_value = new ctx.Date(ctx.install.started).toLocaleString() + "", t14, t15, br2, t16, t17_value = ctx.install.ip.join(', ') + "", t17, t18, div1, t19, t20, p2, t22, button0, t24, button1, t26, button2, t28, dispose;

	function select_block_type(changed, ctx) {
		if (!ctx.actionqueue || !ctx.actionqueue[ctx.install.id]) return create_if_block_3;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block0 = current_block_type(ctx);

	function click_handler_1(...args) {
		return ctx.click_handler_1(ctx, ...args);
	}

	function click_handler_2(...args) {
		return ctx.click_handler_2(ctx, ...args);
	}

	function click_handler_3(...args) {
		return ctx.click_handler_3(ctx, ...args);
	}

	var if_block1 = (ctx.error_messages[ctx.install.id]) && create_if_block_2(ctx);

	return {
		c() {
			div3 = element("div");
			div2 = element("div");
			div0 = element("div");
			h4 = element("h4");
			t0 = text(t0_value);
			t1 = space();
			p0 = element("p");
			t2 = text("Installed Addons: ");
			t3 = text(t3_value);
			t4 = text("\n          (");
			t5 = text(t5_value);
			t6 = text(")\n          ");
			br0 = element("br");
			t7 = text("\n          Available Updates: ");
			t8 = text(t8_value);
			t9 = space();
			p1 = element("p");
			t10 = text("Last Seen: ");
			t11 = text(t11_value);
			t12 = space();
			br1 = element("br");
			t13 = text("\n          Running since: ");
			t14 = text(t14_value);
			t15 = space();
			br2 = element("br");
			t16 = text("\n          IP: ");
			t17 = text(t17_value);
			t18 = space();
			div1 = element("div");
			t19 = text("Command Queue:\n        ");
			if_block0.c();
			t20 = space();
			p2 = element("p");
			p2.textContent = "Please note that commands are queued and not executed directly.";
			t22 = space();
			button0 = element("button");
			button0.textContent = "Update";
			t24 = space();
			button1 = element("button");
			button1.textContent = "Restart";
			t26 = space();
			button2 = element("button");
			button2.textContent = "Unregister";
			t28 = space();
			if (if_block1) if_block1.c();
			attr(div0, "class", "svelte-etg4yh");
			attr(p2, "class", "small");
			attr(button0, "class", "btn btn-secondary");
			attr(button1, "class", "btn btn-secondary");
			attr(button2, "class", "btn btn-danger");
			attr(div1, "class", "mr-3 svelte-etg4yh");
			set_style(div1, "max-width", "400px");
			attr(div2, "class", "card-body svelte-etg4yh");
			attr(div3, "class", "card svelte-etg4yh");

			dispose = [
				listen(button0, "click", click_handler_1),
				listen(button1, "click", click_handler_2),
				listen(button2, "click", click_handler_3)
			];
		},

		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div2);
			append(div2, div0);
			append(div0, h4);
			append(h4, t0);
			append(div0, t1);
			append(div0, p0);
			append(p0, t2);
			append(p0, t3);
			append(p0, t4);
			append(p0, t5);
			append(p0, t6);
			append(p0, br0);
			append(p0, t7);
			append(p0, t8);
			append(div0, t9);
			append(div0, p1);
			append(p1, t10);
			append(p1, t11);
			append(p1, t12);
			append(p1, br1);
			append(p1, t13);
			append(p1, t14);
			append(p1, t15);
			append(p1, br2);
			append(p1, t16);
			append(p1, t17);
			append(div2, t18);
			append(div2, div1);
			append(div1, t19);
			if_block0.m(div1, null);
			append(div1, t20);
			append(div1, p2);
			append(div1, t22);
			append(div1, button0);
			append(div1, t24);
			append(div1, button1);
			append(div1, t26);
			append(div1, button2);
			append(div1, t28);
			if (if_block1) if_block1.m(div1, null);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.data) && t0_value !== (t0_value = ctx.install.title + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.data) && t3_value !== (t3_value = ctx.install.addons ? ctx.Object.keys(ctx.install.addons).length : 0 + "")) {
				set_data(t3, t3_value);
			}

			if ((changed.data) && t5_value !== (t5_value = ctx.Object.keys(ctx.install.addons).join(', ') + "")) {
				set_data(t5, t5_value);
			}

			if ((changed.data) && t8_value !== (t8_value = ctx.install.updates + "")) {
				set_data(t8, t8_value);
			}

			if ((changed.data) && t11_value !== (t11_value = new ctx.Date(ctx.install.last_seen).toLocaleString() + "")) {
				set_data(t11, t11_value);
			}

			if ((changed.data) && t14_value !== (t14_value = new ctx.Date(ctx.install.started).toLocaleString() + "")) {
				set_data(t14, t14_value);
			}

			if ((changed.data) && t17_value !== (t17_value = ctx.install.ip.join(', ') + "")) {
				set_data(t17, t17_value);
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
				if_block0.p(changed, ctx);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);
				if (if_block0) {
					if_block0.c();
					if_block0.m(div1, t20);
				}
			}

			if (ctx.error_messages[ctx.install.id]) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_2(ctx);
					if_block1.c();
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div3);
			}

			if_block0.d();
			if (if_block1) if_block1.d();
			run_all(dispose);
		}
	};
}

// (176:0) {#if user && user.is_admin}
function create_if_block_1(ctx) {
	var div, button, dispose;

	return {
		c() {
			div = element("div");
			button = element("button");
			button.textContent = "Add Demo Installation";
			attr(button, "class", "btn btn-primary");
			attr(div, "class", "mt-4 svelte-etg4yh");
			dispose = listen(button, "click", ctx.add_demo);
		},

		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button);
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			dispose();
		}
	};
}

// (184:0) {#if error_message}
function create_if_block(ctx) {
	var p, t;

	return {
		c() {
			p = element("p");
			t = text(ctx.error_message);
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

function create_fragment(ctx) {
	var t0, t1, if_block1_anchor;

	let each_value = ctx.Object.values(ctx.data.installations);

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	let each_1_else = null;

	if (!each_value.length) {
		each_1_else = create_else_block_1();
		each_1_else.c();
	}

	var if_block0 = (ctx.user && ctx.user.is_admin) && create_if_block_1(ctx);

	var if_block1 = (ctx.error_message) && create_if_block(ctx);

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},

		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			if (each_1_else) {
				each_1_else.m(target, anchor);
			}

			insert(target, t0, anchor);
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t1, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},

		p(changed, ctx) {
			if (changed.error_messages || changed.Object || changed.data || changed.actionqueue || changed.Date) {
				each_value = ctx.Object.values(ctx.data.installations);

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(t0.parentNode, t0);
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
				each_1_else = create_else_block_1();
				each_1_else.c();
				each_1_else.m(t0.parentNode, t0);
			}

			if (ctx.user && ctx.user.is_admin) {
				if (!if_block0) {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(t1.parentNode, t1);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (ctx.error_message) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			destroy_each(each_blocks, detaching);

			if (each_1_else) each_1_else.d(detaching);

			if (detaching) {
				detach(t0);
			}

			if (if_block0) if_block0.d(detaching);

			if (detaching) {
				detach(t1);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(if_block1_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
  let error_messages = {};
  let error_message;
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import('../../../../../../../../js/cmp/userdata.js');
    onDestroyProxy = module.UserAwareComponent(
      user_ => ($$invalidate('user', user = user_)),
      data_ => ($$invalidate('data', data = Object.assign({ installations: {} }, data_))),
      aq_ => ($$invalidate('actionqueue', actionqueue = aq_))
    );
    userdb = module.userdata;
  }
  start();

  function action(e, install, actioncode) {
    e.target.disabled = true;
    userdb
      .queue_action(install.id, actioncode)
      .then(() => {
        $$invalidate('error_messages', error_messages[install.id] = null, error_messages);
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_messages', error_messages[install.id] = err.message, error_messages);
        console.warn("Writing failed", err);
      });
  }

  function remove_action(e, install, actioncode) {
    e.target.disabled = true;
    userdb
      .remove_queued_action(install.id, actioncode)
      .then(() => {
        $$invalidate('error_messages', error_messages[install.id] = null, error_messages);
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_messages', error_messages[install.id] = err.message, error_messages);
        console.warn("Writing failed", err);
      });
  }

  function unregister(e, install) {
    e.target.disabled = true;
    userdb
      .remove_installation(install)
      .then(() => {
        $$invalidate('error_messages', error_messages[install.id] = null, error_messages);
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_messages', error_messages[install.id] = err.message, error_messages);
        console.warn("Writing failed", err);
      });
  }

  function add_demo(e) {
    e.target.disabled = true;
    userdb
      .add_installation({
        title: "My dummy",
        id: "dummy",
        last_seen: Date.now(),
        started: Date.now(),
        updates: 2,
        ip: ["129.123.43.1"],
        addons: {
          "binding-hue": { s: "installed", d: "running", v: "2.5.0" },
          "binding-zwave": { s: "downloading", d: 0.12, v: "2.5.1" }
        }
      })
      .then(() => {
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
        console.warn("Writing failed", err);
      });
  }

	const click_handler = ({ install, queuekey }, e) => remove_action(e, install, queuekey);

	const click_handler_1 = ({ install }, e) => action(e, install, 'update');

	const click_handler_2 = ({ install }, e) => action(e, install, 'restart');

	const click_handler_3 = ({ install }, e) => unregister(e, install);

	return {
		error_messages,
		error_message,
		user,
		data,
		actionqueue,
		action,
		remove_action,
		unregister,
		add_demo,
		Object,
		Date,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-etg4yh-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, []);
	}
}

window.customElements.define('ui-installations', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({ target: this, props: { } });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-installations.js.map
