import api from './api';
import {
  ChatSchedule,
  ChatScheduleRsvpStatus,
  CreateChatScheduleRequest,
  UpdateChatScheduleRequest,
} from '../types/chatSchedule';

const schedulePath = (roomId: string, scheduleId?: string) => {
  const base = `/chat/rooms/${encodeURIComponent(roomId)}/schedules`;
  return scheduleId ? `${base}/${encodeURIComponent(scheduleId)}` : base;
};

export const normalizeChatSchedule = (schedule: ChatSchedule): ChatSchedule => ({
  ...schedule,
  description: schedule.description?.trim() || undefined,
  location: schedule.location?.trim() || undefined,
  locationAddress: schedule.locationAddress?.trim() || undefined,
  latitude: schedule.latitude ?? undefined,
  longitude: schedule.longitude ?? undefined,
  kakaoPlaceId: schedule.kakaoPlaceId?.trim() || undefined,
  cancelledAt: schedule.cancelledAt ?? undefined,
  participants: (schedule.participants ?? []).map((participant) => ({
    ...participant,
    profileImage: participant.profileImage || undefined,
  })),
  timeZone: schedule.timeZone || 'Asia/Seoul',
});

export const chatScheduleService = {
  async getSchedules(roomId: string): Promise<ChatSchedule[]> {
    const response = await api.get<ChatSchedule[]>(schedulePath(roomId));
    return (response.data ?? []).map(normalizeChatSchedule);
  },

  async getSchedule(roomId: string, scheduleId: string): Promise<ChatSchedule> {
    const response = await api.get<ChatSchedule>(schedulePath(roomId, scheduleId));
    return normalizeChatSchedule(response.data);
  },

  async createSchedule(
    roomId: string,
    request: CreateChatScheduleRequest,
  ): Promise<ChatSchedule> {
    const response = await api.post<ChatSchedule>(schedulePath(roomId), request);
    return normalizeChatSchedule(response.data);
  },

  async updateSchedule(
    roomId: string,
    scheduleId: string,
    request: UpdateChatScheduleRequest,
  ): Promise<ChatSchedule> {
    const response = await api.patch<ChatSchedule>(schedulePath(roomId, scheduleId), request);
    return normalizeChatSchedule(response.data);
  },

  async cancelSchedule(
    roomId: string,
    scheduleId: string,
    version: number,
  ): Promise<ChatSchedule> {
    const response = await api.post<ChatSchedule>(
      `${schedulePath(roomId, scheduleId)}/cancel`,
      { version },
    );
    return normalizeChatSchedule(response.data);
  },

  async updateRsvp(
    roomId: string,
    scheduleId: string,
    status: ChatScheduleRsvpStatus,
  ): Promise<ChatSchedule> {
    const response = await api.put<ChatSchedule>(
      `${schedulePath(roomId, scheduleId)}/rsvp`,
      { status },
    );
    return normalizeChatSchedule(response.data);
  },
};
