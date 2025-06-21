/**
 * NCS-API Website - WebGL Renderer
 * High-performance 3D rendering engine for large datasets
 * 
 * Features:
 * - Hardware-accelerated rendering with WebGL
 * - Efficient instanced rendering for thousands of points
 * - Camera controls (orbit, pan, zoom)
 * - Dynamic point sizing and coloring
 * - Real-time shader-based effects
 * - Picking and selection support
 * - Multiple rendering modes (points, spheres, cubes)
 * - Post-processing effects
 */

import { EventBus } from '../core/eventBusNew.js';
import { UI, PERFORMANCE } from '../config/constants.js';

export class WebGLRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.eventBus = EventBus.getInstance();
        
        // Configuration
        this.options = {
            width: options.width || UI.VIZ.DEFAULT_WIDTH,
            height: options.height || UI.VIZ.DEFAULT_HEIGHT,
            backgroundColor: options.backgroundColor || [0.1, 0.1, 0.1, 1.0],
            pointSize: options.pointSize || UI.VIZ.POINT_SIZE.DEFAULT,
            renderMode: options.renderMode || 'spheres', // 'points', 'spheres', 'cubes'
            enableLighting: options.enableLighting !== false,
            enableShadows: options.enableShadows || false,
            enablePostProcessing: options.enablePostProcessing || false,
            maxPoints: options.maxPoints || PERFORMANCE.MAX_DATA_POINTS,
            colorScheme: options.colorScheme || UI.VIZ.CLUSTER_COLORS,
            ...options
        };
        
        // WebGL context and resources
        this.canvas = null;
        this.gl = null;
        this.programs = {};
        this.buffers = {};
        this.textures = {};
        this.framebuffers = {};
        
        // Camera state
        this.camera = {
            position: [0, 0, 5],
            target: [0, 0, 0],
            up: [0, 1, 0],
            fov: 45,
            near: 0.1,
            far: 100,
            viewMatrix: new Float32Array(16),
            projectionMatrix: new Float32Array(16),
            isDirty: true
        };
        
        // Interaction state
        this.interaction = {
            isRotating: false,
            isPanning: false,
            isZooming: false,
            lastMousePos: { x: 0, y: 0 },
            rotation: { x: 0, y: 0 },
            distance: 5,
            panOffset: { x: 0, y: 0 }
        };
        
        // Render state
        this.state = {
            data: [],
            clusters: [],
            selectedPoints: new Set(),
            hoveredPoint: -1,
            needsRedraw: true,
            stats: {
                frameCount: 0,
                lastFrameTime: 0,
                fps: 60,
                drawCalls: 0,
                pointsRendered: 0
            }
        };
        
        // Animation
        this.animationFrame = null;
        this.startTime = Date.now();
        
        this.init();
    }

    /**
     * Initialize the WebGL renderer
     */
    init() {
        this.createCanvas();
        this.initWebGL();
        this.createShaders();
        this.createBuffers();
        this.setupEventListeners();
        this.startRenderLoop();
        
        console.log('🎮 WebGL Renderer initialized');
    }

    /**
     * Create canvas element
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.cssText = `
            display: block;
            cursor: grab;
        `;
        
        this.container.appendChild(this.canvas);
    }

    /**
     * Initialize WebGL context
     */
    initWebGL() {
        const contextOptions = {
            alpha: false,
            depth: true,
            stencil: false,
            antialias: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        };
        
        this.gl = this.canvas.getContext('webgl2', contextOptions) ||
                  this.canvas.getContext('webgl', contextOptions);
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        // Setup WebGL state
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(...this.options.backgroundColor);
        this.gl.viewport(0, 0, this.options.width, this.options.height);
        
        // Check for required extensions
        this.checkExtensions();
        
        console.log('🎮 WebGL context initialized:', this.getWebGLInfo());
    }

    /**
     * Check for WebGL extensions
     */
    checkExtensions() {
        const extensions = [
            'OES_element_index_uint',
            'OES_standard_derivatives',
            'WEBGL_depth_texture'
        ];
        
        extensions.forEach(ext => {
            const extension = this.gl.getExtension(ext);
            if (!extension) {
                console.warn(`WebGL extension ${ext} not available`);
            }
        });
        
        // Check for instanced rendering support
        this.instancedExt = this.gl.getExtension('ANGLE_instanced_arrays');
        if (!this.instancedExt && this.gl.drawArraysInstanced) {
            // WebGL2 has instanced rendering built-in
            this.instancedExt = {
                drawArraysInstancedANGLE: this.gl.drawArraysInstanced.bind(this.gl),
                drawElementsInstancedANGLE: this.gl.drawElementsInstanced.bind(this.gl),
                vertexAttribDivisorANGLE: this.gl.vertexAttribDivisor.bind(this.gl)
            };
        }
    }

    /**
     * Create shader programs
     */
    createShaders() {
        // Point rendering shader
        this.programs.points = this.createProgram(
            this.vertexShaderPoints(),
            this.fragmentShaderPoints()
        );
        
        // Sphere rendering shader (instanced)
        this.programs.spheres = this.createProgram(
            this.vertexShaderSpheres(),
            this.fragmentShaderSpheres()
        );
        
        // Picking shader for selection
        this.programs.picking = this.createProgram(
            this.vertexShaderPicking(),
            this.fragmentShaderPicking()
        );
        
        console.log('🎮 Shaders created');
    }

    /**
     * Vertex shader for point rendering
     */
    vertexShaderPoints() {
        return `
            attribute vec3 a_position;
            attribute vec3 a_color;
            attribute float a_size;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform float u_pointScale;
            
            varying vec3 v_color;
            
            void main() {
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
                gl_PointSize = a_size * u_pointScale;
                v_color = a_color;
            }
        `;
    }

    /**
     * Fragment shader for point rendering
     */
    fragmentShaderPoints() {
        return `
            precision mediump float;
            
            varying vec3 v_color;
            
            void main() {
                // Create circular points
                vec2 coord = gl_PointCoord - vec2(0.5);
                if (length(coord) > 0.5) {
                    discard;
                }
                
                // Smooth edges
                float alpha = 1.0 - smoothstep(0.3, 0.5, length(coord));
                gl_FragColor = vec4(v_color, alpha);
            }
        `;
    }

    /**
     * Vertex shader for sphere rendering (instanced)
     */
    vertexShaderSpheres() {
        return `
            // Sphere geometry
            attribute vec3 a_position;
            attribute vec3 a_normal;
            
            // Instance data
            attribute vec3 a_instancePosition;
            attribute vec3 a_instanceColor;
            attribute float a_instanceSize;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            uniform vec3 u_lightDirection;
            
            varying vec3 v_color;
            varying vec3 v_normal;
            varying vec3 v_lightDirection;
            
            void main() {
                // Scale and position sphere
                vec3 scaledPosition = a_position * a_instanceSize;
                vec3 worldPosition = scaledPosition + a_instancePosition;
                
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(worldPosition, 1.0);
                
                v_color = a_instanceColor;
                v_normal = a_normal;
                v_lightDirection = u_lightDirection;
            }
        `;
    }

    /**
     * Fragment shader for sphere rendering
     */
    fragmentShaderSpheres() {
        return `
            precision mediump float;
            
            varying vec3 v_color;
            varying vec3 v_normal;
            varying vec3 v_lightDirection;
            
            void main() {
                // Simple lighting
                float lightIntensity = max(0.2, dot(normalize(v_normal), normalize(v_lightDirection)));
                vec3 finalColor = v_color * lightIntensity;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
    }

    /**
     * Vertex shader for picking
     */
    vertexShaderPicking() {
        return `
            attribute vec3 a_position;
            attribute float a_id;
            
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            
            varying float v_id;
            
            void main() {
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
                v_id = a_id;
            }
        `;
    }

    /**
     * Fragment shader for picking
     */
    fragmentShaderPicking() {
        return `
            precision mediump float;
            
            varying float v_id;
            
            void main() {
                // Encode ID as color
                float id = v_id;
                float r = mod(id, 256.0) / 255.0;
                float g = mod(floor(id / 256.0), 256.0) / 255.0;
                float b = mod(floor(id / 65536.0), 256.0) / 255.0;
                
                gl_FragColor = vec4(r, g, b, 1.0);
            }
        `;
    }

    /**
     * Create shader program
     */
    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Shader program link error: ${error}`);
        }
        
        // Get attribute and uniform locations
        const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
        const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
        
        program.attributes = {};
        program.uniforms = {};
        
        for (let i = 0; i < numAttributes; i++) {
            const info = this.gl.getActiveAttrib(program, i);
            program.attributes[info.name] = this.gl.getAttribLocation(program, info.name);
        }
        
        for (let i = 0; i < numUniforms; i++) {
            const info = this.gl.getActiveUniform(program, i);
            program.uniforms[info.name] = this.gl.getUniformLocation(program, info.name);
        }
        
        return program;
    }

    /**
     * Create individual shader
     */
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${error}`);
        }
        
        return shader;
    }

    /**
     * Create buffers
     */
    createBuffers() {
        // Sphere geometry for instanced rendering
        this.createSphereGeometry();
        
        // Data buffers (will be populated when data is set)
        this.buffers.positions = this.gl.createBuffer();
        this.buffers.colors = this.gl.createBuffer();
        this.buffers.sizes = this.gl.createBuffer();
        this.buffers.ids = this.gl.createBuffer();
        
        console.log('🎮 Buffers created');
    }

    /**
     * Create sphere geometry for instanced rendering
     */
    createSphereGeometry() {
        const latBands = 8;
        const lonBands = 8;
        const positions = [];
        const normals = [];
        const indices = [];
        
        // Generate sphere vertices
        for (let lat = 0; lat <= latBands; lat++) {
            const theta = lat * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let lon = 0; lon <= lonBands; lon++) {
                const phi = lon * 2 * Math.PI / lonBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                positions.push(x, y, z);
                normals.push(x, y, z);
            }
        }
        
        // Generate indices
        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < lonBands; lon++) {
                const first = (lat * (lonBands + 1)) + lon;
                const second = first + lonBands + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        // Create buffers
        this.buffers.spherePositions = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.spherePositions);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        
        this.buffers.sphereNormals = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sphereNormals);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        
        this.buffers.sphereIndices = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIndices);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        
        this.sphereIndexCount = indices.length;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events for camera control
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Keyboard controls
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Set data for rendering
     */
    setData(data) {
        this.state.data = data || [];
        this.updateDataBuffers();
        this.state.needsRedraw = true;
        
        console.log(`🎮 WebGL data updated: ${this.state.data.length} points`);
    }

    /**
     * Set cluster information
     */
    setClusters(clusters) {
        this.state.clusters = clusters || [];
        this.updateDataBuffers(); // Recolor based on clusters
        this.state.needsRedraw = true;
        
        console.log(`🎮 WebGL clusters updated: ${this.state.clusters.length} clusters`);
    }

    /**
     * Update data buffers
     */
    updateDataBuffers() {
        if (this.state.data.length === 0) return;
        
        const positions = [];
        const colors = [];
        const sizes = [];
        const ids = [];
        
        this.state.data.forEach((point, index) => {
            // Position
            const x = point.x !== undefined ? point.x : point[0] || 0;
            const y = point.y !== undefined ? point.y : point[1] || 0;
            const z = point.z !== undefined ? point.z : point[2] || 0;
            positions.push(x, y, z);
            
            // Color based on cluster
            const cluster = point.cluster !== undefined ? point.cluster : -1;
            let color = [0.6, 0.6, 0.6]; // Default gray
            
            if (cluster >= 0 && cluster < this.options.colorScheme.length) {
                color = this.hexToRgb(this.options.colorScheme[cluster]);
            }
            
            colors.push(color[0] / 255, color[1] / 255, color[2] / 255);
            
            // Size
            let size = this.options.pointSize;
            if (this.state.selectedPoints.has(index)) {
                size *= 1.5;
            }
            sizes.push(size);
            
            // ID for picking
            ids.push(index);
        });
        
        // Update position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);
        
        // Update color buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colors);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);
        
        // Update size buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sizes);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sizes), this.gl.DYNAMIC_DRAW);
        
        // Update ID buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.ids);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(ids), this.gl.DYNAMIC_DRAW);
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            this.updateCamera();
            this.updateStats(timestamp);
            
            if (this.state.needsRedraw) {
                this.render();
                this.state.needsRedraw = false;
            }
            
            this.animationFrame = requestAnimationFrame(render);
        };
        
        render(performance.now());
    }

    /**
     * Update camera matrices
     */
    updateCamera() {
        if (!this.camera.isDirty) return;
        
        // Calculate camera position based on interaction
        const distance = this.interaction.distance;
        const rotX = this.interaction.rotation.x;
        const rotY = this.interaction.rotation.y;
        
        this.camera.position[0] = Math.sin(rotY) * Math.cos(rotX) * distance + this.interaction.panOffset.x;
        this.camera.position[1] = Math.sin(rotX) * distance + this.interaction.panOffset.y;
        this.camera.position[2] = Math.cos(rotY) * Math.cos(rotX) * distance;
        
        // Update view matrix
        this.lookAt(this.camera.viewMatrix, this.camera.position, this.camera.target, this.camera.up);
        
        // Update projection matrix
        const aspect = this.options.width / this.options.height;
        this.perspective(this.camera.projectionMatrix, this.camera.fov, aspect, this.camera.near, this.camera.far);
        
        this.camera.isDirty = false;
    }

    /**
     * Main render function
     */
    render() {
        // Clear buffers
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        if (this.state.data.length === 0) return;
        
        // Reset stats
        this.state.stats.drawCalls = 0;
        this.state.stats.pointsRendered = this.state.data.length;
        
        // Render based on mode
        switch (this.options.renderMode) {
            case 'points':
                this.renderPoints();
                break;
            case 'spheres':
                this.renderSpheres();
                break;
            default:
                this.renderPoints();
        }
    }

    /**
     * Render points
     */
    renderPoints() {
        const program = this.programs.points;
        this.gl.useProgram(program);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.camera.viewMatrix);
        this.gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.camera.projectionMatrix);
        this.gl.uniform1f(program.uniforms.u_pointScale, this.interaction.distance > 3 ? 50 / this.interaction.distance : 20);
        
        // Bind attributes
        this.bindAttribute(program, 'a_position', this.buffers.positions, 3);
        this.bindAttribute(program, 'a_color', this.buffers.colors, 3);
        this.bindAttribute(program, 'a_size', this.buffers.sizes, 1);
        
        // Draw
        this.gl.drawArrays(this.gl.POINTS, 0, this.state.data.length);
        this.state.stats.drawCalls++;
    }

    /**
     * Render spheres (instanced)
     */
    renderSpheres() {
        if (!this.instancedExt) {
            this.renderPoints();
            return;
        }
        
        const program = this.programs.spheres;
        this.gl.useProgram(program);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.camera.viewMatrix);
        this.gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.camera.projectionMatrix);
        this.gl.uniform3f(program.uniforms.u_lightDirection, 0.5, 0.7, 1.0);
        
        // Bind sphere geometry
        this.bindAttribute(program, 'a_position', this.buffers.spherePositions, 3);
        this.bindAttribute(program, 'a_normal', this.buffers.sphereNormals, 3);
        
        // Bind instance data
        this.bindAttribute(program, 'a_instancePosition', this.buffers.positions, 3, 1);
        this.bindAttribute(program, 'a_instanceColor', this.buffers.colors, 3, 1);
        this.bindAttribute(program, 'a_instanceSize', this.buffers.sizes, 1, 1);
        
        // Bind indices
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIndices);
        
        // Draw instanced
        this.instancedExt.drawElementsInstancedANGLE(
            this.gl.TRIANGLES,
            this.sphereIndexCount,
            this.gl.UNSIGNED_SHORT,
            0,
            this.state.data.length
        );
        
        this.state.stats.drawCalls++;
    }

    /**
     * Bind attribute to buffer
     */
    bindAttribute(program, name, buffer, size, divisor = 0) {
        const location = program.attributes[name];
        if (location === -1) return;
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.enableVertexAttribArray(location);
        this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0);
        
        if (divisor && this.instancedExt) {
            this.instancedExt.vertexAttribDivisorANGLE(location, divisor);
        }
    }

    /**
     * Picking render for selection
     */
    renderPicking(x, y) {
        // Create picking framebuffer if needed
        if (!this.framebuffers.picking) {
            this.createPickingFramebuffer();
        }
        
        // Bind picking framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers.picking);
        this.gl.viewport(0, 0, this.options.width, this.options.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Use picking shader
        const program = this.programs.picking;
        this.gl.useProgram(program);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.camera.viewMatrix);
        this.gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.camera.projectionMatrix);
        
        // Bind attributes
        this.bindAttribute(program, 'a_position', this.buffers.positions, 3);
        this.bindAttribute(program, 'a_id', this.buffers.ids, 1);
        
        // Draw
        this.gl.drawArrays(this.gl.POINTS, 0, this.state.data.length);
        
        // Read pixel at mouse position
        const pixel = new Uint8Array(4);
        this.gl.readPixels(x, this.options.height - y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
        
        // Decode ID from color
        const id = pixel[0] + pixel[1] * 256 + pixel[2] * 65536;
        
        // Restore main framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.options.width, this.options.height);
        
        return id < this.state.data.length ? id : -1;
    }

    /**
     * Create picking framebuffer
     */
    createPickingFramebuffer() {
        this.framebuffers.picking = this.gl.createFramebuffer();
        this.textures.pickingColor = this.gl.createTexture();
        this.textures.pickingDepth = this.gl.createTexture();
        
        // Color texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.pickingColor);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.options.width, this.options.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        
        // Depth texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.pickingDepth);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT16, this.options.width, this.options.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_SHORT, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        
        // Attach to framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers.picking);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.textures.pickingColor, 0);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.textures.pickingDepth, 0);
        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    /**
     * Mouse event handlers
     */
    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.interaction.lastMousePos = { x, y };
        
        if (event.button === 0) { // Left click
            this.interaction.isRotating = true;
        } else if (event.button === 1) { // Middle click
            this.interaction.isPanning = true;
        }
        
        this.canvas.style.cursor = 'grabbing';
        event.preventDefault();
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const dx = x - this.interaction.lastMousePos.x;
        const dy = y - this.interaction.lastMousePos.y;
        
        if (this.interaction.isRotating) {
            this.interaction.rotation.y += dx * 0.01;
            this.interaction.rotation.x += dy * 0.01;
            
            // Clamp X rotation
            this.interaction.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.interaction.rotation.x));
            
            this.camera.isDirty = true;
            this.state.needsRedraw = true;
        }
        
        if (this.interaction.isPanning) {
            this.interaction.panOffset.x -= dx * 0.01 * this.interaction.distance;
            this.interaction.panOffset.y += dy * 0.01 * this.interaction.distance;
            
            this.camera.isDirty = true;
            this.state.needsRedraw = true;
        }
        
        this.interaction.lastMousePos = { x, y };
    }

    handleMouseUp(event) {
        this.interaction.isRotating = false;
        this.interaction.isPanning = false;
        this.canvas.style.cursor = 'grab';
    }

    handleWheel(event) {
        event.preventDefault();
        
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        this.interaction.distance *= zoomFactor;
        this.interaction.distance = Math.max(0.5, Math.min(50, this.interaction.distance));
        
        this.camera.isDirty = true;
        this.state.needsRedraw = true;
    }

    handleClick(event) {
        if (!this.interaction.isRotating && !this.interaction.isPanning) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const pointId = this.renderPicking(x, y);
            if (pointId !== -1) {
                if (event.ctrlKey || event.metaKey) {
                    // Multi-select
                    if (this.state.selectedPoints.has(pointId)) {
                        this.state.selectedPoints.delete(pointId);
                    } else {
                        this.state.selectedPoints.add(pointId);
                    }
                } else {
                    // Single select
                    this.state.selectedPoints.clear();
                    this.state.selectedPoints.add(pointId);
                }
                
                this.updateDataBuffers();
                this.state.needsRedraw = true;
                
                // Emit selection event
                this.eventBus.emit('point:selected', {
                    pointId,
                    point: this.state.data[pointId],
                    selectedPoints: Array.from(this.state.selectedPoints)
                });
            }
        }
    }

    handleKeyDown(event) {
        switch (event.key) {
            case 'r':
                this.resetCamera();
                break;
            case 'Escape':
                this.state.selectedPoints.clear();
                this.updateDataBuffers();
                this.state.needsRedraw = true;
                break;
        }
    }

    handleResize() {
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        if (newWidth !== this.options.width || newHeight !== this.options.height) {
            this.options.width = newWidth;
            this.options.height = newHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.gl.viewport(0, 0, newWidth, newHeight);
            
            this.camera.isDirty = true;
            this.state.needsRedraw = true;
        }
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        this.interaction.rotation = { x: 0, y: 0 };
        this.interaction.distance = 5;
        this.interaction.panOffset = { x: 0, y: 0 };
        
        this.camera.isDirty = true;
        this.state.needsRedraw = true;
    }

    /**
     * Update performance stats
     */
    updateStats(timestamp) {
        this.state.stats.frameCount++;
        
        if (timestamp - this.state.stats.lastFrameTime >= 1000) {
            this.state.stats.fps = this.state.stats.frameCount;
            this.state.stats.frameCount = 0;
            this.state.stats.lastFrameTime = timestamp;
        }
    }

    /**
     * Get WebGL info
     */
    getWebGLInfo() {
        return {
            version: this.gl.getParameter(this.gl.VERSION),
            renderer: this.gl.getParameter(this.gl.RENDERER),
            vendor: this.gl.getParameter(this.gl.VENDOR),
            maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
            maxVertexAttribs: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
            maxVaryingVectors: this.gl.getParameter(this.gl.MAX_VARYING_VECTORS)
        };
    }

    /**
     * Utility functions
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    /**
     * Matrix operations
     */
    lookAt(out, eye, center, up) {
        const x0 = eye[0], x1 = eye[1], x2 = eye[2];
        const up0 = up[0], up1 = up[1], up2 = up[2];
        const center0 = center[0], center1 = center[1], center2 = center[2];
        
        if (Math.abs(x0 - center0) < 0.000001 &&
            Math.abs(x1 - center1) < 0.000001 &&
            Math.abs(x2 - center2) < 0.000001) {
            return this.identity(out);
        }
        
        let z0 = x0 - center0;
        let z1 = x1 - center1;
        let z2 = x2 - center2;
        
        let len = 1 / Math.hypot(z0, z1, z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;
        
        let x0_2 = up1 * z2 - up2 * z1;
        let x1_2 = up2 * z0 - up0 * z2;
        let x2_2 = up0 * z1 - up1 * z0;
        len = Math.hypot(x0_2, x1_2, x2_2);
        if (!len) {
            x0_2 = 0;
            x1_2 = 0;
            x2_2 = 0;
        } else {
            len = 1 / len;
            x0_2 *= len;
            x1_2 *= len;
            x2_2 *= len;
        }
        
        let y0 = z1 * x2_2 - z2 * x1_2;
        let y1 = z2 * x0_2 - z0 * x2_2;
        let y2 = z0 * x1_2 - z1 * x0_2;
        
        out[0] = x0_2;
        out[1] = y0;
        out[2] = z0;
        out[3] = 0;
        out[4] = x1_2;
        out[5] = y1;
        out[6] = z1;
        out[7] = 0;
        out[8] = x2_2;
        out[9] = y2;
        out[10] = z2;
        out[11] = 0;
        out[12] = -(x0_2 * x0 + x1_2 * x1 + x2_2 * x2);
        out[13] = -(y0 * x0 + y1 * x1 + y2 * x2);
        out[14] = -(z0 * x0 + z1 * x1 + z2 * x2);
        out[15] = 1;
        
        return out;
    }

    perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[14] = 2 * far * near * nf;
        out[15] = 0;
        
        return out;
    }

    identity(out) {
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = 1;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 1;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        
        return out;
    }

    /**
     * Export screenshot
     */
    exportImage(format = 'png') {
        const link = document.createElement('a');
        link.download = `webgl-render.${format}`;
        link.href = this.canvas.toDataURL(`image/${format}`);
        link.click();
    }

    /**
     * Get render statistics
     */
    getStats() {
        return this.state.stats;
    }

    /**
     * Destroy the renderer
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Clean up WebGL resources
        Object.values(this.buffers).forEach(buffer => {
            if (buffer) this.gl.deleteBuffer(buffer);
        });
        
        Object.values(this.programs).forEach(program => {
            if (program) this.gl.deleteProgram(program);
        });
        
        Object.values(this.textures).forEach(texture => {
            if (texture) this.gl.deleteTexture(texture);
        });
        
        Object.values(this.framebuffers).forEach(framebuffer => {
            if (framebuffer) this.gl.deleteFramebuffer(framebuffer);
        });
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        console.log('🎮 WebGL Renderer destroyed');
    }
}