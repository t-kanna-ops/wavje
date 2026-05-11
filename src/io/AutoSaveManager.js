// ===== Auto-save Manager =====
class AutoSaveManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.isEnabled = false;
    this.intervalMinutes = 5;
    this.lastSaveTime = Date.now();
    this.intervalId = null;
    this.saveCount = 0;
  }

  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.lastSaveTime = Date.now();
    this.startInterval();
    console.log(`✓Auto-save enabled (every ${this.intervalMinutes} minutes)`);
  }

  disable() {
    this.isEnabled = false;
    this.stopInterval();
    console.log('✓Auto-save disabled');
  }

  setInterval(minutes) {
    this.intervalMinutes = Math.max(1, Math.min(60, minutes));
    if (this.isEnabled) {
      this.stopInterval();
      this.startInterval();
    }
  }

  startInterval() {
    this.stopInterval();
    const intervalMs = this.intervalMinutes * 60 * 1000;
    
    this.intervalId = setInterval(() => {
      this.performAutoSave();
    }, intervalMs);
  }

  stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async performAutoSave() {
    if (!this.isEnabled || !this.sessionManager) return;

    try {
      const sessionName = `AutoSave_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await this.sessionManager.saveSession(sessionName);
      this.lastSaveTime = Date.now();
      this.saveCount++;
      console.log(`✓Auto-saved: ${sessionName} (${this.saveCount} total)`);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }

  getTimeSinceLastSave() {
    return (Date.now() - this.lastSaveTime) / 1000 / 60; // minutes
  }
}


export default AutoSaveManager;