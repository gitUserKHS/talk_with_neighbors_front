import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ChatRoom, ChatMessageDto, Page, ChatRoomType } from '../../types/chat';
import { chatService } from '../../services/chatService';

// 개별 채팅방의 메시지 상태 구조 정의
export interface RoomMessagesState {
  data: ChatMessageDto[];
  currentPage: number;
  totalPages: number;
  hasMore: boolean; // 더 이전 메시지가 있는지 여부
  loading: boolean; // 이전 메시지 로딩 중 여부
  initialLoading: boolean; // 해당 방 메시지 초기 로딩 여부
  error: string | null; // 메시지 로딩 관련 에러
}

export interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: { [roomId: string]: RoomMessagesState };
  unreadCount: { [roomId: string]: number };
  currentPage: number;
  totalPages: number;
  totalElements: number;
  loadingRooms: boolean;
  hasMoreRooms: boolean;
  initialLoading: boolean;
  roomsError: string | null; // 일반 목록 로딩 에러 필드 추가

  // 검색 결과 페이지네이션 상태 (옵션 A)
  searchedRooms: ChatRoom[];
  searchKeyword: string | undefined;
  searchType: ChatRoomType | string | undefined; // string도 허용 (e.g. "")
  searchedCurrentPage: number;
  searchedTotalPages: number;
  searchedTotalElements: number;
  loadingSearchedRooms: boolean;
  hasMoreSearchedRooms: boolean;
  initialLoadingSearch: boolean; // 검색 초기 로딩
  searchError: string | null;
}

const initialRoomMessagesState: RoomMessagesState = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  hasMore: true,
  loading: false,
  initialLoading: true,
  error: null,
};

const initialState: ChatState = {
  rooms: [],
  currentRoom: null,
  messages: {},
  unreadCount: {},
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  loadingRooms: false,
  hasMoreRooms: true,
  initialLoading: true,
  roomsError: null, // roomsError 초기화

  // 검색 결과
  searchedRooms: [],
  searchKeyword: undefined,
  searchType: undefined,
  searchedCurrentPage: 0,
  searchedTotalPages: 0,
  searchedTotalElements: 0,
  loadingSearchedRooms: false,
  hasMoreSearchedRooms: true,
  initialLoadingSearch: true,
  searchError: null,
};

export const fetchChatRooms = createAsyncThunk<
  Page<ChatRoom>,
  { page: number; size: number },
  { rejectValue: string }
>(
  'chat/fetchChatRooms',
  async ({ page, size }, { rejectWithValue }) => {
    try {
      const data = await chatService.getRooms(page, size);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chat rooms');
    }
  }
);

// 검색된 채팅방 목록 가져오기 Thunk
export const fetchSearchedChatRooms = createAsyncThunk<
  Page<ChatRoom>,
  { keyword?: string; type?: string; page: number; size: number },
  { rejectValue: string }
>(
  'chat/fetchSearchedChatRooms',
  async ({ keyword, type, page, size }, { rejectWithValue, dispatch }) => {
    try {
      // 검색 시작 시 이전 검색 결과 초기화 (옵션)
      // dispatch(clearSearchedRooms()); // 필요하다면 clear 액션 호출
      const data = await chatService.searchRooms(keyword, type, page, size);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch searched chat rooms');
    }
  }
);

// 채팅방 메시지 가져오기 Thunk
export const fetchMessages = createAsyncThunk<
  { roomId: string; data: Page<ChatMessageDto> }, // 성공 시 반환 타입
  { roomId: string; page: number; size: number }, // Thunk에 전달되는 인자 타입
  { rejectValue: { roomId: string; message: string } } // 실패 시 반환 타입
>('chat/fetchMessages', async ({ roomId, page, size }, { rejectWithValue }) => {
  try {
    const data = await chatService.getMessages(roomId, page, size);
    return { roomId, data };
  } catch (error: any) {
    return rejectWithValue({ roomId, message: error.message || 'Failed to fetch messages' });
  }
});

// 모든 채팅방의 읽지 않은 메시지 수 조회 Thunk
export const fetchAllUnreadCounts = createAsyncThunk<
  { [roomId: string]: number },
  void,
  { rejectValue: string }
>(
  'chat/fetchAllUnreadCounts',
  async (_, { rejectWithValue }) => {
    try {
      const data = await chatService.getAllUnreadCounts();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread counts');
    }
  }
);

// 특정 채팅방의 읽지 않은 메시지 수 조회 Thunk
export const fetchUnreadCount = createAsyncThunk<
  { roomId: string; count: number },
  string,
  { rejectValue: string }
>(
  'chat/fetchUnreadCount',
  async (roomId, { rejectWithValue }) => {
    try {
      const count = await chatService.getUnreadCount(roomId);
      return { roomId, count };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread count');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearChatRooms: (state) => {
      state.rooms = [];
      state.currentPage = 0;
      state.totalPages = 0;
      state.totalElements = 0;
      state.hasMoreRooms = true;
      state.initialLoading = true;
      state.loadingRooms = false;
      state.roomsError = null;
    },
    clearSearchedRooms: (state) => {
      state.searchedRooms = [];
      state.searchedCurrentPage = 0;
      state.searchedTotalPages = 0;
      state.searchedTotalElements = 0;
      state.hasMoreSearchedRooms = true;
      state.initialLoadingSearch = true;
      state.loadingSearchedRooms = false;
      state.searchError = null;
      state.searchKeyword = undefined;
      state.searchType = undefined;
    },
    setSearchCriteria: (state, action: PayloadAction<{keyword?: string; type?: ChatRoomType | string}>) => {
      state.searchKeyword = action.payload.keyword;
      state.searchType = action.payload.type;
      state.searchedRooms = [];
      state.searchedCurrentPage = 0;
      state.searchedTotalPages = 0;
      state.searchedTotalElements = 0;
      state.hasMoreSearchedRooms = true;
      state.initialLoadingSearch = true; 
      state.loadingSearchedRooms = false; 
      state.searchError = null;
    },
    clearRoomsError: (state) => {
      state.roomsError = null;
    },
    clearSearchError: (state) => {
      state.searchError = null;
    },
    setCurrentRoom: (state, action: PayloadAction<ChatRoom | null>) => {
      console.log('[chatSlice] setCurrentRoom called with:', action.payload);
      const oldRoomId = state.currentRoom?.id;
      state.currentRoom = action.payload;

      if (action.payload) {
        const newRoomId = action.payload.id;
        // 이전 방과 다른 새로운 방으로 설정될 때, 이전 방의 unreadCount는 유지 (목록에 표시 위함)
        // 새로운 방의 메시지 상태를 항상 initialRoomMessagesState로 초기화
        console.log(`[chatSlice] Setting messages for new room ${newRoomId} to initial state.`);
        state.messages[newRoomId] = { ...initialRoomMessagesState }; 
        state.unreadCount[newRoomId] = state.unreadCount[newRoomId] || 0; // 기존 unread가 있으면 유지, 없으면 0
      } else {
        // 현재 방이 null로 설정되는 경우 (예: 채팅방 목록으로 돌아갈 때)
        // if (oldRoomId && state.messages[oldRoomId]) {
        //   // 필요하다면 여기서 이전 방의 상태를 초기화 할 수도 있지만,
        //   // ChatRoom 컴포넌트 unmount 시 또는 다른 방 진입 시 previousRoomIdRef 로직에서 이미 처리될 수 있음
        //   // 혹은 ChatRoomList에서 방을 나갈 때 명시적으로 clearRoomMessages(oldRoomId) 호출 고려
        //   console.log(`[chatSlice] Current room set to null. Previous room was ${oldRoomId}`);
        // }
      }
    },
    addMessage: (state, action: PayloadAction<{ message: ChatMessageDto; currentUserId?: number | string }>) => {
      const { message, currentUserId } = action.payload;
      const { chatRoomId, id: messageId, senderId } = message;

      let calculatedIsRead = message.isRead; // 기본값은 메시지에 있는 값 사용

      if (currentUserId !== undefined) {
        // 사용자가 메시지를 보낸 경우, 항상 읽음으로 처리
        if (String(senderId) === String(currentUserId)) {
            calculatedIsRead = true;
        } 
        // 사용자가 메시지를 받했고, readByUsers에 포함된 경우 (서버에서 이미 처리되었을 수 있지만, 클라이언트에서 추가 확인)
        else if (message.readByUsers && message.readByUsers.map(String).includes(String(currentUserId))) {
            calculatedIsRead = true;
        }
      } 
      const finalMessage = { ...message, isRead: calculatedIsRead };

      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = { ...initialRoomMessagesState, data: [finalMessage] };
      } else {
        // 중복 메시지 방지 (id 기준)
        if (!state.messages[chatRoomId].data.find(msg => msg.id === messageId)) {
          state.messages[chatRoomId].data.push(finalMessage);
        }
      }
      
      // unreadCount 업데이트 로직
      // 현재 보고 있는 채팅방이 아니거나, 현재 사용자가 보낸 메시지가 아니고, 최종적으로 읽지 않은 메시지일 때 카운트 증가
      if (state.currentRoom?.id !== chatRoomId && 
          String(senderId) !== String(currentUserId) && 
          !finalMessage.isRead) {
        const oldCount = state.unreadCount[chatRoomId] || 0;
        state.unreadCount[chatRoomId] = oldCount + 1;
      }
    },
    markMessagesAsReadInStore: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      if (state.messages[roomId]) {
        state.messages[roomId].data = state.messages[roomId].data.map(msg => ({ ...msg, isRead: true }));
        state.unreadCount[roomId] = 0;
      }
    },
    clearChat: (state) => {
      state.rooms = [];
      state.currentPage = 0;
      state.totalPages = 0;
      state.totalElements = 0;
      state.hasMoreRooms = true;
      state.initialLoading = true;
      state.loadingRooms = false;
      state.roomsError = null; 
      state.searchedRooms = [];
      state.searchKeyword = undefined;
      state.searchType = undefined;
      state.searchedCurrentPage = 0;
      state.searchedTotalPages = 0;
      state.searchedTotalElements = 0;
      state.loadingSearchedRooms = false;
      state.hasMoreSearchedRooms = true;
      state.initialLoadingSearch = true;
      state.searchError = null;
      state.currentRoom = null;
      state.messages = {};
      state.unreadCount = {};
    },
    clearRoomMessages: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      console.log('[chatSlice] clearRoomMessages called for room:', roomId);
      if (state.messages[roomId]) {
        state.messages[roomId] = { ...initialRoomMessagesState };
        console.log(`[chatSlice] Messages for room ${roomId} cleared.`);
      }
    },
    removeRoom: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      console.log('[chatSlice] removeRoom called for room:', roomId);
      
      // 일반 채팅방 목록에서 제거
      state.rooms = state.rooms.filter(room => room.id !== roomId);
      
      // 검색된 채팅방 목록에서도 제거
      state.searchedRooms = state.searchedRooms.filter(room => room.id !== roomId);
      
      // 현재 방이 삭제된 방이면 null로 설정
      if (state.currentRoom?.id === roomId) {
        state.currentRoom = null;
      }
      
      // 해당 방의 메시지와 읽지 않은 수 제거
      delete state.messages[roomId];
      delete state.unreadCount[roomId];
      
      console.log(`[chatSlice] Room ${roomId} removed from all states.`);
    },
    // 채팅방을 목록 맨 위로 이동 (새 메시지 받았을 때)
    moveChatRoomToTop: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      console.log(`[chatSlice] Moving room ${roomId} to top`);
      
      // 일반 채팅방 목록에서 해당 방을 찾아서 맨 위로 이동
      const roomIndex = state.rooms.findIndex(room => room.id === roomId);
      if (roomIndex > 0) { // 이미 맨 위에 있으면 이동하지 않음
        const [targetRoom] = state.rooms.splice(roomIndex, 1);
        state.rooms.unshift(targetRoom);
        console.log(`[chatSlice] Room ${roomId} moved to top in general list`);
      }
      
      // 검색된 채팅방 목록에서도 해당 방을 찾아서 맨 위로 이동
      const searchedRoomIndex = state.searchedRooms.findIndex(room => room.id === roomId);
      if (searchedRoomIndex > 0) { // 이미 맨 위에 있으면 이동하지 않음
        const [targetRoom] = state.searchedRooms.splice(searchedRoomIndex, 1);
        state.searchedRooms.unshift(targetRoom);
        console.log(`[chatSlice] Room ${roomId} moved to top in searched list`);
      }
    },
    // 읽지 않은 메시지 수 업데이트 (WebSocket을 통한 실시간 업데이트)
    updateUnreadCount: (state, action: PayloadAction<{ roomId: string; count: number }>) => {
      const { roomId, count } = action.payload;
      state.unreadCount[roomId] = count;
      console.log(`[chatSlice] Unread count updated for room ${roomId}: ${count}`);
    },
    // 메시지 읽음 상태 업데이트 (WebSocket을 통한 실시간 업데이트)
    updateMessageReadStatus: (state, action: PayloadAction<{ messageId: string; readByUserId: number | string; roomId: string }>) => {
      const { messageId, readByUserId, roomId } = action.payload;
      if (state.messages[roomId]) {
        const messageIndex = state.messages[roomId].data.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          const message = state.messages[roomId].data[messageIndex];
          if (!message.readByUsers) {
            message.readByUsers = [];
          }
          if (!message.readByUsers.map(String).includes(String(readByUserId))) {
            message.readByUsers.push(Number(readByUserId));
          }
          console.log(`[chatSlice] Message ${messageId} read status updated by user ${readByUserId}`);
        }
      }
    },
    // 채팅방 정보 업데이트 (새 메시지 알림용)
    updateRoomInfo: (state, action: PayloadAction<{ roomId: string; lastMessage?: string; senderName?: string; timestamp?: string }>) => {
      const { roomId, lastMessage, senderName, timestamp } = action.payload;
      
      // 일반 채팅방 목록에서 해당 방 찾기
      const roomIndex = state.rooms.findIndex(room => room.id === roomId);
      if (roomIndex !== -1) {
        if (lastMessage) state.rooms[roomIndex].lastMessage = lastMessage;
        if (senderName) state.rooms[roomIndex].lastSenderName = senderName;
        if (timestamp) state.rooms[roomIndex].lastMessageTime = timestamp;
        
        // 방을 목록 맨 위로 이동 (최신 메시지 순)
        const updatedRoom = state.rooms[roomIndex];
        state.rooms.splice(roomIndex, 1);
        state.rooms.unshift(updatedRoom);
      }
      
      // 검색된 채팅방 목록에서도 동일하게 처리
      const searchRoomIndex = state.searchedRooms.findIndex(room => room.id === roomId);
      if (searchRoomIndex !== -1) {
        if (lastMessage) state.searchedRooms[searchRoomIndex].lastMessage = lastMessage;
        if (senderName) state.searchedRooms[searchRoomIndex].lastSenderName = senderName;
        if (timestamp) state.searchedRooms[searchRoomIndex].lastMessageTime = timestamp;
        
        // 검색 결과에서도 맨 위로 이동
        const updatedSearchRoom = state.searchedRooms[searchRoomIndex];
        state.searchedRooms.splice(searchRoomIndex, 1);
        state.searchedRooms.unshift(updatedSearchRoom);
      }
      
      console.log(`[chatSlice] Room ${roomId} info updated with new message`);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatRooms.pending, (state) => {
        state.loadingRooms = true;
        state.roomsError = null; 
        if (state.currentPage === 0) {
          state.initialLoading = true;
        }
      })
      .addCase(fetchChatRooms.fulfilled, (state, action: PayloadAction<Page<ChatRoom>>) => {
        const { content, totalPages, totalElements, number, last } = action.payload;
        const newRooms = content.filter(newRoom => !state.rooms.some(existingRoom => existingRoom.id === newRoom.id));
        state.rooms = (number === 0 && state.initialLoading) ? newRooms : [...state.rooms, ...newRooms];
        state.totalPages = totalPages;
        state.totalElements = totalElements;
        state.currentPage = number;
        state.hasMoreRooms = !last;
        state.loadingRooms = false;
        state.initialLoading = false;
        state.roomsError = null;
        content.forEach(room => {
          if (room.id && typeof room.unreadCount === 'number') {
            state.unreadCount[room.id] = room.unreadCount;
          } else if (room.id && typeof state.unreadCount[room.id] === 'undefined') {
            state.unreadCount[room.id] = 0;
          }
        });
      })
      .addCase(fetchChatRooms.rejected, (state, action) => {
        state.loadingRooms = false;
        state.initialLoading = false;
        state.roomsError = action.payload || action.error.message || 'Failed to fetch chat rooms';
        console.error("Failed to fetch chat rooms:", state.roomsError);
      })
      .addCase(fetchSearchedChatRooms.pending, (state, action) => {
        state.loadingSearchedRooms = true;
        state.searchError = null; 
        if (action.meta.arg.page === 0) {
             state.initialLoadingSearch = true;
        }
        state.searchKeyword = action.meta.arg.keyword;
        state.searchType = action.meta.arg.type as ChatRoomType | undefined;
      })
      .addCase(fetchSearchedChatRooms.fulfilled, (state, action: PayloadAction<Page<ChatRoom>>) => {
        const { content, totalPages, totalElements, number, last } = action.payload;
        const newSearchedRooms = content.filter(newRoom => !state.searchedRooms.some(existingRoom => existingRoom.id === newRoom.id));
        state.searchedRooms = (number === 0 && state.initialLoadingSearch) ? newSearchedRooms : [...state.searchedRooms, ...newSearchedRooms];
        state.searchedTotalPages = totalPages;
        state.searchedTotalElements = totalElements;
        state.searchedCurrentPage = number;
        state.hasMoreSearchedRooms = !last;
        state.loadingSearchedRooms = false;
        state.initialLoadingSearch = false;
        state.searchError = null;
        content.forEach(room => {
          if (room.id && typeof room.unreadCount === 'number') {
            state.unreadCount[room.id] = room.unreadCount;
          } else if (room.id && typeof state.unreadCount[room.id] === 'undefined') {
            state.unreadCount[room.id] = 0;
          }
        });
      })
      .addCase(fetchSearchedChatRooms.rejected, (state, action) => {
        state.loadingSearchedRooms = false;
        state.initialLoadingSearch = false;
        state.searchError = action.payload || action.error.message || 'Failed to search chat rooms';
        console.error("Failed to fetch searched chat rooms:", state.searchError);
      })
      .addCase(fetchMessages.pending, (state, action) => {
        const { roomId } = action.meta.arg;
        if (!state.messages[roomId]) {
          state.messages[roomId] = { ...initialRoomMessagesState, loading: true, initialLoading: true, error: null }; 
        } else {
          state.messages[roomId].loading = true;
          state.messages[roomId].error = null; 
          if (action.meta.arg.page === 0) {
            state.messages[roomId].initialLoading = true;
          }
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action: PayloadAction<{ roomId: string; data: Page<ChatMessageDto> }>) => {
        const { roomId, data: pageData } = action.payload;
        const { content, totalPages, number, last } = pageData;

        if (!state.messages[roomId]) { 
          state.messages[roomId] = { ...initialRoomMessagesState };
        }

        const existingMessages = state.messages[roomId].data;
        const newMessages = content.filter(newMsg => !existingMessages.some(exMsg => exMsg.id === newMsg.id));

        state.messages[roomId].data = number === 0 ? newMessages.reverse() : [...newMessages.reverse(), ...existingMessages];
        state.messages[roomId].totalPages = totalPages;
        state.messages[roomId].currentPage = number;
        state.messages[roomId].hasMore = !last;
        state.messages[roomId].loading = false;
        state.messages[roomId].initialLoading = false;
        state.messages[roomId].error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const { roomId, message } = action.payload as { roomId: string; message: string }; 
        if (state.messages[roomId]) {
          state.messages[roomId].loading = false;
          state.messages[roomId].initialLoading = false;
          state.messages[roomId].error = message;
        }
        console.error(`Failed to fetch messages for room ${roomId}:`, message);
      })
      .addCase(fetchAllUnreadCounts.fulfilled, (state, action) => {
        const unreadCounts = action.payload;
        Object.keys(unreadCounts).forEach(roomId => {
          state.unreadCount[roomId] = unreadCounts[roomId];
        });
        console.log('[chatSlice] All unread counts updated:', unreadCounts);
      })
      .addCase(fetchAllUnreadCounts.rejected, (state, action) => {
        console.error('Failed to fetch all unread counts:', action.payload);
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        const { roomId, count } = action.payload;
        state.unreadCount[roomId] = count;
        console.log(`[chatSlice] Unread count for room ${roomId} updated to ${count}`);
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        console.error('Failed to fetch unread count:', action.payload);
      });
  },
});

export const {
  setCurrentRoom,
  addMessage,
  markMessagesAsReadInStore,
  clearChat,
  clearChatRooms,
  clearSearchedRooms,
  setSearchCriteria,
  clearRoomMessages,
  clearRoomsError,
  clearSearchError,
  removeRoom,
  moveChatRoomToTop,
  updateUnreadCount,
  updateMessageReadStatus,
  updateRoomInfo
} = chatSlice.actions;

export default chatSlice.reducer; 