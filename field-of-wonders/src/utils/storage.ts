import type { GameState } from '../types';

const STORAGE_KEY = 'pole_chudes_state';

export function saveState(state: GameState): void {
  try {
    const serialized = JSON.stringify({
      ...state,
      meta: { ...state.meta, lastSaved: Date.now() },
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function loadState(): GameState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized) as GameState;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportState(state: GameState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pole-chudes-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importState(file: File): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string) as GameState;
        if (!state.config || !state.players || !state.board) {
          reject(new Error('Неверный формат файла'));
          return;
        }
        resolve(state);
      } catch {
        reject(new Error('Ошибка чтения файла'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
