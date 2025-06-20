/**
 * NCS-API Website - Main Application Entry Point
 * High-performance vanilla JavaScript SPA
 * 
 * Features:
 * - Module-based architecture
 * - Theme management
 * - Performance monitoring
 * - API integration
 * - Real-time clustering visualization
 */

import { App } from './core/app.js';
import { ApiClient } from './api/client.js';
import { WebSocketManager } from './api/websocket.js';
import { PerformanceMonitor } from './utils/performance.js';
import { CONFIG } from './config/constants.js';

// Global application state
window.NCS = {
    version: '2.1.0',
    buildDate: '2025-06-19',
    config: CONFIG,
    performance: null,
    api: null,
    ws: null,
    app: null,
    debug: false
};

/**
 * Application initialization
 */
class ApplicationBootstrap {
    constructor() {
        this.startTime = performance.now();
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.initializationSteps = [
            'Loading configuration',
            'Initializing API client',
            'Setting up WebSocket connection',
            'Loading UI components',
            'Starting performance monitoring',
            'Rendering application'
        ];
        this.currentStep = 0;
    }

    /**
     * Main initialization method
     */
    async init() {
        try {
            console.log('🚀 NCS-API Website starting...');
            
            // Enable debug mode in development
            if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                window.NCS.debug = true;
                console.log('🔧 Debug mode enabled');
            }

            // Update loading status
            this.updateLoadingStatus('Initializing application...');

            // Initialize core systems
            await this.initializeCore();
            
            // Initialize API connections
            await this.initializeAPI();
            
            // Load and initialize UI components
            await this.initializeUI();
            
            // Start the main application
            await this.startApplication();
            
            // Hide loading overlay
            await this.hideLoadingOverlay();
            
            // Performance metrics
            const initTime = performance.now() - this.startTime;
            console.log(`✅ Application initialized in ${initTime.toFixed(2)}ms`);
            
            // Analytics
            this.trackInitialization(initTime);
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showErrorState(error);
        }
    }

    /**
     * Initialize core systems
     */
    async initializeCore() {
        this.updateLoadingStatus(this.initializationSteps[0]);
        
        // Performance monitoring
        window.NCS.performance = new PerformanceMonitor({
            enableMetrics: true,
            enableProfiling: window.NCS.debug,
            reportInterval: 30000 // 30 seconds
        });
        
        // Theme initialization
        this.initializeTheme();
        
        // Service Worker registration
        if ('serviceWorker' in navigator && !window.NCS.debug) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('🔄 Service Worker registered');
            } catch (error) {
                console.warn('⚠️ Service Worker registration failed:', error);
            }
        }
        
        await this.delay(200);
    }

    /**
     * Initialize API connections
     */
    async initializeAPI() {
        this.updateLoadingStatus(this.initializationSteps[1]);
        
        try {
            // Initialize HTTP API client
            window.NCS.api = new ApiClient({
                baseURL: CONFIG.API.BASE_URL,
                timeout: CONFIG.API.TIMEOUT
            });
            
            // Test API connection
            try {
                await window.NCS.api.healthCheck();
                console.log('🌐 API connection established');
            } catch (error) {
                console.warn('⚠️ API connection failed, continuing offline:', error);
            }
            
            await this.delay(300);
            
            // Initialize WebSocket connection
            this.updateLoadingStatus(this.initializationSteps[2]);
            
            window.NCS.ws = new WebSocketManager({
                url: CONFIG.API.WS_URL,
                enableLogging: window.NCS.debug
            });
            
            // Attempt WebSocket connection (non-blocking)
            window.NCS.ws.connect().catch(error => {
                console.warn('⚠️ WebSocket connection failed, continuing without real-time features:', error);
            });
            
        } catch (error) {
            console.warn('⚠️ API initialization failed:', error);
        }
        
        await this.delay(200);
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        this.updateLoadingStatus(this.initializationSteps[3]);
        
        // Initialize main application
        window.NCS.app = new App({
            debug: window.NCS.debug,
            enableRouting: true,
            enableAnalytics: true,
            enablePerformanceMonitoring: true,
            enableErrorTracking: true
        });
        
        await this.delay(200);
    }

    /**
     * Start the main application
     */
    async startApplication() {
        this.updateLoadingStatus(this.initializationSteps[4]);
        
        // Start the main application
        await window.NCS.app.start();
        
        // Start performance monitoring
        this.updateLoadingStatus(this.initializationSteps[5]);
        
        await this.delay(100);
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem(CONFIG.STORAGE.THEME_PREFERENCE);
        const systemPrefersDark = window.matchMedia && 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme = savedTheme || 'auto';
        if (theme === 'auto') {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        // Apply theme immediately to prevent flash
        document.body.classList.add(`theme-${theme}`);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#111827' : '#ffffff';
        }
    }

    /**
     * Update loading status
     */
    updateLoadingStatus(message) {
        console.log(`📋 ${message}`);
        
        if (this.loadingOverlay) {
            const statusElement = this.loadingOverlay.querySelector('.loading-status');
            if (statusElement) {
                statusElement.textContent = message;
            }
            
            // Update progress
            this.currentStep++;
            const progress = Math.min(100, (this.currentStep / this.initializationSteps.length) * 100);
            const progressBar = this.loadingOverlay.querySelector('.progress-fill');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }
    }

    /**
     * Hide loading overlay with animation
     */
    async hideLoadingOverlay() {
        if (!this.loadingOverlay) return;
        
        // Update final status
        this.updateLoadingStatus('Application ready!');
        
        // Wait a moment
        await this.delay(500);
        
        // Fade out animation
        this.loadingOverlay.style.opacity = '0';
        this.loadingOverlay.style.transition = 'opacity 0.5s ease-out';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
                // Don't remove completely in case we need to show errors
            }
        }, 500);
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        console.error('Application startup error:', error);
        
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Application Failed to Start</h2>
                    <p>We're sorry, but the application encountered an error during startup.</p>
                    <details class="error-details">
                        <summary>Technical Details</summary>
                        <pre>${error.message}</pre>
                        ${error.stack ? `<pre class="error-stack">${error.stack}</pre>` : ''}
                    </details>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="btn btn-primary">
                            Reload Page
                        </button>
                        <button onclick="localStorage.clear(); window.location.reload()" class="btn btn-secondary">
                            Clear Data & Reload
                        </button>
                    </div>
                </div>
                <style>
                    .error-state {
                        text-align: center;
                        padding: 2rem;
                        max-width: 500px;
                        margin: 0 auto;
                        color: var(--color-text-primary, #1f2937);
                    }
                    .error-icon {
                        font-size: 4rem;
                        margin-bottom: 1rem;
                    }
                    .error-state h2 {
                        color: var(--color-error-500, #ef4444);
                        margin-bottom: 1rem;
                    }
                    .error-state p {
                        margin-bottom: 1.5rem;
                        color: var(--color-text-secondary, #6b7280);
                    }
                    .error-details {
                        text-align: left;
                        margin-bottom: 1.5rem;
                        background: var(--color-background-muted, #f9fafb);
                        border-radius: 8px;
                        padding: 1rem;
                    }
                    .error-details pre {
                        white-space: pre-wrap;
                        word-break: break-word;
                        font-size: 0.875rem;
                        color: var(--color-error-600, #dc2626);
                    }
                    .error-stack {
                        margin-top: 0.5rem;
                        color: var(--color-text-tertiary, #9ca3af);
                        font-size: 0.75rem;
                    }
                    .error-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    .btn {
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        border: none;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .btn-primary {
                        background: var(--color-primary-500, #6366f1);
                        color: white;
                    }
                    .btn-primary:hover {
                        background: var(--color-primary-600, #4f46e5);
                    }
                    .btn-secondary {
                        background: var(--color-background-secondary, #e5e7eb);
                        color: var(--color-text-primary, #1f2937);
                    }
                    .btn-secondary:hover {
                        background: var(--color-background-tertiary, #d1d5db);
                    }
                </style>
            `;
            
            this.loadingOverlay.style.opacity = '1';
            this.loadingOverlay.style.display = 'flex';
        }
        
        // Track error for analytics
        if (window.NCS && window.NCS.performance) {
            window.NCS.performance.trackError({
                type: 'startup',
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Track initialization for analytics
     */
    trackInitialization(initTime) {
        if (window.NCS && window.NCS.performance) {
            window.NCS.performance.mark('app-initialized');
            
            // Custom initialization metrics
            const metrics = {
                initTime,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                } : null
            };
            
            // Emit initialization complete event
            if (window.NCS.eventBus) {
                window.NCS.eventBus.emit('app:initialization-complete', metrics);
            }
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Application startup
 */
async function startApplication() {
    try {
        // Check for minimum browser requirements
        if (!checkBrowserSupport()) {
            showBrowserUnsupportedMessage();
            return;
        }
        
        // Initialize application
        const bootstrap = new ApplicationBootstrap();
        await bootstrap.init();
        
    } catch (error) {
        console.error('Critical startup error:', error);
        
        // Show fallback error message
        const fallbackError = document.createElement('div');
        fallbackError.innerHTML = `
            <div style="text-align: center; padding: 2rem; font-family: system-ui, sans-serif;">
                <h1 style="color: #dc2626;">Application Error</h1>
                <p>Unable to start the application. Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()" style="background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(fallbackError);
    }
}

/**
 * Check browser support for required features
 */
function checkBrowserSupport() {
    const requiredFeatures = [
        'fetch',
        'Promise',
        'Map',
        'Set',
        'localStorage',
        'addEventListener'
    ];
    
    for (const feature of requiredFeatures) {
        if (!(feature in window)) {
            console.error(`Required feature not supported: ${feature}`);
            return false;
        }
    }
    
    // Check for ES6 module support
    if (!('import' in HTMLScriptElement.prototype)) {
        console.error('ES6 modules not supported');
        return false;
    }
    
    return true;
}

/**
 * Show browser unsupported message
 */
function showBrowserUnsupportedMessage() {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 2rem; font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto;">
            <h1 style="color: #dc2626;">Browser Not Supported</h1>
            <p>Your browser doesn't support the features required to run this application.</p>
            <p>Please use a modern browser such as:</p>
            <ul style="text-align: left; display: inline-block;">
                <li>Chrome 80+</li>
                <li>Firefox 75+</li>
                <li>Safari 13+</li>
                <li>Edge 80+</li>
            </ul>
            <p><a href="https://browsehappy.com/" target="_blank" style="color: #6366f1;">Update your browser</a> for the best experience.</p>
        </div>
    `;
}

/**
 * Start when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
} else {
    startApplication();
}

// Global error handlers for development
if (window.NCS && window.NCS.debug) {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
    });
}

// Export for manual initialization if needed
export { ApplicationBootstrap, startApplication };