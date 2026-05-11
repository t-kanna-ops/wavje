// ===== Phase 6: Performance Monitor =====
class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.maxHistoryLength = 60;
    
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    this.gpuInfo = null;
    
    this.thresholds = {
      fpsLow: 30,
      fpsWarning: 45,
      memoryWarning: 0.8, // 80% of available
      cpuWarning: 0.75    // 75%
    };
    
    this.warnings = [];
    this.isMonitoring = false;
    this.monitorInterval = null;
  }

  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    // Monitor every second
    this.monitorInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);
    
    console.log('✓ Performance monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    console.log('✓ Performance monitoring stopped');
  }

  recordFrame() {
    this.frameCount++;
    
    const now = performance.now();
    const delta = now - this.lastTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.fpsHistory.push(this.fps);
      
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastTime = now;
      
      // Check FPS warnings
      if (this.fps < this.thresholds.fpsLow) {
        this.addWarning('fps', `Low FPS: ${this.fps} (target: 60)`);
      }
    }
  }

  updateMetrics() {
    // Memory usage (if available)
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.jsHeapSizeLimit;
      this.memoryUsage = used / total;
      
      if (this.memoryUsage > this.thresholds.memoryWarning) {
        this.addWarning('memory', `High memory usage: ${(this.memoryUsage * 100).toFixed(1)}%`);
      }
    }
  }

  addWarning(type, message) {
    const warning = { type, message, timestamp: Date.now() };
    this.warnings.push(warning);
    
    // Keep only last 10 warnings
    if (this.warnings.length > 10) {
      this.warnings.shift();
    }
    
    console.warn(`⚠️ Performance warning [${type}]: ${message}`);
  }

  clearWarnings() {
    this.warnings = [];
  }

  getMetrics() {
    return {
      fps: this.fps,
      fpsAverage: this.fpsHistory.length > 0 
        ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
        : 0,
      fpsMin: this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0,
      fpsMax: this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0,
      memoryUsage: this.memoryUsage,
      memoryUsageMB: performance.memory 
        ? (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2)
        : 'N/A',
      memoryLimitMB: performance.memory 
        ? (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)
        : 'N/A',
      warnings: this.warnings
    };
  }

  getStatus() {
    if (this.fps >= 60) return 'excellent';
    if (this.fps >= this.thresholds.fpsWarning) return 'good';
    if (this.fps >= this.thresholds.fpsLow) return 'warning';
    return 'critical';
  }

  setThreshold(type, value) {
    if (this.thresholds.hasOwnProperty(type)) {
      this.thresholds[type] = value;
    }
  }
}


export default PerformanceMonitor;