/**
 * Header Component - Navigation and App Bar
 * Responsive navigation with theme switching, API status, and mobile menu
 */

export class Header {
    constructor(element) {
        this.element = element;
        this.isMenuOpen = false;
        this.isScrolled = false;
        this.lastScrollY = 0;
        this.scrollDirection = 'up';
        this.isHidden = false;
        
        // Navigation elements
        this.navToggle = null;
        this.navMenu = null;
        this.navLinks = [];
        this.themeToggle = null;
        this.apiStatus = null;
        this.searchButton = null;
        this.getStartedButton = null;
        
        // Search functionality
        this.searchModal = null;
        this.searchInput = null;
        this.searchResults = null;
        this.isSearchOpen = false;
        
        // Mobile breakpoint
        this.mobileBreakpoint = 768;
        
        // Scroll threshold for header changes
        this.scrollThreshold = 100;
        
        // API status check interval
        this.apiStatusInterval = null;
        this.apiStatusCheckInterval = 30000; // 30 seconds
        
        this.init();
    }

    /**
     * Initialize the header component
     */
    init() {
        this.findElements();
        this.setupEventListeners();
        this.initializeTheme();
        this.initializeAPIStatus();
        this.setupScrollBehavior();
        this.setupKeyboardNavigation();
        this.createSearchModal();
        
        console.log('🧭 Header navigation initialized');
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        this.navToggle = this.element.querySelector('#nav-toggle');
        this.navMenu = this.element.querySelector('#nav-menu');
        this.navLinks = Array.from(this.element.querySelectorAll('.nav-link'));
        this.themeToggle = this.element.querySelector('#theme-toggle');
        this.apiStatus = this.element.querySelector('#api-status');
        this.searchButton = this.element.querySelector('#search-button');
        this.getStartedButton = this.element.querySelector('#get-started-btn');
        
        // Validate required elements
        if (!this.navToggle || !this.navMenu) {
            console.warn('⚠️ Required navigation elements not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }

        // Navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e, link);
            });
        });

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Search functionality
        if (this.searchButton) {
            this.searchButton.addEventListener('click', () => {
                this.openSearch();
            });
        }

        // Get started button
        if (this.getStartedButton) {
            this.getStartedButton.addEventListener('click', () => {
                this.handleGetStarted();
            });
        }

        // Window events
        window.addEventListener('scroll', this.debounce(() => {
            this.handleScroll();
        }, 10));

        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.element.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // API status updates
        window.addEventListener('api-status-change', (e) => {
            this.updateAPIStatus(e.detail.status);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Handle navigation link clicks
     */
    handleNavClick(event, link) {
        const href = link.getAttribute('href');
        
        // Handle internal anchor links
        if (href && href.startsWith('#')) {
            event.preventDefault();
            this.smoothScrollToAnchor(href);
            this.closeMobileMenu();
            return;
        }
        
        // Handle external links
        if (href && (href.startsWith('http') || href.includes('.html'))) {
            // Close mobile menu for page navigation
            this.closeMobileMenu();
            
            // Add loading state
            this.addLoadingState(link);
            
            // Track navigation
            this.trackNavigation(href);
            return;
        }
        
        // Default behavior for other links
        this.closeMobileMenu();
    }

    /**
     * Smooth scroll to anchor
     */
    smoothScrollToAnchor(anchor) {
        const target = document.querySelector(anchor);
        
        if (target) {
            const headerHeight = this.element.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update URL without triggering scroll
            history.replaceState(null, null, anchor);
            
            // Focus target for accessibility
            setTimeout(() => {
                target.focus({ preventScroll: true });
            }, 500);
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        if (this.isMenuOpen) {
            this.openMobileMenu();
        } else {
            this.closeMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.isMenuOpen = true;
        
        // Update classes
        this.navToggle.classList.add('nav-toggle-active');
        this.navMenu.classList.add('nav-menu-open');
        document.body.classList.add('nav-menu-open');
        
        // Update aria attributes
        this.navToggle.setAttribute('aria-expanded', 'true');
        this.navMenu.setAttribute('aria-hidden', 'false');
        
        // Focus first menu item
        const firstLink = this.navMenu.querySelector('.nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Add animation class
        setTimeout(() => {
            this.navMenu.classList.add('nav-menu-animated');
        }, 10);
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.isMenuOpen = false;
        
        // Update classes
        this.navToggle.classList.remove('nav-toggle-active');
        this.navMenu.classList.remove('nav-menu-open', 'nav-menu-animated');
        document.body.classList.remove('nav-menu-open');
        
        // Update aria attributes
        this.navToggle.setAttribute('aria-expanded', 'false');
        this.navMenu.setAttribute('aria-hidden', 'true');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('ncs-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        this.setTheme(currentTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('ncs-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.setTheme(newTheme);
        localStorage.setItem('ncs-theme', newTheme);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme: newTheme }
        }));
        
        // Track theme change
        if (window.NCS?.performance) {
            window.NCS.performance.trackEvent('theme_change', { theme: newTheme });
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        document.body.classList.add(`theme-${theme}`);
        
        // Update theme toggle icon
        if (this.themeToggle) {
            const lightIcon = this.themeToggle.querySelector('.theme-icon-light');
            const darkIcon = this.themeToggle.querySelector('.theme-icon-dark');
            
            if (lightIcon && darkIcon) {
                if (theme === 'dark') {
                    lightIcon.style.display = 'block';
                    darkIcon.style.display = 'none';
                } else {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'block';
                }
            }
        }
        
        // Update meta theme color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#1f2937' : '#ffffff';
        }
    }

    /**
     * Initialize API status monitoring
     */
    initializeAPIStatus() {
        this.updateAPIStatus('checking');
        this.checkAPIStatus();
        
        // Set up periodic status checks
        this.apiStatusInterval = setInterval(() => {
            this.checkAPIStatus();
        }, this.apiStatusCheckInterval);
    }

    /**
     * Check API status
     */
    async checkAPIStatus() {
        try {
            if (!window.NCS?.api) {
                this.updateAPIStatus('offline');
                return;
            }
            
            const response = await fetch('/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateAPIStatus(data.status === 'healthy' ? 'online' : 'degraded');
            } else {
                this.updateAPIStatus('degraded');
            }
        } catch (error) {
            this.updateAPIStatus('offline');
        }
    }

    /**
     * Update API status display
     */
    updateAPIStatus(status) {
        if (!this.apiStatus) return;
        
        const indicator = this.apiStatus.querySelector('.status-indicator');
        const text = this.apiStatus.querySelector('.status-text');
        
        if (!indicator || !text) return;
        
        // Remove existing status classes
        indicator.classList.remove('status-online', 'status-degraded', 'status-offline', 'status-checking');
        
        // Add new status class and update text
        switch (status) {
            case 'online':
                indicator.classList.add('status-online');
                text.textContent = 'API Online';
                break;
            case 'degraded':
                indicator.classList.add('status-degraded');
                text.textContent = 'API Degraded';
                break;
            case 'offline':
                indicator.classList.add('status-offline');
                text.textContent = 'API Offline';
                break;
            case 'checking':
                indicator.classList.add('status-checking');
                text.textContent = 'Checking...';
                break;
        }
        
        // Update tooltip
        this.apiStatus.title = `API Status: ${status}`;
    }

    /**
     * Setup scroll behavior
     */
    setupScrollBehavior() {
        this.handleScroll();
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        const currentScrollY = window.pageYOffset;
        const scrollDifference = currentScrollY - this.lastScrollY;
        
        // Update scroll direction
        if (scrollDifference > 0 && currentScrollY > this.scrollThreshold) {
            this.scrollDirection = 'down';
        } else if (scrollDifference < 0) {
            this.scrollDirection = 'up';
        }
        
        // Update scrolled state
        const wasScrolled = this.isScrolled;
        this.isScrolled = currentScrollY > this.scrollThreshold;
        
        if (wasScrolled !== this.isScrolled) {
            this.updateHeaderAppearance();
        }
        
        // Auto-hide header on mobile when scrolling down
        if (window.innerWidth <= this.mobileBreakpoint) {
            const shouldHide = this.scrollDirection === 'down' && 
                              currentScrollY > this.scrollThreshold * 2 &&
                              !this.isMenuOpen;
                              
            if (shouldHide !== this.isHidden) {
                this.isHidden = shouldHide;
                this.updateHeaderVisibility();
            }
        }
        
        this.lastScrollY = currentScrollY;
    }

    /**
     * Update header appearance based on scroll
     */
    updateHeaderAppearance() {
        if (this.isScrolled) {
            this.element.classList.add('header-scrolled');
        } else {
            this.element.classList.remove('header-scrolled');
        }
    }

    /**
     * Update header visibility
     */
    updateHeaderVisibility() {
        if (this.isHidden) {
            this.element.classList.add('header-hidden');
        } else {
            this.element.classList.remove('header-hidden');
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const isMobile = window.innerWidth <= this.mobileBreakpoint;
        
        // Close mobile menu on resize to desktop
        if (!isMobile && this.isMenuOpen) {
            this.closeMobileMenu();
        }
        
        // Reset header hidden state on desktop
        if (!isMobile && this.isHidden) {
            this.isHidden = false;
            this.updateHeaderVisibility();
        }
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        // Add keyboard event listeners for menu navigation
        if (this.navMenu) {
            this.navMenu.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isMenuOpen) {
                    this.closeMobileMenu();
                    this.navToggle.focus();
                }
            });
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K for search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.openSearch();
        }
        
        // Escape to close modals
        if (event.key === 'Escape') {
            if (this.isSearchOpen) {
                this.closeSearch();
            } else if (this.isMenuOpen) {
                this.closeMobileMenu();
            }
        }
    }

    /**
     * Create search modal
     */
    createSearchModal() {
        // This would create a search modal overlay
        // For now, we'll implement a simple version
        this.searchModal = document.createElement('div');
        this.searchModal.className = 'search-modal';
        this.searchModal.innerHTML = `
            <div class="search-modal-overlay"></div>
            <div class="search-modal-content">
                <div class="search-input-container">
                    <input type="text" class="search-input" placeholder="Search documentation, examples, and more..." autocomplete="off">
                    <button class="search-close" aria-label="Close search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="search-results"></div>
            </div>
        `;
        
        document.body.appendChild(this.searchModal);
        
        // Cache search elements
        this.searchInput = this.searchModal.querySelector('.search-input');
        this.searchResults = this.searchModal.querySelector('.search-results');
        
        // Setup search event listeners
        this.setupSearchListeners();
    }

    /**
     * Setup search event listeners
     */
    setupSearchListeners() {
        if (!this.searchModal) return;
        
        // Close button
        const closeButton = this.searchModal.querySelector('.search-close');
        closeButton.addEventListener('click', () => this.closeSearch());
        
        // Overlay click
        const overlay = this.searchModal.querySelector('.search-modal-overlay');
        overlay.addEventListener('click', () => this.closeSearch());
        
        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce((e) => {
                this.performSearch(e.target.value);
            }, 300));
        }
    }

    /**
     * Open search modal
     */
    openSearch() {
        this.isSearchOpen = true;
        this.searchModal.classList.add('search-modal-open');
        document.body.classList.add('search-modal-open');
        
        // Focus search input
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
            }
        }, 100);
    }

    /**
     * Close search modal
     */
    closeSearch() {
        this.isSearchOpen = false;
        this.searchModal.classList.remove('search-modal-open');
        document.body.classList.remove('search-modal-open');
        
        // Clear search
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        if (this.searchResults) {
            this.searchResults.innerHTML = '';
        }
    }

    /**
     * Perform search
     */
    performSearch(query) {
        if (!query.trim()) {
            this.searchResults.innerHTML = '';
            return;
        }
        
        // This would integrate with actual search API
        // For now, show placeholder results
        this.searchResults.innerHTML = `
            <div class="search-category">
                <h3>Documentation</h3>
                <div class="search-result">
                    <h4>Getting Started</h4>
                    <p>Learn how to integrate the NCS API into your application</p>
                </div>
            </div>
            <div class="search-category">
                <h3>Examples</h3>
                <div class="search-result">
                    <h4>Customer Segmentation</h4>
                    <p>Real-world example of clustering customer data</p>
                </div>
            </div>
        `;
    }

    /**
     * Handle get started button
     */
    handleGetStarted() {
        // Track conversion
        if (window.NCS?.performance) {
            window.NCS.performance.trackEvent('get_started_clicked', {
                source: 'header'
            });
        }
        
        // Navigate to appropriate page or show signup modal
        if (window.location.pathname === '/') {
            this.smoothScrollToAnchor('#playground');
        } else {
            window.location.href = '/playground.html';
        }
    }

    /**
     * Add loading state to navigation link
     */
    addLoadingState(link) {
        const originalText = link.textContent;
        link.classList.add('nav-link-loading');
        
        // Remove loading state after navigation
        setTimeout(() => {
            link.classList.remove('nav-link-loading');
        }, 2000);
    }

    /**
     * Track navigation events
     */
    trackNavigation(href) {
        if (window.NCS?.performance) {
            window.NCS.performance.trackEvent('navigation', {
                destination: href,
                source: 'header'
            });
        }
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Update active navigation item
     */
    updateActiveNavItem() {
        const currentPath = window.location.pathname;
        
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Remove active class
            link.classList.remove('nav-link-active');
            
            // Add active class for current page
            if (href === currentPath || 
                (currentPath === '/' && href === 'index.html') ||
                (currentPath.includes(href.replace('.html', '')))) {
                link.classList.add('nav-link-active');
            }
        });
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        // Clear intervals
        if (this.apiStatusInterval) {
            clearInterval(this.apiStatusInterval);
        }
        
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        
        // Remove search modal
        if (this.searchModal && this.searchModal.parentNode) {
            this.searchModal.parentNode.removeChild(this.searchModal);
        }
        
        // Reset body classes
        document.body.classList.remove('nav-menu-open', 'search-modal-open');
        document.body.style.overflow = '';
        
        console.log('🗑️ Header component destroyed');
    }
}