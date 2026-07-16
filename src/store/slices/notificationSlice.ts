import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ActiveMatchRoomInfo,
  ConnectionStatus,
  MatchProfile,
  NotificationMessage,
  NotificationState,
  OfflineNotification,
} from '../../store/types';
import { translate } from '../../i18n/I18nProvider';

const initialState: NotificationState = {
  notifications: [],
  pendingMatchOffer: null,
  activeMatchRoomInfo: null,
  matchStatusMessage: null,
  offlineNotifications: [],
  unreadOfflineCount: 0,
  connectionStatus: {
    isOnline: true,
    wasOffline: false,
    reconnectAttempts: 0,
  },
  showOfflineSummary: false,
  systemNotices: [],
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<NotificationMessage, 'id'>>) => {
      state.notifications.push({
        ...action.payload,
        id: createId(),
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    setPendingMatchOffer: (state, action: PayloadAction<MatchProfile | null>) => {
      state.pendingMatchOffer = action.payload;
      state.matchStatusMessage = action.payload
        ? translate(`${action.payload.username}님에게서 매칭 요청이 도착했습니다.`, `You received a match request from ${action.payload.username}.`)
        : null;
    },
    clearPendingMatchOffer: (state) => {
      state.pendingMatchOffer = null;
      state.matchStatusMessage = null;
    },
    setMatchAccepted: (state, action: PayloadAction<{ matchId: string; message?: string }>) => {
      state.matchStatusMessage =
        action.payload.message || translate('매칭을 수락했습니다. 상대방의 응답을 기다리고 있습니다.', 'Match accepted. Waiting for the other person to respond.');
    },
    setMatchRejected: (state, action: PayloadAction<{ matchId?: string; message?: string }>) => {
      state.matchStatusMessage = action.payload.message || translate('매칭 요청이 거절되었습니다.', 'The match request was declined.');
      state.pendingMatchOffer = null;
      state.activeMatchRoomInfo = null;
    },
    setMatchCompleted: (state, action: PayloadAction<ActiveMatchRoomInfo>) => {
      state.activeMatchRoomInfo = action.payload;
      state.pendingMatchOffer = null;
      state.matchStatusMessage =
        action.payload.message || translate(`매칭이 성사되어 '${action.payload.name}' 채팅방이 열렸습니다.`, `It is a match! The '${action.payload.name}' chat is now open.`);
    },
    clearActiveMatchRoomInfo: (state) => {
      state.activeMatchRoomInfo = null;
      state.matchStatusMessage = null;
    },
    setMatchStatusMessage: (state, action: PayloadAction<string | null>) => {
      state.matchStatusMessage = action.payload;
    },
    addOfflineNotification: (state, action: PayloadAction<Omit<OfflineNotification, 'id'>>) => {
      state.offlineNotifications.unshift({
        ...action.payload,
        id: createId(),
        isRead: action.payload.isRead ?? false,
        createdAt: action.payload.createdAt || new Date().toISOString(),
      });
      state.unreadOfflineCount = state.offlineNotifications.filter((item) => !item.isRead).length;
    },
    markOfflineNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.offlineNotifications.find((item) => item.id === action.payload);
      if (notification) {
        notification.isRead = true;
      }
      state.unreadOfflineCount = state.offlineNotifications.filter((item) => !item.isRead).length;
    },
    markAllOfflineNotificationsAsRead: (state) => {
      state.offlineNotifications.forEach((notification) => {
        notification.isRead = true;
      });
      state.unreadOfflineCount = 0;
    },
    removeOfflineNotification: (state, action: PayloadAction<string>) => {
      state.offlineNotifications = state.offlineNotifications.filter(
        (notification) => notification.id !== action.payload
      );
      state.unreadOfflineCount = state.offlineNotifications.filter((item) => !item.isRead).length;
    },
    clearAllOfflineNotifications: (state) => {
      state.offlineNotifications = [];
      state.unreadOfflineCount = 0;
    },
    setConnectionStatus: (state, action: PayloadAction<Partial<ConnectionStatus>>) => {
      state.connectionStatus = {
        ...state.connectionStatus,
        ...action.payload,
      };
    },
    incrementReconnectAttempts: (state) => {
      state.connectionStatus.reconnectAttempts += 1;
    },
    setShowOfflineSummary: (state, action: PayloadAction<boolean>) => {
      state.showOfflineSummary = action.payload;
    },
    addSystemNotice: (state, action: PayloadAction<Omit<OfflineNotification, 'id' | 'type'>>) => {
      state.systemNotices.unshift({
        ...action.payload,
        id: createId(),
        type: 'SYSTEM_NOTICE',
        isRead: action.payload.isRead ?? false,
        createdAt: action.payload.createdAt || new Date().toISOString(),
      });
    },
    handleNotificationSummary: (
      state,
      action: PayloadAction<{ sentCount: number; message: string; details?: any }>
    ) => {
      if (action.payload.sentCount <= 0) return;

      state.offlineNotifications.unshift({
        id: createId(),
        type: 'NOTIFICATION_SUMMARY',
        title: translate('오프라인 알림', 'Offline notifications'),
        message: action.payload.message,
        priority: 8,
        createdAt: new Date().toISOString(),
        isRead: false,
        data: action.payload.details,
      });
      state.unreadOfflineCount = state.offlineNotifications.filter((item) => !item.isRead).length;
      state.showOfflineSummary = true;
    },
  },
});

export const {
  addNotification,
  removeNotification,
  setPendingMatchOffer,
  clearPendingMatchOffer,
  setMatchAccepted,
  setMatchRejected,
  setMatchCompleted,
  clearActiveMatchRoomInfo,
  setMatchStatusMessage,
  addOfflineNotification,
  markOfflineNotificationAsRead,
  markAllOfflineNotificationsAsRead,
  removeOfflineNotification,
  clearAllOfflineNotifications,
  setConnectionStatus,
  incrementReconnectAttempts,
  setShowOfflineSummary,
  addSystemNotice,
  handleNotificationSummary,
} = notificationSlice.actions;

export default notificationSlice.reducer;
