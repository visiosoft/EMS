import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import {
  fetchInternalOrgChartHierarchy,
  internalOrgChartHierarchyQueryKey,
} from "@/api/internalOrgChartApi";
import type {
  HierarchyNode,
  HierarchyMember,
  OrganizationChartMember,
  OrganizationChartNode,
} from "@/api/organizationChartApi";
import { getActiveAccount, acquireGraphAccessToken } from "@/auth/entra";

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

function memberMatches(m: AnyMember, q: string): boolean {
  if (!q) return true;
  return [m.displayName, m.email, m.jobTitle, m.roleName, m.departmentName]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function memberTitle(m: AnyMember): string {
  return m.jobTitle || m.roleName || "Internal staff";
}

// ── A compact person row (leaf reports + department members) ──
function MemberRow({
  member,
  query,
  onSelect,
  size = "sm",
}: {
  member: AnyMember;
  query: string;
  onSelect?: (contactId: number) => void;
  size?: "sm" | "xs";
}) {
  const accent = accentFor(member.displayName || member.email || "?");
  const dimmed = query ? !memberMatches(member, query) : false;
  const av = size === "sm" ? "h-9 w-9 text-[11px]" : "h-8 w-8 text-[10px]";
  return (
    <button
      type="button"
      onClick={() => onSelect?.(member.contactId)}
      className={`group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-all hover:border-neutral-200 hover:bg-neutral-50 ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-neutral-900 font-bold text-white ring-2 ring-offset-2 ${accent.ring} transition-transform group-hover:scale-105 ${av}`}
      >
        {initials(member.displayName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold text-neutral-900">
          {member.displayName || "—"}
        </span>
        <span className="block truncate text-[11px] leading-tight text-neutral-500">
          {memberTitle(member)}
        </span>
      </span>
    </button>
  );
}

// ── Hierarchy: a manager + their leaf reports grouped in one card ──
function TeamCard({
  node,
  query,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: HierarchyNode;
  query: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  onSelect?: (contactId: number) => void;
}) {
  const manager = node.member;
  const accent = accentFor(manager.displayName || manager.email || "?");
  const leafReports = node.children.filter((c) => c.children.length === 0);
  const subManagerCount = node.children.length - leafReports.length;
  const dimmed = query ? !memberMatches(manager, query) : false;
  const matched = query ? memberMatches(manager, query) : false;

  return (
    <article
      className={`hub-org-card w-[268px] overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-300 ${
        matched ? "border-neutral-900/70 ring-2 ring-neutral-900/60" : "border-neutral-200"
      } ${dimmed ? "opacity-40" : ""}`}
    >
      {/* Manager */}
      <div className="relative flex items-start gap-3 border-b border-neutral-100 bg-gradient-to-b from-neutral-50/70 to-white p-3">
        <button
          type="button"
          onClick={() => onSelect?.(manager.contactId)}
          className="group flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-neutral-900 text-[14px] font-bold text-white ring-2 ring-offset-2 ${accent.ring} transition-transform group-hover:scale-105`}
          >
            {initials(manager.displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-bold text-neutral-950">
                {manager.displayName || "—"}
              </span>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-neutral-500">
              {memberTitle(manager)}
            </span>
            {manager.departmentName ? (
              <span
                className={`mt-1.5 inline-block truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${accent.chip}`}
              >
                {manager.departmentName}
              </span>
            ) : null}
          </span>
        </button>
        {manager.email ? (
          <a
            href={`mailto:${manager.email}`}
            className="mt-0.5 shrink-0 text-neutral-300 transition-colors hover:text-neutral-700"
            aria-label={`Email ${manager.displayName}`}
            title={`Email ${manager.displayName}`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </div>

      {/* Leaf reports, listed inside the card */}
      {leafReports.length > 0 ? (
        <div className="flex flex-col gap-0.5 p-2">
          {leafReports.map((child) => (
            <MemberRow key={child.nodeId} member={child.member} query={query} onSelect={onSelect} />
          ))}
        </div>
      ) : null}

      {/* Footer: report count + collapse toggle for sub-teams */}
      {(subManagerCount > 0 || node.children.length > 0) && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {node.children.length} {node.children.length === 1 ? "report" : "reports"}
          </span>
          {subManagerCount > 0 ? (
            <button
              type="button"
              onClick={() => onToggle(node.nodeId)}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> {subManagerCount} teams
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Collapse
                </>
              )}
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

// ── Recursive branch: team card + its sub-manager branches ──
function Branch({
  node,
  depth,
  query,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: HierarchyNode;
  depth: number;
  query: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (contactId: number) => void;
}) {
  const subManagers = node.children.filter((c) => c.children.length > 0);
  const isCollapsed = collapsed.has(node.nodeId);
  const showSub = subManagers.length > 0 && !isCollapsed;

  return (
    <div className="flex flex-col items-center">
      <div className="hub-org-branch relative z-10" style={{ animationDelay: `${depth * 50}ms` }}>
        <TeamCard
          node={node}
          query={query}
          collapsed={isCollapsed}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      </div>

      {showSub ? (
        <div className="relative pt-8">
          <span className="hub-org-line absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-neutral-200" />
          <ul className="relative flex items-start justify-center">
            {subManagers.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === subManagers.length - 1;
              const only = subManagers.length === 1;
              return (
                <li key={child.nodeId} className="relative flex flex-col items-center px-6">
                  {!only ? (
                    <span
                      className="absolute top-0 h-px bg-neutral-200"
                      style={{ left: isFirst ? "50%" : 0, right: isLast ? "50%" : 0 }}
                    />
                  ) : null}
                  <span className="hub-org-line absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-neutral-200" />
                  <div className="pt-6">
                    <Branch
                      node={child}
                      depth={depth + 1}
                      query={query}
                      collapsed={collapsed}
                      onToggle={onToggle}
                      onSelect={onSelect}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ── Department / loose-group card, sized as a node hanging off the company root ──
function DepartmentCard({
  label,
  members,
  query,
  onSelect,
}: {
  label: string;
  members: AnyMember[];
  query: string;
  onSelect?: (contactId: number) => void;
}) {
  const accent = accentFor(label);
  const anyMatch = query ? members.some((m) => memberMatches(m, query)) : true;
  return (
    <article
      className={`hub-org-card w-[268px] flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition-all duration-300 ${
        query && !anyMatch ? "opacity-40" : ""
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
      <div className="flex flex-col gap-0.5 p-2">
        {members.map((member, i) => (
          <MemberRow
            key={`${member.contactId}-${i}`}
            member={member}
            query={query}
            onSelect={onSelect}
          />
        ))}
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
function departmentGroups(nodes: OrganizationChartNode[]): { label: string; members: OrganizationChartMember[] }[] {
  const forest = buildDepForest(nodes);
  const tops = forest.flatMap((root) =>
    root.members.length === 0 && root.children.length > 0 ? root.children : [root],
  );
  const groups: { label: string; members: OrganizationChartMember[] }[] = [];
  const walk = (node: DepTreeNode) => {
    if (node.members.length > 0) groups.push({ label: node.label, members: node.members });
    node.children.forEach(walk);
  };
  tops.forEach(walk);
  return groups.sort((a, b) => a.label.localeCompare(b.label));
}

export function HubOrgChart({ onSelectMember }: { onSelectMember?: (contactId: number) => void }) {
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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

  // Hierarchy mode: real roots (managers with reports) form the tree; everyone else
  // (lone roots + unmatched) is grouped compactly by department below — exactly like EMS.
  const { realRoots, looseGroups } = useMemo(() => {
    if (!data || data.mode !== "hierarchy" || !data.roots) {
      return { realRoots: [] as HierarchyNode[], looseGroups: [] as { label: string; members: HierarchyMember[] }[] };
    }
    const real = data.roots.filter((r) => r.children.length > 0);
    const lone = data.roots.filter((r) => r.children.length === 0).map((r) => r.member);
    const loose = [...lone, ...(data.unmatched ?? [])];
    const byDept = new Map<string, HierarchyMember[]>();
    loose.forEach((m) => {
      const dept = m.departmentName || "Unassigned";
      const bucket = byDept.get(dept);
      if (bucket) bucket.push(m);
      else byDept.set(dept, [m]);
    });
    const groups = Array.from(byDept.entries())
      .map(([label, members]) => ({ label, members }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { realRoots: real, looseGroups: groups };
  }, [data]);

  const depGroups = useMemo(
    () => (data && data.mode !== "hierarchy" && data.nodes ? departmentGroups(data.nodes) : []),
    [data],
  );

  const isHierarchy = realRoots.length > 0;
  const hasContent = isHierarchy || looseGroups.length > 0 || depGroups.length > 0;

  // Children of the company root — mirrors EMS: manager branches first, then
  // department groups (loose members in hierarchy mode, or plain departments).
  const rootChildren = useMemo(() => {
    // looseGroups (hierarchy mode) and depGroups (department mode) are mutually
    // exclusive — only one is ever populated — so concatenating both is safe.
    const groups = [...looseGroups, ...depGroups];
    return [
      ...realRoots.map((node) => ({ type: "branch" as const, node })),
      ...groups.map((group) => ({
        type: "dept" as const,
        label: group.label,
        members: group.members as AnyMember[],
      })),
    ];
  }, [realRoots, looseGroups, depGroups]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a person…"
            aria-label="Search the org chart"
            className="h-9 w-full rounded-full border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
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
            className="grid h-7 w-7 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
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
              <article className="hub-org-card relative z-10 w-[268px] flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
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
                      const key =
                        child.type === "branch" ? child.node.nodeId : `dept-${child.label}`;
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
                            {child.type === "branch" ? (
                              <Branch
                                node={child.node}
                                depth={0}
                                query={query}
                                collapsed={collapsed}
                                onToggle={toggle}
                                onSelect={onSelectMember}
                              />
                            ) : (
                              <DepartmentCard
                                label={child.label}
                                members={child.members}
                                query={query}
                                onSelect={onSelectMember}
                              />
                            )}
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

      {/* Fallback hint */}
      {data && data.mode !== "hierarchy" ? (
        <p className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          Showing the department view. Sign in with your iAE account to reveal the full reporting hierarchy.
        </p>
      ) : null}
    </div>
  );
}
