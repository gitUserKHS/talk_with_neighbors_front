import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import { authErrorPresentation, authService, normalizeAuthProviders } from './authService';

const user = {
  id: '7',
  email: 'neighbor@example.test',
  username: 'neighbor',
};

describe('cookie-backed authentication state', () => {
  const get = vi.mocked(api.get);
  const post = vi.mocked(api.post);
  const put = vi.mocked(api.put);

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
  });

  it('restores the signed-in user from /auth/me without a script-readable token', async () => {
    get.mockResolvedValueOnce({ data: user });

    await expect(authService.getCurrentUser()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith('/auth/me');
  });

  it('accepts a legacy login envelope while the backend response converges', async () => {
    post.mockResolvedValueOnce({ data: { user }, headers: {} });

    await expect(authService.login('neighbor@example.test', 'password')).resolves.toEqual(user);
  });

  it('keeps the email verification challenge only in the caller response', async () => {
    post
      .mockResolvedValueOnce({
        data: {
          challengeId: 'challenge-1',
          expiresAt: '2026-07-15T10:10:00Z',
          resendAfterSeconds: 30,
        },
      })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { challengeId: 'challenge-2', resendAfterSeconds: 45 } });

    await expect(authService.requestEmailVerification(' Neighbor@Example.test ')).resolves.toMatchObject({
      challengeId: 'challenge-1',
      resendAfterSeconds: 30,
    });
    await expect(authService.confirmEmailVerification('challenge-1', '123456')).resolves.toBeUndefined();
    await expect(authService.resendEmailVerification('challenge-1')).resolves.toMatchObject({
      challengeId: 'challenge-2',
      resendAfterSeconds: 45,
    });

    expect(post).toHaveBeenNthCalledWith(1, '/auth/email-verifications', {
      email: 'Neighbor@Example.test',
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/auth/email-verifications/challenge-1/confirm',
      { code: '123456' },
    );
    expect(post).toHaveBeenNthCalledWith(3, '/auth/email-verifications/challenge-1/resend');
  });

  it('loads and normalizes only configured Kakao and Google providers', async () => {
    get.mockResolvedValueOnce({
      data: { providers: [{ id: 'KAKAO', enabled: true }, { id: 'github', enabled: true }, 'google'] },
    });

    await expect(authService.getAuthProviders()).resolves.toEqual([
      { id: 'kakao', enabled: true, displayName: '카카오' },
      { id: 'google', enabled: true, displayName: 'Google' },
    ]);
    expect(get).toHaveBeenCalledWith('/public/auth/providers');
  });

  it('reports whether the server currently enforces email verification', async () => {
    get.mockResolvedValueOnce({
      data: {
        providers: [{ id: 'kakao', enabled: false }],
        emailVerification: { enabled: false, reason: 'email_verification_unavailable' },
      },
    });

    await expect(authService.getAuthCapabilities()).resolves.toEqual({
      providers: [{ id: 'kakao', enabled: false, displayName: '카카오' }],
      emailVerification: {
        enabled: false,
        reason: 'email_verification_unavailable',
      },
    });
  });

  it('checks only the username after email proof instead of enumerating email accounts', async () => {
    get.mockResolvedValueOnce({ data: { emailExists: false, usernameExists: true } });

    await expect(authService.checkUsernameDuplicate(' neighbor ')).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith('/auth/check-duplicates', {
      params: { username: 'neighbor' },
    });
  });

  it('updates only the nickname through the dedicated authenticated endpoint', async () => {
    const updated = { ...user, username: 'dayun-neighbor', nicknameSetupRequired: false };
    put.mockResolvedValueOnce({ data: updated });

    await expect(authService.updateNickname('  dayun-neighbor  ')).resolves.toEqual(updated);
    expect(put).toHaveBeenCalledWith('/auth/profile/nickname', {
      nickname: 'dayun-neighbor',
    });
  });

  it('completes local logout even when the server session already expired', async () => {
    post.mockRejectedValueOnce(new Error('session already expired'));
    await expect(authService.logout()).resolves.toBeUndefined();
  });
});

describe('authentication response helpers', () => {
  it('accepts provider feature flags as a compatibility response', () => {
    expect(normalizeAuthProviders({ kakao: true, google: false })).toEqual([
      { id: 'kakao', enabled: true, displayName: '카카오' },
      { id: 'google', enabled: false, displayName: 'Google' },
    ]);
  });

  it('maps structured verification errors to actionable Korean copy', () => {
    expect(authErrorPresentation({
      isAxiosError: true,
      response: { data: { code: 'INVALID_VERIFICATION_CODE', message: 'raw' } },
    }, 'fallback')).toEqual({
      code: 'INVALID_VERIFICATION_CODE',
      message: '인증번호가 맞지 않아. 다시 확인해줘.',
      retryAfterSeconds: undefined,
    });
  });
});
