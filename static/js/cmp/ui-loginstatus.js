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
function empty() {
    return text('');
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

/* assets/js/ui-loginstatus/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-s4mpi6-style';
	style.textContent = ".usernamewrapper.svelte-s4mpi6{display:flex;align-items:center}.userimg.svelte-s4mpi6{height:20px;padding-right:5px}.btn.svelte-s4mpi6{margin-left:50px}";
	append(document.head, style);
}

// (72:0) {:else}
function create_else_block(ctx) {
	var a;

	return {
		c() {
			a = element("a");
			a.textContent = "Login";
			attr(a, "href", "/login");
			attr(a, "id", "signed-out");
			attr(a, "class", "btn btn-outline-primary svelte-s4mpi6");
		},

		m(target, anchor) {
			insert(target, a, anchor);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(a);
			}
		}
	};
}

// (68:21) 
function create_if_block_2(ctx) {
	var button, t;

	return {
		c() {
			button = element("button");
			t = text(ctx.loading_msg);
			attr(button, "class", "btn btn-outline-primary disabled svelte-s4mpi6");
			attr(button, "title", ctx.loading_msg);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);
		},

		p(changed, ctx) {
			if (changed.loading_msg) {
				set_data(t, ctx.loading_msg);
				attr(button, "title", ctx.loading_msg);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}
		}
	};
}

// (58:0) {#if is_signedin}
function create_if_block(ctx) {
	var a, t0, span, t1;

	var if_block = (ctx.userimg_url) && create_if_block_1(ctx);

	return {
		c() {
			a = element("a");
			if (if_block) if_block.c();
			t0 = space();
			span = element("span");
			t1 = text(ctx.username);
			attr(a, "id", "signed-in");
			attr(a, "href", "/dashboard");
			attr(a, "class", "nav-link btn btn-outline-primary usernamewrapper svelte-s4mpi6");
		},

		m(target, anchor) {
			insert(target, a, anchor);
			if (if_block) if_block.m(a, null);
			append(a, t0);
			append(a, span);
			append(span, t1);
		},

		p(changed, ctx) {
			if (ctx.userimg_url) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(a, t0);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (changed.username) {
				set_data(t1, ctx.username);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(a);
			}

			if (if_block) if_block.d();
		}
	};
}

// (63:4) {#if userimg_url}
function create_if_block_1(ctx) {
	var img;

	return {
		c() {
			img = element("img");
			attr(img, "class", "userimg svelte-s4mpi6");
			attr(img, "src", ctx.userimg_url);
			attr(img, "alt", "User Avatar");
		},

		m(target, anchor) {
			insert(target, img, anchor);
		},

		p(changed, ctx) {
			if (changed.userimg_url) {
				attr(img, "src", ctx.userimg_url);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(img);
			}
		}
	};
}

function create_fragment(ctx) {
	var if_block_anchor;

	function select_block_type(changed, ctx) {
		if (ctx.is_signedin) return create_if_block;
		if (ctx.is_loading) return create_if_block_2;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
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
			if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let is_loading = true;
  let loading_msg = "Loading";
  let is_signedin = false;
  let userimg_url = "";
  let username = "";
  let unreg_auth_listener;
  onDestroy(() => {
    if (unreg_auth_listener) unreg_auth_listener();
    unreg_auth_listener = null;
  });

  function check_user(user) {
    if (user) {
      if (user.photoURL) $$invalidate('userimg_url', userimg_url = user.photoURL);
      if (user.displayName) $$invalidate('username', username = user.displayName);
      else if (user.email) $$invalidate('username', username = user.email);
      $$invalidate('is_signedin', is_signedin = true);
    } else {
      $$invalidate('is_signedin', is_signedin = false);
    }
    $$invalidate('is_loading', is_loading = false);
  }

  async function start() {
    let module = await import('../../../../../../../../js/cmp/userdata.js');
    let firebase = module.firebase;
    await module.userdata.ready();
    check_user();
    unreg_auth_listener = firebase
      .auth()
      .onAuthStateChanged(check_user, error => {
        $$invalidate('loading_msg', loading_msg = "Connection Issue!");
      });
  }

  start();

	return {
		is_loading,
		loading_msg,
		is_signedin,
		userimg_url,
		username
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-s4mpi6-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, []);
	}
}

window.customElements.define('ui-loginstatus', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: {
            }
        });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-loginstatus.js.map
