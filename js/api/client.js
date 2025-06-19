/**
 * NCS API Client
 * High-performance HTTP client for the NCS clustering API
 */

import { CONFIG } from '../config/constants.js';

export class ApiClient {
    constructor(options = {}) {
        this.options = {
            baseURL: CONFIG.API_BASE_URL,
            timeout: CONFIG.API_TIMEOUT,
            retries: CONFIG.API_RETRY_ATTEMPTS,
            retryDelay: CONFIG.API_RETRY_DELAY,
            enableCaching: CONFIG.CACHE.ENABLE_HTTP_CACHE,
            enableMetrics: true,
            debug: CONFIG.IS_DEV,
            ...options
        };
        
        // Authentication state
        this.auth = {
            token: null,
            refreshToken: null,
            apiKey: null,
            expiresAt: null
        };
        
        // Request/Response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];
        
        // Cache management
        this.cache = new Map();
        this.cacheConfig = {
            maxSize: CONFIG.CACHE.MAX_CACHE_SIZE,
            ttl: CONFIG.CACHE.CACHE_DURATION,
            enabled: this.options.enableCaching
        };
        
        // Performance tracking
        this.metrics = {
            requests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Request queue for offline support
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        
        // Rate limiting
        this.rateLimiter = {
            requests: [],
            maxRequests: CONFIG.SECURITY.RATE_LIMIT.REQUESTS_PER_MINUTE,
            windowMs: 60000 // 1 minute
        };
        
        this.init();
    }

    /**
     * Initialize the API client
     */
    init() {
        // Load authentication from storage
        this.loadAuth();
        
        // Setup default headers
        this.setupDefaultHeaders();
        
        // Setup interceptors
        this.setupDefaultInterceptors();
        
        // Setup offline/online listeners
        this.setupNetworkListeners();
        
        // Setup cache cleanup
        this.setupCacheCleanup();
        
        // Load API key from environment or storage
        this.loadAPIKey();
        
        if (this.options.debug) {
            console.log('🔌 API Client initialized:', {
                baseURL: this.options.baseURL,
                timeout: this.options.timeout,
                caching: this.cacheConfig.enabled
            });
        }
    }

    /**
     * Setup default headers
     */
    setupDefaultHeaders() {
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Client-Version': CONFIG.VERSION.APP,
            'X-Client-Platform': 'web'
        };
        
        // Add API key header if available
        if (this.auth.apiKey) {
            this.defaultHeaders[CONFIG.SECURITY.API_KEY_HEADER] = this.auth.apiKey;
        }
    }

    /**
     * Setup default interceptors
     */
    setupDefaultInterceptors() {
        // Request interceptor for authentication
        this.addRequestInterceptor((config) => {
            // Add auth token if available
            if (this.auth.token && !this.isTokenExpired()) {
                config.headers['Authorization'] = `Bearer ${this.auth.token}`;
            }
            
            // Add API key
            if (this.auth.apiKey) {
                config.headers[CONFIG.SECURITY.API_KEY_HEADER] = this.auth.apiKey;
            }
            
            return config;
        });
        
        // Response interceptor for token refresh
        this.addResponseInterceptor(
            (response) => response,
            async (error) => {
                if (error.status === 401 && this.auth.refreshToken) {
                    try {
                        await this.refreshAuthToken();
                        // Retry the original request
                        return this.request(error.config);
                    } catch (refreshError) {
                        this.handleAuthError(refreshError);
                        throw refreshError;
                    }
                }
                throw error;
            }
        );
        
        // Error interceptor for logging
        this.addErrorInterceptor((error) => {
            if (this.options.debug) {
                console.error('🚨 API Error:', error);
            }
            
            this.trackError(error);
            return error;
        });
    }

    /**
     * Setup network listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processRequestQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Setup cache cleanup
     */
    setupCacheCleanup() {
        // Clean expired cache entries every 5 minutes
        setInterval(() => {
            this.cleanExpiredCache();
        }, 5 * 60 * 1000);
    }

    /**
     * Load API key from environment or storage
     */
    loadAPIKey() {
        // Try to load from storage first
        const storedKey = localStorage.getItem('ncs-api-key');
        if (storedKey) {
            this.auth.apiKey = storedKey;
            return;
        }
        
        // For development, allow API key in URL params
        if (CONFIG.IS_DEV) {
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get('api-key');
            if (apiKey) {
                this.setAPIKey(apiKey);
            }
        }
    }

    /**
     * Core HTTP request method
     */
    async request(config) {
        const startTime = performance.now();
        
        // Normalize config
        const requestConfig = this.normalizeConfig(config);
        
        // Check rate limiting
        if (!this.checkRateLimit()) {
            throw new APIError('Rate limit exceeded', 429, requestConfig);
        }
        
        // Check cache first (for GET requests)
        if (requestConfig.method === 'GET' && this.cacheConfig.enabled) {
            const cached = this.getFromCache(requestConfig);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }
            this.metrics.cacheMisses++;
        }
        
        // If offline, queue the request
        if (!this.isOnline && requestConfig.method !== 'GET') {
            return this.queueRequest(requestConfig);
        }
        
        // Apply request interceptors
        let finalConfig = requestConfig;
        for (const interceptor of this.requestInterceptors) {
            finalConfig = await interceptor(finalConfig);
        }
        
        try {
            // Make the actual request
            const response = await this.makeRequest(finalConfig);
            
            // Apply response interceptors
            let finalResponse = response;
            for (const interceptor of this.responseInterceptors) {
                finalResponse = await interceptor[0](finalResponse);
            }
            
            // Cache successful GET responses
            if (finalConfig.method === 'GET' && this.cacheConfig.enabled && response.ok) {
                this.setCache(finalConfig, finalResponse);
            }
            
            // Track metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(true, responseTime);
            
            return finalResponse;
            
        } catch (error) {
            // Apply error interceptors
            for (const interceptor of this.responseInterceptors) {
                if (interceptor[1]) {
                    try {
                        return await interceptor[1](error);
                    } catch (interceptorError) {
                        error = interceptorError;
                    }
                }
            }
            
            // Apply error interceptors
            for (const interceptor of this.errorInterceptors) {
                error = interceptor(error);
            }
            
            // Track metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(false, responseTime);
            
            throw error;
        }
    }

    /**
     * Make the actual HTTP request
     */
    async makeRequest(config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        try {
            const response = await fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.body,
                signal: controller.signal,
                credentials: config.credentials || 'same-origin'
            });
            
            clearTimeout(timeoutId);
            
            // Parse response
            const parsedResponse = await this.parseResponse(response, config);
            
            if (!response.ok) {
                throw new APIError(
                    parsedResponse.message || `HTTP ${response.status}`,
                    response.status,
                    config,
                    parsedResponse
                );
            }
            
            return {
                data: parsedResponse,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                config
            };
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408, config);
            }
            
            if (error instanceof APIError) {
                throw error;
            }
            
            // Network error
            throw new APIError(
                'Network error: ' + error.message,
                0,
                config,
                null,
                error
            );
        }
    }

    /**
     * Parse response based on content type
     */
    async parseResponse(response, config) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType.includes('text/')) {
            return await response.text();
        } else if (contentType.includes('application/octet-stream')) {
            return await response.arrayBuffer();
        } else {
            return await response.blob();
        }
    }

    /**
     * Normalize request configuration
     */
    normalizeConfig(config) {
        if (typeof config === 'string') {
            config = { url: config };
        }
        
        return {
            method: 'GET',
            timeout: this.options.timeout,
            headers: { ...this.defaultHeaders },
            retries: this.options.retries,
            retryDelay: this.options.retryDelay,
            ...config,
            url: this.buildURL(config.url),
            headers: { ...this.defaultHeaders, ...(config.headers || {}) }
        };
    }

    /**
     * Build full URL
     */
    buildURL(url) {
        if (url.startsWith('http')) {
            return url;
        }
        
        const baseURL = this.options.baseURL.replace(/\/$/, '');
        const path = url.startsWith('/') ? url : '/' + url;
        
        return baseURL + path;
    }

    /**
     * HTTP method helpers
     */
    async get(url, config = {}) {
        return this.request({ ...config, method: 'GET', url });
    }

    async post(url, data = null, config = {}) {
        return this.request({
            ...config,
            method: 'POST',
            url,
            body: this.serializeData(data, config.headers)
        });
    }

    async put(url, data = null, config = {}) {
        return this.request({
            ...config,
            method: 'PUT',
            url,
            body: this.serializeData(data, config.headers)
        });
    }

    async patch(url, data = null, config = {}) {
        return this.request({
            ...config,
            method: 'PATCH',
            url,
            body: this.serializeData(data, config.headers)
        });
    }

    async delete(url, config = {}) {
        return this.request({ ...config, method: 'DELETE', url });
    }

    /**
     * Serialize data based on content type
     */
    serializeData(data, headers = {}) {
        if (!data) return null;
        
        const contentType = headers['Content-Type'] || this.defaultHeaders['Content-Type'];
        
        if (contentType.includes('application/json')) {
            return JSON.stringify(data);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            return new URLSearchParams(data).toString();
        } else if (data instanceof FormData || data instanceof Blob) {
            return data;
        } else {
            return JSON.stringify(data);
        }
    }

    /**
     * Clustering API methods
     */
    async cluster(data, algorithm = 'ncs', options = {}) {
        return this.post('/cluster', {
            data,
            algorithm,
            options: {
                k: 4,
                maxIterations: 100,
                tolerance: 0.001,
                ...options
            }
        });
    }

    async clusterAsync(data, algorithm = 'ncs', options = {}) {
        const response = await this.post('/cluster/async', {
            data,
            algorithm,
            options
        });
        
        return response.data.jobId;
    }

    async getClusterJob(jobId) {
        return this.get(`/cluster/jobs/${jobId}`);
    }

    async getAlgorithms() {
        return this.get('/algorithms');
    }

    async getAlgorithmInfo(algorithm) {
        return this.get(`/algorithms/${algorithm}`);
    }

    async validateData(data) {
        return this.post('/data/validate', { data });
    }

    async preprocessData(data, options = {}) {
        return this.post('/data/preprocess', { data, options });
    }

    async getBenchmarks() {
        return this.get('/benchmarks');
    }

    async runBenchmark(algorithm, dataset) {
        return this.post('/benchmarks/run', { algorithm, dataset });
    }

    async getHealth() {
        return this.get('/health');
    }

    async getMetrics() {
        return this.get('/metrics');
    }

    /**
     * Authentication methods
     */
    setAPIKey(apiKey) {
        this.auth.apiKey = apiKey;
        this.defaultHeaders[CONFIG.SECURITY.API_KEY_HEADER] = apiKey;
        localStorage.setItem('ncs-api-key', apiKey);
    }

    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        
        if (response.data.token) {
            this.setAuthTokens(response.data);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            // Ignore logout errors
        } finally {
            this.clearAuth();
        }
    }

    setAuthTokens(tokens) {
        this.auth.token = tokens.token;
        this.auth.refreshToken = tokens.refreshToken;
        this.auth.expiresAt = Date.now() + (tokens.expiresIn * 1000);
        
        this.saveAuth();
    }

    async refreshAuthToken() {
        if (!this.auth.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        const response = await this.post('/auth/refresh', {
            refreshToken: this.auth.refreshToken
        });
        
        this.setAuthTokens(response.data);
        return response;
    }

    isTokenExpired() {
        return this.auth.expiresAt && Date.now() >= this.auth.expiresAt;
    }

    clearAuth() {
        this.auth.token = null;
        this.auth.refreshToken = null;
        this.auth.expiresAt = null;
        
        delete this.defaultHeaders['Authorization'];
        
        localStorage.removeItem('ncs-auth');
    }

    saveAuth() {
        localStorage.setItem('ncs-auth', JSON.stringify({
            token: this.auth.token,
            refreshToken: this.auth.refreshToken,
            expiresAt: this.auth.expiresAt
        }));
    }

    loadAuth() {
        try {
            const saved = localStorage.getItem('ncs-auth');
            if (saved) {
                const auth = JSON.parse(saved);
                Object.assign(this.auth, auth);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load auth from storage:', error);
        }
    }

    /**
     * Cache management
     */
    getCacheKey(config) {
        return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    }

    getFromCache(config) {
        if (!this.cacheConfig.enabled) return null;
        
        const key = this.getCacheKey(config);
        const cached = this.cache.get(key);
        
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }
        
        // Remove expired entry
        if (cached) {
            this.cache.delete(key);
        }
        
        return null;
    }

    setCache(config, data) {
        if (!this.cacheConfig.enabled) return;
        
        // Check cache size limit
        if (this.cache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        const key = this.getCacheKey(config);
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.cacheConfig.ttl
        });
    }

    clearCache() {
        this.cache.clear();
    }

    cleanExpiredCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Interceptor management
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(successInterceptor, errorInterceptor) {
        this.responseInterceptors.push([successInterceptor, errorInterceptor]);
    }

    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
    }

    /**
     * Rate limiting
     */
    checkRateLimit() {
        const now = Date.now();
        
        // Remove old requests outside the window
        this.rateLimiter.requests = this.rateLimiter.requests.filter(
            timestamp => now - timestamp < this.rateLimiter.windowMs
        );
        
        // Check if under limit
        if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
            return false;
        }
        
        // Add current request
        this.rateLimiter.requests.push(now);
        return true;
    }

    /**
     * Request queue for offline support
     */
    queueRequest(config) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                config,
                resolve,
                reject,
                timestamp: Date.now()
            });
        });
    }

    async processRequestQueue() {
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        for (const item of queue) {
            try {
                const response = await this.request(item.config);
                item.resolve(response);
            } catch (error) {
                item.reject(error);
            }
        }
    }

    /**
     * Metrics and monitoring
     */
    updateMetrics(success, responseTime) {
        this.metrics.requests++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        // Report to performance monitoring
        if (window.NCS?.performance) {
            window.NCS.performance.trackMetric('api_request_time', responseTime);
            window.NCS.performance.trackMetric('api_success_rate', 
                this.metrics.successfulRequests / this.metrics.requests
            );
        }
    }

    trackError(error) {
        if (window.NCS?.performance) {
            window.NCS.performance.trackError(error, {
                type: 'api_error',
                status: error.status,
                url: error.config?.url
            });
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            queueSize: this.requestQueue.length,
            isOnline: this.isOnline
        };
    }

    /**
     * Error handling
     */
    handleAuthError(error) {
        this.clearAuth();
        
        // Emit auth error event
        if (window.NCS?.app) {
            window.NCS.app.emit('auth:error', error);
        }
    }

    /**
     * Utility methods
     */
    isNetworkError(error) {
        return error.status === 0 || !this.isOnline;
    }

    shouldRetry(error, retryCount) {
        if (retryCount >= this.options.retries) {
            return false;
        }
        
        // Retry on network errors and 5xx status codes
        return this.isNetworkError(error) || 
               (error.status >= 500 && error.status < 600);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.clearCache();
        this.requestQueue = [];
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];
        
        console.log('🗑️ API Client destroyed');
    }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(message, status = 0, config = null, response = null, originalError = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.config = config;
        this.response = response;
        this.originalError = originalError;
        this.timestamp = Date.now();
    }
    
    get isNetworkError() {
        return this.status === 0;
    }
    
    get isTimeout() {
        return this.status === 408;
    }
    
    get isServerError() {
        return this.status >= 500 && this.status < 600;
    }
    
    get isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    
    toString() {
        return `APIError: ${this.message} (${this.status})`;
    }
}

/**
 * Create default API client instance
 */
export const apiClient = new ApiClient();

export default ApiClient;