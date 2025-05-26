import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, IconButton, AlertColor } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch, NotificationMessage } from '../../store/types';
import { removeNotification } from '../../store/slices/notificationSlice';

const NotificationHandler: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  const [currentNotification, setCurrentNotification] = useState<NotificationMessage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      // 다음 알림을 현재 알림으로 설정하고 스토어에서 즉시 제거 (표시 후 다시 추가 방지)
      const nextNotification = notifications[0];
      setCurrentNotification(nextNotification);
      dispatch(removeNotification(nextNotification.id)); 
      setOpen(true);
    }
  }, [notifications, currentNotification, dispatch]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleExited = () => {
    // Snackbar가 완전히 사라진 후 현재 알림 상태 초기화
    if (currentNotification?.navigateTo) {
        // navigate(currentNotification.navigateTo); // 알림이 사라진 후 자동 이동 (선택적)
    }
    setCurrentNotification(null);
  };

  const handleAlertClick = () => {
    if (currentNotification?.navigateTo) {
      navigate(currentNotification.navigateTo);
    }
    setOpen(false); // 클릭 시 즉시 닫기
  };

  if (!currentNotification) {
    return null;
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={currentNotification.duration || 6000}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={(event) => handleClose(event)} // Alert 자체의 닫기 버튼 (선택적)
        severity={currentNotification.type as AlertColor}
        variant="filled"
        sx={{
          width: '100%',
          cursor: currentNotification.navigateTo ? 'pointer' : 'default',
        }}
        onClick={handleAlertClick}
        action={currentNotification.navigateTo ? null : (
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={(e) => { e.stopPropagation(); handleClose();}}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        )}
      >
        {currentNotification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationHandler; 