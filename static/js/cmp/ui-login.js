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

/* assets/js/ui-login/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-aggp9g-style';
	style.textContent = ".firebaseui-idp-email.svelte-aggp9g,.firebaseui-idp-email.svelte-aggp9g:hover,.firebaseui-idp-email.svelte-aggp9g:active,.firebaseui-idp-email.svelte-aggp9g:focus{background-color:#db4437;color:white}.firebaseui-idp-phone.svelte-aggp9g,.firebaseui-idp-phone.svelte-aggp9g:hover,.firebaseui-idp-phone.svelte-aggp9g:active,.firebaseui-idp-phone.svelte-aggp9g:focus{background-color:#02bd7e;color:white}.firebaseui-idp-google.svelte-aggp9g,.firebaseui-idp-google.svelte-aggp9g:hover,.firebaseui-idp-google.svelte-aggp9g:active,.firebaseui-idp-google.svelte-aggp9g:focus{background-color:#fff;color:black}.firebaseui-idp-github.svelte-aggp9g,.firebaseui-idp-github.svelte-aggp9g:hover,.firebaseui-idp-github.svelte-aggp9g:active,.firebaseui-idp-github.svelte-aggp9g:focus{background-color:#333;color:white}.firebaseui-idp-facebook.svelte-aggp9g,.firebaseui-idp-facebook.svelte-aggp9g:hover,.firebaseui-idp-facebook.svelte-aggp9g:active,.firebaseui-idp-facebook.svelte-aggp9g:focus{background-color:#3b5998}.firebaseui-idp-twitter.svelte-aggp9g,.firebaseui-idp-twitter.svelte-aggp9g:hover,.firebaseui-idp-twitter.svelte-aggp9g:active,.firebaseui-idp-twitter.svelte-aggp9g:focus{background-color:#55acee}.firebaseui-idp-anonymous.svelte-aggp9g,.firebaseui-idp-anonymous.svelte-aggp9g:hover,.firebaseui-idp-anonymous.svelte-aggp9g:active,.firebaseui-idp-anonymous.svelte-aggp9g:focus{background-color:#f4b400}.centered.svelte-aggp9g{margin:auto;max-width:300px}.container.svelte-aggp9g{display:flex;justify-content:center;flex-direction:column;max-width:300px;align-items:center;margin:auto}.container.svelte-aggp9g button img.svelte-aggp9g{max-width:20px}.container.svelte-aggp9g button.svelte-aggp9g{display:flex;align-items:center}.container.svelte-aggp9g button span.svelte-aggp9g{flex:1}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.item = list[i];
	return child_ctx;
}

// (341:0) {:else}
function create_else_block(ctx) {
	var form, t0, t1, small, t2, a0, t3, a0_target_value, t4, a1, t5, a1_target_value, t6;

	let each_value = ctx.signInOptions;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	var if_block = (ctx.error_message) && create_if_block_4(ctx);

	return {
		c() {
			form = element("form");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			small = element("small");
			t2 = text("By continuing, you are indicating that you accept our\n      ");
			a0 = element("a");
			t3 = text("Terms of Service");
			t4 = text("\n      and\n      ");
			a1 = element("a");
			t5 = text("Privacy Policy");
			t6 = text("\n      .");
			attr(a0, "href", ctx.tosUrl);
			attr(a0, "target", a0_target_value = ctx.legal_link_new_tab ? '_blank' : '');
			attr(a1, "href", ctx.privacyPolicyUrl);
			attr(a1, "target", a1_target_value = ctx.legal_link_new_tab ? '_blank' : '');
			attr(form, "onsubmit", "return false;");
			attr(form, "class", "container svelte-aggp9g");
		},

		m(target, anchor) {
			insert(target, form, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(form, null);
			}

			append(form, t0);
			if (if_block) if_block.m(form, null);
			append(form, t1);
			append(form, small);
			append(small, t2);
			append(small, a0);
			append(a0, t3);
			append(small, t4);
			append(small, a1);
			append(a1, t5);
			append(small, t6);
		},

		p(changed, ctx) {
			if (changed.loading || changed.signInOptions) {
				each_value = ctx.signInOptions;

				let i;
				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(changed, child_ctx);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(form, t0);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (ctx.error_message) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_4(ctx);
					if_block.c();
					if_block.m(form, t1);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (changed.tosUrl) {
				attr(a0, "href", ctx.tosUrl);
			}

			if ((changed.legal_link_new_tab) && a0_target_value !== (a0_target_value = ctx.legal_link_new_tab ? '_blank' : '')) {
				attr(a0, "target", a0_target_value);
			}

			if (changed.privacyPolicyUrl) {
				attr(a1, "href", ctx.privacyPolicyUrl);
			}

			if ((changed.legal_link_new_tab) && a1_target_value !== (a1_target_value = ctx.legal_link_new_tab ? '_blank' : '')) {
				attr(a1, "target", a1_target_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(form);
			}

			destroy_each(each_blocks, detaching);

			if (if_block) if_block.d();
		}
	};
}

// (286:33) 
function create_if_block_2(ctx) {
	var form, div0, label0, t1, input0, t2, small, t4, div1, label1, t6, input1, t7, div2, label2, t9, input2, t10, div3, label3, t12, input3, t13, button, t15, a, t17, dispose;

	var if_block = (ctx.error_message) && create_if_block_3(ctx);

	return {
		c() {
			form = element("form");
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Email address";
			t1 = space();
			input0 = element("input");
			t2 = space();
			small = element("small");
			small.textContent = "We'll never share your email with anyone else.";
			t4 = space();
			div1 = element("div");
			label1 = element("label");
			label1.textContent = "Password";
			t6 = space();
			input1 = element("input");
			t7 = space();
			div2 = element("div");
			label2 = element("label");
			label2.textContent = "Repeat Password";
			t9 = space();
			input2 = element("input");
			t10 = space();
			div3 = element("div");
			label3 = element("label");
			label3.textContent = "First & Last Name";
			t12 = space();
			input3 = element("input");
			t13 = space();
			button = element("button");
			button.textContent = "Create Account";
			t15 = space();
			a = element("a");
			a.textContent = "Back";
			t17 = space();
			if (if_block) if_block.c();
			attr(label0, "for", "exampleInputEmail1");
			attr(input0, "type", "email");
			attr(input0, "class", "form-control");
			attr(input0, "autocomplete", "email");
			attr(input0, "id", "exampleInputEmail1");
			attr(input0, "aria-describedby", "emailHelp");
			attr(input0, "placeholder", "Enter email");
			attr(small, "id", "emailHelp");
			attr(small, "class", "form-text text-muted");
			attr(div0, "class", "form-group");
			attr(label1, "for", "exampleInputPassword1");
			attr(input1, "type", "password");
			attr(input1, "autocomplete", "new-password");
			attr(input1, "class", "form-control");
			attr(input1, "id", "exampleInputPassword1");
			attr(input1, "placeholder", "Password");
			attr(div1, "class", "form-group");
			attr(label2, "for", "exampleInputPassword2");
			attr(input2, "type", "password");
			attr(input2, "autocomplete", "new-password");
			attr(input2, "class", "form-control");
			attr(input2, "id", "exampleInputPassword2");
			attr(input2, "placeholder", "Password");
			attr(div2, "class", "form-group");
			attr(label3, "for", "signupname");
			attr(input3, "class", "form-control");
			attr(input3, "id", "signupname");
			attr(input3, "placeholder", "First & Last Name");
			attr(div3, "class", "form-group");
			attr(button, "type", "submit");
			attr(button, "class", "btn btn-primary mr-3");
			attr(a, "href", "/login#");
			attr(form, "class", "centered svelte-aggp9g");

			dispose = [
				listen(input0, "input", ctx.input0_input_handler_1),
				listen(input1, "input", ctx.input1_input_handler_1),
				listen(input2, "input", ctx.input2_input_handler),
				listen(input3, "input", ctx.input3_input_handler),
				listen(button, "click", ctx.email_create_account),
				listen(a, "click", ctx.back_to_sign_in)
			];
		},

		m(target, anchor) {
			insert(target, form, anchor);
			append(form, div0);
			append(div0, label0);
			append(div0, t1);
			append(div0, input0);

			set_input_value(input0, ctx.email);

			append(div0, t2);
			append(div0, small);
			append(form, t4);
			append(form, div1);
			append(div1, label1);
			append(div1, t6);
			append(div1, input1);

			set_input_value(input1, ctx.password);

			append(form, t7);
			append(form, div2);
			append(div2, label2);
			append(div2, t9);
			append(div2, input2);

			set_input_value(input2, ctx.password_repeat);

			append(form, t10);
			append(form, div3);
			append(div3, label3);
			append(div3, t12);
			append(div3, input3);

			set_input_value(input3, ctx.first_lastname);

			append(form, t13);
			append(form, button);
			append(form, t15);
			append(form, a);
			append(form, t17);
			if (if_block) if_block.m(form, null);
		},

		p(changed, ctx) {
			if (changed.email && (input0.value !== ctx.email)) set_input_value(input0, ctx.email);
			if (changed.password && (input1.value !== ctx.password)) set_input_value(input1, ctx.password);
			if (changed.password_repeat && (input2.value !== ctx.password_repeat)) set_input_value(input2, ctx.password_repeat);
			if (changed.first_lastname && (input3.value !== ctx.first_lastname)) set_input_value(input3, ctx.first_lastname);

			if (ctx.error_message) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(form, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(form);
			}

			if (if_block) if_block.d();
			run_all(dispose);
		}
	};
}

// (248:0) {#if mode == 'email_signin'}
function create_if_block(ctx) {
	var form, div0, label0, t1, input0, t2, small, t4, div1, label1, t6, input1, t7, button, t9, a, t11, dispose;

	var if_block = (ctx.error_message) && create_if_block_1(ctx);

	return {
		c() {
			form = element("form");
			div0 = element("div");
			label0 = element("label");
			label0.textContent = "Email address";
			t1 = space();
			input0 = element("input");
			t2 = space();
			small = element("small");
			small.textContent = "We'll never share your email with anyone else.";
			t4 = space();
			div1 = element("div");
			label1 = element("label");
			label1.textContent = "Password";
			t6 = space();
			input1 = element("input");
			t7 = space();
			button = element("button");
			button.textContent = "Sign In";
			t9 = text("\n    No account yet?\n    ");
			a = element("a");
			a.textContent = "Sign Up";
			t11 = space();
			if (if_block) if_block.c();
			attr(label0, "for", "exampleInputEmail1");
			attr(input0, "type", "email");
			attr(input0, "autocomplete", "email");
			attr(input0, "class", "form-control");
			attr(input0, "id", "exampleInputEmail1");
			attr(input0, "aria-describedby", "emailHelp");
			attr(input0, "placeholder", "Enter email");
			attr(small, "id", "emailHelp");
			attr(small, "class", "form-text text-muted");
			attr(div0, "class", "form-group");
			attr(label1, "for", "exampleInputPassword1");
			attr(input1, "type", "password");
			attr(input1, "class", "form-control");
			attr(input1, "autocomplete", "current-password");
			attr(input1, "id", "exampleInputPassword1");
			attr(input1, "placeholder", "Password");
			attr(div1, "class", "form-group");
			attr(button, "type", "submit");
			attr(button, "class", "btn btn-primary mr-3");
			attr(a, "href", "/login#");
			attr(form, "class", "centered svelte-aggp9g");

			dispose = [
				listen(input0, "input", ctx.input0_input_handler),
				listen(input1, "input", ctx.input1_input_handler),
				listen(button, "click", ctx.signin_with_email),
				listen(a, "click", ctx.emailsignup)
			];
		},

		m(target, anchor) {
			insert(target, form, anchor);
			append(form, div0);
			append(div0, label0);
			append(div0, t1);
			append(div0, input0);

			set_input_value(input0, ctx.email);

			append(div0, t2);
			append(div0, small);
			append(form, t4);
			append(form, div1);
			append(div1, label1);
			append(div1, t6);
			append(div1, input1);

			set_input_value(input1, ctx.password);

			append(form, t7);
			append(form, button);
			append(form, t9);
			append(form, a);
			append(form, t11);
			if (if_block) if_block.m(form, null);
		},

		p(changed, ctx) {
			if (changed.email && (input0.value !== ctx.email)) set_input_value(input0, ctx.email);
			if (changed.password && (input1.value !== ctx.password)) set_input_value(input1, ctx.password);

			if (ctx.error_message) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(form, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(form);
			}

			if (if_block) if_block.d();
			run_all(dispose);
		}
	};
}

// (343:4) {#each signInOptions as item}
function create_each_block(ctx) {
	var button, img, img_src_value, t0, span, t1, t2_value = ctx.item.t + "", t2, button_class_value, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c() {
			button = element("button");
			img = element("img");
			t0 = space();
			span = element("span");
			t1 = text("Sign in with ");
			t2 = text(t2_value);
			attr(img, "alt", "");
			attr(img, "src", img_src_value = ctx.item.i);
			attr(img, "class", "svelte-aggp9g");
			attr(span, "class", "svelte-aggp9g");
			button.disabled = ctx.loading;
			attr(button, "class", button_class_value = "btn btn-primary firebaseui-idp-" + ctx.item.c + " mb-3 w-100" + " svelte-aggp9g");
			dispose = listen(button, "click", click_handler);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, img);
			append(button, t0);
			append(button, span);
			append(span, t1);
			append(span, t2);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.signInOptions) && img_src_value !== (img_src_value = ctx.item.i)) {
				attr(img, "src", img_src_value);
			}

			if ((changed.signInOptions) && t2_value !== (t2_value = ctx.item.t + "")) {
				set_data(t2, t2_value);
			}

			if (changed.loading) {
				button.disabled = ctx.loading;
			}

			if ((changed.signInOptions) && button_class_value !== (button_class_value = "btn btn-primary firebaseui-idp-" + ctx.item.c + " mb-3 w-100" + " svelte-aggp9g")) {
				attr(button, "class", button_class_value);
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

// (352:4) {#if error_message}
function create_if_block_4(ctx) {
	var div, t;

	return {
		c() {
			div = element("div");
			t = text(ctx.error_message);
			attr(div, "class", "text-danger mt-3");
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

// (337:4) {#if error_message}
function create_if_block_3(ctx) {
	var div, t;

	return {
		c() {
			div = element("div");
			t = text(ctx.error_message);
			attr(div, "class", "text-danger mt-3");
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

// (282:4) {#if error_message}
function create_if_block_1(ctx) {
	var div, t;

	return {
		c() {
			div = element("div");
			t = text(ctx.error_message);
			attr(div, "class", "text-danger mt-3");
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

function create_fragment(ctx) {
	var if_block_anchor;

	function select_block_type(changed, ctx) {
		if (ctx.mode == 'email_signin') return create_if_block;
		if (ctx.mode == 'email_signup') return create_if_block_2;
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

let locked_redirect = false;

function instance($$self, $$props, $$invalidate) {
	let { lang, redirect_url = "" } = $$props;
  let firebase;
  let email = "";
  let password = "";
  let password_repeat = "";
  let first_lastname = "";
  let error_message = null;
  let loading = false;
  let mode = "";
  let unreg_auth_listener;
  let { legal_link_new_tab = false } = $$props;
  onDestroy(() => {
   if (unreg_auth_listener) unreg_auth_listener();
      unreg_auth_listener = null;
  });

  const redirect = new URL(window.location).searchParams.get("redirect");

  function determine_redirect_url(redirect_url) {
    if (redirect) return window.location.origin + decodeURIComponent(redirect);
    if (redirect_url != null) {
      if (redirect_url.startsWith("/dashboard")) {
        return (
          window.location.origin + langpath + decodeURIComponent(redirect_url)
        );
      } else {
        return window.location.origin + decodeURIComponent(redirect_url);
      }
    }
    return redirect_url;
  }
  // {p:firebase.auth.GoogleAuthProvider.PROVIDER_ID,i:"https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg"},
  // {p:firebase.auth.GoogleAuthProvider.PROVIDER_ID,i:"https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg"},

  async function start() {
    let module = await import('../../../../../../../../js/cmp/userdata.js');
    $$invalidate('firebase', firebase = module.firebase);
    if (unreg_auth_listener) unreg_auth_listener();
    unreg_auth_listener = firebase.auth().onAuthStateChanged(
      user => {
        if (user && !locked_redirect) {
          setTimeout(perform_redirect, 200);
        }
      },
      error => {
        console.log(error);
        $$invalidate('error_message', error_message = error.message);
      }
    );
  }
  start();

  function perform_redirect() {
    if (!successURL) return;

    // Create redirect url. Use successURL as base and copy over other search parameters
    const params = new URL(window.location).searchParams;
    let target = new URL(successURL);
    for (let p of params.entries()) {
      if (p[0] !== "redirect") continue;
      target.searchParams.append(p[0], p[1]);
    }
    window.location.assign(target);
  }

  function email_create_account(e) {
    e.preventDefault();
    if (first_lastname.trim().length == 0) {
      $$invalidate('error_message', error_message =
        "No first and lastname set. We will only use your name to write you nice to read email greeting lines.");
      return;
    }
    if (password != password_repeat) {
      $$invalidate('error_message', error_message = "Your passwords don't match.");
      return;
    }
    $$invalidate('loading', loading = true);
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(user => {
        return user.updateProfile({
          displayName: first_lastname
        });
      })
      .then(perform_redirect)
      .catch(error => {
        $$invalidate('loading', loading = false);
        $$invalidate('error_message', error_message = error.message); // .code
      });
  }
  function signin_with_email(e) {
    e.preventDefault();
    $$invalidate('loading', loading = true);
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .catch(error => {
        $$invalidate('loading', loading = false);
        $$invalidate('error_message', error_message = error.message);
      });
  }
  function signin(e, item) {
    e.stopPropagation();
    e.preventDefault();
    if (item.c === "email") {
      $$invalidate('mode', mode = "email_signin");
    } else {
      $$invalidate('loading', loading = true);
      firebase
        .auth()
        .signInWithPopup(new item.p())
        .catch(error => {
          $$invalidate('loading', loading = false);
          $$invalidate('error_message', error_message = error.message);
        });
    }
  }
  function emailsignup(e) {
    e.stopPropagation();
    e.preventDefault();
    $$invalidate('loading', loading = false);
    $$invalidate('mode', mode = "email_signup");
    $$invalidate('error_message', error_message = null);
  }
  function back_to_sign_in() {
    $$invalidate('loading', loading = false);
    $$invalidate('mode', mode = "email_signin");
    $$invalidate('error_message', error_message = null);
  }

	function input0_input_handler() {
		email = this.value;
		$$invalidate('email', email);
	}

	function input1_input_handler() {
		password = this.value;
		$$invalidate('password', password);
	}

	function input0_input_handler_1() {
		email = this.value;
		$$invalidate('email', email);
	}

	function input1_input_handler_1() {
		password = this.value;
		$$invalidate('password', password);
	}

	function input2_input_handler() {
		password_repeat = this.value;
		$$invalidate('password_repeat', password_repeat);
	}

	function input3_input_handler() {
		first_lastname = this.value;
		$$invalidate('first_lastname', first_lastname);
	}

	const click_handler = ({ item }, e) => signin(e, item);

	$$self.$set = $$props => {
		if ('lang' in $$props) $$invalidate('lang', lang = $$props.lang);
		if ('redirect_url' in $$props) $$invalidate('redirect_url', redirect_url = $$props.redirect_url);
		if ('legal_link_new_tab' in $$props) $$invalidate('legal_link_new_tab', legal_link_new_tab = $$props.legal_link_new_tab);
	};

	let langpath, tosUrl, privacyPolicyUrl, successURL, signInOptions;

	$$self.$$.update = ($$dirty = { lang: 1, langpath: 1, redirect_url: 1, firebase: 1 }) => {
		if ($$dirty.lang) { $$invalidate('langpath', langpath = lang == "en" ? "" : "/" + lang); }
		if ($$dirty.langpath) { $$invalidate('tosUrl', tosUrl = langpath + "/terms"); }
		if ($$dirty.langpath) { $$invalidate('privacyPolicyUrl', privacyPolicyUrl = langpath + "/privacy"); }
		if ($$dirty.redirect_url) { successURL = determine_redirect_url(redirect_url); }
		if ($$dirty.firebase) { $$invalidate('signInOptions', signInOptions = [
        {
          p: firebase ? firebase.auth.GoogleAuthProvider : null,
          i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
          c: "google",
          t: "Google"
        },
        {
          p: firebase ? firebase.auth.GithubAuthProvider : null,
          i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
          c: "github",
          t: "Github"
        },
        {
          p: firebase ? firebase.auth.EmailAuthProvider : null,
          i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
          c: "email",
          t: "email"
        }
      ]); }
	};

	return {
		lang,
		redirect_url,
		email,
		password,
		password_repeat,
		first_lastname,
		error_message,
		loading,
		mode,
		legal_link_new_tab,
		email_create_account,
		signin_with_email,
		signin,
		emailsignup,
		back_to_sign_in,
		tosUrl,
		privacyPolicyUrl,
		signInOptions,
		input0_input_handler,
		input1_input_handler,
		input0_input_handler_1,
		input1_input_handler_1,
		input2_input_handler,
		input3_input_handler,
		click_handler
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-aggp9g-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, ["lang", "redirect_url", "legal_link_new_tab"]);
	}
}

window.customElements.define('ui-login', class extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.cmp = new Cmp({
            target: this, props: {
                redirect_url: this.hasAttribute("no-redirect") ? null : (this.getAttribute("redirecturl") || "/dashboard"),
                lang: this.hasAttribute("lang") ? this.getAttribute("lang") : "en",
                legal_link_new_tab: this.hasAttribute("legal-link-new-tab")
            }
        });
    }
    disconnectedCallback() {
        if (this.cmp) this.cmp.$destroy();
    }
});
//# sourceMappingURL=ui-login.js.map
