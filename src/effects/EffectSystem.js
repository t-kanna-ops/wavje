// ===== Effect System =====

// Custom Shader Effects
const EffectShaders = {
  // Bloom Effect
  bloom: {
    uniforms: {
      tDiffuse: { value: null },
      strength: { value: 1.5 },
      radius: { value: 0.5 },
      threshold: { value: 0.3 }
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
      uniform float strength;
      uniform float radius;
      uniform float threshold;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        float brightness = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
        vec3 bloom = vec3(0.0);
        
        if (brightness > threshold) {
          for (float i = -4.0; i <= 4.0; i++) {
            for (float j = -4.0; j <= 4.0; j++) {
              vec2 offset = vec2(i, j) * radius * 0.002;
              vec4 texSample = texture2D(tDiffuse, vUv + offset);
              float sampleBrightness = dot(texSample.rgb, vec3(0.299, 0.587, 0.114));
              if (sampleBrightness > threshold) {
                bloom += texSample.rgb * (1.0 - length(vec2(i, j)) / 5.0);
              }
            }
          }
        }
        
        gl_FragColor = vec4(texel.rgb + bloom * strength, texel.a);
      }
    `
  },

  // Glitch Effect
  glitch: {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.05 },
      seed: { value: 0.5 },
      distortion: { value: 3.0 }
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
      uniform float amount;
      uniform float seed;
      uniform float distortion;
      varying vec2 vUv;
      
      float random(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec2 uv = vUv;
        float block = random(vec2(floor(uv.y * 10.0), seed));
        
        if (block < amount) {
          uv.x += (random(vec2(block, seed)) - 0.5) * distortion * 0.1;
        }
        
        vec4 color = texture2D(tDiffuse, uv);
        
        if (random(vec2(uv.y * 10.0, seed)) < amount) {
          color.r = texture2D(tDiffuse, uv + vec2(0.01, 0.0)).r;
          color.b = texture2D(tDiffuse, uv - vec2(0.01, 0.0)).b;
        }
        
        gl_FragColor = color;
      }
    `
  },

  // RGB Split
  rgbSplit: {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.005 },
      angle: { value: 0.0 }
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
      uniform float amount;
      uniform float angle;
      varying vec2 vUv;
      
      void main() {
        vec2 offset = vec2(cos(angle), sin(angle)) * amount;
        float r = texture2D(tDiffuse, vUv + offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - offset).b;
        float a = texture2D(tDiffuse, vUv).a;
        
        gl_FragColor = vec4(r, g, b, a);
      }
    `
  },

  // Kaleidoscope
  kaleidoscope: {
    uniforms: {
      tDiffuse: { value: null },
      segments: { value: 6.0 },
      rotation: { value: 0.0 }
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
      uniform float segments;
      uniform float rotation;
      varying vec2 vUv;
      
      #define PI 3.14159265359
      
      void main() {
        vec2 uv = vUv - 0.5;
        float angle = atan(uv.y, uv.x) + rotation;
        float radius = length(uv);
        
        angle = mod(angle, 2.0 * PI / segments);
        if (angle > PI / segments) {
          angle = 2.0 * PI / segments - angle;
        }
        
        vec2 newUv = vec2(cos(angle), sin(angle)) * radius + 0.5;
        gl_FragColor = texture2D(tDiffuse, newUv);
      }
    `
  },

  // Chromatic Aberration
  chromaticAberration: {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.003 },
      distortion: { value: 1.0 }
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
      uniform float amount;
      uniform float distortion;
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv;
        vec2 center = uv - 0.5;
        float dist = length(center) * distortion;
        
        vec2 offsetR = center * (1.0 + amount * dist);
        vec2 offsetG = center * (1.0 + amount * dist * 0.5);
        vec2 offsetB = center * (1.0 - amount * dist);
        
        float r = texture2D(tDiffuse, offsetR + 0.5).r;
        float g = texture2D(tDiffuse, offsetG + 0.5).g;
        float b = texture2D(tDiffuse, offsetB + 0.5).b;
        float a = texture2D(tDiffuse, uv).a;
        
        gl_FragColor = vec4(r, g, b, a);
      }
    `
  },

  // Blur Effect
  blur: {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 1.0 },
      direction: { value: 0.0 }
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
      uniform float amount;
      uniform float direction;
      varying vec2 vUv;
      
      void main() {
        vec2 resolution = vec2(1920.0, 1080.0);
        vec2 direction2D = vec2(cos(direction), sin(direction));
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.3846153846) * direction2D;
        vec2 off2 = vec2(3.2307692308) * direction2D;
        
        float blur = amount * 0.002;
        
        color += texture2D(tDiffuse, vUv) * 0.2270270270;
        color += texture2D(tDiffuse, vUv + (off1 / resolution) * blur) * 0.3162162162;
        color += texture2D(tDiffuse, vUv - (off1 / resolution) * blur) * 0.3162162162;
        color += texture2D(tDiffuse, vUv + (off2 / resolution) * blur) * 0.0702702703;
        color += texture2D(tDiffuse, vUv - (off2 / resolution) * blur) * 0.0702702703;
        
        gl_FragColor = color;
      }
    `
  },

  // Hue Shift Effect
  hue: {
    uniforms: {
      tDiffuse: { value: null },
      shift: { value: 0.0 },
      saturation: { value: 1.0 }
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
      uniform float shift;
      uniform float saturation;
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
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 hsv = rgb2hsv(texel.rgb);
        hsv.x = mod(hsv.x + shift, 1.0);
        hsv.y *= saturation;
        vec3 rgb = hsv2rgb(hsv);
        gl_FragColor = vec4(rgb, texel.a);
      }
    `
  },

  // Phase 5: LUT (Look-Up Table) Effect
  lut: {
    uniforms: {
      tDiffuse: { value: null },
      tLUT: { value: null },
      lutSize: { value: 33 },
      intensity: { value: 1.0 }
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
      uniform sampler2D tLUT;
      uniform float lutSize;
      uniform float intensity;
      varying vec2 vUv;
      
      vec3 applyLUT(vec3 color, sampler2D lut, float size) {
        float cellSize = 1.0 / size;
        float halfPixel = 0.5 / size;
        
        float bValue = color.b * (size - 1.0);
        float bFrac = fract(bValue);
        float bInt = floor(bValue);
        
        float row = floor(bInt / size);
        float col = mod(bInt, size);
        
        vec2 uv1 = vec2(
          (col * cellSize) + (color.r * cellSize) + halfPixel,
          (row * cellSize) + (color.g * cellSize) + halfPixel
        );
        
        vec3 color1 = texture2D(lut, uv1).rgb;
        
        row = floor((bInt + 1.0) / size);
        col = mod(bInt + 1.0, size);
        
        vec2 uv2 = vec2(
          (col * cellSize) + (color.r * cellSize) + halfPixel,
          (row * cellSize) + (color.g * cellSize) + halfPixel
        );
        
        vec3 color2 = texture2D(lut, uv2).rgb;
        
        return mix(color1, color2, bFrac);
      }
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 lutColor = applyLUT(texel.rgb, tLUT, lutSize);
        vec3 finalColor = mix(texel.rgb, lutColor, intensity);
        gl_FragColor = vec4(finalColor, texel.a);
      }
    `
  },

  // Phase 5: Color Correction
  colorCorrection: {
    uniforms: {
      tDiffuse: { value: null },
      brightness: { value: 0.0 },
      contrast: { value: 1.0 },
      saturation: { value: 1.0 },
      hue: { value: 0.0 }
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
      uniform float brightness;
      uniform float contrast;
      uniform float saturation;
      uniform float hue;
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
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 color = texel.rgb;
        
        // Brightness
        color += vec3(brightness);
        
        // Contrast
        color = (color - 0.5) * contrast + 0.5;
        
        // Saturation & Hue
        vec3 hsv = rgb2hsv(color);
        hsv.x += hue / 360.0;
        hsv.y *= saturation;
        color = hsv2rgb(hsv);
        
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
      }
    `
  }
};

// Effect Class
class Effect {
  constructor(name, shader) {
    this.id = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Phase 4: Unique ID for modulation
    this.name = name;
    this.shader = shader;
    this.enabled = true;
    this.uniforms = {};
    
    // Clone uniforms
    for (let key in shader.uniforms) {
      this.uniforms[key] = { value: shader.uniforms[key].value };
    }
    
    // Audio reactive settings
    this.audioReactive = {
      enabled: false,
      parameter: null, // which uniform to modulate
      source: 'volume', // 'volume', 'low', 'lowMid', 'highMid', 'high'
      gain: 1.0,
      threshold: 0.0,
      invert: false
    };
  }

  setParameter(name, value) {
    if (this.uniforms[name]) {
      this.uniforms[name].value = value;
    }
  }

  getParameter(name) {
    return this.uniforms[name]?.value;
  }

  setAudioReactive(parameter, source, gain = 1.0, invert = false) {
    this.audioReactive.enabled = true;
    this.audioReactive.parameter = parameter;
    this.audioReactive.source = source;
    this.audioReactive.gain = gain;
    this.audioReactive.invert = invert;
  }

  updateAudioReactive(audioData) {
    if (!this.audioReactive.enabled || !this.audioReactive.parameter) return;
    
    let value = 0;
    switch (this.audioReactive.source) {
      case 'volume':
        value = audioData.volume;
        break;
      case 'low':
        value = audioData.bands?.low || 0;
        break;
      case 'lowMid':
        value = audioData.bands?.lowMid || 0;
        break;
      case 'highMid':
        value = audioData.bands?.highMid || 0;
        break;
      case 'high':
        value = audioData.bands?.high || 0;
        break;
    }
    
    // Apply gain and clamp to 0-1 range
    value = Math.max(0, Math.min(1, value * this.audioReactive.gain));
    
    if (this.audioReactive.invert) {
      value = 1.0 - value;
    }
    
    // Scale to appropriate range based on parameter name and effect type
    const paramName = this.audioReactive.parameter;
    let scaledValue = value;
    
    // Define parameter ranges for different effect types
    const parameterRanges = {
      // Bloom
      'strength': { min: 0, max: 10 },
      'radius': { min: 0, max: 2 },
      'threshold': { min: 0, max: 1 },
      
      // Blur
      'amount': { min: 0, max: 10 },
      'direction': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Glitch
      'seed': { min: 0, max: 1 },
      'distortion': { min: 0, max: 10 },
      
      // Hue
      'shift': { min: 0, max: 1 },
      
      // RGB Split / Chromatic Aberration
      'angle': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Kaleidoscope
      'segments': { min: 2, max: 12 },
      'rotation': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // LUT / Color Correction
      'intensity': { min: 0, max: 1 },
      'brightness': { min: -1, max: 1 },
      'contrast': { min: 0, max: 2 },
      'saturation': { min: 0, max: 2 },
      'hue': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Generic fallback
      'default': { min: 0, max: 10 }
    };
    
    // Get range for this parameter
    const range = parameterRanges[paramName] || parameterRanges['default'];
    
    // Scale from 0-1 to min-max range
    scaledValue = range.min + (value * (range.max - range.min));
    
    this.setParameter(paramName, scaledValue);
  }
}

// Effect Manager
class EffectManager {
  constructor() {
    this.effects = [];
    this.availableEffects = {
      bloom: EffectShaders.bloom,
      glitch: EffectShaders.glitch,
      rgbSplit: EffectShaders.rgbSplit,
      kaleidoscope: EffectShaders.kaleidoscope,
      chromaticAberration: EffectShaders.chromaticAberration,
      lut: EffectShaders.lut, // Phase 5
      colorCorrection: EffectShaders.colorCorrection // Phase 5
    };
  }

  addEffect(name) {
    if (this.availableEffects[name]) {
      const effect = new Effect(name, this.availableEffects[name]);
      this.effects.push(effect);
      console.log(`✓Added effect: ${name}`);
      return effect;
    }
    return null;
  }

  removeEffect(index) {
    if (index >= 0 && index < this.effects.length) {
      const effect = this.effects.splice(index, 1)[0];
      console.log(`✓Removed effect: ${effect.name} (ID: ${effect.id})`);
      
      // Notify render engine to clean up cached material
      if (window.app && window.app.renderEngine && window.app.renderEngine.effectMaterials) {
        const material = window.app.renderEngine.effectMaterials.get(effect.id);
        if (material) {
          material.dispose();
          window.app.renderEngine.effectMaterials.delete(effect.id);
        }
      }
      
      return true;
    }
    return false;
  }

  getEffect(index) {
    return this.effects[index];
  }

  getAllEffects() {
    return this.effects;
  }

  getEffectById(id) {
    // Find effect by unique ID (using effect instance)
    return this.effects.find(effect => effect.id === id);
  }

  updateAudioReactive(audioData) {
    this.effects.forEach(effect => {
      if (effect.enabled) {
        effect.updateAudioReactive(audioData);
      }
    });
  }

  clear() {
    // Clean up all cached materials
    if (window.app && window.app.renderEngine && window.app.renderEngine.effectMaterials) {
      window.app.renderEngine.effectMaterials.forEach(material => {
        material.dispose();
      });
      window.app.renderEngine.effectMaterials.clear();
    }
    
    this.effects = [];
  }
}


export { EffectShaders, Effect, EffectManager };