import { ChatSchedule } from '../types/chatSchedule';

export const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';

export const localDateTimeToUtcIso = (value: string): string => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error('일정 날짜와 시간을 확인해줘.');
  }
  return parsed.toISOString();
};

export const toLocalDateTimeInput = (value?: string | null): string => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const defaultScheduleDateTimeInput = (now = new Date()): string => {
  const nextHour = new Date(now);
  nextHour.setSeconds(0, 0);
  nextHour.setMinutes(0);
  nextHour.setHours(nextHour.getHours() + 1);
  return toLocalDateTimeInput(nextHour.toISOString());
};

export const formatChatScheduleDateTime = (
  value: string,
  timeZone?: string,
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '일정 확인 필요';

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || browserTimeZone(),
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }
};

export const isUpcomingChatSchedule = (
  schedule: ChatSchedule,
  now = new Date(),
): boolean => schedule.status === 'SCHEDULED'
  && new Date(schedule.startsAt).getTime() >= now.getTime();

export const sortChatSchedules = (schedules: ChatSchedule[]): ChatSchedule[] =>
  [...schedules].sort((left, right) =>
    new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
