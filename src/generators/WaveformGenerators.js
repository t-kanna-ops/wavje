// VIEW constants based on camera FOV=75°, Z=10, aspect=16/9
// Visible height ≈ 15.0 units, visible width ≈ 26.7 units
const VIEW_H = 15.0;
const VIEW_W = 26.7;

// Oscilloscope (Lissajous curve)
class OscilloscopeGenerator {
  constructor() {
    this.points = [];
    this.maxPoints = 200;
    this.lineGeometry = new THREE.BufferGeometry();

    this.params = {
      colorHue:       0.33,
      scale:          6,     // VIEW_H/2 * 0.8
      rotationSpeed:  0.5,
      brightness:     0.5,
    };

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(this.params.colorHue, 1, this.params.brightness),
      linewidth: 2
    });
    this.line = new THREE.Line(this.lineGeometry, material);

    const positions = new Float32Array(this.maxPoints * 3);
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  getParamDefs() {
    return [
      { key: 'colorHue',      label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'brightness',    label: 'Brightness',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'scale',         label: 'Scale',            min: 1,   max: 12,  step: 0.5,  type: 'range' },
      { key: 'rotationSpeed', label: 'Rotation Speed',   min: 0,   max: 3,   step: 0.05, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    const waveform = audioData.waveform || [];
    if (waveform.length === 0) return;

    const positions = this.lineGeometry.attributes.position.array;
    const step = Math.floor(waveform.length / this.maxPoints);

    for (let i = 0; i < this.maxPoints; i++) {
      const index = i * step;
      // Normalize Uint8Array (0-255, center=128) to -1..1
      const x = ((waveform[index] ?? 128) / 128 - 1) * this.params.scale;
      const y = ((waveform[(index + Math.floor(waveform.length / 4)) % waveform.length] ?? 128) / 128 - 1) * this.params.scale;

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
    this.line.rotation.z += deltaTime * this.params.rotationSpeed;
    this.line.material.color.setHSL(this.params.colorHue, 1, this.params.brightness);
  }

  getMesh() { return this.line; }

  dispose() {
    this.lineGeometry.dispose();
    this.line.material.dispose();
  }
}

// Neon String (Vibrating line with glow)
class NeonStringGenerator {
  constructor() {
    this.segments = 100;
    this.time = 0;

    this.params = {
      colorHue:       0.83,
      span:           VIEW_W * 0.9,  // ≈ 24, fill 90% of screen width
      waveIntensity:  VIEW_H * 0.2,  // ≈ 3.0
      speed:          3,
      brightness:     0.5,
    };
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.segments * 3);
    
    for (let i = 0; i < this.segments; i++) {
      const x = (i / this.segments - 0.5) * this.params.span;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(this.params.colorHue, 1, this.params.brightness),
      linewidth: 3
    });
    
    this.line = new THREE.Line(geometry, material);
  }

  getParamDefs() {
    return [
      { key: 'colorHue',      label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'brightness',    label: 'Brightness',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'span',          label: 'Span',             min: 5,   max: VIEW_W, step: 0.5, type: 'range' },
      { key: 'waveIntensity', label: 'Wave Intensity',   min: 0.5, max: VIEW_H * 0.5, step: 0.1, type: 'range' },
      { key: 'speed',         label: 'Speed',            min: 0.5, max: 8,   step: 0.1,  type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    this.time += deltaTime;
    const positions = this.line.geometry.attributes.position.array;
    const volume = audioData.volume || 0;
    const high = audioData.bands?.high || 0;

    for (let i = 0; i < this.segments; i++) {
      const x = (i / this.segments - 0.5) * this.params.span;
      const wave  = Math.sin(i * 0.2 + this.time * this.params.speed) * volume * this.params.waveIntensity;
      const wave2 = Math.sin(i * 0.1 - this.time * this.params.speed * 0.67) * high * this.params.waveIntensity * 0.67;

      positions[i * 3]     = x;
      positions[i * 3 + 1] = wave + wave2;
      positions[i * 3 + 2] = Math.cos(i * 0.15 + this.time) * volume * (this.params.waveIntensity * 0.3);
    }
    
    this.line.geometry.attributes.position.needsUpdate = true;
    
    // Color cycling based on hue param + volume brightness
    this.line.material.color.setHSL(
      (this.params.colorHue + this.time * 0.05) % 1,
      1,
      this.params.brightness + volume * 0.3
    );
  }

  getMesh() {
    return this.line;
  }

  dispose() {
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}

// Terrain Line (3D wave terrain)
class TerrainLineGenerator {
  constructor() {
    this.gridSize = 30;
    this.group = new THREE.Group();
    this.time = 0;

    this.params = {
      colorHue:       0.5,
      waveAmplitude:  2,
      speed:          1,
      tiltAngle:      60,
      rotationSpeed:  0.2,
    };

    // Size matches the visible area
    const geometry = new THREE.PlaneGeometry(VIEW_W, VIEW_H, this.gridSize, this.gridSize);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(this.params.colorHue, 1, 0.5),
      wireframe: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI * (this.params.tiltAngle / 180);
    this.group.add(this.mesh);
  }

  getParamDefs() {
    return [
      { key: 'colorHue',      label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'waveAmplitude', label: 'Wave Amplitude',   min: 0.5, max: VIEW_H * 0.5, step: 0.1, type: 'range' },
      { key: 'speed',         label: 'Speed',            min: 0.2, max: 4,   step: 0.05, type: 'range' },
      { key: 'tiltAngle',     label: 'Tilt Angle',       min: 0,   max: 90,  step: 1,    type: 'range' },
      { key: 'rotationSpeed', label: 'Rotation Speed',   min: 0,   max: 1,   step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    this.time += deltaTime;
    const positions = this.mesh.geometry.attributes.position.array;
    const low = audioData.bands?.low || 0;
    const mid = audioData.bands?.lowMid || 0;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      
      const wave1 = Math.sin(x * 0.5 + this.time * this.params.speed * 2) * low * this.params.waveAmplitude;
      const wave2 = Math.cos(y * 0.5 - this.time * this.params.speed) * mid * this.params.waveAmplitude * 0.75;
      
      positions[i * 3 + 2] = wave1 + wave2;
    }
    
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.rotation.x = -Math.PI * (this.params.tiltAngle / 180);
    this.mesh.material.color.setHSL(this.params.colorHue, 1, 0.5);
    this.group.rotation.z += deltaTime * this.params.rotationSpeed;
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}


export { OscilloscopeGenerator, NeonStringGenerator, TerrainLineGenerator };