import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select2, Select2Multi } from './Select2';
import {
  fetchDailySalesByPerformance,
  updateDailySales,
  DAILY_SALES_SUGGESTION_PAGE_SIZE,
  type ApiPerformanceSalesRow,
  type UpdateDailySalesPayload,
} from '@/api/dailySalesApi';
import { fetchAttractions } from '@/api/attractionToursApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { validateDailySalesPerformanceDates } from '@/lib/dailySalesPerformanceDateValidation';
import { invalidateSalesCapacityRelatedQueries } from '@/api/cacheHelpers';
import { fetchEngagementIaeContactLookups } from '@/api/engagementApi';
import { PAGE_SIZE, PAGE_SIZE_ALL, type PageSizeOption, isAllPageSize, toPageSize } from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  dailySales?: unknown; engagements?: unknown; tours?: unknown;
  attractions?: unknown; companies?: unknown; onUpdateDailySales?: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDateHeader(iso: string): string {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateFull(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmt12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function validateField(val: string, field: 'tickets' | 'revenue'): string | null {
  if (!val.trim()) return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) {
    return `${field === 'tickets' ? 'Tickets' : 'Revenue'} must be a finite number that is zero or greater.`;
  }
  if (field === 'tickets' && !Number.isInteger(n)) {
    return 'Tickets must be a whole number (no decimals).';
  }
  return null;
}

/** Local calendar YYYY-MM-DD (for default "as of" date). */
function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdAddDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

const DEFAULT_DAILY_SALES_LEAD_SORT = { col: 'date' as const, dir: 'asc' as const };
const DAILY_SALES_ATTRACTION_FILTER_LIMIT = 10_000;
const EMPTY_DAILY_SALES_ROWS: ApiPerformanceSalesRow[] = [];
const EMPTY_DAILY_SALES_ATTRACTIONS: Array<{ attractionId: number; attractionName: string }> = [];

/** Sits on the top-right of the daily sales datatable card. */
function ReportingAsOfBar({
  asOfDate,
  onAsOfDateChange,
  onResetTableLayout,
  disabled,
  inputInvalid,
}: {
  asOfDate: string;
  onAsOfDateChange: (next: string) => void;
  onResetTableLayout?: () => void;
  disabled?: boolean;
  /** Highlights border when "Reporting as of" fails validation. */
  inputInvalid?: boolean;
}) {
  const inputClass =
    'h-9 w-[10.5rem] shrink-0 rounded-md border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 ' +
    (inputInvalid
      ? 'border-ems-coral focus:ring-ems-coral/25 focus:border-ems-coral'
      : 'border-border focus:ring-ems-accent/30 focus:border-ems-accent');
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/50 px-3 py-2.5 sm:px-4">
      {onResetTableLayout ? (
        <button
          type="button"
          onClick={onResetTableLayout}
          disabled={disabled}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-text-muted shadow-sm transition-all hover:border-ems-accent/35 hover:bg-ems-accent-dim/60 hover:text-ems-accent active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/30"
          title="Reset column layout"
          aria-label="Reset column layout to default"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : (
        <span className="h-8 w-8 shrink-0" aria-hidden />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <label htmlFor="daily-sales-asof" className="text-xs font-medium text-text-secondary whitespace-nowrap">
          Reporting as of
        </label>
        <input
          id="daily-sales-asof"
          type="date"
          className={inputClass}
          value={asOfDate}
          onChange={(e) => onAsOfDateChange(e.target.value || todayLocalYmd())}
          disabled={disabled}
          aria-invalid={inputInvalid ? true : undefined}
          aria-label="Select reporting date"
        />
      </div>
    </div>
  );
}

// ─── Reorderable lead columns (Attraction / Date / Venue / City) ─────────────

const DAILY_SALES_LEAD_COLUMN_ORDER_KEY = 'iae-daily-sales-lead-column-order-v2';

type DailySalesLeadColumnId = 'attraction' | 'date' | 'venue' | 'city';

const DEFAULT_DAILY_SALES_LEAD_COLUMNS: DailySalesLeadColumnId[] = [
  'attraction',
  'date',
  'venue',
  'city',
];

const DAILY_SALES_LEAD_COLUMN_LABELS: Record<DailySalesLeadColumnId, string> = {
  attraction: 'Attraction',
  date: 'Date',
  venue: 'Venue',
  city: 'City',
};

function loadDailySalesLeadColumnOrder(): DailySalesLeadColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_DAILY_SALES_LEAD_COLUMNS;
  try {
    const raw = localStorage.getItem(DAILY_SALES_LEAD_COLUMN_ORDER_KEY);
    if (!raw) return DEFAULT_DAILY_SALES_LEAD_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_DAILY_SALES_LEAD_COLUMNS;
    const need = new Set<DailySalesLeadColumnId>(DEFAULT_DAILY_SALES_LEAD_COLUMNS);
    const out: DailySalesLeadColumnId[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && need.has(x as DailySalesLeadColumnId)) {
        out.push(x as DailySalesLeadColumnId);
        need.delete(x as DailySalesLeadColumnId);
      }
    }
    for (const id of DEFAULT_DAILY_SALES_LEAD_COLUMNS) {
      if (need.has(id)) {
        out.push(id);
        need.delete(id);
      }
    }
    return out;
  } catch {
    return DEFAULT_DAILY_SALES_LEAD_COLUMNS;
  }
}

function saveDailySalesLeadColumnOrder(order: DailySalesLeadColumnId[]) {
  try {
    localStorage.setItem(DAILY_SALES_LEAD_COLUMN_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

// ─── Resizable column widths (persisted per browser) ─────────────────────────

const DAILY_SALES_COLUMN_WIDTHS_KEY = 'iae-daily-sales-column-widths-v2';

type DailySalesDataColumnId =
  | DailySalesLeadColumnId
  | 'yestTickets'
  | 'yestRevenue'
  | 'todayTickets'
  | 'todayRevenue'
  | 'actions';

const DEFAULT_DAILY_SALES_COLUMN_WIDTHS: Record<DailySalesDataColumnId, number> = {
  attraction: 200,
  date: 148,
  venue: 168,
  city: 108,
  yestTickets: 96,
  yestRevenue: 112,
  todayTickets: 96,
  todayRevenue: 112,
  actions: 88,
};

const DAILY_SALES_COL_MAX = 720;

const DAILY_SALES_COLUMN_MIN_WIDTHS: Record<DailySalesDataColumnId, number> = {
  attraction: 86,
  date: 68,
  venue: 72,
  city: 56,
  yestTickets: 66,
  yestRevenue: 78,
  todayTickets: 66,
  todayRevenue: 78,
  actions: 66,
};

function clampDailySalesColumnWidth(col: DailySalesDataColumnId, width: number) {
  const min = DAILY_SALES_COLUMN_MIN_WIDTHS[col];
  return Math.min(DAILY_SALES_COL_MAX, Math.max(min, Math.round(width)));
}

function sanitizeDailySalesColumnWidths(widths: Record<DailySalesDataColumnId, number>) {
  const out = { ...widths };
  for (const key of Object.keys(DEFAULT_DAILY_SALES_COLUMN_WIDTHS) as DailySalesDataColumnId[]) {
    out[key] = clampDailySalesColumnWidth(key, out[key]);
  }
  return out;
}

function loadDailySalesColumnWidths(): Record<DailySalesDataColumnId, number> {
  const defaults = sanitizeDailySalesColumnWidths(DEFAULT_DAILY_SALES_COLUMN_WIDTHS);
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(DAILY_SALES_COLUMN_WIDTHS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...defaults };
    for (const key of Object.keys(DEFAULT_DAILY_SALES_COLUMN_WIDTHS) as DailySalesDataColumnId[]) {
      const n = Number(parsed[key]);
      if (Number.isFinite(n)) {
        out[key] = clampDailySalesColumnWidth(key, n);
      }
    }
    return out;
  } catch {
    return defaults;
  }
}

function saveDailySalesColumnWidths(widths: Record<DailySalesDataColumnId, number>) {
  try {
    localStorage.setItem(DAILY_SALES_COLUMN_WIDTHS_KEY, JSON.stringify(sanitizeDailySalesColumnWidths(widths)));
  } catch {
    /* ignore */
  }
}

function clearDailySalesTableLayoutPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DAILY_SALES_COLUMN_WIDTHS_KEY);
    localStorage.removeItem(DAILY_SALES_LEAD_COLUMN_ORDER_KEY);
  } catch {
    /* ignore */
  }
}

function distributePairedColumnWidths(
  colA: DailySalesDataColumnId,
  colB: DailySalesDataColumnId,
  startA: number,
  startB: number,
  newTotal: number,
): { a: number; b: number } {
  const startTotal = startA + startB;
  const minA = DAILY_SALES_COLUMN_MIN_WIDTHS[colA];
  const minB = DAILY_SALES_COLUMN_MIN_WIDTHS[colB];
  const targetTotal = Math.min(
    DAILY_SALES_COL_MAX * 2,
    Math.max(minA + minB, Math.round(newTotal)),
  );
  const ratioA = startTotal > 0 ? startA / startTotal : 0.5;
  let a = clampDailySalesColumnWidth(colA, targetTotal * ratioA);
  let b = targetTotal - a;
  if (b < minB) {
    b = minB;
    a = targetTotal - b;
  } else if (b > DAILY_SALES_COL_MAX) {
    b = DAILY_SALES_COL_MAX;
    a = targetTotal - b;
  }
  a = clampDailySalesColumnWidth(colA, a);
  b = clampDailySalesColumnWidth(colB, b);
  return { a, b };
}

function DailySalesColResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onMouseDown={onResizeStart}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-20 h-full w-2 -mr-px cursor-col-resize touch-none select-none group/resize"
    >
      <span
        className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border transition-all group-hover/resize:bg-ems-accent group-active/resize:bg-ems-accent"
        aria-hidden
      />
    </span>
  );
}

const DAILY_SALES_LEAD_SORT_COLS = new Set<DailySalesLeadColumnId>([
  'attraction',
  'date',
  'venue',
  'city',
]);

/** Persist list filters + paging in the tab so reloads keep the view. */
const DAILY_SALES_FILTERS_SESSION_KEY = 'iae-daily-sales-filters-v2';

type DailySalesEventsScope = 'all' | 'mine';

interface DailySalesFiltersSnapshot {
  v: 2;
  attractionFilter: string;
  eventsScope: DailySalesEventsScope;
  iaeContactIds: string[];
  venueFilter: string;
  cityFilter: string;
  asOfDate: string;
  page: number;
  pageSize: PageSizeOption;
  filtersExpanded: boolean;
  leadSort: { col: DailySalesLeadColumnId; dir: 'asc' | 'desc' };
}

function coerceYmdOr(raw: unknown, fallback: string): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return fallback;
}

function coercePageSizeStored(raw: unknown): PageSizeOption {
  if (raw === PAGE_SIZE_ALL || raw === 'all') return PAGE_SIZE_ALL;
  return toPageSize(Number(raw));
}

function coerceLeadSortStored(raw: unknown): {
  col: DailySalesLeadColumnId;
  dir: 'asc' | 'desc';
} {
  if (!raw || typeof raw !== 'object') return { col: 'date', dir: 'asc' };
  const o = raw as { col?: unknown; dir?: unknown };
  const col =
    typeof o.col === 'string' && DAILY_SALES_LEAD_SORT_COLS.has(o.col as DailySalesLeadColumnId)
      ? (o.col as DailySalesLeadColumnId)
      : 'date';
  const dir = o.dir === 'desc' ? 'desc' : 'asc';
  return { col, dir };
}

function loadDailySalesFiltersSnapshot(): DailySalesFiltersSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DAILY_SALES_FILTERS_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.v !== 2) return null;
    return {
      v: 2,
      attractionFilter: typeof o.attractionFilter === 'string' ? o.attractionFilter : '',
      eventsScope:
        o.eventsScope === 'mine' || o.tourFilter === 'mine'
          ? 'mine'
          : 'all',
      iaeContactIds: Array.isArray(o.iaeContactIds)
        ? o.iaeContactIds.map((x) => String(x)).filter((x) => x.trim().length > 0)
        : [],
      venueFilter: typeof o.venueFilter === 'string' ? o.venueFilter : '',
      cityFilter: typeof o.cityFilter === 'string' ? o.cityFilter : '',
      asOfDate: coerceYmdOr(o.asOfDate, todayLocalYmd()),
      page: Math.max(1, Math.floor(Number(o.page)) || 1),
      pageSize: coercePageSizeStored(o.pageSize),
      filtersExpanded: o.filtersExpanded !== false,
      leadSort: coerceLeadSortStored(o.leadSort),
    };
  } catch {
    return null;
  }
}

function saveDailySalesFiltersSnapshot(s: DailySalesFiltersSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DAILY_SALES_FILTERS_SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** `table-fixed` + `max-w-0` lets col widths drive layout; ellipsis when narrow. */
const dailySalesColCell = 'max-w-0 overflow-hidden border-r border-border/60 last:border-r-0';
const dailySalesColCellTruncate = `${dailySalesColCell} text-ellipsis whitespace-nowrap`;

function renderDailySalesLeadCell(col: DailySalesLeadColumnId, row: ApiPerformanceSalesRow) {
  switch (col) {
    case 'attraction':
      return (
        <td key={col} className={`py-2 px-3 align-top ${dailySalesColCell}`}>
          <div className="space-y-0.5 min-w-0">
            <div className="font-medium text-sm text-text-primary truncate" title={row.attractionName ?? undefined}>
              {row.attractionName ?? <span className="text-text-muted italic text-xs">Unknown</span>}
            </div>
            {row.tourName && (
              <div className="text-xs text-text-muted leading-tight truncate" title={row.tourName}>
                {row.tourName}
              </div>
            )}
          </div>
        </td>
      );
    case 'date':
      return (
        <td key={col} className={`py-2 px-3 text-xs text-text-secondary ${dailySalesColCellTruncate}`}>
          <div className="truncate" title={`${fmtDateFull(row.performanceDate)} ${fmt12(row.performanceTime)}`}>
            <div>{fmtDateFull(row.performanceDate)}</div>
            <div className="text-text-muted">{fmt12(row.performanceTime)}</div>
          </div>
        </td>
      );
    case 'venue':
      return (
        <td key={col} className={`py-2 px-3 text-sm text-text-secondary ${dailySalesColCellTruncate}`}>
          <div className="truncate" title={row.venueName ?? row.venueCompanyName ?? undefined}>
            {row.venueName ?? row.venueCompanyName ?? '—'}
          </div>
        </td>
      );
    case 'city':
      return (
        <td key={col} className={`py-2 px-3 text-xs text-text-secondary ${dailySalesColCellTruncate}`}>
          <span className="block truncate" title={row.city ?? undefined}>
            {row.city ?? '—'}
          </span>
        </td>
      );
    default:
      return null;
  }
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton({
  asOfDate,
  onAsOfDateChange,
  asOfInputInvalid,
}: {
  asOfDate: string;
  onAsOfDateChange: (next: string) => void;
  asOfInputInvalid?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <ReportingAsOfBar
        asOfDate={asOfDate}
        onAsOfDateChange={onAsOfDateChange}
        inputInvalid={asOfInputInvalid}
      />
      <div className="flex items-center gap-3 border-b border-border bg-surface/30 px-4 py-4 sm:px-6">
        <Loader2 className="h-6 w-6 text-ems-accent animate-spin" />
        <span className="text-sm font-medium text-text-primary">Loading…</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-border/40">
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="py-3 px-3"><Skeleton className="h-4 w-24 bg-muted/80" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Editable Performance Row ─────────────────────────────────────────────────

function PerformanceRow({
  row,
  leadColumnOrder,
  onSaved,
  addToast,
}: {
  row: ApiPerformanceSalesRow;
  leadColumnOrder: DailySalesLeadColumnId[];
  onSaved: () => void;
  addToast: Props['addToast'];
}) {
  const [todayTickets, setTodayTickets] = useState(row.todayTicketsSold != null ? String(row.todayTicketsSold) : '');
  const [todayRevenue, setTodayRevenue] = useState(row.todayRevenue != null ? String(row.todayRevenue) : '');
  const [yestTickets, setYestTickets] = useState(row.yesterdayTicketsSold != null ? String(row.yesterdayTicketsSold) : '');
  const [yestRevenue, setYestRevenue] = useState(row.yesterdayRevenue != null ? String(row.yesterdayRevenue) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTodayTickets(row.todayTicketsSold != null ? String(row.todayTicketsSold) : '');
    setTodayRevenue(row.todayRevenue != null ? String(row.todayRevenue) : '');
    setYestTickets(row.yesterdayTicketsSold != null ? String(row.yesterdayTicketsSold) : '');
    setYestRevenue(row.yesterdayRevenue != null ? String(row.yesterdayRevenue) : '');
  }, [
    row.performanceId,
    row.todayDate,
    row.yesterdayDate,
    row.todayTicketsSold,
    row.todayRevenue,
    row.yesterdayTicketsSold,
    row.yesterdayRevenue,
  ]);

  const isDirty =
    todayTickets !== (row.todayTicketsSold != null ? String(row.todayTicketsSold) : '') ||
    todayRevenue !== (row.todayRevenue != null ? String(row.todayRevenue) : '') ||
    yestTickets !== (row.yesterdayTicketsSold != null ? String(row.yesterdayTicketsSold) : '') ||
    yestRevenue !== (row.yesterdayRevenue != null ? String(row.yesterdayRevenue) : '');

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const errs = [validateField(todayTickets, 'tickets'), validateField(todayRevenue, 'revenue'),
      validateField(yestTickets, 'tickets'), validateField(yestRevenue, 'revenue')].filter(Boolean);
    if (errs.length) { addToast(errs[0]!, 'warning'); return; }
    const todayBody: UpdateDailySalesPayload = {
      ticketsSold: todayTickets.trim() === '' ? null : Number(todayTickets),
      revenue: todayRevenue.trim() === '' ? null : Number(todayRevenue),
    };
    const yestBody: UpdateDailySalesPayload = {
      ticketsSold: yestTickets.trim() === '' ? null : Number(yestTickets),
      revenue: yestRevenue.trim() === '' ? null : Number(yestRevenue),
    };
    setSaving(true);
    try {
      const ordered: Array<{ date: string; body: UpdateDailySalesPayload }> =
        row.yesterdayDate === row.todayDate
          ? [{ date: row.todayDate, body: todayBody }]
          : row.yesterdayDate < row.todayDate
            ? [
                { date: row.yesterdayDate, body: yestBody },
                { date: row.todayDate, body: todayBody },
              ]
            : [
                { date: row.todayDate, body: todayBody },
                { date: row.yesterdayDate, body: yestBody },
              ];
      for (const { date, body } of ordered) {
        await updateDailySales(row.performanceId, date, body);
      }
      addToast('Saved.', 'success');
      onSaved();
    } catch (err) {
      addToast(friendlyApiError(err, 'Could not save.'), 'error');
    } finally { setSaving(false); }
  };

  const inputCls =
    'w-full bg-transparent border-0 border-b border-border text-sm tabular-nums text-right ' +
    'px-1 py-0.5 focus:outline-none focus:border-ems-accent focus:bg-elevated rounded-sm ' +
    'placeholder:text-text-muted text-text-primary transition-colors';

  return (
    <tr className="border-b border-border/50 group hover:bg-hover/30">
      {leadColumnOrder.map((colId) => renderDailySalesLeadCell(colId, row))}

      {/* Prior day (soft blue) */}
      <td
        className={`py-1.5 px-2 bg-ems-blue-dim/25 border-l border-ems-blue/10 align-middle ${dailySalesColCell}`}
        onClick={e => e.stopPropagation()}
      >
        <input type="number" min={0} step={1} className={inputCls}
          value={yestTickets} onChange={e => setYestTickets(e.target.value)} placeholder="—" />
      </td>
      <td
        className={`py-1.5 px-2 bg-ems-blue-dim/25 border-r border-ems-blue/10 align-middle ${dailySalesColCell}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-ems-blue/60 text-xs pointer-events-none">$</span>
          <input type="number" min={0} step={0.01} className={inputCls + ' pl-4'}
            value={yestRevenue} onChange={e => setYestRevenue(e.target.value)} placeholder="—" />
        </div>
      </td>

      {/* Reporting day (soft teal) */}
      <td
        className={`py-1.5 px-2 bg-ems-accent-dim/30 border-l border-ems-accent/15 align-middle ${dailySalesColCell}`}
        onClick={e => e.stopPropagation()}
      >
        <input type="number" min={0} step={1} className={inputCls}
          value={todayTickets} onChange={e => setTodayTickets(e.target.value)} placeholder="—" />
      </td>
      <td
        className={`py-1.5 px-2 bg-ems-accent-dim/30 align-middle ${dailySalesColCell}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-ems-accent/60 text-xs pointer-events-none">$</span>
          <input type="number" min={0} step={0.01} className={inputCls + ' pl-4'}
            value={todayRevenue} onChange={e => setTodayRevenue(e.target.value)} placeholder="—" />
        </div>
      </td>

      {/* Save */}
      <td className={`py-1.5 px-3 ${dailySalesColCell}`} onClick={e => e.stopPropagation()}>
        <button type="button" onClick={e => void handleSave(e)} disabled={saving}
          className={[
            'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-all disabled:opacity-60',
            isDirty ? 'bg-ems-accent text-background hover:bg-ems-accent/80 shadow-sm'
              : 'bg-elevated text-text-secondary hover:bg-hover border border-border',
          ].join(' ')}>
          {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</> : <><Save className="h-3 w-3" />Save</>}
        </button>
      </td>
    </tr>
  );
}

export function DailySalesPage({ onNavigate: _onNavigate, addToast }: Props) {
  const qc = useQueryClient();
  const [initialFilters] = useState(() => loadDailySalesFiltersSnapshot());

  const [attractionFilter, setAttractionFilter] = useState(
    () => initialFilters?.attractionFilter ?? '',
  );
  const [eventsScope, setEventsScope] = useState<DailySalesEventsScope>(
    () => initialFilters?.eventsScope ?? 'all',
  );
  const [iaeContactIds, setIaeContactIds] = useState<string[]>(
    () => initialFilters?.iaeContactIds ?? [],
  );
  const [venueFilter, setVenueFilter] = useState(() => initialFilters?.venueFilter ?? '');
  const [cityFilter, setCityFilter] = useState(() => initialFilters?.cityFilter ?? '');
  const [asOfDate, setAsOfDate] = useState(() => initialFilters?.asOfDate ?? todayLocalYmd());
  const [page, setPage] = useState(() => initialFilters?.page ?? 1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    () => initialFilters?.pageSize ?? PAGE_SIZE,
  );
  const [leadColumnOrder, setLeadColumnOrder] = useState<DailySalesLeadColumnId[]>(loadDailySalesLeadColumnOrder);
  const [columnWidths, setColumnWidths] = useState(loadDailySalesColumnWidths);
  const columnResizeSnapshot = useRef<{ col: DailySalesDataColumnId; startX: number; startW: number } | null>(
    null,
  );
  const [filtersExpanded, setFiltersExpanded] = useState(
    () => initialFilters?.filtersExpanded ?? false,
  );
  const [leadSort, setLeadSort] = useState<{
    col: DailySalesLeadColumnId;
    dir: 'asc' | 'desc';
  }>(() => initialFilters?.leadSort ?? DEFAULT_DAILY_SALES_LEAD_SORT);
  const reorderLeadColumns = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setLeadColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveDailySalesLeadColumnOrder(next);
      return next;
    });
  }, []);

  const toggleLeadSort = useCallback((col: DailySalesLeadColumnId) => {
    setLeadSort((s) => {
      if (s.col === col) return { col, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { col, dir: 'asc' };
    });
    setPage(1);
  }, []);

  const beginColumnResizeDrag = useCallback((onMove: (ev: MouseEvent) => void) => {
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      columnResizeSnapshot.current = null;
      setColumnWidths((w) => {
        saveDailySalesColumnWidths(w);
        return w;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const startColumnResize = useCallback((col: DailySalesDataColumnId, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = columnWidths[col];
    columnResizeSnapshot.current = { col, startX, startW };

    beginColumnResizeDrag((ev) => {
      const snap = columnResizeSnapshot.current;
      if (!snap) return;
      const next = clampDailySalesColumnWidth(snap.col, snap.startW + (ev.clientX - snap.startX));
      setColumnWidths((w) => ({ ...w, [snap.col]: next }));
    });
  }, [columnWidths, beginColumnResizeDrag]);

  const startDateGroupResize = useCallback(
    (ticketsCol: 'yestTickets' | 'todayTickets', revenueCol: 'yestRevenue' | 'todayRevenue', e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startTickets = columnWidths[ticketsCol];
      const startRevenue = columnWidths[revenueCol];
      const startTotal = startTickets + startRevenue;
      columnResizeSnapshot.current = { col: ticketsCol, startX, startW: startTotal };

      beginColumnResizeDrag((ev) => {
        const snap = columnResizeSnapshot.current;
        if (!snap) return;
        const minTotal = DAILY_SALES_COLUMN_MIN_WIDTHS[ticketsCol] + DAILY_SALES_COLUMN_MIN_WIDTHS[revenueCol];
        const newTotal = Math.min(
          DAILY_SALES_COL_MAX * 2,
          Math.max(minTotal, startTotal + (ev.clientX - snap.startX)),
        );
        const { a, b } = distributePairedColumnWidths(ticketsCol, revenueCol, startTickets, startRevenue, newTotal);
        setColumnWidths((w) => ({ ...w, [ticketsCol]: a, [revenueCol]: b }));
      });
    },
    [columnWidths, beginColumnResizeDrag],
  );

  const dailySalesTableMinWidth = useMemo(() => {
    const leadSum = leadColumnOrder.reduce((sum, id) => sum + columnWidths[id], 0);
    return (
      leadSum +
      columnWidths.yestTickets +
      columnWidths.yestRevenue +
      columnWidths.todayTickets +
      columnWidths.todayRevenue +
      columnWidths.actions
    );
  }, [leadColumnOrder, columnWidths]);

  const resetTableLayout = useCallback(() => {
    clearDailySalesTableLayoutPrefs();
    setColumnWidths(sanitizeDailySalesColumnWidths(DEFAULT_DAILY_SALES_COLUMN_WIDTHS));
    setLeadColumnOrder([...DEFAULT_DAILY_SALES_LEAD_COLUMNS]);
    setLeadSort({ ...DEFAULT_DAILY_SALES_LEAD_SORT });
    addToast('Column layout reset to default.', 'info');
  }, [addToast]);

  useEffect(() => {
    saveDailySalesFiltersSnapshot({
      v: 2,
      attractionFilter,
      eventsScope,
      iaeContactIds,
      venueFilter,
      cityFilter,
      asOfDate,
      page,
      pageSize,
      filtersExpanded,
      leadSort,
    });
  }, [
    attractionFilter,
    eventsScope,
    iaeContactIds,
    venueFilter,
    cityFilter,
    asOfDate,
    page,
    pageSize,
    filtersExpanded,
    leadSort,
  ]);

  const perfDateValidation = useMemo(
    () =>
      validateDailySalesPerformanceDates({
        asOfDate,
        performanceDate: '',
        startDate: '',
        endDate: '',
      }),
    [asOfDate],
  );
  const perfDatesOk = perfDateValidation.ok;

  const dailySalesSortBy =
    leadSort.col === 'date'
      ? undefined
      : leadSort.col === 'attraction'
        ? 'attraction'
        : leadSort.col === 'city'
          ? 'city'
          : 'venue';
  const iaeContactIdsKey = useMemo(() => iaeContactIds.join(','), [iaeContactIds]);
  const iaeContactIdNumbers = useMemo(
    () =>
      iaeContactIds
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n > 0),
    [iaeContactIds],
  );

  const salesQuery = useQuery({
    queryKey: [
      'daily-sales-by-perf',
      asOfDate,
      page,
      pageSize,
      attractionFilter,
      eventsScope,
      iaeContactIdsKey,
      venueFilter,
      cityFilter,
      leadSort.col,
      leadSort.dir,
    ],
    queryFn: () =>
      fetchDailySalesByPerformance(asOfDate, {
        page,
        pageSize: isAllPageSize(pageSize) ? DAILY_SALES_SUGGESTION_PAGE_SIZE : pageSize,
        attraction: attractionFilter || undefined,
        eventsScope: eventsScope === 'mine' ? 'mine' : undefined,
        iaeContactIds: iaeContactIdNumbers.length > 0 ? iaeContactIdNumbers : undefined,
        venue: venueFilter || undefined,
        sortBy: dailySalesSortBy,
        sortDir: leadSort.dir,
      }),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    enabled: perfDatesOk,
  });

  const attractionFilterOptionsQuery = useQuery({
    queryKey: ['daily-sales', 'attraction-filter-options'],
    queryFn: () => fetchAttractions(0, DAILY_SALES_ATTRACTION_FILTER_LIMIT),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const refetch = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['daily-sales-by-perf'] });
    await invalidateSalesCapacityRelatedQueries(qc);
  }, [qc]);

  const pageData = salesQuery.data;
  const rowsSource = pageData?.items ?? EMPTY_DAILY_SALES_ROWS;
  const serverTotalSource = pageData?.total ?? 0;
  // Client-side city filter (no server param available).
  const rows = useMemo(() => {
    if (!perfDatesOk) return [];
    if (!cityFilter) return rowsSource;
    return rowsSource.filter((r) => (r.city ?? '') === cityFilter);
  }, [perfDatesOk, rowsSource, cityFilter]);
  const serverTotal = perfDatesOk ? serverTotalSource : 0;
  const todayDateStr = pageData?.todayDate ?? asOfDate;
  const yesterdayDateStr = pageData?.yesterdayDate ?? ymdAddDays(asOfDate, -1);
  const todayLabel = fmtDateHeader(todayDateStr);
  const yesterdayLabel = fmtDateHeader(yesterdayDateStr);
  const attractionOptions = useMemo(() => {
    const allAttractions = attractionFilterOptionsQuery.data?.data ?? [];
    const fallbackAttractions = pageData?.attractions ?? EMPTY_DAILY_SALES_ATTRACTIONS;
    const names = allAttractions.length > 0
      ? allAttractions.map((a) => a.attractionName)
      : fallbackAttractions.map((a) => a.attractionName);
    const seen = new Set<string>();
    const list = names
      .map((name) => String(name ?? '').trim())
      .filter((name) => {
        if (!name) return false;
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [
      { value: '', label: 'All attractions' },
      ...list.map((name) => ({ value: name, label: name })),
    ];
  }, [attractionFilterOptionsQuery.data?.data, pageData?.attractions]);
  const iaeLookupsQuery = useQuery({
    queryKey: ['engagements', 'iae-contact-lookups', 'daily-sales-filter'],
    queryFn: fetchEngagementIaeContactLookups,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const iaeContactOptions = useMemo(
    () =>
      (iaeLookupsQuery.data?.contacts ?? []).map((c) => ({
        value: String(c.id),
        label: c.label,
      })),
    [iaeLookupsQuery.data?.contacts],
  );
  const venueOptions = useMemo(
    () => [
      { value: '', label: 'All venues' },
      ...((pageData?.filterOptions.venues ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.venues],
  );
  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string }> = [{ value: '', label: 'All cities' }];
    for (const row of rowsSource) {
      const c = (row.city ?? '').trim();
      if (!c || seen.has(c)) continue;
      seen.add(c);
      list.push({ value: c, label: c });
    }
    list.sort((a, b) => (a.value === '' ? -1 : b.value === '' ? 1 : a.label.localeCompare(b.label)));
    return list;
  }, [rowsSource]);

  const pageCount = isAllPageSize(pageSize)
    ? 1
    : Math.max(1, Math.ceil(serverTotal / pageSize));
  const pageClamped = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [attractionFilter, eventsScope, iaeContactIdsKey, venueFilter, cityFilter, asOfDate, leadSort.col, leadSort.dir]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (serverTotal > 0 && page > pageCount) setPage(pageCount);
  }, [serverTotal, page, pageCount]);

  const showFullSkeleton = salesQuery.isPending && !salesQuery.data;
  const showTableOverlay = salesQuery.isFetching && !!salesQuery.data;
  const isRefreshing = salesQuery.isFetching && !showFullSkeleton;
  const totalColSpan = leadColumnOrder.length + 5;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (attractionFilter) n += 1;
    if (eventsScope === 'mine') n += 1;
    if (iaeContactIds.length > 0) n += 1;
    if (venueFilter) n += 1;
    if (cityFilter) n += 1;
    return n;
  }, [attractionFilter, eventsScope, iaeContactIds.length, venueFilter, cityFilter]);

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 animate-pulse bg-ems-accent/90" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold text-text-primary">Daily Sales</h1>
        {!showFullSkeleton && (
          <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary tabular-nums">
            {serverTotal.toLocaleString()} rows
          </span>
        )}
      </div>

      {/* Error */}
      {salesQuery.isError && (
        <div className="text-sm text-ems-coral border border-ems-coral/30 rounded px-3 py-2 bg-ems-coral-dim">
          {friendlyApiError(salesQuery.error)}
        </div>
      )}

      {/* Filters — grouped card (less congested than a single crowded row) */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/80 bg-surface/35 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">Report filters</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <span className="text-[11px] font-semibold tabular-nums rounded-full bg-ems-accent/12 text-ems-accent ring-1 ring-ems-accent/20 px-2.5 py-1">
                {activeFilterCount} active
              </span>
            )}
            {activeFilterCount > 0 && (
              <button
                type="button"
                disabled={showFullSkeleton}
                onClick={() => {
                  setAttractionFilter('');
                  setEventsScope('all');
                  setIaeContactIds([]);
                  setVenueFilter('');
                  setCityFilter('');
                }}
                className="text-xs font-medium text-text-secondary hover:text-ems-accent underline-offset-2 hover:underline disabled:opacity-50"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              disabled={showFullSkeleton}
              onClick={() => setFiltersExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-text-primary shadow-sm hover:bg-hover transition-colors disabled:opacity-50"
              aria-expanded={filtersExpanded}
            >
              {filtersExpanded ? (
                <>
                  Hide filters
                  <ChevronUp className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                </>
              ) : (
                <>
                  Show filters
                  <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>

        {filtersExpanded && (
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">Attraction</label>
                <Select2
                  options={attractionOptions}
                  value={attractionFilter}
                  onChange={setAttractionFilter}
                  disabled={showFullSkeleton}
                  placeholder="All attractions"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">Event</label>
                <div
                  className="flex h-10 items-stretch overflow-hidden rounded-md border border-border text-xs font-medium"
                  role="group"
                  aria-label="Event scope"
                >
                  {(
                    [
                      { id: 'all' as const, label: 'All Events' },
                      { id: 'mine' as const, label: 'My Events' },
                    ] as const
                  ).map((opt) => {
                    const active = eventsScope === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={showFullSkeleton}
                        onClick={() => setEventsScope(opt.id)}
                        aria-pressed={active}
                        className={[
                          'flex-1 px-2 transition-colors disabled:opacity-50',
                          active
                            ? 'bg-ems-accent text-background'
                            : 'bg-card text-text-secondary hover:bg-hover',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">IAE contacts</label>
                <Select2Multi
                  options={iaeContactOptions}
                  values={iaeContactIds}
                  onChange={setIaeContactIds}
                  placeholder="All IAE contacts"
                  className={iaeLookupsQuery.isFetching ? 'opacity-80' : ''}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">Venue</label>
                <Select2
                  options={venueOptions}
                  value={venueFilter}
                  onChange={setVenueFilter}
                  disabled={showFullSkeleton}
                  placeholder="All venues"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-text-secondary">City</label>
                <Select2
                  options={cityOptions}
                  value={cityFilter}
                  onChange={setCityFilter}
                  disabled={showFullSkeleton}
                  placeholder="All cities"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table (Reporting as of: top right of this card) */}
      {showFullSkeleton ? (
        <TableSkeleton
          asOfDate={asOfDate}
          onAsOfDateChange={setAsOfDate}
          asOfInputInvalid={perfDateValidation.highlightAsOf}
        />
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg border border-border bg-card">
            {showTableOverlay && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]"
                aria-live="polite"
                aria-busy
              >
                <Loader2 className="h-8 w-8 text-ems-accent animate-spin" />
              </div>
            )}
            <ReportingAsOfBar
              asOfDate={asOfDate}
              onAsOfDateChange={setAsOfDate}
              onResetTableLayout={resetTableLayout}
              disabled={showTableOverlay}
              inputInvalid={perfDateValidation.highlightAsOf}
            />
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed border-collapse text-sm"
                style={{ minWidth: dailySalesTableMinWidth }}
              >
              <colgroup>
                {leadColumnOrder.map((colId) => (
                  <col key={colId} style={{ width: columnWidths[colId] }} />
                ))}
                <col style={{ width: columnWidths.yestTickets }} />
                <col style={{ width: columnWidths.yestRevenue }} />
                <col style={{ width: columnWidths.todayTickets }} />
                <col style={{ width: columnWidths.todayRevenue }} />
                <col style={{ width: columnWidths.actions }} />
              </colgroup>
              <thead>
                <tr className="text-xs border-b border-border">
                  {leadColumnOrder.map((colId, colIndex) => (
                    <th
                      key={colId}
                      scope="col"
                      rowSpan={2}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `lead:${colIndex}`);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData('text/plain');
                        const m = /^lead:(\d+)$/.exec(raw);
                        if (!m) return;
                        const from = parseInt(m[1], 10);
                        if (Number.isNaN(from)) return;
                        reorderLeadColumns(from, colIndex);
                      }}
                      className="relative text-left py-2.5 px-3 text-text-muted align-bottom bg-surface/90 select-none cursor-grab active:cursor-grabbing min-w-0 border-r border-border/70"
                      title="Drag to reorder column"
                    >
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <GripVertical
                          className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-70"
                          aria-hidden
                        />
                        <button
                          type="button"
                          className="min-w-0 inline-flex items-center gap-1 text-left font-medium text-text-muted hover:text-text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLeadSort(colId);
                          }}
                        >
                          <span className="min-w-0 whitespace-normal break-words leading-tight">
                            {DAILY_SALES_LEAD_COLUMN_LABELS[colId]}
                          </span>
                          {leadSort.col === colId &&
                            (leadSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </span>
                      <DailySalesColResizeHandle
                        onResizeStart={(e) => startColumnResize(colId, e)}
                      />
                    </th>
                  ))}
                  <th
                    colSpan={2}
                    className="relative text-center py-2.5 px-3 font-semibold bg-ems-blue-dim/80 border-l border-ems-blue/20"
                  >
                    <span className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-0.5 text-ems-blue">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ems-blue shadow-sm shadow-ems-blue/30" />
                      <span className="tabular-nums">{yesterdayLabel}</span>
                    </span>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ems-blue/80 mt-1.5">Prior day</div>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startDateGroupResize('yestTickets', 'yestRevenue', e)}
                    />
                  </th>
                  <th
                    colSpan={2}
                    className="relative text-center py-2.5 px-3 font-semibold bg-ems-accent-dim/80 border-l border-ems-accent/25"
                  >
                    <span className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-0.5 text-ems-accent">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ems-accent shadow-sm shadow-ems-accent/30" />
                      <span className="tabular-nums">{todayLabel}</span>
                    </span>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ems-accent/80 mt-1.5">Reporting day</div>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startDateGroupResize('todayTickets', 'todayRevenue', e)}
                    />
                  </th>
                  <th
                    className="relative py-2 px-3 align-bottom bg-surface/90 border-l border-border/70"
                    rowSpan={2}
                  >
                    <span className="sr-only">Save</span>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startColumnResize('actions', e)}
                    />
                  </th>
                </tr>
                <tr className="text-xs border-b border-border">
                  <th className="relative text-right py-2 px-2 font-medium text-text-secondary bg-ems-blue-dim/40 border-l border-ems-blue/15">
                    <span className="inline-block whitespace-normal break-words leading-tight">Ticket Sold</span>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startColumnResize('yestTickets', e)}
                    />
                  </th>
                  <th className="relative text-right py-2 px-2 font-medium text-text-secondary bg-ems-blue-dim/40 border-r border-ems-blue/10">
                    <span className="inline-block whitespace-normal break-words leading-tight">Total Revenue</span>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startColumnResize('yestRevenue', e)}
                    />
                  </th>
                  <th className="relative text-right py-2 px-2 font-medium text-text-secondary bg-ems-accent-dim/50 border-l border-ems-accent/20">
                    <span className="inline-block whitespace-normal break-words leading-tight">Ticket Sold</span>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startColumnResize('todayTickets', e)}
                    />
                  </th>
                  <th className="relative text-right py-2 px-2 font-medium text-text-secondary bg-ems-accent-dim/50">
                    <span className="inline-block whitespace-normal break-words leading-tight">Total Revenue</span>
                    <DailySalesColResizeHandle
                      onResizeStart={(e) => startColumnResize('todayRevenue', e)}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !salesQuery.isError && (
                  <tr>
                    <td colSpan={totalColSpan} className="py-12 text-center text-sm text-text-muted">
                      {!perfDatesOk ? (
                        <span>
                          Adjust the performance date filters above. Reporting and performance dates must be
                          consistent (range end on or after range start; nothing after Reporting as of; single day
                          within the range when all three are set).
                        </span>
                      ) : (
                        <span>
                          No performances for this reporting date, or none match your filters. Try clearing filters
                          or widening the performance date range.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <PerformanceRow
                    key={`${r.performanceId}-${r.todayDate}`}
                    row={r}
                    leadColumnOrder={leadColumnOrder}
                    onSaved={refetch}
                    addToast={addToast}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {serverTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
              <p className="tabular-nums">
                <span>
                  Showing{' '}
                  <span className="text-text-primary font-medium">
                    {isAllPageSize(pageSize)
                      ? `1–${serverTotal}`
                      : `${(pageClamped - 1) * pageSize + 1}–${Math.min(pageClamped * pageSize, serverTotal)}`}
                  </span>{' '}
                  of <span className="text-text-primary font-medium">{serverTotal.toLocaleString()}</span> performances
                </span>
                <span className="inline-flex flex-wrap items-center gap-x-1.5 text-text-secondary">
                  <span aria-hidden>·</span>
                  <PageSizeSelect
                    value={pageSize}
                    onChange={setPageSize}
                    disabled={salesQuery.isFetching}
                  />
                  <span>per page</span>
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button disabled={pageClamped <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium">Previous</button>
                <span className="tabular-nums text-text-muted">Page {pageClamped} / {pageCount}</span>
                <button disabled={pageClamped >= pageCount} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium">Next</button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
