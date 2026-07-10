import React from 'react';
import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const highlights = [
  { icon: <LocationOnRoundedIcon />, text: '가까운 동네 친구' },
  { icon: <FavoriteRoundedIcon />, text: '관심사 기반 매칭' },
  { icon: <ForumRoundedIcon />, text: '편안한 1:1 대화' },
];

const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, title, description, children }) => (
  <Box component="main" sx={{ minHeight: { xs: 'auto', md: 'calc(100vh - 73px)' }, display: 'grid', alignItems: 'center' }}>
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
      <Paper
        sx={{
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          boxShadow: '0 28px 80px rgba(77, 48, 40, 0.12)',
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.92fr) minmax(420px, 1.08fr)' } }}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 620,
              p: 6,
              color: '#fff',
              background:
                'radial-gradient(circle at 18% 15%, rgba(255,255,255,.24), transparent 12rem), linear-gradient(145deg, #E85C4A 0%, #D94F6D 58%, #9C4B72 100%)',
            }}
          >
            <Box>
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label="우리 동네 취향 커뮤니티"
                sx={{ bgcolor: 'rgba(255,255,255,.16)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
              />
              <Typography variant="h3" sx={{ mt: 3, maxWidth: 420 }}>
                낯선 동네도,
                <br />마음 맞는 이웃과 함께.
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 420, color: 'rgba(255,255,255,.82)', lineHeight: 1.75 }}>
                취향을 나누고, 가까운 모임을 발견하고, 오래 이어질 대화를 시작해봐.
              </Typography>
            </Box>
            <Stack spacing={1.5}>
              {highlights.map((item) => (
                <Stack key={item.text} direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.14)' }}>
                    {item.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 5, md: 7 }, alignSelf: 'center' }}>
            <Stack spacing={3.5} sx={{ maxWidth: 460, mx: 'auto' }}>
              <Box>
                <Typography variant="overline" color="primary.main" sx={{ fontWeight: 900, letterSpacing: '0.12em' }}>
                  {eyebrow}
                </Typography>
                <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
                  {title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                  {description}
                </Typography>
              </Box>
              {children}
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Container>
  </Box>
);

export default AuthLayout;
