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

const labels: Record<string, string> = {
  NEW_MESSAGE: '새 메시지', MATCH_REQUEST: '매칭 요청', MATCH_ACCEPTED: '매칭 수락',
  MATCH_REJECTED: '매칭 알림', SYSTEM_NOTICE: '서비스 알림', ROOM_DELETED: '채팅방 알림',
};

const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setItems((await notificationService.getNotifications()).content);
    } catch {
      setError('알림을 불러오지 못했어. 잠시 후 다시 시도해 줘.');
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
            <Typography variant="h5" fontWeight={800}>알림함</Typography>
            <Typography variant="body2" color="text.secondary">최근 30일의 소식을 다시 확인할 수 있어.</Typography>
          </Box>
          {items.some((item) => !item.readAt) && (
            <Button startIcon={<DoneAllIcon />} onClick={markAll}>모두 읽음</Button>
          )}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
          : items.length === 0 ? (
            <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 7 }}>
              <NotificationsNoneIcon color="disabled" sx={{ fontSize: 48 }} />
              <Typography color="text.secondary" sx={{ mt: 1 }}>아직 도착한 알림이 없어.</Typography>
            </CardContent></Card>
          ) : items.map((item) => (
            <Card key={item.id} variant="outlined" onClick={() => openItem(item)}
              sx={{ cursor: item.actionUrl ? 'pointer' : 'default', bgcolor: item.readAt ? 'background.paper' : 'rgba(232,92,74,.06)' }}>
              <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={labels[item.type] || '알림'} color={item.readAt ? 'default' : 'primary'} />
                    <Typography variant="caption" color="text.secondary">{formatDate(item.createdAt)}</Typography>
                  </Stack>
                  <Typography sx={{ mt: 1, fontWeight: item.readAt ? 500 : 750 }}>{item.message || '새로운 소식이 도착했어.'}</Typography>
                </Box>
                <IconButton aria-label="알림 삭제" onClick={(event) => remove(event, item.id)}><DeleteOutlineIcon /></IconButton>
              </CardContent>
            </Card>
          ))}
      </Stack>
    </Container>
  );
};

export default Notifications;
