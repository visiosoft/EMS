const CREATE_PROJECT_TITLE = 'create project';
const VENUE_STATUS_LABEL = 'venue proposal status';
const PENDING_STATUS = 'Pending';

function normalizedText(node: Element | null | undefined): string {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findCreateProjectDialog(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
  return dialogs.find((dialog) => normalizedText(dialog).includes(CREATE_PROJECT_TITLE)) ?? null;
}

function findVenueStatusField(dialog: HTMLElement): HTMLElement | null {
  const labels = Array.from(dialog.querySelectorAll<HTMLElement>('label'));
  const label = labels.find((node) => normalizedText(node) === VENUE_STATUS_LABEL);
  return label?.parentElement ?? null;
}

function visuallyRemoveField(field: HTMLElement) {
  field.style.position = 'absolute';
  field.style.width = '1px';
  field.style.height = '1px';
  field.style.margin = '0';
  field.style.padding = '0';
  field.style.overflow = 'hidden';
  field.style.opacity = '0';
  field.style.pointerEvents = 'none';
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

  const trigger = field.querySelector<HTMLButtonElement>('.select2-selection');
  if (trigger && !normalizedText(trigger).includes(PENDING_STATUS.toLowerCase()) && !trigger.disabled) {
    trigger.click();
    window.setTimeout(clickPendingOption, 0);
    window.setTimeout(clickPendingOption, 40);
  }

  visuallyRemoveField(field);
}

function installProjectVenueStatusDefault() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const run = () => syncProjectVenueStatus();
  run();
  const observer = new MutationObserver(() => run());
  observer.observe(document.body, { childList: true, subtree: true });
}

installProjectVenueStatusDefault();
