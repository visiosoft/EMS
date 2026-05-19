import type { AccountInfo } from "@azure/msal-browser";
import { getAccountEmail } from "@/auth/entra";

const DEFAULT_INTERNAL_HUB_EMAIL = [
  "safyan.ashraf",
  String.fromCharCode(64),
  "nkutechnologies.com",
].join("");

const configuredEmails = String(import.meta.env.VITE_INTERNAL_HUB_ALLOWED_EMAILS ?? DEFAULT_INTERNAL_HUB_EMAIL)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const INTERNAL_HUB_ALLOWED_EMAILS = new Set(configuredEmails);

export function normalizeAccessEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

export function canAccessInternalHub(accountOrEmail: AccountInfo | string | null | undefined): boolean {
  const email = typeof accountOrEmail === "string" ? accountOrEmail : getAccountEmail(accountOrEmail ?? null);
  return INTERNAL_HUB_ALLOWED_EMAILS.has(normalizeAccessEmail(email));
}
