import {
  ChatSchedule,
  ChatScheduleParticipant,
  ChatScheduleRsvpStatus,
} from '../types/chatSchedule';
import { sortChatSchedules } from './chatScheduleDateTime';

export const upsertChatSchedule = (
  schedules: ChatSchedule[],
  incoming: ChatSchedule,
): ChatSchedule[] => {
  const index = schedules.findIndex((schedule) => schedule.id === incoming.id);
  if (index < 0) return sortChatSchedules([...schedules, incoming]);
  if ((schedules[index].version ?? 0) > (incoming.version ?? 0)) return schedules;

  const next = [...schedules];
  next[index] = incoming;
  return sortChatSchedules(next);
};

export const participantsWithStatus = (
  schedule: ChatSchedule,
  status: ChatScheduleRsvpStatus,
): ChatScheduleParticipant[] => (schedule.participants ?? [])
  .filter((participant) => participant.status === status)
  .sort((left, right) => Number(right.host) - Number(left.host)
    || left.nickname.localeCompare(right.nickname, 'ko'));

export const scheduleParticipantCount = (
  schedule: ChatSchedule,
  status: ChatScheduleRsvpStatus,
): number => participantsWithStatus(schedule, status).length;

/**
 * WebSocket schedule cards are shared room messages. Prefer the participant
 * row that belongs to this browser's user over a potentially actor-scoped
 * currentUserStatus value embedded in the shared payload.
 */
export const currentUserScheduleStatus = (
  schedule: ChatSchedule,
  currentUserId?: number | string,
): ChatScheduleRsvpStatus | null => {
  const participantStatus = schedule.participants?.find(
    (participant) => String(participant.userId) === String(currentUserId),
  )?.status;
  return participantStatus ?? schedule.currentUserStatus ?? null;
};
