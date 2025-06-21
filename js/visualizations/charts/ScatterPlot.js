/**
 * NCS-API Website - 2D Scatter Plot Visualization
 * High-performance 2D scatter plot for clustering data visualization
 * 
 * Features:
 * - Canvas-based rendering for performance
 * - Real-time data updates
 * - Interactive pan/zoom
 * - Cluster visualization with colors
 * - Point selection and highlighting
 * - Customizable styling and themes
 * - Data point tooltips
 * - Export functionality
 */

import { EventBus } from '../core/eventBusNew.js';
import { UI, PERFORMANCE } from '../config/constants.js';

export class ScatterPlot {
    constructor(container, options = {}) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        // Configuration
        this.options = {
            width: options.width || UI.VIZ.DEFAULT_WIDTH,
            height: options.height || UI.VIZ.DEFAULT_HEIGHT,
            margin: options.margin || { top: 20, right: 20, bottom: 40, left: 40 },
            pointSize: options.pointSize || UI.VIZ.POINT_SIZE.DEFAULT,
            pointOpacity: options.pointOpacity || UI.VIZ.OPACITY.POINTS,
            showAxes: options.showAxes !== false,
            showGrid: options.showGrid !== false,
            showLabels: options.showLabels !== false,
            showLegend: options.showLegend !== false,
            interactive: options.interactive !== false,
            animationDuration: options.animationDuration || 300,
            colorScheme: options.colorScheme || UI.VIZ.CLUSTER_COLORS,
            backgroundColor: options.backgroundColor || 'transparent',
            ...options
        };
        
        // State
        this.state = {
            data: [],
            clusters: [],
            selectedPoints: new Set(),
            hoveredPoint: null,
            viewport: {
                x: 0,
                y: 0,
                scale: 1,
                minScale: 0.1,
                maxScale: 10
            },
            dimensions: {
                xMin: 0, xMax: 1,
                yMin: 0, yMax: 1
            },
            isDragging: false,
            lastMousePos: { x: 0, y: 0 }
        };
        
        // Canvas contexts
        this.canvas = null;
        this.ctx = null;
        this.overlayCanvas = null;
        this.overlayCtx = null;
        
        // Animation
        this.animationFrame = null;
        this.needsRedraw = true;
        
        this.init();
    }

    /**
     * Initialize the scatter plot
     */
    init() {
        this.createCanvases();
        this.setupEventListeners();
        this.calculateDimensions();
        this.startRenderLoop();
        
        console.log('📊 ScatterPlot initialized');
    }

    /**
     * Create canvas elements
     */
    createCanvases() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'scatter-plot-wrapper';
        wrapper.style.cssText = `
            position: relative;
            width: ${this.options.width}px;
            height: ${this.options.height}px;
            overflow: hidden;
            cursor: crosshair;
        `;
        
        // Main canvas for data points
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        `;
        this.ctx = this.canvas.getContext('2d');
        
        // Overlay canvas for interactions
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = this.options.width;
        this.overlayCanvas.height = this.options.height;
        this.overlayCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            z-index: 2;
            pointer-events: auto;
        `;
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Add canvases to wrapper
        wrapper.appendChild(this.canvas);
        wrapper.appendChild(this.overlayCanvas);
        
        // Add wrapper to container
        this.container.appendChild(wrapper);
        
        // Create tooltip
        this.createTooltip();
    }

    /**
     * Create tooltip element
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'scatter-plot-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
        `;
        this.container.appendChild(this.tooltip);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.options.interactive) return;
        
        // Mouse events
        this.overlayCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.overlayCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.overlayCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.overlayCanvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Wheel event for zooming
        this.overlayCanvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Prevent context menu
        this.overlayCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Set data for the scatter plot
     */
    setData(data) {
        this.state.data = data || [];
        this.calculateDimensions();
        this.needsRedraw = true;
        
        console.log(`📊 ScatterPlot data updated: ${this.state.data.length} points`);
    }

    /**
     * Set cluster information
     */
    setClusters(clusters) {
        this.state.clusters = clusters || [];
        this.needsRedraw = true;
        
        console.log(`📊 ScatterPlot clusters updated: ${this.state.clusters.length} clusters`);
    }

    /**
     * Calculate data dimensions and scales
     */
    calculateDimensions() {
        if (this.state.data.length === 0) {
            this.state.dimensions = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
            return;
        }
        
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;
        
        this.state.data.forEach(point => {
            const x = point.x !== undefined ? point.x : point[0];
            const y = point.y !== undefined ? point.y : point[1];
            
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
        });
        
        // Add padding
        const xPadding = (xMax - xMin) * 0.05;
        const yPadding = (yMax - yMin) * 0.05;
        
        this.state.dimensions = {
            xMin: xMin - xPadding,
            xMax: xMax + xPadding,
            yMin: yMin - yPadding,
            yMax: yMax + yPadding
        };
    }

    /**
     * Convert data coordinates to screen coordinates
     */
    dataToScreen(dataX, dataY) {
        const { width, height, margin } = this.options;
        const { viewport, dimensions } = this.state;
        
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        const x = margin.left + ((dataX - dimensions.xMin) / (dimensions.xMax - dimensions.xMin)) * plotWidth;
        const y = margin.top + (1 - (dataY - dimensions.yMin) / (dimensions.yMax - dimensions.yMin)) * plotHeight;
        
        // Apply viewport transformation
        const screenX = (x - viewport.x) * viewport.scale;
        const screenY = (y - viewport.y) * viewport.scale;
        
        return { x: screenX, y: screenY };
    }

    /**
     * Convert screen coordinates to data coordinates
     */
    screenToData(screenX, screenY) {
        const { width, height, margin } = this.options;
        const { viewport, dimensions } = this.state;
        
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        // Reverse viewport transformation
        const x = (screenX / viewport.scale) + viewport.x;
        const y = (screenY / viewport.scale) + viewport.y;
        
        const dataX = dimensions.xMin + ((x - margin.left) / plotWidth) * (dimensions.xMax - dimensions.xMin);
        const dataY = dimensions.yMax - ((y - margin.top) / plotHeight) * (dimensions.yMax - dimensions.yMin);
        
        return { x: dataX, y: dataY };
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = () => {
            if (this.needsRedraw) {
                this.render();
                this.needsRedraw = false;
            }
            this.animationFrame = requestAnimationFrame(render);
        };
        render();
    }

    /**
     * Main render function
     */
    render() {
        this.clearCanvas();
        
        if (this.options.showGrid) {
            this.drawGrid();
        }
        
        if (this.options.showAxes) {
            this.drawAxes();
        }
        
        this.drawDataPoints();
        
        if (this.state.clusters.length > 0) {
            this.drawClusterCenters();
            this.drawClusterHulls();
        }
        
        if (this.options.showLegend && this.state.clusters.length > 0) {
            this.drawLegend();
        }
        
        this.drawOverlay();
    }

    /**
     * Clear canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.options.width, this.options.height);
        
        this.overlayCtx.clearRect(0, 0, this.options.width, this.options.height);
    }

    /**
     * Draw grid
     */
    drawGrid() {
        const { width, height, margin } = this.options;
        const { dimensions } = this.state;
        
        this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Vertical grid lines
        const xStep = (dimensions.xMax - dimensions.xMin) / 10;
        for (let i = 0; i <= 10; i++) {
            const dataX = dimensions.xMin + i * xStep;
            const { x } = this.dataToScreen(dataX, 0);
            
            if (x >= margin.left && x <= width - margin.right) {
                this.ctx.moveTo(x, margin.top);
                this.ctx.lineTo(x, height - margin.bottom);
            }
        }
        
        // Horizontal grid lines
        const yStep = (dimensions.yMax - dimensions.yMin) / 10;
        for (let i = 0; i <= 10; i++) {
            const dataY = dimensions.yMin + i * yStep;
            const { y } = this.dataToScreen(0, dataY);
            
            if (y >= margin.top && y <= height - margin.bottom) {
                this.ctx.moveTo(margin.left, y);
                this.ctx.lineTo(width - margin.right, y);
            }
        }
        
        this.ctx.stroke();
    }

    /**
     * Draw axes
     */
    drawAxes() {
        const { width, height, margin } = this.options;
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        // X axis
        this.ctx.moveTo(margin.left, height - margin.bottom);
        this.ctx.lineTo(width - margin.right, height - margin.bottom);
        
        // Y axis
        this.ctx.moveTo(margin.left, margin.top);
        this.ctx.lineTo(margin.left, height - margin.bottom);
        
        this.ctx.stroke();
        
        if (this.options.showLabels) {
            this.drawAxisLabels();
        }
    }

    /**
     * Draw axis labels
     */
    drawAxisLabels() {
        const { width, height, margin } = this.options;
        const { dimensions } = this.state;
        
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // X axis labels
        const xStep = (dimensions.xMax - dimensions.xMin) / 5;
        for (let i = 0; i <= 5; i++) {
            const dataX = dimensions.xMin + i * xStep;
            const { x } = this.dataToScreen(dataX, dimensions.yMin);
            
            if (x >= margin.left && x <= width - margin.right) {
                this.ctx.fillText(dataX.toFixed(1), x, height - margin.bottom + 5);
            }
        }
        
        // Y axis labels
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        
        const yStep = (dimensions.yMax - dimensions.yMin) / 5;
        for (let i = 0; i <= 5; i++) {
            const dataY = dimensions.yMin + i * yStep;
            const { y } = this.dataToScreen(dimensions.xMin, dataY);
            
            if (y >= margin.top && y <= height - margin.bottom) {
                this.ctx.fillText(dataY.toFixed(1), margin.left - 5, y);
            }
        }
    }

    /**
     * Draw data points
     */
    drawDataPoints() {
        const pointSize = this.options.pointSize * this.state.viewport.scale;
        
        // Skip rendering if points are too small or too many points
        if (pointSize < 1 || this.state.data.length > PERFORMANCE.CANVAS_MAX_POINTS) {
            this.drawDataPointsOptimized();
            return;
        }
        
        this.state.data.forEach((point, index) => {
            this.drawDataPoint(point, index);
        });
    }

    /**
     * Draw individual data point
     */
    drawDataPoint(point, index) {
        const x = point.x !== undefined ? point.x : point[0];
        const y = point.y !== undefined ? point.y : point[1];
        const cluster = point.cluster !== undefined ? point.cluster : -1;
        
        const { x: screenX, y: screenY } = this.dataToScreen(x, y);
        
        // Skip if point is outside viewport
        if (screenX < -10 || screenX > this.options.width + 10 ||
            screenY < -10 || screenY > this.options.height + 10) {
            return;
        }
        
        // Determine color
        let color = '#999'; // Default color for unclustered points
        if (cluster >= 0 && cluster < this.options.colorScheme.length) {
            color = this.options.colorScheme[cluster];
        }
        
        // Adjust for selection and hover
        let alpha = this.options.pointOpacity;
        let size = this.options.pointSize;
        
        if (this.state.selectedPoints.has(index)) {
            alpha = 1.0;
            size *= 1.5;
        }
        
        if (this.state.hoveredPoint === index) {
            alpha = 1.0;
            size *= 1.2;
        }
        
        // Draw point
        this.ctx.fillStyle = this.hexToRgba(color, alpha);
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, size * this.state.viewport.scale, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw outline for selected points
        if (this.state.selectedPoints.has(index)) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    /**
     * Optimized rendering for large datasets
     */
    drawDataPointsOptimized() {
        // Use ImageData for faster rendering
        const imageData = this.ctx.createImageData(this.options.width, this.options.height);
        const data = imageData.data;
        
        this.state.data.forEach(point => {
            const x = point.x !== undefined ? point.x : point[0];
            const y = point.y !== undefined ? point.y : point[1];
            const cluster = point.cluster !== undefined ? point.cluster : -1;
            
            const { x: screenX, y: screenY } = this.dataToScreen(x, y);
            
            if (screenX >= 0 && screenX < this.options.width &&
                screenY >= 0 && screenY < this.options.height) {
                
                const pixelIndex = (Math.floor(screenY) * this.options.width + Math.floor(screenX)) * 4;
                
                let color = [153, 153, 153]; // Default gray
                if (cluster >= 0 && cluster < this.options.colorScheme.length) {
                    color = this.hexToRgb(this.options.colorScheme[cluster]);
                }
                
                data[pixelIndex] = color[0];     // R
                data[pixelIndex + 1] = color[1]; // G
                data[pixelIndex + 2] = color[2]; // B
                data[pixelIndex + 3] = 255;     // A
            }
        });
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Draw cluster centers
     */
    drawClusterCenters() {
        this.state.clusters.forEach((cluster, index) => {
            if (!cluster.center || cluster.center.length < 2) return;
            
            const { x: screenX, y: screenY } = this.dataToScreen(cluster.center[0], cluster.center[1]);
            const color = this.options.colorScheme[index % this.options.colorScheme.length];
            
            // Draw center point
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 8 * this.state.viewport.scale, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw cross
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            const crossSize = 5 * this.state.viewport.scale;
            this.ctx.moveTo(screenX - crossSize, screenY);
            this.ctx.lineTo(screenX + crossSize, screenY);
            this.ctx.moveTo(screenX, screenY - crossSize);
            this.ctx.lineTo(screenX, screenY + crossSize);
            this.ctx.stroke();
        });
    }

    /**
     * Draw cluster hulls (convex hulls around clusters)
     */
    drawClusterHulls() {
        this.state.clusters.forEach((cluster, index) => {
            if (!cluster.hull || cluster.hull.length < 3) return;
            
            const color = this.options.colorScheme[index % this.options.colorScheme.length];
            
            this.ctx.fillStyle = this.hexToRgba(color, UI.VIZ.OPACITY.HULL);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            cluster.hull.forEach((point, i) => {
                const { x: screenX, y: screenY } = this.dataToScreen(point[0], point[1]);
                
                if (i === 0) {
                    this.ctx.moveTo(screenX, screenY);
                } else {
                    this.ctx.lineTo(screenX, screenY);
                }
            });
            
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    /**
     * Draw legend
     */
    drawLegend() {
        const legendX = this.options.width - 150;
        const legendY = 20;
        const itemHeight = 20;
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(legendX, legendY, 130, this.state.clusters.length * itemHeight + 20);
        this.ctx.strokeRect(legendX, legendY, 130, this.state.clusters.length * itemHeight + 20);
        
        // Legend items
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        this.state.clusters.forEach((cluster, index) => {
            const y = legendY + 15 + index * itemHeight;
            const color = this.options.colorScheme[index % this.options.colorScheme.length];
            
            // Color box
            this.ctx.fillStyle = color;
            this.ctx.fillRect(legendX + 10, y - 6, 12, 12);
            
            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.fillText(`Cluster ${index + 1}`, legendX + 30, y);
        });
    }

    /**
     * Draw overlay (selection, hover effects)
     */
    drawOverlay() {
        // This would handle temporary overlays like selection rectangles
        // Currently handled in event handlers
    }

    /**
     * Mouse event handlers
     */
    handleMouseDown(event) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.state.isDragging = true;
        this.state.lastMousePos = { x, y };
        
        // Check for point selection
        const pointIndex = this.getPointAtPosition(x, y);
        if (pointIndex !== -1) {
            if (event.ctrlKey || event.metaKey) {
                // Multi-select
                if (this.state.selectedPoints.has(pointIndex)) {
                    this.state.selectedPoints.delete(pointIndex);
                } else {
                    this.state.selectedPoints.add(pointIndex);
                }
            } else {
                // Single select
                this.state.selectedPoints.clear();
                this.state.selectedPoints.add(pointIndex);
            }
            this.needsRedraw = true;
        }
        
        this.overlayCanvas.style.cursor = 'grabbing';
    }

    handleMouseMove(event) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.state.isDragging) {
            // Pan viewport
            const dx = x - this.state.lastMousePos.x;
            const dy = y - this.state.lastMousePos.y;
            
            this.state.viewport.x -= dx / this.state.viewport.scale;
            this.state.viewport.y -= dy / this.state.viewport.scale;
            
            this.state.lastMousePos = { x, y };
            this.needsRedraw = true;
        } else {
            // Handle hover
            const pointIndex = this.getPointAtPosition(x, y);
            if (pointIndex !== this.state.hoveredPoint) {
                this.state.hoveredPoint = pointIndex;
                this.updateTooltip(x, y, pointIndex);
                this.needsRedraw = true;
            }
        }
    }

    handleMouseUp(event) {
        this.state.isDragging = false;
        this.overlayCanvas.style.cursor = 'crosshair';
    }

    handleMouseLeave(event) {
        this.state.isDragging = false;
        this.state.hoveredPoint = null;
        this.hideTooltip();
        this.needsRedraw = true;
        this.overlayCanvas.style.cursor = 'crosshair';
    }

    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.state.viewport.scale * scaleFactor;
        
        // Clamp scale
        if (newScale < this.state.viewport.minScale || newScale > this.state.viewport.maxScale) {
            return;
        }
        
        // Zoom towards mouse position
        const worldPos = this.screenToData(x, y);
        this.state.viewport.scale = newScale;
        const newScreenPos = this.dataToScreen(worldPos.x, worldPos.y);
        
        this.state.viewport.x += (x - newScreenPos.x) / this.state.viewport.scale;
        this.state.viewport.y += (y - newScreenPos.y) / this.state.viewport.scale;
        
        this.needsRedraw = true;
    }

    handleResize() {
        // Handle container resize
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.options.width || newHeight !== this.options.height) {
            this.options.width = newWidth;
            this.options.height = newHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.overlayCanvas.width = newWidth;
            this.overlayCanvas.height = newHeight;
            
            this.needsRedraw = true;
        }
    }

    /**
     * Get point at screen position
     */
    getPointAtPosition(screenX, screenY) {
        const threshold = this.options.pointSize * 2;
        
        for (let i = 0; i < this.state.data.length; i++) {
            const point = this.state.data[i];
            const x = point.x !== undefined ? point.x : point[0];
            const y = point.y !== undefined ? point.y : point[1];
            
            const { x: pointScreenX, y: pointScreenY } = this.dataToScreen(x, y);
            const distance = Math.sqrt(
                Math.pow(screenX - pointScreenX, 2) + 
                Math.pow(screenY - pointScreenY, 2)
            );
            
            if (distance <= threshold) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Update tooltip
     */
    updateTooltip(x, y, pointIndex) {
        if (pointIndex === -1) {
            this.hideTooltip();
            return;
        }
        
        const point = this.state.data[pointIndex];
        const dataX = point.x !== undefined ? point.x : point[0];
        const dataY = point.y !== undefined ? point.y : point[1];
        const cluster = point.cluster !== undefined ? point.cluster : 'None';
        
        this.tooltip.innerHTML = `
            <div>Point ${pointIndex}</div>
            <div>X: ${dataX.toFixed(3)}</div>
            <div>Y: ${dataY.toFixed(3)}</div>
            <div>Cluster: ${cluster}</div>
        `;
        
        this.tooltip.style.left = `${x + 10}px`;
        this.tooltip.style.top = `${y - 10}px`;
        this.tooltip.style.opacity = '1';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.tooltip.style.opacity = '0';
    }

    /**
     * Utility methods
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    hexToRgba(hex, alpha) {
        const [r, g, b] = this.hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Export as image
     */
    exportImage(format = 'png') {
        const link = document.createElement('a');
        link.download = `scatter-plot.${format}`;
        link.href = this.canvas.toDataURL(`image/${format}`);
        link.click();
    }

    /**
     * Reset viewport
     */
    resetViewport() {
        this.state.viewport = {
            x: 0,
            y: 0,
            scale: 1,
            minScale: 0.1,
            maxScale: 10
        };
        this.needsRedraw = true;
    }

    /**
     * Get selected points
     */
    getSelectedPoints() {
        return Array.from(this.state.selectedPoints).map(index => this.state.data[index]);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.state.selectedPoints.clear();
        this.needsRedraw = true;
    }

    /**
     * Destroy the scatter plot
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        console.log('📊 ScatterPlot destroyed');
    }
}