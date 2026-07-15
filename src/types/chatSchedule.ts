export type ChatScheduleStatus = 'SCHEDULED' | 'CANCELLED';

export type ChatScheduleRsvpStatus = 'ATTENDING' | 'NOT_ATTENDING';

export interface ChatScheduleParticipant {
  userId: number | string;
  nickname: string;
  profileImage?: string;
  status: ChatScheduleRsvpStatus;
  host: boolean;
}

export interface ChatSchedule {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes?: number;
  timeZone: string;
  location?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
  status: ChatScheduleStatus;
  version: number;
  creatorId: number | string;
  currentUserStatus?: ChatScheduleRsvpStatus | null;
  participants: ChatScheduleParticipant[];
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
}

export interface ChatScheduleFormValues {
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
}

export interface CreateChatScheduleRequest {
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  timeZone: string;
  location?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  kakaoPlaceId?: string;
}

export interface UpdateChatScheduleRequest extends CreateChatScheduleRequest {
  version: number;
}
