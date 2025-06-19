/**
 * Color Utilities and Palette Management
 * High-performance color operations for data visualization
 */

export class ColorPalette {
    constructor() {
        // Predefined color palettes optimized for clustering visualization
        this.palettes = {
            // Default modern palette with good contrast
            default: [
                '#6366f1', // Indigo
                '#8b5cf6', // Purple  
                '#06b6d4', // Cyan
                '#10b981', // Emerald
                '#f59e0b', // Amber
                '#ef4444', // Red
                '#ec4899', // Pink
                '#84cc16'  // Lime
            ],
            
            // Scientific viridis palette (perceptually uniform)
            viridis: [
                '#440154', '#482777', '#3f4a8a', '#31678e',
                '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'
            ],
            
            // Plasma palette (high contrast)
            plasma: [
                '#0d0887', '#46039f', '#7201a8', '#9c179e',
                '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', 
                '#fdca26', '#f0f921'
            ],
            
            // Colorblind-friendly palette
            accessible: [
                '#1f77b4', // Blue
                '#ff7f0e', // Orange
                '#2ca02c', // Green
                '#d62728', // Red
                '#9467bd', // Purple
                '#8c564b', // Brown
                '#e377c2', // Pink
                '#7f7f7f'  // Gray
            ],
            
            // High contrast palette for dark themes
            darkTheme: [
                '#60a5fa', // Light blue
                '#a78bfa', // Light purple
                '#34d399', // Light green
                '#fbbf24', // Light yellow
                '#f87171', // Light red
                '#fb7185', // Light pink
                '#a3e635', // Light lime
                '#38bdf8'  // Light sky
            ],
            
            // Subtle palette for light themes
            lightTheme: [
                '#3b82f6', // Blue
                '#8b5cf6', // Purple
                '#059669', // Green
                '#d97706', // Orange
                '#dc2626', // Red
                '#be185d', // Pink
                '#65a30d', // Lime
                '#0284c7'  // Sky
            ],
            
            // Categorical palette for many clusters
            categorical: [
                '#e41a1c', '#377eb8', '#4daf4a', '#984ea3',
                '#ff7f00', '#ffff33', '#a65628', '#f781bf',
                '#999999', '#66c2a5', '#fc8d62', '#8da0cb',
                '#e78ac3', '#a6d854', '#ffd92f', '#e5c494',
                '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada'
            ],
            
            // Gradient-friendly smooth palette
            smooth: [
                '#667eea', '#764ba2', '#f093fb', '#f5576c',
                '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
                '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
            ],
            
            // Monochromatic blue palette
            blues: [
                '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd',
                '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',
                '#1e40af', '#1e3a8a'
            ],
            
            // Warm palette
            warm: [
                '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
                '#f59e0b', '#d97706', '#b45309', '#92400e',
                '#78350f', '#451a03'
            ]
        };
        
        this.currentPalette = 'default';
        this.customColors = new Map();
        
        // Color cache for performance
        this.colorCache = new Map();
        
        // Theme awareness
        this.isDarkTheme = document.body.classList.contains('theme-dark');
        this.updateThemeColors();
    }

    /**
     * Get colors from specified palette
     */
    getColors(paletteName = this.currentPalette, count = null) {
        const palette = this.palettes[paletteName] || this.palettes.default;
        
        if (count === null) {
            return [...palette];
        }
        
        if (count <= palette.length) {
            return palette.slice(0, count);
        }
        
        // Generate additional colors if needed
        return this.generateColors(paletteName, count);
    }

    /**
     * Generate colors for large number of clusters
     */
    generateColors(paletteName = this.currentPalette, count) {
        const basePalette = this.palettes[paletteName] || this.palettes.default;
        const colors = [...basePalette];
        
        if (count <= colors.length) {
            return colors.slice(0, count);
        }
        
        // Generate additional colors by interpolating and adjusting hue
        const baseColorCount = colors.length;
        const additionalNeeded = count - baseColorCount;
        
        for (let i = 0; i < additionalNeeded; i++) {
            const baseColor = colors[i % baseColorCount];
            const hsl = this.hexToHsl(baseColor);
            
            // Adjust hue and saturation for variation
            const hueShift = (i / additionalNeeded) * 360;
            const newHue = (hsl.h + hueShift) % 360;
            const newSaturation = Math.max(0.3, hsl.s - (i * 0.1) % 0.5);
            const newLightness = Math.max(0.3, Math.min(0.8, hsl.l + (i * 0.1) % 0.3));
            
            const newColor = this.hslToHex({
                h: newHue,
                s: newSaturation,
                l: newLightness
            });
            
            colors.push(newColor);
        }
        
        return colors;
    }

    /**
     * Get color by index with automatic wrapping
     */
    getColor(index, paletteName = this.currentPalette) {
        const cacheKey = `${paletteName}-${index}`;
        
        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey);
        }
        
        const palette = this.getColors(paletteName);
        const color = palette[index % palette.length];
        
        this.colorCache.set(cacheKey, color);
        return color;
    }

    /**
     * Set current palette
     */
    setPalette(paletteName) {
        if (this.palettes[paletteName]) {
            this.currentPalette = paletteName;
            this.colorCache.clear(); // Clear cache when palette changes
            return true;
        }
        return false;
    }

    /**
     * Add custom palette
     */
    addPalette(name, colors) {
        if (!Array.isArray(colors) || colors.length === 0) {
            throw new Error('Palette must be a non-empty array of colors');
        }
        
        // Validate colors
        const validColors = colors.filter(color => this.isValidColor(color));
        if (validColors.length !== colors.length) {
            console.warn('Some colors in the palette are invalid and were filtered out');
        }
        
        this.palettes[name] = validColors;
        return validColors.length;
    }

    /**
     * Update theme-specific colors
     */
    updateThemeColors() {
        this.isDarkTheme = document.body.classList.contains('theme-dark');
        
        // Clear cache to ensure theme colors are recalculated
        this.colorCache.clear();
        
        // Set default palette based on theme
        if (this.isDarkTheme && this.currentPalette === 'default') {
            this.currentPalette = 'darkTheme';
        } else if (!this.isDarkTheme && this.currentPalette === 'darkTheme') {
            this.currentPalette = 'default';
        }
    }

    /**
     * Get theme-appropriate color
     */
    getThemeColor(color) {
        if (!this.isDarkTheme) return color;
        
        // Lighten colors for dark theme
        const hsl = this.hexToHsl(color);
        return this.hslToHex({
            h: hsl.h,
            s: Math.max(0.4, hsl.s),
            l: Math.max(0.5, hsl.l + 0.2)
        });
    }

    /**
     * Interpolate between two colors
     */
    interpolateColors(color1, color2, factor) {
        const cacheKey = `interp-${color1}-${color2}-${factor}`;
        
        if (this.colorCache.has(cacheKey)) {
            return this.colorCache.get(cacheKey);
        }
        
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        const result = {
            r: Math.round(rgb1.r + factor * (rgb2.r - rgb1.r)),
            g: Math.round(rgb1.g + factor * (rgb2.g - rgb1.g)),
            b: Math.round(rgb1.b + factor * (rgb2.b - rgb1.b))
        };
        
        const interpolated = this.rgbToHex(result);
        this.colorCache.set(cacheKey, interpolated);
        return interpolated;
    }

    /**
     * Create gradient colors
     */
    createGradient(startColor, endColor, steps) {
        const colors = [];
        
        for (let i = 0; i < steps; i++) {
            const factor = i / (steps - 1);
            colors.push(this.interpolateColors(startColor, endColor, factor));
        }
        
        return colors;
    }

    /**
     * Get contrasting color (black or white)
     */
    getContrastColor(backgroundColor) {
        const rgb = this.hexToRgb(backgroundColor);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Adjust color opacity
     */
    adjustOpacity(color, opacity) {
        const rgb = this.hexToRgb(color);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    /**
     * Lighten color
     */
    lighten(color, amount) {
        const hsl = this.hexToHsl(color);
        return this.hslToHex({
            h: hsl.h,
            s: hsl.s,
            l: Math.min(1, hsl.l + amount)
        });
    }

    /**
     * Darken color
     */
    darken(color, amount) {
        const hsl = this.hexToHsl(color);
        return this.hslToHex({
            h: hsl.h,
            s: hsl.s,
            l: Math.max(0, hsl.l - amount)
        });
    }

    /**
     * Saturate color
     */
    saturate(color, amount) {
        const hsl = this.hexToHsl(color);
        return this.hslToHex({
            h: hsl.h,
            s: Math.min(1, hsl.s + amount),
            l: hsl.l
        });
    }

    /**
     * Desaturate color
     */
    desaturate(color, amount) {
        const hsl = this.hexToHsl(color);
        return this.hslToHex({
            h: hsl.h,
            s: Math.max(0, hsl.s - amount),
            l: hsl.l
        });
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(rgb) {
        const componentToHex = (c) => {
            const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        
        return "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
    }

    /**
     * Convert hex to HSL
     */
    hexToHsl(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return null;
        
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // Achromatic
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
        
        return {
            h: h * 360,
            s: s,
            l: l
        };
    }

    /**
     * Convert HSL to hex
     */
    hslToHex(hsl) {
        const h = hsl.h / 360;
        const s = hsl.s;
        const l = hsl.l;
        
        const hueToRgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // Achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1/3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1/3);
        }
        
        return this.rgbToHex({
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        });
    }

    /**
     * Validate color format
     */
    isValidColor(color) {
        if (typeof color !== 'string') return false;
        
        // Check hex format
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
            return true;
        }
        
        // Check rgb/rgba format
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
            return true;
        }
        
        // Check hsl/hsla format
        if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
            return true;
        }
        
        return false;
    }

    /**
     * Generate random color
     */
    randomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Generate harmonious colors
     */
    generateHarmoniousColors(baseColor, count) {
        const hsl = this.hexToHsl(baseColor);
        const colors = [baseColor];
        
        for (let i = 1; i < count; i++) {
            const hueShift = (360 / count) * i;
            const newHue = (hsl.h + hueShift) % 360;
            
            const newColor = this.hslToHex({
                h: newHue,
                s: hsl.s,
                l: hsl.l
            });
            
            colors.push(newColor);
        }
        
        return colors;
    }

    /**
     * Get accessible color combinations
     */
    getAccessiblePairs() {
        return [
            { background: '#ffffff', foreground: '#000000' },
            { background: '#000000', foreground: '#ffffff' },
            { background: '#1f2937', foreground: '#f9fafb' },
            { background: '#3b82f6', foreground: '#ffffff' },
            { background: '#ef4444', foreground: '#ffffff' },
            { background: '#10b981', foreground: '#ffffff' },
            { background: '#f59e0b', foreground: '#000000' },
            { background: '#8b5cf6', foreground: '#ffffff' }
        ];
    }

    /**
     * Clear color cache
     */
    clearCache() {
        this.colorCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.colorCache.size,
            palettes: Object.keys(this.palettes).length,
            currentPalette: this.currentPalette,
            isDarkTheme: this.isDarkTheme
        };
    }

    /**
     * Export palette as CSS variables
     */
    exportAsCSSVariables(paletteName = this.currentPalette) {
        const colors = this.getColors(paletteName);
        let css = `:root {\n`;
        
        colors.forEach((color, index) => {
            css += `  --cluster-color-${index}: ${color};\n`;
        });
        
        css += `}\n`;
        return css;
    }

    /**
     * Static method: Create ColorPalette instance
     */
    static create() {
        return new ColorPalette();
    }
}

// Create default instance
export const colorPalette = new ColorPalette();

// Export individual color utilities
export const ColorUtils = {
    hexToRgb: (hex) => colorPalette.hexToRgb(hex),
    rgbToHex: (rgb) => colorPalette.rgbToHex(rgb),
    hexToHsl: (hex) => colorPalette.hexToHsl(hex),
    hslToHex: (hsl) => colorPalette.hslToHex(hsl),
    interpolate: (color1, color2, factor) => colorPalette.interpolateColors(color1, color2, factor),
    lighten: (color, amount) => colorPalette.lighten(color, amount),
    darken: (color, amount) => colorPalette.darken(color, amount),
    adjustOpacity: (color, opacity) => colorPalette.adjustOpacity(color, opacity),
    getContrast: (backgroundColor) => colorPalette.getContrastColor(backgroundColor),
    isValid: (color) => colorPalette.isValidColor(color),
    random: () => colorPalette.randomColor()
};

// Listen for theme changes
if (typeof window !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                colorPalette.updateThemeColors();
            }
        });
    });
    
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}
