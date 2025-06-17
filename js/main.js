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
import { APIClient } from './api/client.js';
import { WebSocketManager } from './api/websocket.js';
import { PerformanceMonitor } from './utils/performance.js';
import { CONFIG } from './config/constants.js';

// Global application state
window.NCS = {
    version: '2.1.0',
    buildDate: '2025-06-17',
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
        
        // HTTP API Client
        window.NCS.api = new APIClient({
            baseURL: CONFIG.API_BASE_URL,
            timeout: CONFIG.API_TIMEOUT,
            retries: 3,
            debug: window.NCS.debug
        });
        
        // Test API connection
        try {
            const healthCheck = await window.NCS.api.get('/health');
            if (healthCheck.status === 'online') {
                this.updateAPIStatus('online');
                console.log('✅ API connection established');
            }
        } catch (error) {
            console.warn('⚠️ API health check failed:', error);
            this.updateAPIStatus('offline');
        }
        
        this.updateLoadingStatus(this.initializationSteps[2]);
        
        // WebSocket connection
        if (CONFIG.ENABLE_WEBSOCKET) {
            window.NCS.ws = new WebSocketManager({
                url: CONFIG.WEBSOCKET_URL,
                reconnectAttempts: 5,
                reconnectDelay: 2000,
                debug: window.NCS.debug
            });
            
            // WebSocket event listeners
            window.NCS.ws.on('connected', () => {
                console.log('🔌 WebSocket connected');
                this.updateAPIStatus('online');
            });
            
            window.NCS.ws.on('disconnected', () => {
                console.log('🔌 WebSocket disconnected');
                this.updateAPIStatus('degraded');
            });
            
            window.NCS.ws.on('clustering-update', (data) => {
                // Handle real-time clustering updates
                this.handleClusteringUpdate(data);
            });
            
            // Attempt connection
            try {
                await window.NCS.ws.connect();
            } catch (error) {
                console.warn('⚠️ WebSocket connection failed:', error);
            }
        }
        
        await this.delay(300);
    }

    /**
     * Initialize UI components
     */
    async initializeUI() {
        this.updateLoadingStatus(this.initializationSteps[3]);
        
        // Dynamic imports for better performance
        const componentModules = await Promise.all([
            import('./components/Header.js'),
            import('./components/Hero.js'),
            import('./components/ThemeToggle.js'),
            import('./components/Toast.js')
        ]);
        
        // Initialize global UI components
        this.initializeGlobalComponents(componentModules);
        
        // Initialize page-specific components based on current page
        await this.initializePageComponents();
        
        await this.delay(200);
    }

    /**
     * Start the main application
     */
    async startApplication() {
        this.updateLoadingStatus(this.initializationSteps[4]);
        
        // Initialize main App class
        window.NCS.app = new App({
            debug: window.NCS.debug,
            enableRouting: true,
            enableAnalytics: !window.NCS.debug
        });
        
        // Start the application
        await window.NCS.app.start();
        
        this.updateLoadingStatus(this.initializationSteps[5]);
        await this.delay(200);
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('ncs-theme') || 'dark';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
        
        document.body.className = `theme-${theme}`;
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('ncs-theme') === 'auto') {
                document.body.className = `theme-${e.matches ? 'dark' : 'light'}`;
            }
        });
        
        console.log(`🎨 Theme initialized: ${theme}`);
    }

    /**
     * Initialize global UI components
     */
    initializeGlobalComponents(modules) {
        const [HeaderModule, HeroModule, ThemeToggleModule, ToastModule] = modules;
        
        // Header component
        const headerElement = document.getElementById('header');
        if (headerElement) {
            new HeaderModule.Header(headerElement);
        }
        
        // Hero component (only on landing page)
        const heroElement = document.getElementById('hero');
        if (heroElement) {
            new HeroModule.Hero(heroElement);
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            new ThemeToggleModule.ThemeToggle(themeToggle);
        }
        
        // Toast notification system
        window.NCS.toast = new ToastModule.Toast();
    }

    /**
     * Initialize page-specific components
     */
    async initializePageComponents() {
        const currentPage = this.getCurrentPage();
        
        try {
            switch (currentPage) {
                case 'landing':
                    const landingModule = await import('../pages/landing.js');
                    new landingModule.LandingPage();
                    break;
                    
                case 'playground':
                    const playgroundModule = await import('../pages/playground.js');
                    new playgroundModule.PlaygroundPage();
                    break;
                    
                case 'docs':
                    const docsModule = await import('../pages/docs.js');
                    new docsModule.DocsPage();
                    break;
                    
                case 'benchmarks':
                    const benchmarksModule = await import('../pages/benchmarks.js');
                    new benchmarksModule.BenchmarksPage();
                    break;
                    
                case 'examples':
                    const examplesModule = await import('../pages/examples.js');
                    new examplesModule.ExamplesPage();
                    break;
                    
                default:
                    console.log('📄 Generic page initialization');
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load page component for ${currentPage}:`, error);
        }
    }

    /**
     * Get current page identifier
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        if (filename === 'index.html' || filename === '' || filename === '/') {
            return 'landing';
        }
        
        return filename.replace('.html', '');
    }

    /**
     * Update loading status
     */
    updateLoadingStatus(status) {
        const statusText = this.loadingOverlay?.querySelector('p');
        if (statusText) {
            statusText.textContent = status;
        }
        console.log(`📦 ${status}`);
        this.currentStep++;
    }

    /**
     * Update API status indicator
     */
    updateAPIStatus(status) {
        const statusElement = document.getElementById('api-status');
        if (!statusElement) return;
        
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('.status-text');
        
        // Remove existing status classes
        indicator.classList.remove('status-online', 'status-degraded', 'status-offline');
        
        switch (status) {
            case 'online':
                indicator.classList.add('status-online');
                text.textContent = 'API Online';
                break;
            case 'degraded':
                indicator.classList.add('status-degraded');
                text.textContent = 'API Degraded';
                break;
            case 'offline':
                indicator.classList.add('status-offline');
                text.textContent = 'API Offline';
                break;
        }
    }

    /**
     * Handle real-time clustering updates
     */
    handleClusteringUpdate(data) {
        // Broadcast to interested components
        window.dispatchEvent(new CustomEvent('clustering-update', {
            detail: data
        }));
    }

    /**
     * Hide loading overlay with animation
     */
    async hideLoadingOverlay() {
        if (!this.loadingOverlay) return;
        
        // Minimum loading time for smooth UX
        const minLoadTime = 2000;
        const currentTime = performance.now() - this.startTime;
        
        if (currentTime < minLoadTime) {
            await this.delay(minLoadTime - currentTime);
        }
        
        this.loadingOverlay.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.loadingOverlay && this.loadingOverlay.parentNode) {
                this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
            }
        }, 500);
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Initialization Failed</h2>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Track initialization metrics
     */
    trackInitialization(initTime) {
        if (window.NCS.performance) {
            window.NCS.performance.trackMetric('app_init_time', initTime);
            window.NCS.performance.trackEvent('app_initialized', {
                time: initTime,
                version: window.NCS.version,
                debug: window.NCS.debug
            });
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
 * Global error handling
 */
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
    
    if (window.NCS.performance) {
        window.NCS.performance.trackError(event.error, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
    
    if (window.NCS.performance) {
        window.NCS.performance.trackError(event.reason, {
            type: 'unhandled_promise_rejection'
        });
    }
});

/**
 * Performance monitoring
 */
window.addEventListener('load', () => {
    // Core Web Vitals
    if (window.NCS.performance) {
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            window.NCS.performance.trackMetric('lcp', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            window.NCS.performance.trackMetric('fid', firstInput.processingStart - firstInput.startTime);
        }).observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            window.NCS.performance.trackMetric('cls', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
    }
});

/**
 * Initialize application when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ApplicationBootstrap().init();
    });
} else {
    // DOM already ready
    new ApplicationBootstrap().init();
}

/**
 * Export for module access
 */
export { ApplicationBootstrap };