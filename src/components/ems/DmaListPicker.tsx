import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Loader2, MapPin, Search, X } from 'lucide-react';
import type { ApiDmaMarket } from '@/api/companyApi';
import { fetchDmaMarketsByCity } from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { cleanDmaMarketLabel, dmaMarketFamilyKey } from '@/lib/dmaMarket';
import { richTextMatches } from './searchUtils';

export type DmaListPickerSort =
  | 'name-asc'
  | 'name-desc'
  | 'population-desc'
  | 'population-asc';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'population-desc', label: 'Population ↓' },
  { value: 'population-asc', label: 'Population ↑' },
] as const;

function formatPopulation(pop: number | null | undefined): string {
  if (pop == null || !Number.isFinite(pop)) return '—';
  return Number(pop).toLocaleString();
}

function formatDmaLabel(row: ApiDmaMarket): string {
  const name = cleanDmaMarketLabel(row.marketName);
  if (name) return name;
  return row.dmaid != null ? `DMA #${row.dmaid}` : '—';
}

/**
 * Market picker: search + sort, a collapsible city → DMA lookup, the current
 * selection as removable chips, and a scrollable list of selectable markets.
 */
export function DmaListPicker({
  rows,
  selectedIds,
  onToggle,
  onSelectMany,
  onClearAll,
  disabled = false,
  emptyMessage = 'No markets available.',
}: {
  rows: ApiDmaMarket[];
  selectedIds: number[];
  onToggle: (dmaid: number) => void;
  /** Adds these ids to selection (skipping ids already present). */
  onSelectMany: (dmaIds: number[]) => void;
  /** When provided, a "Clear all" action is offered next to the selection. */
  onClearAll?: () => void;
  disabled?: boolean;
  emptyMessage?: string;
}) {
  const [nameFilter, setNameFilter] = useState('');
  const [sortKey, setSortKey] = useState<DmaListPickerSort>('name-asc');
  const [cityInput, setCityInput] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityPanelOpen, setCityPanelOpen] = useState(true);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const cityQuery = useQuery({
    queryKey: ['dma-markets', 'by-city', citySearch] as const,
    queryFn: () => fetchDmaMarketsByCity(citySearch, 100),
    enabled: citySearch.length > 0,
    staleTime: 60_000,
  });

  const cityMatches = cityQuery.data ?? [];
  const cityMatchIdsInCatalog = useMemo(() => {
    const familyKeys = new Set(
      cityMatches
        .map((m) => dmaMarketFamilyKey(m.marketName))
        .filter((k) => k.length > 0),
    );
    if (familyKeys.size === 0) return [] as number[];
    return rows
      .filter((r) => familyKeys.has(dmaMarketFamilyKey(r.marketName)))
      .map((r) => r.dmaid);
  }, [cityMatches, rows]);

  const cityFilterActive =
    citySearch.length > 0 &&
    !cityQuery.isPending &&
    !cityQuery.isError &&
    cityMatches.length > 0;
  const cityMatchIdSet = useMemo(
    () => new Set(cityMatchIdsInCatalog),
    [cityMatchIdsInCatalog],
  );

  const filtered = useMemo(() => {
    const base = cityFilterActive
      ? rows.filter((r) => cityMatchIdSet.has(r.dmaid))
      : rows;
    const q = nameFilter.trim();
    if (!q) return base;
    return base.filter((r) =>
      richTextMatches([r.marketName, r.postalCode, r.dmaid], q),
    );
  }, [rows, nameFilter, cityFilterActive, cityMatchIdSet]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    switch (sortKey) {
      case 'name-desc':
        list.sort((a, b) => formatDmaLabel(b).localeCompare(formatDmaLabel(a), undefined, { sensitivity: 'base' }));
        break;
      case 'population-desc':
        list.sort((a, b) => {
          const av = a.population ?? -Infinity;
          const bv = b.population ?? -Infinity;
          if (av === bv) return formatDmaLabel(a).localeCompare(formatDmaLabel(b), undefined, { sensitivity: 'base' });
          return bv - av;
        });
        break;
      case 'population-asc':
        list.sort((a, b) => {
          const av = a.population ?? Infinity;
          const bv = b.population ?? Infinity;
          if (av === bv) return formatDmaLabel(a).localeCompare(formatDmaLabel(b), undefined, { sensitivity: 'base' });
          return av - bv;
        });
        break;
      case 'name-asc':
      default:
        list.sort((a, b) => formatDmaLabel(a).localeCompare(formatDmaLabel(b), undefined, { sensitivity: 'base' }));
    }
    return list;
  }, [filtered, sortKey]);

  /** Selected markets as chips, tolerating ids that are no longer in the catalog. */
  const selectedChips = useMemo(
    () =>
      selectedIds.map((id) => {
        const row = rows.find((r) => r.dmaid === id);
        return { id, label: row ? formatDmaLabel(row) : `DMA #${id}` };
      }),
    [selectedIds, rows],
  );

  const unselectedVisibleIds = useMemo(
    () => sorted.map((r) => r.dmaid).filter((id) => !selectedSet.has(id)),
    [sorted, selectedSet],
  );

  const runCitySearch = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setCitySearch(trimmed);
  };

  const clearCitySearch = () => {
    setCityInput('');
    setCitySearch('');
  };

  return (
    <div className="space-y-3.5">
      {/* Search */}
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Search markets by name, postal code, or ID"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search markets"
          className={[
            'w-full min-w-0 rounded-lg border border-border bg-surface py-2.5 pl-9 text-sm text-text-primary',
            'placeholder:text-text-muted outline-none focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15',
            'disabled:opacity-60',
            nameFilter ? 'pr-9' : 'pr-3',
          ].join(' ')}
        />
        {nameFilter && !disabled && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setNameFilter('')}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Sort + city lookup toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Sort markets" className="flex flex-wrap items-center gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSortKey(opt.value)}
                disabled={disabled}
                className={[
                  'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border border-border bg-elevated text-text-primary shadow-sm'
                    : 'border border-transparent text-text-secondary hover:bg-hover hover:text-text-primary',
                  disabled ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setCityPanelOpen((v) => !v)}
          aria-expanded={cityPanelOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm hover:border-ems-accent/50 hover:text-text-primary"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Find DMA by city
          {cityPanelOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </div>

      {/* City → DMA lookup */}
      {cityPanelOpen && (
        <div className="space-y-2.5 rounded-lg border border-ems-accent/25 bg-ems-accent/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ems-accent">
            Don&rsquo;t know the market? Look it up by any city inside it
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => {
                const next = e.target.value;
                setCityInput(next);
                if (!next.trim() && citySearch) setCitySearch('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runCitySearch();
                }
              }}
              placeholder="e.g. Schenectady, Sweetwater…"
              disabled={disabled}
              autoComplete="off"
              aria-label="City name"
              className="min-w-[10rem] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={runCitySearch}
              disabled={disabled || cityInput.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ems-accent px-4 py-2 text-sm font-medium text-background hover:bg-ems-accent/85 disabled:opacity-50"
            >
              {cityQuery.isFetching && cityQuery.fetchStatus === 'fetching' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Find
            </button>
            <button
              type="button"
              onClick={clearCitySearch}
              disabled={disabled || (cityInput.length === 0 && citySearch.length === 0)}
              className="inline-flex items-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:border-ems-accent/50 hover:text-text-primary disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          {citySearch && (
            <div className="text-[11px]">
              {cityQuery.isPending || cityQuery.isFetching ? (
                <p className="flex items-center gap-1.5 text-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Searching cities…
                </p>
              ) : cityQuery.isError ? (
                <p className="text-ems-coral">{friendlyApiError(cityQuery.error)}</p>
              ) : cityMatches.length === 0 ? (
                <p className="text-text-muted">
                  No DMA markets contain postal codes for &ldquo;{citySearch}&rdquo;. Try a different spelling, or
                  search by postal code above.
                </p>
              ) : (
                <p className="text-text-secondary">
                  Filtered to {cityMatchIdsInCatalog.length} market
                  {cityMatchIdsInCatalog.length === 1 ? '' : 's'} matching &ldquo;{citySearch}&rdquo;.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current selection */}
      {selectedChips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text-primary tabular-nums">
              {selectedChips.length} selected
            </p>
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                disabled={disabled}
                className="text-xs font-medium text-ems-accent hover:underline disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-ems-accent/30 bg-ems-accent/10 py-1 pl-3 pr-1.5 text-xs font-medium text-ems-accent"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => onToggle(chip.id)}
                  disabled={disabled}
                  aria-label={`Remove ${chip.label}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-ems-accent/20 disabled:opacity-50"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Counts + bulk select */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary tabular-nums">{sorted.length.toLocaleString()}</span>{' '}
          market{sorted.length === 1 ? '' : 's'}
        </p>
        {unselectedVisibleIds.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectMany(unselectedVisibleIds)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ems-accent hover:underline disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Select all matches
          </button>
        )}
      </div>

      {/* Market list */}
      <div className="max-h-[min(24rem,45vh)] space-y-1 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-text-muted">
            {rows.length === 0 ? emptyMessage : 'No markets match your search.'}
          </p>
        ) : (
          sorted.map((row) => {
            const checked = selectedSet.has(row.dmaid);
            return (
              <label
                key={row.dmaid}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  checked
                    ? 'border-ems-accent/40 bg-ems-accent/[0.08]'
                    : 'border-transparent hover:border-border hover:bg-hover/60',
                  disabled ? 'cursor-not-allowed opacity-60' : '',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(row.dmaid)}
                />
                <span
                  className={[
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-ems-accent/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-elevated',
                    checked ? 'border-ems-accent bg-ems-accent' : 'border-border bg-surface',
                  ].join(' ')}
                  aria-hidden
                >
                  {checked && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={[
                      'block break-words text-sm font-semibold',
                      checked ? 'text-ems-accent' : 'text-text-primary',
                    ].join(' ')}
                  >
                    {formatDmaLabel(row)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
                    {row.population != null && (
                      <span className="tabular-nums">Pop {formatPopulation(row.population)}</span>
                    )}
                    {row.nielsenRank != null && (
                      <span className="rounded bg-ems-accent/10 px-1.5 py-0.5 font-medium tabular-nums text-ems-accent">
                        #{row.nielsenRank}
                      </span>
                    )}
                    {row.postalCode && <span className="tabular-nums">Postal {row.postalCode}</span>}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
