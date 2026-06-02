import { apiFetch, apiFetchMultipart } from './config';
import type { ApiEngagementListRow } from './engagementApi';

export interface ApiClass {
  classId: number;
  className: string;
}

export interface ApiVenueType {
  venueTypeId: number;
  venueTypeName: string;
}

export interface ApiAgeRange {
  ageRangeId: number;
  ageRangeLabel: string;
  sortOrder: number;
}

export interface ApiAttractionListRow {
  attractionId: number;
  attractionName: string;
  activeTourCount: number;
  /** Banner from dbo.Link for the tour with the highest TourID on this attraction */
  latestTourBannerImageUrl: string | null;
  appCreated: boolean;
}

export interface ApiTourListRow {
  tourId: number;
  tourName: string;
  attractionId: number;
  attractionName: string;
  classId: number;
  className: string;
  audienceGender: string | null;
  audienceAgeRange: string | null;
  audienceAgeRangeIds: number[];
  audienceAgeRangeLabels: string[];
  ascap: boolean;
  bmi: boolean;
  sesac: boolean;
  gmr: boolean;
  tourInsuranceLanguage: string | null;
  talentAgencyCompanyId: number | null;
  talentAgencyCompanyName: string | null;
  tourManagementCompanyId: number | null;
  tourManagementCompanyName: string | null;
  jobId: number | null;
  jobName: string | null;
  talentAgentContactIds: number[];
  talentAgentNames: string[];
  techRiderLinkId: number | null;
  venueTypePreferenceId: number | null;
  venueTypePreferenceName: string | null;
  tourStartDate: string | null;
  tourEndDate: string | null;
  tourBannerImageUrl: string | null;
  appCreated: boolean;
}

export interface CreateAttractionPayload {
  attractionName: string;
  // NOTE: ClassID is NOT on dbo.Attraction — it lives on dbo.Tour
}

export interface UpdateAttractionPayload {
  attractionName?: string;
}

export interface CreateTourPayload {
  tourName: string;
  attractionId: number;
  classId: number;
  ascap?: boolean;
  bmi?: boolean;
  sesac?: boolean;
  gmr?: boolean;
  talentAgencyCompanyId?: number | null;
  tourManagementCompanyId?: number | null;
  talentAgentContactIds?: number[];
  audienceGender?: string | null;
  audienceAgeRange?: string | null;
  audienceAgeRangeIds?: number[];
  jobName?: string | null;
  tourInsuranceLanguage?: string | null;
  venueTypePreferenceId?: number | null;
  techRiderLinkId?: number | null;
  tourStartDate?: string | null;
  tourEndDate?: string | null;
}

export type UpdateTourPayload = Partial<CreateTourPayload>;
export type ApiTourEngagementRow = ApiEngagementListRow;

export interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
}

export function fetchAttractions(
  offset = 0,
  limit = 25,
  q?: string,
  sort?: { sortBy?: string; sortDir?: 'asc' | 'desc' },
) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const trimmed = q?.trim();
  if (trimmed) params.set('q', trimmed);
  if (sort?.sortBy?.trim()) params.set('sortBy', sort.sortBy.trim());
  if (sort?.sortDir) params.set('sortDir', sort.sortDir);
  return apiFetch<ApiPaginatedResponse<ApiAttractionListRow>>(`/attractions?${params}`);
}

export function createAttraction(body: CreateAttractionPayload) {
  return apiFetch<ApiAttractionListRow>('/attractions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateAttraction(id: number, body: UpdateAttractionPayload) {
  return apiFetch<ApiAttractionListRow>(`/attractions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteAttraction(id: number) {
  return apiFetch<void>(`/attractions/${id}`, { method: 'DELETE' });
}

/** List cache (full slice) for AttractionTours page. */
export const attractionsListQueryKey = ['attractions'] as const;
export const toursListQueryKey = ['tours'] as const;

/** When committed search has no in-cache matches, hit the API with a dedicated key. */
export const attractionsServerSearchKeyPrefix = ['attractions', 'serverSearch'] as const;
export const toursServerSearchKeyPrefix = ['tours', 'serverSearch'] as const;

export function fetchTours(
  offset = 0,
  limit = 25,
  q?: string,
  sort?: { sortBy?: string; sortDir?: 'asc' | 'desc' },
) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const trimmed = q?.trim();
  if (trimmed) params.set('q', trimmed);
  if (sort?.sortBy?.trim()) params.set('sortBy', sort.sortBy.trim());
  if (sort?.sortDir) params.set('sortDir', sort.sortDir);
  return apiFetch<ApiPaginatedResponse<ApiTourListRow>>(`/tours?${params}`);
}

function buildCreateTourFormData(body: CreateTourPayload): FormData {
  const fd = new FormData();
  fd.append('tourName', body.tourName);
  fd.append('attractionId', String(body.attractionId));
  fd.append('classId', String(body.classId));
  fd.append('ascap', String(Boolean(body.ascap)));
  fd.append('bmi', String(Boolean(body.bmi)));
  fd.append('sesac', String(Boolean(body.sesac)));
  fd.append('gmr', String(Boolean(body.gmr)));
  if (body.talentAgencyCompanyId != null && body.talentAgencyCompanyId >= 1) {
    fd.append('talentAgencyCompanyId', String(body.talentAgencyCompanyId));
  }
  if (body.tourManagementCompanyId != null && body.tourManagementCompanyId >= 1) {
    fd.append('tourManagementCompanyId', String(body.tourManagementCompanyId));
  }
  if (Array.isArray(body.talentAgentContactIds)) {
    fd.append('talentAgentContactIds', JSON.stringify(body.talentAgentContactIds));
  }
  if (body.audienceGender != null && body.audienceGender !== '') {
    fd.append('audienceGender', body.audienceGender);
  }
  if (body.audienceAgeRange != null && body.audienceAgeRange !== '') {
    fd.append('audienceAgeRange', body.audienceAgeRange);
  }
  if (Array.isArray(body.audienceAgeRangeIds)) {
    fd.append('audienceAgeRangeIds', JSON.stringify(body.audienceAgeRangeIds));
  }
  if (body.jobName != null && body.jobName !== '') {
    fd.append('jobName', body.jobName);
  }
  if (body.tourInsuranceLanguage != null && body.tourInsuranceLanguage !== '') {
    fd.append('tourInsuranceLanguage', body.tourInsuranceLanguage);
  }
  if (body.venueTypePreferenceId != null && body.venueTypePreferenceId >= 1) {
    fd.append('venueTypePreferenceId', String(body.venueTypePreferenceId));
  }
  if (body.techRiderLinkId != null && body.techRiderLinkId >= 1) {
    fd.append('techRiderLinkId', String(body.techRiderLinkId));
  }
  if (body.tourStartDate != null && String(body.tourStartDate).trim() !== '') {
    fd.append('tourStartDate', String(body.tourStartDate).trim());
  }
  if (body.tourEndDate != null && String(body.tourEndDate).trim() !== '') {
    fd.append('tourEndDate', String(body.tourEndDate).trim());
  }
  return fd;
}

function buildUpdateTourFormData(body: UpdateTourPayload): FormData {
  const fd = new FormData();
  const keys: (keyof CreateTourPayload)[] = [
    'tourName',
    'attractionId',
    'classId',
    'ascap',
    'bmi',
    'sesac',
    'gmr',
    'talentAgencyCompanyId',
    'tourManagementCompanyId',
    'talentAgentContactIds',
    'audienceGender',
    'audienceAgeRange',
    'audienceAgeRangeIds',
    'jobName',
    'tourInsuranceLanguage',
    'venueTypePreferenceId',
    'techRiderLinkId',
    'tourStartDate',
    'tourEndDate',
  ];
  for (const k of keys) {
    const v = body[k];
    if (v === undefined) continue;
    if (v === null) {
      fd.append(k, '');
      continue;
    }
    if (Array.isArray(v)) {
      fd.append(k, JSON.stringify(v));
      continue;
    }
    if (typeof v === 'boolean') {
      fd.append(k, v ? 'true' : 'false');
      continue;
    }
    fd.append(k, String(v));
  }
  return fd;
}

/** Optional `bannerFile` is stored under `/uploads/tour-banners/` and linked via dbo.Link + Tour.BannerLinkID. */
export function createTour(
  body: CreateTourPayload,
  opts?: { bannerFile?: File | null },
) {
  const fd = buildCreateTourFormData(body);
  if (opts?.bannerFile) fd.append('bannerImage', opts.bannerFile);
  return apiFetchMultipart<ApiTourListRow>('/tours', { method: 'POST', body: fd });
}

export function updateTour(
  id: number,
  body: UpdateTourPayload,
  opts?: { bannerFile?: File | null; removeBanner?: boolean },
) {
  const fd = buildUpdateTourFormData(body);
  if (opts?.bannerFile) fd.append('bannerImage', opts.bannerFile);
  if (opts?.removeBanner) fd.append('removeBanner', 'true');
  return apiFetchMultipart<ApiTourListRow>(`/tours/${id}`, { method: 'PATCH', body: fd });
}

export function deleteTour(id: number) {
  return apiFetch<void>(`/tours/${id}`, { method: 'DELETE' });
}

export function fetchTourEngagements(tourId: number) {
  return apiFetch<ApiTourEngagementRow[]>(`/engagements/by-tour/${tourId}`);
}

export function fetchTourAgeRanges() {
  return apiFetch<ApiAgeRange[]>('/tours/age-ranges');
}

export function fetchClasses() {
  return apiFetch<ApiClass[]>('/lookups/classes');
}

export function fetchVenueTypesLookup() {
  return apiFetch<ApiVenueType[]>('/lookups/venue-types');
}
