/**
 * NCS-API Website - Dendrogram Hierarchical Tree
 * Interactive dendrogram visualization for hierarchical clustering
 * 
 * Features:
 * - SVG-based tree visualization
 * - Interactive node expansion/collapse
 * - Multiple layout orientations (top-down, left-right, radial)
 * - Dynamic cluster cutting at different heights
 * - Node highlighting and selection
 * - Smooth animations and transitions
 * - Zoom and pan functionality
 * - Export capabilities
 */

import { EventBus } from '../core/eventBusNew.js';
import { UI, PERFORMANCE } from '../config/constants.js';

export class Dendrogram {
    constructor(container, options = {}) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        // Configuration
        this.options = {
            width: options.width || UI.VIZ.DEFAULT_WIDTH,
            height: options.height || UI.VIZ.DEFAULT_HEIGHT,
            margin: options.margin || { top: 50, right: 50, bottom: 50, left: 50 },
            orientation: options.orientation || 'top-down', // 'top-down', 'left-right', 'radial'
            nodeSize: options.nodeSize || 6,
            leafSize: options.leafSize || 4,
            linkWidth: options.linkWidth || 2,
            fontSize: options.fontSize || 12,
            showLabels: options.showLabels !== false,
            showTooltips: options.showTooltips !== false,
            interactive: options.interactive !== false,
            animationDuration: options.animationDuration || 750,
            colorScheme: options.colorScheme || UI.VIZ.CLUSTER_COLORS,
            cutHeight: options.cutHeight || null,
            maxNodes: options.maxNodes || 1000,
            enableZoom: options.enableZoom !== false,
            ...options
        };
        
        // SVG elements
        this.svg = null;
        this.g = null;
        this.zoom = null;
        this.tooltip = null;
        
        // Tree data and layout
        this.treeData = null;
        this.hierarchy = null;
        this.tree = null;
        this.nodes = [];
        this.links = [];
        
        // State
        this.state = {
            selectedNode: null,
            highlightedPath: [],
            collapsedNodes: new Set(),
            cutLine: null,
            currentClusters: [],
            transform: { x: 0, y: 0, scale: 1 }
        };
        
        // Animation
        this.transition = null;
        
        this.init();
    }

    /**
     * Initialize the dendrogram
     */
    init() {
        this.createSVG();
        this.setupZoom();
        this.createTooltip();
        this.setupEventListeners();
        
        console.log('🌳 Dendrogram initialized');
    }

    /**
     * Create SVG container
     */
    createSVG() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', this.options.width);
        this.svg.setAttribute('height', this.options.height);
        this.svg.style.cssText = `
            cursor: ${this.options.enableZoom ? 'grab' : 'default'};
            background: #fafafa;
            border: 1px solid #e0e0e0;
        `;
        
        // Create main group
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.g);
        
        // Add to container
        this.container.appendChild(this.svg);
        
        // Create defs for patterns and gradients
        this.createDefs();
    }

    /**
     * Create SVG definitions
     */
    createDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Gradient for nodes
        const nodeGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        nodeGradient.setAttribute('id', 'nodeGradient');
        nodeGradient.innerHTML = `
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#cccccc" stop-opacity="1"/>
        `;
        defs.appendChild(nodeGradient);
        
        // Drop shadow filter
        const dropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        dropShadow.setAttribute('id', 'dropShadow');
        dropShadow.innerHTML = `
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="1" dy="1" result="offset"/>
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(dropShadow);
        
        this.svg.appendChild(defs);
    }

    /**
     * Setup zoom and pan functionality
     */
    setupZoom() {
        if (!this.options.enableZoom) return;
        
        this.zoom = {
            scale: 1,
            translateX: 0,
            translateY: 0,
            
            // Zoom event handler
            handleZoom: (event) => {
                event.preventDefault();
                
                const rect = this.svg.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                
                const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.1, Math.min(5, this.zoom.scale * scaleFactor));
                
                // Zoom towards mouse position
                this.zoom.translateX = mouseX - (mouseX - this.zoom.translateX) * (newScale / this.zoom.scale);
                this.zoom.translateY = mouseY - (mouseY - this.zoom.translateY) * (newScale / this.zoom.scale);
                this.zoom.scale = newScale;
                
                this.updateTransform();
            },
            
            // Pan event handlers
            handleMouseDown: (event) => {
                this.zoom.isDragging = true;
                this.zoom.lastMouseX = event.clientX;
                this.zoom.lastMouseY = event.clientY;
                this.svg.style.cursor = 'grabbing';
            },
            
            handleMouseMove: (event) => {
                if (!this.zoom.isDragging) return;
                
                const dx = event.clientX - this.zoom.lastMouseX;
                const dy = event.clientY - this.zoom.lastMouseY;
                
                this.zoom.translateX += dx;
                this.zoom.translateY += dy;
                this.zoom.lastMouseX = event.clientX;
                this.zoom.lastMouseY = event.clientY;
                
                this.updateTransform();
            },
            
            handleMouseUp: () => {
                this.zoom.isDragging = false;
                this.svg.style.cursor = 'grab';
            }
        };
        
        // Add event listeners
        this.svg.addEventListener('wheel', this.zoom.handleZoom);
        this.svg.addEventListener('mousedown', this.zoom.handleMouseDown);
        window.addEventListener('mousemove', this.zoom.handleMouseMove);
        window.addEventListener('mouseup', this.zoom.handleMouseUp);
    }

    /**
     * Update transform
     */
    updateTransform() {
        this.g.setAttribute('transform', 
            `translate(${this.zoom.translateX}, ${this.zoom.translateY}) scale(${this.zoom.scale})`
        );
    }

    /**
     * Create tooltip
     */
    createTooltip() {
        if (!this.options.showTooltips) return;
        
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'dendrogram-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Keyboard shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Set hierarchical clustering data
     */
    setData(hierarchicalData) {
        this.treeData = hierarchicalData;
        this.processTreeData();
        this.render();
        
        console.log(`🌳 Dendrogram data updated`);
    }

    /**
     * Process tree data into D3 hierarchy format
     */
    processTreeData() {
        if (!this.treeData) return;
        
        // Convert clustering data to hierarchical format
        this.hierarchy = this.createHierarchy(this.treeData);
        
        // Create tree layout
        this.createTreeLayout();
        
        // Calculate node positions
        this.calculatePositions();
    }

    /**
     * Create hierarchy from clustering data
     */
    createHierarchy(data) {
        // If data is already in tree format, use it directly
        if (data.children || data._children) {
            return data;
        }
        
        // Convert flat clustering result to tree structure
        // This assumes data contains merge information from hierarchical clustering
        if (data.merges && data.distances) {
            return this.buildTreeFromMerges(data.merges, data.distances, data.labels || []);
        }
        
        // Fallback: create simple binary tree
        return this.createSimpleTree(data);
    }

    /**
     * Build tree from merge information
     */
    buildTreeFromMerges(merges, distances, labels) {
        const nodes = labels.map((label, index) => ({
            id: index,
            name: label,
            isLeaf: true,
            height: 0,
            size: 1
        }));
        
        let nextId = labels.length;
        
        merges.forEach((merge, index) => {
            const [left, right] = merge;
            const leftNode = nodes[left];
            const rightNode = nodes[right];
            
            const newNode = {
                id: nextId++,
                name: `Cluster ${index + 1}`,
                isLeaf: false,
                height: distances[index] || 0,
                size: leftNode.size + rightNode.size,
                children: [leftNode, rightNode],
                _children: null
            };
            
            // Update parent references
            leftNode.parent = newNode;
            rightNode.parent = newNode;
            
            nodes.push(newNode);
        });
        
        // Return root node (last merge)
        return nodes[nodes.length - 1];
    }

    /**
     * Create simple tree for testing
     */
    createSimpleTree(data) {
        return {
            name: 'Root',
            height: 1.0,
            children: [
                {
                    name: 'Cluster A',
                    height: 0.8,
                    children: [
                        { name: 'Point 1', height: 0, isLeaf: true },
                        { name: 'Point 2', height: 0, isLeaf: true }
                    ]
                },
                {
                    name: 'Cluster B',
                    height: 0.6,
                    children: [
                        { name: 'Point 3', height: 0, isLeaf: true },
                        { name: 'Point 4', height: 0, isLeaf: true }
                    ]
                }
            ]
        };
    }

    /**
     * Create tree layout
     */
    createTreeLayout() {
        const { width, height, margin } = this.options;
        
        this.tree = {
            size: [width - margin.left - margin.right, height - margin.top - margin.bottom],
            
            // Node positioning based on orientation
            getPosition: (d) => {
                switch (this.options.orientation) {
                    case 'left-right':
                        return {
                            x: d.y || 0,
                            y: d.x || 0
                        };
                    case 'radial':
                        const angle = (d.x || 0) / this.tree.size[1] * 2 * Math.PI;
                        const radius = (d.y || 0);
                        return {
                            x: Math.cos(angle) * radius,
                            y: Math.sin(angle) * radius
                        };
                    default: // top-down
                        return {
                            x: d.x || 0,
                            y: d.y || 0
                        };
                }
            }
        };
    }

    /**
     * Calculate node positions
     */
    calculatePositions() {
        if (!this.hierarchy) return;
        
        // Assign coordinates to nodes
        this.assignCoordinates(this.hierarchy);
        
        // Collect all nodes and links
        this.nodes = [];
        this.links = [];
        this.collectNodesAndLinks(this.hierarchy);
    }

    /**
     * Assign coordinates to nodes recursively
     */
    assignCoordinates(node, depth = 0) {
        const { width, height, margin } = this.options;
        
        // Calculate Y position based on height/distance
        const maxHeight = this.getMaxHeight(this.hierarchy);
        const normalizedHeight = node.height / maxHeight;
        
        switch (this.options.orientation) {
            case 'left-right':
                node.y = margin.left + normalizedHeight * (width - margin.left - margin.right);
                break;
            case 'radial':
                node.y = normalizedHeight * Math.min(width, height) * 0.4;
                break;
            default: // top-down
                node.y = margin.top + normalizedHeight * (height - margin.top - margin.bottom);
        }
        
        // Calculate X position
        if (node.isLeaf || !node.children || node.children.length === 0) {
            // Leaf node - position will be calculated after all nodes are processed
            node.x = 0; // Temporary
        } else {
            // Process children first
            node.children.forEach(child => {
                this.assignCoordinates(child, depth + 1);
            });
            
            // Position internal node at center of children
            const childPositions = node.children.map(child => child.x);
            node.x = childPositions.reduce((sum, x) => sum + x, 0) / childPositions.length;
        }
    }

    /**
     * Position leaf nodes evenly
     */
    positionLeafNodes() {
        const leaves = this.getLeafNodes(this.hierarchy);
        const { width, margin } = this.options;
        const availableWidth = width - margin.left - margin.right;
        
        leaves.forEach((leaf, index) => {
            switch (this.options.orientation) {
                case 'left-right':
                    leaf.x = margin.top + (index / (leaves.length - 1 || 1)) * (this.options.height - margin.top - margin.bottom);
                    break;
                case 'radial':
                    leaf.x = (index / leaves.length) * availableWidth;
                    break;
                default: // top-down
                    leaf.x = margin.left + (index / (leaves.length - 1 || 1)) * availableWidth;
            }
        });
        
        // Update internal node positions
        this.updateInternalNodePositions(this.hierarchy);
    }

    /**
     * Update internal node positions based on children
     */
    updateInternalNodePositions(node) {
        if (!node.children || node.children.length === 0) return;
        
        // Process children first
        node.children.forEach(child => {
            this.updateInternalNodePositions(child);
        });
        
        // Update this node's position
        const childPositions = node.children.map(child => child.x);
        node.x = childPositions.reduce((sum, x) => sum + x, 0) / childPositions.length;
    }

    /**
     * Collect nodes and links for rendering
     */
    collectNodesAndLinks(node, parent = null) {
        this.nodes.push(node);
        
        if (parent) {
            this.links.push({
                source: parent,
                target: node
            });
        }
        
        if (node.children && !this.state.collapsedNodes.has(node.id)) {
            node.children.forEach(child => {
                this.collectNodesAndLinks(child, node);
            });
        }
    }

    /**
     * Main render function
     */
    render() {
        if (!this.hierarchy) return;
        
        this.positionLeafNodes();
        this.calculatePositions();
        
        this.renderLinks();
        this.renderNodes();
        
        if (this.options.cutHeight !== null) {
            this.renderCutLine();
        }
        
        // Center the tree
        this.centerTree();
    }

    /**
     * Render tree links
     */
    renderLinks() {
        // Remove existing links
        this.g.querySelectorAll('.link').forEach(el => el.remove());
        
        this.links.forEach(link => {
            const sourcePos = this.tree.getPosition(link.source);
            const targetPos = this.tree.getPosition(link.target);
            
            const linkEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            linkEl.classList.add('link');
            
            // Create curved path
            const path = this.createLinkPath(sourcePos, targetPos);
            linkEl.setAttribute('d', path);
            linkEl.setAttribute('fill', 'none');
            linkEl.setAttribute('stroke', '#999');
            linkEl.setAttribute('stroke-width', this.options.linkWidth);
            linkEl.setAttribute('opacity', '0.7');
            
            this.g.appendChild(linkEl);
        });
    }

    /**
     * Create link path based on orientation
     */
    createLinkPath(source, target) {
        switch (this.options.orientation) {
            case 'left-right':
                return `M${source.x},${source.y} C${(source.x + target.x) / 2},${source.y} ${(source.x + target.x) / 2},${target.y} ${target.x},${target.y}`;
            case 'radial':
                return `M${source.x},${source.y} L${target.x},${target.y}`;
            default: // top-down
                return `M${source.x},${source.y} C${source.x},${(source.y + target.y) / 2} ${target.x},${(source.y + target.y) / 2} ${target.x},${target.y}`;
        }
    }

    /**
     * Render tree nodes
     */
    renderNodes() {
        // Remove existing nodes
        this.g.querySelectorAll('.node').forEach(el => el.remove());
        
        this.nodes.forEach(node => {
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.classList.add('node');
            nodeGroup.setAttribute('data-node-id', node.id);
            
            const position = this.tree.getPosition(node);
            nodeGroup.setAttribute('transform', `translate(${position.x}, ${position.y})`);
            
            // Create node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const radius = node.isLeaf ? this.options.leafSize : this.options.nodeSize;
            
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', this.getNodeColor(node));
            circle.setAttribute('stroke', '#333');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('filter', 'url(#dropShadow)');
            
            if (this.options.interactive) {
                circle.style.cursor = 'pointer';
                
                // Add event listeners
                circle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleNodeClick(node);
                });
                
                circle.addEventListener('mouseenter', () => {
                    this.handleNodeHover(node, true);
                });
                
                circle.addEventListener('mouseleave', () => {
                    this.handleNodeHover(node, false);
                });
            }
            
            nodeGroup.appendChild(circle);
            
            // Add label
            if (this.options.showLabels && (node.isLeaf || this.options.nodeSize > 8)) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = node.name || `N${node.id}`;
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dy', node.isLeaf ? '0.35em' : '-1.2em');
                text.setAttribute('font-size', this.options.fontSize);
                text.setAttribute('fill', '#333');
                text.setAttribute('font-family', 'Arial, sans-serif');
                
                nodeGroup.appendChild(text);
            }
            
            this.g.appendChild(nodeGroup);
        });
    }

    /**
     * Render cut line
     */
    renderCutLine() {
        // Remove existing cut line
        this.g.querySelectorAll('.cut-line').forEach(el => el.remove());
        
        const { width, margin } = this.options;
        const maxHeight = this.getMaxHeight(this.hierarchy);
        const cutPosition = (this.options.cutHeight / maxHeight) * (this.options.height - margin.top - margin.bottom);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('cut-line');
        line.setAttribute('x1', margin.left);
        line.setAttribute('y1', margin.top + cutPosition);
        line.setAttribute('x2', width - margin.right);
        line.setAttribute('y2', margin.top + cutPosition);
        line.setAttribute('stroke', '#ff0000');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.8');
        
        this.g.appendChild(line);
        
        // Calculate clusters at cut height
        this.calculateClustersAtCutHeight();
    }

    /**
     * Get node color
     */
    getNodeColor(node) {
        if (node.isLeaf) {
            return '#4CAF50'; // Green for leaves
        }
        
        if (this.state.selectedNode === node) {
            return '#FF9800'; // Orange for selected
        }
        
        if (this.state.highlightedPath.includes(node)) {
            return '#2196F3'; // Blue for highlighted path
        }
        
        // Color based on height/distance
        const maxHeight = this.getMaxHeight(this.hierarchy);
        const intensity = node.height / maxHeight;
        const colorValue = Math.floor(255 * (1 - intensity));
        
        return `rgb(${colorValue}, ${colorValue}, 255)`;
    }

    /**
     * Handle node click
     */
    handleNodeClick(node) {
        if (node.isLeaf) {
            // Select leaf node
            this.state.selectedNode = node;
            this.highlightPathToRoot(node);
        } else {
            // Toggle collapse/expand for internal nodes
            this.toggleNodeCollapse(node);
        }
        
        this.render();
        
        // Emit event
        this.eventBus.emit('dendrogram:nodeSelected', {
            node,
            isLeaf: node.isLeaf,
            height: node.height
        });
    }

    /**
     * Handle node hover
     */
    handleNodeHover(node, isEntering) {
        if (!this.tooltip) return;
        
        if (isEntering) {
            const content = this.createTooltipContent(node);
            this.tooltip.innerHTML = content;
            this.tooltip.style.opacity = '1';
            
            // Position tooltip
            const rect = this.container.getBoundingClientRect();
            const position = this.tree.getPosition(node);
            this.tooltip.style.left = `${rect.left + position.x + 10}px`;
            this.tooltip.style.top = `${rect.top + position.y - 10}px`;
        } else {
            this.tooltip.style.opacity = '0';
        }
    }

    /**
     * Create tooltip content
     */
    createTooltipContent(node) {
        let content = `<strong>${node.name || `Node ${node.id}`}</strong><br>`;
        content += `Height: ${node.height.toFixed(3)}<br>`;
        
        if (node.size !== undefined) {
            content += `Size: ${node.size}<br>`;
        }
        
        if (node.isLeaf) {
            content += 'Type: Leaf';
        } else {
            content += `Type: Internal<br>`;
            content += `Children: ${node.children ? node.children.length : 0}`;
        }
        
        return content;
    }

    /**
     * Toggle node collapse/expand
     */
    toggleNodeCollapse(node) {
        if (this.state.collapsedNodes.has(node.id)) {
            this.state.collapsedNodes.delete(node.id);
            if (node._children) {
                node.children = node._children;
                node._children = null;
            }
        } else {
            this.state.collapsedNodes.add(node.id);
            if (node.children) {
                node._children = node.children;
                node.children = null;
            }
        }
    }

    /**
     * Highlight path to root
     */
    highlightPathToRoot(node) {
        this.state.highlightedPath = [];
        let current = node;
        
        while (current) {
            this.state.highlightedPath.push(current);
            current = current.parent;
        }
    }

    /**
     * Calculate clusters at cut height
     */
    calculateClustersAtCutHeight() {
        if (this.options.cutHeight === null) return;
        
        this.state.currentClusters = [];
        this.findClustersAtHeight(this.hierarchy, this.options.cutHeight);
        
        console.log(`🌳 Found ${this.state.currentClusters.length} clusters at height ${this.options.cutHeight}`);
    }

    /**
     * Find clusters at specified height
     */
    findClustersAtHeight(node, cutHeight) {
        if (node.height <= cutHeight) {
            // This node is below the cut, it's a cluster
            this.state.currentClusters.push(node);
        } else if (node.children) {
            // Continue searching in children
            node.children.forEach(child => {
                this.findClustersAtHeight(child, cutHeight);
            });
        }
    }

    /**
     * Center tree in viewport
     */
    centerTree() {
        if (this.nodes.length === 0) return;
        
        // Calculate bounding box
        const positions = this.nodes.map(node => this.tree.getPosition(node));
        const xPositions = positions.map(pos => pos.x);
        const yPositions = positions.map(pos => pos.y);
        
        const minX = Math.min(...xPositions);
        const maxX = Math.max(...xPositions);
        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const viewportCenterX = this.options.width / 2;
        const viewportCenterY = this.options.height / 2;
        
        if (this.zoom) {
            this.zoom.translateX = viewportCenterX - centerX;
            this.zoom.translateY = viewportCenterY - centerY;
            this.updateTransform();
        }
    }

    /**
     * Utility functions
     */
    getMaxHeight(node) {
        if (!node) return 0;
        
        let maxHeight = node.height || 0;
        
        if (node.children) {
            node.children.forEach(child => {
                maxHeight = Math.max(maxHeight, this.getMaxHeight(child));
            });
        }
        
        return maxHeight;
    }

    getLeafNodes(node) {
        if (!node) return [];
        
        if (node.isLeaf || !node.children || node.children.length === 0) {
            return [node];
        }
        
        let leaves = [];
        node.children.forEach(child => {
            leaves = leaves.concat(this.getLeafNodes(child));
        });
        
        return leaves;
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.options.width || newHeight !== this.options.height) {
            this.options.width = newWidth;
            this.options.height = newHeight;
            
            this.svg.setAttribute('width', newWidth);
            this.svg.setAttribute('height', newHeight);
            
            this.createTreeLayout();
            this.render();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'r':
                this.resetZoom();
                break;
            case 'c':
                this.centerTree();
                break;
            case 'Escape':
                this.clearSelection();
                break;
        }
    }

    /**
     * Set cut height
     */
    setCutHeight(height) {
        this.options.cutHeight = height;
        this.render();
    }

    /**
     * Set orientation
     */
    setOrientation(orientation) {
        this.options.orientation = orientation;
        this.createTreeLayout();
        this.render();
    }

    /**
     * Reset zoom
     */
    resetZoom() {
        if (this.zoom) {
            this.zoom.scale = 1;
            this.zoom.translateX = 0;
            this.zoom.translateY = 0;
            this.updateTransform();
            this.centerTree();
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.state.selectedNode = null;
        this.state.highlightedPath = [];
        this.render();
    }

    /**
     * Export as SVG
     */
    exportSVG() {
        const svgString = new XMLSerializer().serializeToString(this.svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dendrogram.svg';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Get current clusters
     */
    getCurrentClusters() {
        return this.state.currentClusters;
    }

    /**
     * Get available orientations
     */
    getOrientations() {
        return ['top-down', 'left-right', 'radial'];
    }

    /**
     * Destroy the dendrogram
     */
    destroy() {
        // Remove event listeners
        if (this.zoom) {
            this.svg.removeEventListener('wheel', this.zoom.handleZoom);
            this.svg.removeEventListener('mousedown', this.zoom.handleMouseDown);
            window.removeEventListener('mousemove', this.zoom.handleMouseMove);
            window.removeEventListener('mouseup', this.zoom.handleMouseUp);
        }
        
        window.removeEventListener('resize', this.handleResize.bind(this));
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Remove tooltip
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        
        console.log('🌳 Dendrogram destroyed');
    }
}