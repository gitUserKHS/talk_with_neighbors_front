import axios from 'axios';
import api from './api';
import { User } from '../store/types';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';

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

export interface IAuthService {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string, username: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  checkDuplicates(email?: string, username?: string): Promise<DuplicateCheckResponse>;
  isAuthenticated(): boolean;
}

class AuthService implements IAuthService {
  private currentUser: User | null = null;
  private sessionCheckPromise: Promise<User | null> | null = null;
  private isInitialized = false;
  private lastCheckTime = 0;
  private readonly CACHE_DURATION = 60000; // 1분 캐시

  constructor() {
    // 로컬 스토리지에서 사용자 정보 복원
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        store.dispatch(setUser(this.currentUser));
        this.isInitialized = true;
        this.lastCheckTime = Date.now();
      } catch (error) {
        console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
        localStorage.removeItem('user');
      }
    }
  }

  private async checkSession(): Promise<User | null> {
    // 이미 세션 체크가 진행 중이면 해당 Promise를 반환
    if (this.sessionCheckPromise) {
      return this.sessionCheckPromise;
    }

    this.sessionCheckPromise = (async () => {
      try {
        console.log('세션 체크 시작');
        const response = await api.get<LoginResponse>('/auth/me');
        console.log('세션 체크 응답:', response.data);
        
        if (response.data.user) {
          this.currentUser = response.data.user;
          // 로컬 스토리지에 사용자 정보 저장
          localStorage.setItem('user', JSON.stringify(this.currentUser));
          // Redux 상태 업데이트
          store.dispatch(setUser(this.currentUser));
          console.log('세션 유효함:', this.currentUser);
        } else {
          console.log('세션 응답에 사용자 정보 없음');
          this.currentUser = null;
          localStorage.removeItem('user');
          // Redux 상태 업데이트
          store.dispatch(setUser(null));
        }
      } catch (error) {
        console.error('세션 체크 중 오류 발생:', error);
        if (axios.isAxiosError(error)) {
          console.error('상세 에러 정보:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
        }
        this.currentUser = null;
        localStorage.removeItem('user');
        // Redux 상태 업데이트
        store.dispatch(setUser(null));
      } finally {
        this.sessionCheckPromise = null;
        this.isInitialized = true;
        this.lastCheckTime = Date.now();
      }
      
      return this.currentUser;
    })();

    return this.sessionCheckPromise;
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      
      // 응답 형식에 따라 user 객체 추출
      const userData = response.data.user || response.data;
      this.currentUser = userData;
      
      // 로컬 스토리지에 사용자 정보 저장
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      // Redux 상태 업데이트
      store.dispatch(setUser(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      throw error;
    }
  }

  async register(email: string, password: string, username: string): Promise<User> {
    try {
      const response = await api.post<LoginResponse>('/auth/register', { email, password, username });
      
      // 응답 형식에 따라 user 객체 추출
      const userData = response.data.user || response.data;
      this.currentUser = userData;
      
      // 로컬 스토리지에 사용자 정보 저장
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      // Redux 상태 업데이트
      store.dispatch(setUser(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // 로그아웃 요청 전에 현재 사용자 ID를 저장
      const userId = this.currentUser?.id;
      
      // 로그아웃 요청
      await api.post('/auth/logout', { userId });
      
      // 로컬 상태 초기화
      this.currentUser = null;
      localStorage.removeItem('user');
      store.dispatch(setUser(null));
      
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 에러가 발생하더라도 로컬 상태는 초기화
      this.currentUser = null;
      localStorage.removeItem('user');
      store.dispatch(setUser(null));
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    // 캐시가 유효한 경우 (1분 이내에 체크했고 currentUser가 있는 경우)
    const now = Date.now();
    if (this.isInitialized && this.currentUser && (now - this.lastCheckTime < this.CACHE_DURATION)) {
      console.log('캐시된 사용자 정보 반환:', this.currentUser);
      return this.currentUser;
    }
    
    // 로컬 스토리지에서 사용자 정보 복원
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        // Redux 상태 업데이트
        store.dispatch(setUser(this.currentUser));
        this.isInitialized = true;
        this.lastCheckTime = now;
        console.log('로컬 스토리지에서 사용자 정보 복원:', this.currentUser);
        return this.currentUser;
      } catch (error) {
        console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
        localStorage.removeItem('user');
      }
    }
    
    // 로컬 스토리지에도 없을 때만 세션 체크
    console.log('세션 체크 필요');
    return this.checkSession();
  }

  async checkDuplicates(email?: string, username?: string): Promise<DuplicateCheckResponse> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (username) params.append('username', username);

    const response = await api.get<DuplicateCheckResponse>(`/auth/check-duplicates?${params.toString()}`);
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

export const authService = new AuthService();