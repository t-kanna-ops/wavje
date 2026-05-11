// ===== Mixer =====
class Mixer {
  constructor(deckA, deckB) {
    this.deckA = deckA;
    this.deckB = deckB;
    this.crossfader = 0.5; // 0.0 = full A, 1.0 = full B
    this.masterOpacity = 1.0;
  }

  setCrossfader(value) {
    this.crossfader = Math.max(0, Math.min(1, value));
  }

  setMasterOpacity(value) {
    this.masterOpacity = Math.max(0, Math.min(1, value));
  }

  getCrossfader() {
    return this.crossfader;
  }

  getMasterOpacity() {
    return this.masterOpacity;
  }
  
  /**
   * Apply crossfader values to deck groups
   * Crossfader: 0.0 = full Deck A, 0.5 = equal mix, 1.0 = full Deck B
   * Note: Layer opacity is stored in userData to preserve individual layer settings
   */
  applyMix(deckAGroup, deckBGroup, deckALayers, deckBLayers) {
    if (!deckAGroup || !deckBGroup) return;
    
    // Calculate base opacity for each deck based on crossfader
    // Crossfader 0.0 -> A=1.0, B=0.0
    // Crossfader 0.5 -> A=0.5, B=0.5
    // Crossfader 1.0 -> A=0.0, B=1.0
    const deckOpacityA = (1.0 - this.crossfader) * this.masterOpacity;
    const deckOpacityB = this.crossfader * this.masterOpacity;
    
    // Apply opacity to Deck A layers (multiply deck opacity with layer opacity)
    if (deckALayers) {
      deckALayers.forEach(layer => {
        if (layer.mesh && layer.mesh.material) {
          layer.mesh.material.opacity = layer.opacity * deckOpacityA;
          layer.mesh.material.transparent = true;
        }
      });
    }
    
    // Apply opacity to Deck B layers (multiply deck opacity with layer opacity)
    if (deckBLayers) {
      deckBLayers.forEach(layer => {
        if (layer.mesh && layer.mesh.material) {
          layer.mesh.material.opacity = layer.opacity * deckOpacityB;
          layer.mesh.material.transparent = true;
        }
      });
    }
  }
}


export default Mixer;