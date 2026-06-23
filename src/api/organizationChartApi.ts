import { apiFetch } from './config';

export interface OrganizationChartMember {
  memberId: number;
  contactId: number;
  sortOrder: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
  jobTitle: string;
  roleName: string;
  departmentName: string;
}

export interface OrganizationChartNode {
  nodeId: number;
  parentNodeId: number | null;
  label: string;
  sortOrder: number;
  members: OrganizationChartMember[];
}

export interface OrganizationChartResponse {
  configured: boolean;
  generatedAt: string;
  company: { companyId: number; companyName: string } | null;
  nodes: OrganizationChartNode[];
  warnings: string[];
}

export interface HierarchyMember {
  memberId: number;
  contactId: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  cellPhone: string;
  workPhone: string;
  jobTitle: string;
  roleName: string;
  departmentName: string;
  entraUserId?: string;
}

export interface HierarchyNode {
  nodeId: string;
  member: HierarchyMember;
  children: HierarchyNode[];
}

export interface OrganizationChartHierarchyResponse {
  mode: 'hierarchy' | 'department';
  configured: boolean;
  generatedAt: string;
  company: { companyId: number; companyName: string } | null;
  roots: HierarchyNode[];
  unmatched: HierarchyMember[];
  stats: { people: number; departments: number; levels: number };
  warnings: string[];
  nodes?: OrganizationChartNode[];
}

export const organizationChartQueryKey = ['organization-chart'] as const;
export const organizationChartHierarchyQueryKey = ['organization-chart-hierarchy'] as const;

export function fetchOrganizationChart(): Promise<OrganizationChartResponse> {
  return apiFetch<OrganizationChartResponse>('/organization-chart');
}

export function fetchOrganizationChartHierarchy(graphToken?: string): Promise<OrganizationChartHierarchyResponse> {
  const headers = graphToken ? { 'x-graph-access-token': graphToken } : undefined;
  return apiFetch<OrganizationChartHierarchyResponse>('/organization-chart/hierarchy', { headers });
}
