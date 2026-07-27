import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Mail,
  Minus,
  Network,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  fetchInternalOrgChartHierarchy,
  internalOrgChartHierarchyQueryKey,
} from "@/api/internalOrgChartApi";
import type {
  HierarchyMember,
  OrganizationChartMember,
  OrganizationChartNode,
} from "@/api/organizationChartApi";
import { getActiveAccount, acquireGraphAccessToken } from "@/auth/entra";
import { HubGraphAvatar } from "@/components/ems/GraphAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.4;
const ZOOM_STEP = 0.15;

type AnyMember = HierarchyMember | OrganizationChartMember;

/** Soft, tasteful accent per person/department — deterministic from a seed string. */
const ACCENTS = [
  { ring: "ring-rose-200", chip: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
  { ring: "ring-amber-200", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  { ring: "ring-emerald-200", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  { ring: "ring-sky-200", chip: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
  { ring: "ring-violet-200", chip: "bg-violet-50 text-violet-700", dot: "bg-violet-400" },
  { ring: "ring-fuchsia-200", chip: "bg-fuchsia-50 text-fuchsia-700", dot: "bg-fuchsia-400" },
];

function accentFor(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return ACCENTS[sum % ACCENTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function memberMatches(m: AnyMember, q: string, department?: string): boolean {
  const matchesQuery = !q || [m.displayName, m.email, m.jobTitle, m.roleName, m.departmentName]
    .join(" ")
    .toLowerCase()
    .includes(q);
  const matchesDept = !department || m.departmentName === department;
  return matchesQuery && matchesDept;
}

function memberTitle(m: AnyMember): string {
  return m.jobTitle || m.roleName || "Internal staff";
}

// ── A compact person row (leaf reports + department members) ──
function MemberRow({
  member,
  query,
  department,
  onSelect,
  size = "sm",
  graphToken,
}: {
  member: AnyMember;
  query: string;
  department?: string;
  onSelect?: (contactId: number) => void;
  size?: "sm" | "xs";
  graphToken?: string | null;
}) {
  const accent = accentFor(member.displayName || member.email || "?");
  const dimmed = (query || department) ? !memberMatches(member, query, department) : false;
  return (
    <div
      className={`group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-all hover:border-neutral-200 hover:bg-neutral-50 ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(member.contactId)}
        className="shrink-0 transition-transform group-hover:scale-105"
      >
        <HubGraphAvatar
          name={member.displayName}
          email={member.email}
          graphToken={graphToken}
          size={size === "sm" ? "sm" : "xs"}
          ringClass={accent.ring}
        />
      </button>
      <span className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onSelect?.(member.contactId)}
          className="block text-[12.5px] font-semibold text-neutral-900 hover:underline"
        >
          {member.displayName || "—"}
        </button>
        <span className="block text-[11px] leading-tight text-neutral-500">
          {member.departmentName ? `${member.departmentName} · ` : ""}{memberTitle(member)}
        </span>
        {(member.workPhone || member.cellPhone) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-neutral-400">
            {member.workPhone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" aria-hidden />
                <a href={`tel:${member.workPhone}`} className="hover:text-neutral-700" onClick={e => e.stopPropagation()}>{member.workPhone}</a>
              </span>
            )}
            {member.cellPhone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" aria-hidden />
                <a href={`tel:${member.cellPhone}`} className="hover:text-neutral-700" onClick={e => e.stopPropagation()}>{member.cellPhone}</a>
              </span>
            )}
          </span>
        )}
        {member.email && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
            <Mail className="h-2.5 w-2.5" aria-hidden />
            <a href={`mailto:${member.email}`} className="hover:text-neutral-700" onClick={e => e.stopPropagation()}>{member.email}</a>
          </span>
        )}
      </span>
    </div>
  );
}

// ── Department / loose-group card, sized as a node hanging off the company root ──
function DepartmentCard({
  label,
  members,
  query,
  department,
  onSelect,
  graphToken,
}: {
  label: string;
  members: AnyMember[];
  query: string;
  department?: string;
  onSelect?: (contactId: number) => void;
  graphToken?: string | null;
}) {
  const accent = accentFor(label);
  const anyMatch = (query || department) ? members.some((m) => memberMatches(m, query, department)) : true;
  return (
    <article
      className={`hub-org-card w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition-all duration-300 ${
        (query || department) && !anyMatch ? "opacity-40" : ""
      }`}
    >
      <header className="flex items-center gap-2.5 border-b border-neutral-100 bg-gradient-to-b from-neutral-50/70 to-white px-3 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
        <h3 className="flex-1 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-600">
          {label}
        </h3>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
          {members.length}
        </span>
      </header>
      <div className="flex flex-col p-2">
        {(() => {
          let lastTier = '';
          return members.map((member, i) => {
            const tier = hubTierLabel(member);
            const showHeader = tier !== lastTier;
            lastTier = tier;
            return (
              <div key={`${member.contactId}-${i}`}>
                {showHeader && (
                  <div className="px-2 pt-2 pb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">{tier}</span>
                  </div>
                )}
                <MemberRow
                  member={member}
                  query={query}
                  department={department}
                  onSelect={onSelect}
                  graphToken={graphToken}
                />
              </div>
            );
          });
        })()}
      </div>
    </article>
  );
}

type DepTreeNode = OrganizationChartNode & { children: DepTreeNode[] };

function buildDepForest(nodes: OrganizationChartNode[]): DepTreeNode[] {
  const byId = new Map<number, DepTreeNode>();
  nodes.forEach((n) => byId.set(n.nodeId, { ...n, children: [] }));
  const roots: DepTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentNodeId != null ? byId.get(node.parentNodeId) : null;
    if (parent && parent.nodeId !== node.nodeId) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Flatten department forest into department-level groups (skips the empty company root). */
/** Leadership weight so directors sort above managers, managers above coordinators, etc. */
function hubMemberRoleWeight(m: AnyMember): number {
  const r = (m.jobTitle || m.roleName || "").toLowerCase();
  if (/\b(ceo|chief|president|owner|founder)\b/.test(r)) return 100;
  if (/\b(evp|svp|vp|vice president)\b/.test(r)) return 80;
  if (/\b(director|head)\b/.test(r)) return 60;
  if (/\b(manager|lead|supervisor)\b/.test(r)) return 40;
  if (/\b(coordinator|assistant)\b/.test(r)) return 20;
  return 0;
}

function hubTierLabel(m: AnyMember): string {
  const weight = hubMemberRoleWeight(m);
  if (weight >= 100) return 'Executive';
  if (weight >= 80) return 'Vice President';
  if (weight >= 60) return 'Director';
  if (weight >= 40) return 'Manager';
  if (weight >= 20) return 'Coordinator';
  return 'Team Member';
}

function departmentGroups(nodes: OrganizationChartNode[]): { label: string; members: OrganizationChartMember[] }[] {
  const forest = buildDepForest(nodes);
  const tops = forest.flatMap((root) =>
    root.members.length === 0 && root.children.length > 0 ? root.children : [root],
  );
  const groups: { label: string; members: OrganizationChartMember[] }[] = [];
  const walk = (node: DepTreeNode) => {
    if (node.members.length > 0) {
      const sorted = [...node.members].sort(
        (a, b) => hubMemberRoleWeight(b) - hubMemberRoleWeight(a) || a.displayName.localeCompare(b.displayName),
      );
      groups.push({ label: node.label, members: sorted });
    }
    node.children.forEach(walk);
  };
  tops.forEach(walk);
  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

export function HubOrgChart({ onSelectMember }: { onSelectMember?: (contactId: number) => void }) {
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [zoom, setZoom] = useState(1);
  const query = search.trim().toLowerCase();

  // Silently acquire a Graph token so we can show the true manager hierarchy (same as EMS).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const account = getActiveAccount();
      if (!account) return;
      try {
        const token = await acquireGraphAccessToken(account);
        if (mounted && token) setGraphToken(token);
      } catch {
        /* no token → department view */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const chartQuery = useQuery({
    queryKey: [...internalOrgChartHierarchyQueryKey, graphToken],
    queryFn: () => fetchInternalOrgChartHierarchy(graphToken ?? undefined),
    staleTime: 60_000,
  });

  const data = chartQuery.data;

  // Always show department view (same as EMS — hierarchy tab removed per request).
  const depGroups = useMemo(
    () => (data?.nodes ? departmentGroups(data.nodes) : []),
    [data],
  );

  const hasContent = depGroups.length > 0;

  // All children are department groups — no hierarchy branches.
  const rootChildren = useMemo(() => {
    return depGroups.map((group) => ({
      type: "dept" as const,
      label: group.label,
      members: group.members as AnyMember[],
    }));
  }, [depGroups]);

  // Collect all unique department names for the filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const child of rootChildren) {
      if (child.label && child.label !== "Unassigned") set.add(child.label);
    }
    return Array.from(set).sort();
  }, [rootChildren]);

  // Count matching people for the filter badge
  const matchingPeople = useMemo(() => {
    if (!query && !departmentFilter) return 0;
    let count = 0;
    for (const child of rootChildren) {
      count += child.members.filter((m) => memberMatches(m, query, departmentFilter)).length;
    }
    return count;
  }, [rootChildren, query, departmentFilter]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white">
      <style>{`
        @keyframes hubOrgRise { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes hubOrgLine { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .hub-org-branch { animation: hubOrgRise .5s cubic-bezier(.22,1,.36,1) both; }
        .hub-org-card { animation: hubOrgRise .45s cubic-bezier(.22,1,.36,1) both; }
        .hub-org-line { transform-origin: top; animation: hubOrgLine .4s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .hub-org-branch, .hub-org-card, .hub-org-line { animation: none; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-neutral-900">
          <Network className="h-4 w-4" />
          <span className="text-sm font-semibold">Org Chart</span>
          {data?.stats ? (
            <span className="text-[12px] text-neutral-500">
              · {data.stats.people} people · {data.stats.departments} departments
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 ml-auto">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, titles, or email"
              aria-label="Search the org chart"
              className="h-9 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-8 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <Select
            value={departmentFilter || "all"}
            onValueChange={(val) => setDepartmentFilter(val === "all" ? "" : val)}
          >
            <SelectTrigger className="h-9 w-[180px] border-neutral-300 bg-white text-sm focus:ring-1 focus:ring-black">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(query || departmentFilter) ? (
            <span className="text-xs font-medium text-neutral-500 px-2">{matchingPeople} matches</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="grid h-7 min-w-10 place-items-center rounded-full text-[11px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-[calc(100vh-15rem)] overflow-auto p-6">
        {chartQuery.isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-neutral-400" aria-hidden />
          </div>
        ) : chartQuery.isError ? (
          <p className="py-24 text-center text-sm text-neutral-500">The org chart couldn't be loaded.</p>
        ) : !hasContent ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-neutral-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">No org chart data available yet.</p>
          </div>
        ) : (
          <div
            className="mx-auto w-max origin-top transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Company root — every branch and department hangs off this node. */}
            <div className="flex flex-col items-center">
              <article className="hub-org-card relative z-10 w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700">
                  <Network className="h-6 w-6" />
                </span>
                <h2 className="text-[16px] font-bold tracking-tight text-neutral-950">
                  {data?.company?.companyName || "Organization"}
                </h2>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Organization
                </p>
              </article>

              {rootChildren.length > 0 ? (
                <div className="relative w-full pt-8">
                  <span className="hub-org-line absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-neutral-200" />
                  <ul className="relative flex items-start justify-center">
                    {rootChildren.map((child, index) => {
                      const isFirst = index === 0;
                      const isLast = index === rootChildren.length - 1;
                      const only = rootChildren.length === 1;
                      const key = `dept-${child.label}`;
                      return (
                        <li key={key} className="relative flex flex-col items-center px-6">
                          {!only ? (
                            <span
                              className="absolute top-0 h-px bg-neutral-200"
                              style={{ left: isFirst ? "50%" : 0, right: isLast ? "50%" : 0 }}
                            />
                          ) : null}
                          <span className="hub-org-line absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-neutral-200" />
                          <div className="pt-6">
                            <DepartmentCard
                              label={child.label}
                              members={child.members}
                              query={query}
                              department={departmentFilter}
                              onSelect={onSelectMember}
                              graphToken={graphToken}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
