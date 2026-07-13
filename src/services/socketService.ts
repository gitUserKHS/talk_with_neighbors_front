import { io, Socket } from 'socket.io-client';
import { ChatMessageDto } from '../types/chat';
import { ChatRoom } from '../types/chat';
import { User } from '../types/user';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Array<(message: ChatMessageDto) => void> = [];
  private matchHandlers: Array<(user: User) => void> = [];
  private roomUpdateHandlers: Array<(room: ChatRoom) => void> = [];

  connect() {
    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    this.socket.on('message', (message: ChatMessageDto) => {
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.socket.on('match', (user: User) => {
      this.matchHandlers.forEach((handler) => handler(user));
    });

    this.socket.on('roomUpdate', (room: ChatRoom) => {
      this.roomUpdateHandlers.forEach((handler) => handler(room));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(roomId: string) {
    this.socket?.emit('joinRoom', roomId);
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leaveRoom', roomId);
  }

  sendMessage(message: ChatMessageDto) {
    this.socket?.emit('message', message);
  }

  startMatching() {
    this.socket?.emit('startMatching');
  }

  stopMatching() {
    this.socket?.emit('stopMatching');
  }

  onMessage(handler: (message: ChatMessageDto) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((item) => item !== handler);
    };
  }

  onMatch(handler: (user: User) => void) {
    this.matchHandlers.push(handler);
    return () => {
      this.matchHandlers = this.matchHandlers.filter((item) => item !== handler);
    };
  }

  onRoomUpdate(handler: (room: ChatRoom) => void) {
    this.roomUpdateHandlers.push(handler);
    return () => {
      this.roomUpdateHandlers = this.roomUpdateHandlers.filter((item) => item !== handler);
    };
  }
}

export const socketService = new SocketService();
