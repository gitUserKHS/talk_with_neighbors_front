import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ReportOutlinedIcon from '@mui/icons-material/ReportOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { isAxiosError } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import feedService from '../services/feedService';
import matchingService from '../services/matchingService';
import safetyService from '../services/safetyService';
import { FeedComment, FeedPost } from '../types/feed';
import { ReportReason } from '../types/safety';
import { AppDispatch, RootState } from '../store/types';
import { addNotification } from '../store/slices/notificationSlice';
import FeedPostCard from '../components/feed/FeedPostCard';
import { accessScopeForUser } from '../services/accessScope';
import { useI18n } from '../i18n/I18nProvider';
import { useApiError } from '../i18n/useApiError';
import { errorCode } from '../services/apiError';

const NO_RECOMMENDATION_LABELS: Record<string, string> = {};

/**
 * The permalink target is gone (deleted, hidden by a block, or never existed).
 * getPostForViewer answers a block relationship with 403 FEED_BLOCKED, which the
 * page shows as the same neutral empty state instead of a retry prompt.
 */
const isPostUnavailable = (error: unknown): boolean => {
  const code = errorCode(error);
  return (isAxiosError(error) && error.response?.status === 404)
    || code === 'FEED_POST_NOT_FOUND'
    || code === 'FEED_BLOCKED';
};

const PostDetailContent: React.FC<{ postId: string; currentUser: RootState['auth']['user'] }> = ({
  postId,
  currentUser,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const isGuest = !currentUser;
  const currentUserId = currentUser?.id;
  const [post, setPost] = useState<FeedPost | null>(null);
  // null until the first comment request settles so the thread does not flash empty.
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requestingMatch, setRequestingMatch] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [postEditOpen, setPostEditOpen] = useState(false);
  const [postEditCaption, setPostEditCaption] = useState('');
  const [postEditTags, setPostEditTags] = useState('');
  const [postEditPublicPreview, setPostEditPublicPreview] = useState(false);
  const [postDeleteOpen, setPostDeleteOpen] = useState(false);
  const [postMutationBusy, setPostMutationBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [hideAfterReport, setHideAfterReport] = useState(true);
  const [safetySubmitting, setSafetySubmitting] = useState(false);
  // The parent remounts this component per post and per session, so a mounted
  // flag is all the async handlers need to skip stale results.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Server error codes (e.g. FEED_BLOCKED on like/comment) resolve to localized copy in every locale.
  const requestError = useApiError();

  /** Resolves to true when the post is on screen; a vanished post switches to the empty state. */
  const loadPost = useCallback(async (): Promise<boolean> => {
    try {
      const loaded = await feedService.getPost(postId);
      if (!mounted.current) return false;
      setPost(loaded);
      return true;
    } catch (err) {
      if (!mounted.current) return false;
      if (isPostUnavailable(err)) {
        setPost(null);
        setUnavailable(true);
      } else {
        setError(requestError(err, '게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not load the post. Please try again shortly.'));
      }
      return false;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [postId, requestError]);

  useEffect(() => {
    const load = async () => {
      if (!(await loadPost()) || !mounted.current) return;
      try {
        const loaded = await feedService.getComments(postId);
        if (mounted.current) setComments(loaded);
      } catch {
        if (!mounted.current) return;
        setComments([]);
        setError(t('댓글을 불러오지 못했습니다.', 'Could not load comments.'));
      }
    };
    void load();
    // Runs once per mount: the parent keys this component by post and session,
    // and a locale switch must not refetch the post.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveToFeed = useCallback((message: string) => {
    dispatch(addNotification({ type: 'success', message }));
    navigate('/feed', { replace: true });
  }, [dispatch, navigate]);

  const handleToggleLike = useCallback(async (target: FeedPost) => {
    if (isGuest) return;

    setPost((current) => current && {
      ...current,
      likedByCurrentUser: !current.likedByCurrentUser,
      likeCount: current.likedByCurrentUser
        ? Math.max(0, (current.likeCount ?? 0) - 1)
        : (current.likeCount ?? 0) + 1,
    });

    try {
      if (target.likedByCurrentUser) {
        await feedService.unlikePost(target.id);
      } else {
        await feedService.likePost(target.id);
      }
    } catch {
      if (!mounted.current) return;
      setError(t('좋아요를 처리하지 못했습니다.', 'Could not update the like.'));
      void loadPost();
    }
  }, [isGuest, loadPost, t]);

  const handleToggleComments = useCallback(() => {
    setCommentsOpen((open) => !open);
  }, []);

  // FeedCommentThread performs the comment requests itself; these only fold the
  // persisted result into the list and the post counter.
  const handleCommentAdded = useCallback((_postId: string, created: FeedComment) => {
    setComments((current) => [...(current ?? []), created]);
    setPost((current) => current && { ...current, commentCount: (current.commentCount ?? 0) + 1 });
  }, []);

  const handleCommentUpdated = useCallback((_postId: string, updated: FeedComment) => {
    setComments((current) => (current ?? []).map((comment) => (comment.id === updated.id ? updated : comment)));
  }, []);

  const handleCommentDeleted = useCallback((_postId: string, commentId: string) => {
    setComments((current) => (current ?? []).filter((comment) => comment.id !== commentId));
    setPost((current) => current && { ...current, commentCount: Math.max(0, (current.commentCount ?? 0) - 1) });
  }, []);

  const handleRequestMatch = useCallback(async (target: FeedPost) => {
    if (isGuest) return;

    setRequestingMatch(true);
    setError(null);
    try {
      await matchingService.requestMatch(target.authorId);
      if (!mounted.current) return;
      setSuccess(t(`${target.authorUsername}님에게 매칭 요청을 보냈습니다.`, `Match request sent to ${target.authorUsername}.`));
    } catch (err) {
      if (!mounted.current) return;
      setError(requestError(err, '매칭 요청을 보내지 못했습니다.', 'Could not send the match request.'));
    } finally {
      if (mounted.current) setRequestingMatch(false);
    }
  }, [isGuest, requestError, t]);

  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (isGuest) return;
    setMenuAnchor(event.currentTarget);
  }, [isGuest]);

  const closeMenu = () => setMenuAnchor(null);

  const openPostEdit = () => {
    if (!post) return;
    closeMenu();
    setPostEditCaption(post.caption ?? '');
    setPostEditTags((post.interestTags ?? []).join(', '));
    setPostEditPublicPreview(Boolean(post.publicPreview));
    setPostEditOpen(true);
  };

  const submitPostEdit = async () => {
    if (!post || postMutationBusy) return;
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
      const updated = await feedService.updatePost(post.id, {
        caption,
        interestTags: tags,
        publicPreview: postEditPublicPreview,
      });
      if (!mounted.current) return;
      // The update response carries no discovery metadata; keep what the page loaded.
      setPost((current) => current && { ...current, ...updated });
      setPostEditOpen(false);
      setSuccess(t('게시글을 수정했습니다.', 'Post updated.'));
    } catch (err) {
      if (!mounted.current) return;
      setError(requestError(err, '게시글을 수정하지 못했습니다.', 'Could not update the post.'));
    } finally {
      if (mounted.current) setPostMutationBusy(false);
    }
  };

  const confirmPostDelete = () => {
    closeMenu();
    setPostDeleteOpen(true);
  };

  const submitPostDelete = async () => {
    if (!post || postMutationBusy) return;
    setPostMutationBusy(true);
    setError(null);
    try {
      await feedService.deletePost(post.id);
      if (!mounted.current) return;
      leaveToFeed(t('게시글을 삭제했습니다.', 'Post deleted.'));
    } catch (err) {
      if (!mounted.current) return;
      setError(requestError(err, '게시글을 삭제하지 못했습니다.', 'Could not delete the post.'));
      setPostMutationBusy(false);
    }
  };

  const handleHidePost = async () => {
    if (!post) return;
    closeMenu();
    try {
      await safetyService.hide('FEED_POST', post.id);
      if (!mounted.current) return;
      leaveToFeed(t('이 게시물을 내 피드에서 숨겼습니다.', 'This post is now hidden from your feed.'));
    } catch {
      if (!mounted.current) return;
      setError(t('게시물을 숨기지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not hide the post. Please try again shortly.'));
    }
  };

  const handleBlockUser = async () => {
    if (!post) return;
    closeMenu();
    if (!window.confirm(t(
      `${post.authorUsername}님을 차단하시겠어요? 서로의 추천, 피드, 1:1 채팅에서 제외됩니다.`,
      `Block ${post.authorUsername}? You will no longer see each other in recommendations, the feed, or one-to-one chats.`,
    ))) return;
    try {
      await safetyService.blockUser(post.authorId);
      if (!mounted.current) return;
      leaveToFeed(t(`${post.authorUsername}님을 차단했습니다.`, `${post.authorUsername} has been blocked.`));
    } catch (err) {
      if (!mounted.current) return;
      setError(requestError(err, '사용자를 차단하지 못했습니다.', 'Could not block this user.'));
    }
  };

  const openReportDialog = () => {
    closeMenu();
    setReportReason('HARASSMENT');
    setReportDetails('');
    setHideAfterReport(true);
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!post) return;
    setSafetySubmitting(true);
    try {
      await safetyService.report({
        targetType: 'FEED_POST',
        targetId: post.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        hideContent: hideAfterReport,
      });
      if (!mounted.current) return;
      const message = t('신고를 접수했습니다. 안전하게 검토하겠습니다.', 'Your report has been submitted for review.');
      if (hideAfterReport) {
        leaveToFeed(message);
        return;
      }
      setReportOpen(false);
      setSuccess(message);
    } catch (err) {
      if (!mounted.current) return;
      setError(requestError(err, '신고를 접수하지 못했습니다.', 'Could not submit the report.'));
    } finally {
      if (mounted.current) setSafetySubmitting(false);
    }
  };

  const isOwnPost = Boolean(post) && String(post?.authorId) === String(currentUserId);

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 1.75, sm: 3.5 }, px: { xs: 1.25, sm: 3 } }}>
      <Stack spacing={2.25} sx={{ width: '100%', maxWidth: 720, mx: 'auto', minWidth: 0 }}>
        <Box>
          <Button component={RouterLink} to="/feed" startIcon={<ArrowBackRoundedIcon />} sx={{ px: 1 }}>
            {t('피드로 돌아가기', 'Back to feed')}
          </Button>
        </Box>

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
          <Box role="status" aria-live="polite" aria-label={t('게시글 불러오는 중', 'Loading post')} sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {unavailable && (
          <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}>
            <CardContent sx={{ py: { xs: 5, sm: 7 }, textAlign: 'center' }}>
              <Typography variant="h6">{t('삭제되었거나 볼 수 없는 글이에요.', 'This post was removed or is not available.')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {t('피드에서 이웃들의 다른 이야기를 확인해 보세요.', 'Head back to the feed to see other neighborhood stories.')}
              </Typography>
              <Button component={RouterLink} to="/feed" variant="contained" sx={{ mt: 2.5 }}>
                {t('피드 보기', 'View feed')}
              </Button>
            </CardContent>
          </Card>
        )}

        {post && (
          <FeedPostCard
            post={post}
            isGuest={isGuest}
            currentUserId={currentUserId}
            feedMode="LATEST"
            expanded={commentsOpen && comments !== null}
            comments={comments ?? undefined}
            requestingMatch={requestingMatch}
            recommendationReasonLabels={NO_RECOMMENDATION_LABELS}
            onToggleLike={handleToggleLike}
            onToggleComments={handleToggleComments}
            onRequestMatch={handleRequestMatch}
            onOpenMenu={openMenu}
            onCommentAdded={handleCommentAdded}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
            onError={setError}
            onSuccess={setSuccess}
          />
        )}
      </Stack>

      {!isGuest && <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {isOwnPost ? [
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

      {!isGuest && <Dialog open={postEditOpen} onClose={() => !postMutationBusy && setPostEditOpen(false)} fullWidth maxWidth="sm">
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
          <Button disabled={postMutationBusy} onClick={() => setPostEditOpen(false)}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" disabled={postMutationBusy || !postEditCaption.trim()} onClick={submitPostEdit}>
            {postMutationBusy ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>}

      {!isGuest && <Dialog open={postDeleteOpen} onClose={() => !postMutationBusy && setPostDeleteOpen(false)}>
        <DialogTitle>{t('게시글을 삭제하시겠어요?', 'Delete this post?')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>{t('사진·동영상과 댓글이 함께 삭제되며 되돌릴 수 없습니다.', 'Photos, videos, and comments will also be deleted. This cannot be undone.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={postMutationBusy} onClick={() => setPostDeleteOpen(false)}>{t('취소', 'Cancel')}</Button>
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
              <InputLabel id="post-detail-report-reason-label">{t('신고 사유', 'Reason')}</InputLabel>
              <Select
                labelId="post-detail-report-reason-label"
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

/**
 * 공유 링크와 알림이 도착하는 게시글 한 건의 화면.
 * 게시글이나 세션이 바뀌면 key로 내용을 통째로 다시 마운트해 이전 글의 상태가 남지 않게 한다.
 */
const PostDetail: React.FC = () => {
  const { postId = '' } = useParams<{ postId: string }>();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessScope = accessScopeForUser(currentUser?.id);
  return <PostDetailContent key={`${accessScope}:${postId}`} postId={postId} currentUser={currentUser} />;
};

export default PostDetail;
