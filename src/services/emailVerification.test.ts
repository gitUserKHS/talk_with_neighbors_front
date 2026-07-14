import { describe, expect, it } from 'vitest';
import { DEFAULT_RESEND_DELAY_SECONDS, resendDelaySeconds } from './emailVerification';

describe('email verification resend timing', () => {
  it('uses the backend delay when present', () => {
    expect(resendDelaySeconds({ challengeId: 'c1', resendAfterSeconds: 12.2 })).toBe(13);
  });

  it('calculates an absolute resend time without going below zero', () => {
    const now = Date.parse('2026-07-15T10:00:00Z');
    expect(resendDelaySeconds({
      challengeId: 'c1',
      resendAvailableAt: '2026-07-15T10:00:30Z',
    }, now)).toBe(30);
    expect(resendDelaySeconds({
      challengeId: 'c1',
      resendAvailableAt: '2026-07-15T09:59:00Z',
    }, now)).toBe(0);
  });

  it('falls back to a conservative cooldown', () => {
    expect(resendDelaySeconds({ challengeId: 'c1' })).toBe(DEFAULT_RESEND_DELAY_SECONDS);
  });
});
