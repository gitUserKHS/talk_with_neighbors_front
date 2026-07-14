import { describe, expect, it } from 'vitest';
import {
  accessScopeForUser,
  apiAccessForScope,
  isLatestRequest,
  updateScopedItems,
  visibleScopedItems,
} from './accessScope';

describe('access-scoped async state', () => {
  it('uses a distinct scope for each signed-in user', () => {
    expect(accessScopeForUser(null)).toBe('public');
    expect(accessScopeForUser(7)).toBe('authenticated:7');
    expect(accessScopeForUser(8)).toBe('authenticated:8');
    expect(apiAccessForScope('public')).toBe('public');
    expect(apiAccessForScope('authenticated:7')).toBe('authenticated');
  });

  it('never exposes items loaded for another access scope', () => {
    const signedInSnapshot = {
      scope: accessScopeForUser(7),
      items: ['private-post'],
    };

    expect(visibleScopedItems(signedInSnapshot, 'public')).toEqual([]);
    expect(visibleScopedItems(signedInSnapshot, accessScopeForUser(8))).toEqual([]);
    expect(visibleScopedItems(signedInSnapshot, accessScopeForUser(7)))
      .toEqual(['private-post']);
  });

  it('ignores stale updates and request generations', () => {
    const publicSnapshot = { scope: 'public' as const, items: ['public-post'] };
    const staleUpdate = updateScopedItems(
      publicSnapshot,
      accessScopeForUser(7),
      () => ['private-post'],
    );

    expect(staleUpdate).toBe(publicSnapshot);
    expect(isLatestRequest(3, 4)).toBe(false);
    expect(isLatestRequest(4, 4)).toBe(true);
  });
});
