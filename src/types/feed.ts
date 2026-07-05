export interface FeedPost {
  id: string;
  authorId: number;
  authorUsername: string;
  authorProfileImage?: string;
  imageUrl: string;
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

export interface FeedComment {
  id: string;
  authorId: number;
  authorUsername: string;
  authorProfileImage?: string;
  content: string;
  createdAt: string;
}

export interface CreateFeedPostRequest {
  imageUrl: string;
  caption: string;
  interestTags: string[];
}
