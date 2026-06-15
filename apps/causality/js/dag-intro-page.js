(() => {
    const NODE_RADIUS = 36;
    const HIT_RADIUS = 48;

    function edgeKey(from, to) {
        return `${from}->${to}`;
    }

    function hasEdge(edges, from, to) {
        return edges.some(e => e.from === from && e.to === to);
    }

    function hasCycle(edges) {
        const adj = {};
        const nodes = new Set();

        edges.forEach(({ from, to }) => {
            nodes.add(from);
            nodes.add(to);
            if (!adj[from]) adj[from] = [];
            adj[from].push(to);
        });

        const visiting = new Set();
        const visited = new Set();

        function dfs(node) {
            if (visiting.has(node)) return true;
            if (visited.has(node)) return false;

            visiting.add(node);
            for (const next of adj[node] || []) {
                if (dfs(next)) return true;
            }
            visiting.delete(node);
            visited.add(node);
            return false;
        }

        for (const node of nodes) {
            if (dfs(node)) return true;
        }

        return false;
    }

    function interpretTwoNode(edges) {
        if (edges.length === 0) {
            return {
                tone: 'info',
                text: 'Drag from one node to the other to draw a causal arrow.'
            };
        }

        if (hasEdge(edges, 'smoking', 'cancer')) {
            return {
                tone: 'success',
                text: '<strong>Smoking &rarr; Cancer.</strong> You drew that smoking causes cancer — the conventional causal hypothesis. The exposure precedes and is hypothesized to contribute to the outcome.'
            };
        }

        if (hasEdge(edges, 'cancer', 'smoking')) {
            return {
                tone: 'warning',
                text: '<strong>Cancer &rarr; Smoking.</strong> You drew that cancer causes smoking. For incident lung cancer, this implies reverse causation — generally not the primary explanation.'
            };
        }

        return {
            tone: 'info',
            text: 'Draw an arrow between Smoking and Cancer to state a causal direction.'
        };
    }

    function interpretMediator(edges) {
        if (edges.length === 0) {
            return {
                tone: 'info',
                text: 'Drag between nodes to draw arrows. Try building Smoking &rarr; Inflammation &rarr; Cancer, or draw both Smoking and Cancer into Inflammation.'
            };
        }

        if (hasCycle(edges)) {
            return {
                tone: 'warning',
                text: '<strong>Not a DAG — cycle detected.</strong> Your arrows form a directed loop. A DAG must be <em>acyclic</em>: causal arrows cannot eventually point back to an earlier variable. Remove or reverse an arrow to break the cycle.'
            };
        }

        const smokingToInflammation = hasEdge(edges, 'smoking', 'inflammation');
        const inflammationToCancer = hasEdge(edges, 'inflammation', 'cancer');
        const inflammationToSmoking = hasEdge(edges, 'inflammation', 'smoking');
        const cancerToInflammation = hasEdge(edges, 'cancer', 'inflammation');
        const smokingToCancer = hasEdge(edges, 'smoking', 'cancer');

        if (smokingToInflammation && inflammationToCancer && edges.length === 2) {
            return {
                tone: 'success',
                text: '<strong>Mediator pathway.</strong> Smoking &rarr; Inflammation &rarr; Cancer. Inflammation lies on the causal pathway between exposure and outcome.'
            };
        }

        if (cancerToInflammation && inflammationToSmoking && edges.length === 2) {
            return {
                tone: 'warning',
                text: '<strong>Reverse mediator pathway.</strong> Cancer &rarr; Inflammation &rarr; Smoking. You drew that cancer causes smoking, mediated by inflammation — reverse causation rather than the conventional story.'
            };
        }

        if (smokingToInflammation && cancerToInflammation && edges.length === 2) {
            return {
                tone: 'warning',
                text: '<strong>Collider.</strong> Both Smoking and Cancer point into Inflammation. Inflammation is a collider — adjusting for or restricting to it can open a spurious association.'
            };
        }

        if (smokingToInflammation && inflammationToCancer && smokingToCancer) {
            return {
                tone: 'success',
                text: '<strong>Mediated and direct paths.</strong> You drew both a mediated route (through inflammation) and a direct Smoking &rarr; Cancer arrow. DAGs can include multiple causal paths.'
            };
        }

        if (smokingToCancer && edges.length === 1) {
            return {
                tone: 'info',
                text: '<strong>Direct effect.</strong> You drew Smoking &rarr; Cancer without inflammation on the pathway. Try adding Smoking &rarr; Inflammation &rarr; Cancer to model a mediator.'
            };
        }

        if (smokingToInflammation && edges.length === 1) {
            return {
                tone: 'info',
                text: 'Smoking &rarr; Inflammation is drawn. Add Inflammation &rarr; Cancer to complete a mediator chain, or draw Cancer &rarr; Inflammation to create a collider.'
            };
        }

        if (cancerToInflammation && edges.length === 1) {
            return {
                tone: 'info',
                text: 'Cancer &rarr; Inflammation alone suggests the outcome influences inflammation. Add Smoking &rarr; Inflammation to model a collider structure.'
            };
        }

        if (inflammationToCancer && edges.length === 1) {
            return {
                tone: 'info',
                text: 'Inflammation &rarr; Cancer is drawn. Add Smoking &rarr; Inflammation to complete a mediator pathway.'
            };
        }

        if (cancerToInflammation && smokingToInflammation) {
            return {
                tone: 'warning',
                text: '<strong>Collider.</strong> Both Smoking and Cancer point into Inflammation. Conditioning on inflammation can distort the smoking–cancer relationship.'
            };
        }

        return {
            tone: 'info',
            text: 'Your DAG states a specific set of causal assumptions. Compare it with a mediator chain (Smoking &rarr; Inflammation &rarr; Cancer) or a collider (Smoking &rarr; Inflammation &larr; Cancer).'
        };
    }

    class DagDrawBoard {
        constructor(container, options) {
            this.container = container;
            this.nodes = options.nodes;
            this.singleEdge = Boolean(options.singleEdge);
            this.interpret = options.interpret;
            this.feedbackEl = options.feedbackEl;
            this.edges = [];
            this.drag = null;

            this.nodeMap = Object.fromEntries(this.nodes.map(node => [node.id, node]));

            this.render();
            this.bindPointerEvents();
            this.updateFeedback();
        }

        render() {
            const width = 400;
            const height = this.nodes.length > 2 ? 300 : 220;

            this.container.innerHTML = `
                <svg class="dag-draw-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive DAG drawing board">
                    <defs>
                        <marker id="arrow-${this.container.id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#232D4B"></polygon>
                        </marker>
                    </defs>
                    <g class="dag-draw-edges"></g>
                    <line class="dag-draw-preview hidden" x1="0" y1="0" x2="0" y2="0"></line>
                    <g class="dag-draw-nodes"></g>
                </svg>
            `;

            this.svg = this.container.querySelector('svg');
            this.edgesLayer = this.svg.querySelector('.dag-draw-edges');
            this.previewLine = this.svg.querySelector('.dag-draw-preview');
            this.nodesLayer = this.svg.querySelector('.dag-draw-nodes');

            this.nodes.forEach(node => {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('class', 'dag-draw-node');
                group.setAttribute('data-id', node.id);
                group.setAttribute('transform', `translate(${node.x}, ${node.y})`);

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', String(-node.width / 2));
                rect.setAttribute('y', String(-node.height / 2));
                rect.setAttribute('width', String(node.width));
                rect.setAttribute('height', String(node.height));
                rect.setAttribute('rx', '8');

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dy', '5');
                text.textContent = node.label;

                group.appendChild(rect);
                group.appendChild(text);
                this.nodesLayer.appendChild(group);
            });

            this.redrawEdges();
        }

        bindPointerEvents() {
            this.svg.addEventListener('pointerdown', e => this.onPointerDown(e));
            this.svg.addEventListener('pointermove', e => this.onPointerMove(e));
            this.svg.addEventListener('pointerup', e => this.onPointerUp(e));
            this.svg.addEventListener('pointercancel', () => this.cancelDrag());
            this.svg.addEventListener('lostpointercapture', () => this.cancelDrag());
        }

        clientToSvg(clientX, clientY) {
            const point = this.svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(this.svg.getScreenCTM().inverse());
        }

        getNodeAt(x, y) {
            let closest = null;
            let closestDistance = Infinity;

            this.nodes.forEach(node => {
                const distance = Math.hypot(node.x - x, node.y - y);
                if (distance <= HIT_RADIUS && distance < closestDistance) {
                    closest = node;
                    closestDistance = distance;
                }
            });

            return closest;
        }

        onPointerDown(event) {
            const targetNode = event.target.closest('.dag-draw-node');
            if (!targetNode) return;

            const nodeId = targetNode.getAttribute('data-id');
            const node = this.nodeMap[nodeId];
            if (!node) return;

            event.preventDefault();
            this.svg.setPointerCapture(event.pointerId);

            this.drag = {
                pointerId: event.pointerId,
                fromId: nodeId,
                fromNode: node
            };

            targetNode.classList.add('active');
            this.previewLine.classList.remove('hidden');
            this.setPreview(node.x, node.y, node.x, node.y);
        }

        onPointerMove(event) {
            if (!this.drag || event.pointerId !== this.drag.pointerId) return;

            event.preventDefault();
            const point = this.clientToSvg(event.clientX, event.clientY);
            const hoverNode = this.getNodeAt(point.x, point.y);

            this.nodesLayer.querySelectorAll('.dag-draw-node').forEach(nodeEl => {
                nodeEl.classList.toggle('hover-target', hoverNode && nodeEl.getAttribute('data-id') === hoverNode.id && hoverNode.id !== this.drag.fromId);
            });

            this.setPreview(this.drag.fromNode.x, this.drag.fromNode.y, point.x, point.y);
        }

        onPointerUp(event) {
            if (!this.drag || event.pointerId !== this.drag.pointerId) return;

            event.preventDefault();
            const point = this.clientToSvg(event.clientX, event.clientY);
            const targetNode = this.getNodeAt(point.x, point.y);

            if (targetNode && targetNode.id !== this.drag.fromId) {
                this.addEdge(this.drag.fromId, targetNode.id);
            }

            this.cancelDrag();
        }

        cancelDrag() {
            if (!this.drag) return;

            this.nodesLayer.querySelectorAll('.dag-draw-node').forEach(nodeEl => {
                nodeEl.classList.remove('active', 'hover-target');
            });

            this.previewLine.classList.add('hidden');
            this.drag = null;
        }

        addEdge(from, to) {
            const key = edgeKey(from, to);

            if (this.singleEdge) {
                this.edges = [{ from, to }];
            } else {
                const existingIndex = this.edges.findIndex(edge => edgeKey(edge.from, edge.to) === key);
                if (existingIndex >= 0) {
                    this.edges.splice(existingIndex, 1);
                }
                this.edges.push({ from, to });
            }

            this.redrawEdges();
            this.updateFeedback();
        }

        clear() {
            this.edges = [];
            this.cancelDrag();
            this.redrawEdges();
            this.updateFeedback();
        }

        setPreview(x1, y1, x2, y2) {
            this.previewLine.setAttribute('x1', String(x1));
            this.previewLine.setAttribute('y1', String(y1));
            this.previewLine.setAttribute('x2', String(x2));
            this.previewLine.setAttribute('y2', String(y2));
        }

        getAnchorPoints(fromNode, toNode) {
            const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            const fromOffset = this.getNodeRadius(fromNode);
            const toOffset = this.getNodeRadius(toNode);

            return {
                x1: fromNode.x + Math.cos(angle) * fromOffset,
                y1: fromNode.y + Math.sin(angle) * fromOffset,
                x2: toNode.x - Math.cos(angle) * toOffset,
                y2: toNode.y - Math.sin(angle) * toOffset
            };
        }

        getNodeRadius(node) {
            return Math.max(node.width, node.height) / 2 + 4;
        }

        redrawEdges() {
            const markerId = `arrow-${this.container.id}`;
            this.edgesLayer.innerHTML = '';

            this.edges.forEach(edge => {
                const fromNode = this.nodeMap[edge.from];
                const toNode = this.nodeMap[edge.to];
                if (!fromNode || !toNode) return;

                const { x1, y1, x2, y2 } = this.getAnchorPoints(fromNode, toNode);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('class', 'dag-draw-edge');
                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.setAttribute('marker-end', `url(#${markerId})`);
                this.edgesLayer.appendChild(line);
            });
        }

        updateFeedback() {
            if (!this.feedbackEl) return;

            const result = this.interpret(this.edges);
            this.feedbackEl.innerHTML = result.text;
            this.feedbackEl.classList.remove('hidden', 'feedback-info', 'feedback-success', 'feedback-warning');
            this.feedbackEl.classList.add(`feedback-${result.tone}`);
        }
    }

    const boardOne = new DagDrawBoard(document.getElementById('draw-board-1'), {
        singleEdge: true,
        feedbackEl: document.getElementById('feedback-1'),
        interpret: interpretTwoNode,
        nodes: [
            { id: 'smoking', label: 'Smoking', x: 95, y: 110, width: 108, height: 44 },
            { id: 'cancer', label: 'Cancer', x: 305, y: 110, width: 96, height: 44 }
        ]
    });

    const boardTwo = new DagDrawBoard(document.getElementById('draw-board-2'), {
        singleEdge: false,
        feedbackEl: document.getElementById('feedback-2'),
        interpret: interpretMediator,
        nodes: [
            { id: 'smoking', label: 'Smoking', x: 85, y: 85, width: 108, height: 44 },
            { id: 'inflammation', label: 'Inflammation', x: 200, y: 235, width: 132, height: 44 },
            { id: 'cancer', label: 'Cancer', x: 315, y: 85, width: 96, height: 44 }
        ]
    });

    document.getElementById('reset-1').addEventListener('click', () => boardOne.clear());
    document.getElementById('reset-2').addEventListener('click', () => boardTwo.clear());
})();
