import { Page } from './chat';

export interface HobbyMeetup {
  roomId: string;
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
}

export interface CreateHobbyMeetupRequest {
  title: string;
  description?: string;
  interestTags: string[];
  location?: string;
  maxParticipants: number;
}

export type HobbyMeetupPage = Page<HobbyMeetup>;
