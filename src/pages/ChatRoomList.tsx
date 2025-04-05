import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Menu
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { ChatRoom } from '../store/types';
import debounce from 'lodash/debounce';

interface SearchUpdate {
  keyword?: string;
  category?: string;
  page?: number;
  sort?: string;
}

const ChatRoomList = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState({
    keyword: '',
    category: '',
    page: 0,
    size: 10,
    sort: 'createdAt,desc'
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const result = await chatService.searchRooms({
        keyword: search.keyword,
        category: search.category,
        page: search.page,
        size: search.size,
        sort: search.sort
      });
      console.log('Loaded rooms:', result); // 디버깅을 위한 로그
      setRooms(result.content || []);
      setTotalPages(result.totalPages || 0);
      setError(null);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('채팅방 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 조건이 변경될 때마다 호출될 디바운스된 함수
  const debouncedLoadRooms = useCallback(
    debounce(() => {
      loadRooms();
    }, 500),
    []
  );

  // 키워드 검색에 대한 별도의 디바운스 처리
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(prev => ({ ...prev, keyword: value, page: 0 }));
    },
    []
  );

  // 카테고리 변경 처리
  const handleCategoryChange = (value: string) => {
    setSearch(prev => ({ ...prev, category: value, page: 0 }));
  };

  // 정렬 변경 처리
  const handleSortChange = (value: string) => {
    setSearch(prev => ({ ...prev, sort: value, page: 0 }));
  };

  // 페이지 변경 처리
  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setSearch(prev => ({ ...prev, page: value - 1 }));
  };

  // 검색 조건이 변경될 때만 API 호출
  useEffect(() => {
    debouncedLoadRooms();
    // cleanup 함수로 디바운스 취소
    return () => {
      debouncedLoadRooms.cancel();
    };
  }, [search]);

  const handleJoin = async (roomId: number) => {
    try {
      await chatService.joinRoom(roomId);
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '채팅방 참여에 실패했습니다.');
      console.error('Failed to join room:', err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, room: ChatRoom) => {
    setAnchorEl(event.currentTarget);
    setSelectedRoom(room);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRoom(null);
  };

  const handleEdit = () => {
    if (selectedRoom) {
      navigate(`/chat/edit/${selectedRoom.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedRoom) {
      try {
        await chatService.deleteRoom(selectedRoom.id);
        loadRooms();
      } catch (err: any) {
        setError(err.response?.data?.message || '채팅방 삭제에 실패했습니다.');
      }
    }
    handleMenuClose();
  };

  const renderRoomCard = (room: ChatRoom) => (
    <Card 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" gutterBottom>
            {room.title}
          </Typography>
          <IconButton onClick={(e) => handleMenuOpen(e, room)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Typography color="textSecondary" gutterBottom>
          {room.category}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {room.description}
        </Typography>
        <Typography color="textSecondary" variant="body2">
          참여자: {room.currentMembers}/{room.maxMembers}
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={() => handleJoin(room.id)}
          disabled={room.currentMembers >= room.maxMembers}
          sx={{ mt: 2 }}
        >
          참여하기
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          채팅방 목록
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/chat/create')}
        >
          채팅방 만들기
        </Button>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Box>
          <TextField
            fullWidth
            label="검색"
            value={search.keyword}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </Box>
        <Box>
          <FormControl fullWidth>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={search.category}
              label="카테고리"
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="HOBBY">취미</MenuItem>
              <MenuItem value="STUDY">스터디</MenuItem>
              <MenuItem value="LIFE">일상</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box>
          <FormControl fullWidth>
            <InputLabel>정렬</InputLabel>
            <Select
              value={search.sort}
              label="정렬"
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <MenuItem value="createdAt,desc">최신순</MenuItem>
              <MenuItem value="currentMembers,desc">참여자 많은순</MenuItem>
              <MenuItem value="title,asc">제목순</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : rooms.length === 0 ? (
        <Alert severity="info">채팅방이 없습니다.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {rooms.map((room) => (
            <Box key={room.id}>
              {renderRoomCard(room)}
            </Box>
          ))}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={search.page + 1}
            onChange={handlePageChange}
          />
        </Box>
      )}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>수정</MenuItem>
        <MenuItem onClick={handleDelete}>삭제</MenuItem>
      </Menu>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ChatRoomList;