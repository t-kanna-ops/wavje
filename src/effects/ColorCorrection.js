// ===== Color Correction =====
class ColorCorrection {
  constructor() {
    this.enabled = false;
    this.hue = 0;
    this.saturation = 1.0;
    this.brightness = 1.0;
    this.contrast = 1.0;
    this.gamma = 1.0;
    this.temperature = 0; // -1 to 1 (cool to warm)
    this.tint = 0; // -1 to 1 (green to magenta)
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setHue(value) {
    this.hue = value % 360;
  }

  setSaturation(value) {
    this.saturation = Math.max(0, Math.min(2, value));
  }

  setBrightness(value) {
    this.brightness = Math.max(0, Math.min(2, value));
  }

  setContrast(value) {
    this.contrast = Math.max(0, Math.min(2, value));
  }

  setGamma(value) {
    this.gamma = Math.max(0.1, Math.min(3, value));
  }

  setTemperature(value) {
    this.temperature = Math.max(-1, Math.min(1, value));
  }

  setTint(value) {
    this.tint = Math.max(-1, Math.min(1, value));
  }

  createShaderMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uHue: { value: this.hue },
        uSaturation: { value: this.saturation },
        uBrightness: { value: this.brightness },
        uContrast: { value: this.contrast },
        uGamma: { value: this.gamma },
        uTemperature: { value: this.temperature },
        uTint: { value: this.tint }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uHue;
        uniform float uSaturation;
        uniform float uBrightness;
        uniform float uContrast;
        uniform float uGamma;
        uniform float uTemperature;
        uniform float uTint;
        varying vec2 vUv;

        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Brightness
          color.rgb *= uBrightness;
          
          // Contrast
          color.rgb = (color.rgb - 0.5) * uContrast + 0.5;
          
          // Gamma
          color.rgb = pow(color.rgb, vec3(1.0 / uGamma));
          
          // HSV adjustment
          vec3 hsv = rgb2hsv(color.rgb);
          hsv.x += uHue / 360.0;
          hsv.y *= uSaturation;
          color.rgb = hsv2rgb(hsv);
          
          // Temperature (blue-orange)
          color.r += uTemperature * 0.1;
          color.b -= uTemperature * 0.1;
          
          // Tint (green-magenta)
          color.g += uTint * 0.1;
          color.r += abs(uTint) * 0.05;
          color.b += abs(uTint) * 0.05;
          
          gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
        }
      `
    });
  }

  applyToRenderer(renderer, scene, camera, renderTarget) {
    if (!this.enabled) return;
    
    const material = this.createShaderMaterial();
    material.uniforms.tDiffuse.value = renderTarget.texture;
    
    // Apply color correction (simplified implementation)
    // In a real implementation, this would use a post-processing pass
  }
}


export default ColorCorrection;