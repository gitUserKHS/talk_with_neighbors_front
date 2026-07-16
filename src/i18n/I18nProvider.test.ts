import { describe, expect, it } from 'vitest';
import { resolveLocale, selectTranslation } from './I18nProvider';

describe('resolveLocale', () => {
  it.each([
    { savedLocale: 'ko', browserLanguage: 'en-US', expected: 'ko' },
    { savedLocale: 'en', browserLanguage: 'ko-KR', expected: 'en' },
  ])('prefers saved locale $savedLocale over browser language', ({ savedLocale, browserLanguage, expected }) => {
    expect(resolveLocale(savedLocale, browserLanguage)).toBe(expected);
  });

  it.each([
    { savedLocale: 'invalid', browserLanguage: 'en-US', expected: 'en' },
    { savedLocale: 'invalid', browserLanguage: 'ko-KR', expected: 'ko' },
  ])('falls back to browser locale $expected for an invalid saved value', ({ savedLocale, browserLanguage, expected }) => {
    expect(resolveLocale(savedLocale, browserLanguage)).toBe(expected);
  });
});

describe('selectTranslation', () => {
  it('selects the Korean translation for the Korean locale', () => {
    expect(selectTranslation('ko', '안녕하세요', 'Hello')).toBe('안녕하세요');
  });

  it('selects the English translation for the English locale', () => {
    expect(selectTranslation('en', '안녕하세요', 'Hello')).toBe('Hello');
  });
});
