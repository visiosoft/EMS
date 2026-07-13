/**
 * ProjectsPage – Fully dynamic, API-driven.
 * Pattern matches CompaniesPage:
 *   - useQuery / useMutation from @tanstack/react-query
 *   - Server-paginated list (search + stage on API), selectable rows per page
 *   - Auto-reload after every CRUD (invalidateQueries)
 *   - Disabled buttons / spinners while loading
 *   - Success/error toasts
 *   - AlertDialog for delete confirmation
 *   - Drawer for project detail + venues + date options
 *   - Modals for create / edit
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, GripVertical, Loader2, Lock, Pencil, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
  Drawer,
  FormField,
  Modal,
  SearchInput,
  StatusBadge,
  TabBar,
} from './Primitives';
import { Select2 } from './Select2';
import { companyToSelect2Options } from './companySelectOptions';
import { normalizeSearchText, richTextMatches } from './searchUtils';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { cleanDmaMarketLabel } from '@/lib/dmaMarket';
import {
  deriveValidSelectedDmaIds,
  dmaSelectionKey,
  EMPTY_PREFERRED_VENUE_TYPE_IDS,
  fetchAllDmaMarketsForWizard,
  mapSelectionToCanonicalDmaIds,
  normalizePositiveIntId,
  PROJECT_WIZARD_DMA_QUERY_KEY,
} from '@/lib/projectWizardDma';
import { ProjectWizardMarketsStep } from './ProjectWizardMarketsStep';
import { getAccountName, getAccountOid, getActiveAccount } from '@/auth/entra';
import {
  getPageParams,
  getPageRange,
  getTotalPages,
  PAGE_SIZE,
  type PageSizeOption,
  isAllPageSize,
} from '@/lib/serverPagination';
import { PageSizeSelect } from './PageSizeSelect';
import {
  createPerformanceOption,
  createProject,
  createProjectVenue,
  deletePerformanceOption,
  deleteProject,
  deleteProjectVenue,
  fetchProject,
  projectsApiQueryKey,
  projectsSuggestionCacheQueryKey,
  PROJECTS_SUGGESTION_CACHE_LIMIT,
  fetchProjects,
  fetchOptionStatusMeta,
  fetchVenueStatusMeta,

  PROJECT_STAGE_VALUES,
  OFFER_REVIEW_STATUS_VALUES,
  projectStageDisplayLabel,
  updatePerformanceOption,
  updateProject,
  updateProjectVenue,
  OPTION_STATUS_VALUES,
  VENUE_STATUS_VALUES,
  uploadConfirmedOfferPdf,
  getConfirmedOfferPdfUrl,
} from '@/api/projectApi';
import type {
  ApiPerformanceOption,
  ApiProjectDetail,
  ApiProjectListRow,
  ApiProjectVenue,
  OptionStatus,

  ProjectStage,
  OfferReviewStatus,
  VenueStatus,
  CreateProjectResult,
  ProjectOpeningPerformancePayload,
} from '@/api/projectApi';
import type { ApiPaginatedResponse } from '@/api/companyApi';
import {
  createTour,
  fetchAttractions,
  fetchClasses,
  fetchTours,
  fetchVenueTypesLookup,
} from '@/api/attractionToursApi';
import type {
  ApiAttractionListRow,
  ApiClass,
  ApiTourListRow,
  ApiVenueType,
} from '@/api/attractionToursApi';
import {
  fetchCompaniesPickerRows,
  fetchCompanyContacts,
  fetchDmaMarketsPaged,
  fetchTalentAgencyCompanyRows,
  talentAgencyCompaniesQueryKey,
  type ApiCompanyListRow,
  type ApiCompanyContact,
  type ApiDmaMarket,
} from '@/api/companyApi';
import { fetchAllVenues, type ApiAllVenueRow } from '@/api/venueDirectoryApi';
import { AddTourForm } from './AddTourForm';
import { ENGAGEMENT_STATUS_ENUM } from './engagementFormConstants';
import { createEngagement } from '@/api/engagementApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

function projectDetailToListRow(p: ApiProjectDetail): ApiProjectListRow {
  return {
    engagementProjectId: p.engagementProjectId,
    tourId: p.tourId,
    attractionId: p.attractionId ?? null,
    tourName: p.tourName,
    tourStartDate: p.tourStartDate ?? null,
    tourEndDate: p.tourEndDate ?? null,
    attractionName: p.attractionName,
    talentAgencyCompanyId: p.talentAgencyCompanyId ?? null,
    talentAgencyCompanyName: p.talentAgencyCompanyName ?? null,
    projectStage: p.projectStage,
    offerReviewStatus: p.offerReviewStatus ?? null,
    createdDate: p.createdDate,
    createdBy: p.createdBy,
    dmaIds: p.dmaIds ?? [],
  };
}

const PROJECT_LOOKUP_LIMIT = 8000;
/** Avoid rendering thousands of venue checkboxes if DMA filter is dropped server-side. */
const PROJECT_WIZARD_VENUE_RENDER_CAP = 250;
/** Stable empty arrays for query fallbacks — `?? []` inline creates a new reference every render and can infinite-loop effects. */
const EMPTY_DMA_MARKETS: ApiDmaMarket[] = [];
const EMPTY_VENUE_ROWS: ApiAllVenueRow[] = [];
const EMPTY_ATTRACTIONS: ApiAttractionListRow[] = [];
const EMPTY_TOURS: ApiTourListRow[] = [];
const EMPTY_CLASSES: ApiClass[] = [];
const EMPTY_VENUE_TYPES: ApiVenueType[] = [];
const EMPTY_TOUR_LIST: ApiTourListRow[] = [];
const ENGAGEMENT_STATUS_OPTIONS = ENGAGEMENT_STATUS_ENUM.map((s) => ({ value: s, label: s }));


/** API returns one row per market name; label is market name only (no postal in UI). */
function formatDmaPickerLabel(r: { dmaid?: number; marketName?: string | null }): string {
  const name = (r.marketName ?? '').trim();
  if (name) return name;
  return r.dmaid != null ? `DMA #${r.dmaid}` : '—';
}

function formatVenueCapacity(cap: unknown): string {
  const n = typeof cap === 'number' ? cap : Number(cap);
  if (!Number.isFinite(n) || n < 0) return '—';
  return n.toLocaleString();
}

function formatEmsShortWeekdayDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  const datePart = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${datePart} · ${timePart}`;
}

function formatEmsShortWeekdayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatProjectOptionDateTime(dateValue: string | null | undefined, timeValue?: string | null): string {
  if (!dateValue) return '—';
  const cleanDate = String(dateValue).trim();
  const cleanTime = String(timeValue ?? '').trim();
  if (!cleanDate) return '—';
  return formatEmsShortWeekdayDateTime(cleanTime ? `${cleanDate}T${cleanTime}` : cleanDate);
}

function formatProjectDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate || !endDate) return '—';
  return `${formatEmsShortWeekdayDate(startDate)} to ${formatEmsShortWeekdayDate(endDate)}`;
}



class CreateProjectWizardErrorBoundary extends React.Component<
  { children: React.ReactNode; step: number; onRecover: () => void; onClose?: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CreateProjectWizard]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: { step: number }) {
    if (prevProps.step !== this.props.step && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-ems-coral/40 bg-ems-coral/10 px-4 py-4 text-sm space-y-3 min-h-[12rem]">
          <p className="font-medium text-text-primary">Create project wizard ran into an error</p>
          <p className="text-text-muted text-xs break-words">{this.state.error.message}</p>
          <p className="text-[11px] text-text-muted">
            Try another step or close and reopen the wizard. If this repeats, note which step you were on.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="text-sm font-medium text-ems-accent hover:underline"
              onClick={() => {
                this.setState({ error: null });
                this.props.onRecover();
              }}
            >
              Try again on this step
            </button>
            {this.props.onClose && (
              <button
                type="button"
                className="text-sm font-medium text-text-secondary hover:underline"
                onClick={this.props.onClose}
              >
                Close wizard
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function formatVenueWizardLabel(r: ApiAllVenueRow): string {
  const base = (r.venueName ?? '').trim() || `Company #${r.companyId}`;
  const ex = (r.entertainmentComplexNames ?? '').trim();
  return ex ? `${base} (${ex})` : base;
}

// ─── Inline edit primitives (same pattern as CompaniesPage) ────────────────────

function InlineEditField({
  label,
  value,
  onChange,
  placeholder = '—',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  const start = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  };
  const commit = () => {
    if (draft !== value) onChange(draft);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div>
        <label className="text-xs text-text-muted block mb-0.5">{label}</label>
        <div className="flex items-start gap-1.5">
          <input
            ref={ref}
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            className="flex-1 bg-surface border border-ems-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
          />
          <div className="flex gap-0.5 mt-0.5 shrink-0">
            <button type="button" onClick={commit} title="Save field" className="p-1 text-ems-accent hover:bg-elevated rounded transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={cancel} title="Cancel" className="p-1 text-text-muted hover:bg-elevated rounded transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-text-muted block mb-0.5">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={start}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') start();
        }}
        className="group flex items-start gap-2 cursor-pointer py-0.5 px-1.5 -mx-1.5 rounded-md hover:bg-elevated transition-colors"
        title="Click to edit"
      >
        <span className={`text-sm flex-1 ${value ? 'text-text-primary' : 'text-text-muted italic'}`}>{value || placeholder}</span>
        <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0 mt-0.5" />
      </div>
    </div>
  );
}

function InlineSelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const display = (options.find((o) => o.value === value)?.label ?? value) || '—';

  if (editing) {
    return (
      <div>
        <label className="text-xs text-text-muted block mb-0.5">{label}</label>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Select2 options={options} value={value} onChange={(v) => { onChange(v); setEditing(false); }} />
          </div>
          <button type="button" onClick={() => setEditing(false)} className="p-1 text-text-muted hover:bg-elevated rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-text-muted block mb-0.5">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setEditing(true);
        }}
        className="group flex items-center gap-2 cursor-pointer py-0.5 px-1.5 -mx-1.5 rounded-md hover:bg-elevated transition-colors"
        title="Click to edit"
      >
        <span className="text-sm text-text-primary flex-1">{display}</span>
        <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
      </div>
    </div>
  );
}

// ─── Confirmed Offer PDF upload ─────────────────────────────────────────────

function ConfirmedOfferPdfUpload({
  project,
  addToast,
  pendingFile,
  onFileSelected,
  required,
}: {
  project: ApiProjectDetail;
  addToast: Props['addToast'];
  pendingFile: File | null;
  onFileSelected: (file: File | null) => void;
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const hasLink = project.confirmedOfferLinkId != null;
  const hasPendingOrLink = hasLink || pendingFile != null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      addToast('Only PDF files are accepted.', 'warning');
      return;
    }
    onFileSelected(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const pdfPreviewUrl = pendingFile
    ? URL.createObjectURL(pendingFile)
    : hasLink
      ? getConfirmedOfferPdfUrl(project.engagementProjectId)
      : null;

  // Clean up object URL on unmount or when pendingFile changes
  useEffect(() => {
    if (!pendingFile) return;
    const url = URL.createObjectURL(pendingFile);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  return (
    <div className={`rounded-md border bg-surface px-4 py-3 ${required && !hasPendingOrLink ? 'border-red-400' : 'border-border'}`}>
      <span className="text-xs text-text-muted block mb-1.5">
        Confirmed Offer PDF
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {hasPendingOrLink ? (
        <>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-text-primary">
              {pendingFile
                ? <><span className="text-amber-600 text-xs font-medium"></span> {pendingFile.name}</>
                : 'PDF uploaded'}
            </span>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="text-xs text-ems-accent hover:underline inline-flex items-center gap-1"
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="ml-auto text-xs text-ems-accent hover:underline"
            >
              Replace
            </button>
          </div>
          {showPreview && pdfPreviewUrl && (
            <div className="mt-3 rounded border border-border overflow-hidden">
              <iframe
                src={pdfPreviewUrl}
                title="Confirmed Offer PDF Preview"
                className="w-full border-0"
                style={{ height: '500px' }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm text-text-primary hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload PDF
          </button>
          <span className="text-[11px] text-text-muted">
            {required
              ? 'Upload the signed confirmed offer document before saving.'
              : 'Upload the signed confirmed offer document.'}
          </span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function ProjectInlineOverview({
  project,
  tours,
  dmaMarkets,
  onUpdated,
  onGoToVenues,
  onOpenEngagement,
  addToast,
}: {
  project: ApiProjectDetail;
  tours: ApiTourListRow[];
  dmaMarkets: ApiDmaMarket[];
  onUpdated: () => void | Promise<void>;
  onGoToVenues: () => void;
  onOpenEngagement: (engagementId: number) => void;
  addToast: Props['addToast'];
}) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [tourId, setTourId] = useState(project.tourId);
  const [projectStage, setProjectStage] = useState(project.projectStage);
  const [offerReviewStatus, setOfferReviewStatus] = useState<string | null>(
    project.offerReviewStatus ?? null,
  );
  const [tourStartDate, setTourStartDate] = useState(project.tourStartDate ?? getTodayDateString());
  const [tourEndDate, setTourEndDate] = useState(project.tourEndDate ?? getTodayDateString());
  const [talentAgencyCompanyId, setTalentAgencyCompanyId] = useState<number | null>(
    project.talentAgencyCompanyId ?? null,
  );
  const [scopeTransitioning, setScopeTransitioning] = useState(false);
  const [selectedDmaIds, setSelectedDmaIds] = useState<number[]>(project.dmaIds ?? []);
  const [showDmaModal, setShowDmaModal] = useState(false);
  const [dmaDraftIds, setDmaDraftIds] = useState<number[]>(project.dmaIds ?? []);
  const [dmaModalSearch, setDmaModalSearch] = useState('');
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  const mark = useCallback(<T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setDirty(true);
  }, []);

  useEffect(() => {
    setTourId(project.tourId);
    setProjectStage(project.projectStage);
    setOfferReviewStatus(project.offerReviewStatus ?? null);
    setTourStartDate(project.tourStartDate ?? getTodayDateString());
    setTourEndDate(project.tourEndDate ?? getTodayDateString());
    setTalentAgencyCompanyId(project.talentAgencyCompanyId ?? null);
    setSelectedDmaIds(project.dmaIds ?? []);
    setDmaDraftIds(project.dmaIds ?? []);
    setDmaModalSearch('');
    setShowDmaModal(false);
    setPendingPdfFile(null);
    setDirty(false);
  }, [
    project.engagementProjectId,
    project.tourId,
    project.tourStartDate,
    project.tourEndDate,
    project.projectStage,
    project.offerReviewStatus,
    project.createdBy,
    project.talentAgencyCompanyId,
    project.dmaIds,
  ]);

  const projectAttractionId = project.attractionId ?? null;

  const toursForAttraction = useMemo(() => {
    const list = tours
      .filter((t) => projectAttractionId != null && t.attractionId === projectAttractionId)
      .sort((a, b) => a.tourName.localeCompare(b.tourName, undefined, { sensitivity: 'base' }));
    return [
      { value: '', label: 'Select a tour…' },
      ...list.map((t) => ({ value: String(t.tourId), label: t.tourName })),
    ];
  }, [tours, projectAttractionId]);

  const tourBelongsToAttraction = useMemo(() => {
    if (!tourId || !projectAttractionId) return false;
    const t = tours.find((x) => x.tourId === tourId);
    return Boolean(t && t.attractionId === projectAttractionId);
  }, [tourId, projectAttractionId, tours]);

  const tourSelectValue = tourBelongsToAttraction ? String(tourId) : '';

  const talentAgencyPickerQuery = useQuery({
    queryKey: talentAgencyCompaniesQueryKey(),
    queryFn: fetchTalentAgencyCompanyRows,
    staleTime: 60_000,
    enabled: tourBelongsToAttraction,
  });
  const talentAgencyOptions = useMemo(() => {
    const rows = talentAgencyPickerQuery.data ?? [];
    return companyToSelect2Options(rows);
  }, [talentAgencyPickerQuery.data]);
  const talentAgentContactsQuery = useQuery({
    queryKey: ['company', talentAgencyCompanyId ?? 0, 'contacts'],
    queryFn: () => fetchCompanyContacts(talentAgencyCompanyId as number),
    enabled: talentAgencyCompanyId != null && talentAgencyCompanyId >= 1,
    staleTime: 60_000,
  });
  const talentAgentOptions = useMemo(
    () =>
      (talentAgentContactsQuery.data ?? []).map((row: ApiCompanyContact) => ({
        value: String(row.contactId),
        label: `${row.firstName} ${row.lastName}`.trim(),
      })),
    [talentAgentContactsQuery.data],
  );

  const onTourChange = (v: string) => {
    const nextTourId = v ? Number(v) : 0;
    setTourId(nextTourId);
    const nextTour = tours.find((t) => t.tourId === nextTourId);
    setTourStartDate(nextTour?.tourStartDate ?? getTodayDateString());
    setTourEndDate(nextTour?.tourEndDate ?? getTodayDateString());
    setTalentAgencyCompanyId(
      nextTour?.talentAgencyCompanyId != null && nextTour.talentAgencyCompanyId >= 1
        ? nextTour.talentAgencyCompanyId
        : null,
    );
    setDirty(true);
  };
// change
  const selectedTour = tourBelongsToAttraction
    ? tours.find((t) => t.tourId === tourId)
    : undefined;
  const tourDatesLockedReason = 'Dates already exist on this tour, so they are locked.';
  const tourDatesLockedInEdit = Boolean(
    selectedTour?.tourStartDate?.trim() && selectedTour?.tourEndDate?.trim(),
  );
  const effectiveTalentAgencyId = talentAgencyCompanyId;
  const tourTalentAgencyLocked = Boolean(
    selectedTour?.talentAgencyCompanyId != null &&
      (selectedTour.talentAgencyCompanyId ?? 0) >= 1,
  );
  const effectiveTalentAgencyLabel =
    selectedTour?.talentAgencyCompanyName?.trim()
    || talentAgencyOptions.find((o) => o.value === String(effectiveTalentAgencyId))?.label
    || '—';
  const selectedTourTalentAgentIds = useMemo(
    () =>
      [...new Set((selectedTour?.talentAgentContactIds ?? []).map((id) => String(id).trim()))].filter(
        (id) => id.length > 0,
      ),
    [selectedTour?.talentAgentContactIds],
  );
  const selectedTourTalentAgentLabels = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    const push = (value: string) => {
      const label = value.trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      labels.push(label);
    };
    const optionById = new Map(talentAgentOptions.map((opt) => [opt.value, opt.label]));
    selectedTourTalentAgentIds.forEach((id) => push(optionById.get(id) ?? `Contact #${id}`));
    (selectedTour?.talentAgentNames ?? []).forEach((name) => push(name));
    return labels;
  }, [talentAgentOptions, selectedTour?.talentAgentNames, selectedTourTalentAgentIds]);

  const stageOptions = useMemo(() => editProjectStageSelectOptions(project.projectStage), [project.projectStage]);

  const discard = () => {
    setTourId(project.tourId);
    setProjectStage(project.projectStage);
    setOfferReviewStatus(project.offerReviewStatus ?? null);
    setTourStartDate(project.tourStartDate ?? getTodayDateString());
    setTourEndDate(project.tourEndDate ?? getTodayDateString());
    setTalentAgencyCompanyId(project.talentAgencyCompanyId ?? null);
    setSelectedDmaIds(project.dmaIds ?? []);
    setDmaDraftIds(project.dmaIds ?? []);
    setDmaModalSearch('');
    setShowDmaModal(false);
    setDirty(false);
  };

  const filteredDmaMarkets = useMemo(() => {
    const q = dmaModalSearch.trim();
    if (!q) return dmaMarkets;
    return dmaMarkets.filter((row) =>
      richTextMatches([formatDmaPickerLabel(row), row.marketName, row.dmaid], q),
    );
  }, [dmaMarkets, dmaModalSearch]);

  const toggleDmaDraft = (dmaid: number) => {
    setDmaDraftIds((prev) =>
      prev.includes(dmaid) ? prev.filter((id) => id !== dmaid) : [...prev, dmaid],
    );
  };

  const openDmaModal = () => {
    setDmaDraftIds(selectedDmaIds);
    setDmaModalSearch('');
    setShowDmaModal(true);
  };

  const applyDmaDraft = () => {
    const normalized = [...dmaDraftIds].sort((a, b) => a - b);
    const current = [...selectedDmaIds].sort((a, b) => a - b);
    const changed = normalized.join(',') !== current.join(',');
    setSelectedDmaIds(normalized);
    setShowDmaModal(false);
    if (changed) setDirty(true);
  };

  const handleSave = async (openingPerformances?: ProjectOpeningPerformancePayload[]) => {
    if (!tourId || !tourBelongsToAttraction) {
      addToast('Select a tour that belongs to the selected attraction before saving.', 'warning');
      return;
    }
    if (effectiveTalentAgencyId == null || effectiveTalentAgencyId < 1) {
      addToast('Select a Talent Agency before saving.', 'warning');
      return;
    }
    if (!tourStartDate.trim() || !tourEndDate.trim()) {
      addToast('Tour start and end dates are required.', 'warning');
      return;
    }
    if (tourStartDate > tourEndDate) {
      addToast('Tour start date cannot be after end date.', 'warning');
      return;
    }
    // Block confirmation if no confirmed-offer PDF has been uploaded or selected
    const isChangingToConfirmed =
      offerReviewStatus === 'Confirmed' &&
      (project.offerReviewStatus ?? null) !== 'Confirmed';
    if (isChangingToConfirmed && project.confirmedOfferLinkId == null && pendingPdfFile == null) {
      addToast('Please upload the confirmed offer PDF before confirming.', 'warning');
      return;
    }
    const previousDmaKey = [...(project.dmaIds ?? [])].sort((a, b) => a - b).join(',');
    const nextDmaKey = [...selectedDmaIds].sort((a, b) => a - b).join(',');
    const dmaChanged = previousDmaKey !== nextDmaKey;
    const tourChanged = project.tourId !== tourId;
    const scopeChanged = dmaChanged || tourChanged;
    if (scopeChanged) setScopeTransitioning(true);
    setSaving(true);
    let savedOk = false;
    try {
      // Upload pending PDF first (before project update) so the link is set
      if (pendingPdfFile) {
        await uploadConfirmedOfferPdf(project.engagementProjectId, pendingPdfFile);
      }

      const payload: {
        tourId: number;
        talentAgencyCompanyId: number;
        tourStartDate: string;
        tourEndDate: string;
        dmaIds: number[];
        projectStage?: ProjectStage;
        offerReviewStatus?: OfferReviewStatus | null;
      } = {
        tourId,
        talentAgencyCompanyId: effectiveTalentAgencyId,
        tourStartDate: tourStartDate.trim(),
        tourEndDate: tourEndDate.trim(),
        dmaIds: selectedDmaIds,
      };
      // Only send stage/ review status when changed — avoids forcing a re-map
      // of legacy DB values on every unrelated save.
      if (projectStage !== project.projectStage) {
        payload.projectStage = projectStage as ProjectStage;
      }
      if ((offerReviewStatus ?? null) !== (project.offerReviewStatus ?? null)) {
        payload.offerReviewStatus = (offerReviewStatus ?? null) as OfferReviewStatus | null;
      }
      const result = await updateProject(project.engagementProjectId, payload);

      if (result.converted && result.engagementId) {
        addToast('Offer confirmed — engagement created.', 'success');
      }
      if (scopeChanged) {
        onGoToVenues();
      }
      await onUpdated();
      savedOk = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not update project.'), 'error');
    } finally {
      setScopeTransitioning(false);
      setSaving(false);
    }
    if (savedOk) {
      addToast('Project updated.', 'success');
      if (scopeChanged) {
        addToast('Scope changed. Review venues now.', 'warning');
      }
    }
  };

  const requestSave = () => {
    void handleSave();
  };


  return (
    <div className="relative">
      <p className="flex items-center gap-1.5 text-[11px] text-text-muted mb-4 select-none">
        <Pencil className="h-3 w-3 shrink-0" />
        Click any field to edit it inline
      </p>

      <div className="text-sm space-y-6 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          <div>
            <span className="text-xs text-text-muted">Attraction</span>
            <div className="text-sm text-text-primary mt-0.5 font-medium">
              {project.attractionName ?? '—'}
            </div>
          </div>
          <InlineSelectField
            label="Tour"
            value={tourSelectValue}
            onChange={onTourChange}
            options={toursForAttraction}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          <FormField label="Talent Agency">
            {tourTalentAgencyLocked ? (
              <div className="w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary">
                {effectiveTalentAgencyLabel}
              </div>
            ) : (
              <Select2
                value={effectiveTalentAgencyId != null ? String(effectiveTalentAgencyId) : ''}
                onChange={(v) => {
                  setTalentAgencyCompanyId(v ? Number(v) : null);
                  setDirty(true);
                }}
                options={talentAgencyOptions}
                placeholder={talentAgencyPickerQuery.isPending ? 'Loading agencies…' : 'Select talent agency…'}
                disabled={talentAgencyPickerQuery.isPending}
              />
            )}
          </FormField>
          <FormField label="Talent Agents (info only)">
            <div className="w-full min-w-0 bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary">
              {effectiveTalentAgencyId == null
                ? 'Choose talent agency first'
                : talentAgentContactsQuery.isPending
                  ? 'Loading contacts…'
                  : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-text-secondary">
                        Selected for this tour:{' '}
                        <span className="font-medium text-text-primary">
                          {selectedTourTalentAgentLabels.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-text-primary">
                          {talentAgentOptions.length}
                        </span>{' '}
                        agency contact{talentAgentOptions.length === 1 ? '' : 's'}.
                      </p>
                      <div>
                        <p className="text-[11px] font-medium text-text-secondary mb-1">
                          Tour-selected talent agents
                        </p>
                        {selectedTourTalentAgentLabels.length > 0 ? (
                          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                            {selectedTourTalentAgentLabels.map((label, index) => (
                              <span
                                key={`tour-agent-edit-${index}-${label}`}
                                className="inline-flex items-center rounded-md border border-ems-accent/35 bg-ems-accent/10 px-2 py-1 text-xs text-text-primary"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-text-muted">
                            No specific talent agents are selected on this tour.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
            </div>
          </FormField>
          <FormField label="Tour Start Date" required>
            <input
              type="date"
              className="w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
              value={tourStartDate}
              disabled={tourDatesLockedInEdit}
              title={tourDatesLockedInEdit ? tourDatesLockedReason : undefined}
              onChange={(e) => {
                setTourStartDate(e.target.value);
                setDirty(true);
              }}
            />
          </FormField>
          <FormField label="Tour End Date" required>
            <input
              type="date"
              className="w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
              value={tourEndDate}
              min={tourStartDate || undefined}
              disabled={tourDatesLockedInEdit}
              title={tourDatesLockedInEdit ? tourDatesLockedReason : undefined}
              onChange={(e) => {
                setTourEndDate(e.target.value);
                setDirty(true);
              }}
            />
          </FormField>
          {tourDatesLockedInEdit && (
            <p className="sm:col-span-2 text-[11px] text-text-muted">
              {tourDatesLockedReason}
            </p>
          )}
          <div className="sm:col-span-2 min-w-0">
            <span className="text-xs text-text-muted">Markets (DMA)</span>
            <div className="mt-1.5 rounded-lg border border-border bg-surface px-3 py-3">
              {selectedDmaIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDmaIds.map((id) => {
                    const row = dmaMarkets.find((m) => m.dmaid === id);
                    const label = row ? formatDmaPickerLabel(row) : `DMA #${id}`;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-full border border-ems-accent/40 bg-ems-accent/10 px-2.5 py-1 text-xs text-text-primary"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No markets selected.</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-text-muted tabular-nums">
                  {selectedDmaIds.length} market{selectedDmaIds.length === 1 ? '' : 's'} selected
                </p>
                <button
                  type="button"
                  onClick={openDmaModal}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-ems-accent/50"
                >
                  <Pencil className="h-3 w-3" />
                  Edit markets
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          <InlineSelectField
            label="Offer creation status"
            value={projectStage}
            onChange={mark(setProjectStage)}
            options={stageOptions}
          />
          <div>
            <span className="text-xs text-text-muted">Created by</span>
            <div className="mt-0.5 w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary">
              {project.createdBy ?? '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
          {projectStage === 'Submitted' ? (
            <InlineSelectField
              label="Offer review status"
              value={offerReviewStatus ?? ''}
              onChange={(v) => mark(setOfferReviewStatus)(v ? (v as OfferReviewStatus) : null)}
              options={OFFER_REVIEW_STATUS_OPTIONS}
            />
          ) : (
            <div>
              <span className="text-xs text-text-muted">Offer review status</span>
              <div className="mt-0.5 w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-muted">
                {offerReviewStatus ?? '—'}
              </div>
              <p className="mt-0.5 text-[11px] text-text-muted">Available once the offer is Submitted.</p>
            </div>
          )}
          <div>
            <span className="text-xs text-text-muted">Conversion</span>
            <div className="mt-0.5 w-full min-w-0 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary">
              {offerReviewStatus === 'Confirmed' ? 'Engagement created' : '—'}
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted">Setting review status to Confirmed creates the engagement.</p>
          </div>
        </div>

        {offerReviewStatus === 'Confirmed' && (
          <ConfirmedOfferPdfUpload
            project={project}
            addToast={addToast}
            pendingFile={pendingPdfFile}
            onFileSelected={(file) => { setPendingPdfFile(file); setDirty(true); }}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
          <div>
            <span className="text-xs text-text-muted">Created date</span>
            <div className="text-sm text-text-primary mt-0.5">
              {formatEmsShortWeekdayDateTime(project.createdDate)}
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Venue proposals</span>
            <div className="text-sm text-text-primary mt-0.5 flex items-center gap-2">
              <span className="font-mono tabular-nums">{project.venues.length}</span>
              <button type="button" onClick={onGoToVenues} className="text-ems-accent text-xs hover:underline">
                Open Venues tab
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDmaModal && (
        <Modal
          title="Edit Markets (DMA)"
          width={680}
          onClose={() => !saving && setShowDmaModal(false)}
        >
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Select one or more markets. When markets change, review venues in the Venues tab.
            </p>
            <SearchInput
              value={dmaModalSearch}
              onChange={setDmaModalSearch}
              placeholder="Search markets by name…"
              disabled={saving}
            />
            <div className="max-h-[min(22rem,50vh)] overflow-y-auto rounded-md border border-border bg-surface p-2">
              {filteredDmaMarkets.length === 0 ? (
                <p className="text-xs text-text-muted py-6 text-center">
                  {dmaMarkets.length === 0
                    ? 'No markets were returned from the server.'
                    : 'No markets match your filter.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredDmaMarkets.map((row) => {
                    const checked = dmaDraftIds.includes(row.dmaid);
                    return (
                      <label
                        key={row.dmaid}
                        className={[
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs cursor-pointer transition-colors',
                          checked
                            ? 'border-ems-accent bg-ems-accent/10 text-ems-accent'
                            : 'border-border text-text-secondary hover:border-ems-accent/50 hover:text-text-primary',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleDmaDraft(row.dmaid)}
                        />
                        <span
                          className={[
                            'inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors',
                            checked ? 'border-ems-accent bg-ems-accent text-background' : 'border-border bg-background',
                          ].join(' ')}
                          aria-hidden
                        >
                          {checked ? <Check className="h-2.5 w-2.5" /> : null}
                        </span>
                        <span className="whitespace-nowrap">{formatDmaPickerLabel(row)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-text-muted tabular-nums">
                {dmaDraftIds.length} market{dmaDraftIds.length === 1 ? '' : 's'} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDmaModal(false)}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyDmaDraft}
                  className="inline-flex items-center justify-center rounded-md bg-ems-accent px-3.5 py-1.5 text-xs font-medium text-background hover:bg-ems-accent/85 disabled:opacity-50"
                  disabled={saving}
                >
                  Apply Markets
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {scopeTransitioning && (
        <div className="absolute inset-0 z-20 rounded-md bg-card/80 backdrop-blur-[1px] flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary">
            <Loader2 className="h-4 w-4 animate-spin text-ems-accent" />
            Applying scope changes…
          </div>
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 mt-4 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-between gap-3 z-10">
          <span className="text-xs text-text-secondary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ems-accent inline-block animate-pulse" />
            Unsaved changes
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="text-text-secondary text-xs px-3 py-1.5 hover:text-text-primary rounded-md hover:bg-elevated transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-ems-accent hover:bg-ems-accent/80 text-background text-xs px-4 py-1.5 rounded-md font-medium disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

/** Extra display names for common DB literals (any other value still renders via `projectStageDisplayLabel`). */
const CANONICAL_PROJECT_STAGE_LABEL: Record<string, string> = {
  Requested: 'Requested',
  Drafted: 'Drafted',
  Submitted: 'Submitted',
  /** Legacy project rows predating the OfferCreationStatus rename */
  'Under Construction': 'Under Construction',
  Pending: 'Pending',
  Inactive: 'Inactive',
  Confirmed: 'Confirmed',
  OffersSent: 'Offers Sent',
  PartiallyBooked: 'Partially Booked',
  FullyBooked: 'Fully Booked',
  Dead: 'Inactive',
};

const CANONICAL_OFFER_REVIEW_STATUS_LABEL: Record<string, string> = {
  'In Consideration': 'In Consideration',
  Declined: 'Declined',
  Confirmed: 'Confirmed',
};

function offerReviewStatusSelectOptions(values: string[]) {
  return values.map((value) => ({
    value,
    label: CANONICAL_OFFER_REVIEW_STATUS_LABEL[value] ?? value,
  }));
}

const OFFER_REVIEW_STATUS_OPTIONS = offerReviewStatusSelectOptions([
  ...OFFER_REVIEW_STATUS_VALUES,
]);

function projectStageSelectOptions(stages: string[]) {
  return stages.map((value) => ({
    value,
    label: projectStageDisplayLabel(value, CANONICAL_PROJECT_STAGE_LABEL),
  }));
}

const CREATE_PROJECT_STAGE_OPTIONS = projectStageSelectOptions([...PROJECT_STAGE_VALUES]);

/** Includes the current DB value when it is a legacy stage so the field can show until the user picks a new one. */
function editProjectStageSelectOptions(currentFromDb: string | null | undefined) {
  const s = new Set<string>([...PROJECT_STAGE_VALUES]);
  const cur = (currentFromDb ?? '').trim();
  if (cur) s.add(cur);
  return projectStageSelectOptions(
    [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  );
}
/** Allowed `VenueStatus` for EngagementProjectVenue: API meta, else client fallback; current DB value kept if legacy. */
function useResolvedVenueStatusStrings(currentValue?: string) {
  const q = useQuery({
    queryKey: ['projects', 'meta', 'venue-statuses'],
    queryFn: fetchVenueStatusMeta,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const fromApi = q.data?.venueStatuses;
    const base: string[] =
      fromApi && fromApi.length > 0
        ? fromApi
        : (VENUE_STATUS_VALUES as readonly string[]).slice();
    const v = (currentValue ?? '').trim();
    if (v && !base.includes(v)) {
      return [...base, v].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    return base;
  }, [q.data, currentValue]);
}

/** Allowed `OptionStatus` for EngagementProjectPerformanceOption: same pattern as venue status. */
function useResolvedOptionStatusStrings(currentValue?: string) {
  const q = useQuery({
    queryKey: ['projects', 'meta', 'option-statuses'],
    queryFn: fetchOptionStatusMeta,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const fromApi = q.data?.optionStatuses;
    const base: string[] =
      fromApi && fromApi.length > 0
        ? fromApi
        : (OPTION_STATUS_VALUES as readonly string[]).slice();
    const v = (currentValue ?? '').trim();
    if (v && !base.includes(v)) {
      return [...base, v].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
    return base;
  }, [q.data, currentValue]);
}

function toSelectOptionsFromStrings(strings: string[]): { value: string; label: string }[] {
  return strings.map((x) => ({ value: x, label: x }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  // These props keep legacy Index.tsx calls working without errors
  projects?: unknown; engagements?: unknown; tours?: unknown; attractions?: unknown;
  companies?: unknown; contacts?: unknown; dmas?: unknown; users?: unknown;
  onNavigate?: (view: string, data?: unknown) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onCreateEngagement?: unknown; onUpdateProjects?: unknown; onDeleteProject?: unknown;
  initialSelectedProjectId?: number | null;
}

// ─── Projects list: movable columns (Stage fixed) + server-side sort ─────────

const PROJECTS_LIST_MOVABLE_ORDER_KEY = 'iae-projects-list-movable-column-order-v1';
const PROJECTS_SORT_STATE_STORAGE_KEY = 'iae-projects-sort-state-v1';
const EMS_SAVED_VIEWS_ENABLED_KEY = 'iae-ems-saved-views-enabled-v1';

type ProjectMovableColumnId =
  | 'attraction'
  | 'tour'
  | 'tourMgmt'
  | 'createdBy'
  | 'created';

const PROJECT_STAGE_VISUAL_INDEX = 3;

const DEFAULT_PROJECT_MOVABLE_COLUMNS: ProjectMovableColumnId[] = [
  'attraction',
  'tour',
  'tourMgmt',
  'createdBy',
  'created',
];

const PROJECT_MOVABLE_LABELS: Record<ProjectMovableColumnId, string> = {
  attraction: 'Attraction',
  tour: 'Tour',
  tourMgmt: 'Talent Agency',
  createdBy: 'Created By',
  created: 'Created',
};

const SORT_API_BY_COLUMN: Record<ProjectMovableColumnId, string> = {
  attraction: 'attraction',
  tour: 'tour',
  tourMgmt: 'tourmgmt',
  createdBy: 'createdby',
  created: 'created',
};

function loadProjectMovableColumnOrder(): ProjectMovableColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_MOVABLE_COLUMNS;
  try {
    const raw = localStorage.getItem(PROJECTS_LIST_MOVABLE_ORDER_KEY);
    if (!raw) return DEFAULT_PROJECT_MOVABLE_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_PROJECT_MOVABLE_COLUMNS;
    const need = new Set<ProjectMovableColumnId>(DEFAULT_PROJECT_MOVABLE_COLUMNS);
    const out: ProjectMovableColumnId[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && need.has(x as ProjectMovableColumnId)) {
        out.push(x as ProjectMovableColumnId);
        need.delete(x as ProjectMovableColumnId);
      }
    }
    for (const id of DEFAULT_PROJECT_MOVABLE_COLUMNS) {
      if (need.has(id)) {
        out.push(id);
        need.delete(id);
      }
    }
    return out;
  } catch {
    return DEFAULT_PROJECT_MOVABLE_COLUMNS;
  }
}

function saveProjectMovableColumnOrder(order: ProjectMovableColumnId[]) {
  try {
    localStorage.setItem(PROJECTS_LIST_MOVABLE_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

function loadProjectsSortState(): {
  col: ProjectMovableColumnId | null;
  dir: 'asc' | 'desc';
} {
  if (typeof window === 'undefined') return { col: null, dir: 'asc' };
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') {
      return { col: null, dir: 'asc' };
    }
    const raw = localStorage.getItem(PROJECTS_SORT_STATE_STORAGE_KEY);
    if (!raw) return { col: null, dir: 'asc' };
    const parsed = JSON.parse(raw) as { col?: unknown; dir?: unknown };
    const validCols = new Set<ProjectMovableColumnId>(DEFAULT_PROJECT_MOVABLE_COLUMNS);
    const col =
      typeof parsed.col === 'string' && validCols.has(parsed.col as ProjectMovableColumnId)
        ? (parsed.col as ProjectMovableColumnId)
        : null;
    const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
    return { col, dir };
  } catch {
    return { col: null, dir: 'asc' };
  }
}

function saveProjectsSortState(state: {
  col: ProjectMovableColumnId | null;
  dir: 'asc' | 'desc';
}) {
  try {
    if (localStorage.getItem(EMS_SAVED_VIEWS_ENABLED_KEY) !== '1') return;
    localStorage.setItem(PROJECTS_SORT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function visualIndexToMovable(vis: number): number {
  if (vis === PROJECT_STAGE_VISUAL_INDEX) return -1;
  return vis < PROJECT_STAGE_VISUAL_INDEX ? vis : vis - 1;
}

function buildProjectVisualSlots(
  movableOrder: ProjectMovableColumnId[],
): Array<ProjectMovableColumnId | 'stage'> {
  const out: Array<ProjectMovableColumnId | 'stage'> = [];
  let m = 0;
  for (let i = 0; i < 6; i++) {
    if (i === PROJECT_STAGE_VISUAL_INDEX) out.push('stage');
    else out.push(movableOrder[m++]!);
  }
  return out;
}

function renderProjectListCell(slot: ProjectMovableColumnId | 'stage', p: ApiProjectListRow) {
  if (slot === 'stage') {
    return (
      <td key="stage" className="py-2.5 px-3">
        <StatusBadge status={p.projectStage} />
      </td>
    );
  }
  switch (slot) {
    case 'attraction':
      return (
        <td key="attraction" className="py-2.5 px-3 text-text-primary font-medium">
          {p.attractionName ?? '—'}
        </td>
      );
    case 'tour':
      return (
        <td key="tour" className="py-2.5 px-3 text-text-secondary">
          {p.tourName ?? <span className="text-text-muted italic">No tour name</span>}
        </td>
      );
    case 'tourMgmt':
      return (
        <td key="tourMgmt" className="py-2.5 px-3 text-text-secondary text-xs">
          {p.talentAgencyCompanyName ?? '—'}
        </td>
      );
    case 'createdBy':
      return (
        <td key="createdBy" className="py-2.5 px-3 text-text-secondary">
          {p.createdBy ?? '—'}
        </td>
      );
    case 'created':
      return (
        <td key="created" className="py-2.5 px-3 text-xs text-text-muted tabular-nums">
          {formatEmsShortWeekdayDateTime(p.createdDate)}
        </td>
      );
    default:
      return null;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProjectsTableSkeleton({ rowCount = PAGE_SIZE }: { rowCount?: number }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden min-h-[28rem]" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 border-b border-border bg-surface/40">
        <Loader2 className="h-11 w-11 text-ems-accent animate-spin shrink-0" aria-hidden />
        <div className="text-center max-w-sm space-y-1">
          <p className="text-sm font-semibold text-text-primary">Loading projects</p>
          <p className="text-xs text-text-muted leading-relaxed">Fetching records from the database…</p>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-clip">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border bg-surface">
              {['Attraction', 'Tour', 'Talent Agency', 'Stage', 'Created By', 'Created'].map((h, i) => (
                <th key={i} className="text-left py-2.5 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="py-3 px-3"><Skeleton className="h-4 w-24 bg-muted/80" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Performance option row ───────────────────────────────────────────────────

function PerformanceOptionRow({
  opt, projectId, onRefresh, addToast,
}: {
  opt: ApiPerformanceOption;
  projectId: number;
  onRefresh: () => void | Promise<void>;
  addToast: Props['addToast'];
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(opt.proposedDate);
  const [time, setTime] = useState(opt.proposedTime ?? '');
  const [status, setStatus] = useState<OptionStatus>(opt.optionStatus);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const optionStatusStrings = useResolvedOptionStatusStrings(status);
  const optionStatusOptions = useMemo(
    () => toSelectOptionsFromStrings(optionStatusStrings),
    [optionStatusStrings],
  );

  const inputCls = 'w-full bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-ems-accent';

  useEffect(() => {
    setDate(opt.proposedDate);
    setTime(opt.proposedTime ?? '');
    setStatus(opt.optionStatus);
  }, [opt.performanceOptionId, opt.proposedDate, opt.proposedTime, opt.optionStatus]);

  const handleSave = async () => {
    setSaving(true);
    let ok = false;
    try {
      await updatePerformanceOption(projectId, opt.performanceOptionId, {
        proposedDate: date, proposedTime: time || null, optionStatus: status,
      });
      await onRefresh();
      setEditing(false);
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not update option.'), 'error');
    } finally {
      setSaving(false);
    }
    if (ok) addToast('Date option updated.', 'success');
  };

  const handleDelete = async () => {
    setDeleting(true);
    let ok = false;
    try {
      await deletePerformanceOption(projectId, opt.performanceOptionId);
      await onRefresh();
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not remove option.'), 'error');
    } finally {
      setDeleting(false);
    }
    if (ok) addToast('Date option removed.', 'warning');
  };

  if (editing) {
    return (
      <div className="bg-elevated border border-border rounded p-2 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} /></FormField>
          <FormField label="Time"><input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={saving} /></FormField>
          <FormField label="Status">
            <Select2
              options={optionStatusOptions}
              value={status}
              onChange={(v) => setStatus(v as OptionStatus)}
              disabled={optionStatusOptions.length === 0 || saving}
              placeholder={optionStatusOptions.length ? 'Select…' : 'Loading…'}
            />
          </FormField>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-text-secondary text-xs px-2 py-1 hover:text-text-primary disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving}
            className="inline-flex items-center gap-1 bg-ems-accent text-background text-xs px-3 py-1 rounded disabled:opacity-60">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-3 bg-elevated/50 rounded px-2 py-1.5 text-xs group min-h-[2.25rem]">
      <span className="text-text-primary font-medium">{formatProjectOptionDateTime(opt.proposedDate, opt.proposedTime)}</span>
      <span className="ml-auto"><StatusBadge status={opt.optionStatus} /></span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={deleting}
        className="text-text-muted hover:text-ems-accent opacity-0 group-hover:opacity-100 transition-opacity text-[10px] disabled:opacity-30 disabled:pointer-events-none"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        title="Remove this date option"
        className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 text-text-muted hover:text-ems-coral opacity-0 group-hover:opacity-100 transition-opacity text-[10px] disabled:opacity-40"
        aria-busy={deleting}
      >
        ✕
      </button>
      {deleting && (
        <div
          className="absolute inset-0 z-[1] flex items-center justify-center gap-2 rounded bg-background/50 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-ems-accent shrink-0" aria-hidden />
          <span className="text-[10px] font-medium text-text-primary">Removing date…</span>
        </div>
      )}
    </div>
  );
}

// ─── Add Performance Option form ──────────────────────────────────────────────

function AddPerformanceOptionForm({
  projectId,
  engagementProjectVenueId,
  onAdded,
  onCancel,
  addToast,
}: {
  projectId: number;
  engagementProjectVenueId: number;
  onAdded: () => void | Promise<void>;
  onCancel: () => void;
  addToast: Props['addToast'];
}) {
  const [date, setDate] = useState(getTodayDateString);
  const [time, setTime] = useState(getCurrentTimeString);
  const [status, setStatus] = useState<OptionStatus>('Pending');
  const [saving, setSaving] = useState(false);
  const inputCls = 'w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent';

  const optionStatusStrings = useResolvedOptionStatusStrings(status);
  const optionStatusOptions = useMemo(
    () => toSelectOptionsFromStrings(optionStatusStrings),
    [optionStatusStrings],
  );

  useEffect(() => {
    if (optionStatusOptions.length === 0) return;
    if (!optionStatusOptions.some((o) => o.value === status)) {
      setStatus(optionStatusOptions[0].value as OptionStatus);
    }
  }, [optionStatusOptions, status]);

  useEffect(() => {
    setDate(getTodayDateString());
    setTime(getCurrentTimeString());
    setStatus('Pending');
  }, [engagementProjectVenueId]);

  const handleSave = async () => {
    if (!date) { addToast('Date is required.', 'warning'); return; }
    setSaving(true);
    let ok = false;
    try {
      await createPerformanceOption(projectId, {
        engagementProjectVenueId,
        proposedDate: date,
        proposedTime: time || null,
        optionStatus: status,
      });
      await onAdded();
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not add option.'), 'error');
    } finally {
      setSaving(false);
    }
    if (ok) addToast('Date option added.', 'success');
  };

  return (
    <div className="relative bg-elevated border border-border rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Date" required><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} /></FormField>
        <FormField label="Time (optional)"><input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={saving} /></FormField>
        <FormField label="Option Status" required>
          <Select2
            options={optionStatusOptions}
            value={status}
            onChange={(v) => setStatus(v as OptionStatus)}
            disabled={optionStatusOptions.length === 0 || saving}
            placeholder={optionStatusOptions.length ? 'Select status' : 'Loading…'}
          />
        </FormField>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary disabled:opacity-50">Cancel</button>
        <button type="button" onClick={() => void handleSave()} disabled={saving}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-60">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? 'Saving…' : 'Add Date Option'}
        </button>
      </div>
      {saving && (
        <div
          className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 rounded-lg bg-background/55 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-7 w-7 animate-spin text-ems-accent" aria-hidden />
          <span className="text-xs font-medium text-text-primary">Refreshing dates…</span>
        </div>
      )}
    </div>
  );
}

// ─── Venue Proposal Row ───────────────────────────────────────────────────────

// ─── Venue → Engagement confirmation modal ───────────────────────────────────

// ─── Venue → Engagement confirmation modal ───────────────────────────────────

function VenueConfirmEngagementModal({
  venue,
  projectId,
  attractionId,
  attractionName,
  tourId,
  tourName,
  onCreated,
  onCancel,
  addToast,
}: {
  venue: ApiProjectVenue;
  projectId: number;
  attractionId?: number | null;
  attractionName: string | null;
  tourId: number;
  tourName: string | null;
  onCreated: (engagementId: number) => void;
  onCancel: () => void;
  addToast: Props['addToast'];
}) {
  const [engagementStatus, setEngagementStatus] = useState('Unknown');
  const [openingDate, setOpeningDate] = useState(getTodayDateString());
  const [openingTime, setOpeningTime] = useState('20:00');
  const [submitting, setSubmitting] = useState(false);

  const [selectedAttractionId, setSelectedAttractionId] = useState<string>(
    attractionId ? String(attractionId) : '',
  );
  const [selectedTourId, setSelectedTourId] = useState<string>(
    tourId ? String(tourId) : '',
  );
  const [attractionChanged, setAttractionChanged] = useState(false);

  const lookupLimit = 8000;
  const attractionsQuery = useQuery({
    queryKey: ['attractions', 'picker', 0, lookupLimit],
    queryFn: async () => (await fetchAttractions(0, lookupLimit)).data,
    staleTime: 60_000,
  });

  const toursQuery = useQuery({
    queryKey: ['tours', 'picker', 0, lookupLimit],
    queryFn: async () => (await fetchTours(0, lookupLimit)).data,
    staleTime: 60_000,
  });

  const attractionOptions = useMemo(() => {
    const list = attractionsQuery.data ?? [];
    return list.map((a) => ({
      value: String(a.attractionId),
      label: a.attractionName ?? `Attraction #${a.attractionId}`,
    }));
  }, [attractionsQuery.data]);

  const toursOptions = useMemo(() => {
    const list = toursQuery.data ?? [];
    const filtered = selectedAttractionId
      ? list.filter((t) => String(t.attractionId) === selectedAttractionId)
      : list;
    return filtered.map((t) => ({
      value: String(t.tourId),
      label: t.tourName ?? `Tour #${t.tourId}`,
    }));
  }, [toursQuery.data, selectedAttractionId]);

  const handleAttractionChange = (newAttractionId: string) => {
    setSelectedAttractionId(newAttractionId);
    setAttractionChanged(true);
    const toursList = toursQuery.data ?? [];
    const tourObj = toursList.find((t) => String(t.tourId) === selectedTourId);
    if (!tourObj || String(tourObj.attractionId) !== newAttractionId) {
      const firstTour = toursList.find((t) => String(t.attractionId) === newAttractionId);
      setSelectedTourId(firstTour ? String(firstTour.tourId) : '');
    }
  };

  const venueDisplayName = venue.venueCompanyName ?? venue.venueName ?? 'Unknown venue';
  const venueDmaLabel = venue.venueDmaMarketName?.trim() || 'Not set';

  const canSubmit =
    !attractionsQuery.isPending &&
    !toursQuery.isPending &&
    openingDate.trim().length > 0 &&
    openingTime.trim().length > 0 &&
    engagementStatus.trim().length > 0 &&
    selectedTourId.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // 1. Create engagement
      const { engagementId } = await createEngagement({
        engagementStatus,
        openingShowDate: openingDate.trim(),
        openingShowTime: openingTime.trim(),
        tourId: Number(selectedTourId),
        primaryVenueCompanyId: venue.venueCompanyId,
      });

      // 2. Confirm venue status
      try {
        await updateProjectVenue(projectId, venue.engagementProjectVenueId, {
          venueStatus: 'Confirmed' as VenueStatus,
        });
      } catch (statusErr) {
        // Engagement was created but venue status update failed — still report success for engagement
        addToast(
          'Engagement created but venue status could not be updated. Please update manually.',
          'warning',
        );
      }

      addToast('Engagement created and venue confirmed successfully.', 'success');
      onCreated(engagementId);
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not create engagement.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition-colors focus:border-ems-accent disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <Modal
      title="Create Engagement"
      onClose={() => !submitting && onCancel()}
      width={640}
      allowContentOverflow
    >
      <div className="space-y-5">
        <p className="text-xs text-text-secondary leading-relaxed">
          Confirming this venue will create a new engagement. Please fill in the opening show details below.
        </p>

        {/* Pre-populated venue & DMA */}
        <div className="rounded-lg border border-ems-accent/20 bg-ems-accent/5 px-4 py-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Venue</span>
              <p className="text-sm font-medium text-text-primary mt-0.5">{venueDisplayName}</p>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">DMA Market</span>
              <p className="text-sm font-medium text-text-primary mt-0.5">{venueDmaLabel}</p>
            </div>
          </div>
        </div>

        {/* Attraction & Tour Selection (editable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Attraction" required>
            <Select2
              options={attractionOptions}
              value={selectedAttractionId}
              onChange={handleAttractionChange}
              placeholder="Select attraction…"
              disabled={submitting}
              loading={attractionsQuery.isPending}
            />
          </FormField>
          <FormField label="Tour" required>
            <Select2
              options={toursOptions}
              value={selectedTourId}
              onChange={setSelectedTourId}
              placeholder="Select tour…"
              disabled={submitting || !attractionChanged}
              loading={toursQuery.isPending}
            />
          </FormField>
        </div>

        {/* Opening show date & time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Opening Show Date" required>
            <input
              type="date"
              className={inputCls}
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormField label="Opening Show Time" required>
            <input
              type="time"
              className={inputCls}
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              disabled={submitting}
            />
          </FormField>
        </div>

        {/* Engagement status */}
        <FormField label="Engagement Status" required>
          <Select2
            options={ENGAGEMENT_STATUS_OPTIONS}
            value={engagementStatus}
            onChange={setEngagementStatus}
            placeholder="Select status…"
            disabled={submitting}
          />
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || submitting}
            className="inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-md bg-ems-accent px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-ems-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              'Create Engagement'
            )}
          </button>
        </div>

        {/* Full overlay loader */}
        {submitting && (
          <div
            className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-ems-accent" aria-hidden />
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">Creating engagement…</p>
              <p className="text-xs text-text-secondary">Confirming venue and setting up the engagement.</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Venue Proposal Row ───────────────────────────────────────────────────────

function VenueProposalRow({
  venue,
  projectId,
  onRefresh,
  addToast,
  scopeMismatchReason,
  readOnly = false,
  attractionId,
  attractionName,
  tourId,
  tourName,
  onOpenEngagement,
  onNavigate,
}: {
  venue: ApiProjectVenue;
  projectId: number;
  onRefresh: () => void | Promise<void>;
  addToast: Props['addToast'];
  scopeMismatchReason?: string;
  readOnly?: boolean;
  attractionId?: number | null;
  attractionName?: string | null;
  tourId?: number;
  tourName?: string | null;
  onOpenEngagement?: (engagementId: number) => void;
  onNavigate?: (view: string, data?: unknown) => void;
}) {
  const [showAddOpt, setShowAddOpt] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [venueStatus, setVenueStatus] = useState<string>(venue.venueStatus);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);

  const venueStatusStrings = useResolvedVenueStatusStrings(venueStatus);
  const venueStatusOptions = useMemo(
    () => toSelectOptionsFromStrings(venueStatusStrings),
    [venueStatusStrings],
  );
  const venueDisplayName = venue.venueCompanyName ?? venue.venueName ?? 'Unknown venue';
  const venueDmaLabel = venue.venueDmaMarketName?.trim() || 'Not set';

  useEffect(() => {
    setVenueStatus(venue.venueStatus);
  }, [venue.venueStatus]);

  const handleStatusSave = async () => {
    if (venue.venueStatus === 'Confirmed' && venueStatus !== 'Confirmed') {
      addToast("Once confirmed, a venue's status cannot be changed.", 'error');
      setVenueStatus('Confirmed');
      setEditingStatus(false);
      return;
    }

    // Intercept "Confirmed" status → open engagement creation modal
    if (venueStatus === 'Confirmed' && venue.venueStatus !== 'Confirmed' && tourId != null) {
      setShowEngagementModal(true);
      return;
    }

    setStatusSaving(true);
    let ok = false;
    try {
      await updateProjectVenue(projectId, venue.engagementProjectVenueId, { venueStatus: venueStatus as VenueStatus });
      setEditingStatus(false);
      await onRefresh();
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not update venue.'), 'error');
    } finally {
      setStatusSaving(false);
    }
    if (ok) addToast('Venue status updated.', 'success');
  };

  const handleDelete = async () => {
    setDeleting(true);
    let ok = false;
    try {
      await deleteProjectVenue(projectId, venue.engagementProjectVenueId);
      await onRefresh();
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not remove venue.'), 'error');
    } finally {
      setDeleting(false);
      setConfirmRemoveOpen(false);
    }
    if (ok) addToast('Venue proposal removed.', 'warning');
  };

  return (
    <>
      <div className="relative bg-card border border-border rounded-lg overflow-hidden">
        {venue.venueStatus === 'Confirmed' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <span className="text-xs font-medium italic text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded bg-background/80 shadow-sm">
              Engagement created (locked)
            </span>
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {onNavigate && venue.venueCompanyId ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('companies', { selectedCompanyId: venue.venueCompanyId })}
                    className="text-text-primary font-medium text-sm hover:text-ems-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/40 rounded-sm transition-colors"
                    title="Open venue company profile"
                  >
                    {venueDisplayName}
                  </button>
                ) : (
                  <span className="text-text-primary font-medium text-sm">
                    {venueDisplayName}
                  </span>
                )}
                <span className="inline-flex max-w-full items-center rounded border border-border bg-elevated px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  DMA: {venueDmaLabel}
                </span>
              </div>
              {venue.venueName && venue.venueName !== venue.venueCompanyName && (
                <div className="text-xs text-text-secondary">{venue.venueName}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!readOnly && editingStatus ? (
                <div className="flex items-center gap-1">
                  <div className="w-36">
                    <Select2
                      options={venueStatusOptions}
                      value={venueStatus}
                      onChange={setVenueStatus}
                      disabled={venueStatusOptions.length === 0}
                      placeholder={venueStatusOptions.length ? 'Select…' : 'Loading…'}
                    />
                  </div>
                  <button type="button" onClick={() => void handleStatusSave()} disabled={statusSaving}
                    className="inline-flex items-center gap-1 bg-ems-accent text-background text-xs px-2 py-1 rounded disabled:opacity-60">
                    {statusSaving && <Loader2 className="h-3 w-3 animate-spin" />}Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVenueStatus(venue.venueStatus);
                      setEditingStatus(false);
                    }}
                    className="text-text-muted text-xs px-1 hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>
              ) : !readOnly ? (
                <div className="flex items-center gap-1.5">
                  {(statusSaving || showEngagementModal) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ems-accent" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setVenueStatus(venue.venueStatus);
                      setEditingStatus(true);
                    }}
                    title="Click to change status"
                    disabled={venue.venueStatus === 'Confirmed'}
                  >
                    <StatusBadge status={venue.venueStatus} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {(statusSaving || showEngagementModal) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ems-accent" />
                  )}
                  <StatusBadge status={venue.venueStatus} />
                </div>
              )}
              {!readOnly && venue.venueStatus !== 'Confirmed' && (
                <button type="button" onClick={() => setConfirmRemoveOpen(true)} disabled={deleting}
                  className="text-text-muted hover:text-ems-coral text-xs disabled:opacity-50 px-1"
                  aria-label={`Remove ${venueDisplayName}`}
                >
                  {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : '✕'}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-border/60 pt-2 space-y-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-text-muted font-medium">Proposed Dates</p>
              {!readOnly && venue.venueStatus !== 'Confirmed' && (
                <button type="button" onClick={() => setShowAddOpt(!showAddOpt)} className="text-ems-accent text-[11px] hover:underline">+ Add date</button>
              )}
            </div>
            {venue.performanceOptions.length === 0 && !showAddOpt && (
              <p className="text-xs text-text-muted">No date options yet.</p>
            )}
            {venue.performanceOptions.map((opt) =>
              readOnly ? (
                <div key={opt.performanceOptionId} className="flex items-center gap-3 rounded bg-elevated/50 px-2 py-1.5 text-xs">
                  <span className="font-medium text-text-primary">{formatProjectOptionDateTime(opt.proposedDate, opt.proposedTime)}</span>
                  <span className="ml-auto"><StatusBadge status={opt.optionStatus} /></span>
                </div>
              ) : (
                <PerformanceOptionRow
                  key={opt.performanceOptionId}
                  opt={opt}
                  projectId={projectId}
                  onRefresh={onRefresh}
                  addToast={addToast}
                />
              ),
            )}
            {!readOnly && showAddOpt && (
              <AddPerformanceOptionForm
                projectId={projectId}
                engagementProjectVenueId={venue.engagementProjectVenueId}
                onAdded={async () => {
                  await onRefresh();
                  setShowAddOpt(false);
                }}
                onCancel={() => setShowAddOpt(false)}
                addToast={addToast}
              />
            )}
          </div>
        </div>
      </div>
      <AlertDialog
        open={confirmRemoveOpen}
        onOpenChange={(open) => {
          if (!deleting) setConfirmRemoveOpen(open);
        }}
      >
        <AlertDialogContent className="z-[360] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">
              Remove this venue?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              {venueDisplayName} will be removed from this project, including any proposed dates for this venue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={deleting} className="border-border bg-elevated text-text-primary hover:bg-hover mt-0">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={deleting}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => void handleDelete()}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove venue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEngagementModal && tourId != null && (
        <VenueConfirmEngagementModal
          venue={venue}
          projectId={projectId}
          attractionId={attractionId}
          attractionName={attractionName ?? null}
          tourId={tourId}
          tourName={tourName ?? null}
          onCreated={(engagementId) => {
            setShowEngagementModal(false);
            setEditingStatus(false);
            onOpenEngagement?.(engagementId);
            void onRefresh();
          }}
          onCancel={() => {
            setShowEngagementModal(false);
            setVenueStatus(venue.venueStatus);
          }}
          addToast={addToast}
        />
      )}
    </>
  );
}

// ─── Add Venue form ───────────────────────────────────────────────────────────

function dmaMarketFamilyKey(value: string | null | undefined): string {
  return cleanDmaMarketLabel(value)
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function AddVenueForm({
  projectId,
  existingIds,
  availableVenueRows,
  marketNames,
  loadingMarkets = false,
  loadingVenues = false,
  onSaved,
  onCancel,
  addToast,
}: {
  projectId: number;
  existingIds: Set<number>;
  availableVenueRows: ApiAllVenueRow[];
  marketNames: string[];
  loadingMarkets?: boolean;
  loadingVenues?: boolean;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  addToast: Props['addToast'];
}) {
  const [selectedMarket, setSelectedMarket] = useState('');
  const [venueId, setVenueId] = useState('');
  const [saving, setSaving] = useState(false);

  const marketOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const marketName of marketNames) {
      const label = cleanDmaMarketLabel(marketName);
      const key = dmaMarketFamilyKey(marketName);
      if (!key || !label) continue;
      const existing = byKey.get(key);
      if (!existing || label.localeCompare(existing, undefined, { sensitivity: 'base' }) < 0) {
        byKey.set(key, label);
      }
    }
    return [...byKey.entries()]
      .sort(([, a], [, b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(([key, label]) => ({
        value: key,
        label,
        searchText: label,
      }));
  }, [marketNames]);

  const venueOptions = useMemo(() => {
    if (!selectedMarket) return [];
    return availableVenueRows
      .filter((v) => !existingIds.has(v.companyId) && dmaMarketFamilyKey(v.dmaMarketName) === selectedMarket)
      .sort((a, b) => (a.venueName ?? '').localeCompare(b.venueName ?? '', undefined, { sensitivity: 'base' }))
      .map((v) => {
        const complex = (v.entertainmentComplexNames ?? '').trim();
        const market = cleanDmaMarketLabel(v.dmaMarketName);
        const details = [
          complex ? `Complex: ${complex}` : null,
          Number.isFinite(v.seatingCapacity) ? `Capacity: ${v.seatingCapacity.toLocaleString()}` : null,
        ].filter(Boolean).join(' · ');
        return {
          value: String(v.companyId),
          label: v.venueName,
          description: details || undefined,
          rightText: market ? `DMA: ${market}` : undefined,
          searchText: [v.venueName, complex, market, v.venueTypeName].filter(Boolean).join(' '),
        };
      });
  }, [availableVenueRows, existingIds, selectedMarket]);

  useEffect(() => {
    if (!selectedMarket) return;
    if (!marketOptions.some((option) => option.value === selectedMarket)) {
      setSelectedMarket('');
      setVenueId('');
    }
  }, [marketOptions, selectedMarket]);

  useEffect(() => {
    if (!venueId) return;
    if (!venueOptions.some((option) => option.value === venueId)) {
      setVenueId('');
    }
  }, [venueId, venueOptions]);

  const handleSave = async () => {
    if (!selectedMarket) { addToast('Select a market.', 'warning'); return; }
    if (!venueId) { addToast('Select a venue.', 'warning'); return; }
    setSaving(true);
    let ok = false;
    try {
      await createProjectVenue(projectId, { venueCompanyId: Number(venueId), venueStatus: 'Pending' as VenueStatus });
      await onSaved();
      ok = true;
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not add venue.'), 'error');
    } finally {
      setSaving(false);
    }
    if (ok) addToast('Venue proposal added.', 'success');
  };

  return (
    <div className="relative bg-elevated border border-border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Market (DMA)" required>
          <Select2
            options={marketOptions}
            value={selectedMarket}
            onChange={(val) => {
              setSelectedMarket(val);
              setVenueId('');
            }}
            placeholder={loadingMarkets ? 'Loading markets…' : 'Select market…'}
            disabled={saving || loadingMarkets}
          />
        </FormField>
        <FormField label="Venue" required>
          <Select2
            key={selectedMarket || 'no-market-selected'}
            options={venueOptions}
            value={venueId}
            onChange={setVenueId}
            placeholder={
              !selectedMarket
                ? 'Select a market first…'
                : loadingVenues
                  ? 'Loading venues…'
                : venueOptions.length
                  ? 'Select venue…'
                  : 'No venues found in this market'
            }
            disabled={!selectedMarket || loadingVenues || saving}
          />
        </FormField>
      </div>
      <div className="flex gap-2 justify-end pt-1 border-t border-border">
        <button type="button" onClick={onCancel} disabled={saving} className="text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary disabled:opacity-50">Cancel</button>
        <button type="button" onClick={() => void handleSave()} disabled={saving}
          className="inline-flex items-center gap-2 bg-ems-accent text-background text-sm px-4 py-1.5 rounded-md font-medium disabled:opacity-60">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving ? 'Saving…' : 'Add Venue'}
        </button>
      </div>
      {saving && (
        <div
          className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 rounded-lg bg-background/55 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-7 w-7 animate-spin text-ems-accent" aria-hidden />
          <span className="text-xs font-medium text-text-primary">Refreshing project…</span>
        </div>
      )}
    </div>
  );
}

// ─── Project Detail Drawer ────────────────────────────────────────────────────

function ProjectDetailDrawer({
  projectId,
  onClose,
  onRequestDelete,
  onOpenEngagement,
  addToast,
  onNavigate,
}: {
  projectId: number;
  onClose: () => void;
  onRequestDelete: (row: ApiProjectListRow) => void;
  onOpenEngagement: (engagementId: number) => void;
  addToast: Props['addToast'];
  onNavigate?: (view: string, data?: unknown) => void;
}) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddVenue, setShowAddVenue] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => fetchProject(projectId),
  });

  const toursQuery = useQuery({
    queryKey: ['tours', 'picker', 0, PROJECT_LOOKUP_LIMIT],
    queryFn: async () => (await fetchTours(0, PROJECT_LOOKUP_LIMIT)).data,
    staleTime: 60_000,
  });
  const dmaMarketsQuery = useQuery({
    queryKey: ['dma-markets', 'project-overview', 'all'],
    queryFn: () => fetchDmaMarketsPaged(0, PROJECT_LOOKUP_LIMIT),
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['projects', projectId] });
  }, [qc, projectId]);

  const project = detailQuery.data;
  const venues = useMemo(() => project?.venues ?? [], [project?.venues]);
  const existingVenueIds = useMemo(() => new Set(venues.filter((v) => v.venueStatus !== 'Confirmed').map((v) => v.venueCompanyId)), [venues]);
  const selectedTourForProject = useMemo(
    () => (project ? (toursQuery.data ?? []).find((t) => t.tourId === project.tourId) : undefined),
    [project, toursQuery.data],
  );
  const preferredVenueTypeId = selectedTourForProject?.venueTypePreferenceId ?? null;
  const preferredVenueTypeName = selectedTourForProject?.venueTypePreferenceName ?? null;
  const projectDmaIds = useMemo(() => project?.dmaIds ?? [], [project?.dmaIds]);
  const projectDmaKey = useMemo(
    () => [...projectDmaIds].sort((a, b) => a - b).join(','),
    [projectDmaIds],
  );
  const scopedVenuesQuery = useQuery({
    queryKey: ['project-detail', projectId, 'eligible-venues', projectDmaKey],
    queryFn: async () =>
      (
        await fetchAllVenues(0, PROJECT_LOOKUP_LIMIT, {
          dmaIds: projectDmaIds,
          sortDir: 'asc',
        })
      ).data,
    enabled: Boolean(project) && (activeTab === 'Venues' || showAddVenue) && projectDmaIds.length > 0,
    staleTime: 30_000,
  });
  const addVenueMarketsQuery = useQuery({
    queryKey: PROJECT_WIZARD_DMA_QUERY_KEY,
    queryFn: fetchAllDmaMarketsForWizard,
    enabled: Boolean(project) && activeTab === 'Venues' && showAddVenue && !project?.isReadOnly,
    staleTime: 60_000,
  });
  const eligibleVenueRows = scopedVenuesQuery.data ?? [];
  const addVenueMarketNames = useMemo(() => {
    const byKey = new Map<string, string>();
    const registerMarket = (marketName: string | null | undefined) => {
      const label = cleanDmaMarketLabel(marketName);
      const key = dmaMarketFamilyKey(marketName);
      if (!key || !label) return;
      const existing = byKey.get(key);
      if (!existing || label.localeCompare(existing, undefined, { sensitivity: 'base' }) < 0) {
        byKey.set(key, label);
      }
    };

    const marketCatalog = addVenueMarketsQuery.data ?? [];
    const selectedCanonicalIds = new Set(mapSelectionToCanonicalDmaIds(projectDmaIds, marketCatalog));
    for (const market of marketCatalog) {
      if (selectedCanonicalIds.has(market.dmaid)) registerMarket(market.marketName);
    }

    // If the market lookup is still loading or unavailable, keep the Add Venue form usable from the scoped venues.
    if (byKey.size === 0) {
      for (const venue of eligibleVenueRows) registerMarket(venue.dmaMarketName);
    }

    return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [addVenueMarketsQuery.data, eligibleVenueRows, projectDmaIds]);
  const eligibleVenueIdSet = useMemo(
    () => new Set(eligibleVenueRows.map((v) => v.companyId)),
    [eligibleVenueRows],
  );
  const outOfScopeVenueCount = useMemo(
    () =>
      venues.filter(
        (v) => !scopedVenuesQuery.isPending && !eligibleVenueIdSet.has(v.venueCompanyId),
      ).length,
    [venues, scopedVenuesQuery.isPending, eligibleVenueIdSet],
  );

  return (
    <Drawer onClose={onClose} width={860}>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="flex-1">
          {detailQuery.isLoading ? (
            <Skeleton className="h-5 w-48 bg-muted/80" />
          ) : (
            <>
              <h2 className="text-base font-semibold text-text-primary">
                {[project?.attractionName, project?.tourName].filter(Boolean).join(' — ') || 'Project'}
              </h2>
              <div className="flex items-center flex-wrap gap-2 mt-0.5">
                {project?.talentAgencyCompanyName && (
                  onNavigate && project.talentAgencyCompanyId ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('companies', { selectedCompanyId: project.talentAgencyCompanyId })}
                      className="text-xs text-text-secondary hover:text-ems-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent/40 rounded-sm transition-colors"
                      title="Open talent agency company"
                    >
                      {project.talentAgencyCompanyName}
                    </button>
                  ) : (
                    <span className="text-xs text-text-secondary">{project.talentAgencyCompanyName}</span>
                  )
                )}
                {project?.projectStage && <StatusBadge status={project.projectStage} />}
              </div>
            </>
          )}
        </div>
        {project && !project.isReadOnly && !detailQuery.isLoading && (
          <button
            type="button"
            onClick={() => onRequestDelete(projectDetailToListRow(project))}
            title="Delete this project"
            className="p-1.5 text-text-muted hover:text-ems-coral hover:bg-ems-coral/10 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-secondary text-lg">✕</button>
      </div>

      <TabBar tabs={['Overview', 'Venues']} active={activeTab} onChange={setActiveTab} />

      <div className="p-4">
        {detailQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-text-muted py-4" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-ems-accent" />Loading project…
          </div>
        )}
        {detailQuery.isError && (
          <p className="text-sm text-ems-coral">{friendlyApiError(detailQuery.error)}</p>
        )}

        {!detailQuery.isLoading && project && activeTab === 'Overview' && (toursQuery.isPending || dmaMarketsQuery.isPending) && (
          <div className="flex items-center gap-2 text-sm text-text-muted py-8" role="status">
            <Loader2 className="h-4 w-4 animate-spin text-ems-accent" />
            Loading fields…
          </div>
        )}

        {!detailQuery.isLoading && project && activeTab === 'Overview' && !toursQuery.isPending && !dmaMarketsQuery.isPending && (
          <ProjectInlineOverview
            project={project}
            tours={toursQuery.data ?? []}
            dmaMarkets={dmaMarketsQuery.data?.data ?? []}
            onUpdated={async () => {
              await refresh();
              await qc.invalidateQueries({ queryKey: ['projects', 'api'] });
              await qc.invalidateQueries({ queryKey: ['projects', 'suggestion-cache'], exact: false });
            }}
            onGoToVenues={() => setActiveTab('Venues')}
            onOpenEngagement={onOpenEngagement}
            addToast={addToast}
          />
        )}

        {!detailQuery.isLoading && project && activeTab === 'Venues' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">Venue Proposals</h3>
              {!project.isReadOnly && (
                <button type="button" onClick={() => setShowAddVenue(!showAddVenue)} className="text-ems-accent text-sm hover:underline">
                  + Add Venue
                </button>
              )}
            </div>

            {project.isReadOnly && project.convertedEngagementId != null && (
              <div className="flex flex-col gap-2 rounded-md border border-ems-accent/30 bg-ems-accent/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-2 text-xs text-text-secondary">
                  <Lock className="h-3.5 w-3.5 text-ems-accent" aria-hidden />
                  Venue proposals are view-only after engagement creation.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenEngagement(project.convertedEngagementId as number)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ems-accent hover:underline"
                >
                  Open engagement <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            )}

            <div className="rounded-md border border-border bg-surface px-3 py-2">
              <p className="text-[11px] text-text-muted leading-relaxed">
                Scope for this project: {projectDmaIds.length} market{projectDmaIds.length === 1 ? '' : 's'} selected.
              </p>
              {scopedVenuesQuery.isPending ? (
                <p className="text-[11px] text-text-muted mt-1">Loading eligible venues…</p>
              ) : (
                <p className="text-[11px] text-text-muted mt-1">
                  Project-scoped venue matches: {eligibleVenueRows.length.toLocaleString()}.
                </p>
              )}
            </div>
            {!project.isReadOnly && showAddVenue && (
              <AddVenueForm
                projectId={projectId}
                existingIds={existingVenueIds}
                availableVenueRows={scopedVenuesQuery.data ?? []}
                marketNames={addVenueMarketNames}
                loadingMarkets={addVenueMarketsQuery.isPending}
                loadingVenues={scopedVenuesQuery.isPending}
                onSaved={async () => {
                  await refresh();
                  setShowAddVenue(false);
                }}
                onCancel={() => setShowAddVenue(false)}
                addToast={addToast}
              />
            )}
            {venues.length === 0 && !showAddVenue && (
              <p className="text-sm text-text-muted">No venue proposals yet.</p>
            )}
            {venues.map((v) => (
              <VenueProposalRow
                key={v.engagementProjectVenueId}
                venue={v}
                projectId={projectId}
                onRefresh={() => refresh()}
                addToast={addToast}
                readOnly={Boolean(project.isReadOnly)}
                attractionId={project.attractionId}
                attractionName={project.attractionName}
                tourId={project.tourId}
                tourName={project.tourName}
                onOpenEngagement={onOpenEngagement}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ─── Create Project Wizard ────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { num: 1, label: 'Attraction' },
  { num: 2, label: 'Tour' },
  { num: 3, label: 'Date Range' },
  { num: 4, label: 'Preferred Type' },
  { num: 5, label: 'Markets' },
  { num: 6, label: 'Venues' },
  { num: 7, label: 'Summary' },
] as const;

const WIZARD_LAST = WIZARD_STEPS.length;

function WizardStepIndicator({ currentStep }: { currentStep: number }) {
  const safeStep = Math.min(Math.max(currentStep, 1), WIZARD_LAST);
  const currentMeta = WIZARD_STEPS[safeStep - 1];
  const progressPct = (safeStep / WIZARD_LAST) * 100;

  return (
    <div
      className="mb-6 rounded-xl border border-border/80 bg-surface/60 px-4 py-3.5 sm:px-5"
      role="navigation"
      aria-label={`Create project wizard, step ${safeStep} of ${WIZARD_LAST}: ${currentMeta?.label ?? ''}`}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/90">
        <div
          className="h-full rounded-full bg-ems-accent transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Step {safeStep} of {WIZARD_LAST}
          </p>
          <p className="mt-0.5 truncate text-base font-semibold text-text-primary sm:text-lg">
            {currentMeta?.label ?? '—'}
          </p>
        </div>
        <ol className="flex shrink-0 list-none flex-nowrap items-center justify-center gap-2 overflow-x-auto pb-0.5 sm:justify-end sm:pb-0">
          {WIZARD_STEPS.map((s) => {
            const done = safeStep > s.num;
            const active = safeStep === s.num;
            return (
              <li key={s.num} className="flex shrink-0 flex-col items-center gap-1" title={s.label}>
                <span
                  className={[
                    'block rounded-full transition-all duration-200',
                    active
                      ? 'h-3 w-3 bg-ems-accent shadow-[0_0_0_3px_hsl(var(--ems-accent)/0.22)]'
                      : done
                        ? 'h-2.5 w-2.5 bg-ems-accent'
                        : 'h-2.5 w-2.5 border border-border bg-elevated',
                  ].join(' ')}
                />
                <span
                  className={[
                    'hidden text-[9px] font-medium uppercase tracking-tight sm:block',
                    active ? 'text-ems-accent' : done ? 'text-text-secondary' : 'text-text-muted',
                  ].join(' ')}
                >
                  {s.num}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function CreateProjectForm({
  onSaved, onCancel, addToast,
}: {
  onSaved: (result: CreateProjectResult) => void;
  onCancel: () => void;
  addToast: Props['addToast'];
}) {
  const qc = useQueryClient();
  const projectWizardLookupLimit = 8000;
  const attractionsQuery = useQuery({
    queryKey: ['attractions', 'picker', 0, projectWizardLookupLimit],
    queryFn: async () => (await fetchAttractions(0, projectWizardLookupLimit)).data,
    staleTime: 60_000,
  });
  const toursQuery = useQuery({
    queryKey: ['tours', 'picker', 0, projectWizardLookupLimit],
    queryFn: async () => (await fetchTours(0, projectWizardLookupLimit)).data,
    staleTime: 60_000,
    /** Fresh talent-agency fields when opening the wizard (picker cache can predate DB/API changes). */
    refetchOnMount: 'always',
  });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: fetchClasses, staleTime: 60_000 });
  const talentAgencyPickerQuery = useQuery({
    queryKey: talentAgencyCompaniesQueryKey(),
    queryFn: fetchTalentAgencyCompanyRows,
    staleTime: 60_000,
  });
  const companyPickerQuery = useQuery({
    queryKey: ['companies', 'picker', 'project-add-tour', 0, 5000],
    queryFn: fetchCompaniesPickerRows,
    staleTime: 60_000,
  });
  const venueTypesQuery = useQuery({
    queryKey: ['lookups', 'venue-types'],
    queryFn: fetchVenueTypesLookup,
    staleTime: 60_000,
  });
  const [step, setStep] = useState(1);
  const lastSyncedTourRef = useRef<number | null>(null);
  const dmaMarketsQuery = useQuery({
    queryKey: PROJECT_WIZARD_DMA_QUERY_KEY,
    queryFn: fetchAllDmaMarketsForWizard,
    staleTime: 60_000,
    enabled: step >= 5,
  });

  const [attractionSearch, setAttractionSearch] = useState('');
  const [selectedAttractionId, setSelectedAttractionId] = useState<number | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [tourSearch, setTourSearch] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState(getTodayDateString());
  const [dateRangeEnd, setDateRangeEnd] = useState(getTodayDateString());
  const [selectedPreferredVenueTypeIds, setSelectedPreferredVenueTypeIds] = useState<number[]>([]);
  const [preferredVenueTypeSearch, setPreferredVenueTypeSearch] = useState('');

  const [selectedDmaIds, setSelectedDmaIds] = useState<number[]>([]);
  const validSelectedDmaIds = useMemo(
    () => deriveValidSelectedDmaIds(selectedDmaIds),
    [selectedDmaIds],
  );
  /** Stable key when market selection changes — used for venue query + clearing venue draft. */
  const selectedDmaIdsKey = useMemo(() => dmaSelectionKey(selectedDmaIds), [selectedDmaIds]);
  /** Wizard step 3 — talent agency; persisted on dbo.Tour.TalentAgencyCompanyID when the project is created. */
  const [projectTourMgmtCompanyId, setProjectTourMgmtCompanyId] = useState<number | null>(null);

  const [venueSearch, setVenueSearch] = useState('');
  const [selectedVenueCompanyIds, setSelectedVenueCompanyIds] = useState<number[]>([]);
  const [venueSeenLabels, setVenueSeenLabels] = useState(() => new Map<number, string>());
  /** dbo.EngagementProjectVenue.VenueStatus — one value applied to every venue on create (user picks from meta). */
  const [wizardVenueStatus, setWizardVenueStatus] = useState('');

  const venueStatusMetaQuery = useQuery({
    queryKey: ['projects', 'meta', 'venue-statuses'],
    queryFn: fetchVenueStatusMeta,
    staleTime: 60_000,
    enabled: step >= 6,
  });
  const venuesWizardQuery = useQuery({
    queryKey: ['venue-directory', 'project-wizard-venues', selectedDmaIdsKey],
    queryFn: async () => {
      if (validSelectedDmaIds.length === 0) return [];
      return (
        await fetchAllVenues(0, projectWizardLookupLimit, {
          dmaIds: validSelectedDmaIds,
          sortDir: 'asc',
        })
      ).data;
    },
    enabled: validSelectedDmaIds.length > 0 && step >= 6 && step <= 7,
    staleTime: 60_000,
  });

  const [projectStage, setProjectStage] = useState<ProjectStage>('Requested');
  const { accounts } = useMsal();
  const activeAccount = getActiveAccount() ?? accounts[0] ?? null;
  const createdByDisplayName = getAccountName(activeAccount);
  const createdByOid = getAccountOid(activeAccount).trim();

  const [showAddTourModal, setShowAddTourModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const talentAgentContactsQuery = useQuery({
    queryKey: ['company', projectTourMgmtCompanyId ?? 0, 'contacts'],
    queryFn: () => fetchCompanyContacts(projectTourMgmtCompanyId as number),
    enabled: projectTourMgmtCompanyId != null && projectTourMgmtCompanyId >= 1 && step >= 2,
    staleTime: 60_000,
  });

  const attractions = useMemo(
    () => attractionsQuery.data ?? EMPTY_ATTRACTIONS,
    [attractionsQuery.data],
  );
  const tours = useMemo(() => toursQuery.data ?? EMPTY_TOURS, [toursQuery.data]);
  const classes = useMemo(() => classesQuery.data ?? EMPTY_CLASSES, [classesQuery.data]);
  const managementCompanyOptions = useMemo(() => {
    const rows = talentAgencyPickerQuery.data;
    if (!rows?.length) return [];
    return companyToSelect2Options(rows);
  }, [talentAgencyPickerQuery.data]);
  const companyOptions = useMemo(
    () => companyToSelect2Options((companyPickerQuery.data ?? []) as ApiCompanyListRow[]),
    [companyPickerQuery.data],
  );
  const venueTypes = useMemo(
    () => venueTypesQuery.data ?? EMPTY_VENUE_TYPES,
    [venueTypesQuery.data],
  );
  const preferredVenueTypeOptions = useMemo(
    () =>
      venueTypes
        .slice()
        .sort((a, b) =>
          (a.venueTypeName ?? '').localeCompare(b.venueTypeName ?? '', undefined, {
            sensitivity: 'base',
          }),
        )
        .map((row) => ({
          value: String(row.venueTypeId),
          label: row.venueTypeName ?? `Type #${row.venueTypeId}`,
        })),
    [venueTypes],
  );
  const filteredPreferredVenueTypeOptions = useMemo(() => {
    const q = preferredVenueTypeSearch.trim();
    if (!q) return preferredVenueTypeOptions;
    return preferredVenueTypeOptions.filter((opt) => richTextMatches([opt.label], q));
  }, [preferredVenueTypeOptions, preferredVenueTypeSearch]);
  const dmaFlatRows = useMemo(
    () => dmaMarketsQuery.data ?? EMPTY_DMA_MARKETS,
    [dmaMarketsQuery.data],
  );
  const dmaLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of dmaFlatRows) {
      map.set(r.dmaid, formatDmaPickerLabel(r));
    }
    return map;
  }, [dmaFlatRows]);
  const talentAgentOptions = useMemo(
    () =>
      (talentAgentContactsQuery.data ?? []).map((row: ApiCompanyContact) => ({
        value: String(row.contactId),
        label: `${row.firstName} ${row.lastName}`.trim(),
      })),
    [talentAgentContactsQuery.data],
  );

  const venueStatusSelectOptions = useMemo(() => {
    const fromApi = venueStatusMetaQuery.data?.venueStatuses ?? [];
    const list =
      fromApi.length > 0 ? fromApi : (VENUE_STATUS_VALUES as readonly string[]).slice();
    return list.map((v) => ({ value: v, label: v }));
  }, [venueStatusMetaQuery.data]);

  const venueRowsAll = useMemo(
    () => venuesWizardQuery.data ?? EMPTY_VENUE_ROWS,
    [venuesWizardQuery.data],
  );
  const venueRowsFiltered = useMemo(() => {
    const q = venueSearch.trim();
    return venueRowsAll.filter((r) => {
      if (
        q &&
        !richTextMatches(
          [
            r.venueName,
            r.entertainmentComplexNames,
            r.dmaMarketName,
            String(r.companyId),
            r.venueTypeName,
          ],
          q,
        )
      ) {
        return false;
      }
      if (selectedPreferredVenueTypeIds.length === 0) return true;
      return (
        r.venueTypeId != null &&
        selectedPreferredVenueTypeIds.includes(r.venueTypeId)
      );
    });
  }, [venueRowsAll, venueSearch, selectedPreferredVenueTypeIds]);

  const rememberVenueLabel = useCallback((r: ApiAllVenueRow) => {
    const label = formatVenueWizardLabel(r);
    setVenueSeenLabels((prev) => {
      if (prev.get(r.companyId) === label) return prev;
      const next = new Map(prev);
      next.set(r.companyId, label);
      return next;
    });
  }, []);

  const toursByAttraction = useMemo(() => {
    const map = new Map<number, typeof tours>();
    tours.forEach((t) => {
      if (!map.has(t.attractionId)) map.set(t.attractionId, []);
      map.get(t.attractionId)!.push(t);
    });
    return map;
  }, [tours]);

  const filteredAttractions = useMemo(() => {
    const q = attractionSearch.trim();
    return attractions
      .filter((a) => !q || richTextMatches([a.attractionName, a.attractionId], q))
      .sort((a, b) =>
        (a.attractionName ?? '').localeCompare(b.attractionName ?? '', undefined, { sensitivity: 'base' }),
      );
  }, [attractions, attractionSearch]);

  const toursForSelectedAttraction = useMemo(() => {
    if (selectedAttractionId == null) return EMPTY_TOUR_LIST;
    const list = toursByAttraction.get(selectedAttractionId);
    if (!list?.length) return EMPTY_TOUR_LIST;
    return list.slice().sort((a, b) =>
      (a.tourName ?? '').localeCompare(b.tourName ?? '', undefined, { sensitivity: 'base' }),
    );
  }, [selectedAttractionId, toursByAttraction]);

  const filteredToursForAttraction = useMemo(() => {
    const q = tourSearch.trim();
    if (!q) return toursForSelectedAttraction;
    return toursForSelectedAttraction.filter((t) =>
      richTextMatches(
        [
          t.tourName,
          t.tourId,
          t.attractionName,
          t.className,
          t.talentAgencyCompanyName,
        ],
        q,
      ),
    );
  }, [toursForSelectedAttraction, tourSearch]);

  useEffect(() => {
    setTourSearch('');
  }, [selectedAttractionId]);

  const clearTourDerivedFields = useCallback(() => {
    setProjectTourMgmtCompanyId(null);
    setDateRangeStart(getTodayDateString());
    setDateRangeEnd(getTodayDateString());
    setSelectedPreferredVenueTypeIds(EMPTY_PREFERRED_VENUE_TYPE_IDS);
    lastSyncedTourRef.current = null;
  }, []);

  const applyTourFields = useCallback((t: ApiTourListRow) => {
    setProjectTourMgmtCompanyId(t.talentAgencyCompanyId ?? null);
    setDateRangeStart(t.tourStartDate ?? getTodayDateString());
    setDateRangeEnd(t.tourEndDate ?? getTodayDateString());
    setSelectedPreferredVenueTypeIds(
      t.venueTypePreferenceId != null && t.venueTypePreferenceId >= 1
        ? [t.venueTypePreferenceId]
        : EMPTY_PREFERRED_VENUE_TYPE_IDS,
    );
    lastSyncedTourRef.current = t.tourId;
  }, []);

  /** Sync tour fields once per tour id when picker data arrives (no inline `[]` in deps). */
  useEffect(() => {
    if (selectedTourId == null) {
      if (lastSyncedTourRef.current != null) clearTourDerivedFields();
      return;
    }
    if (lastSyncedTourRef.current === selectedTourId) return;
    const t = tours.find((x) => x.tourId === selectedTourId);
    if (!t) return;
    applyTourFields(t);
  }, [selectedTourId, tours, applyTourFields, clearTourDerivedFields]);

  const lastDmaCatalogAtRef = useRef(0);
  useEffect(() => {
    if (!dmaMarketsQuery.data?.length || !dmaMarketsQuery.dataUpdatedAt) return;
    if (lastDmaCatalogAtRef.current === dmaMarketsQuery.dataUpdatedAt) return;
    lastDmaCatalogAtRef.current = dmaMarketsQuery.dataUpdatedAt;
    setSelectedDmaIds((prev) => {
      if (prev.length === 0) return prev;
      const canon = mapSelectionToCanonicalDmaIds(prev, dmaMarketsQuery.data ?? []);
      if (dmaSelectionKey(prev) === dmaSelectionKey(canon)) return prev;
      return canon;
    });
  }, [dmaMarketsQuery.data, dmaMarketsQuery.dataUpdatedAt]);

  const onDmaSelectionChange = useCallback(
    (ids: number[]) => {
      const canonical = mapSelectionToCanonicalDmaIds(ids, dmaFlatRows);
      setSelectedDmaIds((prev) => {
        if (dmaSelectionKey(prev) === dmaSelectionKey(canonical)) return prev;
        return canonical;
      });
      setSelectedVenueCompanyIds((prev) => (prev.length === 0 ? prev : []));
      setVenueSeenLabels((prev) => (prev.size === 0 ? prev : new Map()));
      setVenueSearch((prev) => (prev === '' ? prev : ''));
    },
    [dmaFlatRows],
  );

  /** One section per selected market (even if no venues pass type/search filters). */
  const venuesGroupedBySelectedDma = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
    return validSelectedDmaIds.map((dmaid) => {
      const meta = dmaFlatRows.find((d) => d.dmaid === dmaid);
      const label = dmaLabelById.get(dmaid) ?? `Market #${dmaid}`;
      const selMk = norm(meta?.marketName);
      const rows = venueRowsFiltered.filter((v) => {
        if (v.dmaId != null && v.dmaId === dmaid) return true;
        if (selMk.length > 0 && norm(v.dmaMarketName) === selMk) return true;
        return false;
      });
      return { dmaid, label, rows };
    });
  }, [validSelectedDmaIds, dmaFlatRows, venueRowsFiltered, dmaLabelById]);

  const inputCls =
    'w-full min-w-0 cursor-text bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent placeholder:text-text-muted';
  const lookupsLoading =
    attractionsQuery.isPending ||
    toursQuery.isPending ||
    classesQuery.isPending ||
    talentAgencyPickerQuery.isPending ||
    companyPickerQuery.isPending ||
    venueTypesQuery.isPending;

  const selectedTour = selectedTourId ? tours.find((t) => t.tourId === selectedTourId) : null;
  const selectedTourTalentAgentIds = useMemo(
    () =>
      [...new Set((selectedTour?.talentAgentContactIds ?? []).map((id) => String(id).trim()))].filter(
        (id) => id.length > 0,
      ),
    [selectedTour?.talentAgentContactIds],
  );
  const selectedTourTalentAgentLabels = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    const push = (value: string) => {
      const label = value.trim();
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      labels.push(label);
    };
    const optionById = new Map(talentAgentOptions.map((opt) => [opt.value, opt.label]));
    selectedTourTalentAgentIds.forEach((id) => push(optionById.get(id) ?? `Contact #${id}`));
    (selectedTour?.talentAgentNames ?? []).forEach((name) => push(name));
    return labels;
  }, [selectedTour?.talentAgentNames, selectedTourTalentAgentIds, talentAgentOptions]);
  const tourDatesLockedReason = 'Dates already exist on this tour, so they are locked.';
  const tourDatesLockedInCreate = Boolean(
    selectedTour?.tourStartDate?.trim() && selectedTour?.tourEndDate?.trim(),
  );
  const selectedAttraction =
    selectedAttractionId != null
      ? attractions.find((a) => a.attractionId === selectedAttractionId)
      : null;

  const canProceedStep1 = selectedAttractionId != null;
  const canProceedStep2 =
    selectedTourId != null &&
    projectTourMgmtCompanyId != null &&
    projectTourMgmtCompanyId >= 1;
  const canProceedDateRange =
    dateRangeStart.trim().length > 0 &&
    dateRangeEnd.trim().length > 0 &&
    dateRangeStart <= dateRangeEnd;
  const canProceedTourMgmt =
    projectTourMgmtCompanyId != null && projectTourMgmtCompanyId >= 1;
  const canProceedMarkets = validSelectedDmaIds.length > 0;
  const canProceedVenues = selectedVenueCompanyIds.length > 0;
  const canProceedVenueStatusStep = wizardVenueStatus.trim().length > 0;
  /** Final step: tour, tour mgmt, markets, venues, venue status, and project stage. */
  const canCreateProject =
    selectedTourId != null &&
    canProceedDateRange &&
    canProceedTourMgmt &&
    canProceedMarkets &&
    canProceedVenues &&
    canProceedVenueStatusStep &&
    Boolean(projectStage);

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleNext = () => {
    if (step === 2 && !canProceedStep2) {
      addToast('Choose a tour with a Talent Agency to continue.', 'warning');
      return;
    }
    if (step === 3 && !canProceedDateRange) {
      addToast('Choose a valid start and end date range.', 'warning');
      return;
    }
    if (step === 5 && !canProceedMarkets) {
      if (selectedDmaIds.length > 0 && validSelectedDmaIds.length === 0) {
        addToast(
          'The selected market has no valid ID. Close this dialog, reopen Create Project, or recreate the DMA in Settings.',
          'error',
        );
      } else {
        addToast('Select at least one market (DMA). Your choices are saved on the project.', 'warning');
      }
      return;
    }
    if (step === 6 && !canProceedVenues) {
      addToast('Select at least one venue in the selected markets.', 'warning');
      return;
    }
    if (step === 6 && !canProceedVenueStatusStep) {
      addToast('Select a venue proposal status for all selected venues.', 'warning');
      return;
    }
    setStep((s) => Math.min(WIZARD_LAST, s + 1));
  };

  const createTourMut = useMutation({
    mutationFn: ({
      body,
      bannerFile,
    }: {
      body: import('@/api/attractionToursApi').CreateTourPayload;
      bannerFile?: File | null;
    }) => createTour(body, bannerFile ? { bannerFile } : undefined),
    onSuccess: async (res) => {
      const pickerKey = ['tours', 'picker', 0, projectWizardLookupLimit] as const;
      qc.setQueryData<ApiTourListRow[]>(pickerKey, (old) => {
        const list = old ?? [];
        const idx = list.findIndex((x) => x.tourId === res.tourId);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = res;
          return next;
        }
        return [...list, res].sort((a, b) =>
          (a.tourName ?? '').localeCompare(b.tourName ?? '', undefined, { sensitivity: 'base' }),
        );
      });
      setSelectedTourId(res.tourId);
      applyTourFields(res);
      setShowAddTourModal(false);
      addToast('Tour created.', 'success');
      /**
       * Do not invalidate `['tours','picker',…]` here: that refetch replaces this query’s cache and
       * can drop `talentAgencyCompanyId` on rows (until reload), which clears step 3 via the sync effect.
       */
      await qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'tours' &&
          q.queryKey[1] !== 'picker',
      });
    },
    onError: (e: unknown) => addToast(friendlyApiError(e, 'Could not create tour.'), 'error'),
  });

  const handleSubmit = async () => {
    if (!selectedTourId) return;
    if (projectTourMgmtCompanyId == null || projectTourMgmtCompanyId < 1) {
      addToast('Select a tour that has a Talent Agency.', 'error');
      return;
    }
    if (validSelectedDmaIds.length === 0) {
      addToast('Select at least one market (DMA) on the Markets step.', 'error');
      return;
    }
    if (!canProceedVenues) {
      addToast('Complete the Venues step before creating the project.', 'error');
      return;
    }
    const stage = projectStage;
    if (!stage) {
      addToast('Select a project stage before creating the project.', 'error');
      return;
    }
    if (!wizardVenueStatus.trim()) {
      addToast('Select a venue proposal status on the Venues step.', 'error');
      return;
    }
    const venuesPayload = selectedVenueCompanyIds.map((venueCompanyId) => {
      return {
        venueCompanyId,
        venueStatus: wizardVenueStatus.trim() as VenueStatus,
      };
    });
    setSaving(true);
    try {
      const res = await createProject({
        tourId: selectedTourId,
        talentAgencyCompanyId: projectTourMgmtCompanyId,
        projectStage: stage,
        createdBy: createdByOid || undefined,
        tourStartDate: dateRangeStart.trim(),
        tourEndDate: dateRangeEnd.trim(),
        dmaIds: validSelectedDmaIds,
        venues: venuesPayload,
      });
      onSaved(res);
    } catch (e) {
      addToast(friendlyApiError(e, 'Could not create project.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setVenueSelected = (r: ApiAllVenueRow, checked: boolean) => {
    rememberVenueLabel(r);
    if (checked) {
      setSelectedVenueCompanyIds((prev) =>
        prev.includes(r.companyId) ? prev : [...prev, r.companyId],
      );
    } else {
      setSelectedVenueCompanyIds((prev) => prev.filter((id) => id !== r.companyId));
    }
  };

  const removeWizardVenueChip = (companyId: number) => {
    setSelectedVenueCompanyIds((prev) => prev.filter((id) => id !== companyId));
  };

  return (
    <>
    <CreateProjectWizardErrorBoundary
      step={step}
      onClose={onCancel}
      onRecover={() => {
        if (step >= 5) void dmaMarketsQuery.refetch();
        if (step >= 6) void venuesWizardQuery.refetch();
      }}
    >
    <div className="relative space-y-4">
      {lookupsLoading && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/85 text-sm text-text-muted"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-6 w-6 animate-spin text-ems-accent" aria-hidden />
          Loading wizard data…
        </div>
      )}
      <WizardStepIndicator currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Select Attraction</h3>
          <p className="text-xs text-text-muted">
            Search and pick one attraction. You&apos;ll choose a tour on the next step.
          </p>
          <input
            type="text"
            className={inputCls}
            placeholder="Search attractions by name…"
            value={attractionSearch}
            onChange={(e) => setAttractionSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1 border border-border rounded-lg p-2 bg-elevated/40">
            {filteredAttractions.length === 0 && (
              <p className="text-sm text-text-muted px-2 py-4 text-center">No attractions match your search.</p>
            )}
            {filteredAttractions.map((a) => (
              <button
                key={a.attractionId}
                type="button"
                onClick={() => {
                  setSelectedAttractionId(a.attractionId);
                  setSelectedTourId(null);
                  clearTourDerivedFields();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                  selectedAttractionId === a.attractionId
                    ? 'bg-ems-accent/10 border border-ems-accent/30 text-text-primary'
                    : 'hover:bg-hover text-text-secondary border border-transparent'
                }`}
              >
                <span className="font-medium">{a.attractionName}</span>
                {selectedAttractionId === a.attractionId && (
                  <span className="text-ems-accent text-xs font-medium shrink-0">Selected</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary">Select Tour</h3>
            <button
              type="button"
              disabled={selectedAttractionId == null || classes.length === 0}
              onClick={() => setShowAddTourModal(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Create Tour
            </button>
          </div>
          {selectedAttraction && (
            <p className="text-xs text-text-secondary">
              Attraction: <span className="text-text-primary font-medium">{selectedAttraction.attractionName}</span>
            </p>
          )}
          <p className="text-xs text-text-muted">
            Search and pick a tour for this attraction.
          </p>
          <input
            type="text"
            className={inputCls}
            placeholder="Search tours by name…"
            value={tourSearch}
            onChange={(e) => setTourSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1 border border-border rounded-lg p-2 bg-elevated/40">
            {toursForSelectedAttraction.length === 0 && (
              <p className="text-sm text-text-muted px-2 py-6 text-center">
                No tours for this attraction yet. Use <span className="font-medium text-text-secondary">Create Tour</span> to add one.
              </p>
            )}
            {toursForSelectedAttraction.length > 0 && filteredToursForAttraction.length === 0 && (
              <p className="text-sm text-text-muted px-2 py-6 text-center">No tours match your search.</p>
            )}
            {filteredToursForAttraction.map((tour) => (
              <button
                key={tour.tourId}
                type="button"
                onClick={() => {
                  setSelectedTourId(tour.tourId);
                  applyTourFields(tour);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                  selectedTourId === tour.tourId
                    ? 'bg-ems-accent/10 border border-ems-accent/30 text-text-primary'
                    : 'hover:bg-hover text-text-secondary border border-transparent'
                }`}
              >
                <span>{tour.tourName}</span>
                {selectedTourId === tour.tourId && (
                  <span className="text-ems-accent text-xs font-medium shrink-0">Selected</span>
                )}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
            <p className="text-xs font-medium text-text-secondary">Talent info for selected tour</p>
            {selectedTourId == null ? (
              <p className="text-xs text-text-muted">Select a tour to see Talent Agency and Talent Agents.</p>
            ) : projectTourMgmtCompanyId == null ? (
              <div className="rounded-md border border-ems-coral/40 bg-ems-coral/10 px-3 py-2 text-xs text-text-primary">
                This tour has no Talent Agency. Add one on the tour and then continue.
              </div>
            ) : (
              <>
                <FormField label="Talent Agency">
                  <div className="w-full min-w-0 bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary">
                    {selectedTour?.talentAgencyCompanyName?.trim() || `Company #${projectTourMgmtCompanyId}`}
                  </div>
                </FormField>
                <FormField label="Talent Agents (info only)">
                  <div className="w-full min-w-0 bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary">
                    {talentAgentContactsQuery.isPending
                      ? 'Loading contacts…'
                      : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-text-secondary">
                            Selected for this tour:{' '}
                            <span className="font-medium text-text-primary">
                              {selectedTourTalentAgentLabels.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-text-primary">
                              {talentAgentOptions.length}
                            </span>{' '}
                            agency contact{talentAgentOptions.length === 1 ? '' : 's'}.
                          </p>
                          <div>
                            <p className="text-[11px] font-medium text-text-secondary mb-1">
                              Tour-selected talent agents
                            </p>
                            {selectedTourTalentAgentLabels.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedTourTalentAgentLabels.map((label, index) => (
                                  <span
                                    key={`wizard-tour-agent-${index}-${label}`}
                                    className="inline-flex items-center rounded-md border border-ems-accent/35 bg-ems-accent/10 px-2 py-1 text-xs text-text-primary"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-text-muted">
                                No specific talent agents are selected on this tour.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </FormField>
              </>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Date Range</h3>
          <p className="text-xs text-text-muted">
            Select the project date range before moving to preferred venue types.
          </p>
          {tourDatesLockedInCreate && (
            <p className="text-[11px] text-text-muted">
              {tourDatesLockedReason}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input
                type="date"
                className={inputCls}
                value={dateRangeStart}
                disabled={tourDatesLockedInCreate}
                title={tourDatesLockedInCreate ? tourDatesLockedReason : undefined}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </FormField>
            <FormField label="End Date" required>
              <input
                type="date"
                className={inputCls}
                value={dateRangeEnd}
                min={dateRangeStart || undefined}
                disabled={tourDatesLockedInCreate}
                title={tourDatesLockedInCreate ? tourDatesLockedReason : undefined}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </FormField>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Preferred Venue Type</h3>
          <p className="text-xs text-text-muted">
            Choose one or more preferred venue types from the full venue-type list.
          </p>
          {venueTypesQuery.isError ? (
            <div className="rounded-lg border border-ems-coral/40 bg-ems-coral/10 px-3 py-2 text-sm text-text-primary space-y-2">
              <p>Could not load venue types: {friendlyApiError(venueTypesQuery.error)}</p>
              <button
                type="button"
                className="text-sm font-medium text-ems-accent hover:underline"
                onClick={() => void venueTypesQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <FormField label="Search Preferred Venue Types">
                <input
                  type="text"
                  className={inputCls}
                  value={preferredVenueTypeSearch}
                  onChange={(e) => setPreferredVenueTypeSearch(e.target.value)}
                  placeholder="Search venue types..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </FormField>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-text-muted">
                  {selectedPreferredVenueTypeIds.length.toLocaleString()} selected
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-ems-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filteredPreferredVenueTypeOptions.length === 0}
                    onClick={() => {
                      setSelectedPreferredVenueTypeIds((prev) => {
                        const ids = filteredPreferredVenueTypeOptions
                          .map((o) => Number(o.value))
                          .filter((n) => Number.isInteger(n) && n > 0);
                        return [...new Set([...prev, ...ids])];
                      });
                    }}
                  >
                    Select visible
                  </button>
                  <button
                    type="button"
                    className="text-xs text-text-muted hover:text-text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPreferredVenueTypeIds.length === 0}
                    onClick={() => setSelectedPreferredVenueTypeIds([])}
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="max-h-[min(22rem,45vh)] overflow-y-auto rounded-md border border-border bg-surface divide-y divide-border/60">
                {venueTypesQuery.isPending && (
                  <p className="text-sm text-text-muted px-3 py-6 text-center">Loading venue types...</p>
                )}
                {!venueTypesQuery.isPending &&
                  filteredPreferredVenueTypeOptions.length === 0 && (
                    <p className="text-sm text-text-muted px-3 py-6 text-center">
                      No venue types match your search.
                    </p>
                  )}
                {!venueTypesQuery.isPending &&
                  filteredPreferredVenueTypeOptions.map((opt) => {
                    const id = Number(opt.value);
                    const checked = selectedPreferredVenueTypeIds.includes(id);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-start gap-2.5 px-3 py-2.5 text-sm cursor-pointer hover:bg-hover/80 text-text-primary"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border text-ems-accent focus:ring-ems-accent"
                          checked={checked}
                          onChange={() => {
                            setSelectedPreferredVenueTypeIds((prev) =>
                              prev.includes(id)
                                ? prev.filter((x) => x !== id)
                                : [...prev, id],
                            );
                          }}
                        />
                        <span className="min-w-0 break-words">{opt.label}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-muted">
            {preferredVenueTypeOptions.length.toLocaleString()} venue type
            {preferredVenueTypeOptions.length === 1 ? '' : 's'} available.
          </p>
        </div>
      )}

      {/* Step 5: Select Markets — dbo.DMA */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Select Markets (DMAs)</h3>
          <p className="text-xs text-text-muted">
            Please select all Markets where you plan to Make an offer
          </p>
          <ProjectWizardMarketsStep
            rows={dmaFlatRows}
            isPending={dmaMarketsQuery.isPending}
            isError={dmaMarketsQuery.isError}
            error={dmaMarketsQuery.error}
            onRetry={() => void dmaMarketsQuery.refetch()}
            selectedIds={selectedDmaIds}
            onSelectedIdsChange={onDmaSelectionChange}
            addToast={addToast}
          />
        </div>
      )}

      {/* Step 6: Venues in selected markets */}
      {step === 6 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Venue Choice</h3>
          <p className="text-xs text-text-muted">
            {`Every market you picked is shown as its own section. Venues under a section match your selected preferred venue types (if any) and your search. Sections can be empty when nothing matches—adjust filters or clear the search to see more.`}
          </p>
          <FormField label="Venue proposal status" required>
            <Select2
              options={venueStatusSelectOptions}
              value={wizardVenueStatus}
              onChange={setWizardVenueStatus}
              placeholder={
                venueStatusMetaQuery.isPending ? 'Loading statuses…' : 'Select status for all selected venues…'
              }
              disabled={venueStatusSelectOptions.length === 0}
            />
          </FormField>
          {venuesWizardQuery.isPending && (
            <div className="flex flex-col items-center gap-2 text-sm text-text-muted py-10 justify-center border border-dashed border-border rounded-lg bg-surface/50">
              <Loader2 className="h-8 w-8 animate-spin text-ems-accent shrink-0" aria-hidden />
              <span role="status">Loading venues for {validSelectedDmaIds.length} selected market{validSelectedDmaIds.length === 1 ? '' : 's'}…</span>
            </div>
          )}
          {venuesWizardQuery.isError && (
            <div className="rounded-lg border border-ems-coral/40 bg-ems-coral/10 px-3 py-2 text-sm text-text-primary space-y-2">
              <p>Could not load venues: {friendlyApiError(venuesWizardQuery.error)}</p>
              <button
                type="button"
                className="text-sm font-medium text-ems-accent hover:underline"
                onClick={() => void venuesWizardQuery.refetch()}
              >
                Retry
              </button>
            </div>
          )}
          {!venuesWizardQuery.isPending && !venuesWizardQuery.isError && (
            <>
              <FormField label="Filter venues">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Search by venue name, complex, DMA name, or company ID…"
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={venuesWizardQuery.isFetching}
                />
              </FormField>
              <div className="relative rounded-md border border-border bg-surface">
                {venuesWizardQuery.isFetching && (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-background/75 backdrop-blur-[2px] text-sm text-text-muted"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 className="h-7 w-7 animate-spin text-ems-accent shrink-0" aria-hidden />
                    Updating venues…
                  </div>
                )}
                <div
                  className={`max-h-[min(24rem,50vh)] overflow-y-auto divide-y divide-border/60 ${venuesWizardQuery.isFetching ? 'pointer-events-none min-h-[10rem]' : ''}`}
                >
                  {venuesGroupedBySelectedDma.length === 0 && (
                    <p className="text-sm text-text-muted px-3 py-6 text-center">Select at least one market on the previous step.</p>
                  )}
                  {venuesGroupedBySelectedDma.map(({ dmaid, label, rows }) => (
                    <div key={dmaid} className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-text-secondary mb-2">{label}</p>
                      {rows.length === 0 ? (
                        <p className="text-xs text-text-muted px-2 py-2 rounded bg-hover/40 border border-border/60">
                          {venueRowsAll.length === 0
                            ? 'No venues were returned for this market from the directory.'
                            : 'No venues in this market match your preferred venue type or search filter.'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {rows.slice(0, PROJECT_WIZARD_VENUE_RENDER_CAP).map((r) => {
                            const checked = selectedVenueCompanyIds.includes(r.companyId);
                            const complex = (r.entertainmentComplexNames ?? '').trim() || '—';
                            return (
                              <label
                                key={r.companyId}
                                className="flex items-start gap-2.5 px-2 py-1.5 text-sm cursor-pointer hover:bg-hover/80 rounded text-text-primary"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border text-ems-accent focus:ring-ems-accent"
                                  checked={checked}
                                  onChange={(e) => setVenueSelected(r, e.target.checked)}
                                />
                                <span className="min-w-0 break-words">
                                  <span className="font-medium">{r.venueName}</span>
                                  <span className="text-text-muted text-xs block mt-0.5">
                                    Entertainment Complex: {complex} · Capacity: {formatVenueCapacity(r.seatingCapacity)}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                          {rows.length > PROJECT_WIZARD_VENUE_RENDER_CAP && (
                            <p className="text-xs text-ems-amber px-2 py-1">
                              Showing first {PROJECT_WIZARD_VENUE_RENDER_CAP.toLocaleString()} of{" "}
                              {rows.length.toLocaleString()} venues in this section — narrow filters or search to find more.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {venueRowsAll.length > 0 && (
                <p className="text-[11px] text-text-muted leading-relaxed">
                  <span className="font-medium text-text-secondary">
                    {venueRowsFiltered.length.toLocaleString()} of {venueRowsAll.length.toLocaleString()} venue
                    {venueRowsAll.length === 1 ? '' : 's'}
                  </span>{' '}
                  {selectedPreferredVenueTypeIds.length > 0
                    ? 'match your selected preferred venue type filters and your search.'
                    : 'match your search (no preferred venue type filters applied).'}{' '}
                  {validSelectedDmaIds.length} market{validSelectedDmaIds.length === 1 ? '' : 's'} selected — browse by section above.
                </p>
              )}
              {venueRowsAll.length === 0 && validSelectedDmaIds.length > 0 && (
                <p className="text-[11px] text-text-muted">
                  No venues were returned for the selected markets. Try different markets or check the venue directory.
                </p>
              )}
            </>
          )}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Selected venues</p>
            {selectedVenueCompanyIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedVenueCompanyIds.map((cid) => (
                  <span
                    key={cid}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-ems-accent/10 text-text-primary text-xs rounded-md border border-ems-accent/30 max-w-full"
                  >
                    <span className="truncate">{venueSeenLabels.get(cid) ?? `Venue #${cid}`}</span>
                    <button
                      type="button"
                      onClick={() => removeWizardVenueChip(cid)}
                      className="text-text-muted hover:text-ems-coral shrink-0"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">None yet — check at least one venue above.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 7: Project Summary */}
      {step === 7 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Project Summary</h3>
          <div className="bg-elevated border border-border rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Attraction">
                <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
                  {selectedAttraction?.attractionName ?? '—'}
                </div>
              </FormField>
              <FormField label="Tour">
                <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
                  {selectedTour?.tourName ?? '—'}
                </div>
              </FormField>
            </div>
            <FormField label="Date Range">
              <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
                {formatProjectDateRange(dateRangeStart, dateRangeEnd)}
              </div>
            </FormField>
            <FormField label="Preferred Venue Type">
              <div className="text-sm text-text-primary bg-surface px-3 py-2 rounded border border-border">
                {selectedPreferredVenueTypeIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPreferredVenueTypeIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary"
                      >
                        {venueTypes.find((v) => v.venueTypeId === id)?.venueTypeName ?? `Type #${id}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </div>
            </FormField>
            <FormField label="Talent Agency">
              <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
                {projectTourMgmtCompanyId != null
                  ? (selectedTour?.talentAgencyCompanyName?.trim() || `Company #${projectTourMgmtCompanyId}`)
                  : '—'}
              </div>
            </FormField>
            <FormField label="Talent Agents (info only)">
              <div className="text-sm text-text-primary bg-surface px-3 py-2 rounded border border-border">
                {projectTourMgmtCompanyId == null
                  ? '—'
                  : talentAgentContactsQuery.isPending
                    ? 'Loading contacts…'
                    : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-text-secondary">
                          Selected for this tour:{' '}
                          <span className="font-medium text-text-primary">
                            {selectedTourTalentAgentLabels.length}
                          </span>{' '}
                          of{' '}
                          <span className="font-medium text-text-primary">
                            {talentAgentOptions.length}
                          </span>{' '}
                          agency contact{talentAgentOptions.length === 1 ? '' : 's'}.
                        </p>
                        {selectedTourTalentAgentLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedTourTalentAgentLabels.map((label, index) => (
                              <span
                                key={`summary-tour-agent-${index}-${label}`}
                                className="inline-flex items-center rounded-md border border-ems-accent/35 bg-ems-accent/10 px-2 py-1 text-xs text-text-primary"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-text-muted">
                            No specific talent agents are selected on this tour.
                          </p>
                        )}
                      </div>
                    )}
              </div>
            </FormField>
            <FormField label="Markets (DMAs)">
              <div className="text-sm text-text-primary bg-surface px-3 py-2 rounded border border-border">
                {validSelectedDmaIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {validSelectedDmaIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary"
                      >
                        {dmaLabelById.get(id) ?? `DMA #${id}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  '— Add at least one on the Markets step —'
                )}
              </div>
            </FormField>
            <FormField label="Selected Venues">
              <div className="text-sm text-text-primary bg-surface px-3 py-2 rounded border border-border">
                {selectedVenueCompanyIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedVenueCompanyIds.map((cid) => (
                      <span
                        key={cid}
                        className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary"
                      >
                        {venueSeenLabels.get(cid) ?? `Venue #${cid}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  '— Complete the Venues step —'
                )}
              </div>
            </FormField>
            <FormField label="Venue proposal status">
              <div className="text-sm text-text-primary bg-surface px-3 py-1.5 rounded border border-border">
                {wizardVenueStatus.trim() || '— Choose on the Venues step —'}
              </div>
            </FormField>
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs text-text-muted">
                Choose{' '}
                <span className="font-medium">Requested</span>, <span className="font-medium">Drafted</span>, or{' '}
                <span className="font-medium">Submitted</span>. Offer review (and engagement conversion) happens after submission.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Offer Creation Status">
                  <Select2
                    options={CREATE_PROJECT_STAGE_OPTIONS}
                    value={projectStage}
                    onChange={(v) => setProjectStage(v as ProjectStage)}
                    placeholder="Select offer creation status"
                  />
                </FormField>
                <FormField label="Created By (optional)">
                  <input
                    className={inputCls}
                    maxLength={200}
                    value={createdByDisplayName}
                    readOnly
                    placeholder="Signed-in user"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={step === 1 ? onCancel : handleBack}
          disabled={saving}
          className="text-text-secondary px-5 py-1.5 hover:text-text-primary text-sm disabled:opacity-50"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        <div className="flex gap-2">
          {step < WIZARD_LAST ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedDateRange) ||
                (step === 5 && !canProceedMarkets) ||
                (step === 6 && (!canProceedVenues || !canProceedVenueStatusStep || venuesWizardQuery.isPending)) ||
                saving
              }
              className="inline-flex items-center justify-center gap-2 min-w-[8rem] bg-ems-accent hover:bg-ems-accent/80 text-background px-5 py-1.5 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || !canCreateProject}
              className="inline-flex items-center justify-center gap-2 min-w-[8rem] bg-ems-accent hover:bg-ems-accent/80 text-background px-5 py-1.5 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Creating…</> : 'Create Project'}
            </button>
          )}
        </div>
      </div>

    </div>
    </CreateProjectWizardErrorBoundary>

    {showAddTourModal && selectedAttractionId != null && classes.length > 0 && (
      <Modal
        title="Add Tour"
        onClose={() => !createTourMut.isPending && setShowAddTourModal(false)}
        width={760}
        allowContentOverflow
      >
        <AddTourForm
          variant="project-wizard"
          attractions={attractions}
          classes={classes}
          managementCompanyOptions={managementCompanyOptions}
          addToast={addToast}
          lockAttractionId={selectedAttractionId}
          submitting={createTourMut.isPending}
          onCancel={() => setShowAddTourModal(false)}
          onSave={(body, bannerFile) =>
            void createTourMut.mutateAsync({ body, bannerFile: bannerFile ?? undefined })
          }
        />
      </Modal>
    )}
    </>
  );
}

// ─── Main ProjectsPage ────────────────────────────────────────────────────────

function projectListSuggestionLabel(row: ApiProjectListRow): string {
  const a = (row.attractionName ?? '').trim();
  const t = (row.tourName ?? '').trim();
  if (a && t) return `${a} — ${t}`;
  return a || t || `Project #${row.engagementProjectId}`;
}

export function ProjectsPage({ addToast, onNavigate, initialSelectedProjectId }: Props) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchCommitted, setSearchCommitted] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const projectSearchRef = useRef<HTMLDivElement>(null);
  const [stageFilter, setStageFilter] = useState('All');
  const [movableColumnOrder, setMovableColumnOrder] = useState<ProjectMovableColumnId[]>(
    loadProjectMovableColumnOrder,
  );
  const [sortState, setSortState] = useState<{
    col: ProjectMovableColumnId | null;
    dir: 'asc' | 'desc';
  }>(loadProjectsSortState);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiProjectListRow | null>(null);

  // Auto-open project drawer when navigated with initialSelectedProjectId
  useEffect(() => {
    if (initialSelectedProjectId == null) return;
    setSelectedProjectId(initialSelectedProjectId);
  }, [initialSelectedProjectId]);

  const { offset, limit } = getPageParams(page, pageSize);

  const visualSlots = useMemo(
    () => buildProjectVisualSlots(movableColumnOrder),
    [movableColumnOrder],
  );

  const reorderMovableColumns = useCallback((fromM: number, toM: number) => {
    if (fromM === toM || fromM < 0 || toM < 0) return;
    setMovableColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromM, 1);
      next.splice(toM, 0, moved);
      saveProjectMovableColumnOrder(next);
      return next;
    });
  }, []);

  const toggleColumnSort = useCallback((col: ProjectMovableColumnId) => {
    setSortState((s) => {
      if (s.col === col) return { col, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { col, dir: 'asc' };
    });
    setPage(1);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectSearchRef.current && !projectSearchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    saveProjectsSortState(sortState);
  }, [sortState]);

  const sortByParam = sortState.col ? SORT_API_BY_COLUMN[sortState.col] : '';
  const sortDirParam = sortState.col ? sortState.dir : '';

  const projectsSuggestionQuery = useQuery({
    queryKey: projectsSuggestionCacheQueryKey(stageFilter),
    queryFn: async () => {
      const res = await fetchProjects(0, PROJECTS_SUGGESTION_CACHE_LIMIT, {
        projectStage: stageFilter,
        sortBy: 'created',
        sortDir: 'desc',
      });
      return res.data ?? [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const projectSearchSuggestions = useMemo(() => {
    const q = normalizeSearchText(searchInput);
    if (!q) return [] as Array<{ label: string; query: string }>;
    const rows = projectsSuggestionQuery.data ?? [];
    const labels: Array<{ label: string; query: string }> = [];
    for (const row of rows) {
      const primary = projectListSuggestionLabel(row);
      const candidates = [
        row.tourName,
        row.attractionName,
        row.name,
        row.talentAgencyCompanyName,
        row.createdBy,
      ]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean);
      if (!richTextMatches([primary, ...candidates], q)) continue;
      const query =
        candidates.find((c) => richTextMatches([c], q)) ??
        candidates[0] ??
        '';
      if (!query) continue;
      if (!labels.some((l) => l.query.toLowerCase() === query.toLowerCase())) {
        labels.push({ label: primary, query });
      }
      if (labels.length >= 8) break;
    }
    return labels;
  }, [searchInput, projectsSuggestionQuery.data]);

  const commitProjectSearch = useCallback(() => {
    setSearchCommitted(searchInput.trim());
    setShowSearchSuggestions(false);
  }, [searchInput]);

  const hasActiveProjectFilters =
    searchInput.trim().length > 0 ||
    searchCommitted.trim().length > 0 ||
    stageFilter !== 'All';

  const resetProjectFilters = useCallback(() => {
    setSearchInput('');
    setSearchCommitted('');
    setStageFilter('All');
    setShowSearchSuggestions(false);
    setPage(1);
  }, []);

  const projectsQuery = useQuery({
    queryKey: projectsApiQueryKey(offset, limit, searchCommitted, stageFilter, sortByParam, sortDirParam),
    queryFn: async () => {
      const res: ApiPaginatedResponse<ApiProjectListRow> = await fetchProjects(offset, limit, {
        q: searchCommitted || undefined,
        projectStage: stageFilter,
        sortBy: sortState.col ? SORT_API_BY_COLUMN[sortState.col] : undefined,
        sortDir: sortState.col ? sortState.dir : undefined,
      });
      return { data: res.data, total: res.total };
    },
    placeholderData: (prev) => prev,
  });

  const stageFilterOptions = useMemo(
    () => [{ value: 'All', label: 'All' }, ...projectStageSelectOptions([...PROJECT_STAGE_VALUES])],
    [],
  );

  const refetchProjectList = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['projects', 'api'] });
    await qc.invalidateQueries({ queryKey: ['projects', 'suggestion-cache'], exact: false });
  }, [qc]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: async () => {
      await refetchProjectList();
      if (selectedProjectId === pendingDelete?.engagementProjectId) setSelectedProjectId(null);
      addToast('Project deleted.', 'warning');
      setPendingDelete(null);
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not delete project.'), 'error'),
  });

  const rows = projectsQuery.data?.data ?? [];
  const serverTotal = projectsQuery.data?.total ?? 0;

  useEffect(() => { setPage(1); }, [searchCommitted, stageFilter]);

  useEffect(() => { setPage(1); }, [pageSize]);

  const pageCount = getTotalPages(serverTotal, pageSize);
  const { rangeStart, rangeEnd } = getPageRange(page, serverTotal, pageSize);
  const pageClamped = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const isLoading = projectsQuery.isPending || projectsQuery.isFetching;
  const isRefreshing = projectsQuery.isFetching && !projectsQuery.isPending;

  return (
    <div className="space-y-4">
      {isRefreshing && (
        <div className="pointer-events-none fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden" aria-hidden>
          <div className="h-full w-1/3 animate-pulse bg-ems-accent/90" />
        </div>
      )}

      {/* Delete confirm dialog */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open && !deleteMut.isPending) setPendingDelete(null); }}>
        <AlertDialogContent className="z-[340] border-border bg-card text-text-primary shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary font-semibold text-lg">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary text-sm leading-relaxed">
              You&apos;re about to permanently delete this project
              {pendingDelete?.attractionName || pendingDelete?.tourName ? (
                <>
                  {' '}
                  (
                  <span className="font-medium text-text-primary">
                    {pendingDelete.attractionName}
                    {pendingDelete.tourName ? ` — ${pendingDelete.tourName}` : ''}
                  </span>
                  )
                </>
              ) : null}
              . All venue proposals and date options will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMut.isPending && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border border-dashed bg-surface/60 px-3 py-2.5 text-sm text-text-secondary" role="status">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden /><span>Deleting project…</span>
            </div>
          )}
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={deleteMut.isPending} className="border-border bg-elevated text-text-primary hover:bg-hover mt-0">Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={deleteMut.isPending}
              className="bg-ems-coral text-white hover:bg-ems-coral/90 sm:ml-0"
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete.engagementProjectId)}>
              {deleteMut.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Deleting…</> : 'Yes, delete project'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {projectsQuery.isError && (
        <div className="text-sm text-ems-coral border border-ems-coral/30 rounded-md px-3 py-2 bg-ems-coral-dim">
          Could not load projects: {(projectsQuery.error as Error).message}. Is the API running at{' '}
          <code className="text-xs">/api</code> (see Vite proxy)?
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
          {isLoading ? <Skeleton className="h-5 w-12 rounded bg-muted/80" aria-hidden /> : (
            <span className="text-xs bg-elevated px-2 py-0.5 rounded text-text-secondary tabular-nums">
              {serverTotal.toLocaleString()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          disabled={isLoading}
          className="bg-ems-accent hover:bg-ems-accent/80 text-background px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full min-w-0 sm:w-64" ref={projectSearchRef}>
          <div className="flex min-w-0 items-center border border-border rounded-md bg-surface overflow-hidden focus-within:border-ems-accent transition-colors">
            <input
              type="text"
              className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search projects…"
              value={searchInput}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value;
                setSearchInput(v);
                setShowSearchSuggestions(true);
                if (!v.trim()) setSearchCommitted('');
              }}
              onFocus={() => {
                if (searchInput.trim()) setShowSearchSuggestions(true);
              }}
              onBlur={() => setShowSearchSuggestions(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitProjectSearch();
                if (e.key === 'Escape') setShowSearchSuggestions(false);
              }}
            />
            <button
              type="button"
              onClick={commitProjectSearch}
              disabled={isLoading}
              className="shrink-0 cursor-pointer px-2.5 py-1.5 text-text-muted hover:text-ems-accent transition-colors disabled:opacity-50"
              title="Search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {showSearchSuggestions &&
          searchInput.trim().length >= 1 &&
          (projectsSuggestionQuery.isFetching ||
            projectSearchSuggestions.length > 0 ||
            projectsSuggestionQuery.isFetched) ? (
            <div
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden"
              onMouseDown={(e) => e.preventDefault()}
            >
              {projectsSuggestionQuery.isError ? (
                <div className="px-3 py-2 text-sm text-ems-coral" role="alert">
                  Could not load project suggestions.
                </div>
              ) : null}
              {!projectsSuggestionQuery.isError && projectsSuggestionQuery.isFetching ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-text-muted" role="status">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ems-accent" aria-hidden />
                  <span>Loading suggestions…</span>
                </div>
              ) : null}
              {!projectsSuggestionQuery.isError &&
              !projectsSuggestionQuery.isFetching &&
              projectSearchSuggestions.length > 0
                ? projectSearchSuggestions.map((suggestion, i) => (
                    <button
                      key={`${i}-${suggestion.label}-${suggestion.query}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchInput(suggestion.query);
                        setSearchCommitted(suggestion.query);
                        setShowSearchSuggestions(false);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))
                : null}
              {!projectsSuggestionQuery.isError &&
              !projectsSuggestionQuery.isFetching &&
              projectsSuggestionQuery.isFetched &&
              projectSearchSuggestions.length === 0 ? (
                <div className="px-3 py-2.5 text-sm text-text-muted">No matching projects</div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="w-full sm:w-72">
          <Select2
            options={stageFilterOptions}
            value={stageFilter}
            onChange={setStageFilter}
            disabled={isLoading}
            placeholder="Filter by stage"
          />
        </div>
        {hasActiveProjectFilters ? (
          <button
            type="button"
            onClick={resetProjectFilters}
            disabled={isLoading}
            className="inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset search and filters"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        ) : null}
      </div>

      {/* Table */}
      {isLoading ? <ProjectsTableSkeleton rowCount={isAllPageSize(pageSize) ? PAGE_SIZE : pageSize} /> : (
        <>
          <div className="bg-card border border-border rounded-lg overflow-x-auto overflow-y-clip">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border bg-surface">
                  {visualSlots.map((slot, visualIndex) => {
                    if (slot === 'stage') {
                      return (
                        <th
                          key="stage"
                          scope="col"
                          className="text-left py-2.5 px-3 text-text-muted bg-surface"
                          onDragOver={(e) => e.preventDefault()}
                        >
                          Stage
                        </th>
                      );
                    }
                    const sortActive = sortState.col === slot;
                    return (
                      <th
                        key={slot}
                        scope="col"
                        draggable
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(visualIndex));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromVis = parseInt(e.dataTransfer.getData('text/plain'), 10);
                          if (Number.isNaN(fromVis)) return;
                          const fromM = visualIndexToMovable(fromVis);
                          const toM = visualIndexToMovable(visualIndex);
                          if (fromM < 0 || toM < 0) return;
                          reorderMovableColumns(fromM, toM);
                        }}
                        className="text-left py-2.5 px-3 text-text-muted bg-surface select-none min-w-0 cursor-grab active:cursor-grabbing"
                        title="Drag to reorder columns"
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-70 pointer-events-none" aria-hidden />
                          <button
                            type="button"
                            className="inline-flex min-w-0 flex-1 items-center gap-1 text-left font-medium text-text-muted hover:text-text-primary cursor-pointer"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              toggleColumnSort(slot);
                            }}
                          >
                            <span className="truncate">{PROJECT_MOVABLE_LABELS[slot]}</span>
                            {sortActive &&
                              (sortState.dir === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 shrink-0 text-ems-accent" aria-hidden />
                              ))}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !projectsQuery.isError && (
                  <tr>
                    <td colSpan={6} className="py-12 px-3 text-center text-sm text-text-muted">
                      {!searchCommitted && stageFilter === 'All'
                        ? 'No projects returned from the database.'
                        : 'No projects match your search or filters.'}
                    </td>
                  </tr>
                )}
                {rows.map((p) => (
                  <tr
                    key={p.engagementProjectId}
                    onClick={() => {
                      setSelectedProjectId(p.engagementProjectId);
                    }}
                    className="border-b border-border/50 hover:bg-hover cursor-pointer"
                  >
                    {visualSlots.map((slot) => renderProjectListCell(slot, p))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {serverTotal > 0 && (
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
                    disabled={isLoading}
                  />
                  <span>per page</span>
                </span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={pageClamped <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="text-text-muted tabular-nums px-1">Page {pageClamped} / {pageCount}</span>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-md border border-border bg-elevated hover:bg-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  disabled={pageClamped >= pageCount || isLoading}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      {selectedProjectId !== null && (
        <ProjectDetailDrawer
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onRequestDelete={(row) => {
            setSelectedProjectId(null);
            setPendingDelete(row);
          }}
          onOpenEngagement={(engagementId) => {
            setSelectedProjectId(null);
            onNavigate?.('engagement-detail', { engagementId });
          }}
          addToast={addToast}
          onNavigate={onNavigate}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <Modal title="Create Project" onClose={() => setShowCreateModal(false)} width={700} allowContentOverflow>
          <CreateProjectForm
            key="create-project"
            onSaved={async (result) => {
              await refetchProjectList();
              setShowCreateModal(false);
              if (result.converted && result.engagementId != null) {
                addToast('Project and engagement created successfully.', 'success');
                onNavigate?.('engagement-detail', { engagementId: result.engagementId });
              } else {
                addToast('Project created successfully.', 'success');
                setSelectedProjectId(result.engagementProjectId);
              }
            }}
            onCancel={() => setShowCreateModal(false)}
            addToast={addToast}
          />
        </Modal>
      )}

    </div>
  );
}

// ─── Legacy shim – keeps Index.tsx from breaking ──────────────────────────────
export function ProjectDetailPage({ onNavigate }: {
  project?: unknown; projects?: unknown; engagements?: unknown;
  onNavigate: (v: string, data?: unknown) => void;
  addToast?: unknown; onCreateEngagement?: unknown; onUpdateProjects?: unknown;
}) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => onNavigate('projects')} className="text-text-muted hover:text-text-primary text-sm">
        ← Back to Projects
      </button>
      <div className="text-text-muted text-sm bg-card border border-border rounded-lg p-4">
        Project details are now shown in the side drawer. Click any project row in the Projects list.
      </div>
    </div>
  );
}
