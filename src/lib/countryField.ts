/**
 * Country / region names: letters (any script) and common punctuation, no digits
 * or symbols like @#%. Keep in sync with backend `address-fields.dto.ts` (@Matches).
 */
export const COUNTRY_NAME_PATTERN = /^[\p{L}\p{M}\s\-'.,]+$/u;

export function sanitizeCountryInput(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s\-'.,]/gu, '');
}

export function isValidCountryName(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && COUNTRY_NAME_PATTERN.test(t);
}

export const COUNTRY_NAME_FORMAT_USER_MESSAGE =
  'Use letters only, with optional spaces, hyphens, apostrophes, commas, or periods (no numbers or other symbols).';
