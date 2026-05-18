import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { ApiSalesDashboardBody } from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { IaeLogoFull } from '@/components/ems/Layout';
import { formatOpeningDateSafe, formatSqlTimeDisplay } from '@/lib/engagementDisplay';
import { Button } from '@/components/ui/button';

/** Theme-aware chart colors (match CSS variables in index.css) */
const CHART_LINE = 'hsl(var(--ems-accent))';
const CHART_SOLD = 'hsl(var(--ems-accent))';
/** “Remaining” slice — theme secondary, readable on card in light and dark */
const CHART_OPEN = 'hsl(var(--text-secondary))';
const CHART_GRID = 'hsl(var(--border) / 0.45)';
const CHART_AXIS = 'hsl(var(--text-muted))';

function money(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function moneyFull(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function pctDisplay(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n > 100) return `${n.toFixed(1)}%`;
  return `${n.toFixed(n >= 100 ? 0 : 1)}%`;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm px-4 py-4 flex flex-col min-h-[5.5rem]">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <div className="flex-1 flex items-center justify-center text-center text-lg font-semibold text-text-primary tabular-nums">
        {value}
      </div>
    </div>
  );
}

export interface SalesDashboardViewProps {
  asOf: string;
  onAsOfChange: (ymd: string) => void;
  onBack: () => void;
  /** Shown as title on the round back control */
  backTitle?: string;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  data: ApiSalesDashboardBody | undefined;
  /** Shown when sellable capacity is missing (donut + progress context) */
  capacityHint?: string;
}

const DEFAULT_CAPACITY_HINT =
  'Set sellable capacity on the engagement to see capacity breakdown.';

export function SalesDashboardView({
  asOf,
  onAsOfChange,
  onBack,
  backTitle = 'Back',
  loading,
  error,
  onRetry,
  data,
  capacityHint = DEFAULT_CAPACITY_HINT,
}: SalesDashboardViewProps) {
  /**
   * Bucket mode for the daily-sales chart.
   * - `day`: render every SalesDate row as its own point.
   * - `week`: sum dailyTickets into Monday-start weeks.
   * - `month`: sum dailyTickets into calendar months (default — cleanest for typical
   *   on-sale windows that span several months).
   */
  type ChartGranularity = 'day' | 'week' | 'month';
  const [granularityMode, setGranularityMode] = useState<ChartGranularity>('month');

  const trimmedSeries = useMemo(() => {
    const rows = data?.series ?? [];
    if (rows.length === 0) return rows;
    const firstNonZero = rows.findIndex((r) => (r.dailyTickets ?? 0) > 0);
    if (firstNonZero < 0) return rows;
    return rows.slice(firstNonZero);
  }, [data?.series]);

  /** Final data passed to recharts. One entry per visible point. */
  const chartData = useMemo(() => {
    if (granularityMode === 'day') {
      return trimmedSeries.map((r) => ({
        date: r.date,
        value: r.dailyTickets ?? 0,
        label: (() => {
          try {
            return format(parseISO(r.date), 'MMM d');
          } catch {
            return r.date;
          }
        })(),
        tooltipLabel: (() => {
          try {
            return format(parseISO(r.date), 'EEE, MMM d, yyyy');
          } catch {
            return r.date;
          }
        })(),
      }));
    }

    if (granularityMode === 'week') {
      const buckets = new Map<
        string,
        { date: string; value: number; label: string; tooltipLabel: string }
      >();
      for (const r of trimmedSeries) {
        let monday: Date;
        try {
          const d = parseISO(r.date);
          const dow = d.getDay();
          const offset = (dow + 6) % 7;
          monday = new Date(d);
          monday.setDate(d.getDate() - offset);
        } catch {
          continue;
        }
        const key = format(monday, 'yyyy-MM-dd');
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const tip = `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.value += r.dailyTickets ?? 0;
        } else {
          buckets.set(key, {
            date: key,
            value: r.dailyTickets ?? 0,
            label: format(monday, 'MMM d'),
            tooltipLabel: tip,
          });
        }
      }
      return Array.from(buckets.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    }

    // month
    const buckets = new Map<
      string,
      { date: string; value: number; label: string; tooltipLabel: string; year: number; monthIdx: number }
    >();
    for (const r of trimmedSeries) {
      let monthStart: Date;
      try {
        const d = parseISO(r.date);
        monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      } catch {
        continue;
      }
      const key = format(monthStart, 'yyyy-MM');
      const existing = buckets.get(key);
      if (existing) {
        existing.value += r.dailyTickets ?? 0;
      } else {
        buckets.set(key, {
          date: format(monthStart, 'yyyy-MM-dd'),
          value: r.dailyTickets ?? 0,
          label: format(monthStart, 'MMM'),
          tooltipLabel: format(monthStart, 'MMMM yyyy'),
          year: monthStart.getFullYear(),
          monthIdx: monthStart.getMonth(),
        });
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    // Show the year on the very first bucket and any bucket that starts a new year,
    // so a multi-year series doesn't lose context once labels are shortened to "MMM".
    let prevYear: number | null = null;
    return sorted.map((b) => {
      const showYear = prevYear == null || b.year !== prevYear;
      prevYear = b.year;
      return {
        date: b.date,
        value: b.value,
        label: showYear ? `${b.label} ’${String(b.year).slice(-2)}` : b.label,
        tooltipLabel: b.tooltipLabel,
      };
    });
  }, [trimmedSeries, granularityMode]);

  const granularityLabel: { title: string; subtitle: string; tooltipName: string } =
    granularityMode === 'month'
      ? {
          title: 'Monthly sales',
          subtitle: 'Tickets sold per month',
          tooltipName: 'Tickets this month',
        }
      : granularityMode === 'week'
      ? {
          title: 'Weekly sales',
          subtitle: 'Tickets sold per week (Mon–Sun)',
          tooltipName: 'Tickets this week',
        }
      : {
          title: 'Daily sales',
          subtitle: 'Tickets sold per day',
          tooltipName: 'Tickets this day',
        };

  const donutData = useMemo(() => {
    const cap = data?.sellableCapacity;
    const sold = data?.kpis.ticketsDistributed ?? 0;
    if (cap == null || cap <= 0) {
      return null;
    }
    const over = Math.max(0, sold - cap);
    const soldToCap = Math.min(sold, cap);
    const open = Math.max(0, cap - sold);
    const segments: Array<{ name: string; value: number; fill: string }> = [];
    if (soldToCap > 0) {
      segments.push({ name: 'Sold', value: soldToCap, fill: CHART_SOLD });
    }
    if (over > 0) {
      segments.push({
        name: 'Over capacity',
        value: over,
        fill: 'hsl(var(--destructive) / 0.88)',
      });
    }
    if (open > 0) {
      segments.push({ name: 'Open', value: open, fill: CHART_OPEN });
    }
    if (segments.length === 0) {
      return [{ name: 'Open', value: cap, fill: CHART_OPEN }];
    }
    return segments;
  }, [data?.sellableCapacity, data?.kpis.ticketsDistributed]);

  /** Fewer X labels when the series is long (readability) */
  const xAxisInterval = useMemo(() => {
    const n = chartData.length;
    if (n <= 10) return 0;
    if (n <= 20) return 1;
    if (n <= 40) return 2;
    return Math.max(1, Math.floor(n / 12));
  }, [chartData.length]);

  const summaryDesc = useMemo(() => {
    const s = data?.summary ?? [];
    return [...s].reverse();
  }, [data?.summary]);

  const [engagementGoalsExpanded, setEngagementGoalsExpanded] = useState(false);

  const ticketsBarPct = useMemo(() => {
    const cap = data?.sellableCapacity;
    const sold = data?.kpis.ticketsDistributed ?? 0;
    if (cap != null && cap > 0) {
      return Math.min(100, (sold / cap) * 100);
    }
    return 0;
  }, [data?.sellableCapacity, data?.kpis.ticketsDistributed]);

  const revenueBarPct = useMemo(() => {
    const p = data?.kpis.pctRevenueVsPotential;
    if (p != null && Number.isFinite(p)) return Math.min(100, p);
    return 0;
  }, [data?.kpis.pctRevenueVsPotential]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-ems-accent" aria-hidden />
        <p className="text-sm">Loading sales summary…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          Could not load sales summary
        </div>
        <p className="text-sm text-text-secondary">{friendlyApiError(error)}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
            Back
          </Button>
          <Button type="button" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const d = data;
  const baselines = d.engagementBaselines ?? [];
  const loc =
    [d.header.city, d.header.stateProvince].filter(Boolean).join(', ') || '—';
  const showWhen =
    d.header.showDate && d.header.showTime
      ? `${formatOpeningDateSafe(d.header.showDate)} · ${formatSqlTimeDisplay(d.header.showTime)}`
      : d.header.showDate
        ? formatOpeningDateSafe(d.header.showDate)
        : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <IaeLogoFull height={28} />
        <div className="flex-1 min-w-[12rem]" />
        <label className="flex items-center gap-2 text-xs text-text-muted shrink-0">
          <span>Reporting as of</span>
          <input
            type="date"
            className="rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-text-primary"
            value={asOf}
            onChange={(e) => onAsOfChange(e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 w-10 h-10 rounded-full border border-border bg-elevated flex items-center justify-center text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
            title={backTitle}
            aria-label={backTitle}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
              {d.header.attractionName ?? 'Show'}
            </h1>
            {d.header.tourName ? (
              <p className="text-sm md:text-base text-text-muted mt-1">{d.header.tourName}</p>
            ) : null}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm shrink-0 lg:text-right">
            <div>
              <dt className="text-text-muted text-xs uppercase tracking-wide">Venue</dt>
              <dd className="font-medium text-text-primary">{d.header.venueLabel}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs uppercase tracking-wide">Location</dt>
              <dd className="text-text-secondary">{loc}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs uppercase tracking-wide">Show date</dt>
              <dd className="text-text-secondary">{showWhen}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Total revenue" value={moneyFull(d.kpis.totalRevenue)} />
        <KpiCard
          label="Tickets distributed"
          value={d.kpis.ticketsDistributed.toLocaleString()}
        />
        <KpiCard label="% sold" value={pctDisplay(d.kpis.pctSold)} />
        <KpiCard
          label="Revenue last 7 days"
          value={moneyFull(d.kpis.revenueLast7Days)}
        />
        <KpiCard
          label="Tickets sold last 7 days"
          value={d.kpis.ticketsLast7Days.toLocaleString()}
        />
        <KpiCard
          label="Days until engagement"
          value={d.kpis.daysUntilOpening.toLocaleString()}
        />
      </div>

      {baselines.length > 0 && (
        <div className="rounded-xl border border-border bg-surface/50 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setEngagementGoalsExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-hover/40 transition-colors"
            aria-expanded={engagementGoalsExpanded}
          >
            <span className="font-medium text-text-primary text-sm">
              Engagement goals included in this roll-up
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted shrink-0">
              {engagementGoalsExpanded ? 'Hide' : 'Show'}
              {engagementGoalsExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden />
              )}
            </span>
          </button>
          {engagementGoalsExpanded && (
            <div className="px-4 pb-3 pt-0 text-sm space-y-2.5 border-t border-border/70">
              <p className="text-xs text-text-secondary leading-relaxed pt-3">
                This summary rolls up every engagement for this attraction. Each engagement can have its own sellable
                capacity and gross potential; those values are <strong>added together</strong> for the capacity and
                revenue KPIs at the top of the page.
              </p>
              <ul className="text-xs text-text-secondary divide-y divide-border/70 border border-border/70 rounded-md overflow-hidden bg-card/60">
            {baselines.map((row) => (
              <li
                key={row.engagementId}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2.5"
              >
                <span className="font-medium text-text-primary min-w-0 truncate pr-2" title={row.tourName}>
                  {row.tourName}
                </span>
                <span className="tabular-nums text-text-secondary shrink-0 text-right">
                  {row.sellableCapacity != null
                    ? `${row.sellableCapacity.toLocaleString()} seats`
                    : '— seats'}
                  <span className="text-text-muted"> · </span>
                  {row.grossPotential != null ? `${moneyFull(row.grossPotential)} goal` : '— money goal'}
                </span>
              </li>
            ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-5 xl:col-span-1 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                {granularityLabel.title}
              </h2>
              <span
                className="text-[11px] text-text-muted tabular-nums hidden sm:inline leading-snug cursor-help"
                title={
                  granularityMode === 'month'
                    ? 'Each point sums the tickets sold during that calendar month from dbo.TicketingSales.'
                    : granularityMode === 'week'
                    ? 'Each point sums the tickets sold during that week (Mon–Sun) from dbo.TicketingSales.'
                    : 'Each point shows the tickets sold on that specific SalesDate from dbo.TicketingSales (per-day delta, not running total).'
                }
              >
                {granularityLabel.subtitle}
              </span>
            </div>
            <div
              role="tablist"
              aria-label="Chart granularity"
              className="inline-flex rounded-md border border-border bg-elevated/50 p-0.5 text-[11px]"
            >
              {(
                [
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                ] as Array<{ id: ChartGranularity; label: string }>
              ).map((opt) => {
                const active = granularityMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setGranularityMode(opt.id)}
                    className={[
                      'px-2.5 py-1 rounded-[5px] font-medium transition-colors',
                      active
                        ? 'bg-ems-accent text-ems-accent-foreground shadow-sm'
                        : 'text-text-muted hover:text-text-primary hover:bg-hover/60',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-[min(22rem,55vh)] w-full min-h-[240px] flex items-center justify-center text-sm text-text-muted">
              No sales recorded in this date range yet.
            </div>
          ) : (
            <div className="h-[min(22rem,55vh)] w-full min-h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 22,
                    right: 16,
                    left: 8,
                    bottom: chartData.length > 6 ? 56 : 28,
                  }}
                >
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    interval={xAxisInterval}
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    angle={chartData.length > 6 ? -35 : 0}
                    textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                    height={chartData.length > 6 ? 52 : 28}
                    dy={chartData.length > 6 ? 6 : 0}
                    minTickGap={4}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis
                    orientation="right"
                    width={44}
                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      typeof v === 'number' && Math.abs(v) >= 1000
                        ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
                        : String(v)
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_GRID, strokeWidth: 1 }}
                    contentStyle={{
                      borderRadius: 'var(--radius, 8px)',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      boxShadow: '0 4px 12px hsl(0 0% 0% / 0.12)',
                    }}
                    labelStyle={{
                      color: 'hsl(var(--text-primary))',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                    itemStyle={{ color: 'hsl(var(--text-secondary))' }}
                    formatter={(v: number) => [v.toLocaleString(), granularityLabel.tooltipName]}
                    labelFormatter={(_, p) => {
                      const tip = p?.[0]?.payload?.tooltipLabel;
                      if (tip) return String(tip);
                      const x = p?.[0]?.payload?.date;
                      return x ? formatOpeningDateSafe(String(x)) : '';
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Tickets"
                    stroke={CHART_LINE}
                    strokeWidth={2}
                    dot={
                      chartData.length <= 80
                        ? {
                            r: 3.5,
                            strokeWidth: 1.5,
                            stroke: CHART_LINE,
                            fill: 'hsl(var(--card))',
                          }
                        : false
                    }
                    activeDot={{
                      r: 6,
                      strokeWidth: 2,
                      stroke: 'hsl(var(--card))',
                      fill: CHART_LINE,
                    }}
                    isAnimationActive={chartData.length <= 60}
                  >
                    {chartData.length <= 16 && (
                      <LabelList
                        dataKey="value"
                        position="top"
                        offset={10}
                        style={{
                          fill: CHART_AXIS,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                        formatter={(v: unknown) =>
                          typeof v === 'number' ? v.toLocaleString() : ''
                        }
                      />
                    )}
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-5 space-y-6">
          <div>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-text-primary">Tickets vs capacity</span>
              <span className="text-sm font-semibold text-ems-accent tabular-nums">
                {pctDisplay(d.kpis.pctSold)}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
              <span className="font-medium text-text-primary tabular-nums">
                {d.kpis.ticketsDistributed.toLocaleString()}
              </span>
              {d.sellableCapacity != null ? (
                <>
                  {' '}
                  <span className="text-text-muted">/</span>{' '}
                  <span className="tabular-nums">{d.sellableCapacity.toLocaleString()}</span>
                  <span className="text-text-muted"> sellable seats</span>
                </>
              ) : (
                <span className="text-text-muted"> — add sellable capacity to see % sold</span>
              )}
            </p>
            <div
              className="h-3.5 rounded-full bg-muted/80 overflow-hidden ring-1 ring-inset ring-border/40"
              role="progressbar"
              aria-valuenow={Math.round(ticketsBarPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of sellable capacity sold"
            >
              <div
                className="h-full rounded-full bg-ems-accent transition-[width] duration-500 ease-out"
                style={{ width: `${ticketsBarPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-text-primary">Revenue vs potential</span>
              <span className="text-sm font-semibold text-ems-accent tabular-nums">
                {pctDisplay(d.kpis.pctRevenueVsPotential)}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
              <span className="font-medium text-text-primary tabular-nums">{moneyFull(d.kpis.totalRevenue)}</span>
              {d.grossPotential != null ? (
                <>
                  {' '}
                  <span className="text-text-muted">/</span> {moneyFull(d.grossPotential)}
                  <span className="text-text-muted"> gross potential</span>
                </>
              ) : (
                <span className="text-text-muted"> — add gross potential to see % realized</span>
              )}
            </p>
            <div
              className="h-3.5 rounded-full bg-muted/80 overflow-hidden ring-1 ring-inset ring-border/40"
              role="progressbar"
              aria-valuenow={Math.round(revenueBarPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of gross potential realized"
            >
              <div
                className="h-full rounded-full bg-ems-accent transition-[width] duration-500 ease-out"
                style={{ width: `${revenueBarPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm p-4 md:p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Capacity</h2>
          {donutData && d.sellableCapacity != null ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              <div className="relative mx-auto sm:mx-0 w-[220px] h-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={104}
                      paddingAngle={donutData.length > 1 ? 2 : 0}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                      contentStyle={{
                        borderRadius: 'var(--radius, 8px)',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        boxShadow: '0 4px 12px hsl(0 0% 0% / 0.12)',
                      }}
                      labelStyle={{ color: 'hsl(var(--text-primary))', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                  aria-hidden
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Capacity
                  </span>
                  <span className="text-2xl font-bold text-text-primary tabular-nums tracking-tight leading-none mt-1">
                    {d.sellableCapacity.toLocaleString()}
                  </span>
                </div>
              </div>
              <ul
                className="flex-1 flex flex-col justify-center gap-2.5 min-w-0"
                aria-label="Sold and remaining seats"
              >
                {donutData.map((seg) => (
                  <li
                    key={seg.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.fill }}
                        aria-hidden
                      />
                      <span className="text-sm text-text-secondary">{seg.name}</span>
                    </span>
                    <span className="text-sm tabular-nums text-text-primary font-medium">
                      {seg.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-text-secondary py-6 text-center leading-relaxed">{capacityHint}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface/50 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">Summary</h2>
        </div>
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10 shadow-sm">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold text-right">Total tickets sold</th>
                <th className="px-4 py-2 font-semibold text-right">Total value sold</th>
                <th className="px-4 py-2 font-semibold text-right">Seats sold %</th>
                <th className="px-4 py-2 font-semibold text-right">Seats remaining</th>
                <th className="px-4 py-2 font-semibold text-right">Revenue remaining</th>
              </tr>
            </thead>
            <tbody>
              {summaryDesc.map((row) => {
                const dailyTickets = row.dailyTicketsSold ?? 0;
                const dailyValue = row.dailyValueSold ?? 0;
                const cap = data?.sellableCapacity ?? null;
                const dailyPct =
                  cap != null && cap > 0 ? (dailyTickets / cap) * 100 : null;
                return (
                  <tr key={row.date} className="border-b border-border/80 hover:bg-hover/40">
                    <td className="px-4 py-2 text-text-primary whitespace-nowrap">
                      {formatOpeningDateSafe(row.date)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {dailyTickets.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ems-accent font-medium">
                      {money(dailyValue)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {dailyPct != null ? pctDisplay(dailyPct) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-muted">
                      —
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-muted">
                      —
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
