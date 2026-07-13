import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { meetupService } from '../services/meetupService';
import { CreateHobbyMeetupRequest, HobbyMeetup } from '../types/meetup';
import { RootState } from '../store/types';

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
  onJoin: (meetup: HobbyMeetup) => void;
  onOpen: (roomId: string) => void;
}> = ({ meetup, busy, onJoin, onOpen }) => (
  <Card variant="outlined" sx={{ borderRadius: 2 }}>
    <CardContent>
      <Stack spacing={1.75}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {meetup.title}
              </Typography>
              {meetup.sharedInterests.length > 0 && (
                <Chip
                  color="primary"
                  size="small"
                  label={`함께 좋아해요 ${meetup.sharedInterests.length}`}
                />
              )}
              {meetup.joined && <Chip color="success" size="small" label="참여 중" />}
              {meetup.waitlisted && <Chip color="warning" size="small" label={`대기 중 · ${meetup.waitlistCount}명`} />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {meetup.creatorUsername ? `${meetup.creatorUsername}님이 만들었어` : '이웃이 만든 모임'}
            </Typography>
          </Box>
          <Button
            variant={meetup.joined ? 'outlined' : 'contained'}
            color={meetup.joined ? 'inherit' : 'primary'}
            startIcon={meetup.joined ? <ForumOutlinedIcon /> : <HowToRegOutlinedIcon />}
            disabled={busy || meetup.waitlisted}
            onClick={() => (meetup.joined ? onOpen(meetup.roomId) : onJoin(meetup))}
            sx={{ flexShrink: 0 }}
          >
            {meetup.joined ? '채팅 열기' : meetup.waitlisted ? '대기 등록됨' : meetup.full ? '대기 등록' : '참여하기'}
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
          {meetup.location && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOnOutlinedIcon fontSize="small" />
              <Typography variant="body2">{meetup.location}</Typography>
            </Stack>
          )}
          {meetup.scheduledAt && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EventOutlinedIcon fontSize="small" />
              <Typography variant="body2">{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meetup.scheduledAt))}</Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

const Meetups: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [meetups, setMeetups] = useState<HobbyMeetup[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionRoomId, setActionRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState<CreateHobbyMeetupRequest>(EMPTY_FORM);

  const interests = useMemo(
    () => Array.from(new Set((currentUser?.interests ?? []).map((interest) => interest.trim()).filter(Boolean))),
    [currentUser?.interests]
  );

  const loadMeetups = async (nextKeyword = keyword, nextInterest = selectedInterest) => {
    setLoading(true);
    setError(null);
    try {
      const page = await meetupService.getMeetups({
        keyword: nextKeyword.trim() || undefined,
        interest: nextInterest || undefined,
        page: 0,
        size: 30,
      });
      setMeetups(page.content);
    } catch (err: any) {
      setError(err.response?.data?.message || '취미 모임을 불러오지 못했어.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetups('', '');
  }, []);

  const handleInterest = (interest: string) => {
    setSelectedInterest(interest);
    loadMeetups(keyword, interest);
  };

  const openCreate = () => {
    setError(null);
    setTagInput((currentUser?.interests ?? []).slice(0, 3).join(', '));
    setForm({ ...EMPTY_FORM, location: currentUser?.address || '' });
    setCreateOpen(true);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
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
        scheduledAt: form.scheduledAt || undefined,
        registrationDeadline: form.registrationDeadline || undefined,
        interestTags,
      });
      setCreateOpen(false);
      navigate(`/chat/${meetup.roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '모임을 만들지 못했어.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (meetup: HobbyMeetup) => {
    setActionRoomId(meetup.roomId);
    setError(null);
    try {
      const joinedMeetup = await meetupService.joinMeetup(meetup.roomId);
      setMeetups((items) => items.map((item) => (item.roomId === joinedMeetup.roomId ? joinedMeetup : item)));
      if (joinedMeetup.joined) {
        navigate(`/chat/${joinedMeetup.roomId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '모임에 참여하지 못했어.');
    } finally {
      setActionRoomId(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              취미 모임
            </Typography>
            <Typography color="text.secondary">같은 관심사 이웃과 가볍게 이야기를 시작해.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            모임 만들기
          </Button>
        </Box>

        <TextField
          fullWidth
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              loadMeetups();
            }
          }}
          placeholder="모임 이름, 관심사, 장소 검색"
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
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && meetups.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 36, mb: 1 }} />
            <Typography>아직 조건에 맞는 모임이 없어. 첫 모임을 열어볼까?</Typography>
          </Box>
        )}

        <Stack spacing={2}>
          {meetups.map((meetup) => (
            <MeetupCard
              key={meetup.roomId}
              meetup={meetup}
              busy={actionRoomId === meetup.roomId}
              onJoin={handleJoin}
              onOpen={(roomId) => navigate(`/chat/${roomId}`)}
            />
          ))}
        </Stack>
      </Stack>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} fullWidth maxWidth="sm">
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="장소"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  inputProps={{ maxLength: 100 }}
                  fullWidth
                />
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
      </Dialog>
    </Container>
  );
};

export default Meetups;
