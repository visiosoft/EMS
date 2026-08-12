import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { EntraProfileSyncFieldChange } from "@/api/entraProfileSyncApi";
import {
  applySelectedSyncFromEntra,
  applySelectedUserSyncFromEntra,
} from "@/api/entraProfileSyncApi";

interface EntraSyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: EntraProfileSyncFieldChange[];
  /** If provided, uses the admin endpoint for another user */
  targetEmail?: string;
  /** Fields relevant to the current tab (only these are shown) */
  tabFields?: string[];
  /** Query keys to invalidate on success */
  invalidateKeys?: unknown[][];
}

export function EntraSyncPreviewDialog({
  open,
  onOpenChange,
  changes,
  targetEmail,
  tabFields,
  invalidateKeys,
}: EntraSyncPreviewDialogProps) {
  const queryClient = useQueryClient();
  const TOOLTIP_LENGTH_THRESHOLD = 40;
  const visibleChanges = tabFields
    ? changes.filter((c) => tabFields.includes(c.field))
    : changes;

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(visibleChanges.map((c) => c.field)),
  );

  // Reset selection when visible changes update
  useEffect(() => {
    setSelected(new Set(visibleChanges.map((c) => c.field)));
  }, [changes, tabFields]);

  const applyMutation = useMutation({
    mutationFn: (fields: string[]) =>
      targetEmail
        ? applySelectedUserSyncFromEntra(targetEmail, fields)
        : applySelectedSyncFromEntra(fields),
    onSuccess: () => {
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      onOpenChange(false);
    },
  });

  function toggleField(field: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(visibleChanges.map((c) => c.field)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  function handleApply() {
    applyMutation.mutate([...selected]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync from Entra
          </DialogTitle>
          <DialogDescription>
            Select which fields to update from Microsoft Entra into EMS.
          </DialogDescription>
        </DialogHeader>

        {visibleChanges.length === 0 ? (
          <div className="py-6 text-center text-sm text-neutral-500">
            <Check className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
            All fields on this tab are already up to date.
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Deselect all
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr] gap-x-3 mb-1 px-3">
              <div />
              <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                <span>Current (EMS)</span>
                <span />
                <span>From Entra</span>
              </div>
            </div>

            <div className="space-y-2">
              {visibleChanges.map((change) => (
                (() => {
                  const fromValue = change.from || "(empty)";
                  const toValue = change.to || "(empty)";
                  const fromTooltip = fromValue.length > TOOLTIP_LENGTH_THRESHOLD ? fromValue : undefined;
                  const toTooltip = toValue.length > TOOLTIP_LENGTH_THRESHOLD ? toValue : undefined;
                  return (
                <label
                  key={change.field}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50/60 px-3 py-2.5 transition-colors hover:bg-neutral-100"
                >
                  <Checkbox
                    checked={selected.has(change.field)}
                    onCheckedChange={() => toggleField(change.field)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {change.label}
                    </div>
                    <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-xs">
                      <div className="min-w-0">
                        <span
                          className="block truncate rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700"
                          title={fromTooltip}
                        >
                          {fromValue}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      <div className="min-w-0">
                        <span
                          className="block truncate rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700"
                          title={toTooltip}
                        >
                          {toValue}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
                  );
                })()
              ))}
            </div>
          </>
        )}

        {applyMutation.isError && (
          <p className="mt-2 text-sm font-medium text-red-600">
            Sync failed. Please try again.
          </p>
        )}

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
          {visibleChanges.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              disabled={selected.size === 0 || applyMutation.isPending}
              className="rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              {applyMutation.isPending
                ? "Applying…"
                : `Apply ${selected.size} field${selected.size !== 1 ? "s" : ""}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
