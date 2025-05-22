import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatRoom, ChatMessageDto } from '../../types/chat';

interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: { [roomId: string]: ChatMessageDto[] };
  unreadCount: { [roomId: string]: number };
}

const initialState: ChatState = {
  rooms: [],
  currentRoom: null,
  messages: {},
  unreadCount: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = action.payload;
      // 각 방의 unreadCount를 스토어에도 반영
      action.payload.forEach(room => {
        if (room.id && typeof room.unreadCount === 'number') {
          state.unreadCount[room.id] = room.unreadCount;
        } else if (room.id && typeof state.unreadCount[room.id] === 'undefined') {
          // API에서 unreadCount가 안 왔지만, 기존에 없던 방이면 0으로 초기화 (선택적)
          state.unreadCount[room.id] = 0; 
        }
      });
    },
    setCurrentRoom: (state, action: PayloadAction<ChatRoom | null>) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessageDto>) => {
      const { chatRoomId, senderId } = action.payload;
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
      }
      state.messages[chatRoomId].push(action.payload);
      
      console.log(`[chatSlice] Received message for room ${chatRoomId}. Sender: ${senderId}, isRead from payload: ${action.payload.isRead}`);
      
      if (!action.payload.isRead) {
        const oldCount = state.unreadCount[chatRoomId] || 0;
        state.unreadCount[chatRoomId] = oldCount + 1;
        console.log(`[chatSlice] Unread count for room ${chatRoomId} incremented from ${oldCount} to ${state.unreadCount[chatRoomId]}`);
      } else {
        console.log(`[chatSlice] Message for room ${chatRoomId} is already read or sender is current user. Unread count not changed: ${state.unreadCount[chatRoomId] || 0}`);
      }
    },
    setMessages: (state, action: PayloadAction<{ roomId: string; messages: ChatMessageDto[] }>) => {
      const { roomId, messages } = action.payload;
      state.messages[roomId] = messages;
      
      // 읽지 않은 메시지 카운트 계산
      state.unreadCount[roomId] = messages.filter(msg => !msg.isRead).length;
    },
    markMessagesAsRead: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      if (state.messages[roomId]) {
        state.messages[roomId] = state.messages[roomId].map(msg => ({
          ...msg,
          isRead: true,
        }));
        state.unreadCount[roomId] = 0;
      }
    },
    clearChat: (state) => {
      state.rooms = [];
      state.currentRoom = null;
      state.messages = {};
      state.unreadCount = {};
    },
  },
});

export const {
  setRooms,
  setCurrentRoom,
  addMessage,
  setMessages,
  markMessagesAsRead,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer; 