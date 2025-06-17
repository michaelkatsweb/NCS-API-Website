/**
 * FILE: js/components/DataUploader.js
 * DataUploader Component - Advanced file upload with validation and processing
 * NCS-API Website
 * 
 * Features:
 * - Drag & drop file upload
 * - Multiple file format support (CSV, JSON, TXT, Excel)
 * - Data validation and preprocessing
 * - Progress tracking
 * - Error handling and recovery
 * - Preview and confirmation
 * - Batch processing
 * - URL import support
 * - Clipboard data import
 */

import { CONFIG } from '../config/constants.js';

export class DataUploader {
    constructor(container, options = {}) {
        this.container = container;
        
        // Configuration
        this.config = {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            acceptedTypes: ['csv', 'json', 'txt', 'xlsx', 'xls'],
            autoProcess: true,
            showPreview: true,
            enableUrlImport: true,
            enableClipboard: true,
            enableBatch: false,
            presets: {
                iris: '/assets/data/iris.csv',
                customers: '/assets/data/customers.csv',
                socialMedia: '/assets/data/social-media.csv',
                financial: '/assets/data/financial.csv',
                ecommerce: '/assets/data/ecommerce.csv'
            },
            ...options
        };
        
        // State management
        this.state = {
            files: [],
            activeFile: null,
            isProcessing: false,
            isDragOver: false,
            uploadProgress: 0,
            validationErrors: [],
            processedData: null,
            previewData: null
        };
        
        // File processing
        this.processors = {
            csv: this.processCSV.bind(this),
            json: this.processJSON.bind(this),
            txt: this.processTXT.bind(this),
            xlsx: this.processExcel.bind(this),
            xls: this.processExcel.bind(this)
        };
        
        // Event callbacks
        this.callbacks = {
            onFileAdd: null,
            onFileRemove: null,
            onFileProcess: null,
            onDataReady: null,
            onError: null,
            onProgress: null
        };
        
        // File validation rules
        this.validationRules = {
            csv: {
                requiredColumns: ['x', 'y'],
                minRows: 2,
                maxRows: 50000,
                allowedDelimiters: [',', ';', '\t', '|']
            },
            json: {
                requiredFields: ['x', 'y'],
                maxDepth: 5,
                allowArrays: true
            },
            txt: {
                minColumns: 2,
                maxColumns: 20,
                whitespaceDelimited: true
            }
        };
        
        this.init();
    }

    /**
     * Initialize the data uploader
     */
    init() {
        try {
            console.log('📁 Initializing DataUploader...');
            
            this.createLayout();
            this.bindEvents();
            this.setupClipboardSupport();
            
            console.log('✅ DataUploader initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize DataUploader:', error);
            this.handleError(error);
        }
    }

    /**
     * Create the uploader layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="data-uploader" id="data-uploader">
                <div class="uploader-tabs" id="uploader-tabs">
                    <button class="uploader-tab active" data-tab="upload">
                        <span>📁</span>
                        Upload Files
                    </button>
                    <button class="uploader-tab" data-tab="presets">
                        <span>📊</span>
                        Sample Data
                    </button>
                    <button class="uploader-tab" data-tab="url" ${!this.config.enableUrlImport ? 'style="display: none;"' : ''}>
                        <span>🌐</span>
                        From URL
                    </button>
                    <button class="uploader-tab" data-tab="clipboard" ${!this.config.enableClipboard ? 'style="display: none;"' : ''}>
                        <span>📋</span>
                        Clipboard
                    </button>
                </div>

                <div class="uploader-content">
                    <!-- File Upload Tab -->
                    <div class="uploader-tab-content active" data-tab-content="upload">
                        <div class="upload-area" id="upload-area">
                            <input type="file" id="file-input" multiple 
                                   accept=".csv,.json,.txt,.xlsx,.xls" style="display: none;">
                            
                            <div class="upload-zone" id="upload-zone">
                                <div class="upload-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                        <polyline points="10,9 9,9 8,9"/>
                                    </svg>
                                </div>
                                <div class="upload-text">
                                    <h3>Drop files here or click to browse</h3>
                                    <p>Supports CSV, JSON, TXT, and Excel files up to ${this.formatFileSize(this.config.maxFileSize)}</p>
                                </div>
                                <button class="upload-button" type="button">
                                    Choose Files
                                </button>
                            </div>
                        </div>

                        <div class="file-list" id="file-list">
                            ${this.renderFileList()}
                        </div>
                    </div>

                    <!-- Sample Data Tab -->
                    <div class="uploader-tab-content" data-tab-content="presets">
                        <div class="presets-grid">
                            ${this.renderPresets()}
                        </div>
                    </div>

                    <!-- URL Import Tab -->
                    <div class="uploader-tab-content" data-tab-content="url">
                        <div class="url-import">
                            <div class="form-group">
                                <label class="form-label">Data URL</label>
                                <div class="url-input-group">
                                    <input type="url" class="form-input" id="url-input" 
                                           placeholder="https://example.com/data.csv">
                                    <button class="btn btn-primary" id="import-url-btn">
                                        Import
                                    </button>
                                </div>
                            </div>
                            <div class="url-examples">
                                <p class="text-secondary">Examples:</p>
                                <ul class="example-urls">
                                    <li><a href="#" data-url="https://raw.githubusercontent.com/plotly/datasets/master/iris.csv">Iris Dataset</a></li>
                                    <li><a href="#" data-url="https://raw.githubusercontent.com/plotly/datasets/master/wine.csv">Wine Dataset</a></li>
                                    <li><a href="#" data-url="https://gist.githubusercontent.com/netj/8836201/raw/6f9306ad21398ea43cba4f7d537619d0e07d5ae3/iris.csv">Iris (Alternative)</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Clipboard Tab -->
                    <div class="uploader-tab-content" data-tab-content="clipboard">
                        <div class="clipboard-import">
                            <div class="form-group">
                                <label class="form-label">Paste Data</label>
                                <textarea class="form-textarea" id="clipboard-textarea" 
                                          placeholder="Paste CSV data, JSON array, or tab-separated values here..."
                                          rows="10"></textarea>
                            </div>
                            <div class="clipboard-actions">
                                <button class="btn btn-primary" id="process-clipboard-btn">
                                    Process Data
                                </button>
                                <button class="btn btn-secondary" id="clear-clipboard-btn">
                                    Clear
                                </button>
                            </div>
                            <div class="clipboard-help">
                                <p class="text-secondary">
                                    Supports CSV, JSON arrays, or tab-separated data.
                                    Each row should contain at least x and y coordinates.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-label">
                        <span>Processing...</span>
                        <span id="progress-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                </div>

                <div class="data-preview" id="data-preview" style="display: none;">
                    <div class="preview-header">
                        <h4>Data Preview</h4>
                        <div class="preview-stats" id="preview-stats"></div>
                    </div>
                    <div class="preview-content" id="preview-content"></div>
                    <div class="preview-actions">
                        <button class="btn btn-primary" id="confirm-data-btn">
                            Use This Data
                        </button>
                        <button class="btn btn-secondary" id="cancel-preview-btn">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render file list
     */
    renderFileList() {
        if (this.state.files.length === 0) {
            return '<div class="no-files">No files selected</div>';
        }

        return this.state.files.map((file, index) => `
            <div class="file-item ${file.status}" data-file-index="${index}">
                <div class="file-info">
                    <div class="file-icon">
                        ${this.getFileIcon(file.type)}
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            ${this.formatFileSize(file.size)} • ${file.type.toUpperCase()}
                            ${file.recordCount ? ` • ${file.recordCount} records` : ''}
                        </div>
                    </div>
                </div>
                <div class="file-status">
                    ${this.getFileStatusIcon(file.status)}
                </div>
                <div class="file-actions">
                    <button class="file-action-btn" data-action="preview" title="Preview">
                        👁️
                    </button>
                    <button class="file-action-btn" data-action="remove" title="Remove">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render preset data options
     */
    renderPresets() {
        const presets = [
            {
                key: 'iris',
                name: 'Iris Dataset',
                description: 'Classic flower classification dataset (150 points, 4 features)',
                icon: '🌸',
                points: 150,
                features: 4
            },
            {
                key: 'customers',
                name: 'Customer Segmentation',
                description: 'E-commerce customer behavior data (500 points, 6 features)',
                icon: '👥',
                points: 500,
                features: 6
            },
            {
                key: 'socialMedia',
                name: 'Social Network',
                description: 'Social media engagement clustering (800 points, 5 features)',
                icon: '📱',
                points: 800,
                features: 5
            },
            {
                key: 'financial',
                name: 'Financial Data',
                description: 'Stock market clustering analysis (1000 points, 8 features)',
                icon: '📈',
                points: 1000,
                features: 8
            },
            {
                key: 'ecommerce',
                name: 'E-commerce Behavior',
                description: 'User purchase behavior patterns (1200 points, 7 features)',
                icon: '🛒',
                points: 1200,
                features: 7
            }
        ];

        return presets.map(preset => `
            <div class="preset-card" data-preset="${preset.key}">
                <div class="preset-icon">${preset.icon}</div>
                <div class="preset-content">
                    <h4 class="preset-name">${preset.name}</h4>
                    <p class="preset-description">${preset.description}</p>
                    <div class="preset-stats">
                        <span class="stat">${preset.points} points</span>
                        <span class="stat">${preset.features} features</span>
                    </div>
                </div>
                <button class="preset-load-btn">
                    Load Dataset
                </button>
            </div>
        `).join('');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Tab switching
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.uploader-tab')) {
                const tab = e.target.closest('.uploader-tab');
                this.switchTab(tab.dataset.tab);
            }
        });

        // File upload events
        this.bindFileUploadEvents();
        
        // Preset loading
        this.bindPresetEvents();
        
        // URL import
        this.bindUrlImportEvents();
        
        // Clipboard import
        this.bindClipboardEvents();
        
        // File list actions
        this.bindFileListEvents();
        
        // Preview actions
        this.bindPreviewEvents();
    }

    /**
     * Bind file upload events
     */
    bindFileUploadEvents() {
        const uploadZone = this.container.querySelector('#upload-zone');
        const fileInput = this.container.querySelector('#file-input');
        const uploadButton = this.container.querySelector('.upload-button');

        // Click to upload
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        uploadZone.addEventListener('click', (e) => {
            if (e.target === uploadZone || e.target.closest('.upload-zone')) {
                fileInput.click();
            }
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.setDragState(true);
        });

        uploadZone.addEventListener('dragleave', (e) => {
            if (!uploadZone.contains(e.relatedTarget)) {
                this.setDragState(false);
            }
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.setDragState(false);
            this.handleFiles(Array.from(e.dataTransfer.files));
        });
    }

    /**
     * Bind preset events
     */
    bindPresetEvents() {
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.preset-load-btn')) {
                const card = e.target.closest('.preset-card');
                const preset = card.dataset.preset;
                this.loadPreset(preset);
            }
        });
    }

    /**
     * Bind URL import events
     */
    bindUrlImportEvents() {
        const importBtn = this.container.querySelector('#import-url-btn');
        const urlInput = this.container.querySelector('#url-input');

        if (importBtn && urlInput) {
            importBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) {
                    this.importFromUrl(url);
                }
            });

            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = urlInput.value.trim();
                    if (url) {
                        this.importFromUrl(url);
                    }
                }
            });
        }

        // Example URL clicks
        this.container.addEventListener('click', (e) => {
            if (e.target.dataset.url) {
                e.preventDefault();
                if (urlInput) {
                    urlInput.value = e.target.dataset.url;
                }
            }
        });
    }

    /**
     * Bind clipboard events
     */
    bindClipboardEvents() {
        const processBtn = this.container.querySelector('#process-clipboard-btn');
        const clearBtn = this.container.querySelector('#clear-clipboard-btn');
        const textarea = this.container.querySelector('#clipboard-textarea');

        if (processBtn && textarea) {
            processBtn.addEventListener('click', () => {
                const data = textarea.value.trim();
                if (data) {
                    this.processClipboardData(data);
                }
            });
        }

        if (clearBtn && textarea) {
            clearBtn.addEventListener('click', () => {
                textarea.value = '';
            });
        }
    }

    /**
     * Bind file list events
     */
    bindFileListEvents() {
        this.container.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.file-action-btn');
            if (actionBtn) {
                const fileItem = actionBtn.closest('.file-item');
                const fileIndex = parseInt(fileItem.dataset.fileIndex);
                const action = actionBtn.dataset.action;
                
                switch (action) {
                    case 'preview':
                        this.previewFile(fileIndex);
                        break;
                    case 'remove':
                        this.removeFile(fileIndex);
                        break;
                }
            }
        });
    }

    /**
     * Bind preview events
     */
    bindPreviewEvents() {
        const confirmBtn = this.container.querySelector('#confirm-data-btn');
        const cancelBtn = this.container.querySelector('#cancel-preview-btn');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmData();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelPreview();
            });
        }
    }

    /**
     * Setup clipboard support
     */
    setupClipboardSupport() {
        if (!this.config.enableClipboard) return;

        // Listen for paste events globally
        document.addEventListener('paste', (e) => {
            if (this.container.contains(e.target)) {
                const clipboardData = e.clipboardData?.getData('text');
                if (clipboardData && this.isValidClipboardData(clipboardData)) {
                    this.switchTab('clipboard');
                    const textarea = this.container.querySelector('#clipboard-textarea');
                    if (textarea) {
                        textarea.value = clipboardData;
                    }
                }
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        this.container.querySelectorAll('.uploader-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.container.querySelectorAll('.uploader-tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tabContent === tabName);
        });
    }

    /**
     * Handle file selection
     */
    async handleFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showError('No valid files selected');
            return;
        }

        for (const file of validFiles) {
            const fileObj = {
                file,
                name: file.name,
                size: file.size,
                type: this.getFileType(file.name),
                status: 'pending',
                data: null,
                recordCount: null,
                error: null
            };

            this.state.files.push(fileObj);
        }

        this.updateFileList();

        if (this.config.autoProcess) {
            await this.processAllFiles();
        }
    }

    /**
     * Validate file
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            this.showError(`File ${file.name} is too large (max ${this.formatFileSize(this.config.maxFileSize)})`);
            return false;
        }

        // Check file type
        const fileType = this.getFileType(file.name);
        if (!this.config.acceptedTypes.includes(fileType)) {
            this.showError(`File type ${fileType} is not supported`);
            return false;
        }

        // Check file count
        if (this.state.files.length >= this.config.maxFiles) {
            this.showError(`Maximum ${this.config.maxFiles} files allowed`);
            return false;
        }

        return true;
    }

    /**
     * Process all files
     */
    async processAllFiles() {
        this.state.isProcessing = true;
        this.showProgress();

        for (let i = 0; i < this.state.files.length; i++) {
            const fileObj = this.state.files[i];
            
            if (fileObj.status === 'pending') {
                try {
                    this.updateProgress((i / this.state.files.length) * 100);
                    await this.processFile(fileObj);
                } catch (error) {
                    fileObj.status = 'error';
                    fileObj.error = error.message;
                    console.error('File processing error:', error);
                }
            }
        }

        this.updateProgress(100);
        this.state.isProcessing = false;
        this.hideProgress();
        this.updateFileList();

        // Auto-select first successful file
        const successfulFile = this.state.files.find(f => f.status === 'success');
        if (successfulFile && this.config.showPreview) {
            this.previewFileData(successfulFile.data);
        }
    }

    /**
     * Process individual file
     */
    async processFile(fileObj) {
        try {
            fileObj.status = 'processing';
            this.updateFileList();

            const text = await this.readFileAsText(fileObj.file);
            const processor = this.processors[fileObj.type];
            
            if (!processor) {
                throw new Error(`No processor available for ${fileObj.type} files`);
            }

            const data = await processor(text, fileObj);
            
            if (!data || data.length === 0) {
                throw new Error('No valid data found in file');
            }

            fileObj.data = data;
            fileObj.recordCount = data.length;
            fileObj.status = 'success';

            this.triggerCallback('onFileProcess', fileObj);

        } catch (error) {
            fileObj.status = 'error';
            fileObj.error = error.message;
            throw error;
        }
    }

    /**
     * Process CSV file
     */
    async processCSV(text, fileObj) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least header and one data row');
        }

        // Detect delimiter
        const delimiter = this.detectCSVDelimiter(lines[0]);
        
        // Parse header
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
        
        // Find x and y columns
        const xCol = this.findColumn(headers, ['x', 'longitude', 'lng', 'lon', 'x_coord']);
        const yCol = this.findColumn(headers, ['y', 'latitude', 'lat', 'y_coord']);
        
        if (xCol === -1 || yCol === -1) {
            throw new Error('Could not find x and y columns. Expected columns named: x, y, longitude, latitude, etc.');
        }

        const data = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
            
            if (values.length !== headers.length) {
                errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
                continue;
            }

            const x = parseFloat(values[xCol]);
            const y = parseFloat(values[yCol]);

            if (isNaN(x) || isNaN(y)) {
                errors.push(`Row ${i + 1}: Invalid x or y value`);
                continue;
            }

            const point = {
                x,
                y,
                id: data.length,
                cluster: -1
            };

            // Add additional features if available
            headers.forEach((header, index) => {
                if (index !== xCol && index !== yCol) {
                    const value = values[index];
                    if (value && !isNaN(value)) {
                        point[header] = parseFloat(value);
                    } else if (value) {
                        point[header] = value;
                    }
                }
            });

            data.push(point);
        }

        if (errors.length > 0 && errors.length === lines.length - 1) {
            throw new Error(`All rows failed validation: ${errors[0]}`);
        }

        if (data.length === 0) {
            throw new Error('No valid data points found');
        }

        return data;
    }

    /**
     * Process JSON file
     */
    async processJSON(text, fileObj) {
        let json;
        try {
            json = JSON.parse(text);
        } catch (error) {
            throw new Error('Invalid JSON format');
        }

        let data = [];

        if (Array.isArray(json)) {
            data = json;
        } else if (json.data && Array.isArray(json.data)) {
            data = json.data;
        } else if (json.points && Array.isArray(json.points)) {
            data = json.points;
        } else {
            throw new Error('JSON must contain an array of data points');
        }

        // Normalize data points
        const normalizedData = data.map((point, index) => {
            let x, y;

            if (typeof point === 'object' && point !== null) {
                x = point.x ?? point.longitude ?? point.lng ?? point[0];
                y = point.y ?? point.latitude ?? point.lat ?? point[1];
            } else if (Array.isArray(point)) {
                x = point[0];
                y = point[1];
            } else {
                throw new Error(`Invalid data point at index ${index}`);
            }

            if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                throw new Error(`Invalid x or y value at index ${index}`);
            }

            return {
                x,
                y,
                id: index,
                cluster: -1,
                ...point
            };
        });

        return normalizedData;
    }

    /**
     * Process TXT file
     */
    async processTXT(text, fileObj) {
        const lines = text.trim().split('\n');
        const data = [];
        const errors = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(/\s+/);
            
            if (values.length < 2) {
                errors.push(`Line ${i + 1}: Need at least 2 values per line`);
                continue;
            }

            const x = parseFloat(values[0]);
            const y = parseFloat(values[1]);

            if (isNaN(x) || isNaN(y)) {
                errors.push(`Line ${i + 1}: Invalid x or y value`);
                continue;
            }

            const point = { x, y, id: data.length, cluster: -1 };

            // Add additional values if present
            for (let j = 2; j < values.length; j++) {
                const value = parseFloat(values[j]);
                if (!isNaN(value)) {
                    point[`feature_${j - 1}`] = value;
                }
            }

            data.push(point);
        }

        if (data.length === 0) {
            throw new Error('No valid data points found');
        }

        return data;
    }

    /**
     * Process Excel file
     */
    async processExcel(text, fileObj) {
        // This would require a library like SheetJS
        // For now, we'll throw an error suggesting CSV export
        throw new Error('Excel files not yet supported. Please export as CSV format.');
    }

    /**
     * Load preset data
     */
    async loadPreset(presetKey) {
        try {
            this.showProgress();
            this.updateProgress(30, 'Loading preset...');

            const url = this.config.presets[presetKey];
            if (!url) {
                throw new Error(`Preset ${presetKey} not found`);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load preset: ${response.statusText}`);
            }

            this.updateProgress(70, 'Processing data...');

            const text = await response.text();
            const data = await this.processCSV(text, { name: presetKey, type: 'csv' });

            this.updateProgress(100, 'Complete');
            this.hideProgress();

            if (this.config.showPreview) {
                this.previewFileData(data, `${presetKey} dataset`);
            } else {
                this.state.processedData = data;
                this.triggerCallback('onDataReady', data);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(`Failed to load preset: ${error.message}`);
        }
    }

    /**
     * Import data from URL
     */
    async importFromUrl(url) {
        try {
            this.showProgress();
            this.updateProgress(20, 'Fetching data...');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.updateProgress(60, 'Processing data...');

            const text = await response.text();
            const filename = url.split('/').pop() || 'data';
            const fileType = this.getFileType(filename);
            
            const processor = this.processors[fileType];
            if (!processor) {
                throw new Error(`Unsupported file type: ${fileType}`);
            }

            const data = await processor(text, { name: filename, type: fileType });

            this.updateProgress(100, 'Complete');
            this.hideProgress();

            if (this.config.showPreview) {
                this.previewFileData(data, `Data from ${url}`);
            } else {
                this.state.processedData = data;
                this.triggerCallback('onDataReady', data);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(`Failed to import from URL: ${error.message}`);
        }
    }

    /**
     * Process clipboard data
     */
    async processClipboardData(text) {
        try {
            this.showProgress();
            this.updateProgress(50, 'Processing clipboard data...');

            let data;

            // Try to detect format
            if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
                // Looks like JSON
                data = await this.processJSON(text, { name: 'clipboard', type: 'json' });
            } else if (text.includes(',') || text.includes('\t')) {
                // Looks like CSV or TSV
                data = await this.processCSV(text, { name: 'clipboard', type: 'csv' });
            } else {
                // Try as space-separated
                data = await this.processTXT(text, { name: 'clipboard', type: 'txt' });
            }

            this.updateProgress(100, 'Complete');
            this.hideProgress();

            if (this.config.showPreview) {
                this.previewFileData(data, 'Clipboard data');
            } else {
                this.state.processedData = data;
                this.triggerCallback('onDataReady', data);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(`Failed to process clipboard data: ${error.message}`);
        }
    }

    /**
     * Preview file data
     */
    previewFileData(data, title = 'Data Preview') {
        this.state.previewData = data;
        
        const preview = this.container.querySelector('#data-preview');
        const stats = this.container.querySelector('#preview-stats');
        const content = this.container.querySelector('#preview-content');

        if (preview && stats && content) {
            // Update stats
            const features = Object.keys(data[0] || {}).filter(k => k !== 'id' && k !== 'cluster');
            stats.innerHTML = `
                <span class="preview-stat">
                    <strong>${data.length}</strong> points
                </span>
                <span class="preview-stat">
                    <strong>${features.length}</strong> features
                </span>
            `;

            // Update content with sample data
            content.innerHTML = this.renderDataTable(data.slice(0, 10));

            preview.style.display = 'block';
        }
    }

    /**
     * Render data table for preview
     */
    renderDataTable(data) {
        if (!data || data.length === 0) return '<p>No data to preview</p>';

        const headers = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'cluster');
        
        return `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${headers.map(h => `<td>${this.formatCellValue(row[h])}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${data.length > 10 ? `<p class="preview-note">Showing first 10 of ${data.length} rows</p>` : ''}
            </div>
        `;
    }

    /**
     * Confirm data selection
     */
    confirmData() {
        if (this.state.previewData) {
            this.state.processedData = this.state.previewData;
            this.triggerCallback('onDataReady', this.state.previewData);
            this.cancelPreview();
        }
    }

    /**
     * Cancel data preview
     */
    cancelPreview() {
        const preview = this.container.querySelector('#data-preview');
        if (preview) {
            preview.style.display = 'none';
        }
        this.state.previewData = null;
    }

    /**
     * Remove file from list
     */
    removeFile(index) {
        if (index >= 0 && index < this.state.files.length) {
            const file = this.state.files[index];
            this.state.files.splice(index, 1);
            this.updateFileList();
            this.triggerCallback('onFileRemove', file);
        }
    }

    /**
     * Preview specific file
     */
    previewFile(index) {
        const file = this.state.files[index];
        if (file && file.data) {
            this.previewFileData(file.data, file.name);
        }
    }

    /**
     * Helper methods
     */

    setDragState(isDragging) {
        this.state.isDragOver = isDragging;
        const uploadZone = this.container.querySelector('#upload-zone');
        if (uploadZone) {
            uploadZone.classList.toggle('dragover', isDragging);
        }
    }

    showProgress() {
        const progress = this.container.querySelector('#upload-progress');
        if (progress) {
            progress.style.display = 'block';
        }
    }

    hideProgress() {
        setTimeout(() => {
            const progress = this.container.querySelector('#upload-progress');
            if (progress) {
                progress.style.display = 'none';
            }
        }, 1000);
    }

    updateProgress(percent, message = 'Processing...') {
        const fill = this.container.querySelector('#progress-fill');
        const percentLabel = this.container.querySelector('#progress-percent');
        
        if (fill) {
            fill.style.width = `${percent}%`;
        }
        
        if (percentLabel) {
            percentLabel.textContent = `${Math.round(percent)}%`;
        }

        this.triggerCallback('onProgress', { percent, message });
    }

    updateFileList() {
        const fileList = this.container.querySelector('#file-list');
        if (fileList) {
            fileList.innerHTML = this.renderFileList();
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    getFileType(filename) {
        const extension = filename.split('.').pop()?.toLowerCase();
        return this.config.acceptedTypes.includes(extension) ? extension : 'unknown';
    }

    getFileIcon(type) {
        const icons = {
            csv: '📊',
            json: '📋',
            txt: '📄',
            xlsx: '📗',
            xls: '📗'
        };
        return icons[type] || '📁';
    }

    getFileStatusIcon(status) {
        const icons = {
            pending: '⏳',
            processing: '⚙️',
            success: '✅',
            error: '❌'
        };
        return icons[status] || '❓';
    }

    detectCSVDelimiter(line) {
        const delimiters = [',', ';', '\t', '|'];
        let maxCount = 0;
        let bestDelimiter = ',';

        for (const delimiter of delimiters) {
            const count = (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delimiter;
            }
        }

        return bestDelimiter;
    }

    findColumn(headers, candidates) {
        for (const candidate of candidates) {
            const index = headers.findIndex(h => 
                h.toLowerCase().includes(candidate.toLowerCase())
            );
            if (index !== -1) return index;
        }
        return -1;
    }

    isValidClipboardData(text) {
        // Basic validation for clipboard data
        return text.length > 10 && (
            text.includes(',') || 
            text.includes('\t') || 
            text.includes('[') || 
            text.includes('{')
        );
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    formatCellValue(value) {
        if (typeof value === 'number') {
            return value % 1 === 0 ? value : value.toFixed(3);
        }
        return value || '';
    }

    triggerCallback(eventName, data) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName](data);
        }

        // Also trigger custom event
        const event = new CustomEvent(`dataUploader:${eventName.replace('on', '').toLowerCase()}`, {
            detail: data
        });
        this.container.dispatchEvent(event);

        if (CONFIG.IS_DEV) {
            console.log(`📁 DataUploader Event:`, eventName, data);
        }
    }

    showError(message) {
        console.error('DataUploader error:', message);
        
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.show(message, 'error');
        }
        
        this.triggerCallback('onError', { message });
    }

    /**
     * Public API methods
     */

    on(event, callback) {
        const eventMap = {
            'fileadd': 'onFileAdd',
            'fileremove': 'onFileRemove',
            'fileprocess': 'onFileProcess',
            'dataready': 'onDataReady',
            'error': 'onError',
            'progress': 'onProgress'
        };

        const callbackName = eventMap[event];
        if (callbackName) {
            this.callbacks[callbackName] = callback;
        }
    }

    clear() {
        this.state.files = [];
        this.state.processedData = null;
        this.state.previewData = null;
        this.updateFileList();
        this.cancelPreview();
    }

    getData() {
        return this.state.processedData;
    }

    getFiles() {
        return [...this.state.files];
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('DataUploader error:', error);
        
        this.container.innerHTML = `
            <div class="upload-error">
                <div style="text-align: center; color: var(--color-error-500); padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <div>Data Uploader Error</div>
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
        console.log('🧹 Cleaning up DataUploader...');
        
        // Clear state
        this.state.files = [];
        this.state.processedData = null;
        this.state.previewData = null;
        
        // Clear callbacks
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
        
        // Clear container
        this.container.innerHTML = '';
    }
}