import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlignLeft,
  Grid2x2,
  LayoutGrid,
  Loader2,
  Mail,
  Network,
  Phone,
  Rows3,
  Search,
  Smartphone,
  Users,
} from 'lucide-react';
import {
  fetchOrganizationChartHierarchy,
  organizationChartHierarchyQueryKey,
  type OrganizationChartMember,
} from '@/api/organizationChartApi';
import { GraphAvatar } from './GraphAvatar';
import { cn } from '@/lib/utils';
import { getActiveAccount, acquireGraphAccessToken } from '@/auth/entra';
import { formatE164ForDisplay } from '@/lib/contactPhoneField';
import { fetchEntraJobTitles, type EntraJobTitleMap } from '@/api/entraJobTitles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

const ALL_DEPARTMENTS = '__all__';
type ViewMode = 'tiles' | 'table';
type TilesView = 'alpha' | 'dept';
type AlphaSort = 'first' | 'last';

function displayName(member: OrganizationChartMember): string {
  return member.displayName || `${member.firstName} ${member.lastName}`.trim() || '—';
}

function departmentOf(member: OrganizationChartMember): string {
  return member.departmentName?.trim() || 'Unassigned';
}

function compareByName(a: OrganizationChartMember, b: OrganizationChartMember, primary: AlphaSort): number {
  const aFirst = (a.firstName ?? '').toLowerCase();
  const bFirst = (b.firstName ?? '').toLowerCase();
  const aLast = (a.lastName ?? '').toLowerCase();
  const bLast = (b.lastName ?? '').toLowerCase();
  return primary === 'first'
    ? aFirst.localeCompare(bFirst) || aLast.localeCompare(bLast)
    : aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
}

/* ─── Segmented control ─── */
function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1 dk:border-white/10 dk:bg-white/[0.04]">
      {children}
    </div>
  );
}

function SegBtn({ active, onClick, children, ariaLabel }: { active: boolean; onClick: () => void; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all ${
        active
          ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06] dk:bg-white/[0.14] dk:text-white dk:ring-white/10'
          : 'text-neutral-500 hover:text-neutral-900 dk:text-neutral-400 dk:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/** Department filter chip matching WMS style. */
function DepartmentChip({
  label,
  count,
  active,
  showDot,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  showDot: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
        active
          ? 'bg-neutral-900 text-white dk:bg-white dk:text-neutral-900'
          : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:text-neutral-900 dk:border-white/10 dk:bg-white/[0.04] dk:text-neutral-300 dk:hover:border-white/30 dk:hover:text-white'
      } dk:focus-visible:ring-white/60 dk:focus-visible:ring-offset-transparent`}
    >
      {showDot ? (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] ${
            active ? 'border-white/60 dk:border-neutral-900/40' : 'border-neutral-300 dk:border-white/25'
          }`}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
      <span className={active ? 'text-white/55 dk:text-neutral-900/55' : 'text-neutral-400 dk:text-neutral-500'}>{count}</span>
    </button>
  );
}

/* ─── Table view ─── */
function OrgTable({
  members,
  onRowClick,
  graphToken,
}: {
  members: OrganizationChartMember[];
  onRowClick?: (contactId: number) => void;
  graphToken?: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dk:border-white/10">
      <table className="w-full text-left text-sm dk:bg-surface">
        <thead className="border-b border-neutral-200 bg-neutral-50 dk:border-white/10 dk:bg-white/[0.04]">
          <tr>
            <th className="w-[20%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Name</th>
            <th className="w-[14%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Department</th>
            <th className="w-[15%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Title</th>
            <th className="w-[13%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Desk Phone</th>
            <th className="w-[10%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Extension</th>
            <th className="w-[13%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Mobile</th>
            <th className="w-[15%] px-4 py-3 font-semibold text-neutral-700 dk:text-neutral-200">Email</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-300 dk:divide-white/10">
          {members.map((member) => {
            const name = displayName(member);
            const title = member.jobTitle?.trim() || '';
            const dept = departmentOf(member);
            const deskBase = formatE164ForDisplay(member.workPhone) || '';
            const ext = member.extension?.trim() || '';
            const desk = deskBase;
            const cell = formatE164ForDisplay(member.cellPhone) || '';
            return (
              <tr
                key={member.contactId}
                onClick={onRowClick ? () => onRowClick(member.contactId) : undefined}
                className={cn(
                  'transition-colors hover:bg-neutral-50 dk:hover:bg-white/[0.05]',
                  onRowClick && 'cursor-pointer',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <GraphAvatar name={name} email={member.email} graphToken={graphToken} size="xl" accent="hsl(var(--text-primary))" />
                    <span className="font-medium text-neutral-900 dk:text-white">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dk:text-neutral-300">{dept}</td>
                <td className="px-4 py-3 text-neutral-600 dk:text-neutral-300">{title}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500 dk:text-neutral-400">{desk}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500 dk:text-neutral-400">{ext || ''}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500 dk:text-neutral-400">{cell}</td>
                <td className="px-4 py-3 text-neutral-500 dk:text-neutral-400">{member.email}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OrganizationalChartPage({ onNavigate }: { onNavigate?: (view: string, data?: unknown) => void }) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>(ALL_DEPARTMENTS);
  const [mode, setMode] = useState<ViewMode>('tiles');
  const [tilesView, setTilesView] = useState<TilesView>('alpha');
  const [tableView, setTableView] = useState<TilesView>('alpha');
  const [alphaSort, setAlphaSort] = useState<AlphaSort>('first');
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [entraJobTitles, setEntraJobTitles] = useState<EntraJobTitleMap>(new Map());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const account = getActiveAccount();
      if (!account) return;
      try {
        const token = await acquireGraphAccessToken(account);
        if (mounted && token) setGraphToken(token);
        // Fetch Entra job titles separately
        const titles = await fetchEntraJobTitles(token);
        if (mounted) setEntraJobTitles(titles);
      } catch { /* fallback to initials */ }
    })();
    return () => { mounted = false; };
  }, []);

  const chartQuery = useQuery({
    queryKey: [...organizationChartHierarchyQueryKey, graphToken],
    queryFn: () => fetchOrganizationChartHierarchy(graphToken ?? undefined),
    staleTime: 60_000,
  });

  const data = chartQuery.data;

  const allMembers = useMemo(() => {
    if (!data?.nodes) return [];
    const seen = new Set<number>();
    const members: OrganizationChartMember[] = [];
    for (const node of data.nodes) {
      if (!node.members) continue;
      for (const m of node.members) {
        if (seen.has(m.contactId)) continue;
        seen.add(m.contactId);
        // Enrich with Entra job title if the backend didn't provide one
        const emailKey = (m.email ?? '').trim().toLowerCase();
        const entraTitle = emailKey ? entraJobTitles.get(emailKey) : undefined;
        members.push(entraTitle && !m.jobTitle?.trim()
          ? { ...m, jobTitle: entraTitle }
          : m,
        );
      }
    }
    return members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data, entraJobTitles]);

  const departmentChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of allMembers) {
      const dept = departmentOf(m);
      counts.set(dept, (counts.get(dept) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [allMembers]);

  const departmentNames = useMemo(() => departmentChips.map((d) => d.name), [departmentChips]);

  const showChips =
    ((mode === 'tiles' && tilesView === 'dept') || (mode === 'table' && tableView === 'dept'))
    && departmentChips.length > 1;

  const activeDepartment =
    showChips && department !== ALL_DEPARTMENTS && departmentNames.includes(department)
      ? department
      : ALL_DEPARTMENTS;

  const filtered = useMemo(() => {
    let result = allMembers;
    if (showChips && activeDepartment !== ALL_DEPARTMENTS) {
      result = result.filter((m) => departmentOf(m) === activeDepartment);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((m) =>
        [m.displayName, m.jobTitle, m.roleName, m.departmentName, m.email]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [allMembers, showChips, activeDepartment, search]);

  const alphaSorted = useMemo(
    () => [...filtered].sort((a, b) => compareByName(a, b, alphaSort)),
    [filtered, alphaSort],
  );

  const byDepartment = useMemo(() => {
    const groups = new Map<string, OrganizationChartMember[]>();
    for (const m of filtered) {
      const dept = departmentOf(m);
      const bucket = groups.get(dept);
      if (bucket) bucket.push(m);
      else groups.set(dept, [m]);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dept, members]) => ({ dept, members }));
  }, [filtered]);

  const handleRowClick = onNavigate
    ? (contactId: number) => onNavigate('contacts', { selectedContactId: contactId })
    : undefined;

  return (
    <div className="min-w-0 flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-sm dk:border-white/10 dk:bg-white/[0.06] dk:text-neutral-200 dk:shadow-none">
            <Network className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dk:text-white">Organization</h1>
            <p className="text-xs font-medium text-neutral-500 dk:text-neutral-400">
              {data?.company?.companyName || 'Internal company'}
            </p>
          </div>
        </div>

        {allMembers.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-neutral-500 dk:text-neutral-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {allMembers.length} people
            </span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dk:text-neutral-500" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, department, or email"
            aria-label="Search employees"
            className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dk:border-white/10 dk:bg-white/[0.04] dk:text-white dk:placeholder:text-neutral-500 dk:focus:border-white/40 dk:focus:ring-white/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
          {mode === 'tiles' && (
            <Segmented>
              {tilesView === 'alpha' ? (
                <span className="inline-flex items-center">
                  <Select
                    value={alphaSort}
                    onValueChange={(v) => setAlphaSort(v as AlphaSort)}
                  >
                    <SelectTrigger
                      aria-label="Alphabetical sort"
                      className="h-8 w-[145px] gap-1.5 rounded-md border-0 bg-white px-3 text-[13px] font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] focus:ring-1 focus:ring-black/[0.06] dk:bg-white/[0.14] dk:text-white dk:shadow-none dk:ring-white/10 dk:focus:ring-white/20"
                    >
                      <AlignLeft className="h-4 w-4 shrink-0" />
                      <span>Alphabetical</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">Sort: First Name</SelectItem>
                      <SelectItem value="last">Sort: Last Name</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              ) : (
                <SegBtn
                  active={false}
                  onClick={() => { setDepartment(ALL_DEPARTMENTS); setTilesView('alpha'); }}
                >
                  <AlignLeft className="h-4 w-4" /> Alphabetical
                </SegBtn>
              )}
              <SegBtn active={tilesView === 'dept'} onClick={() => setTilesView('dept')}>
                <Grid2x2 className="h-4 w-4" /> Department
              </SegBtn>
            </Segmented>
          )}

          {mode === 'table' && (
            <Segmented>
              {tableView === 'alpha' ? (
                <span className="inline-flex items-center">
                  <Select
                    value={alphaSort}
                    onValueChange={(v) => setAlphaSort(v as AlphaSort)}
                  >
                    <SelectTrigger
                      aria-label="Alphabetical sort"
                      className="h-8 w-[145px] gap-1.5 rounded-md border-0 bg-white px-3 text-[13px] font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] focus:ring-1 focus:ring-black/[0.06] dk:bg-white/[0.14] dk:text-white dk:shadow-none dk:ring-white/10 dk:focus:ring-white/20"
                    >
                      <AlignLeft className="h-4 w-4 shrink-0" />
                      <span>Alphabetical</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">Sort: First Name</SelectItem>
                      <SelectItem value="last">Sort: Last Name</SelectItem>
                    </SelectContent>
                  </Select>
                </span>
              ) : (
                <SegBtn
                  active={false}
                  onClick={() => { setDepartment(ALL_DEPARTMENTS); setTableView('alpha'); }}
                >
                  <AlignLeft className="h-4 w-4" /> Alphabetical
                </SegBtn>
              )}
              <SegBtn active={tableView === 'dept'} onClick={() => setTableView('dept')}>
                <Grid2x2 className="h-4 w-4" /> Department
              </SegBtn>
            </Segmented>
          )}

          <Segmented>
            <SegBtn active={mode === 'tiles'} onClick={() => setMode('tiles')} ariaLabel="Tile view">
              <LayoutGrid className="h-4 w-4" /> Tiles
            </SegBtn>
            <SegBtn active={mode === 'table'} onClick={() => { setDepartment(ALL_DEPARTMENTS); setMode('table'); }} ariaLabel="Table view">
              <Rows3 className="h-4 w-4" /> Table
            </SegBtn>
          </Segmented>
        </div>
      </div>

      {/* Department filter chips — Department tiles tab only */}
      {showChips && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by department">
          <DepartmentChip
            label="All"
            count={allMembers.length}
            active={activeDepartment === ALL_DEPARTMENTS}
            showDot={false}
            onClick={() => setDepartment(ALL_DEPARTMENTS)}
          />
          {departmentChips.map((chip) => (
            <DepartmentChip
              key={chip.name}
              label={chip.name}
              count={chip.count}
              active={activeDepartment === chip.name}
              showDot
              onClick={() => setDepartment((c) => (c === chip.name ? ALL_DEPARTMENTS : chip.name))}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {chartQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400 dk:text-neutral-500" />
        </div>
      ) : chartQuery.isError ? (
        <p className="py-16 text-center text-sm text-neutral-500 dk:text-neutral-400">
          Could not load employee data. Please try again.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500 dk:text-neutral-400">
          {allMembers.length === 0 ? 'No staff employees found.' : 'No employees match your search.'}
        </p>
      ) : mode === 'table' ? (
        tableView === 'dept' ? (
          <div className="space-y-8">
            {byDepartment.map(({ dept, members }) => (
              <section key={dept}>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dk:text-neutral-400">
                  {dept} <span className="text-neutral-400 dk:text-neutral-500">· {members.length}</span>
                </h2>
                <OrgTable members={members} onRowClick={handleRowClick} graphToken={graphToken} />
              </section>
            ))}
          </div>
        ) : (
          <OrgTable members={alphaSorted} onRowClick={handleRowClick} graphToken={graphToken} />
        )
      ) : tilesView === 'alpha' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 lg:grid-cols-6">
          {alphaSorted.map((member) => (
            <PersonTile key={member.contactId} member={member} onNavigate={onNavigate} graphToken={graphToken} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {byDepartment.map(({ dept, members }) => (
            <section key={dept}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dk:text-neutral-400">
                {dept} <span className="text-neutral-400 dk:text-neutral-500">· {members.length}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 lg:grid-cols-6">
                {members.map((member) => (
                  <PersonTile key={member.contactId} member={member} onNavigate={onNavigate} graphToken={graphToken} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Single person tile ─── */
function PersonTile({
  member,
  onNavigate,
  graphToken,
}: {
  member: OrganizationChartMember;
  onNavigate?: (view: string, data?: unknown) => void;
  graphToken?: string | null;
}) {
  const name = displayName(member);
  const title = member.jobTitle?.trim();
  const dept = member.departmentName?.trim();
  const cellPhone = formatE164ForDisplay(member.cellPhone);
  const deskBase = formatE164ForDisplay(member.workPhone) || '';
  const ext = member.extension?.trim() || '';
  const hasDeskPhone = Boolean(deskBase || ext);
  const hasContact = Boolean(hasDeskPhone || cellPhone || member.email);

  return (
    <button
      type="button"
      onClick={onNavigate ? () => onNavigate('contacts', { selectedContactId: member.contactId }) : undefined}
      className={cn(
        'group relative flex h-full min-h-[290px] flex-col items-center rounded-lg border-2 border-neutral-900 bg-white px-4 pb-4 pt-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900',
        'dk:border-white/10 dk:bg-surface dk:shadow-none dk:hover:border-white/25 dk:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] dk:focus-visible:ring-white/60',
        !onNavigate && 'cursor-default',
      )}
    >
      <img src="/iae_logo.png" alt="" className="absolute top-3 right-3 h-5 w-auto invert dk:invert-0" aria-hidden />
      {/* Initials circle flips with the theme: fill is the primary text color, letters the card color. */}
      <GraphAvatar name={name} email={member.email} graphToken={graphToken} size="xl" accent="hsl(var(--text-primary))" className="!w-24 !h-24 !text-2xl" />

      <p className="mt-4 w-full text-[15px] font-bold text-neutral-950 break-words leading-tight dk:text-white">{name}</p>

      {dept ? (
        <span className="mt-2 max-w-full rounded border border-neutral-300 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-700 break-words text-center leading-tight dk:border-white/20 dk:text-neutral-200">
          {dept}
        </span>
      ) : null}

      {title ? (
        <p className="mt-2 w-full text-[13px] font-bold leading-snug text-neutral-600 dk:text-text-secondary">{title}</p>
      ) : null}

      <div className="min-h-[16px] flex-1" aria-hidden />

      {hasContact ? (
        <div className="w-full min-w-0 border-t border-neutral-200 pt-4 dk:border-white/10">
          <div className="flex flex-col gap-1.5 text-[12px] text-neutral-600 dk:text-neutral-300">
            {hasDeskPhone ? (
              <span className="flex min-w-0 items-center justify-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400 dk:text-neutral-500" aria-hidden />
                {deskBase ? <span className="truncate font-mono tracking-tight">{deskBase}</span> : null}
                {ext ? (
                  <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-[1px] text-[10px] font-bold text-white dk:bg-white dk:text-neutral-900">
                    x{ext}
                  </span>
                ) : null}
              </span>
            ) : null}
            {cellPhone ? (
              <span className="flex min-w-0 items-center justify-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 shrink-0 text-neutral-400 dk:text-neutral-500" aria-hidden />
                <span className="truncate font-mono tracking-tight">{cellPhone}</span>
              </span>
            ) : null}
            {member.email ? (
              <span className="flex min-w-0 items-center justify-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400 dk:text-neutral-500" aria-hidden />
                <span className="truncate">{member.email}</span>
              </span>
            ) : null}
            {/* <a
              href={`https://www.linkedin.com/in/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 items-center justify-center gap-1.5 text-[#0A66C2] hover:underline"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="truncate">LinkedIn Profile</span>
            </a> */}
          </div>
        </div>
      ) : null}
    </button>
  );
}

export default OrganizationalChartPage;
