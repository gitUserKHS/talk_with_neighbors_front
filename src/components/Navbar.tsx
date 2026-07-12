import React, { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HomeIcon from '@mui/icons-material/Home';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import { RootState } from '../store/types';
import notificationService, { InboxNotification } from '../services/notificationService';

const navItems = [
  { label: '피드', path: '/feed', icon: <HomeIcon /> },
  { label: '새 글', path: '/post/new', icon: <AddBoxIcon /> },
  { label: '매칭', path: '/matching', icon: <FavoriteBorderIcon /> },
  { label: '모임', path: '/meetups', icon: <GroupsOutlinedIcon /> },
  { label: '채팅', path: '/chat', icon: <ChatBubbleOutlineIcon /> },
];

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [inboxNotifications, setInboxNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      // 알림 조회 실패가 전체 내비게이션을 막지 않도록 유지한다.
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    window.addEventListener('notifications:changed', loadNotifications);
    return () => window.removeEventListener('notifications:changed', loadNotifications);
  }, [loadNotifications]);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(setUser(null));
    window.history.replaceState({}, '', '/login');
    window.location.reload();
  };

  const handleNotificationClick = async (notification: InboxNotification) => {
    if (!notification.readAt) {
      await notificationService.markRead(notification.id);
    }
    setAnchorEl(null);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllRead();
    await loadNotifications();
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/feed' && location.pathname.startsWith(`${path}/`));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'rgba(255, 252, 250, 0.88)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ gap: 1.25, width: '100%', maxWidth: 1240, mx: 'auto', minHeight: { xs: 64, sm: 72 } }}>
        <Stack
          component={RouterLink}
          to="/"
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ color: 'text.primary', flexGrow: 1, textDecoration: 'none', minWidth: 0 }}
        >
          <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 2.5, color: '#fff', bgcolor: 'primary.main', boxShadow: '0 8px 20px rgba(232, 92, 74, .25)' }}>
            <TravelExploreRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.05 }}>이웃톡</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, whiteSpace: 'nowrap' }}>
              우리 동네 취향 커뮤니티
            </Typography>
          </Box>
        </Stack>

        {user ? (
          <>
            <Box component="nav" aria-label="주요 메뉴" sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
              {navItems.map((item) => (
                <Tooltip key={item.path} title={item.label}>
                  <IconButton
                    component={RouterLink}
                    to={item.path}
                    aria-label={item.label}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    sx={{
                      color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                      bgcolor: isActive(item.path) ? 'rgba(232, 92, 74, .10)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(232, 92, 74, .10)', color: 'primary.main' },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, display: { xs: 'none', sm: 'block' } }} />
            <Tooltip title="알림">
              <IconButton aria-label="알림" onClick={(event) => { setAnchorEl(event.currentTarget); loadNotifications(); }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="프로필">
              <IconButton component={RouterLink} to="/profile" aria-label="프로필" sx={{ p: 0.5 }}>
                <Avatar src={user.profileImage} sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 15 }}>
                  {user.username?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Button
              color="inherit"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
              sx={{ display: { xs: 'none', lg: 'inline-flex' }, color: 'text.secondary' }}
            >
              로그아웃
            </Button>
          </>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/login" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              로그인
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              시작하기
            </Button>
          </Stack>
        )}
      </Toolbar>

      {user && (
        <Box
          component="nav"
          aria-label="모바일 주요 메뉴"
          sx={{
            display: { xs: 'grid', sm: 'none' },
            gridTemplateColumns: 'repeat(5, 1fr)',
            borderTop: 1,
            borderColor: 'divider',
            px: 0.5,
            pb: 'max(4px, env(safe-area-inset-bottom))',
          }}
        >
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={RouterLink}
              to={item.path}
              aria-current={isActive(item.path) ? 'page' : undefined}
              sx={{
                minWidth: 0,
                minHeight: 52,
                px: 0.25,
                color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                flexDirection: 'column',
                gap: 0.15,
                borderRadius: 2,
                '& .MuiButton-startIcon': { m: 0 },
                fontSize: '0.68rem',
              }}
              startIcon={item.icon}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 360, maxWidth: 'calc(100vw - 24px)', mt: 1, borderRadius: 3, border: 1, borderColor: 'divider' } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            알림
          </Typography>
          {inboxNotifications.length > 0 && (
            <Button size="small" onClick={markAllNotificationsRead}>
              모두 읽음
            </Button>
          )}
        </Box>
        <Divider />
        {inboxNotifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="새 알림이 없어." />
          </MenuItem>
        ) : (
          inboxNotifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{ alignItems: 'flex-start', bgcolor: notification.readAt ? 'transparent' : 'action.hover' }}
            >
              <ListItemText
                primary={notification.type.replaceAll('_', ' ')}
                secondary={notification.message}
                primaryTypographyProps={{ fontWeight: notification.readAt ? 500 : 800 }}
              />
            </MenuItem>
          ))
        )}
        <Divider />
        <MenuItem component={RouterLink} to="/notifications" onClick={() => setAnchorEl(null)}>
          <ListItemText primary="전체 알림 보기" primaryTypographyProps={{ textAlign: 'center', fontWeight: 700 }} />
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Navbar;
