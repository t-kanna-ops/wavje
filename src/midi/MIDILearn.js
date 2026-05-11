// ===== MIDI Learn =====
class MIDILearn {
  constructor(midiController) {
    this.midiController = midiController;
    this.isLearning = false;
    this.currentParameter = null;
    this.mappings = new Map();
    this.onLearnCallback = null;
  }

  startLearning(parameterName, callback) {
    this.isLearning = true;
    this.currentParameter = parameterName;
    this.onLearnCallback = callback;
    console.log(`MIDI Learn: Waiting for input for "${parameterName}"...`);
  }

  stopLearning() {
    this.isLearning = false;
    this.currentParameter = null;
    this.onLearnCallback = null;
  }

  handleMIDIMessage(cc, value) {
    if (!this.isLearning || !this.currentParameter) return false;

    // Map CC to parameter
    this.mappings.set(this.currentParameter, cc);
    console.log(`✓Mapped CC ${cc} →"${this.currentParameter}"`);
    
    if (this.onLearnCallback) {
      this.onLearnCallback(this.currentParameter, cc);
    }
    
    this.stopLearning();
    return true;
  }

  getMapping(parameterName) {
    return this.mappings.get(parameterName);
  }

  clearMapping(parameterName) {
    this.mappings.delete(parameterName);
  }

  clearAllMappings() {
    this.mappings.clear();
  }

  exportMappings() {
    const obj = {};
    this.mappings.forEach((cc, param) => {
      obj[param] = cc;
    });
    return JSON.stringify(obj, null, 2);
  }

  importMappings(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      Object.entries(obj).forEach(([param, cc]) => {
        this.mappings.set(param, cc);
      });
      console.log(`✓Imported ${Object.keys(obj).length} MIDI mappings`);
      return true;
    } catch (e) {
      console.error('Failed to import MIDI mappings:', e);
      return false;
    }
  }
}


export default MIDILearn;