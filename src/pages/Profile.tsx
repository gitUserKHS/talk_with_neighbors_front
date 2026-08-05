import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, LinearProgress, List, ListItem, ListItemAvatar,
  ListItemText, IconButton, Paper, Snackbar, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ArticleOutlined, BlockOutlined, CommentOutlined, FavoriteBorder, GroupsOutlined,
  DeleteOutline, LockOutlined, LogoutRounded, NotificationsOutlined, PersonOutline, PhotoCameraOutlined,
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
import { useI18n } from '../i18n/I18nProvider';
import { serverErrorMessage } from '../services/apiError';
import SignOutDialog from '../components/auth/SignOutDialog';
import { replaceFeedPost } from '../services/contentMutationState';

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

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { locale, t, formatNumber, formatDate } = useI18n();
  const translateRef = useRef(t);
  translateRef.current = t;
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
  const [activityMutationId, setActivityMutationId] = useState<string | null>(null);
  const [postEditTarget, setPostEditTarget] = useState<FeedPost | null>(null);
  const [postEditCaption, setPostEditCaption] = useState('');
  const [postEditTags, setPostEditTags] = useState('');
  const [postEditPublicPreview, setPostEditPublicPreview] = useState(false);
  const [commentEditTarget, setCommentEditTarget] = useState<MyCommentActivity | null>(null);
  const [commentEditContent, setCommentEditContent] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [profile, setProfile] = useState<ProfileForm>({
    username: '', email: '', gender: '', age: '', interests: [], bio: '', profileImage: '', location: null,
  });
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const displayDate = (value?: string) => value
    ? formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
    : t('일정 없음', 'No date');

  const apiError = (err: unknown, korean: string, english: string) => (
    (locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(korean, english)
  );

  const reportReasonLabel = (reason: SafetyReport['reason']) => ({
    HARASSMENT: t('괴롭힘', 'Harassment'),
    HATE_SPEECH: t('혐오 표현', 'Hate speech'),
    SPAM: t('스팸', 'Spam'),
    INAPPROPRIATE_CONTENT: t('부적절한 콘텐츠', 'Inappropriate content'),
    IMPERSONATION: t('사칭', 'Impersonation'),
    PRIVACY: t('개인정보 침해', 'Privacy violation'),
    OTHER: t('기타', 'Other'),
  })[reason];

  const reportStatusLabel = (status: SafetyReport['status']) => ({
    PENDING: t('접수됨', 'Submitted'),
    REVIEWING: t('검토 중', 'Under review'),
    RESOLVED: t('처리 완료', 'Resolved'),
    DISMISSED: t('종결', 'Closed'),
  })[status];

  const safetyTargetLabel = (targetType: SafetyReport['targetType']) => ({
    USER: t('사용자', 'User'),
    FEED_POST: t('게시글', 'Post'),
    COMMENT: t('댓글', 'Comment'),
    MESSAGE: t('메시지', 'Message'),
  })[targetType];

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
      setError(translateRef.current(
        '마이페이지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        'Your account information could not be loaded. Please try again shortly.',
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const runActivityMutation = async (
    mutationId: string,
    confirmation: string | null,
    action: () => Promise<void>,
  ) => {
    if (activityMutationId || (confirmation && !window.confirm(confirmation))) return;
    setActivityMutationId(mutationId);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiError(err, '요청을 처리하지 못했습니다.', 'The request could not be completed.'));
    } finally {
      setActivityMutationId(null);
    }
  };

  const openPostEdit = (post: FeedPost) => {
    setPostEditTarget(post);
    setPostEditCaption(post.caption ?? '');
    setPostEditTags((post.interestTags ?? []).join(', '));
    setPostEditPublicPreview(Boolean(post.publicPreview));
  };

  const savePostEdit = async () => {
    if (!postEditTarget || !postEditCaption.trim()) return;
    const target = postEditTarget;
    const interestTags = postEditTags
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
      .filter((tag, index, values) => values.indexOf(tag) === index)
      .slice(0, 10);
    await runActivityMutation(`post-edit:${target.id}`, null, async () => {
      const updated = await feedService.updatePost(target.id, {
        caption: postEditCaption.trim(),
        interestTags,
        publicPreview: postEditPublicPreview,
      });
      setPosts((items) => replaceFeedPost(items, updated));
      setPostEditTarget(null);
      setMessage(t('게시글을 수정했습니다.', 'Post updated.'));
    });
  };

  const saveCommentEdit = async () => {
    if (!commentEditTarget || !commentEditContent.trim()) return;
    const target = commentEditTarget;
    await runActivityMutation(`comment-edit:${target.id}`, null, async () => {
      const updated = await feedService.updateComment(target.id, commentEditContent.trim());
      setComments((items) => items.map((item) => item.id === target.id
        ? { ...item, content: updated.content }
        : item));
      setCommentEditTarget(null);
      setMessage(t('댓글을 수정했습니다.', 'Comment updated.'));
    });
  };

  const saveProfile = async () => {
    try {
      const updated = await authService.updateProfile({
        username: profile.username, gender: profile.gender || undefined, age: profile.age ? Number(profile.age) : undefined,
        bio: profile.bio, interests: profile.interests,
        latitude: profile.location?.latitude, longitude: profile.location?.longitude, address: profile.location?.address,
      });
      dispatch(setUser(updated)); setEditing(false); setMessage(t('프로필을 저장했습니다.', 'Profile saved.')); await loadAll();
    } catch { setError(t('프로필을 저장하지 못했습니다.', 'Profile could not be saved.')); }
  };

  const uploadProfileImage = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError(t(
        '프로필 사진은 JPG, PNG, GIF, WebP 형식만 사용할 수 있습니다.',
        'Profile photos must be JPG, PNG, GIF, or WebP files.',
      ));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('프로필 사진은 10MB 이하만 사용할 수 있습니다.', 'Profile photos must be 10 MB or smaller.'));
      return;
    }
    setProfileUploading(true);
    setProfileUploadProgress(0);
    setError(null);
    try {
      const updated = await authService.uploadProfileImage(file, setProfileUploadProgress);
      dispatch(setUser(updated));
      setProfile((current) => ({ ...current, profileImage: updated.profileImage || '' }));
      setMessage(t('프로필 사진을 최적화해 저장했습니다.', 'Profile photo optimized and saved.'));
    } catch (err) {
      setError(apiError(err, '프로필 사진을 올리지 못했습니다.', 'Profile photo could not be uploaded.'));
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
      setMessage(t('프로필 사진을 삭제했습니다.', 'Profile photo deleted.'));
    } catch (err) {
      setError(apiError(err, '프로필 사진을 삭제하지 못했습니다.', 'Profile photo could not be deleted.'));
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
    try { setPreferences(await myPageService.updatePreferences(next)); setMessage(t('설정을 저장했습니다.', 'Settings saved.')); }
    catch { setError(t('설정을 저장하지 못했습니다.', 'Settings could not be saved.')); await loadAll(); }
  };

  const changePassword = async () => {
    if (passwords.next.length < 8) return setError(t('새 비밀번호는 8자 이상이어야 합니다.', 'Your new password must be at least 8 characters.'));
    if (passwords.next !== passwords.confirm) return setError(t('새 비밀번호와 확인 값이 일치하지 않습니다.', 'The new password and confirmation do not match.'));
    try {
      await myPageService.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' }); setMessage(t('비밀번호를 변경했습니다.', 'Password changed.'));
    } catch { setError(t('현재 비밀번호를 확인해 주세요.', 'Check your current password.')); }
  };

  const logoutAll = async () => {
    try {
      await myPageService.logoutAll(); dispatch(setUser(null)); navigate('/login');
    } catch { setError(t('모든 기기에서 로그아웃하지 못했습니다.', 'Could not sign out from all devices.')); }
  };

  const logoutCurrentDevice = async () => {
    setSignOutBusy(true);
    setSignOutError(null);
    try {
      await authService.logout();
      dispatch(setUser(null));
      setSignOutOpen(false);
      navigate('/login', { replace: true });
    } catch {
      setSignOutError(t(
        '로그아웃 요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
        'Could not complete sign-out. Check your connection and try again.',
      ));
    } finally {
      setSignOutBusy(false);
    }
  };

  if (loading) return <Box role="status" aria-label={t('마이페이지 불러오는 중', 'Loading account')} sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Paper component="header" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar src={profile.profileImage} sx={{ width: 88, height: 88, bgcolor: 'secondary.main', fontSize: 30 }}>
              {profile.username?.[0]}
            </Avatar>
            <input ref={profileImageInputRef} type="file" hidden accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => { void uploadProfileImage(event.target.files?.[0]); event.target.value = ''; }} />
            <Tooltip title={t('프로필 사진 변경', 'Change profile photo')}>
              <span><IconButton aria-label={t('프로필 사진 변경', 'Change profile photo')} size="small" disabled={profileUploading} onClick={() => profileImageInputRef.current?.click()} sx={{ position: 'absolute', right: -4, bottom: -4, bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 2, '&:hover': { bgcolor: 'primary.dark' } }}><PhotoCameraOutlined fontSize="small" /></IconButton></span>
            </Tooltip>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={900}>{profile.username || t('마이페이지', 'My account')}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{t(
              '프로필, 활동 기록, 공개 범위와 보안 설정을 한곳에서 관리하세요.',
              'Manage your profile, activity, privacy, and security in one place.',
            )}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={overview?.profileCompletion || 0} sx={{ width: 180, height: 8, borderRadius: 8 }} />
              <Typography variant="caption" fontWeight={800}>{t(
                `프로필 완성도 ${formatNumber(overview?.profileCompletion || 0)}%`,
                `Profile ${formatNumber(overview?.profileCompletion || 0)}% complete`,
              )}</Typography>
            </Stack>
            {profileUploading && <LinearProgress variant={profileUploadProgress > 0 ? 'determinate' : 'indeterminate'} value={profileUploadProgress || undefined} sx={{ mt: 1, maxWidth: 280 }} />}
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<PersonOutline />} iconPosition="start" label={t('내 정보', 'Profile')} />
          <Tab icon={<ArticleOutlined />} iconPosition="start" label={t('활동 기록', 'Activity')} />
          <Tab icon={<VisibilityOffOutlined />} iconPosition="start" label={t('안전 관리', 'Safety')} />
          <Tab icon={<SettingsOutlined />} iconPosition="start" label={t('설정', 'Settings')} />
        </Tabs>
        <Divider />

        {tab === 0 && <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 1 }}>
              {[
                [t('내 글', 'Posts'), overview?.postCount, <ArticleOutlined />], [t('댓글', 'Comments'), overview?.commentCount, <CommentOutlined />],
                [t('좋아요', 'Likes'), overview?.likedPostCount, <FavoriteBorder />], [t('만든 모임', 'Created'), overview?.createdMeetupCount, <GroupsOutlined />],
                [t('참여 모임', 'Joined'), overview?.joinedMeetupCount, <GroupsOutlined />], [t('차단', 'Blocked'), blocked.length, <BlockOutlined />],
              ].map(([label, value, icon]) => <Card key={String(label)} variant="outlined" sx={{ borderRadius: 2.5 }}><CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>{icon}<Typography variant="h5">{formatNumber(Number(value ?? 0))}</Typography><Typography color="text.secondary" variant="body2">{label}</Typography></CardContent></Card>)}
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h5">{t('프로필', 'Profile')}</Typography><Typography variant="body2" color="text.secondary">{t('다른 이웃에게 표시되는 정보를 관리합니다.', 'Manage the information shown to other neighbors.')}</Typography></Box><Button onClick={() => editing ? void saveProfile() : setEditing(true)} variant="contained">{editing ? t('저장', 'Save') : t('수정', 'Edit')}</Button></Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField label={t('닉네임', 'Nickname')} value={profile.username} disabled={!editing} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
              <TextField label={t('이메일', 'Email')} value={profile.email} disabled />
              <TextField label={t('나이', 'Age')} type="number" value={profile.age} disabled={!editing} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />
              <TextField label={t('성별', 'Gender')} value={profile.gender} disabled={!editing} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} placeholder={t('예: 여성, 남성', 'e.g. female, male')} />
            </Box>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={800}>{t('프로필 사진', 'Profile photo')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('업로드한 사진은 WebP 형식으로 최적화해 저장합니다.', 'Uploaded photos are optimized and stored as WebP.')}</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<PhotoCameraOutlined />} disabled={profileUploading} onClick={() => profileImageInputRef.current?.click()}>{t('사진 선택', 'Choose photo')}</Button>
                {profile.profileImage && <Button color="error" startIcon={<DeleteOutline />} disabled={profileUploading} onClick={() => void deleteProfileImage()}>{t('사진 삭제', 'Remove photo')}</Button>}
              </Stack>
            </Box>
            <TextField label={t('자기소개', 'Bio')} value={profile.bio} disabled={!editing} multiline minRows={3} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <Box><Typography fontWeight={800} sx={{ mb: 1 }}>{t('동네', 'Neighborhood')}</Typography><LocationSelector disabled={!editing} initialLocation={profile.location || undefined} onLocationSelect={(location) => setProfile({ ...profile, location })} />{profile.location?.address && <Typography color="text.secondary" sx={{ mt: 1 }}>{profile.location.address}</Typography>}</Box>
            <Box><Typography fontWeight={800} sx={{ mb: 1 }}>{t('관심사', 'Interests')}</Typography><Stack direction="row" gap={1} flexWrap="wrap">{profile.interests.map((item) => <Chip key={item} label={item} onDelete={editing ? () => setProfile({ ...profile, interests: profile.interests.filter((value) => value !== item) }) : undefined} />)}</Stack>{editing && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}><TextField size="small" label={t('관심사 추가', 'Add an interest')} value={newInterest} onChange={(e) => setNewInterest(e.target.value)} /><Button variant="outlined" onClick={addInterest}>{t('추가', 'Add')}</Button></Stack>}</Box>
          </Stack>
        </Box>}

        {tab === 1 && <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}>
            {(['posts', 'comments', 'likes', 'meetups'] as const).map((kind) => <Chip
              key={kind}
              clickable
              color={activityKind === kind ? 'primary' : 'default'}
              onClick={() => setActivityKind(kind)}
              label={{
                posts: t(`내 글 ${formatNumber(posts.length)}`, `Posts ${formatNumber(posts.length)}`),
                comments: t(`댓글 ${formatNumber(comments.length)}`, `Comments ${formatNumber(comments.length)}`),
                likes: t(`좋아요 ${formatNumber(likes.length)}`, `Likes ${formatNumber(likes.length)}`),
                meetups: t(`모임 ${formatNumber(meetups.length)}`, `Meetups ${formatNumber(meetups.length)}`),
              }[kind]}
            />)}
          </Stack>
          {activityKind === 'posts' && <PostList
            posts={posts}
            empty={t('작성한 게시글이 없습니다.', 'You have not written any posts yet.')}
            actionLabel={t('삭제', 'Delete')}
            destructive
            busyId={activityMutationId}
            onEdit={openPostEdit}
            onAction={(id) => runActivityMutation(
              `post:${id}`,
              t(
                '게시글, 첨부 파일과 댓글이 함께 삭제되며 복구할 수 없습니다. 삭제하시겠어요?',
                'This permanently deletes the post, its attachments, and comments. Continue?',
              ),
              async () => {
                await feedService.deletePost(id);
                setPosts((items) => items.filter((item) => item.id !== id));
                setMessage(t('게시글을 삭제했습니다.', 'Post deleted.'));
              },
            )}
          />}
          {activityKind === 'likes' && <PostList
            posts={likes}
            empty={t('좋아요한 게시글이 없습니다.', 'You have not liked any posts yet.')}
            actionLabel={t('좋아요 취소', 'Unlike')}
            busyId={activityMutationId}
            onAction={(id) => runActivityMutation(`like:${id}`, null, async () => {
              await feedService.unlikePost(id);
              setLikes((items) => items.filter((item) => item.id !== id));
            })}
          />}
          {activityKind === 'comments' && <Stack spacing={1.25}>
            {comments.length === 0 ? <Empty text={t('작성한 댓글이 없습니다.', 'You have not written any comments yet.')} /> : comments.map((item) => (
              <Card key={item.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography>{item.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.postCaption || t('게시글', 'Post')} · {displayDate(item.createdAt)}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" disabled={Boolean(activityMutationId)} onClick={() => { setCommentEditTarget(item); setCommentEditContent(item.content); }}>{t('댓글 수정', 'Edit comment')}</Button>
                    <Button size="small" color="error" disabled={Boolean(activityMutationId)} onClick={() => void runActivityMutation(
                      `comment:${item.id}`,
                      t('댓글을 삭제하면 복구할 수 없습니다. 삭제하시겠어요?', 'Deleted comments cannot be restored. Continue?'),
                      async () => {
                        await feedService.deleteComment(item.id);
                        setComments((items) => items.filter((value) => value.id !== item.id));
                        setMessage(t('댓글을 삭제했습니다.', 'Comment deleted.'));
                      },
                    )}>{activityMutationId === `comment:${item.id}` ? t('삭제 중…', 'Deleting…') : t('댓글 삭제', 'Delete comment')}</Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>}
          {activityKind === 'meetups' && <Stack spacing={1.25}>
            {meetups.length === 0 ? <Empty text={t('참여한 모임이 없습니다.', 'You have not joined any meetups yet.')} /> : meetups.map((item) => (
              <Card key={item.roomId} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography color="text.secondary">{item.location || t('장소 미정', 'Location not set')} · {displayDate(item.scheduledAt)}</Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>{item.interestTags.map((tag) => <Chip key={tag} size="small" label={tag} />)}</Stack>
                  <Button sx={{ mt: 1 }} onClick={() => navigate(`/chat/${item.roomId}`)}>{t('채팅 열기', 'Open chat')}</Button>
                </CardContent>
              </Card>
            ))}
          </Stack>}
        </Box>}

        {tab === 2 && <Box sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={4}>
          <SafetySection
            title={t(`숨긴 콘텐츠 ${formatNumber(hidden.length)}`, `Hidden content ${formatNumber(hidden.length)}`)}
            icon={<VisibilityOffOutlined />}
            empty={t('숨긴 콘텐츠가 없습니다.', 'You have no hidden content.')}
          >
            {hidden.map((item) => <ListItem
              key={item.id}
              divider
              secondaryAction={<Button onClick={async () => {
                await safetyService.unhide(item.targetType, item.targetId);
                setHidden((items) => items.filter((value) => value.id !== item.id));
              }}>{t('숨김 해제', 'Unhide')}</Button>}
            >
              <ListItemAvatar><Avatar src={item.imageUrl}>{item.targetType[0]}</Avatar></ListItemAvatar>
              <ListItemText
                primary={item.available ? item.title : t('삭제된 콘텐츠', 'Deleted content')}
                secondary={`${item.preview || t('내용을 확인할 수 없습니다.', 'Content is unavailable.')} · ${displayDate(item.hiddenAt)}`}
              />
            </ListItem>)}
          </SafetySection>
          <SafetySection
            title={t(`차단한 사용자 ${formatNumber(blocked.length)}`, `Blocked users ${formatNumber(blocked.length)}`)}
            icon={<BlockOutlined />}
            empty={t('차단한 사용자가 없습니다.', 'You have not blocked anyone.')}
          >
            {blocked.map((item) => <ListItem
              key={item.userId}
              divider
              secondaryAction={<Button onClick={async () => {
                await safetyService.unblockUser(item.userId);
                setBlocked((items) => items.filter((value) => value.userId !== item.userId));
              }}>{t('차단 해제', 'Unblock')}</Button>}
            >
              <ListItemAvatar><Avatar src={item.profileImage}>{item.username[0]}</Avatar></ListItemAvatar>
              <ListItemText primary={item.username} secondary={displayDate(item.blockedAt)} />
            </ListItem>)}
          </SafetySection>
          <SafetySection
            title={t(`내 신고 기록 ${formatNumber(reports.length)}`, `My reports ${formatNumber(reports.length)}`)}
            icon={<NotificationsOutlined />}
            empty={t('신고 기록이 없습니다.', 'You have not submitted any reports.')}
          >
            {reports.map((item) => <ListItem key={item.id} divider>
              <ListItemText
                primary={`${reportReasonLabel(item.reason)} · ${reportStatusLabel(item.status)}`}
                secondary={`${safetyTargetLabel(item.targetType)} · ${displayDate(item.createdAt)}`}
              />
            </ListItem>)}
          </SafetySection>
        </Stack></Box>}

        {tab === 3 && <Box sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={4}>
          <Box><Typography variant="h5" gutterBottom>{t('공개 및 알림', 'Privacy and notifications')}</Typography>{([
            ['profileDiscoverable', t('새로운 매칭에 내 프로필 공개', 'Show my profile in matches'), t('끄면 추천 이웃과 직접 매칭 요청에서 제외됩니다.', 'Turn this off to be excluded from recommendations and direct match requests.')],
            ['showNeighborhood', t('프로필에 동네 표시', 'Show neighborhood on profile'), t('정확한 좌표가 아닌 동네 정보만 표시됩니다.', 'Only your general neighborhood is shown, never your exact coordinates.')],
            ['matchNotificationsEnabled', t('매칭 알림', 'Match notifications'), t('새로운 요청과 수락 또는 거절 소식을 받습니다.', 'Get updates about new requests, acceptances, and declines.')],
            ['chatNotificationsEnabled', t('채팅 알림', 'Chat notifications'), t('새 메시지와 채팅방 변경 소식을 받습니다.', 'Get updates about new messages and chat room changes.')],
            ['meetupNotificationsEnabled', t('모임 알림', 'Meetup notifications'), t('일정 알림과 대기 명단 변경 소식을 받습니다.', 'Get event reminders and waitlist updates.')],
          ] as const).map(([key, title, description]) => <FormControlLabel key={key} sx={{ display: 'flex', alignItems: 'flex-start', m: 0, py: 1 }} control={<Switch inputProps={{ 'aria-label': title }} checked={preferences[key]} onChange={(_, checked) => void savePreferences({ ...preferences, [key]: checked })} />} label={<Box><Typography fontWeight={800}>{title}</Typography><Typography variant="body2" color="text.secondary">{description}</Typography></Box>} />)}</Box>
          <Divider />
          <Box><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><LockOutlined /><Typography variant="h5">{t('비밀번호 변경', 'Change password')}</Typography></Stack><Stack spacing={2} maxWidth={480}><TextField type="password" autoComplete="current-password" label={t('현재 비밀번호', 'Current password')} value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /><TextField type="password" autoComplete="new-password" label={t('새 비밀번호', 'New password')} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} /><TextField type="password" autoComplete="new-password" label={t('새 비밀번호 확인', 'Confirm new password')} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /><Button variant="contained" onClick={() => void changePassword()}>{t('비밀번호 변경', 'Change password')}</Button></Stack></Box>
          <Divider />
          <Box>
            <Typography variant="h5">{t('로그인 보안', 'Sign-in security')}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('현재 사용 중인 기기의 로그인 상태만 종료하거나, 필요한 경우 모든 기기의 세션을 종료할 수 있습니다.', 'Sign out on this device, or end every active session when needed.')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2, alignItems: { sm: 'center' } }}>
              <Button
                color="error"
                variant="contained"
                startIcon={<LogoutRounded />}
                onClick={() => { setSignOutError(null); setSignOutOpen(true); }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('이 기기에서 로그아웃', 'Sign out on this device')}
              </Button>
              <Button color="error" variant="outlined" onClick={() => void logoutAll()} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                {t('모든 기기에서 로그아웃', 'Sign out from all devices')}
              </Button>
            </Stack>
          </Box>
        </Stack></Box>}
      </Paper>
      <SignOutDialog
        open={signOutOpen}
        busy={signOutBusy}
        error={signOutError}
        onClose={() => { setSignOutError(null); setSignOutOpen(false); }}
        onConfirm={() => void logoutCurrentDevice()}
      />
      <Dialog open={Boolean(postEditTarget)} onClose={() => !activityMutationId && setPostEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('게시글 수정', 'Edit post')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{t('첨부한 사진과 동영상은 그대로 유지됩니다.', 'Attached photos and videos will be kept.')}</Alert>
            <TextField label={t('글 내용', 'Post text')} multiline minRows={4} fullWidth required value={postEditCaption} disabled={Boolean(activityMutationId)} inputProps={{ maxLength: 1000 }} helperText={`${formatNumber(postEditCaption.length)} / ${formatNumber(1000)}`} onChange={(event) => setPostEditCaption(event.target.value)} />
            <TextField label={t('관심사 태그', 'Interest tags')} fullWidth value={postEditTags} disabled={Boolean(activityMutationId)} helperText={t('쉼표로 구분해 최대 10개까지 입력해 주세요.', 'Enter up to 10 tags, separated by commas.')} onChange={(event) => setPostEditTags(event.target.value)} />
            <FormControlLabel control={<Checkbox checked={postEditPublicPreview} disabled={Boolean(activityMutationId)} onChange={(event) => setPostEditPublicPreview(event.target.checked)} />} label={t('로그인 전 공개 미리보기 허용', 'Allow a public preview before sign-in')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(activityMutationId)} onClick={() => setPostEditTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" disabled={Boolean(activityMutationId) || !postEditCaption.trim()} onClick={() => void savePostEdit()}>{activityMutationId?.startsWith('post-edit:') ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(commentEditTarget)} onClose={() => !activityMutationId && setCommentEditTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('댓글 수정', 'Edit comment')}</DialogTitle>
        <DialogContent><TextField sx={{ mt: 1 }} label={t('댓글 내용', 'Comment')} multiline minRows={3} fullWidth autoFocus value={commentEditContent} disabled={Boolean(activityMutationId)} inputProps={{ maxLength: 1000 }} onChange={(event) => setCommentEditContent(event.target.value)} /></DialogContent>
        <DialogActions>
          <Button disabled={Boolean(activityMutationId)} onClick={() => setCommentEditTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" disabled={Boolean(activityMutationId) || !commentEditContent.trim()} onClick={() => void saveCommentEdit()}>{activityMutationId?.startsWith('comment-edit:') ? t('저장 중…', 'Saving…') : t('저장', 'Save')}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)}><Alert severity="success">{message}</Alert></Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={4500} onClose={() => setError(null)}><Alert severity="error">{error}</Alert></Snackbar>
    </Container>
  );
};

const Empty = ({ text }: { text: string }) => <Alert severity="info">{text}</Alert>;

interface PostListProps {
  posts: FeedPost[];
  empty: string;
  actionLabel: string;
  busyId: string | null;
  destructive?: boolean;
  onAction: (id: string) => Promise<void>;
  onEdit?: (post: FeedPost) => void;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  empty,
  actionLabel,
  busyId,
  destructive = false,
  onAction,
  onEdit,
}) => {
  const { t, formatDate, formatNumber } = useI18n();

  return (
    <Stack spacing={1.25}>
      {posts.length === 0 ? <Empty text={empty} /> : posts.map((post) => (
        <Card key={post.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
          <CardContent sx={{ display: 'flex', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
            <Avatar
              variant="rounded"
              src={post.imageUrl}
              alt={t('게시글 미리보기', 'Post preview')}
              sx={{ width: 72, height: 72 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap>{post.caption || t('내용 없는 게시글', 'Post without text')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t(
                  `좋아요 ${formatNumber(post.likeCount)} · 댓글 ${formatNumber(post.commentCount)}`,
                  `${formatNumber(post.likeCount)} likes · ${formatNumber(post.commentCount)} comments`,
                )} · {formatDate(post.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {onEdit && <Button size="small" disabled={Boolean(busyId)} onClick={() => onEdit(post)}>{t('수정', 'Edit')}</Button>}
                <Button size="small" color={destructive ? 'error' : 'primary'} disabled={Boolean(busyId)} onClick={() => void onAction(post.id)}>
                  {busyId?.endsWith(post.id) ? t(`${actionLabel} 중…`, `${actionLabel}…`) : actionLabel}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

const SafetySection = ({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode[] }) => (
  <Box><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>{icon}<Typography variant="h5">{title}</Typography></Stack>{children.length === 0 ? <Empty text={empty} /> : <List disablePadding>{children}</List>}</Box>
);

export default Profile;
