export interface User {
  id: string;
  email: string;
  username: string;
  profileImage?: string;
  lastLogin?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MatchingPreferences {
  location: Location;
  maxDistance: number;
  ageRange: [number, number];
  gender?: string;
  interests?: string[];
}

export interface MatchProfile {
  id: string;
  username: string;
  age: number;
  gender: string;
  interests: string[];
  bio?: string;
  profileImage?: string;
  distance: number;
}

export interface RootState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
  };
  chat: {
    rooms: ChatRoom[];
    currentRoom: ChatRoom | null;
    loading: boolean;
    error: string | null;
  };
} 