/**
 * Data Validator Module for NCS-API-Website
 * Comprehensive data quality assessment and validation for clustering algorithms
 * Provides detailed reports on data integrity, clustering suitability, and recommendations
 */

import { EventBus } from '../core/eventBus.js';
import { calculateDistance } from '../utils/math.js';

export class DataValidator {
    constructor(options = {}) {
        this.options = {
            strictMode: options.strictMode || false,
            maxMissingPercentage: options.maxMissingPercentage || 20,
            minClusterSize: options.minClusterSize || 2,
            maxOutlierPercentage: options.maxOutlierPercentage || 10,
            correlationThreshold: options.correlationThreshold || 0.95,
            ...options
        };

        // Validation rules and weights
        this.validationRules = [
            { name: 'data_completeness', weight: 0.25 },
            { name: 'data_consistency', weight: 0.20 },
            { name: 'clustering_suitability', weight: 0.20 },
            { name: 'feature_quality', weight: 0.15 },
            { name: 'outlier_analysis', weight: 0.10 },
            { name: 'correlation_analysis', weight: 0.10 }
        ];

        // Statistical thresholds
        this.thresholds = {
            variance: {
                min: 1e-6,  // Minimum variance for meaningful features
                max: 1e6    // Maximum variance to detect anomalies
            },
            skewness: {
                normal: 0.5,    // Acceptable skewness
                moderate: 1.0,  // Moderate skewness
                high: 2.0       // High skewness
            },
            kurtosis: {
                normal: 3,      // Normal kurtosis
                moderate: 5,    // Moderate kurtosis
                high: 10        // High kurtosis
            }
        };
    }

    /**
     * Comprehensive data validation
     * @param {Array} data - Input data array
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation report
     */
    async validateData(data, options = {}) {
        try {
            const startTime = performance.now();
            const validationOptions = { ...this.options, ...options };
            
            // Initialize validation report
            const report = {
                timestamp: Date.now(),
                options: validationOptions,
                data: {
                    totalRecords: data.length,
                    totalFeatures: 0,
                    numericFeatures: 0,
                    categoricalFeatures: 0
                },
                results: {},
                issues: [],
                recommendations: [],
                score: 0,
                status: 'unknown'
            };

            // Basic data structure validation
            await this.validateDataStructure(data, report);
            
            if (report.data.totalRecords === 0) {
                report.status = 'failed';
                report.issues.push({
                    type: 'critical',
                    category: 'data_structure',
                    message: 'No data records found',
                    severity: 'high'
                });
                return report;
            }

            // Extract features
            const features = this.extractFeatures(data);
            report.data.totalFeatures = features.all.length;
            report.data.numericFeatures = features.numeric.length;
            report.data.categoricalFeatures = features.categorical.length;

            // Run all validation checks
            await this.runDataCompletenessCheck(data, features, report);
            await this.runDataConsistencyCheck(data, features, report);
            await this.runClusteringSuitabilityCheck(data, features, report);
            await this.runFeatureQualityCheck(data, features, report);
            await this.runOutlierAnalysis(data, features, report);
            await this.runCorrelationAnalysis(data, features, report);

            // Calculate overall score
            this.calculateOverallScore(report);
            
            // Generate recommendations
            await this.generateRecommendations(report);
            
            // Determine final status
            this.determineFinalStatus(report);

            const endTime = performance.now();
            report.executionTime = Math.round(endTime - startTime);

            EventBus.emit('validator:validation_complete', {
                report,
                score: report.score,
                issues: report.issues.length,
                recommendations: report.recommendations.length
            });

            return report;

        } catch (error) {
            EventBus.emit('validator:validation_error', { error: error.message });
            throw new Error(`Validation failed: ${error.message}`);
        }
    }

    /**
     * Validate basic data structure
     * @param {Array} data - Input data
     * @param {Object} report - Validation report
     */
    async validateDataStructure(data, report) {
        const issues = [];

        // Check if data is array
        if (!Array.isArray(data)) {
            issues.push({
                type: 'critical',
                category: 'data_structure',
                message: 'Data must be an array',
                severity: 'high'
            });
            report.issues.push(...issues);
            return;
        }

        // Check for empty data
        if (data.length === 0) {
            issues.push({
                type: 'critical',
                category: 'data_structure',
                message: 'Data array is empty',
                severity: 'high'
            });
        }

        // Check for minimum records
        if (data.length < this.options.minClusterSize) {
            issues.push({
                type: 'warning',
                category: 'data_structure',
                message: `Insufficient records for clustering (${data.length} < ${this.options.minClusterSize})`,
                severity: 'medium'
            });
        }

        // Check record structure consistency
        if (data.length > 0) {
            const firstRecord = data[0];
            const expectedKeys = Object.keys(firstRecord);
            
            for (let i = 1; i < Math.min(data.length, 100); i++) { // Sample first 100 records
                const currentKeys = Object.keys(data[i]);
                
                if (expectedKeys.length !== currentKeys.length) {
                    issues.push({
                        type: 'error',
                        category: 'data_structure',
                        message: `Inconsistent record structure at index ${i}`,
                        severity: 'medium',
                        details: {
                            expected: expectedKeys.length,
                            actual: currentKeys.length,
                            index: i
                        }
                    });
                    break;
                }
            }
        }

        report.issues.push(...issues);
        report.results.data_structure = {
            passed: issues.filter(i => i.type === 'critical').length === 0,
            issues: issues.length,
            details: {
                totalRecords: data.length,
                structureConsistent: issues.filter(i => i.category === 'data_structure').length === 0
            }
        };
    }

    /**
     * Extract and categorize features
     * @param {Array} data - Input data
     * @returns {Object} Feature categorization
     */
    extractFeatures(data) {
        if (data.length === 0) {
            return { all: [], numeric: [], categorical: [], datetime: [] };
        }

        const firstRecord = data[0];
        const features = {
            all: Object.keys(firstRecord),
            numeric: [],
            categorical: [],
            datetime: []
        };

        features.all.forEach(feature => {
            const sampleValues = data.slice(0, 100).map(record => record[feature]);
            const nonNullValues = sampleValues.filter(val => val !== null && val !== undefined && val !== '');
            
            if (nonNullValues.length === 0) return;

            // Determine feature type
            const numericCount = nonNullValues.filter(val => typeof val === 'number' || !isNaN(Number(val))).length;
            const dateCount = nonNullValues.filter(val => {
                const date = new Date(val);
                return date instanceof Date && !isNaN(date);
            }).length;

            if (numericCount / nonNullValues.length > 0.8) {
                features.numeric.push(feature);
            } else if (dateCount / nonNullValues.length > 0.8) {
                features.datetime.push(feature);
            } else {
                features.categorical.push(feature);
            }
        });

        return features;
    }

    /**
     * Run data completeness check
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runDataCompletenessCheck(data, features, report) {
        const results = {
            overall: {},
            byFeature: {},
            issues: []
        };

        let totalCells = 0;
        let missingCells = 0;

        features.all.forEach(feature => {
            const values = data.map(record => record[feature]);
            const missing = values.filter(val => val === null || val === undefined || val === '').length;
            const missingPercentage = (missing / values.length) * 100;

            totalCells += values.length;
            missingCells += missing;

            results.byFeature[feature] = {
                total: values.length,
                missing: missing,
                missingPercentage: Math.round(missingPercentage * 100) / 100,
                complete: values.length - missing
            };

            // Check against threshold
            if (missingPercentage > this.options.maxMissingPercentage) {
                results.issues.push({
                    type: 'warning',
                    category: 'data_completeness',
                    message: `Feature '${feature}' has ${missingPercentage.toFixed(1)}% missing values`,
                    severity: missingPercentage > 50 ? 'high' : 'medium',
                    feature: feature,
                    missingPercentage: missingPercentage
                });
            }
        });

        const overallMissingPercentage = (missingCells / totalCells) * 100;
        results.overall = {
            totalCells,
            missingCells,
            missingPercentage: Math.round(overallMissingPercentage * 100) / 100,
            completeness: Math.round((100 - overallMissingPercentage) * 100) / 100
        };

        // Overall assessment
        const passed = overallMissingPercentage <= this.options.maxMissingPercentage;
        
        report.results.data_completeness = {
            passed,
            score: Math.max(0, 100 - overallMissingPercentage * 2), // Penalty for missing data
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Run data consistency check
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runDataConsistencyCheck(data, features, report) {
        const results = {
            typeConsistency: {},
            valueRanges: {},
            duplicates: {},
            issues: []
        };

        // Check type consistency
        features.numeric.forEach(feature => {
            const values = data.map(record => record[feature]).filter(val => val !== null && val !== undefined);
            const numericValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)));
            const consistency = (numericValues.length / values.length) * 100;
            
            results.typeConsistency[feature] = {
                expected: 'numeric',
                consistency: Math.round(consistency * 100) / 100,
                inconsistentCount: values.length - numericValues.length
            };

            if (consistency < 95) {
                results.issues.push({
                    type: 'warning',
                    category: 'data_consistency',
                    message: `Feature '${feature}' has inconsistent numeric types (${consistency.toFixed(1)}% consistent)`,
                    severity: 'medium',
                    feature: feature
                });
            }
        });

        // Check for duplicate records
        const recordHashes = new Set();
        const duplicateIndices = [];
        
        data.forEach((record, index) => {
            const hash = JSON.stringify(record);
            if (recordHashes.has(hash)) {
                duplicateIndices.push(index);
            } else {
                recordHashes.add(hash);
            }
        });

        results.duplicates = {
            total: duplicateIndices.length,
            percentage: (duplicateIndices.length / data.length) * 100,
            indices: duplicateIndices.slice(0, 10) // Limit to first 10 for performance
        };

        if (results.duplicates.percentage > 5) {
            results.issues.push({
                type: 'warning',
                category: 'data_consistency',
                message: `${results.duplicates.percentage.toFixed(1)}% duplicate records found`,
                severity: results.duplicates.percentage > 20 ? 'high' : 'medium'
            });
        }

        // Value range analysis for numeric features
        features.numeric.forEach(feature => {
            const values = data.map(record => record[feature])
                              .filter(val => val !== null && val !== undefined)
                              .map(val => Number(val))
                              .filter(val => !isNaN(val));
            
            if (values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                
                results.valueRanges[feature] = {
                    min,
                    max,
                    range,
                    hasNegatives: min < 0,
                    hasZeros: values.includes(0),
                    uniqueValues: new Set(values).size
                };

                // Check for suspicious ranges
                if (range === 0 && values.length > 1) {
                    results.issues.push({
                        type: 'warning',
                        category: 'data_consistency',
                        message: `Feature '${feature}' has no variance (all values are ${min})`,
                        severity: 'high',
                        feature: feature
                    });
                }
            }
        });

        const consistencyScore = Math.max(0, 100 - results.issues.length * 10);
        
        report.results.data_consistency = {
            passed: results.issues.filter(i => i.severity === 'high').length === 0,
            score: consistencyScore,
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Run clustering suitability check
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runClusteringSuitabilityCheck(data, features, report) {
        const results = {
            dimensionality: {},
            separability: {},
            density: {},
            issues: []
        };

        // Check dimensionality
        const numericFeatureCount = features.numeric.length;
        results.dimensionality = {
            numericFeatures: numericFeatureCount,
            totalFeatures: features.all.length,
            ratio: numericFeatureCount / features.all.length,
            suitable: numericFeatureCount >= 2
        };

        if (numericFeatureCount < 2) {
            results.issues.push({
                type: 'error',
                category: 'clustering_suitability',
                message: `Insufficient numeric features for clustering (${numericFeatureCount} < 2)`,
                severity: 'high'
            });
        }

        // Hopkins statistic for clustering tendency
        if (numericFeatureCount >= 2 && data.length >= 10) {
            const hopkinsStatistic = this.calculateHopkinsStatistic(data, features.numeric);
            results.separability = {
                hopkinsStatistic: Math.round(hopkinsStatistic * 1000) / 1000,
                interpretation: this.interpretHopkinsStatistic(hopkinsStatistic),
                suitable: hopkinsStatistic < 0.5
            };

            if (hopkinsStatistic > 0.75) {
                results.issues.push({
                    type: 'warning',
                    category: 'clustering_suitability',
                    message: `Data appears to be uniformly distributed (Hopkins: ${hopkinsStatistic.toFixed(3)})`,
                    severity: 'medium'
                });
            }
        }

        // Data density analysis
        if (data.length > 0) {
            const densityRatio = numericFeatureCount > 0 ? data.length / Math.pow(numericFeatureCount, 2) : 0;
            results.density = {
                recordsPerDimension: Math.round(densityRatio * 100) / 100,
                suitable: densityRatio > 5,
                sparsity: densityRatio < 2 ? 'high' : densityRatio < 5 ? 'medium' : 'low'
            };

            if (densityRatio < 2) {
                results.issues.push({
                    type: 'warning',
                    category: 'clustering_suitability',
                    message: 'Data may be too sparse for effective clustering',
                    severity: 'medium'
                });
            }
        }

        const suitabilityScore = Math.max(0, 100 - results.issues.length * 20);
        
        report.results.clustering_suitability = {
            passed: results.issues.filter(i => i.severity === 'high').length === 0,
            score: suitabilityScore,
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Calculate Hopkins statistic for clustering tendency
     * @param {Array} data - Input data
     * @param {Array} numericFeatures - Numeric feature names
     * @returns {Number} Hopkins statistic
     */
    calculateHopkinsStatistic(data, numericFeatures, sampleSize = Math.min(50, Math.floor(data.length * 0.1))) {
        if (data.length < 10 || numericFeatures.length === 0) return 0.5;

        // Extract numeric data matrix
        const matrix = data.map(record => 
            numericFeatures.map(feature => Number(record[feature]) || 0)
        );

        // Calculate feature ranges for uniform sampling
        const ranges = numericFeatures.map((feature, index) => {
            const values = matrix.map(row => row[index]);
            return {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });

        let distancesToReal = [];
        let distancesToUniform = [];

        // Sample random points and calculate distances
        for (let i = 0; i < sampleSize; i++) {
            // Random real data point
            const realIndex = Math.floor(Math.random() * matrix.length);
            const realPoint = matrix[realIndex];
            
            // Find nearest neighbor distance
            let minDistReal = Infinity;
            for (let j = 0; j < matrix.length; j++) {
                if (j !== realIndex) {
                    const dist = this.calculateEuclideanDistance(realPoint, matrix[j]);
                    minDistReal = Math.min(minDistReal, dist);
                }
            }
            distancesToReal.push(minDistReal);

            // Random uniform point
            const uniformPoint = ranges.map(range => 
                Math.random() * (range.max - range.min) + range.min
            );
            
            // Find nearest neighbor distance to real data
            let minDistUniform = Infinity;
            for (let j = 0; j < matrix.length; j++) {
                const dist = this.calculateEuclideanDistance(uniformPoint, matrix[j]);
                minDistUniform = Math.min(minDistUniform, dist);
            }
            distancesToUniform.push(minDistUniform);
        }

        // Calculate Hopkins statistic
        const sumReal = distancesToReal.reduce((sum, dist) => sum + dist, 0);
        const sumUniform = distancesToUniform.reduce((sum, dist) => sum + dist, 0);
        
        return sumUniform / (sumReal + sumUniform);
    }

    /**
     * Calculate Euclidean distance between two points
     * @param {Array} point1 - First point
     * @param {Array} point2 - Second point
     * @returns {Number} Euclidean distance
     */
    calculateEuclideanDistance(point1, point2) {
        if (point1.length !== point2.length) return Infinity;
        
        let sumSquares = 0;
        for (let i = 0; i < point1.length; i++) {
            const diff = point1[i] - point2[i];
            sumSquares += diff * diff;
        }
        return Math.sqrt(sumSquares);
    }

    /**
     * Interpret Hopkins statistic
     * @param {Number} hopkins - Hopkins statistic value
     * @returns {String} Interpretation
     */
    interpretHopkinsStatistic(hopkins) {
        if (hopkins < 0.3) return 'highly_clusterable';
        if (hopkins < 0.5) return 'moderately_clusterable';
        if (hopkins < 0.7) return 'weakly_clusterable';
        return 'uniform_distribution';
    }

    /**
     * Run feature quality check
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runFeatureQualityCheck(data, features, report) {
        const results = {
            statistics: {},
            distributions: {},
            issues: []
        };

        features.numeric.forEach(feature => {
            const values = data.map(record => Number(record[feature]))
                              .filter(val => !isNaN(val));
            
            if (values.length === 0) return;

            // Calculate basic statistics
            const stats = this.calculateFeatureStatistics(values);
            results.statistics[feature] = stats;

            // Check for quality issues
            if (stats.variance < this.thresholds.variance.min) {
                results.issues.push({
                    type: 'warning',
                    category: 'feature_quality',
                    message: `Feature '${feature}' has very low variance (${stats.variance.toExponential(2)})`,
                    severity: 'medium',
                    feature: feature
                });
            }

            if (Math.abs(stats.skewness) > this.thresholds.skewness.high) {
                results.issues.push({
                    type: 'info',
                    category: 'feature_quality',
                    message: `Feature '${feature}' is highly skewed (${stats.skewness.toFixed(2)})`,
                    severity: 'low',
                    feature: feature
                });
            }

            if (stats.kurtosis > this.thresholds.kurtosis.high) {
                results.issues.push({
                    type: 'info',
                    category: 'feature_quality',
                    message: `Feature '${feature}' has high kurtosis (${stats.kurtosis.toFixed(2)})`,
                    severity: 'low',
                    feature: feature
                });
            }

            // Distribution analysis
            results.distributions[feature] = this.analyzeDistribution(values);
        });

        const qualityScore = Math.max(0, 100 - results.issues.filter(i => i.severity !== 'low').length * 15);
        
        report.results.feature_quality = {
            passed: results.issues.filter(i => i.severity === 'high').length === 0,
            score: qualityScore,
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Calculate comprehensive feature statistics
     * @param {Array} values - Numeric values
     * @returns {Object} Statistical measures
     */
    calculateFeatureStatistics(values) {
        if (values.length === 0) return null;

        const n = values.length;
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        
        // Skewness
        const skewness = n > 2 ? 
            (values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) * n) / ((n - 1) * (n - 2)) : 0;
        
        // Kurtosis
        const kurtosis = n > 3 ? 
            (values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) - 3 : 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(n * 0.25)];
        const median = sorted[Math.floor(n * 0.5)];
        const q3 = sorted[Math.floor(n * 0.75)];
        
        return {
            count: n,
            mean: Math.round(mean * 1000) / 1000,
            median: Math.round(median * 1000) / 1000,
            min: Math.min(...values),
            max: Math.max(...values),
            variance: Math.round(variance * 1000) / 1000,
            stdDev: Math.round(stdDev * 1000) / 1000,
            skewness: Math.round(skewness * 1000) / 1000,
            kurtosis: Math.round(kurtosis * 1000) / 1000,
            q1: Math.round(q1 * 1000) / 1000,
            q3: Math.round(q3 * 1000) / 1000,
            iqr: Math.round((q3 - q1) * 1000) / 1000,
            cv: stdDev / Math.abs(mean) // Coefficient of variation
        };
    }

    /**
     * Analyze value distribution
     * @param {Array} values - Numeric values
     * @returns {Object} Distribution analysis
     */
    analyzeDistribution(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const n = values.length;
        
        // Create histogram bins
        const bins = Math.min(20, Math.ceil(Math.sqrt(n)));
        const min = sorted[0];
        const max = sorted[n - 1];
        const binWidth = (max - min) / bins;
        
        const histogram = new Array(bins).fill(0);
        values.forEach(val => {
            const binIndex = Math.min(bins - 1, Math.floor((val - min) / binWidth));
            histogram[binIndex]++;
        });
        
        // Detect distribution patterns
        const maxFreq = Math.max(...histogram);
        const mode = histogram.indexOf(maxFreq);
        
        return {
            histogram,
            bins,
            binWidth: Math.round(binWidth * 1000) / 1000,
            mode: min + mode * binWidth,
            maxFrequency: maxFreq,
            uniformity: this.calculateUniformity(histogram)
        };
    }

    /**
     * Calculate distribution uniformity
     * @param {Array} histogram - Histogram frequencies
     * @returns {Number} Uniformity score (0-1)
     */
    calculateUniformity(histogram) {
        const n = histogram.length;
        const expectedFreq = histogram.reduce((sum, freq) => sum + freq, 0) / n;
        
        const chiSquare = histogram.reduce((sum, freq) => {
            return sum + Math.pow(freq - expectedFreq, 2) / expectedFreq;
        }, 0);
        
        // Normalize chi-square to 0-1 scale
        return Math.max(0, 1 - (chiSquare / (n * expectedFreq)));
    }

    /**
     * Run outlier analysis
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runOutlierAnalysis(data, features, report) {
        const results = {
            methods: {},
            summary: {},
            outlierIndices: new Set(),
            issues: []
        };

        // IQR method for each numeric feature
        features.numeric.forEach(feature => {
            const outliers = this.detectOutliersIQR(data, feature);
            results.methods[`${feature}_iqr`] = outliers;
            outliers.indices.forEach(idx => results.outlierIndices.add(idx));
        });

        // Multivariate outlier detection using Mahalanobis distance
        if (features.numeric.length >= 2) {
            const mahalanobisOutliers = this.detectOutliersMahalanobis(data, features.numeric);
            results.methods.mahalanobis = mahalanobisOutliers;
            mahalanobisOutliers.indices.forEach(idx => results.outlierIndices.add(idx));
        }

        // Summary
        const totalOutliers = results.outlierIndices.size;
        const outlierPercentage = (totalOutliers / data.length) * 100;
        
        results.summary = {
            totalOutliers,
            outlierPercentage: Math.round(outlierPercentage * 100) / 100,
            methods: Object.keys(results.methods).length
        };

        // Check against threshold
        if (outlierPercentage > this.options.maxOutlierPercentage) {
            results.issues.push({
                type: 'warning',
                category: 'outlier_analysis',
                message: `High outlier percentage detected (${outlierPercentage.toFixed(1)}%)`,
                severity: outlierPercentage > 25 ? 'high' : 'medium'
            });
        }

        const outlierScore = Math.max(0, 100 - outlierPercentage * 2);
        
        report.results.outlier_analysis = {
            passed: outlierPercentage <= this.options.maxOutlierPercentage,
            score: outlierScore,
            ...results,
            outlierIndices: Array.from(results.outlierIndices).slice(0, 100) // Limit for performance
        };

        report.issues.push(...results.issues);
    }

    /**
     * Detect outliers using IQR method
     * @param {Array} data - Input data
     * @param {String} feature - Feature name
     * @returns {Object} Outlier detection results
     */
    detectOutliersIQR(data, feature) {
        const values = data.map((record, index) => ({
            value: Number(record[feature]),
            index
        })).filter(item => !isNaN(item.value));

        if (values.length === 0) {
            return { indices: [], count: 0, threshold: null };
        }

        const sorted = values.map(item => item.value).sort((a, b) => a - b);
        const n = sorted.length;
        
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;
        
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outlierIndices = values
            .filter(item => item.value < lowerBound || item.value > upperBound)
            .map(item => item.index);

        return {
            indices: outlierIndices,
            count: outlierIndices.length,
            threshold: { lowerBound, upperBound, q1, q3, iqr },
            feature
        };
    }

    /**
     * Detect multivariate outliers using Mahalanobis distance
     * @param {Array} data - Input data
     * @param {Array} numericFeatures - Numeric feature names
     * @returns {Object} Outlier detection results
     */
    detectOutliersMahalanobis(data, numericFeatures) {
        // This is a simplified implementation
        // In practice, you'd want to use a proper statistical library
        
        const matrix = data.map((record, index) => ({
            values: numericFeatures.map(feature => Number(record[feature]) || 0),
            index
        }));

        if (matrix.length < numericFeatures.length + 1) {
            return { indices: [], count: 0, threshold: null };
        }

        // Calculate means
        const means = numericFeatures.map((_, featureIndex) => {
            const sum = matrix.reduce((sum, row) => sum + row.values[featureIndex], 0);
            return sum / matrix.length;
        });

        // Simplified Mahalanobis distance (assuming independence)
        const distances = matrix.map(row => {
            const sumSquares = row.values.reduce((sum, value, index) => {
                const diff = value - means[index];
                return sum + diff * diff;
            }, 0);
            return {
                distance: Math.sqrt(sumSquares),
                index: row.index
            };
        });

        // Use 95th percentile as threshold
        const sortedDistances = distances.map(d => d.distance).sort((a, b) => a - b);
        const threshold = sortedDistances[Math.floor(sortedDistances.length * 0.95)];
        
        const outlierIndices = distances
            .filter(item => item.distance > threshold)
            .map(item => item.index);

        return {
            indices: outlierIndices,
            count: outlierIndices.length,
            threshold,
            method: 'mahalanobis_simplified'
        };
    }

    /**
     * Run correlation analysis
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runCorrelationAnalysis(data, features, report) {
        const results = {
            matrix: {},
            highCorrelations: [],
            multicollinearity: {},
            issues: []
        };

        if (features.numeric.length < 2) {
            report.results.correlation_analysis = {
                passed: true,
                score: 100,
                message: 'Insufficient numeric features for correlation analysis',
                ...results
            };
            return;
        }

        // Calculate correlation matrix
        for (let i = 0; i < features.numeric.length; i++) {
            results.matrix[features.numeric[i]] = {};
            
            for (let j = 0; j < features.numeric.length; j++) {
                const correlation = this.calculatePearsonCorrelation(
                    data, features.numeric[i], features.numeric[j]
                );
                results.matrix[features.numeric[i]][features.numeric[j]] = correlation;
                
                // Detect high correlations (excluding self-correlation)
                if (i !== j && Math.abs(correlation) > this.options.correlationThreshold) {
                    results.highCorrelations.push({
                        feature1: features.numeric[i],
                        feature2: features.numeric[j],
                        correlation: Math.round(correlation * 1000) / 1000
                    });
                }
            }
        }

        // Check for multicollinearity issues
        results.highCorrelations.forEach(item => {
            if (Math.abs(item.correlation) > 0.9) {
                results.issues.push({
                    type: 'warning',
                    category: 'correlation_analysis',
                    message: `High correlation between '${item.feature1}' and '${item.feature2}' (${item.correlation.toFixed(3)})`,
                    severity: 'medium',
                    features: [item.feature1, item.feature2]
                });
            }
        });

        const correlationScore = Math.max(0, 100 - results.issues.length * 20);
        
        report.results.correlation_analysis = {
            passed: results.issues.length === 0,
            score: correlationScore,
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Calculate Pearson correlation coefficient
     * @param {Array} data - Input data
     * @param {String} feature1 - First feature
     * @param {String} feature2 - Second feature
     * @returns {Number} Correlation coefficient
     */
    calculatePearsonCorrelation(data, feature1, feature2) {
        const pairs = data.map(record => ({
            x: Number(record[feature1]),
            y: Number(record[feature2])
        })).filter(pair => !isNaN(pair.x) && !isNaN(pair.y));

        if (pairs.length < 2) return 0;

        const n = pairs.length;
        const sumX = pairs.reduce((sum, pair) => sum + pair.x, 0);
        const sumY = pairs.reduce((sum, pair) => sum + pair.y, 0);
        const sumXY = pairs.reduce((sum, pair) => sum + pair.x * pair.y, 0);
        const sumXX = pairs.reduce((sum, pair) => sum + pair.x * pair.x, 0);
        const sumYY = pairs.reduce((sum, pair) => sum + pair.y * pair.y, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Calculate overall validation score
     * @param {Object} report - Validation report
     */
    calculateOverallScore(report) {
        let weightedScore = 0;
        let totalWeight = 0;

        this.validationRules.forEach(rule => {
            const result = report.results[rule.name];
            if (result && typeof result.score === 'number') {
                weightedScore += result.score * rule.weight;
                totalWeight += rule.weight;
            }
        });

        report.score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    }

    /**
     * Generate recommendations based on validation results
     * @param {Object} report - Validation report
     */
    async generateRecommendations(report) {
        const recommendations = [];

        // Data completeness recommendations
        if (report.results.data_completeness && !report.results.data_completeness.passed) {
            recommendations.push({
                category: 'data_completeness',
                priority: 'high',
                title: 'Address Missing Data',
                description: 'Consider data imputation strategies or removing features with excessive missing values',
                actions: [
                    'Use mean/median imputation for numeric features',
                    'Use mode imputation for categorical features',
                    'Consider removing features with >30% missing values',
                    'Investigate patterns in missing data'
                ]
            });
        }

        // Clustering suitability recommendations
        if (report.results.clustering_suitability && !report.results.clustering_suitability.passed) {
            recommendations.push({
                category: 'clustering_suitability',
                priority: 'high',
                title: 'Improve Clustering Suitability',
                description: 'Data structure may not be optimal for clustering algorithms',
                actions: [
                    'Ensure at least 2 numeric features are available',
                    'Consider feature engineering to create more discriminative features',
                    'Apply dimensionality reduction techniques if high-dimensional',
                    'Increase sample size if data is sparse'
                ]
            });
        }

        // Feature quality recommendations
        const lowVarianceFeatures = Object.entries(report.results.feature_quality?.statistics || {})
            .filter(([_, stats]) => stats.variance < this.thresholds.variance.min)
            .map(([feature, _]) => feature);

        if (lowVarianceFeatures.length > 0) {
            recommendations.push({
                category: 'feature_quality',
                priority: 'medium',
                title: 'Address Low-Variance Features',
                description: `Features with low variance may not contribute to clustering: ${lowVarianceFeatures.join(', ')}`,
                actions: [
                    'Consider removing constant or near-constant features',
                    'Apply feature scaling or transformation',
                    'Investigate data collection process for these features'
                ]
            });
        }

        // Outlier recommendations
        if (report.results.outlier_analysis && report.results.outlier_analysis.summary.outlierPercentage > 10) {
            recommendations.push({
                category: 'outliers',
                priority: 'medium',
                title: 'Handle Outliers',
                description: `High percentage of outliers detected (${report.results.outlier_analysis.summary.outlierPercentage.toFixed(1)}%)`,
                actions: [
                    'Investigate outliers to determine if they are data errors',
                    'Consider robust clustering algorithms (DBSCAN, etc.)',
                    'Apply outlier removal or transformation techniques',
                    'Use outlier-resistant preprocessing methods'
                ]
            });
        }

        // Correlation recommendations
        if (report.results.correlation_analysis && report.results.correlation_analysis.highCorrelations.length > 0) {
            recommendations.push({
                category: 'correlations',
                priority: 'low',
                title: 'Address Feature Correlations',
                description: 'High correlations between features detected',
                actions: [
                    'Consider removing redundant features',
                    'Apply principal component analysis (PCA)',
                    'Use correlation-based feature selection',
                    'Monitor for multicollinearity effects'
                ]
            });
        }

        report.recommendations = recommendations;
    }

    /**
     * Determine final validation status
     * @param {Object} report - Validation report
     */
    determineFinalStatus(report) {
        const criticalIssues = report.issues.filter(issue => issue.severity === 'high').length;
        const majorIssues = report.issues.filter(issue => issue.severity === 'medium').length;
        
        if (criticalIssues > 0) {
            report.status = 'failed';
        } else if (majorIssues > 3 || report.score < 60) {
            report.status = 'warning';
        } else {
            report.status = 'passed';
        }
    }

    /**
     * Generate validation summary report
     * @param {Object} report - Full validation report
     * @returns {String} Summary text
     */
    generateSummary(report) {
        const statusEmoji = {
            'passed': '✅',
            'warning': '⚠️',
            'failed': '❌'
        };

        const criticalCount = report.issues.filter(i => i.severity === 'high').length;
        const warningCount = report.issues.filter(i => i.severity === 'medium').length;
        
        let summary = `${statusEmoji[report.status]} Validation ${report.status.toUpperCase()}\n`;
        summary += `Overall Score: ${report.score}/100\n`;
        summary += `Data Quality: ${report.data.totalRecords} records, ${report.data.numericFeatures} numeric features\n`;
        
        if (criticalCount > 0) {
            summary += `⚠️ ${criticalCount} critical issues requiring attention\n`;
        }
        
        if (warningCount > 0) {
            summary += `⚠️ ${warningCount} warnings to consider\n`;
        }
        
        if (report.recommendations.length > 0) {
            summary += `💡 ${report.recommendations.length} recommendations available\n`;
        }

        return summary;
    }
}

// Export for use
export default DataValidator;