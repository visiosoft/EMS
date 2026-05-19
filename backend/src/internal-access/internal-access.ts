const DEFAULT_ALLOWED_INTERNAL_HUB_EMAIL = [
  'safyan.ashraf',
  String.fromCharCode(64),
  'nkutechnologies.com',
].join('');

export function getAllowedInternalHubEmails(): Set<string> {
  const configured = process.env.INTERNAL_HUB_ALLOWED_EMAILS ?? DEFAULT_ALLOWED_INTERNAL_HUB_EMAIL;
  return new Set(
    configured
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isInternalHubEmailAllowed(email: string | null | undefined): boolean {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  return normalizedEmail.length > 0 && getAllowedInternalHubEmails().has(normalizedEmail);
}
