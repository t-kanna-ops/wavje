// ===== Phase 3: Abstract & Particle Generators =====
// VIEW constants based on camera FOV=75°, Z=10, aspect=16/9
const VIEW_H = 15.0;
const VIEW_W = 26.7;

// Gaussian Ripples (Normal distribution ripple effect)
class GaussianRipplesGenerator {
  constructor() {
    this.rings = [];
    this.group = new THREE.Group();
    this.time = 0;

    this.params = {
      maxRings:       10,
      expandSpeed:    VIEW_H * 0.13,  // ≈ 2.0
      fadeSpeed:      0.5,
      threshold:      0.7,
      colorHue:       0.5,
    };
  }

  getParamDefs() {
    return [
      { key: 'colorHue',    label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'maxRings',    label: 'Max Rings',        min: 2,   max: 30,  step: 1,    type: 'range' },
      { key: 'expandSpeed', label: 'Expand Speed',     min: 0.5, max: 6,   step: 0.1,  type: 'range' },
      { key: 'fadeSpeed',   label: 'Fade Speed',       min: 0.1, max: 2,   step: 0.05, type: 'range' },
      { key: 'threshold',   label: 'Beat Threshold',   min: 0.1, max: 1,   step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    this.time += deltaTime;
    const low = audioData.bands?.low || 0;
    
    if (low > this.params.threshold && this.rings.length < this.params.maxRings) {
      this.createRing();
    }
    
    this.rings = this.rings.filter(ring => {
      ring.scale.x += deltaTime * this.params.expandSpeed;
      ring.scale.y += deltaTime * this.params.expandSpeed;
      ring.material.opacity -= deltaTime * this.params.fadeSpeed;
      
      if (ring.material.opacity <= 0) {
        this.group.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        return false;
      }
      return true;
    });
  }

  createRing() {
    const geometry = new THREE.RingGeometry(0.5, 1, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(this.params.colorHue, 1, 0.5),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    });
    
    const ring = new THREE.Mesh(geometry, material);
    this.group.add(ring);
    this.rings.push(ring);
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.rings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });
    this.rings = [];
  }
}

// Starfield Warp (Space warp effect)
class StarfieldWarpGenerator {
  constructor() {
    this.starCount = 2000;
    this.group = new THREE.Group();

    this.params = {
      starCount:  2000,
      starSize:   0.12,
      speed:      1,
      colorHue:   -1,
      opacity:    1,
    };
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    
    for (let i = 0; i < this.starCount; i++) {
      const radius = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: this.params.starSize,
      transparent: true,
      opacity: this.params.opacity,
    });
    
    this.stars = new THREE.Points(geometry, material);
    this.group.add(this.stars);
  }

  getParamDefs() {
    return [
      { key: 'starSize',  label: 'Star Size',       min: 0.02, max: 0.5, step: 0.01, type: 'range' },
      { key: 'speed',     label: 'Speed',            min: 0.2,  max: 5,   step: 0.1,  type: 'range' },
      { key: 'colorHue',  label: 'Color Hue (-1=white)', min: -1, max: 1, step: 0.01, type: 'range' },
      { key: 'opacity',   label: 'Opacity',          min: 0.2,  max: 1,   step: 0.01, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    const positions = this.stars.geometry.attributes.position.array;
    const volume = audioData.volume || 0;
    const speed = this.params.speed * (1 + volume * 10);

    for (let i = 0; i < this.starCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      const length = Math.sqrt(x * x + y * y + z * z);
      
      positions[i * 3]     *= (1 + speed * deltaTime * 0.1);
      positions[i * 3 + 1] *= (1 + speed * deltaTime * 0.1);
      positions[i * 3 + 2] *= (1 + speed * deltaTime * 0.1);
      
      if (length > 60) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 10;
        positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }
    }
    
    this.stars.geometry.attributes.position.needsUpdate = true;
    this.stars.material.size = this.params.starSize;
    this.stars.material.opacity = this.params.opacity;
    if (this.params.colorHue >= 0) {
      this.stars.material.color.setHSL(this.params.colorHue, 1, 0.9);
    } else {
      this.stars.material.color.set(0xffffff);
    }
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.stars.geometry.dispose();
    this.stars.material.dispose();
  }
}

// Reaction Diffusion (Turing pattern simulation)
class ReactionDiffusionGenerator {
  constructor() {
    this.group = new THREE.Group();
    this.cells = [];
    this.gridSize = 20;
    this.time = 0;

    this.params = {
      heightScale:    2,
      colorHue:       0,
      colorRange:     0.7,
      speed:          1,
      spacing:        VIEW_W / 20,  // ≈ 1.34 — 20 cells × spacing ≈ VIEW_W
    };

    this._buildCells();
  }

  _buildCells() {
    this.cells.forEach(cell => {
      this.group.remove(cell.mesh);
      cell.mesh.geometry.dispose();
      cell.mesh.material.dispose();
    });
    this.cells = [];

    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const geometry = new THREE.BoxGeometry(0.8, 0.2, 0.8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = (x - this.gridSize / 2) * this.params.spacing;
        mesh.position.z = (z - this.gridSize / 2) * this.params.spacing;
        this.group.add(mesh);
        this.cells.push({ mesh, value: Math.random(), x, z });
      }
    }
  }

  getParamDefs() {
    return [
      { key: 'colorHue',    label: 'Color Hue',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'colorRange',  label: 'Color Range',      min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'heightScale', label: 'Height Scale',     min: 0.5, max: 6,   step: 0.1,  type: 'range' },
      { key: 'speed',       label: 'Speed',            min: 0.2, max: 4,   step: 0.05, type: 'range' },
      { key: 'spacing',     label: 'Spacing',          min: 0.5, max: 2,   step: 0.05, type: 'range' },
    ];
  }

  update(audioData, deltaTime) {
    this.time += deltaTime;
    const volume = audioData.volume || 0;
    const rate = this.params.speed * (0.5 + volume * 2);
    
    this.cells.forEach(cell => {
      const wave = Math.sin(cell.x * 0.5 + this.time * rate) * 
                   Math.cos(cell.z * 0.5 - this.time * rate);
      cell.value = (wave + 1) / 2;
      
      const height = 0.2 + cell.value * this.params.heightScale;
      cell.mesh.scale.y = height;
      cell.mesh.position.y = height / 2;
      cell.mesh.position.x = (cell.x - this.gridSize / 2) * this.params.spacing;
      cell.mesh.position.z = (cell.z - this.gridSize / 2) * this.params.spacing;
      
      const hue = (this.params.colorHue + cell.value * this.params.colorRange) % 1;
      cell.mesh.material.color.setHSL(hue, 1, 0.5);
    });
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.cells.forEach(cell => {
      cell.mesh.geometry.dispose();
      cell.mesh.material.dispose();
    });
    this.cells = [];
  }
}


export { GaussianRipplesGenerator, StarfieldWarpGenerator, ReactionDiffusionGenerator };