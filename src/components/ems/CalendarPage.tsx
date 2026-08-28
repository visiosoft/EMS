import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  MapPin,
} from 'lucide-react';
import { StatusBadge } from './Primitives';
import {
  fetchPerformances,
  fetchPerformancesPaged,
  type ApiPerformanceCalendarRow,
} from '@/api/performancesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  getPageParams,
  getTotalPages,
  getPageRange,
  PAGE_SIZE,
  type PageSizeOption,
  isAllPageSize,
} from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}
const CALENDAR_LIST_SORT_STATE_STORAGE_KEY = 'iae-calendar-list-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';
const CALENDAR_DATE_TYPES_STORAGE_KEY = 'iae-calendar-date-types-v1';

// ─── Milestone date types ─────────────────────────────────────────────────────

/** Which Engagement Profile milestone dates the Calendar can display, in display order. */
type DateTypeId = 'announcement' | 'presaleStart' | 'presaleEnd' | 'onSale' | 'show';

const DATE_TYPE_ORDER: DateTypeId[] = [
  'announcement',
  'presaleStart',
  'presaleEnd',
  'onSale',
  'show',
];

/**
 * Fixed colours per milestone type so users can tell dates apart at a glance,
 * regardless of engagement status. `tint` + `bar` render the chip/card look:
 * a soft wash with a solid colour rule down the left edge.
 */
const DATE_TYPE_CONFIG: Record<
  DateTypeId,
  {
    /** Full name — tooltips and the day-detail card eyebrow. */
    label: string;
    /** Compact name — grid chips and filter pills. */
    shortLabel: string;
    tint: string;
    bar: string;
    text: string;
    dot: string;
    /** Tinted wash + border for an active filter pill. */
    pill: string;
  }
> = {
  announcement: {
    label: 'Announcement Date',
    shortLabel: 'Announcement',
    tint: 'bg-ems-purple-dim',
    bar: 'border-l-ems-purple',
    text: 'text-ems-purple',
    dot: 'bg-ems-purple',
    pill: 'bg-ems-purple-dim border-ems-purple/40 text-ems-purple',
  },
  presaleStart: {
    label: 'Presale Start Date',
    shortLabel: 'Presale start',
    tint: 'bg-ems-blue-dim',
    bar: 'border-l-ems-blue',
    text: 'text-ems-blue',
    dot: 'bg-ems-blue',
    pill: 'bg-ems-blue-dim border-ems-blue/40 text-ems-blue',
  },
  presaleEnd: {
    label: 'Presale End Date',
    shortLabel: 'Presale end',
    tint: 'bg-ems-amber-dim',
    bar: 'border-l-ems-amber',
    text: 'text-ems-amber',
    dot: 'bg-ems-amber',
    pill: 'bg-ems-amber-dim border-ems-amber/40 text-ems-amber',
  },
  onSale: {
    label: 'On Sale Date',
    shortLabel: 'On sale',
    tint: 'bg-ems-green-dim',
    bar: 'border-l-ems-green',
    text: 'text-ems-green',
    dot: 'bg-ems-green',
    pill: 'bg-ems-green-dim border-ems-green/40 text-ems-green',
  },
  show: {
    label: 'Engagement / Show Date',
    shortLabel: 'Show date',
    tint: 'bg-ems-coral-dim',
    bar: 'border-l-ems-coral',
    text: 'text-ems-coral',
    dot: 'bg-ems-coral',
    pill: 'bg-ems-coral-dim border-ems-coral/40 text-ems-coral',
  },
};

interface CalendarEntry {
  key: string;
  type: DateTypeId;
  date: string; // YYYY-MM-DD
  perf: ApiPerformanceCalendarRow;
}

function dateForType(p: ApiPerformanceCalendarRow, type: DateTypeId): string | null {
  switch (type) {
    case 'announcement': return p.announcementDate;
    case 'presaleStart': return p.presaleStartDate;
    case 'presaleEnd': return p.presaleEndDate;
    case 'onSale': return p.onSaleDate;
    case 'show': return p.performanceDate;
  }
}

function formatShortDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * One entry per (milestone type, performance) with a populated date, filtered to active types.
 * Engagement-level dates (announcement) are de-duplicated per engagement + date so a multi-
 * performance engagement doesn't repeat the same milestone on the same day.
 */
function buildCalendarEntries(
  perfs: ApiPerformanceCalendarRow[],
  activeTypes: Set<DateTypeId>,
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const seen = new Set<string>();
  for (const p of perfs) {
    for (const type of DATE_TYPE_ORDER) {
      if (!activeTypes.has(type)) continue;
      const date = dateForType(p, type);
      if (!date) continue;
      const dedupeKey = `${type}|${p.engagementId}|${date}`;
      if (type !== 'show' && seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push({ key: `${type}-${p.performanceId}`, type, date, perf: p });
    }
  }
  return entries;
}

// ─── Status colour map ────────────────────────────────────────────────────────

/** Engagement visibility only — matches dbo/API canonical values. */
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; solid: string; pill: string }
> = {
  Unknown: { bg: 'bg-elevated       border-border',          text: 'text-text-secondary', dot: 'bg-text-muted',  solid: 'bg-text-muted border-text-muted',   pill: 'bg-elevated border-border text-text-secondary' },
  Private: { bg: 'bg-ems-purple-dim border-ems-purple/30',  text: 'text-ems-purple',     dot: 'bg-ems-purple',   solid: 'bg-ems-purple border-ems-purple',   pill: 'bg-ems-purple-dim border-ems-purple/40 text-ems-purple' },
  Public:  { bg: 'bg-ems-green-dim  border-ems-green/30',   text: 'text-ems-green',      dot: 'bg-ems-green',    solid: 'bg-ems-green border-ems-green',     pill: 'bg-ems-green-dim border-ems-green/40 text-ems-green' },
};

const ENGAGEMENT_VISIBILITY_STATUSES = ['Unknown', 'Private', 'Public'] as const;

function cfgFor(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.Unknown;
}

/** Map a calendar row to canonical engagement visibility for filters and styling. */
function engagementVisibilityKey(p: ApiPerformanceCalendarRow): string {
  const raw = (p.engagementStatus || p.performanceStatus || 'Unknown').trim();
  const lower = raw.toLowerCase();
  // TicketingStatus values are now long (e.g. "Private (Not Announced)",
  // "Public (On-Sale)"); match by prefix so both legacy and new values resolve.
  if (lower.startsWith('private')) return 'Private';
  if (lower.startsWith('public')) return 'Public';
  if (lower.startsWith('unknown') || lower === '') return 'Unknown';
  return 'Unknown';
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function entryLabel(p: ApiPerformanceCalendarRow): string {
  return p.attractionName ?? p.tourName ?? 'Engagement';
}

/** Grid chip line 1 — prefer attraction name, else tour. */
function gridEntryAttraction(p: ApiPerformanceCalendarRow): string {
  const a = p.attractionName?.trim();
  if (a) return a;
  const t = p.tourName?.trim();
  if (t) return t;
  return 'Engagement';
}

/** Grid chip line 2 — city, state (or em dash). */
function gridEntryCityState(p: ApiPerformanceCalendarRow): string {
  const loc = [p.city, p.stateProvince]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(', ');
  return loc || '—';
}

/** One filter group in the toolbar card: a small caps title, All/None links, and a row of pills. */
function FilterGroup({
  title,
  onAll,
  onNone,
  className = '',
  children,
}: {
  title: string;
  onAll: () => void;
  onNone: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex-1 min-w-0 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-muted">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[11px] shrink-0">
          <button type="button" onClick={onAll} className="text-ems-accent hover:underline">
            All
          </button>
          <span className="text-border" aria-hidden>|</span>
          <button
            type="button"
            onClick={onNone}
            className="text-text-muted hover:text-text-primary hover:underline"
          >
            None
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Toggle pill — carries its own colour family (tinted wash, matching border and
 * label) when on; dashed outline + hollow dot when off.
 */
function FilterPill({
  label,
  active,
  dotClass,
  pillClass,
  onToggle,
}: {
  label: string;
  active: boolean;
  dotClass: string;
  pillClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-2.5 text-xs font-medium transition-colors ${
        active
          ? `${pillClass} hover:opacity-80`
          : 'border-dashed border-border/70 text-text-muted hover:bg-hover hover:text-text-secondary'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? dotClass : 'bg-transparent ring-1 ring-inset ring-text-muted'
        }`}
        aria-hidden
      />
      {label}
    </button>
  );
}

function CalendarListTableSkeleton({ rowCount = PAGE_SIZE }: { rowCount?: number }) {
  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden min-h-[22rem]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 border-b border-border bg-surface/40">
        <Loader2 className="h-10 w-10 text-ems-accent animate-spin shrink-0" aria-hidden />
        <div className="text-center max-w-sm space-y-1">
          <p className="text-sm font-semibold text-text-primary">Loading performances</p>
          <p className="text-xs text-text-muted leading-relaxed">
            Fetching {rowCount} rows from the server…
          </p>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-clip">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border bg-surface">
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Time</th>
              <th className="text-left py-2.5 px-3">Attraction</th>
              <th className="text-left py-2.5 px-3">Tour</th>
              <th className="text-left py-2.5 px-3">Venue</th>
              <th className="text-left py-2.5 px-3">City</th>
              <th className="text-left py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className="py-3 px-3">
                    <Skeleton className="h-4 w-full max-w-[7rem] bg-muted/80" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export function CalendarPage({ onNavigate }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());      // 0-based
  const [year,  setYear]  = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(ENGAGEMENT_VISIBILITY_STATUSES),
  );
  const [activeDateTypes, setActiveDateTypes] = useState<Set<DateTypeId>>(() => {
    if (typeof window === 'undefined') return new Set(DATE_TYPE_ORDER);
    try {
      const raw = localStorage.getItem(CALENDAR_DATE_TYPES_STORAGE_KEY);
      if (!raw) return new Set(DATE_TYPE_ORDER);
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set(DATE_TYPE_ORDER);
      const valid = parsed.filter((x): x is DateTypeId =>
        (DATE_TYPE_ORDER as string[]).includes(x as string),
      );
      return valid.length > 0 ? new Set(valid) : new Set(DATE_TYPE_ORDER);
    } catch {
      return new Set(DATE_TYPE_ORDER);
    }
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  type CalendarListSortCol = 'date' | 'attraction' | 'tour' | 'venue' | 'city' | 'status';
  const [listSort, setListSort] = useState<{
    col: CalendarListSortCol;
    dir: 'asc' | 'desc';
  }>(() => {
    if (typeof window === 'undefined') return { col: 'date', dir: 'asc' };
    try {
      if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
        return { col: 'date', dir: 'asc' };
      }
      const raw = localStorage.getItem(CALENDAR_LIST_SORT_STATE_STORAGE_KEY);
      if (!raw) return { col: 'date', dir: 'asc' };
      const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
      const validCols = new Set<CalendarListSortCol>([
        'date',
        'attraction',
        'tour',
        'venue',
        'city',
        'status',
      ]);
      const col =
        typeof parsed.col === 'string' && validCols.has(parsed.col as CalendarListSortCol)
          ? (parsed.col as CalendarListSortCol)
          : 'date';
      const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
      return { col, dir };
    } catch {
      return { col: 'date', dir: 'asc' };
    }
  });

  const visibilityKey = useMemo(
    () => [...activeStatuses].sort().join(','),
    [activeStatuses],
  );
  const visibilityForApi = useMemo(() => Array.from(activeStatuses), [activeStatuses]);

  const gridQuery = useQuery({
    queryKey: ['performances', 'grid', year, month + 1],
    queryFn: () => fetchPerformances(year, month + 1),
    enabled: viewMode === 'grid',
    staleTime: 2 * 60 * 1000,
  });

  const { offset: listOffset, limit: listLimit } = getPageParams(listPage, listPageSize);

  const toggleListSort = useCallback((col: CalendarListSortCol) => {
    setListSort((s) =>
      s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    );
    setListPage(1);
  }, []);

  const listQuery = useQuery({
    queryKey: [
      'performances',
      'list',
      year,
      month + 1,
      listPage,
      listPageSize,
      visibilityKey,
      listOffset,
      listLimit,
      listSort.col,
      listSort.dir,
    ],
    queryFn: () =>
      fetchPerformancesPaged(year, month + 1, listOffset, listLimit, visibilityForApi, {
        sortBy: listSort.col,
        sortDir: listSort.dir,
      }),
    enabled: viewMode === 'list' && activeStatuses.size > 0,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const listTotal = listQuery.data?.total ?? 0;
  const listRows = listQuery.data?.data ?? [];
  const listPageCount = getTotalPages(listTotal, listPageSize);
  const listPageClamped = Math.min(listPage, listPageCount);
  const { rangeStart: listRangeStart, rangeEnd: listRangeEnd } = getPageRange(
    listPageClamped,
    listTotal,
    listPageSize,
  );
  const listLoading = listQuery.isPending || listQuery.isFetching;
  const gridLoading = gridQuery.isPending || gridQuery.isFetching;

  useEffect(() => {
    setListPage(1);
  }, [year, month, visibilityKey]);

  useEffect(() => {
    setListPage(1);
  }, [listPageSize]);

  useEffect(() => {
    try {
      if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
      localStorage.setItem(CALENDAR_LIST_SORT_STATE_STORAGE_KEY, JSON.stringify(listSort));
    } catch {
      /* ignore */
    }
  }, [listSort]);

  useEffect(() => {
    if (listPage > listPageCount) setListPage(listPageCount);
  }, [listPage, listPageCount]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
    setSelectedDay(null);
  };

  const toggleStatus = (s: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearAllStatuses = () => setActiveStatuses(new Set());
  const selectAllStatuses = () => setActiveStatuses(new Set(ENGAGEMENT_VISIBILITY_STATUSES));

  const toggleDateType = (type: DateTypeId) => {
    setActiveDateTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const clearAllDateTypes = () => setActiveDateTypes(new Set());
  const selectAllDateTypes = () => setActiveDateTypes(new Set(DATE_TYPE_ORDER));

  useEffect(() => {
    try {
      localStorage.setItem(
        CALENDAR_DATE_TYPES_STORAGE_KEY,
        JSON.stringify([...activeDateTypes]),
      );
    } catch {
      /* ignore */
    }
  }, [activeDateTypes]);

  const performances = gridQuery.data ?? [];

  // Filter by active status filters (use engagementStatus or performanceStatus)
  const visiblePerfs = useMemo(() => {
    return performances.filter((p) => activeStatuses.has(engagementVisibilityKey(p)));
  }, [performances, activeStatuses]);

  // One entry per active milestone-date type per performance
  const visibleEntries = useMemo(
    () => buildCalendarEntries(visiblePerfs, activeDateTypes),
    [visiblePerfs, activeDateTypes],
  );

  // Map day → milestone-date entries
  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of visibleEntries) {
      const d = new Date(entry.date + 'T12:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(entry);
      }
    }
    return map;
  }, [visibleEntries, year, month]);

  /** How many milestone dates actually land inside the visible month grid. */
  const shownDateCount = useMemo(
    () => [...byDay.values()].reduce((n, entries) => n + entries.length, 0),
    [byDay],
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();

  const selectedDayEntries = selectedDay != null ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Calendar</h1>
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-ems-accent text-background'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              {mode === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {/* Source note (grid view) */}
      {!gridLoading && viewMode === 'grid' && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-text-muted">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Dates are based on information from the Engagement Profile.
        </p>
      )}
      
      {/* Month toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-hover hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={goToday}
          className="h-7 rounded-md border border-border px-2.5 text-xs font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
        >
          Today
        </button>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-hover hover:text-text-primary"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <span className="ml-1.5 text-base font-semibold text-text-primary">
          {MONTH_NAMES[month]} {year}
        </span>
        {(gridQuery.isFetching || listQuery.isFetching) && (
          <Loader2 className="h-4 w-4 animate-spin text-ems-accent" aria-hidden />
        )}
        <span className="ml-auto text-xs text-text-muted tabular-nums">
          {viewMode === 'grid'
            ? `${shownDateCount.toLocaleString()} date${shownDateCount === 1 ? '' : 's'} shown`
            : `${listTotal.toLocaleString()} performance${listTotal === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Filters — milestone date types (grid only) beside engagement visibility */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col lg:flex-row">
          {viewMode === 'grid' && (
            <FilterGroup
              title="Show on Calendar"
              onAll={selectAllDateTypes}
              onNone={clearAllDateTypes}
              className="border-b border-border lg:border-b-0 lg:border-r"
            >
              {DATE_TYPE_ORDER.map((type) => {
                const cfg = DATE_TYPE_CONFIG[type];
                return (
                  <FilterPill
                    key={type}
                    label={cfg.shortLabel}
                    dotClass={cfg.dot}
                    pillClass={cfg.pill}
                    active={activeDateTypes.has(type)}
                    onToggle={() => toggleDateType(type)}
                  />
                );
              })}
            </FilterGroup>
          )}
          <FilterGroup
            title="Engagement Visibility"
            onAll={selectAllStatuses}
            onNone={clearAllStatuses}
            className={viewMode === 'grid' ? 'lg:max-w-sm' : ''}
          >
            {ENGAGEMENT_VISIBILITY_STATUSES.map((s) => (
              <FilterPill
                key={s}
                label={s}
                dotClass={cfgFor(s).dot}
                pillClass={cfgFor(s).pill}
                active={activeStatuses.has(s)}
                onToggle={() => toggleStatus(s)}
              />
            ))}
          </FilterGroup>
        </div>
      </div>

      {/* Error */}
      {(gridQuery.isError || listQuery.isError) && (
        <div className="text-sm text-ems-coral border border-ems-coral/30 rounded px-3 py-2 bg-ems-coral-dim">
          Could not load performances:{' '}
          {friendlyApiError((gridQuery.error ?? listQuery.error) as Error)}
        </div>
      )}

      {/* Grid loading */}
      {gridLoading && viewMode === 'grid' && (
        <div className="flex items-center justify-center py-20 text-text-muted gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-ems-accent" />
          <span className="text-sm">Loading performances…</span>
        </div>
      )}

      {/* Grid view */}
      {!gridLoading && viewMode === 'grid' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="px-2 py-2 text-left text-[11px] font-medium text-text-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month start */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-border/40 min-h-[7rem] bg-surface/30" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEntries = byDay.get(day) ?? [];
              const isToday = day === todayDate && month === todayMonth && year === todayYear;
              const isSelected = day === selectedDay;
              const colIndex = (firstDayOfWeek + i) % 7;
              const isLastCol = colIndex === 6;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative min-h-[7rem] border-b ${isLastCol ? '' : 'border-r'} border-border/40 p-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-ems-accent/[0.07] ring-1 ring-inset ring-ems-accent'
                      : 'hover:bg-hover/60'
                  }`}
                >
                  <div
                    className={`mb-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 text-[11px] font-semibold ${
                      isToday ? 'bg-ems-accent text-background' : 'text-text-secondary'
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => {
                      const { perf: p, type } = entry;
                      const cfg = DATE_TYPE_CONFIG[type];
                      const venue = p.venueName ?? p.venueCompanyName ?? '—';
                      const label = gridEntryAttraction(p);
                      return (
                        <div
                          key={entry.key}
                          onClick={(e) => { e.stopPropagation(); onNavigate('engagement-detail', { engagementId: p.engagementId }); }}
                          className={`truncate rounded-sm border-l-2 ${cfg.bar} ${cfg.tint} px-1.5 py-1 text-[10px] leading-tight cursor-pointer transition-opacity hover:opacity-80`}
                          title={`${cfg.label}: ${label} · ${gridEntryCityState(p)} · ${venue}${type === 'show' ? ' · ' + formatTime12(p.performanceTime) : ''}`}
                        >
                          <span className={`font-semibold ${cfg.text}`}>{cfg.shortLabel}:</span>{' '}
                          <span className="text-text-primary">{label}</span>
                        </div>
                      );
                    })}
                    {dayEntries.length > 3 && (
                      <div className="px-1 text-[10px] font-medium text-text-muted">
                        +{dayEntries.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && listLoading && (
        <CalendarListTableSkeleton rowCount={isAllPageSize(listPageSize) ? PAGE_SIZE : listPageSize} />
      )}

      {viewMode === 'list' && !listLoading && (
        <>
          <div className="bg-card border border-border rounded-lg overflow-x-auto overflow-y-clip">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  {(
                    [
                      { col: 'date' as const, label: 'Date' },
                      { col: null, label: 'Time' },
                      { col: 'attraction' as const, label: 'Attraction' },
                      { col: 'tour' as const, label: 'Tour' },
                      { col: 'venue' as const, label: 'Venue' },
                      { col: 'city' as const, label: 'City' },
                      { col: 'status' as const, label: 'Status' },
                    ] as const
                  ).map((h) =>
                    h.col == null ? (
                      <th key="time" className="text-left py-2.5 px-3">
                        {h.label}
                      </th>
                    ) : (
                      <th key={h.col} className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                          onClick={() => toggleListSort(h.col)}
                        >
                          {h.label}
                          {listSort.col === h.col &&
                            (listSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {listRows.length === 0 && !listQuery.isError && (
                  <tr>
                    <td colSpan={7} className="py-12 px-3 text-center text-sm text-text-muted">
                      No performances in {MONTH_NAMES[month]} {year}
                      {activeStatuses.size > 0 &&
                      activeStatuses.size < ENGAGEMENT_VISIBILITY_STATUSES.length
                        ? ' for the selected filters.'
                        : '.'}
                    </td>
                  </tr>
                )}
                {listRows.map((p) => (
                  <tr
                    key={p.performanceId}
                    className="border-b border-border/50 hover:bg-hover cursor-pointer"
                    onClick={() => onNavigate('engagement-detail', { engagementId: p.engagementId })}
                  >
                    <td className="py-2.5 px-3 text-text-secondary text-xs tabular-nums whitespace-nowrap">
                      {new Date(p.performanceDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary text-xs tabular-nums">
                      {formatTime12(p.performanceTime)}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary font-medium">{p.attractionName ?? '—'}</td>
                    <td className="py-2.5 px-3 text-text-secondary">{p.tourName ?? '—'}</td>
                    <td className="py-2.5 px-3 text-text-secondary">
                      {p.venueName ?? p.venueCompanyName ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary text-xs">
                      {[p.city, p.stateProvince].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={engagementVisibilityKey(p)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {listTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
              <p className="tabular-nums">
                Showing{' '}
                <span className="text-text-primary font-medium">
                  {listRangeStart}–{listRangeEnd}
                </span>{' '}
                of <span className="text-text-primary font-medium">{listTotal.toLocaleString()}</span>
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-text-muted">
                  <span aria-hidden>·</span>
                  <PageSizeSelect
                    value={listPageSize}
                    onChange={setListPageSize}
                    disabled={listQuery.isFetching}
                  />
                  <span>per page</span>
                </span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={listPageClamped <= 1 || listQuery.isFetching}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="text-text-muted tabular-nums px-1">
                  Page {listPageClamped} / {listPageCount}
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={listPageClamped >= listPageCount || listQuery.isFetching}
                  onClick={() => setListPage((p) => Math.min(listPageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected day detail — one card per milestone date on that day */}
      {selectedDay !== null && selectedDayEntries.length > 0 && viewMode === 'grid' && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {MONTH_NAMES[month]} {selectedDay}, {year}
            </h3>
            <span className="text-xs text-text-muted tabular-nums">
              {selectedDayEntries.length} date{selectedDayEntries.length > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="ml-auto text-xs text-text-muted hover:text-text-primary hover:underline"
            >
              Close
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedDayEntries.map((entry) => {
              const { perf: p, type } = entry;
              const cfg = DATE_TYPE_CONFIG[type];
              const cityState = [p.city, p.stateProvince].filter(Boolean).join(', ');
              return (
                <div
                  key={entry.key}
                  onClick={() => onNavigate('engagement-detail', { engagementId: p.engagementId })}
                  className={`rounded-lg border border-border border-l-[3px] ${cfg.bar} ${cfg.tint} p-3 cursor-pointer transition-opacity hover:opacity-90`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
                      {cfg.shortLabel}
                    </span>
                    <StatusBadge status={engagementVisibilityKey(p)} />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-text-primary">{entryLabel(p)}</div>
                  {p.tourName && p.tourName !== p.attractionName && (
                    <div className="text-xs text-text-secondary mt-0.5">{p.tourName}</div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                    {type === 'show' && p.performanceTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" aria-hidden />
                        {formatTime12(p.performanceTime)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{p.venueName ?? p.venueCompanyName ?? '—'}</span>
                    </span>
                    {cityState && <span className="truncate">{cityState}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty grid state */}
      {!gridLoading && viewMode === 'grid' && shownDateCount === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/40 py-10 text-center text-sm text-text-muted">
          No dates to show for {MONTH_NAMES[month]} {year}
          {activeDateTypes.size === 0
            ? ' — turn on at least one date type above.'
            : activeStatuses.size === 0
              ? ' — turn on at least one engagement visibility above.'
              : '.'}
        </div>
      )}

     
    </div>
  );
}
