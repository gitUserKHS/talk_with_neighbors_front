import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';

// 환경 변수 로딩 확인
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Socket URL:', process.env.REACT_APP_SOCKET_URL);

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL,
  withCredentials: true,  // 세션 쿠키를 포함하도록 설정
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // CORS 관련 설정 추가
  xsrfCookieName: 'JSESSIONID',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  // 쿠키 관련 설정 추가
  withXSRFToken: true,
});

// 요청 인터셉터: 요청 전 로깅
api.interceptors.request.use(
  (config) => {
    // 세션 쿠키가 있는지 확인
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('JSESSIONID='));
    
    if (!sessionCookie) {
      console.warn('세션 쿠키가 없습니다. 로그인이 필요할 수 있습니다.');
    } else {
      console.log('세션 쿠키 확인됨:', sessionCookie);
    }
    
    // 리다이렉트 방지를 위한 설정
    config.maxRedirects = 0;
    
    // CORS 관련 헤더 추가 - 클라이언트에서 설정하는 것은 의미가 없음
    // config.headers['Access-Control-Allow-Credentials'] = 'true';
    // config.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
    
    console.log('API 요청:', {
      method: config.method,
      url: config.url,
      data: config.data,
      withCredentials: config.withCredentials,
      cookies: document.cookie,
      headers: config.headers,
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
    // 응답 헤더에서 Set-Cookie 확인 - 브라우저 보안 정책으로 인해 직접 접근 불가
    // 대신 document.cookie를 통해 쿠키가 설정되었는지 확인
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('JSESSIONID='));
    
    if (!sessionCookie) {
      console.warn('세션 쿠키가 설정되지 않았습니다.');
      console.log('현재 쿠키:', document.cookie);
      
      // 쿠키가 설정되지 않은 경우 로그아웃 처리
      localStorage.removeItem('user');
      store.dispatch(setUser(null));
    } else {
      console.log('세션 쿠키 확인됨:', sessionCookie);
    }
    
    console.log('API 응답:', {
      status: response.status,
      data: response.data,
      cookies: document.cookie,
      headers: response.headers,
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
    
    // 리다이렉트 에러 처리
    if (error.response?.status === 302 || error.response?.status === 301) {
      console.error('리다이렉트 발생:', error.response.headers.location);
      return Promise.reject(new Error('리다이렉트가 발생했습니다. 백엔드 설정을 확인해주세요.'));
    }
    
    return Promise.reject(error);
  }
);

export default api;