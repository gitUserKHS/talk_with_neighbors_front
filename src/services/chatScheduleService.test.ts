import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

import api from './api';
import { chatScheduleService } from './chatScheduleService';
import { ChatSchedule } from '../types/chatSchedule';

const schedule: ChatSchedule = {
  id: 'schedule-1',
  roomId: 'room-1',
  title: '토요일 산책',
  description: '공원 입구에서 만나요',
  startsAt: '2099-08-01T10:00:00Z',
  durationMinutes: 120,
  timeZone: 'Asia/Seoul',
  location: '망원한강공원',
  locationAddress: '서울 마포구',
  latitude: 37.5524,
  longitude: 126.8991,
  kakaoPlaceId: 'place-1',
  status: 'SCHEDULED',
  version: 2,
  creatorId: 1,
  currentUserStatus: 'ATTENDING',
  participants: [
    { userId: 1, nickname: '다윤', status: 'ATTENDING', host: true },
  ],
  createdAt: '2099-07-15T10:00:00Z',
};

describe('chat schedule API contract', () => {
  const get = vi.mocked(api.get);
  const post = vi.mocked(api.post);
  const patch = vi.mocked(api.patch);
  const put = vi.mocked(api.put);

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
    put.mockReset();
  });

  it('uses the room-scoped schedule collection and detail endpoints', async () => {
    get
      .mockResolvedValueOnce({ data: [schedule] })
      .mockResolvedValueOnce({ data: schedule });

    await expect(chatScheduleService.getSchedules('room-1')).resolves.toEqual([schedule]);
    await expect(chatScheduleService.getSchedule('room-1', 'schedule-1')).resolves.toEqual(schedule);

    expect(get).toHaveBeenNthCalledWith(1, '/chat/rooms/room-1/schedules');
    expect(get).toHaveBeenNthCalledWith(2, '/chat/rooms/room-1/schedules/schedule-1');
  });

  it('sends the agreed flat Kakao location and versioned update contract', async () => {
    post.mockResolvedValueOnce({ data: schedule });
    patch.mockResolvedValueOnce({ data: { ...schedule, version: 3 } });

    const request = {
      title: schedule.title,
      description: schedule.description,
      startsAt: schedule.startsAt,
      durationMinutes: 120,
      timeZone: 'Asia/Seoul',
      location: schedule.location,
      locationAddress: schedule.locationAddress,
      latitude: schedule.latitude,
      longitude: schedule.longitude,
      kakaoPlaceId: schedule.kakaoPlaceId,
    };

    await chatScheduleService.createSchedule('room-1', request);
    await chatScheduleService.updateSchedule('room-1', 'schedule-1', { ...request, version: 2 });

    expect(post).toHaveBeenCalledWith('/chat/rooms/room-1/schedules', request);
    expect(patch).toHaveBeenCalledWith('/chat/rooms/room-1/schedules/schedule-1', {
      ...request,
      version: 2,
    });
  });

  it('uses version-only cancellation and the two-value RSVP contract', async () => {
    post.mockResolvedValueOnce({ data: { ...schedule, status: 'CANCELLED' } });
    put.mockResolvedValueOnce({ data: { ...schedule, currentUserStatus: 'NOT_ATTENDING' } });

    await chatScheduleService.cancelSchedule('room-1', 'schedule-1', 2);
    await chatScheduleService.updateRsvp('room-1', 'schedule-1', 'NOT_ATTENDING');

    expect(post).toHaveBeenCalledWith(
      '/chat/rooms/room-1/schedules/schedule-1/cancel',
      { version: 2 },
    );
    expect(put).toHaveBeenCalledWith(
      '/chat/rooms/room-1/schedules/schedule-1/rsvp',
      { status: 'NOT_ATTENDING' },
    );
  });
});
