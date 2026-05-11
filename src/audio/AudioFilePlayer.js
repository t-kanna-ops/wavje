// ===== Audio File Player =====
class AudioFilePlayer {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.sourceNode = null;
    this.audioBuffer = null;
    this.gainNode = null;
    this.analyser = null;
    this.startTime = 0;
    this.pauseTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.duration = 0;
    this.currentFile = null;
    this.loop = false;  // Loop playback flag
  }

  async loadFile(file) {
    this.currentFile = file;
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    console.log(`✓Audio file loaded: ${file.name} (${this.duration.toFixed(2)}s)`);
    return this.audioBuffer;
  }

  async play() {
    if (this.isPlaying && !this.isPaused) {
      console.log('Already playing');
      return;
    }
    
    if (!this.audioBuffer) {
      console.warn('⚠️ No audio file loaded');
      return;
    }

    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      console.log('Resuming AudioContext...');
      await this.audioContext.resume();
    }

    // Create nodes
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.loop;
    this.gainNode = this.audioContext.createGain();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;

    // Connect: source -> gain -> analyser -> destination
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    // Start from pause position or beginning
    const offset = this.isPaused ? this.pauseTime : 0;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;
    this.isPaused = false;

    console.log(`✓Audio playing from ${offset.toFixed(2)}s (duration: ${this.duration.toFixed(2)}s)`);

    this.sourceNode.onended = () => {
      if (this.isPlaying && !this.loop) {
        console.log('Audio ended');
        this.stop();
      }
    };
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    
    this.pauseTime = this.getCurrentTime();
    this.sourceNode.stop();
    this.isPlaying = false;
    this.isPaused = true;
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
    this.startTime = 0;
  }

  seek(time) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = Math.max(0, Math.min(time, this.duration));
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.pauseTime;
    const elapsed = this.audioContext.currentTime - this.startTime;
    if (this.loop && this.duration > 0) {
      return elapsed % this.duration;
    }
    return Math.min(elapsed, this.duration);
  }

  setLoop(enabled) {
    this.loop = enabled;
    if (this.sourceNode) {
      this.sourceNode.loop = enabled;
    }
  }

  setVolume(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

  getAnalyser() {
    return this.analyser;
  }
}


export default AudioFilePlayer;