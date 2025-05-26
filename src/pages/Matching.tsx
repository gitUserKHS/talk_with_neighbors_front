import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { RootState, AppDispatch } from '../store';
import { MatchProfile, MatchingPreferences, Location, ActiveMatchRoomInfo } from '../store/types';
import {
  setPendingMatchOffer,
  clearPendingMatchOffer,
  setMatchCompleted,
  clearActiveMatchRoomInfo,
  setMatchStatusMessage,
  addNotification
} from '../store/slices/notificationSlice';

import matchingService from '../services/matchingService';
import { websocketService } from '../services/websocketService';

const Matching = (): React.ReactElement => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const {
    pendingMatchOffer, 
    activeMatchRoomInfo: reduxActiveMatchRoomInfo,
    matchStatusMessage: reduxMatchStatusMessage 
  } = useSelector((state: RootState) => state.notifications);
  
  const [isWsConnectedLocal, setIsWsConnectedLocal] = useState<boolean>(websocketService.getIsConnected());
  const [isRequestingAPI, setIsRequestingAPI] = useState(false);
  const [preferences, setPreferences] = useState<Omit<MatchingPreferences, 'location'>>({
    maxDistance: 10,
    ageRange: [20, 35],
    gender: 'any',
    interests: [],
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userClickedAccept, setUserClickedAccept] = useState<boolean>(false);

  useEffect(() => {
    const unregister = websocketService.registerConnectionStateChangeCallback(setIsWsConnectedLocal);
    return () => unregister?.();
  }, []);

  useEffect(() => {
    if (currentUser && (!currentUser.latitude || !currentUser.longitude || !currentUser.address)) {
      setLocationError('매칭을 시작하려면 프로필에서 위치 정보를 설정해야 합니다. 프로필 페이지로 이동하여 위치를 설정해주세요.');
    } else {
      setLocationError(null);
    }
  }, [currentUser]);

  useEffect(() => {
    if (reduxActiveMatchRoomInfo?.id && reduxActiveMatchRoomInfo?.name) {
      const message = reduxMatchStatusMessage || `매칭 성공! '${reduxActiveMatchRoomInfo.name}' 채팅방으로 이동합니다.`;
      dispatch(addNotification({
        type: 'success',
        message: message,
        navigateTo: `/chat/room/${reduxActiveMatchRoomInfo.id}`
      }));
      dispatch(setMatchStatusMessage(message));
    }
  }, [reduxActiveMatchRoomInfo, dispatch, navigate, reduxMatchStatusMessage]);

  const resetMatchingProcessStates = useCallback(() => {
    dispatch(clearPendingMatchOffer());
    dispatch(clearActiveMatchRoomInfo());
    dispatch(setMatchStatusMessage(null));
    setUserClickedAccept(false);
    setIsRequestingAPI(false);
  }, [dispatch]);

  const handleStartMatching = async () => {
    if (!currentUser || !currentUser.latitude || !currentUser.longitude || !currentUser.address) {
      setLocationError('프로필에 위치 정보가 설정되어 있지 않습니다. 먼저 프로필에서 위치를 설정해주세요.');
      dispatch(addNotification({type: 'warning', message: '프로필에 위치 정보가 설정되어 있지 않습니다. 프로필 수정 페이지로 이동하여 위치를 설정해주세요.', navigateTo: '/profile'}));
      navigate('/profile');
      return;
    }
    setLocationError(null);
    resetMatchingProcessStates();
    setIsRequestingAPI(true);
    dispatch(setMatchStatusMessage('매칭 상대를 찾고 있습니다...'));

    try {
      const matchingPrefsToSend: MatchingPreferences = {
        ...preferences,
        location: {
          latitude: currentUser.latitude,
          longitude: currentUser.longitude,
          address: currentUser.address,
        },
      };
      const matches: MatchProfile[] = await matchingService.startMatching(matchingPrefsToSend);
      console.log('[Matching.tsx] Received matches from /api/matching/start:', matches);

      if (matches && matches.length > 0) {
        const firstMatch = matches[0];
        if (!firstMatch.id || !firstMatch.matchId) {
          console.error('[Matching.tsx] Invalid match data received:', firstMatch);
          dispatch(addNotification({type: 'error', message: '수신된 매칭 데이터에 오류가 있습니다.'}));
          dispatch(setMatchStatusMessage('매칭 데이터를 처리하는 중 문제가 발생했습니다.'));
          resetMatchingProcessStates();
        } else {
          dispatch(setPendingMatchOffer(firstMatch));
        }
      } else {
        dispatch(addNotification({type: 'info', message: '조건에 맞는 매칭 상대를 찾지 못했습니다.'}));
        dispatch(setMatchStatusMessage('매칭할 사용자를 찾지 못했습니다. 잠시 후 다시 시도해주세요.'));
      }
    } catch (error) {
      console.error('매칭 시작 요청 실패:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setMatchStatusMessage(`매칭 시작 중 오류: ${errorMessage}`));
      dispatch(addNotification({type: 'error', message: `매칭 시작 중 오류: ${errorMessage}`}));
      resetMatchingProcessStates();
    } finally {
      setIsRequestingAPI(false);
    }
  };

  const handleStopMatching = async () => {
    resetMatchingProcessStates();
    dispatch(addNotification({type: 'info', message: '매칭 찾기를 중단했습니다.'}));
  };

  const handleAcceptMatch = async () => {
    if (!pendingMatchOffer || !pendingMatchOffer.matchId) {
      dispatch(setMatchStatusMessage('오류: 수락할 매칭 정보가 없습니다.'));
      return;
    }
    setIsRequestingAPI(true);
    dispatch(setMatchStatusMessage('수락 의사를 전달 중입니다...'));
    try {
      await matchingService.acceptMatch(pendingMatchOffer.matchId);
      setUserClickedAccept(true);
      dispatch(setMatchStatusMessage('수락 의사를 전달했습니다. 상대방의 응답 또는 최종 결과를 기다립니다...'));
    } catch (error) {
      console.error('매칭 수락 요청 실패:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setMatchStatusMessage(`매칭 수락 중 오류: ${errorMessage}`));
      dispatch(addNotification({type: 'error', message: `매칭 수락 중 오류: ${errorMessage}`}));
      setUserClickedAccept(false);
    } finally {
      setIsRequestingAPI(false);
    }
  };

  const handleRejectMatch = async () => {
    if (!pendingMatchOffer || !pendingMatchOffer.matchId) {
      dispatch(setMatchStatusMessage('오류: 거절할 매칭 정보가 없습니다.'));
      return;
    }
    setIsRequestingAPI(true);
    dispatch(setMatchStatusMessage('거절 의사를 전달 중입니다...'));
    try {
      await matchingService.rejectMatch(pendingMatchOffer.matchId);
      resetMatchingProcessStates();
      dispatch(addNotification({type: 'info', message: '매칭 제안을 거절했습니다.'}));
    } catch (error) {
      console.error('매칭 거절 요청 실패:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch(setMatchStatusMessage(`매칭 거절 중 오류: ${errorMessage}`));
      dispatch(addNotification({type: 'error', message: `매칭 거절 중 오류: ${errorMessage}`}));
    } finally {
      setIsRequestingAPI(false);
    }
  };
  
  const handleCloseDialog = () => {
    if (pendingMatchOffer && !userClickedAccept) {
        dispatch(addNotification({type: 'info', message: '매칭 제안을 닫았습니다.'}));
    }
    resetMatchingProcessStates();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          새로운 친구 찾기
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            매칭 설정
          </Typography>

          {locationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {locationError}
              <Button variant="text" size="small" onClick={() => navigate('/profile')} sx={{ ml: 1}}>
                프로필로 이동
              </Button>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography gutterBottom>
                검색 반경: {preferences.maxDistance}km
              </Typography>
              <Slider
                value={preferences.maxDistance}
                onChange={(_, value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    maxDistance: value as number,
                  }))
                }
                min={1}
                max={50}
                valueLabelDisplay="auto"
                disabled={isRequestingAPI || !!pendingMatchOffer || !!reduxActiveMatchRoomInfo}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <FormControl fullWidth disabled={isRequestingAPI || !!pendingMatchOffer || !!reduxActiveMatchRoomInfo}>
                  <InputLabel>성별</InputLabel>
                  <Select
                    value={preferences.gender}
                    label="성별"
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="any">모두</MenuItem>
                    <MenuItem value="male">남성</MenuItem>
                    <MenuItem value="female">여성</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="관심사 (쉼표로 구분)"
                  value={preferences.interests?.join(', ')}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      interests: e.target.value.split(',').map(i => i.trim()),
                    }))
                  }
                  disabled={isRequestingAPI || !!pendingMatchOffer || !!reduxActiveMatchRoomInfo}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          {!pendingMatchOffer && !reduxActiveMatchRoomInfo && (
            <Button
              variant="contained"
              size="large"
              onClick={handleStartMatching}
              disabled={!!locationError || isRequestingAPI || !isWsConnectedLocal}
              sx={{minWidth: '180px'}}
            >
              {isRequestingAPI && reduxMatchStatusMessage === '매칭 상대를 찾고 있습니다...' ? (
                <CircularProgress size={24} color="inherit" sx={{mr: 1}}/>
              ) : null}
              {isRequestingAPI && reduxMatchStatusMessage === '매칭 상대를 찾고 있습니다...' 
                ? '매칭 찾는중...' 
                : !isWsConnectedLocal 
                  ? '서버 연결중...' 
                  : '매칭 시작하기'}
            </Button>
          )}

          {(isRequestingAPI || pendingMatchOffer) && !reduxActiveMatchRoomInfo && (
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={handleStopMatching}
              sx={{minWidth: '180px'}}
            >
              매칭 중단하기
            </Button>
          )}
        </Box>

        <Dialog 
          open={!!pendingMatchOffer && !reduxActiveMatchRoomInfo} 
          onClose={handleCloseDialog}
          disableEscapeKeyDown={isRequestingAPI || (!!pendingMatchOffer && userClickedAccept && !reduxActiveMatchRoomInfo)}
        >
          <DialogTitle>
            {pendingMatchOffer ? `${pendingMatchOffer.username} (${pendingMatchOffer.age}세)님과 매칭할까요?` : "매칭 제안"}
          </DialogTitle>
          <DialogContent>
            {reduxMatchStatusMessage && (
              <Typography sx={{mb: 2}}>{reduxMatchStatusMessage}</Typography>
            )}
            {pendingMatchOffer && !reduxMatchStatusMessage && (
              <Box>
                <Typography variant="body1">관심사: {pendingMatchOffer.interests.join(', ')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {pendingMatchOffer.distance ? `${pendingMatchOffer.distance.toFixed(1)}km 떨어져 있어요` : '거리 정보 없음'}
                </Typography>
                {pendingMatchOffer.bio && <Typography sx={{mt:1}}>소개: {pendingMatchOffer.bio}</Typography>}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: '0 24px 24px 24px', justifyContent: 'center', gap: 2 }}>
            {!userClickedAccept && pendingMatchOffer && (
              <>
                <Button onClick={handleRejectMatch} color="secondary" variant="outlined" disabled={isRequestingAPI || !isWsConnectedLocal}>거절</Button>
                <Button onClick={handleAcceptMatch} variant="contained" color="primary" disabled={isRequestingAPI || !isWsConnectedLocal}>수락</Button>
              </>
            )}
            {pendingMatchOffer && userClickedAccept && (
              <Button onClick={handleCloseDialog} color="inherit" variant="outlined" disabled={isRequestingAPI}>
                {isRequestingAPI ? <CircularProgress size={20} sx={{mr:1}}/> : null}
                응답 대기중 (닫기)
              </Button> 
            )}
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default Matching;