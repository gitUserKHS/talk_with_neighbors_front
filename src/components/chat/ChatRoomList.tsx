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
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChatRoomType } from '../../types/chat';
import { AppDispatch, RootState } from '../../store/types';
import {
  clearRoomsError,
  clearSearchError,
  clearSearchedRooms,
  fetchChatRooms,
  fetchSearchedChatRooms,
  markMessagesAsReadInStore,
  selectChatRooms,
  selectChatUnreadCounts,
  setSearchCriteria,
} from '../../store/slices/chatSlice';
import { useI18n } from '../../i18n/I18nProvider';

const ROOM_PAGE_SIZE = 30;

const ChatRoomList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t, formatDate, formatNumber } = useI18n();
  // 목록과 읽지 않은 수는 스토어에서 읽는다. 웹소켓이 updateRoomInfo / updateUnreadCount /
  // moveChatRoomToTop / removeRoom을 같은 스토어에 넣으므로 새로고침 없이도 최신 상태가 보인다.
  const rooms = useSelector(selectChatRooms);
  const unreadCount = useSelector(selectChatUnreadCounts);
  const searchedRooms = useSelector((state: RootState) => state.chat.searchedRooms);
  const loadingRooms = useSelector((state: RootState) => state.chat.loadingRooms);
  const loadingSearchedRooms = useSelector((state: RootState) => state.chat.loadingSearchedRooms);
  const roomsError = useSelector((state: RootState) => state.chat.roomsError);
  const searchError = useSelector((state: RootState) => state.chat.searchError);
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');

  const searching = activeKeyword !== '';
  const visibleRooms = searching ? searchedRooms : rooms;
  const loading = searching ? loadingSearchedRooms : loadingRooms;
  const error = searching ? searchError : roomsError;

  const loadRooms = (searchKeyword = keyword) => {
    const trimmed = searchKeyword.trim();
    setActiveKeyword(trimmed);
    if (trimmed) {
      dispatch(setSearchCriteria({ keyword: trimmed }));
      dispatch(fetchSearchedChatRooms({ keyword: trimmed, page: 0, size: ROOM_PAGE_SIZE }));
    } else {
      dispatch(clearSearchedRooms());
      dispatch(fetchChatRooms({ page: 0, size: ROOM_PAGE_SIZE }));
    }
  };

  useEffect(() => {
    dispatch(fetchChatRooms({ page: 0, size: ROOM_PAGE_SIZE }));
  }, [dispatch]);

  const openRoom = (roomId: string) => {
    // 서버의 읽음 처리 결과(UNREAD_COUNT_UPDATE)가 오기 전에 배지를 먼저 내린다.
    dispatch(markMessagesAsReadInStore(roomId));
    navigate(`/chat/${roomId}`);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('채팅', 'Conversations')}
            </Typography>
            <Typography color="text.secondary">
              {t('매칭되었거나 참여 중인 대화를 이어가 보세요.', 'Continue conversations from your matches and meetups.')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<GroupsOutlinedIcon />} onClick={() => navigate('/meetups')}>
              {t('취미 모임', 'Meetups')}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/chat/create')}>
              {t('대화 만들기', 'New conversation')}
            </Button>
          </Stack>
        </Box>

        <TextField
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              loadRooms();
            }
          }}
          placeholder={t('채팅방 검색', 'Search conversations')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton aria-label={t('채팅방 검색', 'Search conversations')} onClick={() => loadRooms()}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          fullWidth
        />

        {error && (
          <Alert severity="error" onClose={() => dispatch(searching ? clearSearchError() : clearRoomsError())}>
            {t('채팅방 목록을 불러오지 못했습니다.', 'We could not load your conversations.')}
          </Alert>
        )}
        {loading && visibleRooms.length === 0 && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && visibleRooms.length === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="text.secondary">
                {searching
                  ? t('검색 결과가 없습니다.', 'No conversations match your search.')
                  : t('아직 채팅방이 없습니다. 매칭을 수락하면 1:1 채팅방이 열립니다.', 'You do not have any conversations yet. Accept a match to open a one-to-one chat.')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {visibleRooms.map((room) => {
          const unread = unreadCount[room.id] ?? room.unreadCount ?? 0;
          return (
            <Card
              key={room.id}
              variant="outlined"
              sx={{ borderRadius: 2, cursor: 'pointer' }}
              onClick={() => openRoom(room.id)}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Badge badgeContent={unread ? formatNumber(unread) : 0} color="error">
                    <Avatar>{room.roomName?.[0] || t('채', 'C')}</Avatar>
                  </Badge>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                        {room.roomName || t('이름 없는 채팅방', 'Untitled conversation')}
                      </Typography>
                      <Chip
                        size="small"
                        label={room.type === ChatRoomType.ONE_ON_ONE ? '1:1' : t('그룹', 'Group')}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {room.lastMessage || t('아직 메시지가 없습니다.', 'No messages yet.')}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {room.lastMessageTime ? formatDate(room.lastMessageTime, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : ''}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
};

export default ChatRoomList;
