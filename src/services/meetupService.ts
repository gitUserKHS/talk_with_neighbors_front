import api from './api';
import {
  CreateHobbyMeetupRequest,
  HobbyMeetup,
  HobbyMeetupPage,
  UpdateHobbyMeetupRequest,
} from '../types/meetup';
import { Page } from '../types/chat';
import { localDateTimeToUtcIso } from './meetupDateTime';
import { resolveMediaUrl } from './mediaUrl';

export type MeetupAccess = 'authenticated' | 'public';

export interface PublicMeetupDto {
  id: string;
  official?: boolean;
  title: string;
  description?: string | null;
  interestTags: string[];
  maxParticipants?: number | null;
  participantCount: number;
  full: boolean;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  registrationDeadline?: string | null;
  location?: string | null;
  locationAddress?: string | null;
  areaLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  kakaoPlaceId?: string | null;
}

const mapAuthenticatedMeetup = (meetup: HobbyMeetup): HobbyMeetup => ({
  ...meetup,
  participants: meetup.participants?.map((participant) => ({
    ...participant,
    profileImageUrl: resolveMediaUrl(participant.profileImageUrl),
  })),
});

/** Public cards expose exact location only for explicitly official service meetups. */
export const mapPublicMeetup = (meetup: PublicMeetupDto): HobbyMeetup => ({
  roomId: meetup.id,
  official: meetup.official ?? false,
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
  ...(meetup.official ? {
    location: meetup.location?.trim() || undefined,
    locationAddress: meetup.locationAddress?.trim() || undefined,
    areaLabel: meetup.areaLabel?.trim() || undefined,
    latitude: meetup.latitude ?? undefined,
    longitude: meetup.longitude ?? undefined,
    kakaoPlaceId: meetup.kakaoPlaceId?.trim() || undefined,
  } : {}),
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
    return {
      ...response.data,
      content: response.data.content.map(mapAuthenticatedMeetup),
    };
  },

  async createMeetup(request: CreateHobbyMeetupRequest): Promise<HobbyMeetup> {
    const response = await api.post<HobbyMeetup>('/meetups', {
      ...request,
      scheduledAt: localDateTimeToUtcIso(request.scheduledAt),
      registrationDeadline: localDateTimeToUtcIso(request.registrationDeadline),
    });
    return mapAuthenticatedMeetup(response.data);
  },

  async getMeetup(roomId: string): Promise<HobbyMeetup> {
    const response = await api.get<HobbyMeetup>(`/meetups/${roomId}`);
    return mapAuthenticatedMeetup(response.data);
  },

  async updateMeetup(roomId: string, request: UpdateHobbyMeetupRequest): Promise<HobbyMeetup> {
    const response = await api.patch<HobbyMeetup>(`/meetups/${roomId}`, {
      ...request,
      description: request.description?.trim() || null,
      location: request.location?.trim() || null,
      locationAddress: request.locationAddress?.trim() || null,
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null,
      kakaoPlaceId: request.kakaoPlaceId?.trim() || null,
      scheduledAt: request.scheduledAt ? localDateTimeToUtcIso(request.scheduledAt) : null,
      registrationDeadline: request.registrationDeadline
        ? localDateTimeToUtcIso(request.registrationDeadline)
        : null,
    });
    return mapAuthenticatedMeetup(response.data);
  },

  async deleteMeetup(roomId: string): Promise<void> {
    await api.delete(`/meetups/${roomId}`);
  },

  async joinMeetup(roomId: string): Promise<HobbyMeetup> {
    const response = await api.post<HobbyMeetup>(`/meetups/${roomId}/join`);
    return mapAuthenticatedMeetup(response.data);
  },

  async leaveMeetup(roomId: string): Promise<void> {
    await api.post(`/meetups/${roomId}/leave`);
  },
};
