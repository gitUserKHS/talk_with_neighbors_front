import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SearchIcon from '@mui/icons-material/Search';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { meetupService } from '../services/meetupService';
import { CreateHobbyMeetupRequest, HobbyMeetup } from '../types/meetup';
import { RootState } from '../store/types';
import MapLocationPicker from '../components/MapLocationPicker';
import { formatMeetupDateTime } from '../services/meetupDateTime';
import {
  AccessScope,
  AccessScopedList,
  accessScopeForUser,
  apiAccessForScope,
  isLatestRequest,
  updateScopedItems,
  visibleScopedItems,
} from '../services/accessScope';

const EMPTY_FORM: CreateHobbyMeetupRequest = {
  title: '',
  description: '',
  interestTags: [],
  location: '',
  maxParticipants: 6,
  durationMinutes: 120,
  scheduledAt: '',
  registrationDeadline: '',
};

const toTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 5);

const MeetupCard: React.FC<{
  meetup: HobbyMeetup;
  busy: boolean;
  isGuest: boolean;
  onJoin: (meetup: HobbyMeetup) => void;
  onOpen: (roomId: string) => void;
  onRequireLogin: () => void;
}> = ({ meetup, busy, isGuest, onJoin, onOpen, onRequireLogin }) => (
  <Card variant="outlined" sx={{ borderRadius: 2 }}>
    <CardContent>
      <Stack spacing={1.75}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {meetup.title}
              </Typography>
              {meetup.demo && (
                <Chip
                  color="secondary"
                  variant="outlined"
                  size="small"
                  icon={<AutoAwesomeRoundedIcon />}
                  label="포트폴리오 데모"
                />
              )}
              {meetup.sharedInterests.length > 0 && (
                <Chip
                  color="primary"
                  size="small"
                  label={`함께 좋아해요 ${meetup.sharedInterests.length}`}
                />
              )}
              {!isGuest && meetup.joined && <Chip color="success" size="small" label="참여 중" />}
              {!isGuest && meetup.waitlisted && <Chip color="warning" size="small" label={`대기 중 · ${meetup.waitlistCount}명`} />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {meetup.demo
                ? '실제 이용자 정보가 없는 기능 예시'
                : meetup.creatorUsername
                  ? `${meetup.creatorUsername}님이 만들었어`
                  : '이웃이 만든 모임'}
            </Typography>
          </Box>
          <Button
            variant={isGuest || meetup.joined || meetup.demo ? 'outlined' : 'contained'}
            color={meetup.joined ? 'inherit' : 'primary'}
            startIcon={meetup.demo ? <AutoAwesomeRoundedIcon /> : meetup.joined ? <ForumOutlinedIcon /> : <HowToRegOutlinedIcon />}
            disabled={busy || meetup.demo || (!isGuest && meetup.waitlisted)}
            onClick={() => (
              isGuest
                ? onRequireLogin()
                : meetup.joined
                  ? onOpen(meetup.roomId)
                  : onJoin(meetup)
            )}
            sx={{ flexShrink: 0 }}
          >
            {meetup.demo
              ? '보기 전용 화면 예시'
              : isGuest
                ? '로그인하고 참여'
              : meetup.joined
                ? '채팅 열기'
                : meetup.waitlisted
                  ? '대기 등록됨'
                  : meetup.full
                    ? '대기 등록'
                    : '참여하기'}
          </Button>
        </Stack>

        {meetup.description && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{meetup.description}</Typography>}

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {meetup.interestTags.map((tag) => (
            <Chip key={tag} size="small" label={tag} variant="outlined" />
          ))}
        </Stack>

        <Divider />
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap color="text.secondary">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PeopleOutlineIcon fontSize="small" />
            <Typography variant="body2">
              {meetup.participantCount}/{meetup.maxParticipants ?? '-'}명
            </Typography>
          </Stack>
          {(meetup.location || meetup.locationAddress) && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOnOutlinedIcon fontSize="small" />
              <Box>
                <Typography variant="body2">{meetup.location || meetup.locationAddress}</Typography>
                {meetup.location && meetup.locationAddress && (
                  <Typography variant="caption" display="block">{meetup.locationAddress}</Typography>
                )}
                {meetup.latitude !== undefined && meetup.longitude !== undefined && (
                  <Typography
                    component="a"
                    variant="caption"
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(meetup.location || '모임 장소')},${meetup.latitude},${meetup.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                  >
                    카카오맵에서 보기
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
          {meetup.scheduledAt && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EventOutlinedIcon fontSize="small" />
              <Typography variant="body2">{formatMeetupDateTime(meetup.scheduledAt)}</Typography>
            </Stack>
          )}
        </Stack>
        {meetup.demo && (
          <Typography variant="caption" color="text.secondary">
            인원과 일정은 화면 구성을 보여주는 예시이며 실제 모집 정보가 아니야.
          </Typography>
        )}
      </Stack>
    </CardContent>
  </Card>
);

const MeetupsContent: React.FC<{ currentUser: RootState['auth']['user'] }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const isGuest = !currentUser;
  const accessScope = accessScopeForUser(currentUser?.id);
  const [meetupSnapshot, setMeetupSnapshot] = useState<AccessScopedList<HobbyMeetup>>({
    scope: null,
    items: [],
  });
  const meetups = visibleScopedItems(meetupSnapshot, accessScope);
  const [keyword, setKeyword] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionRoomId, setActionRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState<CreateHobbyMeetupRequest>(EMPTY_FORM);
  const meetupRequestGeneration = useRef(0);
  const viewGeneration = useRef(0);

  const setMeetups = (update: React.SetStateAction<HobbyMeetup[]>) => {
    setMeetupSnapshot((snapshot) => updateScopedItems(snapshot, accessScope, update));
  };

  const interests = useMemo(
    () => Array.from(new Set((currentUser?.interests ?? []).map((interest) => interest.trim()).filter(Boolean))),
    [currentUser?.interests]
  );
  const hasDemoMeetups = meetups.some((meetup) => meetup.demo);

  const loadMeetups = async (
    nextKeyword = keyword,
    nextInterest = selectedInterest,
    requestScope: AccessScope = accessScope,
  ) => {
    const requestId = ++meetupRequestGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const page = await meetupService.getMeetups(
        {
          keyword: nextKeyword.trim() || undefined,
          interest: nextInterest || undefined,
          page: 0,
          size: 30,
        },
        apiAccessForScope(requestScope),
      );
      if (!isLatestRequest(requestId, meetupRequestGeneration.current)) return;
      setMeetupSnapshot({ scope: requestScope, items: page.content });
    } catch (err: any) {
      if (!isLatestRequest(requestId, meetupRequestGeneration.current)) return;
      setError(err.response?.data?.message || '취미 모임을 불러오지 못했어.');
    } finally {
      if (isLatestRequest(requestId, meetupRequestGeneration.current)) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const generation = ++viewGeneration.current;
    ++meetupRequestGeneration.current;
    setMeetupSnapshot({ scope: null, items: [] });
    setKeyword('');
    setSelectedInterest('');
    setActionRoomId(null);
    setError(null);
    setCreateOpen(false);
    setCreating(false);
    setTagInput('');
    setForm({ ...EMPTY_FORM });
    void loadMeetups('', '', accessScope);

    return () => {
      if (viewGeneration.current === generation) {
        ++viewGeneration.current;
      }
      ++meetupRequestGeneration.current;
    };
  }, [accessScope]);

  const handleInterest = (interest: string) => {
    setSelectedInterest(interest);
    void loadMeetups(keyword, interest);
  };

  const openCreate = () => {
    if (isGuest) {
      navigate('/login', { state: { from: { pathname: '/meetups' } } });
      return;
    }

    setError(null);
    setTagInput((currentUser?.interests ?? []).slice(0, 3).join(', '));
    setForm({ ...EMPTY_FORM });
    setCreateOpen(true);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isGuest) return;
    const generation = viewGeneration.current;

    const interestTags = toTags(tagInput);
    if (!form.title.trim() || interestTags.length === 0) {
      setError('모임 이름과 관심사 태그를 입력해줘.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const meetup = await meetupService.createMeetup({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        location: form.location?.trim() || undefined,
        locationAddress: form.locationAddress?.trim() || undefined,
        kakaoPlaceId: form.kakaoPlaceId?.trim() || undefined,
        scheduledAt: form.scheduledAt || undefined,
        registrationDeadline: form.registrationDeadline || undefined,
        interestTags,
      });
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setCreateOpen(false);
      navigate(`/chat/${meetup.roomId}`);
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(err.response?.data?.message || '모임을 만들지 못했어.');
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setCreating(false);
      }
    }
  };

  const handleJoin = async (meetup: HobbyMeetup) => {
    if (isGuest) {
      navigate('/login', { state: { from: { pathname: '/meetups' } } });
      return;
    }
    const generation = viewGeneration.current;

    setActionRoomId(meetup.roomId);
    setError(null);
    try {
      const joinedMeetup = await meetupService.joinMeetup(meetup.roomId);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setMeetups((items) => items.map((item) => (item.roomId === joinedMeetup.roomId ? joinedMeetup : item)));
      if (joinedMeetup.joined) {
        navigate(`/chat/${joinedMeetup.roomId}`);
      }
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(err.response?.data?.message || '모임에 참여하지 못했어.');
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setActionRoomId(null);
      }
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              취미 모임
            </Typography>
            <Typography color="text.secondary">같은 관심사 이웃과 가볍게 이야기를 시작해.</Typography>
          </Box>
          <Button variant={isGuest ? 'outlined' : 'contained'} startIcon={<AddIcon />} onClick={openCreate}>
            {isGuest ? '로그인하고 모임 만들기' : '모임 만들기'}
          </Button>
        </Box>

        {isGuest && (
          <Alert
            severity="info"
            action={(
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/login', { state: { from: { pathname: '/meetups' } } })}
              >
                로그인하기
              </Button>
            )}
          >
            공개 모임은 검색하고 둘러볼 수 있어. 생성, 참여, 채팅은 로그인 후 이용해줘.
          </Alert>
        )}

        {hasDemoMeetups && (
          <Alert
            severity="success"
            icon={<AutoAwesomeRoundedIcon />}
            sx={{ '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
              포트폴리오 데모 모임
            </Typography>
            <Typography variant="body2">
              실제 이용자나 실제 모집이 아닌, 모임 탐색 경험을 보여주기 위한 개인정보 없는 예시야.
            </Typography>
          </Alert>
        )}

        <TextField
          fullWidth
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              loadMeetups();
            }
          }}
          placeholder="모임 이름, 소개, 관심사 검색"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="검색">
                  <IconButton aria-label="모임 검색" onClick={() => loadMeetups()}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />

        {interests.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="전체"
              color={selectedInterest ? 'default' : 'primary'}
              variant={selectedInterest ? 'outlined' : 'filled'}
              onClick={() => handleInterest('')}
            />
            {interests.map((interest) => (
              <Chip
                key={interest}
                label={interest}
                color={selectedInterest === interest ? 'primary' : 'default'}
                variant={selectedInterest === interest ? 'filled' : 'outlined'}
                onClick={() => handleInterest(interest)}
              />
            ))}
          </Stack>
        )}

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {loading && (
          <Box role="status" aria-live="polite" aria-label="모임 불러오는 중" sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && meetups.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 36, mb: 1 }} />
            <Typography>
              {isGuest
                ? '아직 조건에 맞는 공개 모임이 없어.'
                : '아직 조건에 맞는 모임이 없어. 첫 모임을 열어볼까?'}
            </Typography>
          </Box>
        )}

        <Stack spacing={2}>
          {meetups.map((meetup) => (
            <MeetupCard
              key={meetup.roomId}
              meetup={meetup}
              busy={actionRoomId === meetup.roomId}
              isGuest={isGuest}
              onJoin={handleJoin}
              onOpen={(roomId) => navigate(`/chat/${roomId}`)}
              onRequireLogin={() => navigate('/login', { state: { from: { pathname: '/meetups' } } })}
            />
          ))}
        </Stack>
      </Stack>

      {!isGuest && <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>취미 모임 만들기</DialogTitle>
          <DialogContent>
            <Stack spacing={2.25} sx={{ pt: 1 }}>
              <TextField
                label="모임 이름"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                inputProps={{ maxLength: 80 }}
                autoFocus
                required
                fullWidth
              />
              <TextField
                label="모임 소개"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                inputProps={{ maxLength: 500 }}
                minRows={3}
                multiline
                fullWidth
              />
              <TextField
                label="관심사 태그"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                helperText="쉼표로 나눠서 최대 5개까지 입력해줘."
                required
                fullWidth
              />
              <MapLocationPicker
                value={form.location || form.locationAddress ? {
                  placeName: form.location ?? '',
                  address: form.locationAddress,
                  latitude: form.latitude,
                  longitude: form.longitude,
                  kakaoPlaceId: form.kakaoPlaceId,
                } : null}
                onChange={(selection) => setForm((current) => ({
                  ...current,
                  location: selection?.placeName ?? '',
                  locationAddress: selection?.address,
                  latitude: selection?.latitude,
                  longitude: selection?.longitude,
                  kakaoPlaceId: selection?.kakaoPlaceId,
                }))}
                disabled={creating}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="모집 인원"
                  type="number"
                  value={form.maxParticipants}
                  onChange={(event) => setForm((current) => ({ ...current, maxParticipants: Number(event.target.value) }))}
                  inputProps={{ min: 2, max: 50 }}
                  sx={{ width: { sm: 160 } }}
                  required
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="모임 일정"
                  type="datetime-local"
                  value={form.scheduledAt || ''}
                  onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="예상 시간(분)"
                  type="number"
                  value={form.durationMinutes || 120}
                  onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                  inputProps={{ min: 30, max: 1440, step: 30 }}
                  sx={{ width: { sm: 180 } }}
                />
              </Stack>
              <TextField
                label="신청 마감"
                type="datetime-local"
                value={form.registrationDeadline || ''}
                onChange={(event) => setForm((current) => ({ ...current, registrationDeadline: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText="비워두면 모임 시작 전까지 신청할 수 있어."
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} disabled={creating}>취소</Button>
            <Button type="submit" variant="contained" disabled={creating}>
              {creating ? '만드는 중' : '모임 만들기'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>}
    </Container>
  );
};

const Meetups: React.FC = () => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessScope = accessScopeForUser(currentUser?.id);
  return <MeetupsContent key={accessScope} currentUser={currentUser} />;
};

export default Meetups;
