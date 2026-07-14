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
    prepareRequestContentType(config.data, config.headers);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      store.dispatch(setUser(null));
    }

    return Promise.reject(error);
  }
);

export default api;
