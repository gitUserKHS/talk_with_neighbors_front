import { FeedComment, FeedPost } from '../types/feed';
import { HobbyMeetup } from '../types/meetup';

export const mergeFeedPostDiscoveryMetadata = (
  current: FeedPost,
  updated: FeedPost,
): FeedPost => ({
  ...updated,
  neighborhoodName: updated.neighborhoodName === undefined
    ? current.neighborhoodName
    : updated.neighborhoodName,
  recommendationReasons: updated.recommendationReasons === undefined
    ? current.recommendationReasons
    : updated.recommendationReasons,
});

export const replaceFeedPost = (posts: FeedPost[], updated: FeedPost): FeedPost[] =>
  posts.map((post) => (post.id === updated.id
    ? mergeFeedPostDiscoveryMetadata(post, updated)
    : post));

export const removeFeedPost = (posts: FeedPost[], postId: string): FeedPost[] =>
  posts.filter((post) => post.id !== postId);

export const replaceFeedComment = (
  comments: Record<string, FeedComment[]>,
  postId: string,
  updated: FeedComment,
): Record<string, FeedComment[]> => ({
  ...comments,
  [postId]: (comments[postId] ?? []).map((comment) =>
    comment.id === updated.id ? updated : comment),
});

export const removeFeedComment = (
  comments: Record<string, FeedComment[]>,
  postId: string,
  commentId: string,
): Record<string, FeedComment[]> => ({
  ...comments,
  [postId]: (comments[postId] ?? []).filter((comment) => comment.id !== commentId),
});

export const decrementPostCommentCount = (posts: FeedPost[], postId: string): FeedPost[] =>
  posts.map((post) => post.id === postId
    ? { ...post, commentCount: Math.max(0, (post.commentCount ?? 0) - 1) }
    : post);

export const replaceMeetup = (meetups: HobbyMeetup[], updated: HobbyMeetup): HobbyMeetup[] =>
  meetups.map((meetup) => (meetup.roomId === updated.roomId ? updated : meetup));

export const removeMeetup = (meetups: HobbyMeetup[], roomId: string): HobbyMeetup[] =>
  meetups.filter((meetup) => meetup.roomId !== roomId);
