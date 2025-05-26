import { Client, IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatMessageDto, WebSocketMessage, WebSocketResponse } from '../types/chat';
import { 
  addMessage, 
  removeRoom, 
  updateUnreadCount, 
  updateMessageReadStatus, 
  updateRoomInfo,
  moveChatRoomToTop,
  fetchAllUnreadCounts
} from '../store/slices/chatSlice';
import { store } from '../store';
import { 
  addNotification, 
  setPendingMatchOffer, 
  setMatchCompleted,
  setMatchRejected,
  setMatchAccepted,
  // 오프라인 알림 시스템 액션들 추가
  addOfflineNotification,
  setConnectionStatus,
  incrementReconnectAttempts,
  handleNotificationSummary,
  addSystemNotice
} from '../store/slices/notificationSlice';
import { MatchProfile, ActiveMatchRoomInfo } from '../store/types';

// 환경 변수에서 웹소켓 URL 가져오기
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8080';

// 백엔드에서 오는 알림 페이로드 타입 (예시, 실제 백엔드와 맞춰야 함)
interface MatchNotificationPayload {
  type: 'MATCH_OFFERED' | 'MATCH_ACCEPTED_BY_OTHER' | 'MATCH_REJECTED_BY_OTHER' | 'MATCH_COMPLETED_AND_CHAT_CREATED' | 'MATCH_ALREADY_IN_PROGRESS' | 'NO_MATCH_FOUND' | 'MATCH_CANCELLED';
  data?: any; // MatchProfile, ActiveMatchRoomInfo, 또는 단순 메시지 등 타입에 따라 다름
  message?: string; // 추가적인 메시지
  matchId?: string;
  chatRoomId?: string;
  chatRoomName?: string;
}

// 채팅 관련 알림 페이로드 타입
interface ChatNotificationPayload {
  type: 'ROOM_DELETED' | 'ROOM_CREATED' | 'ROOM_UPDATED' | 'USER_JOINED' | 'USER_LEFT' | 'NEW_MESSAGE' | 'UNREAD_COUNT_UPDATE' | 'MESSAGE_READ_STATUS_UPDATE';
  roomId?: string;
  roomName?: string;
  message?: string;
  data?: any;
}

class WebSocketService {
  private client: Client | null = null;
  private roomSubscriptions: { [key: string]: any } = {};
  private pendingRoomSubscriptions: Array<{ roomId: string; callback: (msg: WebSocketResponse) => void }> = [];
  private globalUserSubscriptions: Array<() => void> = [];
  private recentlyLeftRooms: Set<string> = new Set(); // 최근에 나간 방들을 추적

  private isConnecting = false;
  private isConnected = false;
  private currentUserId: number | string | undefined;
  private onConnectionStateChangeCallbacks: Array<(isConnected: boolean) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 생성자에서는 초기화하지 않고, 필요할 때 initialize() 메서드를 호출
  }

  // currentUserId를 반환하는 public getter 메소드 추가
  public getCurrentUserId(): number | string | undefined {
    return this.currentUserId;
  }

  public getIsConnected(): boolean {
    const actuallyConnected = this.client && this.client.connected && this.isConnected;
    console.log('[WebSocketService] Connection state check:', {
      hasClient: !!this.client,
      clientConnected: this.client?.connected,
      internalConnected: this.isConnected,
      actuallyConnected: !!actuallyConnected
    });
    return !!actuallyConnected;
  }

  private resetConnectionState() {
    console.log('[WebSocketService] Resetting connection state');
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketService] Max reconnection attempts reached');
      this.resetConnectionState();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectAttempts++;
    
    console.log(`[WebSocketService] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && this.currentUserId) {
        console.log(`[WebSocketService] Attempting reconnection ${this.reconnectAttempts}`);
        this.forceReconnect();
      }
    }, delay);
  }

  private forceReconnect() {
    console.log('[WebSocketService] Force reconnecting...');
    this.disconnect();
    this.isConnecting = false; // 강제로 연결 중 상태 해제
    this.initialize(this.currentUserId);
  }

  private unsubscribeFromGlobalUserTopics() {
    console.log('[WebSocketService] Unsubscribing from all global user topics...');
    this.globalUserSubscriptions.forEach(unsub => unsub?.());
    this.globalUserSubscriptions = [];
  }

  private handleChatNotification(payload: ChatNotificationPayload) {
    console.log('[WebSocketService] Processing chat notification:', payload);
    
    try {
      switch (payload.type) {
        case 'ROOM_DELETED':
          console.log('[WebSocketService] Handling ROOM_DELETED for roomId:', payload.roomId);
          if (payload.roomId) {
            const currentState = store.getState();
            const currentRoom = currentState.chat.currentRoom;
            const isCurrentRoom = currentRoom?.id === payload.roomId;
            store.dispatch(removeRoom(payload.roomId));
            if (isCurrentRoom) {
              store.dispatch(addNotification({ 
                type: 'warning', 
                message: payload.message || `현재 채팅방이 삭제되었습니다. 채팅방 목록으로 이동합니다.`,
                navigateTo: '/chat'
              }));
            } else {
              store.dispatch(addNotification({ 
                type: 'info', 
                message: payload.message || `채팅방 '${payload.roomName || payload.roomId}'이(가) 삭제되었습니다.` 
              }));
            }
          } else {
            console.error('[WebSocketService] ROOM_DELETED notification missing roomId');
          }
          break;
        case 'ROOM_CREATED':
          console.log('[WebSocketService] Handling ROOM_CREATED for roomId:', payload.roomId);
          store.dispatch(addNotification({ 
            type: 'success', 
            message: payload.message || `새로운 채팅방 '${payload.roomName || payload.roomId}'이(가) 생성되었습니다.` 
          }));
          break;
        case 'ROOM_UPDATED':
          console.log('[WebSocketService] Handling ROOM_UPDATED for roomId:', payload.roomId);
          store.dispatch(addNotification({ 
            type: 'info', 
            message: payload.message || `채팅방 정보가 업데이트되었습니다.` 
          }));
          break;
        case 'USER_JOINED':
          console.log('[WebSocketService] Handling USER_JOINED for roomId:', payload.roomId);
          store.dispatch(addNotification({ 
            type: 'info', 
            message: payload.message || `새로운 사용자가 채팅방에 참여했습니다.` 
          }));
          break;
        case 'USER_LEFT':
          console.log('[WebSocketService] Handling USER_LEFT for roomId:', payload.roomId);
          store.dispatch(addNotification({ 
            type: 'info', 
            message: payload.message || `사용자가 채팅방을 떠났습니다.` 
          }));
          break;
        case 'NEW_MESSAGE':
          console.log('[WebSocketService] Handling NEW_MESSAGE for roomId:', payload.roomId);
          if (payload.data) {
            store.dispatch(updateRoomInfo({
              roomId: payload.data.chatRoomId || payload.roomId,
              lastMessage: payload.data.messagePreview || payload.data.content,
              senderName: payload.data.senderName,
              timestamp: payload.data.createdAt
            }));
            const currentState = store.getState();
            const currentRoom = currentState.chat.currentRoom;
            const isCurrentRoom = currentRoom?.id === (payload.data.chatRoomId || payload.roomId);
            if (!isCurrentRoom && payload.data.senderName && payload.data.messagePreview) {
              store.dispatch(addNotification({ 
                type: 'info', 
                message: `${payload.data.senderName}: ${payload.data.messagePreview}`,
                duration: 4000,
                navigateTo: `/chat/${payload.data.chatRoomId || payload.roomId}`
              }));
            }
          } else {
            store.dispatch(addNotification({ 
              type: 'info', 
              message: payload.message || `새로운 메시지가 도착했습니다.`,
              duration: 3000
            }));
          }
          break;
        case 'UNREAD_COUNT_UPDATE':
          console.log('[WebSocketService] Handling UNREAD_COUNT_UPDATE for roomId:', payload.roomId);
          if (payload.data && payload.data.chatRoomId && typeof payload.data.unreadCount === 'number') {
            store.dispatch(updateUnreadCount({
              roomId: payload.data.chatRoomId,
              count: payload.data.unreadCount
            }));
          }
          break;
        case 'MESSAGE_READ_STATUS_UPDATE':
          console.log('[WebSocketService] Handling MESSAGE_READ_STATUS_UPDATE for roomId:', payload.roomId);
          if (payload.data && payload.data.messageId && payload.data.readByUserId) {
            store.dispatch(updateMessageReadStatus({
              messageId: payload.data.messageId,
              readByUserId: payload.data.readByUserId,
              roomId: payload.data.chatRoomId || payload.roomId
            }));
          }
          break;
        default:
          console.warn('[WebSocketService] Unknown chat notification type:', payload.type);
          store.dispatch(addNotification({ 
            type: 'info', 
            message: payload.message || `채팅 알림: ${payload.type}` 
          }));
      }
    } catch (error) {
      console.error('[WebSocketService] Error processing chat notification:', error, payload);
      store.dispatch(addNotification({ 
        type: 'error', 
        message: '채팅 알림 처리 중 오류가 발생했습니다.' 
      }));
    }
  }

  // 🆕 오프라인 알림 처리 함수 (백엔드 가이드 반영)
  private handleSystemNotification(payload: any) {
    console.log('[WebSocketService] Processing system notification:', payload);
    
    try {
      switch (payload.type) {
        case 'NOTIFICATION_SUMMARY':
          // 오프라인 중 쌓인 알림 개수 요약
          console.log('[WebSocketService] Handling NOTIFICATION_SUMMARY:', payload.data);
          if (payload.data && typeof payload.data.sentCount === 'number') {
            store.dispatch(handleNotificationSummary({
              sentCount: payload.data.sentCount,
              message: payload.message || `오프라인 중 ${payload.data.sentCount}개의 알림이 있었습니다.`,
              details: payload.data.details
            }));
            
            // 사용자에게 즉시 보여줄 알림도 추가
            store.dispatch(addNotification({
              type: 'info',
              message: `📬 오프라인 중 ${payload.data.sentCount}개의 알림이 도착했습니다.`,
              duration: 5000
            }));
            
            // 브라우저 알림도 표시
            this.showOfflineNotificationSummary(payload.data.sentCount, payload.message || '오프라인 알림이 있습니다.');
          }
          break;
          
        case 'SYSTEM_NOTICE':
          // 시스템 공지사항
          console.log('[WebSocketService] Handling SYSTEM_NOTICE:', payload.message);
          store.dispatch(addSystemNotice({
            title: '시스템 공지',
            message: payload.message || '새로운 시스템 공지사항이 있습니다.',
            priority: payload.priority || 7,
            createdAt: new Date().toISOString(),
            isRead: false
          }));
          
          // 즉시 보여줄 알림
          store.dispatch(addNotification({
            type: 'warning',
            message: `📢 ${payload.message}`,
            duration: 6000
          }));
          break;
          
        case 'CONNECTION_RECOVERY':
          // 연결 복구 알림
          console.log('[WebSocketService] Handling CONNECTION_RECOVERY');
          store.dispatch(addNotification({
            type: 'success',
            message: '🔄 연결이 복구되었습니다. 최신 정보를 확인하세요.',
            duration: 3000
          }));
          break;
          
        default:
          console.warn('[WebSocketService] Unknown system notification type:', payload.type);
          // 알 수 없는 시스템 알림도 오프라인 알림으로 저장
          store.dispatch(addOfflineNotification({
            type: 'SYSTEM_NOTICE',
            title: '시스템 알림',
            message: payload.message || `알 수 없는 시스템 알림: ${payload.type}`,
            priority: payload.priority || 5,
            createdAt: new Date().toISOString(),
            isRead: false
          }));
      }
    } catch (error) {
      console.error('[WebSocketService] Error processing system notification:', error, payload);
      store.dispatch(addNotification({ 
        type: 'error', 
        message: '시스템 알림 처리 중 오류가 발생했습니다.' 
      }));
    }
  }

  // 🆕 우선순위별 알림 처리 (백엔드 가이드 반영)
  private handleNotificationByPriority(notification: any) {
    const priority = notification.priority || 5; // 기본 중간 우선순위
    
    console.log(`[WebSocketService] Processing notification with priority ${priority}:`, notification);
    
    if (priority >= 8) {
      // 높은 우선순위: 팝업 + 사운드 + 진동
      this.showHighPriorityNotification(notification);
      this.playNotificationSound('high');
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } else if (priority >= 5) {
      // 중간 우선순위: 토스트 + 사운드
      this.showToastNotification(notification);
      this.playNotificationSound('medium');
    } else {
      // 낮은 우선순위: 조용한 업데이트
      this.handleSilentUpdate(notification);
    }
  }

  // 🆕 연결 상태 변화 처리
  private handleConnectionStateChange(isConnected: boolean) {
    console.log(`[WebSocketService] Connection state changed: ${isConnected}`);
    
    const currentState = store.getState().notifications.connectionStatus;
    
    if (!isConnected && currentState.isOnline) {
      // 온라인에서 오프라인으로
      store.dispatch(setConnectionStatus({
        isOnline: false,
        wasOffline: true,
        lastDisconnectedAt: new Date().toISOString()
      }));
      
      // 오프라인 상태 UI 표시
      this.showOfflineIndicator();
      
    } else if (isConnected && !currentState.isOnline) {
      // 오프라인에서 온라인으로 복귀
      store.dispatch(setConnectionStatus({
        isOnline: true,
        wasOffline: currentState.wasOffline
      }));
      
      // 오프라인 상태 UI 제거
      this.hideOfflineIndicator();
      
      // 온라인 복귀 처리
      if (currentState.wasOffline) {
        this.handleOnlineRecovery();
      }
    }
  }

  // 🆕 오프라인 알림 요약 브라우저 알림
  private showOfflineNotificationSummary(count: number, message: string) {
    if (Notification.permission === 'granted') {
      const notification = new Notification('오프라인 알림', {
        body: `${count}개의 알림이 도착했습니다: ${message}`,
        icon: '/favicon.ico',
        tag: 'offline-summary'
      });
      
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // 🆕 높은 우선순위 알림 표시
  private showHighPriorityNotification(notification: any) {
    // 고우선순위 알림은 브라우저 알림과 Redux 둘 다 사용
    if (Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title || '중요 알림', {
        body: notification.message,
        icon: '/favicon.ico',
        tag: 'high-priority',
        requireInteraction: true // 사용자가 직접 닫을 때까지 유지
      });
      
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };
    }
    
    // Redux 알림도 추가
    store.dispatch(addNotification({
      type: 'error',
      message: `🚨 ${notification.message}`,
      duration: 8000
    }));
  }

  // 🆕 토스트 알림 표시
  private showToastNotification(notification: any) {
    store.dispatch(addNotification({
      type: 'info',
      message: notification.message,
      duration: 4000
    }));
  }

  // 🆕 조용한 업데이트 처리
  private handleSilentUpdate(notification: any) {
    // 낮은 우선순위는 오프라인 알림 목록에만 추가
    store.dispatch(addOfflineNotification({
      type: notification.type || 'SYSTEM_NOTICE',
      title: notification.title || '알림',
      message: notification.message,
      priority: notification.priority || 1,
      createdAt: new Date().toISOString(),
      isRead: false
    }));
  }

  // 🆕 알림 소리 재생
  private playNotificationSound(type: 'high' | 'medium' | 'low') {
    try {
      // 간단한 비프음 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 우선순위별 다른 주파수
      switch (type) {
        case 'high':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'medium':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case 'low':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch (error) {
      console.log('[WebSocketService] Could not play notification sound:', error);
    }
  }

  // 🆕 오프라인 상태 표시
  private showOfflineIndicator() {
    const existingIndicator = document.getElementById('offline-indicator');
    if (existingIndicator) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.textContent = '🌐 연결이 끊어졌습니다. 재연결을 시도하고 있습니다...';
    
    document.body.appendChild(indicator);
    document.body.classList.add('app-offline');
  }

  // 🆕 오프라인 상태 숨김
  private hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
    document.body.classList.remove('app-offline');
  }

  // 🆕 온라인 복귀 처리
  private handleOnlineRecovery() {
    console.log('[WebSocketService] Handling online recovery - checking for missed notifications');
    
    // 연결 복구 알림 표시
    store.dispatch(addNotification({
      type: 'success',
      message: '🔄 연결이 복구되었습니다.',
      duration: 3000
    }));
    
    // 읽지 않은 메시지 수 전체 업데이트 요청
    this.refreshUnreadCounts();
  }

  // 🆕 읽지 않은 메시지 수 새로고침
  private async refreshUnreadCounts() {
    try {
      // 여기서는 Redux action을 통해 처리 (chatService를 통한 API 호출)
      const state = store.getState();
      if (state.auth.isAuthenticated) {
        // fetchAllUnreadCounts를 dispatch하여 최신 읽지 않은 메시지 수 가져오기
        store.dispatch(fetchAllUnreadCounts());
      }
    } catch (error) {
      console.error('[WebSocketService] Failed to refresh unread counts:', error);
    }
  }

  private subscribeToGlobalUserTopics() {
    if (!this.client || !this.client.connected || !this.currentUserId) {
      console.warn('[WebSocketService] Cannot subscribe to global user topics. Client not connected or user ID not set.');
      return;
    }
    this.unsubscribeFromGlobalUserTopics(); 
    console.log(`[WebSocketService] Subscribing to essential user topics for user: ${this.currentUserId}`);

    // 🎯 필요한 알림만 받도록 구독 최적화
    const essentialTopics = [
      // 1. 채팅 알림 (메시지, 초대, 삭제)
      `/user/queue/chat-notifications`,
      `/queue/chat-notifications`,
      `/user/${this.currentUserId}/queue/chat-notifications`,
      
      // 1.1 채팅방 목록 업데이트 알림 (새로운 경로 추가)
      `/user/queue/chat-updates`,
      `/queue/chat-updates`,
      `/user/${this.currentUserId}/queue/chat-updates`,
      
      // 2. 매칭 알림 (매칭 요청, 수락/거절)
      `/user/queue/match-notifications`,
      `/queue/match-notifications`,
      `/user/${this.currentUserId}/queue/match-notifications`,
      
      // 3. 시스템 중요 알림만
      `/user/queue/system-notifications`,
      `/queue/system-notifications`
    ];

    essentialTopics.forEach((topic, index) => {
      console.log(`[WebSocketService] [${index + 1}/${essentialTopics.length}] 필수 토픽 구독: ${topic}`);
      
      const sub = this.subscribe(topic, (payload: any) => {
        console.log(`🎯 [필수알림_${index + 1}] ${topic}에서 수신:`, JSON.stringify(payload, null, 2));
        
        // 필요한 알림만 처리
        this.handleEssentialNotification(topic, payload);
      });
      
      if (sub) {
        console.log(`✅ [WebSocketService] 필수 구독 성공 [${index + 1}]: ${topic}`);
        this.globalUserSubscriptions.push(sub);
      } else {
        console.error(`❌ [WebSocketService] 필수 구독 실패 [${index + 1}]: ${topic}`);
      }
    });

    console.log(`[WebSocketService] 필수 구독 완료: ${this.globalUserSubscriptions.length}개`);
    
    // 모든 필수 구독이 완료되었는지 확인 후 서버에 준비 완료 신호 전송
    if (this.globalUserSubscriptions.length === essentialTopics.length) {
      this.signalClientReadyToServer();
    } else {
      console.warn('[WebSocketService] Not all essential subscriptions were successful. Client ready signal not sent.');
    }
  }

  // 🎯 필요한 알림만 처리하는 핸들러
  private handleEssentialNotification(topic: string, payload: any) {
    console.log(`[WebSocketService] 필수 알림 처리: ${topic}`, payload);
    
    try {
      if (topic.includes('chat-notifications') || topic.includes('chat-updates')) {
        this.handleChatEssentialNotification(payload);
      } else if (topic.includes('match-notifications')) {
        this.handleMatchEssentialNotification(payload);
      } else if (topic.includes('system-notifications')) {
        this.handleSystemEssentialNotification(payload);
      } else {
        console.warn(`[WebSocketService] 알 수 없는 필수 토픽: ${topic}`);
      }
    } catch (error) {
      console.error(`[WebSocketService] 필수 알림 처리 오류 ${topic}:`, error, payload);
    }
  }

  // 🎯 채팅 필수 알림 처리 (초대, 삭제, 메시지, 채팅방 목록 업데이트)
  private handleChatEssentialNotification(payload: any) {
    console.log('[WebSocketService] 채팅 필수 알림 처리:', payload);
    
    // payload가 객체이고 type 속성이 문자열인지 명확히 확인
    if (typeof payload !== 'object' || payload === null || typeof payload.type !== 'string') {
      console.warn('[WebSocketService] 유효하지 않은 채팅 알림 페이로드 또는 타입 없음:', payload);
      return;
    }
    // console.log('[WebSocketService] 확인된 payload.type:', payload.type); // 필요시 디버깅용 주석 해제
    
    // 이제 payload.type이 유효하다고 가정하고 switch 문 진행
    switch (payload.type) {
      case 'ROOM_INVITATION':
        console.log('[WebSocketService] 채팅방 초대 알림');
        store.dispatch(addNotification({
          type: 'info',
          message: `🏠 "${payload.roomName || '채팅방'}"에 초대되었습니다.`,
          duration: 6000,
          navigateTo: `/chat/${payload.roomId}`
        }));
        store.dispatch(addOfflineNotification({
          type: 'CHAT_INVITATION',
          title: '채팅방 초대',
          message: `"${payload.roomName || '채팅방'}"에 초대되었습니다.`,
          priority: 8,
          createdAt: new Date().toISOString(),
          isRead: false
        }));
        break;
        
      case 'ROOM_DELETED':
        console.log('[WebSocketService] 채팅방 삭제 알림 (essential):', payload.roomId);
        if (payload.roomId) {
          store.dispatch(addNotification({
            type: 'warning',
            message: `🗑️ "${payload.roomName || '채팅방'}"이 삭제되었습니다. (essential)`,
            duration: 5000,
            navigateTo: '/chat'
          }));
          store.dispatch(addOfflineNotification({
            type: 'CHAT_DELETED',
            title: '채팅방 삭제',
            message: `"${payload.roomName || '채팅방'}"이 삭제되었습니다.`,
            priority: 7,
            createdAt: new Date().toISOString(),
            isRead: false
          }));
        }
        break;
        
      case 'CHAT_ROOM_LIST_UPDATE': 
        console.log('[WebSocketService] 채팅방 목록 업데이트 알림:', payload);
        store.dispatch(addNotification({
          type: 'info',
          message: payload.message || (payload.data && payload.data.message) || '채팅 목록이 업데이트되었습니다. 확인해보세요!',
          duration: 5000,
          navigateTo: '/chat'
        }));
        store.dispatch(addOfflineNotification({
          type: 'CHAT_NOTIFICATION', 
          title: '채팅 목록 업데이트',
          message: payload.message || (payload.data && payload.data.message) || '채팅 목록에 변경사항이 있습니다.',
          priority: (payload.data && payload.data.priority) || payload.priority || 5,
          createdAt: (payload.data && payload.data.createdAt) || payload.createdAt || new Date().toISOString(),
          isRead: false
        }));
        break;
        
      case 'NEW_MESSAGE':
        console.log('[WebSocketService] 새 메시지 알림 확인 (essential):', payload.data);
        if (payload.data && payload.data.chatRoomId && payload.data.senderName && payload.data.messagePreview) {
          const currentPath = window.location.pathname;
          const isInThisRoom = currentPath === `/chat/${payload.data.chatRoomId}`;
          const isOwnMessage = String(payload.data.senderId) === String(this.currentUserId);
          if (!isOwnMessage && !isInThisRoom) {
            console.log('[WebSocketService] 새 메시지 알림 표시 (essential)');
            store.dispatch(updateRoomInfo({
              roomId: payload.data.chatRoomId,
              lastMessage: payload.data.messagePreview,
              senderName: payload.data.senderName,
              timestamp: payload.data.createdAt
            }));
            store.dispatch(moveChatRoomToTop(payload.data.chatRoomId));
            const currentState = store.getState();
            const currentUnreadCount = currentState.chat.unreadCount[payload.data.chatRoomId] || 0;
            store.dispatch(updateUnreadCount({
              roomId: payload.data.chatRoomId,
              count: currentUnreadCount + 1
            }));
            store.dispatch(addNotification({
              type: 'info',
              message: `💬 ${payload.data.senderName}: ${payload.data.messagePreview} (essential)`,
              duration: 4000,
              navigateTo: `/chat/${payload.data.chatRoomId}`
            }));
            this.showBrowserNotification(
              payload.data.senderName, 
              payload.data.messagePreview, 
              payload.data.chatRoomId
            );
            store.dispatch(addOfflineNotification({
              type: 'CHAT_MESSAGE',
              title: `${payload.data.senderName}님의 메시지`,
              message: payload.data.messagePreview,
              priority: 6,
              createdAt: new Date().toISOString(),
              isRead: false
            }));
          } else {
            console.log('[WebSocketService] 메시지 알림 생략 - 이유:', {
              isOwnMessage,
              isInThisRoom,
              currentPath,
              targetRoom: `/chat/${payload.data.chatRoomId}`
            });
          }
        }
        break;
        
      default:
        console.warn('[WebSocketService] 처리되지 않은 필수 채팅 알림 타입:', payload.type);
    }
  }

  // 🎯 매칭 필수 알림 처리 (매칭 요청, 수락/거절)
  private handleMatchEssentialNotification(payload: any) {
    console.log('[WebSocketService] 매칭 필수 알림 처리:', payload);
    
    if (!payload || !payload.type) {
      console.warn('[WebSocketService] 매칭 알림 타입이 없음:', payload);
      return;
    }
    
    switch (payload.type) {
      case 'MATCH_REQUEST': // 서버에서 오는 타입
      case 'MATCH_OFFERED': // 기존에 클라이언트에서 사용하던 타입 (유지 또는 MATCH_REQUEST로 통일)
        // 매칭 요청 알림
        console.log('[WebSocketService] 매칭 요청 알림 (MATCH_REQUEST 또는 MATCH_OFFERED)');
        if (payload.data && payload.data.username) {
          store.dispatch(setPendingMatchOffer(payload.data as MatchProfile));
          store.dispatch(addNotification({
            type: 'info',
            message: `🤝 ${payload.data.username}님이 매칭을 요청했습니다. (${payload.type})`,
            duration: 8000,
            navigateTo: '/matching'
          }));
          
          // 오프라인 알림에도 추가
          store.dispatch(addOfflineNotification({
            type: 'MATCH_REQUEST', // 오프라인 알림 타입은 일관되게 유지
            title: '매칭 요청',
            message: `${payload.data.username}님이 매칭을 요청했습니다.`,
            priority: payload.priority || 9,
            createdAt: payload.createdAt || new Date().toISOString(),
            isRead: false
          }));
        }
        break;
        
      case 'MATCH_ACCEPTED': // 서버에서 오는 타입
      case 'MATCH_ACCEPTED_BY_OTHER': // 기존에 클라이언트에서 사용하던 타입
        // 매칭 수락 알림
        console.log('[WebSocketService] 매칭 수락 알림 (MATCH_ACCEPTED 또는 MATCH_ACCEPTED_BY_OTHER)');
        if (payload.matchId || (payload.data && (payload.data.matchId || payload.data.id))) { // 서버 응답의 matchId 필드 확인
          const matchId = payload.matchId || payload.data.matchId || payload.data.id;
          const message = payload.message || (payload.data && payload.data.message) || '🎉 상대방이 매칭을 수락했습니다!';
          
          store.dispatch(setMatchAccepted({ 
            matchId: matchId, 
            message: `${message} (${payload.type})`
          }));
          
          store.dispatch(addNotification({
            type: 'success',
            message: `${message} (${payload.type})`,
            duration: 6000
          }));
          
          // 오프라인 알림에도 추가
          store.dispatch(addOfflineNotification({
            type: 'MATCH_ACCEPTED', // 오프라인 알림 타입은 일관되게 유지
            title: '매칭 수락',
            message: message,
            priority: payload.priority || 8,
            createdAt: payload.createdAt || new Date().toISOString(),
            isRead: false
          }));
        }
        break;
        
      case 'MATCH_REJECTED_BY_OTHER':
        // 매칭 거절 알림
        console.log('[WebSocketService] 매칭 거절 알림');
        if (payload.matchId || (payload.data && payload.data.matchId)) {
          const matchId = payload.matchId || payload.data.matchId;
          store.dispatch(setMatchRejected({ 
            matchId: matchId, 
            message: '😔 상대방이 매칭을 거절했습니다.' 
          }));
          
          store.dispatch(addNotification({
            type: 'warning',
            message: '😔 상대방이 매칭을 거절했습니다.',
            duration: 4000
          }));
          
          // 오프라인 알림에도 추가
          store.dispatch(addOfflineNotification({
            type: 'MATCH_REJECTED',
            title: '매칭 거절',
            message: '상대방이 매칭을 거절했습니다.',
            priority: 5,
            createdAt: new Date().toISOString(),
            isRead: false
          }));
        }
        break;
        
      case 'MATCH_COMPLETED_AND_CHAT_CREATED':
        // 매칭 완료 및 채팅방 생성 알림
        console.log('[WebSocketService] 매칭 완료 알림');
        if (payload.data && payload.data.id && payload.data.name) {
          store.dispatch(setMatchCompleted(payload.data as ActiveMatchRoomInfo));
          store.dispatch(addNotification({
            type: 'success',
            message: `🎊 매칭 성공! "${payload.data.name}" 채팅방이 생성되었습니다.`,
            duration: 8000,
            navigateTo: `/chat/${payload.data.id}`
          }));
          
          // 오프라인 알림에도 추가
          store.dispatch(addOfflineNotification({
            type: 'MATCH_COMPLETED',
            title: '매칭 완료',
            message: `매칭 성공! "${payload.data.name}" 채팅방이 생성되었습니다.`,
            priority: 9,
            createdAt: new Date().toISOString(),
            isRead: false
          }));
        }
        break;
        
      default:
        console.warn('[WebSocketService] 처리되지 않은 매칭 알림 타입:', payload.type);
    }
  }

  // 🎯 시스템 필수 알림 처리 (중요한 공지만)
  private handleSystemEssentialNotification(payload: any) {
    console.log('[WebSocketService] 시스템 필수 알림 처리:', payload);
    
    // 중요한 시스템 공지만 처리
    if (payload && payload.type === 'URGENT_SYSTEM_NOTICE') {
      store.dispatch(addNotification({
        type: 'error',
        message: `📢 ${payload.message}`,
        duration: 10000
      }));
      
      store.dispatch(addOfflineNotification({
        type: 'SYSTEM_NOTICE',
        title: '긴급 시스템 공지',
        message: payload.message,
        priority: 10,
        createdAt: new Date().toISOString(),
        isRead: false
      }));
    }
  }

  public initialize(currentUserId?: number | string) {
    console.log('[WebSocketService] initialize() called. User ID:', currentUserId);

    // 사용자 ID가 제공되었고 현재 ID와 다른 경우, 기존 연결을 해제하고 새로 연결
    if (currentUserId && this.currentUserId !== currentUserId) {
      console.log('[WebSocketService] User ID changed, reconnecting...');
      this.disconnect();
      this.currentUserId = currentUserId;
      this.resetConnectionState();
    } else if (currentUserId) {
      this.currentUserId = currentUserId;
    }

    // 이미 연결된 경우 사용자 구독만 확인
    if (this.isConnected && this.currentUserId) {
      this.subscribeToGlobalUserTopics();
      return;
    }

    // 이미 연결 중인 경우 중복 시도 방지
    if (this.isConnecting) {
      console.log('[WebSocketService] Already connecting, skipping...');
      return;
    }

    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      console.error('[WebSocketService] Session ID not found.');
      return;
    }

    this.isConnecting = true;
    const connectUrl = `${SOCKET_URL}/ws?sessionId=${sessionId}`;

    try {
      // 기존 클라이언트가 있으면 정리
      if (this.client) {
        if (this.client.active) {
          this.client.deactivate();
        }
        this.client = null;
      }

      this.client = new Client({
        webSocketFactory: () => new SockJS(connectUrl),
        debug: function (str: string) { 
          // 핑/퐁 메시지는 제외하고 중요한 메시지만 로그
          if (!str.includes('PING') && !str.includes('PONG')) {
            console.log('[STOMP DEBUG] ' + str); 
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        connectionTimeout: 10000,
      });

      this.client.onConnect = (frame: IFrame) => {
        console.log('[WebSocketService] Connected successfully');
        
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        
        // 🆕 연결 상태 변화 처리 (오프라인 알림 시스템)
        this.handleConnectionStateChange(true);
        
        this.onConnectionStateChangeCallbacks.forEach(cb => cb(true));
        
        // 브라우저 알림 권한 자동 요청
        this.requestNotificationPermission();
        
        // 기존 pendingRoomSubscriptions 처리
        this.pendingRoomSubscriptions.forEach(({ roomId, callback }) => {
          if (this.client) {
            const sub = this.client.subscribe(`/topic/chat/room/${roomId}`, (message) => {
              try {
                const res: WebSocketResponse = JSON.parse(message.body);
                callback(res);

                const transformedMessage: ChatMessageDto = {
                  id: res.id,
                  chatRoomId: res.roomId,
                  senderId: res.senderId,
                  senderName: res.senderName,
                  content: res.content,
                  createdAt: res.createdAt,
                  updatedAt: res.updatedAt || res.createdAt,
                  isRead: (this.currentUserId !== undefined && res.readByUsers ? res.readByUsers.map(String).includes(String(this.currentUserId)) : false) || (String(res.senderId) === String(this.currentUserId)),
                  type: res.type,
                  readByUsers: res.readByUsers || [], 
                };
                store.dispatch(addMessage({ message: transformedMessage, currentUserId: this.currentUserId }));
              } catch (e) {
                console.error('[WebSocketService] Error processing message:', e);
              }
            });
            this.roomSubscriptions[roomId] = sub;
          }
        });
        this.pendingRoomSubscriptions = [];

        if (this.currentUserId) {
          this.subscribeToGlobalUserTopics();
        }
      };

      this.client.onStompError = (frame: IFrame) => {
        console.error('[WebSocketService] STOMP Error:', frame);
        this.isConnected = false;
        this.isConnecting = false;
        this.onConnectionStateChangeCallbacks.forEach(cb => cb(false));
        this.scheduleReconnect();
      };

      this.client.onWebSocketClose = (event: CloseEvent) => {
        console.warn('[WebSocketService] WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.onConnectionStateChangeCallbacks.forEach(cb => cb(false));
        
        if (!event.wasClean && this.currentUserId) {
          this.scheduleReconnect();
        }
      };
      
      this.client.onWebSocketError = (event: Event | IFrame) => {
        console.error('[WebSocketService] WebSocket error:', event);
        this.isConnected = false;
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.client.activate();

    } catch (error) {
      console.error('[WebSocketService] Error during client creation:', error);
      this.isConnecting = false; 
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  public subscribeToRoom(roomId: string, callback: (message: WebSocketResponse) => void) {
    if (!this.client || !this.isConnected) {
      console.log('[WebSocketService] Queuing room subscription:', roomId);
      if (!this.pendingRoomSubscriptions.find(p => p.roomId === roomId)){
         this.pendingRoomSubscriptions.push({ roomId, callback });
      }
      // 이미 연결 시도 중이 아니라면 초기화 시도 (initialize는 내부적으로 isConnecting 체크함)
      if (!this.isConnecting) {
        this.initialize(this.currentUserId); 
      }
      return; 
    }
    
    // 이미 해당 roomId로 기본 구독이 존재하면 중복 구독 방지
    if (this.client && this.client.connected && this.roomSubscriptions[roomId]) {
      console.log(`[WebSocketService] Already subscribed to room ${roomId}. Skipping.`);
      // 기존 콜백을 새 콜백으로 교체하거나, 여러 콜백을 지원하는 로직이 필요할 수 있음
      // 여기서는 단순화를 위해 일단 중복 구독을 막고 기존 구독을 유지한다고 가정
      return;
    }

    if (this.client && this.client.connected && !this.roomSubscriptions[roomId]) {
      console.log('[WebSocketService] Subscribing to room:', roomId);
      
      this.enterRoom(roomId); // 서버에 채팅방 입장 알림
      
      // 서버 전송 방식: /user/{userId}/queue/chat/room/{roomId}
      // 따라서 클라이언트는 이 경로를 구독해야 합니다.
      if (!this.currentUserId) {
        console.error(`[WebSocketService] Cannot subscribe to room ${roomId} without currentUserId.`);
        return;
      }
      const primaryRoomTopic = `/user/${this.currentUserId}/queue/chat/room/${roomId}`;
      console.log(`[WebSocketService] Primary subscription attempt for room ${roomId} on topic: ${primaryRoomTopic}`);

      try {
        const sub = this.client.subscribe(primaryRoomTopic, (message) => {
          try {
            const res: WebSocketResponse = JSON.parse(message.body);
            console.log(`[WebSocketService] New message received in room ${roomId} via ${primaryRoomTopic}:`, res.content);
            callback(res); // UI 업데이트 등을 위한 콜백

            const transformedMessage: ChatMessageDto = {
              id: res.id,
              chatRoomId: res.roomId,
              senderId: res.senderId,
              senderName: res.senderName,
              content: res.content,
              createdAt: res.createdAt,
              updatedAt: res.updatedAt || res.createdAt,
              isRead: (this.currentUserId !== undefined && res.readByUsers ? res.readByUsers.map(String).includes(String(this.currentUserId)) : false) || (String(res.senderId) === String(this.currentUserId)),
              type: res.type,
              readByUsers: res.readByUsers || [],
            };
            store.dispatch(addMessage({ message: transformedMessage, currentUserId: this.currentUserId }));

          } catch (e) {
            console.error(`[WebSocketService] Error processing message on ${primaryRoomTopic}:`, e);
          }
        });

        this.roomSubscriptions[roomId] = sub; // 기본 구독 저장 (roomId를 키로 사용)
        console.log(`[WebSocketService] Successfully subscribed to ${primaryRoomTopic} and stored with key ${roomId}`);

      } catch (error) {
        console.error(`[WebSocketService] Error during client.subscribe call for ${primaryRoomTopic}:`, error);
        // 구독 실패 시, enterRoom에 대한 반대 작업(leaveRoom 등)이나 사용자 알림 등을 고려할 수 있음
        return; // 구독 실패 시 더 이상 진행하지 않음
      }
      
      // 기존의 roomTopics 배열을 사용한 다중 구독 시도는 제거
      // this.pendingRoomSubscriptions = this.pendingRoomSubscriptions.filter(p => p.roomId !== roomId);
      // 위 라인은 이미 큐에 있던 항목을 처리한 후 실행되므로, 여기서 다시 필터링할 필요는 없을 수 있음
      // 대신, 성공적으로 구독이 이루어졌으므로 pending에서 해당 항목을 명시적으로 제거
      const pendingIndex = this.pendingRoomSubscriptions.findIndex(p => p.roomId === roomId);
      if (pendingIndex > -1) {
        this.pendingRoomSubscriptions.splice(pendingIndex, 1);
        console.log(`[WebSocketService] Removed ${roomId} from pending subscriptions.`);
      }
      
      this.subscribeToRoomReadStatus(roomId); // 읽음 상태 구독은 유지
    }
  }

  // 채팅방의 읽음 상태 업데이트 구독
  private subscribeToRoomReadStatus(roomId: string) {
    if (this.client && this.client.connected) {
      // 백엔드의 새로운 읽음 상태 토픽 구독
      const readStatusTopic = `/topic/chat/room/${roomId}/read-status`;
      
      console.log('[WebSocketService] Subscribing to read status topic:', readStatusTopic);
      
      const readStatusSub = this.client.subscribe(readStatusTopic, (message) => {
        try {
          const statusUpdate = JSON.parse(message.body);
          
          console.log('[WebSocketService] Received read status update:', statusUpdate);
          
          if (statusUpdate.type === 'MESSAGE_READ_STATUS_UPDATE' && statusUpdate.data) {
            store.dispatch(updateMessageReadStatus({
              messageId: statusUpdate.data.messageId,
              readByUserId: statusUpdate.data.readByUserId,
              roomId: roomId
            }));
          }
        } catch (e) {
          console.error('[WebSocketService] Error processing read status update:', e);
        }
      });
      
      // 읽음 상태 구독도 roomSubscriptions에 저장
      this.roomSubscriptions[`${roomId}_read_status`] = readStatusSub;
    }
  }

  // 범용 구독 메소드 (기존 유지)
  public subscribe(topic: string, callback: (payload: any) => void): (() => void) | undefined {
    if (this.client && this.client.connected) {
      const sub = this.client.subscribe(topic, (message) => {
        console.log(
          `[WebSocketService] Message RECEIVED on destination: ${topic}`,
          {
            headers: message.headers,
            body: message.body,
            isBinaryBody: message.isBinaryBody, // 이 값은 참고용으로 계속 로깅
            command: message.command
          }
        );

        let parsedBody: any;
        try {
          // isBinaryBody 플래그에 관계없이 message.body를 파싱 시도
          parsedBody = JSON.parse(message.body);
          console.log('[WebSocketService] Parsed Body (attempted):', parsedBody);
        } catch (e) {
          console.error(`[WebSocketService] Failed to parse JSON for topic ${topic}. Body:`, message.body, e);
          // 파싱 실패 시, 원본 문자열 body로 콜백을 호출
          try {
            callback(message.body);
          } catch (callbackError) {
            console.error(`[WebSocketService] Callback failed with raw body on topic ${topic} after parse failure:`, callbackError);
          }
          return;
        }

        // 파싱 성공 시 파싱된 객체로 콜백 호출
        try {
          callback(parsedBody);
        } catch (e) {
          console.error(`[WebSocketService] Error in callback for topic ${topic} with parsed body:`, e);
        }
      });
      return () => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      };
    } else {
      console.warn(`[WebSocketService] Cannot subscribe to ${topic} - not connected`);
      return undefined;
    }
  }

  public unsubscribeFromRoom(roomId: string) {
    // 서버에 채팅방 퇴장 알림
    this.leaveRoom(roomId);
    
    // 최근에 나간 방으로 추가하고 10초 후 제거
    this.recentlyLeftRooms.add(roomId);
    setTimeout(() => {
      this.recentlyLeftRooms.delete(roomId);
    }, 10000); // 10초 동안 해당 방의 알림 무시

    if (this.roomSubscriptions[roomId]) {
      console.log('Unsubscribing from room:', roomId);
      this.roomSubscriptions[roomId].unsubscribe();
      delete this.roomSubscriptions[roomId];
    }
    
    // 읽음 상태 구독도 해제
    const readStatusKey = `${roomId}_read_status`;
    if (this.roomSubscriptions[readStatusKey]) {
      console.log('Unsubscribing from room read status:', roomId);
      this.roomSubscriptions[readStatusKey].unsubscribe();
      delete this.roomSubscriptions[readStatusKey];
    }
    
    // 대기 중인 구독에서도 제거
    this.pendingRoomSubscriptions = this.pendingRoomSubscriptions.filter(p => p.roomId !== roomId);
    console.log('Subscription for room not found or already removed (pending also cleared):', roomId);
  }

  public sendMessage(message: WebSocketMessage): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: '/app/chat.send', // 목적지 주소는 실제 백엔드 설정에 맞게
        body: JSON.stringify(message),
      });
    } else {
      console.error('STOMP client is not connected. Cannot send message. Attempting to initialize.');
      this.initialize(this.currentUserId);
    }
  }

  // WebSocket을 통한 메시지 전송 (새로운 방식)
  public sendMessageViaWebSocket(roomId: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        console.error('[WebSocketService] STOMP client not connected for message sending');
        console.error('[WebSocketService] Client state:', {
          client: !!this.client,
          connected: this.client?.connected,
          active: this.client?.active
        });
        reject(new Error('WebSocket not connected'));
        return;
      }

      if (!roomId || !content.trim()) {
        reject(new Error('Room ID and content are required'));
        return;
      }

      try {
        const messageData = {
          roomId: roomId,
          content: content.trim()
        };

        console.log('[WebSocketService] Sending message via WebSocket:', messageData);
        console.log('[WebSocketService] STOMP client connected state:', this.client.connected);

        this.client.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(messageData)
        });

        console.log('[WebSocketService] Message published to WebSocket destination: /app/chat.sendMessage');
        resolve();
      } catch (error) {
        console.error('[WebSocketService] Error sending message via WebSocket:', error);
        reject(error);
      }
    });
  }

  // 메시지 읽음 상태 처리 (WebSocket)
  public markMessageAsRead(messageId: string): void {
    if (this.client && this.client.connected) {
      console.log('[WebSocketService] Marking message as read:', messageId);
      this.client.publish({
        destination: '/app/chat.markAsRead',
        body: JSON.stringify({ messageId: messageId })
      });
    } else {
      console.error('[WebSocketService] Cannot mark message as read - not connected');
    }
  }

  // 채팅방의 모든 메시지 읽음 처리 (WebSocket)
  public markAllMessagesAsRead(roomId: string): void {
    if (this.client && this.client.connected) {
      console.log('[WebSocketService] Marking all messages as read for room:', roomId);
      this.client.publish({
        destination: '/app/chat.markAllAsRead',
        body: JSON.stringify({ roomId: roomId })
      });
    } else {
      console.error('[WebSocketService] Cannot mark all messages as read - not connected');
    }
  }

  public joinRoom(roomId: string) { // 이 메소드는 사용되지 않을 수 있음 (채팅방 메시지 구독으로 대체)
    if (this.client && this.client.connected) {
       this.client.publish({
        destination: '/app/chat.join', // 목적지 주소는 실제 백엔드 설정에 맞게
        body: JSON.stringify({ roomId, userId: this.currentUserId }),
      });
    } else {
      console.error('STOMP client is not connected. Cannot join room. Attempting to initialize.');
      this.initialize(this.currentUserId);
    }
  }

  public disconnect() {
    if (this.client) {
      console.log('[WebSocketService] Deactivating STOMP client...');
      
      // 재연결 타이머 정리
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // 방 구독 해지
      Object.keys(this.roomSubscriptions).forEach(roomId => {
        if (this.roomSubscriptions[roomId] && typeof this.roomSubscriptions[roomId].unsubscribe === 'function') {
            this.roomSubscriptions[roomId].unsubscribe();
        }
      });
      this.roomSubscriptions = {};
      this.pendingRoomSubscriptions = []; 

      // 전역 사용자 토픽 구독 해지
      this.unsubscribeFromGlobalUserTopics();

      if (this.client.active) {
        this.client.deactivate(); // STOMP 연결 해제
      }
      
      this.client = null;
      this.resetConnectionState();
      this.onConnectionStateChangeCallbacks.forEach(cb => cb(false));
      console.log('[WebSocketService] STOMP client deactivated.');
    }
  }

  public registerConnectionStateChangeCallback(callback: (isConnected: boolean) => void): () => void {
    this.onConnectionStateChangeCallbacks.push(callback);
    callback(this.isConnected); 
    return () => {
      this.onConnectionStateChangeCallbacks = this.onConnectionStateChangeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  public setCurrentUserId(userId: number | string | undefined) {
    if (this.currentUserId === userId) {
      console.log(`[WebSocketService] User ID ${userId} is already set. Skipping redundant operations.`);
      return;
    }
    
    const oldUserId = this.currentUserId;
    this.currentUserId = userId;
    console.log(`[WebSocketService] Current user ID changed from '${oldUserId || 'undefined'}' to '${userId || 'undefined'}'.`);

    // 연결된 상태에서 사용자가 변경되는 경우에만 구독 갱신
    if (this.isConnected && oldUserId !== userId) {
      console.log('[WebSocketService] WebSocket is connected and user ID changed. Re-evaluating global subscriptions.');
      this.unsubscribeFromGlobalUserTopics(); 
      if (userId) {
        this.subscribeToGlobalUserTopics();
      } else {
        console.log('[WebSocketService] User ID cleared, no global topics to subscribe to.');
      }
    } else if (!this.isConnected && userId && !this.isConnecting) {
      console.log('[WebSocketService] User ID set but not connected. Will subscribe upon connection.');
    }
  }

  // 🆕 WebSocket 연결 및 구독 상태 확인 (백엔드 개발자 가이드 반영)
  public checkConnectionAndSubscriptions() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 [WebSocket 상태 점검] - 백엔드 개발자 가이드 반영');
    console.log('═══════════════════════════════════════════════════════════');
    
    // 1. 기본 연결 상태
    console.log('1️⃣ 기본 연결 상태:');
    console.log(`   ├─ client 존재: ${!!this.client}`);
    console.log(`   ├─ connected: ${this.client?.connected || false}`);
    console.log(`   ├─ isConnected (내부 플래그): ${this.isConnected}`);
    console.log(`   └─ currentUserId: ${this.currentUserId || 'null'}`);
    
    // 2. 구독 상태
    console.log('\n2️⃣ 구독 상태:');
    console.log(`   ├─ 전체 구독 수: ${this.globalUserSubscriptions.length}`);
    console.log(`   ├─ 채팅방별 구독 수: ${this.roomSubscriptions.size}`);
    console.log(`   └─ 구독된 채팅방 IDs: [${Array.from(this.roomSubscriptions.keys()).join(', ')}]`);
    
    // 3. 각 구독 상세 정보
    console.log('\n3️⃣ 전역 구독 상세:');
    this.globalUserSubscriptions.forEach((sub, index) => {
      try {
        // STOMP 구독 객체의 실제 구조에 맞게 수정
        const subInfo = sub as any; // 타입 단언으로 접근
        console.log(`   ├─ [${index + 1}] ID: ${subInfo.id || 'unknown'}`);
        console.log(`   │   └─ Active: ${!!sub}`);
      } catch (e) {
        console.log(`   ├─ [${index + 1}] Error checking subscription: ${e}`);
      }
    });
    
    // 4. 백엔드 제안 구독 경로 테스트
    console.log('\n4️⃣ 백엔드 제안 경로 테스트:');
    const testPaths = [
      `/queue/chat-updates`,
      `/queue/system-notifications`, 
      `/queue/chat-notifications`,
      `/queue/match-notifications`,
      `/user/queue/chat-updates`,
      `/user/queue/system-notifications`,
      `/user/${this.currentUserId}/queue/chat-updates`,
      `/topic/user/${this.currentUserId}/notifications`
    ];
    
    testPaths.forEach((path, index) => {
      console.log(`   ├─ [${index + 1}] ${path}`);
    });
    
    // 5. 실제 STOMP 클라이언트 상태 (가능한 경우)
    console.log('\n5️⃣ STOMP 클라이언트 상태:');
    if (this.client) {
      try {
        console.log(`   ├─ State: ${(this.client as any).state || 'unknown'}`);
        console.log(`   ├─ URL: ${(this.client as any).ws?.url || 'unknown'}`);
        console.log(`   └─ Protocol: ${(this.client as any).ws?.protocol || 'unknown'}`);
      } catch (e) {
        console.log(`   └─ 상세 정보 확인 불가: ${e}`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
  }

  // 🆕 현재 상태 종합 디버그 (백엔드 가이드 연동)
  public debugCurrentState() {
    console.log('\n🚀 [상세 상태 디버그] - 백엔드 연동 확인');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Redux 상태 확인
    const state = store.getState();
    console.log('📊 Redux 상태:');
    console.log(`   ├─ 인증 상태: ${state.auth.isAuthenticated}`);
    console.log(`   ├─ 사용자: ${state.auth.user?.username || 'none'} (ID: ${state.auth.user?.id || 'none'})`);
    console.log(`   ├─ 연결 상태: ${state.notifications.connectionStatus.isOnline ? '🟢 온라인' : '🔴 오프라인'}`);
    console.log(`   ├─ 오프라인 알림 수: ${state.notifications.offlineNotifications.length}`);
    console.log(`   └─ 읽지 않은 오프라인 알림: ${state.notifications.unreadOfflineCount}`);
    
    // 세션 정보
    console.log('\n🔑 세션 정보:');
    const sessionId = localStorage.getItem('sessionId');
    console.log(`   ├─ Session ID: ${sessionId ? sessionId.substring(0, 8) + '...' : 'null'}`);
    console.log(`   └─ LocalStorage keys: [${Object.keys(localStorage).join(', ')}]`);
    
    // 채팅 상태
    console.log('\n💬 채팅 상태:');
    console.log(`   ├─ 전체 채팅방 수: ${state.chat.rooms.length}`);
    console.log(`   ├─ 읽지 않은 메시지: ${Object.keys(state.chat.unreadCount).length}개 방`);
    console.log(`   └─ 총 읽지 않은 수: ${Object.values(state.chat.unreadCount).reduce((sum: number, count: number) => sum + count, 0)}`);
    
    // 알림 상태 상세
    if (state.notifications.offlineNotifications.length > 0) {
      console.log('\n📢 오프라인 알림 상세:');
      state.notifications.offlineNotifications.slice(0, 3).forEach((notif, index) => {
        console.log(`   ├─ [${index + 1}] ${notif.type} (우선순위: ${notif.priority})`);
        console.log(`   │   ├─ 제목: ${notif.title}`);
        console.log(`   │   ├─ 읽음: ${notif.isRead ? '✅' : '❌'}`);
        console.log(`   │   └─ 시간: ${new Date(notif.createdAt).toLocaleTimeString()}`);
      });
      if (state.notifications.offlineNotifications.length > 3) {
        console.log(`   └─ ... 외 ${state.notifications.offlineNotifications.length - 3}개`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  // 🆕 백엔드 연결 테스트 메시지 전송
  public sendTestMessage(roomId?: string) {
    if (!this.client || !this.client.connected) {
      console.error('[WebSocketService] Cannot send test message - not connected');
      return false;
    }
    
    const testRoomId = roomId || 'test-room-123';
    const testMessage = {
      type: 'TEST_MESSAGE',
      roomId: testRoomId,
      content: `테스트 메시지 - ${new Date().toLocaleTimeString()}`,
      senderId: this.currentUserId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[WebSocketService] Sending test message to room ${testRoomId}:`, testMessage);
    
    try {
      this.send(`/app/chat/send`, testMessage);
      console.log('✅ [WebSocketService] Test message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ [WebSocketService] Error sending test message:', error);
      return false;
    }
  }

  // 🆕 모든 가능한 구독 재시도 (백엔드 개발자 가이드 반영)
  public retryAllSubscriptions() {
    console.log('[WebSocketService] 🔄 모든 구독 재시도 시작...');
    
    if (!this.client || !this.client.connected || !this.currentUserId) {
      console.error('[WebSocketService] 재시도 불가 - 연결되지 않음 또는 사용자 ID 없음');
      return;
    }
    
    // 기존 구독 정리
    this.unsubscribeFromGlobalUserTopics();
    
    // 새로운 구독 시도
    this.subscribeToGlobalUserTopics();
    
    console.log('[WebSocketService] ✅ 모든 구독 재시도 완료');
  }

  // 🆕 알림 권한 요청
  private requestNotificationPermission() {
    if ('Notification' in window) {
      console.log('[WebSocketService] Current notification permission:', Notification.permission);
      
      if (Notification.permission === 'default') {
        console.log('[WebSocketService] Requesting notification permission');
        Notification.requestPermission().then(permission => {
          console.log('[WebSocketService] Notification permission result:', permission);
          if (permission === 'granted') {
            console.log('[WebSocketService] Notification permission granted - notifications will work');
            this.showTestNotification();
          } else {
            console.log('[WebSocketService] Notification permission denied - will use in-app notifications only');
          }
        });
      } else if (Notification.permission === 'granted') {
        console.log('[WebSocketService] Notification permission already granted');
        this.showTestNotification();
      } else {
        console.log('[WebSocketService] Notification permission denied');
      }
    } else {
      console.log('[WebSocketService] Browser does not support notifications');
    }
  }

  // 🆕 테스트 알림 표시
  private showTestNotification() {
    if (Notification.permission === 'granted') {
      const notification = new Notification('WebSocket 연결됨', {
        body: '채팅 알림이 활성화되었습니다.',
        icon: '/favicon.ico',
        tag: 'websocket-test'
      });
      
      setTimeout(() => {
        notification.close();
      }, 3000);
    }
  }

  // 🆕 브라우저 알림 표시
  private showBrowserNotification(senderName: string, message: string, roomId: string) {
    if (Notification.permission === 'granted') {
      console.log('[WebSocketService] Showing browser notification');
      
      const notification = new Notification(`${senderName}님의 메시지`, {
        body: message,
        icon: '/favicon.ico',
        tag: roomId,
        badge: '/favicon.ico'
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        if (window.location.pathname !== `/chat/${roomId}`) {
          window.history.pushState({}, '', `/chat/${roomId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      };
      
      setTimeout(() => {
        notification.close();
      }, 5000);
      
    } else if (Notification.permission === 'default') {
      console.log('[WebSocketService] Requesting notification permission');
      
      Notification.requestPermission().then(permission => {
        console.log('[WebSocketService] Notification permission result:', permission);
        if (permission === 'granted') {
          this.showBrowserNotification(senderName, message, roomId);
        }
      });
    } else {
      console.log('[WebSocketService] Browser notifications denied');
    }
  }

  // 🆕 채팅방 입장 알림
  public enterRoom(roomId: string): void {
    if (this.client && this.client.connected) {
      console.log('[WebSocketService] Notifying server of room entry:', roomId);
      
      try {
        this.client.publish({
          destination: '/app/chat.enterRoom',
          body: JSON.stringify({ roomId: roomId })
        });
        console.log('[WebSocketService] Successfully sent enterRoom message to server');
        
        store.dispatch(updateUnreadCount({
          roomId: roomId,
          count: 0
        }));
        console.log('[WebSocketService] Reset unread count to 0 for room:', roomId);
        
      } catch (error) {
        console.error('[WebSocketService] Error sending enterRoom message:', error);
      }
    } else {
      console.warn('[WebSocketService] Cannot notify room entry - not connected');
    }
  }

  // 🆕 채팅방 퇴장 알림
  public leaveRoom(roomId: string): void {
    if (this.client && this.client.connected) {
      console.log('[WebSocketService] Notifying server of room exit:', roomId);
      
      try {
        this.client.publish({
          destination: '/app/chat.leaveRoom',
          body: JSON.stringify({ roomId: roomId })
        });
        console.log('[WebSocketService] Successfully sent leaveRoom message to server');
      } catch (error) {
        console.error('[WebSocketService] Error sending leaveRoom message:', error);
      }
    } else {
      console.warn('[WebSocketService] Cannot notify room exit - not connected');
    }
  }

  // 🆕 메시지 전송 (일반적인 용도)
  public send(destination: string, message: any): void {
    if (this.client && this.client.connected) {
      try {
        this.client.publish({
          destination: destination,
          body: JSON.stringify(message)
        });
        console.log(`[WebSocketService] Message sent to ${destination}:`, message);
      } catch (error) {
        console.error(`[WebSocketService] Error sending message to ${destination}:`, error);
      }
    } else {
      console.error('[WebSocketService] Cannot send message - not connected');
    }
  }

  // 🆕 클라이언트 준비 완료 신호 전송 메서드
  private signalClientReadyToServer(): void {
    if (this.client && this.client.connected && this.currentUserId) {
      const payload = JSON.stringify({ userId: String(this.currentUserId) });
      try {
        this.client.publish({
          destination: '/app/client/ready',
          body: payload
        });
        console.log(`[WebSocketService] Sent client ready signal to server for user: ${this.currentUserId}`);
      } catch (error) {
        console.error('[WebSocketService] Error sending client ready signal:', error);
      }
    } else {
      console.warn('[WebSocketService] Cannot send client ready signal. Client not connected or user ID not set.',
        {
          connected: this.client?.connected,
          userId: this.currentUserId
        }
      );
    }
  }
}

export const websocketService = new WebSocketService(); 