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

/* assets/js/ui-servicestatus/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.service = list[i];
	return child_ctx;
}

// (121:6) {:else}
function create_else_block(ctx) {
	var span, t, span_title_value;

	return {
		c() {
			span = element("span");
			t = text("Failed");
			attr(span, "class", "text-danger");
			attr(span, "title", span_title_value = "Last checked: " + new ctx.Date(ctx.service.last_checked).toLocaleString() + ".\n          Error: " + ctx.service.error_msg);
		},

		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},

		p(changed, ctx) {
			if ((changed.services_values) && span_title_value !== (span_title_value = "Last checked: " + new ctx.Date(ctx.service.last_checked).toLocaleString() + ".\n          Error: " + ctx.service.error_msg)) {
				attr(span, "title", span_title_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (119:43) 
function create_if_block_1(ctx) {
	var span;

	return {
		c() {
			span = element("span");
			span.textContent = "…";
			attr(span, "class", "text-warning");
		},

		m(target, anchor) {
			insert(target, span, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (112:6) {#if service.ok}
function create_if_block(ctx) {
	var span, t, span_title_value;

	return {
		c() {
			span = element("span");
			t = text("OK");
			attr(span, "class", "text-success");
			attr(span, "title", span_title_value = "Last checked: " + new ctx.Date(ctx.service.last_checked).toLocaleString() + ".\n          Cached: " + (ctx.service.cached ? 'Yes' : 'No'));
		},

		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},

		p(changed, ctx) {
			if ((changed.services_values) && span_title_value !== (span_title_value = "Last checked: " + new ctx.Date(ctx.service.last_checked).toLocaleString() + ".\n          Cached: " + (ctx.service.cached ? 'Yes' : 'No'))) {
				attr(span, "title", span_title_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (109:2) {#each services_values as service}
function create_each_block(ctx) {
	var div, t0_value = ctx.service.title + "", t0, t1, t2;

	function select_block_type(changed, ctx) {
		if (ctx.service.ok) return create_if_block;
		if (ctx.service.last_checked === 0) return create_if_block_1;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			if_block.c();
			t2 = space();
		},

		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			if_block.m(div, null);
			append(div, t2);
		},

		p(changed, ctx) {
			if ((changed.services_values) && t0_value !== (t0_value = ctx.service.title + "")) {
				set_data(t0, t0_value);
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
				if_block.p(changed, ctx);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);
				if (if_block) {
					if_block.c();
					if_block.m(div, t2);
				}
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			if_block.d();
		}
	};
}

function create_fragment(ctx) {
	var div;

	let each_value = ctx.services_values;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			attr(div, "class", ctx.classes);
			set_style(div, "display", "grid");
			set_style(div, "grid-auto-flow", "column");
			set_style(div, "grid-auto-columns", "200px");
			set_style(div, "grid-gap", "20px");
		},

		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}
		},

		p(changed, ctx) {
			if (changed.services_values || changed.Date) {
				each_value = ctx.services_values;

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (changed.classes) {
				attr(div, "class", ctx.classes);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	
  let { classes = "" } = $$props;
  let onDestroyProxy = () => {};
  onDestroy(() => onDestroyProxy());

  let services = {
    registry: {
      title: "Addon Registry",
      test_url: "https://registry.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    oauth: {
      title: "OAuth Tokens",
      test_url: "https://oauth.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    subscriptions: {
      title: "Subscriptions",
      test_url: "https://subscription.openhabx.com/",
      last_checked: 0,
      ok: false,
      timer: null
    },
    backup: {
      title: "Backup Storage",
      test_url: "gs://openhabx-backups",
      last_checked: 0,
      ok: false,
      timer: null
    }
  };

  function check_cache(serviceid, service) {
    const cache = localStorage.getItem("servicetest/" + serviceid);
    if (cache && cache.ttl > Date.now()) {
      service.ok = true;
      service.cached = true;
      service.last_checked = cache.last_checked;
      $$invalidate('services', services[serviceid] = service, services); // Assignment for svelte reactive
      return true;
    }
    return false;
  }

  function check_result(serviceid, service, f) {
    f.then(() => {
      service.ok = true;
      service.last_checked = Date.now();
      service.ttl = Date.now() + 3600 * 1000;
      localStorage.setItem("servicetest/" + serviceid, JSON.stringify(service));
      $$invalidate('services', services[serviceid] = service, services); // Assignment for svelte reactive
    }).catch(e => {
      service.error_msg = e.message;
      service.ok = false;
      service.last_checked = Date.now();
      $$invalidate('services', services[serviceid] = service, services); // Assignment for svelte reactive
    });
  }

  async function start() {
    for (let [serviceid, service] of Object.entries(services)) {
      if (!service.test_url.startsWith("http")) continue;
      if (check_cache(serviceid, service)) continue;

      check_result(
        serviceid,
        service,
        fetch(service.test_url).then(res => {
          if (res.status < 200 || res.status >= 300) {
            throw new Error(`Unhealthy status code ${res.status}`);
          }
        })
      );
    }

    let module = await import('../../../../../../../../js/cmp/userdata.js');
    let firebase = module.firebase;
    onDestroyProxy = module.UserAwareComponent(user => {
      for (let [serviceid, service] of Object.entries(services)) {
        if (!service.test_url.startsWith("gs")) continue;
        if (check_cache(serviceid, service)) continue;

        const storage = firebase.app().storage(service.test_url);
        const storageRef = storage.ref();
        if (user) {
          const listRef = storageRef.child(user.uid);
          check_result(serviceid, service, listRef.listAll());
        } else {
          check_result(serviceid, service, Promise.reject(new Error("No user session")));
        }
      }
    });
  }
  start();

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	let services_values;

	$$self.$$.update = ($$dirty = { services: 1 }) => {
		if ($$dirty.services) { $$invalidate('services_values', services_values = Object.values(services)); }
	};

	return { classes, services_values, Date };
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, ["classes"]);
	}
}

window.customElements.define('ui-servicestatus', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const classes = this.getAttribute("class") || "btn btn-primary";
        this.removeAttribute("class");
        this.cmp = new Cmp({ target: this, props: { classes } });
    }
    disconnectedCallback() {
        if (this.cmp && this.cmp.onMount) this.cmp.onMount();
    }
});
//# sourceMappingURL=ui-servicestatus.js.map
