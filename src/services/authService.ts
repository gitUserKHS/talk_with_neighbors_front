import axios from 'axios';
import api from './api';
import { User } from '../types/user';
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

// 인증 서비스
// 로그인, 회원가입, 세션 관리 등을 처리
class AuthService implements IAuthService {
  // 현재 로그인한 사용자 정보
  private currentUser: User | null = null;
  // 세션 체크 Promise 캐시
  private sessionCheckPromise: Promise<User | null> | null = null;
  // 초기화 상태
  private isInitialized = false;
  // 마지막 체크 시간
  private lastCheckTime = 0;
  // 캐시 유효 시간 (1분)
  private readonly CACHE_DURATION = 60000;

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

  // 세션 유효성 검사
  private async checkSession(): Promise<User | null> {
    // 이미 세션 체크가 진행 중이면 해당 Promise를 반환
    if (this.sessionCheckPromise) {
      return this.sessionCheckPromise;
    }

    this.sessionCheckPromise = (async () => {
      try {
        console.log('세션 체크 시작');
        const response = await api.get<LoginResponse>('/auth/me', {
          withCredentials: true
        });
        console.log('세션 체크 응답:', response.data);
        
        // 세션 쿠키 확인
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('JSESSIONID='));
        if (!sessionCookie) {
          console.warn('세션 체크 후에도 세션 쿠키가 없습니다.');
        } else {
          console.log('세션 쿠키 확인됨');
        }
        
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

  // 로그인 처리
  async login(email: string, password: string): Promise<User> {
    try {
      console.log('로그인 시도:', { email });
      
      // 로그인 전 쿠키 상태 확인
      console.log('로그인 전 쿠키:', document.cookie);
      
      const response = await api.post<LoginResponse>('/auth/login', { email, password }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      console.log('로그인 응답:', response.data);
      console.log('응답 헤더:', response.headers);
      
      // 세션 쿠키 확인 (약간의 지연을 주어 쿠키가 설정될 시간을 줌)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('JSESSIONID='));
      
      if (!sessionCookie) {
        console.warn('로그인 후에도 세션 쿠키가 없습니다. CORS 설정을 확인해주세요.');
        console.log('현재 쿠키:', document.cookie);
        
        // 쿠키가 없으면 로그아웃 API 호출
        try {
          await this.logout();
        } catch (logoutError) {
          console.error('로그아웃 중 오류 발생:', logoutError);
        }
        
        // 로컬 상태 초기화
        this.currentUser = null;
        localStorage.removeItem('user');
        store.dispatch(setUser(null));
        throw new Error('세션 쿠키가 설정되지 않았습니다. 로그인이 실패했습니다.');
      }
      
      console.log('세션 쿠키가 성공적으로 설정됨:', sessionCookie);
      
      // 사용자 정보 저장
      this.currentUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      store.dispatch(setUser(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      throw error;
    }
  }

  // 회원가입 처리
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

  // 로그아웃 처리
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

  // 현재 사용자 정보 조회
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