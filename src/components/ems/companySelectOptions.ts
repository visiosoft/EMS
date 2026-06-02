import type { Select2Option } from './Select2';

export type CompanyOptionSource = {
  companyId: number;
  companyName: string;
  companyTypeName?: string | null;
  companyTypeNames?: string[] | null;
  physicalCity?: string | null;
  physicalStateProvince?: string | null;
  dmaMarketName?: string | null;
};

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = String(value ?? '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

export function companyTypeSummary(company: CompanyOptionSource): string {
  return uniqueNonEmpty([...(company.companyTypeNames ?? []), company.companyTypeName]).join(', ');
}

export function companyLocationSummary(company: CompanyOptionSource): string {
  return uniqueNonEmpty([company.physicalCity, company.physicalStateProvince]).join(', ');
}

export function companyToSelect2Option(company: CompanyOptionSource): Select2Option {
  const description = companyTypeSummary(company);
  const rightText = companyLocationSummary(company);
  return {
    value: String(company.companyId),
    label: company.companyName,
    description,
    rightText,
    searchText: uniqueNonEmpty([company.companyName, description, rightText, company.dmaMarketName]).join(' '),
  };
}

export function sortSelect2OptionsByLabel(options: Select2Option[]): Select2Option[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function companyToSelect2Options(companies: CompanyOptionSource[]): Select2Option[] {
  return sortSelect2OptionsByLabel(companies.map(companyToSelect2Option));
}
