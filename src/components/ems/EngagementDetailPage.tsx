/**
 * EngagementDetailPage – fully dynamic, end-to-end DB-driven.
 * All data comes from the API. No static/hardcoded content.
 *
 * DB chain: Engagement → Tour → Attraction (no direct Engagement.AttractionID)
 *           Engagement → EngagementVenue → Venue → Company → Address + DMA
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Engagement } from '@/data/constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Building2,
  Star,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  MapPin,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';
import { Modal, FormField, TabBar } from './Primitives';
import { EngagementSalesDashboardPanel } from './EngagementSalesDashboardPanel';
import { Select2, type Select2Option } from './Select2';
import { companyToSelect2Option, companyToSelect2Options } from './companySelectOptions';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createEngagementPerformance,
  deleteEngagement,
  fetchEngagement,
  fetchEngagementFinance,
  fetchEngagementFinanceLookups,
  createEngagementWithholding,
  fetchEngagementPerformances,
  fetchEngagementVenues,
  fetchEngagementServiceProviders,
  removeEngagementVenue,
  addEngagementServiceProvider,
  removeEngagementServiceProvider,
  updateEngagement,
  updateEngagementFinance,
  updateEngagementPerformance,
  deleteEngagementPerformance,
  fetchEngagementPerformanceTicketing,
  updateEngagementPerformanceTicketing,
  fetchEngagementIaeContactLookups,
  fetchEngagementIaeContacts,
  addEngagementIaeContact,
  updateEngagementIaeContact,
  deleteEngagementIaeContact,
  updateNonResidentWithholdingLinks,
  type ApiEngagementListRow,
  type ApiEngagementVenueRow,
  type ApiEngagementServiceProviderRow,
  type ApiEngagementServiceProvidersResponse,
  type UpdateEngagementFinancePayload,
  type UpdateNonResidentWithholdingLinksPayload,
  type ApiEngagementFinanceLookups,
  type UpdatePerformanceTicketingPayload,
  type ApiEngagementIaeContactRow,
  type CreateEngagementIaeContactPayload,
  type UpdateEngagementIaeContactPayload,
  type UpdateEngagementPayload,
} from '@/api/engagementApi';
import {
  fetchAttractions,
  fetchTours,
  type ApiAttractionListRow,
  type ApiTourListRow,
} from '@/api/attractionToursApi';
import {
  fetchStagehandProviderCompanies,
  companiesPickerQueryKey,
  fetchCompany,
  fetchCompanies,
  fetchCompaniesPickerRows,
  fetchCompanyContacts,
  fetchDmaMarketsPaged,
  fetchEntertainmentComplexCompanyRows,
  fetchLookups,
  fetchVenueDetails,
  fetchVenueProfile,
  updateCompany,
  updateVenueDetails,
  updateVenueProfile,
  type ApiCompanyListRow,
  type ApiCompanyContact,
} from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { invalidateSalesCapacityRelatedQueries } from '@/api/cacheHelpers';
import { formatOpeningDateSafe, formatSqlTimeDisplay } from '@/lib/engagementDisplay';
import { formatE164ForDisplay } from '@/lib/contactPhoneField';
import { ENGAGEMENT_STATUS_ENUM } from './engagementFormConstants';
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PERFORMANCE_STATUS_OPTIONS = ENGAGEMENT_STATUS_ENUM.map((s) => ({
  value: s,
  label: s,
}));
const TICKETING_STATUS_OPTIONS = [
  { value: 'OnSale', label: 'OnSale' },
  { value: 'Build & Hold', label: 'Build & Hold' },
];
const SETTLEMENT_STATUS_OPTIONS = [
  { value: 'Settled', label: 'Settled' },
  { value: 'Pre-Settled', label: 'Pre-Settled' },
  { value: 'Open', label: 'Open' },
];

function formatPerformanceDateDisplay(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function formatPerformanceTimeDisplay(sqlTime: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(sqlTime.trim());
  if (!m) return sqlTime;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), m[3] != null ? Number(m[3]) : 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function normalizePerformanceTimeInput(value: string): string {
  const parts = value.trim().split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2]
      .padStart(2, '0')
      .slice(0, 2)}`;
  }
  return value.trim();
}

type PerformanceDraftRow = {
  id: string;
  performanceDate: string;
  performanceTime: string;
  performanceStatus: string;
};

const inputCls =
  'w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/20 placeholder:text-text-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

function useUserEditTracker(resetKey: unknown) {
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const markUserEdited = useCallback(() => setHasUserEdited(true), []);
  const clearUserEdited = useCallback(() => setHasUserEdited(false), []);

  useEffect(() => {
    setHasUserEdited(false);
  }, [resetKey]);

  return { hasUserEdited, markUserEdited, clearUserEdited };
}

// ---------------------------------------------------------------------------
// Legacy page (prototype string IDs)
// ---------------------------------------------------------------------------
export function LegacyEngagementDetailPage({
  engagement,
  onNavigate,
}: {
  engagement: Engagement;
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onNavigate('engagements')}
        className="text-text-muted hover:text-text-primary text-sm flex items-center gap-1"
      >
        ← Back to Engagements
      </button>
      <div className="bg-card border border-amber-500/25 rounded-lg p-4 space-y-2">
        <p className="text-xs text-amber-800 dark:text-amber-400/90">
          This engagement uses a local demo id. Use an engagement from the main list for full detail.
        </p>
        <h1 className="text-lg font-semibold text-text-primary">{engagement.name}</h1>
        <div className="text-sm text-text-secondary pt-2 border-t border-border">
          Status: {engagement.status}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Venues tab
// ---------------------------------------------------------------------------
function VenuesTab({
  engagementId,
  addToast,
  onNavigate,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<ApiEngagementVenueRow | null>(null);

  const venuesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venues'],
    queryFn: () => fetchEngagementVenues(engagementId),
  });

  const removeMutation = useMutation({
    mutationFn: (venueCompanyId: number) => removeEngagementVenue(engagementId, venueCompanyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venues'] });
      addToast('Venue removed from engagement.', 'warning');
      setPendingRemove(null);
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not remove venue.'), 'error'),
  });

  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);

  if (venuesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading venues…
      </div>
    );
  }

  if (venuesQuery.error) {
    return (
      <div className="flex items-center gap-2 text-ems-coral text-sm py-4">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(venuesQuery.error)}
        <button
          type="button"
          onClick={() => venuesQuery.refetch()}
          className="text-xs underline ml-1"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Venues</h3>

      {/* Venue list */}
      {venues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Building2 className="h-8 w-8 text-text-muted/50" />
          <p className="text-sm text-text-muted">No venue links found for this engagement.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {venues.map((v) => (
            <div
              key={v.venueCompanyId}
              className={`flex items-start justify-between border rounded-lg px-4 py-3 ${
                v.isPrimary
                  ? 'border-ems-accent/40 bg-ems-accent-dim/20'
                  : 'border-border bg-surface/40'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <Building2
                  className={`h-4 w-4 mt-0.5 shrink-0 ${v.isPrimary ? 'text-ems-accent' : 'text-text-muted'}`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('companies', { selectedCompanyId: v.venueCompanyId })
                      }
                      className="text-sm font-medium text-text-primary text-left hover:text-ems-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/40 rounded-sm"
                      title="Open venue company profile"
                    >
                      {v.venueCompanyName ?? 'Unknown company'}
                    </button>
                    {v.isPrimary && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-ems-accent/15 text-ems-accent px-1.5 py-0.5 rounded font-medium shrink-0">
                        <Star className="h-2.5 w-2.5" />
                        Main
                      </span>
                    )}
                  </div>
                  {v.venueName && v.venueName !== v.venueCompanyName && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('companies', { selectedCompanyId: v.venueCompanyId })
                      }
                      className="block w-full text-left text-xs text-text-secondary mt-0.5 hover:text-ems-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/40 rounded-sm"
                      title="Open venue company profile"
                    >
                      {v.venueName}
                    </button>
                  )}
                  {(v.city || v.stateProvince || v.dmaMarketName) && (
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[v.city, v.stateProvince].filter(Boolean).join(', ')}
                      {v.dmaMarketName ? ` · ${v.dmaMarketName}` : ''}
                    </div>
                  )}
                </div>
              </div>
              {!v.isPrimary && (
                <button
                  type="button"
                  onClick={() => setPendingRemove(v)}
                  disabled={removeMutation.isPending}
                  className="text-ems-coral text-xs hover:underline shrink-0 mt-0.5 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Remove confirm */}
      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove venue?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <strong>{pendingRemove?.venueCompanyName ?? 'Unknown company'}</strong>{' '}
              from this engagement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => pendingRemove && removeMutation.mutate(pendingRemove.venueCompanyId)}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service Providers tab (VenueServiceProvider)
// ---------------------------------------------------------------------------
function ServiceProvidersTab({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [pendingRemove, setPendingRemove] = useState<ApiEngagementServiceProviderRow | null>(null);

  const providersQuery = useQuery({
    queryKey: ['engagements', engagementId, 'service-providers'],
    queryFn: () => fetchEngagementServiceProviders(engagementId),
  });

  const companiesQuery = useQuery({
    queryKey: companiesPickerQueryKey(),
    queryFn: fetchCompaniesPickerRows,
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: (providerCompanyId: number) =>
      addEngagementServiceProvider(engagementId, { providerCompanyId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'service-providers'] });
      addToast('Service provider added.', 'success');
      setShowAdd(false);
      setSelectedCompanyId('');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not add service provider.'), 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (providerCompanyId: number) =>
      removeEngagementServiceProvider(engagementId, providerCompanyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'service-providers'] });
      addToast('Service provider removed.', 'warning');
      setPendingRemove(null);
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not remove service provider.'), 'error'),
  });

  const providers: ApiEngagementServiceProviderRow[] = useMemo(
    () => (providersQuery.data as ApiEngagementServiceProvidersResponse | undefined)?.providers ?? [],
    [providersQuery.data],
  );
  const serviceProvidersTabDirty = showAdd && selectedCompanyId.trim() !== '';
  useEffect(() => {
    onDirtyChange?.(serviceProvidersTabDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, serviceProvidersTabDirty]);

  const availableCompanyOptions = useMemo(() => {
    const existingIds = new Set(providers.map((p) => p.providerCompanyId));
    return companyToSelect2Options((companiesQuery.data ?? [])
      .filter((c) => !existingIds.has(c.companyId)));
  }, [companiesQuery.data, providers]);

  if (providersQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading service providers…
      </div>
    );
  }

  if (providersQuery.error) {
    return (
      <div className="flex items-center gap-2 text-ems-coral text-sm py-4">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(providersQuery.error)}
        <button
          type="button"
          onClick={() => providersQuery.refetch()}
          className="text-xs underline ml-1"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setPendingRemove(null);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this service provider?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              This will remove the provider from this engagement’s service providers list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={removeMutation.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removeMutation.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => {
                if (!pendingRemove) return;
                void removeMutation.mutateAsync(pendingRemove.providerCompanyId);
              }}
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Service Providers</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Add companies providing services for this engagement’s venue. Services shown come from the company’s assigned Company Services.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAdd(!showAdd); setSelectedCompanyId(''); }}
          className="shrink-0 text-ems-accent text-sm hover:underline"
        >
          {showAdd ? 'Cancel' : '+ Add Service Provider'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-elevated border border-border rounded-lg p-4 space-y-3">
          {availableCompanyOptions.length === 0 ? (
            <p className="text-sm text-text-muted">No additional companies available.</p>
          ) : (
            <>
              <FormField label="Company">
                <Select2
                  options={availableCompanyOptions}
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  placeholder="Select company…"
                  disabled={addMutation.isPending}
                />
              </FormField>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setSelectedCompanyId(''); }}
                  className="text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary"
                  disabled={addMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedCompanyId || addMutation.isPending}
                  onClick={() => {
                    const id = Number(selectedCompanyId);
                    if (!Number.isFinite(id) || id < 1) return;
                    void addMutation.mutateAsync(id);
                  }}
                  className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-60"
                >
                  {addMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {providers.length === 0 ? (
        <div className="text-text-muted text-sm">No service providers linked yet.</div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.providerCompanyId}
              className="bg-elevated border border-border rounded-lg p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-text-primary font-medium">
                  {p.providerCompanyName ?? `Company #${p.providerCompanyId}`}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(p.serviceProvidedNames ?? []).length > 0 ? (
                    p.serviceProvidedNames.map((name) => (
                      <span
                        key={`${p.providerCompanyId}-${name}`}
                        className="text-xs bg-background border border-border px-2 py-0.5 rounded-md text-text-secondary"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">
                      No services assigned on this company.
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-text-muted hover:text-ems-coral hover:underline shrink-0"
                onClick={() => setPendingRemove(p)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production tab (venue-backed production details)
// ---------------------------------------------------------------------------
function compactContactName(contact: ApiCompanyContact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
}

function contactPhoneDisplay(contact: ApiCompanyContact): string {
  return (
    formatE164ForDisplay(contact.cellPhone) ||
    formatE164ForDisplay(contact.workPhone) ||
    contact.cellPhone ||
    contact.workPhone ||
    ''
  );
}

function normalizedProductionLookup(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isVenueProductionManagerContact(contact: ApiCompanyContact): boolean {
  const role = normalizedProductionLookup(contact.roleName);
  const department = normalizedProductionLookup(contact.departmentName);
  return (
    role.includes('productionmanager') ||
    (role.includes('production') && role.includes('manager')) ||
    (department.includes('production') && role.includes('manager'))
  );
}

function EngagementProductionPanel({
  engagementId,
  venueCompanyId,
  venueLabel,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  venueCompanyId: number | null;
  venueLabel: string | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [stagehandProviderId, setStagehandProviderId] = useState('');
  const {
    hasUserEdited: hasStagehandUserEdited,
    markUserEdited: markStagehandUserEdited,
    clearUserEdited: clearStagehandUserEdited,
  } = useUserEditTracker(`${engagementId}:${venueCompanyId ?? ''}`);

  const venueDetailsQuery = useQuery({
    queryKey: ['companies', venueCompanyId, 'venue-details'],
    queryFn: () => fetchVenueDetails(venueCompanyId!),
    enabled: venueCompanyId != null && venueCompanyId > 0,
  });

  const venueContactsQuery = useQuery({
    queryKey: ['company-contacts', 'production', venueCompanyId],
    queryFn: () => fetchCompanyContacts(venueCompanyId!),
    enabled: venueCompanyId != null && venueCompanyId > 0,
  });

  const stagehandProvidersQuery = useQuery({
    queryKey: ['lookups', 'stagehand-providers'],
    queryFn: fetchStagehandProviderCompanies,
    staleTime: 60_000,
  });

  const currentStagehandProviderId = useMemo(() => {
    const data = venueDetailsQuery.data;
    if (!data || !('stagehandProviderCompanyId' in data)) return null;
    return data.stagehandProviderCompanyId ?? null;
  }, [venueDetailsQuery.data]);

  useEffect(() => {
    if (!venueDetailsQuery.data) return;
    setStagehandProviderId(
      currentStagehandProviderId == null ? '' : String(currentStagehandProviderId),
    );
  }, [currentStagehandProviderId, venueDetailsQuery.data]);

  const productionManagerContacts = useMemo(
    () => (venueContactsQuery.data ?? []).filter(isVenueProductionManagerContact),
    [venueContactsQuery.data],
  );

  const stagehandProviderOptions = useMemo((): Select2Option[] => {
    const base = companyToSelect2Options(stagehandProvidersQuery.data ?? []);

    const current = currentStagehandProviderId == null ? '' : String(currentStagehandProviderId);
    if (current && !base.some((option) => option.value === current)) {
      return [{ value: current, label: `Current saved provider (#${current})` }, ...base];
    }
    return base;
  }, [currentStagehandProviderId, stagehandProvidersQuery.data]);

  const saveStagehandProviderMutation = useMutation({
    mutationFn: (providerCompanyId: number | null) => {
      if (venueCompanyId == null) {
        throw new Error('No venue is linked to this engagement.');
      }
      return updateVenueDetails(venueCompanyId, {
        stagehandProviderCompanyId: providerCompanyId,
      });
    },
    onSuccess: async (_data, providerCompanyId) => {
      await qc.invalidateQueries({ queryKey: ['companies', venueCompanyId, 'venue-details'] });
      await qc.invalidateQueries({
        queryKey: ['engagements', engagementId, 'service-providers'],
      });
      setStagehandProviderId(providerCompanyId == null ? '' : String(providerCompanyId));
      clearStagehandUserEdited();
      addToast('Production details saved.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save production details.'), 'error'),
  });

  const venueDetailsMissing = venueDetailsQuery.data?.missing === true;
  const loading =
    venueDetailsQuery.isLoading ||
    venueContactsQuery.isLoading ||
    stagehandProvidersQuery.isLoading;
  const error =
    venueDetailsQuery.error ||
    venueContactsQuery.error ||
    stagehandProvidersQuery.error;
  const currentStagehandValue =
    currentStagehandProviderId == null ? '' : String(currentStagehandProviderId);
  const stagehandDirty = hasStagehandUserEdited && stagehandProviderId !== currentStagehandValue;
  useEffect(() => {
    onDirtyChange?.(stagehandDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, stagehandDirty]);

  if (venueCompanyId == null || venueCompanyId < 1) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-primary">Production</h3>
        <p className="text-sm text-text-muted mt-3">
          No venue is linked to this engagement.
        </p>
      </div>
    );
  }

  const stagehandSaveDisabled =
    !stagehandDirty ||
    loading ||
    venueDetailsMissing ||
    saveStagehandProviderMutation.isPending;

  const handleSave = () => {
    const providerCompanyId =
      stagehandProviderId.trim() === '' ? null : Number(stagehandProviderId);
    if (providerCompanyId != null && (!Number.isInteger(providerCompanyId) || providerCompanyId < 1)) {
      addToast('Choose a valid stagehand provider.', 'warning');
      return;
    }
    saveStagehandProviderMutation.mutate(providerCompanyId);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-text-muted text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading production details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm py-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(error)}
          <button
            type="button"
            onClick={() => {
              void venueDetailsQuery.refetch();
              void venueContactsQuery.refetch();
              void stagehandProvidersQuery.refetch();
            }}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-text-primary">Production</h3>
        {venueLabel && (
          <p className="text-xs text-text-muted mt-1">
            Venue: <span className="text-text-secondary">{venueLabel}</span>
          </p>
        )}
      </div>

      {venueDetailsMissing && (
        <div className="rounded-md border border-ems-amber/35 bg-ems-amber-dim px-3 py-2 text-sm text-text-secondary">
          This venue does not have a venue profile row yet, so stagehand provider changes cannot be saved.
        </div>
      )}

      <div
        className="relative rounded-lg border border-border bg-surface/40 p-4"
        aria-busy={saveStagehandProviderMutation.isPending}
      >
        {saveStagehandProviderMutation.isPending && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
              <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" />
              Saving to database...
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-x-6 gap-y-5">
          <FormField label="Venue production manager contact information">
            <div className="min-h-[42px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
              {productionManagerContacts.length === 0 ? (
                <span className="text-text-muted">
                  No production manager contact assigned to this venue.
                </span>
              ) : (
                <ul className="space-y-2">
                  {productionManagerContacts.map((contact) => {
                    const name = compactContactName(contact) || contact.email;
                    const phone = contactPhoneDisplay(contact);
                    return (
                      <li
                        key={contact.contactAssignmentId}
                        className="flex flex-col gap-0.5"
                      >
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-text-secondary">
                          {[contact.email, phone].filter(Boolean).join(' | ') || '-'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </FormField>

          <FormField label="Stagehand provider">
            <Select2
              options={stagehandProviderOptions}
              value={stagehandProviderId}
              onChange={(value) => {
                markStagehandUserEdited();
                setStagehandProviderId(value);
              }}
              placeholder="None"
              allowClear
              disabled={venueDetailsMissing || saveStagehandProviderMutation.isPending}
            />
          </FormField>
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSave}
            disabled={stagehandSaveDisabled}
          >
            {saveStagehandProviderMutation.isPending ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save production fields'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Taxation tab (EngagementFinances + NonResidentWithholding links)
// ---------------------------------------------------------------------------
function financeLookupLinkValue(
  link: NonNullable<
    ApiEngagementFinanceLookups['nonResidentWithholdings'][number]['iaeWaiverInstructions']
  > | null | undefined,
): string {
  const url = String(link?.linkUrl ?? '').trim();
  if (url) return url;
  return String(link?.linkPath ?? '').trim();
}

function TaxationEditableLinkField({
  label,
  value,
  onChange,
  disabled,
  hasWithholding,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  hasWithholding: boolean;
}) {
  const trimmed = value.trim();
  return (
    <FormField label={label}>
      <input
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="url"
        inputMode="url"
        placeholder="SharePoint Link"
        disabled={disabled || !hasWithholding}
      />
      {trimmed ? (
        <a
          href={trimmed}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-ems-accent hover:underline"
        >
          Open link
        </a>
      ) : (
        <p className="mt-1 text-xs text-text-muted">
          {hasWithholding
            ? 'Stored on the selected withholding record through dbo.Link.'
            : 'Select a withholding record before attaching this link.'}
        </p>
      )}
    </FormField>
  );
}

function EngagementTaxationPanel({
  engagementId,
  venueCompanyId,
  venueLabel,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  venueCompanyId: number | null;
  venueLabel: string | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [withholdingFk, setWithholdingFk] = useState('');
  const [iaeConfNum, setIaeConfNum] = useState('');
  const [iaeSubmitDate, setIaeSubmitDate] = useState(getTodayDateString());
  const [iaeStatus, setIaeStatus] = useState('');
  const [iaeWaiverLink, setIaeWaiverLink] = useState('');
  const [artistWaiverLink, setArtistWaiverLink] = useState('');
  const {
    hasUserEdited: hasTaxationUserEdited,
    markUserEdited: markTaxationUserEdited,
    clearUserEdited: clearTaxationUserEdited,
  } = useUserEditTracker(engagementId);

  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const lookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
    retry: 1,
  });

  const venueDetailsQuery = useQuery({
    queryKey: ['companies', venueCompanyId, 'venue-details'],
    queryFn: () => fetchVenueDetails(venueCompanyId!),
    enabled: venueCompanyId != null && venueCompanyId > 0,
  });

  const ldata = lookupsQuery.data as ApiEngagementFinanceLookups | undefined;

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setWithholdingFk(intFieldToString(d.requiredNonResidentWithholdingId));
    setIaeConfNum(d.iaeWaiverApplicationConfirmationNumber ?? '');
    setIaeSubmitDate(d.iaeWaiverApplicationSubmissionDate ?? '');
    setIaeStatus(d.iaeApplicationWaiverStatus ?? '');
  }, [financeQuery.data]);

  const withholdingRows = useMemo(
    () => ldata?.nonResidentWithholdings ?? [],
    [ldata?.nonResidentWithholdings],
  );

  const withholdingSelectOptions = useMemo((): Select2Option[] => {
    const base = withholdingRows.map((r) => ({ value: String(r.id), label: r.label }));
    if (withholdingFk && !base.some((o) => o.value === withholdingFk)) {
      return [{ value: withholdingFk, label: 'Current selection (saved)' }, ...base];
    }
    return base;
  }, [withholdingRows, withholdingFk]);

  const iaeStatusSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.iaeApplicationWaiverStatuses ?? [];
    const base = rows.map((r) => ({ value: r.value, label: r.label }));
    if (iaeStatus && !base.some((o) => o.value === iaeStatus)) {
      return [{ value: iaeStatus, label: `${iaeStatus} (saved)` }, ...base];
    }
    return base;
  }, [ldata?.iaeApplicationWaiverStatuses, iaeStatus]);

  const selectedWithholding = useMemo(() => {
    const id = fkIdStringToNumber(withholdingFk);
    if (id == null) return null;
    return withholdingRows.find((row) => row.id === id) ?? null;
  }, [withholdingRows, withholdingFk]);

  useEffect(() => {
    setIaeWaiverLink(financeLookupLinkValue(selectedWithholding?.iaeWaiverInstructions));
    setArtistWaiverLink(financeLookupLinkValue(selectedWithholding?.artistWaiverInstructions));
  }, [selectedWithholding]);

  const venueDefaultWithholdingId = useMemo(() => {
    const d = venueDetailsQuery.data;
    if (!d || !('nonResidentWithholdingId' in d)) return null;
    return d.nonResidentWithholdingId ?? null;
  }, [venueDetailsQuery.data]);

  const venueDefaultWithholding = useMemo(
    () =>
      venueDefaultWithholdingId == null
        ? null
        : withholdingRows.find((row) => row.id === venueDefaultWithholdingId) ?? null,
    [venueDefaultWithholdingId, withholdingRows],
  );

  const createWithholdingMut = useMutation({
    mutationFn: () => createEngagementWithholding(engagementId),
    onSuccess: async (created) => {
      setWithholdingFk(String(created.withholdingId));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] }),
        qc.invalidateQueries({ queryKey: ['engagements', 'finance-lookups'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId] }),
        venueCompanyId != null && venueCompanyId > 0
          ? qc.invalidateQueries({ queryKey: ['companies', venueCompanyId, 'venue-details'] })
          : Promise.resolve(),
      ]);
      addToast('Withholding record created and attached to this engagement.', 'success');
    },
    onError: (e) =>
      addToast(friendlyApiError(e, 'Could not create a withholding record.'), 'error'),
  });

  const saveMut = useMutation({
    mutationFn: async ({
      financeBody,
      withholdingId,
      linkBody,
    }: {
      financeBody: UpdateEngagementFinancePayload;
      withholdingId: number | null;
      linkBody: UpdateNonResidentWithholdingLinksPayload | null;
    }) => {
      await updateEngagementFinance(engagementId, financeBody);
      if (withholdingId != null && linkBody) {
        await updateNonResidentWithholdingLinks(withholdingId, linkBody);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', 'finance-lookups'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      if (venueCompanyId != null && venueCompanyId > 0) {
        await qc.invalidateQueries({ queryKey: ['companies', venueCompanyId, 'venue-details'] });
      }
      clearTaxationUserEdited();
      addToast('Taxation details saved.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save taxation details.'), 'error'),
  });

  const buildTaxationBody = (): UpdateEngagementFinancePayload | null => {
    const w = fkIdStringToNumber(withholdingFk);
    if (withholdingFk.trim() !== '' && w == null) {
      addToast('Select a valid non-resident withholding, or clear the field.', 'warning');
      return null;
    }
    const date = iaeSubmitDate.trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      addToast('IAE waiver submission date must be YYYY-MM-DD or empty.', 'warning');
      return null;
    }
    return {
      requiredNonResidentWithholdingId: w,
      iaeWaiverApplicationConfirmationNumber: iaeConfNum.trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate: date || null,
      iaeApplicationWaiverStatus: iaeStatus.trim() || null,
    };
  };

  const taxationDirtyRaw = useMemo(() => {
    const r = financeQuery.data;
    if (!r) return false;
    const w = fkIdStringToNumber(withholdingFk);
    if (withholdingFk.trim() !== '' && w == null) return true;
    const current = JSON.stringify({
      requiredNonResidentWithholdingId: w,
      iaeWaiverApplicationConfirmationNumber:
        iaeConfNum.trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate: iaeSubmitDate.trim() || null,
      iaeApplicationWaiverStatus: iaeStatus.trim() || null,
    });
    const base = JSON.stringify({
      requiredNonResidentWithholdingId: r.requiredNonResidentWithholdingId ?? null,
      iaeWaiverApplicationConfirmationNumber:
        (r.iaeWaiverApplicationConfirmationNumber ?? '').trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate:
        (r.iaeWaiverApplicationSubmissionDate ?? '').trim() || null,
      iaeApplicationWaiverStatus: (r.iaeApplicationWaiverStatus ?? '').trim() || null,
    });
    const currentIaeLink = iaeWaiverLink.trim() || null;
    const currentArtistLink = artistWaiverLink.trim() || null;
    const baseIaeLink =
      financeLookupLinkValue(selectedWithholding?.iaeWaiverInstructions).trim() || null;
    const baseArtistLink =
      financeLookupLinkValue(selectedWithholding?.artistWaiverInstructions).trim() || null;
    return (
      current !== base ||
      (selectedWithholding != null &&
        (currentIaeLink !== baseIaeLink || currentArtistLink !== baseArtistLink))
    );
  }, [
    financeQuery.data,
    withholdingFk,
    iaeConfNum,
    iaeSubmitDate,
    iaeStatus,
    iaeWaiverLink,
    artistWaiverLink,
    selectedWithholding,
  ]);

  const taxationDirty = hasTaxationUserEdited && taxationDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(taxationDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, taxationDirty]);

  const handleSave = () => {
    const financeBody = buildTaxationBody();
    if (!financeBody) return;

    const iaeTrim = iaeWaiverLink.trim();
    const artistTrim = artistWaiverLink.trim();
    if ((iaeTrim || artistTrim) && !selectedWithholding) {
      addToast('Select a withholding record before attaching waiver links.', 'warning');
      return;
    }
    if (!isValidHttpOrHttpsUrl(iaeTrim)) {
      addToast('Link to IAE waiver must be a valid http(s) URL, or left empty.', 'warning');
      return;
    }
    if (!isValidHttpOrHttpsUrl(artistTrim)) {
      addToast('Link to artist waiver must be a valid http(s) URL, or left empty.', 'warning');
      return;
    }

    const baseIaeLink =
      financeLookupLinkValue(selectedWithholding?.iaeWaiverInstructions).trim() || null;
    const baseArtistLink =
      financeLookupLinkValue(selectedWithholding?.artistWaiverInstructions).trim() || null;
    const linkDirty =
      selectedWithholding != null &&
      ((iaeTrim || null) !== baseIaeLink || (artistTrim || null) !== baseArtistLink);

    saveMut.mutate({
      financeBody,
      withholdingId: selectedWithholding?.id ?? null,
      linkBody: linkDirty
        ? {
            iaeWaiverInstructionsUrl: iaeTrim || null,
            artistWaiverInstructionsUrl: artistTrim || null,
          }
        : null,
    });
  };

  const loading =
    (financeQuery.isLoading && !financeQuery.data) ||
    lookupsQuery.isLoading ||
    (venueCompanyId != null && venueCompanyId > 0 && venueDetailsQuery.isLoading);
  const error = financeQuery.error ?? lookupsQuery.error ?? venueDetailsQuery.error;
  const disabled = saveMut.isPending || createWithholdingMut.isPending || loading;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-text-muted text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading taxation details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm py-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(error)}
          <button
            type="button"
            onClick={() => {
              void financeQuery.refetch();
              void lookupsQuery.refetch();
              void venueDetailsQuery.refetch();
            }}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-text-primary">Taxation</h3>
        {venueLabel && (
          <p className="text-xs text-text-muted mt-1">
            Venue: <span className="text-text-secondary">{venueLabel}</span>
          </p>
        )}
      </div>

      <div
        className="relative rounded-lg border border-border bg-surface/40 p-4"
        aria-busy={saveMut.isPending || createWithholdingMut.isPending}
      >
        {(saveMut.isPending || createWithholdingMut.isPending) && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
              <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" />
              {createWithholdingMut.isPending ? 'Creating withholding record...' : 'Saving to database...'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <FormField label="Required non-resident withholding?">
            <Select2
              options={withholdingSelectOptions}
              value={withholdingFk}
              onChange={(value) => {
                markTaxationUserEdited();
                setWithholdingFk(value);
              }}
              placeholder="No / not required"
              allowClear
              disabled={disabled}
            />
            {venueDefaultWithholding && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span>Venue default: {venueDefaultWithholding.label}</span>
                {withholdingFk !== String(venueDefaultWithholding.id) && (
                  <button
                    type="button"
                    className="text-ems-accent hover:underline disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => {
                      markTaxationUserEdited();
                      setWithholdingFk(String(venueDefaultWithholding.id));
                    }}
                  >
                    Use venue default
                  </button>
                )}
              </div>
            )}
            {withholdingRows.length === 0 && !withholdingFk && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p>
                  No withholding records exist yet. Create one to attach IAE and artist
                  waiver links for this engagement.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-8 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  disabled={disabled}
                  onClick={() => createWithholdingMut.mutate()}
                >
                  {createWithholdingMut.isPending ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create withholding record'
                  )}
                </Button>
              </div>
            )}
          </FormField>

          <FormField label="IAE waiver application confirmation number">
            <input
              className={inputCls}
              value={iaeConfNum}
              maxLength={100}
              onChange={(e) => {
                markTaxationUserEdited();
                setIaeConfNum(e.target.value);
              }}
              disabled={disabled}
            />
          </FormField>

          <FormField label="IAE waiver submission date">
            <input
              type="date"
              className={inputCls}
              value={iaeSubmitDate}
              onChange={(e) => {
                markTaxationUserEdited();
                setIaeSubmitDate(e.target.value);
              }}
              disabled={disabled}
            />
          </FormField>

          <FormField label="IAE waiver application status">
            <Select2
              options={iaeStatusSelectOptions}
              value={iaeStatus}
              onChange={(value) => {
                markTaxationUserEdited();
                setIaeStatus(value);
              }}
              placeholder="Select status..."
              allowClear
              disabled={disabled}
            />
          </FormField>

          <TaxationEditableLinkField
            label="Link to IAE waiver"
            value={iaeWaiverLink}
            onChange={(value) => {
              markTaxationUserEdited();
              setIaeWaiverLink(value);
            }}
            disabled={disabled}
            hasWithholding={selectedWithholding != null}
          />

          <TaxationEditableLinkField
            label="Link to artist waiver"
            value={artistWaiverLink}
            onChange={(value) => {
              markTaxationUserEdited();
              setArtistWaiverLink(value);
            }}
            disabled={disabled}
            hasWithholding={selectedWithholding != null}
          />
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSave}
            disabled={disabled || !taxationDirty}
          >
            {saveMut.isPending ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save taxation fields'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Performance Row
// ---------------------------------------------------------------------------
function EditablePerformanceRow({
  perf,
  isPrimary,
  engagementId,
  allowDeleteShow,
  onRefresh,
  addToast,
}: {
  perf: {
    performanceId: number;
    performanceDate: string;
    performanceTime: string;
    performanceStatus: string;
  };
  isPrimary: boolean;
  engagementId: number;
  allowDeleteShow: boolean;
  onRefresh: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(perf.performanceDate);
  const [time, setTime] = useState(perf.performanceTime.slice(0, 5));
  const [status, setStatus] = useState(perf.performanceStatus);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rowInputCls =
    'w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/20';

  const handleSave = async () => {
    if (!date) { addToast('Date is required.', 'warning'); return; }
    if (!time) { addToast('Show time is required.', 'warning'); return; }
    setSaving(true);
    try {
      await updateEngagementPerformance(engagementId, perf.performanceId, {
        performanceDate: date,
        performanceTime: time,
        performanceStatus: status || 'Public',
      });
      addToast('Performance updated.', 'success');
      setEditing(false);
      onRefresh();
    } catch (e) {
      addToast(friendlyApiError(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEngagementPerformance(engagementId, perf.performanceId);
      addToast('Performance removed.', 'warning');
      setConfirmDelete(false);
      onRefresh();
    } catch (e) {
      addToast(friendlyApiError(e), 'error');
    } finally {
      setDeleting(false); }
  };

  if (editing) {
    return (
      <li className="border border-ems-accent/40 rounded-lg px-4 py-3 bg-ems-accent/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1 font-medium">Date *</label>
            <input
              type="date"
              className={rowInputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1 font-medium">Show Time *</label>
            <input
              type="time"
              className={rowInputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1 font-medium">Status</label>
            <Select2
              options={PERFORMANCE_STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Status…"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => { setEditing(false); setDate(perf.performanceDate); setTime(perf.performanceTime.slice(0, 5)); setStatus(perf.performanceStatus); }}
            disabled={saving}
            className="text-text-secondary text-xs px-3 py-1.5 hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-ems-accent text-background text-xs px-4 py-1.5 rounded-md font-medium disabled:opacity-60 hover:bg-ems-accent/90 transition-colors"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <li className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-lg px-4 py-3 bg-surface/40 group hover:border-border/80 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <CalendarDays className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">
              {formatPerformanceDateDisplay(perf.performanceDate)}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              Show {formatPerformanceTimeDisplay(perf.performanceTime)}
              {' · '}
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  perf.performanceStatus === 'Public'
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-surface text-text-muted'
                }`}
              >
                {perf.performanceStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPrimary && (
            <span className="text-xs font-medium bg-ems-accent/15 text-ems-accent px-2 py-0.5 rounded mr-1">
              First
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-text-secondary hover:text-ems-accent px-2.5 py-1.5 rounded hover:bg-elevated transition-colors"
          >
            Edit
          </button>
          {allowDeleteShow && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-text-secondary hover:text-ems-coral px-2.5 py-1.5 rounded hover:bg-elevated transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </li>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete performance?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the performance on{' '}
              <strong>{formatPerformanceDateDisplay(perf.performanceDate)}</strong> at{' '}
              <strong>{formatPerformanceTimeDisplay(perf.performanceTime)}</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </span>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Finance tab — dbo.EngagementFinances (1:1 per engagement)
// ---------------------------------------------------------------------------
function numFieldToString(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '';
  return String(v);
}

function intFieldToString(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '';
  return String(v);
}

function parseOptionalDecimal(
  s: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = s.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n)) {
    return { ok: false, message: `${label} must be a valid number.` };
  }
  return { ok: true, value: n };
}

function parseOptionalInt(
  s: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = s.trim();
  if (t === '') return { ok: true, value: null };
  if (!/^-?\d+$/.test(t)) {
    return { ok: false, message: `${label} must be a whole number.` };
  }
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) {
    return { ok: false, message: `${label} must be a valid integer.` };
  }
  return { ok: true, value: n };
}

function boolToConfPacket(b: boolean | null | undefined): string {
  if (b == null) return '';
  return b ? '1' : '0';
}

function fkIdStringToNumber(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Empty is allowed; otherwise must be a valid absolute URL with http: or https: */
function isValidHttpOrHttpsUrl(raw: string): boolean {
  const t = raw.trim();
  if (t === '') return true;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Same tri-state pattern as other EMS forms; value '' = not set in API */
const CONFIRMATION_PACKET_SELECT_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: '1', label: 'Yes' },
  { value: '0', label: 'No' },
];

type EngagementDetailLookups = {
  attractions: ApiAttractionListRow[];
  tours: ApiTourListRow[];
  companies: ApiCompanyListRow[];
};

const MAIN_INFO_STAFF_FIELDS = [
  { key: 'talentBuyer', label: 'Talent Buyer', aliases: ['Talent Buyer', 'IAE Talent Buyer'] },
  { key: 'bookingManager', label: 'Booking Manager', aliases: ['Booking Manager', 'IAE Booking Manager'] },
  {
    key: 'marketingDirector',
    label: 'Marketing Director',
    aliases: ['Event Marketing Director', 'Marketing Director', 'IAE Marketing Director'],
  },
  {
    key: 'marketingManager',
    label: 'Marketing Manager',
    aliases: ['Event Marketing Manager', 'Marketing Manager', 'IAE Marketing Manager'],
  },
  {
    key: 'marketingCoordinator',
    label: 'Marketing Coordinator',
    aliases: ['Event Marketing Coordinator', 'Marketing Coordinator', 'IAE Marketing Coordinator'],
  },
  {
    key: 'productionManagerAdvance',
    label: 'Production Manager Advance',
    aliases: ['Production Manager', 'Production Manager Advance', 'IAE Production Manager Advance'],
    noteMarker: 'main-info:production-manager-advance',
  },
  {
    key: 'productionManagerOnSite',
    label: 'Production Manager On Site',
    aliases: ['Production Manager', 'Production Manager On Site', 'IAE Production Manager On Site'],
    noteMarker: 'main-info:production-manager-on-site',
  },
] as const;

type MainInfoStaffKey = (typeof MAIN_INFO_STAFF_FIELDS)[number]['key'];

function blankMainInfoStaffSelections(): Record<MainInfoStaffKey, string> {
  return MAIN_INFO_STAFF_FIELDS.reduce(
    (acc, field) => {
      acc[field.key] = '';
      return acc;
    },
    {} as Record<MainInfoStaffKey, string>,
  );
}

function normalizeRoleMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMainInfoRoleId(
  roles: { id: number; label: string }[] | undefined,
  aliases: readonly string[],
): number | null {
  const normalizedAliases = new Set(aliases.map(normalizeRoleMatchText));
  const match = (roles ?? []).find((role) =>
    normalizedAliases.has(normalizeRoleMatchText(role.label)),
  );
  return match?.id ?? null;
}

function mainInfoClockParts(sqlTime: string | null | undefined) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec((sqlTime ?? '').trim());
  const hour24 = m ? Math.min(23, Math.max(0, Number(m[1]))) : 19;
  const minute = m ? Math.min(59, Math.max(0, Number(m[2]))) : 30;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
    period,
  };
}

function mainInfoClockToSqlTime(hour: string, minute: string, period: string): string | null {
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || h < 1 || h > 12) return null;
  if (!Number.isInteger(m) || m < 0 || m > 59) return null;
  let hour24 = h % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function normalizeMoneySnapshot(raw: string): number | null | string {
  const p = parseOptionalDecimal(raw, 'Amount');
  if (!p.ok) return `__invalid__:${raw}`;
  return p.value;
}

function confPacketStringToBool(raw: string): boolean | null {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

function companyIsVenue(row: ApiCompanyListRow): boolean {
  const names = [...(row.companyTypeNames ?? []), row.companyTypeName ?? ''];
  return names.some((name) => name.trim().toLowerCase() === 'venue');
}

function companyIsPromoter(row: ApiCompanyListRow): boolean {
  return (row.serviceProvidedNames ?? []).some(
    (name) => name.trim().toLowerCase() === 'promoter',
  );
}

function providerIsPromoter(row: ApiEngagementServiceProviderRow): boolean {
  return row.serviceProvidedNames.some((name) => name.trim().toLowerCase() === 'promoter');
}

function mainInfoDateTimeSnapshot(date: string, hour: string, minute: string, period: string) {
  const d = date.trim();
  if (!d) return { date: null as string | null, time: null as string | null };
  return {
    date: d,
    time: mainInfoClockToSqlTime(hour, minute, period) ?? '__invalid_time__',
  };
}

function EngagementMainInformationPanel({
  engagementId,
  row,
  lookups,
  lookupsLoading,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  row: ApiEngagementListRow;
  lookups: EngagementDetailLookups | undefined;
  lookupsLoading: boolean;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [attractionId, setAttractionId] = useState('');
  const [tourId, setTourId] = useState('');
  const [venueCompanyId, setVenueCompanyId] = useState('');
  const [complexCompanyId, setComplexCompanyId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPostal, setAddressPostal] = useState('');
  const [addressCountry, setAddressCountry] = useState('USA');
  const [openingDate, setOpeningDate] = useState(getTodayDateString());
  const [openingHour, setOpeningHour] = useState('07');
  const [openingMinute, setOpeningMinute] = useState('30');
  const [openingPeriod, setOpeningPeriod] = useState('PM');
  const [brandId, setBrandId] = useState('');
  const [dmaId, setDmaId] = useState('');
  const [engagementStatus, setEngagementStatus] = useState(row.engagementStatus);
  const [engagementScaling, setEngagementScaling] = useState(row.engagementScaling ?? '');
  const [ticketingStatus, setTicketingStatus] = useState('');
  const [grossPotential, setGrossPotential] = useState('');
  const [estimatedBreakeven, setEstimatedBreakeven] = useState('');
  const [confirmationPacketApproved, setConfirmationPacketApproved] = useState('');
  const [sharePointFolderLink, setSharePointFolderLink] = useState('');
  const [promoterPartnerCompanyId, setPromoterPartnerCompanyId] = useState('');
  const [staffSelections, setStaffSelections] = useState<Record<MainInfoStaffKey, string>>(
    blankMainInfoStaffSelections,
  );
  const {
    hasUserEdited: hasMainInfoUserEdited,
    markUserEdited: markMainInfoUserEdited,
    clearUserEdited: clearMainInfoUserEdited,
  } = useUserEditTracker(engagementId);

  useEffect(() => {
    setAttractionId(row.attractionId != null ? String(row.attractionId) : '');
    setTourId(row.tourId != null ? String(row.tourId) : '');
    setVenueCompanyId(row.primaryVenueCompanyId != null ? String(row.primaryVenueCompanyId) : '');
    setEngagementStatus(row.engagementStatus);
    setEngagementScaling(row.engagementScaling ?? '');
    setGrossPotential(numFieldToString(row.grossPotential));
  }, [
    row.attractionId,
    row.tourId,
    row.primaryVenueCompanyId,
    row.engagementStatus,
    row.engagementScaling,
    row.grossPotential,
  ]);

  const selectedVenueId = fkIdStringToNumber(venueCompanyId);

  const venueCompanyQuery = useQuery({
    queryKey: ['companies', 'detail', selectedVenueId],
    queryFn: () => fetchCompany(selectedVenueId!),
    enabled: selectedVenueId != null,
    retry: 1,
  });

  const venueProfileQuery = useQuery({
    queryKey: ['companies', selectedVenueId, 'venue-profile'],
    queryFn: () => fetchVenueProfile(selectedVenueId!),
    enabled: selectedVenueId != null,
    retry: 1,
  });

  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const serviceProvidersQuery = useQuery({
    queryKey: ['engagements', engagementId, 'service-providers'],
    queryFn: () => fetchEngagementServiceProviders(engagementId),
    retry: 1,
  });

  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
    retry: 1,
  });

  const openingPerformance = useMemo(() => {
    const rows = [...(performancesQuery.data ?? [])];
    rows.sort((a, b) => {
      const ad = `${a.performanceDate} ${a.performanceTime}`;
      const bd = `${b.performanceDate} ${b.performanceTime}`;
      return ad.localeCompare(bd);
    });
    return rows[0] ?? null;
  }, [performancesQuery.data]);

  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', openingPerformance?.performanceId ?? null],
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, openingPerformance!.performanceId),
    enabled: openingPerformance != null,
    retry: 1,
  });

  const iaeLookupsQuery = useQuery({
    queryKey: ['engagements', 'iae-contact-lookups'],
    queryFn: fetchEngagementIaeContactLookups,
    staleTime: 300_000,
  });

  const iaeContactsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'iae-contacts'],
    queryFn: () => fetchEngagementIaeContacts(engagementId),
    retry: 1,
  });

  const companyLookupsQuery = useQuery({
    queryKey: ['company-lookups', 'main-information'],
    queryFn: fetchLookups,
    staleTime: 300_000,
  });

  const complexesQuery = useQuery({
    queryKey: ['companies', 'picker', 'entertainment-complex', 'main-information'],
    queryFn: fetchEntertainmentComplexCompanyRows,
    staleTime: 300_000,
  });

  const dmasQuery = useQuery({
    queryKey: ['lookups', 'dma-markets', 'main-information'],
    queryFn: () => fetchDmaMarketsPaged(0, 5000),
    staleTime: 300_000,
  });

  useEffect(() => {
    const company = venueCompanyQuery.data;
    if (!company) return;
    setAddressLine1(company.physicalAddress?.addressLine1 ?? '');
    setAddressCity(company.physicalAddress?.city ?? '');
    setAddressState(company.physicalAddress?.stateProvince ?? '');
    setAddressPostal(company.physicalAddress?.postalCode ?? '');
    setAddressCountry(company.physicalAddress?.country ?? 'USA');
    setDmaId(company.dmaId != null ? String(company.dmaId) : '');
  }, [venueCompanyQuery.data]);

  useEffect(() => {
    const profile = venueProfileQuery.data;
    if (!profile || profile.missing) {
      setComplexCompanyId('');
      setBrandId('');
      return;
    }
    setComplexCompanyId(profile.entertainmentComplexCompanyIds[0] != null ? String(profile.entertainmentComplexCompanyIds[0]) : '');
    setBrandId(profile.brandIds[0] != null ? String(profile.brandIds[0]) : '');
  }, [venueProfileQuery.data]);

  useEffect(() => {
    if (!financeQuery.data) return;
    setEstimatedBreakeven(numFieldToString(financeQuery.data.estimatedBreakeven));
    setConfirmationPacketApproved(boolToConfPacket(financeQuery.data.confirmationPacketApproved));
    setSharePointFolderLink(financeQuery.data.settlementFileSharePointLink ?? '');
  }, [financeQuery.data]);

  useEffect(() => {
    const parts = mainInfoClockParts(openingPerformance?.performanceTime);
    setOpeningDate(openingPerformance?.performanceDate ?? '');
    setOpeningHour(parts.hour);
    setOpeningMinute(parts.minute);
    setOpeningPeriod(parts.period);
  }, [openingPerformance?.performanceDate, openingPerformance?.performanceTime]);

  useEffect(() => {
    if (!ticketingQuery.data) {
      setTicketingStatus('');
      return;
    }
    setTicketingStatus(ticketingQuery.data.ticketingStatus ?? '');
  }, [ticketingQuery.data]);

  useEffect(() => {
    const roles = iaeLookupsQuery.data?.roles;
    const rows = iaeContactsQuery.data ?? [];
    if (!roles) return;
    const next = blankMainInfoStaffSelections();
    for (const field of MAIN_INFO_STAFF_FIELDS) {
      const roleId = findMainInfoRoleId(roles, field.aliases);
      if (roleId == null) continue;
      const match = rows.find((item) => item.roleId === roleId);
      if (match) next[field.key] = String(match.contactId);
    }
    setStaffSelections(next);
  }, [iaeLookupsQuery.data?.roles, iaeContactsQuery.data]);

  const sortedAttractions = useMemo(
    () =>
      [...(lookups?.attractions ?? [])].sort((a, b) =>
        a.attractionName.localeCompare(b.attractionName, undefined, { sensitivity: 'base' }),
      ),
    [lookups?.attractions],
  );

  const attractionOptions = useMemo(
    () => sortedAttractions.map((a) => ({ value: String(a.attractionId), label: a.attractionName })),
    [sortedAttractions],
  );

  const selectedAttractionId = fkIdStringToNumber(attractionId);
  const toursForAttraction = useMemo(
    () =>
      (lookups?.tours ?? [])
        .filter((tour) => selectedAttractionId == null || tour.attractionId === selectedAttractionId)
        .sort((a, b) => a.tourName.localeCompare(b.tourName, undefined, { sensitivity: 'base' })),
    [lookups?.tours, selectedAttractionId],
  );

  const tourOptions = useMemo(
    () => toursForAttraction.map((tour) => ({ value: String(tour.tourId), label: tour.tourName })),
    [toursForAttraction],
  );

  const venueOptions = useMemo(
    () =>
      companyToSelect2Options((lookups?.companies ?? []).filter(companyIsVenue)),
    [lookups?.companies],
  );

  const currentPromoterProviders = useMemo(
    () => (serviceProvidersQuery.data?.providers ?? []).filter(providerIsPromoter),
    [serviceProvidersQuery.data?.providers],
  );

  const currentPromoterProviderId = currentPromoterProviders[0]?.providerCompanyId ?? null;

  useEffect(() => {
    setPromoterPartnerCompanyId(currentPromoterProviderId == null ? '' : String(currentPromoterProviderId));
  }, [currentPromoterProviderId]);

  const promoterPartnerOptions = useMemo((): Select2Option[] => {
    const optionMap = new Map<string, Select2Option>();
    for (const company of (lookups?.companies ?? []).filter(companyIsPromoter)) {
      const option = companyToSelect2Option(company);
      optionMap.set(option.value, option);
    }
    for (const provider of currentPromoterProviders) {
      const value = String(provider.providerCompanyId);
      if (!optionMap.has(value)) {
        optionMap.set(value, {
          value,
          label: provider.providerCompanyName ?? `Company #${provider.providerCompanyId}`,
        });
      }
    }
    return [
      { value: '', label: '---' },
      ...Array.from(optionMap.values())
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    ];
  }, [currentPromoterProviders, lookups?.companies]);

  const complexOptions = useMemo(
    () => [
      { value: '', label: '---' },
      ...companyToSelect2Options(complexesQuery.data ?? []),
    ],
    [complexesQuery.data],
  );

  const brandOptions = useMemo(
    () => [
      { value: '', label: '---' },
      ...(companyLookupsQuery.data?.brands ?? [])
        .slice()
        .sort((a, b) => a.brandName.localeCompare(b.brandName, undefined, { sensitivity: 'base' }))
        .map((brand) => ({ value: String(brand.brandId), label: brand.brandName })),
    ],
    [companyLookupsQuery.data?.brands],
  );

  const dmaOptions = useMemo(() => {
    const rows = dmasQuery.data?.data ?? [];
    const opts = rows
      .slice()
      .sort((a, b) => a.marketName.localeCompare(b.marketName, undefined, { sensitivity: 'base' }))
      .map((dma) => ({ value: String(dma.dmaid), label: dma.marketName }));
    const current = venueCompanyQuery.data;
    if (current?.dmaId != null && current.dmaMarketName && !opts.some((opt) => opt.value === String(current.dmaId))) {
      opts.unshift({ value: String(current.dmaId), label: current.dmaMarketName });
    }
    return opts;
  }, [dmasQuery.data?.data, venueCompanyQuery.data]);

  const contactOptions = useMemo(
    () => [
      { value: '', label: '---' },
      ...(iaeLookupsQuery.data?.contacts ?? []).map((contact) => ({
        value: String(contact.id),
        label: contact.label,
      })),
    ],
    [iaeLookupsQuery.data?.contacts],
  );

  const roleIdsByStaffKey = useMemo(() => {
    const roles = iaeLookupsQuery.data?.roles;
    const ids = {} as Record<MainInfoStaffKey, number | null>;
    for (const field of MAIN_INFO_STAFF_FIELDS) {
      ids[field.key] = findMainInfoRoleId(roles, field.aliases);
    }
    return ids;
  }, [iaeLookupsQuery.data?.roles]);

  const staffRowsByKey = useMemo(() => {
    const result = {} as Record<MainInfoStaffKey, ApiEngagementIaeContactRow | null>;
    for (const field of MAIN_INFO_STAFF_FIELDS) {
      const rid = roleIdsByStaffKey[field.key];
      if (rid == null) {
        result[field.key] = null;
        continue;
      }
      const rows = iaeContactsQuery.data ?? [];
      if ('noteMarker' in field) {
        result[field.key] =
          rows.find((row) => row.roleId === rid && row.notes === field.noteMarker) ?? null;
        continue;
      }
      result[field.key] =
        rows.find((row) => row.roleId === rid && !(row.notes ?? '').startsWith('main-info:')) ??
        rows.find((row) => row.roleId === rid) ??
        null;
    }
    return result;
  }, [iaeContactsQuery.data, roleIdsByStaffKey]);

  const hourOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => {
      const value = String(i + 1).padStart(2, '0');
      return { value, label: value };
    }),
    [],
  );

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => {
      const value = String(i).padStart(2, '0');
      return { value, label: value };
    }),
    [],
  );

  const periodOptions = useMemo<Select2Option[]>(
    () => [
      { value: 'AM', label: 'AM' },
      { value: 'PM', label: 'PM' },
    ],
    [],
  );

  const currentSnapshot = useMemo(() => {
    const staff = blankMainInfoStaffSelections();
    for (const field of MAIN_INFO_STAFF_FIELDS) {
      staff[field.key] = staffSelections[field.key] || '';
    }
    return {
      engagement: {
        engagementStatus: engagementStatus.trim(),
        engagementScaling: engagementScaling.trim() || null,
        tourId: fkIdStringToNumber(tourId),
        primaryVenueCompanyId: fkIdStringToNumber(venueCompanyId),
        grossPotential: normalizeMoneySnapshot(grossPotential),
      },
      venueCompany: {
        addressLine1: addressLine1.trim(),
        city: addressCity.trim(),
        stateProvince: addressState.trim(),
        postalCode: addressPostal.trim(),
        country: addressCountry.trim() || 'USA',
        dmaId: fkIdStringToNumber(dmaId),
      },
      venueProfile: {
        complexCompanyId: fkIdStringToNumber(complexCompanyId),
        brandId: fkIdStringToNumber(brandId),
      },
      opening: mainInfoDateTimeSnapshot(openingDate, openingHour, openingMinute, openingPeriod),
      finance: {
        estimatedBreakeven: normalizeMoneySnapshot(estimatedBreakeven),
        confirmationPacketApproved: confPacketStringToBool(confirmationPacketApproved),
        settlementFileSharePointLink: sharePointFolderLink.trim() || null,
      },
      promoterPartnerCompanyId: fkIdStringToNumber(promoterPartnerCompanyId),
      ticketing: {
        ticketingStatus: ticketingStatus.trim() ? ticketingStatus.trim().slice(0, 50) : null,
      },
      staff,
    };
  }, [
    addressCity,
    addressCountry,
    addressLine1,
    addressPostal,
    addressState,
    brandId,
    complexCompanyId,
    confirmationPacketApproved,
    dmaId,
    engagementScaling,
    engagementStatus,
    estimatedBreakeven,
    grossPotential,
    openingDate,
    openingHour,
    openingMinute,
    openingPeriod,
    promoterPartnerCompanyId,
    sharePointFolderLink,
    staffSelections,
    ticketingStatus,
    tourId,
    venueCompanyId,
  ]);

  const baseSnapshot = useMemo(() => {
    const company = venueCompanyQuery.data;
    const profile = venueProfileQuery.data;
    const finance = financeQuery.data;
    const parts = mainInfoClockParts(openingPerformance?.performanceTime);
    const staff = blankMainInfoStaffSelections();
    for (const field of MAIN_INFO_STAFF_FIELDS) {
      const match = staffRowsByKey[field.key];
      staff[field.key] = match ? String(match.contactId) : '';
    }
    return {
      engagement: {
        engagementStatus: row.engagementStatus,
        engagementScaling: row.engagementScaling ?? null,
        tourId: row.tourId,
        primaryVenueCompanyId: row.primaryVenueCompanyId,
        grossPotential: row.grossPotential ?? null,
      },
      venueCompany: {
        addressLine1: company?.physicalAddress?.addressLine1?.trim() ?? '',
        city: company?.physicalAddress?.city?.trim() ?? '',
        stateProvince: company?.physicalAddress?.stateProvince?.trim() ?? '',
        postalCode: company?.physicalAddress?.postalCode?.trim() ?? '',
        country: company?.physicalAddress?.country?.trim() || 'USA',
        dmaId: company?.dmaId ?? null,
      },
      venueProfile: {
        complexCompanyId: !profile || profile.missing ? null : profile.entertainmentComplexCompanyIds[0] ?? null,
        brandId: !profile || profile.missing ? null : profile.brandIds[0] ?? null,
      },
      opening: mainInfoDateTimeSnapshot(
        openingPerformance?.performanceDate ?? '',
        parts.hour,
        parts.minute,
        parts.period,
      ),
      finance: {
        estimatedBreakeven: finance?.estimatedBreakeven ?? null,
        confirmationPacketApproved: finance?.confirmationPacketApproved ?? null,
        settlementFileSharePointLink: (finance?.settlementFileSharePointLink ?? '').trim() || null,
      },
      promoterPartnerCompanyId: currentPromoterProviderId,
      ticketing: {
        ticketingStatus: (ticketingQuery.data?.ticketingStatus ?? '').trim() || null,
      },
      staff,
    };
  }, [
    financeQuery.data,
    currentPromoterProviderId,
    openingPerformance?.performanceDate,
    openingPerformance?.performanceTime,
    row.engagementScaling,
    row.engagementStatus,
    row.grossPotential,
    row.primaryVenueCompanyId,
    row.tourId,
    staffRowsByKey,
    ticketingQuery.data?.ticketingStatus,
    venueCompanyQuery.data,
    venueProfileQuery.data,
  ]);

  const mainInfoDirtyRaw = useMemo(
    () => JSON.stringify(currentSnapshot) !== JSON.stringify(baseSnapshot),
    [baseSnapshot, currentSnapshot],
  );
  const mainInfoDirty = hasMainInfoUserEdited && mainInfoDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(mainInfoDirty);
    return () => onDirtyChange?.(false);
  }, [mainInfoDirty, onDirtyChange]);

  const loading =
    lookupsLoading ||
    financeQuery.isLoading ||
    serviceProvidersQuery.isLoading ||
    performancesQuery.isLoading ||
    iaeLookupsQuery.isLoading ||
    iaeContactsQuery.isLoading ||
    companyLookupsQuery.isLoading ||
    complexesQuery.isLoading ||
    dmasQuery.isLoading ||
    (selectedVenueId != null && (venueCompanyQuery.isLoading || venueProfileQuery.isLoading)) ||
    (openingPerformance != null && ticketingQuery.isLoading);

  const loadError =
    venueCompanyQuery.error ??
    venueProfileQuery.error ??
    financeQuery.error ??
    serviceProvidersQuery.error ??
    performancesQuery.error ??
    ticketingQuery.error ??
    iaeLookupsQuery.error ??
    iaeContactsQuery.error ??
    companyLookupsQuery.error ??
    complexesQuery.error ??
    dmasQuery.error;

  const saveMut = useMutation({
    mutationFn: async () => {
      const nextTourId = fkIdStringToNumber(tourId);
      const nextVenueId = fkIdStringToNumber(venueCompanyId);
      if (nextTourId == null) throw new Error('Select a tour before saving.');
      if (nextVenueId == null) throw new Error('Select a venue before saving.');
      if (!engagementStatus.trim()) throw new Error('Engagement status is required.');

      const gross = parseOptionalDecimal(grossPotential, 'Gross potential');
      if (!gross.ok) throw new Error(gross.message);
      if (gross.value != null && gross.value < 0) throw new Error('Gross potential cannot be negative.');
      const breakeven = parseOptionalDecimal(estimatedBreakeven, 'Estimated breakeven');
      if (!breakeven.ok) throw new Error(breakeven.message);
      if (breakeven.value != null && breakeven.value < 0) throw new Error('Estimated breakeven cannot be negative.');
      const folderLink = sharePointFolderLink.trim();
      if (!isValidHttpOrHttpsUrl(folderLink)) {
        throw new Error('Link to Folder on Sharepoint Server must be a valid http(s) URL, or left empty.');
      }

      const nextOpening = mainInfoDateTimeSnapshot(
        openingDate,
        openingHour,
        openingMinute,
        openingPeriod,
      );
      if (nextOpening.date && nextOpening.time === '__invalid_time__') {
        throw new Error('Opening time is invalid.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextOpening.date ?? '') && nextOpening.date) {
        throw new Error('Opening date must be YYYY-MM-DD or empty.');
      }

      const wantsAddressSave =
        JSON.stringify(currentSnapshot.venueCompany) !== JSON.stringify(baseSnapshot.venueCompany);
      if (wantsAddressSave) {
        for (const [label, value] of [
          ['Physical address street', addressLine1],
          ['Physical address city', addressCity],
          ['Physical address state', addressState],
          ['Physical address zip', addressPostal],
          ['Physical address country', addressCountry],
        ] as const) {
          if (!value.trim()) throw new Error(`${label} is required to save the venue address.`);
        }
      }

      if (JSON.stringify(currentSnapshot.engagement) !== JSON.stringify(baseSnapshot.engagement)) {
        await updateEngagement(engagementId, {
          engagementStatus: engagementStatus.trim().slice(0, 50),
          engagementScaling: engagementScaling.trim() ? engagementScaling.trim().slice(0, 50) : null,
          tourId: nextTourId,
          primaryVenueCompanyId: nextVenueId,
          grossPotential: gross.value,
        });
      }

      if (wantsAddressSave) {
        await updateCompany(nextVenueId, {
          physical: {
            addressLine1: addressLine1.trim(),
            city: addressCity.trim(),
            stateProvince: addressState.trim(),
            postalCode: addressPostal.trim(),
            country: addressCountry.trim(),
          },
          dmaId: fkIdStringToNumber(dmaId) ?? undefined,
        });
      }

      if (JSON.stringify(currentSnapshot.venueProfile) !== JSON.stringify(baseSnapshot.venueProfile)) {
        await updateVenueProfile(nextVenueId, {
          entertainmentComplexCompanyIds: currentSnapshot.venueProfile.complexCompanyId != null
            ? [currentSnapshot.venueProfile.complexCompanyId]
            : [],
          brandIds: currentSnapshot.venueProfile.brandId != null
            ? [currentSnapshot.venueProfile.brandId]
            : [],
        });
      }

      let targetPerformanceId = openingPerformance?.performanceId ?? null;
      if (JSON.stringify(currentSnapshot.opening) !== JSON.stringify(baseSnapshot.opening)) {
        if (!nextOpening.date || !nextOpening.time || nextOpening.time === '__invalid_time__') {
          throw new Error('Opening date and time are required when changing the opening performance.');
        }
        if (targetPerformanceId != null) {
          await updateEngagementPerformance(engagementId, targetPerformanceId, {
            performanceDate: nextOpening.date,
            performanceTime: nextOpening.time,
          });
        } else {
          const created = await createEngagementPerformance(engagementId, {
            performanceDate: nextOpening.date,
            performanceTime: nextOpening.time,
            performanceStatus: 'Public',
          });
          targetPerformanceId = created.performanceId;
        }
      }

      if (JSON.stringify(currentSnapshot.finance) !== JSON.stringify(baseSnapshot.finance)) {
        await updateEngagementFinance(engagementId, {
          estimatedBreakeven: breakeven.value,
          confirmationPacketApproved: confPacketStringToBool(confirmationPacketApproved),
          settlementFileSharePointLink: folderLink || null,
        });
      }

      if (
        currentSnapshot.promoterPartnerCompanyId !== baseSnapshot.promoterPartnerCompanyId
      ) {
        const selectedPromoterId = fkIdStringToNumber(promoterPartnerCompanyId);
        for (const provider of currentPromoterProviders) {
          if (provider.providerCompanyId !== selectedPromoterId) {
            await removeEngagementServiceProvider(engagementId, provider.providerCompanyId);
          }
        }
        if (
          selectedPromoterId != null &&
          !currentPromoterProviders.some(
            (provider) => provider.providerCompanyId === selectedPromoterId,
          )
        ) {
          await addEngagementServiceProvider(engagementId, {
            providerCompanyId: selectedPromoterId,
          });
        }
      }

      if (JSON.stringify(currentSnapshot.ticketing) !== JSON.stringify(baseSnapshot.ticketing)) {
        if (targetPerformanceId == null) {
          throw new Error('Add an opening performance before saving ticketing status.');
        }
        await updateEngagementPerformanceTicketing(engagementId, targetPerformanceId, {
          ticketingStatus: ticketingStatus.trim() ? ticketingStatus.trim().slice(0, 50) : null,
        });
      }

      for (const field of MAIN_INFO_STAFF_FIELDS) {
        const roleId = roleIdsByStaffKey[field.key];
        if (roleId == null) continue;
        const selectedContactId = fkIdStringToNumber(staffSelections[field.key]);
        const existing = staffRowsByKey[field.key];
        if (selectedContactId == null && existing) {
          await deleteEngagementIaeContact(engagementId, existing.engagementIaeContactId);
        } else if (selectedContactId != null && existing && selectedContactId !== existing.contactId) {
          await updateEngagementIaeContact(engagementId, existing.engagementIaeContactId, {
            contactId: selectedContactId,
            roleId,
            notes: 'noteMarker' in field ? field.noteMarker : existing.notes,
          });
        } else if (selectedContactId != null && !existing) {
          await addEngagementIaeContact(engagementId, {
            contactId: selectedContactId,
            roleId,
            isPrimary: false,
            notes: 'noteMarker' in field ? field.noteMarker : null,
          });
        }
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'iae-contacts'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'service-providers'] });
      await qc.invalidateQueries({ queryKey: ['companies'] });
      if (selectedVenueId != null) {
        await qc.invalidateQueries({ queryKey: ['companies', 'detail', selectedVenueId] });
        await qc.invalidateQueries({ queryKey: ['companies', selectedVenueId, 'venue-profile'] });
      }
      clearMainInfoUserEdited();
      addToast('Main information saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const disabled = saveMut.isPending || loading;
  const saveDisabled = disabled || !mainInfoDirty || Boolean(loadError);

  const fieldRow = (label: string, control: React.ReactNode, note?: React.ReactNode) => (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.6fr)] lg:items-start lg:gap-8">
      <div className="text-sm font-medium text-text-primary lg:pt-2.5">{label}</div>
      <div className="min-w-0">
        {control}
        {note ? <div className="mt-1 text-xs text-text-muted">{note}</div> : null}
      </div>
    </div>
  );

  if (lookupsLoading && !lookups) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading main information…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
        <h3 className="text-base font-semibold text-text-primary">Main Information</h3>

        {loadError && (
          <div className="flex flex-wrap items-center gap-2 text-ems-coral text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {friendlyApiError(loadError)}
          </div>
        )}

        {loading && !loadError && (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Loading database-backed fields…
          </div>
        )}

        <div className="space-y-4">
          {fieldRow(
            'Attraction',
            <Select2
              options={attractionOptions}
              value={attractionId}
              onChange={(value) => {
                markMainInfoUserEdited();
                setAttractionId(value);
                const selected = fkIdStringToNumber(value);
                const currentTour = (lookups?.tours ?? []).find((tour) => tour.tourId === fkIdStringToNumber(tourId));
                if (selected != null && currentTour && currentTour.attractionId !== selected) {
                  setTourId('');
                }
              }}
              placeholder="Select attraction…"
              disabled={disabled}
            />,
          )}

          {fieldRow(
            'Tour Name',
              <Select2
                options={tourOptions}
                value={tourId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setTourId(value);
                }}
                placeholder={attractionId ? 'Select tour…' : 'Select attraction first…'}
                disabled={disabled}
              />,
          )}

          {fieldRow(
            'Venue',
              <Select2
                options={venueOptions}
                value={venueCompanyId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setVenueCompanyId(value);
                }}
                placeholder="Select venue…"
                disabled={disabled}
              />,
          )}

          {fieldRow(
            'Complex',
              <Select2
                options={complexOptions}
                value={complexCompanyId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setComplexCompanyId(value);
                }}
                placeholder="---"
                allowClear
                disabled={disabled || selectedVenueId == null}
            />,
          )}

          {fieldRow(
            'Physical address (Street, City, State, Zip)',
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_96px_120px]">
              <input
                className={inputCls}
                value={addressLine1}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setAddressLine1(e.target.value);
                }}
                disabled={disabled || selectedVenueId == null}
                placeholder="Street"
              />
              <input
                className={inputCls}
                value={addressCity}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setAddressCity(e.target.value);
                }}
                disabled={disabled || selectedVenueId == null}
                placeholder="City"
              />
              <input
                className={inputCls}
                value={addressState}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setAddressState(e.target.value);
                }}
                disabled={disabled || selectedVenueId == null}
                placeholder="State"
              />
              <input
                className={inputCls}
                value={addressPostal}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setAddressPostal(e.target.value);
                }}
                disabled={disabled || selectedVenueId == null}
                placeholder="Zip"
              />
            </div>,
          )}

          {fieldRow(
            'Opening Date',
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.5fr)_88px_88px_96px]">
              <input
                type="date"
                className={inputCls}
                value={openingDate}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setOpeningDate(e.target.value);
                }}
                disabled={disabled}
              />
              <Select2
                options={hourOptions}
                value={openingHour}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setOpeningHour(value);
                }}
                placeholder="HH"
                disabled={disabled}
              />
              <Select2
                options={minuteOptions}
                value={openingMinute}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setOpeningMinute(value);
                }}
                placeholder="MM"
                disabled={disabled}
              />
              <Select2
                options={periodOptions}
                value={openingPeriod}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setOpeningPeriod(value);
                }}
                placeholder="AM/PM"
                disabled={disabled}
              />
            </div>,
          )}

          {fieldRow(
            'Brand/Series',
              <Select2
                options={brandOptions}
                value={brandId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setBrandId(value);
                }}
                placeholder="---"
                allowClear
                disabled={disabled || selectedVenueId == null}
            />,
          )}

          {fieldRow(
            'DMA',
              <Select2
                options={dmaOptions}
                value={dmaId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setDmaId(value);
                }}
                placeholder="Select DMA…"
                disabled={disabled || selectedVenueId == null}
              />,
          )}

          {fieldRow(
            'Link to Folder on Sharepoint Server',
            <input
              className={inputCls}
              type="url"
              inputMode="url"
              value={sharePointFolderLink}
              onChange={(e) => {
                markMainInfoUserEdited();
                setSharePointFolderLink(e.target.value);
              }}
              disabled={disabled}
              placeholder="Folder on Sharepoint Server (IAE Cloud Server)"
            />,
            'Stored on the engagement finance record as the SharePoint folder link.',
          )}

          {fieldRow(
            'Engagement Status',
              <Select2
                options={ENGAGEMENT_STATUS_ENUM.map((status) => ({ value: status, label: status }))}
                value={engagementStatus}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setEngagementStatus(value);
                }}
                placeholder="Select status…"
                disabled={disabled}
              />,
          )}

          {fieldRow(
            'Ticketing Status',
              <Select2
                options={TICKETING_STATUS_OPTIONS}
                value={ticketingStatus}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setTicketingStatus(value);
                }}
                placeholder="Select ticketing status..."
                disabled={disabled || openingPerformance == null}
              />,
            openingPerformance == null ? 'Stored on dbo.PerformanceTicketing after an opening performance exists.' : null,
          )}

          {fieldRow(
            'Number of Performances',
            <input
              className={inputCls}
              value={performancesQuery.data?.length ?? 0}
              readOnly
              disabled
            />,
            'Derived from dbo.Performance rows; add or remove performances in the Performance Schedule tab.',
          )}

          {fieldRow(
            'Gross Potential',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${inputCls} pl-8`}
                inputMode="decimal"
                value={grossPotential}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setGrossPotential(e.target.value);
                }}
                disabled={disabled}
              />
            </div>,
          )}

          {fieldRow(
            'Estimated Breakeven',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${inputCls} pl-8`}
                inputMode="decimal"
                value={estimatedBreakeven}
                onChange={(e) => {
                  markMainInfoUserEdited();
                  setEstimatedBreakeven(e.target.value);
                }}
                disabled={disabled}
              />
            </div>,
          )}

          {fieldRow(
            'Promoter Partners',
              <Select2
                options={promoterPartnerOptions}
                value={promoterPartnerCompanyId}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setPromoterPartnerCompanyId(value);
                }}
                placeholder="---"
                allowClear
                disabled={disabled}
            />,
            'Stored through the engagement venue service-provider link for companies/services marked Promoter.',
          )}

          {fieldRow(
            'Confirmation Packet Approved',
              <Select2
                options={CONFIRMATION_PACKET_SELECT_OPTIONS}
                value={confirmationPacketApproved}
                onChange={(value) => {
                  markMainInfoUserEdited();
                  setConfirmationPacketApproved(value);
                }}
                placeholder="Not set"
                allowClear
                disabled={disabled}
            />,
          )}

          <div className="rounded-lg border border-border bg-surface/40 p-4">
            <h4 className="text-sm font-semibold text-text-primary">
              Innovation Arts Staff Assignments
            </h4>
            <div className="mt-4 space-y-4">
              {MAIN_INFO_STAFF_FIELDS.map((field) => (
                <React.Fragment key={field.key}>
                  {fieldRow(
                    field.label,
                    <Select2
                      options={contactOptions}
                      value={staffSelections[field.key]}
                      onChange={(value) => {
                        markMainInfoUserEdited();
                        setStaffSelections((prev) => ({ ...prev, [field.key]: value }));
                      }}
                      placeholder="---"
                      allowClear
                      disabled={disabled || roleIdsByStaffKey[field.key] == null}
                    />,
                    roleIdsByStaffKey[field.key] == null ? 'No matching Role row exists for this field.' : null,
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {fieldRow(
            'Scaling',
            <input
              className={inputCls}
              maxLength={50}
              value={engagementScaling}
              onChange={(e) => {
                markMainInfoUserEdited();
                setEngagementScaling(e.target.value);
              }}
              disabled={disabled}
            />,
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            disabled={saveDisabled}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save main information'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EngagementArtistTermsPanel({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const [artistGuarantee, setArtistGuarantee] = useState('');
  const [artistMiddleMoney, setArtistMiddleMoney] = useState('');
  const [artistRoyaltyVariableFee, setArtistRoyaltyVariableFee] = useState('');
  const [artistBackEndTerms, setArtistBackEndTerms] = useState('');
  const [promoterProfit, setPromoterProfit] = useState('');
  const [finalOfferLink, setFinalOfferLink] = useState('');
  const [settlementFileLink, setSettlementFileLink] = useState('');
  const {
    hasUserEdited: hasArtistTermsUserEdited,
    markUserEdited: markArtistTermsUserEdited,
    clearUserEdited: clearArtistTermsUserEdited,
  } = useUserEditTracker(engagementId);

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setArtistGuarantee(numFieldToString(d.artistGuarantee));
    setArtistMiddleMoney(numFieldToString(d.artistMiddleMoney));
    setArtistRoyaltyVariableFee(d.artistRoyaltyVariableFee ?? '');
    setArtistBackEndTerms(d.artistBackEndTerms ?? '');
    setPromoterProfit(numFieldToString(d.promoterProfit));
    setFinalOfferLink(d.finalAcceptedOfferLink ?? '');
    setSettlementFileLink(d.settlementFileSharePointLink ?? '');
  }, [financeQuery.data]);

  const saveMut = useMutation({
    mutationFn: async (body: UpdateEngagementFinancePayload) => {
      await updateEngagementFinance(engagementId, body);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await qc.invalidateQueries({ queryKey: ['engagements', 'finance-lookups'] });
    },
    onSuccess: () => {
      clearArtistTermsUserEdited();
      setTimeout(() => {
        addToast('Artist terms saved.', 'success');
      }, 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const handleSave = () => {
    const g = parseOptionalDecimal(artistGuarantee, 'Artist guarantee');
    const m = parseOptionalDecimal(artistMiddleMoney, 'Artist middle money');
    const p = parseOptionalDecimal(promoterProfit, 'Promoter profit');
    for (const x of [g, m, p]) {
      if (!x.ok) {
        addToast(x.message, 'error');
        return;
      }
    }
    const offerTrim = finalOfferLink.trim();
    const settleTrim = settlementFileLink.trim();
    if (!isValidHttpOrHttpsUrl(offerTrim)) {
      addToast(
        'Link to Final Accepted Offer must be a valid http(s) URL (e.g. https://…), or left empty.',
        'warning',
      );
      return;
    }
    if (!isValidHttpOrHttpsUrl(settleTrim)) {
      addToast(
        'Link to Settlement File on SharePoint Server must be a valid http(s) URL, or left empty.',
        'warning',
      );
      return;
    }
    saveMut.mutate({
      artistGuarantee: g.value,
      artistMiddleMoney: m.value,
      artistRoyaltyVariableFee: artistRoyaltyVariableFee.trim() || null,
      artistBackEndTerms: artistBackEndTerms.trim() || null,
      promoterProfit: p.value,
      finalAcceptedOfferLink: offerTrim || null,
      settlementFileSharePointLink: settleTrim || null,
    });
  };

  const artistTermsDirtyRaw = useMemo(() => {
    const d = financeQuery.data;
    if (!d) return false;
    const g = parseOptionalDecimal(artistGuarantee, 'Artist guarantee');
    const m = parseOptionalDecimal(artistMiddleMoney, 'Artist middle money');
    const p = parseOptionalDecimal(promoterProfit, 'Promoter profit');
    if (!g.ok || !m.ok || !p.ok) return true;
    const cur = JSON.stringify({
      artistGuarantee: g.value,
      artistMiddleMoney: m.value,
      artistRoyaltyVariableFee: artistRoyaltyVariableFee.trim() || null,
      artistBackEndTerms: artistBackEndTerms.trim() || null,
      promoterProfit: p.value,
      finalAcceptedOfferLink: finalOfferLink.trim() || null,
      settlementFileSharePointLink: settlementFileLink.trim() || null,
    });
    const base = JSON.stringify({
      artistGuarantee: d.artistGuarantee ?? null,
      artistMiddleMoney: d.artistMiddleMoney ?? null,
      artistRoyaltyVariableFee: (d.artistRoyaltyVariableFee ?? '').trim() || null,
      artistBackEndTerms: (d.artistBackEndTerms ?? '').trim() || null,
      promoterProfit: d.promoterProfit ?? null,
      finalAcceptedOfferLink: (d.finalAcceptedOfferLink ?? '').trim() || null,
      settlementFileSharePointLink: (d.settlementFileSharePointLink ?? '').trim() || null,
    });
    return cur !== base;
  }, [
    financeQuery.data,
    artistGuarantee,
    artistMiddleMoney,
    artistRoyaltyVariableFee,
    artistBackEndTerms,
    promoterProfit,
    finalOfferLink,
    settlementFileLink,
  ]);
  const artistTermsDirty = hasArtistTermsUserEdited && artistTermsDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(artistTermsDirty);
    return () => onDirtyChange?.(false);
  }, [artistTermsDirty, onDirtyChange]);

  const disabled = saveMut.isPending;
  const saveDisabled = disabled || !artistTermsDirty;

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-52 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1 sm:max-w-none">{control}</div>
    </div>
  );

  const moneyInput = (value: string, onChange: (v: string) => void, id: string) => (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted"
        aria-hidden
      >
        $
      </span>
      <input
        id={id}
        className={`${inputCls} pl-8`}
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          markArtistTermsUserEdited();
          onChange(e.target.value);
        }}
        disabled={disabled}
      />
    </div>
  );

  const pctInput = (value: string, onChange: (v: string) => void, id: string, multiline?: boolean) => (
    <div className="relative">
      <span
        className={`pointer-events-none absolute left-3 z-[1] text-sm text-text-muted ${multiline ? 'top-2.5' : 'top-1/2 -translate-y-1/2'}`}
        aria-hidden
      >
        %
      </span>
      {multiline ? (
        <textarea
          id={id}
          className={`${inputCls} min-h-[88px] resize-y pl-8 pt-2.5`}
          value={value}
          onChange={(e) => {
            markArtistTermsUserEdited();
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
      ) : (
        <input
          id={id}
          className={`${inputCls} pl-8`}
          value={value}
          onChange={(e) => {
            markArtistTermsUserEdited();
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
      )}
    </div>
  );

  if (financeQuery.isLoading && !financeQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading artist terms…
      </div>
    );
  }

  if (financeQuery.error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(financeQuery.error)}
          <button
            type="button"
            onClick={() => void financeQuery.refetch()}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
      <h3 className="text-base font-semibold text-text-primary">Artist terms</h3>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
        {fieldRow('Artist Guarantee', moneyInput(artistGuarantee, setArtistGuarantee, 'at-guarantee'))}
        {fieldRow('Artist Middle Money', moneyInput(artistMiddleMoney, setArtistMiddleMoney, 'at-middle'))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
        {fieldRow(
          'Artist Royalty Variable Fee',
          pctInput(artistRoyaltyVariableFee, setArtistRoyaltyVariableFee, 'at-royalty', false),
        )}
        {fieldRow('Promoter Profit', pctInput(promoterProfit, setPromoterProfit, 'at-promoter', false))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
        <div className="min-w-0 lg:col-span-2">
          {fieldRow(
            'Artist Back and Terms',
            pctInput(artistBackEndTerms, setArtistBackEndTerms, 'at-backend', true),
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
        {fieldRow(
          'Link to Final Accepted Offer',
          <input
            id="at-offer-link"
            type="url"
            inputMode="url"
            className={inputCls}
            value={finalOfferLink}
            onChange={(e) => {
              markArtistTermsUserEdited();
              setFinalOfferLink(e.target.value);
            }}
            disabled={disabled}
            placeholder="https://…"
          />,
        )}
        {fieldRow(
          'Link to Settlement File on SharePoint Server',
          <input
            id="at-settlement-link"
            type="url"
            inputMode="url"
            className={inputCls}
            value={settlementFileLink}
            onChange={(e) => {
              markArtistTermsUserEdited();
              setSettlementFileLink(e.target.value);
            }}
            disabled={disabled}
            placeholder="https://…"
          />,
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          type="button"
          className="bg-ems-accent text-white hover:opacity-90"
          onClick={handleSave}
          disabled={saveDisabled}
        >
          {disabled ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </span>
          ) : (
            'Save artist terms'
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}

function EngagementEventBusinessPanel({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const [artistSettlementStatus, setArtistSettlementStatus] = useState('');
  const [venueSettlementStatus, setVenueSettlementStatus] = useState('');
  const [subscriptionSalesRevenueTotal, setSubscriptionSalesRevenueTotal] = useState('');
  const [seasonTicketSalesByIae, setSeasonTicketSalesByIae] = useState('');
  const [seasonTicketFundsTransferred, setSeasonTicketFundsTransferred] = useState('');
  const [netBoxOfficeFundsDepositedAccount, setNetBoxOfficeFundsDepositedAccount] =
    useState('');
  const [hstCollectedFromTicketSales, setHstCollectedFromTicketSales] = useState('');
  const [hstPaidOnTourPayments, setHstPaidOnTourPayments] = useState('');
  const [hstPaidOnShowExpenses, setHstPaidOnShowExpenses] = useState('');
  const [hstPaidOnVenueExpenses, setHstPaidOnVenueExpenses] = useState('');
  const [artistGrossTaxableCompensation, setArtistGrossTaxableCompensation] =
    useState('');
  const [amountDueToDeptOfRevenue, setAmountDueToDeptOfRevenue] = useState('');
  const [checkNumberOrConfOfWithholdingPayment, setCheckNumberOrConfOfWithholdingPayment] =
    useState('');
  const {
    hasUserEdited: hasEventBusinessUserEdited,
    markUserEdited: markEventBusinessUserEdited,
    clearUserEdited: clearEventBusinessUserEdited,
  } = useUserEditTracker(engagementId);

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setArtistSettlementStatus(d.artistSettlementStatus ?? '');
    setVenueSettlementStatus(d.venueSettlementStatus ?? '');
    setSubscriptionSalesRevenueTotal(numFieldToString(d.subscriptionSalesRevenueTotal));
    setSeasonTicketSalesByIae(numFieldToString(d.seasonTicketSalesByIae));
    setSeasonTicketFundsTransferred(numFieldToString(d.seasonTicketFundsTransferred));
    setNetBoxOfficeFundsDepositedAccount(d.netBoxOfficeFundsDepositedAccount ?? '');
    setHstCollectedFromTicketSales(numFieldToString(d.hstCollectedFromTicketSales));
    setHstPaidOnTourPayments(numFieldToString(d.hstPaidOnTourPayments));
    setHstPaidOnShowExpenses(numFieldToString(d.hstPaidOnShowExpenses));
    setHstPaidOnVenueExpenses(numFieldToString(d.hstPaidOnVenueExpenses));
    setArtistGrossTaxableCompensation(numFieldToString(d.artistGrossTaxableCompensation));
    setAmountDueToDeptOfRevenue(numFieldToString(d.amountDueToDeptOfRevenue));
    setCheckNumberOrConfOfWithholdingPayment(
      d.checkNumberOrConfOfWithholdingPayment ?? '',
    );
  }, [financeQuery.data]);

  const saveMut = useMutation({
    mutationFn: async (body: UpdateEngagementFinancePayload) => {
      await updateEngagementFinance(engagementId, body);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await qc.invalidateQueries({ queryKey: ['engagements', 'finance-lookups'] });
    },
    onSuccess: () => {
      clearEventBusinessUserEdited();
      setTimeout(() => {
        addToast('Event business saved.', 'success');
      }, 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const trimOrNull = (s: string, max: number): string | null => {
    const t = s.trim();
    if (t === '') return null;
    return t.slice(0, max);
  };

  const handleSave = () => {
    const decimalSpecs: {
      raw: string;
      label: string;
      apiKey: keyof UpdateEngagementFinancePayload;
    }[] = [
      {
        raw: subscriptionSalesRevenueTotal,
        label: 'Subscription sales revenue total',
        apiKey: 'subscriptionSalesRevenueTotal',
      },
      {
        raw: seasonTicketSalesByIae,
        label: 'Season ticket sales by IAE',
        apiKey: 'seasonTicketSalesByIae',
      },
      {
        raw: seasonTicketFundsTransferred,
        label: 'Season ticket funds transferred',
        apiKey: 'seasonTicketFundsTransferred',
      },
      {
        raw: hstCollectedFromTicketSales,
        label: 'HST collected from ticket sales',
        apiKey: 'hstCollectedFromTicketSales',
      },
      {
        raw: hstPaidOnTourPayments,
        label: 'HST paid on tour payments',
        apiKey: 'hstPaidOnTourPayments',
      },
      {
        raw: hstPaidOnShowExpenses,
        label: 'HST paid on show expenses',
        apiKey: 'hstPaidOnShowExpenses',
      },
      {
        raw: hstPaidOnVenueExpenses,
        label: 'HST paid on venue expenses',
        apiKey: 'hstPaidOnVenueExpenses',
      },
      {
        raw: artistGrossTaxableCompensation,
        label: 'Artist gross taxable compensation',
        apiKey: 'artistGrossTaxableCompensation',
      },
      {
        raw: amountDueToDeptOfRevenue,
        label: 'Amount due to Dept of Revenue',
        apiKey: 'amountDueToDeptOfRevenue',
      },
    ];
    const parsedDecimals: Partial<UpdateEngagementFinancePayload> = {};
    for (const { raw, label, apiKey } of decimalSpecs) {
      const p = parseOptionalDecimal(raw, label);
      if (!p.ok) {
        addToast(p.message, 'error');
        return;
      }
      parsedDecimals[apiKey] = p.value;
    }

    saveMut.mutate({
      ...parsedDecimals,
      artistSettlementStatus: trimOrNull(artistSettlementStatus, 50),
      venueSettlementStatus: trimOrNull(venueSettlementStatus, 50),
      netBoxOfficeFundsDepositedAccount: trimOrNull(netBoxOfficeFundsDepositedAccount, 255),
      checkNumberOrConfOfWithholdingPayment: trimOrNull(
        checkNumberOrConfOfWithholdingPayment,
        100,
      ),
    });
  };

  const eventBusinessDirtyRaw = useMemo(() => {
    const d = financeQuery.data;
    if (!d) return false;
    const trimOrNullLocal = (s: string, max: number): string | null => {
      const t = s.trim();
      if (t === '') return null;
      return t.slice(0, max);
    };
    const specs: { raw: string; key: keyof UpdateEngagementFinancePayload }[] = [
      { raw: subscriptionSalesRevenueTotal, key: 'subscriptionSalesRevenueTotal' },
      { raw: seasonTicketSalesByIae, key: 'seasonTicketSalesByIae' },
      { raw: seasonTicketFundsTransferred, key: 'seasonTicketFundsTransferred' },
      { raw: hstCollectedFromTicketSales, key: 'hstCollectedFromTicketSales' },
      { raw: hstPaidOnTourPayments, key: 'hstPaidOnTourPayments' },
      { raw: hstPaidOnShowExpenses, key: 'hstPaidOnShowExpenses' },
      { raw: hstPaidOnVenueExpenses, key: 'hstPaidOnVenueExpenses' },
      { raw: artistGrossTaxableCompensation, key: 'artistGrossTaxableCompensation' },
      { raw: amountDueToDeptOfRevenue, key: 'amountDueToDeptOfRevenue' },
    ];
    const parsed: Record<string, number | null> = {};
    for (const { raw, key } of specs) {
      const p = parseOptionalDecimal(raw, 'x');
      if (!p.ok) return true;
      parsed[key as string] = p.value;
    }
    const cur = JSON.stringify({
      ...parsed,
      artistSettlementStatus: trimOrNullLocal(artistSettlementStatus, 50),
      venueSettlementStatus: trimOrNullLocal(venueSettlementStatus, 50),
      netBoxOfficeFundsDepositedAccount: trimOrNullLocal(netBoxOfficeFundsDepositedAccount, 255),
      checkNumberOrConfOfWithholdingPayment: trimOrNullLocal(
        checkNumberOrConfOfWithholdingPayment,
        100,
      ),
    });
    const base = JSON.stringify({
      subscriptionSalesRevenueTotal: d.subscriptionSalesRevenueTotal ?? null,
      seasonTicketSalesByIae: d.seasonTicketSalesByIae ?? null,
      seasonTicketFundsTransferred: d.seasonTicketFundsTransferred ?? null,
      hstCollectedFromTicketSales: d.hstCollectedFromTicketSales ?? null,
      hstPaidOnTourPayments: d.hstPaidOnTourPayments ?? null,
      hstPaidOnShowExpenses: d.hstPaidOnShowExpenses ?? null,
      hstPaidOnVenueExpenses: d.hstPaidOnVenueExpenses ?? null,
      artistGrossTaxableCompensation: d.artistGrossTaxableCompensation ?? null,
      amountDueToDeptOfRevenue: d.amountDueToDeptOfRevenue ?? null,
      artistSettlementStatus: trimOrNullLocal(d.artistSettlementStatus ?? '', 50),
      venueSettlementStatus: trimOrNullLocal(d.venueSettlementStatus ?? '', 50),
      netBoxOfficeFundsDepositedAccount: trimOrNullLocal(
        d.netBoxOfficeFundsDepositedAccount ?? '',
        255,
      ),
      checkNumberOrConfOfWithholdingPayment: trimOrNullLocal(
        d.checkNumberOrConfOfWithholdingPayment ?? '',
        100,
      ),
    });
    return cur !== base;
  }, [
    financeQuery.data,
    artistSettlementStatus,
    venueSettlementStatus,
    subscriptionSalesRevenueTotal,
    seasonTicketSalesByIae,
    seasonTicketFundsTransferred,
    netBoxOfficeFundsDepositedAccount,
    hstCollectedFromTicketSales,
    hstPaidOnTourPayments,
    hstPaidOnShowExpenses,
    hstPaidOnVenueExpenses,
    artistGrossTaxableCompensation,
    amountDueToDeptOfRevenue,
    checkNumberOrConfOfWithholdingPayment,
  ]);
  const eventBusinessDirty = hasEventBusinessUserEdited && eventBusinessDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(eventBusinessDirty);
    return () => onDirtyChange?.(false);
  }, [eventBusinessDirty, onDirtyChange]);

  const disabled = saveMut.isPending;
  const saveDisabled = disabled || !eventBusinessDirty;

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-52 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1 sm:max-w-none">{control}</div>
    </div>
  );

  const moneyInput = (value: string, onChange: (v: string) => void, id: string) => (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted"
        aria-hidden
      >
        $
      </span>
      <input
        id={id}
        className={`${inputCls} pl-8`}
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          markEventBusinessUserEdited();
          onChange(e.target.value);
        }}
        disabled={disabled}
      />
    </div>
  );

  if (financeQuery.isLoading && !financeQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading event business…
      </div>
    );
  }

  if (financeQuery.error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(financeQuery.error)}
          <button
            type="button"
            onClick={() => void financeQuery.refetch()}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
        <h3 className="text-base font-semibold text-text-primary">Event business</h3>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'Artist settlement status',
            <Select2
              options={SETTLEMENT_STATUS_OPTIONS}
              value={artistSettlementStatus}
              onChange={(value) => {
                markEventBusinessUserEdited();
                setArtistSettlementStatus(value);
              }}
              placeholder="Select status..."
              disabled={disabled}
            />,
          )}
          {fieldRow(
            'Venue settlement status',
            <Select2
              options={SETTLEMENT_STATUS_OPTIONS}
              value={venueSettlementStatus}
              onChange={(value) => {
                markEventBusinessUserEdited();
                setVenueSettlementStatus(value);
              }}
              placeholder="Select status..."
              disabled={disabled}
            />,
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'Subscription sales revenue total',
            moneyInput(
              subscriptionSalesRevenueTotal,
              setSubscriptionSalesRevenueTotal,
              'eb-subscription-revenue',
            ),
          )}
          {fieldRow(
            'Season ticket sales by IAE',
            moneyInput(seasonTicketSalesByIae, setSeasonTicketSalesByIae, 'eb-season-iae'),
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'Season ticket funds transferred',
            moneyInput(
              seasonTicketFundsTransferred,
              setSeasonTicketFundsTransferred,
              'eb-season-transferred',
            ),
          )}
          {fieldRow(
            'HST collected from ticket sales',
            moneyInput(
              hstCollectedFromTicketSales,
              setHstCollectedFromTicketSales,
              'eb-hst-ticket',
            ),
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'HST paid on tour payments',
            moneyInput(hstPaidOnTourPayments, setHstPaidOnTourPayments, 'eb-hst-tour'),
          )}
          {fieldRow(
            'HST paid on show expenses',
            moneyInput(hstPaidOnShowExpenses, setHstPaidOnShowExpenses, 'eb-hst-show'),
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'HST paid on venue expenses',
            moneyInput(
              hstPaidOnVenueExpenses,
              setHstPaidOnVenueExpenses,
              'eb-hst-venue',
            ),
          )}
          {fieldRow(
            'Artist gross taxable compensation',
            moneyInput(
              artistGrossTaxableCompensation,
              setArtistGrossTaxableCompensation,
              'eb-artist-gross',
            ),
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'Amount due to Dept of Revenue',
            moneyInput(
              amountDueToDeptOfRevenue,
              setAmountDueToDeptOfRevenue,
              'eb-dept-revenue',
            ),
          )}
          {fieldRow(
            'Net box office funds deposited (account)',
            <textarea
              id="eb-net-box"
              className={`${inputCls} min-h-[88px] resize-y`}
              maxLength={255}
              value={netBoxOfficeFundsDepositedAccount}
              onChange={(e) => {
                markEventBusinessUserEdited();
                setNetBoxOfficeFundsDepositedAccount(e.target.value);
              }}
              disabled={disabled}
            />,
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
          <div className="min-w-0 lg:col-span-2">
            {fieldRow(
              'Check # or confirmation of withholding payment',
              <input
                id="eb-check-conf"
                className={inputCls}
                maxLength={100}
                value={checkNumberOrConfOfWithholdingPayment}
                onChange={(e) => {
                  markEventBusinessUserEdited();
                  setCheckNumberOrConfOfWithholdingPayment(e.target.value);
                }}
                disabled={disabled}
              />,
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSave}
            disabled={saveDisabled}
          >
            {disabled ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save event business'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EngagementMarketingPanel({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
    retry: 1,
  });

  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  useEffect(() => {
    const list = performancesQuery.data;
    if (!list?.length) {
      setSelectedPid(null);
      return;
    }
    setSelectedPid((prev) => {
      if (prev != null && list.some((p) => p.performanceId === prev)) return prev;
      return list[0]!.performanceId;
    });
  }, [performancesQuery.data]);

  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid] as const,
    queryFn: () =>
      fetchEngagementPerformanceTicketing(engagementId, selectedPid!),
    enabled: selectedPid != null && selectedPid > 0,
    retry: 1,
  });

  const [ticketingStatus, setTicketingStatus] = useState('');
  const [onSaleDate, setOnSaleDate] = useState(getTodayDateString());
  const [preSaleDate, setPreSaleDate] = useState(getTodayDateString());
  const [vipPackagedOffer, setVipPackagedOffer] = useState('');
  const [preSaleSpecialPrices, setPreSaleSpecialPrices] = useState('');
  const [kidsTicketsPrices, setKidsTicketsPrices] = useState('');
  const [ticketingLinkUrl, setTicketingLinkUrl] = useState('');
  const [grossTicketSales, setGrossTicketSales] = useState('');
  const [totalComps, setTotalComps] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [totalAdmissions, setTotalAdmissions] = useState('');
  const {
    hasUserEdited: hasMarketingUserEdited,
    markUserEdited: markMarketingUserEdited,
    clearUserEdited: clearMarketingUserEdited,
  } = useUserEditTracker(`${engagementId}:${selectedPid ?? ''}`);

  const performanceSelectOptions = useMemo<Select2Option[]>(
    () =>
      (performancesQuery.data ?? []).map((p) => ({
        value: String(p.performanceId),
        label: `${formatPerformanceDateDisplay(p.performanceDate)} · ${formatPerformanceTimeDisplay(
          p.performanceTime,
        )} · ${p.performanceStatus}`,
      })),
    [performancesQuery.data],
  );

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return;
    setTicketingStatus(d.ticketingStatus ?? '');
    setOnSaleDate(d.onSaleDate ?? '');
    setPreSaleDate(d.preSaleDate ?? '');
    setVipPackagedOffer(d.vipPackagedOffer ?? '');
    setPreSaleSpecialPrices(d.preSaleSpecialPrices ?? '');
    setKidsTicketsPrices(d.kidsTicketsPrices ?? '');
    setTicketingLinkUrl(d.ticketingLinkUrl ?? '');
    setGrossTicketSales(numFieldToString(d.grossTicketSales));
    setTotalComps(intFieldToString(d.totalComps));
    setTotalTickets(intFieldToString(d.totalTickets));
    setTotalAdmissions(intFieldToString(d.totalAdmissions));
  }, [ticketingQuery.data, selectedPid]);

  const saveMut = useMutation({
    mutationFn: async (body: UpdatePerformanceTicketingPayload) => {
      if (selectedPid == null) throw new Error('No performance selected.');
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, body);
      await qc.invalidateQueries({
        queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid],
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => {
      clearMarketingUserEdited();
      setTimeout(() => {
        addToast('Marketing saved.', 'success');
      }, 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const handleSave = () => {
    if (selectedPid == null) {
      addToast('Add a show date before saving marketing.', 'warning');
      return;
    }
    const linkUrl = ticketingLinkUrl.trim();
    if (!isValidHttpOrHttpsUrl(linkUrl)) {
      addToast('Link ID must be a valid http(s) URL, or left empty.', 'warning');
      return;
    }
    const gross = parseOptionalDecimal(grossTicketSales, 'Gross ticket sales');
    if (!gross.ok) {
      addToast(gross.message, 'error');
      return;
    }
    const comps = parseOptionalInt(totalComps, 'Total comps');
    const tickets = parseOptionalInt(totalTickets, 'Total tickets');
    const admissions = parseOptionalInt(totalAdmissions, 'Total admissions');
    for (const x of [comps, tickets, admissions]) {
      if (!x.ok) {
        addToast(x.message, 'error');
        return;
      }
      if (x.value != null && x.value < 0) {
        addToast('Counts cannot be negative.', 'error');
        return;
      }
    }

    saveMut.mutate({
      ticketingStatus: ticketingStatus.trim() ? ticketingStatus.trim().slice(0, 50) : null,
      onSaleDate: onSaleDate.trim() === '' ? null : onSaleDate.trim(),
      preSaleDate: preSaleDate.trim() === '' ? null : preSaleDate.trim(),
      vipPackagedOffer: vipPackagedOffer.trim()
        ? vipPackagedOffer.trim().slice(0, 255)
        : null,
      preSaleSpecialPrices: preSaleSpecialPrices.trim() || null,
      kidsTicketsPrices: kidsTicketsPrices.trim() || null,
      ticketingLinkUrl: linkUrl || null,
      grossTicketSales: gross.value,
      totalComps: comps.value,
      totalTickets: tickets.value,
      totalAdmissions: admissions.value,
    });
  };

  const marketingFormDirtyRaw = useMemo(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const linkUrl = ticketingLinkUrl.trim();
    if (!isValidHttpOrHttpsUrl(linkUrl)) return true;
    const gross = parseOptionalDecimal(grossTicketSales, 'Gross ticket sales');
    if (!gross.ok) return true;
    const comps = parseOptionalInt(totalComps, 'Total comps');
    const tickets = parseOptionalInt(totalTickets, 'Total tickets');
    const admissions = parseOptionalInt(totalAdmissions, 'Total admissions');
    if (!comps.ok || !tickets.ok || !admissions.ok) return true;
    for (const x of [comps, tickets, admissions]) {
      if (x.value != null && x.value < 0) return true;
    }
    const cur = {
      ticketingStatus: ticketingStatus.trim() ? ticketingStatus.trim().slice(0, 50) : null,
      onSaleDate: onSaleDate.trim() === '' ? null : onSaleDate.trim(),
      preSaleDate: preSaleDate.trim() === '' ? null : preSaleDate.trim(),
      vipPackagedOffer: vipPackagedOffer.trim()
        ? vipPackagedOffer.trim().slice(0, 255)
        : null,
      preSaleSpecialPrices: preSaleSpecialPrices.trim() || null,
      kidsTicketsPrices: kidsTicketsPrices.trim() || null,
      ticketingLinkUrl: linkUrl || null,
      grossTicketSales: gross.value,
      totalComps: comps.value,
      totalTickets: tickets.value,
      totalAdmissions: admissions.value,
    };
    const ts = (s: string | null | undefined) => {
      const t = (s ?? '').trim();
      return t ? t.slice(0, 50) : null;
    };
    const vipNorm = (s: string | null | undefined) => {
      const t = (s ?? '').trim();
      return t ? t.slice(0, 255) : null;
    };
    const base = {
      ticketingStatus: ts(d.ticketingStatus),
      onSaleDate: (d.onSaleDate ?? '').trim() === '' ? null : (d.onSaleDate ?? '').trim(),
      preSaleDate: (d.preSaleDate ?? '').trim() === '' ? null : (d.preSaleDate ?? '').trim(),
      vipPackagedOffer: vipNorm(d.vipPackagedOffer),
      preSaleSpecialPrices: (d.preSaleSpecialPrices ?? '').trim() || null,
      kidsTicketsPrices: (d.kidsTicketsPrices ?? '').trim() || null,
      ticketingLinkUrl: (d.ticketingLinkUrl ?? '').trim() || null,
      grossTicketSales: d.grossTicketSales ?? null,
      totalComps: d.totalComps ?? null,
      totalTickets: d.totalTickets ?? null,
      totalAdmissions: d.totalAdmissions ?? null,
    };
    return JSON.stringify(cur) !== JSON.stringify(base);
  }, [
    ticketingQuery.data,
    selectedPid,
    ticketingStatus,
    onSaleDate,
    preSaleDate,
    vipPackagedOffer,
    preSaleSpecialPrices,
    kidsTicketsPrices,
    ticketingLinkUrl,
    grossTicketSales,
    totalComps,
    totalTickets,
    totalAdmissions,
  ]);
  const marketingFormDirty = hasMarketingUserEdited && marketingFormDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(marketingFormDirty);
    return () => onDirtyChange?.(false);
  }, [marketingFormDirty, onDirtyChange]);

  const saveDisabled = saveMut.isPending || ticketingQuery.isLoading;
  const marketingSaveDisabled = saveDisabled || !marketingFormDirty;
  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-52 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1 sm:max-w-none">{control}</div>
    </div>
  );

  const moneyInput = (value: string, onChange: (v: string) => void, id: string) => (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted"
        aria-hidden
      >
        $
      </span>
      <input
        id={id}
        className={`${inputCls} pl-8`}
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          markMarketingUserEdited();
          onChange(e.target.value);
        }}
        disabled={saveDisabled}
      />
    </div>
  );

  if (performancesQuery.isLoading && !performancesQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading performances…
      </div>
    );
  }

  if (performancesQuery.error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(performancesQuery.error)}
          <button
            type="button"
            onClick={() => void performancesQuery.refetch()}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!(performancesQuery.data ?? []).length) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-text-muted">
        Add at least one show date on the <strong className="text-text-primary">Performances</strong>{' '}
        tab to edit marketing and ticketing for that show.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
        <h3 className="text-base font-semibold text-text-primary">Marketing</h3>

        <FormField label="Show">
          <Select2
            options={performanceSelectOptions}
            value={selectedPid == null ? '' : String(selectedPid)}
            onChange={(value) => setSelectedPid(fkIdStringToNumber(value))}
            placeholder="Select show…"
            disabled={saveMut.isPending}
          />
        </FormField>

        {ticketingQuery.isError && (
          <div className="flex flex-wrap items-center gap-2 text-ems-coral text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {friendlyApiError(ticketingQuery.error)}
            <button
              type="button"
              onClick={() => void ticketingQuery.refetch()}
              className="text-xs underline"
            >
              Retry
            </button>
          </div>
        )}

        {ticketingQuery.isLoading && (
          <div className="flex items-center gap-2 text-text-muted text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Loading ticketing data…
          </div>
        )}

        {!ticketingQuery.isLoading && !ticketingQuery.isError && ticketingQuery.data && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow(
                'Ticketing status',
                <Select2
                  options={TICKETING_STATUS_OPTIONS}
                  value={ticketingStatus}
                  onChange={(value) => {
                    markMarketingUserEdited();
                    setTicketingStatus(value);
                  }}
                  placeholder="Select ticketing status..."
                  disabled={saveDisabled}
                />,
              )}
              {fieldRow(
                'Link ID',
                <input
                  id="mkt-link-id"
                  type="url"
                  inputMode="url"
                  className={inputCls}
                  value={ticketingLinkUrl}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setTicketingLinkUrl(e.target.value);
                  }}
                  disabled={saveDisabled}
                  placeholder="https://…"
                />,
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow(
                'On-sale date',
                <input
                  id="mkt-onsale"
                  type="date"
                  className={inputCls}
                  value={onSaleDate}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setOnSaleDate(e.target.value);
                  }}
                  disabled={saveDisabled}
                />,
              )}
              {fieldRow(
                'Pre-sale date',
                <input
                  id="mkt-presale"
                  type="date"
                  className={inputCls}
                  value={preSaleDate}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setPreSaleDate(e.target.value);
                  }}
                  disabled={saveDisabled}
                />,
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow(
                'VIP Package Offered',
                <input
                  id="mkt-vip"
                  className={inputCls}
                  maxLength={255}
                  value={vipPackagedOffer}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setVipPackagedOffer(e.target.value);
                  }}
                  disabled={saveDisabled}
                />,
              )}
              {fieldRow(
                'Gross ticket sales',
                moneyInput(grossTicketSales, setGrossTicketSales, 'mkt-gross'),
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow(
                'Total comps',
                <input
                  id="mkt-comps"
                  className={inputCls}
                  inputMode="numeric"
                  value={totalComps}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setTotalComps(e.target.value);
                  }}
                  disabled={saveDisabled}
                />,
              )}
              {fieldRow(
                'Total tickets',
                <input
                  id="mkt-tickets"
                  className={inputCls}
                  inputMode="numeric"
                  value={totalTickets}
                  onChange={(e) => {
                    markMarketingUserEdited();
                    setTotalTickets(e.target.value);
                  }}
                  disabled={saveDisabled}
                />,
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              <div className="min-w-0 lg:col-span-2">
                {fieldRow(
                  'Total admissions',
                  <input
                    id="mkt-admissions"
                    className={inputCls}
                    inputMode="numeric"
                    value={totalAdmissions}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setTotalAdmissions(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
              <div className="min-w-0 lg:col-span-2">
                {fieldRow(
                  'Pre-sale special prices',
                  <textarea
                    id="mkt-presale-prices"
                    className={`${inputCls} min-h-[100px] resize-y`}
                    value={preSaleSpecialPrices}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setPreSaleSpecialPrices(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
              <div className="min-w-0 lg:col-span-2">
                {fieldRow(
                  'Kids tickets prices',
                  <textarea
                    id="mkt-kids"
                    className={`${inputCls} min-h-[100px] resize-y`}
                    value={kidsTicketsPrices}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setKidsTicketsPrices(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                className="bg-ems-accent text-white hover:opacity-90"
                onClick={handleSave}
                disabled={marketingSaveDisabled}
              >
                {saveMut.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save marketing'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EngagementTicketingPanel({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['engagements', engagementId],
    queryFn: () => fetchEngagement(engagementId),
    retry: 1,
  });
  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
    retry: 1,
  });

  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [engagementScaling, setEngagementScaling] = useState('');
  const [vipPackagedOffer, setVipPackagedOffer] = useState('');
  const [preSaleSpecialPrices, setPreSaleSpecialPrices] = useState('');
  const [kidsTicketsPrices, setKidsTicketsPrices] = useState('');
  const {
    hasUserEdited: hasTicketingUserEdited,
    markUserEdited: markTicketingUserEdited,
    clearUserEdited: clearTicketingUserEdited,
  } = useUserEditTracker(`${engagementId}:${selectedPid ?? ''}`);

  const performanceSelectOptions = useMemo<Select2Option[]>(
    () =>
      (performancesQuery.data ?? []).map((p) => ({
        value: String(p.performanceId),
        label: `${formatPerformanceDateDisplay(p.performanceDate)} · ${formatPerformanceTimeDisplay(
          p.performanceTime,
        )} · ${p.performanceStatus}`,
      })),
    [performancesQuery.data],
  );

  useEffect(() => {
    setEngagementScaling(detailQuery.data?.engagementScaling ?? '');
  }, [detailQuery.data?.engagementScaling]);

  useEffect(() => {
    const list = performancesQuery.data;
    if (!list?.length) {
      setSelectedPid(null);
      return;
    }
    setSelectedPid((prev) => {
      if (prev != null && list.some((p) => p.performanceId === prev)) return prev;
      return list[0]!.performanceId;
    });
  }, [performancesQuery.data]);

  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid] as const,
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, selectedPid!),
    enabled: selectedPid != null && selectedPid > 0,
    retry: 1,
  });

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return;
    setVipPackagedOffer(d.vipPackagedOffer ?? '');
    setPreSaleSpecialPrices(d.preSaleSpecialPrices ?? '');
    setKidsTicketsPrices(d.kidsTicketsPrices ?? '');
  }, [selectedPid, ticketingQuery.data]);

  const ticketingDirtyRaw = useMemo(() => {
    const d = ticketingQuery.data;
    const detail = detailQuery.data;
    if (!detail || !d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const cur = {
      engagementScaling: engagementScaling.trim() || null,
      vipPackagedOffer: vipPackagedOffer.trim() ? vipPackagedOffer.trim().slice(0, 255) : null,
      preSaleSpecialPrices: preSaleSpecialPrices.trim() || null,
      kidsTicketsPrices: kidsTicketsPrices.trim() || null,
    };
    const base = {
      engagementScaling: (detail.engagementScaling ?? '').trim() || null,
      vipPackagedOffer: (d.vipPackagedOffer ?? '').trim()
        ? (d.vipPackagedOffer ?? '').trim().slice(0, 255)
        : null,
      preSaleSpecialPrices: (d.preSaleSpecialPrices ?? '').trim() || null,
      kidsTicketsPrices: (d.kidsTicketsPrices ?? '').trim() || null,
    };
    return JSON.stringify(cur) !== JSON.stringify(base);
  }, [
    detailQuery.data,
    engagementScaling,
    kidsTicketsPrices,
    preSaleSpecialPrices,
    selectedPid,
    ticketingQuery.data,
    vipPackagedOffer,
  ]);
  const ticketingDirty = hasTicketingUserEdited && ticketingDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(ticketingDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, ticketingDirty]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving ticketing.');
      await updateEngagement(engagementId, {
        engagementScaling: engagementScaling.trim() ? engagementScaling.trim().slice(0, 50) : null,
      });
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        vipPackagedOffer: vipPackagedOffer.trim() ? vipPackagedOffer.trim().slice(0, 255) : null,
        preSaleSpecialPrices: preSaleSpecialPrices.trim() || null,
        kidsTicketsPrices: kidsTicketsPrices.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await qc.invalidateQueries({
        queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid],
      });
      clearTicketingUserEdited();
      addToast('Ticketing saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const disabled =
    saveMut.isPending ||
    detailQuery.isLoading ||
    performancesQuery.isLoading ||
    ticketingQuery.isLoading;
  const saveDisabled = disabled || !ticketingDirty;
  const loadError = detailQuery.error ?? performancesQuery.error ?? ticketingQuery.error;

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-52 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1 sm:max-w-none">{control}</div>
    </div>
  );

  if (performancesQuery.isLoading && !performancesQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading ticketing…
      </div>
    );
  }

  if (!(performancesQuery.data ?? []).length) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-text-muted">
        Add at least one show date on the <strong className="text-text-primary">Performance Schedule</strong>{' '}
        tab to edit ticketing.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-5 p-5">
        <h3 className="text-base font-semibold text-text-primary">Ticketing</h3>

        {loadError && (
          <div className="flex flex-wrap items-center gap-2 text-ems-coral text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {friendlyApiError(loadError)}
          </div>
        )}

        <FormField label="Show">
          <Select2
            options={performanceSelectOptions}
            value={selectedPid == null ? '' : String(selectedPid)}
            onChange={(value) => setSelectedPid(fkIdStringToNumber(value))}
            placeholder="Select show…"
            disabled={saveMut.isPending}
          />
        </FormField>

        {ticketingQuery.isLoading && (
          <div className="flex items-center gap-2 text-text-muted text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Loading selected show ticketing…
          </div>
        )}

        {!ticketingQuery.isLoading && !ticketingQuery.isError && ticketingQuery.data && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow(
                'Scaling',
                <input
                  className={inputCls}
                  maxLength={50}
                  value={engagementScaling}
                  onChange={(e) => {
                    markTicketingUserEdited();
                    setEngagementScaling(e.target.value);
                  }}
                  disabled={disabled}
                />,
              )}
              {fieldRow(
                'VIP Package Offered',
                <input
                  className={inputCls}
                  maxLength={255}
                  value={vipPackagedOffer}
                  onChange={(e) => {
                    markTicketingUserEdited();
                    setVipPackagedOffer(e.target.value);
                  }}
                  disabled={disabled}
                />,
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
              <div className="min-w-0 lg:col-span-2">
                {fieldRow(
                  'Pre Sale Special Prices',
                  <textarea
                    className={`${inputCls} min-h-[100px] resize-y`}
                    value={preSaleSpecialPrices}
                    onChange={(e) => {
                      markTicketingUserEdited();
                      setPreSaleSpecialPrices(e.target.value);
                    }}
                    disabled={disabled}
                  />,
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
              <div className="min-w-0 lg:col-span-2">
                {fieldRow(
                  'Kids Ticket Prices',
                  <textarea
                    className={`${inputCls} min-h-[100px] resize-y`}
                    value={kidsTicketsPrices}
                    onChange={(e) => {
                      markTicketingUserEdited();
                      setKidsTicketsPrices(e.target.value);
                    }}
                    disabled={disabled}
                  />,
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                className="bg-ems-accent text-white hover:opacity-90"
                onClick={() => saveMut.mutate()}
                disabled={saveDisabled}
              >
                {saveMut.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save ticketing'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EngagementOverviewIaeStaffSection({
  engagementId,
  enabled,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  enabled: boolean;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const lookupsQuery = useQuery({
    queryKey: ['engagements', 'iae-contact-lookups'],
    queryFn: fetchEngagementIaeContactLookups,
    staleTime: 300_000,
    enabled,
  });

  const listQuery = useQuery({
    queryKey: ['engagements', engagementId, 'iae-contacts'],
    queryFn: () => fetchEngagementIaeContacts(engagementId),
    enabled,
    retry: 1,
  });

  const [addContactId, setAddContactId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [addDeptId, setAddDeptId] = useState('');
  const [addIsPrimary, setAddIsPrimary] = useState(false);
  const [addNotes, setAddNotes] = useState('');

  const [editRow, setEditRow] = useState<ApiEngagementIaeContactRow | null>(null);
  const [pendingDeleteRow, setPendingDeleteRow] =
    useState<ApiEngagementIaeContactRow | null>(null);
  const [edContactId, setEdContactId] = useState('');
  const [edRoleId, setEdRoleId] = useState('');
  const [edDeptId, setEdDeptId] = useState('');
  const [edNotes, setEdNotes] = useState('');
  const [edPrimary, setEdPrimary] = useState(false);
  const {
    hasUserEdited: hasOverviewStaffUserEdited,
    markUserEdited: markOverviewStaffUserEdited,
    clearUserEdited: clearOverviewStaffUserEdited,
  } = useUserEditTracker(`${engagementId}:${enabled ? 'enabled' : 'disabled'}`);

  useEffect(() => {
    if (!editRow) return;
    setEdContactId(String(editRow.contactId));
    setEdRoleId(editRow.roleId != null ? String(editRow.roleId) : '');
    setEdDeptId(editRow.departmentId != null ? String(editRow.departmentId) : '');
    setEdNotes(editRow.notes ?? '');
    setEdPrimary(editRow.isPrimary);
  }, [editRow]);

  const contactOpts = useMemo((): Select2Option[] => {
    const rows = lookupsQuery.data?.contacts ?? [];
    return rows.map((r) => ({ value: String(r.id), label: r.label }));
  }, [lookupsQuery.data?.contacts]);

  const roleOpts = useMemo((): Select2Option[] => {
    const rows = lookupsQuery.data?.roles ?? [];
    return [{ value: '', label: 'Not set' }, ...rows.map((r) => ({ value: String(r.id), label: r.label }))];
  }, [lookupsQuery.data?.roles]);

  const deptOpts = useMemo((): Select2Option[] => {
    const rows = lookupsQuery.data?.departments ?? [];
    return [{ value: '', label: 'Not set' }, ...rows.map((r) => ({ value: String(r.id), label: r.label }))];
  }, [lookupsQuery.data?.departments]);

  const invalidateList = async () => {
    await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'iae-contacts'] });
    await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
  };

  const addMut = useMutation({
    mutationFn: async (body: CreateEngagementIaeContactPayload) => {
      await addEngagementIaeContact(engagementId, body);
      await invalidateList();
    },
    onSuccess: () => {
      setAddContactId('');
      setAddRoleId('');
      setAddDeptId('');
      setAddIsPrimary(false);
      setAddNotes('');
      clearOverviewStaffUserEdited();
      setTimeout(() => addToast('IAE staff assignment added.', 'success'), 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: async (p: { eicId: number; body: UpdateEngagementIaeContactPayload }) => {
      await updateEngagementIaeContact(engagementId, p.eicId, p.body);
      await invalidateList();
    },
    onSuccess: () => {
      setEditRow(null);
      clearOverviewStaffUserEdited();
      setTimeout(() => addToast('IAE staff assignment updated.', 'success'), 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (eicId: number) => {
      await deleteEngagementIaeContact(engagementId, eicId);
      await invalidateList();
    },
    onSuccess: () => {
      setPendingDeleteRow(null);
      setTimeout(() => addToast('IAE staff assignment removed.', 'success'), 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const sectionBusy = addMut.isPending || updateMut.isPending || deleteMut.isPending;

  const handleAdd = () => {
    const cid = fkIdStringToNumber(addContactId);
    if (cid == null) {
      addToast('Select an IAE staff contact.', 'warning');
      return;
    }
    const rid = fkIdStringToNumber(addRoleId);
    const did = fkIdStringToNumber(addDeptId);
    const notesTrim = addNotes.trim();
    addMut.mutate({
      contactId: cid,
      roleId: rid,
      departmentId: did,
      isPrimary: addIsPrimary,
      notes: notesTrim === '' ? null : notesTrim.slice(0, 500),
    });
  };

  const handleSaveEdit = () => {
    if (!editRow) return;
    const cid = fkIdStringToNumber(edContactId);
    if (cid == null) {
      addToast('Select an IAE staff contact.', 'warning');
      return;
    }
    const rid = fkIdStringToNumber(edRoleId);
    const did = fkIdStringToNumber(edDeptId);
    const notesTrim = edNotes.trim();
    updateMut.mutate({
      eicId: editRow.engagementIaeContactId,
      body: {
        contactId: cid,
        roleId: rid,
        departmentId: did,
        isPrimary: edPrimary,
        notes: notesTrim === '' ? null : notesTrim.slice(0, 500),
      },
    });
  };

  const handleDelete = (r: ApiEngagementIaeContactRow) => {
    setPendingDeleteRow(r);
  };

  const addFormDirty = useMemo(
    () =>
      addContactId.trim() !== '' ||
      addRoleId.trim() !== '' ||
      addDeptId.trim() !== '' ||
      addIsPrimary ||
      addNotes.trim() !== '',
    [addContactId, addRoleId, addDeptId, addIsPrimary, addNotes],
  );

  const editModalDirty = useMemo(() => {
    if (!editRow) return false;
    const cid = fkIdStringToNumber(edContactId);
    const rid = fkIdStringToNumber(edRoleId);
    const did = fkIdStringToNumber(edDeptId);
    const notesTrim = edNotes.trim();
    const bodyNotes = notesTrim === '' ? null : notesTrim.slice(0, 500);
    const rowNotesRaw = (editRow.notes ?? '').trim();
    const rowNotes = rowNotesRaw === '' ? null : rowNotesRaw.slice(0, 500);
    return (
      cid !== editRow.contactId ||
      (rid ?? null) !== (editRow.roleId ?? null) ||
      (did ?? null) !== (editRow.departmentId ?? null) ||
      edPrimary !== editRow.isPrimary ||
      bodyNotes !== rowNotes
    );
  }, [editRow, edContactId, edRoleId, edDeptId, edNotes, edPrimary]);

  const overviewIaeStaffDirty =
    hasOverviewStaffUserEdited && (addFormDirty || editModalDirty);
  useEffect(() => {
    onDirtyChange?.(enabled ? overviewIaeStaffDirty : false);
    return () => onDirtyChange?.(false);
  }, [enabled, onDirtyChange, overviewIaeStaffDirty]);

  if (!enabled) return null;

  const loadErr = lookupsQuery.error ?? listQuery.error;

  const primaryCheckbox = (
    checked: boolean,
    onChange: (checked: boolean) => void,
    disabled: boolean,
  ) => (
    <label
      className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
        checked
          ? 'border-ems-accent bg-ems-accent/10'
          : 'border-border bg-surface hover:bg-hover'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium text-text-primary">Mark as primary</span>
        <span className="text-xs text-text-muted">
          Primary IAE contact for this engagement.
        </span>
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-border accent-ems-accent focus:ring-2 focus:ring-ems-accent/30"
        checked={checked}
        onChange={(e) => {
          markOverviewStaffUserEdited();
          onChange(e.target.checked);
        }}
        disabled={disabled}
      />
    </label>
  );

  return (
    <>
      <div
        className="relative rounded-lg border border-border bg-surface/40 p-4"
        aria-busy={sectionBusy}
      >
        {sectionBusy && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
              Saving to database…
            </span>
          </div>
        )}
        <h3 className="text-sm font-semibold text-text-primary mb-1">IAE staff on this engagement</h3>
        <p className="text-xs text-text-muted mb-4">
          Assign internal contacts (dbo.EngagementIAEContact). The same person cannot repeat the same role per
          engagement.
        </p>

        {lookupsQuery.isLoading || listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Loading…
          </div>
        ) : loadErr ? (
          <div className="flex flex-wrap items-center gap-2 text-ems-coral text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {friendlyApiError(loadErr)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-surface text-text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Staff</th>
                    <th className="text-left px-3 py-2 font-medium">Role</th>
                    <th className="text-left px-3 py-2 font-medium">Department</th>
                    <th className="text-left px-3 py-2 font-medium">Primary</th>
                    <th className="text-left px-3 py-2 font-medium">Notes</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(listQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                        No IAE staff linked yet. Add someone below.
                      </td>
                    </tr>
                  ) : (
                    (listQuery.data ?? []).map((r) => (
                      <tr key={r.engagementIaeContactId} className="border-t border-border/80">
                        <td className="px-3 py-2.5 text-text-primary font-medium">{r.contactLabel}</td>
                        <td className="px-3 py-2.5 text-text-secondary">{r.roleName ?? '—'}</td>
                        <td className="px-3 py-2.5 text-text-secondary">{r.departmentName ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {r.isPrimary ? (
                            <span className="inline-flex items-center gap-1 text-ems-accent text-xs font-medium">
                              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                              Primary
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2.5 text-text-secondary max-w-[220px] truncate"
                          title={r.notes ?? ''}
                        >
                          {r.notes?.trim() ? r.notes : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            className="text-xs text-ems-accent underline disabled:opacity-50"
                            disabled={sectionBusy}
                            onClick={() => setEditRow(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs text-ems-coral underline disabled:opacity-50"
                            disabled={sectionBusy}
                            onClick={() => handleDelete(r)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-4">
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Add staff</h4>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-8">
                <FormField label="IAE contact" required>
                  <Select2
                    options={contactOpts}
                    value={addContactId}
                    onChange={(v) => {
                      markOverviewStaffUserEdited();
                      setAddContactId(v);
                    }}
                    placeholder="Select contact…"
                    disabled={sectionBusy}
                  />
                </FormField>
                <FormField label="Role">
                  <Select2
                    options={roleOpts}
                    value={addRoleId}
                    onChange={(v) => {
                      markOverviewStaffUserEdited();
                      setAddRoleId(v);
                    }}
                    placeholder="Not set"
                    disabled={sectionBusy}
                  />
                </FormField>
                <FormField label="Department">
                  <Select2
                    options={deptOpts}
                    value={addDeptId}
                    onChange={(v) => {
                      markOverviewStaffUserEdited();
                      setAddDeptId(v);
                    }}
                    placeholder="Not set"
                    disabled={sectionBusy}
                  />
                </FormField>
                <FormField label="Primary contact for this engagement">
                  {primaryCheckbox(addIsPrimary, setAddIsPrimary, sectionBusy)}
                </FormField>
              </div>
              <FormField label="Notes (max 500)">
                <textarea
                  className={`${inputCls} min-h-[72px] resize-y`}
                  maxLength={500}
                  value={addNotes}
                  onChange={(e) => {
                    markOverviewStaffUserEdited();
                    setAddNotes(e.target.value);
                  }}
                  disabled={sectionBusy}
                />
              </FormField>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="bg-ems-accent text-white hover:opacity-90"
                  disabled={sectionBusy || !addFormDirty}
                  onClick={handleAdd}
                >
                  {addMut.isPending ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Adding…
                    </span>
                  ) : (
                    'Add IAE staff'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {editRow && (
        <Modal
          title="Edit IAE staff assignment"
          onClose={() => !updateMut.isPending && setEditRow(null)}
          width={520}
        >
          <div className="space-y-4">
            <FormField label="IAE contact" required>
              <Select2
                options={contactOpts}
                value={edContactId}
                onChange={(v) => {
                  markOverviewStaffUserEdited();
                  setEdContactId(v);
                }}
                placeholder="Select contact…"
                disabled={updateMut.isPending}
              />
            </FormField>
            <FormField label="Role">
              <Select2
                options={roleOpts}
                value={edRoleId}
                onChange={(v) => {
                  markOverviewStaffUserEdited();
                  setEdRoleId(v);
                }}
                placeholder="Not set"
                disabled={updateMut.isPending}
              />
            </FormField>
            <FormField label="Department">
              <Select2
                options={deptOpts}
                value={edDeptId}
                onChange={(v) => {
                  markOverviewStaffUserEdited();
                  setEdDeptId(v);
                }}
                placeholder="Not set"
                disabled={updateMut.isPending}
              />
            </FormField>
            <FormField label="Primary for this engagement">
              {primaryCheckbox(edPrimary, setEdPrimary, updateMut.isPending)}
            </FormField>
            <FormField label="Notes">
              <textarea
                className={`${inputCls} min-h-[88px] resize-y`}
                maxLength={500}
                value={edNotes}
                onChange={(e) => {
                  markOverviewStaffUserEdited();
                  setEdNotes(e.target.value);
                }}
                disabled={updateMut.isPending}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => !updateMut.isPending && setEditRow(null)}
                disabled={updateMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-ems-accent text-white hover:opacity-90"
                disabled={updateMut.isPending || !editModalDirty}
                onClick={handleSaveEdit}
              >
                {updateMut.isPending ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <AlertDialog
        open={pendingDeleteRow !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setPendingDeleteRow(null);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this IAE staff assignment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You’re about to remove{' '}
              <span className="font-medium text-text-primary">
                {pendingDeleteRow?.contactLabel ?? 'this staff member'}
              </span>{' '}
              from this engagement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMut.isPending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
              <span>Removing IAE staff assignment…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteMut.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending || pendingDeleteRow == null}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => {
                if (!pendingDeleteRow) return;
                deleteMut.mutate(pendingDeleteRow.engagementIaeContactId);
              }}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EngagementFinancePanel({
  engagementId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const [estimatedBreakeven, setEstimatedBreakeven] = useState('');
  const [grossPotential, setGrossPotential] = useState('');
  const [venueTerms, setVenueTerms] = useState('');
  const [confPacket, setConfPacket] = useState('');
  const [iaeConfNum, setIaeConfNum] = useState('');
  const [iaeSubmitDate, setIaeSubmitDate] = useState(getTodayDateString());
  const [iaeStatus, setIaeStatus] = useState('');
  const [dateFundsReceived, setDateFundsReceived] = useState(getTodayDateString());
  const [fundsDue, setFundsDue] = useState('');
  const [fundsWithheld, setFundsWithheld] = useState('');
  const [fundsOwed, setFundsOwed] = useState('');
  const [receivableBank, setReceivableBank] = useState('');
  const [withholdingFk, setWithholdingFk] = useState('');
  const [artistFinanceFk, setArtistFinanceFk] = useState('');
  const [settlementFinanceFk, setSettlementFinanceFk] = useState('');
  const {
    hasUserEdited: hasFinanceUserEdited,
    markUserEdited: markFinanceUserEdited,
    clearUserEdited: clearFinanceUserEdited,
  } = useUserEditTracker(engagementId);

  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const lookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
    retry: 1,
  });

  const ldata = lookupsQuery.data as ApiEngagementFinanceLookups | undefined;

  const ieaStatusSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.iaeApplicationWaiverStatuses ?? [];
    const base = rows.map((r) => ({ value: r.value, label: r.label }));
    if (iaeStatus && !base.some((o) => o.value === iaeStatus)) {
      return [{ value: iaeStatus, label: `${iaeStatus} (saved)` }, ...base];
    }
    return base;
  }, [ldata?.iaeApplicationWaiverStatuses, iaeStatus]);

  const withholdingSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.nonResidentWithholdings ?? [];
    const base = rows.map((r) => ({ value: String(r.id), label: r.label }));
    if (withholdingFk && !base.some((o) => o.value === withholdingFk)) {
      return [{ value: withholdingFk, label: 'Current selection (saved)' }, ...base];
    }
    return base;
  }, [ldata?.nonResidentWithholdings, withholdingFk]);

  const artistFinanceSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.artistFinances ?? [];
    const base = rows.map((r) => ({ value: String(r.id), label: r.label }));
    if (artistFinanceFk && !base.some((o) => o.value === artistFinanceFk)) {
      return [{ value: artistFinanceFk, label: 'Current selection (saved)' }, ...base];
    }
    return base;
  }, [ldata?.artistFinances, artistFinanceFk]);

  const settlementFinanceSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.settlementFinances ?? [];
    const base = rows.map((r) => ({ value: String(r.id), label: r.label }));
    if (settlementFinanceFk && !base.some((o) => o.value === settlementFinanceFk)) {
      return [
        { value: settlementFinanceFk, label: 'Current selection (saved)' },
        ...base,
      ];
    }
    return base;
  }, [ldata?.settlementFinances, settlementFinanceFk]);

  const saveMut = useMutation({
    mutationFn: (body: UpdateEngagementFinancePayload) => updateEngagementFinance(engagementId, body),
    onSuccess: async (_data, body) => {
      addToast('Finance details saved.', 'success');
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      if (body && ('sellableCapacity' in body || 'grossPotential' in body)) {
        await invalidateSalesCapacityRelatedQueries(qc);
      }
      clearFinanceUserEdited();
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setEstimatedBreakeven(numFieldToString(d.estimatedBreakeven));
    setGrossPotential(numFieldToString(d.grossPotential));
    setVenueTerms(d.venueTerms ?? '');
    setConfPacket(boolToConfPacket(d.confirmationPacketApproved));
    setIaeConfNum(d.iaeWaiverApplicationConfirmationNumber ?? '');
    setIaeSubmitDate(d.iaeWaiverApplicationSubmissionDate ?? '');
    setIaeStatus(d.iaeApplicationWaiverStatus ?? '');
    setDateFundsReceived(d.dateFundsReceived ?? '');
    setFundsDue(numFieldToString(d.fundsDue));
    setFundsWithheld(numFieldToString(d.fundsWithheld));
    setFundsOwed(numFieldToString(d.fundsOwed));
    setReceivableBank(d.receivableBankAccount ?? '');
    setWithholdingFk(intFieldToString(d.requiredNonResidentWithholdingId));
    setArtistFinanceFk(intFieldToString(d.artistFinanceId));
    setSettlementFinanceFk(intFieldToString(d.settlementFinanceId));
  }, [financeQuery.data]);

  const handleSave = () => {
    const a = (label: string, s: string) => parseOptionalDecimal(s, label);
    const e1 = a('Estimated breakeven', estimatedBreakeven);
    const e2 = a('Gross potential', grossPotential);
    const e4 = a('Funds due', fundsDue);
    const e5 = a('Funds withheld', fundsWithheld);
    const e6 = a('Funds owed', fundsOwed);
    for (const x of [e1, e2, e4, e5, e6]) {
      if (!x.ok) {
        addToast(x.message, 'error');
        return;
      }
    }
    const w = fkIdStringToNumber(withholdingFk);
    const af = fkIdStringToNumber(artistFinanceFk);
    const sf = fkIdStringToNumber(settlementFinanceFk);
    if (withholdingFk.trim() !== '' && w == null) {
      addToast('Select a valid non-resident withholding, or clear the field.', 'error');
      return;
    }
    if (artistFinanceFk.trim() !== '' && af == null) {
      addToast('Select a valid artist finance row, or clear the field.', 'error');
      return;
    }
    if (settlementFinanceFk.trim() !== '' && sf == null) {
      addToast('Select a valid settlement finance row, or clear the field.', 'error');
      return;
    }

    saveMut.mutate({
      estimatedBreakeven: e1.value,
      grossPotential: e2.value,
      venueTerms: venueTerms === '' ? null : venueTerms,
      confirmationPacketApproved: confPacket === '' ? null : confPacket === '1',
      iaeWaiverApplicationConfirmationNumber: iaeConfNum.trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate: iaeSubmitDate.trim() || null,
      iaeApplicationWaiverStatus: iaeStatus.trim() || null,
      dateFundsReceived: dateFundsReceived.trim() || null,
      fundsDue: e4.value,
      fundsWithheld: e5.value,
      fundsOwed: e6.value,
      receivableBankAccount: receivableBank.trim() || null,
      requiredNonResidentWithholdingId: w,
      artistFinanceId: af,
      settlementFinanceId: sf,
    });
  };

  const financeFormDirtyRaw = useMemo(() => {
    const r = financeQuery.data;
    if (!r) return false;
    const e1 = parseOptionalDecimal(estimatedBreakeven, 'l');
    const e2 = parseOptionalDecimal(grossPotential, 'l');
    const e4 = parseOptionalDecimal(fundsDue, 'l');
    const e5 = parseOptionalDecimal(fundsWithheld, 'l');
    const e6 = parseOptionalDecimal(fundsOwed, 'l');
    if (!e1.ok || !e2.ok || !e4.ok || !e5.ok || !e6.ok) return true;
    const w = fkIdStringToNumber(withholdingFk);
    const af = fkIdStringToNumber(artistFinanceFk);
    const sf = fkIdStringToNumber(settlementFinanceFk);
    if (withholdingFk.trim() !== '' && w == null) return true;
    if (artistFinanceFk.trim() !== '' && af == null) return true;
    if (settlementFinanceFk.trim() !== '' && sf == null) return true;
    const venueNorm = (s: string | null | undefined) => {
      const v = s ?? '';
      return v === '' ? null : v;
    };
    const cur = {
      estimatedBreakeven: e1.value,
      grossPotential: e2.value,
      venueTerms: venueTerms === '' ? null : venueTerms,
      confirmationPacketApproved: confPacket === '' ? null : confPacket === '1',
      iaeWaiverApplicationConfirmationNumber: iaeConfNum.trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate: iaeSubmitDate.trim() || null,
      iaeApplicationWaiverStatus: iaeStatus.trim() || null,
      dateFundsReceived: dateFundsReceived.trim() || null,
      fundsDue: e4.value,
      fundsWithheld: e5.value,
      fundsOwed: e6.value,
      receivableBankAccount: receivableBank.trim() || null,
      requiredNonResidentWithholdingId: w,
      artistFinanceId: af,
      settlementFinanceId: sf,
    };
    const base = {
      estimatedBreakeven: r.estimatedBreakeven ?? null,
      grossPotential: r.grossPotential ?? null,
      venueTerms: venueNorm(r.venueTerms),
      confirmationPacketApproved: r.confirmationPacketApproved,
      iaeWaiverApplicationConfirmationNumber:
        (r.iaeWaiverApplicationConfirmationNumber ?? '').trim().slice(0, 100) || null,
      iaeWaiverApplicationSubmissionDate:
        (r.iaeWaiverApplicationSubmissionDate ?? '').trim() || null,
      iaeApplicationWaiverStatus: (r.iaeApplicationWaiverStatus ?? '').trim() || null,
      dateFundsReceived: (r.dateFundsReceived ?? '').trim() || null,
      fundsDue: r.fundsDue ?? null,
      fundsWithheld: r.fundsWithheld ?? null,
      fundsOwed: r.fundsOwed ?? null,
      receivableBankAccount: (r.receivableBankAccount ?? '').trim() || null,
      requiredNonResidentWithholdingId: r.requiredNonResidentWithholdingId ?? null,
      artistFinanceId: r.artistFinanceId ?? null,
      settlementFinanceId: r.settlementFinanceId ?? null,
    };
    return JSON.stringify(cur) !== JSON.stringify(base);
  }, [
    financeQuery.data,
    estimatedBreakeven,
    grossPotential,
    venueTerms,
    confPacket,
    iaeConfNum,
    iaeSubmitDate,
    iaeStatus,
    dateFundsReceived,
    fundsDue,
    fundsWithheld,
    fundsOwed,
    receivableBank,
    withholdingFk,
    artistFinanceFk,
    settlementFinanceFk,
  ]);
  const financeFormDirty = hasFinanceUserEdited && financeFormDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(financeFormDirty);
    return () => onDirtyChange?.(false);
  }, [financeFormDirty, onDirtyChange]);

  if (financeQuery.isLoading && !financeQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading finance…
      </div>
    );
  }

  if (financeQuery.error) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(financeQuery.error)}
          <button
            type="button"
            onClick={() => void financeQuery.refetch()}
            className="text-xs underline ml-1"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rec = financeQuery.data;
  const fkDisabled = saveMut.isPending || lookupsQuery.isLoading;
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-8">
      {lookupsQuery.isError && (
        <p className="text-xs text-ems-coral">
          {friendlyApiError(lookupsQuery.error)} — dropdowns may be incomplete.{' '}
          <button type="button" className="underline" onClick={() => void lookupsQuery.refetch()}>
            Retry
          </button>
        </p>
      )}

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Estimates &amp; venue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Payable entity">
            <div className="min-h-[34px] rounded border border-border bg-elevated px-3 py-1.5 text-sm text-text-primary">
              {rec?.payableEntityCompanyName?.trim() || 'Not set'}
            </div>
          </FormField>
          <div className="hidden sm:block" aria-hidden />
          <FormField label="Estimated breakeven">
            <input
              className={inputCls}
              inputMode="decimal"
              value={estimatedBreakeven}
              onChange={(e) => {
                markFinanceUserEdited();
                setEstimatedBreakeven(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Gross potential">
            <input
              className={inputCls}
              inputMode="decimal"
              value={grossPotential}
              onChange={(e) => {
                markFinanceUserEdited();
                setGrossPotential(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="Venue terms">
            <textarea
              className={`${inputCls} min-h-[88px] resize-y`}
              value={venueTerms}
              onChange={(e) => {
                markFinanceUserEdited();
                setVenueTerms(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">IAE waiver</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Confirmation packet approved">
            <Select2
              options={CONFIRMATION_PACKET_SELECT_OPTIONS}
              value={confPacket}
              onChange={(value) => {
                markFinanceUserEdited();
                setConfPacket(value);
              }}
              placeholder="Not set"
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Waiver application confirmation #">
            <input
              className={inputCls}
              value={iaeConfNum}
              onChange={(e) => {
                markFinanceUserEdited();
                setIaeConfNum(e.target.value);
              }}
              disabled={saveMut.isPending}
              maxLength={100}
            />
          </FormField>
          <FormField label="Waiver application submission date">
            <input
              type="date"
              className={inputCls}
              value={iaeSubmitDate}
              onChange={(e) => {
                markFinanceUserEdited();
                setIaeSubmitDate(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Application / waiver status">
            <Select2
              options={ieaStatusSelectOptions}
              value={iaeStatus}
              onChange={(value) => {
                markFinanceUserEdited();
                setIaeStatus(value);
              }}
              placeholder="Select…"
              allowClear
              disabled={fkDisabled}
            />
          </FormField>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Funds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date funds received">
            <input
              type="date"
              className={inputCls}
              value={dateFundsReceived}
              onChange={(e) => {
                markFinanceUserEdited();
                setDateFundsReceived(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Funds due">
            <input
              className={inputCls}
              inputMode="decimal"
              value={fundsDue}
              onChange={(e) => {
                markFinanceUserEdited();
                setFundsDue(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Funds withheld">
            <input
              className={inputCls}
              inputMode="decimal"
              value={fundsWithheld}
              onChange={(e) => {
                markFinanceUserEdited();
                setFundsWithheld(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <FormField label="Funds owed">
            <input
              className={inputCls}
              inputMode="decimal"
              value={fundsOwed}
              onChange={(e) => {
                markFinanceUserEdited();
                setFundsOwed(e.target.value);
              }}
              disabled={saveMut.isPending}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Receivable bank account">
              <input
                className={inputCls}
                value={receivableBank}
                onChange={(e) => {
                  markFinanceUserEdited();
                  setReceivableBank(e.target.value);
                }}
                disabled={saveMut.isPending}
                maxLength={255}
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Linked records</h3>
        <p className="text-xs text-text-muted mb-3">Master table links; choose &quot;None&quot; to clear.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Non-resident withholding">
            <Select2
              options={withholdingSelectOptions}
              value={withholdingFk}
              onChange={(value) => {
                markFinanceUserEdited();
                setWithholdingFk(value);
              }}
              placeholder="None"
              allowClear
              disabled={fkDisabled}
            />
          </FormField>
          <FormField label="Artist finance">
            <Select2
              options={artistFinanceSelectOptions}
              value={artistFinanceFk}
              onChange={(value) => {
                markFinanceUserEdited();
                setArtistFinanceFk(value);
              }}
              placeholder="None"
              allowClear
              disabled={fkDisabled}
            />
          </FormField>
          <FormField label="Settlement finance">
            <Select2
              options={settlementFinanceSelectOptions}
              value={settlementFinanceFk}
              onChange={(value) => {
                markFinanceUserEdited();
                setSettlementFinanceFk(value);
              }}
              placeholder="None"
              allowClear
              disabled={fkDisabled}
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          className="bg-ems-accent text-white hover:opacity-90"
          onClick={handleSave}
          disabled={saveMut.isPending || financeQuery.isFetching || !financeFormDirty}
        >
          {saveMut.isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving…
            </span>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail page
// ---------------------------------------------------------------------------
interface Props {
  engagementId: number;
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function EngagementDetailPage({
  engagementId,
  onNavigate,
  addToast,
}: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [tabDirtyState, setTabDirtyState] = useState<Record<string, boolean>>({});
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedTabAlert, setShowUnsavedTabAlert] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [sellableCapacityInput, setSellableCapacityInput] = useState('');
  const [grossPotentialInput, setGrossPotentialInput] = useState('');
  const [rehearsalDateInput, setRehearsalDateInput] = useState('');
  const [loadInDateInput, setLoadInDateInput] = useState('');
  const {
    hasUserEdited: hasCapacityFieldsUserEdited,
    markUserEdited: markCapacityFieldsUserEdited,
    clearUserEdited: clearCapacityFieldsUserEdited,
  } = useUserEditTracker(`${engagementId}:capacity`);
  const {
    hasUserEdited: hasProductionDatesUserEdited,
    markUserEdited: markProductionDatesUserEdited,
    clearUserEdited: clearProductionDatesUserEdited,
  } = useUserEditTracker(`${engagementId}:production-dates`);

  // ── Data ────────────────────────────────────────────────────────────────
  const detailQuery = useQuery({
    queryKey: ['engagements', engagementId],
    queryFn: () => fetchEngagement(engagementId),
    retry: 2,
  });

  useEffect(() => {
    setTab('Overview');
    setTabDirtyState({});
    setPendingTab(null);
    setShowUnsavedTabAlert(false);
  }, [engagementId]);

  const lookupsQuery = useQuery({
    queryKey: ['engagements-lookups'],
    queryFn: async () => {
      const lookupLimit = 10000;
      const [attractions, tours, companies] = await Promise.all([
        fetchAttractions(0, lookupLimit),
        fetchTours(0, lookupLimit),
        fetchCompanies(0, lookupLimit),
      ]);
      return {
        attractions: attractions.data ?? [],
        tours: tours.data ?? [],
        companies: companies.data ?? [],
      };
    },
    staleTime: 60_000,
  });

  const venueId = detailQuery.data?.primaryVenueCompanyId;

  const serviceProvidersQuery = useQuery({
    queryKey: ['engagements', engagementId, 'service-providers'],
    queryFn: () => fetchEngagementServiceProviders(engagementId),
    staleTime: 30_000,
  });

  const tourMgmtCompanyId = useMemo(() => {
    const r = detailQuery.data;
    if (r?.tourId == null) return null as number | null;
    const tours = lookupsQuery.data?.tours;
    if (tours === undefined) return undefined as unknown as number | null;
    const t = tours.find((x) => x.tourId === r.tourId);
    return t?.talentAgencyCompanyId ?? null;
  }, [detailQuery.data, lookupsQuery.data?.tours]);

  const selectedTourForContacts = useMemo(() => {
    const r = detailQuery.data;
    if (r?.tourId == null) return null;
    return (lookupsQuery.data?.tours ?? []).find((tour) => tour.tourId === r.tourId) ?? null;
  }, [detailQuery.data, lookupsQuery.data?.tours]);

  const tourSelectedTalentAgentIds = useMemo(
    () => new Set((selectedTourForContacts?.talentAgentContactIds ?? []).map(Number)),
    [selectedTourForContacts?.talentAgentContactIds],
  );

  const venueCompanyTypeNames = useMemo(() => {
    const company = (lookupsQuery.data?.companies ?? []).find((c) => c.companyId === venueId);
    const names = company?.companyTypeNames?.filter(Boolean) ?? [];
    return names.length > 0 ? names : ['Venue'];
  }, [lookupsQuery.data?.companies, venueId]);

  const serviceProviderContactGroups = useMemo(() => {
    const providers = serviceProvidersQuery.data?.providers ?? [];
    const companyById = new Map(
      (lookupsQuery.data?.companies ?? []).map((company) => [company.companyId, company]),
    );
    const groups = new Map<string, Set<number>>();
    for (const provider of providers) {
      const providerId = Number(provider.providerCompanyId);
      if (!Number.isInteger(providerId) || providerId < 1) continue;
      const company = companyById.get(providerId);
      const typeNames =
        company?.companyTypeNames?.filter(Boolean) ??
        (company?.companyTypeName ? [company.companyTypeName] : []);
      const fallbackNames =
        provider.serviceProvidedNames.length > 0
          ? provider.serviceProvidedNames.map((name) => `${name} Provider`)
          : ['Service Provider'];
      const headings = typeNames.length > 0 ? typeNames : fallbackNames;
      for (const heading of headings) {
        const title = `${heading} contacts`;
        const set = groups.get(title) ?? new Set<number>();
        set.add(providerId);
        groups.set(title, set);
      }
    }
    return Array.from(groups.entries()).map(([title, companyIds]) => ({
      title,
      companyIds: Array.from(companyIds),
    }));
  }, [lookupsQuery.data?.companies, serviceProvidersQuery.data?.providers]);

  const venueContactsQuery = useQuery({
    queryKey: ['company-contacts', 'venue', venueId],
    queryFn: () => fetchCompanyContacts(venueId!),
    enabled: tab === 'Contacts' && venueId != null && venueId > 0,
  });

  const tourContactsQuery = useQuery({
    queryKey: ['company-contacts', 'tour-mgmt', tourMgmtCompanyId],
    queryFn: () => fetchCompanyContacts(tourMgmtCompanyId as number),
    enabled:
      tab === 'Contacts' &&
      typeof tourMgmtCompanyId === 'number' &&
      tourMgmtCompanyId > 0,
  });

  const tourSelectedTalentAgentContacts = useMemo(() => {
    if (tourSelectedTalentAgentIds.size === 0) return [] as ApiCompanyContact[];
    return (tourContactsQuery.data ?? []).filter((contact) =>
      tourSelectedTalentAgentIds.has(contact.contactId),
    );
  }, [tourContactsQuery.data, tourSelectedTalentAgentIds]);

  // ── Engagement PATCH (split mutations so each Overview card gets a real isPending + loader) ──
  const engagementPatchError = (e: unknown) => addToast(friendlyApiError(e), 'error');

  const invalidateEngagementListAndDetail = async () => {
    await qc.invalidateQueries({ queryKey: ['engagements'] });
    await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
  };

  const engagementStatusMutation = useMutation({
    mutationFn: (body: Pick<UpdateEngagementPayload, 'engagementStatus'>) =>
      updateEngagement(engagementId, body),
    onSuccess: async () => {
      await invalidateEngagementListAndDetail();
      addToast('Status updated.', 'success');
    },
    onError: engagementPatchError,
  });

  const capacityFieldsMutation = useMutation({
    mutationFn: (
      body: Pick<UpdateEngagementPayload, 'sellableCapacity' | 'grossPotential'>,
    ) => updateEngagement(engagementId, body),
    onSuccess: async () => {
      await invalidateEngagementListAndDetail();
      await invalidateSalesCapacityRelatedQueries(qc);
      await qc.invalidateQueries({
        queryKey: ['engagements', engagementId, 'finance'],
      });
      clearCapacityFieldsUserEdited();
      addToast('Engagement capacity fields updated.', 'success');
    },
    onError: engagementPatchError,
  });

  const productionDatesMutation = useMutation({
    mutationFn: (body: Pick<UpdateEngagementPayload, 'rehearsalDate' | 'loadInDate'>) =>
      updateEngagement(engagementId, body),
    onSuccess: async () => {
      await invalidateEngagementListAndDetail();
      clearProductionDatesUserEdited();
      addToast('Production dates saved.', 'success');
    },
    onError: engagementPatchError,
  });

  const anyEngagementPatchPending =
    engagementStatusMutation.isPending ||
    capacityFieldsMutation.isPending ||
    productionDatesMutation.isPending;

  // ── Delete ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteEngagement(engagementId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements'] });
      addToast('Engagement deleted.', 'warning');
      onNavigate('engagements');
    },
    onError: (e: unknown) => {
      addToast(friendlyApiError(e), 'error');
      setPendingDelete(false);
    },
  });

  const row = detailQuery.data;

  useEffect(() => {
    if (!row) return;
    setSellableCapacityInput(
      row.sellableCapacity == null ? '' : String(row.sellableCapacity),
    );
    setGrossPotentialInput(row.grossPotential == null ? '' : String(row.grossPotential));
    setRehearsalDateInput(row.rehearsalDate ?? '');
    setLoadInDateInput(row.loadInDate ?? '');
  }, [row]);

  const handleStatusChange = (next: string) => {
    if (!next.trim() || next.length > 50) {
      addToast('Status must be 1–50 characters.', 'warning');
      return;
    }
    engagementStatusMutation.mutate({ engagementStatus: next });
  };

  const statusSelectOptions = useMemo(
    () => ENGAGEMENT_STATUS_ENUM.map((s) => ({ value: s, label: s })),
    [],
  );

  const canSaveCapacityFieldsRaw = useMemo(() => {
    if (!row) return false;
    const nextSellable = sellableCapacityInput.trim();
    const nextGross = grossPotentialInput.trim();
    const currentSellable = row.sellableCapacity == null ? '' : String(row.sellableCapacity);
    const currentGross = row.grossPotential == null ? '' : String(row.grossPotential);
    return nextSellable !== currentSellable || nextGross !== currentGross;
  }, [row, sellableCapacityInput, grossPotentialInput]);
  const canSaveCapacityFields = hasCapacityFieldsUserEdited && canSaveCapacityFieldsRaw;

  const canSaveProductionDatesRaw = useMemo(() => {
    if (!row) return false;
    const curR = row.rehearsalDate ?? '';
    const curL = row.loadInDate ?? '';
    return rehearsalDateInput !== curR || loadInDateInput !== curL;
  }, [row, rehearsalDateInput, loadInDateInput]);
  const canSaveProductionDates = hasProductionDatesUserEdited && canSaveProductionDatesRaw;

  const capacitySectionSaving = capacityFieldsMutation.isPending;
  const productionSectionSaving = productionDatesMutation.isPending;

  const handleSaveProductionDates = () => {
    const r = rehearsalDateInput.trim();
    const l = loadInDateInput.trim();
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    if (r && !ymd.test(r)) {
      addToast('Rehearsal date must be YYYY-MM-DD or empty.', 'warning');
      return;
    }
    if (l && !ymd.test(l)) {
      addToast('Load-in date must be YYYY-MM-DD or empty.', 'warning');
      return;
    }
    productionDatesMutation.mutate({
      rehearsalDate: r ? r : null,
      loadInDate: l ? l : null,
    });
  };

  const handleSaveCapacityFields = () => {
    const nextSellableRaw = sellableCapacityInput.trim();
    const nextGrossRaw = grossPotentialInput.trim();

    let sellableCapacity: number | null = null;
    if (nextSellableRaw !== '') {
      const parsed = Number(nextSellableRaw);
      if (!Number.isInteger(parsed) || parsed < 0) {
        addToast('Sellable capacity must be a non-negative whole number.', 'warning');
        return;
      }
      sellableCapacity = parsed;
    }

    let grossPotential: number | null = null;
    if (nextGrossRaw !== '') {
      const parsed = Number(nextGrossRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        addToast('Gross potential must be a non-negative number.', 'warning');
        return;
      }
      grossPotential = Number(parsed.toFixed(2));
    }

    capacityFieldsMutation.mutate({ sellableCapacity, grossPotential });
  };

  // ── Performances ────────────────────────────────────────────────────────
  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
  });

  const performanceCount = (performancesQuery.data ?? []).length;
  const canDeleteIndividualShow = performanceCount > 1;

  const [showAddPerformance, setShowAddPerformance] = useState(false);
  const pfRowIdRef = useRef(0);
  const makePerformanceDraftRow = (): PerformanceDraftRow => ({
    id: `pf-${Date.now()}-${pfRowIdRef.current++}`,
    performanceDate: getTodayDateString(),
    performanceTime: '20:00',
    performanceStatus: 'Public',
  });
  const [pfRows, setPfRows] = useState<PerformanceDraftRow[]>([
    makePerformanceDraftRow(),
  ]);
  const [pfErrors, setPfErrors] = useState<
    Record<string, { date?: string; time?: string; duplicate?: string }>
  >({});
  const setTabDirty = (tabName: string, dirty: boolean) => {
    setTabDirtyState((prev) => {
      if ((prev[tabName] ?? false) === dirty) return prev;
      return { ...prev, [tabName]: dirty };
    });
  };
  const performancesDraftDirty = useMemo(
    () =>
      showAddPerformance &&
      pfRows.some(
        (rowDraft) =>
          rowDraft.performanceDate.trim() !== getTodayDateString() ||
          rowDraft.performanceTime.trim() !== '20:00' ||
          (rowDraft.performanceStatus || '').trim() !== 'Public',
      ),
    [pfRows, showAddPerformance],
  );
  const overviewDirty =
    canSaveCapacityFields || canSaveProductionDates || (tabDirtyState.Overview ?? false);
  const currentTabHasUnsavedChanges =
    tab === 'Overview'
      ? overviewDirty
      : tab === 'Performances'
        ? performancesDraftDirty
        : (tabDirtyState[tab] ?? false);

  const handleTabChange = (nextTab: string) => {
    if (nextTab === tab) return;
    if (currentTabHasUnsavedChanges) {
      setPendingTab(nextTab);
      setShowUnsavedTabAlert(true);
      return;
    }
    setTab(nextTab);
  };

  const createPerformanceMut = useMutation({
    mutationFn: async (rows: PerformanceDraftRow[]) => {
      let createdCount = 0;
      for (const rowDraft of rows) {
        try {
          await createEngagementPerformance(engagementId, {
            performanceDate: rowDraft.performanceDate,
            performanceTime: rowDraft.performanceTime,
            performanceStatus: rowDraft.performanceStatus || 'Public',
          });
          createdCount += 1;
        } catch (cause) {
          const err = new Error('Failed to create all show dates.');
          (err as Error & { createdCount?: number; cause?: unknown }).createdCount =
            createdCount;
          (err as Error & { createdCount?: number; cause?: unknown }).cause = cause;
          throw err;
        }
      }
      return createdCount;
    },
    onSuccess: async (createdCount) => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances'] });
      addToast(
        `${createdCount} show date${createdCount === 1 ? '' : 's'} saved.`,
        'success',
      );
      setShowAddPerformance(false);
      setPfRows([makePerformanceDraftRow()]);
      setPfErrors({});
    },
    onError: (e: unknown) => {
      const wrapped = e as { createdCount?: number; cause?: unknown };
      if (wrapped.createdCount && wrapped.createdCount > 0) {
        addToast(
          `${wrapped.createdCount} show date${wrapped.createdCount === 1 ? '' : 's'} saved before the error.`,
          'warning',
        );
      }
      addToast(friendlyApiError(wrapped.cause ?? e), 'error');
    },
  });

  const resetAddPerformanceDraftRows = () => {
    setPfRows([makePerformanceDraftRow()]);
    setPfErrors({});
  };

  const updatePerformanceDraftRow = (
    id: string,
    patch: Partial<Pick<PerformanceDraftRow, 'performanceDate' | 'performanceTime' | 'performanceStatus'>>,
  ) => {
    setPfRows((prev) =>
      prev.map((rowDraft) =>
        rowDraft.id === id ? { ...rowDraft, ...patch } : rowDraft,
      ),
    );
    setPfErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      const rowErr = { ...next[id] };
      if (patch.performanceDate !== undefined) rowErr.date = undefined;
      if (patch.performanceTime !== undefined) rowErr.time = undefined;
      if (
        patch.performanceDate !== undefined ||
        patch.performanceTime !== undefined
      ) {
        rowErr.duplicate = undefined;
      }
      next[id] = rowErr;
      if (!next[id].date && !next[id].time && !next[id].duplicate) {
        delete next[id];
      }
      return next;
    });
  };

  const addPerformanceDraftRow = () => {
    setPfRows((prev) => [...prev, makePerformanceDraftRow()]);
  };

  const removePerformanceDraftRow = (id: string) => {
    setPfRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((rowDraft) => rowDraft.id !== id);
    });
    setPfErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleAddPerformance = () => {
    if (pfRows.length === 0) {
      addToast('Add at least one performance row.', 'warning');
      return;
    }

    const nextErrors: Record<
      string,
      { date?: string; time?: string; duplicate?: string }
    > = {};
    const existingKeys = new Set(
      (performancesQuery.data ?? []).map(
        (p) =>
          `${p.performanceDate}|${normalizePerformanceTimeInput(p.performanceTime)}`,
      ),
    );
    const draftKeys = new Set<string>();

    for (const rowDraft of pfRows) {
      const errs: { date?: string; time?: string; duplicate?: string } = {};
      const date = rowDraft.performanceDate.trim();
      const time = rowDraft.performanceTime.trim();
      if (!date) errs.date = 'Date is required.';
      if (!time) errs.time = 'Show time is required.';

      if (!errs.date && !errs.time) {
        const key = `${date}|${normalizePerformanceTimeInput(time)}`;
        if (existingKeys.has(key) || draftKeys.has(key)) {
          errs.duplicate =
            'Another performance already uses this exact date and time.';
        } else {
          draftKeys.add(key);
        }
      }

      if (errs.date || errs.time || errs.duplicate) {
        nextErrors[rowDraft.id] = errs;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setPfErrors(nextErrors);
      addToast(
        'Please fix the highlighted performance rows before saving.',
        'warning',
      );
      return;
    }

    setPfErrors({});
    createPerformanceMut.mutate(pfRows);
  };

  // ── Loading / Error states ──────────────────────────────────────────────
  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-muted">
        <Loader2 className="h-10 w-10 animate-spin text-ems-accent" aria-hidden />
        <p className="text-sm">Loading engagement…</p>
      </div>
    );
  }

  if (detailQuery.error || !row) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onNavigate('engagements')}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          ← Back to Engagements
        </button>
        <div className="flex items-start gap-3 text-sm text-ems-coral border border-ems-coral/30 rounded-lg px-4 py-3 bg-ems-coral-dim">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Could not load engagement</p>
            <p className="text-xs text-ems-coral/80 mt-0.5">
              {detailQuery.error ? friendlyApiError(detailQuery.error) : 'Engagement not found.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => detailQuery.refetch()}
            className="flex items-center gap-1 text-xs hover:underline shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => onNavigate('engagements')}
        className="text-text-muted hover:text-text-primary text-sm flex items-center gap-1 transition-colors"
      >
        ← Back to Engagements
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-lg font-bold text-text-primary leading-tight">
              {row.attractionName ?? row.tourName}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {row.attractionName && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Tag className="h-3.5 w-3.5 text-text-muted" />
                  {row.tourName}
                </span>
              )}
              {(row.venueCompanyName ?? row.venueName) && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Building2 className="h-3.5 w-3.5 text-text-muted" />
                  {row.venueCompanyName ?? row.venueName}
                </span>
              )}
              {(row.city || row.stateProvince) && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <MapPin className="h-3.5 w-3.5 text-text-muted" />
                  {[row.city, row.stateProvince].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            {row.dmaMarketName && (
              <p className="text-xs text-text-muted">{row.dmaMarketName}</p>
            )}
          </div>

          {/* Action area */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="w-44">
              <Select2
                options={statusSelectOptions}
                value={row.engagementStatus}
                onChange={handleStatusChange}
                placeholder="Status…"
                disabled={anyEngagementPatchPending}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEdit(true)}
              disabled={!lookupsQuery.data || lookupsQuery.isPending}
            >
              {lookupsQuery.isPending ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </span>
              ) : (
                'Edit details'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingDelete(true)}
              disabled={deleteMutation.isPending}
              className="border-ems-coral/40 text-ems-coral hover:bg-ems-coral-dim hover:text-ems-coral disabled:opacity-50"
            >
              Delete Engagement
            </Button>
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border text-sm">
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Attraction</span>
            <span className="text-text-primary">{row.attractionName ?? '—'}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Tour</span>
            <span className="text-text-primary">{row.tourName ?? '—'}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Venue</span>
            <span className="text-text-primary">
              {row.venueCompanyName ?? row.venueName ?? '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Location</span>
            <span className="text-text-secondary">
              {[row.city, row.stateProvince].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Market (DMA)</span>
            <span className="text-text-secondary">{row.dmaMarketName ?? '—'}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">
              Opening show date and time
            </span>
            <span className="text-text-secondary">
              {row.openingPerformanceDate && row.openingPerformanceTime
                ? `${formatOpeningDateSafe(row.openingPerformanceDate)} · ${formatSqlTimeDisplay(row.openingPerformanceTime)}`
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Sellable capacity</span>
            <span className="text-text-secondary">
              {row.sellableCapacity != null ? row.sellableCapacity.toLocaleString() : '—'}
            </span>
          </div>
          <div>
            <span className="text-text-muted text-xs block mb-0.5 font-medium">Gross potential</span>
            <span className="text-text-secondary">
              {row.grossPotential != null
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 2,
                  }).format(row.grossPotential)
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          'Overview',
          'Main Information',
          'Venues',
          'Service Providers',
          'Contacts',
          'Performances',
          'Sale Summary',
          'Marketing',
          'Production',
          'Taxation',
          'Ticketing',
          'Artist terms',
          'Event business',
          'Finance',
        ]}
        active={tab}
        onChange={handleTabChange}
      />

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-5">
          <div
            className="relative rounded-lg border border-border bg-surface/40 p-4"
            aria-busy={capacitySectionSaving}
          >
            {capacitySectionSaving && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
                  <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" />
                  Saving to database…
                </span>
              </div>
            )}
            <h3 className="text-sm font-semibold text-text-primary mb-1">Sales Baseline Fields</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Engagement sellable capacity">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={inputCls}
                  value={sellableCapacityInput}
                  onChange={(e) => {
                    markCapacityFieldsUserEdited();
                    setSellableCapacityInput(e.target.value);
                  }}
                  disabled={anyEngagementPatchPending}
                  placeholder="e.g. 2021"
                />
              </FormField>
              <FormField label="Engagement gross potential">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputCls}
                  value={grossPotentialInput}
                  onChange={(e) => {
                    markCapacityFieldsUserEdited();
                    setGrossPotentialInput(e.target.value);
                  }}
                  disabled={anyEngagementPatchPending}
                  placeholder="e.g. 403565.00"
                />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-ems-accent text-white hover:opacity-90"
                onClick={handleSaveCapacityFields}
                disabled={
                  !canSaveCapacityFields || anyEngagementPatchPending
                }
              >
                {capacitySectionSaving ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save capacity fields'
                )}
              </Button>
            </div>
          </div>
          <div
            className="relative rounded-lg border border-border bg-surface/40 p-4"
            aria-busy={productionSectionSaving}
          >
            {productionSectionSaving && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
                  <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" />
                  Saving to database…
                </span>
              </div>
            )}
            <h3 className="text-sm font-semibold text-text-primary mb-1">Rehearsal and load-in</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Rehearsal date">
                <input
                  type="date"
                  className={inputCls}
                  value={rehearsalDateInput}
                  onChange={(e) => {
                    markProductionDatesUserEdited();
                    setRehearsalDateInput(e.target.value);
                  }}
                  disabled={anyEngagementPatchPending}
                />
              </FormField>
              <FormField label="Load-in date">
                <input
                  type="date"
                  className={inputCls}
                  value={loadInDateInput}
                  onChange={(e) => {
                    markProductionDatesUserEdited();
                    setLoadInDateInput(e.target.value);
                  }}
                  disabled={anyEngagementPatchPending}
                />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-ems-accent text-white hover:opacity-90"
                onClick={() => void handleSaveProductionDates()}
                disabled={
                  !canSaveProductionDates || anyEngagementPatchPending
                }
              >
                {productionSectionSaving ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save production dates'
                )}
              </Button>
            </div>
          </div>

          <EngagementOverviewIaeStaffSection
            engagementId={engagementId}
            enabled={tab === 'Overview'}
            addToast={addToast}
            onDirtyChange={(dirty) => setTabDirty('Overview', dirty)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-text-muted text-xs block mb-1 font-medium">Engagement</span>
              <span className="text-text-primary text-sm">{row.displayTitle || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block mb-1 font-medium">Status</span>
              <span className="text-text-primary">{row.engagementStatus}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block mb-1 font-medium">Tour</span>
              <span className="text-text-primary">{row.tourName || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block mb-1 font-medium">Venue</span>
              <span className="text-text-primary">
                {row.venueCompanyName ?? row.venueName ?? '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Information ─────────────────────────────────────────────── */}
      {tab === 'Main Information' && (
        <EngagementMainInformationPanel
          engagementId={engagementId}
          row={row}
          lookups={lookupsQuery.data}
          lookupsLoading={lookupsQuery.isPending}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Main Information', dirty)}
        />
      )}

      {/* ── Venues ───────────────────────────────────────────────────────── */}
      {tab === 'Venues' && (
        <div className="bg-card border border-border rounded-lg p-5">
          <VenuesTab
            engagementId={engagementId}
            addToast={addToast}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* ── Service Providers ────────────────────────────────────────────── */}
      {tab === 'Service Providers' && (
        <div className="bg-card border border-border rounded-lg p-5">
          <ServiceProvidersTab
            engagementId={engagementId}
            addToast={addToast}
            onDirtyChange={(dirty) => setTabDirty('Service Providers', dirty)}
          />
        </div>
      )}

      {/* ── Contacts ─────────────────────────────────────────────────────── */}
      {tab === 'Contacts' && (
        <div className="space-y-6">
          {venueCompanyTypeNames.map((companyTypeName) => (
            <div key={`venue-${companyTypeName}`} className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">{companyTypeName} contacts</h3>
              <p className="text-xs text-text-muted mb-3">
                Contacts for the venue company linked to this engagement.
              </p>
              {!venueId ? (
                <p className="text-sm text-text-muted">No venue is linked.</p>
              ) : venueContactsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading contacts…
                </div>
              ) : venueContactsQuery.error ? (
                <p className="text-sm text-ems-coral">{friendlyApiError(venueContactsQuery.error)}</p>
              ) : (
                <ContactsTable contacts={venueContactsQuery.data ?? []} />
              )}
            </div>
          ))}

          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Talent Agency contacts</h3>
            <p className="text-xs text-text-muted mb-3">
              Only talent agents selected on the linked tour are shown here.
            </p>
            {row.tourId == null ? (
              <p className="text-sm text-text-muted">No tour linked.</p>
            ) : lookupsQuery.isPending ? (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tour details…
              </div>
            ) : tourMgmtCompanyId === null ? (
              <p className="text-sm text-text-muted">
                No Tour Management Company assigned to this tour.
              </p>
            ) : tourContactsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading contacts…
              </div>
            ) : tourContactsQuery.error ? (
              <p className="text-sm text-ems-coral">{friendlyApiError(tourContactsQuery.error)}</p>
            ) : tourSelectedTalentAgentContacts.length === 0 ? (
              <p className="text-sm text-text-muted">No talent agents are selected for this tour.</p>
            ) : (
              <ContactsTable contacts={tourSelectedTalentAgentContacts} />
            )}
          </div>

          {serviceProviderContactGroups.map((group) => (
            <RelatedCompanyContactsBox
              key={`${group.title}-${group.companyIds.join('-')}`}
              title={group.title}
              description="Contacts for service provider companies linked to this engagement."
              companyIds={group.companyIds}
            />
          ))}
        </div>
      )}

      {/* ── Performances ─────────────────────────────────────────────────── */}
      {tab === 'Performances' && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Show dates & performances</h3>
              <p className="text-xs text-text-muted mt-1">Each row is one show date and time.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAddPerformanceDraftRows();
                setShowAddPerformance(true);
              }}
              className="inline-flex items-center justify-center shrink-0 bg-ems-accent text-background text-sm px-4 py-2 rounded-md font-medium hover:bg-ems-accent/90 transition-colors"
            >
              + Add date
            </button>
          </div>

          {performancesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-sm py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading performances…
            </div>
          ) : performancesQuery.error ? (
            <div className="flex items-center gap-2 text-ems-coral text-sm py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {friendlyApiError(performancesQuery.error)}
              <button
                type="button"
                onClick={() => performancesQuery.refetch()}
                className="text-xs underline ml-1"
              >
                Retry
              </button>
            </div>
          ) : (performancesQuery.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarDays className="h-8 w-8 text-text-muted/50" />
              <p className="text-sm text-text-muted">
                No performances yet. Add a show date to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(performancesQuery.data ?? []).map((p, idx) => (
                <EditablePerformanceRow
                  key={p.performanceId}
                  perf={p}
                  isPrimary={idx === 0}
                  engagementId={engagementId}
                  allowDeleteShow={canDeleteIndividualShow}
                  onRefresh={() =>
                    qc.invalidateQueries({
                      queryKey: ['engagements', engagementId, 'performances'],
                    })
                  }
                  addToast={addToast}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Sale Summary ────────────────────────────────────────────────── */}
      {tab === 'Sale Summary' && (
        <EngagementSalesDashboardPanel
          engagementId={engagementId}
          onBack={() => setTab('Overview')}
          showBackButton={false}
        />
      )}

      {/* ── Marketing (dbo.PerformanceTicketing) ─────────────────────────── */}
      {tab === 'Marketing' && (
        <EngagementMarketingPanel
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Marketing', dirty)}
        />
      )}

      {/* ── Production (venue-backed) ────────────────────────────────────── */}
      {tab === 'Production' && (
        <EngagementProductionPanel
          engagementId={engagementId}
          venueCompanyId={row.primaryVenueCompanyId}
          venueLabel={row.venueCompanyName ?? row.venueName}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Production', dirty)}
        />
      )}

      {/* ── Taxation (EngagementFinances + withholding links) ───────────── */}
      {tab === 'Taxation' && (
        <EngagementTaxationPanel
          engagementId={engagementId}
          venueCompanyId={row.primaryVenueCompanyId}
          venueLabel={row.venueCompanyName ?? row.venueName}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Taxation', dirty)}
        />
      )}

      {/* ── Ticketing (Engagement + PerformanceTicketing) ───────────────── */}
      {tab === 'Ticketing' && (
        <EngagementTicketingPanel
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Ticketing', dirty)}
        />
      )}

      {/* ── Artist terms (dbo.ArtistFinance + links on EngagementFinances) ─ */}
      {tab === 'Artist terms' && (
        <EngagementArtistTermsPanel
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Artist terms', dirty)}
        />
      )}

      {tab === 'Event business' && (
        <EngagementEventBusinessPanel
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Event business', dirty)}
        />
      )}

      {/* ── Finance & logistics ─────────────────────────────────────────── */}
      {tab === 'Finance' && (
        <EngagementFinancePanel
          key={engagementId}
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={(dirty) => setTabDirty('Finance', dirty)}
        />
      )}

      <AlertDialog
        open={showUnsavedTabAlert}
        onOpenChange={(open) => {
          if (!open) {
            setShowUnsavedTabAlert(false);
            setPendingTab(null);
          }
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Discard unsaved changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You have unsaved changes in this tab. If you switch tabs now, those changes will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
              onClick={() => {
                setShowUnsavedTabAlert(false);
                setPendingTab(null);
              }}
            >
              Stay on this tab
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => {
                if (tab === 'Overview' && row) {
                  setSellableCapacityInput(
                    row.sellableCapacity == null ? '' : String(row.sellableCapacity),
                  );
                  setGrossPotentialInput(
                    row.grossPotential == null ? '' : String(row.grossPotential),
                  );
                  setRehearsalDateInput(row.rehearsalDate ?? '');
                  setLoadInDateInput(row.loadInDate ?? '');
                  clearCapacityFieldsUserEdited();
                  clearProductionDatesUserEdited();
                }
                if (tab === 'Performances') {
                  setShowAddPerformance(false);
                  resetAddPerformanceDraftRows();
                }
                setTabDirty(tab, false);
                if (pendingTab) {
                  setTab(pendingTab);
                }
                setShowUnsavedTabAlert(false);
                setPendingTab(null);
              }}
            >
              Discard and switch
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add performance modal ─────────────────────────────────────────── */}
      {showAddPerformance && (
        <Modal
          title="Add show dates"
          onClose={() => {
            if (createPerformanceMut.isPending) return;
            setShowAddPerformance(false);
            resetAddPerformanceDraftRows();
          }}
          width={900}
          allowContentOverflow
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              Add one or more performances. Each row must have a unique date and time.
            </p>

            <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
              {pfRows.map((rowDraft, idx) => {
                const rowErr = pfErrors[rowDraft.id] ?? {};
                return (
                  <div
                    key={rowDraft.id}
                    className="rounded-lg border border-border bg-surface/60 p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Performance {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePerformanceDraftRow(rowDraft.id)}
                        disabled={createPerformanceMut.isPending || pfRows.length <= 1}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-text-secondary hover:text-ems-coral hover:border-ems-coral/40 hover:bg-ems-coral-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={
                          pfRows.length <= 1
                            ? 'At least one performance row is required.'
                            : 'Remove this row'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField label="Show date" required>
                        <input
                          type="date"
                          className={inputCls}
                          value={rowDraft.performanceDate}
                          onChange={(e) =>
                            updatePerformanceDraftRow(rowDraft.id, {
                              performanceDate: e.target.value,
                            })
                          }
                          disabled={createPerformanceMut.isPending}
                        />
                        {rowErr.date && (
                          <p className="mt-1 text-xs text-ems-coral">{rowErr.date}</p>
                        )}
                      </FormField>

                      <FormField label="Show / curtain time" required>
                        <input
                          type="time"
                          className={inputCls}
                          value={rowDraft.performanceTime}
                          onChange={(e) =>
                            updatePerformanceDraftRow(rowDraft.id, {
                              performanceTime: e.target.value,
                            })
                          }
                          disabled={createPerformanceMut.isPending}
                        />
                        {rowErr.time && (
                          <p className="mt-1 text-xs text-ems-coral">{rowErr.time}</p>
                        )}
                      </FormField>

                      <FormField label="Status">
                        <Select2
                          options={PERFORMANCE_STATUS_OPTIONS}
                          value={rowDraft.performanceStatus}
                          onChange={(value) =>
                            updatePerformanceDraftRow(rowDraft.id, {
                              performanceStatus: value,
                            })
                          }
                          placeholder="Select status…"
                          disabled={createPerformanceMut.isPending}
                        />
                      </FormField>
                    </div>

                    {rowErr.duplicate && (
                      <p className="mt-2 text-xs text-ems-coral">{rowErr.duplicate}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={addPerformanceDraftRow}
                disabled={createPerformanceMut.isPending}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border text-text-primary bg-elevated hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add another row
              </button>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAddPerformance(false);
                  resetAddPerformanceDraftRows();
                }}
                disabled={createPerformanceMut.isPending}
                className="text-text-secondary text-sm px-4 py-2 rounded-md hover:text-text-primary hover:bg-hover disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createPerformanceMut.isPending}
                onClick={handleAddPerformance}
                className="inline-flex items-center justify-center gap-2 min-w-[8rem] bg-ems-accent text-background text-sm px-5 py-2 rounded-md font-medium disabled:opacity-60 hover:bg-ems-accent/90 transition-colors"
              >
                {createPerformanceMut.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save performances'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {showEdit && lookupsQuery.data && (
        <EditEngagementModal
          row={row}
          attractions={lookupsQuery.data.attractions}
          tours={lookupsQuery.data.tours}
          companies={lookupsQuery.data.companies}
          onClose={() => setShowEdit(false)}
          onSave={async (payload) => {
            await updateEngagement(engagementId, payload);
            await qc.invalidateQueries({ queryKey: ['engagements'] });
            await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
            if ('sellableCapacity' in payload || 'grossPotential' in payload) {
              await invalidateSalesCapacityRelatedQueries(qc);
              await qc.invalidateQueries({
                queryKey: ['engagements', engagementId, 'finance'],
              });
            }
            addToast('Engagement updated.', 'success');
            setShowEdit(false);
          }}
          addToast={addToast}
        />
      )}

      {/* ── Delete confirm (same pattern as Companies) ─────────────────── */}
      <AlertDialog
        open={pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(false);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this engagement?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You’re about to remove{' '}
              <span className="font-medium text-text-primary">
                {row.displayTitle}
              </span>
              . This cannot be undone. If removal isn’t allowed, you’ll see an error message after you
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.isPending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-ems-accent"
                aria-hidden
              />
              <span>Removing engagement…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => void deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove engagement'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contacts table (shared)
// ---------------------------------------------------------------------------
function RelatedCompanyContactsBox({
  title,
  description,
  companyIds,
}: {
  title: string;
  description: string;
  companyIds: number[];
}) {
  const uniqueCompanyIds = useMemo(
    () => Array.from(new Set(companyIds.filter((id) => Number.isInteger(id) && id > 0))).sort((a, b) => a - b),
    [companyIds],
  );
  const contactsQuery = useQuery({
    queryKey: ['engagement-related-company-contacts', title, uniqueCompanyIds],
    queryFn: async () => {
      const lists = await Promise.all(uniqueCompanyIds.map((id) => fetchCompanyContacts(id)));
      const seen = new Set<string>();
      const out: ApiCompanyContact[] = [];
      for (const contact of lists.flat()) {
        const key = `${contact.contactAssignmentId}:${contact.contactId}:${contact.roleId}:${contact.departmentId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(contact);
      }
      return out.sort((a, b) => {
        const an = `${a.firstName} ${a.lastName}`.trim();
        const bn = `${b.firstName} ${b.lastName}`.trim();
        return an.localeCompare(bn, undefined, { sensitivity: 'base' });
      });
    },
    enabled: uniqueCompanyIds.length > 0,
    staleTime: 60_000,
  });

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted mb-3">{description}</p>
      {uniqueCompanyIds.length === 0 ? (
        <p className="text-sm text-text-muted">No related companies are linked.</p>
      ) : contactsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading contacts…
        </div>
      ) : contactsQuery.error ? (
        <p className="text-sm text-ems-coral">{friendlyApiError(contactsQuery.error)}</p>
      ) : (
        <ContactsTable contacts={contactsQuery.data ?? []} />
      )}
    </div>
  );
}

function ContactsTable({
  contacts,
}: {
  contacts: {
    contactAssignmentId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleName: string;
    departmentName: string;
  }[];
}) {
  if (contacts.length === 0) {
    return (
      <p className="text-sm text-text-muted py-2">No contacts found.</p>
    );
  }
  return (
    <div className="bg-elevated border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border bg-surface">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Roles</th>
              <th className="text-left py-2 px-3">Departments</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Phone</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.contactAssignmentId} className="border-b border-border/50 hover:bg-hover">
                <td className="py-2 px-3 text-text-primary font-medium">
                  {c.firstName} {c.lastName}
                </td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {c.roleName || '—'}
                </td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {c.departmentName || '—'}
                </td>
                <td className="py-2 px-3 text-ems-blue text-xs">{c.email}</td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {formatE164ForDisplay(c.cellPhone || c.workPhone) || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit engagement modal
// ---------------------------------------------------------------------------
function EditEngagementModal({
  row,
  attractions,
  tours,
  companies,
  onClose,
  onSave,
  addToast,
}: {
  row: ApiEngagementListRow;
  attractions: { attractionId: number; attractionName: string }[];
  tours: { tourId: number; tourName: string; attractionId: number }[];
  companies: {
    companyId: number;
    companyName: string;
    companyTypeName: string;
    companyTypeNames?: string[];
  }[];
  onClose: () => void;
  onSave: (p: import('@/api/engagementApi').UpdateEngagementPayload) => Promise<void>;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const venueCompanies = useMemo(
    () =>
      companies
        .filter(
          (c) =>
            c.companyTypeName === 'Venue' ||
            (c.companyTypeNames ?? []).includes('Venue'),
        )
        .sort((a, b) =>
          a.companyName.localeCompare(b.companyName, undefined, { sensitivity: 'base' }),
        ),
    [companies],
  );

  const sortedAttractions = useMemo(
    () =>
      [...attractions].sort((a, b) =>
        a.attractionName.localeCompare(b.attractionName, undefined, { sensitivity: 'base' }),
      ),
    [attractions],
  );

  const attractionOptions = useMemo(
    () =>
      sortedAttractions.map((a) => ({ value: String(a.attractionId), label: a.attractionName })),
    [sortedAttractions],
  );

  const venueOptions = useMemo(
    () => companyToSelect2Options(venueCompanies),
    [venueCompanies],
  );

  const statusOptions = useMemo(
    () => ENGAGEMENT_STATUS_ENUM.map((s) => ({ value: s, label: s })),
    [],
  );

  const [attractionId, setAttractionId] = useState(
    row.attractionId != null ? String(row.attractionId) : '',
  );
  const [tourId, setTourId] = useState<string>(row.tourId != null ? String(row.tourId) : '');
  const [primaryVenueId, setPrimaryVenueId] = useState<string>(
    row.primaryVenueCompanyId != null ? String(row.primaryVenueCompanyId) : '',
  );
  const [recordStatus, setRecordStatus] = useState(row.engagementStatus);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const attractionIdNum = Number(attractionId);

  const toursForAttraction = useMemo(
    () =>
      attractionId && Number.isFinite(attractionIdNum)
        ? tours
            .filter((t) => t.attractionId === attractionIdNum)
            .sort((a, b) =>
              a.tourName.localeCompare(b.tourName, undefined, { sensitivity: 'base' }),
            )
        : [],
    [tours, attractionId, attractionIdNum],
  );

  const tourOptions = useMemo(
    () => toursForAttraction.map((t) => ({ value: String(t.tourId), label: t.tourName })),
    [toursForAttraction],
  );

  const skipTourResetOnMount = useRef(true);
  useEffect(() => {
    if (skipTourResetOnMount.current) {
      skipTourResetOnMount.current = false;
      return;
    }
    setTourId('');
  }, [attractionId]);

  const clearError = (field: string) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!recordStatus) next.status = 'Status is required.';
    if (!tourId) next.tour = 'Tour is required.';
    if (!primaryVenueId) next.venue = 'Venue is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      addToast('Please fill in all required fields.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        engagementStatus: recordStatus,
        tourId: Number(tourId),
        primaryVenueCompanyId: Number(primaryVenueId),
      });
    } catch (e) {
      addToast(friendlyApiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit engagement" onClose={onClose} width={720} allowContentOverflow>
      <div className="flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
          <div className="sm:col-span-2">
            <FormField label="Status" required>
              <Select2
                options={statusOptions}
                value={recordStatus}
                onChange={(v) => { setRecordStatus(v); clearError('status'); }}
                placeholder="Select status…"
              />
              {errors.status && (
                <p className="mt-1 text-xs text-ems-coral">{errors.status}</p>
              )}
            </FormField>
          </div>

          <FormField label="Filter by Attraction">
            <Select2
              options={[{ value: '', label: 'All attractions' }, ...attractionOptions]}
              value={attractionId}
              onChange={(v) => { setAttractionId(v); clearError('tour'); }}
              placeholder="All attractions"
              allowClear
            />
          </FormField>

          <FormField label="Tour" required>
            <Select2
              options={
                tourOptions.length
                  ? tourOptions
                  : [
                      {
                        value: '',
                        label: attractionId
                          ? 'No tours for this attraction'
                          : 'Select attraction first…',
                      },
                    ]
              }
              value={tourId}
              onChange={(v) => { setTourId(v); clearError('tour'); }}
              placeholder="Select tour…"
            />
            {errors.tour && (
              <p className="mt-1 text-xs text-ems-coral">{errors.tour}</p>
            )}
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Venue" required>
              <Select2
                options={venueOptions}
                value={primaryVenueId}
                onChange={(v) => { setPrimaryVenueId(v); clearError('venue'); }}
                placeholder="Select venue…"
              />
              {errors.venue && (
                <p className="mt-1 text-xs text-ems-coral">{errors.venue}</p>
              )}
            </FormField>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-6 mt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary text-sm px-4 py-2 rounded-md hover:text-text-primary hover:bg-hover disabled:opacity-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 min-w-[8rem] bg-ems-accent text-background text-sm px-5 py-2 rounded-md font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-ems-accent/90 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
