import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import {
  ActionMenu,
  Avatar,
  Drawer,
  FormField,
  Modal,
  StatusBadge,
  TabBar,
} from './Primitives';
import { Select2, type Select2Option } from './Select2';
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
import { fetchCompaniesPickerRows, fetchLookups } from '@/api/companyApi';
import {
  createLookupManageRow,
  deleteLookupManageRow,
  fetchLookupManageRows,
  lookupManageListQueryKey,
  type LookupManageCreatePayload,
  type LookupManageRow,
  type LookupManageTableKey,
  type LookupManageUpdatePayload,
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
import { Button } from '@/components/ui/button';
import { fetchAdminUsers } from '@/api/adminUsersApi';
import { acquireApiAccessToken, getActiveAccount } from '@/auth/entra';

interface UserRow {
  id: string;
  name: string;
  role: string;
  email: string;
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
    key: 'company-services',
    label: 'CompanyService',
    idField: 'companyServiceId',
    nameField: 'serviceName',
    manualIdOnCreate: false,
    columns: [{ label: 'Service Name', field: 'serviceName', sortBy: 'serviceName' }],
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

export function SettingsPage({
  addToast,
  users,
  onUpdateUsers,
  initialMainTab = 'Users',
}: Props) {
  const { accounts } = useMsal();
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

  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const adminUsersQuery = useQuery({
    queryKey: ['admin-users', account?.homeAccountId ?? null],
    enabled: tab === 'Users' && account != null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!account) {
        throw new Error('Sign in with Microsoft Entra ID to load the admin user directory.');
      }
      const accessToken = await acquireApiAccessToken(account);
      return fetchAdminUsers(accessToken);
    },
  });

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
    setLookupSort({
      sortBy: activeLookupKey === 'company-services' ? 'serviceName' : 'name',
      sortDir: 'asc',
    });
  }, [activeLookupKey]);

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

  const lookupListQuery = useQuery({
    queryKey: lookupListQueryKey,
    queryFn: () =>
      fetchLookupManageRows(activeLookupKey, offset, limit, {
        q: lookupSearch || undefined,
        sortBy: lookupSort.sortBy,
        sortDir: lookupSort.sortDir,
      }),
    enabled: tab === 'Lookup Tables',
    staleTime: 5 * 60 * 1000,
    // Never reuse rows from another lookup table: same-table keys (sort/page/search) still get smooth placeholders.
    placeholderData: (previousData, previousQuery) => {
      if (!previousData) return undefined;
      const prevTable = previousQuery?.queryKey?.[1];
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
    activeLookupKey === 'company-services'
      ? 'serviceName'
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
    const q = lookupSearchInput.trim().toLowerCase();
    if (!q) return [];
    const rows = lookupSuggestionsQuery.data?.data ?? [];
    const values =
      activeLookupKey === 'company-services'
        ? rows.flatMap((row) => {
            const serviceName = String(row.serviceName ?? '').trim();
            return serviceName ? [serviceName] : [];
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
      .filter((value) => value.toLowerCase().includes(q))
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

  const lookupDepsQuery = useQuery({
    queryKey: ['lookup-manage', 'dependencies'],
    queryFn: async () => {
      const [companies, lookups] = await Promise.all([
        fetchCompaniesPickerRows(),
        fetchLookups(),
      ]);
      return {
        companies,
        services: lookups.servicesProvided,
      };
    },
    enabled: tab === 'Lookup Tables',
    staleTime: 30 * 60 * 1000,
  });

  const companyOptions = useMemo<Select2Option[]>(
    () =>
      (lookupDepsQuery.data?.companies ?? []).map((company) => ({
        value: String(company.companyId),
        label: `${company.companyName} (#${company.companyId})`,
      })),
    [lookupDepsQuery.data?.companies],
  );

  const serviceOptions = useMemo<Select2Option[]>(
    () =>
      (lookupDepsQuery.data?.services ?? []).map((service) => ({
        value: String(service.serviceProvidedId),
        label: `${service.serviceName} (#${service.serviceProvidedId})`,
      })),
    [lookupDepsQuery.data?.services],
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
      : activeLookupKey === 'company-services'
        ? String(selectedLookupRow.serviceName ?? '').trim() || 'Service'
        : String(
          selectedLookupRow[activeLookupConfig.nameField ?? activeLookupConfig.idField] ?? '',
        ).trim() || `${activeLookupConfig.label} #${selectedLookupId ?? ''}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
      <TabBar tabs={['Users', 'Lookup Tables', 'System']} active={tab} onChange={setTab} />

      {tab === 'Users' && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Microsoft Entra user directory</h3>
              <p className="mt-1 text-sm text-text-secondary">
                This table is loaded from the protected backend admin API. The backend decides who can see the full directory.
              </p>
            </div>

            {adminUsersQuery.isPending ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-ems-accent" />
                Loading Entra users...
              </div>
            ) : null}

            {adminUsersQuery.isError ? (
              <div className="rounded-md border border-ems-coral/30 bg-ems-coral-dim px-3 py-2 text-sm text-ems-coral">
                {friendlyApiError(
                  adminUsersQuery.error,
                  'Could not load the Entra user directory. Check VITE_ENTRA_API_SCOPE on the frontend and the ENTRA_* backend settings.',
                )}
              </div>
            ) : null}

            {adminUsersQuery.data ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm bg-card border border-border rounded-lg min-w-[550px]">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-surface">
                      <th className="text-left py-2.5 px-3">Name</th>
                      <th className="text-left py-2.5 px-3">Email</th>
                      <th className="text-left py-2.5 px-3">Role</th>
                      <th className="text-left py-2.5 px-3">Last Login</th>
                      <th className="text-left py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersQuery.data.map((u) => (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="py-2.5 px-3 text-text-primary">{u.name}</td>
                        <td className="py-2.5 px-3 text-ems-blue text-xs">{u.email || '—'}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{u.role}</td>
                        <td className="py-2.5 px-3 text-text-secondary text-xs">{u.lastLogin}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={u.status} />
                        </td>
                      </tr>
                    ))}
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
                        {toDisplay(row[col.field])}
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
            companyOptions={companyOptions}
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
              companyOptions={companyOptions}
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

function LookupRowForm({
  config,
  initial,
  companyOptions,
  serviceOptions,
  loadingDependencies,
  saving,
  onSave,
  onCancel,
}: {
  config: LookupTableConfig;
  initial?: LookupManageRow;
  companyOptions: Select2Option[];
  serviceOptions: Select2Option[];
  loadingDependencies: boolean;
  saving: boolean;
  onSave: (payload: LookupManageCreatePayload | LookupManageUpdatePayload) => Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const isCompanyService = config.key === 'company-services';
  const isDma = config.key === 'dmas';
  const [idInput, setIdInput] = useState(
    config.manualIdOnCreate && !isEdit ? '' : String(initial?.[config.idField] ?? ''),
  );
  const [nameInput, setNameInput] = useState(
    config.nameField ? String(initial?.[config.nameField] ?? '') : '',
  );
  const [companyId, setCompanyId] = useState(String(initial?.companyId ?? ''));
  const [serviceProvidedId, setServiceProvidedId] = useState(
    String(initial?.serviceProvidedId ?? ''),
  );
  const [postalCode, setPostalCode] = useState(String(initial?.postalCode ?? ''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const submit = async () => {
    if (submitting || saving) return;
    setError('');
    if (isCompanyService) {
      const cId = Number(companyId);
      const sId = Number(serviceProvidedId);
      if (!Number.isInteger(cId) || cId < 1) {
        setError('Company is required.');
        return;
      }
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
      {isCompanyService ? (
        <>
          <FormField label="Company" required>
            <Select2
              options={companyOptions}
              value={companyId}
              onChange={setCompanyId}
              placeholder={loadingDependencies ? 'Loading companies...' : 'Select company'}
              disabled={loadingDependencies || saving || submitting}
            />
          </FormField>
          <FormField label="Service Provided" required>
            <Select2
              options={serviceOptions}
              value={serviceProvidedId}
              onChange={setServiceProvidedId}
              placeholder={loadingDependencies ? 'Loading services...' : 'Select service'}
              disabled={loadingDependencies || saving || submitting}
            />
          </FormField>
          {isEdit && (
            <FormField label="Company Service ID">
              <input className={inputCls} value={String(initial?.companyServiceId ?? '')} disabled />
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
          disabled={saving || submitting || (loadingDependencies && isCompanyService)}
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
  companyOptions,
  serviceOptions,
  loadingDependencies,
  saving,
  onSave,
}: {
  config: LookupTableConfig;
  row: LookupManageRow;
  companyOptions: Select2Option[];
  serviceOptions: Select2Option[];
  loadingDependencies: boolean;
  saving: boolean;
  onSave: (payload: LookupManageUpdatePayload) => Promise<void>;
}) {
  const isCompanyService = config.key === 'company-services';
  const isDma = config.key === 'dmas';
  const [name, setName] = useState(
    config.nameField ? String(row[config.nameField] ?? '') : '',
  );
  const [postalCode, setPostalCode] = useState(String(row.postalCode ?? ''));
  const [companyId, setCompanyId] = useState(String(row.companyId ?? ''));
  const [serviceProvidedId, setServiceProvidedId] = useState(String(row.serviceProvidedId ?? ''));
  const [error, setError] = useState('');
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent disabled:opacity-60';

  const submit = async () => {
    setError('');
    if (isCompanyService) {
      const cId = Number(companyId);
      const sId = Number(serviceProvidedId);
      if (!Number.isInteger(cId) || cId < 1) {
        setError('Company is required.');
        return;
      }
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
        {isCompanyService ? (
          <>
            <FormField label="Company" required>
              <Select2
                options={companyOptions}
                value={companyId}
                onChange={setCompanyId}
                placeholder={loadingDependencies ? 'Loading companies...' : 'Select company'}
                disabled={loadingDependencies || saving}
              />
            </FormField>
            <FormField label="Service Provided" required>
              <Select2
                options={serviceOptions}
                value={serviceProvidedId}
                onChange={setServiceProvidedId}
                placeholder={loadingDependencies ? 'Loading services...' : 'Select service'}
                disabled={loadingDependencies || saving}
              />
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
          disabled={saving || (loadingDependencies && isCompanyService)}
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
