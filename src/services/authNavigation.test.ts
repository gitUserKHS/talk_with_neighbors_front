import { describe, expect, it } from 'vitest';
import {
  buildOAuthAuthorizationUrl,
  returnToFromRouteState,
  sanitizeReturnTo,
} from './authNavigation';

describe('OAuth navigation safety', () => {
  it('keeps local paths including search and hash', () => {
    expect(sanitizeReturnTo('/meetups?interest=running#next')).toBe('/meetups?interest=running#next');
    expect(returnToFromRouteState({
      from: { pathname: '/feed', search: '?page=2', hash: '#post' },
    })).toBe('/feed?page=2#post');
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example/steal',
    '/\\evil.example/steal',
    'feed',
  ])('rejects a non-local return target: %s', (target) => {
    expect(sanitizeReturnTo(target)).toBe('/feed');
  });

  it('builds the same-origin provider authorization path without a token', () => {
    const url = buildOAuthAuthorizationUrl('kakao', '/meetups?interest=산책');
    expect(url).toBe('/api/oauth2/authorization/kakao?returnTo=%2Fmeetups%3Finterest%3D%EC%82%B0%EC%B1%85');
    expect(url).not.toMatch(/token|session/i);
  });
});
