import React from 'react';
import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ChatSchedule } from '../../../types/chatSchedule';
import { formatChatScheduleDateTime } from '../../../services/chatScheduleDateTime';
import { scheduleParticipantCount } from '../../../services/chatScheduleState';

interface ChatScheduleUpcomingBarProps {
  schedule: ChatSchedule;
  remainingCount: number;
  onOpen: (schedule: ChatSchedule) => void;
}

const ChatScheduleUpcomingBar: React.FC<ChatScheduleUpcomingBarProps> = ({
  schedule,
  remainingCount,
  onOpen,
}) => (
  <ButtonBase
    onClick={() => onOpen(schedule)}
    aria-label={`다가오는 약속 ${schedule.title} 상세 보기`}
    sx={{
      width: '100%',
      textAlign: 'left',
      px: { xs: 1.5, sm: 2 },
      py: 1.1,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'rgba(200,67,53,.055)',
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <CalendarMonthOutlinedIcon fontSize="small" />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="body2" fontWeight={900} noWrap>{schedule.title}</Typography>
          {remainingCount > 0 && <Chip size="small" label={`외 ${remainingCount}개`} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {formatChatScheduleDateTime(schedule.startsAt, schedule.timeZone)}
          {schedule.location || schedule.locationAddress
            ? ` · ${schedule.location || schedule.locationAddress}`
            : ''}
          {` · ${scheduleParticipantCount(schedule, 'ATTENDING')}명 참석`}
        </Typography>
      </Box>
      <ChevronRightIcon color="action" />
    </Stack>
  </ButtonBase>
);

export default ChatScheduleUpcomingBar;
