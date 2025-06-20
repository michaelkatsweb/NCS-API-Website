/**
 * Application Constants and Configuration
 * NCS-API Website configuration settings
 */

// API Configuration
export const API_CONFIG = {
    // Production API endpoint
    BASE_URL: 'https://api.ncs-clustering.com/v1',
    
    // Development fallback
    DEV_URL: 'http://localhost:8000/api/v1',
    
    // WebSocket endpoints
    WS_URL: 'wss://api.ncs-clustering.com/ws',
    WS_DEV_URL: 'ws://localhost:8000/ws',
    
    // Timeout settings
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    
    // Rate limiting
    RATE_LIMIT: {
        REQUESTS_PER_MINUTE: 60,
        CLUSTERING_PER_HOUR: 100
    }
};

// Application Configuration
export const APP_CONFIG = {
    NAME: 'NCS-API Website',
    VERSION: '2.1.0',
    BUILD_DATE: '2025-06-17',
    
    // Environment detection
    IS_DEVELOPMENT: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    IS_PRODUCTION: location.hostname === 'ncs-api.com',
    
    // Feature flags
    FEATURES: {
        OFFLINE_MODE: true,
        BACKGROUND_SYNC: true,
        PUSH_NOTIFICATIONS: false, // Disabled for now
        ADVANCED_ANALYTICS: true,
        EXPERIMENTAL_ALGORITHMS: false
    },
    
    // Performance settings
    PERFORMANCE: {
        ENABLE_METRICS: true,
        SAMPLE_RATE: 0.1, // 10% sampling
        MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
        FPS_TARGET: 60
    },
    
    // UI Settings
    UI: {
        THEME_STORAGE_KEY: 'ncs-theme-preference',
        DEFAULT_THEME: 'dark',
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        MODAL_BACKDROP_CLOSE: true
    },
    
    // Data Processing
    DATA: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        SUPPORTED_FORMATS: ['csv', 'json', 'xlsx', 'txt'],
        MAX_DATA_POINTS: 100000,
        CLUSTERING_TIMEOUT: 30000,
        VISUALIZATION_CHUNK_SIZE: 1000
    }
};

// Clustering Algorithm Configuration
export const CLUSTERING_CONFIG = {
    // Algorithm settings
    ALGORITHMS: {
        KMEANS: {
            name: 'K-Means',
            description: 'Fast centroid-based clustering',
            parameters: {
                k: { min: 2, max: 20, default: 3 },
                maxIterations: { min: 10, max: 1000, default: 100 },
                tolerance: { min: 0.0001, max: 0.1, default: 0.01 }
            }
        },
        DBSCAN: {
            name: 'DBSCAN',
            description: 'Density-based clustering with noise detection',
            parameters: {
                eps: { min: 0.1, max: 2.0, default: 0.5 },
                minPts: { min: 2, max: 20, default: 5 }
            }
        },
        HIERARCHICAL: {
            name: 'Hierarchical',
            description: 'Tree-based clustering with dendrograms',
            parameters: {
                linkage: { 
                    options: ['ward', 'complete', 'average', 'single'], 
                    default: 'ward' 
                },
                distance: { 
                    options: ['euclidean', 'manhattan', 'cosine'], 
                    default: 'euclidean' 
                }
            }
        },
        NCS: {
            name: 'NCS Algorithm',
            description: 'Neural Clustering System - proprietary algorithm',
            parameters: {
                layers: { min: 2, max: 10, default: 3 },
                neurons: { min: 10, max: 100, default: 50 },
                learningRate: { min: 0.001, max: 0.1, default: 0.01 }
            }
        }
    },
    
    // Quality metrics
    QUALITY_METRICS: [
        'silhouette_score',
        'calinski_harabasz_index',
        'davies_bouldin_index',
        'inertia',
        'adjusted_rand_index'
    ]
};

// Visualization Configuration
export const VISUALIZATION_CONFIG = {
    // Chart types
    CHART_TYPES: {
        SCATTER_2D: 'scatter2d',
        SCATTER_3D: 'scatter3d',
        HEATMAP: 'heatmap',
        DENDROGRAM: 'dendrogram',
        PARALLEL_COORDINATES: 'parallel'
    },
    
    // Color palettes
    COLOR_PALETTES: {
        DEFAULT: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        COLORBLIND_SAFE: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
        HIGH_CONTRAST: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00']
    },
    
    // Canvas settings
    CANVAS: {
        MAX_WIDTH: 4096,
        MAX_HEIGHT: 4096,
        DPI_SCALE: window.devicePixelRatio || 1,
        ANTI_ALIASING: true
    },
    
    // Animation settings
    ANIMATION: {
        ENABLE_TRANSITIONS: true,
        TRANSITION_DURATION: 500,
        EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
        MAX_PARTICLES: 10000
    }
};

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    API_ERROR: 'API request failed. Please try again later.',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit of {maxSize}.',
    INVALID_FILE_FORMAT: 'Unsupported file format. Please use {supportedFormats}.',
    CLUSTERING_FAILED: 'Clustering algorithm failed to process the data.',
    INVALID_PARAMETERS: 'Invalid algorithm parameters provided.',
    DATA_PROCESSING_ERROR: 'Error processing the uploaded data.',
    WEBSOCKET_CONNECTION_ERROR: 'Real-time connection failed.',
    BROWSER_NOT_SUPPORTED: 'Your browser does not support this feature.',
    QUOTA_EXCEEDED: 'You have exceeded the rate limit. Please try again later.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    DATA_UPLOADED: 'Data uploaded successfully!',
    CLUSTERING_COMPLETE: 'Clustering analysis completed successfully!',
    SETTINGS_SAVED: 'Settings saved successfully!',
    EXPORT_COMPLETE: 'Data exported successfully!',
    SHARE_LINK_COPIED: 'Share link copied to clipboard!'
};

// Storage Keys
export const STORAGE_KEYS = {
    THEME_PREFERENCE: 'ncs-theme-preference',
    USER_SETTINGS: 'ncs-user-settings',
    RECENT_DATASETS: 'ncs-recent-datasets',
    ALGORITHM_HISTORY: 'ncs-algorithm-history',
    PERFORMANCE_CACHE: 'ncs-performance-cache'
};

// Regular Expressions
export const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
    API_KEY: /^[a-zA-Z0-9]{32,64}$/,
    NUMERIC: /^-?\d*\.?\d+$/,
    PERCENTAGE: /^(?:100|[1-9]?\d)(?:\.\d+)?$/
};

// Event Names
export const EVENTS = {
    // Application events
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    ROUTE_CHANGE: 'route:change',
    
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_PROCESSED: 'data:processed',
    DATA_ERROR: 'data:error',
    
    // Clustering events
    CLUSTERING_START: 'clustering:start',
    CLUSTERING_PROGRESS: 'clustering:progress',
    CLUSTERING_COMPLETE: 'clustering:complete',
    CLUSTERING_ERROR: 'clustering:error',
    
    // UI events
    THEME_CHANGE: 'theme:change',
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    TOAST_SHOW: 'toast:show',
    
    // Network events
    ONLINE: 'network:online',
    OFFLINE: 'network:offline',
    API_CONNECTED: 'api:connected',
    API_DISCONNECTED: 'api:disconnected'
};

// URLs and Endpoints
export const URLS = {
    DOCUMENTATION: 'https://docs.ncs-api.com',
    GITHUB_REPO: 'https://github.com/michaelkatsweb/NCS-API-Website',
    SUPPORT_EMAIL: 'support@ncs-clustering.com',
    PRIVACY_POLICY: '/privacy',
    TERMS_OF_SERVICE: '/terms'
};

// Main configuration export
export const CONFIG = {
    API: API_CONFIG,
    APP: APP_CONFIG,
    CLUSTERING: CLUSTERING_CONFIG,
    VISUALIZATION: VISUALIZATION_CONFIG,
    ERRORS: ERROR_MESSAGES,
    SUCCESS: SUCCESS_MESSAGES,
    STORAGE: STORAGE_KEYS,
    REGEX: REGEX_PATTERNS,
    EVENTS: EVENTS,
    URLS: URLS
};

// Development overrides
if (APP_CONFIG.IS_DEVELOPMENT) {
    // Use local API in development
    API_CONFIG.BASE_URL = API_CONFIG.DEV_URL;
    API_CONFIG.WS_URL = API_CONFIG.WS_DEV_URL;
    
    // Enable more verbose logging
    APP_CONFIG.PERFORMANCE.SAMPLE_RATE = 1.0; // 100% sampling in dev
    
    // Enable experimental features
    APP_CONFIG.FEATURES.EXPERIMENTAL_ALGORITHMS = true;
    
    console.log('🔧 Development mode configuration loaded');
}

export default CONFIG;