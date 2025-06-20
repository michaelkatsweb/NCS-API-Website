/**
 * NCS-API Website - Minimal Main Entry Point
 * Simplified version to get the application running
 */

// Global application state
window.NCS = {
    version: '2.1.0',
    buildDate: '2025-06-20',
    debug: false
};

/**
 * Simple Application Bootstrap
 */
class SimpleBootstrap {
    constructor() {
        this.startTime = performance.now();
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        // Enable debug mode in development
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            window.NCS.debug = true;
            console.log('🔧 Debug mode enabled');
        }
    }

    /**
     * Main initialization method
     */
    async init() {
        try {
            console.log('🚀 NCS-API Website starting (minimal version)...');
            
            // Update loading status
            this.updateLoadingStatus('Loading application...');
            
            // Initialize theme
            this.initializeTheme();
            await this.delay(200);
            
            // Initialize basic components
            this.updateLoadingStatus('Setting up components...');
            await this.initializeBasicComponents();
            await this.delay(200);
            
            // Initialize page-specific functionality
            this.updateLoadingStatus('Loading page components...');
            await this.initializePage();
            await this.delay(200);
            
            // Hide loading overlay
            await this.hideLoadingOverlay();
            
            // Performance metrics
            const initTime = performance.now() - this.startTime;
            console.log(`✅ Application initialized in ${initTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showErrorState(error);
        }
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        console.log('🎨 Initializing theme...');
        
        // Check for saved theme preference
        let savedTheme = null;
        try {
            savedTheme = localStorage.getItem('ncs-theme-preference');
        } catch (e) {
            console.warn('LocalStorage not available');
        }
        
        const systemPrefersDark = window.matchMedia && 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let theme = savedTheme || 'auto';
        if (theme === 'auto') {
            theme = systemPrefersDark ? 'dark' : 'light';
        }
        
        // Apply theme immediately to prevent flash
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
        
        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#111827' : '#ffffff';
        }
        
        console.log(`✅ Theme set to: ${theme}`);
    }

    /**
     * Initialize basic components
     */
    async initializeBasicComponents() {
        console.log('🔧 Initializing basic components...');
        
        try {
            // Initialize theme toggle
            this.initializeThemeToggle();
            
            // Initialize mobile menu
            this.initializeMobileMenu();
            
            // Initialize basic page functionality
            this.initializeBasicInteractions();
            
            console.log('✅ Basic components initialized');
            
        } catch (error) {
            console.warn('⚠️ Some components failed to initialize:', error);
        }
    }

    /**
     * Initialize theme toggle
     */
    initializeThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.body.classList.remove('theme-light', 'theme-dark');
                document.body.classList.add(`theme-${newTheme}`);
                
                // Save preference
                try {
                    localStorage.setItem('ncs-theme-preference', newTheme);
                } catch (e) {
                    console.warn('Could not save theme preference');
                }
                
                // Update meta theme-color
                const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) {
                    metaThemeColor.content = newTheme === 'dark' ? '#111827' : '#ffffff';
                }
                
                console.log(`Theme switched to: ${newTheme}`);
            });
            
            console.log('✅ Theme toggle initialized');
        }
    }

    /**
     * Initialize mobile menu
     */
    initializeMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                const isOpen = navMenu.classList.contains('nav-menu-open');
                
                if (isOpen) {
                    navMenu.classList.remove('nav-menu-open');
                    menuToggle.classList.remove('nav-toggle-active');
                } else {
                    navMenu.classList.add('nav-menu-open');
                    menuToggle.classList.add('nav-toggle-active');
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (event) => {
                if (!menuToggle.contains(event.target) && !navMenu.contains(event.target)) {
                    navMenu.classList.remove('nav-menu-open');
                    menuToggle.classList.remove('nav-toggle-active');
                }
            });
            
            console.log('✅ Mobile menu initialized');
        }
    }

    /**
     * Initialize basic interactions
     */
    initializeBasicInteractions() {
        // Add smooth scrolling to anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Add loading states to buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function() {
                if (!this.disabled) {
                    this.classList.add('loading');
                    setTimeout(() => {
                        this.classList.remove('loading');
                    }, 1000);
                }
            });
        });
        
        console.log('✅ Basic interactions initialized');
    }

    /**
     * Initialize page-specific functionality
     */
    async initializePage() {
        const currentPage = this.getCurrentPageName();
        console.log(`🏠 Initializing page: ${currentPage}`);
        
        try {
            switch (currentPage) {
                case 'landing':
                    await this.initializeLandingPage();
                    break;
                case 'playground':
                    await this.initializePlaygroundPage();
                    break;
                case 'docs':
                    await this.initializeDocsPage();
                    break;
                default:
                    console.log(`No specific initialization needed for: ${currentPage}`);
            }
        } catch (error) {
            console.warn(`Failed to initialize ${currentPage} page:`, error);
        }
    }

    /**
     * Initialize landing page
     */
    async initializeLandingPage() {
        console.log('🏠 Setting up landing page...');
        
        // Add scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        document.querySelectorAll('.hero, .feature-card, .stat-item').forEach(el => {
            observer.observe(el);
        });
        
        // Add CTA button functionality
        document.querySelectorAll('.cta-button, .btn-primary').forEach(button => {
            if (button.textContent.includes('Playground') || button.textContent.includes('Try')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = '/playground.html';
                });
            }
        });
    }

    /**
     * Initialize playground page
     */
    async initializePlaygroundPage() {
        console.log('🧪 Setting up playground page...');
        
        // Initialize file upload
        this.initializeFileUpload();
        
        // Initialize sample data selector
        this.initializeSampleData();
        
        // Initialize visualization placeholder
        this.initializeVisualization();
        
        // Initialize algorithm selection
        this.initializeAlgorithmSelection();
    }

    /**
     * Initialize file upload
     */
    initializeFileUpload() {
        const uploadArea = document.getElementById('data-upload');
        const fileInput = document.getElementById('file-input');
        
        if (uploadArea && fileInput) {
            // Click to upload
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            // File selection
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });
            
            console.log('✅ File upload initialized');
        }
    }

    /**
     * Handle file upload
     */
    handleFileUpload(file) {
        console.log('📁 File uploaded:', file.name);
        
        // Show success message
        this.showMessage(`File "${file.name}" uploaded successfully!`, 'success');
        
        // Update visualization placeholder
        const vizOverlay = document.getElementById('viz-overlay');
        if (vizOverlay) {
            vizOverlay.innerHTML = `
                <div class="visualization-placeholder">
                    <div class="placeholder-icon">✅</div>
                    <h3>Data loaded: ${file.name}</h3>
                    <p>Configure algorithm parameters and click "Start Clustering"</p>
                </div>
            `;
        }
        
        // Enable clustering button
        const clusterButton = document.getElementById('start-clustering');
        if (clusterButton) {
            clusterButton.disabled = false;
            clusterButton.textContent = 'Start Clustering';
        }
    }

    /**
     * Initialize sample data
     */
    initializeSampleData() {
        const sampleSelect = document.getElementById('sample-dataset');
        
        if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    console.log('📊 Sample dataset selected:', e.target.value);
                    this.loadSampleData(e.target.value);
                }
            });
        }
    }

    /**
     * Load sample data
     */
    loadSampleData(dataset) {
        console.log(`📊 Loading sample dataset: ${dataset}`);
        
        // Show loading state
        this.showMessage(`Loading ${dataset} dataset...`, 'info');
        
        // Simulate loading
        setTimeout(() => {
            this.showMessage(`${dataset} dataset loaded successfully!`, 'success');
            
            // Update visualization
            const vizOverlay = document.getElementById('viz-overlay');
            if (vizOverlay) {
                vizOverlay.innerHTML = `
                    <div class="visualization-placeholder">
                        <div class="placeholder-icon">📊</div>
                        <h3>${dataset} Dataset Loaded</h3>
                        <p>Configure algorithm and start clustering</p>
                    </div>
                `;
            }
            
            // Enable clustering
            const clusterButton = document.getElementById('start-clustering');
            if (clusterButton) {
                clusterButton.disabled = false;
            }
        }, 1000);
    }

    /**
     * Initialize visualization
     */
    initializeVisualization() {
        const canvas = document.getElementById('cluster-canvas');
        if (canvas) {
            // Set canvas size
            const container = canvas.parentElement;
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            
            // Add resize handler
            window.addEventListener('resize', () => {
                const rect = container.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            });
        }
        
        // Initialize clustering button
        const clusterButton = document.getElementById('start-clustering');
        if (clusterButton) {
            clusterButton.addEventListener('click', () => {
                this.startClustering();
            });
        }
    }

    /**
     * Start clustering simulation
     */
    startClustering() {
        console.log('🚀 Starting clustering...');
        
        const button = document.getElementById('start-clustering');
        const status = document.getElementById('clustering-status');
        const progress = document.getElementById('clustering-progress');
        
        // Update UI
        if (button) button.disabled = true;
        if (status) {
            status.className = 'status-indicator running';
            status.innerHTML = '<span class="status-dot pulse"></span><span>Processing...</span>';
        }
        if (progress) progress.style.display = 'block';
        
        // Simulate clustering progress
        let progressValue = 0;
        const progressInterval = setInterval(() => {
            progressValue += Math.random() * 15;
            if (progressValue >= 100) {
                progressValue = 100;
                clearInterval(progressInterval);
                this.clusteringComplete();
            }
            
            const progressFill = document.getElementById('progress-fill');
            const progressPercent = document.getElementById('progress-percent');
            
            if (progressFill) progressFill.style.width = `${progressValue}%`;
            if (progressPercent) progressPercent.textContent = `${Math.round(progressValue)}%`;
        }, 200);
    }

    /**
     * Clustering complete
     */
    clusteringComplete() {
        console.log('✅ Clustering complete!');
        
        const button = document.getElementById('start-clustering');
        const status = document.getElementById('clustering-status');
        const progress = document.getElementById('clustering-progress');
        
        // Update UI
        if (button) {
            button.disabled = false;
            button.textContent = 'Run Again';
        }
        if (status) {
            status.className = 'status-indicator complete';
            status.innerHTML = '<span class="status-dot"></span><span>Complete</span>';
        }
        if (progress) progress.style.display = 'none';
        
        // Update metrics
        this.updateMetrics();
        
        this.showMessage('Clustering completed successfully!', 'success');
    }

    /**
     * Update metrics display
     */
    updateMetrics() {
        const metrics = {
            'silhouette-score': (0.7 + Math.random() * 0.2).toFixed(3),
            'inertia': Math.round(100 + Math.random() * 500),
            'davies-bouldin': (0.5 + Math.random() * 0.3).toFixed(3),
            'processing-time': Math.round(500 + Math.random() * 2000) + 'ms',
            'data-points': '1,000',
            'clusters-found': Math.round(2 + Math.random() * 6)
        };
        
        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.className = 'metric-value success';
            }
        });
    }

    /**
     * Initialize algorithm selection
     */
    initializeAlgorithmSelection() {
        const algorithmInputs = document.querySelectorAll('input[name="algorithm"]');
        
        algorithmInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                console.log('⚙️ Algorithm selected:', e.target.value);
                this.updateParameterPanel(e.target.value);
            });
        });
    }

    /**
     * Update parameter panel based on algorithm
     */
    updateParameterPanel(algorithm) {
        // Hide all parameter sections
        document.querySelectorAll('[id$="-params"]').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show relevant parameter section
        const paramSection = document.getElementById(`${algorithm}-params`);
        if (paramSection) {
            paramSection.style.display = 'block';
        }
    }

    /**
     * Initialize docs page
     */
    async initializeDocsPage() {
        console.log('📚 Setting up docs page...');
        
        // Add syntax highlighting placeholder
        document.querySelectorAll('pre code').forEach(block => {
            block.classList.add('language-javascript');
        });
    }

    /**
     * Get current page name
     */
    getCurrentPageName() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'landing';
        if (path.includes('playground')) return 'playground';
        if (path.includes('docs')) return 'docs';
        if (path.includes('examples')) return 'examples';
        if (path.includes('benchmarks')) return 'benchmarks';
        return 'unknown';
    }

    /**
     * Show message/toast
     */
    showMessage(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create simple toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Update loading status
     */
    updateLoadingStatus(message) {
        console.log(`📋 ${message}`);
        
        if (this.loadingOverlay) {
            const statusElement = this.loadingOverlay.querySelector('.loading-status');
            if (statusElement) {
                statusElement.textContent = message;
            }
        }
    }

    /**
     * Hide loading overlay
     */
    async hideLoadingOverlay() {
        if (!this.loadingOverlay) return;
        
        // Update final status
        this.updateLoadingStatus('Application ready!');
        
        // Wait a moment
        await this.delay(500);
        
        // Fade out animation
        this.loadingOverlay.style.opacity = '0';
        this.loadingOverlay.style.transition = 'opacity 0.5s ease-out';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        console.error('Application startup error:', error);
        
        if (this.loadingOverlay) {
            this.loadingOverlay.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h2>Application Failed to Start</h2>
                    <p>We're sorry, but the application encountered an error during startup.</p>
                    <details class="error-details">
                        <summary>Technical Details</summary>
                        <pre>${error.message}</pre>
                        ${error.stack ? `<pre class="error-stack">${error.stack}</pre>` : ''}
                    </details>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="btn btn-primary">
                            Reload Page
                        </button>
                    </div>
                </div>
                <style>
                    .error-state {
                        text-align: center;
                        padding: 2rem;
                        max-width: 500px;
                        margin: 0 auto;
                        color: var(--color-text-primary, #1f2937);
                    }
                    .error-icon { font-size: 4rem; margin-bottom: 1rem; }
                    .error-state h2 { color: #ef4444; margin-bottom: 1rem; }
                    .error-state p { margin-bottom: 1.5rem; color: #6b7280; }
                    .error-details {
                        text-align: left; margin-bottom: 1.5rem;
                        background: #f9fafb; border-radius: 8px; padding: 1rem;
                    }
                    .error-details pre {
                        white-space: pre-wrap; word-break: break-word;
                        font-size: 0.875rem; color: #dc2626;
                    }
                    .btn {
                        padding: 0.75rem 1.5rem; border-radius: 6px; border: none;
                        font-weight: 500; cursor: pointer; background: #6366f1; color: white;
                    }
                </style>
            `;
            
            this.loadingOverlay.style.opacity = '1';
            this.loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Start the application
 */
async function startApplication() {
    try {
        console.log('🚀 Starting NCS-API application (minimal version)...');
        
        const bootstrap = new SimpleBootstrap();
        await bootstrap.init();
        
    } catch (error) {
        console.error('Critical startup error:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div style="text-align: center; padding: 2rem; font-family: system-ui, sans-serif;">
                <h1 style="color: #dc2626;">Application Error</h1>
                <p>Unable to start the application.</p>
                <details style="margin: 1rem 0; text-align: left;">
                    <summary>Error Details</summary>
                    <pre style="background: #f3f4f6; padding: 1rem; border-radius: 4px;">${error.message}</pre>
                </details>
                <button onclick="window.location.reload()" style="background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

/**
 * Start when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
} else {
    startApplication();
}

// Add basic animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .animate-in {
        animation: fadeInUp 0.6s ease-out;
    }
    @keyframes fadeInUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Global error handlers for debugging
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('📄 Main.js loaded successfully');