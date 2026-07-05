import React, { useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 서로 달라.');
      return;
    }

    setIsLoading(true);
    try {
      const duplicate = await authService.checkDuplicates(formData.email, formData.username);
      if (duplicate.emailExists) {
        setError('이미 사용 중인 이메일이야.');
        return;
      }
      if (duplicate.usernameExists) {
        setError('이미 사용 중인 닉네임이야.');
        return;
      }

      await authService.register(formData.email, formData.password, formData.username);
      navigate('/feed', { replace: true });
    } catch {
      setError('회원가입에 실패했어. 잠시 뒤 다시 시도해줘.');
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
              회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary">
              관심사가 통하는 이웃을 만나보자.
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField required fullWidth label="이메일" name="email" type="email" value={formData.email} onChange={handleChange} />
          <TextField required fullWidth label="닉네임" name="username" value={formData.username} onChange={handleChange} />
          <TextField required fullWidth label="비밀번호" name="password" type="password" value={formData.password} onChange={handleChange} />
          <TextField required fullWidth label="비밀번호 확인" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} />
          <Button type="submit" variant="contained" disabled={isLoading} fullWidth>
            {isLoading ? '가입 중...' : '회원가입'}
          </Button>
          <Button component={RouterLink} to="/login" fullWidth>
            이미 계정이 있어
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Register;
