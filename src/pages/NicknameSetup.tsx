import React, { useMemo, useState } from 'react';
import { AutoAwesome, LogoutOutlined } from '@mui/icons-material';
import {
  Alert, Avatar, Button, Container, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authErrorPresentation, authService } from '../services/authService';
import { sanitizeReturnTo } from '../services/authNavigation';
import {
  NICKNAME_SETUP_PATH, profileOnboardingDestination, requiredProfileSetupPath,
} from '../services/profileSetup';
import { logout, setUser } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store/types';
import { useI18n } from '../i18n/I18nProvider';

const NicknameSetup: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const returnTo = useMemo(() => {
    const value = new URLSearchParams(location.search).get('returnTo');
    return sanitizeReturnTo(value);
  }, [location.search]);

  if (!user) return null;

  const requiredPath = requiredProfileSetupPath(user);
  if (requiredPath !== NICKNAME_SETUP_PATH) {
    return <Navigate
      to={requiredPath ? profileOnboardingDestination(returnTo) : returnTo}
      replace
    />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = nickname.trim();
    const candidateLength = Array.from(candidate).length;
    const hasForbiddenCharacters = /\s|[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/.test(candidate);
    if (candidateLength < 2 || candidateLength > 30 || hasForbiddenCharacters) {
      setError(t('닉네임은 공백 없이 2자 이상 30자 이하로 입력해 주세요.', 'Enter a nickname between 2 and 30 characters without spaces.'));
      return;
    }
    if (candidate === user.username) {
      setError(t('자동으로 생성된 이름과 다른 닉네임을 입력해 주세요.', 'Choose a nickname different from the automatically generated name.'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (await authService.checkUsernameDuplicate(candidate)) {
        setError(t('이미 사용 중인 닉네임입니다. 다른 이름을 선택해 주세요.', 'That nickname is already in use. Please choose another one.'));
        return;
      }
      const updated = await authService.updateNickname(candidate);
      dispatch(setUser(updated));
      navigate(
        updated.profileComplete === false ? profileOnboardingDestination(returnTo) : returnTo,
        { replace: true },
      );
    } catch (requestError) {
      setError(authErrorPresentation(
        requestError,
        t('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not save your nickname. Please try again shortly.'),
      ).message);
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await authService.logout();
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderRadius: 5 }}>
        <Stack component="form" spacing={3} onSubmit={submit}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            <AutoAwesome />
          </Avatar>
          <Stack spacing={1}>
            <Typography variant="overline" color="primary" fontWeight={800}>
              {t('마지막 단계', 'ONE LAST STEP')}
            </Typography>
            <Typography variant="h4" fontWeight={900}>{t('이웃에게 보여줄 닉네임을 정해 주세요', 'Choose the name your neighbors will see')}</Typography>
            <Typography color="text.secondary">
              {t('소셜 로그인용 임시 이름 대신 글과 모임에서 사용할 이름이 필요합니다.', 'Choose a name to use in posts, meetups, and conversations.')}
            </Typography>
          </Stack>

          <Alert severity="info">
            {t(`현재 임시 이름은 ${user.username}입니다. 이 이름은 그대로 사용할 수 없습니다.`, `Your temporary name is ${user.username}. You will need to choose a different one.`)}
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            required
            autoFocus
            fullWidth
            label={t('새 닉네임', 'New nickname')}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            inputProps={{ minLength: 2, maxLength: 60 }}
            helperText={t(`${Array.from(nickname.trim()).length}/30 · 공백 없이 2자 이상 입력해 주세요`, `${Array.from(nickname.trim()).length}/30 · Use at least 2 characters with no spaces`)}
            autoComplete="nickname"
          />
          <Button type="submit" variant="contained" size="large" disabled={saving}>
            {saving ? t('닉네임 확인 중...', 'Checking nickname...') : t('이 닉네임으로 시작하기', 'Continue with this nickname')}
          </Button>
          <Button
            type="button"
            color="inherit"
            startIcon={<LogoutOutlined />}
            disabled={saving}
            onClick={signOut}
          >
            {t('다른 계정으로 로그인', 'Sign in with another account')}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default NicknameSetup;
