import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '@mui/material';
import { AppDispatch, RootState } from '../store/types';
import { incrementReconnectAttempts, setConnectionStatus } from '../store/slices/notificationSlice';
import { websocketService } from '../services/websocketService';
import { bannerState } from '../services/connectionState';
import { useI18n } from '../i18n/I18nProvider';

const readNavigatorOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/**
 * 소켓이 끊기거나 기기가 오프라인일 때 화면 위에 한 줄로 알린다.
 * 연결 상태는 스토어(connectionStatus)에 기록해 다른 화면도 같은 값을 읽을 수 있게 한다.
 */
const ConnectionBanner: React.FC = () => {
  const { t } = useI18n();
  const dispatch: AppDispatch = useDispatch();
  const { isOnline, wasOffline } = useSelector((state: RootState) => state.notifications.connectionStatus);
  const authenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [navigatorOnline, setNavigatorOnline] = useState(readNavigatorOnline);
  // 등록 직후와 첫 연결 전에도 콜백은 false를 준다. 한 번 연결된 뒤의 false만 끊김으로 본다.
  const everConnected = useRef(false);

  useEffect(() => {
    const unsubscribe = websocketService.registerConnectionStateChangeCallback((connected) => {
      if (connected) {
        everConnected.current = true;
        dispatch(setConnectionStatus({ isOnline: true, reconnectAttempts: 0 }));
        return;
      }
      if (!everConnected.current) return;
      // STOMP 클라이언트는 닫힐 때마다 재접속을 예약하므로 false 한 번이 시도 한 번이다.
      dispatch(setConnectionStatus({
        isOnline: false,
        wasOffline: true,
        lastDisconnectedAt: new Date().toISOString(),
      }));
      dispatch(incrementReconnectAttempts());
    });

    const handleOnline = () => setNavigatorOnline(true);
    const handleOffline = () => setNavigatorOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  useEffect(() => {
    if (authenticated) return;
    // 로그아웃으로 닫힌 소켓은 장애가 아니다. 다음 로그인은 깨끗한 상태에서 시작한다.
    everConnected.current = false;
    dispatch(setConnectionStatus({ isOnline: true, wasOffline: false, reconnectAttempts: 0 }));
  }, [authenticated, dispatch]);

  const state = bannerState({ isOnline, wasOffline, navigatorOnline, authenticated });
  if (state === 'hidden') {
    return null;
  }

  return (
    <Alert
      severity="warning"
      role="status"
      sx={{ borderRadius: 0, py: 0, justifyContent: 'center' }}
    >
      {state === 'offline'
        ? t('오프라인 상태예요.', 'You are offline.')
        : t('연결이 끊겼어요. 다시 연결하는 중…', 'Connection lost. Reconnecting…')}
    </Alert>
  );
};

export default ConnectionBanner;
