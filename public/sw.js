/* 이웃톡 서비스 워커.
 *
 * 캐시 대상은 내용 해시가 붙은 /assets/ 자산과 오프라인 안내 페이지(/offline.html)뿐이다.
 * 해시 자산은 이름이 바뀌지 않는 한 내용도 바뀌지 않으므로 오래된 코드를 계속 보여줄 위험이 없다.
 * index.html, API 응답, 업로드 미디어는 절대 캐시하지 않는다. HTML을 캐시하면 배포한 새 버전이
 * 사용자에게 도달하지 않고, API를 캐시하면 로그아웃한 뒤에도 이전 계정의 응답이 남을 수 있다.
 * 페이지 이동(navigate)은 항상 네트워크로 가고, 네트워크가 없을 때만 offline.html을 대신 보여준다.
 * nginx도 같은 정책이다. index.html은 no-store, /assets/는 immutable.
 */

const CACHE = 'twn-assets-v2';
// 오프라인 안내 페이지는 자산과 수명이 다르므로 따로 둔다. 워커가 새로 설치될 때마다 다시 받는다.
const SHELL_CACHE = 'twn-shell-v1';
const OFFLINE_URL = '/offline.html';
const KEEP_CACHES = [CACHE, SHELL_CACHE];

self.addEventListener('install', (event) => {
  // 새 워커가 이전 워커를 기다리지 않고 바로 활성화되도록 한다.
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      // HTTP 캐시를 거치지 않고 지금 배포된 페이지를 받아 둔다.
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    } catch {
      // 안내 페이지를 못 받아도 워커 설치는 막지 않는다. 그 경우 오프라인 대체 화면만 없다.
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !KEEP_CACHES.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const isHashedAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // 페이지 이동은 네트워크 우선이다. 응답을 캐시하지 않으므로 새 배포는 그대로 도달하고,
  // 네트워크가 끊겼을 때만 미리 받아 둔 안내 페이지로 대신한다.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!isHashedAsset(url)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    // 불투명 응답이나 오류를 저장하면 깨진 자산이 캐시에 고정된다.
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});

// 페이지가 새 워커로 즉시 넘어가고 싶을 때 쓴다.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* 웹푸시.
 *
 * userVisibleOnly로 구독했으므로 push를 받으면 반드시 알림을 띄워야 한다.
 * 띄우지 않으면 브라우저가 대신 "백그라운드에서 갱신됨" 같은 알림을 보여주거나
 * 반복되면 구독을 취소한다. 그래서 payload가 깨져도 기본 문구로 띄운다.
 */
self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // 서버가 형식을 바꾸거나 빈 푸시가 오더라도 알림은 반드시 띄워야 한다.
    payload = {};
  }

  const title = payload.title || '이웃톡';
  const options = {
    body: payload.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    // 같은 태그를 쓰면 알림이 쌓이지 않고 최신 것으로 대체된다.
    tag: payload.tag || 'twn-notification',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // 이미 열려 있는 탭이 있으면 새 창을 띄우지 않고 그 탭을 쓴다.
    for (const client of clientList) {
      if (new URL(client.url).origin === target.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target.href);
        return;
      }
    }

    await self.clients.openWindow(target.href);
  })());
});
