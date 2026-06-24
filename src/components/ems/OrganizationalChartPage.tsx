import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMsal } from '@azure/msal-react';
import {
  Mail,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchOrganizationChartHierarchy,
  organizationChartHierarchyQueryKey,
  type OrganizationChartNode,
  type HierarchyNode,
  type HierarchyMember,
} from '@/api/organizationChartApi';
import { Avatar } from './Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getActiveAccount, acquireGraphAccessToken } from '@/auth/entra';

// ─── Department-mode tree types ───
type DepTreeNode = OrganizationChartNode & {
  children: DepTreeNode[];
  depth: number;
};

// ─── Hierarchy-mode tree types ───
// We'll augment HierarchyNode for UI state
type UINode = HierarchyNode & {
  depth: number;
  collapsed?: boolean;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.3;
const ZOOM_STEP = 0.15;

// ─── Shared Helpers ───

function getNodeToneByString(source: string): string {
  const tones = [
    'border-l-ems-accent',
    'border-l-ems-blue',
    'border-l-ems-amber',
    'border-l-ems-purple',
    'border-l-ems-green',
    'border-l-ems-coral',
  ];
  const value = Array.from(source).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return tones[value % tones.length];
}

// ─── Hierarchy Mode Logic ───

function flattenHierarchy(roots: UINode[]): UINode[] {
  const rows: UINode[] = [];
  const visit = (node: UINode, depth: number) => {
    node.depth = depth;
    rows.push(node);
    node.children.forEach(c => visit(c as UINode, depth + 1));
  };
  roots.forEach(r => visit(r, 0));
  return rows;
}

function hierarchyMemberMatches(
  member: HierarchyMember,
  query: string,
  departmentFilter: string,
): boolean {
  const matchesQuery =
    !query ||
    [
      member.displayName,
      member.email,
      member.jobTitle,
      member.roleName,
      member.departmentName,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  const matchesDepartment =
    !departmentFilter || member.departmentName === departmentFilter;
  return matchesQuery && matchesDepartment;
}

function HierarchyTeamCard({
  node,
  query,
  department,
  onToggleCollapse,
}: {
  node: UINode;
  query: string;
  department: string;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const manager = node.member;
  const leafReports = node.children.filter(c => (c as UINode).children.length === 0) as UINode[];
  
  const hasFilter = Boolean(query || department);
  const managerMatches = hierarchyMemberMatches(manager, query, department);
  const anyLeafMatches = leafReports.some(c => hierarchyMemberMatches(c.member, query, department));
  const cardHasMatches = managerMatches || anyLeafMatches;
  
  const tone = getNodeToneByString(manager.departmentName || manager.displayName);

  return (
    <article
      className={cn(
        'org-hierarchy-card relative w-[250px] flex-shrink-0 overflow-hidden rounded-xl border border-border border-l-4 bg-card/80 backdrop-blur-md text-left shadow-sm',
        tone,
        hasFilter && !cardHasMatches && 'org-search-no-match',
        cardHasMatches && hasFilter && 'ring-2 ring-ems-accent/25 shadow-md',
      )}
    >
      <div className={cn("flex flex-col gap-2 p-3 transition-colors", 
          managerMatches && hasFilter && "bg-ems-accent/10",
          leafReports.length > 0 ? "border-b border-border bg-elevated/40" : "bg-card"
      )}>
        {node.children.length > 0 && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Team Lead
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-ems-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-ems-accent">
                {node.children.length} Reports
              </span>
              <button
                type="button"
                onClick={() => onToggleCollapse(node.nodeId)}
                className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition hover:bg-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border"
                title={node.collapsed ? 'Expand team' : 'Collapse team'}
                aria-label={node.collapsed ? 'Expand team' : 'Collapse team'}
              >
                {node.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar name={manager.displayName} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="truncate text-[14px] font-bold tracking-tight text-text-primary">
                {manager.displayName}
              </p>
              {manager.email && (
                <a
                  href={`mailto:${manager.email}`}
                  className="mt-0.5 shrink-0 text-text-muted transition hover:text-ems-accent"
                  title={`Email ${manager.displayName}`}
                  aria-label={`Email ${manager.displayName}`}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium leading-tight text-text-secondary line-clamp-2">
              {manager.jobTitle || manager.roleName || 'Internal staff'}
            </p>
            {manager.departmentName && (
              <p className="mt-1.5 truncate text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {manager.departmentName}
              </p>
            )}
          </div>
        </div>
      </div>

      {leafReports.length > 0 && (
        <div 
          className={cn(
            "org-subtree-content bg-card",
            node.collapsed && "collapsed"
          )}
        >
          <div className="divide-y divide-border/50">
            {leafReports.map(child => {
              const highlighted = hierarchyMemberMatches(child.member, query, department);
              return (
                <div
                  key={child.nodeId}
                  className={cn(
                    "group flex items-start gap-2.5 px-3 py-2.5 transition-colors",
                    highlighted && hasFilter ? "bg-ems-accent/15" : "hover:bg-hover/50"
                  )}
                >
                  <Avatar name={child.member.displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">
                      {child.member.displayName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                      {child.member.jobTitle || child.member.roleName || 'Internal staff'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {node.children.filter(c => (c as UINode).children.length > 0).length > 0 && !node.collapsed && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
      )}
    </article>
  );
}

function HierarchyBranchContent({
  node,
  query,
  department,
  onToggleCollapse,
}: {
  node: UINode;
  query: string;
  department: string;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const managerReports = node.children.filter(c => (c as UINode).children.length > 0) as UINode[];

  return (
    <div className="relative flex flex-col items-center">
      {/* Node Content */}
      <div className="relative z-10 py-6">
        <HierarchyTeamCard
          node={node}
          query={query}
          department={department}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Children Container (Only Manager Reports) */}
      {managerReports.length > 0 && (
        <div 
          className={cn(
            'org-subtree-content w-full relative pt-6',
            node.collapsed && 'collapsed'
          )}
        >
          {/* Vertical line dropping from parent */}
          <div className="org-line-draw absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border" />
          
          <ul className="relative flex justify-center">
            {managerReports.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === managerReports.length - 1;
              const isOnlyChild = managerReports.length === 1;

              return (
                <li key={child.nodeId} className="relative flex flex-col items-center px-3">
                  {/* Top connector lines for children */}
                  {!isOnlyChild && (
                    <>
                      <div 
                        className={cn(
                          'absolute top-0 h-px bg-border org-line-draw',
                          isFirst ? 'left-1/2 right-0' : 
                          isLast ? 'left-0 right-1/2' : 
                          'left-0 right-0'
                        )} 
                      />
                      <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border org-line-draw" />
                    </>
                  )}
                  {isOnlyChild && (
                    <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border org-line-draw" />
                  )}

                  <HierarchyBranchContent
                    node={child}
                    query={query}
                    department={department}
                    onToggleCollapse={onToggleCollapse}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Department Mode Logic (Fallback) ───

function buildDepForest(nodes: OrganizationChartNode[]): DepTreeNode[] {
  const byId = new Map<number, DepTreeNode>();
  nodes.forEach((node) => {
    byId.set(node.nodeId, { ...node, children: [], depth: 0 });
  });

  const roots: DepTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentNodeId != null ? byId.get(node.parentNodeId) : null;
    if (parent && parent.nodeId !== node.nodeId) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (items: DepTreeNode[], depth: number) => {
    items.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.nodeId - right.nodeId,
    );
    items.forEach((item) => {
      item.depth = depth;
      item.members.sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.displayName.localeCompare(right.displayName),
      );
      sortNodes(item.children, depth + 1);
    });
  };
  sortNodes(roots, 0);
  return roots;
}

function flattenDepForest(roots: DepTreeNode[]): DepTreeNode[] {
  const rows: DepTreeNode[] = [];
  const visit = (node: DepTreeNode) => {
    rows.push(node);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return rows;
}

function depMemberMatches(
  member: { displayName: string; email: string; jobTitle: string; roleName: string; departmentName: string; },
  query: string,
  department: string,
): boolean {
  const matchesQuery =
    !query ||
    [
      member.displayName,
      member.email,
      member.jobTitle,
      member.roleName,
      member.departmentName,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  const matchesDepartment =
    !department || member.departmentName === department;
  return matchesQuery && matchesDepartment;
}

function DepNodeCard({
  node,
  query,
  department,
}: {
  node: OrganizationChartNode;
  query: string;
  department: string;
}) {
  const hasFilter = Boolean(query || department);
  const matchingMemberIds = new Set(
    node.members
      .filter((member) => depMemberMatches(member, query, department))
      .map((member) => member.memberId),
  );
  const labelMatches = Boolean(query && node.label.toLowerCase().includes(query));
  const nodeMatches = labelMatches || matchingMemberIds.size > 0;
  const tone = getNodeToneByString(node.members[0]?.departmentName || node.label || String(node.nodeId));

  return (
    <article
      className={cn(
        'org-hierarchy-card w-[238px] overflow-hidden rounded-lg border border-border border-l-[3px] bg-card text-left shadow-sm transition duration-200',
        tone,
        hasFilter && !nodeMatches && 'opacity-35 grayscale-[0.35]',
        nodeMatches && hasFilter && 'ring-2 ring-ems-accent/25 shadow-md',
      )}
    >
      {(node.label || node.members.length > 1) && (
        <div className="flex min-h-8 items-center justify-between gap-2 border-b border-border bg-elevated px-3 py-1.5">
          <span className="truncate text-[10px] font-semibold uppercase text-text-muted">
            {node.label || 'Shared leadership'}
          </span>
          {node.members.length > 1 ? (
            <span className="shrink-0 rounded bg-ems-accent-dim px-1.5 py-0.5 text-[10px] font-semibold text-ems-accent">
              {node.members.length}
            </span>
          ) : null}
        </div>
      )}

      <div className="divide-y divide-border/70">
        {node.members.length ? (
          node.members.map((member) => {
            const highlighted = matchingMemberIds.has(member.memberId);
            return (
              <div
                key={member.memberId}
                className={cn(
                  'group flex min-w-0 gap-2.5 px-3 py-2.5 transition-colors',
                  highlighted && hasFilter ? 'bg-ems-accent-dim/45' : 'hover:bg-hover/55',
                )}
              >
                <Avatar name={member.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-tight text-text-primary">
                      {member.displayName}
                    </p>
                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted opacity-70 transition hover:bg-surface hover:text-ems-accent group-hover:opacity-100"
                        title={`Email ${member.displayName}`}
                        aria-label={`Email ${member.displayName}`}
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
                    {member.jobTitle || member.roleName || 'Internal staff'}
                  </p>
                  {member.departmentName ? (
                    <p className="mt-1 truncate text-[10px] font-medium text-text-muted">
                      {member.departmentName}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-3 py-3 text-xs text-text-muted">
            {node.label || 'Unassigned chart node'}
          </div>
        )}
      </div>
    </article>
  );
}

function DepTreeBranch({
  node,
  query,
  department,
}: {
  node: DepTreeNode;
  query: string;
  department: string;
}) {
  return (
    <li>
      <DepNodeCard node={node} query={query} department={department} />
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <DepTreeBranch
              key={child.nodeId}
              node={child}
              query={query}
              department={department}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// ─── Main Page Component ───

export function OrganizationalChartPage() {
  const { instance, accounts } = useMsal();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [zoom, setZoom] = useState(1);
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'auto' | 'hierarchy' | 'department'>('auto');

  const query = search.trim().toLowerCase();

  // Try to acquire Graph Token silently to load true hierarchy
  useEffect(() => {
    let mounted = true;
    const fetchToken = async () => {
      const account = getActiveAccount(instance, accounts);
      if (!account) return;
      try {
        const token = await acquireGraphAccessToken(account);
        if (mounted && token) setGraphToken(token);
      } catch (err) {
        console.warn('Failed to acquire Graph token for Org Chart hierarchy', err);
      }
    };
    fetchToken();
    return () => { mounted = false; };
  }, [instance, accounts]);

  const chartQuery = useQuery({
    queryKey: [...organizationChartHierarchyQueryKey, graphToken],
    queryFn: () => fetchOrganizationChartHierarchy(graphToken ?? undefined),
    staleTime: 60_000,
  });

  const data = chartQuery.data;
  const isHierarchyMode = (viewMode === 'auto' && data?.mode === 'hierarchy') || viewMode === 'hierarchy';

  // State setup based on mode
  const { 
    forest, 
    flatNodes, 
    members, 
    departments, 
    levels, 
    departmentCount,
    matchingPeople,
    looseGroups,
  } = useMemo(() => {
    if (!data) return { forest: [], flatNodes: [], members: [], departments: [], levels: 0, departmentCount: 0, matchingPeople: 0, looseGroups: [] };

    if (isHierarchyMode && data.roots) {
      // Separate real roots (with children) from lone roots (no children)
      const realRoots = data.roots.filter(r => r.children.length > 0);
      const loneRoots = data.roots.filter(r => r.children.length === 0);

      // Map roots and inject collapsed state
      const buildUINodes = (nodes: HierarchyNode[]): UINode[] => {
        return nodes.map(node => ({
          ...node,
          depth: 0,
          collapsed: collapsedNodes.has(node.nodeId),
          children: buildUINodes(node.children),
        }));
      };
      
      const uiRoots = buildUINodes(realRoots);
      const flat = flattenHierarchy(uiRoots);
      const allMembers = flat.map(n => n.member);
      
      // Unmatched members + lone root members
      const unmatched = data.unmatched || [];
      const loneMembers = loneRoots.map(r => r.member);
      const looseMembers = [...loneMembers, ...unmatched];

      // Group loose members by department for compact rendering
      const groups = new Map<string, HierarchyMember[]>();
      looseMembers.forEach(member => {
        const dept = member.departmentName || 'Unassigned';
        if (!groups.has(dept)) groups.set(dept, []);
        groups.get(dept)!.push(member);
      });
      
      const looseGroups = Array.from(groups.entries()).map(([dept, membersList], idx) => ({
        nodeId: -1000 - idx,
        parentNodeId: null,
        label: dept,
        sortOrder: 0,
        members: membersList as OrganizationChartMember[],
      })).sort((a, b) => a.label.localeCompare(b.label));

      const allDisplayMembers = [...allMembers, ...looseMembers];

      const depts = Array.from(new Set(allDisplayMembers.map(m => m.departmentName).filter(Boolean))).sort();
      const matchCount = allDisplayMembers.filter(m => hierarchyMemberMatches(m, query, departmentFilter)).length;

      return {
        forest: uiRoots,
        flatNodes: flat,
        members: allDisplayMembers,
        departments: depts,
        levels: data.stats?.levels || 0,
        departmentCount: data.stats?.departments || 0,
        matchingPeople: matchCount,
        looseGroups,
      };
    } else if (data.nodes) {
      const roots = buildDepForest(data.nodes);
      const flat = flattenDepForest(roots);
      const allMembers = flat.flatMap(n => n.members);
      const depts = Array.from(new Set(allMembers.map(m => m.departmentName).filter(Boolean))).sort();
      const matchCount = allMembers.filter(m => depMemberMatches(m, query, departmentFilter)).length;
      
      return {
        forest: roots,
        flatNodes: flat,
        members: allMembers,
        departments: depts,
        levels: flat.reduce((max, node) => Math.max(max, node.depth + 1), 0),
        departmentCount: flat.filter(node => node.parentNodeId != null).length,
        matchingPeople: matchCount,
        looseGroups: [],
      };
    }

    return { forest: [], flatNodes: [], members: [], departments: [], levels: 0, departmentCount: 0, matchingPeople: 0, looseGroups: [] };
  }, [data, isHierarchyMode, collapsedNodes, query, departmentFilter]);

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="min-w-0 flex flex-col h-[calc(100vh-6rem)] gap-4 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ems-accent/25 bg-ems-accent/10 text-ems-accent shadow-sm">
              <Network className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Organization</h1>
              <p className="text-xs font-medium text-text-secondary">
                {data?.company?.companyName || 'Internal company'}
              </p>
            </div>
          </div>
        </div>

        {data?.configured && members.length ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {data.mode === 'hierarchy' && (
              <div className="flex items-center rounded-lg border border-border bg-surface p-1 mr-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('hierarchy')}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-md transition",
                    isHierarchyMode ? "bg-ems-accent/10 text-ems-accent" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Hierarchy
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('department')}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-md transition",
                    !isHierarchyMode ? "bg-ems-accent/10 text-ems-accent" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Departments
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="org-stat-badge flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-text-secondary shadow-sm">
                <strong className="text-text-primary">{members.length}</strong> people
              </span>
              <span className="org-stat-badge flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-text-secondary shadow-sm">
                <strong className="text-text-primary">{departmentCount}</strong> depts
              </span>
              <span className="org-stat-badge flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-text-secondary shadow-sm">
                <strong className="text-text-primary">{levels}</strong> levels
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {chartQuery.isLoading ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-10 animate-pulse rounded-md bg-elevated" />
          <div className="mx-auto h-28 w-60 animate-pulse rounded-xl bg-elevated" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-xl bg-elevated" />
            <div className="h-36 animate-pulse rounded-xl bg-elevated" />
            <div className="h-36 animate-pulse rounded-xl bg-elevated" />
          </div>
        </div>
      ) : null}

      {chartQuery.isError ? (
        <div className="rounded-xl border border-ems-coral/30 bg-ems-coral/5 px-4 py-3 text-sm text-ems-coral shadow-sm">
          {friendlyApiError(chartQuery.error, 'Could not load the organizational chart.')}
        </div>
      ) : null}

      {data && !data.configured ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-elevated text-text-secondary shadow-sm">
            <Network className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-text-primary">
            Internal company needs attention
          </h2>
          <p className="mt-1 max-w-md text-sm text-text-secondary">
            {data.warnings[0] ||
              'Mark exactly one company as internal to publish its contacts here.'}
          </p>
        </div>
      ) : null}

      {data?.configured && !members.length ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 text-center">
          <UsersRound className="h-8 w-8 text-text-muted" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-text-primary">No chart entries yet</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Add contacts and departments to the internal company to publish the organization.
          </p>
        </div>
      ) : null}

      {data?.configured && members.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="relative min-w-[220px] max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people, titles, or email"
                  className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-sm text-text-primary outline-none transition focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary transition"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </label>
              <Select
                value={departmentFilter || "all"}
                onValueChange={(val) => setDepartmentFilter(val === "all" ? "" : val)}
              >
                <SelectTrigger className="h-9 w-[180px] border-border bg-surface text-sm transition focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15">
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
              {query || departmentFilter ? (
                <span className="text-xs font-medium text-text-muted animate-in fade-in zoom-in px-2">{matchingPeople} matches</span>
              ) : null}
            </div>

            <div className="hidden items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition hover:bg-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ems-accent/20 disabled:opacity-35 disabled:hover:bg-surface"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="flex h-8 min-w-14 items-center justify-center rounded-md border border-border bg-surface px-2 text-xs font-semibold text-text-secondary transition hover:bg-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ems-accent/20"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition hover:bg-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ems-accent/20 disabled:opacity-35 disabled:hover:bg-surface"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
              <div className="mx-1 h-5 w-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDepartmentFilter('');
                  setZoom(1);
                  setCollapsedNodes(new Set());
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition hover:bg-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ems-accent/20"
                title="Reset view"
                aria-label="Reset view"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>

          {data.warnings.map((warning) => (
            <div key={warning} className="rounded-lg border border-ems-amber/30 bg-ems-amber/10 px-4 py-2.5 text-xs font-medium text-ems-amber shadow-sm animate-in slide-in-from-top-2">
              {warning}
            </div>
          ))}

          {/* Desktop Canvas View */}
          <div className="hidden flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-surface/50 shadow-inner md:block relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CgkJPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUwLDE1MCwxNTAsMC4xKSIvPgoJPC9zdmc+')]">
            <div className="org-chart-viewport min-w-max px-12 py-16" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              
              {isHierarchyMode ? (() => {
                const hierarchyChildren = [
                  ...forest.map(root => ({ type: 'hierarchy', data: root as UINode })),
                  ...looseGroups.map(group => ({ type: 'department', data: group }))
                ];

                return (
                  // --- True Hierarchy Rendering (Company Root) ---
                  <div className="w-full flex justify-center">
                    <div className="flex flex-col items-center">
                      
                      {/* 1. Company Root Card */}
                      <article className="org-hierarchy-card relative z-10 w-[260px] flex-shrink-0 overflow-hidden rounded-xl border border-border border-l-4 border-l-text-muted bg-card/80 backdrop-blur-md text-center shadow-sm p-5">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border shadow-sm mb-3 text-text-secondary">
                          <Network className="h-6 w-6" />
                        </div>
                        <h2 className="text-[16px] font-bold tracking-tight text-text-primary">
                          {data.company?.companyName || 'Internal Company'}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-text-secondary uppercase tracking-widest">Organization</p>
                      </article>

                      {/* 2. Unified Children Container */}
                      {hierarchyChildren.length > 0 && (
                        <div className="w-full relative pt-6">
                          <div className="org-line-draw absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border" />
                          
                          <ul className="relative flex justify-center">
                            {hierarchyChildren.map((child, index) => {
                              const isFirst = index === 0;
                              const isLast = index === hierarchyChildren.length - 1;
                              const isOnlyChild = hierarchyChildren.length === 1;

                              return (
                                <li key={child.type === 'hierarchy' ? (child.data as UINode).nodeId : (child.data as typeof looseGroups[0]).nodeId} className="relative flex flex-col items-center px-4">
                                  {/* Top connector lines */}
                                  {!isOnlyChild && (
                                    <>
                                      <div className={cn('absolute top-0 h-px bg-border org-line-draw', isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0')} />
                                      <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border org-line-draw" />
                                    </>
                                  )}
                                  {isOnlyChild && (
                                    <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border org-line-draw" />
                                  )}

                                  {child.type === 'hierarchy' ? (
                                    <HierarchyBranchContent
                                      node={child.data as UINode}
                                      query={query}
                                      department={departmentFilter}
                                      onToggleCollapse={toggleCollapse}
                                    />
                                  ) : (
                                    <div className="relative z-10 py-6">
                                      <DepNodeCard
                                        node={child.data as OrganizationChartNode}
                                        query={query}
                                        department={departmentFilter}
                                      />
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })() : (
                // --- Department Fallback Rendering ---
                <div className="org-chart-tree">
                  <ul>
                    {forest.map((root) => (
                      <DepTreeBranch
                        key={(root as DepTreeNode).nodeId}
                        node={root as DepTreeNode}
                        query={query}
                        department={departmentFilter}
                      />
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>

          {/* Mobile Stacked View */}
          <div className="space-y-6 md:hidden">
            {isHierarchyMode ? (
              // Hierarchy Mobile View
              <div className="space-y-6">
                <article className="org-hierarchy-card relative z-10 w-full overflow-hidden rounded-xl border border-border border-l-4 border-l-text-muted bg-card shadow-sm p-4 flex items-center gap-4">
                   <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-sm text-text-secondary shrink-0">
                     <Network className="h-5 w-5" />
                   </div>
                   <div>
                     <h2 className="text-[15px] font-bold tracking-tight text-text-primary">
                       {data.company?.companyName || 'Internal Company'}
                     </h2>
                     <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Organization</p>
                   </div>
                </article>

                <div className="space-y-4 pl-3 border-l-2 border-border/30 ml-5">
                  {/* Using flatNodes to map over them vertically for mobile stack */}
                  {flatNodes.map((node) => {
                    const uiNode = node as UINode;
                    
                    // For the mobile stack, we might only want to show TeamCards for managers.
                    // Root nodes (depth===0) are also shown here as top-level managers.
                    const isManagerOrRoot = uiNode.children.length > 0 || uiNode.depth === 0;
                    if (!isManagerOrRoot) return null;

                    const paddingLeft = Math.min(uiNode.depth * 24, 64);
                    return (
                      <div key={uiNode.nodeId} className="relative" style={{ paddingLeft: `${paddingLeft}px` }}>
                        {uiNode.depth > 0 && (
                          <div 
                            className="absolute bottom-1/2 left-0 top-0 border-l-2 border-b-2 border-border/50 rounded-bl-xl" 
                            style={{ width: '20px', left: `${paddingLeft - 24}px` }}
                          />
                        )}
                        <HierarchyTeamCard
                          node={uiNode}
                          query={query}
                          department={departmentFilter}
                          onToggleCollapse={toggleCollapse}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Department Mobile View
              Array.from({ length: levels }, (_, depth) => flatNodes.filter((node) => (node as DepTreeNode).depth === depth)).map((nodes, depth) => (
                <section key={depth} className="relative pl-5">
                  <div className="absolute bottom-0 left-[5px] top-7 w-px bg-border" aria-hidden />
                  <div className="mb-3 flex items-center gap-2">
                    <span className="relative z-[1] h-3 w-3 rounded-full border-[3px] border-ems-accent bg-background" />
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Level {depth + 1}</h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {nodes.map((node) => (
                      <DepNodeCard
                        key={(node as DepTreeNode).nodeId}
                        node={node as DepTreeNode}
                        query={query}
                        department={departmentFilter}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default OrganizationalChartPage;
