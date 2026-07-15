import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AuthLayout from '../components/AuthLayout';
import { authService } from '../services/authService';
import { sanitizeReturnTo } from '../services/authNavigation';
import { destinationAfterAuthentication } from '../services/profileSetup';
import { setUser } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/types';

const CALLBACK_ERRORS: Record<string, string> = {
  ACCOUNT_LINK_REQUIRED: '같은 이메일의 계정이 있어. 기존 이메일과 비밀번호로 로그인해줘.',
  PROVIDER_EMAIL_REQUIRED: '소셜 계정에서 이메일 제공에 동의해야 가입할 수 있어.',
  ACCESS_DENIED: '간편 로그인이 취소됐어.',
  OAUTH_FAILED: '간편 로그인에 실패했어. 다시 시도해줘.',
};

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState('');
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const status = params.get('status');
  const returnTo = sanitizeReturnTo(params.get('returnTo'));

  useEffect(() => {
    let mounted = true;

    if (status !== 'success') {
      const code = params.get('error')?.trim().toUpperCase() || 'OAUTH_FAILED';
      setError(CALLBACK_ERRORS[code] || CALLBACK_ERRORS.OAUTH_FAILED);
      return () => {
        mounted = false;
      };
    }

    authService.getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (!user) throw new Error('세션 사용자 정보가 없어.');
        dispatch(setUser(user));
        navigate(destinationAfterAuthentication(user, returnTo), { replace: true });
      })
      .catch(() => {
        if (mounted) setError('로그인 세션을 확인하지 못했어. 다시 로그인해줘.');
      });

    return () => {
      mounted = false;
    };
  }, [dispatch, navigate, params, returnTo, status]);

  return (
    <AuthLayout
      eyebrow="SECURE SIGN IN"
      title={error ? '간편 로그인을 마치지 못했어.' : '안전하게 로그인하고 있어.'}
      description="인증 정보는 브라우저에서 읽을 수 없는 보안 쿠키로만 확인해."
    >
      {error ? (
        <Stack spacing={2}>
          <Alert severity="error">{error}</Alert>
          <Button component={RouterLink} to="/login" variant="contained" size="large">
            로그인으로 돌아가기
          </Button>
          <Button component={RouterLink} to="/register" variant="text">
            새 계정 만들기
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2} alignItems="center" role="status" aria-live="polite">
          <CircularProgress />
          <Typography color="text.secondary">세션을 확인하는 중이야. 잠시만 기다려줘.</Typography>
        </Stack>
      )}
    </AuthLayout>
  );
};

export default AuthCallback;
