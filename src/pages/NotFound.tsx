import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            color: 'secondary.main',
            bgcolor: 'rgba(35, 133, 121, .10)',
          }}
        >
          <TravelExploreRoundedIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: '0.14em' }}>
            404
          </Typography>
          <Typography variant="h5" component="h1" sx={{ mt: 0.5 }}>
            {t('찾으시는 페이지가 없습니다.', 'We could not find that page.')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.75 }}>
            {t(
              '주소가 바뀌었거나 사라진 페이지일 수 있습니다. 피드로 돌아가 이웃들의 소식을 확인해 보세요.',
              'The address may have changed or the page may no longer exist. Head back to the feed to see what neighbors are sharing.',
            )}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button component={RouterLink} to="/" variant="contained">
            {t('홈으로 가기', 'Go home')}
          </Button>
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
            {t('이전 페이지', 'Go back')}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export default NotFound;
