import type { User } from './user';

export type AuthProviderId = 'kakao' | 'google';

export interface AuthProviderConfig {
  id: AuthProviderId;
  enabled: boolean;
  displayName: string;
}

export interface AuthCapabilities {
  providers: AuthProviderConfig[];
  emailVerification: {
    enabled: boolean;
    reason?: string;
  };
}

export interface EmailVerificationChallenge {
  challengeId: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  resendAfterSeconds?: number;
}

export interface AuthApiError {
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
  fieldErrors?: Record<string, string>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}
