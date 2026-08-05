/* 이웃톡 서비스 워커.
 *
 * 캐시 대상은 내용 해시가 붙은 /assets/ 자산으로만 한정한다.
 * 이 파일들은 이름이 바뀌지 않는 한 내용도 바뀌지 않으므로 오래된 코드를 계속 보여줄 위험이 없다.
 * index.html, API 응답, 업로드 미디어는 절대 캐시하지 않는다. HTML을 캐시하면 배포한 새 버전이
 * 사용자에게 도달하지 않고, API를 캐시하면 로그아웃한 뒤에도 이전 계정의 응답이 남을 수 있다.
 * nginx도 같은 정책이다. index.html은 no-store, /assets/는 immutable.
 */

const CACHE = 'twn-assets-v1';

self.addEventListener('install', (event) => {
  // 새 워커가 이전 워커를 기다리지 않고 바로 활성화되도록 한다.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const isHashedAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

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
