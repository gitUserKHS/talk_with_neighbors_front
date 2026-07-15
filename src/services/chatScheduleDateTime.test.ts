import { describe, expect, it } from 'vitest';
import {
  defaultScheduleDateTimeInput,
  isUpcomingChatSchedule,
  localDateTimeToUtcIso,
  toLocalDateTimeInput,
} from './chatScheduleDateTime';
import { ChatSchedule } from '../types/chatSchedule';

const schedule = (startsAt: string, status: 'SCHEDULED' | 'CANCELLED' = 'SCHEDULED'): ChatSchedule => ({
  id: 'schedule-1',
  roomId: 'room-1',
  title: '일정',
  startsAt,
  timeZone: 'Asia/Seoul',
  status,
  version: 1,
  creatorId: 1,
  participants: [],
  createdAt: '2026-07-15T00:00:00Z',
});

describe('chat schedule date-time helpers', () => {
  it('converts browser-local form values to the UTC API contract', () => {
    const value = '2099-08-01T19:00';
    expect(localDateTimeToUtcIso(value)).toBe(new Date(value).toISOString());
  });

  it('round-trips a UTC response into a datetime-local input', () => {
    const utc = '2099-08-01T10:00:00.000Z';
    const localInput = toLocalDateTimeInput(utc);
    expect(new Date(localInput).toISOString()).toBe(utc);
  });

  it('defaults to the next exact hour', () => {
    const value = defaultScheduleDateTimeInput(new Date('2099-08-01T10:23:45Z'));
    const parsed = new Date(value);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getSeconds()).toBe(0);
    expect(parsed.getTime()).toBeGreaterThan(new Date('2099-08-01T10:23:45Z').getTime());
  });

  it('keeps cancelled schedules out of the upcoming list', () => {
    const now = new Date('2099-08-01T10:00:00Z');
    expect(isUpcomingChatSchedule(schedule('2099-08-01T11:00:00Z'), now)).toBe(true);
    expect(isUpcomingChatSchedule(schedule('2099-08-01T11:00:00Z', 'CANCELLED'), now)).toBe(false);
  });
});
