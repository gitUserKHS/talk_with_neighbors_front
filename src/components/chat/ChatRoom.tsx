import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Container, TextField, Button, Typography, Paper, Avatar, CircularProgress, IconButton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import { ChatMessageDto, ChatRoom as ChatRoomType, WebSocketResponse } from '../../types/chat';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/types';
import { fetchMessages, markMessagesAsReadInStore, addMessage, RoomMessagesState, ChatState, clearRoomMessages, setCurrentRoom, updateUnreadCount } from '../../store/slices/chatSlice';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { createSelector } from 'reselect';
import { store } from '../../store';

const CHAT_PAGE_SIZE = 50;

const selectRoomMessagesState = (
  state: RootState, 
  roomId: string | undefined
): RoomMessagesState | undefined => {
  const chatState = state.chat as ChatState;
  return roomId ? chatState.messages[roomId] : undefined;
}

const selectMemoizedMessages = createSelector(
  [selectRoomMessagesState],
  (roomState: RoomMessagesState | undefined): ChatMessageDto[] => roomState?.data || []
);

const selectMemoizedRoomPaginationState = createSelector(
  [selectRoomMessagesState],
  (roomState: RoomMessagesState | undefined) => ({
    currentPage: roomState?.currentPage ?? 0,
    hasMore: roomState?.hasMore ?? true,
    loading: roomState?.loading ?? false,
    initialLoading: roomState?.initialLoading ?? true,
    error: roomState?.error ?? null,
  })
);

const selectChatUnreadCount = (state: RootState) => state.chat.unreadCount;
const selectCurrentRoomId = (_state: RootState, roomId: string | undefined) => roomId;

const selectMemoizedUnreadCountByRoomId = createSelector(
  [selectChatUnreadCount, selectCurrentRoomId],
  (unreadCount, roomId) => (roomId ? unreadCount[roomId] || 0 : 0)
);

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const messages = useSelector((state: RootState) => 
    selectMemoizedMessages(state, roomId)
  );
  const { 
    hasMore: hasMoreMessages,
    loading: loadingMessages,
    error: messagesError 
  } = useSelector((state: RootState) => selectMemoizedRoomPaginationState(state, roomId));

  const currentChatRoomInfoFromStore = useSelector((state: RootState) => (state.chat as ChatState).currentRoom);

  useEffect(() => {
    console.log('[ChatRoom.tsx] Messages from store:', messages);
    console.log('[ChatRoom.tsx] Room ID:', roomId);
    const roomState = roomId ? (store.getState().chat as ChatState).messages[roomId] : undefined;
    console.log('[ChatRoom.tsx] Current room messages state:', roomState);
    console.log('[ChatRoom.tsx] Current chat room info from store:', currentChatRoomInfoFromStore);
  }, [messages, roomId, currentChatRoomInfoFromStore]);

  const unreadCount = useSelector((state: RootState) => 
    selectMemoizedUnreadCountByRoomId(state, roomId)
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [newMessage, setNewMessage] = useState('');
  const [componentError, setComponentError] = useState<string | null>(null);
  const [roomInfoLoaded, setRoomInfoLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const previousRoomIdRef = useRef<string | undefined>(undefined);
  const hasScrolledInitiallyRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadPreviousMessages = useCallback(() => {
    if (roomId && hasMoreMessages && !loadingMessages) {
      const currentMessagesState = (store.getState().chat as ChatState).messages[roomId];
      const nextPageToLoad = currentMessagesState ? currentMessagesState.currentPage + 1 : 0;
      console.log(`[ChatRoom.tsx] Loading previous messages for room ${roomId}, page: ${nextPageToLoad}`);
      dispatch(fetchMessages({ roomId, page: nextPageToLoad, size: CHAT_PAGE_SIZE }));
    }
  }, [roomId, hasMoreMessages, loadingMessages, dispatch]);

  useEffect(() => {
    const listElement = messageListRef.current;
    const handleScroll = () => {
      if (listElement && listElement.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
        loadPreviousMessages();
      }
    };
    listElement?.addEventListener('scroll', handleScroll);
    return () => listElement?.removeEventListener('scroll', handleScroll);
  }, [loadPreviousMessages, hasMoreMessages, loadingMessages]);

  useEffect(() => {
    if (!roomId || !currentUser) {
        navigate('/chat');
        return;
    }

    if (previousRoomIdRef.current && previousRoomIdRef.current !== roomId) {
      dispatch(clearRoomMessages(previousRoomIdRef.current));
      setRoomInfoLoaded(false);
      hasScrolledInitiallyRef.current = false;
    } else if (!previousRoomIdRef.current && roomId) {
      hasScrolledInitiallyRef.current = false;
    }
    previousRoomIdRef.current = roomId;

    dispatch(updateUnreadCount({ roomId, count: 0 }));

    if (!currentChatRoomInfoFromStore || currentChatRoomInfoFromStore.id !== roomId) {
      setRoomInfoLoaded(false);
      chatService.getRoom(roomId)
        .then(roomInfo => {
          dispatch(setCurrentRoom(roomInfo)); 
          setRoomInfoLoaded(true);
        })
        .catch(err => {
          console.error('채팅방 정보 로드 실패 (useEffect main):', err);
          setComponentError(err.message || '채팅방 정보를 불러오는데 실패했습니다.');
          setRoomInfoLoaded(true);
        });
    } else {
      setRoomInfoLoaded(true);
    }
    
    console.log('[ChatRoom.tsx] Current WebSocket state check:');
    websocketService.debugCurrentState();
    
    websocketService.subscribeToRoom(roomId, (message: WebSocketResponse) => {
      console.log('[ChatRoom.tsx] Received message via explicit callback:', message);
    });

    const intervalId = setInterval(() => {
      console.log('[ChatRoom.tsx] Periodic WebSocket state check:');
      websocketService.debugCurrentState();
    }, 10000);

    return () => {
      if (roomId) {
        websocketService.unsubscribeFromRoom(roomId);
        console.log('[ChatRoom.tsx] Leaving room, unsubscribing from WebSocket');
      }
      clearInterval(intervalId);
    };
  }, [roomId, currentUser, dispatch, navigate, currentChatRoomInfoFromStore]);

  useEffect(() => {
    if (roomId && currentChatRoomInfoFromStore && currentChatRoomInfoFromStore.id === roomId) {
      const roomMessagesState = (store.getState().chat as ChatState).messages[roomId];
      if (roomMessagesState && roomMessagesState.initialLoading && !roomMessagesState.loading) {
        console.log(`[ChatRoom.tsx] Fetching initial messages for room ${roomId} (due to initialLoading)`);
        dispatch(fetchMessages({ roomId, page: 0, size: CHAT_PAGE_SIZE }))
            .unwrap()
            .catch(err => setComponentError(err.message || '메시지를 불러오는데 실패했습니다.'));
      }
    }
  }, [roomId, currentChatRoomInfoFromStore, dispatch]);

  useEffect(() => {
    const markRoomMessagesAsRead = async () => {
      if (roomId && currentChatRoomInfoFromStore && currentChatRoomInfoFromStore.id === roomId && unreadCount > 0 && currentUser) {
        try {
          if (websocketService.getIsConnected()) {
            console.log(`[ChatRoom.tsx] Marking messages as read via WebSocket for room ${roomId}`);
            websocketService.markAllMessagesAsRead(roomId);
            dispatch(markMessagesAsReadInStore(roomId));
          } else {
            console.log(`[ChatRoom.tsx] WebSocket not connected, using HTTP API for marking messages as read`);
            await chatService.markMessagesAsRead(roomId);
            dispatch(markMessagesAsReadInStore(roomId));
          }
        } catch (error) {
          console.error(`[ChatRoom.tsx] Failed to mark messages as read for room ${roomId}:`, error);
        }
      }
    };

    if (document.hasFocus()) {
        markRoomMessagesAsRead();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markRoomMessagesAsRead();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomId, currentChatRoomInfoFromStore, unreadCount, dispatch, currentUser]);

  useEffect(() => {
    if (messages.length > 0) {
        const listEl = messageListRef.current;
        if (listEl) {
            const scrollThreshold = 300;
            const isNearBottom = listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop <= scrollThreshold;
            const lastMessage = messages[messages.length -1];
            const isOwnMessage = lastMessage && String(lastMessage.senderId) === String(currentUser?.id);

            const logPayload = {
              roomId,
              currentUserId: currentUser?.id,
              lastMessageSenderId: lastMessage?.senderId,
              scrollHeight: listEl.scrollHeight,
              clientHeight: listEl.clientHeight,
              scrollTop: listEl.scrollTop,
              calculatedScrollDiff: listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop,
              scrollThreshold,
              isNearBottom,
              isOwnMessage,
              hasScrolledInitiallyBeforeCheck: hasScrolledInitiallyRef.current,
              shouldScroll: false,
              reason: "No condition met"
            };

            let performScroll = false;

            if (!hasScrolledInitiallyRef.current && listEl.scrollTop < 10 && listEl.scrollHeight > listEl.clientHeight) {
                performScroll = true;
                logPayload.reason = "Initial scroll: at top with scrollable content.";
                hasScrolledInitiallyRef.current = true; 
            } else if (isNearBottom) {
                performScroll = true;
                logPayload.reason = "Standard scroll: near bottom.";
            } else if (isOwnMessage) {
                performScroll = true;
                logPayload.reason = "Standard scroll: own message.";
            }
            
            logPayload.shouldScroll = performScroll;
            console.log('[ChatRoom.tsx AutoScrollDebug]', logPayload);

            if (performScroll) {
                scrollToBottom();
            }
        }
    }
  }, [messages, currentUser?.id, roomId]);

  useEffect(() => {
    if (roomId && roomInfoLoaded && !currentChatRoomInfoFromStore && previousRoomIdRef.current === roomId) {
      console.log('[ChatRoom.tsx] Current room was deleted, navigating to chat list');
      navigate('/chat');
    }
  }, [currentChatRoomInfoFromStore, roomId, navigate, roomInfoLoaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && websocketService.getIsConnected()) {
        console.log('[ChatRoom.tsx] Page unloading, notifying server of room exit');
        websocketService.leaveRoom(roomId);
      }
    };

    const handlePopState = () => {
      if (roomId && websocketService.getIsConnected()) {
        console.log('[ChatRoom.tsx] Browser back navigation, notifying server of room exit');
        websocketService.leaveRoom(roomId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (roomId) {
        console.log('[ChatRoom.tsx] Component unmounting, clearing currentRoom immediately');
        dispatch(setCurrentRoom(null));
        
        if (websocketService.getIsConnected()) {
          websocketService.leaveRoom(roomId);
        }
      }
    };
  }, [roomId, dispatch]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatRoom.tsx] handleSendMessage called');
    if (newMessage.trim() && roomId && currentUser && currentChatRoomInfoFromStore) {
      setComponentError(null);
      
      const messageContent = newMessage.trim();
      console.log('[ChatRoom.tsx] Attempting to send message:', messageContent);

      const tempMessageId = `temp-${Date.now()}-${currentUser.id}`;
      
      const messageToSend: ChatMessageDto = {
        id: tempMessageId, 
        chatRoomId: roomId,
        content: messageContent,
        senderId: currentUser.id,
        senderName: currentUser.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRead: true, 
        type: 'TEXT',
        readByUsers: [currentUser.id],
      };

      setNewMessage('');

      try {
        console.log('[ChatRoom.tsx] Using HTTP API only for testing');
        
        dispatch(addMessage({ message: messageToSend, currentUserId: currentUser.id }));
        
        await chatService.sendMessage(messageToSend);
        console.log('[ChatRoom.tsx] HTTP API message send successful');
        
      } catch (err: any) {
        console.error("[ChatRoom.tsx] Error sending message:", err);
        
        setComponentError(err.message || "메시지 전송에 실패했습니다. 다시 시도해주세요.");
        setNewMessage(messageContent);
      }
    } else {
      console.warn('[ChatRoom.tsx] Conditions not met for sending message:', {
        newMessage: newMessage.trim(),
        roomId,
        currentUser: !!currentUser,
        currentChatRoomInfoFromStore: !!currentChatRoomInfoFromStore
      });
    }
  };

  const formatMessageTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  const displayError = componentError || messagesError;
  const roomState = roomId ? (store.getState().chat as ChatState).messages[roomId] : undefined;
  const actualInitialLoading = roomState ? roomState.initialLoading : true;

  if (!currentChatRoomInfoFromStore && !componentError && !messagesError && actualInitialLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  const chatRoomName = currentChatRoomInfoFromStore?.roomName || (roomId ? `채팅방 ${roomId}` : '채팅방');

  return (
    <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', padding: 0 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '8px 16px', 
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white'
        }}
      >
        <IconButton onClick={() => navigate('/chat')} sx={{ marginRight: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentChatRoomInfoFromStore?.roomName || '채팅방'}
        </Typography>
      </Paper>

      {componentError && (
        <Box sx={{ padding: 2, backgroundColor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{componentError}</Typography>
        </Box>
      )}

      {messagesError && (
        <Box sx={{ padding: 2, backgroundColor: 'error.light', color: 'error.contrastText' }}>
          <Typography>메시지 로딩 중 오류: {messagesError}</Typography>
        </Box>
      )}
      
      <Box 
        ref={messageListRef}
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          padding: '16px', 
          backgroundColor: '#f9f9f9',
          display: 'flex',
          flexDirection: 'column' 
        }}
      >
        {loadingMessages && messages.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        
        {messages.map((msg, index) => (
          <Box 
            key={msg.id || `msg-${index}`} 
            sx={{ 
              display: 'flex', 
              justifyContent: String(msg.senderId) === String(currentUser?.id) ? 'flex-end' : 'flex-start',
              marginBottom: 1 
            }}
          >
            <Paper 
              elevation={1} 
              sx={{ 
                padding: '8px 12px', 
                backgroundColor: String(msg.senderId) === String(currentUser?.id) ? '#1976d2' : '#FFFFFF',
                borderRadius: '10px',
                maxWidth: '70%',
                wordBreak: 'break-word'
              }}
            >
              <Typography variant="caption" display="block" sx={{ marginBottom: 0.5, color: String(msg.senderId) === String(currentUser?.id) ? '#FFFFFF' : '#555' }}>
                {msg.senderName || '알 수 없는 사용자'}
              </Typography>
              <Typography variant="body1" sx={{ color: String(msg.senderId) === String(currentUser?.id) ? '#FFFFFF' : 'inherit' }}>{msg.content}</Typography>
              <Typography variant="caption" display="block" sx={{ marginTop: 0.5, color: String(msg.senderId) === String(currentUser?.id) ? '#E0E0E0' : '#777', textAlign: 'right' }}>
                {formatMessageTime(msg.createdAt)}
                {String(msg.senderId) === String(currentUser?.id) && msg.isRead && (
                  <span style={{ marginLeft: '4px', color: 'green' }}>✓</span>
                )}
              </Typography>
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      
      <Paper elevation={2} sx={{ padding: '8px 16px', backgroundColor: 'white' }}>
        <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="메시지를 입력하세요..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            autoComplete="off"
            sx={{ marginRight: 1 }}
          />
          <Button type="submit" variant="contained" color="primary" disabled={!newMessage.trim()}>
            전송
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatRoom; 