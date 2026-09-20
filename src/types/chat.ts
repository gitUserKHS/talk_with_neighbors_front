import type { ChatSchedule } from './chatSchedule';

export type MessageType = 'ENTER' | 'LEAVE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM' | 'SCHEDULE';
// Signal frames share /user/queue/chat/room/{roomId} with messages but are never stored or rendered as one.
export type RoomSignalType = 'TYPING' | 'ROOM_READ';
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
  schedule?: ChatSchedule;
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
  schedule?: ChatSchedule;
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
  schedule?: ChatSchedule;
}

export interface WebSocketMessage {
  type: MessageType;
  chatRoomId: string;
  content: string;
  senderId: number;
  senderName: string;
  isRead?: boolean;
  schedule?: ChatSchedule;
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
  schedule?: ChatSchedule;
}

export interface TypingSignalFrame {
  type: 'TYPING';
  roomId: string;
  userId: number;
  senderName?: string;
  // Server-side expiry hint (ISO-8601 LocalDateTime). Clients keep their own local TTL.
  expiresAt?: string;
}

// Sent once per participant when another member marks the whole room as read
// (POST /messages/read or /app/chat.enterRoom). Replaces per-message read frames.
export interface RoomReadSignalFrame {
  type: 'ROOM_READ';
  roomId: string;
  readByUserId: number;
  // ISO-8601 LocalDateTime of the bulk read.
  readAt: string;
}

export type RoomSignalFrame = TypingSignalFrame | RoomReadSignalFrame;

// Everything that can arrive on /user/queue/chat/room/{roomId}.
export type RoomFrame = WebSocketResponse | RoomSignalFrame;

const ROOM_SIGNAL_TYPES: ReadonlySet<string> = new Set<RoomSignalType>(['TYPING', 'ROOM_READ']);

export const isRoomSignal = (frame: RoomFrame): frame is RoomSignalFrame => ROOM_SIGNAL_TYPES.has(frame.type);

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
