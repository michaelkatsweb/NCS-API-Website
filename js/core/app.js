/**
 * Main Application Class
 * Central coordinator for the NCS-API website application
 */

import { CONFIG } from '../config/constants.js';

export class App {
    constructor(options = {}) {
        this.options = {
            debug: false,
            enableRouting: true,
            enableAnalytics: true,
            enablePerformanceMonitoring: true,
            enableErrorTracking: true,
            ...options
        };
        
        // Application state
        this.state = {
            initialized: false,
            currentPage: null,
            theme: 'dark',
            apiConnected: false,
            featuresEnabled: { ...CONFIG.FEATURES },
            user: null,
            performance: {
                startTime: performance.now(),
                loadTime: 0,
                errors: []
            }
        };
        
        // Event system
        this.eventHandlers = new Map();
        this.globalEvents = new Set();
        
        // Component registry
        this.components = new Map();
        this.activeComponents = new Set();
        
        // Route management
        this.routes = new Map();
        this.currentRoute = null;
        this.routeHistory = [];
        
        // Performance monitoring
        this.performanceObserver = null;
        this.errorBoundary = null;
        
        // Feature flags
        this.featureFlags = new Map();
        
        if (this.options.debug) {
            console.log('🚀 NCS App initialized with options:', this.options);
            this.enableDebugMode();
        }
    }

    /**
     * Start the application
     */
    async start() {
        try {
            console.log('🎬 Starting NCS-API application...');
            
            // Initialize core systems
            await this.initializeCore();
            
            // Setup routing
            if (this.options.enableRouting) {
                this.initializeRouting();
            }
            
            // Initialize performance monitoring
            if (this.options.enablePerformanceMonitoring) {
                this.initializePerformanceMonitoring();
            }
            
            // Setup error tracking
            if (this.options.enableErrorTracking) {
                this.initializeErrorTracking();
            }
            
            // Initialize analytics
            if (this.options.enableAnalytics && CONFIG.ENABLE_ANALYTICS) {
                this.initializeAnalytics();
            }
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Initialize feature flags
            this.initializeFeatureFlags();
            
            // Start application lifecycle
            await this.startApplicationLifecycle();
            
            // Mark as initialized
            this.state.initialized = true;
            this.state.performance.loadTime = performance.now() - this.state.performance.startTime;
            
            // Dispatch app ready event
            this.emit('app:ready', {
                loadTime: this.state.performance.loadTime,
                featuresEnabled: this.state.featuresEnabled
            });
            
            console.log(`✅ NCS-API application started in ${this.state.performance.loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Failed to start application:', error);
            this.handleStartupError(error);
            throw error;
        }
    }

    /**
     * Initialize core application systems
     */
    async initializeCore() {
        // Set initial page
        this.state.currentPage = this.getCurrentPageName();
        
        // Initialize theme
        this.initializeTheme();
        
        // Setup viewport management
        this.setupViewport();
        
        // Initialize accessibility features
        this.initializeAccessibility();
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Initialize local storage management
        this.initializeStorage();
    }

    /**
     * Initialize routing system
     */
    initializeRouting() {
        // Define routes
        this.addRoute('/', 'landing');
        this.addRoute('/playground', 'playground');
        this.addRoute('/docs', 'docs');
        this.addRoute('/benchmarks', 'benchmarks');
        this.addRoute('/examples', 'examples');
        
        // Handle initial route
        this.handleRoute(window.location.pathname);
        
        // Listen for navigation events
        window.addEventListener('popstate', (event) => {
            this.handleRoute(window.location.pathname, event.state);
        });
        
        // Intercept internal links
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                event.preventDefault();
                this.navigate(link.href);
            }
        });
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        // Create performance observer
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                this.processPerformanceEntries(entries);
            });
            
            try {
                this.performanceObserver.observe({ 
                    entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
                });
            } catch (error) {
                console.warn('⚠️ Performance Observer not fully supported:', error);
            }
        }
        
        // Monitor Core Web Vitals
        this.initializeCoreWebVitals();
        
        // Setup memory monitoring
        this.setupMemoryMonitoring();
        
        // Track custom metrics
        this.setupCustomMetrics();
    }

    /**
     * Initialize error tracking
     */
    initializeErrorTracking() {
        this.errorBoundary = {
            errors: [],
            maxErrors: 50,
            reportingEnabled: CONFIG.ENABLE_ERROR_TRACKING
        };
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                type: 'javascript',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'promise_rejection',
                promise: event.promise
            });
        });
        
        // Network error monitoring
        this.setupNetworkErrorMonitoring();
    }

    /**
     * Initialize analytics
     */
    initializeAnalytics() {
        if (!CONFIG.ANALYTICS_ID) {
            console.warn('⚠️ Analytics ID not configured');
            return;
        }
        
        // Initialize analytics service (e.g., Google Analytics)
        this.loadAnalyticsScript();
        
        // Track page views
        this.trackPageView();
        
        // Setup custom event tracking
        this.setupAnalyticsEvents();
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEvents() {
        // Theme changes
        this.on('theme:change', (data) => {
            this.state.theme = data.theme;
            this.saveState();
        });
        
        // API connection status
        this.on('api:status', (data) => {
            this.state.apiConnected = data.status === 'connected';
            this.updateUIForAPIStatus(data.status);
        });
        
        // Feature flag updates
        this.on('features:update', (data) => {
            this.updateFeatureFlags(data);
        });
        
        // Performance warnings
        this.on('performance:warning', (data) => {
            this.handlePerformanceWarning(data);
        });
        
        // User interactions
        this.setupUserInteractionTracking();
        
        // Window events
        this.setupWindowEvents();
    }

    /**
     * Initialize feature flags
     */
    initializeFeatureFlags() {
        // Load feature flags from config
        Object.entries(CONFIG.FEATURES).forEach(([feature, enabled]) => {
            this.featureFlags.set(feature, enabled);
        });
        
        // Load user-specific overrides
        const userFlags = this.getStorageItem('feature-flags');
        if (userFlags) {
            Object.entries(userFlags).forEach(([feature, enabled]) => {
                this.featureFlags.set(feature, enabled);
            });
        }
        
        // Apply A/B test flags if applicable
        this.applyABTestFlags();
    }

    /**
     * Start application lifecycle
     */
    async startApplicationLifecycle() {
        // Check for updates
        if (CONFIG.PWA.UPDATE_CHECK_INTERVAL) {
            this.setupUpdateChecks();
        }
        
        // Initialize background tasks
        this.initializeBackgroundTasks();
        
        // Setup periodic maintenance
        this.setupMaintenanceTasks();
        
        // Load user preferences
        await this.loadUserPreferences();
        
        // Initialize components based on current page
        await this.initializePageComponents();
    }

    /**
     * Navigation methods
     */
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }

    navigate(url, state = null) {
        const path = new URL(url, window.location.origin).pathname;
        
        // Update browser history
        window.history.pushState(state, '', url);
        
        // Handle the route
        this.handleRoute(path, state);
        
        // Track navigation
        this.trackEvent('navigation', { path, referrer: this.currentRoute });
    }

    handleRoute(path, state = null) {
        const previousRoute = this.currentRoute;
        this.currentRoute = path;
        
        // Add to history
        this.routeHistory.push({
            path,
            timestamp: Date.now(),
            state
        });
        
        // Limit history size
        if (this.routeHistory.length > 50) {
            this.routeHistory.shift();
        }
        
        // Find matching route
        const handler = this.routes.get(path) || this.routes.get('/');
        
        // Execute route handler
        if (typeof handler === 'string') {
            this.handlePageRoute(handler, previousRoute);
        } else if (typeof handler === 'function') {
            handler(path, state, previousRoute);
        }
        
        // Emit route change event
        this.emit('route:change', {
            path,
            handler,
            previousRoute,
            state
        });
    }

    handlePageRoute(pageName, previousRoute) {
        // Update page state
        this.state.currentPage = pageName;
        
        // Load page-specific components if needed
        this.loadPageComponents(pageName);
        
        // Track page view
        this.trackPageView(pageName);
        
        // Update document title
        this.updateDocumentTitle(pageName);
        
        // Scroll to top unless it's a hash change
        if (!window.location.hash) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    isInternalLink(href) {
        try {
            const url = new URL(href, window.location.origin);
            return url.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    /**
     * Component management
     */
    registerComponent(name, componentClass) {
        this.components.set(name, componentClass);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    async loadPageComponents(pageName) {
        const componentsToLoad = this.getPageComponents(pageName);
        
        for (const componentName of componentsToLoad) {
            if (!this.activeComponents.has(componentName)) {
                await this.initializeComponent(componentName);
            }
        }
    }

    getPageComponents(pageName) {
        const pageComponents = {
            landing: ['Hero', 'FeatureCards', 'QuickDemo'],
            playground: ['Playground', 'DataUploader', 'ClusterVisualizer'],
            docs: ['ApiExplorer', 'CodeGenerator', 'DocumentationTree'],
            benchmarks: ['PerformanceCharts', 'BenchmarkRunner'],
            examples: ['ExampleGallery', 'CodeSnippets']
        };
        
        return pageComponents[pageName] || [];
    }

    async initializeComponent(componentName) {
        try {
            const ComponentClass = this.components.get(componentName);
            if (ComponentClass) {
                const element = document.querySelector(`[data-component="${componentName}"]`);
                if (element) {
                    new ComponentClass(element);
                    this.activeComponents.add(componentName);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Failed to initialize component ${componentName}:`, error);
        }
    }

    /**
     * Event system
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }

    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    emit(event, data = null) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * State management
     */
    getState() {
        return { ...this.state };
    }

    setState(updates) {
        Object.assign(this.state, updates);
        this.emit('state:change', this.state);
        this.saveState();
    }

    saveState() {
        try {
            const stateToSave = {
                theme: this.state.theme,
                featuresEnabled: this.state.featuresEnabled,
                lastVisit: Date.now()
            };
            this.setStorageItem('app-state', stateToSave);
        } catch (error) {
            console.warn('⚠️ Failed to save state:', error);
        }
    }

    loadState() {
        try {
            const savedState = this.getStorageItem('app-state');
            if (savedState) {
                Object.assign(this.state, savedState);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load state:', error);
        }
    }

    /**
     * Feature flag management
     */
    isFeatureEnabled(feature) {
        return this.featureFlags.get(feature) || false;
    }

    enableFeature(feature) {
        this.featureFlags.set(feature, true);
        this.emit('features:update', { [feature]: true });
    }

    disableFeature(feature) {
        this.featureFlags.set(feature, false);
        this.emit('features:update', { [feature]: false });
    }

    /**
     * Utility methods
     */
    getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        if (filename === 'index.html' || filename === '' || path === '/') {
            return 'landing';
        }
        
        return filename.replace('.html', '');
    }

    initializeTheme() {
        const savedTheme = this.getStorageItem('theme') || 'dark';
        this.state.theme = savedTheme;
        document.body.className = `theme-${savedTheme}`;
    }

    setupViewport() {
        // Handle viewport changes
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            // Prevent zoom on input focus for iOS
            viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
        }
    }

    initializeAccessibility() {
        // Setup focus management
        this.setupFocusManagement();
        
        // Initialize screen reader announcements
        this.setupScreenReaderSupport();
        
        // Handle reduced motion preferences
        this.handleReducedMotion();
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.emit('connection:online');
            this.handleConnectionChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.emit('connection:offline');
            this.handleConnectionChange(false);
        });
    }

    handleConnectionChange(isOnline) {
        this.setState({ isOnline });
        
        if (isOnline) {
            // Retry failed requests
            this.retryFailedRequests();
        } else {
            // Switch to offline mode
            this.enterOfflineMode();
        }
    }

    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.trackMetric('memory_usage', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                });
            }, 30000); // Every 30 seconds
        }
    }

    trackEvent(name, data = {}) {
        if (this.options.enableAnalytics && window.gtag) {
            window.gtag('event', name, data);
        }
        
        // Internal tracking
        this.emit('analytics:event', { name, data });
    }

    trackMetric(name, value) {
        if (window.NCS?.performance) {
            window.NCS.performance.trackMetric(name, value);
        }
    }

    handleError(error, context = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...context
        };
        
        // Add to error boundary
        this.errorBoundary.errors.push(errorInfo);
        
        // Limit error storage
        if (this.errorBoundary.errors.length > this.errorBoundary.maxErrors) {
            this.errorBoundary.errors.shift();
        }
        
        // Emit error event
        this.emit('error', errorInfo);
        
        // Report to external service if enabled
        if (this.errorBoundary.reportingEnabled) {
            this.reportError(errorInfo);
        }
    }

    handleStartupError(error) {
        document.body.innerHTML = `
            <div class="startup-error">
                <h1>Application Failed to Start</h1>
                <p>We're sorry, but the application encountered an error during startup.</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    enableDebugMode() {
        window.NCS_DEBUG = {
            app: this,
            state: () => this.getState(),
            components: () => Array.from(this.activeComponents),
            routes: () => this.routeHistory.slice(-10),
            errors: () => this.errorBoundary.errors.slice(-10),
            featureFlags: () => Object.fromEntries(this.featureFlags),
            performance: () => window.NCS?.performance?.getStats()
        };
        
        console.log('🔧 Debug mode enabled. Access via window.NCS_DEBUG');
    }

    /**
     * Storage helpers
     */
    getStorageItem(key) {
        try {
            const item = localStorage.getItem(`ncs-${key}`);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    }

    setStorageItem(key, value) {
        try {
            localStorage.setItem(`ncs-${key}`, JSON.stringify(value));
        } catch (error) {
            console.warn(`⚠️ Failed to save to localStorage: ${key}`, error);
        }
    }

    /**
     * Cleanup and destruction
     */
    destroy() {
        // Remove event listeners
        this.eventHandlers.clear();
        
        // Cleanup performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Cleanup components
        this.activeComponents.clear();
        this.components.clear();
        
        // Clear debug mode
        if (window.NCS_DEBUG) {
            delete window.NCS_DEBUG;
        }
        
        console.log('🗑️ App destroyed');
    }
}