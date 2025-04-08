import { Client, IFrame } from '@stomp/stompjs';
import { WebSocketMessage, WebSocketResponse } from '../types/chat';
import { store } from '../store';
import { addMessage } from '../store/slices/chatSlice';

// 환경 변수에서 웹소켓 URL 가져오기
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: { [key: string]: any } = {};
  private isInitialized = false;

  constructor() {
    // 생성자에서는 초기화하지 않고, 필요할 때 initialize() 메서드를 호출
  }

  public initialize() {
    // 이미 초기화되었거나 토큰이 없으면 초기화하지 않음
    if (this.isInitialized || !localStorage.getItem('token')) {
      return;
    }

    this.client = new Client({
      brokerURL: `ws://${SOCKET_URL.replace(/^http:\/\//, '')}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      debug: function (str: string) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('WebSocket 연결됨');
      this.isInitialized = true;
    };

    this.client.onStompError = (frame: IFrame) => {
      console.error('WebSocket 오류:', frame);
    };

    this.client.onWebSocketError = (event: Event) => {
      console.error('WebSocket 연결 오류:', event);
    };

    this.client.activate();
  }

  public subscribeToRoom(roomId: string, callback: (message: WebSocketResponse) => void) {
    // 초기화되지 않았으면 초기화 시도
    if (!this.isInitialized) {
      this.initialize();
    }

    // 클라이언트가 연결되지 않았으면 구독하지 않음
    if (!this.client?.connected) {
      console.error('WebSocket이 연결되지 않았습니다.');
      return;
    }

    const subscription = this.client.subscribe(`/topic/chat/room/${roomId}`, (message) => {
      const response: WebSocketResponse = JSON.parse(message.body);
      callback(response);
      
      // Redux 상태 업데이트
      store.dispatch(addMessage({
        id: response.id,
        chatRoomId: response.chatRoomId,
        senderId: response.senderId,
        senderName: response.senderName,
        content: response.content,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt || response.createdAt,
        isRead: response.isRead,
      }));
    });

    this.subscriptions[roomId] = subscription;
  }

  public unsubscribeFromRoom(roomId: string) {
    if (this.subscriptions[roomId]) {
      this.subscriptions[roomId].unsubscribe();
      delete this.subscriptions[roomId];
    }
  }

  public sendMessage(message: WebSocketMessage) {
    if (!this.client?.connected) {
      console.error('WebSocket이 연결되지 않았습니다.');
      return;
    }

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(message),
    });
  }

  public joinRoom(roomId: string) {
    if (!this.client?.connected) {
      console.error('WebSocket이 연결되지 않았습니다.');
      return;
    }

    this.client.publish({
      destination: '/app/chat.join',
      body: JSON.stringify({ roomId }),
    });
  }

  public disconnect() {
    if (this.client) {
      Object.values(this.subscriptions).forEach(subscription => subscription.unsubscribe());
      this.subscriptions = {};
      this.client.deactivate();
      this.client = null;
      this.isInitialized = false;
    }
  }
}

export const websocketService = new WebSocketService(); 