import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, ListItemButton, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import mockSocket from '../services/mock/socket';
import { ChatRoom } from '../store/types';

const ChatRoomList: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    mockSocket.connect();

    const handleRoomUpdate = (room: ChatRoom) => {
      setRooms(prev => {
        const exists = prev.some(r => r.id === room.id);
        if (exists) {
          return prev.map(r => r.id === room.id ? room : r);
        }
        return [...prev, room];
      });
    };

    const handleError = (error: Error) => {
      console.error('Socket error:', error.message);
    };

    const handleStatus = (status: string) => {
      console.log('Socket status:', status);
    };

    const unsubRoom = mockSocket.onRoomUpdate(handleRoomUpdate);
    const unsubError = mockSocket.onError(handleError);
    const unsubStatus = mockSocket.onStatus(handleStatus);

    return () => {
      unsubRoom();
      unsubError();
      unsubStatus();
      mockSocket.disconnect();
    };
  }, []);

  const handleRoomClick = (roomId: string) => {
    navigate(`/chat/${roomId}`);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          채팅방 목록
        </Typography>

        <List>
          {rooms.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="아직 채팅방이 없습니다."
                secondary="새로운 대화를 시작해보세요."
                sx={{ textAlign: 'center' }}
              />
            </ListItem>
          ) : (
            rooms.map((room, index) => (
              <React.Fragment key={room.id}>
                {index > 0 && <Divider />}
                <ListItemButton onClick={() => handleRoomClick(room.id)}>
                  <ListItemText
                    primary={`채팅방 ${room.id}`}
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" component="span" sx={{ flex: 1 }}>
                          {room.lastMessage || '새로운 대화를 시작하세요'}
                        </Typography>
                        {room.lastMessageTime && (
                          <Typography variant="caption" sx={{ ml: 2 }}>
                            {formatTime(room.lastMessageTime)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default ChatRoomList; 