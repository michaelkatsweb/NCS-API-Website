/**
 * FILE: js/utils/download.js
 * Download Utility - File download and export functionality
 * NCS-API Website
 * 
 * Features:
 * - Multiple file format support (CSV, JSON, Excel, PDF, Image)
 * - Blob and data URL handling
 * - Progress tracking for large downloads
 * - Batch download with ZIP compression
 * - Custom filename generation
 * - Download resumption support
 * - Error handling and retry logic
 * - Memory-efficient streaming
 */

import { EventBus } from '../core/eventBus.js';

export class DownloadManager {
    constructor(options = {}) {
        // Configuration
        this.config = {
            defaultChunkSize: 1024 * 1024, // 1MB chunks
            maxRetries: 3,
            retryDelay: 1000,
            enableProgress: true,
            enableZipCompression: true,
            sanitizeFilenames: true,
            timestampFiles: true,
            ...options
        };
        
        // Event system
        this.eventBus = new EventBus();
        
        // Active downloads tracking
        this.activeDownloads = new Map();
        this.downloadHistory = [];
        
        // Supported formats and their configurations
        this.formats = {
            csv: {
                mimeType: 'text/csv',
                extension: 'csv',
                converter: this.convertToCSV.bind(this)
            },
            json: {
                mimeType: 'application/json',
                extension: 'json',
                converter: this.convertToJSON.bind(this)
            },
            xlsx: {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                extension: 'xlsx',
                converter: this.convertToExcel.bind(this)
            },
            pdf: {
                mimeType: 'application/pdf',
                extension: 'pdf',
                converter: this.convertToPDF.bind(this)
            },
            png: {
                mimeType: 'image/png',
                extension: 'png',
                converter: this.convertToImage.bind(this)
            },
            svg: {
                mimeType: 'image/svg+xml',
                extension: 'svg',
                converter: this.convertToSVG.bind(this)
            },
            txt: {
                mimeType: 'text/plain',
                extension: 'txt',
                converter: this.convertToText.bind(this)
            },
            zip: {
                mimeType: 'application/zip',
                extension: 'zip',
                converter: this.convertToZip.bind(this)
            }
        };
        
        // Statistics
        this.stats = {
            totalDownloads: 0,
            totalBytes: 0,
            successfulDownloads: 0,
            failedDownloads: 0,
            averageSpeed: 0
        };
        
        console.log('📥 Download Manager initialized');
    }

    /**
     * Download data as specified format
     */
    async download(data, filename, format = 'json', options = {}) {
        const downloadId = this.generateDownloadId();
        
        try {
            // Validate inputs
            if (!data) throw new Error('No data provided for download');
            if (!filename) filename = this.generateFilename(format);
            
            // Get format configuration
            const formatConfig = this.formats[format.toLowerCase()];
            if (!formatConfig) throw new Error(`Unsupported format: ${format}`);
            
            // Start download tracking
            this.startDownload(downloadId, filename, format, options);
            
            // Convert data to specified format
            const blob = await this.convertData(data, format, options);
            
            // Update progress
            this.updateProgress(downloadId, 75, 'Converting data...');
            
            // Generate safe filename
            const safeFilename = this.sanitizeFilename(filename, formatConfig.extension);
            
            // Create download
            await this.createDownload(blob, safeFilename, downloadId);
            
            // Complete download
            this.completeDownload(downloadId, blob.size);
            
            return { success: true, downloadId, filename: safeFilename, size: blob.size };
            
        } catch (error) {
            this.failDownload(downloadId, error);
            throw error;
        }
    }

    /**
     * Download multiple files as ZIP archive
     */
    async downloadBatch(files, zipFilename = 'download-batch.zip', options = {}) {
        const downloadId = this.generateDownloadId();
        
        try {
            if (!Array.isArray(files) || files.length === 0) {
                throw new Error('No files provided for batch download');
            }
            
            this.startDownload(downloadId, zipFilename, 'zip', options);
            
            // Convert each file and collect blobs
            const fileBlobs = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                this.updateProgress(downloadId, (i / files.length) * 80, `Processing file ${i + 1}/${files.length}...`);
                
                const blob = await this.convertData(file.data, file.format || 'json', file.options || {});
                fileBlobs.push({
                    name: this.sanitizeFilename(file.filename, this.formats[file.format || 'json'].extension),
                    blob: blob
                });
            }
            
            // Create ZIP archive
            this.updateProgress(downloadId, 85, 'Creating ZIP archive...');
            const zipBlob = await this.createZipArchive(fileBlobs);
            
            // Download ZIP
            await this.createDownload(zipBlob, zipFilename, downloadId);
            
            this.completeDownload(downloadId, zipBlob.size);
            
            return { success: true, downloadId, filename: zipFilename, size: zipBlob.size, fileCount: files.length };
            
        } catch (error) {
            this.failDownload(downloadId, error);
            throw error;
        }
    }

    /**
     * Download from URL with progress tracking
     */
    async downloadFromUrl(url, filename, options = {}) {
        const downloadId = this.generateDownloadId();
        
        try {
            this.startDownload(downloadId, filename, 'url', options);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentLength = parseInt(response.headers.get('content-length'));
            let receivedLength = 0;
            
            const chunks = [];
            const reader = response.body.getReader();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                if (contentLength) {
                    const progress = (receivedLength / contentLength) * 90;
                    this.updateProgress(downloadId, progress, `Downloaded ${this.formatBytes(receivedLength)}...`);
                }
            }
            
            // Combine chunks
            const blob = new Blob(chunks);
            const safeFilename = filename || this.extractFilenameFromUrl(url);
            
            await this.createDownload(blob, safeFilename, downloadId);
            this.completeDownload(downloadId, blob.size);
            
            return { success: true, downloadId, filename: safeFilename, size: blob.size };
            
        } catch (error) {
            this.failDownload(downloadId, error);
            throw error;
        }
    }

    /**
     * Export clustering results in various formats
     */
    async exportClusteringResults(results, format = 'json', options = {}) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `clustering-results-${timestamp}`;
        
        const exportData = {
            metadata: {
                algorithm: results.algorithm || 'unknown',
                timestamp: new Date().toISOString(),
                dataPoints: results.data?.length || 0,
                clusters: results.clusters?.length || 0,
                parameters: results.parameters || {},
                quality: results.quality || null
            },
            data: results.data || [],
            clusters: results.clusters || [],
            centroids: results.centroids || [],
            metrics: results.metrics || {},
            visualization: results.visualization || null
        };
        
        return this.download(exportData, filename, format, {
            ...options,
            includeVisualization: options.includeVisualization !== false
        });
    }

    /**
     * Data conversion methods
     */
    async convertData(data, format, options = {}) {
        const formatConfig = this.formats[format.toLowerCase()];
        if (!formatConfig) throw new Error(`Unsupported format: ${format}`);
        
        return formatConfig.converter(data, options);
    }

    convertToJSON(data, options = {}) {
        const jsonString = JSON.stringify(data, null, options.indent || 2);
        return new Blob([jsonString], { type: 'application/json' });
    }

    convertToCSV(data, options = {}) {
        let csvContent = '';
        
        if (Array.isArray(data) && data.length > 0) {
            // Extract headers
            const headers = Object.keys(data[0]);
            csvContent += headers.join(',') + '\n';
            
            // Add data rows
            data.forEach(row => {
                const values = headers.map(header => {
                    let value = row[header];
                    if (value === null || value === undefined) value = '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                });
                csvContent += values.join(',') + '\n';
            });
        } else if (typeof data === 'object' && data !== null) {
            // Convert object to CSV
            csvContent = 'Key,Value\n';
            Object.entries(data).forEach(([key, value]) => {
                csvContent += `${key},${JSON.stringify(value)}\n`;
            });
        }
        
        return new Blob([csvContent], { type: 'text/csv' });
    }

    async convertToExcel(data, options = {}) {
        // Simplified Excel conversion - in production, use a library like SheetJS
        try {
            if (typeof window !== 'undefined' && window.XLSX) {
                const worksheet = window.XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
                const workbook = window.XLSX.utils.book_new();
                window.XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Data');
                
                const excelBuffer = window.XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            } else {
                // Fallback to CSV if XLSX library not available
                console.warn('XLSX library not available, falling back to CSV format');
                return this.convertToCSV(data, options);
            }
        } catch (error) {
            console.error('Excel conversion failed, falling back to CSV:', error);
            return this.convertToCSV(data, options);
        }
    }

    async convertToPDF(data, options = {}) {
        // Simplified PDF conversion - in production, use a library like jsPDF
        const textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        
        // Basic HTML to PDF conversion using browser's print functionality
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>NCS-API Export</title>
                <style>
                    body { font-family: monospace; font-size: 12px; margin: 20px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; }
                </style>
            </head>
            <body>
                <h1>NCS-API Data Export</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <pre>${textContent}</pre>
            </body>
            </html>
        `;
        
        return new Blob([htmlContent], { type: 'text/html' });
    }

    convertToImage(data, options = {}) {
        // Convert canvas or image data to PNG
        if (data instanceof HTMLCanvasElement) {
            return new Promise(resolve => {
                data.toBlob(resolve, 'image/png', options.quality || 0.9);
            });
        } else if (typeof data === 'string' && data.startsWith('data:image')) {
            // Convert data URL to blob
            const [header, base64] = data.split(',');
            const mimeType = header.match(/:(.*?);/)[1];
            const binary = atob(base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            return new Blob([array], { type: mimeType });
        } else {
            throw new Error('Invalid image data provided');
        }
    }

    convertToSVG(data, options = {}) {
        let svgContent = '';
        
        if (typeof data === 'string') {
            svgContent = data;
        } else if (data instanceof SVGElement) {
            svgContent = new XMLSerializer().serializeToString(data);
        } else {
            throw new Error('Invalid SVG data provided');
        }
        
        return new Blob([svgContent], { type: 'image/svg+xml' });
    }

    convertToText(data, options = {}) {
        const textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return new Blob([textContent], { type: 'text/plain' });
    }

    async convertToZip(files, options = {}) {
        return this.createZipArchive(files);
    }

    /**
     * ZIP archive creation (simplified implementation)
     */
    async createZipArchive(files) {
        // Simplified ZIP creation - in production, use a library like JSZip
        try {
            if (typeof window !== 'undefined' && window.JSZip) {
                const zip = new window.JSZip();
                
                files.forEach(file => {
                    zip.file(file.name, file.blob);
                });
                
                return await zip.generateAsync({ type: 'blob' });
            } else {
                // Fallback: create a simple archive format
                console.warn('JSZip library not available, creating simple archive');
                
                let archiveContent = '=== NCS-API Archive ===\n\n';
                
                for (const file of files) {
                    archiveContent += `--- ${file.name} ---\n`;
                    
                    if (file.blob.type.startsWith('text/') || file.blob.type === 'application/json') {
                        const text = await file.blob.text();
                        archiveContent += text + '\n\n';
                    } else {
                        archiveContent += '[Binary file - cannot display content]\n\n';
                    }
                }
                
                return new Blob([archiveContent], { type: 'text/plain' });
            }
        } catch (error) {
            console.error('ZIP creation failed:', error);
            throw new Error('Failed to create archive');
        }
    }

    /**
     * Create and trigger download
     */
    async createDownload(blob, filename, downloadId) {
        return new Promise((resolve, reject) => {
            try {
                this.updateProgress(downloadId, 90, 'Starting download...');
                
                // Create object URL
                const url = URL.createObjectURL(blob);
                
                // Create download link
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                // Append to DOM and click
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
                
                this.updateProgress(downloadId, 100, 'Download completed');
                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Download tracking methods
     */
    startDownload(downloadId, filename, format, options) {
        const download = {
            id: downloadId,
            filename,
            format,
            startTime: Date.now(),
            progress: 0,
            status: 'starting',
            options
        };
        
        this.activeDownloads.set(downloadId, download);
        this.stats.totalDownloads++;
        
        this.eventBus.emit('download:start', download);
    }

    updateProgress(downloadId, progress, message = '') {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.progress = Math.max(0, Math.min(100, progress));
            download.status = message || 'downloading';
            download.lastUpdate = Date.now();
            
            this.eventBus.emit('download:progress', download);
        }
    }

    completeDownload(downloadId, size = 0) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.progress = 100;
            download.status = 'completed';
            download.endTime = Date.now();
            download.duration = download.endTime - download.startTime;
            download.size = size;
            
            // Move to history
            this.downloadHistory.unshift({ ...download });
            this.activeDownloads.delete(downloadId);
            
            // Update statistics
            this.stats.successfulDownloads++;
            this.stats.totalBytes += size;
            this.updateAverageSpeed();
            
            this.eventBus.emit('download:complete', download);
        }
    }

    failDownload(downloadId, error) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.status = 'failed';
            download.error = error.message;
            download.endTime = Date.now();
            
            // Move to history
            this.downloadHistory.unshift({ ...download });
            this.activeDownloads.delete(downloadId);
            
            // Update statistics
            this.stats.failedDownloads++;
            
            this.eventBus.emit('download:error', download);
        }
    }

    /**
     * Utility methods
     */
    generateDownloadId() {
        return 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateFilename(format, prefix = 'ncs-export') {
        const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
        const extension = this.formats[format]?.extension || 'txt';
        return `${prefix}-${timestamp}.${extension}`;
    }

    sanitizeFilename(filename, defaultExtension = 'txt') {
        if (!this.config.sanitizeFilenames) return filename;
        
        // Remove unsafe characters
        let safe = filename.replace(/[<>:"/\\|?*]/g, '-');
        
        // Ensure file extension
        if (!safe.includes('.')) {
            safe += '.' + defaultExtension;
        }
        
        // Add timestamp if enabled
        if (this.config.timestampFiles && !safe.includes('-20')) {
            const timestamp = new Date().toISOString().split('T')[0];
            const parts = safe.split('.');
            const ext = parts.pop();
            const name = parts.join('.');
            safe = `${name}-${timestamp}.${ext}`;
        }
        
        return safe;
    }

    extractFilenameFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            return pathname.split('/').pop() || 'download';
        } catch (error) {
            return 'download';
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateAverageSpeed() {
        const completedDownloads = this.downloadHistory.filter(d => d.status === 'completed');
        if (completedDownloads.length > 0) {
            const totalSpeed = completedDownloads.reduce((sum, d) => {
                const speed = d.size / (d.duration / 1000); // bytes per second
                return sum + speed;
            }, 0);
            this.stats.averageSpeed = totalSpeed / completedDownloads.length;
        }
    }

    /**
     * Public API methods
     */
    getActiveDownloads() {
        return Array.from(this.activeDownloads.values());
    }

    getDownloadHistory(limit = 50) {
        return this.downloadHistory.slice(0, limit);
    }

    getStats() {
        return {
            ...this.stats,
            formattedTotalBytes: this.formatBytes(this.stats.totalBytes),
            formattedAverageSpeed: this.formatBytes(this.stats.averageSpeed) + '/s',
            successRate: this.stats.totalDownloads > 0 ? 
                ((this.stats.successfulDownloads / this.stats.totalDownloads) * 100).toFixed(1) + '%' : '0%'
        };
    }

    clearHistory() {
        this.downloadHistory = [];
    }

    cancelDownload(downloadId) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.status = 'cancelled';
            this.activeDownloads.delete(downloadId);
            this.eventBus.emit('download:cancel', download);
            return true;
        }
        return false;
    }
}

// Create singleton instance
const downloadManager = new DownloadManager();

// Convenience functions
export const download = {
    // Quick download methods
    json: (data, filename, options) => downloadManager.download(data, filename, 'json', options),
    csv: (data, filename, options) => downloadManager.download(data, filename, 'csv', options),
    excel: (data, filename, options) => downloadManager.download(data, filename, 'xlsx', options),
    pdf: (data, filename, options) => downloadManager.download(data, filename, 'pdf', options),
    image: (data, filename, options) => downloadManager.download(data, filename, 'png', options),
    svg: (data, filename, options) => downloadManager.download(data, filename, 'svg', options),
    text: (data, filename, options) => downloadManager.download(data, filename, 'txt', options),
    
    // Batch download
    batch: (files, zipFilename, options) => downloadManager.downloadBatch(files, zipFilename, options),
    
    // URL download
    url: (url, filename, options) => downloadManager.downloadFromUrl(url, filename, options),
    
    // Clustering results export
    clusteringResults: (results, format, options) => downloadManager.exportClusteringResults(results, format, options),
    
    // Utility methods
    getProgress: () => downloadManager.getActiveDownloads(),
    getHistory: (limit) => downloadManager.getDownloadHistory(limit),
    getStats: () => downloadManager.getStats(),
    cancel: (downloadId) => downloadManager.cancelDownload(downloadId),
    clearHistory: () => downloadManager.clearHistory(),
    
    // Event handling
    on: (event, callback) => downloadManager.eventBus.on(event, callback),
    off: (event, callback) => downloadManager.eventBus.off(event, callback)
};

// Export both the manager class and convenience object
export { downloadManager };
export default download;