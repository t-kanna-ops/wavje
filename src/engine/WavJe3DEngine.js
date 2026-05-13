// ===== WavJe 3D Engine =====
class WavJe3DEngine {
  constructor(container, options = {}) {
    // Use fixed preview size: 480x270
    const width = options.width || 480;
    const height = options.height || 270;
    this.targetFPS = options.targetFPS || 60;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 100, 1000);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 10); // Closer to origin for better layer visibility
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1); // Always 1: canvas is off-screen, captureStream handles resolution
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    // WebGL context loss detection
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.error('❌ WebGL context lost!');
      this.isContextLost = true;
    });
    
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('✅ WebGL context restored');
      this.isContextLost = false;
    });
    
    this.isContextLost = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    this.deckA = new THREE.Group();
    this.deckB = new THREE.Group();
    this.deckA.position.set(0, 0, 0);
    this.deckB.position.set(0, 0, 0);
    this.scene.add(this.deckA);
    this.scene.add(this.deckB);

    // Phase 2: Camera Controller and Text Renderer
    this.cameraController = new CameraController(this.camera);
    this.textRenderer = new TextRenderer(this.scene);

    this.frameCount = 0;
    this.fps = 0;
    this.lastFrameTime = Date.now();

    // Video frame callback support
    this.useVideoFrameCallback = false;
    this.videoFrameCallbackId = null;
    this.checkVideoFrameCallbackSupport();

    // Effect rendering support
    this.renderTarget1 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false
    });
    this.renderTarget2 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false
    });
    this.effectScene = new THREE.Scene();
    this.effectCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.effectQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial()
    );
    this.effectScene.add(this.effectQuad);
    
    // Effect manager for master effects
    this.effectManager = null; // Will be set by WavJeApp
    
    // Cache for effect materials
    this.effectMaterials = new Map();
    this.lastEffectCount = 0;
    this.renderFrameCount = 0;
  }

  /**
   * Check if HTMLVideoElement.requestVideoFrameCallback is supported
   */
  checkVideoFrameCallbackSupport() {
    // Check for requestVideoFrameCallback support
    const video = document.createElement('video');
    if (typeof video.requestVideoFrameCallback === 'function') {
      this.useVideoFrameCallback = true;
      console.log('✓HTMLVideoElement.requestVideoFrameCallback supported');
    } else {
      console.log('ℹ Fallback to requestAnimationFrame');
    }
  }

  /**
   * Get texture update method based on browser support
   */
  getTextureUpdateCallback() {
    if (this.useVideoFrameCallback) {
      return this.updateTextureWithVideoFrameCallback.bind(this);
    } else {
      return this.updateTextureWithRAF.bind(this);
    }
  }

  /**
   * Update video texture using requestVideoFrameCallback (optimized)
   */
  updateTextureWithVideoFrameCallback(videoElement, texture) {
    if (!videoElement || !videoElement.readyState) return;

    const updateFrame = (now, metadata) => {
      // Update only on new video frame
      if (metadata.mediaTime > this.lastVideoTime) {
        this.lastVideoTime = metadata.mediaTime;
        texture.needsUpdate = true;
      }
      // Request next frame
      this.videoFrameCallbackId = videoElement.requestVideoFrameCallback(updateFrame);
    };

    this.lastVideoTime = 0;
    this.videoFrameCallbackId = videoElement.requestVideoFrameCallback(updateFrame);
  }

  /**
   * Update video texture using requestAnimationFrame (fallback)
   */
  updateTextureWithRAF(videoElement, texture) {
    const updateFrame = () => {
      if (videoElement && videoElement.readyState >= 2) {
        texture.needsUpdate = true;
      }
      requestAnimationFrame(updateFrame);
    };
    updateFrame();
  }

  /**
   * Cancel video frame callback if active
   */
  cancelVideoFrameCallback(videoElement) {
    if (this.videoFrameCallbackId !== null && videoElement) {
      videoElement.cancelVideoFrameCallback(this.videoFrameCallbackId);
      this.videoFrameCallbackId = null;
    }
  }

  getCurrentDeck() {
    return this.currentDeck;
  }

  render() {
    // Check for WebGL context loss
    if (this.isContextLost) {
      console.warn('⚠️ Skipping render - WebGL context lost');
      return;
    }
    
    try {
      const hasEffects = this.effectManager && this.effectManager.getAllEffects().length > 0;
      
      if (!hasEffects) {
        // No effects, render directly with auto-clear
        this.renderer.autoClear = true;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
        this.updateFPS();
        return;
      }
      
      const effects = this.effectManager.getAllEffects().filter(e => e.enabled);
      
      if (effects.length === 0) {
        // All effects disabled, render directly with auto-clear
        this.renderer.autoClear = true;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
        this.updateFPS();
        return;
      }
      
      // Effects active - use manual clear
      this.renderer.autoClear = false;
      
      // Log only when effect count changes
      if (effects.length !== this.lastEffectCount) {
        console.log(`🎨 Effects active: ${effects.map(e => e.name).join(', ')}`);
        this.lastEffectCount = effects.length;
        this.renderFrameCount = 0; // Reset frame counter
      }
      
      // Increment frame count
      if (this.renderFrameCount < 1000) this.renderFrameCount++;
      
      // Render scene to first render target
      this.renderer.setRenderTarget(this.renderTarget1);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      
      // Apply effects in chain
      let readBuffer = this.renderTarget1;
      let writeBuffer = this.renderTarget2;
      
      for (let i = 0; i < effects.length; i++) {
        const effect = effects[i];
        
        // Get or create material for this effect
        let material = this.effectMaterials.get(effect.id);
        if (!material) {
          material = new THREE.ShaderMaterial({
            uniforms: {
              tDiffuse: { value: null },
              ...this.cloneUniforms(effect.uniforms)
            },
            vertexShader: effect.shader.vertexShader,
            fragmentShader: effect.shader.fragmentShader,
            depthTest: false,
            depthWrite: false
          });
          
          this.effectMaterials.set(effect.id, material);
        }
        
        // Set material to quad
        this.effectQuad.material = material;
        
        // Update uniforms (skip tDiffuse, set it separately)
        material.uniforms.tDiffuse.value = readBuffer.texture;
        
        for (let key in effect.uniforms) {
          if (key !== 'tDiffuse' && material.uniforms[key]) {
            material.uniforms[key].value = effect.uniforms[key].value;
          }
        }
        
        // Force shader compilation on first use
        if (!material.program && this.renderFrameCount === 0) {
          console.log(`⚙️ Forcing shader compilation for ${effect.name}...`);
          console.log(`   - tDiffuse before compile:`, material.uniforms.tDiffuse.value);
          
          this.renderer.compile(this.effectScene, this.effectCamera);
          
          console.log(`   - tDiffuse after compile:`, material.uniforms.tDiffuse.value);
          
          // Check for shader errors
          if (material.program) {
            console.log(`   ✅ Shader compiled successfully`);
          } else {
            console.error(`   ❌ Shader compilation failed`);
            console.error(`   Vertex shader:`, effect.shader.vertexShader);
            console.error(`   Fragment shader:`, effect.shader.fragmentShader);
            
            // Check WebGL info log
            const gl = this.renderer.getContext();
            const program = gl.getParameter(gl.CURRENT_PROGRAM);
            if (program) {
              const info = gl.getProgramInfoLog(program);
              if (info) {
                console.error(`   Program Info Log:`, info);
              }
            }
          }
        }
        
        // Debug first few frames (AFTER ALL operations)
        if (this.renderFrameCount <= 2) {
          console.log(`   FINAL CHECK - Effect ${i}: ${effect.name}`);
          console.log(`   - material.uniforms.tDiffuse:`, material.uniforms.tDiffuse);
          console.log(`   - material.uniforms.tDiffuse.value:`, material.uniforms.tDiffuse.value);
          console.log(`   - tDiffuse valid:`, material.uniforms.tDiffuse.value !== null && material.uniforms.tDiffuse.value !== undefined);
          console.log(`   - Material program:`, material.program ? 'compiled ✓' : 'not compiled ✗');
        }
        
        // Last effect renders to screen
        if (i === effects.length - 1) {
          this.renderer.setRenderTarget(null);
          this.renderer.clear();
          if (this.renderFrameCount <= 5) {
            console.log(`   Final pass: Rendering to screen`);
          }
        } else {
          this.renderer.setRenderTarget(writeBuffer);
          this.renderer.clear();
        }
        
        this.renderer.render(this.effectScene, this.effectCamera);
        
        // Debug: Check for WebGL errors
        if (this.renderFrameCount <= 2) {
          const gl = this.renderer.getContext();
          const error = gl.getError();
          if (error !== gl.NO_ERROR) {
            console.error(`❌ WebGL error after effect ${i} (${effect.name}): ${error}`);
            console.error(`   GL.INVALID_ENUM: ${gl.INVALID_ENUM}`);
            console.error(`   GL.INVALID_OPERATION: ${gl.INVALID_OPERATION}`);
            console.error(`   GL.INVALID_VALUE: ${gl.INVALID_VALUE}`);
          } else {
            console.log(`   ✓ No WebGL errors after effect ${i}`);
          }
        }
        
        // Swap buffers for next iteration
        const temp = readBuffer;
        readBuffer = writeBuffer;
        writeBuffer = temp;
      }
      
      // IMPORTANT: Restore autoClear immediately after effect rendering
      this.renderer.autoClear = true;
      
      this.updateFPS();
    } catch (error) {
      console.error('❌ Render error:', error);
      console.error('Stack:', error.stack);
      console.error('Effect manager:', this.effectManager);
      console.error('Effect materials cache size:', this.effectMaterials ? this.effectMaterials.size : 'undefined');
      
      // IMPORTANT: Restore autoClear even on error
      this.renderer.autoClear = true;
      
      // Fallback to direct rendering
      try {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
        this.updateFPS();
      } catch (fallbackError) {
        console.error('❌ Fallback render failed:', fallbackError);
      }
    }
  }
  
  cloneUniforms(uniforms) {
    const cloned = {};
    for (let key in uniforms) {
      cloned[key] = { value: uniforms[key].value };
    }
    return cloned;
  }

  updateFPS() {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  getFPS() {
    return this.fps;
  }

  getScene() {
    return this.scene;
  }

  dispose() {
    // Clean up effect materials
    if (this.effectMaterials) {
      this.effectMaterials.forEach(material => {
        material.dispose();
      });
      this.effectMaterials.clear();
    }
    
    // Clean up render targets
    if (this.renderTarget1) this.renderTarget1.dispose();
    if (this.renderTarget2) this.renderTarget2.dispose();
    
    // Clean up effect quad
    if (this.effectQuad) {
      this.effectQuad.geometry.dispose();
      if (this.effectQuad.material) this.effectQuad.material.dispose();
    }
    
    this.renderer.dispose();
  }
  
  setResolution(width, height) {
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Resize render targets to match new resolution
    if (this.renderTarget1) {
      this.renderTarget1.setSize(width, height);
      this.renderTarget2.setSize(width, height);
    }
    console.log(`✓ Resolution changed to ${width}x${height}`);
  }
}


export default WavJe3DEngine;