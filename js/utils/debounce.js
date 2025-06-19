/**
 * FILE: js/utils/clipboard.js
 * Clipboard Utility - Cross-browser clipboard operations
 * NCS-API Website
 * 
 * Features:
 * - Text copy/paste with fallback methods
 * - Rich content (HTML, images) clipboard support
 * - Secure clipboard API with permission handling
 * - Format detection and conversion
 * - History tracking of clipboard operations
 * - CSV/JSON data formatting
 * - Code syntax highlighting for pasted content
 * - Batch operations and clipboard monitoring
 */

import { EventBus } from '../core/eventBus.js';

export class ClipboardManager {
    constructor(options = {}) {
        // Configuration
        this.config = {
            enableHistory: true,
            historyLimit: 50,
            enablePermissionRequest: true,
            enableFallback: true,
            enableFormatDetection: true,
            enableAutoFormat: true,
            enableNotifications: true,
            defaultFormat: 'text/plain',
            ...options
        };
        
        // Event system
        this.eventBus = new EventBus();
        
        // Clipboard history
        this.history = [];
        
        // Supported formats
        this.supportedFormats = [
            'text/plain',
            'text/html',
            'text/csv',
            'application/json',
            'image/png',
            'image/jpeg',
            'image/gif'
        ];
        
        // Format converters
        this.formatters = {
            json: this.formatJSON.bind(this),
            csv: this.formatCSV.bind(this),
            code: this.formatCode.bind(this),
            table: this.formatTable.bind(this),
            markdown: this.formatMarkdown.bind(this)
        };
        
        // Browser capabilities
        this.capabilities = {
            asyncClipboardAPI: !!navigator.clipboard,
            writeText: !!(navigator.clipboard && navigator.clipboard.writeText),
            readText: !!(navigator.clipboard && navigator.clipboard.readText),
            write: !!(navigator.clipboard && navigator.clipboard.write),
            read: !!(navigator.clipboard && navigator.clipboard.read)
        };
        
        // Statistics
        this.stats = {
            totalCopies: 0,
            totalPastes: 0,
            successfulOperations: 0,
            failedOperations: 0,
            formatUsage: {}
        };
        
        this.init();
    }

    /**
     * Initialize clipboard manager
     */
    init() {
        try {
            // Check permissions
            this.checkPermissions();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('📋 Clipboard Manager initialized', this.capabilities);
        } catch (error) {
            console.error('❌ Clipboard initialization failed:', error);
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyText(text, options = {}) {
        if (!text) {
            throw new Error('No text provided to copy');
        }
        
        const config = { ...this.config, ...options };
        
        try {
            // Try modern clipboard API first
            if (this.capabilities.writeText) {
                await navigator.clipboard.writeText(text);
            } else if (config.enableFallback) {
                await this.fallbackCopyText(text);
            } else {
                throw new Error('Clipboard API not supported');
            }
            
            // Add to history
            if (config.enableHistory) {
                this.addToHistory({ type: 'text', content: text, timestamp: Date.now() });
            }
            
            // Update stats
            this.stats.totalCopies++;
            this.stats.successfulOperations++;
            this.updateFormatUsage('text/plain');
            
            // Emit event
            this.eventBus.emit('clipboard:copy', { type: 'text', content: text, success: true });
            
            // Show notification
            if (config.enableNotifications) {
                this.showNotification('Text copied to clipboard', 'success');
            }
            
            return { success: true, type: 'text', length: text.length };
            
        } catch (error) {
            this.stats.failedOperations++;
            this.eventBus.emit('clipboard:copy', { type: 'text', content: text, success: false, error });
            throw new Error(`Failed to copy text: ${error.message}`);
        }
    }

    /**
     * Copy rich content (HTML/images) to clipboard
     */
    async copyRich(data, format, options = {}) {
        if (!data) {
            throw new Error('No data provided to copy');
        }
        
        const config = { ...this.config, ...options };
        
        try {
            if (!this.capabilities.write) {
                throw new Error('Rich clipboard operations not supported');
            }
            
            let clipboardItem;
            
            if (format === 'text/html') {
                clipboardItem = new ClipboardItem({
                    'text/html': new Blob([data], { type: 'text/html' }),
                    'text/plain': new Blob([this.stripHTML(data)], { type: 'text/plain' })
                });
            } else if (format.startsWith('image/')) {
                clipboardItem = new ClipboardItem({
                    [format]: data instanceof Blob ? data : new Blob([data], { type: format })
                });
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }
            
            await navigator.clipboard.write([clipboardItem]);
            
            // Add to history
            if (config.enableHistory) {
                this.addToHistory({
                    type: 'rich',
                    format,
                    content: format.startsWith('image/') ? '[Image]' : data,
                    timestamp: Date.now()
                });
            }
            
            // Update stats
            this.stats.totalCopies++;
            this.stats.successfulOperations++;
            this.updateFormatUsage(format);
            
            this.eventBus.emit('clipboard:copy', { type: 'rich', format, success: true });
            
            if (config.enableNotifications) {
                this.showNotification(`${format} content copied to clipboard`, 'success');
            }
            
            return { success: true, type: 'rich', format };
            
        } catch (error) {
            this.stats.failedOperations++;
            this.eventBus.emit('clipboard:copy', { type: 'rich', format, success: false, error });
            throw new Error(`Failed to copy rich content: ${error.message}`);
        }
    }

    /**
     * Copy formatted data (JSON, CSV, etc.)
     */
    async copyFormatted(data, format, options = {}) {
        if (!data) {
            throw new Error('No data provided to copy');
        }
        
        const formatter = this.formatters[format];
        if (!formatter) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        try {
            const formattedText = formatter(data, options);
            return await this.copyText(formattedText, options);
        } catch (error) {
            throw new Error(`Failed to copy formatted data: ${error.message}`);
        }
    }

    /**
     * Read text from clipboard
     */
    async readText(options = {}) {
        const config = { ...this.config, ...options };
        
        try {
            let text;
            
            if (this.capabilities.readText) {
                text = await navigator.clipboard.readText();
            } else if (config.enableFallback) {
                text = await this.fallbackReadText();
            } else {
                throw new Error('Clipboard read not supported');
            }
            
            // Update stats
            this.stats.totalPastes++;
            this.stats.successfulOperations++;
            
            // Process and format if enabled
            if (config.enableAutoFormat && config.enableFormatDetection) {
                const detectedFormat = this.detectFormat(text);
                if (detectedFormat !== 'text/plain') {
                    text = this.processFormattedText(text, detectedFormat);
                }
            }
            
            this.eventBus.emit('clipboard:read', { type: 'text', content: text, success: true });
            
            return { success: true, content: text, type: 'text' };
            
        } catch (error) {
            this.stats.failedOperations++;
            this.eventBus.emit('clipboard:read', { success: false, error });
            throw new Error(`Failed to read clipboard: ${error.message}`);
        }
    }

    /**
     * Read rich content from clipboard
     */
    async readRich(options = {}) {
        const config = { ...this.config, ...options };
        
        try {
            if (!this.capabilities.read) {
                throw new Error('Rich clipboard read not supported');
            }
            
            const clipboardItems = await navigator.clipboard.read();
            const results = [];
            
            for (const item of clipboardItems) {
                for (const format of item.types) {
                    if (this.supportedFormats.includes(format)) {
                        const blob = await item.getType(format);
                        
                        let content;
                        if (format.startsWith('text/')) {
                            content = await blob.text();
                        } else if (format.startsWith('image/')) {
                            content = await this.blobToDataURL(blob);
                        } else {
                            content = blob;
                        }
                        
                        results.push({ format, content, size: blob.size });
                    }
                }
            }
            
            this.stats.totalPastes++;
            this.stats.successfulOperations++;
            
            this.eventBus.emit('clipboard:read', { type: 'rich', content: results, success: true });
            
            return { success: true, content: results, type: 'rich' };
            
        } catch (error) {
            this.stats.failedOperations++;
            this.eventBus.emit('clipboard:read', { success: false, error });
            throw new Error(`Failed to read rich clipboard: ${error.message}`);
        }
    }

    /**
     * Copy clustering results to clipboard
     */
    async copyClusteringResults(results, format = 'json', options = {}) {
        const exportData = {
            algorithm: results.algorithm || 'unknown',
            timestamp: new Date().toISOString(),
            dataPoints: results.data?.length || 0,
            clusters: results.clusters || [],
            centroids: results.centroids || [],
            quality: results.quality || null,
            parameters: results.parameters || {},
            summary: {
                totalPoints: results.data?.length || 0,
                clusterCount: Math.max(...(results.clusters || [0])) + 1,
                processingTime: results.processingTime || null
            }
        };
        
        if (options.includeData) {
            exportData.data = results.data || [];
        }
        
        return await this.copyFormatted(exportData, format, options);
    }

    /**
     * Copy code with syntax highlighting
     */
    async copyCode(code, language = 'javascript', options = {}) {
        const config = { 
            includeLanguageHeader: true,
            includeLineNumbers: false,
            ...options 
        };
        
        let formattedCode = code;
        
        if (config.includeLanguageHeader) {
            formattedCode = `// Language: ${language}\n${code}`;
        }
        
        if (config.includeLineNumbers) {
            const lines = formattedCode.split('\n');
            formattedCode = lines.map((line, index) => 
                `${(index + 1).toString().padStart(3, ' ')}: ${line}`
            ).join('\n');
        }
        
        return await this.copyText(formattedCode, options);
    }

    /**
     * Copy table data as formatted text
     */
    async copyTable(data, options = {}) {
        const config = {
            format: 'tab-separated', // 'tab-separated', 'csv', 'markdown'
            includeHeaders: true,
            ...options
        };
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid table data provided');
        }
        
        let formattedTable = '';
        const headers = Object.keys(data[0]);
        
        if (config.includeHeaders) {
            if (config.format === 'markdown') {
                formattedTable += '| ' + headers.join(' | ') + ' |\n';
                formattedTable += '|' + headers.map(() => '---').join('|') + '|\n';
            } else {
                const separator = config.format === 'csv' ? ',' : '\t';
                formattedTable += headers.join(separator) + '\n';
            }
        }
        
        data.forEach(row => {
            const values = headers.map(header => row[header] || '');
            
            if (config.format === 'markdown') {
                formattedTable += '| ' + values.join(' | ') + ' |\n';
            } else {
                const separator = config.format === 'csv' ? ',' : '\t';
                formattedTable += values.join(separator) + '\n';
            }
        });
        
        return await this.copyText(formattedTable, options);
    }

    /**
     * Format conversion methods
     */
    formatJSON(data, options = {}) {
        const config = { indent: 2, ...options };
        return JSON.stringify(data, null, config.indent);
    }

    formatCSV(data, options = {}) {
        const config = { delimiter: ',', includeHeaders: true, ...options };
        
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        let csv = '';
        
        if (config.includeHeaders) {
            csv += headers.join(config.delimiter) + '\n';
        }
        
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header];
                if (value === null || value === undefined) value = '';
                if (typeof value === 'string' && value.includes(config.delimiter)) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(config.delimiter) + '\n';
        });
        
        return csv;
    }

    formatCode(code, options = {}) {
        const config = { language: 'javascript', includeWrapper: true, ...options };
        
        if (config.includeWrapper) {
            return `\`\`\`${config.language}\n${code}\n\`\`\``;
        }
        
        return code;
    }

    formatTable(data, options = {}) {
        const config = { format: 'markdown', ...options };
        
        if (config.format === 'markdown') {
            return this.formatMarkdownTable(data);
        }
        
        return this.formatCSV(data, options);
    }

    formatMarkdown(data, options = {}) {
        if (typeof data === 'string') {
            return data;
        }
        
        if (Array.isArray(data)) {
            return this.formatMarkdownTable(data);
        }
        
        return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    }

    formatMarkdownTable(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        const headers = Object.keys(data[0]);
        let markdown = '| ' + headers.join(' | ') + ' |\n';
        markdown += '|' + headers.map(() => '---').join('|') + '|\n';
        
        data.forEach(row => {
            const values = headers.map(header => String(row[header] || ''));
            markdown += '| ' + values.join(' | ') + ' |\n';
        });
        
        return markdown;
    }

    /**
     * Fallback methods for older browsers
     */
    async fallbackCopyText(text) {
        return new Promise((resolve, reject) => {
            try {
                // Create temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.pointerEvents = 'none';
                
                document.body.appendChild(textarea);
                
                // Select and copy
                textarea.select();
                textarea.setSelectionRange(0, textarea.value.length);
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('execCommand copy failed'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async fallbackReadText() {
        // Fallback for reading clipboard - very limited support
        throw new Error('Reading clipboard not supported in this browser');
    }

    /**
     * Utility methods
     */
    detectFormat(text) {
        try {
            // Try to parse as JSON
            JSON.parse(text);
            return 'application/json';
        } catch (e) {
            // Not JSON
        }
        
        // Check for CSV-like structure
        if (text.includes(',') && text.includes('\n')) {
            const lines = text.trim().split('\n');
            if (lines.length > 1) {
                const firstLineCommas = (lines[0].match(/,/g) || []).length;
                const secondLineCommas = (lines[1].match(/,/g) || []).length;
                if (firstLineCommas === secondLineCommas && firstLineCommas > 0) {
                    return 'text/csv';
                }
            }
        }
        
        // Check for HTML
        if (text.includes('<') && text.includes('>')) {
            return 'text/html';
        }
        
        return 'text/plain';
    }

    processFormattedText(text, format) {
        switch (format) {
            case 'application/json':
                try {
                    const parsed = JSON.parse(text);
                    return JSON.stringify(parsed, null, 2); // Pretty format
                } catch (e) {
                    return text;
                }
            case 'text/csv':
                // Could add CSV formatting here
                return text;
            case 'text/html':
                return this.stripHTML(text);
            default:
                return text;
        }
    }

    stripHTML(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    async blobToDataURL(blob) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    addToHistory(item) {
        this.history.unshift(item);
        
        // Limit history size
        if (this.history.length > this.config.historyLimit) {
            this.history = this.history.slice(0, this.config.historyLimit);
        }
    }

    updateFormatUsage(format) {
        this.stats.formatUsage[format] = (this.stats.formatUsage[format] || 0) + 1;
    }

    async checkPermissions() {
        if (this.capabilities.asyncClipboardAPI && this.config.enablePermissionRequest) {
            try {
                const readPermission = await navigator.permissions.query({ name: 'clipboard-read' });
                const writePermission = await navigator.permissions.query({ name: 'clipboard-write' });
                
                console.log('Clipboard permissions:', {
                    read: readPermission.state,
                    write: writePermission.state
                });
            } catch (error) {
                console.warn('Could not check clipboard permissions:', error);
            }
        }
    }

    setupEventListeners() {
        // Listen for keyboard shortcuts (Ctrl+C, Ctrl+V)
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                if (event.key === 'c' && !event.shiftKey && !event.altKey) {
                    this.eventBus.emit('clipboard:shortcut', { action: 'copy', event });
                } else if (event.key === 'v' && !event.shiftKey && !event.altKey) {
                    this.eventBus.emit('clipboard:shortcut', { action: 'paste', event });
                }
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast[type](message);
        } else {
            console.log(`Clipboard: ${message}`);
        }
    }

    /**
     * Public API methods
     */
    getHistory(limit = 20) {
        return this.history.slice(0, limit);
    }

    clearHistory() {
        this.history = [];
    }

    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalCopies + this.stats.totalPastes > 0 ? 
                ((this.stats.successfulOperations / (this.stats.totalCopies + this.stats.totalPastes)) * 100).toFixed(1) + '%' : '0%',
            capabilities: this.capabilities
        };
    }

    getCapabilities() {
        return this.capabilities;
    }

    isSupported() {
        return this.capabilities.asyncClipboardAPI || this.config.enableFallback;
    }
}

// Create singleton instance
const clipboardManager = new ClipboardManager();

// Convenience functions
export const clipboard = {
    // Basic operations
    copy: (text, options) => clipboardManager.copyText(text, options),
    read: (options) => clipboardManager.readText(options),
    
    // Rich content
    copyRich: (data, format, options) => clipboardManager.copyRich(data, format, options),
    readRich: (options) => clipboardManager.readRich(options),
    
    // Formatted data
    copyJSON: (data, options) => clipboardManager.copyFormatted(data, 'json', options),
    copyCSV: (data, options) => clipboardManager.copyFormatted(data, 'csv', options),
    copyMarkdown: (data, options) => clipboardManager.copyFormatted(data, 'markdown', options),
    
    // Specialized operations
    copyCode: (code, language, options) => clipboardManager.copyCode(code, language, options),
    copyTable: (data, options) => clipboardManager.copyTable(data, options),
    copyClusteringResults: (results, format, options) => clipboardManager.copyClusteringResults(results, format, options),
    
    // Utility methods
    getHistory: (limit) => clipboardManager.getHistory(limit),
    clearHistory: () => clipboardManager.clearHistory(),
    getStats: () => clipboardManager.getStats(),
    getCapabilities: () => clipboardManager.getCapabilities(),
    isSupported: () => clipboardManager.isSupported(),
    
    // Event handling
    on: (event, callback) => clipboardManager.eventBus.on(event, callback),
    off: (event, callback) => clipboardManager.eventBus.off(event, callback)
};

// Export both the manager class and convenience object
export { clipboardManager };
export default clipboard;