/**
 * NCS-API Website - Performance Monitoring Utility
 * Real-time performance tracking and optimization
 * 
 * Features:
 * - Core Web Vitals monitoring
 * - Custom metrics tracking
 * - Error tracking and reporting
 * - Memory usage monitoring
 * - Network performance tracking
 * - User experience metrics
 */

import { CONFIG } from '../config/constants.js';

export class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            sampleRate: CONFIG.PERFORMANCE_SAMPLE_RATE || 1.0,
            reportInterval: CONFIG.PERFORMANCE_REPORT_INTERVAL || 30000,
            enableCoreWebVitals: true,
            enableCustomMetrics: true,
            enableErrorTracking: true,
            enableNetworkMonitoring: true,
            enableMemoryMonitoring: true,
            bufferSize: 1000,
            ...options
        };
        
        // Performance data storage
        this.metrics = {
            // Core Web Vitals
            lcp: null,           // Largest Contentful Paint
            fid: null,           // First Input Delay
            cls: null,           // Cumulative Layout Shift
            fcp: null,           // First Contentful Paint
            ttfb: null,          // Time to First Byte
            
            // Custom metrics
            custom: new Map(),
            
            // Navigation timing
            navigation: {},
            
            // Resource timing
            resources: [],
            
            // Memory usage
            memory: {
                usedJSHeapSize: 0,
                totalJSHeapSize: 0,
                jsHeapSizeLimit: 0
            },
            
            // Errors
            errors: [],
            
            // User interactions
            interactions: [],
            
            // Network quality
            connection: {},
            
            // Frame performance
            frames: {
                dropped: 0,
                total: 0,
                averageFPS: 60
            }
        };
        
        // Performance observers
        this.observers = {
            lcp: null,
            fid: null,
            cls: null,
            longtask: null,
            navigation: null,
            resource: null,
            measure: null
        };
        
        // Timing data
        this.timings = {
            marks: new Map(),
            measures: new Map(),
            intervals: new Map()
        };
        
        // Reporting
        this.reportTimer = null;
        this.isReporting = false;
        
        // Session data
        this.sessionId = this.generateSessionId();
        this.startTime = performance.now();
        this.pageLoadTime = null;
        
        if (CONFIG.IS_DEV) {
            console.log('📊 Performance Monitor initialized:', this.options);
        }
        
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        try {
            // Setup Core Web Vitals monitoring
            if (this.options.enableCoreWebVitals) {
                this.setupCoreWebVitals();
            }
            
            // Setup navigation timing
            this.setupNavigationTiming();
            
            // Setup resource timing
            this.setupResourceTiming();
            
            // Setup memory monitoring
            if (this.options.enableMemoryMonitoring) {
                this.setupMemoryMonitoring();
            }
            
            // Setup network monitoring
            if (this.options.enableNetworkMonitoring) {
                this.setupNetworkMonitoring();
            }
            
            // Setup error tracking
            if (this.options.enableErrorTracking) {
                this.setupErrorTracking();
            }
            
            // Setup frame rate monitoring
            this.setupFrameRateMonitoring();
            
            // Setup user interaction tracking
            this.setupInteractionTracking();
            
            // Start periodic reporting
            this.startReporting();
            
            // Track page load completion
            this.trackPageLoad();
            
            console.log('✅ Performance monitoring started');
            
        } catch (error) {
            console.error('❌ Failed to initialize performance monitoring:', error);
        }
    }

    /**
     * Setup Core Web Vitals monitoring
     */
    setupCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window && 'largest-contentful-paint' in PerformanceEntry.prototype) {
            this.observers.lcp = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = {
                    value: lastEntry.startTime,
                    element: lastEntry.element,
                    timestamp: Date.now()
                };
                
                if (CONFIG.IS_DEV) {
                    console.log('📊 LCP:', this.metrics.lcp.value.toFixed(2) + 'ms');
                }
            });
            
            this.observers.lcp.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        // First Input Delay (FID)
        if ('PerformanceObserver' in window && 'first-input' in PerformanceEntry.prototype) {
            this.observers.fid = new PerformanceObserver((list) => {
                const firstInput = list.getEntries()[0];
                this.metrics.fid = {
                    value: firstInput.processingStart - firstInput.startTime,
                    eventType: firstInput.name,
                    timestamp: Date.now()
                };
                
                if (CONFIG.IS_DEV) {
                    console.log('📊 FID:', this.metrics.fid.value.toFixed(2) + 'ms');
                }
            });
            
            this.observers.fid.observe({ entryTypes: ['first-input'] });
        }
        
        // Cumulative Layout Shift (CLS)
        if ('PerformanceObserver' in window && 'layout-shift' in PerformanceEntry.prototype) {
            let clsValue = 0;
            
            this.observers.cls = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                
                this.metrics.cls = {
                    value: clsValue,
                    timestamp: Date.now()
                };
                
                if (CONFIG.IS_DEV) {
                    console.log('📊 CLS:', this.metrics.cls.value.toFixed(4));
                }
            });
            
            this.observers.cls.observe({ entryTypes: ['layout-shift'] });
        }
        
        // First Contentful Paint (FCP)
        if ('PerformanceObserver' in window && 'paint' in PerformanceEntry.prototype) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.fcp = {
                            value: entry.startTime,
                            timestamp: Date.now()
                        };
                        
                        if (CONFIG.IS_DEV) {
                            console.log('📊 FCP:', this.metrics.fcp.value.toFixed(2) + 'ms');
                        }
                    }
                }
            });
            
            observer.observe({ entryTypes: ['paint'] });
        }
    }

    /**
     * Setup navigation timing
     */
    setupNavigationTiming() {
        window.addEventListener('load', () => {
            const navTiming = performance.getEntriesByType('navigation')[0];
            
            if (navTiming) {
                this.metrics.navigation = {
                    dns: navTiming.domainLookupEnd - navTiming.domainLookupStart,
                    tcp: navTiming.connectEnd - navTiming.connectStart,
                    ssl: navTiming.secureConnectionStart > 0 ? 
                         navTiming.connectEnd - navTiming.secureConnectionStart : 0,
                    ttfb: navTiming.responseStart - navTiming.requestStart,
                    download: navTiming.responseEnd - navTiming.responseStart,
                    domProcessing: navTiming.domComplete - navTiming.domLoading,
                    totalTime: navTiming.loadEventEnd - navTiming.navigationStart
                };
                
                this.metrics.ttfb = {
                    value: this.metrics.navigation.ttfb,
                    timestamp: Date.now()
                };
                
                if (CONFIG.IS_DEV) {
                    console.log('📊 Navigation timing:', this.metrics.navigation);
                }
            }
        });
    }

    /**
     * Setup resource timing monitoring
     */
    setupResourceTiming() {
        if ('PerformanceObserver' in window) {
            this.observers.resource = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    const resourceData = {
                        name: entry.name,
                        type: this.getResourceType(entry),
                        size: entry.transferSize || 0,
                        duration: entry.duration,
                        startTime: entry.startTime,
                        timestamp: Date.now()
                    };
                    
                    this.metrics.resources.push(resourceData);
                    
                    // Keep buffer size manageable
                    if (this.metrics.resources.length > this.options.bufferSize) {
                        this.metrics.resources = this.metrics.resources.slice(-this.options.bufferSize);
                    }
                });
            });
            
            this.observers.resource.observe({ entryTypes: ['resource'] });
        }
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            const updateMemoryUsage = () => {
                this.metrics.memory = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
            };
            
            // Update immediately and then every 10 seconds
            updateMemoryUsage();
            setInterval(updateMemoryUsage, 10000);
        }
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            const updateConnectionInfo = () => {
                this.metrics.connection = {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData,
                    timestamp: Date.now()
                };
            };
            
            updateConnectionInfo();
            navigator.connection.addEventListener('change', updateConnectionInfo);
        }
    }

    /**
     * Setup error tracking
     */
    setupErrorTracking() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.trackError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'javascript',
                stack: event.error?.stack
            });
        });
        
        // Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(event.reason, {
                type: 'unhandled_promise_rejection',
                stack: event.reason?.stack
            });
        });
        
        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.trackError(new Error('Resource loading failed'), {
                    resource: event.target.src || event.target.href,
                    type: 'resource_error',
                    tagName: event.target.tagName
                });
            }
        }, true);
    }

    /**
     * Setup frame rate monitoring
     */
    setupFrameRateMonitoring() {
        let lastFrameTime = performance.now();
        let frameCount = 0;
        let fps = 60;
        
        const measureFrameRate = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastFrameTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastFrameTime));
                this.metrics.frames.averageFPS = fps;
                this.metrics.frames.total += frameCount;
                
                frameCount = 0;
                lastFrameTime = currentTime;
            }
            
            requestAnimationFrame(measureFrameRate);
        };
        
        requestAnimationFrame(measureFrameRate);
        
        // Monitor long tasks for dropped frames
        if ('PerformanceObserver' in window) {
            this.observers.longtask = new PerformanceObserver((list) => {
                const longTasks = list.getEntries();
                longTasks.forEach(task => {
                    // Estimate dropped frames (assuming 60fps = 16.67ms per frame)
                    const droppedFrames = Math.floor(task.duration / 16.67);
                    this.metrics.frames.dropped += droppedFrames;
                });
            });
            
            this.observers.longtask.observe({ entryTypes: ['longtask'] });
        }
    }

    /**
     * Setup user interaction tracking
     */
    setupInteractionTracking() {
        const trackInteraction = (event) => {
            const interaction = {
                type: event.type,
                timestamp: Date.now(),
                target: event.target.tagName,
                x: event.clientX || 0,
                y: event.clientY || 0
            };
            
            this.metrics.interactions.push(interaction);
            
            // Keep buffer size manageable
            if (this.metrics.interactions.length > this.options.bufferSize) {
                this.metrics.interactions = this.metrics.interactions.slice(-this.options.bufferSize);
            }
        };
        
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, trackInteraction, { passive: true });
        });
    }

    /**
     * Track page load completion
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            this.pageLoadTime = performance.now() - this.startTime;
            this.trackMetric('page_load_time', this.pageLoadTime);
            
            if (CONFIG.IS_DEV) {
                console.log(`📊 Page loaded in ${this.pageLoadTime.toFixed(2)}ms`);
            }
        });
    }

    /**
     * Start periodic reporting
     */
    startReporting() {
        if (this.options.reportInterval > 0) {
            this.reportTimer = setInterval(() => {
                this.generateReport();
            }, this.options.reportInterval);
        }
    }

    /**
     * Track custom metric
     */
    trackMetric(name, value, tags = {}) {
        const metric = {
            name,
            value,
            tags,
            timestamp: Date.now()
        };
        
        if (!this.metrics.custom.has(name)) {
            this.metrics.custom.set(name, []);
        }
        
        this.metrics.custom.get(name).push(metric);
        
        // Keep buffer size manageable
        const metrics = this.metrics.custom.get(name);
        if (metrics.length > this.options.bufferSize) {
            this.metrics.custom.set(name, metrics.slice(-this.options.bufferSize));
        }
        
        if (CONFIG.IS_DEV) {
            console.log(`📊 Custom metric - ${name}:`, value, tags);
        }
    }

    /**
     * Track error
     */
    trackError(error, context = {}) {
        const errorData = {
            message: error.message || error.toString(),
            stack: error.stack,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...context
        };
        
        this.metrics.errors.push(errorData);
        
        // Keep buffer size manageable
        if (this.metrics.errors.length > this.options.bufferSize) {
            this.metrics.errors = this.metrics.errors.slice(-this.options.bufferSize);
        }
        
        if (CONFIG.IS_DEV) {
            console.error('📊 Error tracked:', errorData);
        }
    }

    /**
     * Performance timing methods
     */
    mark(name) {
        performance.mark(name);
        this.timings.marks.set(name, performance.now());
        
        if (CONFIG.IS_DEV) {
            console.log(`📊 Mark: ${name}`);
        }
    }

    measure(name, startMark, endMark) {
        try {
            performance.measure(name, startMark, endMark);
            
            const measure = performance.getEntriesByName(name, 'measure')[0];
            if (measure) {
                this.timings.measures.set(name, measure.duration);
                this.trackMetric(`measure_${name}`, measure.duration);
                
                if (CONFIG.IS_DEV) {
                    console.log(`📊 Measure: ${name} = ${measure.duration.toFixed(2)}ms`);
                }
            }
        } catch (error) {
            console.warn('Failed to create performance measure:', error);
        }
    }

    startTimer(name) {
        this.timings.intervals.set(name, performance.now());
    }

    endTimer(name) {
        const startTime = this.timings.intervals.get(name);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.timings.intervals.delete(name);
            this.trackMetric(`timer_${name}`, duration);
            
            if (CONFIG.IS_DEV) {
                console.log(`📊 Timer: ${name} = ${duration.toFixed(2)}ms`);
            }
            
            return duration;
        }
        return null;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        if (this.isReporting) return;
        
        this.isReporting = true;
        
        try {
            const report = {
                sessionId: this.sessionId,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                
                // Core Web Vitals
                lcp: this.metrics.lcp,
                fid: this.metrics.fid,
                cls: this.metrics.cls,
                fcp: this.metrics.fcp,
                ttfb: this.metrics.ttfb,
                
                // Navigation timing
                navigation: this.metrics.navigation,
                
                // Resource performance
                resourceCount: this.metrics.resources.length,
                totalResourceSize: this.metrics.resources.reduce((sum, r) => sum + r.size, 0),
                
                // Memory usage
                memory: this.metrics.memory,
                
                // Network info
                connection: this.metrics.connection,
                
                // Frame performance
                frames: this.metrics.frames,
                
                // Error count
                errorCount: this.metrics.errors.length,
                
                // Interaction count
                interactionCount: this.metrics.interactions.length,
                
                // Custom metrics summary
                customMetrics: this.getCustomMetricsSummary()
            };
            
            // Send report to analytics service
            this.sendReport(report);
            
            if (CONFIG.IS_DEV) {
                console.log('📊 Performance report generated:', report);
            }
            
        } catch (error) {
            console.error('Failed to generate performance report:', error);
        } finally {
            this.isReporting = false;
        }
    }

    /**
     * Get custom metrics summary
     */
    getCustomMetricsSummary() {
        const summary = {};
        
        for (const [name, metrics] of this.metrics.custom) {
            const values = metrics.map(m => m.value);
            summary[name] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                latest: values[values.length - 1]
            };
        }
        
        return summary;
    }

    /**
     * Send report to analytics service
     */
    sendReport(report) {
        // Sample the data based on sample rate
        if (Math.random() > this.options.sampleRate) {
            return;
        }
        
        // Send to analytics endpoint
        if (CONFIG.ENABLE_ANALYTICS && window.NCS?.api) {
            window.NCS.api.post('/analytics/performance', report).catch(error => {
                if (CONFIG.IS_DEV) {
                    console.warn('Failed to send performance report:', error);
                }
            });
        }
        
        // Send to browser's beacon API for reliability
        if ('sendBeacon' in navigator) {
            try {
                navigator.sendBeacon(
                    '/api/analytics/performance', 
                    JSON.stringify(report)
                );
            } catch (error) {
                // Fallback silently
            }
        }
    }

    /**
     * Utility methods
     */
    getResourceType(entry) {
        if (entry.initiatorType) {
            return entry.initiatorType;
        }
        
        const url = entry.name;
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'script';
        if (url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) return 'img';
        if (url.includes('.woff') || url.includes('.ttf')) return 'font';
        
        return 'other';
    }

    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Public API methods
     */
    getMetrics() {
        return {
            lcp: this.metrics.lcp?.value,
            fid: this.metrics.fid?.value,
            cls: this.metrics.cls?.value,
            fcp: this.metrics.fcp?.value,
            ttfb: this.metrics.ttfb?.value,
            pageLoadTime: this.pageLoadTime,
            navigation: this.metrics.navigation,
            memory: this.metrics.memory,
            connection: this.metrics.connection,
            frames: this.metrics.frames,
            errorCount: this.metrics.errors.length,
            customMetrics: this.getCustomMetricsSummary()
        };
    }

    getCoreWebVitalsScore() {
        const scores = {
            lcp: this.metrics.lcp?.value < 2500 ? 'good' : 
                 this.metrics.lcp?.value < 4000 ? 'needs-improvement' : 'poor',
            fid: this.metrics.fid?.value < 100 ? 'good' : 
                 this.metrics.fid?.value < 300 ? 'needs-improvement' : 'poor',
            cls: this.metrics.cls?.value < 0.1 ? 'good' : 
                 this.metrics.cls?.value < 0.25 ? 'needs-improvement' : 'poor'
        };
        
        return scores;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Stop reporting
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
        }
        
        // Disconnect observers
        Object.values(this.observers).forEach(observer => {
            if (observer) {
                observer.disconnect();
            }
        });
        
        // Final report
        this.generateReport();
        
        console.log('🗑️ Performance Monitor destroyed');
    }
}

// Create and export default instance
export const performanceMonitor = new PerformanceMonitor();
export default PerformanceMonitor;