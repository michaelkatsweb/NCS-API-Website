/**
 * FILE: js/utils/storage.js
 * Storage Utility - Local/Session storage wrapper with encryption and validation
 * NCS-API Website
 * 
 * Features:
 * - Unified localStorage/sessionStorage interface
 * - Automatic JSON serialization/deserialization
 * - Data expiration and TTL support
 * - Optional encryption for sensitive data
 * - Storage quota management
 * - Fallback for unsupported browsers
 * - Event-driven storage changes
 * - Compression for large data
 * - Backup and restore functionality
 */

import { EventBus } from '../core/eventBus.js';

export class Storage {
    constructor(options = {}) {
        // Configuration
        this.config = {
            prefix: 'ncs_',
            defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
            enableEncryption: false,
            enableCompression: true,
            maxStorageSize: 5 * 1024 * 1024, // 5MB
            enableEvents: true,
            fallbackToMemory: true,
            autoCleanup: true,
            cleanupInterval: 60 * 60 * 1000, // 1 hour
            ...options
        };
        
        // Storage backends
        this.backends = {
            local: this.isStorageAvailable('localStorage') ? localStorage : null,
            session: this.isStorageAvailable('sessionStorage') ? sessionStorage : null,
            memory: new Map() // Fallback for unsupported browsers
        };
        
        // Event system
        this.eventBus = new EventBus();
        
        // Encryption key (simplified - in production use proper key management)
        this.encryptionKey = 'ncs-api-storage-key-2025';
        
        // Statistics tracking
        this.stats = {
            reads: 0,
            writes: 0,
            deletes: 0,
            errors: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Initialize
        this.init();
    }

    /**
     * Initialize storage system
     */
    init() {
        try {
            // Set up automatic cleanup
            if (this.config.autoCleanup) {
                this.setupAutoCleanup();
            }
            
            // Listen for storage events
            if (this.config.enableEvents && window.addEventListener) {
                window.addEventListener('storage', (e) => this.handleStorageEvent(e));
            }
            
            // Perform initial cleanup
            this.cleanup();
            
            console.log('🗄️ Storage system initialized');
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
        }
    }

    /**
     * Store data with optional TTL and encryption
     */
    set(key, value, options = {}) {
        try {
            const config = { ...this.config, ...options };
            const fullKey = this.getFullKey(key);
            const backend = this.getBackend(config.type);
            
            // Prepare data object
            const dataObject = {
                value: value,
                timestamp: Date.now(),
                ttl: config.ttl || config.defaultTTL,
                encrypted: config.enableEncryption,
                compressed: false,
                version: '1.0'
            };
            
            // Add expiration if TTL is set
            if (dataObject.ttl > 0) {
                dataObject.expires = dataObject.timestamp + dataObject.ttl;
            }
            
            // Serialize data
            let serializedData = JSON.stringify(dataObject);
            
            // Encrypt if enabled
            if (config.enableEncryption) {
                serializedData = this.encrypt(serializedData);
                dataObject.encrypted = true;
            }
            
            // Compress if enabled and data is large
            if (config.enableCompression && serializedData.length > 1024) {
                serializedData = this.compress(serializedData);
                dataObject.compressed = true;
            }
            
            // Check storage quota
            if (!this.checkQuota(serializedData.length)) {
                throw new Error('Storage quota exceeded');
            }
            
            // Store data
            if (backend === this.backends.memory) {
                backend.set(fullKey, serializedData);
            } else {
                backend.setItem(fullKey, serializedData);
            }
            
            // Update statistics
            this.stats.writes++;
            
            // Emit event
            if (config.enableEvents) {
                this.eventBus.emit('storage:set', { key, value, options: config });
            }
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`Storage set error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Retrieve data with automatic expiration check
     */
    get(key, defaultValue = null, options = {}) {
        try {
            const config = { ...this.config, ...options };
            const fullKey = this.getFullKey(key);
            const backend = this.getBackend(config.type);
            
            // Get raw data
            let rawData;
            if (backend === this.backends.memory) {
                rawData = backend.get(fullKey);
            } else {
                rawData = backend.getItem(fullKey);
            }
            
            // Return default if no data found
            if (rawData === null || rawData === undefined) {
                this.stats.cacheMisses++;
                return defaultValue;
            }
            
            // Decompress if needed
            if (this.isCompressed(rawData)) {
                rawData = this.decompress(rawData);
            }
            
            // Decrypt if needed
            if (this.isEncrypted(rawData)) {
                rawData = this.decrypt(rawData);
            }
            
            // Parse data object
            const dataObject = JSON.parse(rawData);
            
            // Check expiration
            if (this.isExpired(dataObject)) {
                this.delete(key, { type: config.type });
                this.stats.cacheMisses++;
                return defaultValue;
            }
            
            // Update statistics
            this.stats.reads++;
            this.stats.cacheHits++;
            
            // Emit event
            if (config.enableEvents) {
                this.eventBus.emit('storage:get', { key, value: dataObject.value, hit: true });
            }
            
            return dataObject.value;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`Storage get error for key "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Delete data from storage
     */
    delete(key, options = {}) {
        try {
            const config = { ...this.config, ...options };
            const fullKey = this.getFullKey(key);
            const backend = this.getBackend(config.type);
            
            // Get value before deletion for event
            const value = this.get(key, null, { type: config.type });
            
            // Delete from storage
            if (backend === this.backends.memory) {
                const existed = backend.has(fullKey);
                backend.delete(fullKey);
                if (!existed) return false;
            } else {
                if (backend.getItem(fullKey) === null) return false;
                backend.removeItem(fullKey);
            }
            
            // Update statistics
            this.stats.deletes++;
            
            // Emit event
            if (config.enableEvents) {
                this.eventBus.emit('storage:delete', { key, value });
            }
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`Storage delete error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Check if key exists in storage
     */
    has(key, options = {}) {
        try {
            const config = { ...this.config, ...options };
            const fullKey = this.getFullKey(key);
            const backend = this.getBackend(config.type);
            
            if (backend === this.backends.memory) {
                return backend.has(fullKey);
            } else {
                return backend.getItem(fullKey) !== null;
            }
        } catch (error) {
            console.error(`Storage has error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Get all keys with optional prefix filtering
     */
    keys(options = {}) {
        try {
            const config = { ...this.config, ...options };
            const backend = this.getBackend(config.type);
            const prefix = config.prefix || this.config.prefix;
            
            let allKeys = [];
            
            if (backend === this.backends.memory) {
                allKeys = Array.from(backend.keys());
            } else {
                for (let i = 0; i < backend.length; i++) {
                    const key = backend.key(i);
                    if (key) allKeys.push(key);
                }
            }
            
            // Filter by prefix and remove prefix
            return allKeys
                .filter(key => key.startsWith(prefix))
                .map(key => key.substring(prefix.length));
                
        } catch (error) {
            console.error('Storage keys error:', error);
            return [];
        }
    }

    /**
     * Clear all storage or keys with specific prefix
     */
    clear(options = {}) {
        try {
            const config = { ...this.config, ...options };
            const backend = this.getBackend(config.type);
            
            if (config.prefix) {
                // Clear only keys with specific prefix
                const keys = this.keys({ type: config.type });
                keys.forEach(key => this.delete(key, { type: config.type }));
            } else {
                // Clear all storage
                if (backend === this.backends.memory) {
                    backend.clear();
                } else {
                    backend.clear();
                }
            }
            
            // Emit event
            if (config.enableEvents) {
                this.eventBus.emit('storage:clear', { prefix: config.prefix });
            }
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Storage clear error:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    getUsage(options = {}) {
        try {
            const config = { ...this.config, ...options };
            const backend = this.getBackend(config.type);
            
            let totalSize = 0;
            let itemCount = 0;
            const items = {};
            
            if (backend === this.backends.memory) {
                for (const [key, value] of backend) {
                    if (key.startsWith(this.config.prefix)) {
                        const size = this.getStringSize(value);
                        totalSize += size;
                        itemCount++;
                        items[key] = { size, value: JSON.parse(value) };
                    }
                }
            } else {
                for (let i = 0; i < backend.length; i++) {
                    const key = backend.key(i);
                    if (key && key.startsWith(this.config.prefix)) {
                        const value = backend.getItem(key);
                        const size = this.getStringSize(value);
                        totalSize += size;
                        itemCount++;
                        items[key] = { size, value: JSON.parse(value) };
                    }
                }
            }
            
            return {
                totalSize,
                itemCount,
                items,
                formattedSize: this.formatBytes(totalSize),
                quotaUsed: (totalSize / this.config.maxStorageSize * 100).toFixed(2) + '%'
            };
            
        } catch (error) {
            console.error('Storage usage error:', error);
            return { totalSize: 0, itemCount: 0, items: {} };
        }
    }

    /**
     * Cleanup expired items
     */
    cleanup(options = {}) {
        try {
            const config = { ...this.config, ...options };
            const keys = this.keys({ type: config.type });
            let cleaned = 0;
            
            keys.forEach(key => {
                try {
                    const data = this.get(key, null, { type: config.type });
                    if (data === null) {
                        // Item was expired and auto-deleted
                        cleaned++;
                    }
                } catch (error) {
                    // Corrupted item, delete it
                    this.delete(key, { type: config.type });
                    cleaned++;
                }
            });
            
            if (cleaned > 0) {
                console.log(`🧹 Storage cleanup: removed ${cleaned} expired/corrupted items`);
            }
            
            return cleaned;
            
        } catch (error) {
            console.error('Storage cleanup error:', error);
            return 0;
        }
    }

    /**
     * Export storage data for backup
     */
    export(options = {}) {
        try {
            const config = { ...this.config, ...options };
            const keys = this.keys({ type: config.type });
            const exportData = {
                version: '1.0',
                timestamp: Date.now(),
                type: config.type || 'local',
                data: {}
            };
            
            keys.forEach(key => {
                const value = this.get(key, null, { type: config.type });
                if (value !== null) {
                    exportData.data[key] = value;
                }
            });
            
            return exportData;
            
        } catch (error) {
            console.error('Storage export error:', error);
            return null;
        }
    }

    /**
     * Import storage data from backup
     */
    import(importData, options = {}) {
        try {
            const config = { ...this.config, ...options };
            
            if (!importData || !importData.data) {
                throw new Error('Invalid import data format');
            }
            
            let imported = 0;
            let errors = 0;
            
            Object.entries(importData.data).forEach(([key, value]) => {
                try {
                    this.set(key, value, { type: config.type });
                    imported++;
                } catch (error) {
                    console.error(`Failed to import key "${key}":`, error);
                    errors++;
                }
            });
            
            console.log(`📥 Storage import: ${imported} items imported, ${errors} errors`);
            
            return { imported, errors };
            
        } catch (error) {
            console.error('Storage import error:', error);
            return { imported: 0, errors: 1 };
        }
    }

    /**
     * Get storage statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - (this.initTime || Date.now()),
            hitRate: this.stats.reads > 0 ? (this.stats.cacheHits / this.stats.reads * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Private helper methods
     */
    getFullKey(key) {
        return this.config.prefix + key;
    }

    getBackend(type = 'local') {
        switch (type) {
            case 'session':
                return this.backends.session || this.backends.memory;
            case 'memory':
                return this.backends.memory;
            case 'local':
            default:
                return this.backends.local || this.backends.memory;
        }
    }

    isStorageAvailable(type) {
        try {
            const storage = window[type];
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    isExpired(dataObject) {
        return dataObject.expires && Date.now() > dataObject.expires;
    }

    isCompressed(data) {
        return typeof data === 'string' && data.startsWith('COMPRESSED:');
    }

    isEncrypted(data) {
        return typeof data === 'string' && data.startsWith('ENCRYPTED:');
    }

    checkQuota(dataSize) {
        const usage = this.getUsage();
        return (usage.totalSize + dataSize) <= this.config.maxStorageSize;
    }

    getStringSize(str) {
        return new Blob([str]).size;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Simplified encryption (use proper encryption in production)
    encrypt(data) {
        try {
            const encoded = btoa(data);
            return 'ENCRYPTED:' + encoded;
        } catch (error) {
            console.error('Encryption error:', error);
            return data;
        }
    }

    decrypt(data) {
        try {
            if (data.startsWith('ENCRYPTED:')) {
                return atob(data.substring(10));
            }
            return data;
        } catch (error) {
            console.error('Decryption error:', error);
            return data;
        }
    }

    // Simplified compression (use proper compression in production)
    compress(data) {
        try {
            // Simple run-length encoding for demo
            const compressed = data.replace(/(.)\1+/g, (match, char) => {
                return char + match.length;
            });
            return 'COMPRESSED:' + compressed;
        } catch (error) {
            console.error('Compression error:', error);
            return data;
        }
    }

    decompress(data) {
        try {
            if (data.startsWith('COMPRESSED:')) {
                const compressed = data.substring(11);
                return compressed.replace(/(.)\d+/g, (match, char) => {
                    const count = parseInt(match.substring(1));
                    return char.repeat(count);
                });
            }
            return data;
        } catch (error) {
            console.error('Decompression error:', error);
            return data;
        }
    }

    setupAutoCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    handleStorageEvent(event) {
        if (event.key && event.key.startsWith(this.config.prefix)) {
            const key = event.key.substring(this.config.prefix.length);
            this.eventBus.emit('storage:external_change', {
                key,
                oldValue: event.oldValue,
                newValue: event.newValue,
                storageArea: event.storageArea
            });
        }
    }
}

// Create singleton instances for common use cases
export const localStorage = new Storage({ type: 'local' });
export const sessionStorage = new Storage({ type: 'session' });
export const memoryStorage = new Storage({ type: 'memory' });

// Convenience methods for direct use
export const storage = {
    // Local storage methods
    local: {
        set: (key, value, options) => localStorage.set(key, value, options),
        get: (key, defaultValue, options) => localStorage.get(key, defaultValue, options),
        delete: (key, options) => localStorage.delete(key, options),
        has: (key, options) => localStorage.has(key, options),
        clear: (options) => localStorage.clear(options),
        keys: (options) => localStorage.keys(options)
    },
    
    // Session storage methods
    session: {
        set: (key, value, options) => sessionStorage.set(key, value, options),
        get: (key, defaultValue, options) => sessionStorage.get(key, defaultValue, options),
        delete: (key, options) => sessionStorage.delete(key, options),
        has: (key, options) => sessionStorage.has(key, options),
        clear: (options) => sessionStorage.clear(options),
        keys: (options) => sessionStorage.keys(options)
    },
    
    // Memory storage methods
    memory: {
        set: (key, value, options) => memoryStorage.set(key, value, options),
        get: (key, defaultValue, options) => memoryStorage.get(key, defaultValue, options),
        delete: (key, options) => memoryStorage.delete(key, options),
        has: (key, options) => memoryStorage.has(key, options),
        clear: (options) => memoryStorage.clear(options),
        keys: (options) => memoryStorage.keys(options)
    },
    
    // Utility methods
    getUsage: () => localStorage.getUsage(),
    getStats: () => localStorage.getStats(),
    cleanup: () => localStorage.cleanup(),
    export: () => localStorage.export(),
    import: (data) => localStorage.import(data)
};

// Default export
export default storage;