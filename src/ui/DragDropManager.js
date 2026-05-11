// ===== Phase 6: Drag & Drop Manager =====
class DragDropManager {
  constructor(clipMatrix, deckA, deckB) {
    this.clipMatrix = clipMatrix;
    this.deckA = deckA;
    this.deckB = deckB;
    this.draggedItem = null;
    this.dragSource = null; // 'matrix' or 'layer'
    this.draggedFromPosition = null;
    this.enabled = true;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setupClipMatrixDragDrop() {
    // Setup drag & drop for all clip matrix cells
    const cells = document.querySelectorAll('.clip-cell');
    cells.forEach((cell, index) => {
      const row = Math.floor(index / 11);
      const col = index % 11;
      
      cell.setAttribute('draggable', 'true');
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      cell.addEventListener('dragstart', (e) => this.handleDragStart(e, row, col));
      cell.addEventListener('dragover', (e) => this.handleDragOver(e));
      cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));
      cell.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
  }

  setupLayerDragDrop() {
    // Setup drag & drop for layer slots
    const layerSlots = document.querySelectorAll('.layer-slot');
    layerSlots.forEach((slot, index) => {
      const deck = slot.dataset.deck; // 'A' or 'B'
      const layerIndex = slot.dataset.layer;
      
      slot.addEventListener('dragover', (e) => this.handleDragOver(e));
      slot.addEventListener('drop', (e) => this.handleLayerDrop(e, deck, layerIndex));
    });
  }

  handleDragStart(e, row, col) {
    if (!this.enabled) return;
    
    const clip = this.clipMatrix.getClip(row, col);
    if (!clip) {
      e.preventDefault();
      return;
    }
    
    this.draggedItem = clip;
    this.draggedFromPosition = { row, col };
    this.dragSource = 'matrix';
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    
    // Visual feedback
    e.target.style.opacity = '0.4';
    e.target.classList.add('dragging');
    
    console.log(`Drag started: Clip from (${row}, ${col})`);
  }

  handleDragOver(e) {
    if (!this.enabled) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Visual feedback for drop target
    e.currentTarget.classList.add('drag-over');
  }

  handleDrop(e, targetRow, targetCol) {
    if (!this.enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    e.currentTarget.classList.remove('drag-over');
    
    if (!this.draggedItem || !this.draggedFromPosition) return;
    
    const sourceRow = this.draggedFromPosition.row;
    const sourceCol = this.draggedFromPosition.col;
    
    // Swap clips
    const targetClip = this.clipMatrix.getClip(targetRow, targetCol);
    
    this.clipMatrix.setClip(targetRow, targetCol, this.draggedItem);
    this.clipMatrix.setClip(sourceRow, sourceCol, targetClip);
    
    console.log(`Clip moved: (${sourceRow},${sourceCol}) → (${targetRow},${targetCol})`);
    
    // Update UI
    this.updateClipMatrixUI();
  }

  handleLayerDrop(e, deck, layerIndex) {
    if (!this.enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    e.currentTarget.classList.remove('drag-over');
    
    if (!this.draggedItem) return;
    
    const targetDeck = deck === 'A' ? this.deckA : this.deckB;
    const layer = targetDeck.layers[parseInt(layerIndex)];
    
    if (layer) {
      layer.setContent(this.draggedItem.content, this.draggedItem.type);
      console.log(`Clip assigned to Deck ${deck}, Layer ${layerIndex}`);
    }
  }

  handleDragEnd(e) {
    if (!this.enabled) return;
    
    // Reset visual state
    e.target.style.opacity = '1';
    e.target.classList.remove('dragging');
    
    // Remove drag-over class from all elements
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    
    // Clear drag state
    this.draggedItem = null;
    this.dragSource = null;
    this.draggedFromPosition = null;
  }

  updateClipMatrixUI() {
    // Trigger UI refresh (should be implemented in main app)
    if (window.app && window.app.updateClipMatrixDisplay) {
      window.app.updateClipMatrixDisplay();
    }
  }
}


export default DragDropManager;