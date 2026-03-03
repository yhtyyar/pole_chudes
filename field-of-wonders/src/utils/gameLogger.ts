/**
 * Game Logger — записывает все события игры в localStorage и даёт возможность
 * скачать лог как текстовый файл game.log в корне проекта (через dev proxy)
 * или как браузерный download.
 */

export type LogLevel = 'INFO' | 'WARN' | 'EVENT' | 'ERROR';

export interface LogEntry {
  ts: number;       // Unix ms
  level: LogLevel;
  category: string; // 'DRUM' | 'LETTER' | 'PLAYER' | 'ROUND' | 'GAME' | 'TIMER'
  message: string;
  data?: unknown;
}

const LS_KEY = 'pole_chudes_game_log';
const MAX_ENTRIES = 2000;

// ── in-memory buffer (also flushed to localStorage) ──────────────────────────
let _buffer: LogEntry[] = [];

function _load(): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) _buffer = JSON.parse(raw) as LogEntry[];
  } catch {
    _buffer = [];
  }
}

function _save(): void {
  try {
    // keep last MAX_ENTRIES
    if (_buffer.length > MAX_ENTRIES) _buffer = _buffer.slice(-MAX_ENTRIES);
    localStorage.setItem(LS_KEY, JSON.stringify(_buffer));
  } catch { /* storage full — ignore */ }
}

_load();

// ── public API ────────────────────────────────────────────────────────────────

export function logEvent(
  category: LogEntry['category'],
  message: string,
  data?: unknown,
  level: LogLevel = 'EVENT'
): void {
  const entry: LogEntry = { ts: Date.now(), level, category, message, data };
  _buffer.push(entry);
  _save();

  // Also emit to browser console in dev
  const prefix = `[${level}][${category}]`;
  if (level === 'ERROR') console.error(prefix, message, data ?? '');
  else if (level === 'WARN') console.warn(prefix, message, data ?? '');
  else console.log(prefix, message, data ?? '');
}

export function clearLog(): void {
  _buffer = [];
  localStorage.removeItem(LS_KEY);
}

export function getLog(): LogEntry[] {
  return [..._buffer];
}

/** Formats log as human-readable text */
function formatLog(): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════',
    ' ПОЛЕ ЧУДЕС — Game Session Log',
    `═══════════════════════════════════════════════════`,
    '',
  ];
  _buffer.forEach((e) => {
    const dt  = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 23);
    const pad = (e.level + '    ').slice(0, 5);
    const dataStr = e.data !== undefined ? `  ${JSON.stringify(e.data)}` : '';
    lines.push(`[${dt}] ${pad} [${e.category}] ${e.message}${dataStr}`);
  });
  lines.push('');
  lines.push('═══════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Triggers a browser download of the current log as game.log.
 * This is the safest cross-env approach (works in all browsers, no Node.js needed).
 */
export function downloadLog(): void {
  const text = formatLog();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'game.log';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sends log to the Vite dev-server write endpoint (only works in development).
 * In production this silently does nothing.
 */
export async function saveLogToFile(): Promise<void> {
  try {
    const text = formatLog();
    await fetch('/__write_game_log', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    });
  } catch {
    // not in dev, or endpoint not registered — ignore
  }
}
