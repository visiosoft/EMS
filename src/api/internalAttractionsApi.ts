import { apiFetch } from './config';

export type InternalHubAttraction = {
  attractionId: number;
  attractionName: string;
  activeTourCount: number;
  latestTourBannerImageUrl: string | null;
};

export type InternalHubTour = {
  tourId: number;
  tourName: string;
  attractionId: number;
  attractionName: string;
  classId: number;
  className: string;
  talentAgencyCompanyName: string | null;
  tourBannerImageUrl: string | null;
};

export type InternalAttractionsPage = {
  data: InternalHubAttraction[];
  total: number;
};

export type InternalAttractionToursPage = {
  data: InternalHubTour[];
  total: number;
};

export function fetchInternalAttractions(offset: number, limit: number, q?: string) {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  const trimmed = q?.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalAttractionsPage>(`/internal/attractions?${params}`);
}

export function fetchInternalAttractionSuggestions(q: string, limit = 8) {
  const params = new URLSearchParams({ limit: String(limit) });
  const trimmed = q.trim();
  if (trimmed) params.set('q', trimmed);
  return apiFetch<InternalHubAttraction[]>(`/internal/attractions/suggestions?${params}`);
}

export function fetchInternalAttractionTours(attractionId: number, offset: number, limit: number) {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
    limit: String(Math.max(1, limit)),
  });
  return apiFetch<InternalAttractionToursPage>(
    `/internal/attractions/${attractionId}/tours?${params}`,
  );
}
