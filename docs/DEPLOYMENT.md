# Deployment Guide

> **Complete deployment guide for the NCS-API Website**

This document covers all deployment scenarios from development to production, including cloud platforms, containerization, and CI/CD pipelines.

## 📋 **Table of Contents**

1. [Quick Deployment](#quick-deployment)
2. [Build Process](#build-process)
3. [Static Hosting](#static-hosting)
4. [Cloud Platforms](#cloud-platforms)
5. [Containerization](#containerization)
6. [CI/CD Pipelines](#cicd-pipelines)
7. [Environment Configuration](#environment-configuration)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring & Analytics](#monitoring--analytics)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 **Quick Deployment**

### One-Command Deployment
```bash
# Build and deploy to production
npm run deploy

# Deploy to specific environment
npm run deploy:staging
npm run deploy:production
```

### Prerequisites Check
```bash
# Verify environment
node --version    # Should be 16+
npm --version     # Should be 8+
git --version     # Should be 2.30+

# Install dependencies
npm install

# Run validation
npm run validate  # Runs lint, test, build
```

---

## 🏗️ **Build Process**

### Development Build
```bash
# Development build with debugging
npm run build:dev

# Output: build/dev/
# - Unminified files
# - Source maps included
# - Debug logging enabled
```

### Production Build
```bash
# Optimized production build
npm run build

# Build steps:
# 1. Clean previous builds
# 2. Process and minify CSS
# 3. Bundle and minify JavaScript
# 4. Optimize images
# 5. Generate service worker
# 6. Create manifest
```

### Build Configuration
```javascript
// scripts/build.js
const BUILD_CONFIG = {
    minify: process.env.NODE_ENV === 'production',
    sourceMaps: process.env.NODE_ENV === 'development',
    enableServiceWorker: process.env.NODE_ENV === 'production',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    cdnBaseUrl: process.env.CDN_BASE_URL,
    apiBaseUrl: process.env.API_BASE_URL
};
```

### Build Output Structure
```
build/dist/
├── index.html              # Main HTML file
├── playground.html         # Playground page
├── docs.html              # Documentation page
├── benchmarks.html        # Benchmarks page
├── examples.html          # Examples page
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── assets/
│   ├── main.min.css       # Minified styles
│   ├── main.min.js        # Minified JavaScript
│   ├── images/            # Optimized images
│   └── fonts/             # Font files
└── data/                  # Sample datasets
```

---

## 🌐 **Static Hosting**

### Netlify Deployment

#### Automatic Deployment
```bash
# Connect GitHub repository to Netlify
# Build settings:
Build command: npm run build
Publish directory: build/dist
Node version: 16
```

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir build/dist
```

#### Netlify Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "build/dist"

[build.environment]
  NODE_VERSION = "16"
  NPM_VERSION = "8"

[[redirects]]
  from = "/api/*"
  to = "https://api.ncs-clustering.com/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Vercel Deployment

#### Automatic Deployment
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build/dist" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.ncs-clustering.com/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

### GitHub Pages

#### GitHub Actions Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
      env:
        NODE_ENV: production
        PUBLIC_URL: /NCS-API-Website
    
    - name: Deploy
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./build/dist
```

#### Manual GitHub Pages
```bash
# Build and deploy to gh-pages branch
npm run deploy:gh-pages
```

---

## ☁️ **Cloud Platforms**

### AWS S3 + CloudFront

#### S3 Setup
```bash
# Create S3 bucket
aws s3 mb s3://ncs-api-website

# Configure bucket for static hosting
aws s3 website s3://ncs-api-website \
  --index-document index.html \
  --error-document index.html

# Upload build files
npm run build
aws s3 sync build/dist/ s3://ncs-api-website --delete
```

#### CloudFront Configuration
```json
{
  "CallerReference": "ncs-api-website-2025",
  "Origins": [
    {
      "Id": "S3-ncs-api-website",
      "DomainName": "ncs-api-website.s3.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-ncs-api-website",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  },
  "Comment": "NCS-API Website Distribution",
  "Enabled": true
}
```

### Google Cloud Platform

#### Cloud Storage Setup
```bash
# Create bucket
gsutil mb gs://ncs-api-website

# Configure for web hosting
gsutil web set -m index.html -e index.html gs://ncs-api-website

# Upload files
npm run build
gsutil -m rsync -r -d build/dist/ gs://ncs-api-website
```

#### Cloud Run Deployment
```dockerfile
# Dockerfile.cloudrun
FROM nginx:alpine
COPY build/dist /usr/share/nginx/html
COPY nginx.cloud.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/ncs-api-website
gcloud run deploy --image gcr.io/PROJECT_ID/ncs-api-website --platform managed
```

### Azure Static Web Apps

#### Azure Configuration
```json
// staticwebapp.config.json
{
  "routes": [
    {
      "route": "/api/*",
      "redirect": "https://api.ncs-clustering.com/"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "mimeTypes": {
    ".json": "application/json",
    ".woff2": "font/woff2"
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block"
  }
}
```

#### GitHub Actions for Azure
```yaml
# .github/workflows/azure.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Build
      run: |
        npm ci
        npm run build
    
    - name: Deploy
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/"
        api_location: ""
        output_location: "build/dist"
```

---

## 🐳 **Containerization**

### Docker Setup

#### Production Dockerfile
```dockerfile
# Dockerfile
FROM node:16-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_comp_level 9;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass https://api.ncs-clustering.com/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/var/log/nginx
    restart: unless-stopped
    
  # Optional: Redis for caching
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    
  # Optional: Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped
```

### Docker Commands
```bash
# Build image
docker build -t ncs-api-website .

# Run container
docker run -p 3000:80 ncs-api-website

# Run with docker-compose
docker-compose up -d

# Check logs
docker logs ncs-api-website

# Update deployment
docker-compose pull && docker-compose up -d
```

### Kubernetes Deployment
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ncs-api-website
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ncs-api-website
  template:
    metadata:
      labels:
        app: ncs-api-website
    spec:
      containers:
      - name: web
        image: ncs-api-website:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: ncs-api-website-service
spec:
  selector:
    app: ncs-api-website
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

---

## 🔄 **CI/CD Pipelines**

### GitHub Actions

#### Complete Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '16'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run e2e tests
      run: |
        npm run build
        npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: build/dist

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: build/dist
    
    - name: Deploy to staging
      run: |
        # Deploy to staging environment
        echo "Deploying to staging..."
    
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-files
        path: build/dist
    
    - name: Deploy to production
      run: |
        # Deploy to production environment
        echo "Deploying to production..."
    
    - name: Run smoke tests
      run: |
        # Run post-deployment tests
        npm run test:smoke
```

### GitLab CI/CD
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "16"

test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run lint
    - npm run test
  artifacts:
    reports:
      junit: test-results.xml
      coverage: coverage/

build:
  stage: build
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - build/dist/
    expire_in: 1 week

deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to staging..."
    # Add staging deployment commands
  environment:
    name: staging
    url: https://staging.ncs-clustering.com
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to production..."
    # Add production deployment commands
  environment:
    name: production
    url: https://ncs-clustering.com
  only:
    - main
  when: manual
```

---

## ⚙️ **Environment Configuration**

### Environment Variables
```bash
# .env.production
NODE_ENV=production
PUBLIC_URL=https://ncs-clustering.com
API_BASE_URL=https://api.ncs-clustering.com/v1
CDN_BASE_URL=https://cdn.ncs-clustering.com
ENABLE_ANALYTICS=true
ENABLE_SERVICE_WORKER=true
ENABLE_PWA=true
SENTRY_DSN=your-sentry-dsn
GA_TRACKING_ID=your-ga-id
```

### Configuration Management
```javascript
// js/config/environment.js
const environments = {
  development: {
    apiBaseUrl: 'http://localhost:8000/api/v1',
    enableDebug: true,
    enableServiceWorker: false,
    enableAnalytics: false
  },
  
  staging: {
    apiBaseUrl: 'https://staging-api.ncs-clustering.com/v1',
    enableDebug: true,
    enableServiceWorker: true,
    enableAnalytics: false
  },
  
  production: {
    apiBaseUrl: 'https://api.ncs-clustering.com/v1',
    enableDebug: false,
    enableServiceWorker: true,
    enableAnalytics: true
  }
};

export const config = environments[process.env.NODE_ENV] || environments.development;
```

### Security Configuration
```javascript
// Security headers and CSP
const securityConfig = {
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.ncs-clustering.com"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.ncs-clustering.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },
  
  httpHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
};
```

---

## ⚡ **Performance Optimization**

### Build Optimization
```javascript
// scripts/optimize.js
const optimizations = {
  // Minify JavaScript
  minifyJS: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log']
    },
    mangle: true
  },
  
  // Optimize CSS
  minifyCSS: {
    level: 2,
    inline: ['all'],
    removeUnused: true
  },
  
  // Image optimization
  optimizeImages: {
    mozjpeg: { quality: 80 },
    pngquant: { quality: [0.8, 0.9] },
    svgo: { plugins: ['preset-default'] }
  },
  
  // Gzip compression
  compression: {
    level: 9,
    threshold: 1024
  }
};
```

### CDN Configuration
```javascript
// CDN asset optimization
const cdnConfig = {
  baseUrl: 'https://cdn.ncs-clustering.com',
  version: process.env.npm_package_version,
  
  assets: {
    js: `${baseUrl}/js/v${version}/`,
    css: `${baseUrl}/css/v${version}/`,
    images: `${baseUrl}/images/v${version}/`,
    fonts: `${baseUrl}/fonts/v${version}/`
  },
  
  cacheHeaders: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': true,
    'Last-Modified': true
  }
};
```

### Service Worker Optimization
```javascript
// sw.js - Service Worker caching strategy
const CACHE_NAME = 'ncs-api-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

const cacheStrategies = {
  // Cache first for static assets
  static: {
    strategy: 'CacheFirst',
    cacheName: STATIC_CACHE,
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 31536000 // 1 year
    }
  },
  
  // Network first for API calls
  api: {
    strategy: 'NetworkFirst',
    cacheName: 'api-cache',
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 300 // 5 minutes
    }
  },
  
  // Stale while revalidate for pages
  pages: {
    strategy: 'StaleWhileRevalidate',
    cacheName: 'pages-cache',
    expiration: {
      maxEntries: 20,
      maxAgeSeconds: 3600 // 1 hour
    }
  }
};
```

---

## 📊 **Monitoring & Analytics**

### Performance Monitoring
```javascript
// Performance monitoring setup
const performanceConfig = {
  // Core Web Vitals
  vitals: {
    FCP: { threshold: 1800 }, // First Contentful Paint
    LCP: { threshold: 2500 }, // Largest Contentful Paint
    FID: { threshold: 100 },  // First Input Delay
    CLS: { threshold: 0.1 }   // Cumulative Layout Shift
  },
  
  // Custom metrics
  custom: {
    'clustering-time': { threshold: 5000 },
    'data-load-time': { threshold: 3000 },
    'render-time': { threshold: 1000 }
  }
};

// Send metrics to monitoring service
function reportMetrics(metrics) {
  fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metrics)
  });
}
```

### Error Tracking
```javascript
// Error tracking with Sentry
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  }
});

// Custom error boundary
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});
```

### Analytics Setup
```javascript
// Google Analytics 4 setup
gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: document.title,
  page_location: window.location.href,
  send_page_view: true
});

// Custom event tracking
function trackClusteringEvent(algorithm, dataSize) {
  gtag('event', 'clustering_performed', {
    event_category: 'engagement',
    event_label: algorithm,
    value: dataSize
  });
}
```

---

## 🐛 **Troubleshooting**

### Common Deployment Issues

#### Build Failures
```bash
# Out of memory during build
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Permission issues
sudo chown -R $USER:$USER node_modules
npm run build
```

#### Runtime Errors
```javascript
// Check for missing environment variables
const requiredEnvVars = ['API_BASE_URL', 'NODE_ENV'];
const missingVars = requiredEnvVars.filter(name => !process.env[name]);

if (missingVars.length > 0) {
  console.error('Missing environment variables:', missingVars);
  process.exit(1);
}
```

#### Performance Issues
```bash
# Analyze bundle size
npm run build:analyze

# Check for memory leaks
npm run test:performance

# Monitor runtime performance
npm run lighthouse
```

### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  res.json(health);
});
```

### Rollback Procedures
```bash
# Quick rollback to previous version
git revert HEAD~1
npm run deploy

# Rollback to specific version
git checkout v1.0.0
npm run deploy

# Emergency rollback
# Switch DNS or load balancer to backup environment
```

---

## 📚 **Deployment Checklist**

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Backup created

### Deployment
- [ ] Build successful
- [ ] Health checks passing
- [ ] Monitoring enabled
- [ ] Error tracking active
- [ ] CDN cache purged
- [ ] DNS records updated

### Post-Deployment
- [ ] Smoke tests passing
- [ ] Performance metrics normal
- [ ] Error rates normal
- [ ] User feedback collected
- [ ] Documentation updated
- [ ] Team notified

---

## 🔗 **Additional Resources**

- [Performance Guide](./PERFORMANCE.md)
- [Security Guide](./SECURITY.md)
- [Monitoring Guide](./MONITORING.md)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

*For deployment support, contact: deploy-support@ncs-clustering.com* 🚀