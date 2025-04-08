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
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon, ExitToApp as LeaveIcon } from '@mui/icons-material';
import { chatService } from '../../services/chatService';
import { setRooms } from '../../store/slices/chatSlice';
import { RootState } from '../../store/types';
import { ChatRoom } from '../../types/chat';
import { SelectChangeEvent } from '@mui/material/Select';

const ChatRoomList: React.FC = () => {
  console.log('ChatRoomList 컴포넌트 렌더링 시작');
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const unreadCount = useSelector((state: RootState) => state.chat.unreadCount);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roomType, setRoomType] = useState<string>('');
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setFilteredRooms(fetchedRooms);
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

  const searchRooms = async () => {
    try {
      setIsLoading(true);
      const results = await chatService.searchRooms(searchKeyword, roomType);
      setFilteredRooms(results);
    } catch (error) {
      console.error('채팅방 검색 중 오류 발생:', error);
      setError('채팅방 검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchKeyword.trim() || roomType) {
      searchRooms();
    } else {
      setFilteredRooms(rooms);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    if (!e.target.value.trim() && !roomType) {
      setFilteredRooms(rooms);
    }
  };

  const handleRoomTypeChange = (e: SelectChangeEvent) => {
    setRoomType(e.target.value as string);
  };

  const handleRoomClick = useCallback((room: ChatRoom) => {
    navigate(`/chat/${room.id}`);
  }, [navigate]);

  const handleCreateRoom = useCallback(() => {
    navigate('/chat/create');
  }, [navigate]);

  const handleLeaveRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.leaveRoom(roomId);
      setSuccessMessage('채팅방에서 나갔습니다.');
      fetchRooms();
    } catch (error) {
      console.error('채팅방 나가기 실패:', error);
      setError('채팅방에서 나가는데 실패했습니다.');
    }
  };

  const handleOpenDeleteDialog = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomId(roomId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoomId) return;
    
    try {
      const success = await chatService.deleteRoom(selectedRoomId);
      if (success) {
        setSuccessMessage('채팅방이 삭제되었습니다.');
        fetchRooms();
      } else {
        setError('채팅방 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      setError('채팅방 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedRoomId(null);
    }
  };

  // 채팅방 타입 디버깅 로그
  useEffect(() => {
    if (filteredRooms.length > 0) {
      console.log('첫번째 채팅방 데이터 구조:', JSON.stringify(filteredRooms[0], null, 2));
    }
  }, [filteredRooms]);

  // 사용자가 채팅방의 방장인지 확인
  const isRoomCreator = (room: ChatRoom) => {
    if (!currentUser || !room.creatorId) return false;
    return room.creatorId === currentUser.id.toString();
  };

  // 사용자가 채팅방에 가입되어 있는지 확인
  const isUserMember = (room: ChatRoom) => {
    if (!currentUser) return false;
    // 방장은 항상 멤버로 간주
    if (isRoomCreator(room)) return true;
    
    if (!room.participants || !Array.isArray(room.participants)) return false;
    
    return room.participants.includes(currentUser.id.toString());
  };

  // 채팅방 가입하기
  const handleJoinRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.joinRoom(roomId);
      setSuccessMessage('채팅방에 가입했습니다.');
      fetchRooms();
    } catch (error) {
      console.error('채팅방 가입 실패:', error);
      setError('채팅방 가입에 실패했습니다.');
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

  const formatLastMessageTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    console.log('ChatRoomList 로딩 중 UI 반환');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    console.log('ChatRoomList 에러 UI 반환:', error);
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  console.log('ChatRoomList 정상 UI 렌더링, 채팅방 수:', filteredRooms.length);
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">채팅방</Typography>
        <IconButton onClick={handleCreateRoom} color="primary">
          <AddIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="채팅방 검색"
            value={searchKeyword}
            onChange={handleSearchInputChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>방 유형</InputLabel>
            <Select
              value={roomType}
              label="방 유형"
              onChange={handleRoomTypeChange}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="ONE_ON_ONE">1:1 채팅</MenuItem>
              <MenuItem value="GROUP">그룹 채팅</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredRooms.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">채팅방이 없습니다.</Typography>
          </Box>
        ) : (
          filteredRooms.map((room) => (
            <ListItem
              key={room.id}
              component="div"
              onClick={() => handleRoomClick(room)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                borderBottom: '1px solid #eee',
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {isRoomCreator(room) ? (
                    <>
                      <IconButton 
                        color="primary" 
                        onClick={(e) => handleLeaveRoom(room.id, e)}
                        sx={{ mr: 1 }}
                      >
                        <LeaveIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={(e) => handleOpenDeleteDialog(room.id, e)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  ) : isUserMember(room) ? (
                    <IconButton 
                      color="primary" 
                      onClick={(e) => handleLeaveRoom(room.id, e)}
                    >
                      <LeaveIcon />
                    </IconButton>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => handleJoinRoom(room.id, e)}
                    >
                      가입하기
                    </Button>
                  )}
                </Box>
              }
            >
              <ListItemAvatar>
                <Badge
                  color="primary"
                  badgeContent={unreadCount[room.id] || 0}
                  invisible={!unreadCount[room.id]}
                >
                  <Avatar>{room.roomName[0]}</Avatar>
                </Badge>
              </ListItemAvatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1">
                  {room.roomName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '70%'
                    }}
                  >
                    {room.lastMessage || '새로운 채팅방입니다.'}
                  </Typography>
                  {room.lastMessageTime && (
                    <Typography variant="caption" color="text.secondary">
                      {formatLastMessageTime(room.lastMessageTime)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </ListItem>
          ))
        )}
      </List>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>채팅방 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteRoom} color="error">삭제</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ChatRoomList; 