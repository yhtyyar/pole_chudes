import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export function Question() {
  const currentRound     = useGameStore((s) => s.currentRound);
  const config           = useGameStore((s) => s.config);
  const questionVisible  = useGameStore((s) => s.questionVisible);
  const setQuestionVisible = useGameStore((s) => s.setQuestionVisible);

  const round = config.rounds[currentRound];
  if (!round) return null;

  return (
    <div
      className="relative rounded-2xl border p-6"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              background: round.isFinal ? 'rgba(245,197,66,0.15)' : 'rgba(233,69,96,0.15)',
              color:      round.isFinal ? '#f5c542' : '#e94560',
              border:     `1px solid ${round.isFinal ? 'rgba(245,197,66,0.3)' : 'rgba(233,69,96,0.3)'}`,
            }}
          >
            {round.isFinal ? '🏆 Финал' : `Раунд ${currentRound + 1}`}
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {round.word.length} букв
          </span>
        </div>

        <button
          onClick={() => setQuestionVisible(!questionVisible)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 hover:opacity-80 active:scale-95"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {questionVisible ? '🙈 Скрыть' : '👁 Показать'}
        </button>
      </div>

      {/* Question text */}
      <AnimatePresence mode="wait">
        {questionVisible ? (
          <motion.div
            key="visible"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {/* Decorative quote mark */}
            <div
              className="text-5xl font-black leading-none mb-1 select-none"
              style={{ color: 'rgba(245,197,66,0.25)' }}
            >
              "
            </div>
            <p
              className="text-2xl leading-snug font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {round.question}
            </p>
          </motion.div>
        ) : (
          <motion.p
            key="hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-lg italic"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Вопрос скрыт ведущим
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
