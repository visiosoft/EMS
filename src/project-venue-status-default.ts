const CREATE_PROJECT_TITLE = 'create project';
const VENUE_STATUS_LABEL = 'venue proposal status';
const PENDING_STATUS = 'Pending';
const PATCH_FLAG = '__iaeProjectVenuePendingDefaultInstalled';

type ProjectVenuePendingWindow = Window & typeof globalThis & {
  [PATCH_FLAG]?: boolean;
};

function normalizedText(node: Element | null | undefined): string {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findCreateProjectDialog(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
  return dialogs.find((dialog) => normalizedText(dialog).includes(CREATE_PROJECT_TITLE)) ?? null;
}

function findVenueStatusField(dialog: HTMLElement): HTMLElement | null {
  const labels = Array.from(dialog.querySelectorAll<HTMLElement>('label'));
  const label = labels.find((node) => normalizedText(node).includes(VENUE_STATUS_LABEL));
  return label?.parentElement ?? null;
}

function visuallyRemoveField(field: HTMLElement) {
  field.style.setProperty('display', 'none', 'important');
}

function clickPendingOption() {
  const options = Array.from(document.querySelectorAll<HTMLElement>('.select2-results__option'));
  const pending = options.find((option) => normalizedText(option) === PENDING_STATUS.toLowerCase());
  pending?.click();
}

function syncProjectVenueStatus() {
  const dialog = findCreateProjectDialog();
  if (!dialog) return;

  const field = findVenueStatusField(dialog);
  if (!field) return;

  visuallyRemoveField(field);

  const trigger = field.querySelector<HTMLButtonElement>('.select2-selection');
  if (trigger && !normalizedText(trigger).includes(PENDING_STATUS.toLowerCase()) && !trigger.disabled) {
    trigger.click();
    window.setTimeout(clickPendingOption, 0);
    window.setTimeout(clickPendingOption, 25);
    window.setTimeout(clickPendingOption, 100);
  }
}

function pendingVenuePayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.venues)) return body;
  return {
    ...record,
    venues: record.venues.map((venue) =>
      venue && typeof venue === 'object'
        ? { ...(venue as Record<string, unknown>), venueStatus: PENDING_STATUS }
        : venue,
    ),
  };
}

function installProjectCreatePayloadDefault() {
  if (typeof window === 'undefined') return;
  const patchedWindow = window as ProjectVenuePendingWindow;
  if (patchedWindow[PATCH_FLAG]) return;
  patchedWindow[PATCH_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestMethod = typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET';
    const method = String(init?.method ?? requestMethod ?? 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (method === 'POST' && /\/projects(?:\?|$)/.test(url) && typeof init?.body === 'string' && init.body.trim()) {
      try {
        const body = JSON.parse(init.body) as unknown;
        return originalFetch(input, {
          ...init,
          body: JSON.stringify(pendingVenuePayload(body)),
        });
      } catch {
        return originalFetch(input, init);
      }
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

function installProjectVenueStatusDefault() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installProjectCreatePayloadDefault();
  const run = () => syncProjectVenueStatus();
  run();
  const observer = new MutationObserver(() => run());
  observer.observe(document.body, { childList: true, subtree: true });
}

installProjectVenueStatusDefault();
