import { describe, expect, it } from 'vitest';
import {
  CODE_MESSAGES,
  errorCode,
  errorMessage,
  localizedApiError,
  serverErrorMessage,
} from './apiError';

const apiFailure = (data: unknown) => ({ response: { data } });

describe('API error helpers', () => {
  it('reads the server code trimmed and upper-cased', () => {
    expect(errorCode(apiFailure({ code: ' bad_credentials ' }))).toBe('BAD_CREDENTIALS');
    expect(errorCode(apiFailure({ code: '' }))).toBeUndefined();
    expect(errorCode(apiFailure({ code: null, message: '실패' }))).toBeUndefined();
    expect(errorCode(new Error('offline'))).toBeUndefined();
    expect(errorCode(undefined)).toBeUndefined();
  });

  it('keeps the message helpers ignoring blank server text', () => {
    expect(serverErrorMessage(apiFailure({ message: '   ' }))).toBeUndefined();
    expect(serverErrorMessage(apiFailure({ message: '서버 문구' }))).toBe('서버 문구');
    expect(errorMessage(new Error('offline'))).toBe('offline');
  });
});

describe('localizedApiError resolution order', () => {
  const failure = apiFailure({ code: 'BAD_CREDENTIALS', message: '서버 문구' });

  it('prefers the localized pair for a known code in both locales', () => {
    expect(localizedApiError(failure, 'ko', 'fallback')).toBe(CODE_MESSAGES.BAD_CREDENTIALS[0]);
    expect(localizedApiError(failure, 'en', 'fallback')).toBe(CODE_MESSAGES.BAD_CREDENTIALS[1]);
  });

  it('lets a caller-supplied table override the shared one', () => {
    const table = { BAD_CREDENTIALS: ['로컬 문구', 'Local copy'] as const };
    expect(localizedApiError(failure, 'en', 'fallback', table)).toBe('Local copy');
    expect(localizedApiError(failure, 'ko', 'fallback', {})).toBe('서버 문구');
  });

  it('falls back to the Korean server message only in the ko locale', () => {
    const unknownCode = apiFailure({ code: 'SOMETHING_NEW', message: '서버 문구' });
    expect(localizedApiError(unknownCode, 'ko', 'fallback')).toBe('서버 문구');
    expect(localizedApiError(unknownCode, 'en', 'fallback')).toBe('fallback');
  });

  it('uses the fallback when neither code nor message is usable', () => {
    expect(localizedApiError(apiFailure({ code: null, message: '' }), 'ko', 'fallback')).toBe('fallback');
    expect(localizedApiError(new Error('offline'), 'ko', 'fallback')).toBe('fallback');
    expect(localizedApiError(undefined, 'en', 'fallback')).toBe('fallback');
  });

  it('ships both languages for every shared code', () => {
    Object.entries(CODE_MESSAGES).forEach(([code, [korean, english]]) => {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(korean.trim()).not.toBe('');
      expect(english.trim()).not.toBe('');
    });
  });
});
