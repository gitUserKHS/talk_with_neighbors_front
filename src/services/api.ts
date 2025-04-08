import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { authService } from './authService';

// 환경 변수 로딩 확인
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
      console.log('X-Session-Id 헤더 추가됨:', sessionId);
    }
    
    return config;
  },
  (error) => {
    console.error('API 요청 중 오류 발생:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 응답 후 로깅 및 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log('API 응답:', {
      status: response.status,
      data: response.data,
    });
    const sessionId = response.headers['x-session-id'];
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
      console.log('새로운 세션 ID 저장됨:', sessionId);
    }
    return response;
  },
  async (error) => {
    console.error('API 응답 오류:', error);
    
    // 401 에러 발생 시 로그아웃 처리
    if (error.response?.status === 401) {
      try {
        await authService.logout();  // 로그아웃 API 호출
      } catch (logoutError) {
        console.error('로그아웃 처리 중 오류 발생:', logoutError);
      } finally {
        store.dispatch(setUser(null));  // 로컬 상태 초기화
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;