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
function get_binding_group_value(group) {
    const value = [];
    for (let i = 0; i < group.length; i += 1) {
        if (group[i].checked)
            value.push(group[i].__value);
    }
    return value;
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
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

var oauth_clients = {ohx:{id:"ohx",title:"OHX Installation",author:"David Gräff",logo_url:"/img/oauth-client-cloud-connector.png",scopes:["device"]},addoncli:{id:"addoncli",title:"Addon Registry Tool",author:"David Gräff",logo_url:"/img/oauth-client-addon-cli.png",requires_state:true,scopes:["addons"]},amazon_echo:{id:"amazon_echo",secret:"MCG3U2FUKINEJ",title:"Alexa Smarthome Skill",author:"Amazon",logo_url:"/img/alexa_logo.png",redirect_uri:["https://layla.amazon.com/api/skill/link/MCG3U2FUKINEJ","https://pitangui.amazon.com/api/skill/link/MCG3U2FUKINEJ","https://alexa.amazon.co.jp/api/skill/link/MCG3U2FUKINEJ"],scopes:["device","offline_access"]}};

var oauth_scopes = {profile:{title:"Public Profile",description:"Allow access to your name and e-mail address",icon:"https://www.openhabx.com/icons/oauth/profile.png","fa-class":"fas fa-cloud"},account:{title:"Account Access",description:"Allow access to your account settings. Required to request or change backup schedules.",icon:"https://www.openhabx.com/icons/oauth/account.png","fa-class":"fas fa-cloud"},device:{title:"Cloud Connector",description:"Potential access to all configured Things and Thing States. Fine tune access in your OHX installation.",icon:"https://www.openhabx.com/icons/oauth/device.png","fa-class":"fas fa-cloud"},addons:{title:"Addon Registry",description:"Allows adding, altering own Addon Registry entries.",icon:"https://www.openhabx.com/icons/oauth/device.png","fa-class":"fas fa-sitemap"},admin:{title:"",description:"Full access",icon:"https://www.openhabx.com/icons/oauth/account.png","fa-class":"fas fa-cloud"}};

/* assets/js/ui-oauth/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = 'svelte-v20aic-style';
	style.textContent = ".entry.svelte-v20aic{display:flex;margin-bottom:1em}.entry.svelte-v20aic>img.svelte-v20aic{max-width:5em;height:2.5em;margin-right:1em;object-fit:contain}.entry.svelte-v20aic>i.svelte-v20aic{font-size:2.5em;line-height:1;width:65px}.logos.svelte-v20aic{display:flex;justify-content:center;margin-bottom:1em}.logos.svelte-v20aic>img.svelte-v20aic{max-width:120px;max-height:120px;object-fit:contain}hr.svelte-v20aic{margin:0}.dashline.svelte-v20aic line.svelte-v20aic{stroke:#b1b1b1;stroke-dasharray:8;stroke-width:5}.opacity50.svelte-v20aic{opacity:0.5}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.scope_id = list[i][0];
	child_ctx.scope_entry = list[i][1];
	return child_ctx;
}

// (185:0) {:else}
function create_else_block(ctx) {
	var h4, t0, t1_value = ctx.client_name || ctx.client.title + "", t1, t2, div6, div3, div2, img, img_src_value, t3, div1, b0, t4_value = ctx.client.title + "", t4, t5, i, t6_value = ctx.client.author + "", t6, t7, div0, t8, b1, t9_value = ctx.user.displayName || ctx.user.email + "", t9, t10, t11, t12, hr, t13, div5, button, t14, t15_value = ctx.client_name || ctx.client.title + "", t15, button_disabled_value, t16, div4, t17, show_if = !ctx.client.scopes.includes('offline_access'), t18, t19, div7, dispose;

	let each_value = ctx.Object.entries(oauth_scopes);

	let each_blocks = [];

	for (let i_1 = 0; i_1 < each_value.length; i_1 += 1) {
		each_blocks[i_1] = create_each_block(get_each_context(ctx, each_value, i_1));
	}

	var if_block0 = (show_if) && create_if_block_5(ctx);

	var if_block1 = (ctx.redirect_uri) && create_if_block_4(ctx);

	return {
		c() {
			h4 = element("h4");
			t0 = text("Authorize ");
			t1 = text(t1_value);
			t2 = space();
			div6 = element("div");
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
			div5 = element("div");
			button = element("button");
			t14 = text("Authorize ");
			t15 = text(t15_value);
			t16 = space();
			div4 = element("div");
			t17 = text("You can revoke unlimited authorisations in your account settings.\n        ");
			if (if_block0) if_block0.c();
			t18 = space();
			if (if_block1) if_block1.c();
			t19 = space();
			div7 = element("div");
			div7.innerHTML = `
			    Learn more about access tokens on your
			    <a target="_blank" href="/dashboard/access_tokens">accounts dashboard</a>`;
			attr(h4, "class", "text-center");
			attr(img, "src", img_src_value = ctx.client.logo_url);
			attr(img, "alt", "Logo");
			attr(img, "class", "svelte-v20aic");
			attr(div2, "class", "entry svelte-v20aic");
			attr(div3, "class", "card-body");
			attr(hr, "class", "svelte-v20aic");
			attr(button, "class", "btn btn-success w-100 mb-2");
			button.disabled = button_disabled_value = ctx.client.disabled || !ctx.user.uid;
			attr(div4, "class", "text-center small");
			attr(div5, "class", "card-body");
			attr(div6, "class", "card mb-4 svelte-v20aic");
			toggle_class(div6, "opacity50", ctx.client.disabled || !ctx.user.uid);
			attr(div7, "class", "small text-center");
			dispose = listen(button, "click", ctx.authorize);
		},

		m(target_1, anchor) {
			insert(target_1, h4, anchor);
			append(h4, t0);
			append(h4, t1);
			insert(target_1, t2, anchor);
			insert(target_1, div6, anchor);
			append(div6, div3);
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

			append(div6, t12);
			append(div6, hr);
			append(div6, t13);
			append(div6, div5);
			append(div5, button);
			append(button, t14);
			append(button, t15);
			append(div5, t16);
			append(div5, div4);
			append(div4, t17);
			if (if_block0) if_block0.m(div4, null);
			append(div5, t18);
			if (if_block1) if_block1.m(div5, null);
			insert(target_1, t19, anchor);
			insert(target_1, div7, anchor);
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

			if (changed.scope || changed.Object || changed.oauth_scopes || changed.client || changed.selected_scopes) {
				each_value = ctx.Object.entries(oauth_scopes);

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

			if ((changed.client) && t15_value !== (t15_value = ctx.client_name || ctx.client.title + "")) {
				set_data(t15, t15_value);
			}

			if ((changed.client || changed.user) && button_disabled_value !== (button_disabled_value = ctx.client.disabled || !ctx.user.uid)) {
				button.disabled = button_disabled_value;
			}

			if (changed.client) show_if = !ctx.client.scopes.includes('offline_access');

			if (show_if) {
				if (if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0 = create_if_block_5(ctx);
					if_block0.c();
					if_block0.m(div4, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (ctx.redirect_uri) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_4(ctx);
					if_block1.c();
					if_block1.m(div5, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if ((changed.client || changed.user)) {
				toggle_class(div6, "opacity50", ctx.client.disabled || !ctx.user.uid);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(h4);
				detach(t2);
				detach(div6);
			}

			destroy_each(each_blocks, detaching);

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();

			if (detaching) {
				detach(t19);
				detach(div7);
			}

			dispose();
		}
	};
}

// (180:32) 
function create_if_block_3(ctx) {
	var p, b, t0_value = ctx.client_name || ctx.client.title + "", t0, t1;

	return {
		c() {
			p = element("p");
			b = element("b");
			t0 = text(t0_value);
			t1 = text("\n    authorisation confirmed. You can close this window now.");
		},

		m(target_1, anchor) {
			insert(target_1, p, anchor);
			append(p, b);
			append(b, t0);
			append(p, t1);
		},

		p(changed, ctx) {
			if ((changed.client) && t0_value !== (t0_value = ctx.client_name || ctx.client.title + "")) {
				set_data(t0, t0_value);
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (174:39) 
function create_if_block_2(ctx) {
	var p, t0, b, t1_value = ctx.client.title + "", t1, t2, ui_login;

	return {
		c() {
			p = element("p");
			t0 = text("Please identify yourself before authorizing\n    ");
			b = element("b");
			t1 = text(t1_value);
			t2 = space();
			ui_login = element("ui-login");
			attr(p, "class", "text-center");
			set_custom_element_data(ui_login, "no-redirect", "");
			set_custom_element_data(ui_login, "legal-link-new-tab", "");
		},

		m(target_1, anchor) {
			insert(target_1, p, anchor);
			append(p, t0);
			append(p, b);
			append(b, t1);
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
				detach(p);
				detach(t2);
				detach(ui_login);
			}
		}
	};
}

// (170:0) {#if loading}
function create_if_block_1(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			attr(p, "class", "text-center");
		},

		m(target_1, anchor) {
			insert(target_1, p, anchor);
			p.innerHTML = ctx.loading;
		},

		p(changed, ctx) {
			if (changed.loading) {
				p.innerHTML = ctx.loading;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(p);
			}
		}
	};
}

// (203:8) {#if scope.includes(scope_id)}
function create_if_block_6(ctx) {
	var div1, i, t0, label, input, input_disabled_value, t1, t2_value = ctx.scope_entry.title + "", t2, t3, div0, t4_value = ctx.scope_entry.description + "", t4, t5, dispose;

	return {
		c() {
			div1 = element("div");
			i = element("i");
			t0 = space();
			label = element("label");
			input = element("input");
			t1 = space();
			t2 = text(t2_value);
			t3 = space();
			div0 = element("div");
			t4 = text(t4_value);
			t5 = space();
			attr(i, "class", "" + ctx.scope_entry['fa-class'] + " svelte-v20aic");
			ctx.$$binding_groups[0].push(input);
			attr(input, "type", "checkbox");
			input.checked = true;
			input.disabled = input_disabled_value = ctx.client.scopes.includes(ctx.scope_id);
			input.__value = ctx.scope_id;
			input.value = input.__value;
			attr(div0, "class", "small");
			attr(div1, "class", "entry svelte-v20aic");
			dispose = listen(input, "change", ctx.input_change_handler);
		},

		m(target_1, anchor) {
			insert(target_1, div1, anchor);
			append(div1, i);
			append(div1, t0);
			append(div1, label);
			append(label, input);

			input.checked = ~ctx.selected_scopes.indexOf(input.__value);

			append(label, t1);
			append(label, t2);
			append(label, t3);
			append(label, div0);
			append(div0, t4);
			append(div1, t5);
		},

		p(changed, ctx) {
			if (changed.selected_scopes) input.checked = ~ctx.selected_scopes.indexOf(input.__value);

			if ((changed.client) && input_disabled_value !== (input_disabled_value = ctx.client.scopes.includes(ctx.scope_id))) {
				input.disabled = input_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div1);
			}

			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input), 1);
			dispose();
		}
	};
}

// (202:6) {#each Object.entries(oauth_scopes) as [scope_id, scope_entry]}
function create_each_block(ctx) {
	var show_if = ctx.scope.includes(ctx.scope_id), if_block_anchor;

	var if_block = (show_if) && create_if_block_6(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},

		m(target_1, anchor) {
			if (if_block) if_block.m(target_1, anchor);
			insert(target_1, if_block_anchor, anchor);
		},

		p(changed, ctx) {
			if (show_if) if_block.p(changed, ctx);
		},

		d(detaching) {
			if (if_block) if_block.d(detaching);

			if (detaching) {
				detach(if_block_anchor);
			}
		}
	};
}

// (230:8) {#if !client.scopes.includes('offline_access')}
function create_if_block_5(ctx) {
	var t0, button, t1, button_disabled_value, t2, dispose;

	return {
		c() {
			t0 = text("You can also\n          ");
			button = element("button");
			t1 = text("Authorize for only 60 minutes");
			t2 = text("\n          .");
			attr(button, "class", "btn btn-link");
			button.disabled = button_disabled_value = ctx.client.disabled || !ctx.user.uid;
			dispose = listen(button, "click", ctx.authorize_limited);
		},

		m(target_1, anchor) {
			insert(target_1, t0, anchor);
			insert(target_1, button, anchor);
			append(button, t1);
			insert(target_1, t2, anchor);
		},

		p(changed, ctx) {
			if ((changed.client || changed.user) && button_disabled_value !== (button_disabled_value = ctx.client.disabled || !ctx.user.uid)) {
				button.disabled = button_disabled_value;
			}
		},

		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(button);
				detach(t2);
			}

			dispose();
		}
	};
}

// (241:6) {#if redirect_uri}
function create_if_block_4(ctx) {
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

// (256:0) {#if error_messages}
function create_if_block(ctx) {
	var p, t;

	return {
		c() {
			p = element("p");
			t = text(ctx.error_messages);
			attr(p, "class", "text-danger text-center mt-4");
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

function create_fragment(ctx) {
	var div, img0, img0_src_value, t0, svg, line, t1, img1, t2, t3, if_block1_anchor;

	function select_block_type(changed, ctx) {
		if (ctx.loading) return create_if_block_1;
		if (ctx.user === null || !ctx.user.email) return create_if_block_2;
		if (ctx.done_without_redirect) return create_if_block_3;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block0 = current_block_type(ctx);

	var if_block1 = (ctx.error_messages) && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			img0 = element("img");
			t0 = space();
			svg = svg_element("svg");
			line = svg_element("line");
			t1 = space();
			img1 = element("img");
			t2 = space();
			if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr(img0, "src", img0_src_value = ctx.client ? ctx.client.logo_url : '');
			attr(img0, "alt", "Loading");
			attr(img0, "class", "svelte-v20aic");
			attr(line, "x1", "0");
			attr(line, "x2", "180");
			attr(line, "y1", "60");
			attr(line, "y2", "60");
			attr(line, "class", "svelte-v20aic");
			attr(svg, "class", "dashline svelte-v20aic");
			attr(svg, "width", "180");
			attr(svg, "height", "120");
			attr(img1, "src", "/img/logo.png");
			attr(img1, "alt", "Logo");
			attr(img1, "class", "svelte-v20aic");
			attr(div, "class", "logos svelte-v20aic");
		},

		m(target_1, anchor) {
			insert(target_1, div, anchor);
			append(div, img0);
			append(div, t0);
			append(div, svg);
			append(svg, line);
			append(div, t1);
			append(div, img1);
			insert(target_1, t2, anchor);
			if_block0.m(target_1, anchor);
			insert(target_1, t3, anchor);
			if (if_block1) if_block1.m(target_1, anchor);
			insert(target_1, if_block1_anchor, anchor);
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
				detach(if_block1_anchor);
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	

  let { classes = "" } = $$props;

  let loading = "Fetching data &hellip;";
  let data;
  let userdata;
  let user = null;
  let error_messages = null;
  let done_without_redirect = false;
  let selected_scopes = [];
  let onDestroyProxy = () => {};
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import('../../../../../../../../js/cmp/userdata.js');
    $$invalidate('loading', loading = "Waiting for User Session &hellip;");
    onDestroyProxy = module.UserAwareComponent(
      user_ => {
        $$invalidate('loading', loading = "Waiting for confirmation &hellip;");
        $$invalidate('user', user = user_);
        setTimeout(() => ($$invalidate('loading', loading = null)), 700);
      },
      data_ => (data = data_)
    );
    userdata = module.userdata;
  }
  start().catch(err => {
    $$invalidate('error_messages', error_messages = err.message);
    console.warn("OAuth Dialog", err, error_messages);
  });

  // Extract everything from the URL. We are redirected from `oauth.openhabx.com/authorize`
  // and additionally to the normal oauth arguments (client_id etc) there's also "code"
  // and "unsigned" which are required to call `oauth.openhabx.com/grant_scopes`.
  const url = new URL(window.location);
  let redirect_uri = url.searchParams.get("redirect_uri");
  const client_id = url.searchParams.get("client_id");
  const client_secret = url.searchParams.get("client_secret");
  const client_name = url.searchParams.get("client_name");
  const response_type = url.searchParams.get("response_type");
  const code = url.searchParams.get("code");
  const unsigned = url.searchParams.get("unsigned");
  const state = url.searchParams.get("state");
  // Split scope string, which is whitespace separated into array
  // and preselect all scopes that are requested (as long as they are
  // listed in oauth_scopes).
  const scope = (() => {
    let scope = url.searchParams.get("scope");
    scope = scope ? scope.split(" ") : [];
    for (let scope_id of Object.keys(oauth_scopes)) {
      if (scope.includes(scope_id)) selected_scopes.push(scope_id);
    }
    return scope;
  })();

  const client = oauth_clients[client_id];

  if (redirect_uri && client) {
    if (!client.redirect_uri.includes(redirect_uri)) {
      $$invalidate('client', client.disabled = true, client);
      $$invalidate('error_messages', error_messages = `Invalid redirect URL ${redirect_uri}. This is probably our fault. Please report this problem.`);
      $$invalidate('redirect_uri', redirect_uri = null);
    } else {
      if (redirect_uri.startsWith("/"))
        $$invalidate('redirect_uri', redirect_uri =
          window.location.origin + decodeURIComponent(redirect_uri));
      else $$invalidate('redirect_uri', redirect_uri = decodeURIComponent(redirect_uri));

      $$invalidate('redirect_uri', redirect_uri = new URL(redirect_uri));
      if (state) redirect_uri.searchParams.append("state", state);
      console.log(redirect_uri, user.ra);
    }
  }

  function authorize_limited() {
    authorize(true);
  }

  async function authorize(limited = false) {
    $$invalidate('selected_scopes', selected_scopes = selected_scopes.filter(e => e != "offline_access"));
    if (!limited) selected_scopes.push("offline_access");

    $$invalidate('client', client.disabled = true, client);

    try {
      const response = await userdata.fetchWithAuth(
        "oauth.openhabx.com/grant_scopes",
        "POST",
        JSON.stringify({
          unsigned,
          code,
          scopes: selected_scopes
        })
      );
      if (response.status !== 200) throw new Error(response.text());
      const oauth_code = await response.text();

      if (redirect_uri) redirect_uri.searchParams.append("code", oauth_code);
    } catch (err) {
      $$invalidate('error_messages', error_messages = `Failed to fetch authorisation code: ${err.message}`);
      return;
    }

    if (redirect_uri) {
      setTimeout(() => window.location.assign(target), 500);
    } else {
      $$invalidate('done_without_redirect', done_without_redirect = true);
    }
  }

	const $$binding_groups = [[]];

	function input_change_handler() {
		selected_scopes = get_binding_group_value($$binding_groups[0]);
		$$invalidate('selected_scopes', selected_scopes);
	}

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	return {
		classes,
		loading,
		user,
		error_messages,
		done_without_redirect,
		selected_scopes,
		redirect_uri,
		client_name,
		scope,
		client,
		authorize_limited,
		authorize,
		Object,
		input_change_handler,
		$$binding_groups
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-v20aic-style")) add_css();
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
