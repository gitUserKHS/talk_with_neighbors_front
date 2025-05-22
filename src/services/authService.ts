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
  updateProfile(profile: User): Promise<User>;
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
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        this.currentUser = JSON.parse(storedUser);
        store.dispatch(setUser(this.currentUser));
        this.isInitialized = true;
        this.lastCheckTime = Date.now();
      } catch (error) {
        console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
      }
    } else {
      // 유효하지 않은 값이 저장되어 있는 경우 제거
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
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
        
        // 세션 ID가 없으면 바로 null 반환
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
          console.log('세션 ID가 없습니다.');
          return null;
        }
        
        const response = await api.get<LoginResponse>('/auth/me', {
          withCredentials: true,
          headers: {
            'X-Session-Id': sessionId
          }
        });
        
        console.log('세션 체크 응답:', response.data);
        
        const userData = response.data.user || response.data;
        if (userData && userData.id) {
          this.currentUser = userData;
          // 로컬 스토리지에 사용자 정보 저장
          localStorage.setItem('user', JSON.stringify(this.currentUser));
          // Redux 상태 업데이트
          store.dispatch(setUser(this.currentUser));
          console.log('세션 유효함:', this.currentUser);
        } else {
          console.log('세션 응답에 사용자 정보 없음');
          this.currentUser = null;
          localStorage.removeItem('user');
          localStorage.removeItem('sessionId');
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
        localStorage.removeItem('sessionId');
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
      
      // X-Session-Id 헤더 확인
      const sessionId = response.headers['x-session-id'];
      if (!sessionId) {
        console.warn('로그인 응답에 X-Session-Id 헤더가 없습니다.');
        throw new Error('세션 ID가 설정되지 않았습니다. 로그인이 실패했습니다.');
      }
      
      // 세션 ID를 로컬 스토리지에 저장
      localStorage.setItem('sessionId', sessionId);
      console.log('세션 ID를 로컬 스토리지에 저장했습니다.');
      
      // 사용자 정보 저장
      const userData = response.data.user || response.data;
      this.currentUser = userData;
      console.log('사용자 정보 저장:', this.currentUser);
      
      if (!this.currentUser || !this.currentUser.id) {
        console.error('유효하지 않은 사용자 정보:', this.currentUser);
        throw new Error('유효하지 않은 사용자 정보가 반환되었습니다.');
      }
      
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      store.dispatch(setUser(this.currentUser));
      
      // 세션 체크 상태 초기화
      this.isInitialized = true;
      this.lastCheckTime = Date.now();
      this.sessionCheckPromise = null;
      
      console.log('로그인 성공:', this.currentUser);
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
      localStorage.removeItem('sessionId');
      store.dispatch(setUser(null));
      
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 에러가 발생하더라도 로컬 상태는 초기화
      this.currentUser = null;
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
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
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
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
        localStorage.removeItem('sessionId');
      }
    }
    
    // 세션 ID가 없으면 바로 null 반환
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      console.log('세션 ID가 없습니다.');
      this.currentUser = null;
      this.isInitialized = true;
      this.lastCheckTime = now;
      return null;
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

  // 프로필 업데이트 처리
  async updateProfile(profile: User): Promise<User> {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await api.put<User>('/auth/profile', profile, {
        headers: { 'X-Session-Id': sessionId || '' },
        withCredentials: true
      });
      const updatedUser = response.data;
      this.currentUser = updatedUser;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      store.dispatch(setUser(this.currentUser));
      return this.currentUser;
    } catch (error) {
      console.error('프로필 업데이트 중 오류 발생:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();