// Web Audio API sound manager with synthetic sounds (no external files needed)
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
  volume = 1
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // silent fail if audio blocked
  }
}

function playChord(freqs: number[], duration: number, volume = 1): void {
  freqs.forEach((f) => playTone(f, duration, 'sine', 0.2, volume));
}

export const sounds = {
  tick(volume: number): void {
    playTone(800, 0.05, 'square', 0.1, volume);
  },
  alarm(volume: number): void {
    // 3 beeps
    [0, 0.2, 0.4].forEach((t) => {
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.4 * volume, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.15);
      } catch { /* silent */ }
    });
  },
  drum(volume: number): void {
    // Drum spin: random noise burst
    try {
      const ctx = getCtx();
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* silent */ }
  },
  correct(volume: number): void {
    playChord([523, 659, 784], 0.4, volume);
  },
  wrong(volume: number): void {
    playTone(200, 0.4, 'sawtooth', 0.3, volume);
  },
  bankrupt(volume: number): void {
    [500, 400, 300, 200].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sawtooth', 0.3, volume), i * 120);
    });
  },
  prize(volume: number): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sine', 0.3, volume), i * 100);
    });
  },
  win(volume: number): void {
    const melody = [523, 587, 659, 698, 784, 880, 988, 1047];
    melody.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.35, 'sine', 0.35, volume), i * 80);
    });
  },
};

export function resumeAudio(): void {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}
