import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alpha } from '@mui/material/styles';
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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Checkbox,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ReportOutlinedIcon from '@mui/icons-material/ReportOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import feedService from '../services/feedService';
import matchingService from '../services/matchingService';
import { FeedComment, FeedPost } from '../types/feed';
import { RootState } from '../store/types';
import safetyService from '../services/safetyService';
import { ReportReason } from '../types/safety';
import FeedPostCard from '../components/feed/FeedPostCard';
import {
  AccessScope,
  AccessScopedList,
  accessScopeForUser,
  apiAccessForScope,
  isLatestRequest,
  updateScopedItems,
  visibleScopedItems,
} from '../services/accessScope';
import {
  decrementPostCommentCount,
  mergeFeedPostDiscoveryMetadata,
  removeFeedComment,
  removeFeedPost,
  replaceFeedComment,
  replaceFeedPost,
} from '../services/contentMutationState';
import { useI18n } from '../i18n/I18nProvider';
import { serverErrorMessage } from '../services/apiError';
import {
  FeedDiscoveryMode,
  availableFeedModes,
  mergeServerOrderedFeedPosts,
  resolveFeedMode,
} from '../services/feedDiscovery';

const FEED_PAGE_SIZE = 12;

const FeedContent: React.FC<{ currentUser: RootState['auth']['user'] }> = ({ currentUser }) => {
  const { locale, t } = useI18n();
  const isGuest = !currentUser;
  const currentUserId = currentUser?.id;
  // Memoized so the React Compiler lint treats them as frozen values inside the
  // useCallback dependency lists below.
  const accessScope = useMemo(() => accessScopeForUser(currentUserId), [currentUserId]);
  const [feedMode, setFeedMode] = useState<FeedDiscoveryMode>('RECOMMENDED');
  const effectiveFeedMode = useMemo(() => resolveFeedMode(feedMode, !isGuest), [feedMode, isGuest]);
  const [loadedFeedMode, setLoadedFeedMode] = useState<FeedDiscoveryMode | null>(null);
  const [postSnapshot, setPostSnapshot] = useState<AccessScopedList<FeedPost>>({
    scope: null,
    items: [],
  });
  const posts = loadedFeedMode === effectiveFeedMode
    ? visibleScopedItems(postSnapshot, accessScope)
    : [];
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [requestingMatch, setRequestingMatch] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [hideAfterReport, setHideAfterReport] = useState(true);
  const [safetySubmitting, setSafetySubmitting] = useState(false);
  const [postEditTarget, setPostEditTarget] = useState<FeedPost | null>(null);
  const [postEditCaption, setPostEditCaption] = useState('');
  const [postEditTags, setPostEditTags] = useState('');
  const [postEditPublicPreview, setPostEditPublicPreview] = useState(false);
  const [postDeleteTarget, setPostDeleteTarget] = useState<FeedPost | null>(null);
  const [postMutationBusy, setPostMutationBusy] = useState(false);
  const feedRequestGeneration = useRef(0);
  const viewGeneration = useRef(0);

  // Everything handed to FeedPostCard is memoized: the card is React.memo and
  // a fresh callback per render would defeat that.
  const requestError = useCallback((request: unknown, korean: string, english: string) => (
    (locale === 'ko' ? serverErrorMessage(request) : undefined) ?? t(korean, english)
  ), [locale, t]);

  const setPosts = useCallback((update: React.SetStateAction<FeedPost[]>) => {
    setPostSnapshot((snapshot) => updateScopedItems(snapshot, accessScope, update));
  }, [accessScope]);

  const loadFeed = useCallback(async (
    requestScope: AccessScope = accessScope,
    pageNumber = 0,
    append = false,
    requestMode: FeedDiscoveryMode = effectiveFeedMode,
  ) => {
    const requestId = ++feedRequestGeneration.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const page = await feedService.getFeed(
        pageNumber,
        FEED_PAGE_SIZE,
        apiAccessForScope(requestScope),
        { mode: requestMode },
      );
      if (!isLatestRequest(requestId, feedRequestGeneration.current)) return;
      setPostSnapshot((snapshot) => {
        const base = append && snapshot.scope === requestScope ? snapshot.items : [];
        return {
          scope: requestScope,
          items: mergeServerOrderedFeedPosts(base, page.content ?? []),
        };
      });
      setLoadedFeedMode(requestMode);
      setFeedPage(page.number ?? pageNumber);
      setHasMore(page.last === false && pageNumber + 1 < (page.totalPages || Number.MAX_SAFE_INTEGER));
    } catch {
      if (!isLatestRequest(requestId, feedRequestGeneration.current)) return;
      setError(t('피드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not load the feed. Please try again shortly.'));
    } finally {
      if (isLatestRequest(requestId, feedRequestGeneration.current)) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [accessScope, effectiveFeedMode, t]);

  useEffect(() => {
    if (feedMode !== effectiveFeedMode) setFeedMode(effectiveFeedMode);
  }, [effectiveFeedMode, feedMode]);

  useEffect(() => {
    const generation = ++viewGeneration.current;
    ++feedRequestGeneration.current;
    setPostSnapshot({ scope: null, items: [] });
    setLoadedFeedMode(null);
    setFeedPage(0);
    setHasMore(false);
    setLoadingMore(false);
    setComments({});
    setExpandedComments({});
    setRequestingMatch({});
    setError(null);
    setSuccess(null);
    setMenuAnchor(null);
    setSelectedPost(null);
    setReportOpen(false);
    setReportReason('HARASSMENT');
    setReportDetails('');
    setHideAfterReport(true);
    setSafetySubmitting(false);
    setPostEditTarget(null);
    setPostDeleteTarget(null);
    setPostMutationBusy(false);
    void loadFeed(accessScope, 0, false, effectiveFeedMode);

    return () => {
      if (viewGeneration.current === generation) {
        ++viewGeneration.current;
      }
      ++feedRequestGeneration.current;
    };
  }, [accessScope, effectiveFeedMode]);

  const emptyMessage = useMemo(() => {
    if (loading) return '';
    if (posts.length > 0) return '';
    if (isGuest) return t('아직 공개된 게시글이 없습니다.', 'There are no public posts yet.');
    if (effectiveFeedMode === 'NEARBY') return t('가까운 이웃의 이야기가 아직 없습니다.', 'There are no nearby stories yet.');
    if (effectiveFeedMode === 'LATEST') return t('새로 올라온 이야기가 아직 없습니다.', 'There are no recent stories yet.');
    return t('현재 추천할 이웃 이야기가 없습니다.', 'There are no recommended stories right now.');
  }, [effectiveFeedMode, isGuest, loading, posts.length, t]);
  const recommendationReasonLabels = useMemo<Record<string, string>>(() => ({
    SHARED_INTERESTS: t('공통 관심사', 'Shared interests'),
    NEARBY: t('가까운 이웃', 'Nearby neighbor'),
    RECENT: t('새로 올라옴', 'Recently posted'),
    POPULAR: t('이웃들이 주목', 'Popular nearby'),
  }), [t]);

  const handleToggleLike = useCallback(async (post: FeedPost) => {
    if (isGuest) return;
    const generation = viewGeneration.current;

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              likedByCurrentUser: !item.likedByCurrentUser,
              likeCount: item.likedByCurrentUser
                ? Math.max(0, (item.likeCount ?? 0) - 1)
                : (item.likeCount ?? 0) + 1,
            }
          : item
      )
    );

    try {
      if (post.likedByCurrentUser) {
        await feedService.unlikePost(post.id);
      } else {
        await feedService.likePost(post.id);
      }
    } catch {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(t('좋아요를 처리하지 못했습니다.', 'Could not update the like.'));
      void loadFeed();
    }
  }, [isGuest, loadFeed, setPosts, t]);

  const handleToggleComments = useCallback(async (postId: string) => {
    if (isGuest) return;
    const generation = viewGeneration.current;

    const willOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: willOpen }));

    if (willOpen && !comments[postId]) {
      try {
        const result = await feedService.getComments(postId);
        if (!isLatestRequest(generation, viewGeneration.current)) return;
        setComments((prev) => ({ ...prev, [postId]: result }));
      } catch {
        if (!isLatestRequest(generation, viewGeneration.current)) return;
        setError(t('댓글을 불러오지 못했습니다.', 'Could not load comments.'));
      }
    }
  }, [comments, expandedComments, isGuest, t]);

  // FeedCommentThread performs the comment requests itself; these only fold the
  // persisted result into the shared comment map and the post counters.
  const handleCommentAdded = useCallback((postId: string, created: FeedComment) => {
    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), created],
    }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, commentCount: (post.commentCount ?? 0) + 1 } : post
      )
    );
  }, [setPosts]);

  const handleCommentUpdated = useCallback((postId: string, updated: FeedComment) => {
    setComments((current) => replaceFeedComment(current, postId, updated));
  }, []);

  const handleCommentDeleted = useCallback((postId: string, commentId: string) => {
    setComments((current) => removeFeedComment(current, postId, commentId));
    setPosts((items) => decrementPostCommentCount(items, postId));
  }, [setPosts]);

  const handleRequestMatch = useCallback(async (post: FeedPost) => {
    if (isGuest) return;
    const generation = viewGeneration.current;

    setRequestingMatch((prev) => ({ ...prev, [post.id]: true }));
    setError(null);

    try {
      await matchingService.requestMatch(post.authorId);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setSuccess(t(`${post.authorUsername}님에게 매칭 요청을 보냈습니다.`, `Match request sent to ${post.authorUsername}.`));
    } catch (err) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(requestError(err, '매칭 요청을 보내지 못했습니다.', 'Could not send the match request.'));
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setRequestingMatch((prev) => ({ ...prev, [post.id]: false }));
      }
    }
  }, [isGuest, requestError, t]);

  const openSafetyMenu = useCallback((event: React.MouseEvent<HTMLElement>, post: FeedPost) => {
    if (isGuest) return;

    setMenuAnchor(event.currentTarget);
    setSelectedPost(post);
  }, [isGuest]);

  const closeSafetyMenu = () => setMenuAnchor(null);

  const openPostEdit = () => {
    if (!selectedPost) return;
    closeSafetyMenu();
    setPostEditTarget(selectedPost);
    setPostEditCaption(selectedPost.caption ?? '');
    setPostEditTags((selectedPost.interestTags ?? []).join(', '));
    setPostEditPublicPreview(Boolean(selectedPost.publicPreview));
  };

  const submitPostEdit = async () => {
    if (!postEditTarget || postMutationBusy) return;
    const caption = postEditCaption.trim();
    const tags = postEditTags
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
      .filter((tag, index, values) => values.indexOf(tag) === index)
      .slice(0, 10);
    if (!caption) {
      setError(t('게시글 내용을 입력해 주세요.', 'Enter a caption for your post.'));
      return;
    }

    setPostMutationBusy(true);
    setError(null);
    try {
      const updated = await feedService.updatePost(postEditTarget.id, {
        caption,
        interestTags: tags,
        publicPreview: postEditPublicPreview,
      });
      setPosts((items) => replaceFeedPost(items, updated));
      setSelectedPost(mergeFeedPostDiscoveryMetadata(postEditTarget, updated));
      setPostEditTarget(null);
      setSuccess(t('게시글을 수정했습니다.', 'Post updated.'));
    } catch (err) {
      setError(requestError(err, '게시글을 수정하지 못했습니다.', 'Could not update the post.'));
    } finally {
      setPostMutationBusy(false);
    }
  };

  const confirmPostDelete = () => {
    if (!selectedPost) return;
    closeSafetyMenu();
    setPostDeleteTarget(selectedPost);
  };

  const submitPostDelete = async () => {
    if (!postDeleteTarget || postMutationBusy) return;
    const postId = postDeleteTarget.id;
    setPostMutationBusy(true);
    setError(null);
    try {
      await feedService.deletePost(postId);
      setPosts((items) => removeFeedPost(items, postId));
      setComments((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setPostDeleteTarget(null);
      setSelectedPost(null);
      setSuccess(t('게시글을 삭제했습니다.', 'Post deleted.'));
    } catch (err) {
      setError(requestError(err, '게시글을 삭제하지 못했습니다.', 'Could not delete the post.'));
    } finally {
      setPostMutationBusy(false);
    }
  };

  const handleHidePost = async () => {
    if (!selectedPost) return;
    const generation = viewGeneration.current;
    const post = selectedPost;
    closeSafetyMenu();
    try {
      await safetyService.hide('FEED_POST', post.id);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setSuccess(t('이 게시물을 내 피드에서 숨겼습니다.', 'This post is now hidden from your feed.'));
    } catch {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(t('게시물을 숨기지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not hide the post. Please try again shortly.'));
    }
  };

  const handleBlockUser = async () => {
    if (!selectedPost) return;
    const generation = viewGeneration.current;
    const post = selectedPost;
    closeSafetyMenu();
    if (!window.confirm(t(
      `${post.authorUsername}님을 차단하시겠어요? 서로의 추천, 피드, 1:1 채팅에서 제외됩니다.`,
      `Block ${post.authorUsername}? You will no longer see each other in recommendations, the feed, or one-to-one chats.`,
    ))) return;
    try {
      await safetyService.blockUser(post.authorId);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setPosts((prev) => prev.filter((item) => item.authorId !== post.authorId));
      setSuccess(t(`${post.authorUsername}님을 차단했습니다.`, `${post.authorUsername} has been blocked.`));
    } catch (err) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(requestError(err, '사용자를 차단하지 못했습니다.', 'Could not block this user.'));
    }
  };

  const openReportDialog = () => {
    closeSafetyMenu();
    setReportReason('HARASSMENT');
    setReportDetails('');
    setHideAfterReport(true);
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!selectedPost) return;
    const generation = viewGeneration.current;
    const post = selectedPost;
    setSafetySubmitting(true);
    try {
      await safetyService.report({
        targetType: 'FEED_POST',
        targetId: post.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        hideContent: hideAfterReport,
      });
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      if (hideAfterReport) setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setReportOpen(false);
      setSuccess(t('신고를 접수했습니다. 안전하게 검토하겠습니다.', 'Your report has been submitted for review.'));
    } catch (err) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(requestError(err, '신고를 접수하지 못했습니다.', 'Could not submit the report.'));
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setSafetySubmitting(false);
      }
    }
  };

  const discoveryOptions = useMemo(() => {
    const options = [{
      value: 'RECOMMENDED' as const,
      label: t('추천', 'For you'),
      icon: <AutoAwesomeRoundedIcon fontSize="small" />,
      description: isGuest
        ? t('최신성과 이웃의 반응을 함께 살펴 공개 이야기를 보여드립니다.', 'Public stories are ordered using freshness and neighborhood activity.')
        : t('공유 관심사, 취향 일치도, 최신성과 반응을 함께 반영합니다.', 'Shared interests, compatibility, freshness, and activity shape this view.'),
    },
    {
      value: 'NEARBY' as const,
      label: t('가까운', 'Nearby'),
      icon: <NearMeRoundedIcon fontSize="small" />,
      description: t('정확한 거리는 공개하지 않고 가까운 동네의 이야기를 보여드립니다.', 'Nearby stories are ranked without revealing exact distances.'),
    },
    {
      value: 'LATEST' as const,
      label: t('최신', 'Latest'),
      icon: <ScheduleRoundedIcon fontSize="small" />,
      description: t('작성 시간을 기준으로 새로운 이야기를 먼저 보여드립니다.', 'Stories are ordered by their publication time, newest first.'),
    }];

    const availableModes = availableFeedModes(!isGuest);
    return options.filter(({ value }) => availableModes.includes(value));
  }, [isGuest, t]);
  const activeDiscovery = discoveryOptions.find(({ value }) => value === effectiveFeedMode) ?? discoveryOptions[0];

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 1.75, sm: 3.5 }, px: { xs: 1.25, sm: 3 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 720px) 280px' }, gap: 3.5, justifyContent: 'center', alignItems: 'start' }}>
      <Stack spacing={2.25} sx={{ width: '100%', minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.25, sm: 2 },
            px: { xs: 0.5, sm: 0 },
            pb: 0.25,
          }}
        >
          <Box sx={{ minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.65rem', sm: '2rem' } }}>
              {t('이웃 피드', 'Neighborhood feed')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isGuest
                ? t('이웃들이 공개한 이야기를 발견해 보세요.', 'Discover public stories shared by neighbors.')
                : t('관심사와 동네를 바탕으로 새로운 이웃 이야기를 발견해 보세요.', 'Discover neighborhood stories shaped by interests and community.')}
            </Typography>
          </Box>
          <Stack
            direction="row"
            useFlexGap
            sx={{
              width: { xs: '100%', sm: 'auto' },
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
            }}
          >
            <Tooltip title={t('새로고침', 'Refresh')}>
              <IconButton disabled={loading || loadingMore} aria-label={t('피드 새로고침', 'Refresh feed')} onClick={() => void loadFeed()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {isGuest ? (
              <Button
                component={RouterLink}
                to="/login"
                state={{ from: { pathname: '/feed' } }}
                variant="contained"
              >
                {t('로그인', 'Sign in')}
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to="/post/new"
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
              >
                {t('글쓰기', 'New post')}
              </Button>
            )}
          </Stack>
        </Box>

        <Paper
          elevation={0}
          sx={{
            position: 'sticky',
            top: { xs: 62, sm: 70 },
            zIndex: 5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2.5,
            overflow: 'hidden',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
            backdropFilter: 'blur(18px)',
          }}
        >
          <Tabs
            value={effectiveFeedMode}
            onChange={(_, value: FeedDiscoveryMode) => setFeedMode(value)}
            variant="fullWidth"
            aria-label={t('피드 발견 기준', 'Feed discovery mode')}
            sx={{ minHeight: 52, '& .MuiTab-root': { minHeight: 52, fontWeight: 800 } }}
          >
            {discoveryOptions.map((option) => (
              <Tab
                key={option.value}
                value={option.value}
                icon={option.icon}
                iconPosition="start"
                label={option.label}
                aria-label={t(`${option.label} 피드`, `${option.label} feed`)}
              />
            ))}
          </Tabs>
        </Paper>

        {isGuest && (
          <Alert
            severity="info"
            variant="outlined"
            icon={false}
            sx={{
              '& .MuiAlert-message': { minWidth: 0 },
              '& .MuiAlert-action': { flexShrink: 0 },
              py: 0.5,
              bgcolor: 'rgba(35, 133, 121, 0.04)',
              borderColor: 'rgba(35, 133, 121, 0.24)',
            }}
            action={(
              <Button
                component={RouterLink}
                to="/login"
                state={{ from: { pathname: '/feed' } }}
                color="inherit"
                size="small"
                sx={{ minWidth: 'fit-content', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {t('로그인', 'Sign in')}
              </Button>
            )}
          >
            {t('현재 둘러보기 모드입니다. 좋아요, 댓글, 매칭 기능은 로그인 후 이용할 수 있습니다.', 'You are browsing public posts. Sign in to like, comment, and connect with neighbors.')}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading && (
          <Box role="status" aria-live="polite" aria-label={t('피드 불러오는 중', 'Loading feed')} sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {emptyMessage && (
          <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}>
            <CardContent sx={{ py: { xs: 5, sm: 7 }, textAlign: 'center' }}>
              <Typography variant="h6">{emptyMessage}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {isGuest
                  ? t('새 이야기가 올라오면 이곳에 표시됩니다.', 'New public stories will appear here.')
                  : t('일상의 순간이나 관심사를 이웃과 공유해 보세요.', 'Share a moment or an interest with your neighbors.')}
              </Typography>
              {!isGuest && (
                <Button component={RouterLink} to="/post/new" variant="contained" startIcon={<AddPhotoAlternateIcon />} sx={{ mt: 2.5 }}>
                  {t('첫 게시글 작성하기', 'Create your first post')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            isGuest={isGuest}
            currentUserId={currentUserId}
            feedMode={effectiveFeedMode}
            expanded={Boolean(expandedComments[post.id])}
            comments={comments[post.id]}
            requestingMatch={Boolean(requestingMatch[post.id])}
            recommendationReasonLabels={recommendationReasonLabels}
            onToggleLike={handleToggleLike}
            onToggleComments={handleToggleComments}
            onRequestMatch={handleRequestMatch}
            onOpenMenu={openSafetyMenu}
            onCommentAdded={handleCommentAdded}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
            onError={setError}
            onSuccess={setSuccess}
          />
        ))}

        {!loading && posts.length > 0 && (
          <Box sx={{ display: 'grid', placeItems: 'center', pt: 0.5, pb: 2 }}>
            {hasMore ? (
              <Button
                variant="outlined"
                startIcon={loadingMore ? <CircularProgress size={18} /> : <ArrowDownwardRoundedIcon />}
                disabled={loadingMore}
                aria-busy={loadingMore}
                onClick={() => void loadFeed(accessScope, feedPage + 1, true, effectiveFeedMode)}
              >
                {loadingMore ? t('다음 이야기 불러오는 중…', 'Loading more stories…') : t('이야기 더 보기', 'Load more stories')}
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" role="status">
                {t('지금 볼 수 있는 이야기를 모두 확인했습니다.', 'You are all caught up for now.')}
              </Typography>
            )}
          </Box>
        )}
      </Stack>

      <Stack
        component="aside"
        spacing={2}
        sx={{ display: { xs: 'none', lg: 'flex' }, position: 'sticky', top: 94 }}
      >
        <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" color="primary.main">
              {activeDiscovery.icon}
              <Typography variant="subtitle1" color="text.primary" fontWeight={850}>{activeDiscovery.label}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65 }}>
              {activeDiscovery.description}
            </Typography>
            {!isGuest && currentUser?.interests && currentUser.interests.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                {currentUser.interests.slice(0, 4).map((interest) => (
                  <Chip key={interest} size="small" variant="outlined" label={`#${interest}`} />
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={850}>{t('더 발견하기', 'Discover more')}</Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Button component={RouterLink} to="/meetups" color="inherit" sx={{ justifyContent: 'flex-start', px: 1 }}>
                {t('가까운 모임 둘러보기', 'Browse nearby meetups')}
              </Button>
              {!isGuest && (
                <Button component={RouterLink} to="/matching" color="inherit" sx={{ justifyContent: 'flex-start', px: 1 }}>
                  {t('잘 맞는 이웃 만나기', 'Meet compatible neighbors')}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
      </Box>

      {!isGuest && <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeSafetyMenu}>
        {selectedPost && String(selectedPost.authorId) === String(currentUser?.id) ? [
          <MenuItem key="edit" onClick={openPostEdit}>
            <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('게시글 수정', 'Edit post')}
          </MenuItem>,
          <MenuItem key="delete" onClick={confirmPostDelete} sx={{ color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('게시글 삭제', 'Delete post')}
          </MenuItem>,
        ] : [
          <MenuItem key="hide" onClick={handleHidePost}>
            <VisibilityOffOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('게시물 숨기기', 'Hide post')}
          </MenuItem>,
          <MenuItem key="report" onClick={openReportDialog}>
            <ReportOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('게시물 신고하기', 'Report post')}
          </MenuItem>,
          <MenuItem key="block" onClick={handleBlockUser} sx={{ color: 'error.main' }}>
            <BlockOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> {t('사용자 차단하기', 'Block user')}
          </MenuItem>,
        ]}
      </Menu>}

      {!isGuest && <Dialog open={Boolean(postEditTarget)} onClose={() => !postMutationBusy && setPostEditTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('게시글 수정', 'Edit post')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">{t('첨부한 사진과 동영상은 그대로 유지됩니다.', 'Your attached photos and videos will stay unchanged.')}</Alert>
            <TextField
              label={t('글 내용', 'Caption')}
              multiline
              minRows={4}
              fullWidth
              required
              value={postEditCaption}
              disabled={postMutationBusy}
              inputProps={{ maxLength: 1000 }}
              helperText={`${postEditCaption.length} / 1000`}
              onChange={(event) => setPostEditCaption(event.target.value)}
            />
            <TextField
              label={t('관심사 태그', 'Interest tags')}
              fullWidth
              value={postEditTags}
              disabled={postMutationBusy}
              helperText={t('쉼표로 구분해 최대 10개까지 입력해 주세요.', 'Enter up to 10 tags, separated by commas.')}
              onChange={(event) => setPostEditTags(event.target.value)}
            />
            <FormControlLabel
              control={<Checkbox checked={postEditPublicPreview} disabled={postMutationBusy} onChange={(event) => setPostEditPublicPreview(event.target.checked)} />}
              label={t('로그인 전 공개 미리보기 허용', 'Allow a public preview before sign-in')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={postMutationBusy} onClick={() => setPostEditTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" disabled={postMutationBusy || !postEditCaption.trim()} onClick={submitPostEdit}>
            {postMutationBusy ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>}

      {!isGuest && <Dialog open={Boolean(postDeleteTarget)} onClose={() => !postMutationBusy && setPostDeleteTarget(null)}>
        <DialogTitle>{t('게시글을 삭제하시겠어요?', 'Delete this post?')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>{t('사진·동영상과 댓글이 함께 삭제되며 되돌릴 수 없습니다.', 'Photos, videos, and comments will also be deleted. This cannot be undone.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={postMutationBusy} onClick={() => setPostDeleteTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button color="error" variant="contained" disabled={postMutationBusy} onClick={submitPostDelete}>
            {postMutationBusy ? t('삭제 중…', 'Deleting…') : t('삭제', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>}

      {!isGuest && <Dialog open={reportOpen} onClose={() => !safetySubmitting && setReportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('게시물 신고하기', 'Report post')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{t('신고한 사실은 게시물 작성자에게 공개되지 않습니다.', 'The post author will not be told who submitted the report.')}</Alert>
            <FormControl fullWidth>
              <InputLabel id="report-reason-label">{t('신고 사유', 'Reason')}</InputLabel>
              <Select
                labelId="report-reason-label"
                value={reportReason}
                label={t('신고 사유', 'Reason')}
                onChange={(event) => setReportReason(event.target.value as ReportReason)}
              >
                <MenuItem value="HARASSMENT">{t('괴롭힘 또는 위협', 'Harassment or threats')}</MenuItem>
                <MenuItem value="HATE_SPEECH">{t('혐오 표현', 'Hate speech')}</MenuItem>
                <MenuItem value="SPAM">{t('스팸 또는 홍보', 'Spam or promotion')}</MenuItem>
                <MenuItem value="INAPPROPRIATE_CONTENT">{t('부적절한 콘텐츠', 'Inappropriate content')}</MenuItem>
                <MenuItem value="IMPERSONATION">{t('사칭', 'Impersonation')}</MenuItem>
                <MenuItem value="PRIVACY">{t('개인정보 노출', 'Privacy violation')}</MenuItem>
                <MenuItem value="OTHER">{t('기타', 'Other')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('상세 설명 (선택)', 'Additional details (optional)')}
              multiline
              minRows={3}
              inputProps={{ maxLength: 1000 }}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
            />
            <FormControlLabel
              control={<Checkbox checked={hideAfterReport} onChange={(event) => setHideAfterReport(event.target.checked)} />}
              label={t('신고 후 이 게시물 숨기기', 'Hide this post after reporting')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)} disabled={safetySubmitting}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={submitReport} disabled={safetySubmitting}>
            {safetySubmitting ? t('접수 중…', 'Submitting…') : t('신고 접수', 'Submit report')}
          </Button>
        </DialogActions>
      </Dialog>}
    </Container>
  );
};

const Feed: React.FC = () => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessScope = accessScopeForUser(currentUser?.id);
  return <FeedContent key={accessScope} currentUser={currentUser} />;
};

export default Feed;
