import { getActiveAccount, msalInstance } from '@/auth/entra';

/**
 * Minimal Microsoft Graph File Picker v8 wrapper.
 * Opens the SharePoint-hosted picker in a popup window and returns the
 * selected item's webUrl + display name. No files are downloaded — only the
 * cloud URL is stored.
 */

export interface PickedFile {
  webUrl: string;
  name: string;
}

export interface PickSharePointFileOptions {
  /** File extensions to allow (no leading dot). Defaults to common docs. */
  allowedExtensions?: string[];
  /** UI language, defaults to browser locale. */
  locale?: string;
}

interface PickerMessage {
  type: string;
  id?: string;
  data?: unknown;
  ports?: MessagePort[];
}

interface PickerCommand {
  command: string;
  resource?: string;
  items?: Array<{
    '@sharePoint.endpoint'?: string;
    webUrl?: string;
    name?: string;
    id?: string;
    sharepointIds?: { listItemUniqueId?: string };
  }>;
}

const DEFAULT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'txt',
];

/** Read the tenant root URL from Vite env, e.g. https://innovationae.sharepoint.com */
function getTenantUrl(): string {
  const raw = import.meta.env.VITE_SP_TENANT_URL as string | undefined;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      'VITE_SP_TENANT_URL is not configured. SharePoint picker unavailable.',
    );
  }
  return raw.replace(/\/$/, '');
}

/**
 * Optional entry-site URL, e.g. https://innovationae.sharepoint.com/sites/EMS.
 * Falls back to the tenant root site when unset. From `VITE_SP_SITE_URL`.
 */
function getEntrySiteUrl(tenantUrl: string): string {
  const raw = import.meta.env.VITE_SP_SITE_URL as string | undefined;
  if (raw && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, '');
  }
  return tenantUrl;
}

/** Extract the origin (scheme + host) from a full URL. */
function urlOrigin(u: string): string {
  return new URL(u).origin;
}

/** Request a SharePoint-audience access token for the picker to use. */
async function acquireSharePointToken(resourceUrl: string): Promise<string> {
  const account = getActiveAccount();
  if (!account) {
    throw new Error('You must be signed in to use the SharePoint picker.');
  }
  const scopes = [`${resourceUrl.replace(/\/$/, '')}/AllSites.Read`];
  try {
    const res = await msalInstance.acquireTokenSilent({ account, scopes });
    return res.accessToken;
  } catch {
    const res = await msalInstance.acquireTokenPopup({ account, scopes });
    return res.accessToken;
  }
}

/**
 * Opens the picker in a popup, waits for the user to select a file, and
 * resolves with `{ webUrl, name }`. Resolves with `null` when the user closes
 * without selecting anything.
 */
export async function pickSharePointFile(
  opts: PickSharePointFileOptions = {},
): Promise<PickedFile | null> {
  const tenantUrl = getTenantUrl();
  const entrySite = getEntrySiteUrl(tenantUrl);
  const pickerHost = urlOrigin(entrySite);
  const pickerUrl = `${entrySite}/_layouts/15/FilePicker.aspx`;
  const allowedExtensions = opts.allowedExtensions ?? DEFAULT_EXTENSIONS;

  // Open the popup synchronously so it isn't blocked.
  const popup = window.open(
    'about:blank',
    'sp-picker',
    'width=1080,height=680,left=100,top=100',
  );
  if (!popup) {
    throw new Error(
      'Popup was blocked. Allow popups for this site and try again.',
    );
  }

  let token: string;
  try {
    token = await acquireSharePointToken(pickerHost);
  } catch (e) {
    popup.close();
    throw e;
  }

  const channelId = crypto.randomUUID();
  const pickerOptions = {
    sdk: '8.0',
    entry: {
      // Open on the configured SharePoint site so the picker doesn't depend
      // on a provisioned OneDrive. Users can still navigate to OneDrive /
      // other libraries via the left rail pivots.
      sharePoint: {
        byPath: { web: entrySite },
      },
    },
    authentication: {},
    messaging: {
      origin: window.location.origin,
      channelId,
    },
    typesAndSources: {
      mode: 'files',
      pivots: {
        oneDrive: true,
        recent: true,
        sharedLibraries: true,
        search: true,
      },
      filters: allowedExtensions.map((ext) => `.${ext.replace(/^\./, '')}`),
    },
    selection: {
      mode: 'single',
    },
    locale: opts.locale ?? navigator.language,
  };

  // The picker reads `filePicker` from the URL query string and `access_token`
  // from the POST body. Combining them in a form body will silently fail
  // (picker never sees the messaging.origin field).
  const optionsQuery =
    'filePicker=' + encodeURIComponent(JSON.stringify(pickerOptions));
  const form = popup.document.createElement('form');
  form.setAttribute('action', `${pickerUrl}?${optionsQuery}`);
  form.setAttribute('method', 'POST');

  const tokenInput = popup.document.createElement('input');
  tokenInput.setAttribute('type', 'hidden');
  tokenInput.setAttribute('name', 'access_token');
  tokenInput.setAttribute('value', token);
  form.appendChild(tokenInput);

  popup.document.body.appendChild(form);
  form.submit();

  return new Promise<PickedFile | null>((resolve, reject) => {
    let port: MessagePort | null = null;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onWindowMessage);
      if (port) {
        try {
          port.close();
        } catch {
          /* noop */
        }
      }
      if (!popup.closed) popup.close();
    };

    const settle = (value: PickedFile | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onChannelMessage = async (event: MessageEvent<PickerMessage>) => {
      const msg = event.data;
      if (!port) return;
      if (msg.type === 'notification') {
        // No-op notifications; picker signals loading/errors here.
        return;
      }
      if (msg.type !== 'command') return;
      const cmd = msg.data as PickerCommand;

      if (cmd.command === 'authenticate') {
        try {
          // Picker tells us which resource it needs a token for (may be the
          // tenant SharePoint host, or the -my host if user navigates to
          // OneDrive from within the picker).
          const resource = cmd.resource ?? pickerHost;
          const fresh = await acquireSharePointToken(resource);
          port.postMessage({
            type: 'result',
            id: msg.id,
            data: { result: 'token', token: fresh },
          });
        } catch (e) {
          port.postMessage({
            type: 'result',
            id: msg.id,
            data: {
              result: 'error',
              error: {
                code: 'unableToObtainToken',
                message: e instanceof Error ? e.message : String(e),
              },
            },
          });
        }
        return;
      }

      if (cmd.command === 'pick') {
        const item = cmd.items?.[0];
        port.postMessage({
          type: 'result',
          id: msg.id,
          data: { result: 'success' },
        });
        if (item?.webUrl) {
          settle({ webUrl: item.webUrl, name: item.name ?? 'File' });
        } else {
          settle(null);
        }
        return;
      }

      if (cmd.command === 'close') {
        port.postMessage({
          type: 'result',
          id: msg.id,
          data: { result: 'success' },
        });
        settle(null);
        return;
      }

      // Unrecognized commands get a generic success ack so the picker
      // doesn't hang waiting for a reply.
      port.postMessage({
        type: 'result',
        id: msg.id,
        data: { result: 'success' },
      });
    };

    const onWindowMessage = (event: MessageEvent<PickerMessage>) => {
      // Only trust messages from the picker popup.
      if (event.source !== popup) return;
      const msg = event.data;
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'initialize' && (msg as { channelId?: string }).channelId === channelId) {
        port = event.ports?.[0] ?? null;
        if (!port) {
          fail(new Error('Picker did not provide a message port.'));
          return;
        }
        port.addEventListener('message', onChannelMessage);
        port.start();
        port.postMessage({ type: 'activate' });
      }
    };

    window.addEventListener('message', onWindowMessage);

    // Poll for user-initiated popup close.
    const pollClose = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(pollClose);
        settle(null);
      }
    }, 500);
  });
}

export function isSharePointPickerConfigured(): boolean {
  const raw = import.meta.env.VITE_SP_TENANT_URL as string | undefined;
  return !!raw && raw.trim().length > 0;
}
