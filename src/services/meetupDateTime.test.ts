import { describe, expect, it } from 'vitest';
import {
  localDateTimeToUtcIso,
  meetupDateTimeToLocalInput,
  parseMeetupDateTime,
} from './meetupDateTime';

describe('meetup date-time API contract', () => {
  it('converts an explicit local offset to UTC Z', () => {
    expect(localDateTimeToUtcIso('2026-07-18T19:00:00+09:00'))
      .toBe('2026-07-18T10:00:00.000Z');
  });

  it('converts datetime-local input using the browser local zone', () => {
    const value = '2099-08-01T19:00';
    const converted = localDateTimeToUtcIso(value);

    expect(converted).toBe(new Date(value).toISOString());
    expect(converted).toMatch(/Z$/);
  });

  it('accepts offset-aware response values and rejects ambiguous values', () => {
    expect(parseMeetupDateTime('2026-07-18T10:00:00Z')?.toISOString())
      .toBe('2026-07-18T10:00:00.000Z');
    expect(parseMeetupDateTime('2026-07-18T19:00:00+09:00')?.toISOString())
      .toBe('2026-07-18T10:00:00.000Z');
    expect(parseMeetupDateTime('2026-07-18T19:00:00')).toBeNull();
  });

  it('round-trips an API instant through a browser-local edit input', () => {
    const instant = '2026-07-18T10:00:00.000Z';
    expect(localDateTimeToUtcIso(meetupDateTimeToLocalInput(instant))).toBe(instant);
  });
});
