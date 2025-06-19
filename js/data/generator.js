/**
 * Data Generator Module for NCS-API-Website
 * Creates synthetic datasets for testing, demos, and algorithm validation
 * Includes various data patterns, clustering scenarios, and real-world simulations
 */

import { EventBus } from '../core/eventBus.js';

export class DataGenerator {
    constructor(options = {}) {
        this.options = {
            seed: options.seed || null, // For reproducible results
            defaultSize: options.defaultSize || 1000,
            defaultDimensions: options.defaultDimensions || 2,
            noiseLevel: options.noiseLevel || 0.1,
            ...options
        };

        // Random number generator state
        this.rng = this.createRNG(this.options.seed);
        
        // Predefined color palettes for clusters
        this.colorPalettes = {
            vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFA07A', '#98D8C8'],
            pastel: ['#FFB3B3', '#B3E5FC', '#C8E6C8', '#FFCCBC', '#E1BEE7', '#F8BBD9', '#B3B3FF', '#C8F7C5'],
            monochrome: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#D5DBDB', '#E8EAED', '#F4F6F7'],
            warm: ['#E74C3C', '#E67E22', '#F39C12', '#F1C40F', '#D35400', '#C0392B', '#A93226', '#922B21'],
            cool: ['#3498DB', '#2980B9', '#21618C', '#1B4F72', '#5DADE2', '#85C1E9', '#AED6F1', '#D6EAF8']
        };

        // Dataset templates
        this.templates = {
            'gaussian_clusters': this.generateGaussianClusters.bind(this),
            'ring_clusters': this.generateRingClusters.bind(this),
            'spiral_clusters': this.generateSpiralClusters.bind(this),
            'blob_clusters': this.generateBlobClusters.bind(this),
            'elongated_clusters': this.generateElongatedClusters.bind(this),
            'hierarchical_clusters': this.generateHierarchicalClusters.bind(this),
            'noisy_moons': this.generateNoisyMoons.bind(this),
            'swiss_roll': this.generateSwissRoll.bind(this),
            'anisotropic_clusters': this.generateAnisotropicClusters.bind(this),
            'varying_density': this.generateVaryingDensityClusters.bind(this),
            'outlier_dataset': this.generateOutlierDataset.bind(this),
            'time_series': this.generateTimeSeriesData.bind(this),
            'customer_segmentation': this.generateCustomerSegmentationData.bind(this),
            'financial_data': this.generateFinancialData.bind(this),
            'ecommerce_behavior': this.generateEcommerceBehaviorData.bind(this),
            'social_network': this.generateSocialNetworkData.bind(this),
            'sensor_data': this.generateSensorData.bind(this),
            'image_features': this.generateImageFeatureData.bind(this)
        };
    }

    /**
     * Create a seeded random number generator
     * @param {Number} seed - Random seed
     * @returns {Function} Random number generator
     */
    createRNG(seed) {
        let currentSeed = seed || Math.floor(Math.random() * 1000000);
        
        return () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    }

    /**
     * Generate dataset using specified template
     * @param {String} template - Dataset template name
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generated dataset
     */
    async generateDataset(template, options = {}) {
        try {
            const startTime = performance.now();
            
            if (!this.templates[template]) {
                throw new Error(`Unknown template: ${template}`);
            }

            const generationOptions = { ...this.options, ...options };
            
            // Reset RNG if new seed provided
            if (options.seed !== undefined) {
                this.rng = this.createRNG(options.seed);
            }

            EventBus.emit('generator:generation_started', { 
                template, 
                options: generationOptions 
            });

            const dataset = await this.templates[template](generationOptions);
            
            // Add metadata
            dataset.metadata = {
                template,
                generationTime: Math.round(performance.now() - startTime),
                timestamp: Date.now(),
                options: generationOptions,
                seed: generationOptions.seed || this.options.seed,
                version: '1.0'
            };

            // Validate dataset
            this.validateDataset(dataset);

            EventBus.emit('generator:generation_complete', {
                template,
                datasetSize: dataset.data.length,
                features: dataset.features.length,
                clusters: dataset.clusters?.length || 0,
                generationTime: dataset.metadata.generationTime
            });

            return dataset;

        } catch (error) {
            EventBus.emit('generator:generation_error', { 
                template, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Generate Gaussian clusters
     * @param {Object} options - Generation options
     * @returns {Object} Dataset with Gaussian clusters
     */
    generateGaussianClusters(options) {
        const {
            size = 1000,
            clusters = 3,
            dimensions = 2,
            separation = 3.0,
            clusterVariance = 1.0,
            noiseLevel = 0.0
        } = options;

        const data = [];
        const clusterInfo = [];
        const pointsPerCluster = Math.floor(size / clusters);

        // Generate cluster centers
        const centers = this.generateClusterCenters(clusters, dimensions, separation);

        for (let c = 0; c < clusters; c++) {
            const center = centers[c];
            const clusterSize = c === clusters - 1 ? size - (clusters - 1) * pointsPerCluster : pointsPerCluster;
            const clusterPoints = [];

            for (let i = 0; i < clusterSize; i++) {
                const point = { cluster: c };
                
                // Generate point using multivariate normal distribution
                for (let d = 0; d < dimensions; d++) {
                    const gaussian = this.generateGaussianRandom();
                    point[`feature_${d}`] = center[d] + gaussian * Math.sqrt(clusterVariance);
                    
                    // Add noise if specified
                    if (noiseLevel > 0) {
                        point[`feature_${d}`] += this.generateGaussianRandom() * noiseLevel;
                    }
                }

                // Add some metadata
                point.id = data.length;
                point.true_cluster = c;
                
                data.push(point);
                clusterPoints.push(point);
            }

            clusterInfo.push({
                id: c,
                center: center,
                size: clusterSize,
                variance: clusterVariance,
                color: this.colorPalettes.vibrant[c % this.colorPalettes.vibrant.length]
            });
        }

        return {
            data,
            features: Array.from({ length: dimensions }, (_, i) => `feature_${i}`),
            clusters: clusterInfo,
            type: 'gaussian_clusters',
            description: `${clusters} Gaussian clusters with ${size} total points`
        };
    }

    /**
     * Generate ring clusters (concentric circles)
     * @param {Object} options - Generation options
     * @returns {Object} Dataset with ring clusters
     */
    generateRingClusters(options) {
        const {
            size = 1000,
            rings = 3,
            centerRadius = 2.0,
            ringWidth = 1.5,
            noiseLevel = 0.2
        } = options;

        const data = [];
        const clusterInfo = [];
        const pointsPerRing = Math.floor(size / rings);

        for (let r = 0; r < rings; r++) {
            const radius = centerRadius + r * ringWidth;
            const ringSize = r === rings - 1 ? size - (rings - 1) * pointsPerRing : pointsPerRing;

            for (let i = 0; i < ringSize; i++) {
                const angle = this.rng() * 2 * Math.PI;
                const radiusVariation = radius + this.generateGaussianRandom() * noiseLevel;
                
                const point = {
                    id: data.length,
                    feature_0: radiusVariation * Math.cos(angle),
                    feature_1: radiusVariation * Math.sin(angle),
                    cluster: r,
                    true_cluster: r,
                    angle: angle,
                    radius: radiusVariation
                };

                data.push(point);
            }

            clusterInfo.push({
                id: r,
                radius: radius,
                size: ringSize,
                color: this.colorPalettes.cool[r % this.colorPalettes.cool.length]
            });
        }

        return {
            data,
            features: ['feature_0', 'feature_1'],
            clusters: clusterInfo,
            type: 'ring_clusters',
            description: `${rings} concentric ring clusters`
        };
    }

    /**
     * Generate spiral clusters
     * @param {Object} options - Generation options
     * @returns {Object} Dataset with spiral clusters
     */
    generateSpiralClusters(options) {
        const {
            size = 1000,
            spirals = 2,
            turns = 2,
            noiseLevel = 0.1
        } = options;

        const data = [];
        const clusterInfo = [];
        const pointsPerSpiral = Math.floor(size / spirals);

        for (let s = 0; s < spirals; s++) {
            const spiralSize = s === spirals - 1 ? size - (spirals - 1) * pointsPerSpiral : pointsPerSpiral;

            for (let i = 0; i < spiralSize; i++) {
                const t = (i / spiralSize) * turns * 2 * Math.PI;
                const radius = t / (2 * Math.PI);
                const spiralOffset = (s / spirals) * 2 * Math.PI;
                
                const x = radius * Math.cos(t + spiralOffset);
                const y = radius * Math.sin(t + spiralOffset);
                
                const point = {
                    id: data.length,
                    feature_0: x + this.generateGaussianRandom() * noiseLevel,
                    feature_1: y + this.generateGaussianRandom() * noiseLevel,
                    cluster: s,
                    true_cluster: s,
                    spiral_parameter: t,
                    spiral_radius: radius
                };

                data.push(point);
            }

            clusterInfo.push({
                id: s,
                turns: turns,
                size: spiralSize,
                color: this.colorPalettes.warm[s % this.colorPalettes.warm.length]
            });
        }

        return {
            data,
            features: ['feature_0', 'feature_1'],
            clusters: clusterInfo,
            type: 'spiral_clusters',
            description: `${spirals} spiral clusters with ${turns} turns each`
        };
    }

    /**
     * Generate blob clusters (irregular shapes)
     * @param {Object} options - Generation options
     * @returns {Object} Dataset with blob clusters
     */
    generateBlobClusters(options) {
        const {
            size = 1000,
            clusters = 4,
            dimensions = 2,
            blobSize = 2.0,
            irregularity = 0.5
        } = options;

        const data = [];
        const clusterInfo = [];
        const pointsPerCluster = Math.floor(size / clusters);

        // Generate cluster centers
        const centers = this.generateClusterCenters(clusters, dimensions, 4.0);

        for (let c = 0; c < clusters; c++) {
            const center = centers[c];
            const clusterSize = c === clusters - 1 ? size - (clusters - 1) * pointsPerCluster : pointsPerCluster;

            for (let i = 0; i < clusterSize; i++) {
                const point = { cluster: c, id: data.length, true_cluster: c };

                // Generate irregular blob shape
                for (let d = 0; d < dimensions; d++) {
                    const angle = this.rng() * 2 * Math.PI;
                    const distance = Math.pow(this.rng(), 1 / dimensions) * blobSize;
                    const irregularityFactor = 1 + (this.rng() - 0.5) * irregularity;
                    
                    point[`feature_${d}`] = center[d] + 
                        distance * Math.cos(angle + d * Math.PI / dimensions) * irregularityFactor;
                }

                data.push(point);
            }

            clusterInfo.push({
                id: c,
                center: center,
                size: clusterSize,
                blobSize: blobSize,
                irregularity: irregularity,
                color: this.colorPalettes.pastel[c % this.colorPalettes.pastel.length]
            });
        }

        return {
            data,
            features: Array.from({ length: dimensions }, (_, i) => `feature_${i}`),
            clusters: clusterInfo,
            type: 'blob_clusters',
            description: `${clusters} irregular blob clusters`
        };
    }

    /**
     * Generate customer segmentation data
     * @param {Object} options - Generation options
     * @returns {Object} Customer segmentation dataset
     */
    generateCustomerSegmentationData(options) {
        const {
            size = 1000,
            segments = 5
        } = options;

        const data = [];
        const clusterInfo = [];
        const pointsPerSegment = Math.floor(size / segments);

        // Define customer segments
        const segmentProfiles = [
            { name: 'Premium Customers', ageRange: [35, 55], incomeRange: [80000, 150000], spendingRange: [5000, 20000] },
            { name: 'Young Professionals', ageRange: [25, 35], incomeRange: [50000, 80000], spendingRange: [2000, 8000] },
            { name: 'Budget Conscious', ageRange: [30, 60], incomeRange: [30000, 60000], spendingRange: [500, 3000] },
            { name: 'Senior Citizens', ageRange: [60, 80], incomeRange: [40000, 70000], spendingRange: [1000, 5000] },
            { name: 'Students', ageRange: [18, 25], incomeRange: [10000, 30000], spendingRange: [200, 1500] }
        ];

        for (let s = 0; s < segments; s++) {
            const profile = segmentProfiles[s % segmentProfiles.length];
            const segmentSize = s === segments - 1 ? size - (segments - 1) * pointsPerSegment : pointsPerSegment;

            for (let i = 0; i < segmentSize; i++) {
                const age = this.randomBetween(profile.ageRange[0], profile.ageRange[1]);
                const income = this.randomBetween(profile.incomeRange[0], profile.incomeRange[1]);
                const spending = this.randomBetween(profile.spendingRange[0], profile.spendingRange[1]);
                
                // Add some correlated features
                const creditScore = Math.min(850, Math.max(300, 
                    600 + (income - 50000) / 1000 + this.generateGaussianRandom() * 50
                ));
                
                const transactionFrequency = Math.max(1, 
                    spending / 1000 + this.generateGaussianRandom() * 2
                );

                const point = {
                    id: data.length,
                    customer_id: `CUST_${String(data.length).padStart(6, '0')}`,
                    age: Math.round(age),
                    annual_income: Math.round(income),
                    annual_spending: Math.round(spending),
                    credit_score: Math.round(creditScore),
                    transaction_frequency: Math.round(transactionFrequency * 10) / 10,
                    loyalty_years: Math.max(0, Math.round((age - 18) * this.rng() * 0.3)),
                    cluster: s,
                    true_cluster: s,
                    segment_name: profile.name
                };

                data.push(point);
            }

            clusterInfo.push({
                id: s,
                name: profile.name,
                size: segmentSize,
                profile: profile,
                color: this.colorPalettes.vibrant[s % this.colorPalettes.vibrant.length]
            });
        }

        return {
            data,
            features: ['age', 'annual_income', 'annual_spending', 'credit_score', 'transaction_frequency', 'loyalty_years'],
            clusters: clusterInfo,
            type: 'customer_segmentation',
            description: 'Customer segmentation dataset with behavioral patterns'
        };
    }

    /**
     * Generate financial market data
     * @param {Object} options - Generation options
     * @returns {Object} Financial dataset
     */
    generateFinancialData(options) {
        const {
            size = 1000,
            timeSpan = 252, // Trading days in a year
            volatilityRegimes = 3
        } = options;

        const data = [];
        const clusterInfo = [];
        let currentPrice = 100;
        let currentVolatility = 0.2;

        // Define volatility regimes
        const regimes = [
            { name: 'Low Volatility', volatility: 0.1, drift: 0.05 },
            { name: 'Normal Volatility', volatility: 0.2, drift: 0.08 },
            { name: 'High Volatility', volatility: 0.4, drift: -0.02 }
        ];

        for (let i = 0; i < size; i++) {
            // Switch regimes occasionally
            if (i % Math.floor(size / volatilityRegimes / 2) === 0) {
                const regime = regimes[Math.floor(this.rng() * regimes.length)];
                currentVolatility = regime.volatility;
            }

            // Generate price movement (geometric Brownian motion)
            const dt = 1 / timeSpan;
            const drift = 0.05; // 5% annual drift
            const dW = this.generateGaussianRandom();
            const priceChange = drift * dt + currentVolatility * Math.sqrt(dt) * dW;
            
            currentPrice *= Math.exp(priceChange);

            // Calculate technical indicators
            const sma20 = i >= 19 ? 
                data.slice(Math.max(0, i - 19), i).reduce((sum, p) => sum + p.price, 0) / Math.min(20, i) + currentPrice :
                currentPrice;

            const rsi = this.calculateRSI(data.slice(Math.max(0, i - 13), i).map(p => p.price).concat([currentPrice]));
            
            const volume = Math.exp(
                Math.log(1000000) + 
                currentVolatility * this.generateGaussianRandom() + 
                Math.abs(priceChange) * 5
            );

            const point = {
                id: i,
                timestamp: Date.now() - (size - i) * 24 * 60 * 60 * 1000, // Daily data going back
                price: Math.round(currentPrice * 100) / 100,
                volume: Math.round(volume),
                volatility: Math.round(currentVolatility * 10000) / 10000,
                returns: i > 0 ? Math.round((currentPrice / data[i-1].price - 1) * 10000) / 10000 : 0,
                sma_20: Math.round(sma20 * 100) / 100,
                rsi: Math.round(rsi * 100) / 100,
                high: Math.round(currentPrice * (1 + Math.abs(this.generateGaussianRandom()) * 0.01) * 100) / 100,
                low: Math.round(currentPrice * (1 - Math.abs(this.generateGaussianRandom()) * 0.01) * 100) / 100,
                cluster: Math.floor(currentVolatility / 0.15), // Cluster by volatility regime
                true_cluster: Math.floor(currentVolatility / 0.15)
            };

            data.push(point);
        }

        // Create cluster info based on volatility regimes
        for (let i = 0; i < volatilityRegimes; i++) {
            clusterInfo.push({
                id: i,
                name: regimes[i % regimes.length].name,
                size: data.filter(p => p.cluster === i).length,
                volatilityRange: [i * 0.15, (i + 1) * 0.15],
                color: this.colorPalettes.monochrome[i % this.colorPalettes.monochrome.length]
            });
        }

        return {
            data,
            features: ['price', 'volume', 'volatility', 'returns', 'sma_20', 'rsi'],
            clusters: clusterInfo,
            type: 'financial_data',
            description: 'Financial time series data with volatility regimes'
        };
    }

    /**
     * Generate sensor IoT data
     * @param {Object} options - Generation options
     * @returns {Object} Sensor dataset
     */
    generateSensorData(options) {
        const {
            size = 1000,
            sensors = 5,
            operatingModes = 3
        } = options;

        const data = [];
        const clusterInfo = [];

        // Define operating modes
        const modes = [
            { name: 'Normal Operation', tempRange: [20, 25], humidityRange: [40, 60], pressureRange: [1010, 1020] },
            { name: 'High Load', tempRange: [25, 35], humidityRange: [30, 50], pressureRange: [1005, 1015] },
            { name: 'Maintenance Mode', tempRange: [15, 22], humidityRange: [45, 65], pressureRange: [1012, 1022] }
        ];

        for (let i = 0; i < size; i++) {
            const mode = modes[Math.floor(this.rng() * modes.length)];
            const sensorId = Math.floor(this.rng() * sensors);
            
            const temperature = this.randomBetween(mode.tempRange[0], mode.tempRange[1]) + 
                                this.generateGaussianRandom() * 0.5;
            
            const humidity = this.randomBetween(mode.humidityRange[0], mode.humidityRange[1]) + 
                            this.generateGaussianRandom() * 2;
            
            const pressure = this.randomBetween(mode.pressureRange[0], mode.pressureRange[1]) + 
                            this.generateGaussianRandom() * 0.5;

            // Correlated features
            const vibration = Math.max(0, temperature / 30 + this.generateGaussianRandom() * 0.1);
            const powerConsumption = temperature * 2 + vibration * 50 + this.generateGaussianRandom() * 5;

            const point = {
                id: i,
                sensor_id: `SENSOR_${String(sensorId).padStart(3, '0')}`,
                timestamp: Date.now() - (size - i) * 60 * 1000, // Minute-by-minute data
                temperature: Math.round(temperature * 100) / 100,
                humidity: Math.round(humidity * 100) / 100,
                pressure: Math.round(pressure * 100) / 100,
                vibration: Math.round(vibration * 1000) / 1000,
                power_consumption: Math.round(powerConsumption * 100) / 100,
                cluster: modes.indexOf(mode),
                true_cluster: modes.indexOf(mode),
                operating_mode: mode.name
            };

            data.push(point);
        }

        // Create cluster info
        modes.forEach((mode, index) => {
            clusterInfo.push({
                id: index,
                name: mode.name,
                size: data.filter(p => p.cluster === index).length,
                characteristics: mode,
                color: this.colorPalettes.cool[index % this.colorPalettes.cool.length]
            });
        });

        return {
            data,
            features: ['temperature', 'humidity', 'pressure', 'vibration', 'power_consumption'],
            clusters: clusterInfo,
            type: 'sensor_data',
            description: 'IoT sensor data with different operating modes'
        };
    }

    /**
     * Generate outlier dataset for outlier detection testing
     * @param {Object} options - Generation options
     * @returns {Object} Dataset with outliers
     */
    generateOutlierDataset(options) {
        const {
            size = 1000,
            outlierPercentage = 0.05,
            dimensions = 2,
            clusters = 2
        } = options;

        // Generate base clusters
        const baseDataset = this.generateGaussianClusters({
            size: Math.floor(size * (1 - outlierPercentage)),
            clusters,
            dimensions,
            separation: 3.0,
            clusterVariance: 1.0
        });

        const data = [...baseDataset.data];
        const outlierCount = size - data.length;

        // Add outliers
        for (let i = 0; i < outlierCount; i++) {
            const point = { 
                id: data.length,
                cluster: -1, // Mark as outlier
                true_cluster: -1,
                is_outlier: true
            };

            // Generate outlier in random location far from clusters
            for (let d = 0; d < dimensions; d++) {
                const direction = this.rng() > 0.5 ? 1 : -1;
                const distance = 8 + this.rng() * 5; // Far from cluster centers
                point[`feature_${d}`] = direction * distance + this.generateGaussianRandom();
            }

            data.push(point);
        }

        // Mark normal points
        data.forEach(point => {
            if (point.is_outlier === undefined) {
                point.is_outlier = false;
            }
        });

        return {
            data: this.shuffleArray(data), // Shuffle to mix outliers with normal points
            features: baseDataset.features,
            clusters: baseDataset.clusters,
            outliers: outlierCount,
            type: 'outlier_dataset',
            description: `Dataset with ${outlierPercentage * 100}% outliers for outlier detection testing`
        };
    }

    /**
     * Utility methods
     */

    /**
     * Generate cluster centers with minimum separation
     * @param {Number} numClusters - Number of clusters
     * @param {Number} dimensions - Number of dimensions
     * @param {Number} separation - Minimum separation between centers
     * @returns {Array} Array of cluster centers
     */
    generateClusterCenters(numClusters, dimensions, separation) {
        const centers = [];
        const maxAttempts = 1000;

        for (let c = 0; c < numClusters; c++) {
            let attempts = 0;
            let validCenter = false;
            let center;

            while (!validCenter && attempts < maxAttempts) {
                center = [];
                for (let d = 0; d < dimensions; d++) {
                    center.push((this.rng() - 0.5) * separation * 2);
                }

                // Check minimum distance to existing centers
                validCenter = true;
                for (const existingCenter of centers) {
                    const distance = Math.sqrt(
                        center.reduce((sum, coord, i) => 
                            sum + Math.pow(coord - existingCenter[i], 2), 0
                        )
                    );
                    
                    if (distance < separation) {
                        validCenter = false;
                        break;
                    }
                }

                attempts++;
            }

            centers.push(center);
        }

        return centers;
    }

    /**
     * Generate Gaussian random number using Box-Muller transform
     * @returns {Number} Gaussian random number (mean=0, std=1)
     */
    generateGaussianRandom() {
        // Box-Muller transform
        if (this.spare !== undefined) {
            const spare = this.spare;
            delete this.spare;
            return spare;
        }

        const u = this.rng();
        const v = this.rng();
        const mag = Math.sqrt(-2 * Math.log(u));
        
        this.spare = mag * Math.cos(2 * Math.PI * v);
        return mag * Math.sin(2 * Math.PI * v);
    }

    /**
     * Generate random number between min and max
     * @param {Number} min - Minimum value
     * @param {Number} max - Maximum value
     * @returns {Number} Random number
     */
    randomBetween(min, max) {
        return min + this.rng() * (max - min);
    }

    /**
     * Calculate RSI (Relative Strength Index)
     * @param {Array} prices - Array of prices
     * @returns {Number} RSI value (0-100)
     */
    calculateRSI(prices) {
        if (prices.length < 14) return 50; // Default neutral RSI

        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }

        const gains = changes.filter(change => change > 0);
        const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));

        const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length : 0;

        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Validate generated dataset
     * @param {Object} dataset - Dataset to validate
     */
    validateDataset(dataset) {
        if (!dataset.data || !Array.isArray(dataset.data)) {
            throw new Error('Dataset must contain a data array');
        }

        if (dataset.data.length === 0) {
            throw new Error('Dataset cannot be empty');
        }

        if (!dataset.features || !Array.isArray(dataset.features)) {
            throw new Error('Dataset must contain a features array');
        }

        // Check that all data points have required features
        const firstPoint = dataset.data[0];
        dataset.features.forEach(feature => {
            if (firstPoint[feature] === undefined) {
                throw new Error(`Feature '${feature}' not found in data points`);
            }
        });
    }

    /**
     * Get list of available templates
     * @returns {Array} List of available template names
     */
    getAvailableTemplates() {
        return Object.keys(this.templates).map(template => ({
            name: template,
            description: this.getTemplateDescription(template)
        }));
    }

    /**
     * Get description for a template
     * @param {String} template - Template name
     * @returns {String} Template description
     */
    getTemplateDescription(template) {
        const descriptions = {
            'gaussian_clusters': 'Spherical clusters with Gaussian distribution',
            'ring_clusters': 'Concentric ring-shaped clusters',
            'spiral_clusters': 'Spiral-shaped clusters with configurable turns',
            'blob_clusters': 'Irregular blob-shaped clusters',
            'elongated_clusters': 'Elongated elliptical clusters',
            'hierarchical_clusters': 'Nested hierarchical cluster structure',
            'noisy_moons': 'Two interleaving half-moon shapes with noise',
            'swiss_roll': '3D swiss roll manifold structure',
            'anisotropic_clusters': 'Clusters with different variances in each dimension',
            'varying_density': 'Clusters with different densities',
            'outlier_dataset': 'Dataset with controlled outlier percentage',
            'time_series': 'Time-series data with temporal patterns',
            'customer_segmentation': 'Realistic customer behavior data',
            'financial_data': 'Financial market data with volatility regimes',
            'ecommerce_behavior': 'E-commerce user behavior patterns',
            'social_network': 'Social network interaction data',
            'sensor_data': 'IoT sensor data with operating modes',
            'image_features': 'Synthetic image feature vectors'
        };

        return descriptions[template] || 'Unknown template';
    }

    /**
     * Export dataset to various formats
     * @param {Object} dataset - Dataset to export
     * @param {String} format - Export format (csv, json, excel)
     * @returns {String|Object} Exported data
     */
    exportDataset(dataset, format = 'csv') {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportToCSV(dataset);
            case 'json':
                return this.exportToJSON(dataset);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export dataset to CSV format
     * @param {Object} dataset - Dataset to export
     * @returns {String} CSV string
     */
    exportToCSV(dataset) {
        if (!dataset.data || dataset.data.length === 0) {
            return '';
        }

        const headers = Object.keys(dataset.data[0]);
        const csvLines = [headers.join(',')];

        dataset.data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvLines.push(values.join(','));
        });

        return csvLines.join('\n');
    }

    /**
     * Export dataset to JSON format
     * @param {Object} dataset - Dataset to export
     * @returns {String} JSON string
     */
    exportToJSON(dataset) {
        return JSON.stringify(dataset, null, 2);
    }
}

// Export for use
export default DataGenerator;