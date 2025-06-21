// File: Transitions.js
// Path: js/visualizations/animations/Transitions.js
// Smooth transitions utility for NCS-API-Website data visualizations
// Provides easing functions, transition states, and animation helpers

import { EventBus } from '../../core/eventBusNew.js';

/**
 * Easing functions for smooth animations
 */
export const EasingFunctions = {
    // Linear
    linear: t => t,
    
    // Quadratic
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // Cubic
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
    // Quartic
    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - (--t) * t * t * t,
    easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    
    // Quintic
    easeInQuint: t => t * t * t * t * t,
    easeOutQuint: t => 1 + (--t) * t * t * t * t,
    easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
    
    // Sine
    easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
    easeOutSine: t => Math.sin(t * Math.PI / 2),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    
    // Exponential
    easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: t => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    
    // Circular
    easeInCirc: t => 1 - Math.sqrt(1 - t * t),
    easeOutCirc: t => Math.sqrt(1 - (t - 1) * (t - 1)),
    easeInOutCirc: t => {
        if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2;
        return (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
    },
    
    // Back
    easeInBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    },
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutBack: t => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
    
    // Elastic
    easeInElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    easeOutElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeInOutElastic: t => {
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },
    
    // Bounce
    easeInBounce: t => 1 - EasingFunctions.easeOutBounce(1 - t),
    easeOutBounce: t => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },
    easeInOutBounce: t => t < 0.5
        ? (1 - EasingFunctions.easeOutBounce(1 - 2 * t)) / 2
        : (1 + EasingFunctions.easeOutBounce(2 * t - 1)) / 2
};

/**
 * Transition states enum
 */
export const TransitionState = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

/**
 * Main Transition class for handling smooth animations
 */
export class Transition {
    constructor(options = {}) {
        this.id = options.id || `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.duration = options.duration || 1000; // milliseconds
        this.delay = options.delay || 0;
        this.easing = options.easing || EasingFunctions.easeInOutCubic;
        this.repeat = options.repeat || 1;
        this.yoyo = options.yoyo || false; // reverse animation on alternate iterations
        this.autoStart = options.autoStart !== false;
        
        // Callbacks
        this.onStart = options.onStart || null;
        this.onUpdate = options.onUpdate || null;
        this.onComplete = options.onComplete || null;
        this.onRepeat = options.onRepeat || null;
        this.onYoyo = options.onYoyo || null;
        
        // Internal state
        this.state = TransitionState.IDLE;
        this.startTime = 0;
        this.pausedTime = 0;
        this.currentTime = 0;
        this.progress = 0;
        this.normalizedTime = 0;
        this.currentIteration = 0;
        this.isReversed = false;
        
        // Animation frame ID
        this.animationFrameId = null;
        
        // Properties to animate
        this.properties = new Map();
        
        // Auto-start if enabled
        if (this.autoStart) {
            this.start();
        }
    }
    
    /**
     * Add a property to animate
     * @param {Object} target - Target object
     * @param {string} property - Property name
     * @param {number} from - Starting value
     * @param {number} to - Ending value
     * @param {Function} setter - Optional custom setter function
     */
    addProperty(target, property, from, to, setter = null) {
        this.properties.set(property, {
            target,
            property,
            from,
            to,
            current: from,
            setter: setter || ((obj, prop, value) => obj[prop] = value)
        });
        return this;
    }
    
    /**
     * Start the transition
     */
    start() {
        if (this.state === TransitionState.RUNNING) return this;
        
        this.state = TransitionState.RUNNING;
        this.startTime = performance.now() + this.delay;
        this.currentIteration = 0;
        this.isReversed = false;
        
        if (this.onStart) {
            this.onStart(this);
        }
        
        EventBus.emit('transition:start', { transition: this });
        
        this.tick();
        return this;
    }
    
    /**
     * Pause the transition
     */
    pause() {
        if (this.state !== TransitionState.RUNNING) return this;
        
        this.state = TransitionState.PAUSED;
        this.pausedTime = performance.now();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        EventBus.emit('transition:pause', { transition: this });
        return this;
    }
    
    /**
     * Resume the transition
     */
    resume() {
        if (this.state !== TransitionState.PAUSED) return this;
        
        const pauseDuration = performance.now() - this.pausedTime;
        this.startTime += pauseDuration;
        this.state = TransitionState.RUNNING;
        
        this.tick();
        
        EventBus.emit('transition:resume', { transition: this });
        return this;
    }
    
    /**
     * Stop the transition
     */
    stop() {
        this.state = TransitionState.CANCELLED;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        EventBus.emit('transition:stop', { transition: this });
        return this;
    }
    
    /**
     * Set progress manually (0 to 1)
     */
    setProgress(progress) {
        this.progress = Math.max(0, Math.min(1, progress));
        this.updateProperties();
        return this;
    }
    
    /**
     * Animation tick function
     */
    tick() {
        if (this.state !== TransitionState.RUNNING) return;
        
        this.currentTime = performance.now();
        
        // Check if we should start (handle delay)
        if (this.currentTime < this.startTime) {
            this.animationFrameId = requestAnimationFrame(() => this.tick());
            return;
        }
        
        // Calculate progress
        const elapsed = this.currentTime - this.startTime;
        const iterationTime = elapsed % this.duration;
        this.normalizedTime = iterationTime / this.duration;
        
        // Handle yoyo effect
        if (this.yoyo && this.isReversed) {
            this.normalizedTime = 1 - this.normalizedTime;
        }
        
        // Apply easing
        this.progress = this.easing(this.normalizedTime);
        
        // Update properties
        this.updateProperties();
        
        // Call update callback
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        
        EventBus.emit('transition:update', { transition: this });
        
        // Check if iteration is complete
        if (elapsed >= this.duration) {
            this.currentIteration++;
            
            // Handle yoyo
            if (this.yoyo && this.currentIteration < this.repeat) {
                this.isReversed = !this.isReversed;
                if (this.onYoyo) {
                    this.onYoyo(this);
                }
            }
            
            // Check if all iterations are complete
            if (this.currentIteration >= this.repeat) {
                this.complete();
                return;
            }
            
            // Continue to next iteration
            this.startTime = this.currentTime;
            if (this.onRepeat) {
                this.onRepeat(this);
            }
        }
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(() => this.tick());
    }
    
    /**
     * Update all animated properties
     */
    updateProperties() {
        for (const [key, prop] of this.properties) {
            const value = prop.from + (prop.to - prop.from) * this.progress;
            prop.current = value;
            prop.setter(prop.target, prop.property, value);
        }
    }
    
    /**
     * Complete the transition
     */
    complete() {
        this.state = TransitionState.COMPLETED;
        this.progress = 1;
        this.updateProperties();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.onComplete) {
            this.onComplete(this);
        }
        
        EventBus.emit('transition:complete', { transition: this });
    }
    
    /**
     * Get current state information
     */
    getState() {
        return {
            id: this.id,
            state: this.state,
            progress: this.progress,
            normalizedTime: this.normalizedTime,
            currentIteration: this.currentIteration,
            isReversed: this.isReversed,
            remainingTime: Math.max(0, this.duration - (this.currentTime - this.startTime))
        };
    }
}

/**
 * Transition Manager for handling multiple transitions
 */
export class TransitionManager {
    constructor() {
        this.transitions = new Map();
        this.groups = new Map();
        this.globalTimeScale = 1.0;
    }
    
    /**
     * Create a new transition
     */
    create(options = {}) {
        const transition = new Transition({
            ...options,
            autoStart: false
        });
        
        this.transitions.set(transition.id, transition);
        return transition;
    }
    
    /**
     * Start a transition by ID
     */
    start(transitionId) {
        const transition = this.transitions.get(transitionId);
        if (transition) {
            transition.start();
        }
        return this;
    }
    
    /**
     * Start all transitions in a group
     */
    startGroup(groupName) {
        const group = this.groups.get(groupName);
        if (group) {
            group.forEach(transitionId => this.start(transitionId));
        }
        return this;
    }
    
    /**
     * Pause all transitions
     */
    pauseAll() {
        this.transitions.forEach(transition => {
            if (transition.state === TransitionState.RUNNING) {
                transition.pause();
            }
        });
        return this;
    }
    
    /**
     * Resume all transitions
     */
    resumeAll() {
        this.transitions.forEach(transition => {
            if (transition.state === TransitionState.PAUSED) {
                transition.resume();
            }
        });
        return this;
    }
    
    /**
     * Stop all transitions
     */
    stopAll() {
        this.transitions.forEach(transition => transition.stop());
        return this;
    }
    
    /**
     * Remove completed transitions
     */
    cleanup() {
        const toRemove = [];
        this.transitions.forEach((transition, id) => {
            if (transition.state === TransitionState.COMPLETED || 
                transition.state === TransitionState.CANCELLED) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => this.transitions.delete(id));
        return this;
    }
    
    /**
     * Add transition to a group
     */
    addToGroup(groupName, transitionId) {
        if (!this.groups.has(groupName)) {
            this.groups.set(groupName, new Set());
        }
        this.groups.get(groupName).add(transitionId);
        return this;
    }
    
    /**
     * Get all active transitions
     */
    getActiveTransitions() {
        return Array.from(this.transitions.values()).filter(
            t => t.state === TransitionState.RUNNING
        );
    }
    
    /**
     * Get transition statistics
     */
    getStats() {
        let running = 0, paused = 0, completed = 0, cancelled = 0;
        
        this.transitions.forEach(transition => {
            switch (transition.state) {
                case TransitionState.RUNNING: running++; break;
                case TransitionState.PAUSED: paused++; break;
                case TransitionState.COMPLETED: completed++; break;
                case TransitionState.CANCELLED: cancelled++; break;
            }
        });
        
        return {
            total: this.transitions.size,
            running,
            paused,
            completed,
            cancelled,
            groups: this.groups.size
        };
    }
}

/**
 * Utility functions for common transitions
 */
export const TransitionUtils = {
    /**
     * Fade in element
     */
    fadeIn(element, duration = 500, easing = EasingFunctions.easeOutCubic) {
        return new Transition({
            duration,
            easing,
            onUpdate: (transition) => {
                element.style.opacity = transition.progress;
            }
        }).addProperty(element.style, 'opacity', 0, 1);
    },
    
    /**
     * Fade out element
     */
    fadeOut(element, duration = 500, easing = EasingFunctions.easeInCubic) {
        return new Transition({
            duration,
            easing,
            onUpdate: (transition) => {
                element.style.opacity = 1 - transition.progress;
            }
        }).addProperty(element.style, 'opacity', 1, 0);
    },
    
    /**
     * Slide element
     */
    slide(element, fromX, toX, fromY, toY, duration = 800, easing = EasingFunctions.easeInOutCubic) {
        const transition = new Transition({ duration, easing });
        
        transition.addProperty(element.style, 'transform', 0, 1, (obj, prop, progress) => {
            const x = fromX + (toX - fromX) * progress;
            const y = fromY + (toY - fromY) * progress;
            obj.transform = `translate(${x}px, ${y}px)`;
        });
        
        return transition;
    },
    
    /**
     * Scale element
     */
    scale(element, fromScale, toScale, duration = 600, easing = EasingFunctions.easeOutBack) {
        const transition = new Transition({ duration, easing });
        
        transition.addProperty(element.style, 'transform', fromScale, toScale, (obj, prop, value) => {
            obj.transform = `scale(${value})`;
        });
        
        return transition;
    },
    
    /**
     * Animate numeric value
     */
    animateValue(from, to, duration, onUpdate, easing = EasingFunctions.easeInOutCubic) {
        return new Transition({
            duration,
            easing,
            onUpdate: (transition) => {
                const value = from + (to - from) * transition.progress;
                onUpdate(value, transition);
            }
        });
    }
};

// Create global transition manager instance
export const transitionManager = new TransitionManager();

// Export default transition manager
export default transitionManager;