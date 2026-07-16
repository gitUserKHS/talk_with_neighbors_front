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
import { useI18n } from '../i18n/I18nProvider';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const [error, setError] = useState('');
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const status = params.get('status');
  const returnTo = sanitizeReturnTo(params.get('returnTo'));
  const callbackErrors = useMemo<Record<string, string>>(() => ({
    ACCOUNT_LINK_REQUIRED: t('같은 이메일로 가입한 계정이 있습니다. 기존 이메일과 비밀번호로 로그인해 주세요.', 'An account already uses this email. Please sign in with your existing email and password.'),
    PROVIDER_EMAIL_REQUIRED: t('가입하려면 소셜 계정의 이메일 제공에 동의해 주세요.', 'Please allow access to your social account email to continue.'),
    ACCESS_DENIED: t('간편 로그인이 취소되었습니다.', 'Social sign-in was canceled.'),
    OAUTH_FAILED: t('간편 로그인하지 못했습니다. 다시 시도해 주세요.', 'We could not complete social sign-in. Please try again.'),
  }), [t]);

  useEffect(() => {
    let mounted = true;

    if (status !== 'success') {
      const code = params.get('error')?.trim().toUpperCase() || 'OAUTH_FAILED';
      setError(callbackErrors[code] || callbackErrors.OAUTH_FAILED);
      return () => {
        mounted = false;
      };
    }

    authService.getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (!user) throw new Error(t('로그인 세션의 사용자 정보를 확인하지 못했습니다.', 'We could not retrieve the user for this sign-in session.'));
        dispatch(setUser(user));
        navigate(destinationAfterAuthentication(user, returnTo), { replace: true });
      })
      .catch(() => {
        if (mounted) setError(t('로그인 세션을 확인하지 못했습니다. 다시 로그인해 주세요.', 'We could not verify your sign-in session. Please sign in again.'));
      });

    return () => {
      mounted = false;
    };
  }, [callbackErrors, dispatch, navigate, params, returnTo, status, t]);

  return (
    <AuthLayout
      eyebrow={t('안전한 로그인', 'SECURE SIGN-IN')}
      title={error
        ? t('간편 로그인을 완료하지 못했습니다.', 'We could not complete social sign-in.')
        : t('안전하게 로그인하고 있습니다.', 'Signing you in securely.')}
      description={t('인증 정보는 브라우저에서 읽을 수 없는 보안 쿠키로만 확인합니다.', 'Your authentication is verified only through a secure cookie that browser scripts cannot read.')}
    >
      {error ? (
        <Stack spacing={2}>
          <Alert severity="error">{error}</Alert>
          <Button component={RouterLink} to="/login" variant="contained" size="large">
            {t('로그인으로 돌아가기', 'Back to sign in')}
          </Button>
          <Button component={RouterLink} to="/register" variant="text">
            {t('새 계정 만들기', 'Create an account')}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2} alignItems="center" role="status" aria-live="polite">
          <CircularProgress />
          <Typography color="text.secondary">{t('로그인 세션을 확인하고 있습니다. 잠시만 기다려 주세요.', 'Checking your sign-in session. Please wait a moment.')}</Typography>
        </Stack>
      )}
    </AuthLayout>
  );
};

export default AuthCallback;
