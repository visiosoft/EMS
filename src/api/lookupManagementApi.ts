import { apiFetch } from './config';

export type LookupManageTableKey =
  | 'company-types'
  | 'venue-types'
  | 'seating-types'
  | 'departments'
  | 'classes'
  | 'roles'
  | 'brands'
  | 'company-services'
  | 'company-type-services'
  | 'services-provided'
  | 'dmas';

export type LookupManageListOpts = {
  q?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type LookupManageRow = Record<string, unknown>;

export type LookupManageListResponse = {
  data: LookupManageRow[];
  total: number;
};

export function lookupManageListQueryKey(
  table: LookupManageTableKey,
  offset: number,
  limit: number,
  opts: LookupManageListOpts,
) {
  return [
    'lookup-manage',
    table,
    offset,
    limit,
    opts.q ?? '',
    opts.sortBy ?? '',
    opts.sortDir ?? '',
  ] as const;
}

export function fetchLookupManageRows(
  table: LookupManageTableKey,
  offset: number,
  limit: number,
  opts?: LookupManageListOpts,
) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const q = opts?.q?.trim();
  if (q) params.set('q', q);
  const sortBy = opts?.sortBy?.trim();
  if (sortBy) params.set('sortBy', sortBy);
  if (opts?.sortDir) params.set('sortDir', opts.sortDir);
  return apiFetch<LookupManageListResponse>(`/lookups/manage/${table}?${params.toString()}`);
}

export type LookupManageCreatePayload = {
  id?: number;
  name?: string;
  companyId?: number;
  companyTypeId?: number;
  serviceProvidedId?: number;
  serviceProvidedIds?: number[];
  postalCode?: string;
};

export function createLookupManageRow(
  table: LookupManageTableKey,
  body: LookupManageCreatePayload,
) {
  return apiFetch<LookupManageRow>(`/lookups/manage/${table}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type LookupManageUpdatePayload = {
  name?: string;
  companyId?: number;
  companyTypeId?: number;
  serviceProvidedId?: number;
  serviceProvidedIds?: number[];
  postalCode?: string;
};

export function updateLookupManageRow(
  table: LookupManageTableKey,
  id: number,
  body: LookupManageUpdatePayload,
) {
  return apiFetch<LookupManageRow>(`/lookups/manage/${table}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteLookupManageRow(table: LookupManageTableKey, id: number) {
  return apiFetch<void>(`/lookups/manage/${table}/${id}`, { method: 'DELETE' });
}
