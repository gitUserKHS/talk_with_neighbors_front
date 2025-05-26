import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  List,
  ListItem,
  ListItemButton,
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
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon, ExitToApp as LeaveIcon, Group as GroupIcon, Clear as ClearIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { chatService } from '../../services/chatService';
import { websocketService } from '../../services/websocketService';
import { 
  fetchChatRooms, 
  clearChatRooms, 
  fetchSearchedChatRooms, 
  clearSearchedRooms, 
  setSearchCriteria,
  ChatState,
  clearRoomsError,
  clearSearchError,
  fetchAllUnreadCounts,
  moveChatRoomToTop,
  updateRoomInfo
} from '../../store/slices/chatSlice';
import { 
  addOfflineNotification, 
  setConnectionStatus,
  handleNotificationSummary 
} from '../../store/slices/notificationSlice';
import { RootState, AppDispatch } from '../../store/types';
import { ChatRoom, ChatRoomType } from '../../types/chat';
import { SelectChangeEvent } from '@mui/material/Select';
import { store } from '../../store';
import { authService } from '../../services/authService';

const PAGE_SIZE = 20;

// 임시 getAvatarColor 함수 정의
const getAvatarColor = (roomId: string) => {
  // 여기에 실제 색상 결정 로직이 필요하다면 추가합니다.
  // 예시: roomId 해시 값 기반으로 색상 배열에서 선택 등
  const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0'];
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = roomId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index] || '#bdbdbd';
};

const ChatRoomList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const chatState = useSelector((state: RootState) => state.chat) as ChatState;

  const { 
    rooms, 
    unreadCount, 
    currentPage,
    totalPages,
    hasMoreRooms, 
    loadingRooms, 
    initialLoading,
    roomsError
  } = chatState;
  const {
    searchedRooms,
    searchKeyword: searchKeywordFromStore,
    searchType: searchTypeFromStore,
    searchedCurrentPage,
    searchedTotalPages,
    hasMoreSearchedRooms,
    loadingSearchedRooms,
    initialLoadingSearch,
    searchError
  } = chatState;
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [localSearchKeyword, setLocalSearchKeyword] = useState('');
  const [localRoomType, setLocalRoomType] = useState<string>('');

  const [componentError, setComponentError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSearchMode = (typeof searchKeywordFromStore === 'string' && searchKeywordFromStore.length > 0) || 
                     (typeof searchTypeFromStore === 'string' && searchTypeFromStore.length > 0);

  const currentRoomsToDisplay = isSearchMode ? searchedRooms : rooms;
  const isLoadingCurrentList = isSearchMode ? loadingSearchedRooms : loadingRooms;
  const hasMoreCurrentList = isSearchMode ? hasMoreSearchedRooms : hasMoreRooms;
  const initialLoadingCurrentList = isSearchMode ? initialLoadingSearch : initialLoading;
  const displayError = isSearchMode ? searchError : roomsError;
  const combinedComponentError = componentError;

  useEffect(() => {
    console.log('[ChatRoomList] Unread counts updated:', unreadCount);
  }, [unreadCount]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastRoomElementRef = useCallback((node: HTMLDivElement | null) => {
    const isLoading = isSearchMode ? loadingSearchedRooms : loadingRooms;
    if (isLoading) return;

    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        if (isSearchMode && hasMoreSearchedRooms && !loadingSearchedRooms) {
          dispatch(fetchSearchedChatRooms({ 
            keyword: searchKeywordFromStore, 
            type: searchTypeFromStore as string,
            page: searchedCurrentPage + 1, 
            size: PAGE_SIZE 
          }));
        } else if (!isSearchMode && hasMoreRooms && !loadingRooms) {
          dispatch(fetchChatRooms({ page: currentPage + 1, size: PAGE_SIZE }));
        }
      }
    });
    if (node) observer.current.observe(node);
  }, [
    isSearchMode, 
    loadingRooms, loadingSearchedRooms,
    hasMoreRooms, hasMoreSearchedRooms,
    dispatch, 
    currentPage, searchedCurrentPage, 
    searchKeywordFromStore, searchTypeFromStore
  ]);

  const loadInitialGeneralRooms = useCallback(() => {
    if (!isAuthenticated) return;
    setComponentError(null);
    dispatch(clearChatRooms());
    dispatch(fetchChatRooms({ page: 0, size: PAGE_SIZE }))
      .unwrap()
      .catch(err => {
        setComponentError(typeof err === 'string' ? err : '채팅방 목록을 불러오는데 실패했습니다.');
      });
  }, [dispatch, isAuthenticated]);

  // Effect for initial loading and reacting to isSearchMode changes
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      if (!isSearchMode) { 
        loadInitialGeneralRooms();
      }
      dispatch(fetchAllUnreadCounts())
        .unwrap()
        .catch(err => {
          console.error('읽지 않은 메시지 수 로드 실패:', err);
        });
    }
    // observer 관리는 여기서 계속합니다. (스크롤 관련)
    // 이 useEffect는 isSearchMode가 바뀔 때도 실행되어야 할 수 있으므로, 
    // observer 해제 로직은 여기에 두거나, 혹은 lastRoomElementRef 콜백 내부에서 관리합니다.
    // 우선 현재 구조에서는 lastRoomElementRef에서 observer.current.disconnect()를 이미 하고 있으므로 중복을 피합니다.
  }, [isAuthenticated, navigate, loadInitialGeneralRooms, dispatch, isSearchMode]);

  // Effect SOLELY for cleaning up search state on component unmount
  useEffect(() => {
    return () => {
      // 컴포넌트가 실제로 언마운트될 때만 실행됩니다.
      const currentSearchKeyword = store.getState().chat.searchKeyword;
      const currentSearchType = store.getState().chat.searchType;
      const stillInSearchModeOnUnmount = 
          (typeof currentSearchKeyword === 'string' && currentSearchKeyword.length > 0) || 
          (typeof currentSearchType === 'string' && currentSearchType.length > 0);

      if (stillInSearchModeOnUnmount) {
        console.log('[ChatRoomList] Component unmounting in search mode. Clearing search state.');
        dispatch(clearSearchedRooms());
      }
    };
  }, [dispatch]); // dispatch는 일반적으로 안정적이므로, 이 useEffect는 마운트/언마운트 시에만 주로 동작합니다.

  const handleSearch = () => {
    if (!localSearchKeyword.trim() && !localRoomType) {
      if (isSearchMode) {
        dispatch(clearSearchedRooms());
        setLocalSearchKeyword('');
        setLocalRoomType('');
        if (rooms.length === 0 || initialLoading) { 
            loadInitialGeneralRooms();
        }
      }
      return;
    }
    setComponentError(null);
    dispatch(setSearchCriteria({ keyword: localSearchKeyword, type: localRoomType }));
    dispatch(fetchSearchedChatRooms({ 
      keyword: localSearchKeyword, 
      type: localRoomType, 
      page: 0, 
      size: PAGE_SIZE 
    }))
    .unwrap()
    .catch(err => {
        console.error('Search failed (in component):', err);
    });
  };

  const handleClearSearch = () => {
    dispatch(clearSearchedRooms());
    setLocalSearchKeyword('');
    setLocalRoomType('');
    if (rooms.length === 0 || (currentPage === 0 && initialLoading && !loadingRooms )) {
        loadInitialGeneralRooms();
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchKeyword(e.target.value);
  };

  const handleRoomTypeChange = (e: SelectChangeEvent) => {
    setLocalRoomType(e.target.value as string);
  };

  const handleRoomClick = useCallback((room: ChatRoom) => {
    if (unreadCount[room.id] && unreadCount[room.id] > 0) {
      console.log(`[ChatRoomList] Entering room ${room.id} with ${unreadCount[room.id]} unread messages`);
    }
    navigate(`/chat/${room.id}`);
  }, [navigate, unreadCount]);

  const handleCreateRoom = useCallback(() => {
    navigate('/chat/create');
  }, [navigate]);
  
  const isRoomCreator = useCallback((room: ChatRoom) => {
    if (!currentUser || !room.creatorId) return false;
    return room.creatorId.toString() === currentUser.id.toString();
  }, [currentUser]);

  const isUserMember = useCallback((room: ChatRoom) => {
    if (!currentUser) return false;
    if (isRoomCreator(room)) return true; 
    if (!room.participantIds || !Array.isArray(room.participantIds)) {
      return false;
    }
    return room.participantIds.map(String).includes(String(currentUser.id));
  }, [currentUser, isRoomCreator]);

  const handleLeaveRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setComponentError(null);
    try {
      await chatService.leaveRoom(roomId);
      setSuccessMessage('채팅방에서 나갔습니다.');
      afterRoomActionSuccess();
    } catch (error: any) {
      console.error('채팅방 나가기 실패:', error);
      setComponentError(error.message || '채팅방에서 나가는데 실패했습니다.');
    }
  };
  
  const handleJoinRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setComponentError("로그인이 필요합니다.");
      return;
    }
    try {
      setComponentError(null);
      await chatService.joinRoom(roomId);
      
      setSuccessMessage('채팅방에 성공적으로 가입했습니다.');

      console.log(`[ChatRoomList] Successfully joined room: ${roomId}. Attempting to refresh list.`);

      if (isSearchMode) {
        const resultAction = await dispatch(fetchSearchedChatRooms({ 
          keyword: searchKeywordFromStore, 
          type: searchTypeFromStore as string,
          page: 0, 
          size: PAGE_SIZE 
        }));
        if (fetchSearchedChatRooms.fulfilled.match(resultAction)) {
            console.log('[ChatRoomList] Refreshed searched rooms after join (payload):', resultAction.payload);
        } else if (fetchSearchedChatRooms.rejected.match(resultAction)) {
            console.error('[ChatRoomList] Failed to refresh searched rooms after join:', resultAction.error);
        }
      } else {
        const resultAction = await dispatch(fetchChatRooms({ page: 0, size: PAGE_SIZE }));
        if (fetchChatRooms.fulfilled.match(resultAction)) {
            console.log('[ChatRoomList] Refreshed rooms after join (payload):', resultAction.payload);
        } else if (fetchChatRooms.rejected.match(resultAction)) {
            console.error('[ChatRoomList] Failed to refresh rooms after join:', resultAction.error);
        }
      }
      
    } catch (error: any) {
      console.error('Failed to join chat room:', error);
      setComponentError(error.message || '채팅방 가입에 실패했습니다.');
    }
  };

  const handleOpenDeleteDialog = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRoomId(roomId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoomId) return;
    setComponentError(null);
    try {
      const success = await chatService.deleteRoom(selectedRoomId);
      if (success) {
        setSuccessMessage('채팅방 삭제 요청이 처리되었습니다. 잠시 후 목록에서 제거됩니다.');
      } else {
        setComponentError('채팅방 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('채팅방 삭제 실패:', error);
      setComponentError(error.message || '채팅방 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedRoomId(null);
    }
  };

  // 카카오톡 스타일 실시간 채팅방 순서 업데이트 (백엔드 가이드 반영)
  const refreshChatRoomOrder = useCallback((updatedRoomId: string) => {
    console.log(`[ChatRoomList] Refreshing chat room order for room: ${updatedRoomId}`);
    
    // 채팅방 목록 다시 로드하여 최신 순서 반영
    if (isSearchMode) {
      dispatch(fetchSearchedChatRooms({ 
        keyword: searchKeywordFromStore, 
        type: searchTypeFromStore as string, 
        page: 0,
        size: PAGE_SIZE 
      }));
    } else {
      loadInitialGeneralRooms();
    }
    
    // 업데이트된 채팅방 하이라이트 효과 (3초간)
    setTimeout(() => {
      const roomElement = document.querySelector(`[data-room-id="${updatedRoomId}"]`);
      if (roomElement) {
        roomElement.classList.add('updated-room');
        setTimeout(() => roomElement.classList.remove('updated-room'), 3000);
      }
    }, 100);
  }, [isSearchMode, searchKeywordFromStore, searchTypeFromStore, loadInitialGeneralRooms, dispatch]);

  // 실시간 채팅방 업데이트 감지 (백엔드 가이드 반영)
  useEffect(() => {
    const handleChatRoomUpdate = () => {
      // Redux 상태 변화를 감지하여 업데이트된 채팅방이 있는지 확인
      const currentState = store.getState().chat as ChatState;
      const currentRoomsFromState = isSearchMode ? currentState.searchedRooms : currentState.rooms;
      
      // 이전 순서와 비교하여 변경사항이 있으면 하이라이트
      if (currentRoomsFromState.length > 0 && currentRoomsToDisplay.length > 0) {
        const firstRoomId = currentRoomsFromState[0]?.id;
        const wasFirstRoom = currentRoomsToDisplay[0]?.id;
        
        if (firstRoomId !== wasFirstRoom && firstRoomId) {
          // 새로운 채팅방이 맨 위로 올라온 경우 하이라이트
          setTimeout(() => {
            const roomElement = document.querySelector(`[data-room-id="${firstRoomId}"]`);
            if (roomElement) {
              roomElement.classList.add('updated-room');
              setTimeout(() => roomElement.classList.remove('updated-room'), 3000);
            }
          }, 100);
        }
      }
    };

    // Redux 상태 변화 감지를 위한 구독
    const unsubscribe = store.subscribe(handleChatRoomUpdate);
    
    return () => {
      unsubscribe();
    };
  }, [isSearchMode, currentRoomsToDisplay]);

  const formatLastMessageTime = (time?: string) => {
    if (!time) return '';
    
    const messageTime = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // 카카오톡 스타일 시간 포맷팅 (백엔드 가이드 반영)
    if (diffMinutes < 1) {
      return '방금';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      // 일주일 이상 지난 경우 날짜 표시
      return messageTime.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const afterRoomActionSuccess = () => {
    if (isSearchMode) {
      dispatch(fetchSearchedChatRooms({ 
        keyword: searchKeywordFromStore, 
        type: searchTypeFromStore as string, 
        page: 0,
        size: PAGE_SIZE 
      }));
    } else {
      loadInitialGeneralRooms();
    }
  }

  // 🆕 백엔드 오프라인 알림 테스트 API 호출 함수들
  const testBackendOfflineNotifications = async (testType: 'pending' | 'direct') => {
    const currentUser = store.getState().auth.user;
    if (!currentUser?.id) {
      console.error('[ChatRoomList] No current user found for testing');
      setComponentError('테스트를 위해서는 로그인이 필요합니다.');
      return;
    }

    const userId = currentUser.id;
    const endpoint = testType === 'pending' 
      ? `/api/notifications/test/send-pending/${userId}`
      : `/api/notifications/test/send-direct/${userId}`;

    try {
      console.log(`[ChatRoomList] Testing backend offline notifications: ${testType} for user ${userId}`);
      
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.text();
        console.log(`[ChatRoomList] Backend test ${testType} success:`, result);
        setSuccessMessage(`백엔드 테스트 성공: ${result}`);
      } else {
        const errorText = await response.text();
        console.error(`[ChatRoomList] Backend test ${testType} failed:`, response.status, errorText);
        setComponentError(`백엔드 테스트 실패 (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error(`[ChatRoomList] Error calling backend test ${testType}:`, error);
      setComponentError(`백엔드 테스트 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 백엔드 상태 확인 API 호출
  const checkBackendStatus = async () => {
    try {
      console.log('[ChatRoomList] Checking backend status');
      
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('세션 ID가 없습니다. 다시 로그인해주세요.');
      }

      const response = await fetch('http://localhost:8080/api/notifications/test/status', {
        method: 'GET',
        headers: {
          'X-Session-Id': sessionId
        },
        credentials: 'include'
      });

      if (response.ok) {
        const status = await response.text();
        console.log('[ChatRoomList] Backend status:', status);
        setSuccessMessage(`백엔드 상태: ${status}`);
      } else {
        const errorText = await response.text();
        console.error('[ChatRoomList] Backend status check failed:', response.status, errorText);
        setComponentError(`백엔드 상태 확인 실패: ${errorText}`);
      }
    } catch (error) {
      console.error('[ChatRoomList] Error checking backend status:', error);
      setComponentError(`백엔드 상태 확인 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  if (initialLoadingCurrentList && currentRoomsToDisplay.length === 0 && !displayError && !combinedComponentError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">채팅방</Typography>
        <Box>
          {isSearchMode && (
            <Tooltip title="검색 초기화 및 전체 목록 보기">
              <IconButton onClick={handleClearSearch} color="default" sx={{mr:1}}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={handleCreateRoom} color="primary">
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #eee' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="채팅방 검색"
            value={localSearchKeyword}
            onChange={handleSearchInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch} size="small" disabled={loadingSearchedRooms || loadingRooms}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size="small"
            variant="outlined"
          />
          <FormControl size="small" sx={{ minWidth: 120 }} variant="outlined" disabled={loadingSearchedRooms || loadingRooms}>
            <InputLabel>유형</InputLabel>
            <Select
              value={localRoomType}
              label="유형"
              onChange={handleRoomTypeChange}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value={ChatRoomType.ONE_ON_ONE}>1:1</MenuItem>
              <MenuItem value={ChatRoomType.GROUP}>그룹</MenuItem>
            </Select>
          </FormControl>
           <Button variant="outlined" onClick={handleSearch} size="medium" disabled={loadingSearchedRooms || loadingRooms}>
             검색
           </Button>
        </Box>
      </Box>

      {(displayError || combinedComponentError) && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Alert 
            severity="error" 
            onClose={() => {
              if (combinedComponentError) setComponentError(null);
              if (displayError) {
                if (isSearchMode) {
                  dispatch(clearSearchError());
                } else {
                  dispatch(clearRoomsError());
                }
              }
            }}
          >
            {combinedComponentError || displayError}
          </Alert>
        </Box>
      )}

      <List sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', bgcolor: 'background.paper' }}>
        {currentRoomsToDisplay.map((room, index) => {
          const isLastElement = index === currentRoomsToDisplay.length - 1;
          const roomUnreadCount = unreadCount[room.id] || 0;
          return (
            <ListItemButton
              key={room.id} 
              ref={isLastElement ? lastRoomElementRef : null}
              onClick={() => handleRoomClick(room)}
              alignItems="flex-start"
              sx={{
                mb: 1,
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
                '&:hover': {
                  boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
                },
              }}
            >
              <ListItemAvatar>
                <Badge badgeContent={roomUnreadCount} color="error" overlap="circular">
                  <Avatar sx={{ bgcolor: getAvatarColor(room.id) }}>
                    {room.roomName?.charAt(0).toUpperCase() || 'R'}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText 
                primary={<Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>{room.roomName || '이름 없는 방'}</Typography>}
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    maxWidth: 'calc(100% - 40px)' 
                  }}>
                    {room.lastMessage || '아직 메시지가 없습니다.'}
                  </Typography>
                }
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 1 }}>
                {isRoomCreator(room) && (
                  <Tooltip title="채팅방 삭제">
                    <IconButton
                      edge="end"
                      aria-label="delete room"
                      onClick={(e) => handleOpenDeleteDialog(room.id, e)}
                      size="small"
                      sx={{ mb: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {!isRoomCreator(room) && isUserMember(room) && (
                  <Tooltip title="채팅방 나가기">
                    <IconButton
                      edge="end"
                      aria-label="leave room"
                      onClick={(e) => handleLeaveRoom(room.id, e)}
                      size="small"
                      sx={{ mb: 0.5 }}
                    >
                      <LeaveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {!isUserMember(room) && (
                  <Tooltip title="채팅방 가입하기">
                     <Button
                      variant="contained"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={(e) => handleJoinRoom(room.id, e)}
                      sx={{padding: '2px 8px', fontSize: '0.75rem'}}
                    >
                      가입
                    </Button>
                  </Tooltip>
                )}
              </Box>
              {room.lastMessageTime && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  {formatLastMessageTime(room.lastMessageTime)}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <GroupIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {room.participantCount !== undefined ? `${room.participantCount}명` : '참여자 수 정보 없음'}
                </Typography>
              </Box>
            </ListItemButton>
          );
        })}
        {isLoadingCurrentList && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2}}><CircularProgress /></Box>
        )}
        {!isLoadingCurrentList && currentRoomsToDisplay.length === 0 && !displayError && (
          <Typography sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
            {isSearchMode ? '검색 결과가 없습니다.' : '활성화된 채팅방이 없습니다. 채팅방을 만들어보세요!'}
          </Typography>
        )}
      </List>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>채팅방 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 채팅방을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteRoom} color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {combinedComponentError && (
        <Snackbar 
          open={!!combinedComponentError} 
          autoHideDuration={6000} 
          onClose={() => {
            setComponentError(null);
            if (isSearchMode) dispatch(clearSearchError());
            else dispatch(clearRoomsError());
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => {
              setComponentError(null);
              if (isSearchMode) dispatch(clearSearchError());
              else dispatch(clearRoomsError());
            }} 
            severity="error" 
            sx={{ width: '100%' }}
          >
            {combinedComponentError}
          </Alert>
        </Snackbar>
      )}
      {successMessage && (
         <Snackbar 
          open={!!successMessage} 
          autoHideDuration={3000} 
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>
      )}
    </Paper>
  );
};

export default ChatRoomList; 