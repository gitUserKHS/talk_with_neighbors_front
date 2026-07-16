import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Divider,
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
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ReportOutlinedIcon from '@mui/icons-material/ReportOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
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
import PostMediaCarousel from '../components/feed/PostMediaCarousel';
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
  removeFeedComment,
  removeFeedPost,
  replaceFeedComment,
  replaceFeedPost,
} from '../services/contentMutationState';
import { useI18n } from '../i18n/I18nProvider';
import {
  FeedDiscoveryMode,
  availableFeedModes,
  rankFeedPosts,
  resolveFeedMode,
} from '../services/feedDiscovery';

const FEED_PAGE_SIZE = 12;

const FeedContent: React.FC<{ currentUser: RootState['auth']['user'] }> = ({ currentUser }) => {
  const { locale, t, formatNumber, formatDate } = useI18n();
  const isGuest = !currentUser;
  const accessScope = accessScopeForUser(currentUser?.id);
  const [feedMode, setFeedMode] = useState<FeedDiscoveryMode>('RECOMMENDED');
  const effectiveFeedMode = resolveFeedMode(feedMode, !isGuest);
  const [loadedFeedMode, setLoadedFeedMode] = useState<FeedDiscoveryMode | null>(null);
  const [postSnapshot, setPostSnapshot] = useState<AccessScopedList<FeedPost>>({
    scope: null,
    items: [],
  });
  const posts = loadedFeedMode === effectiveFeedMode
    ? visibleScopedItems(postSnapshot, accessScope)
    : [];
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
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
  const [commentEditTarget, setCommentEditTarget] = useState<{ postId: string; comment: FeedComment } | null>(null);
  const [commentEditContent, setCommentEditContent] = useState('');
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<{ postId: string; comment: FeedComment } | null>(null);
  const [commentMutationId, setCommentMutationId] = useState<string | null>(null);
  const feedRequestGeneration = useRef(0);
  const viewGeneration = useRef(0);

  const requestError = (request: any, korean: string, english: string) => (
    locale === 'ko' && typeof request?.response?.data?.message === 'string'
      ? request.response.data.message
      : t(korean, english)
  );

  const displayDate = (value?: string | null) => value
    ? formatDate(value, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const setPosts = (update: React.SetStateAction<FeedPost[]>) => {
    setPostSnapshot((snapshot) => updateScopedItems(snapshot, accessScope, update));
  };

  const loadFeed = async (
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
        const byId = new Map(base.map((post) => [post.id, post]));
        (page.content ?? []).forEach((post) => byId.set(post.id, post));
        return {
          scope: requestScope,
          items: rankFeedPosts(Array.from(byId.values()), requestMode),
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
  };

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
    setCommentInputs({});
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
    setCommentEditTarget(null);
    setCommentDeleteTarget(null);
    setCommentMutationId(null);
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
  const handleToggleLike = async (post: FeedPost) => {
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
  };

  const handleToggleComments = async (postId: string) => {
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
  };

  const handleAddComment = async (postId: string) => {
    if (isGuest) return;
    const generation = viewGeneration.current;

    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const created = await feedService.addComment(postId, content);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), created],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, commentCount: (post.commentCount ?? 0) + 1 } : post
        )
      );
    } catch {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(t('댓글을 등록하지 못했습니다.', 'Could not post your comment.'));
    }
  };

  const handleRequestMatch = async (post: FeedPost) => {
    if (isGuest) return;
    const generation = viewGeneration.current;

    setRequestingMatch((prev) => ({ ...prev, [post.id]: true }));
    setError(null);

    try {
      await matchingService.requestMatch(post.authorId);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setSuccess(t(`${post.authorUsername}님에게 매칭 요청을 보냈습니다.`, `Match request sent to ${post.authorUsername}.`));
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(requestError(err, '매칭 요청을 보내지 못했습니다.', 'Could not send the match request.'));
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setRequestingMatch((prev) => ({ ...prev, [post.id]: false }));
      }
    }
  };

  const openSafetyMenu = (event: React.MouseEvent<HTMLElement>, post: FeedPost) => {
    if (isGuest) return;

    setMenuAnchor(event.currentTarget);
    setSelectedPost(post);
  };

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
      setSelectedPost(updated);
      setPostEditTarget(null);
      setSuccess(t('게시글을 수정했습니다.', 'Post updated.'));
    } catch (err: any) {
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
    } catch (err: any) {
      setError(requestError(err, '게시글을 삭제하지 못했습니다.', 'Could not delete the post.'));
    } finally {
      setPostMutationBusy(false);
    }
  };

  const startCommentEdit = (postId: string, comment: FeedComment) => {
    setCommentEditTarget({ postId, comment });
    setCommentEditContent(comment.content);
  };

  const submitCommentEdit = async () => {
    if (!commentEditTarget || commentMutationId) return;
    const content = commentEditContent.trim();
    if (!content) {
      setError(t('댓글 내용을 입력해 주세요.', 'Enter a comment.'));
      return;
    }
    const { postId, comment } = commentEditTarget;
    setCommentMutationId(comment.id);
    setError(null);
    try {
      const updated = await feedService.updateComment(comment.id, content);
      setComments((current) => replaceFeedComment(current, postId, updated));
      setCommentEditTarget(null);
      setSuccess(t('댓글을 수정했습니다.', 'Comment updated.'));
    } catch (err: any) {
      setError(requestError(err, '댓글을 수정하지 못했습니다.', 'Could not update the comment.'));
    } finally {
      setCommentMutationId(null);
    }
  };

  const submitCommentDelete = async () => {
    if (!commentDeleteTarget || commentMutationId) return;
    const { postId, comment } = commentDeleteTarget;
    setCommentMutationId(comment.id);
    setError(null);
    try {
      await feedService.deleteComment(comment.id);
      setComments((current) => removeFeedComment(current, postId, comment.id));
      setPosts((items) => decrementPostCommentCount(items, postId));
      setCommentDeleteTarget(null);
      if (commentEditTarget?.comment.id === comment.id) setCommentEditTarget(null);
      setSuccess(t('댓글을 삭제했습니다.', 'Comment deleted.'));
    } catch (err: any) {
      setError(requestError(err, '댓글을 삭제하지 못했습니다.', 'Could not delete the comment.'));
    } finally {
      setCommentMutationId(null);
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
    } catch (err: any) {
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
    } catch (err: any) {
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
      description: t('거리 정보가 있는 이야기를 가까운 순서로 먼저 보여드립니다.', 'Stories with distance data are shown from nearest to farthest.'),
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
                : t('관심사와 거리를 바탕으로 새로운 이웃 이야기를 발견해 보세요.', 'Discover neighborhood stories shaped by interests and distance.')}
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
            bgcolor: 'rgba(255,255,255,.96)',
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

        {posts.map((post) => {
          const isOwnPost = String(post.authorId) === String(currentUser?.id);
          const score = Math.round(post.compatibilityScore || 0);
          const interestTags = post.interestTags ?? [];
          const sharedInterests = post.sharedInterests ?? [];
          const likeCount = post.likeCount ?? 0;
          const commentCount = post.commentCount ?? 0;
          const hasMedia = Boolean(post.media?.length || post.imageUrl?.trim());
          const distanceLabel = post.distanceKm != null
            ? t(`${formatNumber(Number(post.distanceKm.toFixed(1)))}km`, `${formatNumber(Number(post.distanceKm.toFixed(1)))} km away`)
            : '';
          const postContext = [post.neighborhoodName, distanceLabel, displayDate(post.createdAt)].filter(Boolean).join(' · ');
          const recommendationReasonLabels: Record<string, string> = {
            SHARED_INTERESTS: t('공통 관심사', 'Shared interests'),
            NEARBY: t('가까운 이웃', 'Nearby neighbor'),
            RECENT: t('새로 올라옴', 'Recently posted'),
            POPULAR: t('이웃들이 주목', 'Popular nearby'),
          };
          const recommendationReason = (post.recommendationReasons ?? [])
            .map((reason) => recommendationReasonLabels[reason])
            .find(Boolean);

          return (
            <Card
              key={post.id}
              variant="outlined"
              sx={{
                borderRadius: { xs: 2.5, sm: 3 },
                overflow: 'hidden',
                boxShadow: { xs: 'none', sm: '0 10px 32px rgba(60, 44, 39, 0.055)' },
              }}
            >
              <CardHeader
                avatar={<Avatar src={post.authorProfileImage}>{post.authorUsername?.[0]}</Avatar>}
                title={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {post.authorUsername}
                    </Typography>
                    {post.official && (
                      <Chip
                        size="small"
                        icon={<VerifiedRoundedIcon />}
                        label={t('이웃톡 공식', 'Official')}
                        color="secondary"
                      />
                    )}
                    {!isGuest && !isOwnPost && score > 0 && (
                      <Chip size="small" color="primary" label={t(`궁합 ${score}점`, `${score}% match`)} />
                    )}
                    {!isGuest && effectiveFeedMode === 'RECOMMENDED' && recommendationReason && (
                      <Chip size="small" variant="outlined" label={recommendationReason} />
                    )}
                  </Stack>
                }
                subheader={postContext}
                action={!post.official && !isGuest ? (
                  <IconButton
                    aria-label={isOwnPost
                      ? t('게시글 관리 메뉴', 'Post options')
                      : t('안전 메뉴', 'Safety options')}
                    onClick={(event) => openSafetyMenu(event, post)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                ) : undefined}
              />
              {hasMedia && (
                <PostMediaCarousel post={post} />
              )}
              <CardContent sx={{ pt: hasMedia ? 1.5 : 0.5 }}>
                <Typography variant={hasMedia ? 'body1' : 'h6'} sx={{ whiteSpace: 'pre-wrap', fontWeight: hasMedia ? 400 : 650, lineHeight: 1.65 }}>
                  {!hasMedia && <Box component="span" sx={{ fontWeight: 800, mr: 0.75 }}>{post.authorUsername}</Box>}
                  {post.caption}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {interestTags.map((tag) => (
                    <Chip key={tag} size="small" label={`#${tag}`} />
                  ))}
                </Stack>
                {!isGuest && sharedInterests.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {t('함께 좋아하는 관심사', 'Shared interests')}: {sharedInterests.join(', ')}
                  </Typography>
                )}
                <CardActions disableSpacing sx={{ px: 0, minHeight: 52, mt: 0.5 }}>
                  {isGuest ? (
                    <Stack direction="row" spacing={2} alignItems="center" color="text.secondary" sx={{ px: 0.75 }}>
                      <Stack direction="row" spacing={0.6} alignItems="center" aria-label={t(`좋아요 ${formatNumber(likeCount)}개`, `${formatNumber(likeCount)} likes`)}>
                        <FavoriteBorderIcon fontSize="small" />
                        <Typography variant="body2" fontWeight={700}>{formatNumber(likeCount)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.6} alignItems="center" aria-label={t(`댓글 ${formatNumber(commentCount)}개`, `${formatNumber(commentCount)} comments`)}>
                        <ChatBubbleOutlineIcon fontSize="small" />
                        <Typography variant="body2" fontWeight={700}>{formatNumber(commentCount)}</Typography>
                      </Stack>
                    </Stack>
                  ) : (
                    <>
                      <Button
                        aria-label={post.likedByCurrentUser ? t('좋아요 취소', 'Unlike post') : t('좋아요', 'Like post')}
                        onClick={() => handleToggleLike(post)}
                        color={post.likedByCurrentUser ? 'error' : 'inherit'}
                        startIcon={post.likedByCurrentUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                        sx={{ minWidth: 0, px: 1 }}
                      >
                        {formatNumber(likeCount)}
                      </Button>
                      <Button
                        color="inherit"
                        aria-label={t('댓글 보기', 'View comments')}
                        onClick={() => handleToggleComments(post.id)}
                        startIcon={<ChatBubbleOutlineIcon />}
                        sx={{ minWidth: 0, px: 1 }}
                      >
                        {formatNumber(commentCount)}
                      </Button>
                    </>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  {!isGuest && !isOwnPost && !post.official && (
                    <Button
                      size="small"
                      startIcon={<PersonAddAltIcon />}
                      disabled={requestingMatch[post.id]}
                      onClick={() => handleRequestMatch(post)}
                    >
                      {t('매칭 요청', 'Connect')}
                    </Button>
                  )}
                </CardActions>
                {isGuest ? (
                  <Button
                    component={RouterLink}
                    to="/login"
                    state={{ from: { pathname: '/feed' } }}
                    size="small"
                    sx={{ mt: 1, px: 0 }}
                  >
                    {t(
                      `댓글 ${formatNumber(commentCount)}개 · 로그인하고 참여하기`,
                      `${formatNumber(commentCount)} comments · Sign in to join`,
                    )}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    sx={{ mt: 1, px: 0 }}
                    onClick={() => handleToggleComments(post.id)}
                  >
                    {t(`댓글 ${formatNumber(commentCount)}개 보기`, `View ${formatNumber(commentCount)} comments`)}
                  </Button>
                )}

                {!isGuest && expandedComments[post.id] && (
                  <Box sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack spacing={1.25}>
                      {(comments[post.id] || []).map((comment) => {
                        const isOwnComment = String(comment.authorId) === String(currentUser?.id);
                        const isEditingComment = commentEditTarget?.comment.id === comment.id;
                        const isMutatingComment = commentMutationId === comment.id;
                        return (
                          <Box key={comment.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Avatar src={comment.authorProfileImage} sx={{ width: 28, height: 28 }}>
                              {comment.authorUsername?.[0]}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              {isEditingComment ? (
                                <Stack spacing={0.75}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    multiline
                                    maxRows={5}
                                    autoFocus
                                    value={commentEditContent}
                                    disabled={isMutatingComment}
                                    inputProps={{ maxLength: 1000, 'aria-label': t('수정할 댓글', 'Edit comment') }}
                                    onChange={(event) => setCommentEditContent(event.target.value)}
                                  />
                                  <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                                    <Button size="small" disabled={isMutatingComment} onClick={() => setCommentEditTarget(null)}>{t('취소', 'Cancel')}</Button>
                                    <Button size="small" variant="contained" disabled={isMutatingComment || !commentEditContent.trim()} onClick={submitCommentEdit}>
                                      {isMutatingComment ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
                                    </Button>
                                  </Stack>
                                </Stack>
                              ) : (
                                <>
                                  <Typography variant="body2">
                                    <strong>{comment.authorUsername}</strong> {comment.content}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {comment.updatedAt && comment.updatedAt !== comment.createdAt ? `${t('수정됨', 'Edited')} · ` : ''}
                                    {displayDate(comment.createdAt)}
                                  </Typography>
                                </>
                              )}
                            </Box>
                            {isOwnComment && !isEditingComment && (
                              <Stack direction="row" spacing={0.25}>
                                <Tooltip title={t('댓글 수정', 'Edit comment')}>
                                  <span>
                                    <IconButton aria-label={t('댓글 수정', 'Edit comment')} size="small" disabled={isMutatingComment} onClick={() => startCommentEdit(post.id, comment)}>
                                      <EditOutlinedIcon fontSize="inherit" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title={t('댓글 삭제', 'Delete comment')}>
                                  <span>
                                    <IconButton aria-label={t('댓글 삭제', 'Delete comment')} size="small" disabled={isMutatingComment} onClick={() => setCommentDeleteTarget({ postId: post.id, comment })}>
                                      <DeleteOutlineIcon fontSize="inherit" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            )}
                          </Box>
                        );
                      })}
                      <Stack direction="row" spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={t('댓글 쓰기', 'Write a comment')}
                          value={commentInputs[post.id] || ''}
                          onChange={(event) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                        />
                        <Button onClick={() => handleAddComment(post.id)}>{t('게시', 'Post')}</Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}

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

      {!isGuest && <Dialog open={Boolean(commentDeleteTarget)} onClose={() => !commentMutationId && setCommentDeleteTarget(null)}>
        <DialogTitle>{t('댓글을 삭제하시겠어요?', 'Delete this comment?')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>{t('삭제한 댓글은 되돌릴 수 없습니다.', 'Deleted comments cannot be restored.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(commentMutationId)} onClick={() => setCommentDeleteTarget(null)}>{t('취소', 'Cancel')}</Button>
          <Button color="error" variant="contained" disabled={Boolean(commentMutationId)} onClick={submitCommentDelete}>
            {commentMutationId ? t('삭제 중…', 'Deleting…') : t('삭제', 'Delete')}
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
