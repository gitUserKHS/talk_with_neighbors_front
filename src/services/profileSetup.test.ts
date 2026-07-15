import { describe, expect, it } from 'vitest';
import {
  destinationAfterAuthentication,
  destinationAfterOnboarding,
  NICKNAME_SETUP_PATH,
  PROFILE_ONBOARDING_PATH,
  requiredProfileSetupPath,
} from './profileSetup';

const user = {
  id: '7',
  email: 'neighbor@example.test',
  username: 'neighbor',
};

describe('profile setup routing', () => {
  it('prioritizes required nickname setup over the rest of onboarding', () => {
    const pending = { ...user, nicknameSetupRequired: true, profileComplete: false };

    expect(requiredProfileSetupPath(pending)).toBe(NICKNAME_SETUP_PATH);
    expect(destinationAfterAuthentication(pending, '/meetups?tab=mine')).toBe(
      '/onboarding/nickname?returnTo=%2Fmeetups%3Ftab%3Dmine',
    );
  });

  it('sends an ordinary incomplete profile to the existing onboarding flow', () => {
    const incomplete = { ...user, nicknameSetupRequired: false, profileComplete: false };

    expect(requiredProfileSetupPath(incomplete)).toBe(PROFILE_ONBOARDING_PATH);
    expect(destinationAfterAuthentication(incomplete, '/feed')).toBe(
      '/onboarding?returnTo=%2Ffeed',
    );
  });

  it('keeps ready users on a sanitized local return target', () => {
    const ready = { ...user, nicknameSetupRequired: false, profileComplete: true };

    expect(destinationAfterAuthentication(ready, '/chat/12')).toBe('/chat/12');
    expect(destinationAfterAuthentication(ready, 'https://evil.example')).toBe('/feed');
  });

  it('preserves the original target through profile onboarding without setup loops', () => {
    expect(destinationAfterOnboarding('/chat/12')).toBe('/chat/12');
    expect(destinationAfterOnboarding('/onboarding?returnTo=%2Ffeed')).toBe('/matching');
    expect(destinationAfterOnboarding('/onboarding//')).toBe('/matching');
    expect(destinationAfterOnboarding('/onboarding/nickname?returnTo=%2Ffeed')).toBe('/matching');
    expect(destinationAfterOnboarding('/onboarding/nickname/')).toBe('/matching');
    expect(destinationAfterOnboarding('https://evil.example')).toBe('/matching');
  });
});
