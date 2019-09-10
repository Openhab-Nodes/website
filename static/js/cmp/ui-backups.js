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

/* assets/js/ui-backups/cmp.svelte generated by Svelte v3.12.0 */
const { Object: Object_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = 'svelte-etg4yh-style';
	style.textContent = ".card.svelte-etg4yh:hover{box-shadow:0 1px 3px 1px rgba(60, 64, 67, 0.2),\n      0 2px 8px 4px rgba(60, 64, 67, 0.1)}.card-body.svelte-etg4yh{display:flex}.card-body.svelte-etg4yh>div.svelte-etg4yh:first-child{flex:1}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = Object_1.create(ctx);
	child_ctx.backup = list[i];
	child_ctx.backup_index = i;
	return child_ctx;
}

// (255:0) {:else}
function create_else_block_1(ctx) {
	var p;

	return {
		c() {
			p = element("p");
			p.textContent = "No Backups so far.";
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

// (238:8) {:else}
function create_else_block(ctx) {
	var button, dispose;

	function click_handler(...args) {
		return ctx.click_handler(ctx, ...args);
	}

	return {
		c() {
			button = element("button");
			button.textContent = "Show Download Link";
			attr(button, "class", "btn btn-success");
			dispose = listen(button, "click", click_handler);
		},

		m(target, anchor) {
			insert(target, button, anchor);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
		},

		d(detaching) {
			if (detaching) {
				detach(button);
			}

			dispose();
		}
	};
}

// (236:8) {#if backup.download_url}
function create_if_block_3(ctx) {
	var a, t, a_href_value;

	return {
		c() {
			a = element("a");
			t = text("Download");
			attr(a, "href", a_href_value = ctx.backup.download_url);
		},

		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},

		p(changed, ctx) {
			if ((changed.backups) && a_href_value !== (a_href_value = ctx.backup.download_url)) {
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

// (214:0) {#each backups as backup, backup_index}
function create_each_block(ctx) {
	var div3, div2, div0, h4, t0_value = ctx.backup.title + "", t0, t1, p0, t2, t3_value = new ctx.Date(parseInt(ctx.backup.created_at)).toLocaleString() + "", t3, t4, br0, t5, t6_value = Number.parseFloat(ctx.backup.size / 1024 / 1024).toFixed(2) + "", t6, t7, br1, t8, t9_value = ctx.backup.install_name + "", t9, t10, t11_value = ctx.backup.iid + "", t11, t12, t13, div1, p1, t17, t18, button0, t20, button1, dispose;

	function select_block_type(changed, ctx) {
		if (ctx.backup.download_url) return create_if_block_3;
		return create_else_block;
	}

	var current_block_type = select_block_type(null, ctx);
	var if_block = current_block_type(ctx);

	function click_handler_1(...args) {
		return ctx.click_handler_1(ctx, ...args);
	}

	function click_handler_2(...args) {
		return ctx.click_handler_2(ctx, ...args);
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
			t2 = text("Created at: ");
			t3 = text(t3_value);
			t4 = space();
			br0 = element("br");
			t5 = text("\n          Size: ");
			t6 = text(t6_value);
			t7 = text(" MB\n          ");
			br1 = element("br");
			t8 = text("\n          Installation Name (ID): ");
			t9 = text(t9_value);
			t10 = text(" (");
			t11 = text(t11_value);
			t12 = text(")");
			t13 = space();
			div1 = element("div");
			p1 = element("p");
			p1.innerHTML = `
			          Please note that a restore request is queued and not executed
			          directly. A restore will
			          <b><u>OVERWRITE</u></b>
			          the selected installation.
			        `;
			t17 = space();
			if_block.c();
			t18 = space();
			button0 = element("button");
			button0.textContent = "Restore";
			t20 = space();
			button1 = element("button");
			button1.textContent = "Delete";
			attr(div0, "class", "svelte-etg4yh");
			attr(p1, "class", "small");
			attr(button0, "class", "btn btn-danger");
			attr(button1, "class", "btn btn-danger");
			attr(div1, "class", "mr-3 svelte-etg4yh");
			set_style(div1, "max-width", "400px");
			attr(div2, "class", "card-body svelte-etg4yh");
			attr(div3, "class", "card svelte-etg4yh");

			dispose = [
				listen(button0, "click", click_handler_1),
				listen(button1, "click", click_handler_2)
			];
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
			append(p0, t10);
			append(p0, t11);
			append(p0, t12);
			append(div2, t13);
			append(div2, div1);
			append(div1, p1);
			append(div1, t17);
			if_block.m(div1, null);
			append(div1, t18);
			append(div1, button0);
			append(div1, t20);
			append(div1, button1);
		},

		p(changed, new_ctx) {
			ctx = new_ctx;
			if ((changed.backups) && t0_value !== (t0_value = ctx.backup.title + "")) {
				set_data(t0, t0_value);
			}

			if ((changed.backups) && t3_value !== (t3_value = new ctx.Date(parseInt(ctx.backup.created_at)).toLocaleString() + "")) {
				set_data(t3, t3_value);
			}

			if ((changed.backups) && t6_value !== (t6_value = Number.parseFloat(ctx.backup.size / 1024 / 1024).toFixed(2) + "")) {
				set_data(t6, t6_value);
			}

			if ((changed.backups) && t9_value !== (t9_value = ctx.backup.install_name + "")) {
				set_data(t9, t9_value);
			}

			if ((changed.backups) && t11_value !== (t11_value = ctx.backup.iid + "")) {
				set_data(t11, t11_value);
			}

			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
				if_block.p(changed, ctx);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);
				if (if_block) {
					if_block.c();
					if_block.m(div1, t18);
				}
			}
		},

		d(detaching) {
			if (detaching) {
				detach(div3);
			}

			if_block.d();
			run_all(dispose);
		}
	};
}

// (270:2) {#if upload_current}
function create_if_block_2(ctx) {
	var button, dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "Cancel Upload";
			attr(button, "class", "btn btn-primary ml-4");
			dispose = listen(button, "click", ctx.cancel_upload);
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

// (275:2) {#if cache_valid_until}
function create_if_block_1(ctx) {
	var button, t, button_title_value, dispose;

	return {
		c() {
			button = element("button");
			t = text("Refresh list");
			attr(button, "class", "btn btn-primary ml-4");
			attr(button, "title", button_title_value = "Cache is valid until " + new ctx.Date(ctx.cache_valid_until).toLocaleString());
			dispose = listen(button, "click", ctx.refresh_cache);
		},

		m(target, anchor) {
			insert(target, button, anchor);
			append(button, t);
		},

		p(changed, ctx) {
			if ((changed.cache_valid_until) && button_title_value !== (button_title_value = "Cache is valid until " + new ctx.Date(ctx.cache_valid_until).toLocaleString())) {
				attr(button, "title", button_title_value);
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

// (285:0) {#if error_message}
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
	var t0, div, input, t1, button, t3, t4, t5, if_block2_anchor, dispose;

	let each_value = ctx.backups;

	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	let each_1_else = null;

	if (!each_value.length) {
		each_1_else = create_else_block_1();
		each_1_else.c();
	}

	var if_block0 = (ctx.upload_current) && create_if_block_2(ctx);

	var if_block1 = (ctx.cache_valid_until) && create_if_block_1(ctx);

	var if_block2 = (ctx.error_message) && create_if_block(ctx);

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			div = element("div");
			input = element("input");
			t1 = space();
			button = element("button");
			button.textContent = "Upload";
			t3 = space();
			if (if_block0) if_block0.c();
			t4 = space();
			if (if_block1) if_block1.c();
			t5 = space();
			if (if_block2) if_block2.c();
			if_block2_anchor = empty();
			attr(input, "type", "file");
			input.multiple = true;
			attr(input, "accept", "application/zip");
			set_style(input, "display", "none");
			attr(button, "class", "btn btn-primary");
			attr(div, "class", "mt-4 svelte-etg4yh");

			dispose = [
				listen(input, "change", ctx.change_handler),
				listen(button, "click", ctx.click_handler_3)
			];
		},

		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			if (each_1_else) {
				each_1_else.m(target, anchor);
			}

			insert(target, t0, anchor);
			insert(target, div, anchor);
			append(div, input);
			ctx.input_binding(input);
			append(div, t1);
			append(div, button);
			append(div, t3);
			if (if_block0) if_block0.m(div, null);
			append(div, t4);
			if (if_block1) if_block1.m(div, null);
			insert(target, t5, anchor);
			if (if_block2) if_block2.m(target, anchor);
			insert(target, if_block2_anchor, anchor);
		},

		p(changed, ctx) {
			if (changed.backups || changed.Date) {
				each_value = ctx.backups;

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
				each_1_else = create_else_block_1();
				each_1_else.c();
				each_1_else.m(t0.parentNode, t0);
			}

			if (ctx.upload_current) {
				if (!if_block0) {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(div, t4);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (ctx.cache_valid_until) {
				if (if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (ctx.error_message) {
				if (if_block2) {
					if_block2.p(changed, ctx);
				} else {
					if_block2 = create_if_block(ctx);
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
			destroy_each(each_blocks, detaching);

			if (each_1_else) each_1_else.d(detaching);

			if (detaching) {
				detach(t0);
				detach(div);
			}

			ctx.input_binding(null);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();

			if (detaching) {
				detach(t5);
			}

			if (if_block2) if_block2.d(detaching);

			if (detaching) {
				detach(if_block2_anchor);
			}

			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let storage;
  let backupsRef;
  let error_message = null;
  let backups = [];
  let cache_valid_until;
  let uploadfile;
  let upload_current;
  /** Layout of a backup entry
   *     {
      title: "Test",
      uid: "abc",
      id: "test",
      iid: "dummy",
      install_name: "Dummy",
      created_at: Date.now(),
      size: 12457634
    }
    */

  let { classes = "" } = $$props;
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import('../../../../../../../../js/cmp/userdata.js');
    userdb = module.userdata;
    storage = userdb.storage(userdb.BUCKET_BACKUP);
    onDestroyProxy = module.UserAwareComponent(
      u => {
        user = u;
        if (u) {
          backupsRef = storage.ref().child(user.uid);
          get_backups_list().catch(error => {
            $$invalidate('error_message', error_message = error.message);
          });
        }
      },
      data_ => (data = Object.assign({ installations: {} }, data_)),
      aq_ => (actionqueue = aq_)
    );
  }
  start();
  /// End -- User Aware Component

  async function get_backups_list() {
    let list = localStorage.getItem("backups");
    if (list) list = JSON.parse(list);
    if (list && list.valid_until > Date.now()) {
      $$invalidate('cache_valid_until', cache_valid_until = list.valid_until);
      $$invalidate('backups', backups = list.data);
      return;
    }
    const backupsList = await backupsRef.listAll();
    list = [];
    for (let item of backupsList.items) {
      const meta = await item.getMetadata();
      const [iid, _] = meta.name.split("_");
      list.push({
        iid,
        id: meta.name,
        created_at: Date.parse(meta.timeCreated),
        size: meta.size,
        install_name: meta.customMetadata.install_name,
        title: meta.customMetadata.title
          ? meta.customMetadata.title
          : meta.name,
        uid: user.uid,
        ref: meta.fullPath
      });
      console.log(meta);
    }
    let d = new Date(Date.now());
    d.setDate(d.getDate() + 1);
    localStorage.setItem(
      "backups",
      JSON.stringify({ data: list, valid_until: d.getTime() })
    );
    $$invalidate('backups', backups = list);
  }

  function refresh_cache() {
    $$invalidate('cache_valid_until', cache_valid_until = null);
    localStorage.removeItem("backups");
    get_backups_list();
  }

  function progress_message(selectedFile, snapshot) {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    $$invalidate('error_message', error_message = `Uploading (${progress}%) ${selectedFile.name} (Size: ${(
      selectedFile.size / 1024
    ).toFixed(2)}kb)`);
  }

  function cancel_upload() {
    upload_current.cancel();
    $$invalidate('upload_current', upload_current = null);
  }

  async function make_download_link(e, backup, backup_index) {
    const gsReference = storage.refFromURL(
      userdb.BUCKET_BACKUP + "/" + backup.ref
    );
    $$invalidate('backups', backups[backup_index].download_url = await gsReference.getDownloadURL(), backups);
  }

  async function upload(e) {
    e.target.disabled = true;
    for (let selectedFile of uploadfile.files) {
      let [iid, title] = selectedFile.name.split("_");
      if (!iid || !title || !data.installations[iid]) {
        $$invalidate('error_message', error_message =
          "File name '" +
          selectedFile.name +
          "' must follow the pattern INSTALLID_A-TITLE.zip with INSTALLID matching one of the currently registered installation ids (" +
          Object.keys(data.installations)
            .map(e => `"${e}"`)
            .join(", ") +
          ") and A-TITLE being the backup title");
        e.target.disabled = false;
        return;
      }
      if (selectedFile.type != "application/zip") {
        $$invalidate('error_message', error_message =
          "File " +
          selectedFile.name +
          " is not a zip file: " +
          selectedFile.type);
        e.target.disabled = false;
        return;
      }
      if (selectedFile.size / 1024 / 1024 > 5) {
        $$invalidate('error_message', error_message =
          "File " + selectedFile.name + " is bigger than 5 megabytes!");
        e.target.disabled = false;
        return;
      }
      const fileRef = backupsRef.child(iid + "_" + Date.now());
      $$invalidate('upload_current', upload_current = fileRef.put(selectedFile, {
        customMetadata: {
          title,
          install_name: data.installations[iid].title
        }
      }));
      upload_current.on("state_changed", snapshot => {
        progress_message(selectedFile, snapshot);
      });
      try {
        await upload_current;
        $$invalidate('upload_current', upload_current = null);
      } catch (err) {
        $$invalidate('upload_current', upload_current = null);
        $$invalidate('error_message', error_message =
          "Upload of " + selectedFile.name + " failed: " + err.message);
        return;
      }
    }
    $$invalidate('error_message', error_message = null);
    refresh_cache();
  }

  function restore(e, backup) {
    if (!userdb) return;
    e.target.disabled = true;
    e.target.innerText = "Restore Queued";
    userdb
      .queue_action(backup.iid, "restore", backup.id)
      .then(() => {
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        $$invalidate('error_message', error_message = err.message);
      });
  }

  async function remove(e, backup) {
    if (!userdb) return;
    e.target.disabled = true;
    try {
      const gsReference = storage.refFromURL(
        userdb.BUCKET_BACKUP + "/" + backup.ref
      );
      await gsReference.delete();
    } catch (err) {
      e.target.disabled = false;
      $$invalidate('error_message', error_message = err.message);
      return;
    }
    refresh_cache();
  }

	const click_handler = ({ backup, backup_index }, e) => make_download_link(e, backup, backup_index);

	const click_handler_1 = ({ backup }, e) => restore(e, backup);

	const click_handler_2 = ({ backup }, e) => remove(e, backup);

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			$$invalidate('uploadfile', uploadfile = $$value);
		});
	}

	const change_handler = (e) => upload(e);

	const click_handler_3 = (e) => uploadfile.click();

	$$self.$set = $$props => {
		if ('classes' in $$props) $$invalidate('classes', classes = $$props.classes);
	};

	return {
		error_message,
		backups,
		cache_valid_until,
		uploadfile,
		upload_current,
		classes,
		refresh_cache,
		cancel_upload,
		make_download_link,
		upload,
		restore,
		remove,
		Date,
		click_handler,
		click_handler_1,
		click_handler_2,
		input_binding,
		change_handler,
		click_handler_3
	};
}

class Cmp extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-etg4yh-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, ["classes"]);
	}
}

window.customElements.define('ui-backups', class extends HTMLElement {
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
//# sourceMappingURL=ui-backups.js.map
