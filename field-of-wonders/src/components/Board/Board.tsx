import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export function Board() {
  const board      = useGameStore((s) => s.board);
  const gameStatus = useGameStore((s) => s.gameStatus);

  const letters = board.word.split('');

  const maxPerRow = 10;
  const rows: Array<Array<{ letter: string; revealed: boolean; index: number }>> = [];
  for (let i = 0; i < letters.length; i += maxPerRow) {
    rows.push(
      letters.slice(i, i + maxPerRow).map((letter, j) => ({
        letter,
        revealed: board.revealed[i + j],
        index: i + j,
      }))
    );
  }

  // Cell dimensions scale with word length — keep them big
  const cellW =
    letters.length <= 5  ? 88  :
    letters.length <= 7  ? 78  :
    letters.length <= 9  ? 68  :
    letters.length <= 12 ? 60  : 52;

  const cellH = Math.round(cellW * 1.2);

  const fontSize =
    letters.length <= 5  ? 44  :
    letters.length <= 7  ? 38  :
    letters.length <= 9  ? 32  :
    letters.length <= 12 ? 28  : 24;

  const showWord = gameStatus === 'roundComplete' || gameStatus === 'gameComplete';

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2.5 justify-center flex-wrap">
          {row.map(({ letter, revealed, index }) => {
            const isOpen = revealed || showWord;
            return (
              <motion.div
                key={index}
                className={`board-cell ${isOpen ? 'board-cell-open' : 'board-cell-closed'}`}
                style={{ width: cellW, height: cellH }}
                initial={false}
                animate={isOpen ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.span
                      key={`open-${index}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0,  opacity: 1 }}
                      exit={{ rotateY: -90,   opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="absolute inset-0 flex items-center justify-center font-black"
                      style={{ fontSize, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
                    >
                      {letter}
                    </motion.span>
                  ) : (
                    <motion.span
                      key={`closed-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.25 }}
                      className="absolute inset-0 flex items-center justify-center font-black"
                      style={{ fontSize: fontSize * 0.5, color: 'currentColor' }}
                    >
                      _
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Stats bar */}
      <div
        className="mt-1 flex items-center gap-4 text-sm font-medium rounded-xl px-5 py-2"
        style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}
      >
        <span>
          Букв: <strong style={{ color: 'var(--color-text)' }}>{letters.length}</strong>
        </span>
        <span className="text-success font-bold">
          ✓ {board.revealed.filter(Boolean).length}
        </span>
        <span className="text-accent font-bold">
          ? {board.revealed.filter((r) => !r).length}
        </span>
      </div>
    </div>
  );
}
