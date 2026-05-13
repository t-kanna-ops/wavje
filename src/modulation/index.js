// ===== Phase 4: Modulation System =====
class ModulationSource {
  constructor(type, params = {}) {
    this.type = type; // 'manual', 'midiCC', 'audioBand', 'lfo', 'random', 'bpm'
    this.params = params;
    this.value = 0.0;
    this.lastTime = Date.now();
    this.lfoPhase = 0;
    this.randomSeed = params.seed || Math.random();
    this.lastBeatTime = 0;
  }

  getValue(midiData, audioData) {
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;
    
    if (this.type === 'manual') {
      return this.params.value || 0.0;
    } else if (this.type === 'midiCC') {
      const ccNum = this.params.ccNumber || 0;
      const rawValue = (midiData.cc[ccNum] || 0) / 127.0;
      return this.applyModifiers(rawValue);
    } else if (this.type === 'audioBand') {
      const band = this.params.band || 'low';
      const rawValue = audioData.bands[band] || 0.0;
      return this.applyModifiers(rawValue);
    } else if (this.type === 'lfo') {
      // LFO (Low Frequency Oscillator)
      const hz = this.params.hz || 1.0;
      const gain = this.params.gain || 1.0;
      
      this.lfoPhase += deltaTime * hz * Math.PI * 2;
      this.lfoPhase = this.lfoPhase % (Math.PI * 2);
      
      const rawValue = (Math.sin(this.lfoPhase) + 1.0) / 2.0; // 0-1 range
      return rawValue * gain;
    } else if (this.type === 'random') {
      // Random with seed
      const gain = this.params.gain || 1.0;
      const seed = this.params.seed || 0;
      
      // Seeded random using sine function
      const x = Math.sin(seed + now * 0.001) * 10000;
      const rawValue = x - Math.floor(x);
      
      return rawValue * gain;
    } else if (this.type === 'bpm') {
      // BPM-synced trigger
      const bpm = this.params.bpm || 120;
      const division = this.params.division || 1; // 1, 0.5, 0.25, 0.125, 0.0625
      
      const beatDuration = (60 / bpm) * division * 1000; // milliseconds per beat
      const timeSinceBeat = (now - this.lastBeatTime) % beatDuration;
      
      if (timeSinceBeat < beatDuration * 0.1) {
        // Pulse at beat
        return 1.0;
      } else {
        return 0.0;
      }
    }
    return 0.0;
  }

  applyModifiers(value) {
    let result = value;
    const gain = this.params.gain !== undefined ? this.params.gain : 1.0;
    const threshold = this.params.threshold !== undefined ? this.params.threshold : 0.0;
    const invert = this.params.invert || false;

    // Apply threshold
    result = Math.max(0, result - threshold);
    // Apply gain
    result = Math.min(1.0, result * gain);
    // Apply invert
    if (invert) result = 1.0 - result;

    return result;
  }
}

class Modulation {
  constructor(targetType, targetId, paramName, source) {
    this.targetType = targetType; // 'effect', 'layer', 'mixer', 'generator'
    this.targetId = targetId; // effect instance ID, layer index, etc.
    this.paramName = paramName; // parameter name like 'strength', 'amount', etc.
    this.source = source; // ModulationSource instance
    this.min = 0.0;
    this.max = 1.0;
  }

  getValue(midiData, audioData) {
    const sourceValue = this.source.getValue(midiData, audioData);
    return this.min + sourceValue * (this.max - this.min);
  }

  setRange(min, max) {
    this.min = min;
    this.max = max;
  }
}

class ModulationMatrix {
  constructor() {
    this.modulations = []; // Array of Modulation instances
    this.midiData = { cc: {} }; // Current MIDI CC values
  }

  addModulation(modulation) {
    this.modulations.push(modulation);
    console.log(`✓ Modulation added: ${modulation.targetType}.${modulation.paramName} <- ${modulation.source.type}`);
  }

  removeModulation(index) {
    if (index >= 0 && index < this.modulations.length) {
      this.modulations.splice(index, 1);
    }
  }

  clearModulations() {
    this.modulations = [];
  }

  updateMIDIData(ccNumber, value) {
    this.midiData.cc[ccNumber] = value;
    // Debug: Log every 10th update
    if (ccNumber === 20 && value % 13 === 0) {
      console.log(`📊 ModulationMatrix.updateMIDIData: CC${ccNumber} = ${value}`);
      console.log(`   this.midiData.cc:`, this.midiData.cc);
      console.log(`   Total CC values stored:`, Object.keys(this.midiData.cc).length);
    }
  }

  applyModulations(audioData, effectManager, clipMatrix = null) {
    if (!effectManager && !clipMatrix) return;
    
    let processedCount = 0;
    const MAX_MODULATIONS = 1000; // Prevent infinite loops
    
    // Parameter ranges definition (same as audio reactive system)
    const parameterRanges = {
      // Bloom
      'strength': { min: 0, max: 10 },
      'radius': { min: 0, max: 2 },
      'threshold': { min: 0, max: 1 },
      
      // Blur
      'amount': { min: 0, max: 10 },
      'direction': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Glitch
      'seed': { min: 0, max: 1 },
      'distortion': { min: 0, max: 10 },
      
      // Hue
      'shift': { min: 0, max: 1 },
      
      // RGB Split / Chromatic Aberration
      'angle': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Kaleidoscope
      'segments': { min: 2, max: 12 },
      'rotation': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // LUT / Color Correction
      'intensity': { min: 0, max: 1 },
      'brightness': { min: -1, max: 1 },
      'contrast': { min: 0, max: 2 },
      'saturation': { min: 0, max: 2 },
      'hue': { min: 0, max: 6.28 }, // 0 to 2*PI
      
      // Generic fallback
      'default': { min: 0, max: 10 }
    };
    
    // Debug: Log modulations once every 60 frames
    if (!this._modulationDebugCounter) this._modulationDebugCounter = 0;
    const shouldDebug = (this._modulationDebugCounter++ % 60 === 0) && this.modulations.length > 0;
    
    if (shouldDebug) {
      console.log(`🎛️ Modulations active: ${this.modulations.length}`);
      console.log(`   MIDI CC data:`, Object.keys(this.midiData.cc).map(cc => `CC${cc}=${this.midiData.cc[cc]}`).join(', '));
      console.log(`   EffectManager has ${effectManager.getAllEffects().length} effects`);
    }
    
    this.modulations.forEach((mod, modIndex) => {
      if (processedCount++ > MAX_MODULATIONS) {
        console.error('❌ Too many modulations - possible infinite loop');
        return;
      }
      
      try {
        // Get source value (0-1 range from MIDI CC or audio)
        const sourceValue = mod.source.getValue(this.midiData, audioData);
        
        if (shouldDebug) {
          console.log(`   Mod ${modIndex}: ${mod.source.type} → ${mod.targetType}.${mod.paramName}, source value: ${sourceValue.toFixed(3)}`);
        }
        
        if (mod.targetType === 'effect') {
          // Apply to effect parameter
          const effect = effectManager.getEffectById(mod.targetId);
          
          if (shouldDebug) {
            console.log(`     Looking for effect ID: ${mod.targetId}`);
            console.log(`     Available effects:`, effectManager.getAllEffects().map(e => `${e.name}(${e.id})`).join(', '));
            console.log(`     Effect found:`, effect ? `YES (${effect.name})` : 'NO');
          }
          
          if (effect && effect.uniforms && effect.uniforms[mod.paramName]) {
            // Get appropriate range for this parameter
            const range = parameterRanges[mod.paramName] || parameterRanges['default'];
            
            // Scale from 0-1 to parameter's natural range
            // Using modulation's min/max if set, otherwise use parameter range
            const useCustomRange = mod.min !== 0 || mod.max !== 1;
            const finalMin = useCustomRange ? mod.min : range.min;
            const finalMax = useCustomRange ? mod.max : range.max;
            
            const scaledValue = finalMin + (sourceValue * (finalMax - finalMin));
            
            if (shouldDebug) {
              console.log(`     Setting ${mod.paramName} = ${scaledValue.toFixed(3)} (range: ${finalMin}-${finalMax})`);
            }
            
            effect.setParameter(mod.paramName, scaledValue);
          } else if (shouldDebug) {
            if (!effect) {
              console.warn(`     ⚠️ Effect not found with ID: ${mod.targetId}`);
            } else if (!effect.uniforms[mod.paramName]) {
              console.warn(`     ⚠️ Parameter "${mod.paramName}" not found in effect "${effect.name}"`);
            }
          }
        } else if (mod.targetType === 'generator' && clipMatrix) {
          // Apply to generator instance param
          // targetId is clip id like "1-3" (row-col)
          const parts = String(mod.targetId).split('-');
          const row = parseInt(parts[0]);
          const col = parseInt(parts[1]);
          const clip = clipMatrix.getClip(row, col);
          if (clip && clip.type === 'generator' && clip.content?.instance?.params) {
            const instance = clip.content.instance;
            if (mod.paramName in instance.params) {
              const def = typeof instance.getParamDefs === 'function'
                ? instance.getParamDefs().find(d => d.key === mod.paramName)
                : null;
              const rangeMin = def ? def.min : 0;
              const rangeMax = def ? def.max : 1;
              const useCustomRange = mod.min !== 0 || mod.max !== 1;
              const finalMin = useCustomRange ? mod.min : rangeMin;
              const finalMax = useCustomRange ? mod.max : rangeMax;
              instance.params[mod.paramName] = Math.max(rangeMin, Math.min(rangeMax,
                finalMin + sourceValue * (finalMax - finalMin)
              ));
            }
          }
        } else if (mod.targetType === 'clipPosition' && clipMatrix) {
          // Apply to clip position (x / y / z)
          const parts = String(mod.targetId).split('-');
          const row = parseInt(parts[0]);
          const col = parseInt(parts[1]);
          const clip = clipMatrix.getClip(row, col);
          if (clip) {
            if (!clip.position) clip.position = { x: 0, y: 0, z: 0 };
            const axis = mod.paramName; // 'x', 'y', or 'z'
            if (axis === 'x' || axis === 'y' || axis === 'z') {
              const useCustomRange = mod.min !== 0 || mod.max !== 1;
              const finalMin = useCustomRange ? mod.min : -10;
              const finalMax = useCustomRange ? mod.max : 10;
              clip.position[axis] = finalMin + sourceValue * (finalMax - finalMin);
            }
          }
        }
        // layer / mixer are handled by applyGlobalModulations()
      } catch (error) {
        console.error('❌ Modulation error:', error);
      }
    });
  }

  /**
   * Apply modulations that target the Mixer (crossfader) or individual Layer opacities.
   * Call this ONCE per animation frame.
   *
   * @param {object} audioData  – current audio analysis data
   * @param {Mixer}  mixer      – the Mixer instance
   * @param {{A: Deck, B: Deck}} decks – deck map
   */
  applyGlobalModulations(audioData, mixer, decks) {
    if (!mixer && !decks) return;

    this.modulations.forEach(mod => {
      try {
        const sourceValue = mod.source.getValue(this.midiData, audioData);
        const scaledValue = Math.max(0, Math.min(1,
          mod.min + sourceValue * (mod.max - mod.min)
        ));

        if (mod.targetType === 'mixer' && mixer) {
          if (mod.paramName === 'crossfader') {
            mixer.setCrossfader(scaledValue);
          }
        } else if (mod.targetType === 'layer' && decks) {
          // targetId format: 'A-0', 'A-1', 'B-2', etc.
          const parts = String(mod.targetId).split('-');
          const deckKey = parts[0]; // 'A' or 'B'
          const layerIdx = parseInt(parts[1]);
          const deck = decks[deckKey];
          if (deck && mod.paramName === 'opacity') {
            const layer = deck.getLayer(layerIdx);
            if (layer) {
              layer.opacity = scaledValue;
            }
          }
        }
      } catch (error) {
        console.error('❌ Global modulation error:', error);
      }
    });
  }

  toJSON() {
    return {
      modulations: this.modulations.map(mod => ({
        targetType: mod.targetType,
        targetId: mod.targetId,
        paramName: mod.paramName,
        sourceType: mod.source.type,
        sourceParams: mod.source.params,
        min: mod.min,
        max: mod.max
      }))
    };
  }

  fromJSON(data) {
    this.clearModulations();
    if (data.modulations) {
      data.modulations.forEach(modData => {
        const source = new ModulationSource(modData.sourceType, modData.sourceParams);
        const mod = new Modulation(modData.targetType, modData.targetId, modData.paramName, source);
        mod.setRange(modData.min, modData.max);
        this.addModulation(mod);
      });
    }
  }
}


export { ModulationSource, Modulation, ModulationMatrix };