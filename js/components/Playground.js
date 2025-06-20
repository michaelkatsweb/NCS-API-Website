/**
 * Real Playground Component
 * Integrates with actual NCS-API for real clustering
 */

import NCSApiClient from '../api/ncs-client.js';
import DataProcessor from '../data/processor.js';

export class RealPlayground {
    constructor() {
        // Initialize API client and data processor
        this.apiClient = new NCSApiClient({
            // TODO: Update these URLs to your actual deployed API
            baseURL: 'https://your-ncs-api.herokuapp.com/api/v1', // Change this!
            wsURL: 'wss://your-ncs-api.herokuapp.com/ws',          // Change this!
            apiKey: null // Will be set when user provides it
        });
        
        this.dataProcessor = new DataProcessor();
        
        // State
        this.currentData = null;
        this.currentJob = null;
        this.selectedAlgorithm = 'kmeans';
        this.algorithmParameters = {};
        this.isProcessing = false;
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize the real playground
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Real NCS-API Playground...');
            
            // Test API connection
            await this.testApiConnection();
            
            // Load available algorithms
            await this.loadAlgorithms();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Initialize UI
            this.initializeUI();
            
            console.log('✅ Real Playground initialized successfully');
            
        } catch (error) {
            console.warn('⚠️ API connection failed, falling back to simulation mode:', error);
            this.showMessage('API not available. Running in simulation mode.', 'warning');
            // Continue with simulation mode as fallback
        }
    }

    /**
     * Test API connection
     */
    async testApiConnection() {
        try {
            const health = await this.apiClient.healthCheck();
            console.log('✅ API Connection successful:', health);
            this.updateApiStatus('online');
            return true;
        } catch (error) {
            console.warn('❌ API Connection failed:', error);
            this.updateApiStatus('offline');
            throw error;
        }
    }

    /**
     * Load available algorithms from API
     */
    async loadAlgorithms() {
        try {
            const algorithms = await this.apiClient.getAlgorithms();
            console.log('📋 Algorithms loaded:', algorithms);
            
            // Update algorithm selection UI if needed
            this.updateAlgorithmUI(algorithms);
            
        } catch (error) {
            console.warn('Failed to load algorithms:', error);
            // Use default algorithms
        }
    }

    /**
     * Setup event handlers for real API integration
     */
    setupEventHandlers() {
        // File upload handler
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('data-upload');
        
        if (fileInput && uploadArea) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleRealFileUpload(e.target.files[0]);
                }
            });
            
            // Drag and drop
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleRealFileUpload(e.dataTransfer.files[0]);
                }
            });
        }
        
        // Sample data handler
        const sampleSelect = document.getElementById('sample-dataset');
        if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadRealSampleData(e.target.value);
                }
            });
        }
        
        // Algorithm selection
        const algorithmInputs = document.querySelectorAll('input[name="algorithm"]');
        algorithmInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.selectedAlgorithm = e.target.value;
                this.updateParameterPanel(e.target.value);
            });
        });
        
        // Parameter inputs
        document.querySelectorAll('[data-param]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateParameter(e.target.dataset.param, e.target.value);
            });
        });
        
        // Clustering button
        const clusterButton = document.getElementById('start-clustering');
        if (clusterButton) {
            clusterButton.addEventListener('click', () => {
                this.startRealClustering();
            });
        }
    }

    /**
     * Handle real file upload with processing
     */
    async handleRealFileUpload(file) {
        try {
            console.log('📁 Processing real file upload:', file.name);
            
            // Show processing state
            this.showMessage('Processing file...', 'info');
            this.updateUploadState('processing');
            
            // Process file with real data processor
            const result = await this.dataProcessor.processFile(file);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Validate data with API
            const validation = await this.apiClient.validateData(result.data);
            
            if (!validation.valid) {
                throw new Error('Data validation failed: ' + validation.errors.join(', '));
            }
            
            // Store processed data
            this.currentData = {
                raw: result.data,
                metadata: result.metadata,
                validation: validation
            };
            
            // Update UI
            this.updateDataPreview(result);
            this.showMessage(`File "${file.name}" processed successfully! ${result.metadata.rows} rows, ${result.metadata.columns.length} columns.`, 'success');
            this.enableClustering();
            
            console.log('✅ File processed successfully:', result.metadata);
            
        } catch (error) {
            console.error('❌ File processing failed:', error);
            this.showMessage(`File processing failed: ${error.message}`, 'error');
            this.updateUploadState('error');
        }
    }

    /**
     * Load real sample data from API
     */
    async loadRealSampleData(datasetName) {
        try {
            console.log(`📊 Loading real sample dataset: ${datasetName}`);
            
            this.showMessage(`Loading ${datasetName} dataset...`, 'info');
            
            // Load from API
            const data = await this.apiClient.loadSampleDataset(datasetName);
            
            // Validate data
            const validation = await this.apiClient.validateData(data);
            
            if (!validation.valid) {
                throw new Error('Sample data validation failed: ' + validation.errors.join(', '));
            }
            
            // Store data
            this.currentData = {
                raw: data,
                metadata: {
                    filename: `${datasetName}_sample.json`,
                    rows: data.length,
                    columns: Object.keys(data[0] || {}),
                    source: 'sample'
                },
                validation: validation
            };
            
            // Update UI
            this.updateDataPreview({
                data: data,
                metadata: this.currentData.metadata
            });
            
            this.showMessage(`${datasetName} dataset loaded successfully! ${data.length} rows.`, 'success');
            this.enableClustering();
            
        } catch (error) {
            console.error('❌ Sample data loading failed:', error);
            this.showMessage(`Failed to load sample data: ${error.message}`, 'error');
        }
    }

    /**
     * Start real clustering with API
     */
    async startRealClustering() {
        if (!this.currentData) {
            this.showMessage('Please upload data first', 'error');
            return;
        }
        
        if (this.isProcessing) {
            this.showMessage('Clustering already in progress', 'warning');
            return;
        }
        
        try {
            console.log('🚀 Starting real clustering...');
            
            this.isProcessing = true;
            this.updateClusteringState('starting');
            
            // Prepare data for clustering
            const clusteringData = this.dataProcessor.prepareForClustering(
                this.currentData.raw,
                this.getSelectedColumns()
            );
            
            // Start clustering job
            const job = await this.apiClient.startClustering(
                clusteringData.data,
                this.selectedAlgorithm,
                this.algorithmParameters
            );
            
            this.currentJob = job;
            console.log('✅ Clustering job started:', job);
            
            // Subscribe to real-time updates
            await this.subscribeToJobUpdates(job.jobId);
            
            // Poll for results if WebSocket fails
            this.pollForResults(job.jobId);
            
        } catch (error) {
            console.error('❌ Clustering failed:', error);
            this.showMessage(`Clustering failed: ${error.message}`, 'error');
            this.isProcessing = false;
            this.updateClusteringState('error');
        }
    }

    /**
     * Subscribe to real-time job updates
     */
    async subscribeToJobUpdates(jobId) {
        try {
            await this.apiClient.subscribeToJob(jobId, {
                progress: (data) => {
                    console.log('📊 Clustering progress:', data);
                    this.updateProgress(data.progress, data.status);
                },
                
                complete: (data) => {
                    console.log('✅ Clustering complete:', data);
                    this.handleClusteringComplete(data);
                },
                
                error: (data) => {
                    console.error('❌ Clustering error:', data);
                    this.handleClusteringError(data);
                },
                
                metrics: (data) => {
                    console.log('📈 Metrics update:', data);
                    this.updateMetrics(data);
                }
            });
            
            console.log('📡 Subscribed to real-time updates');
            
        } catch (error) {
            console.warn('⚠️ Real-time updates failed, using polling:', error);
        }
    }

    /**
     * Poll for clustering results (fallback)
     */
    async pollForResults(jobId) {
        const maxAttempts = 60; // 5 minutes at 5-second intervals
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                
                const status = await this.apiClient.getClusteringStatus(jobId);
                console.log(`📊 Polling attempt ${attempts}: ${status.status}`);
                
                if (status.status === 'completed') {
                    const results = await this.apiClient.getClusteringResults(jobId);
                    this.handleClusteringComplete(results);
                    return;
                }
                
                if (status.status === 'failed') {
                    this.handleClusteringError({ error: status.error || 'Clustering failed' });
                    return;
                }
                
                if (status.status === 'running' && status.progress) {
                    this.updateProgress(status.progress, status.status);
                }
                
                // Continue polling
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Poll every 5 seconds
                } else {
                    throw new Error('Clustering timeout');
                }
                
            } catch (error) {
                console.error('Polling error:', error);
                this.handleClusteringError({ error: error.message });
            }
        };
        
        // Start polling after a short delay
        setTimeout(poll, 2000);
    }

    /**
     * Handle clustering completion
     */
    async handleClusteringComplete(results) {
        try {
            console.log('🎉 Clustering completed successfully:', results);
            
            this.isProcessing = false;
            this.updateClusteringState('complete');
            
            // Calculate quality metrics
            const metrics = await this.apiClient.calculateQualityMetrics(
                this.currentData.raw,
                results.clusters
            );
            
            // Update UI with results
            this.displayResults(results, metrics);
            this.showMessage('Clustering completed successfully!', 'success');
            
        } catch (error) {
            console.error('Error handling clustering completion:', error);
            this.showMessage('Clustering completed but failed to load results', 'warning');
        }
    }

    /**
     * Handle clustering error
     */
    handleClusteringError(error) {
        console.error('❌ Clustering error:', error);
        
        this.isProcessing = false;
        this.updateClusteringState('error');
        this.showMessage(`Clustering failed: ${error.error}`, 'error');
    }

    /**
     * Update clustering progress
     */
    updateProgress(progress, status) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const progressContainer = document.getElementById('clustering-progress');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress)}%`;
        }
        
        // Update status
        this.updateClusteringState('running', status);
    }

    /**
     * Display clustering results
     */
    displayResults(results, metrics) {
        // Update metrics display
        if (metrics) {
            this.updateMetricsDisplay(metrics);
        }
        
        // Update performance metrics
        const performanceData = {
            'processing-time': results.processingTime || 'N/A',
            'data-points': this.currentData.metadata.rows,
            'clusters-found': results.clusterCount || results.clusters?.length || 'N/A'
        };
        
        Object.entries(performanceData).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.className = 'metric-value success';
            }
        });
        
        // Visualize results (you can enhance this)
        this.visualizeResults(results);
        
        // Enable export
        this.enableExport(results);
    }

    /**
     * Update metrics display
     */
    updateMetricsDisplay(metrics) {
        const metricMappings = {
            'silhouette-score': metrics.silhouetteScore,
            'inertia': metrics.inertia,
            'davies-bouldin': metrics.daviesBouldinIndex
        };
        
        Object.entries(metricMappings).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== undefined) {
                element.textContent = typeof value === 'number' ? value.toFixed(3) : value;
                element.className = 'metric-value success';
            }
        });
    }

    /**
     * Visualize clustering results
     */
    visualizeResults(results) {
        const vizOverlay = document.getElementById('viz-overlay');
        if (vizOverlay) {
            vizOverlay.innerHTML = `
                <div class="visualization-placeholder">
                    <div class="placeholder-icon">✅</div>
                    <h3>Clustering Complete!</h3>
                    <p>Found ${results.clusterCount || results.clusters?.length || 'N/A'} clusters</p>
                    <p>Quality Score: ${results.qualityScore || 'N/A'}</p>
                </div>
            `;
        }
        
        // TODO: Add real visualization using Canvas/WebGL
        // This is where you'd integrate with D3.js, Three.js, or custom canvas rendering
    }

    /**
     * Utility methods
     */
    updateApiStatus(status) {
        const statusElement = document.getElementById('api-status');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const text = statusElement.querySelector('.status-text');
            
            if (indicator) {
                indicator.className = `status-indicator status-${status}`;
            }
            
            if (text) {
                text.textContent = status === 'online' ? 'API Online' : 'API Offline';
            }
        }
    }

    updateClusteringState(state, message = null) {
        const statusElement = document.getElementById('clustering-status');
        if (statusElement) {
            const statusClass = {
                'starting': 'running',
                'running': 'running', 
                'complete': 'complete',
                'error': 'error'
            }[state] || 'idle';
            
            const statusText = message || {
                'starting': 'Starting...',
                'running': 'Processing...',
                'complete': 'Complete',
                'error': 'Error'
            }[state] || 'Ready';
            
            statusElement.className = `status-indicator ${statusClass}`;
            statusElement.innerHTML = `<span class="status-dot${state === 'running' ? ' pulse' : ''}"></span><span>${statusText}</span>`;
        }
    }

    updateDataPreview(result) {
        const vizOverlay = document.getElementById('viz-overlay');
        if (vizOverlay) {
            vizOverlay.innerHTML = `
                <div class="visualization-placeholder">
                    <div class="placeholder-icon">📊</div>
                    <h3>Data Loaded: ${result.metadata.filename}</h3>
                    <p>${result.metadata.rows} rows, ${result.metadata.columns?.length || 0} columns</p>
                    <p>Ready for clustering</p>
                </div>
            `;
        }
    }

    enableClustering() {
        const clusterButton = document.getElementById('start-clustering');
        if (clusterButton) {
            clusterButton.disabled = false;
            clusterButton.textContent = 'Start Clustering';
        }
    }

    enableExport(results) {
        // Enable export buttons and add functionality
        const downloadBtn = document.getElementById('download-data');
        const exportBtn = document.getElementById('export-results');
        
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => this.exportData(results);
        }
        
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.onclick = () => this.exportResults(results);
        }
    }

    exportData(results) {
        // Export clustering results as CSV
        const csv = this.convertToCSV(results);
        this.downloadFile(csv, 'clustering_results.csv', 'text/csv');
    }

    exportResults(results) {
        // Export full results as JSON
        const json = JSON.stringify(results, null, 2);
        this.downloadFile(json, 'clustering_results.json', 'application/json');
    }

    convertToCSV(data) {
        // Simple CSV conversion
        if (!data || !Array.isArray(data)) return '';
        
        const headers = Object.keys(data[0] || {});
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => row[header] || '');
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    getSelectedColumns() {
        // For now, return all numeric columns
        // TODO: Add UI for column selection
        if (!this.currentData?.metadata?.columns) return null;
        
        return this.currentData.metadata.columns.filter(col => 
            this.currentData.metadata.numericColumns?.includes(col)
        );
    }

    updateParameter(param, value) {
        this.algorithmParameters[param] = parseFloat(value) || value;
        
        // Update parameter display
        const label = document.getElementById(`${param}-value`);
        if (label) {
            label.textContent = value;
        }
    }

    updateParameterPanel(algorithm) {
        // Hide all parameter panels
        document.querySelectorAll('[id$="-params"]').forEach(panel => {
            panel.style.display = 'none';
        });
        
        // Show selected algorithm parameters
        const panel = document.getElementById(`${algorithm}-params`);
        if (panel) {
            panel.style.display = 'block';
        }
    }

    updateAlgorithmUI(algorithms) {
        // Update algorithm selection UI with API-provided algorithms
        console.log('Updating algorithm UI with:', algorithms);
        // TODO: Dynamically update algorithm options
    }

    initializeUI() {
        // Initialize parameter displays
        document.querySelectorAll('[data-param]').forEach(input => {
            this.updateParameter(input.dataset.param, input.value);
        });
    }

    updateUploadState(state) {
        const uploadArea = document.getElementById('data-upload');
        if (uploadArea) {
            uploadArea.className = `data-upload ${state}`;
        }
    }

    showMessage(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

export default RealPlayground;