/**
 * Must match frontend `src/lib/countryField.ts` (COUNTRY_NAME_PATTERN).
 */
export const COUNTRY_NAME_REGEX = /^[\p{L}\p{M}\s\-'.,]+$/u;

export const COUNTRY_NAME_VALIDATION_MESSAGE =
  'Country may only contain letters, spaces, and - . , \' (no numbers or other symbols).';
