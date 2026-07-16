import React from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { ChatSchedule, ChatScheduleRsvpStatus } from '../../../types/chatSchedule';
import { currentUserScheduleStatus } from '../../../services/chatScheduleState';
import { useI18n } from '../../../i18n/I18nProvider';
import ChatScheduleParticipants from './ChatScheduleParticipants';

interface ChatScheduleCardProps {
  schedule: ChatSchedule;
  currentUserId?: number | string;
  busy?: boolean;
  compact?: boolean;
  onOpen: (schedule: ChatSchedule) => void;
  onRsvp: (schedule: ChatSchedule, status: ChatScheduleRsvpStatus) => void;
}

const ChatScheduleCard: React.FC<ChatScheduleCardProps> = ({
  schedule,
  currentUserId,
  busy = false,
  compact = false,
  onOpen,
  onRsvp,
}) => {
  const { t, formatDate, formatNumber } = useI18n();
  const cancelled = schedule.status === 'CANCELLED';
  const ended = new Date(schedule.startsAt).getTime() < Date.now();
  const isCreator = String(schedule.creatorId) === String(currentUserId);
  const canRespond = !cancelled && !ended;
  const myStatus = currentUserScheduleStatus(schedule, currentUserId);

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        maxWidth: compact ? 'none' : 440,
        borderRadius: 2.5,
        borderColor: cancelled ? 'divider' : 'rgba(200,67,53,.32)',
        bgcolor: cancelled ? 'action.disabledBackground' : 'background.paper',
        boxShadow: compact ? 'none' : '0 10px 28px rgba(77,48,40,.08)',
      }}
    >
      <ButtonBase
        onClick={() => onOpen(schedule)}
        aria-label={t(`${schedule.title} 일정 상세 보기`, `View details for ${schedule.title}`)}
        sx={{ display: 'block', width: '100%', textAlign: 'left' }}
      >
        <CardContent sx={{ pb: canRespond ? 1.25 : '16px !important' }}>
          <Stack spacing={1.4}>
            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color={cancelled ? 'default' : ended ? 'default' : 'primary'}
                    label={cancelled
                      ? t('취소됨', 'Cancelled')
                      : ended
                        ? t('지난 일정', 'Past')
                        : t('다가오는 일정', 'Upcoming')}
                  />
                  {isCreator && <Chip size="small" variant="outlined" label={t('내가 만든 일정', 'Created by you')} />}
                </Stack>
                <Typography
                  variant="subtitle1"
                  sx={{ mt: 0.75, fontWeight: 900, textDecoration: cancelled ? 'line-through' : 'none' }}
                >
                  {schedule.title}
                </Typography>
              </Box>
              <OpenInNewOutlinedIcon color="action" fontSize="small" />
            </Stack>

            <Stack spacing={0.75} color="text.secondary">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarMonthOutlinedIcon fontSize="small" />
                <Typography variant="body2" fontWeight={700}>
                  {formatDate(schedule.startsAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: schedule.timeZone,
                  })}
                  {schedule.durationMinutes
                    ? t(` · ${formatNumber(schedule.durationMinutes)}분`, ` · ${formatNumber(schedule.durationMinutes)} min`)
                    : ''}
                </Typography>
              </Stack>
              {(schedule.location || schedule.locationAddress) && (
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <LocationOnOutlinedIcon fontSize="small" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {schedule.location || schedule.locationAddress}
                    </Typography>
                    {schedule.location && schedule.locationAddress && (
                      <Typography variant="caption" display="block" noWrap>
                        {schedule.locationAddress}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              )}
            </Stack>

            <ChatScheduleParticipants schedule={schedule} />
          </Stack>
        </CardContent>
      </ButtonBase>

      {canRespond && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant={myStatus === 'ATTENDING' ? 'contained' : 'outlined'}
              color="success"
              disabled={busy}
              onClick={() => onRsvp(schedule, 'ATTENDING')}
            >
              {t('참석', 'Attending')}
            </Button>
            <Button
              fullWidth
              size="small"
              variant={myStatus === 'NOT_ATTENDING' ? 'contained' : 'outlined'}
              color="inherit"
              disabled={busy || isCreator}
              onClick={() => onRsvp(schedule, 'NOT_ATTENDING')}
            >
              {t('불참', 'Not attending')}
            </Button>
          </Stack>
        </Box>
      )}
    </Card>
  );
};

export default ChatScheduleCard;
