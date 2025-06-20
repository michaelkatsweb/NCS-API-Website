/**
 * Main Application Controller
 * Central coordinator for the NCS-API website application
 * 
 * Features:
 * - Application lifecycle management
 * - Component registry
 * - Event system integration
 * - Theme management
 * - Performance monitoring
 * - Error handling
 * - Accessibility features
 */

import { CONFIG, EVENTS } from '../config/constants.js';
import { eventBus } from './eventBus.js';

export class App {
    constructor(options = {}) {
        this.options = {
            debug: false,
            enableRouting: true,
            enableAnalytics: true,
            enablePerformanceMonitoring: true,
            enableErrorTracking: true,
            container: document.body,
            ...options
        };
        
        // Application state
        this.state = {
            initialized: false,
            currentPage: null,
            theme: 'dark',
            apiConnected: false,
            offline: !navigator.onLine,
            featuresEnabled: { ...CONFIG.APP.FEATURES },
            user: null,
            performance: {
                startTime: performance.now(),
                loadTime: 0,
                errors: []
            }
        };
        
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
        this.featureFlags = new Map(Object.entries(CONFIG.APP.FEATURES));
        
        // Bind methods
        this.handleRoute = this.handleRoute.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        
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
            eventBus.emit(EVENTS.APP_READY, {
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
        
        // Initialize page-specific components
        await this.initializePageComponents();
    }

    /**
     * Initialize routing system
     */
    initializeRouting() {
        // Define routes
        this.addRoute('/', 'landing');
        this.addRoute('/playground.html', 'playground');
        this.addRoute('/playground', 'playground');
        this.addRoute('/docs.html', 'docs');
        this.addRoute('/docs', 'docs');
        this.addRoute('/benchmarks.html', 'benchmarks');
        this.addRoute('/benchmarks', 'benchmarks');
        this.addRoute('/examples.html', 'examples');
        this.addRoute('/examples', 'examples');
        
        // Handle initial route
        this.handleRoute(window.location.pathname);
        
        // Listen for navigation events
        window.addEventListener('popstate', (event) => {
            this.handleRoute(window.location.pathname, event.state);
        });
        
        // Intercept internal links
        document.addEventListener('click', this.handleLinkClick);
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if (!('PerformanceObserver' in window)) {
            console.warn('PerformanceObserver not supported');
            return;
        }

        try {
            // Monitor Core Web Vitals
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.handlePerformanceEntry(entry);
                });
            });

            // Observe different performance metrics
            ['navigation', 'paint', 'largest-contentful-paint', 'first-input'].forEach(type => {
                try {
                    this.performanceObserver.observe({ type, buffered: true });
                } catch (e) {
                    // Some metrics might not be supported
                    console.warn(`Performance metric ${type} not supported`);
                }
            });

        } catch (error) {
            console.warn('Performance monitoring setup failed:', error);
        }
    }

    /**
     * Initialize error tracking
     */
    initializeErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'javascript'
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason, {
                type: 'promise',
                promise: event.promise
            });
        });

        // Custom error boundary
        this.errorBoundary = {
            catch: (error, context = {}) => {
                this.handleGlobalError(error, { ...context, type: 'boundary' });
            }
        };
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEvents() {
        // Online/offline status
        window.addEventListener('online', this.handleOnlineStatus);
        window.addEventListener('offline', this.handleOnlineStatus);
        
        // Page visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
        
        // Theme preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (this.getStoredTheme() === 'auto') {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Initialize feature flags
     */
    initializeFeatureFlags() {
        // Load feature flags from remote or local storage
        const storedFlags = this.getFromStorage('feature-flags');
        if (storedFlags) {
            Object.entries(storedFlags).forEach(([key, value]) => {
                this.featureFlags.set(key, value);
            });
        }
        
        // Enable debug features in development
        if (CONFIG.APP.IS_DEVELOPMENT) {
            this.featureFlags.set('debug-mode', true);
            this.featureFlags.set('performance-overlay', true);
        }
    }

    /**
     * Start application lifecycle
     */
    async startApplicationLifecycle() {
        // Initialize core components that should be available on all pages
        await this.initializeCoreComponents();
        
        // Initialize page-specific functionality
        await this.initializeCurrentPage();
        
        // Start any background processes
        this.startBackgroundProcesses();
    }

    /**
     * Initialize core components
     */
    async initializeCoreComponents() {
        try {
            // Header component (navigation)
            if (document.querySelector('header')) {
                const { Header } = await import('../components/Header.js');
                const header = new Header(document.querySelector('header'));
                this.registerComponent('header', header);
            }

            // Theme toggle
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                const { ThemeToggle } = await import('../components/ThemeToggle.js');
                const toggle = new ThemeToggle(themeToggle);
                this.registerComponent('theme-toggle', toggle);
            }

            // Toast notifications
            if (document.querySelector('.toast-container') || document.body) {
                const { Toast } = await import('../components/Toast.js');
                const toast = new Toast();
                this.registerComponent('toast', toast);
            }

        } catch (error) {
            console.error('Failed to initialize core components:', error);
        }
    }

    /**
     * Initialize page-specific components
     */
    async initializePageComponents() {
        const page = this.state.currentPage;
        
        try {
            switch (page) {
                case 'landing':
                    await this.initializeLandingPage();
                    break;
                case 'playground':
                    await this.initializePlaygroundPage();
                    break;
                case 'docs':
                    await this.initializeDocsPage();
                    break;
                case 'examples':
                    await this.initializeExamplesPage();
                    break;
                case 'benchmarks':
                    await this.initializeBenchmarksPage();
                    break;
                default:
                    console.log(`No specific initialization for page: ${page}`);
            }
        } catch (error) {
            console.error(`Failed to initialize ${page} page:`, error);
        }
    }

    /**
     * Initialize landing page
     */
    async initializeLandingPage() {
        try {
            // Hero component
            const heroElement = document.querySelector('.hero');
            if (heroElement) {
                const { Hero } = await import('../components/Hero.js');
                const hero = new Hero(heroElement);
                this.registerComponent('hero', hero);
            }
        } catch (error) {
            console.warn('Failed to initialize landing page components:', error);
        }
    }

    /**
     * Initialize playground page
     */
    async initializePlaygroundPage() {
        try {
            const playgroundElement = document.querySelector('.playground');
            if (playgroundElement) {
                const { Playground } = await import('../components/Playground.js');
                const playground = new Playground(playgroundElement);
                this.registerComponent('playground', playground);
            }
        } catch (error) {
            console.warn('Failed to initialize playground components:', error);
        }
    }

    /**
     * Initialize docs page
     */
    async initializeDocsPage() {
        try {
            const docsElement = document.querySelector('.docs-page');
            if (docsElement) {
                const { DocsPage } = await import('../pages/docs.js');
                const docs = new DocsPage(docsElement);
                this.registerComponent('docs', docs);
            }
        } catch (error) {
            console.warn('Failed to initialize docs components:', error);
        }
    }

    /**
     * Initialize examples page
     */
    async initializeExamplesPage() {
        try {
            const examplesElement = document.querySelector('.examples-page');
            if (examplesElement) {
                const { ExamplesPage } = await import('../pages/examples.js');
                const examples = new ExamplesPage(examplesElement);
                this.registerComponent('examples', examples);
            }
        } catch (error) {
            console.warn('Failed to initialize examples components:', error);
        }
    }

    /**
     * Initialize benchmarks page
     */
    async initializeBenchmarksPage() {
        try {
            const benchmarksElement = document.querySelector('.benchmarks-page');
            if (benchmarksElement) {
                const { BenchmarksPage } = await import('../pages/benchmarks.js');
                const benchmarks = new BenchmarksPage(benchmarksElement);
                this.registerComponent('benchmarks', benchmarks);
            }
        } catch (error) {
            console.warn('Failed to initialize benchmarks components:', error);
        }
    }

    /**
     * Initialize current page
     */
    async initializeCurrentPage() {
        await this.initializePageComponents();
        
        // Emit page ready event
        eventBus.emit(EVENTS.ROUTE_CHANGE, {
            page: this.state.currentPage,
            path: window.location.pathname
        });
    }

    /**
     * Theme Management
     */
    initializeTheme() {
        const storedTheme = this.getStoredTheme();
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme = storedTheme;
        if (!theme || theme === 'auto') {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        this.setTheme(theme);
    }

    setTheme(theme) {
        this.state.theme = theme;
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#111827' : '#ffffff';
        }
        
        // Store preference
        this.setToStorage(CONFIG.STORAGE.THEME_PREFERENCE, theme);
        
        // Emit theme change event
        eventBus.emit(EVENTS.THEME_CHANGE, { theme });
    }

    getStoredTheme() {
        return this.getFromStorage(CONFIG.STORAGE.THEME_PREFERENCE) || 'dark';
    }

    /**
     * Routing Methods
     */
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }

    handleRoute(path, state = null) {
        const route = this.routes.get(path) || this.routes.get('/');
        
        if (route !== this.currentRoute) {
            this.routeHistory.push({
                path,
                route,
                timestamp: Date.now(),
                state
            });
            
            this.currentRoute = route;
            this.state.currentPage = route;
            
            // Initialize new page components if needed
            this.initializeCurrentPage();
        }
    }

    handleLinkClick(event) {
        const link = event.target.closest('a[href]');
        if (link && this.isInternalLink(link.href)) {
            const url = new URL(link.href);
            if (url.pathname !== window.location.pathname) {
                event.preventDefault();
                this.navigateTo(url.pathname);
            }
        }
    }

    navigateTo(path) {
        if (path !== window.location.pathname) {
            history.pushState({}, '', path);
            this.handleRoute(path);
        }
    }

    isInternalLink(href) {
        try {
            const url = new URL(href, window.location.origin);
            return url.origin === window.location.origin;
        } catch (e) {
            return false;
        }
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'landing';
        if (path.includes('playground')) return 'playground';
        if (path.includes('docs')) return 'docs';
        if (path.includes('examples')) return 'examples';
        if (path.includes('benchmarks')) return 'benchmarks';
        return 'unknown';
    }

    /**
     * Component Management
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        this.activeComponents.add(component);
        
        if (this.options.debug) {
            console.log(`🔌 Component registered: ${name}`);
        }
    }

    getComponent(name) {
        return this.components.get(name);
    }

    unregisterComponent(name) {
        const component = this.components.get(name);
        if (component) {
            this.activeComponents.delete(component);
            this.components.delete(name);
            
            // Cleanup component if it has a destroy method
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        }
    }

    /**
     * Utility Methods
     */
    setupViewport() {
        // Handle viewport meta tag for mobile
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
            document.head.appendChild(viewport);
        }
    }

    initializeAccessibility() {
        // Skip links
        if (!document.querySelector('.skip-link')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.className = 'skip-link';
            skipLink.textContent = 'Skip to main content';
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
        
        // Focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('using-keyboard');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('using-keyboard');
        });
    }

    setupOfflineDetection() {
        this.state.offline = !navigator.onLine;
        
        window.addEventListener('online', this.handleOnlineStatus);
        window.addEventListener('offline', this.handleOnlineStatus);
    }

    handleOnlineStatus(event) {
        this.state.offline = !navigator.onLine;
        eventBus.emit(event.type === 'online' ? EVENTS.ONLINE : EVENTS.OFFLINE, {
            online: navigator.onLine
        });
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause non-essential activities
            this.pauseBackgroundProcesses();
        } else {
            // Page is visible, resume activities
            this.resumeBackgroundProcesses();
        }
    }

    handleKeyboardShortcuts(event) {
        // Global keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    // Open search
                    eventBus.emit('search:open');
                    break;
                case '/':
                    event.preventDefault();
                    // Focus search
                    eventBus.emit('search:focus');
                    break;
            }
        }
        
        // Theme toggle shortcut
        if (event.altKey && event.key === 't') {
            event.preventDefault();
            const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    }

    initializeStorage() {
        // Check for storage support
        this.storageAvailable = this.checkStorageSupport();
        
        if (!this.storageAvailable) {
            console.warn('Local storage not available');
        }
    }

    checkStorageSupport() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    getFromStorage(key) {
        if (!this.storageAvailable) return null;
        
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn(`Failed to get ${key} from storage:`, e);
            return null;
        }
    }

    setToStorage(key, value) {
        if (!this.storageAvailable) return false;
        
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`Failed to set ${key} to storage:`, e);
            return false;
        }
    }

    /**
     * Background Processes
     */
    startBackgroundProcesses() {
        // Performance metrics collection
        if (this.featureFlags.get('performance-monitoring')) {
            this.startPerformanceCollection();
        }
    }

    pauseBackgroundProcesses() {
        // Pause non-essential activities when page is hidden
    }

    resumeBackgroundProcesses() {
        // Resume activities when page becomes visible
    }

    startPerformanceCollection() {
        // Collect performance metrics periodically
        setInterval(() => {
            this.collectPerformanceMetrics();
        }, 30000); // Every 30 seconds
    }

    collectPerformanceMetrics() {
        if (!this.featureFlags.get('performance-monitoring')) return;
        
        const metrics = {
            memory: this.getMemoryUsage(),
            timing: this.getPerformanceTiming(),
            fps: this.getFPS(),
            timestamp: Date.now()
        };
        
        eventBus.emit('performance:metrics', metrics);
    }

    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    getPerformanceTiming() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            return {
                dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcp: navigation.connectEnd - navigation.connectStart,
                request: navigation.responseStart - navigation.requestStart,
                response: navigation.responseEnd - navigation.responseStart,
                dom: navigation.domContentLoadedEventEnd - navigation.responseEnd,
                total: navigation.loadEventEnd - navigation.navigationStart
            };
        }
        return null;
    }

    getFPS() {
        // Simple FPS estimation
        if (!this.fpsData) {
            this.fpsData = { frames: 0, lastTime: performance.now() };
        }
        
        const now = performance.now();
        this.fpsData.frames++;
        
        if (now - this.fpsData.lastTime >= 1000) {
            const fps = Math.round((this.fpsData.frames * 1000) / (now - this.fpsData.lastTime));
            this.fpsData.frames = 0;
            this.fpsData.lastTime = now;
            return fps;
        }
        
        return null;
    }

    /**
     * Error Handling
     */
    handleGlobalError(error, context = {}) {
        console.error('Global error:', error, context);
        
        this.state.performance.errors.push({
            error: error.message || error,
            context,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        });
        
        eventBus.emit(EVENTS.APP_ERROR, { error, context });
        
        // Show user-friendly error message
        this.showErrorToast('An unexpected error occurred. Please refresh the page if the problem persists.');
    }

    handleStartupError(error) {
        console.error('Startup error:', error);
        
        // Show error state
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Application Failed to Start</h2>
                    <p>We're sorry, but the application encountered an error during startup.</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    handlePerformanceEntry(entry) {
        // Process performance entries
        if (entry.entryType === 'paint') {
            console.log(`${entry.name}: ${entry.startTime}ms`);
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
            console.log(`LCP: ${entry.startTime}ms`);
        }
        
        if (entry.entryType === 'first-input') {
            console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
        }
    }

    showErrorToast(message) {
        const toast = this.getComponent('toast');
        if (toast) {
            toast.show({
                type: 'error',
                message,
                duration: 5000
            });
        }
    }

    /**
     * Debug Mode
     */
    enableDebugMode() {
        console.log('🔧 Debug mode enabled');
        
        // Expose app to global scope
        window.NCS_App = this;
        
        // Add debug info to page
        document.body.setAttribute('data-debug', 'true');
        
        // Enhanced logging
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error
        };
        
        // Add debug panel if needed
        this.createDebugPanel();
    }

    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; z-index: 10000;">
                <div>Page: ${this.state.currentPage}</div>
                <div>Theme: ${this.state.theme}</div>
                <div>Components: ${this.components.size}</div>
                <div>Online: ${!this.state.offline}</div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('online', this.handleOnlineStatus);
        window.removeEventListener('offline', this.handleOnlineStatus);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('click', this.handleLinkClick);
        
        // Cleanup components
        this.activeComponents.forEach(component => {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Cleanup performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Clear references
        this.components.clear();
        this.activeComponents.clear();
        this.routes.clear();
        
        console.log('🧹 App destroyed');
    }
}

export default App;