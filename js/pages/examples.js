/**
 * FILE: pages/examples.js
 * Examples Page Controller - Real-world clustering examples and use cases
 * NCS-API Website
 * 
 * Features:
 * - Interactive example browser
 * - Live code editor and runner
 * - Multiple programming languages
 * - Real dataset examples
 * - Copy-to-clipboard functionality
 * - Download complete examples
 * - Step-by-step tutorials
 * - Industry-specific use cases
 */

import { CONFIG } from '../js/config/constants.js';
import { EventBus } from '../js/core/eventBus.js';
import { CodeGenerator } from '../js/components/CodeGenerator.js';
import { ClusterVisualizer } from '../js/components/ClusterVisualizer.js';
import { DataUploader } from '../js/components/DataUploader.js';
import { ApiClient } from '../js/api/client.js';

export class ExamplesPage {
    constructor() {
        this.container = document.getElementById('examples-container') || document.body;
        this.eventBus = new EventBus();
        this.apiClient = new ApiClient();
        
        // Components
        this.codeGenerator = null;
        this.clusterVisualizer = null;
        this.dataUploader = null;
        
        // State management
        this.state = {
            currentExample: null,
            currentLanguage: 'javascript',
            currentDataset: 'customers',
            isRunning: false,
            results: null,
            expandedSections: new Set(['getting-started'])
        };
        
        // Example categories and data
        this.examples = {
            'getting-started': {
                title: 'Getting Started',
                icon: '🚀',
                description: 'Basic clustering examples to get you started quickly',
                examples: [
                    {
                        id: 'basic-kmeans',
                        title: 'Basic K-Means Clustering',
                        description: 'Simple customer segmentation using K-means algorithm',
                        difficulty: 'Beginner',
                        dataset: 'customers',
                        algorithm: 'kmeans',
                        useCase: 'Customer Segmentation',
                        tags: ['kmeans', 'segmentation', 'marketing']
                    },
                    {
                        id: 'data-preprocessing',
                        title: 'Data Preprocessing',
                        description: 'Clean and prepare data before clustering',
                        difficulty: 'Beginner',
                        dataset: 'raw-sales',
                        algorithm: 'preprocessing',
                        useCase: 'Data Preparation',
                        tags: ['preprocessing', 'cleaning', 'normalization']
                    },
                    {
                        id: 'quick-visualization',
                        title: 'Quick Visualization',
                        description: 'Visualize clustering results in 2D and 3D',
                        difficulty: 'Beginner',
                        dataset: 'iris',
                        algorithm: 'dbscan',
                        useCase: 'Data Visualization',
                        tags: ['visualization', 'plotting', 'analysis']
                    }
                ]
            },
            'business': {
                title: 'Business Applications',
                icon: '💼',
                description: 'Real-world business use cases and implementations',
                examples: [
                    {
                        id: 'customer-segmentation',
                        title: 'Customer Segmentation for E-commerce',
                        description: 'Segment customers based on purchase behavior and demographics',
                        difficulty: 'Intermediate',
                        dataset: 'ecommerce',
                        algorithm: 'kmeans',
                        useCase: 'Marketing & Sales',
                        tags: ['ecommerce', 'customers', 'behavior', 'marketing']
                    },
                    {
                        id: 'product-recommendation',
                        title: 'Product Recommendation System',
                        description: 'Group similar products for recommendation engines',
                        difficulty: 'Advanced',
                        dataset: 'products',
                        algorithm: 'hierarchical',
                        useCase: 'Recommendation Systems',
                        tags: ['recommendations', 'products', 'similarity']
                    },
                    {
                        id: 'market-basket',
                        title: 'Market Basket Analysis',
                        description: 'Find patterns in shopping cart combinations',
                        difficulty: 'Intermediate',
                        dataset: 'transactions',
                        algorithm: 'dbscan',
                        useCase: 'Retail Analytics',
                        tags: ['basket', 'transactions', 'patterns']
                    },
                    {
                        id: 'fraud-detection',
                        title: 'Fraud Detection',
                        description: 'Identify anomalous transaction patterns',
                        difficulty: 'Advanced',
                        dataset: 'financial',
                        algorithm: 'dbscan',
                        useCase: 'Risk Management',
                        tags: ['fraud', 'anomaly', 'security', 'finance']
                    }
                ]
            },
            'social-media': {
                title: 'Social Media Analytics',
                icon: '📱',
                description: 'Analyze social networks and user behavior patterns',
                examples: [
                    {
                        id: 'community-detection',
                        title: 'Community Detection',
                        description: 'Find communities in social networks',
                        difficulty: 'Intermediate',
                        dataset: 'social-media',
                        algorithm: 'hierarchical',
                        useCase: 'Social Networks',
                        tags: ['community', 'networks', 'social']
                    },
                    {
                        id: 'sentiment-clustering',
                        title: 'Sentiment-based User Grouping',
                        description: 'Group users by sentiment patterns in their posts',
                        difficulty: 'Advanced',
                        dataset: 'social-sentiment',
                        algorithm: 'kmeans',
                        useCase: 'Content Analysis',
                        tags: ['sentiment', 'nlp', 'content']
                    },
                    {
                        id: 'influencer-analysis',
                        title: 'Influencer Network Analysis',
                        description: 'Identify influential users and their networks',
                        difficulty: 'Advanced',
                        dataset: 'influencers',
                        algorithm: 'dbscan',
                        useCase: 'Marketing Research',
                        tags: ['influencers', 'networks', 'marketing']
                    }
                ]
            },
            'scientific': {
                title: 'Scientific & Research',
                icon: '🔬',
                description: 'Scientific data analysis and research applications',
                examples: [
                    {
                        id: 'gene-expression',
                        title: 'Gene Expression Analysis',
                        description: 'Cluster genes by expression patterns',
                        difficulty: 'Advanced',
                        dataset: 'gene-expression',
                        algorithm: 'hierarchical',
                        useCase: 'Bioinformatics',
                        tags: ['bioinformatics', 'genes', 'expression']
                    },
                    {
                        id: 'climate-patterns',
                        title: 'Climate Pattern Recognition',
                        description: 'Identify climate zones and weather patterns',
                        difficulty: 'Intermediate',
                        dataset: 'climate',
                        algorithm: 'kmeans',
                        useCase: 'Environmental Science',
                        tags: ['climate', 'weather', 'patterns']
                    },
                    {
                        id: 'medical-diagnosis',
                        title: 'Medical Diagnosis Support',
                        description: 'Group patients by symptoms and test results',
                        difficulty: 'Advanced',
                        dataset: 'medical',
                        algorithm: 'ncs',
                        useCase: 'Healthcare',
                        tags: ['medical', 'diagnosis', 'healthcare']
                    }
                ]
            },
            'advanced': {
                title: 'Advanced Techniques',
                icon: '🎯',
                description: 'Advanced clustering methods and optimizations',
                examples: [
                    {
                        id: 'ensemble-clustering',
                        title: 'Ensemble Clustering',
                        description: 'Combine multiple algorithms for better results',
                        difficulty: 'Expert',
                        dataset: 'complex',
                        algorithm: 'ensemble',
                        useCase: 'Advanced Analytics',
                        tags: ['ensemble', 'advanced', 'combination']
                    },
                    {
                        id: 'streaming-clustering',
                        title: 'Real-time Streaming Data',
                        description: 'Cluster data streams in real-time',
                        difficulty: 'Expert',
                        dataset: 'stream',
                        algorithm: 'ncs',
                        useCase: 'Real-time Analytics',
                        tags: ['streaming', 'realtime', 'online']
                    },
                    {
                        id: 'distributed-clustering',
                        title: 'Distributed Clustering',
                        description: 'Scale clustering across multiple nodes',
                        difficulty: 'Expert',
                        dataset: 'big-data',
                        algorithm: 'distributed',
                        useCase: 'Big Data',
                        tags: ['distributed', 'scalability', 'big-data']
                    }
                ]
            }
        };
        
        // Code templates for different languages
        this.codeTemplates = {
            javascript: {
                basic: `// Basic NCS-API clustering example
const response = await fetch('https://api.ncs-clustering.com/v1/cluster', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
        algorithm: 'kmeans',
        data: data,
        parameters: {
            k: 3,
            maxIterations: 100
        }
    })
});

const result = await response.json();
console.log('Clusters:', result.clusters);`,
                
                preprocessing: `// Data preprocessing example
import { DataProcessor } from 'ncs-clustering-sdk';

const processor = new DataProcessor();

// Clean and normalize data
const cleanData = processor
    .removeNulls(rawData)
    .normalizeFeatures(['age', 'income', 'spending'])
    .handleOutliers('iqr')
    .getProcessedData();

// Run clustering on clean data
const clusters = await processor.cluster('kmeans', {
    k: 4,
    data: cleanData
});`
            },
            python: {
                basic: `# Basic NCS-API clustering with Python
import requests
import json

# Prepare the data
data = [
    {"age": 25, "income": 50000, "spending": 1200},
    {"age": 35, "income": 75000, "spending": 2000},
    {"age": 45, "income": 100000, "spending": 2500}
]

# API request
response = requests.post(
    'https://api.ncs-clustering.com/v1/cluster',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'algorithm': 'kmeans',
        'data': data,
        'parameters': {
            'k': 3,
            'max_iterations': 100
        }
    }
)

result = response.json()
print(f"Clusters: {result['clusters']}")`,
                
                preprocessing: `# Data preprocessing with pandas
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import requests

# Load and preprocess data
df = pd.read_csv('customer_data.csv')

# Handle missing values
df = df.dropna()

# Normalize features
scaler = StandardScaler()
features = ['age', 'income', 'spending_score']
df[features] = scaler.fit_transform(df[features])

# Convert to API format
data = df[features].to_dict('records')

# Send to NCS-API
response = requests.post(
    'https://api.ncs-clustering.com/v1/cluster',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json={
        'algorithm': 'kmeans',
        'data': data,
        'parameters': {'k': 4}
    }
)

clusters = response.json()['clusters']
df['cluster'] = clusters

print(df.groupby('cluster').mean())`
            },
            r: {
                basic: `# Basic NCS-API clustering with R
library(httr)
library(jsonlite)

# Prepare data
data <- data.frame(
    age = c(25, 35, 45, 30, 40),
    income = c(50000, 75000, 100000, 60000, 80000),
    spending = c(1200, 2000, 2500, 1500, 2200)
)

# Convert to list format for JSON
data_list <- lapply(seq_len(nrow(data)), function(i) {
    as.list(data[i, ])
})

# API request
response <- POST(
    "https://api.ncs-clustering.com/v1/cluster",
    add_headers(
        "Content-Type" = "application/json",
        "Authorization" = "Bearer YOUR_API_KEY"
    ),
    body = list(
        algorithm = "kmeans",
        data = data_list,
        parameters = list(
            k = 3,
            maxIterations = 100
        )
    ),
    encode = "json"
)

result <- content(response, "parsed")
clusters <- result$clusters

print(paste("Found", length(unique(clusters)), "clusters"))`
            },
            curl: {
                basic: `# Basic clustering with cURL
curl -X POST "https://api.ncs-clustering.com/v1/cluster" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "algorithm": "kmeans",
    "data": [
      {"age": 25, "income": 50000, "spending": 1200},
      {"age": 35, "income": 75000, "spending": 2000},
      {"age": 45, "income": 100000, "spending": 2500}
    ],
    "parameters": {
      "k": 3,
      "maxIterations": 100
    }
  }'`
            }
        };
        
        this.init();
    }

    /**
     * Initialize the examples page
     */
    async init() {
        console.log('🚀 Initializing Examples Page...');
        
        try {
            await this.setupUI();
            this.setupEventListeners();
            this.loadDefaultExample();
            
            console.log('✅ Examples page initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing examples page:', error);
            this.showError('Failed to initialize examples page');
        }
    }

    /**
     * Setup the user interface
     */
    async setupUI() {
        this.container.innerHTML = `
            <div class="examples-page">
                <!-- Header Section -->
                <header class="page-header">
                    <div class="container">
                        <div class="header-content">
                            <h1 class="page-title">
                                <span class="title-icon">💡</span>
                                Examples & Use Cases
                            </h1>
                            <p class="page-subtitle">
                                Real-world clustering examples with complete code and data
                            </p>
                        </div>
                        
                        <div class="header-filters">
                            <div class="filter-group">
                                <label>Difficulty:</label>
                                <select id="difficulty-filter" class="form-control">
                                    <option value="all">All Levels</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label>Algorithm:</label>
                                <select id="algorithm-filter" class="form-control">
                                    <option value="all">All Algorithms</option>
                                    <option value="kmeans">K-Means</option>
                                    <option value="dbscan">DBSCAN</option>
                                    <option value="hierarchical">Hierarchical</option>
                                    <option value="ncs">NCS Algorithm</option>
                                </select>
                            </div>
                            
                            <div class="filter-group">
                                <label>Use Case:</label>
                                <select id="usecase-filter" class="form-control">
                                    <option value="all">All Use Cases</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="finance">Finance</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="social">Social Media</option>
                                </select>
                            </div>
                            
                            <button id="clear-filters" class="btn btn-outline">Clear Filters</button>
                        </div>
                    </div>
                </header>

                <!-- Examples Browser -->
                <section class="examples-browser">
                    <div class="container">
                        <div class="browser-layout">
                            <!-- Sidebar with Categories -->
                            <aside class="examples-sidebar">
                                <div class="sidebar-header">
                                    <h3>Categories</h3>
                                    <div class="search-box">
                                        <input type="text" id="example-search" placeholder="Search examples..." class="form-control">
                                        <span class="search-icon">🔍</span>
                                    </div>
                                </div>
                                
                                <nav class="categories-nav" id="categories-nav">
                                    <!-- Categories will be inserted here -->
                                </nav>
                            </aside>

                            <!-- Main Content Area -->
                            <main class="examples-content">
                                <!-- Example Details -->
                                <div class="example-details" id="example-details">
                                    <div class="example-header">
                                        <div class="example-meta">
                                            <h2 id="example-title">Select an Example</h2>
                                            <div class="example-badges">
                                                <span class="badge difficulty-badge" id="difficulty-badge"></span>
                                                <span class="badge algorithm-badge" id="algorithm-badge"></span>
                                                <span class="badge usecase-badge" id="usecase-badge"></span>
                                            </div>
                                        </div>
                                        
                                        <div class="example-actions">
                                            <button id="run-example" class="btn btn-primary">
                                                <span class="btn-icon">▶️</span>
                                                Run Example
                                            </button>
                                            <button id="download-example" class="btn btn-secondary">
                                                <span class="btn-icon">💾</span>
                                                Download
                                            </button>
                                            <button id="copy-code" class="btn btn-outline">
                                                <span class="btn-icon">📋</span>
                                                Copy Code
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div class="example-description" id="example-description">
                                        <p>Choose an example from the sidebar to get started with clustering.</p>
                                    </div>
                                </div>

                                <!-- Code Editor -->
                                <div class="code-section">
                                    <div class="code-header">
                                        <div class="language-tabs" id="language-tabs">
                                            <button class="tab-button active" data-language="javascript">JavaScript</button>
                                            <button class="tab-button" data-language="python">Python</button>
                                            <button class="tab-button" data-language="r">R</button>
                                            <button class="tab-button" data-language="curl">cURL</button>
                                        </div>
                                        
                                        <div class="code-actions">
                                            <button id="format-code" class="btn-icon" title="Format Code">🎨</button>
                                            <button id="full-screen" class="btn-icon" title="Full Screen">🔍</button>
                                            <button id="copy-code-btn" class="btn-icon" title="Copy to Clipboard">📋</button>
                                        </div>
                                    </div>
                                    
                                    <div class="code-editor">
                                        <pre id="code-display"><code id="code-content">// Select an example to view its code</code></pre>
                                    </div>
                                </div>

                                <!-- Data Preview -->
                                <div class="data-section">
                                    <div class="section-header">
                                        <h3>Sample Data</h3>
                                        <div class="data-actions">
                                            <button id="view-full-data" class="btn btn-outline">View Full Dataset</button>
                                            <button id="download-data" class="btn btn-outline">Download CSV</button>
                                        </div>
                                    </div>
                                    
                                    <div class="data-preview" id="data-preview">
                                        <table class="data-table">
                                            <thead id="data-header">
                                                <!-- Data headers will be inserted here -->
                                            </thead>
                                            <tbody id="data-body">
                                                <!-- Data rows will be inserted here -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Results Visualization -->
                                <div class="results-section" id="results-section" style="display: none;">
                                    <div class="section-header">
                                        <h3>Clustering Results</h3>
                                        <div class="results-actions">
                                            <button id="export-results" class="btn btn-secondary">Export Results</button>
                                            <button id="share-results" class="btn btn-outline">Share</button>
                                        </div>
                                    </div>
                                    
                                    <div class="results-content">
                                        <div class="visualization-container">
                                            <div id="cluster-visualization" class="cluster-viz"></div>
                                        </div>
                                        
                                        <div class="results-summary">
                                            <h4>Summary</h4>
                                            <div class="summary-stats" id="summary-stats">
                                                <!-- Summary statistics will be inserted here -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </main>
                        </div>
                    </div>
                </section>

                <!-- Tutorial Modal -->
                <div id="tutorial-modal" class="modal">
                    <div class="modal-content tutorial-content">
                        <div class="modal-header">
                            <h3 id="tutorial-title">Step-by-Step Tutorial</h3>
                            <button class="modal-close" id="close-tutorial">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="tutorial-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="tutorial-progress"></div>
                                </div>
                                <span class="progress-text" id="tutorial-step">Step 1 of 5</span>
                            </div>
                            
                            <div class="tutorial-content-area" id="tutorial-content">
                                <!-- Tutorial steps will be inserted here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="prev-step" class="btn btn-secondary">← Previous</button>
                            <button id="next-step" class="btn btn-primary">Next →</button>
                            <button id="finish-tutorial" class="btn btn-success" style="display: none;">Finish</button>
                        </div>
                    </div>
                </div>

                <!-- Data Modal -->
                <div id="data-modal" class="modal">
                    <div class="modal-content data-modal-content">
                        <div class="modal-header">
                            <h3>Complete Dataset</h3>
                            <button class="modal-close" id="close-data-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="data-upload-section">
                                <h4>Upload Your Own Data</h4>
                                <div id="data-uploader-container"></div>
                            </div>
                            
                            <div class="full-data-display" id="full-data-display">
                                <!-- Full dataset will be displayed here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="use-uploaded-data" class="btn btn-primary">Use This Data</button>
                            <button id="reset-to-sample" class="btn btn-outline">Reset to Sample</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize components
        this.initializeComponents();
    }

    /**
     * Initialize sub-components
     */
    initializeComponents() {
        // Code generator
        this.codeGenerator = new CodeGenerator(document.getElementById('code-content'), {
            supportedLanguages: ['javascript', 'python', 'r', 'curl'],
            defaultLanguage: 'javascript',
            enableSyntaxHighlighting: true,
            enableLineNumbers: true
        });

        // Data uploader (for data modal)
        const uploaderContainer = document.getElementById('data-uploader-container');
        if (uploaderContainer) {
            this.dataUploader = new DataUploader(uploaderContainer, {
                maxFileSize: 5 * 1024 * 1024, // 5MB
                acceptedTypes: ['csv', 'json'],
                autoProcess: true,
                onDataReady: (data) => this.onCustomDataUploaded(data)
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter controls
        document.getElementById('difficulty-filter').addEventListener('change', (e) => this.filterExamples());
        document.getElementById('algorithm-filter').addEventListener('change', (e) => this.filterExamples());
        document.getElementById('usecase-filter').addEventListener('change', (e) => this.filterExamples());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        
        // Search
        document.getElementById('example-search').addEventListener('input', (e) => this.searchExamples(e.target.value));
        
        // Example actions
        document.getElementById('run-example').addEventListener('click', () => this.runCurrentExample());
        document.getElementById('download-example').addEventListener('click', () => this.downloadCurrentExample());
        document.getElementById('copy-code').addEventListener('click', () => this.copyCodeToClipboard());
        
        // Language tabs
        document.getElementById('language-tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                this.switchLanguage(e.target.dataset.language);
            }
        });
        
        // Code actions
        document.getElementById('format-code').addEventListener('click', () => this.formatCode());
        document.getElementById('full-screen').addEventListener('click', () => this.toggleFullScreen());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyCodeToClipboard());
        
        // Data actions
        document.getElementById('view-full-data').addEventListener('click', () => this.showDataModal());
        document.getElementById('download-data').addEventListener('click', () => this.downloadCurrentData());
        
        // Results actions
        document.getElementById('export-results').addEventListener('click', () => this.exportResults());
        document.getElementById('share-results').addEventListener('click', () => this.shareResults());
        
        // Modal controls
        document.getElementById('close-tutorial').addEventListener('click', () => this.closeTutorialModal());
        document.getElementById('close-data-modal').addEventListener('click', () => this.closeDataModal());
        
        // Tutorial navigation
        document.getElementById('prev-step').addEventListener('click', () => this.previousTutorialStep());
        document.getElementById('next-step').addEventListener('click', () => this.nextTutorialStep());
        document.getElementById('finish-tutorial').addEventListener('click', () => this.finishTutorial());
        
        // Custom data
        document.getElementById('use-uploaded-data').addEventListener('click', () => this.useUploadedData());
        document.getElementById('reset-to-sample').addEventListener('click', () => this.resetToSampleData());
        
        // Event bus listeners
        this.eventBus.on('example:selected', (example) => this.loadExample(example));
        this.eventBus.on('clustering:complete', (results) => this.displayResults(results));
        this.eventBus.on('data:uploaded', (data) => this.onCustomDataUploaded(data));
    }

    /**
     * Load default example
     */
    loadDefaultExample() {
        this.renderCategoriesNav();
        
        // Load first example from getting-started category
        const firstExample = this.examples['getting-started'].examples[0];
        this.loadExample(firstExample);
    }

    /**
     * Render categories navigation
     */
    renderCategoriesNav() {
        const nav = document.getElementById('categories-nav');
        
        nav.innerHTML = Object.entries(this.examples).map(([categoryId, category]) => `
            <div class="category-section ${this.state.expandedSections.has(categoryId) ? 'expanded' : ''}">
                <div class="category-header" data-category="${categoryId}">
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-title">${category.title}</span>
                    <span class="expand-icon">▼</span>
                </div>
                
                <div class="category-examples">
                    ${category.examples.map(example => `
                        <div class="example-item ${this.state.currentExample?.id === example.id ? 'active' : ''}" 
                             data-example-id="${example.id}">
                            <div class="example-title">${example.title}</div>
                            <div class="example-meta">
                                <span class="difficulty ${example.difficulty.toLowerCase()}">${example.difficulty}</span>
                                <span class="algorithm">${example.algorithm}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        nav.addEventListener('click', (e) => {
            if (e.target.closest('.category-header')) {
                const categoryId = e.target.closest('.category-header').dataset.category;
                this.toggleCategoryExpansion(categoryId);
            } else if (e.target.closest('.example-item')) {
                const exampleId = e.target.closest('.example-item').dataset.exampleId;
                const example = this.findExampleById(exampleId);
                if (example) {
                    this.loadExample(example);
                }
            }
        });
    }

    /**
     * Load and display an example
     */
    async loadExample(example) {
        this.state.currentExample = example;
        
        // Update UI
        this.updateExampleDetails(example);
        this.updateCodeDisplay(example);
        this.updateDataPreview(example);
        this.updateActiveExample(example.id);
        
        // Hide results until run
        document.getElementById('results-section').style.display = 'none';
    }

    /**
     * Update example details section
     */
    updateExampleDetails(example) {
        document.getElementById('example-title').textContent = example.title;
        document.getElementById('example-description').innerHTML = `
            <p>${example.description}</p>
            <div class="example-tags">
                ${example.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
        `;
        
        // Update badges
        document.getElementById('difficulty-badge').textContent = example.difficulty;
        document.getElementById('difficulty-badge').className = `badge difficulty-badge ${example.difficulty.toLowerCase()}`;
        document.getElementById('algorithm-badge').textContent = example.algorithm.toUpperCase();
        document.getElementById('usecase-badge').textContent = example.useCase;
    }

    /**
     * Update code display
     */
    updateCodeDisplay(example) {
        const language = this.state.currentLanguage;
        const template = this.getCodeTemplate(example, language);
        
        this.codeGenerator.setCode(template, language);
        document.getElementById('code-content').textContent = template;
        
        // Highlight syntax if available
        if (window.hljs) {
            window.hljs.highlightElement(document.getElementById('code-content'));
        }
    }

    /**
     * Get code template for example and language
     */
    getCodeTemplate(example, language) {
        const baseTemplate = this.codeTemplates[language]?.basic || this.codeTemplates.javascript.basic;
        
        // Customize template based on example
        let template = baseTemplate;
        
        // Replace algorithm
        template = template.replace(/kmeans/g, example.algorithm);
        
        // Replace parameters based on algorithm
        const params = this.getAlgorithmParameters(example.algorithm);
        template = template.replace(
            /"parameters":\s*{[^}]*}/,
            `"parameters": ${JSON.stringify(params, null, 8)}`
        );
        
        return template;
    }

    /**
     * Get algorithm-specific parameters
     */
    getAlgorithmParameters(algorithm) {
        const params = {
            kmeans: { k: 3, maxIterations: 100 },
            dbscan: { eps: 0.5, minPts: 5 },
            hierarchical: { linkage: 'ward', n_clusters: 3 },
            ncs: { threshold: 0.1, iterations: 50 },
            ensemble: { algorithms: ['kmeans', 'dbscan'], voting: 'majority' }
        };
        
        return params[algorithm] || params.kmeans;
    }

    /**
     * Update data preview
     */
    async updateDataPreview(example) {
        try {
            const sampleData = await this.loadSampleData(example.dataset);
            
            if (sampleData && sampleData.length > 0) {
                const headers = Object.keys(sampleData[0]);
                const previewRows = sampleData.slice(0, 5); // Show first 5 rows
                
                // Update table headers
                document.getElementById('data-header').innerHTML = `
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                `;
                
                // Update table body
                document.getElementById('data-body').innerHTML = previewRows.map(row => `
                    <tr>
                        ${headers.map(header => `<td>${row[header]}</td>`).join('')}
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading sample data:', error);
            document.getElementById('data-preview').innerHTML = '<p>Error loading sample data</p>';
        }
    }

    /**
     * Load sample data for dataset
     */
    async loadSampleData(dataset) {
        const datasetMap = {
            customers: '/assets/data/customers.csv',
            ecommerce: '/assets/data/ecommerce.csv',
            'social-media': '/assets/data/social-media.csv',
            financial: '/assets/data/financial.csv',
            iris: '/assets/data/iris.csv'
        };
        
        const dataPath = datasetMap[dataset];
        if (!dataPath) {
            return this.generateSampleData(dataset);
        }
        
        try {
            const response = await fetch(dataPath);
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.warn(`Could not load ${dataPath}, generating sample data`);
            return this.generateSampleData(dataset);
        }
    }

    /**
     * Parse CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                row[header] = isNaN(value) ? value : parseFloat(value);
            });
            return row;
        });
    }

    /**
     * Generate sample data for dataset
     */
    generateSampleData(dataset) {
        const generators = {
            customers: () => Array.from({ length: 20 }, (_, i) => ({
                customer_id: i + 1,
                age: Math.floor(Math.random() * 50) + 20,
                income: Math.floor(Math.random() * 80000) + 30000,
                spending_score: Math.floor(Math.random() * 100),
                gender: Math.random() > 0.5 ? 'Male' : 'Female'
            })),
            
            iris: () => Array.from({ length: 20 }, () => ({
                sepal_length: (Math.random() * 3 + 4).toFixed(1),
                sepal_width: (Math.random() * 2 + 2).toFixed(1),
                petal_length: (Math.random() * 5 + 1).toFixed(1),
                petal_width: (Math.random() * 2 + 0.1).toFixed(1),
                species: ['setosa', 'versicolor', 'virginica'][Math.floor(Math.random() * 3)]
            }))
        };
        
        return generators[dataset] ? generators[dataset]() : generators.customers();
    }

    /**
     * Run current example
     */
    async runCurrentExample() {
        if (!this.state.currentExample || this.state.isRunning) return;
        
        this.state.isRunning = true;
        document.getElementById('run-example').disabled = true;
        document.getElementById('run-example').innerHTML = '<span class="btn-icon">⏳</span> Running...';
        
        try {
            const sampleData = await this.loadSampleData(this.state.currentExample.dataset);
            
            const response = await this.apiClient.post('/cluster', {
                algorithm: this.state.currentExample.algorithm,
                data: sampleData,
                parameters: this.getAlgorithmParameters(this.state.currentExample.algorithm)
            });
            
            if (response.success) {
                this.displayResults(response.data);
            } else {
                throw new Error(response.error || 'Clustering failed');
            }
            
        } catch (error) {
            console.error('Error running example:', error);
            this.showError(`Failed to run example: ${error.message}`);
        } finally {
            this.state.isRunning = false;
            document.getElementById('run-example').disabled = false;
            document.getElementById('run-example').innerHTML = '<span class="btn-icon">▶️</span> Run Example';
        }
    }

    /**
     * Display clustering results
     */
    displayResults(results) {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';
        
        // Initialize cluster visualizer if not already done
        if (!this.clusterVisualizer) {
            this.clusterVisualizer = new ClusterVisualizer(
                document.getElementById('cluster-visualization'),
                {
                    width: 600,
                    height: 400,
                    enableInteraction: true,
                    showLegend: true
                }
            );
        }
        
        // Visualize results
        this.clusterVisualizer.render(results.data, results.clusters);
        
        // Update summary statistics
        this.updateResultsSummary(results);
        
        this.state.results = results;
    }

    /**
     * Update results summary
     */
    updateResultsSummary(results) {
        const summary = document.getElementById('summary-stats');
        
        const numClusters = Math.max(...results.clusters) + 1;
        const clusterSizes = new Array(numClusters).fill(0);
        results.clusters.forEach(cluster => clusterSizes[cluster]++);
        
        summary.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Number of Clusters:</span>
                <span class="stat-value">${numClusters}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Data Points:</span>
                <span class="stat-value">${results.data.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Largest Cluster:</span>
                <span class="stat-value">${Math.max(...clusterSizes)} points</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Quality Score:</span>
                <span class="stat-value">${(results.quality || 0.85).toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Processing Time:</span>
                <span class="stat-value">${results.processingTime || 245}ms</span>
            </div>
        `;
    }

    /**
     * Helper methods
     */
    switchLanguage(language) {
        this.state.currentLanguage = language;
        
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-language="${language}"]`).classList.add('active');
        
        // Update code display
        if (this.state.currentExample) {
            this.updateCodeDisplay(this.state.currentExample);
        }
    }

    findExampleById(id) {
        for (const category of Object.values(this.examples)) {
            const example = category.examples.find(ex => ex.id === id);
            if (example) return example;
        }
        return null;
    }

    toggleCategoryExpansion(categoryId) {
        const section = document.querySelector(`[data-category="${categoryId}"]`).closest('.category-section');
        
        if (this.state.expandedSections.has(categoryId)) {
            this.state.expandedSections.delete(categoryId);
            section.classList.remove('expanded');
        } else {
            this.state.expandedSections.add(categoryId);
            section.classList.add('expanded');
        }
    }

    updateActiveExample(exampleId) {
        document.querySelectorAll('.example-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-example-id="${exampleId}"]`)?.classList.add('active');
    }

    copyCodeToClipboard() {
        const code = document.getElementById('code-content').textContent;
        navigator.clipboard.writeText(code).then(() => {
            this.showSuccess('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code:', err);
            this.showError('Failed to copy code');
        });
    }

    downloadCurrentExample() {
        if (!this.state.currentExample) return;
        
        const example = this.state.currentExample;
        const language = this.state.currentLanguage;
        const code = document.getElementById('code-content').textContent;
        
        const fileExtensions = {
            javascript: 'js',
            python: 'py',
            r: 'R',
            curl: 'sh'
        };
        
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${example.id}.${fileExtensions[language]}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    filterExamples() {
        const difficulty = document.getElementById('difficulty-filter').value;
        const algorithm = document.getElementById('algorithm-filter').value;
        const useCase = document.getElementById('usecase-filter').value;
        
        // Filter logic implementation
        console.log('Filtering examples:', { difficulty, algorithm, useCase });
        // This would filter the displayed examples based on the selected criteria
    }

    clearFilters() {
        document.getElementById('difficulty-filter').value = 'all';
        document.getElementById('algorithm-filter').value = 'all';
        document.getElementById('usecase-filter').value = 'all';
        this.filterExamples();
    }

    searchExamples(query) {
        // Search implementation
        console.log('Searching examples:', query);
        // This would filter examples based on the search query
    }

    showError(message) {
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.error(message);
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.NCS && window.NCS.toast) {
            window.NCS.toast.success(message);
        } else {
            console.log(message);
        }
    }

    showDataModal() {
        document.getElementById('data-modal').style.display = 'block';
    }

    closeDataModal() {
        document.getElementById('data-modal').style.display = 'none';
    }

    closeTutorialModal() {
        document.getElementById('tutorial-modal').style.display = 'none';
    }

    // Placeholder methods for additional functionality
    formatCode() { console.log('Format code'); }
    toggleFullScreen() { console.log('Toggle full screen'); }
    downloadCurrentData() { console.log('Download current data'); }
    exportResults() { console.log('Export results'); }
    shareResults() { console.log('Share results'); }
    previousTutorialStep() { console.log('Previous tutorial step'); }
    nextTutorialStep() { console.log('Next tutorial step'); }
    finishTutorial() { console.log('Finish tutorial'); }
    onCustomDataUploaded(data) { console.log('Custom data uploaded:', data); }
    useUploadedData() { console.log('Use uploaded data'); }
    resetToSampleData() { console.log('Reset to sample data'); }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.examples = new ExamplesPage();
    });
} else {
    window.examples = new ExamplesPage();
}