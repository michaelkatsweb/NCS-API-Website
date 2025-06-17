/**
 * Hero Component - Interactive Clustering Visualization
 * Real-time animated clustering demonstration for the hero section
 */

import { CanvasRenderer } from '../visualizations/renderers/CanvasRenderer.js';
import { KMeans } from '../clustering/KMeans.js';
import { ColorPalette } from '../utils/colors.js';
import { MathUtils } from '../utils/math.js';

export class Hero {
    constructor(element) {
        this.element = element;
        this.canvas = element.querySelector('#hero-canvas');
        this.renderer = null;
        this.animation = null;
        this.isPlaying = true;
        this.isPaused = false;
        
        // Animation state
        this.points = [];
        this.clusters = [];
        this.centroids = [];
        this.animationFrame = 0;
        this.lastUpdate = 0;
        
        // Configuration
        this.config = {
            pointCount: 300,
            clusterCount: 4,
            animationSpeed: 1,
            pointSize: 3,
            centroidSize: 8,
            trailLength: 20,
            convergenceThreshold: 0.1,
            resetInterval: 15000, // Reset every 15 seconds
            colors: [
                '#6366f1', // Primary blue
                '#8b5cf6', // Purple
                '#06b6d4', // Cyan
                '#10b981', // Green
                '#f59e0b', // Yellow
                '#ef4444', // Red
                '#ec4899', // Pink
                '#84cc16'  // Lime
            ]
        };
        
        // Performance tracking
        this.performance = {
            frameCount: 0,
            lastFPSUpdate: 0,
            fps: 60,
            renderTime: 0
        };
        
        this.init();
    }

    /**
     * Initialize the hero visualization
     */
    async init() {
        try {
            this.setupCanvas();
            this.setupRenderer();
            this.setupControls();
            this.setupEventListeners();
            this.generateInitialData();
            this.startAnimation();
            
            console.log('🎨 Hero visualization initialized');
        } catch (error) {
            console.error('❌ Hero initialization failed:', error);
            this.showFallback();
        }
    }

    /**
     * Setup canvas with proper sizing and DPI handling
     */
    setupCanvas() {
        if (!this.canvas) {
            throw new Error('Hero canvas not found');
        }
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set display size
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        
        // Set actual size for retina displays
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width;
        const height = Math.min(rect.height, 500); // Max height
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        
        // Scale the context for retina displays
        const ctx = this.canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Store dimensions
        this.dimensions = { width, height };
        
        console.log(`📐 Canvas setup: ${width}x${height} (DPR: ${dpr})`);
    }

    /**
     * Setup the canvas renderer
     */
    setupRenderer() {
        this.renderer = new CanvasRenderer(this.canvas, {
            antialias: true,
            alpha: true,
            optimized: true
        });
    }

    /**
     * Setup visualization controls
     */
    setupControls() {
        const controls = this.element.querySelectorAll('.viz-control');
        
        controls.forEach(control => {
            const action = control.dataset.action;
            
            control.addEventListener('click', () => {
                this.handleControlAction(action);
            });
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.debounce(() => {
                this.handleResize();
            }, 250)();
        });
        
        // Canvas interactions
        this.canvas.addEventListener('mouseenter', () => {
            this.handleMouseEnter();
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        });
        
        this.canvas.addEventListener('click', () => {
            this.handleCanvasClick();
        });
        
        // Visibility change (pause when not visible)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimation();
            } else {
                this.resumeAnimation();
            }
        });
        
        // Statistics counter animation trigger
        this.animateStatCounters();
    }

    /**
     * Generate initial random data points
     */
    generateInitialData() {
        this.points = [];
        this.clusters = [];
        
        const { width, height } = this.dimensions;
        const padding = 50;
        
        // Generate clustered data points for more realistic visualization
        const clusterCenters = [];
        for (let i = 0; i < this.config.clusterCount; i++) {
            clusterCenters.push({
                x: padding + Math.random() * (width - padding * 2),
                y: padding + Math.random() * (height - padding * 2)
            });
        }
        
        // Generate points around cluster centers
        for (let i = 0; i < this.config.pointCount; i++) {
            const centerIndex = Math.floor(Math.random() * clusterCenters.length);
            const center = clusterCenters[centerIndex];
            
            // Add some randomness around the center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 20;
            
            const point = {
                id: i,
                x: center.x + Math.cos(angle) * distance,
                y: center.y + Math.sin(angle) * distance,
                originalX: center.x + Math.cos(angle) * distance,
                originalY: center.y + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                cluster: -1,
                previousCluster: -1,
                trail: [],
                alpha: 0.8 + Math.random() * 0.2
            };
            
            // Ensure points stay within bounds
            point.x = Math.max(padding, Math.min(width - padding, point.x));
            point.y = Math.max(padding, Math.min(height - padding, point.y));
            
            this.points.push(point);
        }
        
        console.log(`📊 Generated ${this.points.length} data points`);
    }

    /**
     * Start the animation loop
     */
    startAnimation() {
        this.isPlaying = true;
        this.isPaused = false;
        this.lastUpdate = performance.now();
        
        // Initial clustering
        this.runClustering();
        
        // Start render loop
        this.animate();
        
        // Setup periodic reset
        this.setupPeriodicReset();
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.isPlaying) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdate;
        
        // Limit to 60 FPS max
        if (deltaTime >= 16.67) {
            this.update(deltaTime);
            this.render();
            
            this.lastUpdate = currentTime;
            this.updatePerformanceMetrics(currentTime);
        }
        
        this.animation = requestAnimationFrame(() => this.animate());
    }

    /**
     * Update animation state
     */
    update(deltaTime) {
        if (this.isPaused) return;
        
        this.animationFrame++;
        
        // Update point positions with slight random movement
        this.points.forEach(point => {
            // Add subtle floating motion
            point.vx += (Math.random() - 0.5) * 0.001;
            point.vy += (Math.random() - 0.5) * 0.001;
            
            // Apply velocity damping
            point.vx *= 0.998;
            point.vy *= 0.998;
            
            // Update position
            point.x += point.vx;
            point.y += point.vy;
            
            // Boundary checking with soft bounce
            const padding = 30;
            if (point.x < padding || point.x > this.dimensions.width - padding) {
                point.vx *= -0.8;
                point.x = Math.max(padding, Math.min(this.dimensions.width - padding, point.x));
            }
            if (point.y < padding || point.y > this.dimensions.height - padding) {
                point.vy *= -0.8;
                point.y = Math.max(padding, Math.min(this.dimensions.height - padding, point.y));
            }
            
            // Update trail
            point.trail.push({ x: point.x, y: point.y, alpha: 1 });
            if (point.trail.length > this.config.trailLength) {
                point.trail.shift();
            }
            
            // Fade trail
            point.trail.forEach((trailPoint, index) => {
                trailPoint.alpha = index / point.trail.length;
            });
        });
        
        // Run clustering periodically
        if (this.animationFrame % 120 === 0) { // Every 2 seconds at 60fps
            this.runClustering();
        }
    }

    /**
     * Run K-means clustering on current points
     */
    runClustering() {
        const data = this.points.map(p => [p.x, p.y]);
        
        try {
            const kmeans = new KMeans(this.config.clusterCount, {
                maxIterations: 50,
                tolerance: this.config.convergenceThreshold
            });
            
            const result = kmeans.fit(data);
            
            // Update point clusters
            this.points.forEach((point, index) => {
                point.previousCluster = point.cluster;
                point.cluster = result.labels[index];
            });
            
            // Update centroids
            this.centroids = result.centroids.map((centroid, index) => ({
                x: centroid[0],
                y: centroid[1],
                color: this.config.colors[index % this.config.colors.length],
                pulse: 0
            }));
            
            // Track performance metrics
            if (window.NCS?.performance) {
                window.NCS.performance.trackMetric('clustering_time', result.executionTime || 0);
                window.NCS.performance.trackMetric('clustering_iterations', result.iterations || 0);
            }
            
        } catch (error) {
            console.warn('⚠️ Clustering failed:', error);
        }
    }

    /**
     * Render the visualization
     */
    render() {
        const startTime = performance.now();
        
        this.renderer.clear();
        
        // Draw connection lines between points and centroids
        this.drawConnections();
        
        // Draw point trails
        this.drawTrails();
        
        // Draw data points
        this.drawPoints();
        
        // Draw centroids
        this.drawCentroids();
        
        // Draw performance overlay (in debug mode)
        if (window.NCS?.debug) {
            this.drawDebugOverlay();
        }
        
        this.performance.renderTime = performance.now() - startTime;
    }

    /**
     * Draw connection lines
     */
    drawConnections() {
        if (!this.centroids.length) return;
        
        this.renderer.setGlobalAlpha(0.1);
        
        this.points.forEach(point => {
            if (point.cluster >= 0 && this.centroids[point.cluster]) {
                const centroid = this.centroids[point.cluster];
                
                this.renderer.setStrokeStyle(centroid.color);
                this.renderer.setLineWidth(1);
                this.renderer.drawLine(point.x, point.y, centroid.x, centroid.y);
            }
        });
        
        this.renderer.setGlobalAlpha(1);
    }

    /**
     * Draw point trails
     */
    drawTrails() {
        this.points.forEach(point => {
            if (point.trail.length < 2) return;
            
            const color = point.cluster >= 0 ? 
                this.config.colors[point.cluster % this.config.colors.length] : 
                '#6b7280';
            
            for (let i = 1; i < point.trail.length; i++) {
                const prev = point.trail[i - 1];
                const curr = point.trail[i];
                
                this.renderer.setGlobalAlpha(curr.alpha * 0.3);
                this.renderer.setStrokeStyle(color);
                this.renderer.setLineWidth(1);
                this.renderer.drawLine(prev.x, prev.y, curr.x, curr.y);
            }
        });
        
        this.renderer.setGlobalAlpha(1);
    }

    /**
     * Draw data points
     */
    drawPoints() {
        this.points.forEach(point => {
            const color = point.cluster >= 0 ? 
                this.config.colors[point.cluster % this.config.colors.length] : 
                '#6b7280';
            
            // Point with glow effect
            this.renderer.setGlobalAlpha(0.3);
            this.renderer.setFillStyle(color);
            this.renderer.drawCircle(point.x, point.y, this.config.pointSize * 2);
            
            this.renderer.setGlobalAlpha(point.alpha);
            this.renderer.setFillStyle(color);
            this.renderer.drawCircle(point.x, point.y, this.config.pointSize);
        });
        
        this.renderer.setGlobalAlpha(1);
    }

    /**
     * Draw cluster centroids
     */
    drawCentroids() {
        this.centroids.forEach((centroid, index) => {
            // Animated pulse effect
            const pulse = Math.sin(this.animationFrame * 0.1 + index) * 0.5 + 0.5;
            const size = this.config.centroidSize + pulse * 3;
            
            // Outer glow
            this.renderer.setGlobalAlpha(0.4);
            this.renderer.setFillStyle(centroid.color);
            this.renderer.drawCircle(centroid.x, centroid.y, size * 1.5);
            
            // Inner core
            this.renderer.setGlobalAlpha(0.9);
            this.renderer.setFillStyle('#ffffff');
            this.renderer.drawCircle(centroid.x, centroid.y, size);
            
            // Center dot
            this.renderer.setGlobalAlpha(1);
            this.renderer.setFillStyle(centroid.color);
            this.renderer.drawCircle(centroid.x, centroid.y, size * 0.6);
        });
        
        this.renderer.setGlobalAlpha(1);
    }

    /**
     * Draw debug performance overlay
     */
    drawDebugOverlay() {
        const text = [
            `FPS: ${this.performance.fps}`,
            `Points: ${this.points.length}`,
            `Clusters: ${this.centroids.length}`,
            `Render: ${this.performance.renderTime.toFixed(1)}ms`
        ];
        
        this.renderer.setFillStyle('rgba(0, 0, 0, 0.7)');
        this.renderer.drawRect(10, 10, 150, 80);
        
        this.renderer.setFillStyle('#ffffff');
        this.renderer.setFont('12px monospace');
        
        text.forEach((line, index) => {
            this.renderer.drawText(line, 15, 30 + index * 15);
        });
    }

    /**
     * Handle control actions
     */
    handleControlAction(action) {
        switch (action) {
            case 'pause':
                this.togglePause();
                break;
            case 'reset':
                this.resetVisualization();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    /**
     * Toggle animation pause
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        const button = this.element.querySelector('[data-action="pause"]');
        if (button) {
            const icon = button.querySelector('svg');
            if (this.isPaused) {
                icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>'; // Play icon
            } else {
                icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'; // Pause icon
            }
        }
    }

    /**
     * Reset visualization with new data
     */
    resetVisualization() {
        this.generateInitialData();
        this.runClustering();
        
        // Add reset animation effect
        this.points.forEach(point => {
            point.alpha = 0;
        });
        
        // Fade in points
        const fadeIn = (timestamp, startTime) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / 1000, 1); // 1 second fade
            
            this.points.forEach(point => {
                point.alpha = progress * (0.8 + Math.random() * 0.2);
            });
            
            if (progress < 1) {
                requestAnimationFrame((ts) => fadeIn(ts, startTime));
            }
        };
        
        requestAnimationFrame(fadeIn);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.setupCanvas();
        
        // Rescale points to new dimensions
        const scaleX = this.dimensions.width / this.canvas.width;
        const scaleY = this.dimensions.height / this.canvas.height;
        
        this.points.forEach(point => {
            point.x *= scaleX;
            point.y *= scaleY;
            point.originalX *= scaleX;
            point.originalY *= scaleY;
        });
        
        this.centroids.forEach(centroid => {
            centroid.x *= scaleX;
            centroid.y *= scaleY;
        });
    }

    /**
     * Handle mouse enter
     */
    handleMouseEnter() {
        // Slow down animation for better observation
        this.config.animationSpeed = 0.5;
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        // Restore normal animation speed
        this.config.animationSpeed = 1;
    }

    /**
     * Handle canvas click
     */
    handleCanvasClick() {
        // Add some randomness to points
        this.points.forEach(point => {
            point.vx += (Math.random() - 0.5) * 2;
            point.vy += (Math.random() - 0.5) * 2;
        });
    }

    /**
     * Pause animation
     */
    pauseAnimation() {
        this.isPaused = true;
    }

    /**
     * Resume animation
     */
    resumeAnimation() {
        if (!this.isPlaying) return;
        this.isPaused = false;
        this.lastUpdate = performance.now();
    }

    /**
     * Stop animation completely
     */
    stopAnimation() {
        this.isPlaying = false;
        if (this.animation) {
            cancelAnimationFrame(this.animation);
        }
    }

    /**
     * Setup periodic reset
     */
    setupPeriodicReset() {
        setInterval(() => {
            if (this.isPlaying && !this.isPaused) {
                this.resetVisualization();
            }
        }, this.config.resetInterval);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(currentTime) {
        this.performance.frameCount++;
        
        if (currentTime - this.performance.lastFPSUpdate >= 1000) {
            this.performance.fps = Math.round(
                this.performance.frameCount * 1000 / (currentTime - this.performance.lastFPSUpdate)
            );
            this.performance.frameCount = 0;
            this.performance.lastFPSUpdate = currentTime;
        }
    }

    /**
     * Animate statistics counters
     */
    animateStatCounters() {
        const statValues = this.element.querySelectorAll('.stat-value[data-target]');
        
        statValues.forEach(stat => {
            const target = parseFloat(stat.dataset.target);
            let current = 0;
            const increment = target / 100; // 100 steps
            const duration = 2000; // 2 seconds
            const stepTime = duration / 100;
            
            const animate = () => {
                current += increment;
                if (current >= target) {
                    current = target;
                }
                
                // Format number appropriately
                if (target >= 1000) {
                    stat.textContent = Math.floor(current).toLocaleString() + '+';
                } else if (target < 100) {
                    stat.textContent = current.toFixed(1);
                } else {
                    stat.textContent = Math.floor(current);
                }
                
                if (current < target) {
                    setTimeout(animate, stepTime);
                }
            };
            
            // Start animation after a delay
            setTimeout(animate, 1000);
        });
    }

    /**
     * Show fallback content if WebGL/Canvas fails
     */
    showFallback() {
        const fallback = document.createElement('div');
        fallback.className = 'hero-viz-fallback';
        fallback.innerHTML = `
            <div class="fallback-content">
                <div class="fallback-icon">📊</div>
                <h3>Clustering Visualization</h3>
                <p>Real-time clustering demonstration</p>
                <button class="btn btn-primary" onclick="location.href='/playground.html'">
                    Try Interactive Playground
                </button>
            </div>
        `;
        
        this.canvas.parentElement.appendChild(fallback);
        this.canvas.style.display = 'none';
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
     * Destroy component and cleanup
     */
    destroy() {
        this.stopAnimation();
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.pauseAnimation);
        
        if (this.renderer) {
            this.renderer.destroy();
        }
    }
}