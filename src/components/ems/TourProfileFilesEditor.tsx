import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, Loader2, Pencil, Save, X } from 'lucide-react';
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
  marketingManual: 'Marketing Manual',
  marketingMaterial: 'Marketing Material',
  vipPdf: 'VIP PDF',
};

interface Props {
  tourId: number;
  addToast: (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  /** Which link/upload fields to render. */
  fields: TourProfileFileKey[];
  /** Show + edit the Pre-Sale Passcode (tour-wide) text field. */
  showPreSalePasscode?: boolean;
  /** Show + edit the Seat Hold Requirements text field. */
  showSeatHoldRequirements?: boolean;
  /** Section heading shown above the editor. */
  title: string;
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
  showPreSalePasscode,
  showSeatHoldRequirements,
  title,
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
    marketingManual: { url: null, name: null, pendingFile: null },
    marketingMaterial: { url: null, name: null, pendingFile: null },
    vipPdf: { url: null, name: null, pendingFile: null },
  });
  const [preSalePasscode, setPreSalePasscode] = useState('');
  const [seatHoldRequirements, setSeatHoldRequirements] = useState('');

  // Rehydrate whenever server data lands.
  useEffect(() => {
    const d = filesQuery.data;
    if (!d) return;
    setState({
      techRider: emptyFieldState(d.techRider),
      dealSheet: emptyFieldState(d.dealSheet),
      agencySales: emptyFieldState(d.agencySales),
      marketingManual: emptyFieldState(d.marketingManual),
      marketingMaterial: emptyFieldState(d.marketingMaterial),
      vipPdf: emptyFieldState(d.vipPdf),
    });
    setPreSalePasscode(d.preSalePasscode ?? '');
    setSeatHoldRequirements(d.seatHoldRequirements ?? '');
  }, [filesQuery.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: UpdateTourProfileFilesPayload = {};
      const orig = filesQuery.data;
      for (const key of fields) {
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
      if (showPreSalePasscode) {
        const cur = preSalePasscode.trim() || null;
        const original = orig?.preSalePasscode ?? null;
        if (cur !== original) payload.preSalePasscode = cur;
      }
      if (showSeatHoldRequirements) {
        const cur = seatHoldRequirements.trim() || null;
        const original = orig?.seatHoldRequirements ?? null;
        if (cur !== original) payload.seatHoldRequirements = cur;
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
    for (const key of fields) {
      const cur = state[key];
      const original = readOnlyData[key];
      if (cur.pendingFile) return true;
      if (cur.removed) return true;
      if ((cur.url ?? '') !== (original.linkUrl ?? '')) return true;
      if ((cur.name ?? '') !== (original.linkName ?? '')) return true;
    }
    if (showPreSalePasscode) {
      if ((preSalePasscode.trim() || null) !== (readOnlyData.preSalePasscode ?? null))
        return true;
    }
    if (showSeatHoldRequirements) {
      if (
        (seatHoldRequirements.trim() || null) !==
        (readOnlyData.seatHoldRequirements ?? null)
      )
        return true;
    }
    return false;
  }, [
    fields,
    readOnlyData,
    state,
    preSalePasscode,
    seatHoldRequirements,
    showPreSalePasscode,
    showSeatHoldRequirements,
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
                    marketingManual: emptyFieldState(d.marketingManual),
                    marketingMaterial: emptyFieldState(d.marketingMaterial),
                    vipPdf: emptyFieldState(d.vipPdf),
                  });
                  setPreSalePasscode(d.preSalePasscode ?? '');
                  setSeatHoldRequirements(d.seatHoldRequirements ?? '');
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
          {showPreSalePasscode && (
            <div>
              <div className="text-xs text-text-muted">Pre-Sale Passcode</div>
              <div className="text-sm text-text-primary mt-0.5">
                {readOnlyData?.preSalePasscode || '—'}
              </div>
            </div>
          )}
          {showSeatHoldRequirements && (
            <div>
              <div className="text-xs text-text-muted">Seat Hold Requirements</div>
              <div className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap">
                {readOnlyData?.seatHoldRequirements || '—'}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            {fields.map((key) => (
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
          {showPreSalePasscode && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Pre-Sale Passcode
              </label>
              <input
                type="text"
                className={inputCls}
                value={preSalePasscode}
                onChange={(e) => setPreSalePasscode(e.target.value)}
                placeholder="Applies to the entire tour"
                disabled={saveMut.isPending}
              />
            </div>
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
          {fields.map((key) => (
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
