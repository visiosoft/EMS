import { EMS_ROOT, INTERNAL_ROOT } from "./paths";

const LAST_WORKSPACE_PATH_KEY = "iae:last-workspace-path";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function rememberWorkspacePath(path: string): void {
  if (!canUseLocalStorage()) return;
  if (path !== EMS_ROOT && path !== INTERNAL_ROOT) return;
  window.localStorage.setItem(LAST_WORKSPACE_PATH_KEY, path);
}

export function getRememberedWorkspacePath(): string | null {
  if (!canUseLocalStorage()) return null;
  const value = window.localStorage.getItem(LAST_WORKSPACE_PATH_KEY);
  return value === EMS_ROOT || value === INTERNAL_ROOT ? value : null;
}

export function clearRememberedWorkspacePath(): void {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(LAST_WORKSPACE_PATH_KEY);
}
