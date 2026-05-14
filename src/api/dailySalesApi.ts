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

export interface ApiPerformanceSalesPage {
  items: ApiPerformanceSalesRow[];
  total: number;
  page: number;
  pageSize: number;
  todayDate: string;
  yesterdayDate: string;
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
    totalTickets: number;
    totalRevenue: number;
  }>;
  summary: Array<{
    date: string;
    totalTicketsSold: number;
    totalValueSold: number;
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
}

export interface ApiEngagementSalesDashboard extends ApiSalesDashboardBody {
  engagementId: number;
}

export interface ApiAttractionSalesDashboard extends ApiSalesDashboardBody {
  attractionId: number;
  engagementCount: number;
  engagementBaselines: NonNullable<ApiSalesDashboardBody['engagementBaselines']>;
}

export function fetchEngagementSalesDashboard(
  engagementId: number,
  asOfDate?: string,
) {
  const p = new URLSearchParams();
  p.set('engagementId', String(engagementId));
  if (asOfDate) p.set('asOfDate', asOfDate);
  return apiFetch<ApiEngagementSalesDashboard>(
    `/daily-sales/engagement-dashboard?${p.toString()}`,
  );
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
