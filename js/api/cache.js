/**
 * FILE: js/api/cache.js
 * Response Caching System
 * NCS-API Website - Intelligent caching with TTL, LRU eviction, and persistence
 */

import { STORAGE_KEYS, LIMITS } from '../config/constants.js';
import eventBus from '../core/eventBus.js';

/* ===================================
   Cache Entry Class
   =================================== */

class CacheEntry {
  constructor(key, data, ttl = 300000) { // 5 minutes default
    this.key = key;
    this.data = data;
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + ttl;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
    this.size = this.calculateSize(data);
    this.tags = new Set();
  }

  /**
   * Check if entry is expired
   * @returns {boolean} True if expired
   */
  isExpired() {
    return Date.now() > this.expiresAt;
  }

  /**
   * Update access statistics
   */
  touch() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  /**
   * Calculate approximate size of data
   * @param {any} data - Data to measure
   * @returns {number} Size in bytes
   */
  calculateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Add tag to entry
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    this.tags.add(tag);
  }

  /**
   * Check if entry has tag
   * @param {string} tag - Tag to check
   * @returns {boolean} True if has tag
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }
}

/* ===================================
   Cache Manager Class
   =================================== */

export class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
    this.maxEntries = options.maxEntries || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.persistToStorage = options.persistToStorage !== false;
    this.storagePrefix = STORAGE_KEYS.CACHE_PREFIX;
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
      totalSize: 0,
      startTime: Date.now()
    };
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Cache strategies
    this.strategies = {
      lru: this.evictLRU.bind(this),
      lfu: this.evictLFU.bind(this),
      ttl: this.evictExpired.bind(this)
    };
    
    this.evictionStrategy = options.evictionStrategy || 'lru';
    
    // Initialize
    this.init();
  }

  /**
   * Initialize cache manager
   */
  init() {
    // Load persisted cache
    if (this.persistToStorage) {
      this.loadFromStorage();
    }
    
    // Setup cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('💾 Cache Manager initialized');
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @param {Object} options - Get options
   * @returns {any} Cached data or null
   */
  get(key, options = {}) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit('cache:miss', { key });
      return null;
    }
    
    // Check expiration
    if (entry.isExpired()) {
      this.delete(key);
      this.stats.misses++;
      this.emit('cache:miss', { key, reason: 'expired' });
      return null;
    }
    
    // Update access statistics
    entry.touch();
    this.stats.hits++;
    this.emit('cache:hit', { key, entry });
    
    return options.includeMetadata ? {
      data: entry.data,
      metadata: {
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
        tags: Array.from(entry.tags)
      }
    } : entry.data;
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Set options
   * @returns {boolean} True if set successfully
   */
  set(key, data, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const tags = options.tags || [];
    const forceUpdate = options.forceUpdate || false;
    
    // Check if key already exists and not forcing update
    if (!forceUpdate && this.cache.has(key)) {
      const existingEntry = this.cache.get(key);
      if (!existingEntry.isExpired()) {
        return false; // Don't overwrite valid entry
      }
    }
    
    // Create new entry
    const entry = new CacheEntry(key, data, ttl);
    
    // Add tags
    tags.forEach(tag => entry.addTag(tag));
    
    // Check size limits
    if (entry.size > this.maxSize / 2) {
      console.warn(`Cache entry "${key}" is very large (${entry.size} bytes)`);
      return false;
    }
    
    // Ensure we have space
    this.ensureSpace(entry.size);
    
    // Remove existing entry if updating
    if (this.cache.has(key)) {
      this.deleteEntry(this.cache.get(key));
    }
    
    // Add to cache
    this.cache.set(key, entry);
    this.stats.totalSize += entry.size;
    this.stats.sets++;
    
    // Persist if enabled
    if (this.persistToStorage && options.persist !== false) {
      this.persistEntry(entry);
    }
    
    this.emit('cache:set', { key, entry, ttl });
    
    return true;
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    this.deleteEntry(entry);
    this.cache.delete(key);
    this.stats.deletes++;
    
    // Remove from storage
    if (this.persistToStorage) {
      this.removeFromStorage(key);
    }
    
    this.emit('cache:delete', { key });
    
    return true;
  }

  /**
   * Clear cache or entries with specific tags
   * @param {Object} options - Clear options
   */
  clear(options = {}) {
    if (options.tags && options.tags.length > 0) {
      // Clear entries with specific tags
      let cleared = 0;
      for (const [key, entry] of this.cache) {
        if (options.tags.some(tag => entry.hasTag(tag))) {
          this.delete(key);
          cleared++;
        }
      }
      console.log(`💾 Cleared ${cleared} cache entries with tags:`, options.tags);
    } else {
      // Clear all entries
      const count = this.cache.size;
      this.cache.clear();
      this.stats.totalSize = 0;
      
      // Clear from storage
      if (this.persistToStorage) {
        this.clearStorage();
      }
      
      console.log(`💾 Cleared ${count} cache entries`);
    }
    
    this.emit('cache:clear', options);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && !entry.isExpired();
  }

  /**
   * Get cache size in bytes
   * @returns {number} Total size in bytes
   */
  size() {
    return this.stats.totalSize;
  }

  /**
   * Get number of cache entries
   * @returns {number} Entry count
   */
  count() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      entries: this.cache.size,
      maxSize: this.maxSize,
      maxEntries: this.maxEntries,
      averageEntrySize: this.cache.size > 0 ? Math.round(this.stats.totalSize / this.cache.size) : 0,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Get cache keys matching pattern
   * @param {string|RegExp} pattern - Pattern to match
   * @returns {Array<string>} Matching keys
   */
  keys(pattern = null) {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }
    
    if (typeof pattern === 'string') {
      return allKeys.filter(key => key.includes(pattern));
    }
    
    if (pattern instanceof RegExp) {
      return allKeys.filter(key => pattern.test(key));
    }
    
    return allKeys;
  }

  /**
   * Get entries by tag
   * @param {string} tag - Tag to search for
   * @returns {Array<Object>} Entries with tag
   */
  getByTag(tag) {
    const entries = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.hasTag(tag) && !entry.isExpired()) {
        entries.push({
          key,
          data: entry.data,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt
        });
      }
    }
    
    return entries;
  }

  /**
   * Ensure cache has space for new entry
   * @param {number} entrySize - Size of new entry
   */
  ensureSpace(entrySize) {
    // Check entry count limit
    while (this.cache.size >= this.maxEntries) {
      this.evict();
    }
    
    // Check size limit
    while (this.stats.totalSize + entrySize > this.maxSize) {
      if (!this.evict()) {
        break; // No more entries to evict
      }
    }
  }

  /**
   * Evict entry using configured strategy
   * @returns {boolean} True if entry was evicted
   */
  evict() {
    const strategy = this.strategies[this.evictionStrategy];
    if (!strategy) {
      console.error(`Unknown eviction strategy: ${this.evictionStrategy}`);
      return false;
    }
    
    const evicted = strategy();
    if (evicted) {
      this.stats.evictions++;
      this.emit('cache:evict', { key: evicted.key, strategy: this.evictionStrategy });
    }
    
    return !!evicted;
  }

  /**
   * Evict least recently used entry
   * @returns {Object|null} Evicted entry
   */
  evictLRU() {
    let oldestEntry = null;
    let oldestKey = null;
    
    for (const [key, entry] of this.cache) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      return oldestEntry;
    }
    
    return null;
  }

  /**
   * Evict least frequently used entry
   * @returns {Object|null} Evicted entry
   */
  evictLFU() {
    let leastUsedEntry = null;
    let leastUsedKey = null;
    
    for (const [key, entry] of this.cache) {
      if (!leastUsedEntry || entry.accessCount < leastUsedEntry.accessCount) {
        leastUsedEntry = entry;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.delete(leastUsedKey);
      return leastUsedEntry;
    }
    
    return null;
  }

  /**
   * Evict expired entries
   * @returns {Object|null} First evicted entry
   */
  evictExpired() {
    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        this.delete(key);
        return entry;
      }
    }
    return null;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.cleanups++;
      console.log(`💾 Cleaned up ${cleaned} expired cache entries`);
      this.emit('cache:cleanup', { cleaned });
    }
  }

  /**
   * Delete entry and update statistics
   * @param {CacheEntry} entry - Entry to delete
   */
  deleteEntry(entry) {
    this.stats.totalSize -= entry.size;
  }

  /**
   * Load cache from localStorage
   */
  loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      
      let loaded = 0;
      
      for (const storageKey of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(storageKey));
          const cacheKey = storageKey.replace(this.storagePrefix, '');
          
          // Check if not expired
          if (data.expiresAt > Date.now()) {
            const entry = new CacheEntry(cacheKey, data.data, data.expiresAt - Date.now());
            entry.createdAt = data.createdAt;
            entry.accessCount = data.accessCount || 0;
            entry.lastAccessed = data.lastAccessed || data.createdAt;
            
            if (data.tags) {
              data.tags.forEach(tag => entry.addTag(tag));
            }
            
            this.cache.set(cacheKey, entry);
            this.stats.totalSize += entry.size;
            loaded++;
          } else {
            // Remove expired entry from storage
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.warn(`Failed to load cache entry ${storageKey}:`, error);
          localStorage.removeItem(storageKey);
        }
      }
      
      if (loaded > 0) {
        console.log(`💾 Loaded ${loaded} cache entries from storage`);
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Persist cache entry to localStorage
   * @param {CacheEntry} entry - Entry to persist
   */
  persistEntry(entry) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const storageKey = this.storagePrefix + entry.key;
      const data = {
        data: entry.data,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        tags: Array.from(entry.tags)
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to persist cache entry ${entry.key}:`, error);
    }
  }

  /**
   * Remove cache entry from localStorage
   * @param {string} key - Cache key
   */
  removeFromStorage(key) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const storageKey = this.storagePrefix + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`Failed to remove cache entry ${key} from storage:`, error);
    }
  }

  /**
   * Clear all cache entries from localStorage
   */
  clearStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.storagePrefix)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache from storage:', error);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in cache event handler for ${event}:`, error);
      }
    });
    
    // Also emit to global event bus
    eventBus.emit(event, data);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for app events
    eventBus.on('app:beforeunload', () => {
      this.cleanup();
    });
    
    // Listen for memory pressure
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const checkMemory = () => {
        const memInfo = performance.memory;
        const memoryPressure = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (memoryPressure > 0.9) {
          console.warn('High memory pressure, clearing cache');
          this.clear();
        }
      };
      
      setInterval(checkMemory, 30000); // Check every 30 seconds
    }
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Clear cache
    this.clear();
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    console.log('💾 Cache Manager destroyed');
  }
}

/* ===================================
   Cache Utilities
   =================================== */

/**
 * Create cache key from parameters
 * @param {string} prefix - Key prefix
 * @param {Object} params - Parameters object
 * @returns {string} Cache key
 */
export function createCacheKey(prefix, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${prefix}:${btoa(sortedParams)}`;
}

/**
 * Create cache wrapper for functions
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Cache options
 * @returns {Function} Cached function
 */
export function createCachedFunction(fn, options = {}) {
  const cache = options.cache || cacheManager;
  const keyPrefix = options.keyPrefix || fn.name || 'cached_fn';
  const ttl = options.ttl || 300000; // 5 minutes
  
  return async function(...args) {
    const cacheKey = createCacheKey(keyPrefix, { args });
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    try {
      const result = await fn.apply(this, args);
      cache.set(cacheKey, result, { ttl, tags: [keyPrefix] });
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
}

/**
 * Create API response cache
 * @param {Object} options - Cache options
 * @returns {Object} API cache methods
 */
export function createAPICache(options = {}) {
  const cache = options.cache || cacheManager;
  const defaultTTL = options.defaultTTL || 300000; // 5 minutes
  
  return {
    // Cache GET requests
    cacheGet: (url, response, customTTL = null) => {
      const key = `api:get:${url}`;
      cache.set(key, response, { 
        ttl: customTTL || defaultTTL,
        tags: ['api', 'get']
      });
    },
    
    // Get cached GET request
    getCachedGet: (url) => {
      const key = `api:get:${url}`;
      return cache.get(key);
    },
    
    // Invalidate API cache
    invalidateAPI: (pattern = null) => {
      if (pattern) {
        const keys = cache.keys(pattern);
        keys.forEach(key => cache.delete(key));
      } else {
        cache.clear({ tags: ['api'] });
      }
    },
    
    // Cache clustering results
    cacheClusteringResult: (config, result) => {
      const key = createCacheKey('clustering', config);
      cache.set(key, result, { 
        ttl: 3600000, // 1 hour for clustering results
        tags: ['clustering', 'results']
      });
    },
    
    // Get cached clustering result
    getCachedClusteringResult: (config) => {
      const key = createCacheKey('clustering', config);
      return cache.get(key);
    }
  };
}

/* ===================================
   Create and Export Cache Manager Instance
   =================================== */

export const cacheManager = new CacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  evictionStrategy: 'lru'
});

// Create API cache helper
export const apiCache = createAPICache({ cache: cacheManager });

// Export for global access
if (typeof window !== 'undefined') {
  window.__NCS_CACHE__ = cacheManager;
}

export default cacheManager;