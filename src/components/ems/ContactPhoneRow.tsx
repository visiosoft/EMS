import React, { useId } from 'react';
import { AsYouType, type CountryCode } from 'libphonenumber-js';
import { FormField } from './Primitives';
import { Select2 } from './Select2';
import {
  PHONE_COUNTRY_SELECT_OPTIONS,
  DEFAULT_PHONE_COUNTRY,
} from '@/lib/contactPhoneOptions';
import { parsePhoneFieldValue } from '@/lib/contactPhoneField';

const inputCls =
  'w-full min-w-0 flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent [font-variant-lining-nums:tabular-nums]';

const selectWrap = 'w-[min(20rem,100%)] sm:w-56 shrink-0';

type Props = {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  id?: string;
  country: CountryCode;
  display: string;
  onCountry: (c: CountryCode) => void;
  onDisplay: (display: string) => void;
};

/**
 * Country calling-code dropdown + AsYouType national number field (E.164 workflow).
 */
export function ContactPhoneRow({
  label,
  required,
  optional,
  error,
  id: idProp,
  country,
  display,
  onCountry,
  onDisplay,
}: Props) {
  const uid = useId();
  const id = idProp ?? uid;
  return (
    <FormField
      label={label}
      required={required}
      optional={optional}
      error={error}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
        <div className={selectWrap}>
          <Select2
            options={PHONE_COUNTRY_SELECT_OPTIONS}
            value={country}
            onChange={(v) => {
              onCountry((v as CountryCode) || DEFAULT_PHONE_COUNTRY);
              onDisplay('');
            }}
            searchPlaceholder="Search by country or +code…"
            placeholder="Country / code"
          />
        </div>
        <input
          id={id}
          type="tel"
          className={inputCls}
          inputMode="tel"
          autoComplete="tel-national"
          value={display}
          placeholder="Phone number"
          onChange={(e) => {
            const a = new AsYouType(country);
            onDisplay(a.input(e.target.value));
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').trim();
            if (t.startsWith('+')) {
              e.preventDefault();
              const p = parsePhoneFieldValue(t, country);
              onCountry(p.country);
              onDisplay(p.display);
            }
          }}
          aria-invalid={error ? 'true' : undefined}
        />
      </div>
    </FormField>
  );
}
