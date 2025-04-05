import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
  const [duplicateErrors, setDuplicateErrors] = useState({
    email: '',
    username: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // 입력 필드가 변경되면 해당 필드의 중복 에러 메시지를 초기화
    setDuplicateErrors(prev => ({
      ...prev,
      [name]: '',
    }));
  };

  const checkDuplicates = async () => {
    try {
      const response = await authService.checkDuplicates(formData.email, formData.username);
      const newErrors = {
        email: response.emailExists ? '이미 사용 중인 이메일입니다.' : '',
        username: response.usernameExists ? '이미 사용 중인 사용자 이름입니다.' : '',
      };
      setDuplicateErrors(newErrors);
      return !response.emailExists && !response.usernameExists;
    } catch (err) {
      setError('중복 확인 중 오류가 발생했습니다.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 중복 체크
    const isAvailable = await checkDuplicates();
    if (!isAvailable) {
      return;
    }

    try {
      await authService.register(formData.email, formData.password, formData.username);
      navigate('/');
    } catch (err) {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          회원가입
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="이메일"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!duplicateErrors.email}
            helperText={duplicateErrors.email}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="사용자 이름"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={!!duplicateErrors.username}
            helperText={duplicateErrors.username}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="비밀번호"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="비밀번호 확인"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
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
            sx={{ mt: 3, mb: 2 }}
          >
            회원가입
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default Register; 