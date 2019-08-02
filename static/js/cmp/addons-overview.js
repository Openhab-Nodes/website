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
function set_style(node, key, value) {
    node.style.setProperty(key, value);
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

/* assets/js/addons-overview/index.svelte generated by Svelte v3.6.10 */

const file = "assets/js/addons-overview/index.svelte";

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

// (56:4) {#each often_installed as item}
function create_each_block_2(ctx) {
	var section2, article, header, span0, t0_value = ctx.item.label, t0, t1, small0, t2_value = ctx.item.version, t2, header_title_value, t3, section0, t4, section1, span1, t5_value = ctx.item.description, t5, t6, footer, small1, t7, t8_value = ctx.item.author, t8, t9, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c: function create() {
			section2 = element("section");
			article = element("article");
			header = element("header");
			span0 = element("span");
			t0 = text(t0_value);
			t1 = space();
			small0 = element("small");
			t2 = text(t2_value);
			t3 = space();
			section0 = element("section");
			t4 = space();
			section1 = element("section");
			span1 = element("span");
			t5 = text(t5_value);
			t6 = space();
			footer = element("footer");
			small1 = element("small");
			t7 = text("– By ");
			t8 = text(t8_value);
			t9 = space();
			add_location(span0, file, 59, 12, 1543);
			attr(small0, "class", "ml-2");
			add_location(small0, file, 60, 12, 1581);
			attr(header, "title", header_title_value = ctx.item.id);
			add_location(header, file, 58, 10, 1506);
			attr(section0, "class", "actions");
			add_location(section0, file, 62, 10, 1654);
			add_location(span1, file, 64, 12, 1734);
			attr(section1, "class", "description");
			add_location(section1, file, 63, 10, 1692);
			attr(small1, "class", "");
			set_style(small1, "white-space", "nowrap");
			set_style(small1, "text-overflow", "ellipsis");
			add_location(small1, file, 67, 12, 1818);
			add_location(footer, file, 66, 10, 1797);
			add_location(article, file, 57, 8, 1486);
			add_location(section2, file, 56, 6, 1429);
			dispose = listen(section2, "click", click_handler);
		},

		m: function mount(target, anchor) {
			insert(target, section2, anchor);
			append(section2, article);
			append(article, header);
			append(header, span0);
			append(span0, t0);
			append(header, t1);
			append(header, small0);
			append(small0, t2);
			append(article, t3);
			append(article, section0);
			append(article, t4);
			append(article, section1);
			append(section1, span1);
			append(span1, t5);
			append(article, t6);
			append(article, footer);
			append(footer, small1);
			append(small1, t7);
			append(small1, t8);
			append(section2, t9);
		},

		p: function update(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.often_installed) && t0_value !== (t0_value = ctx.item.label)) {
				set_data(t0, t0_value);
			}

			if ((changed.often_installed) && t2_value !== (t2_value = ctx.item.version)) {
				set_data(t2, t2_value);
			}

			if ((changed.often_installed) && header_title_value !== (header_title_value = ctx.item.id)) {
				attr(header, "title", header_title_value);
			}

			if ((changed.often_installed) && t5_value !== (t5_value = ctx.item.description)) {
				set_data(t5, t5_value);
			}

			if ((changed.often_installed) && t8_value !== (t8_value = ctx.item.author)) {
				set_data(t8, t8_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(section2);
			}

			dispose();
		}
	};
}

// (82:6) {#each last_updated as item}
function create_each_block_1(ctx) {
	var li, t_value = ctx.item.label, t;

	return {
		c: function create() {
			li = element("li");
			t = text(t_value);
			add_location(li, file, 82, 8, 2145);
		},

		m: function mount(target, anchor) {
			insert(target, li, anchor);
			append(li, t);
		},

		p: function update(changed, ctx) {
			if ((changed.last_updated) && t_value !== (t_value = ctx.item.label)) {
				set_data(t, t_value);
			}
		},

		d: function destroy(detaching) {
			if (detaching) {
				detach(li);
			}
		}
	};
}

// (99:4) {#each recommended as item}
function create_each_block(ctx) {
	var article, t_value = ctx.item.label, t;

	return {
		c: function create() {
			article = element("article");
			t = text(t_value);
			add_location(article, file, 99, 6, 2534);
		},

		m: function mount(target, anchor) {
			insert(target, article, anchor);
			append(article, t);
		},

		p: function update(changed, ctx) {
			if ((changed.recommended) && t_value !== (t_value = ctx.item.label)) {
				set_data(t, t_value);
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
	var link0, t0, link1, t1, link2, t2, div, section0, h20, t4, t5, section1, h21, t7, ul, t8, section2, h22, t10, p, t11, a, t13, b, t15, t16, h23, t18;

	var each_value_2 = ctx.often_installed;

	var each_blocks_2 = [];

	for (var i = 0; i < each_value_2.length; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	var each_value_1 = ctx.last_updated;

	var each_blocks_1 = [];

	for (var i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	var each_value = ctx.recommended;

	var each_blocks = [];

	for (var i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c: function create() {
			link0 = element("link");
			t0 = space();
			link1 = element("link");
			t1 = space();
			link2 = element("link");
			t2 = space();
			div = element("div");
			section0 = element("section");
			h20 = element("h2");
			h20.textContent = "Often Installed";
			t4 = space();

			for (var i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t5 = space();
			section1 = element("section");
			h21 = element("h2");
			h21.textContent = "Latest Updates";
			t7 = space();
			ul = element("ul");

			for (var i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t8 = space();
			section2 = element("section");
			h22 = element("h2");
			h22.textContent = "How To Publish";
			t10 = space();
			p = element("p");
			t11 = text("Learn how to write and publish your own Addon in the\n      ");
			a = element("a");
			a.textContent = "Developer Section";
			t13 = text("\n      . Publish Rule Templates via the\n      ");
			b = element("b");
			b.textContent = "Setup & Maintenance";
			t15 = text("\n      interface.");
			t16 = space();
			h23 = element("h2");
			h23.textContent = "Recommended";
			t18 = space();

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.c = noop;
			attr(link0, "rel", "stylesheet");
			attr(link0, "href", "/css/main.min.css");
			add_location(link0, file, 48, 0, 1149);
			attr(link1, "rel", "stylesheet");
			attr(link1, "href", "/css/addons.min.css");
			add_location(link1, file, 49, 0, 1200);
			attr(link2, "rel", "stylesheet");
			attr(link2, "href", "/css/fontawesome.min.css");
			add_location(link2, file, 50, 0, 1253);
			add_location(h20, file, 54, 4, 1362);
			add_location(section0, file, 53, 2, 1348);
			add_location(h21, file, 79, 4, 2069);
			add_location(ul, file, 80, 4, 2097);
			add_location(section1, file, 78, 2, 2055);
			add_location(h22, file, 88, 4, 2221);
			attr(a, "href", "/developer/addons");
			add_location(a, file, 91, 6, 2318);
			add_location(b, file, 93, 6, 2413);
			add_location(p, file, 89, 4, 2249);
			add_location(h23, file, 97, 4, 2475);
			add_location(section2, file, 87, 2, 2207);
			attr(div, "class", "searchoverview mt-4");
			add_location(div, file, 52, 0, 1312);
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
			insert(target, div, anchor);
			append(div, section0);
			append(section0, h20);
			append(section0, t4);

			for (var i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].m(section0, null);
			}

			append(div, t5);
			append(div, section1);
			append(section1, h21);
			append(section1, t7);
			append(section1, ul);

			for (var i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(ul, null);
			}

			append(div, t8);
			append(div, section2);
			append(section2, h22);
			append(section2, t10);
			append(section2, p);
			append(p, t11);
			append(p, a);
			append(p, t13);
			append(p, b);
			append(p, t15);
			append(section2, t16);
			append(section2, h23);
			append(section2, t18);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(section2, null);
			}
		},

		p: function update(changed, ctx) {
			if (changed.often_installed) {
				each_value_2 = ctx.often_installed;

				for (var i = 0; i < each_value_2.length; i += 1) {
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

			if (changed.last_updated) {
				each_value_1 = ctx.last_updated;

				for (var i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(changed, child_ctx);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(ul, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}
				each_blocks_1.length = each_value_1.length;
			}

			if (changed.recommended) {
				each_value = ctx.recommended;

				for (var i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(section2, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}
		},

		i: noop,
		o: noop,

		d: function destroy(detaching) {
			if (detaching) {
				detach(link0);
				detach(t0);
				detach(link1);
				detach(t1);
				detach(link2);
				detach(t2);
				detach(div);
			}

			destroy_each(each_blocks_2, detaching);

			destroy_each(each_blocks_1, detaching);

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { src = undefined } = $$props;
  let database = undefined;
  let loading = false;
  let recommended = [];
  let last_updated = [];
  let often_installed = [];

  let { search = undefined } = $$props;
  let searchInput = undefined;

  function dbChanged(ev) {
    loading = !ev.detail.ok && !ev.detail.err;
    if (loading) return;
    $$invalidate('recommended', recommended = ev.target.recommended);
    $$invalidate('last_updated', last_updated = ev.target.last_updated.slice(0, 10));
    $$invalidate('often_installed', often_installed = ev.target.often_installed);
  }

  /**
   * @param[string] id The addon id
   */
  function setSearchTerm(id) {
    if (!searchInput) return;
    searchInput.value = id;    searchInput.dispatchEvent(new Event("input"));
  }

  onMount(() => {
    return () => {
      if (database) database.removeEventListener("loader", dbChanged);
    };
  });

	const writable_props = ['src', 'search'];
	Object.keys($$props).forEach(key => {
		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ui-addons-overview> was created with unknown prop '${key}'`);
	});

	function click_handler({ item }, e) {
		return setSearchTerm(item.id);
	}

	$$self.$set = $$props => {
		if ('src' in $$props) $$invalidate('src', src = $$props.src);
		if ('search' in $$props) $$invalidate('search', search = $$props.search);
	};

	$$self.$$.update = ($$dirty = { src: 1, search: 1, database: 1 }) => {
		if ($$dirty.src || $$dirty.search || $$dirty.database) { if (src && search) {
        $$invalidate('database', database = document.getElementById(src));
        if (database) {
          if (database.db.length > 0) db = database.db;
          database.addEventListener("loader", dbChanged);
        }
    
        searchInput = document.getElementById(search);
      } }
	};

	return {
		src,
		recommended,
		last_updated,
		often_installed,
		search,
		setSearchTerm,
		click_handler
	};
}

class Index extends SvelteElement {
	constructor(options) {
		super();

		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["src", "search"]);

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
		return ["src","search"];
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
}

customElements.define("ui-addons-overview", Index);

export default Index;
//# sourceMappingURL=addons-overview.js.map
