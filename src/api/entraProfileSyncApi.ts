import { apiFetch } from './config';

export interface EntraProfileSyncFieldChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

export interface EntraProfileSyncPreviewRow {
  contactId: number;
  email: string;
  name: string;
  status: 'willUpdate' | 'upToDate';
  changes: EntraProfileSyncFieldChange[];
}

export interface EntraProfileSyncPreview {
  generatedAt: string;
  totalUsers: number;
  willUpdate: number;
  upToDate: number;
  rows: EntraProfileSyncPreviewRow[];
}

export interface EntraProfileSyncRow {
  contactId: number;
  email: string;
  name: string;
  status: 'updated' | 'upToDate' | 'created' | 'error';
  changes: EntraProfileSyncFieldChange[];
  error?: string;
}

export interface EntraProfileSyncResult {
  syncedAt: string;
  totalProcessed: number;
  updated: number;
  upToDate: number;
  created: number;
  errors: number;
  rows: EntraProfileSyncRow[];
}

// ─── Entra → EMS (pull profile data from Entra into EMS) ─────────────────────

/**
 * Preview what Entra → EMS employee profile sync would change.
 */
export function previewEntraToEmsProfileSync(): Promise<EntraProfileSyncPreview> {
  return apiFetch<EntraProfileSyncPreview>(
    '/admin/entra-profile-sync/entra-to-ems/preview',
    { method: 'POST' },
  );
}

/**
 * Apply Entra → EMS employee profile sync (all internal employees or a specific one).
 */
export function applyEntraToEmsProfileSync(
  targetEmail?: string,
): Promise<EntraProfileSyncResult> {
  const params = targetEmail
    ? `?email=${encodeURIComponent(targetEmail)}`
    : '';
  return apiFetch<EntraProfileSyncResult>(
    `/admin/entra-profile-sync/entra-to-ems/apply${params}`,
    { method: 'POST' },
  );
}

// ─── EMS → Entra (push profile data from EMS to Entra) ───────────────────────

/**
 * Preview what EMS → Entra employee profile sync would change.
 */
export function previewEmsToEntraProfileSync(): Promise<EntraProfileSyncPreview> {
  return apiFetch<EntraProfileSyncPreview>(
    '/admin/entra-profile-sync/ems-to-entra/preview',
    { method: 'POST' },
  );
}

/**
 * Apply EMS → Entra employee profile sync (all internal employees or a specific one).
 */
export function applyEmsToEntraProfileSync(
  targetEmail?: string,
): Promise<EntraProfileSyncResult> {
  const params = targetEmail
    ? `?email=${encodeURIComponent(targetEmail)}`
    : '';
  return apiFetch<EntraProfileSyncResult>(
    `/admin/entra-profile-sync/ems-to-entra/apply${params}`,
    { method: 'POST' },
  );
}

// ─── Single-user sync (for "My Profile" page) ───────────────────────────────

export interface SingleUserSyncResult {
  synced: boolean;
  changes: EntraProfileSyncFieldChange[];
}

export interface SingleUserSyncPreview {
  changes: EntraProfileSyncFieldChange[];
}

/**
 * Preview what Entra → EMS sync would change for the signed-in user (no writes).
 */
export function previewMyProfileSyncFromEntra(): Promise<SingleUserSyncPreview> {
  return apiFetch<SingleUserSyncPreview>(
    '/internal/my-profile/sync-from-entra/preview',
    { method: 'POST' },
  );
}

/**
 * Pull the signed-in user's profile from Entra into EMS (updates all profile fields).
 */
export function syncMyProfileFromEntra(): Promise<SingleUserSyncResult> {
  return apiFetch<SingleUserSyncResult>(
    '/internal/my-profile/sync-from-entra',
    { method: 'POST' },
  );
}

// ─── Legacy aliases (backward compat) ────────────────────────────────────────

/** @deprecated Use `previewEntraToEmsProfileSync` instead. */
export function previewEntraProfileSync(): Promise<EntraProfileSyncPreview> {
  return previewEntraToEmsProfileSync();
}

/** @deprecated Use `applyEntraToEmsProfileSync` instead. */
export function applyEntraProfileSync(
  targetEmail?: string,
): Promise<EntraProfileSyncResult> {
  return applyEntraToEmsProfileSync(targetEmail);
}
