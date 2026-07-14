import React from 'react';
import { Avatar, AvatarGroup, Box, Button, Card, Chip, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { RootState } from '../store/types';
import Feed from './Feed';

const features = [
  {
    icon: <AutoAwesomeRoundedIcon />,
    title: '취향으로 먼저 연결',
    description: '공통 관심사와 활동 성향을 바탕으로 대화가 잘 통할 이웃을 추천해.',
  },
  {
    icon: <LocationOnRoundedIcon />,
    title: '가까운 동네 모임',
    description: '산책, 러닝, 독서처럼 오늘 바로 함께할 수 있는 취미 모임을 찾아봐.',
  },
  {
    icon: <ForumRoundedIcon />,
    title: '부담 없는 첫 대화',
    description: '매칭이 성사되면 안전한 1:1 채팅에서 천천히 서로를 알아갈 수 있어.',
  },
];

const Home: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user?.profileComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user) {
    return <Feed />;
  }

  return (
    <Box component="main" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 380,
            height: 380,
            borderRadius: '50%',
            bgcolor: 'rgba(232, 92, 74, 0.10)',
            filter: 'blur(2px)',
            top: -180,
            right: -80,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            bgcolor: 'rgba(35, 133, 121, 0.09)',
            bottom: -120,
            left: -100,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.03fr 0.97fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
            <Stack spacing={3.25} alignItems={{ xs: 'flex-start' }}>
              <Chip
                icon={<Diversity3RoundedIcon />}
                label="우리 동네 취향 커뮤니티"
                color="secondary"
                variant="outlined"
                sx={{ bgcolor: 'rgba(255,255,255,.72)', borderColor: 'rgba(35,133,121,.26)' }}
              />
              <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '2.65rem', sm: '3.6rem', md: '4.35rem' }, maxWidth: 680 }}>
                가까운 곳에서,
                <br />마음 맞는 <Box component="span" sx={{ color: 'primary.main' }}>이웃</Box>을 만나봐.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 620, lineHeight: 1.75, fontWeight: 500 }}>
                피드에서 취향을 나누고, 관심사와 거리로 잘 맞는 사람을 발견해.
                가벼운 인사부터 오래 이어질 동네 친구까지 이웃톡이 자연스럽게 연결해줄게.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                useFlexGap
                flexWrap="wrap"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <Button
                  component={RouterLink}
                  to="/register"
                  size="large"
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ px: 3, minHeight: 52 }}
                >
                  내 이웃 찾기
                </Button>
                <Button component={RouterLink} to="/feed" size="large" variant="outlined" sx={{ px: 3, minHeight: 52, bgcolor: 'rgba(255,255,255,.7)' }}>
                  피드 둘러보기
                </Button>
                <Button component={RouterLink} to="/meetups" size="large" variant="outlined" sx={{ px: 3, minHeight: 52, bgcolor: 'rgba(255,255,255,.7)' }}>
                  모임 둘러보기
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                이미 계정이 있다면{' '}
                <Button component={RouterLink} to="/login" size="small" sx={{ minWidth: 0, p: 0.5 }}>
                  로그인하기
                </Button>
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: 1 }}>
                <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 34, height: 34, fontSize: 13, borderColor: '#FFF9F5' } }}>
                  <Avatar sx={{ bgcolor: '#E85C4A' }}>민</Avatar>
                  <Avatar sx={{ bgcolor: '#238579' }}>준</Avatar>
                  <Avatar sx={{ bgcolor: '#6C63A8' }}>서</Avatar>
                  <Avatar sx={{ bgcolor: '#C68B3C' }}>윤</Avatar>
                </AvatarGroup>
                <Typography variant="body2" color="text.secondary">
                  오늘도 새로운 취향이 연결되고 있어
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ position: 'relative', minHeight: { xs: 440, md: 520 } }} aria-label="이웃톡 커뮤니티 미리보기">
              <Card
                sx={{
                  position: 'absolute',
                  inset: { xs: '8px 8px 40px', sm: '10px 54px 46px', md: '0 30px 48px' },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 4,
                  transform: { md: 'rotate(1.5deg)' },
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDFC 100%)',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 50, height: 50 }}>해</Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={850}>해솔 · 연남동</Typography>
                    <Typography variant="body2" color="text.secondary">방금 전</Typography>
                  </Box>
                  <Chip size="small" label="동네 피드" color="primary" variant="outlined" />
                </Stack>
                <Typography variant="h6" sx={{ mt: 3, lineHeight: 1.55 }}>
                  이번 주말에 경의선숲길 같이 걷고 근처 독립서점 구경할 사람? 🌿
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  {['산책', '독립서점', '사진'].map((tag) => <Chip key={tag} label={`# ${tag}`} size="small" sx={{ bgcolor: '#FFF1ED', color: 'primary.dark' }} />)}
                </Stack>
                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#F3FAF8' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 42, height: 42, bgcolor: '#D97A4A' }}>도</Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={800}>도윤님과 취향 92% 일치</Typography>
                      <Typography variant="caption" color="text.secondary">산책 · 사진 · 에세이</Typography>
                    </Box>
                    <FavoriteRoundedIcon color="primary" />
                  </Stack>
                </Box>
              </Card>

              <Card sx={{ position: 'absolute', left: { xs: 0, sm: 10 }, bottom: 0, p: 2, borderRadius: 3, width: 210, transform: 'rotate(-3deg)' }}>
                <Typography variant="caption" color="text.secondary">이번 주 모임</Typography>
                <Typography fontWeight={850} sx={{ mt: 0.5 }}>한강 저녁 러닝 🏃</Typography>
                <Typography variant="body2" color="text.secondary">토요일 19:00 · 4/6명</Typography>
              </Card>

              <Card sx={{ position: 'absolute', right: { xs: 0, sm: 12 }, top: { xs: 2, sm: 0 }, px: 2, py: 1.5, borderRadius: 3, transform: 'rotate(3deg)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2" fontWeight={800}>새 매칭 도착!</Typography>
                </Stack>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Box textAlign="center" sx={{ maxWidth: 680, mx: 'auto', mb: 5 }}>
          <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 900, letterSpacing: '0.14em' }}>HOW IT WORKS</Typography>
          <Typography variant="h3" sx={{ mt: 1 }}>친해지는 데 필요한 건, 작은 공통점 하나.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.75 }}>프로필을 채우고 취향을 나누면 이웃톡이 자연스러운 다음 만남을 제안해.</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {features.map((feature, index) => (
            <Card key={feature.title} sx={{ p: 3.5, borderRadius: 3.5, height: '100%' }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 3, color: index === 1 ? 'secondary.main' : 'primary.main', bgcolor: index === 1 ? 'rgba(35,133,121,.10)' : 'rgba(232,92,74,.10)' }}>
                {feature.icon}
              </Box>
              <Typography variant="h6" sx={{ mt: 2.5 }}>{feature.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.75 }}>{feature.description}</Typography>
            </Card>
          ))}
        </Box>

        <Box sx={{ mt: { xs: 7, md: 10 }, p: { xs: 3.5, md: 6 }, borderRadius: 4, color: '#fff', background: 'linear-gradient(125deg, #238579 0%, #1E7068 55%, #295B64 100%)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Typography variant="h4">오늘, 동네에서 새로운 이야기를 시작해봐.</Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,.78)' }}>가입은 가볍게, 관계는 천천히. 네 속도대로 만나면 돼.</Typography>
          </Box>
          <Button component={RouterLink} to="/register" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} sx={{ flexShrink: 0, bgcolor: '#fff', color: 'secondary.dark', '&:hover': { bgcolor: '#FFF5F1' } }}>
            무료로 시작하기
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;
