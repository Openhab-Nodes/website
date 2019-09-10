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
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
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
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
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

var oauth_clients = {ohx:{id:"ohx",title:"OpenHAB X Installation",author:"David Gräff",logo_url:"/img/openhab-installation.svg",redirect_uri:[],scopes:["device","offline_access"]},addoncli:{id:"addoncli",title:"Addon Registry Tool",author:"David Gräff",logo_url:"/img/openhab-cli.svg",redirect_uri:["https://openhabx.com/oauth_device_confirm"],requires_state:true,scopes:["addons","profile","offline_access"]},amazon_echo:{id:"amazon_echo",secret:"MCG3U2FUKINEJ",title:"Alexa Smarthome Skill",author:"Amazon",logo_url:"/img/alexa_logo.png",redirect_uri:["https://layla.amazon.com/api/skill/link/MCG3U2FUKINEJ","https://pitangui.amazon.com/api/skill/link/MCG3U2FUKINEJ","https://alexa.amazon.co.jp/api/skill/link/MCG3U2FUKINEJ"],scopes:["device","offline_access"]}};

var oauth_scopes = {profile:{title:"Public Profile",description:"Allow access to your name and e-mail address",icon:"https://www.openhabx.com/icons/oauth/profile.png","fa-class":"fas fa-cloud"},account:{title:"Account Access",description:"Allow access to your account settings. Required to request or change backup schedules.",icon:"https://www.openhabx.com/icons/oauth/account.png","fa-class":"fas fa-cloud"},device:{title:"Cloud Connector",description:"Potential access to all configured Things and Thing States. Fine tune access in your OHX installation.",icon:"https://www.openhabx.com/icons/oauth/device.png","fa-class":"fas fa-cloud"},addons:{title:"Addon Registry",description:"Allows adding, altering own Addon Registry entries.",icon:"https://www.openhabx.com/icons/oauth/device.png","fa-class":"fas fa-sitemap"},admin:{title:"",description:"Full access",icon:"https://www.openhabx.com/icons/oauth/account.png","fa-class":"fas fa-cloud"}};

/* assets/js/ui-oauth/cmp.svelte generated by Svelte v3.12.0 */

function add_css() {
	var style = element("style");
	style.id = 'svelte-psf4zb-style';
	style.textContent = ".entry.svelte-psf4zb{display:flex;margin-bottom:1em}.entry.svelte-psf4zb>img.svelte-psf4zb{width:2.5em;height:2.5em;margin-right:1em}.entry.svelte-psf4zb>i.svelte-psf4zb{font-size:2.5em;line-height:1;width:65px}.logos.svelte-psf4zb{display:flex;justify-content:center;margin-bottom:3em}.logos.svelte-psf4zb>img.svelte-psf4zb{max-width:120px;max-height:120px}hr.svelte-psf4zb{margin:0}.dashline.svelte-psf4zb line.svelte-psf4zb{stroke:#b1b1b1;stroke-dasharray:8;stroke-width:5}.dashline.svelte-psf4zb circle.svelte-psf4zb{fill:rgb(0, 158, 0)}.opacity50.svelte-psf4zb{opacity:0.5}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object.create(ctx);
	child_ctx.scope_entry = list[i];
	return child_ctx;
}

// (177:0) {:else}
function create_else_block(ctx) {
	var h1, t0, t1_value = ctx.client_name || ctx.client.title + "", t1, t2, div7, div3, div2, img, img_src_value, t3, div1, b0, t4_value = ctx.client.title + "", t4, t5, i, t6_value = ctx.client.author + "", t6, t7, div0, t8, b1, t9_value = ctx.user.displayName || ctx.user.email + "", t9, t10, t11, t12, hr, t13, div6, div4, input, t14, label, t16, div5, t18, button, t19, t20_value = ctx.client_name || ctx.client.title + "", t20, button_disabled_value, t21, t22, div8, dispose;

	let each_value = oauth_scopes;

	let each_blocks = [];

	for (let i_1 = 0; i_1 < each_value.length; i_1 += 1) {
		each_blocks[i_1] = create_each_block(get_each_context(ctx, each_value, i_1));
	}

	var if_block = (ctx.client.redirect_uri) && create_if_block_3(ctx);

	return {
		c() {
			h1 = element("h1");
			t0 = text("Authorize ");
			t1 = text(t1_value);
			t2 = space();
			div7 = element("div");
			div3 = element("div");
			div2 = element("div");
			img = element("img");
			t3 = space();
			div1 = element("div");
			b0 = element("b");
			t4 = text(t4_value);
			t5 = text("\n          by\n          ");
			i = element("i");
			t6 = text(t6_value);
			t7 = space();
			div0 = element("div");
			t8 = text("wants to access your\n            ");
			b1 = element("b");
			t9 = text(t9_value);
			t10 = text("\n            account");
			t11 = space();

			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
				each_blocks[i_1].c();
			}

			t12 = space();
			hr = element("hr");
			t13 = space();
			div6 = element("div");
			div4 = element("div");
			input = element("input");
			t14 = space();
			label = element("label");
			label.textContent = "Limited Access (60 minutes)*";
			t16 = space();
			div5 = element("div");
			div5.textContent = "You can revoke unlimited authorisations in your account settings.";
			t18 = space();
			button = element("button");
			t19 = text("Authorize ");
			t20 = text(t20_value);
			t21 = space();
			if (if_block) if_block.c();
			t22 = space();
			div8 = element("div");
			div8.innerHTML = `
			    Learn more about access tokens on your
			    <a href="/dashboard/access_tokens">accounts dashboard</a>`;
			attr(h1, "class", "text-center");
			attr(img, "src", img_src_value = ctx.client.logo_url);
			attr(img, "alt", "Logo");
			attr(img, "class", "svelte-psf4zb");
			attr(div2, "class", "entry svelte-psf4zb");
			attr(div3, "class", "card-body");
			attr(hr, "class", "svelte-psf4zb");
			attr(input, "type", "checkbox");
			attr(input, "class", "custom-control-input");
			attr(input, "name", "binding");
			attr(label, "class", "custom-control-label");
			attr(label, "for", "chkBindings");
			attr(div4, "class", "custom-control custom-checkbox");
			attr(div5, "class", "text-center small");
			attr(button, "class", "btn btn-success w-100 mb-2");
			button.disabled = button_disabled_value = ctx.client.disabled || !ctx.user.uid;
			attr(div6, "class", "card-body");
			attr(div7, "class", "card mb-4 svelte-psf4zb");
			toggle_class(div7, "opacity50", ctx.client.disabled || !ctx.user.uid);
			attr(div8, "class", "small text-center");

			dispose = [
				listen(input, "change", ctx.input_change_handler),
				listen(button, "click", ctx.authorize)
			];
		},

		m(target_1, anchor) {
			insert(target_1, h1, anchor);
			append(h1, t0);
			append(h1, t1);
			insert(target_1, t2, anchor);
			insert(target_1, div7, anchor);
			append(div7, div3);
			append(div3, div2);
			append(div2, img);
			append(div2, t3);
			append(div2, div1);
			append(div1, b0);
			append(b0, t4);
			append(div1, t5);
			append(div1, i);
			append(i, t6);
			append(div1, t7);
			append(div1, div0);
			append(div0, t8);
			append(div0, b1);
			append(b1, t9);
			append(div0, t10);
			append(div3, t11);

			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
				each_blocks[i_1].m(div3, null);
			}

			append(div7, t12);
			append(div7, hr);
			append(div7, t13);
			append(div7, div6);
			append(div6, div4);
			append(div4, input);

			input.checked = ctx.limited_access;

			append(div4, t14);
			append(div4, label);
			append(div6, t16);
			append(div6, div5);
			append(div6, t18);
			append(div6, button);
			append(button, t19);
			append(button, t20);
			append(div6, t21);
			if (if_block) if_block.m(div6, null);
			insert(target_1, t22, anchor);
			insert(target_1, div8, anchor);
		},

		p(changed, ctx) {
			if ((changed.client) && t1_value !== (t1_value = ctx.client_name || ctx.client.title + "")) {
				set_data(t1, t1_value);
			}

			if ((changed.client) && img_src_value !== (img_src_value = ctx.client.logo_url)) {
				attr(img, "src", img_src_value);
			}

			if ((changed.client) && t4_value !== (t4_value = ctx.client.title + "")) {
				set_data(t4, t4_value);
			}

			if ((changed.client) && t6_value !== (t6_value = ctx.client.author + "")) {
				set_data(t6, t6_value);
			}

			if ((changed.user) && t9_value !== (t9_value = ctx.user.displayName || ctx.user.email + "")) {
				set_data(t9, t9_value);
			}

			if (changed.oauth_scopes) {
				each_value = oauth_scopes;

				let i_1;
				for (i_1 = 0; i_1 < each_value.length; i_1 += 1) {
					const child_ctx = get_each_context(ctx, each_value, i_1);

					if (each_blocks[i_1]) {
						each_blocks[i_1].p(changed, child_ctx);
					} else {
						each_blocks[i_1] = create_each_block(child_ctx);
						each_blocks[i_1].c();
						each_blocks[i_1].m(div3, null);
					}
				}

				for (; i_1 < each_blocks.length; i_1 += 1) {
					each_blocks[i_1].d(1);
				}
				each_blocks.length = each_value.length;
			}

			if (changed.limited_access) input.checked = ctx.limited_access;

			if ((changed.client) && t20_value !== (t20_value = ctx.client_name || ctx.client.title + "")) {
				set_data(t20, t20_value);
			}

			if ((changed.client || changed.user) && button_disabled_value !== (button_disabled_value = ctx.client.disabled || !ctx.user.uid)) {
				button.disabled = button_disabled_value;
			}

			if (ctx.client.redirect_uri) {
				if (if_block) {
					if_block.p(changed, ctx);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(div6, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if ((changed.client || changed.user)) {
				toggle_class(div7, "opacity50", ctx.client.disabled || !ctx.user.uid);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h1);
				detach(t2);
				detach(div7);
			}

			destroy_each(each_blocks, detaching);

			if (if_block) if_block.d();

			if (detaching) {
				detach(t22);
				detach(div8);
			}

			run_all(dispose);
		}
	};
}

// (174:0) {#if user === null}
function create_if_block_2(ctx) {
	var h1, t0, t1_value = ctx.client.title + "", t1, t2, ui_login;

	return {
		c() {
			h1 = element("h1");
			t0 = text("Login to authorize ");
			t1 = text(t1_value);
			t2 = space();
			ui_login = element("ui-login");
			attr(h1, "class", "text-center");
			set_custom_element_data(ui_login, "no-redirect", "");
			set_custom_element_data(ui_login, "legal-link-new-tab", "");
		},

		m(target_1, anchor) {
			insert(target_1, h1, anchor);
			append(h1, t0);
			append(h1, t1);
			insert(target_1, t2, anchor);
			insert(target_1, ui_login, anchor);
		},

		p(changed, ctx) {
			if ((changed.client) && t1_value !== (t1_value = ctx.client.title + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h1);
				detach(t2);
				detach(ui_login);
			}
		}
	};
}

// (194:6) {#each oauth_scopes as scope_entry}
function create_each_block(ctx) {
	var div2, i, t0, div1, t1_value = ctx.scope_entry.title + "", t1, t2, div0, t3_value = ctx.scope_entry.description + "", t3, t4;

	return {
		c() {
			div2 = element("div");
			i = element("i");
			t0 = space();
			div1 = element("div");
			t1 = text(t1_value);
			t2 = space();
			div0 = element("div");
			t3 = text(t3_value);
			t4 = space();
			attr(i, "class", "" + ctx.scope_entry['fa-class'] + " svelte-psf4zb");
			attr(div2, "class", "entry svelte-psf4zb");
		},

		m(target_1, anchor) {
			insert(target_1, div2, anchor);
			append(div2, i);
			append(div2, t0);
			append(div2, div1);
			append(div1, t1);
			append(div1, t2);
			append(div1, div0);
			append(div0, t3);
			append(div2, t4);
		},

		p: noop,

		d(detaching) {
			if (detaching) {
				detach(div2);
			}
		}
	};
}

// (225:6) {#if client.redirect_uri}
function create_if_block_3(ctx) {
	var div1, t0, div0, b, t1_value = ctx.client.redirect_uri + "", t1;

	return {
		c() {
			div1 = element("div");
			t0 = text("Authorizing will redirect to\n          ");
			div0 = element("div");
			b = element("b");
			t1 = text(t1_value);
			attr(div1, "class", "text-center");
		},

		m(target_1, anchor) {
			insert(target_1, div1, anchor);
			append(div1, t0);
			append(div1, div0);
			append(div0, b);
			append(b, t1);
		},

		p(changed, ctx) {
			if ((changed.client) && t1_value !== (t1_value = ctx.client.redirect_uri + "")) {
				set_data(t1, t1_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div1);
			}
		}
	};
}

// (240:0) {#if error_messages}
function create_if_block_1(ctx) {
	var p, t;

	return {
		c() {
			p = element("p");
			t = text(ctx.error_messages);
		},

		m(target_1, anchor) {
			insert(target_1, p, anchor);
			append(p, t);
		},

		p(changed, ctx) {
			if (changed.error_messages) {
				set_data(t, ctx.error_messages);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (243:0) {#if done_without_redirect}
function create_if_block(ctx) {
	var div;

	return {
		c() {
			div = element("div");
			div.textContent = "Device or Addon Registry Command Line Tool authorisation confirmed. You can\n    close this window now.";
			set_style(div, "max-width", "500px");
			set_style(div, "margin", "auto");
		},

		m(target_1, anchor) {
			insert(target_1, div, anchor);
		},

		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

function create_fragment(ctx) {
	var div, img0, img0_src_value, t0, svg, line, circle, g, path, t1, img1, t2, t3, t4, if_block2_anchor;

	function select_block_type(changed, ctx) {
		if (ctx.user === null) return create_if_block_2;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block0 = current_block_type(ctx);

	var if_block1 = (ctx.error_messages) && create_if_block_1(ctx);

	var if_block2 = (ctx.done_without_redirect) && create_if_block();

	return {
		c() {
			div = element("div");
			img0 = element("img");
			t0 = space();
			svg = svg_element("svg");
			line = svg_element("line");
			circle = svg_element("circle");
			g = svg_element("g");
			path = svg_element("path");
			t1 = space();
			img1 = element("img");
			t2 = space();
			if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			if_block2_anchor = empty();
			attr(img0, "src", img0_src_value = ctx.client ? ctx.client.logo_url : '');
			attr(img0, "alt", "Loading");
			attr(img0, "class", "svelte-psf4zb");
			attr(line, "x1", "0");
			attr(line, "x2", "180");
			attr(line, "y1", "60");
			attr(line, "y2", "60");
			attr(line, "class", "svelte-psf4zb");
			attr(circle, "cx", "90");
			attr(circle, "cy", "60");
			attr(circle, "r", "20");
			attr(circle, "class", "svelte-psf4zb");
			attr(path, "fill", "white");
			attr(path, "d", "M 19.28125 5.28125 L 9 15.5625 L 4.71875 11.28125 L 3.28125 12.71875\n        L 8.28125 17.71875 L 9 18.40625 L 9.71875 17.71875 L 20.71875 6.71875 Z ");
			attr(g, "transform", "translate(78,50)");
			attr(svg, "class", "dashline svelte-psf4zb");
			attr(svg, "width", "180");
			attr(svg, "height", "120");
			attr(img1, "src", "/img/logo.png");
			attr(img1, "alt", "Logo");
			attr(img1, "class", "svelte-psf4zb");
			attr(div, "class", "logos svelte-psf4zb");
		},

		m(target_1, anchor) {
			insert(target_1, div, anchor);
			append(div, img0);
			append(div, t0);
			append(div, svg);
			append(svg, line);
			append(svg, circle);
			append(svg, g);
			append(g, path);
			append(div, t1);
			append(div, img1);
			insert(target_1, t2, anchor);
			if_block0.m(target_1, anchor);
			insert(target_1, t3, anchor);
			if (if_block1) if_block1.m(target_1, anchor);
			insert(target_1, t4, anchor);
			if (if_block2) if_block2.m(target_1, anchor);
			insert(target_1, if_block2_anchor, anchor);
		},

		p(changed, ctx) {
			if ((changed.client) && img0_src_value !== (img0_src_value = ctx.client ? ctx.client.logo_url : '')) {
				attr(img0, "src", img0_src_value);
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
				if_block0.p(changed, ctx);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);
				if (if_block0) {
					if_block0.c();
					if_block0.m(t3.parentNode, t3);
				}
			}

			if (ctx.error_messages) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(t4.parentNode, t4);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (ctx.done_without_redirect) {
				if (!if_block2) {
					if_block2 = create_if_block();
					if_block2.c();
					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},

		i: noop,
		o: noop,

		d(detaching) {
			if (detaching) {
				detach(div);
				detach(t2);
			}

			if_block0.d(detaching);

			if (detaching) {
				detach(t3);
			}

			if (if_block1) if_block1.d(detaching);

			if (detaching) {
				detach(t4);
			}

			if (if_block2) if_block2.d(detaching);

			if (detaching) {
				detach(if_block2_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	

  let { classes = "" } = $$props;

  let firebase;
  let userdata;
  let data;
  let user = {};
  let error_messages = null;
  let done_without_redirect = false;
  let limited_access = false;
  let unsubscribe_user_listener = () => {};
  onDestroy(() => {
    userdata.removeEventListener("data", userdata_changed);
    unsubscribe_user_listener();
    unsubscribe_user_listener = () => {};
  });

  // Extract everything from the URL. We are redirected from `oauth.openhabx.com/authorize`
  // and additionally to the normal oauth arguments (client_id etc) there's also "code"
  // and "unsigned" which are required to call `oauth.openhabx.com/grant_scopes`.
  const url = new URL(window.location);
  const redirect_uri = url.searchParams.get("redirect_uri");
  const client_id = url.searchParams.get("client_id");
  const client_secret = url.searchParams.get("client_secret");
  const client_name = url.searchParams.get("client_name");
  const response_type = url.searchParams.get("response_type");
  const code = url.searchParams.get("code");
  const unsigned = url.searchParams.get("unsigned");
  const state = url.searchParams.get("state");
  const scope = (() => {
    let scope = url.searchParams.get("scope");
    if (scope) scope = scope.split(" ");
    return scope || "";
  })();

  const client = oauth_clients[client_id];

  function userdata_changed(data_event) {
    data = data_event.detail;
  }

  async function start_user_login() {
    const module = await import('../../../../../../../../js/cmp/userdata.js');
    firebase = module.firebase;
    userdata = module.userdata;
    await userdata.ready();
    data = userdata.data || {};
    unsubscribe_user_listener = firebase.auth().onAuthStateChanged(
      u => {
        $$invalidate('user', user = u);
      },
      error => {
        loading_msg = "Connection Issue!";
      }
    );
    userdata.addEventListener("data", userdata_changed);
  }

  start_user_login().catch(err => {
    $$invalidate('error_messages', error_messages = err.message);
    console.warn("OAuth Dialog", err, error_messages);
  });

  async function authorize() {
    $$invalidate('client', client.disabled = true, client);

    let uri = null;
    if (redirect_uri) {
      uri = redirect_uri
        ? decodeURIComponent(redirect_uri)
        : client.redirect_uri[0];
      if (uri.startsWith("/"))
        uri = window.location.origin + decodeURIComponent(redirect_uri);
      if (!client.redirect_uri.includes(uri)) {
        $$invalidate('error_messages', error_messages = `Redirect URI ${uri} invalid!`);
        return;
      }
      uri = new URL(uri);
      if (state) uri.searchParams.append("tag", state);
      console.log(uri, user.ra);
    }

    try {
      const response = await userdata.fetchWithAuth(
        "oauth.openhabx.com/grant_scopes",
        "POST",
        JSON.stringify({
          unsigned,
          code,
          scopes: scope
        })
      );
      if (response.status !== 200)
        throw new Error("oauth.openhabx.com/grant_scopes not reachable!");
      const oauth_code = await response.text();
      
      if (uri) uri.searchParams.append("code", oauth_code);
    } catch (err) {
      $$invalidate('error_messages', error_messages = `Failed to fetch authorisation code: ${err.message}`);
      return;
    }

    if (uri) {
      setTimeout(() => window.location.assign(target), 500);
    } else {
      $$invalidate('done_without_redirect', done_without_redirect = true);
    }
  }

	function input_change_handler() {
		limited_access = this.checked;
		$$invalidate('limited_access', limited_access);
	}

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	return {
		classes,
		user,
		error_messages,
		done_without_redirect,
		limited_access,
		client_name,
		client,
		authorize,
		input_change_handler
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-psf4zb-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, ["classes"]);
	}
}

window.customElements.define('ui-oauth', class extends HTMLElement {
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
//# sourceMappingURL=ui-oauth.js.map
