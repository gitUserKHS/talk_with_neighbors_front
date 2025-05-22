import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, TextField, Button, Typography, Paper, Avatar, CircularProgress, IconButton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import { ChatMessageDto, ChatRoom as ChatRoomType, WebSocketResponse } from '../../types/chat';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/types';
import { setMessages as setStoreMessages, markMessagesAsRead as markMessagesAsReadAction } from '../../store/slices/chatSlice';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { createSelector } from 'reselect';

// Memoized selectors
const selectChatMessages = (state: RootState) => state.chat.messages;
const selectCurrentRoomId = (_state: RootState, roomId: string | undefined) => roomId;

const selectMemoizedMessagesByRoomId = createSelector(
  [selectChatMessages, selectCurrentRoomId],
  (messages, roomId) => (roomId ? messages[roomId] || [] : [])
);

const selectChatUnreadCount = (state: RootState) => state.chat.unreadCount;

const selectMemoizedUnreadCountByRoomId = createSelector(
  [selectChatUnreadCount, selectCurrentRoomId],
  (unreadCount, roomId) => (roomId ? unreadCount[roomId] || 0 : 0)
);

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  const messagesFromStore = useSelector((state: RootState) => 
    selectMemoizedMessagesByRoomId(state, roomId)
  );
  const unreadCount = useSelector((state: RootState) => 
    selectMemoizedUnreadCountByRoomId(state, roomId)
  );
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatRoomInfo, setChatRoomInfo] = useState<ChatRoomType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!roomId || !currentUser) return;

    websocketService.initialize(); 

    const messageHandlerForLogging = (response: WebSocketResponse) => {
      console.log('[ChatRoom.tsx] Message received via specific room subscription (logging only):', response);
    };

    websocketService.subscribeToRoom(roomId, messageHandlerForLogging); 

    const fetchDataAndMaybeJoinRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [fetchedMessages, roomInfo] = await Promise.all([
          chatService.getMessages(roomId),
          chatService.getRoom(roomId)
        ]);
        
        dispatch(setStoreMessages({ roomId, messages: fetchedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }));
        setChatRoomInfo(roomInfo);

      } catch (err: any) {
        console.error('데이터 로드 실패:', err);
        setError(err.message || '채팅방 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataAndMaybeJoinRoom();

    return () => {
      if (roomId) {
        websocketService.unsubscribeFromRoom(roomId); 
      }
    };
  }, [roomId, currentUser, dispatch]);

  useEffect(() => {
    const markRoomMessagesAsRead = async () => {
      if (roomId && chatRoomInfo && unreadCount > 0) {
        console.log(`[ChatRoom.tsx] Attempting to mark messages as read for room: ${roomId}, unread: ${unreadCount}`);
        try {
          await chatService.markMessagesAsRead(roomId); 
          console.log(`[ChatRoom.tsx] API call successful: Marked messages as read for room: ${roomId}`);
          
          dispatch(markMessagesAsReadAction(roomId)); 
          console.log(`[ChatRoom.tsx] Redux action dispatched: Marked messages as read in store for room: ${roomId}`);

        } catch (error) {
          console.error(`[ChatRoom.tsx] Failed to mark messages as read for room ${roomId}:`, error);
        }
      } else if (roomId && chatRoomInfo && unreadCount === 0) {
        console.log(`[ChatRoom.tsx] No unread messages to mark as read for room: ${roomId}`);
      }
    };

    if (chatRoomInfo) {
      markRoomMessagesAsRead();
    }
  }, [roomId, chatRoomInfo, unreadCount, dispatch]);

  useEffect(() => {
    console.log('[ChatRoom.tsx] messagesFromStore updated:', messagesFromStore);
    scrollToBottom();
  }, [messagesFromStore]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && roomId && currentUser && chatRoomInfo) {
      setError(null);
      const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const messageToSend: ChatMessageDto = {
        id: tempId,
        chatRoomId: roomId,
        content: newMessage.trim(),
        senderId: currentUser.id,
        senderName: currentUser.username,
        createdAt: new Date().toISOString(),
        isRead: true,
        type: 'TEXT',
      };
      try {
        await chatService.sendMessage(messageToSend);
        setNewMessage('');
      } catch (err: any) {
        console.error("메시지 전송 실패:", err);
        setError(err.message || "메시지 전송에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  const formatMessageTime = (timeString: string) => {
    if (!timeString) return '시간 정보 없음';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '잘못된 날짜';
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '날짜 오류'; }
  };

  if (isLoading && !messagesFromStore.length) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md" sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', pt: 2, pb: 1 }}>
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/chat')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">{chatRoomInfo?.roomName || (roomId ? `채팅방 ${roomId}` : '채팅방')}</Typography>
          {isLoading && <CircularProgress size={20} sx={{ml: 2}} />}
          {error && !chatRoomInfo && <Typography color="error" sx={{ml: 2}}> ({error})</Typography>}
        </Box>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {(!isLoading && !chatRoomInfo && !error) && (
            <Typography>채팅방 정보를 불러오는 중이거나, 찾을 수 없습니다.</Typography>
          )}
          {messagesFromStore.map((message: ChatMessageDto) => {
            const isCurrentUserMessage = message.senderId.toString() === currentUser?.id.toString();
            const senderDisplayName = message.senderName || '익명';
            const senderAvatar = message.senderName ? message.senderName[0] : 'U';

            return (
              <Box
                key={message.id} 
                sx={{
                  display: 'flex',
                  justifyContent: isCurrentUserMessage ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, maxWidth: '70%' }}>
                  {!isCurrentUserMessage && (
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }} >
                      {senderAvatar}
                    </Avatar>
                  )}
                  <Paper
                    sx={{
                      p: 1.5,
                      backgroundColor: isCurrentUserMessage ? 'primary.main' : 'grey.200',
                      color: isCurrentUserMessage ? 'primary.contrastText' : 'text.primary',
                      borderRadius: isCurrentUserMessage 
                        ? '20px 20px 5px 20px' 
                        : '20px 20px 20px 5px',
                    }}
                  >
                    {!isCurrentUserMessage && (
                       <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                         {senderDisplayName}
                       </Typography>
                    )}
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{message.content}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
                      {formatMessageTime(message.createdAt)}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              variant="outlined"
              size="small"
              autoComplete="off"
              disabled={!chatRoomInfo || isLoading}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!newMessage.trim() || !chatRoomInfo || isLoading}
              sx={{ px: 3 }}
            >
              전송
            </Button>
          </Box>
           {error && chatRoomInfo && <Typography color="error" sx={{ mt: 1, fontSize: '0.9rem' }}>{error}</Typography>}
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatRoom; 