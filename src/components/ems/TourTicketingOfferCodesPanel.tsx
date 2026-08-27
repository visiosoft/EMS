import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Select2 } from './Select2';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchOfferCodeLookups,
  fetchTourMarketing,
  saveTourMarketing,
  type SaveTourMarketingPayload,
  type SaveTourTicketingOfferCode,
} from '@/api/tourMarketingApi';
import type { Select2Option } from './Select2';

interface OfferCodeRowState {
  tempId: string;
  offerCodeId?: number;
  code: string;
  assignedTo: string;
  iaeSms: string;
  purpose: string;
}

function emptyOfferCode(): OfferCodeRowState {
  return {
    tempId: crypto.randomUUID(),
    code: '',
    assignedTo: '',
    iaeSms: '',
    purpose: '',
  };
}

interface Props {
  tourId: number;
  addToast: (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ) => void;
}

/**
 * Ticketing Offer Codes editor — moved from Marketing tab to the Ticketing
 * tab of the Tour Profile per the 2026-08 request.
 */
export function TourTicketingOfferCodesPanel({ tourId, addToast }: Props) {
  const qc = useQueryClient();

  const marketingQuery = useQuery({
    queryKey: ['tour-marketing', tourId],
    queryFn: () => fetchTourMarketing(tourId),
    enabled: tourId > 0,
  });

  const offerCodeLookupsQuery = useQuery({
    queryKey: ['lookups', 'offer-code-options'],
    queryFn: fetchOfferCodeLookups,
    staleTime: 300_000,
  });

  const [offerCodes, setOfferCodes] = useState<OfferCodeRowState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const data = marketingQuery.data;
    if (!data) return;
    setOfferCodes(
      data.offerCodes.map((c) => ({
        tempId: crypto.randomUUID(),
        offerCodeId: c.offerCodeId,
        code: c.code,
        assignedTo: c.assignedTo ?? '',
        iaeSms: c.iaeSms ?? '',
        purpose: c.purpose ?? '',
      })),
    );
    setDirty(false);
  }, [marketingQuery.data]);

  const assignedToOptions = useMemo(
    (): Select2Option[] => [
      { value: '', label: '— select —' },
      ...(offerCodeLookupsQuery.data?.assignedToOptions ?? []).map((v) => ({
        value: v,
        label: v,
      })),
    ],
    [offerCodeLookupsQuery.data],
  );
  const iaeSmsOptions = useMemo(
    (): Select2Option[] => [
      { value: '', label: '— select —' },
      ...(offerCodeLookupsQuery.data?.iaeSmsOptions ?? []).map((v) => ({
        value: v,
        label: v,
      })),
    ],
    [offerCodeLookupsQuery.data],
  );
  const purposeOptions = useMemo(
    (): Select2Option[] => [
      { value: '', label: '— select —' },
      ...(offerCodeLookupsQuery.data?.purposeOptions ?? []).map((v) => ({
        value: v,
        label: v,
      })),
    ],
    [offerCodeLookupsQuery.data],
  );

  const markDirty = () => setDirty(true);
  const addOfferCode = () => {
    setOfferCodes((prev) => [...prev, emptyOfferCode()]);
    markDirty();
  };
  const removeOfferCode = (tempId: string) => {
    setOfferCodes((prev) => prev.filter((c) => c.tempId !== tempId));
    markDirty();
  };
  const updateOfferCode = (tempId: string, patch: Partial<OfferCodeRowState>) => {
    setOfferCodes((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)),
    );
    markDirty();
  };

  const saveMut = useMutation({
    mutationFn: () => {
      for (const c of offerCodes) {
        if (!c.code.trim()) {
          throw new Error('All offer codes must have a non-empty Code value.');
        }
      }
      const payload: SaveTourMarketingPayload = {
        offerCodes: offerCodes.map((c): SaveTourTicketingOfferCode => ({
          offerCodeId: c.offerCodeId,
          code: c.code.trim(),
          assignedTo: c.assignedTo || null,
          iaeSms: c.iaeSms || null,
          purpose: c.purpose || null,
        })),
      };
      return saveTourMarketing(tourId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tour-marketing', tourId] });
      qc.invalidateQueries({ queryKey: ['tours'] });
      setDirty(false);
      setEditing(false);
      addToast('Ticketing offer codes saved.', 'success');
    },
    onError: (e) =>
      addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const loading = marketingQuery.isLoading || offerCodeLookupsQuery.isLoading;
  const error = marketingQuery.error ?? offerCodeLookupsQuery.error;

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading offer codes…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-5 flex items-center gap-2 text-ems-coral text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(error)}
      </div>
    );
  }

  const inputCls =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50';

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">Ticketing Offer Codes</h4>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-ems-accent/50 hover:bg-elevated transition-colors"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={addOfferCode}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1 text-xs font-medium text-ems-accent hover:text-ems-accent/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Code
            </button>
            <button
              type="button"
              onClick={() => {
                const d = marketingQuery.data;
                if (d) {
                  setOfferCodes(
                    d.offerCodes.map((c) => ({
                      tempId: crypto.randomUUID(),
                      offerCodeId: c.offerCodeId,
                      code: c.code,
                      assignedTo: c.assignedTo ?? '',
                      iaeSms: c.iaeSms ?? '',
                      purpose: c.purpose ?? '',
                    })),
                  );
                }
                setDirty(false);
                setEditing(false);
              }}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={!dirty || saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-ems-accent/90 transition-colors disabled:opacity-50"
            >
              {saveMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          {offerCodes.length === 0 ? (
            <p className="text-sm text-text-muted">No offer codes configured.</p>
          ) : (
            <div className="space-y-2">
              {offerCodes.map((code) => (
                <div
                  key={code.tempId}
                  className="rounded-md border border-border bg-surface/40 p-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-text-muted">Code</span>
                      <div className="text-sm text-text-primary mt-0.5">
                        {code.code || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Assigned To</span>
                      <div className="text-sm text-text-primary mt-0.5">
                        {code.assignedTo || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">IAE SMS</span>
                      <div className="text-sm text-text-primary mt-0.5">
                        {code.iaeSms || '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">Purpose</span>
                      <div className="text-sm text-text-primary mt-0.5">
                        {code.purpose || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {offerCodes.length === 0 && (
            <p className="text-sm text-text-muted">
              No offer codes configured. Click "+ Add Code" to get started.
            </p>
          )}
          {offerCodes.map((code, idx) => (
            <div
              key={code.tempId}
              className="rounded-md border border-border bg-surface/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted">
                  Code #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeOfferCode(code.tempId)}
                  className="p-1 text-text-muted hover:text-ems-coral transition-colors"
                  title="Remove code"
                  disabled={saveMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Code *
                  </label>
                  <input
                    className={inputCls + ' bg-transparent'}
                    value={code.code}
                    onChange={(e) =>
                      updateOfferCode(code.tempId, { code: e.target.value })
                    }
                    disabled={saveMut.isPending}
                    placeholder="Enter code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Assigned To
                  </label>
                  <Select2
                    options={assignedToOptions}
                    value={code.assignedTo}
                    onChange={(v) => updateOfferCode(code.tempId, { assignedTo: v })}
                    placeholder="— select —"
                    disabled={saveMut.isPending}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    IAE SMS
                  </label>
                  <Select2
                    options={iaeSmsOptions}
                    value={code.iaeSms}
                    onChange={(v) => updateOfferCode(code.tempId, { iaeSms: v })}
                    placeholder="— select —"
                    disabled={saveMut.isPending}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Purpose
                  </label>
                  <Select2
                    options={purposeOptions}
                    value={code.purpose}
                    onChange={(v) => updateOfferCode(code.tempId, { purpose: v })}
                    placeholder="— select —"
                    disabled={saveMut.isPending}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
