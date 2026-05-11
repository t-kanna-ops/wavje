// ===== WavJe Audio Engine =====
class WavJeAudioEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.frequencyData = new Uint8Array(512);
    this.waveformData = new Uint8Array(512);
    this.bandValues = [0, 0, 0, 0];
    this.bandSmoothing = 0.85;
    this.lastPeak = 0;
    this.peakDecay = 0.98;
    this.lastEnergy = 0;
    this.energySmoothing = 0.9;

    // Audio file player
    this.audioFilePlayer = null;
    this.audioMode = 'microphone'; // 'microphone' or 'file'

    // Debug mode
    this.debugMode = false;
    this.debugOscillator = null;
    this.debugGain = null;
    this.debugBPM = 120;
    this.debugKickFreq = 60;
    this.debugStartTime = 0;
    this.debugBeatDuration = 0.1; // 100ms
  }

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Initialize audio file player
      this.audioFilePlayer = new AudioFilePlayer(this.audioContext);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      this.audioMode = 'microphone';
      
      console.log('✓Audio Engine initialized');
    } catch (error) {
      console.error('✓Audio initialization failed:', error);
      throw error;
    }
  }

  async loadAudioFile(file) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!this.audioFilePlayer) {
      this.audioFilePlayer = new AudioFilePlayer(this.audioContext);
    }
    
    await this.audioFilePlayer.loadFile(file);
    this.switchToFileMode();
  }

  switchToFileMode() {
    // Disconnect microphone if connected
    if (this.microphone) {
      this.microphone.disconnect();
    }
    
    // Switch to file mode (analyser will be available after play())
    this.audioMode = 'file';
    console.log('✓Switched to file mode');
  }

  switchToMicrophoneMode() {
    // Stop file player
    if (this.audioFilePlayer) {
      this.audioFilePlayer.stop();
    }
    
    // Reconnect microphone
    if (this.microphone) {
      this.microphone.connect(this.analyser);
      this.audioMode = 'microphone';
      console.log('✓Switched to microphone mode');
    }
  }

  playAudioFile() {
    if (this.audioFilePlayer) {
      console.log('Starting audio file playback...');
      this.audioFilePlayer.play();
    } else {
      console.warn('⚠️ AudioFilePlayer not initialized');
    }
  }

  pauseAudioFile() {
    if (this.audioFilePlayer) {
      this.audioFilePlayer.pause();
    }
  }

  stopAudioFile() {
    if (this.audioFilePlayer) {
      this.audioFilePlayer.stop();
    }
  }

  seekAudioFile(time) {
    if (this.audioFilePlayer) {
      this.audioFilePlayer.seek(time);
    }
  }

  getAudioFileCurrentTime() {
    return this.audioFilePlayer ? this.audioFilePlayer.getCurrentTime() : 0;
  }

  getAudioFileDuration() {
    return this.audioFilePlayer ? this.audioFilePlayer.duration : 0;
  }

  // Get audio data from a specific source ('current' | 'file' | 'mic')
  getAudioDataFromSource(source) {
    if (source === 'current') {
      return this.updateAudioData();
    }

    const tmpFreq = new Uint8Array(512);
    const tmpWave = new Uint8Array(512);

    let analyser = null;
    if (source === 'file') {
      analyser = this.audioFilePlayer ? this.audioFilePlayer.getAnalyser() : null;
    } else if (source === 'mic') {
      analyser = this.analyser;
    }

    if (!analyser) return this.getEmptyAudioData();

    analyser.getByteFrequencyData(tmpFreq);
    analyser.getByteTimeDomainData(tmpWave);

    const getBand = (start, end) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += tmpFreq[i];
      return Math.min(1, (sum / (end - start)) / 255);
    };

    const bands = {
      low:     getBand(0, 10),
      lowMid:  getBand(10, 40),
      highMid: getBand(40, 160),
      high:    getBand(160, 512),
    };
    const volume = (bands.low + bands.lowMid + bands.highMid + bands.high) / 4;

    return {
      timestamp: 0,
      bands,
      frequency: tmpFreq,
      waveform: tmpWave,
      volume,
      masterVolume: volume,
      peak: Math.max(bands.low, bands.lowMid, bands.highMid, bands.high),
      energyFlux: 0,
      currentTime: 0,
      duration: 0,
    };
  }

  updateAudioData() {
    // Use AudioFilePlayer's analyser when in file mode
    const activeAnalyser = (this.audioMode === 'file' && this.audioFilePlayer && this.audioFilePlayer.getAnalyser()) 
      ? this.audioFilePlayer.getAnalyser() 
      : this.analyser;

    if (!activeAnalyser) {
      return this.getEmptyAudioData();
    }

    activeAnalyser.getByteFrequencyData(this.frequencyData);
    activeAnalyser.getByteTimeDomainData(this.waveformData);

    // Update debug beat if in debug mode
    if (this.debugMode) {
      this.updateDebugBeat();
    }

    const bands = this.calculateBands();
    const currentEnergy = bands.reduce((a, b) => a + b, 0) / 4;
    const energyFlux = (currentEnergy - this.lastEnergy) * 100;
    this.lastEnergy = currentEnergy * this.energySmoothing + this.lastEnergy * (1 - this.energySmoothing);

    const peak = Math.max(...bands);
    this.lastPeak = Math.max(peak, this.lastPeak * this.peakDecay);

    const currentTime = this.audioMode === 'file' ? this.getAudioFileCurrentTime() : 0;
    const duration = this.audioMode === 'file' ? this.getAudioFileDuration() : 0;

    return {
      timestamp: currentTime, // Use audio playback time, not Date.now()
      bands: {
        low: bands[0],
        lowMid: bands[1],
        highMid: bands[2],
        high: bands[3]
      },
      frequency: this.frequencyData,
      waveform: this.waveformData,
      volume: currentEnergy, // Add volume property
      masterVolume: currentEnergy,
      peak: this.lastPeak,
      energyFlux,
      currentTime,
      duration,
    };
  }

  calculateBands() {
    const low = this.getAverageFrequency(0, 10);
    const lowMid = this.getAverageFrequency(10, 40);
    const highMid = this.getAverageFrequency(40, 160);
    const high = this.getAverageFrequency(160, 512);

    this.bandValues[0] = low * (1 - this.bandSmoothing) + this.bandValues[0] * this.bandSmoothing;
    this.bandValues[1] = lowMid * (1 - this.bandSmoothing) + this.bandValues[1] * this.bandSmoothing;
    this.bandValues[2] = highMid * (1 - this.bandSmoothing) + this.bandValues[2] * this.bandSmoothing;
    this.bandValues[3] = high * (1 - this.bandSmoothing) + this.bandValues[3] * this.bandSmoothing;

    return this.bandValues.map(v => Math.min(1, v / 255));
  }

  getAverageFrequency(start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.frequencyData[i];
    }
    return sum / (end - start);
  }

  getEmptyAudioData() {
    return {
      timestamp: 0,
      bands: {
        low: 0,
        lowMid: 0,
        highMid: 0,
        high: 0
      },
      frequency: new Uint8Array(512),
      waveform: new Uint8Array(512),
      volume: 0,
      masterVolume: 0,
      peak: 0,
      energyFlux: 0,
      currentTime: 0,
      duration: 0,
    };
  }

  stop() {
    // Stop audio file playback
    if (this.audioFilePlayer) {
      this.audioFilePlayer.stop();
    }
    
    // Disconnect microphone (but don't close context for restart)
    if (this.microphone && this.audioMode === 'microphone') {
      this.microphone.disconnect();
    }
    
    // Note: Don't close audioContext to allow restart
  }

  // ===== Debug Mode Methods =====
  startDebugMode(bpm = 120, kickFreq = 60) {
    this.debugMode = true;
    this.debugBPM = bpm;
    this.debugKickFreq = kickFreq;
    this.debugStartTime = performance.now() / 1000;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
    }

    this.debugOscillator = this.audioContext.createOscillator();
    this.debugOscillator.type = 'sine';
    this.debugOscillator.frequency.value = this.debugKickFreq;

    this.debugGain = this.audioContext.createGain();
    this.debugGain.gain.value = 0;

    this.debugOscillator.connect(this.debugGain);
    this.debugGain.connect(this.analyser);
    this.debugOscillator.start();

    console.log(`✓Debug mode started: BPM=${bpm}, Kick Freq=${kickFreq}Hz`);
  }

  stopDebugMode() {
    if (this.debugOscillator) {
      this.debugOscillator.stop();
      this.debugOscillator = null;
    }
    if (this.debugGain) {
      this.debugGain.disconnect();
      this.debugGain = null;
    }
    this.debugMode = false;
    console.log('✓Debug mode stopped');
  }

  setDebugKickFreq(freq) {
    this.debugKickFreq = Math.max(10, Math.min(10000, freq));
    if (this.debugOscillator) {
      this.debugOscillator.frequency.value = this.debugKickFreq;
    }
  }

  updateDebugBeat() {
    if (!this.debugMode || !this.debugGain) return;

    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - this.debugStartTime;
    const beatDuration = (60 / this.debugBPM);
    const beatPosition = elapsedTime % beatDuration;

    if (beatPosition < this.debugBeatDuration) {
      const envelopeValue = 1 - (beatPosition / this.debugBeatDuration) * 0.8;
      this.debugGain.gain.value = envelopeValue * 0.3;
    } else {
      this.debugGain.gain.value = 0;
    }
  }
}


export default WavJeAudioEngine;