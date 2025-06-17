/**
 * K-means Clustering Algorithm Implementation
 * High-performance client-side clustering for data visualization
 */

export class KMeans {
    constructor(k, options = {}) {
        this.k = k;
        this.options = {
            maxIterations: 100,
            tolerance: 0.001,
            initMethod: 'kmeans++', // 'random', 'kmeans++', 'manual'
            distanceMetric: 'euclidean', // 'euclidean', 'manhattan'
            debug: false,
            seed: null, // For reproducible results
            ...options
        };
        
        // Algorithm state
        this.centroids = [];
        this.labels = [];
        this.iterations = 0;
        this.converged = false;
        this.inertia = 0;
        this.executionTime = 0;
        
        // Performance tracking
        this.metrics = {
            totalDistance: 0,
            withinClusterSumSquares: 0,
            silhouetteScore: 0,
            durations: {
                initialization: 0,
                assignment: 0,
                update: 0,
                total: 0
            }
        };
        
        // Random number generator for reproducible results
        this.rng = options.seed ? this.seededRandom(options.seed) : Math.random;
        
        if (this.options.debug) {
            console.log('🔬 K-means initialized', {
                k: this.k,
                options: this.options
            });
        }
    }

    /**
     * Fit the model to data
     */
    fit(data) {
        const startTime = performance.now();
        
        if (!this.validateInput(data)) {
            throw new Error('Invalid input data for K-means clustering');
        }
        
        this.data = data;
        this.n = data.length;
        this.dimensions = data[0].length;
        
        // Initialize algorithm state
        this.reset();
        
        try {
            // Initialize centroids
            const initStart = performance.now();
            this.initializeCentroids();
            this.metrics.durations.initialization = performance.now() - initStart;
            
            // Main algorithm loop
            while (!this.converged && this.iterations < this.options.maxIterations) {
                this.iterations++;
                
                // Assign points to clusters
                const assignStart = performance.now();
                const newLabels = this.assignPointsToClusters();
                this.metrics.durations.assignment += performance.now() - assignStart;
                
                // Update centroids
                const updateStart = performance.now();
                const newCentroids = this.updateCentroids(newLabels);
                this.metrics.durations.update += performance.now() - updateStart;
                
                // Check for convergence
                this.converged = this.checkConvergence(this.centroids, newCentroids);
                
                // Update state
                this.labels = newLabels;
                this.centroids = newCentroids;
                
                if (this.options.debug && this.iterations % 10 === 0) {
                    console.log(`Iteration ${this.iterations}, inertia: ${this.calculateInertia().toFixed(4)}`);
                }
            }
            
            // Calculate final metrics
            this.inertia = this.calculateInertia();
            this.metrics.withinClusterSumSquares = this.inertia;
            this.metrics.silhouetteScore = this.calculateSilhouetteScore();
            
            this.executionTime = performance.now() - startTime;
            this.metrics.durations.total = this.executionTime;
            
            if (this.options.debug) {
                console.log('✅ K-means completed', {
                    iterations: this.iterations,
                    converged: this.converged,
                    inertia: this.inertia,
                    executionTime: `${this.executionTime.toFixed(2)}ms`
                });
            }
            
            return this.getResults();
            
        } catch (error) {
            console.error('❌ K-means clustering failed:', error);
            throw error;
        }
    }

    /**
     * Predict cluster labels for new data
     */
    predict(data) {
        if (this.centroids.length === 0) {
            throw new Error('Model must be fitted before prediction');
        }
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid prediction data');
        }
        
        // Handle single point vs array of points
        const points = Array.isArray(data[0]) ? data : [data];
        const predictions = [];
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            let minDistance = Infinity;
            let closestCluster = 0;
            
            for (let j = 0; j < this.centroids.length; j++) {
                const distance = this.calculateDistance(point, this.centroids[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = j;
                }
            }
            
            predictions.push(closestCluster);
        }
        
        return Array.isArray(data[0]) ? predictions : predictions[0];
    }

    /**
     * Initialize centroids using specified method
     */
    initializeCentroids() {
        switch (this.options.initMethod) {
            case 'random':
                this.initializeRandomCentroids();
                break;
            case 'kmeans++':
                this.initializeKMeansPlusPlusCentroids();
                break;
            case 'manual':
                if (!this.options.initialCentroids) {
                    throw new Error('Manual initialization requires initialCentroids option');
                }
                this.centroids = [...this.options.initialCentroids];
                break;
            default:
                throw new Error(`Unknown initialization method: ${this.options.initMethod}`);
        }
        
        if (this.options.debug) {
            console.log('📍 Centroids initialized', this.centroids);
        }
    }

    /**
     * Random centroid initialization
     */
    initializeRandomCentroids() {
        this.centroids = [];
        
        // Find data bounds
        const bounds = this.getDataBounds();
        
        for (let i = 0; i < this.k; i++) {
            const centroid = [];
            for (let j = 0; j < this.dimensions; j++) {
                const min = bounds[j].min;
                const max = bounds[j].max;
                centroid.push(min + this.rng() * (max - min));
            }
            this.centroids.push(centroid);
        }
    }

    /**
     * K-means++ centroid initialization (better initial placement)
     */
    initializeKMeansPlusPlusCentroids() {
        this.centroids = [];
        
        // Choose first centroid randomly
        const firstIndex = Math.floor(this.rng() * this.n);
        this.centroids.push([...this.data[firstIndex]]);
        
        // Choose remaining centroids
        for (let i = 1; i < this.k; i++) {
            const distances = [];
            let totalDistance = 0;
            
            // Calculate distances to nearest centroid for each point
            for (let j = 0; j < this.n; j++) {
                let minDistance = Infinity;
                
                for (let c = 0; c < this.centroids.length; c++) {
                    const distance = this.calculateDistance(this.data[j], this.centroids[c]);
                    minDistance = Math.min(minDistance, distance);
                }
                
                const squaredDistance = minDistance * minDistance;
                distances.push(squaredDistance);
                totalDistance += squaredDistance;
            }
            
            // Choose next centroid with probability proportional to squared distance
            let randomValue = this.rng() * totalDistance;
            let chosenIndex = 0;
            
            for (let j = 0; j < this.n; j++) {
                randomValue -= distances[j];
                if (randomValue <= 0) {
                    chosenIndex = j;
                    break;
                }
            }
            
            this.centroids.push([...this.data[chosenIndex]]);
        }
    }

    /**
     * Assign each point to the nearest centroid
     */
    assignPointsToClusters() {
        const newLabels = new Array(this.n);
        
        for (let i = 0; i < this.n; i++) {
            let minDistance = Infinity;
            let closestCluster = 0;
            
            for (let j = 0; j < this.k; j++) {
                const distance = this.calculateDistance(this.data[i], this.centroids[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = j;
                }
            }
            
            newLabels[i] = closestCluster;
        }
        
        return newLabels;
    }

    /**
     * Update centroids to the mean of assigned points
     */
    updateCentroids(labels) {
        const newCentroids = [];
        
        for (let i = 0; i < this.k; i++) {
            const clusterPoints = [];
            
            // Collect points assigned to this cluster
            for (let j = 0; j < this.n; j++) {
                if (labels[j] === i) {
                    clusterPoints.push(this.data[j]);
                }
            }
            
            // Calculate mean of cluster points
            if (clusterPoints.length > 0) {
                const centroid = new Array(this.dimensions).fill(0);
                
                for (let j = 0; j < clusterPoints.length; j++) {
                    for (let d = 0; d < this.dimensions; d++) {
                        centroid[d] += clusterPoints[j][d];
                    }
                }
                
                for (let d = 0; d < this.dimensions; d++) {
                    centroid[d] /= clusterPoints.length;
                }
                
                newCentroids.push(centroid);
            } else {
                // Keep old centroid if no points assigned
                newCentroids.push([...this.centroids[i]]);
            }
        }
        
        return newCentroids;
    }

    /**
     * Check if algorithm has converged
     */
    checkConvergence(oldCentroids, newCentroids) {
        for (let i = 0; i < this.k; i++) {
            const distance = this.calculateDistance(oldCentroids[i], newCentroids[i]);
            if (distance > this.options.tolerance) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(point1, point2) {
        switch (this.options.distanceMetric) {
            case 'euclidean':
                return this.euclideanDistance(point1, point2);
            case 'manhattan':
                return this.manhattanDistance(point1, point2);
            default:
                throw new Error(`Unknown distance metric: ${this.options.distanceMetric}`);
        }
    }

    /**
     * Euclidean distance calculation
     */
    euclideanDistance(point1, point2) {
        let sum = 0;
        for (let i = 0; i < point1.length; i++) {
            const diff = point1[i] - point2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Manhattan distance calculation
     */
    manhattanDistance(point1, point2) {
        let sum = 0;
        for (let i = 0; i < point1.length; i++) {
            sum += Math.abs(point1[i] - point2[i]);
        }
        return sum;
    }

    /**
     * Calculate within-cluster sum of squares (inertia)
     */
    calculateInertia() {
        let inertia = 0;
        
        for (let i = 0; i < this.n; i++) {
            const clusterIndex = this.labels[i];
            const distance = this.calculateDistance(this.data[i], this.centroids[clusterIndex]);
            inertia += distance * distance;
        }
        
        return inertia;
    }

    /**
     * Calculate silhouette score (quality metric)
     */
    calculateSilhouetteScore() {
        if (this.k <= 1) return 0;
        
        let totalScore = 0;
        
        for (let i = 0; i < this.n; i++) {
            const a = this.calculateWithinClusterDistance(i);
            const b = this.calculateNearestClusterDistance(i);
            
            const silhouette = (b - a) / Math.max(a, b);
            totalScore += silhouette;
        }
        
        return totalScore / this.n;
    }

    /**
     * Calculate average distance to points in same cluster
     */
    calculateWithinClusterDistance(pointIndex) {
        const clusterIndex = this.labels[pointIndex];
        const clusterPoints = [];
        
        for (let i = 0; i < this.n; i++) {
            if (i !== pointIndex && this.labels[i] === clusterIndex) {
                clusterPoints.push(i);
            }
        }
        
        if (clusterPoints.length === 0) return 0;
        
        let totalDistance = 0;
        for (let i = 0; i < clusterPoints.length; i++) {
            totalDistance += this.calculateDistance(this.data[pointIndex], this.data[clusterPoints[i]]);
        }
        
        return totalDistance / clusterPoints.length;
    }

    /**
     * Calculate average distance to nearest cluster
     */
    calculateNearestClusterDistance(pointIndex) {
        const currentCluster = this.labels[pointIndex];
        let minDistance = Infinity;
        
        for (let cluster = 0; cluster < this.k; cluster++) {
            if (cluster === currentCluster) continue;
            
            const clusterPoints = [];
            for (let i = 0; i < this.n; i++) {
                if (this.labels[i] === cluster) {
                    clusterPoints.push(i);
                }
            }
            
            if (clusterPoints.length === 0) continue;
            
            let totalDistance = 0;
            for (let i = 0; i < clusterPoints.length; i++) {
                totalDistance += this.calculateDistance(this.data[pointIndex], this.data[clusterPoints[i]]);
            }
            
            const avgDistance = totalDistance / clusterPoints.length;
            minDistance = Math.min(minDistance, avgDistance);
        }
        
        return minDistance === Infinity ? 0 : minDistance;
    }

    /**
     * Get data bounds for each dimension
     */
    getDataBounds() {
        const bounds = [];
        
        for (let d = 0; d < this.dimensions; d++) {
            let min = Infinity;
            let max = -Infinity;
            
            for (let i = 0; i < this.n; i++) {
                min = Math.min(min, this.data[i][d]);
                max = Math.max(max, this.data[i][d]);
            }
            
            bounds.push({ min, max });
        }
        
        return bounds;
    }

    /**
     * Validate input data
     */
    validateInput(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return false;
        }
        
        if (data.length < this.k) {
            console.warn('⚠️ Number of data points is less than k');
            return false;
        }
        
        if (!Array.isArray(data[0])) {
            return false;
        }
        
        const dimensions = data[0].length;
        for (let i = 1; i < data.length; i++) {
            if (!Array.isArray(data[i]) || data[i].length !== dimensions) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Reset algorithm state
     */
    reset() {
        this.centroids = [];
        this.labels = [];
        this.iterations = 0;
        this.converged = false;
        this.inertia = 0;
        this.executionTime = 0;
        this.metrics = {
            totalDistance: 0,
            withinClusterSumSquares: 0,
            silhouetteScore: 0,
            durations: {
                initialization: 0,
                assignment: 0,
                update: 0,
                total: 0
            }
        };
    }

    /**
     * Get clustering results
     */
    getResults() {
        return {
            centroids: this.centroids,
            labels: this.labels,
            iterations: this.iterations,
            converged: this.converged,
            inertia: this.inertia,
            silhouetteScore: this.metrics.silhouetteScore,
            executionTime: this.executionTime,
            metrics: this.metrics,
            clusterSizes: this.getClusterSizes(),
            qualityScore: this.calculateQualityScore()
        };
    }

    /**
     * Get cluster sizes
     */
    getClusterSizes() {
        const sizes = new Array(this.k).fill(0);
        for (let i = 0; i < this.labels.length; i++) {
            sizes[this.labels[i]]++;
        }
        return sizes;
    }

    /**
     * Calculate overall quality score (0-100)
     */
    calculateQualityScore() {
        // Normalize silhouette score from [-1, 1] to [0, 100]
        const normalizedSilhouette = (this.metrics.silhouetteScore + 1) * 50;
        
        // Factor in convergence
        const convergenceBonus = this.converged ? 10 : 0;
        
        // Factor in balanced clusters
        const sizes = this.getClusterSizes();
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const balanceScore = sizes.reduce((score, size) => {
            const deviation = Math.abs(size - avgSize) / avgSize;
            return score - deviation * 10;
        }, 10);
        
        const finalScore = Math.max(0, Math.min(100, 
            normalizedSilhouette + convergenceBonus + balanceScore
        ));
        
        return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Seeded random number generator for reproducible results
     */
    seededRandom(seed) {
        let s = seed;
        return function() {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }

    /**
     * Export clustering results for visualization
     */
    exportForVisualization() {
        return {
            points: this.data.map((point, index) => ({
                x: point[0],
                y: point[1],
                cluster: this.labels[index],
                id: index
            })),
            centroids: this.centroids.map((centroid, index) => ({
                x: centroid[0],
                y: centroid[1],
                cluster: index
            })),
            metadata: {
                k: this.k,
                iterations: this.iterations,
                converged: this.converged,
                inertia: this.inertia,
                qualityScore: this.calculateQualityScore(),
                executionTime: this.executionTime
            }
        };
    }

    /**
     * Static method: Determine optimal number of clusters using elbow method
     */
    static findOptimalK(data, maxK = 10, options = {}) {
        const results = [];
        
        for (let k = 1; k <= Math.min(maxK, data.length - 1); k++) {
            const kmeans = new KMeans(k, { ...options, debug: false });
            const result = kmeans.fit(data);
            results.push({
                k: k,
                inertia: result.inertia,
                silhouetteScore: result.silhouetteScore,
                qualityScore: result.qualityScore
            });
        }
        
        // Find elbow point (simple implementation)
        let optimalK = 1;
        let maxImprovement = 0;
        
        for (let i = 1; i < results.length - 1; i++) {
            const improvement = results[i - 1].inertia - results[i].inertia;
            const nextImprovement = results[i].inertia - results[i + 1].inertia;
            const elbowStrength = improvement - nextImprovement;
            
            if (elbowStrength > maxImprovement) {
                maxImprovement = elbowStrength;
                optimalK = results[i].k;
            }
        }
        
        return {
            optimalK,
            results,
            recommendation: results[optimalK - 1]
        };
    }
}