import { Page } from './chat';

export interface HobbyMeetup {
  roomId: string;
  /** True for a meetup published by the non-loginable service account. */
  official?: boolean;
  title: string;
  description?: string;
  interestTags: string[];
  sharedInterests: string[];
  location?: string;
  locationAddress?: string;
  areaLabel?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
  maxParticipants?: number;
  participantCount: number;
  joined: boolean;
  full: boolean;
  creatorId?: number;
  creatorUsername?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  registrationDeadline?: string;
  waitlisted: boolean;
  waitlistCount: number;
  /** Server-authoritative host permission for mutation affordances. */
  canManage?: boolean;
  /** Compatibility alias while older clients and APIs are rolled forward. */
  ownedByCurrentUser?: boolean;
  participants?: HobbyMeetupParticipant[];
}

export interface HobbyMeetupParticipant {
  userId: number;
  nickname: string;
  profileImageUrl?: string;
  host: boolean;
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
}

export type UpdateHobbyMeetupRequest = CreateHobbyMeetupRequest;

export type HobbyMeetupPage = Page<HobbyMeetup>;
