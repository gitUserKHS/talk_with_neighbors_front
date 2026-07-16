export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_COUNT = 1;
export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_VIDEO_SIDE_PIXELS = 1920;
export const MAX_MEDIA_REQUEST_BYTES = 120 * 1024 * 1024;

export const VIDEO_UPLOAD_GUIDANCE =
  '동영상은 1개, 30MB·60초·Full HD(1080p) 이하만 올릴 수 있어.';

export const mediaUploadStatusText = (progress: number): string => {
  if (progress <= 0) return '업로드를 준비하고 있어…';
  if (progress >= 100) return '파일 전송 완료 · 서버에서 안전하게 최적화하고 있어…';
  return `업로드 중 ${progress}%`;
};
