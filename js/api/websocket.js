/**
 * FILE: js/api/websocket.js
 * WebSocket Manager
 * NCS-API Website - Real-time communication with WebSocket support
 */

import { WS_BASE_URL, API_CONFIG } from '../config/api.js';
import { EVENTS, CONNECTION_STATUS, ERROR_CODES } from '../config/constants.js';
import eventBus from '../core/eventBus.js';
import store, { actions } from '../core/state.js';

/* ===================================
   WebSocket Manager Class
   =================================== */

export class WebSocketManager {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = API_CONFIG.websocket.reconnectAttempts;
    this.reconnectDelay = API_CONFIG.websocket.reconnectDelay;
    this.heartbeatInterval = API_CONFIG.websocket.heartbeatInterval;
    this.maxMessageSize = API_CONFIG.websocket.maxMessageSize;
    
    // Connection state
    this.isConnecting = false;
    this.isReconnecting = false;
    this.connectionId = null;
    this.lastHeartbeat = null;
    this.connectionStartTime = null;
    
    // Message handling
    this.messageQueue = [];
    this.subscriptions = new Map();
    this.messageHistory = [];
    this.maxHistorySize = 100;
    
    // Timers
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    
    // Statistics
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      connectionTime: 0,
      errors: 0
    };
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Connect to WebSocket server
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connect(options = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    try {
      this.isConnecting = true;
      store.dispatch(actions.setWebSocketConnected(false));
      
      const url = this.buildConnectionUrl(options);
      
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      
      this.socket = new WebSocket(url);
      this.connectionStartTime = Date.now();
      
      // Setup event handlers
      this.setupSocketEventHandlers();
      
      // Wait for connection
      await this.waitForConnection();
      
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Process queued messages
      this.processMessageQueue();
      
      console.log('✅ WebSocket connected successfully');
      
      eventBus.emit(EVENTS.WS_CONNECT, {
        connectionId: this.connectionId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ WebSocket connection failed:', error);
      
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   * @returns {Promise<void>}
   */
  async disconnect(code = 1000, reason = 'Client disconnect') {
    if (!this.socket) {
      return;
    }

    console.log('🔌 Disconnecting WebSocket');
    
    // Clear timers
    this.clearTimers();
    
    // Close connection
    this.socket.close(code, reason);
    this.socket = null;
    
    // Update state
    store.dispatch(actions.setWebSocketConnected(false));
    store.dispatch(actions.setWebSocketReconnecting(false));
    
    // Clear connection data
    this.connectionId = null;
    this.isReconnecting = false;
    
    eventBus.emit(EVENTS.WS_DISCONNECT, {
      code,
      reason,
      timestamp: Date.now()
    });
    
    console.log('✅ WebSocket disconnected');
  }

  /**
   * Send message to server
   * @param {string} type - Message type
   * @param {any} data - Message data
   * @param {Object} options - Send options
   * @returns {Promise<void>}
   */
  async send(type, data = null, options = {}) {
    const message = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now(),
      ...options
    };

    // Validate message size
    const messageStr = JSON.stringify(message);
    if (messageStr.length > this.maxMessageSize) {
      throw new Error(`Message size exceeds maximum allowed size of ${this.maxMessageSize} bytes`);
    }

    // Queue message if not connected
    if (!this.isConnected()) {
      this.messageQueue.push(message);
      console.log(`📤 Message queued (type: ${type})`);
      return;
    }

    try {
      this.socket.send(messageStr);
      this.stats.messagesSent++;
      
      // Add to history
      this.addToMessageHistory({
        direction: 'sent',
        message,
        timestamp: Date.now()
      });
      
      console.log(`📤 Message sent (type: ${type})`);
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Re-queue message on error
      this.messageQueue.push(message);
      throw error;
    }
  }

  /**
   * Subscribe to message type
   * @param {string} type - Message type
   * @param {Function} handler - Message handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  subscribe(type, handler, options = {}) {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }

    const subscription = {
      id: this.generateMessageId(),
      handler,
      options,
      createdAt: Date.now()
    };

    this.subscriptions.get(type).push(subscription);
    
    console.log(`📥 Subscribed to message type: ${type}`);
    
    // Return unsubscribe function
    return () => this.unsubscribe(type, subscription.id);
  }

  /**
   * Unsubscribe from message type
   * @param {string} type - Message type
   * @param {string} subscriptionId - Subscription ID (optional)
   */
  unsubscribe(type, subscriptionId = null) {
    if (!this.subscriptions.has(type)) {
      return;
    }

    const handlers = this.subscriptions.get(type);
    
    if (subscriptionId) {
      // Remove specific subscription
      const index = handlers.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      // Remove all subscriptions for type
      handlers.length = 0;
    }

    // Clean up empty subscription arrays
    if (handlers.length === 0) {
      this.subscriptions.delete(type);
    }
    
    console.log(`📤 Unsubscribed from message type: ${type}`);
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   * @returns {string} Connection status
   */
  getStatus() {
    if (!this.socket) {
      return CONNECTION_STATUS.DISCONNECTED;
    }

    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return CONNECTION_STATUS.CONNECTING;
      case WebSocket.OPEN:
        return CONNECTION_STATUS.CONNECTED;
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return this.isReconnecting ? CONNECTION_STATUS.RECONNECTING : CONNECTION_STATUS.DISCONNECTED;
      default:
        return CONNECTION_STATUS.ERROR;
    }
  }

  /**
   * Get WebSocket statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      status: this.getStatus(),
      connectionTime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      queuedMessages: this.messageQueue.length,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  /**
   * Get message history
   * @param {number} limit - Number of messages to return
   * @returns {Array} Message history
   */
  getMessageHistory(limit = 50) {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message queue
   */
  clearMessageQueue() {
    this.messageQueue = [];
    console.log('📭 Message queue cleared');
  }

  /**
   * Build WebSocket connection URL
   * @param {Object} options - Connection options
   * @returns {string} WebSocket URL
   */
  buildConnectionUrl(options = {}) {
    let url = WS_BASE_URL;
    
    // Add authentication token if available
    const token = store.getState('user.token');
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }
    
    // Add additional parameters
    if (options.clientId) {
      url += url.includes('?') ? '&' : '?';
      url += `clientId=${encodeURIComponent(options.clientId)}`;
    }
    
    return url;
  }

  /**
   * Setup WebSocket event handlers
   */
  setupSocketEventHandlers() {
    if (!this.socket) return;

    this.socket.onopen = (event) => {
      this.handleOpen(event);
    };

    this.socket.onclose = (event) => {
      this.handleClose(event);
    };

    this.socket.onerror = (event) => {
      this.handleError(event);
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handle WebSocket open event
   * @param {Event} event - Open event
   */
  handleOpen(event) {
    console.log('🔗 WebSocket connection opened');
    
    store.dispatch(actions.setWebSocketConnected(true));
    store.dispatch(actions.setWebSocketReconnecting(false));
    store.dispatch(actions.setWebSocketError(null));
    
    this.stats.connectionTime = Date.now();
    
    // Send initial handshake
    this.sendHandshake();
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - Close event
   */
  handleClose(event) {
    console.log(`🔌 WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
    
    store.dispatch(actions.setWebSocketConnected(false));
    
    this.clearTimers();
    
    // Attempt reconnection if not intentional
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
    
    eventBus.emit(EVENTS.WS_DISCONNECT, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: Date.now()
    });
  }

  /**
   * Handle WebSocket error event
   * @param {Event} event - Error event
   */
  handleError(event) {
    console.error('❌ WebSocket error:', event);
    
    this.stats.errors++;
    
    const error = {
      type: 'websocket_error',
      message: 'WebSocket connection error',
      timestamp: Date.now(),
      event
    };
    
    store.dispatch(actions.setWebSocketError(error));
    
    eventBus.emit(EVENTS.WS_ERROR, error);
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.stats.messagesReceived++;
      
      console.log(`📥 Message received (type: ${message.type})`);
      
      // Add to history
      this.addToMessageHistory({
        direction: 'received',
        message,
        timestamp: Date.now()
      });
      
      // Handle special message types
      this.handleSpecialMessages(message);
      
      // Notify subscribers
      this.notifySubscribers(message);
      
      // Emit general message event
      eventBus.emit(EVENTS.WS_MESSAGE, message);
      
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      this.stats.errors++;
    }
  }

  /**
   * Handle special system messages
   * @param {Object} message - Received message
   */
  handleSpecialMessages(message) {
    switch (message.type) {
      case 'handshake_response':
        this.connectionId = message.data.connectionId;
        console.log(`🤝 Handshake complete (ID: ${this.connectionId})`);
        break;
        
      case 'heartbeat':
        this.lastHeartbeat = Date.now();
        this.sendHeartbeatResponse();
        break;
        
      case 'error':
        console.error('📥 Server error:', message.data);
        eventBus.emit(EVENTS.WS_ERROR, message.data);
        break;
        
      case 'clustering_progress':
        store.dispatch(actions.setClusteringProgress(message.data.progress));
        eventBus.emit(EVENTS.CLUSTERING_PROGRESS, message.data);
        break;
        
      case 'clustering_complete':
        store.dispatch(actions.setClusteringResults(message.data));
        eventBus.emit(EVENTS.CLUSTERING_COMPLETE, message.data);
        break;
    }
  }

  /**
   * Notify message subscribers
   * @param {Object} message - Received message
   */
  notifySubscribers(message) {
    const handlers = this.subscriptions.get(message.type);
    if (!handlers) return;

    handlers.forEach(subscription => {
      try {
        subscription.handler(message.data, message);
      } catch (error) {
        console.error(`❌ Error in message handler for type ${message.type}:`, error);
      }
    });
  }

  /**
   * Wait for WebSocket connection to open
   * @returns {Promise<void>}
   */
  waitForConnection() {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000); // 10 second timeout

      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });

      this.socket.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      }, { once: true });
    });
  }

  /**
   * Send initial handshake message
   */
  sendHandshake() {
    this.send('handshake', {
      version: '1.0.0',
      capabilities: ['clustering', 'realtime'],
      timestamp: Date.now()
    });
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Send heartbeat response
   */
  sendHeartbeatResponse() {
    this.send('heartbeat_response', { timestamp: Date.now() });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.stats.reconnections++;
    
    store.dispatch(actions.setWebSocketReconnecting(true));
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.isReconnecting = false;
      
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.error('❌ Max reconnection attempts reached');
          store.dispatch(actions.setWebSocketError({
            type: 'max_reconnections_reached',
            message: 'Failed to reconnect after maximum attempts'
          }));
        }
      }
    }, delay);
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(async (message) => {
      try {
        await this.send(message.type, message.data, message.options);
      } catch (error) {
        console.error('❌ Failed to send queued message:', error);
        // Re-queue failed message
        this.messageQueue.push(message);
      }
    });
  }

  /**
   * Handle connection error
   * @param {Error} error - Connection error
   */
  handleConnectionError(error) {
    this.stats.errors++;
    
    const wsError = {
      type: 'connection_error',
      message: error.message,
      code: ERROR_CODES.NETWORK,
      timestamp: Date.now()
    };
    
    store.dispatch(actions.setWebSocketError(wsError));
    eventBus.emit(EVENTS.WS_ERROR, wsError);
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Add message to history
   * @param {Object} entry - History entry
   */
  addToMessageHistory(entry) {
    this.messageHistory.push(entry);
    
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  /**
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup application event listeners
   */
  setupEventListeners() {
    // Listen for auth changes
    eventBus.on(EVENTS.USER_LOGIN, () => {
      if (this.isConnected()) {
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      }
    });

    eventBus.on(EVENTS.USER_LOGOUT, () => {
      this.disconnect();
    });

    // Listen for network changes
    eventBus.on(EVENTS.NETWORK_OFFLINE, () => {
      this.disconnect();
    });

    eventBus.on(EVENTS.NETWORK_ONLINE, () => {
      if (!this.isConnected()) {
        this.connect();
      }
    });
  }
}

/* ===================================
   WebSocket Event Helpers
   =================================== */

/**
 * Create typed WebSocket methods for clustering
 * @param {WebSocketManager} wsManager - WebSocket manager instance
 * @returns {Object} Typed clustering methods
 */
export function createClusteringWebSocket(wsManager) {
  return {
    // Start clustering operation
    startClustering: (config) => 
      wsManager.send('start_clustering', config),
    
    // Subscribe to clustering progress
    onClusteringProgress: (handler) => 
      wsManager.subscribe('clustering_progress', handler),
    
    // Subscribe to clustering completion
    onClusteringComplete: (handler) => 
      wsManager.subscribe('clustering_complete', handler),
    
    // Cancel clustering operation
    cancelClustering: (operationId) => 
      wsManager.send('cancel_clustering', { operationId }),
    
    // Subscribe to real-time data updates
    subscribeToDataStream: (streamId) => 
      wsManager.send('subscribe_stream', { streamId }),
    
    // Unsubscribe from data stream
    unsubscribeFromDataStream: (streamId) => 
      wsManager.send('unsubscribe_stream', { streamId })
  };
}

/* ===================================
   Create and Export WebSocket Manager Instance
   =================================== */

export const wsManager = new WebSocketManager();

// Create clustering-specific WebSocket helpers
export const clusteringWS = createClusteringWebSocket(wsManager);

// Export for global access
if (typeof window !== 'undefined') {
  window.__NCS_WEBSOCKET__ = wsManager;
}

export default wsManager;