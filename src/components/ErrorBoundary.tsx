import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import { translate } from '../i18n/I18nProvider';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 렌더링 중 발생한 예외를 잡아 빈 화면 대신 복구 안내를 보여준다.
 * 경계가 없으면 하위 컴포넌트의 예외 하나가 앱 전체를 흰 화면으로 만든다.
 * 클래스 컴포넌트라 훅을 쓸 수 없어 모듈 수준 translate로 현재 언어를 읽는다.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('화면을 렌더링하는 중 오류가 발생했습니다.', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              color: 'primary.main',
              bgcolor: 'rgba(232, 92, 74, .10)',
            }}
          >
            <SentimentDissatisfiedRoundedIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" component="h1">
              {translate('화면을 불러오는 중 문제가 발생했습니다.', 'Something went wrong while loading this page.')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.75 }}>
              {translate(
                '잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 새로고침을 해 주세요.',
                'Please try again in a moment. If the problem persists, reload the page.',
              )}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={this.handleRetry}>
              {translate('다시 시도', 'Try again')}
            </Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              {translate('새로고침', 'Reload')}
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }
}

export default ErrorBoundary;
