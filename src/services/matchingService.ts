import api from './api';
import { MatchProfile, MatchingPreferences, Location } from '../store/types';

// 거리 계산 (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // 지구의 반경 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const matchingService = {
  async saveMatchingPreferences(preferences: MatchingPreferences): Promise<void> {
    await api.post('/matching/preferences', preferences);
  },

  async startMatching(preferences: MatchingPreferences): Promise<void> {
    await api.post('/matching/start', preferences);
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