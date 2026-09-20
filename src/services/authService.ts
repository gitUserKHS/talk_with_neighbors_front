import api from './api';
import { User } from '../types/user';
import type { AuthApiError, AuthCapabilities, AuthProviderConfig, AuthProviderId, EmailVerificationChallenge } from '../types/auth';
import { isAxiosError, type AxiosProgressEvent } from 'axios';
import { getRuntimeLocale, translate } from '../i18n/I18nProvider';
import { CODE_MESSAGES } from './apiError';

interface LoginResponse {
  user?: User;
  id?: User['id'];
  email?: string;
  username?: string;
}

interface DuplicateCheckResponse {
  emailExists: boolean;
  usernameExists: boolean;
}

type ProviderPayload =
  | string
  | { id?: string; provider?: string; enabled?: boolean; displayName?: string; name?: string };

type ProvidersResponse =
  | ProviderPayload[]
  | {
      providers?: ProviderPayload[] | Record<string, boolean>;
      kakao?: boolean;
      google?: boolean;
      emailVerification?: {
        enabled?: boolean;
        reason?: string | null;
      };
    };

const PROVIDER_NAMES: Record<AuthProviderId, string> = {
  kakao: '카카오',
  google: 'Google',
};

const isProviderId = (value: string): value is AuthProviderId => (
  value === 'kakao' || value === 'google'
);

export const normalizeAuthProviders = (payload: ProvidersResponse): AuthProviderConfig[] => {
  const entries: ProviderPayload[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.providers)
      ? payload.providers
      : payload.providers && typeof payload.providers === 'object'
        ? Object.entries(payload.providers).map(([id, enabled]) => ({ id, enabled }))
        : [
            ...(payload.kakao === undefined ? [] : [{ id: 'kakao', enabled: payload.kakao }]),
            ...(payload.google === undefined ? [] : [{ id: 'google', enabled: payload.google }]),
          ];

  const configured = new Map<AuthProviderId, AuthProviderConfig>();
  entries.forEach((entry) => {
    const rawId = typeof entry === 'string' ? entry : entry.id ?? entry.provider ?? '';
    const id = rawId.trim().toLowerCase();
    if (!isProviderId(id)) return;

    const enabled = typeof entry === 'string' ? true : entry.enabled !== false;
    const displayName = typeof entry === 'string'
      ? PROVIDER_NAMES[id]
      : entry.displayName?.trim() || entry.name?.trim() || PROVIDER_NAMES[id];
    configured.set(id, { id, enabled, displayName });
  });

  return (['kakao', 'google'] as AuthProviderId[])
    .map((id) => configured.get(id))
    .filter((provider): provider is AuthProviderConfig => Boolean(provider));
};

const normalizeEmailChallenge = (
  payload: Partial<EmailVerificationChallenge> & { id?: string } | null | undefined,
  fallbackChallengeId?: string,
): EmailVerificationChallenge => {
  const challengeId = payload?.challengeId?.trim() || payload?.id?.trim() || fallbackChallengeId;
  if (!challengeId) throw new Error(translate('이메일 인증 요청 응답이 올바르지 않습니다.', 'The email verification response is invalid.'));

  return {
    challengeId,
    expiresAt: payload?.expiresAt,
    resendAvailableAt: payload?.resendAvailableAt,
    resendAfterSeconds: payload?.resendAfterSeconds,
  };
};

export interface AuthErrorPresentation {
  code?: string;
  message: string;
  retryAfterSeconds?: number;
}

export const authErrorPresentation = (
  error: unknown,
  fallbackMessage: string,
): AuthErrorPresentation => {
  const payload = isAxiosError<AuthApiError>(error)
    ? error.response?.data
    : undefined;
  const code = payload?.code?.trim().toUpperCase();
  return {
    code,
    message: (code && CODE_MESSAGES[code]
      ? translate(...CODE_MESSAGES[code])
      : undefined)
      || (getRuntimeLocale() === 'ko' ? payload?.message?.trim() : undefined)
      || fallbackMessage,
    retryAfterSeconds: payload?.retryAfterSeconds,
  };
};

class AuthService {
  async getAuthCapabilities(): Promise<AuthCapabilities> {
    const response = await api.get<ProvidersResponse>('/public/auth/providers');
    const payload = response.data;
    const emailVerification = Array.isArray(payload) ? undefined : payload.emailVerification;
    return {
      providers: normalizeAuthProviders(payload),
      emailVerification: {
        enabled: emailVerification?.enabled === true,
        reason: emailVerification?.reason?.trim() || undefined,
      },
    };
  }

  async getAuthProviders(): Promise<AuthProviderConfig[]> {
    return (await this.getAuthCapabilities()).providers;
  }

  async requestEmailVerification(email: string): Promise<EmailVerificationChallenge> {
    const response = await api.post<Partial<EmailVerificationChallenge> & { id?: string }>(
      '/auth/email-verifications',
      { email: email.trim() },
    );
    return normalizeEmailChallenge(response.data);
  }

  async confirmEmailVerification(challengeId: string, code: string): Promise<void> {
    await api.post(`/auth/email-verifications/${encodeURIComponent(challengeId)}/confirm`, {
      code,
    });
  }

  async resendEmailVerification(challengeId: string): Promise<EmailVerificationChallenge> {
    const response = await api.post<Partial<EmailVerificationChallenge> & { id?: string } | null>(
      `/auth/email-verifications/${encodeURIComponent(challengeId)}/resend`,
    );
    return normalizeEmailChallenge(response.data, challengeId);
  }

  async login(email: string, password: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    const user = this.extractUser(response.data);

    if (user?.id === undefined || user?.id === null) {
      throw new Error('로그인 응답이 올바르지 않습니다.');
    }

    return user;
  }

  async register(email: string, password: string, username: string): Promise<User | null> {
    const response = await api.post<LoginResponse>('/auth/register', { email, password, username });
    const user = this.extractUser(response.data);

    if (user?.id !== undefined && user?.id !== null) {
      return user;
    }

    return null;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        // The cookie is already expired, so local sign-out can safely complete.
        return;
      }
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const response = await api.get<LoginResponse>('/auth/me');
    const user = this.extractUser(response.data);

    if (user?.id !== undefined && user?.id !== null) {
      return user;
    }

    return null;
  }

  async checkUsernameDuplicate(username: string): Promise<boolean> {
    const response = await api.get<DuplicateCheckResponse>('/auth/check-duplicates', {
      params: { username: username.trim() },
    });
    return response.data.usernameExists;
  }

  async updateNickname(nickname: string): Promise<User> {
    const response = await api.put<User>('/auth/profile/nickname', {
      nickname: nickname.trim(),
    });
    return response.data;
  }

  async updateProfile(profileData: Partial<User>): Promise<User | null> {
    const response = await api.put<User>('/auth/profile', profileData);
    return response.data;
  }

  async uploadProfileImage(
    file: File,
    onProgress?: (percentage: number) => void
  ): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<User>('/auth/profile/image', formData, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total && onProgress) {
          onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
        }
      },
    });
    return response.data;
  }

  async deleteProfileImage(): Promise<User> {
    const response = await api.delete<User>('/auth/profile/image');
    return response.data;
  }

  private extractUser(payload: LoginResponse): User | null {
    if (!payload) {
      return null;
    }

    if (payload.user) {
      return payload.user;
    }

    if (payload.id !== undefined && payload.id !== null && payload.email && payload.username) {
      return payload as User;
    }

    return null;
  }
}

export const authService = new AuthService();
