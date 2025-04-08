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
  async createRoom(name: string, type: ChatRoomType, participantIds?: number[], description?: string): Promise<ChatRoom> {
    try {
      const response = await api.post<ChatRoom>('/chat/rooms', {
        name,
        type,
        participantIds,
        description
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

  async getRoom(roomId: string): Promise<ChatRoom> {
    try {
      const response = await api.get<ChatRoom>(`/chat/rooms/${roomId}`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('채팅방 정보 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async searchRooms(searchDto: ChatRoomSearchDto): Promise<{
    content: ChatRoom[];
    totalPages: number;
  }> {
    try {
      const response = await api.get('/chat/rooms/search', { 
        params: {
          ...searchDto,
          page: searchDto.page || 0,
          size: searchDto.size || 10,
          sort: searchDto.sort || 'createdAt,desc'
        },
        withCredentials: true
      });
      return {
        content: response.data.content || [],
        totalPages: response.data.totalPages || 0
      };
    } catch (error) {
      console.error('채팅방 검색 중 오류 발생:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/join`, {}, {
        withCredentials: true
      });
      websocketService.joinRoom(roomId);
    } catch (error) {
      console.error('채팅방 입장 중 오류 발생:', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/leave`, {}, {
        withCredentials: true
      });
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
      const response = await api.get<ChatRoom[]>('/chat/rooms/my', {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('내 채팅방 목록 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async getRooms(): Promise<ChatRoom[]> {
    try {
      const response = await api.get<ChatRoom[]>('/chat/rooms', {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('채팅방 목록 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async getMessages(roomId: string): Promise<ChatMessageDto[]> {
    try {
      const response = await api.get<Message[]>(`/chat/rooms/${roomId}/messages`, {
        withCredentials: true
      });
      return response.data.map(convertToChatMessageDto);
    } catch (error) {
      console.error('메시지 로딩 중 오류 발생:', error);
      throw error;
    }
  }

  async markMessagesAsRead(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/messages/read`, {}, {
        withCredentials: true
      });
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