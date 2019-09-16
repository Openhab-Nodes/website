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
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
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

let current_component;
function set_current_component(component) {
    current_component = component;
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

/* assets/js/ui-addons-list/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = 'svelte-q6ndst-style';
	style.textContent = "";
	append(document.head, style);
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.addon = list[i];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.addon = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.addon = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.addon = list[i];
	return child_ctx;
}

// (138:0) {:else}
function create_else_block(ctx) {
	var div;

	let each_value_3 = ctx.seachresults;

	let each_blocks = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	let each_1_else = null;

	if (!each_value_3.length) {
		each_1_else = create_else_block_1(ctx);
		each_1_else.c();
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(div, "class", "searchoverview details container my-4");
		},

		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			if (each_1_else) {
				each_1_else.m(div, null);
			}
		},

		p(changed, ctx) {
			if (changed.userawarecomponent || changed.seachresults || changed.addondb || changed.error_message || changed.searchstring) {
				each_value_3 = ctx.seachresults;

				let i;
				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block_3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value_3.length;
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

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);

			if (each_1_else) each_1_else.d();
		}
	};
}

// (85:36) 
function create_if_block_1(ctx) {
	var div, section0, h20, t1, t2, section1, h21, t4, t5, section2, h22, t7, p, t13, h23, t15, ul;

	let each_value_2 = ctx.often_installed;

	let each_blocks_2 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value_1 = ctx.recommended;

	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = ctx.last_updated;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");
			section0 = element("section");
			h20 = element("h2");
			h20.textContent = "Often Installed";
			t1 = space();

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t2 = space();
			section1 = element("section");
			h21 = element("h2");
			h21.textContent = "Recommended";
			t4 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			section2 = element("section");
			h22 = element("h2");
			h22.textContent = "How To Publish";
			t7 = space();
			p = element("p");
			p.innerHTML = `
			        Learn how to write and publish your own Addon in the
			        <a href="/developer/addons">Developer Section</a>
			        . Publish Rule Templates via the
			        <b>Setup &amp; Maintenance</b>
			        interface.
			      `;
			t13 = space();
			h23 = element("h2");
			h23.textContent = "Latest Updates";
			t15 = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(div, "class", "searchoverview mt-4");
		},

		m(target, anchor) {
			insert(target, div, anchor);
			append(div, section0);
			append(section0, h20);
			append(section0, t1);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].m(section0, null);
			}

			append(div, t2);
			append(div, section1);
			append(section1, h21);
			append(section1, t4);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(section1, null);
			}

			append(div, t5);
			append(div, section2);
			append(section2, h22);
			append(section2, t7);
			append(section2, p);
			append(section2, t13);
			append(section2, h23);
			append(section2, t15);
			append(section2, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}
		},

		p(changed, ctx) {
			if (changed.userawarecomponent || changed.often_installed || changed.addondb) {
				each_value_2 = ctx.often_installed;

				let i;
				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_2[i]) {
						each_blocks_2[i].p(changed, child_ctx);
					} else {
						each_blocks_2[i] = create_each_block_2(child_ctx);
						each_blocks_2[i].c();
						each_blocks_2[i].m(section0, null);
					}
				}

				for (; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].d(1);
				}
				each_blocks_2.length = each_value_2.length;
			}

			if (changed.userawarecomponent || changed.recommended || changed.addondb) {
				each_value_1 = ctx.recommended;

				let i;
				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(changed, child_ctx);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(section1, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}
				each_blocks_1.length = each_value_1.length;
			}

			if (changed.last_updated) {
				each_value = ctx.last_updated;

				let i;
				for (i = 0; i < each_value.length; i += 1) {
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

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks_2, detaching);

			destroy_each(each_blocks_1, detaching);

			destroy_each(each_blocks, detaching);
		}
	};
}

// (83:0) {#if loading}
function create_if_block(ctx) {
	var h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "Loading...";
		},

		m(target, anchor) {
			insert(target, h1, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(h1);
			}
		}
	};
}

// (148:4) {:else}
function create_else_block_1(ctx) {
	var p, t0, t1, t2, br, t3, t4, if_block_anchor;

	var if_block = (ctx.error_message) && create_if_block_3(ctx);

	return {
		c() {
			p = element("p");
			t0 = text("No results found for \"");
			t1 = text(ctx.searchstring);
			t2 = text("\" :/\n        ");
			br = element("br");
			t3 = text("\n        Did you know that you can use \".\" as search term to show all Addons? :)");
			t4 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
			append(p, t2);
			append(p, br);
			append(p, t3);
			insert(target, t4, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p(changed, ctx) {
			if (changed.searchstring) {
				set_data(t1, ctx.searchstring);
			}

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

		d(detaching) {
			if (detaching) {
				detach(p);
				detach(t4);
			}

			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

// (154:6) {#if error_message}
function create_if_block_3(ctx) {
	var div, t;

	return {
		c() {
			div = element("div");
			t = text(ctx.error_message);
			attr(div, "class", "bs-callout bs-callout-warning");
		},

		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},

		p(changed, ctx) {
			if (changed.error_message) {
				set_data(t, ctx.error_message);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (140:4) {#each seachresults as addon}
function create_each_block_3(ctx) {
	var ui_addon, ui_addon_addon_value, dispose;

	function click_handler_2(...args) {
		return ctx.click_handler_2(ctx, ...args);
	}

	return {
		c() {
			ui_addon = element("ui-addon");
			set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			set_custom_element_data(ui_addon, "addon", ui_addon_addon_value = ctx.addon);
			set_custom_element_data(ui_addon, "addondb", ctx.addondb);

			dispose = [
				listen(ui_addon, "rate", ctx.rate_handler_2),
				listen(ui_addon, "install", ctx.install_handler_2),
				listen(ui_addon, "click", prevent_default(click_handler_2))
			];
		},

		m(target, anchor) {
			insert(target, ui_addon, anchor);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if (changed.userawarecomponent) {
				set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			}

			if ((changed.seachresults) && ui_addon_addon_value !== (ui_addon_addon_value = ctx.addon)) {
				set_custom_element_data(ui_addon, "addon", ui_addon_addon_value);
			}

			if (changed.addondb) {
				set_custom_element_data(ui_addon, "addondb", ctx.addondb);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_addon);
			}

			run_all(dispose);
		}
	};
}

// (89:6) {#each often_installed as addon}
function create_each_block_2(ctx) {
	var ui_addon, ui_addon_addon_value, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c() {
			ui_addon = element("ui-addon");
			set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			set_custom_element_data(ui_addon, "addon", ui_addon_addon_value = ctx.addon);
			set_custom_element_data(ui_addon, "addondb", ctx.addondb);

			dispose = [
				listen(ui_addon, "rate", ctx.rate_handler),
				listen(ui_addon, "install", ctx.install_handler),
				listen(ui_addon, "click", prevent_default(click_handler))
			];
		},

		m(target, anchor) {
			insert(target, ui_addon, anchor);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if (changed.userawarecomponent) {
				set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			}

			if ((changed.often_installed) && ui_addon_addon_value !== (ui_addon_addon_value = ctx.addon)) {
				set_custom_element_data(ui_addon, "addon", ui_addon_addon_value);
			}

			if (changed.addondb) {
				set_custom_element_data(ui_addon, "addondb", ctx.addondb);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_addon);
			}

			run_all(dispose);
		}
	};
}

// (102:6) {#each recommended as addon}
function create_each_block_1(ctx) {
	var ui_addon, ui_addon_addon_value, dispose;

	function click_handler_1(...args) {
		return ctx.click_handler_1(ctx, ...args);
	}

	return {
		c() {
			ui_addon = element("ui-addon");
			set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			set_custom_element_data(ui_addon, "addon", ui_addon_addon_value = ctx.addon);
			set_custom_element_data(ui_addon, "addondb", ctx.addondb);

			dispose = [
				listen(ui_addon, "rate", ctx.rate_handler_1),
				listen(ui_addon, "install", ctx.install_handler_1),
				listen(ui_addon, "click", prevent_default(click_handler_1))
			];
		},

		m(target, anchor) {
			insert(target, ui_addon, anchor);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if (changed.userawarecomponent) {
				set_custom_element_data(ui_addon, "userawarecomponent", ctx.userawarecomponent);
			}

			if ((changed.recommended) && ui_addon_addon_value !== (ui_addon_addon_value = ctx.addon)) {
				set_custom_element_data(ui_addon, "addon", ui_addon_addon_value);
			}

			if (changed.addondb) {
				set_custom_element_data(ui_addon, "addondb", ctx.addondb);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(ui_addon);
			}

			run_all(dispose);
		}
	};
}

// (127:12) {#if addon.changelog_url}
function create_if_block_2(ctx) {
	var a, t, a_href_value;

	return {
		c() {
			a = element("a");
			t = text("Changelog");
			attr(a, "target", "_blank");
			attr(a, "href", a_href_value = ctx.addon.changelog_url);
		},

		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p(changed, ctx) {
			if ((changed.last_updated) && a_href_value !== (a_href_value = ctx.addon.changelog_url)) {
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

// (124:8) {#each last_updated as addon}
function create_each_block(ctx) {
	var li, t0_value = ctx.addon.title + "", t0, t1, t2, br, t3, t4_value = new Date(ctx.addon.last_updated).toLocaleString() + "", t4, t5, t6_value = ctx.addon.version + "", t6, t7;

	var if_block = (ctx.addon.changelog_url) && create_if_block_2(ctx);

	return {
		c() {
			li = element("li");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			br = element("br");
			t3 = text("\n            Updated on ");
			t4 = text(t4_value);
			t5 = text(" to\n            version ");
			t6 = text(t6_value);
			t7 = text(".\n          ");
			attr(li, "class", "mb-2");
		},

		m(target, anchor) {
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

		p(changed, ctx) {
			if ((changed.last_updated) && t0_value !== (t0_value = ctx.addon.title + "")) {
				set_data(t0, t0_value);
			}

			if (ctx.addon.changelog_url) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_2(ctx);
					if_block.c();
					if_block.m(li, t2);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if ((changed.last_updated) && t4_value !== (t4_value = new Date(ctx.addon.last_updated).toLocaleString() + "")) {
				set_data(t4, t4_value);
			}

			if ((changed.last_updated) && t6_value !== (t6_value = ctx.addon.version + "")) {
				set_data(t6, t6_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(li);
			}

			if (if_block) if_block.d();
		}
	};
}

function create_fragment(ctx) {
	var a, t, if_block_anchor;

	function select_block_type(changed, ctx) {
		if (ctx.loading) return create_if_block;
		if (ctx.searchstring.length === 0) return create_if_block_1;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block = current_block_type(ctx);

	return {
		c() {
			a = element("a");
			t = space();
			if_block.c();
			if_block_anchor = empty();
		},

		m(target, anchor) {
			insert(target, a, anchor);
			ctx.a_binding(a);
			insert(target, t, anchor);
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p(changed, ctx) {
			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
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

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(a);
			}

			ctx.a_binding(null);

			if (detaching) {
				detach(t);
			}

			if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { searchstring = "", userawarecomponent, addondb } = $$props;

  let filters = {
    binding: true,
    ioservice: true,
    ruletemplate: true
  };

  let loading = false;
  let db_searchstring = "";
  let error_message = "";
  let alink;

  function getMatches(searchstring, filters_) {
    if (searchstring === "") return [];

    let alreadyFound = {};
    let matches = [];
    try {
      for (let match of db_searchstring.matchAll(searchstring)) {
        const start = db_searchstring.lastIndexOf("{", match.index);
        if (alreadyFound[start]) continue;
        alreadyFound[start] = true;
        const end = db_searchstring.indexOf("}", match.index);
        const id = JSON.parse(db_searchstring.substring(start, end + 1)).id;
        const addonresult = addondb.db_by_id[id];
        if (addonresult && filters_[addonresult.type]) matches.push(addonresult);
      }
      $$invalidate('error_message', error_message = "");
      return matches;
    } catch (e) {
      $$invalidate('error_message', error_message = e.message);
    }
    return [];
  }

  let recommended = [];
  let last_updated = [];
  let often_installed = [];
  let permissions = {};

  function setFilters(filters_) {
    $$invalidate('filters', filters = filters_);
    let count = 0;
    for (let item of Object.values(addondb.db_by_id)) if (filters[item.type]) ++count;
    return count;
  }

  function start(filters_) {
    $$invalidate('loading', loading = true);
    db_searchstring = addondb.searchstr;
    $$invalidate('recommended', recommended = addondb.recommended);
    permissions = addondb.permissions;
    $$invalidate('last_updated', last_updated = addondb.last_updated.slice(0, 7));
    $$invalidate('often_installed', often_installed = addondb.often_installed.slice(0, 3));
    $$invalidate('loading', loading = false);
    if (filters_) return setFilters(filters_);
    return 0;
  }

  function addonclick(addon) {
    $$invalidate('alink', alink.href = "/addons/addon?id=" + addon.id, alink);
    alink.click();
  }

	function rate_handler(event) {
		bubble($$self, event);
	}

	function install_handler(event) {
		bubble($$self, event);
	}

	function rate_handler_1(event) {
		bubble($$self, event);
	}

	function install_handler_1(event) {
		bubble($$self, event);
	}

	function rate_handler_2(event) {
		bubble($$self, event);
	}

	function install_handler_2(event) {
		bubble($$self, event);
	}

	function a_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('alink', alink = $$value);
		});
	}

	const click_handler = ({ addon }, e) => addonclick(addon);

	const click_handler_1 = ({ addon }, e) => addonclick(addon);

	const click_handler_2 = ({ addon }, e) => addonclick(addon);

	$$self.$set = $$props => {
		if ('searchstring' in $$props) $$invalidate('searchstring', searchstring = $$props.searchstring);
		if ('userawarecomponent' in $$props) $$invalidate('userawarecomponent', userawarecomponent = $$props.userawarecomponent);
		if ('addondb' in $$props) $$invalidate('addondb', addondb = $$props.addondb);
	};

	let seachresults;

	$$self.$$.update = ($$dirty = { searchstring: 1, filters: 1 }) => {
		if ($$dirty.searchstring || $$dirty.filters) { $$invalidate('seachresults', seachresults = getMatches(searchstring, filters)); }
	};

	return {
		searchstring,
		userawarecomponent,
		addondb,
		loading,
		error_message,
		alink,
		recommended,
		last_updated,
		often_installed,
		setFilters,
		start,
		addonclick,
		seachresults,
		rate_handler,
		install_handler,
		rate_handler_1,
		install_handler_1,
		rate_handler_2,
		install_handler_2,
		a_binding,
		click_handler,
		click_handler_1,
		click_handler_2
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-q6ndst-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, ["searchstring", "userawarecomponent", "addondb", "setFilters", "start"]);
	}

	get setFilters() {
		return this.$$.ctx.setFilters;
	}

	get start() {
		return this.$$.ctx.start;
	}
}

window.customElements.define('ui-addons-list', class extends HTMLElement {
    constructor() {
        super();
        this.unreg=[];
        this.count = 0;
    }
    connectedCallback() {
        this._ok = true;
        this.check();
    }
    async check() {
        if (this._ok && this._addondb && this._userawarecomponent) {
            this.cmp = new Cmp({
                target: this, props: {
                    userawarecomponent: this._userawarecomponent,
                    addondb: this._addondb
                }
            });
            if (this._searchstring)  this.cmp.$set({searchstring:this._searchstring});
            this.count = this.cmp.start(this._filters);
            this.unreg.push(this.cmp.$on("install",e=>this.dispatchEvent(new e.constructor(e.type, e))));
            this.unreg.push(this.cmp.$on("rate",e=>this.dispatchEvent(new e.constructor(e.type, e))));

            this.dispatchEvent(new CustomEvent("ready",{detail:{count:this.count}}));

            delete this._searchstring;
            delete this._filters;
        }
    }
    set userawarecomponent(val) {
        this._userawarecomponent = val;
        this.check();
    }
    set searchstring(val) {
        if (!this.cmp) {
            this._searchstring = val;
            return;
        }
        this.cmp.$set({searchstring:val});
    }
    set filters(val) {
        if (!this.cmp) {
            this._filters = val;
            return;
        }
        this.count = this.cmp.setFilters(val);
    }
    set addondb(val) {
        this._addondb = val;
        this.check();
    }
    disconnectedCallback() {
        for (let a of this.unreg) a();
        this.unreg=[];
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-addons-list.js.map
