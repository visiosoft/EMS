import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ActionMenu,
  Avatar,
  Drawer,
  FormField,
  Modal,
  StatusBadge,
  TabBar,
} from './Primitives';
import { Select2, Select2Multi, type Select2Option } from './Select2';
import { companyToSelect2Options } from './companySelectOptions';
import { PageSizeSelect } from './PageSizeSelect';
import { invalidateDmaMarketsQueries } from '@/api/cacheHelpers';
import { normalizeDmaMarketRows, patchWizardDmaMarketsCache } from '@/lib/projectWizardDma';
import type { ApiDmaMarket } from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  getPageParams,
  getPageRange,
  getTotalPages,
  PAGE_SIZE,
  type PageSizeOption,
} from '@/lib/serverPagination';
import {
  fetchCompaniesPickerRows,
  fetchLookups,
  fetchServicesAllowedForCompanyTypes,
  type ApiCompanyListRow,
} from '@/api/companyApi';
import {
  createLookupManageRow,
  deleteLookupManageRow,
  fetchLookupManageRows,
  lookupManageListQueryKey,
  type LookupManageCreatePayload,
  type LookupManageRow,
  type LookupManageTableKey,
  type LookupManageUpdatePayload,
  type LookupManageListResponse,
  updateLookupManageRow,
} from '@/api/lookupManagementApi';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import {
  fetchAdminUsers,
  getGraphRequestErrorDetail,
  type GraphRequestErrorDetail,
} from '@/api/adminUsersApi';
import {
  applyEmsToEntraContactSync,
  applyEntraToEmsContactSync,
  previewEmsToEntraContactSync,
  previewEntraToEmsContactSync,
  type InternalContactSyncActionType,
  type InternalContactSyncApplyResult,
  type InternalContactSyncPreview,
  type InternalContactSyncRow,
} from '@/api/internalContactSyncApi';
import {
  describeGraphAccessToken,
  getActiveAccount,
  type GraphTokenDiagnostics,
  acquireGraphAccessToken,
  requestGraphAccessToken,
} from '@/auth/entra';
import { richTextMatches } from './searchUtils';

interface UserRow {
  id: string;
  name: string;
  role: string;
  email: string;
  jobTitle?: string;
  department?: string;
  employeeType?: string;
  officeLocation?: string;
  city?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  companyName?: string;
  accountEnabled?: boolean;
  userType?: string;
  lastLogin: string;
  status?: 'Active' | 'Disabled';
}

interface Props {
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  users: UserRow[];
  onUpdateUsers: (users: UserRow[]) => void;
  initialMainTab?: 'Users' | 'Lookup Tables' | 'System';
}

type LookupTableConfig = {
  key: LookupManageTableKey;
  label: string;
  idField: string;
  nameField?: string;
  manualIdOnCreate: boolean;
  columns: { label: string; field: string; sortBy: string }[];
};

const LOOKUP_TABLES: LookupTableConfig[] = [
  {
    key: 'company-types',
    label: 'CompanyType',
    idField: 'companyTypeId',
    nameField: 'companyTypeName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'companyTypeName', sortBy: 'name' },
    ],
  },
  {
    key: 'venue-types',
    label: 'VenueType',
    idField: 'venueTypeId',
    nameField: 'venueTypeName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'venueTypeName', sortBy: 'name' },
    ],
  },
  {
    key: 'seating-types',
    label: 'SeatingType',
    idField: 'seatingTypeId',
    nameField: 'seatingName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'seatingName', sortBy: 'name' },
    ],
  },
  {
    key: 'departments',
    label: 'Department',
    idField: 'departmentId',
    nameField: 'departmentName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'departmentName', sortBy: 'name' },
    ],
  },
  {
    key: 'classes',
    label: 'Class',
    idField: 'classId',
    nameField: 'className',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'className', sortBy: 'name' },
    ],
  },
  {
    key: 'roles',
    label: 'Role',
    idField: 'roleId',
    nameField: 'roleName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'roleName', sortBy: 'name' },
    ],
  },
  {
    key: 'brands',
    label: 'Brand',
    idField: 'brandId',
    nameField: 'brandName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'brandName', sortBy: 'name' },
    ],
  },
  {
    key: 'company-type-services',
    label: 'CompanyTypeService',
    idField: 'companyTypeId',
    nameField: 'companyTypeName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Company Type', field: 'companyTypeName', sortBy: 'companyTypeName' },
      { label: 'Services', field: 'serviceNames', sortBy: 'serviceName' },
    ],
  },
  {
    key: 'services-provided',
    label: 'ServiceProvided',
    idField: 'serviceProvidedId',
    nameField: 'serviceName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Name', field: 'serviceName', sortBy: 'name' },
    ],
  },
  {
    key: 'dmas',
    label: 'DMA',
    idField: 'dmaid',
    nameField: 'marketName',
    manualIdOnCreate: false,
    columns: [
      { label: 'Market Name', field: 'marketName', sortBy: 'name' },
      { label: 'Postal Code', field: 'postalCode', sortBy: 'postalCode' },
    ],
  },
];

function toDisplay(v: unknown) {
  if (v == null || v === '') return '—';
  return String(v);
}

function getRowId(row: LookupManageRow, config: LookupTableConfig) {
  return Number(row[config.idField]);
}

/** Stable React keys even when row shape does not match `config` (e.g. transient placeholder mismatch). */
function getLookupRowElementKey(row: LookupManageRow, config: LookupTableConfig, index: number) {
  const raw = row[config.idField];
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return `${config.key}-${n}`;
  }
  const fingerprint = config.columns
    .map((c) => String(row[c.field] ?? '').trim())
    .join('\u241e');
  return `${config.key}-r${index}-${fingerprint}`;
}

function renderLookupCell(row: LookupManageRow, field: string) {
  if (field === 'serviceNames') {
    const names = Array.isArray(row.serviceNames)
      ? row.serviceNames.map((v) => String(v ?? '').trim()).filter(Boolean)
      : String(row.serviceName ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
    if (names.length === 0) return <span className="text-text-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <span
            key={name}
            className="inline-flex max-w-full items-center rounded border border-border bg-elevated px-2 py-0.5 text-xs text-text-secondary"
          >
            <span className="truncate">{name}</span>
          </span>
        ))}
      </div>
    );
  }
  return toDisplay(row[field]);
}

const SETTINGS_LOOKUP_SORT_STORAGE_KEY = 'iae-settings-lookup-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';

function defaultLookupSortBy(lookupKey: string): string {
  return lookupKey === 'company-type-services'
    ? 'companyTypeName'
    : 'name';
}

function loadLookupSortStateForKey(lookupKey: string): { sortBy: string; sortDir: 'asc' | 'desc' } {
  const fallback = { sortBy: defaultLookupSortBy(lookupKey), sortDir: 'asc' as const };
  if (typeof window === 'undefined') return fallback;
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return fallback;
    const raw = localStorage.getItem(SETTINGS_LOOKUP_SORT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, { sortBy?: unknown; sortDir?: unknown }>;
    const entry = parsed?.[lookupKey];
    if (!entry) return fallback;
    const sortBy = typeof entry.sortBy === 'string' && entry.sortBy.trim() ? entry.sortBy.trim() : fallback.sortBy;
    const sortDir = entry.sortDir === 'desc' ? 'desc' : 'asc';
    return { sortBy, sortDir };
  } catch {
    return fallback;
  }
}

function saveLookupSortStateForKey(
  lookupKey: string,
  state: { sortBy: string; sortDir: 'asc' | 'desc' },
) {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
    const raw = localStorage.getItem(SETTINGS_LOOKUP_SORT_STORAGE_KEY);
    const parsed =
      raw && raw.trim()
        ? (JSON.parse(raw) as Record<string, { sortBy?: string; sortDir?: 'asc' | 'desc' }>)
        : {};
    parsed[lookupKey] = state;
    localStorage.setItem(SETTINGS_LOOKUP_SORT_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

function getDirectoryUsersErrorMessage(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : NaN;
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (
    status === 403 ||
    /insufficient|privilege|Authorization_RequestDenied|User\.Read\.All|admin consent/i.test(message)
  ) {
    return 'Unable to read Microsoft Entra users. Please confirm delegated Microsoft Graph permission User.Read.All is granted with admin consent.';
  }

  if (/token|interaction_required|consent_required|login_required|no_account|timed_out/i.test(message)) {
    return 'Unable to acquire Microsoft Graph token. Please sign in again.';
  }

  return 'Could not load the Entra user directory from Microsoft Graph.';
}

type DirectoryDiagnostics = {
  accountUsername: string;
  token?: GraphTokenDiagnostics;
  graphError?: GraphRequestErrorDetail | null;
  userCount?: number;
};

function getDirectoryDiagnosticHint(diagnostics: DirectoryDiagnostics | null): string {
  const token = diagnostics?.token;
  const graphError = diagnostics?.graphError;

  if (!token) {
    return 'No Microsoft Graph token diagnostics are available yet.';
  }
  if (!token.isGraphAudience) {
    return 'The access token audience is not Microsoft Graph. Check VITE_ENTRA_GRAPH_SCOPE and restart the Vite server.';
  }
  if (!token.hasUserReadAll) {
    return 'The token is missing User.Read.All. Add Microsoft Graph > Delegated permission > User.Read.All to this app registration, then grant admin consent.';
  }
  if (graphError?.code === 'Authorization_RequestDenied') {
    return 'The token has the expected Graph scope, so this usually means the signed-in user is a guest or is restricted from reading directory users. Sign in with a member account in this Entra tenant, convert this account to a member user, or grant the signed-in user a directory role such as Directory Readers.';
  }
  if (graphError?.code) {
    return `Microsoft Graph returned ${graphError.code}. Use the request ID below when checking Entra sign-in and Graph audit logs.`;
  }
  return 'The token has the expected Microsoft Graph audience and delegated scope.';
}

type InternalContactSyncDirection = 'entraToEms' | 'emsToEntra';

const SELECTABLE_SYNC_TYPES = new Set<InternalContactSyncActionType>([
  'create',
  'update',
  'remove',
  'disable',
]);

function syncDirectionLabel(direction: InternalContactSyncDirection): string {
  return direction === 'entraToEms' ? 'Entra -> EMS' : 'EMS -> Entra';
}

function syncTypeLabel(type: InternalContactSyncActionType): string {
  switch (type) {
    case 'create':
      return 'Create';
    case 'update':
      return 'Update';
    case 'remove':
      return 'Remove';
    case 'disable':
      return 'Disable';
    case 'upToDate':
      return 'Up to date';
    case 'possibleDuplicate':
      return 'Possible duplicate';
    case 'duplicateConflict':
      return 'Conflict';
    case 'emsOnly':
      return 'EMS only';
    case 'skipped':
      return 'Skipped';
    default:
      return type;
  }
}

function syncTypeBadgeClass(type: InternalContactSyncActionType): string {
  switch (type) {
    case 'create':
      return 'bg-ems-accent-dim text-ems-accent border-ems-accent/30';
    case 'update':
      return 'bg-ems-blue/10 text-ems-blue border-ems-blue/30';
    case 'remove':
    case 'disable':
      return 'bg-ems-coral-dim text-ems-coral border-ems-coral/30';
    case 'possibleDuplicate':
    case 'duplicateConflict':
      return 'bg-ems-amber/15 text-ems-amber border-ems-amber/30';
    case 'emsOnly':
    case 'skipped':
      return 'bg-ems-coral-dim text-ems-coral border-ems-coral/30';
    default:
      return 'bg-elevated text-text-secondary border-border';
  }
}

function syncRowPrimaryName(row: InternalContactSyncRow): string {
  return row.entraName || row.emsName || 'Contact';
}

function renderSyncChange(
  change: InternalContactSyncRow['changes'][number],
  options?: {
    selectable?: boolean;
    selected?: boolean;
    onToggle?: (checked: boolean) => void;
  }
) {
  const isJobTitleWarning = change.reason && change.reason.includes('column has not been added yet');
  const shortReason = isJobTitleWarning ? 'no column' : change.reason;

  return (
    <div key={`${change.field}-${change.to ?? ''}`} className="text-xs text-text-secondary flex flex-wrap items-center gap-1.5 leading-relaxed">
      {options?.selectable && !change.skipped ? (
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-ems-accent cursor-pointer"
          checked={options.selected ?? true}
          onChange={(e) => options.onToggle?.(e.target.checked)}
          aria-label={`Sync ${change.label}`}
        />
      ) : null}
      <span className="font-semibold text-text-primary">{change.label}</span>
      <span className="text-text-muted">{change.skipped ? 'skipped' : '->'}</span>
      <span className="truncate max-w-[200px]" title={change.to || ''}>{change.to || '—'}</span>
      {change.reason && (
        <span
          className="inline-flex items-center rounded bg-ems-amber/10 border border-ems-amber/20 px-1 py-0.2 text-[10px] font-medium text-ems-amber cursor-help"
          title={change.reason}
        >
          {shortReason}
        </span>
      )}
    </div>
  );
}

function SyncPreviewModal({
  open,
  direction,
  loading,
  error,
  preview,
  applying,
  selectedActionIds,
  manualMappings,
  selectedActionFields,
  onToggleAction,
  onManualMappingChange,
  onToggleActionField,
  onToggleAllActions,
  onApply,
  onClose,
}: {
  open: boolean;
  direction: InternalContactSyncDirection;
  loading: boolean;
  error: string | null;
  preview: InternalContactSyncPreview | null;
  applying: boolean;
  selectedActionIds: Set<string>;
  manualMappings: Record<string, string>;
  selectedActionFields: Record<string, Set<string>>;
  onToggleAction: (actionId: string, checked: boolean) => void;
  onManualMappingChange: (actionId: string, contactId: string) => void;
  onToggleActionField: (actionId: string, field: string, checked: boolean, allFields: string[]) => void;
  onToggleAllActions: (actionIds: string[], checked: boolean) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    if (!searchQuery.trim()) return preview.rows;
    const q = searchQuery.toLowerCase();
    return preview.rows.filter(
      (r) =>
        r.entraName?.toLowerCase().includes(q) ||
        r.entraEmail?.toLowerCase().includes(q) ||
        r.emsName?.toLowerCase().includes(q) ||
        r.emsEmail?.toLowerCase().includes(q)
    );
  }, [preview, searchQuery]);

  const handleApplyClick = () => {
    Swal.fire({
      title: 'Confirm Synchronization',
      html: `You are about to apply <b>${applyCount}</b> selected action${applyCount !== 1 ? 's' : ''}.<br/>Are you sure you want to proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Apply',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl border border-border shadow-2xl bg-surface',
        title: 'text-text-primary text-xl font-semibold',
        htmlContainer: 'text-text-secondary text-sm',
        confirmButton: 'bg-ems-accent text-white px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors',
        cancelButton: 'bg-surface border border-border text-text-primary px-4 py-2 rounded-md font-medium hover:bg-hover transition-colors ml-3'
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        onApply();
      }
    });
  };

  if (!open) return null;

  const manualMappingCount = preview
    ? preview.rows.filter((r) => r.type === 'possibleDuplicate' && manualMappings[r.actionId]).length
    : 0;
  const applyCount = selectedActionIds.size + manualMappingCount;

  const countItems: Array<[string, number]> = preview
    ? [
        ['Updates', preview.counts.update],
        ['Creates', preview.counts.create],
        ['Removes', preview.counts.remove],
        ['Disables', preview.counts.disable],
        ['Possible duplicates', preview.counts.possibleDuplicate],
        ['Conflicts', preview.counts.duplicateConflict],
        ['EMS only', preview.counts.emsOnly],
        ['Up to date', preview.counts.upToDate],
        ['Skipped', preview.counts.skipped],
      ]
    : [];

  const titleLabel = direction === 'entraToEms' ? 'Entra → EMS' : 'EMS → Entra';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] flex w-full flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl animate-fade-in"
        style={{ maxWidth: 'min(1280px, 95vw)', maxHeight: 'min(90dvh, calc(100svh - 2rem))' }}
      >
        {/* Full-modal Applying Loader Overlay */}
        {applying && (
          <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-elevated/80 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-ems-accent/20" />
              <Loader2 className="h-8 w-8 animate-spin text-ems-accent" />
            </div>
            <div className="mt-4 text-center px-4">
              <p className="text-sm font-semibold text-text-primary">Applying changes…</p>
              <p className="mt-1 text-xs text-text-muted">Updating contact directories. Please do not close this window.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ems-accent-dim">
              <svg className="h-4 w-4 text-ems-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary truncate">Contact Sync Preview — {titleLabel}</h2>
              {preview && (
                <p className="text-xs text-text-secondary truncate">
                  {direction === 'entraToEms'
                    ? `Entra is the source of truth · ${preview.internalCompany.companyName}`
                    : `EMS is the source of truth · ${preview.internalCompany.companyName}`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-hover hover:text-text-primary transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-ems-accent/20" />
                <Loader2 className="h-8 w-8 animate-spin text-ems-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">Fetching sync preview…</p>
                <p className="mt-1 text-xs text-text-muted">Comparing {titleLabel} contacts. This may take a moment.</p>
              </div>
            </div>
          )}

          {/* Error state (Preview failed) */}
          {!loading && error && !preview && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ems-coral-dim">
                <svg className="h-7 w-7 text-ems-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              </div>
              <div className="text-center max-w-md">
                <p className="text-sm font-semibold text-text-primary">Preview failed</p>
                <p className="mt-1 text-xs text-ems-coral leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Data state */}
          {!loading && preview && (
            <>
              {/* Apply Error Banner */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-ems-coral/30 bg-ems-coral/10 px-4 py-3 shadow-sm animate-in slide-in-from-top-2">
                  <svg className="h-5 w-5 shrink-0 mt-0.5 text-ems-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <div>
                    <h3 className="text-sm font-semibold text-ems-coral">Sync Application Failed</h3>
                    <p className="mt-1 text-xs text-ems-coral/90 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {preview.warnings.map((w) => (
                <div key={w} className="flex items-start gap-2.5 rounded-lg border border-ems-amber/30 bg-ems-amber/10 px-3 py-2.5">
                  <svg className="h-4 w-4 shrink-0 mt-0.5 text-ems-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  <p className="text-xs text-ems-amber leading-relaxed">{w}</p>
                </div>
              ))}

              {/* Count chips */}
              <div className="flex flex-wrap gap-2">
                {countItems.filter(([, v]) => v > 0).map(([label, value]) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
                    <span className="text-base font-bold text-text-primary tabular-nums">{value}</span>
                    <span className="text-text-muted">{label}</span>
                  </span>
                ))}
                {countItems.every(([, v]) => v === 0) && (
                  <div className="flex items-center gap-2 rounded-lg border border-ems-green/30 bg-ems-green/10 px-3 py-2">
                    <svg className="h-4 w-4 text-ems-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <p className="text-xs font-medium text-ems-green">Everything is in sync — no changes needed.</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              {preview.rows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      className="w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-ems-accent focus:outline-none placeholder:text-text-muted"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded bg-ems-accent/10 px-3 py-1.5 text-xs font-semibold text-ems-accent hover:bg-ems-accent/20 transition-colors"
                      onClick={() => {
                        const selectableActionIds = filteredRows.filter(r => SELECTABLE_SYNC_TYPES.has(r.type)).map(r => r.actionId);
                        onToggleAllActions(selectableActionIds, true);
                      }}
                    >
                      Check All
                    </button>
                    <button
                      type="button"
                      className="rounded bg-border/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border/70 transition-colors"
                      onClick={() => {
                        const selectableActionIds = filteredRows.filter(r => SELECTABLE_SYNC_TYPES.has(r.type)).map(r => r.actionId);
                        onToggleAllActions(selectableActionIds, false);
                      }}
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {filteredRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[1100px] text-sm table-fixed">
                    <colgroup>
                      <col className="w-[50px]" />
                      <col className="w-[120px]" />
                      <col className="w-[210px]" />
                      <col className="w-[210px]" />
                      <col className="w-[310px]" />
                      <col className="w-[200px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-surface text-xs text-text-muted">
                        <th className="px-3 py-2.5 text-left">Apply</th>
                        <th className="px-3 py-2.5 text-left">Action</th>
                        <th className="px-3 py-2.5 text-left">Entra</th>
                        <th className="px-3 py-2.5 text-left">EMS</th>
                        <th className="px-3 py-2.5 text-left">Changes</th>
                        <th className="px-3 py-2.5 text-left">Duplicate match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const selectable = SELECTABLE_SYNC_TYPES.has(row.type);
                        const selected = selectedActionIds.has(row.actionId);
                        return (
                          <tr
                            key={row.actionId}
                            className={`border-b border-border/60 align-top transition-colors ${
                              selected ? 'bg-ems-accent-dim/30' : 'hover:bg-hover/50'
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              {selectable ? (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-ems-accent cursor-pointer"
                                  checked={selected}
                                  onChange={(e) => onToggleAction(row.actionId, e.target.checked)}
                                  aria-label={`Apply ${syncRowPrimaryName(row)}`}
                                />
                              ) : (
                                <span className="text-xs text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${syncTypeBadgeClass(row.type)}`}>
                                  {syncTypeLabel(row.type)}
                                </span>
                                {row.reason && (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-ems-accent/30 rounded p-0.5"
                                        >
                                          <Info className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-normal bg-popover text-popover-foreground border border-border p-2.5 shadow-lg rounded-md">
                                        {row.reason}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text-primary">{row.entraName || '—'}</div>
                              <div className="text-xs text-text-secondary">{row.entraEmail || '—'}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text-primary">{row.emsName || '—'}</div>
                              <div className="text-xs text-text-secondary">{row.emsEmail || '—'}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              {row.changes.length > 0 ? (
                                <div className="space-y-1">
                                  {row.changes.map((change) => renderSyncChange(change, {
                                    selectable: row.type === 'update',
                                    selected: selectedActionFields[row.actionId] ? selectedActionFields[row.actionId].has(change.field) : true,
                                    onToggle: (checked) => onToggleActionField(row.actionId, change.field, checked, row.changes.map(c => c.field))
                                  }))}
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted">No field changes</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {row.type === 'possibleDuplicate' && row.candidateContacts?.length ? (
                                <div className="relative w-full min-w-[200px] max-w-[280px]">
                                  <select
                                    className="w-full appearance-none rounded-md border border-border bg-card py-1.5 pl-2.5 pr-8 text-xs text-text-primary transition-all duration-150 hover:bg-hover hover:border-ems-accent/50 focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/20 cursor-pointer shadow-sm bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_0.6rem_center] bg-no-repeat"
                                    value={manualMappings[row.actionId] ?? ''}
                                    onChange={(e) => onManualMappingChange(row.actionId, e.target.value)}
                                  >
                                    <option value="">
                                      {direction === 'entraToEms' ? 'Choose EMS contact...' : 'Choose Entra user...'}
                                    </option>
                                    {row.candidateContacts.map((c) => {
                                      const val = String(c.contactId ?? c.entraUserId ?? '');
                                      return (
                                        <option key={val} value={val}>
                                          {c.name} {c.email ? `(${c.email})` : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : preview.rows.length > 0 ? (
                <div className="py-8 text-center text-sm text-text-muted border border-dashed border-border rounded-lg">
                  No contacts match your search "{searchQuery}".
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && preview && (
          <div className="shrink-0 border-t border-border bg-elevated px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              {applyCount} action{applyCount !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleApplyClick}
                disabled={applying || applyCount === 0}
              >
                {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {applying ? 'Applying…' : `Apply selected (${applyCount})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InternalContactSyncPreviewPanel({
  direction,
  preview,
  selectedActionIds,
  manualMappings,
  applying,
  selectedActionFields,
  onToggleAction,
  onManualMappingChange,
  onToggleActionField,
  onToggleAllActions,
  onApply,
}: {
  direction: InternalContactSyncDirection;
  preview: InternalContactSyncPreview;
  selectedActionIds: Set<string>;
  manualMappings: Record<string, string>;
  selectedActionFields: Record<string, Set<string>>;
  applying: boolean;
  onToggleAction: (actionId: string, checked: boolean) => void;
  onManualMappingChange: (actionId: string, contactId: string) => void;
  onToggleActionField: (actionId: string, field: string, checked: boolean, allFields: string[]) => void;
  onToggleAllActions: (actionIds: string[], checked: boolean) => void;
  onApply: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    if (!searchQuery.trim()) return preview.rows;
    const q = searchQuery.toLowerCase();
    return preview.rows.filter(
      (r) =>
        r.entraName?.toLowerCase().includes(q) ||
        r.entraEmail?.toLowerCase().includes(q) ||
        r.emsName?.toLowerCase().includes(q) ||
        r.emsEmail?.toLowerCase().includes(q)
    );
  }, [preview, searchQuery]);
  const manualMappingCount = preview.rows.filter(
    (row) => row.type === 'possibleDuplicate' && manualMappings[row.actionId],
  ).length;
  const applyCount = selectedActionIds.size + manualMappingCount;
  const countItems: Array<[string, number]> = [
    ['Updates', preview.counts.update],
    ['Creates', preview.counts.create],
    ['Removes', preview.counts.remove],
    ['Disables', preview.counts.disable],
    ['Possible duplicates', preview.counts.possibleDuplicate],
    ['Conflicts', preview.counts.duplicateConflict],
    ['EMS only', preview.counts.emsOnly],
    ['Up to date', preview.counts.upToDate],
    ['Skipped', preview.counts.skipped],
  ];

  const handleApplyClick = () => {
    Swal.fire({
      title: 'Confirm Synchronization',
      html: `You are about to apply <b>${applyCount}</b> selected action${applyCount !== 1 ? 's' : ''}.<br/>Are you sure you want to proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Apply',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl border border-border shadow-2xl bg-surface',
        title: 'text-text-primary text-xl font-semibold',
        htmlContainer: 'text-text-secondary text-sm',
        confirmButton: 'bg-ems-accent text-white px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors',
        cancelButton: 'bg-surface border border-border text-text-primary px-4 py-2 rounded-md font-medium hover:bg-hover transition-colors ml-3'
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        onApply();
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {syncDirectionLabel(direction)} preview for {preview.internalCompany.companyName}
          </p>
          <p className="text-xs text-text-secondary">
            {direction === 'entraToEms'
              ? 'Entra is the source of truth. Selected remove rows are removed from this internal company.'
              : 'EMS is the source of truth. Selected disable rows disable unmatched active Entra accounts.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleApplyClick} disabled={applying || applyCount === 0}>
          {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply selected ({applyCount})
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {countItems.map(([label, value]) => (
          <span key={label} className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary">
            <span className="font-medium text-text-primary">{value}</span> {label}
          </span>
        ))}
      </div>

      {preview.warnings.map((warning) => (
        <div key={warning} className="rounded-md border border-ems-amber/30 bg-ems-amber/10 px-3 py-2 text-xs text-ems-amber">
          {warning}
        </div>
      ))}

      {preview.rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-border/60">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search name or email..."
              className="w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-ems-accent focus:outline-none placeholder:text-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-ems-accent/10 px-3 py-1.5 text-xs font-semibold text-ems-accent hover:bg-ems-accent/20 transition-colors"
              onClick={() => {
                const selectableActionIds = filteredRows.filter(r => SELECTABLE_SYNC_TYPES.has(r.type)).map(r => r.actionId);
                onToggleAllActions(selectableActionIds, true);
              }}
            >
              Check All
            </button>
            <button
              type="button"
              className="rounded bg-border/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border/70 transition-colors"
              onClick={() => {
                const selectableActionIds = filteredRows.filter(r => SELECTABLE_SYNC_TYPES.has(r.type)).map(r => r.actionId);
                onToggleAllActions(selectableActionIds, false);
              }}
            >
              Uncheck All
            </button>
          </div>
        </div>
      )}

      {filteredRows.length > 0 ? (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs text-text-muted">
                <th className="w-16 px-3 py-2 text-left">Apply</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Entra</th>
                <th className="px-3 py-2 text-left">EMS</th>
                <th className="px-3 py-2 text-left">Changes</th>
                <th className="px-3 py-2 text-left">Duplicate match</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
              const selectable = SELECTABLE_SYNC_TYPES.has(row.type);
              const selected = selectedActionIds.has(row.actionId);
              return (
                <tr key={row.actionId} className="border-b border-border/60 align-top">
                  <td className="px-3 py-2">
                    {selectable ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-ems-accent"
                        checked={selected}
                        onChange={(event) => onToggleAction(row.actionId, event.target.checked)}
                        aria-label={`Apply ${syncRowPrimaryName(row)}`}
                      />
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${syncTypeBadgeClass(row.type)}`}>
                      {syncTypeLabel(row.type)}
                    </span>
                    <p className="mt-1 max-w-[220px] text-xs text-text-muted">{row.reason}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-text-primary">{row.entraName || '—'}</div>
                    <div className="text-xs text-text-secondary">{row.entraEmail || '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-text-primary">{row.emsName || '—'}</div>
                    <div className="text-xs text-text-secondary">{row.emsEmail || '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    {row.changes.length > 0 ? (
                      <div className="space-y-1">
                        {row.changes.map((change) => renderSyncChange(change, {
                          selectable: row.type === 'update',
                          selected: selectedActionFields[row.actionId] ? selectedActionFields[row.actionId].has(change.field) : true,
                          onToggle: (checked) => onToggleActionField(row.actionId, change.field, checked, row.changes.map(c => c.field))
                        }))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">No field changes</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.type === 'possibleDuplicate' && row.candidateContacts?.length ? (
                      <select
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                        value={manualMappings[row.actionId] ?? ''}
                        onChange={(event) => onManualMappingChange(row.actionId, event.target.value)}
                      >
                        <option value="">
                          {direction === 'entraToEms' ? 'Choose EMS contact...' : 'Choose Entra user...'}
                        </option>
                        {row.candidateContacts.map((candidate) => {
                          const value = String(candidate.contactId ?? candidate.entraUserId ?? '');
                          return (
                            <option key={value} value={value}>
                              {candidate.name} {candidate.email ? `(${candidate.email})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : preview.rows.length > 0 ? (
        <div className="py-8 text-center text-sm text-text-muted border border-dashed border-border rounded-lg">
          No contacts match your search "{searchQuery}".
        </div>
      ) : null}
    </div>
  );
}

export function SettingsPage({
  addToast,
  users,
  onUpdateUsers,
  initialMainTab = 'Users',
}: Props) {
  const { instance, accounts } = useMsal();
  const account = getActiveAccount() ?? accounts[0] ?? null;
  const qc = useQueryClient();
  const [tab, setTab] = useState<'Users' | 'Lookup Tables' | 'System'>(initialMainTab);
  const [lookupTab, setLookupTab] = useState(LOOKUP_TABLES[0].label);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Booker');
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const [lookupSearchInput, setLookupSearchInput] = useState('');
  const [lookupSearch, setLookupSearch] = useState('');
  const [showLookupSuggestions, setShowLookupSuggestions] = useState(false);
  const lookupSearchWrapperRef = useRef<HTMLDivElement>(null);
  const [lookupPage, setLookupPage] = useState(1);
  const [lookupPageSize, setLookupPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [lookupSort, setLookupSort] = useState<{ sortBy: string; sortDir: 'asc' | 'desc' }>({
    sortBy: 'name',
    sortDir: 'asc',
  });
  const [showAddLookup, setShowAddLookup] = useState(false);
  const [editLookupRow, setEditLookupRow] = useState<LookupManageRow | null>(null);
  const [deleteLookupRow, setDeleteLookupRow] = useState<LookupManageRow | null>(null);
  const [selectedLookupRow, setSelectedLookupRow] = useState<LookupManageRow | null>(null);
  const [detailsTab, setDetailsTab] = useState('Overview');
  const [directoryPermissionBusy, setDirectoryPermissionBusy] = useState(false);
  const [directoryPermissionError, setDirectoryPermissionError] = useState<string | null>(null);
  const [directoryDiagnostics, setDirectoryDiagnostics] = useState<DirectoryDiagnostics | null>(null);
  const [internalSyncPreview, setInternalSyncPreview] =
    useState<InternalContactSyncPreview | null>(null);
  const [internalSyncDirection, setInternalSyncDirection] =
    useState<InternalContactSyncDirection>('entraToEms');
  const [internalSyncResult, setInternalSyncResult] =
    useState<InternalContactSyncApplyResult | null>(null);
  const [internalSyncBusy, setInternalSyncBusy] = useState(false);
  const [internalSyncApplying, setInternalSyncApplying] = useState(false);
  const [internalSyncError, setInternalSyncError] = useState<string | null>(null);
  const [selectedInternalSyncActions, setSelectedInternalSyncActions] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedInternalSyncFields, setSelectedInternalSyncFields] = useState<Record<string, Set<string>>>({});
  const [internalSyncMappings, setInternalSyncMappings] = useState<Record<string, string>>({});
  const [syncPreviewModalOpen, setSyncPreviewModalOpen] = useState(false);

  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const adminUsersQuery = useQuery({
    queryKey: ['admin-users', account?.homeAccountId ?? null],
    enabled: tab === 'Users' && account != null,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!account) {
        throw new Error('Sign in with Microsoft Entra ID to load the user directory.');
      }
      const baseDiagnostics: DirectoryDiagnostics = {
        accountUsername: account.username,
      };
      let graphAccessToken: string;
      try {
        graphAccessToken = await acquireGraphAccessToken(account);
      } catch (error) {
        try {
          await instance.acquireTokenRedirect({
            account,
            scopes: ["https://graph.microsoft.com/User.Read.All"],
          });
          return new Promise<never>(() => {});
        } catch {
          // ignore synchronous redirect errors and fallback to UI
        }
        
        setDirectoryDiagnostics(baseDiagnostics);
        const tokenError = new Error('Unable to acquire Microsoft Graph token. Please sign in again.') as Error & {
          cause?: unknown;
        };
        tokenError.cause = error;
        throw tokenError;
      }
      const diagnostics = {
        ...baseDiagnostics,
        token: describeGraphAccessToken(graphAccessToken),
      };
      setDirectoryDiagnostics(diagnostics);

      try {
        const rows = await fetchAdminUsers(graphAccessToken);
        setDirectoryDiagnostics({ ...diagnostics, userCount: rows.length });
        return rows;
      } catch (error) {
        setDirectoryDiagnostics({
          ...diagnostics,
          graphError: getGraphRequestErrorDetail(error),
        });
        throw error;
      }
    },
  });

  useEffect(() => {
    setDirectoryPermissionError(null);
    setDirectoryDiagnostics(null);
  }, [account?.homeAccountId]);

  async function handleConnectDirectory() {
    if (!account) return;

    setDirectoryPermissionBusy(true);
    setDirectoryPermissionError(null);
    try {
      await requestGraphAccessToken(account, { forceRefresh: true });
      await qc.invalidateQueries({
        queryKey: ['admin-users', account.homeAccountId ?? null],
      });
    } catch (error) {
      setDirectoryPermissionError(
        friendlyApiError(
          error,
          'Could not connect to Microsoft Graph. Please accept the directory permission prompt and try again.',
        ),
      );
    } finally {
      setDirectoryPermissionBusy(false);
    }
  }

  async function handlePreviewInternalContactSync(direction: InternalContactSyncDirection) {
    if (!account) return;

    setInternalSyncDirection(direction);
    setInternalSyncBusy(true);
    setInternalSyncError(null);
    setInternalSyncResult(null);
    setInternalSyncPreview(null);
    setSelectedInternalSyncActions(new Set());
    setInternalSyncMappings({});
    setSyncPreviewModalOpen(true);
    try {
      await requestGraphAccessToken(account);
      const preview =
        direction === 'entraToEms'
          ? await previewEntraToEmsContactSync()
          : await previewEmsToEntraContactSync();
      setInternalSyncPreview(preview);
      setSelectedInternalSyncActions(
        new Set(
          preview.rows
            .filter((row) => SELECTABLE_SYNC_TYPES.has(row.type))
            .map((row) => row.actionId),
        ),
      );
    } catch (error) {
      setInternalSyncError(
        friendlyApiError(error, 'Could not preview the internal contact sync.'),
      );
    } finally {
      setInternalSyncBusy(false);
    }
  }

  function toggleInternalSyncAction(actionId: string, checked: boolean) {
    setSelectedInternalSyncActions((previous) => {
      const next = new Set(previous);
      if (checked) next.add(actionId);
      else next.delete(actionId);
      return next;
    });
  }

  function toggleAllInternalSyncActions(actionIds: string[], checked: boolean) {
    setSelectedInternalSyncActions((previous) => {
      const next = new Set(previous);
      for (const id of actionIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function updateInternalSyncMapping(actionId: string, contactId: string) {
    setInternalSyncMappings((previous) => {
      const next = { ...previous };
      if (contactId) next[actionId] = contactId;
      else delete next[actionId];
      return next;
    });
  }

  const toggleInternalSyncActionField = (actionId: string, field: string, checked: boolean, allFields: string[]) => {
    setSelectedInternalSyncFields((prev) => {
      const next = { ...prev };
      const currentFields = prev[actionId] ? new Set(prev[actionId]) : new Set(allFields);
      if (checked) {
        currentFields.add(field);
      } else {
        currentFields.delete(field);
      }
      next[actionId] = currentFields;
      return next;
    });
  };

  async function handleApplyInternalContactSync() {
    if (!account || !internalSyncPreview) return;

    const manualMappings = internalSyncPreview.rows
      .filter((row) => row.type === 'possibleDuplicate' && row.entraUserId)
      .map((row) => ({
        entraUserId: row.entraUserId ?? undefined,
        contactId: Number(internalSyncMappings[row.actionId]),
      }))
      .filter((mapping) => mapping.entraUserId && Number.isFinite(mapping.contactId));
    const emsToEntraManualMappings = internalSyncPreview.rows
      .filter((row) => row.type === 'possibleDuplicate' && row.contactId)
      .map((row) => ({
        contactId: row.contactId,
        targetEntraUserId: internalSyncMappings[row.actionId],
      }))
      .filter((mapping) => mapping.contactId && mapping.targetEntraUserId);

    setInternalSyncApplying(true);
    setInternalSyncError(null);
    try {
      const serializableFields: Record<string, string[]> = {};
      for (const [actionId, fieldSet] of Object.entries(selectedInternalSyncFields)) {
        serializableFields[actionId] = Array.from(fieldSet);
      }

      await requestGraphAccessToken(account);
      const result =
        internalSyncDirection === 'entraToEms'
          ? await applyEntraToEmsContactSync({
              selectedActionIds: Array.from(selectedInternalSyncActions),
              manualMappings,
              selectedActionFields: serializableFields,
            })
          : await applyEmsToEntraContactSync({
              selectedActionIds: Array.from(selectedInternalSyncActions),
              manualMappings: emsToEntraManualMappings,
              selectedActionFields: serializableFields,
            });
      addToast(
        `Internal contact sync complete: ${result.created} created, ${result.updated} updated, ${result.removed} removed, ${result.disabled} disabled.`,
        'success',
      );
      if (result.skippedJobTitleWrites > 0) {
        addToast(
          `${result.skippedJobTitleWrites} job title value(s) were skipped because ContactInfo.JobTitle is not added yet.`,
          'warning',
        );
      }
      if (result.errors.length > 0) {
        addToast(result.errors.join(' '), 'warning');
      }
      setInternalSyncPreview(null);
      setInternalSyncResult(result);
      setSelectedInternalSyncActions(new Set());
      setInternalSyncMappings({});
      setSyncPreviewModalOpen(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-users', account.homeAccountId ?? null] }),
        qc.invalidateQueries({ queryKey: ['companies'] }),
        qc.invalidateQueries({ queryKey: ['lookups'] }),
      ]);
    } catch (error) {
      setInternalSyncError(
        friendlyApiError(error, 'Could not apply the internal contact sync.'),
      );
    } finally {
      setInternalSyncApplying(false);
    }
  }

  useEffect(() => {
    setTab(initialMainTab);
  }, [initialMainTab]);

  const activeLookupConfig =
    LOOKUP_TABLES.find((tableDef) => tableDef.label === lookupTab) ?? LOOKUP_TABLES[0];
  const activeLookupKey = activeLookupConfig.key;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        lookupSearchWrapperRef.current &&
        !lookupSearchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowLookupSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLookupPage(1);
  }, [lookupSearch, lookupPageSize, activeLookupKey]);

  useEffect(() => {
    setSelectedLookupRow(null);
    setDetailsTab('Overview');
    // Reset search box + committed filter + suggestions on tab change (match Companies UX expectations)
    setLookupSearchInput('');
    setLookupSearch('');
    setShowLookupSuggestions(false);
    setLookupSort(loadLookupSortStateForKey(activeLookupKey));
  }, [activeLookupKey]);

  useEffect(() => {
    saveLookupSortStateForKey(activeLookupKey, lookupSort);
  }, [activeLookupKey, lookupSort]);

  const { offset, limit } = getPageParams(lookupPage, lookupPageSize);

  const lookupListOpts = useMemo(
    () => ({
      q: lookupSearch,
      sortBy: lookupSort.sortBy,
      sortDir: lookupSort.sortDir,
    }),
    [lookupSearch, lookupSort.sortBy, lookupSort.sortDir],
  );

  const lookupListQueryKey = useMemo(
    () => lookupManageListQueryKey(activeLookupKey, offset, limit, lookupListOpts),
    [activeLookupKey, offset, limit, lookupListOpts],
  );

  const lookupListQueryKeySerialized = useMemo(
    () => JSON.stringify(lookupListQueryKey),
    [lookupListQueryKey],
  );

  const [lookupListSettledKey, setLookupListSettledKey] = useState<string | null>(null);

  const lookupListQuery = useQuery<LookupManageListResponse>({
    queryKey: lookupListQueryKey,
    queryFn: () =>
      fetchLookupManageRows(activeLookupKey, offset, limit, {
        q: lookupSearch || undefined,
        sortBy: lookupSort.sortBy,
        sortDir: lookupSort.sortDir,
      }),
    enabled: tab === 'Lookup Tables',
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: LookupManageListResponse | undefined, previousQuery: unknown) => {
      if (!previousData) return undefined;
      const query = previousQuery as { queryKey?: unknown[] } | undefined;
      const prevTable = query?.queryKey?.[1];
      if (prevTable !== activeLookupKey) return undefined;
      return previousData;
    },
  });

  useEffect(() => {
    if (tab !== 'Lookup Tables') {
      setLookupListSettledKey(null);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'Lookup Tables') return;
    if (lookupListQuery.isError) {
      setLookupListSettledKey(lookupListQueryKeySerialized);
      return;
    }
    if (lookupListQuery.fetchStatus === 'idle' && lookupListQuery.isFetched) {
      setLookupListSettledKey(lookupListQueryKeySerialized);
    }
  }, [
    tab,
    lookupListQueryKeySerialized,
    lookupListQuery.isError,
    lookupListQuery.fetchStatus,
    lookupListQuery.isFetched,
    lookupListQuery.dataUpdatedAt,
  ]);

  const suggestionSortBy =
    activeLookupKey === 'company-type-services'
      ? 'companyTypeName'
      : activeLookupKey === 'dmas'
        ? 'name'
        : 'name';
  const lookupSuggestionsQuery = useQuery({
    queryKey: [
      'lookup-manage',
      activeLookupKey,
      'suggestions',
      lookupSearchInput.trim(),
      suggestionSortBy,
    ] as const,
    queryFn: () =>
      fetchLookupManageRows(activeLookupKey, 0, 20, {
        q: lookupSearchInput.trim(),
        sortBy: suggestionSortBy,
        sortDir: 'asc',
      }),
    enabled:
      tab === 'Lookup Tables' &&
      showLookupSuggestions &&
      lookupSearchInput.trim().length >= 1,
    staleTime: 60 * 1000,
  });

  const lookupSuggestions = useMemo(() => {
    const q = lookupSearchInput.trim();
    if (!q) return [];
    const rows = lookupSuggestionsQuery.data?.data ?? [];
    const values =
      activeLookupKey === 'company-type-services'
          ? rows.flatMap((row) => {
              const typeName = String(row.companyTypeName ?? '').trim();
              const serviceNames = Array.isArray(row.serviceNames)
                ? row.serviceNames.map((value) => String(value ?? '').trim()).filter(Boolean)
                : String(row.serviceName ?? '')
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean);
              return [typeName, ...serviceNames].filter(Boolean);
            })
        : rows.map((row) => String(row[activeLookupConfig.nameField ?? activeLookupConfig.idField] ?? '').trim());
    const deduped: string[] = [];
    for (const v of values) {
      if (!v) continue;
      if (!deduped.some((d) => d.toLowerCase() === v.toLowerCase())) {
        deduped.push(v);
      }
    }
    return deduped
      .filter((value) => richTextMatches([value], q))
      .slice(0, 8);
  }, [
    lookupSearchInput,
    lookupSuggestionsQuery.data,
    activeLookupKey,
    activeLookupConfig.nameField,
    activeLookupConfig.idField,
  ]);

  const lookupSuggestPanelOpen =
    showLookupSuggestions &&
    lookupSearchInput.trim().length >= 1 &&
    (lookupSuggestionsQuery.isFetching ||
      lookupSuggestions.length > 0 ||
      lookupSuggestionsQuery.isFetched);

  const commitLookupSearch = useCallback(() => {
    setLookupSearch(lookupSearchInput.trim());
    setShowLookupSuggestions(false);
  }, [lookupSearchInput]);

  const hasActiveLookupFilters =
    lookupSearchInput.trim().length > 0 || lookupSearch.trim().length > 0;

  const resetLookupFilters = useCallback(() => {
    setLookupSearchInput('');
    setLookupSearch('');
    setShowLookupSuggestions(false);
    setLookupPage(1);
  }, []);

  const lookupDepsQuery = useQuery({
    queryKey: ['lookup-manage', 'dependencies'],
    queryFn: async () => {
      const [companies, lookups] = await Promise.all([
        fetchCompaniesPickerRows(),
        fetchLookups(),
      ]);
      return {
        companies,
        companyTypes: lookups.companyTypes,
        services: lookups.servicesProvided,
      };
    },
    enabled: tab === 'Lookup Tables',
    staleTime: 30 * 60 * 1000,
  });

  const companyOptions = useMemo<Select2Option[]>(
    () => companyToSelect2Options(lookupDepsQuery.data?.companies ?? []),
    [lookupDepsQuery.data?.companies],
  );

  const serviceOptions = useMemo<Select2Option[]>(
    () =>
      (lookupDepsQuery.data?.services ?? []).map((service) => ({
        value: String(service.serviceProvidedId),
        label: service.serviceName,
      })),
    [lookupDepsQuery.data?.services],
  );

  const companyTypeOptions = useMemo<Select2Option[]>(
    () =>
      (lookupDepsQuery.data?.companyTypes ?? []).map((companyType) => ({
        value: String(companyType.companyTypeId),
        label: companyType.companyTypeName,
      })),
    [lookupDepsQuery.data?.companyTypes],
  );

  const upsertLookupMut = useMutation({
    mutationFn: async (args: {
      mode: 'create' | 'update';
      id?: number;
      body: LookupManageCreatePayload | LookupManageUpdatePayload;
    }) => {
      if (args.mode === 'create') {
        return createLookupManageRow(activeLookupKey, args.body);
      }
      return updateLookupManageRow(activeLookupKey, Number(args.id), args.body);
    },
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['lookup-manage', activeLookupKey], exact: false });
      void qc.invalidateQueries({ queryKey: ['lookups'], exact: false });
      if (activeLookupKey === 'dmas') {
        const row = created as LookupManageRow;
        const normalized = normalizeDmaMarketRows([
          {
            dmaid: Number(row.dmaid),
            marketName: String(row.marketName ?? ''),
            postalCode: String(row.postalCode ?? ''),
          } as ApiDmaMarket,
        ]);
        if (normalized.length > 0) {
          patchWizardDmaMarketsCache(qc, normalized[0]);
        }
        /** Do not invalidate project-wizard cache — patch is enough; refetch can drop app-created rows until paginated load completes. */
        invalidateDmaMarketsQueries(qc);
      }
    },
  });

  const deleteLookupMut = useMutation({
    mutationFn: (id: number) => deleteLookupManageRow(activeLookupKey, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lookup-manage', activeLookupKey], exact: false });
      void qc.invalidateQueries({ queryKey: ['lookups'], exact: false });
      if (activeLookupKey === 'dmas') {
        invalidateDmaMarketsQueries(qc);
      }
    },
  });

  const lookupRows = lookupListQuery.data?.data ?? [];
  const lookupDisplayRows = useMemo(() => {
    const cols = activeLookupConfig.columns ?? [];
    if (cols.length === 0) return [];
    return (lookupRows ?? []).filter((row) => {
      // Only show rows that have at least one non-empty visible cell.
      return cols.some((c) => {
        const v = (row as Record<string, unknown>)[c.field];
        if (v == null) return false;
        const s = String(v).trim();
        return s.length > 0 && s !== '—';
      });
    });
  }, [lookupRows, activeLookupConfig.columns]);
  const lookupTotal = lookupListQuery.data?.total ?? 0;
  const lookupPageCount = getTotalPages(lookupTotal, lookupPageSize);
  const pageClamped = Math.min(lookupPage, lookupPageCount);
  const { rangeStart, rangeEnd } = getPageRange(pageClamped, lookupTotal, lookupPageSize);
  const lookupListAwaitingSettledFetch =
    tab === 'Lookup Tables' && lookupListSettledKey !== lookupListQueryKeySerialized;
  const lookupIsLoading =
    lookupListAwaitingSettledFetch ||
    lookupListQuery.isPending ||
    (lookupListQuery.isFetching && !lookupListQuery.data);
  const lookupTableBusyOverlay =
    tab === 'Lookup Tables' &&
    !lookupListQuery.isError &&
    (lookupListAwaitingSettledFetch ||
      lookupListQuery.isPlaceholderData ||
      (lookupListQuery.data === undefined &&
        (lookupListQuery.isPending || lookupListQuery.isFetching)));

  const toggleSort = (sortBy: string) => {
    setLookupSort((prev) => {
      if (prev.sortBy === sortBy) {
        return { sortBy, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' };
      }
      return { sortBy, sortDir: 'asc' };
    });
  };

  const confirmDeleteLookup = async () => {
    if (!deleteLookupRow) return;
    const id = getRowId(deleteLookupRow, activeLookupConfig);
    try {
      await deleteLookupMut.mutateAsync(id);
      addToast(`${activeLookupConfig.label} row deleted.`, 'warning');
      setDeleteLookupRow(null);
      if (selectedLookupRow && getRowId(selectedLookupRow, activeLookupConfig) === id) {
        setSelectedLookupRow(null);
      }
    } catch (error) {
      addToast(friendlyApiError(error, 'Could not delete this row.'), 'error');
    }
  };

  const selectedLookupId =
    selectedLookupRow != null ? getRowId(selectedLookupRow, activeLookupConfig) : null;
  const selectedLookupTitle =
    selectedLookupRow == null
      ? ''
      : activeLookupKey === 'company-type-services'
        ? String(selectedLookupRow.companyTypeName ?? '').trim() || 'Company type'
        : String(
          selectedLookupRow[activeLookupConfig.nameField ?? activeLookupConfig.idField] ?? '',
        ).trim() || `${activeLookupConfig.label} #${selectedLookupId ?? ''}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
      <TabBar
        tabs={['Users', 'Lookup Tables', 'System']}
        active={tab}
        onChange={(t) => {
          if (t === 'Users' || t === 'Lookup Tables' || t === 'System') {
            setTab(t);
          }
        }}
      />

      {tab === 'Users' && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Microsoft Entra user directory</h3>
              <p className="mt-1 text-sm text-text-secondary">
                This table is loaded directly from Microsoft Graph using your signed-in Entra account.
              </p>
            </div>

            {adminUsersQuery.isPending ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-ems-accent" />
                Loading Entra users...
              </div>
            ) : null}

            {adminUsersQuery.isError ? (
              <div className="space-y-2">
                <div className="rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">
                  {friendlyApiError(
                    adminUsersQuery.error,
                    getDirectoryUsersErrorMessage(adminUsersQuery.error),
                  )}
                </div>
                {account ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                    <p className="text-sm text-text-secondary">
                      Connect Microsoft Graph once to load directory users from your signed-in account.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleConnectDirectory}
                      disabled={directoryPermissionBusy}
                    >
                      {directoryPermissionBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Connect directory
                    </Button>
                  </div>
                ) : null}
                {directoryPermissionError ? (
                  <div className="rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">
                    {directoryPermissionError}
                  </div>
                ) : null}
                {directoryDiagnostics ? (
                  <div className="rounded-md border border-border bg-elevated px-3 py-3 text-xs text-text-secondary">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-text-primary">Microsoft Graph diagnostics</p>
                      {directoryDiagnostics.userCount != null ? (
                        <span className="text-text-muted">{directoryDiagnostics.userCount} users returned</span>
                      ) : null}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <span className="text-text-muted">Account</span>
                        <div className="break-all font-mono text-text-secondary">
                          {directoryDiagnostics.accountUsername || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-text-muted">Token audience</span>
                        <div className="break-all font-mono text-text-secondary">
                          {directoryDiagnostics.token?.aud || '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-text-muted">Graph audience</span>
                        <div className="font-mono text-text-secondary">
                          {directoryDiagnostics.token?.isGraphAudience ? 'yes' : 'no'}
                        </div>
                      </div>
                      <div>
                        <span className="text-text-muted">Has User.Read.All</span>
                        <div className="font-mono text-text-secondary">
                          {directoryDiagnostics.token?.hasUserReadAll ? 'yes' : 'no'}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-text-muted">Delegated scopes</span>
                        <div className="break-all font-mono text-text-secondary">
                          {directoryDiagnostics.token?.scp || '—'}
                        </div>
                      </div>
                      {directoryDiagnostics.graphError ? (
                        <>
                          <div>
                            <span className="text-text-muted">Graph error</span>
                            <div className="break-all font-mono text-text-secondary">
                              {directoryDiagnostics.graphError.code || '—'}
                            </div>
                          </div>
                          <div>
                            <span className="text-text-muted">Graph request ID</span>
                            <div className="break-all font-mono text-text-secondary">
                              {directoryDiagnostics.graphError.requestId || '—'}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-text-muted">Graph message</span>
                            <div className="break-all text-text-secondary">
                              {directoryDiagnostics.graphError.message || '—'}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-3 rounded border border-border bg-surface px-2 py-2 text-text-secondary">
                      {getDirectoryDiagnosticHint(directoryDiagnostics)}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {account ? (
              <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
	                  <div>
	                    <p className="text-sm font-semibold text-text-primary">
	                      Manual EMS internal contact sync
	                    </p>
	                    <p className="text-xs text-text-secondary">
	                      Choose the source of truth, preview changes, then manually apply selected rows.
	                    </p>
	                  </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewInternalContactSync('entraToEms')}
                        disabled={internalSyncBusy || internalSyncApplying}
                      >
                        {internalSyncBusy && internalSyncDirection === 'entraToEms' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Preview Entra {'->'} EMS
                      </Button>
                    </div>
	                </div>

                {internalSyncResult ? (
                  <div className="space-y-2 rounded-md border border-ems-green/30 bg-ems-green/10 px-3 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-ems-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <p className="font-semibold text-ems-green">
                        Sync complete — {internalSyncResult.created} created, {internalSyncResult.updated} updated, {internalSyncResult.removed} removed, {internalSyncResult.disabled} disabled.
                      </p>
                    </div>
                    {internalSyncResult.createdEntraUsers?.length ? (
                      <div className="rounded-md border border-ems-amber/30 bg-ems-amber/10 px-3 py-2 text-xs text-text-secondary">
                        <p className="mb-2 font-semibold text-ems-amber">One-time temporary passwords for created Entra users</p>
                        <div className="space-y-1 font-mono">
                          {internalSyncResult.createdEntraUsers.map((user) => (
                            <div key={user.userPrincipalName} className="break-all">
                              {user.userPrincipalName}: {user.temporaryPassword}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <SyncPreviewModal
                  open={syncPreviewModalOpen}
                  direction={internalSyncDirection}
                  loading={internalSyncBusy}
                  error={internalSyncError}
                  preview={internalSyncPreview}
                  applying={internalSyncApplying}
                  selectedActionIds={selectedInternalSyncActions}
                  manualMappings={internalSyncMappings}
                  selectedActionFields={selectedInternalSyncFields}
                  onToggleAction={toggleInternalSyncAction}
                  onManualMappingChange={updateInternalSyncMapping}
                  onToggleActionField={toggleInternalSyncActionField}
                  onToggleAllActions={toggleAllInternalSyncActions}
                  onApply={handleApplyInternalContactSync}
                  onClose={() => {
                    if (!internalSyncApplying) setSyncPreviewModalOpen(false);
                  }}
                />
	              </div>
	            ) : null}

            {adminUsersQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm bg-card border border-border rounded-lg min-w-[1180px]">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-surface">
                      <th className="text-left py-2.5 px-3">Name</th>
                      <th className="text-left py-2.5 px-3">Email</th>
                      <th className="text-left py-2.5 px-3">Job Title</th>
                      <th className="text-left py-2.5 px-3">Department</th>
                      <th className="text-left py-2.5 px-3">Employee Type</th>
                      <th className="text-left py-2.5 px-3">Office</th>
                      <th className="text-left py-2.5 px-3">City</th>
                      <th className="text-left py-2.5 px-3">Mobile</th>
                      <th className="text-left py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersQuery.data.map((u) => {
                      const phone = u.mobilePhone || u.businessPhones?.[0] || '';
                      return (
                        <tr key={u.id} className="border-b border-border/50">
                          <td className="py-2.5 px-3 text-text-primary">{u.name}</td>
                          <td className="py-2.5 px-3 text-ems-blue text-xs">
                            {u.email ? <a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a> : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">
                            <div className="font-medium text-text-primary">{u.jobTitle || '—'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">{u.department || '—'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{u.employeeType || '—'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{u.officeLocation || '—'}</td>
                          <td className="py-2.5 px-3 text-text-secondary">{u.city || '—'}</td>
                          <td className="py-2.5 px-3 text-text-secondary text-xs">{phone || '—'}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={u.status ?? 'Active'} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'Lookup Tables' && (
        <div className="space-y-4">
          <TabBar tabs={LOOKUP_TABLES.map((t) => t.label)} active={lookupTab} onChange={setLookupTab} />

          {lookupListQuery.isError && (
            <div className="text-sm text-ems-coral border border-ems-coral/30 rounded-md px-3 py-2 bg-ems-coral-dim">
              Could not load {activeLookupConfig.label}: {friendlyApiError(lookupListQuery.error)}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-text-primary">{activeLookupConfig.label}</h3>
              <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary tabular-nums">
                {lookupTableBusyOverlay ? '…' : lookupTotal.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLookup(true)}
              disabled={lookupIsLoading}
              className="bg-ems-accent hover:bg-ems-accent/80 text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Row
            </button>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-80">
              <div className="relative w-full min-w-0" ref={lookupSearchWrapperRef}>
                <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
                  <input
                    type="text"
                    className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed"
                    placeholder={`Search ${activeLookupConfig.label}...`}
                    value={lookupSearchInput}
                    disabled={lookupIsLoading}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLookupSearchInput(v);
                      setShowLookupSuggestions(true);
                      if (!v.trim()) {
                        setLookupSearch('');
                      }
                    }}
                    onFocus={() => {
                      if (lookupSearchInput.trim()) setShowLookupSuggestions(true);
                    }}
                    onBlur={commitLookupSearch}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitLookupSearch();
                      if (e.key === 'Escape') setShowLookupSuggestions(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitLookupSearch}
                    className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors"
                    title="Search"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" strokeWidth="2" />
                      <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {lookupSuggestPanelOpen ? (
                  <div
                    className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
                    onMouseDown={(e) => e.preventDefault()}
                    aria-busy={lookupSuggestionsQuery.isFetching}
                  >
                    {lookupSuggestionsQuery.isError ? (
                      <div className="px-3 py-2 text-sm text-ems-coral" role="alert">
                        Could not load suggestions. Try again in a moment.
                      </div>
                    ) : null}
                    {!lookupSuggestionsQuery.isError && lookupSuggestionsQuery.isFetching ? (
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-muted"
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin text-ems-accent"
                          aria-hidden
                        />
                        <span>Searching…</span>
                      </div>
                    ) : null}
                    {!lookupSuggestionsQuery.isError &&
                      !lookupSuggestionsQuery.isFetching &&
                      lookupSuggestions.length > 0
                      ? lookupSuggestions.map((suggestion, i) => (
                        <button
                          key={`${i}-${suggestion}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLookupSearchInput(suggestion);
                            setLookupSearch(suggestion);
                            setShowLookupSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))
                      : null}
                    {!lookupSuggestionsQuery.isError &&
                      !lookupSuggestionsQuery.isFetching &&
                      lookupSuggestionsQuery.isFetched &&
                      lookupSuggestions.length === 0 ? (
                      <div className="px-3 py-2.5 text-sm text-text-muted">No matching results</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {hasActiveLookupFilters ? (
              <button
                type="button"
                onClick={resetLookupFilters}
                disabled={lookupIsLoading}
                className="inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset lookup search"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </button>
            ) : null}
          </div>

          {lookupTableBusyOverlay ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
              <span>Loading rows…</span>
            </div>
          ) : null}

          <div
            className={`relative bg-card border border-border rounded-lg overflow-x-auto overflow-y-clip ${
              lookupTableBusyOverlay ? 'min-h-[240px]' : ''
            }`}
          >
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  {activeLookupConfig.columns.map((col) => (
                    <th key={col.field} className="text-left py-2.5 px-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-text-muted hover:text-text-primary"
                        onClick={() => toggleSort(col.sortBy)}
                      >
                        {col.label}
                        {lookupSort.sortBy === col.sortBy ? (lookupSort.sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lookupDisplayRows.length === 0 && !lookupTableBusyOverlay && (
                  <tr>
                    <td
                      colSpan={activeLookupConfig.columns.length}
                      className="py-12 px-3 text-center text-sm text-text-muted"
                    >
                      No rows match your search.
                    </td>
                  </tr>
                )}
                {lookupDisplayRows.map((row, rowIndex) => (
                  <tr
                    key={getLookupRowElementKey(row, activeLookupConfig, rowIndex)}
                    className="border-b border-border/50 hover:bg-hover cursor-pointer"
                    onClick={() => {
                      setSelectedLookupRow(row);
                      setDetailsTab('Overview');
                    }}
                  >
                    {activeLookupConfig.columns.map((col) => (
                      <td key={col.field} className="py-2.5 px-3 text-text-primary">
                        {renderLookupCell(row, col.field)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {lookupTableBusyOverlay ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 px-4 py-8 backdrop-blur-[0.5px]"
                aria-busy="true"
                aria-live="polite"
              >
                <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg text-sm text-text-secondary">
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-ems-accent"
                    aria-hidden
                  />
                  <span>Loading rows…</span>
                </div>
              </div>
            ) : null}
          </div>

          {lookupTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
              <p className="tabular-nums">
                Showing <span className="text-text-primary font-medium">{rangeStart}–{rangeEnd}</span> of{' '}
                <span className="text-text-primary font-medium">{lookupTotal.toLocaleString()}</span>
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-text-muted">
                  <span aria-hidden>·</span>
                  <PageSizeSelect value={lookupPageSize} onChange={setLookupPageSize} disabled={lookupIsLoading} />
                  <span>per page</span>
                </span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={pageClamped <= 1 || lookupIsLoading}
                  onClick={() => setLookupPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="text-text-muted tabular-nums px-1">
                  Page {pageClamped} / {lookupPageCount}
                </span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={pageClamped >= lookupPageCount || lookupIsLoading}
                  onClick={() => setLookupPage((p) => Math.min(lookupPageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'System' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="space-y-3 text-sm">
            {[
              { label: 'Application Version', value: '1.0.0-beta' },
              { label: 'Environment', value: 'Production' },
              { label: 'Database', value: 'Azure SQL — EngagementDB_Dev' },
              { label: 'DB Host', value: 'engagementdb-sql-dev.database.windows.net' },
              { label: 'Auth Provider', value: 'Azure Active Directory' },
              { label: 'Active Users', value: `${adminUsersQuery.data?.length ?? users.length} users` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-text-muted">{r.label}</span>
                <span className="text-text-primary font-mono">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)} width={500}>
          <UserForm
            initial={editUser}
            onSave={(u) => {
              onUpdateUsers(users.map((x) => (x.id === u.id ? u : x)));
              setEditUser(null);
              addToast('User updated', 'success');
            }}
            onCancel={() => setEditUser(null)}
          />
        </Modal>
      )}

      {showAddLookup && (
        <Modal
          title={`Add ${activeLookupConfig.label}`}
          onClose={() => setShowAddLookup(false)}
          width={560}
        >
          <LookupRowForm
            config={activeLookupConfig}
            companies={lookupDepsQuery.data?.companies ?? []}
            companyOptions={companyOptions}
            companyTypeOptions={companyTypeOptions}
            serviceOptions={serviceOptions}
            loadingDependencies={lookupDepsQuery.isPending}
            saving={upsertLookupMut.isPending}
            onCancel={() => setShowAddLookup(false)}
            onSave={async (payload) => {
              try {
                await upsertLookupMut.mutateAsync({ mode: 'create', body: payload });
                setShowAddLookup(false);
                addToast(`${activeLookupConfig.label} row created.`, 'success');
              } catch (error) {
                addToast(friendlyApiError(error, 'Could not create row.'), 'error');
              }
            }}
          />
        </Modal>
      )}

      <AlertDialog
        open={deleteLookupRow !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLookupMut.isPending) setDeleteLookupRow(null);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this {activeLookupConfig.label} row?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You’re about to remove{' '}
              <span className="font-medium text-text-primary">
                {deleteLookupRow
                  ? String(
                    deleteLookupRow[
                    activeLookupConfig.nameField ?? activeLookupConfig.idField
                    ] ?? '',
                  ).trim() ||
                  `${activeLookupConfig.label} #${getRowId(deleteLookupRow, activeLookupConfig)}`
                  : 'this row'}
              </span>{' '}
              from the database. If something blocks the removal, you’ll see a short
              explanation right after you confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteLookupMut.isPending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-ems-accent"
                aria-hidden
              />
              <span>Removing row…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteLookupMut.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteLookupMut.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => void confirmDeleteLookup()}
            >
              {deleteLookupMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove row'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedLookupRow && (
        <Drawer onClose={() => setSelectedLookupRow(null)} width={980}>
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Avatar name={selectedLookupTitle || activeLookupConfig.label} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary truncate">
                {selectedLookupTitle}
              </h2>
              <div className="text-xs text-text-muted mt-1">{activeLookupConfig.label}</div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteLookupRow(selectedLookupRow)}
              title={`Delete this ${activeLookupConfig.label}`}
              className="p-1.5 text-text-muted hover:text-ems-coral hover:bg-ems-coral-dim rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedLookupRow(null)}
              className="text-text-muted hover:text-text-secondary text-lg p-1"
            >
              ✕
            </button>
          </div>

          <TabBar tabs={['Overview']} active={detailsTab} onChange={setDetailsTab} />

          <div className="p-4">
            <LookupDetailsEditor
              key={`${activeLookupKey}-${selectedLookupId ?? 'none'}`}
              config={activeLookupConfig}
              row={selectedLookupRow}
              companies={lookupDepsQuery.data?.companies ?? []}
              companyOptions={companyOptions}
              companyTypeOptions={companyTypeOptions}
              serviceOptions={serviceOptions}
              loadingDependencies={lookupDepsQuery.isPending}
              saving={upsertLookupMut.isPending}
              onSave={async (payload) => {
                try {
                  const updated = await upsertLookupMut.mutateAsync({
                    mode: 'update',
                    id: getRowId(selectedLookupRow, activeLookupConfig),
                    body: payload,
                  });
                  setSelectedLookupRow(updated);
                  addToast(`${activeLookupConfig.label} row updated.`, 'success');
                } catch (error) {
                  addToast(friendlyApiError(error, 'Could not update row.'), 'error');
                }
              }}
            />
          </div>
        </Drawer>
      )}
    </div>
  );
}

function lookupCompanyTypeIds(
  companies: ApiCompanyListRow[],
  companyIdRaw: string,
): number[] {
  const companyId = Number(companyIdRaw);
  if (!Number.isInteger(companyId) || companyId < 1) return [];
  const company = companies.find((row) => row.companyId === companyId);
  if (!company) return [];
  const ids = [
    ...(company.companyTypeIds ?? []),
    company.companyTypeId,
  ]
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

function useCompanyServiceLookupOptions({
  isCompanyService,
  companyId,
  companies,
  fallbackServiceOptions,
}: {
  isCompanyService: boolean;
  companyId: string;
  companies: ApiCompanyListRow[];
  fallbackServiceOptions: Select2Option[];
}) {
  const companyTypeIds = useMemo(
    () => lookupCompanyTypeIds(companies, companyId),
    [companies, companyId],
  );
  const companyTypeKey = companyTypeIds.join(',');
  const allowedServicesQuery = useQuery({
    queryKey: ['lookup-manage', 'company-services', 'allowed-services', companyTypeKey],
    queryFn: () => fetchServicesAllowedForCompanyTypes(companyTypeIds),
    enabled: isCompanyService && companyTypeIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const allowedServiceOptions = useMemo<Select2Option[]>(
    () =>
      (allowedServicesQuery.data ?? []).map((service) => ({
        value: String(service.serviceProvidedId),
        label: service.serviceName,
      })),
    [allowedServicesQuery.data],
  );
  const hasCompany = Number.isInteger(Number(companyId)) && Number(companyId) > 0;
  const loading =
    isCompanyService &&
    hasCompany &&
    companyTypeIds.length > 0 &&
    (allowedServicesQuery.isPending || allowedServicesQuery.isFetching);
  return {
    options: isCompanyService ? allowedServiceOptions : fallbackServiceOptions,
    loading,
    hasCompany,
    hasCompanyTypes: companyTypeIds.length > 0,
    empty:
      isCompanyService &&
      hasCompany &&
      !loading &&
      (companyTypeIds.length === 0 || allowedServiceOptions.length === 0),
  };
}

function LookupRowForm({
  config,
  initial,
  companies,
  companyOptions,
  companyTypeOptions,
  serviceOptions,
  loadingDependencies,
  saving,
  onSave,
  onCancel,
}: {
  config: LookupTableConfig;
  initial?: LookupManageRow;
  companies: ApiCompanyListRow[];
  companyOptions: Select2Option[];
  companyTypeOptions: Select2Option[];
  serviceOptions: Select2Option[];
  loadingDependencies: boolean;
  saving: boolean;
  onSave: (payload: LookupManageCreatePayload | LookupManageUpdatePayload) => Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const isCompanyService = config.key === 'company-services';
  const isCompanyTypeService = config.key === 'company-type-services';
  const isDma = config.key === 'dmas';
  const [idInput, setIdInput] = useState(
    config.manualIdOnCreate && !isEdit ? '' : String(initial?.[config.idField] ?? ''),
  );
  const [nameInput, setNameInput] = useState(
    config.nameField ? String(initial?.[config.nameField] ?? '') : '',
  );
  const [companyId, setCompanyId] = useState(String(initial?.companyId ?? ''));
  const [companyTypeId, setCompanyTypeId] = useState(String(initial?.companyTypeId ?? ''));
  const [serviceProvidedId, setServiceProvidedId] = useState(
    String(initial?.serviceProvidedId ?? ''),
  );
  const [serviceProvidedIds, setServiceProvidedIds] = useState<string[]>(() =>
    Array.isArray(initial?.serviceProvidedIds)
      ? initial.serviceProvidedIds
          .map((value) => String(value))
          .filter((value) => Number.isInteger(Number(value)) && Number(value) > 0)
      : initial?.serviceProvidedId != null
        ? [String(initial.serviceProvidedId)]
        : [],
  );
  const [postalCode, setPostalCode] = useState(String(initial?.postalCode ?? ''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const companyServiceOptionsState = useCompanyServiceLookupOptions({
    isCompanyService,
    companyId,
    companies,
    fallbackServiceOptions: serviceOptions,
  });
  useEffect(() => {
    if (
      !isCompanyService ||
      !serviceProvidedId ||
      loadingDependencies ||
      companyServiceOptionsState.loading
    )
      return;
    const stillAllowed = companyServiceOptionsState.options.some(
      (option) => option.value === serviceProvidedId,
    );
    if (!stillAllowed) setServiceProvidedId('');
  }, [
    isCompanyService,
    serviceProvidedId,
    loadingDependencies,
    companyServiceOptionsState.loading,
    companyServiceOptionsState.options,
  ]);
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const submit = async () => {
    if (submitting || saving) return;
    setError('');
    if (isCompanyService || isCompanyTypeService) {
      const cId = Number(companyId);
      const ctId = Number(companyTypeId);
      if (isCompanyService && (!Number.isInteger(cId) || cId < 1)) {
        setError('Company is required.');
        return;
      }
      if (isCompanyTypeService && (!Number.isInteger(ctId) || ctId < 1)) {
        setError('Company type is required.');
        return;
      }
      if (isCompanyTypeService) {
        const ids = serviceProvidedIds
          .map(Number)
          .filter((value) => Number.isInteger(value) && value > 0);
        if (ids.length === 0) {
          setError('Select at least one service.');
          return;
        }
        setSubmitting(true);
        try {
          await onSave({ companyTypeId: ctId, serviceProvidedIds: [...new Set(ids)] });
        } finally {
          setSubmitting(false);
        }
        return;
      }
      const sId = Number(serviceProvidedId);
      if (!Number.isInteger(sId) || sId < 1) {
        setError('Service is required.');
        return;
      }
      setSubmitting(true);
      try {
        await onSave({ companyId: cId, serviceProvidedId: sId });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!isEdit && config.manualIdOnCreate) {
      const parsedId = Number(idInput);
      if (!Number.isInteger(parsedId) || parsedId < 1) {
        setError('ID must be a positive integer.');
        return;
      }
      if (isDma) {
        const trimmedPostal = postalCode.trim();
        if (!trimmedPostal) {
          setError('Postal code is required.');
          return;
        }
        setSubmitting(true);
        try {
          await onSave({ id: parsedId, name: trimmedName, postalCode: trimmedPostal });
        } finally {
          setSubmitting(false);
        }
        return;
      }
      setSubmitting(true);
      try {
        await onSave({ id: parsedId, name: trimmedName });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (isDma) {
      const trimmedPostal = postalCode.trim();
      if (!trimmedPostal) {
        setError('Postal code is required.');
        return;
      }
      setSubmitting(true);
      try {
        await onSave({ name: trimmedName, postalCode: trimmedPostal });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    try {
      await onSave({ name: trimmedName });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {isCompanyService || isCompanyTypeService ? (
        <>
          {isCompanyService ? (
            <FormField label="Company" required>
              <Select2
                options={companyOptions}
                value={companyId}
                onChange={setCompanyId}
                placeholder={loadingDependencies ? 'Loading companies...' : 'Select company'}
                disabled={loadingDependencies || saving || submitting}
              />
            </FormField>
          ) : (
            <FormField label="Company Type" required>
              <Select2
                options={companyTypeOptions}
                value={companyTypeId}
                onChange={setCompanyTypeId}
                placeholder={loadingDependencies ? 'Loading company types...' : 'Select company type'}
                disabled={loadingDependencies || saving || submitting}
              />
            </FormField>
          )}
          <FormField label="Service Provided" required>
            {isCompanyTypeService ? (
              <Select2Multi
                options={serviceOptions}
                values={serviceProvidedIds}
                onChange={setServiceProvidedIds}
                placeholder={loadingDependencies ? 'Loading services...' : 'Select one or more services'}
                disabled={loadingDependencies || saving || submitting}
              />
            ) : (
              <Select2
                options={companyServiceOptionsState.options}
                value={serviceProvidedId}
                onChange={setServiceProvidedId}
                placeholder={
                  loadingDependencies
                    ? 'Loading services...'
                    : isCompanyService && !companyServiceOptionsState.hasCompany
                      ? 'Select company first'
                      : companyServiceOptionsState.loading
                        ? 'Loading allowed services...'
                        : companyServiceOptionsState.empty
                          ? 'No allowed services'
                          : 'Select service'
                }
                disabled={
                  loadingDependencies ||
                  saving ||
                  submitting ||
                  (isCompanyService &&
                    (!companyServiceOptionsState.hasCompany ||
                      companyServiceOptionsState.loading ||
                      companyServiceOptionsState.empty))
                }
              />
            )}
            {isCompanyService && companyServiceOptionsState.empty ? (
              <p className="mt-1 text-xs text-text-muted">
                {companyServiceOptionsState.hasCompanyTypes
                  ? 'No services are mapped for this company type in CompanyTypeService.'
                  : 'Selected company has no company type to filter services.'}
              </p>
            ) : null}
          </FormField>
          {isEdit && (
            <FormField label={isCompanyService ? 'Company Service ID' : 'Company Type ID'}>
              <input
                className={inputCls}
                value={String(initial?.[config.idField] ?? '')}
                disabled
              />
            </FormField>
          )}
        </>
      ) : (
        <>
          {(config.manualIdOnCreate || isEdit) && (
            <FormField label="ID" required={config.manualIdOnCreate && !isEdit}>
              <input
                className={inputCls}
                type="number"
                min={1}
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                disabled={isEdit || saving || submitting}
              />
            </FormField>
          )}
          <FormField label={isDma ? 'Market Name' : 'Name'} required>
            <input
              className={inputCls}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={100}
              disabled={saving || submitting}
            />
          </FormField>
          {isDma && (
            <FormField label="Postal Code" required>
              <input
                className={inputCls}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                maxLength={20}
                disabled={saving || submitting}
              />
            </FormField>
          )}
        </>
      )}
      {error && <p className="text-xs text-ems-coral">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || submitting}
          className="text-text-secondary px-4 py-1.5 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || submitting || (loadingDependencies && (isCompanyService || isCompanyTypeService))}
          className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {saving || submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function LookupDetailsEditor({
  config,
  row,
  companies,
  companyOptions,
  companyTypeOptions,
  serviceOptions,
  loadingDependencies,
  saving,
  onSave,
}: {
  config: LookupTableConfig;
  row: LookupManageRow;
  companies: ApiCompanyListRow[];
  companyOptions: Select2Option[];
  companyTypeOptions: Select2Option[];
  serviceOptions: Select2Option[];
  loadingDependencies: boolean;
  saving: boolean;
  onSave: (payload: LookupManageUpdatePayload) => Promise<void>;
}) {
  const isCompanyService = config.key === 'company-services';
  const isCompanyTypeService = config.key === 'company-type-services';
  const isDma = config.key === 'dmas';
  const [name, setName] = useState(
    config.nameField ? String(row[config.nameField] ?? '') : '',
  );
  const [postalCode, setPostalCode] = useState(String(row.postalCode ?? ''));
  const [companyId, setCompanyId] = useState(String(row.companyId ?? ''));
  const [companyTypeId, setCompanyTypeId] = useState(String(row.companyTypeId ?? ''));
  const [serviceProvidedId, setServiceProvidedId] = useState(String(row.serviceProvidedId ?? ''));
  const [serviceProvidedIds, setServiceProvidedIds] = useState<string[]>(() =>
    Array.isArray(row.serviceProvidedIds)
      ? row.serviceProvidedIds
          .map((value) => String(value))
          .filter((value) => Number.isInteger(Number(value)) && Number(value) > 0)
      : row.serviceProvidedId != null
        ? [String(row.serviceProvidedId)]
        : [],
  );
  const [error, setError] = useState('');
  const companyServiceOptionsState = useCompanyServiceLookupOptions({
    isCompanyService,
    companyId,
    companies,
    fallbackServiceOptions: serviceOptions,
  });
  useEffect(() => {
    if (
      !isCompanyService ||
      !serviceProvidedId ||
      loadingDependencies ||
      companyServiceOptionsState.loading
    )
      return;
    const stillAllowed = companyServiceOptionsState.options.some(
      (option) => option.value === serviceProvidedId,
    );
    if (!stillAllowed) setServiceProvidedId('');
  }, [
    isCompanyService,
    serviceProvidedId,
    loadingDependencies,
    companyServiceOptionsState.loading,
    companyServiceOptionsState.options,
  ]);
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent disabled:opacity-60';

  const submit = async () => {
    setError('');
    if (isCompanyService || isCompanyTypeService) {
      const cId = Number(companyId);
      const ctId = Number(companyTypeId);
      if (isCompanyService && (!Number.isInteger(cId) || cId < 1)) {
        setError('Company is required.');
        return;
      }
      if (isCompanyTypeService && (!Number.isInteger(ctId) || ctId < 1)) {
        setError('Company type is required.');
        return;
      }
      if (isCompanyTypeService) {
        const ids = serviceProvidedIds
          .map(Number)
          .filter((value) => Number.isInteger(value) && value > 0);
        if (ids.length === 0) {
          setError('Select at least one service.');
          return;
        }
        await onSave({ companyTypeId: ctId, serviceProvidedIds: [...new Set(ids)] });
        return;
      }
      const sId = Number(serviceProvidedId);
      if (!Number.isInteger(sId) || sId < 1) {
        setError('Service is required.');
        return;
      }
      await onSave({ companyId: cId, serviceProvidedId: sId });
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError(isDma ? 'Market name is required.' : 'Name is required.');
      return;
    }
    if (isDma) {
      const pc = postalCode.trim();
      if (!pc) {
        setError('Postal code is required.');
        return;
      }
      await onSave({ name: trimmed, postalCode: pc });
      return;
    }
    await onSave({ name: trimmed });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isCompanyService || isCompanyTypeService ? (
          <>
            {isCompanyService ? (
              <FormField label="Company" required>
                <Select2
                  options={companyOptions}
                  value={companyId}
                  onChange={setCompanyId}
                  placeholder={loadingDependencies ? 'Loading companies...' : 'Select company'}
                  disabled={loadingDependencies || saving}
                />
              </FormField>
            ) : (
              <FormField label="Company Type" required>
                <Select2
                  options={companyTypeOptions}
                  value={companyTypeId}
                  onChange={setCompanyTypeId}
                  placeholder={loadingDependencies ? 'Loading company types...' : 'Select company type'}
                  disabled={loadingDependencies || saving}
                />
              </FormField>
            )}
            <FormField label="Service Provided" required>
              {isCompanyTypeService ? (
                <Select2Multi
                  options={serviceOptions}
                  values={serviceProvidedIds}
                  onChange={setServiceProvidedIds}
                  placeholder={loadingDependencies ? 'Loading services...' : 'Select one or more services'}
                  disabled={loadingDependencies || saving}
                />
              ) : (
                <Select2
                  options={companyServiceOptionsState.options}
                  value={serviceProvidedId}
                  onChange={setServiceProvidedId}
                  placeholder={
                    loadingDependencies
                      ? 'Loading services...'
                      : isCompanyService && !companyServiceOptionsState.hasCompany
                        ? 'Select company first'
                        : companyServiceOptionsState.loading
                          ? 'Loading allowed services...'
                          : companyServiceOptionsState.empty
                            ? 'No allowed services'
                            : 'Select service'
                  }
                  disabled={
                    loadingDependencies ||
                    saving ||
                    (isCompanyService &&
                      (!companyServiceOptionsState.hasCompany ||
                        companyServiceOptionsState.loading ||
                        companyServiceOptionsState.empty))
                  }
                />
              )}
              {isCompanyService && companyServiceOptionsState.empty ? (
                <p className="mt-1 text-xs text-text-muted">
                  {companyServiceOptionsState.hasCompanyTypes
                    ? 'No services are mapped for this company type in CompanyTypeService.'
                    : 'Selected company has no company type to filter services.'}
                </p>
              ) : null}
            </FormField>
          </>
        ) : (
          <>
            <FormField label={isDma ? 'Market Name' : 'Name'} required>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                disabled={saving}
              />
            </FormField>
            {isDma ? (
              <FormField label="Postal Code" required>
                <input
                  className={inputCls}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  maxLength={20}
                  disabled={saving}
                />
              </FormField>
            ) : null}
          </>
        )}
      </div>

      {error && <p className="text-xs text-ems-coral">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || (loadingDependencies && (isCompanyService || isCompanyTypeService))}
          className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function UserForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: UserRow;
  onSave: (u: UserRow) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState(initial.role);
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';
  return (
    <div className="space-y-3">
      <FormField label="Name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Email">
        <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Role">
        <Select2
          options={['Booker', 'WorkflowStaff', 'Management', 'Admin'].map((v) => ({ value: v, label: v }))}
          value={role}
          onChange={setRole}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-text-secondary px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button
          onClick={() => onSave({ ...initial, name, email, role })}
          className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium"
        >
          Save
        </button>
      </div>
    </div>
  );
}
