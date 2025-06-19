/**
 * NCS-API Website - Interactive Playground Component
 * Handles the main clustering playground functionality
 * 
 * Features:
 * - File upload and data management
 * - Real-time clustering visualization
 * - Parameter controls integration
 * - Results display and export
 */

import { EventBus } from '../core/eventBus.js';
import { APIClient } from '../api/client.js';
import { ClusterVisualizer } from './ClusterVisualizer.js';
import { DataUploader } from './DataUploader.js';
import { ParameterControls } from './ParameterControls.js';
import { ResultsPanel } from './ResultsPanel.js';
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';

export class Playground {
    constructor(container) {
        this.container = container;
        this.apiClient = new APIClient();
        this.eventBus = EventBus.getInstance();
        this.state = {
            currentData: null,
            clusteringResults: null,
            isProcessing: false,
            selectedAlgorithm: 'ncs',
            parameters: {
                clusters: 3,
                iterations: 100,
                tolerance: 0.001,
                initialization: 'k-means++',
                realTime: false
            }
        };
        
        this.components = {};
        this.init();
    }

    /**
     * Initialize the playground
     */
    init() {
        this.createLayout();
        this.initializeComponents();
        this.bindEvents();
        this.setupEventListeners();
        
        console.log('🎮 Playground initialized');
    }

    /**
     * Create the main playground layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="playground-container">
                <!-- Header Controls -->
                <div class="playground-header">
                    <div class="playground-title">
                        <h1>Interactive Clustering Playground</h1>
                        <p>Upload your data or use sample datasets to explore clustering algorithms in real-time</p>
                    </div>
                    
                    <div class="playground-actions">
                        <button class="btn btn-outline" id="sample-data-btn">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Load Sample Data
                        </button>
                        
                        <button class="btn btn-primary" id="new-experiment-btn">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M12 2v20M2 12h20"/>
                            </svg>
                            New Experiment
                        </button>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="playground-grid">
                    <!-- Left Panel: Data & Controls -->
                    <div class="playground-sidebar">
                        <!-- Data Upload Section -->
                        <div class="playground-section">
                            <div class="section-header">
                                <h3>📊 Data Input</h3>
                                <span class="section-status" id="data-status">No data loaded</span>
                            </div>
                            <div id="data-uploader-container"></div>
                        </div>

                        <!-- Algorithm Parameters -->
                        <div class="playground-section">
                            <div class="section-header">
                                <h3>⚙️ Algorithm Parameters</h3>
                                <span class="section-status" id="params-status">Default settings</span>
                            </div>
                            <div id="parameter-controls-container"></div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="playground-section">
                            <div class="section-header">
                                <h3>🚀 Quick Actions</h3>
                            </div>
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-block" id="run-clustering-btn" disabled>
                                    <svg class="icon" viewBox="0 0 24 24">
                                        <polygon points="5,3 19,12 5,21"/>
                                    </svg>
                                    Run Clustering
                                </button>
                                
                                <button class="btn btn-outline btn-block" id="reset-btn">
                                    <svg class="icon" viewBox="0 0 24 24">
                                        <path d="M3 12a9 9 0 009-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                                        <path d="M3 3v5h5"/>
                                    </svg>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Center Panel: Visualization -->
                    <div class="playground-main">
                        <div class="visualization-container">
                            <div class="viz-header">
                                <h3>📈 Cluster Visualization</h3>
                                <div class="viz-controls">
                                    <div class="view-toggle">
                                        <button class="toggle-btn active" data-view="2d">2D</button>
                                        <button class="toggle-btn" data-view="3d">3D</button>
                                    </div>
                                    
                                    <div class="viz-options">
                                        <button class="btn btn-sm" id="export-viz-btn" title="Export visualization">
                                            <svg class="icon" viewBox="0 0 24 24">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5 5 5M12 15V5"/>
                                            </svg>
                                        </button>
                                        
                                        <button class="btn btn-sm" id="fullscreen-btn" title="Fullscreen">
                                            <svg class="icon" viewBox="0 0 24 24">
                                                <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="cluster-visualizer-container" class="viz-content">
                                <div class="viz-placeholder">
                                    <svg class="placeholder-icon" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12l2 2 4-4"/>
                                    </svg>
                                    <h4>Ready for Data</h4>
                                    <p>Upload a dataset or load sample data to begin clustering</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Panel: Results -->
                    <div class="playground-results">
                        <div class="results-container">
                            <div class="results-header">
                                <h3>📋 Results & Metrics</h3>
                                <div class="results-actions">
                                    <button class="btn btn-sm" id="download-results-btn" disabled title="Download results">
                                        <svg class="icon" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div id="results-panel-container"></div>
                        </div>
                    </div>
                </div>

                <!-- Processing Overlay -->
                <div class="processing-overlay" id="processing-overlay" style="display: none;">
                    <div class="processing-content">
                        <div class="processing-spinner"></div>
                        <h3>Processing Data</h3>
                        <p id="processing-message">Initializing clustering algorithm...</p>
                        <div class="progress-bar">
                            <div class="progress-fill" id="processing-progress"></div>
                        </div>
                        <button class="btn btn-outline" id="cancel-processing-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize all child components
     */
    initializeComponents() {
        // Data Uploader
        this.components.dataUploader = new DataUploader(
            document.getElementById('data-uploader-container')
        );

        // Parameter Controls
        this.components.parameterControls = new ParameterControls(
            document.getElementById('parameter-controls-container')
        );

        // Cluster Visualizer
        this.components.clusterVisualizer = new ClusterVisualizer(
            document.getElementById('cluster-visualizer-container')
        );

        // Results Panel
        this.components.resultsPanel = new ResultsPanel(
            document.getElementById('results-panel-container')
        );
    }

    /**
     * Bind UI event handlers
     */
    bindEvents() {
        // Sample Data Button
        document.getElementById('sample-data-btn').addEventListener('click', () => {
            this.showSampleDataModal();
        });

        // New Experiment Button
        document.getElementById('new-experiment-btn').addEventListener('click', () => {
            this.resetExperiment();
        });

        // Run Clustering Button
        document.getElementById('run-clustering-btn').addEventListener('click', () => {
            this.runClustering();
        });

        // Reset Button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetExperiment();
        });

        // View Toggle Buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.switchVisualizationMode(e.target.dataset.view);
            });
        });

        // Export Visualization
        document.getElementById('export-viz-btn').addEventListener('click', () => {
            this.exportVisualization();
        });

        // Fullscreen Toggle
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Download Results
        document.getElementById('download-results-btn').addEventListener('click', () => {
            this.downloadResults();
        });

        // Cancel Processing
        document.getElementById('cancel-processing-btn').addEventListener('click', () => {
            this.cancelProcessing();
        });
    }

    /**
     * Setup event bus listeners
     */
    setupEventListeners() {
        // Data loaded event
        this.eventBus.on('data:loaded', (data) => {
            this.handleDataLoaded(data);
        });

        // Parameters changed event
        this.eventBus.on('parameters:changed', (params) => {
            this.handleParametersChanged(params);
        });

        // Clustering completed event
        this.eventBus.on('clustering:completed', (results) => {
            this.handleClusteringCompleted(results);
        });

        // Clustering error event
        this.eventBus.on('clustering:error', (error) => {
            this.handleClusteringError(error);
        });

        // Real-time clustering updates
        this.eventBus.on('clustering:progress', (progress) => {
            this.handleClusteringProgress(progress);
        });
    }

    /**
     * Handle data loaded
     */
    handleDataLoaded(data) {
        this.state.currentData = data;
        
        // Update UI status
        document.getElementById('data-status').textContent = 
            `${data.rows} rows, ${data.columns} columns`;
        
        // Enable clustering button
        document.getElementById('run-clustering-btn').disabled = false;
        
        // Update visualization with raw data
        this.components.clusterVisualizer.setData(data);
        
        console.log('📊 Data loaded:', data);
    }

    /**
     * Handle parameter changes
     */
    handleParametersChanged(params) {
        this.state.parameters = { ...this.state.parameters, ...params };
        
        // Update status
        document.getElementById('params-status').textContent = 
            `${this.state.selectedAlgorithm.toUpperCase()} (${params.clusters || this.state.parameters.clusters} clusters)`;
        
        console.log('⚙️ Parameters updated:', this.state.parameters);
    }

    /**
     * Run clustering algorithm
     */
    async runClustering() {
        if (!this.state.currentData) {
            Toast.show('Please load data first', 'warning');
            return;
        }

        this.state.isProcessing = true;
        this.showProcessingOverlay();

        try {
            const request = {
                data: this.state.currentData,
                algorithm: this.state.selectedAlgorithm,
                parameters: this.state.parameters
            };

            // Send clustering request to API
            const results = await this.apiClient.cluster(request);
            
            this.handleClusteringCompleted(results);
            
        } catch (error) {
            this.handleClusteringError(error);
        } finally {
            this.state.isProcessing = false;
            this.hideProcessingOverlay();
        }
    }

    /**
     * Handle clustering completion
     */
    handleClusteringCompleted(results) {
        this.state.clusteringResults = results;
        
        // Update visualization
        this.components.clusterVisualizer.setClusters(results);
        
        // Update results panel
        this.components.resultsPanel.setResults(results);
        
        // Enable download button
        document.getElementById('download-results-btn').disabled = false;
        
        Toast.show('Clustering completed successfully!', 'success');
        
        console.log('✅ Clustering completed:', results);
    }

    /**
     * Handle clustering error
     */
    handleClusteringError(error) {
        console.error('❌ Clustering error:', error);
        Toast.show(`Clustering failed: ${error.message}`, 'error');
    }

    /**
     * Handle clustering progress updates
     */
    handleClusteringProgress(progress) {
        const progressBar = document.getElementById('processing-progress');
        const message = document.getElementById('processing-message');
        
        progressBar.style.width = `${progress.percentage}%`;
        message.textContent = progress.message || 'Processing...';
    }

    /**
     * Show sample data selection modal
     */
    showSampleDataModal() {
        const modal = new Modal({
            title: 'Select Sample Dataset',
            content: `
                <div class="sample-data-grid">
                    <div class="sample-item" data-dataset="iris">
                        <h4>🌸 Iris Dataset</h4>
                        <p>Classic flower classification dataset with 150 samples and 4 features</p>
                        <span class="sample-meta">150 rows × 4 columns</span>
                    </div>
                    
                    <div class="sample-item" data-dataset="customers">
                        <h4>👥 Customer Segmentation</h4>
                        <p>E-commerce customer data for segmentation analysis</p>
                        <span class="sample-meta">1000 rows × 8 columns</span>
                    </div>
                    
                    <div class="sample-item" data-dataset="financial">
                        <h4>💰 Financial Data</h4>
                        <p>Stock market and financial indicators clustering</p>
                        <span class="sample-meta">500 rows × 12 columns</span>
                    </div>
                </div>
            `,
            onConfirm: () => {
                const selected = document.querySelector('.sample-item.selected');
                if (selected) {
                    this.loadSampleData(selected.dataset.dataset);
                }
                return true;
            }
        });
        
        // Handle sample selection
        modal.container.addEventListener('click', (e) => {
            const item = e.target.closest('.sample-item');
            if (item) {
                modal.container.querySelectorAll('.sample-item').forEach(i => 
                    i.classList.remove('selected'));
                item.classList.add('selected');
            }
        });
        
        modal.show();
    }

    /**
     * Load sample dataset
     */
    async loadSampleData(datasetName) {
        try {
            const data = await this.apiClient.getSampleData(datasetName);
            this.eventBus.emit('data:loaded', data);
            Toast.show(`${datasetName} dataset loaded successfully`, 'success');
        } catch (error) {
            console.error('Error loading sample data:', error);
            Toast.show('Failed to load sample data', 'error');
        }
    }

    /**
     * Reset experiment
     */
    resetExperiment() {
        this.state.currentData = null;
        this.state.clusteringResults = null;
        
        // Reset UI
        document.getElementById('data-status').textContent = 'No data loaded';
        document.getElementById('params-status').textContent = 'Default settings';
        document.getElementById('run-clustering-btn').disabled = true;
        document.getElementById('download-results-btn').disabled = true;
        
        // Reset components
        this.components.clusterVisualizer.clear();
        this.components.resultsPanel.clear();
        
        Toast.show('Experiment reset', 'info');
    }

    /**
     * Switch visualization mode (2D/3D)
     */
    switchVisualizationMode(mode) {
        this.components.clusterVisualizer.setViewMode(mode);
    }

    /**
     * Export visualization
     */
    exportVisualization() {
        this.components.clusterVisualizer.exportImage();
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const vizContainer = document.querySelector('.visualization-container');
        vizContainer.classList.toggle('fullscreen');
    }

    /**
     * Download clustering results
     */
    downloadResults() {
        if (!this.state.clusteringResults) return;
        
        const data = JSON.stringify(this.state.clusteringResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `clustering-results-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Show processing overlay
     */
    showProcessingOverlay() {
        document.getElementById('processing-overlay').style.display = 'flex';
    }

    /**
     * Hide processing overlay
     */
    hideProcessingOverlay() {
        document.getElementById('processing-overlay').style.display = 'none';
    }

    /**
     * Cancel current processing
     */
    cancelProcessing() {
        this.apiClient.cancelCurrentRequest();
        this.state.isProcessing = false;
        this.hideProcessingOverlay();
        Toast.show('Processing cancelled', 'info');
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Remove event listeners
        this.eventBus.off('data:loaded');
        this.eventBus.off('parameters:changed');
        this.eventBus.off('clustering:completed');
        this.eventBus.off('clustering:error');
        this.eventBus.off('clustering:progress');
        
        // Cleanup child components
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        console.log('🎮 Playground destroyed');
    }
}