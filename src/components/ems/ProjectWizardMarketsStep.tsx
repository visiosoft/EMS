import { useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { ApiDmaMarket } from '@/api/companyApi';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  deriveValidSelectedDmaIds,
  normalizePositiveIntId,
} from '@/lib/projectWizardDma';

const EMPTY_ROWS: ApiDmaMarket[] = [];

function formatDmaPickerLabel(r: { dmaid?: number; marketName?: string | null }): string {
  const name = (r.marketName ?? '').trim();
  if (name) return name;
  return r.dmaid != null ? `DMA #${r.dmaid}` : '—';
}

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
  const selectedSet = useMemo(() => new Set(validSelected), [validSelected]);

  const toggleMarket = (row: ApiDmaMarket) => {
    const dmaid = normalizePositiveIntId(row.dmaid);
    if (dmaid == null) {
      addToast(
        'This market has no valid ID. Refresh the list or recreate the DMA in Settings → Lookup tables.',
        'error',
      );
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(dmaid)) {
      next.delete(dmaid);
    } else {
      next.add(dmaid);
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
      <div className="max-h-[min(24rem,50vh)] overflow-y-auto py-1">
        <div className="flex flex-wrap gap-2" role="group" aria-label="DMA markets">
          {catalog.map((r) => {
            const dmaid = normalizePositiveIntId(r.dmaid);
            if (dmaid == null) return null;
            const checked = selectedSet.has(dmaid);
            return (
              <button
                key={dmaid}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleMarket(r)}
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  checked
                    ? 'border-ems-accent bg-ems-accent/10 text-ems-accent'
                    : 'border-border bg-transparent text-text-secondary hover:border-ems-accent/50 hover:text-text-primary',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-3.5 w-3.5 items-center justify-center rounded border',
                    checked ? 'border-ems-accent bg-ems-accent text-background' : 'border-border bg-background',
                  ].join(' ')}
                  aria-hidden
                >
                  {checked ? <Check className="h-2.5 w-2.5" /> : null}
                </span>
                <span className="whitespace-nowrap">{formatDmaPickerLabel(r)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
