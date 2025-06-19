// File: Interpolation.js
// Path: js/visualizations/animations/Interpolation.js
// Data interpolation utility for NCS-API-Website smooth data transitions
// Handles numeric, color, array, and complex object interpolation

/**
 * Core interpolation functions
 */
export const InterpolationCore = {
    /**
     * Linear interpolation between two numbers
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} t - Time factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    /**
     * Cubic interpolation between four points
     * @param {number} p0 - Point before start
     * @param {number} p1 - Start point
     * @param {number} p2 - End point
     * @param {number} p3 - Point after end
     * @param {number} t - Time factor (0-1)
     * @returns {number} Interpolated value
     */
    cubic(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return (
            p1 + 
            0.5 * t * (-p0 + p2) +
            0.5 * t2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) +
            0.5 * t3 * (-p0 + 3 * p1 - 3 * p2 + p3)
        );
    },
    
    /**
     * Hermite interpolation
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} tangent1 - Start tangent
     * @param {number} tangent2 - End tangent
     * @param {number} t - Time factor (0-1)
     * @returns {number} Interpolated value
     */
    hermite(start, end, tangent1, tangent2, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const h1 = 2 * t3 - 3 * t2 + 1;
        const h2 = -2 * t3 + 3 * t2;
        const h3 = t3 - 2 * t2 + t;
        const h4 = t3 - t2;
        
        return h1 * start + h2 * end + h3 * tangent1 + h4 * tangent2;
    },
    
    /**
     * Smooth step interpolation
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} t - Time factor (0-1)
     * @returns {number} Interpolated value
     */
    smoothstep(start, end, t) {
        t = Math.max(0, Math.min(1, t));
        t = t * t * (3 - 2 * t);
        return start + (end - start) * t;
    }
};

/**
 * Color interpolation utilities
 */
export class ColorInterpolator {
    /**
     * Parse color string to RGB values
     * @param {string} color - Color in hex, rgb, or rgba format
     * @returns {Object} RGB values and alpha
     */
    static parseColor(color) {
        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16),
                    a: 1
                };
            } else if (hex.length === 6) {
                return {
                    r: parseInt(hex.slice(0, 2), 16),
                    g: parseInt(hex.slice(2, 4), 16),
                    b: parseInt(hex.slice(4, 6), 16),
                    a: 1
                };
            }
        }
        
        // Handle rgb/rgba colors
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
            };
        }
        
        // Handle hsl colors
        const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]) / 360;
            const s = parseInt(hslMatch[2]) / 100;
            const l = parseInt(hslMatch[3]) / 100;
            const a = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;
            
            return { ...this.hslToRgb(h, s, l), a };
        }
        
        // Default to black
        return { r: 0, g: 0, b: 0, a: 1 };
    }
    
    /**
     * Convert HSL to RGB
     */
    static hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    /**
     * Interpolate between two colors in RGB space
     * @param {string} startColor - Start color
     * @param {string} endColor - End color
     * @param {number} t - Time factor (0-1)
     * @returns {string} Interpolated color
     */
    static interpolateRGB(startColor, endColor, t) {
        const start = this.parseColor(startColor);
        const end = this.parseColor(endColor);
        
        const r = Math.round(InterpolationCore.lerp(start.r, end.r, t));
        const g = Math.round(InterpolationCore.lerp(start.g, end.g, t));
        const b = Math.round(InterpolationCore.lerp(start.b, end.b, t));
        const a = InterpolationCore.lerp(start.a, end.a, t);
        
        return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    /**
     * Interpolate between two colors in HSL space
     * @param {string} startColor - Start color
     * @param {string} endColor - End color
     * @param {number} t - Time factor (0-1)
     * @returns {string} Interpolated color
     */
    static interpolateHSL(startColor, endColor, t) {
        const start = this.rgbToHsl(this.parseColor(startColor));
        const end = this.rgbToHsl(this.parseColor(endColor));
        
        // Handle hue wrapping for shortest path
        let hueDiff = end.h - start.h;
        if (hueDiff > 0.5) hueDiff -= 1;
        if (hueDiff < -0.5) hueDiff += 1;
        
        const h = (start.h + hueDiff * t + 1) % 1;
        const s = InterpolationCore.lerp(start.s, end.s, t);
        const l = InterpolationCore.lerp(start.l, end.l, t);
        const a = InterpolationCore.lerp(start.a, end.a, t);
        
        const hDeg = Math.round(h * 360);
        const sPercent = Math.round(s * 100);
        const lPercent = Math.round(l * 100);
        
        return a === 1 ? `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)` : 
                        `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${a})`;
    }
    
    /**
     * Convert RGB to HSL
     */
    static rgbToHsl({ r, g, b, a }) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h, s, l, a };
    }
}

/**
 * Array and path interpolation
 */
export class PathInterpolator {
    /**
     * Interpolate between two arrays of numbers
     * @param {number[]} start - Start array
     * @param {number[]} end - End array
     * @param {number} t - Time factor (0-1)
     * @returns {number[]} Interpolated array
     */
    static interpolateArray(start, end, t) {
        const length = Math.max(start.length, end.length);
        const result = [];
        
        for (let i = 0; i < length; i++) {
            const startVal = start[i] !== undefined ? start[i] : end[i] || 0;
            const endVal = end[i] !== undefined ? end[i] : start[i] || 0;
            result[i] = InterpolationCore.lerp(startVal, endVal, t);
        }
        
        return result;
    }
    
    /**
     * Interpolate along a cubic Bezier curve
     * @param {Object} p0 - Start point {x, y}
     * @param {Object} p1 - First control point
     * @param {Object} p2 - Second control point
     * @param {Object} p3 - End point
     * @param {number} t - Time factor (0-1)
     * @returns {Object} Interpolated point
     */
    static bezierCubic(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
    }
    
    /**
     * Interpolate along a path defined by points
     * @param {Object[]} points - Array of {x, y} points
     * @param {number} t - Time factor (0-1)
     * @returns {Object} Interpolated point
     */
    static interpolatePath(points, t) {
        if (points.length === 0) return { x: 0, y: 0 };
        if (points.length === 1) return { ...points[0] };
        
        const segmentLength = 1 / (points.length - 1);
        const segment = Math.floor(t / segmentLength);
        const localT = (t % segmentLength) / segmentLength;
        
        if (segment >= points.length - 1) {
            return { ...points[points.length - 1] };
        }
        
        const start = points[segment];
        const end = points[segment + 1];
        
        return {
            x: InterpolationCore.lerp(start.x, end.x, localT),
            y: InterpolationCore.lerp(start.y, end.y, localT)
        };
    }
    
    /**
     * Create smooth path from points using Catmull-Rom splines
     * @param {Object[]} points - Control points
     * @param {number} tension - Tension parameter (0-1)
     * @returns {Function} Interpolation function
     */
    static createCatmullRomPath(points, tension = 0.5) {
        if (points.length < 2) return (t) => points[0] || { x: 0, y: 0 };
        
        return (t) => {
            const segmentCount = points.length - 1;
            const segment = Math.floor(t * segmentCount);
            const localT = (t * segmentCount) - segment;
            
            if (segment >= segmentCount) {
                return { ...points[points.length - 1] };
            }
            
            // Get control points (with virtual points at ends)
            const p0 = points[Math.max(0, segment - 1)];
            const p1 = points[segment];
            const p2 = points[segment + 1];
            const p3 = points[Math.min(points.length - 1, segment + 2)];
            
            const t2 = localT * localT;
            const t3 = t2 * localT;
            
            const v0 = { 
                x: (p2.x - p0.x) * tension,
                y: (p2.y - p0.y) * tension
            };
            const v1 = { 
                x: (p3.x - p1.x) * tension,
                y: (p3.y - p1.y) * tension
            };
            
            return {
                x: p1.x + v0.x * localT + (3 * (p2.x - p1.x) - 2 * v0.x - v1.x) * t2 + 
                   (2 * (p1.x - p2.x) + v0.x + v1.x) * t3,
                y: p1.y + v0.y * localT + (3 * (p2.y - p1.y) - 2 * v0.y - v1.y) * t2 + 
                   (2 * (p1.y - p2.y) + v0.y + v1.y) * t3
            };
        };
    }
}

/**
 * Data interpolation for datasets
 */
export class DataInterpolator {
    /**
     * Interpolate between two datasets
     * @param {Array} startData - Starting dataset
     * @param {Array} endData - Ending dataset
     * @param {number} t - Time factor (0-1)
     * @param {Function} keyFunction - Function to get unique key for each data point
     * @returns {Array} Interpolated dataset
     */
    static interpolateDataset(startData, endData, t, keyFunction = (d, i) => i) {
        const startMap = new Map();
        const endMap = new Map();
        const allKeys = new Set();
        
        // Build maps and collect all keys
        startData.forEach((d, i) => {
            const key = keyFunction(d, i);
            startMap.set(key, d);
            allKeys.add(key);
        });
        
        endData.forEach((d, i) => {
            const key = keyFunction(d, i);
            endMap.set(key, d);
            allKeys.add(key);
        });
        
        // Interpolate each data point
        const result = [];
        for (const key of allKeys) {
            const startPoint = startMap.get(key);
            const endPoint = endMap.get(key);
            
            if (startPoint && endPoint) {
                // Both exist - interpolate
                result.push(this.interpolateDataPoint(startPoint, endPoint, t));
            } else if (startPoint && !endPoint) {
                // Exists in start only - fade out
                const interpolated = this.interpolateDataPoint(startPoint, startPoint, t);
                interpolated._opacity = 1 - t;
                result.push(interpolated);
            } else if (!startPoint && endPoint) {
                // Exists in end only - fade in
                const interpolated = this.interpolateDataPoint(endPoint, endPoint, t);
                interpolated._opacity = t;
                result.push(interpolated);
            }
        }
        
        return result;
    }
    
    /**
     * Interpolate between two data points
     * @param {Object} start - Start data point
     * @param {Object} end - End data point
     * @param {number} t - Time factor (0-1)
     * @returns {Object} Interpolated data point
     */
    static interpolateDataPoint(start, end, t) {
        const result = {};
        const allKeys = new Set([...Object.keys(start), ...Object.keys(end)]);
        
        for (const key of allKeys) {
            const startVal = start[key];
            const endVal = end[key];
            
            if (typeof startVal === 'number' && typeof endVal === 'number') {
                result[key] = InterpolationCore.lerp(startVal, endVal, t);
            } else if (typeof startVal === 'string' && typeof endVal === 'string') {
                // Try color interpolation first
                if (this.isColor(startVal) && this.isColor(endVal)) {
                    result[key] = ColorInterpolator.interpolateRGB(startVal, endVal, t);
                } else {
                    // String interpolation - switch at midpoint
                    result[key] = t < 0.5 ? startVal : endVal;
                }
            } else if (Array.isArray(startVal) && Array.isArray(endVal)) {
                result[key] = PathInterpolator.interpolateArray(startVal, endVal, t);
            } else {
                // Default behavior
                result[key] = t < 0.5 ? startVal : endVal;
            }
        }
        
        return result;
    }
    
    /**
     * Check if string is a color
     */
    static isColor(str) {
        return /^#([0-9A-F]{3}){1,2}$/i.test(str) || 
               /^rgb\(/.test(str) || 
               /^rgba\(/.test(str) || 
               /^hsl\(/.test(str) || 
               /^hsla\(/.test(str);
    }
    
    /**
     * Create morphing animation between datasets
     * @param {Array} datasets - Array of datasets to morph between
     * @param {Function} keyFunction - Function to get unique key for each data point
     * @returns {Function} Function that takes t (0-1) and returns interpolated dataset
     */
    static createDatasetMorph(datasets, keyFunction = (d, i) => i) {
        if (datasets.length === 0) return () => [];
        if (datasets.length === 1) return () => datasets[0];
        
        return (t) => {
            const clampedT = Math.max(0, Math.min(1, t));
            const segmentLength = 1 / (datasets.length - 1);
            const segment = Math.floor(clampedT / segmentLength);
            const localT = (clampedT % segmentLength) / segmentLength;
            
            if (segment >= datasets.length - 1) {
                return datasets[datasets.length - 1];
            }
            
            return this.interpolateDataset(
                datasets[segment], 
                datasets[segment + 1], 
                localT, 
                keyFunction
            );
        };
    }
}

/**
 * Main interpolation utility class
 */
export class Interpolator {
    constructor() {
        this.cache = new Map();
    }
    
    /**
     * Generic interpolation method
     * @param {*} start - Start value
     * @param {*} end - End value
     * @param {number} t - Time factor (0-1)
     * @param {string} method - Interpolation method
     * @returns {*} Interpolated value
     */
    interpolate(start, end, t, method = 'linear') {
        // Handle different data types
        if (typeof start === 'number' && typeof end === 'number') {
            switch (method) {
                case 'cubic': return InterpolationCore.cubic(start, start, end, end, t);
                case 'smoothstep': return InterpolationCore.smoothstep(start, end, t);
                default: return InterpolationCore.lerp(start, end, t);
            }
        }
        
        if (typeof start === 'string' && typeof end === 'string') {
            if (DataInterpolator.isColor(start) && DataInterpolator.isColor(end)) {
                return method === 'hsl' ? 
                    ColorInterpolator.interpolateHSL(start, end, t) :
                    ColorInterpolator.interpolateRGB(start, end, t);
            }
            return t < 0.5 ? start : end;
        }
        
        if (Array.isArray(start) && Array.isArray(end)) {
            return PathInterpolator.interpolateArray(start, end, t);
        }
        
        if (typeof start === 'object' && typeof end === 'object') {
            return DataInterpolator.interpolateDataPoint(start, end, t);
        }
        
        // Default fallback
        return t < 0.5 ? start : end;
    }
    
    /**
     * Create cached interpolator function
     * @param {*} start - Start value
     * @param {*} end - End value
     * @param {string} method - Interpolation method
     * @returns {Function} Interpolator function
     */
    createInterpolator(start, end, method = 'linear') {
        const cacheKey = `${JSON.stringify(start)}_${JSON.stringify(end)}_${method}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const interpolatorFn = (t) => this.interpolate(start, end, t, method);
        this.cache.set(cacheKey, interpolatorFn);
        
        return interpolatorFn;
    }
    
    /**
     * Clear interpolator cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export instances and utilities
export const interpolator = new Interpolator();

export default {
    InterpolationCore,
    ColorInterpolator,
    PathInterpolator,
    DataInterpolator,
    Interpolator,
    interpolator
};