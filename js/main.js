/**
 * FILE: js/main.js
 * NCS-API Website - Main Application Entry Point
 * Modern ES6 module-based application bootstrap
 */

import landing from './pages/landing.js';
import playground from './pages/playground.js';
import docs from './pages/docs.js';
import benchmarks from './pages/benchmarks.js';
import examples from './pages/examples.js';

// Create a page module map
const pageModules = {
    landing,
    playground,
    docs,
    benchmarks,
    examples
};

// Replace the dynamic import section with:
try {
    const pageModule = pageModules[page];
    
    if (pageModule && typeof pageModule.init === 'function') {
        await pageModule.init();
        console.log(`📄 Page module initialized: ${page}`);
    } else {
        console.log(`📄 Page module not found or no init function: ${page}`);  
    }
} catch (importError) {
    console.log(`📄 Error initializing page module: ${page}`, importError);
}

// Import components (lazy loaded as needed - with graceful fallbacks)
const componentModules = {
    'Header': () => import('./components/Header.js').catch(() => null),
    'Hero': () => import('./components/Hero.js').catch(() => null),
    'Playground': () => import('./components/Playground.js').catch(() => null),
    'DataUploader': () => import('./components/DataUploader.js').catch(() => null),
    'ClusterVisualizer': () => import('./components/ClusterVisualizer.js').catch(() => null),
    'ThemeToggle': () => import('./components/ThemeToggle.js').catch(() => null),
    'PerformanceMonitor': () => import('./components/PerformanceMonitor.js').catch(() => null)
};

// Global application namespace
window.NCS = {
    version: '1.0.0',
    debug: false,
    startTime: performance.now(),
    components: new Map(),
    state: null,
    router: null,
    eventBus: null,
    apiClient: null
};

/**
 * Main Application Class
 * Manages the entire application lifecycle
 */
class NCSApplication {
    constructor() {
        this.initialized = false;
        this.loadingStates = new Map();
        this.currentPage = null;
        this.components = new Map();
        
        // Enable debug mode in development
        this.enableDebugMode();
        
        // Core initialization will happen in start() method
        console.log('🏗️ NCS Application created');
    }

    /**
     * Enable debug mode for development
     */
    enableDebugMode() {
        const isDevelopment = location.hostname === 'localhost' || 
                             location.hostname === '127.0.0.1' ||
                             location.search.includes('debug=true');
                             
        if (isDevelopment) {
            window.NCS.debug = true;
            console.log('🔧 Debug mode enabled');
            
            // Add development helpers to window
            window.NCS.app = this;
            window.NCS.components = this.components;
        }
    }

    /**
     * Initialize core application systems
     */
    async initializeCore() {
        try {
            // Load core modules with fallbacks
            const coreModules = await this.loadCoreModules();
            
            // Initialize event bus
            window.NCS.eventBus = new coreModules.EventBus();
            
            // Initialize state management
            window.NCS.state = new coreModules.StateManager({
                theme: 'auto',
                page: this.getCurrentPage(),
                loading: true,
                apiConnected: false,
                performance: {
                    startTime: window.NCS.startTime,
                    loadTime: null,
                    componentsLoaded: 0
                }
            });

            // Initialize router
            window.NCS.router = new coreModules.Router({
                routes: {
                    '/': 'landing',
                    '/playground': 'playground', 
                    '/playground.html': 'playground',
                    '/docs': 'docs',
                    '/docs.html': 'docs',
                    '/benchmarks': 'benchmarks',
                    '/benchmarks.html': 'benchmarks',
                    '/examples': 'examples',
                    '/examples.html': 'examples'
                },
                onRouteChange: this.handleRouteChange.bind(this)
            });

            // Initialize API client
            window.NCS.apiClient = new coreModules.NCSApiClient({
                baseURL: this.getApiBaseUrl(),
                timeout: 30000,
                onStatusChange: this.handleApiStatusChange.bind(this)
            });

            console.log('🏗️ Core systems initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize core systems:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Load core modules with fallback implementations
     */
    async loadCoreModules() {
        // Fallback EventBus
        const FallbackEventBus = class {
            constructor() { this.events = new Map(); }
            on(event, handler) { 
                if (!this.events.has(event)) this.events.set(event, []);
                this.events.get(event).push(handler);
            }
            off(event, handler) {
                const handlers = this.events.get(event);
                if (handlers) {
                    const index = handlers.indexOf(handler);
                    if (index > -1) handlers.splice(index, 1);
                }
            }
            emit(event, data) {
                const handlers = this.events.get(event);
                if (handlers) handlers.forEach(handler => {
                    try { handler(data); } catch (e) { console.error('Event handler error:', e); }
                });
            }
        };

        // Fallback Router
        const FallbackRouter = class {
            constructor(options = {}) {
                this.routes = options.routes || {};
                this.onRouteChange = options.onRouteChange || (() => {});
            }
            navigate(path) { window.location.href = path; }
        };

        // Fallback StateManager
        const FallbackStateManager = class {
            constructor(initialState = {}) { this.state = initialState; }
            get(key) { 
                return key.includes('.') ? this.getNestedValue(key) : this.state[key]; 
            }
            set(key, value) { 
                if (key.includes('.')) this.setNestedValue(key, value);
                else this.state[key] = value;
            }
            getNestedValue(path) {
                return path.split('.').reduce((obj, key) => obj?.[key], this.state);
            }
            setNestedValue(path, value) {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const target = keys.reduce((obj, key) => {
                    if (!obj[key]) obj[key] = {};
                    return obj[key];
                }, this.state);
                target[lastKey] = value;
            }
        };

        // Fallback API Client
        const FallbackApiClient = class {
            constructor(options = {}) { 
                this.baseURL = options.baseURL || '';
                console.log('🔌 Using fallback API client');
            }
            async healthCheck() { 
                console.log('⚠️ API client not implemented yet');
                throw new Error('API not available - using fallback');
            }
        };

        // Try to load real modules, fall back to implementations
        const modules = {};

        try {
            const eventBusModule = await import('./core/eventBusNew.js');
            modules.EventBus = eventBusModule.EventBus;
            console.log('✅ EventBus module loaded');
        } catch (error) {
            console.log('📦 Using fallback EventBus');
            modules.EventBus = FallbackEventBus;
        }

        try {
            const routerModule = await import('./core/router.js');
            modules.Router = routerModule.Router;
            console.log('✅ Router module loaded');
        } catch (error) {
            console.log('📦 Using fallback Router');
            modules.Router = FallbackRouter;
        }

        try {
            const stateModule = await import('./core/state.js');
            modules.StateManager = stateModule.StateManager;
            console.log('✅ StateManager module loaded');
        } catch (error) {
            console.log('📦 Using fallback StateManager');
            modules.StateManager = FallbackStateManager;
        }

        try {
            const apiModule = await import('./api/client.js');
            modules.NCSApiClient = apiModule.NCSApiClient || apiModule.default;
            console.log('✅ NCSApiClient module loaded');
        } catch (error) {
            console.log('📦 Using fallback API client');
            modules.NCSApiClient = FallbackApiClient;
        }

        return modules;
    }

    /**
     * Main application startup
     */
    async start() {
        try {
            console.log('🚀 Starting NCS-API Website...');
            
            // Show loading state
            this.showLoadingState('Initializing application...');

            // Initialize core systems first
            await this.initializeCore();

            // Initialize theme system (prevent flash)
            await this.initializeTheme();
            
            // Load critical components
            await this.loadCriticalComponents();
            
            // Initialize current page
            await this.initializePage();
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Connect to API
            await this.connectToApi();
            
            // Mark as initialized
            this.initialized = true;
            window.NCS.state.set('loading', false);
            
            // Calculate load time
            const loadTime = performance.now() - window.NCS.startTime;
            window.NCS.state.set('performance.loadTime', loadTime);
            
            // Hide loading state
            this.hideLoadingState();
            
            // Emit ready event
            window.NCS.eventBus.emit('app:ready', {
                loadTime,
                page: this.currentPage,
                apiConnected: window.NCS.state.get('apiConnected')
            });
            
            console.log(`✅ Application started successfully in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Application startup failed:', error);
            this.handleStartupError(error);
        }
    }

    /**
     * Initialize theme system
     */
    async initializeTheme() {
        try {
            // Get saved theme preference or detect system preference
            let theme = 'auto';
            try {
                theme = localStorage.getItem('ncs-theme') || 'auto';
            } catch (e) {
                console.warn('localStorage not available, using auto theme');
            }

            // Auto-detect if needed
            if (theme === 'auto') {
                const prefersDark = window.matchMedia && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                theme = prefersDark ? 'dark' : 'light';
            }

            // Apply theme immediately to prevent flash
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${theme}`);
            
            // Update state
            window.NCS.state.set('theme', theme);
            
            // Update meta theme-color
            this.updateMetaThemeColor(theme);
            
            console.log(`🎨 Theme initialized: ${theme}`);
            
        } catch (error) {
            console.error('❌ Theme initialization failed:', error);
            // Fallback to light theme
            document.documentElement.classList.add('theme-light');
        }
    }

    /**
     * Load critical components that should be available immediately
     */
    async loadCriticalComponents() {
        const criticalComponents = ['Header', 'ThemeToggle'];
        
        for (const componentName of criticalComponents) {
            try {
                const component = await this.loadComponent(componentName);
                if (component) {
                    console.log(`✅ Critical component loaded: ${componentName}`);
                } else {
                    console.log(`📦 Critical component not yet implemented: ${componentName}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load critical component ${componentName}:`, error);
                // Continue with other components - critical components are optional during development
            }
        }
    }

    /**
     * Initialize the current page
     */
    async initializePage() {
        const page = this.getCurrentPage();
        this.currentPage = page;
        
        console.log(`📄 Initializing page: ${page}`);
        
        // Load page-specific components
        const pageComponents = this.getPageComponents(page);
        
        for (const componentName of pageComponents) {
            try {
                await this.loadComponent(componentName);
            } catch (error) {
                console.error(`Failed to load page component ${componentName}:`, error);
            }
        }
        
        // Initialize page-specific functionality
        await this.initializePageSpecific(page);
        
        // Update document title
        this.updateDocumentTitle(page);
    }

    /**
     * Load a component dynamically
     */
    async loadComponent(name) {
        if (this.components.has(name)) {
            return this.components.get(name);
        }

        try {
            console.log(`📦 Loading component: ${name}`);
            
            const moduleLoader = componentModules[name];
            if (!moduleLoader) {
                console.warn(`⚠️ Component module loader not found: ${name}`);
                return null;
            }

            const module = await moduleLoader();
            if (!module) {
                console.log(`📦 Component module not yet implemented: ${name}`);
                return null;
            }
            
            const ComponentClass = module[name] || module.default;
            
            if (!ComponentClass) {
                console.warn(`⚠️ Component class not found in module: ${name}`);
                return null;
            }

            // Find component container
            const container = document.querySelector(`[data-component="${name.toLowerCase()}"]`) ||
                            document.querySelector(`.${name.toLowerCase()}-container`) ||
                            document.querySelector(`#${name.toLowerCase()}`);

            let componentInstance;
            if (container) {
                // Initialize component with container
                componentInstance = new ComponentClass(container);
            } else {
                // Some components don't need containers (e.g., global ones)
                componentInstance = new ComponentClass();
            }

            this.components.set(name, componentInstance);
            window.NCS.components.set(name, componentInstance);
            
            // Update performance counter
            const currentCount = window.NCS.state.get('performance.componentsLoaded') || 0;
            window.NCS.state.set('performance.componentsLoaded', currentCount + 1);
            
            console.log(`✅ Component loaded: ${name}`);
            return componentInstance;
            
        } catch (error) {
            console.warn(`⚠️ Failed to load component ${name}:`, error);
            // Return null instead of throwing - components are optional during development
            return null;
        }
    }

    /**
     * Get components needed for a specific page
     */
    getPageComponents(page) {
        const componentMap = {
            'landing': ['Hero'],
            'playground': ['Playground', 'DataUploader', 'ClusterVisualizer'],
            'docs': ['ApiExplorer'],
            'benchmarks': ['PerformanceMonitor'],
            'examples': ['ClusterVisualizer']
        };
        
        return componentMap[page] || [];
    }

    /**
     * Initialize page-specific functionality
     */
    async initializePageSpecific(page) {
        try {
            // Check if page-specific modules exist and load them dynamically
            const pageModulePaths = {
                'landing': '../pages/landing.js',
                'playground': '../pages/playground.js',
                'docs': '../pages/docs.js',
                'benchmarks': '../pages/benchmarks.js',
                'examples': '../pages/examples.js'
            };

            const modulePath = pageModulePaths[page];
if (modulePath) {
    try {
        const module = await import(/* @vite-ignore */ modulePath);
        const initFunction = module.init || module.default;
       
        if (typeof initFunction === 'function') {
            await initFunction();
            console.log(`✅ Page-specific initialization completed: ${page}`);
        } else {
            console.log(`📄 Page module loaded but no init function found: ${page}`);
        }
    } catch (importError) {
        // Page module doesn't exist yet - this is fine
        console.log(`📄 No page-specific module for: ${page} (will be created later)`);
    }
} else {
    console.log(`📄 Page-specific functionality not required for: ${page}`);
}
            
        } catch (error) {
            console.warn(`⚠️ Error during page-specific initialization for ${page}:`, error);
            // Continue execution - page modules are optional
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEvents() {
        // Handle theme changes
        window.NCS.eventBus.on('theme:change', this.handleThemeChange.bind(this));
        
        // Handle navigation
        window.NCS.eventBus.on('navigation:navigate', this.handleNavigation.bind(this));
        
        // Handle API events
        window.NCS.eventBus.on('api:connected', () => {
            window.NCS.state.set('apiConnected', true);
        });
        
        window.NCS.eventBus.on('api:disconnected', () => {
            window.NCS.state.set('apiConnected', false);
        });
        
        // Handle errors
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle offline/online
        window.addEventListener('online', () => {
            window.NCS.eventBus.emit('app:online');
        });
        
        window.addEventListener('offline', () => {
            window.NCS.eventBus.emit('app:offline');
        });
        
        console.log('🎯 Global event listeners setup');
    }

    /**
     * Connect to API
     */
    async connectToApi() {
        try {
            console.log('🔌 Connecting to NCS API...');
            
            // Test API connection
            await window.NCS.apiClient.healthCheck();
            
            window.NCS.state.set('apiConnected', true);
            window.NCS.eventBus.emit('api:connected');
            
            console.log('✅ API connection established');
            
        } catch (error) {
            console.warn('⚠️ API connection failed, running in offline mode:', error);
            window.NCS.state.set('apiConnected', false);
            window.NCS.eventBus.emit('api:disconnected', error);
        }
    }

    /**
     * Get current page name
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const page = window.location.pathname.split('/').pop() || 'index.html';
        
        if (path === '/' || page === 'index.html') return 'landing';
        if (page === 'playground.html') return 'playground';
        if (page === 'docs.html') return 'docs';
        if (page === 'benchmarks.html') return 'benchmarks';
        if (page === 'examples.html') return 'examples';
        
        return 'landing';
    }

    /**
     * Get API base URL
     */
    getApiBaseUrl() {
        // Check for environment-specific API URLs
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000/api/v1';
        }
        
        if (hostname.includes('staging')) {
            return 'https://staging-api.ncs-clustering.com/v1';
        }
        
        return 'https://api.ncs-clustering.com/v1';
    }

    /**
     * Event Handlers
     */
    handleThemeChange(theme) {
        try {
            document.documentElement.classList.remove('theme-light', 'theme-dark');
            document.documentElement.classList.add(`theme-${theme}`);
            
            window.NCS.state.set('theme', theme);
            this.updateMetaThemeColor(theme);
            
            // Save preference
            try {
                localStorage.setItem('ncs-theme', theme);
            } catch (e) {
                console.warn('Failed to save theme preference');
            }
            
            console.log(`🎨 Theme changed to: ${theme}`);
            
        } catch (error) {
            console.error('Failed to change theme:', error);
        }
    }

    handleNavigation(data) {
        if (data.external) {
            window.open(data.url, '_blank');
        } else {
            window.NCS.router.navigate(data.url);
        }
    }

    handleRouteChange(route) {
        // This will be called by the router when routes change
        console.log(`🧭 Route changed to: ${route}`);
    }

    handleApiStatusChange(status) {
        window.NCS.state.set('apiConnected', status === 'online');
        window.NCS.eventBus.emit(`api:${status}`);
    }

    handleGlobalError(event) {
        console.error('🚨 Global error:', event.error);
        window.NCS.eventBus.emit('app:error', {
            type: 'javascript',
            error: event.error,
            filename: event.filename,
            lineno: event.lineno
        });
    }

    handleUnhandledRejection(event) {
        console.error('🚨 Unhandled promise rejection:', event.reason);
        window.NCS.eventBus.emit('app:error', {
            type: 'promise',
            error: event.reason
        });
    }

    handleVisibilityChange() {
        const isVisible = !document.hidden;
        window.NCS.eventBus.emit('app:visibility', { visible: isVisible });
        
        if (isVisible && window.NCS.state.get('apiConnected') === false) {
            // Try to reconnect when page becomes visible
            this.connectToApi();
        }
    }

    /**
     * Utility Methods
     */
    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#0f172a' : '#ffffff';
        }
    }

    updateDocumentTitle(page) {
        const titles = {
            'landing': 'NCS-API - Advanced Clustering Solutions',
            'playground': 'Clustering Playground - NCS-API',
            'docs': 'API Documentation - NCS-API',
            'benchmarks': 'Performance Benchmarks - NCS-API',
            'examples': 'Examples & Use Cases - NCS-API'
        };
        
        document.title = titles[page] || 'NCS-API';
    }

    showLoadingState(message) {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        if (loadingMessage && message) {
            loadingMessage.textContent = message;
        }
    }

    hideLoadingState() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
    }

    handleInitializationError(error) {
        console.error('🚨 Initialization error:', error);
        
        // Show basic error message to user
        const errorHTML = `
            <div class="error-container">
                <h2>Application Error</h2>
                <p>Failed to initialize the application. Please refresh the page.</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
    }

    handleStartupError(error) {
        console.error('🚨 Startup error:', error);
        this.hideLoadingState();
        
        // Show error state but keep basic functionality
        window.NCS.eventBus.emit('app:startup-error', error);
    }

    /**
     * Public API Methods
     */
    getComponent(name) {
        return this.components.get(name);
    }

    getState(key) {
        return window.NCS.state.get(key);
    }

    setState(key, value) {
        return window.NCS.state.set(key, value);
    }

    emit(event, data) {
        return window.NCS.eventBus.emit(event, data);
    }

    on(event, handler) {
        return window.NCS.eventBus.on(event, handler);
    }

    off(event, handler) {
        return window.NCS.eventBus.off(event, handler);
    }
}

/**
 * Application Bootstrap
 * Initialize and start the application when DOM is ready
 */
function bootstrap() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
        return;
    }

    try {
        // Create application instance
        const app = new NCSApplication();
        
        // Store globally for debugging
        window.NCS.app = app;
        
        // Start the application
        app.start().catch(error => {
            console.error('Failed to start application:', error);
        });
        
    } catch (error) {
        console.error('Failed to bootstrap application:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                <h1>Application Error</h1>
                <p>Failed to start the NCS-API website.</p>
                <p>Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// Export for module usage
export { NCSApplication, bootstrap };

// Auto-bootstrap when loaded as a script
if (typeof module === 'undefined') {
    bootstrap();
}