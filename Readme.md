# NCS-API Website

> **High-Performance Clustering API with Interactive Web Interface**

A modern, production-ready web application for the NCS (Neural Clustering System) API, featuring real-time clustering algorithms, interactive visualizations, and comprehensive documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/michaelkatsweb/NCS-API-Website)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/michaelkatsweb/NCS-API-Website)

## 🚀 **Live Demo**

- **🎮 Playground**: [ncs-api.com/playground](https://ncs-api.com/playground)
- **📚 Documentation**: [ncs-api.com/docs](https://ncs-api.com/docs)
- **📊 Benchmarks**: [ncs-api.com/benchmarks](https://ncs-api.com/benchmarks)
- **💡 Examples**: [ncs-api.com/examples](https://ncs-api.com/examples)

## ✨ **Features**

### 🎯 **Core Functionality**
- **Interactive Clustering Playground** - Upload data, run algorithms, visualize results in real-time
- **Multiple Algorithm Support** - K-Means, DBSCAN, Hierarchical, and proprietary NCS algorithm
- **Real-time Performance Monitoring** - Live metrics, benchmarks, and algorithm comparisons
- **Advanced Data Processing** - CSV/JSON/Excel upload with validation and preprocessing
- **Professional Visualizations** - 2D/3D scatter plots, heatmaps, dendrograms with smooth animations

### 🛠️ **Developer Experience**
- **Interactive API Documentation** - Live API explorer with code generation
- **Multi-language Examples** - JavaScript, Python, R, and cURL code samples
- **Code Generator** - Automatic client code generation in multiple languages
- **Real-time Collaboration** - Share clustering sessions and results
- **Comprehensive Testing Suite** - Unit, integration, and end-to-end tests

### 🎨 **User Interface**
- **Modern Responsive Design** - Works flawlessly on desktop, tablet, and mobile
- **Dark/Light Theme Support** - Automatic system preference detection
- **Progressive Web App (PWA)** - Offline capabilities and native app experience
- **Accessibility First** - WCAG 2.1 AA compliant with screen reader support
- **Smooth Animations** - 60fps animations and transitions throughout

### ⚡ **Performance**
- **Web Workers** - Background processing for large datasets without UI blocking
- **Smart Caching** - Intelligent caching strategies for optimal performance
- **Lazy Loading** - Components and data loaded on-demand
- **Memory Management** - Efficient memory usage with automatic cleanup
- **CDN Integration** - Global content delivery for fast loading times

## 🏗️ **Architecture**

```
ncs-api-website/
├── 📁 assets/          # Static assets (data, images, fonts)
├── 📁 css/             # Stylesheets (components, layout, themes)
├── 📁 js/              # JavaScript modules
│   ├── 📁 api/         # API communication layer
│   ├── 📁 components/  # Reusable UI components
│   ├── 📁 core/        # Core application logic
│   ├── 📁 utils/       # Utility functions
│   └── 📁 workers/     # Web Workers for background processing
├── 📁 pages/           # Page-specific controllers
└── 📁 tests/           # Test suite
```

### 🧩 **Technology Stack**

- **Frontend**: Vanilla JavaScript (ES6+), CSS3, HTML5
- **Visualization**: Canvas API, WebGL, SVG
- **Build Tools**: Native ES modules, no bundler required
- **Testing**: Custom testing framework
- **PWA**: Service Worker, Web App Manifest
- **Performance**: Web Workers, IndexedDB, Cache API

## 🚀 **Quick Start**

### Prerequisites

- **Node.js** 16+ (for development server)
- **Modern Browser** (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)

### Installation

```bash
# Clone the repository
git clone https://github.com/michaelkatsweb/NCS-API-Website.git
cd NCS-API-Website

# Install dependencies
npm install

# Start development server
npm run dev
```

### Using with NCS-API

```bash
# Set your API key (optional for demo)
export NCS_API_KEY="your-api-key-here"

# Start the application
npm start
```

The application will be available at `http://localhost:3000`

## 📖 **Usage Examples**

### Basic Clustering

```javascript
// Upload and cluster data
const uploader = new DataUploader('#data-upload');
const visualizer = new ClusterVisualizer('#visualization');

// Process uploaded data
uploader.on('dataReady', async (data) => {
    const results = await apiClient.cluster({
        algorithm: 'kmeans',
        data: data,
        parameters: { k: 3 }
    });
    
    visualizer.render(results);
});
```

### Real-time Monitoring

```javascript
// Monitor clustering performance
const monitor = new PerformanceMonitor();

monitor.start();
monitor.on('metrics', (metrics) => {
    console.log('Processing speed:', metrics.speed);
    console.log('Memory usage:', metrics.memory);
    console.log('Accuracy score:', metrics.accuracy);
});
```

### Custom Algorithm Integration

```javascript
// Add custom clustering algorithm
const customAlgorithm = {
    name: 'custom-kmeans',
    parameters: {
        k: { type: 'number', min: 1, max: 20, default: 3 },
        maxIterations: { type: 'number', min: 10, max: 1000, default: 100 }
    },
    cluster: async (data, params) => {
        // Your clustering implementation
        return { clusters: [...], centroids: [...] };
    }
};

algorithmRegistry.register(customAlgorithm);
```

## 🎮 **Interactive Features**

### Playground
- **Drag & Drop Data Upload** - Support for CSV, JSON, Excel files
- **Real-time Parameter Adjustment** - See results update as you change parameters
- **Multiple Visualization Types** - Choose from scatter plots, heatmaps, 3D visualizations
- **Export Results** - Download results in multiple formats (CSV, JSON, PNG, SVG)

### API Documentation
- **Interactive API Explorer** - Test API endpoints directly in the browser
- **Code Generation** - Generate client code in your preferred language
- **Live Examples** - See real API responses with sample data
- **Authentication Testing** - Test API keys and authentication flows

### Performance Benchmarks
- **Real-time Metrics** - CPU usage, memory consumption, processing speed
- **Algorithm Comparison** - Side-by-side performance analysis
- **Historical Data** - Track performance trends over time
- **Custom Benchmarks** - Create and run custom performance tests

## 🔧 **Development**

### Project Structure

```
js/
├── components/         # UI Components
│   ├── ClusterVisualizer.js    # Main visualization component
│   ├── DataUploader.js         # File upload and processing
│   ├── PerformanceMonitor.js   # Real-time performance tracking
│   └── ...
├── core/              # Core Application Logic
│   ├── app.js         # Main application class
│   ├── router.js      # Client-side routing
│   ├── state.js       # Global state management
│   └── eventBusNew.js    # Event system
├── api/               # API Communication
│   ├── client.js      # HTTP API client
│   ├── websocket.js   # WebSocket connections
│   └── auth.js        # Authentication handling
├── utils/             # Utilities
│   ├── math.js        # Mathematical functions
│   ├── colors.js      # Color palette management
│   ├── storage.js     # Local storage wrapper
│   └── ...
└── workers/           # Web Workers
    ├── clustering.worker.js    # Background clustering
    ├── data.worker.js         # Data processing
    └── export.worker.js       # Export operations
```

### Development Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run dev:watch    # Start with file watching
npm run dev:debug    # Start with debugging enabled

# Building
npm run build        # Build for production
npm run build:dev    # Build for development
npm run preview      # Preview production build

# Testing
npm test             # Run all tests
npm run test:unit    # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run lint         # Lint JavaScript and CSS
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier

# Deployment
npm run deploy       # Deploy to production
npm run deploy:staging  # Deploy to staging
```

### Adding New Components

```javascript
// 1. Create component file
// js/components/MyComponent.js
export class MyComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...defaults, ...options };
        this.init();
    }
    
    init() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        // Component rendering logic
    }
}

// 2. Register component
// js/core/componentRegistry.js
import { MyComponent } from '../components/MyComponent.js';
componentRegistry.register('my-component', MyComponent);

// 3. Use in pages
const myComponent = new MyComponent('#my-container', {
    // options
});
```

## 🧪 **Testing**

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:components    # Component tests
npm run test:api          # API tests
npm run test:utils        # Utility tests

# Run with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── components/    # Component unit tests
│   ├── api/          # API unit tests
│   └── utils/        # Utility unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── performance/      # Performance tests
```

### Writing Tests

```javascript
// Example component test
import { ClusterVisualizer } from '../../js/components/ClusterVisualizer.js';
import { TestFramework } from '../framework/TestFramework.js';

TestFramework.describe('ClusterVisualizer', () => {
    let visualizer;
    let container;
    
    TestFramework.beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        visualizer = new ClusterVisualizer(container);
    });
    
    TestFramework.test('should render scatter plot', async () => {
        const data = [
            { x: 1, y: 2, cluster: 0 },
            { x: 3, y: 4, cluster: 1 }
        ];
        
        await visualizer.render(data);
        
        TestFramework.expect(container.querySelector('canvas')).toBeTruthy();
        TestFramework.expect(visualizer.getDataPoints()).toEqual(data);
    });
});
```

## 🚢 **Deployment**

### Production Build

```bash
# Create production build
npm run build

# The build/ directory will contain:
build/
├── dist/
│   ├── index.html
│   ├── assets/
│   │   ├── main.min.css
│   │   ├── main.min.js
│   │   └── images/
│   └── manifest.json
```

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
NCS_API_BASE_URL=https://api.ncs-clustering.com/v1
ENABLE_ANALYTICS=true
ENABLE_SERVICE_WORKER=true
CDN_URL=https://cdn.ncs-clustering.com
```

### Deployment Options

#### Static Hosting (Recommended)
```bash
# Deploy to Netlify
npm run deploy:netlify

# Deploy to Vercel
npm run deploy:vercel

# Deploy to GitHub Pages
npm run deploy:gh-pages
```

#### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### CDN Configuration
```javascript
// Configure CDN for static assets
const CDN_CONFIG = {
    images: 'https://cdn.ncs-clustering.com/images/',
    fonts: 'https://cdn.ncs-clustering.com/fonts/',
    data: 'https://cdn.ncs-clustering.com/data/'
};
```

## 🔧 **Configuration**

### API Configuration

```javascript
// js/config/api.js
export const API_CONFIG = {
    baseURL: 'https://api.ncs-clustering.com/v1',
    timeout: 30000,
    retries: 3,
    rateLimit: {
        requests: 100,
        window: 60000
    }
};
```

### Application Configuration

```javascript
// js/config/constants.js
export const CONFIG = {
    VERSION: '1.0.0',
    API_VERSION: 'v1',
    SUPPORTED_ALGORITHMS: ['kmeans', 'dbscan', 'hierarchical', 'ncs'],
    MAX_DATA_POINTS: 100000,
    DEFAULT_THEME: 'dark'
};
```

## 📊 **Performance**

### Optimization Features
- **Code Splitting** - Load components on demand
- **Image Optimization** - WebP format with fallbacks
- **Caching Strategy** - Aggressive caching with smart invalidation
- **Bundle Analysis** - Monitor bundle size and dependencies
- **Performance Monitoring** - Real-time performance metrics

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1
- **Memory Usage**: < 50MB for typical datasets

## ♿ **Accessibility**

### WCAG 2.1 AA Compliance
- **Keyboard Navigation** - Full keyboard accessibility
- **Screen Reader Support** - ARIA labels and semantic HTML
- **Color Contrast** - Meets minimum contrast ratios
- **Focus Management** - Visible focus indicators
- **Alternative Text** - Descriptive alt text for images

### Accessibility Testing
```bash
# Run accessibility tests
npm run test:a11y

# Generate accessibility report
npm run a11y:report
```

## 🌐 **Internationalization**

### Supported Languages
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese Simplified (zh-CN)
- Japanese (ja)

### Adding Translations
```javascript
// js/i18n/translations.js
export const translations = {
    en: {
        'clustering.title': 'Clustering Analysis',
        'algorithm.kmeans': 'K-Means Clustering'
    },
    es: {
        'clustering.title': 'Análisis de Clustering',
        'algorithm.kmeans': 'Agrupamiento K-Means'
    }
};
```

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `npm test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow ESLint configuration
- **Testing**: Maintain test coverage above 90%
- **Documentation**: Update docs for new features
- **Performance**: No performance regressions
- **Accessibility**: Maintain WCAG 2.1 AA compliance

## 📝 **API Documentation**

### Core Endpoints

```bash
# Clustering
POST /api/v1/cluster
GET  /api/v1/cluster/{id}
GET  /api/v1/cluster/{id}/results

# Data Management
POST /api/v1/data/upload
POST /api/v1/data/validate
GET  /api/v1/data/schema

# Analytics
GET  /api/v1/analytics/performance
GET  /api/v1/analytics/usage
```

### Authentication

```javascript
// API Key Authentication
const apiClient = new APIClient({
    apiKey: 'your-api-key',
    baseURL: 'https://api.ncs-clustering.com/v1'
});

// OAuth 2.0 (Enterprise)
const apiClient = new APIClient({
    authType: 'oauth2',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret'
});
```

## 🐛 **Troubleshooting**

### Common Issues

#### "Module not found" errors
```bash
# Ensure all dependencies are installed
npm install

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Performance issues with large datasets
```javascript
// Use data sampling for large datasets
const sampleSize = Math.min(data.length, 10000);
const sampledData = data.slice(0, sampleSize);
```

#### CORS errors with API
```javascript
// Configure CORS in development
const corsConfig = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
};
```

### Getting Help

- 📚 **Documentation**: [ncs-api.com/docs](https://ncs-api.com/docs)
- 💬 **Community**: [Discord Server](https://discord.gg/ncs-api)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/michaelkatsweb/NCS-API-Website/issues)
- 📧 **Support**: support@ncs-clustering.com

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Chart.js** - Inspiration for visualization architecture
- **D3.js** - Mathematical utilities and color schemes  
- **Three.js** - 3D rendering capabilities
- **OpenAI** - AI assistance in development
- **The Open Source Community** - Countless libraries and tools

## 🔗 **Links**

- **Website**: [ncs-clustering.com](https://ncs-clustering.com)
- **API Documentation**: [docs.ncs-clustering.com](https://docs.ncs-clustering.com)
- **GitHub**: [github.com/michaelkatsweb/NCS-API-Website](https://github.com/michaelkatsweb/NCS-API-Website)
- **NPM Package**: [npmjs.com/package/ncs-api-client](https://npmjs.com/package/ncs-api-client)
- **Docker Hub**: [hub.docker.com/r/ncsapi/web-app](https://hub.docker.com/r/ncsapi/web-app)

---

<div align="center">

**Built with ❤️ by the NCS-API Team**

[Website](https://ncs-clustering.com) • [Documentation](https://docs.ncs-clustering.com) • [GitHub](https://github.com/michaelkatsweb/NCS-API-Website) • [Discord](https://discord.gg/ncs-api)

</div>