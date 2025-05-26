import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  MatchProfile, 
  NotificationState, 
  NotificationMessage, 
  ActiveMatchRoomInfo,
  OfflineNotification,
  ConnectionStatus
} from '../../store/types';

// 확장된 NotificationState
interface ExtendedNotificationState extends NotificationState {
  offlineNotifications: OfflineNotification[];
  unreadOfflineCount: number;
  connectionStatus: ConnectionStatus;
  showOfflineSummary: boolean;
  systemNotices: OfflineNotification[];
}

const initialState: ExtendedNotificationState = {
  notifications: [],
  pendingMatchOffer: null,
  activeMatchRoomInfo: null,
  matchStatusMessage: null,
  // 오프라인 알림 시스템 상태
  offlineNotifications: [],
  unreadOfflineCount: 0,
  connectionStatus: {
    isOnline: true,
    wasOffline: false,
    reconnectAttempts: 0
  },
  showOfflineSummary: false,
  systemNotices: []
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<NotificationMessage, 'id'>>) => {
      const newNotification = {
        ...action.payload,
        id: new Date().toISOString() + Math.random().toString(),
      };
      state.notifications.push(newNotification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    setPendingMatchOffer: (state, action: PayloadAction<MatchProfile | null>) => {
      state.pendingMatchOffer = action.payload;
      if (action.payload) {
        state.matchStatusMessage = `${action.payload.username}님과의 새로운 매칭 제안!`;
      }
    },
    clearPendingMatchOffer: (state) => {
      state.pendingMatchOffer = null;
    },
    setMatchAccepted: (state, action: PayloadAction<{ matchId: string; message?: string }>) => {
      state.matchStatusMessage = action.payload.message || '매칭이 수락되었습니다. 상대방의 최종 확인을 기다립니다.';
    },
    setMatchRejected: (state, action: PayloadAction<{ matchId?: string; message?: string }>) => {
      state.matchStatusMessage = action.payload.message || '매칭이 거절되었습니다.';
      state.pendingMatchOffer = null; 
      state.activeMatchRoomInfo = null;
    },
    setMatchCompleted: (state, action: PayloadAction<ActiveMatchRoomInfo>) => {
      state.activeMatchRoomInfo = action.payload;
      state.pendingMatchOffer = null;
      state.matchStatusMessage = action.payload.message || `매칭 성공! '${action.payload.name}' 채팅방으로 이동합니다.`;
    },
    clearActiveMatchRoomInfo: (state) => {
      state.activeMatchRoomInfo = null;
      state.matchStatusMessage = null;
    },
    setMatchStatusMessage: (state, action: PayloadAction<string | null>) => {
      state.matchStatusMessage = action.payload;
    },
    addOfflineNotification: (state, action: PayloadAction<Omit<OfflineNotification, 'id'>>) => {
      const newNotification: OfflineNotification = {
        ...action.payload,
        id: new Date().toISOString() + Math.random().toString(),
        isRead: false,
        createdAt: action.payload.createdAt || new Date().toISOString()
      };
      
      // 우선순위 순으로 정렬하여 삽입
      const insertIndex = state.offlineNotifications.findIndex(
        notif => notif.priority < newNotification.priority
      );
      
      if (insertIndex === -1) {
        state.offlineNotifications.push(newNotification);
      } else {
        state.offlineNotifications.splice(insertIndex, 0, newNotification);
      }
      
      state.unreadOfflineCount++;
      console.log(`[NotificationSlice] Added offline notification: ${newNotification.title} (priority: ${newNotification.priority})`);
    },
    markOfflineNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.offlineNotifications.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadOfflineCount = Math.max(0, state.unreadOfflineCount - 1);
      }
    },
    markAllOfflineNotificationsAsRead: (state) => {
      state.offlineNotifications.forEach(notification => {
        notification.isRead = true;
      });
      state.unreadOfflineCount = 0;
    },
    removeOfflineNotification: (state, action: PayloadAction<string>) => {
      const notificationIndex = state.offlineNotifications.findIndex(n => n.id === action.payload);
      if (notificationIndex !== -1) {
        const notification = state.offlineNotifications[notificationIndex];
        if (!notification.isRead) {
          state.unreadOfflineCount = Math.max(0, state.unreadOfflineCount - 1);
        }
        state.offlineNotifications.splice(notificationIndex, 1);
      }
    },
    clearAllOfflineNotifications: (state) => {
      state.offlineNotifications = [];
      state.unreadOfflineCount = 0;
    },
    setConnectionStatus: (state, action: PayloadAction<Partial<ConnectionStatus>>) => {
      state.connectionStatus = { ...state.connectionStatus, ...action.payload };
      
      // 오프라인에서 온라인으로 복귀한 경우
      if (action.payload.isOnline && state.connectionStatus.wasOffline) {
        state.connectionStatus.wasOffline = false;
        state.connectionStatus.reconnectAttempts = 0;
        console.log('[NotificationSlice] Connection recovered from offline state');
      }
    },
    incrementReconnectAttempts: (state) => {
      state.connectionStatus.reconnectAttempts++;
    },
    setShowOfflineSummary: (state, action: PayloadAction<boolean>) => {
      state.showOfflineSummary = action.payload;
    },
    addSystemNotice: (state, action: PayloadAction<Omit<OfflineNotification, 'id' | 'type'>>) => {
      const systemNotice: OfflineNotification = {
        ...action.payload,
        id: new Date().toISOString() + Math.random().toString(),
        type: 'SYSTEM_NOTICE',
        isRead: false,
        createdAt: action.payload.createdAt || new Date().toISOString()
      };
      
      state.systemNotices.unshift(systemNotice); // 최신 공지를 맨 위에
      
      // 최대 50개까지만 유지
      if (state.systemNotices.length > 50) {
        state.systemNotices = state.systemNotices.slice(0, 50);
      }
    },
    handleNotificationSummary: (state, action: PayloadAction<{ sentCount: number; message: string; details?: any }>) => {
      const { sentCount, message, details } = action.payload;
      
      if (sentCount > 0) {
        // 요약 알림 추가
        const summaryNotification: OfflineNotification = {
          id: 'summary-' + new Date().toISOString(),
          type: 'NOTIFICATION_SUMMARY',
          title: '오프라인 알림',
          message: message,
          priority: 8, // 높은 우선순위
          createdAt: new Date().toISOString(),
          isRead: false,
          data: { sentCount, details }
        };
        
        state.offlineNotifications.unshift(summaryNotification);
        state.unreadOfflineCount++;
        state.showOfflineSummary = true;
        
        console.log(`[NotificationSlice] Added notification summary: ${sentCount} notifications`);
      }
    }
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
  handleNotificationSummary
} = notificationSlice.actions;

export default notificationSlice.reducer; 