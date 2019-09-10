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

/* assets/js/ui-accesstokens/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = 'svelte-etg4yh-style';
	style.textContent = ".card.svelte-etg4yh:hover{box-shadow:0 1px 3px 1px rgba(60, 64, 67, 0.2),\n      0 2px 8px 4px rgba(60, 64, 67, 0.1)}.card-body.svelte-etg4yh{display:flex}.card-body.svelte-etg4yh>div.svelte-etg4yh:first-child{flex:1}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.token = list[i];
	return child_ctx;
}

// (121:0) {:else}
function create_else_block(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.textContent = "No Access Tokens registered!";
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

// (96:0) {#each Object.entries(access_tokens) as token}
function create_each_block(ctx) {
	var div3, div2, div0, h4, t0_value = ctx.token[1].client_name + "", t0, t1, p0, t2, t3_value = ctx.token[1].client_id + "", t3, t4, br0, t5, t6_value = ctx.token[1].scopes.join(', ') + "", t6, t7, br1, t8, t9_value = new ctx.Date(parseInt(ctx.token[1].issued_at)).toLocaleString() + "", t9, t10, div1, p1, t12, button, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c() {
			div3 = element("div");
			div2 = element("div");
			div0 = element("div");
			h4 = element("h4");
			t0 = text(t0_value);
			t1 = space();
			p0 = element("p");
			t2 = text("Client: ");
			t3 = text(t3_value);
			t4 = space();
			br0 = element("br");
			t5 = text("\n          Scopes: ");
			t6 = text(t6_value);
			t7 = space();
			br1 = element("br");
			t8 = text("\n          Issued at: ");
			t9 = text(t9_value);
			t10 = space();
			div1 = element("div");
			p1 = element("p");
			p1.textContent = "It takes up to 60 minutes for a revocation to take affect.";
			t12 = space();
			button = element("button");
			button.textContent = "Revoke";
			attr(div0, "class", "svelte-etg4yh");
			attr(p1, "class", "small");
			attr(button, "class", "btn btn-danger");
			attr(div1, "class", "mr-3 svelte-etg4yh");
			set_style(div1, "max-width", "400px");
			attr(div2, "class", "card-body svelte-etg4yh");
			attr(div3, "class", "card svelte-etg4yh");
			dispose = listen(button, "click", click_handler);
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
			append(p0, br0);
			append(p0, t5);
			append(p0, t6);
			append(p0, t7);
			append(p0, br1);
			append(p0, t8);
			append(p0, t9);
			append(div2, t10);
			append(div2, div1);
			append(div1, p1);
			append(div1, t12);
			append(div1, button);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.access_tokens) && t0_value !== (t0_value = ctx.token[1].client_name + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.access_tokens) && t3_value !== (t3_value = ctx.token[1].client_id + "")) {
				set_data(t3, t3_value);
			}

			if ((changed.access_tokens) && t6_value !== (t6_value = ctx.token[1].scopes.join(', ') + "")) {
				set_data(t6, t6_value);
			}

			if ((changed.access_tokens) && t9_value !== (t9_value = new ctx.Date(parseInt(ctx.token[1].issued_at)).toLocaleString() + "")) {
				set_data(t9, t9_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div3);
			}

			dispose();
		}
	};
}

// (125:0) {#if user && user.is_admin}
function create_if_block_1(ctx) {
	var div, button, dispose;

	return {
		c() {
			div = element("div");
			button = element("button");
			button.textContent = "Add Demo Access Token";
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

// (133:0) {#if error_message}
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

	let each_value = ctx.Object.entries(ctx.access_tokens);

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	let each_1_else = null;

	if (!each_value.length) {
		each_1_else = create_else_block();
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
			if (changed.Date || changed.Object || changed.access_tokens) {
				each_value = ctx.Object.entries(ctx.access_tokens);

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
				each_1_else = create_else_block();
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
	let error_message = null;
  let access_tokens = {};
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
      data_ => (data = Object.assign({ installations: {} }, data_)),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
  }
  start();
  /// End -- User Aware Component

  async function fetch_tokens() {
    return userdata
      .fetch_collection("access_tokens")
      .then(() => ($$invalidate('access_tokens', access_tokens = userdata.access_tokens)))
      .catch(err => {
        $$invalidate('error_message', error_message = err.message);
        console.warn("Writing failed", err);
      });
  }

  function revoke(e, token_id, token) {
    e.target.disabled = true;
    userdata
      .remove_from_collection("access_tokens", token_id)
      .then(() => {
        $$invalidate('error_message', error_message = null);
        e.target.disabled = false;
      })
      .then(() => fetch_tokens())
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
        console.warn("Writing failed", err);
      });
  }

  function add_demo(e) {
    if (!userdata || !userdata.user) return;
    e.target.disabled = true;
    const ref = userdb.db()
      .collection("access_tokens")
      .doc(userdata.user.uid + "_" + "dummy");
    ref
      .delete()
      .catch(_ => {})
      .then(() =>
        ref.set({
          uid: userdata.user.uid,
          token: "abcdefghi",
          client_name: "CLI",
          client_id: "ohx",
          scopes: ["cloud_connector", "addon_registry"],
          issued_at: Date.now()
        })
      )
      .then(() => {
        e.target.disabled = false;
        fetch_tokens();
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
        console.warn("Writing failed", err);
      });
  }

	const click_handler = ({ token }, e) => revoke(e, token[0], token[1]);

	return {
		error_message,
		access_tokens,
		user,
		revoke,
		add_demo,
		Object,
		Date,
		click_handler
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-etg4yh-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, []);
	}
}

window.customElements.define('ui-accesstokens', class extends HTMLElement {
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
//# sourceMappingURL=ui-accesstokens.js.map
