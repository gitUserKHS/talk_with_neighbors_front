import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authErrorPresentation, authService } from '../services/authService';
import { resendDelaySeconds } from '../services/emailVerification';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store/types';
import type { EmailVerificationChallenge } from '../types/auth';
import AuthLayout from '../components/AuthLayout';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';

const STEPS = ['이메일', '인증번호', '계정 정보'];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [challenge, setChallenge] = useState<EmailVerificationChallenge | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [account, setAccount] = useState({
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState<boolean | null>(null);
  const [capabilitiesUnavailable, setCapabilitiesUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    authService.getAuthCapabilities()
      .then((capabilities) => {
        if (mounted) setEmailVerificationEnabled(capabilities.emailVerification.enabled);
      })
      .catch(() => {
        if (!mounted) return;
        // The server remains authoritative: if verification is required it will
        // still reject a registration without a proof cookie.
        setCapabilitiesUnavailable(true);
        setEmailVerificationEnabled(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds > 0]);

  const clearNotices = () => {
    setError('');
    setSuccess('');
  };

  const handleEmailRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    clearNotices();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const nextChallenge = await authService.requestEmailVerification(normalizedEmail);
      setEmail(normalizedEmail);
      setChallenge(nextChallenge);
      setResendSeconds(resendDelaySeconds(nextChallenge));
      setActiveStep(1);
      setSuccess('인증번호를 보냈어. 메일함을 확인해줘.');
    } catch (requestError) {
      const presentation = authErrorPresentation(
        requestError,
        '인증 메일을 보내지 못했어. 잠시 뒤 다시 시도해줘.',
      );
      setError(presentation.message);
      if (presentation.retryAfterSeconds) setResendSeconds(presentation.retryAfterSeconds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    clearNotices();
    if (!challenge || verificationCode.length !== 6) {
      setError('메일로 받은 6자리 인증번호를 입력해줘.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmEmailVerification(challenge.challengeId, verificationCode);
      setActiveStep(2);
      setSuccess('이메일 인증이 끝났어. 이제 계정 정보를 정해줘.');
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        '인증번호를 확인하지 못했어. 다시 입력해줘.',
      ).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challenge || resendSeconds > 0 || isLoading) return;
    clearNotices();
    setIsLoading(true);

    try {
      const nextChallenge = await authService.resendEmailVerification(challenge.challengeId);
      setChallenge(nextChallenge);
      setVerificationCode('');
      setResendSeconds(resendDelaySeconds(nextChallenge));
      setSuccess('새 인증번호를 보냈어. 이전 번호는 사용할 수 없어.');
    } catch (requestError) {
      const presentation = authErrorPresentation(
        requestError,
        '인증번호를 다시 보내지 못했어.',
      );
      setError(presentation.message);
      if (presentation.retryAfterSeconds) setResendSeconds(presentation.retryAfterSeconds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    clearNotices();

    if (account.password.length < 8) {
      setError('비밀번호는 8자 이상으로 만들어줘.');
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError('비밀번호가 서로 달라.');
      return;
    }

    setIsLoading(true);
    try {
      const usernameExists = await authService.checkUsernameDuplicate(account.username);
      if (usernameExists) {
        setError('이미 사용 중인 닉네임이야.');
        return;
      }

      const user = await authService.register(email, account.password, account.username.trim());
      if (!user) throw new Error('회원가입 응답에 사용자 정보가 없어.');

      dispatch(setUser(user));
      navigate('/onboarding', { replace: true });
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        '회원가입에 실패했어. 잠시 뒤 다시 시도해줘.',
      ).message);
    } finally {
      setIsLoading(false);
    }
  };

  const restartEmailVerification = () => {
    setActiveStep(0);
    setChallenge(null);
    setVerificationCode('');
    setResendSeconds(0);
    clearNotices();
  };

  return (
    <AuthLayout
      eyebrow="JOIN THE NEIGHBORHOOD"
      title="우리 동네에 인사해볼까?"
      description="안전하게 계정을 만든 뒤 관심사와 위치를 더하면 잘 맞는 이웃을 만날 수 있어."
    >
      <Stack spacing={2.5}>
        {emailVerificationEnabled === true && (
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {capabilitiesUnavailable && (
          <Alert severity="warning">인증 설정을 확인하지 못했어. 서버의 가입 정책에 따라 진행할게.</Alert>
        )}

        {emailVerificationEnabled === null && (
          <Stack alignItems="center" spacing={1.5} role="status" aria-live="polite" sx={{ py: 3 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">사용할 수 있는 가입 방법을 확인하고 있어.</Typography>
          </Stack>
        )}

        {emailVerificationEnabled === true && activeStep === 0 && (
          <>
            <Stack spacing={2} component="form" onSubmit={handleEmailRequest}>
              <TextField
                required
                fullWidth
                label="이메일"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                helperText="가입에 사용할 이메일로 인증번호를 보내줄게."
              />
              <Button type="submit" size="large" variant="contained" disabled={isLoading || resendSeconds > 0} fullWidth sx={{ minHeight: 50 }}>
                {isLoading ? '보내는 중...' : resendSeconds > 0 ? `${resendSeconds}초 후 다시 시도` : '인증번호 받기'}
              </Button>
            </Stack>
            <SocialLoginButtons returnTo="/onboarding" label="또는 간편 가입" />
          </>
        )}

        {emailVerificationEnabled === true && activeStep === 1 && (
          <Stack spacing={2} component="form" onSubmit={handleCodeConfirm}>
            <Typography variant="body2" color="text.secondary">
              <strong>{email}</strong>로 보낸 인증번호를 입력해줘.
            </Typography>
            <TextField
              required
              fullWidth
              autoFocus
              label="6자리 인증번호"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
            />
            <Button type="submit" size="large" variant="contained" disabled={isLoading || verificationCode.length !== 6} fullWidth sx={{ minHeight: 50 }}>
              {isLoading ? '확인 중...' : '인증번호 확인'}
            </Button>
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Button type="button" size="small" onClick={restartEmailVerification}>이메일 바꾸기</Button>
              <Button type="button" size="small" onClick={handleResend} disabled={isLoading || resendSeconds > 0}>
                {resendSeconds > 0 ? `${resendSeconds}초 후 다시 받기` : '인증번호 다시 받기'}
              </Button>
            </Stack>
          </Stack>
        )}

        {(emailVerificationEnabled === false || activeStep === 2) && (
          <Stack spacing={2} component="form" onSubmit={handleRegister}>
            {emailVerificationEnabled ? (
              <TextField fullWidth label="인증된 이메일" value={email} disabled />
            ) : (
              <TextField
                required
                fullWidth
                label="이메일"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
            <TextField
              required
              fullWidth
              label="닉네임"
              name="username"
              autoComplete="nickname"
              value={account.username}
              onChange={(event) => setAccount((current) => ({ ...current, username: event.target.value }))}
              helperText="이웃에게 보여줄 이름이야."
            />
            <TextField
              required
              fullWidth
              label="비밀번호"
              name="password"
              type="password"
              autoComplete="new-password"
              value={account.password}
              onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))}
              helperText="8자 이상으로 만들어줘."
            />
            <TextField
              required
              fullWidth
              label="비밀번호 확인"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={account.confirmPassword}
              onChange={(event) => setAccount((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
            <Button type="submit" size="large" variant="contained" disabled={isLoading} fullWidth sx={{ minHeight: 50 }}>
              {isLoading ? '가입 중...' : '이웃톡 시작하기'}
            </Button>
            {emailVerificationEnabled === false && (
              <SocialLoginButtons returnTo="/onboarding" label="또는 간편 가입" />
            )}
          </Stack>
        )}

        <Divider>이미 이웃이야?</Divider>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          계정이 있다면{' '}
          <Button component={RouterLink} to="/login" size="small" sx={{ minHeight: 0, p: 0.5 }}>
            로그인하기
          </Button>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Register;
