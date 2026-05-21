import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Landmark,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  fetchInternalVenueSuggestions,
  fetchInternalVenues,
  type InternalHubVenue,
} from '@/api/internalVenuesApi';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  internalVenuesQueryKeys,
  normalizeVenuesSearchQuery,
  venuesHubFreshCache,
} from './venuesHubCache';

const VENUES_PAGE_SIZE = 10;
const SUGGESTION_LIMIT = 8;

type ViewMode = 'tiles' | 'list';

function formatCapacity(capacity: number): string {
  if (!Number.isFinite(capacity) || capacity <= 0) return '—';
  return capacity.toLocaleString();
}

function complexLabels(names: string | null): string[] {
  if (!names?.trim()) return [];
  return names
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function VenueDetailPanel({ venue, isOpen }: { venue: InternalHubVenue; isOpen: boolean }) {
  if (!isOpen) return null;

  const complexes = complexLabels(venue.entertainmentComplexNames);

  return (
    <div className="animate-slide-up border-t border-neutral-200/80 bg-neutral-50/90 px-4 py-4 sm:px-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Venue type</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">{venue.venueTypeName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Market (DMA)</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">{venue.dmaMarketName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Seating capacity</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">{formatCapacity(venue.seatingCapacity)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Company ID</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">#{venue.companyId}</dd>
        </div>
      </dl>
      {complexes.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Entertainment complex{complexes.length === 1 ? '' : 'es'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {complexes.map((label) => (
              <li
                key={label}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-800 shadow-sm"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">No entertainment complex linked.</p>
      )}
    </div>
  );
}

function VenueCard({
  venue,
  viewMode,
  index,
}: {
  venue: InternalHubVenue;
  viewMode: ViewMode;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isList = viewMode === 'list';
  const complexes = complexLabels(venue.entertainmentComplexNames);

  return (
    <article
      className="animate-slide-up group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.1)]"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('p-3 sm:p-5', isList && 'p-4')}>
        <div className={cn('flex gap-3 sm:gap-4', isList ? 'flex-row' : 'flex-col')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-[#0c0c0c] text-white transition-transform duration-300 group-hover:scale-105',
              isList ? 'h-14 w-14' : 'h-14 w-14 sm:h-16 sm:w-16',
            )}
          >
            <Landmark className={isList ? 'h-6 w-6' : 'h-6 w-6 sm:h-7 sm:w-7'} strokeWidth={1.5} aria-hidden />
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
                  isList ? 'text-base sm:text-lg' : 'text-sm sm:text-base lg:text-lg',
                )}
                title={venue.venueName}
              >
                {venue.venueName}
              </h3>
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-100 sm:px-3 sm:text-xs',
                  !isList && 'w-full sm:w-auto',
                )}
                aria-expanded={expanded}
              >
                <span className="whitespace-nowrap">{expanded ? 'Hide' : 'View'} details</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform duration-300', expanded && 'rotate-180')}
                  aria-hidden
                />
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-semibold text-neutral-800">{formatCapacity(venue.seatingCapacity)}</span> seats
              {venue.venueTypeName ? (
                <span className="text-neutral-500"> · {venue.venueTypeName}</span>
              ) : null}
            </p>
            {venue.dmaMarketName ? (
              <p className="mt-1 text-xs text-neutral-500">{venue.dmaMarketName}</p>
            ) : null}
            {complexes.length > 0 && !expanded ? (
              <p className="mt-1 line-clamp-1 text-xs text-neutral-400" title={complexes.join(', ')}>
                {complexes[0]}
                {complexes.length > 1 ? ` +${complexes.length - 1} more` : ''}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <VenueDetailPanel venue={venue} isOpen={expanded} />
    </article>
  );
}

export function VenuesExplorer() {
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
    queryKey: internalVenuesQueryKeys.suggestions(debouncedTrimmed),
    queryFn: () => fetchInternalVenueSuggestions(debouncedTrimmed, SUGGESTION_LIMIT),
    enabled: debouncedTrimmed.length > 0,
    ...venuesHubFreshCache,
    placeholderData: keepPreviousData,
  });

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

  const venuesQuery = useInfiniteQuery({
    queryKey: internalVenuesQueryKeys.venues(appliedQuery),
    queryFn: ({ pageParam = 0 }) =>
      fetchInternalVenues(pageParam, VENUES_PAGE_SIZE, appliedQuery || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    ...venuesHubFreshCache,
    placeholderData: keepPreviousData,
  });

  const showVenuesInitialLoad = venuesQuery.isPending && !venuesQuery.data;
  const showVenuesRefreshing =
    venuesQuery.isFetching && venuesQuery.isPlaceholderData && !!venuesQuery.data;

  const venues = useMemo(
    () => venuesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [venuesQuery.data],
  );

  const total = venuesQuery.data?.pages[0]?.total ?? 0;

  const applySearch = useCallback(() => {
    const normalized = normalizeVenuesSearchQuery(draftQuery);
    setAppliedQuery(normalized);
    setSuggestionsOpen(false);
    void queryClient.invalidateQueries({
      queryKey: internalVenuesQueryKeys.venues(normalized),
    });
  }, [draftQuery, queryClient]);

  const clearSearch = useCallback(() => {
    setDraftQuery('');
    setAppliedQuery('');
    setSuggestionsOpen(false);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!venuesQuery.hasNextPage || venuesQuery.isFetchingNextPage) return;

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void venuesQuery.fetchNextPage();
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [venuesQuery.hasNextPage, venuesQuery.isFetchingNextPage, venuesQuery.fetchNextPage]);

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
    <section className="animate-slide-up" aria-label="Venues directory">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-2xl">
            Venue Partners
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
        <label htmlFor="venues-search" className="sr-only">
          Search venues by name
        </label>
        <div className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white pl-4 pr-1 shadow-sm transition-shadow focus-within:border-neutral-500 focus-within:shadow-md">
          <input
            id="venues-search"
            type="text"
            role="combobox"
            aria-expanded={showSuggestionsPanel}
            aria-controls="venues-search-suggestions"
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
            placeholder="Search venue name…"
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
            id="venues-search-suggestions"
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
            role="listbox"
          >
            {isSuggestionsLoading ? (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching venues…
              </li>
            ) : null}

            {suggestionsQuery.isError ? (
              <li className="px-4 py-3 text-sm text-amber-800">Could not load suggestions. Try again.</li>
            ) : null}

            {showSuggestionsEmpty ? (
              <li className="px-4 py-3 text-sm text-neutral-500">No matching venues for this text.</li>
            ) : null}

            {showSuggestionResults
              ? suggestionsQuery.data?.map((item) => (
                  <li key={item.companyId} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const normalized = normalizeVenuesSearchQuery(item.venueName);
                        setDraftQuery(normalized);
                        setAppliedQuery(normalized);
                        setSuggestionsOpen(false);
                        void queryClient.invalidateQueries({
                          queryKey: internalVenuesQueryKeys.venues(normalized),
                        });
                      }}
                    >
                      <span className="font-semibold text-neutral-900">{item.venueName}</span>
                      <span className="text-xs text-neutral-500">
                        {formatCapacity(item.seatingCapacity)} seats
                        {item.dmaMarketName ? ` · ${item.dmaMarketName}` : ''}
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
              — <span className="font-semibold text-neutral-900">{total}</span> venues
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          {total > 0 ? (
            <>
              <Users className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              <span>
                <span className="font-semibold text-neutral-800">{total}</span> venues available
              </span>
            </>
          ) : null}
        </p>
      )}

      {showVenuesRefreshing ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Updating results…
        </p>
      ) : null}

      {showVenuesInitialLoad ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
          <span className="sr-only">Loading venues</span>
        </div>
      ) : null}

      {venuesQuery.isError ? (
        <div className="mt-10 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Venues could not be loaded. Try again in a moment.</span>
          <button
            type="button"
            onClick={() => void venuesQuery.refetch()}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!showVenuesInitialLoad && !venuesQuery.isError && venues.length === 0 ? (
        <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-sm text-neutral-600">
          No venues match your search. Try a different name.
        </div>
      ) : null}

      {venues.length > 0 ? (
        <div
          className={cn(
            'mt-8',
            viewMode === 'tiles'
              ? 'grid grid-cols-2 items-start gap-3 sm:gap-4 xl:grid-cols-3'
              : 'flex flex-col gap-3',
          )}
        >
          {venues.map((venue, index) => (
            <VenueCard key={venue.companyId} venue={venue} viewMode={viewMode} index={index} />
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />

      {venuesQuery.isFetchingNextPage ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading more venues…
        </p>
      ) : null}

      {!venuesQuery.hasNextPage && venues.length > 0 && !showVenuesInitialLoad ? (
        <p className="mt-6 text-center text-xs font-medium text-neutral-400">
          Showing all {venues.length} of {total} venues
        </p>
      ) : null}
    </section>
  );
}
