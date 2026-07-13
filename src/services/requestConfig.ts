export const DEFAULT_API_HEADERS = {
  Accept: 'application/json',
};

type ContentTypeHeaders = {
  setContentType: (value: string | false) => unknown;
};

/**
 * Axios serializes FormData as JSON when a JSON content type was inherited.
 * Clear it before request transformation so the browser can add the multipart
 * boundary itself.
 */
export const prepareRequestContentType = (
  data: unknown,
  headers: ContentTypeHeaders
): void => {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    headers.setContentType(false);
  }
};
