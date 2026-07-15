import type { User } from '../types/user';
import { sanitizeReturnTo } from './authNavigation';

export const NICKNAME_SETUP_PATH = '/onboarding/nickname';
export const PROFILE_ONBOARDING_PATH = '/onboarding';
export const DEFAULT_POST_ONBOARDING_PATH = '/matching';

export const requiredProfileSetupPath = (user?: User | null): string | null => {
  if (!user) return null;
  if (user.nicknameSetupRequired === true) return NICKNAME_SETUP_PATH;
  if (user.profileComplete === false) return PROFILE_ONBOARDING_PATH;
  return null;
};

export const nicknameSetupDestination = (returnTo: unknown): string => {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  const query = new URLSearchParams({ returnTo: safeReturnTo });
  return `${NICKNAME_SETUP_PATH}?${query.toString()}`;
};

export const profileOnboardingDestination = (returnTo: unknown): string => {
  const safeReturnTo = sanitizeReturnTo(returnTo, DEFAULT_POST_ONBOARDING_PATH);
  const query = new URLSearchParams({ returnTo: safeReturnTo });
  return `${PROFILE_ONBOARDING_PATH}?${query.toString()}`;
};

export const destinationAfterOnboarding = (returnTo: unknown): string => {
  const safeReturnTo = sanitizeReturnTo(returnTo, DEFAULT_POST_ONBOARDING_PATH);
  const pathname = safeReturnTo.split(/[?#]/, 1)[0];
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (normalizedPathname === PROFILE_ONBOARDING_PATH || normalizedPathname === NICKNAME_SETUP_PATH) {
    return DEFAULT_POST_ONBOARDING_PATH;
  }
  return safeReturnTo;
};

export const destinationAfterAuthentication = (user: User, returnTo: unknown): string => {
  const setupPath = requiredProfileSetupPath(user);
  if (setupPath === NICKNAME_SETUP_PATH) return nicknameSetupDestination(returnTo);
  if (setupPath === PROFILE_ONBOARDING_PATH) return profileOnboardingDestination(returnTo);
  return sanitizeReturnTo(returnTo);
};
