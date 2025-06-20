/**
 * WebSocket client for real-time clustering API communication
 * Handles connection management, message routing, and error recovery
 */

class WebSocketClient {
    constructor(config = {}) {
        this.url = config.url || this.getWebSocketUrl();
        this.protocols = config.protocols || [];
        this.reconnectInterval = config.reconnectInterval || 5000;
        this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
        this.messageTimeout = config.messageTimeout || 30000;
        
        this.ws = null;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.messageId = 0;
        this.listeners = new Map();
        
        this.connect();
    }

    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = process.env.NODE_ENV === 'development' 
            ? 'localhost:8080' 
            : window.location.host;
        return `${protocol}//${host}/ws`;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            return;
        }

        try {
            this.ws = new WebSocket(this.url, this.protocols);
            this.setupEventHandlers();
        } catch (error) {
            this.handleError('Connection failed', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = (event) => {
            console.log('WebSocket connected:', event);
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.processMessageQueue();
            this.emit('connected', event);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
                this.emit('error', { type: 'parse_error', error, data: event.data });
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event);
            this.emit('disconnected', event);
            
            if (!event.wasClean && this.shouldReconnect()) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleError('WebSocket error', error);
        };
    }

    handleMessage(message) {
        const { id, type, data, error } = message;

        // Handle response to pending request
        if (id && this.pendingMessages.has(id)) {
            const { resolve, reject, timeout } = this.pendingMessages.get(id);
            clearTimeout(timeout);
            this.pendingMessages.delete(id);

            if (error) {
                reject(new Error(error.message || 'Unknown error'));
            } else {
                resolve(data);
            }
            return;
        }

        // Handle broadcast/push messages
        this.emit(type, data);
    }

    send(type, data = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const message = { id, type, data };

            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
                
                // Set up timeout for response
                const timeout = setTimeout(() => {
                    this.pendingMessages.delete(id);
                    reject(new Error(`Message timeout: ${type}`));
                }, this.messageTimeout);

                this.pendingMessages.set(id, { resolve, reject, timeout });
            } else {
                // Queue message if not connected
                this.messageQueue.push({ message, resolve, reject });
                
                if (!this.isReconnecting) {
                    this.connect();
                }
            }
        });
    }

    // Clustering-specific methods
    async startClustering(data, algorithm = 'ncs') {
        return this.send('clustering:start', { data, algorithm });
    }

    async stopClustering(jobId) {
        return this.send('clustering:stop', { jobId });
    }

    async getClusteringStatus(jobId) {
        return this.send('clustering:status', { jobId });
    }

    // Real-time data streaming
    subscribeToUpdates(jobId) {
        return this.send('clustering:subscribe', { jobId });
    }

    unsubscribeFromUpdates(jobId) {
        return this.send('clustering:unsubscribe', { jobId });
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { message, resolve, reject } = this.messageQueue.shift();
            
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
                
                const timeout = setTimeout(() => {
                    this.pendingMessages.delete(message.id);
                    reject(new Error(`Message timeout: ${message.type}`));
                }, this.messageTimeout);

                this.pendingMessages.set(message.id, { resolve, reject, timeout });
            } else {
                reject(new Error('Connection lost'));
            }
        }
    }

    scheduleReconnect() {
        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    shouldReconnect() {
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }

    handleError(message, error) {
        console.error(message, error);
        this.emit('error', { message, error });
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
        
        // Clear pending messages
        this.pendingMessages.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingMessages.clear();
        
        // Clear message queue
        this.messageQueue.forEach(({ reject }) => {
            reject(new Error('Connection closed'));
        });
        this.messageQueue = [];

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    getConnectionState() {
        if (!this.ws) return 'disconnected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
}

export default WebSocketClient;