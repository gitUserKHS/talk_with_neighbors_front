import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import { ChatMessageDto, ChatRoom as ChatRoomType, WebSocketResponse } from '../../types/chat';
import { RootState } from '../../store/types';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const toChatMessage = (message: WebSocketResponse): ChatMessageDto => ({
  id: message.id,
  chatRoomId: message.roomId,
  content: message.content,
  senderId: message.senderId,
  senderName: message.senderName,
  isRead: message.isRead,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  type: message.type,
  isDeleted: message.isDeleted,
  readByUsers: message.readByUsers,
});

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [room, setRoom] = useState<ChatRoomType | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      setLoading(true);
      setError(null);

      try {
        const [roomData, messagePage] = await Promise.all([
          chatService.getRoom(roomId),
          chatService.getMessages(roomId, 0, 50),
        ]);
        setRoom(roomData);
        setMessages([...messagePage.content].reverse());
        chatService.markMessagesAsRead(roomId).catch(() => undefined);
      } catch {
        setError('채팅방을 불러오지 못했어.');
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !websocketService.getIsConnected()) return;

    websocketService.subscribeToRoom(roomId, (message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, toChatMessage(message)];
      });
    });

    return () => websocketService.unsubscribeFromRoom(roomId);
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomId || !currentUser || !newMessage.trim()) return;

    const content = newMessage.trim();
    const optimisticMessage: ChatMessageDto = {
      id: `temp-${Date.now()}`,
      chatRoomId: roomId,
      content,
      senderId: currentUser.id,
      senderName: currentUser.username,
      isRead: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'TEXT',
      readByUsers: [currentUser.id],
    };

    setNewMessage('');
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await chatService.sendMessage(optimisticMessage);
    } catch {
      setError('메시지 전송에 실패했어.');
      setMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
      setNewMessage(content);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 0, height: 'calc(100vh - 64px)' }}>
      <Paper
        variant="outlined"
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          borderRadius: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <IconButton onClick={() => navigate('/chat')}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar>{room?.roomName?.[0] || '채'}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
              {room?.roomName || '채팅방'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {room?.participantCount || 0}명 참여 중
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflowY: 'auto', p: 2, bgcolor: 'grey.50' }}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={1.5}>
            {messages.map((message) => {
              const isMine = String(message.senderId) === String(currentUser?.id);
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '72%',
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: isMine ? 'primary.main' : 'background.paper',
                      color: isMine ? 'primary.contrastText' : 'text.primary',
                      border: isMine ? 0 : 1,
                      borderColor: 'divider',
                    }}
                  >
                    {!isMine && (
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {message.senderName}
                      </Typography>
                    )}
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.75, textAlign: 'right' }}>
                      {formatTime(message.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={endRef} />
          </Stack>
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1}>
            <TextField
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="메시지를 입력해줘"
              size="small"
              fullWidth
            />
            <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={!newMessage.trim()}>
              전송
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatRoom;
