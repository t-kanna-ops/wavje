// ===== Text Renderer =====
class TextRenderer {
  constructor(scene) {
    this.scene = scene;
    this.textMeshes = [];
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvas.width = 1024;
    this.canvas.height = 256;
  }

  createTextTexture(text, options = {}) {
    const fontSize = options.fontSize || 72;
    const fontFamily = options.fontFamily || 'Arial';
    const color = options.color || '#ffffff';
    const bgColor = options.bgColor || 'transparent';
    
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Background
    if (bgColor !== 'transparent') {
      this.context.fillStyle = bgColor;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Text
    this.context.font = `${fontSize}px ${fontFamily}`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;
    return texture;
  }

  addText(text, position, options = {}) {
    const texture = this.createTextTexture(text, options);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: options.opacity !== undefined ? options.opacity : 1.0
    });
    
    const width = options.width || 10;
    const height = options.height || 2.5;
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
    
    // Phase 5: Extended text properties
    if (options.rotation) {
      mesh.rotation.set(
        options.rotation.x || 0,
        options.rotation.y || 0,
        options.rotation.z || 0
      );
    }
    
    if (options.scale) {
      mesh.scale.set(
        options.scale.x || 1,
        options.scale.y || 1,
        options.scale.z || 1
      );
    }
    
    // Animation settings
    mesh.userData.animation = options.animation || null; // 'pulse', 'wave', 'rotate', 'bounce'
    mesh.userData.audioReactive = options.audioReactive || false;
    mesh.userData.baseScale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
    mesh.userData.basePosition = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    mesh.userData.animationTime = 0;
    mesh.userData.animationSpeed = options.animationSpeed || 1.0;
    
    this.scene.add(mesh);
    this.textMeshes.push(mesh);
    
    return mesh;
  }

  updateText(mesh, text, options = {}) {
    if (!mesh) return;
    
    const texture = this.createTextTexture(text, options);
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
  }

  updateAudioReactiveTexts(audioData) {
    const deltaTime = 1/60; // Approximate
    
    this.textMeshes.forEach(mesh => {
      const baseScale = mesh.userData.baseScale || { x: 1, y: 1, z: 1 };
      const basePosition = mesh.userData.basePosition || { x: 0, y: 0, z: 0 };
      mesh.userData.animationTime = (mesh.userData.animationTime || 0) + deltaTime * mesh.userData.animationSpeed;
      
      // Audio reactive
      if (mesh.userData.audioReactive) {
        const energy = audioData.volume || 0;
        const scale = 1 + energy * 0.3;
        
        mesh.scale.set(
          baseScale.x * scale,
          baseScale.y * scale,
          baseScale.z
        );
        
        mesh.material.opacity = 0.7 + energy * 0.3;
      }
      
      // Phase 5: Text animations
      const animation = mesh.userData.animation;
      const t = mesh.userData.animationTime;
      
      if (animation === 'pulse') {
        const pulseFactor = 1 + Math.sin(t * 3) * 0.2;
        mesh.scale.set(
          baseScale.x * pulseFactor,
          baseScale.y * pulseFactor,
          baseScale.z
        );
      } else if (animation === 'wave') {
        mesh.position.y = basePosition.y + Math.sin(t * 2) * 0.5;
      } else if (animation === 'rotate') {
        mesh.rotation.z = t;
      } else if (animation === 'bounce') {
        const bounce = Math.abs(Math.sin(t * 4));
        mesh.position.y = basePosition.y + bounce * 1.5;
      } else if (animation === 'fade') {
        mesh.material.opacity = 0.5 + Math.sin(t) * 0.5;
      }
    });
  }

  removeText(mesh) {
    const index = this.textMeshes.indexOf(mesh);
    if (index > -1) {
      this.textMeshes.splice(index, 1);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map.dispose();
      mesh.material.dispose();
    }
  }

  clear() {
    this.textMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map.dispose();
      mesh.material.dispose();
    });
    this.textMeshes = [];
  }
}


export default TextRenderer;