/**
 * Canonical SQL normalization for dbo.DMA.MarketName comparisons.
 *
 * Strips one trailing punctuation mark (.,:;), collapses doubled spaces, trims,
 * and lowercases — so near-duplicate rows like "ABILENE-SWEETWATER" vs
 * "Abilene-Sweetwater." group into one market. Must stay byte-identical with the
 * market-family match in venue-directory so grouped market cards and their venue
 * drill-downs agree.
 */
export function dmaMarketNameNormSql(colExpr: string): string {
  return `LOWER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
    CASE WHEN RIGHT(RTRIM(${colExpr}),1) IN ('.', ',', ':', ';')
         THEN LEFT(RTRIM(${colExpr}), LEN(RTRIM(${colExpr}))-1)
         ELSE RTRIM(${colExpr}) END
  , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))))`;
}

/**
 * JS mirror of {@link dmaMarketNameNormSql} for in-memory joins (e.g. matching
 * dbo.DMA market names against the small dbo.DMAPopulation reference table without
 * a SQL-side join). Must stay behaviorally identical to the SQL version.
 */
export function normalizeDmaMarketNameJs(name: string): string {
  let s = name.replace(/\s+$/, '');
  if (/[.,:;]$/.test(s)) s = s.slice(0, -1);
  s = s.trim().replace(/\s{2,}/g, ' ');
  return s.toLowerCase();
}

/**
 * Matching key for dbo.DMA market names against dbo.DMAPopulation (the Nielsen
 * reference table). Deliberately SEPARATE from {@link normalizeDmaMarketNameJs} —
 * that function drives market-tile grouping and the venue-directory market-family
 * match, and must not change. This one exists only to compensate for a real
 * naming-convention gap between the two tables even after DMAPopulation's
 * duplicate-row bug was fixed: dbo.DMA uses our own full multi-city labels
 * ("SAN FRANCISCO-OAKLAND-SAN JOSE"), while DMAPopulation uses official Nielsen
 * "primary (secondary)" labels, often shortened ("San Francisco", "Boston
 * (Manchester)"). The transforms below are pure formatting normalization
 * (abbreviation expansion, punctuation, the documented Nielsen "primary
 * (secondary)" single-market convention) — never a semantic guess — and were
 * verified to introduce zero false-positive collisions within dbo.DMA's own
 * market list before shipping. Markets whose dbo.DMA label and Nielsen label
 * differ by more than formatting (e.g. ours groups more cities together) will
 * still legitimately fail to match; that is a data gap, not a bug, and must be
 * resolved by Sakshi providing matching names or a NielsenCode/DMAID crosswalk —
 * never guessed here, since a wrong match would show incorrect Nielsen data.
 */
export function normalizeNielsenMarketNameForMatch(name: string): string {
  let s = normalizeDmaMarketNameJs(name).toUpperCase();
  s = s.replace(/\(.*?\)/g, ' ');
  s = s.replace(/\bFT\.?\b/g, 'FORT');
  s = s.replace(/\bST\.?\b/g, 'SAINT');
  s = s.replace(/[.,;:]/g, ' ');
  s = s.replace(/&/g, 'AND');
  s = s.replace(/-/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.toLowerCase();
}
