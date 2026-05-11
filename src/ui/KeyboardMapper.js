// ===== Keyboard Mapper =====
class KeyboardMapper {
  constructor(clipMatrix, deckA, deckB, scene = null) {
    this.clipMatrix = clipMatrix;
    this.deckA = deckA;
    this.deckB = deckB;
    this.scene = scene;
    this.currentDeck = deckA;
    this.currentLayerIndex = 0;
    
    // Keyboard layout mapping (3 rows x 11 cols)
    this.keyMap = {
      0: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '_'], // Row 0
      1: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':'], // Row 1
      2: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@']  // Row 2
    };
    
    this.setupKeyboardListener();
  }

  setScene(scene) {
    this.scene = scene;
  }

  setupKeyboardListener() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyPress(event);
    });
  }

  handleKeyPress(event) {
    const key = event.key.toLowerCase();
    
    // Deck selection with Shift keys
    if (event.shiftKey) {
      if (event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
        this.currentDeck = this.deckA;
        console.log('✓Switched to Deck A');
      } else if (event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
        this.currentDeck = this.deckB;
        console.log('✓Switched to Deck B');
      }
    }
    
    // Layer selection (1, 2, 3 keys)
    if (key === '1') this.currentLayerIndex = 0;
    if (key === '2') this.currentLayerIndex = 1;
    if (key === '3') this.currentLayerIndex = 2;
    
    // Find key in grid and trigger clip
    for (let row = 0; row < 3; row++) {
      const col = this.keyMap[row].indexOf(key);
      if (col !== -1) {
        this.clipMatrix.triggerClip(row, col, this.currentDeck, this.currentLayerIndex, this.scene);
        event.preventDefault();
        return;
      }
    }
  }
}


export default KeyboardMapper;