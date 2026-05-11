// ===== MIDI Controller =====
class MIDIController {
  constructor(clipMatrix, deckA, deckB, mixer, cameraController = null, scene = null) {
    this.clipMatrix = clipMatrix;
    this.deckA = deckA;
    this.deckB = deckB;
    this.mixer = mixer;
    this.cameraController = cameraController;
    this.scene = scene;
    this.midiAccess = null;
    this.selectedDevice = null;
    this.currentDeck = deckA;
    this.currentLayerIndex = 0;
  }

  setScene(scene) {
    this.scene = scene;
  }

  async initialize() {
    try {
      if (!navigator.requestMIDIAccess) {
        console.warn('⚠ Web MIDI API not supported (requires HTTPS or localhost)');
        return false;
      }
      // sysex:false is sufficient for virtual MIDI devices (loopMIDI etc.)
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.setupDeviceListeners();
      this.setupStateChangeHandler();
      console.log(`✓MIDI initialized — ${this.getDevices().length} device(s) found`);
      return true;
    } catch (error) {
      console.error('✗MIDI initialization failed:', error);
      return false;
    }
  }

  /** Re-request MIDI access (useful after plugging in a virtual device) */
  async rescan() {
    this.selectedDevice = null;
    return this.initialize();
  }

  setupDeviceListeners() {
    if (!this.midiAccess) return;
    
    // Auto-select first available device if any
    const devices = Array.from(this.midiAccess.inputs.values());
    if (devices.length > 0 && !this.selectedDevice) {
      this.selectDevice(devices[0].id);
    }

    // Populate the UI dropdown (DOM may not be ready yet; use rAF to defer)
    requestAnimationFrame(() => this.updateDeviceList());
  }
  
  setupStateChangeHandler() {
    if (!this.midiAccess) return;
    
    this.midiAccess.onstatechange = (event) => {
      const port = event.port;
      console.log(`MIDI device state changed: ${port.name} - ${port.state}`);
      
      if (port.type === 'input') {
        if (port.state === 'connected') {
          // Device connected
          console.log(`✓ MIDI device connected: ${port.name}`);
          
          // Auto-reconnect if it was the previously selected device
          if (this.selectedDevice && this.selectedDevice.id === port.id) {
            console.log('↻ Reconnecting to MIDI device...');
            this.selectDevice(port.id);
          } else if (!this.selectedDevice) {
            // Auto-select if no device is selected
            this.selectDevice(port.id);
          }
          
          // Update UI device list
          this.updateDeviceList();
        } else if (port.state === 'disconnected') {
          // Device disconnected
          console.log(`✗ MIDI device disconnected: ${port.name}`);
          
          if (this.selectedDevice && this.selectedDevice.id === port.id) {
            this.selectedDevice = null;
            console.log('⚠ Active MIDI device lost');
          }
          
          // Update UI device list
          this.updateDeviceList();
        }
      }
    };
  }
  
  updateDeviceList() {
    // Update MIDI device dropdown in UI
    const midiSelect = document.getElementById('midi-input-select');
    if (!midiSelect) return;
    
    const devices = this.getDevices();
    midiSelect.innerHTML = '';
    
    const noMidi = document.createElement('option');
    noMidi.textContent = 'No MIDI';
    noMidi.value = '';
    midiSelect.appendChild(noMidi);
    
    devices.forEach(device => {
      const option = document.createElement('option');
      option.textContent = device.name;
      option.value = device.id;
      if (this.selectedDevice && this.selectedDevice.id === device.id) {
        option.selected = true;
      }
      midiSelect.appendChild(option);
    });
  }

  getDevices() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values());
  }

  selectDevice(deviceId) {
    if (!this.midiAccess) return;
    
    const device = this.midiAccess.inputs.get(deviceId);
    if (device) {
      // Disconnect previous device
      if (this.selectedDevice) {
        this.selectedDevice.onmidimessage = null;
      }
      
      this.selectedDevice = device;
      device.onmidimessage = (event) => this.handleMIDIMessage(event);
      console.log(`✓MIDI device selected: ${device.name}`);
    }
  }

  handleMIDIMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status & 0xF0;
    const channel = status & 0x0F;
    
    switch (command) {
      case 0x90: // Note On
        if (data2 > 0) { // velocity > 0
          this.handleNoteOn(data1, data2);
        }
        break;
      case 0xB0: // Control Change
        this.handleControlChange(data1, data2);
        break;
    }
  }

  handleNoteOn(note, velocity) {
    // MIDI Note mapping to grid
    // C0 (note 24) = row 0, col 0
    // A#0 (note 34) = row 0, col 10
    // B0 (note 35) = row 1, col 0
    // G#2 (note 56) = row 2, col 10
    
    const gridIndex = note - 24; // C0 = 0
    if (gridIndex >= 0 && gridIndex < 33) {
      const row = Math.floor(gridIndex / 11);
      const col = gridIndex % 11;
      this.clipMatrix.triggerClip(row, col, this.currentDeck, this.currentLayerIndex, this.scene);
    }
  }

  handleControlChange(cc, value) {
    const normalized = value / 127;
    
    // Phase 4: Update Modulation Matrix with MIDI CC data
    if (window.app && window.app.modulationMatrix) {
      window.app.modulationMatrix.updateMIDIData(cc, value);
    }
    
    // Phase 3: MIDI Learn Mode
    if (this.midiLearn && this.midiLearn.isLearning) {
      this.midiLearn.learnCC(cc);
      // Update UI to show learned mapping
      const learnStatusEl = document.getElementById('midiLearnStatus');
      if (learnStatusEl) {
        learnStatusEl.textContent = `Learned: CC${cc} →${this.midiLearn.learningParameter || 'Unknown'}`;
        setTimeout(() => {
          learnStatusEl.textContent = '';
        }, 2000);
      }
      return;
    }
    
    // Phase 3: Apply learned MIDI mappings
    if (this.midiLearn && this.midiLearn.hasMapping(cc)) {
      const paramName = this.midiLearn.getParameter(cc);
      // Apply to appropriate parameter (this could be extended)
      console.log(`MIDI Learn: CC${cc} (${normalized.toFixed(3)}) →${paramName}`);
    }
    
    // MIDI CC Mapping (v7.1)
    switch (cc) {
      case 1: // CC1: Crossfader (0-127 → 0.0-1.0)
        this.mixer.setCrossfader(normalized);
        console.log(`MIDI CC1 Crossfader: ${normalized.toFixed(3)}`);
        break;
      
      case 2: // CC2: Deck A Layer 0 Opacity
        if (this.deckA.getLayer(0)) {
          this.deckA.getLayer(0).setOpacity(normalized);
          console.log(`MIDI CC2 Deck A L0 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 3: // CC3: Deck A Layer 1 Opacity
        if (this.deckA.getLayer(1)) {
          this.deckA.getLayer(1).setOpacity(normalized);
          console.log(`MIDI CC3 Deck A L1 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 4: // CC4: Deck A Layer 2 Opacity
        if (this.deckA.getLayer(2)) {
          this.deckA.getLayer(2).setOpacity(normalized);
          console.log(`MIDI CC4 Deck A L2 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 5: // CC5: Deck B Layer 0 Opacity
        if (this.deckB.getLayer(0)) {
          this.deckB.getLayer(0).setOpacity(normalized);
          console.log(`MIDI CC5 Deck B L0 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 6: // CC6: Deck B Layer 1 Opacity
        if (this.deckB.getLayer(1)) {
          this.deckB.getLayer(1).setOpacity(normalized);
          console.log(`MIDI CC6 Deck B L1 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 7: // CC7: Deck B Layer 2 Opacity
        if (this.deckB.getLayer(2)) {
          this.deckB.getLayer(2).setOpacity(normalized);
          console.log(`MIDI CC7 Deck B L2 Opacity: ${normalized.toFixed(3)}`);
        }
        break;
      
      case 8: // CC8: Master Opacity
        this.mixer.setMasterOpacity(normalized);
        console.log(`MIDI CC8 Master Opacity: ${normalized.toFixed(3)}`);
        break;
      
      case 9: // CC9: Playback Speed (0-127 → 0.0-12.7)
        if (window.app && window.app.audioEngine) {
          const speed = value * 0.1; // 0-12.7
          window.app.audioEngine.setPlaybackRate(speed);
          console.log(`MIDI CC9 Speed: ${speed.toFixed(1)}x`);
        }
        break;
      
      case 10: // CC10: Camera X (-20 to +20)
        if (this.cameraController) {
          const camX = (normalized - 0.5) * 40; // -20 to +20
          this.cameraController.setBasePosition(camX, this.cameraController.basePosition.y, this.cameraController.basePosition.z);
          console.log(`MIDI CC10 Camera X: ${camX.toFixed(2)}`);
        }
        break;
      
      case 11: // CC11: Camera Y (-20 to +20)
        if (this.cameraController) {
          const camY = (normalized - 0.5) * 40; // -20 to +20
          this.cameraController.setBasePosition(this.cameraController.basePosition.x, camY, this.cameraController.basePosition.z);
          console.log(`MIDI CC11 Camera Y: ${camY.toFixed(2)}`);
        }
        break;
      
      case 12: // CC12: Camera Z (0.01 to 50)
        if (this.cameraController) {
          const camZ = normalized * 49.99 + 0.01; // 0.01 to 50
          this.cameraController.setBasePosition(this.cameraController.basePosition.x, this.cameraController.basePosition.y, camZ);
          console.log(`MIDI CC12 Camera Z: ${camZ.toFixed(2)}`);
        }
        break;
      
      // CC13-127: Reserved for MIDI Learn (Effect Parameters)
      default:
        if (cc >= 13 && cc <= 127) {
          console.log(`MIDI CC${cc}: ${value} (available for MIDI Learn)`);
        }
        break;
    }
  }

  // ── MIDI Bridge (WebSocket) ─────────────────────────────────────────────

  /**
   * ローカルの MIDI ブリッジサーバー (npm run bridge) に接続する。
   * Chrome の Web MIDI API が WMS 仮想ポートを認識できない場合の代替。
   * @param {string} wsUrl - ブリッジの WebSocket URL (既定: ws://localhost:9001)
   */
  connectBridge(wsUrl = 'ws://localhost:9001') {
    if (this.bridgeSocket) {
      this.bridgeSocket.close();
      this.bridgeSocket = null;
    }

    this._setBridgeStatus('connecting');

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error('[Bridge] 接続失敗:', e);
      this._setBridgeStatus('error');
      return;
    }

    this.bridgeSocket     = ws;
    this.bridgeInputPorts  = [];
    this.bridgeOutputPorts = [];

    ws.onopen = () => {
      console.log('[Bridge] ✓ 接続完了');
      this._setBridgeStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        this._handleBridgeMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('[Bridge] メッセージ解析エラー:', e);
      }
    };

    ws.onclose = () => {
      console.log('[Bridge] 切断');
      this.bridgeSocket = null;
      this._setBridgeStatus('disconnected');
    };

    ws.onerror = () => {
      console.error('[Bridge] エラー — "npm run bridge" が起動しているか確認してください');
      this._setBridgeStatus('error');
    };
  }

  disconnectBridge() {
    if (this.bridgeSocket) {
      this.bridgeSocket.close();
      this.bridgeSocket = null;
    }
  }

  /** ブリッジ経由で MIDI メッセージを送信する (→ DAW) */
  sendMIDIViaBridge(data) {
    if (this.bridgeSocket && this.bridgeSocket.readyState === WebSocket.OPEN) {
      this.bridgeSocket.send(JSON.stringify({ type: 'midi_out', data: Array.from(data) }));
    }
  }

  /** ブリッジ側の MIDI 入力ポートを選択する */
  selectBridgeInputPort(portId) {
    if (this.bridgeSocket && this.bridgeSocket.readyState === WebSocket.OPEN) {
      this.bridgeSocket.send(JSON.stringify({ type: 'open_input', id: portId }));
    }
  }

  /** ブリッジ側の MIDI 出力ポートを選択する */
  selectBridgeOutputPort(portId) {
    if (this.bridgeSocket && this.bridgeSocket.readyState === WebSocket.OPEN) {
      this.bridgeSocket.send(JSON.stringify({ type: 'open_output', id: portId }));
    }
  }

  /** ブリッジにポートの再スキャンを要求する */
  rescanBridgePorts() {
    if (this.bridgeSocket && this.bridgeSocket.readyState === WebSocket.OPEN) {
      this.bridgeSocket.send(JSON.stringify({ type: 'rescan' }));
    }
  }

  _handleBridgeMessage(msg) {
    switch (msg.type) {
      case 'ports':
        this.bridgeInputPorts  = msg.inputs  || [];
        this.bridgeOutputPorts = msg.outputs || [];
        this._updateBridgePortSelects(msg.activeInput, msg.activeOutput);
        break;

      case 'midi_in':
        // ブリッジ経由で受け取った MIDI → 既存のハンドラで処理
        if (Array.isArray(msg.data) && msg.data.length >= 2) {
          this.handleMIDIMessage({ data: new Uint8Array(msg.data) });
        }
        break;

      case 'status':
        if (msg.inputName)  console.log(`[Bridge] 入力: ${msg.inputName}`);
        if (msg.outputName) console.log(`[Bridge] 出力: ${msg.outputName}`);
        break;
    }
  }

  _setBridgeStatus(status) {
    const el = document.getElementById('midi-bridge-status');
    if (!el) return;
    const labels = {
      connected:    '🟢 接続済み',
      connecting:   '🟡 接続中...',
      disconnected: '⚫ 未接続',
      error:        '🔴 エラー (ブリッジ未起動?)',
    };
    el.textContent = labels[status] ?? status;
  }

  _updateBridgePortSelects(activeInput, activeOutput) {
    const inputSel  = document.getElementById('midi-bridge-input-select');
    const outputSel = document.getElementById('midi-bridge-output-select');

    if (inputSel) {
      inputSel.innerHTML = '<option value="">-- 選択してください --</option>';
      this.bridgeInputPorts.forEach(p => {
        const opt = document.createElement('option');
        opt.value   = p.id;
        opt.textContent = p.name;
        if (p.id === activeInput) opt.selected = true;
        inputSel.appendChild(opt);
      });
      inputSel.onchange = (e) => {
        if (e.target.value !== '') this.selectBridgeInputPort(parseInt(e.target.value));
      };
    }

    if (outputSel) {
      outputSel.innerHTML = '<option value="">-- 選択してください --</option>';
      this.bridgeOutputPorts.forEach(p => {
        const opt = document.createElement('option');
        opt.value   = p.id;
        opt.textContent = p.name;
        if (p.id === activeOutput) opt.selected = true;
        outputSel.appendChild(opt);
      });
      outputSel.onchange = (e) => {
        if (e.target.value !== '') this.selectBridgeOutputPort(parseInt(e.target.value));
      };
    }
  }
}


export default MIDIController;