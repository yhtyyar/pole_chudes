// Web Audio API sound manager — synthetic sounds, no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.3,
  volume = 1,
  startOffset = 0,
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
    gain.gain.setValueAtTime(gainVal * volume, ctx.currentTime + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration);
  } catch {
    // silent fail if audio blocked
  }
}

function playFreqSweep(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  gainVal: number,
  volume: number,
  startOffset = 0,
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime + startOffset);
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + startOffset + duration);
    gain.gain.setValueAtTime(gainVal * volume, ctx.currentTime + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration);
  } catch { /* silent */ }
}

// ── Background music ──────────────────────────────────────────────────────────

interface BgMusicState {
  nodes: AudioNode[];
  oscillators: OscillatorNode[];
  gainNode: GainNode | null;
  running: boolean;
  loopTimeoutId: ReturnType<typeof setTimeout> | null;
}

const bgMusic: BgMusicState = {
  nodes: [],
  oscillators: [],
  gainNode: null,
  running: false,
  loopTimeoutId: null,
};

function playBgMusicLoop(volume: number): void {
  if (!bgMusic.running) return;
  try {
    const ctx = getCtx();
    const masterGain = bgMusic.gainNode!;

    // Upbeat game-show style loop — two-bar pattern at ~130bpm
    // bar = 60/130*4 ≈ 1.846s, each 8th note ≈ 0.23s
    const bpm = 132;
    const beat = 60 / bpm;
    const bar = beat * 4;

    // Bass line pattern (root notes of a I-IV-V-I in C)
    const bassNotes = [65, 65, 87, 87, 98, 98, 87, 65]; // F2,F2,B2,B2,D3,D3,B2,F2
    bassNotes.forEach((freq, i) => {
      const t = ctx.currentTime + i * beat * 0.5;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.12 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.45);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t);
      osc.stop(t + beat * 0.5);
    });

    // Melody (bright, game-show feel in C major)
    const melodyNotes: [number, number][] = [
      [523, 0.5], [659, 0.5], [784, 0.5], [880, 0.5],
      [784, 0.5], [698, 0.5], [659, 1.0],
    ];
    let cursor = 0;
    melodyNotes.forEach(([freq, dur]) => {
      const t = ctx.currentTime + cursor * beat;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.08 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * beat * 0.9);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t);
      osc.stop(t + dur * beat);
      cursor += dur;
    });

    // Hi-hat ticks on every 8th note
    for (let i = 0; i < 8; i++) {
      const t = ctx.currentTime + i * beat * 0.5;
      const bufSize = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1) * 0.04;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      src.connect(g);
      g.connect(masterGain);
      src.start(t);
    }

    // Schedule next loop iteration (2 bars)
    const loopDuration = bar * 2 * 1000;
    bgMusic.loopTimeoutId = setTimeout(() => playBgMusicLoop(volume), loopDuration);
  } catch { /* silent */ }
}

export function startBgMusic(volume: number): void {
  if (bgMusic.running) return;
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    bgMusic.gainNode = masterGain;
    bgMusic.running = true;
    playBgMusicLoop(volume);
  } catch { /* silent */ }
}

export function stopBgMusic(): void {
  bgMusic.running = false;
  if (bgMusic.loopTimeoutId !== null) {
    clearTimeout(bgMusic.loopTimeoutId);
    bgMusic.loopTimeoutId = null;
  }
  bgMusic.gainNode = null;
}

export function setBgMusicVolume(volume: number): void {
  if (bgMusic.gainNode) {
    bgMusic.gainNode.gain.setTargetAtTime(volume, getCtx().currentTime, 0.1);
  }
}

// ── Sound effects ─────────────────────────────────────────────────────────────

export const sounds = {
  tick(volume: number): void {
    playTone(880, 0.05, 'square', 0.08, volume);
  },

  alarm(volume: number): void {
    // Urgent triple beep — timer expired
    [0, 0.22, 0.44].forEach((t) => {
      playTone(440, 0.18, 'square', 0.35, volume, t);
    });
  },

  drum(volume: number): void {
    // Drum spin: filtered noise burst with pitch sweep
    try {
      const ctx = getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 0.6);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
      filter.Q.value = 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18 * volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* silent */ }
  },

  correct(volume: number): void {
    // Bright rising arpeggio
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => playTone(f, 0.35, 'sine', 0.18, volume, i * 0.07));
  },

  wrong(volume: number): void {
    // Descending sawtooth — "buzzer"
    playFreqSweep(280, 120, 0.45, 'sawtooth', 0.28, volume);
    playTone(140, 0.3, 'sawtooth', 0.15, volume, 0.15);
  },

  bankrupt(volume: number): void {
    // Dramatic "doom" descending chord + low thud
    const steps = [600, 480, 360, 240, 160];
    steps.forEach((f, i) => {
      playTone(f, 0.28, 'sawtooth', 0.25, volume, i * 0.13);
    });
    // Low bass thud
    playFreqSweep(120, 40, 0.6, 'sine', 0.35, volume, 0.1);
    // Noise burst
    try {
      const ctx = getCtx();
      const t = ctx.currentTime + 0.05;
      const bufSize = Math.floor(ctx.sampleRate * 0.25);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15 * volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      src.connect(g);
      g.connect(ctx.destination);
      src.start(t);
    } catch { /* silent */ }
  },

  prize(volume: number): void {
    // Glittery fanfare — ascending sparkle
    const melody = [523, 659, 784, 988, 1047, 1319, 1047, 1319];
    melody.forEach((f, i) => {
      playTone(f, 0.28, 'sine', 0.2, volume, i * 0.09);
      if (i % 2 === 0) playTone(f * 1.5, 0.15, 'triangle', 0.06, volume, i * 0.09);
    });
  },

  double(volume: number): void {
    // Double jingle — two quick rising sweeps
    playFreqSweep(400, 800, 0.25, 'sine', 0.25, volume, 0);
    playFreqSweep(400, 800, 0.25, 'sine', 0.25, volume, 0.28);
    playTone(1047, 0.4, 'sine', 0.2, volume, 0.56);
  },

  bank(volume: number): void {
    // Coin collection sound — quick rising ticks
    [0, 0.08, 0.16, 0.24].forEach((t) => {
      playTone(1200 + t * 800, 0.1, 'triangle', 0.18, volume, t);
    });
    playTone(1760, 0.3, 'sine', 0.2, volume, 0.32);
  },

  extra(volume: number): void {
    // Extra spin jingle — playful bouncy
    const notes = [523, 784, 1047, 784, 523, 659, 784];
    notes.forEach((f, i) => playTone(f, 0.15, 'triangle', 0.15, volume, i * 0.07));
  },

  win(volume: number): void {
    // Victory fanfare — full ascending scale with chord resolution
    const melody = [523, 587, 659, 698, 784, 880, 988, 1047, 1175];
    melody.forEach((f, i) => {
      playTone(f, 0.38, 'sine', 0.3, volume, i * 0.075);
    });
    // Final chord
    [523, 659, 784, 1047].forEach((f) => {
      playTone(f, 0.8, 'sine', 0.15, volume, melody.length * 0.075);
    });
  },
};

export function resumeAudio(): void {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}
