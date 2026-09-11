import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export interface DatePickerProps {
  value?: string;
  onChange?: (ymd: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  align?: 'start' | 'center' | 'end';
  invalid?: boolean;
  formatPattern?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select date',
  className,
  id,
  ariaLabel,
  align = 'end',
  invalid = false,
  formatPattern = 'MMM d, yyyy',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsedDate = React.useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const d = parseISO(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const displayDate = parsedDate ? format(parsedDate, formatPattern) : (value || placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? displayDate}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            'inline-flex h-9 min-w-[9.25rem] items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-text-primary shadow-sm transition-colors hover:bg-hover focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
            invalid
              ? 'border-ems-coral focus:border-ems-coral focus:ring-ems-coral/25'
              : 'border-border hover:border-ems-accent/30 focus:border-ems-accent focus:ring-ems-accent/30',
            className,
          )}
        >
          <span className="truncate">{displayDate}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-border bg-card shadow-lg" align={align}>
        <Calendar
          mode="single"
          selected={parsedDate}
          defaultMonth={parsedDate}
          onSelect={(day) => {
            if (day) {
              onChange?.(format(day, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
