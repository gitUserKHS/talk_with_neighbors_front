import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';

// 환경 변수 로딩 확인
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 요청 전 로깅
api.interceptors.request.use(
  (config) => {
    console.log('API 요청:', {
      method: config.method,
      url: config.url,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('API 요청 오류:', error);
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
    return response;
  },
  (error) => {
    console.error('API 응답 오류:', error);
    
    // 401 에러 발생 시 로그아웃 처리
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      store.dispatch(setUser(null));
    }
    
    return Promise.reject(error);
  }
);

export default api;