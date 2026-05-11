// ===== Session Manager =====
class SessionManager {
  constructor(app) {
    this.app = app;
    this.fileSystemManager = new FileSystemManager();
  }

  async initialize() {
    await this.fileSystemManager.initialize();
  }

  async saveCurrentSession(name = 'Untitled Session') {
    const sessionId = `session-${Date.now()}`;
    
    // Serialize current state
    const sessionData = {
      id: sessionId,
      name,
      clipMatrix: this.serializeClipMatrix(),
      deckA: this.serializeDeck(this.app.deckA),
      deckB: this.serializeDeck(this.app.deckB),
      mixer: {
        crossfader: this.app.mixer.getCrossfader(),
        masterOpacity: this.app.mixer.getMasterOpacity()
      },
      config: {
        bpm: this.app.config.bpm,
        targetFPS: this.app.config.targetFPS,
        masterVolume: this.app.config.masterVolume
      },
      modulationMatrix: this.app.modulationMatrix.toJSON() // Phase 4: Save modulations
    };
    
    await this.fileSystemManager.saveSession(sessionData);
    return sessionId;
  }

  async loadSession(sessionId) {
    const sessionData = await this.fileSystemManager.loadSession(sessionId);
    if (!sessionData) {
      console.warn('Session not found:', sessionId);
      return false;
    }
    
    // Restore state
    this.app.config.bpm = sessionData.config.bpm;
    this.app.config.targetFPS = sessionData.config.targetFPS;
    this.app.config.masterVolume = sessionData.config.masterVolume;
    
    this.app.mixer.setCrossfader(sessionData.mixer.crossfader);
    this.app.mixer.setMasterOpacity(sessionData.mixer.masterOpacity);
    
    // Phase 4: Restore modulations
    if (sessionData.modulationMatrix) {
      this.app.modulationMatrix.fromJSON(sessionData.modulationMatrix);
    }
    
    console.log(`✓Session loaded: ${sessionData.name}`);
    return true;
  }

  serializeClipMatrix() {
    const clips = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 11; col++) {
        const clip = this.app.clipMatrix.getClip(row, col);
        clips.push({
          row,
          col,
          type: clip.type,
          name: clip.name
        });
      }
    }
    return clips;
  }

  serializeDeck(deck) {
    return {
      name: deck.name,
      layers: deck.layers.map(layer => ({
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        isActive: layer.isActive
      }))
    };
  }

  async listSessions() {
    return await this.fileSystemManager.listSessions();
  }
}


export default SessionManager;