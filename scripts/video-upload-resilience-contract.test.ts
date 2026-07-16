import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(path, 'utf8');

test('feed and chat share the guarded video upload policy', () => {
  const policy = readSource('src/services/mediaUploadPolicy.ts');
  const newPost = readSource('src/pages/NewPost.tsx');
  const chatRoom = readSource('src/components/chat/ChatRoom.tsx');

  assert.match(policy, /MAX_VIDEO_BYTES = 30 \* 1024 \* 1024/);
  assert.match(policy, /MAX_VIDEO_COUNT = 1/);
  assert.match(policy, /MAX_VIDEO_DURATION_SECONDS = 60/);
  assert.match(policy, /MAX_VIDEO_SIDE_PIXELS = 1920/);
  assert.match(policy, /MAX_MEDIA_REQUEST_BYTES = 120 \* 1024 \* 1024/);

  for (const source of [newPost, chatRoom]) {
    assert.match(source, /MAX_VIDEO_COUNT/);
    assert.match(source, /mediaUploadStatusText\(uploadProgress\)/);
    assert.doesNotMatch(source, /100MB/);
  }

  assert.match(newPost, /동영상은 한 번에 1개만 업로드할 수 있습니다/);
  assert.match(newPost, /첨부 파일의 전체 크기는 120MB/);
  assert.doesNotMatch(newPost, /200MB/);
  assert.match(chatRoom, /동영상은 한 번에 1개만 보낼 수 있습니다/);
});

test('completed browser transfer is presented as server-side processing', () => {
  const policy = readSource('src/services/mediaUploadPolicy.ts');
  assert.match(policy, /progress >= 100/);
  assert.match(policy, /서버에서 안전하게 최적화하고 있습니다/);
});
