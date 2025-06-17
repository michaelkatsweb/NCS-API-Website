/**
 * ClusterVisualizer Component - Core clustering visualization engine
 * NCS-API Website
 * 
 * Features:
 * - Real-time clustering visualization
 * - Multiple algorithm support (K-means, DBSCAN, Hierarchical)
 * - Interactive parameter controls
 * - Canvas and WebGL rendering
 * - Data upload and processing
 * - Animation and transitions
 * - Export capabilities
 */

import { CanvasRenderer } from '../visualizations/renderers/CanvasRenderer.js';
import { KMeans } from '../clustering/KMeans.js';
import { ColorPalette } from '../utils/colors.js';
import { MathUtils } from '../utils/math.js';
import { CONFIG } from '../config/constants.js';

export class ClusterVisualizer {
    constructor(container, options = {}) {
        this.container = container;
        this.canvas = null;
        this.renderer = null;
        
        // Configuration
        this.config = {
            width: 800,
            height: 600,
            pointSize: 4,
            centroidSize: 8,
            animationSpeed: 1,
            showConnections: false,
            showCentroids: true,
            showTrails: false,
            algorithm: 'kmeans',
            clusterCount: 3,
            maxIterations: 100,
            convergenceThreshold: 0.001,
            ...options
        };
        
        // Data state
        this.data = {
            points: [],
            clusters: [],
            centroids: [],
            original: [],
            normalized: []
        };
        
        // Animation state
        this.animation = {
            isRunning: false,
            isPaused: false,
            currentIteration: 0,
            maxIterations: 0,
            progress: 0,
            frameId: null,
            startTime: 0,
            lastFrameTime: 0,
            fps: 60,
            frameCount: 0
        };
        
        // Clustering state
        this.clustering = {
            algorithm: null,
            isConverged: false,
            iterations: 0,
            inertia: 0,
            silhouetteScore: 0,
            history: []
        };
        
        // UI state
        this.ui = {
            isDragging: false,
            lastMousePos: { x: 0, y: 0 },
            zoom: 1,
            pan: { x: 0, y: 0 },
            selection: null,
            hoveredPoint: null,
            showTooltip: false
        };
        
        // Performance tracking
        this.performance = {
            renderTime: 0,
            lastRenderTime: 0,
            avgRenderTime: 0,
            frameDrops: 0,
            memoryUsage: 0
        };
        
        // Event callbacks
        this.callbacks = {
            onDataLoad: null,
            onClusteringStart: null,
            onClusteringUpdate: null,
            onClusteringComplete: null,
            onError: null
        };
        
        this.init();
    }

    /**
     * Initialize the visualizer
     */
    async init() {
        try {
            console.log('🎨 Initializing ClusterVisualizer...');
            
            this.setupCanvas();
            this.setupRenderer();
            this.setupEventListeners();
            this.setupColorPalette();
            this.setupDefaultData();
            
            // Initial render
            this.render();
            
            console.log('✅ ClusterVisualizer initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ClusterVisualizer:', error);
            this.handleError(error);
        }
    }

    /**
     * Set up the canvas element
     */
    setupCanvas() {
        // Create canvas if it doesn't exist
        this.canvas = this.container.querySelector('canvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'cluster-canvas';
            this.container.appendChild(this.canvas);
        }
        
        // Set canvas size
        this.updateCanvasSize();
        
        // Set canvas attributes for accessibility
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', 'Interactive clustering visualization');
        this.canvas.setAttribute('tabindex', '0');
    }

    /**
     * Set up the renderer
     */
    setupRenderer() {
        this.renderer = new CanvasRenderer(this.canvas, {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false
        });
        
        // Set initial view
        this.renderer.setViewport(0, 0, this.config.width, this.config.height);
        this.renderer.clear();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Keyboard events
        this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    /**
     * Set up color palette
     */
    setupColorPalette() {
        this.colorPalette = new ColorPalette();
        this.colors = this.colorPalette.getClusterColors(this.config.clusterCount);
    }

    /**
     * Set up default demonstration data
     */
    setupDefaultData() {
        // Generate sample data for demonstration
        this.generateSampleData(200);
    }

    /**
     * Generate sample clustering data
     */
    generateSampleData(pointCount = 200) {
        const points = [];
        const clusterCenters = [
            { x: 0.3, y: 0.3 },
            { x: 0.7, y: 0.3 },
            { x: 0.5, y: 0.7 }
        ];
        
        // Generate points around cluster centers
        for (let i = 0; i < pointCount; i++) {
            const centerIndex = Math.floor(Math.random() * clusterCenters.length);
            const center = clusterCenters[centerIndex];
            
            // Add noise around center
            const noise = 0.15;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * noise;
            
            const point = {
                x: center.x + Math.cos(angle) * radius,
                y: center.y + Math.sin(angle) * radius,
                id: i,
                cluster: -1,
                originalCluster: centerIndex
            };
            
            // Clamp to canvas bounds
            point.x = Math.max(0.05, Math.min(0.95, point.x));
            point.y = Math.max(0.05, Math.min(0.95, point.y));
            
            points.push(point);
        }
        
        this.setData(points);
    }

    /**
     * Set clustering data
     */
    setData(points) {
        this.data.points = points.map(p => ({...p}));
        this.data.original = points.map(p => ({...p}));
        this.data.normalized = this.normalizeData(points);
        
        // Reset clustering state
        this.resetClustering();
        
        // Update colors if cluster count changed
        this.updateColors();
        
        // Trigger callback
        if (this.callbacks.onDataLoad) {
            this.callbacks.onDataLoad(this.data.points);
        }
        
        // Re-render
        this.render();
        
        console.log(`📊 Data loaded: ${points.length} points`);
    }

    /**
     * Normalize data to [0,1] range
     */
    normalizeData(points) {
        if (points.length === 0) return [];
        
        const xValues = points.map(p => p.x);
        const yValues = points.map(p => p.y);
        
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;
        
        return points.map(point => ({
            ...point,
            x: (point.x - xMin) / xRange,
            y: (point.y - yMin) / yRange
        }));
    }

    /**
     * Update color palette based on cluster count
     */
    updateColors() {
        this.colors = this.colorPalette.getClusterColors(this.config.clusterCount);
    }

    /**
     * Start clustering animation
     */
    startClustering(algorithm = 'kmeans', options = {}) {
        if (this.animation.isRunning) {
            this.stopClustering();
        }
        
        this.config.algorithm = algorithm;
        this.config = { ...this.config, ...options };
        
        // Initialize clustering algorithm
        switch (algorithm) {
            case 'kmeans':
                this.clustering.algorithm = new KMeans({
                    k: this.config.clusterCount,
                    maxIterations: this.config.maxIterations,
                    tolerance: this.config.convergenceThreshold
                });
                break;
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        
        // Reset state
        this.resetClustering();
        
        // Start animation
        this.animation.isRunning = true;
        this.animation.startTime = performance.now();
        
        // Trigger callback
        if (this.callbacks.onClusteringStart) {
            this.callbacks.onClusteringStart(algorithm, options);
        }
        
        // Start animation loop
        this.animate();
        
        console.log(`🚀 Starting ${algorithm} clustering with ${this.config.clusterCount} clusters`);
    }

    /**
     * Stop clustering animation
     */
    stopClustering() {
        this.animation.isRunning = false;
        this.animation.isPaused = false;
        
        if (this.animation.frameId) {
            cancelAnimationFrame(this.animation.frameId);
            this.animation.frameId = null;
        }
        
        console.log('⏹️ Clustering stopped');
    }

    /**
     * Pause/resume clustering animation
     */
    pauseClustering() {
        if (this.animation.isRunning) {
            this.animation.isPaused = !this.animation.isPaused;
            
            if (!this.animation.isPaused) {
                this.animate();
            }
            
            console.log(`⏸️ Clustering ${this.animation.isPaused ? 'paused' : 'resumed'}`);
        }
    }

    /**
     * Reset clustering state
     */
    resetClustering() {
        this.clustering.isConverged = false;
        this.clustering.iterations = 0;
        this.clustering.inertia = 0;
        this.clustering.silhouetteScore = 0;
        this.clustering.history = [];
        
        this.animation.currentIteration = 0;
        this.animation.progress = 0;
        
        // Reset point clusters
        this.data.points.forEach(point => {
            point.cluster = -1;
        });
        
        this.data.clusters = [];
        this.data.centroids = [];
    }

    /**
     * Main animation loop
     */
    animate() {
        if (!this.animation.isRunning || this.animation.isPaused) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.animation.lastFrameTime;
        
        // Update FPS
        this.updateFPS(deltaTime);
        
        // Perform clustering step
        if (!this.clustering.isConverged && this.clustering.iterations < this.config.maxIterations) {
            this.performClusteringStep();
        } else {
            // Clustering complete
            this.completeClustering();
            return;
        }
        
        // Render frame
        this.render();
        
        // Update animation state
        this.animation.lastFrameTime = currentTime;
        this.animation.progress = this.clustering.iterations / this.config.maxIterations;
        
        // Continue animation
        this.animation.frameId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Perform one step of clustering
     */
    performClusteringStep() {
        const startTime = performance.now();
        
        try {
            // Perform clustering step
            const result = this.clustering.algorithm.step(this.data.normalized);
            
            if (result) {
                // Update data with clustering results
                this.updateClusteringResults(result);
                
                // Save iteration to history
                this.clustering.history.push({
                    iteration: this.clustering.iterations,
                    centroids: result.centroids.map(c => ({...c})),
                    inertia: result.inertia || 0,
                    converged: result.converged || false
                });
                
                // Update convergence state
                this.clustering.isConverged = result.converged || false;
                this.clustering.iterations++;
                this.clustering.inertia = result.inertia || 0;
                
                // Trigger update callback
                if (this.callbacks.onClusteringUpdate) {
                    this.callbacks.onClusteringUpdate(result, this.clustering);
                }
            }
            
        } catch (error) {
            console.error('❌ Clustering step failed:', error);
            this.handleError(error);
            this.stopClustering();
        }
        
        // Track performance
        this.performance.lastRenderTime = performance.now() - startTime;
    }

    /**
     * Update clustering results
     */
    updateClusteringResults(result) {
        // Update point assignments
        if (result.assignments) {
            this.data.points.forEach((point, index) => {
                point.cluster = result.assignments[index];
            });
        }
        
        // Update centroids
        if (result.centroids) {
            this.data.centroids = result.centroids.map((centroid, index) => ({
                x: centroid.x,
                y: centroid.y,
                cluster: index,
                color: this.colors[index % this.colors.length]
            }));
        }
        
        // Group points by cluster
        this.data.clusters = [];
        for (let i = 0; i < this.config.clusterCount; i++) {
            this.data.clusters[i] = this.data.points.filter(point => point.cluster === i);
        }
    }

    /**
     * Complete clustering process
     */
    completeClustering() {
        this.animation.isRunning = false;
        this.animation.progress = 1;
        
        // Calculate final metrics
        this.calculateMetrics();
        
        // Trigger completion callback
        if (this.callbacks.onClusteringComplete) {
            this.callbacks.onClusteringComplete(this.clustering);
        }
        
        // Final render
        this.render();
        
        console.log(`✅ Clustering completed in ${this.clustering.iterations} iterations`);
        console.log(`📊 Final inertia: ${this.clustering.inertia.toFixed(4)}`);
        console.log(`📊 Silhouette score: ${this.clustering.silhouetteScore.toFixed(4)}`);
    }

    /**
     * Calculate clustering quality metrics
     */
    calculateMetrics() {
        if (this.data.points.length === 0 || this.data.centroids.length === 0) return;
        
        // Calculate silhouette score
        this.clustering.silhouetteScore = this.calculateSilhouetteScore();
        
        // Calculate within-cluster sum of squares (inertia)
        let inertia = 0;
        this.data.points.forEach(point => {
            if (point.cluster >= 0 && point.cluster < this.data.centroids.length) {
                const centroid = this.data.centroids[point.cluster];
                const distance = MathUtils.euclideanDistance(point, centroid);
                inertia += distance * distance;
            }
        });
        
        this.clustering.inertia = inertia;
    }

    /**
     * Calculate silhouette score
     */
    calculateSilhouetteScore() {
        const points = this.data.points;
        if (points.length < 2) return 0;
        
        let totalScore = 0;
        let validPoints = 0;
        
        points.forEach(point => {
            if (point.cluster < 0) return;
            
            // Calculate average distance to points in same cluster (a)
            const sameCluster = points.filter(p => p.cluster === point.cluster && p !== point);
            let a = 0;
            if (sameCluster.length > 0) {
                a = sameCluster.reduce((sum, p) => sum + MathUtils.euclideanDistance(point, p), 0) / sameCluster.length;
            }
            
            // Calculate minimum average distance to points in other clusters (b)
            let b = Infinity;
            for (let cluster = 0; cluster < this.config.clusterCount; cluster++) {
                if (cluster === point.cluster) continue;
                
                const otherCluster = points.filter(p => p.cluster === cluster);
                if (otherCluster.length > 0) {
                    const avgDistance = otherCluster.reduce((sum, p) => sum + MathUtils.euclideanDistance(point, p), 0) / otherCluster.length;
                    b = Math.min(b, avgDistance);
                }
            }
            
            // Calculate silhouette score for this point
            if (b !== Infinity && Math.max(a, b) > 0) {
                const score = (b - a) / Math.max(a, b);
                totalScore += score;
                validPoints++;
            }
        });
        
        return validPoints > 0 ? totalScore / validPoints : 0;
    }

    /**
     * Main render method
     */
    render() {
        const startTime = performance.now();
        
        try {
            // Clear canvas
            this.renderer.clear();
            
            // Apply zoom and pan transformations
            this.renderer.save();
            this.applyTransformations();
            
            // Render connections (if enabled)
            if (this.config.showConnections) {
                this.renderConnections();
            }
            
            // Render data points
            this.renderPoints();
            
            // Render centroids (if enabled)
            if (this.config.showCentroids) {
                this.renderCentroids();
            }
            
            // Render selection and hover effects
            this.renderInteractions();
            
            // Restore transformations
            this.renderer.restore();
            
            // Render UI overlays
            this.renderOverlays();
            
        } catch (error) {
            console.error('❌ Render error:', error);
            this.handleError(error);
        }
        
        // Track performance
        this.performance.renderTime = performance.now() - startTime;
        this.updateRenderPerformance();
    }

    /**
     * Apply zoom and pan transformations
     */
    applyTransformations() {
        const centerX = this.config.width / 2;
        const centerY = this.config.height / 2;
        
        this.renderer.translate(centerX + this.ui.pan.x, centerY + this.ui.pan.y);
        this.renderer.scale(this.ui.zoom, this.ui.zoom);
        this.renderer.translate(-centerX, -centerY);
    }

    /**
     * Render data points
     */
    renderPoints() {
        this.data.points.forEach((point, index) => {
            const x = point.x * this.config.width;
            const y = point.y * this.config.height;
            
            // Determine point color
            let color = '#999999'; // Default unassigned color
            if (point.cluster >= 0 && point.cluster < this.colors.length) {
                color = this.colors[point.cluster];
            }
            
            // Highlight hovered point
            if (this.ui.hoveredPoint === index) {
                this.renderer.setFillStyle(color);
                this.renderer.fillCircle(x, y, this.config.pointSize + 2);
                this.renderer.setStrokeStyle('#ffffff');
                this.renderer.setLineWidth(2);
                this.renderer.strokeCircle(x, y, this.config.pointSize + 2);
            } else {
                this.renderer.setFillStyle(color);
                this.renderer.fillCircle(x, y, this.config.pointSize);
            }
        });
    }

    /**
     * Render cluster centroids
     */
    renderCentroids() {
        this.data.centroids.forEach(centroid => {
            const x = centroid.x * this.config.width;
            const y = centroid.y * this.config.height;
            
            // Draw centroid as larger circle with border
            this.renderer.setFillStyle(centroid.color || '#000000');
            this.renderer.fillCircle(x, y, this.config.centroidSize);
            
            this.renderer.setStrokeStyle('#ffffff');
            this.renderer.setLineWidth(3);
            this.renderer.strokeCircle(x, y, this.config.centroidSize);
            
            // Add inner dot
            this.renderer.setFillStyle('#ffffff');
            this.renderer.fillCircle(x, y, 2);
        });
    }

    /**
     * Render connections between points and centroids
     */
    renderConnections() {
        this.data.points.forEach(point => {
            if (point.cluster >= 0 && point.cluster < this.data.centroids.length) {
                const centroid = this.data.centroids[point.cluster];
                
                const x1 = point.x * this.config.width;
                const y1 = point.y * this.config.height;
                const x2 = centroid.x * this.config.width;
                const y2 = centroid.y * this.config.height;
                
                this.renderer.setStrokeStyle(this.colors[point.cluster] + '40'); // Semi-transparent
                this.renderer.setLineWidth(1);
                this.renderer.drawLine(x1, y1, x2, y2);
            }
        });
    }

    /**
     * Render interaction feedback
     */
    renderInteractions() {
        // Render selection rectangle
        if (this.ui.selection) {
            const { start, end } = this.ui.selection;
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            
            this.renderer.setStrokeStyle('#6366f1');
            this.renderer.setLineWidth(2);
            this.renderer.strokeRect(x, y, width, height);
            
            this.renderer.setFillStyle('#6366f120');
            this.renderer.drawRect(x, y, width, height);
        }
    }

    /**
     * Render UI overlays
     */
    renderOverlays() {
        // Render progress indicator during clustering
        if (this.animation.isRunning) {
            this.renderProgressIndicator();
        }
        
        // Render metrics
        this.renderMetrics();
        
        // Render tooltip
        if (this.ui.showTooltip && this.ui.hoveredPoint !== null) {
            this.renderTooltip();
        }
    }

    /**
     * Render clustering progress indicator
     */
    renderProgressIndicator() {
        const width = 200;
        const height = 6;
        const x = (this.config.width - width) / 2;
        const y = 20;
        
        // Background
        this.renderer.setFillStyle('#e5e7eb');
        this.renderer.drawRect(x, y, width, height);
        
        // Progress
        this.renderer.setFillStyle('#6366f1');
        this.renderer.drawRect(x, y, width * this.animation.progress, height);
        
        // Text
        const text = `Iteration ${this.clustering.iterations}/${this.config.maxIterations}`;
        this.renderer.setFillStyle('#374151');
        this.renderer.setFont('14px Inter');
        this.renderer.setTextAlign('center');
        this.renderer.fillText(text, this.config.width / 2, y - 5);
    }

    /**
     * Render clustering metrics
     */
    renderMetrics() {
        if (!this.clustering.algorithm) return;
        
        const metrics = [
            `Algorithm: ${this.config.algorithm.toUpperCase()}`,
            `Clusters: ${this.config.clusterCount}`,
            `Points: ${this.data.points.length}`,
            `Iterations: ${this.clustering.iterations}`,
            `Inertia: ${this.clustering.inertia.toFixed(4)}`,
            `Silhouette: ${this.clustering.silhouetteScore.toFixed(4)}`,
            `FPS: ${this.animation.fps}`
        ];
        
        const x = 10;
        let y = this.config.height - (metrics.length * 20) - 10;
        
        // Background
        this.renderer.setFillStyle('rgba(0, 0, 0, 0.7)');
        this.renderer.drawRect(x - 5, y - 15, 200, metrics.length * 20 + 10);
        
        // Text
        this.renderer.setFillStyle('#ffffff');
        this.renderer.setFont('12px monospace');
        this.renderer.setTextAlign('left');
        
        metrics.forEach(metric => {
            this.renderer.fillText(metric, x, y);
            y += 20;
        });
    }

    /**
     * Render tooltip for hovered point
     */
    renderTooltip() {
        if (this.ui.hoveredPoint === null) return;
        
        const point = this.data.points[this.ui.hoveredPoint];
        if (!point) return;
        
        const mouseX = this.ui.lastMousePos.x;
        const mouseY = this.ui.lastMousePos.y;
        
        const tooltip = [
            `Point ID: ${point.id}`,
            `Position: (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`,
            `Cluster: ${point.cluster >= 0 ? point.cluster : 'Unassigned'}`
        ];
        
        const padding = 8;
        const lineHeight = 16;
        const maxWidth = Math.max(...tooltip.map(t => this.renderer.measureText(t).width));
        const tooltipWidth = maxWidth + padding * 2;
        const tooltipHeight = tooltip.length * lineHeight + padding * 2;
        
        // Position tooltip to avoid canvas edges
        let tooltipX = mouseX + 10;
        let tooltipY = mouseY - tooltipHeight - 10;
        
        if (tooltipX + tooltipWidth > this.config.width) {
            tooltipX = mouseX - tooltipWidth - 10;
        }
        if (tooltipY < 0) {
            tooltipY = mouseY + 10;
        }
        
        // Background
        this.renderer.setFillStyle('rgba(0, 0, 0, 0.9)');
        this.renderer.drawRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        // Border
        this.renderer.setStrokeStyle('#6366f1');
        this.renderer.setLineWidth(1);
        this.renderer.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        // Text
        this.renderer.setFillStyle('#ffffff');
        this.renderer.setFont('12px Inter');
        this.renderer.setTextAlign('left');
        
        tooltip.forEach((text, index) => {
            this.renderer.fillText(
                text,
                tooltipX + padding,
                tooltipY + padding + (index + 1) * lineHeight
            );
        });
    }

    /**
     * Update FPS calculation
     */
    updateFPS(deltaTime) {
        this.animation.frameCount++;
        
        if (deltaTime >= 1000) {
            this.animation.fps = Math.round((this.animation.frameCount * 1000) / deltaTime);
            this.animation.frameCount = 0;
            this.animation.lastFrameTime = performance.now();
        }
    }

    /**
     * Update render performance metrics
     */
    updateRenderPerformance() {
        // Moving average of render time
        const alpha = 0.1;
        this.performance.avgRenderTime = 
            alpha * this.performance.renderTime + 
            (1 - alpha) * this.performance.avgRenderTime;
        
        // Track frame drops
        if (this.performance.renderTime > 16.67) { // > 60fps
            this.performance.frameDrops++;
        }
        
        // Memory usage (approximate)
        if (performance.memory) {
            this.performance.memoryUsage = performance.memory.usedJSHeapSize;
        }
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.ui.isDragging = true;
        this.ui.lastMousePos = { x, y };
        
        // Check if clicking on a point
        const clickedPoint = this.getPointAtPosition(x, y);
        if (clickedPoint !== null) {
            // Point clicked - could implement selection
            console.log('Point clicked:', this.data.points[clickedPoint]);
        } else {
            // Start selection rectangle
            this.ui.selection = {
                start: { x, y },
                end: { x, y }
            };
        }
        
        event.preventDefault();
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.ui.lastMousePos = { x, y };
        
        if (this.ui.isDragging) {
            if (this.ui.selection) {
                // Update selection rectangle
                this.ui.selection.end = { x, y };
                this.render();
            } else {
                // Pan the view
                const deltaX = x - this.ui.lastMousePos.x;
                const deltaY = y - this.ui.lastMousePos.y;
                
                this.ui.pan.x += deltaX;
                this.ui.pan.y += deltaY;
                
                this.render();
            }
        } else {
            // Update hover state
            const hoveredPoint = this.getPointAtPosition(x, y);
            if (hoveredPoint !== this.ui.hoveredPoint) {
                this.ui.hoveredPoint = hoveredPoint;
                this.ui.showTooltip = hoveredPoint !== null;
                this.render();
            }
        }
        
        this.ui.lastMousePos = { x, y };
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        this.ui.isDragging = false;
        
        if (this.ui.selection) {
            // Complete selection
            const selectedPoints = this.getPointsInSelection(this.ui.selection);
            if (selectedPoints.length > 0) {
                console.log('Selected points:', selectedPoints);
            }
            this.ui.selection = null;
            this.render();
        }
    }

    /**
     * Handle wheel event for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.ui.zoom * zoomFactor));
        
        // Zoom towards mouse position
        const zoomRatio = newZoom / this.ui.zoom;
        this.ui.pan.x = mouseX - (mouseX - this.ui.pan.x) * zoomRatio;
        this.ui.pan.y = mouseY - (mouseY - this.ui.pan.y) * zoomRatio;
        
        this.ui.zoom = newZoom;
        this.render();
    }

    /**
     * Handle touch events for mobile support
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handleMouseUp({});
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Escape':
                this.ui.selection = null;
                this.ui.hoveredPoint = null;
                this.ui.showTooltip = false;
                this.render();
                break;
            case ' ':
                event.preventDefault();
                if (this.animation.isRunning) {
                    this.pauseClustering();
                }
                break;
            case 'r':
            case 'R':
                this.resetView();
                break;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.updateCanvasSize();
        this.render();
    }

    /**
     * Handle visibility change for performance optimization
     */
    handleVisibilityChange() {
        if (document.hidden && this.animation.isRunning) {
            this.pauseClustering();
        }
    }

    /**
     * Update canvas size
     */
    updateCanvasSize() {
        const containerRect = this.container.getBoundingClientRect();
        
        // Set actual canvas size
        this.config.width = Math.floor(containerRect.width);
        this.config.height = Math.floor(containerRect.height);
        
        // Update canvas element
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        
        // Update CSS size for high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.width = this.config.width + 'px';
        this.canvas.style.height = this.config.height + 'px';
        
        // Scale canvas for high-DPI
        if (dpr !== 1) {
            this.canvas.width = this.config.width * dpr;
            this.canvas.height = this.config.height * dpr;
            
            const ctx = this.canvas.getContext('2d');
            ctx.scale(dpr, dpr);
        }
        
        // Update renderer
        if (this.renderer) {
            this.renderer.setViewport(0, 0, this.config.width, this.config.height);
        }
    }

    /**
     * Get point at screen position
     */
    getPointAtPosition(screenX, screenY) {
        const threshold = this.config.pointSize + 5;
        
        for (let i = 0; i < this.data.points.length; i++) {
            const point = this.data.points[i];
            const x = point.x * this.config.width;
            const y = point.y * this.config.height;
            
            // Apply transformations
            const transformedX = (x - this.config.width / 2) * this.ui.zoom + this.config.width / 2 + this.ui.pan.x;
            const transformedY = (y - this.config.height / 2) * this.ui.zoom + this.config.height / 2 + this.ui.pan.y;
            
            const distance = Math.sqrt(
                Math.pow(screenX - transformedX, 2) + 
                Math.pow(screenY - transformedY, 2)
            );
            
            if (distance <= threshold) {
                return i;
            }
        }
        
        return null;
    }

    /**
     * Get points within selection rectangle
     */
    getPointsInSelection(selection) {
        const { start, end } = selection;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        return this.data.points.filter((point, index) => {
            const x = point.x * this.config.width;
            const y = point.y * this.config.height;
            
            // Apply transformations
            const transformedX = (x - this.config.width / 2) * this.ui.zoom + this.config.width / 2 + this.ui.pan.x;
            const transformedY = (y - this.config.height / 2) * this.ui.zoom + this.config.height / 2 + this.ui.pan.y;
            
            return transformedX >= minX && transformedX <= maxX &&
                   transformedY >= minY && transformedY <= maxY;
        });
    }

    /**
     * Reset view to default
     */
    resetView() {
        this.ui.zoom = 1;
        this.ui.pan = { x: 0, y: 0 };
        this.render();
    }

    /**
     * Export current visualization
     */
    exportImage(format = 'png', quality = 0.9) {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary canvas for export
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = this.config.width;
                exportCanvas.height = this.config.height;
                
                const exportRenderer = new CanvasRenderer(exportCanvas);
                
                // Render current state to export canvas
                this.renderToCanvas(exportRenderer);
                
                // Convert to data URL
                const dataURL = exportCanvas.toDataURL(`image/${format}`, quality);
                resolve(dataURL);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Render to specific canvas
     */
    renderToCanvas(renderer) {
        // Similar to render() but uses provided renderer
        renderer.clear();
        
        // Render points
        this.data.points.forEach(point => {
            const x = point.x * this.config.width;
            const y = point.y * this.config.height;
            
            let color = '#999999';
            if (point.cluster >= 0 && point.cluster < this.colors.length) {
                color = this.colors[point.cluster];
            }
            
            renderer.setFillStyle(color);
            renderer.fillCircle(x, y, this.config.pointSize);
        });
        
        // Render centroids
        if (this.config.showCentroids) {
            this.data.centroids.forEach(centroid => {
                const x = centroid.x * this.config.width;
                const y = centroid.y * this.config.height;
                
                renderer.setFillStyle(centroid.color || '#000000');
                renderer.fillCircle(x, y, this.config.centroidSize);
                
                renderer.setStrokeStyle('#ffffff');
                renderer.setLineWidth(3);
                renderer.strokeCircle(x, y, this.config.centroidSize);
                
                renderer.setFillStyle('#ffffff');
                renderer.fillCircle(x, y, 2);
            });
        }
    }

    /**
     * Set event callback
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase()}${event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = callback;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update dependent systems
        if (newConfig.clusterCount !== undefined) {
            this.updateColors();
        }
        
        // Re-render
        this.render();
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get current data
     */
    getData() {
        return {
            points: [...this.data.points],
            clusters: [...this.data.clusters],
            centroids: [...this.data.centroids]
        };
    }

    /**
     * Get clustering statistics
     */
    getStats() {
        return {
            clustering: { ...this.clustering },
            animation: { ...this.animation },
            performance: { ...this.performance }
        };
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('ClusterVisualizer error:', error);
        
        // Stop any running animations
        this.stopClustering();
        
        // Trigger error callback
        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
        
        // Display error in UI
        if (this.renderer) {
            this.renderer.clear();
            this.renderer.setFillStyle('#ef4444');
            this.renderer.setFont('16px Inter');
            this.renderer.setTextAlign('center');
            this.renderer.fillText(
                'Visualization Error',
                this.config.width / 2,
                this.config.height / 2 - 10
            );
            this.renderer.setFont('12px Inter');
            this.renderer.setFillStyle('#7f1d1d');
            this.renderer.fillText(
                error.message,
                this.config.width / 2,
                this.config.height / 2 + 15
            );
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        console.log('🧹 Cleaning up ClusterVisualizer...');
        
        // Stop animations
        this.stopClustering();
        
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.canvas.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        window.removeEventListener('resize', this.handleResize.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Clear data
        this.data.points = [];
        this.data.clusters = [];
        this.data.centroids = [];
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

export default ClusterVisualizer;