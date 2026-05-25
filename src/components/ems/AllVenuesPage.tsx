/** All Venues — list + board from dbo.Venue plus optional complex membership. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, LayoutGrid, LayoutList, Loader2, RotateCcw } from 'lucide-react';
import { Select2 } from './Select2';
import {
  getPageParams,
  getPageRange,
  getTotalPages,
  PAGE_SIZE,
  type PageSizeOption,
} from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';
import {
  allVenuesQueryKey,
  allVenuesSuggestionRowsQueryKey,
  ALL_VENUES_SUGGESTION_CACHE_LIMIT,
  fetchAllVenues,
  type ApiAllVenueRow,
} from '@/api/venueDirectoryApi';
import {
  entertainmentComplexCompaniesQueryKey,
  fetchEntertainmentComplexCompanyRows,
  fetchDmaMarketsPage,
  fetchLookups,
  type ApiDmaMarket,
} from '@/api/companyApi';

type ViewMode = 'list' | 'board';
const ALL_VENUES_SORT_STATE_STORAGE_KEY = 'iae-all-venues-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';

interface Props {
  onNavigate?: (view: string, data?: Record<string, unknown>) => void;
}

/** Label used in Venue DMA filter — one entry per DMA market name. */
function dmaFilterOptionLabel(x: ApiDmaMarket): string {
  const name = (x.marketName ?? '').trim();
  if (name) return name;
  return `DMA #${x.dmaid}`;
}

function entertainmentComplexChips(names: string | null) {
  if (!names?.trim()) return <span className="text-text-muted">—</span>;
  const parts = names.split(', ').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((label) => (
        <span
          key={label}
          className="inline-block max-w-[11rem] truncate rounded border border-border bg-elevated/40 px-1.5 py-0.5 text-xs text-text-primary"
          title={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function AllVenuesPage({ onNavigate }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [venueInput, setVenueInput] = useState('');
  const [venueSearchCommitted, setVenueSearchCommitted] = useState('');
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const venueSearchRef = useRef<HTMLDivElement>(null);
  const [complexId, setComplexId] = useState('');
  const [venueTypeId, setVenueTypeId] = useState('');
  const [dmaId, setDmaId] = useState('');
  type VenueSortCol = 'venue' | 'complex' | 'type' | 'capacity' | 'dma';
  const SORT_API: Record<VenueSortCol, string> = {
    venue: 'venue',
    complex: 'complex',
    type: 'type',
    capacity: 'capacity',
    dma: 'dma',
  };
  const [sortState, setSortState] = useState<{
    col: VenueSortCol;
    dir: 'asc' | 'desc';
  }>(() => {
    if (typeof window === 'undefined') return { col: 'venue', dir: 'asc' };
    try {
      if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
        return { col: 'venue', dir: 'asc' };
      }
      const raw = localStorage.getItem(ALL_VENUES_SORT_STATE_STORAGE_KEY);
      if (!raw) return { col: 'venue', dir: 'asc' };
      const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
      const validCols = new Set<VenueSortCol>(['venue', 'complex', 'type', 'capacity', 'dma']);
      const col =
        typeof parsed.col === 'string' && validCols.has(parsed.col as VenueSortCol)
          ? (parsed.col as VenueSortCol)
          : 'venue';
      const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
      return { col, dir };
    } catch {
      return { col: 'venue', dir: 'asc' };
    }
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (venueSearchRef.current && !venueSearchRef.current.contains(e.target as Node)) {
        setShowVenueSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
      localStorage.setItem(ALL_VENUES_SORT_STATE_STORAGE_KEY, JSON.stringify(sortState));
    } catch {
      /* ignore */
    }
  }, [sortState]);

  const lookupsQ = useQuery({
    queryKey: ['lookups', 'all-venues'],
    queryFn: fetchLookups,
    staleTime: 30 * 60_000,
  });

  const entertainmentComplexCompaniesQ = useQuery({
    queryKey: entertainmentComplexCompaniesQueryKey(),
    queryFn: fetchEntertainmentComplexCompanyRows,
    staleTime: 30 * 60_000,
  });

  const dmasQ = useQuery({
    queryKey: ['dmas', 'all-venues', 'paginated-all'],
    queryFn: async () => {
      const pageSize = 500;
      const all: ApiDmaMarket[] = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total && all.length < 25_000) {
        const chunk = await fetchDmaMarketsPage(offset, pageSize, '');
        all.push(...chunk.data);
        total = chunk.total;
        offset += chunk.data.length;
        if (chunk.data.length === 0) break;
      }
      return all;
    },
    staleTime: 30 * 60_000,
  });

  const complexOpts = useMemo(
    () =>
      (entertainmentComplexCompaniesQ.data ?? [])
        .map((c) => ({ value: String(c.companyId), label: c.companyName }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [entertainmentComplexCompaniesQ.data],
  );
  const venueTypeOpts = useMemo(() => {
    const vt = lookupsQ.data?.venueTypes ?? [];
    return vt
      .filter((x) => !/^qa[-\s]?type/i.test(x.venueTypeName))
      .map((x) => ({ value: String(x.venueTypeId), label: x.venueTypeName }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [lookupsQ.data?.venueTypes]);

  const filterParams = useMemo(
    () => ({
      q: venueSearchCommitted.trim() || undefined,
      complexCompanyId:
        complexId !== '' && Number.isFinite(Number(complexId))
          ? Number(complexId)
          : undefined,
      venueTypeId:
        venueTypeId !== '' && Number.isFinite(Number(venueTypeId))
          ? Number(venueTypeId)
          : undefined,
      dmaIds:
        dmaId !== '' && Number.isFinite(Number(dmaId)) ? [Number(dmaId)] : undefined,
      sortBy: SORT_API[sortState.col],
      sortDir: sortState.dir,
    }),
    [venueSearchCommitted, complexId, venueTypeId, dmaId, sortState.col, sortState.dir],
  );

  const venueSuggestionSourceOpts = useMemo(
    () => ({
      complexCompanyId:
        complexId !== '' && Number.isFinite(Number(complexId))
          ? Number(complexId)
          : undefined,
      venueTypeId:
        venueTypeId !== '' && Number.isFinite(Number(venueTypeId))
          ? Number(venueTypeId)
          : undefined,
      dmaIds:
        dmaId !== '' && Number.isFinite(Number(dmaId)) ? [Number(dmaId)] : undefined,
      sortBy: SORT_API[sortState.col],
      sortDir: sortState.dir,
    }),
    [complexId, venueTypeId, dmaId, sortState.col, sortState.dir],
  );

  const venueSuggestionRowsQuery = useQuery({
    queryKey: [
      ...allVenuesSuggestionRowsQueryKey(SORT_API[sortState.col], sortState.dir),
      complexId,
      venueTypeId,
      dmaId,
    ] as const,
    queryFn: () =>
      fetchAllVenues(0, ALL_VENUES_SUGGESTION_CACHE_LIMIT, venueSuggestionSourceOpts),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  const venueSearchSuggestions = useMemo(() => {
    const q = venueInput.trim().toLowerCase();
    if (!q) return [];
    const names = (venueSuggestionRowsQuery.data?.data ?? [])
      .map((r) => (r.venueName ?? '').trim())
      .filter(Boolean);
    const dedup: string[] = [];
    for (const n of names) {
      if (!dedup.some((d) => d.toLowerCase() === n.toLowerCase())) dedup.push(n);
    }
    return dedup.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [venueInput, venueSuggestionRowsQuery.data]);

  const commitVenueSearch = useCallback(() => {
    setVenueSearchCommitted(venueInput.trim());
    setShowVenueSuggestions(false);
  }, [venueInput]);

  const hasActiveVenueFilters =
    venueInput.trim().length > 0 ||
    venueSearchCommitted.trim().length > 0 ||
    complexId !== '' ||
    venueTypeId !== '' ||
    dmaId !== '';

  const resetVenueFilters = useCallback(() => {
    setVenueInput('');
    setVenueSearchCommitted('');
    setShowVenueSuggestions(false);
    setComplexId('');
    setVenueTypeId('');
    setDmaId('');
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterParams]);

  const toggleVenueSort = useCallback((col: VenueSortCol) => {
    setSortState((s) => {
      if (s.col === col) return { col, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { col, dir: 'asc' };
    });
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const { offset, limit } = getPageParams(page, pageSize);
  const listQ = useQuery({
    queryKey: [
      ...allVenuesQueryKey,
      page,
      pageSize,
      filterParams,
    ] as const,
    queryFn: () => fetchAllVenues(offset, limit, filterParams),
  });

  const dmaOpts = useMemo(() => {
    // Deduplicate by market name — one entry per DMA area.
    // Normalize trailing punctuation and whitespace so near-duplicates like
    // "ABILENE-SWEETWATER" and "ABILENE-SWEETWATER." collapse into one entry.
    const byName = new Map<string, { value: string; label: string }>();
    const normalize = (s: string) =>
      s.trim().replace(/[\s.,:;]+$/g, '').replace(/\s+/g, ' ').toLowerCase();
    const addEntry = (dmaid: number, rawName: string | null) => {
      const name = (rawName ?? '').trim().replace(/[\s.,:;]+$/g, '');
      const key = normalize(name);
      if (!key) return;
      if (byName.has(key)) return;
      byName.set(key, { value: String(dmaid), label: name });
    };
    for (const x of dmasQ.data ?? []) addEntry(x.dmaid, x.marketName);
    for (const r of venueSuggestionRowsQuery.data?.data ?? []) {
      if (r.dmaId != null && Number.isFinite(r.dmaId) && r.dmaId > 0) {
        addEntry(r.dmaId, r.dmaMarketName);
      }
    }
    for (const r of listQ.data?.data ?? []) {
      if (r.dmaId != null && Number.isFinite(r.dmaId) && r.dmaId > 0) {
        addEntry(r.dmaId, r.dmaMarketName);
      }
    }
    return [...byName.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [dmasQ.data, venueSuggestionRowsQuery.data, listQ.data]);

  const total = listQ.data?.total ?? 0;
  const rows: ApiAllVenueRow[] = listQ.data?.data ?? [];
  const pageCount = getTotalPages(total, pageSize);
  const { rangeStart, rangeEnd } = getPageRange(page, total, pageSize);
  const loading = listQ.isPending || listQ.isFetching;
  const filtersLoading =
    lookupsQ.isPending ||
    entertainmentComplexCompaniesQ.isPending ||
    dmasQ.isPending;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-text-primary tracking-tight">All Venues</h1>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-w-0">
          <div ref={venueSearchRef} className="relative min-w-0">
            <label className="text-text-muted text-xs block mb-1">Venue</label>
            <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
              <input
                type="search"
                value={venueInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setVenueInput(v);
                  setShowVenueSuggestions(true);
                  if (!v.trim()) setVenueSearchCommitted('');
                }}
                onFocus={() => {
                  if (venueInput.trim()) setShowVenueSuggestions(true);
                }}
                onBlur={() => setShowVenueSuggestions(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitVenueSearch();
                  if (e.key === 'Escape') setShowVenueSuggestions(false);
                }}
                placeholder="Search by venue name"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
              />
              <button
                type="button"
                onClick={commitVenueSearch}
                className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors"
                title="Search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {showVenueSuggestions &&
            venueInput.trim().length >= 1 &&
            (venueSuggestionRowsQuery.isFetching ||
              venueSearchSuggestions.length > 0 ||
              venueSuggestionRowsQuery.isFetched) ? (
              <div
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
                onMouseDown={(e) => e.preventDefault()}
              >
                {venueSuggestionRowsQuery.isError ? (
                  <div className="px-3 py-2 text-sm text-ems-coral" role="alert">
                    Could not load venue suggestions.
                  </div>
                ) : null}
                {!venueSuggestionRowsQuery.isError && venueSuggestionRowsQuery.isFetching ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-muted" role="status">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
                    <span>Loading suggestions…</span>
                  </div>
                ) : null}
                {!venueSuggestionRowsQuery.isError &&
                !venueSuggestionRowsQuery.isFetching &&
                venueSearchSuggestions.length > 0
                  ? venueSearchSuggestions.map((suggestion, i) => (
                      <button
                        key={`${i}-${suggestion}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setVenueInput(suggestion);
                          setVenueSearchCommitted(suggestion);
                          setShowVenueSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))
                  : null}
                {!venueSuggestionRowsQuery.isError &&
                !venueSuggestionRowsQuery.isFetching &&
                venueSuggestionRowsQuery.isFetched &&
                venueSearchSuggestions.length === 0 ? (
                  <div className="px-3 py-2.5 text-sm text-text-muted">No matching venues</div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">Entertainment Complex</label>
            <div className={filtersLoading ? 'opacity-60 pointer-events-none' : ''}>
              <Select2
                options={complexOpts}
                value={complexId}
                onChange={setComplexId}
                allowClear
                placeholder="Choose an option"
                searchPlaceholder="Search entertainment complexes..."
              />
            </div>
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">Venue Type</label>
            <div className={filtersLoading ? 'opacity-60 pointer-events-none' : ''}>
              <Select2
                options={venueTypeOpts}
                value={venueTypeId}
                onChange={setVenueTypeId}
                allowClear
                placeholder="Choose an option"
                searchPlaceholder="Search types..."
              />
            </div>
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">Venue DMA</label>
            <div className={filtersLoading ? 'opacity-60 pointer-events-none' : ''}>
              <Select2
                options={dmaOpts}
                value={dmaId}
                onChange={setDmaId}
                allowClear
                placeholder="Choose an option"
                searchPlaceholder="Search markets..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 shrink-0 self-end">
          {hasActiveVenueFilters ? (
            <button
              type="button"
              onClick={resetVenueFilters}
              disabled={loading || filtersLoading}
              className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset search and filters"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
          ) : null}
          <button
            type="button"
            title="List view"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md border border-transparent transition-colors ${
              viewMode === 'list'
                ? 'bg-elevated text-ems-accent border-ems-accent/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
            aria-pressed={viewMode === 'list'}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Board view"
            onClick={() => setViewMode('board')}
            className={`p-2 rounded-md border border-transparent transition-colors ${
              viewMode === 'board'
                ? 'bg-elevated text-ems-accent border-ems-accent/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
            aria-pressed={viewMode === 'board'}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="relative border border-border rounded-lg overflow-hidden bg-surface">
          {loading ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px]"
              aria-live="polite"
            >
              <Loader2 className="h-7 w-7 text-ems-accent animate-spin" />
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-ems-accent text-xs font-semibold border-b border-border bg-elevated/30">
                  {(
                    [
                      { col: 'venue' as const, label: 'Venue Name' },
                      { col: 'complex' as const, label: 'Entertainment Complex' },
                      { col: 'type' as const, label: 'Venue Type' },
                      { col: 'capacity' as const, label: 'Capacity' },
                      { col: 'dma' as const, label: 'DMA' },
                    ] as const
                  ).map(({ col, label }) => {
                    const active = sortState.col === col;
                    return (
                      <th key={col} className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                          onClick={() => toggleVenueSort(col)}
                        >
                          {label}
                          {active &&
                            (sortState.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            ))}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-text-muted text-sm"
                    >
                      No venues match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.companyId}
                      className="border-b border-border/50 hover:bg-elevated/40 cursor-pointer"
                      title="Open in Companies"
                      onClick={() =>
                        onNavigate?.('companies', {
                          selectedCompanyId: r.companyId,
                        })
                      }
                    >
                      <td className="py-2.5 px-3 text-text-primary">{r.venueName || '—'}</td>
                      <td className="py-2.5 px-3 text-text-primary align-top">
                        {entertainmentComplexChips(r.entertainmentComplexNames)}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary">
                        {r.venueTypeName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary tabular-nums">
                        {r.seatingCapacity}
                      </td>
                      <td className="py-2.5 px-3 text-text-muted">
                        {r.dmaMarketName || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="relative min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="h-7 w-7 text-ems-accent animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-12">
              No venues match the current filters.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {rows.map((r) => (
                <li
                  key={r.companyId}
                  className="border border-border rounded-lg p-4 bg-surface shadow-sm cursor-pointer hover:bg-elevated/30 transition-colors"
                  title="Open in Companies"
                  onClick={() =>
                    onNavigate?.('companies', {
                      selectedCompanyId: r.companyId,
                    })
                  }
                >
                  <div className="text-sm font-medium text-text-primary line-clamp-2">
                    {r.venueName}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {entertainmentComplexChips(r.entertainmentComplexNames)}
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-text-primary">
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Venue Type</dt>
                      <dd>{r.venueTypeName || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Capacity</dt>
                      <dd className="tabular-nums">{r.seatingCapacity}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">DMA</dt>
                      <dd className="text-right line-clamp-2">{r.dmaMarketName || '—'}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total}
            </span>
            <span className="inline-flex items-center gap-x-1.5 text-text-secondary">
              <span aria-hidden>·</span>
              <PageSizeSelect
                value={pageSize}
                onChange={setPageSize}
                disabled={loading}
              />
              <span>per page</span>
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-border text-text-primary disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-border text-text-primary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
