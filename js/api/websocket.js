/**
 * WebSocket Manager
 * Real-time communication with NCS-API backend
 * 
 * Features:
 * - Automatic reconnection
 * - Message queuing
 * - Event-based communication
 * - Connection health monitoring
 * - Heartbeat/ping-pong
 * - Error handling
 */

import { CONFIG, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/eventBus.js';

export class WebSocketManager {
    constructor(options = {}) {
        this.options = {
            url: CONFIG.API.WS_URL,
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
            heartbeatInterval: 30000,
            enableCompression: true,
            enableLogging: true,
            ...options
        };
        
        this.ws = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
        this.lastConnectedAt = null;
        this.reconnectAttempt = 0;
        this.messageQueue = [];
        this.subscriptions = new Map();
        this.requestCallbacks = new Map();
        this.heartbeatTimer = null;
        this.connectionTimer = null;
        
        // Event handlers
        this.eventHandlers = {
            open: this.handleOpen.bind(this),
            message: this.handleMessage.bind(this),
            close: this.handleClose.bind(this),
            error: this.handleError.bind(this)
        };
        
        // Unique request ID counter
        this.requestId = 0;
        
        // Statistics
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            errors: 0,
            lastActivity: null
        };
        
        if (this.options.enableLogging) {
            console.log('🔌 WebSocket Manager initialized:', this.options.url);
        }
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.connectionState = 'connecting';
                
                if (this.options.enableLogging) {
                    console.log('🔌 Connecting to WebSocket:', this.options.url);
                }
                
                // Create WebSocket connection
                this.ws = new WebSocket(this.options.url);
                
                // Setup event listeners
                this.ws.addEventListener('open', this.eventHandlers.open);
                this.ws.addEventListener('message', this.eventHandlers.message);
                this.ws.addEventListener('close', this.eventHandlers.close);
                this.ws.addEventListener('error', this.eventHandlers.error);
                
                // Store resolve/reject for connection result
                this.connectionResolve = resolve;
                this.connectionReject = reject;
                
                // Connection timeout
                this.connectionTimer = setTimeout(() => {
                    if (this.connectionState === 'connecting') {
                        this.connectionState = 'disconnected';
                        this.ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000); // 10 second timeout
                
            } catch (error) {
                this.connectionState = 'disconnected';
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.connectionState = 'disconnected';
        this.reconnectAttempt = 0;
        
        // Clear timers
        this.clearTimers();
        
        // Close WebSocket
        if (this.ws) {
            this.ws.removeEventListener('open', this.eventHandlers.open);
            this.ws.removeEventListener('message', this.eventHandlers.message);
            this.ws.removeEventListener('close', this.eventHandlers.close);
            this.ws.removeEventListener('error', this.eventHandlers.error);
            
            this.ws.close(1000, 'Normal closure');
            this.ws = null;
        }
        
        // Reject pending callbacks
        this.requestCallbacks.forEach(callback => {
            callback.reject(new Error('WebSocket disconnected'));
        });
        this.requestCallbacks.clear();
        
        if (this.options.enableLogging) {
            console.log('🔌 WebSocket disconnected');
        }
        
        eventBus.emit(EVENTS.API_DISCONNECTED);
    }

    /**
     * Send message to server
     */
    send(message, waitForResponse = false, timeout = 10000) {
        if (this.connectionState !== 'connected') {
            // Queue message for when connection is restored
            return this.queueMessage(message, waitForResponse, timeout);
        }
        
        try {
            // Add message ID for request/response tracking
            if (waitForResponse) {
                message.id = this.generateRequestId();
            }
            
            const messageString = JSON.stringify(message);
            this.ws.send(messageString);
            
            this.stats.messagesSent++;
            this.stats.lastActivity = Date.now();
            
            if (this.options.enableLogging) {
                console.log('🔌 WebSocket message sent:', message);
            }
            
            // Return promise for response if requested
            if (waitForResponse) {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        this.requestCallbacks.delete(message.id);
                        reject(new Error('WebSocket request timeout'));
                    }, timeout);
                    
                    this.requestCallbacks.set(message.id, {
                        resolve,
                        reject,
                        timer
                    });
                });
            }
            
            return Promise.resolve();
            
        } catch (error) {
            console.error('🔌 Failed to send WebSocket message:', error);
            throw error;
        }
    }

    /**
     * Subscribe to server events
     */
    subscribe(event, handler) {
        if (!this.subscriptions.has(event)) {
            this.subscriptions.set(event, new Set());
        }
        
        this.subscriptions.get(event).add(handler);
        
        // Send subscription message to server
        this.send({
            type: 'subscribe',
            event
        });
        
        // Return unsubscribe function
        return () => this.unsubscribe(event, handler);
    }

    /**
     * Unsubscribe from server events
     */
    unsubscribe(event, handler) {
        const handlers = this.subscriptions.get(event);
        if (handlers) {
            handlers.delete(handler);
            
            if (handlers.size === 0) {
                this.subscriptions.delete(event);
                
                // Send unsubscribe message to server
                this.send({
                    type: 'unsubscribe',
                    event
                });
            }
        }
    }

    /**
     * API-specific methods
     */

    // Start clustering with real-time updates
    async startClustering(data, algorithm, parameters = {}) {
        return this.send({
            type: 'cluster:start',
            data,
            algorithm,
            parameters
        }, true);
    }

    // Subscribe to clustering progress updates
    subscribeToClusteringProgress(jobId, onProgress) {
        return this.subscribe(`cluster:progress:${jobId}`, onProgress);
    }

    // Subscribe to clustering completion
    subscribeToClusteringComplete(jobId, onComplete) {
        return this.subscribe(`cluster:complete:${jobId}`, onComplete);
    }

    // Real-time data validation
    async validateDataRealtime(data) {
        return this.send({
            type: 'data:validate',
            data
        }, true);
    }

    // Subscribe to system status updates
    subscribeToSystemStatus(onStatus) {
        return this.subscribe('system:status', onStatus);
    }

    // Subscribe to user activity updates
    subscribeToUserActivity(onActivity) {
        return this.subscribe('user:activity', onActivity);
    }

    /**
     * Event handlers
     */
    handleOpen(event) {
        if (this.options.enableLogging) {
            console.log('🔌 WebSocket connected');
        }
        
        this.connectionState = 'connected';
        this.lastConnectedAt = Date.now();
        this.reconnectAttempt = 0;
        
        // Clear connection timer
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        
        // Resolve connection promise
        if (this.connectionResolve) {
            this.connectionResolve();
            this.connectionResolve = null;
            this.connectionReject = null;
        }
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Process queued messages
        this.processMessageQueue();
        
        // Re-subscribe to events
        this.resubscribeEvents();
        
        // Emit connected event
        eventBus.emit(EVENTS.API_CONNECTED);
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            this.stats.messagesReceived++;
            this.stats.lastActivity = Date.now();
            
            if (this.options.enableLogging) {
                console.log('🔌 WebSocket message received:', message);
            }
            
            // Handle different message types
            switch (message.type) {
                case 'response':
                    this.handleResponse(message);
                    break;
                    
                case 'event':
                    this.handleEvent(message);
                    break;
                    
                case 'heartbeat':
                    this.handleHeartbeat(message);
                    break;
                    
                case 'error':
                    this.handleServerError(message);
                    break;
                    
                default:
                    console.warn('🔌 Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('🔌 Failed to parse WebSocket message:', error);
            this.stats.errors++;
        }
    }

    handleClose(event) {
        const wasConnected = this.connectionState === 'connected';
        this.connectionState = 'disconnected';
        
        // Clear heartbeat
        this.stopHeartbeat();
        
        if (this.options.enableLogging) {
            console.log('🔌 WebSocket closed:', event.code, event.reason);
        }
        
        // Reject connection promise if still connecting
        if (this.connectionReject) {
            this.connectionReject(new Error(`WebSocket connection failed: ${event.reason}`));
            this.connectionResolve = null;
            this.connectionReject = null;
        }
        
        // Emit disconnected event
        eventBus.emit(EVENTS.API_DISCONNECTED);
        
        // Attempt reconnection if it was an unexpected closure
        if (wasConnected && event.code !== 1000) {
            this.attemptReconnection();
        }
    }

    handleError(event) {
        console.error('🔌 WebSocket error:', event);
        this.stats.errors++;
        
        // Reject connection promise if connecting
        if (this.connectionReject) {
            this.connectionReject(new Error('WebSocket connection error'));
            this.connectionResolve = null;
            this.connectionReject = null;
        }
    }

    handleResponse(message) {
        const callback = this.requestCallbacks.get(message.id);
        if (callback) {
            clearTimeout(callback.timer);
            this.requestCallbacks.delete(message.id);
            
            if (message.error) {
                callback.reject(new Error(message.error));
            } else {
                callback.resolve(message.data);
            }
        }
    }

    handleEvent(message) {
        const handlers = this.subscriptions.get(message.event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message.data);
                } catch (error) {
                    console.error('🔌 Error in event handler:', error);
                }
            });
        }
        
        // Also emit to global event bus
        eventBus.emit(`ws:${message.event}`, message.data);
    }

    handleHeartbeat(message) {
        // Respond to server heartbeat
        this.send({
            type: 'heartbeat',
            timestamp: Date.now()
        });
    }

    handleServerError(message) {
        console.error('🔌 Server error:', message.error);
        eventBus.emit('ws:error', message.error);
    }

    /**
     * Reconnection logic
     */
    attemptReconnection() {
        if (this.reconnectAttempt >= this.options.reconnectAttempts) {
            console.error('🔌 Max reconnection attempts reached');
            eventBus.emit('ws:reconnect-failed');
            return;
        }
        
        this.connectionState = 'reconnecting';
        this.reconnectAttempt++;
        
        const delay = Math.min(
            this.options.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1),
            this.options.maxReconnectDelay
        );
        
        if (this.options.enableLogging) {
            console.log(`🔌 Attempting reconnection ${this.reconnectAttempt}/${this.options.reconnectAttempts} in ${delay}ms`);
        }
        
        setTimeout(() => {
            if (this.connectionState === 'reconnecting') {
                this.connect().catch(error => {
                    console.error('🔌 Reconnection failed:', error);
                    this.attemptReconnection();
                });
            }
        }, delay);
        
        this.stats.reconnections++;
        eventBus.emit('ws:reconnecting', {
            attempt: this.reconnectAttempt,
            maxAttempts: this.options.reconnectAttempts,
            delay
        });
    }

    /**
     * Message queuing
     */
    queueMessage(message, waitForResponse, timeout) {
        if (waitForResponse) {
            return new Promise((resolve, reject) => {
                this.messageQueue.push({
                    message,
                    waitForResponse,
                    timeout,
                    resolve,
                    reject
                });
            });
        } else {
            this.messageQueue.push({
                message,
                waitForResponse,
                timeout
            });
            return Promise.resolve();
        }
    }

    processMessageQueue() {
        if (this.messageQueue.length === 0) return;
        
        if (this.options.enableLogging) {
            console.log(`🔌 Processing ${this.messageQueue.length} queued messages`);
        }
        
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        
        queue.forEach(item => {
            const promise = this.send(item.message, item.waitForResponse, item.timeout);
            
            if (item.resolve && item.reject) {
                promise.then(item.resolve).catch(item.reject);
            }
        });
    }

    /**
     * Event subscription management
     */
    resubscribeEvents() {
        this.subscriptions.forEach((handlers, event) => {
            this.send({
                type: 'subscribe',
                event
            });
        });
    }

    /**
     * Heartbeat management
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.connectionState === 'connected') {
                this.send({
                    type: 'ping',
                    timestamp: Date.now()
                });
            }
        }, this.options.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Utility methods
     */
    generateRequestId() {
        return `req_${++this.requestId}_${Date.now()}`;
    }

    clearTimers() {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        
        this.stopHeartbeat();
    }

    /**
     * Connection status and statistics
     */
    getStatus() {
        return {
            state: this.connectionState,
            connected: this.connectionState === 'connected',
            lastConnectedAt: this.lastConnectedAt,
            reconnectAttempt: this.reconnectAttempt,
            queueSize: this.messageQueue.length,
            subscriptions: this.subscriptions.size,
            pendingRequests: this.requestCallbacks.size,
            stats: { ...this.stats }
        };
    }

    getConnectionInfo() {
        if (!this.ws) return null;
        
        return {
            url: this.ws.url,
            protocol: this.ws.protocol,
            readyState: this.ws.readyState,
            bufferedAmount: this.ws.bufferedAmount,
            extensions: this.ws.extensions
        };
    }

    /**
     * Testing and debugging
     */
    simulateDisconnection() {
        if (this.ws) {
            this.ws.close(1006, 'Simulated disconnection');
        }
    }

    injectMessage(message) {
        this.handleMessage({ data: JSON.stringify(message) });
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Disconnect and cleanup
        this.disconnect();
        
        // Clear subscriptions
        this.subscriptions.clear();
        
        // Clear message queue
        this.messageQueue.forEach(item => {
            if (item.reject) {
                item.reject(new Error('WebSocket manager destroyed'));
            }
        });
        this.messageQueue = [];
        
        if (this.options.enableLogging) {
            console.log('🔌 WebSocket Manager destroyed');
        }
    }
}

export default WebSocketManager;