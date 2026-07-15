import { describe, expect, it } from 'vitest';
import { mergeChatMessage } from './chatMessageState';

describe('chat message websocket merge', () => {
  it('updates a structured schedule card in place when the server reuses its message id', () => {
    const original = {
      id: 'message-1',
      type: 'SCHEDULE',
      schedule: { id: 'schedule-1', version: 1, title: '산책' },
    };
    const updated = {
      id: 'message-1',
      type: 'SCHEDULE',
      schedule: { id: 'schedule-1', version: 2, title: '저녁 산책' },
    };

    expect(mergeChatMessage([original], updated)).toEqual([updated]);
  });
});
