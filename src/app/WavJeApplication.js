// ===== Main Application =====
class WavJeApplication {
  constructor(config = {}) {
    this.config = {
      targetFPS: config.targetFPS || 60,
      bpm: config.bpm || 120,
      masterVolume: config.masterVolume || 1,
      currentGenerator: 'dancing-cubes',
    };

    const container = document.getElementById('canvas-container');
    this.audioEngine = new WavJeAudioEngine();
    this.renderEngine = new WavJe3DEngine(container, {
      targetFPS: this.config.targetFPS,
    });

    // Initialize deck system
    this.deckA = new Deck('A');
    this.deckB = new Deck('B');
    this.currentDeck = this.deckA;
    
    // Initialize mixer
    this.mixer = new Mixer(this.deckA, this.deckB);
    
    // Initialize clip matrix
    this.clipMatrix = new ClipMatrix();
    
    // Initialize input systems (will set scene later)
    this.keyboardMapper = new KeyboardMapper(this.clipMatrix, this.deckA, this.deckB, null);
    this.midiController = new MIDIController(
      this.clipMatrix, 
      this.deckA, 
      this.deckB, 
      this.mixer,
      this.renderEngine.cameraController,
      null
    );
    
    // Selected clip for inspector
    this.selectedClip = null;
    
    // Focused layer for clip loading
    this.focusedLayer = { deck: 'A', index: 0 };
    
    // Phase 2: Master Effect Manager
    this.masterEffectManager = new EffectManager();
    
    // Connect master effect manager to render engine
    this.renderEngine.effectManager = this.masterEffectManager;
    
    // Initialize session manager
    this.sessionManager = new SessionManager(this);

    // Initialize Phase 1 features
    this.beatDetector = new BeatDetector();
    this.transitionManager = new TransitionManager();
    this.effectPresetManager = new EffectPresetManager();
    this.strobeSync = new StrobeSync();
    this.autoSaveManager = new AutoSaveManager(this.sessionManager);

    // Initialize Phase 2 features
    this.lutManager = new LUTManager();
    this.colorCorrection = new ColorCorrection();

    // Initialize Phase 3 features
    this.videoRecorder = new VideoRecorder(this.renderEngine.renderer.domElement);
    this.midiLearn = new MIDILearn(this.midiController);
    this.onsetDetector = new OnsetDetector();
    this.pitchDetector = new PitchDetector();
    this.lfo = new LFO();
    
    // Initialize Phase 4 features
    this.languageManager = new LanguageManager();
    this.modulationMatrix = new ModulationMatrix(); // Phase 4: Modulation system

    // Initialize Phase 6 features
    this.dragDropManager = new DragDropManager(this.clipMatrix, this.deckA, this.deckB);
    this.keyboardShortcutManager = new KeyboardShortcutManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.safeModeManager = new SafeModeManager(this.renderEngine, this.performanceMonitor);

    this.currentGenerator = null;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.animationId = null;

    this.setupUI();
  }

  async initialize() {
    try {
      await this.audioEngine.initialize();
      
      // Auto-resume AudioContext on first user interaction
      const resumeAudioContext = async () => {
        if (this.audioEngine.audioContext && this.audioEngine.audioContext.state === 'suspended') {
          await this.audioEngine.audioContext.resume();
          console.log('✓ AudioContext resumed');
        }
      };
      
      // Listen for first click/keypress
      document.addEventListener('click', resumeAudioContext, { once: true });
      document.addEventListener('keydown', resumeAudioContext, { once: true });
      
      await this.sessionManager.initialize();
      await this.midiController.initialize();
      
      // Phase 5: Initialize TransitionManager
      this.transitionManager.initialize(this.renderEngine.renderer);
      
      // Set scene reference for input systems
      const scene = this.renderEngine.scene;
      this.keyboardMapper.setScene(scene);
      this.midiController.setScene(scene);
      
      // Setup beat detection callback
      this.beatDetector.onBeat((beatData) => {
        console.log(`♪ Beat detected! BPM: ${beatData.bpm}, Energy: ${beatData.energy.toFixed(2)}`);
        // Sync strobe with detected beats
        if (this.strobeSync.isEnabled) {
          this.strobeSync.syncWithBeatDetector(this.beatDetector);
        }
      });

      // Setup onset detection callback
      this.onsetDetector.onOnset((onsetData) => {
        console.log(`⚡ Onset detected! Flux: ${onsetData.flux.toFixed(2)}`);
      });
      
      // Enable pitch detector with audio context sample rate
      if (this.audioEngine.audioContext) {
        this.pitchDetector.enable(this.audioEngine.audioContext.sampleRate);
      }
      
      // Phase 6: Setup drag & drop
      setTimeout(() => {
        this.dragDropManager.setupClipMatrixDragDrop();
        this.dragDropManager.setupLayerDragDrop();
      }, 500); // Wait for DOM to be ready
      
      // Phase 6: Start performance monitoring
      this.performanceMonitor.start();
      
      // Phase 6: Setup keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        const action = this.keyboardShortcutManager.handleKeyEvent(e);
        if (action) {
          this.handleShortcutAction(action);
        }
      });
      
      console.log('✓WavJe Application initialized');
    } catch (error) {
      console.error('✗ WavJe initialization failed:', error);
      throw error;
    }
  }

  handleShortcutAction(action) {
    switch (action) {
      case 'playPause':
        this.togglePlayback();
        break;
      case 'stop':
        this.stopAll();
        break;
      case 'record':
        this.toggleRecording();
        break;
      case 'save':
        this.saveSession();
        break;
      case 'open':
        this.openSession();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'debug':
        this.toggleDebugMode();
        break;
      case 'deckA':
        this.selectDeck('A');
        break;
      case 'deckB':
        this.selectDeck('B');
        break;
      case 'crossfaderUp':
        this.adjustCrossfader(0.05);
        break;
      case 'crossfaderDown':
        this.adjustCrossfader(-0.05);
        break;
      case 'increaseBPM':
        this.adjustBPM(1);
        break;
      case 'decreaseBPM':
        this.adjustBPM(-1);
        break;
      default:
        console.log(`Unhandled shortcut action: ${action}`);
    }
  }

  togglePlayback() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggleRecording() {
    if (this.videoRecorder.isRecording) {
      this.videoRecorder.stopRecording();
    } else {
      this.videoRecorder.startRecording(60);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  toggleDebugMode() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  focusLayer(deck, index) {
    // Update focused layer state
    this.focusedLayer = { deck, index };
    
    // Update visual feedback
    document.querySelectorAll('.layer-slot').forEach(slot => {
      slot.classList.remove('layer-focused');
    });
    
    const targetSlot = document.querySelector(`.layer-slot[data-deck="${deck}"][data-layer="${index}"]`);
    if (targetSlot) {
      targetSlot.classList.add('layer-focused');
    }
    
    console.log(`Focused: Deck ${deck}, Layer ${index}`);
  }

  selectDeck(deckId) {
    this.currentDeck = deckId === 'A' ? this.deckA : this.deckB;
    console.log(`Selected Deck ${deckId}`);
  }

  adjustCrossfader(delta) {
    const current = this.mixer.getCrossfader();
    this.mixer.setCrossfader(Math.max(0, Math.min(1, current + delta)));
  }

  adjustBPM(delta) {
    this.config.bpm = Math.max(20, Math.min(300, this.config.bpm + delta));
    console.log(`BPM: ${this.config.bpm}`);
  }

  setupUI() {
    const t = (key) => this.languageManager.t(key);

    // === Initialize Clip Grid (3x11 = 33 clips) ===
    const clipGrid = document.getElementById('clip-grid');
    for (let i = 0; i < 33; i++) {
      const cell = document.createElement('div');
      cell.className = 'clip-cell';
      cell.dataset.clipIndex = i;

      // Top: Load + Gen buttons (always visible)
      const topButtons = document.createElement('div');
      topButtons.className = 'clip-top-buttons';

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.className = 'clip-button';
      loadBtn.onclick = (e) => {
        e.stopPropagation();
        this.loadClip(i);
      };

      const genBtn = document.createElement('button');
      genBtn.textContent = 'Gen';
      genBtn.className = 'clip-button';
      genBtn.onclick = (e) => {
        e.stopPropagation();
        this.generateClip(i);
      };

      topButtons.appendChild(loadBtn);
      topButtons.appendChild(genBtn);
      cell.appendChild(topButtons);

      // Middle: Thumbnail area (always visible)
      const thumbArea = document.createElement('div');
      thumbArea.className = 'clip-thumb-area';

      const previewCanvas = document.createElement('canvas');
      previewCanvas.className = 'clip-preview';
      previewCanvas.width = 160;
      previewCanvas.height = 90;
      thumbArea.appendChild(previewCanvas);
      cell.appendChild(thumbArea);

      // FX button: opens inspector for this clip
      const fxBtn = document.createElement('button');
      fxBtn.textContent = 'FX';
      fxBtn.className = 'clip-fx-btn';
      fxBtn.onclick = (e) => {
        e.stopPropagation();
        const row = Math.floor(i / 11);
        const col = i % 11;
        this.selectClip(row, col);
        // Visual feedback
        document.querySelectorAll('.clip-cell').forEach(c => {
          c.style.border = '1px solid #333';
        });
        cell.style.border = '2px solid #00aaff';
        // Scroll inspector into view
        const inspector = document.getElementById('inspector-panel');
        if (inspector) inspector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      cell.appendChild(fxBtn);

      // Bottom: Select button (always visible)
      const selectBtn = document.createElement('button');
      selectBtn.textContent = 'SELECT';
      selectBtn.className = 'clip-select-btn';
      selectBtn.onclick = (e) => {
        e.stopPropagation();
        const row = Math.floor(i / 11);
        const col = i % 11;
        const clip = this.clipMatrix.getClip(row, col);
        if (!clip || clip.type === 'empty') {
          this.resetFocusedLayer();
        } else {
          this.loadClipToFocusedLayer(row, col);
        }
      };
      cell.appendChild(selectBtn);

      clipGrid.appendChild(cell);
    }

    // === Transport Panel ===
    this.setupTransportPanel();

    // === Waveform Panel ===
    this.setupWaveformPanel();

    // === Deck Controls ===
    this.setupDeckControls();

    // === Composition Settings ===
    this.setupCompositionSettings();

    // === Device Settings ===
    this.setupDeviceSettings();

    // === Project Management ===
    this.setupProjectManagement();
    
    // Set initial focused layer
    this.focusLayer('A', 0);
  }

  setupTransportPanel() {
    const t = (key) => this.languageManager.t(key);
    const transportPanel = document.getElementById('transport-panel');

    // FPS Display
    const fpsDisplay = document.createElement('span');
    fpsDisplay.id = 'fps-display';
    fpsDisplay.textContent = `${t('fps')} 0`;
    transportPanel.appendChild(fpsDisplay);
    this.fpsDisplay = fpsDisplay;

    // Time Display
    const timeDisplay = document.createElement('span');
    timeDisplay.id = 'time-display';
    timeDisplay.textContent = '00:00:00';
    transportPanel.appendChild(timeDisplay);
    this.timeDisplay = timeDisplay;
    
    // Rewind Button (Restart from beginning)
    const rewindBtn = document.createElement('button');
    rewindBtn.textContent = '|◁';
    rewindBtn.title = '最初から再生';
    rewindBtn.onclick = () => {
      if (this.audioEngine.audioMode === 'file') {
        this.audioEngine.seekAudioFile(0);
        console.log('✓Rewound to start');
      }
    };
    transportPanel.appendChild(rewindBtn);

    // Play Button
    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ ' + t('play');
    playBtn.onclick = () => {
      console.log(`Play clicked - Audio mode: ${this.audioEngine.audioMode}`);
      this.play();
      if (this.audioEngine.audioMode === 'file') {
        this.audioEngine.playAudioFile();
      }
    };
    transportPanel.appendChild(playBtn);

    // Pause Button
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = '⏸ ' + t('pause');
    pauseBtn.onclick = () => {
      this.pause();
      if (this.audioEngine.audioMode === 'file') {
        this.audioEngine.pauseAudioFile();
      }
    };
    transportPanel.appendChild(pauseBtn);

    // Stop Button
    const stopBtn = document.createElement('button');
    stopBtn.textContent = '⏹ ' + t('stop');
    stopBtn.onclick = () => {
      this.stop();
      if (this.audioEngine.audioMode === 'file') {
        this.audioEngine.stopAudioFile();
      }
    };
    transportPanel.appendChild(stopBtn);

    // Load Audio Button (always visible, right of Stop)
    const loadAudioBtn = document.createElement('button');
    loadAudioBtn.textContent = t('loadAudio');
    loadAudioBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          await this.loadAudioFile(file);
          this.drawWaveform();
        }
      };
      input.click();
    };
    transportPanel.appendChild(loadAudioBtn);
    this.loadAudioBtn = loadAudioBtn;

    // Loop Button
    const loopBtn = document.createElement('button');
    loopBtn.textContent = '🔁 Loop';
    loopBtn.title = 'ループ再生切り替え';
    loopBtn.style.backgroundColor = '#333';
    loopBtn.onclick = () => {
      const player = this.audioEngine.audioFilePlayer;
      if (!player) return;
      player.setLoop(!player.loop);
      loopBtn.style.backgroundColor = player.loop ? '#005500' : '#333';
      loopBtn.style.borderColor = player.loop ? '#00ff00' : '';
    };
    transportPanel.appendChild(loopBtn);
    this.loopBtn = loopBtn;

    // MIDI Rescan Button
    const midiRescanBtn = document.createElement('button');
    midiRescanBtn.textContent = '🎹 MIDI Rescan';
    midiRescanBtn.title = '仮想MIDIデバイスを再スキャン';
    midiRescanBtn.style.backgroundColor = '#222244';
    midiRescanBtn.onclick = async () => {
      midiRescanBtn.textContent = '...';
      midiRescanBtn.disabled = true;
      if (this.midiController) {
        await this.midiController.rescan();
        this.midiController.updateDeviceList();
        const count = this.midiController.getDevices().length;
        console.log(`✓ MIDI rescan complete: ${count} device(s)`);
      }
      midiRescanBtn.textContent = '🎹 MIDI Rescan';
      midiRescanBtn.disabled = false;
    };
    transportPanel.appendChild(midiRescanBtn);
  }

  setupWaveformPanel() {
    const t = (key) => this.languageManager.t(key);
    const waveformPanel = document.getElementById('waveform-panel');

    // Waveform canvas for audio visualization
    const waveformCanvas = document.createElement('canvas');
    waveformCanvas.id = 'waveform-canvas';
    waveformCanvas.style.width = '100%';
    waveformCanvas.style.height = '100%';
    waveformCanvas.style.display = 'none';
    waveformCanvas.style.cursor = 'pointer';
    waveformCanvas.title = 'クリックして再生位置を変更';
    waveformPanel.appendChild(waveformCanvas);
    
    // Click on waveform to seek
    waveformCanvas.addEventListener('click', (e) => {
      e.stopPropagation();
      const duration = this.audioEngine.getAudioFileDuration();
      if (this.audioEngine.audioMode === 'file' && duration > 0) {
        // e.offsetX is relative to the element's rendered width (CSS size)
        const percentage = e.offsetX / waveformCanvas.offsetWidth;
        const seekTime = Math.max(0, Math.min(duration, percentage * duration));
        this.audioEngine.seekAudioFile(seekTime);
        this.drawWaveform();
        console.log(`✓Seeked to ${seekTime.toFixed(2)}s (${(percentage * 100).toFixed(1)}%)`);
      }
    });

    // Click on panel to reload (when no waveform)
    waveformPanel.onclick = (e) => {
      if (e.target === waveformPanel) {
        this.loadAudioBtn && this.loadAudioBtn.click();
      }
    };
  }

  setupDeckControls() {
    const t = (key) => this.languageManager.t(key);
    const deckControls = document.getElementById('deck-controls');

    // Language Toggle
    const langBtn = document.createElement('button');
    langBtn.textContent = `${t('language')}: ${this.languageManager.getCurrentLanguage().toUpperCase()}`;
    langBtn.onclick = () => {
      const current = this.languageManager.getCurrentLanguage();
      const newLang = current === 'en' ? 'ja' : 'en';
      this.languageManager.setLanguage(newLang);
      this.rebuildUI();
    };
    langBtn.style.width = '100%';
    langBtn.style.marginBottom = '15px';
    langBtn.style.backgroundColor = '#0066cc';
    deckControls.appendChild(langBtn);

    // Deck A Section
    const deckATitle = document.createElement('div');
    deckATitle.className = 'panel-title';
    deckATitle.textContent = 'DECK A';
    deckATitle.style.marginTop = '10px';
    deckControls.appendChild(deckATitle);

    // Deck A Layers
    for (let i = 0; i < 3; i++) {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'control-group layer-slot';
      layerDiv.dataset.deck = 'A';
      layerDiv.dataset.layer = i;
      layerDiv.style.border = '1px solid #333';
      layerDiv.style.padding = '8px';
      layerDiv.style.marginBottom = '8px';
      layerDiv.style.borderRadius = '4px';
      layerDiv.style.cursor = 'pointer';
      layerDiv.style.display = 'flex';
      layerDiv.style.gap = '8px';
      
      // Add click handler for layer focus
      layerDiv.addEventListener('click', (e) => {
        // Avoid triggering on input/select elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        this.focusLayer('A', i);
      });
      
      // Left side: Controls
      const controlsDiv = document.createElement('div');
      controlsDiv.style.flex = '1';
      
      const layerTitle = document.createElement('div');
      layerTitle.textContent = `Layer ${i}`;
      layerTitle.style.fontWeight = 'bold';
      layerTitle.style.marginBottom = '5px';
      layerTitle.style.color = '#00ff00';
      controlsDiv.appendChild(layerTitle);
      
      const opacityLabel = document.createElement('label');
      opacityLabel.innerHTML = `
        Opacity:
        <input type="range" min="0" max="100" value="100" style="width: calc(100% - 60px);"
               onchange="window.wavje.deckA.getLayer(${i}).setOpacity(this.value/100)">
      `;
      controlsDiv.appendChild(opacityLabel);
      
      const blendLabel = document.createElement('label');
      blendLabel.style.marginTop = '5px';
      blendLabel.style.display = 'block';
      blendLabel.innerHTML = `
        Blend:
        <select onchange="window.wavje.deckA.getLayer(${i}).setBlendMode(this.value)" style="width: calc(100% - 50px);">
          <option value="normal">Normal</option>
          <option value="add">Add</option>
          <option value="screen">Screen</option>
          <option value="multiply">Multiply</option>
        </select>
      `;
      controlsDiv.appendChild(blendLabel);
      
      layerDiv.appendChild(controlsDiv);
      
      // Right side: Thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'layer-thumbnail';
      thumbCanvas.width = 60;
      thumbCanvas.height = 45;
      thumbCanvas.style.width = '60px';
      thumbCanvas.style.height = '45px';
      thumbCanvas.style.border = '1px solid #444';
      thumbCanvas.style.borderRadius = '2px';
      thumbCanvas.style.backgroundColor = '#111';
      thumbCanvas.dataset.deck = 'A';
      thumbCanvas.dataset.layer = i;
      layerDiv.appendChild(thumbCanvas);
      
      deckControls.appendChild(layerDiv);
    }

    // Deck B Section
    const deckBTitle = document.createElement('div');
    deckBTitle.className = 'panel-title';
    deckBTitle.textContent = 'DECK B';
    deckBTitle.style.marginTop = '20px';
    deckControls.appendChild(deckBTitle);

    // Deck B Layers
    for (let i = 0; i < 3; i++) {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'control-group layer-slot';
      layerDiv.dataset.deck = 'B';
      layerDiv.dataset.layer = i;
      layerDiv.style.border = '1px solid #333';
      layerDiv.style.padding = '8px';
      layerDiv.style.marginBottom = '8px';
      layerDiv.style.borderRadius = '4px';
      layerDiv.style.cursor = 'pointer';
      layerDiv.style.display = 'flex';
      layerDiv.style.gap = '8px';
      
      // Add click handler for layer focus
      layerDiv.addEventListener('click', (e) => {
        // Avoid triggering on input/select elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        this.focusLayer('B', i);
      });
      
      // Left side: Controls
      const controlsDiv = document.createElement('div');
      controlsDiv.style.flex = '1';
      
      const layerTitle = document.createElement('div');
      layerTitle.textContent = `Layer ${i}`;
      layerTitle.style.fontWeight = 'bold';
      layerTitle.style.marginBottom = '5px';
      layerTitle.style.color = '#00ff00';
      controlsDiv.appendChild(layerTitle);
      
      const opacityLabel = document.createElement('label');
      opacityLabel.innerHTML = `
        Opacity:
        <input type="range" min="0" max="100" value="100" style="width: calc(100% - 60px);"
               onchange="window.wavje.deckB.getLayer(${i}).setOpacity(this.value/100)">
      `;
      controlsDiv.appendChild(opacityLabel);
      
      const blendLabel = document.createElement('label');
      blendLabel.style.marginTop = '5px';
      blendLabel.style.display = 'block';
      blendLabel.innerHTML = `
        Blend:
        <select onchange="window.wavje.deckB.getLayer(${i}).setBlendMode(this.value)" style="width: calc(100% - 50px);">
          <option value="normal">Normal</option>
          <option value="add">Add</option>
          <option value="screen">Screen</option>
          <option value="multiply">Multiply</option>
        </select>
      `;
      controlsDiv.appendChild(blendLabel);
      
      layerDiv.appendChild(controlsDiv);
      
      // Right side: Thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'layer-thumbnail';
      thumbCanvas.width = 60;
      thumbCanvas.height = 45;
      thumbCanvas.style.width = '60px';
      thumbCanvas.style.height = '45px';
      thumbCanvas.style.border = '1px solid #444';
      thumbCanvas.style.borderRadius = '2px';
      thumbCanvas.style.backgroundColor = '#111';
      thumbCanvas.dataset.deck = 'B';
      thumbCanvas.dataset.layer = i;
      layerDiv.appendChild(thumbCanvas);
      
      deckControls.appendChild(layerDiv);
    }

    // Crossfader
    const crossfaderTitle = document.createElement('div');
    crossfaderTitle.className = 'panel-title';
    crossfaderTitle.textContent = 'CROSSFADER';
    crossfaderTitle.style.marginTop = '20px';
    deckControls.appendChild(crossfaderTitle);

    const crossfaderDiv = document.createElement('div');
    crossfaderDiv.className = 'control-group';
    const cfLabel = document.createElement('label');
    cfLabel.style.display = 'flex';
    cfLabel.style.flexDirection = 'column';
    cfLabel.style.alignItems = 'stretch';
    const cfSpan = document.createElement('span');
    cfSpan.textContent = 'A ← → B';
    const cfSlider = document.createElement('input');
    cfSlider.type = 'range';
    cfSlider.min = '0';
    cfSlider.max = '100';
    cfSlider.value = '50';
    cfSlider.style.width = '100%';
    cfSlider.oninput = (e) => {
      const value = parseFloat(e.target.value) / 100;
      this.mixer.setCrossfader(value);
      console.log(`✓Crossfader: ${value.toFixed(2)} (A: ${((1-value)*100).toFixed(0)}%, B: ${(value*100).toFixed(0)}%)`);
    };
    cfLabel.appendChild(cfSpan);
    cfLabel.appendChild(cfSlider);
    crossfaderDiv.appendChild(cfLabel);
    deckControls.appendChild(crossfaderDiv);
  }

  setupCompositionSettings() {
    const t = (key) => this.languageManager.t(key);
    const compControls = document.getElementById('comp-controls');
    compControls.innerHTML = ''; // Clear existing content

    // Master Opacity Slider
    const opacityDiv = document.createElement('div');
    opacityDiv.className = 'control-group';
    opacityDiv.style.marginBottom = '12px';
    const opacityLabel = document.createElement('label');
    opacityLabel.style.display = 'block';
    opacityLabel.style.marginBottom = '4px';
    opacityLabel.textContent = '透明度 (Master Opacity):';
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '100';
    opacitySlider.value = '100';
    opacitySlider.style.width = '100%';
    const opacityValue = document.createElement('span');
    opacityValue.textContent = '100%';
    opacityValue.style.marginLeft = '8px';
    opacitySlider.oninput = (e) => {
      const val = e.target.value;
      opacityValue.textContent = val + '%';
      if (this.mixer) {
        this.mixer.setMasterOpacity(val / 100);
      }
    };
    opacityDiv.appendChild(opacityLabel);
    opacityDiv.appendChild(opacitySlider);
    opacityDiv.appendChild(opacityValue);
    compControls.appendChild(opacityDiv);

    // Resolution Selector
    const resDiv = document.createElement('div');
    resDiv.className = 'control-group';
    resDiv.style.marginBottom = '12px';
    const resLabel = document.createElement('label');
    resLabel.style.display = 'block';
    resLabel.style.marginBottom = '4px';
    resLabel.textContent = '解像度 (Resolution):';
    const resSelect = document.createElement('select');
    resSelect.style.width = '100%';
    resSelect.style.padding = '4px';
    const resOptions = [
      { value: '640x480', label: 'SD (640x480)' },
      { value: '1280x720', label: 'HD (1280x720)' },
      { value: '1920x1080', label: 'FHD (1920x1080)', selected: true },
      { value: '3840x2160', label: '4K (3840x2160)' }
    ];
    resOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.selected) option.selected = true;
      resSelect.appendChild(option);
    });
    resSelect.onchange = (e) => {
      const [width, height] = e.target.value.split('x').map(v => parseInt(v));
      if (this.renderEngine) {
        this.renderEngine.setResolution(width, height);
        console.log(`✓Resolution set to ${width}x${height}`);
      }
    };
    resDiv.appendChild(resLabel);
    resDiv.appendChild(resSelect);
    compControls.appendChild(resDiv);

    // Camera Controls
    const cameraTitle = document.createElement('div');
    cameraTitle.style.marginTop = '15px';
    cameraTitle.style.marginBottom = '8px';
    cameraTitle.style.fontWeight = 'bold';
    cameraTitle.textContent = 'カメラ位置 (Camera Position):';
    compControls.appendChild(cameraTitle);

    // Camera X
    const camXDiv = document.createElement('div');
    camXDiv.className = 'control-group';
    camXDiv.style.marginBottom = '8px';
    const camXLabel = document.createElement('label');
    camXLabel.style.display = 'block';
    camXLabel.style.marginBottom = '4px';
    camXLabel.textContent = 'X: ';
    const camXValue = document.createElement('span');
    camXValue.textContent = '0.00';
    camXLabel.appendChild(camXValue);
    const camXSlider = document.createElement('input');
    camXSlider.type = 'range';
    camXSlider.min = '-20';
    camXSlider.max = '20';
    camXSlider.value = '0';
    camXSlider.step = '0.1';
    camXSlider.style.width = '100%';
    camXSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      camXValue.textContent = val.toFixed(2);
      if (this.renderEngine && this.renderEngine.camera && this.renderEngine.cameraController) {
        this.renderEngine.cameraController.setBasePosition(val, this.renderEngine.cameraController.basePosition.y, this.renderEngine.cameraController.basePosition.z);
        this.renderEngine.camera.position.x = val;
        console.log(`Camera X: ${val}`);
      }
    };
    camXDiv.appendChild(camXLabel);
    camXDiv.appendChild(camXSlider);
    compControls.appendChild(camXDiv);

    // Camera Y
    const camYDiv = document.createElement('div');
    camYDiv.className = 'control-group';
    camYDiv.style.marginBottom = '8px';
    const camYLabel = document.createElement('label');
    camYLabel.style.display = 'block';
    camYLabel.style.marginBottom = '4px';
    camYLabel.textContent = 'Y: ';
    const camYValue = document.createElement('span');
    camYValue.textContent = '0.00';
    camYLabel.appendChild(camYValue);
    const camYSlider = document.createElement('input');
    camYSlider.type = 'range';
    camYSlider.min = '-20';
    camYSlider.max = '20';
    camYSlider.value = '0';
    camYSlider.step = '0.1';
    camYSlider.style.width = '100%';
    camYSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      camYValue.textContent = val.toFixed(2);
      if (this.renderEngine && this.renderEngine.camera && this.renderEngine.cameraController) {
        this.renderEngine.cameraController.setBasePosition(this.renderEngine.cameraController.basePosition.x, val, this.renderEngine.cameraController.basePosition.z);
        this.renderEngine.camera.position.y = val;
        console.log(`Camera Y: ${val}`);
      }
    };
    camYDiv.appendChild(camYLabel);
    camYDiv.appendChild(camYSlider);
    compControls.appendChild(camYDiv);

    // Camera Z (Zoom) with logarithmic scaling
    const camZDiv = document.createElement('div');
    camZDiv.className = 'control-group';
    camZDiv.style.marginBottom = '8px';
    const camZLabel = document.createElement('label');
    camZLabel.style.display = 'block';
    camZLabel.style.marginBottom = '4px';
    camZLabel.textContent = 'Z (Zoom): ';
    const camZValue = document.createElement('span');
    camZValue.textContent = '10.00';
    camZLabel.appendChild(camZValue);
    const camZSlider = document.createElement('input');
    camZSlider.type = 'range';
    camZSlider.min = '0'; // Represents 0.01
    camZSlider.max = '100'; // Represents 50
    camZSlider.value = '50'; // Represents 10
    camZSlider.step = '0.1';
    camZSlider.style.width = '100%';
    camZSlider.oninput = (e) => {
      const sliderVal = parseFloat(e.target.value);
      // Logarithmic scaling: 0->0.01, 50->10, 100->50
      const zVal = sliderVal <= 50 
        ? 0.01 + (sliderVal / 50) * 9.99 // 0-50 slider -> 0.01-10 camera
        : 10 + ((sliderVal - 50) / 50) * 40; // 50-100 slider -> 10-50 camera
      camZValue.textContent = zVal.toFixed(2);
      if (this.renderEngine && this.renderEngine.camera && this.renderEngine.cameraController) {
        this.renderEngine.cameraController.setBasePosition(this.renderEngine.cameraController.basePosition.x, this.renderEngine.cameraController.basePosition.y, zVal);
        this.renderEngine.camera.position.z = zVal;
        console.log(`Camera Z: ${zVal}`);
      }
    };
    camZDiv.appendChild(camZLabel);
    camZDiv.appendChild(camZSlider);
    compControls.appendChild(camZDiv);

    // Camera Reset Button
    const camResetBtn = document.createElement('button');
    camResetBtn.textContent = 'カメラリセット (Reset Camera)';
    camResetBtn.style.width = '100%';
    camResetBtn.style.padding = '6px';
    camResetBtn.style.marginBottom = '12px';
    camResetBtn.style.backgroundColor = '#444';
    camResetBtn.onclick = () => {
      if (this.renderEngine && this.renderEngine.camera && this.renderEngine.cameraController) {
        this.renderEngine.cameraController.setBasePosition(0, 0, 10);
        this.renderEngine.camera.position.set(0, 0, 10);
        this.renderEngine.camera.lookAt(0, 0, 0);
        camXSlider.value = '0';
        camXValue.textContent = '0.00';
        camYSlider.value = '0';
        camYValue.textContent = '0.00';
        camZSlider.value = '50';
        camZValue.textContent = '10.00';
        console.log('✓Camera reset to default position (0, 0, 10)');
      }
    };
    compControls.appendChild(camResetBtn);

    // Speed Multiplier
    const speedDiv = document.createElement('div');
    speedDiv.className = 'control-group';
    speedDiv.style.marginBottom = '12px';
    const speedLabel = document.createElement('label');
    speedLabel.style.display = 'block';
    speedLabel.style.marginBottom = '4px';
    speedLabel.textContent = 'スピード倍率 (Speed Multiplier):';
    const speedSelect = document.createElement('select');
    speedSelect.style.width = '100%';
    speedSelect.style.padding = '4px';
    const speedOptions = [
      { value: '0.25', label: '0.25x' },
      { value: '0.5', label: '0.5x' },
      { value: '1.0', label: '1.0x (Normal)', selected: true },
      { value: '2.0', label: '2.0x' },
      { value: '4.0', label: '4.0x' }
    ];
    speedOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.selected) option.selected = true;
      speedSelect.appendChild(option);
    });
    speedSelect.onchange = (e) => {
      const speed = parseFloat(e.target.value);
      this.config.targetFPS = 60 * speed;
      console.log(`✓Speed multiplier set to ${speed}x`);
    };
    speedDiv.appendChild(speedLabel);
    speedDiv.appendChild(speedSelect);
    compControls.appendChild(speedDiv);
  }

  setupDeviceSettings() {
    const t = (key) => this.languageManager.t(key);
    const deviceControls = document.getElementById('device-controls');
    
    // Video Output Window Button
    const videoOutputBtn = document.createElement('button');
    videoOutputBtn.textContent = '🖥️ 新規映像出力';
    videoOutputBtn.style.width = '100%';
    videoOutputBtn.style.marginBottom = '15px';
    videoOutputBtn.style.padding = '12px';
    videoOutputBtn.style.backgroundColor = '#0066cc';
    videoOutputBtn.onclick = () => this.openVideoOutputWindow();
    deviceControls.appendChild(videoOutputBtn);

    // Audio Output
    const audioOutDiv = document.createElement('div');
    audioOutDiv.className = 'control-group';
    audioOutDiv.innerHTML = `
      <label>
        Audio Output:
        <select id="audio-output-select">
          <option>Default</option>
        </select>
      </label>
    `;
    deviceControls.appendChild(audioOutDiv);

    // Audio Input
    const audioInDiv = document.createElement('div');
    audioInDiv.className = 'control-group';
    audioInDiv.innerHTML = `
      <label>
        Audio Input:
        <select id="audio-input-select">
          <option>Default Microphone</option>
        </select>
      </label>
    `;
    deviceControls.appendChild(audioInDiv);

    // MIDI Input
    const midiDiv = document.createElement('div');
    midiDiv.className = 'control-group';
    const midiLabel = document.createElement('label');
    midiLabel.textContent = 'MIDI Input: ';
    const midiSelect = document.createElement('select');
    midiSelect.id = 'midi-input-select';
    const noMidi = document.createElement('option');
    noMidi.textContent = 'No MIDI';
    noMidi.value = '';
    midiSelect.appendChild(noMidi);
    midiLabel.appendChild(midiSelect);
    midiDiv.appendChild(midiLabel);
    deviceControls.appendChild(midiDiv);
    this.midiSelect = midiSelect;

    // Wire up change handler immediately (survives innerHTML rebuilds in updateDeviceList)
    midiSelect.onchange = (e) => {
      if (e.target.value) {
        this.midiController.selectDevice(e.target.value);
      }
    };

    // Populate MIDI devices (deferred so MIDI init has time to complete)
    setTimeout(() => {
      this.midiController.updateDeviceList();
    }, 500);

    // ── MIDI Bridge (WMS対応 / loopMIDI代替) ───────────────────────────
    const bridgeDiv = document.createElement('div');
    bridgeDiv.className = 'control-group';
    bridgeDiv.style.marginTop = '14px';
    bridgeDiv.style.padding = '10px';
    bridgeDiv.style.border = '1px solid #334';
    bridgeDiv.style.borderRadius = '6px';
    bridgeDiv.style.backgroundColor = '#0d0d1a';

    const bridgeTitle = document.createElement('div');
    bridgeTitle.textContent = '🔌 MIDI Bridge (WMS対応)';
    bridgeTitle.style.fontWeight = 'bold';
    bridgeTitle.style.marginBottom = '6px';
    bridgeTitle.style.fontSize = '12px';
    bridgeTitle.style.color = '#aac';
    bridgeDiv.appendChild(bridgeTitle);

    const bridgeHint = document.createElement('div');
    bridgeHint.style.fontSize = '10px';
    bridgeHint.style.color = '#667';
    bridgeHint.style.marginBottom = '8px';
    bridgeHint.textContent = 'loopMIDIが見えない場合: npm run bridge を実行してから接続';
    bridgeDiv.appendChild(bridgeHint);

    // ステータス
    const bridgeStatus = document.createElement('div');
    bridgeStatus.id = 'midi-bridge-status';
    bridgeStatus.textContent = '⚫ 未接続';
    bridgeStatus.style.fontSize = '11px';
    bridgeStatus.style.marginBottom = '8px';
    bridgeDiv.appendChild(bridgeStatus);

    // 接続 URL 入力
    const urlRow = document.createElement('div');
    urlRow.style.display = 'flex';
    urlRow.style.gap = '4px';
    urlRow.style.marginBottom = '6px';
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = 'ws://localhost:9001';
    urlInput.style.flex = '1';
    urlInput.style.fontSize = '11px';
    urlInput.style.padding = '3px 6px';
    urlInput.style.backgroundColor = '#111';
    urlInput.style.color = '#ccc';
    urlInput.style.border = '1px solid #444';
    urlInput.style.borderRadius = '3px';
    const connectBtn = document.createElement('button');
    connectBtn.textContent = '接続';
    connectBtn.style.fontSize = '11px';
    connectBtn.style.padding = '3px 8px';
    connectBtn.onclick = () => {
      if (this.midiController.bridgeSocket &&
          this.midiController.bridgeSocket.readyState <= 1) {
        this.midiController.disconnectBridge();
        connectBtn.textContent = '接続';
      } else {
        this.midiController.connectBridge(urlInput.value.trim());
        connectBtn.textContent = '切断';
      }
    };
    urlRow.appendChild(urlInput);
    urlRow.appendChild(connectBtn);
    bridgeDiv.appendChild(urlRow);

    // 入力ポート選択
    const bridgeInLabel = document.createElement('label');
    bridgeInLabel.style.fontSize = '11px';
    bridgeInLabel.style.display = 'block';
    bridgeInLabel.style.marginBottom = '4px';
    bridgeInLabel.textContent = '受信ポート (MIDI→ブラウザ): ';
    const bridgeInSelect = document.createElement('select');
    bridgeInSelect.id = 'midi-bridge-input-select';
    bridgeInSelect.style.width = '100%';
    bridgeInSelect.style.fontSize = '11px';
    bridgeInSelect.innerHTML = '<option value="">-- 接続後に表示 --</option>';
    bridgeInLabel.appendChild(bridgeInSelect);
    bridgeDiv.appendChild(bridgeInLabel);

    // 出力ポート選択
    const bridgeOutLabel = document.createElement('label');
    bridgeOutLabel.style.fontSize = '11px';
    bridgeOutLabel.style.display = 'block';
    bridgeOutLabel.style.marginBottom = '4px';
    bridgeOutLabel.textContent = '送信ポート (ブラウザ→DAW): ';
    const bridgeOutSelect = document.createElement('select');
    bridgeOutSelect.id = 'midi-bridge-output-select';
    bridgeOutSelect.style.width = '100%';
    bridgeOutSelect.style.fontSize = '11px';
    bridgeOutSelect.innerHTML = '<option value="">-- 接続後に表示 --</option>';
    bridgeOutLabel.appendChild(bridgeOutSelect);
    bridgeDiv.appendChild(bridgeOutLabel);

    // 再スキャンボタン
    const bridgeRescanBtn = document.createElement('button');
    bridgeRescanBtn.textContent = '🔄 ポート再スキャン';
    bridgeRescanBtn.style.marginTop = '6px';
    bridgeRescanBtn.style.width = '100%';
    bridgeRescanBtn.style.fontSize = '11px';
    bridgeRescanBtn.onclick = () => this.midiController.rescanBridgePorts();
    bridgeDiv.appendChild(bridgeRescanBtn);

    deviceControls.appendChild(bridgeDiv);

    // BPM Detection
    const bpmDiv = document.createElement('div');
    bpmDiv.className = 'control-group';
    bpmDiv.style.marginTop = '20px';
    const bpmBtn = document.createElement('button');
    bpmBtn.textContent = t('beatDetect') + ' ' + t('off');
    bpmBtn.style.width = '100%';
    bpmBtn.onclick = () => {
      if (this.beatDetector.isEnabled) {
        this.beatDetector.disable();
        bpmBtn.textContent = t('beatDetect') + ' ' + t('off');
        bpmBtn.style.backgroundColor = '#1a1a1a';
      } else {
        this.beatDetector.enable();
        bpmBtn.textContent = t('beatDetect') + ' ' + t('on');
        bpmBtn.style.backgroundColor = '#006600';
      }
    };
    bpmDiv.appendChild(bpmBtn);
    deviceControls.appendChild(bpmDiv);
    this.beatDetectBtn = bpmBtn;

    // BPM Display
    const bpmDisplay = document.createElement('div');
    bpmDisplay.style.marginTop = '10px';
    bpmDisplay.style.padding = '10px';
    bpmDisplay.style.backgroundColor = '#0a0a0a';
    bpmDisplay.style.borderRadius = '4px';
    bpmDisplay.style.textAlign = 'center';
    bpmDisplay.style.fontFamily = 'Courier New, monospace';
    bpmDisplay.style.fontSize = '24px';
    bpmDisplay.style.color = '#00ff00';
    bpmDisplay.textContent = 'BPM: --';
    deviceControls.appendChild(bpmDisplay);
    this.bpmDisplay = bpmDisplay;
  }

  setupProjectManagement() {
    const t = (key) => this.languageManager.t(key);
    const projectControls = document.getElementById('project-controls');

    // Save Session
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Session';
    saveBtn.style.width = '100%';
    saveBtn.style.marginBottom = '10px';
    saveBtn.onclick = async () => {
      const name = prompt('Session name:', 'My Session');
      if (name) {
        await this.sessionManager.saveCurrentSession(name);
        alert('Session saved!');
      }
    };
    projectControls.appendChild(saveBtn);

    // Load Session
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Session';
    loadBtn.style.width = '100%';
    loadBtn.style.marginBottom = '20px';
    loadBtn.onclick = async () => {
      const sessions = await this.sessionManager.listSessions();
      if (sessions.length === 0) {
        alert('No saved sessions');
        return;
      }
      const sessionList = sessions.map((s, i) => `${i}: ${s.name}`).join('\n');
      const index = prompt('Select session:\n' + sessionList);
      if (index !== null && sessions[parseInt(index)]) {
        await this.sessionManager.loadSession(sessions[parseInt(index)].id);
        alert('Session loaded!');
      }
    };
    projectControls.appendChild(loadBtn);

    // Auto-save Toggle
    const autoSaveBtn = document.createElement('button');
    autoSaveBtn.textContent = t('autoSave') + ' ' + t('off');
    autoSaveBtn.style.width = '100%';
    autoSaveBtn.style.marginBottom = '10px';
    autoSaveBtn.onclick = () => {
      if (this.autoSaveManager.isEnabled) {
        this.autoSaveManager.disable();
        autoSaveBtn.textContent = t('autoSave') + ' ' + t('off');
        autoSaveBtn.style.backgroundColor = '#1a1a1a';
      } else {
        this.autoSaveManager.enable();
        autoSaveBtn.textContent = t('autoSave') + ' ' + t('on');
        autoSaveBtn.style.backgroundColor = '#006666';
      }
    };
    projectControls.appendChild(autoSaveBtn);

    // Auto-save Interval
    const intervalDiv = document.createElement('div');
    intervalDiv.className = 'control-group';
    intervalDiv.innerHTML = `
      <label>
        ${t('saveInterval')}
        <input type="number" min="1" max="60" value="5"
               onchange="this.parentApp.autoSaveManager.setInterval(this.value)">
      </label>
    `;
    projectControls.appendChild(intervalDiv);

    // Debug Mode
    const debugDiv = document.createElement('div');
    debugDiv.style.marginTop = '20px';
    const debugBtn = document.createElement('button');
    debugBtn.textContent = t('debug') + ' Mode: OFF';
    debugBtn.style.width = '100%';
    debugBtn.onclick = () => this.toggleDebugMode();
    debugDiv.appendChild(debugBtn);
    projectControls.appendChild(debugDiv);
    this.debugBtn = debugBtn;
    
    // === Preset Management (Medium Issue #7) ===
    const presetTitle = document.createElement('div');
    presetTitle.style.marginTop = '20px';
    presetTitle.style.fontWeight = 'bold';
    presetTitle.textContent = 'Effect Presets:';
    projectControls.appendChild(presetTitle);
    
    // Save Current Preset
    const savePresetBtn = document.createElement('button');
    savePresetBtn.textContent = '💾 Save Current Preset';
    savePresetBtn.style.width = '100%';
    savePresetBtn.style.marginTop = '5px';
    savePresetBtn.onclick = () => {
      const name = prompt('Preset name:');
      if (name && name.trim() !== '') {
        this.effectPresetManager.saveCustomPreset(
          name.trim(),
          this.deckA,
          this.deckB,
          this.mixer,
          this.effectManager
        );
        alert(`✓ Preset "${name}" saved successfully!`);
      }
    };
    projectControls.appendChild(savePresetBtn);
    
    // Export All Presets
    const exportPresetsBtn = document.createElement('button');
    exportPresetsBtn.textContent = '📤 Export All Presets';
    exportPresetsBtn.style.width = '100%';
    exportPresetsBtn.style.marginTop = '5px';
    exportPresetsBtn.onclick = () => {
      this.effectPresetManager.downloadPresetsFile();
    };
    projectControls.appendChild(exportPresetsBtn);
    
    // Import Presets
    const importPresetsBtn = document.createElement('button');
    importPresetsBtn.textContent = '📥 Import Presets';
    importPresetsBtn.style.width = '100%';
    importPresetsBtn.style.marginTop = '5px';
    importPresetsBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const text = await file.text();
            const count = this.effectPresetManager.importPresets(text);
            if (count > 0) {
              alert(`✓ Imported ${count} presets successfully!`);
              
              // Update Effect Settings UI
              this.setupEffectSettings();
            } else {
              alert('No valid presets found in file');
            }
          } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import presets: ' + error.message);
          }
        }
      };
      input.click();
    };
    projectControls.appendChild(importPresetsBtn);
    
    // Delete Preset
    const deletePresetBtn = document.createElement('button');
    deletePresetBtn.textContent = '🗑️ Delete Preset';
    deletePresetBtn.style.width = '100%';
    deletePresetBtn.style.marginTop = '5px';
    deletePresetBtn.style.backgroundColor = '#661a1a';
    deletePresetBtn.onclick = () => {
      const presets = Array.from(this.effectPresetManager.presets.keys());
      if (presets.length === 0) {
        alert('No presets to delete');
        return;
      }
      const list = presets.map((p, i) => `${i}: ${p}`).join('\n');
      const index = prompt('Select preset to delete:\n' + list);
      if (index !== null && presets[parseInt(index)]) {
        const name = presets[parseInt(index)];
        if (confirm(`Delete preset "${name}"?`)) {
          if (this.effectPresetManager.deletePreset(name)) {
            alert(`✓ Preset "${name}" deleted`);
            this.setupEffectSettings();
          }
        }
      }
    };
    projectControls.appendChild(deletePresetBtn);
    
    // Phase 6: Keyboard Shortcuts
    const shortcutsTitle = document.createElement('div');
    shortcutsTitle.style.marginTop = '20px';
    shortcutsTitle.style.fontWeight = 'bold';
    shortcutsTitle.textContent = 'Keyboard Shortcuts:';
    projectControls.appendChild(shortcutsTitle);
    
    const shortcutsBtn = document.createElement('button');
    shortcutsBtn.textContent = 'View Shortcuts';
    shortcutsBtn.style.width = '100%';
    shortcutsBtn.style.marginTop = '5px';
    shortcutsBtn.onclick = () => this.showKeyboardShortcuts();
    projectControls.appendChild(shortcutsBtn);
  }
  
  showKeyboardShortcuts() {
    const shortcuts = this.keyboardShortcutManager.shortcuts;
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    html += '<h3>Keyboard Shortcuts</h3>';
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #333;">Action</th><th style="text-align: left; padding: 8px; border-bottom: 1px solid #333;">Shortcut</th></tr>';
    
    for (const [key, action] of Object.entries(shortcuts)) {
      const keyParts = key.split('+');
      const displayKey = keyParts.map(k => {
        if (k === 'ctrl') return 'Ctrl';
        if (k === 'shift') return 'Shift';
        if (k === 'alt') return 'Alt';
        if (k === ' ') return 'Space';
        if (k === 'escape') return 'Esc';
        if (k === 'arrowup') return '↑';
        if (k === 'arrowdown') return '↓';
        if (k === 'arrowleft') return '←';
        if (k === 'arrowright') return '→';
        return k.toUpperCase();
      }).join(' + ');
      
      const actionName = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<tr><td style="padding: 8px; border-bottom: 1px solid #222;">${actionName}</td><td style="padding: 8px; border-bottom: 1px solid #222;">${displayKey}</td></tr>`;
    }
    
    html += '</table>';
    html += '<button onclick="document.getElementById(\'inspector-content\').innerHTML = \'<p style=&quot;color: #666;&quot;>Select a clip to view details</p>\';" style="margin-top: 10px; width: 100%;">Close</button>';
    html += '</div>';
    
    document.getElementById('inspector-content').innerHTML = html;
  }

  rebuildUI() {
    // Clear all control panels
    document.getElementById('deck-controls').innerHTML = '';
    document.getElementById('comp-controls').innerHTML = '';
    document.getElementById('device-controls').innerHTML = '';
    document.getElementById('project-controls').innerHTML = '';
    document.getElementById('transport-panel').innerHTML = '';
    
    // Rebuild
    this.setupTransportPanel();
    this.setupDeckControls();
    this.setupCompositionSettings();
    this.setupDeviceSettings();
    this.setupProjectManagement();
  }

  openOutputWindow() {
    const outputWindow = window.open('', 'WavJe Output', 'width=1920,height=1080');
    if (outputWindow) {
      outputWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WavJe Output</title>
          <style>
            body { margin: 0; padding: 0; background: #000; overflow: hidden; }
            canvas { display: block; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="output-canvas"></div>
        </body>
        </html>
      `);
      outputWindow.document.close();
      
      // Clone canvas to output window
      const outputDiv = outputWindow.document.getElementById('output-canvas');
      const clonedCanvas = this.renderEngine.renderer.domElement.cloneNode(true);
      clonedCanvas.width = 1920;
      clonedCanvas.height = 1080;
      outputDiv.appendChild(clonedCanvas);
      
      // Sync rendering (simplified)
      this.outputWindow = outputWindow;
      console.log('✓Output window opened');
    }
  }

  async loadClip(index) {
    const row = Math.floor(index / 11);
    const col = index % 11;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const videoClip = new VideoClip(file, file.name);
        this.clipMatrix.setClip(row, col, videoClip, 'video', file.name);
        const newClip1 = this.clipMatrix.getClip(row, col);
        if (newClip1) newClip1.effectManager = new EffectManager();
        
        // Update UI with preview
        const cell = document.querySelector(`[data-clip-index="${index}"]`);
        if (cell) {
          cell.style.backgroundColor = '#003300';
          cell.title = file.name;
          
          // Draw first frame to preview canvas
          const preview = cell.querySelector('.clip-preview');
          if (preview) {
            const video = videoClip.video;
            const drawFrame = () => {
              if (video.readyState >= 2) {
                const ctx = preview.getContext('2d');
                ctx.clearRect(0, 0, preview.width, preview.height);
                ctx.drawImage(video, 0, 0, preview.width, preview.height);
                console.log(`✓Thumbnail drawn for ${file.name}`);
              }
            };
            
            if (video.readyState >= 2) {
              drawFrame();
            } else {
              video.addEventListener('loadeddata', drawFrame, { once: true });
            }
          }
        }
        
        console.log(`✓Loaded video clip to [${row},${col}]: ${file.name}`);
      }
    };
    input.click();
  }

  generateClip(index) {
    const row = Math.floor(index / 11);
    const col = index % 11;
    
    // Phase 3: Expanded generator selection dialog
    const generators = [
      // Type A: Waveform & Line
      { id: 'oscilloscope', name: 'Oscilloscope', category: 'Waveform & Line' },
      { id: 'neon-string', name: 'Neon String', category: 'Waveform & Line' },
      { id: 'terrain-line', name: 'Terrain Line', category: 'Waveform & Line' },
      
      // Type B: Spectrum & Meter
      { id: 'circular-spectrum', name: 'Circular Spectrum', category: 'Spectrum & Meter' },
      { id: 'cityscape-bars', name: 'Cityscape Bars', category: 'Spectrum & Meter' },
      { id: 'fluid-spectrum', name: 'Fluid Spectrum', category: 'Spectrum & Meter' },
      
      // Type C: Geometry & Physics
      { id: 'dancing-cubes', name: 'Dancing Cubes', category: 'Geometry & Physics' },
      
      // Type D: Abstract & Particle
      { id: 'gaussian-ripples', name: 'Gaussian Ripples', category: 'Abstract & Particle' },
      { id: 'starfield-warp', name: 'Starfield Warp', category: 'Abstract & Particle' },
      { id: 'reaction-diffusion', name: 'Reaction Diffusion', category: 'Abstract & Particle' },
      
      // Type E: Camera Input
      { id: 'webcam', name: 'Webcam', category: 'Camera Input' }
    ];
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #00ff00;
      padding: 20px;
      z-index: 10000;
      min-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Generator';
    title.style.color = '#00ff00';
    title.style.marginTop = '0';
    dialog.appendChild(title);
    
    // Group by category
    const categories = [...new Set(generators.map(g => g.category))];
    categories.forEach(category => {
      const categoryTitle = document.createElement('div');
      categoryTitle.textContent = category;
      categoryTitle.style.cssText = `
        font-weight: bold;
        color: #00aaff;
        margin-top: 15px;
        margin-bottom: 8px;
        font-size: 13px;
      `;
      dialog.appendChild(categoryTitle);
      
      generators.filter(g => g.category === category).forEach(gen => {
        const btn = document.createElement('button');
        btn.textContent = gen.name;
        btn.style.cssText = `
          width: 100%;
          margin-bottom: 6px;
          padding: 10px;
          font-size: 14px;
          text-align: left;
        `;
        btn.onclick = () => {
          this.selectGenerator(row, col, gen.id, gen.name, index);
          document.body.removeChild(dialog);
        };
        dialog.appendChild(btn);
      });
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #333;
      margin-top: 15px;
    `;
    cancelBtn.onclick = () => document.body.removeChild(dialog);
    dialog.appendChild(cancelBtn);
    
    document.body.appendChild(dialog);
  }

  selectGenerator(row, col, genId, genName, index) {
    // Special handling for webcam
    if (genId === 'webcam') {
      this.selectWebcam(row, col, index);
      return;
    }
    
    // Phase 3: Create actual generator instance
    let generator = null;
    
    switch(genId) {
      case 'oscilloscope':
        generator = new OscilloscopeGenerator();
        break;
      case 'neon-string':
        generator = new NeonStringGenerator();
        break;
      case 'terrain-line':
        generator = new TerrainLineGenerator();
        break;
      case 'circular-spectrum':
        generator = new CircularSpectrumGenerator();
        break;
      case 'cityscape-bars':
        generator = new CityscapeBarsGenerator();
        break;
      case 'fluid-spectrum':
        generator = new FluidSpectrumGenerator();
        break;
      case 'dancing-cubes':
        generator = new DancingCubesGenerator();
        break;
      case 'gaussian-ripples':
        generator = new GaussianRipplesGenerator();
        break;
      case 'starfield-warp':
        generator = new StarfieldWarpGenerator();
        break;
      case 'reaction-diffusion':
        generator = new ReactionDiffusionGenerator();
        break;
      default:
        generator = new DancingCubesGenerator();
    }
    
    const genInfo = {
      id: genId,
      name: genName,
      type: 'generator',
      instance: generator
    };
    
    this.clipMatrix.setClip(row, col, genInfo, 'generator', genName);
    const newClip2 = this.clipMatrix.getClip(row, col);
    if (newClip2) newClip2.effectManager = new EffectManager();
    
    // Update UI with preview
    const cell = document.querySelector(`[data-clip-index="${index}"]`);
    if (cell) {
      cell.style.backgroundColor = '#330033';
      cell.title = genName;
      cell.dataset.generatorId = genId;
      
      // Draw generator label onto preview canvas
      const preview = cell.querySelector('.clip-preview');
      if (preview) {
        const ctx = preview.getContext('2d');
        const w = preview.width;
        const h = preview.height;
        
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a0033');
        grad.addColorStop(1, '#330055');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
        // Border
        ctx.strokeStyle = '#aa00ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        
        // "GEN" label
        ctx.fillStyle = '#aa00ff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GEN', w / 2, 16);
        
        // Generator name (word wrap if needed)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        const words = genName.split(' ');
        let line = '';
        let y = h / 2 - 4;
        words.forEach((word, idx) => {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > w - 8 && line) {
            ctx.fillText(line, w / 2, y);
            line = word;
            y += 14;
          } else {
            line = test;
          }
          if (idx === words.length - 1) ctx.fillText(line, w / 2, y);
        });
        
        // Category hint
        const gen = [
          { id: 'oscilloscope', category: 'Waveform' },
          { id: 'neon-string', category: 'Waveform' },
          { id: 'terrain-line', category: 'Waveform' },
          { id: 'circular-spectrum', category: 'Spectrum' },
          { id: 'cityscape-bars', category: 'Spectrum' },
          { id: 'fluid-spectrum', category: 'Spectrum' },
          { id: 'dancing-cubes', category: 'Geometry' },
          { id: 'gaussian-ripples', category: 'Abstract' },
          { id: 'starfield-warp', category: 'Abstract' },
          { id: 'reaction-diffusion', category: 'Abstract' },
        ].find(g => g.id === genId);
        if (gen) {
          ctx.fillStyle = '#00aaff';
          ctx.font = '9px Arial';
          ctx.fillText(gen.category, w / 2, h - 6);
        }
      }
    }
    
    console.log(`✓Set generator to [${row},${col}]: ${genName}`);
  }

  async selectWebcam(row, col, index) {
    try {
      // Get list of video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        alert('No webcam devices found');
        return;
      }
      
      // Create device selection dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        border: 2px solid #00ff00;
        padding: 20px;
        z-index: 10000;
        min-width: 400px;
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Select Webcam';
      title.style.color = '#00ff00';
      title.style.marginTop = '0';
      dialog.appendChild(title);
      
      videoDevices.forEach((device, idx) => {
        const btn = document.createElement('button');
        btn.textContent = device.label || `Camera ${idx + 1}`;
        btn.style.cssText = `
          width: 100%;
          margin-bottom: 8px;
          padding: 12px;
          text-align: left;
        `;
        btn.onclick = async () => {
          document.body.removeChild(dialog);
          await this.loadWebcam(row, col, index, device.deviceId);
        };
        dialog.appendChild(btn);
      });
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.width = '100%';
      cancelBtn.onclick = () => document.body.removeChild(dialog);
      dialog.appendChild(cancelBtn);
      
      document.body.appendChild(dialog);
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      alert('Failed to access webcam devices: ' + error.message);
    }
  }

  async loadWebcam(row, col, index, deviceId) {
    try {
      // Request webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Create video element from stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });
      
      const webcamInfo = {
        id: `webcam_${Date.now()}`,
        name: 'Webcam',
        type: 'webcam',
        content: video,
        stream: stream
      };
      
      this.clipMatrix.setClip(row, col, webcamInfo, 'webcam', 'Webcam');
      const newClip3 = this.clipMatrix.getClip(row, col);
      if (newClip3) newClip3.effectManager = new EffectManager();
      
      // Update UI
      const cell = document.querySelector(`[data-clip-index="${index}"]`);
      if (cell) {
        cell.style.backgroundColor = '#003333';
        cell.title = 'Webcam';
        
        const preview = cell.querySelector('.clip-preview');
        if (preview) {
          // Live webcam preview
          const ctx = preview.getContext('2d');
          const drawPreview = () => {
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
              ctx.drawImage(video, 0, 0, preview.width, preview.height);
            }
            requestAnimationFrame(drawPreview);
          };
          drawPreview();
        }
      }
      
      console.log(`✓Webcam loaded to [${row},${col}]`);
    } catch (error) {
      console.error('Failed to load webcam:', error);
      alert('Failed to access webcam: ' + error.message);
    }
  }

  selectClip(row, col) {
    const clip = this.clipMatrix.getClip(row, col);
    if (clip && clip.type !== 'empty') {
      this.selectedClip = clip;
      this.updateInspector();
    }
  }
  
  resetFocusedLayer() {
    const deck = this.focusedLayer.deck === 'A' ? this.deckA : this.deckB;
    const layer = deck.layers[this.focusedLayer.index];
    if (layer) {
      const deckGroup = this.focusedLayer.deck === 'A' ? this.renderEngine.deckA : this.renderEngine.deckB;
      if (layer.mesh && deckGroup) {
        deckGroup.remove(layer.mesh);
        if (layer.mesh.geometry) layer.mesh.geometry.dispose();
        if (layer.mesh.material) layer.mesh.material.dispose();
        layer.mesh = null;
      }
      layer.clearContent();
      // Clear thumbnail
      const thumbCanvas = document.querySelector(`.layer-thumbnail[data-deck="${this.focusedLayer.deck}"][data-layer="${this.focusedLayer.index}"]`);
      if (thumbCanvas) {
        const ctx = thumbCanvas.getContext('2d');
        ctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      console.log(`✓Layer reset: Deck ${this.focusedLayer.deck}, Layer ${this.focusedLayer.index}`);
    }
  }

  loadClipToFocusedLayer(row, col) {
    const clip = this.clipMatrix.getClip(row, col);
    if (!clip || clip.type === 'empty') {
      console.log('No clip to load');
      return;
    }
    
    const deck = this.focusedLayer.deck === 'A' ? this.deckA : this.deckB;
    const layer = deck.layers[this.focusedLayer.index];
    
    if (layer) {
      layer.setContent(clip.content, clip.type, clip);
      
      // Create mesh in deck group for rendering
      const deckGroup = this.focusedLayer.deck === 'A' ? this.renderEngine.deckA : this.renderEngine.deckB;
      if (deckGroup) {
        layer.createMesh(deckGroup);
      }
      
      // Auto-play video clips
      if (clip.type === 'video' && clip.content && clip.content.play) {
        clip.content.play();
        console.log(`✓Started video playback for layer ${this.focusedLayer.deck}-${this.focusedLayer.index}`);
      }
      
      // Update layer thumbnail
      this.updateLayerThumbnail(this.focusedLayer.deck, this.focusedLayer.index, clip);
      
      console.log(`Clip [${row},${col}] loaded to Deck ${this.focusedLayer.deck}, Layer ${this.focusedLayer.index}`);
    }
  }
  
  updateLayerThumbnail(deck, layerIndex, clip) {
    const thumbCanvas = document.querySelector(`.layer-thumbnail[data-deck="${deck}"][data-layer="${layerIndex}"]`);
    if (!thumbCanvas) return;
    
    const ctx = thumbCanvas.getContext('2d');
    ctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    
    if (clip.type === 'video' && clip.content && clip.content.video) {
      const video = clip.content.video;
      
      const drawThumb = () => {
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
          console.log(`✓Layer thumbnail updated: Deck ${deck}, Layer ${layerIndex}`);
        }
      };
      
      if (video.readyState >= 2) {
        drawThumb();
      } else {
        video.addEventListener('loadeddata', drawThumb, { once: true });
      }
    } else if (clip.type === 'generator') {
      // Draw generator name
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(clip.name.substring(0, 8), thumbCanvas.width / 2, thumbCanvas.height / 2);
    } else if (clip.type === 'webcam') {
      // Draw webcam label
      ctx.fillStyle = '#003333';
      ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CAM', thumbCanvas.width / 2, thumbCanvas.height / 2 + 4);
    }
  }

  updateInspector() {
    // Cancel previous slider sync loops
    if (this._inspectorSyncRAF) {
      cancelAnimationFrame(this._inspectorSyncRAF);
      this._inspectorSyncRAF = null;
    }
    if (this._inspectorEffectSyncRAF) {
      cancelAnimationFrame(this._inspectorEffectSyncRAF);
      this._inspectorEffectSyncRAF = null;
    }
    this._inspectorGenParamSliders = [];
    this._inspectorEffectParamSliders = [];

    const inspectorContent = document.getElementById('inspector-content');
    if (!inspectorContent) return;
    
    if (!this.selectedClip || this.selectedClip.type === 'empty') {
      inspectorContent.innerHTML = '<p style="color: #666;">Select a clip to view details</p>';
      return;
    }
    
    inspectorContent.innerHTML = '';
    
    const title = document.createElement('h3');
    title.style.color = '#00ff00';
    title.style.marginTop = '0';
    title.textContent = this.selectedClip.name || 'Untitled Clip';
    inspectorContent.appendChild(title);
    
    // Delete Clip Button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Delete Clip';
    deleteBtn.style.width = '100%';
    deleteBtn.style.marginBottom = '10px';
    deleteBtn.style.backgroundColor = '#660000';
    deleteBtn.style.padding = '8px';
    deleteBtn.onclick = () => {
      if (confirm(`Delete clip "${this.selectedClip.name}"?`)) {
        this.clipMatrix.clearClip(this.selectedClip.row, this.selectedClip.col);
        this.selectedClip = null;
        this.updateInspector();
        console.log('✓ Clip deleted');
      }
    };
    inspectorContent.appendChild(deleteBtn);
    
    const info = document.createElement('div');
    info.style.padding = '10px';
    info.style.backgroundColor = '#0a0a0a';
    info.style.borderRadius = '4px';
    info.style.marginBottom = '15px';
    
    if (this.selectedClip.type === 'video' && this.selectedClip.content) {
      const metadata = this.selectedClip.content.getMetadata();
      info.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>Type:</strong> Video Clip</div>
        <div style="margin-bottom: 5px;"><strong>Resolution:</strong> ${metadata.width}x${metadata.height}</div>
        <div style="margin-bottom: 5px;"><strong>Duration:</strong> ${metadata.duration.toFixed(2)}s</div>
        <div style="margin-bottom: 5px;"><strong>Current Time:</strong> ${metadata.currentTime.toFixed(2)}s</div>
        <div><strong>Status:</strong> ${metadata.isPlaying ? 'Playing' : 'Paused'}</div>
      `;
    } else if (this.selectedClip.type === 'generator') {
      // Phase 3: Generator info
      const genName = this.selectedClip.content?.name || this.selectedClip.name;
      const genId = this.selectedClip.content?.id || 'unknown';
      info.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>Type:</strong> Generator</div>
        <div style="margin-bottom: 5px;"><strong>Generator:</strong> ${genName}</div>
        <div style="margin-bottom:10px;"><strong>ID:</strong> ${genId}</div>
      `;

      // Generator parameter sliders
      const instance = this.selectedClip.content?.instance;
      if (instance && typeof instance.getParamDefs === 'function') {
        const paramDefs = instance.getParamDefs();
        if (paramDefs.length > 0) {
          const paramTitle = document.createElement('div');
          paramTitle.style.cssText = 'font-weight:bold;color:#ffaa00;margin-bottom:8px;border-top:1px solid #333;padding-top:8px;';
          paramTitle.textContent = 'Parameters';
          info.appendChild(paramTitle);

          paramDefs.forEach(def => {
            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom:10px;';

            const labelRow = document.createElement('div');
            labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;';
            const labelEl = document.createElement('span');
            labelEl.textContent = def.label;
            const valueEl = document.createElement('span');
            valueEl.style.color = '#ffaa00';
            const currentVal = instance.params[def.key] ?? def.min;
            valueEl.textContent = currentVal.toFixed(def.step < 0.1 ? 2 : (def.step < 1 ? 1 : 0));
            labelRow.appendChild(labelEl);
            labelRow.appendChild(valueEl);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = def.min;
            slider.max = def.max;
            slider.step = def.step;
            slider.value = currentVal;
            slider.style.cssText = 'width:100%;accent-color:#ffaa00;';
            slider._isDragging = false;
            slider.addEventListener('mousedown',  () => { slider._isDragging = true; });
            slider.addEventListener('touchstart',  () => { slider._isDragging = true; });
            slider.addEventListener('mouseup',    () => { slider._isDragging = false; });
            slider.addEventListener('touchend',   () => { slider._isDragging = false; });
            slider.oninput = () => {
              const v = parseFloat(slider.value);
              instance.params[def.key] = v;
              valueEl.textContent = v.toFixed(def.step < 0.1 ? 2 : (def.step < 1 ? 1 : 0));
            };

            // Register for RAF sync
            this._inspectorGenParamSliders.push({ slider, valueEl, instance, key: def.key, def });

            row.appendChild(labelRow);
            row.appendChild(slider);
            info.appendChild(row);
          });

          // Start RAF sync loop to reflect modulation changes (Generator params)
          const syncLoop = () => {
            for (const { slider, valueEl, instance: inst, key, def: d } of this._inspectorGenParamSliders) {
              if (slider._isDragging) continue;
              const v = inst.params[key];
              if (v === undefined) continue;
              const clamped = Math.max(d.min, Math.min(d.max, v));
              const rounded = parseFloat(clamped.toFixed(10));
              if (Math.abs(parseFloat(slider.value) - rounded) > d.step * 0.01) {
                slider.value = rounded;
                valueEl.textContent = rounded.toFixed(d.step < 0.1 ? 2 : (d.step < 1 ? 1 : 0));
              }
            }
            this._inspectorSyncRAF = requestAnimationFrame(syncLoop);
          };
          this._inspectorSyncRAF = requestAnimationFrame(syncLoop);
        }
      }

      // ── Audio Reactivity Settings ──────────────────────────────
      const audioSection = document.createElement('div');
      audioSection.style.marginTop = '12px';
      audioSection.style.paddingTop = '10px';
      audioSection.style.borderTop = '1px solid #333';

      const audioTitle = document.createElement('div');
      audioTitle.style.fontWeight = 'bold';
      audioTitle.style.marginBottom = '8px';
      audioTitle.style.color = '#00ff00';
      audioTitle.textContent = '🎵 Audio Reactivity';
      audioSection.appendChild(audioTitle);

      const clip = this.selectedClip;
      // Ensure audioSettings exists (backward compat)
      if (!clip.audioSettings) {
        clip.audioSettings = { source: 'current', band: 'all' };
      }

      // Source selector
      const sourceRow = document.createElement('div');
      sourceRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
      const sourceLabel = document.createElement('label');
      sourceLabel.textContent = 'Source:';
      sourceLabel.style.cssText = 'flex:0 0 60px;font-size:12px;';
      const sourceSelect = document.createElement('select');
      sourceSelect.style.flex = '1';
      [
        { value: 'current', label: 'Current (auto)' },
        { value: 'file',    label: 'Audio File' },
        { value: 'mic',     label: 'Mic / Input' },
      ].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === clip.audioSettings.source) o.selected = true;
        sourceSelect.appendChild(o);
      });
      sourceSelect.onchange = () => { clip.audioSettings.source = sourceSelect.value; };
      sourceRow.appendChild(sourceLabel);
      sourceRow.appendChild(sourceSelect);
      audioSection.appendChild(sourceRow);

      // Band selector
      const bandRow = document.createElement('div');
      bandRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';
      const bandLabel = document.createElement('label');
      bandLabel.textContent = 'Band:';
      bandLabel.style.cssText = 'flex:0 0 60px;font-size:12px;';
      const bandSelect = document.createElement('select');
      bandSelect.style.flex = '1';
      [
        { value: 'all',     label: 'All (original)' },
        { value: 'low',     label: 'Low (kick)' },
        { value: 'lowMid',  label: 'Low-Mid (bass)' },
        { value: 'highMid', label: 'High-Mid (mid)' },
        { value: 'high',    label: 'High (treble)' },
        { value: 'volume',  label: 'Volume (RMS)' },
        { value: 'peak',    label: 'Peak' },
      ].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === clip.audioSettings.band) o.selected = true;
        bandSelect.appendChild(o);
      });
      bandSelect.onchange = () => { clip.audioSettings.band = bandSelect.value; };
      bandRow.appendChild(bandLabel);
      bandRow.appendChild(bandSelect);
      audioSection.appendChild(bandRow);

      info.appendChild(audioSection);
    }
    
    inspectorContent.appendChild(info);
    
    // Phase 2: Effect Insert section
    const effectTitle = document.createElement('h4');
    effectTitle.textContent = 'Effect Inserts';
    effectTitle.style.color = '#00ff00';
    effectTitle.style.marginTop = '15px';
    inspectorContent.appendChild(effectTitle);
    
    // Add Effect Button
    const addEffectBtn = document.createElement('button');
    addEffectBtn.textContent = '+ Add Effect';
    addEffectBtn.style.width = '100%';
    addEffectBtn.style.marginBottom = '10px';
    addEffectBtn.style.backgroundColor = '#006600';
    addEffectBtn.onclick = () => this.showEffectSelectionDialog();
    inspectorContent.appendChild(addEffectBtn);
    
    // Get effect manager based on selected clip
    const effectManager = this.getEffectManagerForClip(this.selectedClip);
    if (!effectManager) return;
    
    // Display existing effects
    const effects = effectManager.getAllEffects();
    if (effects.length === 0) {
      const noEffects = document.createElement('div');
      noEffects.style.padding = '10px';
      noEffects.style.backgroundColor = '#0a0a0a';
      noEffects.style.borderRadius = '4px';
      noEffects.style.color = '#666';
      noEffects.textContent = 'No effects added';
      inspectorContent.appendChild(noEffects);
    } else {
      effects.forEach((effect, index) => {
        const effectPanel = this.createEffectPanel(effect, index, effectManager);
        inspectorContent.appendChild(effectPanel);
      });
    }

    // ── Modulation Section ────────────────────────────────────
    const modSection = this._buildModulationSection(this.selectedClip);
    inspectorContent.appendChild(modSection);

    // ── Effect param RAF sync (runs for all clip types) ───────
    if (!this._inspectorEffectSyncRAF) {
      const effectSyncLoop = () => {
        for (const { input, valueDisplay, effect: eff, key, maxVal } of this._inspectorEffectParamSliders) {
          if (input._isDragging) continue;
          const v = eff.uniforms[key]?.value;
          if (v === undefined) continue;
          const clamped = Math.max(0, Math.min(maxVal, v));
          if (Math.abs(parseFloat(input.value) - clamped) > 0.005) {
            input.value = clamped;
            valueDisplay.textContent = clamped.toFixed(2);
          }
        }
        this._inspectorEffectSyncRAF = requestAnimationFrame(effectSyncLoop);
      };
      this._inspectorEffectSyncRAF = requestAnimationFrame(effectSyncLoop);
    }
  }

  // ── Modulation helpers ──────────────────────────────────────────

  /** Returns [{targetType, targetId, paramName, label, def?}] for every tweakable param in a clip */
  _getClipParams(clip) {
    const params = [];
    // Effect parameters
    if (clip.effectManager) {
      clip.effectManager.getAllEffects().forEach(effect => {
        Object.keys(effect.uniforms).forEach(key => {
          if (key === 'tDiffuse') return;
          params.push({ targetType: 'effect', targetId: effect.id, paramName: key,
            label: `[FX] ${effect.name} / ${key}` });
        });
      });
    }
    // Generator parameters
    if (clip.type === 'generator' && clip.content?.instance) {
      const inst = clip.content.instance;
      if (typeof inst.getParamDefs === 'function') {
        inst.getParamDefs().forEach(def => {
          params.push({ targetType: 'generator', targetId: clip.id, paramName: def.key,
            label: `[Gen] ${def.label}`, def });
        });
      }
    }
    return params;
  }

  /** Returns modulations that target this clip (by effectManager or clip id) */
  _getClipModulations(clip) {
    if (!this.modulationMatrix) return [];
    const effectIds = new Set(
      clip.effectManager ? clip.effectManager.getAllEffects().map(e => e.id) : []
    );
    const result = [];
    this.modulationMatrix.modulations.forEach((mod, index) => {
      if (mod.targetType === 'effect' && effectIds.has(mod.targetId)) result.push({ mod, index });
      if (mod.targetType === 'generator' && mod.targetId === clip.id) result.push({ mod, index });
    });
    return result;
  }

  /** Source type → human-readable summary */
  _modSourceLabel(mod) {
    const s = mod.source;
    switch (s.type) {
      case 'lfo':       return `LFO ${s.params.hz || 1}Hz`;
      case 'audioBand': return `Audio: ${s.params.band || 'low'}`;
      case 'midiCC':    return `CC ${s.params.ccNumber ?? '?'}`;
      case 'manual':    return `Manual`;
      case 'random':    return `Random`;
      case 'bpm':       return `BPM ${s.params.bpm || 120}`;
      default:          return s.type;
    }
  }

  /** Build the full Modulation section DOM for the Inspector */
  _buildModulationSection(clip) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid #333;';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:bold;color:#ff8800;margin-bottom:8px;font-size:13px;';
    title.textContent = 'Modulation';
    wrap.appendChild(title);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Modulation';
    addBtn.style.cssText = 'width:100%;padding:6px;background:#553300;margin-bottom:8px;';
    addBtn.onclick = () => this.showModulationAddDialog(clip);
    wrap.appendChild(addBtn);

    const mods = this._getClipModulations(clip);
    if (mods.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:8px;background:#0a0a0a;border-radius:4px;color:#555;font-size:11px;';
      empty.textContent = 'No modulations';
      wrap.appendChild(empty);
    } else {
      mods.forEach(({ mod, index }) => {
        wrap.appendChild(this._createModulationRow(mod, index));
      });
    }
    return wrap;
  }

  /** Single modulation row: shows target + source + range + remove + inline edit */
  _createModulationRow(mod, globalIndex) {
    const row = document.createElement('div');
    row.style.cssText = 'background:#111;border:1px solid #333;border-radius:4px;padding:8px;margin-bottom:6px;font-size:11px;';

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:6px;';

    const info = document.createElement('div');
    info.style.flex = '1';
    const paramLabel = (() => {
      if (mod.targetType === 'effect') return `[FX] ${mod.targetId.slice(0,8)} / ${mod.paramName}`;
      if (mod.targetType === 'generator') return `[Gen] ${mod.paramName}`;
      return `${mod.targetType} / ${mod.paramName}`;
    })();
    const srcSpan = document.createElement('span');
    srcSpan.style.cssText = 'color:#aaa;';
    srcSpan.textContent = this._modSourceLabel(mod);
    info.innerHTML = `<div style="color:#ffcc88">${paramLabel}</div>`;
    info.appendChild(srcSpan);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.style.cssText = 'padding:2px 8px;background:#660000;font-size:11px;';
    removeBtn.onclick = () => {
      this.modulationMatrix.removeModulation(globalIndex);
      this.updateInspector();
    };

    // Toggle edit panel
    const editToggle = document.createElement('button');
    editToggle.textContent = '✎';
    editToggle.style.cssText = 'padding:2px 8px;background:#334;font-size:11px;margin-right:4px;';

    top.appendChild(info);
    top.appendChild(editToggle);
    top.appendChild(removeBtn);
    row.appendChild(top);

    // ── Range row (always visible) ──────────────────────────
    const rangeRow = document.createElement('div');
    rangeRow.style.cssText = 'display:flex;gap:8px;margin-top:6px;align-items:center;';
    const makeRangeInput = (label, val, onChange) => {
      const lbl = document.createElement('span');
      lbl.style.cssText = 'color:#888;flex:0 0 24px;';
      lbl.textContent = label;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.step = '0.01'; inp.value = val.toFixed(2);
      inp.style.cssText = 'width:52px;background:#222;border:1px solid #444;color:#fff;padding:2px 4px;font-size:11px;';
      inp.onchange = () => { onChange(parseFloat(inp.value) || 0); };
      return [lbl, inp];
    };
    const [minLbl, minInp] = makeRangeInput('Min', mod.min, v => { mod.min = v; });
    const [maxLbl, maxInp] = makeRangeInput('Max', mod.max, v => { mod.max = v; });
    rangeRow.append(minLbl, minInp, maxLbl, maxInp);
    row.appendChild(rangeRow);

    // ── Edit panel (collapsible) ────────────────────────────
    const editPanel = document.createElement('div');
    editPanel.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid #333;display:none;';

    // Source type selector
    const srcRow = document.createElement('div');
    srcRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;';
    const srcLbl = document.createElement('span'); srcLbl.style.cssText='color:#888;font-size:11px;flex:0 0 70px;'; srcLbl.textContent='Source:';
    const srcSel = document.createElement('select');
    srcSel.style.cssText = 'flex:1;background:#222;color:#fff;border:1px solid #444;padding:3px;font-size:11px;';
    [['lfo','LFO'],['audioBand','Audio Band'],['midiCC','MIDI CC'],['manual','Manual'],['random','Random'],['bpm','BPM']].forEach(([v,l])=>{
      const o=document.createElement('option'); o.value=v; o.textContent=l;
      if (mod.source.type === v) o.selected=true;
      srcSel.appendChild(o);
    });
    srcRow.append(srcLbl, srcSel);
    editPanel.appendChild(srcRow);

    // Source params (dynamic)
    const srcParamsDiv = document.createElement('div');
    editPanel.appendChild(srcParamsDiv);

    const buildEditSrcParams = () => {
      srcParamsDiv.innerHTML = '';
      const type = srcSel.value;
      const p = mod.source.params;

      const addSlider = (label, name, min, max, step, def) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:5px;';
        const l = document.createElement('span'); l.style.cssText='color:#aaa;font-size:11px;flex:0 0 80px;'; l.textContent=label;
        const vd = document.createElement('span'); vd.style.cssText='color:#ff8800;font-size:11px;flex:0 0 30px;text-align:right;';
        const inp = document.createElement('input'); inp.type='range'; inp.name=name;
        inp.min=min; inp.max=max; inp.step=step; inp.value=p[name]??def;
        inp.style.cssText='flex:1;accent-color:#ff8800;';
        vd.textContent = parseFloat(inp.value).toFixed(step<0.1?2:0);
        inp.oninput = () => { mod.source.params[name]=parseFloat(inp.value); vd.textContent=parseFloat(inp.value).toFixed(step<0.1?2:0); srcSpan.textContent=this._modSourceLabel(mod); };
        d.append(l, inp, vd); srcParamsDiv.appendChild(d);
      };
      const addSelect = (label, name, options, def) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:5px;';
        const l = document.createElement('span'); l.style.cssText='color:#aaa;font-size:11px;flex:0 0 80px;'; l.textContent=label;
        const sel = document.createElement('select'); sel.name=name;
        sel.style.cssText='flex:1;background:#222;color:#fff;border:1px solid #444;padding:2px;font-size:11px;';
        options.forEach(([v,lbl])=>{ const o=document.createElement('option'); o.value=v; o.textContent=lbl; if((p[name]??def)===v) o.selected=true; sel.appendChild(o); });
        sel.onchange=()=>{ mod.source.params[name]=sel.value==='true'?true:isNaN(sel.value)?sel.value:parseFloat(sel.value); srcSpan.textContent=this._modSourceLabel(mod); };
        d.append(l, sel); srcParamsDiv.appendChild(d);
      };
      const addNumber = (label, name, min, max, step, def) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:5px;';
        const l = document.createElement('span'); l.style.cssText='color:#aaa;font-size:11px;flex:0 0 80px;'; l.textContent=label;
        const inp = document.createElement('input'); inp.type='number'; inp.name=name;
        inp.min=min; inp.max=max; inp.step=step; inp.value=p[name]??def;
        inp.style.cssText='flex:1;background:#222;border:1px solid #444;color:#fff;padding:3px;font-size:11px;';
        inp.onchange=()=>{ mod.source.params[name]=parseFloat(inp.value)||def; srcSpan.textContent=this._modSourceLabel(mod); };
        d.append(l, inp); srcParamsDiv.appendChild(d);
      };

      if (type === 'lfo') {
        addSlider('Hz', 'hz', 0.05, 10, 0.05, 1);
        addSelect('Waveform', 'waveform', [['sine','Sine'],['triangle','Triangle'],['square','Square'],['sawtooth','Sawtooth']], 'sine');
        addSlider('Gain', 'gain', 0, 3, 0.01, 1);
      } else if (type === 'audioBand') {
        addSelect('Band', 'band', [['low','Low'],['lowMid','Low-Mid'],['highMid','High-Mid'],['high','High'],['volume','Volume']], 'low');
        addSlider('Gain', 'gain', 0, 3, 0.01, 1);
        addSlider('Threshold', 'threshold', 0, 1, 0.01, 0);
      } else if (type === 'midiCC') {
        addNumber('CC#', 'ccNumber', 0, 127, 1, 0);
        addSlider('Gain', 'gain', 0, 3, 0.01, 1);
      } else if (type === 'manual') {
        addSlider('Value', 'value', 0, 1, 0.01, 0.5);
      } else if (type === 'random') {
        addSlider('Gain', 'gain', 0, 1, 0.01, 1);
      } else if (type === 'bpm') {
        addNumber('BPM', 'bpm', 40, 300, 1, 120);
        addSelect('Division', 'division', [['1','1 bar'],['0.5','1/2'],['0.25','1/4'],['0.125','1/8']], '1');
      }
    };

    srcSel.onchange = () => {
      mod.source.type = srcSel.value;
      mod.source.params = {};
      buildEditSrcParams();
      srcSpan.textContent = this._modSourceLabel(mod);
    };
    buildEditSrcParams();

    row.appendChild(editPanel);

    editToggle.onclick = () => {
      const open = editPanel.style.display !== 'none';
      editPanel.style.display = open ? 'none' : 'block';
      editToggle.style.background = open ? '#334' : '#553';
    };

    return row;
  }

  /** Dialog: pick target param → source → range → confirm */
  showModulationAddDialog(clip) {
    const params = this._getClipParams(clip);
    if (params.length === 0) {
      alert('No parameters available on this clip.\nAdd an effect or use a Generator clip.');
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;';

    const dlg = document.createElement('div');
    dlg.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#1a1a1a;border:2px solid #ff8800;padding:20px;z-index:10000;
      min-width:320px;max-width:400px;max-height:85vh;overflow-y:auto;`;

    const title = document.createElement('h3');
    title.style.cssText = 'color:#ff8800;margin:0 0 14px;font-size:15px;';
    title.textContent = 'Add Modulation';
    dlg.appendChild(title);

    // ── Target parameter ──
    this._dlgRow(dlg, 'Target Param');
    const paramSel = document.createElement('select');
    paramSel.style.cssText = 'width:100%;margin-bottom:12px;padding:5px;background:#222;color:#fff;border:1px solid #444;';
    params.forEach((p, i) => {
      const o = document.createElement('option'); o.value = i; o.textContent = p.label;
      paramSel.appendChild(o);
    });
    dlg.appendChild(paramSel);

    // ── Source type ──
    this._dlgRow(dlg, 'Source Type');
    const srcSel = document.createElement('select');
    srcSel.style.cssText = 'width:100%;margin-bottom:10px;padding:5px;background:#222;color:#fff;border:1px solid #444;';
    [['lfo','LFO (oscillator)'],['audioBand','Audio Band'],['midiCC','MIDI CC'],
     ['manual','Manual (fixed)'],['random','Random'],['bpm','BPM Trigger']].forEach(([v,l]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = l;
      srcSel.appendChild(o);
    });
    dlg.appendChild(srcSel);

    // ── Source config (dynamic) ──
    const srcConfig = document.createElement('div');
    srcConfig.style.marginBottom = '12px';
    dlg.appendChild(srcConfig);

    const buildSrcConfig = () => {
      srcConfig.innerHTML = '';
      const type = srcSel.value;
      if (type === 'lfo') {
        srcConfig.appendChild(this._dlgSlider('Frequency (Hz)', 'hz', 0.05, 10, 0.05, 1));
        const wfDiv = document.createElement('div');
        wfDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
        const wfLbl = document.createElement('span'); wfLbl.style.cssText='color:#aaa;font-size:12px;flex:0 0 100px;'; wfLbl.textContent='Waveform';
        const wfSel = document.createElement('select'); wfSel.name='waveform';
        wfSel.style.cssText='flex:1;background:#222;color:#fff;border:1px solid #444;padding:3px;';
        ['sine','triangle','square','sawtooth'].forEach(w => {
          const o=document.createElement('option'); o.value=w; o.textContent=w; wfSel.appendChild(o);
        });
        wfDiv.appendChild(wfLbl); wfDiv.appendChild(wfSel); srcConfig.appendChild(wfDiv);
      } else if (type === 'audioBand') {
        const bDiv = document.createElement('div');
        bDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
        const bLbl = document.createElement('span'); bLbl.style.cssText='color:#aaa;font-size:12px;flex:0 0 100px;'; bLbl.textContent='Band';
        const bSel = document.createElement('select'); bSel.name='band';
        bSel.style.cssText='flex:1;background:#222;color:#fff;border:1px solid #444;padding:3px;';
        [['low','Low (kick)'],['lowMid','Low-Mid'],['highMid','High-Mid'],['high','High'],['volume','Volume']].forEach(([v,l])=>{
          const o=document.createElement('option'); o.value=v; o.textContent=l; bSel.appendChild(o);
        });
        bDiv.appendChild(bLbl); bDiv.appendChild(bSel); srcConfig.appendChild(bDiv);
        srcConfig.appendChild(this._dlgSlider('Gain', 'gain', 0, 3, 0.01, 1));
        srcConfig.appendChild(this._dlgSlider('Threshold', 'threshold', 0, 1, 0.01, 0));
      } else if (type === 'midiCC') {
        srcConfig.appendChild(this._dlgNumberInput('CC Number (0-127)', 'ccNumber', 0, 127, 1, 0));
        srcConfig.appendChild(this._dlgSlider('Gain', 'gain', 0, 3, 0.01, 1));
      } else if (type === 'manual') {
        srcConfig.appendChild(this._dlgSlider('Value', 'value', 0, 1, 0.01, 0.5));
      } else if (type === 'random') {
        srcConfig.appendChild(this._dlgSlider('Gain', 'gain', 0, 1, 0.01, 1));
      } else if (type === 'bpm') {
        srcConfig.appendChild(this._dlgNumberInput('BPM', 'bpm', 40, 300, 1, 120));
        const divDiv = document.createElement('div');
        divDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
        const divLbl = document.createElement('span'); divLbl.style.cssText='color:#aaa;font-size:12px;flex:0 0 100px;'; divLbl.textContent='Division';
        const divSel = document.createElement('select'); divSel.name='division';
        divSel.style.cssText='flex:1;background:#222;color:#fff;border:1px solid #444;padding:3px;';
        [['1','1 bar'],['0.5','1/2'],['0.25','1/4'],['0.125','1/8'],['0.0625','1/16']].forEach(([v,l])=>{
          const o=document.createElement('option'); o.value=v; o.textContent=l; divSel.appendChild(o);
        });
        divDiv.appendChild(divLbl); divDiv.appendChild(divSel); srcConfig.appendChild(divDiv);
      }
    };
    srcSel.onchange = buildSrcConfig;
    buildSrcConfig();

    // ── Range ──
    this._dlgRow(dlg, 'Output Range');
    const rangeWrap = document.createElement('div');
    rangeWrap.style.cssText = 'display:flex;gap:10px;margin-bottom:14px;';
    const mkNumInp = (lbl, val) => {
      const wrap = document.createElement('div'); wrap.style.flex='1';
      const l = document.createElement('div'); l.style.cssText='font-size:11px;color:#aaa;margin-bottom:3px;'; l.textContent=lbl;
      const inp = document.createElement('input'); inp.type='number'; inp.step='0.01'; inp.value=val;
      inp.style.cssText='width:100%;background:#222;border:1px solid #444;color:#fff;padding:4px;';
      wrap.appendChild(l); wrap.appendChild(inp);
      return wrap;
    };
    const minWrap = mkNumInp('Min', 0);
    const maxWrap = mkNumInp('Max', 1);
    rangeWrap.appendChild(minWrap); rangeWrap.appendChild(maxWrap);
    dlg.appendChild(rangeWrap);

    // ── Buttons ──
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.cssText = 'flex:1;padding:10px;background:#884400;font-weight:bold;';
    addBtn.onclick = () => {
      const pDef = params[parseInt(paramSel.value)];
      const srcType = srcSel.value;

      // Collect source params from srcConfig
      const srcParams = {};
      srcConfig.querySelectorAll('input[name], select[name]').forEach(el => {
        srcParams[el.name] = isNaN(el.value) ? el.value : parseFloat(el.value);
      });

      const source = new ModulationSource(srcType, srcParams);
      const mod = new Modulation(pDef.targetType, pDef.targetId, pDef.paramName, source);
      mod.min = parseFloat(minWrap.querySelector('input').value) || 0;
      mod.max = parseFloat(maxWrap.querySelector('input').value) || 1;
      this.modulationMatrix.addModulation(mod);

      document.body.removeChild(overlay);
      document.body.removeChild(dlg);
      this.updateInspector();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'flex:1;padding:10px;background:#333;';
    cancelBtn.onclick = () => { document.body.removeChild(overlay); document.body.removeChild(dlg); };
    overlay.onclick = cancelBtn.onclick;

    btnRow.appendChild(addBtn); btnRow.appendChild(cancelBtn);
    dlg.appendChild(btnRow);

    document.body.appendChild(overlay);
    document.body.appendChild(dlg);
  }

  /** Dialog helper: section label */
  _dlgRow(parent, text) {
    const d = document.createElement('div');
    d.style.cssText = 'font-size:11px;color:#888;margin-bottom:4px;margin-top:2px;text-transform:uppercase;letter-spacing:.05em;';
    d.textContent = text;
    parent.appendChild(d);
  }

  /** Dialog helper: labeled slider with data-name attribute */
  _dlgSlider(label, name, min, max, step, defaultVal) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    const lbl = document.createElement('span'); lbl.style.cssText='color:#aaa;font-size:12px;flex:0 0 100px;'; lbl.textContent=label;
    const valDisp = document.createElement('span'); valDisp.style.cssText='color:#ff8800;font-size:11px;flex:0 0 32px;text-align:right;'; valDisp.textContent=defaultVal;
    const inp = document.createElement('input'); inp.type='range'; inp.name=name;
    inp.min=min; inp.max=max; inp.step=step; inp.value=defaultVal;
    inp.style.cssText='flex:1;accent-color:#ff8800;';
    inp.oninput = () => { valDisp.textContent=parseFloat(inp.value).toFixed(step<0.1?2:0); };
    wrap.appendChild(lbl); wrap.appendChild(inp); wrap.appendChild(valDisp);
    return wrap;
  }

  /** Dialog helper: labeled number input */
  _dlgNumberInput(label, name, min, max, step, defaultVal) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    const lbl = document.createElement('span'); lbl.style.cssText='color:#aaa;font-size:12px;flex:0 0 100px;'; lbl.textContent=label;
    const inp = document.createElement('input'); inp.type='number'; inp.name=name;
    inp.min=min; inp.max=max; inp.step=step; inp.value=defaultVal;
    inp.style.cssText='flex:1;background:#222;border:1px solid #444;color:#fff;padding:4px;';
    wrap.appendChild(lbl); wrap.appendChild(inp);
    return wrap;
  }

  getEffectManagerForClip(clip) {
    if (clip && clip.effectManager) {
      return clip.effectManager;
    }
    // Fallback: create one on the fly if missing
    if (clip) {
      clip.effectManager = new EffectManager();
      return clip.effectManager;
    }
    return null;
  }

  showEffectSelectionDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #00ff00;
      padding: 20px;
      z-index: 10000;
      min-width: 300px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Select Effect';
    title.style.color = '#00ff00';
    title.style.marginTop = '0';
    dialog.appendChild(title);
    
    const effectTypes = [
      { id: 'bloom', name: 'Bloom (Glow)', desc: 'Bright areas glow' },
      { id: 'blur', name: 'Blur', desc: 'Gaussian blur effect' },
      { id: 'glitch', name: 'Glitch', desc: 'Digital glitch distortion' },
      { id: 'hue', name: 'Hue Shift', desc: 'Color hue rotation' },
      { id: 'rgbSplit', name: 'RGB Split', desc: 'Color channel separation' },
      { id: 'kaleidoscope', name: 'Kaleidoscope', desc: 'Mirror symmetry effect' },
      { id: 'chromaticAberration', name: 'Chromatic Aberration', desc: 'Lens color fringing' }
    ];
    
    effectTypes.forEach(effectType => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        margin-bottom: 8px;
        padding: 12px;
        text-align: left;
      `;
      btn.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${effectType.name}</div>
        <div style="font-size: 11px; color: #888;">${effectType.desc}</div>
      `;
      btn.onclick = () => {
        this.addEffect(effectType.id);
        document.body.removeChild(dialog);
        document.body.removeChild(overlay);
      };
      dialog.appendChild(btn);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.width = '100%';
    cancelBtn.style.marginTop = '10px';
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    };
    dialog.appendChild(cancelBtn);
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9999;
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
  }

  addEffect(effectType) {
    const effectManager = this.getEffectManagerForClip(this.selectedClip);
    if (effectManager) {
      effectManager.addEffect(effectType);
      this.updateInspector();
    }
  }

  createEffectPanel(effect, index, effectManager) {
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `;
    
    const effectName = document.createElement('span');
    effectName.textContent = effect.name.charAt(0).toUpperCase() + effect.name.slice(1);
    effectName.style.fontWeight = 'bold';
    effectName.style.color = '#00ff00';
    header.appendChild(effectName);
    
    const controls = document.createElement('div');
    
    // Enable/Disable toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = effect.enabled ? 'ON' : 'OFF';
    toggleBtn.style.cssText = `
      padding: 4px 12px;
      margin-right: 5px;
      background: ${effect.enabled ? '#006600' : '#660000'};
    `;
    toggleBtn.onclick = () => {
      effect.enabled = !effect.enabled;
      toggleBtn.textContent = effect.enabled ? 'ON' : 'OFF';
      toggleBtn.style.background = effect.enabled ? '#006600' : '#660000';
    };
    controls.appendChild(toggleBtn);
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.style.cssText = `
      padding: 4px 12px;
      background: #660000;
    `;
    removeBtn.onclick = () => {
      effectManager.removeEffect(index);
      this.updateInspector();
    };
    controls.appendChild(removeBtn);
    
    header.appendChild(controls);
    panel.appendChild(header);
    
    // Parameters
    const params = document.createElement('div');
    for (let key in effect.uniforms) {
      if (key === 'tDiffuse') continue;

      const paramDiv = document.createElement('div');
      paramDiv.style.marginBottom = '8px';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;';
      const labelEl = document.createElement('span');
      labelEl.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      const valueDisplay = document.createElement('span');
      valueDisplay.style.cssText = 'color:#ffaa00;font-size:11px;';
      const curVal = effect.uniforms[key].value;
      valueDisplay.textContent = typeof curVal === 'number' ? curVal.toFixed(2) : String(curVal);
      labelRow.appendChild(labelEl);
      labelRow.appendChild(valueDisplay);

      const maxVal = key === 'segments' ? 12 : 10;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = String(maxVal);
      input.step = '0.01';
      input.value = curVal;
      input.style.width = '100%';
      input._isDragging = false;
      input.addEventListener('mousedown',  () => { input._isDragging = true; });
      input.addEventListener('touchstart', () => { input._isDragging = true; }, { passive: true });
      input.addEventListener('mouseup',    () => { input._isDragging = false; });
      input.addEventListener('touchend',   () => { input._isDragging = false; });
      input.oninput = () => {
        const v = parseFloat(input.value);
        effect.setParameter(key, v);
        valueDisplay.textContent = v.toFixed(2);
      };

      // Register for RAF sync (so modulation shows up in real time)
      this._inspectorEffectParamSliders.push({ input, valueDisplay, effect, key, maxVal });

      paramDiv.appendChild(labelRow);
      paramDiv.appendChild(input);
      params.appendChild(paramDiv);
    }
    panel.appendChild(params);
    
    // Audio Reactive section
    const audioReactiveTitle = document.createElement('div');
    audioReactiveTitle.textContent = 'Audio Reactive:';
    audioReactiveTitle.style.fontSize = '12px';
    audioReactiveTitle.style.fontWeight = 'bold';
    audioReactiveTitle.style.marginTop = '10px';
    audioReactiveTitle.style.marginBottom = '5px';
    panel.appendChild(audioReactiveTitle);
    
    const audioReactiveToggle = document.createElement('button');
    audioReactiveToggle.textContent = effect.audioReactive.enabled ? 'Enabled' : 'Disabled';
    audioReactiveToggle.style.cssText = `
      width: 100%;
      padding: 6px;
      margin-bottom: 8px;
      background: ${effect.audioReactive.enabled ? '#006666' : '#333'};
      font-size: 11px;
    `;
    audioReactiveToggle.onclick = () => {
      effect.audioReactive.enabled = !effect.audioReactive.enabled;
      audioReactiveToggle.textContent = effect.audioReactive.enabled ? 'Enabled' : 'Disabled';
      audioReactiveToggle.style.background = effect.audioReactive.enabled ? '#006666' : '#333';
      audioReactiveControls.style.display = effect.audioReactive.enabled ? 'block' : 'none';
    };
    panel.appendChild(audioReactiveToggle);
    
    const audioReactiveControls = document.createElement('div');
    audioReactiveControls.style.display = effect.audioReactive.enabled ? 'block' : 'none';
    audioReactiveControls.style.fontSize = '11px';
    
    // Parameter selection
    const paramSelect = document.createElement('select');
    paramSelect.style.width = '100%';
    paramSelect.style.marginBottom = '5px';
    paramSelect.innerHTML = '<option value="">Select Parameter</option>';
    for (let key in effect.uniforms) {
      if (key === 'tDiffuse') continue;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      if (effect.audioReactive.parameter === key) option.selected = true;
      paramSelect.appendChild(option);
    }
    paramSelect.onchange = () => {
      effect.audioReactive.parameter = paramSelect.value;
    };
    audioReactiveControls.appendChild(paramSelect);
    
    // Source selection
    const sourceSelect = document.createElement('select');
    sourceSelect.style.width = '100%';
    sourceSelect.style.marginBottom = '5px';
    sourceSelect.innerHTML = `
      <option value="volume" ${effect.audioReactive.source === 'volume' ? 'selected' : ''}>Volume</option>
      <option value="low" ${effect.audioReactive.source === 'low' ? 'selected' : ''}>Low (Bass)</option>
      <option value="lowMid" ${effect.audioReactive.source === 'lowMid' ? 'selected' : ''}>Low-Mid</option>
      <option value="highMid" ${effect.audioReactive.source === 'highMid' ? 'selected' : ''}>High-Mid</option>
      <option value="high" ${effect.audioReactive.source === 'high' ? 'selected' : ''}>High (Treble)</option>
    `;
    sourceSelect.onchange = () => {
      effect.audioReactive.source = sourceSelect.value;
    };
    audioReactiveControls.appendChild(sourceSelect);
    
    // Gain slider
    const gainLabel = document.createElement('label');
    gainLabel.textContent = 'Gain: ';
    const gainInput = document.createElement('input');
    gainInput.type = 'range';
    gainInput.min = '0';
    gainInput.max = '5';
    gainInput.step = '0.1';
    gainInput.value = effect.audioReactive.gain;
    gainInput.style.width = '70%';
    const gainValue = document.createElement('span');
    gainValue.textContent = effect.audioReactive.gain.toFixed(1);
    gainValue.style.marginLeft = '5px';
    gainInput.oninput = () => {
      effect.audioReactive.gain = parseFloat(gainInput.value);
      gainValue.textContent = gainInput.value;
    };
    gainLabel.appendChild(gainInput);
    gainLabel.appendChild(gainValue);
    audioReactiveControls.appendChild(gainLabel);
    
    // Audio Level Meter
    const meterContainer = document.createElement('div');
    meterContainer.style.cssText = `
      margin-top: 8px;
      padding: 8px;
      background: #1a1a1a;
      border-radius: 3px;
    `;
    
    const meterLabel = document.createElement('div');
    meterLabel.textContent = 'Audio Level (Source + Gain):';
    meterLabel.style.cssText = `
      font-size: 10px;
      color: #888;
      margin-bottom: 4px;
    `;
    meterContainer.appendChild(meterLabel);
    
    const meterBar = document.createElement('div');
    meterBar.style.cssText = `
      width: 100%;
      height: 20px;
      background: #000;
      border: 1px solid #333;
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    `;
    
    const meterFill = document.createElement('div');
    meterFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(to right, #00ff00, #ffff00, #ff0000);
      transition: width 0.05s ease-out;
    `;
    meterBar.appendChild(meterFill);
    
    const meterValue = document.createElement('div');
    meterValue.textContent = '0.00';
    meterValue.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 3px #000, 0 0 3px #000;
      pointer-events: none;
    `;
    meterBar.appendChild(meterValue);
    
    meterContainer.appendChild(meterBar);
    audioReactiveControls.appendChild(meterContainer);
    
    // Update meter in animation loop
    effect._levelMeterElements = {
      fill: meterFill,
      value: meterValue,
      source: effect.audioReactive.source,
      gain: effect.audioReactive.gain
    };
    
    // Invert checkbox
    const invertLabel = document.createElement('label');
    invertLabel.style.display = 'block';
    invertLabel.style.marginTop = '5px';
    const invertCheck = document.createElement('input');
    invertCheck.type = 'checkbox';
    invertCheck.checked = effect.audioReactive.invert;
    invertCheck.onchange = () => {
      effect.audioReactive.invert = invertCheck.checked;
    };
    invertLabel.appendChild(invertCheck);
    invertLabel.appendChild(document.createTextNode(' Invert'));
    audioReactiveControls.appendChild(invertLabel);
    
    panel.appendChild(audioReactiveControls);

    return panel;
  }

  showAddModulationDialog(effect) {
    // Phase 4: Dialog to add new modulation
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #ffaa00;
      padding: 20px;
      border-radius: 8px;
      z-index: 10000;
      min-width: 400px;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Add Modulation';
    title.style.color = '#ffaa00';
    title.style.marginBottom = '15px';
    dialog.appendChild(title);
    
    // Parameter selection
    const paramLabel = document.createElement('label');
    paramLabel.textContent = 'Parameter:';
    paramLabel.style.display = 'block';
    paramLabel.style.marginBottom = '5px';
    dialog.appendChild(paramLabel);
    
    const paramSelect = document.createElement('select');
    paramSelect.style.width = '100%';
    paramSelect.style.marginBottom = '10px';
    for (let key in effect.uniforms) {
      if (key === 'tDiffuse') continue;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      paramSelect.appendChild(option);
    }
    dialog.appendChild(paramSelect);
    
    // Source type selection
    const sourceTypeLabel = document.createElement('label');
    sourceTypeLabel.textContent = 'Source Type:';
    sourceTypeLabel.style.display = 'block';
    sourceTypeLabel.style.marginBottom = '5px';
    dialog.appendChild(sourceTypeLabel);
    
    const sourceTypeSelect = document.createElement('select');
    sourceTypeSelect.style.width = '100%';
    sourceTypeSelect.style.marginBottom = '10px';
    sourceTypeSelect.innerHTML = `
      <option value="manual">Manual</option>
      <option value="midiCC">MIDI CC</option>
      <option value="audioBand">Audio Band</option>
      <option value="lfo">LFO</option>
      <option value="random">Random</option>
      <option value="bpm">BPM Sync</option>
    `;
    dialog.appendChild(sourceTypeSelect);
    
    // MIDI CC Number input (conditional)
    const midiCCContainer = document.createElement('div');
    midiCCContainer.style.display = 'none';
    const midiCCLabel = document.createElement('label');
    midiCCLabel.textContent = 'CC Number (10-127):';
    midiCCLabel.style.display = 'block';
    midiCCLabel.style.marginBottom = '5px';
    midiCCContainer.appendChild(midiCCLabel);
    const midiCCInput = document.createElement('input');
    midiCCInput.type = 'number';
    midiCCInput.min = '10';
    midiCCInput.max = '127';
    midiCCInput.value = '10';
    midiCCInput.style.width = '100%';
    midiCCInput.style.marginBottom = '10px';
    midiCCContainer.appendChild(midiCCInput);
    dialog.appendChild(midiCCContainer);
    
    // Audio Band selection (conditional)
    const audioBandContainer = document.createElement('div');
    audioBandContainer.style.display = 'none';
    const audioBandLabel = document.createElement('label');
    audioBandLabel.textContent = 'Audio Band:';
    audioBandLabel.style.display = 'block';
    audioBandLabel.style.marginBottom = '5px';
    audioBandContainer.appendChild(audioBandLabel);
    const audioBandSelect = document.createElement('select');
    audioBandSelect.style.width = '100%';
    audioBandSelect.style.marginBottom = '10px';
    audioBandSelect.innerHTML = `
      <option value="low">Low (Bass)</option>
      <option value="lowMid">Low-Mid</option>
      <option value="highMid">High-Mid</option>
      <option value="high">High (Treble)</option>
    `;
    audioBandContainer.appendChild(audioBandSelect);
    dialog.appendChild(audioBandContainer);
    
    // LFO settings (conditional)
    const lfoContainer = document.createElement('div');
    lfoContainer.style.display = 'none';
    
    const lfoGainLabel = document.createElement('label');
    lfoGainLabel.textContent = 'LFO Gain (Amplitude):';
    lfoGainLabel.style.display = 'block';
    lfoGainLabel.style.marginBottom = '5px';
    lfoContainer.appendChild(lfoGainLabel);
    const lfoGainInput = document.createElement('input');
    lfoGainInput.type = 'number';
    lfoGainInput.min = '0';
    lfoGainInput.max = '10';
    lfoGainInput.step = '0.1';
    lfoGainInput.value = '1.0';
    lfoGainInput.style.width = '100%';
    lfoGainInput.style.marginBottom = '10px';
    lfoContainer.appendChild(lfoGainInput);
    
    const lfoHzLabel = document.createElement('label');
    lfoHzLabel.textContent = 'LFO Hz (Frequency):';
    lfoHzLabel.style.display = 'block';
    lfoHzLabel.style.marginBottom = '5px';
    lfoContainer.appendChild(lfoHzLabel);
    const lfoHzInput = document.createElement('input');
    lfoHzInput.type = 'number';
    lfoHzInput.min = '0.01';
    lfoHzInput.max = '20';
    lfoHzInput.step = '0.1';
    lfoHzInput.value = '1.0';
    lfoHzInput.style.width = '100%';
    lfoHzInput.style.marginBottom = '10px';
    lfoContainer.appendChild(lfoHzInput);
    
    dialog.appendChild(lfoContainer);
    
    // Random settings (conditional)
    const randomContainer = document.createElement('div');
    randomContainer.style.display = 'none';
    
    const randomGainLabel = document.createElement('label');
    randomGainLabel.textContent = 'Random Gain:';
    randomGainLabel.style.display = 'block';
    randomGainLabel.style.marginBottom = '5px';
    randomContainer.appendChild(randomGainLabel);
    const randomGainInput = document.createElement('input');
    randomGainInput.type = 'number';
    randomGainInput.min = '0';
    randomGainInput.max = '10';
    randomGainInput.step = '0.1';
    randomGainInput.value = '1.0';
    randomGainInput.style.width = '100%';
    randomGainInput.style.marginBottom = '10px';
    randomContainer.appendChild(randomGainInput);
    
    const randomSeedLabel = document.createElement('label');
    randomSeedLabel.textContent = 'Seed:';
    randomSeedLabel.style.display = 'block';
    randomSeedLabel.style.marginBottom = '5px';
    randomContainer.appendChild(randomSeedLabel);
    const randomSeedInput = document.createElement('input');
    randomSeedInput.type = 'number';
    randomSeedInput.min = '0';
    randomSeedInput.max = '1000';
    randomSeedInput.step = '1';
    randomSeedInput.value = Math.floor(Math.random() * 1000);
    randomSeedInput.style.width = '100%';
    randomSeedInput.style.marginBottom = '10px';
    randomContainer.appendChild(randomSeedInput);
    
    dialog.appendChild(randomContainer);
    
    // BPM settings (conditional)
    const bpmContainer = document.createElement('div');
    bpmContainer.style.display = 'none';
    
    const bpmValueLabel = document.createElement('label');
    bpmValueLabel.textContent = 'BPM:';
    bpmValueLabel.style.display = 'block';
    bpmValueLabel.style.marginBottom = '5px';
    bpmContainer.appendChild(bpmValueLabel);
    const bpmValueInput = document.createElement('input');
    bpmValueInput.type = 'number';
    bpmValueInput.min = '20';
    bpmValueInput.max = '300';
    bpmValueInput.step = '1';
    bpmValueInput.value = '120';
    bpmValueInput.style.width = '100%';
    bpmValueInput.style.marginBottom = '10px';
    bpmContainer.appendChild(bpmValueInput);
    
    const bpmDivisionLabel = document.createElement('label');
    bpmDivisionLabel.textContent = 'Division:';
    bpmDivisionLabel.style.display = 'block';
    bpmDivisionLabel.style.marginBottom = '5px';
    bpmContainer.appendChild(bpmDivisionLabel);
    const bpmDivisionSelect = document.createElement('select');
    bpmDivisionSelect.style.width = '100%';
    bpmDivisionSelect.style.marginBottom = '10px';
    bpmDivisionSelect.innerHTML = `
      <option value="1">1 (Whole Note)</option>
      <option value="0.5">1/2 (Half Note)</option>
      <option value="0.25">1/4 (Quarter Note)</option>
      <option value="0.125">1/8 (Eighth Note)</option>
      <option value="0.0625">1/16 (Sixteenth Note)</option>
    `;
    bpmContainer.appendChild(bpmDivisionSelect);
    
    dialog.appendChild(bpmContainer);
    
    // Gain input
    const gainLabel = document.createElement('label');
    gainLabel.textContent = 'Gain:';
    gainLabel.style.display = 'block';
    gainLabel.style.marginBottom = '5px';
    dialog.appendChild(gainLabel);
    const gainInput = document.createElement('input');
    gainInput.type = 'number';
    gainInput.min = '0';
    gainInput.max = '10';
    gainInput.step = '0.1';
    gainInput.value = '1.0';
    gainInput.style.width = '100%';
    gainInput.style.marginBottom = '10px';
    dialog.appendChild(gainInput);
    
    // Threshold input
    const thresholdLabel = document.createElement('label');
    thresholdLabel.textContent = 'Threshold:';
    thresholdLabel.style.display = 'block';
    thresholdLabel.style.marginBottom = '5px';
    dialog.appendChild(thresholdLabel);
    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.min = '0';
    thresholdInput.max = '1';
    thresholdInput.step = '0.01';
    thresholdInput.value = '0.0';
    thresholdInput.style.width = '100%';
    thresholdInput.style.marginBottom = '10px';
    dialog.appendChild(thresholdInput);
    
    // Invert checkbox
    const invertLabel = document.createElement('label');
    invertLabel.style.display = 'block';
    invertLabel.style.marginBottom = '10px';
    const invertCheck = document.createElement('input');
    invertCheck.type = 'checkbox';
    invertLabel.appendChild(invertCheck);
    invertLabel.appendChild(document.createTextNode(' Invert'));
    dialog.appendChild(invertLabel);
    
    // Range inputs
    const rangeLabel = document.createElement('label');
    rangeLabel.textContent = 'Output Range:';
    rangeLabel.style.display = 'block';
    rangeLabel.style.marginBottom = '5px';
    dialog.appendChild(rangeLabel);
    
    const rangeContainer = document.createElement('div');
    rangeContainer.style.display = 'flex';
    rangeContainer.style.gap = '10px';
    rangeContainer.style.marginBottom = '15px';
    
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.value = '0.0';
    minInput.step = '0.01';
    minInput.style.flex = '1';
    rangeContainer.appendChild(minInput);
    
    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.value = '1.0';
    maxInput.step = '0.01';
    maxInput.style.flex = '1';
    rangeContainer.appendChild(maxInput);
    
    dialog.appendChild(rangeContainer);
    
    // Show/hide conditional inputs
    sourceTypeSelect.onchange = () => {
      midiCCContainer.style.display = sourceTypeSelect.value === 'midiCC' ? 'block' : 'none';
      audioBandContainer.style.display = sourceTypeSelect.value === 'audioBand' ? 'block' : 'none';
      lfoContainer.style.display = sourceTypeSelect.value === 'lfo' ? 'block' : 'none';
      randomContainer.style.display = sourceTypeSelect.value === 'random' ? 'block' : 'none';
      bpmContainer.style.display = sourceTypeSelect.value === 'bpm' ? 'block' : 'none';
      
      // Hide general gain/threshold for LFO, Random, BPM (they have their own)
      if (sourceTypeSelect.value === 'lfo' || sourceTypeSelect.value === 'random' || sourceTypeSelect.value === 'bpm') {
        gainLabel.style.display = 'none';
        gainInput.style.display = 'none';
        thresholdLabel.style.display = 'none';
        thresholdInput.style.display = 'none';
        invertLabel.style.display = 'none';
      } else {
        gainLabel.style.display = 'block';
        gainInput.style.display = 'block';
        thresholdLabel.style.display = 'block';
        thresholdInput.style.display = 'block';
        invertLabel.style.display = 'block';
      }
    };
    
    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.flex = '1';
    addBtn.style.background = '#006600';
    addBtn.onclick = () => {
      // Create modulation source
      const sourceParams = {
        gain: parseFloat(gainInput.value),
        threshold: parseFloat(thresholdInput.value),
        invert: invertCheck.checked
      };
      
      if (sourceTypeSelect.value === 'midiCC') {
        sourceParams.ccNumber = parseInt(midiCCInput.value);
      } else if (sourceTypeSelect.value === 'audioBand') {
        sourceParams.band = audioBandSelect.value;
      } else if (sourceTypeSelect.value === 'lfo') {
        sourceParams.gain = parseFloat(lfoGainInput.value);
        sourceParams.hz = parseFloat(lfoHzInput.value);
      } else if (sourceTypeSelect.value === 'random') {
        sourceParams.gain = parseFloat(randomGainInput.value);
        sourceParams.seed = parseFloat(randomSeedInput.value);
      } else if (sourceTypeSelect.value === 'bpm') {
        sourceParams.bpm = parseFloat(bpmValueInput.value);
        sourceParams.division = parseFloat(bpmDivisionSelect.value);
      }
      
      const source = new ModulationSource(sourceTypeSelect.value, sourceParams);
      const modulation = new Modulation('effect', effect.id, paramSelect.value, source);
      modulation.setRange(parseFloat(minInput.value), parseFloat(maxInput.value));
      
      this.modulationMatrix.addModulation(modulation);
      
      document.body.removeChild(dialog);
      this.updateInspector(); // Refresh UI
    };
    btnContainer.appendChild(addBtn);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';
    cancelBtn.style.background = '#440000';
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
    };
    btnContainer.appendChild(cancelBtn);
    
    dialog.appendChild(btnContainer);
    document.body.appendChild(dialog);
  }

  setResolution(res) {
    let width, height;
    
    if (typeof res === 'string') {
      const parts = res.split('x');
      width = parseInt(parts[0]);
      height = parseInt(parts[1]);
    } else if (typeof res === 'object') {
      width = res.width;
      height = res.height;
    } else {
      console.error('Invalid resolution format');
      return;
    }
    
    this.renderEngine.setResolution(width, height);
    console.log(`Set resolution: ${width}x${height}`);
  }

  setSpeedMultiplier(speed) {
    this.speedMultiplier = parseFloat(speed);
    console.log(`Speed multiplier: ${speed}`);
  }

  drawWaveform() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 960;
    canvas.height = 120;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get audio buffer from audio file player
    const audioBuffer = this.audioEngine.audioFilePlayer?.audioBuffer;
    if (!audioBuffer) {
      // Draw placeholder if no audio loaded
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }
    
    // Get audio data from first channel
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const samplesPerPixel = Math.floor(samples / canvas.width);
    
    // Draw waveform
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, samples);
      
      // Calculate min and max in this pixel range
      let min = 1.0;
      let max = -1.0;
      for (let i = startSample; i < endSample; i++) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      // Convert to pixel coordinates
      const yMin = ((1 - min) / 2) * canvas.height;
      const yMax = ((1 - max) / 2) * canvas.height;
      
      if (x === 0) {
        ctx.moveTo(x, yMax);
      }
      ctx.lineTo(x, yMax);
      ctx.lineTo(x, yMin);
    }
    
    ctx.stroke();
    
    // Draw playhead (always visible when audio is loaded)
    const duration = this.audioEngine.getAudioFileDuration();
    if (duration > 0) {
      const currentTime = this.audioEngine.getAudioFileCurrentTime();
      const x = (currentTime / duration) * canvas.width;
      // Shadow for readability
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      // Playhead line
      const player = this.audioEngine.audioFilePlayer;
      ctx.strokeStyle = player?.loop ? '#00ffff' : '#ff3333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      // Time label
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.textAlign = x > canvas.width * 0.8 ? 'right' : 'left';
      ctx.fillText(`${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`, x + (x > canvas.width * 0.8 ? -4 : 4), 14);
    }
  }

  async loadAudioFile(file) {
    try {
      await this.audioEngine.loadAudioFile(file);
      
      // Reset playback position to 0
      this.audioEngine.seekAudioFile(0);
      
      console.log(`✓Audio file loaded: ${file.name}`);
      
      // Show waveform canvas
      const waveformCanvas = document.getElementById('waveform-canvas');
      if (waveformCanvas) {
        waveformCanvas.style.display = 'block';
      }
      
      this.drawWaveform();
    } catch (error) {
      alert('Failed to load audio file: ' + error.message);
    }
  }

  async loadVideoFile(file) {
    try {
      const videoClip = new VideoClip();
      await videoClip.loadFromFile(file);
      
      // Add to clip matrix at position [0, 0]
      this.clipMatrix.setClip(0, 0, videoClip, 'video', file.name);
      const newClip4 = this.clipMatrix.getClip(0, 0);
      if (newClip4) newClip4.effectManager = new EffectManager();
      console.log(`✓Video loaded to Clip [0,0]: ${file.name}`);
    } catch (error) {
      alert('Failed to load video file: ' + error.message);
    }
  }

  toggleDebugMode() {
    if (this.audioEngine.debugMode) {
      this.audioEngine.stopDebugMode();
      if (this.debugBtn) {
        this.debugBtn.textContent = this.languageManager.t('debug') + ' Mode: OFF';
        this.debugBtn.style.backgroundColor = '#1a1a1a';
      }
    } else {
      const bpm = this.config.bpm;
      this.audioEngine.startDebugMode(bpm, 60);
      if (this.debugBtn) {
        this.debugBtn.textContent = this.languageManager.t('debug') + ' Mode: ON';
        this.debugBtn.style.backgroundColor = '#2d5016';
      }
    }
  }
  
  openVideoOutputWindow() {
    // Prompt for resolution and FPS
    const resolutionInput = prompt('解像度を入力 (例: 1920x1080):', '1920x1080');
    if (!resolutionInput) return;
    
    const fpsInput = prompt('FPSを入力 (例: 60):', '60');
    if (!fpsInput) return;
    
    const [width, height] = resolutionInput.split('x').map(v => parseInt(v.trim()));
    const fps = parseInt(fpsInput);
    
    if (!width || !height || !fps) {
      alert('無効な入力です');
      return;
    }
    
    // Open new window
    const outputWindow = window.open('', 'VJ Output', `width=${width},height=${height}`);
    if (!outputWindow) {
      alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      return;
    }
    
    // Setup output window
    outputWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WavJe - Video Output</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
          }
          canvas {
            display: block;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <canvas id="output-canvas"></canvas>
      </body>
      </html>
    `);
    outputWindow.document.close();
    
    // Create output renderer
    const outputCanvas = outputWindow.document.getElementById('output-canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    
    const outputRenderer = new THREE.WebGLRenderer({ 
      canvas: outputCanvas, 
      antialias: true,
      alpha: false
    });
    outputRenderer.setSize(width, height);
    outputRenderer.setPixelRatio(1);
    
    // Store reference for cleanup
    if (!this.outputWindows) this.outputWindows = [];
    this.outputWindows.push({
      window: outputWindow,
      renderer: outputRenderer,
      canvas: outputCanvas,
      fps: fps
    });
    
    console.log(`✓Video output window opened: ${width}x${height} @ ${fps}fps`);
    
    // Start rendering loop for this output
    this.startOutputRendering(outputWindow, outputRenderer, fps);
  }
  
  startOutputRendering(outputWindow, outputRenderer, targetFPS) {
    const targetFrameTime = 1000 / targetFPS;
    let lastFrameTime = performance.now();
    
    const renderLoop = () => {
      if (outputWindow.closed) {
        console.log('✓Output window closed');
        return;
      }
      
      const now = performance.now();
      const deltaTime = now - lastFrameTime;
      
      if (deltaTime >= targetFrameTime) {
        // Render scene with effects applied
        const hasEffects = this.masterEffectManager && this.masterEffectManager.getAllEffects().length > 0;
        
        if (!hasEffects) {
          // No effects - render directly
          const scene = this.renderEngine.getScene();
          const camera = this.renderEngine.camera;
          if (scene && camera) {
            outputRenderer.autoClear = true;
            outputRenderer.setRenderTarget(null);
            outputRenderer.render(scene, camera);
          }
        } else {
          // With effects - copy the rendering logic from RenderEngine
          const scene = this.renderEngine.getScene();
          const camera = this.renderEngine.camera;
          
          if (!scene || !camera) {
            lastFrameTime = now;
            return;
          }
          
          // Create render targets if needed
          if (!outputRenderer._renderTarget1) {
            const width = outputRenderer.domElement.width;
            const height = outputRenderer.domElement.height;
            outputRenderer._renderTarget1 = new THREE.WebGLRenderTarget(width, height, {
              minFilter: THREE.LinearFilter,
              magFilter: THREE.LinearFilter,
              format: THREE.RGBAFormat
            });
            outputRenderer._renderTarget2 = new THREE.WebGLRenderTarget(width, height, {
              minFilter: THREE.LinearFilter,
              magFilter: THREE.LinearFilter,
              format: THREE.RGBAFormat
            });
          }
          
          // Render scene to first render target
          outputRenderer.autoClear = false;
          outputRenderer.setRenderTarget(outputRenderer._renderTarget1);
          outputRenderer.clear();
          outputRenderer.render(scene, camera);
          
          // Apply effects in chain using main engine's effect materials
          const effects = this.masterEffectManager.getAllEffects().filter(e => e.enabled);
          let readBuffer = outputRenderer._renderTarget1;
          let writeBuffer = outputRenderer._renderTarget2;
          
          const effectQuad = this.renderEngine.effectQuad;
          const effectScene = this.renderEngine.effectScene;
          const effectCamera = this.renderEngine.effectCamera;
          
          for (let i = 0; i < effects.length; i++) {
            const effect = effects[i];
            const material = this.renderEngine.effectMaterials.get(effect.id);
            
            if (!material) continue;
            
            effectQuad.material = material;
            material.uniforms.tDiffuse.value = readBuffer.texture;
            
            // Copy uniforms
            for (let key in effect.uniforms) {
              if (key !== 'tDiffuse' && material.uniforms[key]) {
                material.uniforms[key].value = effect.uniforms[key].value;
              }
            }
            
            // Last effect renders to screen
            if (i === effects.length - 1) {
              outputRenderer.setRenderTarget(null);
              outputRenderer.clear();
            } else {
              outputRenderer.setRenderTarget(writeBuffer);
              outputRenderer.clear();
            }
            
            outputRenderer.render(effectScene, effectCamera);
            
            // Swap buffers
            const temp = readBuffer;
            readBuffer = writeBuffer;
            writeBuffer = temp;
          }
          
          outputRenderer.autoClear = true;
        }
        
        lastFrameTime = now;
      }
      
      requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
  }

  play() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    // Ensure all active layers have meshes in their deck groups and play videos
    [
      { deck: this.deckA, group: this.renderEngine.deckA, name: 'A' },
      { deck: this.deckB, group: this.renderEngine.deckB, name: 'B' }
    ].forEach(({ deck, group, name }) => {
      deck.layers.forEach(layer => {
        if (layer.isActive && layer.content) {
          // Create mesh if missing
          if (!layer.mesh) {
            layer.createMesh(group);
            console.log(`✓Created mesh for Deck ${name} Layer ${layer.index}`);
          }
          
          // Play video if it's a video clip
          if (layer.contentType === 'video' && layer.content.play) {
            layer.content.play();
            console.log(`✓Playing video on Deck ${name} Layer ${layer.index}`);
          }
        }
      });
    });
    
    // Debug: Log scene structure
    console.log('=== Scene Structure ===');
    console.log('Scene children:', this.renderEngine.scene.children.length);
    console.log('Deck A children:', this.renderEngine.deckA.children.length);
    console.log('Deck B children:', this.renderEngine.deckB.children.length);
    console.log('Camera position:', this.renderEngine.camera.position);
    this.renderEngine.deckA.children.forEach((child, i) => {
      console.log(`  Deck A[${i}]:`, child.type, 'pos:', child.position);
    });
    this.renderEngine.deckB.children.forEach((child, i) => {
      console.log(`  Deck B[${i}]:`, child.type, 'pos:', child.position);
    });
    
    this.render();
  }

  pause() {
    this.isRunning = false;
  }

  stop() {
    this.isRunning = false;
    this.audioEngine.stop();
  }

  switchGenerator(name) {
    // Deprecated: Generators should be loaded to layers via clip matrix
    console.warn('⚠️ switchGenerator is deprecated. Use layer system instead.');
    console.log(`To use generator "${name}", click Gen button and double-click a layer`);
  }

  render = () => {
    if (!this.isRunning) {
      this.animationId = null;
      return;
    }

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // Phase 6: Record frame for performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.recordFrame();
    }

    const audioData = this.audioEngine.updateAudioData();

    // Phase 1: Beat Detection
    if (this.beatDetector.isEnabled) {
      const beatDetected = this.beatDetector.detectBeat(audioData);
      if (beatDetected && this.beatDetectBtn) {
        // Visual feedback on beat
        this.beatDetectBtn.style.backgroundColor = '#00ff00';
        setTimeout(() => {
          if (this.beatDetector.isEnabled) {
            this.beatDetectBtn.style.backgroundColor = '#006600';
          }
        }, 100);
      }
    }

    // Phase 1: Transition Effects
    if (this.transitionManager.isTransitioning) {
      this.transitionManager.update(deltaTime);
    }

    // Phase 1: Strobe Sync
    if (this.strobeSync.isEnabled) {
      const strobeData = this.strobeSync.update();
      if (strobeData.active && this.strobeBtn) {
        const intensity = Math.floor(strobeData.intensity * 255);
        this.strobeBtn.style.backgroundColor = `rgb(${intensity}, 0, 0)`;
      } else if (this.strobeBtn && this.strobeSync.isEnabled) {
        this.strobeBtn.style.backgroundColor = '#660000';
      }
    }

    // Phase 2: Camera Control
    if (this.renderEngine.cameraController) {
      this.renderEngine.cameraController.update(audioData);
    }

    // Phase 2: Update Audio Reactive Effects (per-clip effectManagers)
    [this.deckA, this.deckB].forEach(deck => {
      deck.layers.forEach(layer => {
        if (layer.isActive && layer.clipRef && layer.clipRef.effectManager) {
          layer.clipRef.effectManager.updateAudioReactive(audioData);
        }
      });
    });

    // Phase 4: Apply Modulation Matrix (to all active clip effectManagers)
    if (this.modulationMatrix) {
      [this.deckA, this.deckB].forEach(deck => {
        deck.layers.forEach(layer => {
          if (layer.isActive && layer.clipRef && layer.clipRef.effectManager) {
            this.modulationMatrix.applyModulations(audioData, layer.clipRef.effectManager, this.clipMatrix);
          }
        });
      });
    }

    // Phase 2: Text Renderer
    if (this.renderEngine.textRenderer) {
      this.renderEngine.textRenderer.updateAudioReactiveTexts(audioData);
    }

    // Phase 3: Onset Detection
    if (this.onsetDetector && this.onsetDetector.isEnabled) {
      const detected = this.onsetDetector.detectOnset(audioData);
      if (detected) {
        // Visual feedback on onset for layer generators
        [this.deckA, this.deckB].forEach(deck => {
          deck.layers.forEach(layer => {
            if (layer.contentType === 'generator' && layer.content && layer.content.instance) {
              if (typeof layer.content.instance.onOnset === 'function') {
                layer.content.instance.onOnset();
              }
            }
          });
        });
      }
    }

    // Phase 3: Pitch Detection
    if (this.pitchDetector && this.pitchDetector.isEnabled) {
      const pitchData = this.pitchDetector.detectPitch(audioData);
      this.currentPitchData = pitchData; // Store for updateUI
    }

    // Phase 3: LFO
    if (this.lfo && this.lfo.isEnabled) {
      const lfoValue = this.lfo.getValue();
      // LFO can modulate layer generators if supported
      [this.deckA, this.deckB].forEach(deck => {
        deck.layers.forEach(layer => {
          if (layer.contentType === 'generator' && layer.content && layer.content.instance) {
            if (typeof layer.content.instance.setLFOValue === 'function') {
              layer.content.instance.setLFOValue(lfoValue);
            }
          }
        });
      });
    }

    // Phase 3: Update layer meshes (video and generators)
    [this.deckA, this.deckB].forEach(deck => {
      deck.layers.forEach(layer => {
        if (layer.isActive) {
          // Resolve audio source per layer (generator clips may have their own source setting)
          const settings = layer.clipRef && layer.clipRef.audioSettings;
          const source = settings && settings.source;
          const layerAudio = (source && source !== 'current')
            ? this.audioEngine.getAudioDataFromSource(source)
            : audioData;
          layer.updateMesh(layerAudio, deltaTime);
        }
      });
    });

    // Apply crossfader mix to deck groups (with layer opacity preservation)
    if (this.mixer && this.renderEngine) {
      this.mixer.applyMix(
        this.renderEngine.deckA, 
        this.renderEngine.deckB,
        this.deckA.layers,
        this.deckB.layers
      );
    }

    // Collect all enabled effects from active layers' clips for rendering
    {
      // Build a combined ordered effect list: DeckA layers then DeckB layers
      const allClipEffects = [];
      [this.deckA, this.deckB].forEach(deck => {
        deck.layers.forEach(layer => {
          if (layer.isActive && layer.clipRef && layer.clipRef.effectManager) {
            const enabled = layer.clipRef.effectManager.getAllEffects().filter(e => e.enabled);
            allClipEffects.push(...enabled);
          }
        });
      });
      // Inject a temporary synthetic effectManager into the render engine
      if (!this._compositeEffectManager) {
        this._compositeEffectManager = new EffectManager();
      }
      this._compositeEffectManager.effects = allClipEffects;
      this.renderEngine.effectManager = this._compositeEffectManager;
    }

    this.renderEngine.render();
    this.updateUI(audioData);

    const targetFrameTime = 1000 / this.config.targetFPS;
    const nextFrameDelay = Math.max(0, targetFrameTime - (performance.now() - now));
    this.animationId = setTimeout(this.render, nextFrameDelay);
  };

  updateUI(audioData) {
    const t = (key) => this.languageManager.t(key);

    // Redraw waveform playhead every frame while audio is playing
    if (this.audioEngine.audioFilePlayer?.isPlaying) {
      this.drawWaveform();
    }
    
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${t('fps')} ${this.renderEngine.getFPS()}`;
    }

    if (this.timeDisplay) {
      // Use currentTime for audio playback position, timestamp for realtime
      const timeValue = audioData.currentTime || audioData.timestamp;
      const seconds = Math.floor(timeValue);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      const durSeconds = Math.floor(audioData.duration || 0);
      const durMins = Math.floor(durSeconds / 60);
      const durSecs = durSeconds % 60;
      
      if (audioData.duration > 0) {
        // Show current/duration for audio file playback
        this.timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')} / ${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')}`;
      } else {
        // Show elapsed time for live input
        this.timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }

    // Phase 3: Pitch Display
    if (this.currentPitchData && this.pitchDetector && this.pitchDetector.isEnabled) {
      if (this.pitchDisplay) {
        if (this.currentPitchData.detected) {
          this.pitchDisplay.textContent = `${t('pitch')} ${this.currentPitchData.note} (${this.currentPitchData.frequency.toFixed(2)} Hz)`;
        } else {
          this.pitchDisplay.textContent = `${t('pitch')} -`;
        }
      }
    }

    // Update BPM display
    if (this.bpmDisplay && this.beatDetector.isEnabled) {
      const bpm = Math.round(this.beatDetector.bpm);
      this.bpmDisplay.textContent = bpm > 0 ? `BPM: ${bpm}` : 'BPM: --';
    }
    
    // Phase 2: Update effect count across active clips
    if (this.masterEffectCountDiv) {
      let count = 0;
      [this.deckA, this.deckB].forEach(deck => {
        deck.layers.forEach(layer => {
          if (layer.isActive && layer.clipRef && layer.clipRef.effectManager) {
            count += layer.clipRef.effectManager.getAllEffects().length;
          }
        });
      });
      this.masterEffectCountDiv.textContent = `${count} effect${count !== 1 ? 's' : ''}`;
    }
    
    // Phase 6: Update performance monitor
    if (this.performanceMonitor) {
      const metrics = this.performanceMonitor.getMetrics();
      const status = this.performanceMonitor.getStatus();
      
      // Update FPS display
      if (this.performanceFPS) {
        this.performanceFPS.textContent = `${metrics.fps.toFixed(1)} FPS`;
        this.performanceFPS.className = 'performance-stat';
        if (status === 'critical') {
          this.performanceFPS.classList.add('critical');
        } else if (status === 'warning') {
          this.performanceFPS.classList.add('warning');
        } else {
          this.performanceFPS.classList.add('good');
        }
      }
      
      // Update memory display
      if (this.performanceMemory && metrics.memoryUsage !== null) {
        this.performanceMemory.textContent = `Memory: ${metrics.memoryUsage.toFixed(1)}%`;
        this.performanceMemory.className = 'performance-stat';
        if (metrics.memoryUsage > 80) {
          this.performanceMemory.classList.add('critical');
        } else if (metrics.memoryUsage > 60) {
          this.performanceMemory.classList.add('warning');
        } else {
          this.performanceMemory.classList.add('good');
        }
      }
      
      // Update warnings display
      if (this.performanceWarnings && metrics.warnings.length > 0) {
        this.performanceWarnings.textContent = metrics.warnings[metrics.warnings.length - 1];
        this.performanceWarnings.style.display = 'block';
      } else if (this.performanceWarnings) {
        this.performanceWarnings.style.display = 'none';
      }
    }
    
    // Update Safe Mode status
    if (this.safeModeManager && this.safeModeBtn) {
      const status = this.safeModeManager.getStatus();
      if (status.isActive) {
        this.safeModeBtn.textContent = `Safe Mode: ON (${status.currentLevel.toUpperCase()})`;
        this.safeModeBtn.style.backgroundColor = '#cc6600';
      } else if (status.enabled) {
        this.safeModeBtn.textContent = 'Safe Mode: ON';
        this.safeModeBtn.style.backgroundColor = '#006600';
      }
    }
    
    // Update clip preview for generators
    this.updateClipPreviews(audioData);
    
    // Update waveform display (throttled to 15fps)
    if (!this._waveformFrameCount) this._waveformFrameCount = 0;
    this._waveformFrameCount++;
    if (this._waveformFrameCount % 4 === 0) {
      this.drawWaveform();
    }
  }
  
  updateClipPreviews(audioData) {
    // Throttle preview updates to 15fps (every 4th frame at 60fps)
    if (!this._previewFrameCount) this._previewFrameCount = 0;
    this._previewFrameCount++;
    if (this._previewFrameCount % 4 !== 0) return;
    
    // Update generator previews (only visible cells)
    document.querySelectorAll('.clip-cell[data-generator-id]').forEach(cell => {
      const preview = cell.querySelector('.clip-preview');
      if (!preview || preview.style.display === 'none') return;
      
      // Skip if cell is not visible on screen
      const rect = cell.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight ||
          rect.right < 0 || rect.left > window.innerWidth) {
        return;
      }
      
      const index = parseInt(cell.dataset.clipIndex);
      const row = Math.floor(index / 11);
      const col = index % 11;
      const clip = this.clipMatrix.getClip(row, col);
      
      if (clip && clip.type === 'generator' && clip.content && clip.content.instance) {
        const ctx = preview.getContext('2d');
        
        // Create a temporary mini scene for preview rendering
        if (!cell._previewRenderer) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = preview.width;
          tempCanvas.height = preview.height;
          const tempRenderer = new THREE.WebGLRenderer({ canvas: tempCanvas, alpha: true });
          const tempScene = new THREE.Scene();
          const tempCamera = new THREE.PerspectiveCamera(45, preview.width / preview.height, 0.1, 1000);
          tempCamera.position.z = 10;
          
          cell._previewRenderer = tempRenderer;
          cell._previewScene = tempScene;
          cell._previewCamera = tempCamera;
          
          // Add generator mesh to preview scene
          const mesh = clip.content.instance.getMesh();
          if (mesh) {
            tempScene.add(mesh);
          }
        }
        
        // Update and render generator
        clip.content.instance.update(audioData, performance.now() * 0.001);
        cell._previewRenderer.render(cell._previewScene, cell._previewCamera);
        
        // Copy to preview canvas
        ctx.drawImage(cell._previewRenderer.domElement, 0, 0);
      }
    });
  }
}


export default WavJeApplication;