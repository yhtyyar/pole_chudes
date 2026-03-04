# AI Prompt & Implementation Guide

Этот документ предназначен для передачи ИИ (LLM / Cascade / Cursor / Copilot) в качестве промпта для воссоздания проекта с нуля.

## Цель (Objective)
Создать веб-приложение — аналог телеигры "Поле Чудес". 

## 1. Инициализация проекта (Setup)
Выполни следующие команды в терминале:
```bash
npm create vite@latest field-of-wonders -- --template react-ts
cd field-of-wonders
npm install
npm install zustand framer-motion lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 2. Настройка Tailwind CSS
В `tailwind.config.js` добавь пути:
```javascript
export default {
  darkMode: ['attribute', '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        success: '#10b981',
        error: '#ef4444',
        accent: '#3b82f6',
        gold: '#f59e0b',
      }
    },
  },
  plugins: [],
}
```

В `src/index.css` скопируй CSS переменные для светлой и темной темы (см. документ `4_UIUX_Design.md`).

## 3. Архитектура Store (Zustand)
Создай файл `src/stores/gameStore.ts`.
Реализуй интерфейсы из `2_SystemArchitecture.md`.
Обязательные методы в сторе:
- `startGame(setupForm)`
- `spinDrumAction()`
- `finishDrumSpin(sector)`
- `submitLetter()`
- `nextPlayer()`
- `tickTimer()`, `pauseTimer()`, `resumeTimer()`

## 4. Разработка компонентов

### Шаг 4.1: Страница Setup (src/pages/Setup.tsx)
Форма с динамическим добавлением до 5 групп (команд) и настройкой 6 раундов (5 обычных + 1 финал). 
Для каждого раунда поля: "Слово" и "Вопрос".

### Шаг 4.2: Компонент Барабана (src/components/Drum/Drum.tsx)
- Массив `DRUM_SECTORS` с весами вероятности.
- Визуализация через повернутые `div` элементы внутри круглого контейнера.
- Использование `useAnimation` из `framer-motion` для вращения свойства `rotate`.
- Фуллскрин версия барабана (React Portal) для акцента на результате.

### Шаг 4.3: Компонент Табло (src/components/Board/Board.tsx)
- Принимает `word` (строка) и `revealed` (массив boolean).
- Рендерит flex-контейнер с клетками. Каждая клетка имеет 3D flip анимацию при `revealed[index] === true`.

### Шаг 4.4: Страница Game (src/pages/Game.tsx)
Сборка главного экрана.
- Левая колонка: Список игроков с выделением активного (`turn.currentPlayerIndex`), Компонент ввода буквы, Панель Админа.
- Центр: Текст вопроса, Табло.
- Правая колонка: Барабан, Таймер хода.

## 5. Валидация и Утилиты
Создай `src/utils/validators.ts`:
- Функция `isCyrillicLetter(char)` - регулярное выражение `/^[А-ЯЁа-яё]$/`.
- Функция `normalizeLetter(char)` - превращает 'Ё' в 'Е'.

## 6. Звуки (Опционально)
Создай `src/utils/sounds.ts`. Используй `AudioContext` или HTML5 `Audio` конструктор для коротких звуков (Spin, Correct, Wrong, Bankrupt, Win).

## 7. Требования к коду
- Строгая типизация TypeScript.
- Избегай прямого мутирования состояния (используй сеттеры Zustand).
- Используй `lucide-react` для всех иконок, никаких эмодзи.
- Адаптивная верстка (Tailwind flex/grid).
