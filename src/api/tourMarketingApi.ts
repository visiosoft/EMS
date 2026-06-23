import { apiFetch } from './config';
import type { ApiTourMediaMixItem, TourMediaMixInput } from './attractionToursApi';

// ── Tour Marketing response types ─────────────────────────────────────────────

export interface ApiTourTicketingOfferCode {
  offerCodeId: number;
  code: string;
  assignedTo: string | null;
  iaeSms: string | null;
  purpose: string | null;
}

export interface ApiTourMarketingResponse {
  tourId: number;
  marketingDirector: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  audienceGender: string | null;
  audienceAgeRangeIds: number[];
  audienceAgeRangeLabels: string[];
  mediaMix: ApiTourMediaMixItem[];
  offerCodes: ApiTourTicketingOfferCode[];
}

// ── Save payload ──────────────────────────────────────────────────────────────

export interface SaveTourTicketingOfferCode {
  offerCodeId?: number;
  code: string;
  assignedTo?: string | null;
  iaeSms?: string | null;
  purpose?: string | null;
}

export interface SaveTourMarketingPayload {
  audienceGender?: string | null;
  audienceAgeRangeIds?: number[];
  mediaMix?: TourMediaMixInput[];
  offerCodes?: SaveTourTicketingOfferCode[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

export interface OfferCodeLookups {
  assignedToOptions: string[];
  iaeSmsOptions: string[];
  purposeOptions: string[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export function fetchOfferCodeLookups() {
  return apiFetch<OfferCodeLookups>('/tour-marketing/lookups/offer-code-options');
}

export function fetchTourMarketing(tourId: number) {
  return apiFetch<ApiTourMarketingResponse>(`/tour-marketing/${tourId}`);
}

export function saveTourMarketing(tourId: number, payload: SaveTourMarketingPayload) {
  return apiFetch<ApiTourMarketingResponse>(`/tour-marketing/${tourId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteTourOfferCode(tourId: number, offerCodeId: number) {
  return apiFetch<void>(`/tour-marketing/${tourId}/offer-codes/${offerCodeId}`, {
    method: 'DELETE',
  });
}
