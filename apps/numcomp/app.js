// NumComp - Visual Numerical Computing
// Main application logic

// Polyfill for roundRect (for older browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        const radius = Array.isArray(radii) ? radii[0] : radii;
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Simple custom Rete.js implementation for demonstration
class Node {
    constructor(id, label) {
        this.id = id;
        this.label = label;
        this.inputs = {};
        this.outputs = {};
        this.controls = {};
        this.data = {};
        this.x = 0;
        this.y = 0;
    }

    addInput(name, label) {
        this.inputs[name] = { label, value: null, connection: null };
        return this;
    }

    addOutput(name, label) {
        this.outputs[name] = { label, connections: [] };
        return this;
    }

    addControl(name, type, defaultValue, options = {}) {
        this.controls[name] = { type, value: defaultValue, options };
        return this;
    }

    async execute(inputs) {
        // Override in subclasses
        return {};
    }
}

// Application State
const state = {
    nodes: new Map(),
    connections: [],
    selectedNode: null,
    nodeIdCounter: 0,
    results: []
};

// DOM Elements
const reteEditor = document.getElementById('rete-editor');
const resultsContent = document.getElementById('results-content');
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const fitBtn = document.getElementById('fit-btn');

// Canvas setup
let canvas, ctx;
let scale = 1;
let panX = 0, panY = 0;
let isDragging = false;
let dragNode = null;
let dragOffsetX = 0, dragOffsetY = 0;

function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.width = reteEditor.clientWidth;
    canvas.height = reteEditor.clientHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    reteEditor.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = reteEditor.clientWidth;
        canvas.height = reteEditor.clientHeight;
        render();
    });

    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;

    // Check if clicking on a node
    for (const [id, node] of state.nodes) {
        if (x >= node.x && x <= node.x + 180 &&
            y >= node.y && y <= node.y + getNodeHeight(node)) {
            dragNode = node;
            dragOffsetX = x - node.x;
            dragOffsetY = y - node.y;
            state.selectedNode = node;
            return;
        }
    }

    isDragging = true;
}

function handleMouseMove(e) {
    if (dragNode) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - panX) / scale;
        const y = (e.clientY - rect.top - panY) / scale;
        dragNode.x = x - dragOffsetX;
        dragNode.y = y - dragOffsetY;
        render();
    } else if (isDragging) {
        panX += e.movementX;
        panY += e.movementY;
        render();
    }
}

function handleMouseUp(e) {
    isDragging = false;
    dragNode = null;
}

function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    scale = Math.max(0.1, Math.min(scale, 3));
    render();
}

function getNodeHeight(node) {
    let height = 40; // Header
    height += Object.keys(node.inputs).length * 30;
    height += Object.keys(node.controls).length * 40;
    height += Object.keys(node.outputs).length * 30;
    return height;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    // Draw connections
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    for (const conn of state.connections) {
        const fromNode = state.nodes.get(conn.from);
        const toNode = state.nodes.get(conn.to);
        if (fromNode && toNode) {
            const x1 = fromNode.x + 180;
            const y1 = fromNode.y + 40 + Object.keys(fromNode.outputs).indexOf(conn.fromOutput) * 30 + 15;
            const x2 = toNode.x;
            const y2 = toNode.y + 40 + Object.keys(toNode.inputs).indexOf(conn.toInput) * 30 + 15;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x1 + 50, y1, x2 - 50, y2, x2, y2);
            ctx.stroke();
        }
    }

    // Draw nodes
    for (const [id, node] of state.nodes) {
        drawNode(node);
    }

    ctx.restore();
}

function drawNode(node) {
    const isSelected = state.selectedNode === node;
    const nodeHeight = getNodeHeight(node);

    // Node background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = isSelected ? 2 : 1;

    ctx.beginPath();
    ctx.roundRect(node.x, node.y, 180, nodeHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(node.x, node.y, 180, 40, [8, 8, 0, 0]);
    ctx.fill();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px sans-serif';
    ctx.fillText(node.label, node.x + 10, node.y + 25);

    let offsetY = 40;

    // Inputs
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const [key, input] of Object.entries(node.inputs)) {
        ctx.fillText(input.label, node.x + 20, node.y + offsetY + 18);

        // Input socket
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(node.x + 8, node.y + offsetY + 15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

        offsetY += 30;
    }

    // Controls
    for (const [key, control] of Object.entries(node.controls)) {
        offsetY += 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.fillText(key, node.x + 10, node.y + offsetY);

        // Draw control background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(node.x + 10, node.y + offsetY + 5, 160, 22);

        // Draw control value
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px monospace';
        const displayValue = String(control.value).substring(0, 18);
        ctx.fillText(displayValue, node.x + 15, node.y + offsetY + 20);

        offsetY += 30;
    }

    // Outputs
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const [key, output] of Object.entries(node.outputs)) {
        ctx.fillText(output.label, node.x + 100, node.y + offsetY + 18);

        // Output socket
        ctx.fillStyle = 'rgba(255, 150, 100, 0.8)';
        ctx.beginPath();
        ctx.arc(node.x + 172, node.y + offsetY + 15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

        offsetY += 30;
    }
}

// Node Definitions
class NumberInputNode extends Node {
    constructor(id) {
        super(id, 'Number');
        this.addOutput('value', 'Number');
        this.addControl('value', 'number', 2.0);
    }

    async execute() {
        return { value: parseFloat(this.controls.value.value) };
    }
}

class FunctionInputNode extends Node {
    constructor(id) {
        super(id, 'Function');
        this.addOutput('func', 'Function');
        this.addControl('expr', 'text', 'x^2 - 4');
    }

    async execute() {
        const expr = this.controls.expr.value;
        return {
            func: (x) => {
                try {
                    return math.evaluate(expr, { x });
                } catch (e) {
                    console.error('Function evaluation error:', e);
                    return NaN;
                }
            }
        };
    }
}

class NewtonMethodNode extends Node {
    constructor(id) {
        super(id, "Newton's Method");
        this.addInput('func', 'Function');
        this.addInput('x0', 'Initial guess');
        this.addControl('tolerance', 'number', 0.001);
        this.addControl('maxIter', 'number', 100);
        this.addOutput('root', 'Root');
        this.addOutput('iterations', 'Iterations');
    }

    async execute(inputs) {
        const func = inputs.func;
        const x0 = inputs.x0 || 1.0;
        const tol = parseFloat(this.controls.tolerance.value);
        const maxIter = parseInt(this.controls.maxIter.value);

        if (!func) return { root: null, iterations: 0 };

        let x = x0;
        let iter = 0;
        const h = 0.0001;

        for (iter = 0; iter < maxIter; iter++) {
            const fx = func(x);
            const derivative = (func(x + h) - func(x - h)) / (2 * h);

            if (Math.abs(derivative) < 1e-10) break;

            const xNew = x - fx / derivative;

            if (Math.abs(xNew - x) < tol) {
                x = xNew;
                iter++;
                break;
            }

            x = xNew;
        }

        return { root: x, iterations: iter };
    }
}

class BisectionNode extends Node {
    constructor(id) {
        super(id, 'Bisection Method');
        this.addInput('func', 'Function');
        this.addInput('a', 'Left bound');
        this.addInput('b', 'Right bound');
        this.addControl('tolerance', 'number', 0.001);
        this.addControl('maxIter', 'number', 100);
        this.addOutput('root', 'Root');
        this.addOutput('iterations', 'Iterations');
    }

    async execute(inputs) {
        const func = inputs.func;
        let a = inputs.a || -10;
        let b = inputs.b || 10;
        const tol = parseFloat(this.controls.tolerance.value);
        const maxIter = parseInt(this.controls.maxIter.value);

        if (!func) return { root: null, iterations: 0 };

        let iter = 0;
        let c;

        for (iter = 0; iter < maxIter; iter++) {
            c = (a + b) / 2;
            const fc = func(c);

            if (Math.abs(fc) < tol || Math.abs(b - a) < tol) {
                break;
            }

            if (func(a) * fc < 0) {
                b = c;
            } else {
                a = c;
            }
        }

        return { root: c, iterations: iter + 1 };
    }
}

class OutputNode extends Node {
    constructor(id) {
        super(id, 'Output');
        this.addInput('value', 'Value');
        this.addControl('label', 'text', 'Result');
    }

    async execute(inputs) {
        const label = this.controls.label.value;
        const value = inputs.value;

        addResult(label, value);

        return {};
    }
}

// Node Factory
function createNode(type) {
    const id = `node-${state.nodeIdCounter++}`;
    let node;

    switch (type) {
        case 'number-input':
            node = new NumberInputNode(id);
            break;
        case 'function-input':
            node = new FunctionInputNode(id);
            break;
        case 'newton':
            node = new NewtonMethodNode(id);
            break;
        case 'bisection':
            node = new BisectionNode(id);
            break;
        case 'output':
            node = new OutputNode(id);
            break;
        default:
            console.error('Unknown node type:', type);
            return null;
    }

    // Position new nodes in a staggered pattern
    const count = state.nodes.size;
    node.x = 100 + (count % 3) * 220;
    node.y = 100 + Math.floor(count / 3) * 200;

    state.nodes.set(id, node);
    render();
    return node;
}

// Execute workflow
async function runWorkflow() {
    clearResults();

    // Topological sort and execution
    const executed = new Set();
    const outputs = new Map();

    async function executeNode(nodeId) {
        if (executed.has(nodeId)) return outputs.get(nodeId);

        const node = state.nodes.get(nodeId);
        const inputs = {};

        // Execute dependencies first
        for (const [inputName, input] of Object.entries(node.inputs)) {
            const conn = state.connections.find(c => c.to === nodeId && c.toInput === inputName);
            if (conn) {
                const sourceOutputs = await executeNode(conn.from);
                inputs[inputName] = sourceOutputs[conn.fromOutput];
            }
        }

        const result = await node.execute(inputs);
        outputs.set(nodeId, result);
        executed.add(nodeId);
        return result;
    }

    // Execute all nodes
    for (const [id] of state.nodes) {
        await executeNode(id);
    }

    if (state.results.length === 0) {
        resultsContent.innerHTML = '<p class="hint">No output nodes in workflow</p>';
    }
}

// Results management
function addResult(label, value) {
    state.results.push({ label, value });
    displayResults();
}

function clearResults() {
    state.results = [];
    resultsContent.innerHTML = '<p class="hint">Running workflow...</p>';
}

function displayResults() {
    if (state.results.length === 0) return;

    resultsContent.innerHTML = state.results.map(r => `
        <div class="result-item">
            <div class="result-label">${r.label}</div>
            <div class="result-value">${formatValue(r.value)}</div>
        </div>
    `).join('');
}

function formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number') return value.toFixed(6);
    if (typeof value === 'function') return '[Function]';
    return String(value);
}

// Event Handlers
runBtn.addEventListener('click', runWorkflow);

clearBtn.addEventListener('click', () => {
    if (confirm('Clear all nodes?')) {
        state.nodes.clear();
        state.connections = [];
        state.results = [];
        resultsContent.innerHTML = '<p class="hint">Run your workflow to see results</p>';
        render();
    }
});

saveBtn.addEventListener('click', () => {
    const data = {
        nodes: Array.from(state.nodes.entries()).map(([id, node]) => ({
            id,
            type: node.constructor.name,
            label: node.label,
            x: node.x,
            y: node.y,
            controls: node.controls
        })),
        connections: state.connections
    };
    localStorage.setItem('numcomp-workflow', JSON.stringify(data));
    alert('Workflow saved!');
});

loadBtn.addEventListener('click', () => {
    const data = localStorage.getItem('numcomp-workflow');
    if (data) {
        // Simple load - would need proper reconstruction in full version
        alert('Load feature coming soon!');
    } else {
        alert('No saved workflow found');
    }
});

zoomInBtn.addEventListener('click', () => {
    scale *= 1.2;
    render();
});

zoomOutBtn.addEventListener('click', () => {
    scale *= 0.8;
    render();
});

fitBtn.addEventListener('click', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    render();
});

// Node buttons
document.querySelectorAll('.node-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const nodeType = btn.dataset.node;
        createNode(nodeType);
    });
});

// Search functionality
document.getElementById('search-nodes').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('.node-button').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        btn.style.display = text.includes(search) ? 'block' : 'none';
    });
});

// Initialize
initCanvas();
render();

// Create a sample workflow
createNode('function-input');
createNode('number-input');
createNode('newton');
createNode('output');

console.log('NumComp initialized!');
