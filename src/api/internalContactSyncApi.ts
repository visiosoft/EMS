import { apiFetch } from './config';

export type InternalContactSyncActionType =
  | 'create'
  | 'update'
  | 'remove'
  | 'disable'
  | 'upToDate'
  | 'possibleDuplicate'
  | 'duplicateConflict'
  | 'emsOnly'
  | 'skipped';

export interface InternalContactSyncFieldChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
  skipped?: boolean;
  reason?: string;
}

export interface InternalContactSyncCandidate {
  contactId?: number;
  entraUserId?: string;
  name: string;
  email: string;
  departments: string[];
  roles: string[];
}

export interface InternalContactSyncRow {
  actionId: string;
  type: InternalContactSyncActionType;
  reason: string;
  entraUserId?: string;
  contactId?: number;
  entraName?: string;
  entraEmail?: string;
  emsName?: string;
  emsEmail?: string;
  changes: InternalContactSyncFieldChange[];
  candidateContacts?: InternalContactSyncCandidate[];
}

export interface InternalContactSyncPreview {
  generatedAt: string;
  internalCompany: {
    companyId: number;
    companyName: string;
  };
  jobTitleColumnAvailable: boolean;
  counts: Record<InternalContactSyncActionType, number>;
  rows: InternalContactSyncRow[];
  warnings: string[];
}

export interface ApplyInternalContactSyncRequest {
  selectedActionIds: string[];
  selectedActionFields?: Record<string, string[]>;
  manualMappings: Array<{
    entraUserId?: string;
    targetEntraUserId?: string;
    contactId?: number;
  }>;
}

export interface InternalContactSyncApplyResult {
  appliedAt: string;
  internalCompany: {
    companyId: number;
    companyName: string;
  };
  jobTitleColumnAvailable: boolean;
  created: number;
  updated: number;
  removed: number;
  disabled: number;
  skipped: number;
  skippedJobTitleWrites: number;
  createdEntraUsers?: Array<{
    displayName: string;
    userPrincipalName: string;
    temporaryPassword: string;
  }>;
  errors: string[];
}

export function previewInternalContactSync(): Promise<InternalContactSyncPreview> {
  return apiFetch<InternalContactSyncPreview>('/admin/internal-contact-sync/preview', {
    method: 'POST',
  });
}

export function previewEntraToEmsContactSync(): Promise<InternalContactSyncPreview> {
  return apiFetch<InternalContactSyncPreview>('/admin/internal-contact-sync/entra-to-ems/preview', {
    method: 'POST',
  });
}

export function previewEmsToEntraContactSync(): Promise<InternalContactSyncPreview> {
  return apiFetch<InternalContactSyncPreview>('/admin/internal-contact-sync/ems-to-entra/preview', {
    method: 'POST',
  });
}

export function applyInternalContactSync(
  request: ApplyInternalContactSyncRequest,
): Promise<InternalContactSyncApplyResult> {
  return apiFetch<InternalContactSyncApplyResult>('/admin/internal-contact-sync/apply', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function applyEntraToEmsContactSync(
  request: ApplyInternalContactSyncRequest,
): Promise<InternalContactSyncApplyResult> {
  return apiFetch<InternalContactSyncApplyResult>('/admin/internal-contact-sync/entra-to-ems/apply', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function applyEmsToEntraContactSync(
  request: ApplyInternalContactSyncRequest,
): Promise<InternalContactSyncApplyResult> {
  return apiFetch<InternalContactSyncApplyResult>('/admin/internal-contact-sync/ems-to-entra/apply', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
