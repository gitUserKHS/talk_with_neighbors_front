import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TYPING_SIGNAL_TTL_MS,
  applyRoomRead,
  applyTypingSignal,
  mergeChatMessage,
  pruneTypingSignals,
} from '../src/services/chatMessageState.ts';

test('an edited realtime message replaces the existing message without duplication', () => {
  const current = [{ id: 'm1', content: 'before', isDeleted: false }];
  const result = mergeChatMessage(current, { id: 'm1', content: 'after', isDeleted: false });

  assert.equal(result.length, 1);
  assert.equal(result[0].content, 'after');
});

test('a deleted realtime message replaces content in every open client', () => {
  const current = [{ id: 'm1', content: 'before', isDeleted: false }];
  const result = mergeChatMessage(current, { id: 'm1', content: '', isDeleted: true });

  assert.equal(result.length, 1);
  assert.equal(result[0].isDeleted, true);
  assert.equal(result[0].content, '');
});

test('a newly received message is appended', () => {
  const current = [{ id: 'm1', content: 'first' }];
  const result = mergeChatMessage(current, { id: 'm2', content: 'second' });

  assert.deepEqual(result.map((message) => message.id), ['m1', 'm2']);
});

test('a ROOM_READ frame adds the reader to every message that lacks it', () => {
  const current = [
    { id: 'm1', readByUsers: [1] },
    { id: 'm2', readByUsers: [1, 7] },
    { id: 'm3', readByUsers: undefined as number[] | undefined },
  ];
  const result = applyRoomRead(current, 7);

  assert.notEqual(result, current);
  assert.deepEqual(result.map((message) => message.readByUsers), [[1, 7], [1, 7], [7]]);
  assert.deepEqual(current[0].readByUsers, [1]);
});

test('a ROOM_READ frame never duplicates a reader already present', () => {
  const current = [{ id: 'm1', readByUsers: [1, 7] }];
  const result = applyRoomRead(current, 7);

  assert.deepEqual(result[0].readByUsers, [1, 7]);
});

test('a ROOM_READ frame returns the same array when nothing changes', () => {
  const current = [
    { id: 'm1', readByUsers: [7] },
    { id: 'm2', readByUsers: [1, 7] },
  ];

  assert.equal(applyRoomRead(current, 7), current);
  assert.equal(applyRoomRead([], 7).length, 0);
});

test('a typing signal replaces the same user and keeps other typers', () => {
  const first = applyTypingSignal({}, { userId: 7, senderName: '민수' }, 1_000);
  const withSecond = applyTypingSignal(first, { userId: 8, senderName: '지현' }, 1_500);
  const refreshed = applyTypingSignal(withSecond, { userId: 7, senderName: '민수' }, 3_000);

  assert.deepEqual(Object.keys(refreshed).sort(), ['7', '8']);
  assert.equal(refreshed['7'].expiresAt, 3_000 + TYPING_SIGNAL_TTL_MS);
  assert.equal(refreshed['8'].expiresAt, 1_500 + TYPING_SIGNAL_TTL_MS);
});

test('expired typing signals are pruned while live ones stay', () => {
  const current = {
    '7': { name: '민수', expiresAt: 5_000 },
    '8': { name: '지현', expiresAt: 9_000 },
  };

  assert.deepEqual(pruneTypingSignals(current, 6_000), { '8': { name: '지현', expiresAt: 9_000 } });
  assert.equal(pruneTypingSignals(current, 1_000), current);
});
