import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { useTheme } from '@mui/material/styles';
import { ChatSchedule, ChatScheduleRsvpStatus } from '../../../types/chatSchedule';
import { currentUserScheduleStatus } from '../../../services/chatScheduleState';
import { useI18n } from '../../../i18n/I18nProvider';
import { errorMessage } from '../../../services/apiError';
import ChatScheduleParticipants from './ChatScheduleParticipants';

interface ChatScheduleDetailsDialogProps {
  schedule: ChatSchedule | null;
  currentUserId?: number | string;
  busy?: boolean;
  onClose: () => void;
  onEdit: (schedule: ChatSchedule) => void;
  onCancel: (schedule: ChatSchedule) => Promise<void>;
  onRsvp: (schedule: ChatSchedule, status: ChatScheduleRsvpStatus) => Promise<void> | void;
}

const ChatScheduleDetailsDialog: React.FC<ChatScheduleDetailsDialogProps> = ({
  schedule,
  currentUserId,
  busy = false,
  onClose,
  onEdit,
  onCancel,
  onRsvp,
}) => {
  const theme = useTheme();
  const { locale, t, formatDate, formatNumber } = useI18n();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCancelOpen(false);
    setError(null);
  }, [schedule?.id]);

  if (!schedule) return null;

  const cancelled = schedule.status === 'CANCELLED';
  const ended = new Date(schedule.startsAt).getTime() < Date.now();
  const isCreator = String(schedule.creatorId) === String(currentUserId);
  const canRespond = !cancelled && !ended;
  const myStatus = currentUserScheduleStatus(schedule, currentUserId);
  const kakaoMapUrl = schedule.latitude !== undefined && schedule.longitude !== undefined
    ? `https://map.kakao.com/link/map/${encodeURIComponent(schedule.location || schedule.locationAddress || t('일정 장소', 'Schedule location'))},${schedule.latitude},${schedule.longitude}`
    : null;

  const confirmCancel = async () => {
    try {
      setError(null);
      await onCancel(schedule);
      setCancelOpen(false);
    } catch (err) {
      const fallback = t('일정을 취소하지 못했습니다.', 'We could not cancel the schedule.');
      setError((locale === 'ko' ? errorMessage(err) : undefined) ?? fallback);
      setCancelOpen(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={() => !busy && onClose()}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        aria-labelledby="chat-schedule-details-title"
      >
        <DialogTitle id="chat-schedule-details-title" sx={{ pr: 7 }}>
          {t('일정 상세', 'Schedule details')}
          <IconButton
            aria-label={t('닫기', 'Close')}
            onClick={onClose}
            disabled={busy}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            {error && <Alert severity="error">{error}</Alert>}
            <Box>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                <Chip
                  size="small"
                  color={cancelled ? 'default' : ended ? 'default' : 'primary'}
                  label={cancelled
                    ? t('취소된 일정', 'Cancelled')
                    : ended
                      ? t('지난 일정', 'Past')
                      : t('다가오는 일정', 'Upcoming')}
                />
                {isCreator && <Chip size="small" variant="outlined" label={t('내가 만든 일정', 'Created by you')} />}
              </Stack>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                {schedule.title}
              </Typography>
              {schedule.description && (
                <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{schedule.description}</Typography>
              )}
            </Box>

            <Divider />
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <CalendarMonthOutlinedIcon color="primary" />
                <Box>
                  <Typography fontWeight={800}>
                    {formatDate(schedule.startsAt, {
                      dateStyle: 'full',
                      timeStyle: 'short',
                      timeZone: schedule.timeZone,
                    })}
                  </Typography>
                  {schedule.durationMinutes && (
                    <Typography variant="body2" color="text.secondary">
                      {t(
                        `예상 ${formatNumber(schedule.durationMinutes)}분`,
                        `About ${formatNumber(schedule.durationMinutes)} min`,
                      )}
                    </Typography>
                  )}
                </Box>
              </Stack>
              {(schedule.location || schedule.locationAddress) && (
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <LocationOnOutlinedIcon color="secondary" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800}>{schedule.location || schedule.locationAddress}</Typography>
                    {schedule.location && schedule.locationAddress && (
                      <Typography variant="body2" color="text.secondary">
                        {schedule.locationAddress}
                      </Typography>
                    )}
                    {kakaoMapUrl && (
                      <Button
                        component="a"
                        href={kakaoMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        endIcon={<OpenInNewOutlinedIcon />}
                        sx={{ mt: 0.5, px: 0 }}
                      >
                        {t('카카오맵에서 보기', 'View in Kakao Map')}
                      </Button>
                    )}
                  </Box>
                </Stack>
              )}
            </Stack>

            {canRespond && (
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant={myStatus === 'ATTENDING' ? 'contained' : 'outlined'}
                  color="success"
                  disabled={busy}
                  onClick={() => void onRsvp(schedule, 'ATTENDING')}
                >
                  {t('참석', 'Attending')}
                </Button>
                <Button
                  fullWidth
                  variant={myStatus === 'NOT_ATTENDING' ? 'contained' : 'outlined'}
                  color="inherit"
                  disabled={busy || isCreator}
                  onClick={() => void onRsvp(schedule, 'NOT_ATTENDING')}
                >
                  {t('불참', 'Not attending')}
                </Button>
              </Stack>
            )}

            <Divider />
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 900 }}>{t('참여 현황', 'Responses')}</Typography>
              <ChatScheduleParticipants schedule={schedule} variant="full" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))' }}>
          {isCreator && !cancelled && !ended && (
            <>
              <Button color="error" onClick={() => setCancelOpen(true)} disabled={busy}>
                {t('일정 취소', 'Cancel schedule')}
              </Button>
              <Button startIcon={<EditOutlinedIcon />} onClick={() => onEdit(schedule)} disabled={busy}>
                {t('수정', 'Edit')}
              </Button>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={onClose} disabled={busy}>{t('확인', 'Done')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('이 일정을 취소하시겠어요?', 'Cancel this schedule?')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t(
              '취소해도 일정과 참여 기록은 남으며, 이웃들에게 취소된 일정으로 표시됩니다.',
              'The schedule and responses will remain visible and be marked as cancelled.',
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>{t('돌아가기', 'Go back')}</Button>
          <Button color="error" variant="contained" onClick={() => void confirmCancel()} disabled={busy}>
            {busy ? t('취소하는 중…', 'Cancelling…') : t('일정 취소', 'Cancel schedule')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatScheduleDetailsDialog;
