import api from './api';
import { User } from '../types/user';
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
  async login(email: string, password: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const user = this.extractUser(response.data);

    if (!user?.id) {
      throw new Error('로그인 응답이 올바르지 않습니다.');
    }

    return user;
  }

  async register(email: string, password: string, username: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/register', { email, password, username });
    const user = this.extractUser(response.data);

    if (user?.id) {
      return user;
    }

    return null;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Redux still completes local logout if the server session already expired.
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const response = await api.get<LoginResponse>('/auth/me');
    const user = this.extractUser(response.data);

    if (user?.id) {
      return user;
    }

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
    return response.data;
  }

  async deleteProfileImage(): Promise<User> {
    const response = await api.delete<User>('/auth/profile/image');
    return response.data;
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
