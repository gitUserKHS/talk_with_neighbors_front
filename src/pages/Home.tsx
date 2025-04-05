import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Talk With Neighbors
        </Typography>
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          주변 이웃과 대화를 나누고 새로운 친구를 만나보세요.
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => handleNavigate('/matching')}
              sx={{ height: '100px', fontSize: '1.2rem' }}
            >
              랜덤 매칭 시작하기
            </Button>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => handleNavigate('/chat')}
              sx={{ height: '100px', fontSize: '1.2rem' }}
            >
              채팅방 검색
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;