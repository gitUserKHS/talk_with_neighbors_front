import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clients: [] as any[],
  dispatch: vi.fn(),
  sockJs: vi.fn(function SockJsMock(url: string) {
    return { url };
  }),
}));

vi.mock('@stomp/stompjs', () => ({
  Client: class ClientMock {
    active = false;
    connected = false;
    config: any;
    subscriptions: Array<{ destination: string; callback: (message: { body: string }) => void }> = [];
    publish = vi.fn();

    constructor(config: any) {
      this.config = config;
      mocks.clients.push(this);
    }

    activate = vi.fn(() => {
      this.active = true;
    });

    deactivate = vi.fn(() => {
      this.active = false;
      this.connected = false;
    });

    subscribe = vi.fn((destination: string, callback: (message: { body: string }) => void) => {
      this.subscriptions.push({ destination, callback });
      return { unsubscribe: vi.fn() };
    });
  },
}));

vi.mock('sockjs-client', () => ({ default: mocks.sockJs }));

vi.mock('../store', () => ({
  store: { dispatch: mocks.dispatch },
}));

import { websocketService } from './websocketService';

describe('cookie-authenticated WebSocket subscriptions', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://neighbors.example.test');
    mocks.clients.length = 0;
    mocks.dispatch.mockReset();
    mocks.sockJs.mockClear();
  });

  afterEach(() => {
    websocketService.disconnect();
    websocketService.setCurrentUserId(undefined);
    vi.unstubAllEnvs();
  });

  it('connects without a session query parameter and uses one private read-status queue', () => {
    websocketService.setCurrentUserId(7);
    websocketService.initialize();
    const client = mocks.clients[0];

    client.config.webSocketFactory();
    expect(mocks.sockJs).toHaveBeenCalledWith('https://neighbors.example.test/ws');

    client.connected = true;
    client.config.onConnect();
    websocketService.subscribeToRoom('room-1', vi.fn());

    const destinations = client.subscribe.mock.calls.map(([destination]: [string]) => destination);
    expect(destinations).toContain('/user/queue/chat/read-status');
    expect(destinations).toContain('/user/queue/chat/room/room-1');
    expect(destinations.some((destination: string) => destination.startsWith('/topic/'))).toBe(false);
  });

  it('dispatches a private read-status notification to the matching room state', () => {
    websocketService.setCurrentUserId(7);
    websocketService.initialize();
    const client = mocks.clients[0];
    client.connected = true;
    client.config.onConnect();

    const subscription = client.subscriptions.find(
      ({ destination }: { destination: string }) => destination === '/user/queue/chat/read-status'
    );
    subscription.callback({
      body: JSON.stringify({
        type: 'MESSAGE_READ_STATUS_UPDATE',
        data: { messageId: 'message-1', chatRoomId: 'room-1', readByUserId: 9 },
      }),
    });

    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
      payload: { messageId: 'message-1', roomId: 'room-1', readByUserId: 9 },
    }));
  });

  it('publishes both room and message identifiers for an authorized read update', () => {
    websocketService.setCurrentUserId(7);
    websocketService.initialize();
    const client = mocks.clients[0];
    client.connected = true;

    websocketService.markMessageAsRead('room-1', 'message-1');

    expect(client.publish).toHaveBeenCalledWith({
      destination: '/app/chat.markAsRead',
      body: JSON.stringify({ roomId: 'room-1', messageId: 'message-1' }),
    });
  });
});
