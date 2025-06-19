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
    this.on = this.on.bind(this); // Alias for subscribe

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Alias for subscribe method to match .on() usage
   * @param {string} type - Message type
   * @param {Function} handler - Message handler
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(type, handler, options = {}) {
    return this.subscribe(type, handler, options);
  }

  // --- Existing methods unchanged ---
  
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

      this.setupSocketEventHandlers();

      await this.waitForConnection();

      this.isConnecting = false;
      this.reconnectAttempts = 0;

      this.startHeartbeat();

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

  async disconnect(code = 1000, reason = 'Client disconnect') {
    if (!this.socket) {
      return;
    }

    console.log('🔌 Disconnecting WebSocket');

    this.clearTimers();

    this.socket.close(code, reason);
    this.socket = null;

    store.dispatch(actions.setWebSocketConnected(false));
    store.dispatch(actions.setWebSocketReconnecting(false));

    this.connectionId = null;
    this.isReconnecting = false;

    eventBus.emit(EVENTS.WS_DISCONNECT, {
      code,
      reason,
      timestamp: Date.now()
    });

    console.log('✅ WebSocket disconnected');
  }

  async send(type, data = null, options = {}) {
    const message = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now(),
      ...options
    };

    const messageStr = JSON.stringify(message);
    if (messageStr.length > this.maxMessageSize) {
      throw new Error(`Message size exceeds maximum allowed size of ${this.maxMessageSize} bytes`);
    }

    if (!this.isConnected()) {
      this.messageQueue.push(message);
      console.log(`📤 Message queued (type: ${type})`);
      return;
    }

    try {
      this.socket.send(messageStr);
      this.stats.messagesSent++;

      this.addToMessageHistory({
        direction: 'sent',
        message,
        timestamp: Date.now()
      });

      console.log(`📤 Message sent (type: ${type})`);

    } catch (error) {
      console.error('❌ Failed to send message:', error);

      this.messageQueue.push(message);
      throw error;
    }
  }

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

    return () => this.unsubscribe(type, subscription.id);
  }

  unsubscribe(type, subscriptionId = null) {
    if (!this.subscriptions.has(type)) {
      return;
    }

    const handlers = this.subscriptions.get(type);

    if (subscriptionId) {
      const index = handlers.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      handlers.length = 0;
    }

    if (handlers.length === 0) {
      this.subscriptions.delete(type);
    }

    console.log(`📤 Unsubscribed from message type: ${type}`);
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

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

  getMessageHistory(limit = 50) {
    return this.messageHistory.slice(-limit);
  }

  clearMessageQueue() {
    this.messageQueue = [];
    console.log('📭 Message queue cleared');
  }

  buildConnectionUrl(options = {}) {
    let url = WS_BASE_URL;

    const token = store.getState('user.token');
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }

    if (options.clientId) {
      url += url.includes('?') ? '&' : '?';
      url += `clientId=${encodeURIComponent(options.clientId)}`;
    }

    return url;
  }

  setupSocketEventHandlers() {
    if (!this.socket) return;

    this.socket.onopen = (event) => this.handleOpen(event);
    this.socket.onclose = (event) => this.handleClose(event);
    this.socket.onerror = (event) => this.handleError(event);
    this.socket.onmessage = (event) => this.handleMessage(event);
  }

  handleOpen(event) {
    console.log('🔗 WebSocket connection opened');

    store.dispatch(actions.setWebSocketConnected(true));
    store.dispatch(actions.setWebSocketReconnecting(false));
    store.dispatch(actions.setWebSocketError(null));

    this.stats.connectionTime = Date.now();

    this.sendHandshake();
  }

  handleClose(event) {
    console.log(`🔌 WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);

    store.dispatch(actions.setWebSocketConnected(false));

    this.clearTimers();

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

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.stats.messagesReceived++;

      console.log(`📥 Message received (type: ${message.type})`);

      this.addToMessageHistory({
        direction: 'received',
        message,
        timestamp: Date.now()
      });

      this.handleSpecialMessages(message);

      this.notifySubscribers(message);

      eventBus.emit(EVENTS.WS_MESSAGE, message);

    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
      this.stats.errors++;
    }
  }

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

  waitForConnection() {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

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

  sendHandshake() {
    this.send('handshake', {
      version: '1.0.0',
      capabilities: ['clustering', 'realtime'],
      timestamp: Date.now()
    });
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  sendHeartbeatResponse() {
    this.send('heartbeat_response', { timestamp: Date.now() });
  }

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
        this.messageQueue.push(message);
      }
    });
  }

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

  addToMessageHistory(entry) {
    this.messageHistory.push(entry);

    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setupEventListeners() {
    eventBus.on(EVENTS.USER_LOGIN, () => {
      if (this.isConnected()) {
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      }
    });

    eventBus.on(EVENTS.USER_LOGOUT, () => {
      this.disconnect();
    });

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

export function createClusteringWebSocket(wsManager) {
  return {
    startClustering: (config) =>
      wsManager.send('start_clustering', config),

    onClusteringProgress: (handler) =>
      wsManager.subscribe('clustering_progress', handler),

    onClusteringComplete: (handler) =>
      wsManager.subscribe('clustering_complete', handler),

    cancelClustering: (operationId) =>
      wsManager.send('cancel_clustering', { operationId }),

    subscribeToDataStream: (streamId) =>
      wsManager.send('subscribe_stream', { streamId }),

    unsubscribeFromDataStream: (streamId) =>
      wsManager.send('unsubscribe_stream', { streamId })
  };
}

/* ===================================
   Create and Export WebSocket Manager Instance
   =================================== */

export const wsManager = new WebSocketManager();
export const clusteringWS = createClusteringWebSocket(wsManager);

// Assign to window.NCS.ws for global usage to fix `.on` issues
if (typeof window !== 'undefined') {
  window.NCS = window.NCS || {};
  window.NCS.ws = wsManager;
}

export default wsManager;
