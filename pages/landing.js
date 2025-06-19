// File: landing.js
// Path: js/pages/landing.js
// Landing page logic for NCS-API-Website
// Handles hero interactions, animations, feature demos, and user engagement

import { EventBus } from '../core/eventBus.js';
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
            
            EventBus.emit('landing:initialized');
            console.log('✅ Landing page initialized');
            
        } catch (error) {
            console.error('❌ Landing page initialization failed:', error);
            EventBus.emit('landing:error', { error });
        }
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.hero = document.querySelector('.hero-section');
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
        // Scroll events
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        window.addEventListener('resize', this.handleResize);
        
        // Navigation events
        document.addEventListener('click', this.handleNavigationClick.bind(this));
        
        // CTA button events
        this.elements.ctaButtons.forEach(button => {
            button.addEventListener('click', this.handleCTAClick.bind(this));
        });
        
        // Back to top button
        if (this.elements.backToTop) {
            this.elements.backToTop.addEventListener('click', this.scrollToTop.bind(this));
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Hero video/animation controls
        const heroPlayButton = document.querySelector('.hero-play-button');
        if (heroPlayButton) {
            heroPlayButton.addEventListener('click', this.playHeroDemo.bind(this));
        }
    }
    
    /**
     * Setup intersection observers
     */
    setupIntersectionObservers() {
        // Feature sections observer
        this.intersectionObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                root: null,
                rootMargin: '-10% 0px -10% 0px',
                threshold: [0, 0.25, 0.5, 0.75, 1]
            }
        );
        
        // Observe feature sections
        this.elements.featureSections.forEach(section => {
            this.intersectionObserver.observe(section);
        });
        
        // Hero observer for navbar effects
        this.heroObserver = new IntersectionObserver(
            this.handleHeroIntersection.bind(this),
            {
                root: null,
                rootMargin: '0px',
                threshold: [0, 0.1, 0.5, 0.9]
            }
        );
        
        if (this.elements.hero) {
            this.heroObserver.observe(this.elements.hero);
        }
    }
    
    /**
     * Handle intersection changes
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            const sectionId = entry.target.id;
            const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.25;
            
            if (isVisible && !this.featuresInView.has(sectionId)) {
                this.featuresInView.add(sectionId);
                this.animateFeatureIn(entry.target);
                this.startFeatureDemo(entry.target);
            } else if (!isVisible && this.featuresInView.has(sectionId)) {
                this.featuresInView.delete(sectionId);
                this.pauseFeatureDemo(entry.target);
            }
            
            // Update navigation active states
            this.updateNavigationState();
        });
    }
    
    /**
     * Handle hero intersection
     */
    handleHeroIntersection(entries) {
        entries.forEach(entry => {
            const isHeroVisible = entry.isIntersecting && entry.intersectionRatio > 0.1;
            
            if (this.elements.nav) {
                this.elements.nav.classList.toggle('nav-scrolled', !isHeroVisible);
            }
            
            if (this.elements.scrollIndicator) {
                this.elements.scrollIndicator.style.opacity = isHeroVisible ? '1' : '0';
            }
        });
    }
    
    /**
     * Setup navigation
     */
    setupNavigation() {
        // Smooth scroll for anchor links
        const navLinks = document.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleSmoothScroll.bind(this));
        });
        
        // Mobile menu toggle
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }
    }
    
    /**
     * Handle navigation clicks
     */
    handleNavigationClick(event) {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        
        event.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        this.scrollToSection(targetId);
    }
    
    /**
     * Handle smooth scrolling
     */
    handleSmoothScroll(event) {
        event.preventDefault();
        const targetId = event.target.getAttribute('href').substring(1);
        this.scrollToSection(targetId);
    }
    
    /**
     * Scroll to section
     */
    scrollToSection(sectionId) {
        const target = document.getElementById(sectionId);
        if (!target) return;
        
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const navHeight = this.elements.nav ? this.elements.nav.offsetHeight : 0;
        const finalPosition = targetPosition - navHeight - 20;
        
        this.animatedScrollTo(finalPosition);
    }
    
    /**
     * Animated scroll to position
     */
    animatedScrollTo(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = Math.min(Math.abs(distance) * 0.5, 1000); // Max 1 second
        
        transitionManager.create({
            duration: duration,
            easing: EasingFunctions.easeInOutCubic,
            onUpdate: (transition) => {
                const currentPosition = startPosition + (distance * transition.progress);
                window.scrollTo(0, currentPosition);
            }
        }).start();
    }
    
    /**
     * Initialize feature demos
     */
    initializeFeatureDemos() {
        this.elements.demoContainers.forEach(container => {
            const demoType = container.dataset.demo;
            if (this.demoData[demoType]) {
                this.setupDemo(container, demoType);
            }
        });
    }
    
    /**
     * Setup individual demo
     */
    setupDemo(container, demoType) {
        const canvas = container.querySelector('canvas') || this.createDemoCanvas(container);
        const ctx = canvas.getContext('2d');
        
        // Store demo context
        container.demoContext = {
            canvas,
            ctx,
            type: demoType,
            data: this.demoData[demoType],
            animationId: null,
            isPlaying: false
        };
        
        // Setup demo controls
        this.setupDemoControls(container);
    }
    
    /**
     * Create demo canvas
     */
    createDemoCanvas(container) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        canvas.style.cssText = `
            width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        container.appendChild(canvas);
        return canvas;
    }
    
    /**
     * Setup demo controls
     */
    setupDemoControls(container) {
        const controlsHtml = `
            <div class="demo-controls">
                <button class="demo-play" aria-label="Play demo">▶️</button>
                <button class="demo-pause" aria-label="Pause demo">⏸️</button>
                <button class="demo-reset" aria-label="Reset demo">🔄</button>
                <div class="demo-progress">
                    <div class="demo-progress-bar"></div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', controlsHtml);
        
        // Bind control events
        const playBtn = container.querySelector('.demo-play');
        const pauseBtn = container.querySelector('.demo-pause');
        const resetBtn = container.querySelector('.demo-reset');
        
        playBtn?.addEventListener('click', () => this.playDemo(container));
        pauseBtn?.addEventListener('click', () => this.pauseDemo(container));
        resetBtn?.addEventListener('click', () => this.resetDemo(container));
    }
    
    /**
     * Generate clustering demo data
     */
    generateClusteringDemo() {
        const data = [];
        const numPoints = 100;
        
        // Generate three clusters
        const clusters = [
            { center: { x: 100, y: 100 }, spread: 30, color: '#1f77b4' },
            { center: { x: 300, y: 150 }, spread: 25, color: '#ff7f0e' },
            { center: { x: 200, y: 250 }, spread: 35, color: '#2ca02c' }
        ];
        
        clusters.forEach((cluster, clusterIndex) => {
            const pointsPerCluster = Math.floor(numPoints / clusters.length);
            
            for (let i = 0; i < pointsPerCluster; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * cluster.spread;
                
                data.push({
                    x: cluster.center.x + Math.cos(angle) * distance,
                    y: cluster.center.y + Math.sin(angle) * distance,
                    cluster: clusterIndex,
                    color: cluster.color
                });
            }
        });
        
        return data;
    }
    
    /**
     * Generate performance demo data
     */
    generatePerformanceDemo() {
        const algorithms = ['K-Means', 'DBSCAN', 'Hierarchical', 'NCS'];
        const datasets = ['Small (100)', 'Medium (1K)', 'Large (10K)', 'XLarge (100K)'];
        
        return {
            algorithms,
            datasets,
            times: algorithms.map(alg => 
                datasets.map((_, i) => Math.random() * (i + 1) * 100 + 10)
            ),
            quality: algorithms.map(() => 
                datasets.map(() => Math.random() * 0.3 + 0.7)
            )
        };
    }
    
    /**
     * Generate quality demo data
     */
    generateQualityDemo() {
        return {
            silhouette: Math.random() * 0.4 + 0.6,
            daviesBouldin: Math.random() * 0.5 + 0.3,
            calinskiHarabasz: Math.random() * 50 + 100,
            overallScore: Math.random() * 0.2 + 0.8
        };
    }
    
    /**
     * Start feature demo
     */
    startFeatureDemo(section) {
        const container = section.querySelector('.demo-container');
        if (container && !container.demoContext?.isPlaying) {
            this.playDemo(container);
        }
    }
    
    /**
     * Pause feature demo
     */
    pauseFeatureDemo(section) {
        const container = section.querySelector('.demo-container');
        if (container && container.demoContext?.isPlaying) {
            this.pauseDemo(container);
        }
    }
    
    /**
     * Play demo animation
     */
    playDemo(container) {
        const context = container.demoContext;
        if (!context) return;
        
        context.isPlaying = true;
        context.startTime = Date.now();
        
        const animate = () => {
            if (!context.isPlaying) return;
            
            this.renderDemo(container);
            context.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * Pause demo animation
     */
    pauseDemo(container) {
        const context = container.demoContext;
        if (!context) return;
        
        context.isPlaying = false;
        if (context.animationId) {
            cancelAnimationFrame(context.animationId);
        }
    }
    
    /**
     * Reset demo animation
     */
    resetDemo(container) {
        this.pauseDemo(container);
        const context = container.demoContext;
        if (context) {
            context.startTime = Date.now();
            this.renderDemo(container);
        }
    }
    
    /**
     * Render demo animation
     */
    renderDemo(container) {
        const context = container.demoContext;
        if (!context) return;
        
        const { canvas, ctx, type, data } = context;
        const elapsed = Date.now() - context.startTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        switch (type) {
            case 'clustering':
                this.renderClusteringDemo(ctx, data, elapsed);
                break;
            case 'performance':
                this.renderPerformanceDemo(ctx, data, elapsed);
                break;
            case 'quality':
                this.renderQualityDemo(ctx, data, elapsed);
                break;
        }
    }
    
    /**
     * Render clustering demo
     */
    renderClusteringDemo(ctx, data, elapsed) {
        const progress = (elapsed % 5000) / 5000; // 5 second cycle
        
        data.forEach(point => {
            const alpha = 0.5 + 0.5 * Math.sin(elapsed * 0.001 + point.x * 0.01);
            ctx.fillStyle = point.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Animate cluster formation
        if (progress < 0.5) {
            // Show scattered points
            data.forEach(point => {
                const noise = (Math.random() - 0.5) * 20 * (0.5 - progress) * 2;
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(point.x + noise, point.y + noise, 2, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    }
    
    /**
     * Render performance demo
     */
    renderPerformanceDemo(ctx, data, elapsed) {
        const progress = (elapsed % 3000) / 3000;
        const { algorithms, datasets, times } = data;
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        
        // Draw animated bar chart
        algorithms.forEach((alg, i) => {
            const y = 50 + i * 50;
            const maxWidth = 300;
            const currentWidth = maxWidth * Math.min(progress * 2, 1);
            
            // Algorithm label
            ctx.fillText(alg, 10, y + 15);
            
            // Bar background
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(100, y, maxWidth, 20);
            
            // Animated bar
            ctx.fillStyle = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'][i];
            ctx.fillRect(100, y, currentWidth * (times[i][1] / 100), 20);
        });
    }
    
    /**
     * Render quality demo
     */
    renderQualityDemo(ctx, data, elapsed) {
        const progress = (elapsed % 4000) / 4000;
        const centerX = 200;
        const centerY = 150;
        const radius = 80;
        
        // Draw quality score as animated arc
        const targetAngle = data.overallScore * 2 * Math.PI;
        const currentAngle = targetAngle * Math.min(progress * 2, 1);
        
        // Background circle
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Quality arc
        ctx.strokeStyle = '#2ca02c';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + currentAngle);
        ctx.stroke();
        
        // Score text
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        const score = Math.floor(data.overallScore * 100 * Math.min(progress * 2, 1));
        ctx.fillText(`${score}%`, centerX, centerY + 8);
    }
    
    /**
     * Setup hero animations
     */
    setupHeroAnimations() {
        if (!this.elements.hero) return;
        
        // Animate hero elements on load
        const heroTitle = this.elements.hero.querySelector('.hero-title');
        const heroSubtitle = this.elements.hero.querySelector('.hero-subtitle');
        const heroButtons = this.elements.hero.querySelectorAll('.hero-button');
        
        if (heroTitle) {
            transitionManager.create({
                duration: 1000,
                delay: 300,
                easing: EasingFunctions.easeOutCubic,
                onUpdate: (transition) => {
                    heroTitle.style.opacity = transition.progress;
                    heroTitle.style.transform = `translateY(${30 * (1 - transition.progress)}px)`;
                }
            }).start();
        }
        
        if (heroSubtitle) {
            transitionManager.create({
                duration: 1000,
                delay: 600,
                easing: EasingFunctions.easeOutCubic,
                onUpdate: (transition) => {
                    heroSubtitle.style.opacity = transition.progress;
                    heroSubtitle.style.transform = `translateY(${30 * (1 - transition.progress)}px)`;
                }
            }).start();
        }
        
        heroButtons.forEach((button, index) => {
            transitionManager.create({
                duration: 600,
                delay: 900 + (index * 150),
                easing: EasingFunctions.easeOutBack,
                onUpdate: (transition) => {
                    button.style.opacity = transition.progress;
                    button.style.transform = `translateY(${20 * (1 - transition.progress)}px) scale(${0.9 + 0.1 * transition.progress})`;
                }
            }).start();
        });
    }
    
    /**
     * Animate feature in
     */
    animateFeatureIn(element) {
        const items = element.querySelectorAll('.animate-in');
        
        items.forEach((item, index) => {
            transitionManager.create({
                duration: 800,
                delay: index * 100,
                easing: EasingFunctions.easeOutCubic,
                onUpdate: (transition) => {
                    item.style.opacity = transition.progress;
                    item.style.transform = `translateY(${40 * (1 - transition.progress)}px)`;
                }
            }).start();
        });
    }
    
    /**
     * Initialize scroll effects
     */
    initializeScrollEffects() {
        // Parallax elements
        const parallaxElements = document.querySelectorAll('.parallax');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const speed = element.dataset.speed || 0.5;
                const translateY = scrolled * speed;
                element.style.transform = `translateY(${translateY}px)`;
            });
        }, { passive: true });
    }
    
    /**
     * Handle scroll events
     */
    onScroll() {
        this.scrollPosition = window.pageYOffset;
        
        // Update back to top button
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
        
        EventBus.emit('landing:scroll:progress', { progress, position: this.scrollPosition });
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
        
        EventBus.emit('landing:cta:click', { action, target, button });
        
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
        const ctaObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        EventBus.emit('landing:cta:visible', { 
                            cta: entry.target,
                            action: entry.target.dataset.action
                        });
                    }
                });
            },
            { threshold: 0.5 }
        );
        
        this.elements.ctaButtons.forEach(button => {
            ctaObserver.observe(button);
        });
    }
    
    /**
     * Update navigation state
     */
    updateNavigationState() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const targetId = link.getAttribute('href')?.substring(1);
            const isActive = this.featuresInView.has(targetId);
            link.classList.toggle('active', isActive);
        });
    }
    
    /**
     * Create back to top button
     */
    createBackToTopButton() {
        const button = document.createElement('button');
        button.className = 'back-to-top';
        button.innerHTML = '↑';
        button.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            border: none;
            border-radius: 50%;
            background: #6366f1;
            color: white;
            font-size: 20px;
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(button);
        this.elements.backToTop = button;
    }
    
    /**
     * Scroll to top
     */
    scrollToTop() {
        this.animatedScrollTo(0);
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboard(event) {
        // Escape key closes mobile menu
        if (event.key === 'Escape') {
            this.closeMobileMenu();
        }
        
        // Space or Enter on CTA buttons
        if ((event.key === ' ' || event.key === 'Enter') && 
            event.target.classList.contains('cta-button')) {
            event.preventDefault();
            event.target.click();
        }
    }
    
    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const nav = this.elements.nav;
        if (nav) {
            nav.classList.toggle('mobile-menu-open');
        }
    }
    
    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const nav = this.elements.nav;
        if (nav) {
            nav.classList.remove('mobile-menu-open');
        }
    }
    
    /**
     * Play hero demo
     */
    playHeroDemo() {
        EventBus.emit('landing:hero:demo:play');
        
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
        EventBus.emit('landing:destroyed');
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