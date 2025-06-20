/**
 * Data Processing & Validation
 * Handles CSV, JSON, Excel file processing for NCS-API
 */

export class DataProcessor {
    constructor() {
        this.supportedFormats = ['csv', 'json', 'xlsx', 'xls', 'txt'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxRows = 100000; // 100k rows
    }

    /**
     * Process uploaded file
     */
    async processFile(file) {
        try {
            // Validate file
            this.validateFile(file);
            
            // Get file extension
            const extension = this.getFileExtension(file.name).toLowerCase();
            
            // Process based on file type
            let data;
            switch (extension) {
                case 'csv':
                case 'txt':
                    data = await this.processCSV(file);
                    break;
                case 'json':
                    data = await this.processJSON(file);
                    break;
                case 'xlsx':
                case 'xls':
                    data = await this.processExcel(file);
                    break;
                default:
                    throw new Error(`Unsupported file format: ${extension}`);
            }
            
            // Validate and clean data
            const processedData = this.validateAndCleanData(data);
            
            return {
                success: true,
                data: processedData.data,
                metadata: {
                    filename: file.name,
                    fileSize: file.size,
                    rows: processedData.data.length,
                    columns: processedData.columns,
                    numericColumns: processedData.numericColumns,
                    processedAt: new Date().toISOString()
                },
                validation: processedData.validation
            };
            
        } catch (error) {
            console.error('File processing failed:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Validate file before processing
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (file.size > this.maxFileSize) {
            throw new Error(`File too large. Maximum size: ${this.formatFileSize(this.maxFileSize)}`);
        }
        
        const extension = this.getFileExtension(file.name).toLowerCase();
        if (!this.supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`);
        }
    }

    /**
     * Process CSV file
     */
    async processCSV(file) {
        const text = await this.readFileAsText(file);
        
        // Simple CSV parser (you might want to use a more robust library like Papa Parse)
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }
        
        // Parse header
        const headers = this.parseCSVLine(lines[0]);
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length && i <= this.maxRows; i++) {
            const values = this.parseCSVLine(lines[i]);
            
            if (values.length !== headers.length) {
                console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
                continue;
            }
            
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                row[header.trim()] = this.parseValue(value);
            });
            
            data.push(row);
        }
        
        if (data.length === 0) {
            throw new Error('No valid data rows found in CSV');
        }
        
        return data;
    }

    /**
     * Parse CSV line (handles quoted values)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    /**
     * Process JSON file
     */
    async processJSON(file) {
        const text = await this.readFileAsText(file);
        
        try {
            const json = JSON.parse(text);
            
            // Handle different JSON structures
            if (Array.isArray(json)) {
                return json;
            } else if (json.data && Array.isArray(json.data)) {
                return json.data;
            } else if (typeof json === 'object') {
                // Convert object to array of key-value pairs
                return Object.entries(json).map(([key, value]) => ({
                    key,
                    value: typeof value === 'object' ? JSON.stringify(value) : value
                }));
            } else {
                throw new Error('Invalid JSON structure for clustering');
            }
        } catch (error) {
            throw new Error(`Invalid JSON file: ${error.message}`);
        }
    }

    /**
     * Process Excel file (simplified - for full Excel support, use a library like SheetJS)
     */
    async processExcel(file) {
        // For now, suggest user to export as CSV
        throw new Error('Excel files not yet supported. Please export your data as CSV and try again.');
    }

    /**
     * Validate and clean data
     */
    validateAndCleanData(rawData) {
        const errors = [];
        const warnings = [];
        
        if (!Array.isArray(rawData)) {
            throw new Error('Data must be an array of objects');
        }
        
        if (rawData.length === 0) {
            throw new Error('Dataset is empty');
        }
        
        if (rawData.length < 3) {
            warnings.push('Dataset is very small (less than 3 points). Clustering may not be meaningful.');
        }
        
        // Get column information
        const firstRow = rawData[0];
        const allColumns = Object.keys(firstRow);
        const numericColumns = [];
        const categoricalColumns = [];
        
        // Analyze column types
        allColumns.forEach(column => {
            const sampleValues = rawData.slice(0, Math.min(100, rawData.length))
                .map(row => row[column])
                .filter(val => val != null && val !== '');
                
            const numericCount = sampleValues.filter(val => 
                typeof val === 'number' || !isNaN(parseFloat(val))
            ).length;
            
            if (numericCount / sampleValues.length > 0.8) {
                numericColumns.push(column);
            } else {
                categoricalColumns.push(column);
            }
        });
        
        if (numericColumns.length < 2) {
            errors.push('Need at least 2 numeric columns for clustering. Found: ' + numericColumns.join(', '));
        }
        
        // Clean and convert data
        const cleanedData = rawData.map((row, index) => {
            const cleanedRow = {};
            
            allColumns.forEach(column => {
                let value = row[column];
                
                // Handle missing values
                if (value == null || value === '') {
                    if (numericColumns.includes(column)) {
                        value = 0; // Default numeric value
                    } else {
                        value = 'unknown'; // Default categorical value
                    }
                }
                
                // Convert numeric columns
                if (numericColumns.includes(column)) {
                    const numericValue = parseFloat(value);
                    cleanedRow[column] = isNaN(numericValue) ? 0 : numericValue;
                } else {
                    cleanedRow[column] = String(value);
                }
            });
            
            return cleanedRow;
        });
        
        // Remove rows with all zeros (likely corrupted)
        const validData = cleanedData.filter(row => {
            const numericValues = numericColumns.map(col => row[col]);
            return numericValues.some(val => val !== 0);
        });
        
        if (validData.length < cleanedData.length) {
            warnings.push(`Removed ${cleanedData.length - validData.length} rows with invalid data`);
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
        
        return {
            data: validData,
            columns: allColumns,
            numericColumns,
            categoricalColumns,
            validation: {
                errors,
                warnings,
                rowsProcessed: validData.length,
                rowsRemoved: cleanedData.length - validData.length
            }
        };
    }

    /**
     * Parse value with type detection
     */
    parseValue(value) {
        if (value == null || value === '') {
            return null;
        }
        
        const trimmed = String(value).trim();
        
        // Try to parse as number
        if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed))) {
            return parseFloat(trimmed);
        }
        
        // Try to parse as boolean
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        
        // Return as string
        return trimmed;
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Get file extension
     */
    getFileExtension(filename) {
        return filename.split('.').pop() || '';
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate data summary for preview
     */
    generateDataSummary(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }
        
        const columns = Object.keys(data[0]);
        const summary = {
            totalRows: data.length,
            totalColumns: columns.length,
            columns: {}
        };
        
        columns.forEach(column => {
            const values = data.map(row => row[column]).filter(val => val != null);
            const isNumeric = values.every(val => typeof val === 'number' || !isNaN(parseFloat(val)));
            
            const columnSummary = {
                type: isNumeric ? 'numeric' : 'categorical',
                nullCount: data.length - values.length,
                sampleValues: values.slice(0, 5)
            };
            
            if (isNumeric) {
                const numericValues = values.map(val => parseFloat(val)).filter(val => !isNaN(val));
                columnSummary.min = Math.min(...numericValues);
                columnSummary.max = Math.max(...numericValues);
                columnSummary.mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
            } else {
                const uniqueValues = [...new Set(values)];
                columnSummary.uniqueCount = uniqueValues.length;
                columnSummary.topValues = this.getTopValues(values);
            }
            
            summary.columns[column] = columnSummary;
        });
        
        return summary;
    }

    /**
     * Get top values for categorical data
     */
    getTopValues(values) {
        const counts = {};
        values.forEach(val => {
            counts[val] = (counts[val] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([value, count]) => ({ value, count }));
    }

    /**
     * Prepare data for clustering API
     */
    prepareForClustering(data, selectedColumns = null) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No data to prepare');
        }
        
        // If no columns selected, use all numeric columns
        if (!selectedColumns) {
            const firstRow = data[0];
            selectedColumns = Object.keys(firstRow).filter(column => {
                const value = firstRow[column];
                return typeof value === 'number' || !isNaN(parseFloat(value));
            });
        }
        
        if (selectedColumns.length < 2) {
            throw new Error('Need at least 2 columns for clustering');
        }
        
        // Extract only selected columns and ensure numeric values
        const clusteringData = data.map(row => {
            const clusterRow = {};
            selectedColumns.forEach(column => {
                const value = row[column];
                clusterRow[column] = typeof value === 'number' ? value : parseFloat(value) || 0;
            });
            return clusterRow;
        });
        
        return {
            data: clusteringData,
            columns: selectedColumns,
            originalData: data
        };
    }
}

export default DataProcessor;