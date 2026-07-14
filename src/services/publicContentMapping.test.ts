import { describe, expect, it } from 'vitest';
import { mapPublicFeedPost } from './feedService';
import { mapPublicMeetup } from './meetupService';

describe('public content mappings', () => {
  it('maps a public feed DTO without inventing personalized state', () => {
    const post = mapPublicFeedPost({
      id: 'post-1',
      demo: true,
      authorDisplayName: '이웃',
      imageUrl: 'https://cdn.example.com/photo.jpg',
      media: [{ url: 'https://cdn.example.com/photo.jpg', type: 'IMAGE', sortOrder: 0 }],
      caption: '주말 산책 어때요?',
      interestTags: ['산책'],
      createdAt: '2026-07-14T01:00:00Z',
      updatedAt: '2026-07-14T01:00:00Z',
      likeCount: 3,
      commentCount: 2,
    });

    expect(post).toMatchObject({
      id: 'post-1',
      demo: true,
      authorId: 0,
      authorUsername: '이웃',
      authorProfileImage: undefined,
      likedByCurrentUser: false,
      compatibilityScore: 0,
      sharedInterests: [],
      likeCount: 3,
      commentCount: 2,
    });
  });

  it('uses a safe display-name fallback for an anonymous public post author', () => {
    expect(mapPublicFeedPost({
      id: 'post-anonymous',
      authorDisplayName: null,
      imageUrl: null,
      caption: '반가워요!',
      interestTags: [],
      createdAt: '2026-07-14T01:05:00Z',
      updatedAt: '2026-07-14T01:05:00Z',
      likeCount: 0,
    }).authorUsername).toBe('이웃');
  });

  it('maps public meetups with every member-only field disabled', () => {
    const meetup = mapPublicMeetup({
      id: 'room-1',
      demo: true,
      title: '저녁 러닝',
      interestTags: ['러닝'],
      maxParticipants: 6,
      participantCount: 4,
      full: false,
      scheduledAt: '2026-07-18T10:00:00Z',
    });

    expect(meetup).toMatchObject({
      roomId: 'room-1',
      demo: true,
      sharedInterests: [],
      joined: false,
      waitlisted: false,
      waitlistCount: 0,
    });
    expect(meetup.creatorUsername).toBeUndefined();
    expect(meetup.location).toBeUndefined();
    expect(meetup.lastMessage).toBeUndefined();
  });
});
