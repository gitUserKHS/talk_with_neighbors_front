import { translate } from '../i18n/I18nProvider';

export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_COUNT = 1;
export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_VIDEO_SIDE_PIXELS = 1920;
export const MAX_MEDIA_REQUEST_BYTES = 120 * 1024 * 1024;

export const VIDEO_UPLOAD_GUIDANCE =
  '동영상은 1개만 첨부할 수 있으며, 30MB·60초·Full HD(1080p) 이하여야 합니다.';

export const videoUploadGuidance = (): string => translate(
  VIDEO_UPLOAD_GUIDANCE,
  'You can attach one video up to 30 MB, 60 seconds, and Full HD (1080p).',
);

export const mediaUploadStatusText = (progress: number): string => {
  if (progress <= 0) return translate('업로드를 준비하고 있습니다…', 'Preparing your upload…');
  if (progress >= 100) return translate('파일 전송 완료 · 서버에서 안전하게 최적화하고 있습니다…', 'Upload complete · Processing your file securely…');
  return translate(`업로드 중 ${progress}%`, `Uploading ${progress}%`);
};
