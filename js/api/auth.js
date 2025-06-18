/**
 * FILE: js/api/auth.js
 * Authentication Manager
 * NCS-API Website - User authentication and session management
 */

import { buildApiUrl, API_CONFIG } from '../config/api.js';
import { STORAGE_KEYS, ERROR_CODES, EVENTS } from '../config/constants.js';
import eventBus from '../core/eventBus.js';
import store, { actions } from '../core/state.js';
import apiClient from './client.js';

/* ===================================
   Authentication Manager Class
   =================================== */

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.refreshPromise = null;
    this.isRefreshing = false;
    
    // Auto-refresh settings
    this.autoRefresh = API_CONFIG.auth.autoRefresh;
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    this.refreshTimer = null;
    
    // Session management
    this.sessionId = null;
    this.lastActivity = Date.now();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.activityTimer = null;
    
    // Security features
    this.loginAttempts = 0;
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.lockoutEndTime = null;
    
    // Bind methods
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshTokens = this.refreshTokens.bind(this);
    this.checkAuth = this.checkAuth.bind(this);
    
    // Initialize
    this.init();
  }

  /**
   * Initialize authentication manager
   */
  init() {
    // Load stored authentication data
    this.loadStoredAuth();
    
    // Setup automatic token refresh
    if (this.autoRefresh) {
      this.setupTokenRefresh();
    }
    
    // Setup session activity tracking
    this.setupActivityTracking();
    
    // Setup API client integration
    this.setupApiClientIntegration();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('🔐 Authentication Manager initialized');
  }

  /**
   * Authenticate user with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Login options
   * @returns {Promise<Object>} User data and tokens
   */
  async login(email, password, options = {}) {
    // Check if account is locked
    if (this.isAccountLocked()) {
      const timeLeft = this.lockoutEndTime - Date.now();
      throw new Error(`Account locked. Try again in ${Math.ceil(timeLeft / 60000)} minutes.`);
    }

    try {
      console.log('🔐 Attempting user login...');
      
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        remember_me: options.rememberMe || false,
        device_info: this.getDeviceInfo()
      });

      // Reset login attempts on successful login
      this.loginAttempts = 0;
      this.lockoutEndTime = null;
      
      // Process authentication response
      await this.processAuthResponse(response);
      
      console.log('✅ User login successful');
      
      eventBus.emit(EVENTS.USER_LOGIN, {
        user: this.currentUser,
        timestamp: Date.now()
      });
      
      return {
        user: this.currentUser,
        accessToken: this.accessToken,
        expiresAt: this.tokenExpiresAt
      };
      
    } catch (error) {
      this.handleLoginError(error);
      throw error;
    }
  }

  /**
   * Logout current user
   * @param {Object} options - Logout options
   * @returns {Promise<void>}
   */
  async logout(options = {}) {
    try {
      console.log('🚪 Logging out user...');
      
      // Notify server if connected
      if (this.accessToken && !options.skipServerNotification) {
        try {
          await apiClient.post('/auth/logout', {
            session_id: this.sessionId,
            all_devices: options.allDevices || false
          });
        } catch (error) {
          console.warn('Failed to notify server of logout:', error);
        }
      }
      
      // Clear local authentication state
      this.clearAuthState();
      
      console.log('✅ User logout successful');
      
      eventBus.emit(EVENTS.USER_LOGOUT, {
        timestamp: Date.now(),
        reason: options.reason || 'user_initiated'
      });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear state anyway on logout error
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Refresh authentication tokens
   * @returns {Promise<Object>} New tokens
   */
  async refreshTokens() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    console.log('🔄 Refreshing authentication tokens...');
    
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      this.isRefreshing = false;
      return result;
    } catch (error) {
      this.isRefreshing = false;
      
      // If refresh fails, logout user
      await this.logout({ 
        reason: 'token_refresh_failed',
        skipServerNotification: true 
      });
      
      throw error;
    }
  }

  /**
   * Perform the actual token refresh request
   * @returns {Promise<Object>} New tokens
   */
  async performTokenRefresh() {
    try {
      const response = await apiClient.post('/auth/refresh', {
        refresh_token: this.refreshToken,
        session_id: this.sessionId
      });

      // Update tokens
      this.setTokens(
        response.access_token,
        response.refresh_token || this.refreshToken,
        response.expires_in
      );
      
      // Update user data if provided
      if (response.user) {
        this.setUser(response.user);
      }
      
      console.log('✅ Tokens refreshed successfully');
      
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.tokenExpiresAt
      };
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!(this.accessToken && this.currentUser && !this.isTokenExpired());
  }

  /**
   * Check if access token is expired
   * @returns {boolean} True if expired
   */
  isTokenExpired() {
    if (!this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt - 30000; // 30 second buffer
  }

  /**
   * Check if account is locked due to failed attempts
   * @returns {boolean} True if locked
   */
  isAccountLocked() {
    return this.lockoutEndTime && Date.now() < this.lockoutEndTime;
  }

  /**
   * Get current user
   * @returns {Object|null} Current user object
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current access token
   * @returns {string|null} Access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Get user permissions
   * @returns {Array} Array of user permissions
   */
  getUserPermissions() {
    return this.currentUser?.permissions || [];
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(permission) {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission) || permissions.includes('admin');
  }

  /**
   * Get user roles
   * @returns {Array} Array of user roles
   */
  getUserRoles() {
    return this.currentUser?.roles || [];
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  hasRole(role) {
    return this.getUserRoles().includes(role);
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(updates) {
    try {
      const response = await apiClient.put('/user/profile', updates);
      
      this.setUser(response.user);
      
      eventBus.emit(EVENTS.USER_PREFERENCES_CHANGE, {
        user: this.currentUser,
        updates,
        timestamp: Date.now()
      });
      
      return this.currentUser;
      
    } catch (error) {
      console.error('❌ Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      console.log('✅ Password changed successfully');
      
    } catch (error) {
      console.error('❌ Password change failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/forgot-password', { email });
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(token, newPassword) {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword
      });
      
      console.log('✅ Password reset successful');
      
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   * @param {string} token - Verification token
   * @returns {Promise<void>}
   */
  async verifyEmail(token) {
    try {
      const response = await apiClient.post('/auth/verify-email', { token });
      
      if (response.user) {
        this.setUser(response.user);
      }
      
      console.log('✅ Email verified successfully');
      
    } catch (error) {
      console.error('❌ Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Check authentication status
   * @returns {Promise<boolean>} True if still authenticated
   */
  async checkAuth() {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await apiClient.get('/auth/verify');
      
      if (response.user) {
        this.setUser(response.user);
      }
      
      return true;
      
    } catch (error) {
      console.warn('Auth verification failed:', error);
      
      // Try to refresh token if verification fails
      if (this.refreshToken) {
        try {
          await this.refreshTokens();
          return true;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      // Clear auth state if verification and refresh both fail
      this.clearAuthState();
      return false;
    }
  }

  /**
   * Process authentication response
   * @param {Object} response - Authentication response
   */
  async processAuthResponse(response) {
    // Set tokens
    this.setTokens(
      response.access_token,
      response.refresh_token,
      response.expires_in
    );
    
    // Set user data
    this.setUser(response.user);
    
    // Set session data
    this.sessionId = response.session_id;
    
    // Update store
    store.dispatch(actions.setUserAuthenticated(
      true,
      this.currentUser,
      this.accessToken
    ));
    
    // Setup auto-refresh
    if (this.autoRefresh) {
      this.scheduleTokenRefresh();
    }
    
    // Reset activity tracking
    this.resetActivityTimer();
    
    // Save to storage
    this.saveAuthToStorage();
  }

  /**
   * Set authentication tokens
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @param {number} expiresIn - Token expiry in seconds
   */
  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
    
    // Update API client token
    apiClient.setToken(accessToken, refreshToken);
  }

  /**
   * Set user data
   * @param {Object} user - User object
   */
  setUser(user) {
    this.currentUser = user;
    store.dispatch(actions.setUserProfile(user));
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.sessionId = null;
    
    // Clear timers
    this.clearRefreshTimer();
    this.clearActivityTimer();
    
    // Update store
    store.dispatch(actions.setUserAuthenticated(false, null, null));
    
    // Clear API client auth
    apiClient.clearAuth();
    
    // Clear storage
    this.clearAuthFromStorage();
  }

  /**
   * Handle login error
   * @param {Error} error - Login error
   */
  handleLoginError(error) {
    this.loginAttempts++;
    
    if (this.loginAttempts >= this.maxLoginAttempts) {
      this.lockoutEndTime = Date.now() + this.lockoutDuration;
      console.warn(`🔒 Account locked for ${this.lockoutDuration / 60000} minutes due to failed login attempts`);
    }
    
    console.error('❌ Login failed:', error);
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    this.scheduleTokenRefresh();
  }

  /**
   * Schedule token refresh
   */
  scheduleTokenRefresh() {
    this.clearRefreshTimer();
    
    if (!this.tokenExpiresAt) return;
    
    const timeUntilRefresh = this.tokenExpiresAt - Date.now() - this.refreshThreshold;
    
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshTokens();
          this.scheduleTokenRefresh(); // Schedule next refresh
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }, timeUntilRefresh);
    }
  }

  /**
   * Clear refresh timer
   */
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Setup activity tracking for session management
   */
  setupActivityTracking() {
    if (typeof window === 'undefined') return;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, this.updateActivity.bind(this), true);
    });
    
    this.resetActivityTimer();
  }

  /**
   * Update user activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Reset activity timer
   */
  resetActivityTimer() {
    this.clearActivityTimer();
    
    this.activityTimer = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      
      if (timeSinceActivity > this.sessionTimeout) {
        console.log('🕐 Session timeout due to inactivity');
        this.logout({ reason: 'session_timeout' });
      }
    }, 60000); // Check every minute
  }

  /**
   * Clear activity timer
   */
  clearActivityTimer() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Setup API client integration
   */
  setupApiClientIntegration() {
    // Provide auth token to API client
    if (this.accessToken) {
      apiClient.setToken(this.accessToken, this.refreshToken);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for network changes
    eventBus.on(EVENTS.NETWORK_ONLINE, async () => {
      if (this.isAuthenticated()) {
        await this.checkAuth();
      }
    });
  }

  /**
   * Get device information for security
   * @returns {Object} Device information
   */
  getDeviceInfo() {
    if (typeof window === 'undefined') return {};
    
    return {
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform
    };
  }

  /**
   * Load stored authentication data
   */
  loadStoredAuth() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const user = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      
      if (token && user) {
        this.accessToken = token;
        this.refreshToken = refreshToken;
        this.currentUser = JSON.parse(user);
        
        // Update API client
        apiClient.setToken(token, refreshToken);
        
        // Update store
        store.dispatch(actions.setUserAuthenticated(true, this.currentUser, token));
        
        console.log('🔐 Restored authentication from storage');
      }
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
      this.clearAuthFromStorage();
    }
  }

  /**
   * Save authentication data to storage
   */
  saveAuthToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      if (this.accessToken) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, this.accessToken);
      }
      
      if (this.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, this.refreshToken);
      }
      
      if (this.currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.currentUser));
      }
    } catch (error) {
      console.warn('Failed to save auth to storage:', error);
    }
  }

  /**
   * Clear authentication data from storage
   */
  clearAuthFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.warn('Failed to clear auth from storage:', error);
    }
  }
}

/* ===================================
   Authentication Utilities
   =================================== */

/**
 * Create authentication guards for protected routes
 * @param {AuthManager} authManager - Auth manager instance
 * @returns {Object} Route guards
 */
export function createAuthGuards(authManager) {
  return {
    requireAuth: async (to, from, next) => {
      if (authManager.isAuthenticated()) {
        next();
      } else {
        // Try to restore auth or redirect to login
        const isAuthenticated = await authManager.checkAuth();
        if (isAuthenticated) {
          next();
        } else {
          next('/login');
        }
      }
    },
    
    requireRole: (role) => async (to, from, next) => {
      if (authManager.isAuthenticated() && authManager.hasRole(role)) {
        next();
      } else {
        next('/unauthorized');
      }
    },
    
    requirePermission: (permission) => async (to, from, next) => {
      if (authManager.isAuthenticated() && authManager.hasPermission(permission)) {
        next();
      } else {
        next('/unauthorized');
      }
    }
  };
}

/* ===================================
   Create and Export Auth Manager Instance
   =================================== */

export const authManager = new AuthManager();

// Create route guards
export const authGuards = createAuthGuards(authManager);

// Export for global access
if (typeof window !== 'undefined') {
  window.__NCS_AUTH__ = authManager;
}

export default authManager;