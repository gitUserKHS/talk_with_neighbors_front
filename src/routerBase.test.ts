import { describe, expect, it } from 'vitest';
import { getRouterBasename } from './routerBase';

describe('getRouterBasename', () => {
  it('normalizes Vite base paths for BrowserRouter', () => {
    expect(getRouterBasename('/talk_with_neighbors_front/')).toBe('/talk_with_neighbors_front');
    expect(getRouterBasename('preview/')).toBe('/preview');
  });

  it('leaves root routing without a basename', () => {
    expect(getRouterBasename('/')).toBeUndefined();
    expect(getRouterBasename('')).toBeUndefined();
  });
});
