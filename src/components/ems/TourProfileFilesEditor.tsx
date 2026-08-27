import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronDown, Eye, Loader2, Pencil, Save, Search, X } from 'lucide-react';
import {
  fetchTourProfileFiles,
  saveTourProfileFiles,
  type ApiTourProfileFileField,
  type ApiTourProfileFilesResponse,
  type TourProfileFileFieldUpdate,
  type TourProfileFileKey,
  type UpdateTourProfileFilesPayload,
} from '@/api/tourProfileFilesApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { LinkOrUploadField, type LinkFieldValue } from './LinkOrUploadField';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50';

/** Human-readable labels for each link/upload field. */
const FIELD_LABELS: Record<TourProfileFileKey, string> = {
  techRider: 'Tech Rider Link',
  dealSheet: 'Deal Sheet',
  agencySales: 'Agency Sales Link',
  stagehandList: 'Stagehand List',
  linesetSchedule: 'Lineset Schedule',
  cateringRider: 'Catering Rider',
  stageDimensions: 'Stage Dimensions',
  travelRequirements: 'Travel Requirements',
  soundRequirements: 'Sound Requirements',
  videoRequirements: 'Video Requirements',
  lightingRequirements: 'Lighting Requirements',
  heavyEquipmentRequirements: 'Heavy Equipment Requirements',
  marketingManual: 'Marketing Manual',
  marketingMaterial: 'Marketing Material',
  vipPdf: 'VIP PDF',
};

const BOOKING_DOCUMENT_FIELDS: TourProfileFileKey[] = [
  'stagehandList', 'linesetSchedule', 'cateringRider', 'stageDimensions',
  'travelRequirements', 'soundRequirements', 'videoRequirements',
  'lightingRequirements', 'heavyEquipmentRequirements', 'dealSheet',
  'agencySales', 'vipPdf',
];

interface Props {
  tourId: number;
  addToast: (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  /** Which link/upload fields to render. */
  fields: TourProfileFileKey[];
  /** Show + edit the Seat Hold Requirements text field. */
  showSeatHoldRequirements?: boolean;
  /** Section heading shown above the editor. */
  title: string;
  /** Render a document selector and conditionally show the selected fields. */
  bookingDocumentSelector?: boolean;
}

type FieldState = LinkFieldValue & { removed?: boolean };

const emptyFieldState = (from: ApiTourProfileFileField): FieldState => ({
  url: from.linkUrl,
  name: from.linkName,
  pendingFile: null,
});

export function TourProfileFilesEditor({
  tourId,
  addToast,
  fields,
  showSeatHoldRequirements,
  title,
  bookingDocumentSelector = false,
}: Props) {
  const qc = useQueryClient();
  const filesQuery = useQuery({
    queryKey: ['tour-profile-files', tourId],
    queryFn: () => fetchTourProfileFiles(tourId),
    enabled: tourId > 0,
  });

  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<Record<TourProfileFileKey, FieldState>>({
    techRider: { url: null, name: null, pendingFile: null },
    dealSheet: { url: null, name: null, pendingFile: null },
    agencySales: { url: null, name: null, pendingFile: null },
    stagehandList: { url: null, name: null, pendingFile: null },
    linesetSchedule: { url: null, name: null, pendingFile: null },
    cateringRider: { url: null, name: null, pendingFile: null },
    stageDimensions: { url: null, name: null, pendingFile: null },
    travelRequirements: { url: null, name: null, pendingFile: null },
    soundRequirements: { url: null, name: null, pendingFile: null },
    videoRequirements: { url: null, name: null, pendingFile: null },
    lightingRequirements: { url: null, name: null, pendingFile: null },
    heavyEquipmentRequirements: { url: null, name: null, pendingFile: null },
    marketingManual: { url: null, name: null, pendingFile: null },
    marketingMaterial: { url: null, name: null, pendingFile: null },
    vipPdf: { url: null, name: null, pendingFile: null },
  });
  const [seatHoldRequirements, setSeatHoldRequirements] = useState('');
  const [bookingDocumentTypes, setBookingDocumentTypes] = useState<TourProfileFileKey[]>([]);
  const [bookingDocumentPickerOpen, setBookingDocumentPickerOpen] = useState(false);
  const [bookingDocumentSearch, setBookingDocumentSearch] = useState('');

  // Rehydrate whenever server data lands.
  useEffect(() => {
    const d = filesQuery.data;
    if (!d) return;
    setState({
      techRider: emptyFieldState(d.techRider),
      dealSheet: emptyFieldState(d.dealSheet),
      agencySales: emptyFieldState(d.agencySales),
      stagehandList: emptyFieldState(d.stagehandList),
      linesetSchedule: emptyFieldState(d.linesetSchedule),
      cateringRider: emptyFieldState(d.cateringRider),
      stageDimensions: emptyFieldState(d.stageDimensions),
      travelRequirements: emptyFieldState(d.travelRequirements),
      soundRequirements: emptyFieldState(d.soundRequirements),
      videoRequirements: emptyFieldState(d.videoRequirements),
      lightingRequirements: emptyFieldState(d.lightingRequirements),
      heavyEquipmentRequirements: emptyFieldState(d.heavyEquipmentRequirements),
      marketingManual: emptyFieldState(d.marketingManual),
      marketingMaterial: emptyFieldState(d.marketingMaterial),
      vipPdf: emptyFieldState(d.vipPdf),
    });
    setSeatHoldRequirements(d.seatHoldRequirements ?? '');
    setBookingDocumentTypes(
      d.bookingDocumentTypes.length > 0
        ? d.bookingDocumentTypes
        : BOOKING_DOCUMENT_FIELDS.filter((key) => d[key].linkId !== null),
    );
  }, [filesQuery.data]);

  const visibleFields = bookingDocumentSelector
    ? fields.filter((key) => bookingDocumentTypes.includes(key))
    : fields;

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: UpdateTourProfileFilesPayload = {};
      const orig = filesQuery.data;
      for (const key of visibleFields) {
        const cur = state[key];
        const original = orig?.[key];
        const update: TourProfileFileFieldUpdate = {};
        if (cur.pendingFile) {
          update.file = cur.pendingFile;
          if (cur.name !== null) update.name = cur.name;
        } else if (cur.removed) {
          update.remove = true;
        } else {
          if ((cur.url ?? '') !== (original?.linkUrl ?? '')) {
            update.url = cur.url ?? '';
          }
          if ((cur.name ?? '') !== (original?.linkName ?? '')) {
            update.name = cur.name ?? '';
          }
        }
        if (Object.keys(update).length > 0) payload[key] = update;
      }
      if (showSeatHoldRequirements) {
        const cur = seatHoldRequirements.trim() || null;
        const original = orig?.seatHoldRequirements ?? null;
        if (cur !== original) payload.seatHoldRequirements = cur;
      }
      if (bookingDocumentSelector) {
        const original = orig?.bookingDocumentTypes ?? [];
        if (!sameKeys(bookingDocumentTypes, original)) {
          payload.bookingDocumentTypes = bookingDocumentTypes;
        }
      }
      return saveTourProfileFiles(tourId, payload);
    },
    onSuccess: (data: ApiTourProfileFilesResponse) => {
      qc.setQueryData(['tour-profile-files', tourId], data);
      qc.invalidateQueries({ queryKey: ['tours'] });
      qc.invalidateQueries({ queryKey: ['engagements'] });
      addToast('Tour profile saved.', 'success');
      setEditing(false);
    },
    onError: (e) =>
      addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const readOnlyData = filesQuery.data;

  const anyDirty = useMemo(() => {
    if (!readOnlyData) return false;
    for (const key of visibleFields) {
      const cur = state[key];
      const original = readOnlyData[key];
      if (cur.pendingFile) return true;
      if (cur.removed) return true;
      if ((cur.url ?? '') !== (original.linkUrl ?? '')) return true;
      if ((cur.name ?? '') !== (original.linkName ?? '')) return true;
    }
    if (showSeatHoldRequirements) {
      if (
        (seatHoldRequirements.trim() || null) !==
        (readOnlyData.seatHoldRequirements ?? null)
      )
        return true;
    }
    if (bookingDocumentSelector && !sameKeys(bookingDocumentTypes, readOnlyData.bookingDocumentTypes)) {
      return true;
    }
    return false;
  }, [
    fields,
    readOnlyData,
    state,
    seatHoldRequirements,
    showSeatHoldRequirements,
    bookingDocumentSelector,
    bookingDocumentTypes,
    visibleFields,
  ]);

  if (filesQuery.isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (filesQuery.error) {
    return (
      <div className="p-5 flex items-center gap-2 text-ems-coral text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(filesQuery.error)}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-ems-accent/50 hover:bg-elevated transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                // Reset from server data and exit edit mode.
                const d = readOnlyData;
                if (d) {
                  setState({
                    techRider: emptyFieldState(d.techRider),
                    dealSheet: emptyFieldState(d.dealSheet),
                    agencySales: emptyFieldState(d.agencySales),
                    stagehandList: emptyFieldState(d.stagehandList),
                    linesetSchedule: emptyFieldState(d.linesetSchedule),
                    cateringRider: emptyFieldState(d.cateringRider),
                    stageDimensions: emptyFieldState(d.stageDimensions),
                    travelRequirements: emptyFieldState(d.travelRequirements),
                    soundRequirements: emptyFieldState(d.soundRequirements),
                    videoRequirements: emptyFieldState(d.videoRequirements),
                    lightingRequirements: emptyFieldState(d.lightingRequirements),
                    heavyEquipmentRequirements: emptyFieldState(d.heavyEquipmentRequirements),
                    marketingManual: emptyFieldState(d.marketingManual),
                    marketingMaterial: emptyFieldState(d.marketingMaterial),
                    vipPdf: emptyFieldState(d.vipPdf),
                  });
                  setSeatHoldRequirements(d.seatHoldRequirements ?? '');
                  setBookingDocumentTypes(
                    d.bookingDocumentTypes.length > 0
                      ? d.bookingDocumentTypes
                      : BOOKING_DOCUMENT_FIELDS.filter((key) => d[key].linkId !== null),
                  );
                }
                setEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
              disabled={saveMut.isPending}
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={!anyDirty || saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-ems-accent/90 transition-colors disabled:opacity-50"
            >
              {saveMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="space-y-3">
          {showSeatHoldRequirements && (
            <div>
              <div className="text-xs text-text-muted">Seat Hold Requirements</div>
              <div className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">
                {readOnlyData?.seatHoldRequirements || '—'}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {visibleFields.map((key) => (
              <LinkOrUploadField
                key={key}
                label={FIELD_LABELS[key]}
                readOnly
                value={{
                  url: readOnlyData?.[key].linkUrl ?? null,
                  name: readOnlyData?.[key].linkName ?? null,
                }}
                onChange={() => undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted select-none">
            <Eye className="h-3 w-3 shrink-0" /> Editing
          </div>
          {bookingDocumentSelector && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-text-secondary">Booking Documents</legend>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBookingDocumentPickerOpen((open) => !open);
                    setBookingDocumentSearch('');
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50"
                  aria-expanded={bookingDocumentPickerOpen}
                  disabled={saveMut.isPending}
                >
                  <span className={bookingDocumentTypes.length ? '' : 'text-text-muted'}>
                    {bookingDocumentTypes.length
                      ? `${bookingDocumentTypes.length} document${bookingDocumentTypes.length === 1 ? '' : 's'} selected`
                      : 'Select booking documents'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                </button>
                {bookingDocumentPickerOpen && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                    <div className="sticky top-0 bg-card p-1">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <input
                          type="search"
                          value={bookingDocumentSearch}
                          onChange={(event) => setBookingDocumentSearch(event.target.value)}
                          placeholder="Search documents..."
                          className="w-full rounded border border-border bg-background py-1.5 pl-8 pr-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent"
                          autoFocus
                        />
                      </div>
                    </div>
                    {BOOKING_DOCUMENT_FIELDS.filter((key) =>
                      FIELD_LABELS[key].toLowerCase().includes(bookingDocumentSearch.trim().toLowerCase()),
                    ).map((key) => {
                      const selected = bookingDocumentTypes.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setBookingDocumentTypes((current) =>
                            selected
                              ? current.filter((item) => item !== key)
                              : [...current, key],
                          )}
                          className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm transition-colors ${selected ? 'bg-ems-accent/10 text-text-primary' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'}`}
                        >
                          {FIELD_LABELS[key]}
                          {selected && <Check className="h-4 w-4 shrink-0 text-ems-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {bookingDocumentTypes.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-full border border-ems-accent/30 bg-ems-accent/10 px-2 py-1 text-xs font-medium text-text-primary"
                  >
                    {FIELD_LABELS[key]}
                    <button
                      type="button"
                      onClick={() => setBookingDocumentTypes((current) =>
                        current.filter((item) => item !== key),
                      )}
                      className="rounded-full text-text-muted hover:text-ems-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-ems-accent"
                      title={`Remove ${FIELD_LABELS[key]}`}
                      disabled={saveMut.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </fieldset>
          )}
          {showSeatHoldRequirements && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Seat Hold Requirements
              </label>
              <textarea
                className={inputCls + ' min-h-[100px]'}
                value={seatHoldRequirements}
                onChange={(e) => setSeatHoldRequirements(e.target.value)}
                placeholder="Any specific seat hold requirements for the tour…"
                maxLength={500}
                disabled={saveMut.isPending}
              />
              <p className="text-xs text-text-muted">
                {500 - seatHoldRequirements.length} characters remaining
              </p>
            </div>
          )}
          {visibleFields.map((key) => (
            <LinkOrUploadField
              key={key}
              label={FIELD_LABELS[key]}
              value={state[key]}
              disabled={saveMut.isPending}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  [key]: { ...v, removed: false },
                }))
              }
              onRemove={() =>
                setState((prev) => ({
                  ...prev,
                  [key]: {
                    url: null,
                    name: null,
                    pendingFile: null,
                    removed: true,
                  },
                }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function sameKeys(left: TourProfileFileKey[], right: TourProfileFileKey[]) {
  return left.length === right.length && left.every((key) => right.includes(key));
}
