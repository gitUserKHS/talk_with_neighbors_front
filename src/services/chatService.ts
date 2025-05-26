import api from './api';
import { ChatRoom, Message, ChatMessageDto, MessageDto, MessageType, WebSocketResponse, CreateRoomRequest, ChatRoomType, WebSocketMessage, Page } from '../types/chat';
import { websocketService } from './websocketService';
import { store } from '../store';
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

  async searchRooms(keyword?: string, type?: string, page: number = 0, size: number = 10): Promise<Page<ChatRoom>> {
    try {
      const response = await api.get<Page<ChatRoom>>('/chat/rooms/search/all', {
        params: {
          keyword,
          type,
          page,
          size
        }
      });
      if (response.data && Array.isArray(response.data.content)) {
        return response.data;
      } else {
        console.warn('Search rooms API did not return a Page object:', response.data);
        return {
          content: [],
          pageable: { pageNumber: page, pageSize: size, sort: { empty: true, sorted: false, unsorted: true }, offset: page * size, paged: true, unpaged: false },
          totalPages: 0,
          totalElements: 0,
          last: true,
          size: 0,
          number: page,
          sort: { empty: true, sorted: false, unsorted: true },
          numberOfElements: 0,
          first: true,
          empty: true,
        };
      }
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

  async getRooms(page: number, size: number): Promise<Page<ChatRoom>> {
    try {
      console.log(`채팅방 목록 조회 시작 - 페이지: ${page}, 크기: ${size}`);
      const response = await api.get<Page<ChatRoom>>('/chat/rooms', {
        params: { page, size },
        timeout: 5000
      });
      
      if (response.data && Array.isArray(response.data.content) && typeof response.data.totalPages === 'number') {
        return response.data;
      } else {
        console.warn('서버에서 예상치 못한 형태의 채팅방 목록 응답을 받았습니다:', response.data);
        return {
          content: [],
          pageable: { pageNumber: page, pageSize: size, sort: { empty: true, sorted: false, unsorted: true }, offset: page * size, paged: true, unpaged: false },
          totalPages: 0,
          totalElements: 0,
          last: true,
          size: 0,
          number: page,
          sort: { empty: true, sorted: false, unsorted: true },
          numberOfElements: 0,
          first: true,
          empty: true,
        };
      }
    } catch (error) {
      console.error('채팅방 목록 조회 중 오류 발생:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('서버 응답 시간이 초과되었습니다.');
        }
        if (error.response?.status === 401) {
          throw new Error('로그인이 필요합니다.');
        }
      }
      throw new Error('채팅방 목록을 불러오는데 실패했습니다.');
    }
  }

  async getMessages(roomId: string, page: number, size: number): Promise<Page<ChatMessageDto>> {
    try {
      console.log(`메시지 목록 조회 시작 - 방 ID: ${roomId}, 페이지: ${page}, 크기: ${size}`);
      const response = await api.get<Page<Message>>(`/chat/rooms/${roomId}/messages`, {
        params: { page, size }, 
        timeout: 10000 
      });
      
      if (response.data && Array.isArray(response.data.content)) {
        const messagesDtoPage: Page<ChatMessageDto> = {
          ...response.data,
          content: response.data.content.map(convertToChatMessageDto)
        };
        return messagesDtoPage;
      } else {
        console.warn(`서버에서 예상치 못한 형태의 메시지 목록 응답 (방 ID: ${roomId}):`, response.data);
        return {
          content: [],
          pageable: { pageNumber: page, pageSize: size, sort: { empty: true, sorted: false, unsorted: true }, offset: page * size, paged: true, unpaged: false },
          totalPages: 0,
          totalElements: 0,
          last: true,
          size: 0,
          number: page,
          sort: { empty: true, sorted: false, unsorted: true },
          numberOfElements: 0,
          first: true,
          empty: true,
        };
      }
    } catch (error) {
      console.error(`메시지 목록 조회 중 오류 발생 (방 ID: ${roomId}):`, error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('서버 응답 시간이 초과되었습니다.');
        }
        if (error.response?.status === 401) {
          throw new Error('로그인이 필요합니다.');
        }
      }
      throw new Error('메시지 목록을 불러오는데 실패했습니다.');
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
    console.log('[chatService.ts] sendMessage called with:', message);
    if (!message.chatRoomId) {
      console.error('[chatService.ts] chatRoomId is missing in the message object', message);
      throw new Error('chatRoomId is required to send a message.');
    }
    try {
      // URL 경로에 message.chatRoomId를 포함하도록 수정
      // 요청 본문은 message 객체 전체를 보내는 것으로 유지 (백엔드가 @RequestBody ChatMessageDto로 받으므로)
      console.log(`[chatService.ts] Attempting to POST to /chat/rooms/${message.chatRoomId}/messages`);
      const response = await api.post<MessageDto>(`/chat/rooms/${message.chatRoomId}/messages`, message);
      console.log('[chatService.ts] sendMessage POST request successful, response:', response.data);
      // 필요하다면 response.data (MessageDto)를 반환하도록 함수의 반환 타입도 수정할 수 있습니다.
    } catch (error) {
      console.error('[chatService.ts] Error sending message via API:', error);
      if (axios.isAxiosError(error)) {
        console.error('[chatService.ts] Axios error details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  // 특정 채팅방의 읽지 않은 메시지 수 조회
  async getUnreadCount(roomId: string): Promise<number> {
    try {
      const response = await api.get<{ unreadCount: number }>(`/chat/rooms/${roomId}/unread-count`);
      return response.data.unreadCount;
    } catch (error) {
      console.error('읽지 않은 메시지 수 조회 중 오류 발생:', error);
      throw error;
    }
  }

  // 모든 채팅방의 읽지 않은 메시지 수 조회
  async getAllUnreadCounts(): Promise<{ [roomId: string]: number }> {
    try {
      const response = await api.get<{ unreadCounts: { [roomId: string]: number } }>('/chat/unread-counts');
      return response.data.unreadCounts;
    } catch (error) {
      console.error('모든 채팅방 읽지 않은 메시지 수 조회 중 오류 발생:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();