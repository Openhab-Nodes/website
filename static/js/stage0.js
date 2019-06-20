/*!
* rete-stage0-render-plugin v0.2.14 
* (c) 2018  
* Released under the ISC license.
*/
//!function (e, t) { "object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd ? define(["exports"], t) : t(e.stage0 = e.stage0 || {}) }(this, function (e) { "use strict"; function t(e) { if (3 !== e.nodeType) { if (void 0 !== e.attributes) for (let t of Array.from(e.attributes)) { let n = t.name; if ("#" === n[0]) return e.removeAttribute(n), n.slice(1) } return 0 } { let t = e.nodeValue; return "#" === t[0] ? (e.nodeValue = "", t.slice(1)) : 0 } } const n = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, !1); n.roll = function (e) { let t; for (; --e;)t = this.nextNode(); return t }; class r { constructor(e, t) { this.idx = e, this.ref = t } } function o(e) { const t = {}, r = n; return r.currentNode = e, this._refPaths.map(e => t[e.ref] = r.roll(e.idx)), t } const c = document.createElement("template"); function l(e, ...l) { let i = ""; for (let t = 0; t < l.length; t++)i += e[t] + l[t]; const u = (i += e[e.length - 1]).replace(/>\n+/g, ">").replace(/\s+</g, "<").replace(/>\s+/g, ">").replace(/\n\s+/g, "\x3c!-- --\x3e"); c.innerHTML = u; const s = c.content.firstChild; return s._refPaths = function (e) { const o = n; o.currentNode = e; let c, l = [], i = 0; do { (c = t(e)) ? (l.push(new r(i + 1, c)), i = 1) : i++ } while (e = o.nextNode()); return l }(s), s.collect = o, s } e.h = l, e.default = l, Object.defineProperty(e, "__esModule", { value: !0 }) });
//!function (e, t) { "object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd ? define(["exports"], t) : t(e.stage0 = e.stage0 || {}) }(this, function (e) { "use strict"; function t(e, t, r, n, o, l, f, d) { if (0 === n.length) { if (void 0 !== f || void 0 !== d) { let e, i = void 0 !== f ? f.nextSibling : t.firstChild; for (void 0 === d && (d = null); i !== d;)e = i.nextSibling, t.removeChild(i), i = e } else t.textContent = ""; return } if (0 === r.length) { let e, i = void 0 !== d ? 1 : 0; for (let r = 0, l = n.length; r < l; r++)e = o(n[r]), i ? t.insertBefore(e, d) : t.appendChild(e); return } let s, u, h = 0, g = 0, v = !0, a = r.length - 1, p = n.length - 1, b = f ? f.nextSibling : t.firstChild, C = b, x = d ? d.previousSibling : t.lastChild, c = x; e: for (; v;) { let i; for (v = !1, s = r[h], u = n[g]; s[e] === u[e];) { if (l(b, u), h++ , g++ , C = b = b.nextSibling, a < h || p < g) break e; s = r[h], u = n[g] } for (s = r[a], u = n[p]; s[e] === u[e];) { if (l(x, u), a-- , p-- , d = x, c = x = x.previousSibling, a < h || p < g) break e; s = r[a], u = n[p] } for (s = r[a], u = n[g]; s[e] === u[e];) { if (v = !0, l(x, u), i = x.previousSibling, t.insertBefore(x, C), c = x = i, g++ , --a < h || p < g) break e; s = r[a], u = n[g] } for (s = r[h], u = n[p]; s[e] === u[e];) { if (v = !0, l(b, u), i = b.nextSibling, t.insertBefore(b, d), d = c = b, b = i, p-- , a < ++h || p < g) break e; s = r[h], u = n[p] } } if (p < g) { if (h <= a) { let e; for (; h <= a;)0 === a ? t.removeChild(x) : (e = x.previousSibling, t.removeChild(x), x = e), a-- } return } if (a < h) { if (g <= p) { let e, i = d ? 1 : 0; for (; g <= p;)e = o(n[g]), i ? t.insertBefore(e, d) : t.appendChild(e), g++ } return } const S = new Array(p + 1 - g); for (let e = g; e <= p; e++)S[e] = -1; const m = new Map; for (let t = g; t <= p; t++)m.set(n[t][e], t); let y = 0, B = []; for (let t = h; t <= a; t++)m.has(r[t][e]) ? (S[m.get(r[t][e])] = t, y++) : B.push(t); if (0 === y) { if (void 0 !== f || void 0 !== d) { let e, i = void 0 !== f ? f.nextSibling : t.firstChild; for (void 0 === d && (d = null); i !== d;)e = i.nextSibling, t.removeChild(i), i = e, h++ } else t.textContent = ""; let e, i = d ? 1 : 0; for (let r = g; r <= p; r++)e = o(n[r]), i ? t.insertBefore(e, d) : t.appendChild(e); return } const k = function (e, t) { for (var r = [], n = [], o = -1, l = new Array(e.length), f = t, d = e.length; f < d; f++) { var s = e[f]; if (!(s < 0)) { var u = i(r, s); -1 !== u && (l[f] = n[u]), u === o ? (r[++o] = s, n[o] = f) : s < r[u + 1] && (r[u + 1] = s, n[u + 1] = f) } } for (f = n[o]; o >= 0; f = l[f], o--)r[o] = f; return r }(S, g), w = []; let M = b; for (let e = h; e <= a; e++)w[e] = M, M = M.nextSibling; for (let e = 0; e < B.length; e++)t.removeChild(w[B[e]]); let j, A = k.length - 1; for (let e = p; e >= g; e--)k[A] === e ? (l(d = w[S[k[A]]], n[e]), A--) : (-1 === S[e] ? j = o(n[e]) : l(j = w[S[e]], n[e]), t.insertBefore(j, d), d = j) } function i(e, t) { var i = -1, r = e.length; if (r > 0 && e[r - 1] <= t) return r - 1; for (; r - i > 1;) { var n = Math.floor((i + r) / 2); e[n] > t ? r = n : i = n } return i } e.keyed = t, e.default = t, Object.defineProperty(e, "__esModule", { value: !0 }) });

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('stage0'), require('stage0/keyed')) :
        typeof define === 'function' && define.amd ? define(['stage0', 'stage0/keyed'], factory) :
            (global.Stage0RenderPlugin = factory(global.stage0, global.stage0));
}(this, (function (h, keyed) {
    'use strict';

    h = h && h.hasOwnProperty('default') ? h['default'] : h;

    /**
     * Base component
     * @param {*} scope
     */
    function BaseComponent(scope) {
        const view = this.getView();

        this.root = view.cloneNode(true);

        const refCl = view.collect(this.root);

        this.setRefs(refCl);
        this.init(scope);
    }

    BaseComponent.prototype = {
        getView: function () {
            return h(["<div></div>"]);
        },
        init: function (scope) {
            this.root.update = this.rootUpdate.bind(this);
            this.root.update(scope);
        },
        setRefs: function (refCl) {
            this.refs = refCl;
        },
        rootUpdate: function (_scope) { }
    };

    function extend(ChildClass, ParentClass) {
        ChildClass.prototype = Object.assign({}, ParentClass.prototype, ChildClass.prototype);
        ChildClass.prototype.constructor = ChildClass;
    }

    /**
     * Socket component
     * @param {*} socket
     * @param {*} type
     */
    function SocketComponent(io, type, node) {
        this.type = type;
        this.node = node;
        this.name;
        this.hint;
        BaseComponent.call(this, io);
    }

    SocketComponent.prototype.init = function (io) {
        BaseComponent.prototype.init.call(this, io.socket);
        this.node.context.bindSocket(this.root, this.type, io);
    };

    SocketComponent.prototype.getView = function () {
        return h(["<div></div>"]);
    };

    SocketComponent.prototype.rootUpdate = function (socket) {
        if (this.name !== socket.name) this.root.className = "socket " + socket.name + " " + this.type;

        if (this.name !== socket.name || this.hint !== socket.hint) this.root.title = socket.name + "\\n" + (socket.hint ? socket.hint : "");

        this.name = socket.name;
        this.hint = socket.hint;
    };

    extend(SocketComponent, BaseComponent);

    /**
     * Control component
     * @param {*} control
     */
    function ControlComponent(control) {
        this.control = control;
        BaseComponent.call(this, control);
    }

    ControlComponent.prototype.init = function (control) {
        let ctx;
        if (this.control.parent.context) ctx = this.control.parent.context; else if (this.control.parent.node) ctx = this.control.parent.node.context;
        ctx.bindControl(this.root, control);
        BaseComponent.prototype.init.call(this, control);

        this.root.addEventListener("mousedown", e => {
            e.stopPropagation();
        });
    };

    ControlComponent.prototype.getView = function () {
        return h(['<div class="control"></div>']);
    };

    ControlComponent.prototype.rootUpdate = function (control) {
        if (this.control.key !== control.key) {
            while (this.root.firstChild) {
                this.root.removeChild(this.root.firstChild);
            }
            this.root.appendChild(control.stage0Context.root);
        }
        this.control = control;
    };

    extend(ControlComponent, BaseComponent);

    /**
     * Input component
     * @param {*} input
     */
    function InputComponent(input, node) {
        this.name = null;
        this.node = node;
        this.showControl = null;
        BaseComponent.call(this, input);
    }

    InputComponent.prototype.getView = function () {
        return h(['<div class="input"><span class="input-socket" #socket></span><div class="input-title" #inputTitle>#inputName</div><div class="input-control" #controls></div></div>']);
    };

    InputComponent.prototype.getSocketComponent = function (input) {
        return new SocketComponent(input, "input", this.node);
    };

    InputComponent.prototype.getControlComponent = function (input) {
        return new ControlComponent(input.control, input.node);
    };

    InputComponent.prototype.rootUpdate = function (input) {
        const name = input.name;
        const showControl = input.showControl();

        if (this.showControl !== showControl) {
            while (this.refs.controls.firstChild) {
                this.refs.controls.removeChild(this.refs.controls.firstChild);
            }
            if (this.root.contains(this.refs.inputtitle)) {
                this.root.removeChild(this.refs.inputtitle);
            }
            if (showControl) {
                const controlComp = this.getControlComponent(input);
                this.refs.controls.appendChild(controlComp.root);
            } else {
                this.root.appendChild(this.refs.inputtitle);
                if (this.name !== name) {
                    this.name = this.refs.inputName.nodeValue = name;
                }
            }
        }

        if (!this.refs.socket.firstChild) {
            const compSocket = this.getSocketComponent(input);
            this.refs.socket.appendChild(compSocket.root);
        }
    };

    extend(InputComponent, BaseComponent);

    /**
     * Output component
     * @param {*} output
     */
    function OutputComponent(output, node) {
        this.name = null;
        this.node = node;
        BaseComponent.call(this, output);
    }

    OutputComponent.prototype.getView = function () {
        return h(['<div class="output"><div class="output-title" #outputTitle>#outputName</div><div #socket></div></div>']);
    };

    OutputComponent.prototype.getSocketComponent = function (output) {
        return new SocketComponent(output, "output", this.node);
    };

    OutputComponent.prototype.rootUpdate = function (output) {
        let name = output.name;

        if (this.name !== name) {
            this.name = this.refs.outputName.nodeValue = name;
        }

        if (!this.refs.socket.firstChild) {
            const compSocket = this.getSocketComponent(output);
            this.refs.socket.appendChild(compSocket.root);
        }
    };

    extend(OutputComponent, BaseComponent);

    /**
     * Node component
     * @param {*} item
     * @param {*} scope
     */
    function NodeComponent(scope) {
        this.renderedInputs = [];
        this.renderedOutputs = [];
        this.renderedControls = [];

        this.visibleInputs = undefined;
        this.visibleOutputs = undefined;
        this.visibleControls = undefined;

        this.name = null;
        this.selected = null;

        BaseComponent.call(this, scope);
    }

    NodeComponent.prototype.init = function (scope) {
        BaseComponent.prototype.init.call(this, scope);
    };

    NodeComponent.prototype.getView = function () {
        return h(['<div class="node"><div class="title ml-2" #nodename></div><hr class="m-0"><div class="inputs" #inputs></div><div class="outputs" #outputs></div><hr #controlshr><div class="controls" #controls></div></div>']);
    };

    NodeComponent.prototype.getInputComponent = function (item, node) {
        return new InputComponent(item, node);
    };

    NodeComponent.prototype.getOutputComponent = function (item, node) {
        return new OutputComponent(item, node);
    };

    NodeComponent.prototype.getControlComponent = function (item, node) {
        return new ControlComponent(item, node);
    };

    NodeComponent.prototype.rootUpdate = function (scope) {
        const selected = scope.editor.selected.contains(scope.node);

        if (this.name !== scope.node.name || this.selected !== selected) {
            this.root.classList.remove(this.name);
            this.root.classList.remove("selected");

            this.root.classList.add(scope.node.name);
            if (selected) this.root.classList.add("selected");
        }

        this.selected = selected;

        if (this.name !== scope.node.name) {
            this.refs.nodename.innerHTML = scope.node.data.title;
            this.name = scope.node.name;
        }

        this.visibleInputs = Array.from(scope.node.inputs.values()).slice();

        keyed.keyed("key", this.refs.inputs, this.renderedInputs, this.visibleInputs, item => {
            return this.getInputComponent(item, scope.node).root;
        }, (input, item) => {
            input.update(item);
        });

        this.renderedInputs = this.visibleInputs.slice();

        this.visibleOutputs = Array.from(scope.node.outputs.values()).slice();

        keyed.keyed("key", this.refs.outputs, this.renderedOutputs, this.visibleOutputs, item => {
            return this.getOutputComponent(item, scope.node).root;
        }, (output, item) => {
            output.update(item);
        });

        this.renderedOutputs = this.visibleOutputs.slice();

        this.visibleControls = Array.from(scope.node.controls.values()).slice();
        if (!this.visibleControls.length) this.refs.controlshr.style.display = "none";

        keyed.keyed("key", this.refs.controls, this.renderedControls, this.visibleControls, item => {
            return this.getControlComponent(item, scope.node).root;
        }, (control, item) => {
            control.update(item);
        });

        this.renderedControls = this.visibleControls.slice();
    };

    extend(NodeComponent, BaseComponent);

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    /**
     * Control component
     * @param {*} control
     */
    function RootControlComponent(editor, { el, control, controlProps }) {
        this.component = Object.assign({}, control.component, controlProps);

        this.editor = editor;
        this.el = el;

        BaseComponent.call(this, control);
        this.component.root = this.root;
    }

    RootControlComponent.prototype.getView = function () {
        return h([this.component.template]);
    };

    RootControlComponent.prototype.init = function (_control) {
        this.root.update = this.rootUpdate.bind(this);
    };

    RootControlComponent.prototype.rootUpdate = function (_control) {
        this.component.methods.update.apply(this.component);
    };

    extend(RootControlComponent, BaseComponent);

    function createNode({ el, nodeProps, component }) {
        const comp = component.component || new NodeComponent(nodeProps);
        nodeProps.node.stage0Context = comp;
        el.appendChild(comp.root);
        return comp;
    }

    function createControl(editor, { el, control, controlProps }) {
        const comp = new RootControlComponent(editor, { el, control, controlProps });

        control.stage0Context = comp;

        el.appendChild(comp.root);

        comp.component.mounted();

        return comp;
    }

    function install(editor, _params) {
        editor.on("rendernode", ({ el, node, component, bindSocket, bindControl }) => {
            if (component.render && component.render !== "stage0") return;
            const nodeProps = _extends({}, component.props, { node, editor, bindSocket, bindControl });
            node.context = nodeProps;
            node._stage0 = createNode({ el, nodeProps, component });
            node.update = () => {
                node.stage0Context.rootUpdate(nodeProps);
            };
        });

        editor.on("rendercontrol", ({ el, control }) => {
            if (control.render && control.render !== "stage0") return;
            let controlProps = _extends({}, control.props, {
                getData: control.getData.bind(control),
                putData: control.putData.bind(control)
            });
            control._stage0 = createControl(editor, { el, control, controlProps });
            control.update = () => {
                control.stage0Context.rootUpdate(controlProps);
            };
        });

        editor.on("connectioncreated connectionremoved", connection => {
            let inputContext = connection.input.node.context;
            let outputContext = connection.output.node.context;
            connection.output.node.stage0Context.rootUpdate(outputContext);
            connection.input.node.stage0Context.rootUpdate(inputContext);
        });

        editor.on("nodeselected", () => {
            for (const key in editor.nodes) {
                const editorNode = editor.nodes[key];
                const context = editorNode.context;
                editorNode.stage0Context.rootUpdate(context);
            }
        });
    }

    var index = {
        name: "stage0-render",
        install,
        NodeComponent,
        InputComponent,
        OutputComponent,
        ControlComponent,
        RootControlComponent,
        SocketComponent
    };

    return index;

})));
  //# sourceMappingURL=stage0-render-plugin.debug.js.map