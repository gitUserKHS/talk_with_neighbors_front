import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import feedService from '../services/feedService';

const NewPost: React.FC = () => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interestTags = useMemo(
    () =>
      tags
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    [tags]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!imageUrl.trim() || !caption.trim()) {
      setError('이미지 URL과 글 내용을 입력해줘.');
      return;
    }

    setSubmitting(true);
    try {
      await feedService.createPost({
        imageUrl: imageUrl.trim(),
        caption: caption.trim(),
        interestTags,
      });
      navigate('/feed');
    } catch (err: any) {
      setError(err.response?.data?.message || '게시글을 저장하지 못했어.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            새 게시글
          </Typography>
          <Typography variant="body2" color="text.secondary">
            v1에서는 파일 업로드 대신 이미지 URL을 저장해.
          </Typography>
        </Box>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          {imageUrl && (
            <CardMedia
              component="img"
              image={imageUrl}
              alt="게시글 미리보기"
              sx={{ aspectRatio: '1 / 1', objectFit: 'cover', bgcolor: 'grey.100' }}
            />
          )}
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="이미지 URL"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                required
                fullWidth
              />
              <TextField
                label="글 내용"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                multiline
                minRows={4}
                required
                fullWidth
              />
              <TextField
                label="관심사 태그"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="카페, 산책, 영화"
                helperText="쉼표로 구분해서 입력해줘."
                fullWidth
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => navigate('/feed')}>취소</Button>
                <Button type="submit" variant="contained" disabled={submitting}>
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
