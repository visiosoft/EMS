import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from './Primitives';
import { Select2 } from './Select2';
import {
  fetchDailySalesByPerformance,
  fetchDailySales,
  updateDailySales,
  type ApiPerformanceSalesRow,
  type ApiDailySalesRow,
} from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  dailySales?: unknown; engagements?: unknown; tours?: unknown;
  attractions?: unknown; companies?: unknown; onUpdateDailySales?: unknown;
}

const PAGE_SIZE = 20;

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
  if (isNaN(n) || n < 0) return `${field === 'tickets' ? 'Tickets' : 'Revenue'} must be non-negative.`;
  if (field === 'tickets' && !Number.isInteger(n)) return 'Tickets must be a whole number.';
  return null;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="text-xl font-semibold text-text-primary mt-1">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border bg-surface/40">
        <Loader2 className="h-7 w-7 text-ems-accent animate-spin" />
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
  onEngagementClick,
  onSaved,
  addToast,
}: {
  row: ApiPerformanceSalesRow;
  onEngagementClick: (engagementId: number) => void;
  onSaved: () => void;
  addToast: Props['addToast'];
}) {
  const [todayTickets, setTodayTickets] = useState(row.todayTicketsSold != null ? String(row.todayTicketsSold) : '');
  const [todayRevenue, setTodayRevenue] = useState(row.todayRevenue != null ? String(row.todayRevenue) : '');
  const [yestTickets, setYestTickets] = useState(row.yesterdayTicketsSold != null ? String(row.yesterdayTicketsSold) : '');
  const [yestRevenue, setYestRevenue] = useState(row.yesterdayRevenue != null ? String(row.yesterdayRevenue) : '');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await Promise.all([
        updateDailySales(row.performanceId, row.todayDate, {
          ticketsSold: todayTickets.trim() === '' ? null : Number(todayTickets),
          revenue: todayRevenue.trim() === '' ? null : Number(todayRevenue),
        }),
        updateDailySales(row.performanceId, row.yesterdayDate, {
          ticketsSold: yestTickets.trim() === '' ? null : Number(yestTickets),
          revenue: yestRevenue.trim() === '' ? null : Number(yestRevenue),
        }),
      ]);
      addToast('Sales data saved.', 'success');
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
    <tr className="border-b border-border/50 hover:bg-hover/30 group">
      {/* Attraction — click → engagement history */}
      <td className="py-2 px-3 cursor-pointer" onClick={() => onEngagementClick(row.engagementId)}>
        <div className="text-text-primary font-medium text-sm leading-tight hover:text-ems-accent transition-colors">
          {row.attractionName ?? <span className="text-text-muted italic text-xs">Unknown</span>}
        </div>
        {row.tourName && (
          <div className="text-xs text-text-muted leading-tight mt-0.5 truncate max-w-[14rem]">{row.tourName}</div>
        )}
      </td>

      {/* Date */}
      <td className="py-2 px-3 text-xs text-text-secondary whitespace-nowrap">
        <div>{fmtDateFull(row.performanceDate)}</div>
        <div className="text-text-muted">{fmt12(row.performanceTime)}</div>
      </td>

      {/* Venue */}
      <td className="py-2 px-3 text-sm text-text-secondary">
        <div className="truncate max-w-[11rem]">{row.venueName ?? row.venueCompanyName ?? '—'}</div>
        {(row.city || row.stateProvince) && (
          <div className="text-xs text-text-muted">{[row.city, row.stateProvince].filter(Boolean).join(', ')}</div>
        )}
      </td>

      {/* Yesterday */}
      <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
        <input type="number" min={0} step={1} className={inputCls}
          value={yestTickets} onChange={e => setYestTickets(e.target.value)} placeholder="—" />
      </td>
      <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">$</span>
          <input type="number" min={0} step={0.01} className={inputCls + ' pl-4'}
            value={yestRevenue} onChange={e => setYestRevenue(e.target.value)} placeholder="—" />
        </div>
      </td>

      {/* Today */}
      <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
        <input type="number" min={0} step={1} className={inputCls}
          value={todayTickets} onChange={e => setTodayTickets(e.target.value)} placeholder="—" />
      </td>
      <td className="py-1.5 px-2" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">$</span>
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
  const historyQuery = useQuery({
    queryKey: ['daily-sales-history', engagementId],
    queryFn: () => fetchDailySales(engagementId),
    staleTime: 60_000,
  });

  const rows = historyQuery.data ?? [];

  const totalTickets = useMemo(() => rows.reduce((s, r) => s + (r.ticketsSold ?? 0), 0), [rows]);
  const totalRevenue = useMemo(() => rows.reduce((s, r) => s + (r.revenue ?? 0), 0), [rows]);

  const $fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

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
          {attractionName ?? `Engagement #${engagementId}`}
          {tourName && <span className="text-text-muted font-normal"> — {tourName}</span>}
        </h2>
        <p className="text-xs text-text-muted mt-1">All recorded daily sales entries for this engagement</p>
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="Total Tickets Sold" value={totalTickets.toLocaleString()} sub={`${rows.length} sales records`} />
          <SummaryCard label="Total Revenue" value={$fmt(totalRevenue)} />
          <SummaryCard label="Avg per Record" value={rows.length ? $fmt(totalRevenue / rows.length) : '—'} sub="revenue per entry" />
        </div>
      )}

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
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-text-muted text-xs border-b border-border bg-surface">
                <th className="text-left py-2.5 px-3">Sales Date</th>
                <th className="text-left py-2.5 px-3">Performance Date</th>
                <th className="text-left py-2.5 px-3">Venue</th>
                <th className="text-right py-2.5 px-3">Tickets Sold</th>
                <th className="text-right py-2.5 px-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => b.salesDate.localeCompare(a.salesDate))
                .map((r, i) => (
                  <tr key={`${r.performanceId}-${r.salesDate}-${i}`} className="border-b border-border/50 hover:bg-hover/30">
                    <td className="py-2.5 px-3 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                      {fmtDateHeader(r.salesDate)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-text-secondary whitespace-nowrap">
                      {fmtDateFull(r.performanceDate)}
                      {r.performanceTime && <span className="text-text-muted ml-1">· {fmt12(r.performanceTime)}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary text-xs">
                      <div>{r.venueName ?? r.venueCompanyName ?? '—'}</div>
                      {(r.city || r.stateProvince) && (
                        <div className="text-text-muted">{[r.city, r.stateProvince].filter(Boolean).join(', ')}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-text-primary">
                      {r.ticketsSold != null ? r.ticketsSold.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ems-green font-medium">
                      {fmtCurrency(r.revenue)}
                    </td>
                  </tr>
                ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="border-t-2 border-border bg-surface">
                <td colSpan={3} className="py-2.5 px-3 text-xs font-semibold text-text-secondary">Total</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text-primary">{totalTickets.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-ems-green">{$fmt(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── DailySalesPage ───────────────────────────────────────────────────────────

export function DailySalesPage({ onNavigate, addToast }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [attractionFilter, setAttractionFilter] = useState('');
  const [perfDateFilter, setPerfDateFilter] = useState('');
  const [page, setPage] = useState(1);
  // Item 7 — engagement click-through state
  const [selectedEngagement, setSelectedEngagement] = useState<{
    engagementId: number;
    attractionName: string | null;
    tourName: string | null;
  } | null>(null);

  const salesQuery = useQuery({
    queryKey: ['daily-sales-by-perf', perfDateFilter],
    queryFn: () => fetchDailySalesByPerformance(perfDateFilter || undefined),
    staleTime: 2 * 60 * 1000,
  });

  const refetch = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['daily-sales-by-perf'] });
  }, [qc]);

  const rows = salesQuery.data ?? [];
  const todayLabel = rows[0]?.todayDate ? fmtDateHeader(rows[0].todayDate) : 'Today';
  const yesterdayLabel = rows[0]?.yesterdayDate ? fmtDateHeader(rows[0].yesterdayDate) : 'Yesterday';

  // Item 1 — performance date options derived from data, with user-friendly labels
  const perfDateOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) if (r.performanceDate) seen.add(r.performanceDate);
    const sorted = [...seen].sort();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    return [
      { value: '', label: 'All performance dates' },
      ...sorted.map(d => {
        const dt = new Date(d + 'T12:00:00');
        const base = fmtDateHeader(d);
        let tag = '';
        if (dt.toDateString() === today.toDateString()) tag = ' (Today)';
        else if (dt.toDateString() === tomorrow.toDateString()) tag = ' (Tomorrow)';
        else if (dt.toDateString() === yesterday.toDateString()) tag = ' (Yesterday)';
        return { value: d, label: base + tag };
      }),
    ];
  }, [rows]);

  const attractionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.attractionName) seen.set(r.attractionName, r.attractionName);
    return [
      { value: '', label: 'All attractions' },
      ...[...seen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (attractionFilter && r.attractionName !== attractionFilter) return false;
      if (!search.trim()) return true;
      return [r.attractionName ?? '', r.tourName ?? '', r.venueCompanyName ?? '',
        r.venueName ?? '', r.city ?? '', r.performanceDate, String(r.engagementId)]
        .join(' ').toLowerCase().includes(search.toLowerCase());
    });
  }, [rows, search, attractionFilter]);

  const totalTicketsToday = useMemo(() => filtered.reduce((s, r) => s + (r.todayTicketsSold ?? 0), 0), [filtered]);
  const totalRevenueToday = useMemo(() => filtered.reduce((s, r) => s + (r.todayRevenue ?? 0), 0), [filtered]);
  const totalTicketsYest  = useMemo(() => filtered.reduce((s, r) => s + (r.yesterdayTicketsSold ?? 0), 0), [filtered]);
  const totalRevenueYest  = useMemo(() => filtered.reduce((s, r) => s + (r.yesterdayRevenue ?? 0), 0), [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, attractionFilter, perfDateFilter]);

  const isLoading = salesQuery.isPending;
  const isRefreshing = salesQuery.isFetching && !salesQuery.isPending;
  const $fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  // ── Item 7: show engagement history if one is selected ──────────────────────
  if (selectedEngagement) {
    return (
      <EngagementSalesHistory
        engagementId={selectedEngagement.engagementId}
        attractionName={selectedEngagement.attractionName}
        tourName={selectedEngagement.tourName}
        onBack={() => setSelectedEngagement(null)}
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
        {!isLoading && (
          <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary tabular-nums">
            {filtered.length.toLocaleString()} rows
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
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label={`${todayLabel} — Tickets`} value={totalTicketsToday.toLocaleString()} sub="today" />
          <SummaryCard label={`${todayLabel} — Revenue`} value={$fmt(totalRevenueToday)} sub="today" />
          <SummaryCard label={`${yesterdayLabel} — Tickets`} value={totalTicketsYest.toLocaleString()} sub="yesterday" />
          <SummaryCard label={`${yesterdayLabel} — Revenue`} value={$fmt(totalRevenueYest)} sub="yesterday" />
        </div>
      )}

      {/* Item 1 — Filters: performance date (user-friendly labels) + search + attraction */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-56">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" disabled={isLoading} />
        </div>
        <div className="w-full sm:w-64">
          <Select2
            options={perfDateOptions}
            value={perfDateFilter}
            onChange={setPerfDateFilter}
            disabled={isLoading}
            placeholder="All performance dates"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select2
            options={attractionOptions}
            value={attractionFilter}
            onChange={setAttractionFilter}
            disabled={isLoading}
            placeholder="All attractions"
          />
        </div>
      </div>

      {/* Helper text */}
      {!isLoading && rows.length > 0 && (
        <p className="text-xs text-text-muted">
          Click an <span className="font-medium text-text-secondary">attraction name</span> to view the full sales history for that engagement.
        </p>
      )}

      {/* Table */}
      {isLoading ? <TableSkeleton /> : (
        <>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="text-xs border-b border-border bg-surface">
                  <th className="text-left py-2 px-3 text-text-muted" rowSpan={2}>Attraction</th>
                  <th className="text-left py-2 px-3 text-text-muted" rowSpan={2}>Date</th>
                  <th className="text-left py-2 px-3 text-text-muted" rowSpan={2}>Venue</th>
                  <th colSpan={2} className="text-center py-2 px-3 font-semibold text-text-secondary bg-elevated border-l border-border">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-text-muted/50 inline-block" />
                      {yesterdayLabel}
                    </span>
                  </th>
                  <th colSpan={2} className="text-center py-2 px-3 font-semibold text-ems-accent bg-ems-accent/5 border-l border-border">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-ems-accent inline-block" />
                      {todayLabel}
                    </span>
                  </th>
                  <th className="py-2 px-3" rowSpan={2} />
                </tr>
                <tr className="text-xs border-b border-border bg-surface">
                  <th className="text-right py-2 px-2 text-text-muted font-medium bg-elevated border-l border-border">Tickets Sold</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium bg-elevated border-r border-border">Revenue</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium bg-ems-accent/5 border-l border-border">Tickets Sold</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium bg-ems-accent/5">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !salesQuery.isError && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-text-muted">
                      {rows.length === 0 ? 'No performances in the database.' : 'No performances match your filters.'}
                    </td>
                  </tr>
                )}
                {pageRows.map(r => (
                  <PerformanceRow
                    key={r.performanceId}
                    row={r}
                    onEngagementClick={(id) => setSelectedEngagement({
                      engagementId: id,
                      attractionName: r.attractionName,
                      tourName: r.tourName,
                    })}
                    onSaved={refetch}
                    addToast={addToast}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
              <p className="tabular-nums">
                Showing <span className="text-text-primary font-medium">{(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filtered.length)}</span>
                {' '}of <span className="text-text-primary font-medium">{filtered.length.toLocaleString()}</span> performances
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
