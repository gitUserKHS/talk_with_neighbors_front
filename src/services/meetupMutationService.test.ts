import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import { meetupService } from './meetupService';
import { HobbyMeetup } from '../types/meetup';

const meetup: HobbyMeetup = {
  roomId: 'room-1',
  title: '저녁 산책',
  interestTags: ['산책'],
  sharedInterests: [],
  maxParticipants: 8,
  participantCount: 2,
  joined: true,
  full: false,
  waitlisted: false,
  waitlistCount: 0,
  canManage: true,
  participants: [
    { userId: 7, nickname: '다윤', host: true },
    { userId: 8, nickname: '코아', host: false },
  ],
};

describe('meetup host mutation API contract', () => {
  const get = vi.mocked(api.get);
  const patch = vi.mocked(api.patch);
  const remove = vi.mocked(api.delete);

  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
    remove.mockReset();
  });

  it('loads details with participants from the room-scoped endpoint', async () => {
    get.mockResolvedValueOnce({ data: meetup });

    await expect(meetupService.getMeetup('room-1')).resolves.toMatchObject({
      canManage: true,
      participants: [{ userId: 7 }, { userId: 8 }],
    });
    expect(get).toHaveBeenCalledWith('/meetups/room-1');
  });

  it('normalizes local dates and sends explicit nulls when optional fields are cleared', async () => {
    patch.mockResolvedValueOnce({ data: meetup });
    const localStart = '2026-07-18T19:00';

    await meetupService.updateMeetup('room-1', {
      title: '저녁 산책',
      description: '',
      interestTags: ['산책'],
      location: '',
      maxParticipants: 8,
      scheduledAt: localStart,
      durationMinutes: 120,
      registrationDeadline: '',
    });

    expect(patch).toHaveBeenCalledWith('/meetups/room-1', expect.objectContaining({
      description: null,
      location: null,
      locationAddress: null,
      latitude: null,
      longitude: null,
      kakaoPlaceId: null,
      scheduledAt: new Date(2026, 6, 18, 19, 0, 0).toISOString(),
      registrationDeadline: null,
    }));
  });

  it('deletes a meetup through the dedicated host endpoint', async () => {
    remove.mockResolvedValueOnce({});
    await meetupService.deleteMeetup('room-1');
    expect(remove).toHaveBeenCalledWith('/meetups/room-1');
  });
});
