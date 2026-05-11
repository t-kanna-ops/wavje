// ===== Camera Controller =====
class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.basePosition = { x: 0, y: 0, z: 15 };
    this.baseRotation = { x: 0, y: 0, z: 0 };
    this.baseFOV = 75;
    
    this.audioReactive = {
      position: { enabled: false, intensity: 1.0 },
      rotation: { enabled: false, intensity: 1.0 },
      fov: { enabled: false, intensity: 1.0 }
    };
    
    this.midiControl = {
      position: { x: null, y: null, z: null },
      rotation: { x: null, y: null, z: null },
      fov: null
    };
    
    // Store initial camera state
    this.basePosition.x = camera.position.x;
    this.basePosition.y = camera.position.y;
    this.basePosition.z = camera.position.z;
    this.baseFOV = camera.fov;
  }

  setBasePosition(x, y, z) {
    this.basePosition = { x, y, z };
  }

  setBaseRotation(x, y, z) {
    this.baseRotation = { x, y, z };
  }

  setBaseFOV(fov) {
    this.baseFOV = Math.max(10, Math.min(150, fov));
  }

  enableAudioReactive(type, enabled = true, intensity = 1.0) {
    if (this.audioReactive[type]) {
      this.audioReactive[type].enabled = enabled;
      this.audioReactive[type].intensity = intensity;
    }
  }

  update(audioData) {
    const energy = audioData.masterVolume || 0;
    const bands = audioData.bands || [0, 0, 0, 0];
    
    // Audio-reactive position
    if (this.audioReactive.position.enabled) {
      const intensity = this.audioReactive.position.intensity;
      this.camera.position.x = this.basePosition.x + bands[0] * intensity * 2;
      this.camera.position.y = this.basePosition.y + bands[2] * intensity * 2;
      this.camera.position.z = this.basePosition.z + bands[1] * intensity * 3;
    } else {
      this.camera.position.set(this.basePosition.x, this.basePosition.y, this.basePosition.z);
    }
    
    // Audio-reactive rotation
    if (this.audioReactive.rotation.enabled) {
      const intensity = this.audioReactive.rotation.intensity;
      this.camera.rotation.x = this.baseRotation.x + bands[3] * intensity * 0.3;
      this.camera.rotation.y = this.baseRotation.y + bands[1] * intensity * 0.3;
      this.camera.rotation.z = this.baseRotation.z + energy * intensity * 0.1;
    } else {
      this.camera.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);
    }
    
    // Audio-reactive FOV
    if (this.audioReactive.fov.enabled) {
      const intensity = this.audioReactive.fov.intensity;
      this.camera.fov = this.baseFOV + energy * intensity * 30;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.fov = this.baseFOV;
      this.camera.updateProjectionMatrix();
    }
  }

  handleMIDIControl(cc, value) {
    // Legacy method - MIDI CC10-12 now handled in MIDIController.handleControlChange()
    // Keeping this for potential future rotation/FOV MIDI mapping
    const normalized = value / 127;
    console.log(`CameraController.handleMIDIControl: CC${cc} (deprecated - use CC10-12 in main handler)`);
  }
}


export default CameraController;