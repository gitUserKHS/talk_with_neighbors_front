import api from './api';
import { CreateHobbyMeetupRequest, HobbyMeetup, HobbyMeetupPage } from '../types/meetup';
import { Page } from '../types/chat';

export type MeetupAccess = 'authenticated' | 'public';

export interface PublicMeetupDto {
  id: string;
  title: string;
  description?: string | null;
  interestTags: string[];
  maxParticipants?: number | null;
  participantCount: number;
  full: boolean;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  registrationDeadline?: string | null;
}

/** Public meetup cards never inherit member, chat, location, or personalization state. */
export const mapPublicMeetup = (meetup: PublicMeetupDto): HobbyMeetup => ({
  roomId: meetup.id,
  title: meetup.title,
  description: meetup.description ?? undefined,
  interestTags: meetup.interestTags ?? [],
  sharedInterests: [],
  maxParticipants: meetup.maxParticipants ?? undefined,
  participantCount: meetup.participantCount ?? 0,
  joined: false,
  full: meetup.full,
  scheduledAt: meetup.scheduledAt ?? undefined,
  durationMinutes: meetup.durationMinutes ?? undefined,
  registrationDeadline: meetup.registrationDeadline ?? undefined,
  waitlisted: false,
  waitlistCount: 0,
});

export const meetupService = {
  async getMeetups(params?: {
    keyword?: string;
    interest?: string;
    page?: number;
    size?: number;
  }, access: MeetupAccess = 'authenticated'): Promise<HobbyMeetupPage> {
    if (access === 'public') {
      const response = await api.get<Page<PublicMeetupDto>>('/public/meetups', { params });
      return {
        ...response.data,
        content: response.data.content.map(mapPublicMeetup),
      };
    }

    const response = await api.get<HobbyMeetupPage>('/meetups', { params });
    return response.data;
  },

  async createMeetup(request: CreateHobbyMeetupRequest): Promise<HobbyMeetup> {
    const response = await api.post<HobbyMeetup>('/meetups', request);
    return response.data;
  },

  async joinMeetup(roomId: string): Promise<HobbyMeetup> {
    const response = await api.post<HobbyMeetup>(`/meetups/${roomId}/join`);
    return response.data;
  },

  async leaveMeetup(roomId: string): Promise<void> {
    await api.post(`/meetups/${roomId}/leave`);
  },
};
