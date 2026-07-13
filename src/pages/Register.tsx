import React, { useState } from 'react';
import { Alert, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import { AppDispatch } from '../store/types';
import AuthLayout from '../components/AuthLayout';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
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

      const user = await authService.register(formData.email, formData.password, formData.username);
      if (!user) {
        throw new Error('회원가입 응답에 사용자 정보가 없어.');
      }

      dispatch(setUser(user));
      navigate('/onboarding', { replace: true });
    } catch {
      setError('회원가입에 실패했어. 잠시 뒤 다시 시도해줘.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="JOIN THE NEIGHBORHOOD" title="우리 동네에 인사해볼까?" description="기본 계정을 만들고 관심사와 위치를 더하면 더 잘 맞는 이웃을 만날 수 있어.">
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField required fullWidth label="이메일" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} />
        <TextField required fullWidth label="닉네임" name="username" autoComplete="nickname" value={formData.username} onChange={handleChange} helperText="이웃에게 보여줄 이름이야." />
        <TextField required fullWidth label="비밀번호" name="password" type="password" autoComplete="new-password" value={formData.password} onChange={handleChange} />
        <TextField required fullWidth label="비밀번호 확인" name="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} />
        <Button type="submit" size="large" variant="contained" disabled={isLoading} fullWidth sx={{ minHeight: 50 }}>
          {isLoading ? '가입 중...' : '이웃톡 시작하기'}
        </Button>
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
