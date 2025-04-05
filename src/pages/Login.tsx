import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Box, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 이미 로그인된 상태라면 홈으로 리디렉션
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authService.login(email, password);
      // URL 파라미터에서 redirect 경로 확인
      const params = new URLSearchParams(location.search);
      const redirectPath = params.get('redirect') || (location.state as any)?.from?.pathname || '/';
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          로그인
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default Login;