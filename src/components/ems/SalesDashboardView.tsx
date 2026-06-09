import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ApiSalesDashboardBody } from '@/api/dailySalesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { formatSqlTimeDisplay } from '@/lib/engagementDisplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const EMPTY = '-';
const CHART_GRID = 'hsl(var(--border) / 0.5)';
const CHART_AXIS = 'hsl(var(--text-muted))';
const CHART_TOOLTIP_BG = 'hsl(var(--card))';
const CHART_TOOLTIP_BORDER = 'hsl(var(--border))';

type SeriesPoint = ApiSalesDashboardBody['series'][number];
type SummaryPoint = ApiSalesDashboardBody['summary'][number];
type MarketingWindow = ApiSalesDashboardBody['marketingWindow'];
type ChartUnit = 'date' | 'week' | 'month' | 'lifetime';

type ChartValueKey =
  | 'totalTickets'
  | 'dailyTickets'
  | 'totalRevenue'
  | 'dailyRevenue'
  | 'trailingTickets7'
  | 'trailingRevenue7'
  | 'remainingInventory'
  | 'anticipatedMarketingSpend'
  | 'averageTicketPrice'
  | 'averageDailySales';

type ChartKind = 'line' | 'bar' | 'area';

interface SalesChartPoint {
  date: string;
  label: string;
  tooltipLabel: string;
  totalTickets: number;
  dailyTickets: number;
  totalRevenue: number;
  dailyRevenue: number;
  trailingTickets7: number;
  trailingRevenue7: number;
  remainingInventory: number | null;
  anticipatedMarketingSpend: number | null;
  averageTicketPrice: number | null;
  averageDailySales: number | null;
}

interface ChartConfig {
  id: string;
  number: string;
  title: string;
  valueLabel: string;
  yAxisLabel: string;
  dataKey: ChartValueKey;
  kind: ChartKind;
  color: string;
  formatter: (value: number | null | undefined) => string;
  axisFormatter: (value: number | null | undefined) => string;
}

interface AuditCell {
  label: string;
  value: string;
  note?: string;
}

interface AuditGroup {
  title: string;
  shade: string;
  cells: AuditCell[];
}

interface ChartMarker {
  date: string;
  label: string;
  color: string;
}

const CHART_UNIT_OPTIONS: Array<{ id: ChartUnit; label: string }> = [
  { id: 'date', label: 'Date' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'lifetime', label: 'Lifetime' },
];

const CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'total-cumulative-sales',
    number: 'Chart 1',
    title: 'Total Cumulative Sales',
    valueLabel: '# of Total Tix Sold To Date',
    yAxisLabel: '# of Total Tix Sold To Date',
    dataKey: 'totalTickets',
    kind: 'line',
    color: 'hsl(var(--ems-accent))',
    formatter: countOrDash,
    axisFormatter: compactCountOrDash,
  },
  {
    id: 'ticket-sales-pace',
    number: 'Chart 2',
    title: 'Ticket Sales Pace',
    valueLabel: '# sold each Unit',
    yAxisLabel: '# sold each Unit',
    dataKey: 'dailyTickets',
    kind: 'bar',
    color: 'hsl(var(--ems-blue))',
    formatter: countOrDash,
    axisFormatter: compactCountOrDash,
  },
  {
    id: 'total-dollar-sales',
    number: 'Chart 3',
    title: 'Total $ Sales',
    valueLabel: 'Total $ sold to date',
    yAxisLabel: 'Total $ sold to date',
    dataKey: 'totalRevenue',
    kind: 'line',
    color: 'hsl(var(--ems-green))',
    formatter: moneyOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'daily-dollar-sales-pace',
    number: 'Chart 4',
    title: 'Daily $ Sales Pace',
    valueLabel: 'Amount of $ sold each unit',
    yAxisLabel: 'Amount of $ sold each unit',
    dataKey: 'dailyRevenue',
    kind: 'bar',
    color: 'hsl(var(--ems-amber))',
    formatter: moneyOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'trailing-seven-day-ticket-sales',
    number: 'Chart 5',
    title: 'Trailing 7 Day Ticket Sales',
    valueLabel: 'Cumulative # of Tix sold over Previous Seven Days',
    yAxisLabel: 'Cumulative # of Tix sold over Previous Seven Days',
    dataKey: 'trailingTickets7',
    kind: 'area',
    color: 'hsl(var(--ems-purple))',
    formatter: countOrDash,
    axisFormatter: compactCountOrDash,
  },
  {
    id: 'trailing-seven-day-revenue',
    number: 'Chart 6',
    title: 'Trailing 7 Day Revenue',
    valueLabel: 'Cumulative $ sold over Previous Seven Days',
    yAxisLabel: 'Cumulative $ sold over Previous Seven Days',
    dataKey: 'trailingRevenue7',
    kind: 'area',
    color: 'hsl(var(--ems-coral))',
    formatter: moneyOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'remaining-inventory',
    number: 'Chart 7',
    title: 'Remaining Inventory',
    valueLabel: 'Value of Unsold Inventory',
    yAxisLabel: 'Value of Unsold Inventory',
    dataKey: 'remainingInventory',
    kind: 'line',
    color: 'hsl(var(--text-secondary))',
    formatter: moneyOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'anticipated-marketing-spend',
    number: 'Chart 8',
    title: 'Anticipated Marketing Spend',
    valueLabel: '10% of the Value of the Unsold Inventory',
    yAxisLabel: '10% of the Value of the Unsold Inventory',
    dataKey: 'anticipatedMarketingSpend',
    kind: 'line',
    color: 'hsl(var(--ems-amber))',
    formatter: moneyOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'average-ticket-price',
    number: 'Chart 9',
    title: 'Average Ticket Price',
    valueLabel: 'Total $ sold to date divided by total Tix sold to date',
    yAxisLabel: 'Total $ sold to date divided by total Tix sold to date',
    dataKey: 'averageTicketPrice',
    kind: 'line',
    color: 'hsl(var(--ems-blue))',
    formatter: moneyDecimalOrDash,
    axisFormatter: compactMoneyOrDash,
  },
  {
    id: 'average-daily-sales',
    number: 'Chart 10',
    title: 'Average Daily Sales',
    valueLabel: 'Total $ sold that day divided by the total sold that date',
    yAxisLabel: 'Total $ sold that day divided by the total sold that date',
    dataKey: 'averageDailySales',
    kind: 'line',
    color: 'hsl(var(--ems-accent))',
    formatter: moneyDecimalOrDash,
    axisFormatter: compactMoneyOrDash,
  },
];

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeNonNegative(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function countOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return Math.round(value).toLocaleString();
}

function moneyOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function moneyDecimalOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pctDisplay(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  if (Math.abs(value) >= 100) return `${value.toFixed(1)}%`;
  return `${value.toFixed(1)}%`;
}

function compactNumber(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${trimDecimal(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trimDecimal(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trimDecimal(abs / 1_000)}k`;
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

function compactCountOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return compactNumber(value);
}

function compactMoneyOrDash(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  const sign = value < 0 ? '-' : '';
  return `${sign}$${compactNumber(Math.abs(value))}`;
}

function trimDecimal(value: number) {
  return value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, '');
}

function textOrDash(value: string | null | undefined) {
  const s = value?.trim();
  return s || EMPTY;
}

function formatDateLabel(ymd: string | null | undefined, pattern: string) {
  if (!ymd) return EMPTY;
  try {
    return format(parseISO(ymd), pattern);
  } catch {
    return ymd;
  }
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ymdAddDays(ymd: string, delta: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return ymd;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + delta);
  return toYmd(d);
}

function startOfWeekYmd(ymd: string) {
  try {
    const d = parseISO(ymd);
    const offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return toYmd(d);
  } catch {
    return ymd;
  }
}

function startOfMonthYmd(ymd: string) {
  try {
    const d = parseISO(ymd);
    return toYmd(new Date(d.getFullYear(), d.getMonth(), 1));
  } catch {
    return ymd;
  }
}

function sortedSeries(series: SeriesPoint[] | undefined) {
  return [...(series ?? [])]
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function trimLeadingQuietDays(rows: SeriesPoint[]) {
  const firstActive = rows.findIndex(
    (row) =>
      (finiteNumber(row.dailyTickets) ?? 0) !== 0 ||
      (finiteNumber(row.dailyRevenue) ?? 0) !== 0 ||
      (finiteNumber(row.totalTickets) ?? 0) !== 0 ||
      (finiteNumber(row.totalRevenue) ?? 0) !== 0,
  );
  if (firstActive <= 0) return rows;
  return rows.slice(Math.max(0, firstActive - 1));
}

function buildDailyChartPoints(
  series: SeriesPoint[] | undefined,
  grossPotential: number | null | undefined,
  marketingWindow: MarketingWindow | undefined,
  asOfDate: string | undefined,
): SalesChartPoint[] {
  const rows = trimLeadingQuietDays(sortedSeries(series));
  const rowByDate = new Map(rows.map((row) => [row.date, row]));
  const validMarketingDates = [
    marketingWindow?.preSaleDate,
    marketingWindow?.onSaleDate,
  ].filter((date): date is string => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date));
  const startCandidates = [
    rows[0]?.date,
    ...validMarketingDates.filter((date) => !asOfDate || date <= asOfDate),
  ].filter((date): date is string => !!date);
  const boundedMarketingDates = validMarketingDates.filter(
    (date) => !asOfDate || date <= asOfDate,
  );
  const endCandidates = [
    rows[rows.length - 1]?.date,
    asOfDate,
    ...boundedMarketingDates,
  ].filter((date): date is string => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (startCandidates.length === 0 || endCandidates.length === 0) return [];

  const start = startCandidates.sort()[0];
  const end = endCandidates.sort()[endCandidates.length - 1];
  const expandedRows: SeriesPoint[] = [];
  let carryTotalTickets = 0;
  let carryTotalRevenue = 0;
  for (let date = start; date <= end; date = ymdAddDays(date, 1)) {
    const row = rowByDate.get(date);
    if (row) {
      carryTotalTickets = finiteNumber(row.totalTickets) ?? 0;
      carryTotalRevenue = finiteNumber(row.totalRevenue) ?? 0;
      expandedRows.push(row);
    } else {
      expandedRows.push({
        date,
        totalTickets: carryTotalTickets,
        totalRevenue: carryTotalRevenue,
        dailyTickets: 0,
        dailyRevenue: 0,
      });
    }
  }

  return expandedRows.map((row, index) => {
    const totalTickets = finiteNumber(row.totalTickets) ?? 0;
    const dailyTickets = finiteNumber(row.dailyTickets) ?? 0;
    const totalRevenue = finiteNumber(row.totalRevenue) ?? 0;
    const dailyRevenue = finiteNumber(row.dailyRevenue) ?? 0;
    const trailingWindow = expandedRows.slice(Math.max(0, index - 6), index + 1);
    const trailingTickets7 = trailingWindow.reduce(
      (sum, pt) => sum + (finiteNumber(pt.dailyTickets) ?? 0),
      0,
    );
    const trailingRevenue7 = trailingWindow.reduce(
      (sum, pt) => sum + (finiteNumber(pt.dailyRevenue) ?? 0),
      0,
    );
    const remainingInventory =
      grossPotential != null ? safeNonNegative(grossPotential - totalRevenue) : null;

    return {
      date: row.date,
      label: formatDateLabel(row.date, 'MMM d'),
      tooltipLabel: formatDateLabel(row.date, 'EEE, MMM d, yyyy'),
      totalTickets,
      dailyTickets,
      totalRevenue,
      dailyRevenue,
      trailingTickets7,
      trailingRevenue7,
      remainingInventory,
      anticipatedMarketingSpend:
        remainingInventory != null ? remainingInventory * 0.1 : null,
      averageTicketPrice: totalTickets > 0 ? totalRevenue / totalTickets : null,
      averageDailySales: dailyTickets > 0 ? dailyRevenue / dailyTickets : null,
    };
  });
}

function markerDateForUnit(ymd: string, unit: ChartUnit) {
  if (unit === 'lifetime') return null;
  if (unit === 'week') return startOfWeekYmd(ymd);
  if (unit === 'month') return startOfMonthYmd(ymd);
  return ymd;
}

function buildChartMarkers(
  marketingWindow: MarketingWindow | undefined,
  unit: ChartUnit,
  points: SalesChartPoint[],
): ChartMarker[] {
  const availableDates = new Set(points.map((point) => point.date));
  return [
    {
      sourceDate: marketingWindow?.preSaleDate,
      label: 'Pre-sale',
      color: 'hsl(var(--ems-purple))',
    },
    {
      sourceDate: marketingWindow?.onSaleDate,
      label: 'Public sale',
      color: 'hsl(var(--ems-accent))',
    },
  ]
    .map((marker) => {
      if (!marker.sourceDate || !/^\d{4}-\d{2}-\d{2}$/.test(marker.sourceDate)) {
        return null;
      }
      const date = markerDateForUnit(marker.sourceDate, unit);
      if (!date || !availableDates.has(date)) return null;
      return { date, label: marker.label, color: marker.color };
    })
    .filter((marker): marker is ChartMarker => marker != null);
}

function salePeriodLabel(
  ymd: string,
  marketingWindow: MarketingWindow | undefined,
) {
  const preSaleDate = marketingWindow?.preSaleDate;
  const onSaleDate = marketingWindow?.onSaleDate;
  const hasPreSaleDate = !!preSaleDate && /^\d{4}-\d{2}-\d{2}$/.test(preSaleDate);
  const hasOnSaleDate = !!onSaleDate && /^\d{4}-\d{2}-\d{2}$/.test(onSaleDate);
  if (hasOnSaleDate && ymd >= onSaleDate) return 'Public Sale';
  if (hasPreSaleDate && ymd >= preSaleDate && (!hasOnSaleDate || ymd < onSaleDate)) {
    return 'Pre-Sale';
  }
  return EMPTY;
}

function buildBucketedChartPoints(
  daily: SalesChartPoint[],
  unit: Exclude<ChartUnit, 'date' | 'lifetime'>,
) {
  const buckets = new Map<
    string,
    {
      start: string;
      dailyTickets: number;
      dailyRevenue: number;
      last: SalesChartPoint;
    }
  >();

  for (const point of daily) {
    const start = unit === 'week' ? startOfWeekYmd(point.date) : startOfMonthYmd(point.date);
    const bucket = buckets.get(start);
    if (bucket) {
      bucket.dailyTickets += point.dailyTickets;
      bucket.dailyRevenue += point.dailyRevenue;
      bucket.last = point;
    } else {
      buckets.set(start, {
        start,
        dailyTickets: point.dailyTickets,
        dailyRevenue: point.dailyRevenue,
        last: point,
      });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((bucket) => {
      const tooltipLabel =
        unit === 'week'
          ? `${formatDateLabel(bucket.start, 'MMM d')} - ${formatDateLabel(ymdAddDays(bucket.start, 6), 'MMM d, yyyy')}`
          : formatDateLabel(bucket.start, 'MMMM yyyy');
      return {
        ...bucket.last,
        date: bucket.start,
        label:
          unit === 'week'
            ? formatDateLabel(bucket.start, 'MMM d')
            : formatDateLabel(bucket.start, 'MMM yyyy'),
        tooltipLabel,
        dailyTickets: bucket.dailyTickets,
        dailyRevenue: bucket.dailyRevenue,
        averageDailySales:
          bucket.dailyTickets > 0 ? bucket.dailyRevenue / bucket.dailyTickets : null,
      };
    });
}

function buildLifetimeChartPoint(daily: SalesChartPoint[]) {
  const latest = daily[daily.length - 1];
  if (!latest) return [];
  return [
    {
      ...latest,
      label: 'Lifetime',
      tooltipLabel: `Through ${formatDateLabel(latest.date, 'MMM d, yyyy')}`,
      dailyTickets: latest.totalTickets,
      dailyRevenue: latest.totalRevenue,
      averageDailySales:
        latest.totalTickets > 0 ? latest.totalRevenue / latest.totalTickets : null,
    },
  ];
}

function chartPointsForUnit(daily: SalesChartPoint[], unit: ChartUnit) {
  if (unit === 'date') return daily;
  if (unit === 'lifetime') return buildLifetimeChartPoint(daily);
  return buildBucketedChartPoints(daily, unit);
}

function hasChartValues(points: SalesChartPoint[], config: ChartConfig) {
  return points.some((point) => {
    const value = point[config.dataKey];
    return value != null && Number.isFinite(value);
  });
}

function xAxisInterval(length: number, expanded: boolean) {
  if (expanded) {
    if (length <= 18) return 0;
    if (length <= 36) return 1;
    return Math.max(1, Math.floor(length / 18));
  }
  if (length <= 7) return 0;
  if (length <= 14) return 1;
  return Math.max(1, Math.floor(length / 6));
}

function currentUnitLabel(unit: ChartUnit) {
  return CHART_UNIT_OPTIONS.find((option) => option.id === unit)?.label ?? 'Date';
}

function buildAuditGroups(data: ApiSalesDashboardBody): AuditGroup[] {
  const asOf = data.asOfDate;
  const yesterdayPoint = sortedSeries(data.series).find(
    (point) => point.date === ymdAddDays(asOf, -1),
  );
  const totalTickets = finiteNumber(data.kpis.ticketsDistributed) ?? 0;
  const totalRevenue = finiteNumber(data.kpis.totalRevenue) ?? 0;
  const sellableCapacity = data.sellableCapacity;
  const grossPotential = data.grossPotential;
  const unsoldTickets =
    sellableCapacity != null ? safeNonNegative(sellableCapacity - totalTickets) : null;
  const unsoldRevenue =
    grossPotential != null ? safeNonNegative(grossPotential - totalRevenue) : null;

  return [
    {
      title: 'Total Inventory',
      shade: 'bg-elevated/45',
      cells: [
        { label: 'Sellable Capacity', value: countOrDash(sellableCapacity) },
        { label: 'Gross Potential $', value: moneyOrDash(grossPotential) },
      ],
    },
    {
      title: "Yesterday's Wrap",
      shade: 'bg-card',
      cells: [
        {
          label: 'Total Tickets Sold Yesterday',
          value: countOrDash(finiteNumber(yesterdayPoint?.dailyTickets) ?? 0),
        },
        {
          label: 'Total $ Sold Yesterday',
          value: moneyOrDash(finiteNumber(yesterdayPoint?.dailyRevenue) ?? 0),
        },
      ],
    },
    {
      title: 'Unsold Inventory & Value',
      shade: 'bg-elevated/35',
      cells: [
        { label: 'Total Unsold Tickets', value: countOrDash(unsoldTickets) },
        { label: 'Total Unsold $', value: moneyOrDash(unsoldRevenue) },
      ],
    },
    {
      title: 'Lifetime',
      shade: 'bg-card',
      cells: [
        { label: 'Total Tickets Sold To Date', value: countOrDash(totalTickets) },
        { label: 'Total Sales $ To Date', value: moneyOrDash(totalRevenue) },
        { label: '% of Seats Sold', value: pctDisplay(data.kpis.pctSold) },
        {
          label: '% of $ Potential Sold',
          value: pctDisplay(data.kpis.pctRevenueVsPotential),
        },
        {
          label: 'Goal Revenue',
          value: moneyOrDash(grossPotential),
          note: 'Static Number posted by Booking Dept',
        },
        {
          label: 'Left to Reach Goal',
          value: moneyOrDash(unsoldRevenue),
          note: '=Goal Revenue-Total Sales $ To Date',
        },
      ],
    },
  ];
}

function summaryRowsNewestFirst(summary: SummaryPoint[] | undefined) {
  return [...(summary ?? [])]
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .sort((a, b) => b.date.localeCompare(a.date));
}

interface InfoCellProps {
  label: string;
  children: React.ReactNode;
}

function InfoCell({ label, children }: InfoCellProps) {
  return (
    <div className="min-h-[5rem] border-b border-border/70 px-4 py-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0 text-sm font-semibold leading-snug text-text-primary">
        {children}
      </dd>
    </div>
  );
}

interface SalesTrendChartProps {
  config: ChartConfig;
  points: SalesChartPoint[];
  markers?: ChartMarker[];
  expanded?: boolean;
  className?: string;
}

function SalesTrendChart({
  config,
  points,
  markers = [],
  expanded = false,
  className,
}: SalesTrendChartProps) {
  const hasValues = hasChartValues(points, config);
  if (!hasValues) {
    return (
      <div
        className={cn(
          'flex h-[13.5rem] items-center justify-center rounded-md border border-dashed border-border/70 bg-elevated/20 px-4 text-center text-sm text-text-muted',
          className,
        )}
      >
        No chart data available.
      </div>
    );
  }

  const interval = xAxisInterval(points.length, expanded);
  const angled = points.length > (expanded ? 12 : 6);
  const pointLabelByDate = new Map(points.map((point) => [point.date, point.label]));
  const commonGraphProps = {
    dataKey: config.dataKey,
    name: config.valueLabel,
    isAnimationActive: points.length <= 80,
  };

  return (
    <div className={cn('h-[13.5rem] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={points}
          margin={{
            top: expanded ? 28 : 18,
            right: expanded ? 28 : 12,
            left: expanded ? 12 : 0,
            bottom: angled ? 54 : 28,
          }}
        >
          <CartesianGrid
            stroke={CHART_GRID}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            interval={interval}
            tick={{ fill: CHART_AXIS, fontSize: expanded ? 12 : 10 }}
            tickLine={{ stroke: CHART_GRID }}
            axisLine={{ stroke: CHART_GRID }}
            tickFormatter={(value) => pointLabelByDate.get(String(value)) ?? String(value)}
            angle={angled ? -35 : 0}
            textAnchor={angled ? 'end' : 'middle'}
            height={angled ? 54 : 28}
            minTickGap={4}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            orientation="right"
            width={expanded ? 76 : 56}
            tick={{ fill: CHART_AXIS, fontSize: expanded ? 12 : 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => config.axisFormatter(finiteNumber(value))}
          />
          {markers.map((marker) => (
            <ReferenceLine
              key={`${marker.label}-${marker.date}`}
              x={marker.date}
              stroke={marker.color}
              strokeDasharray="4 3"
              strokeOpacity={expanded ? 0.75 : 0.45}
              ifOverflow="extendDomain"
              label={
                expanded
                  ? {
                      value: marker.label,
                      position: 'insideTop',
                      fill: marker.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }
                  : undefined
              }
            />
          ))}
          <Tooltip
            cursor={{ stroke: CHART_GRID, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: '8px',
              border: `1px solid ${CHART_TOOLTIP_BORDER}`,
              background: CHART_TOOLTIP_BG,
              boxShadow: '0 12px 30px hsl(0 0% 0% / 0.16)',
            }}
            labelStyle={{
              color: 'hsl(var(--text-primary))',
              fontWeight: 700,
              marginBottom: 4,
            }}
            itemStyle={{ color: 'hsl(var(--text-secondary))' }}
            formatter={(value) => [
              config.formatter(finiteNumber(value)),
              config.valueLabel,
            ]}
            labelFormatter={(_label, payload) => {
              const first = payload?.[0]?.payload as SalesChartPoint | undefined;
              return first?.tooltipLabel ?? '';
            }}
          />
          {config.kind === 'bar' ? (
            <Bar
              {...commonGraphProps}
              fill={config.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={expanded ? 56 : 34}
            />
          ) : config.kind === 'area' ? (
            <Area
              {...commonGraphProps}
              type="monotone"
              stroke={config.color}
              strokeWidth={expanded ? 2.5 : 2}
              fill={config.color}
              fillOpacity={0.16}
              dot={
                expanded || points.length <= 18
                  ? {
                      r: expanded ? 3.5 : 2.5,
                      strokeWidth: 1.5,
                      stroke: config.color,
                      fill: 'hsl(var(--card))',
                    }
                  : false
              }
              activeDot={{
                r: expanded ? 7 : 5,
                strokeWidth: 2,
                stroke: 'hsl(var(--card))',
                fill: config.color,
              }}
            />
          ) : (
            <Line
              {...commonGraphProps}
              type="monotone"
              stroke={config.color}
              strokeWidth={expanded ? 2.5 : 2}
              dot={
                expanded || points.length <= 18
                  ? {
                      r: expanded ? 3.5 : 2.5,
                      strokeWidth: 1.5,
                      stroke: config.color,
                      fill: 'hsl(var(--card))',
                    }
                  : false
              }
              activeDot={{
                r: expanded ? 7 : 5,
                strokeWidth: 2,
                stroke: 'hsl(var(--card))',
                fill: config.color,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ChartCardProps {
  config: ChartConfig;
  points: SalesChartPoint[];
  markers: ChartMarker[];
  unit: ChartUnit;
  onExpand: (chartId: string) => void;
}

function ChartCard({ config, points, markers, unit, onExpand }: ChartCardProps) {
  return (
    <button
      type="button"
      onClick={() => onExpand(config.id)}
      className="group flex min-h-[20rem] w-full flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ems-accent/55 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent"
      aria-label={`Open ${config.title} chart`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {config.number}
          </div>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary">
            {config.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-text-secondary">
            {config.yAxisLabel}
          </p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-text-muted transition group-hover:border-ems-accent/50 group-hover:text-ems-accent">
          <Maximize2 className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <SalesTrendChart
        config={config}
        points={points}
        markers={markers}
        className="mt-4 flex-1"
      />
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-[11px] text-text-muted">
        <span>Units: {currentUnitLabel(unit)}</span>
        <span className="font-medium text-text-secondary">Open</span>
      </div>
    </button>
  );
}

interface ChartUnitTabsProps {
  unit: ChartUnit;
  onChange: (unit: ChartUnit) => void;
  className?: string;
}

function ChartUnitTabs({ unit, onChange, className }: ChartUnitTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Chart horizontal unit"
      className={cn(
        'grid grid-cols-2 rounded-md border border-border bg-elevated p-1 text-xs sm:inline-grid sm:grid-cols-4',
        className,
      )}
    >
      {CHART_UNIT_OPTIONS.map((option) => {
        const active = unit === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded px-3 py-1.5 font-semibold transition',
              active
                ? 'bg-card text-ems-accent shadow-sm'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SalesDashboardViewProps {
  asOf: string;
  onAsOfChange: (ymd: string) => void;
  onBack: () => void;
  backTitle?: string;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  data: ApiSalesDashboardBody | undefined;
  capacityHint?: string;
}

const DEFAULT_CAPACITY_HINT =
  'Set sellable capacity and gross potential on the engagement to complete the inventory audit.';

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
  const [chartUnit, setChartUnit] = useState<ChartUnit>('date');
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);

  const dailyChartPoints = useMemo(
    () =>
      buildDailyChartPoints(
        data?.series,
        data?.grossPotential,
        data?.marketingWindow,
        data?.asOfDate,
      ),
    [data?.asOfDate, data?.grossPotential, data?.marketingWindow, data?.series],
  );

  const chartPoints = useMemo(
    () => chartPointsForUnit(dailyChartPoints, chartUnit),
    [chartUnit, dailyChartPoints],
  );

  const chartMarkers = useMemo(
    () => buildChartMarkers(data?.marketingWindow, chartUnit, chartPoints),
    [chartPoints, chartUnit, data?.marketingWindow],
  );

  const auditGroups = useMemo(
    () => (data ? buildAuditGroups(data) : []),
    [data],
  );

  const summaryRows = useMemo(
    () => summaryRowsNewestFirst(data?.summary),
    [data?.summary],
  );

  const expandedChart = useMemo(
    () => CHART_CONFIGS.find((chart) => chart.id === expandedChartId) ?? null,
    [expandedChartId],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-ems-accent" aria-hidden />
        <p className="text-sm">Loading sales summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          Could not load sales summary
        </div>
        <p className="mt-3 text-sm text-text-secondary">{friendlyApiError(error)}</p>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Back
          </Button>
          <Button type="button" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
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
  const attractionTour = [d.header.attractionName, d.header.tourName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' / ');
  const pageTitle = d.header.attractionName?.trim() || d.header.tourName?.trim() || 'Sales Summary Page';
  const cityState = [d.header.city, d.header.stateProvince].filter(Boolean).join(', ');
  const openingDate = d.header.showDate
    ? formatDateLabel(d.header.showDate, 'EEEE, MMM d, yyyy')
    : EMPTY;
  const openingTime = d.header.showTime
    ? formatSqlTimeDisplay(d.header.showTime)
    : '';
  const openingDisplay = openingTime ? `${openingDate} | ${openingTime}` : openingDate;
  const hasMissingCapacityContext =
    d.sellableCapacity == null || d.grossPotential == null;
  const baselines = d.engagementBaselines ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 shrink-0 border-border bg-elevated text-text-primary hover:bg-hover"
            title={backTitle}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            {backTitle}
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-text-primary md:text-2xl">
              Sales Summary Page
            </h1>
            <p className="truncate text-sm text-text-secondary">{pageTitle}</p>
          </div>
        </div>
        <label className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-elevated px-3 py-2 text-xs font-medium uppercase tracking-wide text-text-muted sm:w-auto">
          <span>Reporting as of</span>
          <input
            type="date"
            className="w-[9.25rem] rounded-md border border-border bg-card px-2 py-1.5 text-sm font-medium normal-case tracking-normal text-text-primary"
            value={asOf}
            onChange={(event) => onAsOfChange(event.target.value)}
          />
        </label>
      </div>

      <dl className="grid overflow-hidden rounded-lg border border-border bg-card shadow-sm sm:grid-cols-2 xl:grid-cols-3">
        <InfoCell label="Attraction/Tour">
          <span title={attractionTour || EMPTY}>{attractionTour || EMPTY}</span>
        </InfoCell>
        <InfoCell label="Entertainment Complex">
          <span title={d.header.entertainmentComplexNames ?? ''}>
            {textOrDash(d.header.entertainmentComplexNames)}
          </span>
        </InfoCell>
        <InfoCell label="Opening Day of the Week, and Date">
          {openingDisplay}
        </InfoCell>
        <InfoCell label="City, State">{cityState || EMPTY}</InfoCell>
        <InfoCell label="Venue">
          <span title={d.header.venueLabel}>{textOrDash(d.header.venueLabel)}</span>
        </InfoCell>
        <InfoCell label="# Days Till Opening Performance">
          {countOrDash(d.kpis.daysUntilOpening)}
        </InfoCell>
      </dl>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-surface/70 px-4 py-3 text-center">
          <h2 className="text-base font-semibold text-text-primary">Event Audit</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead>
              <tr className="text-center text-[11px] font-semibold text-text-primary">
                {auditGroups.map((group, groupIndex) => (
                  <th
                    key={group.title}
                    colSpan={group.cells.length}
                    className={cn(
                      'border-b border-r border-border px-3 py-2',
                      group.shade,
                      groupIndex > 0 && 'border-l-2 border-l-border',
                    )}
                  >
                    {group.title}
                  </th>
                ))}
              </tr>
              <tr className="text-center text-[11px] font-semibold text-text-primary">
                {auditGroups.map((group, groupIndex) =>
                  group.cells.map((cell, cellIndex) => (
                    <th
                      key={`${group.title}-${cell.label}`}
                      className={cn(
                        'h-14 border-b border-r border-border/80 px-3 py-2 align-middle leading-tight',
                        group.shade,
                        groupIndex > 0 && cellIndex === 0 && 'border-l-2 border-l-border',
                      )}
                    >
                      {cell.label}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                {auditGroups.map((group, groupIndex) =>
                  group.cells.map((cell, cellIndex) => (
                    <td
                      key={`${group.title}-${cell.label}-value`}
                      className={cn(
                        'h-20 border-r border-border/70 px-3 py-3 text-right align-top tabular-nums text-text-primary',
                        group.shade,
                        groupIndex > 0 && cellIndex === 0 && 'border-l-2 border-l-border',
                      )}
                    >
                      <div className="text-base font-semibold">{cell.value}</div>
                      {cell.note ? (
                        <div className="mt-2 whitespace-normal text-left text-[11px] font-medium leading-snug text-text-muted">
                          {cell.note}
                        </div>
                      ) : null}
                    </td>
                  )),
                )}
              </tr>
            </tbody>
          </table>
        </div>
        {hasMissingCapacityContext ? (
          <div className="border-t border-border bg-elevated/30 px-4 py-2 text-xs text-text-secondary">
            {capacityHint}
          </div>
        ) : null}
      </section>

      {baselines.length > 0 ? (
        <details className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-text-primary">
            Engagement goals included in this roll-up
          </summary>
          <ul className="mt-3 divide-y divide-border/70 overflow-hidden rounded-md border border-border/70 text-sm">
            {baselines.map((row) => (
              <li
                key={row.engagementId}
                className="flex flex-wrap items-center justify-between gap-3 bg-elevated/25 px-3 py-2"
              >
                <span className="font-medium text-text-primary">{row.tourName}</span>
                <span className="tabular-nums text-text-secondary">
                  {countOrDash(row.sellableCapacity)} seats | {moneyOrDash(row.grossPotential)} goal
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Charts</h2>
            <p className="text-sm text-text-secondary">
              {CHART_CONFIGS.length} sales views for {attractionTour || pageTitle}
            </p>
          </div>
          <ChartUnitTabs unit={chartUnit} onChange={setChartUnit} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {CHART_CONFIGS.map((config) => (
            <ChartCard
              key={config.id}
              config={config}
              points={chartPoints}
              markers={chartMarkers}
              unit={chartUnit}
              onExpand={setExpandedChartId}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border bg-surface/70 px-4 py-3 lg:grid-cols-[1fr_minmax(18rem,34rem)] lg:items-start">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Summary</h2>
            <p className="text-sm text-text-secondary">
              Daily sales rows through {formatDateLabel(d.asOfDate, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-sm">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Pre-Sale or Public Sale</th>
                <th className="px-4 py-3 text-right font-semibold">Total Sold</th>
                <th className="px-4 py-3 text-right font-semibold">Total Value Sold</th>
                <th className="px-4 py-3 text-right font-semibold">Seats Remaining</th>
                <th className="px-4 py-3 text-right font-semibold">Revenue Remaining</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-text-muted"
                  >
                    No summary rows available.
                  </td>
                </tr>
              ) : (
                summaryRows.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-border/70 transition hover:bg-hover/35"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">
                      {formatDateLabel(row.date, 'EEE, MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {salePeriodLabel(row.date, d.marketingWindow)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {countOrDash(row.totalTicketsSold)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ems-accent">
                      {moneyOrDash(row.totalValueSold)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {countOrDash(row.seatsRemaining)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {moneyOrDash(row.revenueRemaining)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={expandedChart != null}
        onOpenChange={(open) => {
          if (!open) setExpandedChartId(null);
        }}
      >
        {expandedChart ? (
          <DialogContent className="z-[360] grid h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-border bg-card p-0 shadow-2xl sm:h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)]">
            <DialogHeader className="border-b border-border bg-surface/70 px-5 py-4 pr-14">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    {expandedChart.number} | Units: {currentUnitLabel(chartUnit)}
                  </div>
                  <DialogTitle className="mt-2 text-xl text-text-primary">
                    {expandedChart.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm text-text-secondary">
                    {expandedChart.yAxisLabel}
                  </DialogDescription>
                </div>
                <ChartUnitTabs
                  unit={chartUnit}
                  onChange={setChartUnit}
                  className="w-full lg:w-auto"
                />
              </div>
            </DialogHeader>
            <div className="min-h-0 p-4">
              <SalesTrendChart
                config={expandedChart}
                points={chartPoints}
                markers={chartMarkers}
                expanded
                className="h-full min-h-[22rem]"
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
