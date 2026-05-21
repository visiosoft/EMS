import type { AccountInfo } from "@azure/msal-browser";
import { getAccountEmail } from "@/auth/entra";

/**
 * Controls which front-end modules are registered at runtime.
 *
 * **Default (production today):** omit `VITE_APP_SUITE` or set `all`.
 * One build, one deploy — EMS (`/`) and Company Hub (`/internal`) ship together.
 *
 * **Future split deploy (optional):** set `VITE_APP_SUITE=ems` or `internal` at build time
 * to produce a bundle for a single domain. Same repo, same API/DB; only route registration changes.
 */
export type AppSuite = "all" | "ems" | "internal";

const raw = (import.meta.env.VITE_APP_SUITE ?? "all").trim().toLowerCase();

export const appSuite: AppSuite =
  raw === "ems" || raw === "internal" ? raw : "all";

const companyHubOwnerEmail = ["safyan.ashraf", "nkutechnologies.com"].join("@");

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function canAccessCompanyHub(account: AccountInfo | null | undefined): boolean {
  return normalizeEmail(getAccountEmail(account)) === companyHubOwnerEmail;
}

export function isEmsEnabled(): boolean {
  return appSuite === "all" || appSuite === "ems";
}

export function isInternalEnabled(): boolean {
  return appSuite === "all" || appSuite === "internal";
}
