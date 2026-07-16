import { describe, expect, it } from 'vitest';
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_COUNT,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIDE_PIXELS,
  MAX_MEDIA_REQUEST_BYTES,
  mediaUploadStatusText,
} from './mediaUploadPolicy';

describe('mediaUploadPolicy', () => {
  it('keeps the portfolio node video envelope deliberately small', () => {
    expect(MAX_VIDEO_BYTES).toBe(30 * 1024 * 1024);
    expect(MAX_VIDEO_COUNT).toBe(1);
    expect(MAX_VIDEO_DURATION_SECONDS).toBe(60);
    expect(MAX_VIDEO_SIDE_PIXELS).toBe(1920);
    expect(MAX_MEDIA_REQUEST_BYTES).toBe(120 * 1024 * 1024);
  });

  it('separates network upload progress from server-side media processing', () => {
    expect(mediaUploadStatusText(0)).toContain('준비');
    expect(mediaUploadStatusText(42)).toBe('업로드 중 42%');
    expect(mediaUploadStatusText(100)).toContain('서버에서');
    expect(mediaUploadStatusText(100)).not.toContain('업로드 중');
  });
});
