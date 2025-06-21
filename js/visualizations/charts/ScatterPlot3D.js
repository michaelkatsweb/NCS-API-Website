/**
 * NCS-API Website - 3D Scatter Plot Visualization
 * Three.js-based 3D scatter plot for advanced clustering visualization
 * 
 * Features:
 * - Three.js powered 3D rendering
 * - Interactive camera controls (orbit, pan, zoom)
 * - Real-time point cloud visualization
 * - Cluster coloring and grouping
 * - Point selection and highlighting
 * - Animated transitions
 * - VR/AR support (optional)
 * - Performance optimization for large datasets
 */

import * as THREE from 'three';
import { EventBus } from '../core/eventBusNew.js';
import { UI, PERFORMANCE } from '../config/constants.js';

export class ScatterPlot3D {
    constructor(container, options = {}) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        // Configuration
        this.options = {
            width: options.width || UI.VIZ.DEFAULT_WIDTH,
            height: options.height || UI.VIZ.DEFAULT_HEIGHT,
            pointSize: options.pointSize || UI.VIZ.POINT_SIZE.DEFAULT,
            pointOpacity: options.pointOpacity || UI.VIZ.OPACITY.POINTS,
            showAxes: options.showAxes !== false,
            showGrid: options.showGrid !== false,
            showLabels: options.showLabels !== false,
            enableOrbitControls: options.enableOrbitControls !== false,
            enableVR: options.enableVR || false,
            animationDuration: options.animationDuration || 1000,
            colorScheme: options.colorScheme || UI.VIZ.CLUSTER_COLORS,
            backgroundColor: options.backgroundColor || 0x1a1a1a,
            cameraPosition: options.cameraPosition || [5, 5, 5],
            maxPoints: options.maxPoints || PERFORMANCE.CANVAS_MAX_POINTS,
            enableLOD: options.enableLOD !== false, // Level of Detail
            ...options
        };
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        // Point cloud system
        this.pointClouds = new Map(); // One per cluster
        this.allPoints = [];
        this.selectedPoints = new Set();
        this.hoveredPoint = null;
        
        // Scene objects
        this.axes = null;
        this.grid = null;
        this.labels = [];
        this.clusterCenters = [];
        this.highlightSphere = null;
        
        // State
        this.state = {
            data: [],
            clusters: [],
            dimensions: {
                xMin: -1, xMax: 1,
                yMin: -1, yMax: 1,
                zMin: -1, zMax: 1
            },
            isAnimating: false,
            needsUpdate: true,
            lastFrameTime: 0,
            frameCount: 0,
            fps: 60
        };
        
        // Animation
        this.animationMixer = null;
        this.clock = new THREE.Clock();
        
        this.init();
    }

    /**
     * Initialize the 3D scatter plot
     */
    init() {
        this.createScene();
        this.createRenderer();
        this.createCamera();
        this.createControls();
        this.createLights();
        this.createHelpers();
        this.setupEventListeners();
        this.startRenderLoop();
        
        console.log('🎮 ScatterPlot3D initialized');
    }

    /**
     * Create Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);
        
        // Fog for depth perception
        this.scene.fog = new THREE.Fog(this.options.backgroundColor, 10, 50);
    }

    /**
     * Create WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(this.options.width, this.options.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Output encoding for better colors
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Create camera
     */
    createCamera() {
        const aspect = this.options.width / this.options.height;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(...this.options.cameraPosition);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Create orbit controls
     */
    createControls() {
        if (!this.options.enableOrbitControls) return;
        
        // Import OrbitControls dynamically
        import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            
            // Configure controls
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.enablePan = true;
            this.controls.enableRotate = true;
            
            // Limits
            this.controls.minDistance = 1;
            this.controls.maxDistance = 50;
            this.controls.minPolarAngle = 0;
            this.controls.maxPolarAngle = Math.PI;
            
            // Auto-rotate
            this.controls.autoRotate = false;
            this.controls.autoRotateSpeed = 2.0;
            
            // Events
            this.controls.addEventListener('change', () => {
                this.state.needsUpdate = true;
            });
            
            console.log('🎮 Orbit controls initialized');
        }).catch(error => {
            console.warn('Failed to load OrbitControls:', error);
        });
    }

    /**
     * Create lighting
     */
    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (main)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        
        // Configure shadow
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        
        this.scene.add(directionalLight);
        
        // Point light for accent
        const pointLight = new THREE.PointLight(0x66aaff, 0.5, 30);
        pointLight.position.set(-5, 5, -5);
        this.scene.add(pointLight);
    }

    /**
     * Create visual helpers (axes, grid)
     */
    createHelpers() {
        if (this.options.showAxes) {
            this.createAxes();
        }
        
        if (this.options.showGrid) {
            this.createGrid();
        }
        
        // Create raycaster for picking
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.1;
        
        // Create highlight sphere
        this.createHighlightSphere();
    }

    /**
     * Create coordinate axes
     */
    createAxes() {
        const axesGroup = new THREE.Group();
        
        // Axis materials
        const materials = {
            x: new THREE.LineBasicMaterial({ color: 0xff0000 }),
            y: new THREE.LineBasicMaterial({ color: 0x00ff00 }),
            z: new THREE.LineBasicMaterial({ color: 0x0000ff })
        };
        
        // Create axes
        const axisLength = 5;
        const axes = [
            { dir: [axisLength, 0, 0], color: 'x' },
            { dir: [0, axisLength, 0], color: 'y' },
            { dir: [0, 0, axisLength], color: 'z' }
        ];
        
        axes.forEach(axis => {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(...axis.dir)
            ]);
            
            const line = new THREE.Line(geometry, materials[axis.color]);
            axesGroup.add(line);
            
            // Add arrow head
            const arrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
            const arrowMaterial = new THREE.MeshBasicMaterial({ color: materials[axis.color].color });
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            
            arrow.position.set(...axis.dir);
            if (axis.color === 'x') {
                arrow.rotateZ(-Math.PI / 2);
            } else if (axis.color === 'z') {
                arrow.rotateX(Math.PI / 2);
            }
            
            axesGroup.add(arrow);
        });
        
        this.axes = axesGroup;
        this.scene.add(this.axes);
        
        if (this.options.showLabels) {
            this.createAxisLabels();
        }
    }

    /**
     * Create grid
     */
    createGrid() {
        const gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444);
        this.grid = gridHelper;
        this.scene.add(this.grid);
    }

    /**
     * Create axis labels
     */
    createAxisLabels() {
        // This would require a text geometry library like troika-three-text
        // For now, we'll skip detailed text labels
        console.log('📝 Axis labels would be created here with text geometry');
    }

    /**
     * Create highlight sphere for selections
     */
    createHighlightSphere() {
        const geometry = new THREE.SphereGeometry(0.1, 16, 12);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.6
        });
        
        this.highlightSphere = new THREE.Mesh(geometry, material);
        this.highlightSphere.visible = false;
        this.scene.add(this.highlightSphere);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Set data for the scatter plot
     */
    setData(data) {
        this.state.data = data || [];
        this.calculateDimensions();
        this.updatePointClouds();
        this.state.needsUpdate = true;
        
        console.log(`🎮 ScatterPlot3D data updated: ${this.state.data.length} points`);
    }

    /**
     * Set cluster information
     */
    setClusters(clusters) {
        this.state.clusters = clusters || [];
        this.updatePointClouds();
        this.updateClusterCenters();
        this.state.needsUpdate = true;
        
        console.log(`🎮 ScatterPlot3D clusters updated: ${this.state.clusters.length} clusters`);
    }

    /**
     * Calculate data dimensions
     */
    calculateDimensions() {
        if (this.state.data.length === 0) {
            this.state.dimensions = { xMin: -1, xMax: 1, yMin: -1, yMax: 1, zMin: -1, zMax: 1 };
            return;
        }
        
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;
        let zMin = Infinity, zMax = -Infinity;
        
        this.state.data.forEach(point => {
            const x = point.x !== undefined ? point.x : point[0] || 0;
            const y = point.y !== undefined ? point.y : point[1] || 0;
            const z = point.z !== undefined ? point.z : point[2] || 0;
            
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
            zMin = Math.min(zMin, z);
            zMax = Math.max(zMax, z);
        });
        
        // Add padding
        const xPadding = (xMax - xMin) * 0.1;
        const yPadding = (yMax - yMin) * 0.1;
        const zPadding = (zMax - zMin) * 0.1;
        
        this.state.dimensions = {
            xMin: xMin - xPadding, xMax: xMax + xPadding,
            yMin: yMin - yPadding, yMax: yMax + yPadding,
            zMin: zMin - zPadding, zMax: zMax + zPadding
        };
    }

    /**
     * Update point clouds
     */
    updatePointClouds() {
        // Clear existing point clouds
        this.pointClouds.forEach(pointCloud => {
            this.scene.remove(pointCloud);
            pointCloud.geometry.dispose();
            pointCloud.material.dispose();
        });
        this.pointClouds.clear();
        this.allPoints = [];
        
        if (this.state.data.length === 0) return;
        
        // Group points by cluster
        const clusterGroups = new Map();
        
        this.state.data.forEach((point, index) => {
            const cluster = point.cluster !== undefined ? point.cluster : -1;
            
            if (!clusterGroups.has(cluster)) {
                clusterGroups.set(cluster, []);
            }
            
            clusterGroups.get(cluster).push({ ...point, originalIndex: index });
        });
        
        // Create point cloud for each cluster
        clusterGroups.forEach((points, cluster) => {
            this.createClusterPointCloud(points, cluster);
        });
        
        console.log(`🎮 Created ${this.pointClouds.size} point clouds`);
    }

    /**
     * Create point cloud for a cluster
     */
    createClusterPointCloud(points, cluster) {
        const positions = [];
        const colors = [];
        const sizes = [];
        
        // Determine cluster color
        let clusterColor = new THREE.Color(0x999999); // Default gray
        if (cluster >= 0 && cluster < this.options.colorScheme.length) {
            clusterColor = new THREE.Color(this.options.colorScheme[cluster]);
        }
        
        points.forEach(point => {
            // Position
            const x = point.x !== undefined ? point.x : point[0] || 0;
            const y = point.y !== undefined ? point.y : point[1] || 0;
            const z = point.z !== undefined ? point.z : point[2] || 0;
            
            // Normalize coordinates
            const { dimensions } = this.state;
            const normalizedX = ((x - dimensions.xMin) / (dimensions.xMax - dimensions.xMin) - 0.5) * 10;
            const normalizedY = ((y - dimensions.yMin) / (dimensions.yMax - dimensions.yMin) - 0.5) * 10;
            const normalizedZ = ((z - dimensions.zMin) / (dimensions.zMax - dimensions.zMin) - 0.5) * 10;
            
            positions.push(normalizedX, normalizedY, normalizedZ);
            
            // Color
            colors.push(clusterColor.r, clusterColor.g, clusterColor.b);
            
            // Size
            let size = this.options.pointSize;
            if (this.selectedPoints.has(point.originalIndex)) {
                size *= 2;
            }
            sizes.push(size);
            
            // Store for picking
            this.allPoints.push({
                position: new THREE.Vector3(normalizedX, normalizedY, normalizedZ),
                originalIndex: point.originalIndex,
                cluster
            });
        });
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: this.options.pointSize,
            vertexColors: true,
            transparent: true,
            opacity: this.options.pointOpacity,
            sizeAttenuation: true,
            alphaTest: 0.1
        });
        
        // Use custom shader for better point rendering
        if (this.options.enableLOD && points.length > 1000) {
            this.createLODPointMaterial(material);
        }
        
        // Create point cloud
        const pointCloud = new THREE.Points(geometry, material);
        pointCloud.userData = { cluster, pointCount: points.length };
        
        this.pointClouds.set(cluster, pointCloud);
        this.scene.add(pointCloud);
    }

    /**
     * Create Level of Detail point material
     */
    createLODPointMaterial(baseMaterial) {
        // Custom shader for LOD point rendering
        baseMaterial.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                'void main() {',
                `
                attribute float size;
                varying float vDistance;
                void main() {
                `
            );
            
            shader.vertexShader = shader.vertexShader.replace(
                'gl_PointSize = size;',
                `
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vDistance = -mvPosition.z;
                gl_PointSize = size * (300.0 / -mvPosition.z);
                `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                'void main() {',
                `
                varying float vDistance;
                void main() {
                `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                'gl_FragColor = vec4( diffuse, opacity );',
                `
                float alpha = opacity;
                if (vDistance > 20.0) {
                    alpha *= (30.0 - vDistance) / 10.0;
                }
                gl_FragColor = vec4(diffuse, alpha);
                `
            );
        };
    }

    /**
     * Update cluster centers
     */
    updateClusterCenters() {
        // Remove existing cluster centers
        this.clusterCenters.forEach(center => {
            this.scene.remove(center);
            center.geometry.dispose();
            center.material.dispose();
        });
        this.clusterCenters = [];
        
        if (this.state.clusters.length === 0) return;
        
        this.state.clusters.forEach((cluster, index) => {
            if (!cluster.center || cluster.center.length < 3) return;
            
            // Normalize center coordinates
            const { dimensions } = this.state;
            const x = ((cluster.center[0] - dimensions.xMin) / (dimensions.xMax - dimensions.xMin) - 0.5) * 10;
            const y = ((cluster.center[1] - dimensions.yMin) / (dimensions.yMax - dimensions.yMin) - 0.5) * 10;
            const z = ((cluster.center[2] - dimensions.zMin) / (dimensions.zMax - dimensions.zMin) - 0.5) * 10;
            
            // Create center marker
            const geometry = new THREE.SphereGeometry(0.15, 16, 12);
            const material = new THREE.MeshLambertMaterial({
                color: this.options.colorScheme[index % this.options.colorScheme.length],
                emissive: 0x222222
            });
            
            const centerMesh = new THREE.Mesh(geometry, material);
            centerMesh.position.set(x, y, z);
            centerMesh.castShadow = true;
            centerMesh.userData = { type: 'clusterCenter', cluster: index };
            
            // Add wireframe outline
            const wireframeGeometry = new THREE.SphereGeometry(0.16, 16, 12);
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
            centerMesh.add(wireframe);
            
            this.clusterCenters.push(centerMesh);
            this.scene.add(centerMesh);
        });
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            const deltaTime = this.clock.getDelta();
            
            // Update controls
            if (this.controls) {
                this.controls.update();
            }
            
            // Update animations
            if (this.animationMixer) {
                this.animationMixer.update(deltaTime);
            }
            
            // Update performance stats
            this.updateStats(timestamp);
            
            // Render scene
            if (this.state.needsUpdate || this.state.isAnimating) {
                this.renderer.render(this.scene, this.camera);
                this.state.needsUpdate = false;
            }
            
            requestAnimationFrame(render);
        };
        
        render(performance.now());
    }

    /**
     * Handle mouse movement for hovering
     */
    handleMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Perform raycasting for hover effects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const pointClouds = Array.from(this.pointClouds.values());
        const intersects = this.raycaster.intersectObjects(pointClouds);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const pointIndex = intersect.index;
            
            if (pointIndex !== undefined && pointIndex < this.allPoints.length) {
                this.setHoveredPoint(pointIndex);
            }
        } else {
            this.setHoveredPoint(null);
        }
    }

    /**
     * Handle mouse clicks for selection
     */
    handleClick(event) {
        // Perform raycasting for selection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const pointClouds = Array.from(this.pointClouds.values());
        const intersects = this.raycaster.intersectObjects(pointClouds);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const pointIndex = intersect.index;
            
            if (pointIndex !== undefined && pointIndex < this.allPoints.length) {
                const point = this.allPoints[pointIndex];
                
                if (event.ctrlKey || event.metaKey) {
                    // Multi-select
                    if (this.selectedPoints.has(point.originalIndex)) {
                        this.selectedPoints.delete(point.originalIndex);
                    } else {
                        this.selectedPoints.add(point.originalIndex);
                    }
                } else {
                    // Single select
                    this.selectedPoints.clear();
                    this.selectedPoints.add(point.originalIndex);
                }
                
                this.updateSelectionHighlights();
                
                // Emit selection event
                this.eventBus.emit('point:selected', {
                    pointId: point.originalIndex,
                    point: this.state.data[point.originalIndex],
                    selectedPoints: Array.from(this.selectedPoints)
                });
            }
        }
    }

    /**
     * Set hovered point
     */
    setHoveredPoint(pointIndex) {
        if (this.hoveredPoint === pointIndex) return;
        
        this.hoveredPoint = pointIndex;
        
        if (pointIndex !== null && pointIndex < this.allPoints.length) {
            const point = this.allPoints[pointIndex];
            this.highlightSphere.position.copy(point.position);
            this.highlightSphere.visible = true;
            
            // Show tooltip
            this.showTooltip(point);
        } else {
            this.highlightSphere.visible = false;
            this.hideTooltip();
        }
        
        this.state.needsUpdate = true;
    }

    /**
     * Update selection highlights
     */
    updateSelectionHighlights() {
        // Recreate point clouds with updated selection state
        this.updatePointClouds();
    }

    /**
     * Show tooltip
     */
    showTooltip(point) {
        // This would show a tooltip with point information
        // Implementation depends on the tooltip system
        console.log('Tooltip for point:', point);
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        // Hide tooltip
        console.log('Hide tooltip');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.options.width || newHeight !== this.options.height) {
            this.options.width = newWidth;
            this.options.height = newHeight;
            
            this.camera.aspect = newWidth / newHeight;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(newWidth, newHeight);
            this.state.needsUpdate = true;
        }
    }

    /**
     * Handle keyboard input
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'r':
                this.resetCamera();
                break;
            case 'a':
                if (this.controls) {
                    this.controls.autoRotate = !this.controls.autoRotate;
                }
                break;
            case 'Escape':
                this.selectedPoints.clear();
                this.updateSelectionHighlights();
                break;
            case 'f':
                this.fitCameraToData();
                break;
        }
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        this.camera.position.set(...this.options.cameraPosition);
        this.camera.lookAt(0, 0, 0);
        
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        this.state.needsUpdate = true;
    }

    /**
     * Fit camera to data bounds
     */
    fitCameraToData() {
        if (this.state.data.length === 0) return;
        
        // Calculate bounding sphere
        const box = new THREE.Box3();
        this.pointClouds.forEach(pointCloud => {
            box.expandByObject(pointCloud);
        });
        
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const distance = maxDim / (2 * Math.tan(Math.PI * this.camera.fov / 360));
        
        this.camera.position.copy(center);
        this.camera.position.z += distance * 1.5;
        this.camera.lookAt(center);
        
        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
        
        this.state.needsUpdate = true;
    }

    /**
     * Update performance stats
     */
    updateStats(timestamp) {
        this.state.frameCount++;
        
        if (timestamp - this.state.lastFrameTime >= 1000) {
            this.state.fps = this.state.frameCount;
            this.state.frameCount = 0;
            this.state.lastFrameTime = timestamp;
        }
    }

    /**
     * Animate camera to position
     */
    animateCameraTo(position, target, duration = 1000) {
        if (!this.animationMixer) {
            this.animationMixer = new THREE.AnimationMixer(this.scene);
        }
        
        this.state.isAnimating = true;
        
        // Create animation tracks
        const positionTrack = new THREE.VectorKeyframeTrack(
            '.camera.position',
            [0, duration / 1000],
            [...this.camera.position.toArray(), ...position]
        );
        
        const targetTrack = new THREE.VectorKeyframeTrack(
            '.controls.target',
            [0, duration / 1000],
            [...(this.controls?.target.toArray() || [0, 0, 0]), ...target]
        );
        
        // Create animation clip
        const clip = new THREE.AnimationClip('cameraAnimation', duration / 1000, [positionTrack, targetTrack]);
        const action = this.animationMixer.clipAction(clip);
        
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        
        action.play();
        
        // Handle animation completion
        this.animationMixer.addEventListener('finished', () => {
            this.state.isAnimating = false;
        });
    }

    /**
     * Export as image
     */
    exportImage(format = 'png') {
        const link = document.createElement('a');
        link.download = `scatter-plot-3d.${format}`;
        link.href = this.renderer.domElement.toDataURL(`image/${format}`);
        link.click();
    }

    /**
     * Get render statistics
     */
    getStats() {
        return {
            fps: this.state.fps,
            pointClouds: this.pointClouds.size,
            totalPoints: this.allPoints.length,
            selectedPoints: this.selectedPoints.size,
            triangles: this.renderer.info.render.triangles,
            calls: this.renderer.info.render.calls
        };
    }

    /**
     * Toggle auto-rotation
     */
    toggleAutoRotate() {
        if (this.controls) {
            this.controls.autoRotate = !this.controls.autoRotate;
        }
    }

    /**
     * Set point size
     */
    setPointSize(size) {
        this.options.pointSize = size;
        this.updatePointClouds();
    }

    /**
     * Set opacity
     */
    setOpacity(opacity) {
        this.options.pointOpacity = opacity;
        this.pointClouds.forEach(pointCloud => {
            pointCloud.material.opacity = opacity;
        });
        this.state.needsUpdate = true;
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedPoints.clear();
        this.updateSelectionHighlights();
    }

    /**
     * Get selected points
     */
    getSelectedPoints() {
        return Array.from(this.selectedPoints).map(index => this.state.data[index]);
    }

    /**
     * Destroy the 3D scatter plot
     */
    destroy() {
        // Dispose of Three.js resources
        this.pointClouds.forEach(pointCloud => {
            this.scene.remove(pointCloud);
            pointCloud.geometry.dispose();
            pointCloud.material.dispose();
        });
        
        this.clusterCenters.forEach(center => {
            this.scene.remove(center);
            center.geometry.dispose();
            center.material.dispose();
        });
        
        if (this.axes) {
            this.scene.remove(this.axes);
            this.axes.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        if (this.grid) {
            this.scene.remove(this.grid);
            this.grid.geometry.dispose();
            this.grid.material.dispose();
        }
        
        if (this.highlightSphere) {
            this.scene.remove(this.highlightSphere);
            this.highlightSphere.geometry.dispose();
            this.highlightSphere.material.dispose();
        }
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        console.log('🎮 ScatterPlot3D destroyed');
    }
}