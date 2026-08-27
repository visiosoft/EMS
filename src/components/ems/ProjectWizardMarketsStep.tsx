import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { fetchDmaMarketsByCity, type ApiDmaMarket } from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { cleanDmaMarketLabel, dmaMarketFamilyKey } from '@/lib/dmaMarket';
import {
  deriveValidSelectedDmaIds,
  normalizePositiveIntId,
} from '@/lib/projectWizardDma';
import { richTextMatches } from './searchUtils';

const EMPTY_ROWS: ApiDmaMarket[] = [];

type SortField = 'name' | 'population';
type SortDir = 'asc' | 'desc';

const DEFAULT_SORT_DIR: Record<SortField, SortDir> = { name: 'asc', population: 'desc' };
const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'population', label: 'Population' },
];

function formatPopulation(population: number | null | undefined): string {
  if (population == null || !Number.isFinite(population)) return '—';
  return population.toLocaleString();
}

function formatDmaLabel(row: ApiDmaMarket): string {
  return cleanDmaMarketLabel(row.marketName) || (row.dmaid != null ? `DMA #${row.dmaid}` : '—');
}

function DmaListPicker({
  rows,
  selectedIds,
  onToggle,
  onSelectMany,
  onClearAll,
}: {
  rows: ApiDmaMarket[];
  selectedIds: number[];
  onToggle: (dmaid: number) => void;
  onSelectMany: (dmaIds: number[]) => void;
  onClearAll: () => void;
}) {
  const [nameFilter, setNameFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR.name);
  const [cityInput, setCityInput] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityPanelOpen, setCityPanelOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const cityQuery = useQuery({
    queryKey: ['dma-markets', 'by-city', citySearch] as const,
    queryFn: () => fetchDmaMarketsByCity(citySearch, 100),
    enabled: citySearch.length > 0,
    staleTime: 60_000,
  });
  const cityMatchIds = useMemo(() => {
    const marketFamilies = new Set(
      (cityQuery.data ?? []).map((row) => dmaMarketFamilyKey(row.marketName)).filter(Boolean),
    );
    return rows
      .filter((row) => marketFamilies.has(dmaMarketFamilyKey(row.marketName)))
      .map((row) => row.dmaid);
  }, [cityQuery.data, rows]);
  const cityFilterActive = citySearch.length > 0 && !cityQuery.isPending && !cityQuery.isError && cityMatchIds.length > 0;
  const filteredRows = useMemo(() => {
    const cityIds = new Set(cityMatchIds);
    const base = cityFilterActive ? rows.filter((row) => cityIds.has(row.dmaid)) : rows;
    const query = nameFilter.trim();
    return query ? base.filter((row) => richTextMatches([row.marketName, row.postalCode, row.dmaid], query)) : base;
  }, [cityFilterActive, cityMatchIds, nameFilter, rows]);
  const sortedRows = useMemo(() => {
    const rowsToSort = [...filteredRows];
    rowsToSort.sort((left, right) => {
      if (sortField === 'population') {
        const leftPopulation = left.population ?? (sortDir === 'asc' ? Infinity : -Infinity);
        const rightPopulation = right.population ?? (sortDir === 'asc' ? Infinity : -Infinity);
        if (leftPopulation !== rightPopulation) {
          return sortDir === 'asc' ? leftPopulation - rightPopulation : rightPopulation - leftPopulation;
        }
      }
      const comparison = formatDmaLabel(left).localeCompare(formatDmaLabel(right), undefined, { sensitivity: 'base' });
      return sortField === 'name' && sortDir === 'desc' ? -comparison : comparison;
    });
    return rowsToSort;
  }, [filteredRows, sortDir, sortField]);
  const selectedChips = useMemo(
    () => selectedIds.map((id) => ({ id, label: formatDmaLabel(rows.find((row) => row.dmaid === id) ?? { dmaid: id, marketName: '' } as ApiDmaMarket) })),
    [rows, selectedIds],
  );
  const unselectedVisibleIds = sortedRows.map((row) => row.dmaid).filter((id) => !selectedSet.has(id));

  const pickSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir(DEFAULT_SORT_DIR[field]);
  };
  const clearCitySearch = () => {
    setCityInput('');
    setCitySearch('');
  };

  return (
    <div className="space-y-3">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <input
          type="text"
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          placeholder="Search markets by name, postal code, or ID"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search markets"
          className="w-full min-w-0 rounded-lg border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15"
        />
        {nameFilter && <button type="button" aria-label="Clear search" onClick={() => setNameFilter('')} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"><X className="h-3.5 w-3.5" aria-hidden /></button>}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-text-muted">Sort markets</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Sort markets">
            {SORT_FIELDS.map((option) => {
              const active = sortField === option.value;
              const direction = active ? sortDir : DEFAULT_SORT_DIR[option.value];
              const Arrow = direction === 'asc' ? ArrowUp : ArrowDown;
              return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => pickSort(option.value)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'border-ems-accent/50 bg-ems-accent/[0.08] text-text-primary shadow-sm' : 'border-border bg-elevated text-text-secondary hover:border-ems-accent/40 hover:text-text-primary'}`}><span>{option.label}</span><Arrow className={`h-3.5 w-3.5 ${active ? 'text-ems-accent' : 'text-text-muted'}`} aria-hidden /></button>;
            })}
          </div>
          <button type="button" onClick={() => { setCityPanelOpen((open) => !open); if (cityPanelOpen) clearCitySearch(); }} aria-expanded={cityPanelOpen} className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm font-medium text-text-secondary shadow-sm hover:border-ems-accent/50 hover:text-text-primary"><MapPin className="h-3.5 w-3.5 text-ems-accent" aria-hidden />Find DMA by city{cityPanelOpen ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden />}</button>
        </div>
      </div>

      {cityPanelOpen && <div className="space-y-2.5 rounded-lg border border-ems-accent/25 bg-ems-accent/[0.06] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ems-accent">Find a DMA by any city inside it</p>
        <div className="flex flex-wrap gap-2">
          <input type="text" value={cityInput} onChange={(event) => { setCityInput(event.target.value); if (!event.target.value.trim()) setCitySearch(''); }} onKeyDown={(event) => { if (event.key === 'Enter' && cityInput.trim()) setCitySearch(cityInput.trim()); }} placeholder="e.g. Schenectady, Sweetwater" autoComplete="off" aria-label="City name" className="min-w-[10rem] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15" />
          <button type="button" onClick={() => setCitySearch(cityInput.trim())} disabled={!cityInput.trim()} className="rounded-lg bg-ems-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50">Find</button>
          <button type="button" onClick={clearCitySearch} className="rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-secondary">Clear</button>
        </div>
        {citySearch && <p className="text-[11px] text-text-secondary">{cityQuery.isPending ? 'Searching cities…' : cityQuery.isError ? friendlyApiError(cityQuery.error) : cityMatchIds.length ? `Filtered to ${cityMatchIds.length} market${cityMatchIds.length === 1 ? '' : 's'} matching “${citySearch}”.` : `No DMA markets contain postal codes for “${citySearch}”.`}</p>}
      </div>}

      {selectedChips.length > 0 && <div className="space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-text-primary tabular-nums">{selectedChips.length} selected</p><button type="button" onClick={onClearAll} className="text-xs font-medium text-ems-accent hover:underline">Clear all</button></div><div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">{selectedChips.map((chip) => <span key={chip.id} className="inline-flex items-center gap-1.5 rounded-full border border-ems-accent/30 bg-ems-accent/10 py-1 pl-3 pr-1.5 text-xs font-medium text-ems-accent">{chip.label}<button type="button" onClick={() => onToggle(chip.id)} aria-label={`Remove ${chip.label}`} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-ems-accent/20"><X className="h-3 w-3" aria-hidden /></button></span>)}</div></div>}

      <div className="flex items-center justify-between gap-2"><p className="text-xs text-text-muted"><span className="font-semibold text-text-primary tabular-nums">{sortedRows.length.toLocaleString()}</span> market{sortedRows.length === 1 ? '' : 's'}</p>{unselectedVisibleIds.length > 0 && <button type="button" onClick={() => onSelectMany(unselectedVisibleIds)} className="inline-flex items-center gap-1.5 text-xs font-medium text-ems-accent hover:underline"><Check className="h-3.5 w-3.5" aria-hidden />Select all matches</button>}</div>
      <div className="h-[min(22rem,40vh)] space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
        {sortedRows.length === 0 ? <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-text-muted">{rows.length === 0 ? 'No markets available.' : 'No markets match your search.'}</p> : sortedRows.map((row) => {
          const checked = selectedSet.has(row.dmaid);
          return (
            <button
              key={row.dmaid}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onToggle(row.dmaid)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${checked ? 'border-ems-accent/40 bg-ems-accent/[0.08]' : 'border-transparent hover:border-border hover:bg-hover/60'}`}
            >
              <span
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${checked ? 'border-ems-accent bg-ems-accent' : 'border-border bg-surface'}`}
                aria-hidden
              >
                {checked && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block break-words text-sm font-semibold ${checked ? 'text-ems-accent' : 'text-text-primary'}`}>
                  {formatDmaLabel(row)}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
                  {row.population != null && <span className="tabular-nums">Pop {formatPopulation(row.population)}</span>}
                  {row.nielsenRank != null && <span className="rounded bg-ems-accent/10 px-1.5 py-0.5 font-medium tabular-nums text-ems-accent">#{row.nielsenRank}</span>}
                  {row.postalCode && <span className="tabular-nums">Postal {row.postalCode}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectWizardMarketsStep({
  rows,
  isPending,
  isError,
  error,
  onRetry,
  selectedIds,
  onSelectedIdsChange,
  addToast,
}: {
  rows: ApiDmaMarket[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}) {
  const catalog = useMemo(() => rows ?? EMPTY_ROWS, [rows]);
  const validSelected = useMemo(() => deriveValidSelectedDmaIds(selectedIds), [selectedIds]);

  const toggle = (dmaid: number) => {
    const norm = normalizePositiveIntId(dmaid);
    if (norm == null) {
      addToast(
        'This market has no valid ID. Refresh the list or recreate the DMA in Settings → Lookup tables.',
        'error',
      );
      return;
    }
    const next = new Set(validSelected);
    if (next.has(norm)) {
      next.delete(norm);
    } else {
      next.add(norm);
    }
    onSelectedIdsChange([...next].sort((a, b) => a - b));
  };

  const selectMany = (ids: number[]) => {
    const next = new Set(validSelected);
    for (const id of ids) {
      const norm = normalizePositiveIntId(id);
      if (norm != null) next.add(norm);
    }
    onSelectedIdsChange([...next].sort((a, b) => a - b));
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted py-8 justify-center border border-dashed border-border rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" aria-hidden />
        <span role="status">Loading DMA markets…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-ems-coral/40 bg-ems-coral/10 px-3 py-3 text-sm text-text-primary space-y-2">
        <p className="font-medium">Could not load DMA markets</p>
        <p className="text-xs text-text-muted break-words">{friendlyApiError(error)}</p>
        <button
          type="button"
          className="text-sm font-medium text-ems-accent hover:underline"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 px-3 py-6 text-sm text-text-muted text-center">
        No DMA markets are available. Add markets under Settings → Lookup tables → DMA, then retry.
      </div>
    );
  }

  const orphanSelection = validSelected.filter((id) => !catalog.some((r) => r.dmaid === id));

  return (
    <div className="space-y-3">
      {orphanSelection.length > 0 && (
        <div className="rounded-lg border border-ems-amber/50 bg-ems-amber/10 px-3 py-2 text-xs text-text-primary">
          {orphanSelection.length} selected market{orphanSelection.length === 1 ? '' : 's'} no longer appear in
          the list (the catalog may have refreshed). Clear and re-select, or click Retry to reload.
        </div>
      )}
      <DmaListPicker
        rows={catalog}
        selectedIds={validSelected}
        onToggle={toggle}
        onSelectMany={selectMany}
        onClearAll={() => onSelectedIdsChange([])}
      />
    </div>
  );
}

