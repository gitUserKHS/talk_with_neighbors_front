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
import { useI18n } from '../i18n/I18nProvider';
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_COUNT,
  MAX_MEDIA_REQUEST_BYTES,
  VIDEO_UPLOAD_GUIDANCE,
  mediaUploadStatusText,
} from '../services/mediaUploadPolicy';

const MAX_MEDIA_COUNT = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VIDEO_COUNT_POLICY_COPY = '동영상은 한 번에 1개만 업로드할 수 있습니다.';
const TOTAL_SIZE_POLICY_COPY = '첨부 파일의 전체 크기는 120MB를 초과할 수 없습니다.';
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
  const { locale, t } = useI18n();
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

  const requestError = (request: any, korean: string, english: string) => (
    locale === 'ko' && typeof request?.response?.data?.message === 'string'
      ? request.response.data.message
      : t(korean, english)
  );

  const uploadStatus = mediaUploadStatusText(uploadProgress);

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
      setError(t('사진과 동영상은 합쳐서 최대 10개까지 업로드할 수 있습니다.', 'You can upload up to 10 photos and videos in total.'));
      return;
    }

    const existingIds = new Set(media.map((item) => item.id));
    const existingVideoCount = media.filter((item) => item.type === 'VIDEO').length;
    const accepted: SelectedMedia[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (accepted.length >= availableSlots) {
        errors.push(t('최대 10개까지만 추가했습니다.', 'Only the first 10 files were added.'));
        break;
      }
      if (!ACCEPTED_TYPES.has(file.type)) {
        errors.push(t(`${file.name}: 지원하지 않는 파일 형식입니다.`, `${file.name}: This file type is not supported.`));
        continue;
      }
      const isVideo = file.type.startsWith('video/');
      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        errors.push(t(`${file.name}: ${isVideo ? '30MB' : '10MB'}를 초과할 수 없습니다.`, `${file.name}: The file must be ${isVideo ? '30 MB' : '10 MB'} or smaller.`));
        continue;
      }
      if (isVideo && existingVideoCount + accepted.filter((item) => item.type === 'VIDEO').length >= MAX_VIDEO_COUNT) {
        errors.push(t(`${file.name}: ${VIDEO_COUNT_POLICY_COPY}`, `${file.name}: You can upload one video at a time.`));
        continue;
      }

      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingIds.has(id)) {
        errors.push(t(`${file.name}: 이미 선택한 파일입니다.`, `${file.name}: This file is already selected.`));
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
    if (nextTotal > MAX_MEDIA_REQUEST_BYTES) {
      accepted.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setError(t(
        TOTAL_SIZE_POLICY_COPY,
        'The total attachment size must be 120 MB or less.',
      ));
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
      setError(t('사진 또는 동영상을 하나 이상 선택해 주세요.', 'Select at least one photo or video.'));
      return;
    }
    if (!caption.trim()) {
      setError(t('게시글 내용을 입력해 주세요.', 'Enter a caption for your post.'));
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
      setError(requestError(err, '게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not publish your post. Please try again shortly.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 2.5, sm: 4.5 } }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <IconButton aria-label={t('피드로 돌아가기', 'Back to feed')} onClick={() => navigate('/feed')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('새 게시글', 'Create post')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('사진과 동영상을 원하는 순서로 최대 10개까지 업로드할 수 있습니다.', 'Upload up to 10 photos and videos in the order you want.')}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3.5 }, '&:last-child': { pb: { xs: 2, sm: 3.5 } } }}>
            <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
              <Box
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label={t('게시글에 첨부할 사진 또는 동영상 선택', 'Select photos or videos for this post')}
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
                <Typography sx={{ fontWeight: 700 }}>{t('클릭하거나 파일을 끌어다 놓아 주세요', 'Choose files or drag and drop them here')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(
                    `JPG·PNG·GIF·WebP는 각 10MB 이하입니다. ${VIDEO_UPLOAD_GUIDANCE}`,
                    'JPG, PNG, GIF, and WebP files must be 10 MB or smaller. Upload one video up to 30 MB, 60 seconds, and Full HD (1080p).',
                  )}
                </Typography>
              </Box>

              {media.length > 0 && (
                <>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">{t('선택한 미디어', 'Selected media')}</Typography>
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
                              alt={t(`${index + 1}번째 선택 사진`, `Selected photo ${index + 1}`)}
                              sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
                            />
                          )}
                          <Chip
                            size="small"
                            label={`${index + 1} · ${item.type === 'VIDEO' ? t('동영상', 'Video') : t('사진', 'Photo')}`}
                            sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(255,255,255,0.9)' }}
                          />
                          <IconButton
                            size="small"
                            aria-label={t(`${index + 1}번째 미디어 삭제`, `Remove media ${index + 1}`)}
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
                            aria-label={t(`${index + 1}번째 미디어를 앞으로 이동`, `Move media ${index + 1} earlier`)}
                            disabled={index === 0}
                            onClick={() => moveMedia(index, -1)}
                          >
                            <ArrowBackIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={t(`${index + 1}번째 미디어를 뒤로 이동`, `Move media ${index + 1} later`)}
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
                label={t('글 내용', 'Caption')}
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
                label={t('관심사 태그', 'Interest tags')}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder={t('카페, 산책, 영화', 'coffee, walking, movies')}
                helperText={t('쉼표로 구분해 최대 10개까지 입력해 주세요.', 'Enter up to 10 tags, separated by commas.')}
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
                  label={t('로그인 전 공개 미리보기 허용', 'Allow a public preview before sign-in')}
                  sx={{ m: 0, '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, ml: 4 }}>
                  {t(
                    '기본은 비공개입니다. 선택하면 로그인하지 않은 방문자도 사진·동영상, 본문과 관심사 태그를 볼 수 있습니다.',
                    'Posts are private by default. Turn this on to let signed-out visitors see the media, caption, and interest tags.',
                  )}
                </Typography>
              </Box>

              {submitting && (
                <Box>
                  <LinearProgress variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'} value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    {uploadStatus}
                  </Typography>
                </Box>
              )}

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => navigate('/feed')} disabled={submitting}>{t('취소', 'Cancel')}</Button>
                <Button type="submit" variant="contained" disabled={submitting || media.length === 0}>
                  {submitting ? t('게시 중…', 'Publishing…') : t('게시하기', 'Publish')}
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
