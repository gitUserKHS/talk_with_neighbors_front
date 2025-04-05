import axios from 'axios';
import { api } from './api';
import { User } from '../store/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

interface DuplicateCheckResponse {
  emailExists: boolean;
  usernameExists: boolean;
}

interface IAuthService {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  getCurrentUser: () => Promise<User>;
  updateProfile: (user: Partial<User>) => Promise<User>;
  checkDuplicates: (email?: string, username?: string) => Promise<DuplicateCheckResponse>;
}

class AuthService implements IAuthService {
  private currentUser: User | null = null;

  constructor() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      api.defaults.headers.common['X-Session-Id'] = sessionId;
    }
  }

  private setSessionId(sessionId: string) {
    localStorage.setItem('sessionId', sessionId);
    api.defaults.headers.common['X-Session-Id'] = sessionId;
  }

  private clearSessionId() {
    localStorage.removeItem('sessionId');
    delete api.defaults.headers.common['X-Session-Id'];
  }

  async login(email: string, password: string): Promise<void> {
    const response = await api.post<{ user: User }>('/auth/login', { email, password });
    this.currentUser = response.data.user;
    this.setSessionId(response.headers['x-session-id']);
    this.dispatchAuthStateChanged();
  }

  async register(email: string, password: string, username: string): Promise<void> {
    const response = await api.post<{ user: User }>('/auth/register', { email, password, username });
    this.currentUser = response.data.user;
    this.setSessionId(response.headers['x-session-id']);
    this.dispatchAuthStateChanged();
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    } finally {
      this.currentUser = null;
      this.clearSessionId();
      this.dispatchAuthStateChanged();
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async getCurrentUser(): Promise<User> {
    if (this.currentUser) {
      return this.currentUser;
    }
    const response = await api.get<User>('/auth/me');
    this.currentUser = response.data;
    return response.data;
  }

  async updateProfile(user: Partial<User>): Promise<User> {
    const response = await api.put<User>('/auth/profile', user);
    this.currentUser = response.data;
    this.dispatchAuthStateChanged();
    return response.data;
  }

  async checkDuplicates(email?: string, username?: string): Promise<DuplicateCheckResponse> {
    const params: Record<string, string> = {};
    if (email) params.email = email;
    if (username) params.username = username;

    const response = await api.get<DuplicateCheckResponse>('/auth/check-duplicates', { params });
    return response.data;
  }

  private dispatchAuthStateChanged(): void {
    window.dispatchEvent(new Event('authStateChanged'));
  }
}

export const authService = new AuthService(); 