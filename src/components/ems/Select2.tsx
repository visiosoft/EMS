import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { EmsModalBodyScrollElementRef } from './Primitives';

export interface Select2Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  rightText?: string;
  searchText?: string;
}

function optionSearchText(option: Select2Option): string {
  return [
    option.label,
    option.description,
    option.rightText,
    option.searchText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function Select2OptionContent({
  option,
  selected,
}: {
  option: Select2Option;
  selected: boolean;
}) {
  const secondaryClass = selected ? 'text-ems-accent/75' : 'text-text-muted';
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{option.label}</span>
        {option.description && (
          <span className={`mt-0.5 block truncate text-xs font-normal ${secondaryClass}`}>
            {option.description}
          </span>
        )}
      </span>
      {option.rightText && (
        <span className={`ml-3 shrink-0 text-xs font-normal ${secondaryClass}`}>
          {option.rightText}
        </span>
      )}
    </>
  );
}

function dedupeSelectOptions(options: Select2Option[]): Select2Option[] {
  const seen = new Set<string>();
  const out: Select2Option[] = [];
  for (const opt of options) {
    const valueKey = String(opt.value ?? '').trim().toLowerCase();
    const key = valueKey || String(opt.label ?? '').trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opt);
  }
  return out;
}

interface Select2Props {
  options: Select2Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  searchPlaceholder?: string;
  filterQuery?: string;
  onFilterChange?: (q: string) => void;
}

type ContactMultiKind = 'role' | 'department' | null;
type ContactAggregate = {
  roleIds: number[];
  departmentIds: number[];
};
type ContactRowLike = {
  contactId?: number;
  email?: string;
  roleId?: number;
  departmentId?: number;
};
type PatchedWindow = Window & typeof globalThis & {
  __iaeContactBridgeInstalled?: boolean;
  __iaeContactByEmail?: Record<string, ContactAggregate>;
};

const CONTACT_MULTI_STORAGE = {
  role: 'iae.contactDraft.roleIds',
  department: 'iae.contactDraft.departmentIds',
} as const;

function contactMultiKindFromOptions(options: Select2Option[]): ContactMultiKind {
  const firstLabel = String(options?.[0]?.label ?? '').trim().toLowerCase();
  if (firstLabel.includes('select role')) return 'role';
  if (firstLabel.includes('select department')) return 'department';
  return null;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function uniquePositiveInts(values: unknown[]): number[] {
  return Array.from(new Set(values.map(Number).filter((n) => Number.isInteger(n) && n > 0)));
}

function readStoredIds(kind: Exclude<ContactMultiKind, null>): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTACT_MULTI_STORAGE[kind]) || '[]') as unknown;
    return Array.isArray(parsed) ? uniquePositiveInts(parsed) : [];
  } catch {
    return [];
  }
}

function writeStoredIds(kind: Exclude<ContactMultiKind, null>, values: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONTACT_MULTI_STORAGE[kind], JSON.stringify(uniquePositiveInts(values)));
  } catch {
    /* ignore browser storage errors */
  }
}

function clearStoredIds() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.role);
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.department);
  } catch {
    /* ignore */
  }
}

function getContactEmailInputValue(): string {
  if (typeof document === 'undefined') return '';
  const inputs = Array.from(document.querySelectorAll('input[type="email"]')) as HTMLInputElement[];
  for (const input of inputs.reverse()) {
    const email = normalizeEmail(input.value);
    if (email) return email;
  }
  return '';
}

function rememberContactRows(rows: ContactRowLike[]) {
  if (typeof window === 'undefined') return;
  const w = window as PatchedWindow;
  const cache = { ...(w.__iaeContactByEmail ?? {}) };
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const current = cache[email] ?? { roleIds: [], departmentIds: [] };
    current.roleIds = uniquePositiveInts([...current.roleIds, row.roleId]);
    current.departmentIds = uniquePositiveInts([...current.departmentIds, row.departmentId]);
    cache[email] = current;
  }
  w.__iaeContactByEmail = cache;
}

function installContactBridge() {
  if (typeof window === 'undefined') return;
  const w = window as PatchedWindow;
  if (w.__iaeContactBridgeInstalled) return;
  w.__iaeContactBridgeInstalled = true;
  const originalFetch = w.fetch.bind(w);

  w.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestMethod = typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET';
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = String(init?.method ?? requestMethod ?? 'GET').toUpperCase();

    if (method === 'POST' && /\/companies\/\d+\/contacts(?:\?|$)/.test(url) && !/\/contacts\/bulk(?:\?|$)/.test(url)) {
      const roleIds = readStoredIds('role');
      const departmentIds = readStoredIds('department');
      if (roleIds.length > 1 || departmentIds.length > 1) {
        try {
          const body = typeof init?.body === 'string' && init.body.trim() ? JSON.parse(init.body) as Record<string, unknown> : {};
          const bulkUrl = url.replace(/\/contacts(\?|$)/, '/contacts/bulk$1');
          const response = await originalFetch(bulkUrl, {
            ...init,
            body: JSON.stringify({ ...body, roleIds, departmentIds }),
          });
          clearStoredIds();
          return response;
        } catch {
          /* fall back to the original request */
        }
      }
    }

    const response = await originalFetch(input, init);
    if (method === 'GET' && response.ok && (response.headers.get('content-type') ?? '').includes('application/json')) {
      try {
        const data = await response.clone().json();
        if (/\/companies\/\d+\/contacts(?:\?|$)/.test(url) && Array.isArray(data)) {
          rememberContactRows(data as ContactRowLike[]);
        }
        if (/\/companies\/\d+\/contacts\/linked-venues(?:\?|$)/.test(url) && Array.isArray(data)) {
          for (const section of data as { contacts?: ContactRowLike[] }[]) {
            rememberContactRows(Array.isArray(section.contacts) ? section.contacts : []);
          }
        }
      } catch {
        /* keep the original response */
      }
    }
    return response;
  }) as typeof fetch;
}

function useMenuPosition(open: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
  const modalBodyScrollElementRef = useContext(EmsModalBodyScrollElementRef);

  const updateMenuPosition = useCallback(() => {
    if (!open || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const needHeight = 300;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < needHeight && r.top > needHeight;
    setMenuStyle({
      position: 'fixed',
      left: r.left,
      width: r.width,
      minWidth: r.width,
      zIndex: 2000,
      maxHeight: 'min(360px, 80dvh)',
      ...(openUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, [containerRef, open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    const scrollHost = modalBodyScrollElementRef?.current;
    scrollHost?.addEventListener('scroll', onReposition, { passive: true });
    const tick = window.setInterval(onReposition, 100);
    return () => {
      window.removeEventListener('resize', onReposition);
      scrollHost?.removeEventListener('scroll', onReposition);
      window.clearInterval(tick);
    };
  }, [modalBodyScrollElementRef, open, updateMenuPosition]);

  return menuStyle;
}

export function Select2({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  allowClear = false,
  searchPlaceholder = 'Search...',
  filterQuery,
  onFilterChange,
}: Select2Props) {
  useEffect(installContactBridge, []);
  const optionsSafe = useMemo(
    () => dedupeSelectOptions(options ?? []),
    [options],
  );
  const contactMultiKind = contactMultiKindFromOptions(optionsSafe);
  const contactMultiMode = contactMultiKind != null;
  const visibleOptions = contactMultiMode ? optionsSafe.filter((o) => o.value !== '') : optionsSafe;
  const parentFiltersOptions = onFilterChange != null;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(() => contactMultiMode && value ? [value] : []);
  const initializedContactMultiKeyRef = useRef('');
  const userEditedContactMultiRef = useRef(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuStyle = useMenuPosition(open, containerRef);

  const displayFilter = parentFiltersOptions ? (filterQuery ?? '') : search;
  const selected = visibleOptions.find((o) => o.value === value);
  const filtered = parentFiltersOptions
    ? visibleOptions
    : visibleOptions.filter((o) => optionSearchText(o).includes(String(search ?? '').toLowerCase()));

  useEffect(() => {
    if (!contactMultiMode || !contactMultiKind) return;
    if (userEditedContactMultiRef.current) return;
    const email = getContactEmailInputValue();
    const cache = typeof window !== 'undefined' ? (window as PatchedWindow).__iaeContactByEmail ?? {} : {};
    const cached = email ? cache[email] : undefined;
    const cachedIds = contactMultiKind === 'role' ? cached?.roleIds : cached?.departmentIds;
    const fromCache = (cachedIds ?? []).map((n) => String(n)).filter((id) => visibleOptions.some((o) => o.value === id));
    const next = fromCache.length > 0 ? fromCache : value ? [value] : [];
    const initKey = `${contactMultiKind}:${email}:${fromCache.join('|')}:${visibleOptions.map((o) => o.value).join(',')}`;
    if (initializedContactMultiKeyRef.current === initKey) return;
    initializedContactMultiKeyRef.current = initKey;
    setSelectedValues(next);
    writeStoredIds(contactMultiKind, next);
    if (next[0] && next[0] !== value) onChange(next[0]);
  }, [contactMultiKind, contactMultiMode, onChange, value, visibleOptions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      if (!parentFiltersOptions) setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [parentFiltersOptions]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
      setHighlightedIndex(filtered.findIndex((o) => o.value === value));
    }
  }, [filtered, open, value]);

  useEffect(() => {
    const list = listRef.current;
    if (highlightedIndex < 0 || !list) return;
    const item = list.children[highlightedIndex] as HTMLElement | undefined;
    if (!item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) list.scrollTop += itemRect.top - listRect.top;
    else if (itemRect.bottom > listRect.bottom) list.scrollTop += itemRect.bottom - listRect.bottom;
  }, [highlightedIndex]);

  useEffect(() => {
    if (contactMultiKind) writeStoredIds(contactMultiKind, selectedValues);
  }, [contactMultiKind, selectedValues]);

  const setContactMulti = useCallback((next: string[]) => {
    const clean = Array.from(new Set(next.filter(Boolean)));
    userEditedContactMultiRef.current = true;
    setSelectedValues(clean);
    onChange(clean[0] ?? '');
  }, [onChange]);

  const handleSelect = useCallback((optValue: string) => {
    if (contactMultiMode) {
      setContactMulti(selectedValues.includes(optValue) ? selectedValues.filter((v) => v !== optValue) : [...selectedValues, optValue]);
      return;
    }
    onChange(optValue);
    setOpen(false);
    if (!parentFiltersOptions) setSearch('');
  }, [contactMultiMode, onChange, parentFiltersOptions, selectedValues, setContactMulti]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      if (!parentFiltersOptions) setSearch('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) handleSelect(filtered[highlightedIndex].value);
    }
  }, [filtered, handleSelect, highlightedIndex, open, parentFiltersOptions]);

  const summary = contactMultiMode
    ? (() => {
        const labels = selectedValues
          .map((v) => visibleOptions.find((o) => o.value === v)?.label ?? '')
          .filter((label) => label.trim().length > 0);
        return labels.length === 0 ? placeholder : labels.join(', ');
      })()
    : selected
      ? selected.label
      : placeholder;

  const dropdown = open && menuStyle && (
    <div ref={menuRef} className="select2-dropdown bg-elevated border border-border rounded-md shadow-xl overflow-hidden w-full" style={menuStyle}>
      <div className="select2-search p-2 border-b border-border">
        <div className="relative min-w-0 cursor-text">
          <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-text-muted text-xs select-none">⌕</span>
          <input
            ref={searchRef}
            type="text"
            value={displayFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (parentFiltersOptions) onFilterChange!(v);
              else setSearch(v);
              setHighlightedIndex(0);
            }}
            placeholder={searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="select2-search__field w-full min-w-0 cursor-text pl-7 pr-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/30"
          />
        </div>
      </div>
      <ul ref={listRef} role="listbox" className="select2-results max-h-[min(280px,50vh)] overflow-y-auto py-1">
        {allowClear && !contactMultiMode && (
          <li role="option" aria-selected={value === ''} onClick={() => handleSelect('')} className={`select2-results__option px-3 py-2 text-sm cursor-pointer transition-colors text-text-muted italic ${value === '' ? 'bg-ems-accent-dim text-ems-accent' : 'hover:bg-hover'}`}>{placeholder}</li>
        )}
        {filtered.length === 0 ? (
          <li className="select2-results__option px-3 py-2 text-sm text-text-muted text-center">{visibleOptions.length > 0 ? 'No results found' : 'No options available'}</li>
        ) : filtered.map((opt, idx) => {
          const isSelected = contactMultiMode ? selectedValues.includes(opt.value) : opt.value === value;
          return (
            <li
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              aria-disabled={opt.disabled}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={[
                'select2-results__option flex items-start gap-1.5 px-3 py-2 text-sm transition-colors select-none',
                opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isSelected ? 'select2-results__option--selected bg-ems-accent-dim text-ems-accent font-medium' : idx === highlightedIndex ? 'select2-results__option--highlighted bg-hover text-text-primary' : 'text-text-primary hover:bg-hover',
              ].filter(Boolean).join(' ')}
            >
              <span className="mt-0.5 inline-block w-3 shrink-0 text-center text-xs text-ems-accent">
                {isSelected ? '✓' : ''}
              </span>
              <Select2OptionContent option={opt} selected={isSelected} />
            </li>
          );
        })}
      </ul>
      {contactMultiMode && (
        <div className="border-t border-border px-3 py-2 text-[11px] text-text-muted bg-surface/60">
          Select every applicable {contactMultiKind === 'role' ? 'role' : 'department'}; each role and department combination will be saved.
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`select2 relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        className={[
          'select2-selection w-full flex items-center justify-between gap-2 bg-surface border border-border rounded px-3 py-1.5 text-sm text-left transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-ems-accent/60',
          open ? 'border-ems-accent ring-1 ring-ems-accent/30' : '',
        ].filter(Boolean).join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`min-w-0 flex-1 truncate ${contactMultiMode ? (selectedValues.length ? 'text-text-primary' : 'text-text-muted') : (selected ? 'text-text-primary' : 'text-text-muted')}`}>{summary}</span>
        <span className="select2-arrow ml-2 flex-shrink-0 text-text-muted transition-transform duration-150" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 10 }}>▼</span>
      </button>
      {open && menuStyle && typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}

export function toOptions(items: string[]): Select2Option[] {
  return items.map((v) => ({ value: v, label: v }));
}

export function toObjOptions<T extends { id: string }>(items: T[], labelFn: (item: T) => string): Select2Option[] {
  return items.map((item) => ({ value: item.id, label: labelFn(item) }));
}

interface Select2MultiProps {
  options: Select2Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select2Multi({ options, values, onChange, placeholder = 'Select...', className = '', disabled = false }: Select2MultiProps) {
  const optionsSafe = useMemo(
    () => dedupeSelectOptions(options ?? []),
    [options],
  );
  const valuesSafe = values ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuStyle = useMenuPosition(open, containerRef);
  const filtered = useMemo(() => optionsSafe.filter((o) => optionSearchText(o).includes(search.toLowerCase())), [optionsSafe, search]);
  const summary = (() => {
    const labels = valuesSafe
      .map((v) => optionsSafe.find((o) => o.value === v)?.label ?? '')
      .filter((label) => label.trim().length > 0);
    return labels.length === 0 ? placeholder : labels.join(', ');
  })();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => { if (open && searchRef.current) searchRef.current.focus(); }, [open]);

  const toggle = (v: string) => {
    if (disabled) return;
    if (valuesSafe.includes(v)) onChange(valuesSafe.filter((x) => x !== v));
    else onChange([...valuesSafe, v]);
  };

  const dropdown = open && menuStyle && (
    <div ref={menuRef} className="select2-dropdown bg-elevated border border-border rounded-md shadow-xl overflow-hidden w-full" style={menuStyle}>
      <div className="select2-search p-2 border-b border-border">
        <div className="relative min-w-0 cursor-text">
          <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-text-muted text-xs select-none">⌕</span>
          <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." autoComplete="off" spellCheck={false} className="select2-search__field w-full min-w-0 cursor-text pl-7 pr-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ems-accent focus:ring-1 focus:ring-ems-accent/30" />
        </div>
      </div>
      <ul role="listbox" className="select2-results max-h-[min(280px,50vh)] overflow-y-auto py-1">
        {filtered.length === 0 ? <li className="select2-results__option px-3 py-2 text-sm text-text-muted text-center">No results found</li> : filtered.map((opt) => {
          const selected = valuesSafe.includes(opt.value);
          return (
            <li key={opt.value} role="option" aria-selected={selected} aria-disabled={opt.disabled} onClick={() => !opt.disabled && toggle(opt.value)} className={['select2-results__option flex items-start gap-1.5 px-3 py-2 text-sm transition-colors select-none', opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer', selected ? 'bg-ems-accent-dim text-ems-accent font-medium' : 'text-text-primary hover:bg-hover'].filter(Boolean).join(' ')}>
              <span className="mt-0.5 inline-block w-3 shrink-0 text-center text-xs text-ems-accent">{selected ? '✓' : ''}</span>
              <Select2OptionContent option={opt} selected={selected} />
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} className={`select2 relative ${className}`}>
      <button type="button" disabled={disabled} onClick={() => { if (!disabled) setOpen((o) => !o); }} className={['select2-selection w-full flex items-center justify-between gap-2 bg-surface border border-border rounded px-3 py-1.5 text-sm text-left transition-colors', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-ems-accent/60', open ? 'border-ems-accent ring-1 ring-ems-accent/30' : ''].filter(Boolean).join(' ')} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`min-w-0 flex-1 truncate ${valuesSafe.length === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{summary}</span>
        <span className="select2-arrow ml-2 flex-shrink-0 text-text-muted transition-transform duration-150" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: 10 }}>▼</span>
      </button>
      {open && menuStyle && typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}
