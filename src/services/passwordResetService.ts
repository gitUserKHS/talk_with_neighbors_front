import api from './api';

export const passwordResetService = {
  /** 기능이 꺼져 있으면 로그인 화면에 링크를 노출하지 않는다. */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await api.get<{ enabled: boolean }>('/auth/password-reset/availability');
      return response.data.enabled === true;
    } catch {
      return false;
    }
  },

  async requestCode(email: string): Promise<void> {
    await api.post('/auth/password-reset', { email });
  },

  async confirm(email: string, code: string, newPassword: string): Promise<void> {
    await api.post('/auth/password-reset/confirm', { email, code, newPassword });
  },
};

export default passwordResetService;
