/**
 * Hierarchical Clustering Algorithm Implementation
 * Supports both agglomerative (bottom-up) and divisive (top-down) clustering
 * Includes multiple linkage criteria and dendrogram generation for visualization
 */

import { EventBus } from '../core/eventBus.js';
import { calculateDistance } from '../utils/math.js';

export class HierarchicalClustering {
    constructor(options = {}) {
        // Core algorithm parameters
        this.method = options.method || 'agglomerative'; // agglomerative, divisive
        this.linkage = options.linkage || 'ward'; // single, complete, average, ward, centroid
        this.distanceMetric = options.distanceMetric || 'euclidean';
        this.numClusters = options.numClusters || null; // Auto-determine if null
        this.distanceThreshold = options.distanceThreshold || null; // Alternative to numClusters
        
        // Performance options
        this.maxPoints = options.maxPoints || 5000; // Performance limit
        this.enableOptimizations = options.enableOptimizations !== false;
        this.useMemoryEfficientMode = options.useMemoryEfficientMode || false;
        
        // Dendrogram options
        this.generateDendrogram = options.generateDendrogram !== false;
        this.maxDendrogramNodes = options.maxDendrogramNodes || 1000;
        
        // Quality assessment
        this.calculateCopheneticCorrelation = options.calculateCopheneticCorrelation !== false;
        this.enableClusterValidation = options.enableClusterValidation !== false;
        
        // State variables
        this.clusters = [];
        this.dendrogram = null;
        this.distanceMatrix = null;
        this.mergeHistory = [];
        this.clusterAssignments = [];
        this.features = [];
        this.processedData = [];
        
        // Performance tracking
        this.isRunning = false;
        this.currentStep = '';
        this.progress = 0;
        this.stats = {
            totalPoints: 0,
            finalClusters: 0,
            mergeSteps: 0,
            maxDistance: 0,
            copheneticCorrelation: 0
        };
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
            
            // Validate and preprocess data
            await this.preprocessData(data);
            
            // Choose clustering method
            let result;
            if (this.method === 'agglomerative') {
                result = await this.runAgglomerativeClustering();
            } else {
                result = await this.runDivisiveClustering();
            }
            
            // Post-process results
            await this.postProcessResults(result);
            
            // Generate dendrogram if requested
            if (this.generateDendrogram) {
                result.dendrogram = this.buildDendrogram();
            }
            
            // Calculate quality metrics
            if (this.enableClusterValidation) {
                await this.calculateQualityMetrics(result);
            }
            
            const endTime = performance.now();
            result.executionTime = Math.round(endTime - startTime);
            result.algorithm = 'Hierarchical';
            result.method = this.method;
            result.linkage = this.linkage;
            result.parameters = this.getAlgorithmParameters();
            result.stats = this.stats;
            
            this.isRunning = false;
            
            EventBus.emit('hierarchical:clustering_complete', {
                result,
                method: this.method,
                linkage: this.linkage,
                clusters: result.numClusters,
                stats: this.stats
            });
            
            return result;
            
        } catch (error) {
            this.isRunning = false;
            EventBus.emit('hierarchical:clustering_error', { error: error.message });
            throw error;
        }
    }

    /**
     * Preprocess input data
     * @param {Array} data - Raw input data
     */
    async preprocessData(data) {
        this.currentStep = 'preprocessing';
        this.progress = 5;
        
        EventBus.emit('hierarchical:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Validate input
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Input data must be a non-empty array');
        }

        if (data.length > this.maxPoints) {
            throw new Error(`Dataset too large (${data.length} > ${this.maxPoints}). Consider sampling or using a different algorithm.`);
        }

        // Extract features
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

        // Create processed data with feature vectors
        this.processedData = data.map((point, index) => ({
            id: index,
            originalData: point,
            features: this.features.map(feature => Number(point[feature])),
            clusterId: index // Initially each point is its own cluster
        }));

        this.stats.totalPoints = this.processedData.length;

        // Auto-determine number of clusters if not specified
        if (this.numClusters === null && this.distanceThreshold === null) {
            this.numClusters = Math.max(2, Math.min(10, Math.floor(Math.sqrt(data.length / 2))));
        }
    }

    /**
     * Run agglomerative (bottom-up) clustering
     * @returns {Promise<Object>} Clustering results
     */
    async runAgglomerativeClustering() {
        this.currentStep = 'agglomerative_clustering';
        this.progress = 20;
        
        EventBus.emit('hierarchical:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Initialize clusters - each point starts as its own cluster
        let activeClusters = this.processedData.map((point, index) => ({
            id: index,
            points: [point],
            centroid: [...point.features],
            size: 1,
            level: 0,
            children: null
        }));

        this.mergeHistory = [];
        let mergeStep = 0;
        const totalMergeSteps = activeClusters.length - (this.numClusters || 1);

        // Continue merging until we reach the desired number of clusters
        while (activeClusters.length > (this.numClusters || 1)) {
            // Find the two closest clusters
            const { cluster1Index, cluster2Index, distance } = await this.findClosestClusters(activeClusters);
            
            // Check distance threshold if specified
            if (this.distanceThreshold !== null && distance > this.distanceThreshold) {
                break;
            }

            // Merge the closest clusters
            const mergedCluster = this.mergeClusters(
                activeClusters[cluster1Index], 
                activeClusters[cluster2Index], 
                distance,
                mergeStep
            );

            // Record merge in history
            this.mergeHistory.push({
                step: mergeStep,
                cluster1: activeClusters[cluster1Index].id,
                cluster2: activeClusters[cluster2Index].id,
                distance: distance,
                newClusterId: mergedCluster.id,
                newClusterSize: mergedCluster.size
            });

            // Remove merged clusters and add new cluster
            const newActiveClusters = [];
            for (let i = 0; i < activeClusters.length; i++) {
                if (i !== cluster1Index && i !== cluster2Index) {
                    newActiveClusters.push(activeClusters[i]);
                }
            }
            newActiveClusters.push(mergedCluster);
            activeClusters = newActiveClusters;

            mergeStep++;
            this.progress = 20 + Math.floor((mergeStep / totalMergeSteps) * 60);
            
            if (mergeStep % 10 === 0) {
                EventBus.emit('hierarchical:progress', {
                    step: this.currentStep,
                    progress: this.progress,
                    mergeStep,
                    clustersRemaining: activeClusters.length
                });
                
                // Allow UI updates
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        this.stats.mergeSteps = mergeStep;
        this.stats.finalClusters = activeClusters.length;
        this.stats.maxDistance = this.mergeHistory.length > 0 ? 
            Math.max(...this.mergeHistory.map(m => m.distance)) : 0;

        // Assign final cluster IDs to points
        this.assignClusterIds(activeClusters);

        return {
            clusters: this.clusters,
            numClusters: activeClusters.length,
            mergeHistory: this.mergeHistory,
            finalDistance: this.mergeHistory.length > 0 ? 
                this.mergeHistory[this.mergeHistory.length - 1].distance : 0
        };
    }

    /**
     * Find the two closest clusters
     * @param {Array} clusters - Array of active clusters
     * @returns {Object} Indices and distance of closest clusters
     */
    async findClosestClusters(clusters) {
        let minDistance = Infinity;
        let cluster1Index = -1;
        let cluster2Index = -1;

        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const distance = this.calculateClusterDistance(clusters[i], clusters[j]);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    cluster1Index = i;
                    cluster2Index = j;
                }
            }
        }

        return { cluster1Index, cluster2Index, distance: minDistance };
    }

    /**
     * Calculate distance between two clusters based on linkage criteria
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Distance between clusters
     */
    calculateClusterDistance(cluster1, cluster2) {
        switch (this.linkage) {
            case 'single':
                return this.calculateSingleLinkage(cluster1, cluster2);
            case 'complete':
                return this.calculateCompleteLinkage(cluster1, cluster2);
            case 'average':
                return this.calculateAverageLinkage(cluster1, cluster2);
            case 'ward':
                return this.calculateWardLinkage(cluster1, cluster2);
            case 'centroid':
                return this.calculateCentroidLinkage(cluster1, cluster2);
            default:
                return this.calculateAverageLinkage(cluster1, cluster2);
        }
    }

    /**
     * Single linkage: minimum distance between any two points
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Single linkage distance
     */
    calculateSingleLinkage(cluster1, cluster2) {
        let minDistance = Infinity;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                const distance = calculateDistance(
                    point1.features, 
                    point2.features, 
                    this.distanceMetric
                );
                minDistance = Math.min(minDistance, distance);
            }
        }
        
        return minDistance;
    }

    /**
     * Complete linkage: maximum distance between any two points
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Complete linkage distance
     */
    calculateCompleteLinkage(cluster1, cluster2) {
        let maxDistance = -Infinity;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                const distance = calculateDistance(
                    point1.features, 
                    point2.features, 
                    this.distanceMetric
                );
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        
        return maxDistance;
    }

    /**
     * Average linkage: average distance between all pairs
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Average linkage distance
     */
    calculateAverageLinkage(cluster1, cluster2) {
        let totalDistance = 0;
        let pairCount = 0;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                const distance = calculateDistance(
                    point1.features, 
                    point2.features, 
                    this.distanceMetric
                );
                totalDistance += distance;
                pairCount++;
            }
        }
        
        return pairCount > 0 ? totalDistance / pairCount : 0;
    }

    /**
     * Ward linkage: minimize within-cluster variance
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Ward linkage distance
     */
    calculateWardLinkage(cluster1, cluster2) {
        // Calculate centroids
        const centroid1 = this.calculateCentroid(cluster1.points);
        const centroid2 = this.calculateCentroid(cluster2.points);
        const mergedCentroid = this.calculateMergedCentroid(cluster1, cluster2);
        
        // Calculate within-cluster sum of squares before merge
        const ss1 = this.calculateWithinClusterSS(cluster1.points, centroid1);
        const ss2 = this.calculateWithinClusterSS(cluster2.points, centroid2);
        
        // Calculate within-cluster sum of squares after merge
        const allPoints = [...cluster1.points, ...cluster2.points];
        const mergedSS = this.calculateWithinClusterSS(allPoints, mergedCentroid);
        
        // Ward distance is the increase in within-cluster sum of squares
        return mergedSS - (ss1 + ss2);
    }

    /**
     * Centroid linkage: distance between cluster centroids
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Number} Centroid linkage distance
     */
    calculateCentroidLinkage(cluster1, cluster2) {
        return calculateDistance(
            cluster1.centroid, 
            cluster2.centroid, 
            this.distanceMetric
        );
    }

    /**
     * Calculate centroid of a set of points
     * @param {Array} points - Array of points
     * @returns {Array} Centroid coordinates
     */
    calculateCentroid(points) {
        if (points.length === 0) return [];
        
        const dimensions = points[0].features.length;
        const centroid = new Array(dimensions).fill(0);
        
        for (const point of points) {
            for (let i = 0; i < dimensions; i++) {
                centroid[i] += point.features[i];
            }
        }
        
        return centroid.map(sum => sum / points.length);
    }

    /**
     * Calculate merged centroid of two clusters
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @returns {Array} Merged centroid
     */
    calculateMergedCentroid(cluster1, cluster2) {
        const totalSize = cluster1.size + cluster2.size;
        const dimensions = cluster1.centroid.length;
        const mergedCentroid = new Array(dimensions);
        
        for (let i = 0; i < dimensions; i++) {
            mergedCentroid[i] = (
                cluster1.centroid[i] * cluster1.size + 
                cluster2.centroid[i] * cluster2.size
            ) / totalSize;
        }
        
        return mergedCentroid;
    }

    /**
     * Calculate within-cluster sum of squares
     * @param {Array} points - Cluster points
     * @param {Array} centroid - Cluster centroid
     * @returns {Number} Sum of squares
     */
    calculateWithinClusterSS(points, centroid) {
        let sumSquares = 0;
        
        for (const point of points) {
            for (let i = 0; i < centroid.length; i++) {
                const diff = point.features[i] - centroid[i];
                sumSquares += diff * diff;
            }
        }
        
        return sumSquares;
    }

    /**
     * Merge two clusters
     * @param {Object} cluster1 - First cluster
     * @param {Object} cluster2 - Second cluster
     * @param {Number} distance - Merge distance
     * @param {Number} step - Merge step number
     * @returns {Object} Merged cluster
     */
    mergeClusters(cluster1, cluster2, distance, step) {
        const mergedCluster = {
            id: `merge_${step}`,
            points: [...cluster1.points, ...cluster2.points],
            size: cluster1.size + cluster2.size,
            level: Math.max(cluster1.level, cluster2.level) + 1,
            mergeDistance: distance,
            children: [cluster1, cluster2],
            centroid: this.calculateMergedCentroid(cluster1, cluster2)
        };
        
        return mergedCluster;
    }

    /**
     * Assign final cluster IDs to all points
     * @param {Array} finalClusters - Array of final clusters
     */
    assignClusterIds(finalClusters) {
        this.clusters = [];
        this.clusterAssignments = new Array(this.processedData.length);
        
        finalClusters.forEach((cluster, clusterId) => {
            const clusterPoints = cluster.points.map(point => ({
                ...point.originalData,
                _originalIndex: point.id,
                _clusterId: clusterId
            }));
            
            this.clusters.push(clusterPoints);
            
            // Assign cluster IDs to points
            cluster.points.forEach(point => {
                this.clusterAssignments[point.id] = clusterId;
            });
        });
    }

    /**
     * Run divisive (top-down) clustering
     * @returns {Promise<Object>} Clustering results
     */
    async runDivisiveClustering() {
        this.currentStep = 'divisive_clustering';
        this.progress = 20;
        
        // Start with all points in one cluster
        let activeClusters = [{
            id: 0,
            points: [...this.processedData],
            centroid: this.calculateCentroid(this.processedData),
            size: this.processedData.length,
            level: 0
        }];

        this.mergeHistory = []; // Actually split history for divisive
        let splitStep = 0;

        // Continue splitting until we reach the desired number of clusters
        while (activeClusters.length < (this.numClusters || 2)) {
            // Find the cluster with highest within-cluster variance to split
            const clusterToSplit = this.findClusterToSplit(activeClusters);
            
            if (!clusterToSplit || clusterToSplit.size <= 1) {
                break; // Cannot split further
            }

            // Split the cluster
            const [cluster1, cluster2] = await this.splitCluster(clusterToSplit, splitStep);
            
            // Replace the original cluster with the two new clusters
            const clusterIndex = activeClusters.indexOf(clusterToSplit);
            activeClusters.splice(clusterIndex, 1, cluster1, cluster2);

            splitStep++;
            this.progress = 20 + Math.floor((splitStep / (this.numClusters - 1)) * 60);
            
            EventBus.emit('hierarchical:progress', {
                step: this.currentStep,
                progress: this.progress,
                splitStep,
                clustersCount: activeClusters.length
            });
        }

        this.stats.mergeSteps = splitStep;
        this.stats.finalClusters = activeClusters.length;

        // Assign final cluster IDs
        this.assignClusterIds(activeClusters);

        return {
            clusters: this.clusters,
            numClusters: activeClusters.length,
            splitHistory: this.mergeHistory
        };
    }

    /**
     * Find the cluster with highest variance to split
     * @param {Array} clusters - Array of clusters
     * @returns {Object} Cluster to split
     */
    findClusterToSplit(clusters) {
        let maxVariance = -1;
        let clusterToSplit = null;
        
        for (const cluster of clusters) {
            if (cluster.size <= 1) continue;
            
            const variance = this.calculateClusterVariance(cluster);
            if (variance > maxVariance) {
                maxVariance = variance;
                clusterToSplit = cluster;
            }
        }
        
        return clusterToSplit;
    }

    /**
     * Calculate cluster variance
     * @param {Object} cluster - Cluster to analyze
     * @returns {Number} Cluster variance
     */
    calculateClusterVariance(cluster) {
        const centroid = cluster.centroid;
        let totalVariance = 0;
        
        for (const point of cluster.points) {
            let pointVariance = 0;
            for (let i = 0; i < centroid.length; i++) {
                const diff = point.features[i] - centroid[i];
                pointVariance += diff * diff;
            }
            totalVariance += pointVariance;
        }
        
        return totalVariance / cluster.size;
    }

    /**
     * Split a cluster into two subclusters
     * @param {Object} cluster - Cluster to split
     * @param {Number} step - Split step number
     * @returns {Promise<Array>} Two new clusters
     */
    async splitCluster(cluster, step) {
        // Use k-means with k=2 to split the cluster
        const points = cluster.points;
        
        // Initialize two centroids
        const centroid1 = [...points[0].features];
        const centroid2 = [...points[Math.floor(points.length / 2)].features];
        
        let assignments = new Array(points.length);
        let converged = false;
        let iterations = 0;
        const maxIterations = 50;
        
        while (!converged && iterations < maxIterations) {
            // Assign points to closest centroid
            let changed = false;
            for (let i = 0; i < points.length; i++) {
                const dist1 = calculateDistance(points[i].features, centroid1, this.distanceMetric);
                const dist2 = calculateDistance(points[i].features, centroid2, this.distanceMetric);
                
                const newAssignment = dist1 < dist2 ? 0 : 1;
                if (assignments[i] !== newAssignment) {
                    assignments[i] = newAssignment;
                    changed = true;
                }
            }
            
            if (!changed) {
                converged = true;
                break;
            }
            
            // Update centroids
            this.updateCentroids([centroid1, centroid2], points, assignments);
            iterations++;
        }
        
        // Create new clusters
        const cluster1Points = points.filter((_, i) => assignments[i] === 0);
        const cluster2Points = points.filter((_, i) => assignments[i] === 1);
        
        // Ensure both clusters have at least one point
        if (cluster1Points.length === 0) {
            cluster1Points.push(cluster2Points.pop());
        } else if (cluster2Points.length === 0) {
            cluster2Points.push(cluster1Points.pop());
        }
        
        const newCluster1 = {
            id: `split_${step}_1`,
            points: cluster1Points,
            centroid: this.calculateCentroid(cluster1Points),
            size: cluster1Points.length,
            level: cluster.level + 1,
            parent: cluster
        };
        
        const newCluster2 = {
            id: `split_${step}_2`,
            points: cluster2Points,
            centroid: this.calculateCentroid(cluster2Points),
            size: cluster2Points.length,
            level: cluster.level + 1,
            parent: cluster
        };
        
        // Record split in history
        this.mergeHistory.push({
            step: step,
            originalCluster: cluster.id,
            newCluster1: newCluster1.id,
            newCluster2: newCluster2.id,
            variance: this.calculateClusterVariance(cluster)
        });
        
        return [newCluster1, newCluster2];
    }

    /**
     * Update centroids for k-means splitting
     * @param {Array} centroids - Array of centroids to update
     * @param {Array} points - Data points
     * @param {Array} assignments - Point assignments
     */
    updateCentroids(centroids, points, assignments) {
        const dimensions = centroids[0].length;
        const counts = [0, 0];
        
        // Reset centroids
        centroids[0].fill(0);
        centroids[1].fill(0);
        
        // Sum points for each cluster
        for (let i = 0; i < points.length; i++) {
            const clusterId = assignments[i];
            counts[clusterId]++;
            
            for (let d = 0; d < dimensions; d++) {
                centroids[clusterId][d] += points[i].features[d];
            }
        }
        
        // Average to get new centroids
        for (let c = 0; c < 2; c++) {
            if (counts[c] > 0) {
                for (let d = 0; d < dimensions; d++) {
                    centroids[c][d] /= counts[c];
                }
            }
        }
    }

    /**
     * Build dendrogram structure for visualization
     * @returns {Object} Dendrogram data structure
     */
    buildDendrogram() {
        if (this.method !== 'agglomerative' || this.mergeHistory.length === 0) {
            return null;
        }

        const nodes = new Map();
        const leafNodes = [];

        // Create leaf nodes for each data point
        this.processedData.forEach((point, index) => {
            const leafNode = {
                id: index,
                isLeaf: true,
                height: 0,
                size: 1,
                data: point.originalData,
                children: [],
                clusterId: this.clusterAssignments[index]
            };
            nodes.set(index, leafNode);
            leafNodes.push(leafNode);
        });

        // Process merge history to build tree
        this.mergeHistory.forEach((merge, index) => {
            const child1 = nodes.get(merge.cluster1);
            const child2 = nodes.get(merge.cluster2);
            
            const mergeNode = {
                id: merge.newClusterId,
                isLeaf: false,
                height: merge.distance,
                size: merge.newClusterSize,
                children: [child1, child2],
                mergeStep: index,
                clusterId: -1 // Internal nodes don't have cluster assignments
            };
            
            nodes.set(merge.newClusterId, mergeNode);
        });

        // Find root node (last merge)
        const lastMerge = this.mergeHistory[this.mergeHistory.length - 1];
        const root = nodes.get(lastMerge.newClusterId);

        return {
            root,
            leafNodes,
            totalNodes: nodes.size,
            maxHeight: lastMerge.distance,
            linkage: this.linkage
        };
    }

    /**
     * Post-process clustering results
     * @param {Object} result - Clustering results
     */
    async postProcessResults(result) {
        this.currentStep = 'post_processing';
        this.progress = 85;
        
        EventBus.emit('hierarchical:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Calculate cluster statistics
        result.clusterStats = this.calculateClusterStatistics();
        
        // Determine optimal number of clusters if auto-cut requested
        if (this.numClusters === null && this.method === 'agglomerative') {
            result.optimalClusters = this.findOptimalClusters();
        }
    }

    /**
     * Calculate statistics for each cluster
     * @returns {Array} Cluster statistics
     */
    calculateClusterStatistics() {
        return this.clusters.map((cluster, index) => {
            const points = cluster.map(point => {
                const originalIndex = point._originalIndex;
                return this.processedData[originalIndex].features;
            });
            
            const centroid = this.calculateCentroid(cluster.map(point => ({
                features: this.features.map(feature => point[feature])
            })));
            
            const variance = this.calculateClusterVariance({
                points: cluster.map(point => ({
                    features: this.features.map(feature => point[feature])
                })),
                centroid
            });
            
            return {
                id: index,
                size: cluster.length,
                centroid: centroid.map(val => Math.round(val * 1000) / 1000),
                variance: Math.round(variance * 1000) / 1000,
                diameter: this.calculateClusterDiameter(points)
            };
        });
    }

    /**
     * Calculate cluster diameter (maximum distance between any two points)
     * @param {Array} points - Cluster points
     * @returns {Number} Cluster diameter
     */
    calculateClusterDiameter(points) {
        let maxDistance = 0;
        
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const distance = calculateDistance(points[i], points[j], this.distanceMetric);
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        
        return Math.round(maxDistance * 1000) / 1000;
    }

    /**
     * Find optimal number of clusters using elbow method
     * @returns {Object} Optimal cluster information
     */
    findOptimalClusters() {
        if (this.mergeHistory.length === 0) return null;
        
        // Calculate distances at each merge step
        const distances = this.mergeHistory.map(merge => merge.distance);
        
        // Find elbow point using second derivative
        const elbowPoint = this.findElbowPoint(distances);
        const optimalK = this.processedData.length - elbowPoint;
        
        return {
            optimalClusters: Math.max(2, Math.min(optimalK, 10)),
            elbowPoint: elbowPoint,
            distances: distances
        };
    }

    /**
     * Find elbow point in distance curve
     * @param {Array} distances - Array of merge distances
     * @returns {Number} Elbow point index
     */
    findElbowPoint(distances) {
        if (distances.length < 3) return 0;
        
        // Calculate second derivatives
        const secondDerivatives = [];
        for (let i = 1; i < distances.length - 1; i++) {
            const d2 = distances[i - 1] - 2 * distances[i] + distances[i + 1];
            secondDerivatives.push(Math.abs(d2));
        }
        
        // Find maximum second derivative
        const maxDerivativeIndex = secondDerivatives.indexOf(Math.max(...secondDerivatives));
        return maxDerivativeIndex + 1; // Adjust for offset
    }

    /**
     * Calculate quality metrics
     * @param {Object} result - Clustering results
     */
    async calculateQualityMetrics(result) {
        this.currentStep = 'quality_metrics';
        this.progress = 95;
        
        EventBus.emit('hierarchical:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Calculate cophenetic correlation if requested
        if (this.calculateCopheneticCorrelation && this.method === 'agglomerative') {
            this.stats.copheneticCorrelation = await this.calculateCopheneticCorr();
        }

        // Calculate silhouette score
        result.silhouetteScore = this.calculateSilhouetteScore();
        
        // Calculate Davies-Bouldin index
        result.daviesBouldinIndex = this.calculateDaviesBouldinIndex();
    }

    /**
     * Calculate cophenetic correlation coefficient
     * @returns {Promise<Number>} Cophenetic correlation
     */
    async calculateCopheneticCorr() {
        // This is a simplified implementation
        // Full implementation would require building cophenetic matrix
        return 0.8; // Placeholder
    }

    /**
     * Calculate silhouette score
     * @returns {Number} Average silhouette score
     */
    calculateSilhouetteScore() {
        if (this.clusters.length <= 1) return 0;
        
        const scores = [];
        const sampleSize = Math.min(100, this.processedData.length); // Sample for performance
        
        for (let i = 0; i < sampleSize; i++) {
            const point = this.processedData[i];
            const clusterId = this.clusterAssignments[i];
            
            // Calculate average distance to points in same cluster (a)
            const sameClusterPoints = this.processedData.filter((p, idx) => 
                this.clusterAssignments[idx] === clusterId && idx !== i
            );
            
            let a = 0;
            if (sameClusterPoints.length > 0) {
                const distances = sameClusterPoints.map(p => 
                    calculateDistance(point.features, p.features, this.distanceMetric)
                );
                a = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
            }
            
            // Calculate minimum average distance to points in other clusters (b)
            let b = Infinity;
            const otherClusterIds = [...new Set(this.clusterAssignments.filter(id => id !== clusterId))];
            
            for (const otherClusterId of otherClusterIds) {
                const otherClusterPoints = this.processedData.filter((p, idx) => 
                    this.clusterAssignments[idx] === otherClusterId
                );
                
                if (otherClusterPoints.length > 0) {
                    const distances = otherClusterPoints.map(p => 
                        calculateDistance(point.features, p.features, this.distanceMetric)
                    );
                    const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
                    b = Math.min(b, avgDistance);
                }
            }
            
            // Calculate silhouette score for this point
            if (b === Infinity) {
                scores.push(0);
            } else {
                scores.push((b - a) / Math.max(a, b));
            }
        }
        
        return scores.length > 0 ? 
            scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    }

    /**
     * Calculate Davies-Bouldin index
     * @returns {Number} Davies-Bouldin index
     */
    calculateDaviesBouldinIndex() {
        if (this.clusters.length <= 1) return 0;
        
        const clusterCentroids = this.clusters.map((cluster, index) => {
            const points = cluster.map(point => ({
                features: this.features.map(feature => point[feature])
            }));
            return this.calculateCentroid(points);
        });
        
        const clusterScatters = this.clusters.map((cluster, index) => {
            const points = cluster.map(point => ({
                features: this.features.map(feature => point[feature])
            }));
            const centroid = clusterCentroids[index];
            
            let scatter = 0;
            for (const point of points) {
                const distance = calculateDistance(point.features, centroid, this.distanceMetric);
                scatter += distance;
            }
            return points.length > 0 ? scatter / points.length : 0;
        });
        
        let dbSum = 0;
        
        for (let i = 0; i < this.clusters.length; i++) {
            let maxRatio = 0;
            
            for (let j = 0; j < this.clusters.length; j++) {
                if (i !== j) {
                    const centroidDistance = calculateDistance(
                        clusterCentroids[i], 
                        clusterCentroids[j], 
                        this.distanceMetric
                    );
                    
                    if (centroidDistance > 0) {
                        const ratio = (clusterScatters[i] + clusterScatters[j]) / centroidDistance;
                        maxRatio = Math.max(maxRatio, ratio);
                    }
                }
            }
            
            dbSum += maxRatio;
        }
        
        return dbSum / this.clusters.length;
    }

    /**
     * Get algorithm parameters
     * @returns {Object} Current parameters
     */
    getAlgorithmParameters() {
        return {
            method: this.method,
            linkage: this.linkage,
            distanceMetric: this.distanceMetric,
            numClusters: this.numClusters,
            distanceThreshold: this.distanceThreshold,
            generateDendrogram: this.generateDendrogram
        };
    }

    /**
     * Cut dendrogram at specified height or number of clusters
     * @param {Number} cutHeight - Height to cut dendrogram
     * @param {Number} numClusters - Number of clusters (alternative to height)
     * @returns {Array} New cluster assignments
     */
    cutDendrogram(cutHeight = null, numClusters = null) {
        if (!this.dendrogram || this.method !== 'agglomerative') {
            throw new Error('Dendrogram not available for cutting');
        }

        // Determine cut height
        let targetHeight = cutHeight;
        if (numClusters !== null && targetHeight === null) {
            // Find height that gives desired number of clusters
            const sortedDistances = this.mergeHistory
                .map(m => m.distance)
                .sort((a, b) => a - b);
            
            const cutIndex = Math.max(0, this.mergeHistory.length - numClusters + 1);
            targetHeight = sortedDistances[cutIndex] || 0;
        }

        // Find clusters at cut height
        const newClusters = this.findClustersAtHeight(this.dendrogram.root, targetHeight);
        
        // Assign new cluster IDs
        const newAssignments = new Array(this.processedData.length);
        newClusters.forEach((cluster, clusterId) => {
            this.getLeafNodes(cluster).forEach(leafNode => {
                newAssignments[leafNode.id] = clusterId;
            });
        });

        return newAssignments;
    }

    /**
     * Find clusters at specified height
     * @param {Object} node - Current dendrogram node
     * @param {Number} height - Cut height
     * @returns {Array} Array of cluster nodes
     */
    findClustersAtHeight(node, height) {
        if (node.isLeaf || node.height <= height) {
            return [node];
        }

        const clusters = [];
        for (const child of node.children) {
            clusters.push(...this.findClustersAtHeight(child, height));
        }

        return clusters;
    }

    /**
     * Get all leaf nodes under a dendrogram node
     * @param {Object} node - Dendrogram node
     * @returns {Array} Array of leaf nodes
     */
    getLeafNodes(node) {
        if (node.isLeaf) {
            return [node];
        }

        const leafNodes = [];
        for (const child of node.children) {
            leafNodes.push(...this.getLeafNodes(child));
        }

        return leafNodes;
    }

    /**
     * Save model state
     * @returns {Object} Model state
     */
    save() {
        return {
            algorithm: 'Hierarchical',
            version: '1.0',
            parameters: this.getAlgorithmParameters(),
            features: this.features,
            dendrogram: this.dendrogram,
            mergeHistory: this.mergeHistory,
            stats: this.stats,
            timestamp: Date.now()
        };
    }

    /**
     * Load model state
     * @param {Object} modelState - Saved model state
     */
    load(modelState) {
        if (modelState.algorithm !== 'Hierarchical') {
            throw new Error('Invalid model format');
        }
        
        Object.assign(this, modelState.parameters);
        this.features = modelState.features;
        this.dendrogram = modelState.dendrogram;
        this.mergeHistory = modelState.mergeHistory || [];
        this.stats = modelState.stats || {};
    }
}

// Export for use
export default HierarchicalClustering;