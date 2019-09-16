const numSocket = new Rete.Socket('Number value');
class WallSwitchCmp extends Rete.Component {
    constructor() {
        super('WallSwitchCmp');
    }

    builder(node) {
        let out = new Rete.Output('num', 'On/Off', numSocket);
        node.data.title = "<span>Wall Switch<br><small style='text-align: right;display:block'>ZWave-129</small></span>";
        node.addOutput(out);
    }
}
class BedroomCeilingCmp extends Rete.Component {
    constructor() {
        super('BedroomCeilingCmp');
    }

    builder(node) {
        let inp = new Rete.Input('num', 'Brightness', numSocket);
        node.data.title = "<span>Bedroom Ceiling<br><small style='text-align: right;display:block'>Hue Bridge</small></span>";
        node.addInput(inp);
    }
}


var Stage0NumControl = {
    template: '<div class="controlrender"><span>Duration:</span><span class="controlvalue">5 sec</span><span>Delay:</span><span class="controlvalue">0 sec</span></div>',
    data() {
        return {
            value: 0
        };
    },
    methods: {
        update() {
            if (this.root) {
                this.putData(this.ikey, +this.root.value);
            }

            this.emitter.trigger("process");
        }
    },
    mounted() {
    }
};

class NumControl extends Rete.Control {
    constructor(emitter, key, readonly) {
        super(key);
        this.component = Stage0NumControl;
        this.props = { emitter, ikey: key, readonly };
    }

    setValue(val) {
        this.stage0Context.root.value = val; // TODO get rid of stage0Context
    }
}

class DimmerCmp extends Rete.Component {
    constructor() {
        super('DimmerCmp');
    }

    builder(node) {
        node.data.title = "<span>Dimmer<br><small style='text-align: right;display:block'>Link Processor #62ae34</small></span>";
        let inp = new Rete.Input('num', 'On/Off', numSocket);
        let out = new Rete.Output('num', 'DimmedValue', numSocket);
        node.addOutput(out);
        node.addInput(inp);
        node.addControl(new NumControl(this.editor, "num"));
    }
}

window.customElements.define('ui-interactive-interconnect', class extends HTMLElement {
    constructor() {
        super();
    }

    init() {
        let container = document.getElementById(this.getAttribute("target"));
        console.warn("Target found!");
        if (!container) {
            console.warn("Target not found!");
            return;
        }

        const editor = new Rete.NodeEditor('demo@0.1.0', container);
        this.editor = editor;
    
        editor.use(ConnectionPlugin.default);
        editor.use(Stage0RenderPlugin);
    
        const c1 = new WallSwitchCmp();
        editor.register(c1);
        const c2 = new BedroomCeilingCmp();
        editor.register(c2);
        const c3 = new DimmerCmp();
        editor.register(c3);
    
        // editor.on('zoom', node => {
        //     console.log(editor.toJSON());
        //     return false;
        // });
    
        const data = {
            "id": "demo@0.1.0",
            "nodes": { "1": { "id": 1, "data": { "num": 1 }, "inputs": {}, "outputs": { "num": { "connections": [{ "node": 2, "input": "num", "data": {} }] } }, "position": [7, 8], "name": "WallSwitchCmp" }, "2": { "id": 2, "data": { "num": 1 }, "inputs": { "num": { "connections": [{ "node": 1, "output": "num", "data": {} }] } }, "outputs": { "num": { "connections": [{ "node": 3, "input": "num", "data": {} }] } }, "position": [202, 64], "name": "DimmerCmp" }, "3": { "id": 3, "data": { "num": 1 }, "inputs": { "num": { "connections": [{ "node": 2, "output": "num", "data": {} }] } }, "outputs": {}, "position": [443, 246], "name": "BedroomCeilingCmp" } }
        };
        editor.fromJSON(data);
    }
    
    connectedCallback() {
        this.init();
    }
    disconnectedCallback() {
    }
});
//# sourceMappingURL=interactive_interconnect.js.map
