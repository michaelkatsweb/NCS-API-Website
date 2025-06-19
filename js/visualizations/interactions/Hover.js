// File: Hover.js
// Path: js/visualizations/interactions/Hover.js
// Hover effects system for NCS-API-Website interactive visualizations
// Handles hover detection, tooltips, visual feedback, and hover states

import { EventBus } from '../../core/eventBus.js';
import { calculateDistance } from '../../utils/math.js';
import { debounce } from '../../utils/debounce.js';

/**
 * Hover states enum
 */
export const HoverState = {
    NONE: 'none',
    HOVERING: 'hovering',
    ENTERING: 'entering',
    LEAVING: 'leaving',
    DELAYED: 'delayed'
};

/**
 * Tooltip positioning options
 */
export const TooltipPosition = {
    AUTO: 'auto',
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    CURSOR: 'cursor'
};

/**
 * Hover item representation
 */
export class HoverItem {
    constructor(id, data, position, metadata = {}) {
        this.id = id;
        this.data = data;
        this.position = position; // {x, y} coordinates
        this.metadata = metadata;
        this.state = HoverState.NONE;
        this.hoverTime = null;
        this.lastHoverTime = null;
        this.hoverDuration = 0;
        this.hoverCount = 0;
        this.bounds = null; // Optional bounding box for complex shapes
    }
    
    /**
     * Set hover state
     */
    setState(state) {
        const previousState = this.state;
        this.state = state;
        
        if (state === HoverState.HOVERING) {
            this.hoverTime = Date.now();
            this.hoverCount++;
        } else if (state === HoverState.NONE && previousState === HoverState.HOVERING) {
            this.lastHoverTime = this.hoverTime;
            this.hoverDuration = this.hoverTime ? Date.now() - this.hoverTime : 0;
            this.hoverTime = null;
        }
        
        return this;
    }
    
    /**
     * Check if point is within hover distance
     */
    isNearPoint(x, y, threshold = 10) {
        if (this.bounds) {
            // Use bounding box for complex shapes
            return x >= this.bounds.left - threshold &&
                   x <= this.bounds.right + threshold &&
                   y >= this.bounds.top - threshold &&
                   y <= this.bounds.bottom + threshold;
        }
        
        // Use distance for point-based items
        return calculateDistance(this.position.x, this.position.y, x, y) <= threshold;
    }
    
    /**
     * Set bounding box for complex shapes
     */
    setBounds(left, top, right, bottom) {
        this.bounds = { left, top, right, bottom };
        return this;
    }
    
    /**
     * Get hover statistics
     */
    getHoverStats() {
        return {
            state: this.state,
            hoverTime: this.hoverTime,
            lastHoverTime: this.lastHoverTime,
            hoverDuration: this.hoverDuration,
            hoverCount: this.hoverCount,
            isHovering: this.state === HoverState.HOVERING
        };
    }
}

/**
 * Tooltip manager for hover tooltips
 */
export class TooltipManager {
    constructor(container, options = {}) {
        this.container = container;
        this.element = null;
        this.visible = false;
        this.position = TooltipPosition.AUTO;
        this.offset = options.offset || { x: 10, y: 10 };
        this.maxWidth = options.maxWidth || 300;
        this.delay = options.delay || 500;
        this.hideDelay = options.hideDelay || 200;
        this.followCursor = options.followCursor || false;
        
        // Timing
        this.showTimer = null;
        this.hideTimer = null;
        
        // Content formatters
        this.defaultFormatter = options.defaultFormatter || this.createDefaultFormatter();
        this.customFormatters = new Map();
        
        this.createTooltipElement();
    }
    
    /**
     * Create tooltip DOM element
     */
    createTooltipElement() {
        this.element = document.createElement('div');
        this.element.className = 'ncs-tooltip';
        this.element.style.cssText = `
            position: absolute;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.4;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: ${this.maxWidth}px;
            word-wrap: break-word;
            visibility: hidden;
        `;
        
        this.container.appendChild(this.element);
    }
    
    /**
     * Show tooltip with content
     */
    show(item, x, y, content = null, position = null) {
        // Clear any existing timers
        this.clearTimers();
        
        // Set content
        const tooltipContent = content || this.formatContent(item);
        if (!tooltipContent) return;
        
        this.element.innerHTML = tooltipContent;
        
        // Show with delay
        this.showTimer = setTimeout(() => {
            this.element.style.visibility = 'visible';
            this.element.style.opacity = '1';
            this.visible = true;
            
            // Position tooltip
            this.updatePosition(x, y, position || this.position);
            
            EventBus.emit('tooltip:show', { 
                item, 
                content: tooltipContent, 
                position: { x, y } 
            });
        }, this.delay);
    }
    
    /**
     * Hide tooltip
     */
    hide() {
        this.clearTimers();
        
        this.hideTimer = setTimeout(() => {
            this.element.style.opacity = '0';
            this.visible = false;
            
            setTimeout(() => {
                if (!this.visible) {
                    this.element.style.visibility = 'hidden';
                }
            }, 200);
            
            EventBus.emit('tooltip:hide');
        }, this.hideDelay);
    }
    
    /**
     * Update tooltip position
     */
    updatePosition(x, y, position = TooltipPosition.AUTO) {
        if (!this.visible) return;
        
        const rect = this.element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        let left = x + this.offset.x;
        let top = y + this.offset.y;
        
        // Auto-position to avoid viewport edges
        if (position === TooltipPosition.AUTO) {
            // Check right edge
            if (left + rect.width > viewport.width) {
                left = x - rect.width - this.offset.x;
            }
            
            // Check bottom edge
            if (top + rect.height > viewport.height) {
                top = y - rect.height - this.offset.y;
            }
            
            // Ensure minimum margins
            left = Math.max(5, Math.min(left, viewport.width - rect.width - 5));
            top = Math.max(5, Math.min(top, viewport.height - rect.height - 5));
        } else {
            // Use specific positioning
            ({ left, top } = this.calculateSpecificPosition(x, y, rect, position));
        }
        
        // Convert to container-relative coordinates
        left -= containerRect.left;
        top -= containerRect.top;
        
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }
    
    /**
     * Calculate specific position
     */
    calculateSpecificPosition(x, y, rect, position) {
        let left = x;
        let top = y;
        
        switch (position) {
            case TooltipPosition.TOP:
                left = x - rect.width / 2;
                top = y - rect.height - this.offset.y;
                break;
            case TooltipPosition.BOTTOM:
                left = x - rect.width / 2;
                top = y + this.offset.y;
                break;
            case TooltipPosition.LEFT:
                left = x - rect.width - this.offset.x;
                top = y - rect.height / 2;
                break;
            case TooltipPosition.RIGHT:
                left = x + this.offset.x;
                top = y - rect.height / 2;
                break;
            case TooltipPosition.TOP_LEFT:
                left = x - rect.width - this.offset.x;
                top = y - rect.height - this.offset.y;
                break;
            case TooltipPosition.TOP_RIGHT:
                left = x + this.offset.x;
                top = y - rect.height - this.offset.y;
                break;
            case TooltipPosition.BOTTOM_LEFT:
                left = x - rect.width - this.offset.x;
                top = y + this.offset.y;
                break;
            case TooltipPosition.BOTTOM_RIGHT:
                left = x + this.offset.x;
                top = y + this.offset.y;
                break;
            case TooltipPosition.CURSOR:
                left = x + this.offset.x;
                top = y + this.offset.y;
                break;
        }
        
        return { left, top };
    }
    
    /**
     * Format tooltip content
     */
    formatContent(item) {
        const formatter = this.customFormatters.get(item.metadata.type) || 
                         this.customFormatters.get('default') || 
                         this.defaultFormatter;
        
        return formatter(item);
    }
    
    /**
     * Create default content formatter
     */
    createDefaultFormatter() {
        return (item) => {
            const parts = [];
            
            // Add ID if available
            if (item.id) {
                parts.push(`<strong>ID:</strong> ${item.id}`);
            }
            
            // Add data properties
            if (item.data && typeof item.data === 'object') {
                for (const [key, value] of Object.entries(item.data)) {
                    if (value !== null && value !== undefined) {
                        const formattedValue = typeof value === 'number' ? 
                            value.toFixed(2) : String(value);
                        parts.push(`<strong>${key}:</strong> ${formattedValue}`);
                    }
                }
            }
            
            // Add position
            if (item.position) {
                parts.push(`<strong>Position:</strong> (${item.position.x.toFixed(1)}, ${item.position.y.toFixed(1)})`);
            }
            
            // Add metadata
            if (item.metadata && Object.keys(item.metadata).length > 0) {
                for (const [key, value] of Object.entries(item.metadata)) {
                    if (key !== 'type' && value !== null && value !== undefined) {
                        parts.push(`<strong>${key}:</strong> ${value}`);
                    }
                }
            }
            
            return parts.length > 0 ? parts.join('<br>') : null;
        };
    }
    
    /**
     * Add custom formatter for specific item types
     */
    addFormatter(type, formatter) {
        this.customFormatters.set(type, formatter);
        return this;
    }
    
    /**
     * Clear all timers
     */
    clearTimers() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }
    
    /**
     * Destroy tooltip manager
     */
    destroy() {
        this.clearTimers();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.customFormatters.clear();
    }
}

/**
 * Main Hover Manager class
 */
export class HoverManager {
    constructor(container, options = {}) {
        this.container = container;
        this.enabled = options.enabled !== false;
        this.hoverThreshold = options.hoverThreshold || 10; // pixels
        this.hoverDelay = options.hoverDelay || 100; // milliseconds
        this.enableTooltips = options.enableTooltips !== false;
        this.throttleInterval = options.throttleInterval || 16; // ~60fps
        
        // State
        this.items = new Map();
        this.currentHoverItem = null;
        this.mousePosition = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        
        // Spatial indexing for performance
        this.spatialIndex = new Map();
        this.spatialResolution = options.spatialResolution || 50;
        
        // Tooltip manager
        this.tooltip = this.enableTooltips ? 
            new TooltipManager(container, options.tooltip || {}) : null;
        
        // Callbacks
        this.onHoverEnter = options.onHoverEnter || null;
        this.onHoverLeave = options.onHoverLeave || null;
        this.onHoverMove = options.onHoverMove || null;
        
        // Performance optimization
        this.throttledMouseMove = this.createThrottledMouseMove();
        this.debouncedHover = debounce(this.processHover.bind(this), this.hoverDelay);
        
        // Event listeners
        this.setupEventListeners();
        
        this.id = `hover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Add an item to hover management
     */
    addItem(id, data, position, metadata = {}) {
        const item = new HoverItem(id, data, position, metadata);
        this.items.set(id, item);
        this.updateSpatialIndex(item);
        return item;
    }
    
    /**
     * Remove an item from hover management
     */
    removeItem(id) {
        const item = this.items.get(id);
        if (item) {
            if (this.currentHoverItem === item) {
                this.handleHoverLeave(item);
            }
            this.removeSpatialIndex(item);
            this.items.delete(id);
        }
        return this;
    }
    
    /**
     * Update item position
     */
    updateItemPosition(id, position) {
        const item = this.items.get(id);
        if (item) {
            this.removeSpatialIndex(item);
            item.position = position;
            this.updateSpatialIndex(item);
        }
        return this;
    }
    
    /**
     * Update item bounds for complex shapes
     */
    updateItemBounds(id, bounds) {
        const item = this.items.get(id);
        if (item) {
            item.setBounds(bounds.left, bounds.top, bounds.right, bounds.bottom);
        }
        return this;
    }
    
    /**
     * Clear all items
     */
    clearItems() {
        if (this.currentHoverItem) {
            this.handleHoverLeave(this.currentHoverItem);
        }
        this.items.clear();
        this.spatialIndex.clear();
        return this;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.container.addEventListener('mousemove', this.throttledMouseMove);
        this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Handle container resize
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateTooltipPosition();
            });
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * Create throttled mouse move handler
     */
    createThrottledMouseMove() {
        let lastTime = 0;
        
        return (event) => {
            if (!this.enabled) return;
            
            const now = performance.now();
            if (now - lastTime < this.throttleInterval) return;
            lastTime = now;
            
            this.handleMouseMove(event);
        };
    }
    
    /**
     * Handle mouse move events
     */
    handleMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        this.lastMoveTime = Date.now();
        this.debouncedHover();
        
        // Update tooltip position if following cursor
        if (this.tooltip && this.tooltip.followCursor && this.currentHoverItem) {
            this.tooltip.updatePosition(
                event.clientX, 
                event.clientY, 
                TooltipPosition.CURSOR
            );
        }
    }
    
    /**
     * Handle mouse leave events
     */
    handleMouseLeave() {
        if (this.currentHoverItem) {
            this.handleHoverLeave(this.currentHoverItem);
        }
    }
    
    /**
     * Process hover detection
     */
    processHover() {
        if (!this.enabled) return;
        
        const item = this.getItemAtPosition(this.mousePosition.x, this.mousePosition.y);
        
        if (item !== this.currentHoverItem) {
            // Handle leave for previous item
            if (this.currentHoverItem) {
                this.handleHoverLeave(this.currentHoverItem);
            }
            
            // Handle enter for new item
            if (item) {
                this.handleHoverEnter(item);
            }
            
            this.currentHoverItem = item;
        } else if (item && this.onHoverMove) {
            // Handle move within same item
            this.onHoverMove(item, this.mousePosition.x, this.mousePosition.y);
        }
    }
    
    /**
     * Handle hover enter
     */
    handleHoverEnter(item) {
        item.setState(HoverState.ENTERING);
        
        setTimeout(() => {
            if (item.state === HoverState.ENTERING) {
                item.setState(HoverState.HOVERING);
                
                if (this.onHoverEnter) {
                    this.onHoverEnter(item, this.mousePosition.x, this.mousePosition.y);
                }
                
                EventBus.emit('hover:enter', { 
                    manager: this, 
                    item, 
                    position: this.mousePosition 
                });
                
                // Show tooltip
                if (this.tooltip) {
                    this.tooltip.show(
                        item,
                        this.mousePosition.x + this.container.getBoundingClientRect().left,
                        this.mousePosition.y + this.container.getBoundingClientRect().top
                    );
                }
            }
        }, this.hoverDelay);
    }
    
    /**
     * Handle hover leave
     */
    handleHoverLeave(item) {
        item.setState(HoverState.LEAVING);
        
        setTimeout(() => {
            if (item.state === HoverState.LEAVING) {
                item.setState(HoverState.NONE);
                
                if (this.onHoverLeave) {
                    this.onHoverLeave(item);
                }
                
                EventBus.emit('hover:leave', { 
                    manager: this, 
                    item 
                });
            }
        }, 50);
        
        // Hide tooltip
        if (this.tooltip) {
            this.tooltip.hide();
        }
    }
    
    /**
     * Get item at specific position
     */
    getItemAtPosition(x, y) {
        // Use spatial index for performance
        const candidates = this.getSpatialCandidates(x, y);
        
        let closestItem = null;
        let closestDistance = this.hoverThreshold;
        
        for (const item of candidates) {
            if (item.isNearPoint(x, y, this.hoverThreshold)) {
                const distance = calculateDistance(
                    item.position.x, 
                    item.position.y, 
                    x, 
                    y
                );
                
                if (distance < closestDistance) {
                    closestItem = item;
                    closestDistance = distance;
                }
            }
        }
        
        return closestItem;
    }
    
    /**
     * Update spatial index
     */
    updateSpatialIndex(item) {
        const gridX = Math.floor(item.position.x / this.spatialResolution);
        const gridY = Math.floor(item.position.y / this.spatialResolution);
        const key = `${gridX},${gridY}`;
        
        if (!this.spatialIndex.has(key)) {
            this.spatialIndex.set(key, new Set());
        }
        
        this.spatialIndex.get(key).add(item);
    }
    
    /**
     * Remove from spatial index
     */
    removeSpatialIndex(item) {
        const gridX = Math.floor(item.position.x / this.spatialResolution);
        const gridY = Math.floor(item.position.y / this.spatialResolution);
        const key = `${gridX},${gridY}`;
        
        const cell = this.spatialIndex.get(key);
        if (cell) {
            cell.delete(item);
            if (cell.size === 0) {
                this.spatialIndex.delete(key);
            }
        }
    }
    
    /**
     * Get spatial candidates around a point
     */
    getSpatialCandidates(x, y) {
        const candidates = new Set();
        const gridRadius = Math.ceil(this.hoverThreshold / this.spatialResolution);
        const centerGridX = Math.floor(x / this.spatialResolution);
        const centerGridY = Math.floor(y / this.spatialResolution);
        
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
            for (let dy = -gridRadius; dy <= gridRadius; dy++) {
                const key = `${centerGridX + dx},${centerGridY + dy}`;
                const cell = this.spatialIndex.get(key);
                if (cell) {
                    for (const item of cell) {
                        candidates.add(item);
                    }
                }
            }
        }
        
        return candidates;
    }
    
    /**
     * Update tooltip position
     */
    updateTooltipPosition() {
        if (this.tooltip && this.currentHoverItem) {
            const rect = this.container.getBoundingClientRect();
            this.tooltip.updatePosition(
                this.mousePosition.x + rect.left,
                this.mousePosition.y + rect.top
            );
        }
    }
    
    /**
     * Enable/disable hover manager
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled && this.currentHoverItem) {
            this.handleHoverLeave(this.currentHoverItem);
            this.currentHoverItem = null;
        }
        
        EventBus.emit('hover:enabled:change', { manager: this, enabled });
        return this;
    }
    
    /**
     * Set hover threshold
     */
    setHoverThreshold(threshold) {
        this.hoverThreshold = threshold;
        return this;
    }
    
    /**
     * Add tooltip formatter
     */
    addTooltipFormatter(type, formatter) {
        if (this.tooltip) {
            this.tooltip.addFormatter(type, formatter);
        }
        return this;
    }
    
    /**
     * Get hover statistics
     */
    getStats() {
        const hoveredItems = Array.from(this.items.values()).filter(
            item => item.state === HoverState.HOVERING
        );
        
        return {
            totalItems: this.items.size,
            hoveredItems: hoveredItems.length,
            currentHoverItem: this.currentHoverItem?.id || null,
            spatialIndexSize: this.spatialIndex.size,
            enabled: this.enabled,
            mousePosition: this.mousePosition,
            tooltipVisible: this.tooltip?.visible || false
        };
    }
    
    /**
     * Destroy hover manager
     */
    destroy() {
        // Remove event listeners
        this.container.removeEventListener('mousemove', this.throttledMouseMove);
        this.container.removeEventListener('mouseleave', this.handleMouseLeave);
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Destroy tooltip
        if (this.tooltip) {
            this.tooltip.destroy();
        }
        
        // Clear state
        this.clearItems();
        this.currentHoverItem = null;
    }
}

// Export hover utilities
export const HoverUtils = {
    /**
     * Create default hover manager
     */
    createManager(container, options = {}) {
        return new HoverManager(container, options);
    },
    
    /**
     * Create hover manager with custom tooltip
     */
    createWithTooltip(container, tooltipOptions = {}, options = {}) {
        return new HoverManager(container, {
            ...options,
            enableTooltips: true,
            tooltip: tooltipOptions
        });
    },
    
    /**
     * Create hover manager without tooltips
     */
    createWithoutTooltip(container, options = {}) {
        return new HoverManager(container, {
            ...options,
            enableTooltips: false
        });
    }
};

export default {
    HoverState,
    TooltipPosition,
    HoverItem,
    TooltipManager,
    HoverManager,
    HoverUtils
};