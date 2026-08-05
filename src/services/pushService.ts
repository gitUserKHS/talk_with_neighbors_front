import api from './api';

interface PushConfig {
  enabled: boolean;
  publicKey: string;
}

/**
 * VAPID 공개 키는 base64url 문자열로 오지만 PushManager는 Uint8Array를 요구한다.
 */
export const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = globalThis.atob(base64);
  // PushManager는 ArrayBuffer를 감싼 뷰만 받으므로 버퍼를 직접 만들어 넘긴다.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
};

/** 구독 키를 서버가 받는 base64 문자열로 바꾼다. */
const encodeKey = (subscription: PushSubscription, name: PushEncryptionKeyName): string => {
  const key = subscription.getKey(name);
  if (!key) return '';
  const bytes = new Uint8Array(key);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return globalThis.btoa(binary);
};

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window;

export const pushService = {
  async getConfig(): Promise<PushConfig> {
    try {
      const response = await api.get<PushConfig>('/push/public-key');
      return response.data;
    } catch {
      return { enabled: false, publicKey: '' };
    }
  },

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return registration.pushManager.getSubscription();
  },

  /**
   * 브라우저 권한을 요청하고 구독한 뒤 서버에 등록한다.
   * 권한이 거부되면 브라우저가 다시 묻지 않으므로 호출 시점은 사용자가 명시적으로 켤 때여야 한다.
   */
  async subscribe(publicKey: string): Promise<boolean> {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });

    await api.post('/push/subscriptions', {
      endpoint: subscription.endpoint,
      p256dh: encodeKey(subscription, 'p256dh'),
      auth: encodeKey(subscription, 'auth'),
    });
    return true;
  },

  async unsubscribe(): Promise<void> {
    const subscription = await this.getExistingSubscription();
    if (!subscription) return;

    // 서버 기록을 먼저 지운다. 브라우저 해제만 성공하면 서버가 죽은 구독으로 계속 발송한다.
    await api.delete('/push/subscriptions', { data: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
  },
};

export default pushService;
