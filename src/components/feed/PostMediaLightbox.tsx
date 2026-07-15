import React, { useRef } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { FeedMedia } from '../../types/feed';

interface PostMediaLightboxProps {
  open: boolean;
  media: FeedMedia[];
  activeIndex: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const PostMediaLightbox: React.FC<PostMediaLightboxProps> = ({
  open,
  media,
  activeIndex,
  alt,
  onClose,
  onIndexChange,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = React.useId();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (media.length === 0) {
    return null;
  }

  const normalizedIndex = Math.min(Math.max(activeIndex, 0), media.length - 1);
  const active = media[normalizedIndex];
  const hasMultiple = media.length > 1;
  const move = (step: number) => {
    onIndexChange((normalizedIndex + step + media.length) % media.length);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth={false}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (isInteractiveMediaTarget(event.target)) return;
        if (event.key === 'ArrowLeft' && hasMultiple) {
          event.preventDefault();
          move(-1);
        }
        if (event.key === 'ArrowRight' && hasMultiple) {
          event.preventDefault();
          move(1);
        }
      }}
      slotProps={{
        paper: {
          sx: {
            width: fullScreen ? '100%' : 'min(94vw, 1120px)',
            height: fullScreen ? '100%' : 'min(92vh, 860px)',
            maxWidth: 'none',
            m: fullScreen ? 0 : 2,
            bgcolor: '#090b0f',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle id={titleId} sx={visuallyHiddenSx}>
        게시글 미디어 크게 보기
      </DialogTitle>
      <Box
        onTouchStart={(event) => {
          if (isInteractiveMediaTarget(event.target)) {
            touchStart.current = null;
            return;
          }
          const touch = event.changedTouches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!hasMultiple || !start) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          const distanceX = touch.clientX - start.x;
          const distanceY = touch.clientY - start.y;
          if (Math.abs(distanceX) >= 48 && Math.abs(distanceX) > Math.abs(distanceY) * 1.2) {
            move(distanceX > 0 ? -1 : 1);
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
        sx={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
          minHeight: 0,
          touchAction: 'pan-y pinch-zoom',
        }}
      >
        {active.type === 'VIDEO' ? (
          <Box
            component="video"
            key={active.url}
            src={active.url}
            poster={active.thumbnailUrl}
            controls
            playsInline
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              touchAction: 'auto',
            }}
          />
        ) : (
          <Box
            component="img"
            src={active.url}
            alt={`${alt} 크게 보기`}
            draggable={false}
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
            }}
          />
        )}

        <Tooltip title="닫기">
          <IconButton
            aria-label="크게 보기 닫기"
            onClick={onClose}
            autoFocus
            sx={{
              ...overlayButtonSx,
              top: 'max(12px, env(safe-area-inset-top))',
              right: 'max(12px, env(safe-area-inset-right))',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>

        {hasMultiple && (
          <>
            <IconButton
              aria-label="이전 미디어 크게 보기"
              onClick={() => move(-1)}
              sx={{
                ...overlayButtonSx,
                left: 'max(12px, env(safe-area-inset-left))',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              aria-label="다음 미디어 크게 보기"
              onClick={() => move(1)}
              sx={{
                ...overlayButtonSx,
                right: 'max(12px, env(safe-area-inset-right))',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Chip
              aria-live="polite"
              label={`${normalizedIndex + 1} / ${media.length}`}
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: 'max(16px, env(safe-area-inset-bottom))',
                transform: 'translateX(-50%)',
                color: 'common.white',
                bgcolor: 'rgba(0, 0, 0, 0.68)',
              }}
            />
          </>
        )}
      </Box>
    </Dialog>
  );
};

const overlayButtonSx = {
  position: 'absolute',
  zIndex: 1,
  width: 48,
  height: 48,
  color: 'common.white',
  bgcolor: 'rgba(0, 0, 0, 0.48)',
  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.72)' },
};

const isInteractiveMediaTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement
  && Boolean(target.closest('button, video, input, textarea, select, [contenteditable="true"]'));

const visuallyHiddenSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default PostMediaLightbox;
