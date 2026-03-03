import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { isCyrillicLetter } from '../../utils/validators';
import { SlidersHorizontal, ChevronUp, ChevronDown, ArrowRight, Forward, Skull, Trophy, Pause, Play, Unlock } from 'lucide-react';

export function AdminControls() {
  const turn = useGameStore((s) => s.turn);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const forceRevealLetter = useGameStore((s) => s.forceRevealLetter);
  const forceBankrupt = useGameStore((s) => s.forceBankrupt);
  const nextPlayer = useGameStore((s) => s.nextPlayer);
  const skipTurn = useGameStore((s) => s.skipTurn);
  const markWinner = useGameStore((s) => s.markWinner);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);
  const [revealLetter, setRevealLetter] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isPlaying = gameStatus === 'playing' || gameStatus === 'final';

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:opacity-90"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Панель ведущего
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          {/* Quick actions row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={nextPlayer}
              disabled={!isPlaying}
              className="btn-admin bg-blue-600/30 border-blue-500/40 text-blue-300 hover:bg-blue-600/50 flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-4 h-4" /> Следующий игрок
            </button>
            <button
              onClick={skipTurn}
              disabled={!isPlaying}
              className="btn-admin bg-white/5 border-white/20 text-white/60 hover:bg-white/10 flex items-center justify-center gap-1"
            >
              <Forward className="w-4 h-4" /> Пропустить ход
            </button>
            <button
              onClick={forceBankrupt}
              disabled={!isPlaying}
              className="btn-admin bg-error/20 border-error/40 text-error hover:bg-error/30 flex items-center justify-center gap-1"
            >
              <Skull className="w-4 h-4" /> Банкрот!
            </button>
            <button
              onClick={markWinner}
              disabled={!isPlaying}
              className="btn-admin bg-gold/20 border-gold/40 text-gold hover:bg-gold/30 flex items-center justify-center gap-1"
            >
              <Trophy className="w-4 h-4" /> Победитель!
            </button>
          </div>

          {/* Timer controls */}
          <div className="flex gap-2">
            {turn.timerRunning ? (
              <button
                onClick={pauseTimer}
                className="btn-admin flex-1 bg-gold/20 border-gold/40 text-gold hover:bg-gold/30 flex items-center justify-center gap-1"
              >
                <Pause className="w-4 h-4" /> Пауза таймера
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="btn-admin flex-1 bg-success/20 border-success/40 text-success hover:bg-success/30 flex items-center justify-center gap-1"
              >
                <Play className="w-4 h-4" /> Продолжить таймер
              </button>
            )}
          </div>

          {/* Force reveal letter */}
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={1}
              value={revealLetter}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                if (v === '' || isCyrillicLetter(v)) setRevealLetter(v);
              }}
              placeholder="Буква"
              className="w-20 h-10 text-center text-lg font-bold rounded-lg border outline-none transition-colors"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
            <button
              onClick={() => {
                if (revealLetter) {
                  forceRevealLetter(revealLetter);
                  setRevealLetter('');
                }
              }}
              disabled={!revealLetter}
              className="btn-admin flex-1 bg-accent/20 border-accent/40 text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Unlock className="w-4 h-4" /> Открыть букву вручную
            </button>
          </div>

          {/* Hotkey hints */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            <span><kbd className="px-1 rounded" style={{ background: 'var(--color-card)' }}>Space</kbd> — крутить</span>
            <span><kbd className="px-1 rounded" style={{ background: 'var(--color-card)' }}>Enter</kbd> — буква</span>
            <span><kbd className="px-1 rounded" style={{ background: 'var(--color-card)' }}>Esc</kbd> — пауза</span>
            <span><kbd className="px-1 rounded" style={{ background: 'var(--color-card)' }}>N</kbd> — игрок</span>
          </div>
        </div>
      )}
    </div>
  );
}
