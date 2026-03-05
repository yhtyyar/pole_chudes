import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { isCyrillicLetter } from '../../utils/validators';
import {
  SlidersHorizontal, ChevronUp, ChevronDown,
  ArrowRight, ArrowLeft, Skull, Trophy,
  Pause, Play, Timer, Unlock, RotateCcw,
} from 'lucide-react';

export function AdminControls() {
  const turn         = useGameStore((s) => s.turn);
  const gameStatus   = useGameStore((s) => s.gameStatus);
  const forceRevealLetter = useGameStore((s) => s.forceRevealLetter);
  const forceBankrupt     = useGameStore((s) => s.forceBankrupt);
  const nextPlayer        = useGameStore((s) => s.nextPlayer);
  const previousPlayer    = useGameStore((s) => s.previousPlayer);
  const markWinner        = useGameStore((s) => s.markWinner);
  const pauseTimer        = useGameStore((s) => s.pauseTimer);
  const resumeTimer       = useGameStore((s) => s.resumeTimer);
  const startTimer        = useGameStore((s) => s.startTimer);
  const resetTimer        = useGameStore((s) => s.resetTimer);
  const extendTimer       = useGameStore((s) => s.extendTimer);

  const [revealLetter, setRevealLetter] = useState('');
  const [expanded, setExpanded]         = useState(true);

  const isPlaying = gameStatus === 'playing' || gameStatus === 'final';

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {children}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:opacity-90"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Панель ведущего
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>

          {/* ── Переход между игроками ── */}
          <div>
            <SectionLabel>Смена игрока</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="prev-player-btn"
                onClick={previousPlayer}
                disabled={!isPlaying}
                title="Вернуться к предыдущему игроку (если не успели записать букву)"
                className="btn-admin bg-blue-500/15 border-blue-400/30 hover:bg-blue-500/25 flex items-center justify-center gap-1 text-xs"
                style={{ color: 'var(--color-text)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Предыдущий
              </button>
              <button
                data-testid="next-player-btn"
                onClick={nextPlayer}
                disabled={!isPlaying}
                title="Передать ход следующему игроку"
                className="btn-admin bg-blue-600/20 border-blue-500/35 hover:bg-blue-600/35 flex items-center justify-center gap-1 text-xs"
                style={{ color: 'var(--color-text)' }}
              >
                Следующий <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              «Предыдущий» — если игрок назвал букву, но не успели записать
            </p>
          </div>

          {/* ── Исход хода ── */}
          <div>
            <SectionLabel>Исход хода</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="force-bankrupt-btn"
                onClick={forceBankrupt}
                disabled={!isPlaying}
                title="Засчитать банкрот текущему игроку — очки раунда сгорают"
                className="btn-admin bg-error/15 border-error/35 text-error hover:bg-error/25 flex items-center justify-center gap-1 text-xs"
              >
                <Skull className="w-3.5 h-3.5" /> Банкрот
              </button>
              <button
                data-testid="mark-winner-btn"
                onClick={markWinner}
                disabled={!isPlaying}
                title="Объявить текущего игрока победителем раунда"
                className="btn-admin bg-gold/15 border-gold/35 text-gold hover:bg-gold/25 flex items-center justify-center gap-1 text-xs"
              >
                <Trophy className="w-3.5 h-3.5" /> Победитель
              </button>
            </div>
          </div>

          {/* ── Таймер ── */}
          <div>
            <SectionLabel>Таймер</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {!turn.timerRunning ? (
                <>
                  <button
                    onClick={startTimer}
                    title="Запустить таймер с 20 секунд"
                    className="btn-admin flex-1 bg-success/15 border-success/35 text-success hover:bg-success/25 flex items-center justify-center gap-1 text-xs"
                  >
                    <Timer className="w-3.5 h-3.5" /> Запустить
                  </button>
                  <button
                    onClick={resumeTimer}
                    disabled={turn.timer >= 20}
                    title="Продолжить остановленный таймер"
                    className="btn-admin flex-1 bg-success/10 border-success/25 text-success hover:bg-success/20 flex items-center justify-center gap-1 text-xs disabled:opacity-30"
                  >
                    <Play className="w-3.5 h-3.5" /> Продолжить
                  </button>
                </>
              ) : (
                <button
                  onClick={pauseTimer}
                  title="Поставить таймер на паузу"
                  className="btn-admin flex-1 bg-gold/15 border-gold/35 text-gold hover:bg-gold/25 flex items-center justify-center gap-1 text-xs"
                >
                  <Pause className="w-3.5 h-3.5" /> Пауза
                </button>
              )}
              <button
                onClick={() => extendTimer(10)}
                title="Добавить 10 секунд к таймеру"
                className="btn-admin bg-[var(--color-card)] border-[var(--color-border)] hover:opacity-80 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                +10с
              </button>
              <button
                onClick={resetTimer}
                title="Сбросить таймер до 20 секунд"
                className="btn-admin bg-[var(--color-card)] border-[var(--color-border)] hover:opacity-80 flex items-center gap-1 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              Таймер стартует вручную — нажмите «Запустить» когда игрок готов называть
            </p>
          </div>

          {/* ── Открыть букву вручную ── */}
          <div>
            <SectionLabel>Открыть букву вручную</SectionLabel>
            <div className="flex gap-2">
              <input
                data-testid="reveal-letter-input"
                type="text"
                maxLength={1}
                value={revealLetter}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  if (v === '' || isCyrillicLetter(v)) setRevealLetter(v);
                }}
                placeholder="Б"
                className="w-14 h-10 text-center text-lg font-bold rounded-lg border outline-none transition-colors"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                data-testid="reveal-letter-btn"
                onClick={() => { if (revealLetter) { forceRevealLetter(revealLetter); setRevealLetter(''); } }}
                disabled={!revealLetter}
                className="btn-admin flex-1 bg-accent/15 border-accent/35 text-accent hover:bg-accent/25 disabled:opacity-40 flex items-center justify-center gap-1 text-xs"
              >
                <Unlock className="w-3.5 h-3.5" /> Открыть букву
              </button>
            </div>
            <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              Открывает букву без начисления очков — для исправления ошибок ведущего
            </p>
          </div>

          {/* ── Горячие клавиши ── */}
          <div className="rounded-xl p-3" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Горячие клавиши</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span><kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--color-panel)' }}>Space</kbd> крутить</span>
              <span><kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--color-panel)' }}>Enter</kbd> буква</span>
              <span><kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--color-panel)' }}>Esc</kbd> пауза</span>
              <span><kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--color-panel)' }}>N</kbd> игрок →</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
