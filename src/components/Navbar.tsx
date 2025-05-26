import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Chip
} from '@mui/material';
import { 
  Notifications as NotificationsIcon, 
  NotificationsOff as NotificationsOffIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/types';
import { setUser } from '../store/slices/authSlice';
import { 
  markOfflineNotificationAsRead, 
  markAllOfflineNotificationsAsRead,
  removeOfflineNotification 
} from '../store/slices/notificationSlice';
import type { OfflineNotification } from '../store/types';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // 오프라인 알림 상태
  const { offlineNotifications, unreadOfflineCount, connectionStatus } = useSelector(
    (state: RootState) => state.notifications
  );
  
  // 알림 메뉴 상태
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const isNotificationMenuOpen = Boolean(notificationAnchorEl);

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(setUser(null));
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  // 알림 메뉴 열기/닫기
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  // 알림 읽음 처리
  const handleNotificationRead = (notificationId: string) => {
    dispatch(markOfflineNotificationAsRead(notificationId));
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    dispatch(markAllOfflineNotificationsAsRead());
  };

  // 알림 삭제
  const handleNotificationDelete = (notificationId: string) => {
    dispatch(removeOfflineNotification(notificationId));
  };

  // 우선순위별 색상 설정
  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return '#f44336'; // 빨강 (높음)
    if (priority >= 5) return '#ff9800'; // 주황 (중간)
    return '#9e9e9e'; // 회색 (낮음)
  };

  // 시간 포맷팅
  const formatNotificationTime = (createdAt: string) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`;
    return `${Math.floor(diffMinutes / 1440)}일 전`;
  };

  // 🆕 백엔드 오프라인 알림 빠른 테스트
  const quickTestBackendNotifications = async () => {
    if (!user?.id) {
      console.error('[Navbar] No user for testing');
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        console.error('[Navbar] No session ID found');
        return;
      }

      console.log(`[Navbar] Quick testing backend notifications for user ${user.id}`);
      
      const response = await fetch(`http://localhost:8080/api/notifications/test/send-pending/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.text();
        console.log('[Navbar] Backend test success:', result);
      } else {
        console.error('[Navbar] Backend test failed:', response.status);
      }
    } catch (error) {
      console.error('[Navbar] Error testing backend:', error);
    }
  };

  // 🆕 오프라인 알림 요약 자동 표시 (백엔드 가이드 반영)
  useEffect(() => {
    // 연결이 복구되고 읽지 않은 오프라인 알림이 있을 때
    if (connectionStatus.isOnline && connectionStatus.wasOffline && unreadOfflineCount > 0) {
      console.log(`[Navbar] Connection recovered with ${unreadOfflineCount} unread notifications`);
      
      // 오프라인 알림 요약 UI 자동 표시
      const showOfflineSummary = () => {
        const summaryElement = document.createElement('div');
        summaryElement.className = 'offline-notification-summary';
        summaryElement.innerHTML = `
          <div class="summary-icon">📬</div>
          <div class="summary-text">
            <h4>오프라인 알림</h4>
            <p>연결이 끊어진 동안 ${unreadOfflineCount}개의 알림이 도착했습니다.</p>
          </div>
          <button class="summary-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // 화면에 5초간 표시 후 자동 사라짐
        document.body.appendChild(summaryElement);
        setTimeout(() => {
          if (summaryElement.parentElement) {
            summaryElement.remove();
          }
        }, 5000);
      };

      // 잠시 후 요약 표시 (애니메이션을 위해)
      setTimeout(showOfflineSummary, 1000);
    }
  }, [connectionStatus.isOnline, connectionStatus.wasOffline, unreadOfflineCount]);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          Talk With Neighbors
          {/* 연결 상태 표시 */}
          {!connectionStatus.isOnline && (
            <Chip 
              label="오프라인" 
              size="small" 
              color="error" 
              sx={{ ml: 1, fontSize: '0.7rem' }} 
            />
          )}
        </Typography>
        <Box>
          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to="/matching">
                매칭
              </Button>
              <Button color="inherit" component={RouterLink} to="/chat">
                채팅
              </Button>
              <Button color="inherit" component={RouterLink} to="/profile">
                프로필
              </Button>
              
              {/* 🆕 오프라인 알림 아이콘 (백엔드 가이드 반영) */}
              <IconButton
                color="inherit"
                onClick={handleNotificationMenuOpen}
                sx={{ mr: 1 }}
              >
                <Badge 
                  badgeContent={unreadOfflineCount} 
                  color="error"
                  max={99}
                >
                  {connectionStatus.isOnline ? (
                    <NotificationsIcon />
                  ) : (
                    <NotificationsOffIcon />
                  )}
                </Badge>
              </IconButton>
              
              <Button color="inherit" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                로그인
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                회원가입
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
      
      {/* 🆕 알림 메뉴 (오프라인 알림 시스템) */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={isNotificationMenuOpen}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 360,
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* 알림 헤더 */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">알림</Typography>
          <Typography variant="caption" color="text.secondary">
            {connectionStatus.isOnline ? '온라인' : '오프라인'} • {unreadOfflineCount}개 알림
          </Typography>
        </Box>
        <Divider />

        {/* 알림 목록 */}
        {offlineNotifications.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="새로운 알림이 없습니다." />
          </MenuItem>
        )}
        {offlineNotifications.map((notification: OfflineNotification) => (
          <MenuItem 
            key={notification.id}
            onClick={() => handleNotificationRead(notification.id!)}
            sx={{ 
              bgcolor: notification.isRead ? 'transparent' : 'action.hover',
              alignItems: 'flex-start'
            }}
          >
            <ListItemIcon sx={{ minWidth: '30px', mt: '4px' }}>
              <CircleIcon sx={{ fontSize: 10, color: getPriorityColor(notification.priority) }} />
            </ListItemIcon>
            <ListItemText 
              primary={notification.title}
              secondary={<>
                {notification.message}
                <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {formatNotificationTime(notification.createdAt)}
                </Typography>
              </>}
              primaryTypographyProps={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}
            />
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleNotificationDelete(notification.id!); }}>
              {/* <CloseIcon fontSize="small" /> */}
            </IconButton>
          </MenuItem>
        ))}
        
        <Divider />
        {/* 모든 알림 읽음 처리 버튼 */}
        {offlineNotifications.length > 0 && (
          <MenuItem onClick={handleMarkAllAsRead}>
            <ListItemText primary="모든 알림 읽음 처리" />
          </MenuItem>
        )}
      </Menu>
    </AppBar>
  );
};

export default Navbar;