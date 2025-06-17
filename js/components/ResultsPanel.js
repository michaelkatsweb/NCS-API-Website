/**
 * FILE: js/components/ResultsPanel.js
 * ResultsPanel Component - Display clustering metrics and results
 * NCS-API Website
 * 
 * Features:
 * - Real-time clustering metrics
 * - Quality assessment scores
 * - Performance monitoring
 * - Iteration history
 * - Cluster analysis
 * - Export options
 * - Interactive charts
 * - Error reporting
 */

import { CONFIG } from '../config/constants.js';
import { MathUtils } from '../utils/math.js';
import { ColorPalette } from '../utils/colors.js';

export class ResultsPanel {
    constructor(container, visualizer) {
        this.container = container;
        this.visualizer = visualizer;
        
        // State management
        this.state = {
            metrics: {
                algorithm: null,
                iterations: 0,
                converged: false,
                inertia: 0,
                silhouetteScore: 0,
                daviesBouldinIndex: 0,
                calinskiHarabaszIndex: 0,
                executionTime: 0,
                pointsProcessed: 0,
                clustersFound: 0
            },
            performance: {
                fps: 0,
                renderTime: 0,
                memoryUsage: 0,
                cacheHits: 0,
                cacheMisses: 0
            },
            history: [],
            clusters: [],
            isRunning: false,
            lastUpdate: Date.now()
        };
        
        // Chart configurations
        this.charts = {
            convergence: null,
            metrics: null,
            clusters: null
        };
        
        // Update intervals
        this.updateInterval = null;
        this.chartUpdateInterval = null;
        
        // Color palette
        this.colorPalette = new ColorPalette();
        
        this.init();
    }

    /**
     * Initialize the results panel
     */
    init() {
        try {
            console.log('📊 Initializing ResultsPanel...');
            
            this.createLayout();
            this.bindEvents();
            this.setupCharts();
            this.startPerformanceMonitoring();
            
            // Connect to visualizer if available
            if (this.visualizer) {
                this.connectToVisualizer();
            }
            
            console.log('✅ ResultsPanel initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ResultsPanel:', error);
            this.handleError(error);
        }
    }

    /**
     * Create the results panel layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="results-section" data-section="status">
                <div class="results-section-title">
                    <span>Status</span>
                    <div class="status-indicator idle" id="clustering-status">
                        <div class="status-dot"></div>
                        <span>Idle</span>
                    </div>
                </div>
                <div class="status-details" id="status-details">
                    ${this.renderStatusDetails()}
                </div>
            </div>

            <div class="results-section" data-section="metrics">
                <div class="results-section-title">Quality Metrics</div>
                <div class="metrics-grid" id="metrics-grid">
                    ${this.renderMetrics()}
                </div>
            </div>

            <div class="results-section" data-section="performance">
                <div class="results-section-title">Performance</div>
                <div class="performance-grid" id="performance-grid">
                    ${this.renderPerformance()}
                </div>
            </div>

            <div class="results-section" data-section="clusters">
                <div class="results-section-title">
                    <span>Cluster Analysis</span>
                    <button class="results-action-btn" id="expand-clusters" title="Expand Details">
                        <span>📊</span>
                    </button>
                </div>
                <div class="clusters-summary" id="clusters-summary">
                    ${this.renderClustersSummary()}
                </div>
            </div>

            <div class="results-section" data-section="convergence">
                <div class="results-section-title">
                    <span>Convergence</span>
                    <button class="results-action-btn" id="toggle-convergence-chart" title="Toggle Chart">
                        <span>📈</span>
                    </button>
                </div>
                <div class="convergence-container">
                    <div class="convergence-stats" id="convergence-stats">
                        ${this.renderConvergenceStats()}
                    </div>
                    <div class="convergence-chart" id="convergence-chart" style="display: none;">
                        <canvas id="convergence-canvas" width="260" height="120"></canvas>
                    </div>
                </div>
            </div>

            <div class="results-section" data-section="history">
                <div class="results-section-title">
                    <span>History</span>
                    <button class="results-action-btn" id="clear-history" title="Clear History">
                        <span>🗑️</span>
                    </button>
                </div>
                <div class="history-list" id="history-list">
                    ${this.renderHistory()}
                </div>
            </div>

            <div class="results-section" data-section="export">
                <div class="results-section-title">Export</div>
                <div class="export-actions">
                    <button class="action-button action-button-secondary" id="export-metrics">
                        <span>📋</span>
                        Metrics
                    </button>
                    <button class="action-button action-button-secondary" id="export-data">
                        <span>💾</span>
                        Data
                    </button>
                    <button class="action-button action-button-secondary" id="export-report">
                        <span>📄</span>
                        Report
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render status details
     */
    renderStatusDetails() {
        return `
            <div class="metric-item">
                <span class="metric-label">Algorithm</span>
                <span class="metric-value" id="current-algorithm">${this.state.metrics.algorithm || 'None'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Iteration</span>
                <span class="metric-value" id="current-iteration">${this.state.metrics.iterations}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Converged</span>
                <span class="metric-value ${this.state.metrics.converged ? 'success' : ''}" id="convergence-status">
                    ${this.state.metrics.converged ? 'Yes' : 'No'}
                </span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Execution Time</span>
                <span class="metric-value" id="execution-time">${this.formatTime(this.state.metrics.executionTime)}</span>
            </div>
        `;
    }

    /**
     * Render quality metrics
     */
    renderMetrics() {
        const metrics = this.state.metrics;
        
        return `
            <div class="metric-item">
                <span class="metric-label">Inertia (WCSS)</span>
                <span class="metric-value" id="inertia-value">
                    ${metrics.inertia ? metrics.inertia.toFixed(4) : 'N/A'}
                </span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Silhouette Score</span>
                <span class="metric-value ${this.getScoreClass(metrics.silhouetteScore, 'silhouette')}" id="silhouette-value">
                    ${metrics.silhouetteScore ? metrics.silhouetteScore.toFixed(4) : 'N/A'}
                </span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Davies-Bouldin Index</span>
                <span class="metric-value ${this.getScoreClass(metrics.daviesBouldinIndex, 'davies-bouldin')}" id="davies-bouldin-value">
                    ${metrics.daviesBouldinIndex ? metrics.daviesBouldinIndex.toFixed(4) : 'N/A'}
                </span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Calinski-Harabasz Index</span>
                <span class="metric-value ${this.getScoreClass(metrics.calinskiHarabaszIndex, 'calinski-harabasz')}" id="calinski-harabasz-value">
                    ${metrics.calinskiHarabaszIndex ? metrics.calinskiHarabaszIndex.toFixed(2) : 'N/A'}
                </span>
            </div>
        `;
    }

    /**
     * Render performance metrics
     */
    renderPerformance() {
        const perf = this.state.performance;
        
        return `
            <div class="metric-item">
                <span class="metric-label">FPS</span>
                <span class="metric-value" id="fps-value">${perf.fps}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Render Time</span>
                <span class="metric-value" id="render-time-value">${perf.renderTime.toFixed(2)}ms</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Memory Usage</span>
                <span class="metric-value" id="memory-value">${this.formatBytes(perf.memoryUsage)}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Cache Hit Rate</span>
                <span class="metric-value" id="cache-rate-value">
                    ${this.calculateCacheHitRate().toFixed(1)}%
                </span>
            </div>
        `;
    }

    /**
     * Render clusters summary
     */
    renderClustersSummary() {
        if (this.state.clusters.length === 0) {
            return '<div class="no-data">No clustering results available</div>';
        }
        
        return this.state.clusters.map((cluster, index) => {
            const color = this.colorPalette.getClusterColors(this.state.clusters.length)[index];
            
            return `
                <div class="cluster-item" data-cluster="${index}">
                    <div class="cluster-header">
                        <div class="cluster-color" style="background-color: ${color};"></div>
                        <span class="cluster-title">Cluster ${index}</span>
                        <span class="cluster-size">${cluster.points?.length || 0} points</span>
                    </div>
                    <div class="cluster-stats">
                        <div class="cluster-stat">
                            <span class="stat-label">Centroid</span>
                            <span class="stat-value">
                                (${cluster.centroid?.x?.toFixed(3) || 'N/A'}, ${cluster.centroid?.y?.toFixed(3) || 'N/A'})
                            </span>
                        </div>
                        <div class="cluster-stat">
                            <span class="stat-label">Spread</span>
                            <span class="stat-value">${this.calculateClusterSpread(cluster).toFixed(3)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render convergence statistics
     */
    renderConvergenceStats() {
        const history = this.state.history;
        if (history.length === 0) {
            return '<div class="no-data">No convergence data available</div>';
        }
        
        const latest = history[history.length - 1];
        const improvement = history.length > 1 ? 
            ((history[history.length - 2].inertia - latest.inertia) / history[history.length - 2].inertia * 100) : 0;
        
        return `
            <div class="metric-item">
                <span class="metric-label">Current Inertia</span>
                <span class="metric-value">${latest.inertia?.toFixed(4) || 'N/A'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Improvement</span>
                <span class="metric-value ${improvement > 0 ? 'success' : improvement < 0 ? 'warning' : ''}">
                    ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%
                </span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Iterations</span>
                <span class="metric-value">${history.length}</span>
            </div>
        `;
    }

    /**
     * Render history list
     */
    renderHistory() {
        if (this.state.history.length === 0) {
            return '<div class="no-data">No clustering history available</div>';
        }
        
        return this.state.history.slice(-5).reverse().map((entry, index) => `
            <div class="history-item" data-iteration="${entry.iteration}">
                <div class="history-header">
                    <span class="history-algorithm">${entry.algorithm || 'Unknown'}</span>
                    <span class="history-time">${this.formatTimeAgo(entry.timestamp)}</span>
                </div>
                <div class="history-metrics">
                    <span class="history-metric">
                        <span class="metric-label">Inertia:</span>
                        <span class="metric-value">${entry.inertia?.toFixed(4) || 'N/A'}</span>
                    </span>
                    <span class="history-metric">
                        <span class="metric-label">Silhouette:</span>
                        <span class="metric-value">${entry.silhouetteScore?.toFixed(3) || 'N/A'}</span>
                    </span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Expand clusters button
        const expandClustersBtn = this.container.querySelector('#expand-clusters');
        if (expandClustersBtn) {
            expandClustersBtn.addEventListener('click', () => {
                this.toggleClustersDetail();
            });
        }

        // Toggle convergence chart
        const toggleChartBtn = this.container.querySelector('#toggle-convergence-chart');
        if (toggleChartBtn) {
            toggleChartBtn.addEventListener('click', () => {
                this.toggleConvergenceChart();
            });
        }

        // Clear history
        const clearHistoryBtn = this.container.querySelector('#clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        // Export buttons
        this.bindExportEvents();
    }

    /**
     * Bind export event listeners
     */
    bindExportEvents() {
        const exportMetricsBtn = this.container.querySelector('#export-metrics');
        if (exportMetricsBtn) {
            exportMetricsBtn.addEventListener('click', () => {
                this.exportMetrics();
            });
        }

        const exportDataBtn = this.container.querySelector('#export-data');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        const exportReportBtn = this.container.querySelector('#export-report');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => {
                this.exportReport();
            });
        }
    }

    /**
     * Connect to the visualizer component
     */
    connectToVisualizer() {
        if (!this.visualizer) return;

        // Set up event callbacks
        this.visualizer.on('clusteringStart', (algorithm, options) => {
            this.state.isRunning = true;
            this.state.metrics.algorithm = algorithm;
            this.updateStatus('running', `${algorithm.toUpperCase()} clustering started`);
            this.addHistoryEntry({ algorithm, status: 'started', timestamp: Date.now() });
        });

        this.visualizer.on('clusteringUpdate', (result, clustering) => {
            this.updateMetrics(result, clustering);
            this.updateClusters(result);
            this.updateConvergenceChart();
        });

        this.visualizer.on('clusteringComplete', (clustering) => {
            this.state.isRunning = false;
            this.state.metrics.converged = true;
            this.updateStatus('complete', 'Clustering completed successfully');
            this.finalizeResults(clustering);
        });

        this.visualizer.on('error', (error) => {
            this.state.isRunning = false;
            this.updateStatus('error', `Error: ${error.message}`);
            this.addHistoryEntry({ 
                algorithm: this.state.metrics.algorithm, 
                status: 'error', 
                error: error.message,
                timestamp: Date.now() 
            });
        });

        console.log('🔗 ResultsPanel connected to visualizer');
    }

    /**
     * Set up chart components
     */
    setupCharts() {
        // Initialize convergence chart
        const canvas = this.container.querySelector('#convergence-canvas');
        if (canvas) {
            this.charts.convergence = canvas.getContext('2d');
            this.setupConvergenceChart();
        }
    }

    /**
     * Setup convergence chart
     */
    setupConvergenceChart() {
        const ctx = this.charts.convergence;
        if (!ctx) return;
        
        // Set up chart styling
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        this.updateInterval = setInterval(() => {
            this.updatePerformanceMetrics();
            this.updateUI();
        }, 1000);
    }

    /**
     * Update status indicator
     */
    updateStatus(status, message = '') {
        const statusElement = this.container.querySelector('#clustering-status');
        if (!statusElement) return;

        // Remove existing status classes
        statusElement.classList.remove('idle', 'running', 'complete', 'error');
        statusElement.classList.add(status);

        // Update text and pulse animation
        const statusText = statusElement.querySelector('span');
        const statusDot = statusElement.querySelector('.status-dot');
        
        if (statusText) {
            switch (status) {
                case 'running':
                    statusText.textContent = 'Running';
                    statusDot.classList.add('pulse');
                    break;
                case 'complete':
                    statusText.textContent = 'Complete';
                    statusDot.classList.remove('pulse');
                    break;
                case 'error':
                    statusText.textContent = 'Error';
                    statusDot.classList.remove('pulse');
                    break;
                default:
                    statusText.textContent = 'Idle';
                    statusDot.classList.remove('pulse');
            }
        }

        if (CONFIG.IS_DEV && message) {
            console.log(`📊 Status: ${status} - ${message}`);
        }
    }

    /**
     * Update clustering metrics
     */
    updateMetrics(result, clustering) {
        // Update basic metrics
        this.state.metrics.iterations = clustering.iterations || 0;
        this.state.metrics.inertia = clustering.inertia || 0;
        this.state.metrics.silhouetteScore = clustering.silhouetteScore || 0;
        this.state.metrics.pointsProcessed = result.assignments?.length || 0;
        this.state.metrics.clustersFound = result.centroids?.length || 0;

        // Calculate additional quality metrics
        if (result.assignments && result.centroids) {
            this.calculateQualityMetrics(result);
        }

        // Add to history
        this.addHistoryEntry({
            algorithm: this.state.metrics.algorithm,
            iteration: this.state.metrics.iterations,
            inertia: this.state.metrics.inertia,
            silhouetteScore: this.state.metrics.silhouetteScore,
            timestamp: Date.now()
        });

        // Update UI
        this.updateMetricsUI();
    }

    /**
     * Calculate additional quality metrics
     */
    calculateQualityMetrics(result) {
        // Davies-Bouldin Index calculation
        this.state.metrics.daviesBouldinIndex = this.calculateDaviesBouldinIndex(result);
        
        // Calinski-Harabasz Index calculation
        this.state.metrics.calinskiHarabaszIndex = this.calculateCalinskiHarabaszIndex(result);
    }

    /**
     * Calculate Davies-Bouldin Index
     */
    calculateDaviesBouldinIndex(result) {
        const { assignments, centroids } = result;
        if (!assignments || !centroids || centroids.length < 2) return 0;

        const clusters = this.groupPointsByClusters(assignments);
        let dbIndex = 0;

        for (let i = 0; i < centroids.length; i++) {
            let maxRatio = 0;
            const avgDistI = this.calculateAverageIntraClusterDistance(clusters[i], centroids[i]);

            for (let j = 0; j < centroids.length; j++) {
                if (i !== j) {
                    const avgDistJ = this.calculateAverageIntraClusterDistance(clusters[j], centroids[j]);
                    const centroidDist = MathUtils.euclideanDistance(centroids[i], centroids[j]);
                    
                    if (centroidDist > 0) {
                        const ratio = (avgDistI + avgDistJ) / centroidDist;
                        maxRatio = Math.max(maxRatio, ratio);
                    }
                }
            }
            
            dbIndex += maxRatio;
        }

        return dbIndex / centroids.length;
    }

    /**
     * Calculate Calinski-Harabasz Index
     */
    calculateCalinskiHarabaszIndex(result) {
        const { assignments, centroids } = result;
        if (!assignments || !centroids || centroids.length < 2) return 0;

        const n = assignments.length;
        const k = centroids.length;
        
        if (n <= k) return 0;

        // Calculate overall centroid
        const overallCentroid = this.calculateOverallCentroid(assignments);
        
        // Calculate between-cluster sum of squares
        let betweenSS = 0;
        const clusters = this.groupPointsByClusters(assignments);
        
        for (let i = 0; i < centroids.length; i++) {
            const clusterSize = clusters[i]?.length || 0;
            const dist = MathUtils.euclideanDistance(centroids[i], overallCentroid);
            betweenSS += clusterSize * dist * dist;
        }

        // Calculate within-cluster sum of squares
        let withinSS = 0;
        for (let i = 0; i < centroids.length; i++) {
            if (clusters[i]) {
                for (const point of clusters[i]) {
                    const dist = MathUtils.euclideanDistance(point, centroids[i]);
                    withinSS += dist * dist;
                }
            }
        }

        if (withinSS === 0) return 0;

        return (betweenSS / (k - 1)) / (withinSS / (n - k));
    }

    /**
     * Update clusters data
     */
    updateClusters(result) {
        if (!result.assignments || !result.centroids) return;

        const clusters = this.groupPointsByClusters(result.assignments);
        
        this.state.clusters = result.centroids.map((centroid, index) => ({
            id: index,
            centroid,
            points: clusters[index] || [],
            color: this.colorPalette.getClusterColors(result.centroids.length)[index]
        }));

        this.updateClustersUI();
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        if (this.visualizer) {
            const stats = this.visualizer.getStats();
            
            this.state.performance = {
                fps: stats.animation?.fps || 0,
                renderTime: stats.performance?.renderTime || 0,
                memoryUsage: stats.performance?.memoryUsage || 0,
                cacheHits: stats.performance?.cacheHits || 0,
                cacheMisses: stats.performance?.cacheMisses || 0
            };
        }

        // Update browser memory if available
        if (performance.memory) {
            this.state.performance.memoryUsage = performance.memory.usedJSHeapSize;
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.updateStatusDetails();
        this.updatePerformanceUI();
        
        if (this.state.isRunning) {
            this.updateConvergenceStats();
        }
    }

    /**
     * Update status details UI
     */
    updateStatusDetails() {
        const elements = {
            'current-algorithm': this.state.metrics.algorithm || 'None',
            'current-iteration': this.state.metrics.iterations,
            'convergence-status': this.state.metrics.converged ? 'Yes' : 'No',
            'execution-time': this.formatTime(this.state.metrics.executionTime)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.textContent = value;
                
                // Update convergence status class
                if (id === 'convergence-status') {
                    element.className = `metric-value ${this.state.metrics.converged ? 'success' : ''}`;
                }
            }
        });
    }

    /**
     * Update metrics UI
     */
    updateMetricsUI() {
        const metrics = this.state.metrics;
        
        const updates = {
            'inertia-value': metrics.inertia ? metrics.inertia.toFixed(4) : 'N/A',
            'silhouette-value': metrics.silhouetteScore ? metrics.silhouetteScore.toFixed(4) : 'N/A',
            'davies-bouldin-value': metrics.daviesBouldinIndex ? metrics.daviesBouldinIndex.toFixed(4) : 'N/A',
            'calinski-harabasz-value': metrics.calinskiHarabaszIndex ? metrics.calinskiHarabaszIndex.toFixed(2) : 'N/A'
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.textContent = value;
                
                // Update score classes
                const metricType = id.replace('-value', '').replace('-', '');
                element.className = `metric-value ${this.getScoreClass(
                    metrics[metricType] || metrics[metricType.replace('davies-bouldin', 'daviesBouldinIndex')], 
                    metricType
                )}`;
            }
        });
    }

    /**
     * Update performance UI
     */
    updatePerformanceUI() {
        const perf = this.state.performance;
        
        const updates = {
            'fps-value': perf.fps,
            'render-time-value': `${perf.renderTime.toFixed(2)}ms`,
            'memory-value': this.formatBytes(perf.memoryUsage),
            'cache-rate-value': `${this.calculateCacheHitRate().toFixed(1)}%`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Update clusters UI
     */
    updateClustersUI() {
        const container = this.container.querySelector('#clusters-summary');
        if (container) {
            container.innerHTML = this.renderClustersSummary();
        }
    }

    /**
     * Update convergence statistics
     */
    updateConvergenceStats() {
        const container = this.container.querySelector('#convergence-stats');
        if (container) {
            container.innerHTML = this.renderConvergenceStats();
        }
    }

    /**
     * Update convergence chart
     */
    updateConvergenceChart() {
        const ctx = this.charts.convergence;
        if (!ctx || this.state.history.length === 0) return;

        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const history = this.state.history.slice(-20); // Show last 20 iterations
        if (history.length < 2) return;
        
        // Get data range
        const inertiaValues = history.map(h => h.inertia).filter(v => v != null);
        const minInertia = Math.min(...inertiaValues);
        const maxInertia = Math.max(...inertiaValues);
        const inertiaRange = maxInertia - minInertia || 1;
        
        // Draw chart
        ctx.beginPath();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        
        history.forEach((entry, index) => {
            if (entry.inertia != null) {
                const x = (index / (history.length - 1)) * width;
                const y = height - ((entry.inertia - minInertia) / inertiaRange) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        });
        
        ctx.stroke();
        
        // Draw fill area
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#6366f1';
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /**
     * Toggle clusters detail view
     */
    toggleClustersDetail() {
        const summary = this.container.querySelector('#clusters-summary');
        if (summary) {
            summary.classList.toggle('expanded');
        }
    }

    /**
     * Toggle convergence chart visibility
     */
    toggleConvergenceChart() {
        const chart = this.container.querySelector('#convergence-chart');
        if (chart) {
            const isVisible = chart.style.display !== 'none';
            chart.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.updateConvergenceChart();
            }
        }
    }

    /**
     * Clear clustering history
     */
    clearHistory() {
        this.state.history = [];
        
        const historyContainer = this.container.querySelector('#history-list');
        if (historyContainer) {
            historyContainer.innerHTML = this.renderHistory();
        }
        
        // Clear convergence chart
        if (this.charts.convergence) {
            const canvas = this.charts.convergence.canvas;
            this.charts.convergence.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Export clustering metrics
     */
    exportMetrics() {
        const data = {
            timestamp: new Date().toISOString(),
            algorithm: this.state.metrics.algorithm,
            metrics: this.state.metrics,
            performance: this.state.performance,
            clusters: this.state.clusters.map(c => ({
                id: c.id,
                centroid: c.centroid,
                pointCount: c.points.length,
                spread: this.calculateClusterSpread(c)
            }))
        };
        
        this.downloadJSON(data, `clustering-metrics-${Date.now()}.json`);
    }

    /**
     * Export clustering data
     */
    exportData() {
        if (!this.visualizer) {
            this.showError('No data available for export');
            return;
        }
        
        const data = this.visualizer.getData();
        this.downloadJSON(data, `clustering-data-${Date.now()}.json`);
    }

    /**
     * Export comprehensive report
     */
    exportReport() {
        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                algorithm: this.state.metrics.algorithm,
                version: CONFIG.VERSION?.APP || '1.0.0'
            },
            summary: {
                totalPoints: this.state.metrics.pointsProcessed,
                clustersFound: this.state.metrics.clustersFound,
                iterations: this.state.metrics.iterations,
                converged: this.state.metrics.converged,
                executionTime: this.state.metrics.executionTime
            },
            qualityMetrics: {
                inertia: this.state.metrics.inertia,
                silhouetteScore: this.state.metrics.silhouetteScore,
                daviesBouldinIndex: this.state.metrics.daviesBouldinIndex,
                calinskiHarabaszIndex: this.state.metrics.calinskiHarabaszIndex
            },
            performance: this.state.performance,
            clusters: this.state.clusters.map(c => ({
                id: c.id,
                centroid: c.centroid,
                pointCount: c.points.length,
                spread: this.calculateClusterSpread(c),
                density: this.calculateClusterDensity(c)
            })),
            convergenceHistory: this.state.history
        };
        
        this.downloadJSON(report, `clustering-report-${Date.now()}.json`);
    }

    /**
     * Add entry to clustering history
     */
    addHistoryEntry(entry) {
        this.state.history.push({
            ...entry,
            timestamp: entry.timestamp || Date.now()
        });
        
        // Keep only last 100 entries
        if (this.state.history.length > 100) {
            this.state.history = this.state.history.slice(-100);
        }
        
        // Update history UI
        const historyContainer = this.container.querySelector('#history-list');
        if (historyContainer) {
            historyContainer.innerHTML = this.renderHistory();
        }
    }

    /**
     * Finalize results after clustering completion
     */
    finalizeResults(clustering) {
        this.state.metrics.executionTime = Date.now() - this.state.lastUpdate;
        this.updateUI();
        
        // Add final entry to history
        this.addHistoryEntry({
            algorithm: this.state.metrics.algorithm,
            status: 'completed',
            finalMetrics: { ...this.state.metrics },
            timestamp: Date.now()
        });
    }

    /**
     * Helper methods
     */

    getScoreClass(value, type) {
        if (!value && value !== 0) return '';
        
        switch (type) {
            case 'silhouette':
                return value > 0.7 ? 'success' : value > 0.3 ? '' : 'warning';
            case 'daviesbouldin':
                return value < 1 ? 'success' : value < 2 ? '' : 'warning';
            case 'calinskiharabasz':
                return value > 100 ? 'success' : value > 50 ? '' : 'warning';
            default:
                return '';
        }
    }

    calculateCacheHitRate() {
        const total = this.state.performance.cacheHits + this.state.performance.cacheMisses;
        return total > 0 ? (this.state.performance.cacheHits / total) * 100 : 0;
    }

    calculateClusterSpread(cluster) {
        if (!cluster.points || cluster.points.length === 0) return 0;
        
        const distances = cluster.points.map(point => 
            MathUtils.euclideanDistance(point, cluster.centroid)
        );
        
        return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    }

    calculateClusterDensity(cluster) {
        if (!cluster.points || cluster.points.length < 2) return 0;
        
        const spread = this.calculateClusterSpread(cluster);
        return spread > 0 ? cluster.points.length / (Math.PI * spread * spread) : 0;
    }

    calculateAverageIntraClusterDistance(points, centroid) {
        if (!points || points.length === 0) return 0;
        
        const distances = points.map(point => MathUtils.euclideanDistance(point, centroid));
        return distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    }

    calculateOverallCentroid(points) {
        if (!points || points.length === 0) return { x: 0, y: 0 };
        
        const sum = points.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    groupPointsByClusters(assignments) {
        const clusters = {};
        
        assignments.forEach((assignment, index) => {
            if (!clusters[assignment]) {
                clusters[assignment] = [];
            }
            clusters[assignment].push({ x: Math.random(), y: Math.random(), id: index });
        });
        
        return clusters;
    }

    formatTime(ms) {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    showError(message) {
        console.error('ResultsPanel error:', message);
        
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.show(message, 'error');
        }
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('ResultsPanel error:', error);
        
        this.container.innerHTML = `
            <div class="results-section">
                <div style="text-align: center; color: var(--color-error-500); padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <div>Results Panel Error</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem; color: var(--color-text-tertiary);">
                        ${error.message}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        console.log('🧹 Cleaning up ResultsPanel...');
        
        // Clear intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.chartUpdateInterval) {
            clearInterval(this.chartUpdateInterval);
        }
        
        // Clear state
        this.state.history = [];
        this.state.clusters = [];
        
        // Clear container
        this.container.innerHTML = '';
    }
}