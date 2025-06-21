/**
 * FILE: js/core/componentLoader.js
 * Component Loading Architecture - Standardized System
 * Handles dynamic loading, initialization, and lifecycle management of components
 */

import { eventBus } from './eventBusNew.js';
import { CONFIG } from '../config/constants.js';

/**
 * Component Loader Class
 * Manages component lifecycle with standardized patterns
 */
export class ComponentLoader {
    constructor() {
        this.loadedComponents = new Map();
        this.componentInstances = new Map();
        this.loadingPromises = new Map();
        this.failedComponents = new Set();
        this.dependencyGraph = new Map();
        
        // Component registry - maps component names to their module paths
        this.componentRegistry = new Map([
            // Core UI Components
            ['Header', './components/Header.js'],
            ['Hero', './components/Hero.js'],
            ['ThemeToggle', './components/ThemeToggle.js'],
            ['Modal', './components/Modal.js'],
            ['Toast', './components/Toast.js'],
            
            // Playground Components  
            ['Playground', './components/Playground.js'],
            ['DataUploader', './components/DataUploader.js'],
            ['ClusterVisualizer', './components/ClusterVisualizer.js'],
            ['ParameterControls', './components/ParameterControls.js'],
            ['ResultsPanel', './components/ResultsPanel.js'],
            
            // API & Documentation
            ['ApiExplorer', './components/ApiExplorer.js'],
            ['CodeGenerator', './components/CodeGenerator.js'],
            ['PerformanceMonitor', './components/PerformanceMonitor.js'],
            
            // Visualization Components
            ['ScatterPlot', './visualizations/charts/ScatterPlot.js'],
            ['ScatterPlot3D', './visualizations/charts/ScatterPlot3D.js'],
            ['Heatmap', './visualizations/charts/Heatmap.js'],
            ['Dendrogram', './visualizations/charts/Dendrogram.js']
        ]);
        
        // Component dependencies
        this.dependencies = new Map([
            ['ClusterVisualizer', ['ScatterPlot', 'Heatmap']],
            ['Playground', ['DataUploader', 'ClusterVisualizer', 'ParameterControls']],
            ['ApiExplorer', ['CodeGenerator', 'Modal']],
            ['Header', ['ThemeToggle']]
        ]);
        
        // Container selectors for finding component mount points
        this.containerSelectors = new Map([
            ['Header', ['header', '.header', '[data-component="header"]']],
            ['Hero', ['.hero', '[data-component="hero"]']],
            ['ThemeToggle', ['.theme-toggle', '[data-component="theme-toggle"]', '#theme-toggle']],
            ['Playground', ['.playground', '[data-component="playground"]', '#playground']],
            ['DataUploader', ['.data-uploader', '[data-component="data-uploader"]']],
            ['ClusterVisualizer', ['.cluster-visualizer', '[data-component="cluster-visualizer"]']],
            ['PerformanceMonitor', ['.performance-monitor', '[data-component="performance-monitor"]']]
        ]);
        
        this.initialized = false;
    }

    /**
     * Initialize the component loader
     */
    async init() {
        if (this.initialized) return;
        
        console.log('📦 Initializing Component Loader...');
        
        // Setup global error handling for component loading
        this.setupErrorHandling();
        
        // Register event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ Component Loader initialized');
    }

    /**
     * Load a single component by name
     * @param {string} componentName - Name of the component to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object|null>} Component instance or null if failed
     */
    async loadComponent(componentName, options = {}) {
        const {
            container = null,
            props = {},
            forcereload = false,
            timeout = 10000
        } = options;

        // Check if component is already loaded and not forcing reload
        if (!forcereload && this.componentInstances.has(componentName)) {
            console.log(`📦 Component already loaded: ${componentName}`);
            return this.componentInstances.get(componentName);
        }

        // Check if component is currently loading
        if (this.loadingPromises.has(componentName)) {
            console.log(`📦 Component already loading, waiting: ${componentName}`);
            return this.loadingPromises.get(componentName);
        }

        // Check if component is in registry
        if (!this.componentRegistry.has(componentName)) {
            console.warn(`⚠️ Component not found in registry: ${componentName}`);
            this.failedComponents.add(componentName);
            return null;
        }

        // Create loading promise
        const loadingPromise = this.performComponentLoad(componentName, container, props, timeout);
        this.loadingPromises.set(componentName, loadingPromise);

        try {
            const result = await loadingPromise;
            this.loadingPromises.delete(componentName);
            return result;
        } catch (error) {
            this.loadingPromises.delete(componentName);
            throw error;
        }
    }

    /**
     * Perform the actual component loading
     * @private
     */
    async performComponentLoad(componentName, container, props, timeout) {
        console.log(`📦 Loading component: ${componentName}`);
        
        const startTime = performance.now();
        
        try {
            // Load dependencies first
            await this.loadDependencies(componentName);
            
            // Get module path
            const modulePath = this.componentRegistry.get(componentName);
            
            // Dynamic import with timeout
            const modulePromise = import(modulePath);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Component load timeout: ${componentName}`)), timeout)
            );
            
            const module = await Promise.race([modulePromise, timeoutPromise]);
            
            // Store loaded module
            this.loadedComponents.set(componentName, module);
            
            // Get component class
            const ComponentClass = this.extractComponentClass(module, componentName);
            
            if (!ComponentClass) {
                throw new Error(`Component class not found in module: ${componentName}`);
            }
            
            // Find or create container
            const componentContainer = container || this.findComponentContainer(componentName);
            
            // Initialize component
            const componentInstance = await this.initializeComponent(
                ComponentClass, 
                componentContainer, 
                props, 
                componentName
            );
            
            // Store instance
            this.componentInstances.set(componentName, componentInstance);
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ Component loaded successfully: ${componentName} (${loadTime.toFixed(2)}ms)`);
            
            // Emit success event
            eventBus.emit('component:loaded', {
                name: componentName,
                loadTime,
                hasContainer: !!componentContainer
            });
            
            return componentInstance;
            
        } catch (error) {
            const loadTime = performance.now() - startTime;
            console.error(`❌ Failed to load component ${componentName}:`, error);
            
            this.failedComponents.add(componentName);
            
            // Emit error event
            eventBus.emit('component:load-error', {
                name: componentName,
                error: error.message,
                loadTime
            });
            
            return null;
        }
    }

    /**
     * Load component dependencies
     * @private
     */
    async loadDependencies(componentName) {
        const deps = this.dependencies.get(componentName);
        if (!deps || deps.length === 0) return;
        
        console.log(`📦 Loading dependencies for ${componentName}:`, deps);
        
        const dependencyPromises = deps.map(dep => 
            this.loadComponent(dep, { timeout: 5000 }).catch(error => {
                console.warn(`⚠️ Optional dependency failed to load: ${dep}`, error);
                return null;
            })
        );
        
        await Promise.allSettled(dependencyPromises);
    }

    /**
     * Extract component class from module
     * @private
     */
    extractComponentClass(module, componentName) {
        // Try different export patterns
        const candidates = [
            module[componentName],           // Named export matching component name
            module.default,                  // Default export
            module[Object.keys(module)[0]]   // First named export
        ];
        
        for (const candidate of candidates) {
            if (typeof candidate === 'function') {
                return candidate;
            }
        }
        
        return null;
    }

    /**
     * Find container element for component
     * @private
     */
    findComponentContainer(componentName) {
        const selectors = this.containerSelectors.get(componentName) || [];
        
        for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
                console.log(`📦 Found container for ${componentName}: ${selector}`);
                return container;
            }
        }
        
        console.log(`📦 No container found for ${componentName}, using document.body`);
        return null; // Let component handle its own mounting
    }

    /**
     * Initialize component instance
     * @private
     */
    async initializeComponent(ComponentClass, container, props, componentName) {
        try {
            // Create instance based on constructor signature
            let instance;
            
            if (container) {
                instance = new ComponentClass(container, props);
            } else {
                instance = new ComponentClass(props);
            }
            
            // Call init method if it exists
            if (typeof instance.init === 'function') {
                await instance.init();
            }
            
            // Set up component lifecycle management
            this.setupComponentLifecycle(instance, componentName);
            
            return instance;
            
        } catch (error) {
            throw new Error(`Failed to initialize component ${componentName}: ${error.message}`);
        }
    }

    /**
     * Setup component lifecycle management
     * @private
     */
    setupComponentLifecycle(instance, componentName) {
        // Add common lifecycle methods if they don't exist
        if (!instance.destroy) {
            instance.destroy = function() {
                console.log(`🗑️ Destroying component: ${componentName}`);
                // Basic cleanup
                if (this.container && this.container.innerHTML) {
                    this.container.innerHTML = '';
                }
            };
        }
        
        // Add reload method
        instance.reload = async () => {
            console.log(`🔄 Reloading component: ${componentName}`);
            await this.reloadComponent(componentName);
        };
        
        // Add component metadata
        instance._componentName = componentName;
        instance._loadedAt = Date.now();
    }

    /**
     * Load multiple components in parallel
     * @param {Array<string>} componentNames - Array of component names to load
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Array of component instances
     */
    async loadComponents(componentNames, options = {}) {
        console.log(`📦 Loading multiple components:`, componentNames);
        
        const loadPromises = componentNames.map(name => 
            this.loadComponent(name, options).catch(error => {
                console.warn(`⚠️ Failed to load component ${name}:`, error);
                return null;
            })
        );
        
        const results = await Promise.allSettled(loadPromises);
        
        const loaded = results
            .map((result, index) => ({
                name: componentNames[index],
                instance: result.status === 'fulfilled' ? result.value : null,
                success: result.status === 'fulfilled' && result.value !== null
            }));
        
        const successful = loaded.filter(item => item.success);
        const failed = loaded.filter(item => !item.success);
        
        console.log(`📦 Component loading complete. Success: ${successful.length}, Failed: ${failed.length}`);
        
        return loaded;
    }

    /**
     * Reload a component
     * @param {string} componentName - Component to reload
     * @returns {Promise<Object|null>} New component instance
     */
    async reloadComponent(componentName) {
        console.log(`🔄 Reloading component: ${componentName}`);
        
        // Destroy existing instance
        const existingInstance = this.componentInstances.get(componentName);
        if (existingInstance && typeof existingInstance.destroy === 'function') {
            existingInstance.destroy();
        }
        
        // Remove from caches
        this.componentInstances.delete(componentName);
        this.loadedComponents.delete(componentName);
        this.failedComponents.delete(componentName);
        
        // Load fresh
        return this.loadComponent(componentName, { forcereload: true });
    }

    /**
     * Get component instance
     * @param {string} componentName - Component name
     * @returns {Object|null} Component instance or null
     */
    getComponent(componentName) {
        return this.componentInstances.get(componentName) || null;
    }

    /**
     * Check if component is loaded
     * @param {string} componentName - Component name
     * @returns {boolean} True if loaded
     */
    isLoaded(componentName) {
        return this.componentInstances.has(componentName);
    }

    /**
     * Get all loaded components
     * @returns {Map} Map of component names to instances
     */
    getAllComponents() {
        return new Map(this.componentInstances);
    }

    /**
     * Setup error handling
     * @private
     */
    setupErrorHandling() {
        // Global component error handler
        window.addEventListener('error', (event) => {
            if (event.filename && event.filename.includes('/components/')) {
                console.error('🚨 Component runtime error:', event.error);
                eventBus.emit('component:runtime-error', {
                    filename: event.filename,
                    error: event.error,
                    lineno: event.lineno
                });
            }
        });
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for page navigation to load page-specific components
        eventBus.on('page:changed', async (data) => {
            const { page } = data;
            await this.loadPageComponents(page);
        });
        
        // Listen for theme changes to notify components
        eventBus.on('theme:changed', (theme) => {
            this.notifyComponentsOfThemeChange(theme);
        });
    }

    /**
     * Load components for a specific page
     * @param {string} page - Page name
     */
    async loadPageComponents(page) {
        const pageComponentMap = {
            'landing': ['Header', 'Hero', 'ThemeToggle'],
            'playground': ['Header', 'Playground', 'DataUploader', 'ClusterVisualizer', 'ThemeToggle'],
            'docs': ['Header', 'ApiExplorer', 'ThemeToggle'],
            'benchmarks': ['Header', 'PerformanceMonitor', 'ThemeToggle'],
            'examples': ['Header', 'ClusterVisualizer', 'ThemeToggle']
        };
        
        const components = pageComponentMap[page] || ['Header', 'ThemeToggle'];
        
        console.log(`📦 Loading components for page: ${page}`, components);
        
        await this.loadComponents(components);
    }

    /**
     * Notify components of theme change
     * @private
     */
    notifyComponentsOfThemeChange(theme) {
        for (const [name, instance] of this.componentInstances) {
            if (typeof instance.onThemeChange === 'function') {
                try {
                    instance.onThemeChange(theme);
                } catch (error) {
                    console.warn(`⚠️ Component ${name} theme change failed:`, error);
                }
            }
        }
    }

    /**
     * Get loading statistics
     * @returns {Object} Loading statistics
     */
    getStats() {
        return {
            loaded: this.componentInstances.size,
            failed: this.failedComponents.size,
            loading: this.loadingPromises.size,
            registered: this.componentRegistry.size,
            loadedComponents: Array.from(this.componentInstances.keys()),
            failedComponents: Array.from(this.failedComponents),
            currentlyLoading: Array.from(this.loadingPromises.keys())
        };
    }

    /**
     * Destroy all components and clean up
     */
    destroy() {
        console.log('🗑️ Destroying Component Loader...');
        
        // Destroy all component instances
        for (const [name, instance] of this.componentInstances) {
            if (typeof instance.destroy === 'function') {
                try {
                    instance.destroy();
                } catch (error) {
                    console.warn(`⚠️ Error destroying component ${name}:`, error);
                }
            }
        }
        
        // Clear all maps
        this.componentInstances.clear();
        this.loadedComponents.clear();
        this.loadingPromises.clear();
        this.failedComponents.clear();
        
        this.initialized = false;
    }
}

// Create and export singleton instance
export const componentLoader = new ComponentLoader();

// Export class for custom instances
export { ComponentLoader };

// Default export
export default componentLoader;