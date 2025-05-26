import axios from 'axios';
import api from './api';
import { User } from '../types/user';
import { setUser } from '../store/slices/authSlice';
import { websocketService } from './websocketService';

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
  login(email: string, password: string): Promise<User | null>;
  register(email: string, password: string, username: string): Promise<User | null>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  checkDuplicates(email?: string, username?: string): Promise<DuplicateCheckResponse>;
  isAuthenticated(): boolean;
  updateProfile(profileData: Partial<User>): Promise<User | null>;
  getInitialUser(): User | null;
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
        this.isInitialized = true;
        this.lastCheckTime = Date.now();
        // 생성자 시점에서 websocketService에 userId를 설정할 수 있지만,
        // websocketService.initialize() 호출 시점에 userId를 전달하는 것이 더 적절할 수 있음.
        // 또는 여기서 websocketService.setCurrentUserId(this.currentUser?.id);
      } catch (error) {
        console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
        this.currentUser = null;
      }
    } else {
      // 유효하지 않은 값이 저장되어 있는 경우 제거
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      this.currentUser = null;
    }
  }

  public getInitialUser(): User | null {
    // 초기 사용자 정보 로드 시 websocketService에도 알려줌 (최초 1회)
    // 이 시점에는 websocketService 인스턴스가 생성되어 있어야 함.
    // if (this.currentUser) {
    //   websocketService.setCurrentUserId(this.currentUser.id);
    // } // App.tsx AuthInitializer에서 처리하는 것이 순서상 더 안전할 수 있음
    return this.currentUser;
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
          this.currentUser = null;
          localStorage.removeItem('user');
          localStorage.removeItem('sessionId');
          websocketService.setCurrentUserId(undefined);
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
          websocketService.setCurrentUserId(this.currentUser.id);
          console.log('세션 유효함:', this.currentUser);
        } else {
          console.log('세션 응답에 사용자 정보 없음');
          this.currentUser = null;
          localStorage.removeItem('user');
          localStorage.removeItem('sessionId');
          websocketService.setCurrentUserId(undefined);
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
        websocketService.setCurrentUserId(undefined);
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
  async login(email: string, password: string): Promise<User | null> {
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
        this.currentUser = null;
        websocketService.setCurrentUserId(undefined);
        throw new Error('유효하지 않은 사용자 정보가 반환되었습니다.');
      }
      
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      websocketService.setCurrentUserId(this.currentUser.id);
      
      // 세션 체크 상태 초기화
      this.isInitialized = true;
      this.lastCheckTime = Date.now();
      this.sessionCheckPromise = null;
      
      console.log('로그인 성공:', this.currentUser);
      return this.currentUser;
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
      this.currentUser = null;
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      websocketService.setCurrentUserId(undefined);
      throw error;
    }
  }

  // 회원가입 처리
  async register(email: string, password: string, username: string): Promise<User | null> {
    try {
      const response = await api.post<LoginResponse>('/auth/register', { email, password, username });
      
      // 응답 형식에 따라 user 객체 추출
      const userData = response.data.user || response.data;
      this.currentUser = userData;
      
      // 로컬 스토리지에 사용자 정보 저장
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      
      if (!this.currentUser || !this.currentUser.id) {
        this.currentUser = null;
        websocketService.setCurrentUserId(undefined);
        throw new Error('회원가입 후 유효하지 않은 사용자 정보가 반환되었습니다.');
      }
      
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      websocketService.setCurrentUserId(this.currentUser.id);
      
      return this.currentUser;
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      this.currentUser = null;
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      websocketService.setCurrentUserId(undefined);
      throw error;
    }
  }

  // 로그아웃 처리
  async logout(): Promise<void> {
    const currentUserIdForLogout = this.currentUser?.id;
    try {
      await api.post('/auth/logout', { userId: currentUserIdForLogout });
    } catch (error) {
      console.error('API 로그아웃 호출 중 오류 발생:', error);
    } finally {
      this.currentUser = null;
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      websocketService.setCurrentUserId(undefined);
      websocketService.disconnect();
      console.log('로컬 로그아웃 처리 완료 및 웹소켓 연결 해제');
    }
  }

  // 현재 사용자 정보 조회
  async getCurrentUser(): Promise<User | null> {
    const now = Date.now();
    if (this.isInitialized && this.currentUser && (now - this.lastCheckTime < this.CACHE_DURATION)) {
      return this.currentUser;
    }
    if (!this.isInitialized || (now - this.lastCheckTime >= this.CACHE_DURATION)) {
        console.log('캐시 만료 또는 미초기화, 세션 체크 실행');
        return this.checkSession();
    }
    return this.currentUser;
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
  async updateProfile(profileData: Partial<User>): Promise<User | null> {
    if (!this.currentUser) {
      throw new Error('프로필 업데이트를 위해서는 로그인이 필요합니다.');
    }
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await api.put<User>('/auth/profile', profileData, {
        headers: { 'X-Session-Id': sessionId || '' },
        withCredentials: true
      });
      const updatedUser = response.data;
      this.currentUser = updatedUser;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      websocketService.setCurrentUserId(this.currentUser.id);
      return this.currentUser;
    } catch (error) {
      console.error('프로필 업데이트 중 오류 발생:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();