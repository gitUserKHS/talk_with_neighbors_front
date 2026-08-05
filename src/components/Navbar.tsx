import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import { RootState } from '../store/types';
import notificationService, { InboxNotification } from '../services/notificationService';
import adminService from '../services/adminService';
import { resolveMediaUrl } from '../services/mediaUrl';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';
import SignOutDialog from './auth/SignOutDialog';
import ThemeModeMenuItem from './theme/ThemeModeMenuItem';

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useI18n();
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [inboxNotifications, setInboxNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // 메뉴 노출용 힌트일 뿐이며, 실제 접근 판정은 서버가 매 요청마다 한다.
  const [isAdmin, setIsAdmin] = useState(false);

  const navItems = useMemo<NavigationItem[]>(() => [
    { label: t('피드', 'Feed'), path: '/feed', icon: <HomeOutlinedIcon /> },
    { label: t('새 글', 'New post'), path: '/post/new', icon: <AddBoxOutlinedIcon /> },
    { label: t('매칭', 'Matches'), path: '/matching', icon: <FavoriteBorderIcon /> },
    { label: t('모임', 'Meetups'), path: '/meetups', icon: <GroupsOutlinedIcon /> },
    { label: t('채팅', 'Chat'), path: '/chat', icon: <ChatBubbleOutlineIcon /> },
  ], [t]);

  const browseItems = useMemo(
    () => navItems.filter((item) => item.path === '/feed' || item.path === '/meetups'),
    [navItems],
  );

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [page, count] = await Promise.all([
        notificationService.getNotifications(0, 8),
        notificationService.unreadCount(),
      ]);
      setInboxNotifications(page.content);
      setUnreadCount(count);
    } catch {
      // Notification availability must not block primary navigation.
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    window.addEventListener('notifications:changed', loadNotifications);
    return () => window.removeEventListener('notifications:changed', loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let active = true;
    adminService.hasAdminAccess().then((granted) => {
      if (active) setIsAdmin(granted);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const handleLogout = async () => {
    setLogoutBusy(true);
    setLogoutError(null);
    try {
      await authService.logout();
      dispatch(setUser(null));
      setLogoutConfirmOpen(false);
      setAccountAnchor(null);
      navigate('/login', { replace: true });
    } catch {
      setLogoutError(t(
        '로그아웃 요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
        'Could not complete sign-out. Check your connection and try again.',
      ));
    } finally {
      setLogoutBusy(false);
    }
  };

  const openLogoutDialog = () => {
    setLogoutError(null);
    setLogoutConfirmOpen(true);
  };

  const closeLogoutDialog = () => {
    setLogoutError(null);
    setLogoutConfirmOpen(false);
  };

  const handleNotificationClick = async (notification: InboxNotification) => {
    if (!notification.readAt) await notificationService.markRead(notification.id);
    setNotificationAnchor(null);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllRead();
    await loadNotifications();
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/feed' && location.pathname.startsWith(`${path}/`));

  const mobileItems = user ? navItems : browseItems;
  const neighborhood = user?.address?.trim() || t('동네 설정', 'Set neighborhood');

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
          backdropFilter: 'blur(18px)',
        }}
      >
        <Toolbar sx={{ gap: { xs: 0.5, sm: 1.25 }, width: '100%', maxWidth: 1280, mx: 'auto', minHeight: { xs: 62, sm: 70 } }}>
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            spacing={1.1}
            alignItems="center"
            aria-label={t('이웃톡 홈', 'Neighbor Talk home')}
            sx={{ color: 'text.primary', display: { xs: user ? 'none' : 'flex', sm: 'flex' }, flexGrow: { xs: user ? 0 : 1, lg: 0 }, mr: { lg: 2.5 }, textDecoration: 'none', minWidth: 0 }}
          >
            <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flexShrink: 0, borderRadius: 2.5, color: '#fff', bgcolor: 'primary.main' }}>
              <TravelExploreRoundedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, display: { xs: user ? 'none' : 'block', sm: 'block' } }}>
              <Typography variant="h6" sx={{ lineHeight: 1.05 }}>{t('이웃톡', 'Neighbor Talk')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', xl: 'block' }, whiteSpace: 'nowrap' }}>
                {t('우리 동네 취향 커뮤니티', 'Your neighborhood community')}
              </Typography>
            </Box>
          </Stack>

          {user && (
            <Button
              component={RouterLink}
              to="/mypage"
              color="inherit"
              startIcon={<LocationOnRoundedIcon fontSize="small" />}
              aria-label={t(`현재 동네 ${neighborhood}`, `Current neighborhood: ${neighborhood}`)}
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                flexGrow: 1,
                justifyContent: 'flex-start',
                minWidth: 0,
                maxWidth: { xs: 140, sm: 220 },
                px: 0.75,
                color: 'text.primary',
                '& .MuiButton-startIcon': { mr: 0.35 },
              }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {neighborhood}
              </Box>
            </Button>
          )}

          {user ? (
            <Box component="nav" aria-label={t('주요 메뉴', 'Primary navigation')} sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5, flexGrow: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  startIcon={item.icon}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  sx={{
                    color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                    bgcolor: isActive(item.path) ? 'rgba(200,67,53,.08)' : 'transparent',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          ) : (
            <Box component="nav" aria-label={t('둘러보기 메뉴', 'Browse navigation')} sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5, flexGrow: 1 }}>
              {browseItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  sx={{ color: isActive(item.path) ? 'primary.main' : 'text.secondary' }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <LanguageSwitcher compact />

          {user ? (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.25, display: { xs: 'none', sm: 'block' } }} />
              <Tooltip title={t('알림', 'Notifications')}>
                <IconButton
                  aria-label={t('알림', 'Notifications')}
                  onClick={(event) => { setNotificationAnchor(event.currentTarget); loadNotifications(); }}
                >
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsNoneRoundedIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title={t('계정 메뉴', 'Account menu')}>
                <IconButton
                  aria-label={t('계정 메뉴 열기', 'Open account menu')}
                  aria-haspopup="menu"
                  aria-expanded={accountAnchor ? 'true' : undefined}
                  aria-controls={accountAnchor ? 'account-menu' : undefined}
                  onClick={(event) => setAccountAnchor(event.currentTarget)}
                  sx={{ p: 0.5 }}
                >
                  <Avatar src={resolveMediaUrl(user.profileImage)} sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 15 }}>
                    {user.username?.[0]}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Button
                color="inherit"
                startIcon={<LogoutRoundedIcon />}
                onClick={openLogoutDialog}
                sx={{ display: { xs: 'none', xl: 'inline-flex' }, color: 'text.secondary' }}
              >
                {t('로그아웃', 'Sign out')}
              </Button>
            </>
          ) : (
            <Stack direction="row" spacing={0.75}>
              <Button component={RouterLink} to="/login" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                {t('로그인', 'Sign in')}
              </Button>
              <Button component={RouterLink} to="/register" variant="contained" sx={{ px: { xs: 1.25, sm: 2 } }}>
                {t('시작하기', 'Join')}
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {user && (
        <Menu
          id="account-menu"
          anchorEl={accountAnchor}
          open={Boolean(accountAnchor)}
          onClose={() => setAccountAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 230, mt: 1, borderRadius: 2.5, border: 1, borderColor: 'divider' } }}
        >
          <Box sx={{ px: 2, py: 1.25, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>{user.username}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{neighborhood}</Typography>
          </Box>
          <Divider />
          <MenuItem component={RouterLink} to="/mypage" onClick={() => setAccountAnchor(null)}>
            <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('마이페이지', 'My account')} />
          </MenuItem>
          {isAdmin && (
            <MenuItem component={RouterLink} to="/admin/reports" onClick={() => setAccountAnchor(null)}>
              <ListItemIcon><ShieldOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('신고 검토', 'Report review')} />
            </MenuItem>
          )}
          <Divider />
          <ThemeModeMenuItem />
          <Divider />
          <MenuItem
            onClick={() => { setAccountAnchor(null); openLogoutDialog(); }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><LogoutRoundedIcon color="error" fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('로그아웃', 'Sign out')} />
          </MenuItem>
        </Menu>
      )}

      <Box
        component="nav"
        aria-label={user ? t('모바일 주요 메뉴', 'Mobile navigation') : t('모바일 둘러보기 메뉴', 'Mobile browse navigation')}
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (muiTheme) => muiTheme.zIndex.appBar,
          display: { xs: 'grid', lg: 'none' },
          gridTemplateColumns: `repeat(${mobileItems.length}, 1fr)`,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
          backdropFilter: 'blur(18px)',
          px: 0.5,
          pb: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -8px 24px rgba(41,33,31,.06)',
        }}
      >
        {mobileItems.map((item) => (
          <Button
            key={item.path}
            component={RouterLink}
            to={item.path}
            aria-current={isActive(item.path) ? 'page' : undefined}
            sx={{
              minWidth: 0,
              minHeight: 58,
              px: 0.25,
              color: isActive(item.path) ? 'primary.main' : 'text.secondary',
              flexDirection: 'column',
              gap: 0.1,
              borderRadius: 0,
              '& .MuiButton-startIcon': { m: 0 },
              fontSize: '0.68rem',
            }}
            startIcon={item.icon}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        PaperProps={{ sx: { width: 380, maxWidth: 'calc(100vw - 24px)', mt: 1, borderRadius: 3, border: 1, borderColor: 'divider' } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t('알림', 'Notifications')}</Typography>
          {inboxNotifications.length > 0 && (
            <Button size="small" onClick={markAllNotificationsRead}>{t('모두 읽음', 'Mark all read')}</Button>
          )}
        </Box>
        <Divider />
        {inboxNotifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText
              primary={t('새 알림이 없습니다.', 'You have no new notifications.')}
              primaryTypographyProps={{ textAlign: 'center', py: 1 }}
            />
          </MenuItem>
        ) : inboxNotifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            sx={{ alignItems: 'flex-start', whiteSpace: 'normal', bgcolor: notification.readAt ? 'transparent' : 'action.hover' }}
          >
            <ListItemText
              primary={notification.type.replaceAll('_', ' ')}
              secondary={notification.message}
              primaryTypographyProps={{ fontWeight: notification.readAt ? 500 : 800 }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem component={RouterLink} to="/notifications" onClick={() => setNotificationAnchor(null)}>
          <ListItemText primary={t('전체 알림 보기', 'View all notifications')} primaryTypographyProps={{ textAlign: 'center', fontWeight: 700 }} />
        </MenuItem>
      </Menu>

      <SignOutDialog
        open={logoutConfirmOpen}
        busy={logoutBusy}
        error={logoutError}
        onClose={closeLogoutDialog}
        onConfirm={() => void handleLogout()}
      />
    </>
  );
};

export default Navbar;
