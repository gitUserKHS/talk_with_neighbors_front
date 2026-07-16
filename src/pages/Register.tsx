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
import { useI18n } from '../i18n/I18nProvider';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const steps = [t('이메일', 'Email'), t('인증번호', 'Verification'), t('계정 정보', 'Account')];
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
      setSuccess(t('인증번호를 보냈습니다. 메일함을 확인해 주세요.', 'We sent a verification code. Please check your inbox.'));
    } catch (requestError) {
      const presentation = authErrorPresentation(
        requestError,
        t('인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not send the verification email. Please try again shortly.'),
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
      setError(t('메일로 받은 6자리 인증번호를 입력해 주세요.', 'Enter the six-digit code from your email.'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmEmailVerification(challenge.challengeId, verificationCode);
      setActiveStep(2);
      setSuccess(t('이메일 인증이 완료되었습니다. 계정 정보를 입력해 주세요.', 'Your email has been verified. Please enter your account details.'));
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        t('인증번호를 확인하지 못했습니다. 다시 입력해 주세요.', 'We could not verify that code. Please enter it again.'),
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
      setSuccess(t('새 인증번호를 보냈습니다. 이전 번호는 더 이상 사용할 수 없습니다.', 'We sent a new code. The previous code is no longer valid.'));
    } catch (requestError) {
      const presentation = authErrorPresentation(
        requestError,
        t('인증번호를 다시 보내지 못했습니다.', 'We could not resend the verification code.'),
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
      setError(t('비밀번호는 8자 이상으로 입력해 주세요.', 'Your password must be at least 8 characters.'));
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError(t('비밀번호가 일치하지 않습니다.', 'The passwords do not match.'));
      return;
    }

    setIsLoading(true);
    try {
      const usernameExists = await authService.checkUsernameDuplicate(account.username);
      if (usernameExists) {
        setError(t('이미 사용 중인 닉네임입니다.', 'That nickname is already in use.'));
        return;
      }

      const user = await authService.register(email, account.password, account.username.trim());
      if (!user) throw new Error(t('회원가입 응답에서 사용자 정보를 확인하지 못했습니다.', 'We could not retrieve your account after registration.'));

      dispatch(setUser(user));
      navigate('/onboarding', { replace: true });
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        t('회원가입하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not create your account. Please try again shortly.'),
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
      eyebrow={t('회원가입', 'JOIN THE NEIGHBORHOOD')}
      title={t('우리 동네 이웃과 연결해 보세요.', 'Meet people in your neighborhood.')}
      description={t('계정을 만든 뒤 관심사와 활동 지역을 설정하면 잘 맞는 이웃을 만날 수 있습니다.', 'Create an account, add your interests and area, and discover neighbors who fit your pace.')}
    >
      <Stack spacing={2.5}>
        {emailVerificationEnabled === true && (
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {capabilitiesUnavailable && (
          <Alert severity="warning">{t('인증 설정을 확인하지 못했습니다. 현재 가입 정책에 따라 계속 진행합니다.', 'We could not check the verification settings. Registration will continue under the current server policy.')}</Alert>
        )}

        {emailVerificationEnabled === null && (
          <Stack alignItems="center" spacing={1.5} role="status" aria-live="polite" sx={{ py: 3 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">{t('사용할 수 있는 가입 방법을 확인하고 있습니다.', 'Checking available sign-up options...')}</Typography>
          </Stack>
        )}

        {emailVerificationEnabled === true && activeStep === 0 && (
          <>
            <Stack spacing={2} component="form" onSubmit={handleEmailRequest}>
              <TextField
                required
                fullWidth
                label={t('이메일', 'Email')}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                helperText={t('가입에 사용할 이메일로 인증번호를 보내드립니다.', 'We will send a verification code to this email.')}
              />
              <Button type="submit" size="large" variant="contained" disabled={isLoading || resendSeconds > 0} fullWidth sx={{ minHeight: 50 }}>
                {isLoading
                  ? t('보내는 중...', 'Sending...')
                  : resendSeconds > 0
                    ? t(`${resendSeconds}초 후 다시 시도`, `Try again in ${resendSeconds}s`)
                    : t('인증번호 받기', 'Send verification code')}
              </Button>
            </Stack>
            <SocialLoginButtons returnTo="/onboarding" label={t('또는 간편 가입', 'Or sign up with')} />
          </>
        )}

        {emailVerificationEnabled === true && activeStep === 1 && (
          <Stack spacing={2} component="form" onSubmit={handleCodeConfirm}>
            <Typography variant="body2" color="text.secondary">
              {t(`${email}로 보낸 인증번호를 입력해 주세요.`, `Enter the verification code sent to ${email}.`)}
            </Typography>
            <TextField
              required
              fullWidth
              autoFocus
              label={t('6자리 인증번호', 'Six-digit verification code')}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
            />
            <Button type="submit" size="large" variant="contained" disabled={isLoading || verificationCode.length !== 6} fullWidth sx={{ minHeight: 50 }}>
              {isLoading ? t('확인 중...', 'Verifying...') : t('인증번호 확인', 'Verify code')}
            </Button>
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Button type="button" size="small" onClick={restartEmailVerification}>{t('이메일 변경', 'Change email')}</Button>
              <Button type="button" size="small" onClick={handleResend} disabled={isLoading || resendSeconds > 0}>
                {resendSeconds > 0
                  ? t(`${resendSeconds}초 후 다시 받기`, `Resend in ${resendSeconds}s`)
                  : t('인증번호 다시 받기', 'Resend code')}
              </Button>
            </Stack>
          </Stack>
        )}

        {(emailVerificationEnabled === false || activeStep === 2) && (
          <Stack spacing={2} component="form" onSubmit={handleRegister}>
            {emailVerificationEnabled ? (
              <TextField fullWidth label={t('인증된 이메일', 'Verified email')} value={email} disabled />
            ) : (
              <TextField
                required
                fullWidth
                label={t('이메일', 'Email')}
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
              label={t('닉네임', 'Nickname')}
              name="username"
              autoComplete="nickname"
              value={account.username}
              onChange={(event) => setAccount((current) => ({ ...current, username: event.target.value }))}
              helperText={t('다른 이웃에게 표시되는 이름입니다.', 'This is the name other neighbors will see.')}
            />
            <TextField
              required
              fullWidth
              label={t('비밀번호', 'Password')}
              name="password"
              type="password"
              autoComplete="new-password"
              value={account.password}
              onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))}
              helperText={t('8자 이상으로 입력해 주세요.', 'Use at least 8 characters.')}
            />
            <TextField
              required
              fullWidth
              label={t('비밀번호 확인', 'Confirm password')}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={account.confirmPassword}
              onChange={(event) => setAccount((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
            <Button type="submit" size="large" variant="contained" disabled={isLoading} fullWidth sx={{ minHeight: 50 }}>
              {isLoading ? t('가입 중...', 'Creating account...') : t('이웃톡 시작하기', 'Join Neighbor Talk')}
            </Button>
            {emailVerificationEnabled === false && (
              <SocialLoginButtons returnTo="/onboarding" label={t('또는 간편 가입', 'Or sign up with')} />
            )}
          </Stack>
        )}

        <Divider>{t('이미 계정이 있으신가요?', 'Already have an account?')}</Divider>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('계정이 있다면', 'If you already have an account')}{' '}
          <Button component={RouterLink} to="/login" size="small" sx={{ minHeight: 0, p: 0.5 }}>
            {t('로그인', 'Sign in')}
          </Button>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Register;
