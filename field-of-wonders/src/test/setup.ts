import '@testing-library/jest-dom';

// Mock Web Audio API — jsdom doesn't implement it
class MockAudioContext {
  createOscillator() {
    return { connect: () => {}, frequency: { setValueAtTime: () => {} }, type: '', start: () => {}, stop: () => {} };
  }
  createGain() {
    return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} } };
  }
  createBuffer(_: number, size: number, sr: number) {
    return { getChannelData: () => new Float32Array(size), sampleRate: sr };
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} };
  }
  get destination() { return {}; }
  get currentTime() { return 0; }
  get state() { return 'running'; }
  resume() { return Promise.resolve(); }
}

Object.defineProperty(window, 'AudioContext', { writable: true, value: MockAudioContext });
Object.defineProperty(window, 'webkitAudioContext', { writable: true, value: MockAudioContext });

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
