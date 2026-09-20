import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, IconButton, AlertColor } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate } from 'react-router-dom';
import { RootState, AppDispatch, NotificationMessage } from '../../store/types';
import { removeNotification } from '../../store/slices/notificationSlice';
import { useI18n } from '../../i18n/I18nProvider';
import ConnectionBanner from '../ConnectionBanner';

const NotificationHandler: React.FC = () => {
  const { t } = useI18n();
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

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
    if (currentNotification?.reloadOnClick) {
      // 새 서비스 워커가 이미 페이지를 제어하고 있다. 새로고침해야 새 모듈을 받는다.
      window.location.reload();
      return;
    }
    if (currentNotification?.navigateTo && currentNotification.navigateTo !== location.pathname) {
      // Login처럼 돌아올 곳(from)을 읽는 화면이 있어 현재 위치를 함께 넘긴다.
      navigate(currentNotification.navigateTo, { state: { from: location } });
    }
    setOpen(false); // 클릭 시 즉시 닫기
  };

  const isActionable = Boolean(currentNotification?.navigateTo || currentNotification?.reloadOnClick);

  return (
    <>
      <ConnectionBanner />
      {currentNotification && (
        <Snackbar
          open={open}
          autoHideDuration={currentNotification.duration || 6000}
          onClose={handleClose}
          TransitionProps={{ onExited: handleExited }}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={currentNotification.type as AlertColor}
            variant="filled"
            sx={{
              width: '100%',
              cursor: isActionable ? 'pointer' : 'default',
            }}
            onClick={handleAlertClick}
            // 닫기 버튼은 항상 직접 렌더링한다. Alert의 기본 X 버튼은 onClick이 루트로 버블링되어
            // 새로고침/이동(handleAlertClick)까지 실행되므로 stopPropagation으로 닫기만 수행한다.
            action={(
                <IconButton
                    size="small"
                    aria-label={t('알림 닫기', 'Close notification')}
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
      )}
    </>
  );
};

export default NotificationHandler;
