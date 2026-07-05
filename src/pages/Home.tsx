import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { RootState } from '../store/types';
import Feed from './Feed';

const Home: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user) {
    return <Feed />;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4} alignItems="center" textAlign="center">
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
            관심사가 통하는 이웃을 만나는 곳
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 640 }}>
            이웃톡은 피드에서 취향을 나누고, 관심사 점수가 잘 맞는 사람에게 매칭 요청을 보내
            1:1 채팅으로 이어지는 소셜 앱이야.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={RouterLink} to="/login" size="large" variant="contained">
            로그인
          </Button>
          <Button component={RouterLink} to="/register" size="large" variant="outlined">
            회원가입
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export default Home;
