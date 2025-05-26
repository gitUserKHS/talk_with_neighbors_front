import { ChatState } from '../store/slices/chatSlice';
import { User } from '../types/user';
import { store } from './index';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MatchingPreferences {
  location: Location;
  maxDistance: number;
  ageRange: [number, number];
  gender?: string;
  interests?: string[];
}

export interface MatchProfile {
  id: string;
  matchId?: string;
  username: string;
  age: number;
  gender: string;
  interests: string[];
  bio?: string;
  profileImage?: string;
  distance: number;
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  navigateTo?: string;
}

export interface ActiveMatchRoomInfo {
  id: string;
  name: string;
  message?: string;
}

export interface OfflineNotification {
  id: string;
  type: 'NOTIFICATION_SUMMARY' | 'SYSTEM_NOTICE' | 'MATCH_NOTIFICATION' | 'CHAT_NOTIFICATION' | 
        'CHAT_INVITATION' | 'CHAT_DELETED' | 'CHAT_MESSAGE' | 
        'MATCH_REQUEST' | 'MATCH_ACCEPTED' | 'MATCH_REJECTED' | 'MATCH_COMPLETED';
  title: string;
  message: string;
  priority: number; // 1-10 (높을수록 중요)
  createdAt: string;
  isRead: boolean;
  data?: any;
}

export interface ConnectionStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastDisconnectedAt?: string;
  reconnectAttempts: number;
}

export interface NotificationState {
  notifications: NotificationMessage[];
  pendingMatchOffer: MatchProfile | null;
  activeMatchRoomInfo: ActiveMatchRoomInfo | null;
  matchStatusMessage: string | null;
  offlineNotifications: OfflineNotification[];
  unreadOfflineCount: number;
  connectionStatus: ConnectionStatus;
  showOfflineSummary: boolean;
  systemNotices: OfflineNotification[];
}

export interface RootState {
  chat: ChatState;
  auth: AuthState;
  notifications: NotificationState;
}

export type AppDispatch = typeof store.dispatch;