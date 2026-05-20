/**
 * Company Hub venues — stale-while-revalidate caching.
 * Cached pages render instantly; staleTime 0 + refetch flags keep data fresh.
 */
export const VENUES_HUB_GC_TIME_MS = 10 * 60 * 1000;

export const VENUES_HUB_STALE_TIME_MS = 0;

export const venuesHubFreshCache = {
  staleTime: VENUES_HUB_STALE_TIME_MS,
  gcTime: VENUES_HUB_GC_TIME_MS,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

export const internalVenuesQueryKeys = {
  venues: (appliedQuery: string) => ['internal-venues', appliedQuery] as const,
  suggestions: (debouncedDraft: string) => ['internal-venues-suggestions', debouncedDraft] as const,
};

export function normalizeVenuesSearchQuery(value: string): string {
  return value.trim();
}
