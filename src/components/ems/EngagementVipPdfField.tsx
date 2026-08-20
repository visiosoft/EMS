import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Cloud, ExternalLink, Loader2, Pencil, Save, Trash2, Upload, X } from 'lucide-react';
import { friendlyApiError } from '@/lib/friendlyApiError';
import {
  fetchEngagementVipPdf,
  saveEngagementVipPdf,
  type ApiEngagementVipPdf,
} from '@/api/tourProfileFilesApi';
import {
  isSharePointPickerConfigured,
  pickSharePointFile,
} from '@/lib/msGraphFilePicker';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50';

interface Props {
  engagementId: number;
  addToast: (
    msg: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ) => void;
}

/**
 * VIP PDF override editor shown on the Engagement Booking section.
 * Reads/writes {@link ApiEngagementVipPdf} — value defaults to Tour.VipPdfLinkID
 * and is overridden when the engagement sets its own value.
 */
export function EngagementVipPdfField({ engagementId, addToast }: Props) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['engagement-vip-pdf', engagementId],
    queryFn: () => fetchEngagementVipPdf(engagementId),
    enabled: engagementId > 0,
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setName(query.data.linkName ?? '');
    setUrl(query.data.linkUrl ?? '');
    setPendingFile(null);
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => {
      if (pendingFile) {
        return saveEngagementVipPdf(engagementId, {
          file: pendingFile,
          name: name.trim() || undefined,
        });
      }
      return saveEngagementVipPdf(engagementId, {
        url: url.trim() || null,
        name: name.trim() || null,
      });
    },
    onSuccess: (data: ApiEngagementVipPdf) => {
      qc.setQueryData(['engagement-vip-pdf', engagementId], data);
      setEditing(false);
      setPendingFile(null);
      addToast('VIP PDF saved for this engagement.', 'success');
    },
    onError: (e) =>
      addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  const removeOverride = useMutation({
    mutationFn: () => saveEngagementVipPdf(engagementId, { remove: true }),
    onSuccess: (data: ApiEngagementVipPdf) => {
      qc.setQueryData(['engagement-vip-pdf', engagementId], data);
      setPendingFile(null);
      addToast(
        'Engagement override removed. Reverted to Tour VIP PDF.',
        'success',
      );
    },
    onError: (e) =>
      addToast(e instanceof Error ? e.message : friendlyApiError(e), 'error'),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading VIP PDF…
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="flex items-center gap-2 text-sm text-ems-coral">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {friendlyApiError(query.error)}
      </div>
    );
  }

  const d = query.data!;
  const sourceLabel =
    d.source === 'engagement'
      ? 'Engagement override'
      : d.source === 'tour'
        ? 'Inherited from Tour'
        : 'Not set';

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text-primary">VIP PDF</p>
          <p className="text-[11px] text-text-muted">Source: {sourceLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {d.hasOverride && !editing && (
            <button
              type="button"
              onClick={() => removeOverride.mutate()}
              disabled={removeOverride.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-muted hover:text-ems-coral hover:border-ems-coral/50"
              title="Remove engagement override; revert to Tour VIP PDF"
            >
              <Trash2 className="h-3 w-3" /> Remove override
            </button>
          )}
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:border-ems-accent/50 hover:bg-elevated"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setName(d.linkName ?? '');
                  setUrl(d.linkUrl ?? '');
                  setPendingFile(null);
                  setEditing(false);
                }}
                disabled={save.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-ems-accent px-2.5 py-1 text-xs text-white hover:bg-ems-accent/90 disabled:opacity-50"
              >
                {save.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div>
          {d.linkUrl ? (
            <a
              href={d.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ems-accent hover:text-ems-accent/80 hover:underline"
            >
              {d.linkName || d.linkUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="text-sm text-text-muted">No VIP PDF set.</p>
          )}
          <p className="mt-1 text-[11px] text-text-muted italic">
            Inherited from Tour Booking → override editable here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input
            type="text"
            className={inputCls + ' cursor-not-allowed bg-elevated/60'}
            value={name || 'VIP PDF'}
            readOnly
            tabIndex={-1}
            aria-label="Display name (auto-filled)"
            title="Auto-filled; not editable."
          />
          <input
            type="text"
            className={inputCls}
            value={pendingFile ? pendingFile.name : url}
            onChange={(e) => {
              setUrl(e.target.value);
              setName('VIP PDF');
              setPendingFile(null);
            }}
            placeholder="https://… or upload a file"
            disabled={save.isPending || !!pendingFile}
          />
          <label className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              disabled={save.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  setPendingFile(f);
                  setName('VIP PDF');
                  setUrl('');
                }
                e.currentTarget.value = '';
              }}
            />
          </label>
          {isSharePointPickerConfigured() && (
            <button
              type="button"
              onClick={async () => {
                setPicking(true);
                try {
                  const picked = await pickSharePointFile({
                    allowedExtensions: [
                      'pdf',
                      'doc',
                      'docx',
                      'jpg',
                      'jpeg',
                      'png',
                      'webp',
                    ],
                  });
                  if (picked) {
                    setUrl(picked.webUrl);
                    setName('VIP PDF');
                    setPendingFile(null);
                  }
                } catch (e) {
                  addToast(
                    e instanceof Error ? e.message : 'Picker failed to open.',
                    'error',
                  );
                } finally {
                  setPicking(false);
                }
              }}
              disabled={save.isPending || picking}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated disabled:opacity-50"
              title="Pick from SharePoint or OneDrive"
            >
              {picking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
