/**
 * RealTimeChart - Live Data Streaming Visualization Component
 * Optimized for high-frequency data updates with smooth animations and buffering
 * Supports multiple streaming data sources and real-time clustering visualization
 */

import { EventBus } from '../../core/eventBus.js';
import { CanvasRenderer } from '../renderers/CanvasRenderer.js';

export class RealTimeChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        
        if (!this.container) {
            throw new Error('Container element not found');
        }

        // Chart configuration
        this.config = {
            width: options.width || this.container.clientWidth || 800,
            height: options.height || this.container.clientHeight || 400,
            type: options.type || 'line', // line, scatter, area, candlestick
            theme: options.theme || 'dark', // Real-time charts often use dark themes
            
            // Real-time specific options
            maxDataPoints: options.maxDataPoints || 1000,
            updateInterval: options.updateInterval || 100, // ms
            bufferSize: options.bufferSize || 50,
            smoothing: options.smoothing !== false,
            autoScale: options.autoScale !== false,
            showGrid: options.showGrid !== false,
            showCrosshair: options.showCrosshair !== false,
            showLegend: options.showLegend !== false,
            showLatestValue: options.showLatestValue !== false,
            
            // Animation settings
            animationDuration: options.animationDuration || 200,
            easing: options.easing || 'easeOutCubic',
            enableTransitions: options.enableTransitions !== false,
            
            // Performance settings
            renderOnDemand: options.renderOnDemand || false,
            maxFPS: options.maxFPS || 60,
            enableWorker: options.enableWorker || false,
            
            ...options
        };

        // Data management
        this.datasets = new Map(); // Multiple data streams
        this.dataBuffer = [];
        this.lastUpdate = 0;
        this.isPlaying = true;
        this.isPaused = false;
        
        // Streaming state
        this.streamingChannels = new Set();
        this.connectionStates = new Map();
        this.dataRates = new Map(); // Track data rates per channel
        
        // Visual state
        this.scales = {
            x: { min: 0, max: 1, range: 1 },
            y: { min: 0, max: 1, range: 1 }
        };
        this.viewport = {
            x: 0, y: 0, width: 0, height: 0
        };
        this.crosshair = { x: 0, y: 0, visible: false };
        
        // Animation system
        this.animationQueue = [];
        this.interpolatedValues = new Map();
        this.lastRenderTime = 0;
        
        // Performance tracking
        this.performance = {
            fps: 0,
            frameCount: 0,
            lastFPSUpdate: Date.now(),
            renderTime: 0,
            dataPoints: 0
        };
        
        // Color palette for multiple series
        this.colorPalette = [
            '#00D4FF', '#FF6B6B', '#4ECDC4', '#45B7D1',
            '#FFA726', '#66BB6A', '#AB47BC', '#EF5350'
        ];
        
        // Initialize components
        this.setupCanvas();
        this.setupRenderer();
        this.setupEventListeners();
        this.setupControls();
        
        // Start render loop
        this.startRenderLoop();
        
        // Initialize default dataset if none provided
        if (options.initialData) {
            this.addDataset('default', options.initialData, { color: this.colorPalette[0] });
        }
    }

    /**
     * Setup canvas and rendering context
     */
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width * window.devicePixelRatio;
        this.canvas.height = this.config.height * window.devicePixelRatio;
        this.canvas.style.width = this.config.width + 'px';
        this.canvas.style.height = this.config.height + 'px';
        this.canvas.className = 'realtime-chart-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Set viewport
        this.viewport = {
            x: 60, // Left margin for Y-axis
            y: 20, // Top margin
            width: this.config.width - 80, // Account for margins
            height: this.config.height - 60 // Account for margins
        };
        
        this.container.appendChild(this.canvas);
    }

    /**
     * Setup renderer with real-time optimizations
     */
    setupRenderer() {
        this.renderer = new CanvasRenderer(this.ctx, {
            width: this.config.width,
            height: this.config.height,
            theme: this.config.theme,
            enableAntialiasing: false, // Disable for performance
            enableBuffering: true
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Canvas interactions
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Event bus subscriptions for real-time data
        EventBus.on('clustering:update', this.onClusteringUpdate.bind(this));
        EventBus.on('performance:metrics', this.onPerformanceUpdate.bind(this));
        EventBus.on('websocket:message', this.onWebSocketMessage.bind(this));
        EventBus.on('data:stream', this.onDataStream.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Setup control panel
     */
    setupControls() {
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'realtime-chart-controls';
        this.controlsContainer.innerHTML = `
            <div class="controls-row">
                <button class="play-pause-btn" title="Play/Pause">
                    <span class="icon">${this.isPlaying ? '⏸️' : '▶️'}</span>
                </button>
                <button class="reset-btn" title="Reset View">🔄</button>
                <button class="screenshot-btn" title="Take Screenshot">📷</button>
                
                <div class="speed-control">
                    <label>Speed:</label>
                    <input type="range" class="speed-slider" min="0.1" max="5" step="0.1" value="1">
                    <span class="speed-value">1x</span>
                </div>
                
                <div class="buffer-control">
                    <label>Buffer:</label>
                    <input type="range" class="buffer-slider" min="10" max="1000" step="10" value="${this.config.maxDataPoints}">
                    <span class="buffer-value">${this.config.maxDataPoints}</span>
                </div>
            </div>
            
            <div class="status-row">
                <div class="connection-status">
                    <span class="status-indicator"></span>
                    <span class="status-text">Disconnected</span>
                </div>
                <div class="performance-info">
                    <span class="fps-counter">0 FPS</span>
                    <span class="data-rate">0 pts/s</span>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.controlsContainer);
        this.bindControlEvents();
    }

    /**
     * Bind control events
     */
    bindControlEvents() {
        // Play/pause button
        const playPauseBtn = this.controlsContainer.querySelector('.play-pause-btn');
        playPauseBtn.addEventListener('click', () => {
            this.toggle();
        });
        
        // Reset button
        const resetBtn = this.controlsContainer.querySelector('.reset-btn');
        resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        // Screenshot button
        const screenshotBtn = this.controlsContainer.querySelector('.screenshot-btn');
        screenshotBtn.addEventListener('click', () => {
            this.takeScreenshot();
        });
        
        // Speed control
        const speedSlider = this.controlsContainer.querySelector('.speed-slider');
        const speedValue = this.controlsContainer.querySelector('.speed-value');
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.setPlaybackSpeed(speed);
            speedValue.textContent = `${speed}x`;
        });
        
        // Buffer control
        const bufferSlider = this.controlsContainer.querySelector('.buffer-slider');
        const bufferValue = this.controlsContainer.querySelector('.buffer-value');
        bufferSlider.addEventListener('input', (e) => {
            const bufferSize = parseInt(e.target.value);
            this.setMaxDataPoints(bufferSize);
            bufferValue.textContent = bufferSize;
        });
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        const renderFrame = (currentTime) => {
            // Calculate FPS
            this.performance.frameCount++;
            if (currentTime - this.performance.lastFPSUpdate > 1000) {
                this.performance.fps = this.performance.frameCount;
                this.performance.frameCount = 0;
                this.performance.lastFPSUpdate = currentTime;
                this.updatePerformanceDisplay();
            }
            
            // Throttle rendering based on maxFPS
            const frameInterval = 1000 / this.config.maxFPS;
            if (currentTime - this.lastRenderTime >= frameInterval) {
                if (this.isPlaying && !this.isPaused) {
                    const renderStart = performance.now();
                    this.render();
                    this.performance.renderTime = performance.now() - renderStart;
                }
                this.lastRenderTime = currentTime;
            }
            
            this.animationFrame = requestAnimationFrame(renderFrame);
        };
        
        renderFrame(performance.now());
    }

    /**
     * Add a new dataset for streaming
     * @param {String} id - Dataset identifier
     * @param {Array} initialData - Initial data points
     * @param {Object} options - Dataset options
     */
    addDataset(id, initialData = [], options = {}) {
        const dataset = {
            id,
            data: [...initialData],
            color: options.color || this.colorPalette[this.datasets.size % this.colorPalette.length],
            visible: options.visible !== false,
            lineWidth: options.lineWidth || 2,
            pointRadius: options.pointRadius || 3,
            fillArea: options.fillArea || false,
            interpolation: options.interpolation || 'linear',
            lastUpdate: Date.now(),
            dataRate: 0,
            ...options
        };
        
        this.datasets.set(id, dataset);
        this.dataRates.set(id, { count: 0, lastReset: Date.now() });
        
        // Auto-scale if enabled
        if (this.config.autoScale) {
            this.updateScales();
        }
        
        EventBus.emit('realtime_chart:dataset_added', { id, dataset });
        return dataset;
    }

    /**
     * Remove a dataset
     * @param {String} id - Dataset identifier
     */
    removeDataset(id) {
        if (this.datasets.has(id)) {
            this.datasets.delete(id);
            this.dataRates.delete(id);
            
            if (this.config.autoScale) {
                this.updateScales();
            }
            
            EventBus.emit('realtime_chart:dataset_removed', { id });
        }
    }

    /**
     * Add data point to a dataset
     * @param {String} datasetId - Dataset identifier
     * @param {Object|Number} point - Data point (number or {x, y} object)
     * @param {Number} timestamp - Optional timestamp (uses current time if not provided)
     */
    addDataPoint(datasetId, point, timestamp = null) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            console.warn(`Dataset '${datasetId}' not found`);
            return;
        }
        
        // Normalize point format
        const normalizedPoint = this.normalizeDataPoint(point, timestamp);
        
        // Add to dataset
        dataset.data.push(normalizedPoint);
        dataset.lastUpdate = Date.now();
        
        // Maintain buffer size
        if (dataset.data.length > this.config.maxDataPoints) {
            dataset.data.shift();
        }
        
        // Update data rate tracking
        const rateInfo = this.dataRates.get(datasetId);
        rateInfo.count++;
        
        // Auto-scale if enabled
        if (this.config.autoScale) {
            this.updateScales();
        }
        
        // Trigger animations if enabled
        if (this.config.enableTransitions) {
            this.animateNewPoint(datasetId, normalizedPoint);
        }
        
        EventBus.emit('realtime_chart:data_added', { 
            datasetId, 
            point: normalizedPoint,
            datasetSize: dataset.data.length 
        });
    }

    /**
     * Add multiple data points at once
     * @param {String} datasetId - Dataset identifier
     * @param {Array} points - Array of data points
     */
    addDataPoints(datasetId, points) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            console.warn(`Dataset '${datasetId}' not found`);
            return;
        }
        
        const normalizedPoints = points.map(point => this.normalizeDataPoint(point));
        
        // Add all points
        dataset.data.push(...normalizedPoints);
        dataset.lastUpdate = Date.now();
        
        // Maintain buffer size
        if (dataset.data.length > this.config.maxDataPoints) {
            const excess = dataset.data.length - this.config.maxDataPoints;
            dataset.data.splice(0, excess);
        }
        
        // Update data rate
        const rateInfo = this.dataRates.get(datasetId);
        rateInfo.count += points.length;
        
        // Auto-scale if enabled
        if (this.config.autoScale) {
            this.updateScales();
        }
        
        EventBus.emit('realtime_chart:batch_added', { 
            datasetId, 
            pointCount: points.length,
            datasetSize: dataset.data.length 
        });
    }

    /**
     * Normalize data point to consistent format
     * @param {Object|Number} point - Raw data point
     * @param {Number} timestamp - Optional timestamp
     * @returns {Object} Normalized point {x, y, timestamp}
     */
    normalizeDataPoint(point, timestamp = null) {
        if (typeof point === 'number') {
            return {
                x: timestamp || Date.now(),
                y: point,
                timestamp: timestamp || Date.now()
            };
        } else if (point && typeof point === 'object') {
            return {
                x: point.x !== undefined ? point.x : (timestamp || Date.now()),
                y: point.y !== undefined ? point.y : point.value,
                timestamp: point.timestamp || timestamp || Date.now(),
                ...point
            };
        }
        
        throw new Error('Invalid data point format');
    }

    /**
     * Update chart scales based on current data
     */
    updateScales() {
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;
        
        this.datasets.forEach(dataset => {
            if (!dataset.visible || dataset.data.length === 0) return;
            
            dataset.data.forEach(point => {
                xMin = Math.min(xMin, point.x);
                xMax = Math.max(xMax, point.x);
                yMin = Math.min(yMin, point.y);
                yMax = Math.max(yMax, point.y);
            });
        });
        
        // Add padding
        const xPadding = (xMax - xMin) * 0.05;
        const yPadding = (yMax - yMin) * 0.1;
        
        this.scales.x = {
            min: xMin - xPadding,
            max: xMax + xPadding,
            range: (xMax - xMin) + 2 * xPadding
        };
        
        this.scales.y = {
            min: yMin - yPadding,
            max: yMax + yPadding,
            range: (yMax - yMin) + 2 * yPadding
        };
    }

    /**
     * Convert data coordinates to screen coordinates
     * @param {Number} x - Data x coordinate
     * @param {Number} y - Data y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    dataToScreen(x, y) {
        const screenX = this.viewport.x + ((x - this.scales.x.min) / this.scales.x.range) * this.viewport.width;
        const screenY = this.viewport.y + this.viewport.height - ((y - this.scales.y.min) / this.scales.y.range) * this.viewport.height;
        
        return { x: screenX, y: screenY };
    }

    /**
     * Convert screen coordinates to data coordinates
     * @param {Number} screenX - Screen x coordinate
     * @param {Number} screenY - Screen y coordinate
     * @returns {Object} Data coordinates {x, y}
     */
    screenToData(screenX, screenY) {
        const x = this.scales.x.min + ((screenX - this.viewport.x) / this.viewport.width) * this.scales.x.range;
        const y = this.scales.y.min + ((this.viewport.height - (screenY - this.viewport.y)) / this.viewport.height) * this.scales.y.range;
        
        return { x, y };
    }

    /**
     * Main render method
     */
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Update data rates
        this.updateDataRates();
        
        // Render grid
        if (this.config.showGrid) {
            this.renderGrid();
        }
        
        // Render datasets
        this.datasets.forEach(dataset => {
            if (dataset.visible && dataset.data.length > 0) {
                this.renderDataset(dataset);
            }
        });
        
        // Render axes
        this.renderAxes();
        
        // Render crosshair
        if (this.config.showCrosshair && this.crosshair.visible) {
            this.renderCrosshair();
        }
        
        // Render legend
        if (this.config.showLegend) {
            this.renderLegend();
        }
        
        // Render latest values
        if (this.config.showLatestValue) {
            this.renderLatestValues();
        }
        
        // Update performance counter
        this.performance.dataPoints = Array.from(this.datasets.values())
            .reduce((sum, dataset) => sum + dataset.data.length, 0);
    }

    /**
     * Render a single dataset
     * @param {Object} dataset - Dataset to render
     */
    renderDataset(dataset) {
        if (dataset.data.length === 0) return;
        
        const ctx = this.ctx;
        
        // Set line style
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = dataset.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Render based on chart type
        switch (this.config.type) {
            case 'line':
                this.renderLine(dataset);
                break;
            case 'area':
                this.renderArea(dataset);
                break;
            case 'scatter':
                this.renderScatter(dataset);
                break;
            case 'candlestick':
                this.renderCandlestick(dataset);
                break;
        }
    }

    /**
     * Render line chart
     * @param {Object} dataset - Dataset to render
     */
    renderLine(dataset) {
        const ctx = this.ctx;
        
        ctx.beginPath();
        let firstPoint = true;
        
        dataset.data.forEach(point => {
            const screen = this.dataToScreen(point.x, point.y);
            
            if (firstPoint) {
                ctx.moveTo(screen.x, screen.y);
                firstPoint = false;
            } else {
                ctx.lineTo(screen.x, screen.y);
            }
        });
        
        ctx.stroke();
        
        // Render points if enabled
        if (dataset.pointRadius > 0) {
            ctx.fillStyle = dataset.color;
            
            dataset.data.forEach(point => {
                const screen = this.dataToScreen(point.x, point.y);
                ctx.beginPath();
                ctx.arc(screen.x, screen.y, dataset.pointRadius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    /**
     * Render area chart
     * @param {Object} dataset - Dataset to render
     */
    renderArea(dataset) {
        const ctx = this.ctx;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, this.viewport.y, 0, this.viewport.y + this.viewport.height);
        gradient.addColorStop(0, dataset.color + '80'); // 50% opacity
        gradient.addColorStop(1, dataset.color + '10'); // 6% opacity
        
        ctx.fillStyle = gradient;
        
        // Create area path
        ctx.beginPath();
        
        // Start from bottom left
        const firstPoint = dataset.data[0];
        const firstScreen = this.dataToScreen(firstPoint.x, firstPoint.y);
        const bottomLeft = this.dataToScreen(firstPoint.x, this.scales.y.min);
        
        ctx.moveTo(firstScreen.x, bottomLeft.y);
        ctx.lineTo(firstScreen.x, firstScreen.y);
        
        // Draw line through data points
        dataset.data.forEach(point => {
            const screen = this.dataToScreen(point.x, point.y);
            ctx.lineTo(screen.x, screen.y);
        });
        
        // Close area at bottom right
        const lastPoint = dataset.data[dataset.data.length - 1];
        const bottomRight = this.dataToScreen(lastPoint.x, this.scales.y.min);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.closePath();
        
        ctx.fill();
        
        // Draw line on top
        this.renderLine(dataset);
    }

    /**
     * Render scatter plot
     * @param {Object} dataset - Dataset to render
     */
    renderScatter(dataset) {
        const ctx = this.ctx;
        
        ctx.fillStyle = dataset.color;
        
        dataset.data.forEach(point => {
            const screen = this.dataToScreen(point.x, point.y);
            ctx.beginPath();
            ctx.arc(screen.x, screen.y, dataset.pointRadius || 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Render grid
     */
    renderGrid() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = this.config.theme === 'dark' ? '#333' : '#ddd';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        const xStep = this.viewport.width / 10;
        for (let i = 0; i <= 10; i++) {
            const x = this.viewport.x + i * xStep;
            ctx.beginPath();
            ctx.moveTo(x, this.viewport.y);
            ctx.lineTo(x, this.viewport.y + this.viewport.height);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        const yStep = this.viewport.height / 8;
        for (let i = 0; i <= 8; i++) {
            const y = this.viewport.y + i * yStep;
            ctx.beginPath();
            ctx.moveTo(this.viewport.x, y);
            ctx.lineTo(this.viewport.x + this.viewport.width, y);
            ctx.stroke();
        }
    }

    /**
     * Render axes
     */
    renderAxes() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = this.config.theme === 'dark' ? '#666' : '#333';
        ctx.lineWidth = 2;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(this.viewport.x, this.viewport.y);
        ctx.lineTo(this.viewport.x, this.viewport.y + this.viewport.height);
        ctx.stroke();
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(this.viewport.x, this.viewport.y + this.viewport.height);
        ctx.lineTo(this.viewport.x + this.viewport.width, this.viewport.y + this.viewport.height);
        ctx.stroke();
        
        // Render axis labels
        this.renderAxisLabels();
    }

    /**
     * Render axis labels
     */
    renderAxisLabels() {
        const ctx = this.ctx;
        
        ctx.fillStyle = this.config.theme === 'dark' ? '#ccc' : '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        
        // X-axis labels (time)
        const xStep = this.viewport.width / 5;
        for (let i = 0; i <= 5; i++) {
            const x = this.viewport.x + i * xStep;
            const dataX = this.scales.x.min + (i / 5) * this.scales.x.range;
            const time = new Date(dataX).toLocaleTimeString();
            
            ctx.fillText(time, x, this.viewport.y + this.viewport.height + 20);
        }
        
        // Y-axis labels
        ctx.textAlign = 'right';
        const yStep = this.viewport.height / 4;
        for (let i = 0; i <= 4; i++) {
            const y = this.viewport.y + this.viewport.height - i * yStep;
            const dataY = this.scales.y.min + (i / 4) * this.scales.y.range;
            
            ctx.fillText(dataY.toFixed(1), this.viewport.x - 10, y + 4);
        }
    }

    /**
     * Render legend
     */
    renderLegend() {
        const ctx = this.ctx;
        const legendX = this.viewport.x + this.viewport.width - 150;
        const legendY = this.viewport.y + 20;
        
        let yOffset = 0;
        
        this.datasets.forEach(dataset => {
            if (!dataset.visible) return;
            
            // Legend item background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(legendX, legendY + yOffset, 140, 20);
            
            // Color indicator
            ctx.fillStyle = dataset.color;
            ctx.fillRect(legendX + 5, legendY + yOffset + 6, 15, 8);
            
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.id, legendX + 25, legendY + yOffset + 14);
            
            yOffset += 25;
        });
    }

    /**
     * Render latest values
     */
    renderLatestValues() {
        const ctx = this.ctx;
        const valuesX = this.viewport.x + this.viewport.width - 100;
        const valuesY = this.viewport.y + this.viewport.height - 100;
        
        let yOffset = 0;
        
        this.datasets.forEach(dataset => {
            if (!dataset.visible || dataset.data.length === 0) return;
            
            const latestPoint = dataset.data[dataset.data.length - 1];
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(valuesX, valuesY + yOffset, 90, 30);
            
            // Dataset name
            ctx.fillStyle = dataset.color;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(dataset.id, valuesX + 5, valuesY + yOffset + 12);
            
            // Latest value
            ctx.fillStyle = '#fff';
            ctx.font = '14px sans-serif';
            ctx.fillText(latestPoint.y.toFixed(2), valuesX + 5, valuesY + yOffset + 26);
            
            yOffset += 35;
        });
    }

    /**
     * Event handlers
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Update crosshair
        if (this.config.showCrosshair) {
            this.crosshair.x = x;
            this.crosshair.y = y;
            this.crosshair.visible = true;
        }
    }

    handleMouseLeave() {
        this.crosshair.visible = false;
    }

    handleKeyDown(event) {
        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.toggle();
                break;
            case 'r':
                this.reset();
                break;
            case 's':
                this.takeScreenshot();
                break;
        }
    }

    /**
     * Data stream event handlers
     */
    onClusteringUpdate(data) {
        if (data.progress !== undefined) {
            this.addDataPoint('clustering_progress', data.progress);
        }
        
        if (data.convergence !== undefined) {
            this.addDataPoint('convergence', data.convergence);
        }
    }

    onPerformanceUpdate(data) {
        this.addDataPoint('cpu_usage', data.cpuUsage);
        this.addDataPoint('memory_usage', data.memoryUsage);
        this.addDataPoint('response_time', data.responseTime);
    }

    onDataStream(data) {
        if (data.channel && data.value !== undefined) {
            if (!this.datasets.has(data.channel)) {
                this.addDataset(data.channel, [], { 
                    color: this.colorPalette[this.datasets.size % this.colorPalette.length] 
                });
            }
            
            this.addDataPoint(data.channel, data.value, data.timestamp);
        }
    }

    /**
     * Control methods
     */
    play() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        EventBus.emit('realtime_chart:playing');
    }

    pause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        EventBus.emit('realtime_chart:paused');
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    reset() {
        this.datasets.forEach(dataset => {
            dataset.data = [];
        });
        
        this.updateScales();
        EventBus.emit('realtime_chart:reset');
    }

    setPlaybackSpeed(speed) {
        this.config.updateInterval = Math.max(50, 100 / speed);
        EventBus.emit('realtime_chart:speed_changed', { speed });
    }

    setMaxDataPoints(maxPoints) {
        this.config.maxDataPoints = maxPoints;
        
        // Trim existing datasets
        this.datasets.forEach(dataset => {
            if (dataset.data.length > maxPoints) {
                dataset.data = dataset.data.slice(-maxPoints);
            }
        });
        
        EventBus.emit('realtime_chart:buffer_size_changed', { maxPoints });
    }

    takeScreenshot() {
        const link = document.createElement('a');
        link.download = `realtime-chart-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        
        EventBus.emit('realtime_chart:screenshot_taken');
    }

    updatePlayPauseButton() {
        const btn = this.controlsContainer?.querySelector('.play-pause-btn .icon');
        if (btn) {
            btn.textContent = this.isPlaying ? '⏸️' : '▶️';
        }
    }

    updateDataRates() {
        const now = Date.now();
        
        this.dataRates.forEach((rateInfo, datasetId) => {
            if (now - rateInfo.lastReset > 1000) { // Reset every second
                const dataset = this.datasets.get(datasetId);
                if (dataset) {
                    dataset.dataRate = rateInfo.count;
                }
                rateInfo.count = 0;
                rateInfo.lastReset = now;
            }
        });
    }

    updatePerformanceDisplay() {
        const fpsCounter = this.controlsContainer?.querySelector('.fps-counter');
        const dataRateCounter = this.controlsContainer?.querySelector('.data-rate');
        
        if (fpsCounter) {
            fpsCounter.textContent = `${this.performance.fps} FPS`;
        }
        
        if (dataRateCounter) {
            const totalRate = Array.from(this.datasets.values())
                .reduce((sum, dataset) => sum + (dataset.dataRate || 0), 0);
            dataRateCounter.textContent = `${totalRate} pts/s`;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove event listeners
        EventBus.off('clustering:update', this.onClusteringUpdate);
        EventBus.off('performance:metrics', this.onPerformanceUpdate);
        EventBus.off('websocket:message', this.onWebSocketMessage);
        EventBus.off('data:stream', this.onDataStream);
        
        // Clear container
        this.container.innerHTML = '';
    }
}

export default RealTimeChart;