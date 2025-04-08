import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
} from '@mui/material';
import { Send as SendIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import { setMessages, markMessagesAsRead } from '../../store/slices/chatSlice';
import { RootState } from '../../store/types';
import { ChatMessageDto, WebSocketResponse } from '../../types/chat';

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');

  const messages = useSelector((state: RootState) => 
    roomId ? state.chat.messages[roomId] || [] : []
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const loadMessages = async () => {
      try {
        const messages = await chatService.getMessages(roomId);
        dispatch(setMessages({ roomId, messages }));
        await chatService.markMessagesAsRead(roomId);
        dispatch(markMessagesAsRead(roomId));
      } catch (error) {
        console.error('메시지 로딩 중 오류 발생:', error);
      }
    };

    loadMessages();
    
    // 로그인 상태일 때만 웹소켓 연결
    if (currentUser) {
      websocketService.initialize();
      websocketService.subscribeToRoom(roomId, handleNewMessage);
    }

    return () => {
      websocketService.unsubscribeFromRoom(roomId);
    };
  }, [roomId, dispatch, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewMessage = (message: WebSocketResponse) => {
    if (message.chatRoomId === roomId) {
      dispatch(setMessages({ 
        roomId, 
        messages: [...messages, {
          ...message,
          updatedAt: message.updatedAt || message.createdAt
        }] 
      }));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !roomId) return;

    chatService.sendMessage(roomId, message);
    setMessage('');
  };

  const formatMessageTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={() => navigate('/chat')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">채팅방</Typography>
      </Box>
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.map((msg: ChatMessageDto) => (
          <ListItem
            key={msg.id}
            sx={{
              flexDirection: msg.senderId === currentUser?.id ? 'row-reverse' : 'row',
            }}
          >
            <ListItemAvatar>
              <Avatar>{msg.senderName[0]}</Avatar>
            </ListItemAvatar>
            <Box
              sx={{
                maxWidth: '70%',
                ml: msg.senderId === currentUser?.id ? 0 : 2,
                mr: msg.senderId === currentUser?.id ? 2 : 0,
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  bgcolor: msg.senderId === currentUser?.id ? 'primary.main' : 'grey.100',
                  color: msg.senderId === currentUser?.id ? 'white' : 'text.primary',
                }}
              >
                <Typography variant="body1">{msg.content}</Typography>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {formatMessageTime(msg.createdAt)}
                </Typography>
              </Paper>
            </Box>
          </ListItem>
        ))}
        <div ref={messagesEndRef} />
      </List>
      <Divider />
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          variant="outlined"
          size="small"
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!message.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default ChatRoom; 