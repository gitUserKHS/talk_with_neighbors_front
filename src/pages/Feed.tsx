import React, { useEffect, useMemo, useState } from 'react';
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
  IconButton,
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
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import feedService from '../services/feedService';
import matchingService from '../services/matchingService';
import { FeedComment, FeedPost } from '../types/feed';
import { RootState } from '../store/types';

const formatDate = (value?: string | null) => {
  if (!value) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const Feed: React.FC = () => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [requestingMatch, setRequestingMatch] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await feedService.getFeed();
      setPosts(page.content ?? []);
    } catch {
      setError('피드를 불러오지 못했어. 잠시 후 다시 시도해줘.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const emptyMessage = useMemo(() => {
    if (loading) return '';
    return posts.length === 0 ? '아직 올라온 게시글이 없어. 첫 취향을 공유해볼까?' : '';
  }, [loading, posts.length]);

  const handleToggleLike = async (post: FeedPost) => {
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
      setError('좋아요 처리를 실패했어.');
      loadFeed();
    }
  };

  const handleToggleComments = async (postId: string) => {
    const willOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: willOpen }));

    if (willOpen && !comments[postId]) {
      try {
        const result = await feedService.getComments(postId);
        setComments((prev) => ({ ...prev, [postId]: result }));
      } catch {
        setError('댓글을 불러오지 못했어.');
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const created = await feedService.addComment(postId, content);
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
      setError('댓글 작성을 실패했어.');
    }
  };

  const handleRequestMatch = async (post: FeedPost) => {
    setRequestingMatch((prev) => ({ ...prev, [post.id]: true }));
    setError(null);

    try {
      await matchingService.requestMatch(post.authorId);
      setSuccess(`${post.authorUsername}님에게 매칭 요청을 보냈어.`);
    } catch (err: any) {
      setError(err.response?.data?.message || '매칭 요청을 보낼 수 없었어.');
    } finally {
      setRequestingMatch((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              이웃 피드
            </Typography>
            <Typography variant="body2" color="text.secondary">
              취향이 맞는 사람들의 순간을 최신순으로 보여줘.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="새로고침">
              <IconButton aria-label="새로고침" onClick={loadFeed}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              component={RouterLink}
              to="/post/new"
              variant="contained"
              startIcon={<AddPhotoAlternateIcon />}
            >
              글쓰기
            </Button>
          </Stack>
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
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
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
                    {!isOwnPost && score > 0 && (
                      <Chip size="small" color="primary" label={`궁합 ${score}점`} />
                    )}
                  </Stack>
                }
                subheader={formatDate(post.createdAt)}
              />
              <CardMedia
                component="img"
                image={post.imageUrl}
                alt={post.caption || '피드 이미지'}
                sx={{ aspectRatio: '1 / 1', objectFit: 'cover', bgcolor: 'grey.100' }}
              />
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
                {!isOwnPost && (
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
              <CardContent sx={{ pt: 0 }}>
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
                {sharedInterests.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    함께 좋아하는 관심사: {sharedInterests.join(', ')}
                  </Typography>
                )}
                <Button
                  size="small"
                  sx={{ mt: 1, px: 0 }}
                  onClick={() => handleToggleComments(post.id)}
                >
                  댓글 {commentCount}개 보기
                </Button>

                {expandedComments[post.id] && (
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
    </Container>
  );
};

export default Feed;
