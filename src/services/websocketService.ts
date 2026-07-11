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

interface WebSocketNotification<T = any> {
  type: string;
  data?: T;
  message?: string;
  navigateTo?: string;
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

    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${socketUrl}/ws?sessionId=${sessionId}`),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
      onConnect: () => {
        this.isConnected = true;
        this.emitConnectionState(true);
        this.subscribeToGlobalTopics();
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.emitConnectionState(false);
      },
      onStompError: () => {
        this.isConnected = false;
        this.emitConnectionState(false);
      },
      onWebSocketClose: () => {
        this.isConnected = false;
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

  markMessageAsRead(messageId: string): void {
    this.client?.publish({
      destination: '/app/chat.markAsRead',
      body: JSON.stringify({ messageId }),
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
            navigateTo: notification.navigateTo,
          })
        );
      }
    });

    this.client.subscribe('/user/queue/system-notifications', (message) => {
      const notification = this.parseMessage<WebSocketNotification>(message);
      if (notification?.message) {
        store.dispatch(addNotification({ type: 'info', message: notification.message }));
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
            message: notification.message || '새 매칭 요청이 도착했어.',
            navigateTo: '/matching',
          })
        );
        break;
      case 'MATCH_COMPLETED_AND_CHAT_CREATED':
        store.dispatch(
          setMatchCompleted({
            id: String(notification.data?.id),
            name: notification.data?.roomName || notification.data?.name || '1:1 채팅',
            message: notification.message,
          })
        );
        break;
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
