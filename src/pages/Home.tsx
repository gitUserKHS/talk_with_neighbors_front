import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { RootState } from '../store/types';
import Feed from './Feed';
import { feedService } from '../services/feedService';
import { meetupService } from '../services/meetupService';
import { destinationAfterAuthentication } from '../services/profileSetup';
import { resolveMediaUrl } from '../services/mediaUrl';
import { useI18n } from '../i18n/I18nProvider';
import type { FeedPost } from '../types/feed';
import type { HobbyMeetup } from '../types/meetup';

interface PublicContentHighlightsProps {
  posts: FeedPost[];
  meetups: HobbyMeetup[];
  loading: boolean;
}

const ContentSkeletons: React.FC = () => (
  <Box
    role="status"
    aria-label="Loading neighborhood updates"
    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}
  >
    {[0, 1, 2].map((item) => (
      <Card key={item} variant="outlined" sx={{ overflow: 'hidden' }}>
        <Skeleton variant="rectangular" height={150} />
        <CardContent>
          <Skeleton width="36%" />
          <Skeleton sx={{ mt: 1 }} />
          <Skeleton width="70%" />
        </CardContent>
      </Card>
    ))}
  </Box>
);

const PublicContentHighlights: React.FC<PublicContentHighlightsProps> = ({ posts, meetups, loading }) => {
  const { t, formatDate, formatNumber } = useI18n();

  return (
    <Box component="section" aria-labelledby="neighborhood-now-title" sx={{ py: { xs: 7, md: 10 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'flex-end' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 900, letterSpacing: '0.13em' }}>
              {t('지금 우리 동네', 'HAPPENING NEARBY')}
            </Typography>
            <Typography id="neighborhood-now-title" variant="h3" sx={{ mt: 0.75 }}>
              {t('이웃의 새로운 이야기를 만나보세요', 'See what your neighbors are sharing')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 620, lineHeight: 1.75 }}>
              {t(
                '가입 전에도 공개된 이야기와 다가오는 모임을 확인할 수 있습니다.',
                'You can browse public stories and upcoming meetups before creating an account.',
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/feed" variant="outlined">
              {t('피드 보기', 'View feed')}
            </Button>
            <Button component={RouterLink} to="/meetups" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>
              {t('모임 찾기', 'Find meetups')}
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <ContentSkeletons />
        ) : posts.length === 0 && meetups.length === 0 ? (
          <Card variant="outlined" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <GroupsRoundedIcon color="disabled" sx={{ fontSize: 44 }} />
            <Typography variant="h6" sx={{ mt: 1.5 }}>
              {t('새로운 동네 소식을 준비하고 있습니다', 'New neighborhood updates are on the way')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {t('잠시 후 다시 확인해 주세요.', 'Please check back soon.')}
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.12fr .88fr' }, gap: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h5">{t('이웃 이야기', 'Neighbor stories')}</Typography>
              {posts.length === 0 ? (
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Typography color="text.secondary">
                    {t('공개된 이야기가 아직 없습니다.', 'There are no public stories yet.')}
                  </Typography>
                </Card>
              ) : posts.map((post) => {
                const firstMedia = post.media?.[0];
                const previewImage = post.imageUrl
                  || firstMedia?.thumbnailUrl
                  || (firstMedia?.type === 'IMAGE' ? firstMedia.url : '');

                return (
                  <Card key={post.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                    <CardActionArea
                      component={RouterLink}
                      to="/feed"
                      sx={{ display: 'grid', gridTemplateColumns: previewImage ? { xs: '1fr', sm: '168px 1fr' } : '1fr' }}
                    >
                      {previewImage && (
                        <CardMedia
                          component="img"
                          image={resolveMediaUrl(previewImage)}
                          alt=""
                          sx={{ width: '100%', height: '100%', minHeight: 148, objectFit: 'cover' }}
                        />
                      )}
                      <CardContent sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            src={resolveMediaUrl(post.authorProfileImage)}
                            sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}
                          >
                            {post.authorUsername?.[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography fontWeight={850} noWrap>{post.authorUsername}</Typography>
                              {post.official && <VerifiedRoundedIcon color="secondary" sx={{ fontSize: 17 }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(post.createdAt, { month: 'short', day: 'numeric' })}
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography
                          sx={{ mt: 1.5, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {post.caption}
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} color="text.secondary">
                          <Typography variant="caption">
                            {t(`좋아요 ${formatNumber(post.likeCount)}개`, `${formatNumber(post.likeCount)} likes`)}
                          </Typography>
                          <Typography variant="caption">
                            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 14, mr: 0.4, verticalAlign: 'text-bottom' }} />
                            {t(`댓글 ${formatNumber(post.commentCount)}개`, `${formatNumber(post.commentCount)} comments`)}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="h5">{t('다가오는 모임', 'Upcoming meetups')}</Typography>
              {meetups.length === 0 ? (
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Typography color="text.secondary">
                    {t('예정된 공개 모임이 아직 없습니다.', 'There are no upcoming public meetups yet.')}
                  </Typography>
                </Card>
              ) : meetups.map((meetup) => (
                <Card key={meetup.roomId} variant="outlined" >
                  <CardActionArea component={RouterLink} to="/meetups">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Box
                          sx={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 42,
                            height: 42,
                            flexShrink: 0,
                            borderRadius: 2.5,
                            color: 'secondary.main',
                            bgcolor: 'rgba(35,133,121,.10)',
                          }}
                        >
                          <CalendarMonthRoundedIcon />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="h6" noWrap>{meetup.title}</Typography>
                            {meetup.official && <VerifiedRoundedIcon color="secondary" sx={{ fontSize: 17 }} />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {meetup.scheduledAt
                              ? formatDate(meetup.scheduledAt, { month: 'short', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' })
                              : t('일정 협의 중', 'Date to be arranged')}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack spacing={0.75} sx={{ mt: 2 }} color="text.secondary">
                        <Typography variant="body2">
                          <LocationOnRoundedIcon sx={{ fontSize: 17, mr: 0.6, verticalAlign: 'text-bottom' }} />
                          {meetup.location || meetup.areaLabel || meetup.locationAddress || t('참여 후 장소 안내', 'Location shared after joining')}
                        </Typography>
                        <Typography variant="body2">
                          <PeopleOutlineRoundedIcon sx={{ fontSize: 17, mr: 0.6, verticalAlign: 'text-bottom' }} />
                          {t(
                            `${formatNumber(meetup.participantCount)}명 참여 중`,
                            `${formatNumber(meetup.participantCount)} attending`,
                          )}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
};

const Home: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useI18n();
  const [publicPosts, setPublicPosts] = useState<FeedPost[]>([]);
  const [publicMeetups, setPublicMeetups] = useState<HobbyMeetup[]>([]);
  const [publicContentLoading, setPublicContentLoading] = useState(true);

  useEffect(() => {
    if (user) return undefined;

    let mounted = true;
    setPublicContentLoading(true);

    Promise.allSettled([
      feedService.getFeed(0, 3, 'public'),
      meetupService.getMeetups({ page: 0, size: 3 }, 'public'),
    ]).then(([feedResult, meetupResult]) => {
      if (!mounted) return;
      if (feedResult.status === 'fulfilled') setPublicPosts(feedResult.value.content.slice(0, 3));
      if (meetupResult.status === 'fulfilled') setPublicMeetups(meetupResult.value.content.slice(0, 3));
    }).finally(() => {
      if (mounted) setPublicContentLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  if (user && (user.nicknameSetupRequired === true || user.profileComplete === false)) {
    return <Navigate to={destinationAfterAuthentication(user, '/')} replace />;
  }

  if (user) return <Feed />;

  const heroPost = publicPosts[0];
  const heroMedia = heroPost?.media?.[0];
  const heroImage = heroPost?.imageUrl
    || heroMedia?.thumbnailUrl
    || (heroMedia?.type === 'IMAGE' ? heroMedia.url : '');
  const heroTags = heroPost?.interestTags?.slice(0, 3) ?? [];

  const features = [
    {
      icon: <ForumRoundedIcon />,
      title: t('일상을 나누는 동네 피드', 'A feed for everyday neighborhood life'),
      description: t('가까운 이웃의 소식을 보고 사진과 댓글로 편안하게 대화를 시작해 보세요.', 'Catch up with nearby neighbors and start conversations through photos and comments.'),
    },
    {
      icon: <Diversity3RoundedIcon />,
      title: t('취향이 맞는 이웃과 연결', 'Connect through shared interests'),
      description: t('관심사와 활동 성향을 바탕으로 대화가 잘 통할 이웃을 만날 수 있습니다.', 'Meet neighbors who share your interests and activity preferences.'),
    },
    {
      icon: <CalendarMonthRoundedIcon />,
      title: t('채팅에서 함께 잡는 일정', 'Plan together right in chat'),
      description: t('모임 참여자와 장소를 정하고 약속과 일정을 한곳에서 관리할 수 있습니다.', 'Choose a place with your group and keep meetup plans organized in one place.'),
    },
  ];

  return (
    <Box component="main" sx={{ overflow: 'hidden' }}>
      <Box
        component="section"
        sx={{
          position: 'relative',
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 11 },
          background: 'linear-gradient(180deg, #FFF9F5 0%, #FFFFFF 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 380,
            height: 380,
            borderRadius: '50%',
            bgcolor: 'rgba(232,92,74,.10)',
            top: -210,
            right: -90,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(420px, .9fr)' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
            <Stack spacing={3} alignItems="flex-start">
              <Chip
                icon={<LocationOnRoundedIcon />}
                label={t('가까운 이웃과 나누는 일상', 'Everyday life, shared nearby')}
                color="secondary"
                variant="outlined"
              />
              <Box>
                <Typography variant="h1" sx={{ fontSize: { xs: '2.65rem', sm: '3.45rem', md: '4.25rem' }, maxWidth: 700 }}>
                  {t('가까운 이웃과,', 'Closer neighbors,')}
                  <Box component="span" sx={{ display: 'block', color: 'primary.main' }}>
                    {t('더 따뜻한 동네 생활', 'a warmer neighborhood')}
                  </Box>
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 2.25, maxWidth: 590, fontSize: { xs: '1rem', sm: '1.1rem' }, lineHeight: 1.8 }}>
                  {t(
                    '동네 이야기를 나누고, 취향이 맞는 모임을 발견하고, 새로운 이웃과 편안하게 대화를 시작해 보세요.',
                    'Share neighborhood stories, discover meetups that fit your interests, and start meaningful conversations nearby.',
                  )}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button component={RouterLink} to="/register" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />}>
                  {t('이웃톡 시작하기', 'Join Neighbor Talk')}
                </Button>
                <Button component={RouterLink} to="/feed" variant="outlined" size="large">
                  {t('먼저 둘러보기', 'Browse first')}
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                <ShieldRoundedIcon color="secondary" sx={{ fontSize: 19 }} />
                <Typography variant="body2">
                  {t('공개 피드와 모임은 로그인 없이 확인할 수 있습니다.', 'Public posts and meetups are available without signing in.')}
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ position: 'relative', minHeight: { xs: 390, sm: 440 } }} aria-label={t('이웃톡 피드 미리보기', 'Neighbor Talk feed preview')}>
              <Box sx={{ position: 'absolute', inset: { xs: '12px 12px 52px', sm: '0 30px 42px' }, borderRadius: 5, bgcolor: 'rgba(35,133,121,.10)', transform: 'rotate(4deg)' }} />
              <Card sx={{ position: 'absolute', inset: { xs: '0 26px 34px 0', sm: '12px 48px 30px 0' }, borderRadius: 4, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar src={resolveMediaUrl(heroPost?.authorProfileImage)} sx={{ bgcolor: 'secondary.main' }}>
                      {heroPost?.authorUsername?.[0] || t('이', 'N')}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography fontWeight={850} noWrap>
                          {heroPost?.authorUsername || t('이웃톡 이웃', 'Your neighbor')}
                        </Typography>
                        {heroPost?.official && <VerifiedRoundedIcon color="secondary" sx={{ fontSize: 17 }} />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('우리 동네에서', 'From your neighborhood')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography sx={{ mt: 2, lineHeight: 1.7, minHeight: 54 }}>
                    {heroPost?.caption || t('오늘 동네에서 발견한 작은 즐거움을 이웃과 나눠 보세요.', 'Share a small moment you discovered in your neighborhood today.')}
                  </Typography>
                  {heroImage ? (
                    <CardMedia component="img" image={resolveMediaUrl(heroImage)} alt="" sx={{ mt: 2, height: 190, borderRadius: 2.5, objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ mt: 2, height: 190, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'secondary.dark', background: 'linear-gradient(135deg, #E2F2EF, #FFF0EB)' }}>
                      <FavoriteBorderRoundedIcon sx={{ fontSize: 48 }} />
                    </Box>
                  )}
                  {heroTags.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                      {heroTags.map((tag) => <Chip key={tag} label={`#${tag}`} size="small" />)}
                    </Stack>
                  )}
                </CardContent>
              </Card>
              <Card sx={{ position: 'absolute', right: 0, bottom: 0, px: 2, py: 1.5, borderRadius: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GroupsRoundedIcon color="secondary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('동네 모임', 'Nearby meetups')}</Typography>
                    <Typography variant="body2" fontWeight={850}>{t('함께할 이웃을 만나보세요', 'Find people to join you')}</Typography>
                  </Box>
                </Stack>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      <PublicContentHighlights posts={publicPosts} meetups={publicMeetups} loading={publicContentLoading} />

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <Box textAlign="center" sx={{ maxWidth: 700, mx: 'auto', mb: 5 }}>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 900, letterSpacing: '0.13em' }}>
            {t('이웃톡에서 할 수 있는 일', 'MADE FOR NEIGHBORHOODS')}
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.75 }}>
            {t('동네의 관계가 자연스럽게 이어집니다', 'Neighborhood connections, made naturally')}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {features.map((feature) => (
            <Card key={feature.title} variant="outlined" sx={{ p: 3.5, height: '100%' }}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 3, color: 'primary.main', bgcolor: 'rgba(200,67,53,.09)' }}>
                {feature.icon}
              </Box>
              <Typography variant="h6" sx={{ mt: 2.5 }}>{feature.title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.75 }}>{feature.description}</Typography>
            </Card>
          ))}
        </Box>

        <Box
          component="section"
          sx={{
            mt: { xs: 7, md: 10 },
            p: { xs: 3.5, sm: 5, md: 6 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '.8fr 1.2fr' },
            gap: { xs: 4, md: 7 },
            alignItems: 'center',
            borderRadius: 4,
            color: '#fff',
            background: 'linear-gradient(135deg, #213D3A 0%, #17665E 100%)',
          }}
        >
          <Box>
            <ShieldRoundedIcon sx={{ fontSize: 44, color: '#9DE0D5' }} />
            <Typography variant="h3" sx={{ mt: 2, color: 'inherit' }}>
              {t('편안하게 머물 수 있는 커뮤니티', 'A community where you can feel at ease')}
            </Typography>
          </Box>
          <Stack spacing={2.5}>
            {[
              [t('필요한 정보만 공개합니다', 'Only the information you choose is public'), t('정확한 위치와 개인 대화는 공개 화면에 표시하지 않습니다.', 'Precise locations and private conversations never appear on public pages.')],
              [t('불편한 관계를 직접 관리할 수 있습니다', 'You stay in control of your connections'), t('차단과 신고 기능으로 원하지 않는 상호작용에 대응할 수 있습니다.', 'Blocking and reporting tools help you handle unwanted interactions.')],
              [t('모임과 대화를 한곳에서 이어갑니다', 'Keep plans and conversations together'), t('참여자, 장소, 일정과 채팅을 오가며 확인할 필요 없이 관리할 수 있습니다.', 'Manage participants, places, schedules, and chat without losing context.')],
            ].map(([title, description]) => (
              <Stack key={title} direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{ width: 9, height: 9, mt: 0.8, flexShrink: 0, borderRadius: '50%', bgcolor: '#9DE0D5' }} />
                <Box>
                  <Typography fontWeight={850}>{title}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.4, color: 'rgba(255,255,255,.72)', lineHeight: 1.65 }}>{description}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Stack alignItems="center" textAlign="center" sx={{ py: { xs: 8, md: 11 } }}>
          <Typography variant="h3">{t('오늘, 가까운 이웃에게 인사해 보세요', 'Say hello to someone nearby today')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 600, lineHeight: 1.75 }}>
            {t('가볍게 둘러본 뒤 마음에 드는 이야기와 모임에서 시작할 수 있습니다.', 'Browse at your own pace, then join a story or meetup that feels right.')}
          </Typography>
          <Button component={RouterLink} to="/register" variant="contained" size="large" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 3 }}>
            {t('무료로 시작하기', 'Get started for free')}
          </Button>
        </Stack>

        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ py: 3 }} color="text.secondary">
          <Typography variant="body2">© {new Date().getFullYear()} {t('이웃톡', 'Neighbor Talk')}</Typography>
          <Typography variant="body2">{t('가까운 이웃과 함께 만드는 따뜻한 동네', 'A warmer neighborhood, built together')}</Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Home;
