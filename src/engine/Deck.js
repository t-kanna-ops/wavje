// ===== Deck System =====
class Deck {
  constructor(name) {
    this.name = name; // 'A' or 'B'
    this.layers = [
      new Layer(0),
      new Layer(1),
      new Layer(2)
    ];
    this.group = new THREE.Group();
  }

  getLayer(index) {
    return this.layers[index];
  }

  setLayerContent(layerIndex, content, type) {
    if (layerIndex >= 0 && layerIndex < 3) {
      this.layers[layerIndex].setContent(content, type);
    }
  }

  clearLayer(layerIndex) {
    if (layerIndex >= 0 && layerIndex < 3) {
      this.layers[layerIndex].clearContent();
    }
  }

  getGroup() {
    return this.group;
  }
}


export default Deck;