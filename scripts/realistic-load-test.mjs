import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const baseUrl = (process.env.LOAD_BASE_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const socketUrl = process.env.LOAD_SOCKET_URL || 'http://127.0.0.1:3000/ws';
const userCount = Number(process.env.LOAD_USERS || 20);
const postsPerUser = Number(process.env.LOAD_POSTS_PER_USER || 2);
const messagesPerUser = Number(process.env.LOAD_MESSAGES_PER_USER || 3);
const feedRounds = Number(process.env.LOAD_FEED_ROUNDS || 20);
const requestTimeoutMs = Number(process.env.LOAD_REQUEST_TIMEOUT_MS || 15000);
const cleanupEnabled = process.env.LOAD_CLEANUP !== 'false';
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS || 2000);
const debugEnabled = process.env.LOAD_DEBUG === 'true';

if (!Number.isInteger(userCount) || userCount < 3) {
  throw new Error('LOAD_USERS must be an integer greater than or equal to 3.');
}

const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const password = 'LoadTest!2026';
const metrics = [];
const failures = [];

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

async function api(operation, path, { method = 'GET', sessionId, body } = {}) {
  const startedAt = performance.now();
  let status = 0;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    status = response.status;
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`${method} ${path} returned ${response.status}: ${text.slice(0, 300)}`);
    }
    metrics.push({ operation, durationMs: performance.now() - startedAt, status, ok: true });
    return { payload, headers: response.headers };
  } catch (error) {
    metrics.push({ operation, durationMs: performance.now() - startedAt, status, ok: false });
    failures.push(`${operation}: ${error.message}`);
    throw error;
  }
}

class StompProbe {
  constructor(user, roomId) {
    this.user = user;
    this.roomId = roomId;
    this.received = 0;
    this.errors = [];
    this.client = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`WebSocket ready timeout for ${this.user.username}`)), 10000);
      const client = new Client({
        webSocketFactory: () => new SockJS(`${socketUrl}?sessionId=${encodeURIComponent(this.user.sessionId)}`),
        reconnectDelay: 0,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: debugEnabled ? (message) => console.log(`STOMP ${this.user.username}: ${message}`) : () => undefined,
      });
      this.client = client;
      client.onConnect = () => {
        client.subscribe(`/user/queue/chat/room/${this.roomId}`, () => {
          this.received += 1;
        });
        client.publish({
          destination: '/app/chat.enterRoom',
          body: JSON.stringify({ roomId: this.roomId }),
        });
        clearTimeout(timeout);
        setTimeout(resolve, 250);
      };
      client.onStompError = (frame) => {
        this.errors.push(frame.body || frame.headers.message || 'STOMP error');
        clearTimeout(timeout);
        reject(new Error(`STOMP connection failed for ${this.user.username}: ${this.errors.at(-1)}`));
      };
      client.onWebSocketError = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed for ${this.user.username}: ${error.message}`));
      };
      client.activate();
    });
  }

  close() {
    if (this.client?.connected) {
      this.client.publish({
        destination: '/app/chat.leaveRoom',
        body: JSON.stringify({ roomId: this.roomId }),
      });
    }
    void this.client?.deactivate();
  }
}

async function waitForWebSocketDelivery(probes, expectedPerUser) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (probes.every((probe) => probe.received >= expectedPerUser)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function assert(condition, message) {
  if (!condition) failures.push(`validation: ${message}`);
}

console.log(`Load run ${runId}: ${userCount} users, ${postsPerUser} posts/user, ${messagesPerUser} messages/user`);

const users = await Promise.all(
  Array.from({ length: userCount }, async (_, index) => {
    const username = `load_${runId}_${index}`;
    const email = `${username}@example.test`;
    const { payload, headers } = await api('auth.register', '/auth/register', {
      method: 'POST',
      body: { email, password, username },
    });
    const sessionId = headers.get('x-session-id');
    assert(Boolean(sessionId), `registration for ${username} did not return X-Session-Id`);
    return { id: String(payload.id), username, email, sessionId };
  }),
);

await Promise.all(
  users.map((user, index) =>
    api('auth.profile', '/auth/profile', {
      method: 'PUT',
      sessionId: user.sessionId,
      body: {
        username: user.username,
        age: 20 + (index % 20),
        gender: index % 2 === 0 ? 'female' : 'male',
        bio: `realistic load user ${runId}`,
        latitude: 37.5665 + index * 0.00001,
        longitude: 126.978 + index * 0.00001,
        address: '서울시 중구',
        interests: ['산책', '카페'],
      },
    }),
  ),
);

const createdPosts = (
  await Promise.all(
    users.flatMap((user, userIndex) =>
      Array.from({ length: postsPerUser }, (_, postIndex) =>
        api('feed.create', '/feed', {
          method: 'POST',
          sessionId: user.sessionId,
          body: {
            caption: `load post ${runId} ${userIndex}-${postIndex}`,
            imageUrl: `https://picsum.photos/seed/${runId}-${userIndex}-${postIndex}/640/640`,
            interestTags: ['산책', '부하테스트'],
          },
        }).then(({ payload }) => ({ id: payload.id, authorIndex: userIndex })),
      ),
    ),
  )
).flat();

await Promise.all(
  createdPosts.flatMap((post) => {
    const commenter = users[(post.authorIndex + 1) % users.length];
    const liker = users[(post.authorIndex + 2) % users.length];
    return [
      api('feed.comment', `/feed/${post.id}/comments`, {
        method: 'POST',
        sessionId: commenter.sessionId,
        body: { content: `load comment ${runId} on ${post.id}` },
      }),
      api('feed.like', `/feed/${post.id}/likes`, {
        method: 'POST',
        sessionId: liker.sessionId,
      }),
    ];
  }),
);

const { payload: room } = await api('chat.room.create', '/chat/rooms', {
  method: 'POST',
  sessionId: users[0].sessionId,
  body: {
    name: `load-room-${runId}`,
    type: 'GROUP',
    participantNicknames: users.slice(1).map((user) => user.username),
  },
});
assert(Boolean(room.id), 'group chat room did not return an id');

const probes = users.map((user) => new StompProbe(user, room.id));
await Promise.all(probes.map((probe) => probe.connect()));

const sentMessages = await Promise.all(
  users.flatMap((user, userIndex) =>
    Array.from({ length: messagesPerUser }, (_, messageIndex) =>
      api('chat.message.send', `/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        sessionId: user.sessionId,
        body: { content: `load message ${runId} ${userIndex}-${messageIndex}` },
      }).then(({ payload }) => payload),
    ),
  ),
);

const expectedMessagesPerProbe = sentMessages.length - messagesPerUser;
await waitForWebSocketDelivery(probes, expectedMessagesPerProbe);

for (let round = 0; round < feedRounds; round += 1) {
  // Keep the declared user concurrency (20 by default) while producing a
  // sustained multi-round burst instead of accidentally opening 400 at once.
  await Promise.all(
    users.map((user) => api('feed.burst.read', '/feed?page=0&size=20', { sessionId: user.sessionId })),
  );
}

const { payload: chatPage } = await api('chat.messages.verify', `/chat/rooms/${room.id}/messages?page=0&size=200`, {
  sessionId: users[0].sessionId,
});
assert(chatPage.totalElements === sentMessages.length, `chat stored ${chatPage.totalElements}, expected ${sentMessages.length}`);

const overviews = await Promise.all(
  users.map((user) => api('mypage.overview', '/mypage/overview', { sessionId: user.sessionId }).then(({ payload }) => payload)),
);
overviews.forEach((overview, index) => {
  assert(overview.postCount === postsPerUser, `user ${index} postCount=${overview.postCount}, expected ${postsPerUser}`);
  assert(overview.commentCount === postsPerUser, `user ${index} commentCount=${overview.commentCount}, expected ${postsPerUser}`);
  assert(overview.likedPostCount === postsPerUser, `user ${index} likedPostCount=${overview.likedPostCount}, expected ${postsPerUser}`);
});

probes.forEach((probe, index) => {
  assert(probe.errors.length === 0, `WebSocket user ${index} returned ${probe.errors.length} STOMP errors`);
  assert(
    probe.received === expectedMessagesPerProbe,
    `WebSocket user ${index} received ${probe.received}, expected ${expectedMessagesPerProbe}`,
  );
  probe.close();
});

if (cleanupEnabled) {
  await Promise.all(
    createdPosts.map((post) =>
      api('cleanup.feed.delete', `/feed/${post.id}`, {
        method: 'DELETE',
        sessionId: users[post.authorIndex].sessionId,
      }),
    ),
  );
  await api('cleanup.chat.delete', `/chat/rooms/${room.id}`, {
    method: 'DELETE',
    sessionId: users[0].sessionId,
  });
}

const successfulDurations = metrics.filter((metric) => metric.ok).map((metric) => metric.durationMs);
const failedRequests = metrics.filter((metric) => !metric.ok).length;
const summary = {
  runId,
  users: userCount,
  requests: metrics.length,
  failedRequests,
  errorRate: metrics.length ? failedRequests / metrics.length : 0,
  p50Ms: Math.round(percentile(successfulDurations, 0.5)),
  p95Ms: Math.round(percentile(successfulDurations, 0.95)),
  p99Ms: Math.round(percentile(successfulDurations, 0.99)),
  maxMs: Math.round(Math.max(...successfulDurations, 0)),
  postsCreated: createdPosts.length,
  commentsCreated: createdPosts.length,
  likesCreated: createdPosts.length,
  chatMessagesCreated: sentMessages.length,
  feedBurstReads: userCount * feedRounds,
  websocketConnections: probes.length,
  websocketExpectedPerUser: expectedMessagesPerProbe,
  websocketMinReceived: Math.min(...probes.map((probe) => probe.received)),
  websocketMaxReceived: Math.max(...probes.map((probe) => probe.received)),
};

assert(failedRequests === 0, `${failedRequests} HTTP requests failed`);
assert(summary.p95Ms <= maxP95Ms, `p95 ${summary.p95Ms}ms exceeded ${maxP95Ms}ms threshold`);

console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  console.error(`Load test failed with ${failures.length} issue(s):`);
  failures.slice(0, 30).forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('PASS: no request errors, no data mismatch, no WebSocket message loss.');
}
