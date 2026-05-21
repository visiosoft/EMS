import React, { useMemo, useState } from 'react';
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
import {
  fetchDailySalesByPerformance,
  type ApiPerformanceSalesRow,
} from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { Select2 } from './Select2';

interface Props {
  onOpenEngagement: (engagementId: number, performanceId: number) => void;
}

type SortColumn =
  | 'attraction'
  | 'eventDate'
  | 'venue'
  | 'sellableCapacity'
  | 'grossPotential'
  | 'grossSalesToDate'
  | 'soldYesterday'
  | 'totalSold'
  | 'yesterdayRevenue'
  | 'totalRevenue';

interface SortState {
  col: SortColumn;
  dir: 'asc' | 'desc';
}

type PerformanceSalesRowWithMarket = ApiPerformanceSalesRow & {
  dmaMarketName?: string | null;
};

function rowMarketName(row: ApiPerformanceSalesRow): string | null {
  const withMarket = row as PerformanceSalesRowWithMarket;
  return withMarket.dmaMarketName ?? row.city ?? null;
}

function finiteNumberOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function grossSalesToDate(row: ApiPerformanceSalesRow): number | null {
  // This column is the latest available dbo.TicketingSales.PerformanceSalesRevenue
  // value shown in Daily Sales, not the cumulative/summed totalRevenue rollup.
  return finiteNumberOrNull(row.todayRevenue) ?? finiteNumberOrNull(row.yesterdayRevenue);
}

function todayLocalYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdAddMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function fmtCurrency(n: number | null | undefined, compact = false): string {
  if (n == null || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n);
}

function fmtEventDate(iso: string): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' };
  const dt = new Date(`${iso}T12:00:00`);
  return {
    date: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }),
    time: '',
  };
}

function fmtTime12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const hr = h % 12 || 12;
  const mm = String(m).padStart(2, '0');
  return `${String(hr).padStart(2, '0')}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  const aa = (a ?? '').toString().toLowerCase();
  const bb = (b ?? '').toString().toLowerCase();
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

function compareNumbers(a: number | null | undefined, b: number | null | undefined): number {
  const aa = a == null || !Number.isFinite(a) ? -Infinity : Number(a);
  const bb = b == null || !Number.isFinite(b) ? -Infinity : Number(b);
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

function sortRows(rows: ApiPerformanceSalesRow[], sort: SortState): ApiPerformanceSalesRow[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((a, b) => {
    let n = 0;
    switch (sort.col) {
      case 'attraction':
        n = compareStrings(a.attractionName, b.attractionName) || compareStrings(a.tourName, b.tourName);
        break;
      case 'eventDate':
        n = compareStrings(`${a.performanceDate}T${a.performanceTime ?? '00:00:00'}`, `${b.performanceDate}T${b.performanceTime ?? '00:00:00'}`);
        break;
      case 'venue':
        n =
          compareStrings(a.venueName ?? a.venueCompanyName, b.venueName ?? b.venueCompanyName) ||
          compareStrings(rowMarketName(a), rowMarketName(b));
        break;
      case 'sellableCapacity':
        n = compareNumbers(a.engagementSellableCapacity, b.engagementSellableCapacity);
        break;
      case 'grossPotential':
        n = compareNumbers(a.engagementGrossPotential, b.engagementGrossPotential);
        break;
      case 'grossSalesToDate':
        n = compareNumbers(grossSalesToDate(a), grossSalesToDate(b));
        break;
      case 'soldYesterday':
        n = compareNumbers(a.soldYesterday, b.soldYesterday);
        break;
      case 'totalSold':
        n = compareNumbers(a.totalSold, b.totalSold);
        break;
      case 'yesterdayRevenue':
        n = compareNumbers(a.yesterdayRevenue, b.yesterdayRevenue);
        break;
      case 'totalRevenue':
        n = compareNumbers(a.totalRevenue, b.totalRevenue);
        break;
    }
    return n * sign;
  });
  return out;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: 'accent' | 'blue' | 'green' | 'purple';
}) {
  const toneShell: Record<typeof tone, string> = {
    accent: 'border-ems-accent/25 bg-ems-accent-dim/40',
    blue: 'border-ems-blue/25 bg-ems-blue-dim/40',
    green: 'border-ems-green/25 bg-ems-green-dim/40',
    purple: 'border-ems-purple/25 bg-ems-purple-dim/40',
  };
  const toneIcon: Record<typeof tone, string> = {
    accent: 'bg-ems-accent/15 text-ems-accent',
    blue: 'bg-ems-blue/15 text-ems-blue',
    green: 'bg-ems-green/15 text-ems-green',
    purple: 'bg-ems-purple/15 text-ems-purple',
  };
  return (
    <div className={['rounded-xl border p-3.5 transition-colors shadow-sm', toneShell[tone]].join(' ')}>
      <div className="flex items-center gap-2.5">
        <span className={['inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0', toneIcon[tone]].join(' ')}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
          <div className="text-lg font-semibold text-text-primary tabular-nums leading-tight mt-0.5">{value}</div>
        </div>
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-text-secondary">{sub}</div>}
    </div>
  );
}

function SortHeader({
  col,
  label,
  sort,
  onToggle,
  align,
  className,
  title,
}: {
  col: SortColumn;
  label: React.ReactNode;
  sort: SortState;
  onToggle: (col: SortColumn) => void;
  align?: 'left' | 'right';
  className?: string;
  title?: string;
}) {
  const active = sort.col === col;
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={[
        'px-4 py-3 align-middle select-none whitespace-nowrap',
        align === 'right' ? 'text-right' : 'text-left',
        className ?? '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onToggle(col)}
        className={[
          'inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide transition-colors',
          active ? 'text-ems-accent' : 'text-text-secondary hover:text-text-primary',
          align === 'right' ? 'justify-end w-full' : 'justify-start',
        ].join(' ')}
        title={`Sort by ${title ?? (typeof label === 'string' ? label : col)}`}
      >
        <span className="leading-tight normal-case">{label}</span>
        {active ? <Arrow className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden /> : <span className="inline-block h-3.5 w-3.5 shrink-0 opacity-0" aria-hidden />}
      </button>
    </th>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</label>
      {children}
    </div>
  );
}

export function SalesSummaryPage({ onOpenEngagement }: Props) {
  const today = todayLocalYmd();
  const defaultStart = today;
  const defaultEnd = ymdAddMonths(today, 4);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [attractionFilter, setAttractionFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [tourFilter, setTourFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<SortState>({ col: 'eventDate', dir: 'asc' });

  const isoYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  const rangeOk = isoYmd(startDate) && isoYmd(endDate) && startDate <= endDate;

  const activeFilterCount =
    (attractionFilter ? 1 : 0) +
    (genreFilter ? 1 : 0) +
    (tourFilter ? 1 : 0) +
    (companyFilter ? 1 : 0) +
    (venueFilter ? 1 : 0) +
    (contactFilter ? 1 : 0);

  const handleResetFilters = () => {
    setAttractionFilter('');
    setGenreFilter('');
    setTourFilter('');
    setCompanyFilter('');
    setVenueFilter('');
    setContactFilter('');
    setSearchInput('');
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  };

  const query = useQuery({
    queryKey: ['sales-summary', today, startDate, endDate, attractionFilter, genreFilter, tourFilter, companyFilter, venueFilter, contactFilter],
    queryFn: () =>
      fetchDailySalesByPerformance(today, {
        page: 1,
        pageSize: 1000,
        startDate: rangeOk ? startDate : undefined,
        endDate: rangeOk ? endDate : undefined,
        attraction: attractionFilter || undefined,
        genre: genreFilter || undefined,
        tour: tourFilter || undefined,
        company: companyFilter || undefined,
        venue: venueFilter || undefined,
        contact: contactFilter || undefined,
      }),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    enabled: rangeOk,
  });

  const pageData = query.data;
  const rawRows = pageData?.items ?? [];

  const searchedRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return rawRows;
    return rawRows.filter((r) => {
      const hay = [r.attractionName, r.tourName, r.venueName, r.venueCompanyName, rowMarketName(r), r.performanceDate]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rawRows, searchInput]);

  const rows = useMemo(() => sortRows(searchedRows, sort), [searchedRows, sort]);

  const kpis = useMemo(() => {
    let totalSold = 0;
    let totalRevenue = 0;
    let revenueYesterday = 0;
    for (const r of rows) {
      totalSold += r.totalSold ?? 0;
      totalRevenue += r.totalRevenue ?? 0;
      revenueYesterday += r.yesterdayRevenue ?? 0;
    }
    return { events: rows.length, totalSold, totalRevenue, revenueYesterday };
  }, [rows]);

  const toggleSort = (col: SortColumn) => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  };

  const attractionOptions = useMemo(() => [{ value: '', label: 'All attractions' }, ...((pageData?.attractions ?? []).map((a) => ({ value: a.attractionName, label: a.attractionName })))], [pageData?.attractions]);
  const genreOptions = useMemo(() => [{ value: '', label: 'All genres' }, ...((pageData?.filterOptions.genres ?? []).map((n) => ({ value: n, label: n })))], [pageData?.filterOptions.genres]);
  const tourOptions = useMemo(() => [{ value: '', label: 'All tours' }, ...((pageData?.filterOptions.tours ?? []).map((n) => ({ value: n, label: n })))], [pageData?.filterOptions.tours]);
  const companyOptions = useMemo(() => [{ value: '', label: 'All companies' }, ...((pageData?.filterOptions.companies ?? []).map((n) => ({ value: n, label: n })))], [pageData?.filterOptions.companies]);
  const venueOptions = useMemo(() => [{ value: '', label: 'All venues' }, ...((pageData?.filterOptions.venues ?? []).map((n) => ({ value: n, label: n })))], [pageData?.filterOptions.venues]);
  const contactOptions = useMemo(() => [{ value: '', label: 'All contacts' }, ...((pageData?.filterOptions.contacts ?? []).map((n) => ({ value: n, label: n })))], [pageData?.filterOptions.contacts]);

  const isLoading = query.isPending;
  const isFetching = query.isFetching;
  const isRefreshing = isFetching && !isLoading;
  const dateInputClass = 'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent transition-colors';

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 animate-pulse bg-ems-accent/90" />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Overview Report</h1>
            {!isLoading && <span className="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-text-secondary">{kpis.events.toLocaleString()} {kpis.events === 1 ? 'event' : 'events'}</span>}
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">A detailed snapshot of upcoming events</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/60 px-3 py-2 text-xs text-text-secondary">
          <Info className="h-4 w-4 text-ems-accent shrink-0" aria-hidden />
          <span>Click a row to view <span className="font-medium text-text-primary">Sales Trends</span> for that event</span>
        </div>
      </div>

      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={CalendarRange} label="Events" value={kpis.events.toLocaleString()} sub="in the selected range" tone="blue" />
          <KpiCard icon={Ticket} label="Total tickets sold" value={kpis.totalSold.toLocaleString()} sub="across all events" tone="purple" />
          <KpiCard icon={TrendingUp} label="Revenue yesterday" value={fmtCurrency(kpis.revenueYesterday) || '$0'} sub="from prior day" tone="accent" />
          <KpiCard icon={DollarSign} label="Total revenue" value={fmtCurrency(kpis.totalRevenue) || '$0'} sub="across all events" tone="green" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FilterIcon className="h-4 w-4 text-ems-accent shrink-0" aria-hidden />
                <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
                {activeFilterCount > 0 && <span className="rounded-full bg-ems-accent/15 text-ems-accent text-[10px] font-semibold tabular-nums ring-1 ring-ems-accent/20 px-2 py-0.5">{activeFilterCount}</span>}
              </div>
              {(activeFilterCount > 0 || searchInput) && (
                <button type="button" onClick={handleResetFilters} className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-text-secondary hover:text-ems-accent transition-colors" title="Clear all filters">
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Reset
                </button>
              )}
            </div>
            <div className="p-3 space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <FilterField label="Event Date Range">
                <div className="grid grid-cols-1 gap-2">
                  <div><span className="block text-[10px] font-medium text-text-muted mb-0.5">From</span><input type="date" className={dateInputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} aria-label="Range start" /></div>
                  <div><span className="block text-[10px] font-medium text-text-muted mb-0.5">To</span><input type="date" className={dateInputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} aria-label="Range end" /></div>
                </div>
                {!rangeOk && <p className="mt-1 text-[11px] text-ems-coral">End date must be on or after start date.</p>}
              </FilterField>
              <div className="h-px bg-border" />
              <FilterField label="Attraction"><Select2 options={attractionOptions} value={attractionFilter} onChange={setAttractionFilter} placeholder="All attractions" allowClear={!!attractionFilter} /></FilterField>
              <FilterField label="Genre"><Select2 options={genreOptions} value={genreFilter} onChange={setGenreFilter} placeholder="All genres" allowClear={!!genreFilter} /></FilterField>
              <FilterField label="Tour Name"><Select2 options={tourOptions} value={tourFilter} onChange={setTourFilter} placeholder="All tours" allowClear={!!tourFilter} /></FilterField>
              <FilterField label="Company"><Select2 options={companyOptions} value={companyFilter} onChange={setCompanyFilter} placeholder="All companies" allowClear={!!companyFilter} /></FilterField>
              <FilterField label="Venue"><Select2 options={venueOptions} value={venueFilter} onChange={setVenueFilter} placeholder="All venues" allowClear={!!venueFilter} /></FilterField>
              <FilterField label="Contact"><Select2 options={contactOptions} value={contactFilter} onChange={setContactFilter} placeholder="All contacts" allowClear={!!contactFilter} /></FilterField>
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" aria-hidden />
              <input type="text" className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 focus:border-ems-accent transition-colors" placeholder="Search attractions, tours, venues, markets…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search rows" />
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              {isRefreshing && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin text-ems-accent" aria-hidden />Refreshing…</span>}
              <span className="tabular-nums"><span className="font-medium text-text-primary">{rows.length.toLocaleString()}</span> of <span className="tabular-nums">{rawRows.length.toLocaleString()}</span></span>
            </div>
          </div>

          {query.isError ? <div className="m-4 rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">{friendlyApiError(query.error)}</div> : null}

          <div className="relative overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1180px' }}>
              <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <SortHeader col="attraction" label="Attraction, Tour" sort={sort} onToggle={toggleSort} />
                  <SortHeader col="eventDate" label={<span className="italic">Opening Performance Date</span>} title="Opening Performance Date" sort={sort} onToggle={toggleSort} />
                  <SortHeader col="venue" label={<span className="italic">Venue, City</span>} title="Venue, City" sort={sort} onToggle={toggleSort} />
                  <SortHeader col="sellableCapacity" label={<span className="italic">Sellable Capacity</span>} title="Sellable Capacity" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="grossPotential" label={<span className="italic">Gross Ticket Sales Potential</span>} title="Gross Ticket Sales Potential" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="grossSalesToDate" label={<span className="italic">Gross Sales To Date</span>} title="Gross Sales To Date" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="soldYesterday" label="Sold yesterday" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="totalSold" label="Total sold" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="yesterdayRevenue" label="Revenue yesterday" sort={sort} onToggle={toggleSort} align="right" />
                  <SortHeader col="totalRevenue" label="Total revenue" sort={sort} onToggle={toggleSort} align="right" />
                  <th className="w-8 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="border-b border-border/50">
                      {Array.from({ length: 11 }).map((__, j) => <td key={j} className="px-4 py-3.5"><div className="h-3 rounded bg-muted/70 animate-pulse" style={{ width: j === 0 ? '82%' : j < 4 ? '70%' : '50%' }} /></td>)}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-elevated"><CalendarRange className="h-6 w-6 text-text-muted" aria-hidden /></div>
                        <p className="text-sm font-medium text-text-secondary">No events match your filters</p>
                        <p className="text-xs">Try widening the date range or clearing filters.</p>
                        {(activeFilterCount > 0 || searchInput) && <button type="button" onClick={handleResetFilters} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-hover transition-colors"><RotateCcw className="h-3 w-3" aria-hidden />Reset filters</button>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const ev = fmtEventDate(r.performanceDate);
                    const tm = fmtTime12(r.performanceTime);
                    const zebra = idx % 2 === 1 ? 'bg-surface/30' : '';
                    const venueLabel = r.venueName ?? r.venueCompanyName;
                    const marketLabel = rowMarketName(r);
                    const grossSalesValue = grossSalesToDate(r);
                    return (
                      <tr key={`${r.performanceId}-${r.engagementId}`} className={['group border-b border-border/60 cursor-pointer transition-colors', zebra, 'hover:bg-ems-accent-dim/30'].join(' ')} onClick={() => onOpenEngagement(r.engagementId, r.performanceId)} title="Open sales trends">
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-semibold text-text-primary group-hover:text-ems-accent transition-colors">{r.attractionName ?? <span className="text-text-muted italic font-normal">Unknown</span>}</div>
                          <div className="mt-1 text-[12px] leading-snug text-text-secondary">{r.tourName ?? <span className="text-text-muted">—</span>}</div>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap"><div className="text-sm font-semibold text-text-primary tabular-nums">{ev.date}</div>{tm && <div className="text-[11px] text-text-muted tabular-nums mt-0.5">{tm}</div>}</td>
                        <td className="px-4 py-3 align-top text-sm text-text-secondary"><div className="truncate max-w-[14rem] font-semibold text-text-primary" title={venueLabel ?? ''}>{venueLabel ?? <span className="text-text-muted font-normal">—</span>}</div><div className="mt-1 text-[12px] leading-snug text-text-secondary">{marketLabel ?? <span className="text-text-muted">—</span>}</div></td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums font-medium text-text-primary">{r.engagementSellableCapacity != null && Number.isFinite(r.engagementSellableCapacity) ? r.engagementSellableCapacity.toLocaleString() : <span className="text-text-muted font-normal">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums font-medium text-text-primary">{r.engagementGrossPotential != null && Number.isFinite(r.engagementGrossPotential) ? fmtCurrency(r.engagementGrossPotential) : <span className="text-text-muted font-normal">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums font-medium text-text-primary">{grossSalesValue != null ? fmtCurrency(grossSalesValue) : <span className="text-text-muted font-normal">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums text-text-secondary">{(r.soldYesterday ?? 0) > 0 ? r.soldYesterday.toLocaleString() : <span className="text-text-muted">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums font-medium text-text-primary">{(r.totalSold ?? 0) > 0 ? r.totalSold.toLocaleString() : <span className="text-text-muted font-normal">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums text-text-secondary">{r.yesterdayRevenue != null && r.yesterdayRevenue > 0 ? fmtCurrency(r.yesterdayRevenue) : <span className="text-text-muted">—</span>}</td>
                        <td className="px-4 py-3 align-top text-sm text-right tabular-nums font-semibold text-ems-green">{(r.totalRevenue ?? 0) > 0 ? fmtCurrency(r.totalRevenue) : <span className="text-text-muted font-normal">—</span>}</td>
                        <td className="w-8 px-2 py-3 align-middle text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" aria-hidden /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && rows.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface/30 px-4 py-2.5 text-xs text-text-muted">
              <span>Showing <span className="font-medium text-text-primary tabular-nums">{rows.length.toLocaleString()}</span> {rows.length === 1 ? 'event' : 'events'}</span>
              <span className="tabular-nums">Total revenue: <span className="font-semibold text-ems-green">{fmtCurrency(kpis.totalRevenue) || '$0'}</span></span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
