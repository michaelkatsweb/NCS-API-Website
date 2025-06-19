/**
 * FILE: pages/benchmarks.js
 * Benchmarks Page Controller - Performance metrics and algorithm comparisons
 * NCS-API Website
 * 
 * Features:
 * - Real-time performance monitoring
 * - Algorithm comparison charts
 * - Interactive benchmark testing
 * - Memory and CPU profiling
 * - Historical performance data
 * - Export benchmark reports
 * - Custom dataset testing
 * - Load testing simulation
 */

import { CONFIG } from '../js/config/constants.js';
import { EventBus } from '../js/core/eventBus.js';
import { PerformanceMonitor } from '../js/components/PerformanceMonitor.js';
import { MetricsChart } from '../js/visualizations/charts/MetricsChart.js';
import { ApiClient } from '../js/api/client.js';

export class BenchmarksPage {
    constructor() {
        this.container = document.getElementById('benchmarks-container') || document.body;
        this.eventBus = new EventBus();
        this.apiClient = new ApiClient();
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        this.isRunningBenchmarks = false;
        this.currentTest = null;
        
        // Benchmark configuration
        this.benchmarkConfig = {
            algorithms: ['kmeans', 'dbscan', 'hierarchical', 'ncs'],
            dataSizes: [100, 500, 1000, 5000, 10000, 50000],
            dimensions: [2, 3, 5, 10, 20, 50],
            testIterations: 5,
            timeoutMs: 30000,
            memoryThreshold: 500 // MB
        };
        
        // Benchmark results storage
        this.benchmarkResults = {
            current: [],
            historical: this.loadHistoricalData(),
            comparison: null
        };
        
        // Chart instances
        this.charts = {
            performance: null,
            memory: null,
            accuracy: null,
            comparison: null,
            realtime: null
        };
        
        // Test datasets
        this.testDatasets = {
            synthetic: {
                gaussian: { name: 'Gaussian Clusters', complexity: 'Low' },
                spiral: { name: 'Spiral Pattern', complexity: 'Medium' },
                manifold: { name: 'Manifold Data', complexity: 'High' }
            },
            realWorld: {
                iris: { name: 'Iris Dataset', size: 150, dimensions: 4 },
                wine: { name: 'Wine Dataset', size: 178, dimensions: 13 },
                breast_cancer: { name: 'Breast Cancer', size: 569, dimensions: 30 }
            }
        };
        
        // Performance metrics
        this.metrics = {
            speed: { unit: 'ms', description: 'Processing time' },
            memory: { unit: 'MB', description: 'Peak memory usage' },
            accuracy: { unit: '%', description: 'Clustering quality' },
            scalability: { unit: 'score', description: 'Scale efficiency' },
            stability: { unit: 'score', description: 'Result consistency' }
        };
        
        this.init();
    }

    /**
     * Initialize the benchmarks page
     */
    async init() {
        console.log('🚀 Initializing Benchmarks Page...');
        
        try {
            await this.setupUI();
            await this.loadBenchmarkData();
            this.setupEventListeners();
            this.initializeCharts();
            this.startRealtimeMonitoring();
            
            console.log('✅ Benchmarks page initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing benchmarks page:', error);
            this.showError('Failed to initialize benchmarks page');
        }
    }

    /**
     * Setup the user interface
     */
    async setupUI() {
        this.container.innerHTML = `
            <div class="benchmarks-page">
                <!-- Header Section -->
                <header class="page-header">
                    <div class="container">
                        <div class="header-content">
                            <h1 class="page-title">
                                <span class="title-icon">📊</span>
                                Performance Benchmarks
                            </h1>
                            <p class="page-subtitle">
                                Real-time performance metrics and algorithm comparisons
                            </p>
                        </div>
                        
                        <div class="header-actions">
                            <button id="run-benchmark" class="btn btn-primary">
                                <span class="btn-icon">🚀</span>
                                Run Benchmark
                            </button>
                            <button id="export-results" class="btn btn-secondary">
                                <span class="btn-icon">📤</span>
                                Export Results
                            </button>
                            <button id="reset-data" class="btn btn-outline">
                                <span class="btn-icon">🔄</span>
                                Reset
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Performance Overview -->
                <section class="overview-section">
                    <div class="container">
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-icon">⚡</div>
                                <div class="metric-content">
                                    <div class="metric-value" id="avg-speed">--</div>
                                    <div class="metric-label">Avg Speed (ms)</div>
                                </div>
                                <div class="metric-trend" id="speed-trend">--</div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">🧠</div>
                                <div class="metric-content">
                                    <div class="metric-value" id="avg-memory">--</div>
                                    <div class="metric-label">Memory Usage (MB)</div>
                                </div>
                                <div class="metric-trend" id="memory-trend">--</div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">🎯</div>
                                <div class="metric-content">
                                    <div class="metric-value" id="avg-accuracy">--</div>
                                    <div class="metric-label">Accuracy Score</div>
                                </div>
                                <div class="metric-trend" id="accuracy-trend">--</div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">📈</div>
                                <div class="metric-content">
                                    <div class="metric-value" id="throughput">--</div>
                                    <div class="metric-label">Throughput (ops/sec)</div>
                                </div>
                                <div class="metric-trend" id="throughput-trend">--</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Algorithm Comparison -->
                <section class="comparison-section">
                    <div class="container">
                        <div class="section-header">
                            <h2>Algorithm Performance Comparison</h2>
                            <div class="comparison-controls">
                                <select id="dataset-selector" class="form-control">
                                    <option value="all">All Datasets</option>
                                    <option value="iris">Iris Dataset</option>
                                    <option value="wine">Wine Dataset</option>
                                    <option value="synthetic">Synthetic Data</option>
                                </select>
                                <select id="metric-selector" class="form-control">
                                    <option value="speed">Processing Speed</option>
                                    <option value="memory">Memory Usage</option>
                                    <option value="accuracy">Accuracy Score</option>
                                    <option value="scalability">Scalability</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h3>Performance Chart</h3>
                                <div id="performance-chart" class="chart"></div>
                            </div>
                            
                            <div class="chart-container">
                                <h3>Memory Usage</h3>
                                <div id="memory-chart" class="chart"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Real-time Monitoring -->
                <section class="monitoring-section">
                    <div class="container">
                        <div class="section-header">
                            <h2>Real-time Performance Monitoring</h2>
                            <div class="monitoring-controls">
                                <button id="start-monitoring" class="btn btn-success">
                                    <span class="btn-icon">▶️</span>
                                    Start Monitoring
                                </button>
                                <button id="stop-monitoring" class="btn btn-danger" disabled>
                                    <span class="btn-icon">⏹️</span>
                                    Stop Monitoring
                                </button>
                                <div class="monitoring-status">
                                    <span class="status-indicator" id="monitoring-status"></span>
                                    <span id="monitoring-text">Stopped</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="monitoring-grid">
                            <div class="monitor-card">
                                <h3>Live Performance</h3>
                                <div id="realtime-chart" class="realtime-chart"></div>
                            </div>
                            
                            <div class="monitor-card">
                                <h3>System Metrics</h3>
                                <div id="system-metrics" class="system-metrics">
                                    <div class="system-metric">
                                        <span class="metric-name">CPU Usage:</span>
                                        <span class="metric-value" id="cpu-usage">--</span>
                                    </div>
                                    <div class="system-metric">
                                        <span class="metric-name">Memory:</span>
                                        <span class="metric-value" id="memory-usage">--</span>
                                    </div>
                                    <div class="system-metric">
                                        <span class="metric-name">Network:</span>
                                        <span class="metric-value" id="network-usage">--</span>
                                    </div>
                                    <div class="system-metric">
                                        <span class="metric-name">API Latency:</span>
                                        <span class="metric-value" id="api-latency">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Benchmark Configuration -->
                <section class="config-section">
                    <div class="container">
                        <div class="section-header">
                            <h2>Benchmark Configuration</h2>
                            <button id="save-config" class="btn btn-primary">Save Configuration</button>
                        </div>
                        
                        <div class="config-grid">
                            <div class="config-group">
                                <h3>Algorithms</h3>
                                <div class="checkbox-group" id="algorithm-checkboxes">
                                    <label class="checkbox-item">
                                        <input type="checkbox" value="kmeans" checked>
                                        <span class="checkmark"></span>
                                        K-Means
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" value="dbscan" checked>
                                        <span class="checkmark"></span>
                                        DBSCAN
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" value="hierarchical" checked>
                                        <span class="checkmark"></span>
                                        Hierarchical
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" value="ncs" checked>
                                        <span class="checkmark"></span>
                                        NCS Algorithm
                                    </label>
                                </div>
                            </div>
                            
                            <div class="config-group">
                                <h3>Test Parameters</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Data Sizes:</label>
                                        <input type="text" id="data-sizes" value="100,500,1000,5000,10000" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Dimensions:</label>
                                        <input type="text" id="dimensions" value="2,3,5,10,20" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Iterations:</label>
                                        <input type="number" id="iterations" value="5" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Timeout (ms):</label>
                                        <input type="number" id="timeout" value="30000" class="form-control">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Results Table -->
                <section class="results-section">
                    <div class="container">
                        <div class="section-header">
                            <h2>Benchmark Results</h2>
                            <div class="results-controls">
                                <button id="clear-results" class="btn btn-outline">Clear Results</button>
                                <button id="download-csv" class="btn btn-secondary">Download CSV</button>
                                <button id="download-json" class="btn btn-secondary">Download JSON</button>
                            </div>
                        </div>
                        
                        <div class="results-table-container">
                            <table id="results-table" class="results-table">
                                <thead>
                                    <tr>
                                        <th>Algorithm</th>
                                        <th>Dataset</th>
                                        <th>Data Size</th>
                                        <th>Dimensions</th>
                                        <th>Speed (ms)</th>
                                        <th>Memory (MB)</th>
                                        <th>Accuracy</th>
                                        <th>Timestamp</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="results-tbody">
                                    <!-- Results will be inserted here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Progress Modal -->
                <div id="benchmark-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Running Benchmark Tests</h3>
                            <button class="modal-close" id="close-benchmark-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="benchmark-progress"></div>
                                </div>
                                <div class="progress-text" id="benchmark-status">Initializing...</div>
                            </div>
                            
                            <div class="test-details">
                                <div class="detail-item">
                                    <span class="detail-label">Current Test:</span>
                                    <span class="detail-value" id="current-test">--</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Progress:</span>
                                    <span class="detail-value" id="test-progress">0/0</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Estimated Time:</span>
                                    <span class="detail-value" id="estimated-time">--</span>
                                </div>
                            </div>
                            
                            <div class="current-metrics">
                                <h4>Current Test Metrics</h4>
                                <div class="metrics-display" id="current-metrics">
                                    <!-- Real-time metrics will be shown here -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="cancel-benchmark" class="btn btn-danger">Cancel Tests</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Benchmark controls
        document.getElementById('run-benchmark').addEventListener('click', () => this.runBenchmarks());
        document.getElementById('export-results').addEventListener('click', () => this.exportResults());
        document.getElementById('reset-data').addEventListener('click', () => this.resetData());
        
        // Monitoring controls
        document.getElementById('start-monitoring').addEventListener('click', () => this.startMonitoring());
        document.getElementById('stop-monitoring').addEventListener('click', () => this.stopMonitoring());
        
        // Configuration
        document.getElementById('save-config').addEventListener('click', () => this.saveConfiguration());
        
        // Results controls
        document.getElementById('clear-results').addEventListener('click', () => this.clearResults());
        document.getElementById('download-csv').addEventListener('click', () => this.downloadResults('csv'));
        document.getElementById('download-json').addEventListener('click', () => this.downloadResults('json'));
        
        // Chart controls
        document.getElementById('dataset-selector').addEventListener('change', (e) => this.updateCharts(e.target.value));
        document.getElementById('metric-selector').addEventListener('change', (e) => this.updateMetricView(e.target.value));
        
        // Modal controls
        document.getElementById('close-benchmark-modal').addEventListener('click', () => this.closeBenchmarkModal());
        document.getElementById('cancel-benchmark').addEventListener('click', () => this.cancelBenchmark());
        
        // Global events
        this.eventBus.on('benchmark:complete', (data) => this.onBenchmarkComplete(data));
        this.eventBus.on('benchmark:error', (error) => this.onBenchmarkError(error));
        this.eventBus.on('monitoring:update', (metrics) => this.updateRealtimeMetrics(metrics));
    }

    /**
     * Initialize charts
     */
    initializeCharts() {
        this.charts.performance = new MetricsChart(document.getElementById('performance-chart'), {
            type: 'line',
            title: 'Algorithm Performance',
            xAxis: 'Data Size',
            yAxis: 'Processing Time (ms)',
            series: this.benchmarkConfig.algorithms
        });
        
        this.charts.memory = new MetricsChart(document.getElementById('memory-chart'), {
            type: 'bar',
            title: 'Memory Usage',
            xAxis: 'Algorithm',
            yAxis: 'Memory (MB)',
            series: ['Peak Memory', 'Average Memory']
        });
        
        this.charts.realtime = new MetricsChart(document.getElementById('realtime-chart'), {
            type: 'realtime',
            title: 'Live Performance',
            maxDataPoints: 100,
            updateInterval: 1000
        });
    }

    /**
     * Load benchmark data
     */
    async loadBenchmarkData() {
        try {
            const response = await this.apiClient.get('/benchmarks/data');
            if (response.success) {
                this.benchmarkResults.historical = response.data;
                this.updateMetricsDisplay();
                this.updateResultsTable();
            }
        } catch (error) {
            console.warn('Could not load historical benchmark data:', error);
        }
    }

    /**
     * Run benchmark tests
     */
    async runBenchmarks() {
        if (this.isRunningBenchmarks) {
            this.showError('Benchmarks are already running');
            return;
        }
        
        this.isRunningBenchmarks = true;
        this.showBenchmarkModal();
        
        try {
            const selectedAlgorithms = this.getSelectedAlgorithms();
            const dataSizes = this.getDataSizes();
            const dimensions = this.getDimensions();
            
            const totalTests = selectedAlgorithms.length * dataSizes.length * dimensions.length;
            let completedTests = 0;
            
            this.updateBenchmarkProgress(0, `Starting ${totalTests} tests...`);
            
            for (const algorithm of selectedAlgorithms) {
                for (const dataSize of dataSizes) {
                    for (const dimension of dimensions) {
                        if (!this.isRunningBenchmarks) break; // Check for cancellation
                        
                        this.currentTest = `${algorithm} - ${dataSize} points, ${dimension}D`;
                        this.updateBenchmarkProgress(
                            (completedTests / totalTests) * 100,
                            `Testing ${this.currentTest}...`
                        );
                        
                        const result = await this.runSingleBenchmark(algorithm, dataSize, dimension);
                        this.benchmarkResults.current.push(result);
                        
                        completedTests++;
                        
                        // Update real-time display
                        this.updateMetricsDisplay();
                        this.updateResultsTable();
                    }
                }
            }
            
            this.updateBenchmarkProgress(100, 'Benchmark completed successfully!');
            setTimeout(() => this.closeBenchmarkModal(), 2000);
            
        } catch (error) {
            this.onBenchmarkError(error);
        } finally {
            this.isRunningBenchmarks = false;
        }
    }

    /**
     * Run a single benchmark test
     */
    async runSingleBenchmark(algorithm, dataSize, dimensions) {
        const startTime = performance.now();
        const memoryBefore = this.getMemoryUsage();
        
        try {
            // Generate test data
            const testData = this.generateTestData(dataSize, dimensions);
            
            // Run clustering algorithm
            const response = await this.apiClient.post('/cluster', {
                algorithm: algorithm,
                data: testData,
                parameters: this.getAlgorithmParameters(algorithm)
            });
            
            const endTime = performance.now();
            const memoryAfter = this.getMemoryUsage();
            
            // Calculate metrics
            const processingTime = endTime - startTime;
            const memoryUsed = memoryAfter - memoryBefore;
            const accuracy = this.calculateAccuracy(response.data.clusters, testData);
            
            return {
                algorithm,
                dataSize,
                dimensions,
                processingTime: Math.round(processingTime),
                memoryUsed: Math.round(memoryUsed * 100) / 100,
                accuracy: Math.round(accuracy * 100) / 100,
                timestamp: new Date().toISOString(),
                clusters: response.data.clusters.length,
                quality: response.data.quality || 0
            };
            
        } catch (error) {
            return {
                algorithm,
                dataSize,
                dimensions,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Update metrics display
     */
    updateMetricsDisplay() {
        const results = this.benchmarkResults.current;
        if (results.length === 0) return;
        
        const validResults = results.filter(r => !r.error);
        
        const avgSpeed = validResults.reduce((sum, r) => sum + r.processingTime, 0) / validResults.length;
        const avgMemory = validResults.reduce((sum, r) => sum + r.memoryUsed, 0) / validResults.length;
        const avgAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0) / validResults.length;
        const throughput = validResults.length > 0 ? 1000 / avgSpeed : 0;
        
        document.getElementById('avg-speed').textContent = Math.round(avgSpeed);
        document.getElementById('avg-memory').textContent = Math.round(avgMemory * 100) / 100;
        document.getElementById('avg-accuracy').textContent = Math.round(avgAccuracy * 100) / 100;
        document.getElementById('throughput').textContent = Math.round(throughput);
        
        // Update trends (simplified)
        this.updateTrend('speed-trend', avgSpeed);
        this.updateTrend('memory-trend', avgMemory);
        this.updateTrend('accuracy-trend', avgAccuracy);
        this.updateTrend('throughput-trend', throughput);
    }

    /**
     * Update results table
     */
    updateResultsTable() {
        const tbody = document.getElementById('results-tbody');
        const results = this.benchmarkResults.current;
        
        tbody.innerHTML = results.map(result => `
            <tr class="${result.error ? 'error-row' : ''}">
                <td>${result.algorithm}</td>
                <td>Synthetic</td>
                <td>${result.dataSize}</td>
                <td>${result.dimensions}</td>
                <td>${result.error ? 'Error' : result.processingTime + 'ms'}</td>
                <td>${result.error ? 'Error' : result.memoryUsed + 'MB'}</td>
                <td>${result.error ? 'Error' : result.accuracy + '%'}</td>
                <td>${new Date(result.timestamp).toLocaleString()}</td>
                <td>
                    <button class="btn-icon" onclick="benchmarks.viewDetails('${result.timestamp}')">👁️</button>
                    <button class="btn-icon" onclick="benchmarks.deleteResult('${result.timestamp}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Start real-time monitoring
     */
    startRealtimeMonitoring() {
        this.performanceMonitor.start();
        setInterval(() => {
            this.updateSystemMetrics();
        }, 1000);
    }

    /**
     * Helper methods
     */
    getSelectedAlgorithms() {
        const checkboxes = document.querySelectorAll('#algorithm-checkboxes input:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    getDataSizes() {
        const input = document.getElementById('data-sizes').value;
        return input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    }

    getDimensions() {
        const input = document.getElementById('dimensions').value;
        return input.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    }

    generateTestData(size, dimensions) {
        const data = [];
        for (let i = 0; i < size; i++) {
            const point = {};
            for (let d = 0; d < dimensions; d++) {
                point[`dim_${d}`] = Math.random() * 100;
            }
            data.push(point);
        }
        return data;
    }

    getMemoryUsage() {
        if ('memory' in performance) {
            return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
    }

    calculateAccuracy(clusters, originalData) {
        // Simplified accuracy calculation
        // In real implementation, this would use silhouette score or other metrics
        return Math.random() * 20 + 80; // 80-100% for demo
    }

    getAlgorithmParameters(algorithm) {
        const params = {
            kmeans: { k: 3, maxIterations: 100 },
            dbscan: { eps: 0.5, minPts: 5 },
            hierarchical: { linkage: 'ward' },
            ncs: { threshold: 0.1, iterations: 50 }
        };
        return params[algorithm] || {};
    }

    showBenchmarkModal() {
        document.getElementById('benchmark-modal').style.display = 'block';
    }

    closeBenchmarkModal() {
        document.getElementById('benchmark-modal').style.display = 'none';
    }

    updateBenchmarkProgress(percentage, status) {
        document.getElementById('benchmark-progress').style.width = `${percentage}%`;
        document.getElementById('benchmark-status').textContent = status;
        document.getElementById('current-test').textContent = this.currentTest || '--';
    }

    cancelBenchmark() {
        this.isRunningBenchmarks = false;
        this.closeBenchmarkModal();
    }

    updateTrend(elementId, value) {
        const element = document.getElementById(elementId);
        // Simplified trend calculation - in real app, compare with historical data
        const trend = Math.random() > 0.5 ? '+' : '-';
        const change = Math.random() * 10;
        element.textContent = `${trend}${change.toFixed(1)}%`;
        element.className = `metric-trend ${trend === '+' ? 'positive' : 'negative'}`;
    }

    updateSystemMetrics() {
        // Update system metrics (simplified for demo)
        document.getElementById('cpu-usage').textContent = `${Math.floor(Math.random() * 30 + 20)}%`;
        document.getElementById('memory-usage').textContent = `${Math.floor(Math.random() * 200 + 100)}MB`;
        document.getElementById('network-usage').textContent = `${Math.floor(Math.random() * 50 + 10)}KB/s`;
        document.getElementById('api-latency').textContent = `${Math.floor(Math.random() * 100 + 50)}ms`;
    }

    loadHistoricalData() {
        const stored = localStorage.getItem('ncs-benchmark-results');
        return stored ? JSON.parse(stored) : [];
    }

    saveResults() {
        localStorage.setItem('ncs-benchmark-results', JSON.stringify(this.benchmarkResults.current));
    }

    exportResults() {
        const data = {
            results: this.benchmarkResults.current,
            summary: this.generateSummary(),
            timestamp: new Date().toISOString(),
            config: this.benchmarkConfig
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `benchmark-results-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    generateSummary() {
        const results = this.benchmarkResults.current.filter(r => !r.error);
        if (results.length === 0) return null;
        
        return {
            totalTests: results.length,
            avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
            avgMemoryUsed: results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length,
            avgAccuracy: results.reduce((sum, r) => sum + r.accuracy, 0) / results.length,
            bestPerforming: results.reduce((best, current) => 
                current.processingTime < best.processingTime ? current : best
            ),
            worstPerforming: results.reduce((worst, current) => 
                current.processingTime > worst.processingTime ? current : worst
            )
        };
    }

    showError(message) {
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.error(message);
        } else {
            alert(message);
        }
    }

    onBenchmarkComplete(data) {
        console.log('Benchmark completed:', data);
        this.updateMetricsDisplay();
        this.updateResultsTable();
        this.saveResults();
    }

    onBenchmarkError(error) {
        console.error('Benchmark error:', error);
        this.showError(`Benchmark failed: ${error.message}`);
        this.isRunningBenchmarks = false;
        this.closeBenchmarkModal();
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.benchmarks = new BenchmarksPage();
    });
} else {
    window.benchmarks = new BenchmarksPage();
}