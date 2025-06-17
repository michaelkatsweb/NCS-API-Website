/**
 * CanvasRenderer - High-performance 2D Canvas Rendering Engine
 * Optimized for data visualization and real-time animations
 */

export class CanvasRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {
            alpha: options.alpha !== false,
            antialias: options.antialias !== false,
            desynchronized: options.optimized || false,
            willReadFrequently: false
        });
        
        this.options = {
            antialias: true,
            alpha: true,
            optimized: false,
            pixelRatio: window.devicePixelRatio || 1,
            ...options
        };
        
        // Performance tracking
        this.stats = {
            drawCalls: 0,
            primitives: 0,
            lastFrame: 0
        };
        
        // State management
        this.state = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            globalAlpha: 1,
            font: '12px Arial',
            textAlign: 'left',
            textBaseline: 'top',
            shadowColor: 'rgba(0,0,0,0)',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        };
        
        // Optimization flags
        this.isDirty = false;
        this.batchMode = false;
        this.batchOperations = [];
        
        this.init();
    }

    /**
     * Initialize the renderer
     */
    init() {
        this.setupCanvas();
        this.setupOptimizations();
        
        if (this.options.optimized) {
            this.enableOptimizations();
        }
        
        console.log('🎨 CanvasRenderer initialized', {
            dimensions: `${this.canvas.width}x${this.canvas.height}`,
            pixelRatio: this.options.pixelRatio,
            optimized: this.options.optimized
        });
    }

    /**
     * Setup canvas with proper scaling
     */
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = this.options.pixelRatio;
        
        // Set actual size in memory (scaled by device pixel ratio)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale the context to ensure correct drawing operations
        this.ctx.scale(dpr, dpr);
        
        // Set display size (CSS pixels)
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Store logical dimensions
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Setup performance optimizations
     */
    setupOptimizations() {
        // Disable anti-aliasing for better performance if requested
        if (!this.options.antialias) {
            this.ctx.imageSmoothingEnabled = false;
        }
        
        // Set text rendering optimization
        this.ctx.textRenderingOptimization = 'speed';
        
        // Enable GPU acceleration hints
        this.canvas.style.transform = 'translateZ(0)';
        this.canvas.style.willChange = 'transform';
    }

    /**
     * Enable advanced optimizations
     */
    enableOptimizations() {
        // Batch drawing operations
        this.batchMode = true;
        
        // Use path optimization
        this.usePathOptimization = true;
        
        // Enable dirty region tracking
        this.enableDirtyRegions = true;
    }

    /**
     * Clear the entire canvas
     */
    clear(x = 0, y = 0, width = this.width, height = this.height) {
        this.ctx.clearRect(x, y, width, height);
        this.stats.drawCalls++;
        this.isDirty = true;
        return this;
    }

    /**
     * Fill the canvas with a solid color
     */
    fill(color = '#000000') {
        this.setFillStyle(color);
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Save the current rendering state
     */
    save() {
        this.ctx.save();
        return this;
    }

    /**
     * Restore the previous rendering state
     */
    restore() {
        this.ctx.restore();
        return this;
    }

    /**
     * Set fill style
     */
    setFillStyle(style) {
        if (this.state.fillStyle !== style) {
            this.state.fillStyle = style;
            this.ctx.fillStyle = style;
        }
        return this;
    }

    /**
     * Set stroke style
     */
    setStrokeStyle(style) {
        if (this.state.strokeStyle !== style) {
            this.state.strokeStyle = style;
            this.ctx.strokeStyle = style;
        }
        return this;
    }

    /**
     * Set line width
     */
    setLineWidth(width) {
        if (this.state.lineWidth !== width) {
            this.state.lineWidth = width;
            this.ctx.lineWidth = width;
        }
        return this;
    }

    /**
     * Set global alpha
     */
    setGlobalAlpha(alpha) {
        if (this.state.globalAlpha !== alpha) {
            this.state.globalAlpha = alpha;
            this.ctx.globalAlpha = alpha;
        }
        return this;
    }

    /**
     * Set font
     */
    setFont(font) {
        if (this.state.font !== font) {
            this.state.font = font;
            this.ctx.font = font;
        }
        return this;
    }

    /**
     * Set text alignment
     */
    setTextAlign(align) {
        if (this.state.textAlign !== align) {
            this.state.textAlign = align;
            this.ctx.textAlign = align;
        }
        return this;
    }

    /**
     * Set text baseline
     */
    setTextBaseline(baseline) {
        if (this.state.textBaseline !== baseline) {
            this.state.textBaseline = baseline;
            this.ctx.textBaseline = baseline;
        }
        return this;
    }

    /**
     * Set shadow properties
     */
    setShadow(color, blur = 0, offsetX = 0, offsetY = 0) {
        this.state.shadowColor = color;
        this.state.shadowBlur = blur;
        this.state.shadowOffsetX = offsetX;
        this.state.shadowOffsetY = offsetY;
        
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
        this.ctx.shadowOffsetX = offsetX;
        this.ctx.shadowOffsetY = offsetY;
        return this;
    }

    /**
     * Draw a filled rectangle
     */
    drawRect(x, y, width, height) {
        this.ctx.fillRect(x, y, width, height);
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a stroked rectangle
     */
    strokeRect(x, y, width, height) {
        this.ctx.strokeRect(x, y, width, height);
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a filled circle
     */
    drawCircle(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a stroked circle
     */
    strokeCircle(x, y, radius) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a line
     */
    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw multiple connected lines
     */
    drawPolyline(points) {
        if (points.length < 2) return this;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a filled polygon
     */
    drawPolygon(points) {
        if (points.length < 3) return this;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw text
     */
    drawText(text, x, y, maxWidth) {
        if (maxWidth !== undefined) {
            this.ctx.fillText(text, x, y, maxWidth);
        } else {
            this.ctx.fillText(text, x, y);
        }
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Stroke text
     */
    strokeText(text, x, y, maxWidth) {
        if (maxWidth !== undefined) {
            this.ctx.strokeText(text, x, y, maxWidth);
        } else {
            this.ctx.strokeText(text, x, y);
        }
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Measure text dimensions
     */
    measureText(text) {
        return this.ctx.measureText(text);
    }

    /**
     * Draw an arc
     */
    drawArc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a filled arc
     */
    fillArc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
        this.ctx.fill();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw an ellipse
     */
    drawEllipse(x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = Math.PI * 2) {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a filled ellipse
     */
    fillEllipse(x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = Math.PI * 2) {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle);
        this.ctx.fill();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a bezier curve
     */
    drawBezierCurve(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Draw a quadratic curve
     */
    drawQuadraticCurve(cpx, cpy, x, y) {
        this.ctx.quadraticCurveTo(cpx, cpy, x, y);
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Apply a transformation matrix
     */
    transform(a, b, c, d, e, f) {
        this.ctx.transform(a, b, c, d, e, f);
        return this;
    }

    /**
     * Set transformation matrix
     */
    setTransform(a, b, c, d, e, f) {
        this.ctx.setTransform(a, b, c, d, e, f);
        return this;
    }

    /**
     * Translate the coordinate system
     */
    translate(x, y) {
        this.ctx.translate(x, y);
        return this;
    }

    /**
     * Rotate the coordinate system
     */
    rotate(angle) {
        this.ctx.rotate(angle);
        return this;
    }

    /**
     * Scale the coordinate system
     */
    scale(x, y) {
        this.ctx.scale(x, y);
        return this;
    }

    /**
     * Create a linear gradient
     */
    createLinearGradient(x0, y0, x1, y1) {
        return this.ctx.createLinearGradient(x0, y0, x1, y1);
    }

    /**
     * Create a radial gradient
     */
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
        return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    }

    /**
     * Create a pattern
     */
    createPattern(image, repetition) {
        return this.ctx.createPattern(image, repetition);
    }

    /**
     * Set clipping region
     */
    clip() {
        this.ctx.clip();
        return this;
    }

    /**
     * Begin a new path
     */
    beginPath() {
        this.ctx.beginPath();
        return this;
    }

    /**
     * Close the current path
     */
    closePath() {
        this.ctx.closePath();
        return this;
    }

    /**
     * Move to a point
     */
    moveTo(x, y) {
        this.ctx.moveTo(x, y);
        return this;
    }

    /**
     * Draw a line to a point
     */
    lineTo(x, y) {
        this.ctx.lineTo(x, y);
        return this;
    }

    /**
     * Fill the current path
     */
    fill() {
        this.ctx.fill();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Stroke the current path
     */
    stroke() {
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives++;
        return this;
    }

    /**
     * Batch multiple drawing operations for better performance
     */
    batch(operations) {
        this.batchMode = true;
        operations.forEach(op => this.batchOperations.push(op));
        return this;
    }

    /**
     * Execute batched operations
     */
    executeBatch() {
        if (!this.batchMode || this.batchOperations.length === 0) return this;
        
        this.batchOperations.forEach(operation => {
            operation.call(this);
        });
        
        this.batchOperations = [];
        this.batchMode = false;
        return this;
    }

    /**
     * Draw optimized points (batch circles)
     */
    drawPoints(points, radius = 2, fillStyle = '#000000') {
        this.setFillStyle(fillStyle);
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.stats.drawCalls++;
        this.stats.primitives += points.length;
        return this;
    }

    /**
     * Draw optimized lines (batch lines)
     */
    drawLines(lines, strokeStyle = '#000000', lineWidth = 1) {
        this.setStrokeStyle(strokeStyle);
        this.setLineWidth(lineWidth);
        
        this.ctx.beginPath();
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            this.ctx.moveTo(line.x1, line.y1);
            this.ctx.lineTo(line.x2, line.y2);
        }
        
        this.ctx.stroke();
        this.stats.drawCalls++;
        this.stats.primitives += lines.length;
        return this;
    }

    /**
     * Get image data
     */
    getImageData(x = 0, y = 0, width = this.width, height = this.height) {
        return this.ctx.getImageData(x, y, width, height);
    }

    /**
     * Put image data
     */
    putImageData(imageData, x, y) {
        this.ctx.putImageData(imageData, x, y);
        this.stats.drawCalls++;
        return this;
    }

    /**
     * Convert canvas to data URL
     */
    toDataURL(type = 'image/png', quality = 0.92) {
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * Convert canvas to blob
     */
    toBlob(callback, type = 'image/png', quality = 0.92) {
        return this.canvas.toBlob(callback, type, quality);
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            fps: Math.round(1000 / (performance.now() - this.stats.lastFrame))
        };
    }

    /**
     * Reset performance statistics
     */
    resetStats() {
        this.stats = {
            drawCalls: 0,
            primitives: 0,
            lastFrame: performance.now()
        };
        return this;
    }

    /**
     * Update frame timing
     */
    updateFrame() {
        this.stats.lastFrame = performance.now();
        return this;
    }

    /**
     * Check if point is inside canvas
     */
    isPointInBounds(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }

    /**
     * Get canvas bounds
     */
    getBounds() {
        return {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Resize the canvas
     */
    resize(width, height) {
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        const dpr = this.options.pixelRatio;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.width = width;
        this.height = height;
        
        console.log(`📐 Canvas resized to ${width}x${height}`);
        return this;
    }

    /**
     * Destroy the renderer and cleanup resources
     */
    destroy() {
        // Clear canvas
        this.clear();
        
        // Reset stats
        this.resetStats();
        
        // Clear batch operations
        this.batchOperations = [];
        
        // Remove GPU acceleration hints
        this.canvas.style.transform = '';
        this.canvas.style.willChange = '';
        
        console.log('🗑️ CanvasRenderer destroyed');
    }
}