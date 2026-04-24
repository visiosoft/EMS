import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** Searchable options for phone country / area code (E.164). */
export const PHONE_COUNTRY_SELECT_OPTIONS: { value: string; label: string }[] =
  getCountries()
    .map((c) => ({
      value: c,
      label: `+${getCountryCallingCode(c)} — ${regionNames.of(c) ?? c}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'US';
