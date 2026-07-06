/**
 * Client rule: only Entra members whose Company Name contains
 * "Innovation Arts & Entertainment" count as iAE employees anywhere in EMS/WMS.
 * The Entra↔EMS contact sync enforces this at the sync boundary — DB-side
 * membership stays dbo.Company.is_internal (no companyName column exists there).
 */
export const IAE_ENTRA_COMPANY_NAME = 'Innovation Arts & Entertainment';

function normalizeCompanyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const IAE_COMPANY_NORMALIZED = normalizeCompanyName(IAE_ENTRA_COMPANY_NAME);

/** Containment match, case-insensitive, tolerant of "&" vs "and" and extra spacing. */
export function isIaeEntraCompany(companyName: string | null | undefined): boolean {
  const normalized = normalizeCompanyName(companyName ?? '');
  if (!normalized) return false;
  return normalized.includes(IAE_COMPANY_NORMALIZED);
}
