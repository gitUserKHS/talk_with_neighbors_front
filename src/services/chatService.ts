import api from './api';
import { ChatRoom, Message, ChatMessageDto, MessageDto, MessageType, WebSocketResponse, CreateRoomRequest, ChatRoomType } from '../types/chat';
import { websocketService } from './websocketService';
import { store } from '../store';
import { setMessages, markMessagesAsRead } from '../store/slices/chatSlice';

export interface CreateChatRoomDto {
  title: string;
  maxMembers: number;
  category: string;
  description: string;
}

export interface UpdateChatRoomDto {
  title?: string;
  maxMembers?: number;
  category?: string;
  description?: string;
  status?: 'ACTIVE' | 'CLOSED';
}

interface ChatRoomSearchDto {
  keyword?: string;
  category?: string;
  page: number;
  size: number;
  sort?: string;
}

// Message를 ChatMessageDto로 변환하는 함수
const convertToChatMessageDto = (message: Message | WebSocketResponse): ChatMessageDto => {
  return {
    id: message.id,
    chatRoomId: 'chatRoomId' in message ? message.chatRoomId : message.roomId,
    content: message.content,
    senderId: typeof message.senderId === 'string' ? parseInt(message.senderId, 10) : message.senderId,
    senderName: message.senderName || '',
    isRead: 'isRead' in message ? message.isRead : false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || message.createdAt
  };
};

class ChatService {
  async createRoom(name: string, type: ChatRoomType, participantIds?: number[]): Promise<ChatRoom> {
    try {
      const response = await api.post<ChatRoom>('/chat/rooms', {
        name,
        type,
        participantIds
      }, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('채팅방 생성 중 오류 발생:', error);
      throw error;
    }
  }

  async updateRoom(roomId: number, updateDto: UpdateChatRoomDto): Promise<ChatRoom> {
    const response = await api.patch<ChatRoom>(`/chat/rooms/${roomId}`, updateDto);
    return response.data;
  }

  async deleteRoom(roomId: number): Promise<void> {
    await api.delete(`/chat/rooms/${roomId}`);
  }

  async getRoom(roomId: number): Promise<ChatRoom> {
    const response = await api.get<ChatRoom>(`/chat/rooms/${roomId}`);
    return response.data;
  }

  async searchRooms(searchDto: ChatRoomSearchDto): Promise<{
    content: ChatRoom[];
    totalPages: number;
  }> {
    const response = await api.get('/chat/rooms', { 
      params: {
        ...searchDto,
        page: searchDto.page || 0,
        size: searchDto.size || 10,
        sort: searchDto.sort || 'createdAt,desc'
      }
    });
    return {
      content: response.data.content || [],
      totalPages: response.data.totalPages || 0
    };
  }

  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/join`);
    websocketService.joinRoom(roomId);
  }

  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/leave`);
    websocketService.unsubscribeFromRoom(roomId);
  }

  async closeRoom(roomId: number): Promise<void> {
    await api.patch(`/chat/rooms/${roomId}`, {
      status: 'CLOSED'
    });
  }

  async getMyRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>('/chat/rooms/my');
    return response.data;
  }

  async getRooms(): Promise<ChatRoom[]> {
    const response = await api.get('/chat/rooms');
    return response.data;
  }

  async getMessages(roomId: string): Promise<ChatMessageDto[]> {
    try {
      const response = await api.get<Message[]>(`/chat/rooms/${roomId}/messages`);
      return response.data.map(convertToChatMessageDto);
    } catch (error) {
      console.error('메시지 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async markMessagesAsRead(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/messages/read`);
  }

  sendMessage(roomId: string, content: string, type: MessageType = 'TEXT'): void {
    const user = store.getState().auth.user;
    
    if (!user?.id) {
      console.error('사용자 ID를 찾을 수 없습니다.');
      return;
    }

    const message = {
      type,
      chatRoomId: roomId,
      content,
      senderId: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id,
      senderName: user.username || '',
    };
    websocketService.sendMessage(message);
  }
}

export const chatService = new ChatService();