export type BannerState = 'hidden' | 'reconnecting' | 'offline';

export interface BannerInput {
  /** 소켓이 지금 연결되어 있는지 (스토어의 connectionStatus.isOnline). */
  isOnline: boolean;
  /** 한 번 연결된 뒤 끊긴 적이 있는지. 첫 연결을 기다리는 동안은 끊긴 것이 아니다. */
  wasOffline: boolean;
  /** navigator.onLine. 기기 자체가 오프라인이면 소켓 상태와 무관하게 알려야 한다. */
  navigatorOnline: boolean;
  /** 로그인하지 않은 사용자는 소켓을 열지 않으므로 재연결 안내가 의미 없다. */
  authenticated: boolean;
}

/**
 * 연결 배너를 어떤 문구로 보여줄지 정한다.
 * 기기 오프라인이 소켓 끊김보다 우선한다. 오프라인이면 재연결도 될 수 없기 때문이다.
 */
export const bannerState = ({
  isOnline,
  wasOffline,
  navigatorOnline,
  authenticated,
}: BannerInput): BannerState => {
  if (!navigatorOnline) return 'offline';
  if (!authenticated) return 'hidden';
  if (isOnline || !wasOffline) return 'hidden';
  return 'reconnecting';
};
