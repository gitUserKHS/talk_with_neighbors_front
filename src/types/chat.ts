import { User } from './user';

export type MessageType = 'ENTER' | 'LEAVE' | 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export enum ChatRoomType {
  ONE_ON_ONE = 'ONE_ON_ONE',
  GROUP = 'GROUP'
}

export interface ChatRoom {
  id: string;
  roomName: string;
  type: ChatRoomType;
  creatorId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
  participantCount?: number;
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
  type: MessageType;
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
  roomId: string;
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
  type: string;
  participantIds?: number[];
  description?: string;
} 