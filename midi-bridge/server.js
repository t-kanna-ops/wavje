'use strict';
/**
 * WavJe MIDI Bridge
 * ─────────────────
 * Node.js で MIDI ↔ WebSocket を仲介するローカルサーバー。
 * Chromeの Web MIDI API (WinMM) が Windows MIDI Services の
 * 仮想ポートを認識できない場合の代替手段として使用します。
 *
 * 使い方:
 *   npm run bridge
 *
 * その後ブラウザのデバイス設定パネルで「MIDIブリッジ接続」を押す。
 *
 * 仮想ポートの作成について:
 *   Windows では node-midi (RtMidi/WinMM) からの openVirtualPort() は
 *   サポートされていません。代わりに以下を使ってください:
 *     - Windows MIDI Services の組み込みLoopbackエンドポイント
 *       (設定 → Bluetooth とデバイス → その他のデバイス → MIDI で確認)
 *     - rtpMIDI (Tobias Erichsen 製) - ネットワークMIDIドライバー
 *       https://www.tobias-erichsen.de/software/rtpmidi.html
 *   これらのポートをブリッジで選択してDAWと接続できます。
 */

const { WebSocketServer } = require('ws');
const midi = require('midi');

const WS_PORT = 9001;
const PING_INTERVAL_MS = 25000;

// ── MIDI デバイスインスタンス ──────────────────────────────
const midiIn  = new midi.Input();
const midiOut = new midi.Output();
midiIn.ignoreTypes(false, false, false); // SysEx/Timing/ActiveSense をすべて受信

let activeInputPort  = -1;
let activeOutputPort = -1;

// ── ポート一覧取得 ─────────────────────────────────────────
function getInputPorts() {
  const ports = [];
  for (let i = 0; i < midiIn.getPortCount(); i++) {
    ports.push({ id: i, name: midiIn.getPortName(i) });
  }
  return ports;
}

function getOutputPorts() {
  const ports = [];
  for (let i = 0; i < midiOut.getPortCount(); i++) {
    ports.push({ id: i, name: midiOut.getPortName(i) });
  }
  return ports;
}

// ── MIDIイン → ブラウザ ───────────────────────────────────
const clients = new Set();

midiIn.on('message', (_deltaTime, message) => {
  const payload = JSON.stringify({ type: 'midi_in', data: Array.from(message) });
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  }
});

// ── WebSocket サーバー ─────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT, host: '127.0.0.1' });

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[Bridge] ブラウザ接続 (合計: ${clients.size})`);

  // 接続直後にポート一覧を送信
  ws.send(JSON.stringify({
    type: 'ports',
    inputs:       getInputPorts(),
    outputs:      getOutputPorts(),
    activeInput:  activeInputPort,
    activeOutput: activeOutputPort,
  }));

  // キープアライブ ping
  const pingTimer = setInterval(() => {
    if (ws.readyState === 1) ws.ping();
  }, PING_INTERVAL_MS);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {

        case 'open_input': {
          if (activeInputPort >= 0) {
            try { midiIn.closePort(); } catch (_) {}
          }
          midiIn.openPort(msg.id);
          activeInputPort = msg.id;
          const name = midiIn.getPortName(msg.id);
          console.log(`[Bridge] 入力ポートを開きました: ${name}`);
          broadcast({ type: 'status', activeInput: msg.id, inputName: name });
          break;
        }

        case 'open_output': {
          if (activeOutputPort >= 0) {
            try { midiOut.closePort(); } catch (_) {}
          }
          midiOut.openPort(msg.id);
          activeOutputPort = msg.id;
          const name = midiOut.getPortName(msg.id);
          console.log(`[Bridge] 出力ポートを開きました: ${name}`);
          broadcast({ type: 'status', activeOutput: msg.id, outputName: name });
          break;
        }

        case 'midi_out': {
          if (activeOutputPort >= 0 && Array.isArray(msg.data)) {
            midiOut.sendMessage(msg.data);
          }
          break;
        }

        case 'rescan': {
          ws.send(JSON.stringify({
            type:         'ports',
            inputs:       getInputPorts(),
            outputs:      getOutputPorts(),
            activeInput:  activeInputPort,
            activeOutput: activeOutputPort,
          }));
          break;
        }
      }
    } catch (e) {
      console.error('[Bridge] メッセージエラー:', e.message);
    }
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    clients.delete(ws);
    console.log(`[Bridge] ブラウザ切断 (残: ${clients.size})`);
  });
});

// ── 起動ログ ───────────────────────────────────────────────
console.log('┌──────────────────────────────────────────────┐');
console.log('│  WavJe MIDI Bridge  v1.0                     │');
console.log(`│  WebSocket: ws://localhost:${WS_PORT}              │`);
console.log('│  ブラウザでの接続を待機中...                 │');
console.log('└──────────────────────────────────────────────┘');

const ins  = getInputPorts();
const outs = getOutputPorts();

if (ins.length === 0) {
  console.log('⚠  MIDI入力が見つかりません。');
  console.log('   Windows MIDI Services のLoopbackエンドポイントまたは');
  console.log('   rtpMIDI を起動してからブリッジを再起動してください。');
} else {
  console.log(`✓ MIDI入力 (${ins.length}件):`);
  ins.forEach(p => console.log(`    [${p.id}] ${p.name}`));
}

if (outs.length === 0) {
  console.log('⚠  MIDI出力が見つかりません。');
} else {
  console.log(`✓ MIDI出力 (${outs.length}件):`);
  outs.forEach(p => console.log(`    [${p.id}] ${p.name}`));
}

// ── 終了処理 ───────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[Bridge] 終了中...');
  try { if (activeInputPort  >= 0) midiIn.closePort();  } catch (_) {}
  try { if (activeOutputPort >= 0) midiOut.closePort(); } catch (_) {}
  wss.close(() => process.exit(0));
});
