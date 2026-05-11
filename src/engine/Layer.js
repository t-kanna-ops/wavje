// ===== Layer System =====
class Layer {
  constructor(index) {
    this.index = index;
    this.content = null; // VideoClip or Generator
    this.contentType = null; // 'video' or 'generator'
    this.clipRef = null; // Reference to the source clip (for audioSettings)
    this.opacity = 1.0;
    this.blendMode = 'normal'; // 'normal', 'add', 'screen', 'multiply', 'overlay'
    this.isActive = false;
    this.effectManager = new EffectManager(); // Phase 2: Effect system
  }

  setContent(content, type, clipRef = null) {
    this.content = content;
    this.contentType = type;
    this.clipRef = clipRef;
    this.isActive = true;
    
    // Auto-play video clips
    if (type === 'video' && content && content.play) {
      content.play();
    }
  }

  clearContent() {
    if (this.content && this.content.dispose) {
      this.content.dispose();
    }
    this.content = null;
    this.contentType = null;
    this.isActive = false;
  }

  setOpacity(value) {
    this.opacity = Math.max(0, Math.min(1, value));
    // Note: Actual opacity is applied in Mixer.applyMix() 
    // which multiplies layer opacity with deck/crossfader opacity
  }

  setBlendMode(mode) {
    this.blendMode = mode;
    if (this.mesh && this.mesh.material) {
      switch (mode) {
        case 'add':
          this.mesh.material.blending = THREE.AdditiveBlending;
          break;
        case 'screen':
          this.mesh.material.blending = THREE.CustomBlending;
          this.mesh.material.blendEquation = THREE.AddEquation;
          this.mesh.material.blendSrc = THREE.OneFactor;
          this.mesh.material.blendDst = THREE.OneMinusSrcColorFactor;
          break;
        case 'multiply':
          this.mesh.material.blending = THREE.MultiplyBlending;
          break;
        default: // 'normal'
          this.mesh.material.blending = THREE.NormalBlending;
      }
    }
  }

  getTexture() {
    if (!this.content) return null;
    if (this.contentType === 'video') {
      return this.content.getTexture();
    }
    // For generators, we'd need to render to a RenderTarget
    return null;
  }

  createMesh(deckGroup) {
    // Remove old mesh if exists
    if (this.mesh) {
      if (deckGroup) {
        deckGroup.remove(this.mesh);
      }
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.mesh = null;
    }

    // Phase 3: Handle generators
    if (this.contentType === 'generator' && this.content && this.content.instance) {
      this.mesh = this.content.instance.getMesh();
      if (this.mesh && deckGroup) {
        this.mesh.position.set(0, 0, -this.index * 0.001);
        deckGroup.add(this.mesh);
        console.log(`✓Generator layer ${this.index} mesh added: pos=${this.mesh.position.z}`);
        console.log(`  Deck group children: ${deckGroup.children.length}`);
      }
      return;
    }

    // Webcam handling
    if (this.contentType === 'webcam' && this.content) {
      // content may be the webcamInfo object ({ content: videoEl, ... }) or the video element itself
      const videoEl = (this.content.content instanceof HTMLVideoElement) ? this.content.content : this.content;
      const videoTexture = new THREE.VideoTexture(videoEl);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      
      const geometry = new THREE.PlaneGeometry(8, 4.5);
      const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
        opacity: this.opacity,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });
      
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.position.set(0, 0, -this.index * 0.001);
      
      if (deckGroup) {
        deckGroup.add(this.mesh);
        console.log(`✓Webcam layer ${this.index} mesh added`);
      }
      return;
    }

    // Video handling
    const texture = this.getTexture();
    if (!texture) {
      console.warn(`⚠️ Layer ${this.index}: No texture available`);
      return;
    }

    // Create plane with 16:9 aspect ratio, sized for camera at z=10
    const planeWidth = 8;
    const planeHeight = 4.5;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide,
      depthTest: false, // Disable depth test to ensure layers always render
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Position layers at z=0 with slight offset for ordering
    this.mesh.position.set(0, 0, -this.index * 0.001); // Very small z offset
    this.setBlendMode(this.blendMode);
    
    if (deckGroup) {
      deckGroup.add(this.mesh);
      console.log(`✓Layer ${this.index} VIDEO mesh added: size=${planeWidth}x${planeHeight}, pos=${this.mesh.position.z}, opacity=${this.opacity}`);
      console.log(`  Deck group children count: ${deckGroup.children.length}`);
    } else {
      console.warn(`⚠️ Layer ${this.index}: No deck group provided`);
    }
  }

  updateMesh(audioData, deltaTime) {
    if (!this.mesh || !this.isActive) return;
    
    // Phase 3: Update generators
    if (this.contentType === 'generator' && this.content && this.content.instance) {
      if (typeof this.content.instance.update === 'function') {
        // Apply audioSettings filter if clip has settings
        const settings = this.clipRef && this.clipRef.audioSettings;
        const data = settings ? this._filterAudioData(audioData, settings) : audioData;
        this.content.instance.update(data, deltaTime);
      }
      return;
    }
    
    // Video texture continuous update
    if (this.contentType === 'video' && this.mesh.material && this.mesh.material.map) {
      const texture = this.mesh.material.map;
      const video = this.content ? this.content.videoElement : null;
      
      // Update texture if video is playing
      if (video && !video.paused && video.readyState >= video.HAVE_CURRENT_DATA) {
        texture.needsUpdate = true;
      } else if (video) {
        // Debug: Why is video not updating?
        if (video.paused) {
          console.log(`Layer ${this.index}: Video is paused`);
        } else if (video.readyState < video.HAVE_CURRENT_DATA) {
          console.log(`Layer ${this.index}: Video not ready (state: ${video.readyState})`);
        }
      }
    }
  }

  removeMesh(deckGroup) {
    if (this.mesh) {
      if (deckGroup) {
        deckGroup.remove(this.mesh);
      }
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.mesh = null;
    }
  }

  // Build a filtered audioData based on audioSettings.band
  // source-switching is handled upstream in WavJeApplication.render()
  _filterAudioData(audioData, settings) {
    const band = settings.band;
    if (!band || band === 'all') return audioData;

    // Get the single scalar value for the chosen band
    let value = 0;
    switch (band) {
      case 'low':     value = audioData.bands.low;     break;
      case 'lowMid':  value = audioData.bands.lowMid;  break;
      case 'highMid': value = audioData.bands.highMid; break;
      case 'high':    value = audioData.bands.high;    break;
      case 'volume':  value = audioData.volume;        break;
      case 'peak':    value = audioData.peak;          break;
      default:        return audioData;
    }

    // Return a copy with all bands replaced by the single value so
    // generators that read any band respond to only the chosen one
    return Object.assign({}, audioData, {
      bands: { low: value, lowMid: value, highMid: value, high: value },
      volume: value,
      peak: value,
    });
  }
}


export default Layer;