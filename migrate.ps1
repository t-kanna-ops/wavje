# =============================================================
# WavJe Migration Script
# index.html -> Vite + ES Modules project structure
# Usage: .\migrate.ps1
# =============================================================

$root = "c:\my_rust_project\WavJe-Portable"
$html = Get-Content "$root\index.html" -Encoding UTF8

$enc = [System.Text.UTF8Encoding]::new($false) # BOM-less UTF-8

function Get-Section([int]$start, [int]$end) {
    # 1-indexed line numbers -> 0-indexed PS array
    $lines = $html[($start - 1)..($end - 1)]
    # Remove the 4-space HTML indentation from every line
    ($lines | ForEach-Object { $_ -replace '^    ', '' }) -join "`n"
}

function Write-Module([string]$relPath, [string]$content) {
    $fullPath = Join-Path $root $relPath
    $dir = Split-Path $fullPath
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($fullPath, $content, $enc)
    Write-Host "  [OK] $relPath"
}

function Make-Module([string]$relPath, [int]$start, [int]$end, [string]$exportLine) {
    $body = Get-Section $start $end
    Write-Module $relPath "$body`n`n$exportLine"
}

# ── Backup original index.html ─────────────────────────────────
Copy-Item "$root\index.html" "$root\index.html.original" -Force
Write-Host "[OK] Backed up original index.html -> index.html.original"
Write-Host ""

# ── CSS ────────────────────────────────────────────────────────
Write-Host "Extracting CSS..."
$css = Get-Section 8 372
Write-Module "src\styles\main.css" $css

# ── Audio ──────────────────────────────────────────────────────
Write-Host "`nExtracting Audio modules..."
Make-Module "src\audio\AudioFilePlayer.js"  477  595  "export default AudioFilePlayer;"
Make-Module "src\audio\OnsetDetector.js"   1322 1422  "export default OnsetDetector;"
Make-Module "src\audio\PitchDetector.js"   1423 1548  "export default PitchDetector;"
Make-Module "src\audio\WavJeAudioEngine.js" 2439 2652 "export default WavJeAudioEngine;"
Make-Module "src\audio\BeatDetector.js"    2897 3094  "export default BeatDetector;"
Make-Module "src\audio\StrobeSync.js"      3534 3627  "export default StrobeSync;"

# ── MIDI ───────────────────────────────────────────────────────
Write-Host "`nExtracting MIDI modules..."
Make-Module "src\midi\MIDILearn.js"      1249 1321  "export default MIDILearn;"
Make-Module "src\midi\MIDIController.js" 5658 5945  "export default MIDIController;"

# ── Video ──────────────────────────────────────────────────────
Write-Host "`nExtracting Video modules..."
Make-Module "src\video\CameraController.js" 862  950  "export default CameraController;"
Make-Module "src\video\VideoRecorder.js"   1089 1248  "export default VideoRecorder;"
Make-Module "src\video\VideoClip.js"       4986 5085  "export default VideoClip;"

# ── Engine ─────────────────────────────────────────────────────
Write-Host "`nExtracting Engine modules..."
Make-Module "src\engine\WavJe3DEngine.js" 3697 4103  "export default WavJe3DEngine;"
Make-Module "src\engine\Layer.js"         5086 5278  "export default Layer;"
Make-Module "src\engine\Deck.js"          5279 5311  "export default Deck;"
Make-Module "src\engine\ClipMatrix.js"    5312 5534  "export default ClipMatrix;"
Make-Module "src\engine\Mixer.js"         5535 5596  "export default Mixer;"

# ── Effects ────────────────────────────────────────────────────
Write-Host "`nExtracting Effects modules..."
Make-Module "src\effects\ColorCorrection.js"     951  1088  "export default ColorCorrection;"
Make-Module "src\effects\TransitionShaders.js"  2653  2896  "export default TransitionShaders;"
Make-Module "src\effects\TransitionManager.js"  3095  3316  "export default TransitionManager;"
Make-Module "src\effects\EffectPresetManager.js" 3317 3533  "export default EffectPresetManager;"
Make-Module "src\effects\EffectSystem.js"        4373  4985  "export { EffectShaders, Effect, EffectManager };"

# ── Modulation ─────────────────────────────────────────────────
Write-Host "`nExtracting Modulation modules..."
Make-Module "src\modulation\LFO.js"   1549 1631  "export default LFO;"
Make-Module "src\modulation\index.js" 4104 4372  "export { ModulationSource, Modulation, ModulationMatrix };"

# ── IO ─────────────────────────────────────────────────────────
Write-Host "`nExtracting IO modules..."
Make-Module "src\io\AutoSaveManager.js"    3628 3696  "export default AutoSaveManager;"
Make-Module "src\io\FileSystemManager.js"  5946 6050  "export default FileSystemManager;"
Make-Module "src\io\SessionManager.js"     6051 6143  "export default SessionManager;"

# ── UI ─────────────────────────────────────────────────────────
Write-Host "`nExtracting UI modules..."
Make-Module "src\ui\LUTManager.js"              596  701  "export default LUTManager;"
Make-Module "src\ui\TextRenderer.js"            702  861  "export default TextRenderer;"
Make-Module "src\ui\LanguageManager.js"        1632 1816  "export default LanguageManager;"
Make-Module "src\ui\DragDropManager.js"        1817 1969  "export default DragDropManager;"
Make-Module "src\ui\KeyboardShortcutManager.js" 1970 2088  "export default KeyboardShortcutManager;"
Make-Module "src\ui\PerformanceMonitor.js"     2089 2226  "export default PerformanceMonitor;"
Make-Module "src\ui\KeyboardMapper.js"         5597 5657  "export default KeyboardMapper;"

# ── Utils ──────────────────────────────────────────────────────
Write-Host "`nExtracting Utils modules..."
Make-Module "src\utils\SafeModeManager.js" 2227 2438  "export default SafeModeManager;"

# ── Generators ─────────────────────────────────────────────────
Write-Host "`nExtracting Generator modules..."
Make-Module "src\generators\DancingCubesGenerator.js" 6144 6215  "export default DancingCubesGenerator;"
Make-Module "src\generators\WaveformGenerators.js"    6216 6374  "export { OscilloscopeGenerator, NeonStringGenerator, TerrainLineGenerator };"
Make-Module "src\generators\SpectrumGenerators.js"    6375 6555  "export { CircularSpectrumGenerator, CityscapeBarsGenerator, FluidSpectrumGenerator };"
Make-Module "src\generators\AbstractGenerators.js"    6556 6755  "export { GaussianRipplesGenerator, StarfieldWarpGenerator, ReactionDiffusionGenerator };"

# ── App ────────────────────────────────────────────────────────
Write-Host "`nExtracting Application class..."
Make-Module "src\app\WavJeApplication.js" 6756 10339  "export default WavJeApplication;"

# ── New index.html ─────────────────────────────────────────────
Write-Host "`nWriting new index.html..."
$newHtml = @'
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WavJe - Audio-Reactive VJ</title>
</head>
<body>
  <div id="loading-message">
    <div>Loading WavJe...</div>
    <div class="status" id="load-status">Initializing...</div>
  </div>
  <div id="error-message"></div>

  <div id="main-container">
    <!-- Top Section: 1920x640 -->
    <div id="top-section">
      <!-- Left: Deck Panel 480x640 -->
      <div id="deck-panel">
        <div class="panel-title">DECKS & MIXER</div>
        <div id="deck-controls"></div>
      </div>

      <!-- Center: Clip Grid + Transport + Waveform 960x640 -->
      <div id="center-panel">
        <div id="clip-grid"></div>
        <div id="transport-panel"></div>
        <div id="waveform-panel">
          <canvas id="waveform-canvas"></canvas>
        </div>
      </div>

      <!-- Right: Preview + Composition 480x640 -->
      <div id="right-panel">
        <div id="preview-container">
          <div id="canvas-container"></div>
        </div>
        <div id="composition-settings">
          <div class="panel-title">COMPOSITION SETTINGS</div>
          <div id="comp-controls"></div>
        </div>
      </div>
    </div>

    <!-- Bottom Section: 1920x440 -->
    <div id="bottom-section">
      <!-- Left: Device Settings 480x440 -->
      <div id="device-panel">
        <div class="panel-title">DEVICE SETTINGS</div>
        <div id="device-controls"></div>
      </div>

      <!-- Center: Inspector 960x440 -->
      <div id="inspector-panel">
        <div class="panel-title">CLIP INSPECTOR</div>
        <div id="inspector-content">
          <p style="color: #666;">Select a clip to view details</p>
        </div>
      </div>

      <!-- Right: Project Management 480x440 -->
      <div id="project-panel">
        <div class="panel-title">PROJECT MANAGEMENT</div>
        <div id="project-controls"></div>
      </div>
    </div>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
'@

[System.IO.File]::WriteAllText("$root\index.html", $newHtml, $enc)
Write-Host "  [OK] index.html"

Write-Host ""
Write-Host "============================================"
Write-Host " Migration complete!"
Write-Host " Next steps:"
Write-Host "   cd $root"
Write-Host "   npm install"
Write-Host "   npm run dev"
Write-Host ""
Write-Host " NOTE: Move video-clips/ -> public/video-clips/"
Write-Host " for correct static asset serving in Vite."
Write-Host "============================================"
