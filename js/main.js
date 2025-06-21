/**
 * FILE: js/main.js
 * NCS-API Website - Main Application Entry Point
 * Clean, unified bootstrap sequence using existing core modules
 */

// Import the existing App class (not creating a competing one)
import { App } from './core/app.js';
import { eventBus } from './core/eventBusNew.js';
import { CONFIG } from './config/constants.js';

// Global application namespace
window.NCS = {
    version: '2.1.0',
    debug: false,
    startTime: performance.now(),
    app: null,
    components: new Map(),
    state: null,
    router: null,
    eventBus: null
};

/**
 * Main Application Bootstrap Class
 * Handles initialization and coordinates with existing App class
 */
class ApplicationBootstrap {
    constructor() {
        this.initialized = false;
        this.currentPage = null;
        this.criticalComponentsLoaded = false;
        
        // Enable debug mode in development
        this.enableDebugMode();
        
        console.log('🏗️ NCS Application Bootstrap created');
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
            window.NCS.bootstrap = this;
        }
    }

    /**
     * Main application start method
     */
    async start() {
        try {
            console.log('🚀 Starting NCS-API Website Application...');
            
            // Show loading state
            this.showLoadingState('Initializing application...');
            
            // Initialize global systems
            await this.initializeGlobalSystems();
            
            // Create and start the main App
            await this.initializeMainApp();
            
            // Determine and initialize current page
            await this.initializeCurrentPage();
            
            // Load critical components
            await this.loadCriticalComponents();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize theme system
            this.initializeTheme();
            
            // Mark as initialized
            this.initialized = true;
            
            // Hide loading state
            this.hideLoadingState();
            
            // Emit ready event
            window.NCS.eventBus.emit('app:ready', {
                loadTime: performance.now() - window.NCS.startTime,
                page: this.currentPage
            });
            
            console.log(`✅ NCS-API Application started successfully in ${(performance.now() - window.NCS.startTime).toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Failed to start application:', error);
            this.handleStartupError(error);
        }
    }

    /**
     * Initialize global systems
     */
    async initializeGlobalSystems() {
        try {
            // Setup global event bus
            window.NCS.eventBus = eventBus;
            console.log('✅ Global event bus initialized');
            
            // Initialize performance monitoring
            this.initializePerformanceMonitoring();
            
            // Setup error handling
            this.setupGlobalErrorHandling();
            
        } catch (error) {
            console.error('❌ Failed to initialize global systems:', error);
            throw error;
        }
    }

    /**
     * Initialize the main App class
     */
    async initializeMainApp() {
        try {
            // Create App instance with configuration
            window.NCS.app = new App({
                debug: window.NCS.debug,
                enableRouting: true,
                enableAnalytics: CONFIG.APP.FEATURES.ADVANCED_ANALYTICS,
                enablePerformanceMonitoring: CONFIG.APP.PERFORMANCE.ENABLE_METRICS
            });
            
            // Start the main app
            await window.NCS.app.start();
            
            // Store references to core systems
            window.NCS.state = window.NCS.app.state;
            window.NCS.router = window.NCS.app.routes;
            
            console.log('✅ Main App initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize main App:', error);
            throw error;
        }
    }

    /**
     * Determine current page and initialize page-specific functionality
     */
    async initializeCurrentPage() {
        try {
            // Determine current page
            this.currentPage = this.getCurrentPage();
            console.log(`📄 Current page detected: ${this.currentPage}`);
            
            // Load page-specific module
            await this.loadPageModule(this.currentPage);
            
            // Update document title
            this.updateDocumentTitle(this.currentPage);
            
        } catch (error) {
            console.warn(`⚠️ Failed to initialize page-specific functionality: ${error.message}`);
            // Continue with basic functionality
        }
    }

    /**
     * Get current page from URL
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').filter(Boolean)[0];
        
        // Map common paths to page names
        const pageMap = {
            '': 'landing',
            'index.html': 'landing',
            'playground': 'playground',
            'playground.html': 'playground',
            'docs': 'docs',
            'docs.html': 'docs',
            'benchmarks': 'benchmarks',
            'benchmarks.html': 'benchmarks',
            'examples': 'examples',
            'examples.html': 'examples'
        };
        
        return pageMap[page] || 'landing';
    }

    /**
     * Load page-specific module
     */
    async loadPageModule(pageName) {
        try {
            console.log(`📦 Loading page module: ${pageName}`);
            
            // Dynamic import of page module
            const pageModule = await import(`./pages/${pageName}.js`);
            
            // Check if module has init function
            if (pageModule.init && typeof pageModule.init === 'function') {
                await pageModule.init();
                console.log(`✅ Page module initialized: ${pageName}`);
            } else if (pageModule.default && typeof pageModule.default.init === 'function') {
                await pageModule.default.init();
                console.log(`✅ Page module (default export) initialized: ${pageName}`);
            } else {
                console.log(`📄 Page module loaded but no init function found: ${pageName}`);
            }
            
        } catch (error) {
            console.warn(`⚠️ Failed to load page module ${pageName}:`, error.message);
            // Continue without page-specific functionality
        }
    }

    /**
     * Load critical components that should be available immediately
     */
    async loadCriticalComponents() {
        try {
            console.log('📦 Loading critical components...');
            
            const criticalComponents = ['Header', 'ThemeToggle'];
            const loadPromises = criticalComponents.map(componentName => 
                this.loadComponent(componentName)
            );
            
            const results = await Promise.allSettled(loadPromises);
            
            // Log results
            results.forEach((result, index) => {
                const componentName = criticalComponents[index];
                if (result.status === 'fulfilled' && result.value) {
                    console.log(`✅ Critical component loaded: ${componentName}`);
                } else {
                    console.log(`📦 Critical component not yet implemented or failed: ${componentName}`);
                }
            });
            
            this.criticalComponentsLoaded = true;
            
        } catch (error) {
            console.warn('⚠️ Failed to load some critical components:', error);
            // Continue - components are optional during development
        }
    }

    /**
     * Load a component dynamically
     */
    async loadComponent(componentName) {
        try {
            // Check if component is already loaded
            if (window.NCS.components.has(componentName)) {
                return window.NCS.components.get(componentName);
            }
            
            console.log(`📦 Loading component: ${componentName}`);
            
            // Dynamic import of component
            const componentModule = await import(`./components/${componentName}.js`);
            
            // Get component class
            const ComponentClass = componentModule[componentName] || componentModule.default;
            
            if (!ComponentClass) {
                console.warn(`⚠️ Component class not found in module: ${componentName}`);
                return null;
            }
            
            // Find component container
            const container = this.findComponentContainer(componentName);
            
            // Initialize component
            let componentInstance;
            if (container) {
                componentInstance = new ComponentClass(container);
            } else {
                // Some components don't need containers (e.g., global utilities)
                componentInstance = new ComponentClass();
            }
            
            // Store component instance
            window.NCS.components.set(componentName, componentInstance);
            
            console.log(`✅ Component loaded and initialized: ${componentName}`);
            return componentInstance;
            
        } catch (error) {
            console.warn(`⚠️ Failed to load component ${componentName}:`, error.message);
            return null;
        }
    }

    /**
     * Find container for component
     */
    findComponentContainer(componentName) {
        const containerSelectors = [
            `[data-component="${componentName.toLowerCase()}"]`,
            `.${componentName.toLowerCase()}-container`,
            `#${componentName.toLowerCase()}`,
            `.${componentName.toLowerCase()}`
        ];
        
        for (const selector of containerSelectors) {
            const container = document.querySelector(selector);
            if (container) {
                return container;
            }
        }
        
        return null;
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Theme system events
        window.NCS.eventBus.on('theme:change', (theme) => {
            this.applyTheme(theme);
        });
        
        // Error handling
        window.NCS.eventBus.on('app:error', (error) => {
            console.error('Application error:', error);
        });
        
        // Performance monitoring
        if (CONFIG.APP.PERFORMANCE.ENABLE_METRICS) {
            this.setupPerformanceEventListeners();
        }
        
        console.log('✅ Global event listeners setup complete');
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        try {
            // Get saved theme or default
            const savedTheme = localStorage.getItem(CONFIG.APP.UI.THEME_STORAGE_KEY);
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            const theme = savedTheme || CONFIG.APP.UI.DEFAULT_THEME || systemTheme;
            
            // Apply theme
            this.applyTheme(theme);
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!savedTheme || savedTheme === 'auto') {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
            
            console.log(`🎨 Theme system initialized: ${theme}`);
            
        } catch (error) {
            console.error('❌ Theme initialization failed:', error);
            // Fallback to light theme
            this.applyTheme('light');
        }
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        // Remove existing theme classes
        document.documentElement.classList.remove('theme-light', 'theme-dark');
        
        // Apply new theme
        document.documentElement.classList.add(`theme-${theme}`);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#0f172a' : '#ffffff';
        }
        
        // Store theme preference
        if (theme !== 'auto') {
            localStorage.setItem(CONFIG.APP.UI.THEME_STORAGE_KEY, theme);
        }
        
        // Emit theme change event
        window.NCS.eventBus.emit('theme:changed', theme);
    }

    /**
     * Update document title based on page
     */
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

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if (!CONFIG.APP.PERFORMANCE.ENABLE_METRICS) return;
        
        try {
            // Monitor page load performance
            window.addEventListener('load', () => {
                const loadTime = performance.now() - window.NCS.startTime;
                console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
                
                window.NCS.eventBus.emit('performance:page-load', {
                    loadTime,
                    timestamp: Date.now()
                });
            });
            
            // Monitor memory usage
            if ('memory' in performance) {
                setInterval(() => {
                    const memory = performance.memory;
                    if (memory.usedJSHeapSize > CONFIG.APP.PERFORMANCE.MAX_MEMORY_USAGE) {
                        console.warn('⚠️ High memory usage detected:', {
                            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                            limit: Math.round(CONFIG.APP.PERFORMANCE.MAX_MEMORY_USAGE / 1024 / 1024) + 'MB'
                        });
                    }
                }, 30000); // Check every 30 seconds
            }
            
        } catch (error) {
            console.warn('⚠️ Performance monitoring setup failed:', error);
        }
    }

    /**
     * Setup performance event listeners
     */
    setupPerformanceEventListeners() {
        window.NCS.eventBus.on('performance:slow-component', (data) => {
            console.warn('🐌 Slow component detected:', data);
        });
        
        window.NCS.eventBus.on('performance:memory-warning', (data) => {
            console.warn('💾 Memory usage warning:', data);
        });
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Catch unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('🚨 Unhandled error:', event.error);
            window.NCS.eventBus.emit('app:error', {
                type: 'javascript',
                error: event.error,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            window.NCS.eventBus.emit('app:error', {
                type: 'promise',
                error: event.reason
            });
        });
    }

    /**
     * Show loading state
     */
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

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Handle startup errors
     */
    handleStartupError(error) {
        console.error('🚨 Application startup failed:', error);
        
        this.hideLoadingState();
        
        // Show error message to user
        const errorHTML = `
            <div class="error-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h1 style="color: #ef4444; margin-bottom: 1rem;">Application Error</h1>
                <p style="color: #6b7280; margin-bottom: 2rem; max-width: 500px;">
                    Failed to initialize the NCS-API website. This may be due to a network issue or browser compatibility.
                </p>
                <button onclick="window.location.reload()" style="
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#5856eb'" onmouseout="this.style.background='#6366f1'">
                    Refresh Page
                </button>
            </div>
        `;
        
        document.body.innerHTML = errorHTML;
        
        // Emit error event
        if (window.NCS.eventBus) {
            window.NCS.eventBus.emit('app:startup-error', error);
        }
    }

    /**
     * Public API methods
     */
    getComponent(name) {
        return window.NCS.components.get(name);
    }

    isInitialized() {
        return this.initialized;
    }

    getCurrentPage() {
        return this.currentPage;
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
        // Create bootstrap instance
        const appBootstrap = new ApplicationBootstrap();
        
        // Store globally for debugging
        window.NCS.bootstrap = appBootstrap;
        
        // Start the application
        appBootstrap.start().catch(error => {
            console.error('Failed to start application:', error);
        });
        
    } catch (error) {
        console.error('Failed to bootstrap application:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="
                text-align: center; 
                padding: 50px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h1 style="color: #ef4444;">Application Error</h1>
                <p>Failed to start the NCS-API website.</p>
                <p>Please refresh the page or try again later.</p>
                <button onclick="window.location.reload()" style="
                    padding: 10px 20px; 
                    font-size: 16px;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// Export for module usage
export { ApplicationBootstrap, bootstrap };

// Auto-bootstrap when loaded as a script
if (typeof module === 'undefined') {
    bootstrap();
}