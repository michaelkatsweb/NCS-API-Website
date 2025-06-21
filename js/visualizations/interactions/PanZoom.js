/**
 * PanZoom Interaction Module for NCS-API-Website
 * Advanced pan and zoom controls for data visualizations
 * Supports mouse, touch, and keyboard interactions with smooth animations
 */

import { EventBus } from '../core/eventBusNew.js';

export class PanZoom {
    constructor(target, options = {}) {
        this.target = typeof target === 'string' ? document.getElementById(target) : target;
        
        if (!this.target) {
            throw new Error('Target element not found for PanZoom');
        }

        // Configuration options
        this.config = {
            // Zoom settings
            minZoom: options.minZoom || 0.1,
            maxZoom: options.maxZoom || 10,
            zoomStep: options.zoomStep || 0.1,
            wheelZoomFactor: options.wheelZoomFactor || 0.001,
            
            // Pan settings
            enablePan: options.enablePan !== false,
            enableZoom: options.enableZoom !== false,
            enableKeyboard: options.enableKeyboard !== false,
            enableTouch: options.enableTouch !== false,
            
            // Constraints
            boundaryConstraints: options.boundaryConstraints || null, // {minX, maxX, minY, maxY}
            centerOnInit: options.centerOnInit || false,
            
            // Animation
            enableSmoothTransitions: options.enableSmoothTransitions !== false,
            transitionDuration: options.transitionDuration || 300,
            easing: options.easing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            
            // Interaction
            panButton: options.panButton || 0, // 0 = left, 1 = middle, 2 = right
            allowPanOnScroll: options.allowPanOnScroll || false,
            invertZoom: options.invertZoom || false,
            
            // Touch gestures
            touchPanThreshold: options.touchPanThreshold || 10,
            touchZoomThreshold: options.touchZoomThreshold || 10,
            
            // Performance
            throttleDelay: options.throttleDelay || 16, // ~60fps
            useTransform3d: options.useTransform3d !== false,
            
            ...options
        };

        // Current transform state
        this.transform = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };

        // Interaction state
        this.state = {
            isDragging: false,
            isZooming: false,
            isAnimating: false,
            startPoint: { x: 0, y: 0 },
            lastPoint: { x: 0, y: 0 },
            startTransform: null,
            touches: new Map(),
            initialTouchDistance: 0,
            initialScale: 1
        };

        // Boundaries
        this.boundaries = null;
        this.contentBounds = null;

        // Event handlers (bound methods)
        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            wheel: this.handleWheel.bind(this),
            keyDown: this.handleKeyDown.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            contextMenu: this.handleContextMenu.bind(this),
            resize: this.handleResize.bind(this)
        };

        // Throttled handlers
        this.throttledMouseMove = this.throttle(this.boundHandlers.mouseMove, this.config.throttleDelay);
        this.throttledTouchMove = this.throttle(this.boundHandlers.touchMove, this.config.throttleDelay);

        // Initialize
        this.initialize();
    }

    /**
     * Initialize PanZoom functionality
     */
    initialize() {
        // Set up CSS for smooth transforms
        this.setupCSS();
        
        // Calculate initial boundaries
        this.updateBoundaries();
        
        // Center content if requested
        if (this.config.centerOnInit) {
            this.centerContent();
        }
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Initial transform application
        this.applyTransform();
        
        EventBus.emit('pan_zoom:initialized', {
            target: this.target,
            config: this.config,
            transform: this.transform
        });
    }

    /**
     * Setup CSS for optimal transform performance
     */
    setupCSS() {
        const style = this.target.style;
        style.transformOrigin = '0 0';
        style.userSelect = 'none';
        style.touchAction = 'none';
        
        if (this.config.enableSmoothTransitions) {
            style.transition = `transform ${this.config.transitionDuration}ms ${this.config.easing}`;
        }
        
        // Prevent image dragging
        this.target.draggable = false;
        
        // Add CSS class for styling
        this.target.classList.add('pan-zoom-container');
    }

    /**
     * Attach all event listeners
     */
    attachEventListeners() {
        const target = this.target;
        
        // Mouse events
        target.addEventListener('mousedown', this.boundHandlers.mouseDown, { passive: false });
        document.addEventListener('mousemove', this.throttledMouseMove, { passive: false });
        document.addEventListener('mouseup', this.boundHandlers.mouseUp, { passive: false });
        
        // Wheel events
        target.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        
        // Touch events
        if (this.config.enableTouch) {
            target.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
            target.addEventListener('touchmove', this.throttledTouchMove, { passive: false });
            target.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: false });
        }
        
        // Keyboard events
        if (this.config.enableKeyboard) {
            document.addEventListener('keydown', this.boundHandlers.keyDown);
        }
        
        // Context menu
        target.addEventListener('contextmenu', this.boundHandlers.contextMenu);
        
        // Window resize
        window.addEventListener('resize', this.boundHandlers.resize);
    }

    /**
     * Mouse down event handler
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        if (!this.config.enablePan || event.button !== this.config.panButton) {
            return;
        }
        
        event.preventDefault();
        
        this.state.isDragging = true;
        this.state.startPoint = this.getEventPoint(event);
        this.state.lastPoint = { ...this.state.startPoint };
        this.state.startTransform = { ...this.transform };
        
        // Disable transitions during drag
        this.setTransitionEnabled(false);
        
        // Change cursor
        this.target.style.cursor = 'grabbing';
        
        EventBus.emit('pan_zoom:pan_start', {
            point: this.state.startPoint,
            transform: this.transform
        });
    }

    /**
     * Mouse move event handler
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (!this.state.isDragging || !this.config.enablePan) {
            return;
        }
        
        event.preventDefault();
        
        const currentPoint = this.getEventPoint(event);
        const deltaX = currentPoint.x - this.state.startPoint.x;
        const deltaY = currentPoint.y - this.state.startPoint.y;
        
        // Calculate new translation
        const newTranslateX = this.state.startTransform.translateX + deltaX;
        const newTranslateY = this.state.startTransform.translateY + deltaY;
        
        // Apply constraints
        const constrainedTransform = this.applyConstraints({
            scale: this.transform.scale,
            translateX: newTranslateX,
            translateY: newTranslateY
        });
        
        this.setTransform(constrainedTransform);
        
        this.state.lastPoint = currentPoint;
        
        EventBus.emit('pan_zoom:pan_move', {
            point: currentPoint,
            delta: { x: deltaX, y: deltaY },
            transform: this.transform
        });
    }

    /**
     * Mouse up event handler
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (!this.state.isDragging) {
            return;
        }
        
        this.state.isDragging = false;
        
        // Re-enable transitions
        this.setTransitionEnabled(this.config.enableSmoothTransitions);
        
        // Reset cursor
        this.target.style.cursor = '';
        
        EventBus.emit('pan_zoom:pan_end', {
            point: this.getEventPoint(event),
            transform: this.transform
        });
    }

    /**
     * Wheel event handler for zooming
     * @param {WheelEvent} event - Wheel event
     */
    handleWheel(event) {
        if (!this.config.enableZoom) {
            return;
        }
        
        event.preventDefault();
        
        const point = this.getEventPoint(event);
        const delta = this.config.invertZoom ? event.deltaY : -event.deltaY;
        const zoomFactor = 1 + (delta * this.config.wheelZoomFactor);
        
        this.zoomAtPoint(point, zoomFactor);
        
        EventBus.emit('pan_zoom:zoom', {
            point,
            zoomFactor,
            transform: this.transform
        });
    }

    /**
     * Keyboard event handler
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!this.config.enableKeyboard || event.target !== document.body) {
            return;
        }
        
        const step = 50 / this.transform.scale; // Adjust step based on zoom level
        
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.pan(step, 0);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.pan(-step, 0);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.pan(0, step);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.pan(0, -step);
                break;
            case '+':
            case '=':
                event.preventDefault();
                this.zoomIn();
                break;
            case '-':
                event.preventDefault();
                this.zoomOut();
                break;
            case '0':
                event.preventDefault();
                this.reset();
                break;
            case 'Home':
                event.preventDefault();
                this.centerContent();
                break;
        }
    }

    /**
     * Touch start event handler
     * @param {TouchEvent} event - Touch event
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        // Store touch information
        Array.from(event.touches).forEach(touch => {
            this.state.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startTime: Date.now()
            });
        });
        
        if (event.touches.length === 1) {
            // Single touch - start panning
            this.state.isDragging = true;
            this.state.startPoint = this.getEventPoint(event.touches[0]);
            this.state.startTransform = { ...this.transform };
            this.setTransitionEnabled(false);
        } else if (event.touches.length === 2) {
            // Two touches - start zooming
            this.state.isDragging = false;
            this.state.isZooming = true;
            this.state.initialTouchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
            this.state.initialScale = this.transform.scale;
            this.setTransitionEnabled(false);
        }
        
        EventBus.emit('pan_zoom:touch_start', {
            touchCount: event.touches.length,
            transform: this.transform
        });
    }

    /**
     * Touch move event handler
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.state.isDragging) {
            // Single touch panning
            const currentPoint = this.getEventPoint(event.touches[0]);
            const deltaX = currentPoint.x - this.state.startPoint.x;
            const deltaY = currentPoint.y - this.state.startPoint.y;
            
            const newTranslateX = this.state.startTransform.translateX + deltaX;
            const newTranslateY = this.state.startTransform.translateY + deltaY;
            
            const constrainedTransform = this.applyConstraints({
                scale: this.transform.scale,
                translateX: newTranslateX,
                translateY: newTranslateY
            });
            
            this.setTransform(constrainedTransform);
        } else if (event.touches.length === 2 && this.state.isZooming) {
            // Two touch zooming
            const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
            const zoomFactor = currentDistance / this.state.initialTouchDistance;
            const newScale = this.state.initialScale * zoomFactor;
            
            // Get center point between touches
            const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            const centerPoint = this.screenToLocal({ x: centerX, y: centerY });
            
            this.setScale(newScale, centerPoint);
        }
    }

    /**
     * Touch end event handler
     * @param {TouchEvent} event - Touch event
     */
    handleTouchEnd(event) {
        // Remove ended touches
        Array.from(event.changedTouches).forEach(touch => {
            this.state.touches.delete(touch.identifier);
        });
        
        if (event.touches.length === 0) {
            // All touches ended
            this.state.isDragging = false;
            this.state.isZooming = false;
            this.setTransitionEnabled(this.config.enableSmoothTransitions);
        } else if (event.touches.length === 1 && this.state.isZooming) {
            // Switch from zoom to pan
            this.state.isZooming = false;
            this.state.isDragging = true;
            this.state.startPoint = this.getEventPoint(event.touches[0]);
            this.state.startTransform = { ...this.transform };
        }
        
        EventBus.emit('pan_zoom:touch_end', {
            touchCount: event.touches.length,
            transform: this.transform
        });
    }

    /**
     * Context menu handler
     * @param {Event} event - Context menu event
     */
    handleContextMenu(event) {
        if (this.state.isDragging || this.state.isZooming) {
            event.preventDefault();
        }
    }

    /**
     * Window resize handler
     */
    handleResize() {
        this.updateBoundaries();
        
        // Re-apply constraints
        const constrainedTransform = this.applyConstraints(this.transform);
        this.setTransform(constrainedTransform);
    }

    /**
     * Pan by specified amounts
     * @param {Number} deltaX - X offset
     * @param {Number} deltaY - Y offset
     * @param {Boolean} animate - Whether to animate
     */
    pan(deltaX, deltaY, animate = true) {
        if (!this.config.enablePan) return;
        
        const newTransform = {
            scale: this.transform.scale,
            translateX: this.transform.translateX + deltaX,
            translateY: this.transform.translateY + deltaY
        };
        
        const constrainedTransform = this.applyConstraints(newTransform);
        
        if (animate) {
            this.animateToTransform(constrainedTransform);
        } else {
            this.setTransform(constrainedTransform);
        }
    }

    /**
     * Zoom in by zoom step
     * @param {Object} center - Zoom center point (optional)
     */
    zoomIn(center = null) {
        const newScale = Math.min(this.config.maxZoom, this.transform.scale + this.config.zoomStep);
        this.setScale(newScale, center);
    }

    /**
     * Zoom out by zoom step
     * @param {Object} center - Zoom center point (optional)
     */
    zoomOut(center = null) {
        const newScale = Math.max(this.config.minZoom, this.transform.scale - this.config.zoomStep);
        this.setScale(newScale, center);
    }

    /**
     * Zoom to specific scale
     * @param {Number} scale - Target scale
     * @param {Object} center - Zoom center point (optional)
     */
    setScale(scale, center = null) {
        if (!this.config.enableZoom) return;
        
        const clampedScale = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, scale));
        
        if (center) {
            // Calculate translation to zoom around center point
            const scaleRatio = clampedScale / this.transform.scale;
            const newTranslateX = center.x - (center.x - this.transform.translateX) * scaleRatio;
            const newTranslateY = center.y - (center.y - this.transform.translateY) * scaleRatio;
            
            const newTransform = {
                scale: clampedScale,
                translateX: newTranslateX,
                translateY: newTranslateY
            };
            
            this.animateToTransform(this.applyConstraints(newTransform));
        } else {
            // Zoom from current center
            const currentCenter = this.getViewportCenter();
            this.setScale(clampedScale, currentCenter);
        }
    }

    /**
     * Zoom at specific point
     * @param {Object} point - Point to zoom at
     * @param {Number} zoomFactor - Zoom factor (1.1 = 10% zoom in)
     */
    zoomAtPoint(point, zoomFactor) {
        const newScale = this.transform.scale * zoomFactor;
        const localPoint = this.screenToLocal(point);
        this.setScale(newScale, localPoint);
    }

    /**
     * Zoom to fit content in viewport
     * @param {Object} contentBounds - Content boundaries (optional)
     * @param {Number} padding - Padding around content (optional)
     */
    zoomToFit(contentBounds = null, padding = 50) {
        const bounds = contentBounds || this.contentBounds || this.getContentBounds();
        if (!bounds) return;
        
        const viewport = this.getViewportBounds();
        
        // Calculate scale to fit content
        const scaleX = (viewport.width - padding * 2) / bounds.width;
        const scaleY = (viewport.height - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Calculate center position
        const centerX = viewport.width / 2 - (bounds.x + bounds.width / 2) * scale;
        const centerY = viewport.height / 2 - (bounds.y + bounds.height / 2) * scale;
        
        const newTransform = {
            scale: Math.max(this.config.minZoom, Math.min(this.config.maxZoom, scale)),
            translateX: centerX,
            translateY: centerY
        };
        
        this.animateToTransform(newTransform);
    }

    /**
     * Center content in viewport
     */
    centerContent() {
        const bounds = this.contentBounds || this.getContentBounds();
        if (!bounds) return;
        
        const viewport = this.getViewportBounds();
        const centerX = viewport.width / 2 - (bounds.x + bounds.width / 2) * this.transform.scale;
        const centerY = viewport.height / 2 - (bounds.y + bounds.height / 2) * this.transform.scale;
        
        const newTransform = {
            scale: this.transform.scale,
            translateX: centerX,
            translateY: centerY
        };
        
        this.animateToTransform(this.applyConstraints(newTransform));
    }

    /**
     * Reset to initial state
     */
    reset() {
        const newTransform = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        
        this.animateToTransform(newTransform);
    }

    /**
     * Set transform values
     * @param {Object} transform - Transform object
     */
    setTransform(transform) {
        this.transform = { ...transform };
        this.applyTransform();
        
        EventBus.emit('pan_zoom:transform_changed', {
            transform: this.transform
        });
    }

    /**
     * Apply current transform to target element
     */
    applyTransform() {
        const { scale, translateX, translateY } = this.transform;
        
        let transformString;
        if (this.config.useTransform3d) {
            transformString = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
        } else {
            transformString = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
        
        this.target.style.transform = transformString;
    }

    /**
     * Animate to target transform
     * @param {Object} targetTransform - Target transform
     */
    animateToTransform(targetTransform) {
        if (!this.config.enableSmoothTransitions) {
            this.setTransform(targetTransform);
            return;
        }
        
        this.state.isAnimating = true;
        this.setTransitionEnabled(true);
        
        // Set transform and wait for transition
        this.setTransform(targetTransform);
        
        // Reset animation state after transition
        setTimeout(() => {
            this.state.isAnimating = false;
        }, this.config.transitionDuration);
    }

    /**
     * Apply boundary constraints to transform
     * @param {Object} transform - Transform to constrain
     * @returns {Object} Constrained transform
     */
    applyConstraints(transform) {
        if (!this.config.boundaryConstraints) {
            return transform;
        }
        
        const bounds = this.config.boundaryConstraints;
        const viewport = this.getViewportBounds();
        
        // Calculate content bounds at new scale
        const scaledContentWidth = viewport.width / transform.scale;
        const scaledContentHeight = viewport.height / transform.scale;
        
        // Constrain translation
        let constrainedX = transform.translateX;
        let constrainedY = transform.translateY;
        
        // Left boundary
        if (bounds.minX !== undefined) {
            const maxTranslateX = -bounds.minX * transform.scale;
            constrainedX = Math.min(constrainedX, maxTranslateX);
        }
        
        // Right boundary
        if (bounds.maxX !== undefined) {
            const minTranslateX = viewport.width - bounds.maxX * transform.scale;
            constrainedX = Math.max(constrainedX, minTranslateX);
        }
        
        // Top boundary
        if (bounds.minY !== undefined) {
            const maxTranslateY = -bounds.minY * transform.scale;
            constrainedY = Math.min(constrainedY, maxTranslateY);
        }
        
        // Bottom boundary
        if (bounds.maxY !== undefined) {
            const minTranslateY = viewport.height - bounds.maxY * transform.scale;
            constrainedY = Math.max(constrainedY, minTranslateY);
        }
        
        return {
            scale: transform.scale,
            translateX: constrainedX,
            translateY: constrainedY
        };
    }

    /**
     * Utility methods
     */

    getEventPoint(event) {
        const rect = this.target.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    screenToLocal(point) {
        return {
            x: (point.x - this.transform.translateX) / this.transform.scale,
            y: (point.y - this.transform.translateY) / this.transform.scale
        };
    }

    localToScreen(point) {
        return {
            x: point.x * this.transform.scale + this.transform.translateX,
            y: point.y * this.transform.scale + this.transform.translateY
        };
    }

    getViewportCenter() {
        const viewport = this.getViewportBounds();
        return {
            x: viewport.width / 2,
            y: viewport.height / 2
        };
    }

    getViewportBounds() {
        return {
            x: 0,
            y: 0,
            width: this.target.clientWidth,
            height: this.target.clientHeight
        };
    }

    getContentBounds() {
        // This should be implemented based on the actual content
        // For now, return the viewport bounds
        return this.getViewportBounds();
    }

    updateBoundaries() {
        this.boundaries = this.getViewportBounds();
        this.contentBounds = this.getContentBounds();
    }

    setTransitionEnabled(enabled) {
        if (enabled && this.config.enableSmoothTransitions) {
            this.target.style.transition = `transform ${this.config.transitionDuration}ms ${this.config.easing}`;
        } else {
            this.target.style.transition = 'none';
        }
    }

    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Public API methods
     */

    /**
     * Get current transform values
     * @returns {Object} Current transform
     */
    getTransform() {
        return { ...this.transform };
    }

    /**
     * Set boundary constraints
     * @param {Object} bounds - Boundary constraints
     */
    setBoundaryConstraints(bounds) {
        this.config.boundaryConstraints = bounds;
        
        // Re-apply constraints to current transform
        const constrainedTransform = this.applyConstraints(this.transform);
        if (constrainedTransform !== this.transform) {
            this.animateToTransform(constrainedTransform);
        }
    }

    /**
     * Enable or disable interactions
     * @param {Object} options - Interaction options
     */
    setInteractionEnabled(options) {
        Object.assign(this.config, options);
    }

    /**
     * Get current zoom level as percentage
     * @returns {Number} Zoom percentage
     */
    getZoomPercentage() {
        return Math.round(this.transform.scale * 100);
    }

    /**
     * Check if currently interacting
     * @returns {Boolean} True if interacting
     */
    isInteracting() {
        return this.state.isDragging || this.state.isZooming || this.state.isAnimating;
    }

    /**
     * Destroy PanZoom instance
     */
    destroy() {
        // Remove event listeners
        const target = this.target;
        
        target.removeEventListener('mousedown', this.boundHandlers.mouseDown);
        document.removeEventListener('mousemove', this.throttledMouseMove);
        document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
        target.removeEventListener('wheel', this.boundHandlers.wheel);
        target.removeEventListener('touchstart', this.boundHandlers.touchStart);
        target.removeEventListener('touchmove', this.throttledTouchMove);
        target.removeEventListener('touchend', this.boundHandlers.touchEnd);
        document.removeEventListener('keydown', this.boundHandlers.keyDown);
        target.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        // Reset styles
        target.style.transform = '';
        target.style.transition = '';
        target.style.cursor = '';
        target.classList.remove('pan-zoom-container');
        
        // Clear state
        this.state.touches.clear();
        
        EventBus.emit('pan_zoom:destroyed', {
            target: this.target
        });
    }
}

export default PanZoom;