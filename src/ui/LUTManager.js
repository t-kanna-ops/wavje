// ===== LUT Manager =====
class LUTManager {
  constructor() {
    this.luts = new Map();
    this.currentLUT = null;
    this.lutSize = 33; // Standard LUT size
    this.isEnabled = false;
    this.intensity = 1.0;
  }

  async loadLUTFromFile(file) {
    try {
      const text = await file.text();
      const lut = this.parseCubeFile(text);
      const name = file.name.replace('.cube', '');
      this.luts.set(name, lut);
      console.log(`✓LUT loaded: ${name} (${lut.size}³)`);
      return name;
    } catch (e) {
      console.error('Failed to load LUT:', e);
      throw e;
    }
  }

  parseCubeFile(text) {
    const lines = text.split('\n');
    let size = 33;
    const data = [];
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line.length === 0) continue;
      
      // Parse LUT_3D_SIZE
      if (line.startsWith('LUT_3D_SIZE')) {
        size = parseInt(line.split(/\s+/)[1]);
        continue;
      }
      
      // Parse RGB values
      const values = line.split(/\s+/).filter(v => v.length > 0);
      if (values.length === 3) {
        const r = parseFloat(values[0]);
        const g = parseFloat(values[1]);
        const b = parseFloat(values[2]);
        
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          data.push(r, g, b);
        }
      }
    }
    
    return { size, data: new Float32Array(data) };
  }

  createLUTTexture(lut) {
    if (!lut || !lut.data) return null;
    
    const texture = new THREE.DataTexture(
      lut.data,
      lut.size,
      lut.size,
      THREE.RGBFormat,
      THREE.FloatType
    );
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    
    return texture;
  }

  applyLUT(name) {
    const lut = this.luts.get(name);
    if (!lut) {
      console.warn(`LUT not found: ${name}`);
      return false;
    }
    
    this.currentLUT = this.createLUTTexture(lut);
    this.isEnabled = true;
    console.log(`✓Applied LUT: ${name}`);
    return true;
  }

  disable() {
    this.isEnabled = false;
    if (this.currentLUT) {
      this.currentLUT.dispose();
      this.currentLUT = null;
    }
  }

  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  getLUTNames() {
    return Array.from(this.luts.keys());
  }
}


export default LUTManager;