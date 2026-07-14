import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { useNavigate } from 'react-router-dom';
import feedService from '../services/feedService';

const MAX_MEDIA_COUNT = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const ACCEPT_ATTRIBUTE = Array.from(ACCEPTED_TYPES).join(',');

interface SelectedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: 'IMAGE' | 'VIDEO';
}

const NewPost: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<SelectedMedia[]>([]);
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [publicPreview, setPublicPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(
    () => () => mediaRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)),
    []
  );

  const interestTags = useMemo(
    () =>
      tags
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean)
        .filter((tag, index, values) => values.indexOf(tag) === index)
        .slice(0, 10),
    [tags]
  );

  const addFiles = (files: File[]) => {
    setError(null);
    const availableSlots = MAX_MEDIA_COUNT - media.length;
    if (availableSlots <= 0) {
      setError('사진과 동영상은 합쳐서 최대 10개까지 올릴 수 있어.');
      return;
    }

    const existingIds = new Set(media.map((item) => item.id));
    const accepted: SelectedMedia[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (accepted.length >= availableSlots) {
        errors.push('최대 10개까지만 추가했어.');
        break;
      }
      if (!ACCEPTED_TYPES.has(file.type)) {
        errors.push(`${file.name}: 지원하지 않는 형식이야.`);
        continue;
      }
      const isVideo = file.type.startsWith('video/');
      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        errors.push(`${file.name}: ${isVideo ? '100MB' : '10MB'}를 넘을 수 없어.`);
        continue;
      }

      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingIds.has(id)) {
        errors.push(`${file.name}: 이미 선택한 파일이야.`);
        continue;
      }

      existingIds.add(id);
      accepted.push({
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? 'VIDEO' : 'IMAGE',
      });
    }

    const nextTotal = [...media, ...accepted].reduce((sum, item) => sum + item.file.size, 0);
    if (nextTotal > MAX_TOTAL_BYTES) {
      accepted.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setError('첨부 파일 전체 크기는 200MB를 넘을 수 없어.');
      return;
    }

    if (accepted.length > 0) {
      setMedia((current) => [...current, ...accepted]);
    }
    if (errors.length > 0) {
      setError(errors.join(' '));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const removeMedia = (id: string) => {
    setMedia((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= media.length) return;
    setMedia((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (media.length === 0) {
      setError('사진 또는 동영상을 한 개 이상 선택해 줘.');
      return;
    }
    if (!caption.trim()) {
      setError('게시글 내용을 입력해 줘.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      await feedService.createPost(
        { caption: caption.trim(), interestTags, publicPreview },
        media.map((item) => item.file),
        setUploadProgress
      );
      navigate('/feed');
    } catch (err: any) {
      setError(err.response?.data?.message || '게시글을 저장하지 못했어. 잠시 후 다시 시도해 줘.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            새 게시글
          </Typography>
          <Typography variant="body2" color="text.secondary">
            사진과 동영상을 원하는 순서로 최대 10개까지 올릴 수 있어.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
              <Box
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
                }}
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 1,
                  minHeight: 150,
                  p: 3,
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  textAlign: 'center',
                  bgcolor: 'action.hover',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                }}
              >
                <input
                  ref={inputRef}
                  hidden
                  multiple
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  data-testid="post-media-input"
                />
                <Stack direction="row" spacing={1} color="primary.main">
                  <AddPhotoAlternateOutlinedIcon />
                  <MovieOutlinedIcon />
                </Stack>
                <Typography sx={{ fontWeight: 700 }}>클릭하거나 파일을 끌어다 놓아 줘</Typography>
                <Typography variant="caption" color="text.secondary">
                  JPG·PNG·GIF·WebP는 각 10MB, MP4·WebM·MOV는 각 100MB 이하
                </Typography>
              </Box>

              {media.length > 0 && (
                <>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">선택한 미디어</Typography>
                    <Chip size="small" label={`${media.length} / ${MAX_MEDIA_COUNT}`} />
                  </Stack>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    {media.map((item, index) => (
                      <Box key={item.id} sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: 2,
                            bgcolor: item.type === 'VIDEO' ? 'black' : 'grey.100',
                          }}
                        >
                          {item.type === 'VIDEO' ? (
                            <Box
                              component="video"
                              src={item.previewUrl}
                              muted
                              controls
                              preload="metadata"
                              sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain' }}
                            />
                          ) : (
                            <Box
                              component="img"
                              src={item.previewUrl}
                              alt={`${index + 1}번째 선택 사진`}
                              sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
                            />
                          )}
                          <Chip
                            size="small"
                            label={`${index + 1} · ${item.type === 'VIDEO' ? '동영상' : '사진'}`}
                            sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(255,255,255,0.9)' }}
                          />
                          <IconButton
                            size="small"
                            aria-label={`${index + 1}번째 미디어 삭제`}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeMedia(item.id);
                            }}
                            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)' }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Stack direction="row" justifyContent="center" sx={{ mt: 0.5 }}>
                          <IconButton
                            size="small"
                            aria-label={`${index + 1}번째 미디어를 앞으로 이동`}
                            disabled={index === 0}
                            onClick={() => moveMedia(index, -1)}
                          >
                            <ArrowBackIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={`${index + 1}번째 미디어를 뒤로 이동`}
                            disabled={index === media.length - 1}
                            onClick={() => moveMedia(index, 1)}
                          >
                            <ArrowForwardIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <TextField
                label="글 내용"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                multiline
                minRows={4}
                required
                fullWidth
                inputProps={{ maxLength: 1000 }}
                helperText={`${caption.length} / 1000`}
              />
              <TextField
                label="관심사 태그"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="카페, 산책, 영화"
                helperText="쉼표로 구분해서 최대 10개까지 입력해 줘."
                fullWidth
              />

              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: publicPreview ? 'warning.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: publicPreview ? 'rgba(237, 108, 2, 0.06)' : 'background.default',
                }}
              >
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={publicPreview}
                      onChange={(event) => setPublicPreview(event.target.checked)}
                      disabled={submitting}
                    />
                  )}
                  label="로그인 전 공개 미리보기 허용"
                  sx={{ m: 0, '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, ml: 4 }}>
                  기본값은 비공개야. 선택하면 이 글의 사진·동영상, 본문과 관심사 태그를
                  로그인하지 않은 방문자도 볼 수 있어.
                </Typography>
              </Box>

              {submitting && (
                <Box>
                  <LinearProgress variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'} value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    {uploadProgress > 0 ? `업로드 중 ${uploadProgress}%` : '업로드를 준비하고 있어…'}
                  </Typography>
                </Box>
              )}

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => navigate('/feed')} disabled={submitting}>취소</Button>
                <Button type="submit" variant="contained" disabled={submitting || media.length === 0}>
                  게시하기
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

export default NewPost;
