import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  dispatch: vi.fn(),
  getState: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: mocks.create,
  },
}));

vi.mock('../store', () => ({
  store: { dispatch: mocks.dispatch, getState: mocks.getState },
}));

vi.mock('../store/slices/authSlice', () => ({
  setUser: vi.fn((payload) => ({ type: 'auth/setUser', payload })),
}));

vi.mock('../store/slices/notificationSlice', () => ({
  addNotification: vi.fn((payload) => ({ type: 'notifications/addNotification', payload })),
}));

const unauthorized = { response: { status: 401 } };

const rejectUnauthorized = async () => {
  await import('./api');
  const onRejected = mocks.responseUse.mock.calls[0][1];

  await expect(onRejected(unauthorized)).rejects.toBe(unauthorized);
};

describe('API cookie authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.create.mockReset();
    mocks.requestUse.mockReset();
    mocks.responseUse.mockReset();
    mocks.dispatch.mockReset();
    mocks.getState.mockReset();
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

  it('clears the user and explains the expired session on a 401 while signed in', async () => {
    mocks.getState.mockReturnValue({ auth: { user: { id: 7 } } });

    await rejectUnauthorized();

    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setUser', payload: null });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'notifications/addNotification',
      payload: expect.objectContaining({ type: 'warning', navigateTo: '/login' }),
    });
  });

  it('stays quiet on a 401 when nobody was signed in', async () => {
    mocks.getState.mockReturnValue({ auth: { user: null } });

    await rejectUnauthorized();

    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'auth/setUser', payload: null });
  });
});
