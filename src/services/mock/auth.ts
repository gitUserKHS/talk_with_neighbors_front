import { User } from '../../store/types';
import { currentUser } from './data';
import { socketService } from '../socketService';

interface LoginResponse {
  user: User;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

// 세션 모의를 위한 플래그
let isAuthenticated = false;

export const mockAuthService = {
  async login(data: LoginData): Promise<LoginResponse> {
    return new Promise((resolve) => {
      // 모의 비동기 처리 (지연 추가)
      setTimeout(() => {
        isAuthenticated = true;
        sessionStorage.setItem('isAuthenticated', 'true');
        socketService.connect();
        resolve({ user: currentUser });
      }, 500);
    });
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser: User = {
          id: '1',
          username: data.username,
          email: data.email,
          profileImage: 'https://via.placeholder.com/150',
        };
        isAuthenticated = true;
        sessionStorage.setItem('isAuthenticated', 'true');
        socketService.connect();
        resolve({ user: newUser });
      }, 500);
    });
  },

  async logout(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        isAuthenticated = false;
        sessionStorage.removeItem('isAuthenticated');
        socketService.disconnect();
        resolve();
      }, 500);
    });
  },

  async getCurrentUser(): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (isAuthenticated || sessionStorage.getItem('isAuthenticated') === 'true') {
          resolve(currentUser);
        } else {
          reject(new Error('인증되지 않았습니다.'));
        }
      }, 500);
    });
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedUser = { ...currentUser, ...data };
        resolve(updatedUser);
      }, 500);
    });
  },
}; 