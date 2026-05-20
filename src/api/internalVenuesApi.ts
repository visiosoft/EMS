import { apiFetch } from './config';

export type InternalHubVenue = {
  companyId: number;
  entertainmentComplexNames: string | null;
  venueName: string;
  seatingCapacity: number;
  venueTypeId: number | null;
  venueTypeName: string | null;
  dmaId: number | null;
  dmaMarketName: string | null;
};

export type InternalVenuesPage = {
  data: InternalHubVenue[];
  total: number;
};

export function fetchInternalVenues(offset: number, limit: number, q?: string) {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  const trimmed = q?.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalVenuesPage>(`/internal/venues?${params}`);
}

export function fetchInternalVenueSuggestions(q: string, limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalHubVenue[]>(`/internal/venues/suggestions?${params}`);
}
