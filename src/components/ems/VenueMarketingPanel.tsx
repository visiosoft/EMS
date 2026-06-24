import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Select2 } from './Select2';
import { Button } from '@/components/ui/button';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchVenueMarketing,
  fetchVenueMarketingLookups,
  saveVenueMarketing,
  type ApiPlacementCategory,
  type ApiLocalizationOption,
  type ApiTagOption,
  type ApiFileSpecOption,
  type ApiFileFormatOption,
  type ApiVenueMarketingSpecRow,
  type SaveVenueMarketingSpecRow,
  type SaveVenueMarketingPayload,
} from '@/api/venueMarketingApi';
import type { Select2Option } from './Select2';

// Options that reveal a custom text input when selected
const LOCALIZATION_CUSTOM_VALUE_OPTIONS = new Set(['Button', 'Tag']);
const FILE_SPEC_CUSTOM_VALUE_OPTIONS = new Set([
  'Bleed',
  'Min. Resolution',
  'Max. Resolution',
  'File Size',
]);

interface SpecRowState {
  tempId: string;
  venueMarketingSpecsId?: number;
  fileName: string;
  placementCategoryId: string;
  graphicSizeHorizontal: string;
  graphicSizeVertical: string;
  fileFormatOptionId: string;
  notes: string;
  localizations: { localizationOptionId: number; customValue: string }[];
  tags: number[];
  fileSpecs: { fileSpecOptionId: number; customValue: string }[];
}

function emptySpecRow(): SpecRowState {
  return {
    tempId: crypto.randomUUID(),
    fileName: '',
    placementCategoryId: '',
    graphicSizeHorizontal: '',
    graphicSizeVertical: '',
    fileFormatOptionId: '',
    notes: '',
    localizations: [],
    tags: [],
    fileSpecs: [],
  };
}

function specFromApi(spec: ApiVenueMarketingSpecRow): SpecRowState {
  return {
    tempId: crypto.randomUUID(),
    venueMarketingSpecsId: spec.venueMarketingSpecsId,
    fileName: spec.fileName ?? '',
    placementCategoryId: spec.placementCategoryId != null ? String(spec.placementCategoryId) : '',
    graphicSizeHorizontal: spec.graphicSizeHorizontal ?? '',
    graphicSizeVertical: spec.graphicSizeVertical ?? '',
    fileFormatOptionId: spec.fileFormatOptionId != null ? String(spec.fileFormatOptionId) : '',
    notes: spec.notes ?? '',
    localizations: spec.localizations.map((l) => ({
      localizationOptionId: l.localizationOptionId,
      customValue: l.customValue ?? '',
    })),
    tags: spec.tags.map((t) => t.tagOptionId),
    fileSpecs: spec.fileSpecs.map((f) => ({
      fileSpecOptionId: f.fileSpecOptionId,
      customValue: f.customValue ?? '',
    })),
  };
}

interface Props {
  venueCompanyId: number;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function VenueMarketingPanel({ venueCompanyId, addToast }: Props) {
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const lookupsQuery = useQuery({
    queryKey: ['venue-marketing', 'lookups'],
    queryFn: fetchVenueMarketingLookups,
    staleTime: 300_000,
  });

  const marketingQuery = useQuery({
    queryKey: ['venue-marketing', venueCompanyId],
    queryFn: () => fetchVenueMarketing(venueCompanyId),
    enabled: venueCompanyId > 0,
  });

  // ── Local state ──────────────────────────────────────────────────────────
  const [styleGuideEnabled, setStyleGuideEnabled] = useState(false);
  const [font, setFont] = useState('');
  const [primaryColors, setPrimaryColors] = useState('');
  const [accentColors, setAccentColors] = useState('');
  const [styleGuideNotes, setStyleGuideNotes] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [specs, setSpecs] = useState<SpecRowState[]>([]);
  const [dirty, setDirty] = useState(false);

  // Populate from API
  useEffect(() => {
    const data = marketingQuery.data;
    if (!data) return;
    setStyleGuideEnabled(data.styleGuideEnabled);
    setFont(data.styleGuide?.font ?? '');
    setPrimaryColors(data.styleGuide?.primaryColors ?? '');
    setAccentColors(data.styleGuide?.accentColors ?? '');
    setStyleGuideNotes(data.styleGuide?.notes ?? '');
    setLogoUrl(data.styleGuide?.logoUrl ?? '');
    setSpecs(data.specs.map(specFromApi));
    setDirty(false);
  }, [marketingQuery.data]);

  // ── Lookups ──────────────────────────────────────────────────────────────
  const placementCategories = lookupsQuery.data?.placementCategories ?? [];
  const localizationOptions = lookupsQuery.data?.localizationOptions ?? [];
  const tagOptions = lookupsQuery.data?.tagOptions ?? [];
  const fileSpecOptions = lookupsQuery.data?.fileSpecOptions ?? [];
  const fileFormatOptions = lookupsQuery.data?.fileFormatOptions ?? [];

  const placementCategoryOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— select —' },
    ...placementCategories.map((pc) => ({
      value: String(pc.placementCategoryId),
      label: pc.placementName,
    })),
  ], [placementCategories]);

  const fileFormatSelectOptions = useMemo((): Select2Option[] => [
    { value: '', label: '— select —' },
    ...fileFormatOptions.map((ff) => ({
      value: String(ff.fileFormatOptionId),
      label: ff.fileFormatName,
    })),
  ], [fileFormatOptions]);

  const getCategoryById = useCallback(
    (id: string) => placementCategories.find((pc) => String(pc.placementCategoryId) === id),
    [placementCategories],
  );

  // ── Spec row helpers ─────────────────────────────────────────────────────
  const markDirty = () => setDirty(true);

  const updateSpec = (tempId: string, patch: Partial<SpecRowState>) => {
    setSpecs((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
    markDirty();
  };

  const addSpec = () => {
    setSpecs((prev) => [...prev, emptySpecRow()]);
    markDirty();
  };

  const removeSpec = (tempId: string) => {
    setSpecs((prev) => prev.filter((s) => s.tempId !== tempId));
    markDirty();
  };

  // Localization toggle
  const toggleLocalization = (tempId: string, optionId: number) => {
    setSpecs((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const exists = s.localizations.find((l) => l.localizationOptionId === optionId);
        if (exists) {
          return { ...s, localizations: s.localizations.filter((l) => l.localizationOptionId !== optionId) };
        }
        return { ...s, localizations: [...s.localizations, { localizationOptionId: optionId, customValue: '' }] };
      }),
    );
    markDirty();
  };

  const setLocalizationCustomValue = (tempId: string, optionId: number, value: string) => {
    setSpecs((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        return {
          ...s,
          localizations: s.localizations.map((l) =>
            l.localizationOptionId === optionId ? { ...l, customValue: value } : l,
          ),
        };
      }),
    );
    markDirty();
  };

  // Tag toggle
  const toggleTag = (tempId: string, tagOptionId: number) => {
    setSpecs((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const has = s.tags.includes(tagOptionId);
        return { ...s, tags: has ? s.tags.filter((t) => t !== tagOptionId) : [...s.tags, tagOptionId] };
      }),
    );
    markDirty();
  };

  // File spec toggle
  const toggleFileSpec = (tempId: string, optionId: number) => {
    setSpecs((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const exists = s.fileSpecs.find((f) => f.fileSpecOptionId === optionId);
        if (exists) {
          return { ...s, fileSpecs: s.fileSpecs.filter((f) => f.fileSpecOptionId !== optionId) };
        }
        return { ...s, fileSpecs: [...s.fileSpecs, { fileSpecOptionId: optionId, customValue: '' }] };
      }),
    );
    markDirty();
  };

  const setFileSpecCustomValue = (tempId: string, optionId: number, value: string) => {
    setSpecs((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const exists = s.fileSpecs.find((f) => f.fileSpecOptionId === optionId);
        if (exists) {
          return {
            ...s,
            fileSpecs: s.fileSpecs.map((f) =>
              f.fileSpecOptionId === optionId ? { ...f, customValue: value } : f,
            ),
          };
        }
        // Auto-add entry when typing into a text-box field
        return { ...s, fileSpecs: [...s.fileSpecs, { fileSpecOptionId: optionId, customValue: value }] };
      }),
    );
    markDirty();
  };

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: () => {
      const payload: SaveVenueMarketingPayload = {
        styleGuideEnabled,
        styleGuide: styleGuideEnabled
          ? { font: font.trim() || null, primaryColors: primaryColors.trim() || null, accentColors: accentColors.trim() || null, notes: styleGuideNotes.trim() || null, logoUrl: logoUrl.trim() || null }
          : null,
        specs: specs.map((s): SaveVenueMarketingSpecRow => ({
          venueMarketingSpecsId: s.venueMarketingSpecsId,
          fileName: s.fileName.trim() || null,
          placementCategoryId: s.placementCategoryId ? Number(s.placementCategoryId) : null,
          graphicSizeHorizontal: s.graphicSizeHorizontal.trim() || null,
          graphicSizeVertical: s.graphicSizeVertical.trim() || null,
          fileFormatOptionId: s.fileFormatOptionId ? Number(s.fileFormatOptionId) : null,
          notes: s.notes.trim() || null,
          localizations: s.localizations.map((l) => ({
            localizationOptionId: l.localizationOptionId,
            customValue: l.customValue.trim() || null,
          })),
          tags: s.tags.map((t) => ({ tagOptionId: t })),
          fileSpecs: s.fileSpecs.map((f) => ({
            fileSpecOptionId: f.fileSpecOptionId,
            customValue: f.customValue.trim() || null,
          })),
        })),
      };
      return saveVenueMarketing(venueCompanyId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venue-marketing', venueCompanyId] });
      setDirty(false);
      addToast('Marketing data saved.', 'success');
    },
    onError: (e) => addToast(friendlyApiError(e, 'Could not save marketing data.'), 'error'),
  });

  // ── Loading / error ──────────────────────────────────────────────────────
  const loading = lookupsQuery.isLoading || marketingQuery.isLoading;
  const error = lookupsQuery.error ?? marketingQuery.error;

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
      {/* ── SECTION A: Style Guide ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Style Guide</h4>

        <div className="flex items-center gap-4">
          <label className="text-sm text-text-primary">Venue Style Guide:</label>
          <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="styleGuideEnabled"
              checked={styleGuideEnabled}
              onChange={() => { setStyleGuideEnabled(true); markDirty(); }}
              disabled={saveMut.isPending}
            />
            Yes
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="styleGuideEnabled"
              checked={!styleGuideEnabled}
              onChange={() => { setStyleGuideEnabled(false); markDirty(); }}
              disabled={saveMut.isPending}
            />
            No
          </label>
        </div>

        {styleGuideEnabled && (
          <div className="space-y-3 pl-2 border-l-2 border-ems-accent/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Font</label>
                <input className={inputCls} value={font} onChange={(e) => { setFont(e.target.value); markDirty(); }} disabled={saveMut.isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Primary Colors</label>
                <input className={inputCls} value={primaryColors} onChange={(e) => { setPrimaryColors(e.target.value); markDirty(); }} disabled={saveMut.isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Accent Colors</label>
                <input className={inputCls} value={accentColors} onChange={(e) => { setAccentColors(e.target.value); markDirty(); }} disabled={saveMut.isPending} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Logo (Link)</label>
                <input className={inputCls} type="url" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); markDirty(); }} disabled={saveMut.isPending} placeholder="https://…" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
              <textarea className={`${inputCls} min-h-[60px] resize-y`} value={styleGuideNotes} onChange={(e) => { setStyleGuideNotes(e.target.value); markDirty(); }} disabled={saveMut.isPending} />
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION B: Marketing Specs ──────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">Marketing Specs</h4>
          <button
            type="button"
            onClick={addSpec}
            className="inline-flex items-center gap-1 text-xs font-medium text-ems-accent hover:text-ems-accent/80 transition-colors"
            disabled={saveMut.isPending}
          >
            <Plus className="h-3.5 w-3.5" /> Add Spec
          </button>
        </div>

        {specs.length === 0 && (
          <p className="text-sm text-text-muted">No marketing specs configured. Click "+ Add Spec" to get started.</p>
        )}

        {specs.map((spec, idx) => {
          const category = getCategoryById(spec.placementCategoryId);
          const sizeUnit = category?.sizeUnit ?? 'px';
          const mediumName = category?.medium?.mediumName ?? '—';

          return (
            <div key={spec.tempId} className="rounded-md border border-border bg-surface/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted">Spec #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSpec(spec.tempId)}
                  className="p-1 text-text-muted hover:text-ems-coral transition-colors"
                  title="Remove spec"
                  disabled={saveMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* File Name */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">File Name</label>
                  <input
                    className={inputCls}
                    value={spec.fileName}
                    onChange={(e) => updateSpec(spec.tempId, { fileName: e.target.value })}
                    disabled={saveMut.isPending}
                  />
                </div>

                {/* Placement Category */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Placement Category</label>
                  <Select2
                    options={placementCategoryOptions}
                    value={spec.placementCategoryId}
                    onChange={(v) => updateSpec(spec.tempId, { placementCategoryId: v })}
                    placeholder="— select —"
                    disabled={saveMut.isPending}
                  />
                </div>

                {/* Medium (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Medium</label>
                  <div className="px-3 py-2 text-sm text-text-secondary bg-surface rounded-md border border-border">
                    {mediumName}
                  </div>
                </div>

                {/* Graphic Size Horizontal */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Width ({sizeUnit})</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={spec.graphicSizeHorizontal}
                    onChange={(e) => updateSpec(spec.tempId, { graphicSizeHorizontal: e.target.value })}
                    disabled={saveMut.isPending}
                  />
                </div>

                {/* Graphic Size Vertical */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Height ({sizeUnit})</label>
                  <input
                    className={inputCls}
                    type="number"
                    value={spec.graphicSizeVertical}
                    onChange={(e) => updateSpec(spec.tempId, { graphicSizeVertical: e.target.value })}
                    disabled={saveMut.isPending}
                  />
                </div>

                {/* File Format */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">File Format</label>
                  <Select2
                    options={fileFormatSelectOptions}
                    value={spec.fileFormatOptionId}
                    onChange={(v) => updateSpec(spec.tempId, { fileFormatOptionId: v })}
                    placeholder="— select —"
                    disabled={saveMut.isPending}
                  />
                </div>
              </div>

              {/* Localization (multi-select checkboxes) */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Localization</label>
                <div className="flex flex-wrap gap-2">
                  {localizationOptions.map((opt) => {
                    const selected = spec.localizations.find((l) => l.localizationOptionId === opt.localizationOptionId);
                    const needsCustom = LOCALIZATION_CUSTOM_VALUE_OPTIONS.has(opt.localizationName);
                    return (
                      <div key={opt.localizationOptionId} className="flex items-center gap-1">
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleLocalization(spec.tempId, opt.localizationOptionId)}
                            disabled={saveMut.isPending}
                          />
                          {opt.localizationName}
                        </label>
                        {selected && needsCustom && (
                          <input
                            className="border border-border rounded px-1.5 py-0.5 text-xs w-24"
                            placeholder="value…"
                            value={selected.customValue}
                            onChange={(e) => setLocalizationCustomValue(spec.tempId, opt.localizationOptionId, e.target.value)}
                            disabled={saveMut.isPending}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tags (multi-select checkboxes) */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Tag</label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((opt) => (
                    <label key={opt.tagOptionId} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spec.tags.includes(opt.tagOptionId)}
                        onChange={() => toggleTag(spec.tempId, opt.tagOptionId)}
                        disabled={saveMut.isPending}
                      />
                      {opt.tagName}
                    </label>
                  ))}
                </div>
              </div>

              {/* File Specifications (multi-select checkboxes) */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">File Specifications</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {fileSpecOptions.map((opt) => {
                    const selected = spec.fileSpecs.find((f) => f.fileSpecOptionId === opt.fileSpecOptionId);
                    const hasCustomField = FILE_SPEC_CUSTOM_VALUE_OPTIONS.has(opt.fileSpecName);
                    return (
                      <div key={opt.fileSpecOptionId} className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleFileSpec(spec.tempId, opt.fileSpecOptionId)}
                            disabled={saveMut.isPending}
                          />
                          {opt.fileSpecName}
                        </label>
                        {hasCustomField && selected && (
                          <input
                            className="border border-border rounded px-1.5 py-0.5 text-xs w-32"
                            placeholder={`Enter ${opt.fileSpecName.toLowerCase()}…`}
                            value={selected.customValue ?? ''}
                            onChange={(e) =>
                              setFileSpecCustomValue(spec.tempId, opt.fileSpecOptionId, e.target.value)
                            }
                            disabled={saveMut.isPending}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                <textarea
                  className={`${inputCls} min-h-[50px] resize-y`}
                  value={spec.notes}
                  onChange={(e) => updateSpec(spec.tempId, { notes: e.target.value })}
                  disabled={saveMut.isPending}
                />
              </div>
            </div>
          );
        })}
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
    </div>
  );
}
