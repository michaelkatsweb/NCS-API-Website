/**
 * FILE: js/core/eventBusNew.js
 * Global Event Bus System - FIXED MODULE EXPORTS
 * Centralized event management for the NCS-API application
 * 
 * Features:
 * - Type-safe event handling
 * - Namespace support  
 * - Once-only listeners
 * - Event priority
 * - Performance monitoring
 * - Memory leak prevention
 * - Singleton pattern with getInstance() method
 */

/**
 * EventBus class for global event management
 */
export class EventBus {
    constructor() {
        this.listeners = new Map(); // event -> Set of listeners
        this.namespaceListeners = new Map(); // namespace -> Set of events
        this.onceListeners = new Set(); // Set of once-only listeners
        this.eventHistory = []; // Event history for debugging
        this.maxHistorySize = 100;
        this.isEnabled = true;
        
        // Performance monitoring
        this.metrics = {
            eventsEmitted: 0,
            listenersRegistered: 0,
            listenersRemoved: 0,
            errorCount: 0
        };
        
        // Bind methods to preserve context
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
        this.emit = this.emit.bind(this);
        this.once = this.once.bind(this);
    }

    /**
     * ✅ ADDED: Static getInstance method for singleton pattern
     * This allows components to use EventBus.getInstance() 
     */
    static getInstance() {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    /**
     * Register an event listener
     * @param {string} event - Event name (can include namespace: 'namespace:event')
     * @param {Function} listener - Event handler function
     * @param {Object} options - Listener options
     * @param {number} options.priority - Execution priority (higher = earlier)
     * @param {string} options.namespace - Event namespace for bulk operations
     * @param {boolean} options.once - Remove after first execution
     * @returns {Function} Unsubscribe function
     */
    on(event, listener, options = {}) {
        if (typeof event !== 'string' || typeof listener !== 'function') {
            throw new Error('Invalid event or listener provided');
        }

        const {
            priority = 0,
            namespace = null,
            once = false
        } = options;

        // Create listener object with metadata
        const listenerObj = {
            id: this.generateListenerId(),
            handler: listener,
            priority,
            namespace,
            once,
            timestamp: Date.now()
        };

        // Store listener
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(listenerObj);

        // Track namespace
        if (namespace) {
            if (!this.namespaceListeners.has(namespace)) {
                this.namespaceListeners.set(namespace, new Set());
            }
            this.namespaceListeners.get(namespace).add(event);
        }

        // Track once listeners
        if (once) {
            this.onceListeners.add(listenerObj);
        }

        this.metrics.listenersRegistered++;

        // Return unsubscribe function
        return () => this.off(event, listenerObj);
    }

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event handler function
     * @param {Object} options - Listener options
     * @returns {Function} Unsubscribe function
     */
    once(event, listener, options = {}) {
        return this.on(event, listener, { ...options, once: true });
    }

    /**
     * Remove event listener(s)
     * @param {string} eventOrNamespace - Event name or namespace
     * @param {Function|Object} listener - Listener function or listener object
     * @returns {number} Number of listeners removed
     */
    off(eventOrNamespace, listener = null) {
        let removedCount = 0;

        if (listener === null) {
            // Remove all listeners for event or namespace
            return this.removeAllListeners(eventOrNamespace);
        }

        if (this.listeners.has(eventOrNamespace)) {
            const listeners = this.listeners.get(eventOrNamespace);
            const toRemove = [];

            for (const listenerObj of listeners) {
                if (listenerObj === listener || listenerObj.handler === listener) {
                    toRemove.push(listenerObj);
                }
            }

            for (const listenerObj of toRemove) {
                listeners.delete(listenerObj);
                this.onceListeners.delete(listenerObj);
                removedCount++;
            }

            // Clean up empty events
            if (listeners.size === 0) {
                this.listeners.delete(eventOrNamespace);
            }
        }

        this.metrics.listenersRemoved += removedCount;
        return removedCount;
    }

    /**
     * Remove all listeners for an event or namespace
     * @param {string} eventOrNamespace - Event name or namespace
     * @returns {number} Number of listeners removed
     */
    removeAllListeners(eventOrNamespace) {
        let removedCount = 0;

        if (this.listeners.has(eventOrNamespace)) {
            // Remove by event name
            const listeners = this.listeners.get(eventOrNamespace);
            
            for (const listener of listeners) {
                this.onceListeners.delete(listener);
                removedCount++;
            }
            
            this.listeners.delete(eventOrNamespace);
        } else {
            // Remove by namespace
            if (this.namespaceListeners.has(eventOrNamespace)) {
                const events = this.namespaceListeners.get(eventOrNamespace);
                
                for (const event of events) {
                    if (this.listeners.has(event)) {
                        const listeners = this.listeners.get(event);
                        
                        // Remove only listeners from this namespace
                        for (const listener of listeners) {
                            if (listener.namespace === eventOrNamespace) {
                                listeners.delete(listener);
                                this.onceListeners.delete(listener);
                                removedCount++;
                            }
                        }
                        
                        // Clean up empty events
                        if (listeners.size === 0) {
                            this.listeners.delete(event);
                        }
                    }
                }
                
                this.namespaceListeners.delete(eventOrNamespace);
            }
        }

        this.metrics.listenersRemoved += removedCount;
        return removedCount;
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @param {Object} options - Emission options
     * @param {boolean} options.async - Execute listeners asynchronously
     * @param {number} options.timeout - Timeout for async execution
     * @returns {Promise|Array} Promise if async, array of results if sync
     */
    emit(event, data = null, options = {}) {
        if (!this.isEnabled) {
            return options.async ? Promise.resolve([]) : [];
        }

        const {
            async = false,
            timeout = 5000
        } = options;

        // Track event in history
        this.addToHistory(event, data);
        this.metrics.eventsEmitted++;

        // Get listeners for this event
        const eventListeners = this.listeners.get(event);
        if (!eventListeners || eventListeners.size === 0) {
            return async ? Promise.resolve([]) : [];
        }

        // Sort listeners by priority (higher priority first)
        const sortedListeners = Array.from(eventListeners).sort((a, b) => b.priority - a.priority);

        if (async) {
            // Async execution with timeout
            return this.executeListenersAsync(sortedListeners, event, data, timeout);
        } else {
            // Sync execution
            return this.executeListenersSync(sortedListeners, event, data);
        }
    }

    /**
     * Execute listeners synchronously
     * @private
     */
    executeListenersSync(listeners, event, data) {
        const results = [];
        const listenersToRemove = [];

        for (const listenerObj of listeners) {
            try {
                const result = listenerObj.handler(data, event);
                results.push(result);

                // Mark once listeners for removal
                if (listenerObj.once || this.onceListeners.has(listenerObj)) {
                    listenersToRemove.push(listenerObj);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for event "${event}":`, error);
                this.metrics.errorCount++;
                results.push({ error });
            }
        }

        // Remove once listeners
        this.removeOnceListeners(event, listenersToRemove);

        return results;
    }

    /**
     * Execute listeners asynchronously  
     * @private
     */
    async executeListenersAsync(listeners, event, data, timeout) {
        const promises = [];
        const listenersToRemove = [];

        for (const listenerObj of listeners) {
            const promise = new Promise(async (resolve) => {
                try {
                    const result = await Promise.resolve(listenerObj.handler(data, event));
                    resolve(result);

                    // Mark once listeners for removal
                    if (listenerObj.once || this.onceListeners.has(listenerObj)) {
                        listenersToRemove.push(listenerObj);
                    }
                } catch (error) {
                    console.error(`EventBus: Error in async listener for event "${event}":`, error);
                    this.metrics.errorCount++;
                    resolve({ error });
                }
            });

            promises.push(promise);
        }

        // Execute with timeout
        try {
            const results = await Promise.race([
                Promise.all(promises),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeout)
                )
            ]);

            // Remove once listeners
            this.removeOnceListeners(event, listenersToRemove);

            return results;
        } catch (error) {
            console.warn(`EventBus: Async execution timeout for event "${event}"`);
            this.metrics.errorCount++;
            return [];
        }
    }

    /**
     * Remove once listeners after execution
     * @private
     */
    removeOnceListeners(event, listenersToRemove) {
        if (listenersToRemove.length > 0) {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                for (const listener of listenersToRemove) {
                    eventListeners.delete(listener);
                    this.onceListeners.delete(listener);
                }
                
                // Clean up empty events
                if (eventListeners.size === 0) {
                    this.listeners.delete(event);
                }
            }
        }
    }

    /**
     * Add event to history for debugging
     * @private
     */
    addToHistory(event, data) {
        this.eventHistory.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Generate unique listener ID
     * @private
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all registered events
     * @returns {Array} Array of event names
     */
    getEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(event) {
        const listeners = this.listeners.get(event);
        return listeners ? listeners.size : 0;
    }

    /**
     * Get total listener count
     * @returns {number} Total number of listeners
     */
    getTotalListenerCount() {
        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.size;
        }
        return total;
    }

    /**
     * Get event history
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Array of recent events
     */
    getHistory(limit = this.maxHistorySize) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalListeners: this.getTotalListenerCount(),
            events: this.getEvents().length,
            namespaces: this.namespaceListeners.size
        };
    }

    /**
     * Enable or disable the event bus
     * @param {boolean} enabled - Whether to enable the event bus
     */
    setEnabled(enabled) {
        this.isEnabled = Boolean(enabled);
    }

    /**
     * Clear all listeners and reset state
     */
    destroy() {
        this.listeners.clear();
        this.namespaceListeners.clear();
        this.onceListeners.clear();
        this.eventHistory.length = 0;
        
        // Reset metrics
        this.metrics = {
            eventsEmitted: 0,
            listenersRegistered: 0,
            listenersRemoved: 0,
            errorCount: 0
        };
        
        // Clear singleton instance
        EventBus._instance = null;
    }

    /**
     * Create a scoped event bus for a specific namespace
     * @param {string} namespace - Namespace prefix
     * @returns {Object} Scoped event bus interface
     */
    createScopedBus(namespace) {
        return {
            on: (event, listener, options = {}) => {
                return this.on(
                    `${namespace}:${event}`, 
                    listener, 
                    { ...options, namespace }
                );
            },
            
            once: (event, listener, options = {}) => {
                return this.once(
                    `${namespace}:${event}`, 
                    listener, 
                    { ...options, namespace }
                );
            },
            
            off: (event, listener) => {
                return this.off(`${namespace}:${event}`, listener);
            },
            
            emit: (event, data, options) => {
                return this.emit(`${namespace}:${event}`, data, options);
            },
            
            removeAllListeners: () => {
                return this.removeAllListeners(namespace);
            }
        };
    }
}

// ✅ STANDARDIZED EXPORTS:
// 1. Named export of the class (for components that need EventBus.getInstance())
export { EventBus };

// 2. Create singleton instance using getInstance() method
export const eventBus = EventBus.getInstance();

// 3. Default export as the singleton instance (for simple imports)
export default eventBus;

// Development helpers
if (typeof window !== 'undefined') {
    // Expose event bus to global scope in development
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        window.NCS_EventBus = eventBus;
        console.log('🔧 EventBus exposed to window.NCS_EventBus for debugging');
    }
}