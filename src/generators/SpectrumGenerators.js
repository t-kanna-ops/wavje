// ===== Phase 3: Spectrum & Meter Generators =====
// VIEW constants (shared with WaveformGenerators.js)
const VIEW_H = 15.0;
const VIEW_W = 26.7;

// Circular Spectrum (Radial FFT bars)
class CircularSpectrumGenerator {
  constructor() {
    this.bars = 64;
    this.group = new THREE.Group();
    this.barMeshes = [];

    this.params = {
      radius:         VIEW_H * 0.27,  // ≈ 4.0
      heightScale:    VIEW_H * 0.27,  // ≈ 4.0
      barWidth:       0.2,
      rotationSpeed:  0.5,
      colorShift:     0,
    };
    
    for (let i = 0; i < this.bars; i++) {
      const geometry = new THREE.BoxGeometry(this.params.barWidth, 1, this.params.barWidth);
      const hue = (i / this.bars + this.params.colorShift) % 1;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 1, 0.5)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      const angle = (i / this.bars) * Math.PI * 2;
      
      mesh.position.x = Math.cos(angle) * this.params.radius;
      mesh.position.z = Math.sin(angle) * this.params.radius;
      mesh.rotation.y = -angle;
      
      this.group.add(mesh);
      this.barMeshes.push(mesh);
    }
  }

  getParamDefs() {
    return [
      { key: 'radius',        label: 'Radius',           min: 1,   max: VIEW_H * 0.6, step: 0.1,  type: 'range' },
      { key: 'heightScale',   label: 'Height Scale',     min: 0.5, max: VIEW_H * 0.6, step: 0.1,  type: 'range' },
      { key: 'barWidth',      label: 'Bar Width',        min: 0.05,max: 0.5, step: 0.01, type: 'range' },
      { key: 'rotationSpeed', label: 'Rotation Speed',   min: 0,   max: 2,   step: 0.02, type: 'range' },
      { key: 'colorShift',    label: 'Color Shift',      min: 0,   max: 1,   step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    // audioData.frequency is Uint8Array (0-255); normalize to 0-1
    const freqData = audioData.frequency || [];
    const step = Math.max(1, Math.floor(freqData.length / this.bars));

    this.barMeshes.forEach((bar, i) => {
      const value = (freqData[i * step] ?? 0) / 255;
      const height = 1 + value * this.params.heightScale;
      bar.scale.y = height;
      bar.position.y = height / 2;

      const angle = (i / this.bars) * Math.PI * 2;
      bar.position.x = Math.cos(angle) * this.params.radius;
      bar.position.z = Math.sin(angle) * this.params.radius;

      const hue = (i / this.bars + this.params.colorShift) % 1;
      bar.material.color.setHSL(hue, 1, 0.5);
    });

    this.group.rotation.y += deltaTime * this.params.rotationSpeed;
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.barMeshes.forEach(bar => {
      bar.geometry.dispose();
      bar.material.dispose();
    });
    this.barMeshes = [];
  }
}

// Cityscape Bars (3D building-like spectrum)
class CityscapeBarsGenerator {
  constructor() {
    this.cols = 16;
    this.rows = 8;
    this.group = new THREE.Group();
    this.buildings = [];

    // spacing so total width ≈ VIEW_W
    this.params = {
      colorHue:       0.58,
      heightScale:    VIEW_H * 0.45,  // ≈ 6.7
      spacing:        VIEW_W / this.cols, // ≈ 1.67
      rotationSpeed:  0,
    };
    
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(this.params.colorHue, 1, 0.5),
          wireframe: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = (col - this.cols / 2) * this.params.spacing;
        mesh.position.z = (row - this.rows / 2) * this.params.spacing;
        
        this.group.add(mesh);
        this.buildings.push({ mesh, col, row });
      }
    }
  }

  getParamDefs() {
    return [
      { key: 'colorHue',      label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'heightScale',   label: 'Height Scale',     min: 0.5, max: VIEW_H * 1.2, step: 0.1, type: 'range' },
      { key: 'spacing',       label: 'Spacing',          min: 0.5, max: 3,   step: 0.05, type: 'range' },
      { key: 'rotationSpeed', label: 'Rotation Speed',   min: 0,   max: 0.5, step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    // audioData.frequency is Uint8Array (0-255); normalize to 0-1
    const freqData = audioData.frequency || [];
    const step = Math.max(1, Math.floor(freqData.length / this.buildings.length));
    
    this.buildings.forEach(({ mesh, col, row }, i) => {
      const value = (freqData[i * step] ?? 0) / 255;
      const height = 0.5 + value * this.params.heightScale;
      mesh.scale.y = height;
      mesh.position.y = height / 2;
      mesh.position.x = (col - this.cols / 2) * this.params.spacing;
      mesh.position.z = (row - this.rows / 2) * this.params.spacing;
      
      const hue = this.params.colorHue + value * 0.3;
      mesh.material.color.setHSL(hue % 1, 1, 0.5);
    });

    this.group.rotation.y += deltaTime * this.params.rotationSpeed;
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.buildings.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.buildings = [];
  }
}

// Fluid Spectrum (Flowing particles based on frequency)
class FluidSpectrumGenerator {
  constructor() {
    this.particleCount = 1000;
    this.group = new THREE.Group();
    this.time = 0;

    this.params = {
      particleSize:   0.2,
      opacity:        0.8,
      speed:          1,
      spread:         VIEW_H * 1.4,  // ≈ 21, slightly bigger than screen
      rotationSpeed:  0.3,
    };
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * this.params.spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.params.spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.params.spread;
      
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: this.params.opacity
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  getParamDefs() {
    return [
      { key: 'particleSize',  label: 'Particle Size',    min: 0.05,max: 0.8, step: 0.01, type: 'range' },
      { key: 'opacity',       label: 'Opacity',          min: 0.1, max: 1,   step: 0.01, type: 'range' },
      { key: 'speed',         label: 'Speed',            min: 0.1, max: 4,   step: 0.05, type: 'range' },
      { key: 'spread',        label: 'Spread',           min: 5,   max: 40,  step: 0.5,  type: 'range' },
      { key: 'rotationSpeed', label: 'Rotation Speed',   min: 0,   max: 1,   step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    this.time += deltaTime;
    const positions = this.particles.geometry.attributes.position.array;
    const volume = audioData.volume || 0;
    const high = audioData.bands?.high || 0;
    const half = this.params.spread / 2;
    
    for (let i = 0; i < this.particleCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      
      positions[i * 3]     += Math.sin(y * 0.1 + this.time) * volume * 0.1 * this.params.speed;
      positions[i * 3 + 1] += Math.cos(x * 0.1 + this.time) * high * 0.1 * this.params.speed;
      positions[i * 3 + 2] += Math.sin(x * 0.05 + y * 0.05) * volume * 0.05 * this.params.speed;
      
      if (Math.abs(positions[i * 3])     > half) positions[i * 3]     *= 0.9;
      if (Math.abs(positions[i * 3 + 1]) > half) positions[i * 3 + 1] *= 0.9;
      if (Math.abs(positions[i * 3 + 2]) > half) positions[i * 3 + 2] *= 0.9;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.material.size = this.params.particleSize;
    this.particles.material.opacity = this.params.opacity;
    this.group.rotation.y += deltaTime * this.params.rotationSpeed;
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}


export { CircularSpectrumGenerator, CityscapeBarsGenerator, FluidSpectrumGenerator };