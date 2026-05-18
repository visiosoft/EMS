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
 * After Entra sign-in, send users to the app chooser unless they were
 * deep-linking into a specific app area.
 */
export function resolvePostLoginPath(from?: string | null): string {
  if (!from || !isSafeAppPath(from)) {
    return defaultSignedInPath();
  }

  if (from === INTERNAL_ROOT || from.startsWith(`${INTERNAL_ROOT}/`)) {
    return isInternalEnabled() ? from : defaultSignedInPath();
  }

  if (from === EMS_ROOT || from.startsWith("/ems")) {
    const emsPath = from === "/ems" ? EMS_ROOT : from;
    return isEmsEnabled() ? emsPath : defaultSignedInPath();
  }

  if (from === APP_CHOOSER_PATH || from.startsWith(`${APP_CHOOSER_PATH}/`)) {
    return isEmsEnabled() && isInternalEnabled() ? from : defaultSignedInPath();
  }

  return defaultSignedInPath();
}
