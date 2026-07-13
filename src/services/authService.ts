import api from './api';
import { User } from '../types/user';
import { websocketService } from './websocketService';
import type { AxiosProgressEvent } from 'axios';

interface LoginResponse {
  user?: User;
  id?: number;
  email?: string;
  username?: string;
}

interface DuplicateCheckResponse {
  emailExists: boolean;
  usernameExists: boolean;
}

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || storedUser === 'undefined' || storedUser === 'null') {
      return;
    }

    try {
      this.currentUser = JSON.parse(storedUser);
      if (this.currentUser?.id) {
        websocketService.setCurrentUserId(this.currentUser.id);
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      this.currentUser = null;
    }
  }

  getInitialUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return Boolean(this.currentUser && localStorage.getItem('sessionId'));
  }

  async login(email: string, password: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const sessionId = response.headers['x-session-id'];
    const user = this.extractUser(response.data);

    if (!sessionId || !user?.id) {
      throw new Error('로그인 응답이 올바르지 않습니다.');
    }

    localStorage.setItem('sessionId', sessionId);
    this.setCurrentUser(user);
    return user;
  }

  async register(email: string, password: string, username: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/register', { email, password, username });
    const sessionId = response.headers['x-session-id'];
    const user = this.extractUser(response.data);

    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    }

    if (user?.id) {
      this.setCurrentUser(user);
      return user;
    }

    return null;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still complete even if the server session is already gone.
    } finally {
      this.currentUser = null;
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      websocketService.setCurrentUserId(undefined);
      websocketService.disconnect();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      this.clearCurrentUser();
      return null;
    }

    try {
      const response = await api.get<LoginResponse>('/auth/me');
      const user = this.extractUser(response.data);

      if (user?.id) {
        this.setCurrentUser(user);
        return user;
      }
    } catch (error) {
      this.clearCurrentUser();
      throw error;
    }

    this.clearCurrentUser();
    return null;
  }

  async checkDuplicates(email?: string, username?: string): Promise<DuplicateCheckResponse> {
    const response = await api.get<DuplicateCheckResponse>('/auth/check-duplicates', {
      params: { email, username },
    });
    return response.data;
  }

  async updateProfile(profileData: Partial<User>): Promise<User | null> {
    const response = await api.put<User>('/auth/profile', profileData);
    this.setCurrentUser(response.data);
    return response.data;
  }

  async uploadProfileImage(
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<User>('/auth/profile/image', formData, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total && onProgress) {
          onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
        }
      },
    });
    this.setCurrentUser(response.data);
    return response.data;
  }

  async deleteProfileImage(): Promise<User> {
    const response = await api.delete<User>('/auth/profile/image');
    this.setCurrentUser(response.data);
    return response.data;
  }

  clearLocalSession(): void {
    this.clearCurrentUser();
  }

  private setCurrentUser(user: User): void {
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    websocketService.setCurrentUserId(user.id);
  }

  private clearCurrentUser(): void {
    this.currentUser = null;
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    websocketService.setCurrentUserId(undefined);
    websocketService.disconnect();
  }

  private extractUser(payload: LoginResponse): User | null {
    if (!payload) {
      return null;
    }

    if (payload.user) {
      return payload.user;
    }

    if (payload.id && payload.email && payload.username) {
      return payload as User;
    }

    return null;
  }
}

export const authService = new AuthService();
