import { describe, expect, it } from 'vitest';
import { FeedMedia } from '../types/feed';
import { CARD_IMAGE_SIZES, cardMediaSource } from './feedMedia';

const media = (values: Partial<FeedMedia> = {}): FeedMedia => ({
  url: '/uploads/feed/original.jpg',
  type: 'IMAGE',
  sortOrder: 0,
  ...values,
});

describe('cardMediaSource', () => {
  it('shows the backend thumbnail for photos and falls back to the original', () => {
    expect(cardMediaSource(media({ thumbnailUrl: '/uploads/feed/thumb.jpg' }))).toEqual({
      src: '/uploads/feed/thumb.jpg',
      srcSet: undefined,
      sizes: undefined,
      aspectRatio: undefined,
      isVideo: false,
    });

    expect(cardMediaSource(media()).src).toBe('/uploads/feed/original.jpg');
  });

  it('offers the original through srcset when the card can outgrow the thumbnail', () => {
    const landscape = cardMediaSource(media({ thumbnailUrl: '/uploads/feed/thumb.webp', width: 1600, height: 1200 }));
    expect(landscape.src).toBe('/uploads/feed/thumb.webp');
    expect(landscape.srcSet).toBe('/uploads/feed/thumb.webp 480w, /uploads/feed/original.jpg 1600w');
    expect(landscape.sizes).toBe(CARD_IMAGE_SIZES);

    // Portrait thumbnails are bounded on their height, so the width descriptor shrinks with it.
    expect(cardMediaSource(media({ thumbnailUrl: '/uploads/feed/thumb.webp', width: 900, height: 1600 })).srcSet)
      .toBe('/uploads/feed/thumb.webp 270w, /uploads/feed/original.jpg 900w');

    // No separate thumbnail, unknown size, or an original no larger than the thumbnail: single candidate.
    expect(cardMediaSource(media({ width: 1600, height: 1200 })).srcSet).toBeUndefined();
    expect(cardMediaSource(media({ thumbnailUrl: '/uploads/feed/thumb.webp' })).srcSet).toBeUndefined();
    expect(cardMediaSource(media({ thumbnailUrl: '/uploads/feed/thumb.webp', width: 400, height: 300 })).srcSet)
      .toBeUndefined();
  });

  it('uses the thumbnail as a poster for videos instead of the video itself', () => {
    const video = media({
      url: '/uploads/feed/clip.mp4',
      type: 'VIDEO',
      thumbnailUrl: '/uploads/feed/clip-poster.jpg',
    });

    expect(cardMediaSource(video)).toEqual({
      src: '/uploads/feed/clip.mp4',
      poster: '/uploads/feed/clip-poster.jpg',
      aspectRatio: undefined,
      isVideo: true,
    });

    expect(cardMediaSource(media({ url: '/uploads/feed/clip.mp4', type: 'VIDEO' })).poster)
      .toBe('/uploads/feed/clip.mp4');
  });

  it('reserves the aspect ratio only when both dimensions are known', () => {
    expect(cardMediaSource(media({ width: 1600, height: 900 })).aspectRatio).toBe('1600 / 900');
    expect(cardMediaSource(media({ width: 1600 })).aspectRatio).toBeUndefined();
    expect(cardMediaSource(media({ width: 0, height: 900 })).aspectRatio).toBeUndefined();
  });
});
