import { Cloud, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { deriveLinkFieldName, extractLinkDisplayName, withLinkDisplayName } from '@/lib/linkDisplayName';
import {
  isSharePointPickerConfigured,
  pickSharePointFile,
} from '@/lib/msGraphFilePicker';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:opacity-50';

export interface LinkFieldValue {
  /** Existing URL (or blob-preview URL) shown to the user. */
  url: string | null;
  /** Existing display name. */
  name: string | null;
  /** Pending file (chosen but not yet uploaded). */
  pendingFile?: File | null;
}

interface Props {
  /** Field label shown above the input. */
  label: string;
  /** Placeholder used when the URL is empty. */
  placeholder?: string;
  value: LinkFieldValue;
  onChange: (v: LinkFieldValue) => void;
  /** File input `accept` attribute (defaults to common docs + images). */
  accept?: string;
  disabled?: boolean;
  /** Show remove button when value has content. */
  onRemove?: () => void;
  /** Read-only view (used outside of edit mode). */
  readOnly?: boolean;
  /** Optional helper caption. */
  helperText?: string;
}

/**
 * Compact link-or-upload editor used across the Tour Profile tabs.
 * Display name is auto-filled from the field label (or the uploaded file's
 * original name) and is not user-editable.
 */
export function LinkOrUploadField({
  label,
  placeholder,
  value,
  onChange,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt',
  disabled,
  onRemove,
  readOnly,
  helperText,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const spConfigured = isSharePointPickerConfigured();
  // The visible field label can be verbose (e.g. "Link to PDF of X") — show the short form as the link name.
  const autoName = value.name ?? deriveLinkFieldName(label);
  const hasAny =
    !!(value.url && value.url.trim().length > 0) || value.pendingFile != null;

  if (readOnly) {
    return (
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        {value.url ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-sm">
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ems-accent hover:text-ems-accent/80 hover:underline"
            >
              {value.name || deriveLinkFieldName(label)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="mt-0.5 text-sm text-text-muted">—</div>
        )}
        {helperText && (
          <p className="mt-1 text-xs text-text-muted italic">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_auto] gap-2">
        <div
          className={inputCls + ' cursor-not-allowed bg-elevated/60 truncate min-w-0'}
          role="textbox"
          aria-readonly="true"
          aria-label="Display name (auto-filled)"
          title={autoName}
        >
          {autoName}
        </div>
        <input
          type="text"
          className={inputCls + ' min-w-0'}
          value={
            value.pendingFile
              ? value.pendingFile.name
              : !value.url
                ? ''
                : isFocused
                  ? value.url
                  : extractLinkDisplayName(value.url)
          }
          onChange={(e) =>
            onChange({
              ...value,
              url: e.target.value,
              /** Keep name in sync with the label so backend stores a clean name. */
              name: deriveLinkFieldName(label),
              pendingFile: null,
            })
          }
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder ?? 'https://…'}
          disabled={disabled || !!value.pendingFile}
          title={value.url ?? undefined}
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                onChange({ ...value, pendingFile: f, url: null, name: deriveLinkFieldName(label) });
              }
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated disabled:opacity-50"
            title="Upload file from your computer"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          {spConfigured && (
            <button
              type="button"
              onClick={async () => {
                setPicking(true);
                try {
                  const picked = await pickSharePointFile({
                    allowedExtensions: (accept || '')
                      .split(',')
                      .map((s) => s.trim().replace(/^\./, ''))
                      .filter(Boolean),
                  });
                  if (picked) {
                    onChange({
                      ...value,
                      url: withLinkDisplayName(picked.webUrl, picked.name),
                      name: deriveLinkFieldName(label),
                      pendingFile: null,
                    });
                  }
                } catch (e) {
                  window.alert(
                    e instanceof Error ? e.message : 'Picker failed to open.',
                  );
                } finally {
                  setPicking(false);
                }
              }}
              disabled={disabled || picking}
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
          {hasAny && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-text-muted hover:text-ems-coral hover:border-ems-coral/50 disabled:opacity-50"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {value.url && (
        <div className="text-xs">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ems-accent hover:text-ems-accent/80"
          >
            Open current link
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      {helperText && (
        <p className="text-xs text-text-muted italic">{helperText}</p>
      )}
    </div>
  );
}
