import { apiFetch } from './config';
import type { OrganizationChartHierarchyResponse } from './organizationChartApi';

export const internalOrgChartHierarchyQueryKey = [
  'internal-organization-chart-hierarchy',
] as const;

/**
 * Company Hub org chart. Hits the internal-guarded endpoint (no live Entra auth required).
 * When a delegated Microsoft Graph token is available it is forwarded so the service can
 * build the manager reporting-line hierarchy; without it the service returns department mode.
 */
export function fetchInternalOrgChartHierarchy(
  graphToken?: string,
): Promise<OrganizationChartHierarchyResponse> {
  const headers = graphToken
    ? { 'x-graph-access-token': graphToken }
    : undefined;
  return apiFetch<OrganizationChartHierarchyResponse>(
    '/internal/organization-chart/hierarchy',
    { headers },
  );
}
