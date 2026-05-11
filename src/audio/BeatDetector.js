// ===== Beat Detection =====
class BeatDetector {
  constructor() {
    this.history = [];
    this.historyLength = 43; // ~1 second at 43Hz analysis rate
    this.threshold = 1.5; // Energy must be 150% of average
    this.minTimeBetweenBeats = 0.15; // 150ms minimum (400 BPM max)
    this.lastBeatTime = 0;
    this.sensitivity = 1.0;
    this.beatCallbacks = [];
    this.isEnabled = false;
    this.bpm = 0;
    this.beatTimes = [];
    this.maxBeatHistory = 8;
  }

  enable() {
    this.isEnabled = true;
    console.log('✓Beat Detection enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('✓Beat Detection disabled');
  }

  setSensitivity(value) {
    this.sensitivity = Math.max(0.1, Math.min(3.0, value));
    this.threshold = 1.2 + (this.sensitivity - 1.0) * 0.5;
  }

  onBeat(callback) {
    this.beatCallbacks.push(callback);
  }

  detectBeat(audioData) {
    if (!this.isEnabled) return false;

    const currentTime = performance.now() / 1000;
    const lowEnergy = audioData.bands[0]; // Kick drum in low band
    
    // Add to history
    this.history.push(lowEnergy);
    if (this.history.length > this.historyLength) {
      this.history.shift();
    }

    // Calculate average energy
    const avgEnergy = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    
    // Detect beat: current energy > threshold * average AND enough time passed
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const isBeat = lowEnergy > avgEnergy * this.threshold && 
                   timeSinceLastBeat > this.minTimeBetweenBeats;

    if (isBeat) {
      this.lastBeatTime = currentTime;
      
      // Calculate BPM
      this.beatTimes.push(currentTime);
      if (this.beatTimes.length > this.maxBeatHistory) {
        this.beatTimes.shift();
      }
      
      if (this.beatTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < this.beatTimes.length; i++) {
          intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        this.bpm = Math.round(60 / avgInterval);
      }

      // Trigger callbacks
      this.beatCallbacks.forEach(cb => {
        try {
          cb({ time: currentTime, energy: lowEnergy, bpm: this.bpm });
        } catch (e) {
          console.error('Beat callback error:', e);
        }
      });

      return true;
    }

    return false;
  }

  getBPM() {
    return this.bpm;
  }

  reset() {
    this.history = [];
    this.beatTimes = [];
    this.lastBeatTime = 0;
    this.bpm = 0;
  }
}


export default BeatDetector;