import { apiFetch, apiFetchMultipart } from './config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiTourProfileFileField {
  linkId: number | null;
  linkUrl: string | null;
  linkName: string | null;
}

export interface ApiTourProfileFilesResponse {
  tourId: number;
  techRider: ApiTourProfileFileField;
  dealSheet: ApiTourProfileFileField;
  agencySales: ApiTourProfileFileField;
  marketingManual: ApiTourProfileFileField;
  marketingMaterial: ApiTourProfileFileField;
  vipPdf: ApiTourProfileFileField;
  preSalePasscode: string | null;
  seatHoldRequirements: string | null;
}

/** Keys that map to Tour link/upload columns. */
export type TourProfileFileKey =
  | 'techRider'
  | 'dealSheet'
  | 'agencySales'
  | 'marketingManual'
  | 'marketingMaterial'
  | 'vipPdf';

export interface TourProfileFileFieldUpdate {
  /** New URL, or empty string to clear. Omit to leave unchanged. */
  url?: string | null;
  /** New display name for the link. Omit to leave unchanged. */
  name?: string | null;
  /** File to upload. Replaces any existing link. */
  file?: File | null;
  /** Explicit clear (removes link + column). */
  remove?: boolean;
}

export interface UpdateTourProfileFilesPayload {
  techRider?: TourProfileFileFieldUpdate;
  dealSheet?: TourProfileFileFieldUpdate;
  agencySales?: TourProfileFileFieldUpdate;
  marketingManual?: TourProfileFileFieldUpdate;
  marketingMaterial?: TourProfileFileFieldUpdate;
  vipPdf?: TourProfileFileFieldUpdate;
  preSalePasscode?: string | null;
  seatHoldRequirements?: string | null;
}

/** Multipart field-name map keyed by TourProfileFileKey. */
const FIELD_MAP: Record<
  TourProfileFileKey,
  { urlField: string; nameField: string; removeField: string; fileField: string }
> = {
  techRider: {
    urlField: 'techRiderUrl',
    nameField: 'techRiderName',
    removeField: 'removeTechRider',
    fileField: 'techRiderFile',
  },
  dealSheet: {
    urlField: 'dealSheetUrl',
    nameField: 'dealSheetName',
    removeField: 'removeDealSheet',
    fileField: 'dealSheetFile',
  },
  agencySales: {
    urlField: 'agencySalesUrl',
    nameField: 'agencySalesName',
    removeField: 'removeAgencySales',
    fileField: 'agencySalesFile',
  },
  marketingManual: {
    urlField: 'marketingManualUrl',
    nameField: 'marketingManualName',
    removeField: 'removeMarketingManual',
    fileField: 'marketingManualFile',
  },
  marketingMaterial: {
    urlField: 'marketingMaterialUrl',
    nameField: 'marketingMaterialName',
    removeField: 'removeMarketingMaterial',
    fileField: 'marketingMaterialFile',
  },
  vipPdf: {
    urlField: 'vipPdfUrl',
    nameField: 'vipPdfName',
    removeField: 'removeVipPdf',
    fileField: 'vipPdfFile',
  },
};

// ── API ──────────────────────────────────────────────────────────────────────

export function fetchTourProfileFiles(tourId: number) {
  return apiFetch<ApiTourProfileFilesResponse>(`/tours/${tourId}/profile-files`);
}

export function saveTourProfileFiles(
  tourId: number,
  payload: UpdateTourProfileFilesPayload,
) {
  const fd = new FormData();

  if (payload.preSalePasscode !== undefined) {
    fd.append('preSalePasscode', payload.preSalePasscode ?? '');
  }
  if (payload.seatHoldRequirements !== undefined) {
    fd.append('seatHoldRequirements', payload.seatHoldRequirements ?? '');
  }

  for (const key of Object.keys(FIELD_MAP) as TourProfileFileKey[]) {
    const update = payload[key];
    if (!update) continue;
    const spec = FIELD_MAP[key];
    if (update.file instanceof File) {
      fd.append(spec.fileField, update.file);
      if (update.name !== undefined) {
        fd.append(spec.nameField, update.name ?? '');
      }
      continue;
    }
    if (update.remove === true) {
      fd.append(spec.removeField, 'true');
      continue;
    }
    if (update.url !== undefined) {
      fd.append(spec.urlField, update.url ?? '');
    }
    if (update.name !== undefined) {
      fd.append(spec.nameField, update.name ?? '');
    }
  }

  return apiFetchMultipart<ApiTourProfileFilesResponse>(
    `/tours/${tourId}/profile-files`,
    { method: 'PATCH', body: fd },
  );
}

// ── Engagement VIP PDF override ─────────────────────────────────────────────

export interface ApiEngagementVipPdf {
  engagementId: number;
  linkId: number | null;
  linkUrl: string | null;
  linkName: string | null;
  source: 'engagement' | 'tour' | 'none';
  hasOverride: boolean;
}

export interface UpdateEngagementVipPdfPayload {
  url?: string | null;
  name?: string | null;
  file?: File | null;
  remove?: boolean;
}

export function fetchEngagementVipPdf(engagementId: number) {
  return apiFetch<ApiEngagementVipPdf>(`/engagements/${engagementId}/vip-pdf`);
}

export function saveEngagementVipPdf(
  engagementId: number,
  payload: UpdateEngagementVipPdfPayload,
) {
  const fd = new FormData();
  if (payload.file instanceof File) {
    fd.append('vipPdfFile', payload.file);
    if (payload.name !== undefined) fd.append('vipPdfName', payload.name ?? '');
  } else if (payload.remove === true) {
    fd.append('removeVipPdf', 'true');
  } else {
    if (payload.url !== undefined) fd.append('vipPdfUrl', payload.url ?? '');
    if (payload.name !== undefined) fd.append('vipPdfName', payload.name ?? '');
  }
  return apiFetchMultipart<ApiEngagementVipPdf>(
    `/engagements/${engagementId}/vip-pdf`,
    { method: 'PATCH', body: fd },
  );
}
