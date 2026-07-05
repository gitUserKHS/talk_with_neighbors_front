import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');

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
