export interface FeedPost {
  id: string;
  /** True when the server supplied privacy-safe portfolio demonstration content. */
  demo?: boolean;
  authorId: number;
  authorUsername: string;
  authorProfileImage?: string;
  imageUrl: string;
  media?: FeedMedia[];
  caption: string;
  interestTags: string[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  compatibilityScore: number;
  sharedInterests: string[];
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
}

export interface CreateFeedPostRequest {
  caption: string;
  interestTags: string[];
  publicPreview: boolean;
}
