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

/**
 * Preserves the server's authoritative ranking across page boundaries. Posts
 * repeated by adjacent pages are refreshed in place instead of moving cards.
 */
export const mergeServerOrderedFeedPosts = (
  current: FeedPost[],
  incoming: FeedPost[],
): FeedPost[] => {
  const byId = new Map(current.map((post) => [post.id, post]));
  incoming.forEach((post) => byId.set(post.id, post));
  return Array.from(byId.values());
};
