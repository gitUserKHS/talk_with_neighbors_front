import { FeedMedia } from '../types/feed';

/** Mirrors FfmpegMediaProcessor.THUMBNAIL_MAX_DIMENSION: a thumbnail's longer side is at most this. */
export const FEED_THUMBNAIL_MAX_DIMENSION = 480;
/** Card column width: 720px on lg (Feed.tsx grid / PostDetail maxWidth), the viewport below that. */
export const CARD_IMAGE_SIZES = '(min-width: 1200px) 720px, 100vw';

export interface CardMediaSource {
  /** Image URL to show inside a feed card: the backend thumbnail when one exists. */
  src: string;
  /** Thumbnail and original with width descriptors, so wide or retina cards stay sharp. */
  srcSet?: string;
  /** `sizes` that pairs with srcSet; undefined when there is only one candidate. */
  sizes?: string;
  /** Poster image for a video card. The original URL is the last resort. */
  poster?: string;
  /** CSS aspect-ratio value that reserves the media box before the image loads. */
  aspectRatio?: string;
  isVideo: boolean;
}

/**
 * Width of the backend thumbnail for a photo whose original dimensions are known:
 * the longer side is capped at FEED_THUMBNAIL_MAX_DIMENSION and never upscaled.
 */
const thumbnailWidth = (width: number, height: number): number =>
  Math.round(width * Math.min(1, FEED_THUMBNAIL_MAX_DIMENSION / Math.max(width, height)));

/**
 * `srcset` for a photo card: the thumbnail for narrow layouts and the original
 * once the rendered width (times device pixel ratio) exceeds the thumbnail.
 * Undefined when there is no separate thumbnail or the original size is unknown.
 */
const photoSrcSet = (media: FeedMedia): string | undefined => {
  if (!media.thumbnailUrl || media.thumbnailUrl === media.url || !media.width || !media.height) {
    return undefined;
  }
  const thumbWidth = thumbnailWidth(media.width, media.height);
  if (thumbWidth >= media.width) return undefined;
  return `${media.thumbnailUrl} ${thumbWidth}w, ${media.url} ${media.width}w`;
};

/**
 * Picks what a feed card should render for a media item. Photos default to the
 * thumbnail the backend already produced and only advertise the original through
 * srcset for cards wider than the thumbnail; videos show their poster only,
 * because the lightbox owns full-size playback.
 */
export const cardMediaSource = (media: FeedMedia): CardMediaSource => {
  const isVideo = media.type === 'VIDEO';
  const aspectRatio = media.width && media.height
    ? `${media.width} / ${media.height}`
    : undefined;

  if (isVideo) {
    return { src: media.url, poster: media.thumbnailUrl || media.url, aspectRatio, isVideo };
  }
  const srcSet = photoSrcSet(media);
  return {
    src: media.thumbnailUrl || media.url,
    srcSet,
    sizes: srcSet ? CARD_IMAGE_SIZES : undefined,
    aspectRatio,
    isVideo,
  };
};
