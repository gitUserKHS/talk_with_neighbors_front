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
  CircularProgress
} from '@mui/material';
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

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const result = await chatService.searchRooms(search);
      setRooms(result.content);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('채팅방 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search to prevent too many API calls
  const debouncedSearch = useCallback(
    debounce((newSearch: SearchUpdate) => {
      setSearch((prev) => ({ ...prev, ...newSearch }));
    }, 300),
    []
  );

  useEffect(() => {
    loadRooms();
  }, [search.keyword, search.category, search.page, search.size, search.sort]);

  const handleJoin = async (roomId: number) => {
    try {
      await chatService.joinRoom(roomId);
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '채팅방 참여에 실패했습니다.');
      console.error('Failed to join room:', err);
    }
  };

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
            onChange={(e) => debouncedSearch({ keyword: e.target.value, page: 0 })}
          />
        </Box>
        <Box>
          <FormControl fullWidth>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={search.category}
              label="카테고리"
              onChange={(e) => setSearch(prev => ({ ...prev, category: e.target.value, page: 0 }))}
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
              onChange={(e) => setSearch(prev => ({ ...prev, sort: e.target.value }))}
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
                  <Typography variant="h6" gutterBottom>
                    {room.title}
                  </Typography>
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
            </Box>
          ))}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={search.page + 1}
            onChange={(_, value) => setSearch({ ...search, page: value - 1 })}
          />
        </Box>
      )}
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