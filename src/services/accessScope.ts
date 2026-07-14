export type AccessScope = 'public' | `authenticated:${string}`;
export type ApiAccess = 'public' | 'authenticated';

export interface AccessScopedList<T> {
  scope: AccessScope | null;
  items: T[];
}

export const accessScopeForUser = (userId: string | number | null | undefined): AccessScope =>
  userId == null ? 'public' : `authenticated:${String(userId)}`;

export const apiAccessForScope = (scope: AccessScope): ApiAccess =>
  scope === 'public' ? 'public' : 'authenticated';

export const visibleScopedItems = <T>(
  snapshot: AccessScopedList<T>,
  scope: AccessScope,
): T[] => (snapshot.scope === scope ? snapshot.items : []);

export const updateScopedItems = <T>(
  snapshot: AccessScopedList<T>,
  scope: AccessScope,
  update: T[] | ((items: T[]) => T[]),
): AccessScopedList<T> => {
  if (snapshot.scope !== scope) return snapshot;

  const items = typeof update === 'function'
    ? (update as (items: T[]) => T[])(snapshot.items)
    : update;
  return { scope, items };
};

export const isLatestRequest = (requestId: number, latestRequestId: number): boolean =>
  requestId === latestRequestId;
