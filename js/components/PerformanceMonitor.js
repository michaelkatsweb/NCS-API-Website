/**
 * NCS-API Website - Performance Monitor Component
 * Real-time performance metrics display and monitoring
 * 
 * Features:
 * - Live CPU, memory, and network monitoring
 * - API response time tracking
 * - Clustering performance metrics
 * - System resource usage
 * - Performance alerts and warnings
 * - Historical data visualization
 */

import { EventBus } from '../core/eventBusNew.js';
import { CONFIG, PERFORMANCE, EVENTS } from '../config/constants.js';

export class PerformanceMonitor {
    constructor(container) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        this.state = {
            isMonitoring: false,
            metrics: {
                memory: { used: 0, total: 0, percentage: 0 },
                cpu: { usage: 0, cores: navigator.hardwareConcurrency || 4 },
                network: { latency: 0, throughput: 0, requests: 0 },
                clustering: { 
                    totalJobs: 0, 
                    averageTime: 0, 
                    successRate: 100,
                    pointsPerSecond: 0 
                },
                api: {
                    totalRequests: 0,
                    averageResponseTime: 0,
                    errorRate: 0,
                    activeConnections: 0
                },
                browser: {
                    fps: 60,
                    renderTime: 0,
                    domNodes: 0,
                    eventListeners: 0
                }
            },
            history: {
                memory: [],
                cpu: [],
                network: [],
                clustering: [],
                timestamps: []
            },
            alerts: []
        };
        
        this.updateInterval = null;
        this.historyLimit = 60; // Keep last 60 data points (1 minute at 1s intervals)
        this.performanceObserver = null;
        this.startTime = Date.now();
        
        this.init();
    }

    /**
     * Initialize the performance monitor
     */
    init() {
        this.createLayout();
        this.bindEvents();
        this.setupPerformanceObserver();
        this.startMonitoring();
        
        console.log('📊 Performance Monitor initialized');
    }

    /**
     * Create the performance monitor layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="performance-monitor">
                <div class="monitor-header">
                    <div class="monitor-title">
                        <h3>📊 Live Performance</h3>
                        <div class="monitor-status" id="monitor-status">
                            <span class="status-indicator status-active"></span>
                            <span class="status-text">Monitoring</span>
                        </div>
                    </div>
                    
                    <div class="monitor-controls">
                        <button class="btn btn-sm" id="toggle-monitor-btn" title="Toggle monitoring">
                            <svg class="icon" viewBox="0 0 24 24">
                                <polygon points="5,3 19,12 5,21"/>
                            </svg>
                        </button>
                        
                        <button class="btn btn-sm" id="export-metrics-btn" title="Export metrics">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5"/>
                            </svg>
                        </button>
                        
                        <button class="btn btn-sm" id="clear-history-btn" title="Clear history">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M3 12a9 9 0 009-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Alerts Panel -->
                <div class="alerts-panel" id="alerts-panel" style="display: none;">
                    <div class="alerts-header">
                        <span class="alerts-title">⚠️ Performance Alerts</span>
                        <button class="btn btn-sm" id="dismiss-alerts-btn">Dismiss All</button>
                    </div>
                    <div class="alerts-list" id="alerts-list"></div>
                </div>

                <!-- Metrics Grid -->
                <div class="metrics-grid">
                    <!-- System Resources -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>💾 Memory Usage</h4>
                            <span class="metric-value" id="memory-value">-- MB</span>
                        </div>
                        <div class="metric-bar">
                            <div class="progress-bar">
                                <div class="progress-fill" id="memory-progress"></div>
                            </div>
                            <span class="metric-percentage" id="memory-percentage">--%</span>
                        </div>
                        <div class="metric-details">
                            <span class="detail-item">Used: <span id="memory-used">--</span></span>
                            <span class="detail-item">Total: <span id="memory-total">--</span></span>
                        </div>
                    </div>

                    <!-- CPU Usage -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>⚡ CPU Usage</h4>
                            <span class="metric-value" id="cpu-value">--%</span>
                        </div>
                        <div class="metric-bar">
                            <div class="progress-bar">
                                <div class="progress-fill" id="cpu-progress"></div>
                            </div>
                            <span class="metric-percentage" id="cpu-percentage">--%</span>
                        </div>
                        <div class="metric-details">
                            <span class="detail-item">Cores: <span id="cpu-cores">${navigator.hardwareConcurrency || 4}</span></span>
                            <span class="detail-item">FPS: <span id="browser-fps">60</span></span>
                        </div>
                    </div>

                    <!-- Network Performance -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>🌐 Network</h4>
                            <span class="metric-value" id="network-latency">-- ms</span>
                        </div>
                        <div class="metric-stats">
                            <div class="stat-item">
                                <span class="stat-label">Requests</span>
                                <span class="stat-value" id="network-requests">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Avg Response</span>
                                <span class="stat-value" id="network-response-time">-- ms</span>
                            </div>
                        </div>
                    </div>

                    <!-- Clustering Performance -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>🎯 Clustering</h4>
                            <span class="metric-value" id="clustering-throughput">-- pts/s</span>
                        </div>
                        <div class="metric-stats">
                            <div class="stat-item">
                                <span class="stat-label">Jobs</span>
                                <span class="stat-value" id="clustering-jobs">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Success Rate</span>
                                <span class="stat-value" id="clustering-success-rate">--%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Avg Time</span>
                                <span class="stat-value" id="clustering-avg-time">-- ms</span>
                            </div>
                        </div>
                    </div>

                    <!-- API Performance -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>🔌 API</h4>
                            <span class="metric-value" id="api-response-time">-- ms</span>
                        </div>
                        <div class="metric-stats">
                            <div class="stat-item">
                                <span class="stat-label">Requests</span>
                                <span class="stat-value" id="api-total-requests">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Error Rate</span>
                                <span class="stat-value" id="api-error-rate">--%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Connections</span>
                                <span class="stat-value" id="api-connections">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Browser Performance -->
                    <div class="metric-card">
                        <div class="metric-header">
                            <h4>🌏 Browser</h4>
                            <span class="metric-value" id="browser-render-time">-- ms</span>
                        </div>
                        <div class="metric-stats">
                            <div class="stat-item">
                                <span class="stat-label">DOM Nodes</span>
                                <span class="stat-value" id="browser-dom-nodes">--</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Event Listeners</span>
                                <span class="stat-value" id="browser-listeners">--</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Historical Chart -->
                <div class="history-chart">
                    <div class="chart-header">
                        <h4>📈 Performance History</h4>
                        <div class="chart-controls">
                            <select id="chart-metric-select" class="form-select">
                                <option value="memory">Memory Usage</option>
                                <option value="cpu">CPU Usage</option>
                                <option value="network">Network Latency</option>
                                <option value="clustering">Clustering Performance</option>
                            </select>
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas id="performance-chart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Toggle monitoring
        document.getElementById('toggle-monitor-btn').addEventListener('click', () => {
            this.toggleMonitoring();
        });

        // Export metrics
        document.getElementById('export-metrics-btn').addEventListener('click', () => {
            this.exportMetrics();
        });

        // Clear history
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Dismiss alerts
        document.getElementById('dismiss-alerts-btn').addEventListener('click', () => {
            this.dismissAllAlerts();
        });

        // Chart metric selection
        document.getElementById('chart-metric-select').addEventListener('change', (e) => {
            this.updateChart(e.target.value);
        });

        // Listen to performance events
        this.eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) => {
            this.updateAPIMetrics(data);
        });

        this.eventBus.on(EVENTS.API_REQUEST_ERROR, (data) => {
            this.updateAPIErrorMetrics(data);
        });

        this.eventBus.on(EVENTS.CLUSTERING_COMPLETED, (data) => {
            this.updateClusteringMetrics(data);
        });

        this.eventBus.on(EVENTS.CLUSTERING_PROGRESS, (data) => {
            this.updateClusteringProgress(data);
        });
    }

    /**
     * Setup Performance Observer for advanced metrics
     */
    setupPerformanceObserver() {
        if (!('PerformanceObserver' in window)) return;

        try {
            // Observe navigation timing
            this.performanceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processPerformanceEntry(entry);
                }
            });

            this.performanceObserver.observe({ 
                entryTypes: ['navigation', 'resource', 'measure', 'longtask'] 
            });

        } catch (error) {
            console.warn('Performance Observer not fully supported:', error);
        }
    }

    /**
     * Process performance entries
     */
    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.updateNavigationMetrics(entry);
                break;
            case 'resource':
                this.updateResourceMetrics(entry);
                break;
            case 'longtask':
                this.handleLongTask(entry);
                break;
        }
    }

    /**
     * Start monitoring
     */
    startMonitoring() {
        if (this.state.isMonitoring) return;

        this.state.isMonitoring = true;
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, 1000); // Update every second

        this.updateStatus('active', 'Monitoring');
        console.log('📊 Performance monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.state.isMonitoring) return;

        this.state.isMonitoring = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.updateStatus('inactive', 'Stopped');
        console.log('📊 Performance monitoring stopped');
    }

    /**
     * Toggle monitoring state
     */
    toggleMonitoring() {
        if (this.state.isMonitoring) {
            this.stopMonitoring();
        } else {
            this.startMonitoring();
        }
    }

    /**
     * Update all metrics
     */
    updateMetrics() {
        this.updateMemoryMetrics();
        this.updateCPUMetrics();
        this.updateNetworkMetrics();
        this.updateBrowserMetrics();
        
        this.addToHistory();
        this.checkAlerts();
        this.updateChart();
    }

    /**
     * Update memory metrics
     */
    updateMemoryMetrics() {
        if (!('memory' in performance)) return;

        const memory = performance.memory;
        const used = memory.usedJSHeapSize;
        const total = memory.totalJSHeapSize;
        const percentage = (used / total) * 100;

        this.state.metrics.memory = {
            used,
            total,
            percentage
        };

        // Update UI
        document.getElementById('memory-value').textContent = `${this.formatBytes(used)}`;
        document.getElementById('memory-percentage').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('memory-used').textContent = this.formatBytes(used);
        document.getElementById('memory-total').textContent = this.formatBytes(total);
        
        const progressBar = document.getElementById('memory-progress');
        progressBar.style.width = `${percentage}%`;
        progressBar.className = `progress-fill ${this.getPerformanceLevel(percentage)}`;
    }

    /**
     * Update CPU metrics (estimated)
     */
    updateCPUMetrics() {
        // Estimate CPU usage based on frame rate and task timing
        const now = performance.now();
        if (this.lastFrameTime) {
            const frameDelta = now - this.lastFrameTime;
            const expectedFrameTime = 1000 / 60; // 60 FPS
            const cpuUsage = Math.min(100, (frameDelta / expectedFrameTime) * 100);
            
            this.state.metrics.cpu.usage = cpuUsage;
            
            // Update UI
            document.getElementById('cpu-value').textContent = `${cpuUsage.toFixed(1)}%`;
            document.getElementById('cpu-percentage').textContent = `${cpuUsage.toFixed(1)}%`;
            
            const progressBar = document.getElementById('cpu-progress');
            progressBar.style.width = `${cpuUsage}%`;
            progressBar.className = `progress-fill ${this.getPerformanceLevel(cpuUsage)}`;
        }
        this.lastFrameTime = now;
    }

    /**
     * Update network metrics
     */
    updateNetworkMetrics() {
        // Network metrics are updated via event listeners
        const network = this.state.metrics.network;
        
        document.getElementById('network-latency').textContent = `${network.latency} ms`;
        document.getElementById('network-requests').textContent = network.requests.toString();
        document.getElementById('network-response-time').textContent = `${network.latency} ms`;
    }

    /**
     * Update browser metrics
     */
    updateBrowserMetrics() {
        // Count DOM nodes
        const domNodes = document.getElementsByTagName('*').length;
        
        // Estimate event listeners (rough approximation)
        const eventListeners = this.estimateEventListeners();
        
        this.state.metrics.browser = {
            ...this.state.metrics.browser,
            domNodes,
            eventListeners
        };

        // Update UI
        document.getElementById('browser-dom-nodes').textContent = domNodes.toString();
        document.getElementById('browser-listeners').textContent = eventListeners.toString();
    }

    /**
     * Update API metrics from events
     */
    updateAPIMetrics(data) {
        const api = this.state.metrics.api;
        api.totalRequests++;
        
        // Update average response time
        if (data.duration) {
            api.averageResponseTime = (api.averageResponseTime + data.duration) / 2;
        }

        // Update network latency
        this.state.metrics.network.latency = data.duration || 0;
        this.state.metrics.network.requests++;

        // Update UI
        document.getElementById('api-response-time').textContent = `${api.averageResponseTime.toFixed(0)} ms`;
        document.getElementById('api-total-requests').textContent = api.totalRequests.toString();
        document.getElementById('api-error-rate').textContent = `${api.errorRate.toFixed(1)}%`;
    }

    /**
     * Update API error metrics
     */
    updateAPIErrorMetrics(data) {
        const api = this.state.metrics.api;
        api.totalRequests++;
        
        // Calculate error rate
        const errors = api.totalRequests * (api.errorRate / 100) + 1;
        api.errorRate = (errors / api.totalRequests) * 100;

        // Update UI
        document.getElementById('api-error-rate').textContent = `${api.errorRate.toFixed(1)}%`;
        
        // Create alert for high error rate
        if (api.errorRate > 10) {
            this.addAlert('High API error rate detected', 'warning');
        }
    }

    /**
     * Update clustering metrics
     */
    updateClusteringMetrics(data) {
        const clustering = this.state.metrics.clustering;
        clustering.totalJobs++;
        
        if (data.duration) {
            clustering.averageTime = (clustering.averageTime + data.duration) / 2;
        }
        
        if (data.pointsProcessed && data.duration) {
            clustering.pointsPerSecond = data.pointsProcessed / (data.duration / 1000);
        }

        // Update UI
        document.getElementById('clustering-throughput').textContent = `${clustering.pointsPerSecond.toFixed(0)} pts/s`;
        document.getElementById('clustering-jobs').textContent = clustering.totalJobs.toString();
        document.getElementById('clustering-avg-time').textContent = `${clustering.averageTime.toFixed(0)} ms`;
        document.getElementById('clustering-success-rate').textContent = `${clustering.successRate.toFixed(1)}%`;
    }

    /**
     * Add metrics to history
     */
    addToHistory() {
        const timestamp = Date.now();
        
        this.state.history.timestamps.push(timestamp);
        this.state.history.memory.push(this.state.metrics.memory.percentage);
        this.state.history.cpu.push(this.state.metrics.cpu.usage);
        this.state.history.network.push(this.state.metrics.network.latency);
        this.state.history.clustering.push(this.state.metrics.clustering.pointsPerSecond);

        // Limit history size
        if (this.state.history.timestamps.length > this.historyLimit) {
            this.state.history.timestamps.shift();
            this.state.history.memory.shift();
            this.state.history.cpu.shift();
            this.state.history.network.shift();
            this.state.history.clustering.shift();
        }
    }

    /**
     * Check for performance alerts
     */
    checkAlerts() {
        const { memory, cpu, network, api } = this.state.metrics;

        // Memory usage alert
        if (memory.percentage > 85) {
            this.addAlert('High memory usage detected', 'error');
        }

        // CPU usage alert
        if (cpu.usage > 80) {
            this.addAlert('High CPU usage detected', 'warning');
        }

        // Network latency alert
        if (network.latency > 2000) {
            this.addAlert('High network latency detected', 'warning');
        }

        // API error rate alert
        if (api.errorRate > 15) {
            this.addAlert('Critical API error rate', 'error');
        }
    }

    /**
     * Add performance alert
     */
    addAlert(message, level = 'info') {
        const alert = {
            id: Date.now(),
            message,
            level,
            timestamp: Date.now()
        };

        this.state.alerts.push(alert);
        this.renderAlert(alert);
        this.showAlertsPanel();

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            this.dismissAlert(alert.id);
        }, 30000);
    }

    /**
     * Render individual alert
     */
    renderAlert(alert) {
        const alertsList = document.getElementById('alerts-list');
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${alert.level}`;
        alertElement.dataset.alertId = alert.id;
        
        alertElement.innerHTML = `
            <div class="alert-content">
                <span class="alert-message">${alert.message}</span>
                <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
            <button class="alert-dismiss" onclick="performanceMonitor.dismissAlert(${alert.id})">×</button>
        `;

        alertsList.appendChild(alertElement);
    }

    /**
     * Update chart visualization
     */
    updateChart(metricType = 'memory') {
        const canvas = document.getElementById('performance-chart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const history = this.state.history[metricType];
        if (!history || history.length < 2) return;

        // Draw chart
        this.drawLineChart(ctx, history, canvas.width, canvas.height);
    }

    /**
     * Draw line chart
     */
    drawLineChart(ctx, data, width, height) {
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;
        
        // Draw background
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.fillRect(padding, padding, chartWidth, chartHeight);
        
        // Draw line
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw current value
        const lastValue = data[data.length - 1];
        const lastX = padding + chartWidth;
        const lastY = padding + chartHeight - ((lastValue - minValue) / range) * chartHeight;
        
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    /**
     * Utility methods
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getPerformanceLevel(percentage) {
        if (percentage < 50) return 'good';
        if (percentage < 80) return 'warning';
        return 'critical';
    }

    estimateEventListeners() {
        // Rough estimation based on DOM elements
        return Math.floor(document.getElementsByTagName('*').length * 0.3);
    }

    updateStatus(status, text) {
        const indicator = document.querySelector('#monitor-status .status-indicator');
        const statusText = document.querySelector('#monitor-status .status-text');
        
        indicator.className = `status-indicator status-${status}`;
        statusText.textContent = text;
    }

    showAlertsPanel() {
        document.getElementById('alerts-panel').style.display = 'block';
    }

    hideAlertsPanel() {
        document.getElementById('alerts-panel').style.display = 'none';
    }

    dismissAlert(alertId) {
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.remove();
        }
        
        this.state.alerts = this.state.alerts.filter(alert => alert.id !== alertId);
        
        if (this.state.alerts.length === 0) {
            this.hideAlertsPanel();
        }
    }

    dismissAllAlerts() {
        this.state.alerts = [];
        document.getElementById('alerts-list').innerHTML = '';
        this.hideAlertsPanel();
    }

    clearHistory() {
        this.state.history = {
            memory: [],
            cpu: [],
            network: [],
            clustering: [],
            timestamps: []
        };
        this.updateChart();
    }

    exportMetrics() {
        const exportData = {
            timestamp: Date.now(),
            session: {
                startTime: this.startTime,
                duration: Date.now() - this.startTime
            },
            metrics: this.state.metrics,
            history: this.state.history,
            alerts: this.state.alerts
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-metrics-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return this.state.metrics;
    }

    /**
     * Destroy component
     */
    destroy() {
        this.stopMonitoring();
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Remove event listeners
        this.eventBus.off(EVENTS.API_REQUEST_SUCCESS);
        this.eventBus.off(EVENTS.API_REQUEST_ERROR);
        this.eventBus.off(EVENTS.CLUSTERING_COMPLETED);
        this.eventBus.off(EVENTS.CLUSTERING_PROGRESS);
        
        console.log('📊 Performance Monitor destroyed');
    }
}

// Make available globally for alert dismissal
window.performanceMonitor = null;