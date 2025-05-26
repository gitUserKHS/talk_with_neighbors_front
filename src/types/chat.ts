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
  participantIds?: number[];
  lastMessage?: string;
  lastSenderName?: string;
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

export interface CreateRoomRequest {
  name: string;
  type: string;
  participantNicknames?: string[];
  description?: string;
}

// Pageable 인터페이스 (Spring Data JPA Pageable 객체 구조)
export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

// Page 인터페이스 (Spring Data JPA Page 객체 구조)
export interface Page<T> {
  content: T[];
  pageable: Pageable;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number; // 현재 페이지 번호 (0부터 시작)
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
} 