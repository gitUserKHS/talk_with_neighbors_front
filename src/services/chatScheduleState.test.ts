import { describe, expect, it } from 'vitest';
import { ChatSchedule } from '../types/chatSchedule';
import {
  currentUserScheduleStatus,
  participantsWithStatus,
  upsertChatSchedule,
} from './chatScheduleState';

const schedule = (overrides: Partial<ChatSchedule> = {}): ChatSchedule => ({
  id: 'schedule-1',
  roomId: 'room-1',
  title: '주말 산책',
  startsAt: '2099-07-19T10:00:00Z',
  durationMinutes: 120,
  timeZone: 'Asia/Seoul',
  status: 'SCHEDULED',
  version: 1,
  creatorId: 1,
  currentUserStatus: null,
  participants: [],
  createdAt: '2099-07-15T10:00:00Z',
  ...overrides,
});

describe('chat schedule state', () => {
  it('upserts by schedule id and ignores an older websocket version', () => {
    const current = schedule({ title: '수정된 산책', version: 3 });

    expect(upsertChatSchedule([current], schedule({ version: 2 }))).toEqual([current]);
    expect(upsertChatSchedule([current], schedule({ title: '최신 산책', version: 4 }))[0])
      .toMatchObject({ title: '최신 산책', version: 4 });
  });

  it('groups the full avatar and nickname list by RSVP status with the host first', () => {
    const target = schedule({
      participants: [
        { userId: 2, nickname: '민수', status: 'ATTENDING', host: false },
        { userId: 3, nickname: '하나', status: 'NOT_ATTENDING', host: false },
        { userId: 1, nickname: '다윤', status: 'ATTENDING', host: true },
      ],
    });

    expect(participantsWithStatus(target, 'ATTENDING').map((item) => item.nickname))
      .toEqual(['다윤', '민수']);
    expect(participantsWithStatus(target, 'NOT_ATTENDING').map((item) => item.nickname))
      .toEqual(['하나']);
  });

  it('prefers the signed-in participant row over actor-scoped websocket currentUserStatus', () => {
    const sharedMessageSchedule = schedule({
      currentUserStatus: 'ATTENDING',
      participants: [
        { userId: 7, nickname: '현재 사용자', status: 'NOT_ATTENDING', host: false },
      ],
    });

    expect(currentUserScheduleStatus(sharedMessageSchedule, 7)).toBe('NOT_ATTENDING');
    expect(currentUserScheduleStatus(sharedMessageSchedule, 99)).toBe('ATTENDING');
  });
});
