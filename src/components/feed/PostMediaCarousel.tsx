import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, IconButton, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { FeedMedia, FeedPost } from '../../types/feed';

interface PostMediaCarouselProps {
  post: FeedPost;
}

const PostMediaCarousel: React.FC<PostMediaCarouselProps> = ({ post }) => {
  const media = useMemo<FeedMedia[]>(() => {
    if (post.media?.length) {
      return [...post.media].sort((left, right) => left.sortOrder - right.sortOrder);
    }
    return post.imageUrl
      ? [{ url: post.imageUrl, type: 'IMAGE', sortOrder: 0 }]
      : [];
  }, [post.imageUrl, post.media]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [post.id, media.length]);

  if (media.length === 0) {
    return null;
  }

  const active = media[Math.min(activeIndex, media.length - 1)];
  const hasMultiple = media.length > 1;

  return (
    <Box sx={{ position: 'relative', bgcolor: active.type === 'VIDEO' ? 'black' : 'grey.100' }}>
      {active.type === 'VIDEO' ? (
        <Box
          component="video"
          key={active.url}
          src={active.url}
          poster={active.thumbnailUrl}
          controls
          playsInline
          preload="metadata"
          sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain' }}
        />
      ) : (
        <Box
          component="img"
          src={active.url}
          alt={post.caption || '게시글 사진'}
          loading="lazy"
          sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
        />
      )}

      {hasMultiple && (
        <>
          <IconButton
            aria-label="이전 미디어"
            onClick={() => setActiveIndex((index) => (index - 1 + media.length) % media.length)}
            sx={navigationButtonSx('left')}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            aria-label="다음 미디어"
            onClick={() => setActiveIndex((index) => (index + 1) % media.length)}
            sx={navigationButtonSx('right')}
          >
            <ChevronRightIcon />
          </IconButton>
          <Chip
            size="small"
            label={`${activeIndex + 1} / ${media.length}`}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: 'common.white',
              bgcolor: 'rgba(0, 0, 0, 0.58)',
            }}
          />
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
          >
            {media.map((item, index) => (
              <Box
                component="button"
                type="button"
                key={`${item.url}-${index}`}
                aria-label={`${index + 1}번째 미디어 보기`}
                onClick={() => setActiveIndex(index)}
                sx={{
                  width: 8,
                  height: 8,
                  p: 0,
                  border: 0,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  bgcolor: index === activeIndex ? 'common.white' : 'rgba(255,255,255,0.5)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
};

const navigationButtonSx = (side: 'left' | 'right') => ({
  position: 'absolute',
  top: '50%',
  [side]: 10,
  transform: 'translateY(-50%)',
  color: 'common.white',
  bgcolor: 'rgba(0, 0, 0, 0.36)',
  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.58)' },
});

export default PostMediaCarousel;
