import { apiFetch } from './config';

// ── Lookup types ──────────────────────────────────────────────────────────────

export interface ApiMedium {
  mediumId: number;
  mediumName: string;
  isActive: boolean;
}

export interface ApiPlacementCategory {
  placementCategoryId: number;
  placementName: string;
  mediumId: number;
  medium: ApiMedium;
  sizeUnit: string | null;
  isActive: boolean;
  sortOrder: number | null;
}

export interface ApiLocalizationOption {
  localizationOptionId: number;
  localizationName: string;
  isActive: boolean;
  sortOrder: number | null;
}

export interface ApiTagOption {
  tagOptionId: number;
  tagName: string;
  isActive: boolean;
  sortOrder: number | null;
}

export interface ApiFileSpecOption {
  fileSpecOptionId: number;
  fileSpecName: string;
  isActive: boolean;
  sortOrder: number | null;
}

export interface ApiFileFormatOption {
  fileFormatOptionId: number;
  fileFormatName: string;
  isActive: boolean;
  sortOrder: number | null;
}

// ── Venue Marketing data types ────────────────────────────────────────────────

export interface ApiVenueMarketingLocalization {
  localizationOptionId: number;
  localizationName: string | null;
  customValue: string | null;
}

export interface ApiVenueMarketingTag {
  tagOptionId: number;
  tagName: string | null;
}

export interface ApiVenueMarketingFileSpec {
  fileSpecOptionId: number;
  fileSpecName: string | null;
  customValue: string | null;
}

export interface ApiVenueMarketingSpecRow {
  venueMarketingSpecsId: number;
  fileName: string | null;
  placementCategoryId: number | null;
  placementCategoryName: string | null;
  mediumName: string | null;
  sizeUnit: string | null;
  graphicSizeHorizontal: string | null;
  graphicSizeVertical: string | null;
  fileFormatOptionId: number | null;
  fileFormatName: string | null;
  notes: string | null;
  localizations: ApiVenueMarketingLocalization[];
  tags: ApiVenueMarketingTag[];
  fileSpecs: ApiVenueMarketingFileSpec[];
}

export interface ApiVenueStyleGuide {
  venueStyleGuideId: number;
  font: string | null;
  primaryColors: string | null;
  accentColors: string | null;
  notes: string | null;
  logoUrl: string | null;
}

export interface ApiVenueMarketingResponse {
  styleGuideEnabled: boolean;
  styleGuide: ApiVenueStyleGuide | null;
  specs: ApiVenueMarketingSpecRow[];
}

// ── Save payload types ────────────────────────────────────────────────────────

export interface SaveSpecLocalization {
  localizationOptionId: number;
  customValue?: string | null;
}

export interface SaveSpecTag {
  tagOptionId: number;
}

export interface SaveSpecFileSpec {
  fileSpecOptionId: number;
  customValue?: string | null;
}

export interface SaveVenueMarketingSpecRow {
  venueMarketingSpecsId?: number;
  fileName?: string | null;
  placementCategoryId?: number | null;
  graphicSizeHorizontal?: string | null;
  graphicSizeVertical?: string | null;
  fileFormatOptionId?: number | null;
  notes?: string | null;
  localizations?: SaveSpecLocalization[];
  tags?: SaveSpecTag[];
  fileSpecs?: SaveSpecFileSpec[];
}

export interface SaveVenueMarketingPayload {
  styleGuideEnabled: boolean;
  styleGuide?: {
    font?: string | null;
    primaryColors?: string | null;
    accentColors?: string | null;
    notes?: string | null;
    logoUrl?: string | null;
  } | null;
  specs: SaveVenueMarketingSpecRow[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export function fetchVenueMarketingLookups() {
  return Promise.all([
    apiFetch<ApiPlacementCategory[]>('/venue-marketing/lookups/placement-categories'),
    apiFetch<ApiLocalizationOption[]>('/venue-marketing/lookups/localization-options'),
    apiFetch<ApiTagOption[]>('/venue-marketing/lookups/tag-options'),
    apiFetch<ApiFileSpecOption[]>('/venue-marketing/lookups/file-spec-options'),
    apiFetch<ApiFileFormatOption[]>('/venue-marketing/lookups/file-format-options'),
  ]).then(([placementCategories, localizationOptions, tagOptions, fileSpecOptions, fileFormatOptions]) => ({
    placementCategories,
    localizationOptions,
    tagOptions,
    fileSpecOptions,
    fileFormatOptions,
  }));
}

export function fetchVenueMarketing(venueId: number) {
  return apiFetch<ApiVenueMarketingResponse>(`/venue-marketing/${venueId}`);
}

export function saveVenueMarketing(venueId: number, payload: SaveVenueMarketingPayload) {
  return apiFetch<ApiVenueMarketingResponse>(`/venue-marketing/${venueId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteVenueMarketingSpec(venueId: number, specId: number) {
  return apiFetch<void>(`/venue-marketing/${venueId}/specs/${specId}`, {
    method: 'DELETE',
  });
}
