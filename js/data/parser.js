/**
 * Data Parser Module for NCS-API-Website
 * Handles parsing and processing of various data formats (CSV, JSON, Excel)
 * Provides robust data type detection and normalization
 */

import { EventBus } from '../core/eventBusNew.js';

export class DataParser {
    constructor() {
        this.supportedFormats = ['csv', 'json', 'xlsx', 'xls', 'tsv'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB limit
        this.delimiter = ',';
        this.hasHeader = true;
    }

    /**
     * Parse file based on its type
     * @param {File|String} input - File object or raw string data
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} Parsed data with metadata
     */
    async parseFile(input, options = {}) {
        try {
            // Validate input
            if (input instanceof File) {
                this.validateFile(input);
                const fileType = this.detectFileType(input.name);
                const content = await this.readFile(input);
                return await this.parseContent(content, fileType, options);
            } else if (typeof input === 'string') {
                // Assume CSV format for string input
                return await this.parseContent(input, 'csv', options);
            } else {
                throw new Error('Invalid input type. Expected File object or string.');
            }
        } catch (error) {
            EventBus.emit('parser:error', { error: error.message, timestamp: Date.now() });
            throw error;
        }
    }

    /**
     * Validate file before processing
     * @param {File} file - File to validate
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum limit (${this.maxFileSize / 1024 / 1024}MB)`);
        }

        // Check file type
        const fileType = this.detectFileType(file.name);
        if (!this.supportedFormats.includes(fileType)) {
            throw new Error(`Unsupported file format: ${fileType}. Supported formats: ${this.supportedFormats.join(', ')}`);
        }
    }

    /**
     * Detect file type from filename
     * @param {String} filename - Name of the file
     * @returns {String} File type
     */
    detectFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'csv': return 'csv';
            case 'tsv': return 'tsv';
            case 'json': return 'json';
            case 'xlsx': return 'xlsx';
            case 'xls': return 'xls';
            default: return 'csv'; // Default to CSV
        }
    }

    /**
     * Read file content
     * @param {File} file - File to read
     * @returns {Promise<String|ArrayBuffer>} File content
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(new Error('Failed to read file: ' + error.message));
            
            const fileType = this.detectFileType(file.name);
            if (['xlsx', 'xls'].includes(fileType)) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    }

    /**
     * Parse content based on format
     * @param {String|ArrayBuffer} content - Raw content
     * @param {String} type - File type
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} Parsed data
     */
    async parseContent(content, type, options = {}) {
        const startTime = performance.now();
        
        let result;
        switch (type) {
            case 'csv':
                result = await this.parseCSV(content, options);
                break;
            case 'tsv':
                result = await this.parseCSV(content, { ...options, delimiter: '\t' });
                break;
            case 'json':
                result = await this.parseJSON(content, options);
                break;
            case 'xlsx':
            case 'xls':
                result = await this.parseExcel(content, options);
                break;
            default:
                throw new Error(`Unsupported file type: ${type}`);
        }

        const parseTime = performance.now() - startTime;
        
        // Add metadata
        result.metadata = {
            ...result.metadata,
            parseTime: Math.round(parseTime),
            fileType: type,
            timestamp: Date.now()
        };

        EventBus.emit('parser:success', { 
            rowCount: result.data.length,
            columnCount: result.headers.length,
            parseTime,
            fileType: type
        });

        return result;
    }

    /**
     * Parse CSV content
     * @param {String} content - CSV content
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} Parsed CSV data
     */
    async parseCSV(content, options = {}) {
        const delimiter = options.delimiter || this.delimiter;
        const hasHeader = options.hasHeader !== undefined ? options.hasHeader : this.hasHeader;
        
        // Split content into lines
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Parse header
        let headers = [];
        let dataStartIndex = 0;

        if (hasHeader) {
            headers = this.parseCSVLine(lines[0], delimiter);
            dataStartIndex = 1;
        } else {
            // Generate default headers
            const firstLine = this.parseCSVLine(lines[0], delimiter);
            headers = firstLine.map((_, index) => `Column_${index + 1}`);
        }

        // Validate headers
        this.validateHeaders(headers);

        // Parse data rows
        const data = [];
        const errors = [];
        
        for (let i = dataStartIndex; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i], delimiter);
                
                // Skip empty rows
                if (values.every(value => value === '')) continue;
                
                // Ensure row has correct number of columns
                while (values.length < headers.length) {
                    values.push('');
                }
                
                // Truncate if too many columns
                if (values.length > headers.length) {
                    values.splice(headers.length);
                }

                // Create row object
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = this.parseValue(values[index]);
                });
                
                data.push(row);
            } catch (error) {
                errors.push({ line: i + 1, error: error.message });
            }
        }

        return {
            data,
            headers,
            metadata: {
                totalRows: data.length,
                totalColumns: headers.length,
                errors: errors.length > 0 ? errors : null,
                delimiter,
                hasHeader
            }
        };
    }

    /**
     * Parse CSV line with proper quote handling
     * @param {String} line - CSV line
     * @param {String} delimiter - Field delimiter
     * @returns {Array} Parsed values
     */
    parseCSVLine(line, delimiter = ',') {
        const values = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                // Field separator
                values.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Add final value
        values.push(current.trim());

        return values;
    }

    /**
     * Parse JSON content
     * @param {String} content - JSON content
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} Parsed JSON data
     */
    async parseJSON(content, options = {}) {
        let jsonData;
        
        try {
            jsonData = JSON.parse(content);
        } catch (error) {
            throw new Error('Invalid JSON format: ' + error.message);
        }

        // Handle different JSON structures
        let data, headers;

        if (Array.isArray(jsonData)) {
            if (jsonData.length === 0) {
                throw new Error('JSON array is empty');
            }
            
            // Extract headers from first object
            if (typeof jsonData[0] === 'object' && jsonData[0] !== null) {
                headers = Object.keys(jsonData[0]);
                data = jsonData.map(item => {
                    const row = {};
                    headers.forEach(header => {
                        row[header] = this.parseValue(item[header]);
                    });
                    return row;
                });
            } else {
                // Array of primitives
                headers = ['Value'];
                data = jsonData.map(value => ({ Value: this.parseValue(value) }));
            }
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            // Single object - convert to array
            headers = Object.keys(jsonData);
            data = [{}];
            headers.forEach(header => {
                data[0][header] = this.parseValue(jsonData[header]);
            });
        } else {
            throw new Error('JSON must contain an array or object');
        }

        this.validateHeaders(headers);

        return {
            data,
            headers,
            metadata: {
                totalRows: data.length,
                totalColumns: headers.length,
                originalFormat: 'json'
            }
        };
    }

    /**
     * Parse Excel content (placeholder - requires external library)
     * @param {ArrayBuffer} content - Excel content
     * @param {Object} options - Parsing options
     * @returns {Promise<Object>} Parsed Excel data
     */
    async parseExcel(content, options = {}) {
        // This would require a library like SheetJS (xlsx)
        // For now, throw an error suggesting CSV export
        throw new Error('Excel parsing requires additional libraries. Please export your data as CSV format.');
    }

    /**
     * Parse and normalize value based on type detection
     * @param {String} value - Raw value
     * @returns {*} Parsed value
     */
    parseValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        const stringValue = String(value).trim();
        
        // Handle empty values
        if (stringValue === '' || stringValue.toLowerCase() === 'null' || stringValue.toLowerCase() === 'na') {
            return null;
        }

        // Boolean detection
        const lowerValue = stringValue.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
            return true;
        }
        if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') {
            return false;
        }

        // Number detection
        const numberValue = Number(stringValue);
        if (!isNaN(numberValue) && isFinite(numberValue)) {
            return numberValue;
        }

        // Date detection (basic)
        const dateValue = Date.parse(stringValue);
        if (!isNaN(dateValue)) {
            return new Date(dateValue);
        }

        // Return as string
        return stringValue;
    }

    /**
     * Validate headers for clustering compatibility
     * @param {Array} headers - Column headers
     */
    validateHeaders(headers) {
        if (!Array.isArray(headers) || headers.length === 0) {
            throw new Error('No valid headers found');
        }

        // Check for duplicate headers
        const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
        if (duplicates.length > 0) {
            throw new Error(`Duplicate headers found: ${duplicates.join(', ')}`);
        }

        // Check for invalid header names
        const invalidHeaders = headers.filter(header => 
            typeof header !== 'string' || header.trim() === '' || header.length > 100
        );
        if (invalidHeaders.length > 0) {
            throw new Error('Invalid header names detected');
        }
    }

    /**
     * Get data summary for visualization
     * @param {Array} data - Parsed data
     * @param {Array} headers - Column headers
     * @returns {Object} Data summary
     */
    getDataSummary(data, headers) {
        if (!data || data.length === 0) {
            return { error: 'No data to summarize' };
        }

        const summary = {
            totalRows: data.length,
            totalColumns: headers.length,
            columns: {}
        };

        headers.forEach(header => {
            const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
            const nonNullCount = values.length;
            const nullCount = data.length - nonNullCount;

            const columnSummary = {
                name: header,
                type: this.detectColumnType(values),
                nullCount,
                nonNullCount,
                nullPercentage: Math.round((nullCount / data.length) * 100)
            };

            // Type-specific statistics
            if (columnSummary.type === 'number') {
                const numericValues = values.filter(val => typeof val === 'number');
                if (numericValues.length > 0) {
                    columnSummary.min = Math.min(...numericValues);
                    columnSummary.max = Math.max(...numericValues);
                    columnSummary.mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
                    columnSummary.median = this.calculateMedian(numericValues);
                }
            } else if (columnSummary.type === 'string') {
                const uniqueValues = [...new Set(values)];
                columnSummary.uniqueCount = uniqueValues.length;
                columnSummary.mostCommon = this.getMostCommonValue(values);
            }

            summary.columns[header] = columnSummary;
        });

        return summary;
    }

    /**
     * Detect column data type
     * @param {Array} values - Column values
     * @returns {String} Detected type
     */
    detectColumnType(values) {
        if (values.length === 0) return 'unknown';

        const types = values.map(val => {
            if (typeof val === 'number') return 'number';
            if (typeof val === 'boolean') return 'boolean';
            if (val instanceof Date) return 'date';
            return 'string';
        });

        // Return the most common type
        const typeCounts = types.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(typeCounts).reduce((a, b) => 
            typeCounts[a] > typeCounts[b] ? a : b
        );
    }

    /**
     * Calculate median value
     * @param {Array} values - Numeric values
     * @returns {Number} Median value
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    /**
     * Get most common value in array
     * @param {Array} values - Values to analyze
     * @returns {*} Most common value
     */
    getMostCommonValue(values) {
        const counts = values.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(counts).reduce((a, b) => 
            counts[a] > counts[b] ? a : b
        );
    }

    /**
     * Export data to different formats
     * @param {Array} data - Data to export
     * @param {Array} headers - Column headers
     * @param {String} format - Export format
     * @returns {String} Formatted data
     */
    exportData(data, headers, format = 'csv') {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportToCSV(data, headers);
            case 'json':
                return this.exportToJSON(data);
            case 'tsv':
                return this.exportToCSV(data, headers, '\t');
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export data to CSV format
     * @param {Array} data - Data to export
     * @param {Array} headers - Column headers
     * @param {String} delimiter - Field delimiter
     * @returns {String} CSV string
     */
    exportToCSV(data, headers, delimiter = ',') {
        const csvLines = [];
        
        // Add headers
        csvLines.push(headers.map(header => this.escapeCSVValue(header, delimiter)).join(delimiter));
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return this.escapeCSVValue(value, delimiter);
            });
            csvLines.push(values.join(delimiter));
        });
        
        return csvLines.join('\n');
    }

    /**
     * Export data to JSON format
     * @param {Array} data - Data to export
     * @returns {String} JSON string
     */
    exportToJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Escape CSV value with quotes if necessary
     * @param {*} value - Value to escape
     * @param {String} delimiter - Field delimiter
     * @returns {String} Escaped value
     */
    escapeCSVValue(value, delimiter = ',') {
        if (value === null || value === undefined) {
            return '';
        }

        const stringValue = String(value);
        
        // Check if value needs quoting
        if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
            // Escape quotes by doubling them
            const escapedValue = stringValue.replace(/"/g, '""');
            return `"${escapedValue}"`;
        }
        
        return stringValue;
    }
}

// Create singleton instance
export const dataParser = new DataParser();

// Export for direct use
export default DataParser;