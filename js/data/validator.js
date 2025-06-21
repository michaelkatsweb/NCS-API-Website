/**
 * FILE: js/data/validator.js
 * Data Validation System for NCS-API Website
 * FIXED: Completed incomplete ternary operator
 */

import { EventBus } from '../core/eventBusNew.js';

/**
 * Data Validation Class
 * Comprehensive validation system for clustering data
 */
export class DataValidator {
    constructor(options = {}) {
        this.options = {
            maxMissingPercentage: 20,        // Max allowed missing data percentage
            minClusterSize: 3,               // Minimum records for clustering
            correlationThreshold: 0.8,       // High correlation threshold
            maxCategoricalCardinality: 50,   // Max unique values for categorical
            outlierThreshold: 3,             // Z-score threshold for outliers
            minFeatureVariance: 0.01,        // Minimum variance for features
            ...options
        };

        this.thresholds = {
            variance: { min: 0.01, low: 0.1 },
            correlation: { high: 0.8, veryHigh: 0.95 },
            missing: { warning: 10, critical: 30 },
            outliers: { warning: 5, critical: 15 }
        };

        this.validationRules = [
            { name: 'data_completeness', weight: 0.25 },
            { name: 'data_consistency', weight: 0.20 },
            { name: 'clustering_suitability', weight: 0.25 },
            { name: 'feature_quality', weight: 0.15 },
            { name: 'outlier_analysis', weight: 0.10 },
            { name: 'correlation_analysis', weight: 0.05 }
        ];
    }

    /**
     * Main validation entry point
     * @param {Array} data - Array of data objects
     * @param {Object} options - Validation options
     * @returns {Object} Validation report
     */
    async validate(data, options = {}) {
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
            
            for (let i = 1; i < Math.min(data.length, 100); i++) {
                const currentKeys = Object.keys(data[i]);
                if (currentKeys.length !== expectedKeys.length ||
                    !currentKeys.every(key => expectedKeys.includes(key))) {
                    issues.push({
                        type: 'warning',
                        category: 'data_structure',
                        message: `Inconsistent record structure at index ${i}`,
                        severity: 'medium'
                    });
                    break;
                }
            }
        }

        report.issues.push(...issues);
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

        const features = {
            all: Object.keys(data[0]),
            numeric: [],
            categorical: [],
            datetime: []
        };

        features.all.forEach(feature => {
            const values = data.map(record => record[feature]);
            const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');

            if (nonNullValues.length === 0) {
                return;
            }

            // Check data types
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
                    // FIXED: Completed the ternary operator
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
                    feature: feature,
                    consistency: consistency
                });
            }
        });

        // Check for duplicate records
        const uniqueRecords = new Set();
        const duplicateIndices = [];
        
        data.forEach((record, index) => {
            const recordString = JSON.stringify(record);
            if (uniqueRecords.has(recordString)) {
                duplicateIndices.push(index);
            } else {
                uniqueRecords.add(recordString);
            }
        });

        results.duplicates = {
            total: duplicateIndices.length,
            percentage: Math.round((duplicateIndices.length / data.length) * 10000) / 100,
            indices: duplicateIndices.slice(0, 10) // Show first 10 duplicates
        };

        if (duplicateIndices.length > 0) {
            results.issues.push({
                type: 'info',
                category: 'data_consistency',
                message: `Found ${duplicateIndices.length} duplicate records (${results.duplicates.percentage}%)`,
                severity: 'low',
                duplicateCount: duplicateIndices.length
            });
        }

        const passed = results.issues.filter(issue => issue.severity === 'high').length === 0;
        
        report.results.data_consistency = {
            passed,
            score: Math.max(0, 100 - results.issues.length * 10),
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
            dataDistribution: {},
            clusterability: {},
            issues: []
        };

        // Check dimensionality
        results.dimensionality = {
            totalFeatures: features.all.length,
            numericFeatures: features.numeric.length,
            categoricalFeatures: features.categorical.length,
            ratio: features.numeric.length / Math.max(1, features.all.length)
        };

        // Minimum requirements
        if (features.numeric.length < 2) {
            results.issues.push({
                type: 'critical',
                category: 'clustering_suitability',
                message: 'At least 2 numeric features required for clustering',
                severity: 'high'
            });
        }

        if (data.length < this.options.minClusterSize * 2) {
            results.issues.push({
                type: 'warning',
                category: 'clustering_suitability',
                message: `Dataset may be too small for reliable clustering (${data.length} records)`,
                severity: 'medium'
            });
        }

        // Check feature variance
        const lowVarianceFeatures = [];
        features.numeric.forEach(feature => {
            const values = data.map(record => Number(record[feature])).filter(val => !isNaN(val));
            const variance = this.calculateVariance(values);
            
            if (variance < this.thresholds.variance.min) {
                lowVarianceFeatures.push({ feature, variance });
            }
        });

        if (lowVarianceFeatures.length > 0) {
            results.issues.push({
                type: 'warning',
                category: 'clustering_suitability',
                message: `${lowVarianceFeatures.length} features have very low variance`,
                severity: 'medium',
                features: lowVarianceFeatures
            });
        }

        const passed = results.issues.filter(issue => issue.severity === 'high').length === 0;
        
        report.results.clustering_suitability = {
            passed,
            score: Math.max(0, 100 - results.issues.length * 15),
            ...results
        };

        report.issues.push(...results.issues);
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
            quality: {},
            issues: []
        };

        features.numeric.forEach(feature => {
            const values = data.map(record => Number(record[feature])).filter(val => !isNaN(val));
            
            if (values.length === 0) return;

            const stats = {
                count: values.length,
                mean: this.calculateMean(values),
                variance: this.calculateVariance(values),
                min: Math.min(...values),
                max: Math.max(...values),
                range: Math.max(...values) - Math.min(...values)
            };

            stats.standardDeviation = Math.sqrt(stats.variance);
            stats.coefficientOfVariation = stats.mean !== 0 ? stats.standardDeviation / Math.abs(stats.mean) : 0;

            results.statistics[feature] = stats;

            // Quality assessment
            let qualityScore = 100;
            
            if (stats.variance < this.thresholds.variance.min) {
                qualityScore -= 30;
                results.issues.push({
                    type: 'warning',
                    category: 'feature_quality',
                    message: `Feature '${feature}' has very low variance (${stats.variance.toFixed(4)})`,
                    severity: 'medium'
                });
            }

            if (stats.coefficientOfVariation > 2) {
                qualityScore -= 20;
                results.issues.push({
                    type: 'info',
                    category: 'feature_quality',
                    message: `Feature '${feature}' has high variability (CV: ${stats.coefficientOfVariation.toFixed(2)})`,
                    severity: 'low'
                });
            }

            results.quality[feature] = {
                score: Math.max(0, qualityScore),
                variance: stats.variance,
                consistency: 100 - (stats.coefficientOfVariation * 10)
            };
        });

        const overallScore = Object.values(results.quality).length > 0 
            ? Object.values(results.quality).reduce((sum, q) => sum + q.score, 0) / Object.values(results.quality).length
            : 100;

        report.results.feature_quality = {
            passed: overallScore > 60,
            score: Math.round(overallScore),
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Run outlier analysis
     * @param {Array} data - Input data
     * @param {Object} features - Feature categorization
     * @param {Object} report - Validation report
     */
    async runOutlierAnalysis(data, features, report) {
        const results = {
            outliers: {},
            summary: {},
            issues: []
        };

        let totalOutliers = 0;

        features.numeric.forEach(feature => {
            const values = data.map((record, index) => ({
                value: Number(record[feature]),
                index: index
            })).filter(item => !isNaN(item.value));

            if (values.length === 0) return;

            const mean = this.calculateMean(values.map(v => v.value));
            const std = Math.sqrt(this.calculateVariance(values.map(v => v.value)));

            const outliers = values.filter(item => {
                const zScore = Math.abs((item.value - mean) / std);
                return zScore > this.options.outlierThreshold;
            });

            totalOutliers += outliers.length;

            results.outliers[feature] = {
                count: outliers.length,
                percentage: Math.round((outliers.length / values.length) * 10000) / 100,
                indices: outliers.slice(0, 10).map(o => o.index), // Show first 10
                threshold: this.options.outlierThreshold
            };

            if (outliers.length > 0) {
                const severity = outliers.length / values.length > 0.15 ? 'high' : 
                               outliers.length / values.length > 0.05 ? 'medium' : 'low';
                
                results.issues.push({
                    type: 'info',
                    category: 'outlier_analysis',
                    message: `Feature '${feature}' has ${outliers.length} outliers (${results.outliers[feature].percentage}%)`,
                    severity: severity,
                    feature: feature,
                    outlierCount: outliers.length
                });
            }
        });

        results.summary = {
            totalOutliers,
            affectedFeatures: Object.keys(results.outliers).filter(f => results.outliers[f].count > 0).length,
            averageOutlierPercentage: Object.values(results.outliers).length > 0 
                ? Object.values(results.outliers).reduce((sum, o) => sum + o.percentage, 0) / Object.values(results.outliers).length
                : 0
        };

        const score = Math.max(0, 100 - totalOutliers * 2);

        report.results.outlier_analysis = {
            passed: totalOutliers < data.length * 0.1,
            score: Math.round(score),
            ...results
        };

        report.issues.push(...results.issues);
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
                    message: `High correlation between '${item.feature1}' and '${item.feature2}' (${item.correlation})`,
                    severity: 'medium',
                    correlation: item.correlation
                });
            }
        });

        const score = Math.max(0, 100 - results.issues.length * 15);

        report.results.correlation_analysis = {
            passed: results.issues.filter(i => i.severity === 'high').length === 0,
            score: Math.round(score),
            ...results
        };

        report.issues.push(...results.issues);
    }

    /**
     * Calculate Pearson correlation coefficient
     * @param {Array} data - Input data
     * @param {string} feature1 - First feature
     * @param {string} feature2 - Second feature
     * @returns {number} Correlation coefficient
     */
    calculatePearsonCorrelation(data, feature1, feature2) {
        const pairs = data.map(record => ({
            x: Number(record[feature1]),
            y: Number(record[feature2])
        })).filter(pair => !isNaN(pair.x) && !isNaN(pair.y));

        if (pairs.length < 2) return 0;

        const meanX = this.calculateMean(pairs.map(p => p.x));
        const meanY = this.calculateMean(pairs.map(p => p.y));

        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;

        pairs.forEach(pair => {
            const xDiff = pair.x - meanX;
            const yDiff = pair.y - meanY;
            numerator += xDiff * yDiff;
            sumXSquared += xDiff * xDiff;
            sumYSquared += yDiff * yDiff;
        });

        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Calculate mean of array
     * @param {Array} values - Numeric values
     * @returns {number} Mean value
     */
    calculateMean(values) {
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    /**
     * Calculate variance of array
     * @param {Array} values - Numeric values
     * @returns {number} Variance value
     */
    calculateVariance(values) {
        if (values.length < 2) return 0;
        
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        
        return this.calculateMean(squaredDiffs);
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
                title: 'Improve Feature Quality',
                description: 'Some features have low variance which may reduce clustering effectiveness',
                actions: [
                    `Consider removing low-variance features: ${lowVarianceFeatures.join(', ')}`,
                    'Apply feature scaling or normalization',
                    'Consider feature transformation techniques',
                    'Investigate data collection procedures'
                ]
            });
        }

        // Outlier recommendations
        const outlierIssues = report.issues.filter(issue => issue.category === 'outlier_analysis');
        if (outlierIssues.length > 0) {
            recommendations.push({
                category: 'outlier_analysis',
                priority: 'medium',
                title: 'Handle Outliers',
                description: 'Outliers detected that may affect clustering performance',
                actions: [
                    'Investigate outliers to determine if they are valid data points',
                    'Consider outlier removal or winsorization',
                    'Use robust scaling techniques',
                    'Consider outlier-resistant clustering algorithms'
                ]
            });
        }

        // Correlation recommendations
        const correlationIssues = report.issues.filter(issue => issue.category === 'correlation_analysis');
        if (correlationIssues.length > 0) {
            recommendations.push({
                category: 'correlation_analysis',
                priority: 'low',
                title: 'Address High Correlations',
                description: 'Highly correlated features may cause redundancy',
                actions: [
                    'Consider removing one of the highly correlated features',
                    'Apply Principal Component Analysis (PCA)',
                    'Use regularization techniques',
                    'Investigate domain-specific reasons for correlation'
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
        const warningIssues = report.issues.filter(issue => issue.severity === 'medium').length;

        if (criticalIssues > 0) {
            report.status = 'failed';
        } else if (report.score >= 80) {
            report.status = 'excellent';
        } else if (report.score >= 60) {
            report.status = 'good';
        } else if (report.score >= 40) {
            report.status = 'fair';
        } else {
            report.status = 'poor';
        }
    }
}

export default DataValidator;