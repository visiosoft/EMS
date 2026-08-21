export function cleanDmaMarketLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/[.,:;]+$/g, '')
    .trim();
}

/**
 * JS mirror of backend `dmaMarketNameNormSql` / `normalizeDmaMarketNameJs`.
 * Used to join market rows across endpoints by market family key (independent
 * of DMAID, since the same market name can carry different MIN(DMAID)s depending
 * on which subset of postal rows was queried).
 */
export function dmaMarketFamilyKey(value: string | null | undefined): string {
  let s = String(value ?? '').replace(/\s+$/, '');
  if (/[.,:;]$/.test(s)) s = s.slice(0, -1);
  s = s.trim().replace(/\s{2,}/g, ' ');
  return s.toLowerCase();
}
