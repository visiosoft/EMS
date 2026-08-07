import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2 } from "lucide-react";
import {
  previewMyProfileSyncFromEntra,
  previewUserSyncFromEntra,
} from "@/api/entraProfileSyncApi";
import { EntraSyncPreviewDialog } from "./EntraSyncPreviewDialog";

interface EntraSyncButtonProps {
  /** If provided, uses admin preview for another user's email */
  targetEmail?: string;
  /** Fields relevant to the current section/tab */
  tabFields: string[];
  /** Query keys to invalidate on successful sync */
  invalidateKeys?: unknown[][];
}

export function EntraSyncButton({ targetEmail, tabFields, invalidateKeys }: EntraSyncButtonProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchEnabled, setFetchEnabled] = useState(false);

  const queryKey = ["entra-sync-preview", targetEmail ?? "self"];

  const previewQuery = useQuery({
    queryKey,
    queryFn: () =>
      targetEmail
        ? previewUserSyncFromEntra(targetEmail)
        : previewMyProfileSyncFromEntra(),
    enabled: fetchEnabled,
    staleTime: 0,
  });

  function handleClick() {
    // Clear stale data so dialog shows a loader on re-open
    queryClient.removeQueries({ queryKey });
    setFetchEnabled(true);
  }

  // Open dialog once fresh data arrives
  if (fetchEnabled && previewQuery.data && !dialogOpen && !previewQuery.isFetching) {
    setDialogOpen(true);
  }

  const loading = fetchEnabled && previewQuery.isFetching;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Sync from Entra
      </button>

      {previewQuery.data && (
        <EntraSyncPreviewDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setFetchEnabled(false);
          }}
          changes={previewQuery.data.changes}
          targetEmail={targetEmail}
          tabFields={tabFields}
          invalidateKeys={invalidateKeys}
        />
      )}
    </>
  );
}
