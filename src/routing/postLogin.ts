import type { AccountInfo } from "@azure/msal-browser";
import { isEmsEnabled, isInternalEnabled } from "./appSuite";
import { APP_CHOOSER_PATH, EMS_ROOT, INTERNAL_ROOT } from "./paths";

/**
 * Only allow in-app relative paths (no protocol-relative or external URLs).
 */
export function isSafeAppPath(path: string): boolean {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  if (path.includes("://") || path.includes("\\")) {
    return false;
  }
  return true;
}

function defaultSignedInPath(): string {
  if (isEmsEnabled() && isInternalEnabled()) {
    return APP_CHOOSER_PATH;
  }
  if (isInternalEnabled()) {
    return INTERNAL_ROOT;
  }
  return EMS_ROOT;
}

/**
 * After Entra sign-in, always show the suite chooser. Users can then enter
 * EMS or the internal hub intentionally from one predictable starting point.
 */
export function resolvePostLoginPath(_from?: string | null, account?: AccountInfo | null): string {
  return account ? defaultSignedInPath() : EMS_ROOT;
}
