import React, { useEffect, useState } from 'react';
import { Alert, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/authService';
import { websocketService } from '../services/websocketService';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store/types';
import AuthLayout from '../components/AuthLayout';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate('/feed', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await authService.login(email, password);
      if (!user) {
        throw new Error('사용자 정보를 받지 못했어.');
      }

      dispatch(setUser(user));
      websocketService.setCurrentUserId(user.id);
      websocketService.initialize(user.id);

      const redirectPath = (location.state as any)?.from?.pathname || '/feed';
      navigate(redirectPath, { replace: true });
    } catch {
      setError('로그인에 실패했어. 이메일과 비밀번호를 확인해줘.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="WELCOME BACK" title="다시 만나서 반가워." description="이웃의 새 소식과 도착한 매칭을 확인해봐.">
      <Stack spacing={2.25} component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          required
          fullWidth
          label="이메일"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          required
          fullWidth
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" size="large" variant="contained" disabled={isLoading} fullWidth sx={{ minHeight: 50 }}>
          {isLoading ? '로그인 중...' : '로그인'}
        </Button>
        <Divider>처음 왔어?</Divider>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          아직 계정이 없다면{' '}
          <Button component={RouterLink} to="/register" size="small" sx={{ minHeight: 0, p: 0.5 }}>
            회원가입하기
          </Button>
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default Login;
