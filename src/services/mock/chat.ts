import { ChatRoom, Message } from '../../store/types';
import { chatRooms, messages } from './data';
import { v4 as uuidv4 } from 'uuid';

// 깊은 복사를 위한 함수
const deepCopy = <T>(data: T): T => JSON.parse(JSON.stringify(data));

// 모의 데이터 상태
let mockChatRooms = deepCopy(chatRooms);
let mockMessages = deepCopy(messages);

interface CreateRoomData {
  participants: string[];
}

export const mockChatService = {
  async getRooms(): Promise<ChatRoom[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockChatRooms);
      }, 500);
    });
  },

  async getRoom(roomId: string): Promise<ChatRoom> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const room = mockChatRooms.find((r) => r.id === roomId);
        if (room) {
          resolve(room);
        } else {
          reject(new Error('채팅방을 찾을 수 없습니다.'));
        }
      }, 500);
    });
  },

  async createRoom(data: CreateRoomData): Promise<ChatRoom> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRoom: ChatRoom = {
          id: uuidv4(),
          participants: data.participants,
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
        };
        mockChatRooms.push(newRoom);
        mockMessages[newRoom.id] = [];
        resolve(newRoom);
      }, 500);
    });
  },

  async getMessages(roomId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const roomMessages = mockMessages[roomId];
        if (roomMessages) {
          resolve(roomMessages);
        } else {
          reject(new Error('메시지를 찾을 수 없습니다.'));
        }
      }, 500);
    });
  },

  async sendMessage(roomId: string, content: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const room = mockChatRooms.find((r) => r.id === roomId);
        if (!room) {
          reject(new Error('채팅방을 찾을 수 없습니다.'));
          return;
        }

        const newMessage: Message = {
          id: uuidv4(),
          roomId,
          senderId: '1', // 현재 사용자 ID
          content,
          createdAt: new Date().toISOString(),
        };

        if (!mockMessages[roomId]) {
          mockMessages[roomId] = [];
        }
        mockMessages[roomId].push(newMessage);

        // 채팅방 정보 업데이트
        room.lastMessage = content;
        room.lastMessageTime = newMessage.createdAt;

        resolve(newMessage);
      }, 500);
    });
  },

  async deleteRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const roomIndex = mockChatRooms.findIndex((r) => r.id === roomId);
        if (roomIndex === -1) {
          reject(new Error('채팅방을 찾을 수 없습니다.'));
          return;
        }

        mockChatRooms.splice(roomIndex, 1);
        delete mockMessages[roomId];
        resolve();
      }, 500);
    });
  },

  async leaveRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const room = mockChatRooms.find((r) => r.id === roomId);
        if (!room) {
          reject(new Error('채팅방을 찾을 수 없습니다.'));
          return;
        }

        // 현재 사용자를 참여자 목록에서 제거
        room.participants = room.participants.filter((id) => id !== '1');
        
        // 참여자가 없으면 채팅방 삭제
        if (room.participants.length === 0) {
          mockChatRooms = mockChatRooms.filter((r) => r.id !== roomId);
          delete mockMessages[roomId];
        }
        
        resolve();
      }, 500);
    });
  },
}; 