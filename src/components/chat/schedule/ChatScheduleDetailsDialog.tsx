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
import { formatChatScheduleDateTime } from '../../../services/chatScheduleDateTime';
import { currentUserScheduleStatus } from '../../../services/chatScheduleState';
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
    ? `https://map.kakao.com/link/map/${encodeURIComponent(schedule.location || schedule.locationAddress || '일정 장소')},${schedule.latitude},${schedule.longitude}`
    : null;

  const confirmCancel = async () => {
    try {
      setError(null);
      await onCancel(schedule);
      setCancelOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '일정을 취소하지 못했어.');
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
          일정 상세
          <IconButton
            aria-label="닫기"
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
                  label={cancelled ? '취소된 일정' : ended ? '지난 일정' : '다가오는 일정'}
                />
                {isCreator && <Chip size="small" variant="outlined" label="내가 만든 일정" />}
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
                    {formatChatScheduleDateTime(schedule.startsAt, schedule.timeZone)}
                  </Typography>
                  {schedule.durationMinutes && (
                    <Typography variant="body2" color="text.secondary">
                      예상 {schedule.durationMinutes}분
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
                        카카오맵에서 보기
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
                  참석할게
                </Button>
                <Button
                  fullWidth
                  variant={myStatus === 'NOT_ATTENDING' ? 'contained' : 'outlined'}
                  color="inherit"
                  disabled={busy || isCreator}
                  onClick={() => void onRsvp(schedule, 'NOT_ATTENDING')}
                >
                  참석이 어려워
                </Button>
              </Stack>
            )}

            <Divider />
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 900 }}>참여 현황</Typography>
              <ChatScheduleParticipants schedule={schedule} variant="full" />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))' }}>
          {isCreator && !cancelled && !ended && (
            <>
              <Button color="error" onClick={() => setCancelOpen(true)} disabled={busy}>
                일정 취소
              </Button>
              <Button startIcon={<EditOutlinedIcon />} onClick={() => onEdit(schedule)} disabled={busy}>
                수정
              </Button>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={onClose} disabled={busy}>확인</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>이 일정을 취소할까?</DialogTitle>
        <DialogContent>
          <Typography>
            취소해도 일정과 참여 기록은 남고, 이웃들에게 취소된 일정으로 보여.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>돌아가기</Button>
          <Button color="error" variant="contained" onClick={() => void confirmCancel()} disabled={busy}>
            {busy ? '취소하는 중…' : '일정 취소'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatScheduleDetailsDialog;
