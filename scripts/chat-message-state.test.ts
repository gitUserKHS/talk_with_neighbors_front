import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeChatMessage } from '../src/services/chatMessageState.ts';

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
