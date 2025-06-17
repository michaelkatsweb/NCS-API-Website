/**
 * FILE: js/core/router.js
 * Router Component - Client-side routing system
 * NCS-API Website
 * 
 * Features:
 * - Hash-based and History API routing
 * - Route parameters and query strings
 * - Route guards and middleware
 * - Lazy loading of page components
 * - Navigation events and lifecycle
 * - Deep linking support
 * - SEO-friendly URLs
 * - Error handling and fallbacks
 */

import { CONFIG } from '../config/constants.js';

export class Router {
    constructor(options = {}) {
        // Configuration
        this.config = {
            mode: 'history', // 'hash' or 'history'
            root: '/',
            linkSelector: 'a[href]',
            enableCache: true,
            cacheSize: 10,
            defaultRoute: '/',
            notFoundRoute: '/404',
            enableTransitions: true,
            transitionDuration: 300,
            enableLazyLoading: true,
            enablePreloading: false,
            scrollBehavior: 'smooth', // 'auto', 'smooth', 'instant', false
            ...options
        };

        // State management
        this.state = {
            currentRoute: null,
            previousRoute: null,
            isNavigating: false,
            history: [],
            cache: new Map()
        };

        // Route definitions
        this.routes = new Map();
        this.middlewares = [];
        this.guards = [];

        // Event handlers
        this.listeners = {
            beforeNavigate: [],
            afterNavigate: [],
            routeChange: [],
            routeError: []
        };

        // Navigation tracking
        this.navigationId = 0;

        // Preloading queue
        this.preloadQueue = new Set();

        this.init();
    }

    /**
     * Initialize the router
     */
    init() {
        try {
            console.log('🧭 Initializing Router...');

            this.setupEventListeners();
            this.defineDefaultRoutes();
            
            // Handle initial load
            this.handleInitialLoad();

            console.log('✅ Router initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Router:', error);
            this.handleError(error);
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Handle browser navigation
        if (this.config.mode === 'history') {
            window.addEventListener('popstate', this.handlePopState.bind(this));
        } else {
            window.addEventListener('hashchange', this.handleHashChange.bind(this));
        }

        // Handle link clicks
        document.addEventListener('click', this.handleLinkClick.bind(this));

        // Handle form submissions (for search, etc.)
        document.addEventListener('submit', this.handleFormSubmit.bind(this));

        // Handle page visibility for preloading
        if (this.config.enablePreloading) {
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
    }

    /**
     * Define default application routes
     */
    defineDefaultRoutes() {
        // Landing page
        this.addRoute('/', {
            component: () => import('../pages/landing.js'),
            title: 'NCS-API - High-Performance Clustering',
            meta: {
                description: 'Real-time clustering visualization and API testing platform',
                keywords: 'clustering, machine learning, API, visualization'
            }
        });

        // Playground
        this.addRoute('/playground', {
            component: () => import('../pages/playground.js'),
            title: 'Clustering Playground - NCS-API',
            meta: {
                description: 'Interactive clustering algorithm playground',
                keywords: 'clustering playground, k-means, dbscan, interactive'
            }
        });

        // Documentation
        this.addRoute('/docs', {
            component: () => import('../pages/docs.js'),
            title: 'API Documentation - NCS-API',
            meta: {
                description: 'Comprehensive API documentation and examples',
                keywords: 'API documentation, REST API, clustering API'
            }
        });

        // Benchmarks
        this.addRoute('/benchmarks', {
            component: () => import('../pages/benchmarks.js'),
            title: 'Performance Benchmarks - NCS-API',
            meta: {
                description: 'Real-time performance metrics and comparisons',
                keywords: 'performance benchmarks, clustering performance'
            }
        });

        // Examples
        this.addRoute('/examples', {
            component: () => import('../pages/examples.js'),
            title: 'Code Examples - NCS-API',
            meta: {
                description: 'Sample implementations and use cases',
                keywords: 'code examples, clustering examples, API examples'
            }
        });

        // Dynamic routes with parameters
        this.addRoute('/playground/:algorithm', {
            component: () => import('../pages/playground.js'),
            title: 'Clustering Playground - NCS-API',
            guards: ['validateAlgorithm']
        });

        this.addRoute('/docs/:section', {
            component: () => import('../pages/docs.js'),
            title: 'API Documentation - NCS-API',
            guards: ['validateSection']
        });

        // 404 Not Found
        this.addRoute('/404', {
            component: () => import('../pages/notFound.js'),
            title: 'Page Not Found - NCS-API'
        });
    }

    /**
     * Add a route definition
     */
    addRoute(path, options = {}) {
        const route = {
            path: this.normalizePath(path),
            component: options.component,
            title: options.title || 'NCS-API',
            meta: options.meta || {},
            guards: options.guards || [],
            middleware: options.middleware || [],
            cache: options.cache !== false,
            preload: options.preload || false,
            ...options
        };

        // Convert path to regex for parameter matching
        route.regex = this.pathToRegex(path);
        route.paramNames = this.extractParamNames(path);

        this.routes.set(path, route);
        return this;
    }

    /**
     * Add route middleware
     */
    addMiddleware(middleware) {
        if (typeof middleware === 'function') {
            this.middlewares.push(middleware);
        }
        return this;
    }

    /**
     * Add route guard
     */
    addGuard(name, guard) {
        if (typeof guard === 'function') {
            this.guards[name] = guard;
        }
        return this;
    }

    /**
     * Navigate to a route
     */
    async navigate(path, options = {}) {
        if (this.state.isNavigating && !options.force) {
            console.warn('Navigation already in progress');
            return false;
        }

        const navigationId = ++this.navigationId;
        this.state.isNavigating = true;

        try {
            // Normalize the path
            const normalizedPath = this.normalizePath(path);
            
            // Parse the route
            const route = this.matchRoute(normalizedPath);
            if (!route) {
                throw new Error(`Route not found: ${path}`);
            }

            // Create navigation context
            const context = {
                path: normalizedPath,
                route,
                params: route.params || {},
                query: this.parseQuery(normalizedPath),
                navigationId,
                ...options
            };

            // Store previous route
            this.state.previousRoute = this.state.currentRoute;

            // Trigger before navigate event
            const shouldContinue = await this.triggerEvent('beforeNavigate', context);
            if (shouldContinue === false) {
                this.state.isNavigating = false;
                return false;
            }

            // Run route guards
            const guardsPassed = await this.runGuards(route, context);
            if (!guardsPassed) {
                this.state.isNavigating = false;
                return false;
            }

            // Run middleware
            await this.runMiddlewares(route, context);

            // Load route component
            const component = await this.loadComponent(route, context);
            if (!component) {
                throw new Error('Failed to load route component');
            }

            // Check if this navigation is still current
            if (navigationId !== this.navigationId) {
                console.log('Navigation superseded by newer navigation');
                return false;
            }

            // Update browser URL
            this.updateURL(normalizedPath, options.replace);

            // Update page metadata
            this.updatePageMeta(route, context);

            // Render the component
            await this.renderComponent(component, context);

            // Update state
            this.state.currentRoute = {
                ...route,
                path: normalizedPath,
                params: context.params,
                query: context.query,
                timestamp: Date.now()
            };

            // Add to history
            this.addToHistory(this.state.currentRoute);

            // Handle scroll behavior
            this.handleScrollBehavior(options.scroll);

            // Trigger after navigate event
            await this.triggerEvent('afterNavigate', context);

            // Trigger route change event
            await this.triggerEvent('routeChange', this.state.currentRoute);

            return true;

        } catch (error) {
            console.error('Navigation error:', error);
            await this.triggerEvent('routeError', error);
            
            // Try to navigate to 404 page
            if (path !== this.config.notFoundRoute) {
                return this.navigate(this.config.notFoundRoute, { replace: true });
            }
            
            return false;
        } finally {
            this.state.isNavigating = false;
        }
    }

    /**
     * Match a path to a route
     */
    matchRoute(path) {
        // Remove query string for matching
        const cleanPath = path.split('?')[0];

        // Try exact match first
        if (this.routes.has(cleanPath)) {
            return { ...this.routes.get(cleanPath), params: {} };
        }

        // Try regex matches for parameterized routes
        for (const [routePath, route] of this.routes) {
            const match = cleanPath.match(route.regex);
            if (match) {
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                return { ...route, params };
            }
        }

        return null;
    }

    /**
     * Load route component
     */
    async loadComponent(route, context) {
        try {
            // Check cache first
            if (this.config.enableCache && this.state.cache.has(route.path)) {
                console.log(`📦 Loading component from cache: ${route.path}`);
                return this.state.cache.get(route.path);
            }

            // Load component
            console.log(`📦 Loading component: ${route.path}`);
            
            let component;
            if (typeof route.component === 'function') {
                const module = await route.component();
                component = module.default || module;
            } else {
                component = route.component;
            }

            // Cache the component
            if (this.config.enableCache && route.cache) {
                this.cacheComponent(route.path, component);
            }

            return component;

        } catch (error) {
            console.error(`Failed to load component for route: ${route.path}`, error);
            throw error;
        }
    }

    /**
     * Render component
     */
    async renderComponent(component, context) {
        try {
            // Get main content element
            const mainElement = document.querySelector('main') || document.body;
            
            // Add transition class if enabled
            if (this.config.enableTransitions) {
                mainElement.classList.add('page-transition');
            }

            // Initialize component
            if (typeof component === 'function') {
                await component(context);
            } else if (component && typeof component.init === 'function') {
                await component.init(context);
            }

            // Remove transition class
            if (this.config.enableTransitions) {
                setTimeout(() => {
                    mainElement.classList.remove('page-transition');
                }, this.config.transitionDuration);
            }

        } catch (error) {
            console.error('Failed to render component:', error);
            throw error;
        }
    }

    /**
     * Run route guards
     */
    async runGuards(route, context) {
        for (const guardName of route.guards) {
            const guard = this.guards[guardName];
            if (guard && typeof guard === 'function') {
                try {
                    const result = await guard(context);
                    if (result === false) {
                        console.log(`Route guard "${guardName}" blocked navigation`);
                        return false;
                    }
                } catch (error) {
                    console.error(`Route guard "${guardName}" failed:`, error);
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Run middleware
     */
    async runMiddlewares(route, context) {
        // Global middleware
        for (const middleware of this.middlewares) {
            await middleware(context);
        }

        // Route-specific middleware
        for (const middleware of route.middleware) {
            if (typeof middleware === 'function') {
                await middleware(context);
            }
        }
    }

    /**
     * Handle browser events
     */
    handlePopState(event) {
        const path = this.getCurrentPath();
        this.navigate(path, { fromPopState: true });
    }

    handleHashChange(event) {
        const path = this.getCurrentPath();
        this.navigate(path, { fromHashChange: true });
    }

    handleLinkClick(event) {
        // Check if it's a router link
        const link = event.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Skip external links
        if (this.isExternalLink(href)) return;
        
        // Skip if has target="_blank" or download attribute
        if (link.target === '_blank' || link.hasAttribute('download')) return;
        
        // Skip if modifier keys are pressed
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        
        // Skip if right click
        if (event.button !== 0) return;

        // Prevent default and navigate
        event.preventDefault();
        this.navigate(href);
    }

    handleFormSubmit(event) {
        const form = event.target;
        const action = form.getAttribute('action');
        
        // Only handle forms with router actions
        if (!action || this.isExternalLink(action)) return;
        
        event.preventDefault();
        
        // Handle search forms
        if (form.classList.contains('router-search')) {
            const formData = new FormData(form);
            const query = new URLSearchParams(formData).toString();
            this.navigate(`${action}?${query}`);
        }
    }

    handleVisibilityChange() {
        if (!document.hidden && this.config.enablePreloading) {
            this.processPreloadQueue();
        }
    }

    /**
     * Handle initial page load
     */
    handleInitialLoad() {
        const currentPath = this.getCurrentPath();
        
        // Navigate to current URL
        this.navigate(currentPath || this.config.defaultRoute, { 
            replace: true,
            initial: true 
        });
    }

    /**
     * Utility methods
     */
    getCurrentPath() {
        if (this.config.mode === 'hash') {
            return window.location.hash.slice(1) || '/';
        } else {
            return window.location.pathname + window.location.search;
        }
    }

    normalizePath(path) {
        // Remove trailing slash except for root
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        // Ensure leading slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        return path;
    }

    pathToRegex(path) {
        // Convert route path to regex
        const regexPath = path
            .replace(/:[^/]+/g, '([^/]+)')  // Replace :param with capture group
            .replace(/\//g, '\\/');        // Escape forward slashes
        
        return new RegExp(`^${regexPath}$`);
    }

    extractParamNames(path) {
        const matches = path.match(/:([^/]+)/g);
        return matches ? matches.map(match => match.slice(1)) : [];
    }

    parseQuery(path) {
        const queryString = path.split('?')[1];
        if (!queryString) return {};
        
        const params = {};
        const searchParams = new URLSearchParams(queryString);
        
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        
        return params;
    }

    isExternalLink(href) {
        if (!href) return false;
        
        // Check for protocol
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return !href.startsWith(window.location.origin);
        }
        
        // Check for other protocols
        return href.includes('://') || href.startsWith('mailto:') || href.startsWith('tel:');
    }

    updateURL(path, replace = false) {
        if (this.config.mode === 'hash') {
            if (replace) {
                window.location.replace(`#${path}`);
            } else {
                window.location.hash = path;
            }
        } else {
            const url = new URL(path, window.location.origin);
            if (replace) {
                window.history.replaceState(null, '', url);
            } else {
                window.history.pushState(null, '', url);
            }
        }
    }

    updatePageMeta(route, context) {
        // Update page title
        if (route.title) {
            document.title = route.title;
        }

        // Update meta tags
        if (route.meta) {
            this.updateMetaTags(route.meta);
        }

        // Update canonical URL
        const canonicalUrl = new URL(context.path, window.location.origin);
        this.updateCanonicalUrl(canonicalUrl.href);
    }

    updateMetaTags(meta) {
        Object.entries(meta).forEach(([name, content]) => {
            let metaTag = document.querySelector(`meta[name="${name}"]`);
            
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.setAttribute('name', name);
                document.head.appendChild(metaTag);
            }
            
            metaTag.setAttribute('content', content);
        });
    }

    updateCanonicalUrl(url) {
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
        }
        
        canonicalLink.setAttribute('href', url);
    }

    handleScrollBehavior(scrollOption) {
        const option = scrollOption || this.config.scrollBehavior;
        
        if (option === false) return;
        
        if (option === 'top' || option === 'smooth') {
            window.scrollTo({
                top: 0,
                behavior: option === 'smooth' ? 'smooth' : 'auto'
            });
        } else if (typeof option === 'object') {
            window.scrollTo({
                top: option.top || 0,
                left: option.left || 0,
                behavior: option.behavior || 'auto'
            });
        }
    }

    /**
     * Cache management
     */
    cacheComponent(path, component) {
        // Remove oldest entries if cache is full
        if (this.state.cache.size >= this.config.cacheSize) {
            const firstKey = this.state.cache.keys().next().value;
            this.state.cache.delete(firstKey);
        }
        
        this.state.cache.set(path, component);
    }

    clearCache() {
        this.state.cache.clear();
    }

    /**
     * History management
     */
    addToHistory(route) {
        this.state.history.push({
            ...route,
            timestamp: Date.now()
        });
        
        // Keep history limited
        if (this.state.history.length > 50) {
            this.state.history = this.state.history.slice(-25);
        }
    }

    /**
     * Navigation methods
     */
    back() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigate(this.config.defaultRoute);
        }
    }

    forward() {
        window.history.forward();
    }

    replace(path) {
        return this.navigate(path, { replace: true });
    }

    reload() {
        const currentPath = this.getCurrentPath();
        this.clearCache();
        return this.navigate(currentPath, { force: true });
    }

    /**
     * Preloading
     */
    preload(path) {
        if (!this.config.enablePreloading) return;
        
        this.preloadQueue.add(path);
        
        if (!document.hidden) {
            this.processPreloadQueue();
        }
    }

    async processPreloadQueue() {
        for (const path of this.preloadQueue) {
            try {
                const route = this.matchRoute(path);
                if (route && !this.state.cache.has(route.path)) {
                    await this.loadComponent(route, { path, preload: true });
                }
            } catch (error) {
                console.warn(`Failed to preload route: ${path}`, error);
            }
            
            this.preloadQueue.delete(path);
        }
    }

    /**
     * Event handling
     */
    on(event, handler) {
        if (this.listeners[event]) {
            this.listeners[event].push(handler);
        }
        return this;
    }

    off(event, handler) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(handler);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
        return this;
    }

    async triggerEvent(event, data) {
        if (!this.listeners[event]) return true;
        
        const promises = this.listeners[event].map(handler => {
            try {
                return handler(data);
            } catch (error) {
                console.error(`Event handler error for "${event}":`, error);
                return true;
            }
        });
        
        const results = await Promise.all(promises);
        
        // If any handler returns false, cancel the operation
        return !results.includes(false);
    }

    /**
     * Route guards
     */
    setupDefaultGuards() {
        // Validate algorithm parameter
        this.addGuard('validateAlgorithm', (context) => {
            const { algorithm } = context.params;
            const validAlgorithms = ['kmeans', 'dbscan', 'hierarchical'];
            
            if (algorithm && !validAlgorithms.includes(algorithm.toLowerCase())) {
                console.warn(`Invalid algorithm: ${algorithm}`);
                return false;
            }
            
            return true;
        });

        // Validate documentation section
        this.addGuard('validateSection', (context) => {
            const { section } = context.params;
            const validSections = ['api', 'examples', 'guides', 'reference'];
            
            if (section && !validSections.includes(section.toLowerCase())) {
                console.warn(`Invalid documentation section: ${section}`);
                return false;
            }
            
            return true;
        });
    }

    /**
     * Public API methods
     */
    getCurrentRoute() {
        return this.state.currentRoute;
    }

    getPreviousRoute() {
        return this.state.previousRoute;
    }

    getHistory() {
        return [...this.state.history];
    }

    isCurrentRoute(path) {
        return this.state.currentRoute?.path === this.normalizePath(path);
    }

    /**
     * Error handling
     */
    handleError(error) {
        console.error('Router error:', error);
        
        // Try to navigate to error page
        this.navigate(this.config.notFoundRoute, { replace: true });
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log('🧹 Cleaning up Router...');
        
        // Remove event listeners
        window.removeEventListener('popstate', this.handlePopState.bind(this));
        window.removeEventListener('hashchange', this.handleHashChange.bind(this));
        document.removeEventListener('click', this.handleLinkClick.bind(this));
        document.removeEventListener('submit', this.handleFormSubmit.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Clear state
        this.state.cache.clear();
        this.state.history = [];
        this.routes.clear();
        this.middlewares = [];
        this.guards = [];
        
        // Clear listeners
        Object.keys(this.listeners).forEach(key => {
            this.listeners[key] = [];
        });
    }
}

// Singleton instance
let routerInstance = null;

export function getRouter(options = {}) {
    if (!routerInstance) {
        routerInstance = new Router(options);
        routerInstance.setupDefaultGuards();
    }
    return routerInstance;
}

export function navigate(path, options = {}) {
    const router = getRouter();
    return router.navigate(path, options);
}

export function getCurrentRoute() {
    const router = getRouter();
    return router.getCurrentRoute();
}