import api from './api';

export interface InboxNotification {
  id: number;
  type: string;
  data: string;
  message?: string;
  actionUrl?: string;
  priority: number;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

export const notificationService = {
  async getNotifications(page = 0, size = 20): Promise<Page<InboxNotification>> {
    const response = await api.get<Page<InboxNotification>>('/notifications', { params: { page, size } });
    return response.data;
  },
  async unreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },
  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
    window.dispatchEvent(new Event('notifications:changed'));
  },
  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
    window.dispatchEvent(new Event('notifications:changed'));
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`);
    window.dispatchEvent(new Event('notifications:changed'));
  },
};

export default notificationService;
