import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatRoom } from '../types';

interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  rooms: [],
  currentRoom: null,
  loading: false,
  error: null,
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
    addRoom: (state, action: PayloadAction<ChatRoom>) => {
      state.rooms.push(action.payload);
    },
    updateRoom: (state, action: PayloadAction<ChatRoom>) => {
      const index = state.rooms.findIndex(room => room.id === action.payload.id);
      if (index !== -1) {
        state.rooms[index] = action.payload;
      }
      if (state.currentRoom?.id === action.payload.id) {
        state.currentRoom = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setRooms, setCurrentRoom, addRoom, updateRoom, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer; 