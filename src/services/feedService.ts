import api from './api';
import { CreateFeedPostRequest, FeedComment, FeedPost } from '../types/feed';
import type { AxiosProgressEvent } from 'axios';

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}

export const feedService = {
  async getFeed(page = 0, size = 20): Promise<PageResponse<FeedPost>> {
    const response = await api.get<PageResponse<FeedPost> | FeedPost[]>('/feed', {
      params: { page, size },
    });

    if (Array.isArray(response.data)) {
      return {
        content: response.data,
        totalPages: 1,
        totalElements: response.data.length,
        number: page,
        last: true,
      };
    }

    return response.data;
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
    return response.data;
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/feed/${postId}/likes`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}/likes`);
  },

  async getComments(postId: string): Promise<FeedComment[]> {
    const response = await api.get<FeedComment[]>(`/feed/${postId}/comments`);
    return response.data;
  },

  async addComment(postId: string, content: string): Promise<FeedComment> {
    const response = await api.post<FeedComment>(`/feed/${postId}/comments`, { content });
    return response.data;
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}`);
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/feed/comments/${commentId}`);
  },
};

export default feedService;
