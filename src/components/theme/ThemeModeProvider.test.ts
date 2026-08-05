import { describe, expect, it } from 'vitest';
import { resolveMode, resolvePreference } from './ThemeModeProvider';

describe('resolvePreference', () => {
  it('keeps a stored value that the toggle can produce', () => {
    expect(resolvePreference('light')).toBe('light');
    expect(resolvePreference('dark')).toBe('dark');
    expect(resolvePreference('system')).toBe('system');
  });

  it('falls back to system for missing or corrupted storage', () => {
    expect(resolvePreference(null)).toBe('system');
    expect(resolvePreference('')).toBe('system');
    expect(resolvePreference('sepia')).toBe('system');
  });
});

describe('resolveMode', () => {
  it('honours an explicit choice regardless of the operating system', () => {
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('follows the operating system when no explicit choice was made', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
  });
});
