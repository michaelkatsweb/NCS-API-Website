/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise) Algorithm
 * High-performance implementation with automatic parameter estimation and visualization support
 * Ideal for discovering clusters of arbitrary shapes and handling noise/outliers
 */

import { EventBus } from '../core/eventBusNew.js';
import { calculateDistance, normalizeData } from '../utils/math.js';

export class DBSCANAlgorithm {
    constructor(options = {}) {
        // Core DBSCAN parameters
        this.eps = options.eps || null; // Will be auto-calculated if null
        this.minPts = options.minPts || null; // Will be auto-calculated if null
        this.distanceMetric = options.distanceMetric || 'euclidean';
        this.weightedFeatures = options.weightedFeatures || null;
        
        // Auto-parameter estimation options
        this.autoEstimateParams = options.autoEstimateParams !== false;
        this.knnK = options.knnK || 4; // K for k-NN distance plot
        this.epsQuantile = options.epsQuantile || 0.9; // Quantile for eps estimation
        
        // Performance optimizations
        this.useKDTree = options.useKDTree !== false; // Use spatial indexing when available
        this.batchSize = options.batchSize || 1000; // For processing large datasets
        this.enableParallelProcessing = options.enableParallelProcessing || false;
        
        // Advanced features
        this.enableBorderPointClassification = options.enableBorderPointClassification !== false;
        this.enableNoiseAnalysis = options.enableNoiseAnalysis !== false;
        this.enableHierarchicalAnalysis = options.enableHierarchicalAnalysis || false;
        
        // State variables
        this.clusters = [];
        this.labels = []; // -1 for noise, 0+ for cluster IDs
        this.corePoints = new Set();
        this.borderPoints = new Set();
        this.noisePoints = new Set();
        this.neighborhoodCache = new Map();
        this.features = [];
        this.processedData = [];
        
        // Statistics and metrics
        this.stats = {
            totalPoints: 0,
            numClusters: 0,
            numNoise: 0,
            numCore: 0,
            numBorder: 0,
            silhouetteScore: 0,
            dbIndex: 0
        };
        
        // Execution tracking
        this.isRunning = false;
        this.currentStep = '';
        this.progress = 0;
    }

    /**
     * Main clustering method
     * @param {Array} data - Input data points
     * @param {Object} options - Clustering options
     * @returns {Promise<Object>} Clustering results
     */
    async cluster(data, options = {}) {
        try {
            this.isRunning = true;
            const startTime = performance.now();
            
            // Merge options
            Object.assign(this, options);
            
            // Reset state
            this.resetState();
            
            // Validate and preprocess data
            await this.preprocessData(data);
            
            // Auto-estimate parameters if needed
            if (this.autoEstimateParams) {
                await this.estimateParameters();
            }
            
            // Validate parameters
            this.validateParameters();
            
            // Run DBSCAN algorithm
            const result = await this.runDBSCAN();
            
            // Post-process and analyze results
            await this.postProcessResults();
            
            // Calculate quality metrics
            await this.calculateQualityMetrics();
            
            const endTime = performance.now();
            result.executionTime = Math.round(endTime - startTime);
            result.algorithm = 'DBSCAN';
            result.parameters = this.getAlgorithmParameters();
            result.stats = this.stats;
            
            this.isRunning = false;
            
            EventBus.emit('dbscan:clustering_complete', {
                result,
                stats: this.stats,
                parameters: result.parameters
            });
            
            return result;
            
        } catch (error) {
            this.isRunning = false;
            EventBus.emit('dbscan:clustering_error', { error: error.message });
            throw error;
        }
    }

    /**
     * Reset algorithm state
     */
    resetState() {
        this.clusters = [];
        this.labels = [];
        this.corePoints.clear();
        this.borderPoints.clear();
        this.noisePoints.clear();
        this.neighborhoodCache.clear();
        this.processedData = [];
        this.progress = 0;
        this.currentStep = 'initializing';
    }

    /**
     * Preprocess input data
     * @param {Array} data - Raw input data
     */
    async preprocessData(data) {
        this.currentStep = 'preprocessing';
        this.progress = 10;
        
        EventBus.emit('dbscan:progress', { 
            step: this.currentStep, 
            progress: this.progress 
        });

        // Validate input
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Input data must be a non-empty array');
        }

        // Extract numeric features
        const firstPoint = data[0];
        if (typeof firstPoint !== 'object' || firstPoint === null) {
            throw new Error('Data points must be objects');
        }

        this.features = Object.keys(firstPoint).filter(key => {
            return typeof firstPoint[key] === 'number' && !isNaN(firstPoint[key]);
        });

        if (this.features.length === 0) {
            throw new Error('No numeric features found in data');
        }

        // Validate all points have required features
        for (let i = 0; i < data.length; i++) {
            const point = data[i];
            for (const feature of this.features) {
                if (typeof point[feature] !== 'number' || isNaN(point[feature])) {
                    throw new Error(`Invalid or missing numeric value for feature '${feature}' at index ${i}`);
                }
            }
        }

        // Extract and normalize feature vectors
        this.processedData = data.map((point, index) => ({
            id: index,
            originalData: point,
            features: this.features.map(feature => point[feature]),
            clusterId: -1, // -1 indicates unprocessed
            visited: false,
            isCore: false,
            isBorder: false,
            isNoise: false
        }));

        // Normalize features if not disabled
        if (options.normalize !== false) {
            this.normalizeFeatures();
        }

        this.stats.totalPoints = this.processedData.length;
        this.progress = 20;
    }

    /**
     * Normalize feature vectors
     */
    normalizeFeatures() {
        const featureCount = this.features.length;
        
        // Calculate feature statistics
        const stats = this.features.map(feature => {
            const values = this.processedData.map(point => point.features[this.features.indexOf(feature)]);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            return { min, max, mean, stdDev, range: max - min };
        });

        // Apply Z-score normalization
        this.processedData.forEach(point => {
            point.features = point.features.map((value, index) => {
                const stat = stats[index];
                if (stat.stdDev === 0) return 0; // Handle constant features
                return (value - stat.mean) / stat.stdDev;
            });
        });

        this.featureStats = stats;
    }

    /**
     * Estimate optimal DBSCAN parameters
     */
    async estimateParameters() {
        this.currentStep = 'parameter_estimation';
        this.progress = 30;
        
        EventBus.emit('dbscan:progress', { 
            step: this.currentStep, 
            progress: this.progress 
        });

        // Estimate minPts if not provided
        if (this.minPts === null) {
            this.minPts = Math.max(2, Math.min(this.features.length * 2, Math.floor(Math.log2(this.processedData.length))));
        }

        // Estimate eps using k-NN distance plot approach
        if (this.eps === null) {
            this.eps = await this.estimateEpsParameter();
        }

        EventBus.emit('dbscan:parameters_estimated', {
            eps: this.eps,
            minPts: this.minPts,
            method: 'k_nearest_neighbors'
        });
    }

    /**
     * Estimate eps parameter using k-NN distance plot
     * @returns {Promise<Number>} Estimated eps value
     */
    async estimateEpsParameter() {
        const k = this.minPts; // Use minPts as k
        const sampleSize = Math.min(1000, this.processedData.length); // Sample for performance
        const sampleData = this.processedData.slice(0, sampleSize);
        
        // Calculate k-NN distances for each sample point
        const kDistances = [];
        
        for (let i = 0; i < sampleData.length; i++) {
            const point = sampleData[i];
            const distances = [];
            
            // Calculate distances to all other points
            for (let j = 0; j < sampleData.length; j++) {
                if (i !== j) {
                    const distance = this.calculateDistance(point.features, sampleData[j].features);
                    distances.push(distance);
                }
            }
            
            // Sort and get k-th nearest distance
            distances.sort((a, b) => a - b);
            if (distances.length >= k) {
                kDistances.push(distances[k - 1]);
            }
        }
        
        // Sort k-distances in descending order
        kDistances.sort((a, b) => b - a);
        
        // Find elbow point using derivative approach
        const elbowIndex = this.findElbowPoint(kDistances);
        
        // Use the distance at elbow point or quantile as eps
        const epsCandidate1 = kDistances[elbowIndex] || kDistances[Math.floor(kDistances.length * 0.1)];
        const epsCandidate2 = this.calculateQuantile(kDistances, this.epsQuantile);
        
        // Return the more conservative estimate
        return Math.min(epsCandidate1, epsCandidate2);
    }

    /**
     * Find elbow point in k-distance plot
     * @param {Array} distances - Sorted k-distances
     * @returns {Number} Index of elbow point
     */
    findElbowPoint(distances) {
        if (distances.length < 3) return 0;
        
        // Calculate second derivative to find maximum curvature
        const secondDerivatives = [];
        
        for (let i = 1; i < distances.length - 1; i++) {
            const d2 = distances[i - 1] - 2 * distances[i] + distances[i + 1];
            secondDerivatives.push(Math.abs(d2));
        }
        
        // Find index of maximum second derivative
        const maxDerivativeIndex = secondDerivatives.indexOf(Math.max(...secondDerivatives));
        return maxDerivativeIndex + 1; // Adjust for offset
    }

    /**
     * Calculate quantile value
     * @param {Array} values - Array of values
     * @param {Number} quantile - Quantile (0-1)
     * @returns {Number} Quantile value
     */
    calculateQuantile(values, quantile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * quantile);
        return sorted[Math.min(index, sorted.length - 1)];
    }

    /**
     * Validate algorithm parameters
     */
    validateParameters() {
        if (this.eps <= 0) {
            throw new Error('eps parameter must be positive');
        }
        
        if (this.minPts < 1) {
            throw new Error('minPts parameter must be at least 1');
        }
        
        if (this.minPts >= this.processedData.length) {
            throw new Error('minPts parameter cannot exceed data size');
        }
    }

    /**
     * Run the DBSCAN clustering algorithm
     * @returns {Promise<Object>} Clustering results
     */
    async runDBSCAN() {
        this.currentStep = 'clustering';
        this.progress = 40;
        
        let clusterId = 0;
        const totalPoints = this.processedData.length;
        let processedCount = 0;

        // Process each point
        for (let i = 0; i < totalPoints; i++) {
            const point = this.processedData[i];
            
            if (point.visited) {
                continue;
            }
            
            point.visited = true;
            processedCount++;
            
            // Find neighbors within eps
            const neighbors = await this.findNeighbors(point);
            
            // Check if point is core point
            if (neighbors.length >= this.minPts) {
                point.isCore = true;
                this.corePoints.add(point.id);
                
                // Start new cluster
                await this.expandCluster(point, neighbors, clusterId);
                clusterId++;
            } else {
                // Mark as noise (temporarily)
                point.clusterId = -1;
                point.isNoise = true;
            }
            
            // Update progress
            this.progress = 40 + Math.floor((processedCount / totalPoints) * 40);
            
            if (processedCount % 100 === 0) {
                EventBus.emit('dbscan:progress', { 
                    step: this.currentStep, 
                    progress: this.progress,
                    processed: processedCount,
                    total: totalPoints
                });
                
                // Allow UI updates
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Classify border points and finalize noise points
        await this.classifyBorderAndNoisePoints();
        
        // Build cluster arrays
        this.buildClusters();
        
        this.stats.numClusters = clusterId;
        this.stats.numCore = this.corePoints.size;
        this.stats.numBorder = this.borderPoints.size;
        this.stats.numNoise = this.noisePoints.size;

        return {
            clusters: this.clusters,
            labels: this.labels,
            corePoints: Array.from(this.corePoints),
            borderPoints: Array.from(this.borderPoints),
            noisePoints: Array.from(this.noisePoints),
            numClusters: this.stats.numClusters
        };
    }

    /**
     * Find neighbors within eps distance
     * @param {Object} point - Query point
     * @returns {Promise<Array>} Array of neighbor points
     */
    async findNeighbors(point) {
        // Check cache first
        const cacheKey = point.id;
        if (this.neighborhoodCache.has(cacheKey)) {
            return this.neighborhoodCache.get(cacheKey);
        }

        const neighbors = [];
        
        // Linear search (could be optimized with spatial indexing)
        for (const otherPoint of this.processedData) {
            if (point.id !== otherPoint.id) {
                const distance = this.calculateDistance(point.features, otherPoint.features);
                if (distance <= this.eps) {
                    neighbors.push(otherPoint);
                }
            }
        }

        // Cache result
        this.neighborhoodCache.set(cacheKey, neighbors);
        return neighbors;
    }

    /**
     * Expand cluster from core point
     * @param {Object} corePoint - Core point to expand from
     * @param {Array} neighbors - Initial neighbors
     * @param {Number} clusterId - Cluster ID
     */
    async expandCluster(corePoint, neighbors, clusterId) {
        // Assign core point to cluster
        corePoint.clusterId = clusterId;
        
        // Process all neighbors
        const queue = [...neighbors];
        const processed = new Set([corePoint.id]);
        
        while (queue.length > 0) {
            const neighbor = queue.shift();
            
            if (processed.has(neighbor.id)) {
                continue;
            }
            processed.add(neighbor.id);
            
            // Assign to cluster if not already assigned
            if (neighbor.clusterId === -1) {
                neighbor.clusterId = clusterId;
                neighbor.isNoise = false;
            }
            
            // If neighbor is not visited, check if it's a core point
            if (!neighbor.visited) {
                neighbor.visited = true;
                const neighborNeighbors = await this.findNeighbors(neighbor);
                
                if (neighborNeighbors.length >= this.minPts) {
                    neighbor.isCore = true;
                    this.corePoints.add(neighbor.id);
                    
                    // Add new neighbors to queue
                    for (const newNeighbor of neighborNeighbors) {
                        if (!processed.has(newNeighbor.id)) {
                            queue.push(newNeighbor);
                        }
                    }
                }
            }
        }
    }

    /**
     * Classify border points and finalize noise points
     */
    async classifyBorderAndNoisePoints() {
        for (const point of this.processedData) {
            if (!point.isCore && point.clusterId >= 0) {
                // This is a border point
                point.isBorder = true;
                this.borderPoints.add(point.id);
            } else if (point.clusterId === -1) {
                // This is noise
                point.isNoise = true;
                this.noisePoints.add(point.id);
            }
        }
    }

    /**
     * Build final cluster arrays
     */
    buildClusters() {
        this.clusters = [];
        this.labels = new Array(this.processedData.length).fill(-1);
        
        // Group points by cluster ID
        const clusterMap = new Map();
        
        this.processedData.forEach((point, index) => {
            this.labels[index] = point.clusterId;
            
            if (point.clusterId >= 0) {
                if (!clusterMap.has(point.clusterId)) {
                    clusterMap.set(point.clusterId, []);
                }
                
                clusterMap.get(point.clusterId).push({
                    ...point.originalData,
                    _originalIndex: index,
                    _clusterId: point.clusterId,
                    _pointType: point.isCore ? 'core' : point.isBorder ? 'border' : 'noise'
                });
            }
        });
        
        // Convert to array format
        const maxClusterId = Math.max(...this.labels.filter(label => label >= 0));
        for (let i = 0; i <= maxClusterId; i++) {
            this.clusters[i] = clusterMap.get(i) || [];
        }
    }

    /**
     * Post-process clustering results
     */
    async postProcessResults() {
        this.currentStep = 'post_processing';
        this.progress = 85;
        
        EventBus.emit('dbscan:progress', { 
            step: this.currentStep, 
            progress: this.progress 
        });

        // Remove empty clusters
        this.clusters = this.clusters.filter(cluster => cluster && cluster.length > 0);
        
        // Update cluster statistics
        this.stats.numClusters = this.clusters.length;
        
        // Analyze cluster properties
        this.analyzeClusterProperties();
        
        // Hierarchical analysis if enabled
        if (this.enableHierarchicalAnalysis) {
            await this.performHierarchicalAnalysis();
        }
    }

    /**
     * Analyze properties of discovered clusters
     */
    analyzeClusterProperties() {
        this.clusterProperties = this.clusters.map((cluster, index) => {
            const points = cluster.map(point => {
                const originalIndex = point._originalIndex;
                return this.processedData[originalIndex].features;
            });
            
            // Calculate cluster statistics
            const size = cluster.length;
            const centroid = this.calculateCentroid(points);
            const density = this.calculateClusterDensity(points);
            const radius = this.calculateClusterRadius(points, centroid);
            
            return {
                id: index,
                size,
                centroid,
                density,
                radius,
                compactness: density / (radius || 1)
            };
        });
    }

    /**
     * Calculate cluster centroid
     * @param {Array} points - Array of feature vectors
     * @returns {Array} Centroid coordinates
     */
    calculateCentroid(points) {
        if (points.length === 0) return [];
        
        const dimensions = points[0].length;
        const centroid = new Array(dimensions).fill(0);
        
        points.forEach(point => {
            point.forEach((value, index) => {
                centroid[index] += value;
            });
        });
        
        return centroid.map(sum => sum / points.length);
    }

    /**
     * Calculate cluster density
     * @param {Array} points - Array of feature vectors
     * @returns {Number} Density measure
     */
    calculateClusterDensity(points) {
        if (points.length <= 1) return 0;
        
        let totalDistance = 0;
        let pairCount = 0;
        
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                totalDistance += this.calculateDistance(points[i], points[j]);
                pairCount++;
            }
        }
        
        const avgDistance = totalDistance / pairCount;
        return 1 / (avgDistance || 1); // Inverse of average distance
    }

    /**
     * Calculate cluster radius
     * @param {Array} points - Array of feature vectors
     * @param {Array} centroid - Cluster centroid
     * @returns {Number} Maximum distance from centroid
     */
    calculateClusterRadius(points, centroid) {
        if (points.length === 0) return 0;
        
        let maxDistance = 0;
        points.forEach(point => {
            const distance = this.calculateDistance(point, centroid);
            maxDistance = Math.max(maxDistance, distance);
        });
        
        return maxDistance;
    }

    /**
     * Calculate quality metrics
     */
    async calculateQualityMetrics() {
        this.currentStep = 'quality_metrics';
        this.progress = 95;
        
        EventBus.emit('dbscan:progress', { 
            step: this.currentStep, 
            progress: this.progress 
        });

        // Only calculate metrics if we have clusters
        if (this.stats.numClusters > 0) {
            // Silhouette coefficient
            this.stats.silhouetteScore = await this.calculateSilhouetteScore();
            
            // Davies-Bouldin index
            this.stats.dbIndex = this.calculateDaviesBouldinIndex();
            
            // Calinski-Harabasz index
            this.stats.calinskiHarabaszIndex = this.calculateCalinskiHarabaszIndex();
        }
    }

    /**
     * Calculate silhouette score
     * @returns {Promise<Number>} Average silhouette score
     */
    async calculateSilhouetteScore() {
        if (this.stats.numClusters <= 1) return 0;
        
        const silhouetteScores = [];
        const sampleSize = Math.min(500, this.processedData.length); // Sample for performance
        
        for (let i = 0; i < sampleSize; i++) {
            const point = this.processedData[i];
            if (point.clusterId === -1) continue; // Skip noise points
            
            const score = await this.calculatePointSilhouette(point);
            silhouetteScores.push(score);
        }
        
        return silhouetteScores.length > 0 ? 
            silhouetteScores.reduce((sum, score) => sum + score, 0) / silhouetteScores.length : 0;
    }

    /**
     * Calculate silhouette score for a single point
     * @param {Object} point - Data point
     * @returns {Promise<Number>} Silhouette score
     */
    async calculatePointSilhouette(point) {
        // Calculate average distance to points in same cluster (a)
        const sameClusterPoints = this.processedData.filter(p => 
            p.clusterId === point.clusterId && p.id !== point.id
        );
        
        let a = 0;
        if (sameClusterPoints.length > 0) {
            const distances = sameClusterPoints.map(p => 
                this.calculateDistance(point.features, p.features)
            );
            a = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
        }
        
        // Calculate minimum average distance to points in other clusters (b)
        let b = Infinity;
        const otherClusterIds = [...new Set(this.processedData
            .filter(p => p.clusterId >= 0 && p.clusterId !== point.clusterId)
            .map(p => p.clusterId)
        )];
        
        for (const clusterId of otherClusterIds) {
            const clusterPoints = this.processedData.filter(p => p.clusterId === clusterId);
            const distances = clusterPoints.map(p => 
                this.calculateDistance(point.features, p.features)
            );
            const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
            b = Math.min(b, avgDistance);
        }
        
        // Calculate silhouette score
        if (b === Infinity) return 0;
        return (b - a) / Math.max(a, b);
    }

    /**
     * Calculate Davies-Bouldin index
     * @returns {Number} Davies-Bouldin index
     */
    calculateDaviesBouldinIndex() {
        if (this.stats.numClusters <= 1) return 0;
        
        const clusterCentroids = this.clusterProperties.map(prop => prop.centroid);
        const clusterScatters = this.clusterProperties.map(prop => prop.radius);
        
        let dbSum = 0;
        
        for (let i = 0; i < this.stats.numClusters; i++) {
            let maxRatio = 0;
            
            for (let j = 0; j < this.stats.numClusters; j++) {
                if (i !== j) {
                    const centroidDistance = this.calculateDistance(
                        clusterCentroids[i], clusterCentroids[j]
                    );
                    const ratio = (clusterScatters[i] + clusterScatters[j]) / centroidDistance;
                    maxRatio = Math.max(maxRatio, ratio);
                }
            }
            
            dbSum += maxRatio;
        }
        
        return dbSum / this.stats.numClusters;
    }

    /**
     * Calculate Calinski-Harabasz index
     * @returns {Number} Calinski-Harabasz index
     */
    calculateCalinskiHarabaszIndex() {
        if (this.stats.numClusters <= 1) return 0;
        
        // Calculate overall centroid
        const allPoints = this.processedData.map(p => p.features);
        const overallCentroid = this.calculateCentroid(allPoints);
        
        // Calculate between-cluster variance
        let betweenVariance = 0;
        this.clusterProperties.forEach(prop => {
            const distance = this.calculateDistance(prop.centroid, overallCentroid);
            betweenVariance += prop.size * distance * distance;
        });
        
        // Calculate within-cluster variance
        let withinVariance = 0;
        this.clusters.forEach((cluster, index) => {
            const centroid = this.clusterProperties[index].centroid;
            cluster.forEach(point => {
                const originalIndex = point._originalIndex;
                const features = this.processedData[originalIndex].features;
                const distance = this.calculateDistance(features, centroid);
                withinVariance += distance * distance;
            });
        });
        
        const n = this.processedData.length;
        const k = this.stats.numClusters;
        
        return (betweenVariance / (k - 1)) / (withinVariance / (n - k));
    }

    /**
     * Calculate distance between two feature vectors
     * @param {Array} vector1 - First vector
     * @param {Array} vector2 - Second vector
     * @returns {Number} Distance
     */
    calculateDistance(vector1, vector2) {
        return calculateDistance(vector1, vector2, this.distanceMetric, this.weightedFeatures);
    }

    /**
     * Get algorithm parameters
     * @returns {Object} Current parameters
     */
    getAlgorithmParameters() {
        return {
            eps: this.eps,
            minPts: this.minPts,
            distanceMetric: this.distanceMetric,
            autoEstimateParams: this.autoEstimateParams,
            knnK: this.knnK,
            epsQuantile: this.epsQuantile,
            enableBorderPointClassification: this.enableBorderPointClassification,
            enableNoiseAnalysis: this.enableNoiseAnalysis
        };
    }

    /**
     * Predict cluster for new data points
     * @param {Array} newData - New data points
     * @returns {Array} Predicted cluster assignments
     */
    predict(newData) {
        if (this.clusters.length === 0) {
            throw new Error('Model must be trained before prediction');
        }
        
        return newData.map(point => {
            const features = this.features.map(feature => point[feature]);
            
            // Normalize features using same statistics as training data
            if (this.featureStats) {
                features.forEach((value, index) => {
                    const stat = this.featureStats[index];
                    if (stat.stdDev > 0) {
                        features[index] = (value - stat.mean) / stat.stdDev;
                    }
                });
            }
            
            // Find closest cluster
            let minDistance = Infinity;
            let closestCluster = -1;
            
            this.clusterProperties.forEach((prop, index) => {
                const distance = this.calculateDistance(features, prop.centroid);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = index;
                }
            });
            
            // Check if point is within eps of closest cluster
            return minDistance <= this.eps ? closestCluster : -1;
        });
    }

    /**
     * Save model state
     * @returns {Object} Model state
     */
    save() {
        return {
            algorithm: 'DBSCAN',
            version: '1.0',
            parameters: this.getAlgorithmParameters(),
            features: this.features,
            featureStats: this.featureStats,
            clusterProperties: this.clusterProperties,
            stats: this.stats,
            timestamp: Date.now()
        };
    }

    /**
     * Load model state
     * @param {Object} modelState - Saved model state
     */
    load(modelState) {
        if (modelState.algorithm !== 'DBSCAN') {
            throw new Error('Invalid model format');
        }
        
        Object.assign(this, modelState.parameters);
        this.features = modelState.features;
        this.featureStats = modelState.featureStats;
        this.clusterProperties = modelState.clusterProperties || [];
        this.stats = modelState.stats || {};
    }

    /**
     * Get cluster summary
     * @returns {Object} Cluster summary information
     */
    getClusterSummary() {
        return {
            algorithm: 'DBSCAN',
            parameters: {
                eps: this.eps,
                minPts: this.minPts
            },
            results: {
                numClusters: this.stats.numClusters,
                numPoints: this.stats.totalPoints,
                numNoise: this.stats.numNoise,
                noisePercentage: Math.round((this.stats.numNoise / this.stats.totalPoints) * 100),
                numCore: this.stats.numCore,
                numBorder: this.stats.numBorder
            },
            quality: {
                silhouetteScore: Math.round(this.stats.silhouetteScore * 1000) / 1000,
                daviesBouldinIndex: Math.round(this.stats.dbIndex * 1000) / 1000,
                calinskiHarabaszIndex: Math.round(this.stats.calinskiHarabaszIndex * 1000) / 1000
            }
        };
    }
}

// Export for use
export default DBSCANAlgorithm;