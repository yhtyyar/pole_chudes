export function validateCyrillicWord(word: string): string | null {
  const trimmed = word.trim().toUpperCase();
  if (!trimmed) return 'Слово обязательно';
  if (!/^[А-ЯЁ]+$/.test(trimmed)) return 'Только кириллица';
  if (trimmed.length < 3) return 'Минимум 3 буквы';
  if (trimmed.length > 15) return 'Максимум 15 букв';
  return null;
}

export function validateQuestion(q: string): string | null {
  if (!q.trim()) return 'Вопрос обязателен';
  if (q.trim().length < 5) return 'Вопрос слишком короткий';
  return null;
}

export function validateGroupName(name: string): string | null {
  if (!name.trim()) return 'Название группы обязательно';
  return null;
}

export function normalizeLetter(letter: string): string {
  return letter.trim().toUpperCase().replace('Ё', 'Е');
}

export function isCyrillicLetter(char: string): boolean {
  return /^[А-ЯЁа-яё]$/.test(char);
}
