import { apiFetch } from './config';

// ─── Legacy flat list ─────────────────────────────────────────────────────────

export interface ApiDailySalesRow {
  performanceId: number;
  engagementId: number;
  salesDate: string;
  performanceDate: string;
  performanceTime: string;
  performanceStatus: string;
  engagementStatus: string;
  ticketsSold: number | null;
  revenue: number | null;
  tourId: number | null;
  tourName: string | null;
  attractionId: number | null;
  attractionName: string | null;
  venueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
}

export function fetchDailySales(engagementId?: number) {
  const qs = engagementId != null ? `?engagementId=${engagementId}` : '';
  return apiFetch<ApiDailySalesRow[]>(`/daily-sales${qs}`);
}

// ─── By-performance view (new) ────────────────────────────────────────────────

export interface ApiPerformanceSalesRow {
  performanceId: number;
  engagementId: number;
  performanceDate: string;       // YYYY-MM-DD
  performanceTime: string;       // HH:MM:SS
  performanceStatus: string;
  engagementStatus: string;
  attractionId: number | null;
  attractionName: string | null;
  genre: string | null;
  tourName: string | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  /** Today's date YYYY-MM-DD */
  todayDate: string;
  todayTicketsSold: number | null;
  todayRevenue: number | null;
  /** Yesterday's date YYYY-MM-DD */
  yesterdayDate: string;
  yesterdayTicketsSold: number | null;
  yesterdayRevenue: number | null;
  soldYesterday: number;
  totalSold: number;
  totalRevenue: number;
  daysOnSale: number;
  contactName: string | null;
  /** From engagement; used for save hints (capacity checks are server-side across all performances). */
  engagementSellableCapacity: number | null;
  engagementGrossPotential: number | null;
}

/** Row cap when prefetching Daily Sales rows for local search suggestions. */
export const DAILY_SALES_SUGGESTION_PAGE_SIZE = 2500;

export interface ApiPerformanceSalesPage {
  items: ApiPerformanceSalesRow[];
  total: number;
  page: number;
  pageSize: number;
  todayDate: string;
  yesterdayDate: string;
  /** Per-day totals for reporting day and prior day (not cumulative through those dates). */
  summary: {
    todayTickets: number;
    todayRevenue: number;
    yesterdayTickets: number;
    yesterdayRevenue: number;
  };
  /** Distinct attractions matching current filters (for sales summary links). */
  attractions: Array<{ attractionId: number; attractionName: string }>;
  filterOptions: {
    genres: string[];
    tours: string[];
    companies: string[];
    venues: string[];
    contacts: string[];
  };
}

export function fetchDailySalesByPerformance(
  asOfDate?: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    attraction?: string;
    /** YYYY-MM-DD — only performances on this calendar date */
    performanceDate?: string;
    startDate?: string;
    endDate?: string;
    genre?: string;
    tour?: string;
    company?: string;
    venue?: string;
    contact?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    /** `all` (default) or `mine` — mine = engagements where you are an IAE contact */
    eventsScope?: 'all' | 'mine';
    /** One or more dbo.Contact IDs from Engagement IAE staff assignments. */
    iaeContactIds?: number[];
  },
) {
  const p = new URLSearchParams();
  if (asOfDate) p.set('asOfDate', asOfDate);
  if (options?.page != null) p.set('page', String(options.page));
  if (options?.pageSize != null) p.set('pageSize', String(options.pageSize));
  if (options?.search) p.set('search', options.search);
  if (options?.attraction) p.set('attraction', options.attraction);
  if (options?.performanceDate) p.set('performanceDate', options.performanceDate);
  if (options?.startDate) p.set('startDate', options.startDate);
  if (options?.endDate) p.set('endDate', options.endDate);
  if (options?.genre) p.set('genre', options.genre);
  if (options?.tour) p.set('tour', options.tour);
  if (options?.company) p.set('company', options.company);
  if (options?.venue) p.set('venue', options.venue);
  if (options?.contact) p.set('contact', options.contact);
  if (options?.sortBy?.trim()) {
    p.set('sortBy', options.sortBy.trim());
    if (options.sortDir) p.set('sortDir', options.sortDir);
  }
  if (options?.eventsScope === 'mine') p.set('eventsScope', 'mine');
  if (options?.iaeContactIds?.length) {
    const ids = options.iaeContactIds
      .filter((n) => Number.isInteger(n) && n > 0)
      .map((n) => String(n));
    if (ids.length > 0) p.set('iaeContactIds', ids.join(','));
  }
  const qs = p.toString() ? `?${p.toString()}` : '';
  return apiFetch<ApiPerformanceSalesPage>(`/daily-sales/by-performance${qs}`);
}

// ─── Update (upsert) — one running-total row per (performance, sales date) ──

export interface UpdateDailySalesPayload {
  ticketsSold?: number | null;
  revenue?: number | null;
}

export function updateDailySales(
  performanceId: number,
  salesDate: string,
  body: UpdateDailySalesPayload,
) {
  return apiFetch<void>(
    `/daily-sales/${performanceId}/${encodeURIComponent(salesDate)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

// ─── Sales dashboards (KPIs + charts) — engagement or attraction roll-up ─────

export interface ApiSalesDashboardBody {
  asOfDate: string;
  header: {
    attractionName: string | null;
    tourName: string;
    venueLabel: string;
    city: string | null;
    stateProvince: string | null;
    showDate: string | null;
    showTime: string | null;
  };
  sellableCapacity: number | null;
  grossPotential: number | null;
  kpis: {
    totalRevenue: number;
    ticketsDistributed: number;
    pctSold: number | null;
    revenueLast7Days: number;
    ticketsLast7Days: number;
    daysUntilOpening: number;
    pctRevenueVsPotential: number | null;
  };
  series: Array<{
    date: string;
    /** Cumulative tickets sold through this calendar day. */
    totalTickets: number;
    /** Cumulative revenue through this calendar day. */
    totalRevenue: number;
    /** New tickets sold on this calendar day only. */
    dailyTickets: number;
    /** New revenue on this calendar day only. */
    dailyRevenue: number;
  }>;
  summary: Array<{
    date: string;
    totalTicketsSold: number;
    totalValueSold: number;
    /** New tickets sold on this calendar day only. */
    dailyTicketsSold: number;
    /** New revenue on this calendar day only. */
    dailyValueSold: number;
    seatsSoldPct: number | null;
    seatsRemaining: number | null;
    revenueRemaining: number | null;
  }>;
  /**
   * Attraction summary only: each engagement’s own seat / money goal.
   * Top-level `sellableCapacity` / `grossPotential` are the **sum** of these rows.
   */
  engagementBaselines?: Array<{
    engagementId: number;
    tourName: string;
    sellableCapacity: number | null;
    grossPotential: number | null;
  }>;
  /** Echo of the optional performance filter; null when the response is an engagement/attraction roll-up. */
  performanceId: number | null;
}

export interface ApiEngagementSalesDashboard extends ApiSalesDashboardBody {
  engagementId: number;
}

export interface ApiAttractionSalesDashboard extends ApiSalesDashboardBody {
  attractionId: number;
  engagementCount: number;
  engagementBaselines: NonNullable<ApiSalesDashboardBody['engagementBaselines']>;
}

function asFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ymdAddDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function latestSalesPoint<T extends { date: string }>(rows: T[] | undefined, asOf?: string): T | null {
  const filtered = (rows ?? [])
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .filter((row) => !asOf || row.date <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  return filtered.length ? filtered[filtered.length - 1] : null;
}

type DashboardSummaryPoint = ApiSalesDashboardBody['summary'][number];
type DashboardSeriesPoint = ApiSalesDashboardBody['series'][number];

function summarySnapshotRevenue(row: DashboardSummaryPoint | null | undefined): number | null {
  return asFiniteNumber(row?.dailyValueSold) ?? asFiniteNumber(row?.totalValueSold);
}

function summarySnapshotTickets(row: DashboardSummaryPoint | null | undefined): number | null {
  return asFiniteNumber(row?.dailyTicketsSold) ?? asFiniteNumber(row?.totalTicketsSold);
}

function seriesSnapshotRevenue(row: DashboardSeriesPoint | null | undefined): number | null {
  return asFiniteNumber(row?.dailyRevenue) ?? asFiniteNumber(row?.totalRevenue);
}

function seriesSnapshotTickets(row: DashboardSeriesPoint | null | undefined): number | null {
  return asFiniteNumber(row?.dailyTickets) ?? asFiniteNumber(row?.totalTickets);
}

function hasEnteredSummarySnapshot(row: DashboardSummaryPoint): boolean {
  return (summarySnapshotRevenue(row) ?? 0) !== 0 || (summarySnapshotTickets(row) ?? 0) !== 0;
}

function hasEnteredSeriesSnapshot(row: DashboardSeriesPoint): boolean {
  return (seriesSnapshotRevenue(row) ?? 0) !== 0 || (seriesSnapshotTickets(row) ?? 0) !== 0;
}

function latestEnteredSummaryPoint(
  rows: DashboardSummaryPoint[] | undefined,
  asOf?: string,
): DashboardSummaryPoint | null {
  return latestSalesPoint((rows ?? []).filter(hasEnteredSummarySnapshot), asOf);
}

function latestEnteredSeriesPoint(
  rows: DashboardSeriesPoint[] | undefined,
  asOf?: string,
): DashboardSeriesPoint | null {
  return latestSalesPoint((rows ?? []).filter(hasEnteredSeriesSnapshot), asOf);
}

function normalizeSinglePerformanceDashboard<T extends ApiSalesDashboardBody>(dashboard: T): T {
  if (dashboard.performanceId == null) return dashboard;

  const latestSummary =
    latestEnteredSummaryPoint(dashboard.summary, dashboard.asOfDate) ??
    latestSalesPoint(dashboard.summary, dashboard.asOfDate);
  const latestSeries =
    latestEnteredSeriesPoint(dashboard.series, dashboard.asOfDate) ??
    latestSalesPoint(dashboard.series, dashboard.asOfDate);
  const sevenDaysPrior = ymdAddDays(dashboard.asOfDate, -7);
  const sevenDaysPriorSummary = latestEnteredSummaryPoint(
    dashboard.summary,
    sevenDaysPrior,
  );
  const sevenDaysPriorSeries = latestEnteredSeriesPoint(
    dashboard.series,
    sevenDaysPrior,
  );

  // Daily Sales stores user-entered running totals. For a single performance trend,
  // KPI values must use the latest PerformanceSalesQuantity / PerformanceSalesRevenue
  // snapshot. Last-7-day KPIs are the latest snapshot minus the snapshot as of seven
  // days prior, not a sum of cumulative snapshots.
  const latestRevenue =
    summarySnapshotRevenue(latestSummary) ??
    seriesSnapshotRevenue(latestSeries) ??
    dashboard.kpis.totalRevenue;
  const latestTickets =
    summarySnapshotTickets(latestSummary) ??
    seriesSnapshotTickets(latestSeries) ??
    dashboard.kpis.ticketsDistributed;
  const priorRevenue =
    summarySnapshotRevenue(sevenDaysPriorSummary) ??
    seriesSnapshotRevenue(sevenDaysPriorSeries) ??
    0;
  const priorTickets =
    summarySnapshotTickets(sevenDaysPriorSummary) ??
    seriesSnapshotTickets(sevenDaysPriorSeries) ??
    0;

  const pctSold =
    dashboard.sellableCapacity != null && dashboard.sellableCapacity > 0
      ? (latestTickets / dashboard.sellableCapacity) * 100
      : dashboard.kpis.pctSold;
  const pctRevenueVsPotential =
    dashboard.grossPotential != null && dashboard.grossPotential > 0
      ? (latestRevenue / dashboard.grossPotential) * 100
      : dashboard.kpis.pctRevenueVsPotential;

  return {
    ...dashboard,
    kpis: {
      ...dashboard.kpis,
      totalRevenue: latestRevenue,
      ticketsDistributed: latestTickets,
      pctSold,
      revenueLast7Days: Math.max(0, latestRevenue - priorRevenue),
      ticketsLast7Days: Math.max(0, latestTickets - priorTickets),
      pctRevenueVsPotential,
    },
  };
}

/**
 * KPIs + daily series for one engagement.
 * When `performanceId` is provided, the dashboard is scoped to just that single show;
 * otherwise it rolls up every performance under the engagement.
 */
export function fetchEngagementSalesDashboard(
  engagementId: number,
  asOfDate?: string,
  performanceId?: number,
) {
  const p = new URLSearchParams();
  p.set('engagementId', String(engagementId));
  if (asOfDate) p.set('asOfDate', asOfDate);
  if (performanceId != null && Number.isFinite(performanceId)) {
    p.set('performanceId', String(performanceId));
  }
  return apiFetch<ApiEngagementSalesDashboard>(
    `/daily-sales/engagement-dashboard?${p.toString()}`,
  ).then(normalizeSinglePerformanceDashboard);
}

export function fetchAttractionSalesDashboard(
  attractionId: number,
  asOfDate?: string,
) {
  const p = new URLSearchParams();
  p.set('attractionId', String(attractionId));
  if (asOfDate) p.set('asOfDate', asOfDate);
  return apiFetch<ApiAttractionSalesDashboard>(
    `/daily-sales/attraction-sales-summary?${p.toString()}`,
  );
}
