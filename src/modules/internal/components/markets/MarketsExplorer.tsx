import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import {
  fetchInternalMarketSuggestions,
  fetchInternalMarkets,
  fetchInternalMarketVenues,
  type InternalHubMarket,
  type InternalMarketVenue,
} from '@/api/internalMarketsApi';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  internalMarketsQueryKeys,
  marketsHubFreshCache,
  normalizeMarketsSearchQuery,
} from './marketsHubCache';

const MARKETS_PAGE_SIZE = 10;
const VENUES_PAGE_SIZE = 20;
const SUGGESTION_LIMIT = 8;

type ViewMode = 'tiles' | 'list';

function venueLocation(venue: InternalMarketVenue): string {
  return [venue.city?.trim(), venue.stateProvince?.trim()].filter(Boolean).join(', ');
}

function MarketVenuesPanel({ market, isOpen }: { market: InternalHubMarket; isOpen: boolean }) {
  const {
    data,
    isPending,
    isFetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: internalMarketsQueryKeys.venues(market.dmaid),
    queryFn: ({ pageParam = 0 }) =>
      fetchInternalMarketVenues(market.dmaid, pageParam, VENUES_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: isOpen,
    ...marketsHubFreshCache,
    placeholderData: keepPreviousData,
  });

  const showVenuesInitialLoad = isPending && !data;
  const isVenuesRefreshing =
    isOpen && isFetching && !isFetchingNextPage && !!data && !showVenuesInitialLoad;

  const venues = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  if (!isOpen) return null;

  return (
    <div className="animate-slide-up border-t border-neutral-200/80 bg-neutral-50/90 px-4 py-4 sm:px-5">
      {showVenuesInitialLoad ? (
        <p className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading venues…
        </p>
      ) : null}

      {isVenuesRefreshing ? (
        <p className="mb-2 flex items-center gap-2 text-xs text-neutral-500" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Refreshing venues…
        </p>
      ) : null}

      {isError ? (
        <p className="text-sm text-amber-800">Could not load venues for this market.</p>
      ) : null}

      {!showVenuesInitialLoad && !isError ? (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {total} {total === 1 ? 'venue' : 'venues'} · sorted by city
          </p>
          {venues.length === 0 ? (
            <p className="text-sm text-neutral-600">No venues on file for this market yet.</p>
          ) : (
            <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {venues.map((venue) => {
                const complexes = (venue.entertainmentComplexNames ?? '')
                  .split(',')
                  .map((name) => name.trim())
                  .filter(Boolean);
                return (
                  <li
                    key={venue.companyId}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-neutral-400"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-neutral-900" title={venue.venueName}>
                        {venue.venueName}
                      </p>
                      {venueLocation(venue) ? (
                        <span className="shrink-0 text-xs font-medium text-neutral-600">{venueLocation(venue)}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      {venue.venueTypeName ? <span>{venue.venueTypeName}</span> : null}
                      {venue.seatingCapacity > 0 ? (
                        <span>· {venue.seatingCapacity.toLocaleString()} seats</span>
                      ) : null}
                    </div>
                    {complexes.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {complexes.map((complexName) => (
                          <span
                            key={complexName}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700"
                          >
                            <Building2 className="h-3 w-3" aria-hidden />
                            {complexName}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {hasNextPage ? (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-3 text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline disabled:opacity-60"
            >
              {isFetchingNextPage ? 'Loading more…' : 'Load more venues'}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MarketCard({
  market,
  viewMode,
  index,
}: {
  market: InternalHubMarket;
  viewMode: ViewMode;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const isList = viewMode === 'list';

  return (
    <article
      className="animate-slide-up group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.1)]"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms`, animationFillMode: 'both' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className={cn('w-full p-3 text-left sm:p-5', isList && 'p-4')}
      >
        <div className={cn('flex gap-3 sm:gap-4', isList ? 'flex-row' : 'flex-col')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-[#0c0c0c] text-white transition-transform duration-300 group-hover:scale-105',
              isList ? 'h-14 w-14' : 'h-14 w-14 sm:h-16 sm:w-16',
            )}
          >
            <MapPin className={isList ? 'h-6 w-6' : 'h-6 w-6 sm:h-7 sm:w-7'} strokeWidth={1.5} aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'flex gap-2',
                isList ? 'items-start justify-between gap-3' : 'flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3',
              )}
            >
              <h3
                className={cn(
                  'line-clamp-3 min-w-0 flex-1 font-bold leading-snug tracking-[-0.02em] text-neutral-950 [overflow-wrap:anywhere]',
                  isList ? 'text-base sm:text-lg' : 'min-h-[4.125em] text-sm sm:text-base lg:text-lg',
                )}
                title={market.marketName}
              >
                {market.marketName}
              </h3>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-sm sm:px-3 sm:text-xs',
                  !isList && 'w-full sm:w-auto',
                )}
              >
                <span className="whitespace-nowrap">{expanded ? 'Hide' : 'View'} venues</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform duration-300', expanded && 'rotate-180')}
                  aria-hidden
                />
              </span>
            </div>
            <div className="mt-2 flex min-h-[3.75rem] flex-col gap-0.5">
              {market.nielsenCode != null ? (
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-800">
                    Nielsen DMA #{market.nielsenCode}
                  </span>
                  {market.nielsenRank != null ? (
                    <span className="text-neutral-500"> · Rank {market.nielsenRank}</span>
                  ) : null}
                </p>
              ) : null}
              {market.nielsenMarketName ? (
                <p className="truncate text-xs text-neutral-500" title={market.nielsenMarketName}>
                  Nielsen name: {market.nielsenMarketName}
                </p>
              ) : null}
              {market.population != null ? (
                <p className="text-xs text-neutral-500">
                  {market.population.toLocaleString()} metro population
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      <MarketVenuesPanel market={market} isOpen={expanded} />
    </article>
  );
}

export function MarketsExplorer() {
  const queryClient = useQueryClient();
  const [draftQuery, setDraftQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const debouncedDraft = useDebouncedValue(draftQuery, 250);
  const trimmedDraft = draftQuery.trim();
  const debouncedTrimmed = debouncedDraft.trim();
  const isDebouncingSearch = trimmedDraft.length > 0 && trimmedDraft !== debouncedTrimmed;
  const showSuggestionsPanel = suggestionsOpen && trimmedDraft.length > 0;

  const suggestionsQuery = useQuery({
    queryKey: internalMarketsQueryKeys.suggestions(debouncedTrimmed),
    queryFn: () => fetchInternalMarketSuggestions(debouncedTrimmed, SUGGESTION_LIMIT),
    enabled: debouncedTrimmed.length > 0,
    staleTime: marketsHubFreshCache.staleTime,
    gcTime: marketsHubFreshCache.gcTime,
    refetchOnMount: marketsHubFreshCache.refetchOnMount,
    refetchOnWindowFocus: marketsHubFreshCache.refetchOnWindowFocus,
    placeholderData: (prev) => prev,
  }) as UseQueryResult<InternalHubMarket[], Error>;

  const isSuggestionsLoading =
    isDebouncingSearch ||
    suggestionsQuery.isFetching ||
    (suggestionsQuery.isPending && !(suggestionsQuery.data?.length ?? 0));
  const showSuggestionsEmpty =
    !isSuggestionsLoading &&
    !suggestionsQuery.isError &&
    debouncedTrimmed.length > 0 &&
    (suggestionsQuery.data?.length ?? 0) === 0;
  const showSuggestionResults =
    !isDebouncingSearch && !(suggestionsQuery.isFetching && suggestionsQuery.isPlaceholderData);

  const marketsQuery = useInfiniteQuery({
    queryKey: internalMarketsQueryKeys.markets(appliedQuery),
    queryFn: ({ pageParam = 0 }) =>
      fetchInternalMarkets(pageParam, MARKETS_PAGE_SIZE, appliedQuery || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    ...marketsHubFreshCache,
    placeholderData: keepPreviousData,
  });

  const showMarketsInitialLoad = marketsQuery.isPending && !marketsQuery.data;
  const showMarketsRefreshing =
    marketsQuery.isFetching && marketsQuery.isPlaceholderData && !!marketsQuery.data;

  const markets = useMemo(() => {
    const rows = marketsQuery.data?.pages.flatMap((page) => page.data) ?? [];
    // One card per market: guards against name variants and infinite-scroll page
    // drift re-delivering a market on two pages (staleTime is 0 here).
    const seen = new Set<string>();
    return rows.filter((market) => {
      const key = market.marketName.trim().replace(/[.,:;]$/, '').replace(/\s{2,}/g, ' ').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [marketsQuery.data]);

  const total = marketsQuery.data?.pages[0]?.total ?? 0;

  const applySearch = useCallback(() => {
    const normalized = normalizeMarketsSearchQuery(draftQuery);
    setAppliedQuery(normalized);
    setSuggestionsOpen(false);
    void queryClient.invalidateQueries({
      queryKey: internalMarketsQueryKeys.markets(normalized),
    });
  }, [draftQuery, queryClient]);

  const clearSearch = useCallback(() => {
    setDraftQuery('');
    setAppliedQuery('');
    setSuggestionsOpen(false);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!marketsQuery.hasNextPage || marketsQuery.isFetchingNextPage) return;

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void marketsQuery.fetchNextPage();
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [marketsQuery.hasNextPage, marketsQuery.isFetchingNextPage, marketsQuery.fetchNextPage]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <section className="animate-slide-up" aria-label="Markets directory">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-2xl">
            Designated Market Areas
          </h2>
        </div>

        <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('tiles')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
              viewMode === 'tiles' ? 'bg-black text-white shadow-sm' : 'text-neutral-700 hover:bg-white',
            )}
            aria-pressed={viewMode === 'tiles'}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Tiles
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors',
              viewMode === 'list' ? 'bg-black text-white shadow-sm' : 'text-neutral-700 hover:bg-white',
            )}
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" aria-hidden />
            List
          </button>
        </div>
      </div>

      <div ref={searchWrapRef} className="relative z-30 mt-6 max-w-md">
        <label htmlFor="markets-search" className="sr-only">
          Search markets or postal codes
        </label>
        <div className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white pl-4 pr-1 shadow-sm transition-shadow focus-within:border-neutral-500 focus-within:shadow-md">
          <input
            id="markets-search"
            type="text"
            role="combobox"
            aria-expanded={showSuggestionsPanel}
            aria-controls="markets-search-suggestions"
            aria-autocomplete="list"
            value={draftQuery}
            onChange={(event) => {
              setDraftQuery(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySearch();
              }
              if (event.key === 'Escape') {
                setSuggestionsOpen(false);
              }
            }}
            placeholder="Search market or postal…"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            autoComplete="off"
            spellCheck={false}
          />
          {trimmedDraft ? (
            <button
              type="button"
              onClick={clearSearch}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={applySearch}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform hover:scale-105 hover:bg-neutral-900"
            aria-label="Apply search"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {showSuggestionsPanel ? (
          <ul
            id="markets-search-suggestions"
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
            role="listbox"
          >
            {isSuggestionsLoading ? (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching markets…
              </li>
            ) : null}

            {suggestionsQuery.isError ? (
              <li className="px-4 py-3 text-sm text-amber-800">Could not load suggestions. Try again.</li>
            ) : null}

            {showSuggestionsEmpty ? (
              <li className="px-4 py-3 text-sm text-neutral-500">No matching markets for this text.</li>
            ) : null}

            {showSuggestionResults
              ? suggestionsQuery.data?.map((item) => (
              <li key={`${item.dmaid}-${item.marketName}`} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const normalized = normalizeMarketsSearchQuery(item.marketName);
                    setDraftQuery(normalized);
                    setAppliedQuery(normalized);
                    setSuggestionsOpen(false);
                    void queryClient.invalidateQueries({
                      queryKey: internalMarketsQueryKeys.markets(normalized),
                    });
                  }}
                >
                  <span className="font-semibold text-neutral-900">{item.marketName}</span>
                  <span className="text-xs text-neutral-500">
                    {item.nielsenCode != null ? (
                      <>Nielsen DMA #{item.nielsenCode}{item.population != null ? ` · ${item.population.toLocaleString()} pop.` : ''}</>
                    ) : (
                      '—'
                    )}
                  </span>
                </button>
              </li>
            ))
              : null}
          </ul>
        ) : null}
      </div>

      {appliedQuery ? (
        <p className="mt-4 text-sm text-neutral-600">
          Showing results for <span className="font-semibold text-neutral-900">&ldquo;{appliedQuery}&rdquo;</span>
          {total > 0 ? (
            <>
              {' '}
              — <span className="font-semibold text-neutral-900">{total}</span> markets
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">
          {total > 0 ? (
            <>
              <span className="font-semibold text-neutral-800">{total}</span> markets available
            </>
          ) : null}
        </p>
      )}

      {showMarketsRefreshing ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Updating results…
        </p>
      ) : null}

      {showMarketsInitialLoad ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
          <span className="sr-only">Loading markets</span>
        </div>
      ) : null}

      {marketsQuery.isError ? (
        <div className="mt-10 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Markets could not be loaded. Try again in a moment.</span>
          <button
            type="button"
            onClick={() => void marketsQuery.refetch()}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!showMarketsInitialLoad && !marketsQuery.isError && markets.length === 0 ? (
        <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-sm text-neutral-600">
          No markets match your search. Try a different market or postal code.
        </div>
      ) : null}

      {markets.length > 0 ? (
        <div
          className={cn(
            'mt-8',
            viewMode === 'tiles'
              ? 'grid grid-cols-2 items-start gap-3 sm:gap-4 xl:grid-cols-3'
              : 'flex flex-col gap-3',
          )}
        >
          {markets.map((market, index) => (
            <MarketCard key={`${market.dmaid}-${market.marketName}`} market={market} viewMode={viewMode} index={index} />
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />

      {marketsQuery.isFetchingNextPage ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading more markets…
        </p>
      ) : null}

      {!marketsQuery.hasNextPage && markets.length > 0 && !showMarketsInitialLoad ? (
        <p className="mt-6 text-center text-xs font-medium text-neutral-400">
          Showing all {markets.length} of {total} markets
        </p>
      ) : null}
    </section>
  );
}
