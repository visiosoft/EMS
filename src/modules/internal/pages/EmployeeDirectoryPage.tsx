import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Loader2, Network, RefreshCw, Rows3, Search } from "lucide-react";
import { HubOrgChart } from "../components/HubOrgChart";
import { fetchIaeStaffEmployees, type IaeEmployee } from "@/api/iaeEmployeesApi";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { TeamMemberAvatar } from "../components/TeamMemberAvatar";
import {
  IaeEmployeesTable,
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
type TilesView = "org" | "alpha" | "dept";
type TableView = "alpha" | "dept";
type AlphaSort = "first" | "last";

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

function PersonTile({
  employee,
  onOpen,
}: {
  employee: IaeEmployee;
  onOpen: (contactId: number) => void;
}) {
  const mobile = formatE164ForDisplay(employee.cellPhone) || formatE164ForDisplay(employee.workPhone);
  return (
    <button
      type="button"
      onClick={() => onOpen(employee.contactId)}
      className="group flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      <TeamMemberAvatar className="h-16 w-16 rounded-full" alt={displayName(employee)} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">{displayName(employee)}</p>
        <p className="mt-0.5 truncate text-[13px] text-neutral-600">
          {employee.roleName || "Internal staff"}
        </p>
        {employee.departmentName ? (
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            {employee.departmentName}
          </p>
        ) : null}
        {mobile ? <p className="mt-2 truncate text-[12px] text-neutral-500">{mobile}</p> : null}
      </div>
    </button>
  );
}

function TilesGrid({
  employees,
  onOpen,
}: {
  employees: IaeEmployee[];
  onOpen: (contactId: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {employees.map((employee) => (
        <PersonTile key={employee.contactId} employee={employee} onOpen={onOpen} />
      ))}
    </div>
  );
}

/**
 * Directory body: search, view toggles (tiles/table, org/alpha/dept), and the
 * resulting grid/chart/table. Shared by the standalone Employee Directory page and
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

  const openProfile = (contactId: number) => navigate("employee-profile", { contactId, fromView });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["iae-staff-employees"],
    queryFn: fetchIaeStaffEmployees,
  });

  const employees = useMemo(() => dedupeEmployees(data ?? []), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) =>
      [displayName(employee), employee.roleName ?? "", employee.departmentName ?? "", employee.email]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, search]);

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
          (a, b) => roleWeight(b.roleName) - roleWeight(a.roleName) || compareByName(a, b, "last"),
        ),
      }));
  }, [filtered]);

  const isOrgView = mode === "tiles" && tilesView === "org";
  const showSearch = !isOrgView;
  const alphaActive =
    (mode === "tiles" && tilesView === "alpha") || (mode === "table" && tableView === "alpha");

  return (
    <>
      {/* Toolbar: search on the left, view/sort controls on the right */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          {showSearch ? (
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
          ) : (
            <div className="hidden lg:block lg:flex-1" />
          )}

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
            {alphaActive ? (
              <Select value={alphaSort} onValueChange={(value) => setAlphaSort(value as AlphaSort)}>
                <SelectTrigger
                  aria-label="Sort employees"
                  className="h-10 w-[170px] rounded-lg border-neutral-200 bg-white text-[13px] font-medium text-neutral-800 focus:ring-1 focus:ring-black"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">Sort: First name</SelectItem>
                  <SelectItem value="last">Sort: Last name</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            <Segmented>
              {mode === "tiles" ? (
                <>
                  <SegBtn active={tilesView === "org"} onClick={() => setTilesView("org")}>
                    <Network className="h-4 w-4" /> Org Chart
                  </SegBtn>
                  <SegBtn active={tilesView === "alpha"} onClick={() => setTilesView("alpha")}>
                    Alphabetical
                  </SegBtn>
                  <SegBtn active={tilesView === "dept"} onClick={() => setTilesView("dept")}>
                    Department
                  </SegBtn>
                </>
              ) : (
                <>
                  <SegBtn active={tableView === "dept"} onClick={() => setTableView("dept")}>
                    Department
                  </SegBtn>
                  <SegBtn active={tableView === "alpha"} onClick={() => setTableView("alpha")}>
                    Alphabetical
                  </SegBtn>
                </>
              )}
            </Segmented>

            <Segmented>
              <SegBtn active={mode === "tiles"} onClick={() => setMode("tiles")} ariaLabel="Tile view">
                <LayoutGrid className="h-4 w-4" /> Tiles
              </SegBtn>
              <SegBtn active={mode === "table"} onClick={() => setMode("table")} ariaLabel="Table view">
                <Rows3 className="h-4 w-4" /> Table
              </SegBtn>
            </Segmented>
          </div>
        </div>

        {/* Content */}
        {mode === "tiles" && tilesView === "org" ? (
          <HubOrgChart onSelectMember={openProfile} />
        ) : mode === "table" ? (
          <IaeEmployeesTable
            searchable={false}
            maxVisibleRows={null}
            title={null}
            onRowClick={(employee) => openProfile(employee.contactId)}
            groupByDepartment={tableView === "dept"}
            sortMode={tableView === "alpha" ? (alphaSort === "last" ? "name-last" : "name-first") : undefined}
          />
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
                <TilesGrid employees={members} onOpen={openProfile} />
              </section>
            ))}
          </div>
        ) : (
          <TilesGrid employees={alphaSorted} onOpen={openProfile} />
        )}
    </>
  );
}

export function EmployeeDirectoryPage() {
  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Employee Directory"
        subtitle="Browse the iAE team by tiles, org chart, department, or name — and open any profile."
      />

      <main className="mx-auto w-full max-w-[1800px] px-4 pb-16 pt-10 sm:px-6 lg:px-6">
        <EmployeeDirectoryPanel fromView="employee-directory" />
      </main>
    </InternalPageFrame>
  );
}
