import { Page } from './chat';

export interface HobbyMeetup {
  roomId: string;
  /** True when the server supplied privacy-safe portfolio demonstration content. */
  demo?: boolean;
  title: string;
  description?: string;
  interestTags: string[];
  sharedInterests: string[];
  location?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
  maxParticipants?: number;
  participantCount: number;
  joined: boolean;
  full: boolean;
  creatorUsername?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  registrationDeadline?: string;
  waitlisted: boolean;
  waitlistCount: number;
}

export interface CreateHobbyMeetupRequest {
  title: string;
  description?: string;
  interestTags: string[];
  location?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
  maxParticipants: number;
  /** Browser-local form value; meetupService normalizes it to UTC ISO-8601 before sending. */
  scheduledAt?: string;
  durationMinutes?: number;
  /** Browser-local form value; meetupService normalizes it to UTC ISO-8601 before sending. */
  registrationDeadline?: string;
}

export type HobbyMeetupPage = Page<HobbyMeetup>;
