/**
 * Header Component - Main navigation header
 * NCS-API Website
 * 
 * Features:
 * - Responsive navigation menu
 * - Theme toggle functionality
 * - API status indicator
 * - Mobile hamburger menu
 * - Active route highlighting
 * - Search functionality
 * - Smooth animations
 */

import { CONFIG } from '../config/constants.js';

export class Header {
    constructor() {
        this.container = document.querySelector('header') || document.querySelector('.header');
        this.isInitialized = false;
        this.isMobileMenuOpen = false;
        this.currentTheme = 'dark';
        this.searchQuery = '';
        this.searchResults = [];
        
        // Navigation items
        this.navItems = [
            { name: 'Home', path: '/', exact: true },
            { name: 'Playground', path: '/playground' },
            { name: 'API Docs', path: '/docs' },
            { name: 'Benchmarks', path: '/benchmarks' },
            { name: 'Examples', path: '/examples' }
        ];
        
        // Search data for quick search
        this.searchData = [
            { title: 'K-Means Clustering', path: '/playground', type: 'algorithm' },
            { title: 'DBSCAN Algorithm', path: '/playground', type: 'algorithm' },
            { title: 'API Documentation', path: '/docs', type: 'page' },
            { title: 'Performance Benchmarks', path: '/benchmarks', type: 'page' },
            { title: 'Getting Started', path: '/docs#getting-started', type: 'section' },
            { title: 'Authentication', path: '/docs#auth', type: 'section' },
            { title: 'Rate Limiting', path: '/docs#rate-limits', type: 'section' },
            { title: 'Error Handling', path: '/docs#errors', type: 'section' },
            { title: 'Customer Segmentation', path: '/examples#customer-segmentation', type: 'example' },
            { title: 'Social Network Analysis', path: '/examples#social-networks', type: 'example' },
            { title: 'Financial Data Clustering', path: '/examples#financial', type: 'example' }
        ];
        
        // State management
        this.state = {
            isSearchOpen: false,
            isUserMenuOpen: false,
            activeRoute: '/',
            apiStatus: 'unknown', // 'online', 'degraded', 'offline', 'unknown'
            scrolled: false
        };
        
        // Event handlers (bound to preserve this context)
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        
        this.init();
    }

    /**
     * Initialize header component
     */
    async init() {
        try {
            if (!this.container) {
                // Create header if it doesn't exist
                this.createHeader();
            }

            console.log('🧭 Initializing Header component...');
            
            // Set up elements
            this.setupElements();
            
            // Bind events
            this.bindEvents();
            
            // Initialize theme
            this.initializeTheme();
            
            // Setup router integration
            this.setupRouterIntegration();
            
            // Setup API status monitoring
            this.setupAPIStatusMonitoring();
            
            // Mark as initialized
            this.isInitialized = true;
            this.container.classList.add('header-initialized');
            
            console.log('✅ Header component initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Header component:', error);
        }
    }

    /**
     * Create header element if it doesn't exist
     */
    createHeader() {
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = this.getHeaderHTML();
        
        // Insert at the beginning of body
        document.body.insertBefore(header, document.body.firstChild);
        this.container = header;
    }

    /**
     * Get header HTML structure
     */
    getHeaderHTML() {
        return `
            <nav class="header-nav">
                <div class="nav-container">
                    <!-- Logo and brand -->
                    <div class="nav-brand">
                        <a href="/" class="brand-link" data-route="/">
                            <div class="brand-logo">
                                <svg class="logo-icon" viewBox="0 0 40 40" fill="none">
                                    <circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.8"/>
                                    <circle cx="20" cy="12" r="4" fill="currentColor"/>
                                    <circle cx="32" cy="8" r="3" fill="currentColor" opacity="0.6"/>
                                    <circle cx="12" cy="25" r="3" fill="currentColor" opacity="0.7"/>
                                    <circle cx="28" cy="28" r="4" fill="currentColor" opacity="0.9"/>
                                    <circle cx="20" cy="32" r="2" fill="currentColor" opacity="0.5"/>
                                    <path d="M8 8L20 12M20 12L32 8M20 12L12 25M20 12L28 28M12 25L28 28M28 28L20 32" 
                                          stroke="currentColor" stroke-width="1" opacity="0.3"/>
                                </svg>
                            </div>
                            <div class="brand-text">
                                <span class="brand-name">NCS-API</span>
                                <span class="brand-tagline">Clustering Solutions</span>
                            </div>
                        </a>
                    </div>

                    <!-- Main navigation -->
                    <div class="nav-menu" id="nav-menu">
                        <ul class="nav-list">
                            ${this.navItems.map(item => `
                                <li class="nav-item">
                                    <a href="${item.path}" 
                                       class="nav-link" 
                                       data-route="${item.path}"
                                       data-exact="${item.exact || false}">
                                        ${item.name}
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Header actions -->
                    <div class="nav-actions">
                        <!-- Search -->
                        <div class="search-container">
                            <button class="search-toggle" id="search-toggle" aria-label="Toggle search">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                            </button>
                            <div class="search-dropdown" id="search-dropdown">
                                <div class="search-input-container">
                                    <input type="text" 
                                           class="search-input" 
                                           id="search-input"
                                           placeholder="Search documentation, examples..."
                                           autocomplete="off">
                                    <div class="search-spinner" id="search-spinner"></div>
                                </div>
                                <div class="search-results" id="search-results"></div>
                            </div>
                        </div>

                        <!-- API Status -->
                        <div class="api-status" id="api-status">
                            <div class="status-indicator status-unknown"></div>
                            <span class="status-text">API Status</span>
                        </div>

                        <!-- Theme toggle -->
                        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
                            <div class="theme-icon theme-icon-light">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="5"></circle>
                                    <line x1="12" y1="1" x2="12" y2="3"></line>
                                    <line x1="12" y1="21" x2="12" y2="23"></line>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                    <line x1="1" y1="12" x2="3" y2="12"></line>
                                    <line x1="21" y1="12" x2="23" y2="12"></line>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                                </svg>
                            </div>
                            <div class="theme-icon theme-icon-dark">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                </svg>
                            </div>
                        </button>

                        <!-- Mobile menu toggle -->
                        <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle mobile menu">
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                        </button>
                    </div>
                </div>

                <!-- Mobile menu overlay -->
                <div class="mobile-menu-overlay" id="mobile-menu-overlay">
                    <div class="mobile-menu-content">
                        <ul class="mobile-nav-list">
                            ${this.navItems.map(item => `
                                <li class="mobile-nav-item">
                                    <a href="${item.path}" 
                                       class="mobile-nav-link" 
                                       data-route="${item.path}">
                                        ${item.name}
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                        
                        <div class="mobile-menu-footer">
                            <div class="mobile-api-status">
                                <div class="status-indicator status-unknown"></div>
                                <span>API Status</span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    /**
     * Setup DOM elements and references
     */
    setupElements() {
        // Cache frequently used elements
        this.elements = {
            navMenu: this.container.querySelector('#nav-menu'),
            mobileMenuToggle: this.container.querySelector('#mobile-menu-toggle'),
            mobileMenuOverlay: this.container.querySelector('#mobile-menu-overlay'),
            searchToggle: this.container.querySelector('#search-toggle'),
            searchDropdown: this.container.querySelector('#search-dropdown'),
            searchInput: this.container.querySelector('#search-input'),
            searchResults: this.container.querySelector('#search-results'),
            searchSpinner: this.container.querySelector('#search-spinner'),
            themeToggle: this.container.querySelector('#theme-toggle'),
            apiStatus: this.container.querySelector('#api-status'),
            navLinks: this.container.querySelectorAll('.nav-link'),
            mobileNavLinks: this.container.querySelectorAll('.mobile-nav-link')
        };
        
        // Validate required elements
        const requiredElements = ['mobileMenuToggle', 'themeToggle'];
        requiredElements.forEach(elementKey => {
            if (!this.elements[elementKey]) {
                console.warn(`Header: Required element ${elementKey} not found`);
            }
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Mobile menu toggle
        if (this.elements.mobileMenuToggle) {
            this.elements.mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Search functionality
        if (this.elements.searchToggle) {
            this.elements.searchToggle.addEventListener('click', () => {
                this.toggleSearch();
            });
        }

        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            this.elements.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
        }

        // Navigation links
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e);
            });
        });

        this.elements.mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleMobileNavClick(e);
            });
        });

        // Window events
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        window.addEventListener('resize', this.handleResize, { passive: true });
        document.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('click', this.handleClickOutside);

        // Mobile menu overlay
        if (this.elements.mobileMenuOverlay) {
            this.elements.mobileMenuOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.mobileMenuOverlay) {
                    this.closeMobileMenu();
                }
            });
        }
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('ncs-theme') || 'dark';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.currentTheme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('ncs-theme') === 'auto') {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.currentTheme);
            }
        });
    }

    /**
     * Setup router integration
     */
    setupRouterIntegration() {
        // Listen for route changes
        if (window.NCS?.app) {
            window.NCS.app.on('route:change', (route) => {
                this.updateActiveNavItem(route.path);
            });
        }
        
        // Set initial active state
        this.updateActiveNavItem(window.location.pathname);
    }

    /**
     * Setup API status monitoring
     */
    setupAPIStatusMonitoring() {
        // Listen for API status changes
        if (window.NCS?.api) {
            // Check initial status
            this.checkAPIStatus();
            
            // Poll status periodically
            setInterval(() => {
                this.checkAPIStatus();
            }, 30000); // Check every 30 seconds
        }
        
        // Listen for WebSocket connection status
        if (window.NCS?.ws) {
            window.NCS.ws.on('connected', () => {
                this.updateAPIStatus('online');
            });
            
            window.NCS.ws.on('disconnected', () => {
                this.updateAPIStatus('degraded');
            });
            
            window.NCS.ws.on('error', () => {
                this.updateAPIStatus('offline');
            });
        }
    }

    /**
     * Event handlers
     */
    handleScroll() {
        const scrolled = window.scrollY > 20;
        if (scrolled !== this.state.scrolled) {
            this.state.scrolled = scrolled;
            this.container.classList.toggle('header-scrolled', scrolled);
        }
    }

    handleResize() {
        if (window.innerWidth > 768 && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }
    }

    handleKeydown(e) {
        // Close mobile menu on Escape
        if (e.key === 'Escape') {
            if (this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
            if (this.state.isSearchOpen) {
                this.closeSearch();
            }
        }
        
        // Open search with Ctrl/Cmd + K
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.openSearch();
        }
    }

    handleClickOutside(e) {
        // Close search if clicking outside
        if (this.state.isSearchOpen && 
            !this.elements.searchDropdown.contains(e.target) &&
            !this.elements.searchToggle.contains(e.target)) {
            this.closeSearch();
        }
    }

    handleNavClick(e) {
        const link = e.currentTarget;
        const path = link.getAttribute('data-route');
        
        if (path && window.NCS?.app?.router) {
            e.preventDefault();
            window.NCS.app.router.navigate(path);
        }
    }

    handleMobileNavClick(e) {
        this.handleNavClick(e);
        this.closeMobileMenu();
    }

    handleSearchInput(query) {
        this.searchQuery = query.trim();
        
        if (this.searchQuery.length === 0) {
            this.clearSearchResults();
            return;
        }
        
        if (this.searchQuery.length < 2) {
            return;
        }
        
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(this.searchQuery);
        }, 300);
    }

    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstResult = this.elements.searchResults.querySelector('.search-result-item');
            if (firstResult) {
                firstResult.click();
            }
        } else if (e.key === 'Escape') {
            this.closeSearch();
        }
    }

    /**
     * Mobile menu methods
     */
    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.isMobileMenuOpen = true;
        this.container.classList.add('mobile-menu-open');
        document.body.classList.add('mobile-menu-active');
        
        // Focus first nav item for accessibility
        const firstNavItem = this.elements.mobileMenuOverlay.querySelector('.mobile-nav-link');
        if (firstNavItem) {
            setTimeout(() => firstNavItem.focus(), 100);
        }
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
        this.container.classList.remove('mobile-menu-open');
        document.body.classList.remove('mobile-menu-active');
    }

    /**
     * Theme methods
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem('ncs-theme', theme);
        
        // Emit theme change event
        if (window.NCS?.app) {
            window.NCS.app.emit('theme:change', theme);
        }
    }

    applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/, `theme-${theme}`);
        this.container.classList.toggle('theme-dark', theme === 'dark');
        this.container.classList.toggle('theme-light', theme === 'light');
    }

    /**
     * Search methods
     */
    toggleSearch() {
        if (this.state.isSearchOpen) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }

    openSearch() {
        this.state.isSearchOpen = true;
        this.elements.searchDropdown.classList.add('search-dropdown-open');
        this.elements.searchInput.focus();
    }

    closeSearch() {
        this.state.isSearchOpen = false;
        this.elements.searchDropdown.classList.remove('search-dropdown-open');
        this.elements.searchInput.value = '';
        this.clearSearchResults();
    }

    performSearch(query) {
        this.showSearchSpinner();
        
        // Simple client-side search
        const results = this.searchData.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.type.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);
        
        setTimeout(() => {
            this.displaySearchResults(results, query);
            this.hideSearchSpinner();
        }, 200);
    }

    displaySearchResults(results, query) {
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    <p>No results found for "${query}"</p>
                    <p class="search-suggestion">Try searching for "API", "clustering", or "examples"</p>
                </div>
            `;
            return;
        }
        
        this.elements.searchResults.innerHTML = results.map(result => `
            <a href="${result.path}" class="search-result-item" data-route="${result.path}">
                <div class="search-result-icon">
                    ${this.getSearchResultIcon(result.type)}
                </div>
                <div class="search-result-content">
                    <div class="search-result-title">${this.highlightSearchTerm(result.title, query)}</div>
                    <div class="search-result-type">${result.type}</div>
                </div>
            </a>
        `).join('');
        
        // Add click handlers to search results
        this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const path = item.getAttribute('data-route');
                if (path && window.NCS?.app?.router) {
                    window.NCS.app.router.navigate(path);
                    this.closeSearch();
                }
            });
        });
    }

    getSearchResultIcon(type) {
        const icons = {
            page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline></svg>',
            algorithm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path></svg>',
            section: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
            example: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
        };
        
        return icons[type] || icons.page;
    }

    highlightSearchTerm(text, term) {
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    clearSearchResults() {
        this.elements.searchResults.innerHTML = '';
    }

    showSearchSpinner() {
        this.elements.searchSpinner.classList.add('search-spinner-active');
    }

    hideSearchSpinner() {
        this.elements.searchSpinner.classList.remove('search-spinner-active');
    }

    /**
     * Navigation methods
     */
    updateActiveNavItem(currentPath) {
        this.state.activeRoute = currentPath;
        
        // Update main navigation
        this.elements.navLinks.forEach(link => {
            const linkPath = link.getAttribute('data-route');
            const isExact = link.getAttribute('data-exact') === 'true';
            const isActive = isExact ? 
                currentPath === linkPath : 
                currentPath.startsWith(linkPath) && linkPath !== '/';
            
            link.classList.toggle('nav-link-active', isActive);
        });
        
        // Update mobile navigation
        this.elements.mobileNavLinks.forEach(link => {
            const linkPath = link.getAttribute('data-route');
            const isActive = currentPath === linkPath || 
                           (currentPath.startsWith(linkPath) && linkPath !== '/');
            
            link.classList.toggle('mobile-nav-link-active', isActive);
        });
    }

    /**
     * API status methods
     */
    async checkAPIStatus() {
        try {
            if (window.NCS?.api) {
                const response = await window.NCS.api.get('/health');
                if (response.status === 'online') {
                    this.updateAPIStatus('online');
                } else {
                    this.updateAPIStatus('degraded');
                }
            }
        } catch (error) {
            this.updateAPIStatus('offline');
        }
    }

    updateAPIStatus(status) {
        this.state.apiStatus = status;
        
        const indicators = this.container.querySelectorAll('.status-indicator');
        const statusTexts = this.container.querySelectorAll('.status-text');
        
        indicators.forEach(indicator => {
            indicator.className = `status-indicator status-${status}`;
        });
        
        statusTexts.forEach(text => {
            const statusLabels = {
                online: 'API Online',
                degraded: 'API Degraded',
                offline: 'API Offline',
                unknown: 'API Status'
            };
            
            text.textContent = statusLabels[status] || statusLabels.unknown;
        });
        
        if (CONFIG.IS_DEV) {
            console.log(`🔌 API Status: ${status}`);
        }
    }

    /**
     * Public API methods
     */
    getState() {
        return {
            ...this.state,
            isMobileMenuOpen: this.isMobileMenuOpen,
            currentTheme: this.currentTheme,
            isInitialized: this.isInitialized
        };
    }

    setActiveRoute(path) {
        this.updateActiveNavItem(path);
    }

    showAPIStatus(status) {
        this.updateAPIStatus(status);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('click', this.handleClickOutside);
        
        // Clear timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Close mobile menu
        this.closeMobileMenu();
        
        this.isInitialized = false;
        console.log('🗑️ Header component destroyed');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Header();
    });
} else {
    new Header();
}

export default Header;