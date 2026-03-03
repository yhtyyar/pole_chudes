export interface GameMeta {
  version: string;
  createdAt: number;
  lastSaved: number;
}

export interface RoundConfig {
  id: number;
  word: string;
  question: string;
  completed: boolean;
  isFinal?: boolean;
  winnerId?: string;
}

export interface Player {
  id: string;
  name: string;
  group: number;
  score: number;
  roundScore: number; // очки текущего раунда (сгорают при банкроте)
  isWinner: boolean;
  isBankrupt: boolean;
}

export interface BoardState {
  word: string;
  revealed: boolean[];
}

export type DrumSector =
  | { type: 'points'; value: number }
  | { type: 'double' }
  | { type: 'extra' }
  | { type: 'bankrupt' }
  | { type: 'prize' }
  | { type: 'bank' };

export interface TurnState {
  currentPlayerIndex: number;
  timer: number;
  timerRunning: boolean;
  sector: DrumSector | null;
  drumSpinning: boolean;
  phase: 'spin' | 'input' | 'result' | 'waiting';
  pendingLetter: string;
  extraTurn: boolean;
  bankAmount: number; // накопленный банк для текущего игрока
}

export type GameStatus = 'setup' | 'playing' | 'roundComplete' | 'final' | 'gameComplete';

export interface GameState {
  meta: GameMeta;
  config: {
    groups: string[];
    rounds: RoundConfig[];
  };
  currentRound: number;
  players: Player[];
  board: BoardState;
  turn: TurnState;
  gameStatus: GameStatus;
  questionVisible: boolean;
  muted: boolean;
  volume: number;
}

export interface SetupForm {
  groups: string[];
  rounds: Array<{ word: string; question: string }>;
}
