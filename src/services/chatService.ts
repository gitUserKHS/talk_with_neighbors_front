import api from './api';
import { ChatRoom, Message, ChatMessageDto, MessageDto, MessageType, WebSocketResponse, CreateRoomRequest, ChatRoomType } from '../types/chat';
import { websocketService } from './websocketService';
import { store } from '../store';
import { setMessages, markMessagesAsRead } from '../store/slices/chatSlice';
import axios from 'axios';
import { setUser } from '../store/slices/authSlice';

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
  async createRoom(request: CreateRoomRequest): Promise<ChatRoom> {
    try {
      const response = await api.post<ChatRoom>('/chat/rooms', request);
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

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const response = await api.delete<{success: boolean, message: string}>(`/chat/rooms/${roomId}`);
      return response.data.success;
    } catch (error) {
      console.error('채팅방 삭제 중 오류 발생:', error);
      throw error;
    }
  }

  async getRoom(roomId: string): Promise<ChatRoom> {
    try {
      const response = await api.get<ChatRoom>(`/chat/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('채팅방 정보 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async searchRooms(keyword?: string, type?: string): Promise<ChatRoom[]> {
    try {
      const response = await api.get<ChatRoom[]>('/chat/rooms/search/all', {
        params: {
          keyword,
          type
        }
      });
      return response.data;
    } catch (error) {
      console.error('채팅방 검색 중 오류 발생:', error);
      throw error;
    }
  }

  async searchGroupRooms(keyword?: string): Promise<ChatRoom[]> {
    try {
      const response = await api.get<ChatRoom[]>('/chat/rooms/search', {
        params: {
          keyword
        }
      });
      return response.data;
    } catch (error) {
      console.error('그룹 채팅방 검색 중 오류 발생:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/join`, {});
      websocketService.joinRoom(roomId);
    } catch (error) {
      console.error('채팅방 입장 중 오류 발생:', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/leave`, {});
      websocketService.unsubscribeFromRoom(roomId);
    } catch (error) {
      console.error('채팅방 퇴장 중 오류 발생:', error);
      throw error;
    }
  }

  async closeRoom(roomId: number): Promise<void> {
    await api.patch(`/chat/rooms/${roomId}`, {
      status: 'CLOSED'
    });
  }

  async getMyRooms(): Promise<ChatRoom[]> {
    try {
      const response = await api.get<ChatRoom[]>('/chat/rooms/my');
      return response.data;
    } catch (error) {
      console.error('내 채팅방 목록 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async getRooms(): Promise<ChatRoom[]> {
    try {
      console.log('채팅방 목록 조회 시작');
      const response = await api.get<ChatRoom[]>('/chat/rooms', {
        timeout: 5000 // 5초 타임아웃 설정
      });
      
      if (!response.data) {
        console.warn('채팅방 목록이 비어있습니다.');
        return [];
      }
      
      return response.data;
    } catch (error) {
      console.error('채팅방 목록 조회 중 오류 발생:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('서버 응답 시간이 초과되었습니다.');
        }
        if (error.response?.status === 401) {
          throw new Error('로그인이 필요합니다.');
        }
        if (error.response?.status === 404) {
          return [];
        }
      }
      throw new Error('채팅방 목록을 불러오는데 실패했습니다.');
    }
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
    try {
      await api.post(`/chat/rooms/${roomId}/messages/read`, {});
    } catch (error) {
      console.error('메시지 읽음 처리 중 오류 발생:', error);
      throw error;
    }
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