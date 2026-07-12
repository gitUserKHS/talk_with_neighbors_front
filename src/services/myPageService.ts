import api from './api';
import { FeedPost } from '../types/feed';
import { HobbyMeetup } from '../types/meetup';
import { MyCommentActivity, MyPageOverview, UserPreferences } from '../types/mypage';

export const myPageService = {
  async overview(): Promise<MyPageOverview> {
    return (await api.get<MyPageOverview>('/mypage/overview')).data;
  },
  async posts(): Promise<FeedPost[]> {
    return (await api.get<FeedPost[]>('/mypage/posts')).data;
  },
  async comments(): Promise<MyCommentActivity[]> {
    return (await api.get<MyCommentActivity[]>('/mypage/comments')).data;
  },
  async likes(): Promise<FeedPost[]> {
    return (await api.get<FeedPost[]>('/mypage/likes')).data;
  },
  async meetups(): Promise<HobbyMeetup[]> {
    return (await api.get<HobbyMeetup[]>('/mypage/meetups')).data;
  },
  async preferences(): Promise<UserPreferences> {
    return (await api.get<UserPreferences>('/mypage/preferences')).data;
  },
  async updatePreferences(request: Partial<UserPreferences>): Promise<UserPreferences> {
    return (await api.put<UserPreferences>('/mypage/preferences', request)).data;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/mypage/password', { currentPassword, newPassword });
  },
  async logoutAll(): Promise<void> {
    await api.post('/mypage/logout-all');
  },
};
