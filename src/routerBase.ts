export const getRouterBasename = (baseUrl: string): string | undefined => {
  const normalized = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  const withoutTrailingSlash = normalized.replace(/\/+$/, '');
  return withoutTrailingSlash || undefined;
};
