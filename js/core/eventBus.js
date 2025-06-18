/**
 * FILE: js/core/eventBus.js
 * Event Bus System
 * NCS-API Website - Centralized event communication system
 */

import { EVENTS } from '../config/constants.js';

/* ===================================
   Event Bus Class
   =================================== */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 50;
    this.debug = false;
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 100;
    
    // Performance tracking
    this.stats = {
      emitted: 0,
      listened: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    // Bind methods
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
    this.once = this.once.bind(this);
  }

  /**
   * Register event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback, options = {}) {
    if (!this.validateEventName(eventName)) {
      throw new Error(`Invalid event name: ${eventName}`);
    }

    if (typeof callback !== 'function') {
      throw new Error('Event callback must be a function');
    }

    // Initialize event listeners array if not exists
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listeners = this.events.get(eventName);
    
    // Check max listeners limit
    if (listeners.length >= this.maxListeners) {
      console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${eventName}`);
    }

    // Create listener object
    const listener = {
      id: this.generateId(),
      callback,
      options: {
        once: false,
        priority: 0,
        namespace: null,
        debounce: 0,
        throttle: 0,
        ...options
      },
      addedAt: Date.now(),
      callCount: 0,
      lastCalled: null
    };

    // Add debouncing if specified
    if (listener.options.debounce > 0) {
      listener.callback = this.debounce(callback, listener.options.debounce);
    }

    // Add throttling if specified
    if (listener.options.throttle > 0) {
      listener.callback = this.throttle(callback, listener.options.throttle);
    }

    // Insert listener based on priority (higher priority first)
    const insertIndex = listeners.findIndex(l => l.options.priority < listener.options.priority);
    if (insertIndex === -1) {
      listeners.push(listener);
    } else {
      listeners.splice(insertIndex, 0, listener);
    }

    this.log(`📨 Listener added for "${eventName}"`, { listener: listener.id, total: listeners.length });

    // Return unsubscribe function
    return () => this.off(eventName, listener.id);
  }

  /**
   * Remove event listener
   * @param {string} eventName - Event name
   * @param {string|Function} callbackOrId - Callback function or listener ID
   */
  off(eventName, callbackOrId) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    let removed = false;

    if (typeof callbackOrId === 'string') {
      // Remove by ID
      const index = listeners.findIndex(l => l.id === callbackOrId);
      if (index !== -1) {
        listeners.splice(index, 1);
        removed = true;
      }
    } else if (typeof callbackOrId === 'function') {
      // Remove by callback reference
      const index = listeners.findIndex(l => l.callback === callbackOrId);
      if (index !== -1) {
        listeners.splice(index, 1);
        removed = true;
      }
    } else {
      // Remove all listeners for event
      listeners.length = 0;
      removed = true;
    }

    // Clean up empty event arrays
    if (listeners.length === 0) {
      this.events.delete(eventName);
    }

    if (removed) {
      this.log(`📤 Listener removed for "${eventName}"`, { remaining: listeners.length });
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   * @param {Object} options - Emit options
   * @returns {Promise<Array>} Array of listener results
   */
  async emit(eventName, data = null, options = {}) {
    const emitOptions = {
      async: false,
      stopPropagation: false,
      timeout: 5000,
      ...options
    };

    // Apply middleware
    const processedEvent = await this.applyMiddleware(eventName, data, emitOptions);
    if (processedEvent === null) {
      this.log(`🚫 Event "${eventName}" cancelled by middleware`);
      return [];
    }

    const { eventName: finalEventName, data: finalData } = processedEvent;

    this.stats.emitted++;
    
    // Add to history
    this.addToHistory({
      type: 'emit',
      eventName: finalEventName,
      data: finalData,
      timestamp: Date.now(),
      listenersCount: this.getListenerCount(finalEventName)
    });

    this.log(`🚀 Emitting "${finalEventName}"`, { 
      data: finalData, 
      listeners: this.getListenerCount(finalEventName) 
    });

    const listeners = this.events.get(finalEventName) || [];
    if (listeners.length === 0) {
      this.log(`📭 No listeners for "${finalEventName}"`);
      return [];
    }

    const results = [];
    const event = {
      name: finalEventName,
      data: finalData,
      timestamp: Date.now(),
      stopPropagation: () => { emitOptions.stopPropagation = true; },
      preventDefault: () => { /* Could add default action prevention */ }
    };

    for (const listener of listeners) {
      if (emitOptions.stopPropagation) {
        this.log(`⏹️ Event propagation stopped for "${finalEventName}"`);
        break;
      }

      try {
        // Update listener stats
        listener.callCount++;
        listener.lastCalled = Date.now();
        this.stats.listened++;

        let result;
        
        if (emitOptions.async) {
          // Async execution with timeout
          result = await Promise.race([
            Promise.resolve(listener.callback(event)),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Listener timeout')), emitOptions.timeout)
            )
          ]);
        } else {
          // Sync execution
          result = listener.callback(event);
        }

        results.push({
          listenerId: listener.id,
          result,
          success: true,
          executionTime: Date.now() - listener.lastCalled
        });

        this.log(`✅ Listener executed for "${finalEventName}"`, { 
          id: listener.id, 
          result: typeof result 
        });

        // Remove one-time listeners
        if (listener.options.once) {
          this.off(finalEventName, listener.id);
        }

      } catch (error) {
        this.stats.errors++;
        
        results.push({
          listenerId: listener.id,
          error: error.message,
          success: false,
          executionTime: Date.now() - listener.lastCalled
        });

        this.log(`❌ Listener error for "${finalEventName}"`, { 
          id: listener.id, 
          error: error.message 
        });

        // Emit error event
        if (finalEventName !== EVENTS.APP_ERROR) {
          this.emit(EVENTS.APP_ERROR, {
            type: 'listener_error',
            eventName: finalEventName,
            listenerId: listener.id,
            error
          });
        }
      }
    }

    return results;
  }

  /**
   * Register one-time event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Wait for event to be emitted
   * @param {string} eventName - Event name
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise that resolves with event data
   */
  waitFor(eventName, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const handler = (event) => {
        clearTimeout(timer);
        resolve(event.data);
      };

      this.once(eventName, handler);
    });
  }

  /**
   * Register listener for multiple events
   * @param {Array<string>} eventNames - Array of event names
   * @param {Function} callback - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function for all events
   */
  onMany(eventNames, callback, options = {}) {
    const unsubscribers = eventNames.map(eventName => 
      this.on(eventName, callback, options)
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Register listener with namespace
   * @param {string} namespace - Namespace for grouping listeners
   * @param {string} eventName - Event name
   * @param {Function} callback - Event handler
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function
   */
  onNamespace(namespace, eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, namespace });
  }

  /**
   * Remove all listeners in a namespace
   * @param {string} namespace - Namespace to clear
   */
  offNamespace(namespace) {
    let removed = 0;
    
    this.events.forEach((listeners, eventName) => {
      const initialLength = listeners.length;
      this.events.set(eventName, listeners.filter(l => l.options.namespace !== namespace));
      removed += initialLength - listeners.length;
      
      // Clean up empty event arrays
      if (listeners.length === 0) {
        this.events.delete(eventName);
      }
    });

    this.log(`🧹 Removed ${removed} listeners from namespace "${namespace}"`);
  }

  /**
   * Get listener count for event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    return this.events.get(eventName)?.length || 0;
  }

  /**
   * Get all registered events
   * @returns {Array<string>} Array of event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get listeners for event
   * @param {string} eventName - Event name
   * @returns {Array} Array of listener info
   */
  getListeners(eventName) {
    const listeners = this.events.get(eventName) || [];
    return listeners.map(l => ({
      id: l.id,
      options: l.options,
      addedAt: l.addedAt,
      callCount: l.callCount,
      lastCalled: l.lastCalled
    }));
  }

  /**
   * Get event bus statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      totalEvents: this.events.size,
      totalListeners: Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      uptime: Date.now() - this.stats.startTime,
      historySize: this.history.length
    };
  }

  /**
   * Get event history
   * @param {number} limit - Number of entries to return
   * @returns {Array} History entries
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.events.clear();
    this.log('🧹 All listeners cleared');
  }

  /**
   * Add middleware function
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
    this.log('🔧 Middleware added');
  }

  /**
   * Remove middleware function
   * @param {Function} middleware - Middleware function to remove
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
      this.log('🔧 Middleware removed');
    }
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to enable debug logging
   */
  setDebug(enabled) {
    this.debug = enabled;
    this.log(`🐛 Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Validate event name
   * @param {string} eventName - Event name to validate
   * @returns {boolean} True if valid
   */
  validateEventName(eventName) {
    return typeof eventName === 'string' && eventName.length > 0;
  }

  /**
   * Apply middleware to event
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   * @param {Object} options - Emit options
   * @returns {Promise<Object|null>} Processed event or null to cancel
   */
  async applyMiddleware(eventName, data, options) {
    let processedEvent = { eventName, data, options };

    for (const middleware of this.middleware) {
      try {
        processedEvent = await middleware(processedEvent);
        if (processedEvent === null) {
          return null; // Event cancelled
        }
      } catch (error) {
        this.log('❌ Middleware error', { error: error.message });
        throw error;
      }
    }

    return processedEvent;
  }

  /**
   * Add entry to history
   * @param {Object} entry - History entry
   */
  addToHistory(entry) {
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle function
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  /**
   * Log message if debug enabled
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(message, data = {}) {
    if (this.debug && typeof console !== 'undefined') {
      console.log(`[EventBus] ${message}`, data);
    }
  }
}

/* ===================================
   Middleware Functions
   =================================== */

// Logging middleware
export const loggingMiddleware = (event) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`📡 Event: ${event.eventName}`);
    console.log('Data:', event.data);
    console.log('Options:', event.options);
    console.groupEnd();
  }
  return event;
};

// Validation middleware
export const validationMiddleware = (event) => {
  // Add event validation logic
  if (!event.eventName || typeof event.eventName !== 'string') {
    throw new Error('Invalid event name');
  }
  return event;
};

// Rate limiting middleware
export const rateLimitMiddleware = (() => {
  const eventCounts = new Map();
  const resetInterval = 60000; // 1 minute
  const maxEventsPerMinute = 100;

  // Reset counters every minute
  setInterval(() => {
    eventCounts.clear();
  }, resetInterval);

  return (event) => {
    const count = eventCounts.get(event.eventName) || 0;
    
    if (count >= maxEventsPerMinute) {
      console.warn(`Rate limit exceeded for event: ${event.eventName}`);
      return null; // Cancel event
    }
    
    eventCounts.set(event.eventName, count + 1);
    return event;
  };
})();

// Analytics middleware
export const analyticsMiddleware = (event) => {
  // Track certain events for analytics
  const trackableEvents = [
    EVENTS.CLUSTERING_START,
    EVENTS.CLUSTERING_COMPLETE,
    EVENTS.DATA_LOADED,
    EVENTS.VIZ_RENDER,
    EVENTS.THEME_CHANGE
  ];

  if (trackableEvents.includes(event.eventName)) {
    // Send to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'app_event', {
        event_category: 'user_interaction',
        event_label: event.eventName,
        custom_parameter: event.data
      });
    }
  }

  return event;
};

/* ===================================
   Event Helpers
   =================================== */

/**
 * Create event emitter for specific namespace
 * @param {EventBus} eventBus - Event bus instance
 * @param {string} namespace - Namespace
 * @returns {Object} Namespaced event emitter
 */
export function createNamespacedEmitter(eventBus, namespace) {
  return {
    on: (eventName, callback, options = {}) => 
      eventBus.onNamespace(namespace, eventName, callback, options),
    
    off: (eventName, callback) => 
      eventBus.off(eventName, callback),
    
    emit: (eventName, data, options) => 
      eventBus.emit(eventName, data, options),
    
    once: (eventName, callback, options = {}) => 
      eventBus.once(eventName, callback, { ...options, namespace }),
    
    clear: () => 
      eventBus.offNamespace(namespace)
  };
}

/**
 * Create typed event methods
 * @param {EventBus} eventBus - Event bus instance
 * @returns {Object} Typed event methods
 */
export function createTypedEvents(eventBus) {
  return {
    // App events
    appReady: (data) => eventBus.emit(EVENTS.APP_READY, data),
    appError: (error) => eventBus.emit(EVENTS.APP_ERROR, error),
    
    // Data events
    dataLoaded: (data) => eventBus.emit(EVENTS.DATA_LOADED, data),
    dataValidated: (result) => eventBus.emit(EVENTS.DATA_VALIDATED, result),
    dataProcessed: (result) => eventBus.emit(EVENTS.DATA_PROCESSED, result),
    dataError: (error) => eventBus.emit(EVENTS.DATA_ERROR, error),
    
    // Clustering events
    clusteringStart: (config) => eventBus.emit(EVENTS.CLUSTERING_START, config),
    clusteringProgress: (progress) => eventBus.emit(EVENTS.CLUSTERING_PROGRESS, progress),
    clusteringComplete: (results) => eventBus.emit(EVENTS.CLUSTERING_COMPLETE, results),
    clusteringError: (error) => eventBus.emit(EVENTS.CLUSTERING_ERROR, error),
    
    // Visualization events
    vizRender: (config) => eventBus.emit(EVENTS.VIZ_RENDER, config),
    vizUpdate: (data) => eventBus.emit(EVENTS.VIZ_UPDATE, data),
    vizExport: (format) => eventBus.emit(EVENTS.VIZ_EXPORT, format),
    
    // Theme events
    themeChange: (theme) => eventBus.emit(EVENTS.THEME_CHANGE, theme),
    themeToggle: () => eventBus.emit(EVENTS.THEME_TOGGLE),
    
    // User events
    userLogin: (user) => eventBus.emit(EVENTS.USER_LOGIN, user),
    userLogout: () => eventBus.emit(EVENTS.USER_LOGOUT),
    
    // Network events
    networkOnline: () => eventBus.emit(EVENTS.NETWORK_ONLINE),
    networkOffline: () => eventBus.emit(EVENTS.NETWORK_OFFLINE)
  };
}

/* ===================================
   Create and Export Event Bus Instance
   =================================== */

export const eventBus = new EventBus();

// Add default middleware
eventBus.addMiddleware(validationMiddleware);
eventBus.addMiddleware(loggingMiddleware);
eventBus.addMiddleware(rateLimitMiddleware);
eventBus.addMiddleware(analyticsMiddleware);

// Create typed event helpers
export const events = createTypedEvents(eventBus);

// Enable debug in development
if (process.env.NODE_ENV === 'development') {
  eventBus.setDebug(true);
}

// Export for global access
if (typeof window !== 'undefined') {
  window.__NCS_EVENT_BUS__ = eventBus;
}

export default eventBus;