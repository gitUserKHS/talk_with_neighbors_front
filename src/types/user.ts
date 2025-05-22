export interface User {
  id: number;
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
}