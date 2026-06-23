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

export const organizationChartQueryKey = ['organization-chart'] as const;

export function fetchOrganizationChart(): Promise<OrganizationChartResponse> {
  return apiFetch<OrganizationChartResponse>('/organization-chart');
}
