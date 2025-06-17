/**
 * ThemeToggle Component
 * Handles theme switching with smooth animations and system preference detection
 */

export class ThemeToggle {
    constructor(element) {
        this.element = element;
        this.currentTheme = 'dark';
        this.systemPreference = null;
        this.autoMode = false;
        
        // Theme options
        this.themes = {
            light: {
                name: 'Light',
                icon: 'sun',
                class: 'theme-light'
            },
            dark: {
                name: 'Dark',
                icon: 'moon',
                class: 'theme-dark'
            },
            auto: {
                name: 'Auto',
                icon: 'monitor',
                class: 'theme-auto'
            }
        };
        
        // Animation state
        this.isAnimating = false;
        this.animationDuration = 300;
        
        // UI elements
        this.button = null;
        this.iconContainer = null;
        this.lightIcon = null;
        this.darkIcon = null;
        this.dropdown = null;
        this.options = [];
        
        // Event handlers
        this.handleClickBound = this.handleClick.bind(this);
        this.handleKeydownBound = this.handleKeydown.bind(this);
        this.handleSystemChangeBound = this.handleSystemChange.bind(this);
        this.handleOutsideClickBound = this.handleOutsideClick.bind(this);
        
        this.init();
    }

    /**
     * Initialize the theme toggle component
     */
    init() {
        this.findElements();
        this.detectSystemPreference();
        this.loadSavedTheme();
        this.setupEventListeners();
        this.updateUI();
        this.createDropdown();
        
        console.log('🎨 ThemeToggle initialized with theme:', this.currentTheme);
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        this.button = this.element;
        this.iconContainer = this.element.querySelector('.theme-icon-container') || this.element;
        this.lightIcon = this.element.querySelector('.theme-icon-light');
        this.darkIcon = this.element.querySelector('.theme-icon-dark');
        
        // Validate required elements
        if (!this.lightIcon || !this.darkIcon) {
            console.warn('⚠️ Theme icons not found, creating default icons');
            this.createDefaultIcons();
        }
    }

    /**
     * Create default icons if not found
     */
    createDefaultIcons() {
        this.iconContainer.innerHTML = `
            <svg class="theme-icon theme-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
            </svg>
            <svg class="theme-icon theme-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        `;
        
        this.lightIcon = this.element.querySelector('.theme-icon-light');
        this.darkIcon = this.element.querySelector('.theme-icon-dark');
    }

    /**
     * Detect system theme preference
     */
    detectSystemPreference() {
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.systemPreference = darkModeQuery.matches ? 'dark' : 'light';
            
            // Listen for system preference changes
            darkModeQuery.addEventListener('change', this.handleSystemChangeBound);
        } else {
            this.systemPreference = 'light'; // Default fallback
        }
    }

    /**
     * Load saved theme from localStorage
     */
    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem('ncs-theme');
            
            if (savedTheme && this.themes[savedTheme]) {
                this.currentTheme = savedTheme;
            } else {
                // Use system preference if no saved theme
                this.currentTheme = this.systemPreference || 'dark';
            }
            
            // Check if auto mode was enabled
            this.autoMode = savedTheme === 'auto';
            
        } catch (error) {
            console.warn('⚠️ Failed to load saved theme:', error);
            this.currentTheme = 'dark'; // Safe default
        }
    }

    /**
     * Save theme to localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem('ncs-theme', theme);
        } catch (error) {
            console.warn('⚠️ Failed to save theme:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.button.addEventListener('click', this.handleClickBound);
        this.button.addEventListener('keydown', this.handleKeydownBound);
        
        // Listen for theme change events from other sources
        window.addEventListener('theme-change', (event) => {
            if (event.detail.source !== 'theme-toggle') {
                this.currentTheme = event.detail.theme;
                this.updateUI();
            }
        });
    }

    /**
     * Handle click events
     */
    handleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.isAnimating) return;
        
        // Check if we should show dropdown or toggle directly
        if (event.ctrlKey || event.metaKey) {
            this.showDropdown();
        } else {
            this.toggleTheme();
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.toggleTheme();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.showDropdown();
                break;
            case 'Escape':
                this.hideDropdown();
                break;
        }
    }

    /**
     * Handle system theme preference changes
     */
    handleSystemChange(event) {
        this.systemPreference = event.matches ? 'dark' : 'light';
        
        // If in auto mode, update theme based on system preference
        if (this.autoMode || this.currentTheme === 'auto') {
            this.setTheme(this.systemPreference, false);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        if (this.isAnimating) return;
        
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
    }

    /**
     * Set specific theme
     */
    setTheme(theme, save = true) {
        if (this.isAnimating || theme === this.currentTheme) return;
        
        const previousTheme = this.currentTheme;
        this.currentTheme = theme;
        this.autoMode = theme === 'auto';
        
        // Resolve auto theme to actual theme
        const resolvedTheme = theme === 'auto' ? this.systemPreference : theme;
        
        // Animate theme change
        this.animateThemeChange(previousTheme, resolvedTheme);
        
        // Apply theme to document
        this.applyTheme(resolvedTheme);
        
        // Save theme preference
        if (save) {
            this.saveTheme(theme);
        }
        
        // Update UI
        this.updateUI();
        
        // Dispatch theme change event
        this.dispatchThemeChange(resolvedTheme);
        
        // Track theme change
        this.trackThemeChange(previousTheme, theme);
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        document.body.classList.add(`theme-${theme}`);
        
        // Update meta theme-color
        this.updateMetaThemeColor(theme);
        
        // Update CSS custom properties if needed
        this.updateCustomProperties(theme);
    }

    /**
     * Update meta theme color for mobile browsers
     */
    updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const colors = {
                light: '#ffffff',
                dark: '#1f2937'
            };
            metaThemeColor.content = colors[theme] || colors.dark;
        }
    }

    /**
     * Update CSS custom properties for theme
     */
    updateCustomProperties(theme) {
        const root = document.documentElement;
        
        // Theme-specific color updates could go here
        // This is optional since we're using CSS classes primarily
        if (theme === 'dark') {
            root.style.setProperty('--theme-transition', 'all 0.3s ease');
        } else {
            root.style.setProperty('--theme-transition', 'all 0.3s ease');
        }
    }

    /**
     * Animate theme change with smooth transition
     */
    animateThemeChange(fromTheme, toTheme) {
        if (!document.startViewTransition) {
            return; // No view transition support
        }
        
        this.isAnimating = true;
        
        // Use View Transitions API for smooth theme change
        document.startViewTransition(() => {
            this.applyTheme(toTheme);
        }).finished.finally(() => {
            this.isAnimating = false;
        });
    }

    /**
     * Update UI elements to reflect current theme
     */
    updateUI() {
        const resolvedTheme = this.autoMode ? this.systemPreference : this.currentTheme;
        
        // Update icon visibility
        if (this.lightIcon && this.darkIcon) {
            if (resolvedTheme === 'dark') {
                this.lightIcon.style.display = 'block';
                this.darkIcon.style.display = 'none';
            } else {
                this.lightIcon.style.display = 'none';
                this.darkIcon.style.display = 'block';
            }
        }
        
        // Update button attributes
        this.button.setAttribute('aria-label', `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`);
        this.button.setAttribute('title', `Current theme: ${this.themes[this.currentTheme]?.name || this.currentTheme}`);
        
        // Update button state
        this.button.setAttribute('data-theme', this.currentTheme);
        
        // Add visual feedback
        this.addVisualFeedback();
    }

    /**
     * Add visual feedback for theme change
     */
    addVisualFeedback() {
        // Add a brief animation to indicate theme change
        this.button.classList.add('theme-changing');
        
        setTimeout(() => {
            this.button.classList.remove('theme-changing');
        }, this.animationDuration);
    }

    /**
     * Create theme selection dropdown
     */
    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'theme-dropdown';
        this.dropdown.innerHTML = `
            <div class="theme-dropdown-content">
                <button class="theme-option" data-theme="light">
                    <svg class="theme-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="5"></circle>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                    </svg>
                    <span>Light</span>
                </button>
                <button class="theme-option" data-theme="dark">
                    <svg class="theme-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span>Dark</span>
                </button>
                <button class="theme-option" data-theme="auto">
                    <svg class="theme-option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Auto</span>
                </button>
            </div>
        `;
        
        // Position dropdown
        this.dropdown.style.position = 'absolute';
        this.dropdown.style.display = 'none';
        this.dropdown.style.zIndex = '1000';
        
        // Add to document
        document.body.appendChild(this.dropdown);
        
        // Setup dropdown event listeners
        this.setupDropdownEvents();
    }

    /**
     * Setup dropdown event listeners
     */
    setupDropdownEvents() {
        this.options = this.dropdown.querySelectorAll('.theme-option');
        
        this.options.forEach(option => {
            option.addEventListener('click', (event) => {
                const theme = event.currentTarget.getAttribute('data-theme');
                this.setTheme(theme);
                this.hideDropdown();
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', this.handleOutsideClickBound);
    }

    /**
     * Show theme selection dropdown
     */
    showDropdown() {
        if (!this.dropdown) return;
        
        // Position dropdown relative to button
        const rect = this.button.getBoundingClientRect();
        this.dropdown.style.top = `${rect.bottom + 8}px`;
        this.dropdown.style.left = `${rect.left}px`;
        this.dropdown.style.display = 'block';
        
        // Update selected option
        this.updateDropdownSelection();
        
        // Add show animation
        requestAnimationFrame(() => {
            this.dropdown.classList.add('theme-dropdown-show');
        });
        
        // Focus first option
        const firstOption = this.dropdown.querySelector('.theme-option');
        if (firstOption) {
            firstOption.focus();
        }
    }

    /**
     * Hide theme selection dropdown
     */
    hideDropdown() {
        if (!this.dropdown) return;
        
        this.dropdown.classList.remove('theme-dropdown-show');
        
        setTimeout(() => {
            this.dropdown.style.display = 'none';
        }, 150);
        
        // Return focus to button
        this.button.focus();
    }

    /**
     * Update dropdown selection state
     */
    updateDropdownSelection() {
        this.options.forEach(option => {
            const theme = option.getAttribute('data-theme');
            option.classList.toggle('theme-option-selected', theme === this.currentTheme);
        });
    }

    /**
     * Handle clicks outside dropdown
     */
    handleOutsideClick(event) {
        if (!this.dropdown || !this.dropdown.style.display === 'block') return;
        
        if (!this.dropdown.contains(event.target) && !this.button.contains(event.target)) {
            this.hideDropdown();
        }
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChange(theme) {
        const event = new CustomEvent('theme-change', {
            detail: {
                theme,
                previousTheme: this.currentTheme,
                source: 'theme-toggle',
                auto: this.autoMode
            }
        });
        
        window.dispatchEvent(event);
        
        // Also dispatch on the element itself
        this.element.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme, auto: this.autoMode }
        }));
    }

    /**
     * Track theme change for analytics
     */
    trackThemeChange(previousTheme, newTheme) {
        if (window.NCS?.performance) {
            window.NCS.performance.trackEvent('theme_change', {
                from: previousTheme,
                to: newTheme,
                auto: this.autoMode,
                system_preference: this.systemPreference
            });
        }
    }

    /**
     * Get current theme info
     */
    getThemeInfo() {
        return {
            current: this.currentTheme,
            resolved: this.autoMode ? this.systemPreference : this.currentTheme,
            auto: this.autoMode,
            system: this.systemPreference,
            available: Object.keys(this.themes)
        };
    }

    /**
     * Enable/disable auto mode
     */
    setAutoMode(enabled) {
        if (enabled) {
            this.setTheme('auto');
        } else if (this.autoMode) {
            this.setTheme(this.systemPreference);
        }
    }

    /**
     * Force theme update (useful for external changes)
     */
    refresh() {
        this.detectSystemPreference();
        this.loadSavedTheme();
        this.updateUI();
    }

    /**
     * Cleanup and destroy component
     */
    destroy() {
        // Remove event listeners
        this.button.removeEventListener('click', this.handleClickBound);
        this.button.removeEventListener('keydown', this.handleKeydownBound);
        document.removeEventListener('click', this.handleOutsideClickBound);
        
        // Remove system preference listener
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.removeEventListener('change', this.handleSystemChangeBound);
        }
        
        // Remove dropdown
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
        
        console.log('🗑️ ThemeToggle destroyed');
    }
}

// Export utility functions
export const ThemeUtils = {
    getCurrentTheme: () => {
        return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    },
    
    setTheme: (theme) => {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
    },
    
    getSystemPreference: () => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    }
};

export default ThemeToggle;