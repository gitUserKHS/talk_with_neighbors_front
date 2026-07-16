import { describe, expect, it } from 'vitest';
import { FeedPost } from '../types/feed';
import {
  availableFeedModes,
  rankFeedPosts,
  recommendationScore,
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

describe('feed discovery ranking', () => {
  const now = Date.parse('2026-07-16T00:00:00.000Z');

  it('prioritizes meaningful interest and compatibility signals for recommendations', () => {
    const relevant = post('relevant', {
      compatibilityScore: 86,
      sharedInterests: ['walking', 'coffee'],
    });
    const popular = post('popular', { likeCount: 80, commentCount: 20 });

    expect(recommendationScore(relevant, now)).toBeGreaterThan(recommendationScore(popular, now));
    expect(rankFeedPosts([popular, relevant], 'RECOMMENDED', now).map(({ id }) => id))
      .toEqual(['relevant', 'popular']);
  });

  it('offers distance-based discovery only when a signed-in location can be applied', () => {
    expect(availableFeedModes(false)).toEqual(['RECOMMENDED', 'LATEST']);
    expect(availableFeedModes(true)).toEqual(['RECOMMENDED', 'NEARBY', 'LATEST']);
    expect(resolveFeedMode('NEARBY', false)).toBe('RECOMMENDED');
    expect(resolveFeedMode('LATEST', false)).toBe('LATEST');
    expect(resolveFeedMode('NEARBY', true)).toBe('NEARBY');
  });

  it('preserves privacy-safe server proximity order even when its reasons are empty', () => {
    const serverFirst = post('server-first', { recommendationReasons: [] });
    const locallyStronger = post('locally-stronger', {
      compatibilityScore: 100,
      recommendationReasons: [],
    });

    expect(rankFeedPosts([serverFirst, locallyStronger], 'NEARBY', now).map(({ id }) => id))
      .toEqual(['server-first', 'locally-stronger']);
  });

  it('uses a stable recommendation fallback for legacy nearby responses', () => {
    const olderServerFirst = post('older-server-first');
    const relevant = post('relevant', {
      compatibilityScore: 86,
      sharedInterests: ['walking', 'coffee'],
    });

    expect(rankFeedPosts([olderServerFirst, relevant], 'NEARBY', now).map(({ id }) => id))
      .toEqual(['relevant', 'older-server-first']);
  });

  it('preserves server recommendation order when explanation metadata is present', () => {
    const serverFirst = post('server-first', { recommendationReasons: ['POPULAR'] });
    const locallyStronger = post('locally-stronger', { compatibilityScore: 100 });

    expect(rankFeedPosts([serverFirst, locallyStronger], 'RECOMMENDED', now).map(({ id }) => id))
      .toEqual(['server-first', 'locally-stronger']);
  });

  it('preserves server recommendation order when the reason list is empty', () => {
    const serverFirst = post('server-first', { recommendationReasons: [] });
    const locallyStronger = post('locally-stronger', {
      compatibilityScore: 100,
      recommendationReasons: [],
    });

    expect(rankFeedPosts([serverFirst, locallyStronger], 'RECOMMENDED', now).map(({ id }) => id))
      .toEqual(['server-first', 'locally-stronger']);
  });

  it('orders the latest view by creation time', () => {
    const older = post('older', { createdAt: '2026-07-14T00:00:00.000Z' });
    const newer = post('newer', { createdAt: '2026-07-15T23:00:00.000Z' });

    expect(rankFeedPosts([older, newer], 'LATEST', now).map(({ id }) => id))
      .toEqual(['newer', 'older']);
  });
});
