import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { patchEachInList, removeQueriesByPrefix } from '@/api/cacheHelpers';
import {
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  TabBar,
  Drawer,
  Modal,
  FormField,
  ActionMenu,
  StatusBadge,
} from './Primitives';
import { Select2, Select2Multi, type Select2Option } from './Select2';
import { companyToSelect2Options } from './companySelectOptions';
import { TourMarketingPanel } from './TourMarketingPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  createAttraction,
  createTour,
  deleteAttraction,
  deleteTour,
  attractionsListQueryKey,
  toursListQueryKey,
  attractionsServerSearchKeyPrefix,
  toursServerSearchKeyPrefix,
  fetchAttractions,
  fetchClasses,
  fetchTourEngagements,
  fetchTourProjects,
  fetchTourAgeRanges,
  fetchAdvertisingSubTypes,
  fetchTours,
  fetchVenueTypesLookup,
  updateAttraction,
  updateTour,
  type ApiAttractionListRow,
  type ApiClass,
  type ApiAgeRange,
  type ApiTourEngagementRow,
  type ApiTourListRow,
  type ApiVenueType,
  type ApiTourMediaMixItem,
  type ApiTourProjectRow,
} from '@/api/attractionToursApi';
import {
  fetchCompanies,
  COMPANIES_PICKER_LIMIT,
  fetchCompanyContacts,
  createCompanyContact,
  fetchLookups,
  type ApiCompanyContact,
  type ApiCompanyListRow,
  type ApiRole,
  type ApiDepartment,
} from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { clearFormFieldError } from '@/lib/clearFormFieldError';
import {
  getPageParams,
  getTotalPages,
  getPageRange,
  PAGE_SIZE,
  type PageSizeOption,
  isAllPageSize,
} from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';
import {
  formatE164ForDisplay,
  type PhoneCountrySelection,
  parsePhoneFieldValue,
  tryE164FromDisplay,
  PHONE_INVALID_MESSAGE,
} from '@/lib/contactPhoneField';
import { DEFAULT_PHONE_COUNTRY } from '@/lib/contactPhoneOptions';
import { ContactPhoneRow } from './ContactPhoneRow';
import { type ApiPaginatedResponse } from '@/api/attractionToursApi';
import { TOUR_STATUS_OPTIONS } from './tourFormLegacy';
import { AddTourForm } from './AddTourForm';
import { richTextMatches } from './searchUtils';

const AUDIENCE_GENDER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'All', label: 'All' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
] as const;

/**
 * Company picklist plus the tour's current company when that company is not in
 * the loaded list, so the UI shows a name instead of a raw ID.
 */
function buildTourManagementSelectOptions(
  companyOptions: Select2Option[],
  allCompanies: { companyId: number; companyName: string }[],
  currentCompanyId: number | null | undefined,
  currentCompanyName: string | null | undefined,
): Select2Option[] {
  const opts = [...companyOptions];
  const idStr =
    currentCompanyId != null && Number.isFinite(Number(currentCompanyId))
      ? String(currentCompanyId)
      : '';
  if (idStr && !opts.some((o) => o.value === idStr)) {
    const fromTour = currentCompanyName?.trim();
    const fromList = allCompanies.find((c) => String(c.companyId) === idStr)?.companyName;
    const label = fromTour || fromList || 'Other company';
    opts.push({ value: idStr, label });
  }
  opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return [{ value: '', label: '—' }, ...opts];
}

/** Matches Companies page loading + table shell styling. */
function AttractionToursTableSkeleton({
  variant,
  rowCount = PAGE_SIZE,
}: {
  variant: 'attractions' | 'tours';
  rowCount?: number;
}) {
  const isAttr = variant === 'attractions';
  const colCount = isAttr ? 2 : 5;
  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden min-h-[28rem]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 border-b border-border bg-surface/40">
        <Loader2 className="h-11 w-11 text-ems-accent animate-spin shrink-0" aria-hidden />
        <div className="text-center max-w-sm space-y-1">
          <p className="text-sm font-semibold text-text-primary">
            {isAttr ? 'Loading attractions' : 'Loading tours'}
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            This may take a moment on large lists.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-clip">
        <table className={`w-full text-sm ${isAttr ? 'min-w-[520px]' : 'min-w-[800px]'}`}>
          <thead>
            <tr className="text-text-muted text-xs border-b border-border bg-surface">
              {isAttr ? (
                <>
                  <th className="text-left py-2.5 px-3">Attraction Name</th>
                  <th className="text-left py-2.5 px-3">Active Tours</th>
                </>
              ) : (
                <>
                  <th className="text-left py-2.5 px-3">Tour Name</th>
                  <th className="text-left py-2.5 px-3">Attraction</th>
                  <th className="text-left py-2.5 px-3">Class</th>
                  <th className="text-left py-2.5 px-3">Talent Agency</th>
                  <th className="w-10" />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j} className="py-2.5 px-3">
                    <Skeleton className="h-4 w-full max-w-[10rem]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Props {
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate?: (view: string, data?: Record<string, unknown>) => void;
}

type AttractionsViewMode = 'list' | 'tiles';
const ATTRACTIONS_VIEW_MODE_STORAGE_KEY = 'iae-attractions-view-mode-v1';
const ATTRACTIONS_SORT_STATE_STORAGE_KEY = 'iae-attractions-sort-state-v1';
const TOURS_SORT_STATE_STORAGE_KEY = 'iae-tours-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';

/**
 * Tile view only. Large = original 1 / 2 / 3-column grid, full-width cards.
 * Medium/Small = extra columns (5 / 6 on xl) so each tile is ~66% / ~50% of a large tile’s width without empty gutters.
 */
type AttractionsTileSize = 'large' | 'medium' | 'small';
const ATTRACTIONS_TILE_SIZE_STORAGE_KEY = 'iae-attractions-tile-size-v1';

function licenseSummary(t: ApiTourListRow): string {
  const parts: string[] = [];
  if (t.ascap) parts.push('ASCAP');
  if (t.bmi) parts.push('BMI');
  if (t.sesac) parts.push('SESAC');
  if (t.gmr) parts.push('GMR');
  return parts.length ? parts.join(' · ') : '—';
}

function loadAttractionsViewMode(): AttractionsViewMode {
  if (typeof window === 'undefined') return 'tiles';
  try {
    const raw = localStorage.getItem(ATTRACTIONS_VIEW_MODE_STORAGE_KEY);
    return raw === 'list' || raw === 'tiles' ? raw : 'tiles';
  } catch {
    return 'tiles';
  }
}

function saveAttractionsViewMode(mode: AttractionsViewMode) {
  try {
    localStorage.setItem(ATTRACTIONS_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function loadAttractionsTileSize(): AttractionsTileSize {
  if (typeof window === 'undefined') return 'large';
  try {
    const raw = localStorage.getItem(ATTRACTIONS_TILE_SIZE_STORAGE_KEY);
    return raw === 'large' || raw === 'medium' || raw === 'small' ? raw : 'large';
  } catch {
    return 'large';
  }
}

function saveAttractionsTileSize(size: AttractionsTileSize) {
  try {
    localStorage.setItem(ATTRACTIONS_TILE_SIZE_STORAGE_KEY, size);
  } catch {
    /* ignore */
  }
}

function loadAttractionsSortState(): {
  col: 'name' | 'tours';
  dir: 'asc' | 'desc';
} {
  if (typeof window === 'undefined') return { col: 'name', dir: 'asc' };
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
      return { col: 'name', dir: 'asc' };
    }
    const raw = localStorage.getItem(ATTRACTIONS_SORT_STATE_STORAGE_KEY);
    if (!raw) return { col: 'name', dir: 'asc' };
    const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
    const col = parsed.col === 'tours' ? 'tours' : 'name';
    const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
    return { col, dir };
  } catch {
    return { col: 'name', dir: 'asc' };
  }
}

function saveAttractionsSortState(state: { col: 'name' | 'tours'; dir: 'asc' | 'desc' }) {
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
    localStorage.setItem(ATTRACTIONS_SORT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function loadToursSortState(): {
  col: 'tour' | 'attraction' | 'class' | 'management';
  dir: 'asc' | 'desc';
} {
  if (typeof window === 'undefined') return { col: 'tour', dir: 'asc' };
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
      return { col: 'tour', dir: 'asc' };
    }
    const raw = localStorage.getItem(TOURS_SORT_STATE_STORAGE_KEY);
    if (!raw) return { col: 'tour', dir: 'asc' };
    const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
    const validCols = new Set(['tour', 'attraction', 'class', 'management']);
    const col =
      typeof parsed.col === 'string' && validCols.has(parsed.col)
        ? (parsed.col as 'tour' | 'attraction' | 'class' | 'management')
        : 'tour';
    const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
    return { col, dir };
  } catch {
    return { col: 'tour', dir: 'asc' };
  }
}

function saveToursSortState(state: {
  col: 'tour' | 'attraction' | 'class' | 'management';
  dir: 'asc' | 'desc';
}) {
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
    localStorage.setItem(TOURS_SORT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'AT';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function getThumbnailUrl(entity: Record<string, unknown>): string | null {
  const keys = [
    'thumbnailUrl',
    'attractionThumbnailUrl',
    'tourThumbnailUrl',
    'tourBannerImageUrl',
    'latestTourBannerImageUrl',
    'imageUrl',
    'posterUrl',
  ];
  for (const key of keys) {
    const val = entity[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

const moneyNoCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatEngagementDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatEngagementTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function formatEngagementOpening(e: ApiTourEngagementRow): string {
  const date = formatEngagementDate(e.openingPerformanceDate);
  const time = formatEngagementTime(e.openingPerformanceTime);
  return [date, time].filter(Boolean).join(' · ') || 'Opening show not set';
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString();
}

function formatMoney(value: number | null | undefined): string {
  return value == null ? '—' : moneyNoCents.format(value);
}

function engagementVenueLabel(e: ApiTourEngagementRow): string {
  return e.venueCompanyName?.trim() || e.venueName?.trim() || 'Venue not set';
}

function engagementLocationLabel(e: ApiTourEngagementRow): string {
  const location = [e.city, e.stateProvince].filter(Boolean).join(', ');
  return location || e.dmaMarketName || 'Location not set';
}

/** Splits "NKU Technologies (Pvt) Ltd (Confirmed)" into its label and trailing stage. */
function splitTrailingStage(name: string): { label: string; stage: string } {
  const match = name.match(/^(.*?)\s*\(([^()]+)\)$/);
  return match ? { label: match[1], stage: match[2] } : { label: name, stage: '' };
}

/** Chip colors keyed off the stage word so states read distinctly, not uniformly green. */
function stageChipCls(stage: string): string {
  switch (stage.trim().toLowerCase()) {
    case 'confirmed':
    case 'executed':
    case 'signed':
      return 'border-ems-green text-ems-green';
    case 'drafted':
    case 'submitted':
    case 'pending':
      return 'border-ems-amber text-ems-amber';
    case 'cancelled':
    case 'canceled':
    case 'rejected':
    case 'void':
      return 'border-ems-coral text-ems-coral';
    default:
      return 'border-border text-text-secondary';
  }
}

/** One project/engagement row: name carries the scan, stage chip sits flush right. */
function StatusItemRow({ name }: { name: string }) {
  const { label, stage } = splitTrailingStage(name);
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span className="min-w-0 flex-1 truncate text-text-primary" title={label}>
        {label}
      </span>
      {stage && (
        <span
          className={`shrink-0 inline-flex items-center rounded-full border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${stageChipCls(stage)}`}
        >
          {stage}
        </span>
      )}
    </li>
  );
}

/** Labelled group of status rows, with its count echoed in the header. */
function StatusItemGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-text-muted tabular-nums">{items.length}</span>
      </div>
      <ul className="space-y-1">
        {items.map((name, i) => (
          <StatusItemRow key={i} name={name} />
        ))}
      </ul>
    </div>
  );
}

/** Read-only tour summary when viewing an attraction, with quick-open to Tours tab. */
function TourCardReadOnly({
  t,
  onOpenTour,
}: {
  t: ApiTourListRow;
  onOpenTour: (tour: ApiTourListRow) => void;
}) {
  const hasEngagements = t.engagementCount > 0;
  const hasProjects = t.projectCount > 0;
  const statusLabel = hasEngagements ? 'Confirmed' : hasProjects ? 'Project' : null;
  const projectsText = `${t.projectCount} project${t.projectCount === 1 ? '' : 's'}`;
  const engagementsText = `${t.engagementCount} engagement${t.engagementCount === 1 ? '' : 's'}`;
  const statusSummary = hasEngagements
    ? hasProjects
      ? `${projectsText} · ${engagementsText}`
      : `${engagementsText} linked`
    : hasProjects
      ? `${projectsText} · no engagements yet`
      : null;
  const statusBgCls = hasEngagements ? 'bg-ems-green-dim' : 'bg-ems-amber-dim';
  const statusTextCls = hasEngagements ? 'text-ems-green' : 'text-ems-amber';
  const statusBorderCls = hasEngagements ? 'border-ems-green' : 'border-ems-amber';
  const statusAccentCls = hasEngagements ? 'border-l-ems-green' : 'border-l-ems-amber';
  const statusDotCls = hasEngagements ? 'bg-ems-green' : 'bg-ems-amber';

  return (
    <button
      type="button"
      onClick={() => onOpenTour(t)}
      className="w-full text-left bg-elevated border border-border rounded-lg p-3 space-y-2.5 hover:bg-hover/60 transition-colors"
      title="Open this tour in Tours tab"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-text-primary font-medium leading-snug">{t.tourName}</div>
          <div className="mt-2">
            <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">
              Genre / Class
            </span>
            <div className="text-sm text-text-primary">{t.className || '—'}</div>
          </div>
        </div>
        <span className="text-[10px] text-text-muted shrink-0 text-right max-w-[40%]" title={licenseSummary(t)}>
          {licenseSummary(t)}
        </span>
      </div>
      <div className="text-[11px] text-text-secondary">
        <span className="text-text-muted">Talent Agency </span>
        {t.talentAgencyCompanyName ?? '—'}
      </div>
      {(hasProjects || hasEngagements) ? (
        <div className={`mt-2 rounded-md border-l-2 px-3 py-2.5 ${statusAccentCls} ${statusBgCls}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] text-text-secondary">{statusSummary}</span>
          </div>
          {(t.projectNames.length > 0 || t.engagementNames.length > 0) && (
            <div className="mt-2.5 border-t border-border pt-2.5 space-y-3">
              {t.projectNames.length > 0 && (
                <div>
                  <div className="text-[11px] text-text-primary font-medium">
                    {t.attractionName} — {t.tourName}
                  </div>
                  <div className="text-[11px] text-text-secondary mb-1">
                    {t.talentAgencyCompanyName ?? '—'}
                  </div>
                  <ul className="space-y-1">
                    {t.projectNames.map((name, i) => {
                      const { label, stage } = splitTrailingStage(name);
                      return (
                        <li key={`p-${i}`} className="flex items-center justify-end gap-2 text-[11px]">
                          {/* //<span className="min-w-0 truncate text-text-primary" title={label}>{label}</span> */}
                          {stage && (
                            <span className={`shrink-0 inline-flex items-center rounded-full border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${stageChipCls(stage)}`}>
                              {stage}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {t.engagementNames.length > 0 && (
                <div>
                  <ul className="space-y-1">
                    {t.engagementNames.map((name, i) => (
                      <StatusItemRow key={i} name={name} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 rounded-md border-l-2 border-l-border px-3 py-2 bg-elevated">
          <span className="text-[11px] text-text-muted">No engagements or projects linked yet.</span>
        </div>
      )}
    </button>
  );
}

function EngagementCardReadOnly({
  engagement,
  onOpen,
}: {
  engagement: ApiTourEngagementRow;
  onOpen: (engagementId: number) => void;
}) {
  const title =
    engagement.displayTitle ||
    engagement.attractionName ||
    `Engagement #${engagement.engagementId}`;
  const status = engagement.engagementStatus || 'Unknown';

  return (
    <button
      type="button"
      onClick={() => onOpen(engagement.engagementId)}
      className="w-full text-left bg-elevated border border-border rounded-lg p-3 hover:bg-hover/60 transition-colors"
      title="Open this engagement"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text-primary leading-snug break-words" title={title}>
            {title}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {engagement.attractionName ?? 'Attraction not set'}
          </div>
          <div className="mt-2 space-y-1 text-xs text-text-secondary">
            <div className="break-words">
              <span className="text-text-muted">Opening:</span>{' '}
              <span className="text-text-primary">{formatEngagementOpening(engagement)}</span>
            </div>
            <div className="break-words">
              <span className="text-text-muted">Venue:</span>{' '}
              <span className="text-text-primary">{engagementVenueLabel(engagement)}</span>
            </div>
            <div className="break-words">
              <span className="text-text-muted">Market:</span>{' '}
              <span className="text-text-primary">{engagement.dmaMarketName || '—'}</span>
            </div>
            <div className="break-words">
              <span className="text-text-muted">Location:</span>{' '}
              <span className="text-text-primary">{engagementLocationLabel(engagement)}</span>
            </div>
            <div className="break-words">
              <span className="text-text-muted">Capacity:</span>{' '}
              <span className="text-text-primary">{formatNumber(engagement.sellableCapacity)}</span>
              <span className="text-text-muted"> · Gross potential:</span>{' '}
              <span className="text-text-primary">{formatMoney(engagement.grossPotential)}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
    </button>
  );
}

function TourThumbnailTile({ tour, onClick }: { tour: ApiTourListRow; onClick?: (tour: ApiTourListRow) => void }) {
  const thumb = getThumbnailUrl(tour as unknown as Record<string, unknown>);
  return (
    <button
      type="button"
      onClick={() => onClick?.(tour)}
      className="w-full text-left rounded-lg border border-border/80 bg-card p-2.5 hover:bg-hover/60 transition-colors cursor-pointer"
      title={`Open ${tour.tourName}`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-border/70 bg-elevated">
        {thumb ? (
          <img src={thumb} alt={`${tour.tourName} thumbnail`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-text-muted">
            <ImageIcon className="h-4 w-4" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">No image</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-text-primary truncate" title={tour.tourName}>
        {tour.tourName}
      </p>
      <p className="text-[11px] text-text-muted truncate">{tour.className || '—'}</p>
    </button>
  );
}

// ─── Shared inline-edit primitive ────────────────────────────────────────────

function FieldLabelWithReq({
  label, required,
}: { label: string; required?: boolean }) {
  return (
    <label className="text-xs text-text-muted block mb-0.5">
      {label}
      {required && <span className="text-ems-coral ml-0.5">*</span>}
    </label>
  );
}

function InlineField({
  label, value, onChange, placeholder = '—', multiline = false, required, maxLength, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
  required?: boolean;
  maxLength?: number;
  error?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const commit = () => { if (draft !== value) onChange(draft); setEditing(false); };

  if (editing) {
    return (
      <div>
        <FieldLabelWithReq label={label} required={required} />
        <div className="flex items-start gap-1.5">
          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              rows={3}
              value={draft}
              maxLength={maxLength}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
              className="flex-1 bg-surface border border-ems-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none resize-none"
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              value={draft}
              maxLength={maxLength}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 bg-surface border border-ems-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
            />
          )}
          <div className="flex gap-0.5 mt-0.5 shrink-0">
            <button onClick={commit} className="p-1 text-ems-accent hover:bg-elevated rounded"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-text-muted hover:bg-elevated rounded"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        {error && <p className="text-xs text-ems-coral mt-1">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <FieldLabelWithReq label={label} required={required} />
      <div
        onClick={start}
        title="Click to edit"
        className="group flex items-start gap-2 cursor-pointer py-0.5 px-1.5 -mx-1.5 rounded-md hover:bg-elevated transition-colors"
      >
        <span className={`text-sm flex-1 ${value ? 'text-text-primary' : 'text-text-muted italic'}`}>
          {value || placeholder}
        </span>
        <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0 mt-0.5" />
      </div>
      {error && <p className="text-xs text-ems-coral mt-0.5">{error}</p>}
    </div>
  );
}

function InlineSelectField({
  label,
  value,
  onChange,
  options,
  allowClear = false,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allowClear?: boolean;
  required?: boolean;
  error?: string;
}) {
  const [editing, setEditing] = useState(false);
  const display =
    options.find((o) => o.value === value)?.label ??
    (value ? value : '—');

  if (editing) {
    return (
      <div>
        <FieldLabelWithReq label={label} required={required} />
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <Select2
              options={options}
              value={value}
              onChange={(v) => {
                onChange(v);
                setEditing(false);
              }}
              allowClear={allowClear}
              placeholder="Select…"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="p-1 text-text-muted hover:bg-elevated rounded shrink-0"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {error && <p className="text-xs text-ems-coral mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <FieldLabelWithReq label={label} required={required} />
      <div
        onClick={() => setEditing(true)}
        className="group flex items-center gap-2 cursor-pointer py-0.5 px-1.5 -mx-1.5 rounded-md hover:bg-elevated transition-colors"
        title="Click to edit"
      >
        <span className="text-sm text-text-primary flex-1">{display}</span>
        <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
      </div>
      {error && <p className="text-xs text-ems-coral mt-0.5">{error}</p>}
    </div>
  );
}

// ─── Attraction side panel (list + detail) ─────────────────────────────────

function AttractionSidePanel({
  attraction,
  tours,
  addToast,
  onOpenTour,
  onClose,
  onDelete,
  onSaved,
}: {
  attraction: ApiAttractionListRow;
  tours: ApiTourListRow[];
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenTour: (tour: ApiTourListRow) => void;
  onClose: () => void;
  onDelete: (a: ApiAttractionListRow) => void;
  /** Receives the fresh list row returned by PATCH /attractions/:id so the parent can patch its cache. */
  onSaved: (row: ApiAttractionListRow) => void;
}) {
  const [name, setName] = useState(attraction.attractionName);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    setName(attraction.attractionName);
    setDirty(false);
    setNameError(undefined);
  }, [attraction.attractionId, attraction.attractionName]);

  const handleSave = async () => {
    const t = name.trim();
    if (!t) {
      setNameError('Attraction name is required.');
      return;
    }
    if (t.length > 200) {
      setNameError('Attraction name must be 200 characters or fewer.');
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      const updated = await updateAttraction(attraction.attractionId, {
        attractionName: name.trim(),
      });
      setDirty(false);
      addToast('Attraction updated.', 'success');
      onSaved(updated);
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not update.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer onClose={onClose} width={1000}>
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{name}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {attraction.activeTourCount} tour{attraction.activeTourCount !== 1 ? 's' : ''}
            {attraction.appCreated && (
              <span className="ml-2 text-ems-accent">· Created in this app</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onDelete(attraction)}
            title="Delete attraction"
            className="p-1.5 text-text-muted hover:text-ems-coral hover:bg-ems-coral-dim rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-secondary rounded-md transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <p className="flex items-start gap-1.5 text-[11px] text-text-muted select-none leading-relaxed">
          <Pencil className="h-3 w-3 shrink-0 mt-0.5" />
          Click the attraction name to edit it.
        </p>

        <InlineField
          label="Attraction Name"
          value={name}
          onChange={(v) => {
            setName(v);
            setDirty(true);
            setNameError(undefined);
          }}
          required
          maxLength={200}
          error={nameError}
        />

        <div>
          <h3 className="text-sm font-medium text-text-primary mb-1">Tours</h3>
          <p className="text-[11px] text-text-muted mb-3">Click any tour card to open it in the Tours tab.</p>
          <div className="space-y-3">
            {tours.length === 0 && (
              <div className="text-text-muted text-sm">No tours attached yet.</div>
            )}
            {tours.map((t) => (
              <TourCardReadOnly key={t.tourId} t={t} onOpenTour={onOpenTour} />
            ))}
          </div>
        </div>

        {dirty && (
          <div className="sticky bottom-0 -mx-4 px-4 py-3 mt-4 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-between gap-3 z-10">
            <span className="text-xs text-text-secondary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ems-accent inline-block animate-pulse" />
              Unsaved changes
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setName(attraction.attractionName);
                  setDirty(false);
                  setNameError(undefined);
                }}
                disabled={saving}
                className="text-text-secondary text-xs px-3 py-1.5 hover:text-text-primary rounded-md hover:bg-elevated transition-colors disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-ems-accent hover:bg-ems-accent/80 text-background text-xs px-4 py-1.5 rounded-md font-medium disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function TourContactForm({
  roles,
  departments,
  onSave,
  onCancel,
}: {
  roles: ApiRole[];
  departments: ApiDepartment[];
  onSave: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone?: string | null;
    workPhone?: string | null;
    roleId: number;
    departmentId: number;
  }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [workPhoneCountry, setWorkPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [workPhoneDisplay, setWorkPhoneDisplay] = useState('');
  const [cellPhoneCountry, setCellPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [cellPhoneDisplay, setCellPhoneDisplay] = useState('');
  const [workPhoneError, setWorkPhoneError] = useState<string | undefined>();
  const [cellPhoneError, setCellPhoneError] = useState<string | undefined>();
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    department?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const inputCls =
    'w-full min-w-0 cursor-text bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const roleOpts = useMemo(
    () => (roles ?? []).map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [roles],
  );
  const deptOpts = useMemo(
    () => (departments ?? []).map((d) => ({ value: String(d.departmentId), label: d.departmentName })),
    [departments],
  );

  return (
    <div className="bg-elevated border border-border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <FormField label="First Name" required error={fieldErrors.firstName}>
          <input
            className={inputCls}
            maxLength={100}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
            }}
          />
        </FormField>
        <FormField label="Last Name" required error={fieldErrors.lastName}>
          <input
            className={inputCls}
            maxLength={100}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
            }}
          />
        </FormField>
        <FormField label="Email" required error={fieldErrors.email}>
          <input
            type="email"
            className={inputCls}
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
        </FormField>
        <ContactPhoneRow
          label="Work Phone"
          country={workPhoneCountry}
          display={workPhoneDisplay}
          onCountry={(c) => { setWorkPhoneCountry(c); setWorkPhoneError(undefined); }}
          onDisplay={(d) => { setWorkPhoneDisplay(d); setWorkPhoneError(undefined); }}
          error={workPhoneError}
        />
        <ContactPhoneRow
          label="Cell Phone"
          country={cellPhoneCountry}
          display={cellPhoneDisplay}
          onCountry={(c) => { setCellPhoneCountry(c); setCellPhoneError(undefined); }}
          onDisplay={(d) => { setCellPhoneDisplay(d); setCellPhoneError(undefined); }}
          error={cellPhoneError}
        />
        <FormField label="Role" required error={fieldErrors.role}>
          <Select2
            options={[{ value: '', label: 'Select role…' }, ...roleOpts]}
            value={roleId}
            onChange={(v) => { setRoleId(v); setFieldErrors((prev) => ({ ...prev, role: undefined })); }}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Department" required error={fieldErrors.department}>
            <Select2
              options={[{ value: '', label: 'Select department…' }, ...deptOpts]}
              value={departmentId}
              onChange={(v) => { setDepartmentId(v); setFieldErrors((prev) => ({ ...prev, department: undefined })); }}
            />
          </FormField>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary disabled:opacity-50 disabled:pointer-events-none"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const next: typeof fieldErrors = {};
            if (!firstName.trim()) next.firstName = 'First name is required.';
            if (!lastName.trim()) next.lastName = 'Last name is required.';
            if (!email.trim()) next.email = 'Email is required.';
            if (!roleId) next.role = 'Select a role.';
            if (!departmentId) next.department = 'Select a department.';
            if (Object.keys(next).length > 0) { setFieldErrors(next); return; }
            setFieldErrors({});
            let wErr: string | undefined;
            let cErr: string | undefined;
            if (workPhoneDisplay.trim() && !workPhoneCountry) {
              wErr = 'Select a country for work phone, or clear the number.';
            }
            if (cellPhoneDisplay.trim() && !cellPhoneCountry) {
              cErr = 'Select a country for cell phone, or clear the number.';
            }
            if (wErr || cErr) { setWorkPhoneError(wErr); setCellPhoneError(cErr); return; }
            const wE = tryE164FromDisplay(workPhoneDisplay, workPhoneCountry);
            const cE = tryE164FromDisplay(cellPhoneDisplay, cellPhoneCountry);
            if (workPhoneDisplay.trim() && !wE) wErr = PHONE_INVALID_MESSAGE;
            if (cellPhoneDisplay.trim() && !cE) cErr = PHONE_INVALID_MESSAGE;
            setWorkPhoneError(wErr);
            setCellPhoneError(cErr);
            if (wErr || cErr) return;
            setSaving(true);
            try {
              await onSave({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                workPhone: workPhoneDisplay.trim() ? wE! : undefined,
                cellPhone: cellPhoneDisplay.trim() ? cE! : undefined,
                roleId: Number(roleId),
                departmentId: Number(departmentId),
              });
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center justify-center gap-2 min-w-[7.5rem] bg-ems-accent text-background text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Saving…</>
          ) : (
            'Save Contact'
          )}
        </button>
      </div>
    </div>
  );
}

/** One in-progress Media Mix row in the tour editor. */
type MediaMixDraft = {
  advertisingSubTypeId: number;
  subTypeName: string;
  companyId: number | null;
  companyName: string | null;
};

function mediaMixDraftsFromTour(tour: ApiTourListRow): MediaMixDraft[] {
  return (tour.mediaMix ?? []).map((m: ApiTourMediaMixItem) => ({
    advertisingSubTypeId: m.advertisingSubTypeId,
    subTypeName: m.subTypeName,
    companyId: m.companyId,
    companyName: m.companyName,
  }));
}

function TourDrawer({
  tour,
  attractions,
  classes,
  venueTypes,
  ageRanges,
  companies,
  managementCompanyOptions,
  companyOptions,
  addToast,
  onClose,
  onDelete,
  onSaved,
  activeTab,
  onTabChange,
  onOpenEngagement,
}: {
  tour: ApiTourListRow;
  attractions: ApiAttractionListRow[];
  classes: ApiClass[];
  venueTypes: ApiVenueType[];
  ageRanges: ApiAgeRange[];
  companies: ApiCompanyListRow[];
  managementCompanyOptions: Select2Option[];
  companyOptions: Select2Option[];
  addToast: (msg: string, type: 'success'|'error'|'warning'|'info') => void;
  onClose: () => void;
  onDelete: (t: ApiTourListRow) => void;
  /** Receives the fresh list row returned by PATCH /tours/:id plus the previous attraction id (for activeTourCount bookkeeping). */
  onSaved: (row: ApiTourListRow, prevAttractionId: number) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenEngagement: (engagementId: number) => void;
}) {
  const qc = useQueryClient();

  const contactLookupsQuery = useQuery({
    queryKey: ['contact-form-lookups'],
    queryFn: () => fetchLookups().then(({ roles, departments }) => ({ roles, departments })),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [showAddContact, setShowAddContact] = useState(false);

  // Editable state
  const [tourName, setTourName] = useState(tour.tourName);
  const [attractionId, setAttractionId] = useState(String(tour.attractionId));
  const [classId, setClassId] = useState(String(tour.classId));
  const [talentAgencyCompanyId, setTalentAgencyCompanyId] = useState(
    tour.talentAgencyCompanyId != null ? String(tour.talentAgencyCompanyId) : '',
  );
  const [payableEntityCompanyId, setPayableEntityCompanyId] = useState(
    tour.tourManagementCompanyId != null ? String(tour.tourManagementCompanyId) : '',
  );
  const selectedTalentAgencyId = Number(talentAgencyCompanyId);
  const contactsQuery = useQuery({
    queryKey: ['tour-management-company-contacts', selectedTalentAgencyId],
    queryFn: () => fetchCompanyContacts(selectedTalentAgencyId),
    enabled: Number.isInteger(selectedTalentAgencyId) && selectedTalentAgencyId > 0,
  });
  const engagementsQuery = useQuery({
    queryKey: ['tour-engagements', tour.tourId],
    queryFn: () => fetchTourEngagements(tour.tourId),
    enabled: activeTab === 'Engagements' && Number.isInteger(tour.tourId) && tour.tourId > 0,
    staleTime: 60_000,
  });
  const projectsQuery = useQuery({
    queryKey: ['tour-projects', tour.tourId],
    queryFn: () => fetchTourProjects(tour.tourId),
    enabled: activeTab === 'Projects' && Number.isInteger(tour.tourId) && tour.tourId > 0,
    staleTime: 60_000,
  });
  const [talentAgentContactIds, setTalentAgentContactIds] = useState<string[]>(
    () => (tour.talentAgentContactIds ?? []).map(String),
  );
  const [venueTypePreferenceId, setVenueTypePreferenceId] = useState(
    tour.venueTypePreferenceId != null ? String(tour.venueTypePreferenceId) : '',
  );
  const [audienceGender, setAudienceGender] = useState(tour.audienceGender ?? '');
  const [audienceAgeRangeIds, setAudienceAgeRangeIds] = useState<string[]>(
    () => (tour.audienceAgeRangeIds ?? []).map(String),
  );
  const [jobName, setJobName] = useState(tour.jobName ?? '');
  const [mediaMix, setMediaMix] = useState<MediaMixDraft[]>(() =>
    mediaMixDraftsFromTour(tour),
  );
  const [mmSubTypeId, setMmSubTypeId] = useState('');
  const [mmCompanyId, setMmCompanyId] = useState('');
  const [insuranceLanguage, setInsuranceLanguage] = useState(tour.tourInsuranceLanguage ?? '');
  const [ascap, setAscap] = useState(tour.ascap);
  const [bmi, setBmi] = useState(tour.bmi);
  const [sesac, setSesac] = useState(tour.sesac);
  const [gmr, setGmr] = useState(tour.gmr);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tourFieldErrors, setTourFieldErrors] = useState<{
    tourName?: string;
    attractionId?: string;
    classId?: string;
    audienceGender?: string;
    jobName?: string;
    insurance?: string;
  }>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [stripBanner, setStripBanner] = useState(false);
  const [bannerInputKey, setBannerInputKey] = useState(0);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const u = URL.createObjectURL(bannerFile);
    setBannerPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [bannerFile]);

  useEffect(() => {
    setTourName(tour.tourName);
    setAttractionId(String(tour.attractionId));
    setClassId(String(tour.classId));
    setTalentAgencyCompanyId(
      tour.talentAgencyCompanyId != null ? String(tour.talentAgencyCompanyId) : '',
    );
    setPayableEntityCompanyId(
      tour.tourManagementCompanyId != null ? String(tour.tourManagementCompanyId) : '',
    );
    setTalentAgentContactIds((tour.talentAgentContactIds ?? []).map(String));
    setVenueTypePreferenceId(
      tour.venueTypePreferenceId != null ? String(tour.venueTypePreferenceId) : '',
    );
    setAudienceGender(tour.audienceGender ?? '');
    setAudienceAgeRangeIds((tour.audienceAgeRangeIds ?? []).map(String));
    setJobName(tour.jobName ?? '');
    setMediaMix(mediaMixDraftsFromTour(tour));
    setMmSubTypeId('');
    setMmCompanyId('');
    setInsuranceLanguage(tour.tourInsuranceLanguage ?? '');
    setAscap(tour.ascap);
    setBmi(tour.bmi);
    setSesac(tour.sesac);
    setGmr(tour.gmr);
    setBannerFile(null);
    setStripBanner(false);
    setBannerInputKey((k) => k + 1);
    setDirty(false);
    setTourFieldErrors({});
  }, [tour.tourId]);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setTourFieldErrors({});
    setter(v);
    setDirty(true);
  };

  const attractionOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const a of attractions) {
      byId.set(String(a.attractionId), a.attractionName);
    }
    const id = String(tour.attractionId);
    if (tour.attractionName) {
      byId.set(id, tour.attractionName);
    } else if (!byId.has(id)) {
      byId.set(id, id);
    }
    return [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [attractions, tour.attractionId, tour.attractionName]);
  const classOptions = classes.map((c) => ({
    value: String(c.classId),
    label: c.className,
  }));
  const mgmtOptions = useMemo(
    () =>
      buildTourManagementSelectOptions(
        managementCompanyOptions,
        companies,
        tour.talentAgencyCompanyId,
        tour.talentAgencyCompanyName,
      ),
    [
      managementCompanyOptions,
      companies,
      tour.talentAgencyCompanyId,
      tour.talentAgencyCompanyName,
    ],
  );
  const payableEntityOptions = useMemo(
    () =>
      buildTourManagementSelectOptions(
        companyOptions,
        companies,
        tour.tourManagementCompanyId,
        tour.tourManagementCompanyName,
      ),
    [
      companyOptions,
      companies,
      tour.tourManagementCompanyId,
      tour.tourManagementCompanyName,
    ],
  );

  // Media Mix — Advertising Outlet companies + AdvertisingSubType picker.
  const advertisingSubTypesQuery = useQuery({
    queryKey: ['advertising-sub-types'],
    queryFn: fetchAdvertisingSubTypes,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const advertisingSubTypeOptions = useMemo<Select2Option[]>(
    () =>
      (advertisingSubTypesQuery.data ?? []).map((s) => ({
        value: String(s.advertisingSubTypeId),
        label: s.parentCategory
          ? `${s.parentCategory} — ${s.subTypeName}`
          : s.subTypeName,
      })),
    [advertisingSubTypesQuery.data],
  );
  const advertisingOutletOptions = useMemo<Select2Option[]>(
    () =>
      companyToSelect2Options(
        companies.filter(
          (c) =>
            (c.companyTypeNames ?? []).some(
              (name) => name.trim().toLowerCase() === 'advertising outlet',
            ) ||
            (c.companyTypeName ?? '').trim().toLowerCase() ===
              'advertising outlet',
        ),
      ),
    [companies],
  );
  const addMediaMixEntry = () => {
    const astId = Number(mmSubTypeId);
    if (!Number.isInteger(astId) || astId < 1) return;
    const companyId = mmCompanyId ? Number(mmCompanyId) : null;
    const duplicate = mediaMix.some(
      (m) =>
        m.advertisingSubTypeId === astId &&
        (m.companyId ?? 0) === (companyId ?? 0),
    );
    if (duplicate) {
      addToast('That media mix entry is already added.', 'warning');
      return;
    }
    const subTypeName =
      advertisingSubTypeOptions.find((o) => o.value === mmSubTypeId)?.label ??
      '';
    const companyName = companyId
      ? (advertisingOutletOptions.find((o) => o.value === mmCompanyId)?.label ??
        null)
      : null;
    setMediaMix((prev) => [
      ...prev,
      { advertisingSubTypeId: astId, subTypeName, companyId, companyName },
    ]);
    setMmSubTypeId('');
    setMmCompanyId('');
    setDirty(true);
  };
  const removeMediaMixEntry = (index: number) => {
    setMediaMix((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const contacts = contactsQuery.data ?? [];
  const talentAgentOptions = useMemo(
    () =>
      contacts
        .map((c) => ({
          value: String(c.contactId),
          label:
            `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
            c.email ||
            `Contact #${c.contactId}`,
        }))
        .filter((opt, index, all) => all.findIndex((x) => x.value === opt.value) === index)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [contacts],
  );
  const selectedTalentAgentLabels = useMemo(() => {
    if (!talentAgentContactIds.length) return [];
    const optionById = new Map(talentAgentOptions.map((opt) => [opt.value, opt.label]));
    return talentAgentContactIds.map((id) => optionById.get(id) ?? `Contact #${id}`);
  }, [talentAgentContactIds, talentAgentOptions]);
  useEffect(() => {
    if (!talentAgentOptions.length || !talentAgentContactIds.length) return;
    const allowed = new Set(talentAgentOptions.map((opt) => opt.value));
    setTalentAgentContactIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [talentAgentOptions, talentAgentContactIds.length]);
  const venueTypeOpts = [
    { value: '', label: '—' },
    ...venueTypes.map((v) => ({
      value: String(v.venueTypeId),
      label: v.venueTypeName,
    })),
  ];
  const ageRangeOptions = ageRanges.map((range) => ({
    value: String(range.ageRangeId),
    label: range.ageRangeLabel,
  }));

  const headerAttractionName =
    attractions.find((a) => a.attractionId === Number(attractionId))?.attractionName ??
    tour.attractionName;
  const headerClassName =
    classes.find((c) => c.classId === Number(classId))?.className ?? tour.className;

  const handleSave = async () => {
    const next: typeof tourFieldErrors = {};
    const tn = tourName.trim();
    if (!tn) next.tourName = 'Tour name is required.';
    else if (tn.length > 200) next.tourName = 'Tour name must be 200 characters or fewer.';
    if (!attractionId) next.attractionId = 'Attraction is required.';
    if (!classId) next.classId = 'Genre / Class is required.';
    if (audienceGender && !AUDIENCE_GENDER_OPTIONS.some((option) => option.value === audienceGender)) {
      next.audienceGender = 'Choose All, Male, or Female.';
    }
    if (jobName.trim().length > 255) {
      next.jobName = 'Tour job must be 255 characters or fewer.';
    }
    const ins = insuranceLanguage.trim();
    if (ins.length > 2000) next.insurance = 'Tour insurance language must be 2000 characters or fewer.';
    if (Object.keys(next).length) {
      setTourFieldErrors(next);
      return;
    }
    setTourFieldErrors({});
    setSaving(true);
    try {
      const updated = await updateTour(
        tour.tourId,
        {
          tourName: tourName.trim(),
          attractionId: Number(attractionId),
          classId: Number(classId),
          talentAgencyCompanyId: talentAgencyCompanyId
            ? Number(talentAgencyCompanyId)
            : null,
          tourManagementCompanyId: payableEntityCompanyId
            ? Number(payableEntityCompanyId)
            : null,
          talentAgentContactIds: talentAgentContactIds.map(Number),
          venueTypePreferenceId: venueTypePreferenceId
            ? Number(venueTypePreferenceId)
            : null,
          audienceGender: audienceGender.trim() || null,
          audienceAgeRangeIds: audienceAgeRangeIds.map(Number),
          jobName: jobName.trim() || null,
          mediaMix: mediaMix.map((m) => ({
            advertisingSubTypeId: m.advertisingSubTypeId,
            companyId: m.companyId,
          })),
          tourInsuranceLanguage: insuranceLanguage.trim() || null,
          ascap,
          bmi,
          sesac,
          gmr,
        },
        {
          bannerFile: bannerFile ?? undefined,
          removeBanner: Boolean(
            tour.tourBannerImageUrl && stripBanner && !bannerFile,
          ),
        },
      );
      setDirty(false);
      setBannerFile(null);
      setStripBanner(false);
      setBannerInputKey((k) => k + 1);
      addToast('Tour updated.', 'success');
      onSaved(updated, tour.attractionId);
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not update tour.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setTourName(tour.tourName);
    setAttractionId(String(tour.attractionId));
    setClassId(String(tour.classId));
    setTalentAgencyCompanyId(
      tour.talentAgencyCompanyId != null ? String(tour.talentAgencyCompanyId) : '',
    );
    setPayableEntityCompanyId(
      tour.tourManagementCompanyId != null ? String(tour.tourManagementCompanyId) : '',
    );
    setTalentAgentContactIds((tour.talentAgentContactIds ?? []).map(String));
    setVenueTypePreferenceId(
      tour.venueTypePreferenceId != null ? String(tour.venueTypePreferenceId) : '',
    );
    setAudienceGender(tour.audienceGender ?? '');
    setAudienceAgeRangeIds((tour.audienceAgeRangeIds ?? []).map(String));
    setJobName(tour.jobName ?? '');
    setMediaMix(mediaMixDraftsFromTour(tour));
    setMmSubTypeId('');
    setMmCompanyId('');
    setInsuranceLanguage(tour.tourInsuranceLanguage ?? '');
    setAscap(tour.ascap);
    setBmi(tour.bmi);
    setSesac(tour.sesac);
    setGmr(tour.gmr);
    setBannerFile(null);
    setStripBanner(false);
    setBannerInputKey((k) => k + 1);
    setDirty(false);
    setTourFieldErrors({});
  };

  return (
    <Drawer onClose={onClose} width={1000}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{tourName}</h2>
          <div className="text-sm text-text-secondary">{headerAttractionName}</div>
          <p className="text-xs text-text-muted mt-1">
            {headerClassName}
            {tour.appCreated && <span className="ml-2 text-ems-accent">· Created in this app</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onDelete(tour)}
            title="Delete tour"
            className="p-1.5 text-text-muted hover:text-ems-coral hover:bg-ems-coral-dim rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text-secondary rounded-md transition-colors text-lg leading-none">✕</button>
        </div>
      </div>

      <TabBar tabs={['Details', 'Contacts', 'Projects', 'Engagements', 'Marketing']} active={activeTab} onChange={onTabChange} />

      <div className="p-4 text-sm relative">
        {activeTab === 'Details' && (
          <div className="space-y-5 pb-2">
            <p className="flex items-center gap-1.5 text-[11px] text-text-muted select-none">
              <Pencil className="h-3 w-3" /> Click any field to edit it
            </p>
            <InlineField
              label="Tour Name"
              value={tourName}
              onChange={mark(setTourName)}
              required
              maxLength={200}
              error={tourFieldErrors.tourName}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              <InlineSelectField
                label="Attraction"
                value={attractionId}
                onChange={mark(setAttractionId)}
                options={attractionOptions}
                required
                error={tourFieldErrors.attractionId}
              />
              <InlineSelectField
                label="Genre / Class"
                value={classId}
                onChange={mark(setClassId)}
                options={classOptions}
                required
                error={tourFieldErrors.classId}
              />
              <InlineSelectField
                label="Talent Agency"
                value={talentAgencyCompanyId}
                onChange={(v) => {
                  mark(setTalentAgencyCompanyId)(v);
                  setTalentAgentContactIds([]);
                }}
                options={mgmtOptions}
                allowClear
              />
              <InlineSelectField
                label="Preferred Venue Type"
                value={venueTypePreferenceId}
                onChange={mark(setVenueTypePreferenceId)}
                options={venueTypeOpts}
                allowClear
              />
            </div>
            <FormField label="Talent Agents">
              <Select2Multi
                options={talentAgentOptions}
                values={talentAgentContactIds}
                onChange={(values) => {
                  setTalentAgentContactIds(values);
                  setDirty(true);
                  setTourFieldErrors({});
                }}
                placeholder={
                  !talentAgencyCompanyId
                    ? 'Select a talent agency first'
                    : contactsQuery.isLoading
                      ? 'Loading talent agents…'
                      : talentAgentOptions.length
                        ? 'Select one or more talent agents…'
                        : 'No contacts found for this agency'
                }
                disabled={!talentAgencyCompanyId || contactsQuery.isLoading || saving}
              />
              {talentAgencyCompanyId && (
                <div className="mt-2 rounded-md border border-border bg-surface px-2.5 py-2">
                  {contactsQuery.isLoading ? (
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      Loading agency contacts…
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-text-secondary">
                        Selected for this tour:{' '}
                        <span className="font-medium text-text-primary">
                          {selectedTalentAgentLabels.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-text-primary">
                          {talentAgentOptions.length}
                        </span>{' '}
                        company contact{talentAgentOptions.length === 1 ? '' : 's'}.
                      </p>
                      {selectedTalentAgentLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTalentAgentLabels.map((label, index) => (
                            <span
                              key={`${label}-${index}`}
                              className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-text-primary"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-muted">
                          No specific talent agents selected for this tour yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </FormField>
            <InlineSelectField
              label="Payable Entity"
              value={payableEntityCompanyId}
              onChange={mark(setPayableEntityCompanyId)}
              options={payableEntityOptions}
              allowClear
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <InlineField
                label="Tour Job"
                value={jobName}
                onChange={mark(setJobName)}
                placeholder="QuickBooks job classification"
                maxLength={255}
                error={tourFieldErrors.jobName}
              />
            </div>
            {ageRangeOptions.length === 0 && (
              <p className="text-[11px] text-text-muted -mt-2">
                Age range options are not available yet.
              </p>
            )}
            <div className="rounded-md border border-border/80 bg-surface/50 px-3 py-3 space-y-3">
              <div>
                <span className="text-xs font-medium text-text-secondary">Media Mix</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Pair an Advertising Outlet company with an advertising sub-type, then
                  add it. Entries are saved with the tour.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:items-end">
                <FormField label="Advertising Outlet Company">
                  <Select2
                    options={advertisingOutletOptions}
                    value={mmCompanyId}
                    placeholder={
                      advertisingOutletOptions.length
                        ? 'Select company…'
                        : 'No Advertising Outlet companies'
                    }
                    onChange={setMmCompanyId}
                    allowClear
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Advertising Sub-Type">
                  <Select2
                    options={advertisingSubTypeOptions}
                    value={mmSubTypeId}
                    placeholder={
                      advertisingSubTypesQuery.isLoading
                        ? 'Loading sub-types…'
                        : 'Select sub-type…'
                    }
                    onChange={setMmSubTypeId}
                    disabled={saving || advertisingSubTypesQuery.isLoading}
                  />
                </FormField>
                <button
                  type="button"
                  disabled={saving || !mmSubTypeId}
                  onClick={addMediaMixEntry}
                  className="h-9 px-4 rounded-md text-sm font-medium bg-ems-accent text-background hover:bg-ems-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {mediaMix.length > 0 ? (
                <div className="space-y-1.5">
                  {mediaMix.map((m, index) => (
                    <div
                      key={`${m.advertisingSubTypeId}-${m.companyId ?? 0}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                    >
                      <span className="text-xs text-text-primary">
                        <span className="font-medium">
                          {m.subTypeName || `Sub-type #${m.advertisingSubTypeId}`}
                        </span>
                        {m.companyName ? (
                          <span className="text-text-secondary"> — {m.companyName}</span>
                        ) : (
                          <span className="text-text-muted"> — No company</span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removeMediaMixEntry(index)}
                        className="text-text-muted hover:text-ems-coral disabled:opacity-50"
                        aria-label="Remove media mix entry"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted">No media mix entries yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-text-muted">Licensing</span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Performing rights — toggle ASCAP, BMI, SESAC, or GMR, then save.
                </p>
              </div>
              <div
                className="flex flex-wrap gap-x-6 gap-y-2.5 rounded-md border border-border/80 bg-surface/50 px-3 py-3"
                role="group"
                aria-label="Performing rights licensing"
              >
                {(
                  [
                    ['ascap', 'ASCAP', ascap, setAscap] as const,
                    ['bmi', 'BMI', bmi, setBmi] as const,
                    ['sesac', 'SESAC', sesac, setSesac] as const,
                    ['gmr', 'GMR', gmr, setGmr] as const,
                  ] as const
                ).map(([id, label, checked, setChecked]) => (
                  <label
                    key={id}
                    htmlFor={`tour-${tour.tourId}-license-${id}`}
                    className="inline-flex items-center gap-2 cursor-pointer text-sm text-text-primary select-none"
                  >
                    <input
                      id={`tour-${tour.tourId}-license-${id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setTourFieldErrors({});
                        setChecked(e.target.checked);
                        setDirty(true);
                      }}
                      className="h-4 w-4 rounded border-border bg-background text-ems-accent focus:ring-ems-accent focus:ring-offset-0"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <InlineField
              label="Tour Insurance Language"
              value={insuranceLanguage}
              onChange={mark(setInsuranceLanguage)}
              placeholder="Not set"
              multiline
              maxLength={2000}
              error={tourFieldErrors.insurance}
            />

            <div className="rounded-md border border-border/80 bg-surface/50 px-3 py-3 space-y-2">
              <div className="text-xs font-medium text-text-secondary">Tour banner image</div>
              <p className="text-[11px] text-text-muted">
                Optional. JPEG, PNG, WebP, or GIF — max 5 MB.
              </p>
              <input
                key={bannerInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={saving}
                className="block w-full text-xs text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-hover"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setBannerFile(f);
                  if (f) setStripBanner(false);
                  setTourFieldErrors({});
                  setDirty(true);
                }}
              />
              {tour.tourBannerImageUrl && !bannerPreview && (
                <div className="flex flex-wrap items-center gap-3">
                  <img
                    src={tour.tourBannerImageUrl}
                    alt=""
                    className="h-16 w-28 rounded-md border border-border object-cover bg-elevated"
                  />
                  <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stripBanner}
                      disabled={saving}
                      onChange={(e) => {
                        setStripBanner(e.target.checked);
                        if (e.target.checked) {
                          setBannerFile(null);
                          setBannerInputKey((k) => k + 1);
                        }
                        setTourFieldErrors({});
                        setDirty(true);
                      }}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Remove current image
                  </label>
                </div>
              )}
              {bannerPreview && (
                <div className="flex items-start gap-3">
                  <img
                    src={bannerPreview}
                    alt=""
                    className="h-16 w-28 rounded-md border border-border object-cover bg-elevated"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setBannerFile(null);
                      setBannerInputKey((k) => k + 1);
                      setDirty(true);
                    }}
                    className="text-xs text-ems-accent hover:underline disabled:opacity-50"
                  >
                    Clear new upload
                  </button>
                </div>
              )}
            </div>

            {/* Save bar */}
            {dirty && (
              <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-between gap-3 z-10">
                <span className="text-xs text-text-secondary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ems-accent inline-block animate-pulse" /> Unsaved changes
                </span>
                <div className="flex gap-2">
                  <button onClick={discard} disabled={saving} className="text-text-secondary text-xs px-3 py-1.5 hover:text-text-primary rounded-md hover:bg-elevated disabled:opacity-50">Discard</button>
                  <button onClick={() => void handleSave()} disabled={saving}
                    className="inline-flex items-center gap-1.5 bg-ems-accent hover:bg-ems-accent/80 text-background text-xs px-4 py-1.5 rounded-md font-medium disabled:opacity-60">
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Contacts' && (
          <div className="space-y-3">
            {!tour.talentAgencyCompanyId ? (
              <p className="text-text-secondary">No talent agency assigned to this tour.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="text-ems-accent text-sm hover:underline"
                >
                  + Add Contact
                </button>
                {showAddContact && contactLookupsQuery.data && (
                  <TourContactForm
                    roles={contactLookupsQuery.data.roles}
                    departments={contactLookupsQuery.data.departments}
                    onCancel={() => setShowAddContact(false)}
                    onSave={async (payload) => {
                      try {
                        const created = await createCompanyContact(tour.talentAgencyCompanyId!, payload);
                        await qc.invalidateQueries({
                          queryKey: ['tour-management-company-contacts', tour.talentAgencyCompanyId],
                          exact: true,
                        });
                        const newId = String(created.contactId);
                        setTalentAgentContactIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
                        setDirty(true);
                        setShowAddContact(false);
                        addToast('Contact added to this talent agency.', 'success');
                      } catch (e) {
                        addToast(friendlyApiError(e, 'Could not add the contact.'), 'error');
                      }
                    }}
                  />
                )}
                {contactsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading contacts…</div>
                ) : contacts.length === 0 ? (
                  <p className="text-text-secondary">No contacts listed for this talent agency.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(c => (
                      <div key={c.contactAssignmentId} className="bg-elevated border border-border rounded-lg p-3">
                        <div className="font-medium text-text-primary">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-text-secondary">{c.roleName} • {c.departmentName}</div>
                        <div className="mt-2 text-xs text-text-secondary space-y-1">
                          <div>{c.email ? <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a> : null}</div>
                          {c.workPhone && <div><a href={`tel:${c.workPhone}`} className="hover:underline">{formatE164ForDisplay(c.workPhone)}</a></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'Projects' && (
          <div className="space-y-3">
            {projectsQuery.isLoading ? (
              <div
                className="rounded-lg border border-border bg-elevated px-4 py-8 text-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-ems-accent" aria-hidden />
                <p className="mt-2 text-sm text-text-secondary">Loading projects…</p>
              </div>
            ) : projectsQuery.isError ? (
              <div className="rounded-lg border border-ems-coral/40 bg-ems-coral-dim px-4 py-3">
                <p className="text-sm text-ems-coral">
                  {friendlyApiError(projectsQuery.error, 'Could not load projects for this tour.')}
                </p>
                <button
                  type="button"
                  onClick={() => void projectsQuery.refetch()}
                  className="mt-2 text-xs font-medium text-ems-coral hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (projectsQuery.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-border bg-elevated px-4 py-8 text-center text-sm text-text-muted">
                No projects are associated with this tour yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(projectsQuery.data ?? []).map((project) => (
                  <div
                    key={project.engagementProjectId}
                    className="rounded-lg border border-border bg-elevated p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {project.attractionName ?? 'Attraction'} — {project.tourName ?? 'Tour'}
                      </span>
                      <StatusBadge status={project.projectStage} />
                    </div>
                    <div className="text-xs text-text-secondary">
                      <span className="text-text-muted">Talent Agency:</span>{' '}
                      {project.talentAgencyName ?? '—'}
                    </div>
                    {project.offerReviewStatus && (
                      <div className="text-xs text-text-secondary">
                        <span className="text-text-muted">Offer Review:</span>{' '}
                        <StatusBadge status={project.offerReviewStatus} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Engagements' && (
          <div className="space-y-3">
            {engagementsQuery.isLoading ? (
              <div
                className="rounded-lg border border-border bg-elevated px-4 py-8 text-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-ems-accent" aria-hidden />
                <p className="mt-2 text-sm text-text-secondary">Loading engagements…</p>
              </div>
            ) : engagementsQuery.isError ? (
              <div className="rounded-lg border border-ems-coral/40 bg-ems-coral-dim px-4 py-3">
                <p className="text-sm text-ems-coral">
                  {friendlyApiError(engagementsQuery.error, 'Could not load engagements for this tour.')}
                </p>
                <button
                  type="button"
                  onClick={() => void engagementsQuery.refetch()}
                  className="mt-2 text-xs font-medium text-ems-coral hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (engagementsQuery.data ?? []).length === 0 ? (
              <div className="rounded-lg border border-border bg-elevated px-4 py-8 text-center text-sm text-text-muted">
                No engagements are attached to this tour yet.
              </div>
            ) : (
              <div className="space-y-3">
                {(engagementsQuery.data ?? []).map((engagement) => (
                  <EngagementCardReadOnly
                    key={engagement.engagementId}
                    engagement={engagement}
                    onOpen={onOpenEngagement}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Marketing' && (
          <TourMarketingPanel
            tourId={tour.tourId}
            addToast={addToast}
          />
        )}
      </div>
    </Drawer>
  );
}

const ATTRACTIONS_TOURS_LIST_LIMIT = 8000;

/**
 * Drop server-search caches. They're keyed by the query string, so after any
 * mutation they may contain stale rows — rather than trying to patch every
 * variant we just remove them and let the next search repopulate on demand.
 */
function clearAttractionToursServerSearchCaches(qc: QueryClient) {
  removeQueriesByPrefix(qc, attractionsServerSearchKeyPrefix);
  removeQueriesByPrefix(qc, toursServerSearchKeyPrefix);
}

const compareTours = (a: ApiTourListRow, b: ApiTourListRow) =>
  a.tourName.localeCompare(b.tourName, undefined, { sensitivity: 'base' });

export function AttractionToursPage({ addToast, onNavigate }: Props) {
  const qc = useQueryClient();
  const [pageTab, setPageTab] = useState('Attractions');
  const [attractionInput, setAttractionInput] = useState('');
  const [attractionSearch, setAttractionSearch] = useState('');
  const [showAttractionSuggestions, setShowAttractionSuggestions] = useState(false);
  const [tourInput, setTourInput] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [showTourSuggestions, setShowTourSuggestions] = useState(false);
  const attractionSearchRef = useRef<HTMLDivElement>(null);
  const tourSearchRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [attractionSort, setAttractionSort] = useState<{
    col: 'name' | 'tours';
    dir: 'asc' | 'desc';
  }>(loadAttractionsSortState);
  const [tourSort, setTourSort] = useState<{
    col: 'tour' | 'attraction' | 'class' | 'management';
    dir: 'asc' | 'desc';
  }>(loadToursSortState);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [attractionsViewMode, setAttractionsViewMode] = useState<AttractionsViewMode>(loadAttractionsViewMode);
  const [attractionsTileSize, setAttractionsTileSize] = useState<AttractionsTileSize>(loadAttractionsTileSize);
  const [expandedAttractionTileId, setExpandedAttractionTileId] = useState<number | null>(null);

  const [selectedAttractionId, setSelectedAttractionId] = useState<number | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [tourDrawerTab, setTourDrawerTab] = useState('Details');

  const [showAddAttraction, setShowAddAttraction] = useState(false);
  const [showAddTour, setShowAddTour] = useState(false);
  const [editAttraction, setEditAttraction] = useState<ApiAttractionListRow | null>(null);
  const [editTour, setEditTour] = useState<ApiTourListRow | null>(null);

  const [pendingDeleteAttraction, setPendingDeleteAttraction] = useState<ApiAttractionListRow | null>(null);
  const [pendingDeleteTour, setPendingDeleteTour] = useState<ApiTourListRow | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attractionSearchRef.current && !attractionSearchRef.current.contains(e.target as Node)) {
        setShowAttractionSuggestions(false);
      }
      if (tourSearchRef.current && !tourSearchRef.current.contains(e.target as Node)) {
        setShowTourSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Hiding a tab’s search UI does not unmount its state; clear the inactive list search when switching tabs. */
  useEffect(() => {
    if (pageTab === 'Tours') {
      setAttractionInput('');
      setAttractionSearch('');
      setShowAttractionSuggestions(false);
    } else {
      setTourInput('');
      setTourSearch('');
      setShowTourSuggestions(false);
    }
  }, [pageTab]);

  useEffect(() => {
    if (pageTab !== 'Attractions') {
      setExpandedAttractionTileId(null);
    }
  }, [pageTab]);

  const hasActiveTabFilters =
    pageTab === 'Attractions'
      ? attractionInput.trim().length > 0 || attractionSearch.trim().length > 0
      : tourInput.trim().length > 0 || tourSearch.trim().length > 0;

  const resetTabFilters = useCallback(() => {
    if (pageTab === 'Attractions') {
      setAttractionInput('');
      setAttractionSearch('');
      setShowAttractionSuggestions(false);
    } else {
      setTourInput('');
      setTourSearch('');
      setShowTourSuggestions(false);
    }
    setPage(1);
  }, [pageTab]);

  const attractionsQuery = useQuery({
    queryKey: [
      ...attractionsListQueryKey,
      attractionSort.col,
      attractionSort.dir,
    ] as const,
    queryFn: async () =>
      fetchAttractions(0, ATTRACTIONS_TOURS_LIST_LIMIT, undefined, {
        sortBy: attractionSort.col === 'tours' ? 'tours' : 'name',
        sortDir: attractionSort.dir,
      }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const toursQuery = useQuery({
    queryKey: [...toursListQueryKey, tourSort.col, tourSort.dir] as const,
    queryFn: async () =>
      fetchTours(0, ATTRACTIONS_TOURS_LIST_LIMIT, undefined, {
        sortBy:
          tourSort.col === 'tour'
            ? 'tour'
            : tourSort.col === 'attraction'
              ? 'attraction'
              : tourSort.col === 'class'
                ? 'class'
                : 'management',
        sortDir: tourSort.dir,
      }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const lookupsQuery = useQuery({
    queryKey: ['attraction-tours-lookups'],
    queryFn: async () => {
      const [classes, companies, venueTypes, ageRanges] = await Promise.all([
        fetchClasses(),
        fetchCompanies(0, COMPANIES_PICKER_LIMIT, {}),
        fetchVenueTypesLookup(),
        fetchTourAgeRanges(),
      ]);
      return { classes, companies: companies.data, venueTypes, ageRanges };
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const attractionsPage = attractionsQuery.data as
    | ApiPaginatedResponse<import('@/api/attractionToursApi').ApiAttractionListRow>
    | undefined;
  const toursPage = toursQuery.data as
    | ApiPaginatedResponse<import('@/api/attractionToursApi').ApiTourListRow>
    | undefined;
  const attractions = attractionsPage?.data ?? [];
  const tours = toursPage?.data ?? [];
  const attractionsForPicker = attractions;

  const attractionSuggestions = useMemo(() => {
    const q = attractionInput.trim();
    if (!q) return [];
    return attractions
      .map((a) => a.attractionName)
      .filter((name) => richTextMatches([name], q))
      .slice(0, 8);
  }, [attractionInput, attractions]);

  const tourSuggestions = useMemo(() => {
    const q = tourInput.trim();
    if (!q) return [];
    const matches = tours.filter(
      (t) =>
        richTextMatches(
          [t.tourName, t.attractionName, t.className, t.talentAgencyCompanyName],
          q,
        ),
    );
    return [...new Set(matches.map((t) => t.tourName))].slice(0, 8);
  }, [tourInput, tours]);

  const attractionSearchActive = Boolean(attractionSearch.trim());
  const serverAttractionsSearchQuery = useQuery({
    queryKey: [
      ...attractionsServerSearchKeyPrefix,
      attractionSearch,
      attractionSort.col,
      attractionSort.dir,
    ] as const,
    queryFn: () =>
      fetchAttractions(0, ATTRACTIONS_TOURS_LIST_LIMIT, attractionSearch, {
        sortBy: attractionSort.col === 'tours' ? 'tours' : 'name',
        sortDir: attractionSort.dir,
      }),
    enabled: attractionSearchActive,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const displayAttractions = useMemo((): ApiAttractionListRow[] => {
    if (attractionSearchActive) {
      return serverAttractionsSearchQuery.data?.data ?? [];
    }
    return attractions;
  }, [attractionSearchActive, serverAttractionsSearchQuery.data, attractions]);

  const tourSearchActive = Boolean(tourSearch.trim());
  const serverToursSearchQuery = useQuery({
    queryKey: [
      ...toursServerSearchKeyPrefix,
      tourSearch,
      tourSort.col,
      tourSort.dir,
    ] as const,
    queryFn: () =>
      fetchTours(0, ATTRACTIONS_TOURS_LIST_LIMIT, tourSearch, {
        sortBy:
          tourSort.col === 'tour'
            ? 'tour'
            : tourSort.col === 'attraction'
              ? 'attraction'
              : tourSort.col === 'class'
                ? 'class'
                : 'management',
        sortDir: tourSort.dir,
      }),
    enabled: tourSearchActive,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const displayTours = useMemo((): ApiTourListRow[] => {
    if (tourSearchActive) {
      return serverToursSearchQuery.data?.data ?? [];
    }
    return tours;
  }, [tourSearchActive, serverToursSearchQuery.data, tours]);

  /**
   * Surgical cache helpers — product requirement is a 30-minute staleTime on
   * the main lists, with every create/update/delete reflected in the cache
   * IMMEDIATELY without a full refetch. Since the backend now returns full
   * `ApiAttractionListRow` / `ApiTourListRow` objects, we can splice them in
   * place with `setQueryData` and leave the staleness window untouched.
   */
  const upsertAttractionInCache = useCallback((_row: ApiAttractionListRow) => {
    void qc.invalidateQueries({ queryKey: ['attractions'], exact: false });
    void qc.invalidateQueries({ queryKey: ['tours'], exact: false });
    clearAttractionToursServerSearchCaches(qc);
  }, [qc]);

  const upsertTourInCache = useCallback(
    (_row: ApiTourListRow, prevAttractionId: number | null) => {
      void qc.invalidateQueries({ queryKey: ['tours'], exact: false });
      if (prevAttractionId == null || prevAttractionId !== _row.attractionId) {
        void qc.invalidateQueries({ queryKey: ['attractions'], exact: false });
      }
      clearAttractionToursServerSearchCaches(qc);
    },
    [qc],
  );

  const createAttrMut = useMutation({
    mutationFn: createAttraction,
    onSuccess: (row) => {
      upsertAttractionInCache(row);
      setShowAddAttraction(false);
      addToast('Attraction created.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not create attraction.'), 'error'),
  });

  const updateAttrMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateAttraction>[1] }) =>
      updateAttraction(id, body),
    onSuccess: (row) => {
      upsertAttractionInCache(row);
      setEditAttraction(null);
      addToast('Attraction updated.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not update attraction.'), 'error'),
  });

  const deleteAttrMut = useMutation({
    mutationFn: deleteAttraction,
    onSuccess: (_, attractionId) => {
      void qc.invalidateQueries({ queryKey: ['attractions'], exact: false });
      void qc.invalidateQueries({ queryKey: ['tours'], exact: false });
      clearAttractionToursServerSearchCaches(qc);
      setPendingDeleteAttraction(null);
      setSelectedAttractionId((cur) => (cur === attractionId ? null : cur));
      addToast('Attraction removed.', 'warning');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not delete attraction.'), 'error'),
  });

  const createTourMut = useMutation({
    mutationFn: ({
      body,
      bannerFile,
    }: {
      body: import('@/api/attractionToursApi').CreateTourPayload;
      bannerFile?: File | null;
    }) => createTour(body, bannerFile ? { bannerFile } : undefined),
    onSuccess: (row) => {
      upsertTourInCache(row, null);
      setShowAddTour(false);
      addToast('Tour created.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not create tour.'), 'error'),
  });

  const updateTourMut = useMutation({
    mutationFn: ({
      id,
      body,
      prevAttractionId,
      bannerFile,
      removeBanner,
    }: {
      id: number;
      body: Parameters<typeof updateTour>[1];
      prevAttractionId: number;
      bannerFile?: File | null;
      removeBanner?: boolean;
    }) =>
      updateTour(id, body, {
        ...(bannerFile ? { bannerFile } : {}),
        ...(removeBanner ? { removeBanner: true } : {}),
      }).then((row) => ({ row, prevAttractionId })),
    onSuccess: ({ row, prevAttractionId }) => {
      upsertTourInCache(row, prevAttractionId);
      setEditTour(null);
      addToast('Tour updated.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not update tour.'), 'error'),
  });

  const deleteTourMut = useMutation({
    mutationFn: deleteTour,
    onSuccess: (_, tourId) => {
      void qc.invalidateQueries({ queryKey: ['tours'], exact: false });
      void qc.invalidateQueries({ queryKey: ['attractions'], exact: false });
      clearAttractionToursServerSearchCaches(qc);
      setPendingDeleteTour(null);
      setSelectedTourId((cur) => (cur === tourId ? null : cur));
      addToast('Tour removed.', 'warning');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not delete tour.'), 'error'),
  });

  const listForTable = useMemo(
    () => (pageTab === 'Attractions' ? displayAttractions : displayTours),
    [pageTab, displayAttractions, displayTours],
  );
  const serverTotal = listForTable.length;
  const { offset, limit } = getPageParams(page, pageSize);
  const paginated = useMemo(
    () => listForTable.slice(offset, offset + limit),
    [listForTable, offset, limit],
  );
  const pageCount = getTotalPages(serverTotal, pageSize);
  const { rangeStart, rangeEnd } = getPageRange(page, serverTotal, pageSize);

  const attractionTilesGridClass =
    attractionsTileSize === 'large'
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start'
      : attractionsTileSize === 'medium'
        ? 'grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 items-start'
        : 'grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 items-start';

  /** Initial load: lookups + both full lists, or a committed database search on the active tab. */
  const loading =
    lookupsQuery.isPending ||
    attractionsQuery.isPending ||
    toursQuery.isPending ||
    (pageTab === 'Attractions' &&
      attractionSearchActive &&
      (serverAttractionsSearchQuery.isPending || serverAttractionsSearchQuery.isFetching)) ||
    (pageTab === 'Tours' &&
      tourSearchActive &&
      (serverToursSearchQuery.isPending || serverToursSearchQuery.isFetching));
  /** Top progress bar when a background refetch runs after mutations, etc. */
  const refreshing =
    (attractionsQuery.isFetching && !attractionsQuery.isPending) ||
    (toursQuery.isFetching && !toursQuery.isPending) ||
    (lookupsQuery.isFetching && !lookupsQuery.isPending);

  const toggleAttractionSort = useCallback((col: 'name' | 'tours') => {
    setAttractionSort((s) =>
      s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    );
    setPage(1);
  }, []);

  const toggleTourSort = useCallback(
    (col: 'tour' | 'attraction' | 'class' | 'management') => {
      setTourSort((s) =>
        s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
      );
      setPage(1);
    },
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [attractionSearch, tourSearch, pageTab, attractionSort, tourSort]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    saveAttractionsSortState(attractionSort);
  }, [attractionSort]);

  useEffect(() => {
    saveToursSortState(tourSort);
  }, [tourSort]);

  const selectedAttraction = selectedAttractionId
    ? attractions.find((a) => a.attractionId === selectedAttractionId) ??
      displayAttractions.find((a) => a.attractionId === selectedAttractionId) ??
      null
    : null;
  const selectedTour = selectedTourId
    ? tours.find((t) => t.tourId === selectedTourId) ??
      displayTours.find((t) => t.tourId === selectedTourId) ??
      null
    : null;

  const attractionTours = selectedAttraction
    ? tours.filter(
        (t) =>
          Number(t.attractionId) === Number(selectedAttraction.attractionId),
      )
    : [];

  const toursByAttractionId = useMemo(() => {
    const byAttraction = new Map<number, ApiTourListRow[]>();
    for (const t of tours) {
      const arr = byAttraction.get(t.attractionId);
      if (arr) arr.push(t);
      else byAttraction.set(t.attractionId, [t]);
    }
    for (const arr of byAttraction.values()) {
      arr.sort(compareTours);
    }
    return byAttraction;
  }, [tours]);

  const lkp = lookupsQuery.data;
  const classes = lkp?.classes ?? [];
  const venueTypes = lkp?.venueTypes ?? [];
  const ageRanges = lkp?.ageRanges ?? [];
  const companies = lkp?.companies ?? [];

  const managementCompanyOptions = useMemo(() => {
    const talentAgencies = companies.filter(
      (c) =>
        (c.companyTypeNames ?? []).some(
          (name) => name.trim().toLowerCase() === 'talent agency',
        ) ||
        (c.companyTypeName ?? '').trim().toLowerCase() === 'talent agency',
    );
    return companyToSelect2Options(talentAgencies);
  }, [companies]);
  const companyOptions = useMemo(() => companyToSelect2Options(companies), [companies]);

  return (
    <div className="space-y-4">
      {refreshing && !loading && (
        <div
          className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse bg-ems-accent/90" />
        </div>
      )}

      <AlertDialog
        open={pendingDeleteAttraction !== null}
        onOpenChange={(open) => {
          if (!open && !deleteAttrMut.isPending) setPendingDeleteAttraction(null);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this attraction?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You’re about to remove{' '}
              <span className="font-medium text-text-primary">
                {pendingDeleteAttraction?.attractionName ?? 'this attraction'}
              </span>{' '}
              from your list. If something blocks the removal, you’ll see a short explanation right after
              you confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteAttrMut.isPending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
              <span>Removing attraction…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteAttrMut.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAttrMut.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => {
                if (!pendingDeleteAttraction) return;
                void deleteAttrMut.mutateAsync(pendingDeleteAttraction.attractionId);
              }}
            >
              {deleteAttrMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove attraction'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteTour !== null}
        onOpenChange={(open) => {
          if (!open && !deleteTourMut.isPending) setPendingDeleteTour(null);
        }}
      >
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">Remove this tour?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You’re about to remove{' '}
              <span className="font-medium text-text-primary">
                {pendingDeleteTour?.tourName ?? 'this tour'}
              </span>{' '}
              from your list. If something blocks the removal, you’ll see a short explanation right after you
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTourMut.isPending && (
            <div
              className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary"
              role="status"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
              <span>Removing tour…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteTourMut.isPending}
              className="border-border bg-elevated text-text-primary hover:bg-hover mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteTourMut.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => {
                const id = pendingDeleteTour?.tourId;
                if (id == null) return;
                void deleteTourMut.mutateAsync(id);
              }}
            >
              {deleteTourMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Removing…
                </>
              ) : (
                'Yes, remove tour'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(attractionsQuery.isError || toursQuery.isError || lookupsQuery.isError) && (
        <div className="text-sm text-ems-coral border border-ems-coral/30 rounded-md px-3 py-2 bg-ems-coral-dim">
          Could not load Attraction-Tours data.{' '}
          {(attractionsQuery.error as Error)?.message ||
            (toursQuery.error as Error)?.message ||
            (lookupsQuery.error as Error)?.message}
          . Is the API running at <code className="text-xs">/api</code>?
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-text-primary">Attraction Tours</h1>
          {loading ? (
            <Skeleton className="h-5 w-12 rounded bg-muted/80" aria-hidden />
          ) : (
            <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary tabular-nums">
              {serverTotal.toLocaleString()}
            </span>
          )}
          <TabBar tabs={['Attractions', 'Tours']} active={pageTab} onChange={setPageTab} />
        </div>
        <div className="flex items-center gap-2">
          {pageTab === 'Attractions' && (
            <button
              type="button"
              onClick={() => setShowAddAttraction(true)}
              disabled={loading || !classes.length}
              className="bg-ems-accent hover:bg-ems-accent/80 text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Attraction
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddTour(true)}
            disabled={loading || !attractions.length || !classes.length}
            className="bg-ems-accent hover:bg-ems-accent/80 text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Tour
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {pageTab === 'Attractions' ? (
          <div className="relative w-full min-w-0 sm:w-64" ref={attractionSearchRef}>
            <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
              <input
                type="text"
                className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search attractions..."
                value={attractionInput}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value;
                  setAttractionInput(v);
                  setShowAttractionSuggestions(true);
                  if (!v.trim()) setAttractionSearch('');
                }}
                onFocus={() => {
                  if (attractionInput.trim()) setShowAttractionSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAttractionSearch(attractionInput.trim());
                    setShowAttractionSuggestions(false);
                  }
                  if (e.key === 'Escape') setShowAttractionSuggestions(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setAttractionSearch(attractionInput.trim());
                  setShowAttractionSuggestions(false);
                }}
                className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors"
                title="Search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {showAttractionSuggestions && attractionInput.trim().length >= 1 && (
              <div
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
                onMouseDown={(e) => e.preventDefault()}
              >
                {attractionSuggestions.length > 0 ? (
                  attractionSuggestions.map((s, i) => (
                    <button
                      key={`${i}-${s}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAttractionInput(s);
                        setAttractionSearch(s);
                        setShowAttractionSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2.5 text-sm text-text-muted">No matching attractions</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full min-w-0 sm:w-64" ref={tourSearchRef}>
            <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
              <input
                type="text"
                className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search tours..."
                value={tourInput}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value;
                  setTourInput(v);
                  setShowTourSuggestions(true);
                  if (!v.trim()) setTourSearch('');
                }}
                onFocus={() => {
                  if (tourInput.trim()) setShowTourSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTourSearch(tourInput.trim());
                    setShowTourSuggestions(false);
                  }
                  if (e.key === 'Escape') setShowTourSuggestions(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setTourSearch(tourInput.trim());
                  setShowTourSuggestions(false);
                }}
                className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors"
                title="Search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {showTourSuggestions && tourInput.trim().length >= 1 && (
              <div
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
                onMouseDown={(e) => e.preventDefault()}
              >
                {tourSuggestions.length > 0 ? (
                  tourSuggestions.map((s, idx) => (
                    <button
                      key={`${s}-${idx}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTourInput(s);
                        setTourSearch(s);
                        setShowTourSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2.5 text-sm text-text-muted">No matching tours</div>
                )}
              </div>
            )}
          </div>
        )}
        {(hasActiveTabFilters || pageTab === 'Attractions') && (
          <div className="sm:ml-auto flex flex-wrap items-center gap-2 justify-end">
            {hasActiveTabFilters ? (
              <button
                type="button"
                onClick={resetTabFilters}
                disabled={loading}
                className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset search filters"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </button>
            ) : null}
            {pageTab === 'Attractions' ? (
            <>
            <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => {
                  setAttractionsViewMode('list');
                  saveAttractionsViewMode('list');
                  setExpandedAttractionTileId(null);
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  attractionsViewMode === 'list'
                    ? 'bg-elevated text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                title="List view"
              >
                <List className="h-3.5 w-3.5" aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttractionsViewMode('tiles');
                  saveAttractionsViewMode('tiles');
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  attractionsViewMode === 'tiles'
                    ? 'bg-elevated text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                ].join(' ')}
                title="Tile view"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Tiles
              </button>
            </div>
            {attractionsViewMode === 'tiles' && (
              <div
                className="inline-flex items-center rounded-md border border-border bg-surface p-0.5"
                role="group"
                aria-label="Attraction tile size"
              >
                {(
                  [
                    { id: 'large' as const, label: 'L', title: 'Large — 3 columns on wide screens (original)' },
                    { id: 'medium' as const, label: 'M', title: 'Medium — ~66% of large tile width, more columns' },
                    { id: 'small' as const, label: 'S', title: 'Small — ~50% of large tile width, more columns' },
                  ] as const
                ).map(({ id, label, title }) => (
                  <button
                    key={id}
                    type="button"
                    title={title}
                    aria-label={title}
                    aria-pressed={attractionsTileSize === id}
                    onClick={() => {
                      setAttractionsTileSize(id);
                      saveAttractionsTileSize(id);
                    }}
                    className={[
                      'min-w-[1.75rem] px-2 py-1 text-xs font-semibold rounded transition-colors',
                      attractionsTileSize === id
                        ? 'bg-elevated text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            </>
            ) : null}
          </div>
        )}
      </div>

      {loading ? (
        <AttractionToursTableSkeleton
          variant={pageTab === 'Attractions' ? 'attractions' : 'tours'}
          rowCount={isAllPageSize(pageSize) ? PAGE_SIZE : pageSize}
        />
      ) : (
        <>
          {pageTab === 'Attractions' && (
            <>
              {attractionsViewMode === 'list' ? (
                <div className="bg-card border border-border rounded-lg overflow-x-auto overflow-y-clip">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-text-muted text-xs border-b border-border bg-surface">
                        <th className="text-left py-2.5 px-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                            onClick={() => toggleAttractionSort('name')}
                          >
                            Attraction Name
                            {attractionSort.col === 'name' &&
                              (attractionSort.dir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                              ))}
                          </button>
                        </th>
                        <th className="text-left py-2.5 px-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                            onClick={() => toggleAttractionSort('tours')}
                          >
                            Active Tours
                            {attractionSort.col === 'tours' &&
                              (attractionSort.dir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                              ))}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverTotal === 0 && !attractionsQuery.isError && (
                        <tr>
                          <td colSpan={3} className="py-12 px-3 text-center text-sm text-text-muted">
                            {!attractionSearch.trim()
                              ? 'No attractions found.'
                              : 'No attractions match your search.'}
                          </td>
                        </tr>
                      )}
                      {(paginated as ApiAttractionListRow[]).map((a) => (
                        <tr
                          key={a.attractionId}
                          onClick={() => setSelectedAttractionId(a.attractionId)}
                          className="border-b border-border/50 hover:bg-hover cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-text-primary font-medium">{a.attractionName}</td>
                          <td className="py-2.5 px-3 text-text-secondary tabular-nums text-sm">{a.activeTourCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {serverTotal === 0 && !attractionsQuery.isError ? (
                    <div className="rounded-lg border border-border bg-card py-12 px-3 text-center text-sm text-text-muted">
                      {!attractionSearch.trim()
                        ? 'No attractions found.'
                        : 'No attractions match your search.'}
                    </div>
                  ) : (
                    <div className={attractionTilesGridClass}>
                      {(paginated as ApiAttractionListRow[]).map((a) => {
                        const isExpanded = expandedAttractionTileId === a.attractionId;
                        const toursForAttraction = toursByAttractionId.get(a.attractionId) ?? [];
                        const thumb = getThumbnailUrl(a as unknown as Record<string, unknown>);
                        return (
                          <div
                            key={a.attractionId}
                            className="rounded-xl border border-border bg-card overflow-hidden w-full min-w-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAttractionTileId((cur) =>
                                  cur === a.attractionId ? null : a.attractionId,
                                )
                              }
                              className="w-full text-left transition-colors hover:bg-surface/40"
                            >
                              <div className="p-3">
                                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border/70 bg-elevated">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt={`${a.attractionName} thumbnail`}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ems-accent-dim/50 to-ems-purple-dim/50 text-text-secondary">
                                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/70 text-sm font-semibold text-text-primary">
                                        {initialsFromName(a.attractionName)}
                                      </span>
                                      <span className="text-[11px] uppercase tracking-wide">Attraction</span>
                                    </div>
                                  )}
                                  <span className="absolute right-2 top-2 rounded-md bg-card/90 border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                    {a.activeTourCount} tours
                                  </span>
                                </div>
                                <div className="mt-2.5 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-text-primary truncate" title={a.attractionName}>
                                      {a.attractionName}
                                    </p>
                                    <p className="text-[11px] text-text-muted">Common proper name</p>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
                                  )}
                                </div>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-border/80 bg-surface/30 px-3 py-3 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Related Tours
                                  </h3>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-md border border-ems-accent px-2 py-1 text-xs font-medium text-ems-accent transition-colors hover:bg-ems-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                                      onClick={() => setShowAddTour(true)}
                                    >
                                      <Plus className="h-3.5 w-3.5" aria-hidden />
                                      Add Tour
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                                      onClick={() => setSelectedAttractionId(a.attractionId)}
                                    >
                                      Open details
                                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </div>
                                </div>
                                {toursForAttraction.length === 0 ? (
                                  <p className="text-xs text-text-muted">No tours attached yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {toursForAttraction.map((t) => (
                                      <TourThumbnailTile
                                        key={t.tourId}
                                        tour={t}
                                        onClick={(tour) => {
                                          setSelectedAttractionId(null);
                                          setPageTab('Tours');
                                          setSelectedTourId(tour.tourId);
                                          setTourInput(tour.tourName);
                                          setTourSearch(tour.tourName);
                                          setShowTourSuggestions(false);
                                          setTourDrawerTab('Details');
                                          setPage(1);
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {pageTab === 'Attractions' && serverTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
                  <p className="tabular-nums">
                    Showing{' '}
                    <span className="text-text-primary font-medium">
                      {rangeStart}–{rangeEnd}
                    </span>{' '}
                    of <span className="text-text-primary font-medium">{serverTotal.toLocaleString()}</span>
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-text-muted">
                      <span aria-hidden>·</span>
                      <PageSizeSelect
                        value={pageSize}
                        onChange={setPageSize}
                        disabled={attractionsQuery.isFetching}
                      />
                      <span>per page</span>
                    </span>
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                      disabled={page <= 1 || attractionsQuery.isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="text-text-muted tabular-nums px-1">
                      Page {page} / {pageCount}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                      disabled={page >= pageCount || attractionsQuery.isFetching}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {pageTab === 'Tours' && (
            <>
              <div className="bg-card border border-border rounded-lg overflow-x-auto overflow-y-clip">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border bg-surface">
                      <th className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                          onClick={() => toggleTourSort('tour')}
                        >
                          Tour Name
                          {tourSort.col === 'tour' &&
                            (tourSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </th>
                      <th className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                          onClick={() => toggleTourSort('attraction')}
                        >
                          Attraction
                          {tourSort.col === 'attraction' &&
                            (tourSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </th>
                      <th className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                          onClick={() => toggleTourSort('class')}
                        >
                          Class
                          {tourSort.col === 'class' &&
                            (tourSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </th>
                      <th className="text-left py-2.5 px-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium hover:text-text-primary"
                          onClick={() => toggleTourSort('management')}
                        >
                          Talent Agency
                          {tourSort.col === 'management' &&
                            (tourSort.dir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                            ))}
                        </button>
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {serverTotal === 0 && !toursQuery.isError && (
                      <tr>
                        <td colSpan={5} className="py-12 px-3 text-center text-sm text-text-muted">
                          {!tourSearch.trim() ? 'No tours found.' : 'No tours match your search.'}
                        </td>
                      </tr>
                    )}
                    {(paginated as ApiTourListRow[]).map((t) => (
                      <tr
                        key={t.tourId}
                        onClick={() => {
                          setSelectedTourId(t.tourId);
                          setTourDrawerTab('Details');
                        }}
                        className="border-b border-border/50 hover:bg-hover cursor-pointer"
                      >
                        <td className="py-2.5 px-3 text-text-primary font-medium">{t.tourName}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{t.attractionName}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs bg-elevated px-1.5 py-0.5 rounded text-text-secondary">{t.className}</span>
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary text-sm">{t.talentAgencyCompanyName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageTab === 'Tours' && serverTotal > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-secondary px-1">
                  <p className="tabular-nums">
                    Showing{' '}
                    <span className="text-text-primary font-medium">
                      {rangeStart}–{rangeEnd}
                    </span>{' '}
                    of <span className="text-text-primary font-medium">{serverTotal.toLocaleString()}</span>
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-text-muted">
                      <span aria-hidden>·</span>
                      <PageSizeSelect
                        value={pageSize}
                        onChange={setPageSize}
                        disabled={toursQuery.isFetching}
                      />
                      <span>per page</span>
                    </span>
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                      disabled={page <= 1 || toursQuery.isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="text-text-muted tabular-nums px-1">
                      Page {page} / {pageCount}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                      disabled={page >= pageCount || toursQuery.isFetching}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedAttraction && (
        <AttractionSidePanel
          attraction={selectedAttraction}
          tours={attractionTours}
          addToast={addToast}
          onOpenTour={(tour) => {
            setSelectedAttractionId(null);
            setPageTab('Tours');
            setSelectedTourId(tour.tourId);
            setTourInput(tour.tourName);
            setTourSearch(tour.tourName);
            setShowTourSuggestions(false);
            setTourDrawerTab('Details');
            setPage(1);
          }}
          onClose={() => setSelectedAttractionId(null)}
          onDelete={(a) => setPendingDeleteAttraction(a)}
          onSaved={(row) => upsertAttractionInCache(row)}
        />
      )}

      {selectedTour && (
        <TourDrawer
          tour={selectedTour}
          attractions={attractionsForPicker}
          classes={classes}
          venueTypes={venueTypes}
          companies={companies}
          managementCompanyOptions={managementCompanyOptions}
          companyOptions={companyOptions}
          ageRanges={ageRanges}
          addToast={addToast}
          onClose={() => setSelectedTourId(null)}
          onDelete={(t) => setPendingDeleteTour(t)}
          onSaved={(row, prevAttractionId) => upsertTourInCache(row, prevAttractionId)}
          activeTab={tourDrawerTab}
          onTabChange={setTourDrawerTab}
          onOpenEngagement={(engagementId) => {
            onNavigate?.('engagement-detail', { engagementId });
          }}
        />
      )}

      {showAddAttraction && (
        <Modal title="Add Attraction" onClose={() => setShowAddAttraction(false)} width={600} allowContentOverflow>
          <AttractionForm
            submitting={createAttrMut.isPending}
            onCancel={() => setShowAddAttraction(false)}
            onSave={(body) => void createAttrMut.mutateAsync(body)}
          />
        </Modal>
      )}
      {editAttraction && (
        <Modal title="Edit Attraction" onClose={() => setEditAttraction(null)} width={600} allowContentOverflow>
          <AttractionForm
            initial={editAttraction}
            submitting={updateAttrMut.isPending}
            onCancel={() => setEditAttraction(null)}
            onSave={(body) => void updateAttrMut.mutateAsync({ id: editAttraction.attractionId, body })}
          />
        </Modal>
      )}
      {showAddTour && classes.length > 0 && attractionsForPicker.length > 0 && (
        <Modal
          title="Add Tour"
          onClose={() => !createTourMut.isPending && setShowAddTour(false)}
          width={760}
          allowContentOverflow
        >
          <AddTourForm
            variant="attraction-tours"
            attractions={attractionsForPicker}
            classes={classes}
            managementCompanyOptions={managementCompanyOptions}
            addToast={addToast}
            submitting={createTourMut.isPending}
            onCancel={() => setShowAddTour(false)}
            onSave={(body, bannerFile) =>
              void createTourMut.mutateAsync({ body, bannerFile: bannerFile ?? undefined })
            }
          />
        </Modal>
      )}
      {editTour && (
        <Modal title="Edit Tour" onClose={() => setEditTour(null)} width={960} allowContentOverflow>
          <TourFormDb
            attractions={attractionsForPicker}
            classes={classes}
            companies={companies}
            managementCompanyOptions={managementCompanyOptions}
            companyOptions={companyOptions}
            venueTypes={venueTypes}
            ageRanges={ageRanges}
            initial={editTour}
            submitting={updateTourMut.isPending}
            onCancel={() => setEditTour(null)}
            onSave={(body, opts) =>
              void updateTourMut.mutateAsync({
                id: editTour.tourId,
                body,
                prevAttractionId: editTour.attractionId,
                bannerFile: opts?.bannerFile,
                removeBanner: opts?.removeBanner,
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}

function AttractionForm({
  initial,
  submitting,
  onSave,
  onCancel,
}: {
  initial?: ApiAttractionListRow;
  submitting: boolean;
  onSave: (body: { attractionName: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.attractionName ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';
  return (
    <div className="space-y-4">
      <FormField label="Attraction Name" required error={nameError}>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          maxLength={200}
        />
      </FormField>
      <p className="text-xs text-text-muted">
        Genre (Class) is set at the Tour level, not the Attraction level.
      </p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-text-secondary px-4 py-1.5" disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const t = name.trim();
            if (!t) {
              setNameError('Attraction name is required.');
              return;
            }
            if (t.length > 200) {
              setNameError('Attraction name must be 200 characters or fewer.');
              return;
            }
            setNameError(undefined);
            onSave({ attractionName: t });
          }}
          className="inline-flex items-center gap-2 bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save'}
        </button>
      </div>
    </div>
  );
}

function TourFormDb({
  attractions,
  classes,
  companies,
  managementCompanyOptions,
  companyOptions,
  venueTypes,
  ageRanges,
  initial,
  submitting,
  onSave,
  onCancel,
}: {
  attractions: ApiAttractionListRow[];
  classes: ApiClass[];
  companies: ApiCompanyListRow[];
  managementCompanyOptions: Select2Option[];
  companyOptions: Select2Option[];
  venueTypes: ApiVenueType[];
  ageRanges: ApiAgeRange[];
  initial?: ApiTourListRow;
  submitting: boolean;
  onSave: (
    body: import('@/api/attractionToursApi').CreateTourPayload | import('@/api/attractionToursApi').UpdateTourPayload,
    opts?: { bannerFile?: File | null; removeBanner?: boolean },
  ) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.tourName ?? '');
  const [attractionId, setAttractionId] = useState(
    String(initial?.attractionId ?? attractions[0]?.attractionId ?? ''),
  );
  const [classId, setClassId] = useState(String(initial?.classId ?? classes[0]?.classId ?? ''));
  const [talentAgentCompanyId, setTalentAgentCompanyId] = useState(
    initial?.talentAgencyCompanyId != null ? String(initial.talentAgencyCompanyId) : '',
  );
  const [payableEntityCompanyId, setPayableEntityCompanyId] = useState(
    initial?.tourManagementCompanyId != null ? String(initial.tourManagementCompanyId) : '',
  );
  const [talentAgentContactIds, setTalentAgentContactIds] = useState<string[]>(
    () => (initial?.talentAgentContactIds ?? []).map(String),
  );
  /** Not persisted — skipped on save. */
  const [uiStatus, setUiStatus] = useState('');
  const [ascap, setAscap] = useState(initial?.ascap ?? false);
  const [bmi, setBmi] = useState(initial?.bmi ?? false);
  const [sesac, setSesac] = useState(initial?.sesac ?? false);
  const [gmr, setGmr] = useState(initial?.gmr ?? false);
  const [audienceGender, setAudienceGender] = useState(initial?.audienceGender ?? '');
  const [audienceAgeRangeIds, setAudienceAgeRangeIds] = useState<string[]>(
    () => (initial?.audienceAgeRangeIds ?? []).map(String),
  );
  const [jobName, setJobName] = useState(initial?.jobName ?? '');
  const [tourInsuranceLanguage, setTourInsuranceLanguage] = useState(initial?.tourInsuranceLanguage ?? '');
  const [venueTypePreferenceId, setVenueTypePreferenceId] = useState(
    initial?.venueTypePreferenceId != null ? String(initial.venueTypePreferenceId) : '',
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [stripBanner, setStripBanner] = useState(false);
  const [bannerInputKey, setBannerInputKey] = useState(0);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [workPhoneCountry, setWorkPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [workPhoneDisplay, setWorkPhoneDisplay] = useState('');
  const [cellPhoneCountry, setCellPhoneCountry] = useState<PhoneCountrySelection>(DEFAULT_PHONE_COUNTRY);
  const [cellPhoneDisplay, setCellPhoneDisplay] = useState('');
  const [workPhoneError, setWorkPhoneError] = useState<string | undefined>();
  const [cellPhoneError, setCellPhoneError] = useState<string | undefined>();
  const [contactRoleIds, setContactRoleIds] = useState<string[]>([]);
  const [contactDepartmentIds, setContactDepartmentIds] = useState<string[]>([]);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const selectedTalentAgencyId = Number(talentAgentCompanyId);
  const contactsQuery = useQuery({
    queryKey: ['tour-form-talent-agents', selectedTalentAgencyId],
    queryFn: () => fetchCompanyContacts(selectedTalentAgencyId),
    enabled: Number.isInteger(selectedTalentAgencyId) && selectedTalentAgencyId > 0,
    staleTime: 60_000,
  });
  const contactLookupsQuery = useQuery({
    queryKey: ['contact-form-lookups'],
    queryFn: () => fetchLookups().then(({ roles, departments }) => ({ roles, departments })),
    enabled: showAddContact,
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const u = URL.createObjectURL(bannerFile);
    setBannerPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [bannerFile]);

  useEffect(() => {
    setBannerFile(null);
    setStripBanner(false);
    setBannerInputKey((k) => k + 1);
    setTalentAgentCompanyId(
      initial?.talentAgencyCompanyId != null ? String(initial.talentAgencyCompanyId) : '',
    );
    setPayableEntityCompanyId(
      initial?.tourManagementCompanyId != null ? String(initial.tourManagementCompanyId) : '',
    );
    setTalentAgentContactIds((initial?.talentAgentContactIds ?? []).map(String));
    setAudienceGender(initial?.audienceGender ?? '');
    setAudienceAgeRangeIds((initial?.audienceAgeRangeIds ?? []).map(String));
    setJobName(initial?.jobName ?? '');
    setShowAddContact(false);
  }, [initial?.tourId]);

  const clearError = useCallback((key: string) => {
    setFieldErrors((e) => clearFormFieldError(e, key));
  }, []);

  const inputCls =
    'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const attractionOptions = attractions.map((a) => ({
    value: String(a.attractionId),
    label: a.attractionName,
  }));
  const classOptions = classes.map((c) => ({ value: String(c.classId), label: c.className }));
  const mgmtOptions = useMemo(
    () =>
      buildTourManagementSelectOptions(
        managementCompanyOptions,
        companies,
        initial?.talentAgencyCompanyId,
        initial?.talentAgencyCompanyName,
      ),
    [
      managementCompanyOptions,
      companies,
      initial?.talentAgencyCompanyId,
      initial?.talentAgencyCompanyName,
    ],
  );
  const payableEntityOptions = useMemo(
    () =>
      buildTourManagementSelectOptions(
        companyOptions,
        companies,
        initial?.tourManagementCompanyId,
        initial?.tourManagementCompanyName,
      ),
    [
      companyOptions,
      companies,
      initial?.tourManagementCompanyId,
      initial?.tourManagementCompanyName,
    ],
  );
  const talentAgentOptions = useMemo(
    () =>
      (contactsQuery.data ?? [])
        .map((c) => ({
          value: String(c.contactId),
          label:
            `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
            c.email ||
            `Contact #${c.contactId}`,
        }))
        .filter((opt, index, all) => all.findIndex((x) => x.value === opt.value) === index)
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [contactsQuery.data],
  );
  const selectedTalentAgentLabels = useMemo(() => {
    if (!talentAgentContactIds.length) return [];
    const optionById = new Map(talentAgentOptions.map((opt) => [opt.value, opt.label]));
    return talentAgentContactIds.map((id) => optionById.get(id) ?? `Contact #${id}`);
  }, [talentAgentContactIds, talentAgentOptions]);
  useEffect(() => {
    if (!talentAgentOptions.length || !talentAgentContactIds.length) return;
    const allowed = new Set(talentAgentOptions.map((opt) => opt.value));
    setTalentAgentContactIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [talentAgentOptions, talentAgentContactIds.length]);
  const statusOptions = [{ value: '', label: '—' }, ...TOUR_STATUS_OPTIONS];
  const venueTypeOptions = [{ value: '', label: '—' }, ...venueTypes.map((v) => ({ value: String(v.venueTypeId), label: v.venueTypeName }))];
  const ageRangeOptions = ageRanges.map((range) => ({
    value: String(range.ageRangeId),
    label: range.ageRangeLabel,
  }));

  const buildPayload = (): import('@/api/attractionToursApi').CreateTourPayload => ({
    tourName: name.trim(),
    attractionId: Number(attractionId),
    classId: Number(classId),
    ascap,
    bmi,
    sesac,
    gmr,
    talentAgencyCompanyId: talentAgentCompanyId ? Number(talentAgentCompanyId) : null,
    tourManagementCompanyId: payableEntityCompanyId ? Number(payableEntityCompanyId) : null,
    talentAgentContactIds: talentAgentContactIds.map(Number),
    audienceGender: audienceGender.trim() || null,
    audienceAgeRangeIds: audienceAgeRangeIds.map(Number),
    jobName: jobName.trim() || null,
    tourInsuranceLanguage: tourInsuranceLanguage.trim() || null,
    venueTypePreferenceId: venueTypePreferenceId ? Number(venueTypePreferenceId) : null,
  });

  const validateAndSave = () => {
    const next: Partial<Record<string, string>> = {};
    const tn = name.trim();
    if (!tn) next.tourName = 'Tour name is required.';
    else if (tn.length > 200) next.tourName = 'Tour name must be 200 characters or fewer.';
    const aId = Number(attractionId);
    if (!attractionId || !Number.isFinite(aId) || aId < 1) {
      next.attraction = 'Attraction is required.';
    }
    const cId = Number(classId);
    if (!classId || !Number.isFinite(cId) || cId < 1) {
      next.class = 'Class (genre) is required.';
    }
    if (audienceGender && !AUDIENCE_GENDER_OPTIONS.some((option) => option.value === audienceGender)) {
      next.audienceGender = 'Choose All, Male, or Female.';
    }
    if (jobName.trim().length > 255) {
      next.jobName = 'Tour job must be 255 characters or fewer.';
    }
    if (tourInsuranceLanguage.trim().length > 2000) {
      next.insurance = 'Tour insurance language must be 2000 characters or fewer.';
    }
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    onSave(buildPayload(), {
      bannerFile: bannerFile ?? undefined,
      removeBanner: Boolean(
        initial?.tourBannerImageUrl && stripBanner && !bannerFile,
      ),
    });
  };

  const resetContactDraft = () => {
    setContactFirstName('');
    setContactLastName('');
    setContactEmail('');
    setWorkPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setWorkPhoneDisplay('');
    setCellPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setCellPhoneDisplay('');
    setWorkPhoneError(undefined);
    setCellPhoneError(undefined);
    setContactRoleIds([]);
    setContactDepartmentIds([]);
    setContactError(null);
  };

  const handleCreateContact = async () => {
    const companyId = Number(talentAgentCompanyId);
    if (!Number.isInteger(companyId) || companyId < 1) {
      setContactError('Select a talent agency first.');
      return;
    }
    if (!contactFirstName.trim() || !contactLastName.trim() || !contactEmail.trim()) {
      setContactError('First name, last name, and email are required.');
      return;
    }
    const roleIds = Array.from(
      new Set(contactRoleIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)),
    );
    const departmentIds = Array.from(
      new Set(
        contactDepartmentIds
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (roleIds.length === 0 || departmentIds.length === 0) {
      setContactError('Select at least one role and one department for the new contact.');
      return;
    }
    let wErr: string | undefined;
    let cErr: string | undefined;
    if (workPhoneDisplay.trim() && !workPhoneCountry) {
      wErr = 'Select a country for work phone, or clear the number.';
    }
    if (cellPhoneDisplay.trim() && !cellPhoneCountry) {
      cErr = 'Select a country for cell phone, or clear the number.';
    }
    if (wErr || cErr) {
      setWorkPhoneError(wErr);
      setCellPhoneError(cErr);
      return;
    }
    const workPhoneE164 = tryE164FromDisplay(workPhoneDisplay, workPhoneCountry);
    const cellPhoneE164 = tryE164FromDisplay(cellPhoneDisplay, cellPhoneCountry);
    if (workPhoneDisplay.trim() && !workPhoneE164) wErr = PHONE_INVALID_MESSAGE;
    if (cellPhoneDisplay.trim() && !cellPhoneE164) cErr = PHONE_INVALID_MESSAGE;
    setWorkPhoneError(wErr);
    setCellPhoneError(cErr);
    if (wErr || cErr) return;
    setContactSaving(true);
    setContactError(null);
    try {
      const created = await createCompanyContact(companyId, {
        firstName: contactFirstName.trim(),
        lastName: contactLastName.trim(),
        email: contactEmail.trim(),
        workPhone: workPhoneDisplay.trim() ? workPhoneE164 : undefined,
        cellPhone: cellPhoneDisplay.trim() ? cellPhoneE164 : undefined,
        roleIds,
        departmentIds,
      });
      await qc.invalidateQueries({ queryKey: ['tour-form-talent-agents', companyId] });
      const newId = String(created.contactId);
      setTalentAgentContactIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
      setShowAddContact(false);
      resetContactDraft();
    } catch (e) {
      setContactError(friendlyApiError(e, 'Could not add the contact.'));
    } finally {
      setContactSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField label="Tour Name" required error={fieldErrors.tourName}>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError('tourName');
          }}
          maxLength={200}
          placeholder="e.g. World Tour 2025"
        />
      </FormField>
      <FormField label="Tour banner image" optional>
        <p className="text-[11px] text-text-muted mb-2">
          JPEG, PNG, WebP, or GIF — max 5 MB. Replaces the current banner when you save.
        </p>
        <div className="space-y-2">
          <input
            key={bannerInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={submitting}
            className="block w-full text-xs text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-hover"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setBannerFile(f);
              if (f) setStripBanner(false);
              setFieldErrors({});
            }}
          />
          {initial?.tourBannerImageUrl && !bannerPreview && (
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={initial.tourBannerImageUrl}
                alt=""
                className="h-16 w-28 rounded-md border border-border object-cover bg-elevated"
              />
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stripBanner}
                  disabled={submitting}
                  onChange={(e) => {
                    setStripBanner(e.target.checked);
                    if (e.target.checked) {
                      setBannerFile(null);
                      setBannerInputKey((k) => k + 1);
                    }
                    setFieldErrors({});
                  }}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                Remove current image
              </label>
            </div>
          )}
          {bannerPreview && (
            <div className="flex items-start gap-3">
              <img
                src={bannerPreview}
                alt=""
                className="h-16 w-28 rounded-md border border-border object-cover bg-elevated"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setBannerFile(null);
                  setBannerInputKey((k) => k + 1);
                }}
                className="text-xs text-ems-accent hover:underline disabled:opacity-50"
              >
                Clear new upload
              </button>
            </div>
          )}
        </div>
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Attraction" required error={fieldErrors.attraction}>
          <Select2
            options={attractionOptions}
            value={attractionId}
            onChange={(v) => {
              setAttractionId(v);
              clearError('attraction');
            }}
          />
        </FormField>
        <FormField label="Class (genre)" required error={fieldErrors.class}>
          <Select2
            options={classOptions}
            value={classId}
            onChange={(v) => {
              setClassId(v);
              clearError('class');
            }}
          />
        </FormField>
      </div>
      <FormField label="Talent Agency">
        <Select2
          options={mgmtOptions}
          value={talentAgentCompanyId}
          onChange={(v) => {
            setTalentAgentCompanyId(v);
            setTalentAgentContactIds([]);
            setShowAddContact(false);
          }}
          placeholder="Select talent agency…"
          allowClear
        />
      </FormField>
      <FormField label="Talent Agents">
        <Select2Multi
          options={talentAgentOptions}
          values={talentAgentContactIds}
          onChange={setTalentAgentContactIds}
          placeholder={
            !talentAgentCompanyId
              ? 'Select a talent agency first'
              : contactsQuery.isLoading
                ? 'Loading talent agents…'
                : talentAgentOptions.length
                  ? 'Select one or more talent agents…'
                  : 'No contacts found for this agency'
          }
          disabled={!talentAgentCompanyId || contactsQuery.isLoading || submitting}
        />
        {talentAgentCompanyId && (
          <div className="mt-2 space-y-2">
            <div className="rounded-md border border-border bg-surface px-2.5 py-2">
              {contactsQuery.isLoading ? (
                <p className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Loading agency contacts…
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-text-secondary">
                    Selected for this tour:{' '}
                    <span className="font-medium text-text-primary">
                      {selectedTalentAgentLabels.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-text-primary">
                      {talentAgentOptions.length}
                    </span>{' '}
                    company contact{talentAgentOptions.length === 1 ? '' : 's'}.
                  </p>
                  {selectedTalentAgentLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTalentAgentLabels.map((label, index) => (
                        <span
                          key={`${label}-${index}`}
                          className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-text-primary"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted">
                      No specific talent agents selected for this tour yet.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowAddContact((open) => !open);
                setContactError(null);
              }}
              className="text-xs font-medium text-ems-accent hover:underline disabled:opacity-50"
            >
              + Add New Contact
            </button>
            {showAddContact && (
              <div className="rounded-md border border-border bg-elevated/70 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="First Name" required>
                    <input className={inputCls} value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} placeholder="First name" maxLength={100} disabled={contactSaving} />
                  </FormField>
                  <FormField label="Last Name" required>
                    <input className={inputCls} value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} placeholder="Last name" maxLength={100} disabled={contactSaving} />
                  </FormField>
                  <FormField label="Email" required>
                    <input className={inputCls} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" maxLength={254} disabled={contactSaving} />
                  </FormField>
                  <ContactPhoneRow
                    label="Work Phone"
                    country={workPhoneCountry}
                    display={workPhoneDisplay}
                    onCountry={(value) => {
                      setWorkPhoneCountry(value);
                      setWorkPhoneError(undefined);
                    }}
                    onDisplay={(value) => {
                      setWorkPhoneDisplay(value);
                      setWorkPhoneError(undefined);
                    }}
                    error={workPhoneError}
                  />
                  <ContactPhoneRow
                    label="Cell Phone"
                    country={cellPhoneCountry}
                    display={cellPhoneDisplay}
                    onCountry={(value) => {
                      setCellPhoneCountry(value);
                      setCellPhoneError(undefined);
                    }}
                    onDisplay={(value) => {
                      setCellPhoneDisplay(value);
                      setCellPhoneError(undefined);
                    }}
                    error={cellPhoneError}
                  />
                  <FormField label="Role" required>
                    <Select2Multi
                      options={(contactLookupsQuery.data?.roles ?? []).map((r) => ({ value: String(r.roleId), label: r.roleName }))}
                      values={contactRoleIds}
                      onChange={setContactRoleIds}
                      placeholder={contactLookupsQuery.isLoading ? 'Loading roles…' : 'Select one or more roles…'}
                      disabled={contactSaving || contactLookupsQuery.isLoading}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Department" required>
                      <Select2Multi
                        options={(contactLookupsQuery.data?.departments ?? []).map((d) => ({ value: String(d.departmentId), label: d.departmentName }))}
                        values={contactDepartmentIds}
                        onChange={setContactDepartmentIds}
                        placeholder={contactLookupsQuery.isLoading ? 'Loading departments…' : 'Select one or more departments…'}
                        disabled={contactSaving || contactLookupsQuery.isLoading}
                      />
                    </FormField>
                  </div>
                </div>
                {contactError && <p className="text-xs text-ems-coral">{contactError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={contactSaving} onClick={() => { setShowAddContact(false); resetContactDraft(); }} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" disabled={contactSaving || contactLookupsQuery.isLoading} onClick={() => void handleCreateContact()} className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60">
                    {contactSaving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                    Save contact
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </FormField>
      <FormField label="Payable Entity" optional>
        <Select2
          options={payableEntityOptions}
          value={payableEntityCompanyId}
          onChange={setPayableEntityCompanyId}
          placeholder="Select payable entity…"
          allowClear
          disabled={submitting}
        />
      </FormField>
      <FormField label="Status (optional)">
        <Select2 options={statusOptions} value={uiStatus} onChange={setUiStatus} placeholder="—" allowClear />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Audience Gender" error={fieldErrors.audienceGender}>
          <Select2
            options={[...AUDIENCE_GENDER_OPTIONS]}
            value={audienceGender}
            onChange={(value) => {
              setAudienceGender(value);
              clearError('audienceGender');
            }}
            placeholder="Select gender…"
            allowClear
          />
        </FormField>
        <FormField label="Audience Age Range">
          <Select2Multi
            options={ageRangeOptions}
            values={audienceAgeRangeIds}
            onChange={(values) => {
              setAudienceAgeRangeIds(values);
              clearError('audienceAge');
            }}
            placeholder="Select one or more age ranges…"
            disabled={submitting}
          />
        </FormField>
        <FormField label="Tour Job" error={fieldErrors.jobName}>
          <input
            className={inputCls}
            value={jobName}
            onChange={(e) => {
              setJobName(e.target.value);
              clearError('jobName');
            }}
            maxLength={255}
            placeholder="QuickBooks job classification"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Preferred Venue Type">
          <Select2
            options={venueTypeOptions}
            value={venueTypePreferenceId}
            onChange={setVenueTypePreferenceId}
            placeholder="Select venue type…"
            allowClear
          />
        </FormField>
      </div>
      <FormField label="Tour Insurance Language" error={fieldErrors.insurance}>
        <textarea
          className={inputCls}
          value={tourInsuranceLanguage}
          onChange={(e) => {
            setTourInsuranceLanguage(e.target.value);
            clearError('insurance');
          }}
          rows={3}
          maxLength={2000}
          placeholder="Enter insurance requirements and language…"
        />
      </FormField>
      <div>
        <span className="text-xs font-medium text-text-secondary">Performing rights</span>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ascap} onChange={(e) => setAscap(e.target.checked)} />
            ASCAP
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={bmi} onChange={(e) => setBmi(e.target.checked)} />
            BMI
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sesac} onChange={(e) => setSesac(e.target.checked)} />
            SESAC
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={gmr} onChange={(e) => setGmr(e.target.checked)} />
            GMR
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <button type="button" onClick={onCancel} className="text-text-secondary px-4 py-1.5 text-sm" disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={validateAndSave}
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-ems-accent text-background hover:bg-ems-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save Tour'}
        </button>
      </div>
    </div>
  );
}
