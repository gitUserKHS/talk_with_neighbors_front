import api from './api';
import { ChatRoom, ChatRoomListResponse } from '../store/types';

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

class ChatService {
  async createRoom(createDto: CreateChatRoomDto): Promise<ChatRoom> {
    const response = await api.post<ChatRoom>('/chat/rooms', createDto);
    return response.data;
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

  async joinRoom(roomId: number): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/join`);
  }

  async leaveRoom(roomId: number): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/leave`);
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
}

export const chatService = new ChatService();