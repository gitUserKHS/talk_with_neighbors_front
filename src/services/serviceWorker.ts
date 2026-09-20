import { store } from '../store';
import { addNotification } from '../store/slices/notificationSlice';
import { translate } from '../i18n/I18nProvider';

const notifyNewVersion = () => {
  store.dispatch(addNotification({
    type: 'info',
    message: translate('새 버전이 준비됐어요. 눌러서 새로고침해 주세요.', 'A new version is ready. Tap to reload.'),
    reloadOnClick: true,
  }));
};

/**
 * 서비스 워커 등록.
 *
 * 워커는 해시가 붙은 /assets/ 자산과 오프라인 안내 페이지만 캐시한다. index.html과 API는
 * 건드리지 않으므로 배포한 새 버전이 막히거나 로그아웃 후 이전 계정 응답이 남는 일은 없다.
 */
export const registerServiceWorker = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // 개발 서버에서는 등록하지 않는다. HMR과 캐시가 섞이면 디버깅이 어려워진다.
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    // 워커는 설치되자마자 제어권을 가져간다(skipWaiting + clients.claim). 그래서 페이지는 이전
    // 모듈을 돌리는데 워커만 새 버전인 순간이 생기고, 새로고침해야 둘이 맞춰진다고 알린다.
    // 첫 설치도 controllerchange를 일으키므로 이미 제어 중인 워커가 있을 때만 알린다.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', notifyNewVersion, { once: true });
    }

    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 등록에 실패해도 앱은 평소대로 동작한다.
    });
  });
};

/**
 * 등록을 해제하고 워커가 만든 캐시를 지운다.
 * 배포한 워커에 문제가 생겼을 때 사용자를 원래 상태로 되돌리는 탈출구다.
 */
export const unregisterServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
};
