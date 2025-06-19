/**
 * FILE: js/config/themes.js
 * Theme Configuration & Management System
 * NCS-API Website - Theme switching and persistence
 */

/* ===================================
   Theme Configuration
   =================================== */

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

export const THEME_CONFIG = {
  // Theme metadata
  themes: {
    [THEMES.LIGHT]: {
      name: 'Light',
      icon: '☀️',
      class: 'theme-light',
      description: 'Clean light theme with high contrast',
      colors: {
        primary: '#6366f1',
        secondary: '#06b6d4',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827'
      }
    },
    [THEMES.DARK]: {
      name: 'Dark',
      icon: '🌙',
      class: 'theme-dark',
      description: 'Modern dark theme optimized for low light',
      colors: {
        primary: '#818cf8',
        secondary: '#22d3ee',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9'
      }
    },
    [THEMES.AUTO]: {
      name: 'Auto',
      icon: '🌓',
      class: 'theme-auto',
      description: 'Automatically follows system preference',
      colors: null // Determined by system
    }
  },

  // Default settings
  default: THEMES.AUTO,
  storageKey: 'ncs-api-theme',
  transitionDuration: 300,
  
  // CSS classes
  bodyClasses: {
    transitioning: 'theme-transitioning',
    noTransition: 'theme-no-transition'
  },

  // Events
  events: {
    change: 'theme:change',
    toggle: 'theme:toggle',
    systemChange: 'theme:system-change'
  },

  // Media query for system preference
  mediaQuery: '(prefers-color-scheme: dark)'
};

/* ===================================
   Theme Manager Class
   =================================== */

export class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.systemPreference = null;
    this.mediaQueryList = null;
    this.eventBus = null;
    this.initialized = false;
    
    // Bind methods
    this.handleSystemChange = this.handleSystemChange.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
  }

  /**
   * Initialize the theme manager
   * @param {Object} eventBus - Event bus instance for communication
   */
  async init(eventBus = null) {
    if (this.initialized) return;

    this.eventBus = eventBus;
    
    // Detect system preference
    this.detectSystemPreference();
    
    // Setup media query listener
    this.setupMediaQueryListener();
    
    // Setup storage listener
    this.setupStorageListener();
    
    // Load saved theme or use default
    const savedTheme = this.getSavedTheme();
    const initialTheme = savedTheme || THEME_CONFIG.default;
    
    // Apply theme without transition on init
    await this.setTheme(initialTheme, false);
    
    this.initialized = true;
    
    // Emit ready event
    this.emit('theme:ready', {
      theme: this.currentTheme,
      systemPreference: this.systemPreference
    });
    
    console.log('🎨 Theme Manager initialized:', {
      current: this.currentTheme,
      system: this.systemPreference,
      available: Object.keys(THEME_CONFIG.themes)
    });
  }

  /**
   * Set the current theme
   * @param {string} theme - Theme name (light, dark, auto)
   * @param {boolean} withTransition - Whether to animate the transition
   */
  async setTheme(theme, withTransition = true) {
    if (!Object.values(THEMES).includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    const previousTheme = this.currentTheme;
    const resolvedTheme = this.resolveTheme(theme);
    
    // Don't do anything if theme hasn't changed
    if (previousTheme === theme && this.getAppliedTheme() === resolvedTheme) {
      return;
    }

    // Start transition
    if (withTransition) {
      this.startTransition();
    }

    try {
      // Update current theme
      this.currentTheme = theme;
      
      // Apply theme to DOM
      this.applyTheme(resolvedTheme);
      
      // Save to storage
      this.saveTheme(theme);
      
      // Update meta theme-color
      this.updateMetaThemeColor(resolvedTheme);
      
      // Emit change event
      this.emit(THEME_CONFIG.events.change, {
        theme,
        resolvedTheme,
        previousTheme,
        colors: THEME_CONFIG.themes[resolvedTheme]?.colors
      });

      console.log('🎨 Theme changed:', {
        from: previousTheme,
        to: theme,
        resolved: resolvedTheme
      });

    } catch (error) {
      console.error('Error setting theme:', error);
    } finally {
      // End transition
      if (withTransition) {
        setTimeout(() => this.endTransition(), THEME_CONFIG.transitionDuration);
      }
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const currentResolved = this.getAppliedTheme();
    const newTheme = currentResolved === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    
    this.setTheme(newTheme, true);
    this.emit(THEME_CONFIG.events.toggle, { 
      from: currentResolved, 
      to: newTheme 
    });
  }

  /**
   * Get the currently applied theme (resolved)
   */
  getAppliedTheme() {
    return this.resolveTheme(this.currentTheme);
  }

  /**
   * Get the current theme setting (may be 'auto')
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get system color scheme preference
   */
  getSystemPreference() {
    return this.systemPreference;
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.keys(THEME_CONFIG.themes).map(key => ({
      key,
      ...THEME_CONFIG.themes[key]
    }));
  }

  /**
   * Resolve theme name to actual theme (handles 'auto')
   * @param {string} theme - Theme name
   * @returns {string} Resolved theme name
   */
  resolveTheme(theme) {
    if (theme === THEMES.AUTO) {
      return this.systemPreference === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    }
    return theme;
  }

  /**
   * Apply theme to DOM
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    const body = document.body;
    const themeConfig = THEME_CONFIG.themes[theme];
    
    if (!themeConfig) {
      console.error(`Theme config not found: ${theme}`);
      return;
    }

    // Remove all theme classes
    Object.values(THEME_CONFIG.themes).forEach(config => {
      body.classList.remove(config.class);
    });

    // Add new theme class
    body.classList.add(themeConfig.class);
    
    // Update data attribute for CSS targeting
    body.setAttribute('data-theme', theme);
    
    // Update CSS custom properties if needed
    this.updateCustomProperties(theme);
  }

  /**
   * Update CSS custom properties for theme
   * @param {string} theme - Theme name
   */
  updateCustomProperties(theme) {
    const themeConfig = THEME_CONFIG.themes[theme];
    if (!themeConfig.colors) return;

    const root = document.documentElement;
    
    // Update primary colors for quick access
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--theme-${key}`, value);
      }
    });
  }

  /**
   * Update meta theme-color for mobile browsers
   * @param {string} theme - Theme name
   */
  updateMetaThemeColor(theme) {
    const themeConfig = THEME_CONFIG.themes[theme];
    if (!themeConfig.colors) return;

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.content = themeConfig.colors.primary;
  }

  /**
   * Start theme transition animation
   */
  startTransition() {
    const body = document.body;
    body.classList.add(THEME_CONFIG.bodyClasses.transitioning);
    
    // Add transition styles
    const style = document.createElement('style');
    style.id = 'theme-transition-styles';
    style.textContent = `
      * {
        transition: 
          background-color ${THEME_CONFIG.transitionDuration}ms ease-in-out,
          border-color ${THEME_CONFIG.transitionDuration}ms ease-in-out,
          color ${THEME_CONFIG.transitionDuration}ms ease-in-out,
          box-shadow ${THEME_CONFIG.transitionDuration}ms ease-in-out !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * End theme transition animation
   */
  endTransition() {
    const body = document.body;
    body.classList.remove(THEME_CONFIG.bodyClasses.transitioning);
    
    // Remove transition styles
    const transitionStyles = document.getElementById('theme-transition-styles');
    if (transitionStyles) {
      transitionStyles.remove();
    }
  }

  /**
   * Detect system color scheme preference
   */
  detectSystemPreference() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      this.systemPreference = THEMES.LIGHT;
      return;
    }

    const prefersDark = window.matchMedia(THEME_CONFIG.mediaQuery).matches;
    this.systemPreference = prefersDark ? THEMES.DARK : THEMES.LIGHT;
  }

  /**
   * Setup media query listener for system preference changes
   */
  setupMediaQueryListener() {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    this.mediaQueryList = window.matchMedia(THEME_CONFIG.mediaQuery);
    this.mediaQueryList.addEventListener('change', this.handleSystemChange);
  }

  /**
   * Handle system preference change
   * @param {MediaQueryListEvent} event - Media query event
   */
  handleSystemChange(event) {
    const newSystemPreference = event.matches ? THEMES.DARK : THEMES.LIGHT;
    const oldSystemPreference = this.systemPreference;
    
    this.systemPreference = newSystemPreference;
    
    // Only apply if current theme is auto
    if (this.currentTheme === THEMES.AUTO) {
      this.applyTheme(newSystemPreference);
      
      // Update meta theme color
      this.updateMetaThemeColor(newSystemPreference);
    }
    
    this.emit(THEME_CONFIG.events.systemChange, {
      systemPreference: newSystemPreference,
      previousSystemPreference: oldSystemPreference,
      willApply: this.currentTheme === THEMES.AUTO
    });
  }

  /**
   * Setup storage listener for cross-tab synchronization
   */
  setupStorageListener() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('storage', this.handleStorageChange);
  }

  /**
   * Handle storage change from other tabs
   * @param {StorageEvent} event - Storage event
   */
  handleStorageChange(event) {
    if (event.key === THEME_CONFIG.storageKey && event.newValue) {
      const newTheme = event.newValue;
      if (newTheme !== this.currentTheme) {
        this.setTheme(newTheme, true);
      }
    }
  }

  /**
   * Save theme to localStorage
   * @param {string} theme - Theme to save
   */
  saveTheme(theme) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    try {
      localStorage.setItem(THEME_CONFIG.storageKey, theme);
    } catch (error) {
      console.warn('Could not save theme to localStorage:', error);
    }
  }

  /**
   * Get saved theme from localStorage
   * @returns {string|null} Saved theme or null
   */
  getSavedTheme() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    try {
      return localStorage.getItem(THEME_CONFIG.storageKey);
    } catch (error) {
      console.warn('Could not read theme from localStorage:', error);
      return null;
    }
  }

  /**
   * Emit event using event bus or custom events
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  emit(eventName, data) {
    // Use event bus if available
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(eventName, data);
    }
    
    // Fallback to custom DOM events
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { 
        detail: data 
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Cleanup - remove listeners
   */
  destroy() {
    if (this.mediaQueryList) {
      this.mediaQueryList.removeEventListener('change', this.handleSystemChange);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
    }
    
    this.initialized = false;
    console.log('🎨 Theme Manager destroyed');
  }
}

/* ===================================
   Theme Utilities
   =================================== */

/**
 * Get theme-aware color value
 * @param {string} lightColor - Color for light theme
 * @param {string} darkColor - Color for dark theme
 * @returns {string} Appropriate color for current theme
 */
export function getThemeColor(lightColor, darkColor) {
  if (typeof window === 'undefined') return lightColor;
  
  const isDark = document.body.classList.contains('theme-dark');
  return isDark ? darkColor : lightColor;
}

/**
 * Check if dark theme is currently active
 * @returns {boolean} True if dark theme is active
 */
export function isDarkTheme() {
  if (typeof window === 'undefined') return false;
  return document.body.classList.contains('theme-dark');
}

/**
 * Check if light theme is currently active
 * @returns {boolean} True if light theme is active
 */
export function isLightTheme() {
  if (typeof window === 'undefined') return true;
  return document.body.classList.contains('theme-light');
}

/**
 * Get CSS variable value for current theme
 * @param {string} variable - CSS variable name (without --)
 * @returns {string} CSS variable value
 */
export function getThemeVariable(variable) {
  if (typeof window === 'undefined') return '';
  
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(`--${variable}`).trim();
}

/**
 * Create theme-aware media query
 * @param {string} lightQuery - Media query for light theme
 * @param {string} darkQuery - Media query for dark theme
 * @returns {string} Combined media query
 */
export function createThemeMediaQuery(lightQuery, darkQuery) {
  return `
    @media ${lightQuery} {
      .theme-light ${lightQuery} { /* styles */ }
    }
    @media ${darkQuery} {
      .theme-dark ${darkQuery} { /* styles */ }
    }
  `;
}

/* ===================================
   Theme Presets for Components
   =================================== */

export const COMPONENT_THEMES = {
  button: {
    light: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300'
    },
    dark: {
      primary: 'bg-blue-500 text-white hover:bg-blue-400',
      secondary: 'bg-gray-700 text-gray-100 hover:bg-gray-600'
    }
  },
  
  card: {
    light: {
      default: 'bg-white border-gray-200 shadow-sm',
      elevated: 'bg-white border-gray-200 shadow-lg'
    },
    dark: {
      default: 'bg-gray-800 border-gray-700 shadow-sm',
      elevated: 'bg-gray-800 border-gray-700 shadow-lg'
    }
  },
  
  input: {
    light: {
      default: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
      error: 'bg-white border-red-300 text-gray-900 focus:border-red-500'
    },
    dark: {
      default: 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-400',
      error: 'bg-gray-700 border-red-400 text-gray-100 focus:border-red-400'
    }
  }
};

/* ===================================
   Export Default Instance
   =================================== */

// Create singleton instance
export const themeManager = new ThemeManager();

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      themeManager.init();
    });
  } else {
    themeManager.init();
  }
}

export default themeManager;