import type { AuthProviderId } from '../types/auth';

const DEFAULT_RETURN_TO = '/feed';
const OAUTH_AUTHORIZATION_PATH = '/api/oauth2/authorization';

/**
 * OAuth return targets must stay inside this SPA. Protocol-relative URLs,
 * backslashes and control characters are rejected before either the browser or
 * the backend sees them.
 */
export const sanitizeReturnTo = (value: unknown, fallback = DEFAULT_RETURN_TO): string => {
  if (typeof value !== 'string') return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    // 오픈 리다이렉트를 막으려면 제어 문자를 걸러내는 것이 목적 그 자체다.
    // eslint-disable-next-line no-control-regex
    || /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, 'https://neighbors.invalid');
    if (parsed.origin !== 'https://neighbors.invalid') return fallback;
    // Keep the caller's already-safe relative form so URLSearchParams performs
    // exactly one encoding pass when it is attached to the OAuth request.
    return candidate;
  } catch {
    return fallback;
  }
};

export const returnToFromRouteState = (state: unknown, fallback = DEFAULT_RETURN_TO): string => {
  if (!state || typeof state !== 'object') return fallback;

  const from = (state as { from?: unknown }).from;
  if (typeof from === 'string') return sanitizeReturnTo(from, fallback);
  if (!from || typeof from !== 'object') return fallback;

  const location = from as { pathname?: unknown; search?: unknown; hash?: unknown };
  const pathname = typeof location.pathname === 'string' ? location.pathname : '';
  const search = typeof location.search === 'string' ? location.search : '';
  const hash = typeof location.hash === 'string' ? location.hash : '';
  return sanitizeReturnTo(`${pathname}${search}${hash}`, fallback);
};

export const buildOAuthAuthorizationUrl = (
  provider: AuthProviderId,
  returnTo: unknown,
): string => {
  const safeProvider: AuthProviderId = provider === 'kakao' ? 'kakao' : 'google';
  const query = new URLSearchParams({ returnTo: sanitizeReturnTo(returnTo) });
  return `${OAUTH_AUTHORIZATION_PATH}/${safeProvider}?${query.toString()}`;
};

export const startOAuthLogin = (provider: AuthProviderId, returnTo: unknown): void => {
  window.location.assign(buildOAuthAuthorizationUrl(provider, returnTo));
};
