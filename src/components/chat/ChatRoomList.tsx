import React, { useEffect, useState, useCallback } from 'react';
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
  console.log('ChatRoomList 컴포넌트 렌더링 시작');
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const unreadCount = useSelector((state: RootState) => state.chat.unreadCount);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('ChatRoomList 현재 상태:', { isLoading, error, roomsCount: rooms.length });

  const fetchRooms = async () => {
    console.log('fetchRooms 함수 호출됨');
    try {
      setIsLoading(true);
      setError(null);
      console.log('채팅방 목록 조회 시작 - chatService.getRooms() 호출 전');
      const fetchedRooms = await chatService.getRooms();
      console.log('채팅방 목록 조회 성공:', fetchedRooms);
      dispatch(setRooms(fetchedRooms));
    } catch (error) {
      console.error('채팅방 목록 조회 중 오류 발생:', error);
      const errorMessage = error instanceof Error ? error.message : '채팅방 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      if (errorMessage === '로그인이 필요합니다.') {
        navigate('/login');
      }
    } finally {
      console.log('fetchRooms 완료 - isLoading을 false로 설정');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('ChatRoomList useEffect 실행');
    if (!isAuthenticated) {
      setError('로그인이 필요합니다.');
      setIsLoading(false);
      navigate('/login');
      return;
    }
    fetchRooms();
    return () => {
      console.log('ChatRoomList 컴포넌트 언마운트');
    };
  }, [navigate, isAuthenticated]);

  const handleRoomClick = useCallback((room: ChatRoom) => {
    navigate(`/chat/${room.id}`);
  }, [navigate]);

  const handleCreateRoom = useCallback(() => {
    navigate('/chat/create');
  }, [navigate]);

  const formatLastMessageTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    console.log('ChatRoomList 로딩 중 UI 반환');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    console.log('ChatRoomList 에러 UI 반환:', error);
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  console.log('ChatRoomList 정상 UI 렌더링, 채팅방 수:', rooms.length);
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