import { User } from './user';

export type MessageType = 'ENTER' | 'LEAVE' | 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export enum ChatRoomType {
  ONE_ON_ONE = 'ONE_ON_ONE',
  GROUP = 'GROUP'
}

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  creator: number;
  participants: User[];
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  type: MessageType;
  createdAt: string;
  updatedAt?: string;
  isDeleted: boolean;
  readByUsers: number[];
}

export interface ChatMessageDto {
  id: string;
  chatRoomId: string;
  content: string;
  senderId: number;
  senderName: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  type?: MessageType;
  isDeleted?: boolean;
  readByUsers?: number[];
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  type: MessageType;
  isDeleted: boolean;
  readByUsers: number[];
}

export interface WebSocketMessage {
  type: MessageType;
  chatRoomId: string;
  content: string;
  senderId: number;
  senderName: string;
  isRead?: boolean;
}

export interface WebSocketResponse {
  id: string;
  type: MessageType;
  chatRoomId: string;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isRead: boolean;
  isDeleted?: boolean;
  readByUsers?: number[];
}

export interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: { [roomId: string]: ChatMessageDto[] };
  unreadCount: { [roomId: string]: number };
  loading: boolean;
  error: string | null;
}

export interface CreateRoomRequest {
  name: string;
  type: ChatRoomType;
  participantIds?: number[];
  description?: string;
} 