import { useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { validateCyrillicWord, validateQuestion, validateGroupName } from '../utils/validators';
import { useTheme } from '../context/ThemeContext';
import { loadKnownPlayers, searchKnownPlayers } from '../utils/knownPlayers';
import type { SetupForm, KnownPlayer } from '../types';
import { Sun, Moon, Music, VolumeX, ChevronDown, ChevronUp, Users, FileText, X } from 'lucide-react';

const PLAYERS_PER_GROUP = 5;

function makeDefaultPlayerNames(groupCount: number): string[][] {
  return Array.from({ length: groupCount }, () =>
    Array.from({ length: PLAYERS_PER_GROUP }, (_, i) => `Игрок ${i + 1}`)
  );
}

const DEFAULT_GROUPS = ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'];
const DEFAULT_ROUNDS = Array.from({ length: 6 }, () => ({ word: '', question: '' }));

interface FieldErrors {
  groups: string[];
  rounds: Array<{ word?: string; question?: string }>;
}

// ── PlayerNameInput: single field with autocomplete from known-players ────────
function PlayerNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<KnownPlayer[]>([]);
  const [open, setOpen] = useState(false);

  function handleChange(v: string) {
    onChange(v);
    const res = searchKnownPlayers(v, 6);
    setSuggestions(res);
    setOpen(res.length > 0);
  }

  function handleFocus() {
    const res = loadKnownPlayers().slice(0, 6);
    setSuggestions(res);
    setOpen(res.length > 0);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        maxLength={20}
        placeholder="Имя игрока"
        className="w-full input-field py-2 text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border shadow-lg overflow-hidden"
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

// ── GroupPlayersPanel: collapsible per-group player list ──────────────────────
function GroupPlayersPanel({
  groupIndex,
  groupName,
  playerNames,
  onChangeName,
}: {
  groupIndex: number;
  groupName: string;
  playerNames: string[];
  onChangeName: (playerIndex: number, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
        style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}
      >
        <span className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
          {groupName || `Группа ${groupIndex + 1}`}
          <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
            ({PLAYERS_PER_GROUP} игр.)
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
              <PlayerNameInput
                value={name}
                onChange={(v) => onChangeName(pi, v)}
              />
            </div>
          ))}
        </div>
      )}
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

  const [form, setForm] = useState<SetupForm>({
    groups: [...DEFAULT_GROUPS],
    playerNames: makeDefaultPlayerNames(DEFAULT_GROUPS.length),
    rounds: DEFAULT_ROUNDS.map((r) => ({ ...r })),
  });
  const [errors, setErrors] = useState<FieldErrors>({ groups: [], rounds: [] });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const hasSaved = !!localStorage.getItem('pole_chudes_state');

  const { theme, toggle: toggleTheme } = useTheme();
  const isLight = theme === 'light';

  function validate(): boolean {
    const groupErrs: string[] = form.groups.map((g) => validateGroupName(g) ?? '');
    const roundErrs = form.rounds.map((r) => ({
      word: validateCyrillicWord(r.word) ?? undefined,
      question: validateQuestion(r.question) ?? undefined,
    }));
    setErrors({ groups: groupErrs, rounds: roundErrs });
    return groupErrs.every((e) => !e) && roundErrs.every((r) => !r.word && !r.question);
  }

  function handleStart() {
    if (validate()) startGame(form);
  }

  function updateGroupName(i: number, v: string) {
    const g = [...form.groups];
    g[i] = v;
    setForm({ ...form, groups: g });
  }

  function updatePlayerName(groupIndex: number, playerIndex: number, name: string) {
    const pn = form.playerNames.map((row) => [...row]);
    if (!pn[groupIndex]) pn[groupIndex] = Array(PLAYERS_PER_GROUP).fill('');
    pn[groupIndex][playerIndex] = name;
    setForm({ ...form, playerNames: pn });
  }

  function handleExportConfig() {
    const blob = new Blob(
      [JSON.stringify({ groups: form.groups, playerNames: form.playerNames, rounds: form.rounds }, null, 2)],
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
        setForm({
          groups: data.groups,
          playerNames: data.playerNames ?? makeDefaultPlayerNames(data.groups.length),
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
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* ── Header ── */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gold tracking-wide">🎡 Поле Чудес</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Корпоративная игра · Настройка</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Bg music toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleBgMusic}
              title={bgMusicEnabled ? 'Выключить фоновую музыку' : 'Включить фоновую музыку'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                bgMusicEnabled
                  ? 'border-gold/50 bg-gold/15 text-gold'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
              style={!bgMusicEnabled ? { background: 'var(--color-card)' } : undefined}
            >
              {bgMusicEnabled ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              Музыка
            </button>
            {bgMusicEnabled && (
              <input
                type="range" min="0.05" max="0.8" step="0.05"
                value={bgMusicVolume}
                onChange={(e) => setBgMusicVolumeAction(parseFloat(e.target.value))}
                className="w-20 accent-gold"
                title="Громкость фоновой музыки"
              />
            )}
          </div>

          {/* Theme toggle */}
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Column 1: Groups + Player Names */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-xl">👥</span> Группы и игроки
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Назовите группы и раскройте список для ввода имён игроков. Имена сохраняются для следующих игр.
            </p>
            {form.groups.map((group, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--color-accent, #e94560)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => updateGroupName(i, e.target.value)}
                    className={`flex-1 input-field py-2 text-sm ${errors.groups[i] ? 'border-error' : ''}`}
                    placeholder={`Группа ${i + 1}`}
                  />
                </div>
                {errors.groups[i] && (
                  <p className="text-error text-xs ml-7">{errors.groups[i]}</p>
                )}
                {/* Collapsible player names */}
                <div className="ml-7">
                  <GroupPlayersPanel
                    groupIndex={i}
                    groupName={group}
                    playerNames={form.playerNames[i] ?? Array(PLAYERS_PER_GROUP).fill('')}
                    onChangeName={(pi, name) => updatePlayerName(i, pi, name)}
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Column 2: Rounds 1–3 */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-xl">📝</span> Слова и вопросы (1–3)
            </h2>
            {form.rounds.slice(0, 3).map((round, i) => (
              <RoundCard
                key={i}
                index={i}
                round={round}
                error={errors.rounds[i]}
                onChange={(r) => {
                  const rounds = [...form.rounds];
                  rounds[i] = r;
                  setForm({ ...form, rounds });
                }}
              />
            ))}
          </section>

          {/* Column 3: Rounds 4–5 + Final */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-xl">🏆</span> Слова и вопросы (4–5 + Финал)
            </h2>
            {form.rounds.slice(3).map((round, j) => {
              const i = j + 3;
              return (
                <RoundCard
                  key={i}
                  index={i}
                  round={round}
                  error={errors.rounds[i]}
                  onChange={(r) => {
                    const rounds = [...form.rounds];
                    rounds[i] = r;
                    setForm({ ...form, rounds });
                  }}
                />
              );
            })}
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
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportConfig}
              />
            </label>
            {importError && (
              <span className="text-error text-xs flex items-center gap-1">
                <X className="w-3 h-3" />{importError}
              </span>
            )}
            {importing && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Загрузка...</span>}
          </div>

          <button
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

// ── RoundCard sub-component ───────────────────────────────────────────────────
function RoundCard({
  index,
  round,
  error,
  onChange,
}: {
  index: number;
  round: { word: string; question: string };
  error?: { word?: string; question?: string };
  onChange: (r: { word: string; question: string }) => void;
}) {
  const isFinal = index === 5;
  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--color-card)', borderColor: isFinal ? 'rgba(245,197,66,0.35)' : 'var(--color-border)' }}
    >
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
          isFinal ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-accent/15 text-accent border border-accent/30'
        }`}
      >
        {isFinal ? '🏆 ФИНАЛ' : `Раунд ${index + 1}`}
      </span>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
          Слово (3–15 букв)
        </label>
        <input
          type="text"
          value={round.word}
          onChange={(e) => onChange({ ...round, word: e.target.value.toUpperCase() })}
          className={`w-full input-field py-2 font-bold tracking-widest uppercase text-sm ${error?.word ? 'border-error' : ''}`}
          placeholder="СЛОВО"
          maxLength={15}
        />
        {error?.word && <p className="text-error text-xs mt-1">{error.word}</p>}
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
          Вопрос-загадка
        </label>
        <textarea
          value={round.question}
          onChange={(e) => onChange({ ...round, question: e.target.value })}
          className={`w-full input-field resize-none h-16 text-sm ${error?.question ? 'border-error' : ''}`}
          placeholder="Введите вопрос или загадку..."
        />
        {error?.question && <p className="text-error text-xs mt-1">{error.question}</p>}
      </div>
    </div>
  );
}
