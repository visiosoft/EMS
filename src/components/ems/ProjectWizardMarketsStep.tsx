import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { ApiDmaMarket } from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  deriveValidSelectedDmaIds,
  normalizePositiveIntId,
} from '@/lib/projectWizardDma';
import { DmaListPicker } from './DmaListPicker';

const EMPTY_ROWS: ApiDmaMarket[] = [];

export function ProjectWizardMarketsStep({
  rows,
  isPending,
  isError,
  error,
  onRetry,
  selectedIds,
  onSelectedIdsChange,
  addToast,
}: {
  rows: ApiDmaMarket[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}) {
  const catalog = useMemo(() => rows ?? EMPTY_ROWS, [rows]);
  const validSelected = useMemo(() => deriveValidSelectedDmaIds(selectedIds), [selectedIds]);

  const toggle = (dmaid: number) => {
    const norm = normalizePositiveIntId(dmaid);
    if (norm == null) {
      addToast(
        'This market has no valid ID. Refresh the list or recreate the DMA in Settings → Lookup tables.',
        'error',
      );
      return;
    }
    const next = new Set(validSelected);
    if (next.has(norm)) {
      next.delete(norm);
    } else {
      next.add(norm);
    }
    onSelectedIdsChange([...next].sort((a, b) => a - b));
  };

  const selectMany = (ids: number[]) => {
    const next = new Set(validSelected);
    for (const id of ids) {
      const norm = normalizePositiveIntId(id);
      if (norm != null) next.add(norm);
    }
    onSelectedIdsChange([...next].sort((a, b) => a - b));
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted py-8 justify-center border border-dashed border-border rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-ems-accent shrink-0" aria-hidden />
        <span role="status">Loading DMA markets…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-ems-coral/40 bg-ems-coral/10 px-3 py-3 text-sm text-text-primary space-y-2">
        <p className="font-medium">Could not load DMA markets</p>
        <p className="text-xs text-text-muted break-words">{friendlyApiError(error)}</p>
        <button
          type="button"
          className="text-sm font-medium text-ems-accent hover:underline"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 px-3 py-6 text-sm text-text-muted text-center">
        No DMA markets are available. Add markets under Settings → Lookup tables → DMA, then retry.
      </div>
    );
  }

  const orphanSelection = validSelected.filter((id) => !catalog.some((r) => r.dmaid === id));

  return (
    <div className="space-y-3">
      {orphanSelection.length > 0 && (
        <div className="rounded-lg border border-ems-amber/50 bg-ems-amber/10 px-3 py-2 text-xs text-text-primary">
          {orphanSelection.length} selected market{orphanSelection.length === 1 ? '' : 's'} no longer appear in
          the list (the catalog may have refreshed). Clear and re-select, or click Retry to reload.
        </div>
      )}
      <DmaListPicker
        rows={catalog}
        selectedIds={validSelected}
        onToggle={toggle}
        onSelectMany={selectMany}
        onClearAll={() => onSelectedIdsChange([])}
      />
    </div>
  );
}

