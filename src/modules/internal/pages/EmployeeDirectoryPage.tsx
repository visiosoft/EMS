import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlignLeft,
  Grid2x2,
  LayoutGrid,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Rows3,
  Search,
  Smartphone,
} from "lucide-react";
import { fetchIaeStaffEmployees, type IaeEmployee } from "@/api/iaeEmployeesApi";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { HubGraphAvatar } from "@/components/ems/GraphAvatar";
import { getActiveAccount, acquireGraphAccessToken } from "@/auth/entra";
import { fetchEntraJobTitles, type EntraJobTitleMap } from "@/api/entraJobTitles";
import {
  dedupeEmployees,
  roleWeight,
} from "../components/IaeEmployeesTable";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import type { InternalView } from "../routing/internalSessionRoute";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DirectoryMode = "tiles" | "table";
type TilesView = "alpha" | "dept";
type TableView = "alpha" | "dept";
type AlphaSort = "first" | "last";

/** Sentinel for the "All" department chip — no real department can collide with it. */
const ALL_DEPARTMENTS = "__all__";

function departmentOf(employee: IaeEmployee): string {
  return employee.departmentName?.trim() || "Unassigned";
}

function displayName(employee: IaeEmployee): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || "—";
}

function compareByName(a: IaeEmployee, b: IaeEmployee, primary: AlphaSort): number {
  const aFirst = (a.firstName ?? "").toLowerCase();
  const bFirst = (b.firstName ?? "").toLowerCase();
  const aLast = (a.lastName ?? "").toLowerCase();
  const bLast = (b.lastName ?? "").toLowerCase();
  return primary === "first"
    ? aFirst.localeCompare(bFirst) || aLast.localeCompare(bLast)
    : aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
}

/** Professional segmented control container (grey track, white active pill). */
function Segmented({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1">
      {label ? (
        <span className="pl-1.5 pr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all ${
        active
          ? "bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06]"
          : "text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

/** One department filter pill. `count` renders as a muted trailing badge. */
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
          ? "bg-neutral-900 text-white"
          : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:text-neutral-900"
      }`}
    >
      {showDot ? (
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] ${
            active ? "border-white/60" : "border-neutral-300"
          }`}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
      <span className={active ? "text-white/55" : "text-neutral-400"}>{count}</span>
    </button>
  );
}

/**
 * Desk line: full work number with the extension appended, e.g. "(312) 274-1800 x226".
 * Some records store only the extension in `workPhone` (3–5 digits), so that case is
 * rendered as a bare extension rather than a bogus phone number.
 */
function deskPhoneLine(employee: IaeEmployee): string {
  const digits = (employee.workPhone ?? "").replace(/\D/g, "");
  const extensionOnly = digits.length >= 3 && digits.length <= 5;
  const base = extensionOnly ? "" : formatE164ForDisplay(employee.workPhone);
  const extension = employee.extension?.trim() || (extensionOnly ? digits : "");
  if (base && extension) return `${base} x${extension}`;
  return base || (extension ? `x${extension}` : "");
}

/** One icon + value row inside a tile's contact block. */
function ContactLine({
  icon: Icon,
  value,
  mono = true,
}: {
  icon: typeof Phone;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
      <span className={`truncate ${mono ? "font-mono tracking-tight" : ""}`}>{value}</span>
    </span>
  );
}

function PersonTile({
  employee,
  onOpen,
  graphToken,
}: {
  employee: IaeEmployee;
  onOpen: (contactId: number) => void;
  graphToken?: string | null;
}) {
  const name = displayName(employee);
  const deskBase = (() => {
    const digits = (employee.workPhone ?? "").replace(/\D/g, "");
    if (digits.length >= 3 && digits.length <= 5) return "";
    return formatE164ForDisplay(employee.workPhone) || "";
  })();
  const deskExtension = employee.extension?.trim() || (() => {
    const digits = (employee.workPhone ?? "").replace(/\D/g, "");
    return digits.length >= 3 && digits.length <= 5 ? digits : "";
  })();
  const hasDeskPhone = Boolean(deskBase || deskExtension);
  const cellPhone = formatE164ForDisplay(employee.cellPhone);
  // Entra job title only — no role fallback; employees without one show no title line.
  const title = employee.jobTitle?.trim();
  const department = employee.departmentName?.trim();
  const hasContact = Boolean(hasDeskPhone || cellPhone || employee.email);

  return (
    <button
      type="button"
      onClick={() => onOpen(employee.contactId)}
      className="group relative flex h-full min-h-[290px] flex-col items-center rounded-lg border-2 border-neutral-900 bg-white px-4 pb-4 pt-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      <img src="/iae_logo.png" alt="" className="absolute top-3 right-3 h-5 w-auto invert" aria-hidden />
      <HubGraphAvatar
        name={name}
        email={employee.email}
        graphToken={graphToken}
        size="xl"
        ringClass="ring-transparent"
        className="!w-24 !h-24 !text-2xl"
      />

      <p className="mt-4 w-full text-[15px] font-bold text-neutral-950 break-words leading-tight">{name}</p>

      {department ? (
        <span className="mt-2 max-w-full rounded border border-neutral-300 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-700 break-words text-center leading-tight">
          {department}
        </span>
      ) : null}

      {title ? (
        <p className="mt-2 w-full text-[13px] font-bold leading-snug text-neutral-600">{title}</p>
      ) : null}

      {/* Pushes the contact block to the card's bottom edge so tiles in a row align. */}
      <div className="min-h-[16px] flex-1" aria-hidden />

      {hasContact ? (
        <div className="w-full min-w-0 border-t border-neutral-200 pt-4">
          <div className="flex flex-col gap-1.5 text-[12px] text-neutral-600">
            {hasDeskPhone ? (
              <span className="flex min-w-0 items-center justify-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                {deskBase ? <span className="truncate font-mono tracking-tight">{deskBase}</span> : null}
                {deskExtension ? (
                  <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-[1px] text-[10px] font-bold text-white">
                    x{deskExtension}
                  </span>
                ) : null}
              </span>
            ) : null}
            {cellPhone ? <ContactLine icon={Smartphone} value={cellPhone} /> : null}
            {employee.email ? <ContactLine icon={Mail} value={employee.email} mono={false} /> : null}
          </div>
        </div>
      ) : null}
    </button>
  );
}

function TilesGrid({
  employees,
  onOpen,
  graphToken,
}: {
  employees: IaeEmployee[];
  onOpen: (contactId: number) => void;
  graphToken?: string | null;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 lg:grid-cols-6">
      {employees.map((employee) => (
        <PersonTile key={employee.contactId} employee={employee} onOpen={onOpen} graphToken={graphToken} />
      ))}
    </div>
  );
}

function DirectoryTable({
  employees,
  onRowClick,
  graphToken,
}: {
  employees: IaeEmployee[];
  onRowClick: (contactId: number) => void;
  graphToken?: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            <th className="w-[20%] px-4 py-3 font-semibold text-neutral-700">Name</th>
            <th className="w-[14%] px-4 py-3 font-semibold text-neutral-700">Department</th>
            <th className="w-[15%] px-4 py-3 font-semibold text-neutral-700">Title</th>
            <th className="w-[13%] px-4 py-3 font-semibold text-neutral-700">Desk Phone</th>
            <th className="w-[10%] px-4 py-3 font-semibold text-neutral-700">Extension</th>
            <th className="w-[13%] px-4 py-3 font-semibold text-neutral-700">Mobile</th>
            <th className="w-[15%] px-4 py-3 font-semibold text-neutral-700">Email</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-300">
          {employees.map((employee) => {
            const name = displayName(employee);
            const title = employee.jobTitle?.trim() || "";
            const dept = departmentOf(employee);
            const deskBase = formatE164ForDisplay(employee.workPhone) || "";
            const ext = employee.extension?.trim() || "";
            const desk = deskBase;
            const cell = formatE164ForDisplay(employee.cellPhone) || "";
            return (
              <tr
                key={employee.contactId}
                onClick={() => onRowClick(employee.contactId)}
                className="cursor-pointer transition-colors hover:bg-neutral-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <HubGraphAvatar name={name} email={employee.email} graphToken={graphToken} size="xl" />
                    <span className="font-medium text-neutral-900">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{dept}</td>
                <td className="px-4 py-3 text-neutral-600">{title}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{desk}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{ext || ""}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{cell}</td>
                <td className="px-4 py-3 text-neutral-500">{employee.email}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Directory body: search, department filter chips, view toggles (tiles/table,
 * alpha/dept), and the resulting grid or table.
 * Shared by the standalone Employee Directory page and
 * the inline reveal-under-button panel on Employee Services — both need the exact
 * same browsing behavior, just different surrounding chrome.
 */
export function EmployeeDirectoryPanel({ fromView }: { fromView: InternalView }) {
  const { navigate } = useInternalNavigation();
  const [mode, setMode] = useState<DirectoryMode>("tiles");
  const [tilesView, setTilesView] = useState<TilesView>("alpha");
  const [tableView, setTableView] = useState<TableView>("alpha");
  const [alphaSort, setAlphaSort] = useState<AlphaSort>("first");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>(ALL_DEPARTMENTS);
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [entraJobTitles, setEntraJobTitles] = useState<EntraJobTitleMap>(new Map());

  // Acquire Graph token for Microsoft profile photos + job titles
  useEffect(() => {
    let mounted = true;
    (async () => {
      const account = getActiveAccount();
      if (!account) return;
      try {
        const token = await acquireGraphAccessToken(account);
        if (mounted && token) setGraphToken(token);
        const titles = await fetchEntraJobTitles(token);
        if (mounted) setEntraJobTitles(titles);
      } catch { /* no token — falls back to initials */ }
    })();
    return () => { mounted = false; };
  }, []);

  const openProfile = (contactId: number) => navigate("employee-profile", { contactId, fromView });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["iae-staff-employees"],
    queryFn: fetchIaeStaffEmployees,
  });

  const employees = useMemo(() => {
    const deduped = dedupeEmployees(data ?? []);
    if (entraJobTitles.size === 0) return deduped;
    return deduped.map((e) => {
      if (e.jobTitle?.trim()) return e;
      const emailKey = (e.email ?? '').trim().toLowerCase();
      const entraTitle = emailKey ? entraJobTitles.get(emailKey) : undefined;
      return entraTitle ? { ...e, jobTitle: entraTitle } : e;
    });
  }, [data, entraJobTitles]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) =>
      [displayName(employee), employee.jobTitle ?? "", employee.roleName ?? "", employee.departmentName ?? "", employee.email]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

  /**
   * Chips are built from the search results, so their counts always match what a
   * click will actually show. Leadership-heavy departments sort first (Executive at
   * the top), then by headcount, then alphabetically.
   */
  const departmentChips = useMemo(() => {
    const counts = new Map<string, { count: number; weight: number }>();
    for (const employee of searched) {
      const name = departmentOf(employee);
      const entry = counts.get(name) ?? { count: 0, weight: 0 };
      entry.count += 1;
      entry.weight = Math.max(entry.weight, roleWeight(employee.roleName));
      counts.set(name, entry);
    }
    return Array.from(counts.entries())
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.weight - a.weight || b.count - a.count || a.name.localeCompare(b.name));
  }, [searched]);

  // A search can narrow away the chip that was selected; fall back to All rather than
  // leaving an invisible filter that renders an empty grid.
  const activeDepartment =
    department !== ALL_DEPARTMENTS && departmentChips.some((chip) => chip.name === department)
      ? department
      : ALL_DEPARTMENTS;

  const filtered = useMemo(
    () =>
      activeDepartment === ALL_DEPARTMENTS
        ? searched
        : searched.filter((employee) => departmentOf(employee) === activeDepartment),
    [searched, activeDepartment],
  );

  const alphaSorted = useMemo(
    () => [...filtered].sort((a, b) => compareByName(a, b, alphaSort)),
    [filtered, alphaSort],
  );

  const byDepartment = useMemo(() => {
    const groups = new Map<string, IaeEmployee[]>();
    for (const employee of filtered) {
      const dept = employee.departmentName?.trim() || "Unassigned";
      const bucket = groups.get(dept);
      if (bucket) bucket.push(employee);
      else groups.set(dept, [employee]);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dept, members]) => ({
        dept,
        members: members.sort(
          (a, b) => (a.departmentRank ?? 999) - (b.departmentRank ?? 999) || roleWeight(b.roleName) - roleWeight(a.roleName) || compareByName(a, b, "last"),
        ),
      }));
  }, [filtered]);

  const showChips =
    ((mode === "tiles" && tilesView === "dept") || (mode === "table" && tableView === "dept"))
    && departmentChips.length > 0;

  return (
    <>
      {/* Toolbar: search on the left, view/sort controls on the right */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm lg:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees by name, title, or department"
              aria-label="Search employees"
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            {mode === "tiles" && (
              <Segmented>
                {tilesView === "alpha" ? (
                  <span className="inline-flex items-center">
                    <Select
                      value={alphaSort}
                      onValueChange={(v) => setAlphaSort(v as AlphaSort)}
                    >
                      <SelectTrigger
                        aria-label="Alphabetical sort"
                        className="h-8 w-[145px] gap-1.5 rounded-md border-0 bg-white px-3 text-[13px] font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] focus:ring-1 focus:ring-black/[0.06]"
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
                    onClick={() => { setDepartment(ALL_DEPARTMENTS); setTilesView("alpha"); }}
                  >
                    <AlignLeft className="h-4 w-4" /> Alphabetical
                  </SegBtn>
                )}
                <SegBtn active={tilesView === "dept"} onClick={() => setTilesView("dept")}>
                  <Grid2x2 className="h-4 w-4" /> Department
                </SegBtn>
              </Segmented>
            )}

            {mode === "table" && (
              <Segmented>
                {tableView === "alpha" ? (
                  <span className="inline-flex items-center">
                    <Select
                      value={alphaSort}
                      onValueChange={(v) => setAlphaSort(v as AlphaSort)}
                    >
                      <SelectTrigger
                        aria-label="Alphabetical sort"
                        className="h-8 w-[145px] gap-1.5 rounded-md border-0 bg-white px-3 text-[13px] font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] focus:ring-1 focus:ring-black/[0.06]"
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
                    onClick={() => { setDepartment(ALL_DEPARTMENTS); setTableView("alpha"); }}
                  >
                    <AlignLeft className="h-4 w-4" /> Alphabetical
                  </SegBtn>
                )}
                <SegBtn active={tableView === "dept"} onClick={() => setTableView("dept")}>
                  <Grid2x2 className="h-4 w-4" /> Department
                </SegBtn>
              </Segmented>
            )}

            <Segmented>
              <SegBtn
                active={mode === "tiles"}
                onClick={() => setMode("tiles")}
                ariaLabel="Tile view"
              >
                <LayoutGrid className="h-4 w-4" /> Tiles
              </SegBtn>
              <SegBtn
                active={mode === "table"}
                onClick={() => setMode("table")}
                ariaLabel="Table view"
              >
                <Rows3 className="h-4 w-4" /> Table
              </SegBtn>
            </Segmented>
          </div>
        </div>

        {showChips ? (
          <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by department">
            <DepartmentChip
              label="All"
              count={searched.length}
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
                onClick={() =>
                  setDepartment((current) => (current === chip.name ? ALL_DEPARTMENTS : chip.name))
                }
              />
            ))}
          </div>
        ) : null}

        {/* Content */}
        {mode === "table" ? (
          isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
              <span className="sr-only">Loading employees</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-500">
              {employees.length === 0 ? "No staff employees found." : "No employees match your search."}
            </p>
          ) : tableView === "dept" ? (
            <div className="space-y-8">
              {byDepartment.map(({ dept, members }) => (
                <section key={dept}>
                  <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    {dept} <span className="text-neutral-400">· {members.length}</span>
                  </h2>
                  <DirectoryTable employees={members} onRowClick={openProfile} graphToken={graphToken} />
                </section>
              ))}
            </div>
          ) : (
            <DirectoryTable employees={alphaSorted} onRowClick={openProfile} graphToken={graphToken} />
          )
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading employees</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            {employees.length === 0 ? "No staff employees found." : "No employees match your search."}
          </p>
        ) : tilesView === "dept" ? (
          <div className="space-y-8">
            {byDepartment.map(({ dept, members }) => (
              <section key={dept}>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {dept} <span className="text-neutral-400">· {members.length}</span>
                </h2>
                <TilesGrid employees={members} onOpen={openProfile} graphToken={graphToken} />
              </section>
            ))}
          </div>
        ) : (
          <TilesGrid employees={alphaSorted} onOpen={openProfile} graphToken={graphToken} />
        )}
    </>
  );
}

export function EmployeeDirectoryPage() {
  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Employee Directory"
        subtitle="Browse the iAE team by tiles, department, or name — and open any profile."
      />

      <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 pt-10 sm:px-6 lg:px-6">
        <EmployeeDirectoryPanel fromView="employee-directory" />
      </main>
    </InternalPageFrame>
  );
}
