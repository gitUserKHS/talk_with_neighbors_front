import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const loadTestSource = await readFile(new URL('./realistic-load-test.mjs', import.meta.url), 'utf8');

test('realistic load test authenticates HTTP and SockJS with cookies', () => {
  assert.match(loadTestSource, /headers:\s*\{\s*Cookie:/);
  assert.match(loadTestSource, /getSetCookie/);
  assert.doesNotMatch(loadTestSource, /X-Session-Id/i);
  assert.doesNotMatch(loadTestSource, /\?sessionId=/i);
});
