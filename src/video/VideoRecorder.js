// ===== Video Recorder =====
class VideoRecorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.mimeType = 'video/webm;codecs=vp9';
    this.frameRate = 60;
  }

  checkSupport() {
    if (!this.canvas.captureStream) {
      console.error('Canvas.captureStream() not supported');
      return false;
    }
    
    // Check supported mime types
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        this.mimeType = type;
        console.log(`✓Using codec: ${type}`);
        return true;
      }
    }
    
    console.error('No supported video codec found');
    return false;
  }

  startRecording(frameRate = 60, options = {}) {
    if (this.isRecording) {
      console.warn('Already recording');
      return false;
    }

    if (!this.checkSupport()) {
      return false;
    }

    try {
      this.frameRate = frameRate;
      this.recordedChunks = [];
      
      // Phase 5: Recording quality options
      const bitrate = options.bitrate || 8000000; // 8 Mbps default
      const audioEnabled = options.audio || false;
      
      // Capture canvas stream
      this.stream = this.canvas.captureStream(this.frameRate);
      
      // Create MediaRecorder with quality settings
      const recorderOptions = {
        mimeType: this.mimeType,
        videoBitsPerSecond: bitrate
      };
      
      if (options.audioBitsPerSecond) {
        recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecording(options.filename);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
      };

      const timeslice = options.timeslice || 100; // ms
      this.mediaRecorder.start(timeslice);
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      console.log(`✓Recording started: ${this.frameRate}fps, ${(bitrate/1000000).toFixed(1)}Mbps`);
      return true;
    } catch (e) {
      console.error('Failed to start recording:', e);
      return false;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('Not recording');
      return false;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    console.log('✓ Recording stopped');
    return true;
  }

  saveRecording(customFilename) {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded data');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type: this.mimeType });
    const url = URL.createObjectURL(blob);
    
    // Calculate recording duration
    const duration = this.recordingStartTime ? (Date.now() - this.recordingStartTime) / 1000 : 0;
    const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
    
    // Create download link
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    if (customFilename) {
      a.download = customFilename;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = this.mimeType.includes('webm') ? 'webm' : 'mp4';
      a.download = `WavJe_Recording_${timestamp}.${extension}`;
    }
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log(`✓Recording saved: ${a.download} (${sizeInMB}MB, ${duration.toFixed(1)}s)`);
    this.recordedChunks = [];
  }

  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      duration: this.recordingStartTime ? (Date.now() - this.recordingStartTime) / 1000 : 0,
      frameRate: this.frameRate,
      mimeType: this.mimeType,
      chunksCount: this.recordedChunks.length
    };
  }
}


export default VideoRecorder;