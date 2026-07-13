import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  Divider, FormControlLabel, LinearProgress, List, ListItem, ListItemAvatar,
  ListItemText, IconButton, Paper, Snackbar, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ArticleOutlined, BlockOutlined, CommentOutlined, FavoriteBorder, GroupsOutlined,
  DeleteOutline, LockOutlined, NotificationsOutlined, PersonOutline, PhotoCameraOutlined,
  SettingsOutlined, VisibilityOffOutlined,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { feedService } from '../services/feedService';
import { myPageService } from '../services/myPageService';
import { safetyService } from '../services/safetyService';
import LocationSelector from '../components/LocationSelector';
import { setUser } from '../store/slices/authSlice';
import { Location } from '../store/types';
import { FeedPost } from '../types/feed';
import { HobbyMeetup } from '../types/meetup';
import { MyCommentActivity, MyPageOverview, UserPreferences } from '../types/mypage';
import { BlockedUser, HiddenContent, SafetyReport } from '../types/safety';

interface ProfileForm {
  username: string;
  email: string;
  gender: string;
  age: string;
  interests: string[];
  bio: string;
  profileImage: string;
  location: Location | null;
}

const emptyPreferences: UserPreferences = {
  profileDiscoverable: true,
  showNeighborhood: true,
  matchNotificationsEnabled: true,
  chatNotificationsEnabled: true,
  meetupNotificationsEnabled: true,
};

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '일정 없음';

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<MyPageOverview | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<MyCommentActivity[]>([]);
  const [likes, setLikes] = useState<FeedPost[]>([]);
  const [meetups, setMeetups] = useState<HobbyMeetup[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [hidden, setHidden] = useState<HiddenContent[]>([]);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(emptyPreferences);
  const [activityKind, setActivityKind] = useState<'posts' | 'comments' | 'likes' | 'meetups'>('posts');
  const [editing, setEditing] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [newInterest, setNewInterest] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [profile, setProfile] = useState<ProfileForm>({
    username: '', email: '', gender: '', age: '', interests: [], bio: '', profileImage: '', location: null,
  });
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [user, summary, myPosts, myComments, myLikes, myMeetups, blocks, hiddenItems, myReports, prefs] = await Promise.all([
        authService.getCurrentUser(), myPageService.overview(), myPageService.posts(), myPageService.comments(),
        myPageService.likes(), myPageService.meetups(), safetyService.getBlockedUsers(),
        safetyService.getHiddenContents(), safetyService.getMyReports(), myPageService.preferences(),
      ]);
      if (user) {
        setProfile({
          username: user.username, email: user.email, gender: user.gender || '', age: user.age?.toString() || '',
          interests: user.interests || [], bio: user.bio || '', profileImage: user.profileImage || '',
          location: user.latitude != null && user.longitude != null
            ? { latitude: user.latitude, longitude: user.longitude, address: user.address || '' } : null,
        });
      }
      setOverview(summary); setPosts(myPosts); setComments(myComments); setLikes(myLikes); setMeetups(myMeetups);
      setBlocked(blocks); setHidden(hiddenItems); setReports(myReports); setPreferences(prefs);
    } catch {
      setError('마이페이지 정보를 불러오지 못했어. 잠시 후 다시 시도해줘.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const saveProfile = async () => {
    try {
      const updated = await authService.updateProfile({
        username: profile.username, gender: profile.gender || undefined, age: profile.age ? Number(profile.age) : undefined,
        bio: profile.bio, interests: profile.interests,
        latitude: profile.location?.latitude, longitude: profile.location?.longitude, address: profile.location?.address,
      });
      dispatch(setUser(updated)); setEditing(false); setMessage('프로필을 저장했어.'); await loadAll();
    } catch { setError('프로필 저장에 실패했어.'); }
  };

  const uploadProfileImage = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('프로필 사진은 JPG, PNG, GIF, WebP 형식만 사용할 수 있어.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('프로필 사진은 10MB를 넘을 수 없어.');
      return;
    }
    setProfileUploading(true);
    setProfileUploadProgress(0);
    setError(null);
    try {
      const updated = await authService.uploadProfileImage(file, setProfileUploadProgress);
      dispatch(setUser(updated));
      setProfile((current) => ({ ...current, profileImage: updated.profileImage || '' }));
      setMessage('프로필 사진을 예쁘게 최적화해서 저장했어.');
    } catch (err: any) {
      setError(err.response?.data?.message || '프로필 사진을 올리지 못했어.');
    } finally {
      setProfileUploading(false);
      setProfileUploadProgress(0);
    }
  };

  const deleteProfileImage = async () => {
    setProfileUploading(true);
    setError(null);
    try {
      const updated = await authService.deleteProfileImage();
      dispatch(setUser(updated));
      setProfile((current) => ({ ...current, profileImage: '' }));
      setMessage('프로필 사진을 삭제했어.');
    } catch (err: any) {
      setError(err.response?.data?.message || '프로필 사진을 삭제하지 못했어.');
    } finally {
      setProfileUploading(false);
    }
  };

  const addInterest = () => {
    const value = newInterest.trim();
    if (!value || profile.interests.includes(value)) return;
    setProfile((current) => ({ ...current, interests: [...current.interests, value] }));
    setNewInterest('');
  };

  const savePreferences = async (next: UserPreferences) => {
    setPreferences(next);
    try { setPreferences(await myPageService.updatePreferences(next)); setMessage('설정을 저장했어.'); }
    catch { setError('설정을 저장하지 못했어.'); await loadAll(); }
  };

  const changePassword = async () => {
    if (passwords.next.length < 8) return setError('새 비밀번호는 8자 이상이어야 해.');
    if (passwords.next !== passwords.confirm) return setError('새 비밀번호 확인이 일치하지 않아.');
    try {
      await myPageService.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' }); setMessage('비밀번호를 변경했어.');
    } catch { setError('현재 비밀번호를 확인해줘.'); }
  };

  const logoutAll = async () => {
    try {
      await myPageService.logoutAll(); authService.clearLocalSession(); dispatch(setUser(null)); navigate('/login');
    } catch { setError('전체 로그아웃을 완료하지 못했어.'); }
  };

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar src={profile.profileImage} sx={{ width: 88, height: 88, bgcolor: 'secondary.main', fontSize: 30 }}>
              {profile.username?.[0]}
            </Avatar>
            <input ref={profileImageInputRef} type="file" hidden accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => { void uploadProfileImage(event.target.files?.[0]); event.target.value = ''; }} />
            <Tooltip title="프로필 사진 바꾸기">
              <span><IconButton aria-label="프로필 사진 바꾸기" size="small" disabled={profileUploading} onClick={() => profileImageInputRef.current?.click()} sx={{ position: 'absolute', right: -4, bottom: -4, bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 2, '&:hover': { bgcolor: 'primary.dark' } }}><PhotoCameraOutlined fontSize="small" /></IconButton></span>
            </Tooltip>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4">{profile.username || '내 마이페이지'}</Typography>
            <Typography color="text.secondary">내 활동과 공개 범위를 한곳에서 관리해.</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={overview?.profileCompletion || 0} sx={{ width: 180, height: 8, borderRadius: 8 }} />
              <Typography variant="caption" fontWeight={800}>프로필 {overview?.profileCompletion || 0}%</Typography>
            </Stack>
            {profileUploading && <LinearProgress variant={profileUploadProgress > 0 ? 'determinate' : 'indeterminate'} value={profileUploadProgress || undefined} sx={{ mt: 1, maxWidth: 280 }} />}
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<PersonOutline />} iconPosition="start" label="내 정보" />
          <Tab icon={<ArticleOutlined />} iconPosition="start" label="활동 기록" />
          <Tab icon={<VisibilityOffOutlined />} iconPosition="start" label="안전 관리" />
          <Tab icon={<SettingsOutlined />} iconPosition="start" label="설정" />
        </Tabs>
        <Divider />

        {tab === 0 && <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 1 }}>
              {[
                ['내 글', overview?.postCount, <ArticleOutlined />], ['댓글', overview?.commentCount, <CommentOutlined />],
                ['좋아요', overview?.likedPostCount, <FavoriteBorder />], ['만든 모임', overview?.createdMeetupCount, <GroupsOutlined />],
                ['참여 모임', overview?.joinedMeetupCount, <GroupsOutlined />], ['차단', blocked.length, <BlockOutlined />],
              ].map(([label, value, icon]) => <Card key={String(label)} variant="outlined"><CardContent>{icon}<Typography variant="h5">{String(value ?? 0)}</Typography><Typography color="text.secondary" variant="body2">{label}</Typography></CardContent></Card>)}
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h5">프로필</Typography><Button onClick={() => editing ? void saveProfile() : setEditing(true)} variant="contained">{editing ? '저장' : '수정'}</Button></Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label="닉네임" value={profile.username} disabled={!editing} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
              <TextField label="이메일" value={profile.email} disabled />
              <TextField label="나이" type="number" value={profile.age} disabled={!editing} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />
              <TextField label="성별" value={profile.gender} disabled={!editing} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} placeholder="female / male" />
            </Box>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={800}>프로필 사진</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>사진을 올리면 WebP로 압축해 선명하고 가볍게 저장해.</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<PhotoCameraOutlined />} disabled={profileUploading} onClick={() => profileImageInputRef.current?.click()}>사진 선택</Button>
                {profile.profileImage && <Button color="error" startIcon={<DeleteOutline />} disabled={profileUploading} onClick={() => void deleteProfileImage()}>사진 삭제</Button>}
              </Stack>
            </Box>
            <TextField label="자기소개" value={profile.bio} disabled={!editing} multiline minRows={3} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <Box><Typography fontWeight={800} sx={{ mb: 1 }}>동네</Typography><LocationSelector disabled={!editing} initialLocation={profile.location || undefined} onLocationSelect={(location) => setProfile({ ...profile, location })} />{profile.location?.address && <Typography color="text.secondary" sx={{ mt: 1 }}>{profile.location.address}</Typography>}</Box>
            <Box><Typography fontWeight={800} sx={{ mb: 1 }}>관심사</Typography><Stack direction="row" gap={1} flexWrap="wrap">{profile.interests.map((item) => <Chip key={item} label={item} onDelete={editing ? () => setProfile({ ...profile, interests: profile.interests.filter((value) => value !== item) }) : undefined} />)}</Stack>{editing && <Stack direction="row" spacing={1} sx={{ mt: 2 }}><TextField size="small" label="관심사 추가" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} /><Button variant="outlined" onClick={addInterest}>추가</Button></Stack>}</Box>
          </Stack>
        </Box>}

        {tab === 1 && <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}>{(['posts', 'comments', 'likes', 'meetups'] as const).map((kind) => <Chip key={kind} clickable color={activityKind === kind ? 'primary' : 'default'} onClick={() => setActivityKind(kind)} label={{ posts: `내 글 ${posts.length}`, comments: `댓글 ${comments.length}`, likes: `좋아요 ${likes.length}`, meetups: `모임 ${meetups.length}` }[kind]} />)}</Stack>
          {activityKind === 'posts' && <PostList posts={posts} empty="작성한 게시글이 없어." actionLabel="삭제" onAction={async (id) => { await feedService.deletePost(id); setPosts((items) => items.filter((item) => item.id !== id)); setMessage('게시글을 삭제했어.'); }} />}
          {activityKind === 'likes' && <PostList posts={likes} empty="좋아요한 게시글이 없어." actionLabel="좋아요 취소" onAction={async (id) => { await feedService.unlikePost(id); setLikes((items) => items.filter((item) => item.id !== id)); }} />}
          {activityKind === 'comments' && <Stack spacing={1}>{comments.length === 0 ? <Empty text="작성한 댓글이 없어." /> : comments.map((item) => <Card key={item.id} variant="outlined"><CardContent><Typography>{item.content}</Typography><Typography variant="caption" color="text.secondary">{item.postCaption || '게시글'} · {formatDate(item.createdAt)}</Typography><Box sx={{ mt: 1 }}><Button size="small" color="error" onClick={async () => { await feedService.deleteComment(item.id); setComments((items) => items.filter((value) => value.id !== item.id)); }}>댓글 삭제</Button></Box></CardContent></Card>)}</Stack>}
          {activityKind === 'meetups' && <Stack spacing={1}>{meetups.length === 0 ? <Empty text="참여한 모임이 없어." /> : meetups.map((item) => <Card key={item.roomId} variant="outlined"><CardContent><Typography variant="h6">{item.title}</Typography><Typography color="text.secondary">{item.location || '장소 미정'} · {formatDate(item.scheduledAt)}</Typography><Stack direction="row" gap={1} sx={{ mt: 1 }}>{item.interestTags.map((tag) => <Chip key={tag} size="small" label={tag} />)}</Stack><Button sx={{ mt: 1 }} onClick={() => navigate(`/chat/${item.roomId}`)}>채팅 열기</Button></CardContent></Card>)}</Stack>}
        </Box>}

        {tab === 2 && <Box sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={4}>
          <SafetySection title={`숨긴 콘텐츠 ${hidden.length}`} icon={<VisibilityOffOutlined />} empty="숨긴 콘텐츠가 없어.">{hidden.map((item) => <ListItem key={item.id} divider secondaryAction={<Button onClick={async () => { await safetyService.unhide(item.targetType, item.targetId); setHidden((items) => items.filter((value) => value.id !== item.id)); }}>숨김 해제</Button>}><ListItemAvatar><Avatar src={item.imageUrl}>{item.targetType[0]}</Avatar></ListItemAvatar><ListItemText primary={item.available ? item.title : '삭제된 콘텐츠'} secondary={`${item.preview || '내용을 확인할 수 없어.'} · ${formatDate(item.hiddenAt)}`} /></ListItem>)}</SafetySection>
          <SafetySection title={`차단한 사용자 ${blocked.length}`} icon={<BlockOutlined />} empty="차단한 사용자가 없어.">{blocked.map((item) => <ListItem key={item.userId} divider secondaryAction={<Button onClick={async () => { await safetyService.unblockUser(item.userId); setBlocked((items) => items.filter((value) => value.userId !== item.userId)); }}>차단 해제</Button>}><ListItemAvatar><Avatar src={item.profileImage}>{item.username[0]}</Avatar></ListItemAvatar><ListItemText primary={item.username} secondary={formatDate(item.blockedAt)} /></ListItem>)}</SafetySection>
          <SafetySection title={`내 신고 기록 ${reports.length}`} icon={<NotificationsOutlined />} empty="신고 기록이 없어.">{reports.map((item) => <ListItem key={item.id} divider><ListItemText primary={`${item.reason} · ${item.status}`} secondary={`${item.targetType} · ${formatDate(item.createdAt)}`} /></ListItem>)}</SafetySection>
        </Stack></Box>}

        {tab === 3 && <Box sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={4}>
          <Box><Typography variant="h5" gutterBottom>공개 및 알림</Typography>{([
            ['profileDiscoverable', '새로운 매칭에 내 프로필 공개', '끄면 추천 후보와 직접 매칭 요청에서 제외돼.'],
            ['showNeighborhood', '프로필에 동네 표시', '정확한 좌표가 아닌 구 단위 동네만 보여줘.'],
            ['matchNotificationsEnabled', '매칭 알림', '새 요청과 수락·거절 소식을 받아.'],
            ['chatNotificationsEnabled', '채팅 알림', '새 메시지와 채팅방 변경 소식을 받아.'],
            ['meetupNotificationsEnabled', '모임 알림', '일정 리마인더와 대기 승급 소식을 받아.'],
          ] as const).map(([key, title, description]) => <FormControlLabel key={key} sx={{ display: 'flex', alignItems: 'flex-start', m: 0, py: 1 }} control={<Switch checked={preferences[key]} onChange={(_, checked) => void savePreferences({ ...preferences, [key]: checked })} />} label={<Box><Typography fontWeight={800}>{title}</Typography><Typography variant="body2" color="text.secondary">{description}</Typography></Box>} />)}</Box>
          <Divider />
          <Box><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><LockOutlined /><Typography variant="h5">비밀번호 변경</Typography></Stack><Stack spacing={2} maxWidth={480}><TextField type="password" label="현재 비밀번호" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /><TextField type="password" label="새 비밀번호" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} /><TextField type="password" label="새 비밀번호 확인" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /><Button variant="contained" onClick={() => void changePassword()}>비밀번호 변경</Button></Stack></Box>
          <Divider />
          <Box><Typography variant="h5">로그인 보안</Typography><Typography color="text.secondary" sx={{ my: 1 }}>분실한 기기나 공유 PC의 세션을 포함해 모든 기기에서 로그아웃해.</Typography><Button color="error" variant="outlined" onClick={() => void logoutAll()}>모든 기기에서 로그아웃</Button></Box>
        </Stack></Box>}
      </Paper>
      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}><Alert severity="success">{message}</Alert></Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={4500} onClose={() => setError(null)}><Alert severity="error">{error}</Alert></Snackbar>
    </Container>
  );
};

const Empty = ({ text }: { text: string }) => <Alert severity="info">{text}</Alert>;

const PostList = ({ posts, empty, actionLabel, onAction }: { posts: FeedPost[]; empty: string; actionLabel: string; onAction: (id: string) => Promise<void> }) => (
  <Stack spacing={1}>{posts.length === 0 ? <Empty text={empty} /> : posts.map((post) => <Card key={post.id} variant="outlined"><CardContent sx={{ display: 'flex', gap: 2 }}><Avatar variant="rounded" src={post.imageUrl} sx={{ width: 72, height: 72 }} /><Box sx={{ flex: 1, minWidth: 0 }}><Typography noWrap>{post.caption || '내용 없는 게시글'}</Typography><Typography variant="caption" color="text.secondary">좋아요 {post.likeCount} · 댓글 {post.commentCount} · {formatDate(post.createdAt)}</Typography><Box sx={{ mt: 1 }}><Button size="small" color={actionLabel === '삭제' ? 'error' : 'primary'} onClick={() => void onAction(post.id)}>{actionLabel}</Button></Box></Box></CardContent></Card>)}</Stack>
);

const SafetySection = ({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode[] }) => (
  <Box><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>{icon}<Typography variant="h5">{title}</Typography></Stack>{children.length === 0 ? <Empty text={empty} /> : <List disablePadding>{children}</List>}</Box>
);

export default Profile;
