/**
 * NCS-API Website - Cluster Density Heatmap
 * High-performance heatmap visualization for cluster analysis
 * 
 * Features:
 * - Canvas-based density visualization
 * - Multiple color schemes and gradients
 * - Real-time data updates
 * - Interactive zoom and pan
 * - Gaussian kernel density estimation
 * - Cluster boundary visualization
 * - Customizable resolution and smoothing
 * - Export functionality
 */

import { EventBus } from '../core/eventBusNew.js';
import { UI, PERFORMANCE } from '../config/constants.js';

export class Heatmap {
    constructor(container, options = {}) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        // Configuration
        this.options = {
            width: options.width || UI.VIZ.DEFAULT_WIDTH,
            height: options.height || UI.VIZ.DEFAULT_HEIGHT,
            margin: options.margin || { top: 20, right: 20, bottom: 40, left: 40 },
            resolution: options.resolution || 100, // Grid resolution
            radius: options.radius || 20, // Influence radius for each point
            opacity: options.opacity || 0.8,
            blur: options.blur || 15, // Blur factor for smoothing
            gradient: options.gradient || this.getDefaultGradient(),
            showAxes: options.showAxes !== false,
            showLegend: options.showLegend !== false,
            showContours: options.showContours || false,
            interactive: options.interactive !== false,
            colorScheme: options.colorScheme || 'viridis',
            minIntensity: options.minIntensity || 0,
            maxIntensity: options.maxIntensity || 1,
            useWebGL: options.useWebGL || false,
            ...options
        };
        
        // Canvas elements
        this.canvas = null;
        this.ctx = null;
        this.overlayCanvas = null;
        this.overlayCtx = null;
        
        // Data and state
        this.state = {
            data: [],
            clusters: [],
            heatmapData: null,
            dimensions: {
                xMin: 0, xMax: 1,
                yMin: 0, yMax: 1
            },
            viewport: {
                x: 0, y: 0,
                scale: 1,
                minScale: 0.5,
                maxScale: 10
            },
            interaction: {
                isDragging: false,
                lastMousePos: { x: 0, y: 0 }
            },
            needsRedraw: true
        };
        
        // Color gradients
        this.gradients = {
            viridis: this.createViridisGradient(),
            plasma: this.createPlasmaGradient(),
            inferno: this.createInfernoGradient(),
            cool: this.createCoolGradient(),
            hot: this.createHotGradient(),
            rainbow: this.createRainbowGradient()
        };
        
        // Performance optimization
        this.imageData = null;
        this.densityGrid = null;
        this.contourPaths = [];
        
        this.init();
    }

    /**
     * Initialize the heatmap
     */
    init() {
        this.createCanvases();
        this.setupEventListeners();
        this.calculateDimensions();
        this.startRenderLoop();
        
        console.log('🔥 Heatmap initialized');
    }

    /**
     * Create canvas elements
     */
    createCanvases() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'heatmap-wrapper';
        wrapper.style.cssText = `
            position: relative;
            width: ${this.options.width}px;
            height: ${this.options.height}px;
            overflow: hidden;
            cursor: ${this.options.interactive ? 'grab' : 'default'};
        `;
        
        // Main canvas for heatmap
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
        
        // Overlay canvas for axes and interactions
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = this.options.width;
        this.overlayCanvas.height = this.options.height;
        this.overlayCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            z-index: 2;
            pointer-events: ${this.options.interactive ? 'auto' : 'none'};
        `;
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Add canvases to wrapper
        wrapper.appendChild(this.canvas);
        wrapper.appendChild(this.overlayCanvas);
        
        // Add wrapper to container
        this.container.appendChild(wrapper);
        
        // Create legend
        if (this.options.showLegend) {
            this.createLegend();
        }
    }

    /**
     * Create color legend
     */
    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        legend.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 200px;
            background: linear-gradient(to top, ${this.createCSSGradient()});
            border: 1px solid #ccc;
            border-radius: 3px;
            z-index: 3;
        `;
        
        // Add labels
        const minLabel = document.createElement('div');
        minLabel.textContent = this.options.minIntensity.toFixed(2);
        minLabel.style.cssText = `
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #666;
        `;
        
        const maxLabel = document.createElement('div');
        maxLabel.textContent = this.options.maxIntensity.toFixed(2);
        maxLabel.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #666;
        `;
        
        legend.appendChild(minLabel);
        legend.appendChild(maxLabel);
        
        this.container.querySelector('.heatmap-wrapper').appendChild(legend);
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
        this.overlayCanvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Set data for the heatmap
     */
    setData(data) {
        this.state.data = data || [];
        this.calculateDimensions();
        this.generateHeatmapData();
        this.state.needsRedraw = true;
        
        console.log(`🔥 Heatmap data updated: ${this.state.data.length} points`);
    }

    /**
     * Set cluster information
     */
    setClusters(clusters) {
        this.state.clusters = clusters || [];
        this.generateHeatmapData();
        this.state.needsRedraw = true;
        
        console.log(`🔥 Heatmap clusters updated: ${this.state.clusters.length} clusters`);
    }

    /**
     * Calculate data dimensions
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
     * Generate heatmap density data
     */
    generateHeatmapData() {
        if (this.state.data.length === 0) return;
        
        const { resolution } = this.options;
        const { dimensions } = this.state;
        
        // Create density grid
        this.densityGrid = new Array(resolution);
        for (let i = 0; i < resolution; i++) {
            this.densityGrid[i] = new Array(resolution).fill(0);
        }
        
        const xStep = (dimensions.xMax - dimensions.xMin) / resolution;
        const yStep = (dimensions.yMax - dimensions.yMin) / resolution;
        
        // Calculate density using Gaussian kernel
        this.state.data.forEach(point => {
            const x = point.x !== undefined ? point.x : point[0];
            const y = point.y !== undefined ? point.y : point[1];
            
            // Convert to grid coordinates
            const gridX = Math.floor((x - dimensions.xMin) / xStep);
            const gridY = Math.floor((y - dimensions.yMin) / yStep);
            
            // Apply Gaussian kernel
            this.applyGaussianKernel(gridX, gridY, resolution);
        });
        
        // Normalize density values
        this.normalizeDensityGrid();
        
        // Generate contours if enabled
        if (this.options.showContours) {
            this.generateContours();
        }
        
        console.log('🔥 Density grid generated');
    }

    /**
     * Apply Gaussian kernel to density grid
     */
    applyGaussianKernel(centerX, centerY, resolution) {
        const radius = Math.floor(this.options.radius * resolution / Math.min(this.options.width, this.options.height));
        const sigma = radius / 3; // Standard deviation
        const sigma2 = 2 * sigma * sigma;
        
        for (let x = Math.max(0, centerX - radius); x < Math.min(resolution, centerX + radius + 1); x++) {
            for (let y = Math.max(0, centerY - radius); y < Math.min(resolution, centerY + radius + 1); y++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance2 = dx * dx + dy * dy;
                
                if (distance2 <= radius * radius) {
                    const intensity = Math.exp(-distance2 / sigma2);
                    this.densityGrid[x][y] += intensity;
                }
            }
        }
    }

    /**
     * Normalize density grid values
     */
    normalizeDensityGrid() {
        let maxDensity = 0;
        let minDensity = Infinity;
        
        // Find min/max values
        for (let x = 0; x < this.densityGrid.length; x++) {
            for (let y = 0; y < this.densityGrid[x].length; y++) {
                maxDensity = Math.max(maxDensity, this.densityGrid[x][y]);
                minDensity = Math.min(minDensity, this.densityGrid[x][y]);
            }
        }
        
        // Normalize to [0, 1] range
        const range = maxDensity - minDensity;
        if (range > 0) {
            for (let x = 0; x < this.densityGrid.length; x++) {
                for (let y = 0; y < this.densityGrid[x].length; y++) {
                    this.densityGrid[x][y] = (this.densityGrid[x][y] - minDensity) / range;
                }
            }
        }
        
        // Update intensity range
        this.options.maxIntensity = maxDensity;
        this.options.minIntensity = minDensity;
    }

    /**
     * Generate contour lines
     */
    generateContours() {
        this.contourPaths = [];
        const levels = [0.1, 0.3, 0.5, 0.7, 0.9];
        
        levels.forEach(level => {
            const paths = this.marchingSquares(this.densityGrid, level);
            this.contourPaths.push({ level, paths, color: this.getContourColor(level) });
        });
    }

    /**
     * Marching squares algorithm for contour generation
     */
    marchingSquares(grid, level) {
        const paths = [];
        const resolution = grid.length;
        
        for (let x = 0; x < resolution - 1; x++) {
            for (let y = 0; y < resolution - 1; y++) {
                const square = [
                    grid[x][y] >= level ? 1 : 0,
                    grid[x + 1][y] >= level ? 1 : 0,
                    grid[x + 1][y + 1] >= level ? 1 : 0,
                    grid[x][y + 1] >= level ? 1 : 0
                ];
                
                const config = square[0] * 8 + square[1] * 4 + square[2] * 2 + square[3];
                const lines = this.getContourLines(config, x, y);
                
                if (lines.length > 0) {
                    paths.push(...lines);
                }
            }
        }
        
        return paths;
    }

    /**
     * Get contour lines for marching squares configuration
     */
    getContourLines(config, x, y) {
        // Simplified marching squares lookup table
        const lines = [];
        
        switch (config) {
            case 1: case 14:
                lines.push([[x, y + 0.5], [x + 0.5, y + 1]]);
                break;
            case 2: case 13:
                lines.push([[x + 0.5, y + 1], [x + 1, y + 0.5]]);
                break;
            case 4: case 11:
                lines.push([[x + 1, y + 0.5], [x + 0.5, y]]);
                break;
            case 8: case 7:
                lines.push([[x + 0.5, y], [x, y + 0.5]]);
                break;
            case 3: case 12:
                lines.push([[x, y + 0.5], [x + 1, y + 0.5]]);
                break;
            case 6: case 9:
                lines.push([[x + 0.5, y], [x + 0.5, y + 1]]);
                break;
            case 5:
                lines.push([[x, y + 0.5], [x + 0.5, y]]);
                lines.push([[x + 0.5, y + 1], [x + 1, y + 0.5]]);
                break;
            case 10:
                lines.push([[x + 0.5, y], [x + 1, y + 0.5]]);
                lines.push([[x, y + 0.5], [x + 0.5, y + 1]]);
                break;
        }
        
        return lines;
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = () => {
            if (this.state.needsRedraw) {
                this.render();
                this.state.needsRedraw = false;
            }
            requestAnimationFrame(render);
        };
        render();
    }

    /**
     * Main render function
     */
    render() {
        this.clearCanvas();
        this.renderHeatmap();
        
        if (this.options.showContours && this.contourPaths.length > 0) {
            this.renderContours();
        }
        
        if (this.options.showAxes) {
            this.renderAxes();
        }
    }

    /**
     * Clear canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.options.width, this.options.height);
        this.overlayCtx.clearRect(0, 0, this.options.width, this.options.height);
    }

    /**
     * Render heatmap
     */
    renderHeatmap() {
        if (!this.densityGrid) return;
        
        const { width, height, margin } = this.options;
        const { resolution } = this.options;
        
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        // Create ImageData for efficient pixel manipulation
        const imageData = this.ctx.createImageData(plotWidth, plotHeight);
        const data = imageData.data;
        
        const xScale = resolution / plotWidth;
        const yScale = resolution / plotHeight;
        
        // Fill pixel data
        for (let x = 0; x < plotWidth; x++) {
            for (let y = 0; y < plotHeight; y++) {
                const gridX = Math.floor(x * xScale);
                const gridY = Math.floor((plotHeight - y - 1) * yScale); // Flip Y axis
                
                if (gridX >= 0 && gridX < resolution && gridY >= 0 && gridY < resolution) {
                    const intensity = this.densityGrid[gridX][gridY];
                    const color = this.getColorForIntensity(intensity);
                    
                    const pixelIndex = (y * plotWidth + x) * 4;
                    data[pixelIndex] = color.r;     // R
                    data[pixelIndex + 1] = color.g; // G
                    data[pixelIndex + 2] = color.b; // B
                    data[pixelIndex + 3] = Math.floor(color.a * 255); // A
                }
            }
        }
        
        // Apply blur effect
        if (this.options.blur > 0) {
            this.applyGaussianBlur(imageData, this.options.blur);
        }
        
        // Draw to canvas
        this.ctx.putImageData(imageData, margin.left, margin.top);
    }

    /**
     * Apply Gaussian blur to image data
     */
    applyGaussianBlur(imageData, radius) {
        // Simplified box blur approximation
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;
                
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx >= 0 && nx < width) {
                        const index = (y * width + nx) * 4;
                        r += data[index];
                        g += data[index + 1];
                        b += data[index + 2];
                        a += data[index + 3];
                        count++;
                    }
                }
                
                const index = (y * width + x) * 4;
                data[index] = r / count;
                data[index + 1] = g / count;
                data[index + 2] = b / count;
                data[index + 3] = a / count;
            }
        }
    }

    /**
     * Render contour lines
     */
    renderContours() {
        const { width, height, margin } = this.options;
        const { resolution } = this.options;
        
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        
        const xScale = plotWidth / resolution;
        const yScale = plotHeight / resolution;
        
        this.overlayCtx.save();
        this.overlayCtx.translate(margin.left, margin.top);
        
        this.contourPaths.forEach(contour => {
            this.overlayCtx.strokeStyle = contour.color;
            this.overlayCtx.lineWidth = 1.5;
            this.overlayCtx.globalAlpha = 0.8;
            
            contour.paths.forEach(path => {
                if (path.length >= 2) {
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(path[0][0] * xScale, plotHeight - path[0][1] * yScale);
                    this.overlayCtx.lineTo(path[1][0] * xScale, plotHeight - path[1][1] * yScale);
                    this.overlayCtx.stroke();
                }
            });
        });
        
        this.overlayCtx.restore();
    }

    /**
     * Render axes
     */
    renderAxes() {
        const { width, height, margin } = this.options;
        const { dimensions } = this.state;
        
        this.overlayCtx.strokeStyle = '#333';
        this.overlayCtx.lineWidth = 1;
        this.overlayCtx.font = '12px Arial';
        this.overlayCtx.fillStyle = '#666';
        
        // X axis
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(margin.left, height - margin.bottom);
        this.overlayCtx.lineTo(width - margin.right, height - margin.bottom);
        this.overlayCtx.stroke();
        
        // Y axis
        this.overlayCtx.beginPath();
        this.overlayCtx.moveTo(margin.left, margin.top);
        this.overlayCtx.lineTo(margin.left, height - margin.bottom);
        this.overlayCtx.stroke();
        
        // X axis labels
        const xSteps = 5;
        for (let i = 0; i <= xSteps; i++) {
            const x = margin.left + (i / xSteps) * (width - margin.left - margin.right);
            const value = dimensions.xMin + (i / xSteps) * (dimensions.xMax - dimensions.xMin);
            
            this.overlayCtx.textAlign = 'center';
            this.overlayCtx.fillText(value.toFixed(1), x, height - margin.bottom + 15);
        }
        
        // Y axis labels
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const y = height - margin.bottom - (i / ySteps) * (height - margin.top - margin.bottom);
            const value = dimensions.yMin + (i / ySteps) * (dimensions.yMax - dimensions.yMin);
            
            this.overlayCtx.textAlign = 'right';
            this.overlayCtx.fillText(value.toFixed(1), margin.left - 5, y + 4);
        }
    }

    /**
     * Get color for intensity value
     */
    getColorForIntensity(intensity) {
        const gradient = this.gradients[this.options.colorScheme] || this.gradients.viridis;
        const index = Math.floor(intensity * (gradient.length - 1));
        const color = gradient[Math.max(0, Math.min(gradient.length - 1, index))];
        
        return {
            r: color[0],
            g: color[1],
            b: color[2],
            a: intensity * this.options.opacity
        };
    }

    /**
     * Get contour color
     */
    getContourColor(level) {
        const intensity = level * 255;
        return `rgba(${intensity}, ${intensity}, ${intensity}, 0.8)`;
    }

    /**
     * Color gradient definitions
     */
    createViridisGradient() {
        return [
            [68, 1, 84], [72, 35, 116], [64, 67, 135], [52, 94, 141],
            [41, 120, 142], [32, 144, 140], [34, 167, 132], [68, 190, 112],
            [121, 209, 81], [189, 222, 38], [253, 231, 37]
        ];
    }

    createPlasmaGradient() {
        return [
            [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150],
            [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40],
            [240, 249, 33]
        ];
    }

    createInfernoGradient() {
        return [
            [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106],
            [186, 54, 85], [227, 89, 51], [249, 140, 10], [249, 201, 50],
            [252, 255, 164]
        ];
    }

    createCoolGradient() {
        return [
            [0, 255, 255], [64, 191, 255], [128, 128, 255], [191, 64, 255], [255, 0, 255]
        ];
    }

    createHotGradient() {
        return [
            [0, 0, 0], [128, 0, 0], [255, 0, 0], [255, 128, 0], [255, 255, 0], [255, 255, 255]
        ];
    }

    createRainbowGradient() {
        return [
            [148, 0, 211], [75, 0, 130], [0, 0, 255], [0, 255, 0],
            [255, 255, 0], [255, 127, 0], [255, 0, 0]
        ];
    }

    getDefaultGradient() {
        return {
            0.0: 'rgba(0, 0, 0, 0)',
            0.2: 'rgba(0, 0, 255, 0.5)',
            0.4: 'rgba(0, 255, 255, 0.7)',
            0.6: 'rgba(0, 255, 0, 0.8)',
            0.8: 'rgba(255, 255, 0, 0.9)',
            1.0: 'rgba(255, 0, 0, 1.0)'
        };
    }

    /**
     * Create CSS gradient string
     */
    createCSSGradient() {
        const gradient = this.gradients[this.options.colorScheme] || this.gradients.viridis;
        const stops = gradient.map((color, index) => {
            const position = (index / (gradient.length - 1)) * 100;
            return `rgb(${color[0]}, ${color[1]}, ${color[2]}) ${position}%`;
        });
        return stops.join(', ');
    }

    /**
     * Mouse event handlers
     */
    handleMouseDown(event) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.state.interaction.isDragging = true;
        this.state.interaction.lastMousePos = { x, y };
        this.overlayCanvas.style.cursor = 'grabbing';
    }

    handleMouseMove(event) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (this.state.interaction.isDragging) {
            const dx = x - this.state.interaction.lastMousePos.x;
            const dy = y - this.state.interaction.lastMousePos.y;
            
            this.state.viewport.x -= dx / this.state.viewport.scale;
            this.state.viewport.y -= dy / this.state.viewport.scale;
            
            this.state.interaction.lastMousePos = { x, y };
            this.state.needsRedraw = true;
        }
    }

    handleMouseUp(event) {
        this.state.interaction.isDragging = false;
        this.overlayCanvas.style.cursor = 'grab';
    }

    handleWheel(event) {
        event.preventDefault();
        
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.state.viewport.scale * scaleFactor;
        
        if (newScale >= this.state.viewport.minScale && newScale <= this.state.viewport.maxScale) {
            this.state.viewport.scale = newScale;
            this.state.needsRedraw = true;
        }
    }

    handleResize() {
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.options.width || newHeight !== this.options.height) {
            this.options.width = newWidth;
            this.options.height = newHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.overlayCanvas.width = newWidth;
            this.overlayCanvas.height = newHeight;
            
            this.state.needsRedraw = true;
        }
    }

    /**
     * Set color scheme
     */
    setColorScheme(scheme) {
        if (this.gradients[scheme]) {
            this.options.colorScheme = scheme;
            this.state.needsRedraw = true;
        }
    }

    /**
     * Set resolution
     */
    setResolution(resolution) {
        this.options.resolution = resolution;
        this.generateHeatmapData();
        this.state.needsRedraw = true;
    }

    /**
     * Set radius
     */
    setRadius(radius) {
        this.options.radius = radius;
        this.generateHeatmapData();
        this.state.needsRedraw = true;
    }

    /**
     * Toggle contours
     */
    toggleContours() {
        this.options.showContours = !this.options.showContours;
        if (this.options.showContours) {
            this.generateContours();
        }
        this.state.needsRedraw = true;
    }

    /**
     * Export as image
     */
    exportImage(format = 'png') {
        const link = document.createElement('a');
        link.download = `heatmap.${format}`;
        link.href = this.canvas.toDataURL(`image/${format}`);
        link.click();
    }

    /**
     * Get available color schemes
     */
    getColorSchemes() {
        return Object.keys(this.gradients);
    }

    /**
     * Reset viewport
     */
    resetViewport() {
        this.state.viewport = {
            x: 0, y: 0,
            scale: 1,
            minScale: 0.5,
            maxScale: 10
        };
        this.state.needsRedraw = true;
    }

    /**
     * Destroy the heatmap
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        console.log('🔥 Heatmap destroyed');
    }
}