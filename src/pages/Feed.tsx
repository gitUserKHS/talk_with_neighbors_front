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
  CardMedia,
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
  Select,
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

const formatDate = (value?: string | null) => {
  if (!value) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const FeedContent: React.FC<{ currentUser: RootState['auth']['user'] }> = ({ currentUser }) => {
  const isGuest = !currentUser;
  const accessScope = accessScopeForUser(currentUser?.id);
  const [postSnapshot, setPostSnapshot] = useState<AccessScopedList<FeedPost>>({
    scope: null,
    items: [],
  });
  const posts = visibleScopedItems(postSnapshot, accessScope);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [requestingMatch, setRequestingMatch] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [hideAfterReport, setHideAfterReport] = useState(true);
  const [safetySubmitting, setSafetySubmitting] = useState(false);
  const feedRequestGeneration = useRef(0);
  const viewGeneration = useRef(0);

  const setPosts = (update: React.SetStateAction<FeedPost[]>) => {
    setPostSnapshot((snapshot) => updateScopedItems(snapshot, accessScope, update));
  };

  const loadFeed = async (requestScope: AccessScope = accessScope) => {
    const requestId = ++feedRequestGeneration.current;
    setLoading(true);
    setError(null);

    try {
      const page = await feedService.getFeed(0, 20, apiAccessForScope(requestScope));
      if (!isLatestRequest(requestId, feedRequestGeneration.current)) return;
      setPostSnapshot({ scope: requestScope, items: page.content ?? [] });
    } catch {
      if (!isLatestRequest(requestId, feedRequestGeneration.current)) return;
      setError('피드를 불러오지 못했어. 잠시 후 다시 시도해줘.');
    } finally {
      if (isLatestRequest(requestId, feedRequestGeneration.current)) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const generation = ++viewGeneration.current;
    ++feedRequestGeneration.current;
    setPostSnapshot({ scope: null, items: [] });
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
    void loadFeed(accessScope);

    return () => {
      if (viewGeneration.current === generation) {
        ++viewGeneration.current;
      }
      ++feedRequestGeneration.current;
    };
  }, [accessScope]);

  const emptyMessage = useMemo(() => {
    if (loading) return '';
    if (posts.length > 0) return '';
    return isGuest
      ? '아직 공개된 게시글이 없어. 조금 뒤에 다시 둘러봐줘.'
      : '아직 올라온 게시글이 없어. 첫 취향을 공유해볼까?';
  }, [isGuest, loading, posts.length]);
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
      setError('좋아요 처리를 실패했어.');
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
        setError('댓글을 불러오지 못했어.');
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
      setError('댓글 작성을 실패했어.');
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
      setSuccess(`${post.authorUsername}님에게 매칭 요청을 보냈어.`);
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(err.response?.data?.message || '매칭 요청을 보낼 수 없었어.');
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

  const handleHidePost = async () => {
    if (!selectedPost) return;
    const generation = viewGeneration.current;
    const post = selectedPost;
    closeSafetyMenu();
    try {
      await safetyService.hide('FEED_POST', post.id);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setSuccess('이 게시물을 내 피드에서 숨겼어.');
    } catch {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError('게시물을 숨기지 못했어. 잠시 후 다시 시도해 줘.');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedPost) return;
    const generation = viewGeneration.current;
    const post = selectedPost;
    closeSafetyMenu();
    if (!window.confirm(`${post.authorUsername}님을 차단할까? 서로의 추천과 피드, 1:1 채팅에서 제외돼.`)) return;
    try {
      await safetyService.blockUser(post.authorId);
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setPosts((prev) => prev.filter((item) => item.authorId !== post.authorId));
      setSuccess(`${post.authorUsername}님을 차단했어.`);
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(err.response?.data?.message || '사용자를 차단하지 못했어.');
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
      setSuccess('신고를 접수했어. 안전하게 검토할게.');
    } catch (err: any) {
      if (!isLatestRequest(generation, viewGeneration.current)) return;
      setError(err.response?.data?.message || '신고를 접수하지 못했어.');
    } finally {
      if (isLatestRequest(generation, viewGeneration.current)) {
        setSafetySubmitting(false);
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              이웃 피드
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isGuest
                ? '가입 전에도 이웃들이 공개한 순간을 둘러볼 수 있어.'
                : '취향이 맞는 사람들의 순간을 최신순으로 보여줘.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="새로고침">
              <IconButton aria-label="새로고침" onClick={() => void loadFeed()}>
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
                로그인
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to="/post/new"
                variant="contained"
                startIcon={<AddPhotoAlternateIcon />}
              >
                글쓰기
              </Button>
            )}
          </Stack>
        </Box>

        {isGuest && (
          <Alert
            severity="info"
            sx={{
              '& .MuiAlert-message': { minWidth: 0 },
              '& .MuiAlert-action': { flexShrink: 0 },
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
                로그인하기
              </Button>
            )}
          >
            지금은 둘러보기 모드야. 좋아요, 댓글 확인과 작성, 매칭, 안전 기능은 로그인 후 이용할 수 있어.
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
          <Box role="status" aria-live="polite" aria-label="피드 불러오는 중" sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {emptyMessage && (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">{emptyMessage}</Typography>
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

          return (
            <Card key={post.id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
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
                        label="이웃톡 공식"
                        color="secondary"
                      />
                    )}
                    {!isGuest && !isOwnPost && score > 0 && (
                      <Chip size="small" color="primary" label={`궁합 ${score}점`} />
                    )}
                  </Stack>
                }
                subheader={formatDate(post.createdAt)}
                action={!post.official && !isGuest && !isOwnPost ? (
                  <IconButton aria-label="안전 메뉴" onClick={(event) => openSafetyMenu(event, post)}>
                    <MoreVertIcon />
                  </IconButton>
                ) : undefined}
              />
              {post.media?.length ? (
                <PostMediaCarousel post={post} />
              ) : post.imageUrl?.trim() ? (
                <CardMedia
                  component="img"
                  image={post.imageUrl}
                  alt={post.caption || '피드 이미지'}
                  sx={{ aspectRatio: '1 / 1', objectFit: 'cover', bgcolor: 'grey.100' }}
                />
              ) : (
                <Box
                  role="img"
                  aria-label="첨부 이미지 없음"
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    minHeight: 220,
                    bgcolor: 'rgba(35,133,121,.08)',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">사진 없이 나눈 이야기</Typography>
                </Box>
              )}
              {!isGuest && (
                <CardActions disableSpacing sx={{ px: 1.5 }}>
                  <IconButton
                    aria-label="좋아요"
                    onClick={() => handleToggleLike(post)}
                    color={post.likedByCurrentUser ? 'error' : 'default'}
                  >
                    {post.likedByCurrentUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <IconButton aria-label="댓글 보기" onClick={() => handleToggleComments(post.id)}>
                    <ChatBubbleOutlineIcon />
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }} />
                  {!isOwnPost && !post.official && (
                    <Button
                      size="small"
                      startIcon={<PersonAddAltIcon />}
                      disabled={requestingMatch[post.id]}
                      onClick={() => handleRequestMatch(post)}
                    >
                      매칭 요청
                    </Button>
                  )}
                </CardActions>
              )}
              <CardContent sx={{ pt: isGuest ? 2 : 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  좋아요 {likeCount.toLocaleString()}개
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {post.caption}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  {interestTags.map((tag) => (
                    <Chip key={tag} size="small" label={`#${tag}`} />
                  ))}
                </Stack>
                {!isGuest && sharedInterests.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    함께 좋아하는 관심사: {sharedInterests.join(', ')}
                  </Typography>
                )}
                {isGuest ? (
                  <Button
                    component={RouterLink}
                    to="/login"
                    state={{ from: { pathname: '/feed' } }}
                    size="small"
                    sx={{ mt: 1, px: 0 }}
                  >
                    댓글 {commentCount.toLocaleString()}개 · 로그인하고 참여
                  </Button>
                ) : (
                  <Button
                    size="small"
                    sx={{ mt: 1, px: 0 }}
                    onClick={() => handleToggleComments(post.id)}
                  >
                    댓글 {commentCount}개 보기
                  </Button>
                )}

                {!isGuest && expandedComments[post.id] && (
                  <Box sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack spacing={1.25}>
                      {(comments[post.id] || []).map((comment) => (
                        <Box key={comment.id} sx={{ display: 'flex', gap: 1 }}>
                          <Avatar src={comment.authorProfileImage} sx={{ width: 28, height: 28 }}>
                            {comment.authorUsername?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              <strong>{comment.authorUsername}</strong> {comment.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(comment.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                      <Stack direction="row" spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="댓글 쓰기"
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
                        <Button onClick={() => handleAddComment(post.id)}>게시</Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {!isGuest && <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeSafetyMenu}>
        <MenuItem onClick={handleHidePost}>
          <VisibilityOffOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> 게시물 숨기기
        </MenuItem>
        <MenuItem onClick={openReportDialog}>
          <ReportOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> 게시물 신고하기
        </MenuItem>
        <MenuItem onClick={handleBlockUser} sx={{ color: 'error.main' }}>
          <BlockOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} /> 사용자 차단하기
        </MenuItem>
      </Menu>}

      {!isGuest && <Dialog open={reportOpen} onClose={() => !safetySubmitting && setReportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>게시물 신고하기</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">신고한 사실은 게시물 작성자에게 공개되지 않아.</Alert>
            <FormControl fullWidth>
              <InputLabel id="report-reason-label">신고 사유</InputLabel>
              <Select
                labelId="report-reason-label"
                value={reportReason}
                label="신고 사유"
                onChange={(event) => setReportReason(event.target.value as ReportReason)}
              >
                <MenuItem value="HARASSMENT">괴롭힘 또는 위협</MenuItem>
                <MenuItem value="HATE_SPEECH">혐오 표현</MenuItem>
                <MenuItem value="SPAM">스팸 또는 홍보</MenuItem>
                <MenuItem value="INAPPROPRIATE_CONTENT">부적절한 콘텐츠</MenuItem>
                <MenuItem value="IMPERSONATION">사칭</MenuItem>
                <MenuItem value="PRIVACY">개인정보 노출</MenuItem>
                <MenuItem value="OTHER">기타</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="상세 설명 (선택)"
              multiline
              minRows={3}
              inputProps={{ maxLength: 1000 }}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
            />
            <FormControlLabel
              control={<Checkbox checked={hideAfterReport} onChange={(event) => setHideAfterReport(event.target.checked)} />}
              label="신고 후 이 게시물 숨기기"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)} disabled={safetySubmitting}>취소</Button>
          <Button variant="contained" color="error" onClick={submitReport} disabled={safetySubmitting}>
            {safetySubmitting ? '접수 중…' : '신고 접수'}
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
