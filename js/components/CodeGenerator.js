/**
 * NCS-API Website - Code Generator Component
 * Generates API request code in multiple programming languages
 * 
 * Features:
 * - Support for JavaScript, Python, cURL, PHP, Java, and more
 * - Request/response examples
 * - Authentication handling
 * - Error handling patterns
 * - Copy-to-clipboard functionality
 */

export class CodeGenerator {
    constructor() {
        this.baseUrl = 'https://api.ncs-cluster.com';
        this.generators = {
            javascript: this.generateJavaScript.bind(this),
            python: this.generatePython.bind(this),
            curl: this.generateCurl.bind(this),
            php: this.generatePHP.bind(this),
            java: this.generateJava.bind(this),
            csharp: this.generateCSharp.bind(this),
            ruby: this.generateRuby.bind(this),
            go: this.generateGo.bind(this),
            swift: this.generateSwift.bind(this),
            kotlin: this.generateKotlin.bind(this)
        };
        
        console.log('🔧 Code Generator initialized');
    }

    /**
     * Generate code for a request in the specified language
     */
    generate(request, language = 'javascript') {
        const generator = this.generators[language.toLowerCase()];
        if (!generator) {
            throw new Error(`Unsupported language: ${language}`);
        }
        
        return generator(request);
    }

    /**
     * Get list of supported languages
     */
    getSupportedLanguages() {
        return [
            { key: 'javascript', name: 'JavaScript', icon: '🟨' },
            { key: 'python', name: 'Python', icon: '🐍' },
            { key: 'curl', name: 'cURL', icon: '💻' },
            { key: 'php', name: 'PHP', icon: '🐘' },
            { key: 'java', name: 'Java', icon: '☕' },
            { key: 'csharp', name: 'C#', icon: '🔷' },
            { key: 'ruby', name: 'Ruby', icon: '💎' },
            { key: 'go', name: 'Go', icon: '🐹' },
            { key: 'swift', name: 'Swift', icon: '🦉' },
            { key: 'kotlin', name: 'Kotlin', icon: '🅺' }
        ];
    }

    /**
     * Generate JavaScript/Node.js code
     */
    generateJavaScript(request) {
        const url = this.getFullUrl(request.url);
        const headers = this.formatHeaders(request.headers);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - JavaScript/Node.js
// Using fetch API (modern browsers and Node.js 18+)

const ncsApiRequest = async () => {
  try {
    const response = await fetch('${url}', {
      method: '${request.method}',
      headers: ${this.formatJSObject(headers, 6)}${hasBody ? `,
      body: JSON.stringify(${this.formatJSObject(request.body, 8)})` : ''}
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    console.log('✅ Success:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
};

// Execute the request
ncsApiRequest()
  .then(result => {
    // Handle successful response
    console.log('Clustering results:', result);
  })
  .catch(error => {
    // Handle error
    console.error('Request failed:', error);
  });

// Alternative using async/await in an async function
async function runClusteringAnalysis() {
  try {
    const result = await ncsApiRequest();
    
    // Process the clustering results
    if (result.clusters) {
      console.log(\`Found \${result.clusters.length} clusters\`);
      result.clusters.forEach((cluster, index) => {
        console.log(\`Cluster \${index + 1}: \${cluster.points.length} points\`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Clustering analysis failed:', error);
    return null;
  }
}`;
    }

    /**
     * Generate Python code
     */
    generatePython(request) {
        const url = this.getFullUrl(request.url);
        const headers = this.formatPythonDict(request.headers);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `# NCS-API ${request.method} Request - Python
# Using requests library (pip install requests)

import requests
import json
from typing import Dict, Any, Optional

def ncs_api_request() -> Optional[Dict[str, Any]]:
    """
    Send clustering request to NCS-API
    
    Returns:
        Dict containing the API response or None if failed
    """
    url = "${url}"
    headers = ${headers}
    ${hasBody ? `data = ${this.formatPythonDict(request.body)}` : ''}
    
    try:
        response = requests.${request.method.toLowerCase()}(
            url=url,
            headers=headers${hasBody ? ',\n            json=data' : ''}${this.getPythonTimeout()}
        )
        
        # Raise an exception for bad status codes
        response.raise_for_status()
        
        # Parse JSON response
        result = response.json()
        print("✅ Success:", json.dumps(result, indent=2))
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ JSON Decode Error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return None

# Execute the request
if __name__ == "__main__":
    result = ncs_api_request()
    
    if result:
        # Process clustering results
        if 'clusters' in result:
            print(f"Found {len(result['clusters'])} clusters")
            
            for i, cluster in enumerate(result['clusters']):
                print(f"Cluster {i + 1}: {len(cluster.get('points', []))} points")
                
                # Print cluster center if available
                if 'center' in cluster:
                    print(f"  Center: {cluster['center']}")
        
        # Print performance metrics if available
        if 'metrics' in result:
            metrics = result['metrics']
            print(f"Processing time: {metrics.get('processing_time', 'N/A')}ms")
            print(f"Silhouette score: {metrics.get('silhouette_score', 'N/A')}")
    else:
        print("Failed to get clustering results")`;
    }

    /**
     * Generate cURL command
     */
    generateCurl(request) {
        const url = this.getFullUrl(request.url);
        const headers = Object.entries(request.headers || {})
            .map(([key, value]) => `-H "${key}: ${value}"`)
            .join(' \\\n  ');
        
        const hasBody = request.body && Object.keys(request.body).length > 0;
        const bodyData = hasBody ? JSON.stringify(request.body, null, 2) : '';

        return `# NCS-API ${request.method} Request - cURL
# Copy and paste this command into your terminal

curl -X ${request.method} \\
  "${url}" \\
  ${headers}${hasBody ? ` \\\n  -d '${bodyData.replace(/'/g, `'\\''`)}'` : ''} \\
  --compressed \\
  --max-time 30 \\
  --retry 3 \\
  --retry-delay 1

# With verbose output for debugging:
curl -X ${request.method} \\
  "${url}" \\
  ${headers}${hasBody ? ` \\\n  -d '${bodyData.replace(/'/g, `'\\''`)}'` : ''} \\
  --verbose \\
  --include \\
  --max-time 30

# Save response to file:
curl -X ${request.method} \\
  "${url}" \\
  ${headers}${hasBody ? ` \\\n  -d '${bodyData.replace(/'/g, `'\\''`)}'` : ''} \\
  --output clustering_response.json

# With progress bar:
curl -X ${request.method} \\
  "${url}" \\
  ${headers}${hasBody ? ` \\\n  -d '${bodyData.replace(/'/g, `'\\''`)}'` : ''} \\
  --progress-bar \\
  --output clustering_response.json`;
    }

    /**
     * Generate PHP code
     */
    generatePHP(request) {
        const url = this.getFullUrl(request.url);
        const headers = this.formatPHPArray(request.headers);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `<?php
// NCS-API ${request.method} Request - PHP
// Using cURL for HTTP requests

/**
 * Send clustering request to NCS-API
 * 
 * @return array|null The API response or null if failed
 */
function ncsApiRequest() {
    $url = "${url}";
    $headers = ${headers};
    ${hasBody ? `$data = ${this.formatPHPArray(request.body)};` : ''}
    
    // Initialize cURL
    $curl = curl_init();
    
    // Set cURL options
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => "${request.method}",
        CURLOPT_HTTPHEADER => $headers,${hasBody ? `
        CURLOPT_POSTFIELDS => json_encode($data),` : ''}
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);
    
    // Execute request
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    
    curl_close($curl);
    
    // Check for cURL errors
    if ($error) {
        echo "❌ cURL Error: " . $error . PHP_EOL;
        return null;
    }
    
    // Check HTTP status code
    if ($httpCode < 200 || $httpCode >= 300) {
        echo "❌ HTTP Error: " . $httpCode . PHP_EOL;
        echo "Response: " . $response . PHP_EOL;
        return null;
    }
    
    // Decode JSON response
    $result = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "❌ JSON Decode Error: " . json_last_error_msg() . PHP_EOL;
        return null;
    }
    
    echo "✅ Success:" . PHP_EOL;
    echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
    
    return $result;
}

// Execute the request
$result = ncsApiRequest();

if ($result) {
    // Process clustering results
    if (isset($result['clusters'])) {
        $clusterCount = count($result['clusters']);
        echo "Found {$clusterCount} clusters" . PHP_EOL;
        
        foreach ($result['clusters'] as $index => $cluster) {
            $pointCount = count($cluster['points'] ?? []);
            echo "Cluster " . ($index + 1) . ": {$pointCount} points" . PHP_EOL;
            
            // Print cluster center if available
            if (isset($cluster['center'])) {
                echo "  Center: " . json_encode($cluster['center']) . PHP_EOL;
            }
        }
    }
    
    // Print performance metrics if available
    if (isset($result['metrics'])) {
        $metrics = $result['metrics'];
        $processingTime = $metrics['processing_time'] ?? 'N/A';
        $silhouetteScore = $metrics['silhouette_score'] ?? 'N/A';
        
        echo "Processing time: {$processingTime}ms" . PHP_EOL;
        echo "Silhouette score: {$silhouetteScore}" . PHP_EOL;
    }
} else {
    echo "Failed to get clustering results" . PHP_EOL;
}
?>`;
    }

    /**
     * Generate Java code
     */
    generateJava(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - Java
// Using HttpClient (Java 11+) and Jackson for JSON

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

public class NCSApiClient {
    
    private static final String API_URL = "${url}";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Send clustering request to NCS-API
     * 
     * @return Map containing the API response or null if failed
     */
    public static Map<String, Object> ncsApiRequest() {
        try {
            // Create HTTP client
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
            
            // Prepare request data${hasBody ? `
            Map<String, Object> requestData = new HashMap<>();
${Object.entries(request.body || {}).map(([key, value]) => 
    `            requestData.put("${key}", ${this.formatJavaValue(value)});`).join('\n')}
            String jsonBody = objectMapper.writeValueAsString(requestData);` : ''}
            
            // Build HTTP request
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .timeout(Duration.ofSeconds(30))${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n                .header("${key}", "${value}")`).join('')};
            
            ${hasBody ? 
                `requestBuilder.${request.method}(HttpRequest.BodyPublishers.ofString(jsonBody));` :
                `requestBuilder.${request.method}();`}
            
            HttpRequest httpRequest = requestBuilder.build();
            
            // Send request
            HttpResponse<String> response = client.send(
                httpRequest, 
                HttpResponse.BodyHandlers.ofString()
            );
            
            // Check status code
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                System.err.println("❌ HTTP Error: " + response.statusCode());
                System.err.println("Response: " + response.body());
                return null;
            }
            
            // Parse JSON response
            TypeReference<Map<String, Object>> typeRef = new TypeReference<Map<String, Object>>() {};
            Map<String, Object> result = objectMapper.readValue(response.body(), typeRef);
            
            System.out.println("✅ Success:");
            System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
            
            return result;
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    public static void main(String[] args) {
        Map<String, Object> result = ncsApiRequest();
        
        if (result != null) {
            // Process clustering results
            if (result.containsKey("clusters")) {
                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> clusters = 
                    (java.util.List<Map<String, Object>>) result.get("clusters");
                
                System.out.println("Found " + clusters.size() + " clusters");
                
                for (int i = 0; i < clusters.size(); i++) {
                    Map<String, Object> cluster = clusters.get(i);
                    @SuppressWarnings("unchecked")
                    java.util.List<Object> points = (java.util.List<Object>) cluster.get("points");
                    int pointCount = points != null ? points.size() : 0;
                    
                    System.out.println("Cluster " + (i + 1) + ": " + pointCount + " points");
                    
                    // Print cluster center if available
                    if (cluster.containsKey("center")) {
                        System.out.println("  Center: " + cluster.get("center"));
                    }
                }
            }
            
            // Print performance metrics if available
            if (result.containsKey("metrics")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> metrics = (Map<String, Object>) result.get("metrics");
                
                Object processingTime = metrics.get("processing_time");
                Object silhouetteScore = metrics.get("silhouette_score");
                
                System.out.println("Processing time: " + (processingTime != null ? processingTime + "ms" : "N/A"));
                System.out.println("Silhouette score: " + (silhouetteScore != null ? silhouetteScore : "N/A"));
            }
        } else {
            System.out.println("Failed to get clustering results");
        }
    }
}`;
    }

    /**
     * Generate C# code
     */
    generateCSharp(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - C#
// Using HttpClient and Newtonsoft.Json

using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Collections.Generic;

public class NCSApiClient
{
    private static readonly HttpClient client = new HttpClient()
    {
        Timeout = TimeSpan.FromSeconds(30)
    };
    
    private const string ApiUrl = "${url}";
    
    /// <summary>
    /// Send clustering request to NCS-API
    /// </summary>
    /// <returns>Dictionary containing the API response or null if failed</returns>
    public static async Task<Dictionary<string, object>> NcsApiRequestAsync()
    {
        try
        {${hasBody ? `
            // Prepare request data
            var requestData = new
            {
${Object.entries(request.body || {}).map(([key, value]) => 
    `                ${key} = ${this.formatCSharpValue(value)}`).join(',\n')}
            };
            
            string jsonBody = JsonConvert.SerializeObject(requestData, Formatting.Indented);` : ''}
            
            // Create HTTP request message
            using var request = new HttpRequestMessage(HttpMethod.${this.capitalizeFirst(request.method)}, ApiUrl);
            
            // Add headers${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n            request.Headers.Add("${key}", "${value}");`).join('')}
            
            ${hasBody ? 'request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");' : ''}
            
            // Send request
            using HttpResponseMessage response = await client.SendAsync(request);
            
            // Check status code
            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"❌ HTTP Error: {(int)response.StatusCode} {response.StatusCode}");
                string errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Response: {errorContent}");
                return null;
            }
            
            // Parse JSON response
            string responseContent = await response.Content.ReadAsStringAsync();
            var result = JsonConvert.DeserializeObject<Dictionary<string, object>>(responseContent);
            
            Console.WriteLine("✅ Success:");
            Console.WriteLine(JsonConvert.SerializeObject(result, Formatting.Indented));
            
            return result;
        }
        catch (HttpRequestException e)
        {
            Console.WriteLine($"❌ HTTP Request Error: {e.Message}");
            return null;
        }
        catch (TaskCanceledException e)
        {
            Console.WriteLine($"❌ Timeout Error: {e.Message}");
            return null;
        }
        catch (JsonException e)
        {
            Console.WriteLine($"❌ JSON Parse Error: {e.Message}");
            return null;
        }
        catch (Exception e)
        {
            Console.WriteLine($"❌ Unexpected Error: {e.Message}");
            return null;
        }
    }
    
    public static async Task Main(string[] args)
    {
        var result = await NcsApiRequestAsync();
        
        if (result != null)
        {
            // Process clustering results
            if (result.ContainsKey("clusters") && result["clusters"] is Newtonsoft.Json.Linq.JArray clusters)
            {
                Console.WriteLine($"Found {clusters.Count} clusters");
                
                for (int i = 0; i < clusters.Count; i++)
                {
                    var cluster = clusters[i] as Newtonsoft.Json.Linq.JObject;
                    var points = cluster?["points"] as Newtonsoft.Json.Linq.JArray;
                    int pointCount = points?.Count ?? 0;
                    
                    Console.WriteLine($"Cluster {i + 1}: {pointCount} points");
                    
                    // Print cluster center if available
                    if (cluster?["center"] != null)
                    {
                        Console.WriteLine($"  Center: {cluster["center"]}");
                    }
                }
            }
            
            // Print performance metrics if available
            if (result.ContainsKey("metrics") && result["metrics"] is Newtonsoft.Json.Linq.JObject metrics)
            {
                var processingTime = metrics["processing_time"]?.ToString();
                var silhouetteScore = metrics["silhouette_score"]?.ToString();
                
                Console.WriteLine($"Processing time: {processingTime ?? "N/A"}ms");
                Console.WriteLine($"Silhouette score: {silhouetteScore ?? "N/A"}");
            }
        }
        else
        {
            Console.WriteLine("Failed to get clustering results");
        }
    }
}`;
    }

    /**
     * Generate Ruby code
     */
    generateRuby(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `# NCS-API ${request.method} Request - Ruby
# Using net/http and json libraries

require 'net/http'
require 'json'
require 'uri'

# Send clustering request to NCS-API
def ncs_api_request
  uri = URI('${url}')
  
  # Create HTTP object
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true if uri.scheme == 'https'
  http.open_timeout = 10
  http.read_timeout = 30
  
  # Create request${hasBody ? `
  request_data = ${this.formatRubyHash(request.body)}` : ''}
  
  request = Net::HTTP::${this.capitalizeFirst(request.method)}.new(uri)${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n  request['${key}'] = '${value}'`).join('')}
  
  ${hasBody ? "request.body = request_data.to_json" : ''}
  
  begin
    # Send request
    response = http.request(request)
    
    # Check status code
    unless response.is_a?(Net::HTTPSuccess)
      puts "❌ HTTP Error: #{response.code} #{response.message}"
      puts "Response: #{response.body}"
      return nil
    end
    
    # Parse JSON response
    result = JSON.parse(response.body)
    
    puts "✅ Success:"
    puts JSON.pretty_generate(result)
    
    result
    
  rescue Net::TimeoutError => e
    puts "❌ Timeout Error: #{e.message}"
    nil
  rescue JSON::ParserError => e
    puts "❌ JSON Parse Error: #{e.message}"
    nil
  rescue StandardError => e
    puts "❌ Unexpected Error: #{e.message}"
    nil
  ensure
    http.finish if http.started?
  end
end

# Execute the request
result = ncs_api_request

if result
  # Process clustering results
  if result['clusters']
    clusters = result['clusters']
    puts "Found #{clusters.length} clusters"
    
    clusters.each_with_index do |cluster, index|
      point_count = cluster['points']&.length || 0
      puts "Cluster #{index + 1}: #{point_count} points"
      
      # Print cluster center if available
      if cluster['center']
        puts "  Center: #{cluster['center']}"
      end
    end
  end
  
  # Print performance metrics if available
  if result['metrics']
    metrics = result['metrics']
    processing_time = metrics['processing_time'] || 'N/A'
    silhouette_score = metrics['silhouette_score'] || 'N/A'
    
    puts "Processing time: #{processing_time}ms"
    puts "Silhouette score: #{silhouette_score}"
  end
else
  puts "Failed to get clustering results"
end`;
    }

    /**
     * Generate Go code
     */
    generateGo(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - Go
// Using net/http and encoding/json packages

package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// RequestData represents the clustering request structure${hasBody ? `
type RequestData struct {
${Object.entries(request.body || {}).map(([key, value]) => 
    `    ${this.capitalizeFirst(key)} ${this.getGoType(value)} \`json:"${key}"\``).join('\n')}
}` : ''}

// ResponseData represents the clustering response structure
type ResponseData struct {
    Clusters []Cluster \`json:"clusters,omitempty"\`
    Metrics  *Metrics  \`json:"metrics,omitempty"\`
}

type Cluster struct {
    Points [][]float64 \`json:"points"\`
    Center []float64   \`json:"center,omitempty"\`
}

type Metrics struct {
    ProcessingTime  int     \`json:"processing_time,omitempty"\`
    SilhouetteScore float64 \`json:"silhouette_score,omitempty"\`
}

// ncsApiRequest sends clustering request to NCS-API
func ncsApiRequest() (*ResponseData, error) {
    const apiURL = "${url}"
    
    // Create HTTP client with timeout
    client := &http.Client{
        Timeout: 30 * time.Second,
    }${hasBody ? `
    
    // Prepare request data
    requestData := RequestData{
${Object.entries(request.body || {}).map(([key, value]) => 
    `        ${this.capitalizeFirst(key)}: ${this.formatGoValue(value)},`).join('\n')}
    }
    
    // Marshal to JSON
    jsonData, err := json.Marshal(requestData)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal request data: %w", err)
    }` : ''}
    
    // Create HTTP request${hasBody ? `
    req, err := http.NewRequest("${request.method}", apiURL, bytes.NewBuffer(jsonData))` : `
    req, err := http.NewRequest("${request.method}", apiURL, nil)`}
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %w", err)
    }
    
    // Set headers${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n    req.Header.Set("${key}", "${value}")`).join('')}
    
    // Send request
    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()
    
    // Check status code
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(body))
    }
    
    // Read response body
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("failed to read response body: %w", err)
    }
    
    // Parse JSON response
    var result ResponseData
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, fmt.Errorf("failed to parse JSON response: %w", err)
    }
    
    fmt.Println("✅ Success:")
    prettyJSON, _ := json.MarshalIndent(result, "", "  ")
    fmt.Println(string(prettyJSON))
    
    return &result, nil
}

func main() {
    result, err := ncsApiRequest()
    if err != nil {
        fmt.Printf("❌ Error: %v\\n", err)
        return
    }
    
    // Process clustering results
    if len(result.Clusters) > 0 {
        fmt.Printf("Found %d clusters\\n", len(result.Clusters))
        
        for i, cluster := range result.Clusters {
            fmt.Printf("Cluster %d: %d points\\n", i+1, len(cluster.Points))
            
            // Print cluster center if available
            if len(cluster.Center) > 0 {
                fmt.Printf("  Center: %v\\n", cluster.Center)
            }
        }
    }
    
    // Print performance metrics if available
    if result.Metrics != nil {
        fmt.Printf("Processing time: %dms\\n", result.Metrics.ProcessingTime)
        fmt.Printf("Silhouette score: %.4f\\n", result.Metrics.SilhouetteScore)
    }
}`;
    }

    /**
     * Generate Swift code
     */
    generateSwift(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - Swift
// Using URLSession and Codable

import Foundation

// MARK: - Data Models${hasBody ? `

struct RequestData: Codable {
${Object.entries(request.body || {}).map(([key, value]) => 
    `    let ${key}: ${this.getSwiftType(value)}`).join('\n')}
}` : ''}

struct ResponseData: Codable {
    let clusters: [Cluster]?
    let metrics: Metrics?
}

struct Cluster: Codable {
    let points: [[Double]]
    let center: [Double]?
}

struct Metrics: Codable {
    let processingTime: Int?
    let silhouetteScore: Double?
    
    enum CodingKeys: String, CodingKey {
        case processingTime = "processing_time"
        case silhouetteScore = "silhouette_score"
    }
}

// MARK: - API Client

class NCSApiClient {
    private let apiURL = "${url}"
    private let session = URLSession.shared
    
    func ncsApiRequest() async throws -> ResponseData {
        guard let url = URL(string: apiURL) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "${request.method}"
        request.timeoutInterval = 30${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n        request.setValue("${value}", forHTTPHeaderField: "${key}")`).join('')}
        ${hasBody ? `
        // Prepare request data
        let requestData = RequestData(
${Object.entries(request.body || {}).map(([key, value]) => 
    `            ${key}: ${this.formatSwiftValue(value)}`).join(',\n')}
        )
        
        // Encode to JSON
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(requestData)` : ''}
        
        do {
            let (data, response) = try await session.data(for: request)
            
            // Check HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                throw URLError(.badServerResponse)
            }
            
            guard 200..<300 ~= httpResponse.statusCode else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "HTTPError", code: httpResponse.statusCode, userInfo: [
                    NSLocalizedDescriptionKey: "HTTP \\(httpResponse.statusCode): \\(errorMessage)"
                ])
            }
            
            // Decode JSON response
            let decoder = JSONDecoder()
            let result = try decoder.decode(ResponseData.self, from: data)
            
            print("✅ Success:")
            if let jsonString = String(data: data, encoding: .utf8) {
                print(jsonString)
            }
            
            return result
            
        } catch {
            print("❌ Error: \\(error.localizedDescription)")
            throw error
        }
    }
}

// MARK: - Usage Example

Task {
    let client = NCSApiClient()
    
    do {
        let result = try await client.ncsApiRequest()
        
        // Process clustering results
        if let clusters = result.clusters {
            print("Found \\(clusters.count) clusters")
            
            for (index, cluster) in clusters.enumerated() {
                print("Cluster \\(index + 1): \\(cluster.points.count) points")
                
                // Print cluster center if available
                if let center = cluster.center {
                    print("  Center: \\(center)")
                }
            }
        }
        
        // Print performance metrics if available
        if let metrics = result.metrics {
            let processingTime = metrics.processingTime.map(String.init) ?? "N/A"
            let silhouetteScore = metrics.silhouetteScore.map(String.init) ?? "N/A"
            
            print("Processing time: \\(processingTime)ms")
            print("Silhouette score: \\(silhouetteScore)")
        }
        
    } catch {
        print("Failed to get clustering results: \\(error)")
    }
}

// Keep the playground running
RunLoop.main.run()`;
    }

    /**
     * Generate Kotlin code
     */
    generateKotlin(request) {
        const url = this.getFullUrl(request.url);
        const hasBody = request.body && Object.keys(request.body).length > 0;

        return `// NCS-API ${request.method} Request - Kotlin
// Using OkHttp and kotlinx.serialization

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

// Data Models${hasBody ? `
@Serializable
data class RequestData(
${Object.entries(request.body || {}).map(([key, value]) => 
    `    val ${key}: ${this.getKotlinType(value)}`).join(',\n')}
)` : ''}

@Serializable
data class ResponseData(
    val clusters: List<Cluster>? = null,
    val metrics: Metrics? = null
)

@Serializable
data class Cluster(
    val points: List<List<Double>>,
    val center: List<Double>? = null
)

@Serializable
data class Metrics(
    @SerialName("processing_time")
    val processingTime: Int? = null,
    @SerialName("silhouette_score")
    val silhouetteScore: Double? = null
)

class NCSApiClient {
    private val apiUrl = "${url}"
    private val json = Json { ignoreUnknownKeys = true }
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    /**
     * Send clustering request to NCS-API
     */
    suspend fun ncsApiRequest(): ResponseData? {
        return try {${hasBody ? `
            // Prepare request data
            val requestData = RequestData(
${Object.entries(request.body || {}).map(([key, value]) => 
    `                ${key} = ${this.formatKotlinValue(value)}`).join(',\n')}
            )
            
            val jsonBody = json.encodeToString(requestData)
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())` : ''}
            
            // Build HTTP request
            val request = Request.Builder()
                .url(apiUrl)${Object.entries(request.headers || {}).map(([key, value]) => 
    `\n                .addHeader("${key}", "${value}")`).join('')}
                .${request.method.toLowerCase()}(${hasBody ? 'requestBody' : ''})
                .build()
            
            // Execute request
            val response = client.newCall(request).execute()
            
            response.use { resp ->
                if (!resp.isSuccessful) {
                    println("❌ HTTP Error: \${resp.code}")
                    println("Response: \${resp.body?.string()}")
                    return null
                }
                
                val responseBody = resp.body?.string() ?: ""
                val result = json.decodeFromString<ResponseData>(responseBody)
                
                println("✅ Success:")
                println(json.encodeToString(result))
                
                result
            }
            
        } catch (e: IOException) {
            println("❌ Network Error: \${e.message}")
            null
        } catch (e: Exception) {
            println("❌ Unexpected Error: \${e.message}")
            e.printStackTrace()
            null
        }
    }
}

// Usage Example
suspend fun main() {
    val client = NCSApiClient()
    val result = client.ncsApiRequest()
    
    result?.let { response ->
        // Process clustering results
        response.clusters?.let { clusters ->
            println("Found \${clusters.size} clusters")
            
            clusters.forEachIndexed { index, cluster ->
                println("Cluster \${index + 1}: \${cluster.points.size} points")
                
                // Print cluster center if available
                cluster.center?.let { center ->
                    println("  Center: \$center")
                }
            }
        }
        
        // Print performance metrics if available
        response.metrics?.let { metrics ->
            val processingTime = metrics.processingTime?.toString() ?: "N/A"
            val silhouetteScore = metrics.silhouetteScore?.toString() ?: "N/A"
            
            println("Processing time: \${processingTime}ms")
            println("Silhouette score: \$silhouetteScore")
        }
    } ?: println("Failed to get clustering results")
}`;
    }

    // Helper methods for formatting
    getFullUrl(path) {
        return path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    }

    formatHeaders(headers) {
        return headers || {};
    }

    formatJSObject(obj, indent = 2) {
        return JSON.stringify(obj, null, indent).split('\n').join('\n' + ' '.repeat(indent));
    }

    formatPythonDict(obj) {
        if (!obj || Object.keys(obj).length === 0) return '{}';
        const entries = Object.entries(obj).map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`);
        return `{\n${entries.join(',\n')}\n}`;
    }

    formatPHPArray(obj) {
        if (!obj || Object.keys(obj).length === 0) return '[]';
        const entries = Object.entries(obj).map(([k, v]) => `    "${k}" => ${JSON.stringify(v)}`);
        return `[\n${entries.join(',\n')}\n]`;
    }

    formatRubyHash(obj) {
        if (!obj || Object.keys(obj).length === 0) return '{}';
        const entries = Object.entries(obj).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`);
        return `{\n${entries.join(',\n')}\n}`;
    }

    getPythonTimeout() {
        return ',\n            timeout=30';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    formatJavaValue(value) {
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `Arrays.asList(${value.map(v => this.formatJavaValue(v)).join(', ')})`;
        return JSON.stringify(value);
    }

    formatCSharpValue(value) {
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `new[] { ${value.map(v => this.formatCSharpValue(v)).join(', ')} }`;
        return JSON.stringify(value);
    }

    getGoType(value) {
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float64';
        if (typeof value === 'boolean') return 'bool';
        if (Array.isArray(value)) return '[]interface{}';
        return 'interface{}';
    }

    formatGoValue(value) {
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `[]interface{}{${value.map(v => this.formatGoValue(v)).join(', ')}}`;
        return JSON.stringify(value);
    }

    getSwiftType(value) {
        if (typeof value === 'string') return 'String';
        if (typeof value === 'number') return Number.isInteger(value) ? 'Int' : 'Double';
        if (typeof value === 'boolean') return 'Bool';
        if (Array.isArray(value)) return '[Double]'; // Assuming numeric arrays for clustering
        return 'String';
    }

    formatSwiftValue(value) {
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `[${value.join(', ')}]`;
        return JSON.stringify(value);
    }

    getKotlinType(value) {
        if (typeof value === 'string') return 'String';
        if (typeof value === 'number') return Number.isInteger(value) ? 'Int' : 'Double';
        if (typeof value === 'boolean') return 'Boolean';
        if (Array.isArray(value)) return 'List<Double>'; // Assuming numeric arrays for clustering
        return 'String';
    }

    formatKotlinValue(value) {
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `listOf(${value.join(', ')})`;
        return JSON.stringify(value);
    }
}