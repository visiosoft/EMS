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
type ContactRowLike = {
  contactAssignmentId?: number;
  contactId?: number;
  contactInfoId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string | null;
  workPhone?: string | null;
  roleId?: number;
  roleName?: string;
  departmentId?: number;
  departmentName?: string;
};
type ContactAggregate = { roles: string[]; departments: string[] };
type PatchedWindow = Window & typeof globalThis & {
  __iaeContactBridgeInstalled?: boolean;
  __iaeContactDomPatchInstalled?: boolean;
  __iaeContactByEmail?: Record<string, ContactAggregate>;
  __iaeContactObserver?: MutationObserver;
};

const CONTACT_CELL_SEPARATOR = ' ⁞ ';
const CONTACT_MULTI_STORAGE: Record<Exclude<ContactMultiKind, null>, string> = {
  role: 'iae.contactDraft.roleIds',
  department: 'iae.contactDraft.departmentIds',
};

function contactMultiKindFromOptions(options: Select2Option[]): ContactMultiKind {
  const firstLabel = String(options?.[0]?.label ?? '').trim().toLowerCase();
  if (firstLabel.includes('select role')) return 'role';
  if (firstLabel.includes('select department')) return 'department';
  return null;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function uniquePush(list: string[], value: unknown) {
  const text = normalizeText(value);
  if (text && !list.some((x) => x.toLowerCase() === text.toLowerCase())) list.push(text);
}

function splitContactCellText(text: string): string[] {
  return text
    .split(CONTACT_CELL_SEPARATOR)
    .flatMap((part) => part.split(/\s*,\s*/))
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, idx, arr) => arr.findIndex((x) => x.toLowerCase() === part.toLowerCase()) === idx);
}

function readStoredIds(kind: Exclude<ContactMultiKind, null>): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CONTACT_MULTI_STORAGE[kind]);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map(Number).filter((n) => Number.isInteger(n) && n > 0)));
  } catch {
    return [];
  }
}

function writeContactMulti(kind: Exclude<ContactMultiKind, null>, values: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONTACT_MULTI_STORAGE[kind],
      JSON.stringify(values.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)),
    );
  } catch {
    /* ignore localStorage failures */
  }
}

function clearContactMultiDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.role);
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.department);
  } catch {
    /* ignore */
  }
}

function cacheContactAggregates(rows: ContactRowLike[]) {
  if (typeof window === 'undefined') return;
  const w = window as PatchedWindow;
  const cache = { ...(w.__iaeContactByEmail ?? {}) };
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const current = cache[email] ?? { roles: [], departments: [] };
    for (const role of splitContactCellText(normalizeText(row.roleName))) uniquePush(current.roles, role);
    for (const dept of splitContactCellText(normalizeText(row.departmentName))) uniquePush(current.departments, dept);
    cache[email] = current;
  }
  w.__iaeContactByEmail = cache;
}

function groupContactRows(rows: ContactRowLike[]): ContactRowLike[] {
  const groups = new Map<string, ContactRowLike & { _roles?: string[]; _departments?: string[] }>();
  for (const row of rows) {
    const key = row.contactId && row.contactId > 0
      ? `id:${row.contactId}`
      : `email:${normalizeEmail(row.email)}|name:${normalizeText(row.firstName).toLowerCase()} ${normalizeText(row.lastName).toLowerCase()}`;
    const existing = groups.get(key);
    if (!existing) {
      const clone = { ...row, _roles: [], _departments: [] };
      uniquePush(clone._roles!, row.roleName);
      uniquePush(clone._departments!, row.departmentName);
      groups.set(key, clone);
    } else {
      uniquePush(existing._roles!, row.roleName);
      uniquePush(existing._departments!, row.departmentName);
      if ((row.contactAssignmentId ?? 0) < (existing.contactAssignmentId ?? Number.MAX_SAFE_INTEGER)) {
        existing.contactAssignmentId = row.contactAssignmentId;
      }
    }
  }
  const grouped = Array.from(groups.values()).map((row) => {
    const { _roles, _departments, ...rest } = row;
    return {
      ...rest,
      roleName: (_roles ?? []).join(CONTACT_CELL_SEPARATOR),
      departmentName: (_departments ?? []).join(CONTACT_CELL_SEPARATOR),
    };
  });
  cacheContactAggregates(grouped);
  return grouped;
}

async function groupedJsonResponse(response: Response, rows: ContactRowLike[]) {
  const grouped = groupContactRows(rows);
  return new Response(JSON.stringify(grouped), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function installContactBridge() {
  if (typeof window === 'undefined') return;
  const w = window as PatchedWindow;
  if (w.__iaeContactBridgeInstalled) return;
  w.__iaeContactBridgeInstalled = true;
  const original = w.fetch.bind(w);
  w.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestMethod = typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET';
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = String(init?.method ?? requestMethod ?? 'GET').toUpperCase();

    if (method === 'POST' && /\/companies\/\d+\/contacts(?:\?|$)/.test(url) && !/\/contacts\/bulk(?:\?|$)/.test(url)) {
      const roleIds = readStoredIds('role');
      const departmentIds = readStoredIds('department');
      const shouldBulk = roleIds.length > 0 && departmentIds.length > 0 && (roleIds.length > 1 || departmentIds.length > 1);
      if (shouldBulk) {
        try {
          const parsedBody = typeof init?.body === 'string' && init.body.trim()
            ? JSON.parse(init.body) as Record<string, unknown>
            : {};
          const bulkUrl = url.replace(/\/contacts(\?|$)/, '/contacts/bulk$1');
          const response = await original(bulkUrl, {
            ...init,
            body: JSON.stringify({ ...parsedBody, roleIds, departmentIds }),
          });
          clearContactMultiDraft();
          if (response.ok && (response.headers.get('content-type') ?? '').includes('application/json')) {
            const data = await response.clone().json();
            if (Array.isArray(data)) return groupedJsonResponse(response, data as ContactRowLike[]);
          }
          return response;
        } catch {
          /* fall through to the normal request */
        }
      }
    }

    const response = await original(input, init);
    if (method !== 'GET' || !response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) {
      return response;
    }
    try {
      if (/\/companies\/\d+\/contacts(?:\?|$)/.test(url) && !/\/contacts\/linked-venues(?:\?|$)/.test(url)) {
        const data = await response.clone().json();
        if (Array.isArray(data)) return groupedJsonResponse(response, data as ContactRowLike[]);
      }
      if (/\/companies\/\d+\/contacts\/linked-venues(?:\?|$)/.test(url)) {
        const data = await response.clone().json();
        if (Array.isArray(data)) {
          const groupedSections = data.map((section: { contacts?: ContactRowLike[] }) => ({
            ...section,
            contacts: Array.isArray(section.contacts) ? groupContactRows(section.contacts) : [],
          }));
          return new Response(JSON.stringify(groupedSections), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }
    } catch {
      return response;
    }
    return response;
  }) as typeof fetch;
}

function renderContactBadges(cell: Element, values: string[]) {
  const clean = values.map((v) => v.trim()).filter(Boolean);
  cell.textContent = '';
  if (clean.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'text-text-muted';
    empty.textContent = '—';
    cell.appendChild(empty);
    return;
  }
  for (const value of clean) {
    const badge = document.createElement('span');
    badge.className = 'text-xs bg-elevated px-1 py-0.5 rounded text-text-secondary mr-1 inline-block mb-0.5';
    badge.textContent = value;
    cell.appendChild(badge);
  }
}

function patchContactTables() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const cache = (window as PatchedWindow).__iaeContactByEmail ?? {};
  document.querySelectorAll('table').forEach((table) => {
    const headRow = table.querySelector('thead tr');
    const body = table.querySelector('tbody');
    if (!headRow || !body) return;
    let headers = Array.from(headRow.children).map((th) => (th.textContent ?? '').trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h === 'name');
    const roleIdx = headers.findIndex((h) => h === 'roles' || h === 'role');
    let deptIdx = headers.findIndex((h) => h === 'departments' || h === 'department');
    if (nameIdx < 0 || roleIdx < 0) return;
    if (deptIdx < 0) {
      const th = document.createElement('th');
      th.className = (headRow.children[roleIdx] as HTMLElement | undefined)?.className || 'text-left py-2';
      th.textContent = 'Departments';
      headRow.insertBefore(th, headRow.children[roleIdx + 1] ?? null);
      headers = Array.from(headRow.children).map((node) => (node.textContent ?? '').trim().toLowerCase());
      deptIdx = roleIdx + 1;
    }
    const emailIdx = headers.findIndex((h) => h === 'email');
    const oldEmailIdx = emailIdx > deptIdx ? emailIdx - 1 : emailIdx;

    Array.from(body.children).forEach((tr) => {
      if (!(tr instanceof HTMLTableRowElement)) return;
      let cells = Array.from(tr.children);
      if (cells.length <= deptIdx || (cells[deptIdx].textContent ?? '').trim().includes('@')) {
        const td = document.createElement('td');
        td.className = (cells[roleIdx] as HTMLElement | undefined)?.className || 'py-2';
        tr.insertBefore(td, tr.children[roleIdx + 1] ?? null);
        cells = Array.from(tr.children);
      }
      const emailCell = cells[emailIdx] ?? cells[oldEmailIdx];
      const roleCell = cells[roleIdx];
      const deptCell = cells[deptIdx];
      if (!roleCell || !deptCell) return;
      const email = normalizeEmail(emailCell?.textContent);
      const cached = email ? cache[email] : undefined;
      const roleValues = cached?.roles?.length ? cached.roles : splitContactCellText(roleCell.textContent ?? '');
      const deptValues = cached?.departments?.length ? cached.departments : splitContactCellText(deptCell.textContent ?? '');
      renderContactBadges(roleCell, roleValues);
      renderContactBadges(deptCell, deptValues);
    });
  });
}

function installContactTableDomPatch() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const w = window as PatchedWindow;
  if (w.__iaeContactDomPatchInstalled) return;
  w.__iaeContactDomPatchInstalled = true;
  const run = () => window.requestAnimationFrame(patchContactTables);
  w.__iaeContactObserver = new MutationObserver(run);
  w.__iaeContactObserver.observe(document.body, { childList: true, subtree: true });
  run();
}

function installContactEnhancements() {
  installContactBridge();
  installContactTableDomPatch();
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
  useEffect(installContactEnhancements, []);
  const optionsSafe = options ?? [];
  const contactMultiKindRef = useRef<ContactMultiKind>(value ? null : contactMultiKindFromOptions(optionsSafe));
  const contactMultiKind = contactMultiKindRef.current;
  const contactMultiMode = contactMultiKind != null;
  const visibleOptions = contactMultiMode ? optionsSafe.filter((o) => o.value !== '') : optionsSafe;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(() => (contactMultiMode && value ? [value] : []));
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuStyle = useMenuPosition(open, containerRef);

  const parentFiltersOptions = onFilterChange != null;
  const displayFilter = parentFiltersOptions ? (filterQuery ?? '') : search;
  const selected = visibleOptions.find((o) => o.value === value);
  const filtered = parentFiltersOptions
    ? visibleOptions
    : visibleOptions.filter((o) => String(o.label ?? '').toLowerCase().includes(String(search ?? '').toLowerCase()));

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
  }, [open, filtered, value]);

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
    if (!contactMultiKind) return;
    writeContactMulti(contactMultiKind, selectedValues);
  }, [contactMultiKind, selectedValues]);

  const setContactMulti = useCallback((next: string[]) => {
    const clean = Array.from(new Set(next.filter(Boolean)));
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
    ? selectedValues.length === 0
      ? placeholder
      : selectedValues.map((v) => visibleOptions.find((o) => o.value === v)?.label || v).join(', ')
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
                'select2-results__option px-3 py-2 text-sm transition-colors select-none',
                opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isSelected ? 'select2-results__option--selected bg-ems-accent-dim text-ems-accent font-medium' : idx === highlightedIndex ? 'select2-results__option--highlighted bg-hover text-text-primary' : 'text-text-primary hover:bg-hover',
              ].filter(Boolean).join(' ')}
            >
              {isSelected && <span className="mr-1.5 text-ems-accent text-xs">✓</span>}
              {opt.label}
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
  useEffect(installContactEnhancements, []);
  const optionsSafe = options ?? [];
  const valuesSafe = values ?? [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuStyle = useMenuPosition(open, containerRef);
  const filtered = useMemo(() => optionsSafe.filter((o) => String(o.label ?? '').toLowerCase().includes(search.toLowerCase())), [optionsSafe, search]);
  const summary = valuesSafe.length === 0 ? placeholder : valuesSafe.map((v) => optionsSafe.find((o) => o.value === v)?.label || v).join(', ');

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
            <li key={opt.value} role="option" aria-selected={selected} aria-disabled={opt.disabled} onClick={() => !opt.disabled && toggle(opt.value)} className={['select2-results__option px-3 py-2 text-sm transition-colors select-none', opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer', selected ? 'bg-ems-accent-dim text-ems-accent font-medium' : 'text-text-primary hover:bg-hover'].filter(Boolean).join(' ')}>
              <span className="mr-2 text-xs w-4 inline-block text-center">{selected ? '✓' : ''}</span>
              {opt.label}
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
