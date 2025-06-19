/**
 * Storage Utility Module for NCS-API-Website
 * Provides unified interface for data persistence using localStorage, sessionStorage, and IndexedDB
 * Handles datasets, models, user preferences, and application state with automatic compression
 */

import { EventBus } from '../core/eventBus.js';

export class StorageManager {
    constructor(options = {}) {
        this.options = {
            // Storage preferences
            preferredStorage: options.preferredStorage || 'auto', // auto, localStorage, sessionStorage, indexedDB
            fallbackStorage: options.fallbackStorage || 'localStorage',
            
            // Compression settings
            enableCompression: options.enableCompression !== false,
            compressionThreshold: options.compressionThreshold || 1024, // Bytes
            
            // Encryption settings (basic)
            enableEncryption: options.enableEncryption || false,
            encryptionKey: options.encryptionKey || 'ncs-api-default-key',
            
            // Storage limits
            maxStorageSize: options.maxStorageSize || 50 * 1024 * 1024, // 50MB
            maxItems: options.maxItems || 1000,
            
            // Automatic cleanup
            enableAutoCleanup: options.enableAutoCleanup !== false,
            maxAge: options.maxAge || 30 * 24 * 60 * 60 * 1000, // 30 days
            
            // Versioning
            enableVersioning: options.enableVersioning || true,
            maxVersions: options.maxVersions || 5,
            
            ...options
        };

        // Storage backends
        this.backends = {
            localStorage: new LocalStorageBackend(),
            sessionStorage: new SessionStorageBackend(),
            indexedDB: new IndexedDBBackend(),
            memory: new MemoryBackend()
        };

        // Current backend
        this.currentBackend = null;
        this.isInitialized = false;
        
        // Cache for frequently accessed items
        this.cache = new Map();
        this.cacheMaxSize = 100;
        
        // Storage categories
        this.categories = {
            datasets: 'datasets',
            models: 'models',
            preferences: 'preferences',
            sessions: 'sessions',
            cache: 'cache',
            temp: 'temp'
        };

        // Metadata tracking
        this.metadata = new Map();
        
        this.initialize();
    }

    /**
     * Initialize storage manager
     */
    async initialize() {
        try {
            // Detect best available storage backend
            this.currentBackend = await this.detectBestBackend();
            
            // Initialize the backend
            await this.currentBackend.initialize();
            
            // Load metadata
            await this.loadMetadata();
            
            // Setup automatic cleanup
            if (this.options.enableAutoCleanup) {
                this.setupAutoCleanup();
            }
            
            this.isInitialized = true;
            
            EventBus.emit('storage:initialized', {
                backend: this.currentBackend.name,
                options: this.options
            });
            
        } catch (error) {
            console.error('Storage initialization failed:', error);
            // Fallback to memory storage
            this.currentBackend = this.backends.memory;
            await this.currentBackend.initialize();
            this.isInitialized = true;
        }
    }

    /**
     * Detect best available storage backend
     * @returns {Promise<Object>} Best storage backend
     */
    async detectBestBackend() {
        if (this.options.preferredStorage !== 'auto') {
            const preferred = this.backends[this.options.preferredStorage];
            if (preferred && await preferred.isAvailable()) {
                return preferred;
            }
        }

        // Test backends in order of preference
        const backendOrder = ['indexedDB', 'localStorage', 'sessionStorage', 'memory'];
        
        for (const backendName of backendOrder) {
            const backend = this.backends[backendName];
            if (backend && await backend.isAvailable()) {
                return backend;
            }
        }

        // Fallback to memory
        return this.backends.memory;
    }

    /**
     * Store data with automatic backend selection and optimization
     * @param {String} key - Storage key
     * @param {*} data - Data to store
     * @param {Object} options - Storage options
     * @returns {Promise<Boolean>} Success status
     */
    async store(key, data, options = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const storeOptions = {
                category: options.category || 'general',
                compress: options.compress !== false && this.options.enableCompression,
                encrypt: options.encrypt || this.options.enableEncryption,
                ttl: options.ttl, // Time to live in milliseconds
                versioning: options.versioning !== false && this.options.enableVersioning,
                metadata: options.metadata || {},
                ...options
            };

            // Prepare data for storage
            const preparedData = await this.prepareDataForStorage(data, storeOptions);
            
            // Create metadata entry
            const metadata = {
                key,
                category: storeOptions.category,
                size: this.calculateSize(preparedData),
                created: Date.now(),
                modified: Date.now(),
                accessed: Date.now(),
                ttl: storeOptions.ttl,
                compressed: preparedData.compressed,
                encrypted: preparedData.encrypted,
                version: storeOptions.versioning ? this.getNextVersion(key) : 1,
                ...storeOptions.metadata
            };

            // Check storage limits
            await this.checkStorageLimits(metadata.size);
            
            // Handle versioning
            if (storeOptions.versioning) {
                await this.manageVersions(key, metadata.version);
            }

            // Store data and metadata
            const storageKey = this.buildStorageKey(key, storeOptions.category, metadata.version);
            const success = await this.currentBackend.set(storageKey, preparedData.data);
            
            if (success) {
                this.metadata.set(key, metadata);
                await this.saveMetadata();
                
                // Update cache
                this.updateCache(key, data);
                
                EventBus.emit('storage:stored', {
                    key,
                    category: storeOptions.category,
                    size: metadata.size,
                    backend: this.currentBackend.name
                });
                
                return true;
            }

            return false;

        } catch (error) {
            EventBus.emit('storage:error', { 
                operation: 'store',
                key,
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Retrieve data from storage
     * @param {String} key - Storage key
     * @param {Object} options - Retrieval options
     * @returns {Promise<*>} Retrieved data or null
     */
    async retrieve(key, options = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const retrieveOptions = {
                category: options.category || 'general',
                version: options.version || 'latest',
                updateAccess: options.updateAccess !== false,
                useCache: options.useCache !== false,
                ...options
            };

            // Check cache first
            if (retrieveOptions.useCache && this.cache.has(key)) {
                const cached = this.cache.get(key);
                if (Date.now() - cached.timestamp < 60000) { // Cache valid for 1 minute
                    return cached.data;
                }
            }

            // Get metadata
            const metadata = this.metadata.get(key);
            if (!metadata) {
                return null;
            }

            // Check TTL
            if (metadata.ttl && Date.now() > metadata.created + metadata.ttl) {
                await this.remove(key);
                return null;
            }

            // Determine version to retrieve
            const version = retrieveOptions.version === 'latest' ? metadata.version : retrieveOptions.version;
            
            // Build storage key
            const storageKey = this.buildStorageKey(key, metadata.category, version);
            
            // Retrieve raw data
            const rawData = await this.currentBackend.get(storageKey);
            if (!rawData) {
                return null;
            }

            // Process retrieved data
            const data = await this.processRetrievedData(rawData, metadata);

            // Update access time
            if (retrieveOptions.updateAccess) {
                metadata.accessed = Date.now();
                await this.saveMetadata();
            }

            // Update cache
            if (retrieveOptions.useCache) {
                this.updateCache(key, data);
            }

            EventBus.emit('storage:retrieved', {
                key,
                category: metadata.category,
                size: metadata.size,
                backend: this.currentBackend.name
            });

            return data;

        } catch (error) {
            EventBus.emit('storage:error', {
                operation: 'retrieve',
                key,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Remove data from storage
     * @param {String} key - Storage key
     * @param {Object} options - Removal options
     * @returns {Promise<Boolean>} Success status
     */
    async remove(key, options = {}) {
        try {
            const removeOptions = {
                category: options.category || 'general',
                removeAllVersions: options.removeAllVersions !== false,
                ...options
            };

            const metadata = this.metadata.get(key);
            if (!metadata) {
                return false;
            }

            // Remove all versions if requested
            if (removeOptions.removeAllVersions) {
                for (let version = 1; version <= metadata.version; version++) {
                    const storageKey = this.buildStorageKey(key, metadata.category, version);
                    await this.currentBackend.remove(storageKey);
                }
            } else {
                // Remove only latest version
                const storageKey = this.buildStorageKey(key, metadata.category, metadata.version);
                await this.currentBackend.remove(storageKey);
            }

            // Remove metadata
            this.metadata.delete(key);
            await this.saveMetadata();

            // Remove from cache
            this.cache.delete(key);

            EventBus.emit('storage:removed', {
                key,
                category: metadata.category,
                backend: this.currentBackend.name
            });

            return true;

        } catch (error) {
            EventBus.emit('storage:error', {
                operation: 'remove',
                key,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * List stored items by category
     * @param {String} category - Storage category
     * @param {Object} options - List options
     * @returns {Promise<Array>} List of items
     */
    async list(category = null, options = {}) {
        try {
            const listOptions = {
                includeMetadata: options.includeMetadata || false,
                sortBy: options.sortBy || 'modified', // created, modified, accessed, size
                sortOrder: options.sortOrder || 'desc',
                limit: options.limit || 100,
                offset: options.offset || 0,
                ...options
            };

            let items = Array.from(this.metadata.entries()).map(([key, metadata]) => ({
                key,
                ...metadata
            }));

            // Filter by category
            if (category) {
                items = items.filter(item => item.category === category);
            }

            // Filter expired items
            items = items.filter(item => {
                if (item.ttl && Date.now() > item.created + item.ttl) {
                    // Remove expired item
                    this.remove(item.key).catch(console.error);
                    return false;
                }
                return true;
            });

            // Sort items
            items.sort((a, b) => {
                const valueA = a[listOptions.sortBy] || 0;
                const valueB = b[listOptions.sortBy] || 0;
                
                if (listOptions.sortOrder === 'asc') {
                    return valueA - valueB;
                } else {
                    return valueB - valueA;
                }
            });

            // Apply pagination
            const startIndex = listOptions.offset;
            const endIndex = startIndex + listOptions.limit;
            items = items.slice(startIndex, endIndex);

            // Remove metadata if not requested
            if (!listOptions.includeMetadata) {
                items = items.map(item => ({
                    key: item.key,
                    category: item.category,
                    size: item.size,
                    created: item.created,
                    modified: item.modified
                }));
            }

            return items;

        } catch (error) {
            EventBus.emit('storage:error', {
                operation: 'list',
                category,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage statistics
     */
    async getStats() {
        try {
            const stats = {
                backend: this.currentBackend.name,
                totalItems: this.metadata.size,
                totalSize: 0,
                categories: {},
                oldest: null,
                newest: null,
                mostAccessed: null,
                largestItem: null
            };

            let oldestTime = Infinity;
            let newestTime = 0;
            let maxAccessed = 0;
            let maxSize = 0;

            for (const [key, metadata] of this.metadata.entries()) {
                stats.totalSize += metadata.size;

                // Category stats
                if (!stats.categories[metadata.category]) {
                    stats.categories[metadata.category] = {
                        count: 0,
                        size: 0
                    };
                }
                stats.categories[metadata.category].count++;
                stats.categories[metadata.category].size += metadata.size;

                // Oldest item
                if (metadata.created < oldestTime) {
                    oldestTime = metadata.created;
                    stats.oldest = { key, created: metadata.created };
                }

                // Newest item
                if (metadata.created > newestTime) {
                    newestTime = metadata.created;
                    stats.newest = { key, created: metadata.created };
                }

                // Most accessed item
                if (metadata.accessed > maxAccessed) {
                    maxAccessed = metadata.accessed;
                    stats.mostAccessed = { key, accessed: metadata.accessed };
                }

                // Largest item
                if (metadata.size > maxSize) {
                    maxSize = metadata.size;
                    stats.largestItem = { key, size: metadata.size };
                }
            }

            // Backend-specific stats
            if (this.currentBackend.getStats) {
                stats.backendStats = await this.currentBackend.getStats();
            }

            return stats;

        } catch (error) {
            EventBus.emit('storage:error', {
                operation: 'getStats',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clear storage by category or entirely
     * @param {String} category - Category to clear (null for all)
     * @returns {Promise<Number>} Number of items removed
     */
    async clear(category = null) {
        try {
            let removedCount = 0;
            const keysToRemove = [];

            for (const [key, metadata] of this.metadata.entries()) {
                if (!category || metadata.category === category) {
                    keysToRemove.push(key);
                }
            }

            for (const key of keysToRemove) {
                await this.remove(key);
                removedCount++;
            }

            EventBus.emit('storage:cleared', {
                category,
                removedCount,
                backend: this.currentBackend.name
            });

            return removedCount;

        } catch (error) {
            EventBus.emit('storage:error', {
                operation: 'clear',
                category,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Prepare data for storage (compression, encryption)
     * @param {*} data - Data to prepare
     * @param {Object} options - Preparation options
     * @returns {Promise<Object>} Prepared data object
     */
    async prepareDataForStorage(data, options) {
        let preparedData = {
            data: JSON.stringify(data),
            compressed: false,
            encrypted: false,
            originalSize: 0
        };

        preparedData.originalSize = this.calculateSize(preparedData.data);

        // Compression
        if (options.compress && preparedData.originalSize > this.options.compressionThreshold) {
            try {
                preparedData.data = await this.compress(preparedData.data);
                preparedData.compressed = true;
            } catch (error) {
                console.warn('Compression failed:', error);
            }
        }

        // Basic encryption (for sensitive data)
        if (options.encrypt) {
            try {
                preparedData.data = await this.encrypt(preparedData.data);
                preparedData.encrypted = true;
            } catch (error) {
                console.warn('Encryption failed:', error);
            }
        }

        return preparedData;
    }

    /**
     * Process retrieved data (decompression, decryption)
     * @param {Object} rawData - Raw data from storage
     * @param {Object} metadata - Storage metadata
     * @returns {Promise<*>} Processed data
     */
    async processRetrievedData(rawData, metadata) {
        let processedData = rawData;

        // Decryption
        if (metadata.encrypted) {
            try {
                processedData = await this.decrypt(processedData);
            } catch (error) {
                throw new Error('Failed to decrypt data: ' + error.message);
            }
        }

        // Decompression
        if (metadata.compressed) {
            try {
                processedData = await this.decompress(processedData);
            } catch (error) {
                throw new Error('Failed to decompress data: ' + error.message);
            }
        }

        // Parse JSON
        try {
            return JSON.parse(processedData);
        } catch (error) {
            throw new Error('Failed to parse stored data: ' + error.message);
        }
    }

    /**
     * Compress data using simple LZ-style compression
     * @param {String} data - Data to compress
     * @returns {Promise<String>} Compressed data
     */
    async compress(data) {
        // Simple RLE compression for demonstration
        // In production, you might use a proper compression library
        return data.replace(/(.)\1+/g, (match, char) => {
            return match.length > 3 ? `${char}${match.length}` : match;
        });
    }

    /**
     * Decompress data
     * @param {String} data - Compressed data
     * @returns {Promise<String>} Decompressed data
     */
    async decompress(data) {
        // Simple RLE decompression
        return data.replace(/(.)\d+/g, (match, char) => {
            const count = parseInt(match.slice(1));
            return char.repeat(count);
        });
    }

    /**
     * Basic encryption (not cryptographically secure - for demo only)
     * @param {String} data - Data to encrypt
     * @returns {Promise<String>} Encrypted data
     */
    async encrypt(data) {
        // Simple XOR encryption for demonstration
        // In production, use proper encryption libraries
        const key = this.options.encryptionKey;
        let encrypted = '';
        
        for (let i = 0; i < data.length; i++) {
            encrypted += String.fromCharCode(
                data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        
        return btoa(encrypted); // Base64 encode
    }

    /**
     * Basic decryption
     * @param {String} data - Encrypted data
     * @returns {Promise<String>} Decrypted data
     */
    async decrypt(data) {
        try {
            const encrypted = atob(data); // Base64 decode
            const key = this.options.encryptionKey;
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                decrypted += String.fromCharCode(
                    encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            
            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed');
        }
    }

    /**
     * Utility methods
     */

    buildStorageKey(key, category, version = 1) {
        return `ncs_${category}_${key}_v${version}`;
    }

    calculateSize(data) {
        return new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;
    }

    getNextVersion(key) {
        const metadata = this.metadata.get(key);
        return metadata ? metadata.version + 1 : 1;
    }

    updateCache(key, data) {
        // Implement LRU cache
        if (this.cache.size >= this.cacheMaxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async checkStorageLimits(newItemSize) {
        const stats = await this.getStats();
        
        if (stats.totalSize + newItemSize > this.options.maxStorageSize) {
            throw new Error('Storage size limit exceeded');
        }
        
        if (stats.totalItems >= this.options.maxItems) {
            throw new Error('Storage item limit exceeded');
        }
    }

    async manageVersions(key, newVersion) {
        if (newVersion > this.options.maxVersions) {
            // Remove oldest version
            const oldVersion = newVersion - this.options.maxVersions;
            const metadata = this.metadata.get(key);
            if (metadata) {
                const oldStorageKey = this.buildStorageKey(key, metadata.category, oldVersion);
                await this.currentBackend.remove(oldStorageKey);
            }
        }
    }

    async loadMetadata() {
        try {
            const metadataKey = 'ncs_storage_metadata';
            const rawMetadata = await this.currentBackend.get(metadataKey);
            
            if (rawMetadata) {
                const parsed = JSON.parse(rawMetadata);
                this.metadata = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.warn('Failed to load storage metadata:', error);
            this.metadata = new Map();
        }
    }

    async saveMetadata() {
        try {
            const metadataKey = 'ncs_storage_metadata';
            const serialized = JSON.stringify(Object.fromEntries(this.metadata));
            await this.currentBackend.set(metadataKey, serialized);
        } catch (error) {
            console.warn('Failed to save storage metadata:', error);
        }
    }

    setupAutoCleanup() {
        // Run cleanup every hour
        setInterval(() => {
            this.runCleanup().catch(console.error);
        }, 60 * 60 * 1000);
        
        // Run initial cleanup
        setTimeout(() => {
            this.runCleanup().catch(console.error);
        }, 5000);
    }

    async runCleanup() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (const [key, metadata] of this.metadata.entries()) {
            // Remove expired items
            if (metadata.ttl && now > metadata.created + metadata.ttl) {
                keysToRemove.push(key);
                continue;
            }
            
            // Remove old unused items
            if (now > metadata.accessed + this.options.maxAge) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            await this.remove(key);
        }
        
        if (keysToRemove.length > 0) {
            EventBus.emit('storage:cleanup', {
                removedItems: keysToRemove.length,
                backend: this.currentBackend.name
            });
        }
    }

    /**
     * Convenience methods for common operations
     */

    async saveDataset(name, dataset, metadata = {}) {
        return await this.store(name, dataset, {
            category: this.categories.datasets,
            metadata: {
                type: 'dataset',
                recordCount: dataset.length,
                ...metadata
            }
        });
    }

    async loadDataset(name) {
        return await this.retrieve(name, {
            category: this.categories.datasets
        });
    }

    async saveModel(name, model, metadata = {}) {
        return await this.store(name, model, {
            category: this.categories.models,
            metadata: {
                type: 'model',
                algorithm: model.algorithm,
                ...metadata
            }
        });
    }

    async loadModel(name) {
        return await this.retrieve(name, {
            category: this.categories.models
        });
    }

    async savePreferences(preferences) {
        return await this.store('user_preferences', preferences, {
            category: this.categories.preferences,
            versioning: false
        });
    }

    async loadPreferences() {
        return await this.retrieve('user_preferences', {
            category: this.categories.preferences
        });
    }

    async saveSession(sessionId, sessionData) {
        return await this.store(sessionId, sessionData, {
            category: this.categories.sessions,
            ttl: 24 * 60 * 60 * 1000 // 24 hours
        });
    }

    async loadSession(sessionId) {
        return await this.retrieve(sessionId, {
            category: this.categories.sessions
        });
    }
}

/**
 * Storage backend implementations
 */

class LocalStorageBackend {
    constructor() {
        this.name = 'localStorage';
    }

    async isAvailable() {
        try {
            const test = 'ncs_storage_test';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    async initialize() {
        // No initialization needed for localStorage
    }

    async get(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    async set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    async remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }

    async getStats() {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += key.length + (value ? value.length : 0);
        }
        
        return {
            totalKeys: localStorage.length,
            estimatedSize: totalSize
        };
    }
}

class SessionStorageBackend {
    constructor() {
        this.name = 'sessionStorage';
    }

    async isAvailable() {
        try {
            const test = 'ncs_storage_test';
            sessionStorage.setItem(test, 'test');
            sessionStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    async initialize() {
        // No initialization needed for sessionStorage
    }

    async get(key) {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    }

    async set(key, value) {
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    async remove(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }

    async getStats() {
        let totalSize = 0;
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            totalSize += key.length + (value ? value.length : 0);
        }
        
        return {
            totalKeys: sessionStorage.length,
            estimatedSize: totalSize
        };
    }
}

class IndexedDBBackend {
    constructor() {
        this.name = 'indexedDB';
        this.dbName = 'NCSStorageDB';
        this.version = 1;
        this.db = null;
    }

    async isAvailable() {
        return 'indexedDB' in window;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('storage')) {
                    db.createObjectStore('storage', { keyPath: 'key' });
                }
            };
        });
    }

    async get(key) {
        if (!this.db) return null;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['storage'], 'readonly');
            const store = transaction.objectStore('storage');
            const request = store.get(key);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
        });
    }

    async set(key, value) {
        if (!this.db) return false;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['storage'], 'readwrite');
            const store = transaction.objectStore('storage');
            const request = store.put({ key, value });
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    async remove(key) {
        if (!this.db) return false;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['storage'], 'readwrite');
            const store = transaction.objectStore('storage');
            const request = store.delete(key);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    async getStats() {
        if (!this.db) return { totalKeys: 0, estimatedSize: 0 };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['storage'], 'readonly');
            const store = transaction.objectStore('storage');
            const request = store.count();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve({
                    totalKeys: request.result,
                    estimatedSize: 0 // IndexedDB doesn't provide easy size calculation
                });
            };
        });
    }
}

class MemoryBackend {
    constructor() {
        this.name = 'memory';
        this.storage = new Map();
    }

    async isAvailable() {
        return true; // Always available as fallback
    }

    async initialize() {
        this.storage.clear();
    }

    async get(key) {
        return this.storage.get(key) || null;
    }

    async set(key, value) {
        this.storage.set(key, value);
        return true;
    }

    async remove(key) {
        return this.storage.delete(key);
    }

    async getStats() {
        let estimatedSize = 0;
        for (const [key, value] of this.storage.entries()) {
            estimatedSize += key.length + (typeof value === 'string' ? value.length : JSON.stringify(value).length);
        }
        
        return {
            totalKeys: this.storage.size,
            estimatedSize
        };
    }
}

// Create and export singleton instance
export const storage = new StorageManager();

// Export class for custom instances
export default StorageManager;