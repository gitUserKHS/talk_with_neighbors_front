import { describe, expect, it } from 'vitest';
import reducer, {
  addOfflineNotification,
  handleNotificationSummary,
  markAllOfflineNotificationsAsRead,
  markOfflineNotificationAsRead,
  setConnectionStatus,
} from './notificationSlice';

const notification = (title: string) => ({
  type: 'CHAT_MESSAGE' as const,
  title,
  message: `${title} message`,
  priority: 5,
  createdAt: '2026-07-14T00:00:00.000Z',
  isRead: false,
});

describe('notificationSlice', () => {
  it('tracks unread notifications and marks one as read', () => {
    let state = reducer(undefined, { type: '@@init' });
    state = reducer(state, addOfflineNotification(notification('first')));
    state = reducer(state, addOfflineNotification(notification('second')));

    expect(state.unreadOfflineCount).toBe(2);
    expect(state.offlineNotifications.map((item) => item.title)).toEqual(['second', 'first']);

    state = reducer(
      state,
      markOfflineNotificationAsRead(state.offlineNotifications[0].id),
    );

    expect(state.unreadOfflineCount).toBe(1);
    expect(state.offlineNotifications[0].isRead).toBe(true);
  });

  it('marks every offline notification as read', () => {
    let state = reducer(undefined, addOfflineNotification(notification('first')));
    state = reducer(state, addOfflineNotification(notification('second')));
    state = reducer(state, markAllOfflineNotificationsAsRead());

    expect(state.unreadOfflineCount).toBe(0);
    expect(state.offlineNotifications.every((item) => item.isRead)).toBe(true);
  });

  it('ignores empty summaries and exposes non-empty summaries', () => {
    const initial = reducer(undefined, { type: '@@init' });
    const unchanged = reducer(
      initial,
      handleNotificationSummary({ sentCount: 0, message: 'nothing new' }),
    );
    const summarized = reducer(
      unchanged,
      handleNotificationSummary({ sentCount: 2, message: 'two updates' }),
    );

    expect(unchanged.offlineNotifications).toHaveLength(0);
    expect(summarized.offlineNotifications[0]).toMatchObject({
      type: 'NOTIFICATION_SUMMARY',
      message: 'two updates',
      isRead: false,
    });
    expect(summarized.showOfflineSummary).toBe(true);
    expect(summarized.unreadOfflineCount).toBe(1);
  });

  it('merges partial connection status updates', () => {
    const state = reducer(
      undefined,
      setConnectionStatus({ isOnline: false, wasOffline: true }),
    );

    expect(state.connectionStatus).toEqual({
      isOnline: false,
      wasOffline: true,
      reconnectAttempts: 0,
    });
  });
});
