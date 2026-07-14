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
import { authService } from './authService';

const user = {
  id: 7,
  email: 'neighbor@example.test',
  username: 'neighbor',
};

describe('cookie-backed authentication state', () => {
  const get = vi.mocked(api.get);
  const post = vi.mocked(api.post);

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('restores the signed-in user from /auth/me without a script-readable token', async () => {
    get.mockResolvedValueOnce({ data: user });

    await expect(authService.getCurrentUser()).resolves.toEqual(user);

    expect(get).toHaveBeenCalledWith('/auth/me');
  });

  it('accepts a login response that contains a user but no session header', async () => {
    post.mockResolvedValueOnce({ data: { user }, headers: {} });

    await expect(authService.login('neighbor@example.test', 'password')).resolves.toEqual(user);
  });

  it('completes local logout even when the server session already expired', async () => {
    post.mockRejectedValueOnce(new Error('session already expired'));

    await expect(authService.logout()).resolves.toBeUndefined();
  });
});
