import { Client, IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatMessageDto, WebSocketMessage, WebSocketResponse } from '../types/chat';
import { store } from '../store';
import { addMessage } from '../store/slices/chatSlice';

// 환경 변수에서 웹소켓 URL 가져오기
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8080';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: { [key: string]: any } = {};
  private pendingSubscriptions: Array<{ roomId: string; callback: (msg: WebSocketResponse) => void }> = [];
  private isConnecting = false;
  private isConnected = false;

  constructor() {
    // 생성자에서는 초기화하지 않고, 필요할 때 initialize() 메서드를 호출
  }

  public initialize() {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      console.log('Session ID not found, WebSocket will not be initialized.');
      return;
    }

    this.isConnecting = true;

    // SockJS 연결 URL에 sessionId 쿼리 파라미터 추가
    const connectUrl = `${SOCKET_URL}/ws?sessionId=${sessionId}`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(connectUrl),
      // STOMP CONNECT 헤더에서는 X-Session-Id 제거 (핸드셰이크 시 쿼리 파라미터로 전달)
      // connectHeaders: {
      //   'X-Session-Id': sessionId, 
      // },
      debug: function (str: string) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame: IFrame) => {
      console.log('WebSocket 연결됨', frame);
      this.isConnected = true;
      this.isConnecting = false;
      
      this.pendingSubscriptions.forEach(({ roomId, callback }) => {
        if (this.client) { // null 체크 추가
          const sub = this.client.subscribe(`/topic/chat/room/${roomId}`, (message) => {
            try {
              console.log(`[WebSocketService] Raw message received for room ${roomId} (onConnect subscription):`, message.body);
              const res: WebSocketResponse = JSON.parse(message.body);
              console.log(`[WebSocketService] Parsed message for room ${roomId} (onConnect subscription):`, res);
              callback(res);

              // 현재 사용자 ID 가져오기 (Redux 스토어 사용)
              // 실제 프로젝트의 auth 슬라이스 및 user 객체 구조에 맞게 아래 라인을 확인/수정해야 합니다.
              const currentUser = store.getState().auth.user;
              const currentUserId = currentUser?.id; // user.id가 number 타입이라고 가정

              // 서버에서 온 readByUsers Set (WebSocketResponse의 readByUsers는 number[] | undefined 로 가정)
              const resReadByUsersSet: Set<number> = new Set(res.readByUsers || []);

              const transformedMessage: ChatMessageDto = {
                id: res.id,
                chatRoomId: res.roomId,
                senderId: res.senderId, // senderId가 number 타입이라고 가정
                senderName: res.senderName,
                content: res.content,
                createdAt: res.createdAt,
                updatedAt: res.updatedAt || res.createdAt,
                // isRead 값 결정: 현재 사용자가 readByUsersSet에 포함되어 있는지 여부로 판단
                isRead: currentUserId !== undefined && resReadByUsersSet.has(currentUserId),
                type: res.type,
                // ChatMessageDto의 readByUsers는 number[] | undefined. 서버 값을 그대로 사용.
                readByUsers: res.readByUsers || [], 
              };
              
              console.log(`[WebSocketService] Dispatching addMessage for room ${roomId} (onConnect subscription, calculated isRead: ${transformedMessage.isRead}):`, transformedMessage);
              store.dispatch(addMessage(transformedMessage));
            } catch (e) {
              console.error('[WebSocketService] Error processing STOMP message (onConnect subscription):', e, message.body);
            }
          });
          this.subscriptions[roomId] = sub;
        }
      });
      this.pendingSubscriptions = [];
    };

    this.client.onStompError = (frame: IFrame) => {
      console.error('STOMP Error:', frame);
      this.isConnected = false;
      this.isConnecting = false;
      // 재연결 로직은 stompjs가 내부적으로 처리 (reconnectDelay)
    };

    this.client.onWebSocketClose = (event: CloseEvent) => {
      console.log('WebSocket 연결 끊김:', event);
      this.isConnected = false;
      this.isConnecting = false;
      // 여기서 stompClient.activate()를 다시 호출하면 수동 재연결 시도 가능하나,
      // stompjs의 자동 재연결 기능을 우선 활용합니다.
    };
    
    this.client.onWebSocketError = (event: Event) => {
      console.error('WebSocket 연결 오류 (onWebSocketError):', event);
      // isConnected, isConnecting 상태는 onWebSocketClose에서 처리될 수 있음
    };

    console.log(`Attempting to connect to WebSocket at: ${connectUrl}`);
    this.client.activate();
  }

  public subscribeToRoom(roomId: string, callback: (message: WebSocketResponse) => void) {
    if (!this.client || !this.isConnected) {
      console.log('STOMP client not connected, queuing subscription for room:', roomId);
      // 연결이 안 되어 있으면 pendingSubscriptions에 추가하고 initialize 호출 (연결 시도)
      if (!this.pendingSubscriptions.find(p => p.roomId === roomId)){
        this.pendingSubscriptions.push({ roomId, callback });
      }
      this.initialize(); // 연결 시도
      return;
    }
    
    // 이미 연결되어 있고, 해당 구독이 없다면 바로 구독
    if (this.client && this.client.connected && !this.subscriptions[roomId]) {
       console.log('STOMP client connected, subscribing to room:', roomId);
      const sub = this.client.subscribe(`/topic/chat/room/${roomId}`, (message) => {
        try {
          console.log(`[WebSocketService] Raw message received for room ${roomId} (direct subscription):`, message.body);
          const res: WebSocketResponse = JSON.parse(message.body);
          console.log(`[WebSocketService] Parsed message for room ${roomId} (direct subscription):`, res);
          callback(res);

          // 현재 사용자 ID 가져오기 (Redux 스토어 사용)
          // 실제 프로젝트의 auth 슬라이스 및 user 객체 구조에 맞게 아래 라인을 확인/수정해야 합니다.
          const currentUser = store.getState().auth.user;
          const currentUserId = currentUser?.id; // user.id가 number 타입이라고 가정

          // 서버에서 온 readByUsers Set (WebSocketResponse의 readByUsers는 number[] | undefined 로 가정)
          const resReadByUsersSet: Set<number> = new Set(res.readByUsers || []);

          const transformedMessage: ChatMessageDto = {
            id: res.id,
            chatRoomId: res.roomId,
            senderId: res.senderId, // senderId가 number 타입이라고 가정
            senderName: res.senderName,
            content: res.content,
            createdAt: res.createdAt,
            updatedAt: res.updatedAt || res.createdAt,
            // isRead 값 결정: 현재 사용자가 readByUsersSet에 포함되어 있는지 여부로 판단
            isRead: currentUserId !== undefined && resReadByUsersSet.has(currentUserId),
            type: res.type,
            // ChatMessageDto의 readByUsers는 number[] | undefined. 서버 값을 그대로 사용.
            readByUsers: res.readByUsers || [],
          };
          
          console.log(`[WebSocketService] Dispatching addMessage for room ${roomId} (direct subscription, calculated isRead: ${transformedMessage.isRead}):`, transformedMessage);
          store.dispatch(addMessage(transformedMessage));
        } catch (e) {
          console.error('[WebSocketService] Error processing STOMP message (direct subscription):', e, message.body);
        }
      });
      this.subscriptions[roomId] = sub;
      // 만약 pending에 있었다면 제거
      this.pendingSubscriptions = this.pendingSubscriptions.filter(p => p.roomId !== roomId);
    }
  }

  public unsubscribeFromRoom(roomId: string) {
    if (this.subscriptions[roomId]) {
      console.log('Unsubscribing from room:', roomId);
      this.subscriptions[roomId].unsubscribe();
      delete this.subscriptions[roomId];
    } else {
      // 아직 구독 전(pending 상태)일 수 있으므로 pending 목록에서도 제거
      this.pendingSubscriptions = this.pendingSubscriptions.filter(p => p.roomId !== roomId);
      console.log('Subscription for room not found or already removed (pending also cleared):', roomId);
    }
  }

  public sendMessage(message: WebSocketMessage): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message),
      });
    } else {
      console.error('STOMP client is not connected. Cannot send message. Attempting to initialize.');
      // 메시지 전송 실패 시 연결 재시도
      this.initialize();
      // 여기에 메시지를 임시 큐에 저장했다가 연결 후 재전송하는 로직을 추가할 수 있습니다.
    }
  }

  public joinRoom(roomId: string) {
    if (this.client && this.client.connected) {
       this.client.publish({
        destination: '/app/chat.join',
        body: JSON.stringify({ roomId }), // 서버에서 받을 DTO 형식에 맞춰야 함
      });
    } else {
      console.error('STOMP client is not connected. Cannot join room. Attempting to initialize.');
      this.initialize();
    }
  }

  public disconnect() {
    if (this.client) {
      console.log('Deactivating STOMP client...');
      // 모든 구독 해지
      Object.keys(this.subscriptions).forEach(roomId => {
        if (this.subscriptions[roomId] && typeof this.subscriptions[roomId].unsubscribe === 'function') {
            this.subscriptions[roomId].unsubscribe();
        }
      });
      this.subscriptions = {};
      this.pendingSubscriptions = []; 

      if (this.client.active) {
        this.client.deactivate();
      }
      this.client = null; // 클라이언트 참조 제거
      this.isConnected = false;
      this.isConnecting = false;
      console.log('STOMP client deactivated.');
    }
  }
}

export const websocketService = new WebSocketService(); 