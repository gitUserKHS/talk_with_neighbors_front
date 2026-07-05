import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/authService';
import { websocketService } from '../services/websocketService';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store/types';

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
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
          <Box textAlign="center">
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              로그인
            </Typography>
            <Typography variant="body2" color="text.secondary">
              다시 만나서 반가워.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            required
            fullWidth
            label="이메일"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            required
            fullWidth
            label="비밀번호"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={isLoading} fullWidth>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
          <Button component={RouterLink} to="/register" fullWidth>
            계정이 없다면 회원가입
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Login;
