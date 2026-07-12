import api from './api';
import { BlockedUser, CreateReportRequest, SafetyReport, SafetyTargetType } from '../types/safety';

export const safetyService = {
  async blockUser(userId: number): Promise<BlockedUser> {
    const response = await api.post<BlockedUser>(`/safety/blocks/${userId}`);
    return response.data;
  },

  async unblockUser(userId: number): Promise<void> {
    await api.delete(`/safety/blocks/${userId}`);
  },

  async getBlockedUsers(): Promise<BlockedUser[]> {
    const response = await api.get<BlockedUser[]>('/safety/blocks');
    return response.data;
  },

  async report(request: CreateReportRequest): Promise<SafetyReport> {
    const response = await api.post<SafetyReport>('/safety/reports', request);
    return response.data;
  },

  async hide(targetType: SafetyTargetType, targetId: string): Promise<void> {
    await api.post('/safety/hidden', { targetType, targetId });
  },

  async unhide(targetType: SafetyTargetType, targetId: string): Promise<void> {
    await api.delete(`/safety/hidden/${targetType}/${encodeURIComponent(targetId)}`);
  },
};

export default safetyService;
