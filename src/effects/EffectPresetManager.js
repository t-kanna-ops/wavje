// ===== Effect Presets =====
class EffectPresetManager {
  constructor() {
    this.presets = new Map();
    this.currentPreset = null;
    this.loadDefaultPresets();
  }

  loadDefaultPresets() {
    // Default presets
    this.addPreset('Default', {
      deckA: { opacity: 1.0, blendMode: 'normal' },
      deckB: { opacity: 0.0, blendMode: 'normal' },
      mixer: { crossfader: 0, masterOpacity: 1.0 },
      effects: []
    });

    this.addPreset('Split Screen', {
      deckA: { opacity: 1.0, blendMode: 'normal' },
      deckB: { opacity: 1.0, blendMode: 'normal' },
      mixer: { crossfader: 0.5, masterOpacity: 1.0 },
      effects: []
    });

    this.addPreset('Overlay', {
      deckA: { opacity: 1.0, blendMode: 'normal' },
      deckB: { opacity: 0.7, blendMode: 'add' },
      mixer: { crossfader: 0.5, masterOpacity: 1.0 },
      effects: []
    });

    this.addPreset('High Contrast', {
      deckA: { opacity: 1.0, blendMode: 'multiply' },
      deckB: { opacity: 0.8, blendMode: 'screen' },
      mixer: { crossfader: 0.3, masterOpacity: 1.0 },
      effects: []
    });

    console.log(`✓Loaded ${this.presets.size} effect presets`);
  }

  addPreset(name, config) {
    this.presets.set(name, config);
  }

  getPreset(name) {
    return this.presets.get(name);
  }

  getAllPresetNames() {
    return Array.from(this.presets.keys());
  }

  applyPreset(name, deckA, deckB, mixer) {
    const preset = this.presets.get(name);
    if (!preset) {
      console.warn(`Preset not found: ${name}`);
      return false;
    }

    try {
      // Apply deck A settings
      if (preset.deckA) {
        if (preset.deckA.opacity !== undefined) {
          deckA.layers.forEach(layer => layer.setOpacity(preset.deckA.opacity));
        }
        if (preset.deckA.blendMode) {
          deckA.layers.forEach(layer => layer.setBlendMode(preset.deckA.blendMode));
        }
      }

      // Apply deck B settings
      if (preset.deckB) {
        if (preset.deckB.opacity !== undefined) {
          deckB.layers.forEach(layer => layer.setOpacity(preset.deckB.opacity));
        }
        if (preset.deckB.blendMode) {
          deckB.layers.forEach(layer => layer.setBlendMode(preset.deckB.blendMode));
        }
      }

      // Apply mixer settings
      if (preset.mixer && mixer) {
        if (preset.mixer.crossfader !== undefined) {
          mixer.setCrossfader(preset.mixer.crossfader);
        }
        if (preset.mixer.masterOpacity !== undefined) {
          mixer.setMasterOpacity(preset.mixer.masterOpacity);
        }
      }

      this.currentPreset = name;
      console.log(`✓Applied preset: ${name}`);
      return true;
    } catch (e) {
      console.error(`Failed to apply preset ${name}:`, e);
      return false;
    }
  }

  saveCustomPreset(name, deckA, deckB, mixer, effectManager = null) {
    const config = {
      deckA: {
        opacity: deckA.layers[0] ? deckA.layers[0].opacity : 1.0,
        blendMode: deckA.layers[0] ? deckA.layers[0].blendMode : 'normal'
      },
      deckB: {
        opacity: deckB.layers[0] ? deckB.layers[0].opacity : 1.0,
        blendMode: deckB.layers[0] ? deckB.layers[0].blendMode : 'normal'
      },
      mixer: {
        crossfader: mixer ? mixer.crossfader : 0,
        masterOpacity: mixer ? mixer.masterOpacity : 1.0
      },
      effects: [],
      timestamp: Date.now()
    };
    
    // Save effect parameters if effect manager is provided
    if (effectManager) {
      const effects = effectManager.getAllEffects();
      config.effects = effects.map(effect => ({
        type: effect.type,
        params: { ...effect.params }
      }));
    }

    this.addPreset(name, config);
    
    // Save to localStorage
    this.saveToLocalStorage();
    
    console.log(`✓Saved custom preset: ${name}`);
    return true;
  }
  
  deletePreset(name) {
    if (this.presets.has(name)) {
      this.presets.delete(name);
      this.saveToLocalStorage();
      console.log(`✓Deleted preset: ${name}`);
      return true;
    }
    return false;
  }
  
  saveToLocalStorage() {
    try {
      const presetsObj = {};
      this.presets.forEach((value, key) => {
        presetsObj[key] = value;
      });
      localStorage.setItem('wavje_effect_presets', JSON.stringify(presetsObj));
      console.log('✓Presets saved to localStorage');
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }
  
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('wavje_effect_presets');
      if (stored) {
        const presetsObj = JSON.parse(stored);
        Object.entries(presetsObj).forEach(([name, config]) => {
          this.presets.set(name, config);
        });
        console.log(`✓Loaded ${this.presets.size} presets from localStorage`);
        return true;
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
    return false;
  }

  exportPresets() {
    const presetsObj = {};
    this.presets.forEach((value, key) => {
      presetsObj[key] = value;
    });
    return JSON.stringify(presetsObj, null, 2);
  }
  
  downloadPresetsFile() {
    const json = this.exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavje-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✓Preset file downloaded');
  }

  importPresets(jsonString) {
    try {
      const presetsObj = JSON.parse(jsonString);
      let count = 0;
      Object.entries(presetsObj).forEach(([name, config]) => {
        this.addPreset(name, config);
        count++;
      });
      
      // Save to localStorage
      this.saveToLocalStorage();
      
      console.log(`✓Imported ${count} presets`);
      return count;
    } catch (e) {
      console.error('Failed to import presets:', e);
      return 0;
    }
  }
}


export default EffectPresetManager;