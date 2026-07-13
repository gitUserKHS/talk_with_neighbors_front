import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosHeaders } from 'axios';
import { buildChatMessageFormData } from '../src/services/multipart.ts';
import {
  DEFAULT_API_HEADERS,
  prepareRequestContentType,
} from '../src/services/requestConfig.ts';

type CapturedRequest = {
  data: unknown;
  headers: AxiosHeaders;
};

const capturePost = async (body: unknown): Promise<CapturedRequest> => {
  const client = axios.create({ headers: DEFAULT_API_HEADERS });
  let captured: CapturedRequest | undefined;

  client.interceptors.request.use((config) => {
    prepareRequestContentType(config.data, config.headers);
    return config;
  });
  client.defaults.adapter = async (config) => {
    captured = {
      data: config.data,
      headers: config.headers,
    };
    return {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  await client.post('/upload', body);
  assert.ok(captured);
  return captured;
};

test('single-file chat payload keeps FormData and its JSON message part', async () => {
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
  const formData = buildChatMessageFormData('파일이에요', [file]);

  assert.equal(formData.getAll('files').length, 1);
  assert.equal((formData.get('files') as File).name, 'hello.txt');
  assert.deepEqual(
    JSON.parse(await (formData.get('message') as Blob).text()),
    { content: '파일이에요' }
  );

  const captured = await capturePost(formData);
  assert.ok(captured.data instanceof FormData);
  assert.notEqual(captured.headers.getContentType(), 'application/json');
});

test('attachment-only and multi-file payload preserves every file', async () => {
  const files = [
    new File(['image'], 'photo.png', { type: 'image/png' }),
    new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
    new File(['document'], 'notes.txt', { type: 'text/plain' }),
  ];
  const formData = buildChatMessageFormData('', files);

  assert.equal(formData.getAll('files').length, 3);
  assert.deepEqual(
    formData.getAll('files').map((entry) => (entry as File).name),
    ['photo.png', 'clip.mp4', 'notes.txt']
  );
  assert.deepEqual(JSON.parse(await (formData.get('message') as Blob).text()), { content: '' });

  const captured = await capturePost(formData);
  assert.ok(captured.data instanceof FormData);
  assert.notEqual(captured.headers.getContentType(), 'application/json');
});

test('ordinary API objects still serialize as JSON', async () => {
  const captured = await capturePost({ content: '텍스트 메시지' });

  assert.equal(captured.data, JSON.stringify({ content: '텍스트 메시지' }));
  assert.equal(captured.headers.getContentType(), 'application/json');
});
