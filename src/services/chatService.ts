import { api } from './api';
import { ChatRoom } from '../store/types';

export interface CreateChatRoomDto {
  title: string;
  maxMembers: number;
  category: string;
  description: string;
}

interface ChatRoomSearchDto {
  keyword?: string;
  category?: string;
  page: number;
  size: number;
}

class ChatService {
  async createRoom(createDto: CreateChatRoomDto): Promise<ChatRoom> {
    const response = await api.post<ChatRoom>('/chat/rooms', createDto);
    return response.data;
  }

  async searchRooms(searchDto: ChatRoomSearchDto): Promise<{
    content: ChatRoom[];
    totalElements: number;
    totalPages: number;
  }> {
    const response = await api.get('/chat/rooms/search', { params: searchDto });
    return response.data;
  }

  async joinRoom(roomId: number): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/join`);
  }

  async leaveRoom(roomId: number): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/leave`);
  }

  async getMyRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>('/chat/rooms/my');
    return response.data;
  }
}

export const chatService = new ChatService();