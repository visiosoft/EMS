const PENDING_STATUS = 'Pending';
const CREATE_PROJECT_TITLE = 'Create Project';
const VENUES_STEP_TEXT = 'STEP 6 OF 7';
const VENUE_STATUS_LABEL = 'Venue proposal status';
const PATCH_FLAG = '__iaeProjectVenuePendingDefaultInstalled';
const HIDE_TIMER_FLAG = '__iaeProjectVenueStatusHideTimer';

type ProjectVenuePendingWindow = Window & typeof globalThis & {
  [PATCH_FLAG]?: boolean;
  [HIDE_TIMER_FLAG]?: number;
};

function textOf(node: Element | null | undefined): string {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function lowerTextOf(node: Element | null | undefined): string {
  return textOf(node).toLowerCase();
}

function findVisibleCreateProjectDialog(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((dialog) =>
      lowerTextOf(dialog.querySelector('h1,h2,h3,[data-dialog-title],.dialog-title')).includes(
        CREATE_PROJECT_TITLE.toLowerCase(),
      ) || lowerTextOf(dialog).startsWith(CREATE_PROJECT_TITLE.toLowerCase()),
    ) ?? null
  );
}

function isVenuesStep(dialog: HTMLElement): boolean {
  const stepText = textOf(dialog);
  return stepText.includes(VENUES_STEP_TEXT) || /\bVenues\b/.test(stepText);
}

function findVenueProposalField(dialog: HTMLElement): HTMLElement | null {
  const label = Array.from(dialog.querySelectorAll<HTMLElement>('label')).find((node) =>
    textOf(node).toLowerCase().includes(VENUE_STATUS_LABEL.toLowerCase()),
  );
  return label?.parentElement ?? null;
}

function hideVenueProposalFieldIfPresent() {
  if (typeof document === 'undefined') return;
  const dialog = findVisibleCreateProjectDialog();
  if (!dialog || !isVenuesStep(dialog)) return;
  const field = findVenueProposalField(dialog);
  if (!field) return;
  field.style.setProperty('display', 'none', 'important');
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

  const patchedWindow = window as ProjectVenuePendingWindow;
  if (patchedWindow[HIDE_TIMER_FLAG]) return;

  // Do not use a body-wide MutationObserver here. The project wizard can render
  // hundreds of DMA/venue nodes, and scanning the whole dialog on every mutation
  // burns CPU while moving from Markets to Venues. A light timer is enough and
  // only does work when the Create Project modal is actually on the Venues step.
  hideVenueProposalFieldIfPresent();
  patchedWindow[HIDE_TIMER_FLAG] = window.setInterval(hideVenueProposalFieldIfPresent, 500);
}

installProjectVenueStatusDefault();
