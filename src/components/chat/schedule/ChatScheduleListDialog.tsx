import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { ChatSchedule, ChatScheduleRsvpStatus } from '../../../types/chatSchedule';
import { isUpcomingChatSchedule, sortChatSchedules } from '../../../services/chatScheduleDateTime';
import ChatScheduleCard from './ChatScheduleCard';

interface ChatScheduleListDialogProps {
  open: boolean;
  schedules: ChatSchedule[];
  now: number;
  currentUserId?: number | string;
  busyScheduleId?: string | null;
  onClose: () => void;
  onCreate: () => void;
  onOpen: (schedule: ChatSchedule) => void;
  onRsvp: (schedule: ChatSchedule, status: ChatScheduleRsvpStatus) => void;
}

const ChatScheduleListDialog: React.FC<ChatScheduleListDialogProps> = ({
  open,
  schedules,
  now,
  currentUserId,
  busyScheduleId,
  onClose,
  onCreate,
  onOpen,
  onRsvp,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { upcoming, previous } = useMemo(() => {
    const ordered = sortChatSchedules(schedules);
    return {
      upcoming: ordered.filter((schedule) => isUpcomingChatSchedule(schedule, new Date(now))),
      previous: ordered
        .filter((schedule) => !isUpcomingChatSchedule(schedule, new Date(now)))
        .reverse(),
    };
  }, [now, schedules]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="chat-schedule-list-title"
    >
      <DialogTitle id="chat-schedule-list-title" sx={{ pr: 7 }}>
        모임 달력
        <IconButton
          aria-label="닫기"
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1.25, fontWeight: 900 }}>
              다가오는 일정 {upcoming.length}
            </Typography>
            {upcoming.length === 0 ? (
              <Box
                sx={{
                  py: 5,
                  px: 2,
                  textAlign: 'center',
                  border: 1,
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                }}
              >
                <CalendarMonthOutlinedIcon color="action" sx={{ fontSize: 38, mb: 1 }} />
                <Typography fontWeight={800}>다가오는 일정이 아직 없어.</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  모임 이웃들과 날짜와 장소를 정해볼까?
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
                  새 일정 만들기
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {upcoming.map((schedule) => (
                  <ChatScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    currentUserId={currentUserId}
                    busy={busyScheduleId === schedule.id}
                    compact
                    onOpen={onOpen}
                    onRsvp={onRsvp}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1.25, fontWeight: 900 }}>
              지난 일정과 취소된 일정
            </Typography>
            {previous.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                지난 일정이 아직 없어.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {previous.map((schedule) => (
                  <ChatScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    currentUserId={currentUserId}
                    busy={busyScheduleId === schedule.id}
                    compact
                    onOpen={onOpen}
                    onRsvp={onRsvp}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button onClick={onClose}>닫기</Button>
        {upcoming.length > 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            새 일정
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChatScheduleListDialog;
