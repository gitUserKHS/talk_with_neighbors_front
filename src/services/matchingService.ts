import api from './api';
import { MatchProfile, MatchingPreferences } from '../store/types';

export const matchingService = {
  async saveMatchingPreferences(preferences: MatchingPreferences): Promise<void> {
    await api.post('/matching/preferences', preferences);
  },

  async startMatching(preferences: MatchingPreferences): Promise<MatchProfile[]> {
    const response = await api.post<MatchProfile[]>('/matching/start', preferences);
    return response.data;
  },

  async getRecommendations(): Promise<MatchProfile[]> {
    const response = await api.get<MatchProfile[]>('/matching/recommendations');
    return response.data;
  },

  async requestMatch(targetUserId: string | number): Promise<MatchProfile> {
    const response = await api.post<MatchProfile>(`/matching/users/${targetUserId}/request`);
    return response.data;
  },

  async stopMatching(): Promise<void> {
    await api.post('/matching/stop');
  },

  async acceptMatch(matchId: string): Promise<void> {
    await api.post(`/matching/${matchId}/accept`);
  },

  async rejectMatch(matchId: string): Promise<void> {
    await api.post(`/matching/${matchId}/reject`);
  },

  async searchNearbyUsers(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<MatchProfile[]> {
    const response = await api.get<MatchProfile[]>('/matching/nearby', {
      params: { latitude, longitude, radius },
    });
    return response.data;
  },
};

export default matchingService;
