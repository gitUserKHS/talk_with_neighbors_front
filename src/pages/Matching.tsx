import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import matchingService from '../services/matchingService';
import { AppDispatch, MatchProfile, MatchingPreferences, RootState } from '../store/types';
import {
  addNotification,
  clearActiveMatchRoomInfo,
  clearPendingMatchOffer,
  setMatchStatusMessage,
} from '../store/slices/notificationSlice';

const Matching: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { pendingMatchOffer, activeMatchRoomInfo, matchStatusMessage } = useSelector(
    (state: RootState) => state.notifications
  );
  const [recommendations, setRecommendations] = useState<MatchProfile[]>([]);
  const [preferences, setPreferences] = useState<MatchingPreferences>({
    maxDistance: 10,
    ageRange: [20, 35],
    gender: 'any',
    interests: currentUser?.interests || [],
  });
  const [interestInput, setInterestInput] = useState((currentUser?.interests || []).join(', '));
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPreferences((prev) => ({
      ...prev,
      interests: currentUser?.interests || prev.interests,
    }));
    setInterestInput((currentUser?.interests || []).join(', '));
  }, [currentUser]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    if (activeMatchRoomInfo?.id) {
      dispatch(
        addNotification({
          type: 'success',
          message: matchStatusMessage || '매칭이 성사되어 채팅방이 만들어졌어.',
          navigateTo: `/chat/${activeMatchRoomInfo.id}`,
        })
      );
    }
  }, [activeMatchRoomInfo, dispatch, matchStatusMessage]);

  const buildPreferences = (): MatchingPreferences => ({
    ...preferences,
    interests: interestInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    location:
      currentUser?.latitude && currentUser?.longitude
        ? {
            latitude: currentUser.latitude,
            longitude: currentUser.longitude,
            address: currentUser.address,
          }
        : undefined,
  });

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await matchingService.getRecommendations();
      setRecommendations(result);
    } catch {
      setError('추천 후보를 불러오지 못했어. 프로필과 위치 정보를 확인해줘.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      await matchingService.saveMatchingPreferences(buildPreferences());
      await loadRecommendations();
      setSuccess('매칭 조건을 저장하고 추천을 갱신했어.');
    } catch (err: any) {
      setError(err.response?.data?.message || '매칭 조건 저장에 실패했어.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMatch = async (profile: MatchProfile) => {
    setRequesting((prev) => ({ ...prev, [profile.id]: true }));
    setError(null);

    try {
      await matchingService.requestMatch(profile.id);
      setSuccess(`${profile.username}님에게 매칭 요청을 보냈어.`);
    } catch (err: any) {
      setError(err.response?.data?.message || '매칭 요청을 보낼 수 없어.');
    } finally {
      setRequesting((prev) => ({ ...prev, [profile.id]: false }));
    }
  };

  const handleAcceptMatch = async () => {
    if (!pendingMatchOffer?.matchId) return;

    try {
      await matchingService.acceptMatch(pendingMatchOffer.matchId);
      dispatch(setMatchStatusMessage('수락했어. 상대방 응답을 기다리는 중이야.'));
    } catch (err: any) {
      setError(err.response?.data?.message || '매칭 수락에 실패했어.');
    }
  };

  const handleRejectMatch = async () => {
    if (!pendingMatchOffer?.matchId) return;

    try {
      await matchingService.rejectMatch(pendingMatchOffer.matchId);
      dispatch(clearPendingMatchOffer());
      dispatch(setMatchStatusMessage(null));
    } catch (err: any) {
      setError(err.response?.data?.message || '매칭 거절에 실패했어.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            관심사 매칭
          </Typography>
          <Typography color="text.secondary">
            관심사, 거리, 나이 조건을 기준으로 잘 맞는 이웃을 추천해.
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        {!currentUser?.latitude || !currentUser?.longitude ? (
          <Alert
            severity="warning"
            action={<Button onClick={() => navigate('/profile')}>프로필로 이동</Button>}
          >
            거리 점수를 쓰려면 프로필에서 위치를 저장해줘.
          </Alert>
        ) : null}

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography gutterBottom>최대 거리: {preferences.maxDistance}km</Typography>
                <Slider
                  min={1}
                  max={50}
                  value={preferences.maxDistance}
                  valueLabelDisplay="auto"
                  onChange={(_, value) =>
                    setPreferences((prev) => ({ ...prev, maxDistance: value as number }))
                  }
                />
              </Box>
              <Box>
                <Typography gutterBottom>
                  나이 범위: {preferences.ageRange[0]}세 - {preferences.ageRange[1]}세
                </Typography>
                <Slider
                  min={18}
                  max={80}
                  value={preferences.ageRange}
                  valueLabelDisplay="auto"
                  onChange={(_, value) =>
                    setPreferences((prev) => ({ ...prev, ageRange: value as [number, number] }))
                  }
                />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>성별</InputLabel>
                  <Select
                    label="성별"
                    value={preferences.gender || 'any'}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, gender: event.target.value }))
                    }
                  >
                    <MenuItem value="any">모두</MenuItem>
                    <MenuItem value="male">남성</MenuItem>
                    <MenuItem value="female">여성</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="관심사"
                  value={interestInput}
                  onChange={(event) => setInterestInput(event.target.value)}
                  helperText="쉼표로 구분해줘."
                />
              </Stack>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button startIcon={<RefreshIcon />} onClick={loadRecommendations} disabled={loading}>
                  추천 새로고침
                </Button>
                <Button variant="contained" onClick={handleSavePreferences} disabled={loading}>
                  조건 저장
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          {recommendations.map((profile) => (
            <Card key={profile.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <Avatar src={profile.profileImage || profile.imageUrl} sx={{ width: 64, height: 64 }}>
                    {profile.username?.[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {profile.username}
                      </Typography>
                      <Chip color="primary" label={`${Math.round(profile.compatibilityScore || 0)}점`} />
                      {profile.distance !== undefined && (
                        <Chip variant="outlined" label={`${profile.distance.toFixed(1)}km`} />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {[profile.age && `${profile.age}세`, profile.gender].filter(Boolean).join(' · ')}
                    </Typography>
                    {profile.bio && <Typography sx={{ mt: 1 }}>{profile.bio}</Typography>}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {(profile.sharedInterests?.length ? profile.sharedInterests : profile.interests || []).map(
                        (interest) => (
                          <Chip key={interest} size="small" label={interest} />
                        )
                      )}
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddAltIcon />}
                    disabled={requesting[profile.id]}
                    onClick={() => handleRequestMatch(profile)}
                  >
                    매칭 요청
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!loading && recommendations.length === 0 && (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="text.secondary">
                  아직 추천 후보가 없어. 프로필 관심사를 채우고 조건을 조금 넓혀봐.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Stack>

      <Dialog open={Boolean(pendingMatchOffer) && !activeMatchRoomInfo} onClose={() => dispatch(clearPendingMatchOffer())}>
        <DialogTitle>매칭 요청</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            {pendingMatchOffer?.username}님과 매칭할까?
          </Typography>
          {matchStatusMessage && (
            <Typography variant="body2" color="text.secondary">
              {matchStatusMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectMatch}>거절</Button>
          <Button variant="contained" onClick={handleAcceptMatch}>
            수락
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(activeMatchRoomInfo)} onClose={() => dispatch(clearActiveMatchRoomInfo())}>
        <DialogTitle>매칭 성공</DialogTitle>
        <DialogContent>
          <Typography>{activeMatchRoomInfo?.message || '채팅방이 만들어졌어.'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatch(clearActiveMatchRoomInfo())}>닫기</Button>
          <Button variant="contained" onClick={() => navigate(`/chat/${activeMatchRoomInfo?.id}`)}>
            채팅으로 이동
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Matching;
