/**
 * EngagementTicketingTab — refactored Ticketing tab.
 * Primarily read-only summary sourced from Drill Bits, Contacts, Venue, and Tour.
 * VIP Packages and Comp Tickets remain editable.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { FormField } from './Primitives';
import { Select2, type Select2Option } from './Select2';
import { Button } from '@/components/ui/button';
import {
  fetchEngagementFinance,
  fetchEngagementPerformances,
  fetchEngagementPerformanceTicketing,
  updateEngagementPerformanceTicketing,
  fetchEngagementIaeContactLookups,
  fetchEngagementIaeContacts,
  fetchEngagementVenueTabData,
  fetchPerformancesWithTicketingSummary,
  type ApiEngagementListRow,
  type UpdatePerformanceTicketingPayload,
} from '@/api/engagementApi';
import { fetchCompanies } from '@/api/companyApi';
import { fetchTourMarketing, type ApiTourTicketingOfferCode } from '@/api/tourMarketingApi';
import { friendlyApiError } from '@/lib/friendlyApiError';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const YES_NO_OPTIONS: Select2Option[] = [
  { value: '', label: 'Not set' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const VIP_PACKAGE_BENEFITS = [
  'Meet & Greet without Photo',
  'Meet & Greet with Photo',
  'Merchandise Provided',
  'Poster',
  'Souvenir Laminate',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPerformanceDateDisplay(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return isoDate; }
}

function formatPerformanceTimeDisplay(sqlTime: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(sqlTime.trim());
  if (!m) return sqlTime;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function normalizeRoleMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const fmtCurrency = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v) : '—';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  engagementId: number;
  row: ApiEngagementListRow;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onDirtyChange?: (dirty: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EngagementTicketingRefactored({ engagementId, row, addToast, onDirtyChange }: Props) {
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const financeQuery = useQuery({
    queryKey: ['engagements', engagementId, 'finance'],
    queryFn: () => fetchEngagementFinance(engagementId),
    retry: 1,
  });

  const performancesQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances'],
    queryFn: () => fetchEngagementPerformances(engagementId),
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const ticketingSummaryQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performances-ticketing-summary'],
    queryFn: () => fetchPerformancesWithTicketingSummary(engagementId),
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
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

  const companiesQuery = useQuery({
    queryKey: ['companies', 'ticketing-systems'],
    queryFn: () => fetchCompanies(0, 10_000),
    staleTime: 60_000,
  });

  // First performance ticketing data (for ticketing fields)
  const firstPerformanceId = (performancesQuery.data ?? [])[0]?.performanceId ?? null;
  const ticketingQuery = useQuery({
    queryKey: ['engagements', engagementId, 'performance-ticketing', firstPerformanceId] as const,
    queryFn: () => fetchEngagementPerformanceTicketing(engagementId, firstPerformanceId!),
    enabled: firstPerformanceId != null && firstPerformanceId > 0,
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Tour Marketing (Ticketing Offer Codes from the tour linked to this engagement)
  const tourMarketingQuery = useQuery({
    queryKey: ['tour-marketing', row.tourId],
    queryFn: () => fetchTourMarketing(row.tourId),
    enabled: row.tourId != null && row.tourId > 0,
    staleTime: 60_000,
  });
  const tourOfferCodes = useMemo(() => tourMarketingQuery.data?.offerCodes ?? [], [tourMarketingQuery.data]);

  // ── Derived: IAE Ticketing Manager ────────────────────────────────────────
  const iaeTicketingManagerName = useMemo(() => {
    const roles = iaeLookupsQuery.data?.roles ?? [];
    const aliases = new Set(['ticketingmanager', 'iaeticketingmanager']);
    const matchingRoleIds = roles.filter((r) => aliases.has(normalizeRoleMatchText(r.label))).map((r) => r.id);
    if (!matchingRoleIds.length) return '';
    const contacts = (iaeContactsQuery.data ?? []).filter((c) => c.roleId != null && matchingRoleIds.includes(c.roleId));
    return contacts.map((c) => c.contactLabel).join(', ');
  }, [iaeLookupsQuery.data?.roles, iaeContactsQuery.data]);

  // ── Derived: Ticketing Company ────────────────────────────────────────────
  const ticketingCompanyName = useMemo(() => {
    const compId = ticketingQuery.data?.ticketingSystemCompanyId;
    if (!compId) return null;
    const company = (companiesQuery.data?.data ?? []).find((c) => c.companyId === compId);
    return company?.companyName ?? null;
  }, [ticketingQuery.data?.ticketingSystemCompanyId, companiesQuery.data?.data]);

  const ticketingAdminContactName = ticketingQuery.data?.ticketingAdminContactName ?? null;

  // ── Derived: Seating chart ────────────────────────────────────────────────
  const primaryVenue = useMemo(
    () => (venueTabQuery.data?.venues ?? []).find((v) => v.isPrimary) ?? (venueTabQuery.data?.venues ?? [])[0] ?? null,
    [venueTabQuery.data?.venues],
  );

  // ── VIP Packages state ────────────────────────────────────────────────────
  const [vipPackageOffered, setVipPackageOffered] = useState('');
  const [vipPackageName, setVipPackageName] = useState('');
  const [vipPackageBenefits, setVipPackageBenefits] = useState<string[]>([]);

  const [compTicketForm, setCompTicketForm] = useState('');
  const [compTicketExcelSheet, setCompTicketExcelSheet] = useState('');

  // ── Purchase Links state ──────────────────────────────────────────────────
  const [presaleLinkUrl, setPresaleLinkUrl] = useState('');
  const [publicSaleLinkUrl, setPublicSaleLinkUrl] = useState('');

  useEffect(() => {
    const d = ticketingQuery.data;
    if (!d) return;
    setVipPackageOffered(d.vipPackageOffered == null ? '' : d.vipPackageOffered ? 'Yes' : 'No');
    setVipPackageName(d.vipPackageName ?? '');
    setVipPackageBenefits(d.vipPackageBenefits ?? []);
    setCompTicketForm(d.compTicketForm ?? '');
    setCompTicketExcelSheet(d.compTicketExcelSheet ?? '');
    setPresaleLinkUrl(d.ticketingLinkUrl ?? '');
    setPublicSaleLinkUrl(d.publicSaleLinkUrl ?? '');
  }, [ticketingQuery.data]);

  const toggleVipBenefit = (b: string) => {
    setVipPackageBenefits((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  };

  // ── VIP Save ──────────────────────────────────────────────────────────────
  const saveVipMut = useMutation({
    mutationFn: async () => {
      if (firstPerformanceId == null) throw new Error('No performance exists.');
      await updateEngagementPerformanceTicketing(engagementId, firstPerformanceId, {
        vipPackageOffered: vipPackageOffered === 'Yes' ? true : vipPackageOffered === 'No' ? false : null,
        vipPackageName: vipPackageName.trim() || null,
        vipPackageBenefits: vipPackageBenefits.length > 0 ? vipPackageBenefits : null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performance-ticketing'] });
    },
    onSuccess: () => addToast('VIP Packages saved.', 'success'),
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  // ── Comp Ticket Save ──────────────────────────────────────────────────────
  const saveCompMut = useMutation({
    mutationFn: async () => {
      if (firstPerformanceId == null) throw new Error('No performance exists.');
      await updateEngagementPerformanceTicketing(engagementId, firstPerformanceId, {
        compTicketForm: compTicketForm.trim() || null,
        compTicketExcelSheet: compTicketExcelSheet.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performance-ticketing'] });
    },
    onSuccess: () => addToast('Comp ticket request saved.', 'success'),
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  // ── Purchase Links Save ───────────────────────────────────────────────────
  const saveLinksMut = useMutation({
    mutationFn: async () => {
      if (firstPerformanceId == null) throw new Error('No performance exists.');
      await updateEngagementPerformanceTicketing(engagementId, firstPerformanceId, {
        ticketingLinkUrl: presaleLinkUrl.trim() || null,
        publicSaleLinkUrl: publicSaleLinkUrl.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ['engagements', engagementId, 'performance-ticketing'] });
    },
    onSuccess: () => addToast('Purchase links saved.', 'success'),
    onError: (e) => addToast(friendlyApiError(e), 'error'),
  });

  // ── Dirty tracking for tab switch guard ──────────────────────────────────
  const isDirty = saveVipMut.isPending || saveCompMut.isPending;
  useEffect(() => { onDirtyChange?.(isDirty); return () => onDirtyChange?.(false); }, [isDirty, onDirtyChange]);

  // ── Section header helper ─────────────────────────────────────────────────
  const sectionHeader = (title: string) => (
    <div className="border-b border-border pb-2 mb-3">
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wide">{title}</h4>
    </div>
  );

  const readOnlyField = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-sm text-text-primary">{value || '—'}</span>
    </div>
  );

  const td = ticketingQuery.data;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-6">
      <h3 className="text-base font-semibold text-text-primary">Ticketing</h3>

      {/* ── IAE TICKETING ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('IAE Ticketing')}
        {readOnlyField('IAE Ticketing Manager', iaeTicketingManagerName || '— not assigned —')}
        <p className="text-xs text-text-muted italic">From Engagement Contacts → IAE Staff.</p>
      </div>

      {/* ── PERFORMANCE SCHEDULE ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
        {sectionHeader('Performance Schedule with Gross Potential and Capacity')}
        {ticketingSummaryQuery.isLoading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (ticketingSummaryQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">No performances.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Sellable Capacity</th>
                  <th className="text-right py-2 px-3">Gross Potential</th>
                </tr>
              </thead>
              <tbody>
                {(ticketingSummaryQuery.data ?? []).map((p) => (
                  <tr key={p.performanceId} className="border-b border-border/50">
                    <td className="py-2 px-3">{formatPerformanceDateDisplay(p.performanceDate)}</td>
                    <td className="py-2 px-3">{formatPerformanceTimeDisplay(p.performanceTime)}</td>
                    <td className="py-2 px-3">{p.performanceStatus}</td>
                    <td className="py-2 px-3 text-right">{p.sellableCapacity?.toLocaleString() ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{fmtCurrency(p.grossPotentialRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits → Performance Dates.</p>
      </div>

      {/* ── TICKETING SOFTWARE ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Ticketing Software')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {readOnlyField('Ticketing Administrator Company', ticketingCompanyName)}
          {readOnlyField('Ticketing Administrator Contact', ticketingAdminContactName)}
        </div>
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits.</p>
      </div>

      {/* ── CREDIT CARD FEES ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Credit Card Fees')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {readOnlyField('Fee Type', td?.creditCardFeesType)}
          {readOnlyField('Amount (%)', td?.creditCardFeesAmountPercent != null ? `${td.creditCardFeesAmountPercent}%` : null)}
        </div>
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits.</p>
      </div>

      {/* ── FACILITY FEE ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Facility Fee')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {readOnlyField('Fee Type', td?.facilityFeeType)}
          {readOnlyField('Facility Fee Amount', td?.facilityFeeAmount != null ? fmtCurrency(td.facilityFeeAmount) : null)}
        </div>
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits.</p>
      </div>

      {/* ── SALES TAX ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Sales Tax')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {readOnlyField('Tax Type', td?.salesTaxType)}
          {readOnlyField('Amount (%)', td?.salesTaxAmountPercent != null ? `${td.salesTaxAmountPercent}%` : null)}
        </div>
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits.</p>
      </div>

      {/* ── REBATES ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Rebates')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {readOnlyField('Rebate Amount', td?.rebateAmount != null ? fmtCurrency(td.rebateAmount) : null)}
          {readOnlyField('Bump Amount', td?.bumpAmount != null ? fmtCurrency(td.bumpAmount) : null)}
        </div>
        <p className="text-xs text-text-muted italic">From Engagement Drill Bits.</p>
      </div>

      {/* ── SEATING CHART ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-2">
        {sectionHeader('Seating Chart')}
        {primaryVenue?.seatingChartLinkUrl ? (
          <div className="space-y-2">
            <a href={primaryVenue.seatingChartLinkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-ems-accent hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> View Seating Chart
            </a>
            <img src={primaryVenue.seatingChartLinkUrl} alt="Seating Chart" className="max-w-full rounded-md border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        ) : (
          <p className="text-sm text-text-muted">No seating chart uploaded.</p>
        )}
        <p className="text-xs text-text-muted italic">From Venue tab.</p>
      </div>

      {/* ── PURCHASE LINKS (editable) ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
        {sectionHeader('Purchase Links')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Presale Ticketing Link">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className="w-full flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50"
                value={presaleLinkUrl}
                onChange={(e) => setPresaleLinkUrl(e.target.value)}
                placeholder="https://…"
                disabled={saveLinksMut.isPending}
              />
              {presaleLinkUrl.trim() && (
                <a href={presaleLinkUrl.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
          <FormField label="Public Sale Ticketing Link">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className="w-full flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50"
                value={publicSaleLinkUrl}
                onChange={(e) => setPublicSaleLinkUrl(e.target.value)}
                placeholder="https://…"
                disabled={saveLinksMut.isPending}
              />
              {publicSaleLinkUrl.trim() && (
                <a href={publicSaleLinkUrl.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveLinksMut.mutate()} disabled={saveLinksMut.isPending}>
            {saveLinksMut.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : 'Save Purchase Links'}
          </Button>
        </div>
      </div>

      {/* ── PROMOTIONAL PASSWORDS & PURPOSE (from Tour Ticketing Offer Codes) ── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
        {sectionHeader('Promotional Passwords & Purpose')}
        {tourMarketingQuery.isLoading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading offer codes…</div>
        ) : tourOfferCodes.length === 0 ? (
          <p className="text-sm text-text-muted">No ticketing offer codes configured on the linked tour.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  <th className="text-left py-2 px-3">Code</th>
                  <th className="text-left py-2 px-3">Purpose</th>
                  <th className="text-left py-2 px-3">Assigned To</th>
                  <th className="text-left py-2 px-3">IAE SMS</th>
                </tr>
              </thead>
              <tbody>
                {tourOfferCodes.map((oc) => (
                  <tr key={oc.offerCodeId} className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium text-text-primary">{oc.code}</td>
                    <td className="py-2 px-3 text-text-secondary">{oc.purpose || '—'}</td>
                    <td className="py-2 px-3 text-text-secondary">{oc.assignedTo || '—'}</td>
                    <td className="py-2 px-3 text-text-secondary">{oc.iaeSms || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-text-muted italic">From Tour Ticketing Offer Codes (Tour: {row.tourName || `#${row.tourId}`}).</p>
      </div>

      {/* ── VIP TICKET PACKAGES (editable) ────────────────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
        {sectionHeader('VIP Ticket Packages')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="VIP Package Offered?">
            <Select2 options={YES_NO_OPTIONS} value={vipPackageOffered}
              onChange={(v) => setVipPackageOffered(v)} placeholder="Select…" allowClear
              disabled={saveVipMut.isPending} />
          </FormField>
        </div>
        {vipPackageOffered === 'Yes' && (
          <div className="space-y-4">
            <FormField label="Package Name">
              <input
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50"
                value={vipPackageName}
                maxLength={255}
                onChange={(e) => setVipPackageName(e.target.value)}
                disabled={saveVipMut.isPending}
              />
            </FormField>
            <div>
              <span className="text-sm font-medium text-text-primary block mb-2">Benefits</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {VIP_PACKAGE_BENEFITS.map((benefit) => (
                  <label key={benefit} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={vipPackageBenefits.includes(benefit)}
                      onChange={() => toggleVipBenefit(benefit)}
                      disabled={saveVipMut.isPending}
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
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveVipMut.mutate()} disabled={saveVipMut.isPending}>
            {saveVipMut.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : 'Save VIP Packages'}
          </Button>
        </div>
      </div>

      {/* ── COMPLIMENTARY TICKET REQUEST (editable) ───────────────────── */}
      <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
        {sectionHeader('Complimentary Ticket Request')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Comp Ticket Form Link">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className="w-full flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50"
                value={compTicketForm}
                onChange={(e) => setCompTicketForm(e.target.value)}
                placeholder="https://…"
                disabled={saveCompMut.isPending}
              />
              {compTicketForm.trim() && (
                <a href={compTicketForm.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
          <FormField label="Comp Ticket Excel Sheet">
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                className="w-full flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-ems-accent/50"
                value={compTicketExcelSheet}
                onChange={(e) => setCompTicketExcelSheet(e.target.value)}
                placeholder="https://…"
                disabled={saveCompMut.isPending}
              />
              {compTicketExcelSheet.trim() && (
                <a href={compTicketExcelSheet.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ems-accent hover:text-ems-accent/80" title="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </FormField>
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button type="button" size="sm" className="bg-ems-accent text-white hover:opacity-90"
            onClick={() => saveCompMut.mutate()} disabled={saveCompMut.isPending}>
            {saveCompMut.isPending ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span> : 'Save Comp Tickets'}
          </Button>
        </div>
      </div>
    </div>
  );
}
