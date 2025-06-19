// File: Selection.js
// Path: js/visualizations/interactions/Selection.js
// Data point selection system for NCS-API-Website interactive visualizations
// Handles single/multi-select, selection areas, and selection events

import { EventBus } from '../../core/eventBus.js';
import { calculateDistance } from '../../utils/math.js';

/**
 * Selection modes enum
 */
export const SelectionMode = {
    SINGLE: 'single',           // Select one item at a time
    MULTIPLE: 'multiple',       // Select multiple items
    ADDITIVE: 'additive',       // Add to existing selection
    SUBTRACTIVE: 'subtractive', // Remove from existing selection
    TOGGLE: 'toggle',           // Toggle selection state
    RANGE: 'range',             // Select range of items
    AREA: 'area',               // Select by area/region
    LASSO: 'lasso'             // Freeform lasso selection
};

/**
 * Selection tool types
 */
export const SelectionTool = {
    POINTER: 'pointer',         // Point and click selection
    RECTANGLE: 'rectangle',     // Rectangular selection
    CIRCLE: 'circle',          // Circular selection
    POLYGON: 'polygon',        // Polygon selection
    LASSO: 'lasso',           // Freeform lasso
    BRUSH: 'brush'            // Paint brush selection
};

/**
 * Selection state for individual items
 */
export class SelectionItem {
    constructor(id, data, position, metadata = {}) {
        this.id = id;
        this.data = data;
        this.position = position; // {x, y} coordinates
        this.metadata = metadata;
        this.selected = false;
        this.selectionTime = null;
        this.selectionOrder = -1;
    }
    
    /**
     * Select this item
     */
    select(order = 0) {
        this.selected = true;
        this.selectionTime = Date.now();
        this.selectionOrder = order;
        return this;
    }
    
    /**
     * Deselect this item
     */
    deselect() {
        this.selected = false;
        this.selectionTime = null;
        this.selectionOrder = -1;
        return this;
    }
    
    /**
     * Toggle selection state
     */
    toggle(order = 0) {
        if (this.selected) {
            this.deselect();
        } else {
            this.select(order);
        }
        return this;
    }
    
    /**
     * Check if point is within selection distance
     */
    isNearPoint(x, y, threshold = 5) {
        return calculateDistance(this.position.x, this.position.y, x, y) <= threshold;
    }
    
    /**
     * Check if item is within rectangular bounds
     */
    isInBounds(bounds) {
        const { x, y } = this.position;
        return x >= bounds.left && 
               x <= bounds.right && 
               y >= bounds.top && 
               y <= bounds.bottom;
    }
    
    /**
     * Check if item is within circular area
     */
    isInCircle(center, radius) {
        return calculateDistance(
            this.position.x, 
            this.position.y, 
            center.x, 
            center.y
        ) <= radius;
    }
    
    /**
     * Check if item is within polygon
     */
    isInPolygon(polygon) {
        const { x, y } = this.position;
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            
            if (((yi > y) !== (yj > y)) && 
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
}

/**
 * Selection area for area-based selection tools
 */
export class SelectionArea {
    constructor(tool = SelectionTool.RECTANGLE) {
        this.tool = tool;
        this.active = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.points = []; // For polygon/lasso tools
        this.bounds = null;
        this.center = null;
        this.radius = 0;
    }
    
    /**
     * Start area selection
     */
    start(x, y) {
        this.active = true;
        this.startPoint = { x, y };
        this.currentPoint = { x, y };
        this.points = [{ x, y }];
        this.updateBounds();
        return this;
    }
    
    /**
     * Update current point
     */
    update(x, y) {
        if (!this.active) return this;
        
        this.currentPoint = { x, y };
        
        if (this.tool === SelectionTool.LASSO || this.tool === SelectionTool.POLYGON) {
            this.points.push({ x, y });
        }
        
        this.updateBounds();
        return this;
    }
    
    /**
     * End area selection
     */
    end() {
        this.active = false;
        this.updateBounds();
        return this;
    }
    
    /**
     * Clear selection area
     */
    clear() {
        this.active = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.points = [];
        this.bounds = null;
        this.center = null;
        this.radius = 0;
        return this;
    }
    
    /**
     * Update bounds based on tool type
     */
    updateBounds() {
        if (!this.startPoint || !this.currentPoint) return;
        
        switch (this.tool) {
            case SelectionTool.RECTANGLE:
                this.bounds = {
                    left: Math.min(this.startPoint.x, this.currentPoint.x),
                    right: Math.max(this.startPoint.x, this.currentPoint.x),
                    top: Math.min(this.startPoint.y, this.currentPoint.y),
                    bottom: Math.max(this.startPoint.y, this.currentPoint.y)
                };
                break;
                
            case SelectionTool.CIRCLE:
                this.center = this.startPoint;
                this.radius = calculateDistance(
                    this.startPoint.x, 
                    this.startPoint.y,
                    this.currentPoint.x, 
                    this.currentPoint.y
                );
                this.bounds = {
                    left: this.center.x - this.radius,
                    right: this.center.x + this.radius,
                    top: this.center.y - this.radius,
                    bottom: this.center.y + this.radius
                };
                break;
                
            case SelectionTool.POLYGON:
            case SelectionTool.LASSO:
                if (this.points.length > 0) {
                    let minX = this.points[0].x;
                    let maxX = this.points[0].x;
                    let minY = this.points[0].y;
                    let maxY = this.points[0].y;
                    
                    for (const point of this.points) {
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minY = Math.min(minY, point.y);
                        maxY = Math.max(maxY, point.y);
                    }
                    
                    this.bounds = {
                        left: minX,
                        right: maxX,
                        top: minY,
                        bottom: maxY
                    };
                }
                break;
        }
    }
    
    /**
     * Check if item is within this selection area
     */
    containsItem(item) {
        if (!this.bounds) return false;
        
        switch (this.tool) {
            case SelectionTool.RECTANGLE:
                return item.isInBounds(this.bounds);
                
            case SelectionTool.CIRCLE:
                return item.isInCircle(this.center, this.radius);
                
            case SelectionTool.POLYGON:
            case SelectionTool.LASSO:
                return item.isInPolygon(this.points);
                
            default:
                return false;
        }
    }
    
    /**
     * Get selection area path for rendering
     */
    getPath() {
        switch (this.tool) {
            case SelectionTool.RECTANGLE:
                return this.bounds ? [
                    { x: this.bounds.left, y: this.bounds.top },
                    { x: this.bounds.right, y: this.bounds.top },
                    { x: this.bounds.right, y: this.bounds.bottom },
                    { x: this.bounds.left, y: this.bounds.bottom }
                ] : [];
                
            case SelectionTool.CIRCLE:
                return this.center ? {
                    center: this.center,
                    radius: this.radius
                } : null;
                
            case SelectionTool.POLYGON:
            case SelectionTool.LASSO:
                return this.points;
                
            default:
                return [];
        }
    }
}

/**
 * Main Selection Manager class
 */
export class SelectionManager {
    constructor(options = {}) {
        this.mode = options.mode || SelectionMode.SINGLE;
        this.tool = options.tool || SelectionTool.POINTER;
        this.maxSelections = options.maxSelections || -1; // -1 for unlimited
        this.selectThreshold = options.selectThreshold || 5; // pixels
        this.allowEmptySelection = options.allowEmptySelection !== false;
        
        // Selection state
        this.items = new Map();
        this.selectedItems = new Map();
        this.selectionOrder = 0;
        this.lastSelectedItem = null;
        
        // Area selection
        this.selectionArea = new SelectionArea(this.tool);
        this.areaSelectionActive = false;
        
        // Event handling
        this.enabled = true;
        this.keyModifiers = {
            ctrl: false,
            shift: false,
            alt: false
        };
        
        // Callbacks
        this.onSelectionChange = options.onSelectionChange || null;
        this.onItemSelect = options.onItemSelect || null;
        this.onItemDeselect = options.onItemDeselect || null;
        this.onAreaSelectionStart = options.onAreaSelectionStart || null;
        this.onAreaSelectionUpdate = options.onAreaSelectionUpdate || null;
        this.onAreaSelectionEnd = options.onAreaSelectionEnd || null;
        
        // Performance optimization
        this.spatialIndex = new Map(); // For fast spatial queries
        this.spatialResolution = options.spatialResolution || 50;
        
        this.id = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Add an item to the selection manager
     */
    addItem(id, data, position, metadata = {}) {
        const item = new SelectionItem(id, data, position, metadata);
        this.items.set(id, item);
        this.updateSpatialIndex(item);
        return item;
    }
    
    /**
     * Remove an item from selection manager
     */
    removeItem(id) {
        const item = this.items.get(id);
        if (item) {
            if (item.selected) {
                this.deselectItem(id);
            }
            this.items.delete(id);
            this.removeSpatialIndex(item);
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
     * Clear all items
     */
    clearItems() {
        this.clearSelection();
        this.items.clear();
        this.spatialIndex.clear();
        return this;
    }
    
    /**
     * Select item by ID
     */
    selectItem(id, additive = false) {
        if (!this.enabled) return this;
        
        const item = this.items.get(id);
        if (!item) return this;
        
        // Handle selection modes
        if (!additive && this.mode === SelectionMode.SINGLE) {
            this.clearSelection();
        }
        
        // Check max selections limit
        if (this.maxSelections > 0 && 
            this.selectedItems.size >= this.maxSelections && 
            !item.selected) {
            return this;
        }
        
        // Select the item
        if (!item.selected) {
            item.select(this.selectionOrder++);
            this.selectedItems.set(id, item);
            this.lastSelectedItem = item;
            
            if (this.onItemSelect) {
                this.onItemSelect(item);
            }
            
            EventBus.emit('selection:item:select', { 
                manager: this, 
                item, 
                selectedCount: this.selectedItems.size 
            });
            
            this.notifySelectionChange();
        }
        
        return this;
    }
    
    /**
     * Deselect item by ID
     */
    deselectItem(id) {
        const item = this.items.get(id);
        if (!item || !item.selected) return this;
        
        item.deselect();
        this.selectedItems.delete(id);
        
        if (this.lastSelectedItem === item) {
            this.lastSelectedItem = this.selectedItems.size > 0 ? 
                Array.from(this.selectedItems.values()).pop() : null;
        }
        
        if (this.onItemDeselect) {
            this.onItemDeselect(item);
        }
        
        EventBus.emit('selection:item:deselect', { 
            manager: this, 
            item, 
            selectedCount: this.selectedItems.size 
        });
        
        this.notifySelectionChange();
        return this;
    }
    
    /**
     * Toggle item selection
     */
    toggleItem(id) {
        const item = this.items.get(id);
        if (!item) return this;
        
        if (item.selected) {
            this.deselectItem(id);
        } else {
            this.selectItem(id, true);
        }
        
        return this;
    }
    
    /**
     * Clear all selections
     */
    clearSelection() {
        const selectedIds = Array.from(this.selectedItems.keys());
        
        for (const id of selectedIds) {
            this.deselectItem(id);
        }
        
        this.selectionOrder = 0;
        this.lastSelectedItem = null;
        
        EventBus.emit('selection:clear', { manager: this });
        return this;
    }
    
    /**
     * Select all items
     */
    selectAll() {
        if (!this.enabled) return this;
        
        for (const [id, item] of this.items) {
            if (!item.selected) {
                this.selectItem(id, true);
            }
        }
        
        return this;
    }
    
    /**
     * Invert selection
     */
    invertSelection() {
        if (!this.enabled) return this;
        
        for (const [id, item] of this.items) {
            this.toggleItem(id);
        }
        
        return this;
    }
    
    /**
     * Handle click selection
     */
    handleClick(x, y, modifiers = {}) {
        if (!this.enabled) return this;
        
        this.updateModifiers(modifiers);
        
        // Find item at click position
        const item = this.getItemAtPosition(x, y);
        
        if (item) {
            const additive = this.keyModifiers.ctrl || 
                           this.keyModifiers.shift || 
                           this.mode === SelectionMode.MULTIPLE;
            
            if (this.mode === SelectionMode.TOGGLE || this.keyModifiers.ctrl) {
                this.toggleItem(item.id);
            } else {
                this.selectItem(item.id, additive);
            }
        } else if (this.allowEmptySelection) {
            if (!this.keyModifiers.ctrl && !this.keyModifiers.shift) {
                this.clearSelection();
            }
        }
        
        return this;
    }
    
    /**
     * Start area selection
     */
    startAreaSelection(x, y, tool = null) {
        if (!this.enabled) return this;
        
        if (tool) {
            this.selectionArea.tool = tool;
        }
        
        this.areaSelectionActive = true;
        this.selectionArea.start(x, y);
        
        if (this.onAreaSelectionStart) {
            this.onAreaSelectionStart(this.selectionArea);
        }
        
        EventBus.emit('selection:area:start', { 
            manager: this, 
            area: this.selectionArea 
        });
        
        return this;
    }
    
    /**
     * Update area selection
     */
    updateAreaSelection(x, y) {
        if (!this.enabled || !this.areaSelectionActive) return this;
        
        this.selectionArea.update(x, y);
        
        if (this.onAreaSelectionUpdate) {
            this.onAreaSelectionUpdate(this.selectionArea);
        }
        
        EventBus.emit('selection:area:update', { 
            manager: this, 
            area: this.selectionArea 
        });
        
        return this;
    }
    
    /**
     * End area selection
     */
    endAreaSelection(additive = false) {
        if (!this.enabled || !this.areaSelectionActive) return this;
        
        this.areaSelectionActive = false;
        this.selectionArea.end();
        
        // Select items within area
        if (!additive && this.mode === SelectionMode.SINGLE) {
            this.clearSelection();
        }
        
        const itemsInArea = this.getItemsInArea(this.selectionArea);
        for (const item of itemsInArea) {
            this.selectItem(item.id, true);
        }
        
        if (this.onAreaSelectionEnd) {
            this.onAreaSelectionEnd(this.selectionArea, itemsInArea);
        }
        
        EventBus.emit('selection:area:end', { 
            manager: this, 
            area: this.selectionArea,
            selectedItems: itemsInArea
        });
        
        this.selectionArea.clear();
        return this;
    }
    
    /**
     * Get item at specific position
     */
    getItemAtPosition(x, y) {
        // Use spatial index for performance
        const candidates = this.getSpatialCandidates(x, y);
        
        let closestItem = null;
        let closestDistance = this.selectThreshold;
        
        for (const item of candidates) {
            const distance = calculateDistance(
                item.position.x, 
                item.position.y, 
                x, 
                y
            );
            
            if (distance <= this.selectThreshold && distance < closestDistance) {
                closestItem = item;
                closestDistance = distance;
            }
        }
        
        return closestItem;
    }
    
    /**
     * Get items within selection area
     */
    getItemsInArea(area) {
        const itemsInArea = [];
        
        // Use spatial index for performance
        if (area.bounds) {
            const candidates = this.getSpatialCandidatesInBounds(area.bounds);
            
            for (const item of candidates) {
                if (area.containsItem(item)) {
                    itemsInArea.push(item);
                }
            }
        }
        
        return itemsInArea;
    }
    
    /**
     * Update spatial index for fast spatial queries
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
     * Remove item from spatial index
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
        const gridRadius = Math.ceil(this.selectThreshold / this.spatialResolution);
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
     * Get spatial candidates within bounds
     */
    getSpatialCandidatesInBounds(bounds) {
        const candidates = new Set();
        const minGridX = Math.floor(bounds.left / this.spatialResolution);
        const maxGridX = Math.floor(bounds.right / this.spatialResolution);
        const minGridY = Math.floor(bounds.top / this.spatialResolution);
        const maxGridY = Math.floor(bounds.bottom / this.spatialResolution);
        
        for (let gx = minGridX; gx <= maxGridX; gx++) {
            for (let gy = minGridY; gy <= maxGridY; gy++) {
                const key = `${gx},${gy}`;
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
     * Update keyboard modifiers
     */
    updateModifiers(modifiers) {
        this.keyModifiers = {
            ctrl: modifiers.ctrlKey || false,
            shift: modifiers.shiftKey || false,
            alt: modifiers.altKey || false
        };
    }
    
    /**
     * Notify selection change
     */
    notifySelectionChange() {
        const selectedItems = Array.from(this.selectedItems.values());
        
        if (this.onSelectionChange) {
            this.onSelectionChange(selectedItems, this);
        }
        
        EventBus.emit('selection:change', { 
            manager: this, 
            selectedItems,
            count: selectedItems.length
        });
    }
    
    /**
     * Get selection statistics
     */
    getStats() {
        return {
            totalItems: this.items.size,
            selectedItems: this.selectedItems.size,
            selectionMode: this.mode,
            selectionTool: this.tool,
            enabled: this.enabled,
            lastSelectedItem: this.lastSelectedItem?.id || null,
            spatialIndexSize: this.spatialIndex.size
        };
    }
    
    /**
     * Get selected items data
     */
    getSelectedData() {
        return Array.from(this.selectedItems.values()).map(item => ({
            id: item.id,
            data: item.data,
            position: item.position,
            metadata: item.metadata,
            selectionTime: item.selectionTime,
            selectionOrder: item.selectionOrder
        }));
    }
    
    /**
     * Set selection mode
     */
    setMode(mode) {
        this.mode = mode;
        EventBus.emit('selection:mode:change', { manager: this, mode });
        return this;
    }
    
    /**
     * Set selection tool
     */
    setTool(tool) {
        this.tool = tool;
        this.selectionArea.tool = tool;
        EventBus.emit('selection:tool:change', { manager: this, tool });
        return this;
    }
    
    /**
     * Enable/disable selection
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.clearSelection();
        }
        EventBus.emit('selection:enabled:change', { manager: this, enabled });
        return this;
    }
}

// Export selection utilities
export const SelectionUtils = {
    /**
     * Create default selection manager
     */
    createManager(options = {}) {
        return new SelectionManager(options);
    },
    
    /**
     * Create multi-select manager
     */
    createMultiSelectManager(options = {}) {
        return new SelectionManager({
            mode: SelectionMode.MULTIPLE,
            ...options
        });
    },
    
    /**
     * Create area selection manager
     */
    createAreaSelectManager(tool = SelectionTool.RECTANGLE, options = {}) {
        return new SelectionManager({
            tool,
            mode: SelectionMode.MULTIPLE,
            ...options
        });
    }
};

export default {
    SelectionMode,
    SelectionTool,
    SelectionItem,
    SelectionArea,
    SelectionManager,
    SelectionUtils
};