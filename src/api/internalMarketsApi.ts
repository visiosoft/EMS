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

export type InternalMarketPostalRow = {
  dmaid: number;
  postalCode: string;
};

export type InternalMarketPostalsPage = {
  data: InternalMarketPostalRow[];
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

export function fetchInternalMarketPostals(marketName: string, offset: number, limit: number) {
  const params = new URLSearchParams({
    market: marketName,
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  return apiFetch<InternalMarketPostalsPage>(`/internal/markets/postal-codes?${params}`);
}
