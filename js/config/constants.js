/**
 * NCS-API Website Configuration Constants
 * Central configuration for API endpoints, features, and application settings
 * 
 * This file provides both a comprehensive CONFIG object and individual exports
 * for commonly used constants throughout the application.
 */

/* ===================================
   Environment Detection
   =================================== */

const ENV = (() => {
    if (typeof window === 'undefined') return 'development';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
        return 'development';
    } else if (hostname.includes('staging') || hostname.includes('dev.')) {
        return 'staging';
    } else {
        return 'production';
    }
})();

/* ===================================
   Event Constants
   =================================== */

export const EVENTS = {
    // Application events
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    APP_INIT: 'app:init',
    
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_VALIDATED: 'data:validated',
    DATA_PROCESSED: 'data:processed',
    DATA_ERROR: 'data:error',
    
    // Clustering events
    CLUSTERING_START: 'clustering:start',
    CLUSTERING_PROGRESS: 'clustering:progress',
    CLUSTERING_COMPLETE: 'clustering:complete',
    CLUSTERING_ERROR: 'clustering:error',
    
    // Visualization events
    VIZ_RENDER: 'viz:render',
    VIZ_UPDATE: 'viz:update',
    VIZ_EXPORT: 'viz:export',
    VIZ_ERROR: 'viz:error',
    
    // Theme events
    THEME_CHANGE: 'theme:change',
    THEME_TOGGLE: 'theme:toggle',
    
    // User events
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    USER_PROFILE_UPDATE: 'user:profile_update',
    
    // Network events
    NETWORK_ONLINE: 'network:online',
    NETWORK_OFFLINE: 'network:offline',
    
    // WebSocket events
    WS_CONNECTED: 'ws:connected',
    WS_DISCONNECTED: 'ws:disconnected',
    WS_ERROR: 'ws:error',
    WS_MESSAGE: 'ws:message',
    WS_RECONNECTING: 'ws:reconnecting'
};

/* ===================================
   Storage Keys
   =================================== */

export const STORAGE_KEYS = {
    THEME: 'ncs_theme',
    USER_PROFILE: 'ncs_user_profile',
    AUTH_TOKEN: 'ncs_auth_token',
    REFRESH_TOKEN: 'ncs_refresh_token',
    PREFERENCES: 'ncs_preferences',
    LAST_DATASET: 'ncs_last_dataset',
    CLUSTERING_HISTORY: 'ncs_clustering_history',
    SAVED_VISUALIZATIONS: 'ncs_saved_visualizations',
    API_CACHE: 'ncs_api_cache',
    USER_SETTINGS: 'ncs_user_settings'
};

/* ===================================
   Error Codes
   =================================== */

export const ERROR_CODES = {
    // Network errors
    NETWORK: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    CONNECTION: 'CONNECTION_ERROR',
    
    // Authentication errors
    AUTH: 'AUTH_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    
    // Validation errors
    VALIDATION: 'VALIDATION_ERROR',
    INVALID_DATA: 'INVALID_DATA',
    MISSING_REQUIRED: 'MISSING_REQUIRED',
    
    // Processing errors
    PROCESSING: 'PROCESSING_ERROR',
    ALGORITHM_ERROR: 'ALGORITHM_ERROR',
    COMPUTATION_ERROR: 'COMPUTATION_ERROR',
    
    // File errors
    FILE_UPLOAD: 'FILE_UPLOAD_ERROR',
    FILE_SIZE: 'FILE_SIZE_ERROR',
    FILE_FORMAT: 'FILE_FORMAT_ERROR',
    
    // API errors
    API_LIMIT: 'API_LIMIT_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    
    // Generic
    UNKNOWN: 'UNKNOWN_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
};

/* ===================================
   Connection Status
   =================================== */

export const CONNECTION_STATUS = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
    TIMEOUT: 'timeout'
};

/* ===================================
   UI States
   =================================== */

export const UI_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    CANCELLED: 'cancelled'
};

/* ===================================
   Processing Status
   =================================== */

export const PROCESSING_STATUS = {
    PENDING: 'pending',
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout'
};

/* ===================================
   Default Values
   =================================== */

export const DEFAULTS = {
    theme: 'dark',
    language: 'en-US',
    algorithm: 'ncs',
    chart_type: 'scatter',
    color_scheme: 'default',
    point_size: 4,
    opacity: 0.8,
    batch_size: 100,
    max_clusters: 10,
    tolerance: 0.001,
    max_iterations: 100
};

/* ===================================
   API Configuration
   =================================== */

const API_CONFIG = {
    development: {
        HTTP_BASE_URL: 'http://localhost:8000/api/v1',
        WEBSOCKET_URL: 'ws://localhost:8000/ws',
        DOCS_URL: 'http://localhost:8000/docs'
    },
    staging: {
        HTTP_BASE_URL: 'https://api-staging.ncs-cluster.com/v1',
        WEBSOCKET_URL: 'wss://ws-staging.ncs-cluster.com',
        DOCS_URL: 'https://docs-staging.ncs-cluster.com'
    },
    production: {
        HTTP_BASE_URL: 'https://api.ncs-cluster.com/v1',
        WEBSOCKET_URL: 'wss://ws.ncs-cluster.com',
        DOCS_URL: 'https://docs.ncs-cluster.com'
    }
};

/* ===================================
   Main Configuration Object
   =================================== */

export const CONFIG = {
    // Environment
    ENV,
    IS_DEV: ENV === 'development',
    IS_STAGING: ENV === 'staging',
    IS_PROD: ENV === 'production',
    
    // API Configuration
    API_BASE_URL: API_CONFIG[ENV].HTTP_BASE_URL,
    WEBSOCKET_URL: API_CONFIG[ENV].WEBSOCKET_URL,
    DOCS_URL: API_CONFIG[ENV].DOCS_URL,
    API_TIMEOUT: 30000,
    API_RETRY_ATTEMPTS: 3,
    API_RETRY_DELAY: 1000,
    
    // WebSocket Configuration
    ENABLE_WEBSOCKET: true,
    WS_RECONNECT_ATTEMPTS: 5,
    WS_RECONNECT_DELAY: 2000,
    WS_HEARTBEAT_INTERVAL: 30000,
    WS_TIMEOUT: 10000,
    
    // Performance Monitoring
    ENABLE_PERFORMANCE_MONITORING: true,
    PERFORMANCE_SAMPLE_RATE: ENV === 'production' ? 0.1 : 1.0,
    PERFORMANCE_REPORT_INTERVAL: 30000,
    
    // Analytics
    ENABLE_ANALYTICS: ENV === 'production',
    ANALYTICS_ID: ENV === 'production' ? 'GA-XXXXX-X' : null,
    
    // Error Tracking
    ENABLE_ERROR_TRACKING: true,
    ERROR_SAMPLE_RATE: ENV === 'production' ? 0.1 : 1.0,
    
    // Feature Flags
    FEATURES: {
        REAL_TIME_CLUSTERING: true,
        ADVANCED_PLAYGROUND: true,
        CODE_GENERATOR: true,
        PERFORMANCE_BENCHMARKS: true,
        EXPORT_FUNCTIONALITY: true,
        COLLABORATIVE_FEATURES: false,
        AI_SUGGESTIONS: false,
        CUSTOM_ALGORITHMS: true,
        VOICE_COMMANDS: false,
        AR_VISUALIZATION: false
    },
    
    // UI Configuration
    UI: {
        DEFAULT_THEME: 'dark',
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 250,
        TOAST_DURATION: 5000,
        TOOLTIP_DELAY: 500,
        MODAL_ANIMATION_DURATION: 200
    },
    
    // Clustering Configuration
    CLUSTERING: {
        DEFAULT_ALGORITHM: 'ncs',
        MAX_POINTS: 10000,
        MAX_CLUSTERS: 20,
        DEFAULT_CLUSTERS: 4,
        ANIMATION_SPEED: 1,
        CONVERGENCE_THRESHOLD: 0.001,
        MAX_ITERATIONS: 100,
        SUPPORTED_ALGORITHMS: [
            'ncs',
            'kmeans',
            'dbscan',
            'hierarchical',
            'gaussian-mixture'
        ]
    },
    
    // Visualization Configuration
    VISUALIZATION: {
        DEFAULT_RENDERER: 'canvas',
        MAX_FPS: 60,
        POINT_SIZE_RANGE: [2, 8],
        DEFAULT_POINT_SIZE: 4,
        TRAIL_LENGTH: 20,
        COLOR_PALETTES: {
            default: [
                '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
                '#f59e0b', '#ef4444', '#ec4899', '#84cc16'
            ],
            viridis: [
                '#440154', '#482777', '#3f4a8a', '#31678e',
                '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'
            ],
            plasma: [
                '#0d0887', '#46039f', '#7201a8', '#9c179e',
                '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'
            ],
            accessible: [
                '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
                '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'
            ]
        },
        DEFAULT_COLOR_PALETTE: 'default'
    },
    
    // Data Processing
    DATA: {
        MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
        SUPPORTED_FORMATS: ['csv', 'json', 'xlsx', 'tsv'],
        SAMPLE_DATASETS: [
            {
                name: 'Iris Dataset',
                file: 'iris.csv',
                description: 'Classic flower classification dataset',
                points: 150,
                features: 4
            },
            {
                name: 'Customer Segmentation',
                file: 'customers.csv',
                description: 'E-commerce customer behavior data',
                points: 1000,
                features: 6
            },
            {
                name: 'Social Media Clusters',
                file: 'social-media.csv',
                description: 'Social network user clustering',
                points: 2500,
                features: 8
            },
            {
                name: 'Financial Market Data',
                file: 'financial.csv',
                description: 'Stock market clustering analysis',
                points: 5000,
                features: 12
            }
        ],
        AUTO_PREPROCESSING: true,
        NORMALIZATION_METHOD: 'standard',
        MISSING_VALUE_STRATEGY: 'drop'
    },
    
    // Export Configuration
    EXPORT: {
        SUPPORTED_FORMATS: ['png', 'svg', 'pdf', 'csv', 'json'],
        DEFAULT_FORMAT: 'png',
        IMAGE_QUALITY: 0.9,
        IMAGE_DPI: 300,
        MAX_EXPORT_POINTS: 50000
    },
    
    // Security Configuration
    SECURITY: {
        API_KEY_HEADER: 'X-API-Key',
        CSRF_HEADER: 'X-CSRF-Token',
        MAX_REQUEST_SIZE: 100 * 1024 * 1024,
        RATE_LIMIT: {
            REQUESTS_PER_MINUTE: 120,
            BURST_LIMIT: 20
        }
    },
    
    // Cache Configuration
    CACHE: {
        ENABLE_HTTP_CACHE: true,
        CACHE_DURATION: 5 * 60 * 1000,
        MAX_CACHE_SIZE: 100,
        STORAGE_TYPE: 'memory'
    },
    
    // Progressive Web App
    PWA: {
        ENABLE_SERVICE_WORKER: ENV === 'production',
        CACHE_STRATEGY: 'cache-first',
        OFFLINE_FALLBACK: true,
        UPDATE_CHECK_INTERVAL: 60 * 60 * 1000
    },
    
    // Development Tools
    DEV_TOOLS: {
        ENABLE_CONSOLE_LOGS: ENV !== 'production',
        ENABLE_DEBUG_PANEL: ENV === 'development',
        PERFORMANCE_PROFILING: ENV === 'development',
        MOCK_API_RESPONSES: false,
        BYPASS_AUTH: ENV === 'development'
    },
    
    // Version Information
    VERSION: {
        APP: '2.1.0',
        API: '1.4.2',
        BUILD: ENV === 'development' ? 'dev' : '20250617',
        COMMIT_HASH: 'abc123def456'
    }
};

/* ===================================
   Computed Configuration Values
   =================================== */

CONFIG.COMPUTED = {
    IS_MOBILE: typeof window !== 'undefined' ? 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : false,
    IS_TOUCH_DEVICE: typeof window !== 'undefined' ? 
        'ontouchstart' in window || navigator.maxTouchPoints > 0 : false,
    IS_HIGH_DPI: typeof window !== 'undefined' ? window.devicePixelRatio > 1 : false,
    IS_DARK_MODE_PREFERRED: typeof window !== 'undefined' ? 
        window.matchMedia('(prefers-color-scheme: dark)').matches : false,
    IS_REDUCED_MOTION_PREFERRED: typeof window !== 'undefined' ? 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
    SUPPORTS_WEBGL: (() => {
        if (typeof window === 'undefined') return false;
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    })(),
    SUPPORTS_WEBWORKERS: typeof Worker !== 'undefined',
    SUPPORTS_WEBSOCKETS: typeof WebSocket !== 'undefined',
    SUPPORTS_OFFLINE: typeof window !== 'undefined' ? 
        'serviceWorker' in navigator && 'caches' in window : false,
    AVAILABLE_MEMORY: typeof navigator !== 'undefined' ? navigator.deviceMemory || 4 : 4,
    CONNECTION_TYPE: typeof navigator !== 'undefined' ? 
        navigator.connection?.effectiveType || 'unknown' : 'unknown'
};

/* ===================================
   Environment-specific overrides
   =================================== */

if (CONFIG.IS_DEV) {
    CONFIG.API_TIMEOUT = 60000;
    CONFIG.WS_RECONNECT_ATTEMPTS = 1;
    CONFIG.CACHE.ENABLE_HTTP_CACHE = false;
}

if (CONFIG.COMPUTED.IS_REDUCED_MOTION_PREFERRED) {
    CONFIG.UI.ANIMATION_DURATION = 0;
    CONFIG.VISUALIZATION.MAX_FPS = 30;
}

if (!CONFIG.COMPUTED.SUPPORTS_WEBGL) {
    CONFIG.VISUALIZATION.DEFAULT_RENDERER = 'canvas';
}

if (!CONFIG.COMPUTED.SUPPORTS_WEBSOCKETS) {
    CONFIG.ENABLE_WEBSOCKET = false;
    CONFIG.FEATURES.REAL_TIME_CLUSTERING = false;
}

if (CONFIG.COMPUTED.IS_MOBILE) {
    CONFIG.VISUALIZATION.MAX_FPS = 30;
    CONFIG.CLUSTERING.MAX_POINTS = 5000;
    CONFIG.UI.ANIMATION_DURATION = 200;
}

/* ===================================
   Freeze configuration to prevent modifications
   =================================== */

Object.freeze(CONFIG.CLUSTERING);
Object.freeze(CONFIG.VISUALIZATION);
Object.freeze(CONFIG.DATA);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.VERSION);
Object.freeze(CONFIG.COMPUTED);
Object.freeze(CONFIG);

/* ===================================
   Development logging
   =================================== */

if (CONFIG.DEV_TOOLS.ENABLE_CONSOLE_LOGS) {
    console.log('🔧 NCS-API Configuration loaded:', {
        environment: CONFIG.ENV,
        version: CONFIG.VERSION.APP,
        features: Object.keys(CONFIG.FEATURES).filter(key => CONFIG.FEATURES[key]),
        capabilities: CONFIG.COMPUTED
    });
}

/* ===================================
   Export everything
   =================================== */

// Export CONFIG as default
export default CONFIG;

// Export commonly used individual constants
export {
    ENV,
    CONFIG
};