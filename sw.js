/**
 * NCS-API Service Worker
 * Progressive Web App functionality with advanced caching strategies
 * 
 * Features:
 * - Cache-first for static assets
 * - Network-first for API calls  
 * - Offline fallbacks
 * - Background sync
 * - Push notifications
 * - Cache management
 * - Update handling
 */

const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `ncs-api-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ncs-api-dynamic-${CACHE_VERSION}`;
const API_CACHE = `ncs-api-data-${CACHE_VERSION}`;
const OFFLINE_CACHE = `ncs-api-offline-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
    // Static assets - cache-first strategy
    static: {
        name: STATIC_CACHE,
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        strategy: 'cacheFirst'
    },
    // Dynamic content - network-first strategy
    dynamic: {
        name: DYNAMIC_CACHE,
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
        strategy: 'networkFirst'
    },
    // API responses - network-first with short cache
    api: {
        name: API_CACHE,
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
        strategy: 'networkFirst'
    },
    // Offline fallbacks
    offline: {
        name: OFFLINE_CACHE,
        strategy: 'cacheOnly'
    }
};

// Static assets to precache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/playground.html',
    '/docs.html',
    '/benchmarks.html',
    '/examples.html',
    '/manifest.json',
    '/css/main.css',
    '/css/components/hero.css',
    '/css/components/header.css',
    '/css/components/buttons.css',
    '/css/layout/animations.css',
    '/js/main.js',
    '/js/config/constants.js',
    '/js/core/app.js',
    '/js/components/Hero.js',
    '/js/components/Header.js',
    '/js/components/ClusterVisualizer.js',
    '/js/components/ThemeToggle.js',
    '/js/components/Toast.js',
    '/js/api/client.js',
    '/js/utils/math.js',
    '/js/utils/colors.js',
    '/js/clustering/KMeans.js',
    '/js/visualizations/renderers/CanvasRenderer.js',
    '/assets/fonts/inter.woff2',
    '/assets/fonts/source-code-pro.woff2'
];

// Offline fallback pages
const OFFLINE_FALLBACKS = {
    document: '/offline.html',
    image: '/assets/images/offline-placeholder.svg',
    font: '/assets/fonts/inter.woff2'
};

// API endpoints configuration
const API_PATTERNS = [
    /^https:\/\/api\.ncs-cluster\.com/,
    /^https:\/\/api-staging\.ncs-cluster\.com/,
    /^http:\/\/localhost:8000/
];

// Background sync configuration
const SYNC_CONFIG = {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    tags: {
        clusteringRequest: 'clustering-request',
        analyticsData: 'analytics-data',
        errorReport: 'error-report'
    }
};

// Performance monitoring
const PERFORMANCE = {
    enabled: true,
    sampleRate: 0.1, // 10% sampling
    metrics: {
        cacheHits: 0,
        cacheMisses: 0,
        networkRequests: 0,
        offlineRequests: 0,
        backgroundSyncs: 0
    }
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...', CACHE_VERSION);
    
    event.waitUntil(
        Promise.all([
            precacheStaticAssets(),
            setupOfflineFallbacks(),
            self.skipWaiting()
        ])
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activating...', CACHE_VERSION);
    
    event.waitUntil(
        Promise.all([
            cleanupOldCaches(),
            self.clients.claim()
        ])
    );
});

/**
 * Fetch Event Handler - Main request interception
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and chrome-extension URLs
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Route requests based on type
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

/**
 * Background Sync Event Handler
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    switch (event.tag) {
        case SYNC_CONFIG.tags.clusteringRequest:
            event.waitUntil(syncClusteringRequests());
            break;
        case SYNC_CONFIG.tags.analyticsData:
            event.waitUntil(syncAnalyticsData());
            break;
        case SYNC_CONFIG.tags.errorReport:
            event.waitUntil(syncErrorReports());
            break;
        default:
            console.warn('Unknown sync tag:', event.tag);
    }
    
    PERFORMANCE.metrics.backgroundSyncs++;
});

/**
 * Push Event Handler
 */
self.addEventListener('push', (event) => {
    console.log('📱 Push notification received');
    
    const options = {
        badge: '/assets/images/icons/icon-72x72.png',
        icon: '/assets/images/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open Playground',
                icon: '/assets/images/icons/cluster.svg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/images/icons/close.svg'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        const title = data.title || 'NCS-API Notification';
        const body = data.body || 'New updates available';
        
        event.waitUntil(
            self.registration.showNotification(title, {
                body,
                ...options,
                ...data.options
            })
        );
    } else {
        event.waitUntil(
            self.registration.showNotification('NCS-API Update', {
                body: 'New features and improvements are available!',
                ...options
            })
        );
    }
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            self.clients.openWindow('/playground.html')
        );
    } else if (event.action !== 'close') {
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

/**
 * Message Handler - Communication with main thread
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_CACHE_STATS':
            event.ports[0].postMessage(getCacheStats());
            break;
        case 'CLEAR_CACHE':
            event.waitUntil(clearCaches(payload.cacheNames));
            break;
        case 'PRELOAD_ROUTES':
            event.waitUntil(preloadRoutes(payload.routes));
            break;
        case 'SYNC_DATA':
            event.waitUntil(scheduleBackgroundSync(payload.tag, payload.data));
            break;
        default:
            console.warn('Unknown message type:', type);
    }
});

/**
 * Precache static assets
 */
async function precacheStaticAssets() {
    try {
        const cache = await caches.open(STATIC_CACHE);
        
        // Cache essential assets
        const essentialAssets = STATIC_ASSETS.slice(0, 10); // First 10 are critical
        await cache.addAll(essentialAssets);
        
        // Cache remaining assets in background
        setTimeout(async () => {
            try {
                const remainingAssets = STATIC_ASSETS.slice(10);
                await cache.addAll(remainingAssets);
                console.log('✅ All static assets cached');
            } catch (error) {
                console.warn('⚠️ Some static assets failed to cache:', error);
            }
        }, 1000);
        
        console.log('✅ Essential static assets cached');
        
    } catch (error) {
        console.error('❌ Failed to precache static assets:', error);
    }
}

/**
 * Setup offline fallback pages
 */
async function setupOfflineFallbacks() {
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        
        // Cache offline fallback page (you'll need to create this)
        const offlineHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NCS-API - Offline</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                           text-align: center; padding: 50px; background: #0f172a; color: #e2e8f0; }
                    .icon { font-size: 64px; margin-bottom: 20px; }
                    h1 { color: #6366f1; margin-bottom: 10px; }
                    p { color: #94a3b8; margin-bottom: 30px; }
                    .btn { background: #6366f1; color: white; border: none; 
                           padding: 12px 24px; border-radius: 8px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="icon">📡</div>
                <h1>You're Offline</h1>
                <p>NCS-API is not available right now. Check your connection and try again.</p>
                <button class="btn" onclick="window.location.reload()">Try Again</button>
                <script>
                    // Automatically retry when online
                    window.addEventListener('online', () => window.location.reload());
                </script>
            </body>
            </html>
        `;
        
        await cache.put('/offline.html', new Response(offlineHTML, {
            headers: { 'Content-Type': 'text/html' }
        }));
        
        console.log('✅ Offline fallbacks setup');
        
    } catch (error) {
        console.error('❌ Failed to setup offline fallbacks:', error);
    }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, OFFLINE_CACHE];
        
        const deletionPromises = cacheNames
            .filter(name => !currentCaches.includes(name))
            .map(name => caches.delete(name));
        
        await Promise.all(deletionPromises);
        console.log('🧹 Old caches cleaned up');
        
    } catch (error) {
        console.error('❌ Failed to cleanup old caches:', error);
    }
}

/**
 * Handle static asset requests (cache-first)
 */
async function handleStaticAsset(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            PERFORMANCE.metrics.cacheHits++;
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            cache.put(request, networkResponse.clone());
            PERFORMANCE.metrics.cacheMisses++;
        }
        
        PERFORMANCE.metrics.networkRequests++;
        return networkResponse;
        
    } catch (error) {
        console.error('❌ Static asset error:', error);
        
        // Try to return cached version as fallback
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return appropriate offline fallback
        return getOfflineFallback(request);
    }
}

/**
 * Handle API requests (network-first with short cache)
 */
async function handleAPIRequest(request) {
    try {
        // Always try network first for API requests
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful API responses for short duration
            const cache = await caches.open(API_CACHE);
            const clonedResponse = networkResponse.clone();
            
            // Add timestamp header for cache expiration
            const headers = new Headers(clonedResponse.headers);
            headers.set('sw-cached-at', Date.now().toString());
            
            const responseWithTimestamp = new Response(clonedResponse.body, {
                status: clonedResponse.status,
                statusText: clonedResponse.statusText,
                headers
            });
            
            cache.put(request, responseWithTimestamp);
            PERFORMANCE.metrics.networkRequests++;
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('⚠️ API request failed, trying cache:', error);
        
        // Network failed, try cached version
        const cache = await caches.open(API_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Check if cached response is still valid
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const now = Date.now();
            const maxAge = CACHE_CONFIG.api.maxAgeSeconds * 1000;
            
            if (cachedAt && (now - parseInt(cachedAt)) < maxAge) {
                PERFORMANCE.metrics.cacheHits++;
                return cachedResponse;
            }
        }
        
        // Schedule background sync for retry
        if (SYNC_CONFIG.enabled) {
            await scheduleBackgroundSync(SYNC_CONFIG.tags.clusteringRequest, {
                url: request.url,
                method: request.method,
                headers: [...request.headers.entries()],
                timestamp: Date.now()
            });
        }
        
        PERFORMANCE.metrics.offlineRequests++;
        
        // Return offline response
        return new Response(JSON.stringify({
            error: 'Network unavailable',
            message: 'Request has been queued for retry when connection is restored',
            offline: true,
            timestamp: Date.now()
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle navigation requests (network-first with offline fallback)
 */
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful navigation responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            PERFORMANCE.metrics.networkRequests++;
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('⚠️ Navigation request failed:', error);
        
        // Try cached version
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            PERFORMANCE.metrics.cacheHits++;
            return cachedResponse;
        }
        
        // Return offline page
        PERFORMANCE.metrics.offlineRequests++;
        return caches.match('/offline.html');
    }
}

/**
 * Handle dynamic requests (network-first)
 */
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            PERFORMANCE.metrics.networkRequests++;
        }
        
        return networkResponse;
        
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            PERFORMANCE.metrics.cacheHits++;
            return cachedResponse;
        }
        
        PERFORMANCE.metrics.offlineRequests++;
        return getOfflineFallback(request);
    }
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    return pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/) ||
           STATIC_ASSETS.includes(pathname);
}

/**
 * Check if request is for API
 */
function isAPIRequest(request) {
    return API_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is navigation
 */
function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * Get appropriate offline fallback
 */
async function getOfflineFallback(request) {
    const url = new URL(request.url);
    const extension = url.pathname.split('.').pop();
    
    // Determine fallback type
    let fallbackUrl = OFFLINE_FALLBACKS.document;
    
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) {
        fallbackUrl = OFFLINE_FALLBACKS.image;
    } else if (['woff', 'woff2', 'ttf', 'eot'].includes(extension)) {
        fallbackUrl = OFFLINE_FALLBACKS.font;
    }
    
    try {
        const cache = await caches.open(OFFLINE_CACHE);
        const fallback = await cache.match(fallbackUrl);
        return fallback || new Response('Offline', { status: 503 });
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Schedule background sync
 */
async function scheduleBackgroundSync(tag, data) {
    try {
        // Store data for sync
        const cache = await caches.open('sync-data');
        await cache.put(`sync-${tag}-${Date.now()}`, new Response(JSON.stringify(data)));
        
        // Register sync
        if (self.registration.sync) {
            await self.registration.sync.register(tag);
            console.log('📅 Background sync scheduled:', tag);
        }
    } catch (error) {
        console.error('❌ Failed to schedule background sync:', error);
    }
}

/**
 * Sync clustering requests
 */
async function syncClusteringRequests() {
    try {
        const cache = await caches.open('sync-data');
        const requests = await cache.keys();
        
        const clusteringRequests = requests.filter(req => 
            req.url.includes('sync-clustering-request')
        );
        
        for (const request of clusteringRequests) {
            try {
                const response = await cache.match(request);
                const data = await response.json();
                
                // Retry the original request
                const result = await fetch(data.url, {
                    method: data.method,
                    headers: data.headers
                });
                
                if (result.ok) {
                    // Success - remove from sync queue
                    await cache.delete(request);
                    console.log('✅ Synced clustering request');
                }
            } catch (error) {
                console.error('❌ Failed to sync clustering request:', error);
            }
        }
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

/**
 * Sync analytics data
 */
async function syncAnalyticsData() {
    // Implementation for syncing analytics data
    console.log('📊 Syncing analytics data...');
}

/**
 * Sync error reports
 */
async function syncErrorReports() {
    // Implementation for syncing error reports
    console.log('🐛 Syncing error reports...');
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
    try {
        const cacheNames = await caches.keys();
        const stats = { ...PERFORMANCE.metrics };
        
        for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            stats[`${name}_entries`] = keys.length;
        }
        
        return stats;
    } catch (error) {
        console.error('❌ Failed to get cache stats:', error);
        return PERFORMANCE.metrics;
    }
}

/**
 * Clear specified caches
 */
async function clearCaches(cacheNames = []) {
    try {
        const deletionPromises = cacheNames.map(name => caches.delete(name));
        await Promise.all(deletionPromises);
        console.log('🧹 Caches cleared:', cacheNames);
    } catch (error) {
        console.error('❌ Failed to clear caches:', error);
    }
}

/**
 * Preload routes for better performance
 */
async function preloadRoutes(routes = []) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const fetchPromises = routes.map(route => 
            fetch(route).then(response => {
                if (response.ok) {
                    return cache.put(route, response);
                }
            }).catch(error => {
                console.warn('Failed to preload route:', route, error);
            })
        );
        
        await Promise.all(fetchPromises);
        console.log('✅ Routes preloaded:', routes);
    } catch (error) {
        console.error('❌ Failed to preload routes:', error);
    }
}

/**
 * Performance monitoring - send metrics periodically
 */
setInterval(() => {
    if (PERFORMANCE.enabled && Math.random() < PERFORMANCE.sampleRate) {
        // Send performance metrics to analytics
        // This would integrate with your analytics system
        console.log('📊 Performance metrics:', PERFORMANCE.metrics);
    }
}, 60000); // Every minute

console.log('🚀 NCS-API Service Worker loaded', CACHE_VERSION);