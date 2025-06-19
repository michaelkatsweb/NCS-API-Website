// File: QualityMetrics.js
// Path: js/clustering/QualityMetrics.js
// Clustering quality assessment and evaluation metrics for NCS-API-Website
// Provides comprehensive clustering validation and quality scoring

import { calculateDistance, mean, standardDeviation } from '../utils/math.js';


/**
 * Internal clustering quality metrics (no ground truth required)
 */
export class InternalMetrics {
    /**
     * Calculate Silhouette Score
     * Measures how similar an object is to its own cluster compared to other clusters
     * Range: [-1, 1], higher is better
     */
    static silhouetteScore(data, clusters) {
        if (clusters.length <= 1) return 0;
        
        const silhouetteScores = [];
        const clusterMap = new Map();
        
        // Build cluster mapping
        clusters.forEach((cluster, clusterIndex) => {
            cluster.points.forEach(pointIndex => {
                clusterMap.set(pointIndex, clusterIndex);
            });
        });
        
        // Calculate silhouette for each point
        data.forEach((point, pointIndex) => {
            const clusterIndex = clusterMap.get(pointIndex);
            const currentCluster = clusters[clusterIndex];
            
            if (currentCluster.points.length <= 1) {
                silhouetteScores.push(0);
                return;
            }
            
            // Calculate average intra-cluster distance (a)
            let intraClusterDistance = 0;
            let intraCount = 0;
            
            currentCluster.points.forEach(otherPointIndex => {
                if (otherPointIndex !== pointIndex) {
                    intraClusterDistance += calculateDistance(
                        point.x || point[0], 
                        point.y || point[1],
                        data[otherPointIndex].x || data[otherPointIndex][0],
                        data[otherPointIndex].y || data[otherPointIndex][1]
                    );
                    intraCount++;
                }
            });
            
            const a = intraCount > 0 ? intraClusterDistance / intraCount : 0;
            
            // Calculate minimum average inter-cluster distance (b)
            let minInterClusterDistance = Infinity;
            
            clusters.forEach((otherCluster, otherClusterIndex) => {
                if (otherClusterIndex !== clusterIndex && otherCluster.points.length > 0) {
                    let interClusterDistance = 0;
                    
                    otherCluster.points.forEach(otherPointIndex => {
                        interClusterDistance += calculateDistance(
                            point.x || point[0], 
                            point.y || point[1],
                            data[otherPointIndex].x || data[otherPointIndex][0],
                            data[otherPointIndex].y || data[otherPointIndex][1]
                        );
                    });
                    
                    const avgInterDistance = interClusterDistance / otherCluster.points.length;
                    minInterClusterDistance = Math.min(minInterClusterDistance, avgInterDistance);
                }
            });
            
            const b = minInterClusterDistance;
            
            // Calculate silhouette score for this point
            const silhouette = b > a ? (b - a) / Math.max(a, b) : 0;
            silhouetteScores.push(silhouette);
        });
        
        return calculateMean(silhouetteScores);
    }
    
    /**
     * Calculate Davies-Bouldin Index
     * Measures average similarity between clusters
     * Range: [0, ∞], lower is better
     */
    static daviesBouldinIndex(data, clusters) {
        if (clusters.length <= 1) return 0;
        
        const clusterCenters = clusters.map(cluster => {
            if (cluster.centroid) {
                return cluster.centroid;
            }
            
            // Calculate centroid if not provided
            const points = cluster.points.map(index => data[index]);
            const x = calculateMean(points.map(p => p.x || p[0]));
            const y = calculateMean(points.map(p => p.y || p[1]));
            return { x, y };
        });
        
        // Calculate within-cluster scatter for each cluster
        const scatters = clusters.map((cluster, clusterIndex) => {
            const center = clusterCenters[clusterIndex];
            const distances = cluster.points.map(pointIndex => {
                const point = data[pointIndex];
                return calculateDistance(
                    point.x || point[0], 
                    point.y || point[1],
                    center.x, 
                    center.y
                );
            });
            return calculateMean(distances);
        });
        
        // Calculate Davies-Bouldin index
        let dbIndex = 0;
        
        for (let i = 0; i < clusters.length; i++) {
            let maxRatio = 0;
            
            for (let j = 0; j < clusters.length; j++) {
                if (i !== j) {
                    const centerDistance = calculateDistance(
                        clusterCenters[i].x, 
                        clusterCenters[i].y,
                        clusterCenters[j].x, 
                        clusterCenters[j].y
                    );
                    
                    if (centerDistance > 0) {
                        const ratio = (scatters[i] + scatters[j]) / centerDistance;
                        maxRatio = Math.max(maxRatio, ratio);
                    }
                }
            }
            
            dbIndex += maxRatio;
        }
        
        return dbIndex / clusters.length;
    }
    
    /**
     * Calculate Calinski-Harabasz Index (Variance Ratio Criterion)
     * Ratio of between-cluster to within-cluster sum of squares
     * Range: [0, ∞], higher is better
     */
    static calinskiHarabaszIndex(data, clusters) {
        if (clusters.length <= 1 || data.length <= clusters.length) return 0;
        
        // Calculate overall centroid
        const overallCentroid = {
            x: calculateMean(data.map(p => p.x || p[0])),
            y: calculateMean(data.map(p => p.y || p[1]))
        };
        
        // Calculate cluster centroids
        const clusterCentroids = clusters.map(cluster => {
            if (cluster.centroid) return cluster.centroid;
            
            const points = cluster.points.map(index => data[index]);
            return {
                x: calculateMean(points.map(p => p.x || p[0])),
                y: calculateMean(points.map(p => p.y || p[1]))
            };
        });
        
        // Calculate between-cluster sum of squares (BCSS)
        let bcss = 0;
        clusters.forEach((cluster, index) => {
            const centroid = clusterCentroids[index];
            const distance = calculateDistance(
                centroid.x, centroid.y,
                overallCentroid.x, overallCentroid.y
            );
            bcss += cluster.points.length * distance * distance;
        });
        
        // Calculate within-cluster sum of squares (WCSS)
        let wcss = 0;
        clusters.forEach((cluster, clusterIndex) => {
            const centroid = clusterCentroids[clusterIndex];
            cluster.points.forEach(pointIndex => {
                const point = data[pointIndex];
                const distance = calculateDistance(
                    point.x || point[0], point.y || point[1],
                    centroid.x, centroid.y
                );
                wcss += distance * distance;
            });
        });
        
        // Calculate CH index
        const k = clusters.length;
        const n = data.length;
        
        if (wcss === 0) return 0;
        
        return (bcss / (k - 1)) / (wcss / (n - k));
    }
    
    /**
     * Calculate Within-Cluster Sum of Squares (WCSS) / Inertia
     * Sum of squared distances from points to their cluster centroids
     * Range: [0, ∞], lower is better
     */
    static withinClusterSumOfSquares(data, clusters) {
        let wcss = 0;
        
        clusters.forEach(cluster => {
            let centroid;
            if (cluster.centroid) {
                centroid = cluster.centroid;
            } else {
                // Calculate centroid
                const points = cluster.points.map(index => data[index]);
                centroid = {
                    x: calculateMean(points.map(p => p.x || p[0])),
                    y: calculateMean(points.map(p => p.y || p[1]))
                };
            }
            
            cluster.points.forEach(pointIndex => {
                const point = data[pointIndex];
                const distance = calculateDistance(
                    point.x || point[0], point.y || point[1],
                    centroid.x, centroid.y
                );
                wcss += distance * distance;
            });
        });
        
        return wcss;
    }
    
    /**
     * Calculate Between-Cluster Sum of Squares (BCSS)
     * Measures separation between clusters
     * Range: [0, ∞], higher is better
     */
    static betweenClusterSumOfSquares(data, clusters) {
        // Calculate overall centroid
        const overallCentroid = {
            x: calculateMean(data.map(p => p.x || p[0])),
            y: calculateMean(data.map(p => p.y || p[1]))
        };
        
        let bcss = 0;
        
        clusters.forEach(cluster => {
            let centroid;
            if (cluster.centroid) {
                centroid = cluster.centroid;
            } else {
                const points = cluster.points.map(index => data[index]);
                centroid = {
                    x: calculateMean(points.map(p => p.x || p[0])),
                    y: calculateMean(points.map(p => p.y || p[1]))
                };
            }
            
            const distance = calculateDistance(
                centroid.x, centroid.y,
                overallCentroid.x, overallCentroid.y
            );
            
            bcss += cluster.points.length * distance * distance;
        });
        
        return bcss;
    }
    
    /**
     * Calculate Dunn Index
     * Ratio of minimum inter-cluster distance to maximum intra-cluster distance
     * Range: [0, ∞], higher is better
     */
    static dunnIndex(data, clusters) {
        if (clusters.length <= 1) return 0;
        
        // Calculate minimum inter-cluster distance
        let minInterClusterDistance = Infinity;
        
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const cluster1 = clusters[i];
                const cluster2 = clusters[j];
                
                let minDistance = Infinity;
                
                cluster1.points.forEach(point1Index => {
                    cluster2.points.forEach(point2Index => {
                        const point1 = data[point1Index];
                        const point2 = data[point2Index];
                        const distance = calculateDistance(
                            point1.x || point1[0], point1.y || point1[1],
                            point2.x || point2[0], point2.y || point2[1]
                        );
                        minDistance = Math.min(minDistance, distance);
                    });
                });
                
                minInterClusterDistance = Math.min(minInterClusterDistance, minDistance);
            }
        }
        
        // Calculate maximum intra-cluster distance
        let maxIntraClusterDistance = 0;
        
        clusters.forEach(cluster => {
            let maxDistance = 0;
            
            for (let i = 0; i < cluster.points.length; i++) {
                for (let j = i + 1; j < cluster.points.length; j++) {
                    const point1 = data[cluster.points[i]];
                    const point2 = data[cluster.points[j]];
                    const distance = calculateDistance(
                        point1.x || point1[0], point1.y || point1[1],
                        point2.x || point2[0], point2.y || point2[1]
                    );
                    maxDistance = Math.max(maxDistance, distance);
                }
            }
            
            maxIntraClusterDistance = Math.max(maxIntraClusterDistance, maxDistance);
        });
        
        return maxIntraClusterDistance > 0 ? minInterClusterDistance / maxIntraClusterDistance : 0;
    }
}

/**
 * External clustering quality metrics (require ground truth)
 */
export class ExternalMetrics {
    /**
     * Calculate Adjusted Rand Index (ARI)
     * Measures similarity between two clusterings
     * Range: [-1, 1], higher is better, 1 is perfect match
     */
    static adjustedRandIndex(predictedLabels, trueLabels) {
        if (predictedLabels.length !== trueLabels.length) {
            throw new Error('Predicted and true labels must have the same length');
        }
        
        const n = predictedLabels.length;
        const contingencyTable = this.buildContingencyTable(predictedLabels, trueLabels);
        
        // Calculate marginal sums
        const sumRows = [];
        const sumCols = [];
        let total = 0;
        
        contingencyTable.forEach((row, i) => {
            let rowSum = 0;
            row.forEach((value, j) => {
                rowSum += value;
                if (i === 0) sumCols[j] = 0;
                sumCols[j] += value;
                total += value;
            });
            sumRows[i] = rowSum;
        });
        
        // Calculate index
        let index = 0;
        let expectedIndex = 0;
        let maxIndex = 0;
        
        contingencyTable.forEach((row, i) => {
            row.forEach((nij, j) => {
                index += this.binomialCoeff(nij, 2);
            });
        });
        
        sumRows.forEach(sum => {
            maxIndex += this.binomialCoeff(sum, 2);
        });
        
        sumCols.forEach(sum => {
            expectedIndex += this.binomialCoeff(sum, 2);
        });
        
        expectedIndex = (expectedIndex * maxIndex) / this.binomialCoeff(total, 2);
        maxIndex = (maxIndex + expectedIndex) / 2;
        
        return maxIndex - expectedIndex !== 0 ? 
               (index - expectedIndex) / (maxIndex - expectedIndex) : 0;
    }
    
    /**
     * Calculate Normalized Mutual Information (NMI)
     * Measures mutual information between two clusterings
     * Range: [0, 1], higher is better, 1 is perfect match
     */
    static normalizedMutualInformation(predictedLabels, trueLabels) {
        if (predictedLabels.length !== trueLabels.length) {
            throw new Error('Predicted and true labels must have the same length');
        }
        
        const n = predictedLabels.length;
        const contingencyTable = this.buildContingencyTable(predictedLabels, trueLabels);
        
        // Calculate marginal distributions
        const pRows = [];
        const pCols = [];
        
        contingencyTable.forEach((row, i) => {
            let rowSum = 0;
            row.forEach((value, j) => {
                rowSum += value;
                if (i === 0) pCols[j] = 0;
                pCols[j] += value;
            });
            pRows[i] = rowSum / n;
        });
        
        pCols.forEach((value, i) => {
            pCols[i] = value / n;
        });
        
        // Calculate mutual information
        let mi = 0;
        contingencyTable.forEach((row, i) => {
            row.forEach((nij, j) => {
                if (nij > 0) {
                    const pij = nij / n;
                    mi += pij * Math.log2(pij / (pRows[i] * pCols[j]));
                }
            });
        });
        
        // Calculate entropies
        let hTrue = 0;
        let hPred = 0;
        
        pRows.forEach(p => {
            if (p > 0) hTrue -= p * Math.log2(p);
        });
        
        pCols.forEach(p => {
            if (p > 0) hPred -= p * Math.log2(p);
        });
        
        return (hTrue + hPred) > 0 ? (2 * mi) / (hTrue + hPred) : 0;
    }
    
    /**
     * Calculate Homogeneity Score
     * Measures if each cluster contains only members of a single class
     * Range: [0, 1], higher is better
     */
    static homogeneityScore(predictedLabels, trueLabels) {
        const { conditionalEntropy, classEntropy } = this.calculateEntropies(predictedLabels, trueLabels);
        return classEntropy > 0 ? 1 - (conditionalEntropy / classEntropy) : 1;
    }
    
    /**
     * Calculate Completeness Score
     * Measures if all members of a class are assigned to the same cluster
     * Range: [0, 1], higher is better
     */
    static completenessScore(predictedLabels, trueLabels) {
        const { conditionalEntropy, clusterEntropy } = this.calculateEntropies(trueLabels, predictedLabels);
        return clusterEntropy > 0 ? 1 - (conditionalEntropy / clusterEntropy) : 1;
    }
    
    /**
     * Calculate V-Measure Score
     * Harmonic mean of homogeneity and completeness
     * Range: [0, 1], higher is better
     */
    static vMeasureScore(predictedLabels, trueLabels, beta = 1.0) {
        const homogeneity = this.homogeneityScore(predictedLabels, trueLabels);
        const completeness = this.completenessScore(predictedLabels, trueLabels);
        
        if (homogeneity + completeness === 0) return 0;
        
        return ((1 + beta * beta) * homogeneity * completeness) / 
               (beta * beta * homogeneity + completeness);
    }
    
    /**
     * Build contingency table for two label arrays
     */
    static buildContingencyTable(labels1, labels2) {
        const uniqueLabels1 = [...new Set(labels1)];
        const uniqueLabels2 = [...new Set(labels2)];
        
        const table = [];
        uniqueLabels1.forEach((label1, i) => {
            table[i] = [];
            uniqueLabels2.forEach((label2, j) => {
                table[i][j] = 0;
            });
        });
        
        labels1.forEach((label1, index) => {
            const label2 = labels2[index];
            const i = uniqueLabels1.indexOf(label1);
            const j = uniqueLabels2.indexOf(label2);
            table[i][j]++;
        });
        
        return table;
    }
    
    /**
     * Calculate binomial coefficient (n choose k)
     */
    static binomialCoeff(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result = result * (n - i + 1) / i;
        }
        return result;
    }
    
    /**
     * Calculate entropies for homogeneity and completeness
     */
    static calculateEntropies(labels1, labels2) {
        const n = labels1.length;
        const contingencyTable = this.buildContingencyTable(labels1, labels2);
        
        // Calculate marginal distributions
        const clusterCounts = [];
        const classCounts = [];
        
        contingencyTable.forEach((row, i) => {
            let rowSum = 0;
            row.forEach((value, j) => {
                rowSum += value;
                if (i === 0) classCounts[j] = 0;
                classCounts[j] += value;
            });
            clusterCounts[i] = rowSum;
        });
        
        // Calculate conditional entropy H(C|K)
        let conditionalEntropy = 0;
        contingencyTable.forEach((row, i) => {
            const clusterSize = clusterCounts[i];
            if (clusterSize > 0) {
                row.forEach(nij => {
                    if (nij > 0) {
                        const prob = nij / clusterSize;
                        conditionalEntropy -= (clusterSize / n) * prob * Math.log2(prob);
                    }
                });
            }
        });
        
        // Calculate class entropy H(C)
        let classEntropy = 0;
        classCounts.forEach(count => {
            if (count > 0) {
                const prob = count / n;
                classEntropy -= prob * Math.log2(prob);
            }
        });
        
        // Calculate cluster entropy H(K)
        let clusterEntropy = 0;
        clusterCounts.forEach(count => {
            if (count > 0) {
                const prob = count / n;
                clusterEntropy -= prob * Math.log2(prob);
            }
        });
        
        return { conditionalEntropy, classEntropy, clusterEntropy };
    }
}

/**
 * Stability metrics for clustering robustness
 */
export class StabilityMetrics {
    /**
     * Calculate clustering stability using bootstrap sampling
     * Higher values indicate more stable clustering
     */
    static bootstrapStability(data, clusteringFunction, numBootstraps = 100, sampleRatio = 0.8) {
        const originalClustering = clusteringFunction(data);
        const similarities = [];
        
        for (let i = 0; i < numBootstraps; i++) {
            // Create bootstrap sample
            const sampleSize = Math.floor(data.length * sampleRatio);
            const sample = [];
            const sampleIndices = [];
            
            for (let j = 0; j < sampleSize; j++) {
                const randomIndex = Math.floor(Math.random() * data.length);
                sample.push(data[randomIndex]);
                sampleIndices.push(randomIndex);
            }
            
            // Apply clustering to sample
            const sampleClustering = clusteringFunction(sample);
            
            // Calculate similarity with original clustering
            const similarity = this.calculateClusteringSimilarity(
                originalClustering, 
                sampleClustering, 
                sampleIndices
            );
            
            similarities.push(similarity);
        }
        
        return calculateMean(similarities);
    }
    
    /**
     * Calculate similarity between two clusterings
     */
    static calculateClusteringSimilarity(clustering1, clustering2, indices = null) {
        if (!indices) {
            // Full comparison
            const labels1 = this.clusteringToLabels(clustering1);
            const labels2 = this.clusteringToLabels(clustering2);
            return ExternalMetrics.adjustedRandIndex(labels1, labels2);
        }
        
        // Partial comparison for bootstrap
        const labels1 = this.clusteringToLabels(clustering1, indices);
        const labels2 = this.clusteringToLabels(clustering2);
        return ExternalMetrics.adjustedRandIndex(labels1, labels2);
    }
    
    /**
     * Convert clustering structure to label array
     */
    static clusteringToLabels(clusters, indices = null) {
        const labels = [];
        
        clusters.forEach((cluster, clusterIndex) => {
            cluster.points.forEach(pointIndex => {
                if (!indices || indices.includes(pointIndex)) {
                    labels[pointIndex] = clusterIndex;
                }
            });
        });
        
        return indices ? indices.map(i => labels[i]) : labels;
    }
}

/**
 * Main Quality Assessment class
 */
export class ClusteringQualityAssessment {
    constructor() {
        this.cache = new Map();
    }
    
    /**
     * Comprehensive quality evaluation
     */
    evaluateQuality(data, clusters, trueLabels = null, options = {}) {
        const cacheKey = this.getCacheKey(data, clusters, trueLabels, options);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const evaluation = {
            internal: this.evaluateInternal(data, clusters),
            external: trueLabels ? this.evaluateExternal(data, clusters, trueLabels) : null,
            stability: options.evaluateStability ? 
                this.evaluateStability(data, options.clusteringFunction, options.stabilityOptions) : null,
            summary: {}
        };
        
        // Create summary scores
        evaluation.summary = this.createSummary(evaluation);
        
        this.cache.set(cacheKey, evaluation);
        return evaluation;
    }
    
    /**
     * Evaluate internal metrics
     */
    evaluateInternal(data, clusters) {
        return {
            silhouetteScore: InternalMetrics.silhouetteScore(data, clusters),
            daviesBouldinIndex: InternalMetrics.daviesBouldinIndex(data, clusters),
            calinskiHarabaszIndex: InternalMetrics.calinskiHarabaszIndex(data, clusters),
            withinClusterSS: InternalMetrics.withinClusterSumOfSquares(data, clusters),
            betweenClusterSS: InternalMetrics.betweenClusterSumOfSquares(data, clusters),
            dunnIndex: InternalMetrics.dunnIndex(data, clusters)
        };
    }
    
    /**
     * Evaluate external metrics
     */
    evaluateExternal(data, clusters, trueLabels) {
        const predictedLabels = StabilityMetrics.clusteringToLabels(clusters);
        
        return {
            adjustedRandIndex: ExternalMetrics.adjustedRandIndex(predictedLabels, trueLabels),
            normalizedMutualInfo: ExternalMetrics.normalizedMutualInformation(predictedLabels, trueLabels),
            homogeneityScore: ExternalMetrics.homogeneityScore(predictedLabels, trueLabels),
            completenessScore: ExternalMetrics.completenessScore(predictedLabels, trueLabels),
            vMeasureScore: ExternalMetrics.vMeasureScore(predictedLabels, trueLabels)
        };
    }
    
    /**
     * Evaluate stability metrics
     */
    evaluateStability(data, clusteringFunction, options = {}) {
        return {
            bootstrapStability: StabilityMetrics.bootstrapStability(
                data, 
                clusteringFunction, 
                options.numBootstraps || 50,
                options.sampleRatio || 0.8
            )
        };
    }
    
    /**
     * Create summary evaluation
     */
    createSummary(evaluation) {
        const summary = {
            overallScore: 0,
            internalScore: 0,
            externalScore: 0,
            stabilityScore: 0,
            recommendation: 'unknown'
        };
        
        // Calculate internal score (normalize to 0-1 scale)
        const internal = evaluation.internal;
        let internalComponents = [];
        
        // Silhouette score is already in [-1, 1], normalize to [0, 1]
        internalComponents.push((internal.silhouetteScore + 1) / 2);
        
        // Davies-Bouldin: lower is better, use inverse
        if (internal.daviesBouldinIndex > 0) {
            internalComponents.push(1 / (1 + internal.daviesBouldinIndex));
        }
        
        // Calinski-Harabasz: higher is better, normalize by typical range
        if (internal.calinskiHarabaszIndex > 0) {
            internalComponents.push(Math.min(1, internal.calinskiHarabaszIndex / 100));
        }
        
        // Dunn index: higher is better, normalize
        if (internal.dunnIndex > 0) {
            internalComponents.push(Math.min(1, internal.dunnIndex));
        }
        
        summary.internalScore = internalComponents.length > 0 ? 
            calculateMean(internalComponents) : 0;
        
        // Calculate external score
        if (evaluation.external) {
            const external = evaluation.external;
            const externalComponents = [
                Math.max(0, external.adjustedRandIndex), // Can be negative
                external.normalizedMutualInfo,
                external.homogeneityScore,
                external.completenessScore,
                external.vMeasureScore
            ];
            summary.externalScore = calculateMean(externalComponents);
        }
        
        // Calculate stability score
        if (evaluation.stability) {
            summary.stabilityScore = evaluation.stability.bootstrapStability;
        }
        
        // Calculate overall score
        const scores = [summary.internalScore];
        if (summary.externalScore > 0) scores.push(summary.externalScore);
        if (summary.stabilityScore > 0) scores.push(summary.stabilityScore);
        
        summary.overallScore = calculateMean(scores);
        
        // Generate recommendation
        summary.recommendation = this.generateRecommendation(summary);
        
        return summary;
    }
    
    /**
     * Generate clustering recommendation
     */
    generateRecommendation(summary) {
        const score = summary.overallScore;
        
        if (score >= 0.8) return 'excellent';
        if (score >= 0.7) return 'good';
        if (score >= 0.6) return 'fair';
        if (score >= 0.5) return 'poor';
        return 'very_poor';
    }
    
    /**
     * Create cache key for memoization
     */
    getCacheKey(data, clusters, trueLabels, options) {
        const dataHash = data.length;
        const clustersHash = clusters.map(c => c.points.length).join(',');
        const labelsHash = trueLabels ? trueLabels.join(',') : 'none';
        const optionsHash = JSON.stringify(options);
        
        return `${dataHash}_${clustersHash}_${labelsHash}_${optionsHash}`;
    }
    
    /**
     * Clear evaluation cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get quality metrics for cluster comparison
     */
    compareClusterings(data, clusterings, trueLabels = null) {
        const comparisons = [];
        
        clusterings.forEach((clusters, index) => {
            const evaluation = this.evaluateQuality(data, clusters, trueLabels);
            comparisons.push({
                index,
                clusters,
                evaluation,
                score: evaluation.summary.overallScore
            });
        });
        
        // Sort by overall score (descending)
        comparisons.sort((a, b) => b.score - a.score);
        
        return comparisons;
    }
}

// Create global instance
export const qualityAssessment = new ClusteringQualityAssessment();

// Export everything
export default {
    InternalMetrics,
    ExternalMetrics,
    StabilityMetrics,
    ClusteringQualityAssessment,
    qualityAssessment
};