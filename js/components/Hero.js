/**
 * Hero Component - Interactive clustering visualization hero section
 * NCS-API Website
 * 
 * Features:
 * - Real-time clustering animation
 * - Interactive demo preview
 * - Performance metrics display
 * - Responsive design
 * - Theme integration
 */

import * as THREE from 'three';
import { CONFIG } from '../config/constants.js';

export class Hero {
    constructor() {
        this.container = document.querySelector('.hero');
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        this.clusters = [];
        this.isInitialized = false;
        this.isVisible = true;
        
        // Demo state
        this.demoVisualization = null;
        this.demoInterval = null;
        this.currentMetrics = {
            processingSpeed: 6300,
            qualityScore: 91.8,
            realTimeConnections: 847
        };
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        
        this.init();
    }

    /**
     * Initialize hero component
     */
    async init() {
        try {
            if (!this.container) {
                console.warn('Hero container not found');
                return;
            }

            console.log('🎬 Initializing Hero component...');
            
            // Set up elements
            this.setupElements();
            
            // Initialize Three.js scene
            await this.initializeThreeJS();
            
            // Set up demo visualization
            this.setupDemoVisualization();
            
            // Bind events
            this.bindEvents();
            
            // Start animations
            this.startAnimations();
            
            // Mark as loaded
            this.container.classList.add('hero-loaded');
            this.container.classList.remove('hero-loading');
            
            this.isInitialized = true;
            console.log('✅ Hero component initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Hero component:', error);
            this.handleError(error);
        }
    }

    /**
     * Set up DOM elements
     */
    setupElements() {
        // Create hero canvas if it doesn't exist
        if (!this.container.querySelector('.hero-canvas')) {
            const canvas = document.createElement('canvas');
            canvas.className = 'hero-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            this.container.appendChild(canvas);
        }
        
        this.canvas = this.container.querySelector('.hero-canvas');
        
        // Update live metrics
        this.updateLiveMetrics();
        
        // Set up demo container
        this.demoVisualization = this.container.querySelector('.hero-demo-visualization');
        if (this.demoVisualization) {
            this.setupDemoPlaceholder();
        }
    }

    /**
     * Initialize Three.js scene for background animation
     */
    async initializeThreeJS() {
        if (!this.canvas) return;

        // Scene setup
        this.scene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 30;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        
        // Create clustering visualization
        this.createClusteringAnimation();
    }

    /**
     * Create animated clustering visualization
     */
    createClusteringAnimation() {
        // Create particle system for clustering effect
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Cluster centers
        const clusterCenters = [
            { x: -8, y: 4, z: 0, color: new THREE.Color(0x6366f1) },
            { x: 8, y: -2, z: 0, color: new THREE.Color(0xa855f7) },
            { x: 0, y: -6, z: 0, color: new THREE.Color(0x06b6d4) }
        ];
        
        // Generate particles around cluster centers
        for (let i = 0; i < particleCount; i++) {
            const clusterIndex = Math.floor(Math.random() * clusterCenters.length);
            const cluster = clusterCenters[clusterIndex];
            
            // Random position around cluster center
            const radius = Math.random() * 5 + 1;
            const angle = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * 4;
            
            positions[i * 3] = cluster.x + Math.cos(angle) * radius;
            positions[i * 3 + 1] = cluster.y + Math.sin(angle) * radius + height;
            positions[i * 3 + 2] = cluster.z + (Math.random() - 0.5) * 3;
            
            // Color based on cluster
            colors[i * 3] = cluster.color.r;
            colors[i * 3 + 1] = cluster.color.g;
            colors[i * 3 + 2] = cluster.color.b;
            
            // Random size
            sizes[i] = Math.random() * 3 + 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Shader material for particles
        const material = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float distance = length(gl_PointCoord - vec2(0.5));
                    if (distance > 0.5) discard;
                    
                    float alpha = 1.0 - (distance * 2.0);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        this.clusters = new THREE.Points(geometry, material);
        this.scene.add(this.clusters);
    }

    /**
     * Set up demo visualization placeholder
     */
    setupDemoPlaceholder() {
        if (!this.demoVisualization) return;
        
        this.demoVisualization.innerHTML = `
            <div class="hero-demo-placeholder">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <div style="width: 60px; height: 60px; border: 3px solid var(--color-primary-400); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Interactive Clustering Demo</span>
                    <small style="color: var(--color-text-tertiary); text-align: center;">
                        Real-time visualization loading...<br>
                        <a href="/playground.html" style="color: var(--color-primary-400); text-decoration: none;">Open Full Playground →</a>
                    </small>
                </div>
            </div>
        `;
        
        // Add spin animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Update live metrics in hero stats
     */
    updateLiveMetrics() {
        const updateMetric = (selector, value, suffix = '') => {
            const element = this.container.querySelector(selector);
            if (element) {
                element.textContent = value + suffix;
            }
        };
        
        // Add some realistic variation to metrics
        const speedVariation = Math.floor(Math.random() * 200) - 100;
        const qualityVariation = (Math.random() - 0.5) * 2;
        const connectionsVariation = Math.floor(Math.random() * 100) - 50;
        
        updateMetric('.hero-stat-value:nth-of-type(1)', 
            (this.currentMetrics.processingSpeed + speedVariation).toLocaleString(), '+');
        updateMetric('.hero-stat-value:nth-of-type(2)', 
            (this.currentMetrics.qualityScore + qualityVariation).toFixed(1), '%');
        updateMetric('.hero-stat-value:nth-of-type(3)', 
            (this.currentMetrics.realTimeConnections + connectionsVariation).toLocaleString());
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // CTA button interactions
        this.bindCTAButtons();
        
        // Intersection observer for performance
        this.setupIntersectionObserver();
        
        // Update metrics periodically
        this.startMetricsUpdate();
    }

    /**
     * Bind CTA button interactions
     */
    bindCTAButtons() {
        const primaryCTA = this.container.querySelector('.hero-cta-primary');
        const secondaryCTA = this.container.querySelector('.hero-cta-secondary');
        
        if (primaryCTA) {
            primaryCTA.addEventListener('click', (e) => {
                e.preventDefault();
                this.trackEvent('hero_primary_cta_click');
                // Navigate to playground or API key signup
                window.location.href = '/playground.html';
            });
        }
        
        if (secondaryCTA) {
            secondaryCTA.addEventListener('click', (e) => {
                e.preventDefault();
                this.trackEvent('hero_secondary_cta_click');
                // Navigate to documentation
                window.location.href = '/docs.html';
            });
        }
    }

    /**
     * Set up intersection observer for performance optimization
     */
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
                if (!this.isVisible && this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    this.animationId = null;
                } else if (this.isVisible && !this.animationId) {
                    this.animate();
                }
            });
        }, {
            threshold: 0.1
        });
        
        observer.observe(this.container);
    }

    /**
     * Start periodic metrics updates
     */
    startMetricsUpdate() {
        this.metricsInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateLiveMetrics();
            }
        }, 3000); // Update every 3 seconds
    }

    /**
     * Start animations
     */
    startAnimations() {
        this.animate();
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.isInitialized || !this.isVisible) return;
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Update FPS counter
        this.frameCount++;
        if (deltaTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
        
        // Animate clusters
        if (this.clusters && this.scene) {
            this.clusters.rotation.y += 0.002;
            this.clusters.rotation.x += 0.001;
            
            // Gentle floating motion
            const time = currentTime * 0.001;
            this.clusters.position.y = Math.sin(time * 0.5) * 0.5;
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * Handle visibility change for performance optimization
     */
    handleVisibilityChange() {
        if (document.hidden) {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        } else if (this.isVisible) {
            this.animate();
        }
    }

    /**
     * Track events for analytics
     */
    trackEvent(eventName, properties = {}) {
        if (window.NCS && window.NCS.analytics) {
            window.NCS.analytics.track(eventName, {
                component: 'hero',
                ...properties
            });
        }
        
        if (CONFIG.IS_DEV) {
            console.log('📊 Hero Event:', eventName, properties);
        }
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('Hero component error:', error);
        
        // Fallback content
        if (this.container) {
            this.container.classList.add('hero-error');
            
            // Remove loading state
            this.container.classList.remove('hero-loading');
            
            // Disable animations
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
        
        // Track error
        this.trackEvent('hero_error', {
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        console.log('🧹 Cleaning up Hero component...');
        
        // Cancel animations
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clear intervals
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
        }
        
        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        this.isInitialized = false;
    }

    /**
     * Get component status for debugging
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            visible: this.isVisible,
            fps: this.fps,
            hasRenderer: !!this.renderer,
            hasScene: !!this.scene,
            animating: !!this.animationId
        };
    }
}