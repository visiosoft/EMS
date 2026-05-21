import type { AccountInfo } from "@azure/msal-browser";
import { canAccessCompanyHub, isEmsEnabled, isInternalEnabled } from "./appSuite";
import { APP_CHOOSER_PATH, EMS_ROOT, INTERNAL_ROOT } from "./paths";
import { getRememberedWorkspacePath } from "./workspacePreference";

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

function defaultSignedInPath(canUseCompanyHub: boolean): string {
  if (!canUseCompanyHub) {
    return EMS_ROOT;
  }

  const rememberedWorkspace = getRememberedWorkspacePath();

  if (rememberedWorkspace === INTERNAL_ROOT && isInternalEnabled()) {
    return INTERNAL_ROOT;
  }

  if (rememberedWorkspace === EMS_ROOT && isEmsEnabled()) {
    return EMS_ROOT;
  }

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
export function resolvePostLoginPath(from?: string | null, account?: AccountInfo | null): string {
  const canUseCompanyHub = isInternalEnabled() && canAccessCompanyHub(account);

  if (!from || !isSafeAppPath(from)) {
    return defaultSignedInPath(canUseCompanyHub);
  }

  if (from === INTERNAL_ROOT || from.startsWith(`${INTERNAL_ROOT}/`)) {
    return canUseCompanyHub ? INTERNAL_ROOT : EMS_ROOT;
  }

  if (from === EMS_ROOT || from.startsWith("/ems")) {
    const emsPath = from === "/ems" ? EMS_ROOT : from;
    return isEmsEnabled() ? emsPath : defaultSignedInPath(canUseCompanyHub);
  }

  if (from === APP_CHOOSER_PATH || from.startsWith(`${APP_CHOOSER_PATH}/`)) {
    return canUseCompanyHub && isEmsEnabled() && isInternalEnabled() ? from : EMS_ROOT;
  }

  return defaultSignedInPath(canUseCompanyHub);
}
