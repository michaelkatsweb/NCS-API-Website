# API Integration Guide

> **Complete guide for integrating with the NCS Clustering API**

This document provides comprehensive instructions for integrating the NCS Clustering API into your applications, including authentication, endpoints, SDKs, and best practices.

## 📋 **Table of Contents**

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [SDKs & Libraries](#sdks--libraries)
5. [Data Formats](#data-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [WebSocket Integration](#websocket-integration)
9. [Examples by Language](#examples-by-language)
10. [Best Practices](#best-practices)

---

## 🚀 **Quick Start**

### 1. Get API Key
```bash
# Sign up at https://ncs-clustering.com
# Get your API key from the dashboard
export NCS_API_KEY="ncs_live_abc123..."
```

### 2. Make Your First Request
```bash
curl -X POST "https://api.ncs-clustering.com/v1/cluster" \
  -H "Authorization: Bearer $NCS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "kmeans",
    "data": [
      {"x": 1, "y": 2},
      {"x": 3, "y": 4},
      {"x": 5, "y": 6}
    ],
    "parameters": {
      "k": 2
    }
  }'
```

### 3. Expected Response
```json
{
  "success": true,
  "data": {
    "clusters": [0, 1, 1],
    "centroids": [
      {"x": 1, "y": 2},
      {"x": 4, "y": 5}
    ],
    "quality": {
      "silhouette_score": 0.85,
      "inertia": 12.5
    }
  },
  "meta": {
    "processing_time": 145,
    "algorithm": "kmeans",
    "parameters": {"k": 2}
  }
}
```

---

## 🔐 **Authentication**

### API Key Authentication
```javascript
// Include in all requests
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};
```

### OAuth 2.0 (Enterprise)
```javascript
// Get access token
const tokenResponse = await fetch('https://api.ncs-clustering.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    scope: 'clustering:read clustering:write'
  })
});

const { access_token } = await tokenResponse.json();

// Use access token
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

### JWT Authentication (Custom)
```javascript
// For custom authentication setups
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { 
    sub: 'user_id',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  },
  'your_secret_key'
);

const headers = {
  'Authorization': `JWT ${token}`,
  'Content-Type': 'application/json'
};
```

---

## 🛠️ **API Endpoints**

### Base URL
```
Production: https://api.ncs-clustering.com/v1
Staging:    https://staging-api.ncs-clustering.com/v1
```

### Core Endpoints

#### **POST /cluster** - Run Clustering
```http
POST /v1/cluster
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "algorithm": "kmeans|dbscan|hierarchical|ncs",
  "data": [...],
  "parameters": {...},
  "options": {...}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clusters": [0, 1, 0, 1, ...],
    "centroids": [...],
    "quality": {...}
  },
  "meta": {
    "processing_time": 145,
    "data_points": 1000,
    "algorithm": "kmeans"
  }
}
```

#### **GET /cluster/{id}** - Get Clustering Results
```http
GET /v1/cluster/abc123
Authorization: Bearer YOUR_API_KEY
```

#### **POST /data/upload** - Upload Data
```http
POST /v1/data/upload
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY

file: [CSV/JSON file]
```

#### **GET /algorithms** - List Available Algorithms
```http
GET /v1/algorithms
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "algorithms": [
    {
      "name": "kmeans",
      "description": "K-Means clustering algorithm",
      "parameters": {
        "k": {
          "type": "integer",
          "min": 1,
          "max": 50,
          "default": 3,
          "description": "Number of clusters"
        },
        "max_iterations": {
          "type": "integer",
          "min": 10,
          "max": 1000,
          "default": 100
        }
      }
    }
  ]
}
```

### Data Management

#### **POST /data/validate** - Validate Data
```http
POST /v1/data/validate
Content-Type: application/json

{
  "data": [...],
  "schema": "auto|custom"
}
```

#### **POST /data/preprocess** - Preprocess Data
```http
POST /v1/data/preprocess
Content-Type: application/json

{
  "data": [...],
  "operations": ["normalize", "remove_outliers", "fill_missing"]
}
```

### Analytics & Monitoring

#### **GET /analytics/usage** - Usage Statistics
```http
GET /v1/analytics/usage?period=30d
Authorization: Bearer YOUR_API_KEY
```

#### **GET /analytics/performance** - Performance Metrics
```http
GET /v1/analytics/performance?algorithm=kmeans
Authorization: Bearer YOUR_API_KEY
```

---

## 📚 **SDKs & Libraries**

### JavaScript/Node.js SDK

#### Installation
```bash
npm install ncs-clustering-sdk
```

#### Usage
```javascript
import { NCSClient } from 'ncs-clustering-sdk';

const client = new NCSClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.ncs-clustering.com/v1'
});

// Basic clustering
const result = await client.cluster({
  algorithm: 'kmeans',
  data: [
    { x: 1, y: 2 },
    { x: 3, y: 4 }
  ],
  parameters: { k: 2 }
});

console.log('Clusters:', result.clusters);
console.log('Centroids:', result.centroids);
```

#### Advanced Features
```javascript
// Upload and cluster file
const fileResult = await client.uploadAndCluster({
  file: fileInput.files[0],
  algorithm: 'dbscan',
  parameters: { eps: 0.5, min_samples: 5 }
});

// Real-time clustering with WebSocket
const stream = client.createClusteringStream({
  algorithm: 'ncs',
  parameters: { threshold: 0.1 }
});

stream.on('result', (result) => {
  console.log('Real-time result:', result);
});

stream.addData([{ x: 5, y: 6 }]);
```

### Python SDK

#### Installation
```bash
pip install ncs-clustering-python
```

#### Usage
```python
from ncs_clustering import NCSClient
import pandas as pd

# Initialize client
client = NCSClient(api_key='your-api-key')

# Load data
data = pd.read_csv('data.csv')

# Run clustering
result = client.cluster(
    algorithm='kmeans',
    data=data.to_dict('records'),
    parameters={'k': 3}
)

print(f"Clusters: {result.clusters}")
print(f"Quality score: {result.quality.silhouette_score}")

# Visualize results
import matplotlib.pyplot as plt

plt.scatter(data['x'], data['y'], c=result.clusters)
plt.title('Clustering Results')
plt.show()
```

#### Async Support
```python
import asyncio
from ncs_clustering import AsyncNCSClient

async def cluster_data():
    client = AsyncNCSClient(api_key='your-api-key')
    
    result = await client.cluster(
        algorithm='dbscan',
        data=data,
        parameters={'eps': 0.5, 'min_samples': 5}
    )
    
    return result

# Run async clustering
result = asyncio.run(cluster_data())
```

### R SDK

#### Installation
```r
install.packages("ncs.clustering")
```

#### Usage
```r
library(ncs.clustering)
library(ggplot2)

# Initialize client
client <- ncs_client(api_key = "your-api-key")

# Load and prepare data
data <- read.csv("data.csv")

# Run clustering
result <- ncs_cluster(
  client = client,
  algorithm = "hierarchical",
  data = data,
  parameters = list(
    n_clusters = 4,
    linkage = "ward"
  )
)

# Visualize results
ggplot(data, aes(x = x, y = y, color = factor(result$clusters))) +
  geom_point() +
  labs(title = "Hierarchical Clustering Results")
```

---

## 📄 **Data Formats**

### Supported Input Formats

#### JSON Array of Objects
```json
[
  {"x": 1.5, "y": 2.3, "feature3": 0.8},
  {"x": 2.1, "y": 1.9, "feature3": 1.2},
  {"x": 3.4, "y": 4.1, "feature3": 2.1}
]
```

#### CSV Data
```csv
x,y,feature3
1.5,2.3,0.8
2.1,1.9,1.2
3.4,4.1,2.1
```

#### Matrix Format
```json
{
  "data": [
    [1.5, 2.3, 0.8],
    [2.1, 1.9, 1.2],
    [3.4, 4.1, 2.1]
  ],
  "columns": ["x", "y", "feature3"]
}
```

### Data Requirements

#### Minimum Requirements
- **Data Points**: Minimum 3 points
- **Features**: At least 1 numeric feature
- **Format**: JSON, CSV, or structured data

#### Recommendations
- **Data Points**: 50-50,000 for optimal performance
- **Features**: 2-20 features work best
- **Data Quality**: Clean, normalized data preferred

#### Data Validation Schema
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "minItems": 3,
      "maxItems": 100000,
      "items": {
        "type": "object",
        "additionalProperties": {
          "type": "number"
        }
      }
    },
    "algorithm": {
      "type": "string",
      "enum": ["kmeans", "dbscan", "hierarchical", "ncs"]
    },
    "parameters": {
      "type": "object"
    }
  },
  "required": ["data", "algorithm"]
}
```

---

## ⚠️ **Error Handling**

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATA",
    "message": "Data contains invalid values",
    "details": {
      "invalid_rows": [5, 12, 18],
      "reason": "Non-numeric values in numeric columns"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTHENTICATION_FAILED` | Invalid API key | Check your API key |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry |
| `INVALID_DATA` | Data format issues | Validate data format |
| `ALGORITHM_ERROR` | Algorithm execution failed | Check parameters |
| `INSUFFICIENT_DATA` | Not enough data points | Provide more data |
| `SERVER_ERROR` | Internal server error | Contact support |

### Error Handling Examples

#### JavaScript
```javascript
try {
  const result = await client.cluster(data);
  console.log('Success:', result);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Wait and retry
    setTimeout(() => {
      client.cluster(data);
    }, error.retryAfter * 1000);
  } else if (error.code === 'INVALID_DATA') {
    console.error('Data validation failed:', error.details);
    // Clean and reformat data
  } else {
    console.error('Clustering failed:', error.message);
  }
}
```

#### Python
```python
from ncs_clustering.exceptions import (
    AuthenticationError,
    RateLimitError,
    ValidationError
)

try:
    result = client.cluster(data=data, algorithm='kmeans')
except AuthenticationError:
    print("Check your API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Data validation failed: {e.details}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

---

## 🚦 **Rate Limiting**

### Default Limits
- **Free Tier**: 100 requests/hour, 1,000 data points/request
- **Pro Tier**: 1,000 requests/hour, 10,000 data points/request
- **Enterprise**: Custom limits

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-RetryAfter: 3600
```

### Handling Rate Limits

#### Exponential Backoff
```javascript
class RateLimitedClient {
  async requestWithBackoff(requestFn, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await requestFn();
      } catch (error) {
        if (error.code === 'RATE_LIMIT_EXCEEDED' && retries < maxRetries - 1) {
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          throw error;
        }
      }
    }
  }
}
```

#### Request Queuing
```javascript
class RequestQueue {
  constructor(rateLimit = 1000) {
    this.queue = [];
    this.processing = false;
    this.rateLimit = rateLimit;
    this.requestCount = 0;
    this.resetTime = Date.now() + 3600000; // 1 hour
  }
  
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      if (Date.now() > this.resetTime) {
        this.requestCount = 0;
        this.resetTime = Date.now() + 3600000;
      }
      
      if (this.requestCount >= this.rateLimit) {
        // Wait until reset time
        await new Promise(resolve => 
          setTimeout(resolve, this.resetTime - Date.now())
        );
        continue;
      }
      
      const { requestFn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await requestFn();
        this.requestCount++;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }
}
```

---

## 🔄 **WebSocket Integration**

### Real-time Clustering
```javascript
const ws = new WebSocket('wss://api.ncs-clustering.com/v1/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-api-key'
  }));
  
  // Start clustering session
  ws.send(JSON.stringify({
    type: 'start_clustering',
    algorithm: 'ncs',
    parameters: { threshold: 0.1 }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'clustering_result':
      console.log('New clusters:', message.data.clusters);
      updateVisualization(message.data);
      break;
      
    case 'error':
      console.error('WebSocket error:', message.error);
      break;
  }
};

// Add data point
function addDataPoint(point) {
  ws.send(JSON.stringify({
    type: 'add_data',
    data: [point]
  }));
}
```

### Streaming Data Processing
```python
import websocket
import json

class StreamingClusterer:
    def __init__(self, api_key):
        self.api_key = api_key
        self.ws = None
    
    def connect(self):
        self.ws = websocket.WebSocketApp(
            "wss://api.ncs-clustering.com/v1/ws",
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        self.ws.on_open = self.on_open
        self.ws.run_forever()
    
    def on_open(self, ws):
        # Authenticate
        ws.send(json.dumps({
            "type": "auth",
            "token": self.api_key
        }))
    
    def on_message(self, ws, message):
        data = json.loads(message)
        if data["type"] == "clustering_result":
            self.handle_result(data["data"])
    
    def add_data(self, points):
        self.ws.send(json.dumps({
            "type": "add_data",
            "data": points
        }))
    
    def handle_result(self, result):
        print(f"Clusters updated: {result['clusters']}")
```

---

## 🌐 **Examples by Language**

### JavaScript (Browser)
```javascript
class ClusteringApp {
  constructor(apiKey) {
    this.client = new NCSClient({ apiKey });
  }
  
  async uploadAndCluster(file) {
    try {
      // Upload file
      const uploadResult = await this.client.uploadData(file);
      
      // Run clustering
      const clusterResult = await this.client.cluster({
        data_id: uploadResult.data_id,
        algorithm: 'kmeans',
        parameters: { k: 3 }
      });
      
      // Visualize results
      this.visualizeResults(clusterResult);
      
    } catch (error) {
      this.handleError(error);
    }
  }
  
  visualizeResults(result) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: result.clusters.map((cluster, index) => ({
          label: `Cluster ${index}`,
          data: cluster.points,
          backgroundColor: this.getClusterColor(index)
        }))
      }
    });
  }
}
```

### Node.js (Server)
```javascript
const express = require('express');
const { NCSClient } = require('ncs-clustering-sdk');

const app = express();
const client = new NCSClient({ apiKey: process.env.NCS_API_KEY });

app.post('/cluster', async (req, res) => {
  try {
    const { data, algorithm, parameters } = req.body;
    
    const result = await client.cluster({
      data,
      algorithm,
      parameters
    });
    
    res.json({
      success: true,
      clusters: result.clusters,
      quality: result.quality
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Python (Data Science)
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from ncs_clustering import NCSClient

class DataAnalyzer:
    def __init__(self, api_key):
        self.client = NCSClient(api_key=api_key)
    
    def analyze_dataset(self, data_path):
        # Load data
        df = pd.read_csv(data_path)
        
        # Preprocess
        df_clean = self.preprocess_data(df)
        
        # Try different algorithms
        algorithms = ['kmeans', 'dbscan', 'hierarchical']
        results = {}
        
        for algorithm in algorithms:
            result = self.client.cluster(
                data=df_clean.to_dict('records'),
                algorithm=algorithm,
                parameters=self.get_optimal_parameters(algorithm, df_clean)
            )
            results[algorithm] = result
        
        # Compare results
        best_algorithm = self.compare_algorithms(results)
        
        # Visualize best result
        self.visualize_results(df_clean, results[best_algorithm])
        
        return results[best_algorithm]
    
    def preprocess_data(self, df):
        # Remove missing values
        df_clean = df.dropna()
        
        # Normalize features
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        numeric_columns = df_clean.select_dtypes(include=[np.number]).columns
        df_clean[numeric_columns] = scaler.fit_transform(df_clean[numeric_columns])
        
        return df_clean
    
    def get_optimal_parameters(self, algorithm, data):
        if algorithm == 'kmeans':
            # Use elbow method to find optimal k
            return {'k': self.find_optimal_k(data)}
        elif algorithm == 'dbscan':
            return {'eps': 0.5, 'min_samples': 5}
        elif algorithm == 'hierarchical':
            return {'n_clusters': 3, 'linkage': 'ward'}
    
    def compare_algorithms(self, results):
        best_score = -1
        best_algorithm = None
        
        for algorithm, result in results.items():
            score = result.quality.silhouette_score
            if score > best_score:
                best_score = score
                best_algorithm = algorithm
        
        return best_algorithm
```

### R (Statistical Analysis)
```r
library(ncs.clustering)
library(dplyr)
library(ggplot2)
library(cluster)

# Advanced clustering analysis
analyze_clustering <- function(data, api_key) {
  client <- ncs_client(api_key = api_key)
  
  # Data preprocessing
  data_clean <- data %>%
    na.omit() %>%
    select_if(is.numeric) %>%
    scale() %>%
    as.data.frame()
  
  # Try multiple algorithms
  algorithms <- list(
    kmeans = list(k = 3),
    dbscan = list(eps = 0.5, min_samples = 5),
    hierarchical = list(n_clusters = 3, linkage = "ward")
  )
  
  results <- map(algorithms, function(params) {
    ncs_cluster(
      client = client,
      algorithm = names(params)[1],
      data = data_clean,
      parameters = params
    )
  })
  
  # Evaluate results
  evaluation <- map_dfr(results, function(result) {
    data.frame(
      algorithm = result$meta$algorithm,
      silhouette_score = result$quality$silhouette_score,
      n_clusters = length(unique(result$clusters))
    )
  })
  
  # Visualize best result
  best_algorithm <- evaluation$algorithm[which.max(evaluation$silhouette_score)]
  best_result <- results[[best_algorithm]]
  
  # Create visualization
  plot_data <- data_clean %>%
    mutate(cluster = factor(best_result$clusters))
  
  p <- ggplot(plot_data, aes(x = PC1, y = PC2, color = cluster)) +
    geom_point(size = 3, alpha = 0.7) +
    labs(
      title = paste("Clustering Results -", best_algorithm),
      subtitle = paste("Silhouette Score:", round(best_result$quality$silhouette_score, 3))
    ) +
    theme_minimal()
  
  print(p)
  
  return(list(
    results = results,
    evaluation = evaluation,
    best_result = best_result
  ))
}
```

---

## 🔄 **Best Practices**

### Data Preparation
```python
# Good data preparation practices
def prepare_clustering_data(df):
    # 1. Handle missing values
    df_clean = df.dropna()  # or use imputation
    
    # 2. Remove outliers
    Q1 = df_clean.quantile(0.25)
    Q3 = df_clean.quantile(0.75)
    IQR = Q3 - Q1
    df_clean = df_clean[~((df_clean < (Q1 - 1.5 * IQR)) | 
                         (df_clean > (Q3 + 1.5 * IQR))).any(axis=1)]
    
    # 3. Scale features
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    df_scaled = pd.DataFrame(
        scaler.fit_transform(df_clean),
        columns=df_clean.columns
    )
    
    # 4. Feature selection
    # Remove highly correlated features
    correlation_matrix = df_scaled.corr().abs()
    upper_tri = correlation_matrix.where(
        np.triu(np.ones(correlation_matrix.shape), k=1).astype(bool)
    )
    
    high_corr_features = [column for column in upper_tri.columns 
                         if any(upper_tri[column] > 0.95)]
    df_final = df_scaled.drop(high_corr_features, axis=1)
    
    return df_final
```

### Algorithm Selection
```javascript
// Choose algorithm based on data characteristics
function selectOptimalAlgorithm(dataInfo) {
  const { size, dimensions, hasNoise, expectedClusters } = dataInfo;
  
  if (size < 100) {
    return 'hierarchical'; // Good for small datasets
  } else if (hasNoise) {
    return 'dbscan'; // Handles noise well
  } else if (expectedClusters && expectedClusters <= 10) {
    return 'kmeans'; // Fast and effective for known cluster count
  } else {
    return 'ncs'; // Adaptive algorithm for complex cases
  }
}
```

### Error Recovery
```javascript
// Robust error handling with retry logic
class RobustClusteringClient {
  async clusterWithRetry(data, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const baseDelay = options.baseDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.cluster(data);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Different handling based on error type
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          await this.delay(error.retryAfter * 1000);
        } else if (error.code === 'SERVER_ERROR') {
          await this.delay(baseDelay * Math.pow(2, attempt - 1));
        } else {
          throw error; // Don't retry client errors
        }
      }
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Performance Optimization
```python
# Optimize for large datasets
async def cluster_large_dataset(data, chunk_size=1000):
    if len(data) <= chunk_size:
        return await client.cluster(data=data, algorithm='kmeans')
    
    # Process in chunks for very large datasets
    chunks = [data[i:i+chunk_size] for i in range(0, len(data), chunk_size)]
    
    # Initial clustering on sample
    sample_data = random.sample(data, min(chunk_size, len(data)))
    initial_result = await client.cluster(
        data=sample_data, 
        algorithm='kmeans',
        parameters={'k': 'auto'}
    )
    
    # Use initial centroids for full dataset
    final_result = await client.cluster(
        data=data,
        algorithm='kmeans',
        parameters={
            'k': len(initial_result.centroids),
            'init_centroids': initial_result.centroids
        }
    )
    
    return final_result
```

### Caching Strategy
```javascript
// Cache results for repeated requests
class CachedClusteringClient {
  constructor(apiKey, cacheOptions = {}) {
    this.client = new NCSClient({ apiKey });
    this.cache = new Map();
    this.cacheTimeout = cacheOptions.timeout || 3600000; // 1 hour
  }
  
  async cluster(data, options = {}) {
    const cacheKey = this.generateCacheKey(data, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    
    const result = await this.client.cluster(data, options);
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  generateCacheKey(data, options) {
    const dataHash = this.hashData(data);
    const optionsHash = this.hashOptions(options);
    return `${dataHash}_${optionsHash}`;
  }
}
```

---

## 📞 **Support & Resources**

### Getting Help
- **Documentation**: [docs.ncs-clustering.com](https://docs.ncs-clustering.com)
- **API Reference**: [api.ncs-clustering.com/docs](https://api.ncs-clustering.com/docs)
- **Community Forum**: [community.ncs-clustering.com](https://community.ncs-clustering.com)
- **Discord**: [discord.gg/ncs-api](https://discord.gg/ncs-api)
- **Email Support**: api-support@ncs-clustering.com

### Status & Updates
- **Status Page**: [status.ncs-clustering.com](https://status.ncs-clustering.com)
- **Changelog**: [changelog.ncs-clustering.com](https://changelog.ncs-clustering.com)
- **Twitter**: [@ncs_api](https://twitter.com/ncs_api)

### Additional Resources
- **GitHub Examples**: [github.com/ncs-api/examples](https://github.com/ncs-api/examples)
- **Postman Collection**: [postman.com/ncs-api](https://postman.com/ncs-api)
- **Interactive Documentation**: [ncs-clustering.com/playground](https://ncs-clustering.com/playground)

---

*Happy clustering! 🎯*