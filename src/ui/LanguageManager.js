// ===== Phase 4: Language Manager =====
class LanguageManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {
      en: {
        // Header
        title: 'WavJe - Audio Reactive VJ System',
        
        // File Loading
        loadAudio: 'Load Audio',
        loadVideo: 'Load Video',
        loadLUT: 'Load LUT',
        
        // Playback Controls
        play: 'Play',
        pause: 'Pause',
        stop: 'Stop',
        
        // Audio Mode
        audioMode: 'Audio Mode:',
        microphone: 'Microphone',
        audioFile: 'Audio File',
        
        // Generator
        generator: 'Generator:',
        none: 'None',
        
        // Phase 1 Features
        beatDetect: 'Beat Detect:',
        off: 'OFF',
        on: 'ON',
        beatSens: 'Beat Sens:',
        bpm: 'BPM:',
        transition: 'Transition:',
        strobe: 'Strobe:',
        strobePattern: 'Pattern:',
        everyBeat: 'Every Beat',
        halfBeat: 'Half Beat',
        quarterBeat: 'Quarter Beat',
        doubleBeat: 'Double Beat',
        savePreset: 'Save Preset',
        loadPreset: 'Load Preset',
        autoSave: 'Auto-Save:',
        saveInterval: 'Save Interval (min):',
        
        // Phase 2 Features
        addText: 'Add Text',
        hue: 'Hue:',
        saturation: 'Saturation:',
        brightness: 'Brightness:',
        gamma: 'Gamma:',
        temperature: 'Temperature:',
        tint: 'Tint:',
        contrast: 'Contrast:',
        
        // Phase 3 Features
        recordVideo: 'Record Video',
        recording: '⏺ Recording...',
        onsetDetect: 'Onset Detect:',
        onsetSens: 'Onset Sens:',
        pitchDetect: 'Pitch Detect:',
        pitch: 'Pitch:',
        lfo: 'LFO:',
        lfoWave: 'LFO Wave:',
        sine: 'Sine',
        triangle: 'Triangle',
        square: 'Square',
        sawtooth: 'Sawtooth',
        random: 'Random',
        lfoFreq: 'LFO Freq (Hz):',
        midiLearn: 'MIDI Learn',
        midiExport: 'MIDI Export',
        
        // UI Elements
        fps: 'FPS:',
        debug: 'Debug',
        language: 'Language',
      },
      ja: {
        // Header
        title: 'WavJe - オーディオリアクティブVJシステム',
        
        // File Loading
        loadAudio: 'オーディオ読込',
        loadVideo: 'ビデオ読込',
        loadLUT: 'LUT読込',
        
        // Playback Controls
        play: '再生',
        pause: '一時停止',
        stop: '停止',
        
        // Audio Mode
        audioMode: 'オーディオモード:',
        microphone: 'マイク',
        audioFile: 'オーディオファイル',
        
        // Generator
        generator: 'ジェネレーター:',
        none: 'なし',
        
        // Phase 1 Features
        beatDetect: 'ビート検出:',
        off: 'オフ',
        on: 'オン',
        beatSens: 'ビート感度:',
        bpm: 'BPM:',
        transition: 'トランジション:',
        strobe: 'ストロボ:',
        strobePattern: 'パターン:',
        everyBeat: '毎ビート',
        halfBeat: '半ビート',
        quarterBeat: '4分の1ビート',
        doubleBeat: '2倍ビート',
        savePreset: 'プリセット保存',
        loadPreset: 'プリセット読込',
        autoSave: '自動保存:',
        saveInterval: '保存間隔(分):',
        
        // Phase 2 Features
        addText: 'テキスト追加',
        hue: '色相:',
        saturation: '彩度:',
        brightness: '明度:',
        gamma: 'ガンマ:',
        temperature: '色温度:',
        tint: '色合い:',
        contrast: 'コントラスト:',
        
        // Phase 3 Features
        recordVideo: 'ビデオ録画',
        recording: '⏺ 録画中...',
        onsetDetect: 'アタック検出:',
        onsetSens: 'アタック感度:',
        pitchDetect: 'ピッチ検出:',
        pitch: 'ピッチ:',
        lfo: 'LFO:',
        lfoWave: 'LFO波形:',
        sine: 'サイン波',
        triangle: '三角波',
        square: '矩形波',
        sawtooth: 'ノコギリ波',
        random: 'ランダム',
        lfoFreq: 'LFO周波数(Hz):',
        midiLearn: 'MIDI学習',
        midiExport: 'MIDIエクスポート',
        
        // UI Elements
        fps: 'FPS:',
        debug: 'デバッグ',
        language: '言語',
      }
    };
    
    // Load saved language from localStorage
    const saved = localStorage.getItem('wavje_language');
    if (saved && this.translations[saved]) {
      this.currentLanguage = saved;
    }
  }
  
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('wavje_language', lang);
      console.log(`✓Language set to: ${lang}`);
      return true;
    }
    return false;
  }
  
  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  }
  
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
}


export default LanguageManager;