/** Any authenticated Entra user with an email may use Company Hub APIs. */
export function isInternalHubEmailAllowed(
  email: string | null | undefined,
): boolean {
  return String(email ?? '').trim().length > 0;
}
