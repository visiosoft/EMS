/**
 * Engagement Module API
 *
 * dbo.Engagement columns: EngagementID, EngagementStatus, TourID (NOT NULL).
 * Sellable capacity and gross potential are on dbo.EngagementFinances (joined for list/detail).
 * Opening show is the earliest dbo.Performance (see openingPerformanceDate/Time).
 * AttractionID was REMOVED from dbo.Engagement.
 * AttractionID is on dbo.Tour — reach via: Engagement.TourID → Tour.AttractionID → Attraction
 *
 * dbo.EngagementVenue: EngagementID, VenueCompanyID, IsPrimary
 */
import { apiFetch } from './config';

export interface ApiEngagementListRow {
  engagementId: number;
  engagementStatus: string;
  engagementScaling: string | null;
  sellableCapacity: number | null;
  grossPotential: number | null;
  /** Earliest dbo.Performance (opening show), if any */
  openingPerformanceDate: string | null;
  openingPerformanceTime: string | null;
  tourId: number;
  tourName: string;
  /** Derived via Tour.AttractionID — may be null if tour has no attraction */
  attractionId: number | null;
  attractionName: string | null;
  primaryVenueCompanyId: number | null;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
  /** Tour banner image URL from dbo.Link (Tour.BannerLinkID) */
  tourBannerImageUrl: string | null;
  /** Entertainment complex company names for primary venue (comma-separated) */
  entertainmentComplexNames: string | null;
  /** dbo.EngagementProduction (latest row by ProductionID) */
  rehearsalDate: string | null;
  loadInDate: string | null;
  displayTitle: string;
  appCreated: boolean;
}

export interface ApiEngagementVenueRow {
  engagementId: number;
  venueCompanyId: number;
  venueCompanyName: string | null;
  venueName: string | null;
  city: string | null;
  stateProvince: string | null;
  dmaMarketName: string | null;
  isPrimary: boolean;
}

export interface ApiEngagementServiceProviderRow {
  providerCompanyId: number;
  providerCompanyName: string | null;
  serviceProvidedIds: number[];
  serviceProvidedNames: string[];
}

export type ApiEngagementServiceProvidersResponse = {
  venueCompanyId: number;
  providers: ApiEngagementServiceProviderRow[];
};

export interface CreateEngagementPayload {
  engagementStatus: string;
  /** ISO date YYYY-MM-DD — stored as dbo.Performance.PerformanceDate */
  openingShowDate: string;
  /** HH:mm or HH:mm:ss — stored as dbo.Performance.PerformanceTime */
  openingShowTime: string;
  /** TourID — NOT NULL in DB. Required. Attraction is derived from the tour. */
  tourId: number;
  /** Creates EngagementVenue(IsPrimary=1) */
  primaryVenueCompanyId: number;
  secondaryVenueCompanyIds?: number[];
  // Frontend-only
  bookerId?: string | null;
  showDate?: string | null;
  dealType?: string | null;
  guarantee?: number | null;
}

/** Only persisted fields — capacity/potential stored on EngagementFinances */
export interface UpdateEngagementPayload {
  engagementStatus?: string;
  engagementScaling?: string | null;
  tourId?: number;
  primaryVenueCompanyId?: number;
  sellableCapacity?: number | null;
  grossPotential?: number | null;
  rehearsalDate?: string | null;
  loadInDate?: string | null;
}

/** dbo.EngagementFinances — one row per engagement (GET returns nulls for missing row / empty fields) */
export interface ApiEngagementFinanceRow {
  financeId: number | null;
  engagementId: number;
  estimatedBreakeven: number | null;
  grossPotential: number | null;
  sellableCapacity: number | null;
  promoterProfit: number | null;
  venueTerms: string | null;
  confirmationPacketApproved: boolean | null;
  iaeWaiverApplicationConfirmationNumber: string | null;
  iaeWaiverApplicationSubmissionDate: string | null;
  iaeApplicationWaiverStatus: string | null;
  dateFundsReceived: string | null;
  fundsDue: number | null;
  fundsWithheld: number | null;
  fundsOwed: number | null;
  receivableBankAccount: string | null;
  requiredNonResidentWithholdingId: number | null;
  artistFinanceId: number | null;
  settlementFinanceId: number | null;
  /** dbo.SettlementFinance via SettlementFinanceID */
  artistSettlementStatus: string | null;
  venueSettlementStatus: string | null;
  subscriptionSalesRevenueTotal: number | null;
  seasonTicketSalesByIae: number | null;
  seasonTicketFundsTransferred: number | null;
  netBoxOfficeFundsDepositedAccount: string | null;
  hstCollectedFromTicketSales: number | null;
  hstPaidOnTourPayments: number | null;
  hstPaidOnShowExpenses: number | null;
  hstPaidOnVenueExpenses: number | null;
  artistGrossTaxableCompensation: number | null;
  amountDueToDeptOfRevenue: number | null;
  checkNumberOrConfOfWithholdingPayment: string | null;
  /** dbo.ArtistFinance via ArtistFinanceID */
  artistDealType: string | null;
  artistGuarantee: number | null;
  artistMiddleMoney: number | null;
  artistRoyaltyVariableFee: string | null;
  artistBackEndTerms: string | null;
  /** dbo.EngagementFinances (optional columns) */
  finalAcceptedOfferLink: string | null;
  settlementFileSharePointLink: string | null;
}

export type UpdateEngagementFinancePayload = {
  estimatedBreakeven?: number | null;
  sellableCapacity?: number | null;
  grossPotential?: number | null;
  promoterProfit?: number | null;
  venueTerms?: string | null;
  confirmationPacketApproved?: boolean | null;
  iaeWaiverApplicationConfirmationNumber?: string | null;
  iaeWaiverApplicationSubmissionDate?: string | null;
  iaeApplicationWaiverStatus?: string | null;
  dateFundsReceived?: string | null;
  fundsDue?: number | null;
  fundsWithheld?: number | null;
  fundsOwed?: number | null;
  receivableBankAccount?: string | null;
  requiredNonResidentWithholdingId?: number | null;
  artistFinanceId?: number | null;
  settlementFinanceId?: number | null;
  artistSettlementStatus?: string | null;
  venueSettlementStatus?: string | null;
  subscriptionSalesRevenueTotal?: number | null;
  seasonTicketSalesByIae?: number | null;
  seasonTicketFundsTransferred?: number | null;
  netBoxOfficeFundsDepositedAccount?: string | null;
  hstCollectedFromTicketSales?: number | null;
  hstPaidOnTourPayments?: number | null;
  hstPaidOnShowExpenses?: number | null;
  hstPaidOnVenueExpenses?: number | null;
  artistGrossTaxableCompensation?: number | null;
  amountDueToDeptOfRevenue?: number | null;
  checkNumberOrConfOfWithholdingPayment?: string | null;
  artistDealType?: string | null;
  artistGuarantee?: number | null;
  artistMiddleMoney?: number | null;
  artistRoyaltyVariableFee?: string | null;
  artistBackEndTerms?: string | null;
  finalAcceptedOfferLink?: string | null;
  settlementFileSharePointLink?: string | null;
};

export interface ApiEngagementFinanceLookups {
  nonResidentWithholdings: {
    id: number;
    label: string;
    withholdingTaxRate?: string | null;
    dmaid?: number | null;
    taxAgencyId?: number | null;
    withholdingLink?: ApiFinanceLink | null;
    artistWaiverInstructions?: ApiFinanceLink | null;
    iaeWaiverInstructions?: ApiFinanceLink | null;
  }[];
  artistFinances: { id: number; label: string }[];
  settlementFinances: { id: number; label: string }[];
  iaeApplicationWaiverStatuses: { value: string; label: string }[];
}

export interface ApiFinanceLink {
  linkId: number;
  linkType: string;
  linkUrl: string;
  linkName: string;
  linkPath: string;
}

export const fetchEngagementFinanceLookups = () =>
  apiFetch<ApiEngagementFinanceLookups>('/engagements/finance-lookups');

export interface ApiPerformanceRow {
  performanceId: number;
  engagementId: number;
  performanceStatus: string;
  performanceDate: string;
  performanceTime: string;
}

export interface ApiPerformanceTicketingRow {
  ticketingId: number | null;
  performanceId: number;
  ticketingStatus: string | null;
  onSaleDate: string | null;
  preSaleDate: string | null;
  vipPackagedOffer: string | null;
  preSaleSpecialPrices: string | null;
  kidsTicketsPrices: string | null;
  ticketingLinkId: number | null;
  ticketingLinkUrl: string | null;
  grossTicketSales: number | null;
  totalComps: number | null;
  totalTickets: number | null;
  totalAdmissions: number | null;
}

export type UpdatePerformanceTicketingPayload = {
  ticketingStatus?: string | null;
  onSaleDate?: string | null;
  preSaleDate?: string | null;
  vipPackagedOffer?: string | null;
  preSaleSpecialPrices?: string | null;
  kidsTicketsPrices?: string | null;
  ticketingLinkId?: number | null;
  ticketingLinkUrl?: string | null;
  grossTicketSales?: number | null;
  totalComps?: number | null;
  totalTickets?: number | null;
  totalAdmissions?: number | null;
};

export type UpdateNonResidentWithholdingLinksPayload = {
  iaeWaiverInstructionsUrl?: string | null;
  artistWaiverInstructionsUrl?: string | null;
};

export interface ApiEngagementIaeContactRow {
  engagementIaeContactId: number;
  engagementId: number;
  contactId: number;
  contactLabel: string;
  roleId: number | null;
  roleName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdDate: string;
}

export interface ApiEngagementIaeContactLookups {
  contacts: { id: number; label: string }[];
  roles: { id: number; label: string }[];
  departments: { id: number; label: string }[];
}

export type CreateEngagementIaeContactPayload = {
  contactId: number;
  roleId?: number | null;
  departmentId?: number | null;
  isPrimary?: boolean | null;
  notes?: string | null;
};

export type UpdateEngagementIaeContactPayload = {
  contactId?: number;
  roleId?: number | null;
  departmentId?: number | null;
  isPrimary?: boolean | null;
  notes?: string | null;
};

export interface CreatePerformancePayload {
  performanceDate: string;
  performanceTime: string;
  performanceStatus?: string;
}

/** Full list (legacy). Prefer {@link fetchEngagementsPaged} for the EMS list screen. */
export const fetchEngagements = () => apiFetch<ApiEngagementListRow[]>('/engagements');

/** Company Hub widgets — engagements created by the signed-in user (`created_by`) in the date range. */
export function fetchHubEngagementSchedule(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch<ApiEngagementListRow[]>(`/engagements/hub-schedule?${params}`);
}

export interface ApiEngagementsPageResponse {
  data: ApiEngagementListRow[];
  total: number;
}

export interface ApiEngagementFilterOptions {
  attractionNames: string[];
  dmaMarketNames: string[];
  venueLabels: string[];
}

export type EngagementPagedQueryOpts = {
  q?: string;
  status?: string;
  attraction?: string;
  dma?: string;
  venue?: string;
  timing?: 'all' | 'upcoming' | 'past';
  /** Server whitelist: attraction, tour, venue, market, date */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export function engagementsPagedQueryKey(
  offset: number,
  limit: number,
  opts: EngagementPagedQueryOpts,
) {
  return [
    'engagements',
    'paged',
    offset,
    limit,
    opts.q ?? '',
    opts.status ?? 'All',
    opts.attraction ?? '',
    opts.dma ?? '',
    opts.venue ?? '',
    opts.timing ?? 'all',
    opts.sortBy ?? '',
    opts.sortDir ?? '',
  ] as const;
}

/** Large prefetch for engagement search suggestions (local filter while typing). */
export const ENGAGEMENTS_SUGGESTION_CACHE_LIMIT = 5000;

export function engagementsSuggestionCacheQueryKey(opts: Omit<EngagementPagedQueryOpts, 'q'>) {
  return [
    'engagements',
    'suggestion-cache',
    opts.status ?? 'All',
    opts.attraction ?? '',
    opts.dma ?? '',
    opts.venue ?? '',
    opts.timing ?? 'all',
    opts.sortBy ?? '',
    opts.sortDir ?? '',
  ] as const;
}

export function fetchEngagementsPaged(
  offset = 0,
  limit = 25,
  opts?: EngagementPagedQueryOpts,
) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (opts?.q?.trim()) params.set('q', opts.q.trim());
  if (opts?.status && opts.status !== 'All') params.set('status', opts.status);
  if (opts?.attraction?.trim()) params.set('attraction', opts.attraction.trim());
  if (opts?.dma?.trim()) params.set('dma', opts.dma.trim());
  if (opts?.venue?.trim()) params.set('venue', opts.venue.trim());
  if (opts?.timing && opts.timing !== 'all') params.set('timing', opts.timing);
  if (opts?.sortBy?.trim()) {
    params.set('sortBy', opts.sortBy.trim());
    if (opts.sortDir) params.set('sortDir', opts.sortDir);
  }
  return apiFetch<ApiEngagementsPageResponse>(`/engagements/paged?${params}`);
}

export function fetchEngagementFilterOptions() {
  return apiFetch<ApiEngagementFilterOptions>('/engagements/filter-options');
}
export const fetchEngagement = (id: number) => apiFetch<ApiEngagementListRow>(`/engagements/${id}`);
export const fetchEngagementVenues = (id: number) => apiFetch<ApiEngagementVenueRow[]>(`/engagements/${id}/venues`);
export const fetchEngagementServiceProviders = (id: number) =>
  apiFetch<ApiEngagementServiceProvidersResponse>(`/engagements/${id}/service-providers`);
export const addEngagementServiceProvider = (id: number, body: { providerCompanyId: number }) =>
  apiFetch<void>(`/engagements/${id}/service-providers`, { method: 'POST', body: JSON.stringify(body) });
export const removeEngagementServiceProvider = (id: number, providerCompanyId: number) =>
  apiFetch<void>(`/engagements/${id}/service-providers/${providerCompanyId}`, { method: 'DELETE' });
export const addEngagementVenue = (id: number, body: { venueCompanyId: number; isPrimary?: boolean }) =>
  apiFetch<void>(`/engagements/${id}/venues`, { method: 'POST', body: JSON.stringify(body) });
export const removeEngagementVenue = (id: number, venueCompanyId: number) =>
  apiFetch<void>(`/engagements/${id}/venues/${venueCompanyId}`, { method: 'DELETE' });
export const createEngagement = (body: CreateEngagementPayload) =>
  apiFetch<{ engagementId: number }>('/engagements', { method: 'POST', body: JSON.stringify(body) });
export const updateEngagement = (id: number, body: UpdateEngagementPayload) =>
  apiFetch<void>(`/engagements/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteEngagement = (id: number) =>
  apiFetch<void>(`/engagements/${id}`, { method: 'DELETE' });
export const fetchEngagementPerformances = (id: number) =>
  apiFetch<ApiPerformanceRow[]>(`/engagements/${id}/performances`);
export const createEngagementPerformance = (id: number, body: CreatePerformancePayload) =>
  apiFetch<{ performanceId: number }>(`/engagements/${id}/performances`, { method: 'POST', body: JSON.stringify(body) });

export const updateEngagementPerformance = (
  engagementId: number,
  performanceId: number,
  body: { performanceDate?: string; performanceTime?: string; performanceStatus?: string },
) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteEngagementPerformance = (engagementId: number, performanceId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}`, {
    method: 'DELETE',
  });

export const fetchEngagementPerformanceTicketing = (
  engagementId: number,
  performanceId: number,
) =>
  apiFetch<ApiPerformanceTicketingRow>(
    `/engagements/${engagementId}/performances/${performanceId}/ticketing`,
  );

export const updateEngagementPerformanceTicketing = (
  engagementId: number,
  performanceId: number,
  body: UpdatePerformanceTicketingPayload,
) =>
  apiFetch<void>(`/engagements/${engagementId}/performances/${performanceId}/ticketing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const fetchEngagementIaeContactLookups = () =>
  apiFetch<ApiEngagementIaeContactLookups>('/engagements/iae-contact-lookups');

export const fetchEngagementIaeContacts = (engagementId: number) =>
  apiFetch<ApiEngagementIaeContactRow[]>(`/engagements/${engagementId}/iae-contacts`);

export const addEngagementIaeContact = (
  engagementId: number,
  body: CreateEngagementIaeContactPayload,
) =>
  apiFetch<{ engagementIaeContactId: number }>(`/engagements/${engagementId}/iae-contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateEngagementIaeContact = (
  engagementId: number,
  eicId: number,
  body: UpdateEngagementIaeContactPayload,
) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-contacts/${eicId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteEngagementIaeContact = (engagementId: number, eicId: number) =>
  apiFetch<void>(`/engagements/${engagementId}/iae-contacts/${eicId}`, { method: 'DELETE' });

export const fetchEngagementFinance = (id: number) =>
  apiFetch<ApiEngagementFinanceRow>(`/engagements/${id}/finance`);

export const updateEngagementFinance = (id: number, body: UpdateEngagementFinancePayload) =>
  apiFetch<void>(`/engagements/${id}/finance`, { method: 'PATCH', body: JSON.stringify(body) });

export const createEngagementWithholding = (id: number) =>
  apiFetch<{ withholdingId: number }>(`/engagements/${id}/withholding`, {
    method: 'POST',
  });

export const updateNonResidentWithholdingLinks = (
  withholdingId: number,
  body: UpdateNonResidentWithholdingLinksPayload,
) =>
  apiFetch<void>(`/engagements/withholdings/${withholdingId}/links`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
