// ===== Phase 6: Keyboard Shortcut Manager =====
class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.customShortcuts = new Map();
    this.enabled = true;
    
    // Default shortcuts
    this.defaultShortcuts = {
      'Space': { action: 'playPause', description: 'Play/Pause' },
      'Escape': { action: 'stop', description: 'Stop All' },
      'KeyR': { action: 'record', description: 'Start/Stop Recording', modifiers: ['ctrl'] },
      'KeyS': { action: 'save', description: 'Save Session', modifiers: ['ctrl'] },
      'KeyO': { action: 'open', description: 'Open Session', modifiers: ['ctrl'] },
      'KeyF': { action: 'fullscreen', description: 'Toggle Fullscreen' },
      'KeyD': { action: 'debug', description: 'Toggle Debug', modifiers: ['ctrl'] },
      'Digit1': { action: 'deckA', description: 'Select Deck A' },
      'Digit2': { action: 'deckB', description: 'Select Deck B' },
      'BracketLeft': { action: 'prevEffect', description: 'Previous Effect' },
      'BracketRight': { action: 'nextEffect', description: 'Next Effect' },
      'Equal': { action: 'increaseBPM', description: 'Increase BPM', modifiers: ['ctrl'] },
      'Minus': { action: 'decreaseBPM', description: 'Decrease BPM', modifiers: ['ctrl'] },
      'ArrowUp': { action: 'crossfaderUp', description: 'Crossfader Up' },
      'ArrowDown': { action: 'crossfaderDown', description: 'Crossfader Down' }
    };
    
    this.loadCustomShortcuts();
    this.initializeShortcuts();
  }

  initializeShortcuts() {
    // Merge default and custom shortcuts
    this.shortcuts = new Map([
      ...Object.entries(this.defaultShortcuts),
      ...this.customShortcuts.entries()
    ]);
  }

  loadCustomShortcuts() {
    const saved = localStorage.getItem('wavje_shortcuts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.customShortcuts = new Map(Object.entries(parsed));
      } catch (e) {
        console.error('Failed to load custom shortcuts:', e);
      }
    }
  }

  saveCustomShortcuts() {
    const obj = Object.fromEntries(this.customShortcuts);
    localStorage.setItem('wavje_shortcuts', JSON.stringify(obj));
    console.log('✓ Custom shortcuts saved');
  }

  setShortcut(key, action, description, modifiers = []) {
    this.customShortcuts.set(key, { action, description, modifiers });
    this.initializeShortcuts();
    this.saveCustomShortcuts();
  }

  removeShortcut(key) {
    this.customShortcuts.delete(key);
    this.initializeShortcuts();
    this.saveCustomShortcuts();
  }

  resetToDefaults() {
    this.customShortcuts.clear();
    this.initializeShortcuts();
    this.saveCustomShortcuts();
    console.log('✓ Shortcuts reset to defaults');
  }

  handleKeyEvent(event) {
    if (!this.enabled) return false;
    
    // Don't handle shortcuts when typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return false;
    }
    
    const shortcut = this.shortcuts.get(event.code);
    if (!shortcut) return false;
    
    // Check modifiers
    const requiredModifiers = shortcut.modifiers || [];
    const hasCtrl = requiredModifiers.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
    const hasShift = requiredModifiers.includes('shift') ? event.shiftKey : !event.shiftKey;
    const hasAlt = requiredModifiers.includes('alt') ? event.altKey : !event.altKey;
    
    if (requiredModifiers.includes('ctrl') && !event.ctrlKey) return false;
    if (requiredModifiers.includes('shift') && !event.shiftKey) return false;
    if (requiredModifiers.includes('alt') && !event.altKey) return false;
    
    event.preventDefault();
    return shortcut.action;
  }

  getShortcutsList() {
    return Array.from(this.shortcuts.entries()).map(([key, data]) => ({
      key,
      action: data.action,
      description: data.description,
      modifiers: data.modifiers || [],
      isCustom: this.customShortcuts.has(key)
    }));
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}


export default KeyboardShortcutManager;