import { Cloud, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { deriveLinkFieldName, extractLinkDisplayName, withLinkDisplayName } from '@/lib/linkDisplayName';
import {
  isSharePointPickerConfigured,
  pickSharePointFile,
} from '@/lib/msGraphFilePicker';

const DEFAULT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt';
const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ems-accent disabled:cursor-not-allowed disabled:opacity-60';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  accept?: string;
  onError?: (message: string) => void;
  showOpenLink?: boolean;
  showFileActions?: boolean;
  hideLabel?: boolean;
  showLinkName?: boolean;
}

export function SystemLinkField({
  label,
  value,
  onChange,
  disabled,
  placeholder = 'https://... or upload a file from SharePoint',
  accept = DEFAULT_ACCEPT,
  onError,
  showOpenLink = true,
  showFileActions = true,
  hideLabel = false,
  showLinkName = true,
}: Props) {
  const [busy, setBusy] = useState<'sharepoint' | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  // The visible field label can be verbose (e.g. "Link to PDF of X") — show the short form as the link name.
  const linkName = deriveLinkFieldName(label);
  // Show a friendly file name when idle; reveal the raw URL only while editing.
  const displayValue = isFocused ? value : value.trim() ? extractLinkDisplayName(value) : '';

  const reportError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unable to select file.';
    if (onError) onError(message);
    else window.alert(message);
  };

  const allowedExtensions = accept
    .split(',')
    .map((item) => item.trim().replace(/^\./, ''))
    .filter(Boolean);

  return (
    <div className="space-y-1.5">
      {!hideLabel && (
        <label className="block text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className={`grid min-w-0 grid-cols-1 gap-2 ${showLinkName ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_auto]'}`}>
        {showLinkName && (
          <div
            className="flex h-[38px] w-full min-w-0 self-start items-center truncate rounded-md border border-border bg-elevated/60 px-3 py-2 text-sm text-text-primary cursor-not-allowed"
            role="textbox"
            aria-readonly="true"
            aria-label={`${linkName} link name`}
            title={linkName}
          >
            {linkName}
          </div>
        )}
        <div className={`min-w-0 ${showLinkName ? '' : 'sm:col-start-1'}`}>
          <input
            type="text"
            className={inputClass}
            value={displayValue}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || busy !== null}
            placeholder={placeholder}
            title={value.trim() || undefined}
          />
          {showOpenLink && value.trim() && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-ems-accent hover:text-ems-accent/80 hover:underline"
              title="Open current link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open current link
            </a>
          )}
        </div>
        {showFileActions && (
        <div className={`flex min-w-0 flex-wrap items-start gap-1 self-start lg:flex-nowrap ${showLinkName ? 'sm:col-start-2 sm:col-span-1 lg:col-start-3 lg:col-span-1' : 'sm:col-start-2 sm:col-span-1'}`}>
          {isSharePointPickerConfigured() && (
            <button
              type="button"
              onClick={async () => {
                setBusy('sharepoint');
                try {
                  const selected = await pickSharePointFile({ allowedExtensions });
                  if (selected) onChange(withLinkDisplayName(selected.webUrl, selected.name));
                } catch (error) {
                  reportError(error);
                } finally {
                  setBusy(null);
                }
              }}
              disabled={disabled || busy !== null}
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-50"
              title="Select file from SharePoint"
            >
              {busy === 'sharepoint' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}