/**
 * EngagementDrillBitsTab – "ENGAGEMENT DRILL BITS" form tab.
 * Primary data-entry screen consolidating fields from Overview, Booking,
 * Ticketing, Marketing, Performances, and other tabs into a single source of truth.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  AlertCircle,
  CalendarDays,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import { Modal, FormField } from './Primitives';
import { Select2, type Select2Option } from './Select2';
import { Button } from '@/components/ui/button';
import {
  fetchEngagementFinance,
  fetchEngagementFinanceLookups,
  fetchEngagementPerformances,
  fetchEngagementPerformanceTicketing,
  fetchEngagementVenueTabData,
  fetchEngagementTravel,
  fetchEquipmentRentalTypes,
  fetchEquipmentRentals,
  fetchProductionMisc,
  updateEngagementPerformanceTicketing,
  updateEngagementFinance,
  updateEngagement,
  createEngagementPerformance,
  updateEngagementPerformance,
  deleteEngagementPerformance,
  upsertEngagementLink,
  removeEngagementLink,
  upsertTravelDrillBits,
  upsertEquipmentRentals,
  updateProductionMisc,
  type ApiEngagementListRow,
  type ApiEngagementLinkRow,
  type ApiPerformanceRow,
  type UpdateEngagementFinancePayload,
  type UpdatePerformanceTicketingPayload,
} from '@/api/engagementApi';
import {
  fetchCompanies,
  fetchCompanyContacts,
  fetchVenueProfile,
  updateVenueProfile,
  fetchLookups,
} from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { companyToSelect2Option } from './companySelectOptions';
import {
  PERFORMANCE_TICKETING_STATUS_VALUES,
} from '@/api/projectApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const inputCls =
  'w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/20 placeholder:text-text-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

const DEAL_TYPE_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Flat', label: 'Flat' },
  { value: 'Versus', label: 'Versus' },
  { value: 'Promoter Profit', label: 'Promoter Profit' },
];

const ROYALTY_BASIS_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Based on Net', label: 'Based on Net' },
  { value: 'Based on NAGBOR', label: 'Based on NAGBOR' },
];

// VenueDealType IDs 1-4 are Venue Deal (fetched from dbo.VenueDealType via fetchEngagementFinanceLookups())
const VENUE_DEAL_TYPE_IDS = [1, 2, 3, 4];

const TICKETING_ADMIN_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Venue', label: 'Venue' },
  { value: 'Partner', label: 'Partner' },
  { value: 'IAE Contract', label: 'IAE Contract' },
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

const YES_NO_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const TRAVEL_CATEGORIES = ['Ground Transportation', 'Airfare', 'Hotels'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function numFieldToString(v: number | string | null | undefined): string {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return '';
  return String(v);
}

type ParseResult = { ok: true; value: number | null } | { ok: false; message: string };

function assertParseOk(r: ParseResult): asserts r is { ok: true; value: number | null } {
  if (r.ok === false) throw new Error(r.message);
}

function parseOptionalDecimal(
  s: string,
  label: string,
): ParseResult {
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
): ParseResult {
  const parsed = parseOptionalDecimal(s, label);
  if (!parsed.ok) return parsed;
  if (parsed.value == null) return parsed;
  if (parsed.value < 0 || parsed.value > 100) {
    return { ok: false, message: `${label} must be between 0 and 100.` };
  }
  return parsed;
}

function useUserEditTracker(resetKey: unknown) {
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const markUserEdited = useCallback(() => setHasUserEdited(true), []);
  const clearUserEdited = useCallback(() => setHasUserEdited(false), []);
  useEffect(() => { setHasUserEdited(false); }, [resetKey]);
  return { hasUserEdited, markUserEdited, clearUserEdited };
}

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
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0').slice(0, 2)}`;
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-border pb-2 mb-4">
      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Performance Row (reused from detail page)
// ---------------------------------------------------------------------------
function EditablePerformanceRow({
  perf,
  isPrimary,
  engagementId,
  allowDeleteShow,
  onRefresh,
  addToast,
}: {
  perf: ApiPerformanceRow;
  isPrimary: boolean;
  engagementId: number;
  allowDeleteShow: boolean;
  onRefresh: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const rowQc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(perf.performanceDate);
  const [timeVal, setTimeVal] = useState((perf.performanceTime ?? '').slice(0, 5));
  const [statusVal, setStatusVal] = useState(perf.performanceStatus);
  const [sellCap, setSellCap] = useState('');
  const [grossPot, setGrossPot] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch per-performance ticketing data for capacity/potential
  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', perf.performanceId] as const,
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, perf.performanceId),
    retry: 1,
  });

  useEffect(() => {
    setDateVal(perf.performanceDate);
    setTimeVal((perf.performanceTime ?? '').slice(0, 5));
    setStatusVal(perf.performanceStatus);
  }, [perf]);

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d) return;
    setSellCap(d.sellableCapacity == null ? '' : String(d.sellableCapacity));
    setGrossPot(d.grossPotentialRevenue == null ? '' : String(d.grossPotentialRevenue));
  }, [ticketingQuery.data]);

  const updateMut = useMutation({
    mutationFn: async () => {
      await updateEngagementPerformance(engagementId, perf.performanceId, {
        performanceDate: dateVal,
        performanceTime: normalizePerformanceTimeInput(timeVal),
        performanceStatus: statusVal,
      });
      // Also save sellable capacity / gross potential to PerformanceTicketing
      const sellVal = sellCap.trim() ? Math.round(Number(sellCap)) : null;
      const grossVal = grossPot.trim() ? Number(grossPot) : null;
      await updateEngagementPerformanceTicketing(engagementId, perf.performanceId, {
        sellableCapacity: Number.isFinite(sellVal) ? sellVal : null,
        grossPotentialRevenue: Number.isFinite(grossVal) ? grossVal : null,
      });
    },
    onSuccess: () => {
      setEditing(false);
      onRefresh();
      ticketingQuery.refetch();
      rowQc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      addToast('Performance updated.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteEngagementPerformance(engagementId, perf.performanceId),
    onSuccess: () => { onRefresh(); rowQc.invalidateQueries({ queryKey: ['engagements', engagementId] }); addToast('Performance deleted.', 'success'); },
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  // Inline save for capacity fields only (no need to enter full Edit mode)
  const saveCapacityMut = useMutation({
    mutationFn: async () => {
      const sellVal = sellCap.trim() ? Math.round(Number(sellCap)) : null;
      const grossVal = grossPot.trim() ? Number(grossPot) : null;
      if (sellCap.trim() && !Number.isFinite(sellVal)) throw new Error('Sellable Capacity must be a valid number.');
      if (grossPot.trim() && !Number.isFinite(grossVal)) throw new Error('Gross Potential must be a valid number.');
      await updateEngagementPerformanceTicketing(engagementId, perf.performanceId, {
        sellableCapacity: sellVal,
        grossPotentialRevenue: grossVal,
      });
    },
    onSuccess: () => {
      ticketingQuery.refetch();
      setCapacityDirty(false);
      rowQc.invalidateQueries({ queryKey: ['engagements', engagementId] });
      addToast('Capacity saved for this performance.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  const [capacityDirty, setCapacityDirty] = useState(false);

  const fmtCurrency = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v) : '—';

  return (
    <li className="rounded-lg border border-border bg-surface/60 p-3">
      {!editing ? (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-text-primary">
              <span className="font-medium">{formatPerformanceDateDisplay(perf.performanceDate)}</span>
              {' · '}
              <span>{formatPerformanceTimeDisplay(perf.performanceTime)}</span>
              {' · '}
              <span className="text-text-muted">{perf.performanceStatus}</span>
              {isPrimary && <span className="ml-2 text-xs text-ems-accent font-medium">(Opening)</span>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setEditing(true)} className="text-xs text-ems-accent hover:underline">Edit</button>
              {allowDeleteShow && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-ems-coral hover:underline">Delete</button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-md bg-surface/80 border border-border/50 px-3 py-2">
            <FormField label="Sellable Capacity (this performance)">
              <input
                type="number"
                min={0}
                step={1}
                className={inputCls}
                value={sellCap}
                onChange={(e) => { setSellCap(e.target.value); setCapacityDirty(true); }}
                disabled={saveCapacityMut.isPending}
                placeholder="e.g. 2000"
              />
            </FormField>
            <FormField label="Gross Potential Revenue (this performance)">
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={grossPot}
                onChange={(e) => { setGrossPot(e.target.value); setCapacityDirty(true); }}
                disabled={saveCapacityMut.isPending}
                placeholder="$"
              />
            </FormField>
            <Button
              type="button"
              size="sm"
              className="bg-ems-accent text-white hover:opacity-90 mb-0.5"
              onClick={() => saveCapacityMut.mutate()}
              disabled={saveCapacityMut.isPending || !capacityDirty}
            >
              {saveCapacityMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Date">
              <input type="date" className={inputCls} value={dateVal} onChange={(e) => setDateVal(e.target.value)} disabled={updateMut.isPending} />
            </FormField>
            <FormField label="Time">
              <input type="time" className={inputCls} value={timeVal} onChange={(e) => setTimeVal(e.target.value)} disabled={updateMut.isPending} />
            </FormField>
            <FormField label="Status">
              <Select2
                options={PERFORMANCE_TICKETING_STATUS_VALUES.map((v) => ({ value: v, label: v }))}
                value={statusVal}
                onChange={(v) => setStatusVal(v)}
                placeholder="Select…"
                disabled={updateMut.isPending}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Sellable Capacity">
              <input type="number" min={0} step={1} className={inputCls} value={sellCap} onChange={(e) => setSellCap(e.target.value)} disabled={updateMut.isPending} placeholder="e.g. 2000" />
            </FormField>
            <FormField label="Gross Potential Revenue">
              <input type="number" min={0} step={0.01} className={inputCls} value={grossPot} onChange={(e) => setGrossPot(e.target.value)} disabled={updateMut.isPending} placeholder="$" />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditing(false)} disabled={updateMut.isPending} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
            <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="mt-2 p-2 bg-ems-coral/10 border border-ems-coral/30 rounded-md flex items-center gap-3">
          <span className="text-xs text-ems-coral">Delete this performance?</span>
          <button type="button" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="text-xs font-medium text-ems-coral underline">Confirm</button>
          <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleteMut.isPending} className="text-xs text-text-muted underline">Cancel</button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface EngagementDrillBitsTabProps {
  engagementId: number;
  row: ApiEngagementListRow;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function EngagementDrillBitsTab({
  engagementId,
  row,
  addToast,
  onDirtyChange,
}: EngagementDrillBitsTabProps) {
  const qc = useQueryClient();

  // ══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ══════════════════════════════════════════════════════════════════════════

  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

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

  const financeLookupsQuery = useQuery({
    queryKey: ['engagements', 'finance-lookups'],
    queryFn: () => fetchEngagementFinanceLookups(),
    staleTime: 300_000,
  });

  const venueTabQuery = useQuery({
    queryKey: ['engagements', engagementId, 'venue-tab-data'],
    queryFn: () => fetchEngagementVenueTabData(engagementId),
    staleTime: 60_000,
    retry: 1,
  });

  const travelQuery = useQuery({
    queryKey: ['engagements', engagementId, 'travel'],
    queryFn: () => fetchEngagementTravel(engagementId),
    staleTime: 60_000,
    retry: 1,
  });

  const equipmentTypesQuery = useQuery({
    queryKey: ['engagements', 'equipment-rental-types'],
    queryFn: fetchEquipmentRentalTypes,
    staleTime: 300_000,
  });

  const equipmentRentalsQuery = useQuery({
    queryKey: ['engagements', engagementId, 'equipment-rentals'],
    queryFn: () => fetchEquipmentRentals(engagementId),
    staleTime: 60_000,
    retry: 1,
  });

  const productionMiscQuery = useQuery({
    queryKey: ['engagements', engagementId, 'production-misc'],
    queryFn: () => fetchProductionMisc(engagementId),
    staleTime: 60_000,
    retry: 1,
  });

  const venueCompanyId = row.primaryVenueCompanyId;

  const venueProfileQuery = useQuery({
    queryKey: ['companies', venueCompanyId, 'venue-profile'],
    queryFn: () => fetchVenueProfile(venueCompanyId!),
    enabled: venueCompanyId != null,
    staleTime: 60_000,
    retry: 1,
  });

  const brandsLookupsQuery = useQuery({
    queryKey: ['company-lookups', 'drillbits-brands'],
    queryFn: fetchLookups,
    staleTime: 300_000,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Brand/Series
  // ══════════════════════════════════════════════════════════════════════════

  const [brandId, setBrandId] = useState('');

  const {
    hasUserEdited: hasBrandEdited,
    markUserEdited: markBrandEdited,
    clearUserEdited: clearBrandEdited,
  } = useUserEditTracker(`drillbits-brand:${engagementId}`);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Production & Performance Schedule
  // ══════════════════════════════════════════════════════════════════════════

  const [loadInDate, setLoadInDate] = useState('');
  const [loadInTime, setLoadInTime] = useState('');
  const [hasRehearsal, setHasRehearsal] = useState(false);
  const [rehearsalDate, setRehearsalDate] = useState('');
  const [rehearsalTime, setRehearsalTime] = useState('');

  const {
    hasUserEdited: hasProductionEdited,
    markUserEdited: markProductionEdited,
    clearUserEdited: clearProductionEdited,
  } = useUserEditTracker(`drillbits-production:${engagementId}`);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Performances
  // ══════════════════════════════════════════════════════════════════════════

  const [showAddPerformance, setShowAddPerformance] = useState(false);
  const [pfRows, setPfRows] = useState<{ id: string; performanceDate: string; performanceTime: string; performanceStatus: string }[]>([
    { id: '1', performanceDate: '', performanceTime: '', performanceStatus: 'On Sale' },
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Attraction Terms
  // ══════════════════════════════════════════════════════════════════════════

  const [dealType, setDealType] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [versusPercent, setVersusPercent] = useState('');
  const [promoterProfitPercent, setPromoterProfitPercent] = useState('');
  const [artistBackendPercent, setArtistBackendPercent] = useState('');
  const [royaltyRatePercent, setRoyaltyRatePercent] = useState('');
  const [royaltyBasis, setRoyaltyBasis] = useState('');
  const [middleMoneyEnabled, setMiddleMoneyEnabled] = useState('No');
  const [middleMoneyAmount, setMiddleMoneyAmount] = useState('');
  const [isCollateralized, setIsCollateralized] = useState('No');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Venue Deal
  // ══════════════════════════════════════════════════════════════════════════

  const [venueDealTypeId, setVenueDealTypeId] = useState('');
  const [rentalForecastLink, setRentalForecastLink] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Venue (document links)
  // ══════════════════════════════════════════════════════════════════════════

  const [confirmedArtistOfferLink, setConfirmedArtistOfferLink] = useState('');
  const [confirmedPartnerForecastLink, setConfirmedPartnerForecastLink] = useState('');
  const [confirmedRentalForecastLink, setConfirmedRentalForecastLink] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — 3rd Party Partner
  // ══════════════════════════════════════════════════════════════════════════

  const [thirdPartyDealType, setThirdPartyDealType] = useState('');
  const [thirdPartyArtistOfferLink, setThirdPartyArtistOfferLink] = useState('');
  const [thirdPartyPartnerForecastLink, setThirdPartyPartnerForecastLink] = useState('');
  const [thirdPartyTourOfferLink, setThirdPartyTourOfferLink] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Ticketing
  // ══════════════════════════════════════════════════════════════════════════

  const [ticketingSystemCompanyId, setTicketingSystemCompanyId] = useState('');
  const [ticketingContactId, setTicketingContactId] = useState('');
  const [ticketingAdministrator, setTicketingAdministrator] = useState('');
  const [boxOfficeLaborRequired, setBoxOfficeLaborRequired] = useState('');
  const [facilityFeeType, setFacilityFeeType] = useState('');
  const [facilityFeeAmount, setFacilityFeeAmount] = useState('');
  const [dynamicPricingMode, setDynamicPricingMode] = useState('');
  const [rebateAmount, setRebateAmount] = useState('');
  const [bumpAmount, setBumpAmount] = useState('');
  const [creditCardFeesType, setCreditCardFeesType] = useState('');
  const [creditCardFeesAmountPercent, setCreditCardFeesAmountPercent] = useState('');
  const [salesTaxType, setSalesTaxType] = useState('');
  const [salesTaxAmountPercent, setSalesTaxAmountPercent] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Marketing
  // ══════════════════════════════════════════════════════════════════════════

  const [grossMarketingBudget, setGrossMarketingBudget] = useState('');
  const [netMarketingBudget, setNetMarketingBudget] = useState('');
  const [salesRevenueGoal, setSalesRevenueGoal] = useState('');
  const [tourSplitPoint, setTourSplitPoint] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Travel
  // ══════════════════════════════════════════════════════════════════════════

  const [travelSelections, setTravelSelections] = useState<string[]>([]);
  const [travelGroundIaePays, setTravelGroundIaePays] = useState('');
  const [travelGroundIaeArranges, setTravelGroundIaeArranges] = useState('');
  const [travelAirfareIaePays, setTravelAirfareIaePays] = useState('');
  const [travelAirfareIaeArranges, setTravelAirfareIaeArranges] = useState('');
  const [travelHotelsIaePays, setTravelHotelsIaePays] = useState('');
  const [travelHotelsIaeArranges, setTravelHotelsIaeArranges] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Equipment Rentals
  // ══════════════════════════════════════════════════════════════════════════

  const [equipmentSelections, setEquipmentSelections] = useState<string[]>([]);
  const [equipmentBudgets, setEquipmentBudgets] = useState<Record<string, string>>({});

  // ══════════════════════════════════════════════════════════════════════════
  // STATE — Miscellaneous
  // ══════════════════════════════════════════════════════════════════════════

  const [runnerRequired, setRunnerRequired] = useState('');
  const [cateringEnabled, setCateringEnabled] = useState('');
  const [cateringBudget, setCateringBudget] = useState('');
  const [buyoutsEnabled, setBuyoutsEnabled] = useState('');
  const [buyoutDescription, setBuyoutDescription] = useState('');
  const [buyoutBudget, setBuyoutBudget] = useState('');

  // ══════════════════════════════════════════════════════════════════════════
  // PER-SECTION EDIT TRACKERS
  // ══════════════════════════════════════════════════════════════════════════

  const {
    hasUserEdited: hasAttractionEdited,
    markUserEdited: markAttractionEdited,
    clearUserEdited: clearAttractionEdited,
  } = useUserEditTracker(`drillbits-attraction:${engagementId}`);

  const {
    hasUserEdited: hasVenueDealEdited,
    markUserEdited: markVenueDealEdited,
    clearUserEdited: clearVenueDealEdited,
  } = useUserEditTracker(`drillbits-venuedeal:${engagementId}`);

  const {
    hasUserEdited: hasVenueDocsEdited,
    markUserEdited: markVenueDocsEdited,
    clearUserEdited: clearVenueDocsEdited,
  } = useUserEditTracker(`drillbits-venuedocs:${engagementId}`);

  const {
    hasUserEdited: hasThirdPartyEdited,
    markUserEdited: markThirdPartyEdited,
    clearUserEdited: clearThirdPartyEdited,
  } = useUserEditTracker(`drillbits-3rdparty:${engagementId}`);

  const {
    hasUserEdited: hasTicketingEdited,
    markUserEdited: markTicketingEdited,
    clearUserEdited: clearTicketingEdited,
  } = useUserEditTracker(`drillbits-ticketing:${engagementId}`);

  const {
    hasUserEdited: hasMarketingEdited,
    markUserEdited: markMarketingEdited,
    clearUserEdited: clearMarketingEdited,
  } = useUserEditTracker(`drillbits-marketing:${engagementId}`);

  const {
    hasUserEdited: hasTravelEdited,
    markUserEdited: markTravelEdited,
    clearUserEdited: clearTravelEdited,
  } = useUserEditTracker(`drillbits-travel:${engagementId}`);

  const {
    hasUserEdited: hasEquipmentEdited,
    markUserEdited: markEquipmentEdited,
    clearUserEdited: clearEquipmentEdited,
  } = useUserEditTracker(`drillbits-equipment:${engagementId}`);

  const {
    hasUserEdited: hasMiscEdited,
    markUserEdited: markMiscEdited,
    clearUserEdited: clearMiscEdited,
  } = useUserEditTracker(`drillbits-misc:${engagementId}`);

  // ══════════════════════════════════════════════════════════════════════════
  // POPULATE FROM API
  // ══════════════════════════════════════════════════════════════════════════

  // Production dates from row (comes from Overview)
  useEffect(() => {
    setLoadInDate(row.loadInDate ?? '');
    setLoadInTime((row.loadInTime ?? '').slice(0, 5));
    setHasRehearsal(Boolean((row.rehearsalDate ?? '').trim() || (row.rehearsalTime ?? '').trim()));
    setRehearsalDate(row.rehearsalDate ?? '');
    setRehearsalTime((row.rehearsalTime ?? '').slice(0, 5));
  }, [row]);

  // Brand from venue profile
  useEffect(() => {
    const profile = venueProfileQuery.data;
    if (!profile || profile.missing) {
      setBrandId('');
      return;
    }
    const brandIds = (profile as { brandIds: number[] }).brandIds;
    setBrandId(brandIds[0] != null ? String(brandIds[0]) : '');
  }, [venueProfileQuery.data]);

  // Finance data
  useEffect(() => {
    const d = financeQuery.data;
    if (!d) return;
    // Attraction terms
    setDealType(d.artistDealType ?? '');
    setGuaranteeAmount(numFieldToString(d.artistGuarantee));
    setVersusPercent(numFieldToString(d.artistVersusPercent));
    setPromoterProfitPercent(numFieldToString(d.artistPromoterProfitPercent ?? d.promoterProfit));
    setArtistBackendPercent(numFieldToString(d.artistBackendPercent));
    setRoyaltyRatePercent(numFieldToString(d.artistRoyaltyRatePercent));
    setRoyaltyBasis(d.artistRoyaltyBasedOn ?? '');
    setMiddleMoneyEnabled(d.artistMiddleMoney != null ? 'Yes' : 'No');
    setMiddleMoneyAmount(numFieldToString(d.artistMiddleMoney));
    setIsCollateralized(d.artistPartOfCollateralizedDeal ? 'Yes' : 'No');
    // Venue deal → stored in VenueDealTypeID (int FK)
    setVenueDealTypeId(d.venueDealTypeId != null ? String(d.venueDealTypeId) : '');
    // 3rd party partner → stored in VenueDealType (nvarchar) column
    // Only populate if the value is a 3rd-party string (not a venue deal string)
    const thirdPartyLabels = ['CoPro with 3rd Party', 'CoPro with 3rd Party, 3rd Party Renting Venue', 'Silent CoPro with 3rd Party, 3rd Party Renting Venue'];
    const rawVenueDeal = d.thirdPartyPartnerDealStructure ?? d.venueDealType ?? '';
    setThirdPartyDealType(thirdPartyLabels.includes(rawVenueDeal) ? rawVenueDeal : '');
    // 3rd party partner document links
    setThirdPartyArtistOfferLink(d.finalAcceptedOfferLink ?? '');
    setThirdPartyTourOfferLink(d.artistTourOfferLink ?? '');
    // Marketing budgets
    setGrossMarketingBudget(numFieldToString(d.grossMarketingBudget));
    setNetMarketingBudget(numFieldToString(d.netMarketingBudget));
    setSalesRevenueGoal(numFieldToString(d.salesRevenueGoal));
    setTourSplitPoint(numFieldToString(d.tourSplitPoint));
  }, [financeQuery.data]);

  // Rental Forecast link from EngagementLink
  useEffect(() => {
    const links = venueTabQuery.data?.engagementLinks ?? [];
    setRentalForecastLink(links.find((el) => el.linkPurpose === 'Rental Forecast')?.linkUrl ?? '');
    setConfirmedRentalForecastLink(links.find((el) => el.linkPurpose === 'Confirmed Rental Forecast')?.linkUrl ?? '');
    setConfirmedPartnerForecastLink(links.find((el) => el.linkPurpose === 'VenueForcast')?.linkUrl ?? '');
    setThirdPartyPartnerForecastLink(links.find((el) => el.linkPurpose === 'VenueForcast')?.linkUrl ?? '');
  }, [venueTabQuery.data]);

  // Confirmed Artist Offer link from finance
  useEffect(() => {
    setConfirmedArtistOfferLink(financeQuery.data?.finalAcceptedOfferLink ?? '');
  }, [financeQuery.data?.finalAcceptedOfferLink]);

  // Travel from EngagementTravel (Drill Bits types only)
  useEffect(() => {
    const rows = travelQuery.data ?? [];
    const drillBitsRows = rows.filter((r) =>
      TRAVEL_CATEGORIES.includes(r.travelType as typeof TRAVEL_CATEGORIES[number]),
    );
    setTravelSelections(drillBitsRows.map((r) => r.travelType));
    for (const r of drillBitsRows) {
      const pays = r.iaePays;
      const arranges = r.iaeArranges;
      if (r.travelType === 'Ground Transportation') {
        setTravelGroundIaePays(pays == null ? '' : pays ? 'Yes' : 'No');
        setTravelGroundIaeArranges(arranges == null ? '' : arranges ? 'Yes' : 'No');
      } else if (r.travelType === 'Airfare') {
        setTravelAirfareIaePays(pays == null ? '' : pays ? 'Yes' : 'No');
        setTravelAirfareIaeArranges(arranges == null ? '' : arranges ? 'Yes' : 'No');
      } else if (r.travelType === 'Hotels') {
        setTravelHotelsIaePays(pays == null ? '' : pays ? 'Yes' : 'No');
        setTravelHotelsIaeArranges(arranges == null ? '' : arranges ? 'Yes' : 'No');
      }
    }
  }, [travelQuery.data]);

  // Equipment rentals from EngagementProductionEquipmentRental
  useEffect(() => {
    const rows = equipmentRentalsQuery.data ?? [];
    const types = equipmentTypesQuery.data ?? [];
    const selectedNames: string[] = [];
    const budgets: Record<string, string> = {};
    for (const row of rows) {
      const typeName = types.find((t) => t.equipmentRentalTypeId === row.equipmentRentalTypeId)?.typeName;
      if (typeName) {
        selectedNames.push(typeName);
        budgets[typeName] = row.budgetAmount != null ? String(row.budgetAmount) : '';
      }
    }
    setEquipmentSelections(selectedNames);
    setEquipmentBudgets(budgets);
  }, [equipmentRentalsQuery.data, equipmentTypesQuery.data]);

  // Miscellaneous from EngagementProduction
  useEffect(() => {
    const d = productionMiscQuery.data;
    if (!d) return;
    setRunnerRequired(d.runnerRequired == null ? '' : d.runnerRequired ? 'Yes' : 'No');
    setCateringEnabled(d.cateringRequired == null ? '' : d.cateringRequired ? 'Yes' : 'No');
    setCateringBudget(d.cateringBudgetLineItem ?? '');
    setBuyoutsEnabled(d.productionBuyoutRequired == null ? '' : d.productionBuyoutRequired ? 'Yes' : 'No');
    setBuyoutDescription(d.productionBuyoutDescription ?? '');
    setBuyoutBudget(d.productionBuyoutBudgetAmount != null ? String(d.productionBuyoutBudgetAmount) : '');
  }, [productionMiscQuery.data]);

  // Ticketing from first performance
  const firstPerformance = (performancesQuery.data ?? [])[0] ?? null;
  const firstPerformanceId = firstPerformance?.performanceId ?? null;

  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', firstPerformanceId] as const,
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, firstPerformanceId!),
    enabled: firstPerformanceId != null && firstPerformanceId > 0,
    retry: 1,
  });

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d) return;
    setTicketingSystemCompanyId(d.ticketingSystemCompanyId == null ? '' : String(d.ticketingSystemCompanyId));
    setTicketingContactId(d.ticketingAdminContactId == null ? '' : String(d.ticketingAdminContactId));
    setTicketingAdministrator(d.ticketingAdministrator ?? '');
    setBoxOfficeLaborRequired(d.boxOfficeLaborStaffingRequired == null ? '' : d.boxOfficeLaborStaffingRequired ? 'Yes' : 'No');
    setFacilityFeeType(d.facilityFeeType ?? '');
    setFacilityFeeAmount(numFieldToString(d.facilityFeeAmount));
    setDynamicPricingMode(d.dynamicPricingMode ?? '');
    setRebateAmount(numFieldToString(d.rebateAmount));
    setBumpAmount(numFieldToString(d.bumpAmount));
    setCreditCardFeesType(d.creditCardFeesType ?? '');
    setCreditCardFeesAmountPercent(numFieldToString(d.creditCardFeesAmountPercent));
    setSalesTaxType(d.salesTaxType ?? '');
    setSalesTaxAmountPercent(numFieldToString(d.salesTaxAmountPercent));
  }, [ticketingQuery.data]);

  // ══════════════════════════════════════════════════════════════════════════
  // DERIVED
  // ══════════════════════════════════════════════════════════════════════════

  const brandOptions = useMemo<Select2Option[]>(() => {
    const brands = brandsLookupsQuery.data?.brands ?? [];
    return [
      { value: '', label: '---' },
      ...brands
        .slice()
        .sort((a, b) => a.brandName.localeCompare(b.brandName, undefined, { sensitivity: 'base' }))
        .map((brand) => ({ value: String(brand.brandId), label: brand.brandName })),
    ];
  }, [brandsLookupsQuery.data?.brands]);

  const ticketingSystemCompanyOptions = useMemo<Select2Option[]>(() => {
    const rows = companiesQuery.data?.data ?? [];
    const filtered = rows.filter((company) => {
      const names = [company.companyTypeName, ...(company.companyTypeNames ?? [])]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return names.some((x) => x.includes('ticketing system'));
    });
    return [{ value: '', label: 'Not set' }, ...filtered.map(companyToSelect2Option)];
  }, [companiesQuery.data?.data]);

  const ticketingCompanyContactsQuery = useQuery({
    queryKey: ['companies', ticketingSystemCompanyId, 'contacts'],
    queryFn: () => fetchCompanyContacts(Number(ticketingSystemCompanyId)),
    enabled: !!ticketingSystemCompanyId,
    staleTime: 60_000,
    retry: 1,
  });

  const ticketingContactOptions = useMemo<Select2Option[]>(() => {
    const contacts = ticketingCompanyContactsQuery.data ?? [];
    return [
      { value: '', label: 'Not set' },
      ...contacts.map((c) => ({ value: String(c.contactId), label: `${c.firstName} ${c.lastName}`.trim() })),
    ];
  }, [ticketingCompanyContactsQuery.data]);

  // Venue Deal options from dbo.VenueDealType (IDs 1-4)
  const venueDealOptions = useMemo<Select2Option[]>(() => {
    const all = financeLookupsQuery.data?.venueDealTypes ?? [];
    const venueOpts = all.filter((r) => VENUE_DEAL_TYPE_IDS.includes(r.id));
    return [{ value: '', label: 'Not set' }, ...venueOpts.map((r) => ({ value: String(r.id), label: r.label }))];
  }, [financeLookupsQuery.data?.venueDealTypes]);

  // 3rd Party Partner options — stored as string in EngagementFinances.VenueDealType
  const thirdPartyPartnerOptions = useMemo<Select2Option[]>(() => [
    { value: '', label: 'Not set' },
    { value: 'CoPro with 3rd Party', label: 'CoPro with 3rd Party' },
    { value: 'CoPro with 3rd Party, 3rd Party Renting Venue', label: 'CoPro with 3rd Party, 3rd Party Renting Venue' },
    { value: 'Silent CoPro with 3rd Party, 3rd Party Renting Venue', label: 'Silent CoPro with 3rd Party, 3rd Party Renting Venue' },
  ], []);

  const canDeleteIndividualShow = (performancesQuery.data ?? []).length > 1;

  // ══════════════════════════════════════════════════════════════════════════
  // DIRTY TRACKING
  // ══════════════════════════════════════════════════════════════════════════

  const isDirty = hasBrandEdited || hasProductionEdited || hasAttractionEdited || hasVenueDealEdited || hasThirdPartyEdited
    || hasTicketingEdited || hasMarketingEdited || hasTravelEdited || hasEquipmentEdited || hasMiscEdited
    || showAddPerformance;
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Brand/Series (VenueProfile)
  // ══════════════════════════════════════════════════════════════════════════

  const saveBrandMut = useMutation({
    mutationFn: async () => {
      if (venueCompanyId == null) throw new Error('No venue selected — cannot save brand.');
      await updateVenueProfile(venueCompanyId, {
        brandIds: brandId ? [Number(brandId)] : [],
      });
      await qc.invalidateQueries({ queryKey: ['companies', venueCompanyId, 'venue-profile'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearBrandEdited(); addToast('Brand/Series saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Production Schedule (dbo.EngagementProduction via updateEngagement)
  // ══════════════════════════════════════════════════════════════════════════

  const saveProductionMut = useMutation({
    mutationFn: async () => {
      if (hasRehearsal && !rehearsalDate.trim()) {
        throw new Error('Rehearsal Date is required when Rehearsal is enabled.');
      }
      await updateEngagement(engagementId, {
        loadInDate: loadInDate || null,
        loadInTime: loadInTime ? `${loadInTime}:00` : null,
        rehearsalDate: hasRehearsal ? (rehearsalDate || null) : null,
        rehearsalTime: hasRehearsal && rehearsalTime ? `${rehearsalTime}:00` : null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearProductionEdited(); addToast('Production schedule saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Attraction Terms (EngagementFinances / ArtistFinance)
  // ══════════════════════════════════════════════════════════════════════════

  const saveAttractionMut = useMutation({
    mutationFn: async () => {
      if (middleMoneyEnabled === 'Yes') {
        const mm = parseOptionalDecimal(middleMoneyAmount, 'Middle Money Amount');
        assertParseOk(mm);
        if (mm.value == null) throw new Error('Middle Money Amount is required when Middle Money is Yes.');
      }
      const royaltyRateRes = parseOptionalPercent(royaltyRatePercent, 'Royalty Rate');
      assertParseOk(royaltyRateRes);
      if (royaltyRateRes.value != null && royaltyRateRes.value > 0 && !royaltyBasis.trim()) {
        throw new Error('Royalty Basis is required when Royalty Rate > 0.');
      }
      const guarantee = parseOptionalDecimal(guaranteeAmount, 'Guarantee Amount');
      assertParseOk(guarantee);
      const versus = parseOptionalPercent(versusPercent, 'Versus Percentage');
      assertParseOk(versus);
      const promoterPct = parseOptionalPercent(promoterProfitPercent, 'Promoter Profit %');
      assertParseOk(promoterPct);
      const backendPct = parseOptionalPercent(artistBackendPercent, 'Artist Backend %');
      assertParseOk(backendPct);
      const middleMoney = parseOptionalDecimal(middleMoneyAmount, 'Middle Money Amount');
      assertParseOk(middleMoney);

      await updateEngagementFinance(engagementId, {
        artistDealType: dealType.trim() || null,
        artistGuarantee: guarantee.value,
        artistVersusPercent: dealType === 'Versus' ? versus.value : null,
        artistPromoterProfitPercent: dealType === 'Promoter Profit' ? promoterPct.value : null,
        artistBackendPercent: dealType === 'Promoter Profit' ? backendPct.value : null,
        promoterProfit: dealType === 'Promoter Profit' ? promoterPct.value : null,
        artistRoyaltyRatePercent: royaltyRateRes.value,
        artistRoyaltyBasedOn: (royaltyRateRes.value != null && royaltyRateRes.value > 0) ? royaltyBasis.trim() || null : null,
        artistMiddleMoney: middleMoneyEnabled === 'Yes' ? middleMoney.value : null,
        artistPartOfCollateralizedDeal: isCollateralized === 'Yes' ? true : isCollateralized === 'No' ? false : null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearAttractionEdited(); addToast('Attraction terms saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Venue Deal (EngagementFinances)
  // ══════════════════════════════════════════════════════════════════════════

  const saveVenueDealMut = useMutation({
    mutationFn: async () => {
      // Validate rental forecast URL
      const rfTrimmed = rentalForecastLink.trim();
      if (rfTrimmed && !isValidHttpOrHttpsUrl(rfTrimmed)) {
        throw new Error('Rental Forecast must be a valid http(s) URL, or left empty.');
      }
      await updateEngagementFinance(engagementId, {
        venueDealTypeId: venueDealTypeId ? Number(venueDealTypeId) : null,
      });
      // Upsert or remove Rental Forecast engagement link
      if (rfTrimmed) {
        await upsertEngagementLink(engagementId, { linkUrl: rfTrimmed, linkPurpose: 'Rental Forecast' });
      } else {
        const existing = (venueTabQuery.data?.engagementLinks ?? []).find((el) => el.linkPurpose === 'Rental Forecast');
        if (existing) {
          await removeEngagementLink(engagementId, existing.engagementLinkId);
        }
      }
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
    },
    onSuccess: () => { clearVenueDealEdited(); addToast('Venue deal saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Venue Documents
  // ══════════════════════════════════════════════════════════════════════════

  const saveVenueDocsMut = useMutation({
    mutationFn: async () => {
      const offerTrimmed = confirmedArtistOfferLink.trim();
      const partnerTrimmed = confirmedPartnerForecastLink.trim();
      const rentalTrimmed = confirmedRentalForecastLink.trim();
      if (offerTrimmed && !isValidHttpOrHttpsUrl(offerTrimmed)) throw new Error('Confirmed Artist Offer link must be a valid http(s) URL.');
      if (partnerTrimmed && !isValidHttpOrHttpsUrl(partnerTrimmed)) throw new Error('Confirmed Partner Forecast link must be a valid http(s) URL.');
      if (rentalTrimmed && !isValidHttpOrHttpsUrl(rentalTrimmed)) throw new Error('Confirmed Rental Forecast link must be a valid http(s) URL.');

      // Save confirmed artist offer link → EngagementFinances.FinalAcceptedOfferLink
      await updateEngagementFinance(engagementId, {
        finalAcceptedOfferLink: offerTrimmed || null,
      });

      // Save confirmed partner forecast link → EngagementLink (LinkPurpose = 'VenueForcast')
      if (partnerTrimmed) {
        await upsertEngagementLink(engagementId, { linkUrl: partnerTrimmed, linkPurpose: 'VenueForcast' });
      } else {
        const existing = (venueTabQuery.data?.engagementLinks ?? []).find((el) => el.linkPurpose === 'VenueForcast');
        if (existing) {
          await removeEngagementLink(engagementId, existing.engagementLinkId);
        }
      }

      // Save confirmed rental forecast link → EngagementLink (LinkPurpose = 'Confirmed Rental Forecast')
      if (rentalTrimmed) {
        await upsertEngagementLink(engagementId, { linkUrl: rentalTrimmed, linkPurpose: 'Confirmed Rental Forecast' });
      } else {
        const existing = (venueTabQuery.data?.engagementLinks ?? []).find((el) => el.linkPurpose === 'Confirmed Rental Forecast');
        if (existing) {
          await removeEngagementLink(engagementId, existing.engagementLinkId);
        }
      }

      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
    },
    onSuccess: () => { clearVenueDocsEdited(); addToast('Venue documents saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — 3rd Party Partner (EngagementFinances + PerformanceTicketing)
  // ══════════════════════════════════════════════════════════════════════════

  const saveThirdPartyMut = useMutation({
    mutationFn: async () => {
      const offerTrimmed = thirdPartyArtistOfferLink.trim();
      const partnerTrimmed = thirdPartyPartnerForecastLink.trim();
      const tourOfferTrimmed = thirdPartyTourOfferLink.trim();
      if (offerTrimmed && !isValidHttpOrHttpsUrl(offerTrimmed)) throw new Error('Confirmed Artist Offer link must be a valid http(s) URL.');
      if (partnerTrimmed && !isValidHttpOrHttpsUrl(partnerTrimmed)) throw new Error('Confirmed Partner Forecast link must be a valid http(s) URL.');
      if (tourOfferTrimmed && !isValidHttpOrHttpsUrl(tourOfferTrimmed)) throw new Error('Confirmed Tour Offer link must be a valid http(s) URL.');

      await updateEngagementFinance(engagementId, {
        venueDealType: (thirdPartyDealType.trim() || null) as UpdateEngagementFinancePayload['venueDealType'],
        finalAcceptedOfferLink: offerTrimmed || null,
        artistTourOfferLink: tourOfferTrimmed || null,
      });

      // Partner Forecast → EngagementLink with purpose 'VenueForcast'
      if (partnerTrimmed) {
        await upsertEngagementLink(engagementId, { linkUrl: partnerTrimmed, linkPurpose: 'VenueForcast' });
      } else {
        const existing = (venueTabQuery.data?.engagementLinks ?? []).find((el) => el.linkPurpose === 'VenueForcast');
        if (existing) {
          await removeEngagementLink(engagementId, existing.engagementLinkId);
        }
      }

      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'venue-tab-data'] });
    },
    onSuccess: () => { clearThirdPartyEdited(); addToast('3rd party partner saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Ticketing (PerformanceTicketing)
  // ══════════════════════════════════════════════════════════════════════════

  const saveTicketingMut = useMutation({
    mutationFn: async () => {
      if (ticketingAdministrator === 'IAE Contract' && !boxOfficeLaborRequired.trim()) {
        throw new Error('Box Office Labor is required when Ticketing Administrator is IAE Contract.');
      }
      const facilityFeeAmtParsed = parseOptionalDecimal(facilityFeeAmount, 'Facility Fee Amount');
      assertParseOk(facilityFeeAmtParsed);
      const rebateParsed = parseOptionalDecimal(rebateAmount, 'Rebate Amount');
      assertParseOk(rebateParsed);
      const bumpParsed = parseOptionalDecimal(bumpAmount, 'Bump Amount');
      assertParseOk(bumpParsed);
      const ccFeeParsed = parseOptionalPercent(creditCardFeesAmountPercent, 'Credit Card Fee %');
      assertParseOk(ccFeeParsed);
      const salesTaxParsed = parseOptionalPercent(salesTaxAmountPercent, 'Sales Tax %');
      assertParseOk(salesTaxParsed);

      if (firstPerformanceId == null) throw new Error('No performance exists to save ticketing data.');
      const ticketPayload: UpdatePerformanceTicketingPayload = {
        ticketingSystemCompanyId: ticketingSystemCompanyId ? Number(ticketingSystemCompanyId) : null,
        ticketingAdminContactId: ticketingContactId ? Number(ticketingContactId) : null,
        ticketingAdministrator: (ticketingAdministrator || null) as UpdatePerformanceTicketingPayload['ticketingAdministrator'],
        boxOfficeLaborStaffingRequired: boxOfficeLaborRequired === 'Yes' ? true : boxOfficeLaborRequired === 'No' ? false : null,
        facilityFeeType: (facilityFeeType || null) as UpdatePerformanceTicketingPayload['facilityFeeType'],
        facilityFeeAmount: facilityFeeAmtParsed.value,
        dynamicPricingMode: (dynamicPricingMode || null) as UpdatePerformanceTicketingPayload['dynamicPricingMode'],
        rebateAmount: rebateParsed.value,
        bumpAmount: bumpParsed.value,
        creditCardFeesType: (creditCardFeesType || null) as UpdatePerformanceTicketingPayload['creditCardFeesType'],
        creditCardFeesAmountPercent: ccFeeParsed.value,
        salesTaxType: salesTaxType || null,
        salesTaxAmountPercent: salesTaxParsed.value,
      };
      await updateEngagementPerformanceTicketing(engagementId, firstPerformanceId, ticketPayload);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performance-ticketing'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearTicketingEdited(); addToast('Ticketing saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Marketing (EngagementFinances)
  // ══════════════════════════════════════════════════════════════════════════

  const saveMarketingMut = useMutation({
    mutationFn: async () => {
      const grossMktg = parseOptionalDecimal(grossMarketingBudget, 'Gross Marketing Budget');
      assertParseOk(grossMktg);
      const netMktg = parseOptionalDecimal(netMarketingBudget, 'Net Marketing Budget');
      assertParseOk(netMktg);
      const salesRev = parseOptionalDecimal(salesRevenueGoal, 'Sales Revenue Goal');
      assertParseOk(salesRev);
      const splitPt = parseOptionalDecimal(tourSplitPoint, 'Engagement Tour Split Point');
      assertParseOk(splitPt);

      await updateEngagementFinance(engagementId, {
        grossMarketingBudget: grossMktg.value,
        netMarketingBudget: netMktg.value,
        salesRevenueGoal: salesRev.value,
        tourSplitPoint: splitPt.value,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'finance'] });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId] });
    },
    onSuccess: () => { clearMarketingEdited(); addToast('Marketing saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Travel (EngagementTravel)
  // ══════════════════════════════════════════════════════════════════════════

  const saveTravelMut = useMutation({
    mutationFn: async () => {
      const travelTypes = travelSelections.map((category) => {
        const pays = category === 'Ground Transportation' ? travelGroundIaePays : category === 'Airfare' ? travelAirfareIaePays : travelHotelsIaePays;
        const arranges = category === 'Ground Transportation' ? travelGroundIaeArranges : category === 'Airfare' ? travelAirfareIaeArranges : travelHotelsIaeArranges;
        return {
          travelType: category,
          iaePays: pays === 'Yes' ? true : pays === 'No' ? false : null,
          iaeArranges: arranges === 'Yes' ? true : arranges === 'No' ? false : null,
        };
      });
      await upsertTravelDrillBits(engagementId, travelTypes);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'travel'] });
    },
    onSuccess: () => { clearTravelEdited(); addToast('Travel saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Equipment Rentals (EngagementProductionEquipmentRental)
  // ══════════════════════════════════════════════════════════════════════════

  const saveEquipmentMut = useMutation({
    mutationFn: async () => {
      const types = equipmentTypesQuery.data ?? [];
      const items = equipmentSelections
        .map((name) => {
          const t = types.find((t) => t.typeName === name);
          if (!t) return null;
          const raw = equipmentBudgets[name];
          const budgetAmount = raw ? parseFloat(raw) : null;
          return { equipmentRentalTypeId: t.equipmentRentalTypeId, budgetAmount: budgetAmount != null && !isNaN(budgetAmount) ? budgetAmount : null };
        })
        .filter((x): x is { equipmentRentalTypeId: number; budgetAmount: number | null } => x != null);
      await upsertEquipmentRentals(engagementId, items);
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'equipment-rentals'] });
    },
    onSuccess: () => { clearEquipmentEdited(); addToast('Equipment rentals saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE — Miscellaneous (EngagementProduction)
  // ══════════════════════════════════════════════════════════════════════════

  const saveMiscMut = useMutation({
    mutationFn: async () => {
      const buyoutAmt = buyoutBudget.trim() ? Number(buyoutBudget) : null;
      if (buyoutAmt != null && isNaN(buyoutAmt)) throw new Error('Buyout Budget must be a valid number.');
      await updateProductionMisc(engagementId, {
        runnerRequired: runnerRequired === 'Yes' ? true : runnerRequired === 'No' ? false : null,
        cateringRequired: cateringEnabled === 'Yes' ? true : cateringEnabled === 'No' ? false : null,
        cateringBudgetLineItem: cateringEnabled === 'Yes' ? (cateringBudget.trim() || null) : null,
        productionBuyoutRequired: buyoutsEnabled === 'Yes' ? true : buyoutsEnabled === 'No' ? false : null,
        productionBuyoutDescription: buyoutsEnabled === 'Yes' ? (buyoutDescription.trim() || null) : null,
        productionBuyoutBudgetAmount: buyoutsEnabled === 'Yes' ? buyoutAmt : null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'production-misc'] });
    },
    onSuccess: () => { clearMiscEdited(); addToast('Miscellaneous saved.', 'success'); },
    onError: (e: unknown) => addToast(friendlyApiError(e), 'error'),
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE ADD LOGIC
  // ══════════════════════════════════════════════════════════════════════════

  const createPerformanceMut = useMutation({
    mutationFn: async (rows: { performanceDate: string; performanceTime: string; performanceStatus: string }[]) => {
      for (const r of rows) {
        await createEngagementPerformance(engagementId, {
          performanceDate: r.performanceDate,
          performanceTime: normalizePerformanceTimeInput(r.performanceTime),
          performanceStatus: r.performanceStatus || 'On Sale',
        });
      }
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances'] });
    },
    onSuccess: () => {
      setShowAddPerformance(false);
      setPfRows([{ id: '1', performanceDate: '', performanceTime: '', performanceStatus: 'On Sale' }]);
      addToast('Performance(s) added.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  const addPfRow = () => setPfRows((prev) => [...prev, { id: String(Date.now()), performanceDate: '', performanceTime: '', performanceStatus: 'On Sale' }]);
  const removePfRow = (id: string) => setPfRows((prev) => prev.filter((r) => r.id !== id));
  const updatePfRow = (id: string, patch: Partial<typeof pfRows[number]>) =>
    setPfRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleCreatePerformances = () => {
    const valid = pfRows.every((r) => r.performanceDate.trim() && r.performanceTime.trim());
    if (!valid) {
      addToast('Every performance row must have a date and time.', 'error');
      return;
    }
    createPerformanceMut.mutate(pfRows);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  const SaveBtn = ({ onClick, pending, dirty, label }: { onClick: () => void; pending: boolean; dirty: boolean; label: string }) => (
    <div className="flex justify-end pt-3">
      <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90" onClick={onClick} disabled={pending || !dirty}>
        {pending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : label}
      </Button>
    </div>
  );

  const SavingOverlay = ({ pending }: { pending: boolean }) =>
    pending ? (
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
    ) : null;

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Brand/Series */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveBrandMut.isPending} />
        <SectionHeader title="Brand/Series" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Brand/Series">
            <Select2
              options={brandOptions}
              value={brandId}
              onChange={(value) => { markBrandEdited(); setBrandId(value); }}
              placeholder="---"
              allowClear
              disabled={venueCompanyId == null}
            />
          </FormField>
        </div>
        <SaveBtn onClick={() => saveBrandMut.mutate()} pending={saveBrandMut.isPending} dirty={hasBrandEdited} label="Save Brand/Series" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Production and Performance Schedule */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveProductionMut.isPending} />
        <SectionHeader title="Production and Performance Schedule" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Load-In Date" required>
            <input
              type="date"
              className={inputCls}
              value={loadInDate}
              onChange={(e) => { markProductionEdited(); setLoadInDate(e.target.value); }}
            />
          </FormField>
          <FormField label="Load-In Time" required>
            <input
              type="time"
              className={inputCls}
              value={loadInTime}
              onChange={(e) => { markProductionEdited(); setLoadInTime(e.target.value); }}
            />
          </FormField>
        </div>
        <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2">
          <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
            <span>Is There a Rehearsal?</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={hasRehearsal}
              onChange={(e) => {
                markProductionEdited();
                setHasRehearsal(e.target.checked);
                if (!e.target.checked) { setRehearsalDate(''); setRehearsalTime(''); }
              }}
            />
          </label>
        </div>
        {hasRehearsal && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Rehearsal Date" required>
              <input
                type="date"
                className={inputCls}
                value={rehearsalDate}
                onChange={(e) => { markProductionEdited(); setRehearsalDate(e.target.value); }}
                />
            </FormField>
            <FormField label="Rehearsal Time" required>
              <input
                type="time"
                className={inputCls}
                value={rehearsalTime}
                onChange={(e) => { markProductionEdited(); setRehearsalTime(e.target.value); }}
                />
            </FormField>
          </div>
        )}
        <SaveBtn onClick={() => saveProductionMut.mutate()} pending={saveProductionMut.isPending} dirty={hasProductionEdited} label="Save Production Schedule" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Performance Dates & Times */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Performance Dates & Times" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-text-muted">Each row is one show date and time.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPfRows([{ id: '1', performanceDate: '', performanceTime: '', performanceStatus: 'On Sale' }]);
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
          </div>
        ) : (performancesQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-text-muted/50" />
            <p className="text-sm text-text-muted">No performances yet. Add a show date to get started.</p>
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
                onRefresh={() => qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performances'] })}
                addToast={addToast}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Attraction Terms */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveAttractionMut.isPending} />
        <SectionHeader title="Attraction Terms" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Deal Type">
            <Select2
              options={DEAL_TYPE_OPTIONS}
              value={dealType}
              onChange={(v) => { markAttractionEdited(); setDealType(v); }}
              placeholder="Select…"
            />
          </FormField>
          <FormField label="Guarantee Amount">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={guaranteeAmount}
              onChange={(e) => { markAttractionEdited(); setGuaranteeAmount(e.target.value); }}
              placeholder="$"
            />
          </FormField>

          {dealType === 'Versus' && (
            <FormField label="Versus Percentage">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className={inputCls}
                value={versusPercent}
                onChange={(e) => { markAttractionEdited(); setVersusPercent(e.target.value); }}
                  placeholder="%"
              />
            </FormField>
          )}

          {dealType === 'Promoter Profit' && (
            <>
              <FormField label="Promoter Profit %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputCls}
                  value={promoterProfitPercent}
                  onChange={(e) => { markAttractionEdited(); setPromoterProfitPercent(e.target.value); }}
                      placeholder="%"
                />
              </FormField>
              <FormField label="Artist Backend %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputCls}
                  value={artistBackendPercent}
                  onChange={(e) => { markAttractionEdited(); setArtistBackendPercent(e.target.value); }}
                      placeholder="%"
                />
              </FormField>
            </>
          )}

          <FormField label="Royalty Rate (%)">
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              className={inputCls}
              value={royaltyRatePercent}
              onChange={(e) => { markAttractionEdited(); setRoyaltyRatePercent(e.target.value); }}
              placeholder="%"
            />
          </FormField>

          {Number(royaltyRatePercent) > 0 && (
            <FormField label="Royalty Basis" required>
              <Select2
                options={ROYALTY_BASIS_OPTIONS}
                value={royaltyBasis}
                onChange={(v) => { markAttractionEdited(); setRoyaltyBasis(v); }}
                placeholder="Select…"
                />
            </FormField>
          )}

          <FormField label="Middle Money?">
            <Select2
              options={YES_NO_OPTIONS}
              value={middleMoneyEnabled}
              onChange={(v) => { markAttractionEdited(); setMiddleMoneyEnabled(v); if (v !== 'Yes') setMiddleMoneyAmount(''); }}
              placeholder="Select…"
            />
          </FormField>

          {middleMoneyEnabled === 'Yes' && (
            <FormField label="Middle Money Amount" required>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={middleMoneyAmount}
                onChange={(e) => { markAttractionEdited(); setMiddleMoneyAmount(e.target.value); }}
                  placeholder="$"
              />
            </FormField>
          )}

          <FormField label="Collateralized to Other Engagements?">
            <Select2
              options={YES_NO_OPTIONS}
              value={isCollateralized}
              onChange={(v) => { markAttractionEdited(); setIsCollateralized(v); }}
              placeholder="Select…"
            />
          </FormField>
        </div>
        <SaveBtn onClick={() => saveAttractionMut.mutate()} pending={saveAttractionMut.isPending} dirty={hasAttractionEdited} label="Save Attraction Terms" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Venue Deal */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveVenueDealMut.isPending} />
        <SectionHeader title="Venue Deal" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Venue Deal Type">
            <Select2
              options={venueDealOptions}
              value={venueDealTypeId}
              onChange={(v) => { markVenueDealEdited(); setVenueDealTypeId(v); }}
              placeholder="Select…"
            />
          </FormField>
          <FormField label="Upload Rental Forecast">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className={`${inputCls} flex-1`}
                value={rentalForecastLink}
                onChange={(e) => { markVenueDealEdited(); setRentalForecastLink(e.target.value); }}
                placeholder="https://…"
              />
              {rentalForecastLink.trim() && isValidHttpOrHttpsUrl(rentalForecastLink) && (
                <a href={rentalForecastLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open Rental Forecast">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
        </div>
        <SaveBtn onClick={() => saveVenueDealMut.mutate()} pending={saveVenueDealMut.isPending} dirty={hasVenueDealEdited} label="Save Venue Deal" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Venue */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveVenueDocsMut.isPending} />
        <SectionHeader title="Venue" />
        {(() => {
          const selectedLabel = (venueDealOptions.find((o) => o.value === venueDealTypeId)?.label ?? '').toLowerCase();
          const isCoPro = selectedLabel.includes('copro') || selectedLabel.includes('co-pro') || selectedLabel.includes('co pro');
          const isRental = selectedLabel.includes('rental');

          if (!venueDealTypeId) {
            return <p className="text-sm text-text-muted italic">Select a Venue Deal Type above to view related documents.</p>;
          }

          return (
            <div className="space-y-4">
              {isCoPro && (
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Link to PDF of Confirmed Artist Offer">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        className={`${inputCls} flex-1`}
                        value={confirmedArtistOfferLink}
                        onChange={(e) => { markVenueDocsEdited(); setConfirmedArtistOfferLink(e.target.value); }}
                        placeholder="https://…"
                      />
                      {confirmedArtistOfferLink.trim() && isValidHttpOrHttpsUrl(confirmedArtistOfferLink) && (
                        <a href={confirmedArtistOfferLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </FormField>
                  <FormField label="Link to PDF of Confirmed Partner Forecast">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        className={`${inputCls} flex-1`}
                        value={confirmedPartnerForecastLink}
                        onChange={(e) => { markVenueDocsEdited(); setConfirmedPartnerForecastLink(e.target.value); }}
                        placeholder="https://…"
                      />
                      {confirmedPartnerForecastLink.trim() && isValidHttpOrHttpsUrl(confirmedPartnerForecastLink) && (
                        <a href={confirmedPartnerForecastLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </FormField>
                </div>
              )}
              {isRental && (
                <FormField label="Link to PDF of Confirmed Rental Forecast">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      className={`${inputCls} flex-1`}
                      value={confirmedRentalForecastLink}
                      onChange={(e) => { markVenueDocsEdited(); setConfirmedRentalForecastLink(e.target.value); }}
                      placeholder="https://…"
                    />
                    {confirmedRentalForecastLink.trim() && isValidHttpOrHttpsUrl(confirmedRentalForecastLink) && (
                      <a href={confirmedRentalForecastLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </FormField>
              )}
              {!isCoPro && !isRental && (
                <p className="text-sm text-text-muted italic">No venue documents applicable for this deal type.</p>
              )}
            </div>
          );
        })()}
        <SaveBtn onClick={() => saveVenueDocsMut.mutate()} pending={saveVenueDocsMut.isPending} dirty={hasVenueDocsEdited} label="Save Venue Documents" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: 3rd Party Partner */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveThirdPartyMut.isPending} />
        <SectionHeader title="3rd Party Partner" />
        <div className="grid grid-cols-1 gap-4">
          <FormField label="3rd Party Partner Deal Structure">
            <Select2
              options={thirdPartyPartnerOptions}
              value={thirdPartyDealType}
              onChange={(v) => { markThirdPartyEdited(); setThirdPartyDealType(v); }}
              placeholder="Select…"
            />
          </FormField>
          <FormField label="Link to PDF of Confirmed Artist Offer">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className={`${inputCls} flex-1`}
                value={thirdPartyArtistOfferLink}
                onChange={(e) => { markThirdPartyEdited(); setThirdPartyArtistOfferLink(e.target.value); }}
                placeholder="https://…"
              />
              {thirdPartyArtistOfferLink.trim() && isValidHttpOrHttpsUrl(thirdPartyArtistOfferLink) && (
                <a href={thirdPartyArtistOfferLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
          <FormField label="Link to PDF of Confirmed Partner Forecast">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className={`${inputCls} flex-1`}
                value={thirdPartyPartnerForecastLink}
                onChange={(e) => { markThirdPartyEdited(); setThirdPartyPartnerForecastLink(e.target.value); }}
                placeholder="https://…"
              />
              {thirdPartyPartnerForecastLink.trim() && isValidHttpOrHttpsUrl(thirdPartyPartnerForecastLink) && (
                <a href={thirdPartyPartnerForecastLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
          <FormField label="Link to PDF of Confirmed Tour Offer">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className={`${inputCls} flex-1`}
                value={thirdPartyTourOfferLink}
                onChange={(e) => { markThirdPartyEdited(); setThirdPartyTourOfferLink(e.target.value); }}
                placeholder="https://…"
              />
              {thirdPartyTourOfferLink.trim() && isValidHttpOrHttpsUrl(thirdPartyTourOfferLink) && (
                <a href={thirdPartyTourOfferLink.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
        </div>
        <SaveBtn onClick={() => saveThirdPartyMut.mutate()} pending={saveThirdPartyMut.isPending} dirty={hasThirdPartyEdited} label="Save 3rd Party Partner" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Ticketing */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveTicketingMut.isPending} />
        <SectionHeader title="Ticketing" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Ticketing System Company">
            <Select2
              options={ticketingSystemCompanyOptions}
              value={ticketingSystemCompanyId}
              onChange={(v) => { markTicketingEdited(); setTicketingSystemCompanyId(v); setTicketingContactId(''); }}
              placeholder="Select…"
            />
          </FormField>
          <FormField label="Ticketing System Contact">
            <Select2
              options={ticketingContactOptions}
              value={ticketingContactId}
              onChange={(v) => { markTicketingEdited(); setTicketingContactId(v); }}
              placeholder={ticketingSystemCompanyId ? 'Select contact…' : 'Select a company first'}
              disabled={!ticketingSystemCompanyId}
            />
          </FormField>
          <FormField label="Ticketing Administrator">
            <Select2
              options={TICKETING_ADMIN_OPTIONS}
              value={ticketingAdministrator}
              onChange={(v) => { markTicketingEdited(); setTicketingAdministrator(v); }}
              placeholder="Select…"
            />
          </FormField>

          {ticketingAdministrator === 'IAE Contract' && (
            <FormField label="Do we have to staff Box Office Labor?" required>
              <Select2
                options={YES_NO_OPTIONS}
                value={boxOfficeLaborRequired}
                onChange={(v) => { markTicketingEdited(); setBoxOfficeLaborRequired(v); }}
                placeholder="Select…"
                />
            </FormField>
          )}

          <FormField label="Face Value Type">
            <Select2
              options={FACE_VALUE_TYPE_OPTIONS}
              value={facilityFeeType}
              onChange={(v) => { markTicketingEdited(); setFacilityFeeType(v); }}
              placeholder="Select…"
            />
          </FormField>
          <FormField label="Facility Fee Amount">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={facilityFeeAmount}
              onChange={(e) => { markTicketingEdited(); setFacilityFeeAmount(e.target.value); }}
              placeholder="$"
            />
          </FormField>

          <FormField label="Dynamic Pricing">
            <Select2
              options={DYNAMIC_PRICING_MODE_OPTIONS}
              value={dynamicPricingMode}
              onChange={(v) => { markTicketingEdited(); setDynamicPricingMode(v); }}
              placeholder="Select…"
            />
          </FormField>

          {/* Service Charge Revenue Share */}
          <div className="rounded-lg border border-border bg-surface/40 p-4 sm:col-span-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Service Charge Revenue Share</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Rebate Amount">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputCls}
                  value={rebateAmount}
                  onChange={(e) => { markTicketingEdited(); setRebateAmount(e.target.value); }}
                  placeholder="$"
                />
              </FormField>
              <FormField label="Bump Amount">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputCls}
                  value={bumpAmount}
                  onChange={(e) => { markTicketingEdited(); setBumpAmount(e.target.value); }}
                  placeholder="$"
                />
              </FormField>
            </div>
          </div>

          {/* Credit Card Fees */}
          <div className="rounded-lg border border-border bg-surface/40 p-4 sm:col-span-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Credit Card Fees</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Fee Type">
                <Select2
                  options={FEE_TYPE_OPTIONS}
                  value={creditCardFeesType}
                  onChange={(v) => { markTicketingEdited(); setCreditCardFeesType(v); }}
                  placeholder="Select…"
                    />
              </FormField>
              <FormField label="Amount (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputCls}
                  value={creditCardFeesAmountPercent}
                  onChange={(e) => { markTicketingEdited(); setCreditCardFeesAmountPercent(e.target.value); }}
                      placeholder="%"
                />
              </FormField>
            </div>
          </div>

          {/* Sales Tax */}
          <div className="rounded-lg border border-border bg-surface/40 p-4 sm:col-span-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Sales Tax</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Tax Type">
                <Select2
                  options={SALES_TAX_TYPE_OPTIONS}
                  value={salesTaxType}
                  onChange={(v) => { markTicketingEdited(); setSalesTaxType(v); }}
                  placeholder="Select…"
                    />
              </FormField>
              <FormField label="Amount (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={inputCls}
                  value={salesTaxAmountPercent}
                  onChange={(e) => { markTicketingEdited(); setSalesTaxAmountPercent(e.target.value); }}
                      placeholder="%"
                />
              </FormField>
            </div>
          </div>
        </div>
        <SaveBtn onClick={() => saveTicketingMut.mutate()} pending={saveTicketingMut.isPending} dirty={hasTicketingEdited} label="Save Ticketing" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Marketing */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveMarketingMut.isPending} />
        <SectionHeader title="Marketing" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Gross Marketing Budget">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={grossMarketingBudget}
              onChange={(e) => { markMarketingEdited(); setGrossMarketingBudget(e.target.value); }}
              placeholder="$"
            />
          </FormField>
          <FormField label="Net Marketing Budget">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={netMarketingBudget}
              onChange={(e) => { markMarketingEdited(); setNetMarketingBudget(e.target.value); }}
              placeholder="$"
            />
          </FormField>
          <FormField label="Sales Revenue Goal">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={salesRevenueGoal}
              onChange={(e) => { markMarketingEdited(); setSalesRevenueGoal(e.target.value); }}
              placeholder="$"
            />
          </FormField>
          <FormField label="Engagement Tour Split Point ($)">
            <input
              type="number"
              min={0}
              step={0.01}
              className={inputCls}
              value={tourSplitPoint}
              onChange={(e) => { markMarketingEdited(); setTourSplitPoint(e.target.value); }}
              placeholder="$"
            />
          </FormField>
        </div>
        <SaveBtn onClick={() => saveMarketingMut.mutate()} pending={saveMarketingMut.isPending} dirty={hasMarketingEdited} label="Save Marketing" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Travel */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveTravelMut.isPending} />
        <SectionHeader title="Travel" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {TRAVEL_CATEGORIES.map((category) => (
              <label key={category} className="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={travelSelections.includes(category)}
                  onChange={(e) => {
                    markTravelEdited();
                    if (e.target.checked) {
                      setTravelSelections((prev) => [...prev, category]);
                    } else {
                      setTravelSelections((prev) => prev.filter((x) => x !== category));
                      // Clear fields for deselected category
                      if (category === 'Ground Transportation') { setTravelGroundIaePays(''); setTravelGroundIaeArranges(''); }
                      if (category === 'Airfare') { setTravelAirfareIaePays(''); setTravelAirfareIaeArranges(''); }
                      if (category === 'Hotels') { setTravelHotelsIaePays(''); setTravelHotelsIaeArranges(''); }
                    }
                  }}
                />
                {category}
              </label>
            ))}
          </div>
          {TRAVEL_CATEGORIES.filter((c) => travelSelections.includes(c)).map((category) => {
            const paysSt = category === 'Ground Transportation' ? travelGroundIaePays : category === 'Airfare' ? travelAirfareIaePays : travelHotelsIaePays;
            const setPays = category === 'Ground Transportation' ? setTravelGroundIaePays : category === 'Airfare' ? setTravelAirfareIaePays : setTravelHotelsIaePays;
            const arrangesSt = category === 'Ground Transportation' ? travelGroundIaeArranges : category === 'Airfare' ? travelAirfareIaeArranges : travelHotelsIaeArranges;
            const setArranges = category === 'Ground Transportation' ? setTravelGroundIaeArranges : category === 'Airfare' ? setTravelAirfareIaeArranges : setTravelHotelsIaeArranges;
            return (
              <div key={category} className="rounded-lg border border-border bg-surface/40 p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="IAE Pays">
                    <Select2
                      options={YES_NO_OPTIONS}
                      value={paysSt}
                      onChange={(v) => { markTravelEdited(); setPays(v); }}
                      placeholder="Select…"
                    />
                  </FormField>
                  <FormField label="IAE Arranges">
                    <Select2
                      options={YES_NO_OPTIONS}
                      value={arrangesSt}
                      onChange={(v) => { markTravelEdited(); setArranges(v); }}
                      placeholder="Select…"
                    />
                  </FormField>
                </div>
              </div>
            );
          })}
        </div>
        <SaveBtn onClick={() => saveTravelMut.mutate()} pending={saveTravelMut.isPending} dirty={hasTravelEdited} label="Save Travel" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Equipment Rentals */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveEquipmentMut.isPending} />
        <SectionHeader title="Equipment Rentals" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {(equipmentTypesQuery.data ?? []).map((opt) => (
              <label key={opt.equipmentRentalTypeId} className="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={equipmentSelections.includes(opt.typeName)}
                  onChange={(e) => {
                    markEquipmentEdited();
                    if (e.target.checked) {
                      setEquipmentSelections((prev) => [...prev, opt.typeName]);
                    } else {
                      setEquipmentSelections((prev) => prev.filter((x) => x !== opt.typeName));
                      setEquipmentBudgets((prev) => { const next = { ...prev }; delete next[opt.typeName]; return next; });
                    }
                  }}
                />
                {opt.typeName}
              </label>
            ))}
          </div>
          {equipmentSelections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {equipmentSelections.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-sm text-text-primary w-32 truncate">{name}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Budget $"
                    className="flex-1 rounded border border-border-primary bg-bg-secondary px-3 py-1.5 text-sm text-text-primary"
                    value={equipmentBudgets[name] ?? ''}
                    onChange={(e) => {
                      markEquipmentEdited();
                      setEquipmentBudgets((prev) => ({ ...prev, [name]: e.target.value }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <SaveBtn onClick={() => saveEquipmentMut.mutate()} pending={saveEquipmentMut.isPending} dirty={hasEquipmentEdited} label="Save Equipment Rentals" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION: Miscellaneous */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative">
        <SavingOverlay pending={saveMiscMut.isPending} />
        <SectionHeader title="Miscellaneous" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Runner Required">
            <Select2
              options={YES_NO_OPTIONS}
              value={runnerRequired}
              onChange={(v) => { markMiscEdited(); setRunnerRequired(v); }}
              placeholder="Select…"
            />
          </FormField>

          <FormField label="Catering">
            <Select2
              options={YES_NO_OPTIONS}
              value={cateringEnabled}
              onChange={(v) => { markMiscEdited(); setCateringEnabled(v); if (v !== 'Yes') setCateringBudget(''); }}
              placeholder="Select…"
            />
          </FormField>

          {cateringEnabled === 'Yes' && (
            <FormField label="Catering Budget Line Item" required>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={cateringBudget}
                onChange={(e) => { markMiscEdited(); setCateringBudget(e.target.value); }}
                  placeholder="$"
              />
            </FormField>
          )}

          <FormField label="Buyouts">
            <Select2
              options={YES_NO_OPTIONS}
              value={buyoutsEnabled}
              onChange={(v) => { markMiscEdited(); setBuyoutsEnabled(v); if (v !== 'Yes') { setBuyoutDescription(''); setBuyoutBudget(''); } }}
              placeholder="Select…"
            />
          </FormField>

          {buyoutsEnabled === 'Yes' && (
            <>
              <FormField label="Buyout Description" required>
                <input
                  type="text"
                  className={inputCls}
                  value={buyoutDescription}
                  onChange={(e) => { markMiscEdited(); setBuyoutDescription(e.target.value); }}
                      placeholder="Describe the buyout…"
                />
              </FormField>
              <FormField label="Buyout Budget" required>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputCls}
                  value={buyoutBudget}
                  onChange={(e) => { markMiscEdited(); setBuyoutBudget(e.target.value); }}
                      placeholder="$"
                />
              </FormField>
            </>
          )}
        </div>
        <SaveBtn onClick={() => saveMiscMut.mutate()} pending={saveMiscMut.isPending} dirty={hasMiscEdited} label="Save Miscellaneous" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD PERFORMANCE MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showAddPerformance && (
        <Modal
          title="Add show dates"
          onClose={() => {
            if (createPerformanceMut.isPending) return;
            setShowAddPerformance(false);
          }}
          width={900}
          allowContentOverflow
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Add one or more performances. Each row must have a unique date and time.</p>
            <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
              {pfRows.map((rowDraft, idx) => (
                <div key={rowDraft.id} className="rounded-lg border border-border bg-surface/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Performance {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePfRow(rowDraft.id)}
                      disabled={createPerformanceMut.isPending || pfRows.length <= 1}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-text-secondary hover:text-ems-coral hover:border-ems-coral/40 hover:bg-ems-coral-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                        onChange={(e) => updatePfRow(rowDraft.id, { performanceDate: e.target.value })}
                        disabled={createPerformanceMut.isPending}
                      />
                    </FormField>
                    <FormField label="Show / curtain time" required>
                      <input
                        type="time"
                        className={inputCls}
                        value={rowDraft.performanceTime}
                        onChange={(e) => updatePfRow(rowDraft.id, { performanceTime: e.target.value })}
                        disabled={createPerformanceMut.isPending}
                      />
                    </FormField>
                    <FormField label="Visibility">
                      <Select2
                        options={PERFORMANCE_TICKETING_STATUS_VALUES.map((v) => ({ value: v, label: v }))}
                        value={rowDraft.performanceStatus}
                        onChange={(v) => updatePfRow(rowDraft.id, { performanceStatus: v })}
                        placeholder="Select…"
                        disabled={createPerformanceMut.isPending}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={addPfRow}
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
                onClick={() => setShowAddPerformance(false)}
                disabled={createPerformanceMut.isPending}
                className="text-text-secondary text-sm px-4 py-2 rounded-md hover:text-text-primary hover:bg-hover disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePerformances}
                disabled={createPerformanceMut.isPending}
                className="bg-ems-accent text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-ems-accent/90 disabled:opacity-50 transition-colors"
              >
                {createPerformanceMut.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </span>
                ) : (
                  `Create ${pfRows.length} Performance${pfRows.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
