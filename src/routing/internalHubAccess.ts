import type { AccountInfo } from "@azure/msal-browser";
import { getAccountEmail } from "@/auth/entra";

export function normalizeAccessEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Any signed-in Entra user may use the Company Hub. */
export function canAccessInternalHub(accountOrEmail: AccountInfo | string | null | undefined): boolean {
  if (!accountOrEmail) return false;
  const email = typeof accountOrEmail === "string" ? accountOrEmail : getAccountEmail(accountOrEmail);
  return normalizeAccessEmail(email).length > 0;
}
