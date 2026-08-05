import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authErrorPresentation, authService } from '../services/authService';
import { returnToFromRouteState } from '../services/authNavigation';
import { destinationAfterAuthentication } from '../services/profileSetup';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store/types';
import AuthLayout from '../components/AuthLayout';
import PasswordResetLink from '../components/auth/PasswordResetLink';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { useI18n } from '../i18n/I18nProvider';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const authenticatedUser = useSelector((state: RootState) => state.auth.user);
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const returnTo = useMemo(() => returnToFromRouteState(location.state), [location.state]);

  useEffect(() => {
    if (isAuthenticated && authenticatedUser) {
      navigate(destinationAfterAuthentication(authenticatedUser, returnTo), { replace: true });
    }
  }, [authenticatedUser, isAuthenticated, navigate, returnTo]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await authService.login(email, password);
      if (!user) throw new Error(t('사용자 정보를 확인하지 못했습니다.', 'We could not retrieve your account information.'));

      dispatch(setUser(user));
      navigate(destinationAfterAuthentication(user, returnTo), { replace: true });
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        t('로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.', 'We could not sign you in. Check your email and password.'),
      ).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={t('다시 오신 것을 환영합니다', 'WELCOME BACK')}
      title={t('다시 만나서 반갑습니다.', 'Good to see you again.')}
      description={t('이웃의 새로운 소식과 도착한 매칭을 확인해 보세요.', 'See what is new nearby and check your latest matches.')}
    >
      <Stack spacing={2.25}>
        <Stack spacing={2.25} component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            required
            fullWidth
            label={t('이메일', 'Email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            required
            fullWidth
            label={t('비밀번호', 'Password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="submit"
            size="large"
            variant="contained"
            disabled={isLoading}
            fullWidth
            sx={{ minHeight: 50 }}
          >
            {isLoading ? t('로그인 중...', 'Signing in...') : t('로그인', 'Sign in')}
          </Button>
        </Stack>

        <PasswordResetLink />

        <SocialLoginButtons returnTo={returnTo} />

        <Divider>{t('이웃톡이 처음이신가요?', 'New to Neighbor Talk?')}</Divider>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('아직 계정이 없다면', 'If you do not have an account yet')}{' '}
          <Button component={RouterLink} to="/register" size="small" sx={{ minHeight: 0, p: 0.5 }}>
            {t('회원가입', 'Create an account')}
          </Button>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
