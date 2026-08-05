import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useI18n } from '../i18n/I18nProvider';
import passwordResetService from '../services/passwordResetService';
import { serverErrorMessage } from '../services/apiError';

type Step = 'request' | 'confirm' | 'done';

const PasswordReset: React.FC = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    passwordResetService.isAvailable().then((enabled) => {
      if (active) setAvailable(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const failure = (err: unknown, korean: string, english: string) =>
    (locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(korean, english);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await passwordResetService.requestCode(email.trim());
      setStep('confirm');
    } catch (err) {
      setError(failure(err, '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'Could not process the request. Please try again shortly.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await passwordResetService.confirm(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (err) {
      setError(failure(err, '인증번호가 올바르지 않거나 만료되었습니다.', 'That code is incorrect or has expired.'));
    } finally {
      setBusy(false);
    }
  };

  if (available === false) {
    return (
      <AuthLayout
        eyebrow={t('비밀번호 재설정', 'Password reset')}
        title={t('지금은 이용할 수 없습니다', 'Not available right now')}
        description={t(
          '비밀번호 재설정 메일 발송이 준비되어 있지 않습니다. 소셜 로그인으로 접속하거나 관리자에게 문의해 주세요.',
          'Password reset email delivery is not configured. Try a social login or contact the operator.',
        )}
      >
        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          {t('로그인으로 돌아가기', 'Back to sign in')}
        </Button>
      </AuthLayout>
    );
  }

  if (step === 'done') {
    return (
      <AuthLayout
        eyebrow={t('비밀번호 재설정', 'Password reset')}
        title={t('비밀번호를 변경했습니다', 'Your password is updated')}
        description={t(
          '보안을 위해 기존에 로그인되어 있던 모든 기기에서 로그아웃했습니다. 새 비밀번호로 다시 로그인해 주세요.',
          'For your security every existing session was signed out. Sign in again with your new password.',
        )}
      >
        <Button onClick={() => navigate('/login', { replace: true })} variant="contained" fullWidth>
          {t('로그인하기', 'Sign in')}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow={t('비밀번호 재설정', 'Password reset')}
      title={step === 'request'
        ? t('가입한 이메일을 알려 주세요', 'What email did you sign up with?')
        : t('메일로 받은 인증번호를 입력해 주세요', 'Enter the code we emailed you')}
      description={step === 'request'
        ? t(
          '가입되어 있다면 인증번호를 보내 드립니다.',
          'If the address is registered, we will send a verification code.',
        )
        : t(
          '메일이 오지 않았다면 스팸함도 확인해 주세요.',
          'If the email has not arrived, check your spam folder as well.',
        )}
    >
      <Box component="form" onSubmit={step === 'request' ? requestCode : confirm}>
        <Stack spacing={2}>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

          {step === 'confirm' && (
            <Alert severity="info">
              {t(
                '가입된 주소라면 인증번호가 발송되었습니다.',
                'If that address is registered, a code is on its way.',
              )}
            </Alert>
          )}

          <TextField
            label={t('이메일', 'Email')}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={step === 'confirm'}
            required
            fullWidth
            autoComplete="email"
          />

          {step === 'confirm' && (
            <>
              <TextField
                label={t('인증번호 6자리', '6-digit code')}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                fullWidth
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                autoComplete="one-time-code"
              />
              <TextField
                label={t('새 비밀번호', 'New password')}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                helperText={t('8자 이상 입력해 주세요.', 'Use at least 8 characters.')}
              />
            </>
          )}

          <Button type="submit" variant="contained" fullWidth disabled={busy || available === null}>
            {step === 'request'
              ? t('인증번호 받기', 'Send code')
              : t('비밀번호 변경', 'Update password')}
          </Button>

          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            {step === 'confirm' && (
              <Button size="small" onClick={() => { setStep('request'); setError(null); }} sx={{ minHeight: 0, p: 0.5 }}>
                {t('이메일 다시 입력', 'Change email')}
              </Button>
            )}
            <Typography variant="body2" color="text.secondary">
              <Button component={RouterLink} to="/login" size="small" sx={{ minHeight: 0, p: 0.5 }}>
                {t('로그인으로 돌아가기', 'Back to sign in')}
              </Button>
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </AuthLayout>
  );
};

export default PasswordReset;
