import React from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { ChatSchedule } from '../../../types/chatSchedule';
import { participantsWithStatus } from '../../../services/chatScheduleState';
import { resolveMediaUrl } from '../../../services/mediaUrl';

interface ChatScheduleParticipantsProps {
  schedule: ChatSchedule;
  variant?: 'summary' | 'full';
}

const participantNames = (names: string[]) => {
  if (names.length === 0) return '아직 참석자가 없어.';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;
};

const ChatScheduleParticipants: React.FC<ChatScheduleParticipantsProps> = ({
  schedule,
  variant = 'summary',
}) => {
  const attending = participantsWithStatus(schedule, 'ATTENDING');
  const notAttending = participantsWithStatus(schedule, 'NOT_ATTENDING');

  if (variant === 'summary') {
    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        {attending.length > 0 ? (
          <AvatarGroup
            max={4}
            sx={{
              flexShrink: 0,
              '& .MuiAvatar-root': { width: 30, height: 30, fontSize: 13 },
            }}
          >
            {attending.map((participant) => (
              <Avatar
                key={String(participant.userId)}
                alt={participant.nickname}
                src={resolveMediaUrl(participant.profileImage)}
              >
                {participant.nickname?.[0]}
              </Avatar>
            ))}
          </AvatarGroup>
        ) : (
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'action.disabledBackground' }}>
            <GroupsOutlinedIcon fontSize="small" />
          </Avatar>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {participantNames(attending.map((participant) => participant.nickname))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            총 {attending.length}명 참석
            {notAttending.length > 0 ? ` · ${notAttending.length}명 불참` : ''}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <ParticipantGroup
        title={`참석 ${attending.length}명`}
        participants={attending}
        emptyText="아직 참석한다고 한 이웃이 없어."
        color="success"
      />
      <Divider />
      <ParticipantGroup
        title={`불참 ${notAttending.length}명`}
        participants={notAttending}
        emptyText="불참으로 응답한 이웃이 없어."
      />
    </Stack>
  );
};

const ParticipantGroup = ({
  title,
  participants,
  emptyText,
  color = 'default',
}: {
  title: string;
  participants: ReturnType<typeof participantsWithStatus>;
  emptyText: string;
  color?: 'default' | 'success';
}) => (
  <Box>
    <Chip label={title} size="small" color={color} sx={{ mb: 1 }} />
    {participants.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        {emptyText}
      </Typography>
    ) : (
      <List disablePadding aria-label={title}>
        {participants.map((participant) => (
          <ListItem key={String(participant.userId)} disableGutters sx={{ py: 0.75 }}>
            <ListItemAvatar sx={{ minWidth: 48 }}>
              <Avatar
                alt={participant.nickname}
                src={resolveMediaUrl(participant.profileImage)}
                sx={{ width: 36, height: 36 }}
              >
                {participant.nickname?.[0]}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={participant.nickname}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            {participant.host && <Chip label="일정 만든 이웃" size="small" variant="outlined" />}
          </ListItem>
        ))}
      </List>
    )}
  </Box>
);

export default ChatScheduleParticipants;
