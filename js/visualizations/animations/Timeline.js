// File: Timeline.js
// Path: js/visualizations/animations/Timeline.js
// Animation timeline management for NCS-API-Website complex animations
// Coordinates multiple animations, keyframes, and animation sequences

import { EventBus } from '../core/eventBusNew.js';
import { EasingFunctions } from './Transitions.js';
import { interpolator } from './Interpolation.js';

/**
 * Keyframe class for defining animation states
 */
export class Keyframe {
    constructor(time, values, easing = EasingFunctions.linear) {
        this.time = time; // Time in timeline (0-1 or absolute time)
        this.values = values; // Object containing property values
        this.easing = easing; // Easing function for transition to this keyframe
        this.id = `keyframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Clone this keyframe
     */
    clone() {
        return new Keyframe(this.time, { ...this.values }, this.easing);
    }
    
    /**
     * Get value for a specific property
     */
    getValue(property) {
        return this.values[property];
    }
    
    /**
     * Set value for a specific property
     */
    setValue(property, value) {
        this.values[property] = value;
        return this;
    }
}

/**
 * Animation track for a single property
 */
export class AnimationTrack {
    constructor(property, target = null) {
        this.property = property;
        this.target = target;
        this.keyframes = [];
        this.interpolationMethod = 'linear';
        this.id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Add a keyframe to this track
     */
    addKeyframe(time, value, easing = EasingFunctions.linear) {
        const keyframe = new Keyframe(time, { [this.property]: value }, easing);
        
        // Insert keyframe in chronological order
        let inserted = false;
        for (let i = 0; i < this.keyframes.length; i++) {
            if (this.keyframes[i].time > time) {
                this.keyframes.splice(i, 0, keyframe);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.keyframes.push(keyframe);
        }
        
        return keyframe;
    }
    
    /**
     * Remove a keyframe
     */
    removeKeyframe(keyframe) {
        const index = this.keyframes.indexOf(keyframe);
        if (index !== -1) {
            this.keyframes.splice(index, 1);
        }
        return this;
    }
    
    /**
     * Get value at specific time
     */
    getValueAtTime(time) {
        if (this.keyframes.length === 0) return undefined;
        if (this.keyframes.length === 1) return this.keyframes[0].getValue(this.property);
        
        // Find surrounding keyframes
        let beforeKeyframe = null;
        let afterKeyframe = null;
        
        for (let i = 0; i < this.keyframes.length; i++) {
            const keyframe = this.keyframes[i];
            
            if (keyframe.time <= time) {
                beforeKeyframe = keyframe;
            }
            
            if (keyframe.time >= time && !afterKeyframe) {
                afterKeyframe = keyframe;
                break;
            }
        }
        
        // Handle edge cases
        if (!beforeKeyframe) return afterKeyframe.getValue(this.property);
        if (!afterKeyframe) return beforeKeyframe.getValue(this.property);
        if (beforeKeyframe === afterKeyframe) return beforeKeyframe.getValue(this.property);
        
        // Calculate interpolation
        const segmentDuration = afterKeyframe.time - beforeKeyframe.time;
        const localTime = (time - beforeKeyframe.time) / segmentDuration;
        const easedTime = afterKeyframe.easing(localTime);
        
        const startValue = beforeKeyframe.getValue(this.property);
        const endValue = afterKeyframe.getValue(this.property);
        
        return interpolator.interpolate(startValue, endValue, easedTime, this.interpolationMethod);
    }
    
    /**
     * Get all keyframe times
     */
    getKeyframeTimes() {
        return this.keyframes.map(kf => kf.time);
    }
    
    /**
     * Set interpolation method
     */
    setInterpolationMethod(method) {
        this.interpolationMethod = method;
        return this;
    }
}

/**
 * Animation layer for grouping related tracks
 */
export class AnimationLayer {
    constructor(name = 'Layer') {
        this.name = name;
        this.tracks = new Map();
        this.enabled = true;
        this.opacity = 1.0;
        this.timeOffset = 0;
        this.timeScale = 1.0;
        this.id = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Add or get a track for a property
     */
    getTrack(property, target = null) {
        if (!this.tracks.has(property)) {
            this.tracks.set(property, new AnimationTrack(property, target));
        }
        return this.tracks.get(property);
    }
    
    /**
     * Remove a track
     */
    removeTrack(property) {
        this.tracks.delete(property);
        return this;
    }
    
    /**
     * Get values for all tracks at specific time
     */
    getValuesAtTime(time) {
        if (!this.enabled) return {};
        
        const adjustedTime = (time - this.timeOffset) * this.timeScale;
        const values = {};
        
        for (const [property, track] of this.tracks) {
            const value = track.getValueAtTime(adjustedTime);
            if (value !== undefined) {
                values[property] = value;
            }
        }
        
        return values;
    }
    
    /**
     * Get duration of this layer
     */
    getDuration() {
        let maxTime = 0;
        for (const [, track] of this.tracks) {
            const times = track.getKeyframeTimes();
            if (times.length > 0) {
                maxTime = Math.max(maxTime, Math.max(...times));
            }
        }
        return maxTime;
    }
    
    /**
     * Enable/disable layer
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        return this;
    }
    
    /**
     * Set layer opacity
     */
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        return this;
    }
}

/**
 * Timeline playback states
 */
export const TimelineState = {
    STOPPED: 'stopped',
    PLAYING: 'playing',
    PAUSED: 'paused',
    SEEKING: 'seeking'
};

/**
 * Main Timeline class
 */
export class Timeline {
    constructor(options = {}) {
        this.duration = options.duration || 10000; // milliseconds
        this.frameRate = options.frameRate || 60;
        this.loop = options.loop || false;
        this.autoPlay = options.autoPlay || false;
        
        // Playback state
        this.state = TimelineState.STOPPED;
        this.currentTime = 0;
        this.playbackSpeed = 1.0;
        this.startTime = 0;
        this.pausedTime = 0;
        
        // Animation layers
        this.layers = new Map();
        this.layerOrder = [];
        
        // Callbacks
        this.onUpdate = options.onUpdate || null;
        this.onComplete = options.onComplete || null;
        this.onLoop = options.onLoop || null;
        this.onStart = options.onStart || null;
        this.onPause = options.onPause || null;
        this.onResume = options.onResume || null;
        this.onStop = options.onStop || null;
        
        // Markers and regions
        this.markers = new Map();
        this.regions = new Map();
        
        // Animation frame management
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsHistory = [];
        this.lastFpsUpdate = 0;
        
        this.id = `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (this.autoPlay) {
            this.play();
        }
    }
    
    /**
     * Add or get a layer
     */
    getLayer(name) {
        if (!this.layers.has(name)) {
            const layer = new AnimationLayer(name);
            this.layers.set(name, layer);
            this.layerOrder.push(name);
        }
        return this.layers.get(name);
    }
    
    /**
     * Remove a layer
     */
    removeLayer(name) {
        this.layers.delete(name);
        const index = this.layerOrder.indexOf(name);
        if (index !== -1) {
            this.layerOrder.splice(index, 1);
        }
        return this;
    }
    
    /**
     * Reorder layers
     */
    setLayerOrder(order) {
        this.layerOrder = order.filter(name => this.layers.has(name));
        return this;
    }
    
    /**
     * Add a keyframe to a specific layer and property
     */
    addKeyframe(layerName, property, time, value, easing = EasingFunctions.linear) {
        const layer = this.getLayer(layerName);
        const track = layer.getTrack(property);
        return track.addKeyframe(time, value, easing);
    }
    
    /**
     * Add a marker at specific time
     */
    addMarker(name, time, data = {}) {
        this.markers.set(name, { time, data });
        return this;
    }
    
    /**
     * Add a time region
     */
    addRegion(name, startTime, endTime, data = {}) {
        this.regions.set(name, { startTime, endTime, data });
        return this;
    }
    
    /**
     * Start playback
     */
    play() {
        if (this.state === TimelineState.PLAYING) return this;
        
        if (this.state === TimelineState.PAUSED) {
            // Resume from pause
            const pauseDuration = performance.now() - this.pausedTime;
            this.startTime += pauseDuration;
        } else {
            // Start from beginning or current time
            this.startTime = performance.now() - this.currentTime / this.playbackSpeed;
        }
        
        this.state = TimelineState.PLAYING;
        this.lastFrameTime = performance.now();
        
        if (this.onStart) {
            this.onStart(this);
        }
        
        EventBus.emit('timeline:play', { timeline: this });
        
        this.tick();
        return this;
    }
    
    /**
     * Pause playback
     */
    pause() {
        if (this.state !== TimelineState.PLAYING) return this;
        
        this.state = TimelineState.PAUSED;
        this.pausedTime = performance.now();
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.onPause) {
            this.onPause(this);
        }
        
        EventBus.emit('timeline:pause', { timeline: this });
        return this;
    }
    
    /**
     * Stop playback
     */
    stop() {
        this.state = TimelineState.STOPPED;
        this.currentTime = 0;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.updateValues();
        
        if (this.onStop) {
            this.onStop(this);
        }
        
        EventBus.emit('timeline:stop', { timeline: this });
        return this;
    }
    
    /**
     * Seek to specific time
     */
    seek(time) {
        this.currentTime = Math.max(0, Math.min(this.duration, time));
        
        if (this.state === TimelineState.PLAYING) {
            this.startTime = performance.now() - this.currentTime / this.playbackSpeed;
        }
        
        this.updateValues();
        
        EventBus.emit('timeline:seek', { timeline: this, time: this.currentTime });
        return this;
    }
    
    /**
     * Set playback speed
     */
    setPlaybackSpeed(speed) {
        if (this.state === TimelineState.PLAYING) {
            // Adjust start time to maintain current position
            this.startTime = performance.now() - this.currentTime / speed;
        }
        
        this.playbackSpeed = speed;
        return this;
    }
    
    /**
     * Animation tick function
     */
    tick() {
        if (this.state !== TimelineState.PLAYING) return;
        
        const now = performance.now();
        
        // Calculate current time
        this.currentTime = (now - this.startTime) * this.playbackSpeed;
        
        // Check for completion
        if (this.currentTime >= this.duration) {
            if (this.loop) {
                this.currentTime = this.currentTime % this.duration;
                this.startTime = now - this.currentTime / this.playbackSpeed;
                
                if (this.onLoop) {
                    this.onLoop(this);
                }
                
                EventBus.emit('timeline:loop', { timeline: this });
            } else {
                this.currentTime = this.duration;
                this.state = TimelineState.STOPPED;
                
                this.updateValues();
                
                if (this.onComplete) {
                    this.onComplete(this);
                }
                
                EventBus.emit('timeline:complete', { timeline: this });
                return;
            }
        }
        
        // Update values
        this.updateValues();
        
        // Performance monitoring
        this.updateFPS(now);
        
        // Continue animation
        this.animationFrameId = requestAnimationFrame(() => this.tick());
    }
    
    /**
     * Update all animated values
     */
    updateValues() {
        const normalizedTime = this.currentTime / this.duration;
        const allValues = {};
        
        // Collect values from all layers
        for (const layerName of this.layerOrder) {
            const layer = this.layers.get(layerName);
            if (layer && layer.enabled) {
                const layerValues = layer.getValuesAtTime(normalizedTime);
                
                // Apply layer opacity
                if (layer.opacity < 1.0) {
                    for (const [property, value] of Object.entries(layerValues)) {
                        if (typeof value === 'number') {
                            layerValues[property] = value * layer.opacity;
                        }
                    }
                }
                
                Object.assign(allValues, layerValues);
            }
        }
        
        // Check for marker hits
        this.checkMarkers();
        
        // Call update callback
        if (this.onUpdate) {
            this.onUpdate(this, allValues, normalizedTime);
        }
        
        EventBus.emit('timeline:update', { 
            timeline: this, 
            values: allValues, 
            time: this.currentTime,
            normalizedTime
        });
    }
    
    /**
     * Check if we've hit any markers
     */
    checkMarkers() {
        const tolerance = 1000 / this.frameRate; // One frame tolerance
        
        for (const [name, marker] of this.markers) {
            const markerTime = marker.time * this.duration;
            
            if (Math.abs(this.currentTime - markerTime) <= tolerance) {
                EventBus.emit('timeline:marker', { 
                    timeline: this, 
                    marker: name, 
                    data: marker.data 
                });
            }
        }
    }
    
    /**
     * Update FPS monitoring
     */
    updateFPS(now) {
        this.frameCount++;
        
        if (now - this.lastFpsUpdate >= 1000) {
            const fps = this.frameCount;
            this.fpsHistory.push(fps);
            
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            EventBus.emit('timeline:fps', { timeline: this, fps, history: this.fpsHistory });
        }
    }
    
    /**
     * Get current playback statistics
     */
    getStats() {
        const avgFps = this.fpsHistory.length > 0 ? 
            this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length : 0;
        
        return {
            state: this.state,
            currentTime: this.currentTime,
            duration: this.duration,
            progress: this.currentTime / this.duration,
            playbackSpeed: this.playbackSpeed,
            fps: avgFps,
            layerCount: this.layers.size,
            markerCount: this.markers.size,
            regionCount: this.regions.size
        };
    }
    
    /**
     * Export timeline data
     */
    export() {
        const data = {
            duration: this.duration,
            frameRate: this.frameRate,
            loop: this.loop,
            layers: {},
            markers: Object.fromEntries(this.markers),
            regions: Object.fromEntries(this.regions),
            layerOrder: this.layerOrder
        };
        
        for (const [name, layer] of this.layers) {
            data.layers[name] = {
                enabled: layer.enabled,
                opacity: layer.opacity,
                timeOffset: layer.timeOffset,
                timeScale: layer.timeScale,
                tracks: {}
            };
            
            for (const [property, track] of layer.tracks) {
                data.layers[name].tracks[property] = {
                    interpolationMethod: track.interpolationMethod,
                    keyframes: track.keyframes.map(kf => ({
                        time: kf.time,
                        values: kf.values,
                        easing: kf.easing.name || 'custom'
                    }))
                };
            }
        }
        
        return data;
    }
    
    /**
     * Import timeline data
     */
    import(data) {
        this.stop();
        
        this.duration = data.duration || 10000;
        this.frameRate = data.frameRate || 60;
        this.loop = data.loop || false;
        
        // Clear existing data
        this.layers.clear();
        this.layerOrder = [];
        this.markers.clear();
        this.regions.clear();
        
        // Import layers
        if (data.layers) {
            this.layerOrder = data.layerOrder || Object.keys(data.layers);
            
            for (const [layerName, layerData] of Object.entries(data.layers)) {
                const layer = this.getLayer(layerName);
                layer.enabled = layerData.enabled !== false;
                layer.opacity = layerData.opacity || 1.0;
                layer.timeOffset = layerData.timeOffset || 0;
                layer.timeScale = layerData.timeScale || 1.0;
                
                if (layerData.tracks) {
                    for (const [property, trackData] of Object.entries(layerData.tracks)) {
                        const track = layer.getTrack(property);
                        track.interpolationMethod = trackData.interpolationMethod || 'linear';
                        
                        if (trackData.keyframes) {
                            for (const kfData of trackData.keyframes) {
                                const easing = EasingFunctions[kfData.easing] || EasingFunctions.linear;
                                const keyframe = new Keyframe(kfData.time, kfData.values, easing);
                                track.keyframes.push(keyframe);
                            }
                        }
                    }
                }
            }
        }
        
        // Import markers and regions
        if (data.markers) {
            this.markers = new Map(Object.entries(data.markers));
        }
        if (data.regions) {
            this.regions = new Map(Object.entries(data.regions));
        }
        
        return this;
    }
}

/**
 * Timeline manager for handling multiple timelines
 */
export class TimelineManager {
    constructor() {
        this.timelines = new Map();
        this.globalPlaybackSpeed = 1.0;
    }
    
    /**
     * Create a new timeline
     */
    create(id, options = {}) {
        const timeline = new Timeline(options);
        this.timelines.set(id, timeline);
        return timeline;
    }
    
    /**
     * Remove a timeline
     */
    remove(id) {
        const timeline = this.timelines.get(id);
        if (timeline) {
            timeline.stop();
            this.timelines.delete(id);
        }
        return this;
    }
    
    /**
     * Get timeline by ID
     */
    get(id) {
        return this.timelines.get(id);
    }
    
    /**
     * Play all timelines
     */
    playAll() {
        this.timelines.forEach(timeline => timeline.play());
        return this;
    }
    
    /**
     * Pause all timelines
     */
    pauseAll() {
        this.timelines.forEach(timeline => timeline.pause());
        return this;
    }
    
    /**
     * Stop all timelines
     */
    stopAll() {
        this.timelines.forEach(timeline => timeline.stop());
        return this;
    }
    
    /**
     * Set global playback speed
     */
    setGlobalPlaybackSpeed(speed) {
        this.globalPlaybackSpeed = speed;
        this.timelines.forEach(timeline => 
            timeline.setPlaybackSpeed(timeline.playbackSpeed * speed)
        );
        return this;
    }
    
    /**
     * Get statistics for all timelines
     */
    getAllStats() {
        const stats = {};
        this.timelines.forEach((timeline, id) => {
            stats[id] = timeline.getStats();
        });
        return stats;
    }
}

// Create global timeline manager
export const timelineManager = new TimelineManager();

// Export everything
export default {
    Keyframe,
    AnimationTrack,
    AnimationLayer,
    Timeline,
    TimelineManager,
    TimelineState,
    timelineManager
};