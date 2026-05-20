/**
 * Company Hub attractions — stale-while-revalidate caching.
 */
export const ATTRACTIONS_HUB_GC_TIME_MS = 10 * 60 * 1000;

export const ATTRACTIONS_HUB_STALE_TIME_MS = 0;

export const attractionsHubFreshCache = {
  staleTime: ATTRACTIONS_HUB_STALE_TIME_MS,
  gcTime: ATTRACTIONS_HUB_GC_TIME_MS,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

export const internalAttractionsQueryKeys = {
  attractions: (appliedQuery: string) => ['internal-attractions', appliedQuery] as const,
  suggestions: (debouncedDraft: string) => ['internal-attractions-suggestions', debouncedDraft] as const,
  tours: (attractionId: number) => ['internal-attraction-tours', attractionId] as const,
};

export function normalizeAttractionsSearchQuery(value: string): string {
  return value.trim();
}
