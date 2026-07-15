import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('./websocketService', () => ({ websocketService: {} }));
vi.mock('../store', () => ({ store: { dispatch: vi.fn() } }));

import api from './api';
import { chatService } from './chatService';

const message = {
  id: 'message-1',
  roomId: 'room-1',
  senderId: 7,
  senderName: '다윤',
  content: '수정한 메시지',
  createdAt: '2026-07-15T01:00:00Z',
  updatedAt: '2026-07-15T02:00:00Z',
  editedAt: '2026-07-15T02:00:00Z',
  type: 'TEXT' as const,
  isDeleted: false,
  readByUsers: [7],
};

describe('chat message author mutation API contract', () => {
  const patch = vi.mocked(api.patch);
  const remove = vi.mocked(api.delete);

  beforeEach(() => {
    patch.mockReset();
    remove.mockReset();
  });

  it('updates a message in its room and maps the server version', async () => {
    patch.mockResolvedValueOnce({ data: message });
    await expect(chatService.updateMessage('room-1', 'message-1', '수정한 메시지'))
      .resolves.toMatchObject({ chatRoomId: 'room-1', content: '수정한 메시지' });
    expect(patch).toHaveBeenCalledWith('/chat/rooms/room-1/messages/message-1', {
      content: '수정한 메시지',
    });
  });

  it('keeps the deleted server tombstone for realtime replacement', async () => {
    remove.mockResolvedValueOnce({ data: { ...message, content: '', isDeleted: true } });
    await expect(chatService.deleteMessage('room-1', 'message-1'))
      .resolves.toMatchObject({ id: 'message-1', content: '', isDeleted: true });
    expect(remove).toHaveBeenCalledWith('/chat/rooms/room-1/messages/message-1');
  });
});
