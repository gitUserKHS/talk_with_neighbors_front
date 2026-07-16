import { FeedPost } from '../types/feed';

export type FeedDiscoveryMode = 'RECOMMENDED' | 'NEARBY' | 'LATEST';

export const availableFeedModes = (authenticated: boolean): FeedDiscoveryMode[] =>
  authenticated
    ? ['RECOMMENDED', 'NEARBY', 'LATEST']
    : ['RECOMMENDED', 'LATEST'];

export const resolveFeedMode = (
  requestedMode: FeedDiscoveryMode,
  authenticated: boolean,
): FeedDiscoveryMode => (
  availableFeedModes(authenticated).includes(requestedMode)
    ? requestedMode
    : 'RECOMMENDED'
);

const HOUR_MS = 60 * 60 * 1000;
const MAX_RECENCY_HOURS = 24 * 14;

const createdTime = (post: FeedPost): number => {
  const value = Date.parse(post.createdAt);
  return Number.isFinite(value) ? value : 0;
};

const normalizedCompatibility = (post: FeedPost): number =>
  Math.min(1, Math.max(0, (post.compatibilityScore ?? 0) / 100));

const recencySignal = (post: FeedPost, now: number): number => {
  const ageHours = Math.max(0, now - createdTime(post)) / HOUR_MS;
  return Math.max(0, 1 - Math.min(ageHours, MAX_RECENCY_HOURS) / MAX_RECENCY_HOURS);
};

const engagementSignal = (post: FeedPost): number => {
  const weightedInteractions = Math.max(0, post.likeCount ?? 0)
    + Math.max(0, post.commentCount ?? 0) * 2;
  return Math.min(1, Math.log1p(weightedInteractions) / Math.log(101));
};

/**
 * Provides a predictable client-side fallback while the server remains the source
 * of truth for privacy filtering and candidate selection.
 */
export const recommendationScore = (post: FeedPost, now = Date.now()): number => {
  const sharedInterestSignal = Math.min(1, (post.sharedInterests?.length ?? 0) / 4);
  return normalizedCompatibility(post) * 0.42
    + sharedInterestSignal * 0.25
    + recencySignal(post, now) * 0.21
    + engagementSignal(post) * 0.12;
};

export const rankFeedPosts = (
  posts: FeedPost[],
  mode: FeedDiscoveryMode,
  now = Date.now(),
): FeedPost[] => {
  if (mode === 'RECOMMENDED' && posts.some((post) => (post.recommendationReasons?.length ?? 0) > 0)) {
    return [...posts];
  }

  const indexed = posts.map((post, index) => ({ post, index }));

  indexed.sort((left, right) => {
    if (mode === 'LATEST') {
      return createdTime(right.post) - createdTime(left.post) || left.index - right.index;
    }

    if (mode === 'NEARBY') {
      const leftDistance = left.post.distanceKm;
      const rightDistance = right.post.distanceKm;
      if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      if (leftDistance != null && rightDistance == null) return -1;
      if (leftDistance == null && rightDistance != null) return 1;
    }

    return recommendationScore(right.post, now) - recommendationScore(left.post, now)
      || left.index - right.index;
  });

  return indexed.map(({ post }) => post);
};
