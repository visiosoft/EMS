import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Select2, Select2Multi } from './Select2';
import { Button } from '@/components/ui/button';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchTourMarketing,
  fetchOfferCodeLookups,
  saveTourMarketing,
  type ApiTourTicketingOfferCode,
  type SaveTourMarketingPayload,
  type SaveTourTicketingOfferCode,
} from '@/api/tourMarketingApi';
import {
  fetchTours,
  type ApiAdvertisingSubType,
  type ApiAgeRange,
  type ApiTourMediaMixItem,
  type TourMediaMixInput,
} from '@/api/attractionToursApi';
import { apiFetch } from '@/api/config';
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
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function TourMarketingPanel({
  tourId,
  addToast,
}: Props) {
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const marketingQuery = useQuery({
    queryKey: ['tour-marketing', tourId],
    queryFn: () => fetchTourMarketing(tourId),
    enabled: tourId > 0,
  });

  const ageRangesQuery = useQuery({
    queryKey: ['lookups', 'age-ranges'],
    queryFn: () => apiFetch<ApiAgeRange[]>('/tours/age-ranges'),
    staleTime: 300_000,
  });

  const advertisingSubTypesQuery = useQuery({
    queryKey: ['lookups', 'advertising-sub-types'],
    queryFn: () => apiFetch<ApiAdvertisingSubType[]>('/tours/advertising-sub-types'),
    staleTime: 300_000,
  });

  const offerCodeLookupsQuery = useQuery({
    queryKey: ['lookups', 'offer-code-options'],
    queryFn: fetchOfferCodeLookups,
    staleTime: 300_000,
  });

  // ── Local state ──────────────────────────────────────────────────────────
  const [audienceGender, setAudienceGender] = useState('');
  const [selectedAgeRangeIds, setSelectedAgeRangeIds] = useState<number[]>([]);
  const [selectedMediaMixIds, setSelectedMediaMixIds] = useState<number[]>([]);
  const [offerCodes, setOfferCodes] = useState<OfferCodeRowState[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);

  // Populate from API
  useEffect(() => {
    const data = marketingQuery.data;
    if (!data) return;
    setAudienceGender(data.audienceGender ?? '');
    setSelectedAgeRangeIds(data.audienceAgeRangeIds);
    setSelectedMediaMixIds(data.mediaMix.map((m) => m.advertisingSubTypeId));
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

  // ── Options ──────────────────────────────────────────────────────────────
  const ageRangeOptions = useMemo((): Select2Option[] =>
    (ageRangesQuery.data ?? []).map((ar) => ({
      value: String(ar.ageRangeId),
      label: ar.ageRangeLabel,
    })),
    [ageRangesQuery.data],
  );

  const advertisingSubTypeOptions = useMemo((): Select2Option[] =>
    (advertisingSubTypesQuery.data ?? []).map((ast) => ({
      value: String(ast.advertisingSubTypeId),
      label: ast.parentCategory ? `${ast.parentCategory} — ${ast.subTypeName}` : ast.subTypeName,
    })),
    [advertisingSubTypesQuery.data],
  );

  const assignedToOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— select —' },
    ...(offerCodeLookupsQuery.data?.assignedToOptions ?? []).map((v) => ({ value: v, label: v })),
  ], [offerCodeLookupsQuery.data]);

  const iaeSmsOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— select —' },
    ...(offerCodeLookupsQuery.data?.iaeSmsOptions ?? []).map((v) => ({ value: v, label: v })),
  ], [offerCodeLookupsQuery.data]);

  const purposeOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— select —' },
    ...(offerCodeLookupsQuery.data?.purposeOptions ?? []).map((v) => ({ value: v, label: v })),
  ], [offerCodeLookupsQuery.data]);

  const genderOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— not set —' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'All', label: 'All' },
  ], []);

  // ── Offer code helpers ───────────────────────────────────────────────────
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
    setOfferCodes((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)));
    markDirty();
  };

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => {
      // Validate
      for (const code of offerCodes) {
        if (!code.code.trim()) {
          throw new Error('All offer codes must have a non-empty Code value.');
        }
      }

      const payload: SaveTourMarketingPayload = {
        audienceGender: audienceGender.trim() || null,
        audienceAgeRangeIds: selectedAgeRangeIds,
        mediaMix: selectedMediaMixIds.map((id) => ({ advertisingSubTypeId: id, companyId: null })),
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
      addToast('Tour marketing saved.', 'success');
    },
    onError: (e) => addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  // ── Loading / error ──────────────────────────────────────────────────────
  const loading = marketingQuery.isLoading || ageRangesQuery.isLoading || advertisingSubTypesQuery.isLoading || offerCodeLookupsQuery.isLoading;
  const error = marketingQuery.error ?? ageRangesQuery.error ?? advertisingSubTypesQuery.error ?? offerCodeLookupsQuery.error;

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-text-muted text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading marketing data…
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
    <div className="space-y-6 p-1">
      {/* View / Edit toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">Tour Marketing</h4>
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
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Eye className="h-3 w-3" />
            View only
          </button>
        )}
      </div>

      {!editing ? (
        <>
          {/* Read-only view */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="rounded-md bg-surface/60 border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-text-muted">Tour Marketing Director</p>
              {marketingQuery.data?.marketingDirector ? (
                <>
                  <p className="text-sm text-text-primary">{marketingQuery.data.marketingDirector.name}</p>
                  {marketingQuery.data.marketingDirector.email && <p className="text-xs text-text-muted">{marketingQuery.data.marketingDirector.email}</p>}
                  {marketingQuery.data.marketingDirector.phone && <p className="text-xs text-text-muted">{marketingQuery.data.marketingDirector.phone}</p>}
                </>
              ) : (
                <p className="text-sm text-text-muted italic">Not assigned</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-text-muted">Audience Gender</span>
                <div className="text-sm text-text-primary mt-0.5">{audienceGender || '—'}</div>
              </div>
              <div>
                <span className="text-xs text-text-muted">Audience Age Range</span>
                <div className="text-sm text-text-primary mt-0.5">
                  {selectedAgeRangeIds.length > 0
                    ? selectedAgeRangeIds.map((id) => {
                        const ar = (ageRangesQuery.data ?? []).find((a) => a.ageRangeId === id);
                        return ar?.ageRangeLabel ?? `#${id}`;
                      }).join(', ')
                    : '—'}
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted">Media Mix</span>
              <div className="text-sm text-text-primary mt-0.5">
                {selectedMediaMixIds.length > 0
                  ? selectedMediaMixIds.map((id) => {
                      const ast = (advertisingSubTypesQuery.data ?? []).find((a) => a.advertisingSubTypeId === id);
                      return ast ? (ast.parentCategory ? `${ast.parentCategory} — ${ast.subTypeName}` : ast.subTypeName) : `#${id}`;
                    }).join(', ')
                  : '—'}
              </div>
            </div>
          </div>

          {/* Read-only Offer Codes */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h4 className="text-sm font-semibold text-text-primary">Ticketing Offer Codes</h4>
            {offerCodes.length === 0 ? (
              <p className="text-sm text-text-muted">No offer codes configured.</p>
            ) : (
              <div className="space-y-2">
                {offerCodes.map((code) => (
                  <div key={code.tempId} className="rounded-md border border-border bg-surface/40 p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <span className="text-xs text-text-muted">Code</span>
                        <div className="text-sm text-text-primary mt-0.5">{code.code || '—'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-text-muted">Assigned To</span>
                        <div className="text-sm text-text-primary mt-0.5">{code.assignedTo || '—'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-text-muted">IAE SMS</span>
                        <div className="text-sm text-text-primary mt-0.5">{code.iaeSms || '—'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-text-muted">Purpose</span>
                        <div className="text-sm text-text-primary mt-0.5">{code.purpose || '—'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
      {/* ── SECTION A: Tour Info + Audience + Media Mix ──────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Tour Marketing</h4>

        {/* Marketing Director (read-only from contacts) */}
        <div className="rounded-md bg-surface/60 border border-border p-3 space-y-1">
          <p className="text-xs font-medium text-text-muted">Tour Marketing Director</p>
          {marketingQuery.data?.marketingDirector ? (
            <>
              <p className="text-sm text-text-primary">{marketingQuery.data.marketingDirector.name}</p>
              {marketingQuery.data.marketingDirector.email && (
                <p className="text-xs text-text-muted">{marketingQuery.data.marketingDirector.email}</p>
              )}
              {marketingQuery.data.marketingDirector.phone && (
                <p className="text-xs text-text-muted">{marketingQuery.data.marketingDirector.phone}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted italic">Not assigned — add a talent agent contact with role "Marketing Director" on the Contacts tab</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Audience Gender */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Audience Gender</label>
            <Select2
              options={genderOptions}
              value={audienceGender}
              onChange={(v) => { setAudienceGender(v); markDirty(); }}
              placeholder="— not set —"
              disabled={saveMut.isPending}
            />
          </div>

          {/* Audience Age Range (dropdown multi-select) */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Audience Age Range</label>
            <Select2Multi
              options={ageRangeOptions}
              values={selectedAgeRangeIds.map(String)}
              onChange={(vals) => {
                setSelectedAgeRangeIds(vals.map(Number));
                markDirty();
              }}
              placeholder="Select age ranges…"
              disabled={saveMut.isPending}
            />
          </div>
        </div>

        {/* Media Mix (multi-select checkboxes) */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Media Mix</label>
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {(advertisingSubTypesQuery.data ?? []).map((ast) => (
              <label key={ast.advertisingSubTypeId} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMediaMixIds.includes(ast.advertisingSubTypeId)}
                  onChange={() => {
                    setSelectedMediaMixIds((prev) =>
                      prev.includes(ast.advertisingSubTypeId)
                        ? prev.filter((id) => id !== ast.advertisingSubTypeId)
                        : [...prev, ast.advertisingSubTypeId],
                    );
                    markDirty();
                  }}
                  disabled={saveMut.isPending}
                />
                {ast.parentCategory ? `${ast.parentCategory} — ${ast.subTypeName}` : ast.subTypeName}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION B: Ticketing Offer Codes ────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Ticketing Offer Codes</h4>
          <button
            type="button"
            onClick={addOfferCode}
            className="inline-flex items-center gap-1 text-xs font-medium text-ems-accent hover:text-ems-accent/80 transition-colors"
            disabled={saveMut.isPending}
          >
            <Plus className="h-3.5 w-3.5" /> Add Code
          </button>
        </div>

        {offerCodes.length === 0 && (
          <p className="text-sm text-text-muted">No offer codes configured. Click "+ Add Code" to get started.</p>
        )}

        {offerCodes.map((code, idx) => (
          <div key={code.tempId} className="rounded-md border border-border bg-surface/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Code #{idx + 1}</span>
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
                <label className="block text-xs font-medium text-text-muted mb-1">Code *</label>
                <input
                  className={inputCls}
                  value={code.code}
                  onChange={(e) => updateOfferCode(code.tempId, { code: e.target.value })}
                  disabled={saveMut.isPending}
                  placeholder="Enter code"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Assigned To</label>
                <Select2
                  options={assignedToOptions}
                  value={code.assignedTo}
                  onChange={(v) => updateOfferCode(code.tempId, { assignedTo: v })}
                  placeholder="— select —"
                  disabled={saveMut.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">IAE SMS</label>
                <Select2
                  options={iaeSmsOptions}
                  value={code.iaeSms}
                  onChange={(v) => updateOfferCode(code.tempId, { iaeSms: v })}
                  placeholder="— select —"
                  disabled={saveMut.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Purpose</label>
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
      </div>

      {/* ── Save button ─────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="button"
          className="bg-ems-accent text-white hover:opacity-90"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !dirty}
        >
          {saveMut.isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          ) : (
            'Save marketing'
          )}
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
