import React, { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from './Primitives';
import { Select2 } from './Select2';
import {
  fetchDailySales,
  updateDailySales,
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

function fmtCurrency(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function fmtDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12(hhmm: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-center gap-3 px-6 py-8 border-b border-border bg-surface/40">
        <Loader2 className="h-8 w-8 text-ems-accent animate-spin" aria-hidden />
        <div className="text-sm font-medium text-text-primary">Loading daily sales…</div>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <tr key={i} className="border-b border-border/40">
              {Array.from({ length: 8 }).map((__, j) => (
                <td key={j} className="py-3 px-3"><Skeleton className="h-4 w-24 bg-muted/80" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Editable Row ─────────────────────────────────────────────────────────────

function EditableRow({
  row,
  onNavigate,
  onSaved,
  addToast,
}: {
  row: ApiDailySalesRow;
  onNavigate: Props['onNavigate'];
  onSaved: () => void;
  addToast: Props['addToast'];
}) {
  const [editing, setEditing] = useState(false);
  const [tickets, setTickets] = useState(
    row.ticketsSold != null ? String(row.ticketsSold) : '',
  );
  const [revenue, setRevenue] = useState(
    row.revenue != null ? String(row.revenue) : '',
  );
  const [saving, setSaving] = useState(false);
  const ticketsRef = useRef<HTMLInputElement>(null);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTickets(row.ticketsSold != null ? String(row.ticketsSold) : '');
    setRevenue(row.revenue != null ? String(row.revenue) : '');
    setEditing(true);
    setTimeout(() => ticketsRef.current?.focus(), 0);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const ticketsNum = tickets.trim() === '' ? null : Number(tickets);
    const revenueNum = revenue.trim() === '' ? null : Number(revenue);

    if (tickets.trim() !== '' && (isNaN(ticketsNum!) || ticketsNum! < 0 || !Number.isInteger(ticketsNum!))) {
      addToast('Tickets sold must be a non-negative whole number.', 'warning');
      return;
    }
    if (revenue.trim() !== '' && (isNaN(revenueNum!) || revenueNum! < 0)) {
      addToast('Revenue must be a non-negative number.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await updateDailySales(row.performanceId, row.salesDate, {
        ticketsSold: ticketsNum,
        revenue: revenueNum,
      });
      addToast('Sales record updated.', 'success');
      setEditing(false);
      onSaved();
    } catch (err) {
      addToast(friendlyApiError(err, 'Could not update sales record.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-surface border border-ems-accent rounded px-2 py-1 text-sm text-text-primary text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ems-accent';

  return (
    <tr
      className="border-b border-border/50 hover:bg-hover group"
      onClick={() => !editing && onNavigate('engagement-detail', { engagementId: row.engagementId })}
      style={{ cursor: editing ? 'default' : 'pointer' }}
    >
      {/* Sales Date */}
      <td className="py-2.5 px-3 text-xs text-text-secondary tabular-nums whitespace-nowrap">
        {fmtDateShort(row.salesDate)}
      </td>

      {/* Attraction */}
      <td className="py-2.5 px-3 text-text-primary font-medium">
        {row.attractionName ?? <span className="text-text-muted italic">Unknown</span>}
      </td>

      {/* Tour */}
      <td className="py-2.5 px-3 text-text-secondary">{row.tourName ?? '—'}</td>

      {/* Venue */}
      <td className="py-2.5 px-3 text-text-secondary">
        <div>{row.venueName ?? row.venueCompanyName ?? '—'}</div>
        {(row.city || row.stateProvince) && (
          <div className="text-xs text-text-muted">
            {[row.city, row.stateProvince].filter(Boolean).join(', ')}
          </div>
        )}
      </td>

      {/* Performance */}
      <td className="py-2.5 px-3 text-text-secondary text-xs tabular-nums whitespace-nowrap">
        {row.performanceDate ? fmtDateShort(row.performanceDate) : '—'}
        {row.performanceTime ? ` · ${formatTime12(row.performanceTime)}` : ''}
      </td>

      {/* Tickets Sold — editable */}
      <td
        className="py-1.5 px-3 text-right"
        onClick={e => editing && e.stopPropagation()}
      >
        {editing ? (
          <input
            ref={ticketsRef}
            type="number"
            min={0}
            step={1}
            className={inputCls}
            style={{ width: '7rem' }}
            value={tickets}
            onChange={e => setTickets(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSave(e as unknown as React.MouseEvent); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          <span className="tabular-nums text-text-primary">
            {row.ticketsSold != null ? row.ticketsSold.toLocaleString() : '—'}
          </span>
        )}
      </td>

      {/* Revenue — editable */}
      <td
        className="py-1.5 px-3 text-right"
        onClick={e => editing && e.stopPropagation()}
      >
        {editing ? (
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputCls}
            style={{ width: '8rem' }}
            value={revenue}
            onChange={e => setRevenue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleSave(e as unknown as React.MouseEvent); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          <span className="tabular-nums text-ems-green font-medium">
            {fmtCurrency(row.revenue)}
          </span>
        )}
      </td>

      {/* Actions column */}
      <td className="py-1.5 px-3 text-right" onClick={e => e.stopPropagation()}>
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            {/* Save */}
            <button
              type="button"
              onClick={e => void handleSave(e)}
              disabled={saving}
              title="Save changes"
              className="inline-flex items-center gap-1 bg-ems-accent hover:bg-ems-accent/80 text-background text-xs px-2.5 py-1 rounded font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3 w-3" aria-hidden />
              )}
              {saving ? 'Saving…' : 'Save'}
            </button>
            {/* Cancel */}
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              title="Cancel"
              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-elevated text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            title="Edit tickets sold and revenue"
            className="inline-flex items-center justify-center h-7 w-7 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-elevated text-text-muted hover:text-ems-accent"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── DailySalesPage ───────────────────────────────────────────────────────────

export function DailySalesPage({ onNavigate, addToast }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [attractionFilter, setAttractionFilter] = useState('');
  const [page, setPage] = useState(1);

  const salesQuery = useQuery({
    queryKey: ['daily-sales'],
    queryFn: () => fetchDailySales(),
    staleTime: 2 * 60 * 1000,
  });

  const refetch = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['daily-sales'] });
  }, [qc]);

  const rows = salesQuery.data ?? [];

  const attractionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (r.attractionName) seen.set(r.attractionName, r.attractionName);
    return [
      { value: '', label: 'All attractions' },
      ...[...seen.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (attractionFilter && r.attractionName !== attractionFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [
        r.attractionName ?? '', r.tourName ?? '',
        r.venueCompanyName ?? '', r.venueName ?? '',
        r.city ?? '', r.salesDate, r.performanceDate,
        String(r.engagementId),
      ].join(' ').toLowerCase().includes(q);
    });
  }, [rows, search, attractionFilter]);

  const totalTickets = useMemo(() => filtered.reduce((s, r) => s + (r.ticketsSold ?? 0), 0), [filtered]);
  const totalRevenue = useMemo(() => filtered.reduce((s, r) => s + (r.revenue ?? 0), 0), [filtered]);
  const uniqueEngagements = useMemo(() => new Set(filtered.map(r => r.engagementId)).size, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, attractionFilter]);

  const isLoading = salesQuery.isPending;
  const isRefreshing = salesQuery.isFetching && !salesQuery.isPending;

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 animate-pulse bg-ems-accent/90" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
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
          Could not load daily sales: {friendlyApiError(salesQuery.error)}
        </div>
      )}

      {/* Summary */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Total Tickets Sold"
            value={totalTickets.toLocaleString()}
            sub={`across ${filtered.length} sales records`}
          />
          <SummaryCard
            label="Total Revenue"
            value={fmtCurrency(totalRevenue)}
            sub={`${uniqueEngagements} engagement${uniqueEngagements !== 1 ? 's' : ''}`}
          />
          <SummaryCard
            label="Avg per Record"
            value={filtered.length ? fmtCurrency(totalRevenue / filtered.length) : '—'}
            sub="revenue per sales entry"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search sales…" disabled={isLoading} />
        </div>
        <div className="w-full sm:w-64">
          <Select2
            options={attractionOptions}
            value={attractionFilter}
            onChange={setAttractionFilter}
            disabled={isLoading}
            placeholder="Filter by attraction"
          />
        </div>
      </div>

      {/* Hint */}
      {!isLoading && rows.length > 0 && (
        <p className="text-xs text-text-muted">
          Hover a row and click the <Pencil className="inline h-3 w-3" /> pencil icon to edit Tickets Sold and Revenue, then click <strong>Save</strong>.
        </p>
      )}

      {/* Table */}
      {isLoading ? <TableSkeleton /> : (
        <>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  <th className="text-left py-2.5 px-3">Sales Date</th>
                  <th className="text-left py-2.5 px-3">Attraction</th>
                  <th className="text-left py-2.5 px-3">Tour</th>
                  <th className="text-left py-2.5 px-3">Venue</th>
                  <th className="text-left py-2.5 px-3">Performance</th>
                  <th className="text-right py-2.5 px-3">Tickets Sold</th>
                  <th className="text-right py-2.5 px-3">Revenue</th>
                  <th className="w-24 text-center py-2.5 px-3 text-xs">Edit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !salesQuery.isError && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-text-muted">
                      {rows.length === 0
                        ? 'No daily sales data in the database yet.'
                        : 'No records match your search.'}
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => (
                  <EditableRow
                    key={`${r.performanceId}-${r.salesDate}-${i}`}
                    row={r}
                    onNavigate={onNavigate}
                    onSaved={refetch}
                    addToast={addToast}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
              <p className="tabular-nums">
                Showing{' '}
                <span className="text-text-primary font-medium">
                  {(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filtered.length)}
                </span>{' '}
                of <span className="text-text-primary font-medium">{filtered.length.toLocaleString()}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pageClamped <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium"
                >
                  Previous
                </button>
                <span className="tabular-nums text-text-muted">Page {pageClamped} / {pageCount}</span>
                <button
                  disabled={pageClamped >= pageCount}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded border border-border bg-elevated hover:bg-hover disabled:opacity-40 text-xs font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
