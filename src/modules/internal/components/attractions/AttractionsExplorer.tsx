import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Music,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  fetchInternalAttractionSuggestions,
  fetchInternalAttractionTours,
  fetchInternalAttractions,
  type InternalHubAttraction,
} from '@/api/internalAttractionsApi';
import { fetchTourEngagements, type ApiTourEngagementRow } from '@/api/attractionToursApi';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  attractionsHubFreshCache,
  internalAttractionsQueryKeys,
  normalizeAttractionsSearchQuery,
} from './attractionsHubCache';

const ATTRACTIONS_PAGE_SIZE = 10;
const TOURS_PAGE_SIZE = 10;
const SUGGESTION_LIMIT = 8;

type ViewMode = 'tiles' | 'list';

function attractionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function tourCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'tour' : 'tours'}`;
}

function formatEngagementDate(row: ApiTourEngagementRow): string {
  if (!row.openingPerformanceDate) return 'Date TBD';
  const date = new Date(`${row.openingPerformanceDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return row.openingPerformanceDate;
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (row.openingPerformanceTime) {
    const [hh = '0', mm = '0'] = row.openingPerformanceTime.split(':');
    const time = new Date(2000, 0, 1, Number(hh), Number(mm));
    if (!Number.isNaN(time.getTime())) {
      return `${formatted} · ${time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
  }
  return formatted;
}

function engagementPlace(row: ApiTourEngagementRow): string {
  const cityState = [row.city?.trim(), row.stateProvince?.trim()].filter(Boolean).join(', ');
  return [row.venueName?.trim(), cityState].filter(Boolean).join(' · ');
}

function TourEngagementsList({ tourId, isOpen }: { tourId: number; isOpen: boolean }) {
  const { data, isPending, isError } = useQuery({
    queryKey: internalAttractionsQueryKeys.tourEngagements(tourId),
    queryFn: () => fetchTourEngagements(tourId),
    enabled: isOpen,
    staleTime: 5 * 60_000,
    gcTime: attractionsHubFreshCache.gcTime,
  });

  if (!isOpen) return null;

  if (isPending) {
    return (
      <p className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading engagements…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-amber-800">
        Could not load engagements for this tour.
      </p>
    );
  }

  const engagements = data ?? [];
  if (engagements.length === 0) {
    return (
      <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
        No engagements on this tour yet.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
      {engagements.map((engagement) => (
        <li
          key={engagement.engagementId}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-neutral-300"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold text-neutral-950" title={engagement.displayTitle}>
              {engagement.displayTitle || `Engagement #${engagement.engagementId}`}
            </p>
            {engagement.engagementStatus ? (
              <span className="shrink-0 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {engagement.engagementStatus}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
              {formatEngagementDate(engagement)}
            </span>
            {engagementPlace(engagement) ? (
              <span className="inline-flex min-w-0 items-center gap-1.5" title={engagementPlace(engagement)}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                <span className="truncate">{engagementPlace(engagement)}</span>
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttractionToursPanel({
  attraction,
  isOpen,
}: {
  attraction: InternalHubAttraction;
  isOpen: boolean;
}) {
  const {
    data,
    isPending,
    isFetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: internalAttractionsQueryKeys.tours(attraction.attractionId),
    queryFn: ({ pageParam = 0 }) =>
      fetchInternalAttractionTours(attraction.attractionId, pageParam, TOURS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: isOpen,
    ...attractionsHubFreshCache,
    placeholderData: keepPreviousData,
  });

  const tours = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? attraction.activeTourCount;
  const showInitialLoad = isPending && !data;
  const isRefreshing = isFetching && !isFetchingNextPage && !!data && !showInitialLoad;
  const [openTourIds, setOpenTourIds] = useState<Set<number>>(new Set());

  const toggleTour = (tourId: number) => {
    setOpenTourIds((prev) => {
      const next = new Set(prev);
      if (next.has(tourId)) next.delete(tourId);
      else next.add(tourId);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="animate-slide-up border-t border-neutral-200/80 bg-gradient-to-b from-neutral-50 to-neutral-100/60 px-4 py-5 sm:px-6">
      {showInitialLoad ? (
        <p className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading related tours…
        </p>
      ) : null}

      {isRefreshing ? (
        <p className="mb-2 flex items-center gap-2 text-xs text-neutral-500" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Refreshing tours…
        </p>
      ) : null}

      {isError ? (
        <p className="text-sm text-amber-800">Could not load tours for this attraction.</p>
      ) : null}

      {!showInitialLoad && !isError ? (
        <>
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            {total} related {total === 1 ? 'tour' : 'tours'}
          </p>
          {tours.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white/60 px-6 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400" aria-hidden>
                <Music className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-neutral-600">No tours linked to this attraction yet.</p>
              <p className="text-xs text-neutral-400">Tours will appear here once they&rsquo;re scheduled.</p>
            </div>
          ) : (
            <ul className="grid items-start gap-3 sm:grid-cols-2">
              {tours.map((tour) => {
                const isTourOpen = openTourIds.has(tour.tourId);
                return (
                  <li
                    key={tour.tourId}
                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTour(tour.tourId)}
                      aria-expanded={isTourOpen}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0c0c0c] text-white transition-transform duration-300',
                          isTourOpen && 'scale-105',
                        )}
                        aria-hidden
                      >
                        <Music className="h-5 w-5" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold tracking-[-0.01em] text-neutral-950">
                          {tour.tourName}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-neutral-500">
                          {tour.className || '—'}
                          {tour.talentAgencyCompanyName ? ` · ${tour.talentAgencyCompanyName}` : ''}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-300',
                          isTourOpen && 'rotate-180 text-neutral-800',
                        )}
                        aria-hidden
                      />
                    </button>
                    <div className={cn(isTourOpen && 'px-4 pb-4')}>
                      <TourEngagementsList tourId={tour.tourId} isOpen={isTourOpen} />
                    </div>
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
              className="mt-4 text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline disabled:opacity-60"
            >
              {isFetchingNextPage ? 'Loading more…' : 'Load more tours'}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function AttractionVisual({
  attraction,
  isList,
}: {
  attraction: InternalHubAttraction;
  isList: boolean;
}) {
  const banner = attraction.latestTourBannerImageUrl?.trim();
  const initials = attractionInitials(attraction.attractionName);

  if (isList) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0c0c0c] text-white">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-sm font-bold tracking-tight">{initials}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-3 overflow-hidden rounded-lg bg-neutral-100 sm:mb-4">
      <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/90">
            <span className="text-2xl font-bold tracking-tight">{initials}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Attraction
            </span>
          </div>
        )}
      </div>
      <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
        {tourCountLabel(attraction.activeTourCount)}
      </span>
    </div>
  );
}

function AttractionCard({
  attraction,
  viewMode,
  index,
}: {
  attraction: InternalHubAttraction;
  viewMode: ViewMode;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isList = viewMode === 'list';
  // An expanded tile spans the full grid row and adopts the compact horizontal
  // header so the tours panel below gets full width instead of a crushed column.
  const compact = isList || expanded;
  const hasTours = attraction.activeTourCount > 0;

  return (
    <article
      className={cn(
        'animate-slide-up group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300',
        expanded
          ? 'border-neutral-300 shadow-[0_14px_40px_rgba(0,0,0,0.12)]'
          : 'border-neutral-200 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.1)]',
        expanded && !isList && 'col-span-2 xl:col-span-3',
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms`, animationFillMode: 'both' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className={cn(
          'w-full p-3 text-left transition-colors focus-visible:outline-none sm:p-5',
          compact && 'p-4 sm:p-5',
          expanded && 'bg-gradient-to-b from-white to-neutral-50/60',
        )}
      >
        {!compact ? <AttractionVisual attraction={attraction} isList={false} /> : null}

        <div className={cn('flex gap-3 sm:gap-4', compact && 'flex-row items-center')}>
          {compact ? <AttractionVisual attraction={attraction} isList /> : null}

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'flex gap-2',
                compact ? 'items-center justify-between gap-3' : 'flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3',
              )}
            >
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    'line-clamp-3 min-w-0 font-bold leading-snug tracking-[-0.02em] text-neutral-950 [overflow-wrap:anywhere]',
                    compact ? 'text-base sm:text-lg' : 'text-sm sm:text-base lg:text-lg',
                  )}
                  title={attraction.attractionName}
                >
                  {attraction.attractionName}
                </h3>
                <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm', compact ? 'mt-1' : 'mt-2')}>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                      hasTours ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500',
                    )}
                  >
                    <Music className="h-3 w-3" aria-hidden />
                    {tourCountLabel(attraction.activeTourCount)}
                  </span>
                  <span className="text-xs text-neutral-400">#{attraction.attractionId}</span>
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold shadow-sm transition-colors sm:text-sm',
                  expanded
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 bg-white text-neutral-800 group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white',
                  !compact && 'mt-3 w-full sm:mt-0 sm:w-auto',
                )}
              >
                <span className="whitespace-nowrap">{expanded ? 'Hide' : 'View'} tours</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform duration-300', expanded && 'rotate-180')}
                  aria-hidden
                />
              </span>
            </div>
          </div>
        </div>
      </button>

      <AttractionToursPanel attraction={attraction} isOpen={expanded} />
    </article>
  );
}

export function AttractionsExplorer() {
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

  const suggestionsQuery: UseQueryResult<InternalHubAttraction[], Error> = useQuery({
    queryKey: internalAttractionsQueryKeys.suggestions(debouncedTrimmed),
    queryFn: () => fetchInternalAttractionSuggestions(debouncedTrimmed, SUGGESTION_LIMIT),
    enabled: debouncedTrimmed.length > 0,
    staleTime: attractionsHubFreshCache.staleTime,
    gcTime: attractionsHubFreshCache.gcTime,
    placeholderData: (prev: InternalHubAttraction[] | undefined) => prev,
  }) as unknown as UseQueryResult<InternalHubAttraction[], Error>;

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

  const attractionsQuery = useInfiniteQuery({
    queryKey: internalAttractionsQueryKeys.attractions(appliedQuery),
    queryFn: ({ pageParam = 0 }) =>
      fetchInternalAttractions(pageParam, ATTRACTIONS_PAGE_SIZE, appliedQuery || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    ...attractionsHubFreshCache,
    placeholderData: keepPreviousData,
  });

  const showAttractionsInitialLoad = attractionsQuery.isPending && !attractionsQuery.data;
  const showAttractionsRefreshing =
    attractionsQuery.isFetching &&
    attractionsQuery.isPlaceholderData &&
    !!attractionsQuery.data;

  const attractions = useMemo(
    () => attractionsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [attractionsQuery.data],
  );

  const total = attractionsQuery.data?.pages[0]?.total ?? 0;

  const applySearch = useCallback(() => {
    const normalized = normalizeAttractionsSearchQuery(draftQuery);
    setAppliedQuery(normalized);
    setSuggestionsOpen(false);
    void queryClient.invalidateQueries({
      queryKey: internalAttractionsQueryKeys.attractions(normalized),
    });
  }, [draftQuery, queryClient]);

  const clearSearch = useCallback(() => {
    setDraftQuery('');
    setAppliedQuery('');
    setSuggestionsOpen(false);
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!attractionsQuery.hasNextPage || attractionsQuery.isFetchingNextPage) return;

    const node = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void attractionsQuery.fetchNextPage();
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [attractionsQuery.hasNextPage, attractionsQuery.isFetchingNextPage, attractionsQuery.fetchNextPage]);

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
    <section className="animate-slide-up" aria-label="Attractions directory">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-2xl">
            Attraction Catalog
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
        <label htmlFor="attractions-search" className="sr-only">
          Search attractions by name
        </label>
        <div className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white pl-4 pr-1 shadow-sm transition-shadow focus-within:border-neutral-500 focus-within:shadow-md">
          <input
            id="attractions-search"
            type="text"
            role="combobox"
            aria-expanded={showSuggestionsPanel}
            aria-controls="attractions-search-suggestions"
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
            placeholder="Search attraction name…"
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
            id="attractions-search-suggestions"
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
            role="listbox"
          >
            {isSuggestionsLoading ? (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching attractions…
              </li>
            ) : null}

            {suggestionsQuery.isError ? (
              <li className="px-4 py-3 text-sm text-amber-800">Could not load suggestions. Try again.</li>
            ) : null}

            {showSuggestionsEmpty ? (
              <li className="px-4 py-3 text-sm text-neutral-500">No matching attractions for this text.</li>
            ) : null}

            {showSuggestionResults
              ? suggestionsQuery.data?.map((item) => (
                  <li key={item.attractionId} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const normalized = normalizeAttractionsSearchQuery(item.attractionName);
                        setDraftQuery(normalized);
                        setAppliedQuery(normalized);
                        setSuggestionsOpen(false);
                        void queryClient.invalidateQueries({
                          queryKey: internalAttractionsQueryKeys.attractions(normalized),
                        });
                      }}
                    >
                      <span className="font-semibold text-neutral-900">{item.attractionName}</span>
                      <span className="text-xs text-neutral-500">
                        {tourCountLabel(item.activeTourCount)}
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
              — <span className="font-semibold text-neutral-900">{total}</span> attractions
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
          {total > 0 ? (
            <>
              <Sparkles className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              <span>
                <span className="font-semibold text-neutral-800">{total}</span> attractions available
              </span>
            </>
          ) : null}
        </p>
      )}

      {showAttractionsRefreshing ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Updating results…
        </p>
      ) : null}

      {showAttractionsInitialLoad ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
          <span className="sr-only">Loading attractions</span>
        </div>
      ) : null}

      {attractionsQuery.isError ? (
        <div className="mt-10 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>Attractions could not be loaded. Try again in a moment.</span>
          <button
            type="button"
            onClick={() => void attractionsQuery.refetch()}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!showAttractionsInitialLoad && !attractionsQuery.isError && attractions.length === 0 ? (
        <div className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-sm text-neutral-600">
          No attractions match your search. Try a different name.
        </div>
      ) : null}

      {attractions.length > 0 ? (
        <div
          className={cn(
            'mt-8',
            viewMode === 'tiles'
              ? 'grid grid-cols-2 items-start gap-3 sm:gap-4 xl:grid-cols-3'
              : 'flex flex-col gap-3',
          )}
        >
          {attractions.map((attraction, index) => (
            <AttractionCard
              key={attraction.attractionId}
              attraction={attraction}
              viewMode={viewMode}
              index={index}
            />
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-4 w-full" aria-hidden />

      {attractionsQuery.isFetchingNextPage ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading more attractions…
        </p>
      ) : null}

      {!attractionsQuery.hasNextPage && attractions.length > 0 && !showAttractionsInitialLoad ? (
        <p className="mt-6 text-center text-xs font-medium text-neutral-400">
          Showing all {attractions.length} of {total} attractions
        </p>
      ) : null}
    </section>
  );
}
