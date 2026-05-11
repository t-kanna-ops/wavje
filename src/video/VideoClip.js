// ===== Video Clip =====
class VideoClip {
  constructor(file, name) {
    this.file = file;
    this.name = name;
    this.video = document.createElement('video');
    this.video.src = URL.createObjectURL(file);
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.preload = 'metadata';
    this.video.crossOrigin = 'anonymous';
    this.texture = new THREE.VideoTexture(this.video);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    // Don't set format - let Three.js auto-detect (RGBFormat is deprecated and causes WebGL errors)
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.isLoaded = false;
    this.duration = 0;
    this.width = 0;
    this.height = 0;
    
    // Load the video
    this.video.load();
    
    this.video.addEventListener('loadedmetadata', () => {
      this.duration = this.video.duration;
      this.width = this.video.videoWidth;
      this.height = this.video.videoHeight;
      this.isLoaded = true;
      console.log(`✓Video loaded: ${name} (${this.width}x${this.height}, ${this.duration.toFixed(2)}s)`);
    });
    
    this.video.addEventListener('error', (e) => {
      console.error(`✗Video load error: ${name}`, e);
    });
  }

  get videoElement() {
    return this.video;
  }

  play() {
    if (this.video.paused) {
      this.video.play().catch(e => console.warn('Video play failed:', e));
    }
  }

  pause() {
    this.video.pause();
  }

  stop() {
    this.video.pause();
    this.video.currentTime = 0;
  }

  getTexture() {
    return this.texture;
  }

  dispose() {
    // Stop video playback
    this.video.pause();
    
    // Revoke object URL before clearing src
    const src = this.video.src;
    this.video.src = '';
    this.video.load(); // Force unload
    
    // Dispose texture
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    
    // Revoke blob URL
    if (src && src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
    
    // Remove event listeners
    this.video.onloadedmetadata = null;
    this.video.onerror = null;
    
    console.log(`✓ Video disposed: ${this.name}`);
  }

  getMetadata() {
    return {
      name: this.name,
      width: this.width,
      height: this.height,
      duration: this.duration,
      currentTime: this.video.currentTime,
      isPlaying: !this.video.paused
    };
  }
}


export default VideoClip;