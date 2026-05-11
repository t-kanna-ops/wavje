// ===== Dancing Cubes Generator =====
// VIEW constants
const VIEW_H = 15.0;
const VIEW_W = 26.7;
const BAND_KEYS = ['low', 'lowMid', 'highMid', 'high'];

class DancingCubesGenerator {
  constructor() {
    this.group = new THREE.Group();
    this.cubes = [];
    this.gridSize = 6;

    this.params = {
      gridSize:       6,
      spacing:        VIEW_H * 0.13,   // ≈ 2.0  (6*2=12, fits in 15)
      cubeSize:       VIEW_H * 0.075,  // ≈ 1.1
      scaleIntensity: 2,
      rotationSpeed:  0.05,
      colorHue:       -1,
      saturation:     0.8,
      brightness:     0.5,
    };

    this.initializeCubes();
  }

  getParamDefs() {
    return [
      { key: 'spacing',        label: 'Spacing',          min: 1,   max: 4,   step: 0.1,  type: 'range' },
      { key: 'cubeSize',       label: 'Cube Size',        min: 0.2, max: 1.5, step: 0.05, type: 'range' },
      { key: 'scaleIntensity', label: 'Scale Intensity',  min: 0.5, max: 6,   step: 0.1,  type: 'range' },
      { key: 'rotationSpeed',  label: 'Rotation Speed',   min: 0,   max: 0.2, step: 0.005,type: 'range' },
      { key: 'colorHue',       label: 'Color Hue (-1=Rainbow)', min: -1, max: 1, step: 0.01, type: 'range' },
      { key: 'saturation',     label: 'Saturation',       min: 0,   max: 1,   step: 0.01, type: 'range' },
      { key: 'brightness',     label: 'Brightness',       min: 0,   max: 1,   step: 0.01, type: 'range' },
    ];
  }

  initializeCubes() {
    // Clear old cubes
    this.cubes.forEach(cube => {
      this.group.remove(cube);
      cube.geometry.dispose();
      cube.material.dispose();
    });
    this.cubes = [];

    const spacing = this.params.spacing;
    const size = this.params.cubeSize;
    const startX = -(this.gridSize / 2) * spacing;
    const startY = -(this.gridSize / 2) * spacing;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const hue = this.params.colorHue >= 0 ? this.params.colorHue : (x + y) / (this.gridSize * 2);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(hue, this.params.saturation, this.params.brightness),
          emissive: new THREE.Color().setHSL(hue, this.params.saturation, this.params.brightness * 0.6),
          metalness: 0.3,
          roughness: 0.4,
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(
          startX + x * spacing,
          startY + y * spacing,
          0
        );
        cube.castShadow = true;
        cube.receiveShadow = true;

        this.group.add(cube);
        this.cubes.push(cube);
      }
    }
  }

  update(audioData, deltaTime) {
    this.cubes.forEach((cube, index) => {
      // bands is {low, lowMid, highMid, high} — use name keys
      const bandKey = BAND_KEYS[index % 4];
      const bandValue = audioData.bands ? (audioData.bands[bandKey] || 0) : 0;

      const scaleZ = 1 + bandValue * this.params.scaleIntensity;
      cube.scale.z = scaleZ;

      cube.rotation.x += (audioData.peak || 0) * 0.02;
      cube.rotation.y += (audioData.peak || 0) * 0.03;

      const row = Math.floor(index / this.gridSize);
      const col = index % this.gridSize;
      const hue = this.params.colorHue >= 0
        ? this.params.colorHue
        : (col + row) / (this.gridSize * 2);

      cube.material.color.setHSL(hue, this.params.saturation, this.params.brightness);
      cube.material.emissive.setHSL(hue, this.params.saturation, this.params.brightness * (0.3 + bandValue * 0.6));
      cube.material.emissiveIntensity = 0.3 + bandValue * 0.7;
    });

    this.group.rotation.z += deltaTime * this.params.rotationSpeed;
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.cubes.forEach(cube => {
      cube.geometry.dispose();
      cube.material.dispose();
    });
    this.cubes = [];
  }
}


export default DancingCubesGenerator;