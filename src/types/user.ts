import type { AuthProviderId } from './auth';

export interface User {
  id: string | number;
  email: string;
  username: string;
  profileImage?: string;
  lastLogin?: string;
  address?: string;
  age?: number;
  bio?: string;
  gender?: string;
  isOnline?: boolean;
  lastOnlineAt?: string;
  latitude?: number;
  longitude?: number;
  interests?: string[];
  profileComplete?: boolean;
  profileCompletion?: number;
  emailVerified?: boolean;
  linkedProviders?: AuthProviderId[];
}
