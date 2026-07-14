import React, { useEffect, useState } from 'react';
import { Avatar, Box, Button, Card, CardContent, CardMedia, Chip, CircularProgress, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { RootState } from '../store/types';
import Feed from './Feed';
import { feedService } from '../services/feedService';
import { meetupService } from '../services/meetupService';
import { formatMeetupDateTime } from '../services/meetupDateTime';
import type { FeedPost } from '../types/feed';
import type { HobbyMeetup } from '../types/meetup';

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

const portfolioHighlights = [
  {
    icon: <LockPersonRoundedIcon />,
    label: 'PUBLIC / PRIVATE',
    title: '공개 탐색과 회원 기능 분리',
    description: '로그인 없이 공개 콘텐츠만 둘러보고, 쓰기·댓글·매칭·채팅은 인증 경계 안에서 동작해.',
  },
  {
    icon: <ShieldRoundedIcon />,
    label: 'PRIVACY BY DESIGN',
    title: '공개 전용 데이터 설계',
    description: '일반 회원의 식별정보·정확한 위치·채팅 정보는 공개 응답에서 제외하고, 운영팀 콘텐츠는 공식 표시로 구분해.',
  },
  {
    icon: <CloudDoneRoundedIcon />,
    label: 'DELIVERY',
    title: '테스트부터 AWS 배포까지',
    description: 'GitHub Actions로 검증하고 컨테이너 이미지를 만들어 AWS k3s 환경에 반영하는 흐름을 갖췄어.',
  },
];

const PublicContentHighlights: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [meetups, setMeetups] = useState<HobbyMeetup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      feedService.getFeed(0, 3, 'public'),
      meetupService.getMeetups({ page: 0, size: 3 }, 'public'),
    ]).then(([feedResult, meetupResult]) => {
      if (!mounted) return;
      if (feedResult.status === 'fulfilled') setPosts(feedResult.value.content.slice(0, 3));
      if (meetupResult.status === 'fulfilled') setMeetups(meetupResult.value.content.slice(0, 3));
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!loading && posts.length === 0 && meetups.length === 0) return null;

  return (
    <Box component="section" aria-labelledby="live-neighborhood-title" sx={{ py: { xs: 7, md: 9 }, bgcolor: '#F3FAF8' }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'end' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 900, letterSpacing: '0.13em' }}>
              NOW IN THE NEIGHBORHOOD
            </Typography>
            <Typography id="live-neighborhood-title" variant="h3" sx={{ mt: 0.75 }}>
              지금 이웃톡에서 이어지는 이야기
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              가입 전에도 공개된 이야기와 다가오는 모임을 먼저 둘러볼 수 있어.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/feed" variant="outlined">피드 전체 보기</Button>
            <Button component={RouterLink} to="/meetups" variant="contained">모임 전체 보기</Button>
          </Stack>
        </Stack>

        {loading ? (
          <Box role="status" aria-label="공개 콘텐츠 불러오는 중" sx={{ display: 'grid', placeItems: 'center', py: 7 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: posts.length > 0 && meetups.length > 0 ? '1.15fr .85fr' : '1fr' }, gap: 3 }}>
            {posts.length > 0 && <Stack spacing={1.5}>
              <Typography variant="h5">오늘의 이웃 이야기</Typography>
              {posts.map((post) => {
                const firstMedia = post.media?.[0];
                const previewImage = post.imageUrl || firstMedia?.thumbnailUrl || (firstMedia?.type === 'IMAGE' ? firstMedia.url : '');
                return (
                  <Card key={post.id} variant="outlined" sx={{ display: 'grid', gridTemplateColumns: previewImage ? { xs: '1fr', sm: '150px 1fr' } : '1fr', overflow: 'hidden' }}>
                    {previewImage && <CardMedia component="img" image={previewImage} alt="" sx={{ width: '100%', height: '100%', minHeight: 132, objectFit: 'cover' }} />}
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={850}>{post.authorUsername}</Typography>
                        {post.official && <Chip icon={<VerifiedRoundedIcon />} label="이웃톡 공식" size="small" color="secondary" />}
                      </Stack>
                      <Typography sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.caption}
                      </Typography>
                      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} color="text.secondary">
                        <Typography variant="caption">좋아요 {post.likeCount.toLocaleString()}</Typography>
                        <Typography variant="caption"><ChatBubbleOutlineRoundedIcon sx={{ fontSize: 14, mr: .4, verticalAlign: 'text-bottom' }} />댓글 {post.commentCount.toLocaleString()}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>}

            {meetups.length > 0 && <Stack spacing={1.5}>
              <Typography variant="h5">다가오는 모임</Typography>
              {meetups.map((meetup) => (
                <Card key={meetup.roomId} variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="h6" fontWeight={850}>{meetup.title}</Typography>
                      {meetup.official && <Chip icon={<VerifiedRoundedIcon />} label="공식" size="small" color="secondary" />}
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {meetup.location || meetup.areaLabel || meetup.locationAddress || '참여 후 장소 안내'}
                    </Typography>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }} color="text.secondary">
                      {meetup.scheduledAt && <Typography variant="body2">{formatMeetupDateTime(meetup.scheduledAt)}</Typography>}
                      <Typography variant="body2"><PeopleOutlineRoundedIcon sx={{ fontSize: 17, mr: .4, verticalAlign: 'text-bottom' }} />{meetup.participantCount}/{meetup.maxParticipants ?? '-'}명</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>}
          </Box>
        )}
      </Container>
    </Box>
  );
};

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
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                로그인 전에도 실제 공개 글과 모임을 둘러볼 수 있어
              </Typography>
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
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 50, height: 50 }}>운</Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={850}>이웃톡 운영팀</Typography>
                    <Typography variant="body2" color="text.secondary">공식 공개 콘텐츠</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                    <Chip size="small" label="실제 DB 글" color="primary" variant="outlined" />
                    <Chip size="small" label="운영팀 공식" color="secondary" variant="outlined" />
                  </Stack>
                </Stack>
                <Typography variant="h6" sx={{ mt: 3, lineHeight: 1.55 }}>
                  저녁 30분, 우리 동네를 천천히 걸어 봤어. 익숙한 골목도 이웃과 함께 보면 새롭게 느껴지더라.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  {['산책', '동네생활', '사진'].map((tag) => <Chip key={tag} label={`# ${tag}`} size="small" sx={{ bgcolor: '#FFF1ED', color: 'primary.dark' }} />)}
                </Stack>
                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#F3FAF8' }}>
                  <Typography variant="body2" fontWeight={800}>좋아요·댓글·참여 수는 실제 기록만 표시해</Typography>
                  <Typography variant="caption" color="text.secondary">가짜 회원이나 가짜 반응을 만들지 않았어</Typography>
                </Box>
              </Card>

              <Card sx={{ position: 'absolute', left: { xs: 0, sm: 10 }, bottom: 0, p: 2, borderRadius: 3, width: 210, transform: 'rotate(-3deg)' }}>
                <Typography variant="caption" color="text.secondary">공개 모임</Typography>
                <Typography fontWeight={850} sx={{ mt: 0.5 }}>일정·장소·지도 연결</Typography>
                <Typography variant="body2" color="text.secondary">참여하려면 로그인</Typography>
              </Card>

              <Card sx={{ position: 'absolute', right: { xs: 0, sm: 12 }, top: { xs: 2, sm: 0 }, px: 2, py: 1.5, borderRadius: 3, transform: 'rotate(3deg)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2" fontWeight={800}>AWS HTTPS 운영 중</Typography>
                </Stack>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      <PublicContentHighlights />

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

        <Card
          component="section"
          aria-labelledby="portfolio-showcase-title"
          sx={{
            mt: { xs: 7, md: 10 },
            p: { xs: 3, sm: 4.5, md: 6 },
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 4,
            color: '#fff',
            border: '1px solid rgba(255,255,255,.12)',
            background: 'linear-gradient(135deg, #2D2321 0%, #213D3A 58%, #17665E 100%)',
            '&::after': {
              content: '\"\"',
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              right: -150,
              top: -170,
              bgcolor: 'rgba(255,255,255,.08)',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
            }}
          >
            <Stack spacing={2.25} alignItems="flex-start">
              <Chip
                icon={<CloudDoneRoundedIcon />}
                label="LIVE PORTFOLIO"
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,.10)',
                  border: '1px solid rgba(255,255,255,.2)',
                  '& .MuiChip-icon': { color: '#9DE0D5' },
                }}
              />
              <Typography id="portfolio-showcase-title" variant="h3" sx={{ color: 'inherit', maxWidth: 500 }}>
                화면 너머의 설계까지 직접 확인해봐.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.76)', lineHeight: 1.8, maxWidth: 540 }}>
                이웃톡은 UI 시안에 머무르지 않고 실제 API, 인증 경계, 컨테이너 배포까지 연결한 풀스택 프로젝트야.
                같은 코드가 AWS 운영 환경에서도 실행돼.
              </Typography>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.8)', lineHeight: 1.65 }}>
                  운영팀 공식 콘텐츠는 로그인할 수 없는 시스템 계정이 관리하고, 일반 회원의 공개 범위는 작성자가 직접 선택해.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  component={RouterLink}
                  to="/feed"
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ bgcolor: '#fff', color: '#17665E', '&:hover': { bgcolor: '#F3FAF8' } }}
                >
                  공개 피드 보기
                </Button>
                <Button
                  component={RouterLink}
                  to="/meetups"
                  variant="outlined"
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.42)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.08)' } }}
                >
                  모임 살펴보기
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={1.5}>
              {portfolioHighlights.map((highlight) => (
                <Box
                  key={highlight.label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr',
                    gap: 2,
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,.09)',
                    border: '1px solid rgba(255,255,255,.13)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      color: '#9DE0D5',
                      bgcolor: 'rgba(157,224,213,.10)',
                    }}
                  >
                    {highlight.icon}
                  </Box>
                  <Box>
                    <Typography variant="overline" sx={{ color: '#9DE0D5', fontWeight: 900, letterSpacing: '0.12em' }}>
                      {highlight.label}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'inherit', mt: -0.25 }}>
                      {highlight.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.72)', mt: 0.5, lineHeight: 1.65 }}>
                      {highlight.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }} aria-label="프로젝트 기술 스택">
                {['React · TypeScript', 'Spring Boot', 'Docker · k3s', 'GitHub Actions', 'AWS'].map((technology) => (
                  <Chip
                    key={technology}
                    size="small"
                    label={technology}
                    sx={{ color: 'rgba(255,255,255,.84)', bgcolor: 'rgba(255,255,255,.08)' }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        </Card>

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
