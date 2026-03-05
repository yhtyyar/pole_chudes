import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { isCyrillicLetter } from '../../utils/validators';
import { Check, AlignLeft, Type } from 'lucide-react';

export function LetterInput() {
  const turn = useGameStore((s) => s.turn);
  const setPendingLetter = useGameStore((s) => s.setPendingLetter);
  const submitLetter = useGameStore((s) => s.submitLetter);
  const submitWord = useGameStore((s) => s.submitWord);
  const letterRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const [wordMode, setWordMode] = useState(false);
  const [pendingWord, setPendingWord] = useState('');

  const isActive = turn.phase === 'input';

  useEffect(() => {
    if (isActive) {
      if (wordMode) wordRef.current?.focus();
      else letterRef.current?.focus();
    }
  }, [isActive, wordMode]);

  useEffect(() => {
    if (!isActive) {
      setPendingWord('');
      setWordMode(false);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setWordMode(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            !wordMode
              ? 'border-accent bg-accent/20 text-accent'
              : 'border-transparent text-[var(--color-text-muted)] hover:opacity-80'
          }`}
          style={wordMode ? { background: 'var(--color-card)' } : undefined}
        >
          <Type className="w-3.5 h-3.5" /> Буква
        </button>
        <button
          onClick={() => setWordMode(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            wordMode
              ? 'border-gold bg-gold/20 text-gold'
              : 'border-transparent text-[var(--color-text-muted)] hover:opacity-80'
          }`}
          style={!wordMode ? { background: 'var(--color-card)' } : undefined}
        >
          <AlignLeft className="w-3.5 h-3.5" /> Всё слово
        </button>
      </div>

      {!wordMode ? (
        <>
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Назвать букву
          </label>
          <div className="flex gap-2">
            <input
              ref={letterRef}
              type="text"
              maxLength={1}
              value={turn.pendingLetter}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (val === '' || isCyrillicLetter(val)) setPendingLetter(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && turn.pendingLetter) submitLetter();
              }}
              placeholder="А"
              className="w-16 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                borderColor: turn.pendingLetter ? '#e94560' : 'var(--color-border)',
                boxShadow: turn.pendingLetter ? '0 0 12px rgba(233,69,96,0.4)' : undefined,
              }}
            />
            <button
              onClick={submitLetter}
              disabled={!turn.pendingLetter}
              className={`flex-1 py-2 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 ${
                turn.pendingLetter
                  ? 'bg-success hover:bg-success/80 text-white shadow-[0_0_12px_rgba(0,210,106,0.3)] cursor-pointer'
                  : 'cursor-not-allowed opacity-40'
              }`}
              style={!turn.pendingLetter ? { background: 'var(--color-card)' } : undefined}
            >
              <Check className="w-4 h-4" /> Назвать
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Enter — подтвердить</p>
        </>
      ) : (
        <>
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Назвать слово целиком
          </label>
          <div className="flex gap-2">
            <input
              ref={wordRef}
              type="text"
              value={pendingWord}
              onChange={(e) => setPendingWord(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingWord.trim()) {
                  submitWord(pendingWord);
                  setPendingWord('');
                }
              }}
              placeholder="СЛОВО"
              className="flex-1 h-11 px-3 text-center text-base font-bold rounded-xl border-2 outline-none transition-all duration-200 uppercase tracking-widest"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                borderColor: pendingWord ? '#f5c542' : 'var(--color-border)',
                boxShadow: pendingWord ? '0 0 12px rgba(245,197,66,0.35)' : undefined,
              }}
            />
            <button
              onClick={() => { submitWord(pendingWord); setPendingWord(''); }}
              disabled={!pendingWord.trim()}
              className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 ${
                pendingWord.trim()
                  ? 'bg-gold hover:bg-gold/80 text-bg shadow-[0_0_12px_rgba(245,197,66,0.3)] cursor-pointer'
                  : 'cursor-not-allowed opacity-40'
              }`}
              style={!pendingWord.trim() ? { background: 'var(--color-card)' } : undefined}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Enter — подтвердить слово</p>
        </>
      )}
    </div>
  );
}
