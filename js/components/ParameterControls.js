/**
 * FILE: js/components/ParameterControls.js
 * ParameterControls Component - Interactive algorithm parameter controls
 * NCS-API Website
 * 
 * Features:
 * - Algorithm selection (K-means, DBSCAN, Hierarchical)
 * - Dynamic parameter controls
 * - Data upload and management
 * - Visualization settings
 * - Export functionality
 * - Real-time updates
 * - Preset configurations
 */

import { CONFIG } from '../config/constants.js';

export class ParameterControls {
    constructor(container, visualizer) {
        this.container = container;
        this.visualizer = visualizer;
        
        // State management
        this.state = {
            algorithm: 'kmeans',
            parameters: {
                kmeans: {
                    k: 3,
                    maxIterations: 100,
                    tolerance: 0.001,
                    initMethod: 'random'
                },
                dbscan: {
                    epsilon: 0.1,
                    minSamples: 5,
                    metric: 'euclidean'
                },
                hierarchical: {
                    nClusters: 3,
                    linkage: 'ward',
                    distance: 'euclidean'
                }
            },
            visualization: {
                pointSize: 4,
                centroidSize: 8,
                showCentroids: true,
                showConnections: false,
                showTrails: false,
                animationSpeed: 1,
                colorPalette: 'default'
            },
            data: {
                source: 'generated',
                pointCount: 200,
                noise: 0.1,
                clusters: 3
            },
            ui: {
                collapsedPanels: new Set(),
                isRunning: false,
                currentIteration: 0,
                progress: 0
            }
        };
        
        // Algorithm configurations
        this.algorithmConfigs = {
            kmeans: {
                name: 'K-Means',
                description: 'Centroid-based clustering algorithm',
                color: '#6366f1',
                parameters: [
                    { key: 'k', label: 'Number of Clusters', type: 'range', min: 2, max: 10, step: 1 },
                    { key: 'maxIterations', label: 'Max Iterations', type: 'range', min: 10, max: 500, step: 10 },
                    { key: 'tolerance', label: 'Tolerance', type: 'range', min: 0.0001, max: 0.01, step: 0.0001, format: 'scientific' },
                    { key: 'initMethod', label: 'Initialization', type: 'select', options: ['random', 'kmeans++', 'manual'] }
                ]
            },
            dbscan: {
                name: 'DBSCAN',
                description: 'Density-based clustering algorithm',
                color: '#8b5cf6',
                parameters: [
                    { key: 'epsilon', label: 'Epsilon (ε)', type: 'range', min: 0.01, max: 0.5, step: 0.01 },
                    { key: 'minSamples', label: 'Min Samples', type: 'range', min: 2, max: 20, step: 1 },
                    { key: 'metric', label: 'Distance Metric', type: 'select', options: ['euclidean', 'manhattan', 'cosine'] }
                ]
            },
            hierarchical: {
                name: 'Hierarchical',
                description: 'Tree-based clustering algorithm',
                color: '#06b6d4',
                parameters: [
                    { key: 'nClusters', label: 'Number of Clusters', type: 'range', min: 2, max: 10, step: 1 },
                    { key: 'linkage', label: 'Linkage Method', type: 'select', options: ['ward', 'complete', 'average', 'single'] },
                    { key: 'distance', label: 'Distance Metric', type: 'select', options: ['euclidean', 'manhattan', 'cosine'] }
                ]
            }
        };
        
        // Data presets
        this.dataPresets = {
            generated: {
                name: 'Generated Data',
                description: 'Synthetic clustering data',
                icon: '🎲'
            },
            iris: {
                name: 'Iris Dataset',
                description: 'Classic flower dataset (150 points)',
                icon: '🌸'
            },
            customers: {
                name: 'Customer Segmentation',
                description: 'E-commerce customer data (500 points)',
                icon: '👥'
            },
            upload: {
                name: 'Upload File',
                description: 'CSV, JSON, or TXT format',
                icon: '📁'
            }
        };
        
        // Event handlers
        this.eventHandlers = new Map();
        
        this.init();
    }

    /**
     * Initialize the parameter controls
     */
    init() {
        try {
            console.log('🎛️ Initializing ParameterControls...');
            
            this.createLayout();
            this.bindEvents();
            this.updateUI();
            
            // Connect to visualizer if available
            if (this.visualizer) {
                this.connectToVisualizer();
            }
            
            console.log('✅ ParameterControls initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ParameterControls:', error);
            this.handleError(error);
        }
    }

    /**
     * Create the control panel layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="control-panel" data-panel="algorithm">
                <div class="control-panel-header">
                    <h3 class="control-panel-title">Algorithm</h3>
                    <div class="control-panel-icon">▼</div>
                </div>
                <div class="control-panel-content">
                    <div class="control-section">
                        <div class="algorithm-grid" id="algorithm-selection">
                            ${this.renderAlgorithmOptions()}
                        </div>
                    </div>
                </div>
            </div>

            <div class="control-panel" data-panel="parameters">
                <div class="control-panel-header">
                    <h3 class="control-panel-title">Parameters</h3>
                    <div class="control-panel-icon">▼</div>
                </div>
                <div class="control-panel-content">
                    <div id="parameter-controls">
                        ${this.renderParameterControls()}
                    </div>
                </div>
            </div>

            <div class="control-panel" data-panel="data">
                <div class="control-panel-header">
                    <h3 class="control-panel-title">Data</h3>
                    <div class="control-panel-icon">▼</div>
                </div>
                <div class="control-panel-content">
                    <div class="control-section">
                        <div class="control-section-title">Data Source</div>
                        ${this.renderDataControls()}
                    </div>
                </div>
            </div>

            <div class="control-panel" data-panel="visualization">
                <div class="control-panel-header">
                    <h3 class="control-panel-title">Visualization</h3>
                    <div class="control-panel-icon">▼</div>
                </div>
                <div class="control-panel-content">
                    <div class="control-section">
                        ${this.renderVisualizationControls()}
                    </div>
                </div>
            </div>

            <div class="control-panel" data-panel="actions">
                <div class="control-panel-header">
                    <h3 class="control-panel-title">Actions</h3>
                    <div class="control-panel-icon">▼</div>
                </div>
                <div class="control-panel-content">
                    <div class="control-section">
                        ${this.renderActionControls()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render algorithm selection options
     */
    renderAlgorithmOptions() {
        return Object.entries(this.algorithmConfigs).map(([key, config]) => `
            <div class="algorithm-option">
                <input type="radio" id="algo-${key}" name="algorithm" value="${key}" 
                       ${this.state.algorithm === key ? 'checked' : ''}>
                <label for="algo-${key}" class="algorithm-option-label">
                    <div class="algorithm-option-title">${config.name}</div>
                    <div class="algorithm-option-description">${config.description}</div>
                </label>
            </div>
        `).join('');
    }

    /**
     * Render parameter controls for current algorithm
     */
    renderParameterControls() {
        const algorithm = this.state.algorithm;
        const config = this.algorithmConfigs[algorithm];
        const params = this.state.parameters[algorithm];
        
        if (!config || !params) return '<p>No parameters available</p>';
        
        return config.parameters.map(param => {
            const value = params[param.key];
            
            switch (param.type) {
                case 'range':
                    return `
                        <div class="form-group">
                            <label class="form-label">
                                <span>${param.label}</span>
                                <span class="form-label-value">${this.formatValue(value, param.format)}</span>
                            </label>
                            <input type="range" class="form-range" 
                                   data-param="${param.key}"
                                   min="${param.min}" 
                                   max="${param.max}" 
                                   step="${param.step}" 
                                   value="${value}">
                        </div>
                    `;
                case 'select':
                    return `
                        <div class="form-group">
                            <label class="form-label">
                                <span>${param.label}</span>
                            </label>
                            <select class="form-select" data-param="${param.key}">
                                ${param.options.map(option => `
                                    <option value="${option}" ${value === option ? 'selected' : ''}>
                                        ${option.charAt(0).toUpperCase() + option.slice(1)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                case 'checkbox':
                    return `
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" data-param="${param.key}" ${value ? 'checked' : ''}>
                                <span class="form-checkbox-mark"></span>
                                <span class="form-checkbox-label">${param.label}</span>
                            </label>
                        </div>
                    `;
                default:
                    return '';
            }
        }).join('');
    }

    /**
     * Render data source controls
     */
    renderDataControls() {
        return `
            <div class="form-group">
                <select class="form-select" id="data-source">
                    ${Object.entries(this.dataPresets).map(([key, preset]) => `
                        <option value="${key}" ${this.state.data.source === key ? 'selected' : ''}>
                            ${preset.icon} ${preset.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div id="data-source-controls">
                ${this.renderDataSourceControls()}
            </div>
            
            <div class="data-upload" id="data-upload" style="display: ${this.state.data.source === 'upload' ? 'block' : 'none'};">
                <input type="file" id="file-input" accept=".csv,.json,.txt" style="display: none;">
                <div class="data-upload-icon">📁</div>
                <div class="data-upload-text">Drop files here or click to browse</div>
                <div class="data-upload-hint">Supports CSV, JSON, and TXT formats</div>
            </div>
        `;
    }

    /**
     * Render data source specific controls
     */
    renderDataSourceControls() {
        if (this.state.data.source !== 'generated') {
            return '<div class="form-group"><small style="color: var(--color-text-tertiary);">Dataset will be loaded automatically</small></div>';
        }
        
        return `
            <div class="form-group">
                <label class="form-label">
                    <span>Number of Points</span>
                    <span class="form-label-value">${this.state.data.pointCount}</span>
                </label>
                <input type="range" class="form-range" id="point-count" 
                       min="50" max="1000" step="50" value="${this.state.data.pointCount}">
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span>Noise Level</span>
                    <span class="form-label-value">${this.state.data.noise.toFixed(2)}</span>
                </label>
                <input type="range" class="form-range" id="noise-level" 
                       min="0" max="0.5" step="0.01" value="${this.state.data.noise}">
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span>True Clusters</span>
                    <span class="form-label-value">${this.state.data.clusters}</span>
                </label>
                <input type="range" class="form-range" id="true-clusters" 
                       min="2" max="6" step="1" value="${this.state.data.clusters}">
            </div>
        `;
    }

    /**
     * Render visualization controls
     */
    renderVisualizationControls() {
        return `
            <div class="form-group">
                <label class="form-label">
                    <span>Point Size</span>
                    <span class="form-label-value">${this.state.visualization.pointSize}px</span>
                </label>
                <input type="range" class="form-range" id="point-size" 
                       min="2" max="10" step="1" value="${this.state.visualization.pointSize}">
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span>Centroid Size</span>
                    <span class="form-label-value">${this.state.visualization.centroidSize}px</span>
                </label>
                <input type="range" class="form-range" id="centroid-size" 
                       min="4" max="20" step="1" value="${this.state.visualization.centroidSize}">
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span>Animation Speed</span>
                    <span class="form-label-value">${this.state.visualization.animationSpeed}x</span>
                </label>
                <input type="range" class="form-range" id="animation-speed" 
                       min="0.1" max="3" step="0.1" value="${this.state.visualization.animationSpeed}">
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="show-centroids" ${this.state.visualization.showCentroids ? 'checked' : ''}>
                    <span class="form-checkbox-mark"></span>
                    <span class="form-checkbox-label">Show Centroids</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="show-connections" ${this.state.visualization.showConnections ? 'checked' : ''}>
                    <span class="form-checkbox-mark"></span>
                    <span class="form-checkbox-label">Show Connections</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="show-trails" ${this.state.visualization.showTrails ? 'checked' : ''}>
                    <span class="form-checkbox-mark"></span>
                    <span class="form-checkbox-label">Show Trails</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <span>Color Palette</span>
                </label>
                <select class="form-select" id="color-palette">
                    <option value="default">Default</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="pastel">Pastel</option>
                    <option value="monochrome">Monochrome</option>
                    <option value="colorblind">Colorblind Safe</option>
                </select>
            </div>
        `;
    }

    /**
     * Render action controls
     */
    renderActionControls() {
        return `
            <div class="action-button-group">
                <button class="action-button action-button-primary" id="start-clustering" 
                        ${this.state.ui.isRunning ? 'disabled' : ''}>
                    <span>${this.state.ui.isRunning ? '⏸️' : '▶️'}</span>
                    ${this.state.ui.isRunning ? 'Pause' : 'Start'}
                </button>
                <button class="action-button action-button-secondary" id="stop-clustering">
                    <span>⏹️</span>
                    Stop
                </button>
            </div>
            
            <div class="action-button-group" style="margin-top: 0.5rem;">
                <button class="action-button action-button-secondary" id="reset-view">
                    <span>🔄</span>
                    Reset View
                </button>
                <button class="action-button action-button-secondary" id="generate-data">
                    <span>🎲</span>
                    New Data
                </button>
            </div>
            
            <div class="progress-container" id="clustering-progress" style="display: none;">
                <div class="progress-label">
                    <span>Clustering Progress</span>
                    <span id="progress-text">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
            </div>
            
            <div style="margin-top: 1rem;">
                <button class="action-button action-button-secondary" id="export-image">
                    <span>💾</span>
                    Export PNG
                </button>
            </div>
            
            <div class="action-button-group" style="margin-top: 0.5rem;">
                <button class="action-button action-button-secondary" id="save-config">
                    <span>📋</span>
                    Save Config
                </button>
                <button class="action-button action-button-secondary" id="load-config">
                    <span>📂</span>
                    Load Config
                </button>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Panel collapse/expand
        this.container.addEventListener('click', (e) => {
            const header = e.target.closest('.control-panel-header');
            if (header) {
                const panel = header.parentElement;
                const panelId = panel.dataset.panel;
                this.togglePanel(panelId);
            }
        });

        // Algorithm selection
        this.container.addEventListener('change', (e) => {
            if (e.target.name === 'algorithm') {
                this.updateAlgorithm(e.target.value);
            }
        });

        // Parameter changes
        this.container.addEventListener('input', (e) => {
            if (e.target.dataset.param) {
                this.updateParameter(e.target.dataset.param, e.target.value, e.target.type);
            }
        });

        // Data source changes
        this.bindDataSourceEvents();

        // Visualization controls
        this.bindVisualizationEvents();

        // Action buttons
        this.bindActionEvents();

        // File upload
        this.bindFileUploadEvents();
    }

    /**
     * Bind data source event listeners
     */
    bindDataSourceEvents() {
        const dataSourceSelect = this.container.querySelector('#data-source');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', (e) => {
                this.updateDataSource(e.target.value);
            });
        }

        // Generated data controls
        ['point-count', 'noise-level', 'true-clusters'].forEach(id => {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.updateDataParameter(id, parseFloat(e.target.value));
                });
            }
        });
    }

    /**
     * Bind visualization event listeners
     */
    bindVisualizationEvents() {
        const vizControls = [
            'point-size', 'centroid-size', 'animation-speed',
            'show-centroids', 'show-connections', 'show-trails', 'color-palette'
        ];

        vizControls.forEach(id => {
            const element = this.container.querySelector(`#${id}`);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.updateVisualization(id, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
                });
            }
        });
    }

    /**
     * Bind action event listeners
     */
    bindActionEvents() {
        // Start/Pause clustering
        const startButton = this.container.querySelector('#start-clustering');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (this.state.ui.isRunning) {
                    this.pauseClustering();
                } else {
                    this.startClustering();
                }
            });
        }

        // Stop clustering
        const stopButton = this.container.querySelector('#stop-clustering');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stopClustering();
            });
        }

        // Reset view
        const resetButton = this.container.querySelector('#reset-view');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (this.visualizer) {
                    this.visualizer.resetView();
                }
            });
        }

        // Generate new data
        const generateButton = this.container.querySelector('#generate-data');
        if (generateButton) {
            generateButton.addEventListener('click', () => {
                this.generateData();
            });
        }

        // Export image
        const exportButton = this.container.querySelector('#export-image');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportImage();
            });
        }

        // Save/Load configuration
        const saveButton = this.container.querySelector('#save-config');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }

        const loadButton = this.container.querySelector('#load-config');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.loadConfiguration();
            });
        }
    }

    /**
     * Bind file upload events
     */
    bindFileUploadEvents() {
        const uploadArea = this.container.querySelector('#data-upload');
        const fileInput = this.container.querySelector('#file-input');

        if (uploadArea && fileInput) {
            // Click to browse
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            // File selection
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });

            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
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
            this.state.ui.isRunning = true;
            this.updateActionButtons();
            this.showProgress();
        });

        this.visualizer.on('clusteringUpdate', (result, clustering) => {
            this.state.ui.currentIteration = clustering.iterations;
            this.state.ui.progress = clustering.iterations / this.state.parameters[this.state.algorithm].maxIterations;
            this.updateProgress();
        });

        this.visualizer.on('clusteringComplete', (clustering) => {
            this.state.ui.isRunning = false;
            this.state.ui.progress = 1;
            this.updateActionButtons();
            this.updateProgress();
            this.hideProgress();
        });

        this.visualizer.on('error', (error) => {
            this.state.ui.isRunning = false;
            this.updateActionButtons();
            this.hideProgress();
            this.showError(error.message);
        });

        // Apply initial configuration
        this.applyConfiguration();
    }

    /**
     * Toggle panel collapse state
     */
    togglePanel(panelId) {
        const panel = this.container.querySelector(`[data-panel="${panelId}"]`);
        if (!panel) return;

        const isCollapsed = this.state.ui.collapsedPanels.has(panelId);
        
        if (isCollapsed) {
            this.state.ui.collapsedPanels.delete(panelId);
            panel.classList.remove('collapsed');
        } else {
            this.state.ui.collapsedPanels.add(panelId);
            panel.classList.add('collapsed');
        }
    }

    /**
     * Update selected algorithm
     */
    updateAlgorithm(algorithm) {
        this.state.algorithm = algorithm;
        
        // Update parameter controls
        const parameterContainer = this.container.querySelector('#parameter-controls');
        if (parameterContainer) {
            parameterContainer.innerHTML = this.renderParameterControls();
            this.bindParameterEvents();
        }
        
        this.triggerEvent('algorithmChange', { algorithm });
    }

    /**
     * Update algorithm parameter
     */
    updateParameter(key, value, type) {
        const algorithm = this.state.algorithm;
        
        // Convert value to appropriate type
        if (type === 'range' || type === 'number') {
            value = parseFloat(value);
        } else if (type === 'checkbox') {
            value = Boolean(value);
        }
        
        this.state.parameters[algorithm][key] = value;
        
        // Update label if it's a range input
        const input = this.container.querySelector(`[data-param="${key}"]`);
        if (input && input.type === 'range') {
            const label = input.parentElement.querySelector('.form-label-value');
            if (label) {
                const param = this.algorithmConfigs[algorithm].parameters.find(p => p.key === key);
                label.textContent = this.formatValue(value, param?.format);
            }
        }
        
        this.triggerEvent('parameterChange', { algorithm, key, value });
    }

    /**
     * Update data source
     */
    updateDataSource(source) {
        this.state.data.source = source;
        
        // Update data source controls
        const controlsContainer = this.container.querySelector('#data-source-controls');
        if (controlsContainer) {
            controlsContainer.innerHTML = this.renderDataSourceControls();
            this.bindDataSourceEvents();
        }
        
        // Show/hide upload area
        const uploadArea = this.container.querySelector('#data-upload');
        if (uploadArea) {
            uploadArea.style.display = source === 'upload' ? 'block' : 'none';
        }
        
        // Load preset data if not upload
        if (source !== 'upload') {
            this.loadPresetData(source);
        }
        
        this.triggerEvent('dataSourceChange', { source });
    }

    /**
     * Update data parameter
     */
    updateDataParameter(param, value) {
        const key = param.replace('-', '');
        const mapping = {
            'pointcount': 'pointCount',
            'noiselevel': 'noise',
            'trueclusters': 'clusters'
        };
        
        const stateKey = mapping[key.toLowerCase()] || key;
        this.state.data[stateKey] = value;
        
        // Update label
        const input = this.container.querySelector(`#${param}`);
        if (input) {
            const label = input.parentElement.querySelector('.form-label-value');
            if (label) {
                label.textContent = stateKey === 'noise' ? value.toFixed(2) : value;
            }
        }
        
        this.triggerEvent('dataParameterChange', { param: stateKey, value });
    }

    /**
     * Update visualization setting
     */
    updateVisualization(setting, value) {
        const mapping = {
            'point-size': 'pointSize',
            'centroid-size': 'centroidSize',
            'animation-speed': 'animationSpeed',
            'show-centroids': 'showCentroids',
            'show-connections': 'showConnections',
            'show-trails': 'showTrails',
            'color-palette': 'colorPalette'
        };
        
        const key = mapping[setting] || setting;
        
        if (typeof value === 'string' && !isNaN(value)) {
            value = parseFloat(value);
        }
        
        this.state.visualization[key] = value;
        
        // Update label for range inputs
        if (setting.includes('size') || setting.includes('speed')) {
            const input = this.container.querySelector(`#${setting}`);
            if (input) {
                const label = input.parentElement.querySelector('.form-label-value');
                if (label) {
                    const unit = setting.includes('size') ? 'px' : 'x';
                    label.textContent = `${value}${unit}`;
                }
            }
        }
        
        // Apply to visualizer
        if (this.visualizer) {
            this.visualizer.updateConfig({ [key]: value });
        }
        
        this.triggerEvent('visualizationChange', { setting: key, value });
    }

    /**
     * Bind parameter events after dynamic update
     */
    bindParameterEvents() {
        const paramInputs = this.container.querySelectorAll('[data-param]');
        paramInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateParameter(e.target.dataset.param, e.target.value, e.target.type);
            });
        });
    }

    /**
     * Start clustering process
     */
    startClustering() {
        if (!this.visualizer) {
            this.showError('Visualizer not connected');
            return;
        }
        
        const algorithm = this.state.algorithm;
        const parameters = this.state.parameters[algorithm];
        
        this.visualizer.startClustering(algorithm, parameters);
    }

    /**
     * Pause clustering process
     */
    pauseClustering() {
        if (this.visualizer) {
            this.visualizer.pauseClustering();
        }
    }

    /**
     * Stop clustering process
     */
    stopClustering() {
        if (this.visualizer) {
            this.visualizer.stopClustering();
        }
        
        this.state.ui.isRunning = false;
        this.state.ui.progress = 0;
        this.updateActionButtons();
        this.hideProgress();
    }

    /**
     * Generate new data
     */
    generateData() {
        if (this.visualizer) {
            this.visualizer.generateSampleData(this.state.data.pointCount);
        }
        
        this.triggerEvent('dataGenerate', this.state.data);
    }

    /**
     * Handle file upload
     */
    async handleFileUpload(file) {
        try {
            const text = await file.text();
            const data = this.parseDataFile(text, file.name);
            
            if (this.visualizer) {
                this.visualizer.setData(data);
            }
            
            this.triggerEvent('dataUpload', { file: file.name, points: data.length });
            
        } catch (error) {
            this.showError(`Failed to load file: ${error.message}`);
        }
    }

    /**
     * Parse uploaded data file
     */
    parseDataFile(text, filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'csv':
                return this.parseCSV(text);
            case 'json':
                return this.parseJSON(text);
            case 'txt':
                return this.parseTXT(text);
            default:
                throw new Error('Unsupported file format');
        }
    }

    /**
     * Parse CSV data
     */
    parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Find x and y columns
        const xCol = headers.findIndex(h => h.toLowerCase().includes('x') || h.toLowerCase().includes('longitude'));
        const yCol = headers.findIndex(h => h.toLowerCase().includes('y') || h.toLowerCase().includes('latitude'));
        
        if (xCol === -1 || yCol === -1) {
            throw new Error('Could not find x and y columns in CSV');
        }
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const x = parseFloat(values[xCol]);
            const y = parseFloat(values[yCol]);
            
            if (!isNaN(x) && !isNaN(y)) {
                data.push({ x, y, id: i - 1, cluster: -1 });
            }
        }
        
        return data;
    }

    /**
     * Parse JSON data
     */
    parseJSON(text) {
        const json = JSON.parse(text);
        
        if (Array.isArray(json)) {
            return json.map((point, index) => ({
                x: point.x || point[0] || 0,
                y: point.y || point[1] || 0,
                id: index,
                cluster: -1
            }));
        }
        
        throw new Error('JSON must contain an array of points');
    }

    /**
     * Parse TXT data
     */
    parseTXT(text) {
        const lines = text.trim().split('\n');
        const data = [];
        
        lines.forEach((line, index) => {
            const values = line.trim().split(/\s+/);
            if (values.length >= 2) {
                const x = parseFloat(values[0]);
                const y = parseFloat(values[1]);
                
                if (!isNaN(x) && !isNaN(y)) {
                    data.push({ x, y, id: index, cluster: -1 });
                }
            }
        });
        
        return data;
    }

    /**
     * Load preset data
     */
    async loadPresetData(preset) {
        try {
            // This would load from your assets/data folder
            const response = await fetch(`/assets/data/${preset}.csv`);
            if (response.ok) {
                const text = await response.text();
                const data = this.parseCSV(text);
                
                if (this.visualizer) {
                    this.visualizer.setData(data);
                }
                
                this.triggerEvent('dataLoad', { preset, points: data.length });
            } else {
                // Fallback to generated data
                this.generateData();
            }
        } catch (error) {
            console.warn('Failed to load preset data, using generated data:', error);
            this.generateData();
        }
    }

    /**
     * Export visualization as image
     */
    async exportImage() {
        if (!this.visualizer) {
            this.showError('Visualizer not connected');
            return;
        }
        
        try {
            const dataURL = await this.visualizer.exportImage('png', 0.9);
            
            // Create download link
            const link = document.createElement('a');
            link.download = `clustering-${this.state.algorithm}-${Date.now()}.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.triggerEvent('imageExport', { format: 'png' });
            
        } catch (error) {
            this.showError(`Export failed: ${error.message}`);
        }
    }

    /**
     * Save current configuration
     */
    saveConfiguration() {
        const config = {
            algorithm: this.state.algorithm,
            parameters: this.state.parameters,
            visualization: this.state.visualization,
            data: this.state.data,
            timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `ncs-config-${Date.now()}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.triggerEvent('configSave', config);
    }

    /**
     * Load configuration
     */
    loadConfiguration() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                try {
                    const text = await e.target.files[0].text();
                    const config = JSON.parse(text);
                    
                    this.applyConfiguration(config);
                    this.triggerEvent('configLoad', config);
                    
                } catch (error) {
                    this.showError(`Failed to load configuration: ${error.message}`);
                }
            }
        });
        
        input.click();
    }

    /**
     * Apply configuration to UI and visualizer
     */
    applyConfiguration(config = null) {
        if (config) {
            this.state = { ...this.state, ...config };
        }
        
        // Update UI
        this.updateUI();
        
        // Apply to visualizer
        if (this.visualizer) {
            this.visualizer.updateConfig({
                algorithm: this.state.algorithm,
                ...this.state.parameters[this.state.algorithm],
                ...this.state.visualization
            });
        }
    }

    /**
     * Update all UI elements
     */
    updateUI() {
        // Recreate layout to reflect current state
        this.createLayout();
        this.bindEvents();
    }

    /**
     * Update action buttons
     */
    updateActionButtons() {
        const startButton = this.container.querySelector('#start-clustering');
        if (startButton) {
            startButton.innerHTML = `
                <span>${this.state.ui.isRunning ? '⏸️' : '▶️'}</span>
                ${this.state.ui.isRunning ? 'Pause' : 'Start'}
            `;
            startButton.disabled = false;
        }
    }

    /**
     * Show clustering progress
     */
    showProgress() {
        const progressContainer = this.container.querySelector('#clustering-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    /**
     * Update progress indicator
     */
    updateProgress() {
        const progressFill = this.container.querySelector('#progress-fill');
        const progressText = this.container.querySelector('#progress-text');
        
        if (progressFill && progressText) {
            const percent = Math.round(this.state.ui.progress * 100);
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        }
    }

    /**
     * Hide clustering progress
     */
    hideProgress() {
        setTimeout(() => {
            const progressContainer = this.container.querySelector('#clustering-progress');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }, 2000);
    }

    /**
     * Format value for display
     */
    formatValue(value, format) {
        if (format === 'scientific') {
            return value.toExponential(3);
        }
        
        if (typeof value === 'number') {
            return value % 1 === 0 ? value.toString() : value.toFixed(3);
        }
        
        return value.toString();
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('ParameterControls error:', message);
        
        // You could integrate with your Toast component here
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.show(message, 'error');
        }
    }

    /**
     * Trigger custom event
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`parameterControls:${eventName}`, {
            detail: data
        });
        
        this.container.dispatchEvent(event);
        
        if (CONFIG.IS_DEV) {
            console.log(`📊 ParameterControls Event:`, eventName, data);
        }
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('ParameterControls error:', error);
        
        // Display error in UI
        this.container.innerHTML = `
            <div class="playground-loading">
                <div style="text-align: center; color: var(--color-error-500);">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <div>Parameter Controls Error</div>
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
        console.log('🧹 Cleaning up ParameterControls...');
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        // Clear container
        this.container.innerHTML = '';
    }
}