import { useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { isCyrillicLetter } from '../../utils/validators';

export function LetterInput() {
  const turn = useGameStore((s) => s.turn);
  const setPendingLetter = useGameStore((s) => s.setPendingLetter);
  const submitLetter = useGameStore((s) => s.submitLetter);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = turn.phase === 'input';

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        Введите букву
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          maxLength={1}
          value={turn.pendingLetter}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            if (val === '' || isCyrillicLetter(val)) {
              setPendingLetter(val);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && turn.pendingLetter) {
              submitLetter();
            }
          }}
          placeholder="А"
          className="w-20 h-16 text-center text-3xl font-bold rounded-xl border-2 outline-none transition-all duration-200"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-text)',
            borderColor: turn.pendingLetter ? '#e94560' : 'rgba(255,255,255,0.3)',
            boxShadow: turn.pendingLetter ? '0 0 12px rgba(233,69,96,0.4)' : undefined,
          }}
        />
        <button
          onClick={submitLetter}
          disabled={!turn.pendingLetter}
          className={`
            flex-1 py-3 rounded-xl font-bold text-lg uppercase tracking-wide
            transition-all duration-200 active:scale-95
            ${
              turn.pendingLetter
                ? 'bg-success hover:bg-success/80 text-white shadow-[0_0_15px_rgba(0,210,106,0.3)] cursor-pointer'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }
          `}
        >
          ✓ Назвать букву
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Enter — подтвердить</p>
    </div>
  );
}
