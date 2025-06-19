/**
 * NCS-API Website Configuration Constants
 * Central configuration for API endpoints, features, and application settings
 */

// Environment detection
const ENV = (() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
        return 'development';
    } else if (hostname.includes('staging') || hostname.includes('dev.')) {
        return 'staging';
    } else {
        return 'production';
    }
})();

// API Configuration
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

// Main Configuration Object
export const CONFIG = {
    // Environment
    ENV,
    IS_DEV: ENV === 'development',
    IS_STAGING: ENV === 'staging',
    IS_PROD: ENV === 'production',
    
    // API Endpoints
    API_BASE_URL: API_CONFIG[ENV].HTTP_BASE_URL,
    WEBSOCKET_URL: API_CONFIG[ENV].WEBSOCKET_URL,
    DOCS_URL: API_CONFIG[ENV].DOCS_URL,
    
    // API Configuration
    API_TIMEOUT: 30000, // 30 seconds
    API_RETRY_ATTEMPTS: 3,
    API_RETRY_DELAY: 1000, // 1 second
    
    // WebSocket Configuration
    ENABLE_WEBSOCKET: true,
    WS_RECONNECT_ATTEMPTS: 5,
    WS_RECONNECT_DELAY: 2000, // 2 seconds
    WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
    WS_TIMEOUT: 10000, // 10 seconds
    
    // Performance Monitoring
    ENABLE_PERFORMANCE_MONITORING: true,
    PERFORMANCE_SAMPLE_RATE: ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    PERFORMANCE_REPORT_INTERVAL: 30000, // 30 seconds
    
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
        COLLABORATIVE_FEATURES: false, // Coming soon
        AI_SUGGESTIONS: false, // Coming soon
        CUSTOM_ALGORITHMS: true,
        VOICE_COMMANDS: false, // Experimental
        AR_VISUALIZATION: false // Experimental
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
        DEFAULT_RENDERER: 'canvas', // 'canvas', 'webgl', 'svg'
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
        NORMALIZATION_METHOD: 'standard', // 'standard', 'minmax', 'robust'
        MISSING_VALUE_STRATEGY: 'drop' // 'drop', 'mean', 'median', 'mode'
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
        MAX_REQUEST_SIZE: 100 * 1024 * 1024, // 100MB
        RATE_LIMIT: {
            REQUESTS_PER_MINUTE: 120,
            BURST_LIMIT: 20
        }
    },
    
    // Cache Configuration
    CACHE: {
        ENABLE_HTTP_CACHE: true,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        MAX_CACHE_SIZE: 100, // Number of entries
        STORAGE_TYPE: 'memory' // 'memory', 'localStorage', 'sessionStorage'
    },
    
    // Progressive Web App
    PWA: {
        ENABLE_SERVICE_WORKER: ENV === 'production',
        CACHE_STRATEGY: 'cache-first', // 'cache-first', 'network-first', 'stale-while-revalidate'
        OFFLINE_FALLBACK: true,
        UPDATE_CHECK_INTERVAL: 60 * 60 * 1000 // 1 hour
    },
    
    // Playground Configuration
    PLAYGROUND: {
        AUTO_RUN: false,
        SAVE_STATE: true,
        SHARE_FUNCTIONALITY: true,
        REAL_TIME_COLLABORATION: false, // Coming soon
        MAX_HISTORY_STATES: 50,
        AUTO_SAVE_INTERVAL: 30000, // 30 seconds
        CODE_TEMPLATES: {
            python: 'python-template.py',
            javascript: 'javascript-template.js',
            curl: 'curl-template.sh'
        }
    },
    
    // Documentation
    DOCS: {
        SEARCH_ENABLED: true,
        SYNTAX_HIGHLIGHTING: true,
        LIVE_EXAMPLES: true,
        API_EXPLORER: true,
        FEEDBACK_ENABLED: true
    },
    
    // Benchmarks
    BENCHMARKS: {
        AUTO_REFRESH: true,
        REFRESH_INTERVAL: 30000, // 30 seconds
        HISTORICAL_DATA_POINTS: 100,
        COMPARISON_ALGORITHMS: [
            'kmeans', 'dbscan', 'hierarchical', 'gaussian-mixture'
        ],
        PERFORMANCE_METRICS: [
            'execution_time',
            'throughput',
            'quality_score',
            'memory_usage',
            'cpu_usage'
        ]
    },
    
    // Notifications
    NOTIFICATIONS: {
        ENABLE_PUSH: false, // Coming soon
        ENABLE_EMAIL: false, // Coming soon
        TOAST_POSITION: 'top-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
        MAX_TOASTS: 5,
        AUTO_DISMISS: true
    },
    
    // Accessibility
    A11Y: {
        HIGH_CONTRAST_MODE: false,
        REDUCE_MOTION: false, // Will be overridden by user preference
        SCREEN_READER_ANNOUNCEMENTS: true,
        KEYBOARD_NAVIGATION: true,
        FOCUS_INDICATORS: true
    },
    
    // Internationalization
    I18N: {
        DEFAULT_LOCALE: 'en-US',
        SUPPORTED_LOCALES: ['en-US'], // Future: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'ja-JP']
        ENABLE_RTL: false,
        DATE_FORMAT: 'MM/DD/YYYY',
        NUMBER_FORMAT: 'en-US'
    },
    
    // Development Tools
    DEV_TOOLS: {
        ENABLE_CONSOLE_LOGS: ENV !== 'production',
        ENABLE_DEBUG_PANEL: ENV === 'development',
        PERFORMANCE_PROFILING: ENV === 'development',
        MOCK_API_RESPONSES: false,
        BYPASS_AUTH: ENV === 'development'
    },
    
    // External Services
    EXTERNAL_SERVICES: {
        CDN_BASE_URL: 'https://cdn.ncs-cluster.com',
        MAPS_API_KEY: null, // For geographic clustering demos
        UPLOAD_SERVICE: 'https://upload.ncs-cluster.com',
        FEEDBACK_SERVICE: 'https://feedback.ncs-cluster.com'
    },
    
    // Version Information
    VERSION: {
        APP: '2.1.0',
        API: '1.4.2',
        BUILD: ENV === 'development' ? 'dev' : '20250617',
        COMMIT_HASH: 'abc123def456' // Will be replaced during build
    },
    
    // Legal & Compliance
    LEGAL: {
        PRIVACY_POLICY_URL: '/privacy',
        TERMS_OF_SERVICE_URL: '/terms',
        COOKIE_POLICY_URL: '/cookies',
        GDPR_COMPLIANCE: true,
        CCPA_COMPLIANCE: true,
        DATA_RETENTION_DAYS: 365
    }
};

// Computed Configuration Values
CONFIG.COMPUTED = {
    IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    IS_TOUCH_DEVICE: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    IS_HIGH_DPI: window.devicePixelRatio > 1,
    IS_DARK_MODE_PREFERRED: window.matchMedia('(prefers-color-scheme: dark)').matches,
    IS_REDUCED_MOTION_PREFERRED: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    SUPPORTS_WEBGL: (() => {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    })(),
    SUPPORTS_WEBWORKERS: typeof Worker !== 'undefined',
    SUPPORTS_WEBSOCKETS: typeof WebSocket !== 'undefined',
    SUPPORTS_OFFLINE: 'serviceWorker' in navigator && 'caches' in window,
    AVAILABLE_MEMORY: navigator.deviceMemory || 4, // GB
    CONNECTION_TYPE: navigator.connection?.effectiveType || 'unknown'
};

// Update A11Y settings based on user preferences
if (CONFIG.COMPUTED.IS_REDUCED_MOTION_PREFERRED) {
    CONFIG.A11Y.REDUCE_MOTION = true;
    CONFIG.UI.ANIMATION_DURATION = 0;
    CONFIG.VISUALIZATION.MAX_FPS = 30;
}

// Environment-specific overrides
if (CONFIG.IS_DEV) {
    CONFIG.API_TIMEOUT = 60000; // Longer timeout for development
    CONFIG.WS_RECONNECT_ATTEMPTS = 1; // Fewer reconnects in dev
    CONFIG.CACHE.ENABLE_HTTP_CACHE = false; // Disable cache in dev
}

// Feature detection and fallbacks
if (!CONFIG.COMPUTED.SUPPORTS_WEBGL) {
    CONFIG.VISUALIZATION.DEFAULT_RENDERER = 'canvas';
}

if (!CONFIG.COMPUTED.SUPPORTS_WEBSOCKETS) {
    CONFIG.ENABLE_WEBSOCKET = false;
    CONFIG.FEATURES.REAL_TIME_CLUSTERING = false;
}

if (CONFIG.COMPUTED.IS_MOBILE) {
    CONFIG.VISUALIZATION.MAX_FPS = 30; // Lower FPS on mobile
    CONFIG.CLUSTERING.MAX_POINTS = 5000; // Fewer points on mobile
    CONFIG.UI.ANIMATION_DURATION = 200; // Faster animations on mobile
}

// Validation
const validateConfig = () => {
    const errors = [];
    
    if (!CONFIG.API_BASE_URL) {
        errors.push('API_BASE_URL is required');
    }
    
    if (CONFIG.CLUSTERING.MAX_CLUSTERS > 50) {
        errors.push('MAX_CLUSTERS should not exceed 50 for performance reasons');
    }
    
    if (CONFIG.DATA.MAX_FILE_SIZE > 100 * 1024 * 1024) {
        errors.push('MAX_FILE_SIZE should not exceed 100MB');
    }
    
    if (errors.length > 0) {
        console.error('Configuration validation errors:', errors);
        if (CONFIG.IS_DEV) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }
};

// Validate configuration in development
if (CONFIG.IS_DEV) {
    validateConfig();
}

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG.CLUSTERING);
Object.freeze(CONFIG.VISUALIZATION);
Object.freeze(CONFIG.DATA);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.VERSION);
Object.freeze(CONFIG.COMPUTED);
Object.freeze(CONFIG);

// Export individual sections for convenience
export const API_CONFIG_EXPORT = CONFIG.API_BASE_URL;
export const CLUSTERING_CONFIG = CONFIG.CLUSTERING;
export const VISUALIZATION_CONFIG = CONFIG.VISUALIZATION;
export const UI_CONFIG = CONFIG.UI;
export const FEATURES = CONFIG.FEATURES;

// Console logging for development
if (CONFIG.DEV_TOOLS.ENABLE_CONSOLE_LOGS) {
    console.log('🔧 NCS-API Configuration loaded:', {
        environment: CONFIG.ENV,
        version: CONFIG.VERSION.APP,
        features: Object.keys(CONFIG.FEATURES).filter(key => CONFIG.FEATURES[key]),
        capabilities: CONFIG.COMPUTED
    });
}

// js/config/constants.js


export const UI_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success'
};

export const PROCESSING_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const STORAGE_KEYS = {
  THEME: 'ncs_theme',
  USER_PROFILE: 'ncs_user_profile',
  AUTH_TOKEN: 'ncs_auth_token',
  PREFERENCES: 'ncs_user_preferences',
  LAST_DATASET: 'ncs_last_dataset',
  CLUSTERING_HISTORY: 'ncs_clustering_history',
  SAVED_VISUALIZATIONS: 'ncs_saved_visualizations'
};

export const DEFAULTS = {
  theme: 'light',
  language: 'en',
  algorithm: 'kmeans',
  chart_type: 'scatter',
  color_scheme: 'default',
  point_size: 5,
  opacity: 0.8,
  batch_size: 50
};
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  TIMEOUT: 'ECONNABORTED',
  WS_CLOSED: 1000
};


export const EVENTS = {
  APP_READY: 'app_ready',
  APP_ERROR: 'app_error',
  DATA_LOADED: 'data_loaded',
  DATA_VALIDATED: 'data_validated',
  DATA_PROCESSED: 'data_processed',
  DATA_ERROR: 'data_error',
  
  CLUSTERING_START: 'clustering_start',
  CLUSTERING_PROGRESS: 'clustering_progress',
  CLUSTERING_COMPLETE: 'clustering_complete',
  CLUSTERING_ERROR: 'clustering_error',

  VIZ_RENDER: 'viz_render',
  VIZ_UPDATE: 'viz_update',
  VIZ_EXPORT: 'viz_export',
  
  THEME_CHANGE: 'theme_change',
  THEME_TOGGLE: 'theme_toggle',

  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  NETWORK_ONLINE: 'network_online',
  NETWORK_OFFLINE: 'network_offline'
};

export default CONFIG;
