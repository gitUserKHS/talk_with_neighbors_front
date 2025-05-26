import React from 'react';
import { Container, Typography, Box, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { authService } from '../services/authService';
import { RootState } from '../store/types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { unreadOfflineCount, connectionStatus } = useSelector(
    (state: RootState) => state.notifications
  );

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
        
        {/* 🎯 사용자 상태 및 알림 현황 */}
        {user && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              안녕하세요, {user.username}님! 👋
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
              <Chip 
                label={connectionStatus.isOnline ? '🟢 온라인' : '🔴 오프라인'} 
                size="small" 
                color={connectionStatus.isOnline ? 'success' : 'error'}
              />
              {unreadOfflineCount > 0 && (
                <Chip 
                  label={`📬 ${unreadOfflineCount}개 알림`} 
                  size="small" 
                  color="warning"
                  onClick={() => navigate('/chat')}
                  sx={{ cursor: 'pointer' }}
                />
              )}
            </Box>
          </Box>
        )}
        
        <Typography variant="body1" align="center" sx={{ mb: 4 }}>
          주변 이웃과 대화를 나누고 새로운 친구를 만나보세요.
          <br />
          <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            💬 실시간 채팅 · 📱 스마트 알림 · 🤝 매칭 시스템
          </Typography>
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
              🤝 랜덤 매칭 시작하기
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
              💬 채팅방 검색
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;