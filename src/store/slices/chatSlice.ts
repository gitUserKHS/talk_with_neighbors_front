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
    },
    setCurrentRoom: (state, action: PayloadAction<ChatRoom | null>) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessageDto>) => {
      const { chatRoomId } = action.payload;
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
      }
      state.messages[chatRoomId].push(action.payload);
      
      // 읽지 않은 메시지 카운트 증가
      if (!action.payload.isRead) {
        state.unreadCount[chatRoomId] = (state.unreadCount[chatRoomId] || 0) + 1;
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