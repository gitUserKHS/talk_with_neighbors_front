import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import { feedService } from './feedService';
import { FeedComment, FeedPost } from '../types/feed';

const post: FeedPost = {
  id: 'post-1',
  authorId: 7,
  authorUsername: '다윤',
  imageUrl: '/media/post.jpg',
  caption: '수정한 산책 이야기',
  interestTags: ['산책'],
  publicPreview: true,
  createdAt: '2026-07-15T01:00:00Z',
  updatedAt: '2026-07-15T02:00:00Z',
  likeCount: 1,
  commentCount: 1,
  likedByCurrentUser: false,
  compatibilityScore: 0,
  sharedInterests: [],
};

const comment: FeedComment = {
  id: 'comment-1',
  authorId: 7,
  authorUsername: '다윤',
  content: '수정한 댓글',
  createdAt: '2026-07-15T01:30:00Z',
  updatedAt: '2026-07-15T02:30:00Z',
};

describe('feed author mutation API contract', () => {
  const patch = vi.mocked(api.patch);
  const remove = vi.mocked(api.delete);

  beforeEach(() => {
    patch.mockReset();
    remove.mockReset();
  });

  it('updates only editable post metadata and maps the response', async () => {
    patch.mockResolvedValueOnce({ data: post });

    await expect(feedService.updatePost('post-1', {
      caption: '수정한 산책 이야기',
      interestTags: ['산책'],
      publicPreview: true,
    })).resolves.toMatchObject({ id: 'post-1', caption: '수정한 산책 이야기' });

    expect(patch).toHaveBeenCalledWith('/feed/post-1', {
      caption: '수정한 산책 이야기',
      interestTags: ['산책'],
      publicPreview: true,
    });
  });

  it('uses the author-scoped comment update and delete endpoints', async () => {
    patch.mockResolvedValueOnce({ data: comment });
    remove.mockResolvedValueOnce({});

    await expect(feedService.updateComment('comment-1', '수정한 댓글')).resolves.toMatchObject(comment);
    await feedService.deleteComment('comment-1');

    expect(patch).toHaveBeenCalledWith('/feed/comments/comment-1', { content: '수정한 댓글' });
    expect(remove).toHaveBeenCalledWith('/feed/comments/comment-1');
  });
});
