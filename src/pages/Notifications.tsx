import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  IconButton, Stack, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import notificationService, { InboxNotification } from '../services/notificationService';
import { useI18n } from '../i18n/I18nProvider';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();
  const labels: Record<string, string> = {
    NEW_MESSAGE: t('새 메시지', 'New message'), MATCH_REQUEST: t('매칭 요청', 'Match request'),
    MATCH_ACCEPTED: t('매칭 수락', 'Match accepted'), MATCH_REJECTED: t('매칭 알림', 'Match update'),
    SYSTEM_NOTICE: t('서비스 알림', 'Service notice'), ROOM_DELETED: t('채팅방 알림', 'Chat update'),
  };
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setItems((await notificationService.getNotifications()).content);
    } catch {
      setError(t('알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not load your notifications. Please try again shortly.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openItem = async (item: InboxNotification) => {
    if (!item.readAt) await notificationService.markRead(item.id);
    setItems((prev) => prev.map((value) => value.id === item.id
      ? { ...value, readAt: value.readAt || new Date().toISOString() } : value));
    if (item.actionUrl) navigate(item.actionUrl);
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
  };

  const remove = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    await notificationService.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{t('알림', 'Notifications')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('최근 30일 동안 도착한 소식을 확인할 수 있습니다.', 'Review updates from the last 30 days.')}</Typography>
          </Box>
          {items.some((item) => !item.readAt) && (
            <Button startIcon={<DoneAllIcon />} onClick={markAll}>{t('모두 읽음', 'Mark all read')}</Button>
          )}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
          : items.length === 0 ? (
            <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 7 }}>
              <NotificationsNoneIcon color="disabled" sx={{ fontSize: 48 }} />
              <Typography color="text.secondary" sx={{ mt: 1 }}>{t('아직 도착한 알림이 없습니다.', 'You do not have any notifications yet.')}</Typography>
            </CardContent></Card>
          ) : items.map((item) => (
            <Card key={item.id} variant="outlined" onClick={() => openItem(item)}
              sx={{ cursor: item.actionUrl ? 'pointer' : 'default', bgcolor: item.readAt ? 'background.paper' : 'rgba(232,92,74,.06)' }}>
              <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={labels[item.type] || t('알림', 'Notification')} color={item.readAt ? 'default' : 'primary'} />
                    <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Typography>
                  </Stack>
                  <Typography sx={{ mt: 1, fontWeight: item.readAt ? 500 : 750 }}>{item.message || t('새로운 소식이 도착했습니다.', 'You have a new update.')}</Typography>
                </Box>
                <IconButton aria-label={t('알림 삭제', 'Delete notification')} onClick={(event) => remove(event, item.id)}><DeleteOutlineIcon /></IconButton>
              </CardContent>
            </Card>
          ))}
      </Stack>
    </Container>
  );
};

export default Notifications;
