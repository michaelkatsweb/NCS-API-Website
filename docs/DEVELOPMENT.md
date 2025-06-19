 # Development Guide

> **Complete guide for developing the NCS-API Website**

This document covers everything you need to know to set up, develop, and contribute to the NCS-API Website project.

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Architecture Overview](#architecture-overview)
6. [Component Development](#component-development)
7. [Testing Guidelines](#testing-guidelines)
8. [Performance Optimization](#performance-optimization)
9. [Debugging](#debugging)
10. [Common Issues](#common-issues)

---

## 🔧 **Prerequisites**

### System Requirements
- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: 2.30.0 or higher
- **Modern Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

### Recommended Tools
```bash
# Essential development tools
npm install -g http-server
npm install -g lighthouse
npm install -g @playwright/test

# Optional but recommended
npm install -g prettier
npm install -g eslint
npm install -g nodemon
```

### IDE/Editor Setup
**Recommended: VS Code with extensions:**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## 🚀 **Environment Setup**

### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/michaelkatsweb/NCS-API-Website.git
cd NCS-API-Website

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### 2. Environment Configuration
```bash
# .env.local
NODE_ENV=development
NCS_API_BASE_URL=https://api.ncs-clustering.com/v1
NCS_API_KEY=your-development-api-key
ENABLE_DEBUG=true
ENABLE_HOT_RELOAD=true
PORT=3000
HOST=localhost
```

### 3. Start Development Server
```bash
# Start with hot reload
npm run dev

# Start with debugging
npm run dev:debug

# Start and open browser
npm run dev:open
```

### 4. Verify Setup
```bash
# Run tests
npm test

# Check linting
npm run lint

# Build project
npm run build
```

---

## 🏗️ **Project Structure**

### Directory Organization
```
ncs-api-website/
├── 📁 assets/              # Static assets
│   ├── 📁 data/            # Sample datasets
│   ├── 📁 images/          # Images and icons
│   └── 📁 fonts/           # Typography files
├── 📁 css/                 # Stylesheets
│   ├── 📁 components/      # Component styles
│   ├── 📁 layout/          # Layout styles
│   └── 📁 themes/          # Theme definitions
├── 📁 js/                  # JavaScript modules
│   ├── 📁 api/             # API communication
│   ├── 📁 components/      # UI components
│   ├── 📁 core/            # Core application logic
│   ├── 📁 utils/           # Utility functions
│   ├── 📁 visualizations/  # Data visualization
│   └── 📁 workers/         # Web Workers
├── 📁 pages/               # Page controllers
├── 📁 tests/               # Test suite
├── 📁 docs/                # Documentation
└── 📁 scripts/             # Build and development scripts
```

### File Naming Conventions
```bash
# Components (PascalCase)
ClusterVisualizer.js
DataUploader.js
PerformanceMonitor.js

# Utilities (camelCase)
math.js
colors.js
debounce.js

# Constants (UPPER_CASE)
API_ENDPOINTS.js
CONFIG.js

# CSS (kebab-case)
cluster-visualizer.css
data-uploader.css
```

---

## 🔄 **Development Workflow**

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Start development server
npm run dev:watch

# Make changes...
# The server will auto-reload on file changes

# Run tests
npm run test:watch

# Commit changes
git add .
git commit -m "Add new feature"
```

### 2. Daily Development Commands
```bash
# Start development
npm run dev                 # Basic development server
npm run dev:debug          # With debugging enabled
npm run dev:watch          # With file watching

# Testing
npm run test:unit          # Unit tests only
npm run test:watch         # Tests in watch mode
npm run test:coverage      # With coverage report

# Code quality
npm run lint:fix           # Fix linting issues
npm run format            # Format code
npm run typecheck         # Type checking

# Building
npm run build:dev         # Development build
npm run build             # Production build
npm run preview           # Preview production build
```

### 3. Git Workflow
```bash
# Before starting work
git checkout main
git pull origin main
git checkout -b feature/your-feature

# During development
git add .
git commit -m "descriptive commit message"

# Before pushing
npm run validate           # Runs lint, test, build
git push origin feature/your-feature

# Create Pull Request on GitHub
```

---

## 🏛️ **Architecture Overview**

### Core Principles
1. **Modular Design** - Each component is self-contained
2. **Event-Driven** - Components communicate via events
3. **Performance First** - Optimized for speed and memory
4. **Progressive Enhancement** - Works without JavaScript
5. **Accessibility** - WCAG 2.1 AA compliant

### Application Layers
```
┌─────────────────────────────────────┐
│             UI Layer                │
│        (Components, Pages)          │
├─────────────────────────────────────┤
│           Service Layer             │
│     (API, WebSocket, Workers)       │
├─────────────────────────────────────┤
│            Core Layer               │
│    (State, Router, Event Bus)       │
├─────────────────────────────────────┤
│           Utility Layer             │
│   (Math, Storage, Performance)      │
└─────────────────────────────────────┘
```

### Component Architecture
```javascript
// Base Component Pattern
export class BaseComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...this.defaultOptions, ...options };
        this.state = {};
        this.eventBus = new EventBus();
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupEventListeners();
        this.onInit();
    }
    
    render() {
        // Override in subclasses
    }
    
    setupEventListeners() {
        // Override in subclasses
    }
    
    onInit() {
        // Override in subclasses
    }
    
    destroy() {
        this.eventBus.removeAllListeners();
        this.container.innerHTML = '';
    }
}
```

---

## 🧩 **Component Development**

### Creating New Components

#### 1. Component File Structure
```javascript
// js/components/MyComponent.js
import { BaseComponent } from './BaseComponent.js';
import { EventBus } from '../core/eventBus.js';

export class MyComponent extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);
    }
    
    get defaultOptions() {
        return {
            autoStart: true,
            enableAnimation: true,
            theme: 'dark'
        };
    }
    
    render() {
        this.container.innerHTML = `
            <div class="my-component">
                <div class="component-header">
                    <h3>${this.options.title}</h3>
                </div>
                <div class="component-content">
                    <!-- Component content -->
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        this.container.addEventListener('click', (e) => {
            this.handleClick(e);
        });
        
        this.eventBus.on('data:updated', (data) => {
            this.updateData(data);
        });
    }
    
    handleClick(event) {
        // Handle component interactions
    }
    
    updateData(data) {
        // Update component with new data
    }
}
```

#### 2. Component Stylesheet
```css
/* css/components/my-component.css */
.my-component {
    --component-bg: var(--color-surface);
    --component-border: var(--color-border);
    
    background: var(--component-bg);
    border: 1px solid var(--component-border);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
}

.component-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
}

.component-content {
    min-height: 200px;
}

/* Responsive design */
@media (max-width: 768px) {
    .my-component {
        padding: var(--spacing-sm);
    }
}

/* Theme variations */
[data-theme="dark"] .my-component {
    --component-bg: var(--dark-surface);
    --component-border: var(--dark-border);
}
```

#### 3. Component Registration
```javascript
// js/core/componentRegistry.js
import { MyComponent } from '../components/MyComponent.js';

export const componentRegistry = {
    components: new Map(),
    
    register(name, ComponentClass) {
        this.components.set(name, ComponentClass);
    },
    
    create(name, container, options) {
        const ComponentClass = this.components.get(name);
        if (!ComponentClass) {
            throw new Error(`Component '${name}' not found`);
        }
        return new ComponentClass(container, options);
    }
};

// Register component
componentRegistry.register('my-component', MyComponent);
```

### Component Guidelines

#### State Management
```javascript
// Use local state for component-specific data
this.state = {
    isLoading: false,
    data: null,
    selectedItems: []
};

// Use global state for shared data
import { globalState } from '../core/state.js';

globalState.subscribe('user', (user) => {
    this.updateUserInfo(user);
});
```

#### Event Communication
```javascript
// Emit events for component actions
this.eventBus.emit('component:action', {
    type: 'click',
    target: button,
    data: this.data
});

// Listen for global events
this.eventBus.on('app:theme-changed', (theme) => {
    this.updateTheme(theme);
});
```

#### Performance Optimization
```javascript
// Use debouncing for frequent events
import { debounce } from '../utils/debounce.js';

this.debouncedUpdate = debounce(this.updateData.bind(this), 300);

// Lazy load heavy components
async loadHeavyComponent() {
    const { HeavyComponent } = await import('./HeavyComponent.js');
    this.heavyComponent = new HeavyComponent(this.container);
}

// Clean up resources
destroy() {
    this.debouncedUpdate?.cancel?.();
    this.animationFrame && cancelAnimationFrame(this.animationFrame);
    super.destroy();
}
```

---

## 🧪 **Testing Guidelines**

### Test Structure
```
tests/
├── unit/                  # Unit tests
│   ├── components/        # Component tests
│   ├── utils/            # Utility tests
│   └── api/              # API tests
├── integration/          # Integration tests
├── e2e/                  # End-to-end tests
└── performance/          # Performance tests
```

### Writing Unit Tests
```javascript
// tests/unit/components/MyComponent.test.js
import { MyComponent } from '../../../js/components/MyComponent.js';
import { TestFramework } from '../../framework/TestFramework.js';

TestFramework.describe('MyComponent', () => {
    let component;
    let container;
    
    TestFramework.beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        component = new MyComponent(container, {
            title: 'Test Component'
        });
    });
    
    TestFramework.afterEach(() => {
        component.destroy();
        document.body.removeChild(container);
    });
    
    TestFramework.test('should render correctly', () => {
        TestFramework.expect(container.querySelector('.my-component')).toBeTruthy();
        TestFramework.expect(container.textContent).toContain('Test Component');
    });
    
    TestFramework.test('should handle click events', () => {
        const button = container.querySelector('.component-button');
        const spy = TestFramework.spy(component, 'handleClick');
        
        button.click();
        
        TestFramework.expect(spy).toHaveBeenCalled();
    });
    
    TestFramework.test('should update data correctly', async () => {
        const testData = { id: 1, name: 'Test' };
        
        await component.updateData(testData);
        
        TestFramework.expect(component.state.data).toEqual(testData);
    });
});
```

### Integration Testing
```javascript
// tests/integration/clustering-workflow.test.js
TestFramework.describe('Clustering Workflow', () => {
    TestFramework.test('should complete full clustering process', async () => {
        // Upload data
        const uploader = new DataUploader('#uploader');
        const testData = generateTestData(100);
        await uploader.processData(testData);
        
        // Run clustering
        const clusterer = new ClusteringEngine();
        const results = await clusterer.cluster('kmeans', testData, { k: 3 });
        
        // Visualize results
        const visualizer = new ClusterVisualizer('#viz');
        await visualizer.render(results);
        
        // Verify results
        TestFramework.expect(results.clusters).toHaveLength(testData.length);
        TestFramework.expect(results.centroids).toHaveLength(3);
        TestFramework.expect(visualizer.isRendered()).toBe(true);
    });
});
```

### Performance Testing
```javascript
// tests/performance/large-dataset.test.js
TestFramework.describe('Large Dataset Performance', () => {
    TestFramework.test('should handle 10k points in under 5 seconds', async () => {
        const largeDataset = generateTestData(10000);
        const startTime = performance.now();
        
        const results = await clusterLargeDataset(largeDataset);
        
        const duration = performance.now() - startTime;
        TestFramework.expect(duration).toBeLessThan(5000);
        TestFramework.expect(results.clusters).toHaveLength(10000);
    });
});
```

---

## ⚡ **Performance Optimization**

### Code Splitting
```javascript
// Lazy load components
const loadClusterVisualizer = () => import('./ClusterVisualizer.js');
const loadPerformanceMonitor = () => import('./PerformanceMonitor.js');

// Use dynamic imports for heavy features
async function initializeAdvancedFeatures() {
    const { AdvancedAnalytics } = await import('./AdvancedAnalytics.js');
    return new AdvancedAnalytics();
}
```

### Memory Management
```javascript
// Clean up event listeners
class Component {
    constructor() {
        this.eventListeners = [];
        this.animationFrames = [];
        this.intervals = [];
    }
    
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }
    
    requestAnimationFrame(callback) {
        const id = requestAnimationFrame(callback);
        this.animationFrames.push(id);
        return id;
    }
    
    destroy() {
        // Clean up event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        
        // Cancel animation frames
        this.animationFrames.forEach(id => cancelAnimationFrame(id));
        
        // Clear intervals
        this.intervals.forEach(id => clearInterval(id));
    }
}
```

### Efficient Data Processing
```javascript
// Use Web Workers for heavy computations
const worker = new Worker('./js/workers/clustering.worker.js');

function processLargeDataset(data) {
    return new Promise((resolve, reject) => {
        worker.postMessage({ data, algorithm: 'kmeans' });
        
        worker.onmessage = (e) => {
            if (e.data.error) {
                reject(new Error(e.data.error));
            } else {
                resolve(e.data.result);
            }
        };
    });
}

// Implement data pagination
function paginateData(data, pageSize = 1000) {
    const pages = [];
    for (let i = 0; i < data.length; i += pageSize) {
        pages.push(data.slice(i, i + pageSize));
    }
    return pages;
}
```

---

## 🐛 **Debugging**

### Debug Configuration
```javascript
// js/config/debug.js
export const DEBUG_CONFIG = {
    enableLogging: process.env.NODE_ENV === 'development',
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    enablePerformanceMonitoring: true,
    enableComponentBoundaries: true
};

// Debug utilities
export const debug = {
    log: (message, data) => {
        if (DEBUG_CONFIG.enableLogging) {
            console.log(`[DEBUG] ${message}`, data);
        }
    },
    
    performance: (label, fn) => {
        if (!DEBUG_CONFIG.enablePerformanceMonitoring) return fn();
        
        console.time(label);
        const result = fn();
        console.timeEnd(label);
        return result;
    },
    
    trace: (component, method) => {
        if (DEBUG_CONFIG.enableLogging) {
            console.trace(`${component}.${method}`);
        }
    }
};
```

### Development Tools

#### Component Inspector
```javascript
// Add to browser console
window.inspectComponent = (selector) => {
    const element = document.querySelector(selector);
    const component = element?._component;
    
    if (component) {
        console.log('Component:', component.constructor.name);
        console.log('State:', component.state);
        console.log('Options:', component.options);
        return component;
    } else {
        console.log('No component found for selector:', selector);
    }
};

// Usage: inspectComponent('.cluster-visualizer')
```

#### Performance Profiler
```javascript
// js/utils/profiler.js
export class Profiler {
    constructor() {
        this.marks = new Map();
        this.measures = new Map();
    }
    
    mark(name) {
        performance.mark(name);
        this.marks.set(name, performance.now());
    }
    
    measure(name, startMark, endMark) {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        this.measures.set(name, measure.duration);
        return measure.duration;
    }
    
    getReport() {
        const report = {
            marks: Object.fromEntries(this.marks),
            measures: Object.fromEntries(this.measures)
        };
        console.table(report.measures);
        return report;
    }
}

// Usage
const profiler = new Profiler();
profiler.mark('clustering-start');
// ... clustering code ...
profiler.mark('clustering-end');
profiler.measure('clustering-duration', 'clustering-start', 'clustering-end');
```

### Common Debugging Scenarios

#### State Issues
```javascript
// Debug state changes
import { globalState } from '../core/state.js';

globalState.debug = true; // Enables state change logging

// Add state inspector
window.inspectState = () => {
    console.log('Global State:', globalState.getAll());
    console.log('State History:', globalState.getHistory());
};
```

#### Event Issues
```javascript
// Debug event flow
import { EventBus } from '../core/eventBus.js';

EventBus.prototype.emit = function(event, data) {
    console.log(`[EVENT] ${event}`, data);
    return this.originalEmit.call(this, event, data);
};
```

#### Performance Issues
```javascript
// Monitor component render times
const originalRender = Component.prototype.render;
Component.prototype.render = function() {
    const start = performance.now();
    const result = originalRender.call(this);
    const duration = performance.now() - start;
    
    if (duration > 16) { // Longer than one frame
        console.warn(`Slow render in ${this.constructor.name}: ${duration}ms`);
    }
    
    return result;
};
```

---

## ❗ **Common Issues**

### Build Issues

#### Module Resolution
```bash
# Error: Cannot resolve module './Component.js'
# Solution: Ensure correct file extensions
import { Component } from './Component.js'; // ✅ Correct
import { Component } from './Component';    // ❌ Incorrect
```

#### Circular Dependencies
```javascript
// Avoid circular imports
// file1.js
import { function2 } from './file2.js';

// file2.js  
import { function1 } from './file1.js'; // ❌ Circular dependency

// Solution: Extract shared code to separate module
// shared.js
export const sharedFunction = () => {};

// file1.js
import { sharedFunction } from './shared.js';

// file2.js
import { sharedFunction } from './shared.js';
```

### Runtime Issues

#### Memory Leaks
```javascript
// Common causes and solutions
class Component {
    constructor() {
        // ❌ This creates a memory leak
        setInterval(() => {
            this.update();
        }, 1000);
        
        // ✅ Proper cleanup
        this.interval = setInterval(() => {
            this.update();
        }, 1000);
    }
    
    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}
```

#### Event Listener Issues
```javascript
// ❌ Event listeners not removed
element.addEventListener('click', this.handleClick);

// ✅ Proper cleanup
element.addEventListener('click', this.handleClick);
// Later...
element.removeEventListener('click', this.handleClick);

// ✅ Using AbortController (modern approach)
const controller = new AbortController();
element.addEventListener('click', this.handleClick, {
    signal: controller.signal
});
// Later...
controller.abort(); // Removes all listeners with this signal
```

### Development Environment

#### Hot Reload Issues
```bash
# If hot reload stops working
rm -rf node_modules/.cache
npm run dev
```

#### Port Conflicts
```bash
# Change port in package.json or use environment variable
PORT=3001 npm run dev
```

#### CORS Issues in Development
```javascript
// Add to dev server configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
};
```

---

## 📚 **Additional Resources**

### Documentation
- [Architecture Overview](./ARCHITECTURE.md)
- [API Integration Guide](./API_INTEGRATION.md)
- [Performance Guide](./PERFORMANCE.md)
- [Deployment Guide](./DEPLOYMENT.md)

### External Resources
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [JavaScript Style Guide](https://github.com/airbnb/javascript)

### Community
- **Discord**: [NCS-API Community](https://discord.gg/ncs-api)
- **GitHub Discussions**: [Project Discussions](https://github.com/michaelkatsweb/NCS-API-Website/discussions)
- **Stack Overflow**: Tag your questions with `ncs-api`

---

## 🤝 **Getting Help**

If you encounter issues:

1. **Check this guide** for common solutions
2. **Search existing issues** on GitHub
3. **Ask in Discord** for real-time help
4. **Create a GitHub issue** for bugs
5. **Email support** at dev-support@ncs-clustering.com

---

*Happy coding! 🚀*