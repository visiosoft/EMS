import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronRight,
  DollarSign,
  Filter as FilterIcon,
  Info,
  Loader2,
  RotateCcw,
  Search,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { fetchDailySales, fetchDailySalesByPerformance, fetchDailySalesByPerformanceSuggestions, type ApiDailySalesRow, type ApiPerformanceSalesRow, type SuggestionItem } from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { companyToSelect2Options } from './companySelectOptions';
import { Select2 } from './Select2';
import { PAGE_SIZE, PAGE_SIZE_ALL, type PageSizeOption, isAllPageSize, toPageSize } from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';

interface Props { onOpenEngagement: (engagementId: number, performanceId: number) => void }

type SortColumn =
  | 'attraction' | 'eventDate' | 'venue' | 'sellableCapacity' | 'grossPotential' | 'grossSalesToDate'
  | 'totalSold' | 'venueCapacitySoldPct' | 'grossPotentialSoldPct' | 'yesterdayRevenue'
  | 'ticketsSoldYesterday' | 'grossSales7Days' | 'ticketsSoldPrevious7Days'
  | 'grossSales14Days' | 'ticketsSoldPrevious14Days' | 'grossUnsoldRevenue' | 'unsoldTickets';

type EventDateScope = 'past' | 'upcoming' | 'custom';
type SortState = { col: SortColumn; dir: 'asc' | 'desc' };
type Snapshot = { tickets: number; revenue: number };
type LedgerRow = Snapshot & { salesDate: string };
type Ledger = Map<number, LedgerRow[]>;
type Metrics = {
  currentTickets: number; currentRevenue: number; ticketsSoldYesterday: number; yesterdayRevenue: number;
  grossSales7Days: number; ticketsSoldPrevious7Days: number; grossSales14Days: number; ticketsSoldPrevious14Days: number;
  grossUnsoldRevenue: number | null; unsoldTickets: number | null; venueCapacitySoldPct: number | null; grossPotentialSoldPct: number | null;
};
type SummaryRow = { row: ApiPerformanceSalesRow; metrics: Metrics };
const EMPTY_PERFORMANCE_ROWS: ApiPerformanceSalesRow[] = [];

const EVENT_DATE_SCOPE_OPTIONS: Array<{ value: EventDateScope; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'custom', label: 'Custom Date Range' },
];

type RowWithMarket = ApiPerformanceSalesRow & { dmaMarketName?: string | null };

const num = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : null);
const rowMarketName = (r: ApiPerformanceSalesRow) => (r as RowWithMarket).dmaMarketName ?? r.city ?? null;
const pct = (a: number | null | undefined, b: number | null | undefined) => {
  const n = num(a), d = num(b); return n == null || d == null || d <= 0 ? null : (n / d) * 100;
};
const fallbackRevenue = (r: ApiPerformanceSalesRow) => num(r.todayRevenue) ?? num(r.yesterdayRevenue) ?? num(r.totalRevenue) ?? 0;
const fallbackTickets = (r: ApiPerformanceSalesRow) => num(r.todayTicketsSold) ?? num(r.yesterdayTicketsSold) ?? num(r.totalSold) ?? 0;
const delta = (a: number, b: number) => Math.max(0, Number.isFinite(a - b) ? a - b : 0);

function ymd(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function ymdAddDays(s: string, days: number) { const [y, m, d] = s.split('-').map(Number); if (!y || !m || !d) return s; const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + days); return ymd(dt); }
function ymdAddBusinessDays(s: string, days: number) {
  const [y, m, d] = s.split('-').map(Number); if (!y || !m || !d || days === 0) return s;
  const dt = new Date(y, m - 1, d); const step = days > 0 ? 1 : -1; let left = Math.abs(days);
  while (left > 0) { dt.setDate(dt.getDate() + step); const day = dt.getDay(); if (day !== 0 && day !== 6) left -= 1; }
  return ymd(dt);
}

function buildLedger(rows: ApiDailySalesRow[] = []): Ledger {
  const map: Ledger = new Map();
  for (const r of rows) {
    const id = Number(r.performanceId); const salesDate = String(r.salesDate ?? '').slice(0, 10);
    if (!Number.isFinite(id) || !/^\d{4}-\d{2}-\d{2}$/.test(salesDate)) continue;
    const list = map.get(id) ?? [];
    list.push({ salesDate, tickets: num(r.ticketsSold) ?? 0, revenue: num(r.revenue) ?? 0 });
    map.set(id, list);
  }
  map.forEach((list) => list.sort((a, b) => a.salesDate.localeCompare(b.salesDate)));
  return map;
}
function snap(ledger: Ledger, performanceId: number, cutoff: string): Snapshot | null {
  const rows = ledger.get(performanceId); if (!rows?.length) return null;
  let hit: LedgerRow | null = null; for (const r of rows) { if (r.salesDate > cutoff) break; hit = r; }
  return hit ? { tickets: hit.tickets, revenue: hit.revenue } : null;
}
function metricsFor(r: ApiPerformanceSalesRow, ledger: Ledger, reportDate: string, ready: boolean): Metrics {
  const current = (ready ? snap(ledger, r.performanceId, reportDate) : null) ?? { tickets: fallbackTickets(r), revenue: fallbackRevenue(r) };
  const prev = ready ? snap(ledger, r.performanceId, ymdAddDays(reportDate, -1)) : { tickets: num(r.yesterdayTicketsSold) ?? 0, revenue: num(r.yesterdayRevenue) ?? 0 };
  const prev7 = ready ? snap(ledger, r.performanceId, ymdAddBusinessDays(reportDate, -7)) : null;
  const prev14 = ready ? snap(ledger, r.performanceId, ymdAddBusinessDays(reportDate, -14)) : null;
  const cap = num(r.engagementSellableCapacity), potential = num(r.engagementGrossPotential);
  return {
    currentTickets: current.tickets,
    currentRevenue: current.revenue,
    ticketsSoldYesterday: delta(current.tickets, prev?.tickets ?? 0),
    yesterdayRevenue: delta(current.revenue, prev?.revenue ?? 0),
    grossSales7Days: delta(current.revenue, prev7?.revenue ?? 0),
    ticketsSoldPrevious7Days: delta(current.tickets, prev7?.tickets ?? 0),
    grossSales14Days: delta(current.revenue, prev14?.revenue ?? 0),
    ticketsSoldPrevious14Days: delta(current.tickets, prev14?.tickets ?? 0),
    grossUnsoldRevenue: potential == null ? null : Math.max(0, potential - current.revenue),
    unsoldTickets: cap == null ? null : Math.max(0, cap - current.tickets),
    venueCapacitySoldPct: pct(current.tickets, cap),
    grossPotentialSoldPct: pct(current.revenue, potential),
  };
}

const money = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const percent = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? '' : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v)}%`;
const intText = (v: number | null | undefined) => v == null || !Number.isFinite(v) ? '' : Math.round(v).toLocaleString();
function fmtEventDate(iso: string) { if (!iso) return { date: '—', time: '' }; const dt = new Date(`${iso}T12:00:00`); return { date: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }), time: '' }; }
function fmtTime12(hhmm: string) { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }
function cmpStr(a: string | null | undefined, b: string | null | undefined) { return (a ?? '').toString().toLowerCase().localeCompare((b ?? '').toString().toLowerCase()); }
function cmpNum(a: number | null | undefined, b: number | null | undefined) { return (a == null || !Number.isFinite(a) ? -Infinity : a) - (b == null || !Number.isFinite(b) ? -Infinity : b); }
function sortRows(rows: SummaryRow[], sort: SortState) {
  const s = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const ar = a.row, br = b.row, am = a.metrics, bm = b.metrics;
    const map: Record<SortColumn, () => number> = {
      attraction: () => cmpStr(ar.attractionName, br.attractionName) || cmpStr(ar.tourName, br.tourName),
      eventDate: () => cmpStr(`${ar.performanceDate}T${ar.performanceTime ?? '00:00:00'}`, `${br.performanceDate}T${br.performanceTime ?? '00:00:00'}`),
      venue: () => cmpStr(ar.venueName ?? ar.venueCompanyName, br.venueName ?? br.venueCompanyName) || cmpStr(rowMarketName(ar), rowMarketName(br)),
      sellableCapacity: () => cmpNum(ar.engagementSellableCapacity, br.engagementSellableCapacity),
      grossPotential: () => cmpNum(ar.engagementGrossPotential, br.engagementGrossPotential),
      grossSalesToDate: () => cmpNum(am.currentRevenue, bm.currentRevenue),
      totalSold: () => cmpNum(am.currentTickets, bm.currentTickets),
      venueCapacitySoldPct: () => cmpNum(am.venueCapacitySoldPct, bm.venueCapacitySoldPct),
      grossPotentialSoldPct: () => cmpNum(am.grossPotentialSoldPct, bm.grossPotentialSoldPct),
      yesterdayRevenue: () => cmpNum(am.yesterdayRevenue, bm.yesterdayRevenue),
      ticketsSoldYesterday: () => cmpNum(am.ticketsSoldYesterday, bm.ticketsSoldYesterday),
      grossSales7Days: () => cmpNum(am.grossSales7Days, bm.grossSales7Days),
      ticketsSoldPrevious7Days: () => cmpNum(am.ticketsSoldPrevious7Days, bm.ticketsSoldPrevious7Days),
      grossSales14Days: () => cmpNum(am.grossSales14Days, bm.grossSales14Days),
      ticketsSoldPrevious14Days: () => cmpNum(am.ticketsSoldPrevious14Days, bm.ticketsSoldPrevious14Days),
      grossUnsoldRevenue: () => cmpNum(am.grossUnsoldRevenue, bm.grossUnsoldRevenue),
      unsoldTickets: () => cmpNum(am.unsoldTickets, bm.unsoldTickets),
    };
    return map[sort.col]() * s;
  });
}

function KpiCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>; label: string; value: string; sub?: string; tone: 'accent' | 'blue' | 'green' | 'purple' }) {
  const shell = { accent: 'border-ems-accent/25 bg-ems-accent-dim/40', blue: 'border-ems-blue/25 bg-ems-blue-dim/40', green: 'border-ems-green/25 bg-ems-green-dim/40', purple: 'border-ems-purple/25 bg-ems-purple-dim/40' }[tone];
  const icon = { accent: 'bg-ems-accent/15 text-ems-accent', blue: 'bg-ems-blue/15 text-ems-blue', green: 'bg-ems-green/15 text-ems-green', purple: 'bg-ems-purple/15 text-ems-purple' }[tone];
  return <div className={`rounded-xl border p-3.5 transition-colors shadow-sm ${shell}`}><div className="flex items-center gap-2.5"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${icon}`}><Icon className="h-4 w-4" aria-hidden /></span><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div><div className="text-lg font-semibold text-text-primary tabular-nums leading-tight mt-0.5">{value}</div></div></div>{sub && <div className="mt-1.5 text-[11px] text-text-secondary">{sub}</div>}</div>;
}
function HeaderLabel({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className="italic block leading-tight">
          {line}
        </span>
      ))}
    </>
  );
}

function SortHeader({ col, label, sort, onToggle, align, title, onResizeStart, className = '' }: { col: SortColumn; label: React.ReactNode; sort: SortState; onToggle: (col: SortColumn) => void; align?: 'left' | 'right'; title?: string; onResizeStart?: (e: React.MouseEvent) => void; className?: string }) {
   const active = sort.col === col; const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return <th scope="col" className={`relative min-w-0 overflow-hidden px-3 py-3 align-middle select-none ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}><button type="button" onClick={() => onToggle(col)} className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide transition-colors max-w-full ${active ? 'text-ems-accent' : 'text-text-secondary hover:text-text-primary'} ${align === 'right' ? 'justify-end w-full' : 'justify-start'}`} title={`Sort by ${title ?? (typeof label === 'string' ? label : col)}`}><span className="min-w-0 whitespace-normal break-words leading-snug normal-case">{label}</span>{active ? <Arrow className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden /> : <span className="inline-block h-3.5 w-3.5 shrink-0 opacity-0" aria-hidden />}</button>{onResizeStart && <ColResizeHandle onResizeStart={onResizeStart} />}</th>;
}

type SalesSummaryColumnDefinition = {
  key: SortColumn;
  label: React.ReactNode;
  title?: string;
  align?: 'right';
};

const SALES_SUMMARY_COLUMNS: SalesSummaryColumnDefinition[] = [
  { key: 'attraction', label: <HeaderLabel lines={['Attraction,', 'Tour']} /> },
  { key: 'eventDate', label: <HeaderLabel lines={['Opening', 'Performance Date']} />, title: 'Opening Performance Date' },
  { key: 'venue', label: <HeaderLabel lines={['Venue,', 'City']} />, title: 'Venue, City' },
  { key: 'sellableCapacity', label: <HeaderLabel lines={['Sellable', 'Capacity']} />, title: 'Sellable Capacity', align: 'right' },
  { key: 'grossPotential', label: <HeaderLabel lines={['Gross', 'Potential $']} />, title: 'Gross Potential $', align: 'right' },
  { key: 'totalSold', label: <HeaderLabel lines={['Total Tickets', 'Sold To Date']} />, title: 'Total Tickets Sold To Date', align: 'right' },
  { key: 'grossSalesToDate', label: <HeaderLabel lines={['Total Sales $ To', 'Date']} />, title: 'Total Sales $ To Date', align: 'right' },
  { key: 'venueCapacitySoldPct', label: <HeaderLabel lines={['% of Seats', 'Sold']} />, title: '% of Seats Sold', align: 'right' },
  { key: 'grossPotentialSoldPct', label: <HeaderLabel lines={['% of $', 'Potential Sold']} />, title: '% of $ Potential Sold', align: 'right' },
  { key: 'ticketsSoldYesterday', label: <HeaderLabel lines={['Total Tickets Sold', 'Yesterday']} />, title: 'Total Tickets Sold Yesterday', align: 'right' },
  { key: 'yesterdayRevenue', label: <HeaderLabel lines={['Total $ Sold', 'Yesterday']} />, title: 'Total $ Sold Yesterday', align: 'right' },
  { key: 'ticketsSoldPrevious7Days', label: <HeaderLabel lines={['7 Day Total', 'Tickets Sold']} />, title: '7 Day Total Tickets Sold', align: 'right' },
  { key: 'grossSales7Days', label: <HeaderLabel lines={['7 Day $ Sold']} />, title: '7 Day $ Sold', align: 'right' },
  { key: 'ticketsSoldPrevious14Days', label: <HeaderLabel lines={['14 Day Total', 'Tickets Sold']} />, title: '14 Day Total Tickets Sold', align: 'right' },
  { key: 'grossSales14Days', label: <HeaderLabel lines={['14 Day $ Sold']} />, title: '14 Day $ Sold', align: 'right' },
  { key: 'unsoldTickets', label: <HeaderLabel lines={['Total Unsold', 'Tickets']} />, title: 'Total Unsold Tickets', align: 'right' },
  { key: 'grossUnsoldRevenue', label: <HeaderLabel lines={['Total', 'Unsold $']} />, title: 'Total Unsold $', align: 'right' },
];

const SALES_SUMMARY_METRIC_COLUMN_GROUPS: Array<{ label: string; keys: SortColumn[] }> = [
  { label: 'Total Inventory', keys: ['sellableCapacity', 'grossPotential'] },
  { label: 'Lifetime', keys: ['totalSold', 'grossSalesToDate', 'venueCapacitySoldPct', 'grossPotentialSoldPct'] },
  { label: "Yesterday's Wrap", keys: ['ticketsSoldYesterday', 'yesterdayRevenue'] },
  { label: 'Seven-Day Wrap', keys: ['ticketsSoldPrevious7Days', 'grossSales7Days'] },
  { label: 'Fourteen-Day Wrap', keys: ['ticketsSoldPrevious14Days', 'grossSales14Days'] },
  { label: 'Unsold Inventory & Value', keys: ['unsoldTickets', 'grossUnsoldRevenue'] },
];

const SALES_SUMMARY_GROUP_BY_COLUMN = new Map<
  SortColumn,
  { groupIndex: number; isFirst: boolean; isLast: boolean; shaded: boolean }
>();

SALES_SUMMARY_METRIC_COLUMN_GROUPS.forEach((group, groupIndex) => {
  group.keys.forEach((key, columnIndex) => {
    SALES_SUMMARY_GROUP_BY_COLUMN.set(key, {
      groupIndex,
      isFirst: columnIndex === 0,
      isLast: columnIndex === group.keys.length - 1,
      shaded: groupIndex % 2 === 0,
    });
  });
});

function salesSummaryGroupHeaderClass(groupIndex: number) {
  const fill = groupIndex % 2 === 0 ? 'bg-slate-200/90' : 'bg-white';
  return `${fill} border-l-[3px] border-r-[3px] border-t-2 border-b-0 border-slate-700/80 shadow-[inset_0_-1px_0_rgba(15,23,42,0.18)]`;
}

function salesSummaryColumnChromeClass(col: SortColumn, area: 'header' | 'body') {
  const group = SALES_SUMMARY_GROUP_BY_COLUMN.get(col);
  if (!group) return area === 'header' ? 'bg-white border-r border-slate-200' : 'bg-white border-r border-slate-100';

  const fill =
    group.shaded
      ? area === 'header'
        ? 'bg-slate-100'
        : 'bg-slate-50/90 group-hover:bg-ems-accent-dim/45'
      : area === 'header'
        ? 'bg-white'
        : 'bg-white group-hover:bg-ems-accent-dim/30';
  const left = group.isFirst ? 'border-l-[3px] border-l-slate-700/80' : 'border-l border-l-slate-300/70';
  const right = group.isLast ? 'border-r-[3px] border-r-slate-700/80' : 'border-r border-r-slate-300/70';
  return `${fill} ${left} ${right}`;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>; }
const empty = <span className="text-text-muted font-normal">—</span>;

// ─── Resizable column widths (persisted per browser) ─────────────────────────

const SALES_SUMMARY_COLUMN_WIDTHS_KEY = 'iae-sales-summary-column-widths-v2';
const SALES_SUMMARY_COL_MAX = 600;

const DEFAULT_SALES_SUMMARY_COLUMN_WIDTHS: Record<SortColumn, number> = {
  attraction: 160,
  eventDate: 120,
  venue: 140,
  sellableCapacity: 80,
  grossPotential: 105,
  grossSalesToDate: 120,
  totalSold: 125,
  venueCapacitySoldPct: 85,
  grossPotentialSoldPct: 90,
  yesterdayRevenue: 120,
  ticketsSoldYesterday: 130,
  grossSales7Days: 105,
  ticketsSoldPrevious7Days: 125,
  grossSales14Days: 105,
  ticketsSoldPrevious14Days: 130,
  grossUnsoldRevenue: 115,
  unsoldTickets: 125,
};

const SALES_SUMMARY_COLUMN_MIN_WIDTHS: Record<SortColumn, number> = {
  attraction: 120,
  eventDate: 140,
  venue: 115,
  sellableCapacity: 105,
  grossPotential: 115,
  grossSalesToDate: 120,
  totalSold: 140,
  venueCapacitySoldPct: 130,
  grossPotentialSoldPct: 140,
  yesterdayRevenue: 120,
  ticketsSoldYesterday: 135,
  grossSales7Days: 110,
  ticketsSoldPrevious7Days: 130,
  grossSales14Days: 110,
  ticketsSoldPrevious14Days: 135,
  grossUnsoldRevenue: 115,
  unsoldTickets: 125,
};

function clampSalesSummaryColumnWidth(col: SortColumn, width: number) {
  const min = SALES_SUMMARY_COLUMN_MIN_WIDTHS[col];
  return Math.min(SALES_SUMMARY_COL_MAX, Math.max(min, Math.round(width)));
}

function sanitizeSalesSummaryColumnWidths(widths: Record<SortColumn, number>) {
  const out = { ...widths };
  for (const key of Object.keys(DEFAULT_SALES_SUMMARY_COLUMN_WIDTHS) as SortColumn[]) {
    out[key] = clampSalesSummaryColumnWidth(key, out[key]);
  }
  return out;
}

function loadSalesSummaryColumnWidths(): Record<SortColumn, number> {
  const defaults = sanitizeSalesSummaryColumnWidths(DEFAULT_SALES_SUMMARY_COLUMN_WIDTHS);
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(SALES_SUMMARY_COLUMN_WIDTHS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...defaults };
    for (const key of Object.keys(DEFAULT_SALES_SUMMARY_COLUMN_WIDTHS) as SortColumn[]) {
      const n = Number(parsed[key]);
      if (Number.isFinite(n)) {
        out[key] = clampSalesSummaryColumnWidth(key, n);
      }
    }
    return out;
  } catch {
    return defaults;
  }
}

function saveSalesSummaryColumnWidths(widths: Record<SortColumn, number>) {
  try {
    localStorage.setItem(SALES_SUMMARY_COLUMN_WIDTHS_KEY, JSON.stringify(sanitizeSalesSummaryColumnWidths(widths)));
  } catch {
    /* ignore */
  }
}

function clearSalesSummaryTableLayoutPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SALES_SUMMARY_COLUMN_WIDTHS_KEY);
  } catch {
    /* ignore */
  }
}

function ColResizeHandle({
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
      className="absolute right-0 top-0 z-20 h-full w-3 cursor-col-resize touch-none select-none group/resize"
    >
      <span
        className="pointer-events-none absolute inset-y-1.5 right-[3px] w-0.5 rounded-sm bg-ems-accent/40 transition-all group-hover/resize:bg-ems-accent group-active/resize:bg-ems-accent"
        aria-hidden
      />
    </span>
  );
}

export function SalesSummaryPage({ onOpenEngagement }: Props) {
  const today = ymd();
  const [eventDateScope, setEventDateScope] = useState<EventDateScope>('upcoming');
  const [appliedEventDateScope, setAppliedEventDateScope] = useState<EventDateScope>('upcoming');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState(today);
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState(today);
  const [attractionFilter, setAttractionFilter] = useState(''), [genreFilter, setGenreFilter] = useState(''), [tourFilter, setTourFilter] = useState(''), [companyFilter, setCompanyFilter] = useState(''), [venueFilter, setVenueFilter] = useState(''), [contactFilter, setContactFilter] = useState(''), [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [sort, setSort] = useState<SortState>({ col: 'eventDate', dir: 'asc' });
  const iso = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  const reportAsOfDate = today;
  const customDatesAreValid = iso(customStartDate) && iso(customEndDate);
  const customRangeOrderIsValid = !customDatesAreValid || customEndDate >= customStartDate;
  const appliedCustomDatesAreValid = iso(appliedCustomStartDate) && iso(appliedCustomEndDate);
  const appliedCustomRangeOrderIsValid = !appliedCustomDatesAreValid || appliedCustomEndDate >= appliedCustomStartDate;
  const dateOk = appliedEventDateScope !== 'custom' || (appliedCustomDatesAreValid && appliedCustomRangeOrderIsValid);
  const dateScopeChanged = appliedEventDateScope !== 'upcoming';
  const customRangeHasChanges =
    eventDateScope === 'custom' &&
    (appliedEventDateScope !== 'custom' ||
      customStartDate !== appliedCustomStartDate ||
      customEndDate !== appliedCustomEndDate);
  const activeFilterCount = [
    dateScopeChanged ? appliedEventDateScope : '',
    attractionFilter,
    genreFilter,
    tourFilter,
    companyFilter,
    venueFilter,
    contactFilter,
    activeSearch.trim(),
  ].filter(Boolean).length;
  const reset = () => { setAttractionFilter(''); setGenreFilter(''); setTourFilter(''); setCompanyFilter(''); setVenueFilter(''); setContactFilter(''); setSearchInput(''); setActiveSearch(''); setEventDateScope('upcoming'); setAppliedEventDateScope('upcoming'); setCustomStartDate(today); setCustomEndDate(today); setAppliedCustomStartDate(today); setAppliedCustomEndDate(today); setPage(1); };

  const handleEventDateScopeChange = (value: string) => {
    const next = (value || 'upcoming') as EventDateScope;
    setEventDateScope(next);
    if (next !== 'custom') {
      setAppliedEventDateScope(next);
      setPage(1);
    }
  };

  const applyCustomDateRange = () => {
    if (!customDatesAreValid || !customRangeOrderIsValid) return;
    setAppliedEventDateScope('custom');
    setAppliedCustomStartDate(customStartDate);
    setAppliedCustomEndDate(customEndDate);
    setPage(1);
  };

  const searchParam = activeSearch.trim() || undefined;
  const performanceDateParams = useMemo(() => {
    if (appliedEventDateScope === 'past') return { endDate: ymdAddDays(today, -1) };
    if (appliedEventDateScope === 'custom' && dateOk) return { startDate: appliedCustomStartDate, endDate: appliedCustomEndDate };
    return { startDate: today };
  }, [appliedCustomEndDate, appliedCustomStartDate, appliedEventDateScope, dateOk, today]);

  const queryKey = [
    'sales-summary',
    reportAsOfDate,
    appliedEventDateScope,
    performanceDateParams.startDate ?? '',
    performanceDateParams.endDate ?? '',
    page,
    pageSize,
    searchParam,
    attractionFilter,
    genreFilter,
    tourFilter,
    companyFilter,
    venueFilter,
    contactFilter,
  ];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchDailySalesByPerformance(reportAsOfDate, {
        page,
        pageSize: isAllPageSize(pageSize) ? undefined : pageSize,
        search: searchParam,
        ...performanceDateParams,
        attraction: attractionFilter || undefined,
        genre: genreFilter || undefined,
        tour: tourFilter || undefined,
        company: companyFilter || undefined,
        venue: venueFilter || undefined,
        contact: contactFilter || undefined,
      }),
    staleTime: 2 * 60 * 1000,
    enabled: dateOk,
    placeholderData: (prev) => prev,
  });

  const ledgerQuery = useQuery({
    queryKey: ['sales-summary-daily-sales-ledger'],
    queryFn: () => fetchDailySales(),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const pageData = dateOk ? query.data : undefined;
  const rawRows = pageData?.items ?? EMPTY_PERFORMANCE_ROWS;
  const serverTotal = pageData?.total ?? 0;
  const summary = pageData?.summary;
  const ledger = useMemo(() => buildLedger(ledgerQuery.data ?? []), [ledgerQuery.data]);
  const ledgerReady = Array.isArray(ledgerQuery.data);

  const rowsWithMetrics = useMemo(
    () => rawRows.map((row) => ({ row, metrics: metricsFor(row, ledger, reportAsOfDate, ledgerReady) })),
    [ledger, ledgerReady, reportAsOfDate, rawRows],
  );
  const rows = useMemo(() => sortRows(rowsWithMetrics, sort), [rowsWithMetrics, sort]);

  const kpis = useMemo(() => {
    if (!summary) return { events: 0, totalSold: 0, totalRevenue: 0, revenueYesterday: 0 };
    return {
      events: serverTotal,
      totalSold: summary.totalTickets,
      totalRevenue: summary.totalRevenue,
      revenueYesterday: summary.yesterdayRevenue,
    };
  }, [summary, serverTotal]);

  const suggestionSearch = searchInput.trim();
  const suggestionsQuery = useQuery({
    queryKey: ['sales-summary-suggestions', reportAsOfDate, appliedEventDateScope, performanceDateParams.startDate ?? '', performanceDateParams.endDate ?? '', suggestionSearch],
    queryFn: () => fetchDailySalesByPerformanceSuggestions(suggestionSearch, reportAsOfDate, performanceDateParams),
    staleTime: 30_000,
    enabled: dateOk && suggestionSearch.length >= 1,
  });

  const searchSuggestions: SuggestionItem[] = suggestionsQuery.data ?? [];
  const searchSuggestPanelOpen =
    showSuggestions &&
    suggestionSearch.length >= 1 &&
    (suggestionsQuery.isFetching ||
      searchSuggestions.length > 0 ||
      suggestionsQuery.isFetched ||
      suggestionsQuery.isError);

  useEffect(() => {
    if (!searchSuggestPanelOpen) {
      setActiveSuggestionIndex(-1);
      return;
    }
    setActiveSuggestionIndex((prev) => {
      if (searchSuggestions.length === 0) return -1;
      if (prev < 0) return 0;
      return Math.min(prev, searchSuggestions.length - 1);
    });
  }, [searchSuggestPanelOpen, searchSuggestions.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applySearchSuggestion = useCallback((suggestion: SuggestionItem) => {
    setSearchInput(suggestion.label);
    setActiveSearch(suggestion.label);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setPage(1);
  }, []);

  const commitSearch = useCallback(() => {
    setActiveSearch(searchInput.trim());
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setPage(1);
  }, [searchInput]);

  const toggleSort = (col: SortColumn) => setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });

  const [columnWidths, setColumnWidths] = useState<Record<SortColumn, number>>(loadSalesSummaryColumnWidths);
  const columnResizeSnapshot = useRef<{ col: SortColumn; startX: number; startW: number } | null>(null);

  const beginColumnResizeDrag = useCallback((onMove: (ev: MouseEvent) => void) => {
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      columnResizeSnapshot.current = null;
      setColumnWidths((w) => {
        saveSalesSummaryColumnWidths(w);
        return w;
      });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const startColumnResize = useCallback((col: SortColumn, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = columnWidths[col];
    columnResizeSnapshot.current = { col, startX, startW };
    beginColumnResizeDrag((ev) => {
      const snap = columnResizeSnapshot.current;
      if (!snap) return;
      const next = clampSalesSummaryColumnWidth(snap.col, snap.startW + (ev.clientX - snap.startX));
      setColumnWidths((w) => ({ ...w, [snap.col]: next }));
    });
  }, [columnWidths, beginColumnResizeDrag]);

  const salesSummaryTableMinWidth = useMemo(() => {
    return SALES_SUMMARY_COLUMNS.reduce((sum, c) => sum + columnWidths[c.key], 0) + 32;
  }, [columnWidths]);

  const resetTableLayout = useCallback(() => {
    clearSalesSummaryTableLayoutPrefs();
    setColumnWidths(sanitizeSalesSummaryColumnWidths(DEFAULT_SALES_SUMMARY_COLUMN_WIDTHS));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [reportAsOfDate, performanceDateParams.startDate, performanceDateParams.endDate, attractionFilter, genreFilter, tourFilter, companyFilter, venueFilter, contactFilter, activeSearch]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const pageCount = isAllPageSize(pageSize)
    ? 1
    : Math.max(1, Math.ceil(serverTotal / pageSize));
  const pageClamped = Math.min(page, pageCount);

  useEffect(() => {
    if (serverTotal > 0 && page > pageCount) setPage(pageCount);
  }, [serverTotal, page, pageCount]);

  const opt = (label: string, values?: string[]) => [{ value: '', label }, ...((values ?? []).map((v) => ({ value: v, label: v })))];
  const attractionOptions = useMemo(() => [{ value: '', label: 'All attractions' }, ...((pageData?.attractions ?? []).map((a) => ({ value: a.attractionName, label: a.attractionName })))], [pageData?.attractions]);
  const companyOptions = useMemo(
    () => [
      { value: '', label: 'All companies' },
      ...companyToSelect2Options(pageData?.filterOptions.companies ?? []),
    ],
    [pageData?.filterOptions.companies],
  );
  const isLoading = (dateOk && query.isPending) || ledgerQuery.isPending;
  const isRefreshing = (query.isFetching || ledgerQuery.isFetching) && !isLoading;
  const dateInputClass = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent transition-colors';

  const cell = ({ row: r, metrics: m }: SummaryRow, key: SortColumn) => {
    const ev = fmtEventDate(r.performanceDate), tm = fmtTime12(r.performanceTime), venueLabel = r.venueName ?? r.venueCompanyName, marketLabel = rowMarketName(r);
    if (key === 'attraction') return <><div className="text-sm font-semibold text-text-primary group-hover:text-ems-accent transition-colors">{r.attractionName ?? empty}</div><div className="mt-1 text-[12px] leading-snug text-text-secondary">{r.tourName ?? <span className="text-text-muted">—</span>}</div></>;
    if (key === 'eventDate') return <><div className="text-sm font-semibold text-text-primary tabular-nums">{ev.date}</div>{tm && <div className="text-[11px] text-text-muted tabular-nums mt-0.5">{tm}</div>}</>;
    if (key === 'venue') return <><div className="truncate max-w-[14rem] font-semibold text-text-primary" title={venueLabel ?? ''}>{venueLabel ?? empty}</div>{r.entertainmentComplexNames ? <div className="truncate mt-0.5 text-[11px] leading-snug text-ems-accent/80" title={r.entertainmentComplexNames}>{r.entertainmentComplexNames}</div> : null}<div className="mt-0.5 text-[12px] leading-snug text-text-secondary">{marketLabel ?? <span className="text-text-muted">—</span>}</div></>;
    const values: Record<SortColumn, React.ReactNode> = {
      attraction: null, eventDate: null, venue: null,
      sellableCapacity: r.engagementSellableCapacity != null ? intText(r.engagementSellableCapacity) : empty,
      grossPotential: r.engagementGrossPotential != null ? money(r.engagementGrossPotential) : empty,
      grossSalesToDate: money(m.currentRevenue) || empty,
      totalSold: m.currentTickets > 0 ? intText(m.currentTickets) : empty,
      venueCapacitySoldPct: m.venueCapacitySoldPct != null ? percent(m.venueCapacitySoldPct) : empty,
      grossPotentialSoldPct: m.grossPotentialSoldPct != null ? percent(m.grossPotentialSoldPct) : empty,
      yesterdayRevenue: m.yesterdayRevenue > 0 ? money(m.yesterdayRevenue) : empty,
      ticketsSoldYesterday: m.ticketsSoldYesterday > 0 ? intText(m.ticketsSoldYesterday) : empty,
      grossSales7Days: m.grossSales7Days > 0 ? money(m.grossSales7Days) : empty,
      ticketsSoldPrevious7Days: m.ticketsSoldPrevious7Days > 0 ? intText(m.ticketsSoldPrevious7Days) : empty,
      grossSales14Days: m.grossSales14Days > 0 ? money(m.grossSales14Days) : empty,
      ticketsSoldPrevious14Days: m.ticketsSoldPrevious14Days > 0 ? intText(m.ticketsSoldPrevious14Days) : empty,
      grossUnsoldRevenue: m.grossUnsoldRevenue != null ? money(m.grossUnsoldRevenue) : empty,
      unsoldTickets: m.unsoldTickets != null ? intText(m.unsoldTickets) : empty,
    };
    return values[key];
  };

  const showFullSkeleton = dateOk && query.isPending && !query.data;
  const showTableOverlay = dateOk && query.isFetching && !!query.data;
  const totalColSpan = SALES_SUMMARY_COLUMNS.length + 1;

  return <div className="space-y-4">
    {isRefreshing && <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden><div className="h-full w-1/3 animate-pulse bg-ems-accent/90" /></div>}
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-text-primary tracking-tight">Overview Report</h1>{!isLoading && <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-text-secondary">{kpis.events.toLocaleString()} {kpis.events === 1 ? 'event' : 'events'}</span>}</div><p className="mt-0.5 text-sm text-text-secondary">A detailed snapshot of selected events</p></div><div className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/60 px-3 py-2 text-xs text-text-secondary"><Info className="h-4 w-4 text-ems-accent shrink-0" aria-hidden /><span>Click a row to view <span className="font-medium text-text-primary">Sales Trends</span> for that event</span></div></div>
    {!isLoading && rows.length > 0 && !!summary && <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard icon={CalendarRange} label="Events" value={kpis.events.toLocaleString()} sub="in selected date scope" tone="blue" /><KpiCard icon={Ticket} label="Total tickets sold" value={kpis.totalSold.toLocaleString()} sub="across selected events" tone="purple" /><KpiCard icon={TrendingUp} label="Revenue yesterday" value={money(kpis.revenueYesterday) || '$0'} sub="from prior day" tone="accent" /><KpiCard icon={DollarSign} label="Total revenue" value={money(kpis.totalRevenue) || '$0'} sub="across selected events" tone="green" /></div>}
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"><aside className="lg:sticky lg:top-[4.5rem] lg:self-start"><div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"><div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-4 py-3"><div className="flex items-center gap-2 min-w-0"><FilterIcon className="h-4 w-4 text-ems-accent shrink-0" aria-hidden /><h2 className="text-sm font-semibold text-text-primary">Filters</h2>{activeFilterCount > 0 && <span className="rounded-full bg-ems-accent/15 text-ems-accent text-[10px] font-semibold tabular-nums ring-1 ring-ems-accent/20 px-2 py-0.5">{activeFilterCount}</span>}</div>{activeFilterCount > 0 && <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-text-secondary hover:text-ems-accent transition-colors" title="Clear all filters"><RotateCcw className="h-3 w-3" aria-hidden />Reset</button>}</div><div className="p-3 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto"><FilterField label="Event date"><Select2 options={EVENT_DATE_SCOPE_OPTIONS} value={eventDateScope} onChange={handleEventDateScopeChange} placeholder="Upcoming" allowClear={false} /></FilterField>{eventDateScope === 'custom' && <div className="rounded-lg border border-border bg-surface/45 p-2.5 space-y-2"><FilterField label="From"><input type="date" className={dateInputClass} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} aria-label="Custom date range from" /></FilterField><FilterField label="To"><input type="date" className={dateInputClass} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} aria-label="Custom date range to" /></FilterField>{!customDatesAreValid && <p className="text-[11px] text-ems-coral">Enter valid from and to dates.</p>}{customDatesAreValid && !customRangeOrderIsValid && <p className="text-[11px] text-ems-coral">To date must be on or after from date.</p>}<button type="button" onClick={applyCustomDateRange} disabled={!customDatesAreValid || !customRangeOrderIsValid || !customRangeHasChanges} className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-ems-accent/30 bg-ems-accent text-sm font-semibold text-white shadow-sm transition-all hover:bg-ems-accent-hover disabled:cursor-not-allowed disabled:border-border disabled:bg-elevated disabled:text-text-muted disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/30">Apply range</button></div>}<div className="h-px bg-border" /><FilterField label="Attraction"><Select2 options={attractionOptions} value={attractionFilter} onChange={setAttractionFilter} placeholder="All attractions" allowClear={!!attractionFilter} /></FilterField><FilterField label="Genre"><Select2 options={opt('All genres', pageData?.filterOptions.genres)} value={genreFilter} onChange={setGenreFilter} placeholder="All genres" allowClear={!!genreFilter} /></FilterField><FilterField label="Tour Name"><Select2 options={opt('All tours', pageData?.filterOptions.tours)} value={tourFilter} onChange={setTourFilter} placeholder="All tours" allowClear={!!tourFilter} /></FilterField>{companyOptions.length > 1 && <FilterField label="Company"><Select2 options={companyOptions} value={companyFilter} onChange={setCompanyFilter} placeholder="All companies" allowClear={!!companyFilter} /></FilterField>}<FilterField label="Venue"><Select2 options={opt('All venues', pageData?.filterOptions.venues)} value={venueFilter} onChange={setVenueFilter} placeholder="All venues" allowClear={!!venueFilter} /></FilterField><FilterField label="Contact"><Select2 options={opt('All contacts', pageData?.filterOptions.contacts)} value={contactFilter} onChange={setContactFilter} placeholder="All contacts" allowClear={!!contactFilter} /></FilterField></div></div></aside>
      <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {showFullSkeleton ? (
          <div className="p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 text-ems-accent animate-spin" /></div>
        ) : (
          <>
            <div className="relative overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md" ref={searchWrapperRef}>
                  <div className="flex min-w-0 items-center border border-border rounded-lg bg-background overflow-hidden focus-within:border-ems-accent shadow-sm transition-colors">
                    <input
                      type="text"
                      className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                      placeholder="Search attractions, tours, venues, markets…"
                      value={searchInput}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSearchInput(v);
                        setShowSuggestions(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onFocus={() => { if (searchInput.trim()) setShowSuggestions(true); }}
                      onBlur={() => setShowSuggestions(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          if (!searchSuggestPanelOpen || searchSuggestions.length === 0) return;
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) =>
                            prev < 0 ? 0 : Math.min(prev + 1, searchSuggestions.length - 1),
                          );
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          if (!searchSuggestPanelOpen || searchSuggestions.length === 0) return;
                          e.preventDefault();
                          setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
                          return;
                        }
                        if (e.key === 'Enter') {
                          if (searchSuggestPanelOpen && activeSuggestionIndex >= 0 && activeSuggestionIndex < searchSuggestions.length) {
                            e.preventDefault();
                            applySearchSuggestion(searchSuggestions[activeSuggestionIndex]);
                            return;
                          }
                          e.preventDefault();
                          commitSearch();
                          return;
                        }
                        if (e.key === 'Escape') { setShowSuggestions(false); setActiveSuggestionIndex(-1); }
                      }}
                    />
                    {(searchInput || activeSearch) && (
                      <button type="button" onClick={() => { setSearchInput(''); setActiveSearch(''); }}
                        className="shrink-0 cursor-pointer px-1 py-1.5 text-text-muted hover:text-text-primary transition-colors" title="Clear search">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    )}
                    <button type="button" onClick={commitSearch}
                      className="shrink-0 flex items-center justify-center w-9 h-9 text-text-muted hover:text-ems-accent transition-colors" title="Search">
                      {query.isFetching && activeSearch ? <Loader2 className="h-4 w-4 animate-spin text-ems-accent" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                  {searchSuggestPanelOpen ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-80 overflow-y-auto" onMouseDown={(e) => e.preventDefault()} aria-busy={suggestionsQuery.isFetching}>
                      {suggestionsQuery.isError ? (
                        <div className="px-3 py-2 text-sm text-ems-coral" role="alert">
                          Could not load suggestions.
                        </div>
                      ) : null}
                      {!suggestionsQuery.isError && suggestionsQuery.isFetching ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-muted" role="status" aria-live="polite">
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
                          <span>Loading suggestions…</span>
                        </div>
                      ) : null}
                      {!suggestionsQuery.isError && !suggestionsQuery.isFetching && searchSuggestions.length > 0
                        ? searchSuggestions.map((s, i) => (
                          <button key={`${s.label}-${s.sublabel}-${i}`} type="button"
                            className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${i === activeSuggestionIndex ? 'bg-hover text-text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}
                            onMouseDown={(e) => { e.preventDefault(); applySearchSuggestion(s); }}>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-text-primary">{s.label}</div>
                              {s.sublabel && <div className="truncate text-xs text-text-muted mt-0.5">{s.sublabel}</div>}
                            </div>
                          </button>
                        ))
                        : null}
                      {!suggestionsQuery.isError && !suggestionsQuery.isFetching && suggestionsQuery.isFetched && searchSuggestions.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-text-muted">No matching suggestions</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  {isRefreshing && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-ems-accent" aria-hidden />Refreshing…</span>}
                  <span className="tabular-nums">
                    <span className="font-medium text-text-primary">{rows.length.toLocaleString()}</span> of{' '}
                    <span className="tabular-nums">{serverTotal.toLocaleString()}</span>
                  </span>
                  <button
                    type="button"
                    onClick={resetTableLayout}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-text-muted shadow-sm transition-all hover:border-ems-accent/35 hover:bg-ems-accent-dim/60 hover:text-ems-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/30"
                    title="Reset column widths"
                    aria-label="Reset column widths to default"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </div>
              {query.isError && <div className="m-4 rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">{friendlyApiError(query.error)}</div>}
              {ledgerQuery.isError && <div className="m-4 rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">{friendlyApiError(ledgerQuery.error)}</div>}
              <div className="relative overflow-x-auto">
                {showTableOverlay && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[1px]" aria-live="polite" aria-busy>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm font-semibold text-text-primary shadow-xl">
                      <Loader2 className="h-5 w-5 animate-spin text-ems-accent" aria-hidden />
                      <span>Loading filtered results...</span>
                    </div>
                  </div>
                )}
                <table className="w-full table-fixed text-sm" style={{ minWidth: salesSummaryTableMinWidth }}>
                  <colgroup>
                    {SALES_SUMMARY_COLUMNS.map((c) => <col key={c.key} style={{ width: columnWidths[c.key] }} />)}
                    <col style={{ width: 32 }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm">
                    <tr className="border-b-0">
                      <th colSpan={3} className="border-b-[3px] border-slate-700/80 bg-white px-3 py-1.5" aria-hidden />
                      {SALES_SUMMARY_METRIC_COLUMN_GROUPS.map((group, groupIndex) => (
                        <th
                          key={group.label}
                          scope="colgroup"
                          colSpan={group.keys.length}
                          className={`px-2 py-1.5 text-center text-[11px] font-bold leading-tight text-slate-950 ${salesSummaryGroupHeaderClass(groupIndex)}`}
                        >
                          {group.label}
                        </th>
                      ))}
                      <th className="w-8 border-b-[3px] border-slate-700/80 bg-white px-2 py-1.5" aria-hidden />
                    </tr>
                    <tr className="border-b-[3px] border-slate-700/80">
                      {SALES_SUMMARY_COLUMNS.map((c) => <SortHeader key={c.key} col={c.key} label={c.label} title={c.title} sort={sort} onToggle={toggleSort} align={c.align} onResizeStart={(e) => startColumnResize(c.key, e)} className={salesSummaryColumnChromeClass(c.key, 'header')} />)}
                      <th className="w-8 border-l border-slate-200 bg-white px-2 py-3" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {query.isPending && !query.data ? (
                      Array.from({ length: 8 }).map((_, i) => <tr key={`skel-${i}`} className="border-b border-border/50">{SALES_SUMMARY_COLUMNS.map((c, j) => <td key={c.key} className={`px-4 py-3.5 ${salesSummaryColumnChromeClass(c.key, 'body')}`}><div className="h-3 rounded bg-muted/70 animate-pulse" style={{ width: j === 0 ? '82%' : j < 4 ? '70%' : '50%' }} /></td>)}<td className="w-8 bg-white px-2 py-3.5" aria-hidden /></tr>)
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={totalColSpan} className="py-16"><div className="flex flex-col items-center justify-center gap-2 text-text-muted"><div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated"><CalendarRange className="h-6 w-6 text-text-muted" aria-hidden /></div><p className="text-sm font-medium text-text-secondary">No events match your filters</p><p className="text-xs">Try changing the date scope or clearing filters.</p>{activeFilterCount > 0 && <button type="button" onClick={reset} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-hover transition-colors"><RotateCcw className="h-3 w-3" aria-hidden />Reset filters</button>}</div></td></tr>
                    ) : (
                      rows.map((item, idx) => <tr key={`${item.row.performanceId}-${item.row.engagementId}`} className={`group border-b border-border/60 cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-surface/30' : ''} hover:bg-ems-accent-dim/30`} onClick={() => onOpenEngagement(item.row.engagementId, item.row.performanceId)} title="Open sales trends">{SALES_SUMMARY_COLUMNS.map((c) => <td key={c.key} className={`max-w-0 overflow-hidden px-3 py-3 align-top text-sm ${salesSummaryColumnChromeClass(c.key, 'body')} ${c.align === 'right' ? 'text-right tabular-nums' : 'text-text-secondary'}`}>{cell(item, c.key)}</td>)}<td className="w-8 px-2 py-3 align-middle text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" aria-hidden /></td></tr>)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {serverTotal > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1 py-2.5">
                <p className="tabular-nums">
                  <span>
                    Showing{' '}
                    <span className="text-text-primary font-medium">
                      {isAllPageSize(pageSize)
                        ? `1–${serverTotal}`
                        : `${(pageClamped - 1) * Number(pageSize) + 1}–${Math.min(pageClamped * Number(pageSize), serverTotal)}`}
                    </span>{' '}
                    of <span className="text-text-primary font-medium">{serverTotal.toLocaleString()}</span> events
                  </span>
                  {!isAllPageSize(pageSize) && (
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-text-secondary ml-2">
                      <span aria-hidden>·</span>
                      <PageSizeSelect value={pageSize} onChange={setPageSize} disabled={query.isFetching} />
                      <span>per page</span>
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={pageClamped <= 1} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium">Previous</button>
                  <span className="tabular-nums text-text-muted">Page {pageClamped}{!isAllPageSize(pageSize) && pageCount > 0 ? ` / ${pageCount}` : ''}</span>
                  <button disabled={pageClamped >= pageCount} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  </div>;
}
