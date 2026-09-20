import axios from 'axios';
import { store } from '../store';
import { setUser } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/notificationSlice';
import { translate } from '../i18n/I18nProvider';
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
      // 로그인 실패나 첫 세션 확인의 401에는 사용자가 없다. 있던 사용자가 사라질 때만 만료를 알린다.
      const hadUser = store.getState().auth.user !== null;
      store.dispatch(setUser(null));
      if (hadUser) {
        store.dispatch(addNotification({
          type: 'warning',
          message: translate('로그인이 만료됐어요. 다시 로그인해 주세요.', 'Your session expired. Please sign in again.'),
          navigateTo: '/login',
        }));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
