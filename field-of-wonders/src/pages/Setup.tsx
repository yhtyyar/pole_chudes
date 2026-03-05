import { useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { validateCyrillicWord, validateQuestion, validateGroupName } from '../utils/validators';
import { useTheme } from '../context/ThemeContext';
import { loadKnownPlayers, searchKnownPlayers } from '../utils/knownPlayers';
import type { SetupForm, KnownPlayer } from '../types';
import {
  Sun, Moon, Music, VolumeX, ChevronDown, ChevronUp,
  Users, FileText, X, Plus, Minus, UserPlus, UserMinus, Trophy,
} from 'lucide-react';

const DEFAULT_PLAYERS_PER_GROUP = 5;
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 10;
const MIN_GROUPS = 1;
const MAX_GROUPS = 8;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 8;
const MIN_FINAL_PLAYERS = 1;
const MAX_FINAL_PLAYERS = 10;
const DEFAULT_FINAL_PLAYERS = 3;

function makeDefaultPlayerNames(groupCount: number, playersPerGroup: number[]): string[][] {
  return Array.from({ length: groupCount }, (_, gi) =>
    Array.from({ length: playersPerGroup[gi] ?? DEFAULT_PLAYERS_PER_GROUP }, (_, pi) => `Игрок ${pi + 1}`)
  );
}

const INITIAL_GROUPS = ['Группа 1', 'Группа 2', 'Группа 3'];
const INITIAL_PPG = INITIAL_GROUPS.map(() => DEFAULT_PLAYERS_PER_GROUP);
// 3 regular rounds by default
const DEFAULT_REGULAR_ROUNDS = Array.from({ length: 3 }, () => ({ word: '', question: '' }));
const DEFAULT_FINAL_ROUND = { word: '', question: '' };

interface FieldErrors {
  groups: string[];
  rounds: Array<{ word?: string; question?: string }>;
  finalRound?: { word?: string; question?: string };
}

// ── PlayerNameInput ───────────────────────────────────────────────────────────
function PlayerNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<KnownPlayer[]>([]);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const res = searchKnownPlayers(e.target.value, 6);
          setSuggestions(res);
          setOpen(res.length > 0);
        }}
        onFocus={() => {
          const res = loadKnownPlayers().slice(0, 6);
          setSuggestions(res);
          setOpen(res.length > 0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        maxLength={24}
        placeholder="Имя игрока"
        className="w-full input-field py-1.5 text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-30 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
        >
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text)' }}
                onMouseDown={() => { onChange(p.name); setOpen(false); }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── GroupPlayersPanel ─────────────────────────────────────────────────────────
function GroupPlayersPanel({
  groupIndex, groupName, playerNames, onChangeName, onAddPlayer, onRemovePlayer,
}: {
  groupIndex: number;
  groupName: string;
  playerNames: string[];
  onChangeName: (playerIndex: number, name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (playerIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = playerNames.length;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold transition-colors hover:opacity-90"
        style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
      >
        <span className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
          {groupName || `Группа ${groupIndex + 1}`}
          <span className="text-xs font-normal px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--color-panel)', color: 'var(--color-text-muted)' }}>
            {count} игр.
          </span>
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="p-3 space-y-2" style={{ background: 'var(--color-panel)' }}>
          {playerNames.map((name, pi) => (
            <div key={pi} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
              >
                {pi + 1}
              </span>
              <PlayerNameInput value={name} onChange={(v) => onChangeName(pi, v)} />
              {count > MIN_PLAYERS && (
                <button
                  type="button"
                  onClick={() => onRemovePlayer(pi)}
                  title="Убрать игрока"
                  className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg text-error hover:bg-error/15 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {count < MAX_PLAYERS && (
            <button
              type="button"
              onClick={onAddPlayer}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-xs font-medium transition-colors hover:opacity-80 mt-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Добавить игрока
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── RoundCard ─────────────────────────────────────────────────────────────────
function RoundCard({
  index, round, error, onChange, isFinalRound,
}: {
  index: number;
  round: { word: string; question: string };
  error?: { word?: string; question?: string };
  onChange: (r: { word: string; question: string }) => void;
  isFinalRound: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: 'var(--color-card)',
        borderColor: isFinalRound ? 'rgba(245,197,66,0.35)' : 'var(--color-border)',
      }}
    >
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
          isFinalRound
            ? 'bg-gold/20 text-gold border border-gold/40'
            : 'bg-accent/15 text-accent border border-accent/30'
        }`}
      >
        {isFinalRound ? '🏆 ФИНАЛ' : `Раунд ${index + 1}`}
      </span>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
          Слово (3–15 букв){!isFinalRound && <span className="text-[var(--color-text-muted)] ml-1">(оставьте пустым, чтобы пропустить раунд)</span>}
        </label>
        <input
          data-testid={isFinalRound ? 'final-word-input' : `round-word-input-${index}`}
          type="text"
          value={round.word}
          onChange={(e) => onChange({ ...round, word: e.target.value.toUpperCase() })}
          className={`w-full input-field py-2 font-bold tracking-widest uppercase text-sm ${
            error?.word ? 'border-error' : ''
          }`}
          placeholder={isFinalRound ? 'ФИНАЛ (обязательно)' : 'СЛОВО'}
          maxLength={15}
        />
        {error?.word && <p className="text-error text-xs mt-1">{error.word}</p>}
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
          Вопрос-загадка
        </label>
        <textarea
          data-testid={isFinalRound ? 'final-question-input' : `round-question-input-${index}`}
          value={round.question}
          onChange={(e) => onChange({ ...round, question: e.target.value })}
          className={`w-full input-field resize-none h-16 text-sm ${
            error?.question ? 'border-error' : ''
          }`}
          placeholder="Введите вопрос или загадку..."
        />
        {error?.question && <p className="text-error text-xs mt-1">{error.question}</p>}
      </div>
    </div>
  );
}

// ── Main Setup component ──────────────────────────────────────────────────────
export function Setup() {
  const startGame = useGameStore((s) => s.startGame);
  const loadSavedState = useGameStore((s) => s.loadSavedState);
  const importStateFromFile = useGameStore((s) => s.importStateFromFile);
  const bgMusicEnabled = useGameStore((s) => s.bgMusicEnabled);
  const bgMusicVolume = useGameStore((s) => s.bgMusicVolume);
  const toggleBgMusic = useGameStore((s) => s.toggleBgMusic);
  const setBgMusicVolumeAction = useGameStore((s) => s.setBgMusicVolume);

  const [regularRounds, setRegularRounds] = useState(DEFAULT_REGULAR_ROUNDS.map((r) => ({ ...r })));
  const [finalRound, setFinalRound] = useState<{ word: string; question: string } | null>({ ...DEFAULT_FINAL_ROUND });
  const [finalPlayerNames, setFinalPlayerNames] = useState<string[]>(
    Array.from({ length: DEFAULT_FINAL_PLAYERS }, (_, i) => `Финалист ${i + 1}`)
  );
  const [form, setForm] = useState<SetupForm>({
    groups: [...INITIAL_GROUPS],
    playerNames: makeDefaultPlayerNames(INITIAL_GROUPS.length, INITIAL_PPG),
    playersPerGroup: [...INITIAL_PPG],
    rounds: [...DEFAULT_REGULAR_ROUNDS.map((r) => ({ ...r, isFinal: false as const })), { ...DEFAULT_FINAL_ROUND, isFinal: true as const }],
    finalPlayerNames: Array.from({ length: DEFAULT_FINAL_PLAYERS }, (_, i) => `Финалист ${i + 1}`),
    finalPlayersCount: DEFAULT_FINAL_PLAYERS,
  });
  const [errors, setErrors] = useState<FieldErrors>({ groups: [], rounds: [] });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  // Sync form.rounds whenever regularRounds or finalRound changes
  function buildRounds(regs: typeof regularRounds, fin: typeof finalRound) {
    if (fin) return [...regs, { ...fin, isFinal: true }];
    return regs.map((r) => ({ ...r, isFinal: false as const }));
  }

  const hasSaved = !!localStorage.getItem('pole_chudes_state');
  const { theme, toggle: toggleTheme } = useTheme();
  const isLight = theme === 'light';

  // ── Derived ──
  const hasFinal = finalRound !== null;
  const activeRegularRounds = regularRounds.filter((r) => r.word.trim().length > 0).length;
  // Final-only mode: final is enabled AND no regular round has a word
  const isFinalOnly = hasFinal && activeRegularRounds === 0;

  function handleStart() {
    const rounds = buildRounds(regularRounds, finalRound);
    const updatedForm = { ...form, rounds, finalPlayerNames, finalPlayersCount: finalPlayerNames.length };
    setForm(updatedForm);
    // validate directly against current state
    const groupErrs: string[] = updatedForm.groups.map((g) => validateGroupName(g) ?? '');
    const roundErrs = regularRounds.map((r) => {
      if (!r.word.trim()) return {};
      return {
        word: validateCyrillicWord(r.word) ?? undefined,
        question: validateQuestion(r.question) ?? undefined,
      };
    });
    const finalErr = finalRound && finalRound.word.trim()
      ? { word: validateCyrillicWord(finalRound.word) ?? undefined, question: validateQuestion(finalRound.question) ?? undefined }
      : undefined;
    setErrors({ groups: groupErrs, rounds: roundErrs, finalRound: finalErr });
    const hasAtLeastOneRound =
      regularRounds.some((r) => r.word.trim().length > 0) ||
      (finalRound !== null && finalRound.word.trim().length > 0);
    const ok =
      groupErrs.every((e) => !e) &&
      roundErrs.every((r) => !r.word && !r.question) &&
      (!finalErr || (!finalErr.word && !finalErr.question)) &&
      hasAtLeastOneRound;
    if (ok) startGame(updatedForm);
  }

  // ── Round management ──
  function addRegularRound() {
    if (regularRounds.length >= MAX_ROUNDS) return;
    const newRegs = [...regularRounds, { word: '', question: '' }];
    setRegularRounds(newRegs);
    setForm((f) => ({ ...f, rounds: buildRounds(newRegs, finalRound) }));
  }

  function removeRegularRound(i: number) {
    if (regularRounds.length <= MIN_ROUNDS) return;
    const newRegs = regularRounds.filter((_, idx) => idx !== i);
    setRegularRounds(newRegs);
    setForm((f) => ({ ...f, rounds: buildRounds(newRegs, finalRound) }));
  }

  function updateRegularRound(i: number, r: { word: string; question: string }) {
    const newRegs = regularRounds.map((old, idx) => (idx === i ? r : old));
    setRegularRounds(newRegs);
    setForm((f) => ({ ...f, rounds: buildRounds(newRegs, finalRound) }));
  }

  function toggleFinal() {
    const newFinal = hasFinal ? null : { word: '', question: '' };
    setFinalRound(newFinal);
    setForm((f) => ({ ...f, rounds: buildRounds(regularRounds, newFinal) }));
  }

  // ── Final players management (final-only mode) ──
  function addFinalPlayer() {
    if (finalPlayerNames.length >= MAX_FINAL_PLAYERS) return;
    const newNames = [...finalPlayerNames, `Финалист ${finalPlayerNames.length + 1}`];
    setFinalPlayerNames(newNames);
    setForm((f) => ({ ...f, finalPlayerNames: newNames, finalPlayersCount: newNames.length }));
  }

  function removeFinalPlayer(i: number) {
    if (finalPlayerNames.length <= MIN_FINAL_PLAYERS) return;
    const newNames = finalPlayerNames.filter((_, idx) => idx !== i);
    setFinalPlayerNames(newNames);
    setForm((f) => ({ ...f, finalPlayerNames: newNames, finalPlayersCount: newNames.length }));
  }

  function updateFinalPlayerName(i: number, name: string) {
    const newNames = finalPlayerNames.map((n, idx) => (idx === i ? name : n));
    setFinalPlayerNames(newNames);
    setForm((f) => ({ ...f, finalPlayerNames: newNames }));
  }

  function updateFinalRound(r: { word: string; question: string }) {
    setFinalRound(r);
    setForm((f) => ({ ...f, rounds: buildRounds(regularRounds, r) }));
  }

  // ── Group management ──
  function addGroup() {
    if (form.groups.length >= MAX_GROUPS) return;
    const newIndex = form.groups.length;
    const ppg = [...form.playersPerGroup, DEFAULT_PLAYERS_PER_GROUP];
    const pn = [
      ...form.playerNames,
      Array.from({ length: DEFAULT_PLAYERS_PER_GROUP }, (_, i) => `Игрок ${i + 1}`),
    ];
    setForm({
      ...form,
      groups: [...form.groups, `Группа ${newIndex + 1}`],
      playersPerGroup: ppg,
      playerNames: pn,
    });
  }

  function removeGroup(i: number) {
    if (form.groups.length <= MIN_GROUPS) return;
    const groups = form.groups.filter((_, idx) => idx !== i);
    const ppg = form.playersPerGroup.filter((_, idx) => idx !== i);
    const pn = form.playerNames.filter((_, idx) => idx !== i);
    setForm({ ...form, groups, playersPerGroup: ppg, playerNames: pn });
  }

  function updateGroupName(i: number, v: string) {
    const g = [...form.groups];
    g[i] = v;
    setForm({ ...form, groups: g });
  }

  // ── Player management ──
  function addPlayer(groupIndex: number) {
    const current = form.playersPerGroup[groupIndex] ?? DEFAULT_PLAYERS_PER_GROUP;
    if (current >= MAX_PLAYERS) return;
    const ppg = [...form.playersPerGroup];
    ppg[groupIndex] = current + 1;
    const pn = form.playerNames.map((row, gi) =>
      gi === groupIndex ? [...row, `Игрок ${current + 1}`] : [...row]
    );
    setForm({ ...form, playersPerGroup: ppg, playerNames: pn });
  }

  function removePlayer(groupIndex: number, playerIndex: number) {
    const current = form.playersPerGroup[groupIndex] ?? DEFAULT_PLAYERS_PER_GROUP;
    if (current <= MIN_PLAYERS) return;
    const ppg = [...form.playersPerGroup];
    ppg[groupIndex] = current - 1;
    const pn = form.playerNames.map((row, gi) =>
      gi === groupIndex ? row.filter((_, pi) => pi !== playerIndex) : [...row]
    );
    setForm({ ...form, playersPerGroup: ppg, playerNames: pn });
  }

  function updatePlayerName(groupIndex: number, playerIndex: number, name: string) {
    const pn = form.playerNames.map((row) => [...row]);
    pn[groupIndex][playerIndex] = name;
    setForm({ ...form, playerNames: pn });
  }

  // ── Config export/import ──
  function handleExportConfig() {
    const blob = new Blob(
      [JSON.stringify(
        { groups: form.groups, playerNames: form.playerNames, playersPerGroup: form.playersPerGroup, rounds: form.rounds },
        null, 2
      )],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pole-chudes-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportConfig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.groups && data.rounds) {
        const ppg: number[] = data.playersPerGroup ??
          data.groups.map(() => DEFAULT_PLAYERS_PER_GROUP);
        setForm({
          groups: data.groups,
          playerNames: data.playerNames ?? makeDefaultPlayerNames(data.groups.length, ppg),
          playersPerGroup: ppg,
          rounds: data.rounds,
        });
      } else if (data.config) {
        await importStateFromFile(file);
        return;
      } else {
        setImportError('Неверный формат файла конфигурации');
      }
    } catch {
      setImportError('Ошибка чтения файла');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  }

  return (
    <div data-testid="setup-page" className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* ── Header ── */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between gap-4"
        style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gold tracking-wide">🎡 Поле Чудес</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Корпоративная игра · Настройка</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Bg music */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleBgMusic}
              title={bgMusicEnabled ? 'Выключить фоновую музыку' : 'Включить фоновую музыку'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                bgMusicEnabled ? 'border-gold/50 bg-gold/15 text-gold' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
              style={!bgMusicEnabled ? { background: 'var(--color-card)' } : undefined}
            >
              {bgMusicEnabled ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              Музыка
            </button>
            {bgMusicEnabled && (
              <input type="range" min="0.05" max="0.8" step="0.05"
                value={bgMusicVolume}
                onChange={(e) => setBgMusicVolumeAction(parseFloat(e.target.value))}
                className="w-20 accent-gold" title="Громкость"
              />
            )}
          </div>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Тёмная тема' : 'Светлая тема'}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: isLight ? '#f5c542' : '#1e293b',
              border: '2px solid',
              borderColor: isLight ? '#d97706' : '#334155',
              boxShadow: isLight ? '0 0 10px rgba(245,197,66,0.5)' : '0 0 10px rgba(99,102,241,0.4)',
            }}
          >
            {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {hasSaved && (
            <button
              data-testid="continue-game-btn"
              onClick={() => loadSavedState()}
              className="px-4 py-2 rounded-xl bg-success/20 border border-success/40 text-success font-semibold hover:bg-success/30 transition-colors text-sm"
            >
              ↩ Продолжить игру
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Column 1: Groups + Players OR Final-only players ── */}
          <section className="space-y-4">
            {isFinalOnly ? (
              /* ── FINAL-ONLY: dedicated finalist players panel ── */
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gold" />
                    <span className="text-gold">Финалисты</span>
                  </h2>
                  {finalPlayerNames.length < MAX_FINAL_PLAYERS && (
                    <button
                      type="button"
                      onClick={addFinalPlayer}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ background: 'rgba(245,197,66,0.12)', borderColor: 'rgba(245,197,66,0.4)', color: '#f5c542' }}
                    >
                      <UserPlus className="w-3 h-3" /> Добавить
                    </button>
                  )}
                </div>

                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: 'rgba(245,197,66,0.3)', background: 'rgba(245,197,66,0.05)' }}
                >
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Режим «Только финал» — укажите участников финальной игры (1–{MAX_FINAL_PLAYERS} чел.). Группы не используются.
                  </p>
                  <div className="space-y-2">
                    {finalPlayerNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                          style={{ background: 'rgba(245,197,66,0.25)', color: '#f5c542' }}
                        >
                          {i + 1}
                        </span>
                        <PlayerNameInput
                          value={name}
                          onChange={(v) => updateFinalPlayerName(i, v)}
                        />
                        {finalPlayerNames.length > MIN_FINAL_PLAYERS && (
                          <button
                            type="button"
                            onClick={() => removeFinalPlayer(i)}
                            title="Убрать финалиста"
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-error hover:bg-error/15 transition-colors"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {finalPlayerNames.length < MAX_FINAL_PLAYERS && (
                    <button
                      type="button"
                      onClick={addFinalPlayer}
                      className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-xs font-medium transition-colors hover:opacity-80"
                      style={{ borderColor: 'rgba(245,197,66,0.4)', color: '#f5c542' }}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Добавить финалиста
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* ── NORMAL MODE: groups + players ── */
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="text-xl">👥</span> Группы и игроки
                  </h2>
                  {form.groups.length < MAX_GROUPS && (
                    <button
                      data-testid="add-group-btn"
                      type="button"
                      onClick={addGroup}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <Plus className="w-3 h-3" /> Группа
                    </button>
                  )}
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Добавляйте и удаляйте группы (до {MAX_GROUPS}). Раскройте группу, чтобы управлять игроками (1–{MAX_PLAYERS} на группу).
                </p>

                {form.groups.map((group, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--color-accent, #e94560)', color: '#fff' }}
                      >
                        {i + 1}
                      </span>
                      <input
                        data-testid={`group-name-input-${i}`}
                        type="text"
                        value={group}
                        onChange={(e) => updateGroupName(i, e.target.value)}
                        className={`flex-1 input-field py-2 text-sm ${errors.groups[i] ? 'border-error' : ''}`}
                        placeholder={`Группа ${i + 1}`}
                      />
                      {form.groups.length > MIN_GROUPS && (
                        <button
                          data-testid={`remove-group-btn-${i}`}
                          type="button"
                          onClick={() => removeGroup(i)}
                          title="Удалить группу"
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-error hover:bg-error/15 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {errors.groups[i] && <p className="text-error text-xs ml-7">{errors.groups[i]}</p>}

                    <div className="ml-7">
                      <GroupPlayersPanel
                        groupIndex={i}
                        groupName={group}
                        playerNames={form.playerNames[i] ?? []}
                        onChangeName={(pi, name) => updatePlayerName(i, pi, name)}
                        onAddPlayer={() => addPlayer(i)}
                        onRemovePlayer={(pi) => removePlayer(i, pi)}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* ── Column 2: Rounds + Final ── */}
          <section className="space-y-4">
            {/* Rounds header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="text-xl">📝</span> Раунды
              </h2>
              <div className="flex items-center gap-2">
                {regularRounds.length < MAX_ROUNDS && (
                  <button
                    data-testid="add-round-btn"
                    type="button"
                    onClick={addRegularRound}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <Plus className="w-3 h-3" /> Раунд
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Оставьте слово пустым, чтобы пропустить раунд. Мин. 1, макс. {MAX_ROUNDS} раундов.
            </p>

            {regularRounds.map((round, i) => (
              <div key={i} className="relative">
                <RoundCard
                  index={i}
                  round={round}
                  error={errors.rounds[i]}
                  isFinalRound={false}
                  onChange={(r) => updateRegularRound(i, r)}
                />
                {regularRounds.length > MIN_ROUNDS && (
                  <button
                    data-testid={`remove-round-btn-${i}`}
                    type="button"
                    onClick={() => removeRegularRound(i)}
                    title="Удалить раунд"
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-error hover:bg-error/15 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Final round toggle */}
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: hasFinal ? 'rgba(245,197,66,0.4)' : 'var(--color-border)', background: 'var(--color-card)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Trophy className="w-4 h-4 text-gold" />
                  <span className="text-gold">Финальный раунд</span>
                </span>
                <button
                  data-testid="final-toggle"
                  type="button"
                  onClick={toggleFinal}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                    hasFinal ? 'bg-gold' : 'bg-[var(--color-border)]'
                  }`}
                  title={hasFinal ? 'Убрать финал' : 'Добавить финал'}
                  aria-pressed={hasFinal}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      hasFinal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {hasFinal && finalRound ? (
                <>
                  {activeRegularRounds === 0 && (
                    <p className="text-xs mb-3 text-gold">💡 Все раунды пропущены — будет сыгран только финал.</p>
                  )}
                  <RoundCard
                    index={regularRounds.length}
                    round={finalRound}
                    error={errors.finalRound}
                    isFinalRound={true}
                    onChange={updateFinalRound}
                  />
                </>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Финальный раунд отключён. Нажмите переключатель, чтобы добавить.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 py-4"
        style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            {/* Summary badge */}
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              {isFinalOnly
                ? `${finalPlayerNames.length} финалистов · Только финал`
                : `${form.groups.length} групп · ${form.playersPerGroup.reduce((s, n) => s + n, 0)} игроков · ${activeRegularRounds + (hasFinal && finalRound?.word ? 1 : 0)} раундов`
              }
            </span>

            <button
              type="button"
              onClick={handleExportConfig}
              className="px-3 py-2 rounded-xl border text-xs font-medium transition-colors hover:opacity-80 flex items-center gap-1.5"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <FileText className="w-3.5 h-3.5" /> Сохранить конфигурацию
            </button>
            <label
              className="px-3 py-2 rounded-xl border text-xs font-medium transition-colors hover:opacity-80 cursor-pointer flex items-center gap-1.5"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <FileText className="w-3.5 h-3.5" /> Загрузить конфигурацию
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportConfig} />
            </label>
            {importError && (
              <span className="text-error text-xs flex items-center gap-1">
                <X className="w-3 h-3" />{importError}
              </span>
            )}
            {importing && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Загрузка...</span>}
          </div>

          <button
            data-testid="start-game-btn"
            type="button"
            onClick={handleStart}
            className="px-8 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold text-base uppercase tracking-widest shadow-[0_0_25px_rgba(233,69,96,0.4)] transition-all active:scale-95"
          >
            🚀 Начать игру
          </button>
        </div>
      </footer>
    </div>
  );
}
