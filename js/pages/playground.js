// File: playground.js
// Path: js/pages/playground.js
// Interactive clustering playground functionality for NCS-API-Website
// Handles data upload, algorithm execution, visualization, and results analysis

import { EventBus } from '../core/eventBusNew.js';
import { ClusterVisualizer } from '../components/ClusterVisualizer.js';
import { DataUploader } from '../components/DataUploader.js';
import { ParameterControls } from '../components/ParameterControls.js';
import { ResultsPanel } from '../components/ResultsPanel.js';
import { PerformanceMonitor } from '../components/PerformanceMonitor.js';
import { SelectionManager, SelectionMode, SelectionTool } from '../visualizations/interactions/Selection.js';
import { HoverManager } from '../visualizations/interactions/Hover.js';
import { qualityAssessment } from '../clustering/QualityMetrics.js';
import { transitionManager } from '../visualizations/animations/Transitions.js';

/**
 * Playground controller
 */
class ClusteringPlayground {
    constructor() {
        this.initialized = false;
        this.currentData = null;
        this.currentClusters = null;
        this.currentAlgorithm = 'kmeans';
        this.algorithmParameters = new Map();
        this.qualityMetrics = null;
        this.isProcessing = false;
        
        // Web workers
        this.clusteringWorker = null;
        this.dataWorker = null;
        this.exportWorker = null;
        
        // UI components
        this.components = {
            visualizer: null,
            dataUploader: null,
            parameterControls: null,
            resultsPanel: null,
            performanceMonitor: null
        };
        
        // Interaction managers
        this.selectionManager = null;
        this.hoverManager = null;
        
        // DOM elements
        this.elements = {
            container: null,
            visualizationArea: null,
            controlsPanel: null,
            resultsArea: null,
            statusBar: null,
            loadingOverlay: null
        };
        
        // State management
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 10;
        
        // Performance tracking
        this.performanceData = {
            lastExecutionTime: 0,
            averageExecutionTime: 0,
            totalExecutions: 0,
            qualityHistory: []
        };
        
        // Configuration
        this.config = {
            maxDataPoints: 50000,
            defaultAlgorithm: 'kmeans',
            autoQualityAssessment: true,
            realTimeParameterUpdate: true,
            enableComparison: true,
            defaultVisualizationSettings: {
                pointSize: 4,
                showCentroids: true,
                showConnections: false,
                colorScheme: 'default',
                animateTransitions: true
            }
        };
    }
    
    /**
     * Initialize playground
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🎮 Initializing Clustering Playground...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize web workers
            this.initializeWorkers();
            
            // Initialize UI components
            await this.initializeComponents();
            
            // Setup interaction managers
            this.setupInteractionManagers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load default data if available
            await this.loadDefaultData();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Initialize algorithm parameters
            this.initializeAlgorithmParameters();
            
            this.initialized = true;
            
            EventBus.emit('playground:initialized');
            console.log('✅ Clustering Playground initialized');
            
        } catch (error) {
            console.error('❌ Playground initialization failed:', error);
            this.showError('Failed to initialize playground', error);
            EventBus.emit('playground:error', { error });
        }
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.container = document.querySelector('.playground-container');
        this.elements.visualizationArea = document.querySelector('.visualization-area');
        this.elements.controlsPanel = document.querySelector('.controls-panel');
        this.elements.resultsArea = document.querySelector('.results-area');
        this.elements.statusBar = document.querySelector('.status-bar');
        this.elements.loadingOverlay = document.querySelector('.loading-overlay');
        
        if (!this.elements.container) {
            throw new Error('Playground container not found');
        }
    }
    
    /**
     * Initialize web workers
     */
    initializeWorkers() {
        // Clustering worker
        this.clusteringWorker = new Worker('/js/workers/clustering.worker.js');
        this.clusteringWorker.onmessage = this.handleClusteringWorkerMessage.bind(this);
        this.clusteringWorker.onerror = this.handleWorkerError.bind(this);
        
        // Data processing worker
        this.dataWorker = new Worker('/js/workers/data.worker.js');
        this.dataWorker.onmessage = this.handleDataWorkerMessage.bind(this);
        this.dataWorker.onerror = this.handleWorkerError.bind(this);
        
        // Export worker
        this.exportWorker = new Worker('/js/workers/export.worker.js');
        this.exportWorker.onmessage = this.handleExportWorkerMessage.bind(this);
        this.exportWorker.onerror = this.handleWorkerError.bind(this);
    }
    
    /**
     * Initialize UI components
     */
    async initializeComponents() {
        // Cluster visualizer
        this.components.visualizer = new ClusterVisualizer(this.elements.visualizationArea, {
            ...this.config.defaultVisualizationSettings,
            onPointClick: this.handlePointClick.bind(this),
            onPointHover: this.handlePointHover.bind(this),
            onZoomChange: this.handleZoomChange.bind(this)
        });
        
        // Data uploader
        this.components.dataUploader = new DataUploader(
            document.querySelector('.data-upload-area'),
            {
                onDataLoaded: this.handleDataLoaded.bind(this),
                onDataError: this.handleDataError.bind(this),
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedTypes: ['csv', 'json', 'txt']
            }
        );
        
        // Parameter controls
        this.components.parameterControls = new ParameterControls(
            document.querySelector('.parameter-controls'),
            {
                algorithms: ['kmeans', 'dbscan', 'hierarchical', 'ncs'],
                onAlgorithmChange: this.handleAlgorithmChange.bind(this),
                onParameterChange: this.handleParameterChange.bind(this),
                realTimeUpdate: this.config.realTimeParameterUpdate
            }
        );
        
        // Results panel
        this.components.resultsPanel = new ResultsPanel(
            document.querySelector('.results-panel'),
            {
                onExport: this.handleExport.bind(this),
                onCompare: this.handleCompare.bind(this),
                onSave: this.handleSave.bind(this)
            }
        );
        
        // Performance monitor
        this.components.performanceMonitor = new PerformanceMonitor(
            document.querySelector('.performance-monitor'),
            {
                updateInterval: 1000,
                showQualityMetrics: true,
                showExecutionTime: true
            }
        );
    }
    
    /**
     * Setup interaction managers
     */
    setupInteractionManagers() {
        if (!this.elements.visualizationArea) return;
        
        // Selection manager
        this.selectionManager = new SelectionManager({
            mode: SelectionMode.MULTIPLE,
            tool: SelectionTool.RECTANGLE,
            onSelectionChange: this.handleSelectionChange.bind(this),
            onItemSelect: this.handleItemSelect.bind(this),
            onItemDeselect: this.handleItemDeselect.bind(this)
        });
        
        // Hover manager
        this.hoverManager = new HoverManager(this.elements.visualizationArea, {
            enableTooltips: true,
            hoverThreshold: 10,
            onHoverEnter: this.handleHoverEnter.bind(this),
            onHoverLeave: this.handleHoverLeave.bind(this),
            tooltip: {
                delay: 300,
                followCursor: true
            }
        });
        
        // Add custom tooltip formatter for data points
        this.hoverManager.addTooltipFormatter('datapoint', (item) => {
            const data = item.data;
            const parts = [`<strong>Point ${item.id}</strong>`];
            
            if (data.cluster !== undefined) {
                parts.push(`<strong>Cluster:</strong> ${data.cluster}`);
            }
            
            Object.entries(data).forEach(([key, value]) => {
                if (key !== 'cluster' && typeof value === 'number') {
                    parts.push(`<strong>${key}:</strong> ${value.toFixed(3)}`);
                }
            });
            
            return parts.join('<br>');
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Algorithm execution
        const runButton = document.querySelector('.run-clustering');
        if (runButton) {
            runButton.addEventListener('click', this.runClustering.bind(this));
        }
        
        // Clear results
        const clearButton = document.querySelector('.clear-results');
        if (clearButton) {
            clearButton.addEventListener('click', this.clearResults.bind(this));
        }
        
        // Undo/Redo
        const undoButton = document.querySelector('.undo-button');
        const redoButton = document.querySelector('.redo-button');
        if (undoButton) undoButton.addEventListener('click', this.undo.bind(this));
        if (redoButton) redoButton.addEventListener('click', this.redo.bind(this));
        
        // Sample data buttons
        document.querySelectorAll('.sample-data-button').forEach(button => {
            button.addEventListener('click', this.loadSampleData.bind(this));
        });
        
        // Export buttons
        document.querySelectorAll('.export-button').forEach(button => {
            button.addEventListener('click', this.handleExportClick.bind(this));
        });
        
        // Settings
        const settingsButton = document.querySelector('.settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', this.showSettings.bind(this));
        }
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        
        // EventBus listeners
        EventBus.on('data:processed', this.handleDataProcessed.bind(this));
        EventBus.on('clustering:progress', this.handleClusteringProgress.bind(this));
        EventBus.on('clustering:complete', this.handleClusteringComplete.bind(this));
        EventBus.on('quality:assessed', this.handleQualityAssessed.bind(this));
    }
    
    /**
     * Load default data
     */
    async loadDefaultData() {
        try {
            // Load iris dataset as default
            const response = await fetch('/assets/data/iris.csv');
            const csvText = await response.text();
            
            this.processDataFile(csvText, 'csv', 'iris.csv');
            
        } catch (error) {
            console.warn('Could not load default data:', error);
            // Continue without default data
        }
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only process shortcuts when playground is focused
            if (!this.elements.container.contains(document.activeElement)) return;
            
            // Ctrl/Cmd + R: Run clustering
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                this.runClustering();
            }
            
            // Ctrl/Cmd + Z: Undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                this.undo();
            }
            
            // Ctrl/Cmd + Shift + Z: Redo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
                event.preventDefault();
                this.redo();
            }
            
            // Escape: Clear selection
            if (event.key === 'Escape') {
                if (this.selectionManager) {
                    this.selectionManager.clearSelection();
                }
            }
            
            // Delete: Remove selected points
            if (event.key === 'Delete' || event.key === 'Backspace') {
                this.removeSelectedPoints();
            }
        });
    }
    
    /**
     * Initialize algorithm parameters
     */
    initializeAlgorithmParameters() {
        this.algorithmParameters.set('kmeans', {
            k: 3,
            maxIterations: 100,
            tolerance: 1e-4,
            initMethod: 'kmeans++',
            metric: 'euclidean'
        });
        
        this.algorithmParameters.set('dbscan', {
            eps: 0.5,
            minPts: 5,
            metric: 'euclidean'
        });
        
        this.algorithmParameters.set('hierarchical', {
            numClusters: 3,
            linkage: 'ward',
            metric: 'euclidean'
        });
        
        this.algorithmParameters.set('ncs', {
            numClusters: 'auto',
            qualityThreshold: 0.7,
            maxIterations: 50
        });
    }
    
    /**
     * Handle data loading
     */
    handleDataLoaded(data, filename, fileType) {
        this.showStatus(`Processing ${filename}...`);
        this.processDataFile(data, fileType, filename);
    }
    
    /**
     * Process data file
     */
    processDataFile(data, fileType, filename) {
        const taskId = Date.now().toString();
        
        this.dataWorker.postMessage({
            type: fileType === 'csv' ? 'parse_csv' : 'parse_json',
            data: data,
            options: {
                hasHeader: true,
                skipEmptyLines: true,
                trimWhitespace: true
            },
            taskId
        });
        
        this.showLoading(`Processing ${filename}...`);
    }
    
    /**
     * Handle data worker messages
     */
    handleDataWorkerMessage(event) {
        const { type, result, error, operation } = event.data;
        
        if (type === 'complete') {
            switch (operation) {
                case 'parse_csv':
                case 'parse_json':
                    this.handleDataParsed(result);
                    break;
                case 'preprocess_pipeline':
                    this.handleDataPreprocessed(result);
                    break;
                case 'validate':
                    this.handleDataValidated(result);
                    break;
            }
        } else if (type === 'error') {
            this.handleDataError(error);
        }
    }
    
    /**
     * Handle parsed data
     */
    handleDataParsed(result) {
        const { data, errors, headers } = result;
        
        if (errors && errors.length > 0) {
            console.warn('Data parsing warnings:', errors);
        }
        
        if (!data || data.length === 0) {
            this.showError('No valid data found in file');
            return;
        }
        
        // Validate and preprocess data
        this.validateAndPreprocessData(data);
    }
    
    /**
     * Validate and preprocess data
     */
    validateAndPreprocessData(data) {
        const taskId = Date.now().toString();
        
        // First validate the data
        this.dataWorker.postMessage({
            type: 'validate',
            data: data,
            options: {
                minRows: 2,
                maxRows: this.config.maxDataPoints,
                numericColumns: this.extractNumericColumns(data)
            },
            taskId
        });
    }
    
    /**
     * Extract numeric columns from data
     */
    extractNumericColumns(data) {
        if (data.length === 0) return [];
        
        const firstRow = data[0];
        return Object.keys(firstRow).filter(key => {
            return typeof firstRow[key] === 'number' || 
                   (typeof firstRow[key] === 'string' && !isNaN(parseFloat(firstRow[key])));
        });
    }
    
    /**
     * Handle data validation
     */
    handleDataValidated(validation) {
        if (!validation.isValid) {
            this.showError('Data validation failed', validation.errors.join(', '));
            return;
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                this.showWarning(warning);
            });
        }
        
        // Proceed with preprocessing if data is valid
        this.preprocessData(validation.data || this.currentData);
    }
    
    /**
     * Preprocess data
     */
    preprocessData(data) {
        const numericColumns = this.extractNumericColumns(data);
        
        if (numericColumns.length < 2) {
            this.showError('Data must have at least 2 numeric columns for clustering');
            return;
        }
        
        const taskId = Date.now().toString();
        
        this.dataWorker.postMessage({
            type: 'preprocess_pipeline',
            data: data,
            options: {
                handleMissing: true,
                missingMethod: 'mean',
                removeOutliers: false, // Let user decide
                normalize: true,
                normalizeMethod: 'zscore',
                numericColumns: numericColumns,
                encodeCategorical: true,
                categoricalColumns: Object.keys(data[0] || {}).filter(key => 
                    !numericColumns.includes(key)
                )
            },
            taskId
        });
    }
    
    /**
     * Handle preprocessed data
     */
    handleDataPreprocessed(result) {
        this.currentData = result.data;
        
        // Update visualization
        this.updateVisualization();
        
        // Update selection manager with new data
        this.updateSelectionManager();
        
        // Update UI components
        this.updateComponentsWithData();
        
        // Save state
        this.saveState();
        
        this.hideLoading();
        this.showStatus(`Loaded ${this.currentData.length} data points`);
        
        EventBus.emit('playground:data:loaded', { 
            data: this.currentData,
            count: this.currentData.length
        });
    }
    
    /**
     * Update visualization with current data
     */
    updateVisualization() {
        if (!this.components.visualizer || !this.currentData) return;
        
        this.components.visualizer.setData(this.currentData);
        
        if (this.currentClusters) {
            this.components.visualizer.setClusters(this.currentClusters);
        }
        
        this.components.visualizer.render();
    }
    
    /**
     * Update selection manager with current data
     */
    updateSelectionManager() {
        if (!this.selectionManager || !this.currentData) return;
        
        // Clear existing items
        this.selectionManager.clearItems();
        
        // Add new data points
        this.currentData.forEach((point, index) => {
            this.selectionManager.addItem(
                index,
                point,
                { x: point.x || point[0] || 0, y: point.y || point[1] || 0 },
                { type: 'datapoint' }
            );
        });
    }
    
    /**
     * Update components with current data
     */
    updateComponentsWithData() {
        // Update parameter controls with data-dependent parameters
        if (this.components.parameterControls) {
            this.components.parameterControls.updateDataDependentParameters({
                maxK: Math.min(Math.floor(Math.sqrt(this.currentData.length)), 20),
                suggestedEps: this.calculateSuggestedEps(),
                dataSize: this.currentData.length
            });
        }
        
        // Update results panel
        if (this.components.resultsPanel) {
            this.components.resultsPanel.updateDataInfo({
                pointCount: this.currentData.length,
                dimensions: this.getDataDimensions(),
                hasLabels: this.hasGroundTruthLabels()
            });
        }
    }
    
    /**
     * Calculate suggested DBSCAN eps parameter
     */
    calculateSuggestedEps() {
        if (!this.currentData || this.currentData.length < 2) return 0.5;
        
        // Calculate k-distance (k=4) for eps estimation
        const distances = [];
        const k = 4;
        
        for (let i = 0; i < Math.min(this.currentData.length, 100); i++) {
            const point = this.currentData[i];
            const pointDistances = [];
            
            for (let j = 0; j < this.currentData.length; j++) {
                if (i !== j) {
                    const other = this.currentData[j];
                    const dist = Math.sqrt(
                        Math.pow((point.x || point[0]) - (other.x || other[0]), 2) +
                        Math.pow((point.y || point[1]) - (other.y || other[1]), 2)
                    );
                    pointDistances.push(dist);
                }
            }
            
            pointDistances.sort((a, b) => a - b);
            if (pointDistances.length >= k) {
                distances.push(pointDistances[k - 1]);
            }
        }
        
        distances.sort((a, b) => a - b);
        return distances[Math.floor(distances.length * 0.8)] || 0.5; // 80th percentile
    }
    
    /**
     * Get data dimensions
     */
    getDataDimensions() {
        if (!this.currentData || this.currentData.length === 0) return 0;
        
        const firstPoint = this.currentData[0];
        return Object.keys(firstPoint).filter(key => 
            typeof firstPoint[key] === 'number'
        ).length;
    }
    
    /**
     * Check if data has ground truth labels
     */
    hasGroundTruthLabels() {
        if (!this.currentData || this.currentData.length === 0) return false;
        
        const firstPoint = this.currentData[0];
        return 'label' in firstPoint || 'class' in firstPoint || 'species' in firstPoint;
    }
    
    /**
     * Handle algorithm change
     */
    handleAlgorithmChange(algorithm) {
        this.currentAlgorithm = algorithm;
        
        // Update parameter controls for new algorithm
        if (this.components.parameterControls) {
            this.components.parameterControls.setAlgorithm(algorithm);
        }
        
        EventBus.emit('playground:algorithm:changed', { algorithm });
    }
    
    /**
     * Handle parameter change
     */
    handleParameterChange(parameter, value) {
        if (!this.algorithmParameters.has(this.currentAlgorithm)) {
            this.algorithmParameters.set(this.currentAlgorithm, {});
        }
        
        this.algorithmParameters.get(this.currentAlgorithm)[parameter] = value;
        
        // Real-time update if enabled
        if (this.config.realTimeParameterUpdate && this.currentClusters) {
            this.debounceRunClustering();
        }
        
        EventBus.emit('playground:parameter:changed', { 
            algorithm: this.currentAlgorithm,
            parameter, 
            value 
        });
    }
    
    /**
     * Debounced clustering execution for real-time updates
     */
    debounceRunClustering = this.debounce(() => {
        this.runClustering();
    }, 500);
    
    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Run clustering algorithm
     */
    async runClustering() {
        if (!this.currentData || this.currentData.length === 0) {
            this.showError('No data loaded. Please upload data first.');
            return;
        }
        
        if (this.isProcessing) {
            this.showWarning('Clustering already in progress');
            return;
        }
        
        this.isProcessing = true;
        this.showLoading(`Running ${this.currentAlgorithm} clustering...`);
        
        const startTime = performance.now();
        const taskId = Date.now().toString();
        
        // Get algorithm parameters
        const params = this.algorithmParameters.get(this.currentAlgorithm) || {};
        
        // Send clustering task to worker
        this.clusteringWorker.postMessage({
            type: 'cluster',
            algorithm: this.currentAlgorithm,
            data: this.currentData,
            options: params,
            taskId
        });
        
        // Update performance monitor
        if (this.components.performanceMonitor) {
            this.components.performanceMonitor.startTask(this.currentAlgorithm);
        }
        
        EventBus.emit('playground:clustering:started', {
            algorithm: this.currentAlgorithm,
            parameters: params,
            dataSize: this.currentData.length
        });
    }
    
    /**
     * Handle clustering worker messages
     */
    handleClusteringWorkerMessage(event) {
        const { type, result, error, algorithm, taskId } = event.data;
        
        switch (type) {
            case 'start':
                this.handleClusteringStart(algorithm);
                break;
            case 'progress':
                this.handleClusteringProgress(event.data);
                break;
            case 'complete':
                this.handleClusteringComplete(result, algorithm);
                break;
            case 'error':
                this.handleClusteringError(error, algorithm);
                break;
        }
    }
    
    /**
     * Handle clustering start
     */
    handleClusteringStart(algorithm) {
        this.showStatus(`${algorithm} clustering started...`);
        this.updateRunButton(true);
    }
    
    /**
     * Handle clustering progress
     */
    handleClusteringProgress(data) {
        const { algorithm, iteration, maxIterations, phase } = data;
        const progress = iteration / maxIterations;
        
        this.updateProgress(progress, `${algorithm}: ${phase || 'processing'} (${iteration}/${maxIterations})`);
        
        if (this.components.performanceMonitor) {
            this.components.performanceMonitor.updateProgress(progress);
        }
    }
    
    /**
     * Handle clustering completion
     */
    handleClusteringComplete(result, algorithm) {
        this.isProcessing = false;
        this.currentClusters = result.clusters;
        
        // Update visualization
        this.updateVisualization();
        
        // Assess quality if enabled
        if (this.config.autoQualityAssessment) {
            this.assessClusteringQuality();
        }
        
        // Update results panel
        if (this.components.resultsPanel) {
            this.components.resultsPanel.updateResults({
                algorithm,
                clusters: this.currentClusters,
                executionTime: result.executionTime,
                iterations: result.iterations,
                converged: result.converged
            });
        }
        
        // Update performance tracking
        this.updatePerformanceTracking(result);
        
        // Save state
        this.saveState();
        
        this.hideLoading();
        this.updateRunButton(false);
        this.showStatus(`${algorithm} clustering completed: ${this.currentClusters.length} clusters found`);
        
        EventBus.emit('playground:clustering:completed', {
            algorithm,
            result,
            clusters: this.currentClusters
        });
    }
    
    /**
     * Handle clustering error
     */
    handleClusteringError(error, algorithm) {
        this.isProcessing = false;
        this.hideLoading();
        this.updateRunButton(false);
        this.showError(`${algorithm} clustering failed: ${error.message}`);
        
        EventBus.emit('playground:clustering:error', { algorithm, error });
    }
    
    /**
     * Assess clustering quality
     */
    assessClusteringQuality() {
        if (!this.currentData || !this.currentClusters) return;
        
        try {
            const groundTruthLabels = this.extractGroundTruthLabels();
            
            this.qualityMetrics = qualityAssessment.evaluateQuality(
                this.currentData,
                this.currentClusters,
                groundTruthLabels
            );
            
            // Update results panel with quality metrics
            if (this.components.resultsPanel) {
                this.components.resultsPanel.updateQualityMetrics(this.qualityMetrics);
            }
            
            // Update performance monitor
            if (this.components.performanceMonitor) {
                this.components.performanceMonitor.updateQualityMetrics(this.qualityMetrics);
            }
            
            EventBus.emit('playground:quality:assessed', {
                metrics: this.qualityMetrics
            });
            
        } catch (error) {
            console.warn('Quality assessment failed:', error);
        }
    }
    
    /**
     * Extract ground truth labels if available
     */
    extractGroundTruthLabels() {
        if (!this.currentData || this.currentData.length === 0) return null;
        
        const labelFields = ['label', 'class', 'species', 'category'];
        const firstPoint = this.currentData[0];
        
        const labelField = labelFields.find(field => field in firstPoint);
        if (!labelField) return null;
        
        return this.currentData.map(point => point[labelField]);
    }
    
    /**
     * Update performance tracking
     */
    updatePerformanceTracking(result) {
        const executionTime = result.executionTime || 0;
        
        this.performanceData.lastExecutionTime = executionTime;
        this.performanceData.totalExecutions++;
        
        // Update average execution time
        if (this.performanceData.totalExecutions === 1) {
            this.performanceData.averageExecutionTime = executionTime;
        } else {
            this.performanceData.averageExecutionTime = 
                (this.performanceData.averageExecutionTime * (this.performanceData.totalExecutions - 1) + executionTime) / 
                this.performanceData.totalExecutions;
        }
        
        // Track quality history
        if (this.qualityMetrics && this.qualityMetrics.summary) {
            this.performanceData.qualityHistory.push({
                timestamp: Date.now(),
                algorithm: this.currentAlgorithm,
                score: this.qualityMetrics.summary.overallScore,
                clusters: this.currentClusters.length
            });
            
            // Keep only last 50 entries
            if (this.performanceData.qualityHistory.length > 50) {
                this.performanceData.qualityHistory = this.performanceData.qualityHistory.slice(-50);
            }
        }
    }
    
    /**
     * Handle data errors
     */
    handleDataError(error) {
        this.hideLoading();
        this.showError('Data processing failed', error.message || error);
    }
    
    /**
     * Handle point interactions
     */
    handlePointClick(point, index, event) {
        if (event.ctrlKey || event.metaKey) {
            // Add to selection
            this.selectionManager?.toggleItem(index);
        } else {
            // Single selection
            this.selectionManager?.clearSelection();
            this.selectionManager?.selectItem(index);
        }
    }
    
    handlePointHover(point, index) {
        // Hover feedback is handled by hover manager
        EventBus.emit('playground:point:hover', { point, index });
    }
    
    /**
     * Handle selection changes
     */
    handleSelectionChange(selectedItems) {
        const count = selectedItems.length;
        
        if (count > 0) {
            this.showStatus(`${count} point${count === 1 ? '' : 's'} selected`);
            
            // Update results panel with selection info
            if (this.components.resultsPanel) {
                this.components.resultsPanel.updateSelection(selectedItems);
            }
        } else {
            this.showStatus('Ready');
        }
        
        EventBus.emit('playground:selection:changed', { 
            selectedItems, 
            count 
        });
    }
    
    /**
     * Load sample data
     */
    async loadSampleData(event) {
        const button = event.currentTarget;
        const datasetName = button.dataset.dataset;
        
        if (!datasetName) return;
        
        try {
            this.showLoading(`Loading ${datasetName} dataset...`);
            
            const response = await fetch(`/assets/data/${datasetName}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to load ${datasetName} dataset`);
            }
            
            const csvText = await response.text();
            this.processDataFile(csvText, 'csv', `${datasetName}.csv`);
            
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to load sample data: ${error.message}`);
        }
    }
    
    /**
     * Handle export operations
     */
    handleExportClick(event) {
        const button = event.currentTarget;
        const format = button.dataset.format;
        
        if (!this.currentData) {
            this.showError('No data to export');
            return;
        }
        
        this.exportData(format);
    }
    
    /**
     * Export data in specified format
     */
    exportData(format) {
        const taskId = Date.now().toString();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        const exportOptions = {
            filename: `clustering_results_${timestamp}.${format}`,
            clusters: this.currentClusters,
            algorithm: this.currentAlgorithm,
            qualityMetrics: this.qualityMetrics,
            algorithmParams: this.algorithmParameters.get(this.currentAlgorithm)
        };
        
        switch (format) {
            case 'csv':
                this.exportWorker.postMessage({
                    type: 'export_clustering_csv',
                    data: this.currentData,
                    options: exportOptions,
                    taskId
                });
                break;
                
            case 'json':
                this.exportWorker.postMessage({
                    type: 'export_clustering_json',
                    data: this.currentData,
                    options: exportOptions,
                    taskId
                });
                break;
                
            case 'svg':
                this.exportWorker.postMessage({
                    type: 'export_svg',
                    data: this.currentData,
                    options: exportOptions,
                    taskId
                });
                break;
                
            case 'html':
                this.exportWorker.postMessage({
                    type: 'generate_html_report',
                    data: this.currentData,
                    options: exportOptions,
                    taskId
                });
                break;
        }
        
        this.showStatus(`Exporting ${format.toUpperCase()}...`);
    }
    
    /**
     * Handle export worker messages
     */
    handleExportWorkerMessage(event) {
        const { type, result, error, operation } = event.data;
        
        if (type === 'complete') {
            this.downloadFile(result.content, result.filename, result.mimeType);
            this.showStatus(`Export completed: ${result.filename}`);
        } else if (type === 'error') {
            this.showError(`Export failed: ${error.message}`);
        }
    }
    
    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * State management
     */
    saveState() {
        const state = {
            timestamp: Date.now(),
            data: this.currentData,
            clusters: this.currentClusters,
            algorithm: this.currentAlgorithm,
            parameters: Object.fromEntries(this.algorithmParameters),
            qualityMetrics: this.qualityMetrics
        };
        
        // Add to history
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
        
        this.historyIndex = this.history.length - 1;
        this.updateUndoRedoButtons();
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    /**
     * Restore state
     */
    restoreState(state) {
        this.currentData = state.data;
        this.currentClusters = state.clusters;
        this.currentAlgorithm = state.algorithm;
        this.algorithmParameters = new Map(Object.entries(state.parameters));
        this.qualityMetrics = state.qualityMetrics;
        
        // Update UI
        this.updateVisualization();
        this.updateSelectionManager();
        this.updateComponentsWithData();
        this.updateUndoRedoButtons();
        
        EventBus.emit('playground:state:restored', { state });
    }
    
    /**
     * Update undo/redo buttons
     */
    updateUndoRedoButtons() {
        const undoButton = document.querySelector('.undo-button');
        const redoButton = document.querySelector('.redo-button');
        
        if (undoButton) {
            undoButton.disabled = this.historyIndex <= 0;
        }
        
        if (redoButton) {
            redoButton.disabled = this.historyIndex >= this.history.length - 1;
        }
    }
    
    /**
     * UI helper methods
     */
    showLoading(message = 'Loading...') {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
            const messageEl = this.elements.loadingOverlay.querySelector('.loading-message');
            if (messageEl) messageEl.textContent = message;
        }
    }
    
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }
    
    showStatus(message) {
        if (this.elements.statusBar) {
            this.elements.statusBar.textContent = message;
            this.elements.statusBar.className = 'status-bar';
        }
        console.log(`📊 ${message}`);
    }
    
    showError(message, details = '') {
        const fullMessage = details ? `${message}: ${details}` : message;
        
        if (this.elements.statusBar) {
            this.elements.statusBar.textContent = fullMessage;
            this.elements.statusBar.className = 'status-bar error';
        }
        
        console.error(`❌ ${fullMessage}`);
        
        // Show toast notification if available
        EventBus.emit('toast:error', { message: fullMessage });
    }
    
    showWarning(message) {
        if (this.elements.statusBar) {
            this.elements.statusBar.textContent = message;
            this.elements.statusBar.className = 'status-bar warning';
        }
        
        console.warn(`⚠️ ${message}`);
        
        // Show toast notification if available
        EventBus.emit('toast:warning', { message });
    }
    
    updateProgress(progress, message) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
        
        if (message) {
            this.showStatus(message);
        }
    }
    
    updateRunButton(isRunning) {
        const runButton = document.querySelector('.run-clustering');
        if (runButton) {
            runButton.disabled = isRunning;
            runButton.textContent = isRunning ? 'Running...' : 'Run Clustering';
        }
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Terminate workers
        if (this.clusteringWorker) {
            this.clusteringWorker.terminate();
        }
        if (this.dataWorker) {
            this.dataWorker.terminate();
        }
        if (this.exportWorker) {
            this.exportWorker.terminate();
        }
        
        // Destroy components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Destroy interaction managers
        if (this.selectionManager) {
            this.selectionManager.destroy?.();
        }
        if (this.hoverManager) {
            this.hoverManager.destroy?.();
        }
        
        // Remove event listeners
        EventBus.off('data:processed', this.handleDataProcessed);
        EventBus.off('clustering:progress', this.handleClusteringProgress);
        EventBus.off('clustering:complete', this.handleClusteringComplete);
        EventBus.off('quality:assessed', this.handleQualityAssessed);
        
        // Clear state
        this.currentData = null;
        this.currentClusters = null;
        this.qualityMetrics = null;
        this.history = [];
        
        this.initialized = false;
        EventBus.emit('playground:destroyed');
    }
    
    /**
     * Handle worker errors
     */
    handleWorkerError(error) {
        console.error('Worker error:', error);
        this.showError('Background processing error', error.message);
    }
    
    /**
     * Handle window events
     */
    handleBeforeUnload(event) {
        if (this.isProcessing) {
            event.preventDefault();
            event.returnValue = 'Clustering is in progress. Are you sure you want to leave?';
        }
    }
    
    handleWindowResize() {
        // Update visualization size
        if (this.components.visualizer) {
            this.components.visualizer.handleResize();
        }
    }
}

/**
 * Initialize playground when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const playground = new ClusteringPlayground();
    playground.init();
    
    // Expose to global scope for debugging
    if (window.NCS) {
        window.NCS.playground = playground;
    }
});

// Export for module systems
export default ClusteringPlayground;