import { describe, it, expect } from 'vitest';
import {
  validateCyrillicWord,
  validateQuestion,
  validateGroupName,
  normalizeLetter,
  isCyrillicLetter,
} from '../utils/validators';

// ─── validateCyrillicWord ────────────────────────────────────────────────────

describe('validateCyrillicWord', () => {
  it('accepts valid cyrillic words', () => {
    expect(validateCyrillicWord('СЛОВО')).toBeNull();
    expect(validateCyrillicWord('БАРАБАН')).toBeNull();
    expect(validateCyrillicWord('КОТ')).toBeNull();
    expect(validateCyrillicWord('АБВГДЕЁЖЗИЙКЛМН')).toBeNull(); // 15 chars
  });

  it('rejects empty string', () => {
    expect(validateCyrillicWord('')).not.toBeNull();
  });

  it('rejects whitespace-only string', () => {
    expect(validateCyrillicWord('   ')).not.toBeNull();
  });

  it('rejects words shorter than 3 letters', () => {
    expect(validateCyrillicWord('АБ')).not.toBeNull();
    expect(validateCyrillicWord('А')).not.toBeNull();
  });

  it('rejects words longer than 15 letters', () => {
    expect(validateCyrillicWord('АБВГДЕЁЖЗИЙКЛМНО')).not.toBeNull(); // 16 chars
  });

  it('rejects latin characters', () => {
    expect(validateCyrillicWord('WORD')).not.toBeNull();
    expect(validateCyrillicWord('СЛОВО1')).not.toBeNull();
  });

  it('rejects mixed cyrillic+latin', () => {
    expect(validateCyrillicWord('СЛОВОa')).not.toBeNull();
  });

  it('trims whitespace before validation', () => {
    expect(validateCyrillicWord('  СЛОВО  ')).toBeNull();
  });

  it('accepts uppercase cyrillic after normalization', () => {
    expect(validateCyrillicWord('слово')).toBeNull(); // lowercase should work too
  });
});

// ─── validateQuestion ────────────────────────────────────────────────────────

describe('validateQuestion', () => {
  it('accepts a normal question', () => {
    expect(validateQuestion('Это животное живёт в лесу')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateQuestion('')).not.toBeNull();
  });

  it('rejects whitespace-only', () => {
    expect(validateQuestion('    ')).not.toBeNull();
  });

  it('rejects very short strings (< 5 chars)', () => {
    expect(validateQuestion('Что')).not.toBeNull();
    expect(validateQuestion('АБ')).not.toBeNull();
  });

  it('accepts exactly 5 chars', () => {
    expect(validateQuestion('Слово')).toBeNull();
  });
});

// ─── validateGroupName ───────────────────────────────────────────────────────

describe('validateGroupName', () => {
  it('accepts valid group names', () => {
    expect(validateGroupName('Группа 1')).toBeNull();
    expect(validateGroupName('Команда Альфа')).toBeNull();
    expect(validateGroupName('A')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateGroupName('')).not.toBeNull();
  });

  it('rejects whitespace-only', () => {
    expect(validateGroupName('   ')).not.toBeNull();
  });
});

// ─── normalizeLetter ─────────────────────────────────────────────────────────

describe('normalizeLetter', () => {
  it('uppercases a lowercase letter', () => {
    expect(normalizeLetter('а')).toBe('А');
  });

  it('replaces Ё with Е', () => {
    expect(normalizeLetter('Ё')).toBe('Е');
    expect(normalizeLetter('ё')).toBe('Е');
  });

  it('trims whitespace', () => {
    expect(normalizeLetter('  А  ')).toBe('А');
  });

  it('leaves already uppercase cyrillic as-is', () => {
    expect(normalizeLetter('Б')).toBe('Б');
  });
});

// ─── isCyrillicLetter ────────────────────────────────────────────────────────

describe('isCyrillicLetter', () => {
  it('returns true for single cyrillic uppercase letters', () => {
    expect(isCyrillicLetter('А')).toBe(true);
    expect(isCyrillicLetter('Я')).toBe(true);
    expect(isCyrillicLetter('Ё')).toBe(true);
  });

  it('returns true for single cyrillic lowercase letters', () => {
    expect(isCyrillicLetter('а')).toBe(true);
    expect(isCyrillicLetter('я')).toBe(true);
  });

  it('returns false for latin letters', () => {
    expect(isCyrillicLetter('A')).toBe(false);
    expect(isCyrillicLetter('z')).toBe(false);
  });

  it('returns false for digits', () => {
    expect(isCyrillicLetter('1')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isCyrillicLetter('')).toBe(false);
  });

  it('returns false for multiple characters', () => {
    expect(isCyrillicLetter('АБ')).toBe(false);
  });

  it('returns false for special characters', () => {
    expect(isCyrillicLetter(' ')).toBe(false);
    expect(isCyrillicLetter('!')).toBe(false);
  });
});
