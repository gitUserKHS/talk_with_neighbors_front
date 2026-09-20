import React, { memo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { Link as RouterLink, useHref } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FeedComment, FeedPost } from '../../types/feed';
import { FeedDiscoveryMode } from '../../services/feedDiscovery';
import { AppDispatch } from '../../store/types';
import { addNotification } from '../../store/slices/notificationSlice';
import { useI18n } from '../../i18n/I18nProvider';
import PostMediaCarousel from './PostMediaCarousel';
import FeedCommentThread, { FeedCommentThreadProps } from './FeedCommentThread';

export interface FeedPostCardProps {
  post: FeedPost;
  isGuest: boolean;
  currentUserId?: string | number;
  feedMode: FeedDiscoveryMode;
  expanded: boolean;
  comments?: FeedComment[];
  requestingMatch: boolean;
  recommendationReasonLabels: Record<string, string>;
  onToggleLike: (post: FeedPost) => void;
  onToggleComments: (postId: string) => void;
  onRequestMatch: (post: FeedPost) => void;
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, post: FeedPost) => void;
  onCommentAdded: FeedCommentThreadProps['onCommentAdded'];
  onCommentUpdated: FeedCommentThreadProps['onCommentUpdated'];
  onCommentDeleted: FeedCommentThreadProps['onCommentDeleted'];
  onError: FeedCommentThreadProps['onError'];
  onSuccess: FeedCommentThreadProps['onSuccess'];
}

const EMPTY_COMMENTS: FeedComment[] = [];

/**
 * One feed card. Memoized so that typing in another card's comment box, or a
 * dialog opening elsewhere on the page, does not re-render this card and its carousel.
 * Every callback must therefore be referentially stable in the parent.
 */
const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  isGuest,
  currentUserId,
  feedMode,
  expanded,
  comments,
  requestingMatch,
  recommendationReasonLabels,
  onToggleLike,
  onToggleComments,
  onRequestMatch,
  onOpenMenu,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onError,
  onSuccess,
}) => {
  const { t, formatNumber, formatDate } = useI18n();
  const dispatch = useDispatch<AppDispatch>();
  // useHref keeps the router basename, so the link survives a sub-path deployment.
  const permalinkHref = useHref(`/feed/${post.id}`);
  const isOwnPost = String(post.authorId) === String(currentUserId);
  const score = Math.round(post.compatibilityScore || 0);
  const interestTags = post.interestTags ?? [];
  const sharedInterests = post.sharedInterests ?? [];
  const likeCount = post.likeCount ?? 0;
  const commentCount = post.commentCount ?? 0;
  const hasMedia = Boolean(post.media?.length || post.imageUrl?.trim());
  const createdAt = post.createdAt
    ? formatDate(post.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  const postContext = [post.neighborhoodName, createdAt].filter(Boolean).join(' · ');
  const recommendationReason = (post.recommendationReasons ?? [])
    .map((reason) => recommendationReasonLabels[reason])
    .find(Boolean);

  const sharePost = async () => {
    const url = `${window.location.origin}${permalinkHref}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.authorUsername, url });
      } catch {
        // Closing the share sheet rejects with AbortError; nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      dispatch(addNotification({ type: 'success', message: t('링크를 복사했어요.', 'Link copied.') }));
    } catch {
      dispatch(addNotification({ type: 'error', message: t('링크를 복사하지 못했어요.', 'Could not copy the link.') }));
    }
  };

  return (
    <Card
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
            {!isGuest && feedMode === 'RECOMMENDED' && recommendationReason && (
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
            onClick={(event) => onOpenMenu(event, post)}
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
                onClick={() => onToggleLike(post)}
                color={post.likedByCurrentUser ? 'error' : 'inherit'}
                startIcon={post.likedByCurrentUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                sx={{ minWidth: 0, px: 1 }}
              >
                {formatNumber(likeCount)}
              </Button>
              <Button
                color="inherit"
                aria-label={t('댓글 보기', 'View comments')}
                onClick={() => onToggleComments(post.id)}
                startIcon={<ChatBubbleOutlineIcon />}
                sx={{ minWidth: 0, px: 1 }}
              >
                {formatNumber(commentCount)}
              </Button>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={t('글 공유하기', 'Share post')}>
            <IconButton aria-label={t('글 공유하기', 'Share post')} onClick={() => void sharePost()}>
              <ShareOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isGuest && !isOwnPost && !post.official && (
            <Button
              size="small"
              startIcon={<PersonAddAltIcon />}
              disabled={requestingMatch}
              onClick={() => onRequestMatch(post)}
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
            onClick={() => onToggleComments(post.id)}
          >
            {t(`댓글 ${formatNumber(commentCount)}개 보기`, `View ${formatNumber(commentCount)} comments`)}
          </Button>
        )}

        {!isGuest && expanded && (
          <FeedCommentThread
            postId={post.id}
            comments={comments ?? EMPTY_COMMENTS}
            currentUserId={currentUserId}
            onCommentAdded={onCommentAdded}
            onCommentUpdated={onCommentUpdated}
            onCommentDeleted={onCommentDeleted}
            onError={onError}
            onSuccess={onSuccess}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default memo(FeedPostCard);
