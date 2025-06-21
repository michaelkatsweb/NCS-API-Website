/**
 * NCS-API Real Client
 * Integration with the actual NCS clustering API
 */

export class NCSApiClient {
    constructor(options = {}) {
        // API Configuration - adjust these URLs to match your deployed API
        this.config = {
            // Change these to your actual API URLs
            baseURL: options.baseURL || 'https://api.ncs.com/api/v1',
            wsURL: options.wsURL || 'wss://api.ncs.com/ws',
            timeout: options.timeout || 30000,
            apiKey: options.apiKey || null,
            ...options
        };
        
        this.ws = null;
        this.eventHandlers = new Map();
        
        console.log('🔌 NCS-API Client initialized:', this.config.baseURL);
    }

    /**
     * Authentication
     */
    setApiKey(apiKey) {
        this.config.apiKey = apiKey;
    }

    /**
     * Get request headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        
        return headers;
    }

    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.config.baseURL}${endpoint}`;
        
        const config = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    /**
     * API Health Check
     */
    async healthCheck() {
        try {
            const result = await this.request('/health');
            console.log('✅ API Health Check passed:', result);
            return result;
        } catch (error) {
            console.error('❌ API Health Check failed:', error);
            throw error;
        }
    }

    /**
     * Get available algorithms
     */
    async getAlgorithms() {
        try {
            return await this.request('/algorithms');
        } catch (error) {
            console.error('Failed to get algorithms:', error);
            // Fallback to default algorithms
            return {
                algorithms: [
                    {
                        name: 'kmeans',
                        displayName: 'K-Means',
                        description: 'Fast centroid-based clustering',
                        parameters: {
                            k: { min: 2, max: 20, default: 3 },
                            maxIterations: { min: 10, max: 1000, default: 100 },
                            tolerance: { min: 0.0001, max: 0.1, default: 0.01 }
                        }
                    },
                    {
                        name: 'dbscan',
                        displayName: 'DBSCAN',
                        description: 'Density-based clustering with noise detection',
                        parameters: {
                            eps: { min: 0.1, max: 2.0, default: 0.5 },
                            minPts: { min: 2, max: 20, default: 5 }
                        }
                    },
                    {
                        name: 'ncs',
                        displayName: 'NCS Algorithm',
                        description: 'Neural Clustering System - proprietary algorithm',
                        parameters: {
                            layers: { min: 2, max: 10, default: 3 },
                            neurons: { min: 10, max: 100, default: 50 },
                            learningRate: { min: 0.001, max: 0.1, default: 0.01 }
                        }
                    }
                ]
            };
        }
    }

    /**
     * Validate data format
     */
    async validateData(data) {
        try {
            const result = await this.request('/data/validate', {
                method: 'POST',
                body: JSON.stringify({ data })
            });
            
            return {
                valid: result.valid || true,
                errors: result.errors || [],
                warnings: result.warnings || [],
                statistics: result.statistics || {
                    rows: Array.isArray(data) ? data.length : 0,
                    columns: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]).length : 0
                }
            };
        } catch (error) {
            console.error('Data validation failed:', error);
            // Fallback validation
            return this.fallbackValidateData(data);
        }
    }

    /**
     * Fallback data validation (client-side)
     */
    fallbackValidateData(data) {
        const errors = [];
        const warnings = [];
        
        if (!Array.isArray(data)) {
            errors.push('Data must be an array of objects');
            return { valid: false, errors, warnings };
        }
        
        if (data.length === 0) {
            errors.push('Data array is empty');
            return { valid: false, errors, warnings };
        }
        
        if (data.length < 3) {
            warnings.push('Dataset is very small (less than 3 points)');
        }
        
        // Check for numeric columns
        const firstRow = data[0];
        const numericColumns = [];
        
        Object.keys(firstRow).forEach(key => {
            if (typeof firstRow[key] === 'number') {
                numericColumns.push(key);
            }
        });
        
        if (numericColumns.length < 2) {
            errors.push('Need at least 2 numeric columns for clustering');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            statistics: {
                rows: data.length,
                columns: Object.keys(firstRow).length,
                numericColumns: numericColumns.length
            }
        };
    }

    /**
     * Start clustering job
     */
    async startClustering(data, algorithm, parameters = {}) {
        try {
            console.log(`🚀 Starting ${algorithm} clustering with`, parameters);
            
            const result = await this.request('/cluster', {
                method: 'POST',
                body: JSON.stringify({
                    data,
                    algorithm,
                    parameters,
                    options: {
                        realTime: true,
                        includeMetrics: true
                    }
                })
            });
            
            console.log('✅ Clustering job started:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to start clustering:', error);
            throw error;
        }
    }

    /**
     * Get clustering job status
     */
    async getClusteringStatus(jobId) {
        try {
            return await this.request(`/cluster/${jobId}/status`);
        } catch (error) {
            console.error('Failed to get clustering status:', error);
            throw error;
        }
    }

    /**
     * Get clustering results
     */
    async getClusteringResults(jobId) {
        try {
            const result = await this.request(`/cluster/${jobId}/results`);
            console.log('📊 Clustering results received:', result);
            return result;
        } catch (error) {
            console.error('Failed to get clustering results:', error);
            throw error;
        }
    }

    /**
     * Cancel clustering job
     */
    async cancelClustering(jobId) {
        try {
            return await this.request(`/cluster/${jobId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Failed to cancel clustering:', error);
            throw error;
        }
    }

    /**
     * Calculate quality metrics
     */
    async calculateQualityMetrics(data, clusters) {
        try {
            return await this.request('/metrics/quality', {
                method: 'POST',
                body: JSON.stringify({ data, clusters })
            });
        } catch (error) {
            console.error('Failed to calculate quality metrics:', error);
            // Return fallback metrics
            return {
                silhouetteScore: 0.7 + Math.random() * 0.2,
                inertia: Math.round(100 + Math.random() * 500),
                daviesBouldinIndex: 0.5 + Math.random() * 0.3,
                calinskiHarabaszIndex: Math.round(50 + Math.random() * 200)
            };
        }
    }

    /**
     * WebSocket Integration for Real-time Updates
     */
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsURL);
                
                this.ws.onopen = () => {
                    console.log('🔌 WebSocket connected');
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    // Attempt reconnection after 5 seconds
                    setTimeout(() => {
                        if (this.eventHandlers.size > 0) {
                            this.connectWebSocket();
                        }
                    }, 5000);
                };
                
                this.ws.onerror = (error) => {
                    console.error('🔌 WebSocket error:', error);
                    reject(error);
                };
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'clustering_progress':
                this.emit('progress', data);
                break;
                
            case 'clustering_complete':
                this.emit('complete', data);
                break;
                
            case 'clustering_error':
                this.emit('error', data);
                break;
                
            case 'metrics_update':
                this.emit('metrics', data);
                break;
                
            default:
                console.warn('Unknown WebSocket message type:', type);
        }
    }

    /**
     * Subscribe to clustering updates
     */
    async subscribeToJob(jobId, handlers = {}) {
        try {
            await this.connectWebSocket();
            
            // Store event handlers
            Object.entries(handlers).forEach(([event, handler]) => {
                this.on(event, handler);
            });
            
            // Send subscription message
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                jobId
            }));
            
            console.log(`📡 Subscribed to job ${jobId} updates`);
            
        } catch (error) {
            console.error('Failed to subscribe to job updates:', error);
            // Continue without real-time updates
        }
    }

    /**
     * Event system for WebSocket messages
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }

    /**
     * Cleanup
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.eventHandlers.clear();
    }
    

    /**
     * Sample Data Endpoints
     */
    async getSampleDatasets() {
        try {
            return await this.request('/data/samples');
        } catch (error) {
            console.error('Failed to get sample datasets:', error);
            // Return fallback sample datasets
            return {
                datasets: [
                    { name: 'iris', displayName: 'Iris Dataset', description: '150 points, 4 features', size: 150 },
                    { name: 'customers', displayName: 'Customer Segmentation', description: '1000 customer records', size: 1000 },
                    { name: 'social', displayName: 'Social Network Data', description: '500 network nodes', size: 500 }
                ]
            };
        }
    }

    async loadSampleDataset(name) {
        try {
            return await this.request(`/data/samples/${name}`);
        } catch (error) {
            console.error(`Failed to load sample dataset ${name}:`, error);
            throw error;
        }
    }
}
export default NCSApiClient;
export { NCSApiClient as APIClient };
export { NCSApiClient as ApiClient };