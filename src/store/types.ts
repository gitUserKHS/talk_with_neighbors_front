import { ChatState } from '../types/chat';
import { User } from '../types/user';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
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
  chat: ChatState;
  auth: AuthState;
}