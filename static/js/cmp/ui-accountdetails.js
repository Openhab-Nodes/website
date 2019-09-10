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
function set_input_value(input, value) {
    if (value != null || input.value) {
        input.value = value;
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

/* assets/js/ui-accountdetails/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-r4sam9-style';
	style.textContent = ".img_details.svelte-r4sam9{display:flex}.img_details.svelte-r4sam9>img.svelte-r4sam9{max-width:200px}.user_details.svelte-r4sam9{max-width:400px;flex:1;justify-content:center}";
	append(document.head, style);
}

// (124:2) {#if user && user.photoURL}
function create_if_block_8(ctx) {
	var img, img_src_value;

	return {
		c() {
			img = element("img");
			attr(img, "class", "mr-3 svelte-r4sam9");
			attr(img, "src", img_src_value = ctx.user.photoURL);
			attr(img, "alt", "Profile picture");
		},

		m(target, anchor) {
			insert(target, img, anchor);
		},

		p(changed, ctx) {
			if ((changed.user) && img_src_value !== (img_src_value = ctx.user.photoURL)) {
				attr(img, "src", img_src_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(img);
			}
		}
	};
}

// (166:4) {:else}
function create_else_block_1(ctx) {
	var p, t0, t1, t2, br, t3, t4_value = ctx.user?ctx.user.email:"" + "", t4;

	return {
		c() {
			p = element("p");
			t0 = text("Name: ");
			t1 = text(ctx.displayName);
			t2 = space();
			br = element("br");
			t3 = text("\n        E-Mail: ");
			t4 = text(t4_value);
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t0);
			append(p, t1);
			append(p, t2);
			append(p, br);
			append(p, t3);
			append(p, t4);
		},

		p(changed, ctx) {
			if (changed.displayName) {
				set_data(t1, ctx.displayName);
			}

			if ((changed.user) && t4_value !== (t4_value = ctx.user?ctx.user.email:"" + "")) {
				set_data(t4, t4_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (129:4) {#if user && user.providerData.find(e => e.providerId === 'password')}
function create_if_block_7(ctx) {
	var div0, label0, t1, input0, t2, button0, t3, button0_disabled_value, t4, hr, t5, div1, label1, t7, input1, t8, small, t10, button1, t11, button1_disabled_value, dispose;

	return {
		c() {
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Name:";
			t1 = space();
			input0 = element("input");
			t2 = space();
			button0 = element("button");
			t3 = text("Change");
			t4 = space();
			hr = element("hr");
			t5 = space();
			div1 = element("div");
			label1 = element("label");
			label1.textContent = "Email address:";
			t7 = space();
			input1 = element("input");
			t8 = space();
			small = element("small");
			small.textContent = "We'll never share your email with anyone else.";
			t10 = space();
			button1 = element("button");
			t11 = text("Change");
			attr(input0, "class", "form-control mr-3");
			attr(input0, "id", "signupname");
			attr(input0, "placeholder", "First & Last Name");
			attr(div0, "class", "form-group");
			attr(button0, "class", "btn");
			button0.disabled = button0_disabled_value = ctx.displayName === (ctx.user.displayName || '');
			attr(input1, "type", "email");
			attr(input1, "class", "form-control");
			attr(input1, "autocomplete", "email");
			attr(input1, "id", "exampleInputEmail1");
			attr(input1, "aria-describedby", "emailHelp");
			attr(input1, "placeholder", "Enter email");
			attr(small, "id", "emailHelp");
			attr(small, "class", "form-text text-muted");
			attr(div1, "class", "form-group mt-4");
			attr(button1, "class", "btn");
			button1.disabled = button1_disabled_value = ctx.new_email === (ctx.user.email || '');

			dispose = [
				listen(input0, "input", ctx.input0_input_handler),
				listen(button0, "click", ctx.submit_new_name),
				listen(input1, "input", ctx.input1_input_handler),
				listen(button1, "click", ctx.submit_new_mail)
			];
		},

		m(target, anchor) {
			insert(target, div0, anchor);
			append(div0, label0);
			append(div0, t1);
			append(div0, input0);

			set_input_value(input0, ctx.displayName);

			insert(target, t2, anchor);
			insert(target, button0, anchor);
			append(button0, t3);
			insert(target, t4, anchor);
			insert(target, hr, anchor);
			insert(target, t5, anchor);
			insert(target, div1, anchor);
			append(div1, label1);
			append(div1, t7);
			append(div1, input1);

			set_input_value(input1, ctx.new_email);

			append(div1, t8);
			append(div1, small);
			insert(target, t10, anchor);
			insert(target, button1, anchor);
			append(button1, t11);
		},

		p(changed, ctx) {
			if (changed.displayName && (input0.value !== ctx.displayName)) set_input_value(input0, ctx.displayName);

			if ((changed.displayName || changed.user) && button0_disabled_value !== (button0_disabled_value = ctx.displayName === (ctx.user.displayName || ''))) {
				button0.disabled = button0_disabled_value;
			}

			if (changed.new_email && (input1.value !== ctx.new_email)) set_input_value(input1, ctx.new_email);

			if ((changed.new_email || changed.user) && button1_disabled_value !== (button1_disabled_value = ctx.new_email === (ctx.user.email || ''))) {
				button1.disabled = button1_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div0);
				detach(t2);
				detach(button0);
				detach(t4);
				detach(hr);
				detach(t5);
				detach(div1);
				detach(t10);
				detach(button1);
			}

			run_all(dispose);
		}
	};
}

// (174:4) {#if user && !user.emailVerified}
function create_if_block_5(ctx) {
	var p, span, t_1;

	var if_block = (!ctx.verifcation_send) && create_if_block_6(ctx);

	return {
		c() {
			p = element("p");
			span = element("span");
			span.textContent = "Your E-Mail Address is not yet verified!";
			t_1 = space();
			if (if_block) if_block.c();
			attr(span, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, p, anchor);
			append(p, span);
			append(p, t_1);
			if (if_block) if_block.m(p, null);
		},

		p(changed, ctx) {
			if (!ctx.verifcation_send) {
				if (!if_block) {
					if_block = create_if_block_6(ctx);
					if_block.c();
					if_block.m(p, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}

			if (if_block) if_block.d();
		}
	};
}

// (179:8) {#if !verifcation_send}
function create_if_block_6(ctx) {
	var button, dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "Resend verification E-Mail";
			attr(button, "class", "btn-link");
			dispose = listen(button, "click", ctx.resend_verification);
		},

		m(target, anchor) {
			insert(target, button, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}

			dispose();
		}
	};
}

// (187:4) {#if user && user.metadata}
function create_if_block_4(ctx) {
	var hr, t0, p, t1, t2_value = new Date(parseInt(ctx.user.metadata.a)).toLocaleString() + "", t2, t3, br, t4, t5_value = new Date(parseInt(ctx.user.metadata.b)).toLocaleString() + "", t5;

	return {
		c() {
			hr = element("hr");
			t0 = space();
			p = element("p");
			t1 = text("Registered: ");
			t2 = text(t2_value);
			t3 = space();
			br = element("br");
			t4 = text("\n        Last login: ");
			t5 = text(t5_value);
		},

		m(target, anchor) {
			insert(target, hr, anchor);
			insert(target, t0, anchor);
			insert(target, p, anchor);
			append(p, t1);
			append(p, t2);
			append(p, t3);
			append(p, br);
			append(p, t4);
			append(p, t5);
		},

		p(changed, ctx) {
			if ((changed.user) && t2_value !== (t2_value = new Date(parseInt(ctx.user.metadata.a)).toLocaleString() + "")) {
				set_data(t2, t2_value);
			}

			if ((changed.user) && t5_value !== (t5_value = new Date(parseInt(ctx.user.metadata.b)).toLocaleString() + "")) {
				set_data(t5, t5_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(hr);
				detach(t0);
				detach(p);
			}
		}
	};
}

// (205:6) {:else}
function create_else_block(ctx) {
	var t;

	return {
		c() {
			t = text("Status: Inactive");
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

// (199:6) {#if data && data.subscription && data.subscription.ends && data.subscription.ends < Date.now()}
function create_if_block_3(ctx) {
	var t0, t1_value = ctx.data.subscription.valid ? 'Enabled' : 'Payment pending' + "", t1, t2, br0, t3, t4_value = new Date(parseInt(ctx.data.subscription.ends)).toLocaleString() + "", t4, t5, br1, t6, t7_value = ctx.data.subscription.renewal ? 'Enabled' : 'Disabled' + "", t7;

	return {
		c() {
			t0 = text("Status: ");
			t1 = text(t1_value);
			t2 = space();
			br0 = element("br");
			t3 = text("\n        Period ends: ");
			t4 = text(t4_value);
			t5 = space();
			br1 = element("br");
			t6 = text("\n        Automatic renewal: ");
			t7 = text(t7_value);
		},

		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, br0, anchor);
			insert(target, t3, anchor);
			insert(target, t4, anchor);
			insert(target, t5, anchor);
			insert(target, br1, anchor);
			insert(target, t6, anchor);
			insert(target, t7, anchor);
		},

		p(changed, ctx) {
			if ((changed.data) && t1_value !== (t1_value = ctx.data.subscription.valid ? 'Enabled' : 'Payment pending' + "")) {
				set_data(t1, t1_value);
			}

			if ((changed.data) && t4_value !== (t4_value = new Date(parseInt(ctx.data.subscription.ends)).toLocaleString() + "")) {
				set_data(t4, t4_value);
			}

			if ((changed.data) && t7_value !== (t7_value = ctx.data.subscription.renewal ? 'Enabled' : 'Disabled' + "")) {
				set_data(t7, t7_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(br0);
				detach(t3);
				detach(t4);
				detach(t5);
				detach(br1);
				detach(t6);
				detach(t7);
			}
		}
	};
}

// (208:4) {#if data && data.queued_remove}
function create_if_block_2(ctx) {
	var small;

	return {
		c() {
			small = element("small");
			small.textContent = "Your account is queued to be removed. This will happen after your\n        current subscription ends or within 24 hours, whatever comes first.";
			attr(small, "class", "text-danger");
		},

		m(target, anchor) {
			insert(target, small, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(small);
			}
		}
	};
}

// (215:4) {#if error_message}
function create_if_block_1(ctx) {
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

// (221:4) {#if user && user.providerData.find(e => e.providerId === 'password')}
function create_if_block(ctx) {
	var h4, t1, div0, label0, t3, input0, t4, div1, label1, t6, input1, t7, button, t8, button_disabled_value, dispose;

	return {
		c() {
			h4 = element("h4");
			h4.textContent = "Change Password";
			t1 = space();
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Password";
			t3 = space();
			input0 = element("input");
			t4 = space();
			div1 = element("div");
			label1 = element("label");
			label1.textContent = "Repeat Password";
			t6 = space();
			input1 = element("input");
			t7 = space();
			button = element("button");
			t8 = text("Change Password");
			attr(label0, "for", "exampleInputPassword1");
			attr(input0, "type", "password");
			attr(input0, "autocomplete", "new-password");
			attr(input0, "class", "form-control");
			attr(input0, "id", "exampleInputPassword1");
			attr(input0, "placeholder", "Password");
			attr(div0, "class", "form-group");
			attr(label1, "for", "exampleInputPassword2");
			attr(input1, "type", "password");
			attr(input1, "autocomplete", "new-password");
			attr(input1, "class", "form-control");
			attr(input1, "id", "exampleInputPassword2");
			attr(input1, "placeholder", "Password");
			attr(div1, "class", "form-group");
			attr(button, "class", "btn");
			button.disabled = button_disabled_value = ctx.password !== ctx.password_repeat || ctx.password.trim().length === 0;

			dispose = [
				listen(input0, "input", ctx.input0_input_handler_1),
				listen(input1, "input", ctx.input1_input_handler_1),
				listen(button, "click", ctx.submit_new_password)
			];
		},

		m(target, anchor) {
			insert(target, h4, anchor);
			insert(target, t1, anchor);
			insert(target, div0, anchor);
			append(div0, label0);
			append(div0, t3);
			append(div0, input0);

			set_input_value(input0, ctx.password);

			insert(target, t4, anchor);
			insert(target, div1, anchor);
			append(div1, label1);
			append(div1, t6);
			append(div1, input1);

			set_input_value(input1, ctx.password_repeat);

			insert(target, t7, anchor);
			insert(target, button, anchor);
			append(button, t8);
		},

		p(changed, ctx) {
			if (changed.password && (input0.value !== ctx.password)) set_input_value(input0, ctx.password);
			if (changed.password_repeat && (input1.value !== ctx.password_repeat)) set_input_value(input1, ctx.password_repeat);

			if ((changed.password || changed.password_repeat) && button_disabled_value !== (button_disabled_value = ctx.password !== ctx.password_repeat || ctx.password.trim().length === 0)) {
				button.disabled = button_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h4);
				detach(t1);
				detach(div0);
				detach(t4);
				detach(div1);
				detach(t7);
				detach(button);
			}

			run_all(dispose);
		}
	};
}

function create_fragment(ctx) {
	var div2, t0, div0, show_if_2, t1, t2, t3, p, b, t5, br, t6, show_if_1, t7, t8, t9, div1, show_if = ctx.user && ctx.user.providerData.find(func), div2_class_value;

	var if_block0 = (ctx.user && ctx.user.photoURL) && create_if_block_8(ctx);

	function select_block_type(changed, ctx) {
		if ((show_if_2 == null) || changed.user) show_if_2 = !!(ctx.user && ctx.user.providerData.find(func_1));
		if (show_if_2) return create_if_block_7;
		return create_else_block_1;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block1 = current_block_type(ctx);

	var if_block2 = (ctx.user && !ctx.user.emailVerified) && create_if_block_5(ctx);

	var if_block3 = (ctx.user && ctx.user.metadata) && create_if_block_4(ctx);

	function select_block_type_1(changed, ctx) {
		if ((show_if_1 == null) || changed.data) show_if_1 = !!(ctx.data && ctx.data.subscription && ctx.data.subscription.ends && ctx.data.subscription.ends < Date.now());
		if (show_if_1) return create_if_block_3;
		return create_else_block;
	}

	var current_block_type_1 = select_block_type_1(null, ctx);
	var if_block4 = current_block_type_1(ctx);

	var if_block5 = (ctx.data && ctx.data.queued_remove) && create_if_block_2();

	var if_block6 = (ctx.error_message) && create_if_block_1(ctx);

	var if_block7 = (show_if) && create_if_block(ctx);

	return {
		c() {
			div2 = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if (if_block3) if_block3.c();
			t3 = space();
			p = element("p");
			b = element("b");
			b.textContent = "Subscription";
			t5 = space();
			br = element("br");
			t6 = space();
			if_block4.c();
			t7 = space();
			if (if_block5) if_block5.c();
			t8 = space();
			if (if_block6) if_block6.c();
			t9 = space();
			div1 = element("div");
			if (if_block7) if_block7.c();
			attr(div0, "class", "user_details svelte-r4sam9");
			attr(div1, "class", "ml-3");
			attr(div2, "class", div2_class_value = "img_details " + ctx.classes + " svelte-r4sam9");
		},

		m(target, anchor) {
			insert(target, div2, anchor);
			if (if_block0) if_block0.m(div2, null);
			append(div2, t0);
			append(div2, div0);
			if_block1.m(div0, null);
			append(div0, t1);
			if (if_block2) if_block2.m(div0, null);
			append(div0, t2);
			if (if_block3) if_block3.m(div0, null);
			append(div0, t3);
			append(div0, p);
			append(p, b);
			append(p, t5);
			append(p, br);
			append(p, t6);
			if_block4.m(p, null);
			append(div0, t7);
			if (if_block5) if_block5.m(div0, null);
			append(div0, t8);
			if (if_block6) if_block6.m(div0, null);
			append(div2, t9);
			append(div2, div1);
			if (if_block7) if_block7.m(div1, null);
		},

		p(changed, ctx) {
			if (ctx.user && ctx.user.photoURL) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_8(ctx);
					if_block0.c();
					if_block0.m(div2, t0);
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
					if_block1.m(div0, t1);
				}
			}

			if (ctx.user && !ctx.user.emailVerified) {
				if (if_block2) {
					if_block2.p(changed, ctx);
				} else {
					if_block2 = create_if_block_5(ctx);
					if_block2.c();
					if_block2.m(div0, t2);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (ctx.user && ctx.user.metadata) {
				if (if_block3) {
					if_block3.p(changed, ctx);
				} else {
					if_block3 = create_if_block_4(ctx);
					if_block3.c();
					if_block3.m(div0, t3);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(changed, ctx)) && if_block4) {
				if_block4.p(changed, ctx);
			} else {
				if_block4.d(1);
				if_block4 = current_block_type_1(ctx);
				if (if_block4) {
					if_block4.c();
					if_block4.m(p, null);
				}
			}

			if (ctx.data && ctx.data.queued_remove) {
				if (!if_block5) {
					if_block5 = create_if_block_2();
					if_block5.c();
					if_block5.m(div0, t8);
				}
			} else if (if_block5) {
				if_block5.d(1);
				if_block5 = null;
			}

			if (ctx.error_message) {
				if (if_block6) {
					if_block6.p(changed, ctx);
				} else {
					if_block6 = create_if_block_1(ctx);
					if_block6.c();
					if_block6.m(div0, null);
				}
			} else if (if_block6) {
				if_block6.d(1);
				if_block6 = null;
			}

			if (changed.user) show_if = ctx.user && ctx.user.providerData.find(func);

			if (show_if) {
				if (if_block7) {
					if_block7.p(changed, ctx);
				} else {
					if_block7 = create_if_block(ctx);
					if_block7.c();
					if_block7.m(div1, null);
				}
			} else if (if_block7) {
				if_block7.d(1);
				if_block7 = null;
			}

			if ((changed.classes) && div2_class_value !== (div2_class_value = "img_details " + ctx.classes + " svelte-r4sam9")) {
				attr(div2, "class", div2_class_value);
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(div2);
			}

			if (if_block0) if_block0.d();
			if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if_block4.d();
			if (if_block5) if_block5.d();
			if (if_block6) if_block6.d();
			if (if_block7) if_block7.d();
		}
	};
}

const func = (e) => e.providerId === 'password';

const func_1 = (e) => e.providerId === 'password';

function instance($$self, $$props, $$invalidate) {
	let { classes = "" } = $$props;
  let displayName = "";
  let new_email = "";
  let verifcation_send = false;
  let error_message = null;

  let password = "";
  let password_repeat = "";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import('../../../../../../../../js/cmp/userdata.js');
    onDestroyProxy = module.UserAwareComponent(
      u => {
        $$invalidate('user', user = u);
        $$invalidate('displayName', displayName = user && user.displayName ? user.displayName : "");
        $$invalidate('new_email', new_email = user && user.email ? user.email : "");
      },
      data_ => ($$invalidate('data', data = Object.assign({ installations: {} }, data_))),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
  }
  start();
  /// End -- User Aware Component

  function resend_verification(e) {
    e.preventDefault();
    if (!user) return;
    user
      .sendEmailVerification()
      .then(function() {
        $$invalidate('verifcation_send', verifcation_send = true);
      })
      .catch(function(error) {
        $$invalidate('error_message', error_message = error.message);
      });
  }

  function submit_new_name() {
    e.preventDefault();
    if (!user) return;
    e.target.disabled = true;
    user
      .updateProfile({
        displayName
      })
      .then(function() {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = null);
      })
      .catch(function(error) {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = error.message);
      });
  }

  function submit_new_mail(e) {
    e.preventDefault();
    if (!user) return;
    e.target.disabled = true;
    user
      .updateEmail(new_email)
      .then(function() {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = null);
      })
      .catch(function(error) {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = error.message);
      });
  }

  function submit_new_password(e) {
    e.preventDefault();
    if (!user) return;
    if (password !== password_repeat || password.trim().length == 0) {
      $$invalidate('error_message', error_message = "No password set!");
      return;
    }
    e.target.disabled = true;
    user
      .updatePassword(password)
      .then(function() {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = null);
        $$invalidate('password', password = "");
        $$invalidate('password_repeat', password_repeat = "");
      })
      .catch(function(error) {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = error.message);
      });
  }

	function input0_input_handler() {
		displayName = this.value;
		$$invalidate('displayName', displayName);
	}

	function input1_input_handler() {
		new_email = this.value;
		$$invalidate('new_email', new_email);
	}

	function input0_input_handler_1() {
		password = this.value;
		$$invalidate('password', password);
	}

	function input1_input_handler_1() {
		password_repeat = this.value;
		$$invalidate('password_repeat', password_repeat);
	}

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	return {
		classes,
		displayName,
		new_email,
		verifcation_send,
		error_message,
		password,
		password_repeat,
		user,
		data,
		resend_verification,
		submit_new_name,
		submit_new_mail,
		submit_new_password,
		input0_input_handler,
		input1_input_handler,
		input0_input_handler_1,
		input1_input_handler_1
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-r4sam9-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, ["classes"]);
	}
}

window.customElements.define('ui-accountdetails', class extends HTMLElement {
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
//# sourceMappingURL=ui-accountdetails.js.map
