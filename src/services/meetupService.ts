import api from './api';
import { CreateHobbyMeetupRequest, HobbyMeetup, HobbyMeetupPage } from '../types/meetup';

export const meetupService = {
  async getMeetups(params?: {
    keyword?: string;
    interest?: string;
    page?: number;
    size?: number;
  }): Promise<HobbyMeetupPage> {
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
