import React from 'react';
import {
  PAGE_SIZE_OPTIONS_WITH_ALL,
  PAGE_SIZE_ALL,
  toPageSize,
  type PageSizeOption,
} from '@/lib/serverPagination';

type Props = {
  value: PageSizeOption;
  onChange: (next: PageSizeOption) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
};

const baseSelectCls =
  'min-w-[3.5rem] rounded-md border border-border bg-elevated py-1 pl-2 pr-7 text-xs font-medium ' +
  'text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-ems-accent/30 ' +
  'focus:border-ems-accent disabled:opacity-50 disabled:cursor-not-allowed ' +
  'cursor-pointer tabular-nums';

/**
 * Shown in datatable footers so users can pick 25 / 50 / 100 / 500 / All rows per page.
 */
export function PageSizeSelect({
  value,
  onChange,
  disabled,
  id,
  className = '',
  'aria-label': ariaLabel = 'Rows per page',
}: Props) {
  return (
    <select
      id={id}
      className={`${baseSelectCls} ${className}`.trim()}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === PAGE_SIZE_ALL ? PAGE_SIZE_ALL : toPageSize(Number(raw)));
      }}
    >
      {PAGE_SIZE_OPTIONS_WITH_ALL.map((v) => (
        <option key={String(v)} value={v}>
          {v === PAGE_SIZE_ALL ? 'All' : v}
        </option>
      ))}
    </select>
  );
}
