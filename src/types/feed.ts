export interface FeedPost {
  id: string;
  /** True for content published by the non-loginable service account. */
  official?: boolean;
  authorId: number;
  authorUsername: string;
  authorProfileImage?: string;
  imageUrl: string;
  media?: FeedMedia[];
  caption: string;
  interestTags: string[];
  publicPreview: boolean;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  compatibilityScore: number;
  sharedInterests: string[];
  /** Optional privacy-safe discovery metadata returned by feed queries. */
  neighborhoodName?: string;
  recommendationReasons?: string[];
}

export type FeedMediaType = 'IMAGE' | 'VIDEO';

export interface FeedMedia {
  url: string;
  type: FeedMediaType;
  sortOrder: number;
  thumbnailUrl?: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface FeedComment {
  id: string;
  authorId: number;
  authorUsername: string;
  authorProfileImage?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFeedPostRequest {
  caption: string;
  interestTags: string[];
  publicPreview: boolean;
}

export interface UpdateFeedPostRequest {
  caption: string;
  interestTags: string[];
  publicPreview: boolean;
}
