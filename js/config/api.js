/**
 * FILE: js/config/api.js
 * API Configuration & Endpoint Management
 * NCS-API Website - Centralized API configuration
 */

/* ===================================
   Environment Configuration
   =================================== */

export const ENV = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Auto-detect environment
export const CURRENT_ENV = (() => {
  if (typeof window === 'undefined') return ENV.DEVELOPMENT;
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('dev')) {
    return ENV.DEVELOPMENT;
  } else if (hostname.includes('staging') || hostname.includes('test')) {
    return ENV.STAGING;
  } else {
    return ENV.PRODUCTION;
  }
})();

/* ===================================
   API Base URLs
   =================================== */

export const API_BASE_URLS = {
  [ENV.DEVELOPMENT]: 'http://localhost:8000/api/v1',
  [ENV.STAGING]: 'https://staging-api.ncs-cluster.com/v1',
  [ENV.PRODUCTION]: 'https://api.ncs-cluster.com/v1'
};

export const WS_BASE_URLS = {
  [ENV.DEVELOPMENT]: 'ws://localhost:8000/ws',
  [ENV.STAGING]: 'wss://staging-api.ncs-cluster.com/ws',
  [ENV.PRODUCTION]: 'wss://api.ncs-cluster.com/ws'
};

// Current API base URL
export const API_BASE_URL = API_BASE_URLS[CURRENT_ENV];
export const WS_BASE_URL = WS_BASE_URLS[CURRENT_ENV];

/* ===================================
   API Endpoints
   =================================== */

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },

  // Clustering endpoints
  CLUSTERING: {
    CLUSTER: '/cluster',
    BATCH_CLUSTER: '/cluster/batch',
    STREAM_CLUSTER: '/cluster/stream',
    ALGORITHMS: '/cluster/algorithms',
    QUALITY_METRICS: '/cluster/quality',
    EXPORT: '/cluster/export'
  },

  // Data processing
  DATA: {
    UPLOAD: '/data/upload',
    VALIDATE: '/data/validate',
    PREPROCESS: '/data/preprocess',
    SAMPLE: '/data/sample',
    SCHEMA: '/data/schema',
    TRANSFORM: '/data/transform'
  },

  // Visualization
  VISUALIZATION: {
    GENERATE: '/viz/generate',
    EXPORT: '/viz/export',
    TEMPLATES: '/viz/templates',
    INTERACTIVE: '/viz/interactive'
  },

  // Analytics & monitoring
  ANALYTICS: {
    USAGE: '/analytics/usage',
    PERFORMANCE: '/analytics/performance',
    ERRORS: '/analytics/errors',
    METRICS: '/analytics/metrics'
  },

  // User management
  USER: {
    PROFILE: '/user/profile',
    PREFERENCES: '/user/preferences',
    API_KEYS: '/user/api-keys',
    USAGE_STATS: '/user/usage',
    BILLING: '/user/billing'
  },

  // Examples & datasets
  EXAMPLES: {
    LIST: '/examples',
    GET: '/examples/:id',
    DATASETS: '/examples/datasets',
    DOWNLOAD: '/examples/datasets/:id/download'
  },

  // System endpoints
  SYSTEM: {
    HEALTH: '/health',
    STATUS: '/status',
    VERSION: '/version',
    DOCS: '/docs',
    OPENAPI: '/openapi.json'
  }
};

/* ===================================
   API Configuration
   =================================== */

export const API_CONFIG = {
  // Request defaults
  defaults: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client': 'ncs-web-app',
      'X-Client-Version': '1.0.0'
    }
  },

  // Rate limiting
  rateLimit: {
    requests: 100,
    window: 60000, // 1 minute
    burst: 20
  },

  // Authentication
  auth: {
    tokenKey: 'ncs_auth_token',
    refreshTokenKey: 'ncs_refresh_token',
    tokenExpiry: 3600000, // 1 hour
    autoRefresh: true,
    requireAuth: [
      '/cluster',
      '/data/upload',
      '/user',
      '/analytics'
    ]
  },

  // File upload limits
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedTypes: [
      'text/csv',
      'application/json',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    chunkSize: 1024 * 1024 // 1MB chunks
  },

  // WebSocket configuration
  websocket: {
    reconnectAttempts: 5,
    reconnectDelay: 2000,
    heartbeatInterval: 30000,
    maxMessageSize: 1024 * 1024 // 1MB
  }
};

/* ===================================
   URL Builder Functions
   =================================== */

/**
 * Build complete API URL from endpoint
 * @param {string} endpoint - Endpoint path
 * @param {Object} params - URL parameters to replace
 * @returns {string} Complete URL
 */
export function buildApiUrl(endpoint, params = {}) {
  let url = API_BASE_URL + endpoint;
  
  // Replace URL parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });
  
  return url;
}

/**
 * Build WebSocket URL
 * @param {string} path - WebSocket path
 * @returns {string} Complete WebSocket URL
 */
export function buildWsUrl(path = '') {
  return WS_BASE_URL + path;
}

/**
 * Add query parameters to URL
 * @param {string} url - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} URL with query parameters
 */
export function addQueryParams(url, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.set(key, value);
    }
  });
  
  return urlObj.toString();
}

/* ===================================
   Endpoint Helper Functions
   =================================== */

/**
 * Get clustering endpoint URL
 * @param {string} operation - Clustering operation (cluster, batch, stream, etc.)
 * @param {Object} params - URL parameters
 * @returns {string} Complete endpoint URL
 */
export function getClusteringUrl(operation = 'cluster', params = {}) {
  const endpoint = ENDPOINTS.CLUSTERING[operation.toUpperCase()];
  if (!endpoint) {
    throw new Error(`Unknown clustering operation: ${operation}`);
  }
  return buildApiUrl(endpoint, params);
}

/**
 * Get data processing endpoint URL
 * @param {string} operation - Data operation
 * @param {Object} params - URL parameters
 * @returns {string} Complete endpoint URL
 */
export function getDataUrl(operation, params = {}) {
  const endpoint = ENDPOINTS.DATA[operation.toUpperCase()];
  if (!endpoint) {
    throw new Error(`Unknown data operation: ${operation}`);
  }
  return buildApiUrl(endpoint, params);
}

/**
 * Get example dataset URL
 * @param {string} datasetId - Dataset ID
 * @returns {string} Complete download URL
 */
export function getDatasetUrl(datasetId) {
  return buildApiUrl(ENDPOINTS.EXAMPLES.DOWNLOAD, { id: datasetId });
}

/**
 * Get user endpoint URL
 * @param {string} operation - User operation
 * @param {Object} params - URL parameters
 * @returns {string} Complete endpoint URL
 */
export function getUserUrl(operation, params = {}) {
  const endpoint = ENDPOINTS.USER[operation.toUpperCase()];
  if (!endpoint) {
    throw new Error(`Unknown user operation: ${operation}`);
  }
  return buildApiUrl(endpoint, params);
}

/* ===================================
   Request Configuration Builders
   =================================== */

/**
 * Build request configuration with defaults
 * @param {Object} config - Custom configuration
 * @returns {Object} Complete request configuration
 */
export function buildRequestConfig(config = {}) {
  return {
    ...API_CONFIG.defaults,
    ...config,
    headers: {
      ...API_CONFIG.defaults.headers,
      ...config.headers
    }
  };
}

/**
 * Build authenticated request configuration
 * @param {string} token - Authentication token
 * @param {Object} config - Additional configuration
 * @returns {Object} Request configuration with auth
 */
export function buildAuthConfig(token, config = {}) {
  return buildRequestConfig({
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * Build file upload configuration
 * @param {File|Blob} file - File to upload
 * @param {Object} config - Additional configuration
 * @returns {Object} Upload configuration
 */
export function buildUploadConfig(file, config = {}) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add additional fields
  if (config.fields) {
    Object.entries(config.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  return {
    ...config,
    body: formData,
    headers: {
      // Don't set Content-Type for FormData - browser will set it with boundary
      ...config.headers
    }
  };
}

/* ===================================
   Error Response Helpers
   =================================== */

/**
 * Parse API error response
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed error data
 */
export async function parseErrorResponse(response) {
  let errorData = {
    status: response.status,
    statusText: response.statusText,
    message: 'An error occurred',
    code: 'UNKNOWN_ERROR',
    details: null
  };
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      errorData = {
        ...errorData,
        message: data.message || data.error || errorData.message,
        code: data.code || data.error_code || errorData.code,
        details: data.details || data.errors || null
      };
    } else {
      const text = await response.text();
      errorData.message = text || errorData.message;
    }
  } catch (parseError) {
    console.warn('Failed to parse error response:', parseError);
  }
  
  return errorData;
}

/**
 * Check if endpoint requires authentication
 * @param {string} endpoint - Endpoint path
 * @returns {boolean} True if authentication required
 */
export function requiresAuth(endpoint) {
  return API_CONFIG.auth.requireAuth.some(path => 
    endpoint.startsWith(path)
  );
}

/* ===================================
   Development Helpers
   =================================== */

/**
 * Log API request for debugging
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} config - Request configuration
 */
export function logApiRequest(method, url, config = {}) {
  if (CURRENT_ENV === ENV.DEVELOPMENT) {
    console.group(`🌐 API Request: ${method.toUpperCase()}`);
    console.log('URL:', url);
    console.log('Config:', config);
    console.groupEnd();
  }
}

/**
 * Log API response for debugging
 * @param {string} url - Request URL
 * @param {Response} response - Fetch response
 * @param {any} data - Response data
 */
export function logApiResponse(url, response, data) {
  if (CURRENT_ENV === ENV.DEVELOPMENT) {
    console.group(`📡 API Response: ${response.status}`);
    console.log('URL:', url);
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Data:', data);
    console.groupEnd();
  }
}

/* ===================================
   Mock Data Configuration (Development)
   =================================== */

export const MOCK_CONFIG = {
  enabled: CURRENT_ENV === ENV.DEVELOPMENT,
  delay: 500, // Simulate network delay
  
  // Mock responses for development
  responses: {
    [ENDPOINTS.CLUSTERING.CLUSTER]: {
      status: 200,
      data: {
        clusters: [
          { id: 0, points: [[1, 2], [1.5, 2.2]], centroid: [1.25, 2.1] },
          { id: 1, points: [[5, 6], [5.5, 6.2]], centroid: [5.25, 6.1] }
        ],
        quality_score: 0.85,
        algorithm: 'ncs',
        execution_time: 125
      }
    },
    
    [ENDPOINTS.DATA.VALIDATE]: {
      status: 200,
      data: {
        valid: true,
        rows: 1000,
        columns: 5,
        missing_values: 12,
        data_types: {
          feature_1: 'numeric',
          feature_2: 'numeric',
          feature_3: 'categorical',
          feature_4: 'numeric',
          feature_5: 'text'
        }
      }
    },
    
    [ENDPOINTS.EXAMPLES.LIST]: {
      status: 200,
      data: {
        examples: [
          {
            id: 'customer-segmentation',
            title: 'Customer Segmentation',
            category: 'business',
            dataset_size: '10k rows',
            algorithms: ['kmeans', 'ncs']
          },
          {
            id: 'anomaly-detection',
            title: 'Anomaly Detection',
            category: 'security',
            dataset_size: '50k rows',
            algorithms: ['dbscan', 'isolation_forest']
          }
        ]
      }
    }
  }
};

/* ===================================
   Export Configuration Object
   =================================== */

export default {
  ENV,
  CURRENT_ENV,
  API_BASE_URL,
  WS_BASE_URL,
  ENDPOINTS,
  API_CONFIG,
  buildApiUrl,
  buildWsUrl,
  addQueryParams,
  getClusteringUrl,
  getDataUrl,
  getDatasetUrl,
  getUserUrl,
  buildRequestConfig,
  buildAuthConfig,
  buildUploadConfig,
  parseErrorResponse,
  requiresAuth,
  logApiRequest,
  logApiResponse,
  MOCK_CONFIG
};