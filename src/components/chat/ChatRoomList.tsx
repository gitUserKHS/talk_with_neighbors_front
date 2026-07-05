import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { ChatRoom, ChatRoomType } from '../../types/chat';

const formatTime = (value?: string) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const ChatRoomList: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = async (searchKeyword = keyword) => {
    setLoading(true);
    setError(null);

    try {
      const page = searchKeyword.trim()
        ? await chatService.searchRooms(searchKeyword.trim(), undefined, 0, 30)
        : await chatService.getRooms(0, 30);
      setRooms(page.content);
    } catch {
      setError('채팅방 목록을 불러오지 못했어.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms('');
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              채팅
            </Typography>
            <Typography color="text.secondary">매칭되었거나 참여 중인 대화를 이어가.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/chat/create')}>
            방 만들기
          </Button>
        </Box>

        <TextField
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              loadRooms();
            }
          }}
          placeholder="채팅방 검색"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => loadRooms()}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && rooms.length === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary">아직 채팅방이 없어. 매칭을 수락하면 1:1 방이 열려.</Typography>
            </CardContent>
          </Card>
        )}

        {rooms.map((room) => (
          <Card
            key={room.id}
            variant="outlined"
            sx={{ borderRadius: 2, cursor: 'pointer' }}
            onClick={() => navigate(`/chat/${room.id}`)}
          >
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Badge badgeContent={room.unreadCount || 0} color="error">
                  <Avatar>{room.roomName?.[0] || '채'}</Avatar>
                </Badge>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                      {room.roomName || '이름 없는 채팅방'}
                    </Typography>
                    <Chip
                      size="small"
                      label={room.type === ChatRoomType.ONE_ON_ONE ? '1:1' : '그룹'}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {room.lastMessage || '아직 메시지가 없어.'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(room.lastMessageTime)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
};

export default ChatRoomList;
