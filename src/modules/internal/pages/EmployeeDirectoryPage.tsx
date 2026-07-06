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

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
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

export function EmployeeDirectoryPage() {
  const { navigate } = useInternalNavigation();
  const [mode, setMode] = useState<DirectoryMode>("tiles");
  const [tilesView, setTilesView] = useState<TilesView>("alpha");
  const [tableView, setTableView] = useState<TableView>("alpha");
  const [alphaSort, setAlphaSort] = useState<AlphaSort>("first");
  const [search, setSearch] = useState("");

  const openProfile = (contactId: number) =>
    navigate("employee-profile", { contactId, fromView: "employee-directory" });

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

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Employee Directory"
        subtitle="Browse the iAE team by tiles, org chart, department, or name — and open any profile."
      />

      <main
        className={`mx-auto w-full px-4 pb-16 pt-10 sm:px-6 ${
          isOrgView ? "max-w-[1800px] lg:px-6" : "max-w-[1200px] lg:px-12"
        }`}
      >
        {/* View controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
            <SegBtn active={mode === "tiles"} onClick={() => setMode("tiles")}>
              <LayoutGrid className="h-4 w-4" /> Tiles
            </SegBtn>
            <SegBtn active={mode === "table"} onClick={() => setMode("table")}>
              <Rows3 className="h-4 w-4" /> Table
            </SegBtn>
          </div>

          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-1">
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
          </div>
        </div>

        {/* Alphabetical first/last toggle (tiles + table alpha views) */}
        {((mode === "tiles" && tilesView === "alpha") ||
          (mode === "table" && tableView === "alpha")) && (
          <div className="mb-4 flex items-center gap-2 text-[13px] text-neutral-600">
            <span className="font-semibold">Sort by:</span>
            <div className="inline-flex rounded-md border border-neutral-200 bg-white p-0.5">
              <SegBtn active={alphaSort === "first"} onClick={() => setAlphaSort("first")}>
                First name
              </SegBtn>
              <SegBtn active={alphaSort === "last"} onClick={() => setAlphaSort("last")}>
                Last name
              </SegBtn>
            </div>
          </div>
        )}

        {/* Search (all views except org chart, which has its own) */}
        {showSearch ? (
          <div className="relative mb-5 max-w-md">
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
      </main>
    </InternalPageFrame>
  );
}
