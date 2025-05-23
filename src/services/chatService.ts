import api from './api';
import { ChatRoom, Message, ChatMessageDto, MessageDto, MessageType, WebSocketResponse, CreateRoomRequest, ChatRoomType, WebSocketMessage } from '../types/chat';
import { websocketService } from './websocketService';
import { store } from '../store';
import { setMessages, markMessagesAsRead } from '../store/slices/chatSlice';
import axios, { AxiosError } from 'axios';
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
  const msg = message as any; // Helper to access potential dynamic properties
  return {
    id: message.id,
    chatRoomId: typeof msg.chatRoomId === 'string' ? msg.chatRoomId : msg.roomId,
    content: message.content,
    senderId: typeof message.senderId === 'string' ? parseInt(message.senderId, 10) : message.senderId,
    senderName: message.senderName || '',
    isRead: 'isRead' in message ? message.isRead : false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || message.createdAt,
    type: message.type
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
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        console.warn(`User may already be in room ${roomId} (received 409). Proceeding with WebSocket connection.`);
        websocketService.joinRoom(roomId);
      } else {
        throw error;
      }
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
      await api.post(`/chat/rooms/${roomId}/messages/read`);
    } catch (error) {
      console.error('메시지 읽음 처리 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 1:1 채팅룸 생성 또는 조회
   */
  async oneToOneRoom(otherUserId: number): Promise<ChatRoom> {
    const response = await api.post<ChatRoom>(`/chat/rooms/one-to-one/${otherUserId}`);
    return response.data;
  }

  /**
   * 랜덤 매칭 채팅룸 생성
   */
  // async randomMatchRoom(): Promise<ChatRoom> {
  //   const response = await api.post<ChatRoom>('/chat/rooms/random');
  //   return response.data;
  // }

  // 메시지 전송 (API 호출 + 소켓 전송)
  async sendMessage(message: ChatMessageDto): Promise<void> {
    try {
      // 1. API를 통해 메시지를 서버에 저장 (옵션) - 현재는 사용 안 함

      // 2. 소켓을 통해 메시지 전송
      // ChatMessageDto를 WebSocketMessage로 변환
      const webSocketMessage: WebSocketMessage = {
        type: message.type, // ChatMessageDto의 type은 필수임
        chatRoomId: message.chatRoomId,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        // isRead는 서버에서 처리하거나, 수신 시 결정되므로 전송 시에는 포함하지 않거나 false로 설정
        // isRead: message.isRead 
      };
      websocketService.sendMessage(webSocketMessage);

      // 3. Redux 스토어에 메시지 추가 (Optimistic Update) - 현재는 websocketService에서 수신 시 처리

    } catch (error) {
      console.error('메시지 전송 중 오류 발생:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();