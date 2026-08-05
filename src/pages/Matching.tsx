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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
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
import { useI18n } from '../i18n/I18nProvider';
import { serverErrorMessage } from '../services/apiError';

const Matching: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { locale, t, formatNumber } = useI18n();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { pendingMatchOffer, activeMatchRoomInfo, matchStatusMessage } = useSelector(
    (state: RootState) => state.notifications
  );
  const [recommendations, setRecommendations] = useState<MatchProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MatchProfile[]>([]);
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

  const apiError = (err: unknown, korean: string, english: string) => (
    (locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(korean, english)
  );

  const genderLabel = (gender?: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return t('남성', 'Man');
      case 'female': return t('여성', 'Woman');
      case 'non_binary':
      case 'non-binary': return t('논바이너리', 'Non-binary');
      default: return gender || '';
    }
  };

  useEffect(() => {
    setPreferences((prev) => ({
      ...prev,
      interests: currentUser?.interests || prev.interests,
    }));
    setInterestInput((currentUser?.interests || []).join(', '));
  }, [currentUser]);

  useEffect(() => {
    loadRecommendations();
    loadIncomingRequests();
  }, []);

  useEffect(() => {
    if (activeMatchRoomInfo?.id) {
      dispatch(
        addNotification({
          type: 'success',
          message: locale === 'ko' && matchStatusMessage
            ? matchStatusMessage
            : t('매칭이 성사되어 채팅방이 만들어졌습니다.', 'It’s a match. Your chat room is ready.'),
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
      setError(t(
        '추천 이웃을 불러오지 못했습니다. 프로필과 위치 정보를 확인해 주세요.',
        'Recommendations could not be loaded. Check your profile and location details.',
      ));
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRequests = async () => {
    try {
      const result = await matchingService.getIncomingRequests();
      setIncomingRequests(result);
    } catch {
      setError(t('받은 매칭 요청을 불러오지 못했습니다.', 'Incoming match requests could not be loaded.'));
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      await matchingService.saveMatchingPreferences(buildPreferences());
      await loadRecommendations();
      setSuccess(t('매칭 조건을 저장하고 추천을 새로고침했습니다.', 'Your matching preferences were saved and recommendations refreshed.'));
    } catch (err) {
      setError(apiError(err, '매칭 조건을 저장하지 못했습니다.', 'Matching preferences could not be saved.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMatch = async (profile: MatchProfile) => {
    setRequesting((prev) => ({ ...prev, [profile.id]: true }));
    setError(null);

    try {
      await matchingService.requestMatch(profile.id);
      setSuccess(t(
        `${profile.username}님에게 매칭 요청을 보냈습니다.`,
        `A match request was sent to ${profile.username}.`,
      ));
    } catch (err) {
      setError(apiError(err, '매칭 요청을 보내지 못했습니다.', 'The match request could not be sent.'));
    } finally {
      setRequesting((prev) => ({ ...prev, [profile.id]: false }));
    }
  };

  const handleFeedback = async (profile: MatchProfile, sentiment: 'POSITIVE' | 'NEGATIVE') => {
    try {
      await matchingService.sendRecommendationFeedback(profile.id, sentiment);
      if (sentiment === 'NEGATIVE') {
        setRecommendations((items) => items.filter((item) => item.id !== profile.id));
      }
      setSuccess(sentiment === 'POSITIVE'
        ? t('선호도에 반영했습니다.', 'Your feedback has been saved.')
        : t('다음 추천에 반영하겠습니다.', 'We’ll use this to improve your next recommendations.'));
    } catch {
      setError(t('추천 피드백을 저장하지 못했습니다.', 'Recommendation feedback could not be saved.'));
    }
  };

  const handleAcceptMatch = async () => {
    if (!pendingMatchOffer?.matchId) return;

    try {
      const chatRoom = await matchingService.acceptMatch(pendingMatchOffer.matchId);
      if (chatRoom?.id) {
        dispatch(clearPendingMatchOffer());
        navigate(`/chat/${chatRoom.id}`);
        return;
      }
      dispatch(setMatchStatusMessage(t(
        '매칭 요청을 수락했습니다. 상대방의 응답을 기다리고 있습니다.',
        'Match request accepted. Waiting for the other person to respond.',
      )));
    } catch (err) {
      setError(apiError(err, '매칭 요청을 수락하지 못했습니다.', 'The match request could not be accepted.'));
    }
  };

  const handleRejectMatch = async () => {
    if (!pendingMatchOffer?.matchId) return;

    try {
      await matchingService.rejectMatch(pendingMatchOffer.matchId);
      dispatch(clearPendingMatchOffer());
      dispatch(setMatchStatusMessage(null));
    } catch (err) {
      setError(apiError(err, '매칭 요청을 거절하지 못했습니다.', 'The match request could not be declined.'));
    }
  };

  const handleAcceptIncoming = async (request: MatchProfile) => {
    if (!request.matchId) return;
    const requestKey = `incoming-${request.matchId}`;
    setRequesting((prev) => ({ ...prev, [requestKey]: true }));
    setError(null);

    try {
      const chatRoom = await matchingService.acceptMatch(request.matchId);
      setIncomingRequests((prev) => prev.filter((item) => item.matchId !== request.matchId));
      if (chatRoom?.id) {
        navigate(`/chat/${chatRoom.id}`);
      } else {
        setSuccess(t(
          '매칭 요청을 수락했습니다. 상대방의 응답을 기다리고 있습니다.',
          'Match request accepted. Waiting for the other person to respond.',
        ));
      }
    } catch (err) {
      setError(apiError(err, '매칭 요청을 수락하지 못했습니다.', 'The match request could not be accepted.'));
    } finally {
      setRequesting((prev) => ({ ...prev, [requestKey]: false }));
    }
  };

  const handleRejectIncoming = async (request: MatchProfile) => {
    if (!request.matchId) return;
    const requestKey = `incoming-${request.matchId}`;
    setRequesting((prev) => ({ ...prev, [requestKey]: true }));
    setError(null);

    try {
      await matchingService.rejectMatch(request.matchId);
      setIncomingRequests((prev) => prev.filter((item) => item.matchId !== request.matchId));
    } catch (err) {
      setError(apiError(err, '매칭 요청을 거절하지 못했습니다.', 'The match request could not be declined.'));
    } finally {
      setRequesting((prev) => ({ ...prev, [requestKey]: false }));
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
            {t('이웃 추천', 'Neighbor matches')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {t(
              '관심사, 거리, 나이 조건을 바탕으로 잘 맞는 이웃을 추천해 드립니다.',
              'Discover neighbors who match your interests, distance, and age preferences.',
            )}
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        {!currentUser?.latitude || !currentUser?.longitude ? (
          <Alert
            severity="warning"
            action={<Button onClick={() => navigate('/profile')}>{t('프로필 설정', 'Set up profile')}</Button>}
          >
            {t(
              '거리 기반 추천을 사용하려면 프로필에 동네 위치를 저장해 주세요.',
              'Add your neighborhood to your profile to use distance-based recommendations.',
            )}
          </Alert>
        ) : null}

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={850}>{t('추천 조건', 'Match preferences')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('조건을 조정하면 추천 결과에 바로 반영됩니다.', 'Adjust these preferences to refine your recommendations.')}
                </Typography>
              </Box>
              <Box>
                <Typography gutterBottom>{t(
                  `최대 거리: ${formatNumber(preferences.maxDistance)}km`,
                  `Maximum distance: ${formatNumber(preferences.maxDistance)} km`,
                )}</Typography>
                <Slider
                  min={1}
                  max={50}
                  value={preferences.maxDistance}
                  valueLabelDisplay="auto"
                  aria-label={t('최대 거리', 'Maximum distance')}
                  onChange={(_, value) =>
                    setPreferences((prev) => ({ ...prev, maxDistance: value as number }))
                  }
                />
              </Box>
              <Box>
                <Typography gutterBottom>
                  {t(
                    `나이 범위: ${formatNumber(preferences.ageRange[0])}세–${formatNumber(preferences.ageRange[1])}세`,
                    `Age range: ${formatNumber(preferences.ageRange[0])}–${formatNumber(preferences.ageRange[1])}`,
                  )}
                </Typography>
                <Slider
                  min={18}
                  max={80}
                  value={preferences.ageRange}
                  valueLabelDisplay="auto"
                  aria-label={t('나이 범위', 'Age range')}
                  onChange={(_, value) =>
                    setPreferences((prev) => ({ ...prev, ageRange: value as [number, number] }))
                  }
                />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>{t('성별', 'Gender')}</InputLabel>
                  <Select
                    label={t('성별', 'Gender')}
                    value={preferences.gender || 'any'}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, gender: event.target.value }))
                    }
                  >
                    <MenuItem value="any">{t('모두', 'Any')}</MenuItem>
                    <MenuItem value="male">{t('남성', 'Man')}</MenuItem>
                    <MenuItem value="female">{t('여성', 'Woman')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label={t('관심사', 'Interests')}
                  value={interestInput}
                  onChange={(event) => setInterestInput(event.target.value)}
                  helperText={t('여러 관심사는 쉼표로 구분해 주세요.', 'Separate multiple interests with commas.')}
                />
              </Stack>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button startIcon={<RefreshIcon />} onClick={loadRecommendations} disabled={loading}>
                  {t('추천 새로고침', 'Refresh matches')}
                </Button>
                <Button variant="contained" onClick={handleSavePreferences} disabled={loading}>
                  {t('조건 저장', 'Save preferences')}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {incomingRequests.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t('받은 매칭 요청', 'Incoming match requests')}
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {incomingRequests.map((request) => {
                const requestKey = `incoming-${request.matchId}`;
                return (
                  <Card key={request.matchId} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ sm: 'center' }}
                      >
                        <Avatar src={request.profileImage || request.imageUrl} sx={{ width: 56, height: 56 }}>
                          {request.username?.[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {request.username}
                            </Typography>
                            <Chip
                              size="small"
                              color="primary"
                              label={t(
                                `궁합 ${formatNumber(Math.round(request.compatibilityScore || 0))}점`,
                                `${formatNumber(Math.round(request.compatibilityScore || 0))}% match`,
                              )}
                            />
                          </Stack>
                          {request.bio && <Typography sx={{ mt: 0.75 }}>{request.bio}</Typography>}
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {(request.sharedInterests || []).map((interest) => (
                              <Chip key={interest} size="small" label={interest} />
                            ))}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            startIcon={<CloseIcon />}
                            disabled={requesting[requestKey]}
                            onClick={() => handleRejectIncoming(request)}
                          >
                            {t('거절', 'Decline')}
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            disabled={requesting[requestKey]}
                            onClick={() => handleAcceptIncoming(request)}
                          >
                            {t('수락하고 채팅하기', 'Accept and chat')}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        )}

        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={850}>{t('추천 이웃', 'Recommended neighbors')}</Typography>
            {!loading && recommendations.length > 0 && (
              <Chip size="small" variant="outlined" label={t(
                `${formatNumber(recommendations.length)}명`,
                `${formatNumber(recommendations.length)} ${recommendations.length === 1 ? 'person' : 'people'}`,
              )} />
            )}
          </Stack>
          {recommendations.map((profile) => (
            <Card key={profile.id} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <Avatar src={profile.profileImage || profile.imageUrl} sx={{ width: 64, height: 64 }}>
                    {profile.username?.[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {profile.username}
                      </Typography>
                      <Chip color="primary" label={t(
                        `${formatNumber(Math.round(profile.compatibilityScore || 0))}점`,
                        `${formatNumber(Math.round(profile.compatibilityScore || 0))}% match`,
                      )} />
                      {profile.distance !== undefined && (
                        <Chip variant="outlined" label={t(
                          `${profile.distance.toFixed(1)}km`,
                          `${profile.distance.toFixed(1)} km away`,
                        )} />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {[profile.age && t(`${formatNumber(profile.age)}세`, `${formatNumber(profile.age)} years old`), genderLabel(profile.gender)].filter(Boolean).join(' · ')}
                    </Typography>
                    {profile.bio && <Typography sx={{ mt: 1 }}>{profile.bio}</Typography>}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {(profile.sharedInterests?.length ? profile.sharedInterests : profile.interests || []).map(
                        (interest) => (
                          <Chip key={interest} size="small" label={interest} />
                        )
                      )}
                    </Stack>
                    {(profile.explanationReasons || []).length > 0 && (
                      <Alert severity="info" icon={false} sx={{ mt: 1.5, py: 0.5 }}>
                        {t('추천한 이유', 'Why this match')} · {profile.explanationReasons?.join(' · ')}
                      </Alert>
                    )}
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      <Button size="small" startIcon={<ThumbUpAltOutlinedIcon />} onClick={() => handleFeedback(profile, 'POSITIVE')}>{t('잘 맞아요', 'Good match')}</Button>
                      <Button size="small" color="inherit" startIcon={<ThumbDownAltOutlinedIcon />} onClick={() => handleFeedback(profile, 'NEGATIVE')}>{t('다른 추천', 'Show another')}</Button>
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddAltIcon />}
                    disabled={requesting[profile.id]}
                    onClick={() => handleRequestMatch(profile)}
                  >
                    {t('매칭 요청', 'Send match request')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}

          {!loading && recommendations.length === 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800}>
                  {t('현재 조건에 맞는 추천 이웃이 없습니다.', 'No neighbors match your current preferences.')}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {t(
                    '프로필에 관심사를 추가하거나 거리와 나이 범위를 넓혀 보세요.',
                    'Add interests to your profile or broaden the distance and age range.',
                  )}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Stack>

      <Dialog open={Boolean(pendingMatchOffer) && !activeMatchRoomInfo} onClose={() => dispatch(clearPendingMatchOffer())}>
        <DialogTitle>{t('매칭 요청', 'Match request')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            {t(
              `${pendingMatchOffer?.username ?? ''}님과 매칭하시겠어요?`,
              `Accept the match request from ${pendingMatchOffer?.username ?? 'this neighbor'}?`,
            )}
          </Typography>
          {matchStatusMessage && (
            <Typography variant="body2" color="text.secondary">
              {locale === 'ko'
                ? matchStatusMessage
                : t('매칭 요청 상태가 업데이트되었습니다.', 'Your match request status has been updated.')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectMatch}>{t('거절', 'Decline')}</Button>
          <Button variant="contained" onClick={handleAcceptMatch}>
            {t('수락', 'Accept')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(activeMatchRoomInfo)} onClose={() => dispatch(clearActiveMatchRoomInfo())}>
        <DialogTitle>{t('매칭되었습니다', 'It’s a match')}</DialogTitle>
        <DialogContent>
          <Typography>{locale === 'ko' && activeMatchRoomInfo?.message
            ? activeMatchRoomInfo.message
            : t('채팅방이 만들어졌습니다.', 'Your chat room is ready.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatch(clearActiveMatchRoomInfo())}>{t('닫기', 'Close')}</Button>
          <Button variant="contained" onClick={() => navigate(`/chat/${activeMatchRoomInfo?.id}`)}>
            {t('채팅으로 이동', 'Open chat')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Matching;
