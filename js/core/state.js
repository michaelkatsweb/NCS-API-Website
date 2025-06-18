/**
 * FILE: js/core/state.js
 * Global State Management System
 * NCS-API Website - Centralized state store with reactive updates
 */

import { EVENTS, UI_STATES, PROCESSING_STATUS, STORAGE_KEYS, DEFAULTS } from '../config/constants.js';

/* ===================================
   State Store Class
   =================================== */

export class StateStore {
  constructor() {
    this.state = this.getInitialState();
    this.listeners = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    
    // Bind methods
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.dispatch = this.dispatch.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
  }

  /**
   * Get initial application state
   * @returns {Object} Initial state object
   */
  getInitialState() {
    return {
      // Application state
      app: {
        initialized: false,
        loading: false,
        error: null,
        theme: this.loadFromStorage(STORAGE_KEYS.THEME) || DEFAULTS.theme,
        language: DEFAULTS.language,
        online: navigator.onLine,
        lastUpdate: Date.now()
      },

      // User state
      user: {
        authenticated: false,
        profile: this.loadFromStorage(STORAGE_KEYS.USER_PROFILE) || null,
        token: this.loadFromStorage(STORAGE_KEYS.AUTH_TOKEN) || null,
        preferences: this.loadFromStorage(STORAGE_KEYS.PREFERENCES) || {},
        apiKeys: [],
        usage: null
      },

      // Data state
      data: {
        current: null,
        validated: false,
        processed: false,
        schema: null,
        statistics: null,
        preview: null,
        status: UI_STATES.IDLE,
        error: null,
        history: this.loadFromStorage(STORAGE_KEYS.LAST_DATASET) || []
      },

      // Clustering state
      clustering: {
        algorithm: DEFAULTS.algorithm,
        parameters: {},
        status: PROCESSING_STATUS.PENDING,
        progress: 0,
        results: null,
        quality: null,
        error: null,
        history: this.loadFromStorage(STORAGE_KEYS.CLUSTERING_HISTORY) || [],
        realtime: false
      },

      // Visualization state
      visualization: {
        type: DEFAULTS.chart_type,
        config: {
          colorScheme: DEFAULTS.color_scheme,
          pointSize: DEFAULTS.point_size,
          opacity: DEFAULTS.opacity
        },
        data: null,
        rendered: false,
        error: null,
        saved: this.loadFromStorage(STORAGE_KEYS.SAVED_VISUALIZATIONS) || []
      },

      // UI state
      ui: {
        sidebarOpen: false,
        modalOpen: false,
        activeModal: null,
        loading: new Set(),
        notifications: [],
        toast: null,
        activeTab: 'overview',
        filters: {},
        search: '',
        pagination: {
          page: 1,
          size: DEFAULTS.batch_size,
          total: 0
        }
      },

      // Network state
      network: {
        status: 'online',
        latency: null,
        requests: new Map(),
        cache: new Map(),
        retryQueue: []
      },

      // WebSocket state
      websocket: {
        connected: false,
        reconnecting: false,
        lastMessage: null,
        subscriptions: new Set(),
        error: null
      }
    };
  }

  /**
   * Subscribe to state changes
   * @param {string|Function} pathOrCallback - State path or callback function
   * @param {Function} callback - Callback function (if path provided)
   * @returns {Function} Unsubscribe function
   */
  subscribe(pathOrCallback, callback) {
    const id = this.generateId();
    
    if (typeof pathOrCallback === 'function') {
      // Subscribe to all changes
      this.listeners.set(id, {
        path: '*',
        callback: pathOrCallback
      });
    } else {
      // Subscribe to specific path
      this.listeners.set(id, {
        path: pathOrCallback,
        callback
      });
    }

    // Return unsubscribe function
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe from state changes
   * @param {string} id - Listener ID
   */
  unsubscribe(id) {
    this.listeners.delete(id);
  }

  /**
   * Get current state or state at path
   * @param {string} path - State path (optional)
   * @returns {any} State value
   */
  getState(path) {
    if (!path) return { ...this.state };
    return this.getNestedValue(this.state, path);
  }

  /**
   * Set state at path
   * @param {string} path - State path
   * @param {any} value - New value
   * @param {Object} options - Options
   */
  setState(path, value, options = {}) {
    const action = {
      type: 'SET_STATE',
      path,
      value,
      timestamp: Date.now(),
      ...options
    };

    this.dispatch(action);
  }

  /**
   * Dispatch action to update state
   * @param {Object} action - Action object
   */
  dispatch(action) {
    // Apply middleware
    let processedAction = action;
    for (const middleware of this.middleware) {
      processedAction = middleware(processedAction, this.state);
      if (!processedAction) return; // Middleware can cancel action
    }

    // Store previous state for history
    const previousState = JSON.parse(JSON.stringify(this.state));
    
    // Apply action to state
    this.applyAction(processedAction);
    
    // Add to history
    this.addToHistory({
      action: processedAction,
      previousState,
      newState: JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now()
    });

    // Notify listeners
    this.notifyListeners(processedAction);
    
    // Auto-save certain state changes
    this.autoSave(processedAction);
  }

  /**
   * Apply action to state
   * @param {Object} action - Action to apply
   */
  applyAction(action) {
    switch (action.type) {
      case 'SET_STATE':
        this.setNestedValue(this.state, action.path, action.value);
        break;
        
      case 'MERGE_STATE':
        const currentValue = this.getNestedValue(this.state, action.path);
        const mergedValue = { ...currentValue, ...action.value };
        this.setNestedValue(this.state, action.path, mergedValue);
        break;
        
      case 'ARRAY_PUSH':
        const array = this.getNestedValue(this.state, action.path) || [];
        array.push(action.value);
        this.setNestedValue(this.state, action.path, array);
        break;
        
      case 'ARRAY_REMOVE':
        const arr = this.getNestedValue(this.state, action.path) || [];
        const filtered = arr.filter((item, index) => 
          action.index !== undefined ? index !== action.index : item !== action.value
        );
        this.setNestedValue(this.state, action.path, filtered);
        break;
        
      case 'RESET_STATE':
        if (action.path) {
          const initialValue = this.getNestedValue(this.getInitialState(), action.path);
          this.setNestedValue(this.state, action.path, initialValue);
        } else {
          this.state = this.getInitialState();
        }
        break;
        
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
    
    // Update last modified timestamp
    this.state.app.lastUpdate = Date.now();
  }

  /**
   * Notify all relevant listeners
   * @param {Object} action - Action that caused the change
   */
  notifyListeners(action) {
    this.listeners.forEach(({ path, callback }) => {
      if (path === '*' || this.pathMatches(action.path || action.type, path)) {
        try {
          callback(this.state, action);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      }
    });
  }

  /**
   * Add middleware function
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware function
   * @param {Function} middleware - Middleware function to remove
   */
  removeMiddleware(middleware) {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * Get state history
   * @param {number} limit - Number of entries to return
   * @returns {Array} History entries
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Time travel to previous state
   * @param {number} steps - Number of steps to go back
   */
  timeTravel(steps = 1) {
    if (steps > this.history.length) {
      console.warn('Cannot travel back that far in history');
      return;
    }

    const targetEntry = this.history[this.history.length - steps];
    if (targetEntry) {
      this.state = JSON.parse(JSON.stringify(targetEntry.previousState));
      this.notifyListeners({ type: 'TIME_TRAVEL', steps });
    }
  }

  /**
   * Helper: Get nested value from object
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-separated path
   * @returns {any} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper: Set nested value in object
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot-separated path
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Helper: Check if path matches pattern
   * @param {string} actionPath - Action path
   * @param {string} listenerPath - Listener path pattern
   * @returns {boolean} True if paths match
   */
  pathMatches(actionPath, listenerPath) {
    if (listenerPath === '*') return true;
    if (listenerPath.endsWith('*')) {
      const prefix = listenerPath.slice(0, -1);
      return actionPath.startsWith(prefix);
    }
    return actionPath === listenerPath;
  }

  /**
   * Helper: Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
   * Auto-save certain state changes to localStorage
   * @param {Object} action - Action that was dispatched
   */
  autoSave(action) {
    const autoSavePaths = {
      'app.theme': STORAGE_KEYS.THEME,
      'user.profile': STORAGE_KEYS.USER_PROFILE,
      'user.preferences': STORAGE_KEYS.PREFERENCES,
      'data.history': STORAGE_KEYS.LAST_DATASET,
      'clustering.history': STORAGE_KEYS.CLUSTERING_HISTORY,
      'visualization.saved': STORAGE_KEYS.SAVED_VISUALIZATIONS
    };

    if (action.path && autoSavePaths[action.path]) {
      const value = this.getNestedValue(this.state, action.path);
      this.saveToStorage(autoSavePaths[action.path], value);
    }
  }

  /**
   * Load value from localStorage
   * @param {string} key - Storage key
   * @returns {any} Stored value or null
   */
  loadFromStorage(key) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to load from storage: ${key}`, error);
      return null;
    }
  }

  /**
   * Save value to localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to save
   */
  saveToStorage(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to storage: ${key}`, error);
    }
  }

  /**
   * Clear all stored data
   */
  clearStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove from storage: ${key}`, error);
      }
    });
  }

  /**
   * Reset entire store to initial state
   */
  reset() {
    this.state = this.getInitialState();
    this.history = [];
    this.notifyListeners({ type: 'STORE_RESET' });
  }
}

/* ===================================
   Action Creators
   =================================== */

export const actions = {
  // App actions
  setAppInitialized: (initialized = true) => ({
    type: 'SET_STATE',
    path: 'app.initialized',
    value: initialized
  }),

  setAppLoading: (loading = true) => ({
    type: 'SET_STATE',
    path: 'app.loading',
    value: loading
  }),

  setAppError: (error) => ({
    type: 'SET_STATE',
    path: 'app.error',
    value: error
  }),

  setTheme: (theme) => ({
    type: 'SET_STATE',
    path: 'app.theme',
    value: theme
  }),

  setOnlineStatus: (online) => ({
    type: 'SET_STATE',
    path: 'app.online',
    value: online
  }),

  // User actions
  setUserAuthenticated: (authenticated, profile = null, token = null) => ({
    type: 'MERGE_STATE',
    path: 'user',
    value: { authenticated, profile, token }
  }),

  setUserProfile: (profile) => ({
    type: 'SET_STATE',
    path: 'user.profile',
    value: profile
  }),

  setUserPreferences: (preferences) => ({
    type: 'MERGE_STATE',
    path: 'user.preferences',
    value: preferences
  }),

  // Data actions
  setCurrentData: (data) => ({
    type: 'SET_STATE',
    path: 'data.current',
    value: data
  }),

  setDataStatus: (status) => ({
    type: 'SET_STATE',
    path: 'data.status',
    value: status
  }),

  setDataSchema: (schema) => ({
    type: 'SET_STATE',
    path: 'data.schema',
    value: schema
  }),

  addDataToHistory: (dataInfo) => ({
    type: 'ARRAY_PUSH',
    path: 'data.history',
    value: {
      ...dataInfo,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
  }),

  // Clustering actions
  setClusteringAlgorithm: (algorithm) => ({
    type: 'SET_STATE',
    path: 'clustering.algorithm',
    value: algorithm
  }),

  setClusteringParameters: (parameters) => ({
    type: 'SET_STATE',
    path: 'clustering.parameters',
    value: parameters
  }),

  setClusteringStatus: (status) => ({
    type: 'SET_STATE',
    path: 'clustering.status',
    value: status
  }),

  setClusteringProgress: (progress) => ({
    type: 'SET_STATE',
    path: 'clustering.progress',
    value: progress
  }),

  setClusteringResults: (results) => ({
    type: 'MERGE_STATE',
    path: 'clustering',
    value: {
      results,
      status: PROCESSING_STATUS.COMPLETED,
      progress: 100,
      error: null
    }
  }),

  setClusteringError: (error) => ({
    type: 'MERGE_STATE',
    path: 'clustering',
    value: {
      error,
      status: PROCESSING_STATUS.FAILED,
      results: null
    }
  }),

  addClusteringToHistory: (clusteringInfo) => ({
    type: 'ARRAY_PUSH',
    path: 'clustering.history',
    value: {
      ...clusteringInfo,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
  }),

  // Visualization actions
  setVisualizationType: (type) => ({
    type: 'SET_STATE',
    path: 'visualization.type',
    value: type
  }),

  setVisualizationConfig: (config) => ({
    type: 'MERGE_STATE',
    path: 'visualization.config',
    value: config
  }),

  setVisualizationData: (data) => ({
    type: 'SET_STATE',
    path: 'visualization.data',
    value: data
  }),

  setVisualizationRendered: (rendered = true) => ({
    type: 'SET_STATE',
    path: 'visualization.rendered',
    value: rendered
  }),

  saveVisualization: (vizInfo) => ({
    type: 'ARRAY_PUSH',
    path: 'visualization.saved',
    value: {
      ...vizInfo,
      timestamp: Date.now(),
      id: Date.now().toString()
    }
  }),

  // UI actions
  setSidebarOpen: (open) => ({
    type: 'SET_STATE',
    path: 'ui.sidebarOpen',
    value: open
  }),

  setModalOpen: (open, modalId = null) => ({
    type: 'MERGE_STATE',
    path: 'ui',
    value: { modalOpen: open, activeModal: modalId }
  }),

  addUILoading: (key) => ({
    type: 'SET_STATE',
    path: 'ui.loading',
    value: new Set([...store.getState('ui.loading'), key])
  }),

  removeUILoading: (key) => ({
    type: 'SET_STATE',
    path: 'ui.loading',
    value: new Set([...store.getState('ui.loading')].filter(k => k !== key))
  }),

  addNotification: (notification) => ({
    type: 'ARRAY_PUSH',
    path: 'ui.notifications',
    value: {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now()
    }
  }),

  removeNotification: (id) => ({
    type: 'ARRAY_REMOVE',
    path: 'ui.notifications',
    value: (item) => item.id !== id
  }),

  setToast: (toast) => ({
    type: 'SET_STATE',
    path: 'ui.toast',
    value: toast
  }),

  setActiveTab: (tab) => ({
    type: 'SET_STATE',
    path: 'ui.activeTab',
    value: tab
  }),

  // WebSocket actions
  setWebSocketConnected: (connected) => ({
    type: 'SET_STATE',
    path: 'websocket.connected',
    value: connected
  }),

  setWebSocketReconnecting: (reconnecting) => ({
    type: 'SET_STATE',
    path: 'websocket.reconnecting',
    value: reconnecting
  }),

  setWebSocketError: (error) => ({
    type: 'SET_STATE',
    path: 'websocket.error',
    value: error
  })
};

/* ===================================
   Middleware Functions
   =================================== */

// Logger middleware
export const loggerMiddleware = (action, state) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 State Action: ${action.type}`);
    console.log('Action:', action);
    console.log('Previous State:', state);
    console.groupEnd();
  }
  return action;
};

// Validation middleware
export const validationMiddleware = (action, state) => {
  // Add validation logic here
  if (action.type === 'SET_STATE' && action.path === 'clustering.progress') {
    if (action.value < 0 || action.value > 100) {
      console.warn('Invalid progress value:', action.value);
      return null; // Cancel action
    }
  }
  return action;
};

// Analytics middleware
export const analyticsMiddleware = (action, state) => {
  // Track certain actions for analytics
  const trackableActions = [
    'setClusteringAlgorithm',
    'setClusteringResults',
    'setTheme'
  ];
  
  if (trackableActions.includes(action.type)) {
    // Send to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'state_action', {
        action_type: action.type,
        custom_parameter: action.path
      });
    }
  }
  
  return action;
};

/* ===================================
   Create and Export Store Instance
   =================================== */

export const store = new StateStore();

// Add default middleware
store.addMiddleware(loggerMiddleware);
store.addMiddleware(validationMiddleware);
store.addMiddleware(analyticsMiddleware);

// Export for global access
if (typeof window !== 'undefined') {
  window.__NCS_STORE__ = store;
}

export default store;