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
  maxParticipants: number;
  scheduledAt?: string;
  durationMinutes?: number;
  registrationDeadline?: string;
}

export type HobbyMeetupPage = Page<HobbyMeetup>;
