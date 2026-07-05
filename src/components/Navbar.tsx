import React, { useState } from 'react';
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
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HomeIcon from '@mui/icons-material/Home';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../services/authService';
import { setUser } from '../store/slices/authSlice';
import {
  markAllOfflineNotificationsAsRead,
  markOfflineNotificationAsRead,
} from '../store/slices/notificationSlice';
import { RootState } from '../store/types';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { offlineNotifications, unreadOfflineCount } = useSelector(
    (state: RootState) => state.notifications
  );
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(setUser(null));
    navigate('/login');
  };

  const handleNotificationClick = (id: string, navigateTo?: string) => {
    dispatch(markOfflineNotificationAsRead(id));
    setAnchorEl(null);
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{
            color: 'text.primary',
            flexGrow: 1,
            fontWeight: 900,
            letterSpacing: 0,
            textDecoration: 'none',
          }}
        >
          이웃톡
        </Typography>

        {user ? (
          <>
            <Tooltip title="피드">
              <IconButton component={RouterLink} to="/feed">
                <HomeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="새 게시글">
              <IconButton component={RouterLink} to="/post/new">
                <AddBoxIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="매칭">
              <IconButton component={RouterLink} to="/matching">
                <FavoriteBorderIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="채팅">
              <IconButton component={RouterLink} to="/chat">
                <ChatBubbleOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="알림">
              <IconButton onClick={(event) => setAnchorEl(event.currentTarget)}>
                <Badge badgeContent={unreadOfflineCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="프로필">
              <IconButton component={RouterLink} to="/profile">
                <Avatar src={user.profileImage} sx={{ width: 30, height: 30 }}>
                  {user.username?.[0]}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Button color="inherit" onClick={handleLogout}>
              로그아웃
            </Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/login" color="inherit">
              로그인
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              회원가입
            </Button>
          </Box>
        )}
      </Toolbar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 360, maxWidth: 'calc(100vw - 24px)' } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            알림
          </Typography>
          {offlineNotifications.length > 0 && (
            <Button size="small" onClick={() => dispatch(markAllOfflineNotificationsAsRead())}>
              모두 읽음
            </Button>
          )}
        </Box>
        <Divider />
        {offlineNotifications.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="새 알림이 없어." />
          </MenuItem>
        ) : (
          offlineNotifications.slice(0, 8).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id, notification.data?.navigateTo)}
              sx={{ alignItems: 'flex-start', bgcolor: notification.isRead ? 'transparent' : 'action.hover' }}
            >
              <ListItemText
                primary={notification.title}
                secondary={notification.message}
                primaryTypographyProps={{ fontWeight: notification.isRead ? 500 : 800 }}
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </AppBar>
  );
};

export default Navbar;
