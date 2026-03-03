import { useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { validateCyrillicWord, validateQuestion, validateGroupName } from '../utils/validators';
import { useTheme } from '../context/ThemeContext';
import type { SetupForm } from '../types';

const DEFAULT_GROUPS = ['Группа 1', 'Группа 2', 'Группа 3', 'Группа 4', 'Группа 5'];
const DEFAULT_ROUNDS = [
  { word: '', question: '' },
  { word: '', question: '' },
  { word: '', question: '' },
  { word: '', question: '' },
  { word: '', question: '' },
  { word: '', question: '' },
];

interface FieldErrors {
  groups: string[];
  rounds: Array<{ word?: string; question?: string }>;
}

export function Setup() {
  const startGame = useGameStore((s) => s.startGame);
  const loadSavedState = useGameStore((s) => s.loadSavedState);
  const importStateFromFile = useGameStore((s) => s.importStateFromFile);

  const [form, setForm] = useState<SetupForm>({
    groups: [...DEFAULT_GROUPS],
    rounds: DEFAULT_ROUNDS.map((r) => ({ ...r })),
  });
  const [errors, setErrors] = useState<FieldErrors>({ groups: [], rounds: [] });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const hasSaved = !!localStorage.getItem('pole_chudes_state');

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

  function handleExportConfig() {
    const blob = new Blob([JSON.stringify({ groups: form.groups, rounds: form.rounds }, null, 2)], {
      type: 'application/json',
    });
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
        setForm({ groups: data.groups, rounds: data.rounds });
      } else if (data.config) {
        // Full game state import
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

  const { theme, toggle: toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <header className="border-b px-8 py-5 flex items-center justify-between" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-3xl font-bold text-gold tracking-wide">🎡 Поле Чудес</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Корпоративная игра · Настройка</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Тёмная тема' : 'Светлая тема'}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: isLight ? '#f5c542' : '#1e293b',
              border: '2px solid',
              borderColor: isLight ? '#d97706' : '#334155',
              boxShadow: isLight ? '0 0 12px rgba(245,197,66,0.5)' : '0 0 12px rgba(99,102,241,0.4)',
            }}
          >
            <span className="text-lg leading-none">{isLight ? '☀️' : '🌙'}</span>
          </button>
          {hasSaved && (
            <button
              onClick={() => loadSavedState()}
              className="px-5 py-2.5 rounded-xl bg-success/20 border border-success/40 text-success font-semibold hover:bg-success/30 transition-colors text-sm"
            >
              ↩ Продолжить игру
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Groups */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-2xl">👥</span> Группы игроков
            </h2>
            {form.groups.map((group, i) => (
              <div key={i}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                  Группа {i + 1}
                </label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => {
                    const g = [...form.groups];
                    g[i] = e.target.value;
                    setForm({ ...form, groups: g });
                  }}
                  className={`w-full input-field ${errors.groups[i] ? 'border-error' : ''}`}
                  placeholder={`Группа ${i + 1}`}
                />
                {errors.groups[i] && (
                  <p className="text-error text-xs mt-1">{errors.groups[i]}</p>
                )}
              </div>
            ))}
          </section>

          {/* Right: Rounds */}
          <section className="space-y-5">
            <h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <span className="text-2xl">📝</span> Слова и вопросы
            </h2>
            {form.rounds.map((round, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      i === 5
                        ? 'bg-gold/20 text-gold border border-gold/40'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {i === 5 ? '🏆 ФИНАЛ' : `Раунд ${i + 1}`}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                    Слово (кириллица, 3–15 букв)
                  </label>
                  <input
                    type="text"
                    value={round.word}
                    onChange={(e) => {
                      const r = [...form.rounds];
                      r[i] = { ...r[i], word: e.target.value.toUpperCase() };
                      setForm({ ...form, rounds: r });
                    }}
                    className={`w-full input-field font-bold tracking-widest uppercase ${
                      errors.rounds[i]?.word ? 'border-error' : ''
                    }`}
                    placeholder="СЛОВО"
                    maxLength={15}
                  />
                  {errors.rounds[i]?.word && (
                    <p className="text-error text-xs mt-1">{errors.rounds[i].word}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                    Вопрос-загадка
                  </label>
                  <textarea
                    value={round.question}
                    onChange={(e) => {
                      const r = [...form.rounds];
                      r[i] = { ...r[i], question: e.target.value };
                      setForm({ ...form, rounds: r });
                    }}
                    className={`w-full input-field resize-none h-20 ${
                      errors.rounds[i]?.question ? 'border-error' : ''
                    }`}
                    placeholder="Введите вопрос или загадку..."
                  />
                  {errors.rounds[i]?.question && (
                    <p className="text-error text-xs mt-1">{errors.rounds[i].question}</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* Footer actions */}
      <footer className="border-t px-8 py-5" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleExportConfig}
              className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-80"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              📥 Сохранить конфигурацию
            </button>
            <label
              className="px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-80 cursor-pointer"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              📤 Загрузить конфигурацию
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportConfig}
              />
            </label>
            {importError && <span className="text-error text-sm">{importError}</span>}
            {importing && <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Загрузка...</span>}
          </div>

          <button
            onClick={handleStart}
            className="px-8 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-bold text-lg uppercase tracking-widest shadow-[0_0_25px_rgba(233,69,96,0.4)] transition-all active:scale-95"
          >
            🚀 Начать игру
          </button>
        </div>
      </footer>
    </div>
  );
}
