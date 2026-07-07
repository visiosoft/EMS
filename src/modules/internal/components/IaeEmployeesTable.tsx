import { useMemo, useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { fetchIaeStaffEmployees, type IaeEmployee } from '@/api/iaeEmployeesApi';
import { formatE164ForDisplay } from '@/lib/contactPhoneField';
import { TeamMemberAvatar } from './TeamMemberAvatar';

const DEFAULT_VISIBLE_ROW_COUNT = 8;

export type EmployeeSortMode = 'name-first' | 'name-last' | 'department';

function displayName(employee: IaeEmployee): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim() || '—';
}

function displayExtension(employee: IaeEmployee): string {
  if (employee.extension?.trim()) return employee.extension.trim();
  const digits = (employee.workPhone ?? '').replace(/\D/g, '');
  if (digits.length >= 3 && digits.length <= 5) return digits;
  return '—';
}

function displayMobile(cellPhone: string | null, workPhone: string | null): string {
  const formatted = formatE164ForDisplay(cellPhone) || formatE164ForDisplay(workPhone);
  return formatted || '—';
}

/** Leadership weight so managers/directors sort above their reports within a department. */
export function roleWeight(role: string | null | undefined): number {
  const r = (role ?? '').toLowerCase();
  if (/\b(ceo|chief|president|owner|founder)\b/.test(r)) return 100;
  if (/\b(evp|svp|vp|vice president)\b/.test(r)) return 80;
  if (/\b(director|head)\b/.test(r)) return 60;
  if (/\b(manager|lead|supervisor)\b/.test(r)) return 40;
  return 0;
}

function compareByName(a: IaeEmployee, b: IaeEmployee, primary: 'first' | 'last'): number {
  const aFirst = (a.firstName ?? '').toLowerCase();
  const bFirst = (b.firstName ?? '').toLowerCase();
  const aLast = (a.lastName ?? '').toLowerCase();
  const bLast = (b.lastName ?? '').toLowerCase();
  if (primary === 'first') {
    return aFirst.localeCompare(bFirst) || aLast.localeCompare(bLast);
  }
  return aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
}

function sortEmployees(employees: IaeEmployee[], mode: EmployeeSortMode | undefined): IaeEmployee[] {
  if (!mode) return employees;
  const sorted = [...employees];
  if (mode === 'department') {
    sorted.sort(
      (a, b) =>
        (a.departmentName ?? '').localeCompare(b.departmentName ?? '') ||
        roleWeight(b.roleName) - roleWeight(a.roleName) ||
        compareByName(a, b, 'last'),
    );
    return sorted;
  }
  sorted.sort((a, b) => compareByName(a, b, mode === 'name-last' ? 'last' : 'first'));
  return sorted;
}

/** One row per person — guards against duplicate Contact rows or stale API responses. */
export function dedupeEmployees(employees: IaeEmployee[]): IaeEmployee[] {
  const seenContactIds = new Set<number>();
  const seenEmails = new Set<string>();
  const unique: IaeEmployee[] = [];

  for (const employee of employees) {
    if (seenContactIds.has(employee.contactId)) continue;

    const emailKey = employee.email.trim().toLowerCase();
    if (emailKey && seenEmails.has(emailKey)) continue;

    seenContactIds.add(employee.contactId);
    if (emailKey) seenEmails.add(emailKey);
    unique.push(employee);
  }

  return unique;
}

function EmployeeRow({
  employee,
  onClick,
}: {
  employee: IaeEmployee;
  onClick?: (employee: IaeEmployee) => void;
}) {
  const rawMobile = employee.cellPhone || employee.workPhone;
  const mobileDisplay = displayMobile(employee.cellPhone, employee.workPhone);
  const clickable = Boolean(onClick);
  return (
    <tr
      className={`transition-colors hover:bg-neutral-50 ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? () => onClick?.(employee) : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.(employee);
              }
            }
          : undefined
      }
    >
      <td className="px-4 py-3">
        <TeamMemberAvatar />
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900">
        {clickable ? (
          <span className="underline-offset-2 hover:underline">{displayName(employee)}</span>
        ) : (
          displayName(employee)
        )}
      </td>
      <td className="px-4 py-3 text-neutral-800">{employee.roleName || '—'}</td>
      <td className="px-4 py-3 text-neutral-800">{employee.departmentName || '—'}</td>
      <td className="px-4 py-3 text-neutral-800">{displayExtension(employee)}</td>
      <td className="px-4 py-3 text-neutral-800" onClick={(e) => e.stopPropagation()}>
        {rawMobile && mobileDisplay !== '—' ? (
          <a href={`tel:${rawMobile}`} className="hover:underline">
            {mobileDisplay}
          </a>
        ) : (
          mobileDisplay
        )}
      </td>
      <td className="px-4 py-3 text-neutral-800" onClick={(e) => e.stopPropagation()}>
        {employee.email ? (
          <a href={`mailto:${employee.email}`} className="hover:underline">
            {employee.email}
          </a>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}

type IaeEmployeesTableProps = {
  /** Show the client-side name/title/department/email search box. */
  searchable?: boolean;
  /**
   * Rows visible before the list scrolls. Pass null for no cap (full-height directory).
   */
  maxVisibleRows?: number | null;
  title?: string | null;
  /** Row order. Omit to keep the API's insertion order. */
  sortMode?: EmployeeSortMode;
  /** Insert a department heading row before each department group. */
  groupByDepartment?: boolean;
  /** Makes rows clickable — e.g. to open the employee's profile. */
  onRowClick?: (employee: IaeEmployee) => void;
};

export function IaeEmployeesTable({
  searchable = true,
  maxVisibleRows = DEFAULT_VISIBLE_ROW_COUNT,
  title = 'IAE Employees',
  sortMode,
  groupByDepartment = false,
  onRowClick,
}: IaeEmployeesTableProps = {}) {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['iae-staff-employees'],
    queryFn: fetchIaeStaffEmployees,
  });

  const employees = useMemo(() => dedupeEmployees(data ?? []), [data]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? employees.filter((employee) =>
          [
            displayName(employee),
            employee.roleName ?? '',
            employee.departmentName ?? '',
            employee.email,
            displayExtension(employee),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : employees;
    return sortEmployees(base, groupByDepartment ? 'department' : sortMode);
  }, [employees, search, sortMode, groupByDepartment]);

  /** ~3.25rem per body row + ~3rem header — caps visible rows before scroll. */
  const tableMaxHeight =
    maxVisibleRows != null ? `calc(${maxVisibleRows} * 3.25rem + 3rem)` : undefined;

  const renderBodyRows = () => {
    if (!groupByDepartment) {
      return filteredEmployees.map((employee) => (
        <EmployeeRow key={employee.contactId} employee={employee} onClick={onRowClick} />
      ));
    }
    const rows: ReactElement[] = [];
    let lastDept: string | null = null;
    for (const employee of filteredEmployees) {
      const dept = employee.departmentName?.trim() || 'Unassigned';
      if (dept !== lastDept) {
        lastDept = dept;
        rows.push(
          <tr key={`dept-${dept}`} className="bg-neutral-100/80">
            <td
              colSpan={7}
              className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600"
            >
              {dept}
            </td>
          </tr>,
        );
      }
      rows.push(<EmployeeRow key={employee.contactId} employee={employee} onClick={onRowClick} />);
    }
    return rows;
  };

  return (
    <section className={title ? 'mt-12' : ''}>
      {title ? (
        <h2 className="mb-5 text-2xl font-semibold tracking-[0.01em] text-neutral-950">{title}</h2>
      ) : null}

      {isError ? (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Employee directory could not be loaded.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      {searchable ? (
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, title, department, or email"
            aria-label="Search employees"
            className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <div
          className="overflow-y-auto overflow-x-auto [scrollbar-gutter:stable]"
          style={tableMaxHeight ? { maxHeight: tableMaxHeight } : undefined}
        >
          <table className="min-w-[880px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e5e5]">
              <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                <th className="px-4 py-4">Picture</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Title</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">Extension</th>
                <th className="px-4 py-4">Mobile</th>
                <th className="px-4 py-4">Work Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden />
                    <span className="sr-only">Loading employees</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    {employees.length === 0
                      ? 'No staff employees found.'
                      : 'No employees match your search.'}
                  </td>
                </tr>
              ) : (
                renderBodyRows()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && maxVisibleRows != null && filteredEmployees.length > maxVisibleRows ? (
        <p className="mt-2 text-xs text-neutral-500">
          Showing {filteredEmployees.length} staff {filteredEmployees.length === 1 ? 'member' : 'members'}. Scroll to see all.
          {isFetching && !isLoading ? ' Updating…' : null}
        </p>
      ) : null}
    </section>
  );
}
