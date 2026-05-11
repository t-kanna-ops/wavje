// ===== Onset Detection =====
class OnsetDetector {
  constructor() {
    this.history = [];
    this.historyLength = 10;
    this.threshold = 1.8;
    this.minTimeBetweenOnsets = 0.05; // 50ms minimum
    this.lastOnsetTime = 0;
    this.sensitivity = 1.0;
    this.onsetCallbacks = [];
    this.isEnabled = false;
    this.spectralFlux = 0;
    this.lastSpectrum = null;
  }

  enable() {
    this.isEnabled = true;
    console.log('✓Onset Detection enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('✓Onset Detection disabled');
  }

  setSensitivity(value) {
    this.sensitivity = Math.max(0.1, Math.min(3.0, value));
    this.threshold = 1.5 + (2 - this.sensitivity) * 0.5;
  }

  onOnset(callback) {
    this.onsetCallbacks.push(callback);
  }

  detectOnset(audioData) {
    if (!this.isEnabled) return false;

    const currentTime = performance.now() / 1000;
    const spectrum = audioData.frequency;
    
    // Calculate spectral flux (high-frequency change rate)
    if (this.lastSpectrum) {
      let flux = 0;
      const startBin = 50; // Focus on mid-high frequencies
      const endBin = Math.min(256, spectrum.length);
      
      for (let i = startBin; i < endBin; i++) {
        const diff = Math.max(0, spectrum[i] - this.lastSpectrum[i]);
        flux += diff;
      }
      
      this.spectralFlux = flux / (endBin - startBin);
    }
    
    // Store current spectrum
    this.lastSpectrum = new Uint8Array(spectrum);
    
    // Add to history
    this.history.push(this.spectralFlux);
    if (this.history.length > this.historyLength) {
      this.history.shift();
    }

    // Calculate average flux
    const avgFlux = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    
    // Detect onset
    const timeSinceLastOnset = currentTime - this.lastOnsetTime;
    const isOnset = this.spectralFlux > avgFlux * this.threshold && 
                    timeSinceLastOnset > this.minTimeBetweenOnsets;

    if (isOnset) {
      this.lastOnsetTime = currentTime;
      
      // Trigger callbacks
      this.onsetCallbacks.forEach(cb => {
        try {
          cb({ time: currentTime, flux: this.spectralFlux });
        } catch (e) {
          console.error('Onset callback error:', e);
        }
      });

      return true;
    }

    return false;
  }

  getSpectralFlux() {
    return this.spectralFlux;
  }

  reset() {
    this.history = [];
    this.lastOnsetTime = 0;
    this.spectralFlux = 0;
    this.lastSpectrum = null;
  }
}


export default OnsetDetector;