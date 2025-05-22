// WebSocket 서비스
// 실시간 통신을 위한 Socket.IO 클라이언트 관리
import { io, Socket } from 'socket.io-client';
import { ChatMessageDto } from '../types/chat';
import { ChatRoom } from '../types/chat';
import { User } from '../types/user';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

// WebSocket 서비스 클래스
class SocketService {
  // Socket.IO 인스턴스
  private socket: Socket | null = null;
  // 메시지 이벤트 핸들러 목록
  private messageHandlers: ((message: ChatMessageDto) => void)[] = [];
  // 매칭 이벤트 핸들러 목록
  private matchHandlers: ((user: User) => void)[] = [];
  // 채팅방 업데이트 핸들러 목록
  private roomUpdateHandlers: ((room: ChatRoom) => void)[] = [];

  // WebSocket 연결 설정
  connect() {
    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('소켓 연결됨');
    });

    this.socket.on('disconnect', () => {
      console.log('소켓 연결 끊김');
    });

    this.socket.on('error', (error) => {
      console.error('소켓 에러:', error);
    });

    this.setupEventListeners();
  }

  // 이벤트 리스너 설정
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('message', (message: ChatMessageDto) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('match', (user: User) => {
      this.matchHandlers.forEach(handler => handler(user));
    });

    this.socket.on('roomUpdate', (room: ChatRoom) => {
      this.roomUpdateHandlers.forEach(handler => handler(room));
    });
  }

  // WebSocket 연결 해제
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 채팅방 입장
  joinRoom(roomId: string) {
    this.socket?.emit('joinRoom', roomId);
  }

  // 채팅방 퇴장
  leaveRoom(roomId: string) {
    this.socket?.emit('leaveRoom', roomId);
  }

  // 메시지 전송
  sendMessage(message: ChatMessageDto) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', message);
    } else {
      console.error('Socket is not connected. Cannot send message.');
    }
  }

  // 매칭 시작
  startMatching() {
    this.socket?.emit('startMatching');
  }

  // 매칭 중지
  stopMatching() {
    this.socket?.emit('stopMatching');
  }

  // 메시지 이벤트 핸들러 등록
  onMessage(handler: (message: ChatMessageDto) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  // 매칭 이벤트 핸들러 등록
  onMatch(handler: (user: User) => void) {
    this.matchHandlers.push(handler);
    return () => {
      this.matchHandlers = this.matchHandlers.filter(h => h !== handler);
    };
  }

  // 채팅방 업데이트 핸들러 등록
  onRoomUpdate(handler: (room: ChatRoom) => void) {
    this.roomUpdateHandlers.push(handler);
    return () => {
      this.roomUpdateHandlers = this.roomUpdateHandlers.filter(h => h !== handler);
    };
  }
}

export const socketService = new SocketService(); 