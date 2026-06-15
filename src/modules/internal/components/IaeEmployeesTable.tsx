import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { fetchIaeStaffEmployees, type IaeEmployee } from '@/api/iaeEmployeesApi';
import { formatE164ForDisplay } from '@/lib/contactPhoneField';
import { TeamMemberAvatar } from './TeamMemberAvatar';

const VISIBLE_ROW_COUNT = 8;
/** ~3.25rem per body row + ~3rem header — caps list at eight visible rows before scroll. */
const TABLE_MAX_HEIGHT = `calc(${VISIBLE_ROW_COUNT} * 3.25rem + 3rem)`;

function displayName(employee: IaeEmployee): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim() || '—';
}

function displayExtension(workPhone: string | null): string {
  const digits = (workPhone ?? '').replace(/\D/g, '');
  if (digits.length >= 3 && digits.length <= 5) return digits;
  return '—';
}

function displayMobile(cellPhone: string | null, workPhone: string | null): string {
  const formatted = formatE164ForDisplay(cellPhone) || formatE164ForDisplay(workPhone);
  return formatted || '—';
}

/** One row per person — guards against duplicate Contact rows or stale API responses. */
function dedupeEmployees(employees: IaeEmployee[]): IaeEmployee[] {
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

function EmployeeRow({ employee }: { employee: IaeEmployee }) {
  const rawMobile = employee.cellPhone || employee.workPhone;
  const mobileDisplay = displayMobile(employee.cellPhone, employee.workPhone);
  return (
    <tr className="transition-colors hover:bg-neutral-50">
      <td className="px-4 py-3">
        <TeamMemberAvatar />
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900">{displayName(employee)}</td>
      <td className="px-4 py-3 text-neutral-800">{displayExtension(employee.workPhone)}</td>
      <td className="px-4 py-3 text-neutral-800">{rawMobile && mobileDisplay !== '—' ? <a href={`tel:${rawMobile}`} className="hover:underline">{mobileDisplay}</a> : mobileDisplay}</td>
      <td className="px-4 py-3 text-neutral-800">{employee.email ? <a href={`mailto:${employee.email}`} className="hover:underline">{employee.email}</a> : '—'}</td>
    </tr>
  );
}

export function IaeEmployeesTable() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['iae-staff-employees'],
    queryFn: fetchIaeStaffEmployees,
  });

  const employees = dedupeEmployees(data ?? []);

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-2xl font-semibold tracking-[0.01em] text-neutral-950">IAE Employees</h2>

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

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <div
          className="overflow-y-auto overflow-x-auto [scrollbar-gutter:stable]"
          style={{ maxHeight: TABLE_MAX_HEIGHT }}
        >
          <table className="min-w-[680px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e5e5]">
              <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                <th className="px-4 py-4">Picture</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Extension</th>
                <th className="px-4 py-4">Mobile</th>
                <th className="px-4 py-4">Work Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden />
                    <span className="sr-only">Loading employees</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                    No staff employees found.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => <EmployeeRow key={employee.contactId} employee={employee} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && employees.length > VISIBLE_ROW_COUNT ? (
        <p className="mt-2 text-xs text-neutral-500">
          Showing {employees.length} staff {employees.length === 1 ? 'member' : 'members'}. Scroll to see all.
          {isFetching && !isLoading ? ' Updating…' : null}
        </p>
      ) : null}
    </section>
  );
}
