import { describe, expect, it } from 'vitest';
import { FeedPost } from '../types/feed';
import {
  availableFeedModes,
  mergeServerOrderedFeedPosts,
  resolveFeedMode,
} from './feedDiscovery';

const post = (id: string, values: Partial<FeedPost> = {}): FeedPost => ({
  id,
  authorId: 1,
  authorUsername: 'neighbor',
  imageUrl: '',
  caption: id,
  interestTags: [],
  publicPreview: false,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
  likeCount: 0,
  commentCount: 0,
  likedByCurrentUser: false,
  compatibilityScore: 0,
  sharedInterests: [],
  ...values,
});

describe('feed discovery', () => {
  it('offers distance-based discovery only when a signed-in location can be applied', () => {
    expect(availableFeedModes(false)).toEqual(['RECOMMENDED', 'LATEST']);
    expect(availableFeedModes(true)).toEqual(['RECOMMENDED', 'NEARBY', 'LATEST']);
    expect(resolveFeedMode('NEARBY', false)).toBe('RECOMMENDED');
    expect(resolveFeedMode('LATEST', false)).toBe('LATEST');
    expect(resolveFeedMode('NEARBY', true)).toBe('NEARBY');
  });

  it('preserves the server order for a fresh page without local reranking', () => {
    const serverFirst = post('server-first', {
      createdAt: '2026-07-14T00:00:00.000Z',
    });
    const locallyStrongerAndNewer = post('locally-stronger-and-newer', {
      compatibilityScore: 100,
      sharedInterests: ['walking', 'coffee'],
      likeCount: 80,
      commentCount: 20,
      createdAt: '2026-07-15T23:00:00.000Z',
    });

    expect(mergeServerOrderedFeedPosts([], [serverFirst, locallyStrongerAndNewer]))
      .toEqual([serverFirst, locallyStrongerAndNewer]);
  });

  it('keeps page boundaries stable and refreshes overlapping posts in place', () => {
    const first = post('first');
    const overlap = post('overlap', { caption: 'before' });
    const refreshedOverlap = post('overlap', { caption: 'after' });
    const nextFirst = post('next-first');
    const nextSecond = post('next-second');
    const merged = mergeServerOrderedFeedPosts(
      [first, overlap],
      [refreshedOverlap, nextFirst, nextSecond],
    );

    expect(merged.map(({ id }) => id)).toEqual([
      'first',
      'overlap',
      'next-first',
      'next-second',
    ]);
    expect(merged[1].caption).toBe('after');
  });
});
