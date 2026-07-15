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

  it('updates only profile fields and leaves the calendar projection server-owned', async () => {
    patch.mockResolvedValueOnce({ data: meetup });

    await meetupService.updateMeetup('room-1', {
      title: '저녁 산책',
      description: '',
      interestTags: ['산책'],
      location: '',
      maxParticipants: 8,
    });

    expect(patch).toHaveBeenCalledWith('/meetups/room-1', expect.objectContaining({
      description: null,
      location: null,
      locationAddress: null,
      latitude: null,
      longitude: null,
      kakaoPlaceId: null,
    }));
    const payload = patch.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('scheduledAt');
    expect(payload).not.toHaveProperty('durationMinutes');
    expect(payload).not.toHaveProperty('registrationDeadline');
  });

  it('deletes a meetup through the dedicated host endpoint', async () => {
    remove.mockResolvedValueOnce({});
    await meetupService.deleteMeetup('room-1');
    expect(remove).toHaveBeenCalledWith('/meetups/room-1');
  });
});
