// ===== Phase 5: Transition Shaders =====
const TransitionShaders = {
  // Dissolve Transition
  dissolve: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      varying vec2 vUv;
      
      void main() {
        vec4 colorFrom = texture2D(tFrom, vUv);
        vec4 colorTo = texture2D(tTo, vUv);
        gl_FragColor = mix(colorFrom, colorTo, progress);
      }
    `
  },

  // Wipe Transition
  wipe: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 },
      direction: { value: 0 } // 0=left, 1=right, 2=up, 3=down
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      uniform int direction;
      varying vec2 vUv;
      
      void main() {
        float threshold;
        if (direction == 0) { // left
          threshold = vUv.x;
        } else if (direction == 1) { // right
          threshold = 1.0 - vUv.x;
        } else if (direction == 2) { // up
          threshold = vUv.y;
        } else { // down
          threshold = 1.0 - vUv.y;
        }
        
        vec4 colorFrom = texture2D(tFrom, vUv);
        vec4 colorTo = texture2D(tTo, vUv);
        float mixValue = step(threshold, progress);
        gl_FragColor = mix(colorFrom, colorTo, mixValue);
      }
    `
  },

  // Zoom Transition
  zoom: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 },
      zoomIn: { value: 1.0 } // 1.0=zoom in, 0.0=zoom out
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      uniform float zoomIn;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float zoom = mix(1.0, 0.0, progress * zoomIn) + mix(0.0, 1.0, progress * (1.0 - zoomIn));
        vec2 zoomUv = center + (vUv - center) / max(zoom, 0.001);
        
        vec4 colorFrom = texture2D(tFrom, vUv);
        vec4 colorTo = texture2D(tTo, zoomUv);
        
        if (zoomUv.x < 0.0 || zoomUv.x > 1.0 || zoomUv.y < 0.0 || zoomUv.y > 1.0) {
          colorTo = vec4(0.0);
        }
        
        gl_FragColor = mix(colorFrom, colorTo, progress);
      }
    `
  },

  // Spin Transition
  spin: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        vec2 offset = vUv - center;
        float angle = progress * 3.14159 * 2.0;
        float c = cos(angle);
        float s = sin(angle);
        vec2 rotated = vec2(
          offset.x * c - offset.y * s,
          offset.x * s + offset.y * c
        ) + center;
        
        vec4 colorFrom = texture2D(tFrom, vUv);
        vec4 colorTo = texture2D(tTo, rotated);
        
        if (rotated.x < 0.0 || rotated.x > 1.0 || rotated.y < 0.0 || rotated.y > 1.0) {
          colorTo = colorFrom;
        }
        
        gl_FragColor = mix(colorFrom, colorTo, progress);
      }
    `
  },

  // Slide Transition
  slide: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 },
      direction: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      uniform int direction;
      varying vec2 vUv;
      
      void main() {
        vec2 fromUv = vUv;
        vec2 toUv = vUv;
        
        if (direction == 0) { // left
          fromUv.x += progress;
          toUv.x += progress - 1.0;
        } else if (direction == 1) { // right
          fromUv.x -= progress;
          toUv.x -= progress - 1.0;
        } else if (direction == 2) { // up
          fromUv.y += progress;
          toUv.y += progress - 1.0;
        } else { // down
          fromUv.y -= progress;
          toUv.y -= progress - 1.0;
        }
        
        vec4 colorFrom = vec4(0.0);
        vec4 colorTo = vec4(0.0);
        
        if (fromUv.x >= 0.0 && fromUv.x <= 1.0 && fromUv.y >= 0.0 && fromUv.y <= 1.0) {
          colorFrom = texture2D(tFrom, fromUv);
        }
        if (toUv.x >= 0.0 && toUv.x <= 1.0 && toUv.y >= 0.0 && toUv.y <= 1.0) {
          colorTo = texture2D(tTo, toUv);
        }
        
        gl_FragColor = colorFrom + colorTo;
      }
    `
  },

  // Radial Transition
  radial: {
    uniforms: {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tFrom;
      uniform sampler2D tTo;
      uniform float progress;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        float maxDist = 0.707;
        float normalizedDist = dist / maxDist;
        
        vec4 colorFrom = texture2D(tFrom, vUv);
        vec4 colorTo = texture2D(tTo, vUv);
        float mixValue = smoothstep(normalizedDist - 0.1, normalizedDist + 0.1, progress);
        gl_FragColor = mix(colorFrom, colorTo, mixValue);
      }
    `
  }
};


export default TransitionShaders;