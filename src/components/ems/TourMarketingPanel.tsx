import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, Loader2, Pencil, X } from 'lucide-react';
import { Select2, Select2Multi } from './Select2';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchTourMarketing,
  saveTourMarketing,
  type SaveTourMarketingPayload,
} from '@/api/tourMarketingApi';
import {
  type ApiAdvertisingSubType,
  type ApiAgeRange,
} from '@/api/attractionToursApi';
import { apiFetch } from '@/api/config';
import type { Select2Option } from './Select2';

interface Props {
  tourId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

/**
 * Tour Marketing panel — audience + media mix.
 * Ticketing Offer Codes and Pre-Sale Passcode moved to the new Ticketing tab.
 */
export function TourMarketingPanel({ tourId, addToast }: Props) {
  const qc = useQueryClient();

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
    queryFn: () =>
      apiFetch<ApiAdvertisingSubType[]>('/tours/advertising-sub-types'),
    staleTime: 300_000,
  });

  const [audienceGender, setAudienceGender] = useState('');
  const [selectedAgeRangeIds, setSelectedAgeRangeIds] = useState<number[]>([]);
  const [selectedMediaMixIds, setSelectedMediaMixIds] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const data = marketingQuery.data;
    if (!data) return;
    setAudienceGender(data.audienceGender ?? '');
    setSelectedAgeRangeIds(data.audienceAgeRangeIds);
    setSelectedMediaMixIds(data.mediaMix.map((m) => m.advertisingSubTypeId));
    setDirty(false);
  }, [marketingQuery.data]);

  const ageRangeOptions = useMemo(
    (): Select2Option[] =>
      (ageRangesQuery.data ?? []).map((ar) => ({
        value: String(ar.ageRangeId),
        label: ar.ageRangeLabel,
      })),
    [ageRangesQuery.data],
  );

  const genderOptions = useMemo(
    (): Select2Option[] => [
      { value: '', label: '— not set —' },
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'All', label: 'All' },
    ],
    [],
  );

  const markDirty = () => setDirty(true);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: SaveTourMarketingPayload = {
        audienceGender: audienceGender.trim() || null,
        audienceAgeRangeIds: selectedAgeRangeIds,
        mediaMix: selectedMediaMixIds.map((id) => ({
          advertisingSubTypeId: id,
          companyId: null,
        })),
      };
      return saveTourMarketing(tourId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tour-marketing', tourId] });
      qc.invalidateQueries({ queryKey: ['tours'] });
      setDirty(false);
      setEditing(false);
      addToast('Tour marketing saved.', 'success');
    },
    onError: (e) =>
      addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const loading =
    marketingQuery.isLoading ||
    ageRangesQuery.isLoading ||
    advertisingSubTypesQuery.isLoading;
  const error =
    marketingQuery.error ??
    ageRangesQuery.error ??
    advertisingSubTypesQuery.error;

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

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">Tour Marketing</h4>
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
              onClick={() => {
                const d = marketingQuery.data;
                if (d) {
                  setAudienceGender(d.audienceGender ?? '');
                  setSelectedAgeRangeIds(d.audienceAgeRangeIds);
                  setSelectedMediaMixIds(
                    d.mediaMix.map((m) => m.advertisingSubTypeId),
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
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="rounded-md bg-surface/60 border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-text-muted">Tour Marketing Director</p>
            {marketingQuery.data?.marketingDirector ? (
              <>
                <p className="text-sm text-text-primary">
                  {marketingQuery.data.marketingDirector.name}
                </p>
                {marketingQuery.data.marketingDirector.email && (
                  <p className="text-xs text-text-muted">
                    {marketingQuery.data.marketingDirector.email}
                  </p>
                )}
                {marketingQuery.data.marketingDirector.phone && (
                  <p className="text-xs text-text-muted">
                    {marketingQuery.data.marketingDirector.phone}
                  </p>
                )}
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
                  ? selectedAgeRangeIds
                      .map((id) => {
                        const ar = (ageRangesQuery.data ?? []).find(
                          (a) => a.ageRangeId === id,
                        );
                        return ar?.ageRangeLabel ?? `#${id}`;
                      })
                      .join(', ')
                  : '—'}
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Media Mix</span>
            <div className="text-sm text-text-primary mt-0.5">
              {selectedMediaMixIds.length > 0
                ? selectedMediaMixIds
                    .map((id) => {
                      const ast = (advertisingSubTypesQuery.data ?? []).find(
                        (a) => a.advertisingSubTypeId === id,
                      );
                      return ast
                        ? ast.parentCategory
                          ? `${ast.parentCategory} — ${ast.subTypeName}`
                          : ast.subTypeName
                        : `#${id}`;
                    })
                    .join(', ')
                : '—'}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="rounded-md bg-surface/60 border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-text-muted">Tour Marketing Director</p>
            {marketingQuery.data?.marketingDirector ? (
              <p className="text-sm text-text-primary">
                {marketingQuery.data.marketingDirector.name}
              </p>
            ) : (
              <p className="text-sm text-text-muted italic">
                Not assigned — add a talent agent contact with role "Marketing
                Director" on the Contacts tab
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Audience Gender
              </label>
              <Select2
                options={genderOptions}
                value={audienceGender}
                onChange={(v) => {
                  setAudienceGender(v);
                  markDirty();
                }}
                placeholder="— not set —"
                disabled={saveMut.isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Audience Age Range
              </label>
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
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Media Mix</label>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {(advertisingSubTypesQuery.data ?? []).map((ast) => (
                <label
                  key={ast.advertisingSubTypeId}
                  className="inline-flex items-center gap-1 text-xs cursor-pointer"
                >
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
                  {ast.parentCategory
                    ? `${ast.parentCategory} — ${ast.subTypeName}`
                    : ast.subTypeName}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
