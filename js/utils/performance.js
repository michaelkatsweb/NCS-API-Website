/**
 * Performance Monitoring System
 * Real-time performance tracking and optimization
 * 
 * Features:
 * - Core Web Vitals monitoring
 * - Memory usage tracking
 * - FPS monitoring
 * - Network performance
 * - Custom metrics
 * - Performance budgets
 */

export class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableMetrics: true,
            enableProfiling: false,
            reportInterval: 30000, // 30 seconds
            sampleRate: 1.0, // 100% sampling
            maxEntries: 1000,
            enableConsoleLogging: true,
            ...options
        };
        
        this.metrics = {
            // Core Web Vitals
            fcp: null,
            lcp: null,
            fid: null,
            cls: null,
            ttfb: null,
            
            // Custom metrics
            memoryUsage: [],
            fps: [],
            networkRequests: [],
            errors: [],
            userTiming: [],
            
            // Performance entries
            entries: []
        };
        
        this.observers = new Map();
        this.isEnabled = this.options.enableMetrics;
        this.startTime = performance.now();
        
        // Performance budgets (milliseconds)
        this.budgets = {
            fcp: 1800,
            lcp: 2500,
            fid: 100,
            cls: 0.1,
            ttfb: 800
        };
        
        if (this.isEnabled) {
            this.initialize();
        }
    }

    /**
     * Initialize performance monitoring
     */
    initialize() {
        console.log('📊 Performance monitoring initialized');
        
        // Setup performance observers
        this.setupCoreWebVitalsObserver();
        this.setupNavigationObserver();
        this.setupResourceObserver();
        this.setupUserTimingObserver();
        
        // Start memory monitoring
        this.startMemoryMonitoring();
        
        // Start FPS monitoring
        this.startFPSMonitoring();
        
        // Setup periodic reporting
        if (this.options.reportInterval > 0) {
            this.startPeriodicReporting();
        }
        
        // Setup error tracking
        this.setupErrorTracking();
        
        // Expose to global scope in debug mode
        if (this.options.enableProfiling) {
            window.NCS_Performance = this;
        }
    }

    /**
     * Setup Core Web Vitals observer
     */
    setupCoreWebVitalsObserver() {
        if (!('PerformanceObserver' in window)) {
            console.warn('PerformanceObserver not supported');
            return;
        }

        try {
            // First Contentful Paint & Largest Contentful Paint
            const paintObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.fcp = entry.startTime;
                        this.checkBudget('fcp', entry.startTime);
                    }
                });
            });
            paintObserver.observe({ type: 'paint', buffered: true });
            this.observers.set('paint', paintObserver);

            // Largest Contentful Paint
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.startTime;
                this.checkBudget('lcp', lastEntry.startTime);
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            this.observers.set('lcp', lcpObserver);

            // First Input Delay
            const fidObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    const fid = entry.processingStart - entry.startTime;
                    this.metrics.fid = fid;
                    this.checkBudget('fid', fid);
                });
            });
            fidObserver.observe({ type: 'first-input', buffered: true });
            this.observers.set('fid', fidObserver);

            // Cumulative Layout Shift
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        this.metrics.cls = clsValue;
                        this.checkBudget('cls', clsValue);
                    }
                });
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            this.observers.set('cls', clsObserver);

        } catch (error) {
            console.warn('Failed to setup Core Web Vitals observer:', error);
        }
    }

    /**
     * Setup navigation observer
     */
    setupNavigationObserver() {
        try {
            const navObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.processNavigationEntry(entry);
                });
            });
            navObserver.observe({ type: 'navigation', buffered: true });
            this.observers.set('navigation', navObserver);
        } catch (error) {
            console.warn('Failed to setup navigation observer:', error);
        }
    }

    /**
     * Setup resource observer
     */
    setupResourceObserver() {
        try {
            const resourceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.processResourceEntry(entry);
                });
            });
            resourceObserver.observe({ type: 'resource', buffered: true });
            this.observers.set('resource', resourceObserver);
        } catch (error) {
            console.warn('Failed to setup resource observer:', error);
        }
    }

    /**
     * Setup user timing observer
     */
    setupUserTimingObserver() {
        try {
            const userTimingObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.metrics.userTiming.push({
                        name: entry.name,
                        entryType: entry.entryType,
                        startTime: entry.startTime,
                        duration: entry.duration,
                        timestamp: Date.now()
                    });
                });
            });
            userTimingObserver.observe({ type: 'measure', buffered: true });
            userTimingObserver.observe({ type: 'mark', buffered: true });
            this.observers.set('userTiming', userTimingObserver);
        } catch (error) {
            console.warn('Failed to setup user timing observer:', error);
        }
    }

    /**
     * Process navigation entry
     */
    processNavigationEntry(entry) {
        // Time to First Byte
        this.metrics.ttfb = entry.responseStart - entry.requestStart;
        this.checkBudget('ttfb', this.metrics.ttfb);

        // Store detailed timing
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: this.metrics.ttfb,
            download: entry.responseEnd - entry.responseStart,
            domProcessing: entry.domContentLoadedEventStart - entry.responseEnd,
            onLoad: entry.loadEventEnd - entry.loadEventStart,
            total: entry.loadEventEnd - entry.navigationStart
        };

        this.metrics.entries.push({
            type: 'navigation',
            timing,
            timestamp: Date.now()
        });

        if (this.options.enableConsoleLogging) {
            console.log('📊 Navigation timing:', timing);
        }
    }

    /**
     * Process resource entry
     */
    processResourceEntry(entry) {
        // Track network requests
        this.metrics.networkRequests.push({
            name: entry.name,
            type: this.getResourceType(entry),
            size: entry.transferSize || 0,
            duration: entry.duration,
            timestamp: Date.now()
        });

        // Keep only recent entries
        if (this.metrics.networkRequests.length > this.options.maxEntries) {
            this.metrics.networkRequests.shift();
        }
    }

    /**
     * Get resource type from entry
     */
    getResourceType(entry) {
        if (entry.initiatorType) {
            return entry.initiatorType;
        }
        
        const url = new URL(entry.name, window.location.origin);
        const extension = url.pathname.split('.').pop().toLowerCase();
        
        if (['js', 'ts', 'jsx', 'tsx'].includes(extension)) return 'script';
        if (['css', 'scss', 'sass'].includes(extension)) return 'stylesheet';
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
        if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) return 'font';
        if (['mp4', 'webm', 'ogv'].includes(extension)) return 'video';
        if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
        if (['json', 'xml'].includes(extension)) return 'fetch';
        
        return 'other';
    }

    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        if (!('memory' in performance)) {
            console.warn('Memory API not supported');
            return;
        }

        const collectMemory = () => {
            const memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            this.metrics.memoryUsage.push(memory);

            // Keep only recent entries
            if (this.metrics.memoryUsage.length > this.options.maxEntries) {
                this.metrics.memoryUsage.shift();
            }

            // Check for memory leaks
            this.checkMemoryUsage(memory);
        };

        // Collect immediately and then every 5 seconds
        collectMemory();
        setInterval(collectMemory, 5000);
    }

    /**
     * Start FPS monitoring
     */
    startFPSMonitoring() {
        let frames = 0;
        let lastTime = performance.now();

        const measureFPS = () => {
            frames++;
            const now = performance.now();
            
            if (now - lastTime >= 1000) { // Every second
                const fps = Math.round((frames * 1000) / (now - lastTime));
                
                this.metrics.fps.push({
                    value: fps,
                    timestamp: Date.now()
                });

                // Keep only recent entries
                if (this.metrics.fps.length > this.options.maxEntries) {
                    this.metrics.fps.shift();
                }

                frames = 0;
                lastTime = now;
            }
            
            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    }

    /**
     * Setup error tracking
     */
    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.trackError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Track custom error
     */
    trackError(error) {
        this.metrics.errors.push(error);

        // Keep only recent errors
        if (this.metrics.errors.length > this.options.maxEntries) {
            this.metrics.errors.shift();
        }

        if (this.options.enableConsoleLogging) {
            console.warn('📊 Error tracked:', error);
        }
    }

    /**
     * Check performance budgets
     */
    checkBudget(metric, value) {
        const budget = this.budgets[metric];
        if (budget && value > budget) {
            const over = value - budget;
            const percentage = ((over / budget) * 100).toFixed(1);
            
            console.warn(`📊 Performance budget exceeded for ${metric.toUpperCase()}: ${value.toFixed(2)}ms (${percentage}% over budget)`);
            
            // Emit event for further handling
            this.emit('budget-exceeded', {
                metric,
                value,
                budget,
                overage: over,
                percentage
            });
        }
    }

    /**
     * Check memory usage for potential leaks
     */
    checkMemoryUsage(memory) {
        const usagePercentage = (memory.used / memory.limit) * 100;
        
        if (usagePercentage > 80) {
            console.warn(`📊 High memory usage: ${usagePercentage.toFixed(1)}%`);
            this.emit('high-memory-usage', { memory, percentage: usagePercentage });
        }
    }

    /**
     * Start periodic reporting
     */
    startPeriodicReporting() {
        setInterval(() => {
            if (Math.random() < this.options.sampleRate) {
                this.generateReport();
            }
        }, this.options.reportInterval);
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            uptime: performance.now() - this.startTime,
            coreWebVitals: {
                fcp: this.metrics.fcp,
                lcp: this.metrics.lcp,
                fid: this.metrics.fid,
                cls: this.metrics.cls,
                ttfb: this.metrics.ttfb
            },
            currentMetrics: {
                memory: this.getCurrentMemoryUsage(),
                fps: this.getCurrentFPS(),
                errors: this.metrics.errors.length,
                networkRequests: this.metrics.networkRequests.length
            },
            performance: this.getPerformanceScore()
        };

        if (this.options.enableConsoleLogging) {
            console.log('📊 Performance report:', report);
        }

        this.emit('performance-report', report);
        return report;
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        if (!('memory' in performance)) return null;
        
        return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        };
    }

    /**
     * Get current FPS
     */
    getCurrentFPS() {
        if (this.metrics.fps.length === 0) return null;
        
        const recent = this.metrics.fps.slice(-10); // Last 10 measurements
        const average = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
        
        return Math.round(average);
    }

    /**
     * Calculate performance score (0-100)
     */
    getPerformanceScore() {
        let score = 100;
        
        // Core Web Vitals scoring
        if (this.metrics.fcp && this.metrics.fcp > this.budgets.fcp) {
            score -= Math.min(20, (this.metrics.fcp - this.budgets.fcp) / 100);
        }
        
        if (this.metrics.lcp && this.metrics.lcp > this.budgets.lcp) {
            score -= Math.min(25, (this.metrics.lcp - this.budgets.lcp) / 100);
        }
        
        if (this.metrics.fid && this.metrics.fid > this.budgets.fid) {
            score -= Math.min(25, (this.metrics.fid - this.budgets.fid) / 10);
        }
        
        if (this.metrics.cls && this.metrics.cls > this.budgets.cls) {
            score -= Math.min(30, (this.metrics.cls - this.budgets.cls) * 100);
        }
        
        return Math.max(0, Math.round(score));
    }

    /**
     * Mark custom timing
     */
    mark(name) {
        performance.mark(name);
    }

    /**
     * Measure custom timing
     */
    measure(name, startMark, endMark) {
        try {
            performance.measure(name, startMark, endMark);
        } catch (error) {
            console.warn(`Failed to measure ${name}:`, error);
        }
    }

    /**
     * Time a function execution
     */
    time(name, fn) {
        const startMark = `${name}-start`;
        const endMark = `${name}-end`;
        
        this.mark(startMark);
        const result = fn();
        this.mark(endMark);
        this.measure(name, startMark, endMark);
        
        return result;
    }

    /**
     * Time an async function execution
     */
    async timeAsync(name, fn) {
        const startMark = `${name}-start`;
        const endMark = `${name}-end`;
        
        this.mark(startMark);
        const result = await fn();
        this.mark(endMark);
        this.measure(name, startMark, endMark);
        
        return result;
    }

    /**
     * Get all metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get specific metric
     */
    getMetric(name) {
        return this.metrics[name];
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        Object.keys(this.metrics).forEach(key => {
            if (Array.isArray(this.metrics[key])) {
                this.metrics[key] = [];
            } else {
                this.metrics[key] = null;
            }
        });
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.disconnect();
        } else if (this.observers.size === 0) {
            this.initialize();
        }
    }

    /**
     * Event system for performance events
     */
    emit(event, data) {
        if (typeof window !== 'undefined' && window.NCS && window.NCS.eventBus) {
            window.NCS.eventBus.emit(`performance:${event}`, data);
        }
    }

    /**
     * Disconnect all observers
     */
    disconnect() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.disconnect();
        this.clearMetrics();
        
        if (window.NCS_Performance === this) {
            delete window.NCS_Performance;
        }
        
        console.log('📊 Performance monitor destroyed');
    }
}

export default PerformanceMonitor;