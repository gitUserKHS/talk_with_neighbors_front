import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WebSocketResponse } from '../types/chat';
import { store } from '../store';
import {
  addNotification,
  setMatchAccepted,
  setMatchCompleted,
  setMatchRejected,
  setPendingMatchOffer,
} from '../store/slices/notificationSlice';
import {
  moveChatRoomToTop,
  removeRoom,
  updateMessageReadStatus,
  updateRoomInfo,
  updateUnreadCount,
} from '../store/slices/chatSlice';
import { translate } from '../i18n/I18nProvider';

interface WebSocketNotification<T = any> {
  type: string;
  data?: T;
  message?: string;
  navigateTo?: string;
  actionUrl?: string;
  createdAt?: string;
  priority?: number;
}

class WebSocketService {
  private client: Client | null = null;
  private currentUserId: number | string | undefined;
  private isConnected = false;
  private roomSubscriptions = new Map<string, StompSubscription>();
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  initialize(currentUserId?: number | string): void {
    if (currentUserId) {
      this.currentUserId = currentUserId;
    }

    if (this.isConnected || this.client?.active) {
      return;
    }

    if (!this.currentUserId) {
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${socketUrl}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        this.isConnected = true;
        this.emitConnectionState(true);
        this.subscribeToGlobalTopics();
        this.client?.publish({ destination: '/app/client/ready', body: '{}' });
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.roomSubscriptions.clear();
        this.emitConnectionState(false);
      },
      onStompError: () => {
        this.isConnected = false;
        this.roomSubscriptions.clear();
        this.emitConnectionState(false);
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        // A STOMP subscription belongs to the socket that created it. Keeping
        // the old handles would prevent ChatRoom from subscribing after retry.
        this.roomSubscriptions.clear();
        this.emitConnectionState(false);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.roomSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.roomSubscriptions.clear();
    this.client?.deactivate();
    this.client = null;
    this.isConnected = false;
    this.emitConnectionState(false);
  }

  setCurrentUserId(userId: number | string | undefined): void {
    this.currentUserId = userId;
  }

  getCurrentUserId(): number | string | undefined {
    return this.currentUserId;
  }

  getIsConnected(): boolean {
    return Boolean(this.client?.connected && this.isConnected);
  }

  registerConnectionStateChangeCallback(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    callback(this.getIsConnected());
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter((item) => item !== callback);
    };
  }

  subscribeToRoom(roomId: string, callback: (message: WebSocketResponse) => void): void {
    if (!roomId || !this.client?.connected) return;
    if (this.roomSubscriptions.has(roomId)) return;

    const subscription = this.client.subscribe(`/user/queue/chat/room/${roomId}`, (message) => {
      const parsed = this.parseMessage<WebSocketResponse>(message);
      if (parsed) {
        callback(parsed);
      }
    });
    this.roomSubscriptions.set(roomId, subscription);
  }

  unsubscribeFromRoom(roomId: string): void {
    this.roomSubscriptions.get(roomId)?.unsubscribe();
    this.roomSubscriptions.delete(roomId);
  }

  joinRoom(roomId: string): void {
    this.client?.publish({
      destination: '/app/chat.enterRoom',
      body: JSON.stringify({ roomId }),
    });
  }

  leaveRoom(roomId: string): void {
    this.client?.publish({
      destination: '/app/chat.leaveRoom',
      body: JSON.stringify({ roomId }),
    });
  }

  markAllMessagesAsRead(roomId: string): void {
    this.client?.publish({
      destination: '/app/chat.markAllAsRead',
      body: JSON.stringify({ roomId }),
    });
  }

  markMessageAsRead(roomId: string, messageId: string): void {
    this.client?.publish({
      destination: '/app/chat.markAsRead',
      body: JSON.stringify({ roomId, messageId }),
    });
  }

  debugCurrentState(): void {
    console.info('[WebSocketService]', {
      currentUserId: this.currentUserId,
      connected: this.getIsConnected(),
      roomSubscriptions: Array.from(this.roomSubscriptions.keys()),
    });
  }

  private subscribeToGlobalTopics(): void {
    if (!this.client?.connected) return;

    this.client.subscribe('/user/queue/match-notifications', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      if (notification) {
        this.handleMatchNotification(notification);
      }
    });

    this.client.subscribe('/user/queue/chat-notifications', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      if (notification?.message) {
        store.dispatch(
          addNotification({
            type: 'info',
            message: notification.message,
            navigateTo: notification.navigateTo || notification.actionUrl,
          })
        );
      }
    });

    this.client.subscribe('/user/queue/chat-updates', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      const data = notification?.data;
      if (!notification || !data) return;

      if (notification.type === 'CHAT_ROOM_LIST_UPDATE' && data.chatRoomId) {
        store.dispatch(moveChatRoomToTop(String(data.chatRoomId)));
      } else if (notification.type === 'CHAT_MESSAGE_CHANGED' && data.chatRoomId) {
        store.dispatch(
          updateRoomInfo({
            roomId: String(data.chatRoomId),
            lastMessage: data.lastMessage ?? null,
            senderName: data.lastSenderName ?? null,
            timestamp: data.lastMessageTime ?? null,
          })
        );
      } else if (notification.type === 'UNREAD_COUNT_UPDATE' && data.chatRoomId) {
        store.dispatch(
          updateUnreadCount({
            roomId: String(data.chatRoomId),
            count: Number(data.unreadCount || 0),
          })
        );
      } else if (notification.type === 'ROOM_DELETED' && data.chatRoomId) {
        store.dispatch(removeRoom(String(data.chatRoomId)));
      }
    });

    this.client.subscribe('/user/queue/chat/read-status', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      const data = notification?.data;
      if (notification?.type !== 'MESSAGE_READ_STATUS_UPDATE' || !data) return;

      store.dispatch(
        updateMessageReadStatus({
          messageId: String(data.messageId),
          roomId: String(data.chatRoomId),
          readByUserId: data.readByUserId,
        })
      );
    });

    this.client.subscribe('/user/queue/system-notifications', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      if (notification?.message) {
        store.dispatch(
          addNotification({
            type: 'info',
            message: notification.message,
            navigateTo: notification.navigateTo || notification.actionUrl,
          })
        );
      }
    });
  }

  private handleMatchNotification(notification: WebSocketNotification): void {
    switch (notification.type) {
      case 'MATCH_OFFERED':
        store.dispatch(setPendingMatchOffer(notification.data));
        store.dispatch(
          addNotification({
            type: 'info',
            message: notification.message || translate('새 매칭 요청이 도착했습니다.', 'You received a new match request.'),
            navigateTo: '/matching',
          })
        );
        break;
      case 'MATCH_COMPLETED_AND_CHAT_CREATED': {
        const roomId = notification.data?.chatRoomId || notification.data?.id;
        store.dispatch(
          setMatchCompleted({
            id: String(roomId || ''),
            name: notification.data?.roomName || notification.data?.name || translate('1:1 채팅', 'Direct chat'),
            message: notification.message,
          })
        );
        break;
      }
      case 'MATCH_ACCEPTED_BY_OTHER':
        store.dispatch(
          setMatchAccepted({
            matchId: String(notification.data?.matchId || ''),
            message: notification.message,
          })
        );
        break;
      case 'MATCH_REJECTED_BY_OTHER':
        store.dispatch(
          setMatchRejected({
            matchId: String(notification.data?.matchId || ''),
            message: notification.message,
          })
        );
        break;
      default:
        if (notification.message) {
          store.dispatch(addNotification({ type: 'info', message: notification.message }));
        }
    }
  }

  private parseMessage<T>(message: IMessage): T | null {
    try {
      return JSON.parse(message.body) as T;
    } catch {
      return null;
    }
  }

  private emitConnectionState(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }
}

export const websocketService = new WebSocketService();
