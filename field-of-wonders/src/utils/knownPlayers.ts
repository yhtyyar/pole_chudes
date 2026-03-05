import type { KnownPlayer } from '../types';

const STORAGE_KEY = 'pole_chudes_known_players';
const MAX_PLAYERS = 100;

export function loadKnownPlayers(): KnownPlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as KnownPlayer[];
  } catch {
    return [];
  }
}

export function saveKnownPlayer(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return;
  const players = loadKnownPlayers();
  const existing = players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.lastUsed = Date.now();
  } else {
    players.push({ id: crypto.randomUUID(), name: trimmed, lastUsed: Date.now() });
  }
  // Keep only the most recently used MAX_PLAYERS entries
  players.sort((a, b) => b.lastUsed - a.lastUsed);
  const trimmedList = players.slice(0, MAX_PLAYERS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedList));
  } catch {
    // storage full — ignore
  }
}

export function saveKnownPlayers(names: string[]): void {
  names.forEach(saveKnownPlayer);
}

export function deleteKnownPlayer(id: string): void {
  const players = loadKnownPlayers().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export function searchKnownPlayers(query: string, limit = 8): KnownPlayer[] {
  if (!query.trim()) {
    return loadKnownPlayers().slice(0, limit);
  }
  const q = query.toLowerCase();
  return loadKnownPlayers()
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, limit);
}
