import { api } from './api';
import { ChatRoom, Message } from '../store/types';

interface CreateRoomRequest {
  participants: string[];
}

export const chatService = {
  async getRooms(): Promise<ChatRoom[]> {
    const response = await api.get<ChatRoom[]>('/chat/rooms');
    return response.data;
  },

  async getRoom(roomId: string): Promise<ChatRoom> {
    const response = await api.get<ChatRoom>(`/chat/rooms/${roomId}`);
    return response.data;
  },

  async createRoom(participants: string[]): Promise<ChatRoom> {
    const response = await api.post<ChatRoom>('/chat/rooms', { participants });
    return response.data;
  },

  async getMessages(roomId: string): Promise<Message[]> {
    const response = await api.get<Message[]>(`/chat/rooms/${roomId}/messages`);
    return response.data;
  },

  async sendMessage(roomId: string, content: string): Promise<Message> {
    const response = await api.post<Message>(`/chat/rooms/${roomId}/messages`, { content });
    return response.data;
  },

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/chat/rooms/${roomId}`);
  },

  async leaveRoom(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/leave`);
  },
}; 