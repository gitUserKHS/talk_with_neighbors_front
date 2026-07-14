import api from './api';
import { User } from '../types/user';
import type { AuthApiError, AuthCapabilities, AuthProviderConfig, AuthProviderId, EmailVerificationChallenge } from '../types/auth';
import { isAxiosError, type AxiosProgressEvent } from 'axios';

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
  if (!challengeId) throw new Error('이메일 인증 요청 응답이 올바르지 않아.');

  return {
    challengeId,
    expiresAt: payload?.expiresAt,
    resendAvailableAt: payload?.resendAvailableAt,
    resendAfterSeconds: payload?.resendAfterSeconds,
  };
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_VERIFICATION_CODE: '인증번호가 맞지 않아. 다시 확인해줘.',
  EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED: '인증번호가 맞지 않거나 만료됐어. 새 번호를 받아줘.',
  EMAIL_VERIFICATION_ATTEMPTS_EXHAUSTED: '인증번호를 너무 많이 틀렸어. 새 번호를 받아줘.',
  EMAIL_VERIFICATION_RESEND_COOLDOWN: '인증번호를 다시 받기 전 잠시 기다려줘.',
  EMAIL_VERIFICATION_RATE_LIMITED: '인증 요청이 너무 많아. 잠시 뒤 다시 시도해줘.',
  EMAIL_VERIFICATION_PROOF_INVALID: '이메일 인증이 만료됐어. 처음부터 다시 확인해줘.',
  EMAIL_VERIFICATION_UNAVAILABLE: '이메일 인증을 잠시 사용할 수 없어. 조금 뒤 다시 시도해줘.',
  EMAIL_DELIVERY_FAILED: '인증 메일을 보내지 못했어. 조금 뒤 다시 시도해줘.',
  EMAIL_VERIFICATION_EXPIRED: '인증번호가 만료됐어. 새 인증번호를 받아줘.',
  VERIFICATION_CHALLENGE_EXPIRED: '인증번호가 만료됐어. 새 인증번호를 받아줘.',
  EMAIL_ALREADY_IN_USE: '이미 가입된 이메일이야. 로그인해줘.',
  USERNAME_ALREADY_IN_USE: '이미 사용 중인 닉네임이야.',
  TOO_MANY_REQUESTS: '요청이 너무 많아. 잠시 뒤 다시 시도해줘.',
  ACCOUNT_LINK_REQUIRED: '같은 이메일의 계정이 있어. 기존 이메일과 비밀번호로 로그인해줘.',
  PROVIDER_EMAIL_REQUIRED: '소셜 계정의 이메일 제공 동의가 필요해.',
  OAUTH_FAILED: '간편 로그인에 실패했어. 다시 시도해줘.',
  BAD_CREDENTIALS: '이메일과 비밀번호를 확인해줘.',
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
    message: (code && AUTH_ERROR_MESSAGES[code]) || payload?.message?.trim() || fallbackMessage,
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
    } catch {
      // Redux still completes local logout if the server session already expired.
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
