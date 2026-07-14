import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: mocks.create,
  },
}));

vi.mock('../store', () => ({
  store: { dispatch: vi.fn() },
}));

vi.mock('../store/slices/authSlice', () => ({
  setUser: vi.fn((payload) => ({ type: 'auth/setUser', payload })),
}));

describe('API cookie authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.create.mockReset();
    mocks.requestUse.mockReset();
    mocks.responseUse.mockReset();
    mocks.create.mockReturnValue({
      interceptors: {
        request: { use: mocks.requestUse },
        response: { use: mocks.responseUse },
      },
    });
  });

  it('uses browser credentials without adding a script-managed session header', async () => {
    await import('./api');

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ withCredentials: true }));
    const request = mocks.requestUse.mock.calls[0][0];
    const config = request({ data: undefined, headers: {} });

    expect(config.headers).not.toHaveProperty('X-Session-Id');
  });
});
