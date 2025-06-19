// File: data.worker.js
// Path: js/workers/data.worker.js
// Data processing web worker for NCS-API-Website
// Handles data parsing, validation, preprocessing, and transformation in background

/**
 * Data parsing utilities
 */
const DataParser = {
    /**
     * Parse CSV data
     */
    parseCSV(csvText, options = {}) {
        const delimiter = options.delimiter || ',';
        const hasHeader = options.hasHeader !== false;
        const skipEmptyLines = options.skipEmptyLines !== false;
        const trimWhitespace = options.trimWhitespace !== false;
        
        const lines = csvText.split('\n').filter(line => 
            !skipEmptyLines || line.trim().length > 0
        );
        
        if (lines.length === 0) {
            return { headers: [], data: [], errors: [] };
        }
        
        const errors = [];
        let headers = [];
        let data = [];
        
        try {
            // Parse headers
            if (hasHeader && lines.length > 0) {
                headers = this.parseCSVLine(lines[0], delimiter, trimWhitespace);
                lines.shift();
            }
            
            // Parse data rows
            lines.forEach((line, index) => {
                try {
                    const row = this.parseCSVLine(line, delimiter, trimWhitespace);
                    
                    if (row.length > 0) {
                        // Convert to object if headers exist
                        if (headers.length > 0) {
                            const rowObject = {};
                            headers.forEach((header, i) => {
                                rowObject[header] = this.convertValue(row[i]);
                            });
                            data.push(rowObject);
                        } else {
                            data.push(row.map(value => this.convertValue(value)));
                        }
                    }
                } catch (error) {
                    errors.push({
                        line: index + (hasHeader ? 2 : 1),
                        error: error.message,
                        data: line
                    });
                }
            });
            
        } catch (error) {
            errors.push({
                line: 'header',
                error: error.message,
                data: lines[0] || ''
            });
        }
        
        return { headers, data, errors };
    },
    
    /**
     * Parse a single CSV line
     */
    parseCSVLine(line, delimiter, trimWhitespace) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                // End of field
                result.push(trimWhitespace ? current.trim() : current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        // Add final field
        result.push(trimWhitespace ? current.trim() : current);
        
        return result;
    },
    
    /**
     * Parse JSON data
     */
    parseJSON(jsonText, options = {}) {
        const errors = [];
        let data = [];
        
        try {
            const parsed = JSON.parse(jsonText);
            
            if (Array.isArray(parsed)) {
                data = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                data = [parsed];
            } else {
                errors.push({
                    error: 'Invalid JSON structure: expected array or object',
                    data: jsonText.substring(0, 100)
                });
            }
        } catch (error) {
            errors.push({
                error: `JSON parsing error: ${error.message}`,
                data: jsonText.substring(0, 100)
            });
        }
        
        return { data, errors };
    },
    
    /**
     * Convert string value to appropriate type
     */
    convertValue(value) {
        if (typeof value !== 'string') return value;
        
        const trimmed = value.trim();
        
        // Empty string
        if (trimmed === '') return null;
        
        // Boolean
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        
        // Number
        if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed))) {
            const num = parseFloat(trimmed);
            return trimmed.includes('.') ? num : parseInt(trimmed, 10);
        }
        
        // Date (basic ISO format detection)
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) return date;
        }
        
        return trimmed;
    }
};

/**
 * Data validation utilities
 */
const DataValidator = {
    /**
     * Validate dataset structure and quality
     */
    validateDataset(data, options = {}) {
        const minRows = options.minRows || 1;
        const maxRows = options.maxRows || 100000;
        const requiredColumns = options.requiredColumns || [];
        const numericColumns = options.numericColumns || [];
        
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            statistics: {},
            recommendations: []
        };
        
        // Basic structure validation
        if (!Array.isArray(data)) {
            validation.errors.push('Data must be an array');
            validation.isValid = false;
            return validation;
        }
        
        if (data.length < minRows) {
            validation.errors.push(`Insufficient data: ${data.length} rows, minimum ${minRows} required`);
            validation.isValid = false;
        }
        
        if (data.length > maxRows) {
            validation.warnings.push(`Large dataset: ${data.length} rows, consider sampling for performance`);
        }
        
        if (data.length === 0) {
            return validation;
        }
        
        // Column validation
        const firstRow = data[0];
        const columns = typeof firstRow === 'object' ? Object.keys(firstRow) : [];
        
        // Check required columns
        requiredColumns.forEach(col => {
            if (!columns.includes(col)) {
                validation.errors.push(`Missing required column: ${col}`);
                validation.isValid = false;
            }
        });
        
        // Validate numeric columns
        numericColumns.forEach(col => {
            if (columns.includes(col)) {
                const nonNumericCount = data.filter(row => 
                    typeof row[col] !== 'number' && !this.isNumericString(row[col])
                ).length;
                
                if (nonNumericCount > 0) {
                    validation.warnings.push(
                        `Column '${col}' contains ${nonNumericCount} non-numeric values`
                    );
                }
            }
        });
        
        // Calculate statistics
        validation.statistics = this.calculateDataStatistics(data);
        
        // Generate recommendations
        validation.recommendations = this.generateRecommendations(data, validation.statistics);
        
        return validation;
    },
    
    /**
     * Check if value is numeric string
     */
    isNumericString(value) {
        return typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    /**
     * Calculate dataset statistics
     */
    calculateDataStatistics(data) {
        if (data.length === 0) return {};
        
        const stats = {
            rowCount: data.length,
            columnCount: 0,
            numericColumns: [],
            categoricalColumns: [],
            missingValues: {},
            dataTypes: {},
            ranges: {}
        };
        
        const firstRow = data[0];
        const columns = typeof firstRow === 'object' ? Object.keys(firstRow) : [];
        stats.columnCount = columns.length;
        
        columns.forEach(col => {
            const values = data.map(row => row[col]).filter(val => val !== null && val !== undefined);
            const nonNullCount = values.length;
            const missingCount = data.length - nonNullCount;
            
            stats.missingValues[col] = {
                count: missingCount,
                percentage: (missingCount / data.length) * 100
            };
            
            // Determine data type
            const numericValues = values.filter(val => 
                typeof val === 'number' || this.isNumericString(val)
            );
            
            if (numericValues.length / nonNullCount > 0.8) {
                stats.numericColumns.push(col);
                stats.dataTypes[col] = 'numeric';
                
                // Calculate range for numeric columns
                const numbers = numericValues.map(val => 
                    typeof val === 'number' ? val : parseFloat(val)
                );
                
                if (numbers.length > 0) {
                    stats.ranges[col] = {
                        min: Math.min(...numbers),
                        max: Math.max(...numbers),
                        mean: numbers.reduce((sum, n) => sum + n, 0) / numbers.length
                    };
                }
            } else {
                stats.categoricalColumns.push(col);
                stats.dataTypes[col] = 'categorical';
                
                // Count unique values
                const uniqueValues = new Set(values);
                stats.ranges[col] = {
                    uniqueCount: uniqueValues.size,
                    totalCount: nonNullCount
                };
            }
        });
        
        return stats;
    },
    
    /**
     * Generate data quality recommendations
     */
    generateRecommendations(data, statistics) {
        const recommendations = [];
        
        // Check for high missing values
        Object.entries(statistics.missingValues || {}).forEach(([col, missing]) => {
            if (missing.percentage > 50) {
                recommendations.push({
                    type: 'warning',
                    message: `Column '${col}' has ${missing.percentage.toFixed(1)}% missing values`,
                    suggestion: 'Consider removing this column or imputing missing values'
                });
            } else if (missing.percentage > 20) {
                recommendations.push({
                    type: 'info',
                    message: `Column '${col}' has ${missing.percentage.toFixed(1)}% missing values`,
                    suggestion: 'Consider imputing missing values before clustering'
                });
            }
        });
        
        // Check for highly categorical columns
        Object.entries(statistics.ranges || {}).forEach(([col, range]) => {
            if (statistics.dataTypes[col] === 'categorical' && range.uniqueCount === range.totalCount) {
                recommendations.push({
                    type: 'warning',
                    message: `Column '${col}' has unique values for each row`,
                    suggestion: 'This column may not be useful for clustering (consider removing)'
                });
            }
        });
        
        // Check dataset size for clustering
        if (statistics.rowCount < 10) {
            recommendations.push({
                type: 'warning',
                message: 'Very small dataset for clustering',
                suggestion: 'Consider collecting more data for meaningful clusters'
            });
        } else if (statistics.rowCount > 10000) {
            recommendations.push({
                type: 'info',
                message: 'Large dataset detected',
                suggestion: 'Consider sampling for faster clustering performance'
            });
        }
        
        return recommendations;
    }
};

/**
 * Data preprocessing utilities
 */
const DataPreprocessor = {
    /**
     * Normalize numeric data
     */
    normalize(data, columns, method = 'zscore') {
        const processed = data.map(row => ({ ...row }));
        const stats = {};
        
        columns.forEach(col => {
            const values = data.map(row => row[col]).filter(val => 
                typeof val === 'number' && !isNaN(val)
            );
            
            if (values.length === 0) return;
            
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            stats[col] = { mean, stdDev, min, max };
            
            processed.forEach(row => {
                if (typeof row[col] === 'number' && !isNaN(row[col])) {
                    switch (method) {
                        case 'zscore':
                            row[col] = stdDev > 0 ? (row[col] - mean) / stdDev : 0;
                            break;
                        case 'minmax':
                            row[col] = max > min ? (row[col] - min) / (max - min) : 0;
                            break;
                        case 'robust':
                            // Use median and MAD for robust scaling
                            const sortedValues = [...values].sort((a, b) => a - b);
                            const median = this.calculateMedian(sortedValues);
                            const mad = this.calculateMAD(values, median);
                            row[col] = mad > 0 ? (row[col] - median) / mad : 0;
                            break;
                    }
                }
            });
        });
        
        return { data: processed, stats };
    },
    
    /**
     * Handle missing values
     */
    handleMissingValues(data, method = 'mean', columns = null) {
        const processed = data.map(row => ({ ...row }));
        const targetColumns = columns || Object.keys(data[0] || {});
        
        targetColumns.forEach(col => {
            const values = data.map(row => row[col]).filter(val => 
                val !== null && val !== undefined && val !== ''
            );
            
            if (values.length === 0) return;
            
            let fillValue;
            
            switch (method) {
                case 'mean':
                    const numericValues = values.filter(val => typeof val === 'number');
                    fillValue = numericValues.length > 0 ? 
                        numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length : null;
                    break;
                    
                case 'median':
                    const sortedNumeric = values.filter(val => typeof val === 'number').sort((a, b) => a - b);
                    fillValue = sortedNumeric.length > 0 ? this.calculateMedian(sortedNumeric) : null;
                    break;
                    
                case 'mode':
                    fillValue = this.calculateMode(values);
                    break;
                    
                case 'forward_fill':
                    // Fill with previous non-null value
                    let lastValid = null;
                    processed.forEach(row => {
                        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
                            lastValid = row[col];
                        } else if (lastValid !== null) {
                            row[col] = lastValid;
                        }
                    });
                    return;
                    
                case 'remove':
                    // Filter out rows with missing values in this column
                    return processed.filter(row => 
                        row[col] !== null && row[col] !== undefined && row[col] !== ''
                    );
                    
                default:
                    fillValue = 0;
            }
            
            if (fillValue !== null) {
                processed.forEach(row => {
                    if (row[col] === null || row[col] === undefined || row[col] === '') {
                        row[col] = fillValue;
                    }
                });
            }
        });
        
        return processed;
    },
    
    /**
     * Remove outliers
     */
    removeOutliers(data, columns, method = 'iqr', threshold = 1.5) {
        let filtered = [...data];
        
        columns.forEach(col => {
            const values = filtered.map(row => row[col]).filter(val => 
                typeof val === 'number' && !isNaN(val)
            );
            
            if (values.length === 0) return;
            
            let lowerBound, upperBound;
            
            switch (method) {
                case 'iqr':
                    const sorted = [...values].sort((a, b) => a - b);
                    const q1 = this.calculatePercentile(sorted, 25);
                    const q3 = this.calculatePercentile(sorted, 75);
                    const iqr = q3 - q1;
                    lowerBound = q1 - threshold * iqr;
                    upperBound = q3 + threshold * iqr;
                    break;
                    
                case 'zscore':
                    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                    const stdDev = Math.sqrt(variance);
                    lowerBound = mean - threshold * stdDev;
                    upperBound = mean + threshold * stdDev;
                    break;
                    
                case 'percentile':
                    const sortedPerc = [...values].sort((a, b) => a - b);
                    lowerBound = this.calculatePercentile(sortedPerc, threshold);
                    upperBound = this.calculatePercentile(sortedPerc, 100 - threshold);
                    break;
            }
            
            filtered = filtered.filter(row => {
                const value = row[col];
                return typeof value !== 'number' || (value >= lowerBound && value <= upperBound);
            });
        });
        
        return filtered;
    },
    
    /**
     * Sample data for performance
     */
    sampleData(data, sampleSize, method = 'random') {
        if (data.length <= sampleSize) return data;
        
        switch (method) {
            case 'random':
                const shuffled = [...data].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, sampleSize);
                
            case 'systematic':
                const step = Math.floor(data.length / sampleSize);
                return data.filter((_, index) => index % step === 0).slice(0, sampleSize);
                
            case 'stratified':
                // Simple stratified sampling based on first categorical column
                const categorical = Object.keys(data[0] || {}).find(col => {
                    const values = data.map(row => row[col]);
                    const uniqueCount = new Set(values).size;
                    return uniqueCount < data.length * 0.5;
                });
                
                if (!categorical) {
                    return this.sampleData(data, sampleSize, 'random');
                }
                
                const groups = new Map();
                data.forEach(row => {
                    const key = row[categorical];
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key).push(row);
                });
                
                const samplePerGroup = Math.ceil(sampleSize / groups.size);
                const sampled = [];
                
                for (const [key, groupData] of groups) {
                    const groupSample = this.sampleData(groupData, samplePerGroup, 'random');
                    sampled.push(...groupSample);
                }
                
                return sampled.slice(0, sampleSize);
                
            default:
                return data.slice(0, sampleSize);
        }
    },
    
    /**
     * Calculate median
     */
    calculateMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 === 0 ?
            (sortedArray[mid - 1] + sortedArray[mid]) / 2 :
            sortedArray[mid];
    },
    
    /**
     * Calculate mode
     */
    calculateMode(values) {
        const frequency = new Map();
        values.forEach(val => {
            frequency.set(val, (frequency.get(val) || 0) + 1);
        });
        
        let maxCount = 0;
        let mode = values[0];
        
        for (const [value, count] of frequency) {
            if (count > maxCount) {
                maxCount = count;
                mode = value;
            }
        }
        
        return mode;
    },
    
    /**
     * Calculate MAD (Median Absolute Deviation)
     */
    calculateMAD(values, median) {
        const deviations = values.map(val => Math.abs(val - median));
        const sortedDeviations = deviations.sort((a, b) => a - b);
        return this.calculateMedian(sortedDeviations);
    },
    
    /**
     * Calculate percentile
     */
    calculatePercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedArray[lower];
        }
        
        const weight = index - lower;
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
};

/**
 * Data transformation utilities
 */
const DataTransformer = {
    /**
     * Convert categorical variables to numeric
     */
    encodeCategorical(data, columns, method = 'onehot') {
        const processed = data.map(row => ({ ...row }));
        const encodings = {};
        
        columns.forEach(col => {
            const uniqueValues = [...new Set(data.map(row => row[col]))].filter(val => 
                val !== null && val !== undefined
            );
            
            switch (method) {
                case 'onehot':
                    encodings[col] = uniqueValues;
                    uniqueValues.forEach(value => {
                        const newCol = `${col}_${value}`;
                        processed.forEach(row => {
                            row[newCol] = row[col] === value ? 1 : 0;
                        });
                    });
                    // Remove original column
                    processed.forEach(row => delete row[col]);
                    break;
                    
                case 'label':
                    const mapping = {};
                    uniqueValues.forEach((value, index) => {
                        mapping[value] = index;
                    });
                    encodings[col] = mapping;
                    
                    processed.forEach(row => {
                        row[col] = mapping[row[col]] || 0;
                    });
                    break;
                    
                case 'ordinal':
                    // Assumes values are already in order
                    const ordinalMapping = {};
                    uniqueValues.sort().forEach((value, index) => {
                        ordinalMapping[value] = index;
                    });
                    encodings[col] = ordinalMapping;
                    
                    processed.forEach(row => {
                        row[col] = ordinalMapping[row[col]] || 0;
                    });
                    break;
            }
        });
        
        return { data: processed, encodings };
    },
    
    /**
     * Extract features for clustering
     */
    extractClusteringFeatures(data, options = {}) {
        const numericColumns = options.numericColumns || [];
        const categoricalColumns = options.categoricalColumns || [];
        const excludeColumns = options.excludeColumns || [];
        
        let processed = data.map(row => ({ ...row }));
        
        // Remove excluded columns
        excludeColumns.forEach(col => {
            processed.forEach(row => delete row[col]);
        });
        
        // Encode categorical variables
        if (categoricalColumns.length > 0) {
            const encoded = this.encodeCategorical(processed, categoricalColumns, 'onehot');
            processed = encoded.data;
        }
        
        // Extract only numeric features for clustering
        const features = processed.map((row, index) => {
            const feature = { index };
            
            Object.entries(row).forEach(([key, value]) => {
                if (typeof value === 'number' && !isNaN(value)) {
                    feature[key] = value;
                }
            });
            
            return feature;
        });
        
        return features;
    }
};

/**
 * Worker message handler
 */
self.onmessage = function(e) {
    const { type, data, options, taskId } = e.data;
    
    try {
        postMessage({
            type: 'start',
            operation: type,
            taskId,
            timestamp: Date.now()
        });
        
        let result;
        
        switch (type) {
            case 'parse_csv':
                result = DataParser.parseCSV(data, options);
                break;
                
            case 'parse_json':
                result = DataParser.parseJSON(data, options);
                break;
                
            case 'validate':
                result = DataValidator.validateDataset(data, options);
                break;
                
            case 'normalize':
                result = DataPreprocessor.normalize(data, options.columns, options.method);
                break;
                
            case 'handle_missing':
                result = DataPreprocessor.handleMissingValues(data, options.method, options.columns);
                break;
                
            case 'remove_outliers':
                result = DataPreprocessor.removeOutliers(data, options.columns, options.method, options.threshold);
                break;
                
            case 'sample':
                result = DataPreprocessor.sampleData(data, options.sampleSize, options.method);
                break;
                
            case 'encode_categorical':
                result = DataTransformer.encodeCategorical(data, options.columns, options.method);
                break;
                
            case 'extract_features':
                result = DataTransformer.extractClusteringFeatures(data, options);
                break;
                
            case 'preprocess_pipeline':
                // Run full preprocessing pipeline
                let pipeline = data;
                const steps = [];
                
                if (options.handleMissing) {
                    pipeline = DataPreprocessor.handleMissingValues(pipeline, options.missingMethod);
                    steps.push('handle_missing');
                }
                
                if (options.removeOutliers) {
                    pipeline = DataPreprocessor.removeOutliers(pipeline, options.numericColumns);
                    steps.push('remove_outliers');
                }
                
                if (options.encodeCategorical && options.categoricalColumns) {
                    const encoded = DataTransformer.encodeCategorical(pipeline, options.categoricalColumns);
                    pipeline = encoded.data;
                    steps.push('encode_categorical');
                }
                
                if (options.normalize && options.numericColumns) {
                    const normalized = DataPreprocessor.normalize(pipeline, options.numericColumns, options.normalizeMethod);
                    pipeline = normalized.data;
                    steps.push('normalize');
                }
                
                if (options.sample && options.sampleSize) {
                    pipeline = DataPreprocessor.sampleData(pipeline, options.sampleSize);
                    steps.push('sample');
                }
                
                result = { data: pipeline, steps };
                break;
                
            default:
                throw new Error(`Unknown operation: ${type}`);
        }
        
        postMessage({
            type: 'complete',
            operation: type,
            result,
            taskId,
            timestamp: Date.now()
        });
        
    } catch (error) {
        postMessage({
            type: 'error',
            operation: type,
            error: {
                message: error.message,
                stack: error.stack
            },
            taskId,
            timestamp: Date.now()
        });
    }
};