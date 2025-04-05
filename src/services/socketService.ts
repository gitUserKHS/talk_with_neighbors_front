import { io, Socket } from 'socket.io-client';
import { Message, ChatRoom, User } from '../store/types';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];
  private matchHandlers: ((user: User) => void)[] = [];
  private roomUpdateHandlers: ((room: ChatRoom) => void)[] = [];

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

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('message', (message: Message) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('match', (user: User) => {
      this.matchHandlers.forEach(handler => handler(user));
    });

    this.socket.on('roomUpdate', (room: ChatRoom) => {
      this.roomUpdateHandlers.forEach(handler => handler(room));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 채팅방 관련 메서드
  joinRoom(roomId: string) {
    this.socket?.emit('joinRoom', roomId);
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leaveRoom', roomId);
  }

  sendMessage(roomId: string, content: string) {
    this.socket?.emit('message', { roomId, content });
  }

  // 매칭 관련 메서드
  startMatching() {
    this.socket?.emit('startMatching');
  }

  stopMatching() {
    this.socket?.emit('stopMatching');
  }

  // 이벤트 핸들러 등록 메서드
  onMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onMatch(handler: (user: User) => void) {
    this.matchHandlers.push(handler);
    return () => {
      this.matchHandlers = this.matchHandlers.filter(h => h !== handler);
    };
  }

  onRoomUpdate(handler: (room: ChatRoom) => void) {
    this.roomUpdateHandlers.push(handler);
    return () => {
      this.roomUpdateHandlers = this.roomUpdateHandlers.filter(h => h !== handler);
    };
  }
}

export const socketService = new SocketService(); 