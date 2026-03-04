# System Architecture Document

## 1. Технологический стек
- **Frontend Framework:** React 19 (Hooks-based)
- **Language:** TypeScript 5 (Strict mode)
- **Build Tool:** Vite 8
- **State Management:** Zustand 5
- **Styling:** Tailwind CSS 3 + CSS Variables
- **Animations:** Framer Motion 11
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library

## 2. Структура проекта (Folder Structure)
```
src/
├── components/          # Reusable UI components
│   ├── Board/           # Word board, letters
│   ├── Drum/            # Spinning drum, fullscreen view
│   ├── Controls/        # Admin panel, letter input
│   └── common/          # Shared components (buttons, badges)
├── stores/              # Zustand state management
│   └── gameStore.ts     # Main game state logic
├── hooks/               # Custom React hooks
│   ├── useTimer.ts
│   └── useHotkeys.ts
├── utils/               # Helpers
│   ├── gameLogger.ts    # Action logging
│   ├── sounds.ts        # Audio context/Web Audio API
│   └── validators.ts    # Input validation
├── types/               # TypeScript interfaces
│   └── index.ts
└── pages/               # Main route views
    ├── Setup.tsx        # Game configuration
    ├── Game.tsx         # Main game board
    └── Final.tsx        # Victory screen
```

## 3. Архитектура управления состоянием (Zustand Store)

Централизованное хранилище `useGameStore` разделено на логические блоки:

### 3.1. Глобальный стейт (GameState)
- `gameStatus`: 'setup' | 'playing' | 'roundComplete' | 'final' | 'gameComplete'
- `players`: Массив объектов `Player` (id, name, score, roundScore, isBankrupt).
- `rounds`: Настройки всех раундов.
- `currentRound`: Индекс текущего раунда.

### 3.2. Состояние доски (BoardState)
- `word`: Загаданное слово (string).
- `revealed`: Массив boolean, отражающий какие буквы открыты.

### 3.3. Состояние хода (TurnState)
- `currentPlayerIndex`: Индекс активного игрока.
- `phase`: 'spin' (нужно крутить барабан) | 'input' (нужно назвать букву) | 'result' (результат хода).
- `drumSpinning`: boolean.
- `sector`: Выпавший сектор (`DrumSector`).
- `pendingLetter`: Введенная буква.
- `timer`, `timerRunning`: Состояние таймера хода.

## 4. Архитектура Барабана (Wheel Logic)
Синхронизация визуальной части и бизнес-логики:
1. Пользователь жмет "Крутить".
2. Вычисляется `Math.random()`, по весам определяется выпавший сектор (предвычисление).
3. Рассчитывается точный угол поворота (targetAngle).
4. Запускается Framer Motion анимация до targetAngle.
5. По завершению Promise от анимации, вызывается функция `finishDrumSpin(sector)`, которая обновляет стейт и переводит игру в фазу 'input'.
*Важно: Никаких таймаутов, только синхронизация через Promise анимации.*

## 5. Персистентность данных
Реализовано сохранение состояния игры в `localStorage`. При монтировании главного компонента (`App.tsx`) происходит попытка загрузки состояния `loadSavedState()`, чтобы исключить потерю данных при случайном обновлении страницы (F5).

## 6. Звуковая подсистема
Используется Web Audio API / HTML5 Audio. Предзагрузка звуков происходит в `utils/sounds.ts`. Звуки контролируются из Store (учитывается флаг `muted` и уровень `volume`).
