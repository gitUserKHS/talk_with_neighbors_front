import { describe, expect, it, vi } from 'vitest';

// 리듀서와 셀렉터만 검증한다. chatService는 axios, 웹소켓, 스토어까지 끌고 오므로 비워 둔다.
vi.mock('../../services/chatService', () => ({ chatService: {} }));

import reducer, {
  clearChat,
  fetchChatRooms,
  markMessagesAsReadInStore,
  moveChatRoomToTop,
  removeRoom,
  selectTotalChatUnread,
  setCurrentRoom,
  updateUnreadCount,
} from './chatSlice';
import { ChatRoom, ChatRoomType, Page } from '../../types/chat';
import type { RootState } from '../types';

const room = (id: string, unreadCount = 0): ChatRoom => ({
  id,
  roomName: `방 ${id}`,
  type: ChatRoomType.ONE_ON_ONE,
  creatorId: '1',
  unreadCount,
});

const page = (content: ChatRoom[]): Page<ChatRoom> => ({
  content,
  pageable: {
    pageNumber: 0,
    pageSize: 30,
    sort: { empty: true, sorted: false, unsorted: true },
    offset: 0,
    paged: true,
    unpaged: false,
  },
  totalPages: 1,
  totalElements: content.length,
  last: true,
  size: 30,
  number: 0,
  sort: { empty: true, sorted: false, unsorted: true },
  numberOfElements: content.length,
  first: true,
  empty: content.length === 0,
});

const loadRooms = (content: ChatRoom[]) =>
  reducer(
    reducer(undefined, { type: '@@init' }),
    fetchChatRooms.fulfilled(page(content), 'request-1', { page: 0, size: 30 }),
  );

const roomIds = (state: ReturnType<typeof reducer>) => state.rooms.map((item) => item.id);

const totalUnread = (state: ReturnType<typeof reducer>) =>
  selectTotalChatUnread({ chat: state } as RootState);

describe('chatSlice', () => {
  it('stores unread counts pushed over the socket and sums them for the nav badge', () => {
    let state = reducer(undefined, { type: '@@init' });
    expect(totalUnread(state)).toBe(0);

    state = reducer(state, updateUnreadCount({ roomId: 'room-1', count: 2 }));
    state = reducer(state, updateUnreadCount({ roomId: 'room-2', count: 3 }));

    expect(state.unreadCount).toEqual({ 'room-1': 2, 'room-2': 3 });
    expect(totalUnread(state)).toBe(5);

    state = reducer(state, updateUnreadCount({ roomId: 'room-1', count: 0 }));

    expect(totalUnread(state)).toBe(3);
  });

  it('seeds unread counts from the room list and clears the badge when a room is opened', () => {
    let state = loadRooms([room('room-1', 4), room('room-2')]);

    expect(state.unreadCount).toEqual({ 'room-1': 4, 'room-2': 0 });
    expect(totalUnread(state)).toBe(4);

    // 메시지를 아직 불러오지 않은 방이라도 목록에서 열면 배지가 바로 내려가야 한다.
    state = reducer(state, markMessagesAsReadInStore('room-1'));

    expect(state.unreadCount['room-1']).toBe(0);
    expect(totalUnread(state)).toBe(0);
  });

  it('keeps the full list when page 0 is fetched again over an already loaded store', () => {
    let state = loadRooms([room('room-1'), room('room-2')]);
    expect(roomIds(state)).toEqual(['room-1', 'room-2']);

    // 내비바가 먼저 채운 뒤 ChatRoomList가 다시 0페이지를 요청하는 경우
    state = reducer(state, fetchChatRooms.pending('request-2', { page: 0, size: 30 }));
    expect(state.initialLoading).toBe(false);
    state = reducer(state, fetchChatRooms.fulfilled(page([room('room-1'), room('room-2')]), 'request-2', { page: 0, size: 30 }));

    expect(roomIds(state)).toEqual(['room-1', 'room-2']);
    expect(state.loadingRooms).toBe(false);
  });

  it("replaces the previous account's rooms and unread counts after clearChat", () => {
    let state = loadRooms([room('shared', 2), room('old-only', 3)]);
    expect(totalUnread(state)).toBe(5);

    state = reducer(state, clearChat());
    expect(roomIds(state)).toEqual([]);
    expect(totalUnread(state)).toBe(0);

    state = reducer(state, fetchChatRooms.fulfilled(page([room('shared', 1), room('new-only')]), 'request-2', { page: 0, size: 30 }));

    expect(roomIds(state)).toEqual(['shared', 'new-only']);
    expect(state.unreadCount).toEqual({ shared: 1, 'new-only': 0 });
    expect(totalUnread(state)).toBe(1);
  });

  it('moves the room that received a message to the top of the list', () => {
    let state = loadRooms([room('room-1'), room('room-2'), room('room-3')]);

    state = reducer(state, moveChatRoomToTop('room-3'));
    expect(roomIds(state)).toEqual(['room-3', 'room-1', 'room-2']);

    state = reducer(state, moveChatRoomToTop('room-3'));
    expect(roomIds(state)).toEqual(['room-3', 'room-1', 'room-2']);

    state = reducer(state, moveChatRoomToTop('missing'));
    expect(roomIds(state)).toEqual(['room-3', 'room-1', 'room-2']);
  });

  it('removes a deleted room together with its unread count', () => {
    let state = loadRooms([room('room-1', 1), room('room-2', 5), room('room-3')]);
    state = reducer(state, setCurrentRoom(state.rooms[1]));

    state = reducer(state, removeRoom('room-2'));

    expect(roomIds(state)).toEqual(['room-1', 'room-3']);
    expect(state.unreadCount).toEqual({ 'room-1': 1, 'room-3': 0 });
    expect(state.currentRoom).toBeNull();
    expect(totalUnread(state)).toBe(1);
  });
});
