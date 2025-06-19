// File: export.worker.js
// Path: js/workers/export.worker.js
// Export operations web worker for NCS-API-Website
// Handles data export, report generation, and file creation in background

/**
 * CSV export utilities
 */
const CSVExporter = {
    /**
     * Convert data to CSV format
     */
    dataToCSV(data, options = {}) {
        const delimiter = options.delimiter || ',';
        const includeHeaders = options.includeHeaders !== false;
        const quote = options.quote || '"';
        const escape = options.escape || '""';
        
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        const firstRow = data[0];
        const headers = typeof firstRow === 'object' ? Object.keys(firstRow) : [];
        const rows = [];
        
        // Add headers if requested
        if (includeHeaders && headers.length > 0) {
            rows.push(headers.map(header => this.escapeCSVField(header, delimiter, quote, escape)));
        }
        
        // Add data rows
        data.forEach(row => {
            if (typeof row === 'object') {
                const csvRow = headers.map(header => {
                    const value = row[header];
                    return this.escapeCSVField(this.formatValue(value), delimiter, quote, escape);
                });
                rows.push(csvRow);
            } else if (Array.isArray(row)) {
                const csvRow = row.map(value => 
                    this.escapeCSVField(this.formatValue(value), delimiter, quote, escape)
                );
                rows.push(csvRow);
            } else {
                rows.push([this.escapeCSVField(this.formatValue(row), delimiter, quote, escape)]);
            }
        });
        
        return rows.map(row => row.join(delimiter)).join('\n');
    },
    
    /**
     * Convert clustering results to CSV
     */
    clusteringResultsToCSV(data, clusters, options = {}) {
        const includeClusterInfo = options.includeClusterInfo !== false;
        const includeOriginalData = options.includeOriginalData !== false;
        
        // Create cluster mapping
        const clusterMap = new Map();
        clusters.forEach((cluster, clusterIndex) => {
            cluster.pointIndices.forEach(pointIndex => {
                clusterMap.set(pointIndex, clusterIndex);
            });
        });
        
        // Prepare export data
        const exportData = data.map((point, index) => {
            const row = {};
            
            // Add original data if requested
            if (includeOriginalData) {
                if (typeof point === 'object') {
                    Object.assign(row, point);
                } else {
                    row.value = point;
                }
            }
            
            // Add index
            row.point_index = index;
            
            // Add cluster assignment
            const clusterIndex = clusterMap.get(index);
            row.cluster_id = clusterIndex !== undefined ? clusterIndex : -1; // -1 for noise/unassigned
            
            // Add cluster info if requested
            if (includeClusterInfo && clusterIndex !== undefined) {
                const cluster = clusters[clusterIndex];
                if (cluster.centroid) {
                    row.cluster_centroid_x = cluster.centroid.x;
                    row.cluster_centroid_y = cluster.centroid.y;
                }
                row.cluster_size = cluster.pointIndices.length;
            }
            
            return row;
        });
        
        return this.dataToCSV(exportData, options);
    },
    
    /**
     * Escape CSV field
     */
    escapeCSVField(field, delimiter, quote, escape) {
        const fieldStr = String(field);
        
        // Check if field needs quoting
        const needsQuoting = fieldStr.includes(delimiter) || 
                           fieldStr.includes(quote) || 
                           fieldStr.includes('\n') || 
                           fieldStr.includes('\r');
        
        if (needsQuoting) {
            const escapedField = fieldStr.replace(new RegExp(quote, 'g'), escape);
            return quote + escapedField + quote;
        }
        
        return fieldStr;
    },
    
    /**
     * Format value for CSV
     */
    formatValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        if (value instanceof Date) return value.toISOString();
        return String(value);
    }
};

/**
 * JSON export utilities
 */
const JSONExporter = {
    /**
     * Convert data to JSON format
     */
    dataToJSON(data, options = {}) {
        const pretty = options.pretty !== false;
        const indent = options.indent || 2;
        
        const jsonData = {
            metadata: {
                exportDate: new Date().toISOString(),
                recordCount: Array.isArray(data) ? data.length : 1,
                format: 'json',
                version: '1.0'
            },
            data: data
        };
        
        return pretty ? 
            JSON.stringify(jsonData, null, indent) : 
            JSON.stringify(jsonData);
    },
    
    /**
     * Convert clustering results to JSON
     */
    clusteringResultsToJSON(data, clusters, algorithm, qualityMetrics, options = {}) {
        const pretty = options.pretty !== false;
        const indent = options.indent || 2;
        
        const result = {
            metadata: {
                exportDate: new Date().toISOString(),
                algorithm: algorithm,
                dataPoints: data.length,
                clustersFound: clusters.length,
                format: 'clustering_results',
                version: '1.0'
            },
            algorithm: {
                name: algorithm,
                parameters: options.algorithmParams || {},
                executionTime: options.executionTime || null
            },
            quality: qualityMetrics || null,
            clusters: clusters.map((cluster, index) => ({
                id: index,
                size: cluster.pointIndices.length,
                centroid: cluster.centroid || null,
                points: cluster.pointIndices.map(pointIndex => ({
                    index: pointIndex,
                    data: data[pointIndex]
                }))
            })),
            summary: {
                totalPoints: data.length,
                clusteredPoints: clusters.reduce((sum, cluster) => sum + cluster.pointIndices.length, 0),
                noisyPoints: data.length - clusters.reduce((sum, cluster) => sum + cluster.pointIndices.length, 0),
                averageClusterSize: clusters.length > 0 ? 
                    clusters.reduce((sum, cluster) => sum + cluster.pointIndices.length, 0) / clusters.length : 0
            }
        };
        
        return pretty ? 
            JSON.stringify(result, null, indent) : 
            JSON.stringify(result);
    }
};

/**
 * Image export utilities
 */
const ImageExporter = {
    /**
     * Create SVG from visualization data
     */
    createSVG(data, clusters, options = {}) {
        const width = options.width || 800;
        const height = options.height || 600;
        const margin = options.margin || 50;
        const pointRadius = options.pointRadius || 3;
        const colors = options.colors || [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];
        
        // Calculate bounds
        const bounds = this.calculateBounds(data, margin);
        const scaleX = (width - 2 * margin) / (bounds.maxX - bounds.minX);
        const scaleY = (height - 2 * margin) / (bounds.maxY - bounds.minY);
        
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .point { stroke: rgba(0,0,0,0.3); stroke-width: 0.5; }
      .centroid { stroke: #000; stroke-width: 2; fill: none; }
      .title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; }
      .legend { font-family: Arial, sans-serif; font-size: 12px; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="white"/>
  
  <!-- Title -->
  <text x="${width/2}" y="30" text-anchor="middle" class="title">Clustering Results</text>
  
  <!-- Data points -->`;
        
        // Draw clusters
        clusters.forEach((cluster, clusterIndex) => {
            const color = colors[clusterIndex % colors.length];
            
            // Draw points
            cluster.pointIndices.forEach(pointIndex => {
                const point = data[pointIndex];
                const x = margin + (((point.x || point[0]) - bounds.minX) * scaleX);
                const y = margin + (((point.y || point[1]) - bounds.minY) * scaleY);
                
                svg += `\n  <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${pointRadius}" fill="${color}" class="point"/>`;
            });
            
            // Draw centroid if available
            if (cluster.centroid) {
                const cx = margin + ((cluster.centroid.x - bounds.minX) * scaleX);
                const cy = margin + ((cluster.centroid.y - bounds.minY) * scaleY);
                
                svg += `\n  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${pointRadius * 2}" fill="${color}" class="centroid"/>`;
                svg += `\n  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${pointRadius * 3}" class="centroid"/>`;
            }
        });
        
        // Add legend
        svg += `\n  
  <!-- Legend -->
  <g transform="translate(${width - 150}, 60)">`;
        
        clusters.forEach((cluster, index) => {
            const color = colors[index % colors.length];
            const y = index * 20;
            
            svg += `\n    <circle cx="10" cy="${y + 5}" r="5" fill="${color}"/>`;
            svg += `\n    <text x="20" y="${y + 9}" class="legend">Cluster ${index} (${cluster.pointIndices.length} points)</text>`;
        });
        
        svg += `\n  </g>
</svg>`;
        
        return svg;
    },
    
    /**
     * Calculate data bounds
     */
    calculateBounds(data, margin = 0) {
        if (data.length === 0) {
            return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        data.forEach(point => {
            const x = point.x || point[0] || 0;
            const y = point.y || point[1] || 0;
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        // Add padding
        const paddingX = (maxX - minX) * 0.05;
        const paddingY = (maxY - minY) * 0.05;
        
        return {
            minX: minX - paddingX,
            maxX: maxX + paddingX,
            minY: minY - paddingY,
            maxY: maxY + paddingY
        };
    }
};

/**
 * Report generator
 */
const ReportGenerator = {
    /**
     * Generate HTML report
     */
    generateHTMLReport(data, clusters, algorithm, qualityMetrics, options = {}) {
        const title = options.title || 'Clustering Analysis Report';
        const includeCharts = options.includeCharts !== false;
        const includeStatistics = options.includeStatistics !== false;
        
        const timestamp = new Date().toLocaleString();
        const totalPoints = data.length;
        const clusteredPoints = clusters.reduce((sum, cluster) => sum + cluster.pointIndices.length, 0);
        const noisyPoints = totalPoints - clusteredPoints;
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1e293b; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #334155; margin-top: 30px; }
        .meta { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .stat-label { color: #64748b; font-size: 14px; }
        .cluster-info { background: #fafafa; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .quality-metrics { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .chart-container { margin: 30px 0; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        
        <div class="meta">
            <strong>Generated:</strong> ${timestamp}<br>
            <strong>Algorithm:</strong> ${algorithm}<br>
            <strong>Data Points:</strong> ${totalPoints.toLocaleString()}
        </div>`;

        if (includeStatistics) {
            html += `
        <h2>Summary Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${clusters.length}</div>
                <div class="stat-label">Clusters Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${clusteredPoints.toLocaleString()}</div>
                <div class="stat-label">Clustered Points</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${noisyPoints.toLocaleString()}</div>
                <div class="stat-label">Noise Points</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${clusters.length > 0 ? Math.round(clusteredPoints / clusters.length) : 0}</div>
                <div class="stat-label">Avg Cluster Size</div>
            </div>
        </div>`;
        }

        if (qualityMetrics && qualityMetrics.summary) {
            html += `
        <h2>Quality Assessment</h2>
        <div class="quality-metrics">
            <strong>Overall Score:</strong> ${(qualityMetrics.summary.overallScore * 100).toFixed(1)}%<br>
            <strong>Recommendation:</strong> ${qualityMetrics.summary.recommendation}<br>
            <strong>Internal Quality:</strong> ${(qualityMetrics.summary.internalScore * 100).toFixed(1)}%
        </div>`;
        }

        html += `
        <h2>Cluster Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Cluster ID</th>
                    <th>Size</th>
                    <th>Percentage</th>
                    <th>Centroid X</th>
                    <th>Centroid Y</th>
                </tr>
            </thead>
            <tbody>`;

        clusters.forEach((cluster, index) => {
            const percentage = ((cluster.pointIndices.length / totalPoints) * 100).toFixed(1);
            const centroidX = cluster.centroid ? cluster.centroid.x.toFixed(3) : 'N/A';
            const centroidY = cluster.centroid ? cluster.centroid.y.toFixed(3) : 'N/A';
            
            html += `
                <tr>
                    <td>Cluster ${index}</td>
                    <td>${cluster.pointIndices.length.toLocaleString()}</td>
                    <td>${percentage}%</td>
                    <td>${centroidX}</td>
                    <td>${centroidY}</td>
                </tr>`;
        });

        html += `
            </tbody>
        </table>`;

        if (includeCharts) {
            const svg = ImageExporter.createSVG(data, clusters, { width: 800, height: 600 });
            html += `
        <h2>Visualization</h2>
        <div class="chart-container">
            ${svg}
        </div>`;
        }

        html += `
        <div class="footer">
            Report generated by NCS-API Website | ${timestamp}
        </div>
    </div>
</body>
</html>`;

        return html;
    },
    
    /**
     * Generate markdown report
     */
    generateMarkdownReport(data, clusters, algorithm, qualityMetrics, options = {}) {
        const title = options.title || 'Clustering Analysis Report';
        const timestamp = new Date().toLocaleString();
        const totalPoints = data.length;
        const clusteredPoints = clusters.reduce((sum, cluster) => sum + cluster.pointIndices.length, 0);
        const noisyPoints = totalPoints - clusteredPoints;
        
        let markdown = `# ${title}

**Generated:** ${timestamp}  
**Algorithm:** ${algorithm}  
**Data Points:** ${totalPoints.toLocaleString()}

## Summary Statistics

- **Clusters Found:** ${clusters.length}
- **Clustered Points:** ${clusteredPoints.toLocaleString()}
- **Noise Points:** ${noisyPoints.toLocaleString()}
- **Average Cluster Size:** ${clusters.length > 0 ? Math.round(clusteredPoints / clusters.length) : 0}
`;

        if (qualityMetrics && qualityMetrics.summary) {
            markdown += `
## Quality Assessment

- **Overall Score:** ${(qualityMetrics.summary.overallScore * 100).toFixed(1)}%
- **Recommendation:** ${qualityMetrics.summary.recommendation}
- **Internal Quality:** ${(qualityMetrics.summary.internalScore * 100).toFixed(1)}%
`;
        }

        markdown += `
## Cluster Details

| Cluster ID | Size | Percentage | Centroid X | Centroid Y |
|------------|------|------------|------------|------------|
`;

        clusters.forEach((cluster, index) => {
            const percentage = ((cluster.pointIndices.length / totalPoints) * 100).toFixed(1);
            const centroidX = cluster.centroid ? cluster.centroid.x.toFixed(3) : 'N/A';
            const centroidY = cluster.centroid ? cluster.centroid.y.toFixed(3) : 'N/A';
            
            markdown += `| Cluster ${index} | ${cluster.pointIndices.length.toLocaleString()} | ${percentage}% | ${centroidX} | ${centroidY} |\n`;
        });

        markdown += `
---
*Report generated by NCS-API Website*`;

        return markdown;
    }
};

/**
 * File creation utilities
 */
const FileCreator = {
    /**
     * Create downloadable blob
     */
    createBlob(content, mimeType) {
        return new Blob([content], { type: mimeType });
    },
    
    /**
     * Create data URL
     */
    createDataURL(content, mimeType) {
        const blob = this.createBlob(content, mimeType);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

/**
 * Worker message handler
 */
self.onmessage = async function(e) {
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
            case 'export_csv':
                const csvContent = CSVExporter.dataToCSV(data, options);
                result = {
                    content: csvContent,
                    mimeType: 'text/csv',
                    filename: options.filename || 'export.csv',
                    size: csvContent.length
                };
                break;
                
            case 'export_clustering_csv':
                const clusteringCSV = CSVExporter.clusteringResultsToCSV(data, options.clusters, options);
                result = {
                    content: clusteringCSV,
                    mimeType: 'text/csv',
                    filename: options.filename || 'clustering_results.csv',
                    size: clusteringCSV.length
                };
                break;
                
            case 'export_json':
                const jsonContent = JSONExporter.dataToJSON(data, options);
                result = {
                    content: jsonContent,
                    mimeType: 'application/json',
                    filename: options.filename || 'export.json',
                    size: jsonContent.length
                };
                break;
                
            case 'export_clustering_json':
                const clusteringJSON = JSONExporter.clusteringResultsToJSON(
                    data, 
                    options.clusters, 
                    options.algorithm, 
                    options.qualityMetrics, 
                    options
                );
                result = {
                    content: clusteringJSON,
                    mimeType: 'application/json',
                    filename: options.filename || 'clustering_results.json',
                    size: clusteringJSON.length
                };
                break;
                
            case 'export_svg':
                const svgContent = ImageExporter.createSVG(data, options.clusters, options);
                result = {
                    content: svgContent,
                    mimeType: 'image/svg+xml',
                    filename: options.filename || 'clustering_visualization.svg',
                    size: svgContent.length
                };
                break;
                
            case 'generate_html_report':
                const htmlReport = ReportGenerator.generateHTMLReport(
                    data,
                    options.clusters,
                    options.algorithm,
                    options.qualityMetrics,
                    options
                );
                result = {
                    content: htmlReport,
                    mimeType: 'text/html',
                    filename: options.filename || 'clustering_report.html',
                    size: htmlReport.length
                };
                break;
                
            case 'generate_markdown_report':
                const markdownReport = ReportGenerator.generateMarkdownReport(
                    data,
                    options.clusters,
                    options.algorithm,
                    options.qualityMetrics,
                    options
                );
                result = {
                    content: markdownReport,
                    mimeType: 'text/markdown',
                    filename: options.filename || 'clustering_report.md',
                    size: markdownReport.length
                };
                break;
                
            case 'create_data_url':
                const dataURL = await FileCreator.createDataURL(data, options.mimeType);
                result = {
                    dataURL,
                    mimeType: options.mimeType,
                    filename: options.filename,
                    size: data.length
                };
                break;
                
            case 'export_batch':
                // Export multiple formats at once
                const batchResults = {};
                
                for (const [format, formatOptions] of Object.entries(options.formats)) {
                    let content;
                    let mimeType;
                    let filename;
                    
                    switch (format) {
                        case 'csv':
                            content = CSVExporter.clusteringResultsToCSV(data, options.clusters, formatOptions);
                            mimeType = 'text/csv';
                            filename = formatOptions.filename || 'clustering_results.csv';
                            break;
                        case 'json':
                            content = JSONExporter.clusteringResultsToJSON(
                                data, options.clusters, options.algorithm, options.qualityMetrics, formatOptions
                            );
                            mimeType = 'application/json';
                            filename = formatOptions.filename || 'clustering_results.json';
                            break;
                        case 'svg':
                            content = ImageExporter.createSVG(data, options.clusters, formatOptions);
                            mimeType = 'image/svg+xml';
                            filename = formatOptions.filename || 'clustering_visualization.svg';
                            break;
                        case 'html':
                            content = ReportGenerator.generateHTMLReport(
                                data, options.clusters, options.algorithm, options.qualityMetrics, formatOptions
                            );
                            mimeType = 'text/html';
                            filename = formatOptions.filename || 'clustering_report.html';
                            break;
                    }
                    
                    if (content) {
                        batchResults[format] = {
                            content,
                            mimeType,
                            filename,
                            size: content.length
                        };
                    }
                }
                
                result = batchResults;
                break;
                
            default:
                throw new Error(`Unknown export operation: ${type}`);
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