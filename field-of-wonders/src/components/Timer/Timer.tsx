import { useGameStore } from '../../stores/gameStore';

export function Timer() {
  const timer        = useGameStore((s) => s.turn.timer);
  const timerRunning = useGameStore((s) => s.turn.timerRunning);
  const phase        = useGameStore((s) => s.turn.phase);
  const pauseTimer   = useGameStore((s) => s.pauseTimer);
  const resumeTimer  = useGameStore((s) => s.resumeTimer);
  const extendTimer  = useGameStore((s) => s.extendTimer);
  const resetTimer   = useGameStore((s) => s.resetTimer);

  const radius       = 44;
  const circumference = 2 * Math.PI * radius;
  const progress     = timer / 20;
  const strokeDashoffset = circumference * (1 - progress);

  const isLow    = timer <= 5;
  const isDanger = timer <= 3;
  const isInput  = phase === 'input';

  const strokeColor = isDanger ? '#ef4444' : isLow ? '#f59e0b' : '#00d26a';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular timer */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="8"
            style={{ opacity: 0.4 }}
          />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease',
              filter: `drop-shadow(0 0 6px ${strokeColor}88)`,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            data-testid="timer-display"
            className={`text-4xl font-bold tabular-nums transition-colors duration-300 ${
              isDanger ? 'text-error animate-pulse' : isLow ? 'text-gold' : ''
            }`}
            style={!isDanger && !isLow ? { color: 'var(--color-text)' } : undefined}
          >
            {timer}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>сек</span>
        </div>
      </div>

      {/* Timer controls */}
      {isInput && (
        <div className="flex gap-2 flex-wrap justify-center">
          {timerRunning ? (
            <button
              onClick={pauseTimer}
              className="px-3 py-1.5 rounded-lg bg-gold/20 text-gold border border-gold/40 text-sm font-medium hover:bg-gold/30 transition-colors"
            >
              ⏸ Пауза
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="px-3 py-1.5 rounded-lg bg-success/20 text-success border border-success/40 text-sm font-medium hover:bg-success/30 transition-colors"
            >
              ▶ Продолжить
            </button>
          )}
          <button
            onClick={() => extendTimer(10)}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            +10с
          </button>
          <button
            onClick={resetTimer}
            className="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            ↺ Сброс
          </button>
        </div>
      )}

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Esc — пауза/продолжить</p>
    </div>
  );
}
