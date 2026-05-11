// ===== Safe Mode Manager =====
class SafeModeManager {
  constructor(renderEngine, performanceMonitor) {
    this.renderEngine = renderEngine;
    this.performanceMonitor = performanceMonitor;
    
    this.enabled = false;
    this.isActive = false; // Currently in degraded mode
    
    // Performance levels
    this.levels = {
      normal: {
        resolution: { width: 1920, height: 1080 },
        targetFPS: 60,
        pixelRatio: window.devicePixelRatio,
        antialiasing: true,
        shadowQuality: 'high'
      },
      reduced: {
        resolution: { width: 1280, height: 720 },
        targetFPS: 45,
        pixelRatio: 1,
        antialiasing: true,
        shadowQuality: 'medium'
      },
      low: {
        resolution: { width: 960, height: 540 },
        targetFPS: 30,
        pixelRatio: 1,
        antialiasing: false,
        shadowQuality: 'low'
      },
      minimal: {
        resolution: { width: 640, height: 360 },
        targetFPS: 24,
        pixelRatio: 1,
        antialiasing: false,
        shadowQuality: 'none'
      }
    };
    
    this.currentLevel = 'normal';
    this.originalSettings = { ...this.levels.normal };
    
    // Monitoring settings
    this.checkInterval = null;
    this.lowFpsCount = 0;
    this.recoveryCount = 0;
    this.lowFpsThreshold = 3; // 3 consecutive low FPS readings to downgrade
    this.recoveryThreshold = 5; // 5 consecutive good readings to upgrade
  }

  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.startMonitoring();
    console.log('✓ Safe Mode enabled');
  }

  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.stopMonitoring();
    this.restoreNormalMode();
    console.log('✓ Safe Mode disabled');
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  startMonitoring() {
    if (this.checkInterval) return;
    
    // Check every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkPerformance();
    }, 2000);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkPerformance() {
    if (!this.enabled || !this.performanceMonitor.isMonitoring) return;
    
    const metrics = this.performanceMonitor.getMetrics();
    const fps = metrics.fps;
    
    // Check if FPS is low
    if (fps < 30) {
      this.lowFpsCount++;
      this.recoveryCount = 0;
      
      if (this.lowFpsCount >= this.lowFpsThreshold) {
        this.degradePerformance();
        this.lowFpsCount = 0;
      }
    } 
    // Check if FPS is good
    else if (fps >= 55) {
      this.recoveryCount++;
      this.lowFpsCount = 0;
      
      if (this.recoveryCount >= this.recoveryThreshold) {
        this.upgradePerformance();
        this.recoveryCount = 0;
      }
    }
    // Reset counters if FPS is in middle range
    else {
      this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
      this.recoveryCount = Math.max(0, this.recoveryCount - 1);
    }
  }

  degradePerformance() {
    const levels = ['normal', 'reduced', 'low', 'minimal'];
    const currentIndex = levels.indexOf(this.currentLevel);
    
    if (currentIndex < levels.length - 1) {
      const newLevel = levels[currentIndex + 1];
      this.applyLevel(newLevel);
      console.warn(`⚠️ Safe Mode: Performance degraded to ${newLevel}`);
    }
  }

  upgradePerformance() {
    const levels = ['normal', 'reduced', 'low', 'minimal'];
    const currentIndex = levels.indexOf(this.currentLevel);
    
    if (currentIndex > 0) {
      const newLevel = levels[currentIndex - 1];
      this.applyLevel(newLevel);
      console.log(`✓ Safe Mode: Performance upgraded to ${newLevel}`);
    }
  }

  applyLevel(levelName) {
    const level = this.levels[levelName];
    if (!level) return;
    
    this.currentLevel = levelName;
    this.isActive = levelName !== 'normal';
    
    // Apply resolution
    this.renderEngine.setResolution(level.resolution.width, level.resolution.height);
    
    // Apply pixel ratio
    this.renderEngine.renderer.setPixelRatio(level.pixelRatio);
    
    // Apply antialiasing (requires renderer recreation, skip for now)
    // Future: this.renderEngine.setAntialiasing(level.antialiasing);
    
    // Notify user
    if (this.isActive) {
      this.showNotification(`Safe Mode: ${levelName} (${level.resolution.width}x${level.resolution.height} @ ${level.targetFPS}fps)`);
    }
  }

  restoreNormalMode() {
    if (this.currentLevel === 'normal') return;
    
    this.applyLevel('normal');
    this.isActive = false;
    console.log('✓ Safe Mode: Restored to normal performance');
  }

  showNotification(message) {
    // Show a temporary notification to the user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(255, 165, 0, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getStatus() {
    return {
      enabled: this.enabled,
      isActive: this.isActive,
      currentLevel: this.currentLevel,
      settings: this.levels[this.currentLevel]
    };
  }
}


export default SafeModeManager;