/**
 * Company Hub markets — stale-while-revalidate caching.
 * Cached pages render instantly; staleTime 0 + refetch flags keep data fresh.
 */
export const MARKETS_HUB_GC_TIME_MS = 10 * 60 * 1000;

/** Always stale so mount/focus/apply trigger a background refetch. */
export const MARKETS_HUB_STALE_TIME_MS = 0;

export const marketsHubFreshCache = {
  staleTime: MARKETS_HUB_STALE_TIME_MS,
  gcTime: MARKETS_HUB_GC_TIME_MS,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

export const internalMarketsQueryKeys = {
  markets: (appliedQuery: string) => ['internal-markets', appliedQuery] as const,
  suggestions: (debouncedDraft: string) => ['internal-markets-suggestions', debouncedDraft] as const,
  postals: (marketName: string) => ['internal-market-postals', marketName] as const,
};

export function normalizeMarketsSearchQuery(value: string): string {
  return value.trim();
}
