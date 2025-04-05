import axios from 'axios';

// 환경 변수 로딩 확인
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    // 세션 ID가 응답 헤더에 있는 경우 저장
    const sessionId = response.headers['x-session-id'];
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
); 