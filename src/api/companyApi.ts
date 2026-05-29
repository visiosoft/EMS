import { apiFetch } from './config';

export interface ApiAddress {
  addressId: number;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface ApiCompanyListRow {
  companyId: number;
  companyName: string;
  companyTypeId: number;
  companyTypeName: string;
  companyTypeIds: number[];
  companyTypeNames: string[];
  serviceProvidedIds: number[];
  serviceProvidedNames: string[];
  serviceAreas?: {
    dmaid: number;
    dmaMarketName: string;
    serviceProvidedId: number;
    serviceName: string;
  }[];
  allDmas?: boolean;
  allDmasServiceProvidedId?: number | null;
  physicalCity: string;
  physicalStateProvince: string;
  dmaId: number | null;
  dmaMarketName: string;
  physicalAddress: ApiAddress;
  mailingAddress: ApiAddress;
}

export interface ApiCompanyType { companyTypeId: number; companyTypeName: string; }
export interface ApiRole { roleId: number; roleName: string; }
export interface ApiDepartment { departmentId: number; departmentName: string; }
export interface ApiSeatingType { seatingTypeId: number; seatingName: string; }
export interface ApiVenueType { venueTypeId: number; venueTypeName: string; }
export interface ApiBrand { brandId: number; brandName: string; }
export interface ApiTax { taxId: number; taxName: string; taxRate: string; taxJurisdictionType: string; }
export interface ApiServiceProvided { serviceProvidedId: number; serviceName: string; }
export interface ApiStagehandProviderCompany { companyId: number; companyName: string; }
export interface ApiNonResidentWithholdingOption { withholdingId: number; withholdingTaxRate: string; dmaid: number | null; taxAgencyId: number | null; }

export type ApiVenueProfileResponse =
  | { missing: true }
  | {
      missing: false;
      companyId: number;
      venueName: string;
      seatingCapacity: number;
      salesTaxRate: string | null;
      taxInCart: boolean;
      insuranceLanguage: string | null;
      insurancePolicyCopyRequirements: string | null;
      venueRelationshipIae: string;
      venueTypeId: number | null;
      venueTypeName: string | null;
      entertainmentComplexCompanyIds: number[];
      entertainmentComplexes: { companyId: number; companyName: string }[];
      seatingTypeId: number | null;
      seatingTypeName: string | null;
      ticketingSystem: string | null;
      venueWebsite: string | null;
      brandIds: number[];
      loadDockAddress: ApiAddress | null;
    };

export interface ApiCompanyContact {
  contactAssignmentId: number;
  contactId: number;
  contactInfoId: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  workPhone: string | null;
  roleId: number;
  roleName: string;
  departmentId: number;
  departmentName: string;
}

export interface ApiCompanyVenueLinkedContactsSection {
  venueCompanyId: number;
  venueCompanyName: string;
  contacts: ApiCompanyContact[];
}

export interface ApiEngagementRow {
  engagementId: number;
  engagementStatus: string;
  tourName: string | null;
  attractionName: string | null;
  displayTitle: string;
}

export interface ApiVenueTicketing {
  seatingTypeId: number | null;
  seatingTypeName: string | null;
  ticketingSystem: string | null;
  venueWebsite: string | null;
}

export type ApiVenueRoleContact = {
  contactInfoId: number;
  fullName: string;
  email: string;
  phone: string | null;
  cellPhone: string | null;
};

export type ApiVenueDetailsResponse =
  | { missing: true }
  | {
      missing: false;
      venueProfile: ApiVenueProfileResponse | null;
      brandIds: number[];
      taxIds: number[];
      stagehandProviderCompanyId: number | null;
      nonResidentWithholdingId: number | null;
      hasStateTaxOnTickets: 0 | 1;
      hasCityTaxOnTickets: 0 | 1;
      financeDirectors: ApiVenueRoleContact[];
      settlementManagers: ApiVenueRoleContact[];
      marketingDirectors: ApiVenueRoleContact[];
      technicalDirectors: ApiVenueRoleContact[];
      ticketingManagers: ApiVenueRoleContact[];
      bookingDirectors: ApiVenueRoleContact[];
      rentalManagers: ApiVenueRoleContact[];
      calendarManagers: ApiVenueRoleContact[];
      contractManagers: ApiVenueRoleContact[];
      stagehandProviderContacts: ApiVenueRoleContact[];
      nonResidentWithholding: null | {
        withholdingId: number;
        withholdingTaxRate: string;
        dmaid: number | null;
        taxAgencyId: number | null;
        withholdingLink: null | { linkId: number; linkType: string; linkUrl: string; linkName: string; linkPath: string };
        artistWaiverInstructions: null | { linkId: number; linkType: string; linkUrl: string; linkName: string; linkPath: string };
        iaeWaiverInstructions: null | { linkId: number; linkType: string; linkUrl: string; linkName: string; linkPath: string };
      };
    };

export interface CreateCompanyPayload {
  companyName: string;
  companyTypeIds: number[];
  companyTypeId?: number;
  serviceProvidedIds?: number[];
  serviceAreas?: { dmaid: number; serviceProvidedId: number }[];
  allDmas?: boolean;
  allDmasServiceProvidedId?: number;
  dmaId?: number;
  physical: { addressLine1: string; addressLine2?: string | null; city: string; stateProvince: string; postalCode: string; country: string };
  mailingSameAsPhysical?: boolean;
  mailing?: { addressLine1: string; addressLine2?: string | null; city: string; stateProvince: string; postalCode: string; country: string };
}

export interface UpdateCompanyPayload {
  companyName?: string;
  companyTypeIds?: number[];
  companyTypeId?: number;
  serviceProvidedIds?: number[];
  serviceAreas?: { dmaid: number; serviceProvidedId: number }[];
  allDmas?: boolean;
  allDmasServiceProvidedId?: number | null;
  dmaId?: number;
  physical?: CreateCompanyPayload['physical'];
  mailing?: CreateCompanyPayload['mailing'];
  mailingSameAsPhysical?: boolean;
}

export type ApiDmaMarket = { dmaid: number; marketName: string; postalCode: string };
export type ApiDmaMarketsPage = { data: ApiDmaMarket[]; total: number };
export interface ApiPaginatedResponse<T> { data: T[]; total: number; }

export const companiesApiQueryKey = ['companies', 'api'] as const;
export const companiesServerSearchQueryKeyPrefix = ['companies', 'api', 'serverSearch'] as const;
export type CompanyListQueryOpts = { q?: string; companyType?: string; sortBy?: string; sortDir?: 'asc' | 'desc'; };

const CONTACT_MULTI_STORAGE = {
  role: 'iae.contactDraft.roleIds',
  department: 'iae.contactDraft.departmentIds',
} as const;
const CONTACT_VALUE_SEPARATOR = ', ';
const CONTACT_DEPARTMENT_STYLE_ID = 'iae-contact-department-column-style';

type ContactDepartmentWindow = Window & typeof globalThis & {
  __iaeContactDepartmentsByEmail?: Record<string, string[]>;
  __iaeContactDepartmentColumnInstalled?: boolean;
  __iaeContactDepartmentColumnObserver?: MutationObserver;
};

function normalizeContactText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeContactEmail(value: unknown): string {
  return normalizeContactText(value).toLowerCase();
}

function uniqueAdd(list: string[], value: unknown) {
  const text = normalizeContactText(value);
  if (!text) return;
  if (!list.some((item) => item.toLowerCase() === text.toLowerCase())) list.push(text);
}

function splitContactLabels(value: unknown): string[] {
  return String(value ?? '')
    .split(CONTACT_VALUE_SEPARATOR)
    .flatMap((part) => part.split(/\s*⁞\s*/))
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index);
}

function uniquePositiveIds(values: unknown[]): number[] {
  return Array.from(new Set(values.map(Number).filter((n) => Number.isInteger(n) && n > 0)));
}

function readStoredContactIds(key: string): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniquePositiveIds(parsed);
  } catch {
    return [];
  }
}

function clearStoredContactIds() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.role);
    window.localStorage.removeItem(CONTACT_MULTI_STORAGE.department);
  } catch {
    /* ignore browser storage failures */
  }
}

/** Clean up any leftover DOM artifacts from the old CSS-hack departments column. */
function rememberContactDepartments(_rows: ApiCompanyContact[]) {
  if (typeof document === 'undefined') return;
  // Remove the old injected <style> tag
  const oldStyle = document.getElementById(CONTACT_DEPARTMENT_STYLE_ID);
  if (oldStyle) oldStyle.remove();
  // Remove class + data-attributes the old code sprinkled on tables
  document.querySelectorAll('table.iae-contact-departments-visual').forEach((table) => {
    table.classList.remove('iae-contact-departments-visual');
    table.querySelectorAll('td[data-departments]').forEach((td) => {
      td.removeAttribute('data-departments');
      td.removeAttribute('title');
    });
  });
  // Disconnect the old MutationObserver if it still exists
  if (typeof window !== 'undefined') {
    const w = window as ContactDepartmentWindow;
    if (w.__iaeContactDepartmentColumnObserver) {
      w.__iaeContactDepartmentColumnObserver.disconnect();
      w.__iaeContactDepartmentColumnObserver = undefined;
    }
    w.__iaeContactDepartmentColumnInstalled = false;
    w.__iaeContactDepartmentsByEmail = undefined;
  }
}

function injectContactDepartmentColumnStyle() {}
function requestContactDepartmentColumnPatch() {}
function patchContactDepartmentColumns() {}
function installContactDepartmentColumnPatch() {}

function groupApiCompanyContacts(rows: ApiCompanyContact[]): ApiCompanyContact[] {
  rememberContactDepartments(rows);
  const groups = new Map<string, ApiCompanyContact & { roleNames?: string[]; departmentNames?: string[] }>();
  for (const row of rows) {
    const key = row.contactId && row.contactId > 0
      ? `contact:${row.contactId}`
      : `email:${normalizeContactEmail(row.email)}|name:${normalizeContactText(row.firstName).toLowerCase()} ${normalizeContactText(row.lastName).toLowerCase()}`;
    const existing = groups.get(key);
    if (!existing) {
      const copy = { ...row, roleNames: [], departmentNames: [] };
      uniqueAdd(copy.roleNames!, row.roleName);
      uniqueAdd(copy.departmentNames!, row.departmentName);
      groups.set(key, copy);
      continue;
    }
    uniqueAdd(existing.roleNames!, row.roleName);
    uniqueAdd(existing.departmentNames!, row.departmentName);
    if ((row.contactAssignmentId ?? 0) < (existing.contactAssignmentId ?? Number.MAX_SAFE_INTEGER)) {
      existing.contactAssignmentId = row.contactAssignmentId;
    }
  }
  const grouped = Array.from(groups.values()).map((row) => {
    const { roleNames, departmentNames, ...rest } = row;
    return {
      ...rest,
      roleName: (roleNames ?? []).join(CONTACT_VALUE_SEPARATOR),
      departmentName: (departmentNames ?? []).join(CONTACT_VALUE_SEPARATOR),
    };
  });
  rememberContactDepartments(grouped);
  return grouped;
}

export function companiesListQueryKey(offset: number, limit: number, opts: CompanyListQueryOpts) {
  return ['companies', 'list', offset, limit, opts.q ?? '', opts.companyType ?? '', opts.sortBy ?? '', opts.sortDir ?? ''] as const;
}
export function fetchCompanies(offset = 0, limit = 25, opts?: CompanyListQueryOpts) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const trimmed = opts?.q?.trim();
  if (trimmed) params.set('q', trimmed);
  const ct = opts?.companyType?.trim();
  if (ct && ct !== 'All') params.set('companyType', ct);
  if (opts?.sortBy?.trim()) { params.set('sortBy', opts.sortBy.trim()); if (opts.sortDir) params.set('sortDir', opts.sortDir); }
  return apiFetch<ApiPaginatedResponse<ApiCompanyListRow>>(`/companies?${params}`);
}

export const COMPANIES_PICKER_LIMIT = 5000;
export const ENTERTAINMENT_COMPLEX_COMPANY_TYPE = 'Entertainment Complex';
export const TALENT_AGENCY_COMPANY_TYPE = 'Talent Agency';
export function companiesPickerQueryKey() { return ['companies', 'picker', 0, COMPANIES_PICKER_LIMIT] as const; }
export async function fetchCompaniesPickerRows(): Promise<ApiCompanyListRow[]> { const res = await fetchCompanies(0, COMPANIES_PICKER_LIMIT); return res.data ?? []; }
export function entertainmentComplexCompaniesQueryKey() { return ['companies', 'picker', 'entertainment-complex', 0, COMPANIES_PICKER_LIMIT] as const; }
export async function fetchEntertainmentComplexCompanyRows(): Promise<ApiCompanyListRow[]> {
  const pageSize = COMPANIES_PICKER_LIMIT;
  const out: ApiCompanyListRow[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total && out.length < 100_000) {
    const res = await fetchCompanies(offset, pageSize, {
      companyType: ENTERTAINMENT_COMPLEX_COMPANY_TYPE,
    });
    const rows = res.data ?? [];
    out.push(...rows);
    total = Number.isFinite(res.total) ? Number(res.total) : out.length;
    offset += rows.length;
    if (rows.length === 0) break;
  }
  return out;
}
export function talentAgencyCompaniesQueryKey() { return ['companies', 'picker', 'talent-agency', 0, COMPANIES_PICKER_LIMIT] as const; }
export async function fetchTalentAgencyCompanyRows(): Promise<ApiCompanyListRow[]> { const res = await fetchCompanies(0, COMPANIES_PICKER_LIMIT, { companyType: TALENT_AGENCY_COMPANY_TYPE }); return res.data ?? []; }
export function fetchCompany(id: number) { return apiFetch<ApiCompanyListRow>(`/companies/${id}`); }
export function createCompany(body: CreateCompanyPayload) { return apiFetch<ApiCompanyListRow>('/companies', { method: 'POST', body: JSON.stringify(body) }); }
export function updateCompany(id: number, body: UpdateCompanyPayload) { return apiFetch<ApiCompanyListRow>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); }
export function deleteCompany(id: number) { return apiFetch<void>(`/companies/${id}`, { method: 'DELETE' }); }

export function fetchCompanyContacts(companyId: number, opts?: { roleId?: number; roleName?: string }) {
  const params = new URLSearchParams();
  if (opts?.roleId != null && opts.roleId > 0) params.set('roleId', String(opts.roleId));
  else if (opts?.roleName?.trim()) params.set('roleName', opts.roleName.trim());
  const qs = params.toString();
  return apiFetch<ApiCompanyContact[]>(qs ? `/companies/${companyId}/contacts?${qs}` : `/companies/${companyId}/contacts`)
    .then((data) => groupApiCompanyContacts(Array.isArray(data) ? data : []));
}
export function fetchCompanyLinkedVenueContacts(companyId: number) {
  return apiFetch<ApiCompanyVenueLinkedContactsSection[]>(`/companies/${companyId}/contacts/linked-venues`).then((data) =>
    (Array.isArray(data) ? data : []).map((section) => ({
      ...section,
      contacts: groupApiCompanyContacts(Array.isArray(section.contacts) ? section.contacts : []),
    })),
  );
}

export type CompanyContactCreatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone?: string | null;
  workPhone?: string | null;
  roleId?: number;
  departmentId?: number;
  roleIds?: number[];
  departmentIds?: number[];
};
export function createCompanyContact(companyId: number, body: CompanyContactCreatePayload) {
  const storedRoleIds = readStoredContactIds(CONTACT_MULTI_STORAGE.role);
  const storedDepartmentIds = readStoredContactIds(CONTACT_MULTI_STORAGE.department);
  const roleIds = uniquePositiveIds(body.roleIds?.length ? body.roleIds : storedRoleIds.length ? storedRoleIds : body.roleId ? [body.roleId] : []);
  const departmentIds = uniquePositiveIds(body.departmentIds?.length ? body.departmentIds : storedDepartmentIds.length ? storedDepartmentIds : body.departmentId ? [body.departmentId] : []);
  if (roleIds.length > 1 || departmentIds.length > 1) {
    return apiFetch<ApiCompanyContact[]>(`/companies/${companyId}/contacts/bulk`, {
      method: 'POST',
      body: JSON.stringify({ ...body, roleIds, departmentIds }),
    }).then((rows) => groupApiCompanyContacts(Array.isArray(rows) ? rows : [])[0]).finally(clearStoredContactIds);
  }
  return apiFetch<ApiCompanyContact>(`/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify({ ...body, roleId: roleIds[0], departmentId: departmentIds[0] }),
  }).finally(clearStoredContactIds);
}
export function updateContactAssignment(assignmentId: number, body: Partial<{ firstName: string; lastName: string; email: string; cellPhone: string | null; workPhone: string | null; roleId: number; departmentId: number; roleIds: number[]; departmentIds: number[] }>) {
  const storedRoleIds = readStoredContactIds(CONTACT_MULTI_STORAGE.role);
  const storedDepartmentIds = readStoredContactIds(CONTACT_MULTI_STORAGE.department);
  const roleIds = uniquePositiveIds(body.roleIds?.length ? body.roleIds : storedRoleIds.length ? storedRoleIds : body.roleId ? [body.roleId] : []);
  const departmentIds = uniquePositiveIds(body.departmentIds?.length ? body.departmentIds : storedDepartmentIds.length ? storedDepartmentIds : body.departmentId ? [body.departmentId] : []);
  const hasExplicitSelection = roleIds.length > 0 && departmentIds.length > 0;
  if (hasExplicitSelection) {
    return apiFetch<ApiCompanyContact[]>(`/contact-assignments/${assignmentId}/bulk`, {
      method: 'PATCH',
      body: JSON.stringify({ ...body, roleIds, departmentIds }),
    }).then((rows) => groupApiCompanyContacts(Array.isArray(rows) ? rows : [])[0]).finally(clearStoredContactIds);
  }
  return apiFetch<ApiCompanyContact>(`/contact-assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...body, roleId: roleIds[0], departmentId: departmentIds[0] }),
  }).finally(clearStoredContactIds);
}
export function deleteContactAssignment(assignmentId: number) { return apiFetch<void>(`/contact-assignments/${assignmentId}`, { method: 'DELETE' }); }
export function fetchCompanyEngagements(companyId: number) { return apiFetch<ApiEngagementRow[]>(`/companies/${companyId}/engagements`); }
export function fetchVenueTicketing(companyId: number) { return apiFetch<ApiVenueTicketing | null>(`/companies/${companyId}/venue-ticketing`); }
export function fetchVenueProfile(companyId: number) { return apiFetch<ApiVenueProfileResponse>(`/companies/${companyId}/venue-profile`); }
export function provisionVenueProfile(companyId: number) { return apiFetch<{ created: boolean }>(`/companies/${companyId}/venue-profile/provision`, { method: 'POST' }); }
export function updateVenueProfile(companyId: number, body: Partial<{ venueName: string; seatingCapacity: number; salesTaxRate: string | null; taxInCart: boolean; insuranceLanguage: string | null; insurancePolicyCopyRequirements: string | null; venueRelationshipIae: string; venueTypeId: number | null; entertainmentComplexCompanyIds: number[]; seatingTypeId: number | null; ticketingSystem: string | null; venueWebsite: string | null; loadDockAddress: { addressLine1: string; addressLine2?: string | null; city: string; stateProvince: string; postalCode: string; country: string } | null; brandIds?: number[] }>) {
  return apiFetch<void>(`/companies/${companyId}/venue-profile`, { method: 'PATCH', body: JSON.stringify(body) });
}
export function updateVenueTicketing(companyId: number, body: { seatingTypeId?: number | null; ticketingSystem?: string | null; venueWebsite?: string | null }) { return apiFetch<{ updated: boolean }>(`/companies/${companyId}/venue-ticketing`, { method: 'PATCH', body: JSON.stringify(body) }); }

export function fetchLookups() {
  return Promise.all([
    apiFetch<ApiCompanyType[]>('/lookups/company-types'),
    apiFetch<ApiRole[]>('/lookups/roles'),
    apiFetch<ApiDepartment[]>('/lookups/departments'),
    apiFetch<ApiSeatingType[]>('/lookups/seating-types'),
    apiFetch<ApiVenueType[]>('/lookups/venue-types'),
    apiFetch<ApiBrand[]>('/lookups/brands'),
    apiFetch<ApiTax[]>('/lookups/taxes'),
    apiFetch<ApiServiceProvided[]>('/lookups/services-provided'),
    apiFetch<ApiStagehandProviderCompany[]>('/lookups/stagehand-providers'),
    apiFetch<ApiNonResidentWithholdingOption[]>('/lookups/non-resident-withholdings'),
  ]).then(([companyTypes, roles, departments, seatingTypes, venueTypes, brands, taxes, servicesProvided, stagehandProviders, nonResidentWithholdings]) => ({ companyTypes, roles, departments, seatingTypes, venueTypes, brands, taxes, servicesProvided, stagehandProviders, nonResidentWithholdings }));
}

export function fetchServicesAllowedForCompanyTypes(companyTypeIds: number[]) {
  const ids = Array.from(
    new Set(
      companyTypeIds
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
  if (ids.length === 0) return Promise.resolve<ApiServiceProvided[]>([]);
  const params = new URLSearchParams({ companyTypeIds: ids.join(',') });
  return apiFetch<ApiServiceProvided[]>(
    `/lookups/company-type-services/allowed?${params.toString()}`,
  );
}
export function fetchStagehandProviderCompanies() { return apiFetch<ApiStagehandProviderCompany[]>('/lookups/stagehand-providers').then((data) => (Array.isArray(data) ? data : [])); }
export function fetchVenueDetails(companyId: number) { return apiFetch<ApiVenueDetailsResponse>(`/companies/${companyId}/venue-details`); }
export function updateVenueDetails(companyId: number, body: Partial<{ venueProfile: Parameters<typeof updateVenueProfile>[1]; brandIds: number[]; taxIds: number[]; stagehandProviderCompanyId: number | null; nonResidentWithholdingId: number | null; hasStateTaxOnTickets: 0 | 1; hasCityTaxOnTickets: 0 | 1; financeDirectors: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; settlementManagers: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; marketingDirectors: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; technicalDirectors: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; ticketingManagers: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; bookingDirectors: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; rentalManagers: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; calendarManagers: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; contractManagers: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; stagehandProviderContacts: { fullName?: string; email?: string; phone?: string; cellPhone?: string }[]; nonResidentWithholding: { withholdingTaxRate?: string; dmaid?: number | null; taxAgencyId?: number | null; withholdingLink?: { linkId?: number | null; linkType?: string; linkUrl?: string; linkName?: string; linkPath?: string } | null; artistWaiverInstructions?: { linkId?: number | null; linkType?: string; linkUrl?: string; linkName?: string; linkPath?: string } | null; iaeWaiverInstructions?: { linkId?: number | null; linkType?: string; linkUrl?: string; linkName?: string; linkPath?: string } | null } | null }>) {
  return apiFetch<{ updated: boolean }>(`/companies/${companyId}/venue-details`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function fetchDmaByPostal(postalCode: string) {
  const value = encodeURIComponent(postalCode.trim());
  return apiFetch<{ dmaid: number; marketName: string; postalCode: string } | null>(
    `/lookups/dma-by-postal/${value}`,
  );
}
export function fetchDmaMarketsPage(offset = 0, limit = 500, q = '') {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (q.trim()) params.set('q', q.trim());
  return apiFetch<ApiDmaMarketsPage>(`/lookups/dma-markets?${params}`);
}
export function fetchDmaMarketsPaged(offset = 0, limit = 500, q = '') {
  return fetchDmaMarketsPage(offset, limit, q);
}
