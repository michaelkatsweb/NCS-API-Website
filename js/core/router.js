/**
 * NCS-API Website - Client-Side Router
 * Modern SPA routing with hash and history API support
 * 
 * Features:
 * - Hash-based and HTML5 History API routing
 * - Route parameters and query strings
 * - Route guards and middleware
 * - Lazy loading of page components
 * - Smooth transitions between pages
 * - SEO-friendly URLs
 */

import { CONFIG } from '../config/constants.js';

export class Router {
    constructor(options = {}) {
        this.options = {
            mode: 'history', // 'hash' or 'history'
            base: '/',
            linkSelector: 'a[data-route]',
            enableTransitions: true,
            transitionDuration: 300,
            enableAnalytics: true,
            ...options
        };
        
        // Route configuration
        this.routes = new Map();
        this.middleware = [];
        this.guards = new Map();
        
        // Current state
        this.currentRoute = null;
        this.previousRoute = null;
        this.isNavigating = false;
        this.history = [];
        
        // Route cache for performance
        this.routeCache = new Map();
        this.componentCache = new Map();
        
        // Event handlers
        this.beforeNavigateHandlers = [];
        this.afterNavigateHandlers = [];
        this.routeChangeHandlers = [];
        
        // Browser history management
        this.historyState = [];
        this.maxHistoryLength = 50;
        
        // Performance monitoring
        this.navigationTimes = [];
        this.routeMetrics = new Map();
        
        if (CONFIG.IS_DEV) {
            console.log('🧭 Router initialized with options:', this.options);
        }
        
        this.init();
    }

    /**
     * Initialize router
     */
    init() {
        // Configure default routes
        this.setupDefaultRoutes();
        
        // Setup browser event listeners
        this.setupEventListeners();
        
        // Handle initial route
        this.handleInitialRoute();
        
        // Setup route link handlers
        this.setupLinkHandlers();
        
        if (CONFIG.IS_DEV) {
            this.enableDebugMode();
        }
    }

    /**
     * Setup default routes for the application
     */
    setupDefaultRoutes() {
        // Home page
        this.addRoute('/', {
            name: 'home',
            title: 'NCS-API - Advanced Clustering Solutions',
            component: () => import('../pages/landing.js'),
            meta: {
                description: 'Advanced clustering algorithms API for real-time data analysis',
                keywords: 'clustering, API, machine learning, data analysis',
                canonical: '/'
            }
        });
        
        // Playground
        this.addRoute('/playground', {
            name: 'playground',
            title: 'Interactive Clustering Playground',
            component: () => import('../pages/playground.js'),
            meta: {
                description: 'Try our clustering algorithms with your own data',
                keywords: 'clustering playground, interactive, demo',
                canonical: '/playground'
            }
        });
        
        // API Documentation
        this.addRoute('/docs', {
            name: 'docs',
            title: 'API Documentation',
            component: () => import('../pages/docs.js'),
            meta: {
                description: 'Complete API documentation and examples',
                keywords: 'API docs, documentation, examples',
                canonical: '/docs'
            }
        });
        
        // Performance Benchmarks
        this.addRoute('/benchmarks', {
            name: 'benchmarks',
            title: 'Performance Benchmarks',
            component: () => import('../pages/benchmarks.js'),
            meta: {
                description: 'Performance metrics and algorithm comparisons',
                keywords: 'performance, benchmarks, clustering algorithms',
                canonical: '/benchmarks'
            }
        });
        
        // Examples and Use Cases
        this.addRoute('/examples', {
            name: 'examples',
            title: 'Examples & Use Cases',
            component: () => import('../pages/examples.js'),
            meta: {
                description: 'Real-world clustering examples and implementations',
                keywords: 'examples, use cases, implementations',
                canonical: '/examples'
            }
        });
        
        // Dynamic API route
        this.addRoute('/api/:endpoint?', {
            name: 'api-explorer',
            title: 'API Explorer',
            component: () => import('../components/ApiExplorer.js'),
            meta: {
                description: 'Interactive API endpoint explorer',
                canonical: '/api'
            },
            beforeEnter: (to, from, next) => {
                // Validate API endpoint exists
                if (to.params.endpoint && !this.isValidApiEndpoint(to.params.endpoint)) {
                    next('/docs');
                    return;
                }
                next();
            }
        });
        
        // 404 catch-all
        this.addRoute('*', {
            name: '404',
            title: 'Page Not Found',
            component: () => import('../components/NotFound.js'),
            meta: {
                description: 'Page not found',
                noindex: true
            }
        });
    }

    /**
     * Add a route to the router
     */
    addRoute(path, config) {
        // Normalize path
        const normalizedPath = this.normalizePath(path);
        
        // Convert path to regex pattern
        const pattern = this.pathToRegex(normalizedPath);
        
        // Store route configuration
        const route = {
            path: normalizedPath,
            pattern,
            paramNames: this.extractParamNames(normalizedPath),
            ...config
        };
        
        this.routes.set(normalizedPath, route);
        
        if (CONFIG.IS_DEV) {
            console.log(`🛣️ Route added: ${normalizedPath}`, route);
        }
        
        return this;
    }

    /**
     * Navigate to a specific route
     */
    async navigate(path, options = {}) {
        const startTime = performance.now();
        
        if (this.isNavigating) {
            if (CONFIG.IS_DEV) {
                console.warn('🚧 Navigation in progress, ignoring new navigation');
            }
            return false;
        }
        
        this.isNavigating = true;
        
        try {
            // Normalize the path
            const normalizedPath = this.normalizePath(path);
            
            // Parse URL components
            const urlComponents = this.parseUrl(normalizedPath);
            
            // Find matching route
            const matchedRoute = this.matchRoute(urlComponents.pathname);
            
            if (!matchedRoute) {
                console.warn(`🚫 No route found for: ${normalizedPath}`);
                this.isNavigating = false;
                return this.navigate('/404');
            }
            
            // Create route context
            const to = {
                ...matchedRoute,
                path: normalizedPath,
                fullPath: normalizedPath,
                params: this.extractParams(matchedRoute, urlComponents.pathname),
                query: urlComponents.query,
                hash: urlComponents.hash
            };
            
            const from = this.currentRoute;
            
            // Run route guards
            const canNavigate = await this.runRouteGuards(to, from);
            if (!canNavigate) {
                this.isNavigating = false;
                return false;
            }
            
            // Trigger before navigation event
            await this.triggerBeforeNavigate(to, from);
            
            // Run middleware
            await this.runMiddleware(to, from);
            
            // Update browser history
            this.updateBrowserHistory(normalizedPath, to, options);
            
            // Load and render the component
            await this.loadAndRenderComponent(to);
            
            // Update route state
            this.previousRoute = this.currentRoute;
            this.currentRoute = to;
            
            // Update metadata
            this.updatePageMetadata(to);
            
            // Track navigation metrics
            const navigationTime = performance.now() - startTime;
            this.trackNavigation(to, navigationTime);
            
            // Trigger after navigation event
            await this.triggerAfterNavigate(to, from);
            
            if (CONFIG.IS_DEV) {
                console.log(`🧭 Navigated to: ${normalizedPath} (${navigationTime.toFixed(2)}ms)`);
            }
            
            return true;
            
        } catch (error) {
            console.error('🚨 Navigation error:', error);
            return false;
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * Setup browser event listeners
     */
    setupEventListeners() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
        
        // Handle link clicks
        document.addEventListener('click', (event) => {
            this.handleLinkClick(event);
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentRoute) {
                this.trackPageView(this.currentRoute);
            }
        });
    }

    /**
     * Handle initial route on page load
     */
    handleInitialRoute() {
        const currentPath = this.getCurrentPath();
        this.navigate(currentPath, { replace: true });
    }

    /**
     * Match route pattern
     */
    matchRoute(pathname) {
        // Check exact matches first
        for (const [path, route] of this.routes) {
            if (path === pathname) {
                return route;
            }
        }
        
        // Check pattern matches
        for (const [path, route] of this.routes) {
            if (route.pattern && route.pattern.test(pathname)) {
                return route;
            }
        }
        
        // Check wildcard
        return this.routes.get('*') || null;
    }

    /**
     * Load and render component
     */
    async loadAndRenderComponent(route) {
        try {
            // Check cache first
            if (this.componentCache.has(route.path)) {
                const cachedComponent = this.componentCache.get(route.path);
                if (cachedComponent && typeof cachedComponent.render === 'function') {
                    cachedComponent.render();
                    return;
                }
            }
            
            // Dynamic import
            if (typeof route.component === 'function') {
                const modulePromise = route.component();
                const module = await modulePromise;
                
                // Get the component class or function
                const ComponentClass = module.default || module[Object.keys(module)[0]];
                
                if (ComponentClass) {
                    const componentInstance = new ComponentClass(route);
                    
                    // Cache the component
                    this.componentCache.set(route.path, componentInstance);
                    
                    // Render the component
                    if (typeof componentInstance.render === 'function') {
                        componentInstance.render();
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load component for route: ${route.path}`, error);
            // Fallback to 404
            if (route.path !== '/404') {
                this.navigate('/404');
            }
        }
    }

    /**
     * Update page metadata
     */
    updatePageMetadata(route) {
        // Update document title
        if (route.title) {
            document.title = route.title;
        }
        
        // Update meta tags
        if (route.meta) {
            this.updateMetaTags(route.meta);
        }
        
        // Update canonical URL
        this.updateCanonicalUrl(route.meta?.canonical || route.path);
    }

    /**
     * Update meta tags
     */
    updateMetaTags(meta) {
        Object.entries(meta).forEach(([key, value]) => {
            if (key === 'description') {
                this.updateMetaTag('description', value);
            } else if (key === 'keywords') {
                this.updateMetaTag('keywords', value);
            } else if (key === 'noindex' && value) {
                this.updateMetaTag('robots', 'noindex, nofollow');
            }
        });
    }

    /**
     * Update individual meta tag
     */
    updateMetaTag(name, content) {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('name', name);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    }

    /**
     * Update canonical URL
     */
    updateCanonicalUrl(path) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', `${window.location.origin}${path}`);
    }

    /**
     * Utility methods
     */
    normalizePath(path) {
        if (!path || path === '/') return '/';
        return path.replace(/\/+/g, '/').replace(/\/$/, '');
    }

    getCurrentPath() {
        return this.options.mode === 'hash' 
            ? window.location.hash.slice(1) || '/'
            : window.location.pathname;
    }

    parseUrl(url) {
        const urlObj = new URL(url, window.location.origin);
        return {
            pathname: urlObj.pathname,
            query: Object.fromEntries(urlObj.searchParams),
            hash: urlObj.hash
        };
    }

    pathToRegex(path) {
        if (path === '*') {
            return /.*/;
        }
        
        const regexStr = path
            .replace(/:[^/]+/g, '([^/]+)')
            .replace(/\*/g, '.*');
        
        return new RegExp(`^${regexStr}$`);
    }

    extractParamNames(path) {
        const matches = path.match(/:[^/]+/g);
        return matches ? matches.map(match => match.slice(1)) : [];
    }

    extractParams(route, pathname) {
        if (!route.paramNames.length) return {};
        
        const matches = pathname.match(route.pattern);
        if (!matches) return {};
        
        const params = {};
        route.paramNames.forEach((name, index) => {
            params[name] = matches[index + 1];
        });
        
        return params;
    }

    updateBrowserHistory(path, route, options) {
        const historyMethod = options.replace ? 'replaceState' : 'pushState';
        const state = { route: route.name, timestamp: Date.now() };
        
        if (this.options.mode === 'history') {
            window.history[historyMethod](state, route.title || '', path);
        } else {
            window.location.hash = path;
        }
    }

    handlePopState(event) {
        const currentPath = this.getCurrentPath();
        this.navigate(currentPath, { fromPopState: true });
    }

    handleLinkClick(event) {
        const link = event.target.closest('a');
        if (!link) return;
        
        // Check if it's a route link
        if (link.hasAttribute('data-route') || 
            (link.href && link.href.startsWith(window.location.origin))) {
            
            event.preventDefault();
            const path = link.getAttribute('data-route') || 
                        new URL(link.href).pathname;
            this.navigate(path);
        }
    }

    async runRouteGuards(to, from) {
        if (to.beforeEnter) {
            return new Promise((resolve) => {
                to.beforeEnter(to, from, (result) => {
                    if (result === false) {
                        resolve(false);
                    } else if (typeof result === 'string') {
                        this.navigate(result);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }
        return true;
    }

    async runMiddleware(to, from) {
        for (const middleware of this.middleware) {
            try {
                await middleware(to, from);
            } catch (error) {
                console.error('Middleware error:', error);
            }
        }
    }

    async triggerBeforeNavigate(to, from) {
        const promises = this.beforeNavigateHandlers.map(handler => {
            try {
                return handler(to, from);
            } catch (error) {
                console.error('Before navigate handler error:', error);
                return true;
            }
        });
        
        await Promise.all(promises);
    }

    async triggerAfterNavigate(to, from) {
        const promises = this.afterNavigateHandlers.map(handler => {
            try {
                return handler(to, from);
            } catch (error) {
                console.error('After navigate handler error:', error);
            }
        });
        
        await Promise.all(promises);
    }

    trackNavigation(route, time) {
        this.navigationTimes.push(time);
        
        // Keep only last 100 navigation times
        if (this.navigationTimes.length > 100) {
            this.navigationTimes = this.navigationTimes.slice(-100);
        }
        
        // Track route metrics
        if (!this.routeMetrics.has(route.name)) {
            this.routeMetrics.set(route.name, {
                visits: 0,
                totalTime: 0,
                averageTime: 0
            });
        }
        
        const metrics = this.routeMetrics.get(route.name);
        metrics.visits++;
        metrics.totalTime += time;
        metrics.averageTime = metrics.totalTime / metrics.visits;
        
        // Track analytics
        if (this.options.enableAnalytics && CONFIG.ENABLE_ANALYTICS) {
            this.trackPageView(route);
        }
    }

    trackPageView(route) {
        if (window.gtag) {
            window.gtag('config', CONFIG.ANALYTICS_ID, {
                page_title: route.title,
                page_location: window.location.href,
                page_path: route.path
            });
        }
        
        if (CONFIG.IS_DEV) {
            console.log('📊 Page view tracked:', route.name);
        }
    }

    isValidApiEndpoint(endpoint) {
        const validEndpoints = [
            'cluster', 'health', 'metrics', 'algorithms',
            'datasets', 'export', 'stream', 'status'
        ];
        return validEndpoints.includes(endpoint);
    }

    setupLinkHandlers() {
        // Add data-route attributes to internal links
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                link.setAttribute('data-route', href);
            }
        });
    }

    enableDebugMode() {
        console.log('🔧 Router debug mode enabled');
        
        // Add global router access for debugging
        window.NCSRouter = this;
        
        // Log all navigation events
        this.beforeNavigateHandlers.push((to, from) => {
            console.log('🧭 Before navigate:', from?.name || 'none', '→', to.name);
        });
        
        this.afterNavigateHandlers.push((to, from) => {
            console.log('🧭 After navigate:', from?.name || 'none', '→', to.name);
        });
    }

    /**
     * Public API methods
     */
    push(path) {
        return this.navigate(path);
    }

    replace(path) {
        return this.navigate(path, { replace: true });
    }

    back() {
        window.history.back();
    }

    forward() {
        window.history.forward();
    }

    go(delta) {
        window.history.go(delta);
    }

    beforeEach(handler) {
        this.beforeNavigateHandlers.push(handler);
        return this;
    }

    afterEach(handler) {
        this.afterNavigateHandlers.push(handler);
        return this;
    }

    getMetrics() {
        return {
            currentRoute: this.currentRoute,
            navigationTimes: this.navigationTimes,
            routeMetrics: Object.fromEntries(this.routeMetrics),
            cacheSize: this.componentCache.size,
            averageNavigationTime: this.navigationTimes.length > 0 
                ? this.navigationTimes.reduce((a, b) => a + b) / this.navigationTimes.length 
                : 0
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('popstate', this.handlePopState);
        document.removeEventListener('click', this.handleLinkClick);
        
        // Clear caches
        this.routeCache.clear();
        this.componentCache.clear();
        
        // Clear handlers
        this.beforeNavigateHandlers = [];
        this.afterNavigateHandlers = [];
        this.routeChangeHandlers = [];
        
        console.log('🗑️ Router destroyed');
    }
}

// Create and export default router instance
export const router = new Router();
export default Router;