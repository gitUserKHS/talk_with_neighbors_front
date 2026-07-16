import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, IconButton, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { FeedMedia, FeedPost } from '../../types/feed';
import { useI18n } from '../../i18n/I18nProvider';
import PostMediaLightbox from './PostMediaLightbox';

interface PostMediaCarouselProps {
  post: FeedPost;
}

const PostMediaCarousel: React.FC<PostMediaCarouselProps> = ({ post }) => {
  const { t } = useI18n();
  const media = useMemo<FeedMedia[]>(() => {
    if (post.media?.length) {
      return [...post.media].sort((left, right) => left.sortOrder - right.sortOrder);
    }
    return post.imageUrl
      ? [{ url: post.imageUrl, type: 'IMAGE', sortOrder: 0 }]
      : [];
  }, [post.imageUrl, post.media]);
  const mediaSignature = useMemo(
    () => media.map((item) => `${item.type}:${item.sortOrder}:${item.url}`).join('|'),
    [media],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [post.id, mediaSignature]);

  if (media.length === 0) {
    return null;
  }

  const active = media[Math.min(activeIndex, media.length - 1)];
  const hasMultiple = media.length > 1;

  return (
    <Box sx={{ position: 'relative', bgcolor: active.type === 'VIDEO' ? 'black' : 'grey.100' }}>
      <Box
        component="button"
        type="button"
        aria-label={active.type === 'VIDEO'
          ? t('동영상을 원본 비율로 크게 보기', 'View video at full size')
          : t('사진을 원본 비율로 크게 보기', 'View photo at full size')}
        aria-haspopup="dialog"
        onClick={() => setLightboxOpen(true)}
        sx={mediaOpenerSx}
      >
        {active.type === 'VIDEO' ? (
          <>
            <Box
              component="video"
              key={active.url}
              src={active.url}
              poster={active.thumbnailUrl}
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
              sx={{
                display: 'block',
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
            />
            <PlayCircleOutlineIcon
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'common.white',
                fontSize: 64,
                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,.55))',
              }}
            />
          </>
        ) : (
          <Box
            component="img"
            src={active.url}
            alt={post.caption || t('게시글 사진', 'Post photo')}
            loading="lazy"
            draggable={false}
            sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
          />
        )}
      </Box>

      {hasMultiple && (
        <>
          <IconButton
            aria-label={t('이전 미디어', 'Previous media')}
            onClick={() => setActiveIndex((index) => (index - 1 + media.length) % media.length)}
            sx={navigationButtonSx('left')}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            aria-label={t('다음 미디어', 'Next media')}
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
                aria-label={t(`${index + 1}번째 미디어 보기`, `View media ${index + 1}`)}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                sx={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  p: 0,
                  border: 0,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: 'transparent',
                  '&::before': {
                    content: '\"\"',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 8,
                    height: 8,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    bgcolor: index === activeIndex ? 'common.white' : 'rgba(255,255,255,0.5)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid white',
                    outlineOffset: -4,
                  },
                }}
              />
            ))}
          </Stack>
        </>
      )}

      <PostMediaLightbox
        open={lightboxOpen}
        media={media}
        activeIndex={activeIndex}
        alt={post.caption || t('게시글 사진', 'Post photo')}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveIndex}
      />
    </Box>
  );
};

const navigationButtonSx = (side: 'left' | 'right') => ({
  position: 'absolute',
  top: '50%',
  [side]: 10,
  width: 44,
  height: 44,
  transform: 'translateY(-50%)',
  color: 'common.white',
  bgcolor: 'rgba(0, 0, 0, 0.36)',
  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.58)' },
});

const mediaOpenerSx = {
  position: 'relative',
  display: 'block',
  width: '100%',
  p: 0,
  border: 0,
  bgcolor: 'transparent',
  cursor: 'zoom-in',
  lineHeight: 0,
  '&:focus-visible': {
    outline: '3px solid',
    outlineColor: 'primary.main',
    outlineOffset: -3,
  },
};

export default PostMediaCarousel;
