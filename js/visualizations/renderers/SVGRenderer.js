/**
 * SVG Renderer for NCS-API-Website
 * High-quality scalable vector graphics rendering for data visualizations
 * Optimized for print quality, animations, and interactive elements
 */

import { EventBus } from '../../core/eventBus.js';

export class SVGRenderer {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        
        if (!this.container) {
            throw new Error('Container element not found for SVG renderer');
        }

        // Renderer configuration
        this.config = {
            width: options.width || 800,
            height: options.height || 600,
            preserveAspectRatio: options.preserveAspectRatio || 'xMidYMid meet',
            enableAnimations: options.enableAnimations !== false,
            enableInteractivity: options.enableInteractivity !== false,
            optimizePerformance: options.optimizePerformance || false,
            exportQuality: options.exportQuality || 'high', // high, medium, low
            theme: options.theme || 'light',
            ...options
        };

        // SVG namespace
        this.svgNS = 'http://www.w3.org/2000/svg';
        this.xlinkNS = 'http://www.w3.org/1999/xlink';

        // Rendering state
        this.svg = null;
        this.defs = null;
        this.layers = new Map();
        this.clipPaths = new Map();
        this.gradients = new Map();
        this.patterns = new Map();
        this.animations = new Map();
        this.idCounter = 0;

        // Performance tracking
        this.elementCount = 0;
        this.renderTime = 0;
        this.lastRender = 0;

        // Layer management
        this.layerOrder = [
            'background',
            'grid',
            'data',
            'annotations',
            'ui',
            'overlay'
        ];

        // Initialize renderer
        this.initialize();
    }

    /**
     * Initialize SVG renderer
     */
    initialize() {
        // Create main SVG element
        this.svg = this.createElement('svg', {
            width: this.config.width,
            height: this.config.height,
            viewBox: `0 0 ${this.config.width} ${this.config.height}`,
            preserveAspectRatio: this.config.preserveAspectRatio,
            class: 'ncs-svg-renderer'
        });

        // Create definitions section
        this.defs = this.createElement('defs');
        this.svg.appendChild(this.defs);

        // Create default gradients and patterns
        this.createDefaultAssets();

        // Create layer groups
        this.createLayers();

        // Apply theme
        this.applyTheme(this.config.theme);

        // Add to container
        this.container.appendChild(this.svg);

        // Setup event handlers
        this.setupEventHandlers();

        EventBus.emit('svg_renderer:initialized', {
            width: this.config.width,
            height: this.config.height,
            container: this.container.id || 'unnamed'
        });
    }

    /**
     * Create SVG element with attributes
     * @param {String} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @returns {SVGElement} Created element
     */
    createElement(tagName, attributes = {}) {
        const element = document.createElementNS(this.svgNS, tagName);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key.startsWith('data-') || key === 'class' || key === 'id') {
                element.setAttribute(key, value);
            } else if (key.includes(':')) {
                // Handle namespaced attributes
                const [ns, attr] = key.split(':');
                if (ns === 'xlink') {
                    element.setAttributeNS(this.xlinkNS, key, value);
                } else {
                    element.setAttribute(key, value);
                }
            } else {
                element.setAttribute(key, value);
            }
        });

        this.elementCount++;
        return element;
    }

    /**
     * Generate unique ID
     * @param {String} prefix - ID prefix
     * @returns {String} Unique ID
     */
    generateId(prefix = 'svg') {
        return `${prefix}_${++this.idCounter}_${Date.now()}`;
    }

    /**
     * Create default gradients and patterns
     */
    createDefaultAssets() {
        // Default linear gradient
        const defaultGradient = this.createLinearGradient('defaultGradient', [
            { offset: '0%', color: '#3b82f6', opacity: 1 },
            { offset: '100%', color: '#1d4ed8', opacity: 1 }
        ]);

        // Cluster color gradients
        const clusterColors = [
            ['#ff6b6b', '#ee5a52'],
            ['#4ecdc4', '#45b7d1'],
            ['#96ceb4', '#6ab04c'],
            ['#ffeaa7', '#fdcb6e'],
            ['#dda0dd', '#c44569'],
            ['#98d8c8', '#06a3da'],
            ['#f7b801', '#f39801'],
            ['#ea8685', '#eb4d4b']
        ];

        clusterColors.forEach((colors, index) => {
            this.createLinearGradient(`cluster${index}`, [
                { offset: '0%', color: colors[0], opacity: 0.8 },
                { offset: '100%', color: colors[1], opacity: 1 }
            ]);
        });

        // Grid pattern
        this.createGridPattern('defaultGrid', 20, '#e5e7eb', 0.5);

        // Dot pattern for backgrounds
        this.createDotPattern('dotPattern', 10, '#9ca3af', 0.3);
    }

    /**
     * Create layer groups for organized rendering
     */
    createLayers() {
        this.layerOrder.forEach(layerName => {
            const layer = this.createElement('g', {
                class: `layer-${layerName}`,
                id: `layer-${layerName}`
            });
            this.svg.appendChild(layer);
            this.layers.set(layerName, layer);
        });
    }

    /**
     * Get layer group by name
     * @param {String} layerName - Layer name
     * @returns {SVGGElement} Layer group
     */
    getLayer(layerName) {
        return this.layers.get(layerName) || this.layers.get('data');
    }

    /**
     * Clear specific layer
     * @param {String} layerName - Layer to clear
     */
    clearLayer(layerName) {
        const layer = this.getLayer(layerName);
        if (layer) {
            while (layer.firstChild) {
                layer.removeChild(layer.firstChild);
            }
        }
    }

    /**
     * Clear all layers
     */
    clear() {
        this.layerOrder.forEach(layerName => {
            this.clearLayer(layerName);
        });
        this.elementCount = 0;
    }

    /**
     * Draw scatter plot points
     * @param {Array} points - Data points
     * @param {Object} options - Drawing options
     */
    drawScatterPlot(points, options = {}) {
        const opts = {
            layer: 'data',
            radius: 4,
            fillColor: '#3b82f6',
            strokeColor: '#1e40af',
            strokeWidth: 1,
            opacity: 0.8,
            colorByCluster: true,
            showLabels: false,
            labelOffset: 5,
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'scatter-plot' });

        points.forEach((point, index) => {
            // Determine colors
            let fillColor = opts.fillColor;
            let strokeColor = opts.strokeColor;
            
            if (opts.colorByCluster && point.cluster !== undefined) {
                const gradientId = `cluster${point.cluster % 8}`;
                fillColor = `url(#${gradientId})`;
                strokeColor = this.getClusterStrokeColor(point.cluster);
            }

            // Create circle
            const circle = this.createElement('circle', {
                cx: point.x,
                cy: point.y,
                r: opts.radius,
                fill: fillColor,
                stroke: strokeColor,
                'stroke-width': opts.strokeWidth,
                opacity: opts.opacity,
                class: `data-point cluster-${point.cluster || 0}`,
                'data-index': index,
                'data-cluster': point.cluster || 0
            });

            // Add interactivity
            if (this.config.enableInteractivity) {
                circle.style.cursor = 'pointer';
                circle.addEventListener('mouseenter', () => {
                    circle.setAttribute('r', opts.radius * 1.2);
                    this.showTooltip(point, { x: point.x, y: point.y });
                });
                
                circle.addEventListener('mouseleave', () => {
                    circle.setAttribute('r', opts.radius);
                    this.hideTooltip();
                });

                circle.addEventListener('click', () => {
                    EventBus.emit('svg_renderer:point_clicked', { point, index });
                });
            }

            group.appendChild(circle);

            // Add label if requested
            if (opts.showLabels && point.label) {
                const text = this.createElement('text', {
                    x: point.x,
                    y: point.y - opts.radius - opts.labelOffset,
                    'text-anchor': 'middle',
                    'font-size': '10px',
                    'font-family': 'sans-serif',
                    fill: strokeColor,
                    class: 'point-label'
                });
                text.textContent = point.label;
                group.appendChild(text);
            }
        });

        layer.appendChild(group);
        return group;
    }

    /**
     * Draw line chart
     * @param {Array} data - Data points with x, y coordinates
     * @param {Object} options - Drawing options
     */
    drawLineChart(data, options = {}) {
        const opts = {
            layer: 'data',
            strokeColor: '#3b82f6',
            strokeWidth: 2,
            fill: 'none',
            smooth: false,
            showPoints: true,
            pointRadius: 3,
            animate: false,
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'line-chart' });

        if (data.length === 0) return group;

        // Create path data
        let pathData = '';
        if (opts.smooth) {
            pathData = this.createSmoothPath(data);
        } else {
            pathData = data.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
            ).join(' ');
        }

        // Create path element
        const path = this.createElement('path', {
            d: pathData,
            stroke: opts.strokeColor,
            'stroke-width': opts.strokeWidth,
            fill: opts.fill,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            class: 'line-path'
        });

        group.appendChild(path);

        // Add points if requested
        if (opts.showPoints) {
            data.forEach((point, index) => {
                const circle = this.createElement('circle', {
                    cx: point.x,
                    cy: point.y,
                    r: opts.pointRadius,
                    fill: opts.strokeColor,
                    class: 'line-point',
                    'data-index': index
                });

                if (this.config.enableInteractivity) {
                    this.addPointInteractivity(circle, point, index);
                }

                group.appendChild(circle);
            });
        }

        // Add animation if requested
        if (opts.animate && this.config.enableAnimations) {
            this.animatePath(path);
        }

        layer.appendChild(group);
        return group;
    }

    /**
     * Draw area chart
     * @param {Array} data - Data points
     * @param {Object} options - Drawing options
     */
    drawAreaChart(data, options = {}) {
        const opts = {
            layer: 'data',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            strokeColor: '#1e40af',
            strokeWidth: 2,
            baseline: 0,
            smooth: false,
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'area-chart' });

        if (data.length === 0) return group;

        // Create area path
        let pathData = '';
        const baselineY = opts.baseline;

        if (opts.smooth) {
            // Smooth area path
            const topPath = this.createSmoothPath(data);
            const bottomPath = data.slice().reverse().map(point => 
                `L ${point.x} ${baselineY}`
            ).join(' ');
            pathData = topPath + ' ' + bottomPath + ' Z';
        } else {
            // Linear area path
            pathData = data.map((point, index) => 
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
            ).join(' ');
            
            // Close area to baseline
            pathData += ` L ${data[data.length - 1].x} ${baselineY}`;
            pathData += ` L ${data[0].x} ${baselineY} Z`;
        }

        const area = this.createElement('path', {
            d: pathData,
            fill: opts.fillColor,
            'fill-opacity': opts.fillOpacity,
            stroke: opts.strokeColor,
            'stroke-width': opts.strokeWidth,
            class: 'area-path'
        });

        group.appendChild(area);
        layer.appendChild(group);
        return group;
    }

    /**
     * Draw heatmap
     * @param {Array} data - 2D data array
     * @param {Object} options - Drawing options
     */
    drawHeatmap(data, options = {}) {
        const opts = {
            layer: 'data',
            cellWidth: 20,
            cellHeight: 20,
            colorScale: 'viridis',
            showLabels: false,
            strokeWidth: 0.5,
            strokeColor: '#ffffff',
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'heatmap' });

        // Create color scale
        const colorScale = this.createColorScale(opts.colorScale, data);

        data.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                const x = colIndex * opts.cellWidth;
                const y = rowIndex * opts.cellHeight;
                const color = colorScale(value);

                const rect = this.createElement('rect', {
                    x: x,
                    y: y,
                    width: opts.cellWidth,
                    height: opts.cellHeight,
                    fill: color,
                    stroke: opts.strokeColor,
                    'stroke-width': opts.strokeWidth,
                    class: 'heatmap-cell',
                    'data-row': rowIndex,
                    'data-col': colIndex,
                    'data-value': value
                });

                if (this.config.enableInteractivity) {
                    rect.addEventListener('mouseenter', () => {
                        this.showTooltip({ value, row: rowIndex, col: colIndex }, { x: x + opts.cellWidth/2, y: y + opts.cellHeight/2 });
                    });
                    rect.addEventListener('mouseleave', () => {
                        this.hideTooltip();
                    });
                }

                group.appendChild(rect);

                // Add text label if requested
                if (opts.showLabels) {
                    const text = this.createElement('text', {
                        x: x + opts.cellWidth / 2,
                        y: y + opts.cellHeight / 2,
                        'text-anchor': 'middle',
                        'dominant-baseline': 'central',
                        'font-size': '10px',
                        'font-family': 'sans-serif',
                        fill: this.getContrastColor(color),
                        class: 'heatmap-label'
                    });
                    text.textContent = value.toFixed(2);
                    group.appendChild(text);
                }
            });
        });

        layer.appendChild(group);
        return group;
    }

    /**
     * Draw grid
     * @param {Object} options - Grid options
     */
    drawGrid(options = {}) {
        const opts = {
            layer: 'grid',
            xStep: 50,
            yStep: 50,
            strokeColor: '#e5e7eb',
            strokeWidth: 1,
            opacity: 0.5,
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'grid' });

        // Vertical lines
        for (let x = 0; x <= this.config.width; x += opts.xStep) {
            const line = this.createElement('line', {
                x1: x,
                y1: 0,
                x2: x,
                y2: this.config.height,
                stroke: opts.strokeColor,
                'stroke-width': opts.strokeWidth,
                opacity: opts.opacity,
                class: 'grid-line-vertical'
            });
            group.appendChild(line);
        }

        // Horizontal lines
        for (let y = 0; y <= this.config.height; y += opts.yStep) {
            const line = this.createElement('line', {
                x1: 0,
                y1: y,
                x2: this.config.width,
                y2: y,
                stroke: opts.strokeColor,
                'stroke-width': opts.strokeWidth,
                opacity: opts.opacity,
                class: 'grid-line-horizontal'
            });
            group.appendChild(line);
        }

        layer.appendChild(group);
        return group;
    }

    /**
     * Draw axes
     * @param {Object} options - Axes options
     */
    drawAxes(options = {}) {
        const opts = {
            layer: 'ui',
            showXAxis: true,
            showYAxis: true,
            strokeColor: '#374151',
            strokeWidth: 2,
            tickLength: 5,
            tickColor: '#6b7280',
            labelColor: '#374151',
            labelSize: '12px',
            margin: { top: 20, right: 20, bottom: 40, left: 60 },
            ...options
        };

        const layer = this.getLayer(opts.layer);
        const group = this.createElement('g', { class: 'axes' });

        const plotArea = {
            x: opts.margin.left,
            y: opts.margin.top,
            width: this.config.width - opts.margin.left - opts.margin.right,
            height: this.config.height - opts.margin.top - opts.margin.bottom
        };

        // X-axis
        if (opts.showXAxis) {
            const xAxis = this.createElement('line', {
                x1: plotArea.x,
                y1: plotArea.y + plotArea.height,
                x2: plotArea.x + plotArea.width,
                y2: plotArea.y + plotArea.height,
                stroke: opts.strokeColor,
                'stroke-width': opts.strokeWidth,
                class: 'x-axis'
            });
            group.appendChild(xAxis);

            // X-axis ticks and labels
            if (opts.xTicks) {
                opts.xTicks.forEach(tick => {
                    const x = plotArea.x + (tick.position * plotArea.width);
                    
                    // Tick mark
                    const tickMark = this.createElement('line', {
                        x1: x,
                        y1: plotArea.y + plotArea.height,
                        x2: x,
                        y2: plotArea.y + plotArea.height + opts.tickLength,
                        stroke: opts.tickColor,
                        'stroke-width': 1,
                        class: 'x-tick'
                    });
                    group.appendChild(tickMark);

                    // Tick label
                    const label = this.createElement('text', {
                        x: x,
                        y: plotArea.y + plotArea.height + opts.tickLength + 15,
                        'text-anchor': 'middle',
                        'font-size': opts.labelSize,
                        'font-family': 'sans-serif',
                        fill: opts.labelColor,
                        class: 'x-label'
                    });
                    label.textContent = tick.label;
                    group.appendChild(label);
                });
            }
        }

        // Y-axis
        if (opts.showYAxis) {
            const yAxis = this.createElement('line', {
                x1: plotArea.x,
                y1: plotArea.y,
                x2: plotArea.x,
                y2: plotArea.y + plotArea.height,
                stroke: opts.strokeColor,
                'stroke-width': opts.strokeWidth,
                class: 'y-axis'
            });
            group.appendChild(yAxis);

            // Y-axis ticks and labels
            if (opts.yTicks) {
                opts.yTicks.forEach(tick => {
                    const y = plotArea.y + plotArea.height - (tick.position * plotArea.height);
                    
                    // Tick mark
                    const tickMark = this.createElement('line', {
                        x1: plotArea.x - opts.tickLength,
                        y1: y,
                        x2: plotArea.x,
                        y2: y,
                        stroke: opts.tickColor,
                        'stroke-width': 1,
                        class: 'y-tick'
                    });
                    group.appendChild(tickMark);

                    // Tick label
                    const label = this.createElement('text', {
                        x: plotArea.x - opts.tickLength - 5,
                        y: y,
                        'text-anchor': 'end',
                        'dominant-baseline': 'central',
                        'font-size': opts.labelSize,
                        'font-family': 'sans-serif',
                        fill: opts.labelColor,
                        class: 'y-label'
                    });
                    label.textContent = tick.label;
                    group.appendChild(label);
                });
            }
        }

        layer.appendChild(group);
        return group;
    }

    /**
     * Create linear gradient
     * @param {String} id - Gradient ID
     * @param {Array} stops - Color stops
     * @param {Object} options - Gradient options
     */
    createLinearGradient(id, stops, options = {}) {
        const opts = {
            x1: '0%',
            y1: '0%',
            x2: '100%',
            y2: '0%',
            ...options
        };

        const gradient = this.createElement('linearGradient', {
            id: id,
            x1: opts.x1,
            y1: opts.y1,
            x2: opts.x2,
            y2: opts.y2
        });

        stops.forEach(stop => {
            const stopElement = this.createElement('stop', {
                offset: stop.offset,
                'stop-color': stop.color,
                'stop-opacity': stop.opacity || 1
            });
            gradient.appendChild(stopElement);
        });

        this.defs.appendChild(gradient);
        this.gradients.set(id, gradient);
        return gradient;
    }

    /**
     * Create radial gradient
     * @param {String} id - Gradient ID
     * @param {Array} stops - Color stops
     * @param {Object} options - Gradient options
     */
    createRadialGradient(id, stops, options = {}) {
        const opts = {
            cx: '50%',
            cy: '50%',
            r: '50%',
            ...options
        };

        const gradient = this.createElement('radialGradient', {
            id: id,
            cx: opts.cx,
            cy: opts.cy,
            r: opts.r
        });

        stops.forEach(stop => {
            const stopElement = this.createElement('stop', {
                offset: stop.offset,
                'stop-color': stop.color,
                'stop-opacity': stop.opacity || 1
            });
            gradient.appendChild(stopElement);
        });

        this.defs.appendChild(gradient);
        this.gradients.set(id, gradient);
        return gradient;
    }

    /**
     * Create pattern
     * @param {String} id - Pattern ID
     * @param {Number} width - Pattern width
     * @param {Number} height - Pattern height
     * @param {Function} drawFunction - Function to draw pattern content
     */
    createPattern(id, width, height, drawFunction) {
        const pattern = this.createElement('pattern', {
            id: id,
            width: width,
            height: height,
            patternUnits: 'userSpaceOnUse'
        });

        drawFunction(pattern, this);

        this.defs.appendChild(pattern);
        this.patterns.set(id, pattern);
        return pattern;
    }

    /**
     * Create grid pattern
     * @param {String} id - Pattern ID
     * @param {Number} size - Grid size
     * @param {String} color - Grid color
     * @param {Number} opacity - Grid opacity
     */
    createGridPattern(id, size, color, opacity) {
        return this.createPattern(id, size, size, (pattern, renderer) => {
            const rect = renderer.createElement('rect', {
                width: size,
                height: size,
                fill: 'none',
                stroke: color,
                'stroke-width': 1,
                opacity: opacity
            });
            pattern.appendChild(rect);
        });
    }

    /**
     * Create dot pattern
     * @param {String} id - Pattern ID
     * @param {Number} spacing - Dot spacing
     * @param {String} color - Dot color
     * @param {Number} opacity - Dot opacity
     */
    createDotPattern(id, spacing, color, opacity) {
        return this.createPattern(id, spacing, spacing, (pattern, renderer) => {
            const circle = renderer.createElement('circle', {
                cx: spacing / 2,
                cy: spacing / 2,
                r: 1,
                fill: color,
                opacity: opacity
            });
            pattern.appendChild(circle);
        });
    }

    /**
     * Utility methods
     */

    createSmoothPath(data) {
        if (data.length < 2) return '';
        
        let path = `M ${data[0].x} ${data[0].y}`;
        
        for (let i = 1; i < data.length - 1; i++) {
            const prev = data[i - 1];
            const curr = data[i];
            const next = data[i + 1];
            
            const cp1x = curr.x - (next.x - prev.x) * 0.15;
            const cp1y = curr.y - (next.y - prev.y) * 0.15;
            const cp2x = curr.x + (next.x - prev.x) * 0.15;
            const cp2y = curr.y + (next.y - prev.y) * 0.15;
            
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        }
        
        const lastPoint = data[data.length - 1];
        path += ` L ${lastPoint.x} ${lastPoint.y}`;
        
        return path;
    }

    createColorScale(scaleName, data) {
        const flatData = data.flat();
        const min = Math.min(...flatData);
        const max = Math.max(...flatData);
        const range = max - min;
        
        const scales = {
            viridis: (value) => {
                const t = (value - min) / range;
                const r = Math.floor(255 * (0.267 + 0.735 * t));
                const g = Math.floor(255 * (0.004 + 0.718 * t));
                const b = Math.floor(255 * (0.329 + 0.584 * t));
                return `rgb(${r}, ${g}, ${b})`;
            },
            plasma: (value) => {
                const t = (value - min) / range;
                const r = Math.floor(255 * (0.951 - 0.537 * t));
                const g = Math.floor(255 * (0.098 + 0.718 * t));
                const b = Math.floor(255 * (0.282 + 0.584 * t));
                return `rgb(${r}, ${g}, ${b})`;
            },
            blues: (value) => {
                const t = (value - min) / range;
                const intensity = Math.floor(255 * t);
                return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
            }
        };
        
        return scales[scaleName] || scales.viridis;
    }

    getClusterStrokeColor(cluster) {
        const colors = [
            '#dc2626', '#7c3aed', '#059669', '#d97706',
            '#be185d', '#0891b2', '#65a30d', '#9333ea'
        ];
        return colors[cluster % colors.length];
    }

    getContrastColor(backgroundColor) {
        // Simple contrast calculation
        const rgb = backgroundColor.match(/\d+/g);
        if (!rgb) return '#000000';
        
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    addPointInteractivity(element, point, index) {
        element.style.cursor = 'pointer';
        
        element.addEventListener('mouseenter', () => {
            element.setAttribute('r', parseFloat(element.getAttribute('r')) * 1.2);
            this.showTooltip(point, { 
                x: parseFloat(element.getAttribute('cx')), 
                y: parseFloat(element.getAttribute('cy')) 
            });
        });
        
        element.addEventListener('mouseleave', () => {
            element.setAttribute('r', parseFloat(element.getAttribute('r')) / 1.2);
            this.hideTooltip();
        });
        
        element.addEventListener('click', () => {
            EventBus.emit('svg_renderer:point_clicked', { point, index, element });
        });
    }

    animatePath(path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        
        const animation = this.createElement('animate', {
            attributeName: 'stroke-dashoffset',
            from: length,
            to: 0,
            dur: '1s',
            fill: 'freeze'
        });
        
        path.appendChild(animation);
    }

    setupEventHandlers() {
        if (this.config.enableInteractivity) {
            this.svg.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                EventBus.emit('svg_renderer:context_menu', { x: e.offsetX, y: e.offsetY });
            });
        }
    }

    applyTheme(theme) {
        this.svg.setAttribute('data-theme', theme);
        // Theme-specific styling can be applied via CSS
    }

    showTooltip(data, position) {
        // Implementation depends on your tooltip system
        EventBus.emit('svg_renderer:show_tooltip', { data, position });
    }

    hideTooltip() {
        EventBus.emit('svg_renderer:hide_tooltip');
    }

    /**
     * Export SVG as string
     * @param {Object} options - Export options
     * @returns {String} SVG string
     */
    exportSVG(options = {}) {
        const opts = {
            includeCSS: true,
            pretty: false,
            ...options
        };

        const svgClone = this.svg.cloneNode(true);
        
        if (opts.includeCSS) {
            // Add inline styles for export
            this.inlineStyles(svgClone);
        }
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgClone);
        
        if (opts.pretty) {
            svgString = this.prettifyXML(svgString);
        }
        
        return svgString;
    }

    inlineStyles(element) {
        // This would inline computed styles for export
        // Implementation depends on specific styling needs
    }

    prettifyXML(xml) {
        // Simple XML prettifier
        return xml.replace(/></g, '>\n<');
    }

    /**
     * Resize renderer
     * @param {Number} width - New width
     * @param {Number} height - New height
     */
    resize(width, height) {
        this.config.width = width;
        this.config.height = height;
        
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        EventBus.emit('svg_renderer:resized', { width, height });
    }

    /**
     * Destroy renderer and cleanup
     */
    destroy() {
        // Remove from DOM
        if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
        }
        
        // Clear maps
        this.layers.clear();
        this.gradients.clear();
        this.patterns.clear();
        this.animations.clear();
        
        EventBus.emit('svg_renderer:destroyed');
    }

    /**
     * Get renderer statistics
     * @returns {Object} Renderer stats
     */
    getStats() {
        return {
            elementCount: this.elementCount,
            layerCount: this.layers.size,
            gradientCount: this.gradients.size,
            patternCount: this.patterns.size,
            lastRenderTime: this.renderTime,
            dimensions: {
                width: this.config.width,
                height: this.config.height
            }
        };
    }
}

export default SVGRenderer;