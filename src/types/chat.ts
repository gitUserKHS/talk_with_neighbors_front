import { User } from './user';

export type MessageType = 'ENTER' | 'LEAVE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM';
export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'FILE';

export interface ChatAttachment {
  url: string;
  thumbnailUrl?: string;
  type: ChatAttachmentType;
  contentType: string;
  originalName: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sortOrder: number;
}
export enum ChatRoomType {
  ONE_ON_ONE = 'ONE_ON_ONE',
  GROUP = 'GROUP'
}

export interface ChatRoom {
  id: string;
  roomName: string;
  type: ChatRoomType;
  status?: 'ACTIVE' | 'CLOSED';
  publicRoom?: boolean;
  description?: string;
  interestTags?: string[];
  location?: string;
  maxParticipants?: number;
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
  editedAt?: string;
  deletedAt?: string;
  isDeleted: boolean;
  readByUsers: number[];
  attachments?: ChatAttachment[];
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
  editedAt?: string;
  deletedAt?: string;
  type: MessageType;
  isDeleted?: boolean;
  readByUsers?: number[];
  attachments?: ChatAttachment[];
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  deletedAt?: string;
  type: MessageType;
  isDeleted: boolean;
  readByUsers: number[];
  attachments?: ChatAttachment[];
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
  editedAt?: string;
  deletedAt?: string;
  isRead: boolean;
  isDeleted?: boolean;
  readByUsers?: number[];
  attachments?: ChatAttachment[];
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
