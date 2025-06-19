/**
 * MetricsChart - Performance Metrics Visualization Component
 * Displays real-time performance metrics for NCS clustering operations
 * Supports multiple chart types and interactive features
 */

import { EventBus } from '../../core/eventBus.js';
import { CanvasRenderer } from '../renderers/CanvasRenderer.js';

export class MetricsChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        
        if (!this.container) {
            throw new Error('Container element not found');
        }

        // Chart configuration
        this.config = {
            width: options.width || this.container.clientWidth || 800,
            height: options.height || this.container.clientHeight || 400,
            type: options.type || 'line', // line, bar, area, gauge, heatmap
            theme: options.theme || 'light',
            showGrid: options.showGrid !== false,
            showLegend: options.showLegend !== false,
            showTooltip: options.showTooltip !== false,
            showControls: options.showControls !== false,
            realTime: options.realTime || false,
            maxDataPoints: options.maxDataPoints || 100,
            updateInterval: options.updateInterval || 1000,
            ...options
        };

        // Data management
        this.data = [];
        this.metrics = [];
        this.timeRange = 'last_hour'; // last_minute, last_hour, last_day
        this.selectedMetrics = new Set();
        this.colorPalette = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
            '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
        ];

        // Chart state
        this.isPlaying = true;
        this.zoom = { x: 1, y: 1 };
        this.pan = { x: 0, y: 0 };
        this.hoveredPoint = null;
        this.selectedRegion = null;

        // Performance tracking
        this.lastUpdate = Date.now();
        this.frameRate = 60;
        this.animationFrame = null;

        // Initialize components
        this.setupCanvas();
        this.setupControls();
        this.setupEventListeners();
        this.setupTooltip();
        
        // Start rendering loop
        this.startRenderLoop();
        
        // Load initial data
        this.loadInitialData();
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
        this.canvas.className = 'metrics-chart-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Initialize renderer
        this.renderer = new CanvasRenderer(this.ctx, {
            width: this.config.width,
            height: this.config.height,
            theme: this.config.theme
        });
        
        this.container.appendChild(this.canvas);
    }

    /**
     * Setup chart controls
     */
    setupControls() {
        if (!this.config.showControls) return;

        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'metrics-chart-controls';
        this.controlsContainer.innerHTML = `
            <div class="controls-row">
                <div class="control-group">
                    <label>Chart Type:</label>
                    <select class="chart-type-select">
                        <option value="line">Line Chart</option>
                        <option value="area">Area Chart</option>
                        <option value="bar">Bar Chart</option>
                        <option value="gauge">Gauge Chart</option>
                        <option value="heatmap">Heatmap</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>Time Range:</label>
                    <select class="time-range-select">
                        <option value="last_minute">Last Minute</option>
                        <option value="last_hour">Last Hour</option>
                        <option value="last_day">Last Day</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <button class="play-pause-btn" title="Play/Pause updates">
                        <span class="play-icon">⏸️</span>
                    </button>
                    <button class="reset-zoom-btn" title="Reset zoom">🔍</button>
                    <button class="export-btn" title="Export chart">💾</button>
                </div>
            </div>
            
            <div class="metrics-selector">
                <div class="metrics-checkboxes"></div>
            </div>
        `;
        
        this.container.appendChild(this.controlsContainer);
        this.bindControlEvents();
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

        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Event bus subscriptions
        EventBus.on('performance:metrics', this.onMetricsUpdate.bind(this));
        EventBus.on('clustering:update', this.onClusteringUpdate.bind(this));
        EventBus.on('theme:changed', this.onThemeChange.bind(this));

        // Real-time updates
        if (this.config.realTime) {
            this.startRealTimeUpdates();
        }
    }

    /**
     * Setup tooltip element
     */
    setupTooltip() {
        if (!this.config.showTooltip) return;

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'metrics-chart-tooltip';
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
        `;
        
        document.body.appendChild(this.tooltip);
    }

    /**
     * Bind control events
     */
    bindControlEvents() {
        if (!this.controlsContainer) return;

        // Chart type change
        const chartTypeSelect = this.controlsContainer.querySelector('.chart-type-select');
        chartTypeSelect.value = this.config.type;
        chartTypeSelect.addEventListener('change', (e) => {
            this.config.type = e.target.value;
            this.render();
        });

        // Time range change
        const timeRangeSelect = this.controlsContainer.querySelector('.time-range-select');
        timeRangeSelect.value = this.timeRange;
        timeRangeSelect.addEventListener('change', (e) => {
            this.timeRange = e.target.value;
            this.loadDataForTimeRange();
        });

        // Play/pause button
        const playPauseBtn = this.controlsContainer.querySelector('.play-pause-btn');
        playPauseBtn.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            const icon = playPauseBtn.querySelector('.play-icon');
            icon.textContent = this.isPlaying ? '⏸️' : '▶️';
        });

        // Reset zoom button
        const resetZoomBtn = this.controlsContainer.querySelector('.reset-zoom-btn');
        resetZoomBtn.addEventListener('click', () => {
            this.resetZoom();
        });

        // Export button
        const exportBtn = this.controlsContainer.querySelector('.export-btn');
        exportBtn.addEventListener('click', () => {
            this.exportChart();
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Simulate loading metrics from API
            this.metrics = [
                { id: 'cpu_usage', name: 'CPU Usage (%)', color: this.colorPalette[0], enabled: true },
                { id: 'memory_usage', name: 'Memory Usage (%)', color: this.colorPalette[1], enabled: true },
                { id: 'active_jobs', name: 'Active Jobs', color: this.colorPalette[2], enabled: true },
                { id: 'avg_response_time', name: 'Avg Response Time (ms)', color: this.colorPalette[3], enabled: true },
                { id: 'throughput', name: 'Throughput (req/s)', color: this.colorPalette[4], enabled: false },
                { id: 'error_rate', name: 'Error Rate (%)', color: this.colorPalette[5], enabled: false },
                { id: 'queue_length', name: 'Queue Length', color: this.colorPalette[6], enabled: false },
                { id: 'cluster_quality', name: 'Cluster Quality Score', color: this.colorPalette[7], enabled: false }
            ];

            this.updateMetricsSelector();
            this.loadDataForTimeRange();
            
            EventBus.emit('metrics_chart:initialized', { metrics: this.metrics });
            
        } catch (error) {
            console.error('Failed to load initial metrics data:', error);
        }
    }

    /**
     * Update metrics selector checkboxes
     */
    updateMetricsSelector() {
        if (!this.controlsContainer) return;

        const container = this.controlsContainer.querySelector('.metrics-checkboxes');
        container.innerHTML = '';

        this.metrics.forEach(metric => {
            const checkbox = document.createElement('label');
            checkbox.className = 'metric-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" value="${metric.id}" ${metric.enabled ? 'checked' : ''}>
                <span class="metric-color" style="background-color: ${metric.color}"></span>
                <span class="metric-name">${metric.name}</span>
            `;

            const input = checkbox.querySelector('input');
            input.addEventListener('change', (e) => {
                metric.enabled = e.target.checked;
                if (metric.enabled) {
                    this.selectedMetrics.add(metric.id);
                } else {
                    this.selectedMetrics.delete(metric.id);
                }
                this.render();
            });

            if (metric.enabled) {
                this.selectedMetrics.add(metric.id);
            }

            container.appendChild(checkbox);
        });
    }

    /**
     * Load data for selected time range
     */
    async loadDataForTimeRange() {
        const now = Date.now();
        let startTime;
        
        switch (this.timeRange) {
            case 'last_minute':
                startTime = now - 60 * 1000;
                break;
            case 'last_hour':
                startTime = now - 60 * 60 * 1000;
                break;
            case 'last_day':
                startTime = now - 24 * 60 * 60 * 1000;
                break;
            default:
                startTime = now - 60 * 60 * 1000; // Default to last hour
        }

        // Generate sample data for demonstration
        this.data = this.generateSampleData(startTime, now);
        this.render();
    }

    /**
     * Generate sample data for demonstration
     */
    generateSampleData(startTime, endTime) {
        const data = [];
        const interval = this.timeRange === 'last_minute' ? 1000 : 
                       this.timeRange === 'last_hour' ? 30000 : 300000;
        
        for (let time = startTime; time <= endTime; time += interval) {
            const dataPoint = { timestamp: time };
            
            // Generate realistic metrics data
            dataPoint.cpu_usage = 20 + Math.random() * 60 + Math.sin(time / 60000) * 10;
            dataPoint.memory_usage = 40 + Math.random() * 30 + Math.sin(time / 120000) * 5;
            dataPoint.active_jobs = Math.floor(Math.random() * 10) + 1;
            dataPoint.avg_response_time = 50 + Math.random() * 200 + Math.sin(time / 30000) * 50;
            dataPoint.throughput = 100 + Math.random() * 500 + Math.cos(time / 45000) * 100;
            dataPoint.error_rate = Math.random() * 5;
            dataPoint.queue_length = Math.floor(Math.random() * 20);
            dataPoint.cluster_quality = 0.7 + Math.random() * 0.3;
            
            data.push(dataPoint);
        }
        
        return data;
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        this.realTimeInterval = setInterval(() => {
            if (this.isPlaying) {
                this.addRealTimeDataPoint();
            }
        }, this.config.updateInterval);
    }

    /**
     * Add new real-time data point
     */
    addRealTimeDataPoint() {
        const now = Date.now();
        const lastPoint = this.data[this.data.length - 1];
        
        const newPoint = { timestamp: now };
        
        // Generate new data based on previous values with some variation
        if (lastPoint) {
            newPoint.cpu_usage = Math.max(0, Math.min(100, lastPoint.cpu_usage + (Math.random() - 0.5) * 10));
            newPoint.memory_usage = Math.max(0, Math.min(100, lastPoint.memory_usage + (Math.random() - 0.5) * 5));
            newPoint.active_jobs = Math.max(0, lastPoint.active_jobs + Math.floor((Math.random() - 0.5) * 3));
            newPoint.avg_response_time = Math.max(10, lastPoint.avg_response_time + (Math.random() - 0.5) * 50);
            newPoint.throughput = Math.max(0, lastPoint.throughput + (Math.random() - 0.5) * 100);
            newPoint.error_rate = Math.max(0, Math.min(10, lastPoint.error_rate + (Math.random() - 0.5) * 2));
            newPoint.queue_length = Math.max(0, lastPoint.queue_length + Math.floor((Math.random() - 0.5) * 5));
            newPoint.cluster_quality = Math.max(0, Math.min(1, lastPoint.cluster_quality + (Math.random() - 0.5) * 0.1));
        } else {
            // First point - use defaults
            newPoint.cpu_usage = 30;
            newPoint.memory_usage = 50;
            newPoint.active_jobs = 5;
            newPoint.avg_response_time = 100;
            newPoint.throughput = 200;
            newPoint.error_rate = 1;
            newPoint.queue_length = 5;
            newPoint.cluster_quality = 0.8;
        }
        
        this.data.push(newPoint);
        
        // Remove old data points if exceeding max
        if (this.data.length > this.config.maxDataPoints) {
            this.data.shift();
        }
        
        // Only render if visible
        if (this.isPlaying) {
            this.render();
        }
    }

    /**
     * Start rendering loop
     */
    startRenderLoop() {
        const renderFrame = () => {
            const now = Date.now();
            const deltaTime = now - this.lastUpdate;
            
            if (deltaTime >= 1000 / this.frameRate) {
                if (this.config.realTime && this.isPlaying) {
                    this.render();
                }
                this.lastUpdate = now;
            }
            
            this.animationFrame = requestAnimationFrame(renderFrame);
        };
        
        renderFrame();
    }

    /**
     * Main render method
     */
    render() {
        if (!this.data || this.data.length === 0) return;

        // Clear canvas
        this.renderer.clear();

        // Apply transformations
        this.renderer.save();
        this.renderer.translate(this.pan.x, this.pan.y);
        this.renderer.scale(this.zoom.x, this.zoom.y);

        // Render based on chart type
        switch (this.config.type) {
            case 'line':
                this.renderLineChart();
                break;
            case 'area':
                this.renderAreaChart();
                break;
            case 'bar':
                this.renderBarChart();
                break;
            case 'gauge':
                this.renderGaugeChart();
                break;
            case 'heatmap':
                this.renderHeatmapChart();
                break;
        }

        this.renderer.restore();

        // Render UI elements (not affected by zoom/pan)
        if (this.config.showGrid) {
            this.renderGrid();
        }
        
        if (this.config.showLegend) {
            this.renderLegend();
        }
        
        this.renderAxisLabels();
        this.renderTitle();
    }

    /**
     * Render line chart
     */
    renderLineChart() {
        const enabledMetrics = this.metrics.filter(m => m.enabled);
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = this.config.width - margin.left - margin.right;
        const chartHeight = this.config.height - margin.bottom - margin.top;

        if (this.data.length === 0) return;

        // Calculate time range
        const timeExtent = [
            Math.min(...this.data.map(d => d.timestamp)),
            Math.max(...this.data.map(d => d.timestamp))
        ];
        
        enabledMetrics.forEach(metric => {
            const values = this.data.map(d => d[metric.id]).filter(v => v !== undefined);
            if (values.length === 0) return;

            const valueExtent = [Math.min(...values), Math.max(...values)];
            
            // Create line path
            this.renderer.beginPath();
            this.renderer.strokeStyle = metric.color;
            this.renderer.lineWidth = 2;
            
            this.data.forEach((point, index) => {
                const value = point[metric.id];
                if (value === undefined) return;

                const x = margin.left + ((point.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
                const y = margin.top + (1 - (value - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * chartHeight;
                
                if (index === 0) {
                    this.renderer.moveTo(x, y);
                } else {
                    this.renderer.lineTo(x, y);
                }
            });
            
            this.renderer.stroke();
            
            // Add data point markers
            this.data.forEach(point => {
                const value = point[metric.id];
                if (value === undefined) return;

                const x = margin.left + ((point.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
                const y = margin.top + (1 - (value - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * chartHeight;
                
                this.renderer.beginPath();
                this.renderer.fillStyle = metric.color;
                this.renderer.arc(x, y, 3, 0, Math.PI * 2);
                this.renderer.fill();
            });
        });
    }

    /**
     * Render area chart
     */
    renderAreaChart() {
        const enabledMetrics = this.metrics.filter(m => m.enabled);
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = this.config.width - margin.left - margin.right;
        const chartHeight = this.config.height - margin.bottom - margin.top;

        if (this.data.length === 0) return;

        const timeExtent = [
            Math.min(...this.data.map(d => d.timestamp)),
            Math.max(...this.data.map(d => d.timestamp))
        ];
        
        enabledMetrics.forEach(metric => {
            const values = this.data.map(d => d[metric.id]).filter(v => v !== undefined);
            if (values.length === 0) return;

            const valueExtent = [Math.min(...values), Math.max(...values)];
            
            // Create area path
            this.renderer.beginPath();
            this.renderer.fillStyle = metric.color + '40'; // Add transparency
            
            // Start from bottom left
            const firstPoint = this.data[0];
            const firstX = margin.left + ((firstPoint.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
            const bottomY = margin.top + chartHeight;
            
            this.renderer.moveTo(firstX, bottomY);
            
            // Draw top line
            this.data.forEach(point => {
                const value = point[metric.id];
                if (value === undefined) return;

                const x = margin.left + ((point.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
                const y = margin.top + (1 - (value - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * chartHeight;
                
                this.renderer.lineTo(x, y);
            });
            
            // Close path at bottom right
            const lastPoint = this.data[this.data.length - 1];
            const lastX = margin.left + ((lastPoint.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
            this.renderer.lineTo(lastX, bottomY);
            this.renderer.closePath();
            this.renderer.fill();
        });
    }

    /**
     * Render gauge chart (for latest values)
     */
    renderGaugeChart() {
        const enabledMetrics = this.metrics.filter(m => m.enabled).slice(0, 4); // Limit to 4 gauges
        const latestData = this.data[this.data.length - 1];
        
        if (!latestData) return;

        const gaugeSize = Math.min(this.config.width, this.config.height) / Math.ceil(Math.sqrt(enabledMetrics.length)) - 40;
        const cols = Math.ceil(Math.sqrt(enabledMetrics.length));
        
        enabledMetrics.forEach((metric, index) => {
            const value = latestData[metric.id];
            if (value === undefined) return;

            const row = Math.floor(index / cols);
            const col = index % cols;
            const centerX = (col + 0.5) * (this.config.width / cols);
            const centerY = (row + 0.5) * (this.config.height / Math.ceil(enabledMetrics.length / cols));
            
            this.renderSingleGauge(centerX, centerY, gaugeSize / 2, value, metric);
        });
    }

    /**
     * Render single gauge
     */
    renderSingleGauge(centerX, centerY, radius, value, metric) {
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const totalAngle = endAngle - startAngle;
        
        // Determine value range based on metric type
        let maxValue = 100;
        if (metric.id.includes('time')) maxValue = 1000;
        if (metric.id === 'cluster_quality') maxValue = 1;
        
        const normalizedValue = Math.min(value / maxValue, 1);
        const valueAngle = startAngle + totalAngle * normalizedValue;
        
        // Draw gauge background
        this.renderer.beginPath();
        this.renderer.strokeStyle = '#e5e7eb';
        this.renderer.lineWidth = 8;
        this.renderer.arc(centerX, centerY, radius * 0.8, startAngle, endAngle);
        this.renderer.stroke();
        
        // Draw gauge value
        this.renderer.beginPath();
        this.renderer.strokeStyle = metric.color;
        this.renderer.lineWidth = 8;
        this.renderer.arc(centerX, centerY, radius * 0.8, startAngle, valueAngle);
        this.renderer.stroke();
        
        // Draw gauge pointer
        this.renderer.beginPath();
        this.renderer.strokeStyle = '#374151';
        this.renderer.lineWidth = 3;
        this.renderer.moveTo(centerX, centerY);
        const pointerX = centerX + Math.cos(valueAngle) * radius * 0.6;
        const pointerY = centerY + Math.sin(valueAngle) * radius * 0.6;
        this.renderer.lineTo(pointerX, pointerY);
        this.renderer.stroke();
        
        // Draw center circle
        this.renderer.beginPath();
        this.renderer.fillStyle = '#374151';
        this.renderer.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.renderer.fill();
        
        // Draw label and value
        this.renderer.fillStyle = '#374151';
        this.renderer.font = '12px sans-serif';
        this.renderer.textAlign = 'center';
        this.renderer.fillText(metric.name, centerX, centerY + radius + 20);
        
        this.renderer.font = 'bold 16px sans-serif';
        this.renderer.fillText(value.toFixed(1), centerX, centerY + 30);
    }

    /**
     * Handle mouse events
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Update hovered point
        this.hoveredPoint = this.findNearestDataPoint(x, y);
        
        // Update tooltip
        if (this.hoveredPoint && this.config.showTooltip) {
            this.showTooltip(event.clientX, event.clientY, this.hoveredPoint);
        } else {
            this.hideTooltip();
        }
    }

    /**
     * Find nearest data point to mouse coordinates
     */
    findNearestDataPoint(mouseX, mouseY) {
        if (!this.data || this.data.length === 0) return null;
        
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = this.config.width - margin.left - margin.right;
        const chartHeight = this.config.height - margin.bottom - margin.top;
        
        const timeExtent = [
            Math.min(...this.data.map(d => d.timestamp)),
            Math.max(...this.data.map(d => d.timestamp))
        ];
        
        let nearestPoint = null;
        let minDistance = Infinity;
        
        this.data.forEach(point => {
            const x = margin.left + ((point.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * chartWidth;
            const distance = Math.abs(mouseX - x);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        });
        
        return minDistance < 20 ? nearestPoint : null;
    }

    /**
     * Show tooltip
     */
    showTooltip(x, y, dataPoint) {
        if (!this.tooltip) return;
        
        const enabledMetrics = this.metrics.filter(m => m.enabled);
        const time = new Date(dataPoint.timestamp).toLocaleTimeString();
        
        let content = `<div><strong>Time: ${time}</strong></div>`;
        enabledMetrics.forEach(metric => {
            const value = dataPoint[metric.id];
            if (value !== undefined) {
                content += `<div style="color: ${metric.color}">${metric.name}: ${value.toFixed(2)}</div>`;
            }
        });
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.left = x + 10 + 'px';
        this.tooltip.style.top = y - 10 + 'px';
        this.tooltip.style.opacity = '1';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }

    /**
     * Handle resize
     */
    handleResize() {
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.config.width || newHeight !== this.config.height) {
            this.config.width = newWidth;
            this.config.height = newHeight;
            
            this.canvas.width = newWidth * window.devicePixelRatio;
            this.canvas.height = newHeight * window.devicePixelRatio;
            this.canvas.style.width = newWidth + 'px';
            this.canvas.style.height = newHeight + 'px';
            
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.renderer.updateDimensions(newWidth, newHeight);
            
            this.render();
        }
    }

    /**
     * Event handlers
     */
    onMetricsUpdate(data) {
        if (this.config.realTime) {
            this.addRealTimeDataPoint();
        }
    }

    onClusteringUpdate(data) {
        // Update clustering-related metrics
        if (this.data.length > 0) {
            const latest = this.data[this.data.length - 1];
            latest.cluster_quality = data.convergence || latest.cluster_quality;
        }
    }

    onThemeChange(theme) {
        this.config.theme = theme;
        this.renderer.updateTheme(theme);
        this.render();
    }

    /**
     * Export chart as image
     */
    exportChart() {
        const link = document.createElement('a');
        link.download = `metrics-chart-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    /**
     * Reset zoom and pan
     */
    resetZoom() {
        this.zoom = { x: 1, y: 1 };
        this.pan = { x: 0, y: 0 };
        this.render();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
        
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
        }
        
        // Remove event listeners
        EventBus.off('performance:metrics', this.onMetricsUpdate);
        EventBus.off('clustering:update', this.onClusteringUpdate);
        EventBus.off('theme:changed', this.onThemeChange);
        
        // Clear container
        this.container.innerHTML = '';
    }
}

export default MetricsChart;