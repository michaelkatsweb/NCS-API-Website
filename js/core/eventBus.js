/**
 * Global Event Bus System
 * Centralized event management for the NCS-API application
 * 
 * Features:
 * - Type-safe event handling
 * - Namespace support
 * - Once-only listeners
 * - Event priority
 * - Performance monitoring
 * - Memory leak prevention
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
            fn: listener,
            priority,
            namespace,
            once,
            id: this.generateListenerId(),
            createdAt: Date.now()
        };

        // Initialize event listeners array if needed
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        // Add listener
        this.listeners.get(event).add(listenerObj);

        // Track namespace if provided
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

        // Sort listeners by priority (higher priority first)
        const listeners = Array.from(this.listeners.get(event));
        listeners.sort((a, b) => b.priority - a.priority);
        this.listeners.set(event, new Set(listeners));

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
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function|Object} listener - Listener function or listener object
     * @returns {boolean} True if listener was removed
     */
    off(event, listener) {
        if (!this.listeners.has(event)) {
            return false;
        }

        const eventListeners = this.listeners.get(event);
        let removed = false;

        // Handle different listener types
        if (typeof listener === 'function') {
            // Remove by function reference
            for (const listenerObj of eventListeners) {
                if (listenerObj.fn === listener) {
                    eventListeners.delete(listenerObj);
                    this.onceListeners.delete(listenerObj);
                    removed = true;
                    break;
                }
            }
        } else if (listener && typeof listener === 'object') {
            // Remove by listener object
            if (eventListeners.has(listener)) {
                eventListeners.delete(listener);
                this.onceListeners.delete(listener);
                removed = true;
            }
        }

        // Clean up empty event entries
        if (eventListeners.size === 0) {
            this.listeners.delete(event);
        }

        if (removed) {
            this.metrics.listenersRemoved++;
        }

        return removed;
    }

    /**
     * Remove all listeners for an event or namespace
     * @param {string} eventOrNamespace - Event name or namespace
     * @returns {number} Number of listeners removed
     */
    removeAllListeners(eventOrNamespace) {
        let removedCount = 0;

        if (eventOrNamespace.includes(':')) {
            // Remove specific event
            if (this.listeners.has(eventOrNamespace)) {
                const listeners = this.listeners.get(eventOrNamespace);
                removedCount = listeners.size;
                
                // Remove from once listeners
                for (const listener of listeners) {
                    this.onceListeners.delete(listener);
                }
                
                this.listeners.delete(eventOrNamespace);
            }
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

        // Create event object
        const eventObj = {
            type: event,
            data,
            timestamp: Date.now(),
            preventDefault: false,
            stopPropagation: false
        };

        const listeners = Array.from(eventListeners);
        const results = [];
        const listenersToRemove = new Set();

        if (async) {
            // Asynchronous execution
            return this.executeListenersAsync(listeners, eventObj, timeout, listenersToRemove);
        } else {
            // Synchronous execution
            for (const listener of listeners) {
                try {
                    const result = listener.fn(eventObj);
                    results.push(result);

                    // Mark once listeners for removal
                    if (listener.once) {
                        listenersToRemove.add(listener);
                    }

                    // Stop propagation if requested
                    if (eventObj.stopPropagation) {
                        break;
                    }
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                    this.metrics.errorCount++;
                    
                    // Emit error event
                    this.emit('eventbus:error', {
                        originalEvent: event,
                        error,
                        listener: listener.id
                    });
                }
            }

            // Remove once listeners
            this.removeOnceListeners(event, listenersToRemove);

            return results;
        }
    }

    /**
     * Execute listeners asynchronously
     * @private
     */
    async executeListenersAsync(listeners, eventObj, timeout, listenersToRemove) {
        const results = [];
        const promises = [];

        for (const listener of listeners) {
            const promise = this.executeListenerWithTimeout(listener, eventObj, timeout)
                .then(result => {
                    results.push(result);
                    
                    if (listener.once) {
                        listenersToRemove.add(listener);
                    }
                    
                    return result;
                })
                .catch(error => {
                    console.error(`Error in async event listener for ${eventObj.type}:`, error);
                    this.metrics.errorCount++;
                    
                    this.emit('eventbus:error', {
                        originalEvent: eventObj.type,
                        error,
                        listener: listener.id
                    });
                    
                    return null;
                });

            promises.push(promise);

            // Stop propagation if requested
            if (eventObj.stopPropagation) {
                break;
            }
        }

        await Promise.allSettled(promises);

        // Remove once listeners
        this.removeOnceListeners(eventObj.type, listenersToRemove);

        return results;
    }

    /**
     * Execute listener with timeout
     * @private
     */
    async executeListenerWithTimeout(listener, eventObj, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Listener timeout after ${timeout}ms`));
            }, timeout);

            try {
                const result = listener.fn(eventObj);
                
                if (result && typeof result.then === 'function') {
                    // Handle promise result
                    result
                        .then(value => {
                            clearTimeout(timer);
                            resolve(value);
                        })
                        .catch(error => {
                            clearTimeout(timer);
                            reject(error);
                        });
                } else {
                    // Handle synchronous result
                    clearTimeout(timer);
                    resolve(result);
                }
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Remove once listeners after execution
     * @private
     */
    removeOnceListeners(event, listenersToRemove) {
        if (listenersToRemove.size > 0) {
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

// Create global event bus instance
export const eventBus = new EventBus();

// Export for use in other modules
export default eventBus;

// Development helpers
if (typeof window !== 'undefined') {
    // Expose event bus to global scope in development
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        window.NCS_EventBus = eventBus;
        console.log('🔧 EventBus exposed to window.NCS_EventBus for debugging');
    }
}