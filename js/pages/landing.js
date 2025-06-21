// File: landing.js
// Path: js/pages/landing.js
// Landing page logic for NCS-API-Website
// Handles hero interactions, animations, feature demos, and user engagement

// ✅ FIXED: Changed from default to named import to match usage pattern
import { EventBus } from "../core/eventBusNew.js";
import { transitionManager, EasingFunctions } from '../visualizations/animations/Transitions.js';
import { debounce } from '../utils/debounce.js';

/**
 * Landing page controller
 */
class LandingPage {
    constructor() {
        this.initialized = false;
        this.scrollPosition = 0;
        this.isScrolling = false;
        this.featuresInView = new Set();
        this.animations = new Map();
        
        // ✅ FIXED: Create EventBus instance
        this.eventBus = new EventBus();
        
        // DOM elements
        this.elements = {
            hero: null,
            nav: null,
            ctaButtons: [],
            featureSections: [],
            demoContainers: [],
            scrollIndicator: null,
            backToTop: null
        };
        
        // Intersection observers
        this.intersectionObserver = null;
        this.heroObserver = null;
        
        // Demo data
        this.demoData = {
            clustering: this.generateClusteringDemo(),
            performance: this.generatePerformanceDemo(),
            quality: this.generateQualityDemo()
        };
        
        // Throttled handlers
        this.handleScroll = debounce(this.onScroll.bind(this), 16); // ~60fps
        this.handleResize = debounce(this.onResize.bind(this), 250);
    }
    
    /**
     * Initialize landing page
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize intersection observers
            this.setupIntersectionObservers();
            
            // Setup navigation
            this.setupNavigation();
            
            // Initialize feature demos
            this.initializeFeatureDemos();
            
            // Setup hero animations
            this.setupHeroAnimations();
            
            // Initialize scroll effects
            this.initializeScrollEffects();
            
            // Setup CTA tracking
            this.setupCTATracking();
            
            this.initialized = true;
            
            // ✅ FIXED: Use this.eventBus instead of EventBus
            this.eventBus.emit('landing:initialized');
            console.log('✅ Landing page initialized');
            
        } catch (error) {
            console.error('❌ Landing page initialization failed:', error);
            // ✅ FIXED: Use this.eventBus instead of EventBus
            this.eventBus.emit('landing:error', { error });
        }
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.hero = document.querySelector('.hero');
        this.elements.nav = document.querySelector('.main-nav');
        this.elements.ctaButtons = [...document.querySelectorAll('.cta-button')];
        this.elements.featureSections = [...document.querySelectorAll('.feature-section')];
        this.elements.demoContainers = [...document.querySelectorAll('.demo-container')];
        this.elements.scrollIndicator = document.querySelector('.scroll-indicator');
        this.elements.backToTop = document.querySelector('.back-to-top');
        
        // Create missing elements if needed
        if (!this.elements.backToTop) {
            this.createBackToTopButton();
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Scroll handling
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        window.addEventListener('resize', this.handleResize, { passive: true });
        
        // CTA button clicks
        this.elements.ctaButtons.forEach(button => {
            button.addEventListener('click', this.handleCTAClick.bind(this));
        });
        
        // Back to top button
        if (this.elements.backToTop) {
            this.elements.backToTop.addEventListener('click', this.scrollToTop.bind(this));
        }
        
        // Mobile menu handling
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }
        
        // Hero demo interaction
        const heroPlayButton = document.querySelector('.hero-play-demo');
        if (heroPlayButton) {
            heroPlayButton.addEventListener('click', this.playHeroDemo.bind(this));
        }
    }
    
    /**
     * Setup intersection observers for animations
     */
    setupIntersectionObservers() {
        // Feature sections observer
        const featureObserverOptions = {
            threshold: 0.2,
            rootMargin: '-50px 0px'
        };
        
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.featuresInView.add(entry.target);
                    this.animateFeatureIn(entry.target);
                } else {
                    this.featuresInView.delete(entry.target);
                }
            });
        }, featureObserverOptions);
        
        // Observe feature sections
        this.elements.featureSections.forEach(section => {
            this.intersectionObserver.observe(section);
        });
        
        // Hero observer for sticky nav
        const heroObserverOptions = {
            threshold: 0.1
        };
        
        this.heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (this.elements.nav) {
                    this.elements.nav.classList.toggle('sticky', !entry.isIntersecting);
                }
            });
        }, heroObserverOptions);
        
        if (this.elements.hero) {
            this.heroObserver.observe(this.elements.hero);
        }
    }
    
    /**
     * Animate feature section into view
     */
    animateFeatureIn(element) {
        element.classList.add('animate-in');
        
        // Start demo if it exists
        const demoContainer = element.querySelector('.demo-container');
        if (demoContainer) {
            this.playDemo(demoContainer);
        }
        
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:feature:visible', { element });
    }
    
    /**
     * Setup navigation functionality
     */
    setupNavigation() {
        // Smooth scroll for anchor links
        const navLinks = document.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
    
    /**
     * Initialize feature demos
     */
    initializeFeatureDemos() {
        this.elements.demoContainers.forEach(container => {
            this.setupDemo(container);
        });
    }
    
    /**
     * Setup demo container
     */
    setupDemo(container) {
        const demoType = container.dataset.demo;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const rect = container.getBoundingClientRect();
        canvas.width = Math.min(rect.width, 400);
        canvas.height = canvas.width * 0.75;
        
        container.appendChild(canvas);
        
        // Store demo data
        const demoConfig = {
            canvas,
            ctx,
            type: demoType,
            data: this.demoData[demoType] || [],
            animationId: null,
            isPlaying: false
        };
        
        container.demoConfig = demoConfig;
    }
    
    /**
     * Generate clustering demo data
     */
    generateClusteringDemo() {
        const points = [];
        const clusters = [
            { center: [100, 100], color: '#3b82f6', count: 15 },
            { center: [300, 150], color: '#ef4444', count: 12 },
            { center: [200, 250], color: '#10b981', count: 18 }
        ];
        
        clusters.forEach(cluster => {
            for (let i = 0; i < cluster.count; i++) {
                points.push({
                    x: cluster.center[0] + (Math.random() - 0.5) * 80,
                    y: cluster.center[1] + (Math.random() - 0.5) * 80,
                    color: cluster.color,
                    cluster: cluster
                });
            }
        });
        
        return points;
    }
    
    /**
     * Generate performance demo data
     */
    generatePerformanceDemo() {
        const algorithms = ['K-Means', 'DBSCAN', 'Hierarchical', 'NCS'];
        return algorithms.map((name, i) => ({
            name,
            performance: 70 + Math.random() * 30,
            color: `hsl(${i * 90}, 70%, 50%)`
        }));
    }
    
    /**
     * Generate quality demo data
     */
    generateQualityDemo() {
        const metrics = ['Silhouette', 'Davies-Bouldin', 'Calinski-Harabasz'];
        return metrics.map((name, i) => ({
            name,
            score: 0.6 + Math.random() * 0.4,
            color: `hsl(${120 + i * 30}, 70%, 50%)`
        }));
    }
    
    /**
     * Play demo animation
     */
    playDemo(container) {
        const config = container.demoConfig;
        if (!config || config.isPlaying) return;
        
        config.isPlaying = true;
        
        const animate = () => {
            if (!config.isPlaying) return;
            
            this.renderDemo(config);
            config.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Pause demo animation
     */
    pauseDemo(container) {
        const config = container.demoConfig;
        if (!config) return;
        
        config.isPlaying = false;
        if (config.animationId) {
            cancelAnimationFrame(config.animationId);
            config.animationId = null;
        }
    }
    
    /**
     * Render demo based on type
     */
    renderDemo(config) {
        const { ctx, canvas, type, data } = config;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        switch (type) {
            case 'clustering':
                this.renderClusteringDemo(ctx, data);
                break;
            case 'performance':
                this.renderPerformanceDemo(ctx, data, canvas);
                break;
            case 'quality':
                this.renderQualityDemo(ctx, data, canvas);
                break;
        }
    }
    
    /**
     * Render clustering demo
     */
    renderClusteringDemo(ctx, points) {
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = point.color;
            ctx.fill();
        });
    }
    
    /**
     * Render performance demo
     */
    renderPerformanceDemo(ctx, data, canvas) {
        const barWidth = canvas.width / data.length;
        const maxHeight = canvas.height * 0.8;
        
        data.forEach((item, i) => {
            const height = (item.performance / 100) * maxHeight;
            const x = i * barWidth + barWidth * 0.1;
            const y = canvas.height - height;
            
            ctx.fillStyle = item.color;
            ctx.fillRect(x, y, barWidth * 0.8, height);
            
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(item.name, x + barWidth * 0.4, canvas.height - 5);
        });
    }
    
    /**
     * Render quality demo
     */
    renderQualityDemo(ctx, data, canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        data.forEach((item, i) => {
            const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
            const scoreRadius = radius * item.score;
            
            const x = centerX + Math.cos(angle) * scoreRadius;
            const y = centerY + Math.sin(angle) * scoreRadius;
            
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = item.color;
            ctx.fill();
        });
        
        // Draw radar grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * (i / 3), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    /**
     * Setup hero animations
     */
    setupHeroAnimations() {
        // Parallax effect for hero background
        const heroBackground = document.querySelector('.hero-background');
        if (heroBackground) {
            this.setupParallax(heroBackground);
        }
        
        // Typing animation for hero title
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle && heroTitle.dataset.typewrite) {
            this.setupTypewriter(heroTitle);
        }
    }
    
    /**
     * Setup parallax effect
     */
    setupParallax(element) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            element.style.transform = `translateY(${rate}px)`;
        }, { passive: true });
    }
    
    /**
     * Setup typewriter effect
     */
    setupTypewriter(element) {
        const text = element.textContent;
        const speed = parseInt(element.dataset.speed) || 100;
        
        element.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        };
        
        // Start typing after a delay
        setTimeout(typeWriter, 1000);
    }
    
    /**
     * Initialize scroll effects
     */
    initializeScrollEffects() {
        // Create scroll indicator if it doesn't exist
        if (!this.elements.scrollIndicator) {
            this.createScrollIndicator();
        }
    }
    
    /**
     * Create scroll indicator
     */
    createScrollIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.innerHTML = '<div class="scroll-progress"></div>';
        document.body.appendChild(indicator);
        this.elements.scrollIndicator = indicator;
    }
    
    /**
     * Create back to top button
     */
    createBackToTopButton() {
        const button = document.createElement('button');
        button.className = 'back-to-top';
        button.innerHTML = '↑';
        button.setAttribute('aria-label', 'Back to top');
        document.body.appendChild(button);
        this.elements.backToTop = button;
    }
    
    /**
     * Scroll to top smoothly
     */
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:scroll:top');
    }
    
    /**
     * Handle scroll events
     */
    onScroll() {
        this.scrollPosition = window.pageYOffset;
        this.isScrolling = true;
        
        // Update scroll indicator
        if (this.elements.scrollIndicator) {
            const progress = this.elements.scrollIndicator.querySelector('.scroll-progress');
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (this.scrollPosition / docHeight) * 100;
            progress.style.width = `${Math.min(scrollPercent, 100)}%`;
        }
        
        // Show/hide back to top button
        if (this.elements.backToTop) {
            const showButton = this.scrollPosition > 500;
            this.elements.backToTop.style.opacity = showButton ? '1' : '0';
            this.elements.backToTop.style.pointerEvents = showButton ? 'auto' : 'none';
        }
        
        // Update scroll progress
        this.updateScrollProgress();
    }
    
    /**
     * Update scroll progress
     */
    updateScrollProgress() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(this.scrollPosition / docHeight, 1);
        
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:scroll:progress', { progress, position: this.scrollPosition });
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        // Update demo canvas sizes
        this.elements.demoContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                const rect = container.getBoundingClientRect();
                canvas.width = Math.min(rect.width, 400);
                canvas.height = canvas.width * 0.75;
            }
        });
    }
    
    /**
     * Handle CTA clicks
     */
    handleCTAClick(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        const target = button.dataset.target;
        
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:cta:click', { action, target, button });
        
        // Add click animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    /**
     * Setup CTA tracking
     */
    setupCTATracking() {
        // Track CTA visibility and interactions
        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // ✅ FIXED: Use this.eventBus instead of EventBus
                    this.eventBus.emit('landing:cta:visible', { 
                        element: entry.target,
                        action: entry.target.dataset.action 
                    });
                }
            });
        }, { threshold: 0.5 });
        
        this.elements.ctaButtons.forEach(button => {
            ctaObserver.observe(button);
        });
    }
    
    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const nav = document.querySelector('.main-nav');
        if (nav) {
            nav.classList.toggle('mobile-menu-open');
        }
        
        const body = document.body;
        if (body.classList.contains('mobile-menu-open')) {
            body.classList.remove('mobile-menu-open');
        } else {
            body.classList.add('mobile-menu-open');
        }
    }
    
    /**
     * Play hero demo
     */
    playHeroDemo() {
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:hero:demo:play');
        
        // Trigger main demo if available
        const heroDemo = document.querySelector('.hero-demo-container');
        if (heroDemo) {
            this.playDemo(heroDemo);
        }
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        
        // Disconnect observers
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.heroObserver) {
            this.heroObserver.disconnect();
        }
        
        // Cancel animations
        this.elements.demoContainers.forEach(container => {
            this.pauseDemo(container);
        });
        
        // Clear transitions
        transitionManager.stopAll();
        
        this.initialized = false;
        // ✅ FIXED: Use this.eventBus instead of EventBus
        this.eventBus.emit('landing:destroyed');
    }
}

/**
 * Initialize landing page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const landingPage = new LandingPage();
    landingPage.init();
    
    // Expose to global scope for debugging
    if (window.NCS) {
        window.NCS.landingPage = landingPage;
    }
});

// Export for module systems
export default LandingPage;