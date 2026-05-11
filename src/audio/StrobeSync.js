// ===== Strobe Sync =====
class StrobeSync {
  constructor() {
    this.isEnabled = false;
    this.bpm = 120;
    this.flashDuration = 0.05; // 50ms flash
    this.lastFlashTime = 0;
    this.beatInterval = 60 / this.bpm;
    this.intensity = 1.0;
    this.color = { r: 1, g: 1, b: 1 };
    this.pattern = 'every-beat'; // 'every-beat', 'half-beat', 'quarter-beat'
    this.patternMultiplier = 1;
  }

  enable() {
    this.isEnabled = true;
    this.lastFlashTime = performance.now() / 1000;
    console.log('✓Strobe Sync enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('✓Strobe Sync disabled');
  }

  setBPM(bpm) {
    this.bpm = Math.max(30, Math.min(300, bpm));
    this.beatInterval = 60 / this.bpm;
  }

  setPattern(pattern) {
    const patterns = {
      'every-beat': 1,
      'half-beat': 0.5,
      'quarter-beat': 0.25,
      'double-beat': 2
    };
    
    if (patterns[pattern]) {
      this.pattern = pattern;
      this.patternMultiplier = patterns[pattern];
    }
  }

  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value));
  }

  setColor(r, g, b) {
    this.color = { r, g, b };
  }

  update() {
    if (!this.isEnabled) return { active: false, intensity: 0 };

    const currentTime = performance.now() / 1000;
    const interval = this.beatInterval * this.patternMultiplier;
    const timeSinceLastFlash = currentTime - this.lastFlashTime;

    // Check if it's time for a flash
    if (timeSinceLastFlash >= interval) {
      this.lastFlashTime = currentTime;
      return {
        active: true,
        intensity: this.intensity,
        color: this.color,
        progress: 0
      };
    }

    // Calculate flash progress (0 to 1)
    const flashProgress = timeSinceLastFlash / this.flashDuration;
    
    if (flashProgress <= 1.0) {
      // During flash - exponential decay
      const flashIntensity = this.intensity * Math.exp(-flashProgress * 5);
      return {
        active: true,
        intensity: flashIntensity,
        color: this.color,
        progress: flashProgress
      };
    }

    return { active: false, intensity: 0 };
  }

  syncWithBeatDetector(beatDetector) {
    if (beatDetector && beatDetector.getBPM() > 0) {
      this.setBPM(beatDetector.getBPM());
    }
  }
}


export default StrobeSync;