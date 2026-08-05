import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
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
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { meetupService } from '../services/meetupService';
import { CreateHobbyMeetupRequest, HobbyMeetup } from '../types/meetup';
import { RootState } from '../store/types';
import MapLocationPicker from '../components/MapLocationPicker';
import {
  AccessScope,
  AccessScopedList,
  accessScopeForUser,
  apiAccessForScope,
  isLatestRequest,
  updateScopedItems,
  visibleScopedItems,
} from '../services/accessScope';
import { removeMeetup, replaceMeetup } from '../services/contentMutationState';
import { useI18n } from '../i18n/I18nProvider';
import { serverErrorMessage } from '../services/apiError';

const EMPTY_FORM: CreateHobbyMeetupRequest = {
  title: '',
  description: '',
  interestTags: [],
  location: '',
  maxParticipants: 6,
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
  onEdit: (meetup: HobbyMeetup) => void;
  onDelete: (meetup: HobbyMeetup) => void;
  onParticipants: (meetup: HobbyMeetup) => void;
}> = ({ meetup, busy, isGuest, onJoin, onOpen, onRequireLogin, onEdit, onDelete, onParticipants }) => {
  const { t, formatNumber } = useI18n();

  return (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {meetup.title}
              </Typography>
              {meetup.official && (
                <Chip
                  color="secondary"
                  size="small"
                  icon={<VerifiedRoundedIcon />}
                  label={t('이웃톡 공식', 'Official Neighbor Talk')}
                />
              )}
              {meetup.sharedInterests.length > 0 && (
                <Chip
                  color="primary"
                  size="small"
                  label={t(
                    `공통 관심사 ${formatNumber(meetup.sharedInterests.length)}개`,
                    `${formatNumber(meetup.sharedInterests.length)} shared ${meetup.sharedInterests.length === 1 ? 'interest' : 'interests'}`,
                  )}
                />
              )}
              {!isGuest && meetup.joined && <Chip color="success" size="small" label={t('참여 중', 'Joined')} />}
              {!isGuest && meetup.waitlisted && <Chip color="warning" size="small" label={t(
                `대기 중 · ${formatNumber(meetup.waitlistCount)}명`,
                `Waitlisted · ${formatNumber(meetup.waitlistCount)}`,
              )} />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {meetup.official
                ? t('이웃톡 운영팀이 준비한 공식 모임입니다.', 'An official meetup hosted by the Neighbor Talk team.')
                : meetup.creatorUsername
                  ? t(`${meetup.creatorUsername}님이 만든 모임입니다.`, `Hosted by ${meetup.creatorUsername}.`)
                  : t('이웃이 만든 모임입니다.', 'Hosted by a neighbor.')}
            </Typography>
          </Box>
          <Button
            variant={isGuest || meetup.joined ? 'outlined' : 'contained'}
            color={meetup.joined ? 'inherit' : 'primary'}
            startIcon={meetup.joined ? <ForumOutlinedIcon /> : <HowToRegOutlinedIcon />}
            disabled={busy || (!isGuest && meetup.waitlisted)}
            onClick={() => (
              isGuest
                ? onRequireLogin()
                : meetup.joined
                  ? onOpen(meetup.roomId)
                  : onJoin(meetup)
            )}
            sx={{ flexShrink: 0 }}
          >
            {isGuest
                ? t('로그인 후 참여', 'Sign in to join')
              : meetup.joined
                ? t('채팅 열기', 'Open chat')
                : meetup.waitlisted
                  ? t('대기 등록됨', 'Waitlisted')
                  : meetup.full
                    ? t('대기 등록', 'Join waitlist')
                    : t('참여하기', 'Join meetup')}
          </Button>
          {!isGuest && (meetup.canManage || meetup.ownedByCurrentUser) && (
            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
              <Tooltip title={t('모임 수정', 'Edit meetup')}>
                <span>
                  <IconButton aria-label={t('모임 수정', 'Edit meetup')} disabled={busy} onClick={() => onEdit(meetup)}>
                    <EditOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('모임 삭제', 'Delete meetup')}>
                <span>
                  <IconButton aria-label={t('모임 삭제', 'Delete meetup')} color="error" disabled={busy} onClick={() => onDelete(meetup)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        </Stack>

        {meetup.description && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{meetup.description}</Typography>}

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {meetup.interestTags.map((tag) => (
            <Chip key={tag} size="small" label={tag} variant="outlined" />
          ))}
        </Stack>

        <Divider />
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap color="text.secondary">
          {isGuest ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PeopleOutlineIcon fontSize="small" />
              <Typography variant="body2">{t(
                `${formatNumber(meetup.participantCount)}/${meetup.maxParticipants == null ? '-' : formatNumber(meetup.maxParticipants)}명`,
                `${formatNumber(meetup.participantCount)}/${meetup.maxParticipants == null ? '-' : formatNumber(meetup.maxParticipants)} people`,
              )}</Typography>
            </Stack>
          ) : (
            <Button
              size="small"
              color="inherit"
              startIcon={<PeopleOutlineIcon fontSize="small" />}
              disabled={busy}
              onClick={() => onParticipants(meetup)}
              sx={{ p: 0, minWidth: 0 }}
            >
              {t(
                `참여자 ${formatNumber(meetup.participantCount)}/${meetup.maxParticipants == null ? '-' : formatNumber(meetup.maxParticipants)}명`,
                `Participants ${formatNumber(meetup.participantCount)}/${meetup.maxParticipants == null ? '-' : formatNumber(meetup.maxParticipants)}`,
              )}
            </Button>
          )}
          {(meetup.location || meetup.areaLabel || meetup.locationAddress) && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOnOutlinedIcon fontSize="small" />
              <Box>
                <Typography variant="body2">{meetup.location || meetup.areaLabel || meetup.locationAddress}</Typography>
                {meetup.location && meetup.locationAddress && (
                  <Typography variant="caption" display="block">{meetup.locationAddress}</Typography>
                )}
                {meetup.latitude !== undefined && meetup.longitude !== undefined && (
                  <Typography
                    component="a"
                    variant="caption"
                    href={`https://map.kakao.com/link/map/${encodeURIComponent(meetup.location || meetup.areaLabel || t('모임 장소', 'Meetup location'))},${meetup.latitude},${meetup.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                  >
                    {t('카카오맵에서 보기', 'View on Kakao Map')}
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
  );
};

const MeetupsContent: React.FC<{ currentUser: RootState['auth']['user'] }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
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
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMeetup, setEditingMeetup] = useState<HobbyMeetup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HobbyMeetup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [participantMeetup, setParticipantMeetup] = useState<HobbyMeetup | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState<CreateHobbyMeetupRequest>(EMPTY_FORM);
  const meetupRequestGeneration = useRef(0);
  const viewGeneration = useRef(0);

  const apiError = (err: unknown, korean: string, english: string) => (
    (locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(korean, english)
  );

  const setMeetups = (update: React.SetStateAction<HobbyMeetup[]>) => {
    setMeetupSnapshot((snapshot) => updateScopedItems(snapshot, accessScope, update));
  };

  const interests = useMemo(() => Array.from(new Set([
    ...(currentUser?.interests ?? []),
    ...meetups.flatMap((meetup) => meetup.interestTags ?? []),
    selectedInterest,
  ].map((interest) => interest.trim()).filter(Boolean))), [currentUser?.interests, meetups, selectedInterest]);

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
    } catch (err) {
      if (!isLatestRequest(requestId, meetupRequestGeneration.current)) return;
      setError(apiError(
        err,
        '취미 모임을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        'Meetups could not be loaded. Please try again shortly.',
      ));
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
    setSuccess(null);
    setCreateOpen(false);
    setCreating(false);
    setEditingMeetup(null);
    setDeleteTarget(null);
    setDeleting(false);
    setParticipantMeetup(null);
    setParticipantsLoading(false);
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
    setEditingMeetup(null);
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
      setError(t(
        '모임 이름과 관심사 태그를 입력해 주세요.',
        'Enter a meetup name and at least one interest tag.',
      ));
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const request = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        location: form.location?.trim() || undefined,
        locationAddress: form.locationAddress?.trim() || undefined,
        kakaoPlaceId: form.kakaoPlaceId?.trim() || undefined,
        interestTags,
      };
      const meetup = editingMeetup
        ? await meetupService.updateMeetup(editingMeetup.roomId, request)
        : await meetupService.createMeetup(request);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setCreateOpen(false);
      if (editingMeetup) {
        setMeetups((items) => replaceMeetup(items, meetup));
        setEditingMeetup(null);
        setSuccess(t('모임 정보를 수정했습니다.', 'Meetup details have been updated.'));
      } else {
        navigate(`/chat/${meetup.roomId}`);
      }
    } catch (err) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(apiError(
        err,
        editingMeetup ? '모임을 수정하지 못했습니다.' : '모임을 만들지 못했습니다.',
        editingMeetup ? 'The meetup could not be updated.' : 'The meetup could not be created.',
      ));
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setCreating(false);
      }
    }
  };

  const openEdit = async (meetup: HobbyMeetup) => {
    if (isGuest || actionRoomId) return;
    setActionRoomId(meetup.roomId);
    setError(null);
    try {
      const detail = await meetupService.getMeetup(meetup.roomId);
      if (!(detail.canManage || detail.ownedByCurrentUser)) {
        setError(t(
          '모임장만 이 모임을 수정할 수 있습니다.',
          'Only the host can edit this meetup.',
        ));
        return;
      }
      setEditingMeetup(detail);
      setTagInput((detail.interestTags ?? []).join(', '));
      setForm({
        title: detail.title,
        description: detail.description ?? '',
        interestTags: detail.interestTags ?? [],
        location: detail.location ?? '',
        locationAddress: detail.locationAddress,
        latitude: detail.latitude,
        longitude: detail.longitude,
        kakaoPlaceId: detail.kakaoPlaceId,
        maxParticipants: detail.maxParticipants ?? Math.max(2, detail.participantCount),
      });
      setCreateOpen(true);
    } catch (err) {
      setError(apiError(
        err,
        '수정할 모임 정보를 불러오지 못했습니다.',
        'The meetup details could not be loaded for editing.',
      ));
    } finally {
      setActionRoomId(null);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget || deleting) return;
    const roomId = deleteTarget.roomId;
    setDeleting(true);
    setError(null);
    try {
      await meetupService.deleteMeetup(roomId);
      setMeetups((items) => removeMeetup(items, roomId));
      setDeleteTarget(null);
      setSuccess(t('모임과 채팅방을 삭제했습니다.', 'The meetup and its chat room have been deleted.'));
    } catch (err) {
      setError(apiError(err, '모임을 삭제하지 못했습니다.', 'The meetup could not be deleted.'));
    } finally {
      setDeleting(false);
    }
  };

  const openParticipants = async (meetup: HobbyMeetup) => {
    if (isGuest || participantsLoading) return;
    setParticipantMeetup({ ...meetup, participants: meetup.participants ?? [] });
    setParticipantsLoading(true);
    setError(null);
    try {
      const detail = await meetupService.getMeetup(meetup.roomId);
      setParticipantMeetup(detail);
    } catch (err) {
      setParticipantMeetup(null);
      setError(apiError(
        err,
        '참여자 목록을 불러오지 못했습니다.',
        'The participant list could not be loaded.',
      ));
    } finally {
      setParticipantsLoading(false);
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
    } catch (err) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(apiError(err, '모임에 참여하지 못했습니다.', 'You could not join this meetup.'));
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setActionRoomId(null);
      }
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>
              {t('모임', 'Meetups')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {t(
                '관심사가 비슷한 이웃을 만나 함께할 활동을 찾아보세요.',
                'Meet neighbors with similar interests and discover things to do together.',
              )}
            </Typography>
          </Box>
          <Button variant={isGuest ? 'outlined' : 'contained'} startIcon={<AddIcon />} onClick={openCreate}>
            {isGuest ? t('로그인 후 모임 만들기', 'Sign in to create') : t('모임 만들기', 'Create meetup')}
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
                {t('로그인', 'Sign in')}
              </Button>
            )}
          >
            {t(
              '공개 모임은 로그인 없이 둘러볼 수 있습니다. 모임 생성, 참여, 채팅은 로그인 후 이용해 주세요.',
              'You can browse public meetups without signing in. Sign in to create, join, or chat.',
            )}
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
          placeholder={t('모임 이름, 소개 또는 관심사 검색', 'Search by name, description, or interest')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('검색', 'Search')}>
                  <IconButton aria-label={t('모임 검색', 'Search meetups')} onClick={() => loadMeetups()}>
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
              label={t('전체', 'All')}
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
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        {loading && (
          <Box role="status" aria-live="polite" aria-label={t('모임 불러오는 중', 'Loading meetups')} sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && meetups.length === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <GroupsOutlinedIcon sx={{ fontSize: 42, mb: 1.25, color: 'text.secondary' }} />
            <Typography variant="h6" fontWeight={800}>
              {isGuest
                ? t('조건에 맞는 공개 모임이 없습니다.', 'No public meetups match these filters.')
                : t('조건에 맞는 모임이 없습니다.', 'No meetups match these filters.')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {t(
                '검색 조건을 바꾸거나 새로운 모임을 만들어 보세요.',
                'Try different filters or create a new meetup.',
              )}
            </Typography>
            </CardContent>
          </Card>
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
              onEdit={(item) => void openEdit(item)}
              onDelete={setDeleteTarget}
              onParticipants={(item) => void openParticipants(item)}
            />
          ))}
        </Stack>
      </Stack>

      {!isGuest && <Dialog
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            setEditingMeetup(null);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleCreate}>
           <DialogTitle>{editingMeetup ? t('모임 수정', 'Edit meetup') : t('새 모임 만들기', 'Create a meetup')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.25} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                 label={t('모임 이름', 'Meetup name')}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                inputProps={{ maxLength: 80 }}
                autoFocus
                required
                fullWidth
              />
              <TextField
                 label={t('모임 소개', 'Description')}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                inputProps={{ maxLength: 500 }}
                minRows={3}
                multiline
                fullWidth
              />
              <TextField
                 label={t('관심사 태그', 'Interest tags')}
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                 helperText={t('쉼표로 구분해 최대 5개까지 입력해 주세요.', 'Enter up to 5 tags, separated by commas.')}
                required
                fullWidth
              />
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>
                   {t('활동 지역 또는 대표 장소', 'Area or representative place')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                   {t(
                     '모임을 만든 후 채팅방의 모임 달력에서 일정별 날짜, 시간, 장소를 정할 수 있습니다.',
                     'After creating the meetup, set each event’s date, time, and location in the chat calendar.',
                   )}
                </Typography>
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
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                   label={t('모집 인원', 'Capacity')}
                  type="number"
                  value={form.maxParticipants}
                  onChange={(event) => setForm((current) => ({ ...current, maxParticipants: Number(event.target.value) }))}
                  inputProps={{ min: 2, max: 50 }}
                  sx={{ width: { sm: 160 } }}
                  required
                />
              </Stack>
              <Alert severity="info">
                 {t(
                   '일정은 채팅방의 모임 달력에서 만들고 수정할 수 있으며, 일정별 참석자도 확인할 수 있습니다.',
                   'Create and edit events in the chat calendar, where you can also see attendees for each event.',
                 )}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
             <Button onClick={() => { setCreateOpen(false); setEditingMeetup(null); }} disabled={creating}>{t('취소', 'Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={creating}>
               {creating ? t('저장 중…', 'Saving…') : editingMeetup ? t('변경사항 저장', 'Save changes') : t('모임 만들기', 'Create meetup')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>}

      {!isGuest && <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} fullWidth maxWidth="xs">
         <DialogTitle>{t('모임을 삭제하시겠어요?', 'Delete meetup?')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
             <Typography>{t(
               `${deleteTarget?.title ?? ''} 모임을 정말 삭제하시겠어요?`,
               `Are you sure you want to delete ${deleteTarget?.title ?? 'this meetup'}?`,
             )}</Typography>
             <Alert severity="warning">{t(
               '채팅 메시지, 첨부 파일, 일정과 참여 기록이 함께 삭제되며 복구할 수 없습니다.',
               'Chat messages, attachments, events, and participation records will be permanently deleted.',
             )}</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
           <Button disabled={deleting} onClick={() => setDeleteTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button color="error" variant="contained" disabled={deleting} onClick={submitDelete}>
             {deleting ? t('삭제 중…', 'Deleting…') : t('모임 삭제', 'Delete meetup')}
          </Button>
        </DialogActions>
      </Dialog>}

      {!isGuest && <Dialog open={Boolean(participantMeetup)} onClose={() => !participantsLoading && setParticipantMeetup(null)} fullWidth maxWidth="xs">
         <DialogTitle>{t(
           `${participantMeetup?.title ?? ''} 참여자`,
           `Participants · ${participantMeetup?.title ?? ''}`,
         )}</DialogTitle>
        <DialogContent>
          {participantsLoading ? (
             <Box role="status" aria-label={t('참여자 불러오는 중', 'Loading participants')} sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (participantMeetup?.participants?.length ?? 0) === 0 ? (
             <Typography color="text.secondary" sx={{ py: 2 }}>{t('표시할 참여자가 없습니다.', 'There are no participants to display.')}</Typography>
          ) : (
            <Stack spacing={1.25} sx={{ pt: 1 }}>
              {participantMeetup?.participants?.map((participant) => (
                <Stack key={participant.userId} direction="row" spacing={1.25} alignItems="center">
                  <Avatar src={participant.profileImageUrl}>{participant.nickname?.[0]}</Avatar>
                  <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>{participant.nickname}</Typography>
                   {participant.host && <Chip size="small" color="primary" label={t('모임장', 'Host')} />}
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
           <Button disabled={participantsLoading} onClick={() => setParticipantMeetup(null)}>{t('닫기', 'Close')}</Button>
        </DialogActions>
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
