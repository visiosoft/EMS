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
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const IAE_COMPANY_NORMALIZED = normalizeCompanyName(IAE_ENTRA_COMPANY_NAME);

/** Containment match, case-insensitive, tolerant of "&" vs "and" and extra spacing, plus fuzzy matching. */
export function isIaeEntraCompany(companyName: string | null | undefined): boolean {
  const normalized = normalizeCompanyName(companyName ?? '');
  if (!normalized) return false;
  if (normalized.includes(IAE_COMPANY_NORMALIZED)) return true;
  if (IAE_COMPANY_NORMALIZED.includes(normalized) && normalized.length > 5) return true;
  if (levenshteinDistance(normalized, IAE_COMPANY_NORMALIZED) <= 3) return true;
  return false;
}
