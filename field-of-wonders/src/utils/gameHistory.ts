import type { GameTopEntry } from '../types';

const STORAGE_KEY = 'pole_chudes_history';
const MAX_ENTRIES = 200;

export interface HistoryEntry {
  id: string;
  name: string;
  score: number;
  groupName: string;
  roundsWon: number;
  playedAt: number; // timestamp
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveGameResults(entries: GameTopEntry[]): void {
  const now = Date.now();
  const existing = loadHistory();

  for (const entry of entries) {
    if (!entry.name?.trim()) continue;
    const record: HistoryEntry = {
      id: crypto.randomUUID(),
      name: entry.name.trim(),
      score: entry.totalScore,
      groupName: entry.groupName,
      roundsWon: entry.roundsWon,
      playedAt: now,
    };
    existing.push(record);
  }

  // Keep only the MAX_ENTRIES most recent entries
  existing.sort((a, b) => b.playedAt - a.playedAt || b.score - a.score);
  const trimmed = existing.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full — ignore
  }
}

/** Returns all-time top N unique players by their best score */
export function loadAllTimeTop(limit = 20): HistoryEntry[] {
  const history = loadHistory();
  // Aggregate: keep best score per player name (case-insensitive)
  const bestByName = new Map<string, HistoryEntry>();
  for (const entry of history) {
    const key = entry.name.toLowerCase();
    const existing = bestByName.get(key);
    if (!existing || entry.score > existing.score) {
      bestByName.set(key, entry);
    }
  }
  return Array.from(bestByName.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
