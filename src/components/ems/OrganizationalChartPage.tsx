import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import {
  fetchOrganizationChart,
  organizationChartQueryKey,
  type OrganizationChartMember,
  type OrganizationChartNode,
} from '@/api/organizationChartApi';
import { Avatar } from './Primitives';
import { friendlyApiError } from '@/lib/friendlyApiError';
import { cn } from '@/lib/utils';

type TreeNode = OrganizationChartNode & {
  children: TreeNode[];
  depth: number;
};

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.15;
const ZOOM_STEP = 0.15;

function buildForest(nodes: OrganizationChartNode[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  nodes.forEach((node) => {
    byId.set(node.nodeId, { ...node, children: [], depth: 0 });
  });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentNodeId != null ? byId.get(node.parentNodeId) : null;
    if (parent && parent.nodeId !== node.nodeId) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (items: TreeNode[], depth: number) => {
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

function flattenForest(roots: TreeNode[]): TreeNode[] {
  const rows: TreeNode[] = [];
  const visit = (node: TreeNode) => {
    rows.push(node);
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return rows;
}

function nodeSearchText(node: OrganizationChartNode): string {
  return [
    node.label,
    ...node.members.flatMap((member) => [
      member.displayName,
      member.email,
      member.jobTitle,
      member.roleName,
      member.departmentName,
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

function memberMatches(
  member: OrganizationChartMember,
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

function getNodeTone(node: OrganizationChartNode): string {
  const source =
    node.members.find((member) => member.departmentName)?.departmentName ||
    node.label ||
    String(node.nodeId);
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

function OrgNodeCard({
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
      .filter((member) => memberMatches(member, query, department))
      .map((member) => member.memberId),
  );
  const labelMatches = Boolean(query && node.label.toLowerCase().includes(query));
  const nodeMatches = labelMatches || matchingMemberIds.size > 0;

  return (
    <article
      className={cn(
        'org-chart-card w-[238px] overflow-hidden rounded-lg border border-border border-l-[3px] bg-card text-left shadow-sm transition duration-200',
        getNodeTone(node),
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

function TreeBranch({
  node,
  query,
  department,
}: {
  node: TreeNode;
  query: string;
  department: string;
}) {
  return (
    <li>
      <OrgNodeCard node={node} query={query} department={department} />
      {node.children.length ? (
        <ul>
          {node.children.map((child) => (
            <TreeBranch
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

export function OrganizationalChartPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [zoom, setZoom] = useState(1);
  const query = search.trim().toLowerCase();

  const chartQuery = useQuery({
    queryKey: organizationChartQueryKey,
    queryFn: fetchOrganizationChart,
    staleTime: 60_000,
  });

  const forest = useMemo(
    () => buildForest(chartQuery.data?.nodes ?? []),
    [chartQuery.data?.nodes],
  );
  const flatNodes = useMemo(() => flattenForest(forest), [forest]);
  const members = flatNodes.flatMap((node) => node.members);
  const departmentCount = flatNodes.filter(
    (node) => node.parentNodeId != null,
  ).length;
  const departments = Array.from(
    new Set(members.map((member) => member.departmentName).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
  const levels = flatNodes.reduce(
    (maximum, node) => Math.max(maximum, node.depth + 1),
    0,
  );
  const matchingPeople = members.filter((member) =>
    memberMatches(member, query, department),
  ).length;
  const nodesByLevel = Array.from({ length: levels }, (_, depth) =>
    flatNodes.filter((node) => node.depth === depth),
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ems-accent/25 bg-ems-accent-dim text-ems-accent">
              <Network className="h-[18px] w-[18px]" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">Organization</h1>
              <p className="text-xs text-text-secondary">
                {chartQuery.data?.company?.companyName || 'Internal company'}
              </p>
            </div>
          </div>
        </div>

        {chartQuery.data?.configured && members.length ? (
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
            <span><strong className="text-text-primary">{members.length}</strong> people</span>
            <span><strong className="text-text-primary">{departmentCount}</strong> departments</span>
            <span><strong className="text-text-primary">{levels}</strong> levels</span>
          </div>
        ) : null}
      </div>

      {chartQuery.isLoading ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="h-10 animate-pulse rounded-md bg-elevated" />
          <div className="mx-auto h-28 w-60 animate-pulse rounded-lg bg-elevated" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-lg bg-elevated" />
            <div className="h-36 animate-pulse rounded-lg bg-elevated" />
            <div className="h-36 animate-pulse rounded-lg bg-elevated" />
          </div>
        </div>
      ) : null}

      {chartQuery.isError ? (
        <div className="rounded-lg border border-ems-coral/30 bg-ems-coral-dim px-4 py-3 text-sm text-ems-coral">
          {friendlyApiError(chartQuery.error, 'Could not load the organizational chart.')}
        </div>
      ) : null}

      {chartQuery.data && !chartQuery.data.configured ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-elevated text-text-secondary">
            <Network className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-text-primary">
            Internal company needs attention
          </h2>
          <p className="mt-1 max-w-md text-sm text-text-secondary">
            {chartQuery.data.warnings[0] ||
              'Mark exactly one company as internal to publish its contacts here.'}
          </p>
        </div>
      ) : null}

      {chartQuery.data?.configured && !members.length ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 text-center">
          <UsersRound className="h-8 w-8 text-text-muted" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-text-primary">No chart entries yet</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Add contacts and departments to the internal company to publish the organization.
          </p>
        </div>
      ) : null}

      {chartQuery.data?.configured && members.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label className="relative min-w-[220px] max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people, titles, or email"
                  className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-sm text-text-primary outline-none transition focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text-primary"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </label>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-9 min-w-[180px] rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-ems-accent focus:ring-2 focus:ring-ems-accent/15"
                aria-label="Highlight department"
              >
                <option value="">All departments</option>
                {departments.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {query || department ? (
                <span className="text-xs text-text-muted">{matchingPeople} matches</span>
              ) : null}
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary hover:bg-hover hover:text-text-primary disabled:opacity-35"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="flex h-8 min-w-12 items-center justify-center rounded-md border border-border bg-surface px-2 text-xs font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary hover:bg-hover hover:text-text-primary disabled:opacity-35"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDepartment('');
                  setZoom(1);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary hover:bg-hover hover:text-text-primary"
                title="Reset view"
                aria-label="Reset view"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {chartQuery.data.warnings.map((warning) => (
            <div key={warning} className="rounded-lg border border-ems-amber/25 bg-ems-amber-dim px-3 py-2 text-xs text-ems-amber">
              {warning}
            </div>
          ))}

          <div className="hidden min-h-[430px] overflow-auto rounded-lg border border-border bg-surface md:block">
            <div className="org-chart-viewport min-w-max px-8 py-8" style={{ zoom }}>
              <div className="org-chart-tree">
                <ul>
                  {forest.map((root) => (
                    <TreeBranch
                      key={root.nodeId}
                      node={root}
                      query={query}
                      department={department}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-5 md:hidden">
            {nodesByLevel.map((nodes, depth) => (
              <section key={depth} className="relative pl-5">
                <div className="absolute bottom-0 left-[5px] top-7 w-px bg-border" aria-hidden />
                <div className="mb-2 flex items-center gap-2">
                  <span className="relative z-[1] h-[11px] w-[11px] rounded-full border-2 border-ems-accent bg-background" />
                  <h2 className="text-[11px] font-semibold uppercase text-text-muted">Level {depth + 1}</h2>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {nodes.map((node) => (
                    <OrgNodeCard
                      key={node.nodeId}
                      node={node}
                      query={query}
                      department={department}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
