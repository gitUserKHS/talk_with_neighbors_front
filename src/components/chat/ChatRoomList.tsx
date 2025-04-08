import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  IconButton,
  Box,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { chatService } from '../../services/chatService';
import { setRooms } from '../../store/slices/chatSlice';
import { RootState } from '../../store/types';
import { ChatRoom } from '../../types/chat';

const ChatRoomList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const unreadCount = useSelector((state: RootState) => state.chat.unreadCount);

  useEffect(() => {
    loadChatRooms();
  }, []);

  const loadChatRooms = async () => {
    try {
      const rooms = await chatService.getRooms();
      dispatch(setRooms(rooms));
    } catch (error) {
      console.error('채팅방 목록 로딩 중 오류 발생:', error);
    }
  };

  const handleRoomClick = (room: ChatRoom) => {
    navigate(`/chat/${room.id}`);
  };

  const handleCreateRoom = () => {
    navigate('/chat/create');
  };

  const formatLastMessageTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">채팅방</Typography>
        <IconButton onClick={handleCreateRoom} color="primary">
          <AddIcon />
        </IconButton>
      </Box>
      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {rooms.map((room) => (
          <ListItem
            key={room.id}
            component="div"
            onClick={() => handleRoomClick(room)}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemAvatar>
              <Badge
                color="primary"
                badgeContent={unreadCount[room.id] || 0}
                invisible={!unreadCount[room.id]}
              >
                <Avatar>{room.name[0]}</Avatar>
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={room.name}
              secondary={
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {room.lastMessage || '새로운 채팅방입니다.'}
                </Typography>
              }
            />
            {room.lastMessageTime && (
              <Typography variant="caption" color="text.secondary">
                {formatLastMessageTime(room.lastMessageTime)}
              </Typography>
            )}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ChatRoomList; 