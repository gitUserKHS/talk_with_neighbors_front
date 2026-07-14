import type { EmailVerificationChallenge } from '../types/auth';

export const DEFAULT_RESEND_DELAY_SECONDS = 60;

export const resendDelaySeconds = (
  challenge: EmailVerificationChallenge,
  now = Date.now(),
): number => {
  if (
    typeof challenge.resendAfterSeconds === 'number'
    && Number.isFinite(challenge.resendAfterSeconds)
  ) {
    return Math.max(0, Math.ceil(challenge.resendAfterSeconds));
  }

  if (challenge.resendAvailableAt) {
    const availableAt = Date.parse(challenge.resendAvailableAt);
    if (Number.isFinite(availableAt)) {
      return Math.max(0, Math.ceil((availableAt - now) / 1000));
    }
  }

  return DEFAULT_RESEND_DELAY_SECONDS;
};
