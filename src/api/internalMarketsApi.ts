import { apiFetch } from './config';

export type InternalHubMarket = {
  dmaid: number;
  marketName: string;
  samplePostalCode: string;
  postalCount: number;
};

export type InternalMarketsPage = {
  data: InternalHubMarket[];
  total: number;
};

export function fetchInternalMarkets(offset: number, limit: number, q?: string) {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  const trimmed = q?.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalMarketsPage>(`/internal/markets?${params}`);
}

export function fetchInternalMarketSuggestions(q: string, limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalHubMarket[]>(`/internal/markets/suggestions?${params}`);
}

export type InternalMarketVenue = {
  companyId: number;
  entertainmentComplexNames: string | null;
  venueName: string;
  seatingCapacity: number;
  venueTypeId: number | null;
  venueTypeName: string | null;
  dmaId: number | null;
  dmaMarketName: string | null;
  city: string | null;
  stateProvince: string | null;
};

export type InternalMarketVenuesPage = {
  data: InternalMarketVenue[];
  total: number;
};

/** Complexes and venues within a market (any DMAID of the market family), sorted by city. */
export function fetchInternalMarketVenues(dmaid: number, offset: number, limit: number) {
  const params = new URLSearchParams({
    dmaid: String(dmaid),
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  return apiFetch<InternalMarketVenuesPage>(`/internal/markets/venues?${params}`);
}
