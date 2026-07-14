import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { DEFAULT_API_HEADERS, prepareRequestContentType } from './requestConfig';
import { API_BASE_URL } from './apiConfig';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_API_HEADERS,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');

    prepareRequestContentType(config.data, config.headers);

    if (sessionId) {
      config.headers['X-Session-Id'] = sessionId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const sessionId = response.headers['x-session-id'];
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      store.dispatch(setUser(null));
    }

    return Promise.reject(error);
  }
);

export default api;
