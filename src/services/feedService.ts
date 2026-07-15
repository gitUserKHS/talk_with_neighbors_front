import api from './api';
import {
  CreateFeedPostRequest,
  FeedComment,
  FeedMedia,
  FeedPost,
  UpdateFeedPostRequest,
} from '../types/feed';
import type { AxiosProgressEvent } from 'axios';
import { resolveMediaUrl } from './mediaUrl';

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}

export type FeedAccess = 'authenticated' | 'public';

export interface PublicFeedMediaDto {
  url: string;
  type: FeedMedia['type'];
  sortOrder: number;
  thumbnailUrl?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export interface PublicFeedPostDto {
  id: string;
  official?: boolean;
  authorDisplayName: string | null;
  imageUrl: string | null;
  media?: PublicFeedMediaDto[] | null;
  caption: string;
  interestTags: string[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount?: number;
}

const mapMedia = (media: FeedMedia): FeedMedia => ({
  ...media,
  url: resolveMediaUrl(media.url) ?? '',
  thumbnailUrl: resolveMediaUrl(media.thumbnailUrl),
});

const mapAuthenticatedPost = (post: FeedPost): FeedPost => ({
  ...post,
  authorProfileImage: resolveMediaUrl(post.authorProfileImage),
  imageUrl: resolveMediaUrl(post.imageUrl) ?? '',
  media: post.media?.map(mapMedia),
});

const mapAuthenticatedComment = (comment: FeedComment): FeedComment => ({
  ...comment,
  authorProfileImage: resolveMediaUrl(comment.authorProfileImage),
});

const mapPublicMedia = (media: PublicFeedMediaDto): FeedMedia => ({
  url: resolveMediaUrl(media.url) ?? '',
  type: media.type,
  sortOrder: media.sortOrder,
  thumbnailUrl: resolveMediaUrl(media.thumbnailUrl),
  contentType: media.contentType ?? undefined,
  sizeBytes: media.sizeBytes ?? undefined,
  width: media.width ?? undefined,
  height: media.height ?? undefined,
  durationSeconds: media.durationSeconds ?? undefined,
});

/** Public API fields are deliberately expanded into the richer signed-in view model. */
export const mapPublicFeedPost = (post: PublicFeedPostDto): FeedPost => ({
  id: post.id,
  official: post.official ?? false,
  authorId: 0,
  authorUsername: post.authorDisplayName?.trim() || '이웃',
  authorProfileImage: undefined,
  imageUrl: resolveMediaUrl(post.imageUrl) ?? '',
  media: post.media?.map(mapPublicMedia),
  caption: post.caption,
  interestTags: post.interestTags ?? [],
  publicPreview: true,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  likeCount: post.likeCount ?? 0,
  commentCount: post.commentCount ?? 0,
  likedByCurrentUser: false,
  compatibilityScore: 0,
  sharedInterests: [],
});

const mapPage = <TSource, TTarget>(
  payload: PageResponse<TSource> | TSource[],
  page: number,
  mapper: (item: TSource) => TTarget,
): PageResponse<TTarget> => {
  if (Array.isArray(payload)) {
    return {
      content: payload.map(mapper),
      totalPages: 1,
      totalElements: payload.length,
      number: page,
      last: true,
    };
  }

  return { ...payload, content: payload.content.map(mapper) };
};

export const feedService = {
  async getFeed(
    page = 0,
    size = 20,
    access: FeedAccess = 'authenticated',
  ): Promise<PageResponse<FeedPost>> {
    if (access === 'public') {
      const response = await api.get<PageResponse<PublicFeedPostDto> | PublicFeedPostDto[]>(
        '/public/feed',
        { params: { page, size } },
      );
      return mapPage(response.data, page, mapPublicFeedPost);
    }

    const response = await api.get<PageResponse<FeedPost> | FeedPost[]>('/feed', {
      params: { page, size },
    });
    return mapPage(response.data, page, mapAuthenticatedPost);
  },

  async createPost(
    request: CreateFeedPostRequest,
    files: File[],
    onProgress?: (percentage: number) => void
  ): Promise<FeedPost> {
    const formData = new FormData();
    formData.append(
      'post',
      new Blob([JSON.stringify(request)], { type: 'application/json' })
    );
    files.forEach((file) => formData.append('files', file));

    const response = await api.post<FeedPost>('/feed', formData, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total && onProgress) {
          onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
        }
      },
    });
    return mapAuthenticatedPost(response.data);
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/feed/${postId}/likes`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}/likes`);
  },

  async getComments(postId: string): Promise<FeedComment[]> {
    const response = await api.get<FeedComment[]>(`/feed/${postId}/comments`);
    return response.data.map(mapAuthenticatedComment);
  },

  async addComment(postId: string, content: string): Promise<FeedComment> {
    const response = await api.post<FeedComment>(`/feed/${postId}/comments`, { content });
    return mapAuthenticatedComment(response.data);
  },

  async updatePost(postId: string, request: UpdateFeedPostRequest): Promise<FeedPost> {
    const response = await api.patch<FeedPost>(`/feed/${postId}`, request);
    return mapAuthenticatedPost(response.data);
  },

  async updateComment(commentId: string, content: string): Promise<FeedComment> {
    const response = await api.patch<FeedComment>(`/feed/comments/${commentId}`, { content });
    return mapAuthenticatedComment(response.data);
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}`);
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/feed/comments/${commentId}`);
  },
};

export default feedService;
