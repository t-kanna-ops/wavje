// ===== Transition Effects =====
class TransitionManager {
  constructor() {
    this.currentTransition = null;
    this.currentShader = null;
    this.transitionMaterial = null;
    this.transitionScene = null;
    this.transitionCamera = null;
    this.transitionRenderTarget = null;
    
    this.transitions = {
      'dissolve': { shader: TransitionShaders.dissolve, params: {} },
      'wipe-left': { shader: TransitionShaders.wipe, params: { direction: 0 } },
      'wipe-right': { shader: TransitionShaders.wipe, params: { direction: 1 } },
      'wipe-up': { shader: TransitionShaders.wipe, params: { direction: 2 } },
      'wipe-down': { shader: TransitionShaders.wipe, params: { direction: 3 } },
      'zoom-in': { shader: TransitionShaders.zoom, params: { zoomIn: 1.0 } },
      'zoom-out': { shader: TransitionShaders.zoom, params: { zoomIn: 0.0 } },
      'spin': { shader: TransitionShaders.spin, params: {} },
      'slide-left': { shader: TransitionShaders.slide, params: { direction: 0 } },
      'slide-right': { shader: TransitionShaders.slide, params: { direction: 1 } },
      'slide-up': { shader: TransitionShaders.slide, params: { direction: 2 } },
      'slide-down': { shader: TransitionShaders.slide, params: { direction: 3 } },
      'radial': { shader: TransitionShaders.radial, params: {} }
    };
    
    this.transitionDuration = 1.0; // seconds
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.onCompleteCallback = null;
    this.fromTexture = null;
    this.toTexture = null;
    
    // Manual control
    this.manualMode = false;
    this.manualProgress = 0;
  }
  
  // Enable/disable manual transition control
  setManualMode(enabled) {
    this.manualMode = enabled;
    if (enabled) {
      console.log('✓ Manual transition mode enabled');
    } else {
      console.log('✓ Auto transition mode enabled');
    }
  }
  
  // Set manual progress (0.0 - 1.0)
  setManualProgress(progress) {
    if (!this.manualMode) return;
    this.manualProgress = Math.max(0, Math.min(1, progress));
    this.transitionProgress = this.manualProgress;
    
    if (this.transitionMaterial && this.transitionMaterial.uniforms.progress) {
      this.transitionMaterial.uniforms.progress.value = this.transitionProgress;
    }
  }
  
  // Trigger transition (can be called via MIDI or keyboard)
  trigger(type = null) {
    if (!this.fromTexture || !this.toTexture) {
      console.warn('⚠ No textures set for transition');
      return false;
    }
    
    // Use current transition type if not specified
    const transitionType = type || this.currentTransition || 'dissolve';
    
    if (this.manualMode) {
      // Manual mode: prepare transition but don't auto-progress
      this.startTransition(transitionType, this.fromTexture, this.toTexture, null);
      this.isTransitioning = false; // Don't auto-progress
      this.manualProgress = 0;
      console.log(`✓ Manual transition prepared: ${transitionType}`);
    } else {
      // Auto mode: start automatic transition
      this.startTransition(transitionType, this.fromTexture, this.toTexture, null);
      console.log(`✓ Auto transition started: ${transitionType}`);
    }
    
    return true;
  }

  initialize(renderer) {
    // Create transition scene and camera
    this.transitionScene = new THREE.Scene();
    this.transitionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create plane for transition shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.transitionMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: '',
      fragmentShader: ''
    });
    const mesh = new THREE.Mesh(geometry, this.transitionMaterial);
    this.transitionScene.add(mesh);
    
    // Create render target
    const size = renderer.getSize(new THREE.Vector2());
    this.transitionRenderTarget = new THREE.WebGLRenderTarget(size.x, size.y);
  }

  setDuration(seconds) {
    this.transitionDuration = Math.max(0.1, Math.min(10, seconds));
  }

  startTransition(type, fromTexture, toTexture, onComplete) {
    if (!this.transitions[type]) {
      console.warn(`Unknown transition: ${type}`);
      return false;
    }

    const transition = this.transitions[type];
    this.currentShader = transition.shader;
    this.currentTransition = type;
    this.fromTexture = fromTexture;
    this.toTexture = toTexture;
    
    // Setup shader material
    this.transitionMaterial.uniforms = {
      tFrom: { value: fromTexture },
      tTo: { value: toTexture },
      progress: { value: 0.0 },
      ...transition.params
    };
    this.transitionMaterial.vertexShader = this.currentShader.vertexShader;
    this.transitionMaterial.fragmentShader = this.currentShader.fragmentShader;
    this.transitionMaterial.needsUpdate = true;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.onCompleteCallback = onComplete;
    this.transitionStartTime = performance.now() / 1000;
    
    console.log(`✓ Transition started: ${type}`);
    return true;
  }

  update(deltaTime) {
    if (!this.isTransitioning) return 1.0;
    
    // Skip auto-progress in manual mode
    if (this.manualMode) {
      return this.manualProgress;
    }

    const currentTime = performance.now() / 1000;
    const elapsed = currentTime - this.transitionStartTime;
    this.transitionProgress = Math.min(1.0, elapsed / this.transitionDuration);
    
    // Ease in-out cubic
    const easedProgress = this.easeInOutCubic(this.transitionProgress);
    
    // Update shader uniform
    if (this.transitionMaterial && this.transitionMaterial.uniforms.progress) {
      this.transitionMaterial.uniforms.progress.value = easedProgress;
    }

    if (this.transitionProgress >= 1.0) {
      this.isTransitioning = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = null;
      }
      console.log(`✓ Transition completed: ${this.currentTransition}`);
    }

    return easedProgress;
  }

  renderTransition(renderer) {
    if (!this.isTransitioning || !this.transitionRenderTarget) {
      return this.toTexture;
    }
    
    renderer.setRenderTarget(this.transitionRenderTarget);
    renderer.render(this.transitionScene, this.transitionCamera);
    renderer.setRenderTarget(null);
    
    return this.transitionRenderTarget.texture;
  }

  createWipeTransition(direction) {
    return (progress) => {
      return {
        type: 'wipe',
        direction: direction,
        progress: this.easeInOutCubic(progress)
      };
    };
  }

  createZoomTransition(type) {
    return (progress) => {
      return {
        type: 'zoom',
        direction: type,
        progress: this.easeInOutCubic(progress)
      };
    };
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getAvailableTransitions() {
    return Object.keys(this.transitions);
  }

  dispose() {
    if (this.transitionRenderTarget) {
      this.transitionRenderTarget.dispose();
    }
    if (this.transitionMaterial) {
      this.transitionMaterial.dispose();
    }
  }
}


export default TransitionManager;