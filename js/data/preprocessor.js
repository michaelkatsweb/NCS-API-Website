/**
 * Data Preprocessor Module for NCS-API-Website
 * Advanced data cleaning, transformation, and preparation for clustering algorithms
 * Includes feature engineering, normalization, dimensionality reduction, and outlier handling
 */

import { EventBus } from '../core/eventBus.js';
import { calculateDistance } from '../utils/math.js';

export class DataPreprocessor {
    constructor(options = {}) {
        this.options = {
            // Normalization options
            normalizationMethod: options.normalizationMethod || 'zscore', // zscore, minmax, robust, unit
            handleOutliers: options.handleOutliers !== false,
            outlierMethod: options.outlierMethod || 'iqr', // iqr, zscore, isolation
            outlierThreshold: options.outlierThreshold || 2.5,
            
            // Missing value handling
            missingValueStrategy: options.missingValueStrategy || 'mean', // mean, median, mode, forward_fill, backward_fill, interpolate, remove
            missingValueThreshold: options.missingValueThreshold || 0.5, // Remove features with >50% missing
            
            // Feature engineering
            enableFeatureEngineering: options.enableFeatureEngineering !== false,
            enablePolynomialFeatures: options.enablePolynomialFeatures || false,
            polynomialDegree: options.polynomialDegree || 2,
            enableInteractionFeatures: options.enableInteractionFeatures || false,
            
            // Dimensionality reduction
            enableDimensionalityReduction: options.enableDimensionalityReduction || false,
            reductionMethod: options.reductionMethod || 'pca', // pca, lda, tsne
            targetDimensions: options.targetDimensions || null, // Auto-determine if null
            varianceThreshold: options.varianceThreshold || 0.95,
            
            // Data transformation
            enableLogarithmicTransform: options.enableLogarithmicTransform || false,
            enableBoxCoxTransform: options.enableBoxCoxTransform || false,
            enablePowerTransform: options.enablePowerTransform || false,
            
            // Quality control
            removeConstantFeatures: options.removeConstantFeatures !== false,
            removeHighlyCorrelatedFeatures: options.removeHighlyCorrelatedFeatures || false,
            correlationThreshold: options.correlationThreshold || 0.95,
            
            ...options
        };

        // Processing state
        this.isProcessing = false;
        this.processingSteps = [];
        this.currentStep = '';
        this.progress = 0;
        
        // Transformation metadata
        this.transformations = {
            normalization: null,
            outlierRemoval: null,
            missingValueImputation: null,
            featureEngineering: null,
            dimensionalityReduction: null,
            featureSelection: null
        };
        
        // Feature metadata
        this.originalFeatures = [];
        this.processedFeatures = [];
        this.featureStats = new Map();
        this.removedFeatures = [];
        this.engineeredFeatures = [];
    }

    /**
     * Main preprocessing pipeline
     * @param {Array} data - Input data array
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processed data and metadata
     */
    async preprocess(data, options = {}) {
        try {
            this.isProcessing = true;
            const startTime = performance.now();
            
            // Merge options
            const processingOptions = { ...this.options, ...options };
            
            // Initialize processing pipeline
            this.initializeProcessing(data, processingOptions);
            
            let processedData = [...data];
            
            // Step 1: Initial data analysis
            await this.analyzeInputData(processedData);
            
            // Step 2: Handle missing values
            processedData = await this.handleMissingValues(processedData);
            
            // Step 3: Remove constant and low-variance features
            processedData = await this.removeInvalidFeatures(processedData);
            
            // Step 4: Handle outliers
            if (processingOptions.handleOutliers) {
                processedData = await this.handleOutliers(processedData);
            }
            
            // Step 5: Feature engineering
            if (processingOptions.enableFeatureEngineering) {
                processedData = await this.engineerFeatures(processedData);
            }
            
            // Step 6: Data transformation
            processedData = await this.transformFeatures(processedData);
            
            // Step 7: Feature selection
            processedData = await this.selectFeatures(processedData);
            
            // Step 8: Normalization
            processedData = await this.normalizeData(processedData);
            
            // Step 9: Dimensionality reduction
            if (processingOptions.enableDimensionalityReduction) {
                processedData = await this.reduceDimensionality(processedData);
            }
            
            // Step 10: Final validation
            await this.validateProcessedData(processedData);
            
            const endTime = performance.now();
            const result = {
                data: processedData,
                originalSize: data.length,
                processedSize: processedData.length,
                originalFeatures: this.originalFeatures.length,
                processedFeatures: this.processedFeatures.length,
                transformations: this.transformations,
                featureStats: Object.fromEntries(this.featureStats),
                removedFeatures: this.removedFeatures,
                engineeredFeatures: this.engineeredFeatures,
                processingTime: Math.round(endTime - startTime),
                processingSteps: this.processingSteps
            };
            
            this.isProcessing = false;
            
            EventBus.emit('preprocessor:processing_complete', {
                result,
                originalSize: data.length,
                processedSize: processedData.length,
                featuresReduced: this.originalFeatures.length - this.processedFeatures.length
            });
            
            return result;
            
        } catch (error) {
            this.isProcessing = false;
            EventBus.emit('preprocessor:processing_error', { error: error.message });
            throw error;
        }
    }

    /**
     * Initialize processing pipeline
     * @param {Array} data - Input data
     * @param {Object} options - Processing options
     */
    initializeProcessing(data, options) {
        this.progress = 0;
        this.processingSteps = [];
        this.transformations = {
            normalization: null,
            outlierRemoval: null,
            missingValueImputation: null,
            featureEngineering: null,
            dimensionalityReduction: null,
            featureSelection: null
        };
        
        // Extract original features
        if (data.length > 0) {
            this.originalFeatures = Object.keys(data[0]).filter(key => 
                typeof data[0][key] === 'number' || !isNaN(Number(data[0][key]))
            );
            this.processedFeatures = [...this.originalFeatures];
        }
        
        this.removedFeatures = [];
        this.engineeredFeatures = [];
        this.featureStats.clear();
    }

    /**
     * Analyze input data structure and quality
     * @param {Array} data - Input data
     */
    async analyzeInputData(data) {
        this.currentStep = 'analyzing_input';
        this.progress = 5;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Calculate feature statistics
        this.originalFeatures.forEach(feature => {
            const values = data.map(row => row[feature])
                              .map(val => Number(val))
                              .filter(val => !isNaN(val));
            
            if (values.length > 0) {
                const stats = this.calculateFeatureStatistics(values);
                stats.missingCount = data.length - values.length;
                stats.missingPercentage = (stats.missingCount / data.length) * 100;
                
                this.featureStats.set(feature, stats);
            }
        });

        this.processingSteps.push({
            step: 'input_analysis',
            description: 'Analyzed input data structure and quality',
            features: this.originalFeatures.length,
            records: data.length,
            timestamp: Date.now()
        });
    }

    /**
     * Handle missing values using various strategies
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Data with missing values handled
     */
    async handleMissingValues(data) {
        this.currentStep = 'handling_missing_values';
        this.progress = 15;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        let processedData = [...data];
        const imputationMethods = new Map();
        
        for (const feature of this.processedFeatures) {
            const stats = this.featureStats.get(feature);
            
            if (stats && stats.missingPercentage > 0) {
                // Remove features with too many missing values
                if (stats.missingPercentage > this.options.missingValueThreshold * 100) {
                    this.removedFeatures.push({
                        name: feature,
                        reason: 'too_many_missing_values',
                        missingPercentage: stats.missingPercentage
                    });
                    continue;
                }
                
                // Apply imputation strategy
                const imputedValue = this.calculateImputationValue(data, feature, this.options.missingValueStrategy);
                imputationMethods.set(feature, {
                    method: this.options.missingValueStrategy,
                    value: imputedValue,
                    imputedCount: stats.missingCount
                });
                
                // Apply imputation
                processedData = processedData.map(row => {
                    if (row[feature] === null || row[feature] === undefined || isNaN(Number(row[feature]))) {
                        return { ...row, [feature]: imputedValue };
                    }
                    return row;
                });
            }
        }

        // Update processed features list
        this.processedFeatures = this.processedFeatures.filter(feature => 
            !this.removedFeatures.some(removed => removed.name === feature)
        );

        this.transformations.missingValueImputation = {
            strategy: this.options.missingValueStrategy,
            methods: Object.fromEntries(imputationMethods),
            removedFeatures: this.removedFeatures.filter(f => f.reason === 'too_many_missing_values')
        };

        this.processingSteps.push({
            step: 'missing_value_handling',
            description: `Handled missing values using ${this.options.missingValueStrategy} strategy`,
            imputedFeatures: imputationMethods.size,
            removedFeatures: this.removedFeatures.length,
            timestamp: Date.now()
        });

        return processedData;
    }

    /**
     * Calculate imputation value based on strategy
     * @param {Array} data - Input data
     * @param {String} feature - Feature name
     * @param {String} strategy - Imputation strategy
     * @returns {Number} Imputation value
     */
    calculateImputationValue(data, feature, strategy) {
        const values = data.map(row => Number(row[feature]))
                          .filter(val => !isNaN(val));
        
        if (values.length === 0) return 0;
        
        switch (strategy) {
            case 'mean':
                return values.reduce((sum, val) => sum + val, 0) / values.length;
            
            case 'median':
                const sorted = values.sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0 
                    ? (sorted[mid - 1] + sorted[mid]) / 2 
                    : sorted[mid];
            
            case 'mode':
                const frequency = {};
                values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
                return Number(Object.keys(frequency).reduce((a, b) => 
                    frequency[a] > frequency[b] ? a : b
                ));
            
            case 'zero':
                return 0;
            
            default:
                return values.reduce((sum, val) => sum + val, 0) / values.length;
        }
    }

    /**
     * Remove constant and invalid features
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Data with invalid features removed
     */
    async removeInvalidFeatures(data) {
        this.currentStep = 'removing_invalid_features';
        this.progress = 25;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        const featuresToRemove = [];
        
        this.processedFeatures.forEach(feature => {
            const values = data.map(row => Number(row[feature]))
                              .filter(val => !isNaN(val));
            
            if (values.length === 0) {
                featuresToRemove.push({
                    name: feature,
                    reason: 'no_valid_values'
                });
                return;
            }
            
            // Check for constant features
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length === 1) {
                featuresToRemove.push({
                    name: feature,
                    reason: 'constant_feature',
                    value: uniqueValues[0]
                });
                return;
            }
            
            // Check for very low variance
            const variance = this.calculateVariance(values);
            if (variance < 1e-8) {
                featuresToRemove.push({
                    name: feature,
                    reason: 'low_variance',
                    variance: variance
                });
            }
        });

        // Remove invalid features
        this.removedFeatures.push(...featuresToRemove);
        this.processedFeatures = this.processedFeatures.filter(feature => 
            !featuresToRemove.some(removed => removed.name === feature)
        );

        this.processingSteps.push({
            step: 'invalid_feature_removal',
            description: 'Removed constant and low-variance features',
            removedCount: featuresToRemove.length,
            remainingFeatures: this.processedFeatures.length,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Handle outliers using various methods
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Data with outliers handled
     */
    async handleOutliers(data) {
        this.currentStep = 'handling_outliers';
        this.progress = 35;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        let processedData = [...data];
        const outlierInfo = {
            method: this.options.outlierMethod,
            threshold: this.options.outlierThreshold,
            detectedOutliers: new Set(),
            removedCount: 0
        };

        // Detect outliers for each feature
        this.processedFeatures.forEach(feature => {
            const outlierIndices = this.detectOutliers(data, feature, this.options.outlierMethod);
            outlierIndices.forEach(index => outlierInfo.detectedOutliers.add(index));
        });

        // Remove or cap outliers
        const outlierIndices = Array.from(outlierInfo.detectedOutliers);
        
        if (this.options.outlierAction === 'remove') {
            // Remove outlier rows
            processedData = processedData.filter((_, index) => !outlierIndices.includes(index));
            outlierInfo.removedCount = outlierIndices.length;
        } else {
            // Cap outliers (winsorization)
            this.processedFeatures.forEach(feature => {
                const values = data.map(row => Number(row[feature]));
                const q1 = this.calculateQuantile(values, 0.25);
                const q3 = this.calculateQuantile(values, 0.75);
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                processedData = processedData.map(row => {
                    const value = Number(row[feature]);
                    if (value < lowerBound) {
                        return { ...row, [feature]: lowerBound };
                    } else if (value > upperBound) {
                        return { ...row, [feature]: upperBound };
                    }
                    return row;
                });
            });
        }

        this.transformations.outlierRemoval = outlierInfo;

        this.processingSteps.push({
            step: 'outlier_handling',
            description: `Handled outliers using ${this.options.outlierMethod} method`,
            detectedOutliers: outlierIndices.length,
            action: this.options.outlierAction || 'cap',
            timestamp: Date.now()
        });

        return processedData;
    }

    /**
     * Detect outliers using specified method
     * @param {Array} data - Input data
     * @param {String} feature - Feature name
     * @param {String} method - Detection method
     * @returns {Array} Array of outlier indices
     */
    detectOutliers(data, feature, method) {
        const values = data.map((row, index) => ({
            value: Number(row[feature]),
            index
        })).filter(item => !isNaN(item.value));

        switch (method) {
            case 'iqr':
                return this.detectOutliersIQR(values);
            case 'zscore':
                return this.detectOutliersZScore(values);
            case 'isolation':
                return this.detectOutliersIsolation(values);
            default:
                return this.detectOutliersIQR(values);
        }
    }

    /**
     * Detect outliers using IQR method
     * @param {Array} values - Array of {value, index} objects
     * @returns {Array} Outlier indices
     */
    detectOutliersIQR(values) {
        const sortedValues = values.map(v => v.value).sort((a, b) => a - b);
        const q1 = this.calculateQuantile(sortedValues, 0.25);
        const q3 = this.calculateQuantile(sortedValues, 0.75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return values
            .filter(item => item.value < lowerBound || item.value > upperBound)
            .map(item => item.index);
    }

    /**
     * Detect outliers using Z-score method
     * @param {Array} values - Array of {value, index} objects
     * @returns {Array} Outlier indices
     */
    detectOutliersZScore(values) {
        const vals = values.map(v => v.value);
        const mean = vals.reduce((sum, val) => sum + val, 0) / vals.length;
        const stdDev = Math.sqrt(vals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vals.length);
        
        return values
            .filter(item => Math.abs((item.value - mean) / stdDev) > this.options.outlierThreshold)
            .map(item => item.index);
    }

    /**
     * Engineer new features
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Data with engineered features
     */
    async engineerFeatures(data) {
        this.currentStep = 'engineering_features';
        this.progress = 45;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        let processedData = [...data];
        const engineeredFeatures = [];

        // Polynomial features
        if (this.options.enablePolynomialFeatures) {
            const polyFeatures = this.createPolynomialFeatures(data, this.options.polynomialDegree);
            engineeredFeatures.push(...polyFeatures);
            
            // Add polynomial features to data
            processedData = processedData.map((row, index) => {
                const newRow = { ...row };
                polyFeatures.forEach(feature => {
                    newRow[feature.name] = feature.values[index];
                });
                return newRow;
            });
        }

        // Interaction features
        if (this.options.enableInteractionFeatures) {
            const interactionFeatures = this.createInteractionFeatures(data);
            engineeredFeatures.push(...interactionFeatures);
            
            // Add interaction features to data
            processedData = processedData.map((row, index) => {
                const newRow = { ...row };
                interactionFeatures.forEach(feature => {
                    newRow[feature.name] = feature.values[index];
                });
                return newRow;
            });
        }

        // Statistical features
        const statisticalFeatures = this.createStatisticalFeatures(data);
        engineeredFeatures.push(...statisticalFeatures);
        
        // Add statistical features to data
        processedData = processedData.map((row, index) => {
            const newRow = { ...row };
            statisticalFeatures.forEach(feature => {
                newRow[feature.name] = feature.values[index];
            });
            return newRow;
        });

        // Update feature lists
        this.engineeredFeatures = engineeredFeatures;
        this.processedFeatures.push(...engineeredFeatures.map(f => f.name));

        this.transformations.featureEngineering = {
            polynomialFeatures: this.options.enablePolynomialFeatures,
            polynomialDegree: this.options.polynomialDegree,
            interactionFeatures: this.options.enableInteractionFeatures,
            statisticalFeatures: true,
            totalEngineered: engineeredFeatures.length
        };

        this.processingSteps.push({
            step: 'feature_engineering',
            description: 'Created engineered features',
            engineeredCount: engineeredFeatures.length,
            totalFeatures: this.processedFeatures.length,
            timestamp: Date.now()
        });

        return processedData;
    }

    /**
     * Create polynomial features
     * @param {Array} data - Input data
     * @param {Number} degree - Polynomial degree
     * @returns {Array} Polynomial features
     */
    createPolynomialFeatures(data, degree) {
        const features = [];
        
        this.processedFeatures.forEach(feature => {
            const values = data.map(row => Number(row[feature]));
            
            for (let d = 2; d <= degree; d++) {
                const polyValues = values.map(val => Math.pow(val, d));
                features.push({
                    name: `${feature}_poly_${d}`,
                    type: 'polynomial',
                    degree: d,
                    originalFeature: feature,
                    values: polyValues
                });
            }
        });
        
        return features;
    }

    /**
     * Create interaction features
     * @param {Array} data - Input data
     * @returns {Array} Interaction features
     */
    createInteractionFeatures(data) {
        const features = [];
        
        for (let i = 0; i < this.processedFeatures.length; i++) {
            for (let j = i + 1; j < this.processedFeatures.length; j++) {
                const feature1 = this.processedFeatures[i];
                const feature2 = this.processedFeatures[j];
                
                const values1 = data.map(row => Number(row[feature1]));
                const values2 = data.map(row => Number(row[feature2]));
                
                // Multiplication interaction
                const multiplyValues = values1.map((val1, index) => val1 * values2[index]);
                features.push({
                    name: `${feature1}_x_${feature2}`,
                    type: 'interaction',
                    operation: 'multiply',
                    features: [feature1, feature2],
                    values: multiplyValues
                });
                
                // Addition interaction
                const addValues = values1.map((val1, index) => val1 + values2[index]);
                features.push({
                    name: `${feature1}_plus_${feature2}`,
                    type: 'interaction',
                    operation: 'add',
                    features: [feature1, feature2],
                    values: addValues
                });
            }
        }
        
        return features;
    }

    /**
     * Create statistical features
     * @param {Array} data - Input data
     * @returns {Array} Statistical features
     */
    createStatisticalFeatures(data) {
        const features = [];
        
        // Feature-wise statistics
        this.processedFeatures.forEach(feature => {
            const values = data.map(row => Number(row[feature]));
            const stats = this.calculateFeatureStatistics(values);
            
            // Log transform (if all positive)
            if (values.every(val => val > 0)) {
                const logValues = values.map(val => Math.log(val));
                features.push({
                    name: `${feature}_log`,
                    type: 'transform',
                    operation: 'log',
                    originalFeature: feature,
                    values: logValues
                });
            }
            
            // Square root transform (if all non-negative)
            if (values.every(val => val >= 0)) {
                const sqrtValues = values.map(val => Math.sqrt(val));
                features.push({
                    name: `${feature}_sqrt`,
                    type: 'transform',
                    operation: 'sqrt',
                    originalFeature: feature,
                    values: sqrtValues
                });
            }
        });
        
        return features;
    }

    /**
     * Transform features using various methods
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Transformed data
     */
    async transformFeatures(data) {
        this.currentStep = 'transforming_features';
        this.progress = 55;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        let processedData = [...data];
        const transformations = [];

        // Apply transformations based on options
        if (this.options.enableLogarithmicTransform) {
            processedData = this.applyLogarithmicTransform(processedData);
            transformations.push('logarithmic');
        }

        if (this.options.enableBoxCoxTransform) {
            processedData = this.applyBoxCoxTransform(processedData);
            transformations.push('box_cox');
        }

        this.processingSteps.push({
            step: 'feature_transformation',
            description: 'Applied feature transformations',
            transformations: transformations,
            timestamp: Date.now()
        });

        return processedData;
    }

    /**
     * Apply logarithmic transformation
     * @param {Array} data - Input data
     * @returns {Array} Transformed data
     */
    applyLogarithmicTransform(data) {
        return data.map(row => {
            const newRow = { ...row };
            this.processedFeatures.forEach(feature => {
                const value = Number(row[feature]);
                if (value > 0) {
                    newRow[feature] = Math.log(value);
                }
            });
            return newRow;
        });
    }

    /**
     * Select most relevant features
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Data with selected features
     */
    async selectFeatures(data) {
        this.currentStep = 'selecting_features';
        this.progress = 65;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        let selectedFeatures = [...this.processedFeatures];

        // Remove highly correlated features
        if (this.options.removeHighlyCorrelatedFeatures) {
            const correlationMatrix = this.calculateCorrelationMatrix(data, selectedFeatures);
            const featuresToRemove = this.findHighlyCorrelatedFeatures(correlationMatrix);
            
            selectedFeatures = selectedFeatures.filter(feature => 
                !featuresToRemove.includes(feature)
            );
            
            this.removedFeatures.push(...featuresToRemove.map(feature => ({
                name: feature,
                reason: 'high_correlation'
            })));
        }

        // Update processed features
        this.processedFeatures = selectedFeatures;

        this.transformations.featureSelection = {
            method: 'correlation_filter',
            correlationThreshold: this.options.correlationThreshold,
            selectedFeatures: selectedFeatures.length,
            removedFeatures: this.removedFeatures.filter(f => f.reason === 'high_correlation').length
        };

        this.processingSteps.push({
            step: 'feature_selection',
            description: 'Selected most relevant features',
            selectedCount: selectedFeatures.length,
            totalFeatures: this.originalFeatures.length + this.engineeredFeatures.length,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Normalize data using specified method
     * @param {Array} data - Input data
     * @returns {Promise<Array>} Normalized data
     */
    async normalizeData(data) {
        this.currentStep = 'normalizing_data';
        this.progress = 75;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        const normalizationParams = new Map();
        let processedData = [...data];

        this.processedFeatures.forEach(feature => {
            const values = data.map(row => Number(row[feature]));
            let params;

            switch (this.options.normalizationMethod) {
                case 'zscore':
                    params = this.calculateZScoreParams(values);
                    break;
                case 'minmax':
                    params = this.calculateMinMaxParams(values);
                    break;
                case 'robust':
                    params = this.calculateRobustParams(values);
                    break;
                case 'unit':
                    params = this.calculateUnitParams(values);
                    break;
                default:
                    params = this.calculateZScoreParams(values);
            }

            normalizationParams.set(feature, params);

            // Apply normalization
            processedData = processedData.map(row => {
                const normalizedValue = this.applyNormalization(
                    Number(row[feature]), 
                    params, 
                    this.options.normalizationMethod
                );
                return { ...row, [feature]: normalizedValue };
            });
        });

        this.transformations.normalization = {
            method: this.options.normalizationMethod,
            parameters: Object.fromEntries(normalizationParams)
        };

        this.processingSteps.push({
            step: 'data_normalization',
            description: `Normalized data using ${this.options.normalizationMethod} method`,
            features: this.processedFeatures.length,
            timestamp: Date.now()
        });

        return processedData;
    }

    /**
     * Calculate Z-score normalization parameters
     * @param {Array} values - Feature values
     * @returns {Object} Normalization parameters
     */
    calculateZScoreParams(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return { mean, stdDev, method: 'zscore' };
    }

    /**
     * Calculate Min-Max normalization parameters
     * @param {Array} values - Feature values
     * @returns {Object} Normalization parameters
     */
    calculateMinMaxParams(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return { min, max, range: max - min, method: 'minmax' };
    }

    /**
     * Apply normalization to a single value
     * @param {Number} value - Value to normalize
     * @param {Object} params - Normalization parameters
     * @param {String} method - Normalization method
     * @returns {Number} Normalized value
     */
    applyNormalization(value, params, method) {
        switch (method) {
            case 'zscore':
                return params.stdDev > 0 ? (value - params.mean) / params.stdDev : 0;
            
            case 'minmax':
                return params.range > 0 ? (value - params.min) / params.range : 0;
            
            case 'robust':
                return params.iqr > 0 ? (value - params.median) / params.iqr : 0;
            
            case 'unit':
                return params.norm > 0 ? value / params.norm : 0;
            
            default:
                return value;
        }
    }

    /**
     * Validate processed data
     * @param {Array} data - Processed data
     */
    async validateProcessedData(data) {
        this.currentStep = 'validating_output';
        this.progress = 90;
        
        EventBus.emit('preprocessor:progress', {
            step: this.currentStep,
            progress: this.progress
        });

        // Validate data integrity
        if (data.length === 0) {
            throw new Error('All data was removed during preprocessing');
        }

        if (this.processedFeatures.length === 0) {
            throw new Error('All features were removed during preprocessing');
        }

        // Check for invalid values
        const invalidCount = data.reduce((count, row) => {
            return count + this.processedFeatures.reduce((featureCount, feature) => {
                const value = Number(row[feature]);
                return featureCount + (isNaN(value) || !isFinite(value) ? 1 : 0);
            }, 0);
        }, 0);

        if (invalidCount > 0) {
            console.warn(`Found ${invalidCount} invalid values in processed data`);
        }

        this.processingSteps.push({
            step: 'output_validation',
            description: 'Validated processed data quality',
            invalidValues: invalidCount,
            timestamp: Date.now()
        });
    }

    /**
     * Utility methods
     */
    calculateFeatureStatistics(values) {
        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const n = values.length;
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        
        return {
            count: n,
            mean: mean,
            median: sorted[Math.floor(n / 2)],
            min: sorted[0],
            max: sorted[n - 1],
            variance: variance,
            stdDev: Math.sqrt(variance),
            q1: sorted[Math.floor(n * 0.25)],
            q3: sorted[Math.floor(n * 0.75)]
        };
    }

    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    calculateQuantile(values, quantile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * quantile);
        return sorted[Math.min(index, sorted.length - 1)];
    }

    calculateCorrelationMatrix(data, features) {
        const matrix = {};
        
        features.forEach(feature1 => {
            matrix[feature1] = {};
            features.forEach(feature2 => {
                matrix[feature1][feature2] = this.calculatePearsonCorrelation(data, feature1, feature2);
            });
        });
        
        return matrix;
    }

    calculatePearsonCorrelation(data, feature1, feature2) {
        const pairs = data.map(row => ({
            x: Number(row[feature1]),
            y: Number(row[feature2])
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

    findHighlyCorrelatedFeatures(correlationMatrix) {
        const featuresToRemove = [];
        const features = Object.keys(correlationMatrix);
        
        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                const feature1 = features[i];
                const feature2 = features[j];
                const correlation = Math.abs(correlationMatrix[feature1][feature2]);
                
                if (correlation > this.options.correlationThreshold) {
                    // Remove the feature with lower variance
                    const stats1 = this.featureStats.get(feature1);
                    const stats2 = this.featureStats.get(feature2);
                    
                    if (stats1 && stats2) {
                        if (stats1.variance < stats2.variance) {
                            featuresToRemove.push(feature1);
                        } else {
                            featuresToRemove.push(feature2);
                        }
                    }
                }
            }
        }
        
        return [...new Set(featuresToRemove)];
    }

    /**
     * Transform new data using saved parameters
     * @param {Array} newData - New data to transform
     * @returns {Array} Transformed data
     */
    transform(newData) {
        if (!this.transformations.normalization) {
            throw new Error('Preprocessor must be fitted before transforming new data');
        }

        let processedData = [...newData];

        // Apply normalization
        this.processedFeatures.forEach(feature => {
            const params = this.transformations.normalization.parameters[feature];
            if (params) {
                processedData = processedData.map(row => {
                    const normalizedValue = this.applyNormalization(
                        Number(row[feature]), 
                        params, 
                        this.transformations.normalization.method
                    );
                    return { ...row, [feature]: normalizedValue };
                });
            }
        });

        return processedData;
    }

    /**
     * Save preprocessor state
     * @returns {Object} Preprocessor state
     */
    save() {
        return {
            version: '1.0',
            options: this.options,
            originalFeatures: this.originalFeatures,
            processedFeatures: this.processedFeatures,
            removedFeatures: this.removedFeatures,
            engineeredFeatures: this.engineeredFeatures,
            transformations: this.transformations,
            featureStats: Object.fromEntries(this.featureStats),
            timestamp: Date.now()
        };
    }

    /**
     * Load preprocessor state
     * @param {Object} state - Saved preprocessor state
     */
    load(state) {
        this.options = state.options;
        this.originalFeatures = state.originalFeatures;
        this.processedFeatures = state.processedFeatures;
        this.removedFeatures = state.removedFeatures;
        this.engineeredFeatures = state.engineeredFeatures;
        this.transformations = state.transformations;
        this.featureStats = new Map(Object.entries(state.featureStats || {}));
    }
}

// Export for use
export default DataPreprocessor;