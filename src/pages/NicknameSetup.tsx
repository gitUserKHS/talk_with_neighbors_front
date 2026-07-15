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

const NicknameSetup: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
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
      setError('닉네임은 공백 없이 2자 이상 30자 이하로 입력해줘.');
      return;
    }
    if (candidate === user.username) {
      setError('자동으로 만들어진 이름과 다른 닉네임을 정해줘.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (await authService.checkUsernameDuplicate(candidate)) {
        setError('이미 사용 중인 닉네임이야. 다른 이름을 골라줘.');
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
        '닉네임을 저장하지 못했어. 잠시 뒤 다시 시도해줘.',
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
              ONE LAST STEP
            </Typography>
            <Typography variant="h4" fontWeight={900}>이웃에게 보여줄 닉네임을 정해줘</Typography>
            <Typography color="text.secondary">
              소셜 로그인용 임시 이름 대신, 글과 모임에서 사용할 이름이 필요해.
            </Typography>
          </Stack>

          <Alert severity="info">
            현재 임시 이름은 <strong>{user.username}</strong>이야. 이 이름은 그대로 사용할 수 없어.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            required
            autoFocus
            fullWidth
            label="새 닉네임"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            inputProps={{ minLength: 2, maxLength: 60 }}
            helperText={`${Array.from(nickname.trim()).length}/30 · 공백 없이 2자 이상 입력해줘`}
            autoComplete="nickname"
          />
          <Button type="submit" variant="contained" size="large" disabled={saving}>
            {saving ? '닉네임 확인 중...' : '이 닉네임으로 시작하기'}
          </Button>
          <Button
            type="button"
            color="inherit"
            startIcon={<LogoutOutlined />}
            disabled={saving}
            onClick={signOut}
          >
            다른 계정으로 로그인
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default NicknameSetup;
