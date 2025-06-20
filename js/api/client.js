/**
 * HTTP API Client
 * Handles all HTTP requests to the NCS-API backend
 * 
 * Features:
 * - Request/response interceptors
 * - Automatic retries
 * - Request caching
 * - Error handling
 * - Authentication
 * - Rate limiting
 */

import { CONFIG } from '../config/constants.js';
import { eventBus } from '../core/eventBus.js';

export class ApiClient {
    constructor(options = {}) {
        this.options = {
            baseURL: CONFIG.API.BASE_URL,
            timeout: CONFIG.API.TIMEOUT,
            retryAttempts: CONFIG.API.RETRY_ATTEMPTS,
            retryDelay: CONFIG.API.RETRY_DELAY,
            enableCaching: true,
            enableRateLimit: true,
            ...options
        };
        
        this.baseURL = this.options.baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Client-Version': CONFIG.APP.VERSION
        };
        
        // Request/response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Cache for GET requests
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Rate limiting
        this.rateLimiter = {
            requests: [],
            limit: CONFIG.API.RATE_LIMIT.REQUESTS_PER_MINUTE,
            window: 60 * 1000 // 1 minute
        };
        
        // Authentication
        this.authToken = null;
        this.refreshToken = null;
        
        // Request queue for offline handling
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('🌐 API Client initialized:', this.baseURL);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processRequestQueue();
            eventBus.emit('api:online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            eventBus.emit('api:offline');
        });
    }

    /**
     * Make HTTP request
     */
    async request(url, options = {}) {
        const config = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            ...options
        };
        
        // Apply request interceptors
        await this.applyRequestInterceptors(config);
        
        // Build full URL
        const fullUrl = this.buildUrl(url);
        
        // Check cache for GET requests
        if (config.method === 'GET' && this.options.enableCaching) {
            const cached = this.getFromCache(fullUrl);
            if (cached) {
                return cached;
            }
        }
        
        // Check rate limit
        if (this.options.enableRateLimit && !this.checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }
        
        // Handle offline requests
        if (!this.isOnline && config.method !== 'GET') {
            return this.queueRequest(fullUrl, config);
        }
        
        try {
            const response = await this.executeRequest(fullUrl, config);
            
            // Apply response interceptors
            await this.applyResponseInterceptors(response);
            
            // Cache successful GET requests
            if (config.method === 'GET' && response.ok && this.options.enableCaching) {
                this.setCache(fullUrl, response.clone());
            }
            
            return response;
            
        } catch (error) {
            // Handle retries
            if (this.shouldRetry(error, config)) {
                return this.retryRequest(fullUrl, config);
            }
            
            throw error;
        }
    }

    /**
     * Execute HTTP request with timeout
     */
    async executeRequest(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        
        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Track rate limit
            if (this.options.enableRateLimit) {
                this.trackRequest();
            }
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout: ${url}`);
            }
            
            throw error;
        }
    }

    /**
     * Retry failed request
     */
    async retryRequest(url, config, attempt = 1) {
        if (attempt > this.options.retryAttempts) {
            throw new Error(`Request failed after ${this.options.retryAttempts} attempts: ${url}`);
        }
        
        // Wait before retry
        await this.delay(this.options.retryDelay * attempt);
        
        try {
            return await this.executeRequest(url, config);
        } catch (error) {
            if (this.shouldRetry(error, config)) {
                return this.retryRequest(url, config, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Check if request should be retried
     */
    shouldRetry(error, config) {
        // Don't retry certain methods
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)) {
            return false;
        }
        
        // Don't retry client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
            return false;
        }
        
        // Retry network errors and server errors (5xx)
        return true;
    }

    /**
     * Apply request interceptors
     */
    async applyRequestInterceptors(config) {
        for (const interceptor of this.requestInterceptors) {
            await interceptor(config);
        }
    }

    /**
     * Apply response interceptors
     */
    async applyResponseInterceptors(response) {
        for (const interceptor of this.responseInterceptors) {
            await interceptor(response);
        }
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Set authentication token
     */
    setAuthToken(token, refreshToken = null) {
        this.authToken = token;
        this.refreshToken = refreshToken;
        
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
        
        eventBus.emit('api:auth-changed', { token: !!token });
    }

    /**
     * HTTP Method Shortcuts
     */
    async get(url, params = {}, options = {}) {
        const queryString = this.buildQueryString(params);
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        const response = await this.request(fullUrl, {
            method: 'GET',
            ...options
        });
        
        return this.parseResponse(response);
    }

    async post(url, data = null, options = {}) {
        const response = await this.request(url, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
        
        return this.parseResponse(response);
    }

    async put(url, data = null, options = {}) {
        const response = await this.request(url, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
        
        return this.parseResponse(response);
    }

    async patch(url, data = null, options = {}) {
        const response = await this.request(url, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : null,
            ...options
        });
        
        return this.parseResponse(response);
    }

    async delete(url, options = {}) {
        const response = await this.request(url, {
            method: 'DELETE',
            ...options
        });
        
        return this.parseResponse(response);
    }

    /**
     * Upload file
     */
    async upload(url, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional fields
        if (options.fields) {
            Object.entries(options.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        
        const response = await this.request(url, {
            method: 'POST',
            body: formData,
            headers: {
                // Don't set Content-Type for FormData (browser will set it with boundary)
                ...this.defaultHeaders,
                'Content-Type': undefined
            },
            ...options
        });
        
        return this.parseResponse(response);
    }

    /**
     * API-specific methods
     */

    // Clustering endpoints
    async cluster(data, algorithm, parameters = {}) {
        return this.post('/cluster', {
            data,
            algorithm,
            parameters
        });
    }

    async getClusteringStatus(jobId) {
        return this.get(`/cluster/status/${jobId}`);
    }

    async getClusteringResult(jobId) {
        return this.get(`/cluster/result/${jobId}`);
    }

    async cancelClustering(jobId) {
        return this.delete(`/cluster/${jobId}`);
    }

    // Data endpoints
    async validateData(data) {
        return this.post('/data/validate', { data });
    }

    async preprocessData(data, options = {}) {
        return this.post('/data/preprocess', { data, options });
    }

    async getSampleData(dataset) {
        return this.get(`/data/samples/${dataset}`);
    }

    // Algorithm endpoints
    async getAlgorithms() {
        return this.get('/algorithms');
    }

    async getAlgorithmInfo(algorithm) {
        return this.get(`/algorithms/${algorithm}`);
    }

    async getAlgorithmParameters(algorithm) {
        return this.get(`/algorithms/${algorithm}/parameters`);
    }

    // Quality metrics
    async calculateQualityMetrics(data, clusters) {
        return this.post('/metrics/quality', { data, clusters });
    }

    // User endpoints (if authentication is implemented)
    async login(credentials) {
        return this.post('/auth/login', credentials);
    }

    async logout() {
        const response = await this.post('/auth/logout');
        this.setAuthToken(null);
        return response;
    }

    async refreshAuth() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        const response = await this.post('/auth/refresh', {
            refreshToken: this.refreshToken
        });
        
        if (response.token) {
            this.setAuthToken(response.token, response.refreshToken);
        }
        
        return response;
    }

    async getUserProfile() {
        return this.get('/user/profile');
    }

    async updateUserProfile(profile) {
        return this.patch('/user/profile', profile);
    }

    async getUserUsage() {
        return this.get('/user/usage');
    }

    /**
     * Utility methods
     */
    buildUrl(path) {
        if (path.startsWith('http')) {
            return path;
        }
        
        return `${this.baseURL}${path.startsWith('/') ? path : '/' + path}`;
    }

    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) {
            return '';
        }
        
        return Object.entries(params)
            .filter(([key, value]) => value !== null && value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    async parseResponse(response) {
        if (!response.ok) {
            const error = await this.parseError(response);
            throw error;
        }
        
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        
        if (contentType && contentType.includes('text/')) {
            return response.text();
        }
        
        return response.blob();
    }

    async parseError(response) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        let details = null;
        
        try {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                message = errorData.message || errorData.error || message;
                details = errorData;
            } else {
                const errorText = await response.text();
                if (errorText) {
                    message = errorText;
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
        
        const error = new Error(message);
        error.status = response.status;
        error.statusText = response.statusText;
        error.details = details;
        error.response = response;
        
        return error;
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.response;
    }

    setCache(key, response) {
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
        
        // Cleanup old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Rate limiting
     */
    checkRateLimit() {
        const now = Date.now();
        const windowStart = now - this.rateLimiter.window;
        
        // Remove old requests
        this.rateLimiter.requests = this.rateLimiter.requests.filter(
            timestamp => timestamp > windowStart
        );
        
        return this.rateLimiter.requests.length < this.rateLimiter.limit;
    }

    trackRequest() {
        this.rateLimiter.requests.push(Date.now());
    }

    /**
     * Request queue for offline handling
     */
    queueRequest(url, config) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                url,
                config,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            eventBus.emit('api:request-queued', { 
                queueSize: this.requestQueue.length 
            });
        });
    }

    async processRequestQueue() {
        if (!this.isOnline || this.requestQueue.length === 0) {
            return;
        }
        
        console.log(`🌐 Processing ${this.requestQueue.length} queued requests`);
        
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        for (const queuedRequest of queue) {
            try {
                const response = await this.executeRequest(
                    queuedRequest.url, 
                    queuedRequest.config
                );
                queuedRequest.resolve(response);
            } catch (error) {
                queuedRequest.reject(error);
            }
        }
        
        eventBus.emit('api:queue-processed', { 
            processedCount: queue.length 
        });
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await this.get('/health', {}, { 
                timeout: 5000 
            });
            
            eventBus.emit('api:health-check', { 
                healthy: true, 
                response 
            });
            
            return response;
        } catch (error) {
            eventBus.emit('api:health-check', { 
                healthy: false, 
                error: error.message 
            });
            
            throw error;
        }
    }

    /**
     * Utility functions
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            online: this.isOnline,
            authenticated: !!this.authToken,
            queueSize: this.requestQueue.length,
            cacheSize: this.cache.size,
            rateLimitRemaining: this.rateLimiter.limit - this.rateLimiter.requests.length
        };
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Clear cache
        this.cache.clear();
        
        // Clear request queue
        this.requestQueue.forEach(request => {
            request.reject(new Error('API client destroyed'));
        });
        this.requestQueue = [];
        
        // Remove event listeners
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        
        console.log('🌐 API Client destroyed');
    }
}

export default ApiClient;