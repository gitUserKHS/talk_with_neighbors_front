import { describe, expect, it } from 'vitest';
import { mapPublicFeedPost } from './feedService';
import { mapPublicMeetup } from './meetupService';

describe('public content mappings', () => {
  it('maps a public feed DTO without inventing personalized state', () => {
    const post = mapPublicFeedPost({
      id: 'post-1',
      official: true,
      authorDisplayName: '이웃톡 운영팀',
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
      official: true,
      authorId: 0,
      authorUsername: '이웃톡 운영팀',
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

  it('maps an official public meetup including its intentionally public location', () => {
    const meetup = mapPublicMeetup({
      id: 'room-1',
      official: true,
      title: '저녁 러닝',
      interestTags: ['러닝'],
      maxParticipants: 6,
      participantCount: 4,
      full: false,
      scheduledAt: '2026-07-18T10:00:00Z',
      location: '이웃톡 라운지',
      locationAddress: '서울 마포구 월드컵북로 1',
      latitude: 37.5,
      longitude: 127,
      kakaoPlaceId: 'private-place-id',
    });

    expect(meetup).toMatchObject({
      roomId: 'room-1',
      official: true,
      sharedInterests: [],
      joined: false,
      waitlisted: false,
      waitlistCount: 0,
      location: '이웃톡 라운지',
      locationAddress: '서울 마포구 월드컵북로 1',
      latitude: 37.5,
      longitude: 127,
      kakaoPlaceId: 'private-place-id',
    });
    expect(meetup.creatorUsername).toBeUndefined();
    expect(meetup.lastMessage).toBeUndefined();
  });

  it('still strips exact location fields from a normal member meetup', () => {
    const meetup = mapPublicMeetup({
      id: 'room-private-location',
      official: false,
      title: '동네 산책',
      interestTags: ['산책'],
      participantCount: 2,
      full: false,
      location: '공개되면 안 되는 장소',
      locationAddress: '공개되면 안 되는 주소',
      latitude: 37.5,
      longitude: 127,
      kakaoPlaceId: 'private-place-id',
    });

    expect(meetup.location).toBeUndefined();
    expect(meetup.locationAddress).toBeUndefined();
    expect(meetup.latitude).toBeUndefined();
    expect(meetup.longitude).toBeUndefined();
    expect(meetup.kakaoPlaceId).toBeUndefined();
  });
});
