// File: docs.js
// Path: js/pages/docs.js
// Documentation page logic for NCS-API-Website
// Handles API documentation, interactive examples, code generation, and developer tools

import { EventBus } from '../core/eventBusNew.js';
import { ApiClient } from '../api/client.js';
import { CodeGenerator } from '../components/CodeGenerator.js';
import { Modal } from '../components/Modal.js';
import { debounce } from '../utils/debounce.js';

/**
 * API Documentation controller
 */
class APIDocumentation {
    constructor() {
        this.initialized = false;
        this.apiClient = null;
        this.codeGenerator = null;
        this.currentEndpoint = null;
        this.currentExample = null;
        this.searchIndex = new Map();
        this.sidebarOpen = true;
        
        // UI elements
        this.elements = {
            sidebar: null,
            mainContent: null,
            searchInput: null,
            searchResults: null,
            endpointList: null,
            codeExamples: null,
            tryItButton: null,
            responseArea: null,
            parametersForm: null,
            authSection: null,
            themeToggle: null
        };
        
        // API Explorer state
        this.explorerState = {
            currentRequest: null,
            responses: new Map(),
            requestHistory: [],
            authToken: null,
            baseUrl: null
        };
        
        // Code examples for different languages
        this.codeTemplates = {
            javascript: {
                fetch: `// Using Fetch API
fetch('{{url}}', {
  method: '{{method}}',
  headers: {
    'Content-Type': 'application/json',
    {{auth}}
  }{{body}}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`,
                
                axios: `// Using Axios
import axios from 'axios';

const response = await axios.{{methodLower}}('{{url}}'{{body}}, {
  headers: {
    'Content-Type': 'application/json',
    {{auth}}
  }
});

console.log(response.data);`
            },
            
            python: {
                requests: `# Using Python requests
import requests
import json

url = "{{url}}"
headers = {
    "Content-Type": "application/json",
    {{auth}}
}

{{body}}

response = requests.{{methodLower}}(url, headers=headers{{dataParam}})
data = response.json()
print(data)`,
                
                httpx: `# Using Python httpx (async)
import httpx
import json

async def call_api():
    url = "{{url}}"
    headers = {
        "Content-Type": "application/json",
        {{auth}}
    }
    
    {{body}}
    
    async with httpx.AsyncClient() as client:
        response = await client.{{methodLower}}(url, headers=headers{{dataParam}})
        data = response.json()
        print(data)

# Run the async function
import asyncio
asyncio.run(call_api())`
            },
            
            curl: `# Using cURL
curl -X {{method}} "{{url}}" \\
  -H "Content-Type: application/json" \\
  {{auth}}{{body}}`
        };
        
        // Throttled search handler
        this.handleSearch = debounce(this.performSearch.bind(this), 300);
    }
    
    /**
     * Initialize documentation page
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('📚 Initializing API Documentation...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize API client
            this.initializeApiClient();
            
            // Initialize code generator
            this.initializeCodeGenerator();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Build search index
            this.buildSearchIndex();
            
            // Setup sidebar navigation
            this.setupSidebarNavigation();
            
            // Initialize syntax highlighting
            this.initializeSyntaxHighlighting();
            
            // Setup API explorer
            this.setupAPIExplorer();
            
            // Load initial content
            this.loadInitialContent();
            
            // Setup responsive behavior
            this.setupResponsiveBehavior();
            
            this.initialized = true;
            
            EventBus.emit('docs:initialized');
            console.log('✅ API Documentation initialized');
            
        } catch (error) {
            console.error('❌ Documentation initialization failed:', error);
            EventBus.emit('docs:error', { error });
        }
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.sidebar = document.querySelector('.docs-sidebar');
        this.elements.mainContent = document.querySelector('.docs-main-content');
        this.elements.searchInput = document.querySelector('.docs-search-input');
        this.elements.searchResults = document.querySelector('.search-results');
        this.elements.endpointList = document.querySelector('.endpoint-list');
        this.elements.codeExamples = document.querySelector('.code-examples');
        this.elements.tryItButton = document.querySelector('.try-it-button');
        this.elements.responseArea = document.querySelector('.response-area');
        this.elements.parametersForm = document.querySelector('.parameters-form');
        this.elements.authSection = document.querySelector('.auth-section');
        this.elements.themeToggle = document.querySelector('.theme-toggle');
        
        if (!this.elements.sidebar || !this.elements.mainContent) {
            throw new Error('Required documentation elements not found');
        }
    }
    
    /**
     * Initialize API client
     */
    initializeApiClient() {
        this.apiClient = new ApiClient({
            baseURL: window.location.origin + '/api',
            timeout: 30000,
            retries: 2
        });
        
        // Set up response interceptors for documentation
        this.apiClient.addResponseInterceptor(
            response => {
                this.recordResponse(response);
                return response;
            },
            error => {
                this.recordError(error);
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * Initialize code generator
     */
    initializeCodeGenerator() {
        this.codeGenerator = new CodeGenerator({
            templates: this.codeTemplates,
            defaultLanguage: 'javascript',
            onCodeGenerated: this.handleCodeGenerated.bind(this)
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', this.handleSearch);
            this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        }
        
        // Sidebar navigation
        document.addEventListener('click', this.handleNavigationClick.bind(this));
        
        // API Explorer
        if (this.elements.tryItButton) {
            this.elements.tryItButton.addEventListener('click', this.executeAPIRequest.bind(this));
        }
        
        // Parameters form
        if (this.elements.parametersForm) {
            this.elements.parametersForm.addEventListener('input', this.handleParameterChange.bind(this));
        }
        
        // Auth section
        if (this.elements.authSection) {
            this.elements.authSection.addEventListener('change', this.handleAuthChange.bind(this));
        }
        
        // Code example interactions
        document.addEventListener('click', this.handleCodeExampleClick.bind(this));
        
        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
        
        // Sidebar toggle for mobile
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
        }
        
        // Copy code buttons
        document.addEventListener('click', this.handleCopyCode.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Window events
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }
    
    /**
     * Build search index for fast searching
     */
    buildSearchIndex() {
        // Index all endpoints
        const endpoints = document.querySelectorAll('.endpoint-item');
        endpoints.forEach(endpoint => {
            const id = endpoint.id;
            const title = endpoint.querySelector('.endpoint-title')?.textContent || '';
            const description = endpoint.querySelector('.endpoint-description')?.textContent || '';
            const method = endpoint.dataset.method || '';
            const path = endpoint.dataset.path || '';
            
            const searchableText = `${title} ${description} ${method} ${path}`.toLowerCase();
            
            this.searchIndex.set(id, {
                element: endpoint,
                title,
                description,
                method,
                path,
                searchableText
            });
        });
        
        // Index code examples
        const examples = document.querySelectorAll('.code-example');
        examples.forEach(example => {
            const id = example.id;
            const title = example.querySelector('.example-title')?.textContent || '';
            const code = example.querySelector('code')?.textContent || '';
            
            const searchableText = `${title} ${code}`.toLowerCase();
            
            this.searchIndex.set(id, {
                element: example,
                title,
                type: 'example',
                searchableText
            });
        });
    }
    
    /**
     * Setup sidebar navigation
     */
    setupSidebarNavigation() {
        // Highlight current section on scroll
        this.setupScrollSpy();
        
        // Collapsible sections
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', this.toggleSection.bind(this));
        });
        
        // Filter endpoints by category
        const categoryFilters = document.querySelectorAll('.category-filter');
        categoryFilters.forEach(filter => {
            filter.addEventListener('change', this.filterEndpoints.bind(this));
        });
    }
    
    /**
     * Setup scroll spy for navigation highlighting
     */
    setupScrollSpy() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const id = entry.target.id;
                    const navLink = document.querySelector(`[href="#${id}"]`);
                    
                    if (entry.isIntersecting) {
                        navLink?.classList.add('active');
                    } else {
                        navLink?.classList.remove('active');
                    }
                });
            },
            {
                rootMargin: '-10% 0px -80% 0px'
            }
        );
        
        // Observe all main sections
        const sections = document.querySelectorAll('section[id]');
        sections.forEach(section => observer.observe(section));
    }
    
    /**
     * Initialize syntax highlighting
     */
    initializeSyntaxHighlighting() {
        // Use Prism.js if available, or implement basic highlighting
        if (window.Prism) {
            Prism.highlightAll();
        } else {
            this.implementBasicSyntaxHighlighting();
        }
        
        // Add copy buttons to code blocks
        this.addCopyButtonsToCodeBlocks();
    }
    
    /**
     * Implement basic syntax highlighting
     */
    implementBasicSyntaxHighlighting() {
        const codeBlocks = document.querySelectorAll('pre code');
        
        codeBlocks.forEach(block => {
            const language = block.className.match(/language-(\w+)/)?.[1];
            if (language) {
                this.highlightCode(block, language);
            }
        });
    }
    
    /**
     * Basic code highlighting
     */
    highlightCode(element, language) {
        let code = element.textContent;
        
        switch (language) {
            case 'javascript':
                code = code
                    .replace(/\b(const|let|var|function|if|else|for|while|return|import|export|async|await)\b/g, '<span class="keyword">$1</span>')
                    .replace(/\b(true|false|null|undefined)\b/g, '<span class="literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
                    .replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
                break;
                
            case 'python':
                code = code
                    .replace(/\b(def|class|if|else|elif|for|while|return|import|from|async|await|try|except)\b/g, '<span class="keyword">$1</span>')
                    .replace(/\b(True|False|None)\b/g, '<span class="literal">$1</span>')
                    .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
                    .replace(/#.*$/gm, '<span class="comment">$&</span>');
                break;
                
            case 'json':
                code = code
                    .replace(/"([^"]*)":/g, '<span class="key">"$1"</span>:')
                    .replace(/:\s*"([^"]*)"/g, ': <span class="string">"$1"</span>')
                    .replace(/:\s*(true|false|null)/g, ': <span class="literal">$1</span>')
                    .replace(/:\s*(\d+)/g, ': <span class="number">$1</span>');
                break;
        }
        
        element.innerHTML = code;
    }
    
    /**
     * Add copy buttons to code blocks
     */
    addCopyButtonsToCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre');
        
        codeBlocks.forEach(block => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.innerHTML = '📋';
            copyButton.title = 'Copy code';
            
            block.style.position = 'relative';
            copyButton.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 12px;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;
            
            copyButton.addEventListener('mouseenter', () => {
                copyButton.style.opacity = '1';
            });
            
            copyButton.addEventListener('mouseleave', () => {
                copyButton.style.opacity = '0.7';
            });
            
            block.appendChild(copyButton);
        });
    }
    
    /**
     * Setup API explorer
     */
    setupAPIExplorer() {
        // Initialize response area
        this.initializeResponseArea();
        
        // Setup parameter inputs
        this.setupParameterInputs();
        
        // Setup authentication
        this.setupAuthentication();
        
        // Load saved state
        this.loadExplorerState();
    }
    
    /**
     * Initialize response area
     */
    initializeResponseArea() {
        if (!this.elements.responseArea) return;
        
        this.elements.responseArea.innerHTML = `
            <div class="response-tabs">
                <button class="tab-button active" data-tab="response">Response</button>
                <button class="tab-button" data-tab="headers">Headers</button>
                <button class="tab-button" data-tab="timing">Timing</button>
            </div>
            <div class="response-content">
                <div class="tab-pane active" id="response-tab">
                    <div class="response-placeholder">
                        Click "Try It" to see the API response here
                    </div>
                </div>
                <div class="tab-pane" id="headers-tab">
                    <div class="headers-content"></div>
                </div>
                <div class="tab-pane" id="timing-tab">
                    <div class="timing-content"></div>
                </div>
            </div>
        `;
        
        // Setup tab switching
        const tabButtons = this.elements.responseArea.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', this.switchResponseTab.bind(this));
        });
    }
    
    /**
     * Setup parameter inputs
     */
    setupParameterInputs() {
        if (!this.elements.parametersForm) return;
        
        // Dynamic parameter generation based on current endpoint
        this.generateParameterInputs();
    }
    
    /**
     * Generate parameter inputs for current endpoint
     */
    generateParameterInputs(endpoint = null) {
        if (!this.elements.parametersForm) return;
        
        const endpointData = endpoint || this.getCurrentEndpoint();
        if (!endpointData) return;
        
        const { parameters = [], requestBody = null } = endpointData;
        
        let html = '<div class="parameters-section">';
        
        // Path parameters
        const pathParams = parameters.filter(p => p.in === 'path');
        if (pathParams.length > 0) {
            html += '<h4>Path Parameters</h4>';
            pathParams.forEach(param => {
                html += this.generateParameterInput(param);
            });
        }
        
        // Query parameters
        const queryParams = parameters.filter(p => p.in === 'query');
        if (queryParams.length > 0) {
            html += '<h4>Query Parameters</h4>';
            queryParams.forEach(param => {
                html += this.generateParameterInput(param);
            });
        }
        
        // Headers
        const headerParams = parameters.filter(p => p.in === 'header');
        if (headerParams.length > 0) {
            html += '<h4>Headers</h4>';
            headerParams.forEach(param => {
                html += this.generateParameterInput(param);
            });
        }
        
        // Request body
        if (requestBody) {
            html += '<h4>Request Body</h4>';
            html += this.generateRequestBodyInput(requestBody);
        }
        
        html += '</div>';
        
        this.elements.parametersForm.innerHTML = html;
    }
    
    /**
     * Generate parameter input HTML
     */
    generateParameterInput(parameter) {
        const { name, type, required, description, example } = parameter;
        const inputType = this.getInputType(type);
        const placeholder = example || description || '';
        
        return `
            <div class="parameter-input ${required ? 'required' : ''}">
                <label for="param-${name}">
                    ${name}
                    ${required ? '<span class="required-indicator">*</span>' : ''}
                </label>
                <input 
                    type="${inputType}" 
                    id="param-${name}" 
                    name="${name}"
                    placeholder="${placeholder}"
                    data-param-type="${parameter.in}"
                    ${required ? 'required' : ''}
                />
                ${description ? `<div class="parameter-description">${description}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Generate request body input
     */
    generateRequestBodyInput(requestBody) {
        const { content } = requestBody;
        const jsonSchema = content['application/json']?.schema;
        
        if (jsonSchema) {
            return `
                <div class="request-body-input">
                    <textarea 
                        id="request-body" 
                        name="request-body"
                        placeholder="Enter JSON request body..."
                        rows="10"
                    >${JSON.stringify(this.generateExampleFromSchema(jsonSchema), null, 2)}</textarea>
                    <div class="json-validator">
                        <span class="validation-status"></span>
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * Get input type for parameter type
     */
    getInputType(type) {
        switch (type) {
            case 'integer':
            case 'number':
                return 'number';
            case 'boolean':
                return 'checkbox';
            case 'array':
                return 'text';
            default:
                return 'text';
        }
    }
    
    /**
     * Generate example from JSON schema
     */
    generateExampleFromSchema(schema) {
        const { type, properties, example } = schema;
        
        if (example) return example;
        
        if (type === 'object' && properties) {
            const obj = {};
            Object.entries(properties).forEach(([key, prop]) => {
                obj[key] = this.generateExampleFromSchema(prop);
            });
            return obj;
        }
        
        switch (type) {
            case 'string':
                return 'example string';
            case 'number':
            case 'integer':
                return 123;
            case 'boolean':
                return true;
            case 'array':
                return [];
            default:
                return null;
        }
    }
    
    /**
     * Setup authentication
     */
    setupAuthentication() {
        if (!this.elements.authSection) return;
        
        // Load saved auth token
        const savedToken = localStorage.getItem('ncs-api-token');
        if (savedToken) {
            this.explorerState.authToken = savedToken;
            const tokenInput = this.elements.authSection.querySelector('#auth-token');
            if (tokenInput) tokenInput.value = savedToken;
        }
    }
    
    /**
     * Handle search functionality
     */
    performSearch() {
        const query = this.elements.searchInput?.value.toLowerCase() || '';
        
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        const results = [];
        
        this.searchIndex.forEach((item, id) => {
            if (item.searchableText.includes(query)) {
                const relevance = this.calculateSearchRelevance(query, item);
                results.push({ ...item, id, relevance });
            }
        });
        
        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);
        
        this.showSearchResults(results.slice(0, 10)); // Show top 10 results
    }
    
    /**
     * Calculate search relevance score
     */
    calculateSearchRelevance(query, item) {
        let score = 0;
        
        // Exact title match gets highest score
        if (item.title.toLowerCase().includes(query)) {
            score += 100;
        }
        
        // Method match for endpoints
        if (item.method && item.method.toLowerCase().includes(query)) {
            score += 50;
        }
        
        // Path match for endpoints
        if (item.path && item.path.toLowerCase().includes(query)) {
            score += 30;
        }
        
        // Description match
        if (item.description && item.description.toLowerCase().includes(query)) {
            score += 20;
        }
        
        return score;
    }
    
    /**
     * Show search results
     */
    showSearchResults(results) {
        if (!this.elements.searchResults) return;
        
        const html = results.map(result => {
            const type = result.type || 'endpoint';
            const icon = type === 'endpoint' ? '🔗' : '📄';
            
            return `
                <div class="search-result-item" data-target="${result.id}">
                    <div class="result-icon">${icon}</div>
                    <div class="result-content">
                        <div class="result-title">${result.title}</div>
                        ${result.method ? `<div class="result-method">${result.method}</div>` : ''}
                        ${result.description ? `<div class="result-description">${result.description}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.searchResults.innerHTML = html;
        this.elements.searchResults.style.display = 'block';
        
        // Add click handlers
        const resultItems = this.elements.searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.target;
                this.navigateToSection(targetId);
                this.hideSearchResults();
                this.elements.searchInput.blur();
            });
        });
    }
    
    /**
     * Hide search results
     */
    hideSearchResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.style.display = 'none';
        }
    }
    
    /**
     * Navigate to section
     */
    navigateToSection(sectionId) {
        const target = document.getElementById(sectionId);
        if (target) {
            target.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Update URL hash
            window.history.pushState(null, null, `#${sectionId}`);
            
            // Highlight the target briefly
            target.classList.add('highlight');
            setTimeout(() => {
                target.classList.remove('highlight');
            }, 2000);
        }
    }
    
    /**
     * Execute API request
     */
    async executeAPIRequest() {
        const endpoint = this.getCurrentEndpoint();
        if (!endpoint) return;
        
        try {
            this.showRequestLoading();
            
            const requestConfig = this.buildRequestConfig(endpoint);
            const startTime = performance.now();
            
            const response = await this.apiClient.request(requestConfig);
            const endTime = performance.now();
            
            this.displayResponse(response, endTime - startTime);
            this.recordRequestInHistory(requestConfig, response);
            
        } catch (error) {
            this.displayError(error);
        } finally {
            this.hideRequestLoading();
        }
    }
    
    /**
     * Build request configuration from form inputs
     */
    buildRequestConfig(endpoint) {
        const form = this.elements.parametersForm;
        const config = {
            method: endpoint.method,
            url: endpoint.path,
            headers: {},
            params: {},
            data: null
        };
        
        // Add authentication
        if (this.explorerState.authToken) {
            config.headers.Authorization = `Bearer ${this.explorerState.authToken}`;
        }
        
        // Process form inputs
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            const { name, value, dataset } = input;
            const paramType = dataset.paramType;
            
            if (value) {
                switch (paramType) {
                    case 'path':
                        config.url = config.url.replace(`{${name}}`, value);
                        break;
                    case 'query':
                        config.params[name] = value;
                        break;
                    case 'header':
                        config.headers[name] = value;
                        break;
                }
            }
        });
        
        // Add request body
        const bodyTextarea = form.querySelector('#request-body');
        if (bodyTextarea && bodyTextarea.value) {
            try {
                config.data = JSON.parse(bodyTextarea.value);
            } catch (error) {
                throw new Error('Invalid JSON in request body');
            }
        }
        
        return config;
    }
    
    /**
     * Display API response
     */
    displayResponse(response, timing) {
        const responseTab = document.getElementById('response-tab');
        const headersTab = document.getElementById('headers-tab');
        const timingTab = document.getElementById('timing-tab');
        
        if (responseTab) {
            responseTab.innerHTML = `
                <div class="response-status ${response.status < 400 ? 'success' : 'error'}">
                    Status: ${response.status} ${response.statusText}
                </div>
                <pre><code class="language-json">${JSON.stringify(response.data, null, 2)}</code></pre>
            `;
        }
        
        if (headersTab) {
            const headersHtml = Object.entries(response.headers)
                .map(([key, value]) => `<div class="header-item"><strong>${key}:</strong> ${value}</div>`)
                .join('');
            headersTab.innerHTML = `<div class="headers-list">${headersHtml}</div>`;
        }
        
        if (timingTab) {
            timingTab.innerHTML = `
                <div class="timing-info">
                    <div class="timing-item">
                        <strong>Response Time:</strong> ${timing.toFixed(2)}ms
                    </div>
                    <div class="timing-item">
                        <strong>Content Length:</strong> ${JSON.stringify(response.data).length} bytes
                    </div>
                </div>
            `;
        }
        
        // Re-highlight syntax
        if (window.Prism) {
            Prism.highlightAll();
        }
    }
    
    /**
     * Display error
     */
    displayError(error) {
        const responseTab = document.getElementById('response-tab');
        if (responseTab) {
            responseTab.innerHTML = `
                <div class="response-status error">
                    Error: ${error.message}
                </div>
                <pre><code class="language-json">${JSON.stringify(error.response?.data || {}, null, 2)}</code></pre>
            `;
        }
    }
    
    /**
     * Generate code examples for current request
     */
    generateCodeExamples(requestConfig) {
        if (!this.codeGenerator) return;
        
        const examples = this.codeGenerator.generateForRequest(requestConfig);
        
        if (this.elements.codeExamples) {
            this.elements.codeExamples.innerHTML = examples;
        }
    }
    
    /**
     * Handle various UI interactions
     */
    handleNavigationClick(event) {
        const link = event.target.closest('[data-endpoint]');
        if (link) {
            event.preventDefault();
            const endpointId = link.dataset.endpoint;
            this.loadEndpoint(endpointId);
        }
    }
    
    handleCodeExampleClick(event) {
        if (event.target.matches('.language-tab')) {
            this.switchCodeLanguage(event.target);
        }
    }
    
    handleCopyCode(event) {
        if (event.target.matches('.copy-code-button')) {
            const codeBlock = event.target.parentElement.querySelector('code');
            if (codeBlock) {
                navigator.clipboard.writeText(codeBlock.textContent);
                event.target.innerHTML = '✅';
                setTimeout(() => {
                    event.target.innerHTML = '📋';
                }, 2000);
            }
        }
    }
    
    handleParameterChange(event) {
        // Validate JSON if it's a request body textarea
        if (event.target.id === 'request-body') {
            this.validateJSON(event.target);
        }
        
        // Update code examples with new parameters
        this.updateCodeExamples();
    }
    
    handleAuthChange(event) {
        if (event.target.id === 'auth-token') {
            this.explorerState.authToken = event.target.value;
            localStorage.setItem('ncs-api-token', event.target.value);
        }
    }
    
    /**
     * Validate JSON input
     */
    validateJSON(textarea) {
        const validator = textarea.parentElement.querySelector('.validation-status');
        if (!validator) return;
        
        try {
            JSON.parse(textarea.value);
            validator.textContent = '✅ Valid JSON';
            validator.className = 'validation-status valid';
        } catch (error) {
            validator.textContent = `❌ ${error.message}`;
            validator.className = 'validation-status invalid';
        }
    }
    
    /**
     * Load initial content
     */
    loadInitialContent() {
        // Load endpoint from URL hash
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            this.navigateToSection(hash);
        }
        
        // Load first endpoint if no hash
        const firstEndpoint = document.querySelector('[data-endpoint]');
        if (firstEndpoint && !hash) {
            this.loadEndpoint(firstEndpoint.dataset.endpoint);
        }
    }
    
    /**
     * Setup responsive behavior
     */
    setupResponsiveBehavior() {
        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 768 && 
                this.sidebarOpen && 
                !this.elements.sidebar.contains(event.target) &&
                !event.target.matches('.sidebar-toggle')) {
                this.closeSidebar();
            }
        });
    }
    
    /**
     * Utility methods
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.elements.sidebar.classList.toggle('open', this.sidebarOpen);
    }
    
    closeSidebar() {
        this.sidebarOpen = false;
        this.elements.sidebar.classList.remove('open');
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('docs-theme', 
            document.body.classList.contains('dark-theme') ? 'dark' : 'light'
        );
    }
    
    showRequestLoading() {
        if (this.elements.tryItButton) {
            this.elements.tryItButton.textContent = 'Sending...';
            this.elements.tryItButton.disabled = true;
        }
    }
    
    hideRequestLoading() {
        if (this.elements.tryItButton) {
            this.elements.tryItButton.textContent = 'Try It';
            this.elements.tryItButton.disabled = false;
        }
    }
    
    /**
     * State management
     */
    saveExplorerState() {
        localStorage.setItem('ncs-api-explorer-state', JSON.stringify({
            authToken: this.explorerState.authToken,
            baseUrl: this.explorerState.baseUrl,
            currentEndpoint: this.currentEndpoint
        }));
    }
    
    loadExplorerState() {
        try {
            const saved = localStorage.getItem('ncs-api-explorer-state');
            if (saved) {
                const state = JSON.parse(saved);
                this.explorerState = { ...this.explorerState, ...state };
            }
        } catch (error) {
            console.warn('Failed to load explorer state:', error);
        }
    }
    
    /**
     * Get current endpoint data
     */
    getCurrentEndpoint() {
        // This would typically come from parsing the OpenAPI spec
        return this.currentEndpoint;
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove event listeners
        if (this.elements.searchInput) {
            this.elements.searchInput.removeEventListener('input', this.handleSearch);
        }
        
        // Clear timers and observers
        this.searchIndex.clear();
        
        // Destroy components
        if (this.codeGenerator) {
            this.codeGenerator.destroy?.();
        }
        
        this.initialized = false;
        EventBus.emit('docs:destroyed');
    }
}

/**
 * Initialize documentation page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const docs = new APIDocumentation();
    docs.init();
    
    // Expose to global scope for debugging
    if (window.NCS) {
        window.NCS.docs = docs;
    }
});

// Export for module systems
export default APIDocumentation;