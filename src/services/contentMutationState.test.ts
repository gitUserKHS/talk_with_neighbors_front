import { describe, expect, it } from 'vitest';
import {
  decrementPostCommentCount,
  removeFeedComment,
  removeFeedPost,
  removeMeetup,
  replaceFeedComment,
  replaceFeedPost,
  replaceMeetup,
} from './contentMutationState';

const basePost = {
  id: 'post-1', authorId: 1, authorUsername: '다윤', imageUrl: '', caption: '전',
  interestTags: [], publicPreview: false, createdAt: '', updatedAt: '', likeCount: 0,
  commentCount: 1, likedByCurrentUser: false, compatibilityScore: 0, sharedInterests: [],
};

const baseMeetup = {
  roomId: 'room-1', title: '전', interestTags: [], sharedInterests: [], participantCount: 1,
  joined: true, full: false, waitlisted: false, waitlistCount: 0,
};

describe('author mutation UI state', () => {
  it('replaces and removes a post without disturbing other cards', () => {
    const other = { ...basePost, id: 'post-2' };
    const updated = { ...basePost, caption: '후' };
    expect(replaceFeedPost([basePost, other], updated)).toEqual([updated, other]);
    expect(removeFeedPost([basePost, other], 'post-1')).toEqual([other]);
  });

  it('updates and removes only the target comment and keeps counts non-negative', () => {
    const first = { id: 'comment-1', authorId: 1, authorUsername: '다윤', content: '전', createdAt: '' };
    const other = { ...first, id: 'comment-2' };
    const updated = { ...first, content: '후' };
    const comments = { 'post-1': [first, other] };

    expect(replaceFeedComment(comments, 'post-1', updated)['post-1']).toEqual([updated, other]);
    expect(removeFeedComment(comments, 'post-1', 'comment-1')['post-1']).toEqual([other]);
    expect(decrementPostCommentCount([{ ...basePost, commentCount: 0 }], 'post-1')[0].commentCount).toBe(0);
  });

  it('replaces and removes the selected meetup after host mutations', () => {
    const updated = { ...baseMeetup, title: '후' };
    expect(replaceMeetup([baseMeetup], updated)).toEqual([updated]);
    expect(removeMeetup([updated], 'room-1')).toEqual([]);
  });
});
