import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, TextField, Button, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';
import mockSocket from '../services/mock/socket';
import { Message } from '../store/types';

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    mockSocket.connect();
    mockSocket.joinRoom(roomId || '');

    const messageHandler = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const errorHandler = (error: Error) => {
      console.error('Socket error:', error.message);
    };

    const statusHandler = (status: string) => {
      console.log('Socket status:', status);
    };

    const unsubMessage = mockSocket.onMessage(messageHandler);
    const unsubError = mockSocket.onError(errorHandler);
    const unsubStatus = mockSocket.onStatus(statusHandler);

    return () => {
      unsubMessage();
      unsubError();
      unsubStatus();
      mockSocket.leaveRoom(roomId || '');
      mockSocket.disconnect();
    };
  }, [roomId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && roomId) {
      mockSocket.sendMessage(roomId, newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ height: '100vh', py: 2 }}>
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">채팅방 {roomId}</Typography>
        </Box>
        
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.senderId === '1' ? 'flex-end' : 'flex-start',
                mb: 1,
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  backgroundColor: message.senderId === '1' ? 'primary.light' : 'grey.100',
                  maxWidth: '70%',
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                variant="outlined"
                size="small"
              />
            </Box>
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={!newMessage.trim()}
              >
                전송
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatRoom; 