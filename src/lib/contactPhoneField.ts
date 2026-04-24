import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';
import { DEFAULT_PHONE_COUNTRY } from './contactPhoneOptions';

export const PHONE_INVALID_MESSAGE =
  'Enter a valid phone number with country code, or leave the field empty.';

/**
 * Parse stored value (E.164, or legacy national) into country + AsYouType display string.
 */
export function parsePhoneFieldValue(
  raw: string | undefined | null,
  fallbackCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): { country: CountryCode; display: string } {
  const t = (raw ?? '').trim();
  if (!t) {
    return { country: fallbackCountry, display: '' };
  }
  if (t.startsWith('+')) {
    try {
      const p = parsePhoneNumber(t);
      const a = new AsYouType(p.country);
      return { country: p.country, display: a.input(p.nationalNumber) };
    } catch {
      return { country: fallbackCountry, display: t };
    }
  }
  try {
    const p = parsePhoneNumber(t, fallbackCountry);
    const a = new AsYouType(p.country);
    return { country: p.country, display: a.input(p.nationalNumber) };
  } catch {
    return { country: fallbackCountry, display: t };
  }
}

/** Returns E.164 if the current input is a complete valid number, otherwise empty string. */
export function tryE164FromDisplay(
  display: string,
  country: CountryCode,
): string {
  const t = (display || '').trim();
  if (!t) return '';
  const a = new AsYouType(country);
  a.input(t);
  const n = a.getNumber();
  if (!n) return '';
  const e164 = n.format('E.164');
  return isValidPhoneNumber(e164) ? e164 : '';
}
