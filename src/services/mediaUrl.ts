import { API_BASE_URL } from './apiConfig';

const UPLOAD_PATH = /^\/?uploads(?:\/|$)/;

/**
 * Resolve backend-owned upload paths against the API origin.
 *
 * This matters when the app is hosted below a GitHub Pages base path while the
 * API lives on another origin: `/uploads/...` belongs to the API, not Pages.
 * Absolute CDN/data/blob URLs are intentionally left untouched.
 */
export const resolveMediaUrl = (
  value?: string | null,
  apiBaseUrl = API_BASE_URL,
  clientOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (!UPLOAD_PATH.test(value)) {
    return value;
  }

  const uploadPath = value.startsWith('/') ? value : `/${value}`;

  try {
    const apiOrigin = new URL(apiBaseUrl, clientOrigin).origin;
    return new URL(uploadPath, apiOrigin).toString();
  } catch {
    return value;
  }
};
