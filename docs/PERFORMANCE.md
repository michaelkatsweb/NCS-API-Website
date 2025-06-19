# Performance Optimization Guide

> **Complete guide for optimizing NCS-API Website performance**

This document covers performance optimization strategies, monitoring techniques, and best practices for achieving optimal performance in the NCS-API Website application.

## 📋 **Table of Contents**

1. [Performance Targets](#performance-targets)
2. [Core Web Vitals](#core-web-vitals)
3. [JavaScript Optimization](#javascript-optimization)
4. [CSS & Rendering Optimization](#css--rendering-optimization)
5. [Asset Optimization](#asset-optimization)
6. [Caching Strategies](#caching-strategies)
7. [Network Optimization](#network-optimization)
8. [Memory Management](#memory-management)
9. [Monitoring & Measurement](#monitoring--measurement)
10. [Performance Debugging](#performance-debugging)

---

## 🎯 **Performance Targets**

### Core Metrics
| Metric | Target | Good | Needs Improvement |
|--------|--------|------|-------------------|
| **First Contentful Paint (FCP)** | < 1.8s | < 1.8s | > 3.0s |
| **Largest Contentful Paint (LCP)** | < 2.5s | < 2.5s | > 4.0s |
| **First Input Delay (FID)** | < 100ms | < 100ms | > 300ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 | < 0.1 | > 0.25 |
| **Time to Interactive (TTI)** | < 3.8s | < 3.8s | > 7.3s |

### Application-Specific Targets
| Feature | Target | Measurement |
|---------|--------|-------------|
| **Data Upload** | < 2s for 10MB file | Time to process |
| **Clustering** | < 5s for 10k points | Algorithm execution |
| **Visualization** | 60 FPS rendering | Frame rate |
| **Page Navigation** | < 200ms | Route transition |
| **API Response** | < 500ms | Network latency |

---

## 📊 **Core Web Vitals**

### First Contentful Paint (FCP)
```javascript
// Optimize critical rendering path
class CriticalResourceLoader {
  constructor() {
    this.criticalCSS = [
      '/css/main.css',
      '/css/components/header.css',
      '/css/components/hero.css'
    ];
    this.criticalJS = [
      '/js/main.js',
      '/js/core/app.js'
    ];
  }
  
  async loadCriticalResources() {
    // Preload critical CSS
    this.criticalCSS.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    });
    
    // Preload critical JavaScript
    this.criticalJS.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      document.head.appendChild(link);
    });
  }
}

// Initialize critical resource loading
new CriticalResourceLoader().loadCriticalResources();
```

### Largest Contentful Paint (LCP)
```html
<!-- Optimize hero image loading -->
<img src="/assets/images/hero-bg.webp"
     alt="NCS-API Hero Background"
     loading="eager"
     decoding="async"
     fetchpriority="high"
     width="1920"
     height="1080">

<!-- Preload LCP candidate -->
<link rel="preload" 
      as="image" 
      href="/assets/images/hero-bg.webp"
      fetchpriority="high">
```

### First Input Delay (FID)
```javascript
// Minimize main thread blocking
class PerformantTaskScheduler {
  constructor() {
    this.tasks = [];
    this.isProcessing = false;
  }
  
  scheduleTask(task, priority = 'normal') {
    this.tasks.push({ task, priority, timestamp: Date.now() });
    this.tasks.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.timestamp - b.timestamp;
    });
    
    this.processTasks();
  }
  
  async processTasks() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.tasks.length > 0) {
      const { task } = this.tasks.shift();
      
      // Yield to browser if needed
      if (this.shouldYield()) {
        await this.yieldToBrowser();
      }
      
      await task();
    }
    
    this.isProcessing = false;
  }
  
  shouldYield() {
    return performance.now() % 5 === 0; // Yield every 5ms
  }
  
  yieldToBrowser() {
    return new Promise(resolve => {
      if ('scheduler' in window && 'postTask' in scheduler) {
        scheduler.postTask(resolve, { priority: 'user-blocking' });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}

// Use for heavy computations
const scheduler = new PerformantTaskScheduler();

// Example: Heavy clustering computation
async function performClustering(data) {
  const chunks = chunkArray(data, 1000);
  
  for (const chunk of chunks) {
    await scheduler.scheduleTask(async () => {
      await processClusteringChunk(chunk);
    }, 'normal');
  }
}
```

### Cumulative Layout Shift (CLS)
```css
/* Reserve space for dynamic content */
.chart-container {
  width: 100%;
  height: 400px; /* Fixed height prevents layout shift */
  min-height: 400px;
  background-color: var(--surface-color);
  border-radius: 8px;
}

.data-table {
  /* Reserve space for table */
  min-height: 300px;
  width: 100%;
}

/* Use aspect-ratio for responsive images */
.responsive-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}

/* Prevent font loading shifts */
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;
}
```

---

## ⚡ **JavaScript Optimization**

### Code Splitting & Lazy Loading
```javascript
// Route-based code splitting
class LazyRouter {
  constructor() {
    this.routes = new Map();
    this.loadedModules = new Map();
  }
  
  addRoute(path, moduleLoader) {
    this.routes.set(path, moduleLoader);
  }
  
  async loadRoute(path) {
    if (this.loadedModules.has(path)) {
      return this.loadedModules.get(path);
    }
    
    const moduleLoader = this.routes.get(path);
    if (!moduleLoader) {
      throw new Error(`Route not found: ${path}`);
    }
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    try {
      const module = await moduleLoader();
      this.loadedModules.set(path, module);
      return module;
    } finally {
      this.hideLoadingIndicator();
    }
  }
  
  showLoadingIndicator() {
    document.body.classList.add('loading');
  }
  
  hideLoadingIndicator() {
    document.body.classList.remove('loading');
  }
}

// Setup lazy routes
const router = new LazyRouter();

router.addRoute('/playground', () => import('../pages/playground.js'));
router.addRoute('/docs', () => import('../pages/docs.js'));
router.addRoute('/benchmarks', () => import('../pages/benchmarks.js'));
router.addRoute('/examples', () => import('../pages/examples.js'));
```

### Tree Shaking & Dead Code Elimination
```javascript
// Use ES6 modules for better tree shaking
// utils/math.js - Export only used functions
export const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
export const standardDeviation = (arr) => {
  const avg = mean(arr);
  return Math.sqrt(mean(arr.map(x => Math.pow(x - avg, 2))));
};

// Don't export everything
// ❌ export * from './all-functions.js';
// ✅ Export only what's needed
export { mean, standardDeviation } from './math-functions.js';

// Use dynamic imports for conditionally loaded code
async function loadAdvancedFeatures() {
  if (userHasPremiumFeatures()) {
    const { AdvancedAnalytics } = await import('./advanced-analytics.js');
    return new AdvancedAnalytics();
  }
  return null;
}
```

### Web Workers for Heavy Computations
```javascript
// clustering.worker.js - Offload clustering to worker
class ClusteringWorker {
  constructor() {
    this.algorithms = {
      kmeans: this.kmeansAlgorithm.bind(this),
      dbscan: this.dbscanAlgorithm.bind(this),
      hierarchical: this.hierarchicalAlgorithm.bind(this)
    };
  }
  
  async processMessage(event) {
    const { id, algorithm, data, parameters } = event.data;
    
    try {
      const startTime = performance.now();
      const result = await this.algorithms[algorithm](data, parameters);
      const processingTime = performance.now() - startTime;
      
      self.postMessage({
        id,
        success: true,
        result: {
          ...result,
          processingTime
        }
      });
    } catch (error) {
      self.postMessage({
        id,
        success: false,
        error: error.message
      });
    }
  }
  
  async kmeansAlgorithm(data, parameters) {
    // Implement K-means algorithm
    // Using transferable objects for large datasets
    const clusters = new Uint32Array(data.length);
    const centroids = new Float64Array(parameters.k * data[0].length);
    
    // ... clustering logic ...
    
    return {
      clusters: clusters.buffer,
      centroids: centroids.buffer
    };
  }
}

// Main thread usage
class ClusteringService {
  constructor() {
    this.worker = new Worker('./js/workers/clustering.worker.js');
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }
  
  async cluster(algorithm, data, parameters) {
    const id = ++this.requestId;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      // Transfer data efficiently
      const transferableData = this.prepareTransferableData(data);
      
      this.worker.postMessage({
        id,
        algorithm,
        data: transferableData,
        parameters
      }, transferableData.transferList);
    });
  }
  
  prepareTransferableData(data) {
    // Convert to transferable format
    const flatData = new Float64Array(data.length * Object.keys(data[0]).length);
    const transferList = [flatData.buffer];
    
    // Flatten data for transfer
    data.forEach((point, i) => {
      Object.values(point).forEach((value, j) => {
        flatData[i * Object.keys(data[0]).length + j] = value;
      });
    });
    
    return { flatData, transferList };
  }
}
```

### Memory-Efficient Data Structures
```javascript
// Use efficient data structures for large datasets
class EfficientDataManager {
  constructor() {
    this.useTypedArrays = true;
    this.compressionEnabled = true;
  }
  
  createDataStructure(size, dimensions) {
    if (this.useTypedArrays && size > 1000) {
      // Use typed arrays for better memory efficiency
      return {
        data: new Float64Array(size * dimensions),
        indices: new Uint32Array(size),
        size,
        dimensions,
        
        get(index) {
          const start = index * this.dimensions;
          return Array.from(this.data.slice(start, start + this.dimensions));
        },
        
        set(index, values) {
          const start = index * this.dimensions;
          values.forEach((value, i) => {
            this.data[start + i] = value;
          });
        }
      };
    }
    
    // Fallback to regular arrays
    return new Array(size).fill(null).map(() => new Array(dimensions));
  }
  
  compressData(data) {
    if (!this.compressionEnabled || data.length < 100) {
      return data;
    }
    
    // Simple compression: remove redundant precision
    return data.map(point => 
      typeof point === 'number' 
        ? Math.round(point * 1000) / 1000
        : point
    );
  }
}
```

---

## 🎨 **CSS & Rendering Optimization**

### Critical CSS Extraction
```javascript
// Extract and inline critical CSS
class CriticalCSSExtractor {
  constructor() {
    this.criticalSelectors = [
      'body', 'html',
      '.header', '.hero',
      '.loading', '.error',
      '.btn', '.form-control'
    ];
  }
  
  extractCriticalCSS(cssText) {
    const criticalRules = [];
    const cssRules = this.parseCSSRules(cssText);
    
    cssRules.forEach(rule => {
      if (this.isCriticalRule(rule.selector)) {
        criticalRules.push(rule);
      }
    });
    
    return this.stringifyRules(criticalRules);
  }
  
  isCriticalRule(selector) {
    return this.criticalSelectors.some(critical => 
      selector.includes(critical)
    );
  }
  
  inlineCriticalCSS(criticalCSS) {
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);
  }
}
```

### Efficient CSS Architecture
```css
/* Use CSS custom properties for dynamic theming */
:root {
  --primary-color: #2563eb;
  --surface-color: #ffffff;
  --text-color: #1f2937;
  
  /* Performance: Use transform instead of changing layout properties */
  --translate-x: 0px;
  --translate-y: 0px;
  --scale: 1;
}

/* Optimize animations for 60fps */
@keyframes slideIn {
  from {
    transform: translate3d(-100%, 0, 0);
    opacity: 0;
  }
  to {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

.slide-animation {
  /* Use will-change to optimize rendering */
  will-change: transform, opacity;
  transform: translate3d(var(--translate-x), var(--translate-y), 0) scale(var(--scale));
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Efficient responsive design */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  
  /* Use container queries when available */
  container-type: inline-size;
}

@container (min-width: 400px) {
  .responsive-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

/* Optimize for paint performance */
.chart-container {
  /* Use contain for better paint optimization */
  contain: layout style paint;
  
  /* Promote to composite layer when animating */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

### Layout Optimization
```css
/* Prevent layout thrashing */
.optimized-layout {
  /* Use transform instead of changing top/left */
  transform: translate3d(var(--x, 0), var(--y, 0), 0);
  
  /* Use opacity instead of visibility */
  opacity: var(--opacity, 1);
  
  /* Use scale instead of width/height changes */
  transform: scale(var(--scale, 1));
}

/* Efficient flexbox usage */
.efficient-flex {
  display: flex;
  flex-direction: column;
  
  /* Prevent unnecessary recalculations */
  flex-shrink: 0;
  flex-grow: 0;
  flex-basis: auto;
}

/* Optimize for scrolling performance */
.scrollable-container {
  /* Enable hardware acceleration */
  transform: translateZ(0);
  
  /* Optimize scroll performance */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  
  /* Use containment */
  contain: strict;
}
```

---

## 🖼️ **Asset Optimization**

### Image Optimization
```javascript
// Responsive image loading with WebP support
class ResponsiveImageLoader {
  constructor() {
    this.webpSupported = this.checkWebPSupport();
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this));
  }
  
  async checkWebPSupport() {
    const webP = new Image();
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    
    return new Promise(resolve => {
      webP.onload = () => resolve(true);
      webP.onerror = () => resolve(false);
    });
  }
  
  optimizeImage(img) {
    const src = img.dataset.src;
    const webpSrc = img.dataset.webpSrc;
    
    if (this.webpSupported && webpSrc) {
      img.src = webpSrc;
    } else {
      img.src = src;
    }
    
    img.classList.add('loaded');
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.optimizeImage(entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }
  
  observeImages() {
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.observer.observe(img);
    });
  }
}

// Usage in HTML
// <img data-src="image.jpg" 
//      data-webp-src="image.webp"
//      alt="Description"
//      loading="lazy"
//      width="400" 
//      height="300">
```

### Font Optimization
```css
/* Optimize font loading */
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/inter-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap; /* Prevent invisible text during font load */
  font-style: normal;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Preload critical fonts */
/* In HTML head:
<link rel="preload" 
      href="/assets/fonts/inter-variable.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin>
*/

/* Fallback font stack */
body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Font loading optimization */
.font-loading body {
  visibility: hidden;
}

.font-loaded body {
  visibility: visible;
}
```

### Bundle Optimization
```javascript
// Build-time optimization script
const buildOptimizations = {
  // Minification settings
  minify: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info'],
      passes: 2
    },
    mangle: {
      safari10: true
    },
    format: {
      comments: false
    }
  },
  
  // Code splitting configuration
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      },
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'all'
      }
    }
  },
  
  // Tree shaking
  sideEffects: false,
  usedExports: true,
  
  // Module concatenation
  concatenateModules: true
};
```

---

## 💾 **Caching Strategies**

### Service Worker Caching
```javascript
// sw.js - Advanced caching strategies
const CACHE_NAME = 'ncs-api-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

class AdvancedCacheManager {
  constructor() {
    this.strategies = {
      'cache-first': this.cacheFirst.bind(this),
      'network-first': this.networkFirst.bind(this),
      'stale-while-revalidate': this.staleWhileRevalidate.bind(this)
    };
  }
  
  async handleRequest(request, strategy = 'cache-first') {
    return this.strategies[strategy](request);
  }
  
  async cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Return offline fallback
      return this.getOfflineFallback(request);
    }
  }
  
  async networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      return cachedResponse || this.getOfflineFallback(request);
    }
  }
  
  async staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const networkPromise = fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });
    
    return cachedResponse || networkPromise;
  }
}

// Cache configuration
const cacheConfig = {
  '/assets/': 'cache-first',
  '/api/': 'network-first',
  '/': 'stale-while-revalidate'
};
```

### Memory Caching
```javascript
// In-memory caching for frequently accessed data
class InMemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
  
  set(key, value, customTTL) {
    const ttl = customTTL || this.ttl;
    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    };
    
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
  }
  
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    
    return entry.value;
  }
  
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (!entry.lastAccess || entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess || entry.timestamp;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }
}

// Usage
const dataCache = new InMemoryCache({ maxSize: 50, ttl: 300000 });

// Cache clustering results
function getCachedClusteringResult(data, algorithm, parameters) {
  const cacheKey = generateCacheKey(data, algorithm, parameters);
  return dataCache.get(cacheKey);
}

function setCachedClusteringResult(data, algorithm, parameters, result) {
  const cacheKey = generateCacheKey(data, algorithm, parameters);
  dataCache.set(cacheKey, result);
}
```

---

## 🌐 **Network Optimization**

### HTTP/2 & HTTP/3 Optimization
```javascript
// Optimize for HTTP/2 multiplexing
class OptimizedRequestManager {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = new Set();
    this.maxConcurrentRequests = 6; // HTTP/2 recommended
  }
  
  async fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        url,
        options,
        resolve,
        reject,
        priority: options.priority || 'normal'
      });
      
      this.processQueue();
    });
  }
  
  async processQueue() {
    while (
      this.requestQueue.length > 0 && 
      this.activeRequests.size < this.maxConcurrentRequests
    ) {
      // Sort by priority
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      const request = this.requestQueue.shift();
      this.executeRequest(request);
    }
  }
  
  async executeRequest(request) {
    const requestId = Symbol();
    this.activeRequests.add(requestId);
    
    try {
      const response = await fetch(request.url, request.options);
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }
}
```

### Resource Hints & Preloading
```html
<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="//api.ncs-clustering.com">
<link rel="dns-prefetch" href="//cdn.ncs-clustering.com">

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://api.ncs-clustering.com" crossorigin>

<!-- Preload critical resources -->
<link rel="preload" href="/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/js/main.js" as="script">
<link rel="preload" href="/css/main.css" as="style">

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/playground.html">
<link rel="prefetch" href="/docs.html">

<!-- Module preload for ES modules -->
<link rel="modulepreload" href="/js/core/app.js">
```

### Compression & Minification
```javascript
// Compression middleware configuration
const compressionConfig = {
  // Brotli compression (better than gzip)
  brotli: {
    enabled: true,
    quality: 6, // Balance between compression ratio and speed
    lgwin: 19
  },
  
  // Gzip fallback
  gzip: {
    enabled: true,
    level: 6
  },
  
  // File types to compress
  compressibleTypes: [
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'image/svg+xml'
  ]
};

// Dynamic compression for API responses
class ResponseCompressor {
  compress(data, acceptEncoding) {
    if (acceptEncoding.includes('br')) {
      return this.brotliCompress(data);
    } else if (acceptEncoding.includes('gzip')) {
      return this.gzipCompress(data);
    }
    return data;
  }
  
  brotliCompress(data) {
    // Use Brotli compression
    return brotli.compress(Buffer.from(data));
  }
  
  gzipCompress(data) {
    // Use Gzip compression
    return zlib.gzip(Buffer.from(data));
  }
}
```

---

## 🧠 **Memory Management**

### Memory Leak Prevention
```javascript
// Memory-conscious component base class
class MemoryManagedComponent {
  constructor() {
    this.eventListeners = [];
    this.intervals = [];
    this.timeouts = [];
    this.animationFrames = [];
    this.observers = [];
    this.abortController = new AbortController();
  }
  
  addEventListener(element, event, handler, options = {}) {
    const finalOptions = {
      ...options,
      signal: this.abortController.signal
    };
    
    element.addEventListener(event, handler, finalOptions);
    
    this.eventListeners.push({
      element,
      event,
      handler,
      options: finalOptions
    });
  }
  
  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  }
  
  setTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timeouts.push(id);
    return id;
  }
  
  requestAnimationFrame(callback) {
    const id = requestAnimationFrame(callback);
    this.animationFrames.push(id);
    return id;
  }
  
  addObserver(observer) {
    this.observers.push(observer);
  }
  
  destroy() {
    // Abort all fetch requests
    this.abortController.abort();
    
    // Clear intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    
    // Clear timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];
    
    // Cancel animation frames
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
    this.animationFrames = [];
    
    // Disconnect observers
    this.observers.forEach(observer => {
      if (observer.disconnect) observer.disconnect();
      if (observer.unobserve) observer.unobserve();
    });
    this.observers = [];
    
    console.log(`${this.constructor.name} destroyed and cleaned up`);
  }
}
```

### Memory Monitoring
```javascript
// Memory usage monitoring
class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.thresholds = {
      warning: 50 * 1024 * 1024, // 50MB
      critical: 100 * 1024 * 1024 // 100MB
    };
  }
  
  measure() {
    if (!('memory' in performance)) {
      return null;
    }
    
    const memory = performance.memory;
    const measurement = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };
    
    this.measurements.push(measurement);
    
    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }
    
    this.checkThresholds(measurement);
    
    return measurement;
  }
  
  checkThresholds(measurement) {
    if (measurement.usedJSHeapSize > this.thresholds.critical) {
      console.error('Critical memory usage detected:', this.formatBytes(measurement.usedJSHeapSize));
      this.triggerGarbageCollection();
    } else if (measurement.usedJSHeapSize > this.thresholds.warning) {
      console.warn('High memory usage detected:', this.formatBytes(measurement.usedJSHeapSize));
    }
  }
  
  triggerGarbageCollection() {
    // Force garbage collection if possible
    if (window.gc) {
      window.gc();
    }
    
    // Clear caches
    this.clearCaches();
  }
  
  clearCaches() {
    // Clear application caches
    if (window.dataCache) {
      window.dataCache.clear();
    }
    
    // Clear component instances
    document.dispatchEvent(new CustomEvent('memory:pressure'));
  }
  
  formatBytes(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
  
  getReport() {
    if (this.measurements.length === 0) return null;
    
    const recent = this.measurements.slice(-10);
    const average = recent.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / recent.length;
    const peak = Math.max(...this.measurements.map(m => m.usedJSHeapSize));
    
    return {
      current: this.formatBytes(recent[recent.length - 1].usedJSHeapSize),
      average: this.formatBytes(average),
      peak: this.formatBytes(peak),
      measurements: recent
    };
  }
}

// Global memory monitoring
const memoryMonitor = new MemoryMonitor();
setInterval(() => memoryMonitor.measure(), 5000);
```

---

## 📈 **Monitoring & Measurement**

### Performance API Integration
```javascript
// Comprehensive performance monitoring
class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.initialized = false;
  }
  
  init() {
    if (this.initialized) return;
    
    this.setupNavigationTimingObserver();
    this.setupResourceTimingObserver();
    this.setupPaintTimingObserver();
    this.setupLayoutShiftObserver();
    this.setupInputDelayObserver();
    this.setupCustomMetrics();
    
    this.initialized = true;
  }
  
  setupNavigationTimingObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('navigation', {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
          domInteractive: entry.domInteractive - entry.fetchStart,
          firstByte: entry.responseStart - entry.fetchStart
        });
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    this.observers.set('navigation', observer);
  }
  
  setupResourceTimingObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/api/')) {
          this.recordMetric('api_timing', {
            url: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }
  
  setupPaintTimingObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('paint_timing', {
          [entry.name.replace('-', '_')]: entry.startTime
        });
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });
    this.observers.set('paint', observer);
  }
  
  setupLayoutShiftObserver() {
    const observer = new PerformanceObserver((list) => {
      let totalScore = 0;
      
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          totalScore += entry.value;
        }
      }
      
      this.recordMetric('layout_shift', { score: totalScore });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('layout-shift', observer);
  }
  
  setupInputDelayObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('input_delay', {
          delay: entry.processingStart - entry.startTime,
          duration: entry.duration,
          type: entry.name
        });
      }
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('first-input', observer);
  }
  
  setupCustomMetrics() {
    // Custom business metrics
    this.trackCustomMetric('clustering_time');
    this.trackCustomMetric('data_upload_time');
    this.trackCustomMetric('visualization_render_time');
  }
  
  trackCustomMetric(metricName) {
    const startMark = `${metricName}_start`;
    const endMark = `${metricName}_end`;
    const measureName = `${metricName}_duration`;
    
    window[`start_${metricName}`] = () => {
      performance.mark(startMark);
    };
    
    window[`end_${metricName}`] = () => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      
      const measurement = performance.getEntriesByName(measureName)[0];
      this.recordMetric('custom_timing', {
        [metricName]: measurement.duration
      });
    };
  }
  
  recordMetric(category, data) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    
    this.metrics.get(category).push({
      ...data,
      timestamp: Date.now()
    });
    
    // Send to analytics
    this.sendToAnalytics(category, data);
  }
  
  sendToAnalytics(category, data) {
    // Send to Google Analytics, monitoring service, etc.
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        event_category: category,
        event_label: JSON.stringify(data),
        value: data.duration || data.score || 0
      });
    }
  }
  
  getReport() {
    const report = {};
    
    for (const [category, metrics] of this.metrics) {
      report[category] = {
        count: metrics.length,
        latest: metrics[metrics.length - 1],
        average: this.calculateAverage(metrics)
      };
    }
    
    return report;
  }
  
  calculateAverage(metrics) {
    if (metrics.length === 0) return 0;
    
    const numericKeys = Object.keys(metrics[0]).filter(key => 
      typeof metrics[0][key] === 'number' && key !== 'timestamp'
    );
    
    const averages = {};
    
    numericKeys.forEach(key => {
      const sum = metrics.reduce((total, metric) => total + (metric[key] || 0), 0);
      averages[key] = sum / metrics.length;
    });
    
    return averages;
  }
  
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Initialize performance tracking
const performanceTracker = new PerformanceTracker();
performanceTracker.init();
```

### Real User Monitoring (RUM)
```javascript
// Real User Monitoring implementation
class RealUserMonitoring {
  constructor(config = {}) {
    this.config = {
      endpoint: '/api/rum',
      sampleRate: 0.1, // 10% sampling
      bufferSize: 50,
      flushInterval: 30000, // 30 seconds
      ...config
    };
    
    this.buffer = [];
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    
    this.init();
  }
  
  init() {
    // Collect basic session info
    this.collectSessionInfo();
    
    // Start periodic flushing
    setInterval(() => this.flush(), this.config.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush(true));
    
    // Sample users based on sampling rate
    if (Math.random() > this.config.sampleRate) {
      return; // Skip monitoring for this user
    }
    
    this.startMonitoring();
  }
  
  collectSessionInfo() {
    this.sessionInfo = {
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo(),
      timestamp: Date.now()
    };
  }
  
  getConnectionInfo() {
    if ('connection' in navigator) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    return null;
  }
  
  startMonitoring() {
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor custom metrics
    this.monitorCustomMetrics();
    
    // Monitor errors
    this.monitorErrors();
    
    // Monitor user interactions
    this.monitorInteractions();
  }
  
  monitorCoreWebVitals() {
    // FCP
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('fcp', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });
    
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // FID
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('fid', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  recordMetric(name, value, metadata = {}) {
    this.buffer.push({
      type: 'metric',
      name,
      value,
      metadata,
      timestamp: Date.now()
    });
    
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }
  
  async flush(synchronous = false) {
    if (this.buffer.length === 0) return;
    
    const data = {
      session: this.sessionInfo,
      metrics: [...this.buffer]
    };
    
    this.buffer = [];
    
    try {
      if (synchronous && 'sendBeacon' in navigator) {
        navigator.sendBeacon(this.config.endpoint, JSON.stringify(data));
      } else {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (error) {
      console.warn('Failed to send RUM data:', error);
    }
  }
  
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  getUserId() {
    // Get or generate user ID
    let userId = localStorage.getItem('ncs_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('ncs_user_id', userId);
    }
    return userId;
  }
}

// Initialize RUM
const rum = new RealUserMonitoring({
  endpoint: 'https://analytics.ncs-clustering.com/rum',
  sampleRate: 0.1
});
```

---

## 🔍 **Performance Debugging**

### Performance Bottleneck Detection
```javascript
// Automated performance bottleneck detection
class PerformanceProfiler {
  constructor() {
    this.profiles = new Map();
    this.thresholds = {
      renderTime: 16, // 60fps = 16ms per frame
      responseTime: 200, // API response time
      memoryIncrease: 10 * 1024 * 1024 // 10MB memory increase
    };
  }
  
  profile(name, fn) {
    return async (...args) => {
      const profile = {
        name,
        startTime: performance.now(),
        startMemory: this.getMemoryUsage(),
        args: args.length
      };
      
      try {
        const result = await fn.apply(this, args);
        
        profile.endTime = performance.now();
        profile.endMemory = this.getMemoryUsage();
        profile.duration = profile.endTime - profile.startTime;
        profile.memoryDelta = profile.endMemory - profile.startMemory;
        profile.success = true;
        
        this.analyzeProfile(profile);
        this.storeProfile(profile);
        
        return result;
      } catch (error) {
        profile.endTime = performance.now();
        profile.duration = profile.endTime - profile.startTime;
        profile.error = error.message;
        profile.success = false;
        
        this.storeProfile(profile);
        throw error;
      }
    };
  }
  
  analyzeProfile(profile) {
    const issues = [];
    
    if (profile.duration > this.thresholds.renderTime) {
      issues.push({
        type: 'slow_execution',
        message: `Function '${profile.name}' took ${profile.duration.toFixed(2)}ms (threshold: ${this.thresholds.renderTime}ms)`,
        severity: profile.duration > this.thresholds.renderTime * 5 ? 'high' : 'medium'
      });
    }
    
    if (profile.memoryDelta > this.thresholds.memoryIncrease) {
      issues.push({
        type: 'memory_leak',
        message: `Function '${profile.name}' increased memory by ${(profile.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        severity: 'high'
      });
    }
    
    if (issues.length > 0) {
      console.group(`Performance Issues - ${profile.name}`);
      issues.forEach(issue => {
        const logFn = issue.severity === 'high' ? console.error : console.warn;
        logFn(issue.message);
      });
      console.groupEnd();
      
      // Send to monitoring
      this.reportIssues(profile.name, issues);
    }
  }
  
  storeProfile(profile) {
    if (!this.profiles.has(profile.name)) {
      this.profiles.set(profile.name, []);
    }
    
    const profiles = this.profiles.get(profile.name);
    profiles.push(profile);
    
    // Keep only last 50 profiles per function
    if (profiles.length > 50) {
      this.profiles.set(profile.name, profiles.slice(-50));
    }
  }
  
  getMemoryUsage() {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  }
  
  generateReport() {
    const report = {
      summary: {
        totalFunctions: this.profiles.size,
        totalExecutions: 0,
        averageDuration: 0,
        slowestFunction: null,
        memoryIntensiveFunction: null
      },
      functions: {}
    };
    
    let totalDuration = 0;
    let slowestDuration = 0;
    let highestMemoryDelta = 0;
    
    for (const [name, profiles] of this.profiles) {
      const successfulProfiles = profiles.filter(p => p.success);
      
      if (successfulProfiles.length === 0) continue;
      
      const avgDuration = successfulProfiles.reduce((sum, p) => sum + p.duration, 0) / successfulProfiles.length;
      const avgMemoryDelta = successfulProfiles.reduce((sum, p) => sum + (p.memoryDelta || 0), 0) / successfulProfiles.length;
      const maxDuration = Math.max(...successfulProfiles.map(p => p.duration));
      
      report.functions[name] = {
        executions: successfulProfiles.length,
        averageDuration: avgDuration,
        maxDuration,
        averageMemoryDelta: avgMemoryDelta,
        errorRate: (profiles.length - successfulProfiles.length) / profiles.length * 100
      };
      
      report.summary.totalExecutions += successfulProfiles.length;
      totalDuration += avgDuration * successfulProfiles.length;
      
      if (maxDuration > slowestDuration) {
        slowestDuration = maxDuration;
        report.summary.slowestFunction = name;
      }
      
      if (avgMemoryDelta > highestMemoryDelta) {
        highestMemoryDelta = avgMemoryDelta;
        report.summary.memoryIntensiveFunction = name;
      }
    }
    
    report.summary.averageDuration = totalDuration / report.summary.totalExecutions;
    
    return report;
  }
  
  reportIssues(functionName, issues) {
    // Send to monitoring service
    fetch('/api/performance/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: functionName,
        issues,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      })
    }).catch(error => {
      console.warn('Failed to report performance issues:', error);
    });
  }
}

// Usage
const profiler = new PerformanceProfiler();

// Profile clustering function
const clusterData = profiler.profile('clusterData', async function(data, algorithm) {
  // Original clustering logic
  return await performClustering(data, algorithm);
});

// Profile visualization rendering
const renderVisualization = profiler.profile('renderVisualization', function(data) {
  // Original rendering logic
  return renderChart(data);
});
```

---

## 📚 **Performance Resources**

### Tools & Utilities
- **Lighthouse**: Automated performance auditing
- **WebPageTest**: Detailed performance analysis
- **Chrome DevTools**: Real-time performance debugging
- **Bundle Analyzer**: JavaScript bundle optimization
- **Performance Observer API**: Runtime performance monitoring

### Further Reading
- [Web Performance Working Group](https://www.w3.org/webperf/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Performance Best Practices](https://web.dev/performance/)
- [JavaScript Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

---

*Optimize for speed, monitor for success! ⚡*