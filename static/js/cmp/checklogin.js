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

/* assets/js/checklogin/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-n44non-style';
	style.textContent = ".loader.svelte-n44non,.loader.svelte-n44non:before,.loader.svelte-n44non:after{border-radius:50%;width:2.5em;height:2.5em;-webkit-animation-fill-mode:both;animation-fill-mode:both;-webkit-animation:svelte-n44non-load7 1.8s infinite ease-in-out;animation:svelte-n44non-load7 1.8s infinite ease-in-out}.loader.svelte-n44non{font-size:10px;margin:80px auto;position:relative;text-indent:-9999em;-webkit-transform:translateZ(0);-ms-transform:translateZ(0);transform:translateZ(0);-webkit-animation-delay:-0.16s;animation-delay:-0.16s}.loader.svelte-n44non:before,.loader.svelte-n44non:after{content:\"\";position:absolute;top:0}.loader.svelte-n44non:before{left:-3.5em;-webkit-animation-delay:-0.32s;animation-delay:-0.32s}.loader.svelte-n44non:after{left:3.5em}@-webkit-keyframes svelte-n44non-load7{0%,80%,100%{box-shadow:0 2.5em 0 -1.3em}40%{box-shadow:0 2.5em 0 0}}@keyframes svelte-n44non-load7{0%,80%,100%{box-shadow:0 2.5em 0 -1.3em}40%{box-shadow:0 2.5em 0 0}}.dimNotLoggedIn.svelte-n44non{position:fixed;top:0;bottom:0;left:0;right:0;z-index:100;background-color:#00000083;display:flex;justify-content:center}.dimNotLoggedIn.svelte-n44non .loader.svelte-n44non{color:white;align-self:center;font-size:20px;text-align:center;text-indent:-1em;white-space:nowrap}";
	append(document.head, style);
}

// (141:0) {#if visible}
function create_if_block(ctx) {
	var div_1;

	return {
		c() {
			div_1 = element("div");
			div_1.innerHTML = `<div class="loader svelte-n44non">Logging in...</div>`;
			attr(div_1, "class", "dimNotLoggedIn svelte-n44non");
		},

		m(target, anchor) {
			insert(target, div_1, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(div_1);
			}
		}
	};
}

function create_fragment(ctx) {
	var if_block_anchor;

	var if_block = (ctx.visible) && create_if_block();

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},

		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},

		p(changed, ctx) {
			if (ctx.visible) {
				if (!if_block) {
					if_block = create_if_block();
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let visible = false;
  let timer = null;

  function notLoggedIn() {
    if (timer) clearTimeout(timer);
    //document.body.classList.remove("logged_in");
    if (window.location.search)
      window.location.assign(
        "/login?redirect=" +
          encodeURIComponent(
            "/" + window.location.pathname + window.location.search
          )
      );
    else window.location.assign("/login");
  }

  function check_user(user) {
    if (timer) clearTimeout(timer);
    timer = null;
    window.loggedin = !!user;
    $$invalidate('visible', visible = !user);
    if (!user) {
      notLoggedIn();
    }
  }

  async function auth() {
    let is_resolved = false;
    let module = import('../../../../../../../../js/cmp/userdata.js').then(t => {
      is_resolved = true;
      return t;
    });
    // Show loading screen after 500ms
    timer = setTimeout(async () => {
      const user = is_resolved ? (await module).firebase.auth().currentUser : null;
      $$invalidate('visible', visible = !user);
      window.loggedin = !!user;
      if (!user) {
        // Backup timer
        timer = setTimeout(
          async () => check_user((await module).firebase.auth().currentUser),
          2500
        );
      }
    }, 500);
    (await module).firebase.auth().onAuthStateChanged(check_user, function(error) {
      console.log("Check login error", error);
      notLoggedIn();
    });
  }

  auth();

	return { visible };
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-n44non-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, []);
	}
}

window.customElements.define('ui-checklogin', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: { }
        });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=checklogin.js.map
