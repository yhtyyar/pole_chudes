import { motion } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

export function Score() {
  const players = useGameStore((s) => s.players);
  const currentRound = useGameStore((s) => s.currentRound);
  const turn = useGameStore((s) => s.turn);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const config = useGameStore((s) => s.config);

  const isFinal = gameStatus === 'final' || config.rounds[currentRound]?.isFinal;

  const roundPlayers = isFinal
    ? players.filter((p) => p.id.startsWith('final_'))
    : players.filter((p) => p.group === currentRound + 1 && !p.id.startsWith('final_'));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-1">
        {isFinal ? 'Финалисты' : `Группа ${currentRound + 1} · ${config.groups[currentRound] || ''}`}
      </h3>
      {roundPlayers.map((player, idx) => {
        const isActive = idx === turn.currentPlayerIndex && gameStatus === 'playing';
        const isBankrupt = player.isBankrupt;
        const isWinner = player.isWinner;

        return (
          <motion.div
            key={player.id}
            layout
            className={`
              relative flex items-center justify-between rounded-xl px-4 py-3 
              transition-all duration-300 border
              ${isActive
                ? 'bg-accent/20 border-accent shadow-[0_0_15px_rgba(233,69,96,0.3)]'
                : isWinner
                ? 'bg-gold/20 border-gold/60'
                : 'bg-card/50 border-white/10'
              }
            `}
          >
            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="active-indicator"
                className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-xl"
              />
            )}

            <div className="flex items-center gap-3">
              {/* Player number */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isActive ? 'bg-accent text-white' : 'bg-white/10 text-white/60'}`}
              >
                {idx + 1}
              </div>

              <div>
                <div className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-white/80'}`}>
                  {player.name}
                </div>
                {isBankrupt && (
                  <div className="text-error text-xs font-medium">💀 БАНКРОТ</div>
                )}
                {isWinner && (
                  <div className="text-gold text-xs font-medium">🏆 ПОБЕДИТЕЛЬ</div>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className={`text-xl font-bold tabular-nums
                ${isWinner ? 'text-gold' : isActive ? 'text-white' : 'text-white/70'}`}>
                {player.score}
              </div>
              {player.roundScore > 0 && player.roundScore !== player.score && (
                <div className="text-success text-xs">+{player.roundScore} в ходу</div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
