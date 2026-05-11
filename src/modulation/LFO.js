// ===== LFO (Low Frequency Oscillator) =====
class LFO {
  constructor() {
    this.waveform = 'sine'; // sine, triangle, square, sawtooth, random
    this.frequency = 1.0; // Hz
    this.amplitude = 1.0;
    this.phase = 0;
    this.isEnabled = false;
    this.lastUpdateTime = 0;
  }

  enable() {
    this.isEnabled = true;
    this.lastUpdateTime = performance.now() / 1000;
    console.log('✓LFO enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('✓LFO disabled');
  }

  setWaveform(type) {
    const validTypes = ['sine', 'triangle', 'square', 'sawtooth', 'random'];
    if (validTypes.includes(type)) {
      this.waveform = type;
    }
  }

  setFrequency(hz) {
    this.frequency = Math.max(0.01, Math.min(20, hz));
  }

  setAmplitude(value) {
    this.amplitude = Math.max(0, Math.min(1, value));
  }

  getValue() {
    if (!this.isEnabled) return 0;

    const currentTime = performance.now() / 1000;
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Update phase
    this.phase += this.frequency * deltaTime * Math.PI * 2;
    this.phase = this.phase % (Math.PI * 2);

    let value = 0;

    switch (this.waveform) {
      case 'sine':
        value = Math.sin(this.phase);
        break;
      case 'triangle':
        value = 2 * Math.abs((this.phase / Math.PI) % 2 - 1) - 1;
        break;
      case 'square':
        value = this.phase % (Math.PI * 2) < Math.PI ? 1 : -1;
        break;
      case 'sawtooth':
        value = 2 * (this.phase / (Math.PI * 2)) - 1;
        break;
      case 'random':
        if (deltaTime > 1 / this.frequency) {
          value = Math.random() * 2 - 1;
        }
        break;
    }

    return value * this.amplitude;
  }

  getNormalizedValue() {
    // Returns value in 0-1 range
    return (this.getValue() + 1) / 2;
  }

  reset() {
    this.phase = 0;
  }
}


export default LFO;