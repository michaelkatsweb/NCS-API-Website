/**
 * NCS-API Website - API Explorer Component
 * Interactive API documentation and testing tool
 * 
 * Features:
 * - Live API endpoint testing
 * - Request/response viewer
 * - Code generation for multiple languages
 * - Authentication handling
 * - Response caching
 */

import { EventBus } from '../core/eventBus.js';
import { APIClient } from '../api/client.js';
import { CodeGenerator } from './CodeGenerator.js';
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';

export class ApiExplorer {
    constructor(container) {
        this.container = container;
        this.apiClient = new APIClient();
        this.eventBus = EventBus.getInstance();
        this.codeGenerator = new CodeGenerator();
        
        this.state = {
            currentEndpoint: null,
            requestData: {},
            responseData: null,
            isLoading: false,
            authToken: localStorage.getItem('ncs_api_token') || '',
            selectedLanguage: 'javascript',
            history: JSON.parse(localStorage.getItem('api_explorer_history') || '[]')
        };

        // API endpoints configuration
        this.endpoints = {
            clustering: {
                path: '/api/v1/cluster',
                method: 'POST',
                title: 'Cluster Data',
                description: 'Perform clustering analysis on your dataset',
                parameters: {
                    required: [
                        { name: 'data', type: 'array', description: 'Array of data points to cluster' },
                        { name: 'algorithm', type: 'string', description: 'Clustering algorithm (ncs, kmeans, dbscan)' }
                    ],
                    optional: [
                        { name: 'clusters', type: 'number', description: 'Number of clusters (default: 3)' },
                        { name: 'iterations', type: 'number', description: 'Maximum iterations (default: 100)' },
                        { name: 'tolerance', type: 'number', description: 'Convergence tolerance (default: 0.001)' }
                    ]
                },
                example: {
                    data: [[1, 2], [3, 4], [5, 6], [7, 8]],
                    algorithm: 'ncs',
                    clusters: 2,
                    iterations: 100
                }
            },
            status: {
                path: '/api/v1/status',
                method: 'GET',
                title: 'API Status',
                description: 'Check API health and performance metrics',
                parameters: {
                    required: [],
                    optional: []
                },
                example: {}
            },
            data: {
                path: '/api/v1/data/sample/{dataset}',
                method: 'GET',
                title: 'Sample Data',
                description: 'Retrieve sample datasets for testing',
                parameters: {
                    required: [
                        { name: 'dataset', type: 'string', description: 'Dataset name (iris, customers, financial)' }
                    ],
                    optional: [
                        { name: 'format', type: 'string', description: 'Response format (json, csv)' },
                        { name: 'limit', type: 'number', description: 'Maximum number of rows to return' }
                    ]
                },
                example: {}
            },
            analytics: {
                path: '/api/v1/analytics/metrics',
                method: 'GET',
                title: 'Performance Metrics',
                description: 'Get clustering performance and quality metrics',
                parameters: {
                    required: [],
                    optional: [
                        { name: 'timeframe', type: 'string', description: 'Time period (1h, 24h, 7d, 30d)' },
                        { name: 'algorithm', type: 'string', description: 'Filter by algorithm' }
                    ]
                },
                example: {}
            }
        };

        this.init();
    }

    /**
     * Initialize the API Explorer
     */
    init() {
        this.createLayout();
        this.bindEvents();
        this.loadDefaultEndpoint();
        
        console.log('🔧 API Explorer initialized');
    }

    /**
     * Create the API Explorer layout
     */
    createLayout() {
        this.container.innerHTML = `
            <div class="api-explorer">
                <!-- Sidebar: Endpoints List -->
                <div class="api-sidebar">
                    <div class="sidebar-header">
                        <h3>📡 API Endpoints</h3>
                        <div class="api-status">
                            <span class="status-indicator" id="api-status-indicator"></span>
                            <span class="status-text" id="api-status-text">Checking...</span>
                        </div>
                    </div>
                    
                    <div class="endpoints-list" id="endpoints-list">
                        ${this.renderEndpointsList()}
                    </div>
                    
                    <!-- Authentication Section -->
                    <div class="auth-section">
                        <h4>🔐 Authentication</h4>
                        <div class="auth-controls">
                            <input 
                                type="password" 
                                id="auth-token-input" 
                                placeholder="API Token (optional)"
                                value="${this.state.authToken}"
                                class="form-input"
                            >
                            <button class="btn btn-sm" id="save-token-btn">Save</button>
                        </div>
                        <p class="auth-note">
                            API token is optional for testing. 
                            <a href="#" id="get-token-link">Get your token</a>
                        </p>
                    </div>
                </div>

                <!-- Main Content: Request/Response -->
                <div class="api-main">
                    <!-- Request Section -->
                    <div class="request-section">
                        <div class="section-header">
                            <div class="endpoint-info">
                                <h3 id="endpoint-title">Select an endpoint</h3>
                                <div class="endpoint-meta">
                                    <span class="method-badge" id="endpoint-method">GET</span>
                                    <code class="endpoint-path" id="endpoint-path">/api/v1/</code>
                                </div>
                            </div>
                            
                            <div class="request-actions">
                                <button class="btn btn-outline" id="clear-request-btn">Clear</button>
                                <button class="btn btn-primary" id="send-request-btn" disabled>
                                    <span class="btn-text">Send Request</span>
                                    <div class="btn-spinner" style="display: none;"></div>
                                </button>
                            </div>
                        </div>

                        <div class="endpoint-description" id="endpoint-description">
                            Select an endpoint from the sidebar to get started
                        </div>

                        <!-- Request Parameters -->
                        <div class="request-params" id="request-params" style="display: none;">
                            <h4>Parameters</h4>
                            <div class="params-grid" id="params-grid"></div>
                        </div>

                        <!-- Request Body Editor -->
                        <div class="request-body" id="request-body" style="display: none;">
                            <div class="body-header">
                                <h4>Request Body</h4>
                                <div class="body-controls">
                                    <select id="content-type-select" class="form-select">
                                        <option value="application/json">JSON</option>
                                        <option value="application/x-www-form-urlencoded">Form Data</option>
                                        <option value="multipart/form-data">Multipart</option>
                                    </select>
                                    <button class="btn btn-sm" id="format-json-btn">Format</button>
                                    <button class="btn btn-sm" id="load-example-btn">Load Example</button>
                                </div>
                            </div>
                            
                            <div class="code-editor">
                                <textarea 
                                    id="request-body-editor" 
                                    class="code-textarea"
                                    placeholder="Enter request body (JSON format)"
                                    rows="10"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Response Section -->
                    <div class="response-section">
                        <div class="section-header">
                            <h4>📋 Response</h4>
                            <div class="response-actions">
                                <select id="language-select" class="form-select">
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="curl">cURL</option>
                                    <option value="php">PHP</option>
                                    <option value="java">Java</option>
                                </select>
                                <button class="btn btn-sm" id="generate-code-btn">Generate Code</button>
                                <button class="btn btn-sm" id="copy-response-btn" disabled>Copy</button>
                            </div>
                        </div>

                        <div class="response-content">
                            <div class="response-placeholder" id="response-placeholder">
                                <svg class="placeholder-icon" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <p>Send a request to see the response</p>
                            </div>

                            <div class="response-data" id="response-data" style="display: none;">
                                <!-- Response Headers -->
                                <div class="response-headers">
                                    <div class="response-meta">
                                        <span class="status-code" id="response-status">200</span>
                                        <span class="response-time" id="response-time">0ms</span>
                                        <span class="response-size" id="response-size">0B</span>
                                    </div>
                                    
                                    <div class="headers-toggle">
                                        <button class="btn btn-sm" id="toggle-headers-btn">
                                            Headers <span class="toggle-icon">▼</span>
                                        </button>
                                    </div>
                                </div>

                                <div class="headers-content" id="headers-content" style="display: none;">
                                    <pre id="response-headers-data"></pre>
                                </div>

                                <!-- Response Body -->
                                <div class="response-body">
                                    <pre id="response-body-data"></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Panel -->
                <div class="history-panel" id="history-panel">
                    <div class="panel-header">
                        <h4>📜 Request History</h4>
                        <div class="panel-actions">
                            <button class="btn btn-sm" id="clear-history-btn">Clear</button>
                            <button class="btn btn-sm" id="toggle-history-btn">Hide</button>
                        </div>
                    </div>
                    
                    <div class="history-list" id="history-list">
                        ${this.renderHistoryList()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render endpoints list
     */
    renderEndpointsList() {
        return Object.entries(this.endpoints).map(([key, endpoint]) => `
            <div class="endpoint-item" data-endpoint="${key}">
                <div class="endpoint-header">
                    <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <span class="endpoint-title">${endpoint.title}</span>
                </div>
                <div class="endpoint-path">${endpoint.path}</div>
                <div class="endpoint-desc">${endpoint.description}</div>
            </div>
        `).join('');
    }

    /**
     * Render history list
     */
    renderHistoryList() {
        if (this.state.history.length === 0) {
            return '<div class="history-empty">No requests yet</div>';
        }

        return this.state.history.slice(-10).reverse().map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-header">
                    <span class="method-badge method-${item.method.toLowerCase()}">${item.method}</span>
                    <span class="history-path">${item.path}</span>
                    <span class="history-status status-${Math.floor(item.status / 100)}">${item.status}</span>
                </div>
                <div class="history-meta">
                    <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                    <span class="history-duration">${item.duration}ms</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Endpoint selection
        document.addEventListener('click', (e) => {
            const endpointItem = e.target.closest('.endpoint-item');
            if (endpointItem) {
                this.selectEndpoint(endpointItem.dataset.endpoint);
            }
        });

        // Send request button
        document.getElementById('send-request-btn').addEventListener('click', () => {
            this.sendRequest();
        });

        // Clear request button
        document.getElementById('clear-request-btn').addEventListener('click', () => {
            this.clearRequest();
        });

        // Load example button
        document.getElementById('load-example-btn').addEventListener('click', () => {
            this.loadExample();
        });

        // Format JSON button
        document.getElementById('format-json-btn').addEventListener('click', () => {
            this.formatJSON();
        });

        // Generate code button
        document.getElementById('generate-code-btn').addEventListener('click', () => {
            this.generateCode();
        });

        // Copy response button
        document.getElementById('copy-response-btn').addEventListener('click', () => {
            this.copyResponse();
        });

        // Save token button
        document.getElementById('save-token-btn').addEventListener('click', () => {
            this.saveAuthToken();
        });

        // Toggle headers button
        document.getElementById('toggle-headers-btn').addEventListener('click', () => {
            this.toggleHeaders();
        });

        // Toggle history panel
        document.getElementById('toggle-history-btn').addEventListener('click', () => {
            this.toggleHistoryPanel();
        });

        // Clear history button
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Language selection
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.state.selectedLanguage = e.target.value;
        });

        // History item click
        document.addEventListener('click', (e) => {
            const historyItem = e.target.closest('.history-item');
            if (historyItem) {
                this.loadFromHistory(historyItem.dataset.index);
            }
        });

        // Request body editor changes
        document.getElementById('request-body-editor').addEventListener('input', () => {
            this.validateRequest();
        });
    }

    /**
     * Load default endpoint
     */
    loadDefaultEndpoint() {
        this.selectEndpoint('status');
        this.checkApiStatus();
    }

    /**
     * Select an endpoint
     */
    selectEndpoint(endpointKey) {
        const endpoint = this.endpoints[endpointKey];
        if (!endpoint) return;

        this.state.currentEndpoint = { key: endpointKey, ...endpoint };

        // Update UI
        document.getElementById('endpoint-title').textContent = endpoint.title;
        document.getElementById('endpoint-method').textContent = endpoint.method;
        document.getElementById('endpoint-method').className = `method-badge method-${endpoint.method.toLowerCase()}`;
        document.getElementById('endpoint-path').textContent = endpoint.path;
        document.getElementById('endpoint-description').textContent = endpoint.description;

        // Update active state
        document.querySelectorAll('.endpoint-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-endpoint="${endpointKey}"]`).classList.add('active');

        // Show/hide sections based on method
        const showBody = endpoint.method !== 'GET';
        document.getElementById('request-body').style.display = showBody ? 'block' : 'none';
        document.getElementById('request-params').style.display = 'block';

        // Render parameters
        this.renderParameters();

        // Enable send button
        document.getElementById('send-request-btn').disabled = false;

        // Load example if available
        if (endpoint.example && Object.keys(endpoint.example).length > 0) {
            document.getElementById('request-body-editor').value = 
                JSON.stringify(endpoint.example, null, 2);
        }

        this.validateRequest();
    }

    /**
     * Render endpoint parameters
     */
    renderParameters() {
        const endpoint = this.state.currentEndpoint;
        const paramsGrid = document.getElementById('params-grid');

        if (!endpoint.parameters.required.length && !endpoint.parameters.optional.length) {
            paramsGrid.innerHTML = '<p class="no-params">No parameters required</p>';
            return;
        }

        const paramsHTML = [
            ...endpoint.parameters.required.map(param => this.renderParameter(param, true)),
            ...endpoint.parameters.optional.map(param => this.renderParameter(param, false))
        ].join('');

        paramsGrid.innerHTML = paramsHTML;
    }

    /**
     * Render individual parameter
     */
    renderParameter(param, required) {
        return `
            <div class="param-row">
                <div class="param-info">
                    <span class="param-name">${param.name}</span>
                    ${required ? '<span class="param-required">*</span>' : ''}
                    <span class="param-type">${param.type}</span>
                </div>
                <div class="param-description">${param.description}</div>
                <input 
                    type="text" 
                    class="param-input" 
                    data-param="${param.name}"
                    placeholder="Enter ${param.name}"
                    ${required ? 'required' : ''}
                >
            </div>
        `;
    }

    /**
     * Send API request
     */
    async sendRequest() {
        if (!this.state.currentEndpoint) return;

        this.state.isLoading = true;
        this.updateSendButton(true);

        const startTime = Date.now();

        try {
            // Prepare request
            const request = this.prepareRequest();
            
            // Send request via API client
            const response = await this.apiClient.request(request);
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Handle response
            this.handleResponse(response, duration);

            // Add to history
            this.addToHistory(request, response, duration);

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.handleError(error, duration);
            
            // Add error to history
            this.addToHistory(this.prepareRequest(), { status: 0, error: error.message }, duration);
        } finally {
            this.state.isLoading = false;
            this.updateSendButton(false);
        }
    }

    /**
     * Prepare request object
     */
    prepareRequest() {
        const endpoint = this.state.currentEndpoint;
        let url = endpoint.path;

        // Replace path parameters
        const pathParams = url.match(/\{([^}]+)\}/g);
        if (pathParams) {
            pathParams.forEach(param => {
                const paramName = param.slice(1, -1);
                const input = document.querySelector(`[data-param="${paramName}"]`);
                if (input && input.value) {
                    url = url.replace(param, input.value);
                }
            });
        }

        const request = {
            method: endpoint.method,
            url: url,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add auth token if provided
        if (this.state.authToken) {
            request.headers['Authorization'] = `Bearer ${this.state.authToken}`;
        }

        // Add request body for non-GET requests
        if (endpoint.method !== 'GET') {
            const bodyText = document.getElementById('request-body-editor').value.trim();
            if (bodyText) {
                try {
                    request.body = JSON.parse(bodyText);
                } catch (e) {
                    throw new Error('Invalid JSON in request body');
                }
            }
        }

        // Add query parameters
        const queryParams = new URLSearchParams();
        document.querySelectorAll('.param-input').forEach(input => {
            if (input.value && !url.includes(`{${input.dataset.param}}`)) {
                queryParams.append(input.dataset.param, input.value);
            }
        });

        if (queryParams.toString()) {
            request.url += '?' + queryParams.toString();
        }

        return request;
    }

    /**
     * Handle successful response
     */
    handleResponse(response, duration) {
        this.state.responseData = response;

        // Show response section
        document.getElementById('response-placeholder').style.display = 'none';
        document.getElementById('response-data').style.display = 'block';

        // Update response meta
        document.getElementById('response-status').textContent = response.status || 200;
        document.getElementById('response-status').className = `status-code status-${Math.floor((response.status || 200) / 100)}`;
        document.getElementById('response-time').textContent = `${duration}ms`;
        document.getElementById('response-size').textContent = this.formatBytes(JSON.stringify(response.data || {}).length);

        // Update response headers
        const headersText = response.headers ? 
            Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\n') :
            'No headers available';
        document.getElementById('response-headers-data').textContent = headersText;

        // Update response body
        const bodyText = JSON.stringify(response.data || response, null, 2);
        document.getElementById('response-body-data').textContent = bodyText;

        // Enable copy button
        document.getElementById('copy-response-btn').disabled = false;

        Toast.show('Request completed successfully', 'success');
    }

    /**
     * Handle request error
     */
    handleError(error, duration) {
        // Show response section with error
        document.getElementById('response-placeholder').style.display = 'none';
        document.getElementById('response-data').style.display = 'block';

        // Update response meta
        document.getElementById('response-status').textContent = error.status || 'ERROR';
        document.getElementById('response-status').className = 'status-code status-error';
        document.getElementById('response-time').textContent = `${duration}ms`;
        document.getElementById('response-size').textContent = '0B';

        // Update response body with error
        const errorText = JSON.stringify({
            error: error.message,
            status: error.status || 0,
            timestamp: new Date().toISOString()
        }, null, 2);
        document.getElementById('response-body-data').textContent = errorText;

        Toast.show(`Request failed: ${error.message}`, 'error');
    }

    /**
     * Add request to history
     */
    addToHistory(request, response, duration) {
        const historyItem = {
            timestamp: Date.now(),
            method: request.method,
            path: request.url,
            status: response.status || 0,
            duration: duration,
            request: request,
            response: response
        };

        this.state.history.push(historyItem);
        
        // Keep only last 50 items
        if (this.state.history.length > 50) {
            this.state.history = this.state.history.slice(-50);
        }

        // Save to localStorage
        localStorage.setItem('api_explorer_history', JSON.stringify(this.state.history));

        // Update history UI
        document.getElementById('history-list').innerHTML = this.renderHistoryList();
    }

    /**
     * Generate code for current request
     */
    generateCode() {
        if (!this.state.currentEndpoint) return;

        const request = this.prepareRequest();
        const code = this.codeGenerator.generate(request, this.state.selectedLanguage);

        const modal = new Modal({
            title: `${this.state.selectedLanguage.toUpperCase()} Code`,
            content: `
                <div class="code-modal">
                    <div class="code-header">
                        <span>Copy this code to make the same request:</span>
                        <button class="btn btn-sm" id="copy-code-btn">Copy Code</button>
                    </div>
                    <pre class="code-block"><code id="generated-code">${code}</code></pre>
                </div>
            `,
            size: 'large'
        });

        modal.show();

        // Handle copy code
        modal.container.querySelector('#copy-code-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(code);
            Toast.show('Code copied to clipboard', 'success');
        });
    }

    /**
     * Check API status
     */
    async checkApiStatus() {
        try {
            const response = await this.apiClient.get('/api/v1/status');
            this.updateApiStatus('online', 'API Online');
        } catch (error) {
            this.updateApiStatus('offline', 'API Offline');
        }
    }

    /**
     * Update API status indicator
     */
    updateApiStatus(status, text) {
        const indicator = document.getElementById('api-status-indicator');
        const statusText = document.getElementById('api-status-text');
        
        indicator.className = `status-indicator status-${status}`;
        statusText.textContent = text;
    }

    /**
     * Utility methods
     */
    updateSendButton(loading) {
        const btn = document.getElementById('send-request-btn');
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.btn-spinner');
        
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.style.display = loading ? 'inline-block' : 'none';
    }

    clearRequest() {
        document.getElementById('request-body-editor').value = '';
        document.querySelectorAll('.param-input').forEach(input => input.value = '');
        this.validateRequest();
    }

    loadExample() {
        if (this.state.currentEndpoint && this.state.currentEndpoint.example) {
            document.getElementById('request-body-editor').value = 
                JSON.stringify(this.state.currentEndpoint.example, null, 2);
        }
    }

    formatJSON() {
        const editor = document.getElementById('request-body-editor');
        try {
            const parsed = JSON.parse(editor.value);
            editor.value = JSON.stringify(parsed, null, 2);
        } catch (e) {
            Toast.show('Invalid JSON format', 'error');
        }
    }

    copyResponse() {
        const responseText = document.getElementById('response-body-data').textContent;
        navigator.clipboard.writeText(responseText);
        Toast.show('Response copied to clipboard', 'success');
    }

    saveAuthToken() {
        const token = document.getElementById('auth-token-input').value;
        this.state.authToken = token;
        localStorage.setItem('ncs_api_token', token);
        Toast.show('API token saved', 'success');
    }

    toggleHeaders() {
        const content = document.getElementById('headers-content');
        const btn = document.getElementById('toggle-headers-btn');
        const icon = btn.querySelector('.toggle-icon');
        
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        icon.textContent = isVisible ? '▼' : '▲';
    }

    toggleHistoryPanel() {
        const panel = document.getElementById('history-panel');
        const btn = document.getElementById('toggle-history-btn');
        
        panel.classList.toggle('collapsed');
        btn.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
    }

    clearHistory() {
        this.state.history = [];
        localStorage.removeItem('api_explorer_history');
        document.getElementById('history-list').innerHTML = this.renderHistoryList();
        Toast.show('History cleared', 'info');
    }

    validateRequest() {
        // Basic validation logic
        const sendBtn = document.getElementById('send-request-btn');
        const hasEndpoint = !!this.state.currentEndpoint;
        
        sendBtn.disabled = !hasEndpoint || this.state.isLoading;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
    }

    /**
     * Cleanup component
     */
    destroy() {
        console.log('🔧 API Explorer destroyed');
    }
}