import React, { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Stack, Switch, Typography } from '@mui/material';
import { useI18n } from '../../i18n/I18nProvider';
import pushService, { isPushSupported } from '../../services/pushService';

type Status = 'loading' | 'unavailable' | 'off' | 'on' | 'blocked';

/**
 * 브라우저 푸시 알림 켜고 끄기.
 *
 * 서버에 VAPID 키가 설정되어 있지 않으면 아무것도 보여주지 않는다.
 * 켤 수 없는 스위치를 두면 사용자는 고장이라고 여긴다.
 */
const PushToggle: React.FC = () => {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const [publicKey, setPublicKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const detect = async () => {
      if (!isPushSupported()) {
        if (active) setStatus('unavailable');
        return;
      }

      const config = await pushService.getConfig();
      if (!active) return;
      if (!config.enabled || !config.publicKey) {
        setStatus('unavailable');
        return;
      }
      setPublicKey(config.publicKey);

      if (Notification.permission === 'denied') {
        setStatus('blocked');
        return;
      }

      const subscription = await pushService.getExistingSubscription();
      if (active) setStatus(subscription ? 'on' : 'off');
    };

    detect();
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (next) {
        const granted = await pushService.subscribe(publicKey);
        if (!granted) {
          // 거부는 브라우저가 기억하므로 다시 물어볼 수 없다. 설정에서 풀라고 안내한다.
          setStatus(Notification.permission === 'denied' ? 'blocked' : 'off');
          return;
        }
        setStatus('on');
      } else {
        await pushService.unsubscribe();
        setStatus('off');
      }
    } catch {
      setError(t(
        '알림 설정을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        'Could not change the notification setting. Please try again shortly.',
      ));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading' || status === 'unavailable') {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">
            {t('브라우저 알림', 'Browser notifications')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t(
              '이웃톡을 닫아 두어도 새 메시지와 매칭 소식을 받아 봅니다.',
              'Get new messages and match updates even when Neighbor Talk is closed.',
            )}
          </Typography>
        </Box>
        <Switch
          checked={status === 'on'}
          disabled={busy || status === 'blocked'}
          onChange={(event) => toggle(event.target.checked)}
          inputProps={{ 'aria-label': t('브라우저 알림 사용', 'Enable browser notifications') }}
        />
      </Stack>

      {status === 'blocked' && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {t(
            '브라우저에서 이 사이트의 알림을 차단해 두었습니다. 주소창의 자물쇠 아이콘에서 알림 권한을 허용해 주세요.',
            'Notifications are blocked for this site. Allow them from the lock icon in the address bar.',
          )}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
      </CardContent>
    </Card>
  );
};

export default PushToggle;
