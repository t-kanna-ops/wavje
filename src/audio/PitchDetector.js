// ===== Pitch Detection (YIN Algorithm) =====
class PitchDetector {
  constructor() {
    this.isEnabled = false;
    this.bufferSize = 2048;
    this.sampleRate = 44100;
    this.threshold = 0.1;
    this.currentPitch = 0;
    this.currentNote = '';
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  enable(sampleRate = 44100) {
    this.isEnabled = true;
    this.sampleRate = sampleRate;
    console.log('✓Pitch Detection enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('✓Pitch Detection disabled');
  }

  setThreshold(value) {
    this.threshold = Math.max(0.01, Math.min(0.5, value));
  }

  detectPitch(audioData) {
    if (!this.isEnabled) return { pitch: 0, note: '', confidence: 0 };

    const waveform = audioData.waveform;
    if (!waveform || waveform.length < this.bufferSize) {
      return { pitch: 0, note: '', confidence: 0 };
    }

    // Convert Uint8Array to normalized float array
    const buffer = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      buffer[i] = (waveform[i] - 128) / 128.0;
    }

    // YIN algorithm
    const yinBuffer = new Float32Array(this.bufferSize / 2);
    
    // Step 1: Autocorrelation
    yinBuffer[0] = 1;
    let runningSum = 0;
    
    for (let tau = 1; tau < yinBuffer.length; tau++) {
      let sum = 0;
      for (let i = 0; i < yinBuffer.length; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
      
      // Step 2: Cumulative mean normalized difference
      runningSum += yinBuffer[tau];
      if (runningSum > 0) {
        yinBuffer[tau] *= tau / runningSum;
      }
    }

    // Step 3: Absolute threshold
    let tauEstimate = -1;
    let minValue = 1;
    
    for (let tau = 2; tau < yinBuffer.length; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        // Find local minimum
        while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        minValue = yinBuffer[tau];
        break;
      }
    }

    // Step 4: Parabolic interpolation
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < yinBuffer.length - 1) {
      const s0 = yinBuffer[tauEstimate - 1];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[tauEstimate + 1];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    // Calculate pitch
    let pitch = 0;
    let confidence = 0;
    
    if (betterTau > 0) {
      pitch = this.sampleRate / betterTau;
      confidence = 1 - minValue;
    }

    // Get note name
    const note = this.frequencyToNote(pitch);
    
    this.currentPitch = pitch;
    this.currentNote = note;
    
    return { pitch, note, confidence };
  }

  frequencyToNote(frequency) {
    if (frequency < 20) return '';
    
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const noteIndex = Math.round(noteNum) + 69;
    const octave = Math.floor(noteIndex / 12) - 1;
    const noteName = this.noteNames[noteIndex % 12];
    
    return `${noteName}${octave}`;
  }

  getPitch() {
    return this.currentPitch;
  }

  getNote() {
    return this.currentNote;
  }
}


export default PitchDetector;