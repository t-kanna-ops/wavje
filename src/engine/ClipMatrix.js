// ===== Clip Matrix (3x11 Grid) =====
class ClipMatrix {
  constructor() {
    this.ROWS = 3;
    this.COLS = 11;
    this.clips = [];
    
    // LRU (Least Recently Used) management
    this.maxVideoClips = 10; // Maximum simultaneous video clips
    this.accessTimes = {}; // Track last access time for each clip
    this.protectedClips = new Set(); // Clips currently in use (on layers)
    
    // Initialize grid
    for (let row = 0; row < this.ROWS; row++) {
      this.clips[row] = [];
      for (let col = 0; col < this.COLS; col++) {
        this.clips[row][col] = {
          id: `${row}-${col}`,
          type: 'empty', // 'empty', 'video', 'generator'
          content: null,
          row,
          col,
          name: '',
          lastAccess: 0,
          position: { x: 0, y: 0, z: 0 },
        };
      }
    }
  }
  
  // Mark clip as accessed (for LRU)
  markAccessed(row, col) {
    const clipId = `${row}-${col}`;
    this.accessTimes[clipId] = Date.now();
    const clip = this.getClip(row, col);
    if (clip) {
      clip.lastAccess = Date.now();
    }
  }
  
  // Protect clip from LRU eviction (currently in use)
  protectClip(row, col) {
    const clipId = `${row}-${col}`;
    this.protectedClips.add(clipId);
  }
  
  // Unprotect clip
  unprotectClip(row, col) {
    const clipId = `${row}-${col}`;
    this.protectedClips.delete(clipId);
  }
  
  // Get count of loaded video clips
  getVideoClipCount() {
    let count = 0;
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        if (this.clips[row][col].type === 'video') {
          count++;
        }
      }
    }
    return count;
  }
  
  // Evict least recently used video clip
  evictLRUClip() {
    let oldestTime = Date.now();
    let oldestClip = null;
    
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const clip = this.clips[row][col];
        const clipId = `${row}-${col}`;
        
        // Skip non-video, empty, and protected clips
        if (clip.type !== 'video' || this.protectedClips.has(clipId)) {
          continue;
        }
        
        const accessTime = this.accessTimes[clipId] || 0;
        if (accessTime < oldestTime) {
          oldestTime = accessTime;
          oldestClip = { row, col };
        }
      }
    }
    
    // Evict the oldest clip
    if (oldestClip) {
      console.log(`LRU: Evicting clip [${oldestClip.row},${oldestClip.col}]`);
      this.clearClip(oldestClip.row, oldestClip.col);
      return true;
    }
    
    return false;
  }

  setClip(row, col, content, type, name = '') {
    if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
      // Check if we need to evict clips for video
      if (type === 'video') {
        const currentCount = this.getVideoClipCount();
        if (currentCount >= this.maxVideoClips) {
          this.evictLRUClip();
        }
      }
      
      // Dispose old clip content if exists
      const oldClip = this.clips[row][col];
      if (oldClip && oldClip.content) {
        if (oldClip.type === 'video' && oldClip.content.dispose) {
          oldClip.content.dispose();
        } else if (oldClip.type === 'generator' && oldClip.content.instance) {
          // Dispose generator scene objects
          if (oldClip.content.instance.dispose) {
            oldClip.content.instance.dispose();
          }
        }
        
        // Clean up preview renderer for this cell
        const index = row * this.COLS + col;
        const cell = document.querySelector(`[data-clip-index="${index}"]`);
        if (cell && cell._previewRenderer) {
          cell._previewRenderer.dispose();
          delete cell._previewRenderer;
          delete cell._previewScene;
          delete cell._previewCamera;
        }
      }
      
      this.clips[row][col] = {
        id: `${row}-${col}`,
        type,
        content,
        row,
        col,
        name,
        effectManager: null, // Assigned by WavJeApplication after setClip
        // Audio reactivity settings for generator clips
        audioSettings: {
          source: 'current', // 'current' | 'file' | 'mic'
          band: 'all',       // 'all' | 'low' | 'lowMid' | 'highMid' | 'high' | 'volume' | 'peak'
        },
        position: { x: 0, y: 0, z: 0 },
      };
    }
  }

  getClip(row, col) {
    if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
      return this.clips[row][col];
    }
    return null;
  }

  clearClip(row, col) {
    if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
      const clip = this.clips[row][col];
      if (clip.content && clip.content.dispose) {
        clip.content.dispose();
      }
      
      // Clean up preview renderer for this cell
      const index = row * this.COLS + col;
      const cell = document.querySelector(`[data-clip-index="${index}"]`);
      if (cell && cell._previewRenderer) {
        cell._previewRenderer.dispose();
        delete cell._previewRenderer;
        delete cell._previewScene;
        delete cell._previewCamera;
      }
      
      // Reset UI
      if (cell) {
        const preview = cell.querySelector('.clip-preview');
        if (preview) {
          const ctx = preview.getContext('2d');
          ctx.clearRect(0, 0, preview.width, preview.height);
        }
        cell.style.backgroundColor = '#1a1a1a';
        delete cell.dataset.generatorId;
      }
      
      this.clips[row][col] = {
        id: `${row}-${col}`,
        type: 'empty',
        content: null,
        row,
        col,
        name: ''
      };
    }
  }

  triggerClip(row, col, deck, layerIndex = 0, scene) {
    const clip = this.getClip(row, col);
    if (clip && clip.type !== 'empty' && clip.content) {
      const layer = deck.getLayer(layerIndex);
      layer.setContent(clip.content, clip.type);
      
      // Mark as accessed for LRU
      this.markAccessed(row, col);
      
      // Protect clip from eviction while in use
      this.protectClip(row, col);
      
      // Create mesh in scene if provided
      if (scene && clip.type === 'video') {
        layer.createMesh(scene);
      }
      
      console.log(`✓Triggered clip [${row},${col}] on ${deck.name} Layer ${layerIndex}`);
      
      // Start playback
      if (clip.type === 'video' && clip.content.play) {
        clip.content.play();
      }
    }
  }

  getAllClips() {
    const allClips = [];
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        allClips.push(this.clips[row][col]);
      }
    }
    return allClips;
  }
}


export default ClipMatrix;