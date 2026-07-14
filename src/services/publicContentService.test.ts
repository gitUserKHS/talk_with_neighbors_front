import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from './api';
import { feedService } from './feedService';
import { meetupService } from './meetupService';

const publicPost = {
  id: 'post-1',
  authorDisplayName: '이웃',
  imageUrl: 'https://cdn.example.com/post.jpg',
  caption: '안녕하세요',
  interestTags: ['산책'],
  createdAt: '2026-07-14T01:00:00Z',
  updatedAt: '2026-07-14T01:00:00Z',
  likeCount: 1,
  commentCount: 1,
  official: true,
};

describe('public content service access', () => {
  const get = vi.mocked(api.get);
  const post = vi.mocked(api.post);

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('uses only privacy-safe public read endpoints for guest feed and meetups', async () => {
    get
      .mockResolvedValueOnce({
        data: {
          content: [publicPost],
          totalPages: 1,
          totalElements: 1,
          number: 0,
          last: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          content: [{
            id: 'room-1',
            title: '동네 산책',
            interestTags: ['산책'],
            participantCount: 2,
            full: false,
            official: true,
            location: '이웃톡 라운지',
            locationAddress: '서울 마포구',
            latitude: 37.5,
            longitude: 127,
            kakaoPlaceId: 'place-1',
          }],
        },
      });

    const feed = await feedService.getFeed(0, 20, 'public');
    const meetups = await meetupService.getMeetups({ keyword: '산책', page: 0, size: 30 }, 'public');

    expect(get).toHaveBeenNthCalledWith(1, '/public/feed', { params: { page: 0, size: 20 } });
    expect(get).toHaveBeenNthCalledWith(2, '/public/meetups', {
      params: { keyword: '산책', page: 0, size: 30 },
    });
    expect(feed.content[0].likedByCurrentUser).toBe(false);
    expect(meetups.content[0].joined).toBe(false);
    expect(feed.content[0].official).toBe(true);
    expect(meetups.content[0]).toMatchObject({
      official: true,
      location: '이웃톡 라운지',
      latitude: 37.5,
      longitude: 127,
    });
    expect(get.mock.calls.some(([url]) => String(url).includes('/comments'))).toBe(false);
  });

  it('keeps an explicit false public-preview opt-in in the multipart request', async () => {
    post.mockResolvedValueOnce({
      data: {
        id: 'post-private',
        authorId: 1,
        authorUsername: '작성자',
        imageUrl: 'https://cdn.example.com/private.jpg',
        caption: '로그인 사용자에게만 보여요',
        interestTags: ['일상'],
        createdAt: '2026-07-14T02:00:00Z',
        updatedAt: '2026-07-14T02:00:00Z',
        likeCount: 0,
        commentCount: 0,
        likedByCurrentUser: false,
        compatibilityScore: 0,
        sharedInterests: [],
      },
    });

    await feedService.createPost({
      caption: '로그인 사용자에게만 보여요',
      interestTags: ['일상'],
      publicPreview: false,
    }, []);

    const formData = post.mock.calls[0][1] as FormData;
    const requestPart = formData.get('post') as Blob;
    await expect(requestPart.text()).resolves.toContain('"publicPreview":false');
  });
});
