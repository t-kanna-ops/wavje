import './styles/main.css';
import * as THREE from 'three';

// ── Make THREE globally accessible (all class files reference THREE as a global) ──
window.THREE = THREE;

// ── Audio ────────────────────────────────────────────────────────────────────────
import AudioFilePlayer from './audio/AudioFilePlayer.js';
import OnsetDetector from './audio/OnsetDetector.js';
import PitchDetector from './audio/PitchDetector.js';
import WavJeAudioEngine from './audio/WavJeAudioEngine.js';
import BeatDetector from './audio/BeatDetector.js';
import StrobeSync from './audio/StrobeSync.js';

// ── MIDI ─────────────────────────────────────────────────────────────────────────
import MIDILearn from './midi/MIDILearn.js';
import MIDIController from './midi/MIDIController.js';

// ── Video ────────────────────────────────────────────────────────────────────────
import CameraController from './video/CameraController.js';
import VideoRecorder from './video/VideoRecorder.js';
import VideoClip from './video/VideoClip.js';

// ── Engine ───────────────────────────────────────────────────────────────────────
import WavJe3DEngine from './engine/WavJe3DEngine.js';
import Layer from './engine/Layer.js';
import Deck from './engine/Deck.js';
import ClipMatrix from './engine/ClipMatrix.js';
import Mixer from './engine/Mixer.js';

// ── Effects ──────────────────────────────────────────────────────────────────────
import ColorCorrection from './effects/ColorCorrection.js';
import TransitionShaders from './effects/TransitionShaders.js';
import TransitionManager from './effects/TransitionManager.js';
import EffectPresetManager from './effects/EffectPresetManager.js';
import { EffectShaders, Effect, EffectManager } from './effects/EffectSystem.js';

// ── Modulation ───────────────────────────────────────────────────────────────────
import LFO from './modulation/LFO.js';
import { ModulationSource, Modulation, ModulationMatrix } from './modulation/index.js';

// ── IO ───────────────────────────────────────────────────────────────────────────
import AutoSaveManager from './io/AutoSaveManager.js';
import FileSystemManager from './io/FileSystemManager.js';
import SessionManager from './io/SessionManager.js';

// ── UI ───────────────────────────────────────────────────────────────────────────
import LUTManager from './ui/LUTManager.js';
import TextRenderer from './ui/TextRenderer.js';
import LanguageManager from './ui/LanguageManager.js';
import DragDropManager from './ui/DragDropManager.js';
import KeyboardShortcutManager from './ui/KeyboardShortcutManager.js';
import PerformanceMonitor from './ui/PerformanceMonitor.js';
import KeyboardMapper from './ui/KeyboardMapper.js';

// ── Utils ────────────────────────────────────────────────────────────────────────
import SafeModeManager from './utils/SafeModeManager.js';

// ── Generators ───────────────────────────────────────────────────────────────────
import DancingCubesGenerator from './generators/DancingCubesGenerator.js';
import { OscilloscopeGenerator, NeonStringGenerator, TerrainLineGenerator } from './generators/WaveformGenerators.js';
import { CircularSpectrumGenerator, CityscapeBarsGenerator, FluidSpectrumGenerator } from './generators/SpectrumGenerators.js';
import { GaussianRipplesGenerator, StarfieldWarpGenerator, ReactionDiffusionGenerator } from './generators/AbstractGenerators.js';

// ── App ──────────────────────────────────────────────────────────────────────────
import WavJeApplication from './app/WavJeApplication.js';

// ── Expose all classes globally so cross-module references resolve correctly ──────
// (Class methods in separate modules reference sibling classes by name;
//  they resolve through window = globalThis in the browser.)
Object.assign(window, {
  // Audio
  AudioFilePlayer, OnsetDetector, PitchDetector,
  WavJeAudioEngine, BeatDetector, StrobeSync,
  // MIDI
  MIDILearn, MIDIController,
  // Video
  CameraController, VideoRecorder, VideoClip,
  // Engine
  WavJe3DEngine, Layer, Deck, ClipMatrix, Mixer,
  // Effects
  ColorCorrection, TransitionShaders, TransitionManager,
  EffectPresetManager, EffectShaders, Effect, EffectManager,
  // Modulation
  LFO, ModulationSource, Modulation, ModulationMatrix,
  // IO
  AutoSaveManager, FileSystemManager, SessionManager,
  // UI
  LUTManager, TextRenderer, LanguageManager, DragDropManager,
  KeyboardShortcutManager, PerformanceMonitor, KeyboardMapper,
  // Utils
  SafeModeManager,
  // Generators
  DancingCubesGenerator,
  OscilloscopeGenerator, NeonStringGenerator, TerrainLineGenerator,
  CircularSpectrumGenerator, CityscapeBarsGenerator, FluidSpectrumGenerator,
  GaussianRipplesGenerator, StarfieldWarpGenerator, ReactionDiffusionGenerator,
  // App
  WavJeApplication,
});

// ── Helpers ──────────────────────────────────────────────────────────────────────
function updateLoadStatus(message) {
  const statusEl = document.getElementById('load-status');
  if (statusEl) {
    statusEl.textContent = message;
    console.log('Status:', message);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────────
async function initWavJe() {
  const loadingMsg = document.getElementById('loading-message');
  const errorMsg = document.getElementById('error-message');

  try {
    updateLoadStatus('Creating application...');

    const app = new WavJeApplication({
      targetFPS: 60,
      bpm: 120,
      masterVolume: 1,
    });

    // Make app globally accessible for MIDI modulation callbacks
    window.app = app;

    updateLoadStatus('Requesting microphone access...');

    try {
      await app.initialize();
      updateLoadStatus('Microphone ready!');
      console.log('✓ WavJe with Microphone Ready');
    } catch (error) {
      updateLoadStatus('Microphone denied. Using debug mode...');
      console.warn('⚠ Microphone access denied or failed:', error);
      console.log('ℹ Starting in Debug Mode instead...');

      app.audioEngine.startDebugMode(app.config.bpm, 60);
      app.switchGenerator('dancing-cubes');
      if (app.debugBtn) app.debugBtn.style.backgroundColor = '#2d5016';
    }

    updateLoadStatus('Starting playback...');
    console.log('✓ Auto-starting playback...');
    app.play();

    setTimeout(() => { loadingMsg.style.display = 'none'; }, 1000);

    window.wavje = app;
    console.log('✓ WavJe Ready');
    console.log('ℹ If cubes are not moving, check Debug Mode button or grant microphone permission');

  } catch (error) {
    console.error('✗ Initialization error:', error);
    errorMsg.textContent = 'Error: ' + error.message;
    errorMsg.style.display = 'block';
    loadingMsg.style.display = 'none';
  }
}

// ES modules are deferred — DOM is already parsed when this runs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWavJe);
} else {
  initWavJe();
}

// Timeout fallback
setTimeout(() => {
  const loadingMsg = document.getElementById('loading-message');
  const errorMsg = document.getElementById('error-message');
  if (loadingMsg && loadingMsg.style.display !== 'none') {
    errorMsg.textContent = 'Error: Initialization timed out. Check browser console (F12) for details.';
    errorMsg.style.display = 'block';
    loadingMsg.style.display = 'none';
  }
}, 10000);
