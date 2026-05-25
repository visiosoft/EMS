import React, { useEffect, useMemo, useState } from 'react';
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
import { fetchDailySales, fetchDailySalesByPerformance, type ApiDailySalesRow, type ApiPerformanceSalesRow } from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { Select2 } from './Select2';

interface Props { onOpenEngagement: (engagementId: number, performanceId: number) => void }

type SortColumn =
  | 'attraction' | 'eventDate' | 'venue' | 'sellableCapacity' | 'grossPotential' | 'grossSalesToDate'
  | 'totalSold' | 'venueCapacitySoldPct' | 'grossPotentialSoldPct' | 'yesterdayRevenue'
  | 'ticketsSoldYesterday' | 'grossSales7Days' | 'ticketsSoldPrevious7Days'
  | 'grossSales14Days' | 'ticketsSoldPrevious14Days' | 'grossUnsoldRevenue' | 'unsoldTickets';

type SortState = { col: SortColumn; dir: 'asc' | 'desc' };
const SALES_SUMMARY_SORT_STATE_STORAGE_KEY = 'iae-sales-summary-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';
type Snapshot = { tickets: number; revenue: number };
type LedgerRow = Snapshot & { salesDate: string };
type Ledger = Map<number, LedgerRow[]>;
type Metrics = {
  currentTickets: number; currentRevenue: number; ticketsSoldYesterday: number; yesterdayRevenue: number;
  grossSales7Days: number; ticketsSoldPrevious7Days: number; grossSales14Days: number; ticketsSoldPrevious14Days: number;
  grossUnsoldRevenue: number | null; unsoldTickets: number | null; venueCapacitySoldPct: number | null; grossPotentialSoldPct: number | null;
};
type SummaryRow = { row: ApiPerformanceSalesRow; metrics: Metrics };

type RowWithMarket = ApiPerformanceSalesRow & { dmaMarketName?: string | null };
function loadSalesSummarySortState(): SortState {
  if (typeof window === 'undefined') return { col: 'eventDate', dir: 'asc' };
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
      return { col: 'eventDate', dir: 'asc' };
    }
    const raw = localStorage.getItem(SALES_SUMMARY_SORT_STATE_STORAGE_KEY);
    if (!raw) return { col: 'eventDate', dir: 'asc' };
    const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
    const validCols = new Set<SortColumn>([
      'attraction',
      'eventDate',
      'venue',
      'sellableCapacity',
      'grossPotential',
      'grossSalesToDate',
      'totalSold',
      'venueCapacitySoldPct',
      'grossPotentialSoldPct',
      'yesterdayRevenue',
      'ticketsSoldYesterday',
      'grossSales7Days',
      'ticketsSoldPrevious7Days',
      'grossSales14Days',
      'ticketsSoldPrevious14Days',
      'grossUnsoldRevenue',
      'unsoldTickets',
    ]);
    const col =
      typeof parsed.col === 'string' && validCols.has(parsed.col as SortColumn)
        ? (parsed.col as SortColumn)
        : 'eventDate';
    const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
    return { col, dir };
  } catch {
    return { col: 'eventDate', dir: 'asc' };
  }
}

function saveSalesSummarySortState(state: SortState) {
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
    localStorage.setItem(SALES_SUMMARY_SORT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

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
function ymdAddMonths(s: string, months: number) { const [y, m, d] = s.split('-').map(Number); if (!y || !m || !d) return s; const dt = new Date(y, m - 1, d); dt.setMonth(dt.getMonth() + months); return ymd(dt); }
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
function SortHeader({ col, label, sort, onToggle, align, title }: { col: SortColumn; label: React.ReactNode; sort: SortState; onToggle: (col: SortColumn) => void; align?: 'left' | 'right'; title?: string }) {
  const active = sort.col === col; const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return <th scope="col" className={`px-4 py-3 align-middle select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}><button type="button" onClick={() => onToggle(col)} className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide transition-colors ${active ? 'text-ems-accent' : 'text-text-secondary hover:text-text-primary'} ${align === 'right' ? 'justify-end w-full' : 'justify-start'}`} title={`Sort by ${title ?? (typeof label === 'string' ? label : col)}`}><span className="leading-tight normal-case">{label}</span>{active ? <Arrow className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden /> : <span className="inline-block h-3.5 w-3.5 shrink-0 opacity-0" aria-hidden />}</button></th>;
}
function FilterField({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>; }
const empty = <span className="text-text-muted font-normal">—</span>;

export function SalesSummaryPage({ onOpenEngagement }: Props) {
  const today = ymd(); const defaultStart = today; const defaultEnd = ymdAddMonths(today, 4);
  const [startDate, setStartDate] = useState(defaultStart), [endDate, setEndDate] = useState(defaultEnd);
  const [attractionFilter, setAttractionFilter] = useState(''), [genreFilter, setGenreFilter] = useState(''), [tourFilter, setTourFilter] = useState(''), [companyFilter, setCompanyFilter] = useState(''), [venueFilter, setVenueFilter] = useState(''), [contactFilter, setContactFilter] = useState(''), [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortState>(loadSalesSummarySortState);
  const iso = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim()); const rangeOk = iso(startDate) && iso(endDate) && startDate <= endDate; const reportAsOfDate = rangeOk ? startDate : today;
  const activeFilterCount = [attractionFilter, genreFilter, tourFilter, companyFilter, venueFilter, contactFilter].filter(Boolean).length;
  const reset = () => { setAttractionFilter(''); setGenreFilter(''); setTourFilter(''); setCompanyFilter(''); setVenueFilter(''); setContactFilter(''); setSearchInput(''); setStartDate(defaultStart); setEndDate(defaultEnd); };
  useEffect(() => {
    saveSalesSummarySortState(sort);
  }, [sort]);

  const query = useQuery({ queryKey: ['sales-summary', reportAsOfDate, startDate, endDate, attractionFilter, genreFilter, tourFilter, companyFilter, venueFilter, contactFilter], queryFn: () => fetchDailySalesByPerformance(reportAsOfDate, { page: 1, pageSize: 1000, startDate: rangeOk ? startDate : undefined, endDate: rangeOk ? endDate : undefined, attraction: attractionFilter || undefined, genre: genreFilter || undefined, tour: tourFilter || undefined, company: companyFilter || undefined, venue: venueFilter || undefined, contact: contactFilter || undefined }), staleTime: 2 * 60 * 1000, placeholderData: (prev) => prev, enabled: rangeOk });
  const ledgerQuery = useQuery({ queryKey: ['sales-summary-daily-sales-ledger'], queryFn: () => fetchDailySales(), staleTime: 2 * 60 * 1000, placeholderData: (prev) => prev });
  const pageData = query.data; const rawRows = pageData?.items ?? []; const ledger = useMemo(() => buildLedger(ledgerQuery.data ?? []), [ledgerQuery.data]); const ledgerReady = Array.isArray(ledgerQuery.data);
  const searchedRows = useMemo(() => { const q = searchInput.trim().toLowerCase(); if (!q) return rawRows; return rawRows.filter((r) => [r.attractionName, r.tourName, r.venueName, r.venueCompanyName, rowMarketName(r), r.performanceDate].filter(Boolean).join(' ').toLowerCase().includes(q)); }, [rawRows, searchInput]);
  const rowsWithMetrics = useMemo(() => searchedRows.map((row) => ({ row, metrics: metricsFor(row, ledger, reportAsOfDate, ledgerReady) })), [ledger, ledgerReady, reportAsOfDate, searchedRows]);
  const rows = useMemo(() => sortRows(rowsWithMetrics, sort), [rowsWithMetrics, sort]);
  const kpis = useMemo(() => rows.reduce((a, x) => ({ events: a.events + 1, totalSold: a.totalSold + x.metrics.currentTickets, totalRevenue: a.totalRevenue + x.metrics.currentRevenue, revenueYesterday: a.revenueYesterday + x.metrics.yesterdayRevenue }), { events: 0, totalSold: 0, totalRevenue: 0, revenueYesterday: 0 }), [rows]);
  const toggleSort = (col: SortColumn) => setSort((s) => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  const opt = (label: string, values?: string[]) => [{ value: '', label }, ...((values ?? []).map((v) => ({ value: v, label: v })))] ;
  const attractionOptions = useMemo(() => [{ value: '', label: 'All attractions' }, ...((pageData?.attractions ?? []).map((a) => ({ value: a.attractionName, label: a.attractionName })))], [pageData?.attractions]);
  const isLoading = query.isPending || ledgerQuery.isPending; const isRefreshing = (query.isFetching || ledgerQuery.isFetching) && !isLoading; const dateInputClass = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent transition-colors';
  const columns: Array<{ key: SortColumn; label: React.ReactNode; title?: string; align?: 'right' }> = [
    { key: 'attraction', label: 'Attraction, Tour' },
    { key: 'eventDate', label: <span className="italic">Opening Performance Date</span>, title: 'Opening Performance Date' },
    { key: 'venue', label: <span className="italic">Venue, City</span>, title: 'Venue, City' },
    { key: 'sellableCapacity', label: <span className="italic">Sellable Capacity</span>, align: 'right' },
    { key: 'grossPotential', label: <span className="italic">Gross Ticket Sales Potential</span>, align: 'right' },
    { key: 'grossSalesToDate', label: <span className="italic">Gross Sales To Date</span>, align: 'right' },
    { key: 'totalSold', label: <span className="italic">Cumulative Tickets Sold To Date</span>, align: 'right' },
    { key: 'venueCapacitySoldPct', label: <span className="italic">Percentage of Venue Capacity Sold to Date</span>, align: 'right' },
    { key: 'grossPotentialSoldPct', label: <span className="italic">Percentage of Gross Potential Sold to Date</span>, align: 'right' },
    { key: 'yesterdayRevenue', label: <span className="italic">Yesterday's Sales Revenue</span>, align: 'right' },
    { key: 'ticketsSoldYesterday', label: <span className="italic">Tickets Sold Yesterday</span>, align: 'right' },
    { key: 'grossSales7Days', label: <span className="italic">7 Day Gross Sales</span>, align: 'right' },
    { key: 'ticketsSoldPrevious7Days', label: <span className="italic"># Tix Sold Previous 7 Days</span>, align: 'right' },
    { key: 'grossSales14Days', label: <span className="italic">14 Day Gross Sales</span>, align: 'right' },
    { key: 'ticketsSoldPrevious14Days', label: <span className="italic"># Tix Sold Previous 14 Days</span>, align: 'right' },
    { key: 'grossUnsoldRevenue', label: <span className="italic">Gross Unsold Revenue</span>, align: 'right' },
    { key: 'unsoldTickets', label: <span className="italic">Unsold # of Tickets</span>, align: 'right' },
  ];
  const cell = ({ row: r, metrics: m }: SummaryRow, key: SortColumn) => {
    const ev = fmtEventDate(r.performanceDate), tm = fmtTime12(r.performanceTime), venueLabel = r.venueName ?? r.venueCompanyName, marketLabel = rowMarketName(r);
    if (key === 'attraction') return <><div className="text-sm font-semibold text-text-primary group-hover:text-ems-accent transition-colors">{r.attractionName ?? empty}</div><div className="mt-1 text-[12px] leading-snug text-text-secondary">{r.tourName ?? <span className="text-text-muted">—</span>}</div></>;
    if (key === 'eventDate') return <><div className="text-sm font-semibold text-text-primary tabular-nums">{ev.date}</div>{tm && <div className="text-[11px] text-text-muted tabular-nums mt-0.5">{tm}</div>}</>;
    if (key === 'venue') return <><div className="truncate max-w-[14rem] font-semibold text-text-primary" title={venueLabel ?? ''}>{venueLabel ?? empty}</div><div className="mt-1 text-[12px] leading-snug text-text-secondary">{marketLabel ?? <span className="text-text-muted">—</span>}</div></>;
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

  return <div className="space-y-4">
    {isRefreshing && <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden><div className="h-full w-1/3 animate-pulse bg-ems-accent/90" /></div>}
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-text-primary tracking-tight">Overview Report</h1>{!isLoading && <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-text-secondary">{kpis.events.toLocaleString()} {kpis.events === 1 ? 'event' : 'events'}</span>}</div><p className="mt-0.5 text-sm text-text-secondary">A detailed snapshot of upcoming events</p></div><div className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/60 px-3 py-2 text-xs text-text-secondary"><Info className="h-4 w-4 text-ems-accent shrink-0" aria-hidden /><span>Click a row to view <span className="font-medium text-text-primary">Sales Trends</span> for that event</span></div></div>
    {!isLoading && rows.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><KpiCard icon={CalendarRange} label="Events" value={kpis.events.toLocaleString()} sub="in the selected range" tone="blue" /><KpiCard icon={Ticket} label="Total tickets sold" value={kpis.totalSold.toLocaleString()} sub="across all events" tone="purple" /><KpiCard icon={TrendingUp} label="Revenue yesterday" value={money(kpis.revenueYesterday) || '$0'} sub="from prior day" tone="accent" /><KpiCard icon={DollarSign} label="Total revenue" value={money(kpis.totalRevenue) || '$0'} sub="across all events" tone="green" /></div>}
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"><aside className="lg:sticky lg:top-[4.5rem] lg:self-start"><div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"><div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-4 py-3"><div className="flex items-center gap-2 min-w-0"><FilterIcon className="h-4 w-4 text-ems-accent shrink-0" aria-hidden /><h2 className="text-sm font-semibold text-text-primary">Filters</h2>{activeFilterCount > 0 && <span className="rounded-full bg-ems-accent/15 text-ems-accent text-[10px] font-semibold tabular-nums ring-1 ring-ems-accent/20 px-2 py-0.5">{activeFilterCount}</span>}</div>{(activeFilterCount > 0 || searchInput) && <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-text-secondary hover:text-ems-accent transition-colors" title="Clear all filters"><RotateCcw className="h-3 w-3" aria-hidden />Reset</button>}</div><div className="p-3 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto"><FilterField label="Event Date Range"><div className="grid grid-cols-1 gap-2"><div><span className="block text-[10px] font-medium text-text-muted mb-0.5">From</span><input type="date" className={dateInputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} aria-label="Range start" /></div><div><span className="block text-[10px] font-medium text-text-muted mb-0.5">To</span><input type="date" className={dateInputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} aria-label="Range end" /></div></div>{!rangeOk && <p className="mt-1 text-[11px] text-ems-coral">End date must be on or after start date.</p>}</FilterField><div className="h-px bg-border" /><FilterField label="Attraction"><Select2 options={attractionOptions} value={attractionFilter} onChange={setAttractionFilter} placeholder="All attractions" allowClear={!!attractionFilter} /></FilterField><FilterField label="Genre"><Select2 options={opt('All genres', pageData?.filterOptions.genres)} value={genreFilter} onChange={setGenreFilter} placeholder="All genres" allowClear={!!genreFilter} /></FilterField><FilterField label="Tour Name"><Select2 options={opt('All tours', pageData?.filterOptions.tours)} value={tourFilter} onChange={setTourFilter} placeholder="All tours" allowClear={!!tourFilter} /></FilterField><FilterField label="Company"><Select2 options={opt('All companies', pageData?.filterOptions.companies)} value={companyFilter} onChange={setCompanyFilter} placeholder="All companies" allowClear={!!companyFilter} /></FilterField><FilterField label="Venue"><Select2 options={opt('All venues', pageData?.filterOptions.venues)} value={venueFilter} onChange={setVenueFilter} placeholder="All venues" allowClear={!!venueFilter} /></FilterField><FilterField label="Contact"><Select2 options={opt('All contacts', pageData?.filterOptions.contacts)} value={contactFilter} onChange={setContactFilter} placeholder="All contacts" allowClear={!!contactFilter} /></FilterField></div></div></aside>
      <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden"><div className="flex flex-col gap-2 border-b border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative flex-1 max-w-md"><Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" aria-hidden /><input type="text" className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent transition-colors" placeholder="Search attractions, tours, venues, markets…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search rows" /></div><div className="flex items-center gap-3 text-xs text-text-muted">{isRefreshing && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-ems-accent" aria-hidden />Refreshing…</span>}<span className="tabular-nums"><span className="font-medium text-text-primary">{rows.length.toLocaleString()}</span> of <span className="tabular-nums">{rawRows.length.toLocaleString()}</span></span></div></div>{query.isError && <div className="m-4 rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">{friendlyApiError(query.error)}</div>}{ledgerQuery.isError && <div className="m-4 rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">{friendlyApiError(ledgerQuery.error)}</div>}
        <div className="relative overflow-x-auto"><table className="w-full text-sm" style={{ minWidth: '2220px' }}><thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm"><tr className="border-b border-border">{columns.map((c) => <SortHeader key={c.key} col={c.key} label={c.label} title={c.title} sort={sort} onToggle={toggleSort} align={c.align} />)}<th className="w-8 px-2 py-3" aria-hidden /></tr></thead><tbody>{isLoading ? Array.from({ length: 8 }).map((_, i) => <tr key={`skel-${i}`} className="border-b border-border/50">{Array.from({ length: 18 }).map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-3 rounded bg-muted/70 animate-pulse" style={{ width: j === 0 ? '82%' : j < 4 ? '70%' : '50%' }} /></td>)}</tr>) : rows.length === 0 ? <tr><td colSpan={18} className="py-16"><div className="flex flex-col items-center justify-center gap-2 text-text-muted"><div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated"><CalendarRange className="h-6 w-6 text-text-muted" aria-hidden /></div><p className="text-sm font-medium text-text-secondary">No events match your filters</p><p className="text-xs">Try widening the date range or clearing filters.</p>{(activeFilterCount > 0 || searchInput) && <button type="button" onClick={reset} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-hover transition-colors"><RotateCcw className="h-3 w-3" aria-hidden />Reset filters</button>}</div></td></tr> : rows.map((item, idx) => <tr key={`${item.row.performanceId}-${item.row.engagementId}`} className={`group border-b border-border/60 cursor-pointer transition-colors ${idx % 2 === 1 ? 'bg-surface/30' : ''} hover:bg-ems-accent-dim/30`} onClick={() => onOpenEngagement(item.row.engagementId, item.row.performanceId)} title="Open sales trends">{columns.map((c) => <td key={c.key} className={`px-4 py-3 align-top text-sm ${c.align === 'right' ? 'text-right tabular-nums' : 'text-text-secondary'}`}>{cell(item, c.key)}</td>)}<td className="w-8 px-2 py-3 align-middle text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" aria-hidden /></td></tr>)}</tbody></table></div>
        {!isLoading && rows.length > 0 && <div className="flex items-center justify-between gap-3 border-t border-border bg-surface/30 px-4 py-2.5 text-xs text-text-muted"><span>Showing <span className="font-medium text-text-primary tabular-nums">{rows.length.toLocaleString()}</span> {rows.length === 1 ? 'event' : 'events'}</span><span className="tabular-nums">Total revenue: <span className="font-semibold text-ems-green">{money(kpis.totalRevenue) || '$0'}</span></span></div>}
      </section></div>
  </div>;
}
