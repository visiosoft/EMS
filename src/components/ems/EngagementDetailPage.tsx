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
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Modal, FormField, TabBar } from './Primitives';
import { EngagementSalesDashboardPanel } from './EngagementSalesDashboardPanel';
import { Select2, type Select2Option } from './Select2';
import { SeatingChartDiagram } from './SeatingChartDiagram';
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
  fetchEngagementVenueTabData,
  updateEngagementVenueTab,
  upsertEngagementLink,
  removeEngagementLink,
  fetchEngagementServiceProviders,
  removeEngagementVenue,
  addEngagementServiceProvider,
  removeEngagementServiceProvider,
  updateEngagement,
  updateEngagementFinance,
  updateNonResidentWithholding,
  updateEngagementPerformance,
  deleteEngagementPerformance,
  fetchEngagementPerformanceTicketing,
  updateEngagementPerformanceTicketing,
  fetchPerformancesWithTicketingSummary,
  fetchEngagementIaeContactLookups,
  fetchEngagementIaeContacts,
  addEngagementIaeContact,
  updateEngagementIaeContact,
  deleteEngagementIaeContact,
  updateNonResidentWithholdingLinks,
  fetchRetailPartners,
  addRetailPartner,
  deleteRetailPartner,
  fetchMarketingMeta,
  updateIaeMarketingTeam,
  fetchEngagementTravel,
  addEngagementTravelHotel,
  updateEngagementTravelHotel,
  addEngagementTravelCarService,
  updateEngagementTravelCarService,
  deleteEngagementTravel,
  TRAVEL_BOOKED_BY_OPTIONS,
  fetchEngagementPartner,
  updateEngagementPartner,
  fetchDepositTerms,
  updateDepositTerms,
  type ApiRetailPartnerRow,
  type ApiMarketingMeta,
  type CreateRetailPartnerPayload,
  type ApiEngagementTravelRow,
  type ApiTravelHotelRow,
  type ApiTravelCarServiceRow,
  type CreateTravelHotelPayload,
  type CreateTravelCarServicePayload,
  type ApiEngagementListRow,
  type ApiEngagementVenueRow,
  type ApiEngagementVenueTabData,
  type ApiEngagementLinkRow,
  type ApiVenueRoleContacts,
  type UpdateEngagementVenueTabPayload,
  type ApiEngagementServiceProviderRow,
  type ApiEngagementServiceProvidersResponse,
  type UpdateEngagementFinancePayload,
  type UpdateNonResidentWithholdingLinksPayload,
  type ApiEngagementFinanceLookups,
  type UpdatePerformanceTicketingPayload,
  type ApiEngagementIaeContactRow,
  type ApiPerformanceTicketingSummaryRow,
  type CreateEngagementIaeContactPayload,
  type UpdateEngagementIaeContactPayload,
  type UpdateEngagementPayload,
} from '@/api/engagementApi';
import {
  fetchAttractions,
  fetchTours,
  fetchVenueTypesLookup,
  updateTour,
  type ApiAttractionListRow,
  type ApiTourListRow,
  type ApiVenueType,
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
import { EngagementMarketingReadOnlySection } from './EngagementMarketingReadOnlySection';
import { invalidateSalesCapacityRelatedQueries } from '@/api/cacheHelpers';
// fetchIaeStaffEmployees removed — IAE Marketing Team now uses EngagementIAEContact
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
const VENUE_DEAL_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Rental', label: 'Rental' },
  { value: 'CoPro', label: 'CoPro' },
  { value: '3rd Party Renting Venue', label: '3rd Party Renting Venue' },
  { value: 'Silent CoPro with Venue', label: 'Silent CoPro with Venue' },
];
const TICKETING_ADMIN_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Venue', label: 'Venue' },
  { value: 'Partner', label: 'Partner' },
  { value: 'IAE Contract', label: 'IAE Contract' },
];
const YES_NO_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];
const FACE_VALUE_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Inside Face Value', label: 'Inside Face Value' },
  { value: 'Outside Face Value', label: 'Outside Face Value' },
];
const DYNAMIC_PRICING_MODE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Self Managed', label: 'Self Managed' },
  { value: '3rd Party Managed', label: '3rd Party Managed' },
];
const FEE_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Inside Service Charge', label: 'Inside Service Charge' },
  { value: 'Budget Line Item', label: 'Budget Line Item' },
];
const SALES_TAX_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Charged in Shopping Cart', label: 'Charged in Shopping Cart' },
  { value: 'Budget Line Item', label: 'Budget Line Item' },
];
const VIP_PACKAGE_BENEFITS = [
  'Meet & Greet without Photo',
  'Meet & Greet with Photo',
  'Merchandise Provided',
  'Poster',
  'Souvenir Laminate',
] as const;
const PRESALE_DISCOUNT_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: '$', label: '$ (Dollar amount)' },
  { value: '%', label: '% (Percentage)' },
];

const PASSWORD_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Select type…' },
  { value: 'PreSale', label: 'PreSale' },
  { value: 'PreSaleSpecialPrice', label: 'PreSaleSpecialPrice' },
  { value: 'PublicSaleSpecialPrice', label: 'PublicSaleSpecialPrice' },
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

/** Read-only info row used throughout the expanded Venues tab. */
function VenueInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-muted font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-text-primary">{value ?? <span className="text-text-muted italic">—</span>}</span>
    </div>
  );
}

/** Clickable SharePoint link row. */
function SharePointLinkRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-muted font-medium uppercase tracking-wide">{label}</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-ems-accent hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Open link
        </a>
      ) : (
        <span className="text-sm text-text-muted italic">—</span>
      )}
    </div>
  );
}

/** Inline editable text field for per-venue Venues tab fields. */
function VenueTabEditField({
  label,
  value,
  onChange,
  disabled,
  multiline,
  urlField,
  inputBgClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  /** When true, the input is treated as an http(s) link and validated. */
  urlField?: boolean;
  inputBgClass?: string;
}) {
  const invalid = !multiline && urlField === true && !isValidHttpOrHttpsUrl(value);
  const bg = inputBgClass ?? 'bg-background';
  const cls =
    `w-full rounded border border-border ${bg} px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50 disabled:opacity-60`;
  const invalidCls = invalid ? ' border-red-500 focus:ring-red-500/50' : '';
  return (
    <FormField label={label}>
      {multiline ? (
        <textarea
          className={`${cls} min-h-[64px] resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <>
          <input
            type={urlField ? 'url' : 'text'}
            inputMode={urlField ? 'url' : undefined}
            placeholder={urlField ? 'https://…' : undefined}
            className={`${cls}${invalidCls}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-invalid={invalid}
          />
          {invalid && (
            <p className="mt-1 text-[11px] text-red-500">Enter a valid http:// or https:// link.</p>
          )}
        </>
      )}
    </FormField>
  );
}

const DEAL_TYPE_OPTIONS: Select2Option[] = [
  { value: 'Rental', label: 'Rental' },
  { value: 'CoPro', label: 'CoPro' },
  { value: '3rd Party Renting Venue', label: '3rd Party Renting Venue' },
  { value: 'Silent CoPro with Venue', label: 'Silent CoPro with Venue' },
];

function VenueDetailPanel({
  engagementId,
  venue,
  venueDealType,
  venueDealTypeId: initialVenueDealTypeId,
  venueTerms,
  techRiderLinkUrl,
  engagementLinks,
  venueRoleContacts,
  addToast,
  onNavigate,
}: {
  engagementId: number;
  venue: ApiEngagementVenueRow;
  venueDealType: string | null;
  venueDealTypeId: number | null;
  venueTerms: string | null;
  techRiderLinkUrl: string | null;
  engagementLinks: ApiEngagementLinkRow[];
  venueRoleContacts: ApiVenueRoleContacts | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate: (view: string, data?: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();

  // Editable state
  const [venueBookingManagerId, setVenueBookingManagerId] = useState(
    venue.venueBookingManagerContactId != null ? String(venue.venueBookingManagerContactId) : '',
  );
  const [venueDealTypeId, setVenueDealTypeId] = useState(
    initialVenueDealTypeId != null ? String(initialVenueDealTypeId) : '',
  );
  const [venueTypeId, setVenueTypeId] = useState(venue.venueTypeId != null ? String(venue.venueTypeId) : '');
  const [stageDimensions, setStageDimensions] = useState(venue.stageDimensions ?? '');
  const [flySystemSpecs, setFlySystemSpecs] = useState(venue.flySystemSpecs ?? '');
  const [stageType, setStageType] = useState(venue.stageType ?? '');
  const [techRiderUrl, setTechRiderUrl] = useState(techRiderLinkUrl ?? '');

  // Contract link state (EngagementLink-based)
  const getEngagementLinkUrl = (purpose: string) =>
    engagementLinks.find((el) => el.linkPurpose === purpose)?.linkUrl ?? '';
  const [venueContractLink, setVenueContractLink] = useState(getEngagementLinkUrl('received'));
  const [partialContractLink, setPartialContractLink] = useState(getEngagementLinkUrl('partially executed'));
  const [fullContractLink, setFullContractLink] = useState(getEngagementLinkUrl('fully executed'));
  const [forecastLink, setForecastLink] = useState(getEngagementLinkUrl('VenueForcast'));

  // ── Lookups ──────────────────────────────────────────────────────────────
  const venueTypesQuery = useQuery({
    queryKey: ['lookups', 'venue-types'],
    queryFn: fetchVenueTypesLookup,
    staleTime: 300_000,
  });
  const venueTypeOptions = useMemo<Select2Option[]>(
    () => [
      { value: '', label: 'Not set' },
      ...(venueTypesQuery.data ?? []).map((vt: ApiVenueType) => ({
        value: String(vt.venueTypeId),
        label: vt.venueTypeName,
      })),
    ],
    [venueTypesQuery.data],
  );

  // Venue Deal Type options from VenueDealType table
  const financeLookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
  });
  const dealTypeOptions = useMemo<Select2Option[]>(() => [
    { value: '', label: 'Not set' },
    ...(financeLookupsQuery.data?.venueDealTypes ?? []).map((r) => ({ value: String(r.id), label: r.label })),
  ], [financeLookupsQuery.data?.venueDealTypes]);

  // Booking manager contacts: from venue "Booking & Programming" section (managers only, no directors)
  const venueDetailsForBookingQuery = useQuery({
    queryKey: ['companies', venue.venueCompanyId, 'venue-details'],
    queryFn: () => fetchVenueDetails(venue.venueCompanyId),
    staleTime: 60_000,
    retry: 1,
  });
  const bookingManagerOptions = useMemo<Select2Option[]>(() => {
    const d = venueDetailsForBookingQuery.data;
    if (!d || d.missing) return [{ value: '', label: 'Not set' }];
    const managers = [
      ...(d.rentalManagers ?? []),
      ...(d.calendarManagers ?? []),
      ...(d.contractManagers ?? []),
    ];
    const seen = new Set<number>();
    const opts: Select2Option[] = [{ value: '', label: 'Not set' }];
    for (const c of managers) {
      if (seen.has(c.contactId)) continue;
      seen.add(c.contactId);
      opts.push({ value: String(c.contactId), label: c.fullName || String(c.contactId) });
    }
    return opts;
  }, [venueDetailsForBookingQuery.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });

  const makeVenueMutation = () =>
    useMutation({
      mutationFn: (body: UpdateEngagementVenueTabPayload) =>
        updateEngagementVenueTab(engagementId, venue.venueCompanyId, body),
      onSuccess: async () => {
        await invalidate();
        addToast('Venue details saved.', 'success');
      },
      onError: (e) => addToast(friendlyApiError(e, 'Could not save venue details.'), 'error'),
    });

  const saveBookingManagerMutation = makeVenueMutation();
  const saveVenueTermsMutation = makeVenueMutation();
  const saveTechPackMutation = makeVenueMutation();

  const saveContractsMutation = useMutation({
    mutationFn: async () => {
      const linkFields: [string, string][] = [
        ['received', venueContractLink],
        ['partially executed', partialContractLink],
        ['fully executed', fullContractLink],
        ['VenueForcast', forecastLink],
      ];
      for (const [purpose, url] of linkFields) {
        if (url.trim() && !isValidHttpOrHttpsUrl(url)) {
          throw new Error(`${purpose} must be a valid http(s) URL, or left empty.`);
        }
      }
      for (const [purpose, url] of linkFields) {
        if (url.trim()) {
          await upsertEngagementLink(engagementId, { linkUrl: url.trim(), linkPurpose: purpose });
        } else {
          // Remove link if URL is cleared
          const existing = engagementLinks.find((el) => el.linkPurpose === purpose);
          if (existing) {
            await removeEngagementLink(engagementId, existing.engagementLinkId);
          }
        }
      }
    },
    onSuccess: async () => {
      await invalidate();
      addToast('Contract & forecast links saved.', 'success');
    },
    onError: (e) => addToast(e instanceof Error ? e.message : 'Could not save links.', 'error'),
  });

  const handleSaveBookingManager = () =>
    saveBookingManagerMutation.mutate({
      venueBookingManagerContactId: venueBookingManagerId ? Number(venueBookingManagerId) : null,
    });

  const handleSaveVenueTerms = () => {
    saveVenueTermsMutation.mutate({
      venueDealTypeId: venueDealTypeId ? Number(venueDealTypeId) : null,
      venueTypeId: venueTypeId ? Number(venueTypeId) : null,
    });
  };

  const handleSaveTechPack = () => {
    saveTechPackMutation.mutate({
      stageDimensions: stageDimensions.trim() || null,
      flySystemSpecs: flySystemSpecs.trim() || null,
      stageType: stageType.trim() || null,
      techRiderLinkUrl: techRiderUrl.trim() || null,
    });
  };

  const inputCls =
    'w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50 disabled:opacity-60';
  const sectionCls = 'rounded-md border border-border bg-surface/40 p-4 space-y-4';
  const labelCls = 'text-xs font-semibold text-text-primary mb-3 block';
  const readOnlyValueCls = 'text-sm text-text-primary';

  return (
    <div className="space-y-4 mt-3">
      {/* Venue Booking */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Booking</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Booking Manager">
            <Select2
              options={bookingManagerOptions}
              value={venueBookingManagerId}
              onChange={setVenueBookingManagerId}
              placeholder="Select manager…"
              allowClear
              disabled={saveBookingManagerMutation.isPending}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSaveBookingManager} disabled={saveBookingManagerMutation.isPending}>
            {saveBookingManagerMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save booking manager'}
          </Button>
        </div>
      </div>

      {/* Venue Terms (Deal Type + Venue Type) */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Terms</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Deal Type">
            <Select2
              options={dealTypeOptions}
              value={venueDealTypeId}
              onChange={setVenueDealTypeId}
              placeholder="Not set"
              allowClear
              disabled={saveVenueTermsMutation.isPending}
            />
          </FormField>
          <FormField label="Venue Type">
            <Select2
              options={venueTypeOptions}
              value={venueTypeId}
              onChange={setVenueTypeId}
              placeholder="Select type…"
              allowClear
              disabled={saveVenueTermsMutation.isPending}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSaveVenueTerms} disabled={saveVenueTermsMutation.isPending}>
            {saveVenueTermsMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save venue terms'}
          </Button>
        </div>
      </div>

      {/* Venue Tech Pack */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Tech Pack</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Tech Pack PDF">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={inputCls}
                value={techRiderUrl}
                onChange={(e) => setTechRiderUrl(e.target.value)}
                placeholder="Paste tech pack PDF URL…"
                disabled={saveTechPackMutation.isPending}
              />

            </div>
          </FormField>
          <VenueTabEditField
            label="Venue Stage Dimensions"
            value={stageDimensions}
            onChange={setStageDimensions}
            disabled={saveTechPackMutation.isPending}
            inputBgClass="bg-white"
          />
          <VenueTabEditField
            label="Venue Fly System Specs"
            value={flySystemSpecs}
            onChange={setFlySystemSpecs}
            disabled={saveTechPackMutation.isPending}
            inputBgClass="bg-white"
          />
          <VenueTabEditField
            label="Stage Type"
            value={stageType}
            onChange={setStageType}
            disabled={saveTechPackMutation.isPending}
            inputBgClass="bg-white"
          />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={handleSaveTechPack} disabled={saveTechPackMutation.isPending}>
            {saveTechPackMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save tech pack'}
          </Button>
        </div>
      </div>

      {/* Venue Ticketing (read-only) */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Ticketing</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Ticketing Software">
            <div className={readOnlyValueCls}>
              {(venueRoleContacts?.venueTicketingSoftware ?? []).length > 0
                ? venueRoleContacts!.venueTicketingSoftware.map((c) => (
                    <div key={c.contactId}>{`${c.firstName} ${c.lastName}`.trim()}</div>
                  ))
                : <span className="text-text-muted">— none assigned —</span>}
            </div>
          </FormField>
          <FormField label="Venue Ticketing Administrator">
            <div className={readOnlyValueCls}>
              {(venueRoleContacts?.venueTicketingAdministrator ?? []).length > 0
                ? venueRoleContacts!.venueTicketingAdministrator.map((c) => (
                    <div key={c.contactId}>{`${c.firstName} ${c.lastName}`.trim()}</div>
                  ))
                : <span className="text-text-muted">— none assigned —</span>}
            </div>
          </FormField>
        </div>
      </div>

      {/* Venue Production (read-only) */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Production</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Production Manager">
            <div className={readOnlyValueCls}>
              {(venueRoleContacts?.venueProductionManager ?? []).length > 0
                ? venueRoleContacts!.venueProductionManager.map((c) => (
                    <div key={c.contactId}>{`${c.firstName} ${c.lastName}`.trim()}</div>
                  ))
                : <span className="text-text-muted">— none assigned —</span>}
            </div>
          </FormField>
          <FormField label="Venue Stage Labor">
            <div className={readOnlyValueCls}>
              {(venueRoleContacts?.venueStageLaborCompany ?? []).length > 0
                ? venueRoleContacts!.venueStageLaborCompany.map((c) => (
                    <div key={c.contactId}>{`${c.firstName} ${c.lastName}`.trim()}</div>
                  ))
                : <span className="text-text-muted">— none assigned —</span>}
            </div>
          </FormField>
        </div>
      </div>

      {/* Attraction Tech Director (read-only) */}
      <div className={sectionCls}>
        <span className={labelCls}>Attraction Tech Director</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Attraction Tech Director">
            <div className={readOnlyValueCls}>
              {(venueRoleContacts?.attractionTechDirector ?? []).length > 0
                ? venueRoleContacts!.attractionTechDirector.map((c) => (
                    <div key={c.contactId}>{`${c.firstName} ${c.lastName}`.trim()}</div>
                  ))
                : <span className="text-text-muted">— none assigned —</span>}
            </div>
          </FormField>
        </div>
      </div>

      {/* Venue Contract */}
      <div className={sectionCls}>
        <span className={labelCls}>Venue Contract</span>
        <div className="grid grid-cols-1 gap-3">
          <VenueTabEditField
            label="Link to SharePoint – Venue Contract"
            value={venueContractLink}
            onChange={setVenueContractLink}
            disabled={saveContractsMutation.isPending}
            urlField
            inputBgClass="bg-white"
          />
          <VenueTabEditField
            label="Link to SharePoint – Partially Executed Contract"
            value={partialContractLink}
            onChange={setPartialContractLink}
            disabled={saveContractsMutation.isPending}
            urlField
            inputBgClass="bg-white"
          />
          <VenueTabEditField
            label="Link to SharePoint – Fully Executed Contract"
            value={fullContractLink}
            onChange={setFullContractLink}
            disabled={saveContractsMutation.isPending}
            urlField
            inputBgClass="bg-white"
          />
          <VenueTabEditField
            label="Link to SharePoint – Venue Forecast"
            value={forecastLink}
            onChange={setForecastLink}
            disabled={saveContractsMutation.isPending}
            urlField
            inputBgClass="bg-white"
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveContractsMutation.mutate()}
            disabled={saveContractsMutation.isPending}
          >
            {saveContractsMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save contracts & forecast links'}
          </Button>
        </div>
      </div>

    </div>
  );
}

// ─── Attraction Travel section (inside Venues tab) ────────────────────────────

const BOOKED_BY_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  ...TRAVEL_BOOKED_BY_OPTIONS.map((v) => ({ value: v, label: v })),
];

function TravelHotelForm({
  engagementId,
  row,
  addToast,
  onSaved,
  onCancel,
  companyOptions,
  contactOptions,
}: {
  engagementId: number;
  row?: ApiTravelHotelRow | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onSaved: () => void;
  onCancel: () => void;
  companyOptions: Select2Option[];
  contactOptions: Select2Option[];
}) {
  const [bookedBy, setBookedBy] = useState(row?.bookedBy ?? '');
  const [hotelCompanyId, setHotelCompanyId] = useState(row?.hotelCompanyId != null ? String(row.hotelCompanyId) : '');
  const [numRooms, setNumRooms] = useState(row?.numberOfRooms != null ? String(row.numberOfRooms) : '');
  const [roomTypes, setRoomTypes] = useState(row?.roomTypes ?? '');
  const [checkIn, setCheckIn] = useState(row?.checkInDate ?? '');
  const [checkOut, setCheckOut] = useState(row?.checkOutDate ?? '');
  const [occupantId, setOccupantId] = useState(row?.occupantContactId != null ? String(row.occupantContactId) : '');

  const mutation = useMutation<void, Error, CreateTravelHotelPayload>({
    mutationFn: async (body) => {
      if (row?.engagementTravelId) {
        await updateEngagementTravelHotel(engagementId, row.engagementTravelId, body);
      } else {
        await addEngagementTravelHotel(engagementId, body);
      }
    },
    onSuccess: () => { addToast('Hotel travel saved.', 'success'); onSaved(); },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save hotel travel.'), 'error'),
  });

  const handleSave = () =>
    mutation.mutate({
      bookedBy: bookedBy || null,
      hotelCompanyId: hotelCompanyId ? Number(hotelCompanyId) : null,
      numberOfRooms: numRooms ? Number(numRooms) : null,
      roomTypes: roomTypes || null,
      checkInDate: checkIn || null,
      checkOutDate: checkOut || null,
      occupantContactId: occupantId ? Number(occupantId) : null,
    });

  const cls = 'w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-ems-accent/50 disabled:opacity-60';

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface/40 p-4">
      <p className="text-xs font-semibold text-text-primary">Hotel Booking</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Booked By">
          <Select2 options={BOOKED_BY_OPTIONS} value={bookedBy} onChange={setBookedBy} placeholder="Select…" allowClear disabled={mutation.isPending} />
        </FormField>
        <FormField label="Hotel Company">
          <Select2 options={companyOptions} value={hotelCompanyId} onChange={setHotelCompanyId} placeholder="Select hotel company…" allowClear disabled={mutation.isPending} />
        </FormField>
        <FormField label="# Rooms">
          <input type="number" min={1} className={cls} value={numRooms} onChange={(e) => setNumRooms(e.target.value)} disabled={mutation.isPending} />
        </FormField>
        <FormField label="Room Types">
          <input type="text" className={cls} value={roomTypes} onChange={(e) => setRoomTypes(e.target.value)} placeholder="e.g. King, Double…" disabled={mutation.isPending} />
        </FormField>
        <FormField label="Check-In Date">
          <input type="date" className={cls} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={mutation.isPending} />
        </FormField>
        <FormField label="Check-Out Date">
          <input type="date" className={cls} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={mutation.isPending} />
        </FormField>
        <FormField label="Occupant Contact">
          <Select2 options={contactOptions} value={occupantId} onChange={setOccupantId} placeholder="Select contact…" allowClear disabled={mutation.isPending} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
        <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : 'Save Hotel'}
        </Button>
      </div>
    </div>
  );
}

function TravelCarServiceForm({
  engagementId,
  row,
  addToast,
  onSaved,
  onCancel,
}: {
  engagementId: number;
  row?: ApiTravelCarServiceRow | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [bookedBy, setBookedBy] = useState(row?.bookedBy ?? '');
  const [originLine1, setOriginLine1] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originPostal, setOriginPostal] = useState('');
  const [originCountry, setOriginCountry] = useState('US');
  const [destLine1, setDestLine1] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destState, setDestState] = useState('');
  const [destPostal, setDestPostal] = useState('');
  const [destCountry, setDestCountry] = useState('US');
  const [pickupDateTime, setPickupDateTime] = useState(
    row?.pickupDateTime ? row.pickupDateTime.slice(0, 16) : '',
  );

  const mutation = useMutation<void, Error, CreateTravelCarServicePayload>({
    mutationFn: async (body) => {
      if (row?.carServiceTravelId) {
        await updateEngagementTravelCarService(engagementId, row.carServiceTravelId, body);
      } else {
        await addEngagementTravelCarService(engagementId, body);
      }
    },
    onSuccess: () => { addToast('Car service saved.', 'success'); onSaved(); },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save car service.'), 'error'),
  });

  const handleSave = () => {
    const body: CreateTravelCarServicePayload = {
      bookedBy: bookedBy || null,
      pickupDateTime: pickupDateTime || null,
    };
    if (originLine1.trim()) {
      body.originAddress = { addressLine1: originLine1.trim(), city: originCity.trim(), stateProvince: originState.trim(), postalCode: originPostal.trim(), country: originCountry.trim() };
    }
    if (destLine1.trim()) {
      body.destinationAddress = { addressLine1: destLine1.trim(), city: destCity.trim(), stateProvince: destState.trim(), postalCode: destPostal.trim(), country: destCountry.trim() };
    }
    mutation.mutate(body);
  };

  const cls = 'w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-ems-accent/50 disabled:opacity-60';

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface/40 p-4">
      <p className="text-xs font-semibold text-text-primary">Car Service</p>
      {row?.originAddressLabel && (
        <p className="text-xs text-text-muted">Current origin: {row.originAddressLabel}</p>
      )}
      {row?.destinationAddressLabel && (
        <p className="text-xs text-text-muted">Current destination: {row.destinationAddressLabel}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Booked By">
          <Select2 options={BOOKED_BY_OPTIONS} value={bookedBy} onChange={setBookedBy} placeholder="Select…" allowClear disabled={mutation.isPending} />
        </FormField>
        <FormField label="Pickup Date & Time">
          <input type="datetime-local" className={cls} value={pickupDateTime} onChange={(e) => setPickupDateTime(e.target.value)} disabled={mutation.isPending} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">Origin Address</p>
          <input type="text" className={cls} placeholder="Address Line 1" value={originLine1} onChange={(e) => setOriginLine1(e.target.value)} disabled={mutation.isPending} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" className={cls} placeholder="City" value={originCity} onChange={(e) => setOriginCity(e.target.value)} disabled={mutation.isPending} />
            <input type="text" className={cls} placeholder="State/Province" value={originState} onChange={(e) => setOriginState(e.target.value)} disabled={mutation.isPending} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" className={cls} placeholder="Postal Code" value={originPostal} onChange={(e) => setOriginPostal(e.target.value)} disabled={mutation.isPending} />
            <input type="text" className={cls} placeholder="Country" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} disabled={mutation.isPending} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">Destination Address</p>
          <input type="text" className={cls} placeholder="Address Line 1" value={destLine1} onChange={(e) => setDestLine1(e.target.value)} disabled={mutation.isPending} />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" className={cls} placeholder="City" value={destCity} onChange={(e) => setDestCity(e.target.value)} disabled={mutation.isPending} />
            <input type="text" className={cls} placeholder="State/Province" value={destState} onChange={(e) => setDestState(e.target.value)} disabled={mutation.isPending} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" className={cls} placeholder="Postal Code" value={destPostal} onChange={(e) => setDestPostal(e.target.value)} disabled={mutation.isPending} />
            <input type="text" className={cls} placeholder="Country" value={destCountry} onChange={(e) => setDestCountry(e.target.value)} disabled={mutation.isPending} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
        <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : 'Save Car Service'}
        </Button>
      </div>
    </div>
  );
}

function AttractionTravelSection({
  engagementId,
  addToast,
}: {
  engagementId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const qc = useQueryClient();
  const [addingType, setAddingType] = useState<'Hotel' | 'Car' | null>(null);
  const [editingHotel, setEditingHotel] = useState<ApiTravelHotelRow | null>(null);
  const [editingCar, setEditingCar] = useState<ApiTravelCarServiceRow | null>(null);

  const travelQuery = useQuery({
    queryKey: ['engagements', engagementId, 'travel'],
    queryFn: () => fetchEngagementTravel(engagementId),
  });

  const iaeContactLookupsQuery = useQuery({
    queryKey: ['engagements', 'iae-contact-lookups'],
    queryFn: fetchEngagementIaeContactLookups,
    staleTime: 300_000,
  });

  const hotelCompanySearchQuery = useQuery({
    queryKey: ['companies', 'hotel-type'],
    queryFn: () => fetchCompanies(0, 200, { companyType: 'Hotel' }),
    staleTime: 120_000,
  });

  const hotelCompanyOptions = useMemo<Select2Option[]>(
    () => [
      { value: '', label: 'Select hotel company…' },
      ...(hotelCompanySearchQuery.data?.data ?? []).map((c) => ({
        value: String(c.companyId),
        label: c.companyName,
      })),
    ],
    [hotelCompanySearchQuery.data],
  );

  const contactOptions = useMemo<Select2Option[]>(
    () => [
      { value: '', label: 'Not set' },
      ...(iaeContactLookupsQuery.data?.contacts ?? []).map((c) => ({ value: String(c.id), label: c.label })),
    ],
    [iaeContactLookupsQuery.data],
  );

  const deleteMutation = useMutation({
    mutationFn: (travelId: number) => deleteEngagementTravel(engagementId, travelId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'travel'] });
      addToast('Travel record removed.', 'warning');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not remove travel record.'), 'error'),
  });

  const invalidateTravel = () => qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'travel'] });
  const sectionCls = 'rounded-md border border-border bg-surface/40 p-4 space-y-3';

  if (travelQuery.isLoading) {
    return (
      <div className={sectionCls}>
        <span className="text-xs font-semibold text-text-primary block mb-3">Attraction Travel</span>
        <div className="flex items-center gap-2 text-text-muted text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading travel…
        </div>
      </div>
    );
  }

  const travels = travelQuery.data ?? [];

  return (
    <div className={sectionCls}>
      <span className="text-xs font-semibold text-text-primary block">Attraction Travel</span>

      {travels.length > 0 && (
        <div className="space-y-3">
          {travels.map((t) => (
            <div key={t.engagementTravelId} className="rounded border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">
                  {t.travelType === 'Hotel' ? '🏨 Hotel' : '🚗 Car Service'}
                </span>
                <button
                  type="button"
                  className="text-ems-coral hover:text-ems-coral/70 p-1 rounded"
                  onClick={() => deleteMutation.mutate(t.engagementTravelId)}
                  disabled={deleteMutation.isPending}
                  title="Remove travel record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {t.travelType === 'Hotel' && t.hotel && (
                editingHotel?.engagementTravelId === t.engagementTravelId ? (
                  <TravelHotelForm
                    engagementId={engagementId}
                    row={t.hotel}
                    addToast={addToast}
                    onSaved={() => { setEditingHotel(null); void invalidateTravel(); }}
                    onCancel={() => setEditingHotel(null)}
                    companyOptions={hotelCompanyOptions}
                    contactOptions={contactOptions}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
                    {t.hotel.bookedBy && <><span className="text-text-muted">Booked by:</span><span>{t.hotel.bookedBy}</span></>}
                    {t.hotel.hotelCompanyName && <><span className="text-text-muted">Hotel:</span><span>{t.hotel.hotelCompanyName}</span></>}
                    {(t.hotel.hotelAddressLine1 || t.hotel.hotelAddressCity) && (
                      <><span className="text-text-muted">Address:</span><span>{[t.hotel.hotelAddressLine1, t.hotel.hotelAddressCity, t.hotel.hotelAddressStateProvince, t.hotel.hotelAddressPostalCode, t.hotel.hotelAddressCountry].filter(Boolean).join(', ')}</span></>
                    )}
                    {t.hotel.numberOfRooms != null && <><span className="text-text-muted"># Rooms:</span><span>{t.hotel.numberOfRooms}</span></>}
                    {t.hotel.roomTypes && <><span className="text-text-muted">Room types:</span><span>{t.hotel.roomTypes}</span></>}
                    {(t.hotel.checkInDate || t.hotel.checkOutDate) && <><span className="text-text-muted">Dates:</span><span>{t.hotel.checkInDate} → {t.hotel.checkOutDate}</span></>}
                    {t.hotel.occupantContactName && <><span className="text-text-muted">Occupant:</span><span>{t.hotel.occupantContactName}</span></>}
                    <div className="col-span-2 flex justify-end mt-1">
                      <button type="button" className="text-xs text-ems-accent hover:underline" onClick={() => setEditingHotel(t.hotel)}>Edit</button>
                    </div>
                  </div>
                )
              )}

              {t.travelType === 'Car' && t.carServices.map((cs) => (
                editingCar?.carServiceTravelId === cs.carServiceTravelId ? (
                  <TravelCarServiceForm
                    key={cs.carServiceTravelId}
                    engagementId={engagementId}
                    row={cs}
                    addToast={addToast}
                    onSaved={() => { setEditingCar(null); void invalidateTravel(); }}
                    onCancel={() => setEditingCar(null)}
                  />
                ) : (
                  <div key={cs.carServiceTravelId} className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
                    {cs.bookedBy && <><span className="text-text-muted">Booked by:</span><span>{cs.bookedBy}</span></>}
                    {cs.originAddressLabel && <><span className="text-text-muted">Origin:</span><span>{cs.originAddressLabel}</span></>}
                    {cs.destinationAddressLabel && <><span className="text-text-muted">Destination:</span><span>{cs.destinationAddressLabel}</span></>}
                    {cs.pickupDateTime && <><span className="text-text-muted">Pickup:</span><span>{new Date(cs.pickupDateTime).toLocaleString()}</span></>}
                    <div className="col-span-2 flex justify-end mt-1">
                      <button type="button" className="text-xs text-ems-accent hover:underline" onClick={() => setEditingCar(cs)}>Edit</button>
                    </div>
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      )}

      {addingType === 'Hotel' && (
        <TravelHotelForm
          engagementId={engagementId}
          addToast={addToast}
          onSaved={() => { setAddingType(null); void invalidateTravel(); }}
          onCancel={() => setAddingType(null)}
          companyOptions={hotelCompanyOptions}
          contactOptions={contactOptions}
        />
      )}

      {addingType === 'Car' && (
        <TravelCarServiceForm
          engagementId={engagementId}
          addToast={addToast}
          onSaved={() => { setAddingType(null); void invalidateTravel(); }}
          onCancel={() => setAddingType(null)}
        />
      )}

      {!addingType && (
        <div className="flex gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={() => setAddingType('Hotel')}>
            <Plus className="h-3 w-3 mr-1" /> Add Hotel
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setAddingType('Car')}>
            <Plus className="h-3 w-3 mr-1" /> Add Car Service
          </Button>
        </div>
      )}
    </div>
  );
}

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
  const [expandedVenueId, setExpandedVenueId] = useState<number | null>(null);

  const venueTabQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
  });

  // Keep the legacy venues query in sync (used by other parts of the page)
  const removeMutation = useMutation({
    mutationFn: (venueCompanyId: number) => removeEngagementVenue(engagementId, venueCompanyId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venues'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] }),
      ]);
      addToast('Venue removed from engagement.', 'warning');
      setPendingRemove(null);
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not remove venue.'), 'error'),
  });

  const venues = useMemo(() => venueTabQuery.data?.venues ?? [], [venueTabQuery.data]);
  const venueDealType = venueTabQuery.data?.venueDealType ?? null;
  const venueDealTypeId = venueTabQuery.data?.venueDealTypeId ?? null;
  const venueTerms = venueTabQuery.data?.venueTerms ?? null;
  const techRiderLinkUrl = venueTabQuery.data?.techRiderLinkUrl ?? null;
  const engagementLinks = useMemo(() => venueTabQuery.data?.engagementLinks ?? [], [venueTabQuery.data]);
  const venueRoleContacts = venueTabQuery.data?.venueRoleContacts ?? {};

  if (venueTabQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading venues…
      </div>
    );
  }

  if (venueTabQuery.error) {
    return (
      <div className="flex items-center gap-2 text-ems-coral text-sm py-4">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(venueTabQuery.error)}
        <button type="button" onClick={() => venueTabQuery.refetch()} className="text-xs underline ml-1">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Venues</h3>

      {venues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Building2 className="h-8 w-8 text-text-muted/50" />
          <p className="text-sm text-text-muted">No venue links found for this engagement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map((v) => (
            <div
              key={v.venueCompanyId}
              className={`border rounded-lg ${
                v.isPrimary ? 'border-ems-accent/40 bg-ems-accent-dim/20' : 'border-border bg-surface/40'
              }`}
            >
              {/* Venue header row */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Building2 className={`h-4 w-4 mt-0.5 shrink-0 ${v.isPrimary ? 'text-ems-accent' : 'text-text-muted'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onNavigate('companies', { selectedCompanyId: v.venueCompanyId })}
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
                        onClick={() => onNavigate('companies', { selectedCompanyId: v.venueCompanyId })}
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
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setExpandedVenueId(expandedVenueId === v.venueCompanyId ? null : v.venueCompanyId)}
                    className="text-xs text-ems-accent hover:underline"
                  >
                    {expandedVenueId === v.venueCompanyId ? 'Collapse' : 'Details'}
                  </button>
                  {!v.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPendingRemove(v)}
                      disabled={removeMutation.isPending}
                      className="text-ems-coral text-xs hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedVenueId === v.venueCompanyId && (
                <div className="border-t border-border px-4 pb-4">
                  <VenueDetailPanel
                    engagementId={engagementId}
                    venue={v}
                    venueDealType={venueDealType}
                    venueDealTypeId={venueDealTypeId}
                    venueTerms={venueTerms}
                    techRiderLinkUrl={techRiderLinkUrl}
                    engagementLinks={engagementLinks}
                    venueRoleContacts={venueRoleContacts[v.venueCompanyId] ?? null}
                    addToast={addToast}
                    onNavigate={onNavigate}
                  />
                </div>
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

  const stagehandProviderOptions = useMemo((): Select2Option[] => {
    const base = companyToSelect2Options(stagehandProvidersQuery.data ?? []);

    const current = currentStagehandProviderId == null ? '' : String(currentStagehandProviderId);
    if (current && !base.some((option) => option.value === current)) {
      return [{ value: current, label: `Current saved provider (#${current})` }, ...base];
    }
    return base;
  }, [currentStagehandProviderId, stagehandProvidersQuery.data]);

  const stagehandProviderContacts = useMemo(() => {
    const data = venueDetailsQuery.data;
    if (!data || data.missing === true) return [] as { contactInfoId: number; fullName: string; email: string; phone: string | null; cellPhone: string | null }[];
    return data.stagehandProviderContacts ?? [];
  }, [venueDetailsQuery.data]);

  // Venue tab fields: Venue Type, Tech Pack
  const [venueTypeId, setVenueTypeId] = useState('');
  const [stageDimensions, setStageDimensions] = useState('');
  const [flySystemSpecs, setFlySystemSpecs] = useState('');
  const [stageType, setStageType] = useState('');
  const [techPackPdfUrl, setTechPackPdfUrl] = useState('');

  const venueTabDataQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    enabled: venueCompanyId != null && venueCompanyId > 0,
  });

  const primaryVenue = useMemo(
    () => (venueTabDataQuery.data?.venues ?? []).find((v) => v.venueCompanyId === venueCompanyId) ?? null,
    [venueTabDataQuery.data, venueCompanyId],
  );

  const venueRoleContactsForVenue = useMemo(
    () => (venueCompanyId != null ? venueTabDataQuery.data?.venueRoleContacts?.[venueCompanyId] : null) ?? null,
    [venueTabDataQuery.data, venueCompanyId],
  );

  useEffect(() => {
    if (!primaryVenue) return;
    setVenueTypeId(primaryVenue.venueTypeId != null ? String(primaryVenue.venueTypeId) : '');
    setStageDimensions(primaryVenue.stageDimensions ?? '');
    setFlySystemSpecs(primaryVenue.flySystemSpecs ?? '');
    setStageType(primaryVenue.stageType ?? '');
    setTechPackPdfUrl(primaryVenue.techPackPdfUrl ?? '');
  }, [primaryVenue]);

  const venueTypesQuery = useQuery({
    queryKey: ['lookups', 'venue-types'],
    queryFn: fetchVenueTypesLookup,
    staleTime: 300_000,
  });

  const venueTypeOptions = useMemo<Select2Option[]>(
    () => [
      { value: '', label: 'Not set' },
      ...(venueTypesQuery.data ?? []).map((vt: ApiVenueType) => ({
        value: String(vt.venueTypeId),
        label: vt.venueTypeName,
      })),
    ],
    [venueTypesQuery.data],
  );

  const makeVenueTabMutation = (onSuccessExtra?: () => void) =>
    useMutation({
      mutationFn: (body: UpdateEngagementVenueTabPayload) => {
        if (venueCompanyId == null) throw new Error('No venue linked to this engagement.');
        return updateEngagementVenueTab(engagementId, venueCompanyId, body);
      },
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
        addToast('Saved.', 'success');
        onSuccessExtra?.();
      },
      onError: (e) => addToast(friendlyApiError(e, 'Could not save.'), 'error'),
    });

  const saveVenueTypeMutation = makeVenueTabMutation();
  const saveTechPackMutation = makeVenueTabMutation();

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
    stagehandProvidersQuery.isLoading ||
    venueTabDataQuery.isLoading;
  const error =
    venueDetailsQuery.error ||
    venueContactsQuery.error ||
    stagehandProvidersQuery.error ||
    venueTabDataQuery.error;
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
              void venueTabDataQuery.refetch();
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

      {/* IAE Production Manager */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-4">
        <span className="text-xs font-semibold text-text-primary block">IAE Production Manager</span>
        <div className="min-h-[42px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
          {(venueTabDataQuery.data?.iaeProductionManagers ?? []).length === 0 ? (
            <span className="text-text-muted">No IAE production manager assigned.</span>
          ) : (
            <ul className="space-y-2">
              {venueTabDataQuery.data!.iaeProductionManagers.map((c) => (
                <li key={c.contactId} className="flex flex-col gap-0.5">
                  <span className="font-medium">{`${c.firstName} ${c.lastName}`.trim()}</span>
                  <span className="text-xs text-text-muted">{c.roleName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Venue Production Manager */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-4">
        <span className="text-xs font-semibold text-text-primary block">Venue Production Manager</span>
        <div className="min-h-[42px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
          {(venueRoleContactsForVenue?.venueProductionManager ?? []).length === 0 ? (
            <span className="text-text-muted">No venue production manager contact assigned.</span>
          ) : (
            <ul className="space-y-2">
              {venueRoleContactsForVenue!.venueProductionManager.map((c) => (
                <li key={c.contactId} className="flex flex-col gap-0.5">
                  <span className="font-medium">{`${c.firstName} ${c.lastName}`.trim()}</span>
                  <span className="text-xs text-text-muted">{c.roleName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Venue Stage Labor Company Contact */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-4">
        <span className="text-xs font-semibold text-text-primary block">Stagehand Provider</span>
        <div className="min-h-[42px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
          {(venueRoleContactsForVenue?.venueStageLaborCompany ?? []).length === 0 ? (
            <span className="text-text-muted">No stage labor contact assigned.</span>
          ) : (
            <ul className="space-y-2">
              {venueRoleContactsForVenue!.venueStageLaborCompany.map((c) => (
                <li key={c.contactId} className="flex flex-col gap-0.5">
                  <span className="font-medium">{`${c.firstName} ${c.lastName}`.trim()}</span>
                  <span className="text-xs text-text-muted">{c.roleName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Venue Type */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-4">
        <span className="text-xs font-semibold text-text-primary block">Venue Type</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Type">
            <Select2
              options={venueTypeOptions}
              value={venueTypeId}
              onChange={setVenueTypeId}
              placeholder="Select type…"
              allowClear
              disabled={saveVenueTypeMutation.isPending}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveVenueTypeMutation.mutate({ venueTypeId: venueTypeId ? Number(venueTypeId) : null })}
            disabled={saveVenueTypeMutation.isPending}
          >
            {saveVenueTypeMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save venue type'}
          </Button>
        </div>
      </div>

      {/* Venue Tech Pack */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-4">
        <span className="text-xs font-semibold text-text-primary block">Venue Tech Pack</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <VenueTabEditField
            label="Venue Stage Dimensions"
            value={stageDimensions}
            onChange={setStageDimensions}
            disabled={saveTechPackMutation.isPending}
          />
          <VenueTabEditField
            label="Venue Fly System Specs"
            value={flySystemSpecs}
            onChange={setFlySystemSpecs}
            disabled={saveTechPackMutation.isPending}
          />
          <VenueTabEditField
            label="Stage Type"
            value={stageType}
            onChange={setStageType}
            disabled={saveTechPackMutation.isPending}
          />
        </div>
        {techPackPdfUrl.trim() && isValidHttpOrHttpsUrl(techPackPdfUrl) && (
          <a
            href={techPackPdfUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ems-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" /> Open tech pack PDF
          </a>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => {
              if (!isValidHttpOrHttpsUrl(techPackPdfUrl)) {
                addToast('Venue Tech Pack PDF must be a valid http(s) URL, or left empty.', 'error');
                return;
              }
              saveTechPackMutation.mutate({
                stageDimensions: stageDimensions || null,
                flySystemSpecs: flySystemSpecs || null,
                stageType: stageType || null,
                techPackPdfUrl: techPackPdfUrl.trim() || null,
              });
            }}
            disabled={saveTechPackMutation.isPending}
          >
            {saveTechPackMutation.isPending ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
            ) : 'Save tech pack'}
          </Button>
        </div>
      </div>

      {/* Attraction Travel */}
      <div className="rounded-md border border-border bg-surface/40 p-4 space-y-2">
        <span className="text-xs font-semibold text-text-primary block mb-2">Attraction Travel</span>
        <AttractionTravelSection engagementId={engagementId} addToast={addToast} />
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
  const [status, setStatus] = useState(
    perf.performanceStatus.trim().toLowerCase() === 'private' ? 'Private' : 'Public',
  );
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
        performanceStatus: isPrimary ? 'Public' : status || 'Public',
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

  const handleToggleVisibility = async () => {
    if (isPrimary) return;
    const next =
      perf.performanceStatus.trim().toLowerCase() === 'private' ? 'Public' : 'Private';
    setSaving(true);
    try {
      await updateEngagementPerformance(engagementId, perf.performanceId, {
        performanceStatus: next,
      });
      addToast(`Performance set to ${next}.`, 'success');
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
            <label className="text-xs text-text-muted block mb-1 font-medium">Visibility</label>
            <div className="flex items-center rounded-md border border-border bg-surface p-1">
              <button
                type="button"
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${status === 'Public' ? 'bg-ems-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                onClick={() => setStatus('Public')}
              >
                Public
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${status === 'Private' ? 'bg-ems-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                onClick={() => setStatus('Private')}
                disabled={isPrimary}
              >
                Private
              </button>
            </div>
            {isPrimary && (
              <p className="mt-1 text-[11px] text-text-muted">Opening performance is always Public.</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDate(perf.performanceDate);
              setTime(perf.performanceTime.slice(0, 5));
              setStatus(
                perf.performanceStatus.trim().toLowerCase() === 'private'
                  ? 'Private'
                  : 'Public',
              );
            }}
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
            onClick={() => void handleToggleVisibility()}
            disabled={saving || isPrimary}
            className="text-xs text-text-secondary hover:text-ems-accent px-2.5 py-1.5 rounded hover:bg-elevated transition-colors disabled:opacity-50"
          >
            {perf.performanceStatus.trim().toLowerCase() === 'private'
              ? 'Set Public'
              : 'Set Private'}
          </button>
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

function parseOptionalPercent(
  s: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const parsed = parseOptionalDecimal(s, label);
  if (!parsed.ok) return parsed;
  if (parsed.value == null) return parsed;
  if (parsed.value < 0 || parsed.value > 100) {
    return { ok: false, message: `${label} must be between 0 and 100.` };
  }
  return parsed;
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

/** Empty is allowed; otherwise must be a valid absolute http:// or https:// URL (not random text). */
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
  const ticketingCompaniesQuery = useQuery({
    queryKey: ['companies', 'ticketing-systems'],
    queryFn: () => fetchCompanies(0, 10_000),
    staleTime: 60_000,
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
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-details'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'marketing-meta'] });
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

  const DEAL_TYPES = ['Flat', 'Versus', 'Promoter Profit'] as const;
  const ROYALTY_BASIS = ['Based on Net', 'Based on NAGBOR'] as const;

  const [artistDealType, setArtistDealType] = useState('');
  const [artistGuarantee, setArtistGuarantee] = useState('');
  const [artistVersusPercent, setArtistVersusPercent] = useState('');
  const [artistPromoterProfitPercent, setArtistPromoterProfitPercent] = useState('');
  const [artistBackendPercent, setArtistBackendPercent] = useState('');
  const [artistMiddleMoney, setArtistMiddleMoney] = useState('');
  const [middleMoneyEnabled, setMiddleMoneyEnabled] = useState<'yes' | 'no'>('no');
  const [artistRoyaltyRatePercent, setArtistRoyaltyRatePercent] = useState('');
  const [artistRoyaltyBasedOn, setArtistRoyaltyBasedOn] = useState('');
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
    setArtistDealType(d.artistDealType ?? '');
    setArtistGuarantee(numFieldToString(d.artistGuarantee));
    setArtistVersusPercent(numFieldToString(d.artistVersusPercent));
    setArtistPromoterProfitPercent(
      numFieldToString(d.artistPromoterProfitPercent ?? d.promoterProfit),
    );
    setArtistBackendPercent(numFieldToString(d.artistBackendPercent));
    setArtistMiddleMoney(numFieldToString(d.artistMiddleMoney));
    setMiddleMoneyEnabled(d.artistMiddleMoney == null ? 'no' : 'yes');
    setArtistRoyaltyRatePercent(numFieldToString(d.artistRoyaltyRatePercent));
    setArtistRoyaltyBasedOn(d.artistRoyaltyBasedOn ?? '');
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
    const dealType = artistDealType.trim();
    if (dealType !== '' && !DEAL_TYPES.includes(dealType as (typeof DEAL_TYPES)[number])) {
      addToast('Deal Type must be Flat, Versus, or Promoter Profit.', 'error');
      return;
    }

    const g = parseOptionalDecimal(artistGuarantee, 'Artist guarantee');
    const versus = parseOptionalPercent(artistVersusPercent, 'Versus (%)');
    const promoterPct = parseOptionalPercent(
      artistPromoterProfitPercent,
      'Promoter Profit (%)',
    );
    const backendPct = parseOptionalPercent(artistBackendPercent, 'Artist Backend (%)');
    const m = parseOptionalDecimal(artistMiddleMoney, 'Artist middle money');
    const royaltyRate = parseOptionalPercent(artistRoyaltyRatePercent, 'Royalty rate (%)');
    for (const x of [g, versus, promoterPct, backendPct, m, royaltyRate]) {
      if (!x.ok) {
        addToast(x.message, 'error');
        return;
      }
    }
    if (g.value != null && g.value < 0) {
      addToast('Artist guarantee must be 0 or greater.', 'error');
      return;
    }

    const royaltyBasis = artistRoyaltyBasedOn.trim();
    if (
      royaltyBasis !== '' &&
      !ROYALTY_BASIS.includes(royaltyBasis as (typeof ROYALTY_BASIS)[number])
    ) {
      addToast('Royalty basis must be Based on Net or Based on NAGBOR.', 'error');
      return;
    }

    if (m.value != null && m.value < 0) {
      addToast('Middle Money amount must be 0 or greater.', 'error');
      return;
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
      artistDealType: dealType || null,
      artistGuarantee: g.value,
      artistVersusPercent: dealType === 'Versus' ? versus.value : null,
      artistPromoterProfitPercent:
        dealType === 'Promoter Profit' ? promoterPct.value : null,
      artistBackendPercent: dealType === 'Promoter Profit' ? backendPct.value : null,
      promoterProfit: dealType === 'Promoter Profit' ? promoterPct.value : null,
      artistRoyaltyRatePercent: royaltyRate.value,
      artistRoyaltyBasedOn: royaltyBasis || null,
      artistMiddleMoney: middleMoneyEnabled === 'yes' ? m.value : null,
      finalAcceptedOfferLink: offerTrim || null,
      settlementFileSharePointLink: settleTrim || null,
    });
  };

  const artistTermsDirtyRaw = useMemo(() => {
    const d = financeQuery.data;
    if (!d) return false;
    const dealType = artistDealType.trim();
    const g = parseOptionalDecimal(artistGuarantee, 'Artist guarantee');
    const versus = parseOptionalPercent(artistVersusPercent, 'Versus (%)');
    const promoterPct = parseOptionalPercent(artistPromoterProfitPercent, 'Promoter Profit (%)');
    const backendPct = parseOptionalPercent(artistBackendPercent, 'Artist Backend (%)');
    const m = parseOptionalDecimal(artistMiddleMoney, 'Artist middle money');
    const royaltyRate = parseOptionalPercent(artistRoyaltyRatePercent, 'Royalty rate (%)');
    if (!g.ok || !versus.ok || !promoterPct.ok || !backendPct.ok || !m.ok || !royaltyRate.ok)
      return true;
    const royaltyBasis = artistRoyaltyBasedOn.trim();
    const cur = JSON.stringify({
      artistDealType: dealType || null,
      artistGuarantee: g.value,
      artistVersusPercent: dealType === 'Versus' ? versus.value : null,
      artistPromoterProfitPercent:
        dealType === 'Promoter Profit' ? promoterPct.value : null,
      artistBackendPercent: dealType === 'Promoter Profit' ? backendPct.value : null,
      artistRoyaltyRatePercent: royaltyRate.value,
      artistRoyaltyBasedOn: royaltyRate.value != null && royaltyRate.value > 0 ? royaltyBasis || null : null,
      artistMiddleMoney: middleMoneyEnabled === 'yes' ? m.value : null,
      finalAcceptedOfferLink: finalOfferLink.trim() || null,
      settlementFileSharePointLink: settlementFileLink.trim() || null,
    });
    const base = JSON.stringify({
      artistDealType: (d.artistDealType ?? '').trim() || null,
      artistGuarantee: d.artistGuarantee ?? null,
      artistVersusPercent:
        (d.artistDealType ?? '').trim() === 'Versus' ? d.artistVersusPercent ?? null : null,
      artistPromoterProfitPercent:
        (d.artistDealType ?? '').trim() === 'Promoter Profit'
          ? (d.artistPromoterProfitPercent ?? d.promoterProfit ?? null)
          : null,
      artistBackendPercent:
        (d.artistDealType ?? '').trim() === 'Promoter Profit'
          ? d.artistBackendPercent ?? null
          : null,
      artistRoyaltyRatePercent: d.artistRoyaltyRatePercent ?? null,
      artistRoyaltyBasedOn:
        (d.artistRoyaltyRatePercent ?? 0) > 0 ? (d.artistRoyaltyBasedOn ?? null) : null,
      artistMiddleMoney: d.artistMiddleMoney ?? null,
      finalAcceptedOfferLink: (d.finalAcceptedOfferLink ?? '').trim() || null,
      settlementFileSharePointLink: (d.settlementFileSharePointLink ?? '').trim() || null,
    });
    return cur !== base;
  }, [
    financeQuery.data,
    artistDealType,
    artistGuarantee,
    artistVersusPercent,
    artistPromoterProfitPercent,
    artistBackendPercent,
    artistMiddleMoney,
    middleMoneyEnabled,
    artistRoyaltyRatePercent,
    artistRoyaltyBasedOn,
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
        {fieldRow(
          'Deal Type',
          <Select2
            options={BOOKING_ATTRACTION_DEAL_TYPE_OPTIONS}
            value={artistDealType}
            onChange={(v) => {
              markArtistTermsUserEdited();
              setArtistDealType(v);
            }}
            placeholder="Not set"
            allowClear
            disabled={disabled}
          />,
        )}
        {fieldRow('Artist Guarantee', moneyInput(artistGuarantee, setArtistGuarantee, 'at-guarantee'))}
      </div>

      {artistDealType === 'Versus' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Artist Royalty Variable Fee (%)', pctInput(artistVersusPercent, setArtistVersusPercent, 'at-versus', false))}
        </div>
      )}

      {artistDealType === 'Promoter Profit' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow(
            'Promoter Profit (%)',
            pctInput(artistPromoterProfitPercent, setArtistPromoterProfitPercent, 'at-promoter-profit', false),
          )}
          {fieldRow(
            'Artist Back End Terms (%)',
            pctInput(artistBackendPercent, setArtistBackendPercent, 'at-artist-backend', false),
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
        {fieldRow(
          'Royalty Rate (%)',
          pctInput(artistRoyaltyRatePercent, setArtistRoyaltyRatePercent, 'at-royalty-rate', false),
        )}
        {Number(artistRoyaltyRatePercent || '0') > 0
          ? fieldRow(
              'Royalty Basis',
              <select
                id="at-royalty-basis"
                className={inputCls}
                value={artistRoyaltyBasedOn}
                onChange={(e) => {
                  markArtistTermsUserEdited();
                  setArtistRoyaltyBasedOn(e.target.value);
                }}
                disabled={disabled}
              >
                <option value="">Select basis</option>
                <option value="Based on Net">Based on Net</option>
                <option value="Based on NAGBOR">Based on NAGBOR</option>
              </select>,
            )
          : fieldRow(
              'Royalty Basis',
              <input
                id="at-royalty-basis-disabled"
                className={inputCls}
                value="Not required when rate is 0"
                disabled
                readOnly
              />,
            )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
        {fieldRow(
          'Artist Middle Money?',
          <select
            id="at-middle-enabled"
            className={inputCls}
            value={middleMoneyEnabled}
            onChange={(e) => {
              markArtistTermsUserEdited();
              const next = e.target.value === 'yes' ? 'yes' : 'no';
              setMiddleMoneyEnabled(next);
              if (next === 'no') setArtistMiddleMoney('');
            }}
            disabled={disabled}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>,
        )}
        {middleMoneyEnabled === 'yes'
          ? fieldRow('Artist Middle Money Amount ($)', moneyInput(artistMiddleMoney, setArtistMiddleMoney, 'at-middle'))
          : fieldRow(
              'Artist Middle Money Amount ($)',
              <input id="at-middle-disabled" className={inputCls} value="Not applicable" disabled readOnly />,
            )}
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

// ---------------------------------------------------------------------------
// Booking Tab Panel
// ---------------------------------------------------------------------------
const BOOKING_ATTRACTION_DEAL_TYPES = ['Flat', 'Versus', 'Promoter Profit'] as const;
const BOOKING_ATTRACTION_DEAL_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  ...(['Flat', 'Versus', 'Promoter Profit'] as const).map((v) => ({ value: v, label: v })),
];
const BOOKING_IAE_STAFF_FIELDS = [
  { key: 'talentBuyer' as const, label: 'IAE Talent Buyer', aliases: ['Talent Buyer', 'IAE Talent Buyer'] as readonly string[] },
  { key: 'bookingManager' as const, label: 'IAE Booking Manager', aliases: ['Booking Manager', 'IAE Booking Manager'] as readonly string[] },
];

function EngagementBookingPanel({
  engagementId,
  row,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  row: ApiEngagementListRow;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();

  // ── Data queries ──────────────────────────────────────────────────────────
  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
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

  const venueTabQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    retry: 1,
  });

  const serviceProvidersQuery = useQuery({
    queryKey: ['engagements', engagementId, 'service-providers'],
    queryFn: () => fetchEngagementServiceProviders(engagementId),
    staleTime: 30_000,
  });

  // Reuse the tours/companies lookups (shared cache with main component)
  const lookupsQuery = useQuery({
    queryKey: ['engagements-lookups'],
    queryFn: async () => {
      const lookupLimit = 10000;
      const [attractions, tours, companies] = await Promise.all([
        fetchAttractions(0, lookupLimit),
        fetchTours(0, lookupLimit),
        fetchCompanies(0, lookupLimit),
      ]);
      return { attractions: attractions.data ?? [], tours: tours.data ?? [], companies: companies.data ?? [] };
    },
    staleTime: 60_000,
  });

  // ── Derived tour info ─────────────────────────────────────────────────────
  const selectedTour = useMemo(
    () => (lookupsQuery.data?.tours ?? []).find((t) => t.tourId === row.tourId) ?? null,
    [lookupsQuery.data?.tours, row.tourId],
  );
  // tourMgmtCompanyId is editable — initialised from tour, saved back to dbo.Tour

  const talentAgencyCompanyId = selectedTour?.talentAgencyCompanyId ?? null;
  const talentAgencyCompanyName = useMemo(
    () => (lookupsQuery.data?.companies ?? []).find((c) => c.companyId === talentAgencyCompanyId)?.companyName
      ?? selectedTour?.talentAgencyCompanyName ?? null,
    [lookupsQuery.data?.companies, talentAgencyCompanyId, selectedTour?.talentAgencyCompanyName],
  );
  const talentAgentContactIds = useMemo(
    () => new Set((selectedTour?.talentAgentContactIds ?? []).map(Number)),
    [selectedTour?.talentAgentContactIds],
  );

  // ── Engagement partner (Promoter Partner from dbo.EngagementPartner) ──────
  const partnerQuery = useQuery({
    queryKey: ['engagements', engagementId, 'partner'],
    queryFn: () => fetchEngagementPartner(engagementId),
    enabled: engagementId > 0,
  });

  // ── Tour Management companies (type = 'Tour Management') ─────────────────
  const tourMgmtCompaniesQuery = useQuery({
    queryKey: ['companies', 'tour-management'],
    queryFn: () => fetchCompanies(0, 5000, { companyType: 'Tour Management' }),
    staleTime: 300_000,
  });
  const allTourMgmtCompanyOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— not set —' },
    ...(tourMgmtCompaniesQuery.data?.data ?? [])
      .map((c) => ({ value: String(c.companyId), label: c.companyName })),
  ], [tourMgmtCompaniesQuery.data?.data]);

  const talentAgencyContactsQuery = useQuery({
    queryKey: ['company-contacts', 'talent-agency', talentAgencyCompanyId],
    queryFn: () => fetchCompanyContacts(talentAgencyCompanyId!),
    enabled: talentAgencyCompanyId != null && talentAgencyCompanyId > 0,
  });

  // ── IAE contact lookups (contacts picker for talent buyer / booking mgr) ──
  const roleIdsByKey = useMemo(() => {
    const roles = iaeLookupsQuery.data?.roles;
    return Object.fromEntries(
      BOOKING_IAE_STAFF_FIELDS.map((f) => [f.key, findMainInfoRoleId(roles, f.aliases)]),
    ) as Record<'talentBuyer' | 'bookingManager', number | null>;
  }, [iaeLookupsQuery.data?.roles]);

  // Only IAE staff assigned to this engagement (Overview → staff assignments)
  // with the matching role appear in each picker.
  const iaeRowsByKey = useMemo(() => {
    const result: Record<'talentBuyer' | 'bookingManager', string> = { talentBuyer: '', bookingManager: '' };
    for (const field of BOOKING_IAE_STAFF_FIELDS) {
      const roleId = roleIdsByKey[field.key];
      if (roleId == null) continue;
      const matches = (iaeContactsQuery.data ?? []).filter((r) => r.roleId === roleId);
      result[field.key] = matches.map((r) => r.contactLabel).join(', ');
    }
    return result;
  }, [iaeContactsQuery.data, roleIdsByKey]);

  // ── Primary venue for booking manager ─────────────────────────────────────
  const primaryVenue = useMemo(
    () => (venueTabQuery.data?.venues ?? []).find((v) => v.isPrimary) ?? null,
    [venueTabQuery.data?.venues],
  );

  // ── Contact options for venue-linked pickers ──────────────────────────────
  const toContactOption = (c: ApiCompanyContact): Select2Option => ({
    value: String(c.contactId),
    label: [c.firstName, c.lastName].filter(Boolean).join(' ') || `Contact #${c.contactId}`,
  });

  const makeContactOptions = (contacts: ApiCompanyContact[] | undefined): Select2Option[] => [
    { value: '', label: '— not set —' },
    ...(contacts ?? []).map(toContactOption),
  ];

  const talentAgentContacts = useMemo(
    () => (talentAgencyContactsQuery.data ?? []).filter((c) => talentAgentContactIds.has(c.contactId)),
    [talentAgencyContactsQuery.data, talentAgentContactIds],
  );

  // ── Edit states ──────────────────────────────────────────────────────────
  const [promoterPartnerCompanyId, setPromoterPartnerCompanyId] = useState('');
  const [promoterPartnerContactId, setPromoterPartnerContactId] = useState('');
  const [tourMgmtCompanyId, setTourMgmtCompanyId] = useState('');
  const [tourManagerContactId, setTourManagerContactId] = useState('');
  // Attraction terms
  const [attractionDealType, setAttractionDealType] = useState('');
  const [attractionGuarantee, setAttractionGuarantee] = useState('');
  const [attractionOveragePercent, setAttractionOveragePercent] = useState('');
  const [attractionRoyaltyPercent, setAttractionRoyaltyPercent] = useState('');
  const [attractionMiddleMoney, setAttractionMiddleMoney] = useState('');
  // Venue terms
  const [venueDealTypeId, setVenueDealTypeId] = useState('');
  // Attraction contract links
  const [attractionContractLink, setAttractionContractLink] = useState('');
  const [partiallyExecutedLink, setPartiallyExecutedLink] = useState('');
  const [fullyExecutedLink, setFullyExecutedLink] = useState('');

  // ── Tour Management contacts (based on selected company) ──────────────────
  const selectedTourMgmtCompanyId = fkIdStringToNumber(tourMgmtCompanyId);

  const tourMgmtContactsQuery = useQuery({
    queryKey: ['company-contacts', 'tour-mgmt', selectedTourMgmtCompanyId],
    queryFn: () => fetchCompanyContacts(selectedTourMgmtCompanyId!),
    enabled: selectedTourMgmtCompanyId != null && selectedTourMgmtCompanyId > 0,
  });

  const tourMgmtContactOptions = useMemo(
    () => makeContactOptions(tourMgmtContactsQuery.data),
    [tourMgmtContactsQuery.data],
  );

  const {
    hasUserEdited,
    markUserEdited,
    clearUserEdited,
  } = useUserEditTracker(`booking:${engagementId}`);

  // ── Populate from API data ────────────────────────────────────────────────
  useEffect(() => {
    const p = partnerQuery.data;
    if (!p) return;
    setPromoterPartnerCompanyId(p.partnerCompanyId != null ? String(p.partnerCompanyId) : '');
    setPromoterPartnerContactId(p.partnerContactId != null ? String(p.partnerContactId) : '');
  }, [partnerQuery.data]);

  useEffect(() => {
    const compId = selectedTour?.tourManagementCompanyId;
    setTourMgmtCompanyId(compId != null ? String(compId) : '');
  }, [selectedTour?.tourManagementCompanyId]);

  useEffect(() => {
    setTourManagerContactId(row.tourManagerContactId != null ? String(row.tourManagerContactId) : '');
  }, [row.tourManagerContactId]);

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setAttractionDealType(d.artistDealType ?? '');
    setAttractionGuarantee(numFieldToString(d.artistGuarantee));
    setAttractionOveragePercent(numFieldToString(d.overagePercent));
    setAttractionRoyaltyPercent(numFieldToString(d.artistRoyaltyRatePercent));
    setAttractionMiddleMoney(numFieldToString(d.artistMiddleMoney));
    setVenueDealTypeId(d.venueDealTypeId != null ? String(d.venueDealTypeId) : '');
    setAttractionContractLink(d.attractionContractSharePointLink ?? '');
    setPartiallyExecutedLink(d.partiallyExecutedAttractionContractSharePointLink ?? '');
    setFullyExecutedLink(d.fullyExecutedAttractionContractSharePointLink ?? '');
  }, [financeQuery.data]);

  // ── Venue Booking & Programming contacts (read-only) ──────────────────────
  const primaryVenueCompanyId = row.primaryVenueCompanyId;
  const venueDetailsQuery = useQuery({
    queryKey: ['venue-details', primaryVenueCompanyId],
    queryFn: () => fetchVenueDetails(primaryVenueCompanyId!),
    enabled: primaryVenueCompanyId != null && primaryVenueCompanyId > 0,
    staleTime: 60_000,
  });
  const venueBookingProgrammingContacts = useMemo(() => {
    const d = venueDetailsQuery.data;
    if (!d || d.missing) return [];
    const entries: { role: string; names: string }[] = [];
    const rentalNames = (d.rentalManagers ?? []).map((c) => c.fullName).filter(Boolean);
    const calendarNames = (d.calendarManagers ?? []).map((c) => c.fullName).filter(Boolean);
    const contractNames = (d.contractManagers ?? []).map((c) => c.fullName).filter(Boolean);
    if (rentalNames.length) entries.push({ role: 'Rental Manager', names: rentalNames.join(', ') });
    if (calendarNames.length) entries.push({ role: 'Calendar Manager', names: calendarNames.join(', ') });
    if (contractNames.length) entries.push({ role: 'Contracts Manager', names: contractNames.join(', ') });
    return entries;
  }, [venueDetailsQuery.data]
  );

  // ── Venue Deal Type options (from dbo.VenueDealType) ────────────────────────
  const financeLookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
  });
  const venueDealTypeOptions = useMemo((): Select2Option[] => [
    { value: '', label: 'Not set' },
    ...(financeLookupsQuery.data?.venueDealTypes ?? []).map((r) => ({ value: String(r.id), label: r.label })),
  ], [financeLookupsQuery.data?.venueDealTypes]);

  // ── Promoter partner company options (type = 'Promoter Partner') ────────────
  const promoterPartnerCompaniesQuery = useQuery({
    queryKey: ['companies', 'promoter-partner'],
    queryFn: () => fetchCompanies(0, 5000, { companyType: 'Promoter Partner' }),
    staleTime: 300_000,
  });
  const allPromoterCompanyOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— not set —' },
    ...(promoterPartnerCompaniesQuery.data?.data ?? [])
      .map((c) => ({ value: String(c.companyId), label: c.companyName })),
  ], [promoterPartnerCompaniesQuery.data?.data]);

  // ── Promoter partner contacts (based on selected company) ──────────────────
  const selectedPromoterCompanyId = fkIdStringToNumber(promoterPartnerCompanyId);

  const promoterContactsQuery = useQuery({
    queryKey: ['company-contacts', 'promoter', selectedPromoterCompanyId],
    queryFn: () => fetchCompanyContacts(selectedPromoterCompanyId!),
    enabled: selectedPromoterCompanyId != null && selectedPromoterCompanyId > 0,
  });

  const promoterContactOptions = useMemo(
    () => makeContactOptions(promoterContactsQuery.data),
    [promoterContactsQuery.data],
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const d = financeQuery.data;
      const guarantee = parseOptionalDecimal(attractionGuarantee, 'Guarantee');
      if (!guarantee.ok) throw new Error(guarantee.message);
      const overage = parseOptionalPercent(attractionOveragePercent, 'Overage (%)');
      if (!overage.ok) throw new Error(overage.message);
      const royalty = parseOptionalPercent(attractionRoyaltyPercent, 'Royalty (%)');
      if (!royalty.ok) throw new Error(royalty.message);
      const middleMoney = parseOptionalDecimal(attractionMiddleMoney, 'Middle Money');
      if (!middleMoney.ok) throw new Error(middleMoney.message);

      const acLink = attractionContractLink.trim();
      const peLink = partiallyExecutedLink.trim();
      const feLink = fullyExecutedLink.trim();
      for (const [label, val] of [
        ['Attraction Contract Link', acLink],
        ['Partially Executed Attraction Contract Link', peLink],
        ['Fully Executed Attraction Contract Link', feLink],
      ] as const) {
        if (val && !isValidHttpOrHttpsUrl(val)) {
          throw new Error(`${label} must be a valid http(s) URL or empty.`);
        }
      }

      // ── Promoter partner → dbo.EngagementPartner ─────────────────────────
      const selectedPromoterId = fkIdStringToNumber(promoterPartnerCompanyId);
      if (selectedPromoterId != null) {
        await updateEngagementPartner(engagementId, {
          partnerCompanyId: selectedPromoterId,
          partnerContactId: fkIdStringToNumber(promoterPartnerContactId) ?? null,
        });
      }

      // ── Tour Management Company → dbo.Tour.TourManagementCompanyID ───────
      if (row.tourId != null) {
        await updateTour(row.tourId, {
          tourManagementCompanyId: fkIdStringToNumber(tourMgmtCompanyId) ?? null,
        });
      }

      // ── Tour Manager Contact → dbo.Engagement.TourManagerContactID ────────
      await updateEngagement(engagementId, {
        tourManagerContactId: fkIdStringToNumber(tourManagerContactId) ?? null,
      });

      // ── Finance fields (artist terms + venue deal type + booking columns) ─
      await updateEngagementFinance(engagementId, {
        // Artist / Attraction terms
        artistDealType: attractionDealType.trim() || null,
        artistGuarantee: guarantee.value,
        overagePercent: overage.value,
        artistRoyaltyRatePercent: royalty.value,
        artistMiddleMoney: middleMoney.value,
        // Venue terms
        venueDealTypeId: fkIdStringToNumber(venueDealTypeId),
        // Booking fields (new optional columns)
        attractionContractSharePointLink: acLink || null,
        partiallyExecutedAttractionContractSharePointLink: peLink || null,
        fullyExecutedAttractionContractSharePointLink: feLink || null,
      });

      // Invalidate queries
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'partner'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'iae-contacts'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] }),
        qc.invalidateQueries({ queryKey: ['engagements', engagementId] }),
        qc.invalidateQueries({ queryKey: ['tours'] }),
      ]);
    },
    onSuccess: () => {
      clearUserEdited();
      addToast('Booking tab saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const isLoading =
    financeQuery.isLoading ||
    partnerQuery.isLoading ||
    iaeLookupsQuery.isLoading ||
    iaeContactsQuery.isLoading ||
    venueTabQuery.isLoading ||
    serviceProvidersQuery.isLoading;

  const loadError =
    financeQuery.error ??
    partnerQuery.error ??
    iaeLookupsQuery.error ??
    iaeContactsQuery.error ??
    venueTabQuery.error ??
    serviceProvidersQuery.error;

  const disabled = saveMut.isPending;

  useEffect(() => {
    onDirtyChange?.(hasUserEdited);
    return () => onDirtyChange?.(false);
  }, [hasUserEdited, onDirtyChange]);

  const inputCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50';
  // White-background variant for the Attraction Terms / Attraction Contract inputs.
  const whiteInputCls = inputCls.replace('bg-background', 'bg-white');

  const sectionTitle = (title: string) => (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">{title}</h4>
  );

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <label className="text-sm font-medium text-text-primary">{label}</label>
      <div>{control}</div>
    </div>
  );

  if (isLoading && !financeQuery.data) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading booking data…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 text-ems-coral text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {friendlyApiError(loadError)}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {saveMut.isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]" aria-live="polite" aria-busy="true">
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-6 p-5">
        <h3 className="text-base font-semibold text-text-primary">Booking</h3>

        {/* ── IAE BOOKING ──────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('IAE Booking')}
          {fieldRow(
            'IAE Talent Buyer',
            <span className="text-sm text-text-primary">{iaeRowsByKey.talentBuyer || '— not set —'}</span>,
          )}
          {fieldRow(
            'IAE Booking Manager',
            <span className="text-sm text-text-primary">{iaeRowsByKey.bookingManager || '— not set —'}</span>,
          )}
          <p className="text-xs text-text-muted">Managed in the Main Information tab under "Innovation Arts Staff Assignments".</p>
        </div>

        {/* ── VENUE BOOKING & PROGRAMMING ──────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Venue Booking Manager')}
          {primaryVenueCompanyId == null ? (
            <p className="text-sm text-text-muted">No primary venue linked.</p>
          ) : venueDetailsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading venue contacts…
            </div>
          ) : venueBookingProgrammingContacts.length === 0 ? (
            <p className="text-sm text-text-muted">No Booking & Programming contacts set on this venue.</p>
          ) : (
            <div className="space-y-1">
              {venueBookingProgrammingContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted min-w-[140px]">{c.role}:</span>
                  <span className="text-text-primary">{c.names}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted">Managed in the venue's company profile.</p>
        </div>

  {/* ── TALENT AGENCY ────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Talent Agency')}
          {talentAgencyCompanyName ? (
            <p className="text-sm text-text-secondary">
              <span className="font-medium">Agency:</span> {talentAgencyCompanyName}
            </p>
          ) : null}
          {talentAgentContacts.length === 0 ? (
            <p className="text-sm text-text-muted">No talent agents assigned to this tour.</p>
          ) : (
            <div className="space-y-1">
              {talentAgentContacts.map((c) => (
                <p key={c.contactId} className="text-sm text-text-secondary">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || `Contact #${c.contactId}`}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted">Talent agents are read-only here; manage them on the Tour record.</p>
        </div>

        {/* ── PROMOTER PARTNER ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Promoter Partner')}
          {fieldRow(
            'Promoter Partner Company',
            <Select2
              options={allPromoterCompanyOptions}
              value={promoterPartnerCompanyId}
              onChange={(v) => { markUserEdited(); setPromoterPartnerCompanyId(v); setPromoterPartnerContactId(''); }}
              placeholder="— not set —"
              allowClear
              disabled={disabled}
            />,
          )}
          {fieldRow(
            'Promoter Partner Contact',
            selectedPromoterCompanyId == null ? (
              <span className="text-sm text-text-muted">Select a promoter company first.</span>
            ) : (
              <Select2
                options={promoterContactOptions}
                value={promoterPartnerContactId}
                onChange={(v) => { markUserEdited(); setPromoterPartnerContactId(v); }}
                placeholder="— not set —"
                allowClear
                disabled={disabled || promoterContactsQuery.isLoading}
              />
            ),
          )}
          <p className="text-xs text-text-muted">Company also editable in the Main Information tab.</p>
        </div>

        {/* ── TOUR MANAGEMENT ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Tour Management')}
          {fieldRow(
            'Tour Management Company',
            <Select2
              options={allTourMgmtCompanyOptions}
              value={tourMgmtCompanyId}
              onChange={(v) => { markUserEdited(); setTourMgmtCompanyId(v); setTourManagerContactId(''); }}
              placeholder="— not set —"
              allowClear
              disabled={disabled || tourMgmtCompaniesQuery.isLoading}
            />,
          )}
          {fieldRow(
            'Tour Manager Contact',
            selectedTourMgmtCompanyId == null ? (
              <span className="text-sm text-text-muted">Select a Tour Management Company first.</span>
            ) : (
              <Select2
                options={tourMgmtContactOptions}
                value={tourManagerContactId}
                onChange={(v) => { markUserEdited(); setTourManagerContactId(v); }}
                placeholder="— not set —"
                allowClear
                disabled={disabled || tourMgmtContactsQuery.isLoading}
              />
            ),
          )}
        </div>

        {/* ── ATTRACTION TERMS ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Attraction Terms')}
          {fieldRow(
            'Deal Type',
            <Select2
              options={BOOKING_ATTRACTION_DEAL_TYPE_OPTIONS}
              value={attractionDealType}
              onChange={(v) => { markUserEdited(); setAttractionDealType(v); }}
              placeholder="Not set"
              allowClear
              disabled={disabled}
            />,
          )}
          {fieldRow(
            'Guarantee (Amount $)',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${whiteInputCls} pl-8`}
                inputMode="decimal"
                value={attractionGuarantee}
                onChange={(e) => { markUserEdited(); setAttractionGuarantee(e.target.value); }}
                disabled={disabled}
              />
            </div>,
          )}
          {fieldRow(
            'Overage (%)',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">%</span>
              <input
                className={`${whiteInputCls} pl-8`}
                inputMode="decimal"
                value={attractionOveragePercent}
                onChange={(e) => { markUserEdited(); setAttractionOveragePercent(e.target.value); }}
                disabled={disabled}
              />
            </div>,
          )}
          {fieldRow(
            'Royalty (%)',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">%</span>
              <input
                className={`${whiteInputCls} pl-8`}
                inputMode="decimal"
                value={attractionRoyaltyPercent}
                onChange={(e) => { markUserEdited(); setAttractionRoyaltyPercent(e.target.value); }}
                disabled={disabled}
              />
            </div>,
          )}
          {fieldRow(
            'Middle Money ($)',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${whiteInputCls} pl-8`}
                inputMode="decimal"
                value={attractionMiddleMoney}
                onChange={(e) => { markUserEdited(); setAttractionMiddleMoney(e.target.value); }}
                disabled={disabled}
              />
            </div>,
          )}
          <p className="text-xs text-text-muted">Also editable in the Artist Terms tab.</p>
        </div>

        {/* ── VENUE TERMS ──────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Venue Terms')}
          {fieldRow(
            'Deal Type',
            <Select2
              options={venueDealTypeOptions}
              value={venueDealTypeId}
              onChange={(v) => { markUserEdited(); setVenueDealTypeId(v); }}
              placeholder="Not set"
              allowClear
              disabled={disabled}
            />,
          )}
          <p className="text-xs text-text-muted">Also editable in the Finance tab.</p>
        </div>

        {/* ── ATTRACTION CONTRACT ───────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          {sectionTitle('Attraction Contract')}
          {fieldRow(
            'Attraction Contract',
            <div className="flex gap-2 items-center">
              <input
                type="url"
                className={`${whiteInputCls} flex-1`}
                value={attractionContractLink}
                onChange={(e) => { markUserEdited(); setAttractionContractLink(e.target.value); }}
                disabled={disabled}
                placeholder="https://…"
              />
            </div>,
          )}
          {fieldRow(
            'Partially Executed',
            <div className="flex gap-2 items-center">
              <input
                type="url"
                className={`${whiteInputCls} flex-1`}
                value={partiallyExecutedLink}
                onChange={(e) => { markUserEdited(); setPartiallyExecutedLink(e.target.value); }}
                disabled={disabled}
                placeholder="https://…"
              />
            </div>,
          )}
          {fieldRow(
            'Fully Executed',
            <div className="flex gap-2 items-center">
              <input
                type="url"
                className={`${whiteInputCls} flex-1`}
                value={fullyExecutedLink}
                onChange={(e) => { markUserEdited(); setFullyExecutedLink(e.target.value); }}
                disabled={disabled}
                placeholder="https://…"
              />

            </div>,
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveMut.mutate()}
            disabled={disabled || !hasUserEdited}
          >
            {disabled ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save booking'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const SALES_TAX_REMITTED_BY_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Venue', label: 'Venue' },
  { value: 'IAE', label: 'IAE' },
  { value: 'Partner', label: 'Partner' },
];
const WITHHOLDING_PAYMENT_METHOD_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Check', label: 'Check' },
  { value: 'Wire', label: 'Wire' },
  { value: 'ACH', label: 'ACH' },
];

function EngagementEventBusinessPanel({
  engagementId,
  venueCompanyId,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  venueCompanyId: number | null | undefined;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();
  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });
  const iaeLookupsQuery = useQuery({
    queryKey: ['engagements', 'iae-contact-lookups'],
    queryFn: fetchEngagementIaeContactLookups,
    staleTime: 300_000,
  });
  const financeLookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
  });
  const venueDealTypeOptions = useMemo((): Select2Option[] => [
    { value: '', label: 'Not set' },
    ...(financeLookupsQuery.data?.venueDealTypes ?? []).map((r) => ({ value: String(r.id), label: r.label })),
  ], [financeLookupsQuery.data?.venueDealTypes]);

  // ── IAE contacts assigned to this engagement (for role-based display) ─────────────────────────────────────────────
  const iaeContactsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'iae-contacts'],
    queryFn: () => fetchEngagementIaeContacts(engagementId),
    staleTime: 60_000,
  });

  // ── Venue tab data (for engagement links) ─────────────────────────────────────────────
  const venueTabDataQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    staleTime: 60_000,
  });
  const engagementLinks = useMemo(() => venueTabDataQuery.data?.engagementLinks ?? [], [venueTabDataQuery.data]);

  // ── Venue details (for settlement managers from venue company) ─────────────────────────────────────────────
  const venueDetailsQuery = useQuery({
    queryKey: ['venue-details', venueCompanyId],
    queryFn: () => fetchVenueDetails(venueCompanyId!),
    enabled: venueCompanyId != null && venueCompanyId > 0,
    staleTime: 120_000,
  });

  // ── Deposit Terms (PerformanceContracts) ─────────────────────────────────
  const depositTermsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'deposit-terms'],
    queryFn: () => fetchDepositTerms(engagementId),
  });

  // Derive IAE staff by role from engagement IAE contacts
  const iaeEventBusinessManagers = useMemo(() =>
    (iaeContactsQuery.data ?? []).filter((c) => c.roleName === 'Event Business Manager'),
    [iaeContactsQuery.data],
  );
  const iaeEventBusinessAssistantManagers = useMemo(() =>
    (iaeContactsQuery.data ?? []).filter((c) => c.roleName === 'Event Business Assistant Manager'),
    [iaeContactsQuery.data],
  );

  // Derive venue settlement managers from venue details
  const venueSettlementManagers = useMemo(() => {
    const vd = venueDetailsQuery.data;
    if (!vd || vd.missing === true) return [];
    return (vd as { settlementManagers?: { contactId: number; fullName: string }[] }).settlementManagers ?? [];
  }, [venueDetailsQuery.data]);

  const iaeContactOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— not set —' },
    ...(iaeLookupsQuery.data?.contacts ?? []).map((c) => ({ value: String(c.id), label: c.label })),
  ], [iaeLookupsQuery.data?.contacts]);

  // ── Settlement status ─────────────────────────────────────────────
  const [artistSettlementStatus, setArtistSettlementStatus] = useState('');
  const [venueSettlementStatus, setVenueSettlementStatus] = useState('');

  // ── IAE Event Business ─────────────────────────────────────────────
  const [eventBusinessManagerContactId, setEventBusinessManagerContactId] = useState('');
  const [eventBusinessAssistantManagerContactId, setEventBusinessAssistantManagerContactId] = useState('');

  // ── Venue Settlement Manager ─────────────────────────────────────────────
  const [venueSettlementContactId, setVenueSettlementContactId] = useState('');

  // ── Settlement Files ─────────────────────────────────────────────
  const [tourSettlementFileSharePointLink, setTourSettlementFileSharePointLink] = useState('');
  const [venueSettlementFileSharePointLink, setVenueSettlementFileSharePointLink] = useState('');
  const [partnerSettlementFileSharePointLink, setPartnerSettlementFileSharePointLink] = useState('');

  // ── Attraction Terms (separate save) ─────────────────────────────────────────────
  const [attrDealType, setAttrDealType] = useState('');
  const [attrGuarantee, setAttrGuarantee] = useState('');
  const [attrOveragePercent, setAttrOveragePercent] = useState('');
  const [attrRoyaltyPercent, setAttrRoyaltyPercent] = useState('');
  const [attrMiddleMoney, setAttrMiddleMoney] = useState('');
  const [attrBuyouts, setAttrBuyouts] = useState('');
  const [attrCollateralizedDeal, setAttrCollateralizedDeal] = useState('');
  const [attrTourOfferLink, setAttrTourOfferLink] = useState('');
  const [attrFullyExecutedContractLink, setAttrFullyExecutedContractLink] = useState('');

  // ── Deposit Terms (separate save) ─────────────────────────────────────────────
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDueDate, setDepositDueDate] = useState('');

  // ── Venue Terms (separate save) ─────────────────────────────────────────────
  const [venueTermsDealTypeId, setVenueTermsDealTypeId] = useState('');
  const [venueTermsFullyExecutedLink, setVenueTermsFullyExecutedLink] = useState('');
  const [venueTermsForecastLink, setVenueTermsForecastLink] = useState('');

  // ── Sales Tax ─────────────────────────────────────────────
  const [salesTaxRemittedBy, setSalesTaxRemittedBy] = useState('');
  const [subscriptionSalesRevenueTotal, setSubscriptionSalesRevenueTotal] = useState('');
  const [seasonTicketSalesByIae, setSeasonTicketSalesByIae] = useState('');
  const [seasonTicketFundsTransferred, setSeasonTicketFundsTransferred] = useState('');
  const [netBoxOfficeFundsDepositedAccount, setNetBoxOfficeFundsDepositedAccount] = useState('');
  const [hstCollectedFromTicketSales, setHstCollectedFromTicketSales] = useState('');
  const [hstPaidOnTourPayments, setHstPaidOnTourPayments] = useState('');
  const [hstPaidOnShowExpenses, setHstPaidOnShowExpenses] = useState('');
  const [hstPaidOnVenueExpenses, setHstPaidOnVenueExpenses] = useState('');
  const [hstRemittedToIae, setHstRemittedToIae] = useState('');
  const [hstPaidToAttraction, setHstPaidToAttraction] = useState('');

  // ── Non-Resident Withholding ─────────────────────────────────────────────
  const [withholdingArea, setWithholdingArea] = useState('');
  const [withholdingRate, setWithholdingRate] = useState('');
  const [withholdingAgency, setWithholdingAgency] = useState('');
  const [withholdingPayee, setWithholdingPayee] = useState('');
  const [withholdingPaymentMethod, setWithholdingPaymentMethod] = useState('');
  const [withholdingFormToAttractionLink, setWithholdingFormToAttractionLink] = useState('');
  const [withholdingFormToMunicipalityLink, setWithholdingFormToMunicipalityLink] = useState('');
  const [withholdingQuickbooksNumber, setWithholdingQuickbooksNumber] = useState('');
  const [withholdingWaiver, setWithholdingWaiver] = useState('');
  const [withholdingCompletedWaiverLink, setWithholdingCompletedWaiverLink] = useState('');
  const [tourWaiverLink, setTourWaiverLink] = useState('');
  const [withholdingExceptions, setWithholdingExceptions] = useState('');
  const [iaeWaiverSubmissionDate, setIaeWaiverSubmissionDate] = useState('');
  const [iaeWaiverAppNumber, setIaeWaiverAppNumber] = useState('');
  const [checkNumberOrConfOfWithholdingPayment, setCheckNumberOrConfOfWithholdingPayment] = useState('');

  // ── Final Attraction Compensation (separate save) ─────────────────────────────────────────────
  const [finalGuaranteeAmount, setFinalGuaranteeAmount] = useState('');
  const [finalRoyaltyAmount, setFinalRoyaltyAmount] = useState('');
  const [finalOverageAmount, setFinalOverageAmount] = useState('');
  const [finalBuyoutAmount, setFinalBuyoutAmount] = useState('');
  const [finalDirectCompanyCharges, setFinalDirectCompanyCharges] = useState('');
  const [finalReimbursables, setFinalReimbursables] = useState('');
  const [artistGrossTaxableCompensation, setArtistGrossTaxableCompensation] = useState('');
  const [amountDueToDeptOfRevenue, setAmountDueToDeptOfRevenue] = useState('');

  const {
    hasUserEdited: hasSettlementEdited,
    markUserEdited: markSettlementEdited,
    clearUserEdited: clearSettlementEdited,
  } = useUserEditTracker(`settlement:${engagementId}`);

  const {
    hasUserEdited: hasSettlementFilesEdited,
    markUserEdited: markSettlementFilesEdited,
    clearUserEdited: clearSettlementFilesEdited,
  } = useUserEditTracker(`settlement-files:${engagementId}`);

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setArtistSettlementStatus(d.artistSettlementStatus ?? '');
    setVenueSettlementStatus(d.venueSettlementStatus ?? '');
    setEventBusinessManagerContactId(d.eventBusinessManagerContactId == null ? '' : String(d.eventBusinessManagerContactId));
    setEventBusinessAssistantManagerContactId(d.eventBusinessAssistantManagerContactId == null ? '' : String(d.eventBusinessAssistantManagerContactId));
    setVenueSettlementContactId(d.venueSettlementContactId == null ? '' : String(d.venueSettlementContactId));
    setTourSettlementFileSharePointLink(engagementLinks.find((el) => el.linkPurpose === 'TourSettlementFile')?.linkUrl ?? '');
    setVenueSettlementFileSharePointLink(d.venueSettlementFileSharePointLink ?? '');
    setPartnerSettlementFileSharePointLink(d.partnerSettlementFileSharePointLink ?? '');
    // Attraction Terms (separate save)
    setAttrDealType(d.artistDealType ?? '');
    setAttrGuarantee(numFieldToString(d.artistGuarantee));
    setAttrOveragePercent(numFieldToString(d.overagePercent));
    setAttrRoyaltyPercent(numFieldToString(d.artistRoyaltyRatePercent));
    setAttrMiddleMoney(numFieldToString(d.artistMiddleMoney));
    setAttrBuyouts(numFieldToString(d.artistBuyouts));
    setAttrCollateralizedDeal(d.artistPartOfCollateralizedDeal == null ? '' : d.artistPartOfCollateralizedDeal ? 'Yes' : 'No');
    setAttrTourOfferLink(d.artistTourOfferLink ?? '');
    setAttrFullyExecutedContractLink(d.fullyExecutedAttractionContractSharePointLink ?? '');
    // Venue Terms (separate save)
    setVenueTermsDealTypeId(d.venueDealTypeId != null ? String(d.venueDealTypeId) : '');
    setVenueTermsFullyExecutedLink(engagementLinks.find((el) => el.linkPurpose === 'fully executed')?.linkUrl ?? '');
    setVenueTermsForecastLink(engagementLinks.find((el) => el.linkPurpose === 'VenueForcast')?.linkUrl ?? '');
    setSalesTaxRemittedBy(d.salesTaxRemittedBy ?? '');
    setSubscriptionSalesRevenueTotal(numFieldToString(d.subscriptionSalesRevenueTotal));
    setSeasonTicketSalesByIae(numFieldToString(d.seasonTicketSalesByIae));
    setSeasonTicketFundsTransferred(numFieldToString(d.seasonTicketFundsTransferred));
    setNetBoxOfficeFundsDepositedAccount(d.netBoxOfficeFundsDepositedAccount ?? '');
    setHstCollectedFromTicketSales(numFieldToString(d.hstCollectedFromTicketSales));
    setHstPaidOnTourPayments(numFieldToString(d.hstPaidOnTourPayments));
    setHstPaidOnShowExpenses(numFieldToString(d.hstPaidOnShowExpenses));
    setHstPaidOnVenueExpenses(numFieldToString(d.hstPaidOnVenueExpenses));
    setHstRemittedToIae(d.hstCollectedFromTicketSales != null && d.hstCollectedFromTicketSales !== 0 ? 'Yes' : '');
    setHstPaidToAttraction(d.hstPaidOnTourPayments != null && d.hstPaidOnTourPayments !== 0 ? 'Yes' : '');
    // NRW lookup fields (area/rate/agency/waiver date/app) are populated from financeLookupsQuery
    const nrwRow = d.requiredNonResidentWithholdingId != null
      ? (financeLookupsQuery.data?.nonResidentWithholdings ?? []).find((r) => r.id === d.requiredNonResidentWithholdingId)
      : undefined;
    setWithholdingArea(nrwRow?.withholdingArea ?? '');
    setWithholdingRate(nrwRow?.withholdingTaxRate != null ? String(nrwRow.withholdingTaxRate) : '');
    setWithholdingAgency(nrwRow?.withholdingAgencyName ?? '');
    setIaeWaiverSubmissionDate(nrwRow?.iaeWaiverSubmissionDate ?? '');
    setIaeWaiverAppNumber(nrwRow?.iaeWaiverAppNumber ?? '');
    setWithholdingPayee(d.withholdingPayee ?? '');
    setWithholdingPaymentMethod(d.withholdingPaymentMethod ?? '');
    setWithholdingFormToAttractionLink(d.withholdingFormToAttractionLink ?? '');
    setWithholdingFormToMunicipalityLink(d.withholdingFormToMunicipalityLink ?? '');
    setWithholdingQuickbooksNumber(d.withholdingQuickbooksNumber ?? '');
    setWithholdingWaiver(d.withholdingWaiver ?? '');
    setWithholdingCompletedWaiverLink(d.withholdingCompletedWaiverLink ?? '');
    setTourWaiverLink(d.tourWaiverLink ?? '');
    setWithholdingExceptions(d.withholdingExceptions ?? '');
    setCheckNumberOrConfOfWithholdingPayment(d.checkNumberOrConfOfWithholdingPayment ?? '');
    // Final Attraction Compensation (separate save)
    setFinalGuaranteeAmount(numFieldToString(d.finalGuaranteeAmount));
    setFinalRoyaltyAmount(numFieldToString(d.finalRoyaltyAmount));
    setFinalOverageAmount(numFieldToString(d.finalOverageAmount));
    setFinalBuyoutAmount(numFieldToString(d.finalBuyoutAmount));
    setFinalDirectCompanyCharges(numFieldToString(d.finalDirectCompanyCharges));
    setFinalReimbursables(numFieldToString(d.finalReimbursables));
    setArtistGrossTaxableCompensation(numFieldToString(d.artistGrossTaxableCompensation));
    setAmountDueToDeptOfRevenue(numFieldToString(d.amountDueToDeptOfRevenue));
  }, [financeQuery.data, engagementLinks]);

  // â”€â”€ Settlement Status — separate save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // -- Settlement -- separate save
  const saveSettlementMut = useMutation({
    mutationFn: async () => {
      const decSpecs: { raw: string; label: string; key: keyof UpdateEngagementFinancePayload }[] = [
        { raw: subscriptionSalesRevenueTotal, label: 'Subscription sales revenue total', key: 'subscriptionSalesRevenueTotal' },
        { raw: seasonTicketSalesByIae, label: 'Season ticket sales by IAE', key: 'seasonTicketSalesByIae' },
        { raw: seasonTicketFundsTransferred, label: 'Season ticket funds transferred', key: 'seasonTicketFundsTransferred' },
        { raw: artistGrossTaxableCompensation, label: 'Artist gross taxable compensation', key: 'artistGrossTaxableCompensation' },
        { raw: amountDueToDeptOfRevenue, label: 'Amount due to Dept of Revenue', key: 'amountDueToDeptOfRevenue' },
      ];
      const payload: Partial<UpdateEngagementFinancePayload> = {};
      for (const { raw, label, key } of decSpecs) {
        const p = parseOptionalDecimal(raw, label);
        if (!p.ok) throw new Error((p as { ok: false; message: string }).message);
        (payload as any)[key] = (p as { ok: true; value: number | null }).value;
      }
      payload.artistSettlementStatus = artistSettlementStatus.trim() || null;
      payload.venueSettlementStatus = venueSettlementStatus.trim() || null;
      payload.netBoxOfficeFundsDepositedAccount = netBoxOfficeFundsDepositedAccount.trim() || null;
      payload.checkNumberOrConfOfWithholdingPayment = checkNumberOrConfOfWithholdingPayment.trim() || null;
      await updateEngagementFinance(engagementId, payload);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearSettlementEdited(); addToast('Settlement saved.', 'success'); },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  // -- Sales Tax -- separate save
  const {
    hasUserEdited: hasSalesTaxEdited,
    markUserEdited: markSalesTaxEdited,
    clearUserEdited: clearSalesTaxEdited,
  } = useUserEditTracker(`sales-tax:${engagementId}`);

  const saveSalesTaxMut = useMutation({
    mutationFn: async () => {
      const decSpecs: { raw: string; label: string; key: keyof UpdateEngagementFinancePayload }[] = [
        { raw: hstCollectedFromTicketSales, label: 'HST collected from ticket sales', key: 'hstCollectedFromTicketSales' },
        { raw: hstPaidOnTourPayments, label: 'HST paid on tour payments', key: 'hstPaidOnTourPayments' },
        { raw: hstPaidOnShowExpenses, label: 'HST paid on show expenses', key: 'hstPaidOnShowExpenses' },
        { raw: hstPaidOnVenueExpenses, label: 'HST paid on venue expenses', key: 'hstPaidOnVenueExpenses' },
      ];
      const payload: Partial<UpdateEngagementFinancePayload> = {};
      for (const { raw, label, key } of decSpecs) {
        const p = parseOptionalDecimal(raw, label);
        if (!p.ok) throw new Error((p as { ok: false; message: string }).message);
        (payload as any)[key] = (p as { ok: true; value: number | null }).value;
      }
      payload.salesTaxRemittedBy = salesTaxRemittedBy.trim() || null;
      await updateEngagementFinance(engagementId, payload);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearSalesTaxEdited(); addToast('Sales tax saved.', 'success'); },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  // -- Non-Resident Withholding Tax -- separate save
  const {
    hasUserEdited: hasWithholdingEdited,
    markUserEdited: markWithholdingEdited,
    clearUserEdited: clearWithholdingEdited,
  } = useUserEditTracker(`withholding:${engagementId}`);

  const saveWithholdingMut = useMutation({
    mutationFn: async () => {
      const urlFields: [string, string][] = [
        ['Withholding Form to Attraction link', withholdingFormToAttractionLink],
        ['Withholding Form to Municipality link', withholdingFormToMunicipalityLink],
        ['Withholding Completed Waiver link', withholdingCompletedWaiverLink],
        ['Tour Waiver link', tourWaiverLink],
      ];
      for (const [label, val] of urlFields) {
        const t = val.trim();
        if (t && !isValidHttpOrHttpsUrl(t)) throw new Error(`${label} must be a valid http(s) URL or empty.`);
      }
      const payload: Partial<UpdateEngagementFinancePayload> = {};
      payload.withholdingPayee = withholdingPayee.trim() || null;
      payload.withholdingPaymentMethod = withholdingPaymentMethod.trim() || null;
      payload.withholdingFormToAttractionLink = withholdingFormToAttractionLink.trim() || null;
      payload.withholdingFormToMunicipalityLink = withholdingFormToMunicipalityLink.trim() || null;
      payload.withholdingQuickbooksNumber = withholdingQuickbooksNumber.trim() || null;
      payload.withholdingWaiver = withholdingWaiver.trim() || null;
      payload.withholdingCompletedWaiverLink = withholdingCompletedWaiverLink.trim() || null;
      payload.tourWaiverLink = tourWaiverLink.trim() || null;
      payload.withholdingExceptions = withholdingExceptions.trim() || null;
      await updateEngagementFinance(engagementId, payload);
      // Update NRW lookup record fields (area, rate, agency, waiver date/app)
      const nrwId = financeQuery.data?.requiredNonResidentWithholdingId;
      if (nrwId != null) {
        await updateNonResidentWithholding(nrwId, {
          withholdingArea: withholdingArea.trim() || null,
          withholdingTaxRate: withholdingRate.trim() ? Number(withholdingRate) : null,
          withholdingAgencyName: withholdingAgency.trim() || null,
          iaeWaiverSubmissionDate: iaeWaiverSubmissionDate.trim() || null,
          iaeWaiverAppNumber: iaeWaiverAppNumber.trim() || null,
        });
      }
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await qc.invalidateQueries({ queryKey: ['engagements', 'finance-lookups'] });
    },
    onSuccess: () => { clearWithholdingEdited(); addToast('Withholding tax saved.', 'success'); },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  // ── Settlement Files — separate save ─────────────────────────────────────────────
  const saveSettlementFilesMut = useMutation({
    mutationFn: async () => {
      const urlFields: [string, string][] = [
        ['Tour Settlement File link', tourSettlementFileSharePointLink],
        ['Venue Settlement File link', venueSettlementFileSharePointLink],
        ['Partner Settlement File link', partnerSettlementFileSharePointLink],
      ];
      for (const [label, val] of urlFields) {
        const t = val.trim();
        if (t && !isValidHttpOrHttpsUrl(t)) throw new Error(`${label} must be a valid http(s) URL or empty.`);
      }
      await updateEngagementFinance(engagementId, {
        venueSettlementFileSharePointLink: venueSettlementFileSharePointLink.trim() || null,
        partnerSettlementFileSharePointLink: partnerSettlementFileSharePointLink.trim() || null,
      });
      // Tour Settlement File via EngagementLink
      const tourSettleUrl = tourSettlementFileSharePointLink.trim();
      if (tourSettleUrl) {
        await upsertEngagementLink(engagementId, { linkUrl: tourSettleUrl, linkPurpose: 'TourSettlementFile' });
      } else {
        const existing = engagementLinks.find((el) => el.linkPurpose === 'TourSettlementFile');
        if (existing) await removeEngagementLink(engagementId, existing.engagementLinkId);
      }
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearSettlementFilesEdited(); addToast('Settlement files saved.', 'success'); },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });





  // Attraction Terms — separate save ─────────────────────────────────────────────
  const {
    hasUserEdited: hasAttrTermsEdited,
    markUserEdited: markAttrTermsEdited,
    clearUserEdited: clearAttrTermsEdited,
  } = useUserEditTracker(`attr-terms:${engagementId}`);

  // Deposit Terms — separate save ─────────────────────────────────────────────
  const {
    hasUserEdited: hasDepositEdited,
    markUserEdited: markDepositEdited,
    clearUserEdited: clearDepositEdited,
  } = useUserEditTracker(`deposit-terms:${engagementId}`);

  useEffect(() => {
    const d = depositTermsQuery.data;
    if (!d) return;
    setDepositAmount(d.depositAmount != null ? String(d.depositAmount) : '');
    setDepositDueDate(d.depositDueDate ?? '');
  }, [depositTermsQuery.data]);

  const saveDepositTermsMut = useMutation({
    mutationFn: async () => {
      const amt = parseOptionalDecimal(depositAmount, 'Deposit Amount');
      if (!amt.ok) throw new Error((amt as { ok: false; message: string }).message);
      await updateDepositTerms(engagementId, {
        depositAmount: (amt as { ok: true; value: number | null }).value,
        depositDueDate: depositDueDate.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'deposit-terms'] });
    },
    onSuccess: () => {
      clearDepositEdited();
      addToast('Deposit terms saved.', 'success');
    },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const saveAttrTermsMut = useMutation({
    mutationFn: async () => {
      // Validate URL fields
      const tourOfferUrl = attrTourOfferLink.trim();
      const fullyExecUrl = attrFullyExecutedContractLink.trim();
      if (tourOfferUrl && !isValidHttpOrHttpsUrl(tourOfferUrl)) {
        throw new Error('Tour Offer Link must be a valid http(s) URL or empty.');
      }
      if (fullyExecUrl && !isValidHttpOrHttpsUrl(fullyExecUrl)) {
        throw new Error('Fully Executed Contract Link must be a valid http(s) URL or empty.');
      }
      // Validate decimal fields
      const guarantee = parseOptionalDecimal(attrGuarantee, 'Guarantee');
      if (!guarantee.ok) throw new Error((guarantee as { ok: false; message: string }).message);
      const overage = parseOptionalDecimal(attrOveragePercent, 'Overage (%)');
      if (!overage.ok) throw new Error((overage as { ok: false; message: string }).message);
      const royalty = parseOptionalDecimal(attrRoyaltyPercent, 'Royalty (%)');
      if (!royalty.ok) throw new Error((royalty as { ok: false; message: string }).message);
      const middleMoney = parseOptionalDecimal(attrMiddleMoney, 'Middle Money');
      if (!middleMoney.ok) throw new Error((middleMoney as { ok: false; message: string }).message);
      const buyouts = parseOptionalDecimal(attrBuyouts, 'Buyouts');
      if (!buyouts.ok) throw new Error((buyouts as { ok: false; message: string }).message);

      await updateEngagementFinance(engagementId, {
        artistDealType: attrDealType.trim() || null,
        artistGuarantee: (guarantee as { ok: true; value: number | null }).value,
        overagePercent: (overage as { ok: true; value: number | null }).value,
        artistRoyaltyRatePercent: (royalty as { ok: true; value: number | null }).value,
        artistMiddleMoney: (middleMoney as { ok: true; value: number | null }).value,
        artistBuyouts: (buyouts as { ok: true; value: number | null }).value,
        artistPartOfCollateralizedDeal: yesNoToBool(attrCollateralizedDeal),
        artistTourOfferLink: tourOfferUrl || null,
        fullyExecutedAttractionContractSharePointLink: fullyExecUrl || null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => {
      clearAttrTermsEdited();
      addToast('Attraction terms saved.', 'success');
    },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const {
    hasUserEdited: hasVenueTermsEdited,
    markUserEdited: markVenueTermsEdited,
    clearUserEdited: clearVenueTermsEdited,
  } = useUserEditTracker(`venue-terms:${engagementId}`);

  const saveVenueTermsMut = useMutation({
    mutationFn: async () => {
      // Validate URLs
      const feUrl = venueTermsFullyExecutedLink.trim();
      const fcUrl = venueTermsForecastLink.trim();
      if (feUrl && !isValidHttpOrHttpsUrl(feUrl)) {
        throw new Error('Fully Executed Venue Contract link must be a valid http(s) URL or empty.');
      }
      if (fcUrl && !isValidHttpOrHttpsUrl(fcUrl)) {
        throw new Error('Venue Forecast link must be a valid http(s) URL or empty.');
      }

      // Save deal type via finance update
      await updateEngagementFinance(engagementId, {
        venueDealTypeId: venueTermsDealTypeId ? Number(venueTermsDealTypeId) : null,
      });

      // Save engagement links
      const linkPairs: [string, string][] = [
        ['fully executed', feUrl],
        ['VenueForcast', fcUrl],
      ];
      for (const [purpose, url] of linkPairs) {
        const existing = engagementLinks.find((el) => el.linkPurpose === purpose);
        if (url) {
          await upsertEngagementLink(engagementId, { linkUrl: url, linkPurpose: purpose });
        } else if (existing) {
          await removeEngagementLink(engagementId, existing.engagementLinkId);
        }
      }

      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => {
      clearVenueTermsEdited();
      addToast('Venue terms saved.', 'success');
    },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  // â”€â”€ Final Attraction Compensation — separate save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const {
    hasUserEdited: hasFinalCompEdited,
    markUserEdited: markFinalCompEdited,
    clearUserEdited: clearFinalCompEdited,
  } = useUserEditTracker(`final-comp:${engagementId}`);

  const saveFinalCompMut = useMutation({
    mutationFn: async () => {
      const specs: { raw: string; label: string; key: keyof UpdateEngagementFinancePayload }[] = [
        { raw: finalGuaranteeAmount, label: 'Guarantee Amount', key: 'finalGuaranteeAmount' },
        { raw: finalRoyaltyAmount, label: 'Royalty Amount', key: 'finalRoyaltyAmount' },
        { raw: finalOverageAmount, label: 'Overage Amount', key: 'finalOverageAmount' },
        { raw: finalBuyoutAmount, label: 'Buyouts', key: 'finalBuyoutAmount' },
        { raw: finalDirectCompanyCharges, label: 'Direct Company Charges', key: 'finalDirectCompanyCharges' },
        { raw: finalReimbursables, label: 'Reimbursibles', key: 'finalReimbursables' },
      ];
      const payload: Partial<UpdateEngagementFinancePayload> = {};
      for (const { raw, label, key } of specs) {
        const p = parseOptionalDecimal(raw, label);
        if (!p.ok) throw new Error((p as { ok: false; message: string }).message);
        (payload as any)[key] = (p as { ok: true; value: number | null }).value;
      }
      await updateEngagementFinance(engagementId, payload);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => {
      clearFinalCompEdited();
      addToast('Final attraction compensation saved.', 'success');
    },
    onError: (e: unknown) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const trimOrNull = (s: string, max: number): string | null => {
    const t = s.trim();
    if (t === '') return null;
    return t.slice(0, max);
  };

  const yesNoToBool = (v: string): boolean | null =>
    v === 'Yes' ? true : v === 'No' ? false : null;


  const settlementDirty = hasSettlementEdited;
  const settlementFilesDirty = hasSettlementFilesEdited;
  const salesTaxDirty = hasSalesTaxEdited;
  const withholdingDirty = hasWithholdingEdited;
  const attrTermsDirty = hasAttrTermsEdited;
  const venueTermsDirty = hasVenueTermsEdited;
  const finalCompDirty = hasFinalCompEdited;

  useEffect(() => {
    onDirtyChange?.(settlementDirty || settlementFilesDirty || salesTaxDirty || withholdingDirty || attrTermsDirty || venueTermsDirty || finalCompDirty);
    return () => onDirtyChange?.(false);
  }, [settlementDirty, settlementFilesDirty, salesTaxDirty, withholdingDirty, attrTermsDirty, venueTermsDirty, finalCompDirty, onDirtyChange]);

  const disabled = saveSettlementMut.isPending || saveSettlementFilesMut.isPending || saveSalesTaxMut.isPending || saveWithholdingMut.isPending || saveAttrTermsMut.isPending || saveVenueTermsMut.isPending || saveFinalCompMut.isPending || saveDepositTermsMut.isPending;
  const settlementSaveDisabled = disabled || !settlementDirty;
  const settlementFilesSaveDisabled = disabled || !settlementFilesDirty;
  const salesTaxSaveDisabled = disabled || !salesTaxDirty;
  const withholdingSaveDisabled = disabled || !withholdingDirty;
  const attrTermsSaveDisabled = disabled || !attrTermsDirty;
  const venueTermsSaveDisabled = disabled || !venueTermsDirty;
  const finalCompSaveDisabled = disabled || !finalCompDirty;

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-52 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1 sm:max-w-none">{control}</div>
    </div>
  );

  const moneyInput = (value: string, onChange: (v: string) => void, id: string) => (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-text-muted" aria-hidden>$</span>
      <input
        id={id}
        className={`${inputCls} pl-8`}
        inputMode="decimal"
        value={value}
        onChange={(e) => {
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

  const d = financeQuery.data;

  const sectionHeader = (title: string) => (
    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wide pt-2 pb-1 border-b border-border">{title}</h4>
  );

  const readOnlyField = (label: string, value: string | null | undefined) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-text-primary">{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {disabled && (
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
      <div className="space-y-6 p-5">

        {/* -- Settlement -- */}
        {sectionHeader('Settlement')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Artist settlement status',
            <Select2 options={SETTLEMENT_STATUS_OPTIONS} value={artistSettlementStatus}
              onChange={(v) => { markSettlementEdited(); setArtistSettlementStatus(v); }}
              placeholder="Select status..." disabled={disabled} />)}
          {fieldRow('Venue settlement status',
            <Select2 options={SETTLEMENT_STATUS_OPTIONS} value={venueSettlementStatus}
              onChange={(v) => { markSettlementEdited(); setVenueSettlementStatus(v); }}
              placeholder="Select status..." disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Subscription Sales Revenue Total',
            moneyInput(subscriptionSalesRevenueTotal, (v) => { markSettlementEdited(); setSubscriptionSalesRevenueTotal(v); }, 'eb-sub-rev'))}
          {fieldRow('Season Ticket Sales by IAE',
            moneyInput(seasonTicketSalesByIae, (v) => { markSettlementEdited(); setSeasonTicketSalesByIae(v); }, 'eb-season-iae'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Season Ticket Funds Transferred',
            moneyInput(seasonTicketFundsTransferred, (v) => { markSettlementEdited(); setSeasonTicketFundsTransferred(v); }, 'eb-season-transfer'))}
          {fieldRow('Artist Gross Taxable Compensation',
            moneyInput(artistGrossTaxableCompensation, (v) => { markSettlementEdited(); setArtistGrossTaxableCompensation(v); }, 'eb-artist-gross-tax'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Amount Due to Dept of Revenue',
            moneyInput(amountDueToDeptOfRevenue, (v) => { markSettlementEdited(); setAmountDueToDeptOfRevenue(v); }, 'eb-amt-dept-rev'))}
          {fieldRow('Net Box Office Funds Deposited (Account)',
            <input className={inputCls} value={netBoxOfficeFundsDepositedAccount} maxLength={255}
              onChange={(e) => { markSettlementEdited(); setNetBoxOfficeFundsDepositedAccount(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Check # / Confirmation of Withholding Payment',
            <input className={inputCls} value={checkNumberOrConfOfWithholdingPayment} maxLength={100}
              onChange={(e) => { markSettlementEdited(); setCheckNumberOrConfOfWithholdingPayment(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveSettlementMut.mutate()}
            disabled={settlementSaveDisabled}>
            {saveSettlementMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</span> : 'Save settlement'}
          </Button>
        </div>

        {/* ── IAE Event Business ────────────────────────────────────── */}
        {sectionHeader('IAE Event Business')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Event Business Manager',
            <span className="text-sm text-text-primary">
              {iaeContactsQuery.isLoading ? 'Loading…' :
                iaeEventBusinessManagers.length > 0
                  ? iaeEventBusinessManagers.map((c) => c.contactLabel).join(', ')
                  : <span className="text-text-muted italic">—</span>}
            </span>)}
          {fieldRow('Event Business Assistant Manager',
            <span className="text-sm text-text-primary">
              {iaeContactsQuery.isLoading ? 'Loading…' :
                iaeEventBusinessAssistantManagers.length > 0
                  ? iaeEventBusinessAssistantManagers.map((c) => c.contactLabel).join(', ')
                  : <span className="text-text-muted italic">—</span>}
            </span>)}
        </div>

        {/* ── Venue Settlement Manager ─────────────────────────────── */}
        {sectionHeader('Venue Settlement Manager')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Venue Settlement Manager',
            <span className="text-sm text-text-primary">
              {venueCompanyId == null ? <span className="text-text-muted italic">No venue assigned</span> :
                venueDetailsQuery.isLoading ? 'Loading…' :
                venueSettlementManagers.length > 0
                  ? venueSettlementManagers.map((m) => m.fullName).join(', ')
                  : <span className="text-text-muted italic">—</span>}
            </span>)}
        </div>

        {/* ── Settlement Files ─────────────────────────────────────── */}
        {sectionHeader('Settlement Files')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Tour Settlement File (SharePoint)',
            <input className={inputCls} value={tourSettlementFileSharePointLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markSettlementFilesEdited(); setTourSettlementFileSharePointLink(e.target.value); }}
              disabled={disabled} />)}
          {fieldRow('Venue Settlement File (SharePoint)',
            <input className={inputCls} value={venueSettlementFileSharePointLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markSettlementFilesEdited(); setVenueSettlementFileSharePointLink(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Partner Settlement File (SharePoint)',
            <input className={inputCls} value={partnerSettlementFileSharePointLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markSettlementFilesEdited(); setPartnerSettlementFileSharePointLink(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" className="bg-ems-accent text-white hover:opacity-90" onClick={() => {
            const urlFields: [string, string][] = [
              ['Tour Settlement File link', tourSettlementFileSharePointLink],
              ['Venue Settlement File link', venueSettlementFileSharePointLink],
              ['Partner Settlement File link', partnerSettlementFileSharePointLink],
            ];
            for (const [label, val] of urlFields) {
              const t = val.trim();
              if (t && !isValidHttpOrHttpsUrl(t)) { addToast(`${label} must be a valid http(s) URL or empty.`, 'error'); return; }
            }
            saveSettlementFilesMut.mutate({
              venueSettlementFileSharePointLink: trimOrNull(venueSettlementFileSharePointLink, 2048),
              partnerSettlementFileSharePointLink: trimOrNull(partnerSettlementFileSharePointLink, 2048),
            });
          }} disabled={settlementFilesSaveDisabled}>
            {saveSettlementFilesMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</span> : 'Save settlement files'}
          </Button>
        </div>

        {/* ── Attraction Terms ─────────────────────────────────────── */}
        {sectionHeader('Attraction Terms')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Deal Type',
            <Select2 options={BOOKING_ATTRACTION_DEAL_TYPE_OPTIONS} value={attrDealType}
              onChange={(v) => { markAttrTermsEdited(); setAttrDealType(v); }}
              disabled={disabled} />)}
          {fieldRow('Part of Collateralized Deal Structure?',
            <Select2 options={YES_NO_OPTIONS} value={attrCollateralizedDeal}
              onChange={(v) => { markAttrTermsEdited(); setAttrCollateralizedDeal(v); }}
              disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Guarantee ($)',
            moneyInput(attrGuarantee, (v) => { markAttrTermsEdited(); setAttrGuarantee(v); }, 'attr-guarantee'))}
          {fieldRow('Overage (%)',
            moneyInput(attrOveragePercent, (v) => { markAttrTermsEdited(); setAttrOveragePercent(v); }, 'attr-overage'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Royalty (%)',
            <input className={inputCls} inputMode="decimal" value={attrRoyaltyPercent}
              onChange={(e) => { markAttrTermsEdited(); setAttrRoyaltyPercent(e.target.value); }}
              disabled={disabled} />)}
          {fieldRow('Middle Money ($)',
            moneyInput(attrMiddleMoney, (v) => { markAttrTermsEdited(); setAttrMiddleMoney(v); }, 'attr-middle-money'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Buyouts ($)',
            moneyInput(attrBuyouts, (v) => { markAttrTermsEdited(); setAttrBuyouts(v); }, 'attr-buyouts'))}
          {fieldRow('Tour Offer Link',
            <input className={inputCls} value={attrTourOfferLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markAttrTermsEdited(); setAttrTourOfferLink(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Fully Executed Attraction Contract Link',
            <input className={inputCls} value={attrFullyExecutedContractLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markAttrTermsEdited(); setAttrFullyExecutedContractLink(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveAttrTermsMut.mutate()}
            disabled={attrTermsSaveDisabled}
          >
            {saveAttrTermsMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save attraction terms'
            )}
          </Button>
        </div>

        {/* ── Deposit Terms ────────────────────────────────────────── */}
        {sectionHeader('Deposit Terms')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Deposit Amount ($)',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${inputCls} pl-8`}
                inputMode="decimal"
                value={depositAmount}
                onChange={(e) => { markDepositEdited(); setDepositAmount(e.target.value); }}
                disabled={disabled}
              />
            </div>,
          )}
          {fieldRow('Deposit Due Date',
            <input
              type="date"
              className={inputCls}
              value={depositDueDate}
              onChange={(e) => { markDepositEdited(); setDepositDueDate(e.target.value); }}
              disabled={disabled}
            />,
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveDepositTermsMut.mutate()}
            disabled={disabled || !hasDepositEdited || saveDepositTermsMut.isPending}
          >
            {saveDepositTermsMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save deposit terms'
            )}
          </Button>
        </div>

        {/* ── Venue Terms ──────────────────────────────────────────── */}
        {sectionHeader('Venue Terms')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Deposit Amount Paid',
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
              <input
                className={`${inputCls} pl-8 bg-muted/40`}
                value={depositTermsQuery.data?.depositAmount != null ? String(depositTermsQuery.data.depositAmount) : ''}
                readOnly
                disabled
              />
            </div>,
          )}
          {fieldRow('Link to SharePoint of Fully Executed Venue Contract',
            <input className={inputCls} value={venueTermsFullyExecutedLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markVenueTermsEdited(); setVenueTermsFullyExecutedLink(e.target.value); }}
              disabled={disabled} />)}
          {fieldRow('Deal Type',
            <Select2 options={venueDealTypeOptions} value={venueTermsDealTypeId}
              onChange={(v) => { markVenueTermsEdited(); setVenueTermsDealTypeId(v); }}
              disabled={disabled} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Link to SharePoint Venue Forecast',
            <input className={inputCls} value={venueTermsForecastLink} maxLength={2048}
              placeholder="https://..."
              onChange={(e) => { markVenueTermsEdited(); setVenueTermsForecastLink(e.target.value); }}
              disabled={disabled} />)}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveVenueTermsMut.mutate()}
            disabled={venueTermsSaveDisabled}
          >
            {saveVenueTermsMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save venue terms'
            )}
          </Button>
        </div>

        {/* -- Sales Tax -- */}
        {sectionHeader('Sales Tax')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Sales Tax Remitted By',
            <Select2 options={SALES_TAX_REMITTED_BY_OPTIONS} value={salesTaxRemittedBy}
              onChange={(v) => { markSalesTaxEdited(); setSalesTaxRemittedBy(v); }}
              disabled={disabled} />)}
        </div>
        {(d?.isCanadaEngagement || (financeLookupsQuery.data?.nonResidentWithholdings ?? []).find((r) => r.id === d?.requiredNonResidentWithholdingId)?.canApplyForWaiver != null) && (
          <>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide pt-2">HST (Harmonized Sales Tax) - Canada</p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow('Was HST Remitted to IAE?',
                <Select2 options={YES_NO_OPTIONS} value={hstRemittedToIae}
                  onChange={(v) => { markSalesTaxEdited(); setHstRemittedToIae(v); if (v === 'No') setHstCollectedFromTicketSales(''); }}
                  disabled={disabled} />)}
              {hstRemittedToIae === 'Yes' && fieldRow('How much? ($)',
                moneyInput(hstCollectedFromTicketSales, (v) => { markSalesTaxEdited(); setHstCollectedFromTicketSales(v); }, 'eb-hst-ticket'))}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow('Was HST Paid to Attraction?',
                <Select2 options={YES_NO_OPTIONS} value={hstPaidToAttraction}
                  onChange={(v) => { markSalesTaxEdited(); setHstPaidToAttraction(v); if (v === 'No') setHstPaidOnTourPayments(''); }}
                  disabled={disabled} />)}
              {hstPaidToAttraction === 'Yes' && fieldRow('How much? ($)',
                moneyInput(hstPaidOnTourPayments, (v) => { markSalesTaxEdited(); setHstPaidOnTourPayments(v); }, 'eb-hst-tour'))}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {fieldRow('HST Paid on Show Expenses ($)',
                moneyInput(hstPaidOnShowExpenses, (v) => { markSalesTaxEdited(); setHstPaidOnShowExpenses(v); }, 'eb-hst-show'))}
              {fieldRow('HST Paid on Venue Expenses ($)',
                moneyInput(hstPaidOnVenueExpenses, (v) => { markSalesTaxEdited(); setHstPaidOnVenueExpenses(v); }, 'eb-hst-venue'))}
            </div>
          </>
        )}
        <div className="flex justify-end pt-2">
          <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveSalesTaxMut.mutate()}
            disabled={salesTaxSaveDisabled}>
            {saveSalesTaxMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</span> : 'Save sales tax'}
          </Button>
        </div>

        {/* -- Non-Resident Withholding Tax -- */}
        {sectionHeader('Non-Resident Withholding Tax')}
        {(() => {
          const wid = d?.requiredNonResidentWithholdingId;
          const wrow = wid != null ? (financeLookupsQuery.data?.nonResidentWithholdings ?? []).find((r) => r.id === wid) : undefined;
          // Show Canada fields if isCanadaEngagement flag is set OR if the NRW record indicates Canada
          const isCanada = d?.isCanadaEngagement || (wrow?.canApplyForWaiver != null);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-x-10">
                {fieldRow('Withholding Area',
                  <input className={inputCls} value={withholdingArea} readOnly disabled />)}
                {fieldRow('Withholding Rate (%)',
                  <input className={inputCls} value={withholdingRate} readOnly disabled />)}
                {fieldRow('Withholding Agency',
                  <input className={inputCls} value={withholdingAgency} readOnly disabled />)}
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Payee',
                  <input className={inputCls} value={withholdingPayee} readOnly disabled />)}
                {fieldRow('Payment Method',
                  <input className={inputCls} value={withholdingPaymentMethod} readOnly disabled />)}
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Form to Attraction Link',
                  <input className={inputCls} value={withholdingFormToAttractionLink} readOnly disabled />)}
                {fieldRow('Form to Municipality Link',
                  <input className={inputCls} value={withholdingFormToMunicipalityLink} readOnly disabled />)}
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('QuickBooks Number',
                  <input className={inputCls} value={withholdingQuickbooksNumber} readOnly disabled />)}
              </div>
              {isCanada && (
                <>
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide pt-2">Canada-Specific</p>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                    {fieldRow('Waiver',
                      <input className={inputCls} value={withholdingWaiver} readOnly disabled />)}
                    {fieldRow('Completed Waiver Link',
                      <input className={inputCls} value={withholdingCompletedWaiverLink} readOnly disabled />)}
                  </div>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                    {fieldRow('Tour Waiver Link',
                      <input className={inputCls} value={tourWaiverLink} readOnly disabled />)}
                  </div>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                    {fieldRow('IAE Waiver Submission Date',
                      <input className={inputCls} value={iaeWaiverSubmissionDate} readOnly disabled />)}
                    {fieldRow('IAE Waiver Application Number',
                      <input className={inputCls} value={iaeWaiverAppNumber} readOnly disabled />)}
                  </div>
                </>
              )}
              <div className="grid grid-cols-1">
                {fieldRow('Exceptions',
                  <textarea className={`${inputCls} min-h-[88px] resize-y`} value={withholdingExceptions}
                    readOnly disabled />)}
              </div>
            </div>
          );
        })()}

        {/* ── Compensation ─────────────────────────────────────────── */}
        {sectionHeader('Final Attraction Compensation')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Guarantee Amount ($)',
            moneyInput(finalGuaranteeAmount, (v) => { markFinalCompEdited(); setFinalGuaranteeAmount(v); }, 'eb-final-guarantee'))}
          {fieldRow('Royalty Amount ($)',
            moneyInput(finalRoyaltyAmount, (v) => { markFinalCompEdited(); setFinalRoyaltyAmount(v); }, 'eb-final-royalty'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Overage Amount ($)',
            moneyInput(finalOverageAmount, (v) => { markFinalCompEdited(); setFinalOverageAmount(v); }, 'eb-final-overage'))}
          {fieldRow('Buyouts ($)',
            moneyInput(finalBuyoutAmount, (v) => { markFinalCompEdited(); setFinalBuyoutAmount(v); }, 'eb-final-buyouts'))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Direct Company Charges ($)',
            moneyInput(finalDirectCompanyCharges, (v) => { markFinalCompEdited(); setFinalDirectCompanyCharges(v); }, 'eb-final-direct'))}
          {fieldRow('Reimbursibles ($)',
            moneyInput(finalReimbursables, (v) => { markFinalCompEdited(); setFinalReimbursables(v); }, 'eb-final-reimb'))}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveFinalCompMut.mutate()}
            disabled={finalCompSaveDisabled}
          >
            {saveFinalCompMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              'Save final compensation'
            )}
          </Button>
        </div>

        {/* ── Finance ──────────────────────────────────────────────── */}
        {sectionHeader('Finance')}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
          {fieldRow('Customer', <span className="text-sm text-text-primary">{d?.financeCustomer ?? '—'}</span>)}
          {fieldRow('Job', <span className="text-sm text-text-primary">{d?.financeJob ?? '—'}</span>)}
        </div>

        {/* ── Licensing / Royalties ─────────────────────────────────── */}
        {sectionHeader('Licensing / Royalties')}
        <div className="flex flex-wrap gap-3">
          {(['ASCAP', 'BMI', 'SESAC', 'GMR'] as const).map((org) => {
            const flag = org === 'ASCAP' ? d?.tourAscap : org === 'BMI' ? d?.tourBmi : org === 'SESAC' ? d?.tourSesac : d?.tourGmr;
            return (
              <span key={org} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                flag === true ? 'bg-green-100 text-green-800 ring-1 ring-green-300' :
                flag === false ? 'bg-gray-100 text-gray-400' :
                'bg-gray-100 text-gray-400'
              }`}>{org}</span>
            );
          })}
          {d?.tourAscap == null && d?.tourBmi == null && d?.tourSesac == null && d?.tourGmr == null && (
            <span className="text-sm text-text-muted">Licensing flags are set on the Tour record.</span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-1">Fee amounts are calculated from licensing rates — rate data is managed on the Tour record.</p>

        {/* ── RAMP ────────────────────────────────────────────────── */}
        {sectionHeader('RAMP')}
        <p className="text-sm text-text-muted">RAMP bills and reports will be shown here when available.</p>
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
  const [onSaleDate, setOnSaleDate] = useState('');
  const [preSaleDate, setPreSaleDate] = useState('');
  const [preSaleEndDate, setPreSaleEndDate] = useState('');
  const [preSaleRegistrationStartDate, setPreSaleRegistrationStartDate] = useState('');
  const [preSaleRegistrationEndDate, setPreSaleRegistrationEndDate] = useState('');
  const [grossMarketingBudget, setGrossMarketingBudget] = useState('');
  const [netMarketingBudget, setNetMarketingBudget] = useState('');
  const [salesRevenueGoal, setSalesRevenueGoal] = useState('');
  const [tourSplitPoint, setTourSplitPoint] = useState('');
  const [announcementDate, setAnnouncementDate] = useState('');
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
  const {
    hasUserEdited: hasMarketingBudgetUserEdited,
    markUserEdited: markMarketingBudgetUserEdited,
    clearUserEdited: clearMarketingBudgetUserEdited,
  } = useUserEditTracker(`marketing-budget:${engagementId}`);

  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const retailPartnersQuery = useQuery({
    queryKey: ['engagements', engagementId, 'retail-partners'],
    queryFn: () => fetchRetailPartners(engagementId),
    retry: 1,
  });

  const venueTabQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    retry: 1,
  });

  const marketingMetaQuery = useQuery({
    queryKey: ['engagements', engagementId, 'marketing-meta'],
    queryFn: () => fetchMarketingMeta(engagementId),
    staleTime: 60_000,
    retry: 1,
  });

  // ── IAE Marketing Team (read-only from EngagementIAEContact roles) ─────────────
  const iaeEngagementContactsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'iae-contacts'],
    queryFn: () => fetchEngagementIaeContacts(engagementId),
    staleTime: 60_000,
  });

  const iaeMarketingStaffByRole = useMemo(() => {
    const contacts = iaeEngagementContactsQuery.data ?? [];
    const roleMap: Record<string, typeof contacts> = {
      'Marketing Director': [],
      'Marketing Manager': [],
      'Marketing Coordinator': [],
    };
    const roleKeys = Object.keys(roleMap);
    for (const c of contacts) {
      const rn = (c.roleName ?? '').trim();
      if (!rn) continue;
      const matched = roleKeys.find((k) => k.toLowerCase() === rn.toLowerCase());
      if (matched) roleMap[matched].push(c);
    }
    return roleMap;
  }, [iaeEngagementContactsQuery.data]);

  // ── Tour Marketing Team (read-only from tour contacts) ─────────────────────
  const tourMarketingContacts = useMemo(() => {
    const contacts = marketingMetaQuery.data?.tourMarketingContacts ?? [];
    const entries: { role: string; names: string }[] = [];
    const directors = contacts.filter((c) => (c.roleName ?? '').toLowerCase() === 'marketing director').map((c) => c.contactName).filter(Boolean);
    const managers = contacts.filter((c) => (c.roleName ?? '').toLowerCase() === 'marketing manager').map((c) => c.contactName).filter(Boolean);
    if (directors.length) entries.push({ role: 'Marketing Director', names: directors.join(', ') });
    if (managers.length) entries.push({ role: 'Marketing Manager', names: managers.join(', ') });
    return entries;
  }, [marketingMetaQuery.data?.tourMarketingContacts]);

  const [newRetailPartnerCompanyId, setNewRetailPartnerCompanyId] = useState('');
  const [newRetailPartnerCompanyTypeId, setNewRetailPartnerCompanyTypeId] = useState('');
  const [newRetailPartnerContactId, setNewRetailPartnerContactId] = useState('');

  const companyTypesQuery = useQuery({
    queryKey: ['lookups', 'company-types'],
    queryFn: () => fetchLookups(),
    staleTime: 300_000,
    retry: 1,
  });

  const ticketingCompaniesQuery = useQuery({
    queryKey: ['companies', 'ticketing-systems'],
    queryFn: () => fetchCompanies(0, 10_000),
    staleTime: 60_000,
    retry: 1,
  });

  const retailPartnerCompanyContactsQuery = useQuery({
    queryKey: ['company-contacts', newRetailPartnerCompanyId],
    queryFn: () => fetchCompanyContacts(Number(newRetailPartnerCompanyId)),
    enabled: !!newRetailPartnerCompanyId && newRetailPartnerCompanyId !== '',
    staleTime: 60_000,
    retry: 1,
  });

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
    setPreSaleEndDate(d.preSaleEndDate ?? '');
    setPreSaleRegistrationStartDate(d.preSaleRegistrationStartDate ?? '');
    setPreSaleRegistrationEndDate(d.preSaleRegistrationEndDate ?? '');
    setVipPackagedOffer(d.vipPackagedOffer ?? '');
    setPreSaleSpecialPrices(d.preSaleSpecialPrices ?? '');
    setKidsTicketsPrices(d.kidsTicketsPrices ?? '');
    setTicketingLinkUrl(d.ticketingLinkUrl ?? '');
    setGrossTicketSales(numFieldToString(d.grossTicketSales));
    setTotalComps(intFieldToString(d.totalComps));
    setTotalTickets(intFieldToString(d.totalTickets));
    setTotalAdmissions(intFieldToString(d.totalAdmissions));
  }, [ticketingQuery.data, selectedPid]);

  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    setGrossMarketingBudget(numFieldToString(d.grossMarketingBudget));
    setNetMarketingBudget(numFieldToString(d.netMarketingBudget));
    setSalesRevenueGoal(numFieldToString(d.salesRevenueGoal));
    setTourSplitPoint(numFieldToString(d.tourSplitPoint));
    setAnnouncementDate(d.announcementDate ?? '');
  }, [financeQuery.data]);

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

  const saveBudgetMut = useMutation({
    mutationFn: async (body: UpdateEngagementFinancePayload) => {
      await updateEngagementFinance(engagementId, body);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => {
      clearMarketingBudgetUserEdited();
      setTimeout(() => {
        addToast('Marketing budget saved.', 'success');
      }, 0);
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const addRetailPartnerMut = useMutation({
    mutationFn: async (payload: CreateRetailPartnerPayload) => {
      await addRetailPartner(engagementId, payload);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'retail-partners'] });
    },
    onSuccess: () => {
      setNewRetailPartnerCompanyId('');
      setNewRetailPartnerCompanyTypeId('');
      setNewRetailPartnerContactId('');
      addToast('Retail partner added.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const removeRetailPartnerMut = useMutation({
    mutationFn: async (retailPartnerId: number) => {
      await deleteRetailPartner(engagementId, retailPartnerId);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'retail-partners'] });
    },
    onSuccess: () => addToast('Retail partner removed.', 'success'),
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
    if (!comps.ok) {
      addToast(comps.message, 'error');
      return;
    }
    if (comps.value != null && comps.value < 0) {
      addToast('Total comps cannot be negative.', 'error');
      return;
    }
    if (!tickets.ok) {
      addToast(tickets.message, 'error');
      return;
    }
    if (tickets.value != null && tickets.value < 0) {
      addToast('Total tickets cannot be negative.', 'error');
      return;
    }
    if (!admissions.ok) {
      addToast(admissions.message, 'error');
      return;
    }
    if (admissions.value != null && admissions.value < 0) {
      addToast('Total admissions cannot be negative.', 'error');
      return;
    }

    saveMut.mutate({
      ticketingStatus: ticketingStatus.trim() ? ticketingStatus.trim().slice(0, 50) : null,
      onSaleDate: onSaleDate.trim() === '' ? null : onSaleDate.trim(),
      preSaleDate: preSaleDate.trim() === '' ? null : preSaleDate.trim(),
      preSaleEndDate: preSaleEndDate.trim() === '' ? null : preSaleEndDate.trim(),
      preSaleRegistrationStartDate: preSaleRegistrationStartDate.trim() === '' ? null : preSaleRegistrationStartDate.trim(),
      preSaleRegistrationEndDate: preSaleRegistrationEndDate.trim() === '' ? null : preSaleRegistrationEndDate.trim(),
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

  const handleSaveMarketingBudget = () => {
    const gross = parseOptionalDecimal(grossMarketingBudget, 'Gross marketing budget');
    const net = parseOptionalDecimal(netMarketingBudget, 'Net marketing budget');
    const goal = parseOptionalDecimal(salesRevenueGoal, 'Sales revenue goal');
    const split = parseOptionalDecimal(tourSplitPoint, 'Tour split point');
    for (const x of [gross, net, goal, split]) {
      if (!x.ok) {
        addToast(x.message, 'error');
        return;
      }
    }
    saveBudgetMut.mutate({
      grossMarketingBudget: gross.value,
      netMarketingBudget: net.value,
      salesRevenueGoal: goal.value,
      tourSplitPoint: split.value,
      announcementDate: announcementDate.trim() === '' ? null : announcementDate.trim(),
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
      preSaleEndDate: preSaleEndDate.trim() === '' ? null : preSaleEndDate.trim(),
      preSaleRegistrationStartDate: preSaleRegistrationStartDate.trim() === '' ? null : preSaleRegistrationStartDate.trim(),
      preSaleRegistrationEndDate: preSaleRegistrationEndDate.trim() === '' ? null : preSaleRegistrationEndDate.trim(),
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
      preSaleEndDate: (d.preSaleEndDate ?? '').trim() === '' ? null : (d.preSaleEndDate ?? '').trim(),
      preSaleRegistrationStartDate: (d.preSaleRegistrationStartDate ?? '').trim() === '' ? null : (d.preSaleRegistrationStartDate ?? '').trim(),
      preSaleRegistrationEndDate: (d.preSaleRegistrationEndDate ?? '').trim() === '' ? null : (d.preSaleRegistrationEndDate ?? '').trim(),
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
    preSaleEndDate,
    preSaleRegistrationStartDate,
    preSaleRegistrationEndDate,
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

  const marketingBudgetDirtyRaw = useMemo(() => {
    const d = financeQuery.data;
    if (!d) return false;
    const gross = parseOptionalDecimal(grossMarketingBudget, 'Gross marketing budget');
    const net = parseOptionalDecimal(netMarketingBudget, 'Net marketing budget');
    const goal = parseOptionalDecimal(salesRevenueGoal, 'Sales revenue goal');
    if (!gross.ok || !net.ok || !goal.ok) return true;
    const split = parseOptionalDecimal(tourSplitPoint, 'Tour split point');
    if (!split.ok) return true;
    const cur = {
      grossMarketingBudget: gross.value,
      netMarketingBudget: net.value,
      salesRevenueGoal: goal.value,
      tourSplitPoint: split.value,
      announcementDate: announcementDate.trim() === '' ? null : announcementDate.trim(),
    };
    const base = {
      grossMarketingBudget: d.grossMarketingBudget ?? null,
      netMarketingBudget: d.netMarketingBudget ?? null,
      salesRevenueGoal: d.salesRevenueGoal ?? null,
      tourSplitPoint: d.tourSplitPoint ?? null,
      announcementDate: (d.announcementDate ?? '').trim() === '' ? null : (d.announcementDate ?? '').trim(),
    };
    return JSON.stringify(cur) !== JSON.stringify(base);
  }, [financeQuery.data, grossMarketingBudget, netMarketingBudget, salesRevenueGoal, tourSplitPoint, announcementDate]);
  const marketingBudgetDirty =
    hasMarketingBudgetUserEdited && marketingBudgetDirtyRaw;

  useEffect(() => {
    onDirtyChange?.(marketingFormDirty || marketingBudgetDirty);
    return () => onDirtyChange?.(false);
  }, [marketingBudgetDirty, marketingFormDirty, onDirtyChange]);

  const saveDisabled = saveMut.isPending || ticketingQuery.isLoading;
  const disabled = saveDisabled;
  const markTicketingUserEdited = markMarketingUserEdited;
  const marketingSaveDisabled = saveDisabled || !marketingFormDirty;
  const marketingBudgetSaveDisabled =
    saveBudgetMut.isPending || financeQuery.isLoading || !marketingBudgetDirty;

  // ── Venue Marketing Team (read-only from venue-details) ─────────────────
  const venueMktVenue = useMemo(
    () =>
      (venueTabQuery.data?.venues ?? []).find((v) => v.isPrimary) ??
      (venueTabQuery.data?.venues ?? [])[0] ??
      null,
    [venueTabQuery.data?.venues],
  );
  const venueMktCompanyId = venueMktVenue?.venueCompanyId ?? null;
  const venueMarketingContacts = useMemo(() => {
    if (venueMktCompanyId == null) return [];
    const rc = venueTabQuery.data?.venueRoleContacts?.[venueMktCompanyId];
    if (!rc) return [];
    const entries: { role: string; names: string }[] = [];
    const toNames = (list: { firstName: string; lastName: string }[]) =>
      list.map((c) => `${c.firstName} ${c.lastName}`.trim()).filter(Boolean);
    const directors = toNames(rc.marketingDirector ?? []);
    const managers = toNames(rc.marketingManager ?? []);
    const digitalManagers = toNames(rc.digitalMarketingManager ?? []);
    if (directors.length) entries.push({ role: 'Marketing Director', names: directors.join(', ') });
    if (managers.length) entries.push({ role: 'Marketing Manager', names: managers.join(', ') });
    if (digitalManagers.length) entries.push({ role: 'Digital Marketing Manager', names: digitalManagers.join(', ') });
    return entries;
  }, [venueTabQuery.data?.venueRoleContacts, venueMktCompanyId]);

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

        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Marketing Budget</h4>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
            {fieldRow(
              'Gross Marketing Budget',
              moneyInput(grossMarketingBudget, (next) => {
                markMarketingBudgetUserEdited();
                setGrossMarketingBudget(next);
              }, 'mkt-gross-budget'),
            )}
            {fieldRow(
              'Net Marketing Budget',
              moneyInput(netMarketingBudget, (next) => {
                markMarketingBudgetUserEdited();
                setNetMarketingBudget(next);
              }, 'mkt-net-budget'),
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10 mt-1">
            {fieldRow(
              'Sales Revenue Goal',
              moneyInput(salesRevenueGoal, (next) => {
                markMarketingBudgetUserEdited();
                setSalesRevenueGoal(next);
              }, 'mkt-sales-goal'),
            )}
            {fieldRow(
              'Engagement Tour Split Point ($)',
              moneyInput(tourSplitPoint, (next) => {
                markMarketingBudgetUserEdited();
                setTourSplitPoint(next);
              }, 'mkt-tour-split'),
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10 mt-1">
            {fieldRow(
              'Announcement Date',
              <input
                id="mkt-announcement-date"
                type="date"
                className={inputCls}
                value={announcementDate}
                onChange={(e) => {
                  markMarketingBudgetUserEdited();
                  setAnnouncementDate(e.target.value);
                }}
                disabled={saveBudgetMut.isPending || financeQuery.isLoading}
              />,
            )}
          </div>
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Button
              type="button"
              className="bg-ems-accent text-white hover:opacity-90"
              onClick={handleSaveMarketingBudget}
              disabled={marketingBudgetSaveDisabled}
            >
              {saveBudgetMut.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save budget'
              )}
            </Button>
          </div>
        </div>

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

            {/* ── On Sale Dates ── */}
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">On Sale Dates</h4>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow(
                  'Presale Start Date',
                  <input
                    id="mkt-presale-start"
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
                {fieldRow(
                  'PreSale End Date',
                  <input
                    id="mkt-presale-end"
                    type="date"
                    className={inputCls}
                    value={preSaleEndDate}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setPreSaleEndDate(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10 mt-1">
                {fieldRow(
                  'Public On Sale Start Date',
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
              </div>
            </div>

            {/* ── Lead Generation ── */}
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Lead Generation</h4>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow(
                  'Presale Registration Start Date',
                  <input
                    id="mkt-presale-reg-start"
                    type="date"
                    className={inputCls}
                    value={preSaleRegistrationStartDate}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setPreSaleRegistrationStartDate(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
                {fieldRow(
                  'PreSale Registration End Date',
                  <input
                    id="mkt-presale-reg-end"
                    type="date"
                    className={inputCls}
                    value={preSaleRegistrationEndDate}
                    onChange={(e) => {
                      markMarketingUserEdited();
                      setPreSaleRegistrationEndDate(e.target.value);
                    }}
                    disabled={saveDisabled}
                  />,
                )}
              </div>
            </div>

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

        {/* ── IAE Marketing Team (read-only from EngagementIAEContact roles) ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">IAE Marketing Team</h4>
          {iaeEngagementContactsQuery.isLoading && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Loading…
            </div>
          )}
          {iaeEngagementContactsQuery.isError && (
            <div className="text-ems-coral text-sm">{friendlyApiError(iaeEngagementContactsQuery.error)}</div>
          )}
          {!iaeEngagementContactsQuery.isLoading && !iaeEngagementContactsQuery.isError && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-10">
              {(['Marketing Director', 'Marketing Manager', 'Marketing Coordinator'] as const).map((role) => (
                <React.Fragment key={role}>
                  {fieldRow(
                    role,
                    (iaeMarketingStaffByRole[role] ?? []).length > 0 ? (
                      <div className="space-y-1">
                        {(iaeMarketingStaffByRole[role] ?? []).map((c) => (
                          <p key={c.engagementIaeContactId} className="text-sm text-text-primary">
                            {c.contactLabel}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">—</p>
                    ),
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* ── Retail Partnerships ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Retail Partnerships</h4>

          {retailPartnersQuery.isLoading && (
            <div className="flex items-center gap-2 text-text-muted text-sm mb-3">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Loading…
            </div>
          )}
          {retailPartnersQuery.isError && (
            <div className="text-ems-coral text-sm mb-3">{friendlyApiError(retailPartnersQuery.error)}</div>
          )}

          {!retailPartnersQuery.isLoading && (retailPartnersQuery.data ?? []).length > 0 && (
            <div className="mb-4 divide-y divide-border rounded-md border border-border">
              {(retailPartnersQuery.data ?? []).map((rp) => (
                <div key={rp.retailPartnerId} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-text-primary">{rp.companyName ?? '—'}</span>
                    {rp.companyTypeName && (
                      <span className="ml-2 text-xs text-text-muted">[{rp.companyTypeName}]</span>
                    )}
                    {rp.contactName && (
                      <span className="ml-2 text-xs text-text-muted">· {rp.contactName}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ml-3 shrink-0 rounded p-1 text-text-muted hover:text-ems-coral"
                    onClick={() => removeRetailPartnerMut.mutate(rp.retailPartnerId)}
                    disabled={removeRetailPartnerMut.isPending}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Add Retail Partner</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fieldRow(
                'Company Type',
                <Select2
                  options={[
                    { value: '', label: 'Select type…' },
                    ...((companyTypesQuery.data?.companyTypes ?? []).map((ct) => ({ value: String(ct.companyTypeId), label: ct.companyTypeName }))),
                  ]}
                  value={newRetailPartnerCompanyTypeId}
                  onChange={(v) => {
                    setNewRetailPartnerCompanyTypeId(v);
                    setNewRetailPartnerCompanyId('');
                    setNewRetailPartnerContactId('');
                  }}
                  placeholder="Select type…"
                  allowClear
                />,
              )}
              {fieldRow(
                'Company',
                <Select2
                  options={[{ value: '', label: newRetailPartnerCompanyTypeId ? 'Select company…' : 'Select type first…' }, ...(ticketingCompaniesQuery.data?.data ?? []).filter((c) => !newRetailPartnerCompanyTypeId || (c.companyTypeIds ?? []).includes(Number(newRetailPartnerCompanyTypeId))).map(companyToSelect2Option)]}
                  value={newRetailPartnerCompanyId}
                  onChange={(v) => {
                    setNewRetailPartnerCompanyId(v);
                    setNewRetailPartnerContactId('');
                  }}
                  placeholder={newRetailPartnerCompanyTypeId ? 'Select company…' : 'Select type first…'}
                  disabled={!newRetailPartnerCompanyTypeId}
                  allowClear
                />,
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fieldRow(
                'Contact',
                <Select2
                  options={[
                    { value: '', label: 'Not set' },
                    ...(retailPartnerCompanyContactsQuery.data ?? []).map((c) => ({
                      value: String(c.contactId),
                      label: `${c.firstName} ${c.lastName}`.trim() || c.contactId.toString(),
                    })),
                  ]}
                  value={newRetailPartnerContactId}
                  onChange={setNewRetailPartnerContactId}
                  placeholder={newRetailPartnerCompanyId ? 'Select contact…' : 'Select company first…'}
                  disabled={!newRetailPartnerCompanyId}
                  allowClear
                />,
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="bg-ems-accent text-white hover:opacity-90"
                disabled={!newRetailPartnerCompanyId || addRetailPartnerMut.isPending}
                onClick={() => {
                  if (!newRetailPartnerCompanyId) return;
                  addRetailPartnerMut.mutate({
                    companyId: Number(newRetailPartnerCompanyId),
                    companyTypeId: newRetailPartnerCompanyTypeId ? Number(newRetailPartnerCompanyTypeId) : null,
                    contactId: newRetailPartnerContactId ? Number(newRetailPartnerContactId) : null,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* ── Media Mix ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">Media Mix</h4>
          <p className="text-xs font-semibold text-text-secondary mb-2">Advertising Outlet — Company Types &amp; Sub-types</p>

          {marketingMetaQuery.isLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Loading…
            </div>
          ) : marketingMetaQuery.isError ? (
            <div className="text-ems-coral text-sm">{friendlyApiError(marketingMetaQuery.error)}</div>
          ) : (marketingMetaQuery.data?.mediaMix ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">No media mix on file for this tour.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                (marketingMetaQuery.data?.mediaMix ?? []).reduce<Record<string, typeof marketingMetaQuery.data.mediaMix>>((acc, item) => {
                  const key = item.parentCategory ?? 'Other';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {}),
              ).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">{category}</p>
                  <div className="space-y-1 pl-2">
                    {items.map((item) => (
                      <div key={item.tourMediaMixId} className="flex items-baseline gap-2 text-sm">
                        <span className="text-text-primary">{item.subTypeName}</span>
                        {item.companyName && (
                          <span className="text-text-muted text-xs">— {item.companyName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Venue Marketing Team (read-only, from venue company profile) ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-text-primary">Venue Marketing Team</h4>
            {venueMktVenue?.venueCompanyName && (
              <span className="text-xs text-text-muted">{venueMktVenue.venueCompanyName}</span>
            )}
          </div>
          {venueMktCompanyId == null ? (
            <p className="text-sm text-text-muted">No venue is linked to this engagement.</p>
          ) : venueTabQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading venue contacts…
            </div>
          ) : venueMarketingContacts.length === 0 ? (
            <p className="text-sm text-text-muted">No marketing contacts set on this venue.</p>
          ) : (
            <div className="space-y-1">
              {venueMarketingContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted min-w-[220px]">{c.role}:</span>
                  <span className="text-text-primary">{c.names}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted">Managed in the venue's company profile.</p>
        </div>

        {/* ── Tour Marketing Team (read-only from tour contacts) ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text-primary">Tour Marketing Team</h4>
          {marketingMetaQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : tourMarketingContacts.length === 0 ? (
            <p className="text-sm text-text-muted">No marketing contacts assigned to this tour.</p>
          ) : (
            <div className="space-y-1">
              {tourMarketingContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted min-w-[220px]">{c.role}:</span>
                  <span className="text-text-primary">{c.names}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted">Managed in the tour's talent agency company contacts.</p>
        </div>

        {/* ── Tour Audience Demographic (read-only from dbo.Tour + TourAudienceAgeRange) ── */}
        <div className="rounded-lg border border-border bg-surface/40 p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Tour Audience Demographic</h4>
          {!marketingMetaQuery.isLoading && !marketingMetaQuery.isError && (
            <div className="space-y-3">
              {/* General Demographics (gender) */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">General Demographics</p>
                {marketingMetaQuery.data?.audienceGender ? (
                  <span className="rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-medium text-text-primary">
                    {marketingMetaQuery.data.audienceGender}
                  </span>
                ) : (
                  <p className="text-sm text-text-muted">No gender demographic on file.</p>
                )}
              </div>
              {/* Age Range */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Age Range</p>
                {(marketingMetaQuery.data?.tourAudienceDemographics ?? []).length === 0 ? (
                  <p className="text-sm text-text-muted">No age range demographics on file.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[...(marketingMetaQuery.data?.tourAudienceDemographics ?? [])]
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((d, i) => (
                        <span
                          key={d.ageRangeId ?? i}
                          className="rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-medium text-text-primary"
                        >
                          {d.ageRangeLabel}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EngagementTicketingPanel({
  engagementId,
  engagementScaling,
  addToast,
  onDirtyChange,
}: {
  engagementId: number;
  engagementScaling: string | null;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
    retry: 1,
  });
  const companiesQuery = useQuery({
    queryKey: ['companies', 'ticketing-systems'],
    queryFn: () => fetchCompanies(0, 10_000),
    staleTime: 60_000,
    retry: 1,
  });
  const iaeContactsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'iae-contacts'],
    queryFn: () => fetchEngagementIaeContacts(engagementId),
    retry: 1,
  });
  const venueTabQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    retry: 1,
  });

  const ticketingSummaryQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances-ticketing-summary'],
    queryFn: () => fetchPerformancesWithTicketingSummary(engagementId),
    retry: 1,
  });

  // ── State: per-performance ticketing ─────────────────────────────────
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [sellableCapacity, setSellableCapacity] = useState('');
  const [grossPotentialRevenue, setGrossPotentialRevenue] = useState('');
  const [ticketingSystemCompanyId, setTicketingSystemCompanyId] = useState('');
  const [ticketingAdministrator, setTicketingAdministrator] = useState('');
  const [ticketingAdminContactId, setTicketingAdminContactId] = useState('');
  const [ticketingAdminCompanyId, setTicketingAdminCompanyId] = useState('');
  const [boxOfficeLaborStaffingRequired, setBoxOfficeLaborStaffingRequired] = useState('');
  const [isIAETMDeal, setIsIAETMDeal] = useState('');
  const [ticketingLinkUrl, setTicketingLinkUrl] = useState('');
  const [publicSaleLinkUrl, setPublicSaleLinkUrl] = useState('');
  const [preSaleDate, setPreSaleDate] = useState('');
  const [preSaleEndDate, setPreSaleEndDate] = useState('');
  const [preSaleRegistrationStartDate, setPreSaleRegistrationStartDate] = useState('');
  const [preSaleRegistrationEndDate, setPreSaleRegistrationEndDate] = useState('');
  const [presalePassword, setPresalePassword] = useState('');
  const [presalePasswordDateStart, setPresalePasswordDateStart] = useState('');
  const [presalePasswordDateEnd, setPresalePasswordDateEnd] = useState('');
  const [presaleSpecialPricePassword, setPresaleSpecialPricePassword] = useState('');
  const [presaleSpecialPricePasswordDateStart, setPresaleSpecialPricePasswordDateStart] = useState('');
  const [presaleSpecialPricePasswordDateEnd, setPresaleSpecialPricePasswordDateEnd] = useState('');
  const [presaleSpecialPriceDiscountType, setPresaleSpecialPriceDiscountType] = useState('');
  const [presaleSpecialPriceDiscountAmount, setPresaleSpecialPriceDiscountAmount] = useState('');
  const [publicSaleSpecialPricePassword, setPublicSaleSpecialPricePassword] = useState('');
  const [publicSaleSpecialPricePasswordDateStart, setPublicSaleSpecialPricePasswordDateStart] = useState('');
  const [publicSaleSpecialPricePasswordDateEnd, setPublicSaleSpecialPricePasswordDateEnd] = useState('');
  const [publicSaleSpecialPriceDiscountType, setPublicSaleSpecialPriceDiscountType] = useState('');
  const [publicSaleSpecialPriceDiscountAmount, setPublicSaleSpecialPriceDiscountAmount] = useState('');
  const [selectedPasswordType, setSelectedPasswordType] = useState<'' | 'PreSale' | 'PreSaleSpecialPrice' | 'PublicSaleSpecialPrice'>('');
  const [showPassword, setShowPassword] = useState(false);
  const [vipPackageOffered, setVipPackageOffered] = useState('');
  const [vipPackageName, setVipPackageName] = useState('');
  const [vipPackageBenefits, setVipPackageBenefits] = useState<string[]>([]);
  const [compTicketRequestLink, setCompTicketRequestLink] = useState('');
  const [facilityFeeType, setFacilityFeeType] = useState('');
  const [facilityFeeAmount, setFacilityFeeAmount] = useState('');
  const [dynamicPricingMode, setDynamicPricingMode] = useState('');
  const [rebateAmount, setRebateAmount] = useState('');
  const [bumpAmount, setBumpAmount] = useState('');
  const [creditCardFeesType, setCreditCardFeesType] = useState('');
  const [creditCardFeesAmountPercent, setCreditCardFeesAmountPercent] = useState('');
  const [salesTaxType, setSalesTaxType] = useState('');
  const [salesTaxAmountPercent, setSalesTaxAmountPercent] = useState('');
  const [kidsTicketsPrices, setKidsTicketsPrices] = useState('');
  const [scalingLocal, setScalingLocal] = useState(engagementScaling ?? '');

  const {
    hasUserEdited: hasTicketingUserEdited,
    markUserEdited: markTicketingUserEdited,
    clearUserEdited: clearTicketingUserEdited,
  } = useUserEditTracker(`ticketing:${engagementId}:${selectedPid ?? ''}`);

  // ── Derived options ───────────────────────────────────────────────────
  const performanceSelectOptions = useMemo<Select2Option[]>(
    () =>
      (performancesQuery.data ?? []).map((p) => ({
        value: String(p.performanceId),
        label: `${formatPerformanceDateDisplay(p.performanceDate)} · ${formatPerformanceTimeDisplay(p.performanceTime)} · ${p.performanceStatus}`,
      })),
    [performancesQuery.data],
  );

  const ticketingSystemCompanyOptions = useMemo<Select2Option[]>(() => {
    const rows = companiesQuery.data?.data ?? [];
    const filtered = rows.filter((company) => {
      const names = [company.companyTypeName, ...(company.companyTypeNames ?? [])]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return names.some((x) => x.includes('ticketing system'));
    });
    const opts = filtered.map(companyToSelect2Option);
    return [{ value: '', label: 'Not set' }, ...opts];
  }, [companiesQuery.data?.data]);

  const ticketingAdminCompanyContactsQuery = useQuery({
    queryKey: ['company-contacts', Number(ticketingSystemCompanyId), 'ticketing-admin'],
    queryFn: () => fetchCompanyContacts(Number(ticketingSystemCompanyId), { roleName: 'Ticketing Administrator' }),
    enabled: !!ticketingSystemCompanyId && ticketingSystemCompanyId !== '',
    staleTime: 60_000,
    retry: 1,
  });

  const ticketingAdminContactOptions = useMemo<Select2Option[]>(() => {
    const rows = ticketingAdminCompanyContactsQuery.data ?? [];
    return [
      { value: '', label: 'Not set' },
      ...rows.map((c) => ({
        value: String(c.contactId),
        label: `${c.firstName} ${c.lastName}`.trim() || String(c.contactId),
      })),
    ];
  }, [ticketingAdminCompanyContactsQuery.data]);

  const seatingChartLinks = useMemo(() => {
    return (venueTabQuery.data?.venues ?? [])
      .filter((v) => v.seatingChartLinkUrl)
      .map((v) => ({ name: v.venueCompanyName ?? 'Venue', url: v.seatingChartLinkUrl! }));
  }, [venueTabQuery.data?.venues]);

  const ticketingPrimaryVenue = useMemo(() => {
    const venues = venueTabQuery.data?.venues ?? [];
    return venues.find((v) => v.isPrimary) ?? venues[0] ?? null;
  }, [venueTabQuery.data?.venues]);

  const ticketingVenueProfileQuery = useQuery({
    queryKey: ['companies', ticketingPrimaryVenue?.venueCompanyId, 'venue-profile'],
    queryFn: () => fetchVenueProfile(ticketingPrimaryVenue!.venueCompanyId),
    enabled: ticketingPrimaryVenue != null,
    staleTime: 60_000,
  });

  const ticketingSeatingCapacity = useMemo(() => {
    const d = ticketingVenueProfileQuery.data;
    return d && d.missing === false ? d.seatingCapacity : 0;
  }, [ticketingVenueProfileQuery.data]);

  // ── Auto-select first performance ─────────────────────────────────────
  useEffect(() => {
    const list = performancesQuery.data;
    if (!list?.length) { setSelectedPid(null); return; }
    setSelectedPid((prev) => {
      if (prev != null && list.some((p) => p.performanceId === prev)) return prev;
      return list[0]!.performanceId;
    });
  }, [performancesQuery.data]);

  // ── Per-performance ticketing query ──────────────────────────────────
  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid] as const,
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, selectedPid!),
    enabled: selectedPid != null && selectedPid > 0,
    retry: 1,
  });

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return;
    setSellableCapacity(d.sellableCapacity == null ? '' : String(d.sellableCapacity));
    setGrossPotentialRevenue(numFieldToString(d.grossPotentialRevenue));
    setTicketingSystemCompanyId(d.ticketingSystemCompanyId == null ? '' : String(d.ticketingSystemCompanyId));
    setTicketingAdministrator(d.ticketingAdministrator ?? '');
    setTicketingAdminContactId(d.ticketingAdminContactId == null ? '' : String(d.ticketingAdminContactId));
    setTicketingAdminCompanyId(d.ticketingAdminCompanyId == null ? '' : String(d.ticketingAdminCompanyId));
    setBoxOfficeLaborStaffingRequired(d.boxOfficeLaborStaffingRequired == null ? '' : d.boxOfficeLaborStaffingRequired ? 'Yes' : 'No');
    setIsIAETMDeal(d.isIAETMDeal == null ? '' : d.isIAETMDeal ? 'Yes' : 'No');
    setTicketingLinkUrl(d.ticketingLinkUrl ?? '');
    setPublicSaleLinkUrl(d.publicSaleLinkUrl ?? '');
    setPreSaleDate(d.preSaleDate ?? '');
    setPreSaleEndDate(d.preSaleEndDate ?? '');
    setPreSaleRegistrationStartDate(d.preSaleRegistrationStartDate ?? '');
    setPreSaleRegistrationEndDate(d.preSaleRegistrationEndDate ?? '');
    setPresalePassword(d.presalePassword ?? '');
    setPresalePasswordDateStart(d.presalePasswordDateStart ?? '');
    setPresalePasswordDateEnd(d.presalePasswordDateEnd ?? '');
    setPresaleSpecialPricePassword(d.presaleSpecialPricePassword ?? '');
    setPresaleSpecialPricePasswordDateStart(d.presaleSpecialPricePasswordDateStart ?? '');
    setPresaleSpecialPricePasswordDateEnd(d.presaleSpecialPricePasswordDateEnd ?? '');
    setPresaleSpecialPriceDiscountType(d.presaleSpecialPriceDiscountType ?? '');
    setPresaleSpecialPriceDiscountAmount(numFieldToString(d.presaleSpecialPriceDiscountAmount));
    setPublicSaleSpecialPricePassword(d.publicSaleSpecialPricePassword ?? '');
    setPublicSaleSpecialPricePasswordDateStart(d.publicSaleSpecialPricePasswordDateStart ?? '');
    setPublicSaleSpecialPricePasswordDateEnd(d.publicSaleSpecialPricePasswordDateEnd ?? '');
    setPublicSaleSpecialPriceDiscountType(d.publicSaleSpecialPriceDiscountType ?? '');
    setPublicSaleSpecialPriceDiscountAmount(numFieldToString(d.publicSaleSpecialPriceDiscountAmount));
    setVipPackageOffered(d.vipPackageOffered == null ? '' : d.vipPackageOffered ? 'Yes' : 'No');
    setVipPackageName(d.vipPackageName ?? '');
    setVipPackageBenefits(d.vipPackageBenefits ?? []);
    setCompTicketRequestLink(d.compTicketRequestLink ?? '');
    setFacilityFeeType(d.facilityFeeType ?? '');
    setFacilityFeeAmount(numFieldToString(d.facilityFeeAmount));
    setDynamicPricingMode(d.dynamicPricingMode ?? '');
    setRebateAmount(numFieldToString(d.rebateAmount));
    setBumpAmount(numFieldToString(d.bumpAmount));
    setCreditCardFeesType(d.creditCardFeesType ?? '');
    setCreditCardFeesAmountPercent(numFieldToString(d.creditCardFeesAmountPercent));
    setSalesTaxType(d.salesTaxType ?? '');
    setSalesTaxAmountPercent(numFieldToString(d.salesTaxAmountPercent));
    setKidsTicketsPrices(d.kidsTicketsPrices ?? '');
    setScalingLocal(engagementScaling ?? '');
  }, [selectedPid, ticketingQuery.data, engagementScaling]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const parseOptionalWhole = (raw: string, label: string) => {
    const t = raw.trim();
    if (!t) return { ok: true as const, value: null as number | null };
    if (!/^\d+$/.test(t)) return { ok: false as const, message: `${label} must be a whole number.` };
    return { ok: true as const, value: Number(t) };
  };
  const parseOptionalPercent = (raw: string, label: string) => {
    const x = parseOptionalDecimal(raw, label);
    if (!x.ok) return x;
    if (x.value != null && (x.value < 0 || x.value > 100))
      return { ok: false as const, message: `${label} must be between 0 and 100.` };
    return x;
  };
  const boolStr = (s: string): boolean | null => s === 'Yes' ? true : s === 'No' ? false : null;

  // ── Dirty tracking per table ────────────────────────────────────────
  const ticketingMainDirty = useMemo(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const cur = JSON.stringify({
      sellableCapacity: parseOptionalWhole(sellableCapacity, '').value,
      grossPotentialRevenue: parseOptionalDecimal(grossPotentialRevenue, '').value,
      ticketingSystemCompanyId: fkIdStringToNumber(ticketingSystemCompanyId),
      ticketingAdministrator: ticketingAdministrator.trim() || null,
      ticketingAdminContactId: fkIdStringToNumber(ticketingAdminContactId),
      ticketingAdminCompanyId: fkIdStringToNumber(ticketingSystemCompanyId),
      boxOfficeLaborStaffingRequired: ticketingAdministrator === 'IAE Contract' ? boolStr(boxOfficeLaborStaffingRequired) : null,
      isIAETMDeal: boolStr(isIAETMDeal),
      ticketingLinkUrl: ticketingLinkUrl.trim() || null,
      publicSaleLinkUrl: publicSaleLinkUrl.trim() || null,
      preSaleDate: preSaleDate || null,
      preSaleEndDate: preSaleEndDate || null,
      preSaleRegistrationStartDate: preSaleRegistrationStartDate || null,
      preSaleRegistrationEndDate: preSaleRegistrationEndDate || null,
      facilityFeeType: facilityFeeType.trim() || null,
      facilityFeeAmount: parseOptionalDecimal(facilityFeeAmount, '').value,
      dynamicPricingMode: dynamicPricingMode.trim() || null,
      rebateAmount: parseOptionalDecimal(rebateAmount, '').value,
      bumpAmount: parseOptionalDecimal(bumpAmount, '').value,
      creditCardFeesType: creditCardFeesType.trim() || null,
      creditCardFeesAmountPercent: parseOptionalDecimal(creditCardFeesAmountPercent, '').value,
      kidsTicketsPrices: kidsTicketsPrices.trim() || null,
    });
    const base = JSON.stringify({
      sellableCapacity: d.sellableCapacity ?? null,
      grossPotentialRevenue: d.grossPotentialRevenue ?? null,
      ticketingSystemCompanyId: d.ticketingSystemCompanyId ?? null,
      ticketingAdministrator: (d.ticketingAdministrator ?? '').trim() || null,
      ticketingAdminContactId: d.ticketingAdminContactId ?? null,
      ticketingAdminCompanyId: d.ticketingSystemCompanyId ?? null,
      boxOfficeLaborStaffingRequired: d.ticketingAdministrator === 'IAE Contract' ? (d.boxOfficeLaborStaffingRequired ?? null) : null,
      isIAETMDeal: d.isIAETMDeal ?? null,
      ticketingLinkUrl: (d.ticketingLinkUrl ?? '').trim() || null,
      publicSaleLinkUrl: (d.publicSaleLinkUrl ?? '').trim() || null,
      preSaleDate: d.preSaleDate || null,
      preSaleEndDate: d.preSaleEndDate || null,
      preSaleRegistrationStartDate: d.preSaleRegistrationStartDate || null,
      preSaleRegistrationEndDate: d.preSaleRegistrationEndDate || null,
      facilityFeeType: (d.facilityFeeType ?? '').trim() || null,
      facilityFeeAmount: d.facilityFeeAmount ?? null,
      dynamicPricingMode: (d.dynamicPricingMode ?? '').trim() || null,
      rebateAmount: d.rebateAmount ?? null,
      bumpAmount: d.bumpAmount ?? null,
      creditCardFeesType: (d.creditCardFeesType ?? '').trim() || null,
      creditCardFeesAmountPercent: d.creditCardFeesAmountPercent ?? null,
      kidsTicketsPrices: (d.kidsTicketsPrices ?? '').trim() || null,
    });
    return cur !== base;
  }, [
    ticketingQuery.data, selectedPid,
    sellableCapacity, grossPotentialRevenue, ticketingSystemCompanyId,
    ticketingAdministrator, ticketingAdminContactId, ticketingAdminCompanyId,
    boxOfficeLaborStaffingRequired, isIAETMDeal,
    ticketingLinkUrl, publicSaleLinkUrl,
    preSaleDate, preSaleEndDate, preSaleRegistrationStartDate, preSaleRegistrationEndDate,
    facilityFeeType, facilityFeeAmount, dynamicPricingMode,
    rebateAmount, bumpAmount, creditCardFeesType, creditCardFeesAmountPercent,
    kidsTicketsPrices,
  ]);

  const promoPasswordDirty = useMemo(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const cur = JSON.stringify({
      presalePassword: presalePassword.trim() || null,
      presalePasswordDateStart: presalePasswordDateStart || null,
      presalePasswordDateEnd: presalePasswordDateEnd || null,
      presaleSpecialPricePassword: presaleSpecialPricePassword.trim() || null,
      presaleSpecialPricePasswordDateStart: presaleSpecialPricePasswordDateStart || null,
      presaleSpecialPricePasswordDateEnd: presaleSpecialPricePasswordDateEnd || null,
      presaleSpecialPriceDiscountType: presaleSpecialPriceDiscountType || null,
      presaleSpecialPriceDiscountAmount: parseOptionalDecimal(presaleSpecialPriceDiscountAmount, '').value,
      publicSaleSpecialPricePassword: publicSaleSpecialPricePassword.trim() || null,
      publicSaleSpecialPricePasswordDateStart: publicSaleSpecialPricePasswordDateStart || null,
      publicSaleSpecialPricePasswordDateEnd: publicSaleSpecialPricePasswordDateEnd || null,
      publicSaleSpecialPriceDiscountType: publicSaleSpecialPriceDiscountType || null,
      publicSaleSpecialPriceDiscountAmount: parseOptionalDecimal(publicSaleSpecialPriceDiscountAmount, '').value,
    });
    const base = JSON.stringify({
      presalePassword: (d.presalePassword ?? '').trim() || null,
      presalePasswordDateStart: d.presalePasswordDateStart || null,
      presalePasswordDateEnd: d.presalePasswordDateEnd || null,
      presaleSpecialPricePassword: (d.presaleSpecialPricePassword ?? '').trim() || null,
      presaleSpecialPricePasswordDateStart: d.presaleSpecialPricePasswordDateStart || null,
      presaleSpecialPricePasswordDateEnd: d.presaleSpecialPricePasswordDateEnd || null,
      presaleSpecialPriceDiscountType: d.presaleSpecialPriceDiscountType || null,
      presaleSpecialPriceDiscountAmount: d.presaleSpecialPriceDiscountAmount ?? null,
      publicSaleSpecialPricePassword: (d.publicSaleSpecialPricePassword ?? '').trim() || null,
      publicSaleSpecialPricePasswordDateStart: d.publicSaleSpecialPricePasswordDateStart || null,
      publicSaleSpecialPricePasswordDateEnd: d.publicSaleSpecialPricePasswordDateEnd || null,
      publicSaleSpecialPriceDiscountType: d.publicSaleSpecialPriceDiscountType || null,
      publicSaleSpecialPriceDiscountAmount: d.publicSaleSpecialPriceDiscountAmount ?? null,
    });
    return cur !== base;
  }, [
    ticketingQuery.data, selectedPid,
    presalePassword, presalePasswordDateStart, presalePasswordDateEnd,
    presaleSpecialPricePassword, presaleSpecialPricePasswordDateStart, presaleSpecialPricePasswordDateEnd,
    presaleSpecialPriceDiscountType, presaleSpecialPriceDiscountAmount,
    publicSaleSpecialPricePassword, publicSaleSpecialPricePasswordDateStart, publicSaleSpecialPricePasswordDateEnd,
    publicSaleSpecialPriceDiscountType, publicSaleSpecialPriceDiscountAmount,
  ]);

  const vipDirty = useMemo(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const cur = JSON.stringify({
      vipPackageOffered: boolStr(vipPackageOffered),
      vipPackageName: vipPackageName.trim() || null,
      vipPackageBenefits: [...vipPackageBenefits].sort(),
    });
    const base = JSON.stringify({
      vipPackageOffered: d.vipPackageOffered ?? null,
      vipPackageName: (d.vipPackageName ?? '').trim() || null,
      vipPackageBenefits: [...(d.vipPackageBenefits ?? [])].sort(),
    });
    return cur !== base;
  }, [ticketingQuery.data, selectedPid, vipPackageOffered, vipPackageName, vipPackageBenefits]);

  const salesTaxDirty = useMemo(() => {
    const d = ticketingQuery.data;
    if (!d || selectedPid == null || d.performanceId !== selectedPid) return false;
    const cur = JSON.stringify({
      salesTaxType: salesTaxType.trim() || null,
      salesTaxAmountPercent: salesTaxAmountPercent.trim() ? Number(salesTaxAmountPercent) : null,
    });
    const base = JSON.stringify({
      salesTaxType: (d.salesTaxType ?? '').trim() || null,
      salesTaxAmountPercent: d.salesTaxAmountPercent ?? null,
    });
    return cur !== base;
  }, [ticketingQuery.data, selectedPid, salesTaxType, salesTaxAmountPercent]);

  const scalingDirty = useMemo(() => {
    return (scalingLocal.trim() || null) !== ((engagementScaling ?? '').trim() || null);
  }, [scalingLocal, engagementScaling]);

  const anyDirty = hasTicketingUserEdited && (ticketingMainDirty || promoPasswordDirty || vipDirty || salesTaxDirty || scalingDirty);

  useEffect(() => {
    onDirtyChange?.(anyDirty);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, anyDirty]);

  // ── Save mutations (one per target table) ──────────────────────────
  const invalidateTicketing = async () => {
    await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performance-ticketing', selectedPid] });
    await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances-ticketing-summary'] });
  };

  const saveTicketingMainMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving.');
      const sc = parseOptionalWhole(sellableCapacity, 'Sellable capacity');
      const gpr = parseOptionalDecimal(grossPotentialRevenue, 'Gross potential revenue');
      const ffa = parseOptionalDecimal(facilityFeeAmount, 'Facility fee amount');
      const ra = parseOptionalDecimal(rebateAmount, 'Rebate amount');
      const ba = parseOptionalDecimal(bumpAmount, 'Bump amount');
      const ccf = parseOptionalPercent(creditCardFeesAmountPercent, 'Credit card fees (%)');
      for (const x of [sc, gpr, ffa, ra, ba, ccf]) {
        if (!x.ok) throw new Error(x.message);
      }
      const urlFields: [string, string][] = [
        ['Ticketing Link', ticketingLinkUrl],
        ['Public Sale Link', publicSaleLinkUrl],
      ];
      for (const [label, val] of urlFields) {
        if (!isValidHttpOrHttpsUrl(val)) {
          throw new Error(`${label} must be a valid http(s) URL, or left empty.`);
        }
      }
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        sellableCapacity: sc.value,
        grossPotentialRevenue: gpr.value,
        ticketingSystemCompanyId: fkIdStringToNumber(ticketingSystemCompanyId),
        ticketingAdministrator: ticketingAdministrator.trim() ? (ticketingAdministrator as 'Venue' | 'Partner' | 'IAE Contract') : null,
        ticketingAdminContactId: fkIdStringToNumber(ticketingAdminContactId),
        ticketingAdminCompanyId: fkIdStringToNumber(ticketingSystemCompanyId),
        boxOfficeLaborStaffingRequired: ticketingAdministrator === 'IAE Contract' ? boolStr(boxOfficeLaborStaffingRequired) : null,
        isIAETMDeal: boolStr(isIAETMDeal),
        ticketingLinkUrl: ticketingLinkUrl.trim() || null,
        publicSaleLinkUrl: publicSaleLinkUrl.trim() || null,
        preSaleDate: preSaleDate || null,
        preSaleEndDate: preSaleEndDate || null,
        preSaleRegistrationStartDate: preSaleRegistrationStartDate || null,
        preSaleRegistrationEndDate: preSaleRegistrationEndDate || null,
        facilityFeeType: facilityFeeType.trim() ? (facilityFeeType as 'Inside Face Value' | 'Outside Face Value') : null,
        facilityFeeAmount: ffa.value,
        dynamicPricingMode: dynamicPricingMode.trim() ? (dynamicPricingMode as 'Self Managed' | '3rd Party Managed') : null,
        rebateAmount: ra.value,
        bumpAmount: ba.value,
        creditCardFeesType: creditCardFeesType.trim() ? (creditCardFeesType as 'Inside Service Charge' | 'Budget Line Item') : null,
        creditCardFeesAmountPercent: ccf.value,
        kidsTicketsPrices: kidsTicketsPrices.trim() || null,
      });
    },
    onSuccess: async () => {
      await invalidateTicketing();
      addToast('Ticketing info saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const savePromoPasswordMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving.');
      const pspda = parseOptionalDecimal(presaleSpecialPriceDiscountAmount, 'Presale special price discount amount');
      const pubspda = parseOptionalDecimal(publicSaleSpecialPriceDiscountAmount, 'Public sale special price discount amount');
      for (const x of [pspda, pubspda]) {
        if (!x.ok) throw new Error(x.message);
      }
      if (!presalePassword.trim() && (presalePasswordDateStart || presalePasswordDateEnd)) {
        throw new Error('PreSale Password is required when date range is set.');
      }
      if (!presaleSpecialPricePassword.trim() && (presaleSpecialPricePasswordDateStart || presaleSpecialPricePasswordDateEnd || presaleSpecialPriceDiscountType || presaleSpecialPriceDiscountAmount.trim())) {
        throw new Error('PreSale Special Price Password is required when date range or discount is set.');
      }
      if (!publicSaleSpecialPricePassword.trim() && (publicSaleSpecialPricePasswordDateStart || publicSaleSpecialPricePasswordDateEnd || publicSaleSpecialPriceDiscountType || publicSaleSpecialPriceDiscountAmount.trim())) {
        throw new Error('Public Sale Special Price Password is required when date range or discount is set.');
      }
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        presalePassword: presalePassword.trim() || null,
        presalePasswordDateStart: presalePasswordDateStart || null,
        presalePasswordDateEnd: presalePasswordDateEnd || null,
        presaleSpecialPricePassword: presaleSpecialPricePassword.trim() || null,
        presaleSpecialPricePasswordDateStart: presaleSpecialPricePasswordDateStart || null,
        presaleSpecialPricePasswordDateEnd: presaleSpecialPricePasswordDateEnd || null,
        presaleSpecialPriceDiscountType: presaleSpecialPriceDiscountType || null,
        presaleSpecialPriceDiscountAmount: pspda.value,
        publicSaleSpecialPricePassword: publicSaleSpecialPricePassword.trim() || null,
        publicSaleSpecialPricePasswordDateStart: publicSaleSpecialPricePasswordDateStart || null,
        publicSaleSpecialPricePasswordDateEnd: publicSaleSpecialPricePasswordDateEnd || null,
        publicSaleSpecialPriceDiscountType: publicSaleSpecialPriceDiscountType || null,
        publicSaleSpecialPriceDiscountAmount: pubspda.value,
      });
    },
    onSuccess: async () => {
      await invalidateTicketing();
      addToast('Promotional passwords saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const saveVipMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving.');
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        vipPackageOffered: boolStr(vipPackageOffered),
        vipPackageName: vipPackageName.trim() || null,
        vipPackageBenefits: vipPackageBenefits.length ? vipPackageBenefits : null,
      });
    },
    onSuccess: async () => {
      await invalidateTicketing();
      addToast('VIP packages saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const saveSalesTaxMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving.');
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        salesTaxType: salesTaxType.trim() || null,
        salesTaxAmountPercent: salesTaxAmountPercent.trim() ? Number(salesTaxAmountPercent) : null,
      });
    },
    onSuccess: async () => {
      await invalidateTicketing();
      addToast('Sales tax saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  const saveScalingMut = useMutation({
    mutationFn: async () => {
      if (selectedPid == null) throw new Error('Add a show date before saving.');
      await updateEngagementPerformanceTicketing(engagementId, selectedPid, {
        engagementScaling: scalingLocal.trim() || null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      await invalidateTicketing();
      addToast('Scaling saved.', 'success');
    },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ── UI helpers ────────────────────────────────────────────────────────
  const anySaving = saveTicketingMainMut.isPending || savePromoPasswordMut.isPending || saveVipMut.isPending || saveSalesTaxMut.isPending || saveScalingMut.isPending;
  const disabled = anySaving;
  const loadError = performancesQuery.error ?? ticketingQuery.error ?? companiesQuery.error;

  const fieldRow = (label: string, control: React.ReactNode) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-6 min-w-0">
      <div className="text-sm font-medium text-text-primary shrink-0 sm:w-56 sm:pt-2.5">{label}</div>
      <div className="min-w-0 flex-1">{control}</div>
    </div>
  );

  const sectionHeader = (title: string) => (
    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wide border-b border-border pb-1">{title}</h4>
  );

  const toggleVipBenefit = (benefit: string) => {
    markTicketingUserEdited();
    setVipPackageBenefits((prev) =>
      prev.includes(benefit) ? prev.filter((b) => b !== benefit) : [...prev, benefit],
    );
  };

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
        Add at least one show date on the <strong className="text-text-primary">Performance Schedule</strong> tab to edit ticketing.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      {anySaving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]" aria-live="polite" aria-busy="true">
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-primary shadow-md">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-ems-accent" aria-hidden />
            Saving to database…
          </span>
        </div>
      )}
      <div className="space-y-6 p-5">
        <h3 className="text-base font-semibold text-text-primary">Ticketing</h3>

        {loadError && (
          <div className="flex flex-wrap items-center gap-2 text-ems-coral text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {friendlyApiError(loadError)}
          </div>
        )}

        {/* ── IAE TICKETING (engagement-level) ── */}
        <div className="space-y-4">
          {sectionHeader('IAE Ticketing')}
          {fieldRow('IAE Ticketing Manager',
            <div className="text-sm text-text-primary">
              {(() => {
                const managers = (iaeContactsQuery.data ?? []).filter(
                  (r) => (r.roleName ?? '').trim().toLowerCase() === 'ticketing manager',
                );
                if (iaeContactsQuery.isLoading) return <span className="text-text-muted">Loading…</span>;
                if (managers.length === 0) return <span className="text-text-muted">No Ticketing Managers assigned</span>;
                return (
                  <ul className="list-disc list-inside space-y-0.5">
                    {managers.map((m) => <li key={m.engagementIaeContactId}>{m.contactLabel}</li>)}
                  </ul>
                );
              })()}
            </div>,
          )}
        </div>

        {/* ── PERFORMANCE SCHEDULE SUMMARY ── */}
        <div className="space-y-3">
          {sectionHeader('Performance Schedule')}
          {ticketingSummaryQuery.isLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>
          ) : (ticketingSummaryQuery.data ?? []).length > 0 ? (
            <div className="overflow-x-auto rounded border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-text-muted">Date / Time</th>
                    <th className="px-3 py-2 text-left font-medium text-text-muted">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-text-muted">Sellable Cap.</th>
                    <th className="px-3 py-2 text-right font-medium text-text-muted">Gross Potential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(ticketingSummaryQuery.data as ApiPerformanceTicketingSummaryRow[]).map((row) => (
                    <tr
                      key={row.performanceId}
                    >
                      <td className="px-3 py-2 text-text-primary whitespace-nowrap">
                        {formatPerformanceDateDisplay(row.performanceDate)} · {formatPerformanceTimeDisplay(row.performanceTime)}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{row.performanceStatus}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{row.sellableCapacity != null ? row.sellableCapacity.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-right text-text-primary">{row.grossPotentialRevenue != null ? `$${row.grossPotentialRevenue.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* ── SEATING CHART (read-only from venue tab) ── */}
        {/* {seatingChartLinks.length > 0 && (
          <div className="space-y-2">
            {sectionHeader('Seating Chart')}
            {seatingChartLinks.map((item) => (
              <div key={item.url} className="flex items-center gap-2 text-sm">
                <span className="text-text-muted shrink-0">{item.name}:</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-ems-accent hover:underline break-all">{item.url}</a>
              </div>
            ))}
          </div>
        )} */}

        {/* ── SEATING CHART DIAGRAM ── */}
        {/* {ticketingPrimaryVenue && (
          <div className="space-y-2">
            {!seatingChartLinks.length && sectionHeader('Seating Chart')}
            <SeatingChartDiagram
              venueName={ticketingPrimaryVenue.venueName ?? ticketingPrimaryVenue.venueCompanyName}
              venueType={ticketingPrimaryVenue.venueTypeName}
              capacity={ticketingSeatingCapacity}
            />
          </div>
        )} */}

        {/* ── PER-PERFORMANCE FIELDS ── */}
        <div className="space-y-2">
          {sectionHeader('Show')}
          <Select2
            options={performanceSelectOptions}
            value={selectedPid == null ? '' : String(selectedPid)}
            onChange={(value) => setSelectedPid(fkIdStringToNumber(value))}
            placeholder="Select show…"
            disabled={disabled}
          />
        </div>

        {!ticketingQuery.isLoading && !ticketingQuery.isError && ticketingQuery.data && (
          <>
            {/* ── TICKETING SOFTWARE ── */}
            <div className="space-y-4">
              {sectionHeader('Ticketing Software')}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Ticketing System Company',
                  <Select2 options={ticketingSystemCompanyOptions} value={ticketingSystemCompanyId}
                    onChange={(v) => { markTicketingUserEdited(); setTicketingSystemCompanyId(v); setTicketingAdminContactId(''); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Ticketing Administrator',
                  <Select2 options={TICKETING_ADMIN_OPTIONS} value={ticketingAdministrator}
                    onChange={(v) => { markTicketingUserEdited(); setTicketingAdministrator(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Ticketing Administrator Contact',
                  <Select2 options={ticketingAdminContactOptions} value={ticketingAdminContactId}
                    onChange={(v) => { markTicketingUserEdited(); setTicketingAdminContactId(v); }}
                    placeholder="Select contact…" allowClear disabled={disabled || !ticketingSystemCompanyId} />,
                )}
              </div>
              {ticketingAdministrator === 'IAE Contract' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                  {fieldRow('Box Office Labor Staffing Required?',
                    <Select2 options={YES_NO_OPTIONS} value={boxOfficeLaborStaffingRequired}
                      onChange={(v) => { markTicketingUserEdited(); setBoxOfficeLaborStaffingRequired(v); }}
                      placeholder="Select…" allowClear disabled={disabled} />,
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('IAE TM Deal?',
                  <Select2 options={YES_NO_OPTIONS} value={isIAETMDeal}
                    onChange={(v) => { markTicketingUserEdited(); setIsIAETMDeal(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Sellable Capacity',
                  <input className={inputCls} inputMode="numeric" value={sellableCapacity}
                    onChange={(e) => { markTicketingUserEdited(); setSellableCapacity(e.target.value); }} disabled={disabled} />,
                )}
                {fieldRow('Gross Potential Revenue ($)',
                  <input className={inputCls} inputMode="decimal" value={grossPotentialRevenue}
                    onChange={(e) => { markTicketingUserEdited(); setGrossPotentialRevenue(e.target.value); }} disabled={disabled} />,
                )}
              </div>
            </div>

            {/* ── FEES ── */}
            <div className="space-y-4">
              {sectionHeader('Fees & Charges')}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Facility Fee Type',
                  <Select2 options={FACE_VALUE_TYPE_OPTIONS} value={facilityFeeType}
                    onChange={(v) => { markTicketingUserEdited(); setFacilityFeeType(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Facility Fee Amount ($)',
                  <input className={inputCls} inputMode="decimal" value={facilityFeeAmount}
                    onChange={(e) => { markTicketingUserEdited(); setFacilityFeeAmount(e.target.value); }} disabled={disabled} />,
                )}
                {fieldRow('Dynamic Pricing',
                  <Select2 options={DYNAMIC_PRICING_MODE_OPTIONS} value={dynamicPricingMode}
                    onChange={(v) => { markTicketingUserEdited(); setDynamicPricingMode(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Rebate Amount',
                  <input className={inputCls} inputMode="decimal" value={rebateAmount}
                    onChange={(e) => { markTicketingUserEdited(); setRebateAmount(e.target.value); }} disabled={disabled} />,
                )}
                {fieldRow('Bump Amount',
                  <input className={inputCls} inputMode="decimal" value={bumpAmount}
                    onChange={(e) => { markTicketingUserEdited(); setBumpAmount(e.target.value); }} disabled={disabled} />,
                )}
                {fieldRow('Credit Card Fees Type',
                  <Select2 options={FEE_TYPE_OPTIONS} value={creditCardFeesType}
                    onChange={(v) => { markTicketingUserEdited(); setCreditCardFeesType(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Credit Card Fees (%)',
                  <input className={inputCls} inputMode="decimal" value={creditCardFeesAmountPercent}
                    onChange={(e) => { markTicketingUserEdited(); setCreditCardFeesAmountPercent(e.target.value); }} disabled={disabled} />,
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {fieldRow('Kids Ticket Prices',
                  <textarea
                    className={`${inputCls} min-h-[80px] resize-y`}
                    value={kidsTicketsPrices}
                    onChange={(e) => { markTicketingUserEdited(); setKidsTicketsPrices(e.target.value); }}
                    disabled={disabled}
                  />,
                )}
              </div>
            </div>

            {/* ── PURCHASE LINKS ── */}
            <div className="space-y-4">
              {sectionHeader('Purchase Links')}
              <div className="grid grid-cols-1 gap-4">
                {fieldRow('Pre-Sale Ticketing Link',
                  <input className={inputCls} type="url" autoComplete="nope" placeholder="https://…" value={ticketingLinkUrl}
                    onChange={(e) => { markTicketingUserEdited(); setTicketingLinkUrl(e.target.value); }} disabled={disabled} />,
                )}
                {fieldRow('Public Sale Ticketing Link',
                  <input className={inputCls} type="url" autoComplete="nope" placeholder="https://…" value={publicSaleLinkUrl}
                    onChange={(e) => { markTicketingUserEdited(); setPublicSaleLinkUrl(e.target.value); }} disabled={disabled} />,
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
                  onClick={() => saveTicketingMainMut.mutate()}
                  disabled={disabled || !ticketingMainDirty}>
                  {saveTicketingMainMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : 'Save Ticketing Info'}
                </Button>
              </div>
            </div>

            {/* ── PROMOTIONAL PASSWORDS ── */}
            <div className="space-y-5">
              {sectionHeader('Promotional Passwords')}
              <div className="overflow-x-auto rounded border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Type <span className="text-red-500">*</span></th>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Password <span className="text-red-500">*</span></th>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Date Range Active (Start)</th>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Date Range Active (End)</th>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Discount Type</th>
                      <th className="px-3 py-2 text-left font-medium text-text-muted">Discount Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2">
                        <Select2 options={PASSWORD_TYPE_OPTIONS} value={selectedPasswordType}
                          onChange={(v) => setSelectedPasswordType(v as '' | 'PreSale' | 'PreSaleSpecialPrice' | 'PublicSaleSpecialPrice')}
                          placeholder="Select type…" disabled={disabled} />
                      </td>
                      <td className="px-3 py-2">
                        {!selectedPasswordType ? (
                          <span className="text-text-muted text-sm">Select a type first</span>
                        ) : (
                          <div className="relative">
                            <input type="text" autoComplete="new-password" style={showPassword ? undefined : { WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties} className={`${inputCls} pr-9 ${!(selectedPasswordType === 'PreSale' ? presalePassword : selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPricePassword : publicSaleSpecialPricePassword).trim() ? 'border-red-400' : ''}`}
                              value={selectedPasswordType === 'PreSale' ? presalePassword : selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPricePassword : publicSaleSpecialPricePassword}
                              placeholder="Required"
                              required
                              onChange={(e) => {
                                markTicketingUserEdited();
                                if (selectedPasswordType === 'PreSale') setPresalePassword(e.target.value);
                                else if (selectedPasswordType === 'PreSaleSpecialPrice') setPresaleSpecialPricePassword(e.target.value);
                                else setPublicSaleSpecialPricePassword(e.target.value);
                              }} disabled={disabled} />
                            <button type="button" tabIndex={-1}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                              onClick={() => setShowPassword((p) => !p)}
                              title={showPassword ? 'Hide password' : 'Show password'}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!selectedPasswordType ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <input type="date" className={inputCls}
                            value={selectedPasswordType === 'PreSale' ? presalePasswordDateStart : selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPricePasswordDateStart : publicSaleSpecialPricePasswordDateStart}
                            onChange={(e) => {
                              markTicketingUserEdited();
                              if (selectedPasswordType === 'PreSale') setPresalePasswordDateStart(e.target.value);
                              else if (selectedPasswordType === 'PreSaleSpecialPrice') setPresaleSpecialPricePasswordDateStart(e.target.value);
                              else setPublicSaleSpecialPricePasswordDateStart(e.target.value);
                            }} disabled={disabled} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!selectedPasswordType ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <input type="date" className={inputCls}
                            value={selectedPasswordType === 'PreSale' ? presalePasswordDateEnd : selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPricePasswordDateEnd : publicSaleSpecialPricePasswordDateEnd}
                            onChange={(e) => {
                              markTicketingUserEdited();
                              if (selectedPasswordType === 'PreSale') setPresalePasswordDateEnd(e.target.value);
                              else if (selectedPasswordType === 'PreSaleSpecialPrice') setPresaleSpecialPricePasswordDateEnd(e.target.value);
                              else setPublicSaleSpecialPricePasswordDateEnd(e.target.value);
                            }} disabled={disabled} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!selectedPasswordType || selectedPasswordType === 'PreSale' ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <Select2 options={PRESALE_DISCOUNT_TYPE_OPTIONS}
                            value={selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPriceDiscountType : publicSaleSpecialPriceDiscountType}
                            onChange={(v) => {
                              markTicketingUserEdited();
                              if (selectedPasswordType === 'PreSaleSpecialPrice') setPresaleSpecialPriceDiscountType(v);
                              else setPublicSaleSpecialPriceDiscountType(v);
                            }}
                            placeholder="Select…" allowClear disabled={disabled} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!selectedPasswordType || selectedPasswordType === 'PreSale' ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <input className={inputCls} inputMode="decimal"
                            value={selectedPasswordType === 'PreSaleSpecialPrice' ? presaleSpecialPriceDiscountAmount : publicSaleSpecialPriceDiscountAmount}
                            onChange={(e) => {
                              markTicketingUserEdited();
                              if (selectedPasswordType === 'PreSaleSpecialPrice') setPresaleSpecialPriceDiscountAmount(e.target.value);
                              else setPublicSaleSpecialPriceDiscountAmount(e.target.value);
                            }} disabled={disabled} />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
                  onClick={() => savePromoPasswordMut.mutate()}
                  disabled={disabled || !promoPasswordDirty}>
                  {savePromoPasswordMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : 'Save Passwords'}
                </Button>
              </div>
            </div>

            {/* ── VIP TICKET PACKAGES ── */}
            <div className="space-y-4">
              {sectionHeader('VIP Ticket Packages')}
              {fieldRow('VIP Package Offered?',
                <Select2 options={YES_NO_OPTIONS} value={vipPackageOffered}
                  onChange={(v) => { markTicketingUserEdited(); setVipPackageOffered(v); }}
                  placeholder="Select…" allowClear disabled={disabled} />,
              )}
              {vipPackageOffered === 'Yes' && (
                <div className="space-y-4 pl-0">
                  {fieldRow('Package Name',
                    <input className={inputCls} value={vipPackageName} maxLength={255}
                      onChange={(e) => { markTicketingUserEdited(); setVipPackageName(e.target.value); }} disabled={disabled} />,
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
                    <div className="text-sm font-medium text-text-primary shrink-0 sm:w-56 sm:pt-1">Benefits</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {VIP_PACKAGE_BENEFITS.map((benefit) => (
                        <label key={benefit} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={vipPackageBenefits.includes(benefit)}
                            onChange={() => toggleVipBenefit(benefit)}
                            disabled={disabled}
                            className="h-4 w-4 rounded border-border text-ems-accent"
                          />
                          {benefit}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
                  onClick={() => saveVipMut.mutate()}
                  disabled={disabled || !vipDirty}>
                  {saveVipMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : 'Save VIP Packages'}
                </Button>
              </div>
            </div>

            {/* ── SALES TAX (dbo.Venue) ── */}
            <div className="space-y-4">
              {sectionHeader('Sales Tax')}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Sales Tax Type',
                  <Select2 options={SALES_TAX_TYPE_OPTIONS} value={salesTaxType}
                    onChange={(v) => { markTicketingUserEdited(); setSalesTaxType(v); }}
                    placeholder="Select…" allowClear disabled={disabled} />,
                )}
                {fieldRow('Sales Tax (%)',
                  <input className={inputCls} inputMode="decimal" value={salesTaxAmountPercent}
                    onChange={(e) => { markTicketingUserEdited(); setSalesTaxAmountPercent(e.target.value); }} disabled={disabled} />,
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
                  onClick={() => saveSalesTaxMut.mutate()}
                  disabled={disabled || !salesTaxDirty}>
                  {saveSalesTaxMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : 'Save Sales Tax'}
                </Button>
              </div>
            </div>

            {/* ── SCALING (dbo.Engagement) ── */}
            <div className="space-y-4">
              {sectionHeader('Scaling')}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-10">
                {fieldRow('Scaling',
                  <input className={inputCls} maxLength={50} value={scalingLocal}
                    onChange={(e) => { markTicketingUserEdited(); setScalingLocal(e.target.value); }}
                    disabled={disabled} />,
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <Button type="button" className="bg-ems-accent text-white hover:opacity-90"
                  onClick={() => saveScalingMut.mutate()}
                  disabled={disabled || !scalingDirty}>
                  {saveScalingMut.isPending ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span> : 'Save Scaling'}
                </Button>
              </div>
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
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'iae-contacts'] }),
      qc.invalidateQueries({ queryKey: ['engagements', engagementId] }),
      qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'marketing-meta'] }),
      qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] }),
      qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] }),
    ]);
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
  const [venueDealTypeId, setVenueDealTypeId] = useState('');
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

  const venueDealTypeSelectOptions = useMemo((): Select2Option[] => {
    const rows = ldata?.venueDealTypes ?? [];
    const base = rows.map((r) => ({ value: String(r.id), label: r.label }));
    if (venueDealTypeId && !base.some((o) => o.value === venueDealTypeId)) {
      return [
        { value: venueDealTypeId, label: 'Current selection (saved)' },
        ...base,
      ];
    }
    return base;
  }, [ldata?.venueDealTypes, venueDealTypeId]);

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
    setVenueDealTypeId(intFieldToString(d.venueDealTypeId));
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
    if (!e1.ok) {
      addToast(e1.message, 'error');
      return;
    }
    if (!e2.ok) {
      addToast(e2.message, 'error');
      return;
    }
    if (!e4.ok) {
      addToast(e4.message, 'error');
      return;
    }
    if (!e5.ok) {
      addToast(e5.message, 'error');
      return;
    }
    if (!e6.ok) {
      addToast(e6.message, 'error');
      return;
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
    const vdt = fkIdStringToNumber(venueDealTypeId);
    if (venueDealTypeId.trim() !== '' && vdt == null) {
      addToast('Select a valid venue deal, or clear the field.', 'error');
      return;
    }

    saveMut.mutate({
      estimatedBreakeven: e1.value,
      grossPotential: e2.value,
      venueDealTypeId: vdt,
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
    const vdt = fkIdStringToNumber(venueDealTypeId);
    if (venueDealTypeId.trim() !== '' && vdt == null) return true;
    const venueNorm = (s: string | null | undefined) => {
      const v = s ?? '';
      return v === '' ? null : v;
    };
    const cur = {
      estimatedBreakeven: e1.value,
      grossPotential: e2.value,
      venueDealTypeId: vdt,
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
      venueDealTypeId: r.venueDealTypeId ?? null,
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
    venueDealTypeId,
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
          <FormField label="Venue Deal">
            <Select2
              options={venueDealTypeSelectOptions}
              value={venueDealTypeId}
              onChange={(value) => {
                markFinanceUserEdited();
                setVenueDealTypeId(value);
              }}
              placeholder="Select venue deal..."
              allowClear
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
  const [hasRehearsalInput, setHasRehearsalInput] = useState(false);
  const [rehearsalDateInput, setRehearsalDateInput] = useState('');
  const [rehearsalTimeInput, setRehearsalTimeInput] = useState('');
  const [loadInDateInput, setLoadInDateInput] = useState('');
  const [loadInTimeInput, setLoadInTimeInput] = useState('');
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

  const venueCompanyName = useMemo(() => {
    const company = (lookupsQuery.data?.companies ?? []).find((c) => c.companyId === venueId);
    return company?.companyName ?? detailQuery.data?.venueCompanyName ?? '';
  }, [lookupsQuery.data?.companies, venueId, detailQuery.data?.venueCompanyName]);

  const talentAgencyCompanyName = useMemo(() => {
    if (typeof tourMgmtCompanyId !== 'number' || tourMgmtCompanyId < 1) return '';
    return (lookupsQuery.data?.companies ?? []).find((c) => c.companyId === tourMgmtCompanyId)?.companyName ?? '';
  }, [lookupsQuery.data?.companies, tourMgmtCompanyId]);

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

  const venueContactsWithCompany = useMemo(
    () => (venueContactsQuery.data ?? []).map((c) => ({ ...c, companyName: venueCompanyName })),
    [venueContactsQuery.data, venueCompanyName],
  );

  const talentAgentContactsWithCompany = useMemo(
    () => tourSelectedTalentAgentContacts.map((c) => ({ ...c, companyName: talentAgencyCompanyName })),
    [tourSelectedTalentAgentContacts, talentAgencyCompanyName],
  );

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
    setHasRehearsalInput(Boolean((row.rehearsalDate ?? '').trim() || (row.rehearsalTime ?? '').trim()));
    setRehearsalDateInput(row.rehearsalDate ?? '');
    setRehearsalTimeInput((row.rehearsalTime ?? '').slice(0, 5));
    setLoadInDateInput(row.loadInDate ?? '');
    setLoadInTimeInput((row.loadInTime ?? '').slice(0, 5));
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
    const curHasRehearsal = Boolean((row.rehearsalDate ?? '').trim() || (row.rehearsalTime ?? '').trim());
    const curR = row.rehearsalDate ?? '';
    const curRT = (row.rehearsalTime ?? '').slice(0, 5);
    const curL = row.loadInDate ?? '';
    const curLT = (row.loadInTime ?? '').slice(0, 5);
    return (
      hasRehearsalInput !== curHasRehearsal ||
      rehearsalDateInput !== curR ||
      rehearsalTimeInput !== curRT ||
      loadInDateInput !== curL ||
      loadInTimeInput !== curLT
    );
  }, [
    row,
    hasRehearsalInput,
    rehearsalDateInput,
    rehearsalTimeInput,
    loadInDateInput,
    loadInTimeInput,
  ]);
  const canSaveProductionDates = hasProductionDatesUserEdited && canSaveProductionDatesRaw;

  const capacitySectionSaving = capacityFieldsMutation.isPending;
  const productionSectionSaving = productionDatesMutation.isPending;

  const handleSaveProductionDates = () => {
    const r = rehearsalDateInput.trim();
    const rt = rehearsalTimeInput.trim();
    const l = loadInDateInput.trim();
    const lt = loadInTimeInput.trim();
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    const hms = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!l) {
      addToast('Load-In date is required.', 'warning');
      return;
    }
    if (!lt) {
      addToast('Load-In time is required.', 'warning');
      return;
    }
    if (r && !ymd.test(r)) {
      addToast('Rehearsal date must be YYYY-MM-DD or empty.', 'warning');
      return;
    }
    if (rt && !hms.test(rt)) {
      addToast('Rehearsal time must be HH:mm or HH:mm:ss.', 'warning');
      return;
    }
    if (l && !ymd.test(l)) {
      addToast('Load-in date must be YYYY-MM-DD or empty.', 'warning');
      return;
    }
    if (lt && !hms.test(lt)) {
      addToast('Load-In time must be HH:mm or HH:mm:ss.', 'warning');
      return;
    }
    if (hasRehearsalInput && !r) {
      addToast('Rehearsal date is required when rehearsal is enabled.', 'warning');
      return;
    }
    if (hasRehearsalInput && !rt) {
      addToast('Rehearsal time is required when rehearsal is enabled.', 'warning');
      return;
    }
    productionDatesMutation.mutate({
      rehearsalDate: hasRehearsalInput && r ? r : null,
      rehearsalTime: hasRehearsalInput && rt ? rt : null,
      loadInDate: l ? l : null,
      loadInTime: lt ? lt : null,
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
  const setTabDirty = useCallback((tabName: string, dirty: boolean) => {
    setTabDirtyState((prev) => {
      if ((prev[tabName] ?? false) === dirty) return prev;
      return { ...prev, [tabName]: dirty };
    });
  }, []);
  const handleStaffAssignmentsDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Staff Assignments', dirty),
    [setTabDirty],
  );
  const handleMainInformationDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Main Information', dirty),
    [setTabDirty],
  );
  const handleServiceProvidersDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Service Providers', dirty),
    [setTabDirty],
  );
  const handleMarketingDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Marketing', dirty),
    [setTabDirty],
  );
  const handleProductionDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Production', dirty),
    [setTabDirty],
  );
  const handleTaxationDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Taxation', dirty),
    [setTabDirty],
  );
  const handleTicketingDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Ticketing', dirty),
    [setTabDirty],
  );
  const handleArtistTermsDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Artist terms', dirty),
    [setTabDirty],
  );
  const handleBookingDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Booking', dirty),
    [setTabDirty],
  );
  const handleEventBusinessDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Event business', dirty),
    [setTabDirty],
  );
  const handleFinanceDirtyChange = useCallback(
    (dirty: boolean) => setTabDirty('Finance', dirty),
    [setTabDirty],
  );
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
          'Staff Assignments',
          'Main Information',
          'Booking',
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
            <h3 className="text-sm font-semibold text-text-primary mb-1">Production and performance schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Load-In date" required>
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
              <FormField label="Load-In time" required>
                <input
                  type="time"
                  className={inputCls}
                  value={loadInTimeInput}
                  onChange={(e) => {
                    markProductionDatesUserEdited();
                    setLoadInTimeInput(e.target.value);
                  }}
                  disabled={anyEngagementPatchPending}
                />
              </FormField>
            </div>

            <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2">
              <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
                <span>Is there a rehearsal?</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={hasRehearsalInput}
                  onChange={(e) => {
                    markProductionDatesUserEdited();
                    const checked = e.target.checked;
                    setHasRehearsalInput(checked);
                    if (!checked) {
                      setRehearsalDateInput('');
                      setRehearsalTimeInput('');
                    }
                  }}
                  disabled={anyEngagementPatchPending}
                />
              </label>
            </div>

            {hasRehearsalInput && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Rehearsal date" required>
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
                <FormField label="Rehearsal time" required>
                  <input
                    type="time"
                    className={inputCls}
                    value={rehearsalTimeInput}
                    onChange={(e) => {
                      markProductionDatesUserEdited();
                      setRehearsalTimeInput(e.target.value);
                    }}
                    disabled={anyEngagementPatchPending}
                  />
                </FormField>
              </div>
            )}

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
     {/* ── Staff Assignments ────────────────────────────────────────────── */}
      {tab === 'Staff Assignments' && (
        <div className="bg-card border border-border rounded-lg p-5">
          <EngagementOverviewIaeStaffSection
            engagementId={engagementId}
            enabled={tab === 'Staff Assignments'}
            addToast={addToast}
            onDirtyChange={handleStaffAssignmentsDirtyChange}
          />
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
          onDirtyChange={handleMainInformationDirtyChange}
        />
      )}

      {/* ── Booking ──────────────────────────────────────────────────────── */}
      {tab === 'Booking' && row && (
        <EngagementBookingPanel
          engagementId={engagementId}
          row={row}
          addToast={addToast}
          onDirtyChange={handleBookingDirtyChange}
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
            onDirtyChange={handleServiceProvidersDirtyChange}
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
                <ContactsTable contacts={venueContactsWithCompany} />
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
            ) : talentAgentContactsWithCompany.length === 0 ? (
              <p className="text-sm text-text-muted">No talent agents are selected for this tour.</p>
            ) : (
              <ContactsTable contacts={talentAgentContactsWithCompany} />
            )}
          </div>
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
              Add Date and Time
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
        <>
          <EngagementMarketingPanel
            engagementId={engagementId}
            addToast={addToast}
            onDirtyChange={handleMarketingDirtyChange}
          />
          <EngagementMarketingReadOnlySection
            venueCompanyId={row.primaryVenueCompanyId}
            tourId={row.tourId}
          />
        </>
      )}

      {/* ── Production (venue-backed) ────────────────────────────────────── */}
      {tab === 'Production' && (
        <EngagementProductionPanel
          engagementId={engagementId}
          venueCompanyId={row.primaryVenueCompanyId}
          venueLabel={row.venueCompanyName ?? row.venueName}
          addToast={addToast}
          onDirtyChange={handleProductionDirtyChange}
        />
      )}

      {/* ── Taxation (EngagementFinances + withholding links) ───────────── */}
      {tab === 'Taxation' && (
        <EngagementTaxationPanel
          engagementId={engagementId}
          venueCompanyId={row.primaryVenueCompanyId}
          venueLabel={row.venueCompanyName ?? row.venueName}
          addToast={addToast}
          onDirtyChange={handleTaxationDirtyChange}
        />
      )}

      {/* ── Ticketing (Engagement + PerformanceTicketing) ───────────────── */}
      {tab === 'Ticketing' && (
        <EngagementTicketingPanel
          engagementId={engagementId}
          engagementScaling={row.engagementScaling}
          addToast={addToast}
          onDirtyChange={handleTicketingDirtyChange}
        />
      )}

      {/* ── Artist terms (dbo.ArtistFinance + links on EngagementFinances) ─ */}
      {tab === 'Artist terms' && (
        <EngagementArtistTermsPanel
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={handleArtistTermsDirtyChange}
        />
      )}

      {tab === 'Event business' && (
        <EngagementEventBusinessPanel
          engagementId={engagementId}
          venueCompanyId={row.primaryVenueCompanyId}
          addToast={addToast}
          onDirtyChange={handleEventBusinessDirtyChange}
        />
      )}

      {/* ── Finance & logistics ─────────────────────────────────────────── */}
      {tab === 'Finance' && (
        <EngagementFinancePanel
          key={engagementId}
          engagementId={engagementId}
          addToast={addToast}
          onDirtyChange={handleFinanceDirtyChange}
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
                  setHasRehearsalInput(
                    Boolean((row.rehearsalDate ?? '').trim() || (row.rehearsalTime ?? '').trim()),
                  );
                  setRehearsalDateInput(row.rehearsalDate ?? '');
                  setRehearsalTimeInput((row.rehearsalTime ?? '').slice(0, 5));
                  setLoadInDateInput(row.loadInDate ?? '');
                  setLoadInTimeInput((row.loadInTime ?? '').slice(0, 5));
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

                      <FormField label="Visibility">
                        <div className="flex items-center rounded-md border border-border bg-surface p-1">
                          <button
                            type="button"
                            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${rowDraft.performanceStatus === 'Public' ? 'bg-ems-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                            onClick={() =>
                              updatePerformanceDraftRow(rowDraft.id, {
                                performanceStatus: 'Public',
                              })
                            }
                            disabled={createPerformanceMut.isPending}
                          >
                            Public
                          </button>
                          <button
                            type="button"
                            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${rowDraft.performanceStatus === 'Private' ? 'bg-ems-accent text-white' : 'text-text-secondary hover:bg-hover'}`}
                            onClick={() =>
                              updatePerformanceDraftRow(rowDraft.id, {
                                performanceStatus: 'Private',
                              })
                            }
                            disabled={createPerformanceMut.isPending}
                          >
                            Private
                          </button>
                        </div>
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
                Add Date and Time
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
    companyName?: string | null;
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
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border bg-surface">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Company Name</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Phone</th>
              <th className="text-left py-2 px-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.contactAssignmentId} className="border-b border-border/50 hover:bg-hover">
                <td className="py-2 px-3 text-text-primary font-medium">
                  {c.firstName} {c.lastName}
                </td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {c.companyName || '—'}
                </td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {c.departmentName || '—'}
                </td>
                <td className="py-2 px-3 text-ems-blue text-xs">{c.email ? <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a> : '—'}</td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {(c.cellPhone || c.workPhone) ? <a href={`tel:${c.cellPhone || c.workPhone}`} className="hover:underline">{formatE164ForDisplay(c.cellPhone || c.workPhone)}</a> : '—'}
                </td>
                <td className="py-2 px-3 text-text-secondary text-xs">
                  {c.roleName || '—'}
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