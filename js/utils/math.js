/**
 * Mathematical Utilities
 * High-performance mathematical operations for data visualization and clustering
 */

export class MathUtils {
    constructor() {
        // Mathematical constants
        this.constants = {
            PI: Math.PI,
            PI_2: Math.PI / 2,
            PI_4: Math.PI / 4,
            TAU: Math.PI * 2,
            E: Math.E,
            PHI: (1 + Math.sqrt(5)) / 2, // Golden ratio
            SQRT_2: Math.sqrt(2),
            SQRT_3: Math.sqrt(3),
            SQRT_5: Math.sqrt(5),
            LN_2: Math.LN2,
            LN_10: Math.LN10,
            LOG_2E: Math.LOG2E,
            LOG_10E: Math.LOG10E
        };
        
        // Cached values for performance
        this.cache = new Map();
        this.sinCache = new Map();
        this.cosCache = new Map();
        
        // Pre-compute common values
        this.precomputeValues();
    }

    /**
     * Pre-compute commonly used trigonometric values
     */
    precomputeValues() {
        // Pre-compute sin/cos for common angles (0-360 degrees)
        for (let angle = 0; angle <= 360; angle++) {
            const radians = this.degToRad(angle);
            this.sinCache.set(angle, Math.sin(radians));
            this.cosCache.set(angle, Math.cos(radians));
        }
    }

    // ===================================
    // Basic Mathematical Operations
    // ===================================

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * Inverse linear interpolation
     */
    invLerp(start, end, value) {
        return (value - start) / (end - start);
    }

    /**
     * Map value from one range to another
     */
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }

    /**
     * Smooth step interpolation (S-curve)
     */
    smoothStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    /**
     * Smoother step interpolation
     */
    smootherStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Check if number is approximately equal (floating point comparison)
     */
    approximately(a, b, epsilon = 1e-10) {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * Round to specified decimal places
     */
    roundTo(value, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * Check if value is power of 2
     */
    isPowerOfTwo(value) {
        return (value & (value - 1)) === 0 && value !== 0;
    }

    /**
     * Next power of 2
     */
    nextPowerOfTwo(value) {
        return Math.pow(2, Math.ceil(Math.log2(value)));
    }

    // ===================================
    // Trigonometric Functions
    // ===================================

    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * Cached sine function for integer degrees
     */
    sin(angle) {
        const rounded = Math.round(angle);
        if (this.sinCache.has(rounded)) {
            return this.sinCache.get(rounded);
        }
        return Math.sin(this.degToRad(angle));
    }

    /**
     * Cached cosine function for integer degrees
     */
    cos(angle) {
        const rounded = Math.round(angle);
        if (this.cosCache.has(rounded)) {
            return this.cosCache.get(rounded);
        }
        return Math.cos(this.degToRad(angle));
    }

    /**
     * Normalize angle to 0-360 range
     */
    normalizeAngle(angle) {
        angle = angle % 360;
        return angle < 0 ? angle + 360 : angle;
    }

    /**
     * Calculate angle between two points
     */
    angleBetweenPoints(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    // ===================================
    // Vector Operations
    // ===================================

    /**
     * Vector addition
     */
    vectorAdd(v1, v2) {
        return v1.map((val, i) => val + v2[i]);
    }

    /**
     * Vector subtraction
     */
    vectorSubtract(v1, v2) {
        return v1.map((val, i) => val - v2[i]);
    }

    /**
     * Vector multiplication by scalar
     */
    vectorMultiply(vector, scalar) {
        return vector.map(val => val * scalar);
    }

    /**
     * Vector division by scalar
     */
    vectorDivide(vector, scalar) {
        return vector.map(val => val / scalar);
    }

    /**
     * Dot product of two vectors
     */
    dotProduct(v1, v2) {
        return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    }

    /**
     * Cross product of two 2D vectors (returns scalar)
     */
    crossProduct2D(v1, v2) {
        return v1[0] * v2[1] - v1[1] * v2[0];
    }

    /**
     * Vector magnitude (length)
     */
    vectorMagnitude(vector) {
        return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    }

    /**
     * Normalize vector to unit length
     */
    normalizeVector(vector) {
        const magnitude = this.vectorMagnitude(vector);
        return magnitude === 0 ? vector : this.vectorDivide(vector, magnitude);
    }

    /**
     * Distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Squared distance (faster when you don't need the actual distance)
     */
    distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Manhattan distance
     */
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * N-dimensional Euclidean distance
     */
    euclideanDistance(point1, point2) {
        if (point1.length !== point2.length) {
            throw new Error('Points must have the same dimensionality');
        }
        
        let sum = 0;
        for (let i = 0; i < point1.length; i++) {
            const diff = point1[i] - point2[i];
            sum += diff * diff;
        }
        
        return Math.sqrt(sum);
    }

    // ===================================
    // Statistical Functions
    // ===================================

    /**
     * Calculate mean of array
     */
    mean(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate median of array
     */
    median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    /**
     * Calculate mode of array
     */
    mode(values) {
        const frequency = {};
        let maxFreq = 0;
        let mode = [];
        
        values.forEach(val => {
            frequency[val] = (frequency[val] || 0) + 1;
            if (frequency[val] > maxFreq) {
                maxFreq = frequency[val];
                mode = [val];
            } else if (frequency[val] === maxFreq && !mode.includes(val)) {
                mode.push(val);
            }
        });
        
        return mode.length === 1 ? mode[0] : mode;
    }

    /**
     * Calculate variance
     */
    variance(values) {
        const avg = this.mean(values);
        const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
        return this.mean(squaredDiffs);
    }

    /**
     * Calculate standard deviation
     */
    standardDeviation(values) {
        return Math.sqrt(this.variance(values));
    }

    /**
     * Calculate covariance between two arrays
     */
    covariance(x, y) {
        const meanX = this.mean(x);
        const meanY = this.mean(y);
        
        let sum = 0;
        for (let i = 0; i < x.length; i++) {
            sum += (x[i] - meanX) * (y[i] - meanY);
        }
        
        return sum / (x.length - 1);
    }

    /**
     * Calculate correlation coefficient
     */
    correlation(x, y) {
        const cov = this.covariance(x, y);
        const stdX = this.standardDeviation(x);
        const stdY = this.standardDeviation(y);
        
        return cov / (stdX * stdY);
    }

    /**
     * Calculate percentile
     */
    percentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        
        if (Number.isInteger(index)) {
            return sorted[index];
        } else {
            const lower = sorted[Math.floor(index)];
            const upper = sorted[Math.ceil(index)];
            return lower + (upper - lower) * (index - Math.floor(index));
        }
    }

    /**
     * Calculate z-score
     */
    zScore(value, mean, standardDeviation) {
        return (value - mean) / standardDeviation;
    }

    // ===================================
    // Easing Functions
    // ===================================

    /**
     * Ease in (accelerating)
     */
    easeIn(t, power = 2) {
        return Math.pow(t, power);
    }

    /**
     * Ease out (decelerating)
     */
    easeOut(t, power = 2) {
        return 1 - Math.pow(1 - t, power);
    }

    /**
     * Ease in-out
     */
    easeInOut(t, power = 2) {
        return t < 0.5 
            ? Math.pow(2 * t, power) / 2 
            : 1 - Math.pow(2 * (1 - t), power) / 2;
    }

    /**
     * Elastic ease in
     */
    easeElasticIn(t) {
        return t === 0 ? 0 : t === 1 ? 1 : 
            -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }

    /**
     * Elastic ease out
     */
    easeElasticOut(t) {
        return t === 0 ? 0 : t === 1 ? 1 : 
            Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    }

    /**
     * Bounce ease out
     */
    easeBounceOut(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }

    // ===================================
    // Random Number Generation
    // ===================================

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Random boolean
     */
    randomBoolean() {
        return Math.random() < 0.5;
    }

    /**
     * Random choice from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Shuffle array (Fisher-Yates algorithm)
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Generate random point in circle
     */
    randomPointInCircle(centerX, centerY, radius) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius * Math.sqrt(Math.random());
        return {
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle)
        };
    }

    /**
     * Generate Gaussian random number (Box-Muller transform)
     */
    randomGaussian(mean = 0, stdDev = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
        return z * stdDev + mean;
    }

    // ===================================
    // Geometric Functions
    // ===================================

    /**
     * Check if point is inside rectangle
     */
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    /**
     * Check if point is inside circle
     */
    pointInCircle(px, py, cx, cy, radius) {
        return this.distanceSquared(px, py, cx, cy) <= radius * radius;
    }

    /**
     * Check if rectangles intersect
     */
    rectIntersect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
        return !(r2x > r1x + r1w || 
                r2x + r2w < r1x || 
                r2y > r1y + r1h || 
                r2y + r2h < r1y);
    }

    /**
     * Check if circles intersect
     */
    circleIntersect(c1x, c1y, r1, c2x, c2y, r2) {
        return this.distance(c1x, c1y, c2x, c2y) <= r1 + r2;
    }

    /**
     * Calculate area of triangle
     */
    triangleArea(x1, y1, x2, y2, x3, y3) {
        return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2);
    }

    /**
     * Calculate centroid of points
     */
    centroid(points) {
        const sum = points.reduce((acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    /**
     * Calculate bounding box of points
     */
    boundingBox(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // ===================================
    // Data Processing
    // ===================================

    /**
     * Normalize array to 0-1 range
     */
    normalize(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        
        return range === 0 
            ? values.map(() => 0) 
            : values.map(val => (val - min) / range);
    }

    /**
     * Standardize array (z-score normalization)
     */
    standardize(values) {
        const mean = this.mean(values);
        const stdDev = this.standardDeviation(values);
        
        return stdDev === 0 
            ? values.map(() => 0) 
            : values.map(val => (val - mean) / stdDev);
    }

    /**
     * Calculate cumulative sum
     */
    cumSum(values) {
        const result = [];
        let sum = 0;
        
        values.forEach(val => {
            sum += val;
            result.push(sum);
        });
        
        return result;
    }

    /**
     * Calculate moving average
     */
    movingAverage(values, windowSize) {
        const result = [];
        
        for (let i = 0; i < values.length - windowSize + 1; i++) {
            const window = values.slice(i, i + windowSize);
            result.push(this.mean(window));
        }
        
        return result;
    }

    /**
     * Calculate exponential moving average
     */
    exponentialMovingAverage(values, alpha) {
        const result = [values[0]];
        
        for (let i = 1; i < values.length; i++) {
            const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
            result.push(ema);
        }
        
        return result;
    }

    // ===================================
    // Performance Optimizations
    // ===================================

    /**
     * Fast inverse square root (Quake III algorithm)
     */
    fastInvSqrt(number) {
        const threehalfs = 1.5;
        const x2 = number * 0.5;
        let y = number;
        
        // Evil floating point bit level hacking (simplified for JS)
        let i = new DataView(new ArrayBuffer(4));
        i.setFloat32(0, y);
        let bits = i.getUint32(0);
        bits = 0x5f3759df - (bits >> 1);
        i.setUint32(0, bits);
        y = i.getFloat32(0);
        
        return y * (threehalfs - (x2 * y * y)); // 1st iteration
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            sinCacheSize: this.sinCache.size,
            cosCacheSize: this.cosCache.size
        };
    }
}

// Create singleton instance
export const mathUtils = new MathUtils();

// Export commonly used functions for convenience
export const {
    clamp,
    lerp,
    map,
    distance,
    distanceSquared,
    mean,
    variance,
    standardDeviation,
    normalize,
    randomFloat,
    randomInt,
    degToRad,
    radToDeg
} = mathUtils;

// Export constants
export const MATH_CONSTANTS = mathUtils.constants;

// Export as default
export default MathUtils;