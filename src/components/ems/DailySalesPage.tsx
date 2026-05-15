import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select2 } from './Select2';
import {
  fetchDailySalesByPerformance,
  fetchDailySales,
  updateDailySales,
  DAILY_SALES_SUGGESTION_PAGE_SIZE,
  type ApiPerformanceSalesRow,
  type ApiDailySalesRow,
  type UpdateDailySalesPayload,
} from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { validateDailySalesPerformanceDates } from '@/lib/dailySalesPerformanceDateValidation';
import { invalidateSalesCapacityRelatedQueries } from '@/api/cacheHelpers';
import { PAGE_SIZE, PAGE_SIZE_ALL, type PageSizeOption, isAllPageSize, toPageSize } from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';
import { fetchEngagement, updateEngagement } from '@/api/engagementApi';

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

/** % of baseline; can exceed 100 when sold exceeds capacity / potential. */
function pctVsBaselineDisplay(total: number, cap: number): number {
  if (!(cap > 0) || !Number.isFinite(total)) return 0;
  return (total / cap) * 100;
}

function seatsRemainingForDisplay(cap: number, sold: number): number {
  return Math.max(0, cap - sold);
}

function revenueRemainingForDisplay(potential: number, revenue: number): number {
  return Math.max(0, potential - revenue);
}

/** Local calendar YYYY-MM-DD (for default “as of” date). */
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

/** Sits on the top-right of the daily sales datatable card. */
function ReportingAsOfBar({
  asOfDate,
  onAsOfDateChange,
  disabled,
  inputInvalid,
}: {
  asOfDate: string;
  onAsOfDateChange: (next: string) => void;
  disabled?: boolean;
  /** Highlights border when “Reporting as of” fails validation. */
  inputInvalid?: boolean;
}) {
  const inputClass =
    'h-9 w-[10.5rem] shrink-0 rounded-md border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 ' +
    (inputInvalid
      ? 'border-ems-coral focus:ring-ems-coral/25 focus:border-ems-coral'
      : 'border-border focus:ring-ems-accent/30 focus:border-ems-accent');
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-b border-border bg-surface/50 px-3 py-2.5 sm:px-4">
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
  );
}

// ─── Summary cards (two date columns: soft blue = prior day, soft teal = current) ─

function DailySummaryCard({
  dateStr,
  statLabel,
  value,
  sub,
  tone,
}: {
  dateStr: string;
  statLabel: string;
  value: string;
  sub?: string;
  tone: 'prior' | 'current';
}) {
  const shell =
    tone === 'prior'
      ? 'border-ems-blue/20 bg-ems-blue-dim/50 shadow-sm shadow-ems-blue/[0.06]'
      : 'border-ems-accent/25 bg-ems-accent-dim/60 shadow-sm shadow-ems-accent/[0.08]';
  const dateChip =
    tone === 'prior'
      ? 'bg-ems-blue/12 text-ems-blue ring-1 ring-ems-blue/15'
      : 'bg-ems-accent/12 text-ems-accent ring-1 ring-ems-accent/20';
  return (
    <div className={['rounded-xl border p-3.5 sm:p-4 transition-colors', shell].join(' ')}>
      <div className={['inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', dateChip].join(' ')}>
        <span
          className={tone === 'prior' ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-ems-blue' : 'h-1.5 w-1.5 shrink-0 rounded-full bg-ems-accent'}
          aria-hidden
        />
        <span className="truncate">{dateStr}</span>
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-text-muted mt-2.5">{statLabel}</div>
      <div className="text-xl font-semibold text-text-primary mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

// ─── Reorderable lead columns (Attraction / Date / Venue) — same pattern as Engagements ─

const DAILY_SALES_LEAD_COLUMN_ORDER_KEY = 'iae-daily-sales-lead-column-order-v1';

type DailySalesLeadColumnId = 'attraction' | 'date' | 'venue';

const DEFAULT_DAILY_SALES_LEAD_COLUMNS: DailySalesLeadColumnId[] = [
  'attraction',
  'date',
  'venue',
];

const DAILY_SALES_LEAD_COLUMN_LABELS: Record<DailySalesLeadColumnId, string> = {
  attraction: 'Attraction',
  date: 'Date',
  venue: 'Venue',
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

// ─── Reorderable report metric columns (Genre … Contact) ─────────────────────

const DAILY_SALES_REPORT_COLUMN_ORDER_KEY = 'iae-daily-sales-report-column-order-v1';

type DailySalesReportColumnId =
  | 'genre'
  | 'city'
  | 'state'
  | 'daysOnSale'
  | 'soldYesterday'
  | 'totalSold'
  | 'totalRevenue'
  | 'contact';

const DEFAULT_DAILY_SALES_REPORT_COLUMNS: DailySalesReportColumnId[] = [
  'genre',
  'city',
  'state',
  'daysOnSale',
  'soldYesterday',
  'totalSold',
  'totalRevenue',
  'contact',
];

const DAILY_SALES_REPORT_COLUMN_LABELS: Record<DailySalesReportColumnId, string> = {
  genre: 'Genre',
  city: 'City',
  state: 'State',
  daysOnSale: 'Days on Sale',
  soldYesterday: 'Sold Yesterday',
  totalSold: 'Total Sold',
  totalRevenue: 'Total Revenue',
  contact: 'Contact',
};

function reportColumnHeaderAlign(id: DailySalesReportColumnId): string {
  if (
    id === 'daysOnSale' ||
    id === 'soldYesterday' ||
    id === 'totalSold' ||
    id === 'totalRevenue'
  ) {
    return 'text-right';
  }
  return 'text-left';
}

function loadDailySalesReportColumnOrder(): DailySalesReportColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_DAILY_SALES_REPORT_COLUMNS;
  try {
    const raw = localStorage.getItem(DAILY_SALES_REPORT_COLUMN_ORDER_KEY);
    if (!raw) return DEFAULT_DAILY_SALES_REPORT_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_DAILY_SALES_REPORT_COLUMNS;
    const need = new Set<DailySalesReportColumnId>(DEFAULT_DAILY_SALES_REPORT_COLUMNS);
    const out: DailySalesReportColumnId[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && need.has(x as DailySalesReportColumnId)) {
        out.push(x as DailySalesReportColumnId);
        need.delete(x as DailySalesReportColumnId);
      }
    }
    for (const id of DEFAULT_DAILY_SALES_REPORT_COLUMNS) {
      if (need.has(id)) {
        out.push(id);
        need.delete(id);
      }
    }
    return out;
  } catch {
    return DEFAULT_DAILY_SALES_REPORT_COLUMNS;
  }
}

function saveDailySalesReportColumnOrder(order: DailySalesReportColumnId[]) {
  try {
    localStorage.setItem(DAILY_SALES_REPORT_COLUMN_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

/** Persist list filters + paging when navigating away (e.g. Attraction sales summary) so back restores UI. */
const DAILY_SALES_FILTERS_SESSION_KEY = 'iae-daily-sales-filters-v1';

const DAILY_SALES_LEAD_SORT_COLS = new Set<DailySalesLeadColumnId>([
  'attraction',
  'date',
  'venue',
]);

interface DailySalesFiltersSnapshot {
  v: 1;
  search: string;
  searchDebounced: string;
  attractionFilter: string;
  genreFilter: string;
  tourFilter: string;
  companyFilter: string;
  venueFilter: string;
  contactFilter: string;
  performanceDateFilter: string;
  startDateFilter: string;
  endDateFilter: string;
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
    if (o.v !== 1) return null;
    return {
      v: 1,
      search: typeof o.search === 'string' ? o.search : '',
      searchDebounced:
        typeof o.searchDebounced === 'string'
          ? o.searchDebounced
          : typeof o.search === 'string'
            ? o.search.trim()
            : '',
      attractionFilter: typeof o.attractionFilter === 'string' ? o.attractionFilter : '',
      genreFilter: typeof o.genreFilter === 'string' ? o.genreFilter : '',
      tourFilter: typeof o.tourFilter === 'string' ? o.tourFilter : '',
      companyFilter: typeof o.companyFilter === 'string' ? o.companyFilter : '',
      venueFilter: typeof o.venueFilter === 'string' ? o.venueFilter : '',
      contactFilter: typeof o.contactFilter === 'string' ? o.contactFilter : '',
      performanceDateFilter:
        typeof o.performanceDateFilter === 'string' ? o.performanceDateFilter : '',
      startDateFilter: typeof o.startDateFilter === 'string' ? o.startDateFilter : '',
      endDateFilter: typeof o.endDateFilter === 'string' ? o.endDateFilter : '',
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

function renderDailySalesReportCell(col: DailySalesReportColumnId, row: ApiPerformanceSalesRow) {
  switch (col) {
    case 'genre':
      return (
        <td key={col} className="py-2 px-3 text-xs text-text-secondary">
          {row.genre ?? '—'}
        </td>
      );
    case 'city':
      return (
        <td key={col} className="py-2 px-3 text-xs text-text-secondary">
          {row.city ?? '—'}
        </td>
      );
    case 'state':
      return (
        <td key={col} className="py-2 px-3 text-xs text-text-secondary">
          {row.stateProvince ?? '—'}
        </td>
      );
    case 'daysOnSale':
      return (
        <td key={col} className="py-2 px-3 text-right text-xs tabular-nums text-text-secondary">
          {row.daysOnSale > 0 ? row.daysOnSale.toLocaleString() : '—'}
        </td>
      );
    case 'soldYesterday':
      return (
        <td key={col} className="py-2 px-3 text-right text-xs tabular-nums text-text-primary">
          {row.soldYesterday.toLocaleString()}
        </td>
      );
    case 'totalSold':
      return (
        <td key={col} className="py-2 px-3 text-right text-xs tabular-nums text-text-primary">
          {row.totalSold.toLocaleString()}
        </td>
      );
    case 'totalRevenue':
      return (
        <td key={col} className="py-2 px-3 text-right text-xs tabular-nums text-ems-green font-medium">
          {fmtCurrency(row.totalRevenue)}
        </td>
      );
    case 'contact':
      return (
        <td key={col} className="py-2 px-3 text-xs text-text-secondary">
          {row.contactName ?? '—'}
        </td>
      );
    default:
      return null;
  }
}

function renderDailySalesLeadCell(
  col: DailySalesLeadColumnId,
  row: ApiPerformanceSalesRow,
  onEngagementClick: (engagementId: number) => void,
) {
  switch (col) {
    case 'attraction':
      return (
        <td key={col} className="py-2 px-3 align-top min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="font-medium text-sm text-text-primary">
              {row.attractionName ?? <span className="text-text-muted italic text-xs">Unknown</span>}
            </div>
            {row.tourName && (
              <div className="text-xs text-text-muted leading-tight truncate max-w-[14rem]" title={row.tourName}>
                {row.tourName}
              </div>
            )}
            <button
              type="button"
              className="text-[10px] font-medium text-ems-accent hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onEngagementClick(row.engagementId);
              }}
            >
              Engagement detail
            </button>
          </div>
        </td>
      );
    case 'date':
      return (
        <td key={col} className="py-2 px-3 text-xs text-text-secondary whitespace-nowrap">
          <div>{fmtDateFull(row.performanceDate)}</div>
          <div className="text-text-muted">{fmt12(row.performanceTime)}</div>
        </td>
      );
    case 'venue':
      return (
        <td key={col} className="py-2 px-3 text-sm text-text-secondary">
          <div className="truncate max-w-[11rem]">{row.venueName ?? row.venueCompanyName ?? '—'}</div>
          {(row.city || row.stateProvince) && (
            <div className="text-xs text-text-muted">{[row.city, row.stateProvince].filter(Boolean).join(', ')}</div>
          )}
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
  reportColumnOrder,
  onEngagementClick,
  onOpenAttractionSalesSummary,
  onSaved,
  addToast,
}: {
  row: ApiPerformanceSalesRow;
  leadColumnOrder: DailySalesLeadColumnId[];
  reportColumnOrder: DailySalesReportColumnId[];
  onEngagementClick: (engagementId: number) => void;
  onOpenAttractionSalesSummary: (attractionId: number) => void | Promise<void>;
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
    <tr
      className={[
        'border-b border-border/50 group',
        row.attractionId != null ? 'cursor-pointer hover:bg-hover/40' : 'hover:bg-hover/30',
      ].join(' ')}
      title={row.attractionId != null ? 'Open attraction sales summary' : undefined}
      onClick={() => {
        if (row.attractionId != null) {
          void onOpenAttractionSalesSummary(row.attractionId);
        }
      }}
    >
      {leadColumnOrder.map((colId) =>
        renderDailySalesLeadCell(colId, row, onEngagementClick),
      )}
      {reportColumnOrder.map((colId) => renderDailySalesReportCell(colId, row))}

      {/* Prior day (soft blue) */}
      <td
        className="py-1.5 px-2 bg-ems-blue-dim/25 border-l border-ems-blue/10 align-middle"
        onClick={e => e.stopPropagation()}
      >
        <input type="number" min={0} step={1} className={inputCls}
          value={yestTickets} onChange={e => setYestTickets(e.target.value)} placeholder="—" />
      </td>
      <td
        className="py-1.5 px-2 bg-ems-blue-dim/25 border-r border-ems-blue/10 align-middle"
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
        className="py-1.5 px-2 bg-ems-accent-dim/30 border-l border-ems-accent/15 align-middle"
        onClick={e => e.stopPropagation()}
      >
        <input type="number" min={0} step={1} className={inputCls}
          value={todayTickets} onChange={e => setTodayTickets(e.target.value)} placeholder="—" />
      </td>
      <td className="py-1.5 px-2 bg-ems-accent-dim/30 align-middle" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-ems-accent/60 text-xs pointer-events-none">$</span>
          <input type="number" min={0} step={0.01} className={inputCls + ' pl-4'}
            value={todayRevenue} onChange={e => setTodayRevenue(e.target.value)} placeholder="—" />
        </div>
      </td>

      {/* Save */}
      <td className="py-1.5 px-3" onClick={e => e.stopPropagation()}>
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

// ─── Engagement Sales History (Item 7) ────────────────────────────────────────

function EngagementSalesHistory({
  engagementId,
  attractionName,
  tourName,
  onBack,
}: {
  engagementId: number;
  attractionName: string | null;
  tourName: string | null;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const historyQuery = useQuery({
    queryKey: ['daily-sales-history', engagementId],
    queryFn: () => fetchDailySales(engagementId),
    staleTime: 60_000,
  });
  const engagementQuery = useQuery({
    queryKey: ['engagements', engagementId],
    queryFn: () => fetchEngagement(engagementId),
    staleTime: 60_000,
  });
  const [sellableCapacityInput, setSellableCapacityInput] = useState('');
  const [grossPotentialInput, setGrossPotentialInput] = useState('');

  const rows = historyQuery.data ?? [];
  const engagement = engagementQuery.data;

  useEffect(() => {
    if (!engagement) return;
    setSellableCapacityInput(
      engagement.sellableCapacity == null ? '' : String(engagement.sellableCapacity),
    );
    setGrossPotentialInput(
      engagement.grossPotential == null ? '' : String(engagement.grossPotential),
    );
  }, [engagement]);

  const saveBaselineMutation = useMutation({
    mutationFn: async () => {
      const nextSellable = sellableCapacityInput.trim();
      const nextGross = grossPotentialInput.trim();
      let sellableCapacity: number | null = null;
      let grossPotential: number | null = null;
      if (nextSellable !== '') {
        const parsed = Number(nextSellable);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new Error('Sellable capacity must be a non-negative whole number.');
        }
        sellableCapacity = parsed;
      }
      if (nextGross !== '') {
        const parsed = Number(nextGross);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('Gross potential must be a non-negative number.');
        }
        grossPotential = Number(parsed.toFixed(2));
      }
      await updateEngagement(engagementId, { sellableCapacity, grossPotential });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await invalidateSalesCapacityRelatedQueries(qc);
    },
  });

  const timelineRows = useMemo(() => {
    if (rows.length === 0) return [] as Array<{
      salesDate: string;
      totalTickets: number;
      totalRevenue: number;
    }>;
    const perfMap = new Map<number, ApiDailySalesRow[]>();
    for (const r of rows) {
      const list = perfMap.get(r.performanceId) ?? [];
      list.push(r);
      perfMap.set(r.performanceId, list);
    }
    for (const list of perfMap.values()) {
      list.sort((a, b) => a.salesDate.localeCompare(b.salesDate));
    }
    const allDates = [...new Set(rows.map((r) => r.salesDate))].sort((a, b) =>
      a.localeCompare(b),
    );
    const out: Array<{ salesDate: string; totalTickets: number; totalRevenue: number }> = [];
    for (const date of allDates) {
      let sumTickets = 0;
      let sumRevenue = 0;
      for (const [, list] of perfMap.entries()) {
        for (const rec of list) {
          if (rec.salesDate <= date) {
            sumTickets += rec.ticketsSold ?? 0;
            sumRevenue += rec.revenue ?? 0;
          }
        }
      }
      out.push({ salesDate: date, totalTickets: sumTickets, totalRevenue: sumRevenue });
    }
    return out;
  }, [rows]);

  const latest = timelineRows.length > 0 ? timelineRows[timelineRows.length - 1] : null;
  const previous = timelineRows.length > 1 ? timelineRows[timelineRows.length - 2] : null;
  const soldYesterday = latest ? latest.totalTickets - (previous?.totalTickets ?? 0) : 0;
  const revenueYesterday = latest ? latest.totalRevenue - (previous?.totalRevenue ?? 0) : 0;
  const daysOnSale = useMemo(() => {
    if (timelineRows.length === 0) return 0;
    const first = timelineRows[0].salesDate;
    const last = timelineRows[timelineRows.length - 1].salesDate;
    const [fy, fm, fd] = first.split('-').map(Number);
    const [ly, lm, ld] = last.split('-').map(Number);
    const start = new Date(fy, fm - 1, fd);
    const end = new Date(ly, lm - 1, ld);
    return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }, [timelineRows]);
  const sellableCapacity = engagement?.sellableCapacity ?? null;
  const grossPotentialRaw = engagement?.grossPotential;
  const grossPotentialNum =
    grossPotentialRaw != null &&
    grossPotentialRaw !== '' &&
    Number.isFinite(Number(grossPotentialRaw)) &&
    Number(grossPotentialRaw) > 0
      ? Number(grossPotentialRaw)
      : null;
  const soldPct =
    sellableCapacity != null && sellableCapacity > 0 && latest
      ? pctVsBaselineDisplay(latest.totalTickets, sellableCapacity)
      : null;
  const revenuePct =
    grossPotentialNum != null && latest
      ? pctVsBaselineDisplay(latest.totalRevenue, grossPotentialNum)
      : null;
  const remainingSeats =
    sellableCapacity != null && latest
      ? seatsRemainingForDisplay(sellableCapacity, latest.totalTickets)
      : null;
  const remainingRevenue =
    grossPotentialNum != null && latest
      ? revenueRemainingForDisplay(grossPotentialNum, latest.totalRevenue)
      : null;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button type="button" onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ChevronLeft className="h-4 w-4" />
        Back to Daily Sales
      </button>

      {/* Title */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {attractionName ? (
            <>
              {attractionName}
              {tourName && <span className="text-text-muted font-normal"> — {tourName}</span>}
            </>
          ) : tourName ? (
            tourName
          ) : (
            'Sales history'
          )}
        </h2>
        {engagementQuery.isLoading ? (
          <div className="mt-2 text-xs text-text-muted inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading engagement baseline…
          </div>
        ) : (
          <p className="mt-1 text-xs text-text-muted">
            Engagement sales dashboard and baseline fields.
          </p>
        )}
      </div>

      {/* History table */}
      {historyQuery.isPending ? (
        <div className="flex items-center gap-2 text-text-muted text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin text-ems-accent" /> Loading history…
        </div>
      ) : historyQuery.isError ? (
        <div className="text-sm text-ems-coral border border-ems-coral/30 rounded px-3 py-2 bg-ems-coral-dim">
          {friendlyApiError(historyQuery.error)}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-text-muted">
          No sales records found for this engagement.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="Total Revenue"
              value={latest ? fmtCurrency(latest.totalRevenue) : '$0'}
              sub="Current cumulative"
              tone="current"
            />
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="Tickets Distributed"
              value={latest ? latest.totalTickets.toLocaleString() : '0'}
              sub="Current cumulative"
              tone="prior"
            />
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="% Sold"
              value={soldPct != null ? `${soldPct.toFixed(1)}%` : '—'}
              sub={sellableCapacity != null ? `Capacity ${sellableCapacity.toLocaleString()}` : 'Set sellable capacity'}
              tone="current"
            />
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="Days On Sale"
              value={String(daysOnSale)}
              sub="From first sales day"
              tone="prior"
            />
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="Sold Yesterday"
              value={soldYesterday.toLocaleString()}
              sub="Incremental change"
              tone="current"
            />
            <DailySummaryCard
              dateStr={latest ? fmtDateHeader(latest.salesDate) : '—'}
              statLabel="Revenue Yesterday"
              value={fmtCurrency(revenueYesterday)}
              sub={revenuePct != null ? `${revenuePct.toFixed(1)}% of gross potential` : 'Incremental change'}
              tone="prior"
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-text-primary">Engagement Baseline Fields</h3>
            <p className="text-xs text-text-muted mt-1">
              Fill these after engagement creation to power capacity and gross-potential KPIs.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Sellable capacity
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent"
                  value={sellableCapacityInput}
                  onChange={(e) => setSellableCapacityInput(e.target.value)}
                  disabled={saveBaselineMutation.isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Gross potential
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent"
                  value={grossPotentialInput}
                  onChange={(e) => setGrossPotentialInput(e.target.value)}
                  disabled={saveBaselineMutation.isPending}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Seats remaining: {remainingSeats != null ? remainingSeats.toLocaleString() : '—'} · Revenue remaining:{' '}
                {remainingRevenue != null ? fmtCurrency(remainingRevenue) : '—'}
              </p>
              <button
                type="button"
                onClick={() => saveBaselineMutation.mutate()}
                disabled={saveBaselineMutation.isPending}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-all bg-ems-accent text-background hover:bg-ems-accent/80 disabled:opacity-50"
              >
                {saveBaselineMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    Save baseline
                  </>
                )}
              </button>
            </div>
            {saveBaselineMutation.isError && (
              <p className="mt-2 text-xs text-ems-coral">
                {friendlyApiError(saveBaselineMutation.error, 'Could not save baseline fields.')}
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  <th className="text-left py-2.5 px-3">Date</th>
                  <th className="text-right py-2.5 px-3">Total Tickets Sold</th>
                  <th className="text-right py-2.5 px-3">Total Value Sold</th>
                  <th className="text-right py-2.5 px-3">Seats Sold %</th>
                  <th className="text-right py-2.5 px-3">Seats Remaining</th>
                  <th className="text-right py-2.5 px-3">Revenue Remaining</th>
                </tr>
              </thead>
              <tbody>
                {[...timelineRows]
                  .reverse()
                  .map((r) => {
                    const seatsPct =
                      sellableCapacity != null && sellableCapacity > 0
                        ? pctVsBaselineDisplay(r.totalTickets, sellableCapacity)
                        : null;
                    const seatsLeft =
                      sellableCapacity != null
                        ? seatsRemainingForDisplay(sellableCapacity, r.totalTickets)
                        : null;
                    const revLeft =
                      grossPotentialNum != null
                        ? revenueRemainingForDisplay(grossPotentialNum, r.totalRevenue)
                        : null;
                    return (
                      <tr key={r.salesDate} className="border-b border-border/50 hover:bg-hover/30">
                        <td className="py-2.5 px-3 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                          {fmtDateHeader(r.salesDate)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">
                          {r.totalTickets.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-ems-green font-medium">
                          {fmtCurrency(r.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                          {seatsPct != null ? `${seatsPct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                          {seatsLeft != null ? seatsLeft.toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                          {revLeft != null ? fmtCurrency(revLeft) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function dailySalesRowSuggestionLabel(r: ApiPerformanceSalesRow): string {
  const a = (r.attractionName ?? '').trim();
  const t = (r.tourName ?? '').trim();
  if (a && t) return `${a} — ${t}`;
  return a || t || (r.venueName ?? '').trim() || `Performance ${r.performanceId}`;
}

export function DailySalesPage({ onNavigate, addToast }: Props) {
  const qc = useQueryClient();
  const [initialFilters] = useState(() => loadDailySalesFiltersSnapshot());

  const [searchInput, setSearchInput] = useState(() => initialFilters?.search ?? '');
  const [searchCommitted, setSearchCommitted] = useState(
    () => initialFilters?.searchDebounced ?? initialFilters?.search ?? '',
  );
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const dailySalesSearchRef = useRef<HTMLDivElement>(null);
  const [attractionFilter, setAttractionFilter] = useState(
    () => initialFilters?.attractionFilter ?? '',
  );
  const [genreFilter, setGenreFilter] = useState(() => initialFilters?.genreFilter ?? '');
  const [tourFilter, setTourFilter] = useState(() => initialFilters?.tourFilter ?? '');
  const [companyFilter, setCompanyFilter] = useState(() => initialFilters?.companyFilter ?? '');
  const [venueFilter, setVenueFilter] = useState(() => initialFilters?.venueFilter ?? '');
  const [contactFilter, setContactFilter] = useState(() => initialFilters?.contactFilter ?? '');
  /** YYYY-MM-DD — empty = all performance dates (within reporting as-of). */
  const [performanceDateFilter, setPerformanceDateFilter] = useState(
    () => initialFilters?.performanceDateFilter ?? '',
  );
  const [startDateFilter, setStartDateFilter] = useState(() => initialFilters?.startDateFilter ?? '');
  const [endDateFilter, setEndDateFilter] = useState(() => initialFilters?.endDateFilter ?? '');
  const [asOfDate, setAsOfDate] = useState(() => initialFilters?.asOfDate ?? todayLocalYmd());
  const [page, setPage] = useState(() => initialFilters?.page ?? 1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    () => initialFilters?.pageSize ?? PAGE_SIZE,
  );
  const [leadColumnOrder, setLeadColumnOrder] = useState<DailySalesLeadColumnId[]>(loadDailySalesLeadColumnOrder);
  const [reportColumnOrder, setReportColumnOrder] = useState<DailySalesReportColumnId[]>(loadDailySalesReportColumnOrder);
  const [filtersExpanded, setFiltersExpanded] = useState(
    () => initialFilters?.filtersExpanded ?? true,
  );
  const [leadSort, setLeadSort] = useState<{
    col: DailySalesLeadColumnId;
    dir: 'asc' | 'desc';
  }>(() => initialFilters?.leadSort ?? { col: 'date', dir: 'asc' });

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

  const reorderReportColumns = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setReportColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveDailySalesReportColumnOrder(next);
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

  // Item 7 — engagement click-through state
  const [selectedEngagement, setSelectedEngagement] = useState<{
    engagementId: number;
    attractionName: string | null;
    tourName: string | null;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dailySalesSearchRef.current && !dailySalesSearchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    saveDailySalesFiltersSnapshot({
      v: 1,
      search: searchInput,
      searchDebounced: searchCommitted,
      attractionFilter,
      genreFilter,
      tourFilter,
      companyFilter,
      venueFilter,
      contactFilter,
      performanceDateFilter,
      startDateFilter,
      endDateFilter,
      asOfDate,
      page,
      pageSize,
      filtersExpanded,
      leadSort,
    });
  }, [
    searchInput,
    searchCommitted,
    attractionFilter,
    genreFilter,
    tourFilter,
    companyFilter,
    venueFilter,
    contactFilter,
    performanceDateFilter,
    startDateFilter,
    endDateFilter,
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
        performanceDate: performanceDateFilter,
        startDate: startDateFilter,
        endDate: endDateFilter,
      }),
    [asOfDate, performanceDateFilter, startDateFilter, endDateFilter],
  );
  const perfDatesOk = perfDateValidation.ok;

  const dailySalesSortBy =
    leadSort.col === 'date'
      ? undefined
      : leadSort.col === 'attraction'
        ? 'attraction'
        : 'venue';

  const dailySalesSuggestionQuery = useQuery({
    queryKey: [
      'daily-sales-by-perf',
      'suggestion-rows',
      asOfDate,
      attractionFilter,
      genreFilter,
      tourFilter,
      companyFilter,
      venueFilter,
      contactFilter,
      performanceDateFilter,
      startDateFilter,
      endDateFilter,
      leadSort.col,
      leadSort.dir,
    ],
    queryFn: () =>
      fetchDailySalesByPerformance(asOfDate, {
        page: 1,
        pageSize: DAILY_SALES_SUGGESTION_PAGE_SIZE,
        attraction: attractionFilter || undefined,
        genre: genreFilter || undefined,
        tour: tourFilter || undefined,
        company: companyFilter || undefined,
        venue: venueFilter || undefined,
        contact: contactFilter || undefined,
        performanceDate: performanceDateFilter.trim() || undefined,
        startDate: startDateFilter.trim() || undefined,
        endDate: endDateFilter.trim() || undefined,
        sortBy: dailySalesSortBy,
        sortDir: leadSort.dir,
      }),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: perfDatesOk,
  });

  const dailySalesSearchSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [] as Array<{ label: string; query: string }>;
    if (!perfDatesOk) return [] as Array<{ label: string; query: string }>;
    const items = dailySalesSuggestionQuery.data?.items ?? [];
    const out: Array<{ label: string; query: string }> = [];
    for (const row of items) {
      const candidates = [
        row.tourName,
        row.attractionName,
        row.venueName,
        row.venueCompanyName,
        row.city,
        row.stateProvince,
        row.dmaMarketName,
        row.genre,
        row.contactName,
      ]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean);
      const hay = [
        ...candidates,
        row.performanceDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) continue;
      const label = dailySalesRowSuggestionLabel(row);
      const query =
        candidates.find((c) => c.toLowerCase().includes(q)) ??
        candidates[0] ??
        '';
      if (!query) continue;
      if (!out.some((t) => t.query.toLowerCase() === query.toLowerCase())) {
        out.push({ label, query });
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [searchInput, dailySalesSuggestionQuery.data, perfDatesOk]);

  const commitDailySalesSearch = useCallback(() => {
    setSearchCommitted(searchInput.trim());
    setShowSearchSuggestions(false);
  }, [searchInput]);

  const salesQuery = useQuery({
    queryKey: [
      'daily-sales-by-perf',
      asOfDate,
      page,
      pageSize,
      searchCommitted,
      attractionFilter,
      genreFilter,
      tourFilter,
      companyFilter,
      venueFilter,
      contactFilter,
      performanceDateFilter,
      startDateFilter,
      endDateFilter,
      leadSort.col,
      leadSort.dir,
    ],
    queryFn: () =>
      fetchDailySalesByPerformance(asOfDate, {
        page,
        pageSize,
        search: searchCommitted || undefined,
        attraction: attractionFilter || undefined,
        genre: genreFilter || undefined,
        tour: tourFilter || undefined,
        company: companyFilter || undefined,
        venue: venueFilter || undefined,
        contact: contactFilter || undefined,
        performanceDate: performanceDateFilter.trim() || undefined,
        startDate: startDateFilter.trim() || undefined,
        endDate: endDateFilter.trim() || undefined,
        sortBy: dailySalesSortBy,
        sortDir: leadSort.dir,
      }),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    enabled: perfDatesOk,
  });

  const refetch = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['daily-sales-by-perf'] });
    await invalidateSalesCapacityRelatedQueries(qc);
  }, [qc]);

  const openAttractionSalesSummary = useCallback(
    async (attractionId: number) => {
      await invalidateSalesCapacityRelatedQueries(qc);
      onNavigate('attraction-sales-summary', {
        attractionId,
        returnView: 'daily-sales',
        /** Match Daily Sales “Reporting as of” so the summary uses the same window as the grid. */
        initialAsOf: asOfDate,
      });
    },
    [onNavigate, qc, asOfDate],
  );

  const pageData = salesQuery.data;
  const rowsSource = pageData?.items ?? [];
  const serverTotalSource = pageData?.total ?? 0;
  const rows = perfDatesOk ? rowsSource : [];
  const serverTotal = perfDatesOk ? serverTotalSource : 0;
  const todayDateStr = pageData?.todayDate ?? asOfDate;
  const yesterdayDateStr = pageData?.yesterdayDate ?? ymdAddDays(asOfDate, -1);
  const todayLabel = fmtDateHeader(todayDateStr);
  const yesterdayLabel = fmtDateHeader(yesterdayDateStr);
  const asOfIsLocalToday = asOfDate === todayLocalYmd();
  const labelCurShort = asOfIsLocalToday ? 'today' : 'selected day';
  const labelPriorShort = asOfIsLocalToday ? 'yesterday' : 'prior day';
  const attractionOptions = useMemo(() => {
    const list = pageData?.attractions ?? [];
    return [
      { value: '', label: 'All attractions' },
      ...list.map((a) => ({ value: a.attractionName, label: a.attractionName })),
    ];
  }, [pageData?.attractions]);
  const genreOptions = useMemo(
    () => [
      { value: '', label: 'All genres' },
      ...((pageData?.filterOptions.genres ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.genres],
  );
  const tourOptions = useMemo(
    () => [
      { value: '', label: 'All tours' },
      ...((pageData?.filterOptions.tours ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.tours],
  );
  const companyOptions = useMemo(
    () => [
      { value: '', label: 'All companies' },
      ...((pageData?.filterOptions.companies ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.companies],
  );
  const venueOptions = useMemo(
    () => [
      { value: '', label: 'All venues' },
      ...((pageData?.filterOptions.venues ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.venues],
  );
  const contactOptions = useMemo(
    () => [
      { value: '', label: 'All contacts' },
      ...((pageData?.filterOptions.contacts ?? []).map((n) => ({ value: n, label: n }))),
    ],
    [pageData?.filterOptions.contacts],
  );

  const totalTicketsToday = pageData?.summary.todayTickets ?? 0;
  const totalRevenueToday = pageData?.summary.todayRevenue ?? 0;
  const totalTicketsYest = pageData?.summary.yesterdayTickets ?? 0;
  const totalRevenueYest = pageData?.summary.yesterdayRevenue ?? 0;

  const pageCount = isAllPageSize(pageSize)
    ? 1
    : Math.max(1, Math.ceil(serverTotal / pageSize));
  const pageClamped = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [searchCommitted, attractionFilter, genreFilter, tourFilter, companyFilter, venueFilter, contactFilter, asOfDate, performanceDateFilter, startDateFilter, endDateFilter, leadSort.col, leadSort.dir]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (serverTotal > 0 && page > pageCount) setPage(pageCount);
  }, [serverTotal, page, pageCount]);

  const showFullSkeleton = salesQuery.isPending && !salesQuery.data;
  const showTableOverlay = salesQuery.isFetching && !!salesQuery.data;
  const isRefreshing = salesQuery.isFetching && !showFullSkeleton;
  const $fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const totalColSpan = leadColumnOrder.length + reportColumnOrder.length + 5;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (attractionFilter) n += 1;
    if (genreFilter) n += 1;
    if (tourFilter) n += 1;
    if (companyFilter) n += 1;
    if (venueFilter) n += 1;
    if (contactFilter) n += 1;
    if (performanceDateFilter.trim()) n += 1;
    if (startDateFilter.trim()) n += 1;
    if (endDateFilter.trim()) n += 1;
    return n;
  }, [
    attractionFilter,
    genreFilter,
    tourFilter,
    companyFilter,
    venueFilter,
    contactFilter,
    performanceDateFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const dateInputClass =
    'h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-text-primary shadow-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-ems-accent/25 focus:border-ems-accent disabled:opacity-50';

  const dateFieldClass = (invalid: boolean) =>
    `${dateInputClass}${invalid ? ' border-ems-coral focus:ring-ems-coral/25 focus:border-ems-coral' : ''}`;

  const isoYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  const asMax = isoYmd(asOfDate) ? asOfDate : undefined;
  const stY = isoYmd(startDateFilter) ? startDateFilter : undefined;
  const enY = isoYmd(endDateFilter) ? endDateFilter : undefined;
  const rangeChronoOk = !!(stY && enY && stY <= enY);
  const perfDateMin = rangeChronoOk ? stY : undefined;
  const perfDateMax =
    rangeChronoOk && enY
      ? asMax
        ? enY < asMax
          ? enY
          : asMax
        : enY
      : asMax;
  const startDateMax = enY && asMax ? (enY < asMax ? enY : asMax) : enY || asMax;

  // ── Item 7: show engagement history if one is selected ──────────────────────
  if (selectedEngagement) {
    return (
      <EngagementSalesHistory
        engagementId={selectedEngagement.engagementId}
        attractionName={selectedEngagement.attractionName}
        tourName={selectedEngagement.tourName}
        onBack={() => {
          void invalidateSalesCapacityRelatedQueries(qc);
          setSelectedEngagement(null);
        }}
      />
    );
  }

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

      {/* Summary */}
      {!showFullSkeleton && serverTotal > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DailySummaryCard
            dateStr={yesterdayLabel}
            statLabel="Tickets"
            value={totalTicketsYest.toLocaleString()}
            sub={labelPriorShort}
            tone="prior"
          />
          <DailySummaryCard
            dateStr={yesterdayLabel}
            statLabel="Revenue"
            value={$fmt(totalRevenueYest)}
            sub={labelPriorShort}
            tone="prior"
          />
          <DailySummaryCard
            dateStr={todayLabel}
            statLabel="Tickets"
            value={totalTicketsToday.toLocaleString()}
            sub={labelCurShort}
            tone="current"
          />
          <DailySummaryCard
            dateStr={todayLabel}
            statLabel="Revenue"
            value={$fmt(totalRevenueToday)}
            sub={labelCurShort}
            tone="current"
          />
        </div>
      )}

      {/* Filters — grouped card (less congested than a single crowded row) */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/80 bg-surface/35 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">Report filters</h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-prose">
              Use dates to limit which performances appear, then refine by show, venue, or contact. Reporting totals still follow the date in the table header.
            </p>
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
                  setGenreFilter('');
                  setTourFilter('');
                  setCompanyFilter('');
                  setVenueFilter('');
                  setContactFilter('');
                  setPerformanceDateFilter('');
                  setStartDateFilter('');
                  setEndDateFilter('');
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
          <div className="p-4 sm:p-5 space-y-6">
            <div className="max-w-2xl relative" ref={dailySalesSearchRef}>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Search</label>
              <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
                <input
                  type="text"
                  className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search shows, tours, venues, cities…"
                  value={searchInput}
                  disabled={showFullSkeleton}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchInput(v);
                    setShowSearchSuggestions(true);
                    if (!v.trim()) setSearchCommitted('');
                  }}
                  onFocus={() => {
                    if (searchInput.trim()) setShowSearchSuggestions(true);
                  }}
                  onBlur={() => setShowSearchSuggestions(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitDailySalesSearch();
                    if (e.key === 'Escape') setShowSearchSuggestions(false);
                  }}
                />
                <button
                  type="button"
                  onClick={commitDailySalesSearch}
                  disabled={showFullSkeleton}
                  className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors disabled:opacity-50"
                  title="Search"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {showSearchSuggestions &&
              searchInput.trim().length >= 1 &&
              (dailySalesSuggestionQuery.isFetching ||
                dailySalesSearchSuggestions.length > 0 ||
                dailySalesSuggestionQuery.isFetched) ? (
                <div
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {dailySalesSuggestionQuery.isError ? (
                    <div className="px-3 py-2 text-sm text-ems-coral" role="alert">
                      Could not load suggestions.
                    </div>
                  ) : null}
                  {!dailySalesSuggestionQuery.isError && dailySalesSuggestionQuery.isFetching ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-muted" role="status">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
                      <span>Loading suggestions…</span>
                    </div>
                  ) : null}
                  {!dailySalesSuggestionQuery.isError &&
                  !dailySalesSuggestionQuery.isFetching &&
                  dailySalesSearchSuggestions.length > 0
                    ? dailySalesSearchSuggestions.map((suggestion, i) => (
                        <button
                          key={`${i}-${suggestion.label}-${suggestion.query}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchInput(suggestion.query);
                            setSearchCommitted(suggestion.query);
                            setShowSearchSuggestions(false);
                          }}
                        >
                          {suggestion.label}
                        </button>
                      ))
                    : null}
                  {!dailySalesSuggestionQuery.isError &&
                  !dailySalesSuggestionQuery.isFetching &&
                  dailySalesSuggestionQuery.isFetched &&
                  dailySalesSearchSuggestions.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-text-muted">No matching rows</div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <fieldset className="min-w-0 space-y-3 rounded-xl border border-border/70 bg-surface/25 p-4">
                <legend className="px-1 text-xs font-semibold text-text-primary">Performance dates</legend>
                <p className="text-[11px] text-text-muted -mt-1 mb-1">Calendar filters for which rows load into the table.</p>
                {!perfDatesOk && perfDateValidation.messages.length > 0 ? (
                  <div
                    role="alert"
                    className="text-sm text-ems-coral border border-ems-coral/30 rounded-lg px-3 py-2 bg-ems-coral-dim"
                  >
                    <ul className="list-disc pl-4 space-y-0.5">
                      {perfDateValidation.messages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="daily-sales-perf-date" className="mb-1 block text-[11px] font-medium text-text-secondary">
                      Single performance day
                    </label>
                    <input
                      id="daily-sales-perf-date"
                      type="date"
                      className={dateFieldClass(perfDateValidation.highlightPerf)}
                      value={performanceDateFilter}
                      onChange={(e) => setPerformanceDateFilter(e.target.value)}
                      disabled={showFullSkeleton}
                      min={perfDateMin}
                      max={perfDateMax}
                      aria-invalid={perfDateValidation.highlightPerf ? true : undefined}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="daily-sales-start-date" className="mb-1 block text-[11px] font-medium text-text-secondary">
                        Range start
                      </label>
                      <input
                        id="daily-sales-start-date"
                        type="date"
                        className={dateFieldClass(perfDateValidation.highlightStart)}
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        disabled={showFullSkeleton}
                        max={startDateMax}
                        aria-invalid={perfDateValidation.highlightStart ? true : undefined}
                      />
                    </div>
                    <div>
                      <label htmlFor="daily-sales-end-date" className="mb-1 block text-[11px] font-medium text-text-secondary">
                        Range end
                      </label>
                      <input
                        id="daily-sales-end-date"
                        type="date"
                        className={dateFieldClass(perfDateValidation.highlightEnd)}
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        disabled={showFullSkeleton}
                        min={stY}
                        max={asMax}
                        aria-invalid={perfDateValidation.highlightEnd ? true : undefined}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset className="min-w-0 space-y-3 rounded-xl border border-border/70 bg-surface/25 p-4">
                <legend className="px-1 text-xs font-semibold text-text-primary">Show and classification</legend>
                <div className="space-y-3">
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
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary">Genre</label>
                    <Select2
                      options={genreOptions}
                      value={genreFilter}
                      onChange={setGenreFilter}
                      disabled={showFullSkeleton}
                      placeholder="All genres"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary">Tour</label>
                    <Select2
                      options={tourOptions}
                      value={tourFilter}
                      onChange={setTourFilter}
                      disabled={showFullSkeleton}
                      placeholder="All tours"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="min-w-0 space-y-3 rounded-xl border border-border/70 bg-surface/25 p-4">
                <legend className="px-1 text-xs font-semibold text-text-primary">Venue and contacts</legend>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary">Company</label>
                    <Select2
                      options={companyOptions}
                      value={companyFilter}
                      onChange={setCompanyFilter}
                      disabled={showFullSkeleton}
                      placeholder="All companies"
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
                    <label className="mb-1 block text-[11px] font-medium text-text-secondary">Contact</label>
                    <Select2
                      options={contactOptions}
                      value={contactFilter}
                      onChange={setContactFilter}
                      disabled={showFullSkeleton}
                      placeholder="All contacts"
                    />
                  </div>
                </div>
              </fieldset>
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
          <p className="text-[11px] text-text-muted leading-relaxed px-0.5">
            <span className="font-medium text-text-secondary">How ticket columns work:</span> the{' '}
            <strong className="text-text-primary">prior day</strong> and <strong className="text-text-primary">reporting day</strong>{' '}
            inputs are <strong className="text-text-primary">only that calendar day’s</strong> tickets/revenue for this
            show (what is stored on each dbo.TicketingSales row). <strong className="text-text-primary">Total sold</strong>{' '}
            and <strong className="text-text-primary">total revenue</strong> are the <strong className="text-text-primary">sum of all saved days through the reporting date</strong>{' '}
            (cumulative). <strong className="text-text-primary">Sold yesterday</strong> = that cumulative total minus the
            same sum through the day before reporting.
          </p>
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
              inputInvalid={perfDateValidation.highlightAsOf}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '900px' }}>
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
                      className="text-left py-2.5 px-3 text-text-muted align-bottom bg-surface/90 select-none cursor-grab active:cursor-grabbing min-w-0"
                      title="Drag to move column"
                    >
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <GripVertical
                          className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-70"
                          aria-hidden
                        />
                        <button
                          type="button"
                          className="truncate inline-flex items-center gap-1 text-left font-medium text-text-muted hover:text-text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLeadSort(colId);
                          }}
                        >
                          {DAILY_SALES_LEAD_COLUMN_LABELS[colId]}
                          {leadSort.col === colId &&
                            (leadSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </span>
                    </th>
                  ))}
                  {reportColumnOrder.map((colId, colIndex) => (
                    <th
                      key={colId}
                      scope="col"
                      rowSpan={2}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `report:${colIndex}`);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData('text/plain');
                        const m = /^report:(\d+)$/.exec(raw);
                        if (!m) return;
                        const from = parseInt(m[1], 10);
                        if (Number.isNaN(from)) return;
                        reorderReportColumns(from, colIndex);
                      }}
                      className={[
                        'py-2.5 px-3 text-text-muted align-bottom bg-surface/90 select-none cursor-grab active:cursor-grabbing min-w-0',
                        reportColumnHeaderAlign(colId),
                      ].join(' ')}
                      title="Drag to reorder column"
                    >
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                        <GripVertical
                          className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-70"
                          aria-hidden
                        />
                        <span className="truncate font-medium">
                          {DAILY_SALES_REPORT_COLUMN_LABELS[colId]}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th
                    colSpan={2}
                    className="text-center py-2.5 px-3 font-semibold bg-ems-blue-dim/80 border-l border-ems-blue/20"
                  >
                    <span className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-0.5 text-ems-blue">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ems-blue shadow-sm shadow-ems-blue/30" />
                      <span className="tabular-nums">{yesterdayLabel}</span>
                    </span>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ems-blue/80 mt-1.5">Prior day</div>
                  </th>
                  <th
                    colSpan={2}
                    className="text-center py-2.5 px-3 font-semibold bg-ems-accent-dim/80 border-l border-ems-accent/25"
                  >
                    <span className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-0.5 text-ems-accent">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-ems-accent shadow-sm shadow-ems-accent/30" />
                      <span className="tabular-nums">{todayLabel}</span>
                    </span>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-ems-accent/80 mt-1.5">Reporting day</div>
                  </th>
                  <th className="py-2 px-3 align-bottom bg-surface/90" rowSpan={2} />
                </tr>
                <tr className="text-xs border-b border-border">
                  <th className="text-right py-2 px-2 font-medium text-text-secondary bg-ems-blue-dim/40 border-l border-ems-blue/15">
                    Tickets
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-text-secondary bg-ems-blue-dim/40 border-r border-ems-blue/10">
                    Revenue
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-text-secondary bg-ems-accent-dim/50 border-l border-ems-accent/20">
                    Tickets
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-text-secondary bg-ems-accent-dim/50">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {serverTotal === 0 && !salesQuery.isError && (
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
                    reportColumnOrder={reportColumnOrder}
                    onEngagementClick={(id) => setSelectedEngagement({
                      engagementId: id,
                      attractionName: r.attractionName,
                      tourName: r.tourName,
                    })}
                    onOpenAttractionSalesSummary={openAttractionSalesSummary}
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
