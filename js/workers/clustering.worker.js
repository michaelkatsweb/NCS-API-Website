// File: clustering.worker.js
// Path: js/workers/clustering.worker.js
// Background clustering web worker for NCS-API-Website
// Handles intensive clustering computations without blocking the UI thread

/**
 * Utility functions for clustering algorithms
 */
const ClusteringUtils = {
    calculateDistance(p1, p2, metric = 'euclidean') {
        switch (metric) {
            case 'euclidean':
                const dx = (p1.x || p1[0]) - (p2.x || p2[0]);
                const dy = (p1.y || p1[1]) - (p2.y || p2[1]);
                return Math.sqrt(dx * dx + dy * dy);
            
            case 'manhattan':
                return Math.abs((p1.x || p1[0]) - (p2.x || p2[0])) + 
                       Math.abs((p1.y || p1[1]) - (p2.y || p2[1]));
            
            case 'cosine':
                const dot = (p1.x || p1[0]) * (p2.x || p2[0]) + (p1.y || p1[1]) * (p2.y || p2[1]);
                const mag1 = Math.sqrt((p1.x || p1[0]) ** 2 + (p1.y || p1[1]) ** 2);
                const mag2 = Math.sqrt((p2.x || p2[0]) ** 2 + (p2.y || p2[1]) ** 2);
                return mag1 * mag2 > 0 ? 1 - (dot / (mag1 * mag2)) : 0;
            
            default:
                return this.calculateDistance(p1, p2, 'euclidean');
        }
    },
    
    calculateCentroid(points) {
        if (points.length === 0) return { x: 0, y: 0 };
        
        const x = points.reduce((sum, p) => sum + (p.x || p[0]), 0) / points.length;
        const y = points.reduce((sum, p) => sum + (p.y || p[1]), 0) / points.length;
        
        return { x, y };
    },
    
    initializeRandomCentroids(data, k) {
        const centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * data.length);
            const point = data[randomIndex];
            centroids.push({
                x: point.x || point[0],
                y: point.y || point[1]
            });
        }
        return centroids;
    },
    
    initializeKMeansPlusPlus(data, k) {
        if (data.length === 0 || k <= 0) return [];
        
        const centroids = [];
        
        // Choose first centroid randomly
        const firstIndex = Math.floor(Math.random() * data.length);
        const firstPoint = data[firstIndex];
        centroids.push({
            x: firstPoint.x || firstPoint[0],
            y: firstPoint.y || firstPoint[1]
        });
        
        // Choose remaining centroids
        for (let i = 1; i < k; i++) {
            const distances = data.map(point => {
                let minDist = Infinity;
                for (const centroid of centroids) {
                    const dist = this.calculateDistance(point, centroid);
                    minDist = Math.min(minDist, dist);
                }
                return minDist * minDist; // Squared distance for probability
            });
            
            const totalDist = distances.reduce((sum, d) => sum + d, 0);
            if (totalDist === 0) break;
            
            let random = Math.random() * totalDist;
            let chosenIndex = 0;
            
            for (let j = 0; j < distances.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    chosenIndex = j;
                    break;
                }
            }
            
            const chosenPoint = data[chosenIndex];
            centroids.push({
                x: chosenPoint.x || chosenPoint[0],
                y: chosenPoint.y || chosenPoint[1]
            });
        }
        
        return centroids;
    }
};

/**
 * K-Means clustering algorithm
 */
const KMeansAlgorithm = {
    run(data, k, options = {}) {
        const maxIterations = options.maxIterations || 100;
        const tolerance = options.tolerance || 1e-4;
        const initMethod = options.initMethod || 'kmeans++';
        const metric = options.metric || 'euclidean';
        
        if (k <= 0 || data.length === 0) {
            return { clusters: [], centroids: [], iterations: 0, converged: false };
        }
        
        // Initialize centroids
        let centroids = initMethod === 'kmeans++' ?
            ClusteringUtils.initializeKMeansPlusPlus(data, k) :
            ClusteringUtils.initializeRandomCentroids(data, k);
        
        let iterations = 0;
        let converged = false;
        
        for (iterations = 0; iterations < maxIterations; iterations++) {
            // Assign points to clusters
            const clusters = Array(k).fill().map(() => ({ points: [], pointIndices: [] }));
            
            data.forEach((point, index) => {
                let minDist = Infinity;
                let clusterIndex = 0;
                
                centroids.forEach((centroid, i) => {
                    const dist = ClusteringUtils.calculateDistance(point, centroid, metric);
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIndex = i;
                    }
                });
                
                clusters[clusterIndex].points.push(point);
                clusters[clusterIndex].pointIndices.push(index);
            });
            
            // Update centroids
            const newCentroids = clusters.map(cluster => 
                cluster.points.length > 0 ? 
                    ClusteringUtils.calculateCentroid(cluster.points) :
                    { x: 0, y: 0 }
            );
            
            // Check convergence
            const movement = centroids.reduce((sum, centroid, i) => {
                return sum + ClusteringUtils.calculateDistance(centroid, newCentroids[i]);
            }, 0);
            
            if (movement < tolerance) {
                converged = true;
                centroids = newCentroids;
                break;
            }
            
            centroids = newCentroids;
            
            // Send progress update
            if (iterations % 10 === 0) {
                postMessage({
                    type: 'progress',
                    algorithm: 'kmeans',
                    iteration: iterations,
                    maxIterations,
                    movement,
                    converged: false
                });
            }
        }
        
        // Final cluster assignment
        const finalClusters = Array(k).fill().map(() => ({ 
            points: [], 
            pointIndices: [],
            centroid: null
        }));
        
        data.forEach((point, index) => {
            let minDist = Infinity;
            let clusterIndex = 0;
            
            centroids.forEach((centroid, i) => {
                const dist = ClusteringUtils.calculateDistance(point, centroid, metric);
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = i;
                }
            });
            
            finalClusters[clusterIndex].points.push(point);
            finalClusters[clusterIndex].pointIndices.push(index);
        });
        
        // Set centroids
        finalClusters.forEach((cluster, i) => {
            cluster.centroid = centroids[i];
        });
        
        return {
            clusters: finalClusters,
            centroids,
            iterations,
            converged,
            algorithm: 'kmeans'
        };
    }
};

/**
 * DBSCAN clustering algorithm
 */
const DBSCANAlgorithm = {
    run(data, eps, minPts, options = {}) {
        const metric = options.metric || 'euclidean';
        
        if (data.length === 0) {
            return { clusters: [], noise: [], algorithm: 'dbscan' };
        }
        
        const visited = new Array(data.length).fill(false);
        const clustered = new Array(data.length).fill(false);
        const clusters = [];
        const noise = [];
        
        for (let i = 0; i < data.length; i++) {
            if (visited[i]) continue;
            
            visited[i] = true;
            const neighbors = this.getNeighbors(data, i, eps, metric);
            
            if (neighbors.length < minPts) {
                noise.push({ point: data[i], index: i });
            } else {
                const cluster = { points: [], pointIndices: [] };
                this.expandCluster(data, i, neighbors, cluster, eps, minPts, visited, clustered, metric);
                clusters.push(cluster);
            }
            
            // Send progress update
            if (i % 100 === 0) {
                postMessage({
                    type: 'progress',
                    algorithm: 'dbscan',
                    processed: i,
                    total: data.length,
                    clustersFound: clusters.length
                });
            }
        }
        
        return {
            clusters,
            noise,
            algorithm: 'dbscan'
        };
    },
    
    getNeighbors(data, pointIndex, eps, metric) {
        const neighbors = [];
        const point = data[pointIndex];
        
        for (let i = 0; i < data.length; i++) {
            if (i !== pointIndex) {
                const dist = ClusteringUtils.calculateDistance(point, data[i], metric);
                if (dist <= eps) {
                    neighbors.push(i);
                }
            }
        }
        
        return neighbors;
    },
    
    expandCluster(data, pointIndex, neighbors, cluster, eps, minPts, visited, clustered, metric) {
        cluster.points.push(data[pointIndex]);
        cluster.pointIndices.push(pointIndex);
        clustered[pointIndex] = true;
        
        for (let i = 0; i < neighbors.length; i++) {
            const neighborIndex = neighbors[i];
            
            if (!visited[neighborIndex]) {
                visited[neighborIndex] = true;
                const neighborNeighbors = this.getNeighbors(data, neighborIndex, eps, metric);
                
                if (neighborNeighbors.length >= minPts) {
                    neighbors.push(...neighborNeighbors);
                }
            }
            
            if (!clustered[neighborIndex]) {
                cluster.points.push(data[neighborIndex]);
                cluster.pointIndices.push(neighborIndex);
                clustered[neighborIndex] = true;
            }
        }
    }
};

/**
 * Hierarchical clustering algorithm
 */
const HierarchicalAlgorithm = {
    run(data, options = {}) {
        const metric = options.metric || 'euclidean';
        const linkage = options.linkage || 'ward';
        const numClusters = options.numClusters || Math.ceil(Math.sqrt(data.length / 2));
        
        if (data.length === 0) {
            return { clusters: [], dendrogram: [], algorithm: 'hierarchical' };
        }
        
        // Initialize clusters - each point is its own cluster
        let clusters = data.map((point, index) => ({
            points: [point],
            pointIndices: [index],
            centroid: { x: point.x || point[0], y: point.y || point[1] },
            size: 1,
            id: index
        }));
        
        const dendrogram = [];
        let nextId = data.length;
        
        // Merge clusters until we reach the desired number
        while (clusters.length > numClusters) {
            let minDistance = Infinity;
            let mergeI = -1, mergeJ = -1;
            
            // Find closest pair of clusters
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const distance = this.calculateClusterDistance(clusters[i], clusters[j], linkage, metric);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        mergeI = i;
                        mergeJ = j;
                    }
                }
            }
            
            if (mergeI === -1 || mergeJ === -1) break;
            
            // Merge clusters
            const cluster1 = clusters[mergeI];
            const cluster2 = clusters[mergeJ];
            
            const mergedCluster = {
                points: [...cluster1.points, ...cluster2.points],
                pointIndices: [...cluster1.pointIndices, ...cluster2.pointIndices],
                centroid: ClusteringUtils.calculateCentroid([...cluster1.points, ...cluster2.points]),
                size: cluster1.size + cluster2.size,
                id: nextId++,
                children: [cluster1.id, cluster2.id]
            };
            
            dendrogram.push({
                cluster1: cluster1.id,
                cluster2: cluster2.id,
                distance: minDistance,
                mergedId: mergedCluster.id,
                size: mergedCluster.size
            });
            
            // Remove merged clusters and add new one
            clusters.splice(Math.max(mergeI, mergeJ), 1);
            clusters.splice(Math.min(mergeI, mergeJ), 1);
            clusters.push(mergedCluster);
            
            // Send progress update
            if (clusters.length % 10 === 0) {
                postMessage({
                    type: 'progress',
                    algorithm: 'hierarchical',
                    clustersRemaining: clusters.length,
                    targetClusters: numClusters,
                    merges: dendrogram.length
                });
            }
        }
        
        return {
            clusters,
            dendrogram,
            algorithm: 'hierarchical'
        };
    },
    
    calculateClusterDistance(cluster1, cluster2, linkage, metric) {
        switch (linkage) {
            case 'single':
                return this.singleLinkage(cluster1, cluster2, metric);
            case 'complete':
                return this.completeLinkage(cluster1, cluster2, metric);
            case 'average':
                return this.averageLinkage(cluster1, cluster2, metric);
            case 'ward':
                return this.wardLinkage(cluster1, cluster2);
            default:
                return this.averageLinkage(cluster1, cluster2, metric);
        }
    },
    
    singleLinkage(cluster1, cluster2, metric) {
        let minDist = Infinity;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                const dist = ClusteringUtils.calculateDistance(point1, point2, metric);
                minDist = Math.min(minDist, dist);
            }
        }
        
        return minDist;
    },
    
    completeLinkage(cluster1, cluster2, metric) {
        let maxDist = 0;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                const dist = ClusteringUtils.calculateDistance(point1, point2, metric);
                maxDist = Math.max(maxDist, dist);
            }
        }
        
        return maxDist;
    },
    
    averageLinkage(cluster1, cluster2, metric) {
        let totalDist = 0;
        let count = 0;
        
        for (const point1 of cluster1.points) {
            for (const point2 of cluster2.points) {
                totalDist += ClusteringUtils.calculateDistance(point1, point2, metric);
                count++;
            }
        }
        
        return count > 0 ? totalDist / count : 0;
    },
    
    wardLinkage(cluster1, cluster2) {
        const mergedPoints = [...cluster1.points, ...cluster2.points];
        const mergedCentroid = ClusteringUtils.calculateCentroid(mergedPoints);
        
        // Calculate increase in within-cluster sum of squares
        let cluster1SS = 0;
        for (const point of cluster1.points) {
            const dist = ClusteringUtils.calculateDistance(point, cluster1.centroid);
            cluster1SS += dist * dist;
        }
        
        let cluster2SS = 0;
        for (const point of cluster2.points) {
            const dist = ClusteringUtils.calculateDistance(point, cluster2.centroid);
            cluster2SS += dist * dist;
        }
        
        let mergedSS = 0;
        for (const point of mergedPoints) {
            const dist = ClusteringUtils.calculateDistance(point, mergedCentroid);
            mergedSS += dist * dist;
        }
        
        return mergedSS - cluster1SS - cluster2SS;
    }
};

/**
 * NCS (Neural Cluster Segmentation) Algorithm placeholder
 * This would typically interface with the actual NCS API
 */
const NCSAlgorithm = {
    run(data, options = {}) {
        const numClusters = options.numClusters || 'auto';
        const qualityThreshold = options.qualityThreshold || 0.7;
        const maxIterations = options.maxIterations || 50;
        
        // Simulate NCS algorithm processing
        // In a real implementation, this would call the NCS API
        
        return new Promise((resolve) => {
            let iteration = 0;
            
            const processIteration = () => {
                iteration++;
                
                // Send progress update
                postMessage({
                    type: 'progress',
                    algorithm: 'ncs',
                    iteration,
                    maxIterations,
                    phase: iteration < maxIterations * 0.3 ? 'initialization' :
                           iteration < maxIterations * 0.7 ? 'optimization' :
                           'refinement'
                });
                
                if (iteration < maxIterations) {
                    setTimeout(processIteration, 50); // Simulate processing time
                } else {
                    // Return simulated results
                    // In real implementation, this would be actual NCS results
                    const fallbackResult = KMeansAlgorithm.run(data, 
                        typeof numClusters === 'number' ? numClusters : 3, 
                        { initMethod: 'kmeans++' }
                    );
                    
                    resolve({
                        ...fallbackResult,
                        algorithm: 'ncs',
                        qualityScore: 0.85,
                        confidence: 0.92,
                        optimalClusters: fallbackResult.clusters.length
                    });
                }
            };
            
            processIteration();
        });
    }
};

/**
 * Worker message handler
 */
self.onmessage = async function(e) {
    const { type, algorithm, data, options, taskId } = e.data;
    
    try {
        if (type === 'cluster') {
            postMessage({
                type: 'start',
                algorithm,
                taskId,
                timestamp: Date.now()
            });
            
            let result;
            
            switch (algorithm) {
                case 'kmeans':
                    result = KMeansAlgorithm.run(data, options.k || 3, options);
                    break;
                    
                case 'dbscan':
                    result = DBSCANAlgorithm.run(data, options.eps || 0.5, options.minPts || 5, options);
                    break;
                    
                case 'hierarchical':
                    result = HierarchicalAlgorithm.run(data, options);
                    break;
                    
                case 'ncs':
                    result = await NCSAlgorithm.run(data, options);
                    break;
                    
                default:
                    throw new Error(`Unknown algorithm: ${algorithm}`);
            }
            
            postMessage({
                type: 'complete',
                algorithm,
                result,
                taskId,
                timestamp: Date.now()
            });
            
        } else if (type === 'cancel') {
            // Handle cancellation if needed
            postMessage({
                type: 'cancelled',
                taskId,
                timestamp: Date.now()
            });
            
        } else {
            throw new Error(`Unknown message type: ${type}`);
        }
        
    } catch (error) {
        postMessage({
            type: 'error',
            error: {
                message: error.message,
                stack: error.stack
            },
            algorithm,
            taskId,
            timestamp: Date.now()
        });
    }
};